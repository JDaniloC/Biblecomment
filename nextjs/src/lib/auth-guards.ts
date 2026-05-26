import type { User } from "@/domain/entities/User";

export function isEmailVerified(user: User | null | undefined): boolean {
  return !!user?.emailVerifiedAt;
}

export class EmailNotVerifiedError extends Error {
  readonly code = "EMAIL_NOT_VERIFIED" as const;
  constructor(message = "Verifique seu e-mail para participar.") {
    super(message);
    this.name = "EmailNotVerifiedError";
  }
}
