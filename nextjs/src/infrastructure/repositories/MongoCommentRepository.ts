import {
	ICommentRepository,
	CommunityFilter,
} from "@/domain/repositories/ICommentRepository";
import { Comment } from "@/domain/entities/Comment";
import {
	CommentModel,
	ICommentDocument,
} from "@/infrastructure/database/models/CommentModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import mongoose from "mongoose";

function toEntity(doc: ICommentDocument): Comment {
	return {
		_id: doc._id?.toString(),
		verseId: doc.verseId?.toString() ?? "",
		username: doc.username,
		onTitle: doc.onTitle,
		bookReference: doc.bookReference,
		text: doc.text,
		tags: doc.tags,
		communitySlug: doc.communitySlug,
		verified: doc.verified ?? false,
		verifiedBy: doc.verifiedBy,
		verifiedAt: doc.verifiedAt,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

export class MongoCommentRepository implements ICommentRepository {
	async findByVerseId(verseId: string): Promise<Comment[]> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(verseId)) return [];
		const docs = await CommentModel.find({
			verseId: new mongoose.Types.ObjectId(verseId),
		}).sort({ createdAt: -1 });
		return docs.map(toEntity);
	}

	async findByVerseIdFiltered(
		verseId: string,
		communities: CommunityFilter,
	): Promise<Comment[]> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(verseId)) return [];
		const filter: Record<string, unknown> = {
			verseId: new mongoose.Types.ObjectId(verseId),
		};
		if (communities === null) {
			// Strictly "general feed" — exclude any comment with a community tag.
			filter.communitySlug = { $in: [null, undefined] };
		} else if (Array.isArray(communities)) {
			// Always include the general feed alongside the chosen communities so
			// toggling "show community X" doesn't visually erase the unmarked posts.
			filter.$or = [
				{ communitySlug: { $in: [null, undefined] } },
				{ communitySlug: { $in: communities } },
			];
		}
		// `undefined` falls through with no filter — equivalent to findByVerseId.
		const docs = await CommentModel.find(filter).sort({ createdAt: -1 });
		return docs.map(toEntity);
	}

	async findByCommunity(
		slug: string,
		page: number,
		pageSize: number,
	): Promise<{ items: Comment[]; total: number }> {
		await connectToDatabase();
		const safePage = Math.max(1, page);
		const safeSize = Math.max(1, Math.min(pageSize, 200));
		const filter = { communitySlug: slug };
		const [docs, total] = await Promise.all([
			CommentModel.find(filter)
				.sort({ createdAt: -1, _id: -1 })
				.skip((safePage - 1) * safeSize)
				.limit(safeSize),
			CommentModel.countDocuments(filter),
		]);
		return { items: docs.map(toEntity), total };
	}

	async findByUsernamesPaginated(
		usernames: string[],
		page: number,
		pageSize: number,
		opts?: { q?: string },
	): Promise<{ items: Comment[]; total: number }> {
		if (usernames.length === 0) return { items: [], total: 0 };
		await connectToDatabase();
		const safePage = Math.max(1, page);
		const safeSize = Math.max(1, Math.min(pageSize, 200));
		const filter: Record<string, unknown> = {
			username: { $in: usernames },
		};
		const q = opts?.q?.trim();
		if (q) {
			// Case-insensitive substring on text/bookReference — simple regex
			// rather than $text so short queries (1-2 chars) still match. The
			// username predicate already narrows the candidate set drastically
			// (community members only), so the regex cost is bounded.
			const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const re = new RegExp(escaped, "i");
			filter.$or = [{ text: re }, { bookReference: re }];
		}
		const [docs, total] = await Promise.all([
			CommentModel.find(filter)
				.sort({ createdAt: -1, _id: -1 })
				.skip((safePage - 1) * safeSize)
				.limit(safeSize),
			CommentModel.countDocuments(filter),
		]);
		return { items: docs.map(toEntity), total };
	}

	async findByUsername(username: string): Promise<Comment[]> {
		await connectToDatabase();
		const docs = await CommentModel.find({ username }).sort({ createdAt: -1 });
		return docs.map(toEntity);
	}

	async findCommentTimestampsByUsername(username: string): Promise<Date[]> {
		await connectToDatabase();
		const docs = await CommentModel.find(
			{ username },
			{ createdAt: 1, _id: 0 },
		);
		return docs.map((d) => d.createdAt).filter((d): d is Date => d != null);
	}

	async findByUsernamePaginated(
		username: string,
		page: number,
		pageSize: number,
	): Promise<Comment[]> {
		await connectToDatabase();
		const safePage = Math.max(1, page);
		const safeSize = Math.max(1, Math.min(pageSize, 200));
		const docs = await CommentModel.find({ username })
			.sort({ createdAt: -1 })
			.skip((safePage - 1) * safeSize)
			.limit(safeSize);
		return docs.map(toEntity);
	}

	async findById(id: string): Promise<Comment | null> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(id)) return null;
		const doc = await CommentModel.findById(id);
		return doc ? toEntity(doc) : null;
	}

	async findAllPaginated(page: number, pageSize: number): Promise<Comment[]> {
		await connectToDatabase();
		const docs = await CommentModel.find({})
			.sort({ createdAt: -1 })
			.skip((page - 1) * pageSize)
			.limit(pageSize);
		return docs.map(toEntity);
	}

	async findManyByIds(ids: string[]): Promise<Comment[]> {
		if (ids.length === 0) return [];
		await connectToDatabase();
		const oids = ids
			.filter((id) => mongoose.Types.ObjectId.isValid(id))
			.map((id) => new mongoose.Types.ObjectId(id));
		if (oids.length === 0) return [];
		const docs = await CommentModel.find({ _id: { $in: oids } });
		return docs.map(toEntity);
	}

	async create(
		comment: Omit<Comment, "_id" | "createdAt" | "updatedAt">,
	): Promise<Comment> {
		await connectToDatabase();
		const doc = await CommentModel.create({
			...comment,
			verseId: new mongoose.Types.ObjectId(comment.verseId),
		});
		return toEntity(doc);
	}

	async createMany(
		comments: Omit<Comment, "_id" | "createdAt" | "updatedAt">[],
	): Promise<number> {
		if (comments.length === 0) return 0;
		await connectToDatabase();
		const docs = comments
			.filter((c) => mongoose.Types.ObjectId.isValid(c.verseId))
			.map((c) => ({ ...c, verseId: new mongoose.Types.ObjectId(c.verseId) }));
		if (docs.length === 0) return 0;
		const inserted = await CommentModel.insertMany(docs, { ordered: false });
		return inserted.length;
	}

	async update(id: string, data: Partial<Comment>): Promise<Comment | null> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(id)) return null;
		const doc = await CommentModel.findByIdAndUpdate(
			id,
			{ $set: data },
			{ returnDocument: "after" },
		);
		return doc ? toEntity(doc) : null;
	}

	async delete(id: string): Promise<void> {
		await connectToDatabase();
		await CommentModel.findByIdAndDelete(id);
	}

	async findAll(): Promise<Comment[]> {
		await connectToDatabase();
		const docs = await CommentModel.find({});
		return docs.map(toEntity);
	}

	async searchByText(query: string): Promise<Comment[]> {
		await connectToDatabase();
		const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const docs = await CommentModel.find(
			{ text: { $regex: escaped, $options: "i" } },
			{
				_id: 1,
				text: 1,
				username: 1,
				bookReference: 1,
				createdAt: 1,
				verseId: 1,
			},
		)
			.sort({ createdAt: -1 })
			.limit(100);
		return docs.map(toEntity);
	}

	async anonymizeByUsername(
		oldUsername: string,
		replacement: string,
	): Promise<number> {
		await connectToDatabase();
		const result = await CommentModel.updateMany(
			{ username: oldUsername },
			{ $set: { username: replacement } },
		);
		return result.modifiedCount ?? 0;
	}

	async findForModeration(opts: {
		q?: string;
		cursor?: { createdAt: Date; id: string } | null;
		limit: number;
		usernamesIn?: string[];
	}): Promise<{
		items: Comment[];
		nextCursor: { createdAt: Date; id: string } | null;
	}> {
		await connectToDatabase();
		const limit = Math.max(1, Math.min(opts.limit, 100));
		const q = opts.q?.trim();
		// Empty `usernamesIn` is explicit "nobody to show" — short-circuit so we
		// don't issue a query with `{ username: { $in: [] } }` which always
		// matches zero rows but still hits the DB.
		if (opts.usernamesIn && opts.usernamesIn.length === 0) {
			return { items: [], nextCursor: null };
		}
		const usernamesPred = opts.usernamesIn
			? { username: { $in: opts.usernamesIn } }
			: null;

		// Cursor predicate: strict-less-than on (createdAt, _id) using the
		// compound index { createdAt: -1, _id: -1 }. Splitting into the two
		// OR branches keeps the query sargable.
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

		let docs: ICommentDocument[];
		if (!q) {
			const filter: Record<string, unknown> = { ...(cursorPred ?? {}) };
			if (usernamesPred) Object.assign(filter, usernamesPred);
			docs = await CommentModel.find(filter)
				.sort({ createdAt: -1, _id: -1 })
				.limit(limit + 1);
		} else {
			// $text doesn't compose inside $or, so we issue both sides in
			// parallel and merge in JS. Each side is bounded by `limit + 1`,
			// so the merge buffer is at most 2*(limit+1) — tiny.
			const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const re = new RegExp(escaped, "i");

			const textFilter: Record<string, unknown> = { $text: { $search: q } };
			const metaFilter: Record<string, unknown> = {
				$or: [{ username: re }, { bookReference: re }],
			};
			if (cursorPred) {
				textFilter.$and = [cursorPred];
				metaFilter.$and = [cursorPred];
			}
			if (usernamesPred) {
				Object.assign(textFilter, usernamesPred);
				Object.assign(metaFilter, usernamesPred);
			}

			const [byText, byMeta] = await Promise.all([
				CommentModel.find(textFilter)
					.sort({ createdAt: -1, _id: -1 })
					.limit(limit + 1),
				CommentModel.find(metaFilter)
					.sort({ createdAt: -1, _id: -1 })
					.limit(limit + 1),
			]);

			const seen = new Set<string>();
			docs = [...byText, ...byMeta]
				.filter((d) => {
					const id = d._id?.toString() ?? "";
					if (seen.has(id)) return false;
					seen.add(id);
					return true;
				})
				.sort((a, b) => {
					const ad = a.createdAt?.getTime() ?? 0;
					const bd = b.createdAt?.getTime() ?? 0;
					if (ad !== bd) return bd - ad;
					return (b._id?.toString() ?? "").localeCompare(
						a._id?.toString() ?? "",
					);
				})
				.slice(0, limit + 1);
		}

		const hasMore = docs.length > limit;
		const items = (hasMore ? docs.slice(0, limit) : docs).map(toEntity);
		const last = items[items.length - 1];
		const nextCursor =
			hasMore && last?.createdAt && last._id
				? { createdAt: last.createdAt, id: last._id }
				: null;

		return { items, nextCursor };
	}

	async setVerified(
		id: string,
		verified: boolean,
		by: string | null,
	): Promise<Comment | null> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(id)) return null;
		const update = verified
			? {
					$set: {
						verified: true,
						verifiedBy: by ?? "",
						verifiedAt: new Date(),
					},
				}
			: {
					$set: { verified: false },
					$unset: { verifiedBy: "", verifiedAt: "" },
				};
		const doc = await CommentModel.findByIdAndUpdate(id, update, {
			returnDocument: "after",
		});
		return doc ? toEntity(doc) : null;
	}

	async countsForChapter(
		verseIds: string[],
	): Promise<{ countMap: Record<string, number>; titleCount: number }> {
		if (verseIds.length === 0) return { countMap: {}, titleCount: 0 };
		await connectToDatabase();
		const oids = verseIds
			.filter((id) => mongoose.Types.ObjectId.isValid(id))
			.map((id) => new mongoose.Types.ObjectId(id));
		if (oids.length === 0) return { countMap: {}, titleCount: 0 };

		const rows = await CommentModel.aggregate<{
			_id: { verseId: mongoose.Types.ObjectId; onTitle: boolean };
			count: number;
		}>([
			{ $match: { verseId: { $in: oids } } },
			{
				$group: {
					_id: {
						verseId: "$verseId",
						onTitle: { $ifNull: ["$onTitle", false] },
					},
					count: { $sum: 1 },
				},
			},
		]);

		let titleCount = 0;
		const countMap: Record<string, number> = {};
		for (const row of rows) {
			if (row._id.onTitle) titleCount += row.count;
			else
				countMap[row._id.verseId.toString()] =
					(countMap[row._id.verseId.toString()] ?? 0) + row.count;
		}
		return { countMap, titleCount };
	}

	async findDailyFeatured(dayIndex: number): Promise<Comment | null> {
		await connectToDatabase();
		const filter = {
			onTitle: false,
			$expr: { $gte: [{ $strLenCP: "$text" }, 40] },
		};
		const total = await CommentModel.countDocuments(filter);
		if (total === 0) return null;
		const skip = dayIndex % total;
		const doc = await CommentModel.findOne(filter).sort({ _id: 1 }).skip(skip);
		return doc ? toEntity(doc) : null;
	}
}
