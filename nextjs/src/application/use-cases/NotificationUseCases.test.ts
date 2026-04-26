import { describe, it, expect, vi } from "vitest";
import {
  CreateNotificationUseCase,
  GetUserNotificationsUseCase,
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
} from "./NotificationUseCases";
import type { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import type { Notification } from "@/domain/entities/Notification";

function fakeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    _id: "n1",
    recipient: "alice",
    actor: "bob",
    type: "discussion_answer",
    resourceType: "discussion",
    resourceId: "d1",
    message: "@bob respondeu sua discussão",
    url: "/discussion/gn/d1",
    read: false,
    ...overrides,
  };
}

describe("CreateNotificationUseCase", () => {
  it("creates the notification when actor and recipient differ", async () => {
    const create = vi.fn().mockResolvedValue(fakeNotification());
    const repo = { create } as unknown as INotificationRepository;
    const useCase = new CreateNotificationUseCase(repo);

    const result = await useCase.execute({
      recipient: "alice",
      actor: "bob",
      type: "discussion_answer",
      resourceType: "discussion",
      resourceId: "d1",
      message: "@bob respondeu sua discussão",
      url: "/discussion/gn/d1",
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(result?.recipient).toBe("alice");
  });

  it("skips self-notifications (actor === recipient)", async () => {
    const create = vi.fn();
    const repo = { create } as unknown as INotificationRepository;
    const useCase = new CreateNotificationUseCase(repo);

    const result = await useCase.execute({
      recipient: "alice",
      actor: "alice",
      type: "discussion_answer",
      resourceType: "discussion",
      resourceId: "d1",
      message: "...",
      url: "/x",
    });

    expect(result).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("GetUserNotificationsUseCase", () => {
  it("returns items and unread count in parallel", async () => {
    const findByRecipient = vi.fn().mockResolvedValue([fakeNotification(), fakeNotification({ _id: "n2" })]);
    const countUnread = vi.fn().mockResolvedValue(2);
    const repo = { findByRecipient, countUnread } as unknown as INotificationRepository;
    const useCase = new GetUserNotificationsUseCase(repo);

    const result = await useCase.execute("alice", 1, 20);

    expect(findByRecipient).toHaveBeenCalledWith("alice", 1, 20);
    expect(countUnread).toHaveBeenCalledWith("alice");
    expect(result.items).toHaveLength(2);
    expect(result.unread).toBe(2);
  });
});

describe("MarkNotificationReadUseCase", () => {
  it("returns the updated notification", async () => {
    const markAsRead = vi.fn().mockResolvedValue(fakeNotification({ read: true }));
    const repo = { markAsRead } as unknown as INotificationRepository;
    const useCase = new MarkNotificationReadUseCase(repo);

    const result = await useCase.execute("n1", "alice");

    expect(markAsRead).toHaveBeenCalledWith("n1", "alice");
    expect(result.read).toBe(true);
  });

  it("throws 'Notification not found' when repo returns null", async () => {
    const markAsRead = vi.fn().mockResolvedValue(null);
    const repo = { markAsRead } as unknown as INotificationRepository;
    const useCase = new MarkNotificationReadUseCase(repo);

    await expect(useCase.execute("missing", "alice")).rejects.toThrow("Notification not found");
  });

  it("does not mark a notification belonging to another user (repo enforces ownership)", async () => {
    const markAsRead = vi.fn().mockResolvedValue(null);
    const repo = { markAsRead } as unknown as INotificationRepository;
    const useCase = new MarkNotificationReadUseCase(repo);

    await expect(useCase.execute("n1", "attacker")).rejects.toThrow("Notification not found");
    expect(markAsRead).toHaveBeenCalledWith("n1", "attacker");
  });
});

describe("MarkAllNotificationsReadUseCase", () => {
  it("returns the number of notifications updated", async () => {
    const markAllAsRead = vi.fn().mockResolvedValue(7);
    const repo = { markAllAsRead } as unknown as INotificationRepository;
    const useCase = new MarkAllNotificationsReadUseCase(repo);

    const result = await useCase.execute("alice");

    expect(markAllAsRead).toHaveBeenCalledWith("alice");
    expect(result).toBe(7);
  });
});
