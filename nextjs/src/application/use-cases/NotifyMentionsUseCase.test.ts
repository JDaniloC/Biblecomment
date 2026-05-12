import { describe, it, expect, vi } from "vitest";
import { NotifyMentionsUseCase } from "./NotifyMentionsUseCase";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import type { User } from "@/domain/entities/User";

function fakeUser(username: string): User {
  return {
    _id: username,
    email: `${username}@example.com`,
    username,
    password: "x",
    moderator: false,
  };
}

describe("NotifyMentionsUseCase", () => {
  it("returns 0 when there are no mentions", async () => {
    const findByUsernames = vi.fn();
    const createMany = vi.fn();
    const userRepo = { findByUsernames } as unknown as IUserRepository;
    const notifRepo = { createMany } as unknown as INotificationRepository;
    const useCase = new NotifyMentionsUseCase(userRepo, notifRepo);

    const result = await useCase.execute({
      text: "Plain text with no mentions.",
      actor: "alice",
      type: "comment_mention",
      resourceType: "comment",
      resourceId: "c1",
      url: "/x",
    });

    expect(result).toBe(0);
    expect(findByUsernames).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("filters out self-mentions", async () => {
    const findByUsernames = vi.fn();
    const createMany = vi.fn();
    const userRepo = { findByUsernames } as unknown as IUserRepository;
    const notifRepo = { createMany } as unknown as INotificationRepository;
    const useCase = new NotifyMentionsUseCase(userRepo, notifRepo);

    const result = await useCase.execute({
      text: "Hello @alice from herself",
      actor: "alice",
      type: "comment_mention",
      resourceType: "comment",
      resourceId: "c1",
      url: "/x",
    });

    expect(result).toBe(0);
    expect(findByUsernames).not.toHaveBeenCalled();
  });

  it("ignores mentions for users that don't exist", async () => {
    const findByUsernames = vi.fn().mockResolvedValue([]);
    const createMany = vi.fn();
    const userRepo = { findByUsernames } as unknown as IUserRepository;
    const notifRepo = { createMany } as unknown as INotificationRepository;
    const useCase = new NotifyMentionsUseCase(userRepo, notifRepo);

    const result = await useCase.execute({
      text: "Hello @ghost1 and @ghost2",
      actor: "alice",
      type: "comment_mention",
      resourceType: "comment",
      resourceId: "c1",
      url: "/x",
    });

    expect(result).toBe(0);
    expect(findByUsernames).toHaveBeenCalledWith(["ghost1", "ghost2"]);
    expect(createMany).not.toHaveBeenCalled();
  });

  it("creates one notification per real mentioned user", async () => {
    const findByUsernames = vi.fn().mockResolvedValue([fakeUser("bob"), fakeUser("carol")]);
    const createMany = vi.fn().mockResolvedValue(2);
    const userRepo = { findByUsernames } as unknown as IUserRepository;
    const notifRepo = { createMany } as unknown as INotificationRepository;
    const useCase = new NotifyMentionsUseCase(userRepo, notifRepo);

    const result = await useCase.execute({
      text: "@bob @carol @ghost — check this out",
      actor: "alice",
      type: "comment_mention",
      resourceType: "comment",
      resourceId: "c1",
      url: "/verses/gn/1#1",
    });

    expect(result).toBe(2);
    expect(findByUsernames).toHaveBeenCalledWith(["bob", "carol", "ghost"]);
    expect(createMany).toHaveBeenCalledTimes(1);
    const notifs = createMany.mock.calls[0][0];
    expect(notifs).toHaveLength(2);
    expect(notifs[0].recipient).toBe("bob");
    expect(notifs[1].recipient).toBe("carol");
    expect(notifs[0].actor).toBe("alice");
    expect(notifs[0].url).toBe("/verses/gn/1#1");
  });
});
