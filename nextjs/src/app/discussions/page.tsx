import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DiscussionsClient from "./DiscussionsClient";

export default async function DiscussionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <DiscussionsClient user={session.user} />;
}
