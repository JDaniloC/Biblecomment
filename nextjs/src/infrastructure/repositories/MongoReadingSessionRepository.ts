import type { IReadingSessionRepository } from "@/domain/repositories/IReadingSessionRepository";
import { ReadingSessionModel } from "@/infrastructure/database/models/ReadingSessionModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

export class MongoReadingSessionRepository
	implements IReadingSessionRepository
{
	async registerDay(userId: string, date: string): Promise<void> {
		await connectToDatabase();
		await ReadingSessionModel.updateOne(
			{ userId, date },
			{ $setOnInsert: { userId, date } },
			{ upsert: true },
		);
	}

	async findDays(userId: string): Promise<string[]> {
		await connectToDatabase();
		const docs = await ReadingSessionModel.find(
			{ userId },
			{ date: 1, _id: 0 },
		);
		return docs.map((d) => d.date);
	}
}
