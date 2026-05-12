import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminModerationClient from "./AdminModerationClient";

export const metadata = {
  title: "Moderação",
  robots: { index: false, follow: false },
};

export default async function AdminModerationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.moderator) redirect("/");
  return <AdminModerationClient user={session.user} />;
}
