import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cookies } from "next/headers";
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
          // From the same document whose hash was just verified: a login
          // with the old password that races a change gets the old version
          // and is rejected by the fresh read in the jwt callback.
          sessionVersion: user.sessionVersion ?? 0,
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
        token.sessionVersion = user.sessionVersion ?? 0;
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
      //
      // `sessionVersion` revokes sessions: a password change or reset (and
      // disabling) bumps it in the DB, and a token minted at any other
      // version is dropped — on every trigger, "update" included, since a
      // plain client POST to /api/auth/session reaches that branch too. The
      // token's version is never raised to the DB's: that would revalidate
      // every revoked token on its next read. Only a new sign-in (through
      // authorize(), which checks the password) mints the new version.
      // Tokens minted before the claim existed count as version 0.
      const claimsAt = typeof token.claimsAt === "number" ? token.claimsAt : undefined;
      const tokenVersion = typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      const state = await loadSessionUser(token.id, {
        fresh: !!user || trigger === "update",
        notBefore: claimsAt,
        minSessionVersion: tokenVersion,
      });
      if (state.status === "inactive") return null;
      if (state.status === "active") {
        if (state.user.sessionVersion !== tokenVersion) return null;
        token.sessionVersion = tokenVersion;
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
        session.user.sessionVersion = token.sessionVersion ?? 0;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

/**
 * The Auth.js session cookie: `authjs.session-token`, with the `__Secure-`
 * prefix over HTTPS, split into `.0`, `.1`, ... chunks when it is large.
 */
const SESSION_COOKIE = /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/;

/** The session cookie's value in this request's cookie jar ("" when none). */
async function sessionCookieValue(): Promise<string> {
  const jar = await cookies();
  return jar
    .getAll()
    .filter((c) => SESSION_COOKIE.test(c.name))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .map((c) => c.value)
    .join("");
}

/**
 * Sign the browser behind the current request in again, from a server action
 * or route handler, right after its password changed. The change bumped the
 * account's sessionVersion, revoking every session including this one; a
 * fresh credentials sign-in with the new password mints a cookie at the new
 * version (Auth.js runs in-process and writes it with `cookies().set`), so
 * only the other devices are signed out.
 *
 * Returns true only when a new session cookie was actually set. A wrong
 * password throws, but a sign-in whose jwt callback drops the session (the
 * version moved again, or the account went inactive, between authorize()
 * and that callback) doesn't: Auth.js clears the cookie instead. Both cases
 * return false, and the caller tells the client to sign in again.
 */
export async function reestablishSession(email: string, password: string): Promise<boolean> {
  try {
    const before = await sessionCookieValue();
    await signIn("credentials", { email, password, redirect: false });
    const after = await sessionCookieValue();
    // A newly encoded token never equals the old one (fresh IV), and a
    // cleared cookie is empty.
    return after !== "" && after !== before;
  } catch {
    return false;
  }
}
