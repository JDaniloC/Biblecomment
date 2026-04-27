import bcrypt from "bcryptjs";
import crypto from "crypto";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { User } from "@/domain/entities/User";

function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

export class RegisterUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string, username: string, password: string): Promise<User> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new Error("Email already registered");

    const existingUsername = await this.userRepo.findByUsername(username);
    if (existingUsername) throw new Error("Username already taken");

    const hashedPassword = await bcrypt.hash(password, 12);
    return this.userRepo.create({
      email: email.toLowerCase(),
      username,
      password: hashedPassword,
      passwordType: "bcrypt",
      moderator: false,
    });
  }
}

export class GetUserByEmailUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }
}

export class UpdateUserProfileUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(
    email: string,
    data: { state?: string; belief?: string }
  ): Promise<User> {
    const updated = await this.userRepo.update(email, data);
    if (!updated) throw new Error("User not found");
    return updated;
  }
}

export class ChangePasswordUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(
    email: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new Error("User not found");

    // Match the verification flow used by the NextAuth Credentials
    // provider so legacy MD5 accounts can change their password without
    // logging in twice.
    let valid = false;
    if (user.passwordType === "md5") {
      valid = user.password === md5(currentPassword);
    } else {
      valid = await bcrypt.compare(currentPassword, user.password);
    }
    if (!valid) throw new Error("Invalid current password");

    const hashed = await bcrypt.hash(newPassword, 12);
    // Always promotes legacy MD5 users to bcrypt at this point.
    await this.userRepo.updatePassword(email, hashed, "bcrypt");
  }
}
