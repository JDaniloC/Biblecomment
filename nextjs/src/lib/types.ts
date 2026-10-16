import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      username: string;
      moderator: boolean;
      tutorialsCompleted: string[];
      emailVerified?: boolean;
      pendingEmail?: string | null;
      sessionVersion?: number;
    };
  }

  interface User {
    username: string;
    moderator: boolean;
    tutorialsCompleted: string[];
    emailVerified?: boolean;
    pendingEmail?: string | null;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    moderator: boolean;
    tutorialsCompleted: string[];
    emailVerified?: boolean;
    pendingEmail?: string | null;
    /** User.sessionVersion this token was minted at; absent on legacy tokens (= 0). */
    sessionVersion?: number;
    /** Epoch ms the DB read behind the current claims started (session-revalidation). */
    claimsAt?: number;
  }
}
