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
    };
  }

  interface User {
    username: string;
    moderator: boolean;
    tutorialsCompleted: string[];
    emailVerified?: boolean;
    pendingEmail?: string | null;
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
  }
}
