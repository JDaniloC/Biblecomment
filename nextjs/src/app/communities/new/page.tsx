import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import NewCommunityClient from "./NewCommunityClient";

export default async function NewCommunityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/communities/new");

  return (
    <NewCommunityClient
      viewer={{
        name: session.user.name ?? session.user.username,
        username: session.user.username,
        email: session.user.email,
        moderator: session.user.moderator,
      }}
    />
  );
}

export const metadata = {
  title: "Criar comunidade — Bible Comment",
};
