export type NotificationType =
  | "discussion_answer"
  | "comment_mention"
  | "answer_mention";

export type NotificationResourceType = "discussion" | "comment";

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
