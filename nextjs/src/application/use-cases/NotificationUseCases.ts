import { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import { Notification } from "@/domain/entities/Notification";

export class CreateNotificationUseCase {
  constructor(private readonly repo: INotificationRepository) {}

  async execute(input: Omit<Notification, "_id" | "createdAt" | "read">): Promise<Notification | null> {
    if (input.actor === input.recipient) return null;
    return this.repo.create(input);
  }
}

export class GetUserNotificationsUseCase {
  constructor(private readonly repo: INotificationRepository) {}

  async execute(recipient: string, page: number, pageSize: number): Promise<{ items: Notification[]; unread: number }> {
    const [items, unread] = await Promise.all([
      this.repo.findByRecipient(recipient, page, pageSize),
      this.repo.countUnread(recipient),
    ]);
    return { items, unread };
  }
}

export class MarkNotificationReadUseCase {
  constructor(private readonly repo: INotificationRepository) {}

  async execute(id: string, recipient: string): Promise<Notification> {
    const updated = await this.repo.markAsRead(id, recipient);
    if (!updated) throw new Error("Notification not found");
    return updated;
  }
}

export class MarkAllNotificationsReadUseCase {
  constructor(private readonly repo: INotificationRepository) {}

  async execute(recipient: string): Promise<number> {
    return this.repo.markAllAsRead(recipient);
  }
}
