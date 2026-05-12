import type { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import type { IUserRepository } from "@/domain/repositories/IUserRepository";
import type { NotificationResourceType, NotificationType } from "@/domain/entities/Notification";
import { parseMentions } from "@/lib/mentions";

export interface NotifyMentionsInput {
  text: string;
  actor: string;
  type: NotificationType;
  resourceType: NotificationResourceType;
  resourceId: string;
  url: string;
}

export class NotifyMentionsUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly notificationRepo: INotificationRepository,
  ) {}

  async execute(input: NotifyMentionsInput): Promise<number> {
    const mentioned = parseMentions(input.text).filter((u) => u !== input.actor);
    if (mentioned.length === 0) return 0;

    const users = await this.userRepo.findByUsernames(mentioned);
    const validRecipients = users.map((u) => u.username);
    if (validRecipients.length === 0) return 0;

    return this.notificationRepo.createMany(
      validRecipients.map((recipient) => ({
        recipient,
        actor: input.actor,
        type: input.type,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        message: `@${input.actor} mencionou você`,
        url: input.url,
      })),
    );
  }
}
