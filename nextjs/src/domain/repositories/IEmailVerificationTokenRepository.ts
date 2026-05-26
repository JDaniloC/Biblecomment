import { EmailVerificationToken } from "../entities/EmailVerificationToken";

export interface IEmailVerificationTokenRepository {
  create(token: Omit<EmailVerificationToken, "_id" | "createdAt">): Promise<EmailVerificationToken>;
  findActiveByHash(hash: string): Promise<EmailVerificationToken | null>;
  deleteByUserId(userId: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  countRecentByUserId(userId: string, sinceMs: number): Promise<number>;
}
