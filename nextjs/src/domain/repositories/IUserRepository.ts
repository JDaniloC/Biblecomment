import { User } from "../entities/User";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  findAllPaginated(page: number, pageSize: number): Promise<User[]>;
  create(user: Omit<User, "_id">): Promise<User>;
  updatePassword(email: string, password: string, passwordType: "bcrypt"): Promise<void>;
  update(email: string, data: Partial<Omit<User, "_id" | "email">>): Promise<User | null>;
  delete(email: string): Promise<void>;
}
