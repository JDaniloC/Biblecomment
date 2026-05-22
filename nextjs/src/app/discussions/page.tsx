import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DISCUSSIONS_TUTORIAL_NAME } from "@/lib/tutorial-config";
import DiscussionsClient from "./DiscussionsClient";

export default async function DiscussionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tutorialAlreadyCompleted =
    session.user.tutorialsCompleted?.includes(DISCUSSIONS_TUTORIAL_NAME) ??
    false;

  return (
    <DiscussionsClient
      user={session.user}
      tutorialAlreadyCompleted={tutorialAlreadyCompleted}
    />
  );
}
