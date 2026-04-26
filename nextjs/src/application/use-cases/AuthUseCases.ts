import bcrypt from "bcryptjs";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { User } from "@/domain/entities/User";

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
