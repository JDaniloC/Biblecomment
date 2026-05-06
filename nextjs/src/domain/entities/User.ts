export interface User {
  _id?: string;
  email: string;
  username: string;
  password: string;
  passwordType: "md5" | "bcrypt";
  state?: string;
  belief?: string;
  moderator?: boolean;
  /**
   * Onboarding tutorials the user has finished or skipped.
   * Versioned identifiers (e.g. "chapter-v1") so a future tour bump
   * can reuse the same field without re-prompting older completions.
   */
  tutorialsCompleted?: string[];
  /**
   * Badge IDs the user has unlocked (catalog ids from src/lib/badges/catalog.ts).
   * Append-only via $addToSet — concurrent grants converge.
   */
  badges?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
