import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { User } from "@/domain/entities/User";
import { PublicUserDTO } from "@/domain/dto/PublicUserDTO";
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
      { username: 1, displayName: 1, badges: 1, belief: 1, showBelief: 1, createdAt: 1 },
    ).lean();
    if (!doc) return null;
    return {
      username: doc.username,
      displayName: doc.displayName,
      badges: doc.badges ? [...doc.badges] : [],
      belief: doc.showBelief ? doc.belief : undefined,
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

  async delete(email: string): Promise<void> {
    await connectToDatabase();
    await UserModel.deleteOne({ email: email.toLowerCase() });
  }
}
