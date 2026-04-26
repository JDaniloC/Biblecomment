import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <UsersClient user={session.user} />;
}
