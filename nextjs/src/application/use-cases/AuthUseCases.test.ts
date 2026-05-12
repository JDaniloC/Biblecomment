import { describe, it, expect, vi } from "vitest";
import { RegisterUserUseCase } from "./AuthUseCases";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { User } from "@/domain/entities/User";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    _id: "u1",
    email: "x@y.z",
    username: "user",
    password: "hashed",
    ...overrides,
  };
}

function setup(opts: {
  emailHits?: User | null;
  takenSlugs?: string[];
} = {}) {
  const taken = new Set(opts.takenSlugs ?? []);
  const findByEmail = vi.fn().mockResolvedValue(opts.emailHits ?? null);
  const findByUsername = vi.fn(async (slug: string) =>
    taken.has(slug) ? fakeUser({ username: slug }) : null,
  );
  const create = vi.fn(async (u: Partial<User>) => fakeUser(u));
  const repo = { findByEmail, findByUsername, create } as unknown as IUserRepository;
  return { repo, create };
}

describe("RegisterUserUseCase", () => {
  it("derives a slug from displayName when username is omitted", async () => {
    const { repo, create } = setup();
    const useCase = new RegisterUserUseCase(repo);

    const user = await useCase.execute({
      email: "a@b.c",
      displayName: "João Daniel",
      password: "secret123",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ username: "joao-daniel", displayName: "João Daniel" }),
    );
    expect(user.username).toBe("joao-daniel");
  });

  it("disambiguates with -2, -3 when slug is taken", async () => {
    const { repo, create } = setup({ takenSlugs: ["felipe", "felipe-2"] });
    const useCase = new RegisterUserUseCase(repo);

    await useCase.execute({
      email: "a@b.c",
      displayName: "Felipe",
      password: "secret123",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ username: "felipe-3" }),
    );
  });

  it("rejects when email is already registered", async () => {
    const { repo } = setup({ emailHits: fakeUser({ email: "a@b.c" }) });
    const useCase = new RegisterUserUseCase(repo);

    await expect(
      useCase.execute({ email: "a@b.c", displayName: "X", password: "secret123" }),
    ).rejects.toThrow("Email already registered");
  });

  it("rejects when displayName sanitizes to nothing usable", async () => {
    const { repo } = setup();
    const useCase = new RegisterUserUseCase(repo);

    await expect(
      useCase.execute({ email: "a@b.c", displayName: "@@@", password: "secret123" }),
    ).rejects.toThrow("Could not derive a username");
  });

  it("rejects when caller-provided username doesn't match canonical pattern", async () => {
    const { repo } = setup();
    const useCase = new RegisterUserUseCase(repo);

    await expect(
      useCase.execute({
        email: "a@b.c",
        displayName: "X",
        username: "Has Space",
        password: "secret123",
      }),
    ).rejects.toThrow("Invalid username format");
  });

  it("returns 409 when caller-provided username is taken (no silent rename)", async () => {
    const { repo } = setup({ takenSlugs: ["felipe"] });
    const useCase = new RegisterUserUseCase(repo);

    await expect(
      useCase.execute({
        email: "a@b.c",
        displayName: "Felipe",
        username: "felipe",
        password: "secret123",
      }),
    ).rejects.toThrow("Username already taken");
  });

  it("accepts caller-provided username when it's free", async () => {
    const { repo, create } = setup();
    const useCase = new RegisterUserUseCase(repo);

    await useCase.execute({
      email: "a@b.c",
      displayName: "Felipe",
      username: "felipinho",
      password: "secret123",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ username: "felipinho", displayName: "Felipe" }),
    );
  });

  it("trims displayName whitespace", async () => {
    const { repo, create } = setup();
    const useCase = new RegisterUserUseCase(repo);

    await useCase.execute({
      email: "a@b.c",
      displayName: "  Felipe  ",
      password: "secret123",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "Felipe" }),
    );
  });
});
