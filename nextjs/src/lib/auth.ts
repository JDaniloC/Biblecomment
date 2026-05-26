import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";

const userRepo = new MongoUserRepository();

export const authConfig: NextAuthConfig = {
  trustHost: true,
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

        const valid = await bcrypt.compare(rawPassword, user.password);
        if (!valid) return null;

        // A moderator-disabled account cannot start a new session. Existing
        // JWTs are stateless and expire on their own — by design, no
        // per-request DB revalidation.
        if (user.disabledAt) return null;

        return {
          id: user._id!,
          email: user.email,
          name: user.displayName ?? user.username,
          username: user.username,
          moderator: user.moderator ?? false,
          tutorialsCompleted: user.tutorialsCompleted ?? [],
          emailVerified: !!user.emailVerifiedAt,
          pendingEmail: user.pendingEmail ?? null,
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
        token.emailVerified = (user as { emailVerified: boolean }).emailVerified;
        token.pendingEmail = (user as { pendingEmail: string | null }).pendingEmail;
      }
      // Client-triggered session refresh (useSession().update(...)) lands
      // here with `trigger="update"` and `session` carrying the new fields.
      // Without this, renaming the slug leaves the JWT stale and downstream
      // writes (createCommentAction etc.) author records under the old
      // username — orphaning them since the user table no longer has it.
      if (trigger === "update" && session && typeof session === "object") {
        const next = session as { username?: string; displayName?: string; name?: string; email?: string; emailVerified?: boolean; pendingEmail?: string | null };
        if (typeof next.username === "string") token.username = next.username;
        if (typeof next.displayName === "string") token.name = next.displayName;
        else if (typeof next.name === "string") token.name = next.name;
        if (typeof next.email === "string") token.email = next.email;
        if (typeof (next as { emailVerified?: boolean }).emailVerified === "boolean") {
          token.emailVerified = (next as { emailVerified: boolean }).emailVerified;
        }
        if ("pendingEmail" in (next as object)) {
          token.pendingEmail = (next as { pendingEmail: string | null }).pendingEmail;
        }
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
        // Cast needed: the session callback types session.user as AdapterUser (for
        // database strategy) which has emailVerified: Date | null.  We use JWT
        // strategy only — the AdapterUser shape is never realised at runtime.
        (session.user as { emailVerified: boolean }).emailVerified =
          (token.emailVerified as boolean | undefined) ?? false;
        (session.user as { pendingEmail: string | null }).pendingEmail =
          (token.pendingEmail as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
