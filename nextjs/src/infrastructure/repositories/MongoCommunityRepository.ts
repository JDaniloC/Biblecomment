import {
	ICommunityRepository,
	ListCommunitiesParams,
	ListCommunitiesResult,
} from "@/domain/repositories/ICommunityRepository";
import { Community } from "@/domain/entities/Community";
import {
	CommunityModel,
	ICommunityDocument,
} from "@/infrastructure/database/models/CommunityModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: ICommunityDocument): Community {
	return {
		_id: doc._id?.toString(),
		slug: doc.slug,
		name: doc.name,
		description: doc.description,
		createdBy: doc.createdBy,
		memberCount: doc.memberCount,
		// Older docs predate followerCount; treat absence as zero so existing
		// communities don't render NaN until the migration script touches them.
		followerCount: doc.followerCount ?? 0,
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

export class MongoCommunityRepository implements ICommunityRepository {
	async create(
		input: Omit<
			Community,
			"_id" | "createdAt" | "updatedAt" | "memberCount" | "followerCount"
		>,
	): Promise<Community> {
		await connectToDatabase();
		const doc = await CommunityModel.create({
			slug: input.slug.toLowerCase(),
			name: input.name,
			description: input.description ?? "",
			createdBy: input.createdBy,
			memberCount: 0,
			followerCount: 0,
		});
		return toEntity(doc);
	}

	async findById(id: string): Promise<Community | null> {
		await connectToDatabase();
		const doc = await CommunityModel.findById(id);
		return doc ? toEntity(doc) : null;
	}

	async findBySlug(slug: string): Promise<Community | null> {
		await connectToDatabase();
		const doc = await CommunityModel.findOne({ slug: slug.toLowerCase() });
		return doc ? toEntity(doc) : null;
	}

	async list(params: ListCommunitiesParams): Promise<ListCommunitiesResult> {
		await connectToDatabase();
		const page = Math.max(1, params.page);
		const pageSize = Math.max(1, Math.min(params.pageSize, 100));
		const filter: Record<string, unknown> = {};
		if (params.query && params.query.trim().length > 0) {
			// Anchored prefix on slug + case-insensitive substring on name. Avoids
			// pulling in $text to keep results predictable for short queries.
			const escaped = params.query
				.trim()
				.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			filter.$or = [
				{ slug: { $regex: `^${escaped.toLowerCase()}` } },
				{ name: { $regex: escaped, $options: "i" } },
			];
		}
		const [docs, total] = await Promise.all([
			CommunityModel.find(filter)
				.sort({ memberCount: -1, createdAt: -1 })
				.skip((page - 1) * pageSize)
				.limit(pageSize),
			CommunityModel.countDocuments(filter),
		]);
		return { items: docs.map(toEntity), total };
	}

	async countCreatedBy(userId: string): Promise<number> {
		await connectToDatabase();
		return CommunityModel.countDocuments({ createdBy: userId });
	}

	async findManyByIds(ids: string[]): Promise<Community[]> {
		if (ids.length === 0) return [];
		await connectToDatabase();
		const docs = await CommunityModel.find({ _id: { $in: ids } });
		return docs.map(toEntity);
	}

	async incrementMemberCount(id: string, delta: number): Promise<void> {
		await connectToDatabase();
		await CommunityModel.updateOne(
			{ _id: id },
			{ $inc: { memberCount: delta } },
		);
	}

	async incrementFollowerCount(id: string, delta: number): Promise<void> {
		await connectToDatabase();
		await CommunityModel.updateOne(
			{ _id: id },
			{ $inc: { followerCount: delta } },
		);
	}
}
