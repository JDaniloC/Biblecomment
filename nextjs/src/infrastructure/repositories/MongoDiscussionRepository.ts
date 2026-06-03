import {
	IDiscussionRepository,
	DiscussionSort,
} from "@/domain/repositories/IDiscussionRepository";
import { Discussion } from "@/domain/entities/Discussion";
import {
	DiscussionModel,
	IDiscussionDocument,
} from "@/infrastructure/database/models/DiscussionModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import { escapeRegExp } from "@/lib/escape-regexp";
import mongoose from "mongoose";

/** Translate a `DiscussionSort` into a Mongo sort spec (createdAt tiebreaker). */
function sortSpec(sort: DiscussionSort): Record<string, 1 | -1> {
	if (sort === "active") return { answersCount: -1, createdAt: -1 };
	if (sort === "liked") return { likeCount: -1, createdAt: -1 };
	return { createdAt: -1 };
}

function toEntity(doc: IDiscussionDocument): Discussion {
	return {
		_id: doc._id?.toString(),
		bookAbbrev: doc.bookAbbrev,
		commentId: doc.commentId?.toString(),
		username: doc.username,
		verseReference: doc.verseReference,
		verseText: doc.verseText,
		commentText: doc.commentText,
		quoteStart: doc.quoteStart,
		quoteEnd: doc.quoteEnd,
		title: doc.title ?? "",
		question: doc.question,
		answersCount: doc.answersCount,
		likeCount: doc.likeCount,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

export class MongoDiscussionRepository implements IDiscussionRepository {
	// skipcq: JS-0105
	async findByBookAbbrev(
		bookAbbrev: string,
		sort: DiscussionSort = "recent",
	): Promise<Discussion[]> {
		await connectToDatabase();
		const docs = await DiscussionModel.find({ bookAbbrev }).sort(
			sortSpec(sort),
		);
		return docs.map(toEntity);
	}

	// skipcq: JS-0105
	async findByBookAbbrevPaginated(
		bookAbbrev: string,
		page: number,
		pageSize: number,
		sort: DiscussionSort = "recent",
	): Promise<Discussion[]> {
		await connectToDatabase();
		const safePage = Math.max(1, page);
		const safeSize = Math.max(1, Math.min(pageSize, 100));
		const docs = await DiscussionModel.find({ bookAbbrev })
			.sort(sortSpec(sort))
			.skip((safePage - 1) * safeSize)
			.limit(safeSize);
		return docs.map(toEntity);
	}

	// skipcq: JS-0105
	async findById(id: string): Promise<Discussion | null> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(id)) return null;
		const doc = await DiscussionModel.findById(id);
		return doc ? toEntity(doc) : null;
	}

	// skipcq: JS-0105
	async findManyByIds(ids: string[]): Promise<Discussion[]> {
		if (ids.length === 0) return [];
		await connectToDatabase();
		const oids = ids
			.filter((id) => mongoose.Types.ObjectId.isValid(id))
			.map((id) => new mongoose.Types.ObjectId(id));
		if (oids.length === 0) return [];
		const docs = await DiscussionModel.find({ _id: { $in: oids } });
		return docs.map(toEntity);
	}

	// skipcq: JS-0105
	async findAllPaginated(
		page: number,
		pageSize: number,
		sort: DiscussionSort = "recent",
		filters?: { q?: string; bookAbbrev?: string },
	): Promise<Discussion[]> {
		await connectToDatabase();
		const safePage = Math.max(1, page);
		const safeSize = Math.max(1, Math.min(pageSize, 100));

		const query: Record<string, unknown> = {};
		const book = filters?.bookAbbrev?.trim();
		if (book) query.bookAbbrev = book;
		const q = filters?.q?.trim();
		if (q) {
			const rx = new RegExp(escapeRegExp(q), "i");
			query.$or = [{ title: rx }, { question: rx }];
		}

		const docs = await DiscussionModel.find(query)
			.sort(sortSpec(sort))
			.skip((safePage - 1) * safeSize)
			.limit(safeSize);
		return docs.map(toEntity);
	}

	// skipcq: JS-0105
	async create(
		discussion: Omit<
			Discussion,
			"_id" | "createdAt" | "updatedAt" | "answers" | "answersCount"
		>,
	): Promise<Discussion> {
		await connectToDatabase();
		const doc = await DiscussionModel.create(discussion);
		return toEntity(doc);
	}

	// skipcq: JS-0105
	async createMany(
		discussions: Omit<
			Discussion,
			"_id" | "createdAt" | "updatedAt" | "answers" | "answersCount"
		>[],
	): Promise<number> {
		if (discussions.length === 0) return 0;
		await connectToDatabase();
		const inserted = await DiscussionModel.insertMany(discussions, {
			ordered: false,
		});
		return inserted.length;
	}

	// skipcq: JS-0105
	async update(
		id: string,
		patch: { title: string; question: string },
	): Promise<Discussion | null> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(id)) return null;
		const doc = await DiscussionModel.findByIdAndUpdate(
			id,
			{ $set: { title: patch.title, question: patch.question } },
			{ returnDocument: "after" },
		);
		return doc ? toEntity(doc) : null;
	}

	// skipcq: JS-0105
	async delete(id: string): Promise<void> {
		await connectToDatabase();
		await DiscussionModel.findByIdAndDelete(id);
	}

	// skipcq: JS-0105
	async findAll(): Promise<Discussion[]> {
		await connectToDatabase();
		const docs = await DiscussionModel.find({});
		return docs.map(toEntity);
	}

	// skipcq: JS-0105
	async anonymizeByUsername(
		oldUsername: string,
		replacement: string,
	): Promise<number> {
		await connectToDatabase();
		// Answers are anonymized separately via DiscussionAnswerRepository
		// (Phase 9.3). This method only handles the top-level discussion author.
		const result = await DiscussionModel.updateMany(
			{ username: oldUsername },
			{ $set: { username: replacement } },
		);
		return result.modifiedCount ?? 0;
	}

	// skipcq: JS-0105
	async userHasOpenedDiscussion(username: string): Promise<boolean> {
		await connectToDatabase();
		const doc = await DiscussionModel.findOne({ username }, { _id: 1 });
		return doc !== null;
	}

	// skipcq: JS-0105
	async countByCommentId(commentIds: string[]): Promise<Map<string, number>> {
		const out = new Map<string, number>();
		if (commentIds.length === 0) return out;
		await connectToDatabase();
		const oids = commentIds
			.filter((id) => mongoose.Types.ObjectId.isValid(id))
			.map((id) => new mongoose.Types.ObjectId(id));
		if (oids.length === 0) return out;
		const rows = await DiscussionModel.aggregate<{
			_id: mongoose.Types.ObjectId;
			total: number;
		}>([
			{ $match: { commentId: { $in: oids } } },
			{ $group: { _id: "$commentId", total: { $sum: 1 } } },
		]);
		for (const row of rows) out.set(row._id.toString(), row.total);
		return out;
	}

	// skipcq: JS-0105
	async findByCommentId(commentId: string): Promise<Discussion[]> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(commentId)) return [];
		const docs = await DiscussionModel.find({
			commentId: new mongoose.Types.ObjectId(commentId),
		}).sort({ createdAt: -1 });
		return docs.map(toEntity);
	}

	// skipcq: JS-0105
	async incrementAnswersCount(id: string, delta: number): Promise<void> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(id)) return;
		await DiscussionModel.updateOne(
			{ _id: id },
			{ $inc: { answersCount: delta } },
		);
	}

	// skipcq: JS-0105
	async incrementLikeCount(id: string, delta: number): Promise<void> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(id)) return;
		await DiscussionModel.updateOne(
			{ _id: id },
			{ $inc: { likeCount: delta } },
		);
	}

	// skipcq: JS-0105
	async decrementLikeCountMany(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		await connectToDatabase();
		const oids = ids
			.filter((i) => mongoose.Types.ObjectId.isValid(i))
			.map((i) => new mongoose.Types.ObjectId(i));
		if (oids.length === 0) return;
		await DiscussionModel.updateMany(
			{ _id: { $in: oids } },
			{ $inc: { likeCount: -1 } },
		);
	}
}
