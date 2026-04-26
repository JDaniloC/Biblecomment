import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import SearchClient from "./SearchClient";

export default async function SearchPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <SearchClient user={session.user} />;
}
