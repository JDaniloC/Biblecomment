import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PROFILE_TUTORIAL_NAME } from "@/lib/tutorial-config";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tutorialAlreadyCompleted =
    session.user.tutorialsCompleted?.includes(PROFILE_TUTORIAL_NAME) ?? false;

  return (
    <ProfileClient
      user={session.user}
      tutorialAlreadyCompleted={tutorialAlreadyCompleted}
    />
  );
}
