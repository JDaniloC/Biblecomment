import { NextResponse } from "next/server";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { GetAllDiscussionsPaginatedUseCase } from "@/application/use-cases/DiscussionUseCases";
import type { DiscussionSort } from "@/domain/repositories/IDiscussionRepository";
import { serverError } from "@/lib/get-session";

const PAGE_SIZE = 5;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get("pages") ?? "1", 10);
		const rawSort = searchParams.get("sort") ?? "recent";
		const sort = (
			["recent", "active", "liked"].includes(rawSort) ? rawSort : "recent"
		) as DiscussionSort;

		// List page consumer (DiscussionsClient) reads stored `answersCount`/
		// `likeCount` straight off each row; userRepo only fills authorEmailVerified.
		const useCase = new GetAllDiscussionsPaginatedUseCase(
			new MongoDiscussionRepository(),
			new MongoUserRepository(),
		);
		return NextResponse.json(await useCase.execute(page, PAGE_SIZE, sort));
	} catch (err) {
		return serverError(err);
	}
}
