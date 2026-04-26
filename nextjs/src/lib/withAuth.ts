import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export interface SessionUser {
  name: string;
  email: string;
  username: string;
  moderator: boolean;
}

export async function withAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user as SessionUser;
}
