import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MongoDiscussionRepository } from "@/infrastructure/repositories/MongoDiscussionRepository";
import { MongoDiscussionAnswerRepository } from "@/infrastructure/repositories/MongoDiscussionAnswerRepository";
import { MongoBookRepository } from "@/infrastructure/repositories/MongoBookRepository";
import { GetDiscussionsUseCase } from "@/application/use-cases/DiscussionUseCases";
import { toDiscussionWire } from "@/lib/discussion-wire";
import DiscussionDetailClient from "./[id]/DiscussionDetailClient";

type Params = { abbrev: string };

export default async function DiscussionListPage({
	params,
}: {
	params: Promise<Params>;
}) {
	const session = await auth();
	if (!session?.user) redirect("/login");

	const { abbrev } = await params;

	const bookRepo = new MongoBookRepository();
	const book = await bookRepo.findByAbbrev(abbrev);
	if (!book) redirect("/home");

	const useCase = new GetDiscussionsUseCase(
		new MongoDiscussionRepository(),
		new MongoDiscussionAnswerRepository(),
	);
	const discussions = (await useCase.execute(abbrev)).map(toDiscussionWire);

	return (
		<DiscussionDetailClient
			discussion={null}
			discussions={discussions}
			book={book}
			user={session.user}
			mode="list"
		/>
	);
}
