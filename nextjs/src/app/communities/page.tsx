import { auth } from "@/lib/auth";
import { MongoCommunityRepository } from "@/infrastructure/repositories/MongoCommunityRepository";
import { COMMUNITIES_TUTORIAL_NAME } from "@/lib/tutorial-config";
import CommunitiesClient from "./CommunitiesClient";

const PAGE_SIZE = 24;

export default async function CommunitiesPage() {
	const session = await auth();
	const result = await new MongoCommunityRepository().list({
		page: 1,
		pageSize: PAGE_SIZE,
	});

	const viewer = session?.user
		? {
				name: session.user.name ?? session.user.username,
				username: session.user.username,
				email: session.user.email,
				moderator: session.user.moderator,
			}
		: null;

	const tutorialAlreadyCompleted =
		session?.user?.tutorialsCompleted?.includes(COMMUNITIES_TUTORIAL_NAME) ??
		false;

	return (
		<CommunitiesClient
			initialItems={result.items}
			initialTotal={result.total}
			viewer={viewer}
			tutorialAlreadyCompleted={tutorialAlreadyCompleted}
		/>
	);
}

export const dynamic = "force-dynamic";

export const metadata = {
	title: "Comunidades — Bible Comment",
	description: "Descubra e participe de comunidades de estudo bíblico.",
};
