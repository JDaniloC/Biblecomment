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
  // `taken` covers both live usernames and ones still held as another
  // account's `renameFrom`; the repo answers both through isUsernameHeld.
  const isUsernameHeld = vi.fn(async (slug: string) => taken.has(slug));
  const create = vi.fn(async (u: Partial<User>) => fakeUser(u));
  const repo = {
    findByEmail,
    findByUsername,
    isUsernameHeld,
    create,
  } as unknown as IUserRepository;
  return { repo, create, isUsernameHeld };
}

describe("RegisterUserUseCase", () => {
  it("checks availability through isUsernameHeld (covers slugs held by an unfinished rename)", async () => {
    const { repo, create, isUsernameHeld } = setup({ takenSlugs: ["ana"] });

    await new RegisterUserUseCase(repo).execute({
      email: "a@b.c",
      displayName: "Ana",
      password: "secret123",
    });

    expect(isUsernameHeld).toHaveBeenCalledWith("ana");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ username: "ana-2" }));
  });

  it("clears stale username-keyed records before the new account takes the slug", async () => {
    const { repo, create } = setup();
    const order: string[] = [];
    const mark = (name: string) => vi.fn(async () => {
      order.push(name);
      return 0;
    });
    const usernameKeyed = {
      pushSubscription: { deleteAllByUsername: mark("push") },
      readingReminder: { deleteByUsername: mark("reminder") },
      notification: { deleteForUser: mark("notifications") },
    };
    create.mockImplementation(async (u: Partial<User>) => {
      order.push("create");
      return fakeUser(u);
    });

    await new RegisterUserUseCase(
      repo,
      usernameKeyed as unknown as ConstructorParameters<typeof RegisterUserUseCase>[1],
    ).execute({ email: "a@b.c", displayName: "Bia", password: "secret123" });

    expect(usernameKeyed.pushSubscription.deleteAllByUsername).toHaveBeenCalledWith("bia");
    expect(usernameKeyed.readingReminder.deleteByUsername).toHaveBeenCalledWith("bia");
    expect(usernameKeyed.notification.deleteForUser).toHaveBeenCalledWith("bia");
    expect(order[order.length - 1]).toBe("create");
  });

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

  it("rejects a caller-provided reserved username", async () => {
    const { repo, create } = setup();
    const useCase = new RegisterUserUseCase(repo);

    for (const username of ["system", "deleted-user"]) {
      await expect(
        useCase.execute({
          email: "a@b.c",
          displayName: "X",
          username,
          password: "secret123",
        }),
      ).rejects.toThrow("Invalid username format");
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("suffixes a slug derived from a display name that sanitizes to a reserved name", async () => {
    const { repo, create } = setup();
    const useCase = new RegisterUserUseCase(repo);

    await useCase.execute({
      email: "a@b.c",
      displayName: "System",
      password: "secret123",
    });
    await useCase.execute({
      email: "d@e.f",
      displayName: "Deleted User",
      password: "secret123",
    });

    expect(create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ username: "system-2", displayName: "System" }),
    );
    expect(create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ username: "deleted-user-2" }),
    );
  });

  it("keeps counting past taken suffixes of a reserved derived slug", async () => {
    const { repo, create } = setup({ takenSlugs: ["system-2"] });
    const useCase = new RegisterUserUseCase(repo);

    await useCase.execute({
      email: "a@b.c",
      displayName: "System",
      password: "secret123",
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ username: "system-3" }),
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
