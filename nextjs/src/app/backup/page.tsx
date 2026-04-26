import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import BackupClient from "./BackupClient";

export default async function BackupPage() {
  const session = await auth();
  if (!session?.user || !session.user.moderator) redirect("/home");

  return <BackupClient user={session.user} />;
}
