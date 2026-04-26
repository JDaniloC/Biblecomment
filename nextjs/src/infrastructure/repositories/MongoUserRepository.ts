import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { User } from "@/domain/entities/User";
import { UserModel, IUserDocument } from "@/infrastructure/database/models/UserModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: IUserDocument): User {
  return {
    _id: doc._id.toString(),
    email: doc.email,
    username: doc.username,
    password: doc.password,
    passwordType: doc.passwordType,
    state: doc.state,
    belief: doc.belief,
    moderator: doc.moderator,
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
    const doc = await UserModel.findOne({ username });
    return doc ? toEntity(doc) : null;
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

  async updatePassword(email: string, password: string, passwordType: "bcrypt"): Promise<void> {
    await connectToDatabase();
    await UserModel.updateOne({ email: email.toLowerCase() }, { password, passwordType });
  }

  async update(email: string, data: Partial<Omit<User, "_id" | "email">>): Promise<User | null> {
    await connectToDatabase();
    const doc = await UserModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: data },
      { new: true }
    );
    return doc ? toEntity(doc) : null;
  }

  async delete(email: string): Promise<void> {
    await connectToDatabase();
    await UserModel.deleteOne({ email: email.toLowerCase() });
  }
}
