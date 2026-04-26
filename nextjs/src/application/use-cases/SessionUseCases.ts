import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { User } from "@/domain/entities/User";

export class GetSessionUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }
}

export class ValidateSessionUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string): Promise<boolean> {
    const user = await this.userRepo.findByEmail(email);
    return user !== null;
  }
}
