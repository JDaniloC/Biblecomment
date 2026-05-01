export interface PasswordResetToken {
  _id?: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt?: Date;
}
