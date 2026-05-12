import { PasswordResetToken } from "../entities/PasswordResetToken";

export interface IPasswordResetTokenRepository {
  create(token: Omit<PasswordResetToken, "_id" | "createdAt">): Promise<PasswordResetToken>;
  findActiveByHash(hash: string): Promise<PasswordResetToken | null>;
  deleteByUserId(userId: string): Promise<void>;
  deleteById(id: string): Promise<void>;
  countRecentByUserId(userId: string, sinceMs: number): Promise<number>;
}
