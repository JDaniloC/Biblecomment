import mongoose from "mongoose";
import {
  IUserRepository,
  AdminUserCursor,
} from "@/domain/repositories/IUserRepository";
import { User } from "@/domain/entities/User";
import { PublicUserDTO } from "@/domain/dto/PublicUserDTO";
import { AdminUserDTO } from "@/domain/dto/AdminUserDTO";
import { UserModel, IUserDocument } from "@/infrastructure/database/models/UserModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: IUserDocument): User {
  return {
    _id: doc._id?.toString(),
    email: doc.email,
    username: doc.username,
    displayName: doc.displayName,
    password: doc.password,
    state: doc.state,
    belief: doc.belief,
    showBelief: doc.showBelief ?? false,
    moderator: doc.moderator,
    // Copy MongooseArray → plain Array. Auth.js calls structuredClone on
    // the user object during JWT encode and a MongooseArray (which carries
    // hidden parent refs) blows up DataCloneError.
    tutorialsCompleted: doc.tutorialsCompleted ? [...doc.tutorialsCompleted] : [],
    badges: doc.badges ? [...doc.badges] : [],
    disabledAt: doc.disabledAt,
    disabledBy: doc.disabledBy,
    emailVerifiedAt: doc.emailVerifiedAt,
    pendingEmail: doc.pendingEmail,
  };
}

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findOne({ email: email.toLowerCase() });
    return doc ? toEntity(doc) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    await connectToDatabase();
    // Username is stored case-preserved (legacy accounts use mixed case like
    // "JDaniloC"). Look it up case-insensitively so /u/jdaniloc resolves to
    // the historic "JDaniloC" account.
    const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const doc = await UserModel.findOne({
      username: { $regex: `^${escaped}$`, $options: "i" },
    });
    return doc ? toEntity(doc) : null;
  }

  async findById(userId: string): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findById(userId);
    return doc ? toEntity(doc) : null;
  }

  async searchByUsernamePrefix(
    prefix: string,
    limit: number,
  ): Promise<Array<{ username: string; displayName?: string }>> {
    await connectToDatabase();
    if (!prefix) return [];
    // Anchor to the start of the string; escape regex metachars so a user's
    // input like "a.b" doesn't blow up the query plan or skip the index.
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const docs = await UserModel.find(
      { username: { $regex: `^${escaped}`, $options: "i" } },
      { username: 1, displayName: 1, _id: 0 },
    )
      .sort({ username: 1 })
      .limit(Math.max(1, Math.min(limit, 50)))
      .lean();
    return docs.map((d) => ({
      username: d.username,
      displayName: d.displayName,
    }));
  }

  async findByUsernamePublic(username: string): Promise<PublicUserDTO | null> {
    await connectToDatabase();
    // Project only the safe fields. We still need showBelief in the query so
    // we can decide whether to surface belief, but it never leaves this method.
    // Case-insensitive match so historic mixed-case usernames resolve from a
    // lower-case slug in the URL.
    const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const doc = await UserModel.findOne(
      { username: { $regex: `^${escaped}$`, $options: "i" } },
      { username: 1, displayName: 1, badges: 1, belief: 1, showBelief: 1, emailVerifiedAt: 1, createdAt: 1 },
    ).lean();
    if (!doc) return null;
    return {
      username: doc.username,
      displayName: doc.displayName,
      badges: doc.badges ? [...doc.badges] : [],
      belief: doc.showBelief ? doc.belief : undefined,
      emailVerified: !!(doc as { emailVerifiedAt?: Date }).emailVerifiedAt,
      createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(0),
    };
  }

  async findByUsernames(usernames: string[]): Promise<User[]> {
    if (usernames.length === 0) return [];
    await connectToDatabase();
    const docs = await UserModel.find({ username: { $in: usernames } });
    return docs.map(toEntity);
  }

  async findManyByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return [];
    await connectToDatabase();
    const docs = await UserModel.find({ _id: { $in: userIds } });
    return docs.map(toEntity);
  }

  async findAll(): Promise<User[]> {
    await connectToDatabase();
    const docs = await UserModel.find({});
    return docs.map(toEntity);
  }

  async findAllPaginated(page: number, pageSize: number): Promise<User[]> {
    await connectToDatabase();
    const docs = await UserModel.find({})
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    return docs.map(toEntity);
  }

  async findForModeration(opts: {
    q?: string;
    cursor?: AdminUserCursor | null;
    limit: number;
  }): Promise<{ items: AdminUserDTO[]; nextCursor: AdminUserCursor | null }> {
    await connectToDatabase();
    const limit = Math.max(1, Math.min(opts.limit, 100));
    const q = opts.q?.trim();

    // Strict-less-than on (createdAt, _id) using { createdAt: -1, _id: -1 }
    // sort. Split into the two OR branches so each remains sargable on the
    // compound index.
    const cursorPred = opts.cursor
      ? {
          $or: [
            { createdAt: { $lt: opts.cursor.createdAt } },
            mongoose.Types.ObjectId.isValid(opts.cursor.id)
              ? {
                  createdAt: opts.cursor.createdAt,
                  _id: { $lt: new mongoose.Types.ObjectId(opts.cursor.id) },
                }
              : { _id: null },
          ],
        }
      : null;

    const filter: Record<string, unknown> = { ...(cursorPred ?? {}) };
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      filter.$or = [{ username: re }, { email: re }, { displayName: re }];
    }

    const docs = await UserModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .select(
        "_id username displayName email state moderator disabledAt disabledBy emailVerifiedAt createdAt",
      );

    const hasMore = docs.length > limit;
    const slice = hasMore ? docs.slice(0, limit) : docs;
    const items: AdminUserDTO[] = slice.map((d) => ({
      _id: d._id!.toString(),
      username: d.username,
      displayName: d.displayName,
      email: d.email,
      state: d.state,
      moderator: !!d.moderator,
      disabled: !!d.disabledAt,
      emailVerified: !!(d as { emailVerifiedAt?: Date }).emailVerifiedAt,
      disabledAt: d.disabledAt,
      disabledBy: d.disabledBy,
      createdAt: d.createdAt!,
    }));
    const last = items[items.length - 1];
    const nextCursor = hasMore && last
      ? { createdAt: last.createdAt, id: last._id }
      : null;
    return { items, nextCursor };
  }

  async create(user: Omit<User, "_id">): Promise<User> {
    await connectToDatabase();
    const doc = await UserModel.create(user);
    return toEntity(doc);
  }

  async updatePassword(email: string, password: string): Promise<void> {
    await connectToDatabase();
    await UserModel.updateOne({ email: email.toLowerCase() }, { password });
  }

  async updatePasswordById(userId: string, password: string): Promise<void> {
    await connectToDatabase();
    await UserModel.updateOne({ _id: userId }, { password });
  }

  async update(email: string, data: Partial<Omit<User, "_id" | "email">>): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: data },
      { returnDocument: "after" }
    );
    return doc ? toEntity(doc) : null;
  }

  async markTutorialCompleted(email: string, name: string): Promise<void> {
    await connectToDatabase();
    await UserModel.updateOne(
      { email: email.toLowerCase() },
      { $addToSet: { tutorialsCompleted: name } },
    );
  }

  async addBadges(userId: string, badgeIds: string[]): Promise<string[]> {
    if (badgeIds.length === 0) return [];
    await connectToDatabase();
    const before = await UserModel.findOne({ _id: userId }, { badges: 1 });
    if (!before) return [];
    const existing = new Set(before.badges ?? []);
    const fresh = badgeIds.filter((id) => !existing.has(id));
    if (fresh.length === 0) return [];
    await UserModel.updateOne(
      { _id: userId },
      { $addToSet: { badges: { $each: fresh } } },
    );
    return fresh;
  }

  async setDisabled(
    email: string,
    disabled: boolean,
    by: string | null,
  ): Promise<User | null> {
    await connectToDatabase();
    // A plain `update` only $sets — re-enabling must $unset the fields so the
    // login block (which keys on `disabledAt` being present) actually lifts.
    const update = disabled
      ? { $set: { disabledAt: new Date(), disabledBy: by ?? "" } }
      : { $unset: { disabledAt: "", disabledBy: "" } };
    const doc = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      update,
      { returnDocument: "after" },
    );
    return doc ? toEntity(doc) : null;
  }

  async delete(email: string): Promise<void> {
    await connectToDatabase();
    await UserModel.deleteOne({ email: email.toLowerCase() });
  }

  async setEmailVerified(userId: string, when: Date): Promise<void> {
    await connectToDatabase();
    await UserModel.updateOne({ _id: userId }, { $set: { emailVerifiedAt: when } });
  }

  async setPendingEmail(userId: string, newEmail: string): Promise<void> {
    await connectToDatabase();
    await UserModel.updateOne(
      { _id: userId },
      { $set: { pendingEmail: newEmail.toLowerCase().trim() } },
    );
  }

  async clearPendingEmail(userId: string): Promise<void> {
    await connectToDatabase();
    await UserModel.updateOne({ _id: userId }, { $unset: { pendingEmail: "" } });
  }

  async promotePendingEmail(userId: string, when: Date): Promise<void> {
    await connectToDatabase();
    const doc = await UserModel.findById(userId);
    if (!doc?.pendingEmail) return;
    doc.email = doc.pendingEmail;
    doc.emailVerifiedAt = when;
    doc.pendingEmail = undefined;
    await doc.save();
  }

  async findByEmailOrPendingEmail(email: string): Promise<User | null> {
    await connectToDatabase();
    const e = email.toLowerCase().trim();
    const doc = await UserModel.findOne({ $or: [{ email: e }, { pendingEmail: e }] });
    return doc ? toEntity(doc) : null;
  }
}
