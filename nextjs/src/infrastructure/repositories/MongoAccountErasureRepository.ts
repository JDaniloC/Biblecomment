import mongoose from "mongoose";
import {
	AccountErasure,
	IAccountErasureRepository,
} from "@/domain/repositories/IAccountErasureRepository";
import { AccountErasureModel } from "@/infrastructure/database/models/AccountErasureModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { logger } from "@/lib/logger";

/** Account ids are ObjectIds; anything else can't name an account. */
function toObjectId(id: string): mongoose.Types.ObjectId | null {
	return /^[0-9a-f]{24}$/i.test(id) ? new mongoose.Types.ObjectId(id) : null;
}

export class MongoAccountErasureRepository implements IAccountErasureRepository {
	async record(userId: string, at: Date): Promise<void> {
		await this.upsertMany([{ userId, erasedAt: at }]);
		// A copy of the journal outside the database, which a data loss takes
		// down together with the tombstones: before restoring users from an
		// export, the entries newer than it are re-posted to
		// /api/backup/erasures (see BackupUseCases). Only the id and the date,
		// nothing that identifies the person. Ids upsertMany skipped are not
		// logged, so every entry is one that endpoint accepts.
		if (toObjectId(userId) && !Number.isNaN(at.getTime())) {
			logger.info(
				{ action: "account_erased", userId, erasedAt: at.toISOString() },
				"account erasure recorded",
			);
		}
	}

	async findErased(userIds: string[]): Promise<Set<string>> {
		const ids = userIds
			.map(toObjectId)
			.filter((id): id is mongoose.Types.ObjectId => id !== null);
		if (ids.length === 0) return new Set();
		await connectToDatabase();
		const docs = await AccountErasureModel.find(
			{ _id: { $in: ids } },
			{ _id: 1 },
		).lean();
		return new Set(docs.map((d) => d._id.toString()));
	}

	async list(): Promise<AccountErasure[]> {
		await connectToDatabase();
		const docs = await AccountErasureModel.find({})
			.sort({ erasedAt: 1, _id: 1 })
			.lean();
		return docs.map((d) => ({ userId: d._id.toString(), erasedAt: d.erasedAt }));
	}

	async upsertMany(rows: AccountErasure[]): Promise<number> {
		const ops = rows.flatMap((row) => {
			const _id = toObjectId(row.userId);
			const erasedAt = new Date(row.erasedAt);
			if (!_id || Number.isNaN(erasedAt.getTime())) return [];
			// $max: a repeat (a retried deletion, a re-imported export) never
			// moves a tombstone's date backwards, so every write is idempotent.
			return [
				{
					updateOne: {
						filter: { _id },
						update: { $max: { erasedAt } },
						upsert: true,
					},
				},
			];
		});
		if (ops.length === 0) return 0;
		await connectToDatabase();
		const res = await AccountErasureModel.bulkWrite(ops, { ordered: false });
		return res.upsertedCount ?? 0;
	}
}
