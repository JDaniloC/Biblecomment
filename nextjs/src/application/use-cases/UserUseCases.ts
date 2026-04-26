import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { User } from "@/domain/entities/User";

export class GetUserByEmailUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }
}

export class GetUserByUsernameUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(username: string): Promise<User | null> {
    return this.userRepo.findByUsername(username);
  }
}

export class GetUsersPaginatedUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(page: number, pageSize: number): Promise<Omit<User, "password">[]> {
    const users = await this.userRepo.findAllPaginated(page, pageSize);
    return users.map(({ password: _pw, ...rest }) => rest);
  }
}

export class UpdateUserProfileUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string, data: { state?: string; belief?: string }): Promise<User> {
    const updated = await this.userRepo.update(email, data);
    if (!updated) throw new Error("User not found");
    return updated;
  }
}

export class DeleteUserUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(requestorEmail: string, targetEmail: string, isModerator: boolean): Promise<void> {
    if (requestorEmail !== targetEmail && !isModerator) throw new Error("Unauthorized");
    const user = await this.userRepo.findByEmail(targetEmail);
    if (!user) throw new Error("User not found");
    await this.userRepo.delete(targetEmail);
  }
}

export class SetModeratorUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(email: string, moderator: boolean): Promise<User> {
    const updated = await this.userRepo.update(email, { moderator });
    if (!updated) throw new Error("User not found");
    return updated;
  }
}
