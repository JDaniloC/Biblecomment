import mongoose from "mongoose";
import {
	IDiscussionLikeRepository,
	DiscussionLikeTarget,
} from "@/domain/repositories/IDiscussionLikeRepository";
import { DiscussionLikeModel } from "@/infrastructure/database/models/DiscussionLikeModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toObjectIds(ids: string[]): mongoose.Types.ObjectId[] {
	const out: mongoose.Types.ObjectId[] = [];
	for (const id of ids) {
		if (mongoose.Types.ObjectId.isValid(id)) {
			out.push(new mongoose.Types.ObjectId(id));
		}
	}
	return out;
}

export class MongoDiscussionLikeRepository implements IDiscussionLikeRepository {
	// skipcq: JS-0105
	async like(
		userId: string,
		targetType: DiscussionLikeTarget,
		targetId: string,
	): Promise<boolean> {
		if (!mongoose.Types.ObjectId.isValid(targetId)) return false;
		await connectToDatabase();
		const result = await DiscussionLikeModel.updateOne(
			{ userId, targetType, targetId: new mongoose.Types.ObjectId(targetId) },
			{ $setOnInsert: { createdAt: new Date() } },
			{ upsert: true },
		);
		return (result.upsertedCount ?? 0) > 0;
	}

	// skipcq: JS-0105
	async unlike(
		userId: string,
		targetType: DiscussionLikeTarget,
		targetId: string,
	): Promise<void> {
		if (!mongoose.Types.ObjectId.isValid(targetId)) return;
		await connectToDatabase();
		await DiscussionLikeModel.deleteOne({
			userId,
			targetType,
			targetId: new mongoose.Types.ObjectId(targetId),
		});
	}

	// skipcq: JS-0105
	async hasLiked(
		userId: string,
		targetType: DiscussionLikeTarget,
		targetId: string,
	): Promise<boolean> {
		if (!mongoose.Types.ObjectId.isValid(targetId)) return false;
		await connectToDatabase();
		const doc = await DiscussionLikeModel.findOne(
			{ userId, targetType, targetId: new mongoose.Types.ObjectId(targetId) },
			{ _id: 1 },
		);
		return doc !== null;
	}

	// skipcq: JS-0105
	async countByTargets(
		targetType: DiscussionLikeTarget,
		targetIds: string[],
	): Promise<Map<string, number>> {
		const out = new Map<string, number>();
		if (targetIds.length === 0) return out;
		await connectToDatabase();
		const oids = toObjectIds(targetIds);
		if (oids.length === 0) return out;
		const rows = await DiscussionLikeModel.aggregate<{
			_id: mongoose.Types.ObjectId;
			total: number;
		}>([
			{ $match: { targetType, targetId: { $in: oids } } },
			{ $group: { _id: "$targetId", total: { $sum: 1 } } },
		]);
		for (const row of rows) out.set(row._id.toString(), row.total);
		return out;
	}

	// skipcq: JS-0105
	async whichLiked(
		userId: string,
		targetType: DiscussionLikeTarget,
		targetIds: string[],
	): Promise<Set<string>> {
		const out = new Set<string>();
		if (targetIds.length === 0) return out;
		await connectToDatabase();
		const oids = toObjectIds(targetIds);
		if (oids.length === 0) return out;
		const docs = await DiscussionLikeModel.find(
			{ userId, targetType, targetId: { $in: oids } },
			{ targetId: 1, _id: 0 },
		);
		for (const d of docs) out.add(d.targetId.toString());
		return out;
	}

	// skipcq: JS-0105
	async deleteAllByUser(userId: string): Promise<number> {
		await connectToDatabase();
		const res = await DiscussionLikeModel.deleteMany({ userId });
		return res.deletedCount ?? 0;
	}

	// skipcq: JS-0105
	async deleteByTarget(
		targetType: DiscussionLikeTarget,
		targetId: string,
	): Promise<number> {
		if (!mongoose.Types.ObjectId.isValid(targetId)) return 0;
		await connectToDatabase();
		const res = await DiscussionLikeModel.deleteMany({
			targetType,
			targetId: new mongoose.Types.ObjectId(targetId),
		});
		return res.deletedCount ?? 0;
	}
}
