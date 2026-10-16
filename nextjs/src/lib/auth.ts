import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { MongoUserRepository } from "@/infrastructure/repositories/MongoUserRepository";
import { loadSessionUser } from "@/lib/session-revalidation";

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

        // A moderator-disabled account, or one whose deletion is in
        // progress, cannot start a new session. Sessions it already holds
        // are dropped by the DB revalidation in the jwt callback below.
        if (user.disabledAt || user.deletion) return null;

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
    async jwt({ token, user, trigger }) {
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
      // Tokens minted before `id` was a claim can't be revalidated; make
      // them sign in again rather than trusting their claims.
      if (!token.id) return null;
      // Revalidate against the DB on every session read (cached ~60s per
      // process, see lib/session-revalidation.ts). A deleted, disabled or
      // mid-deletion account loses its session: returning null makes
      // Auth.js treat the request as signed out and clear the cookie. For
      // active accounts the DB is the only source of the identity claims.
      //
      // Client-triggered refreshes (useSession().update(...)) land here with
      // `trigger="update"` and only force a fresh read: every call site
      // writes the DB first, and the payload the client sends is ignored —
      // copying it would let any signed-in client claim another user's
      // email or username whenever the lookup below fails open.
      //
      // `claimsAt` is when the read behind the current claims started; it
      // keeps another instance's older cache entry from rolling the claims
      // back after a rename or email change. A failed lookup ("unknown")
      // keeps the token as-is rather than logging everyone out on a
      // transient DB error.
      const claimsAt = typeof token.claimsAt === "number" ? token.claimsAt : undefined;
      const state = await loadSessionUser(token.id, {
        fresh: !!user || trigger === "update",
        notBefore: claimsAt,
      });
      if (state.status === "inactive") return null;
      if (state.status === "active") {
        token.email = state.user.email;
        token.username = state.user.username;
        token.name = state.user.name;
        token.moderator = state.user.moderator;
        token.emailVerified = state.user.emailVerified;
        token.pendingEmail = state.user.pendingEmail;
        // Never move backwards. A result older than `claimsAt` can only be a
        // new read on an instance whose clock lags the one that set it — its
        // data is newer, but lowering `claimsAt` to its timestamp would let
        // other instances serve entries older than the current claims.
        token.claimsAt = Math.max(claimsAt ?? 0, state.fetchedAt);
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
