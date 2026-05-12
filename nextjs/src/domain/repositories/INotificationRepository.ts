import { Notification } from "../entities/Notification";

export interface INotificationRepository {
  create(notification: Omit<Notification, "_id" | "createdAt" | "read">): Promise<Notification>;
  createMany(notifications: Omit<Notification, "_id" | "createdAt" | "read">[]): Promise<number>;
  findByRecipient(recipient: string, page: number, pageSize: number): Promise<Notification[]>;
  countUnread(recipient: string): Promise<number>;
  markAsRead(id: string, recipient: string): Promise<Notification | null>;
  markAllAsRead(recipient: string): Promise<number>;
  deleteForUser(username: string): Promise<number>;
  /**
   * True if the user has triggered at least one mention notification
   * (i.e., they have @-mentioned someone in a comment or answer).
   */
  userHasMentioned(username: string): Promise<boolean>;
  /**
   * Cascade rename when the user changes their slug — rewrites the
   * `recipient` and `actor` fields on every notification matching the
   * old username. Returns total rows touched.
   */
  renameUsername(oldUsername: string, newUsername: string): Promise<number>;
}
