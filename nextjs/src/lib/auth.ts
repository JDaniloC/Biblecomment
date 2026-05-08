import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";

const userRepo = new MongoUserRepository();

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      // The field is labeled "Identifier" because the user can supply
      // either their email or their canonical username slug. Email is
      // detected by the presence of "@"; anything else is treated as a
      // username and looked up via findByUsername.
      credentials: {
        email: { label: "Email ou nome de usuário", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const identifier = (credentials.email as string).trim();
        const rawPassword = credentials.password as string;

        const user = identifier.includes("@")
          ? await userRepo.findByEmail(identifier.toLowerCase())
          : await userRepo.findByUsername(identifier.toLowerCase());
        if (!user) return null;

        let valid = false;

        if (user.passwordType === "md5") {
          valid = user.password === md5(rawPassword);
          if (valid) {
            const hashed = await bcrypt.hash(rawPassword, 12);
            await userRepo.updatePassword(user.email, hashed, "bcrypt");
          }
        } else {
          valid = await bcrypt.compare(rawPassword, user.password);
        }

        // The JWT only carries id, email, username, moderator (see return below).
        // It does not include passwordType / password, so the MD5 -> bcrypt upgrade
        // above does not desynchronize the session. The next login (and all
        // subsequent ones) will hit the bcrypt branch.

        if (!valid) return null;

        return {
          id: user._id!,
          email: user.email,
          name: user.displayName ?? user.username,
          username: user.username,
          moderator: user.moderator ?? false,
          tutorialsCompleted: user.tutorialsCompleted ?? [],
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id ?? "";
        token.email = (user.email ?? "") as string;
        token.name = user.name as string;
        token.username = (user as { username: string }).username;
        token.moderator = (user as { moderator: boolean }).moderator;
        token.tutorialsCompleted =
          (user as { tutorialsCompleted?: string[] }).tutorialsCompleted ?? [];
      }
      // Client-triggered session refresh (useSession().update(...)) lands
      // here with `trigger="update"` and `session` carrying the new fields.
      // Without this, renaming the slug leaves the JWT stale and downstream
      // writes (createCommentAction etc.) author records under the old
      // username — orphaning them since the user table no longer has it.
      if (trigger === "update" && session && typeof session === "object") {
        const next = session as { username?: string; displayName?: string; name?: string };
        if (typeof next.username === "string") token.username = next.username;
        if (typeof next.displayName === "string") token.name = next.displayName;
        else if (typeof next.name === "string") token.name = next.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.username = token.username as string;
        session.user.moderator = token.moderator as boolean;
        session.user.tutorialsCompleted =
          (token.tutorialsCompleted as string[] | undefined) ?? [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
