import { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import { Notification } from "@/domain/entities/Notification";
import { NotificationModel, INotificationDocument } from "@/infrastructure/database/models/NotificationModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import mongoose from "mongoose";

function toEntity(doc: INotificationDocument): Notification {
  return {
    _id: doc._id ? String(doc._id) : undefined,
    recipient: doc.recipient,
    actor: doc.actor,
    type: doc.type,
    resourceType: doc.resourceType,
    resourceId: doc.resourceId,
    message: doc.message,
    url: doc.url,
    read: doc.read,
    createdAt: doc.createdAt,
  };
}

export class MongoNotificationRepository implements INotificationRepository {
  async create(notification: Omit<Notification, "_id" | "createdAt" | "read">): Promise<Notification> {
    await connectToDatabase();
    const doc = await NotificationModel.create({ ...notification, read: false });
    return toEntity(doc);
  }

  async createMany(notifications: Omit<Notification, "_id" | "createdAt" | "read">[]): Promise<number> {
    if (notifications.length === 0) return 0;
    await connectToDatabase();
    const docs = notifications.map((n) => ({ ...n, read: false }));
    const inserted = await NotificationModel.insertMany(docs, { ordered: false });
    return inserted.length;
  }

  async findByRecipient(recipient: string, page: number, pageSize: number): Promise<Notification[]> {
    await connectToDatabase();
    const docs = await NotificationModel.find({ recipient })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);
    return docs.map(toEntity);
  }

  async countUnread(recipient: string): Promise<number> {
    await connectToDatabase();
    return NotificationModel.countDocuments({ recipient, read: false });
  }

  async markAsRead(id: string, recipient: string): Promise<Notification | null> {
    await connectToDatabase();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await NotificationModel.findOneAndUpdate(
      { _id: id, recipient },
      { $set: { read: true } },
      { new: true },
    );
    return doc ? toEntity(doc) : null;
  }

  async markAllAsRead(recipient: string): Promise<number> {
    await connectToDatabase();
    const result = await NotificationModel.updateMany(
      { recipient, read: false },
      { $set: { read: true } },
    );
    return result.modifiedCount ?? 0;
  }
}
