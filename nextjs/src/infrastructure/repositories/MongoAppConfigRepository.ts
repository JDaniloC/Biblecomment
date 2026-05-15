import { IAppConfigRepository } from "@/domain/repositories/IAppConfigRepository";
import { AppConfigModel } from "@/infrastructure/database/models/AppConfigModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

export class MongoAppConfigRepository implements IAppConfigRepository {
  async get<T = unknown>(key: string): Promise<T | null> {
    await connectToDatabase();
    const doc = await AppConfigModel.findOne({ key }).lean();
    if (!doc) return null;
    return doc.value as T;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    await connectToDatabase();
    await AppConfigModel.updateOne(
      { key },
      { $set: { value } },
      { upsert: true },
    );
  }
}
