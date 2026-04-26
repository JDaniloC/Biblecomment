import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.moderator) redirect("/home");

  return <AdminClient user={session.user} />;
}
