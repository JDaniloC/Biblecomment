import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { GetDiscussionsUseCase } from "@/application/use-cases/DiscussionUseCases";
import type { DiscussionSort } from "@/domain/repositories/IDiscussionRepository";
import { toDiscussionWire } from "@/lib/discussion-wire";
import DiscussionDetailClient from "./[id]/DiscussionDetailClient";

type Params = { abbrev: string };
type SearchParams = { sort?: string };

export default async function DiscussionListPage({
	params,
	searchParams,
}: {
	params: Promise<Params>;
	searchParams: Promise<SearchParams>;
}) {
	const session = await auth();
	if (!session?.user) redirect("/login");

	const { abbrev } = await params;
	const { sort: rawSort } = await searchParams;
	const sort = (
		["recent", "active", "liked"].includes(rawSort ?? "") ? rawSort : "recent"
	) as DiscussionSort;

	const bookRepo = new MongoBookRepository();
	const book = await bookRepo.findByAbbrev(abbrev);
	if (!book) redirect("/home");

	const useCase = new GetDiscussionsUseCase(
		new MongoDiscussionRepository(),
		new MongoUserRepository(),
	);
	const discussions = (await useCase.execute(abbrev, undefined, sort)).map(
		toDiscussionWire,
	);

	return (
		<DiscussionDetailClient
			discussion={null}
			discussions={discussions}
			book={book}
			user={session.user}
			mode="list"
			sort={sort}
		/>
	);
}
