export type NotificationType =
  | "discussion_answer"
  | "comment_mention"
  | "answer_mention"
  | "badge_unlocked";

export type NotificationResourceType = "discussion" | "comment" | "badge";

export interface Notification {
  _id?: string;
  recipient: string;
  actor: string;
  type: NotificationType;
  resourceType: NotificationResourceType;
  resourceId: string;
  message: string;
  url: string;
  read: boolean;
  createdAt?: Date;
}
