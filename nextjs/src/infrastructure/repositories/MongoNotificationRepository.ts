import { INotificationRepository } from "@/domain/repositories/INotificationRepository";
import { Notification } from "@/domain/entities/Notification";
import {
	NotificationModel,
	INotificationDocument,
} from "@/infrastructure/database/models/NotificationModel";
import { connectToDatabase } from "@/infrastructure/database/connection";
import mongoose from "mongoose";
import { PushNotificationService } from "@/application/services/PushNotificationService";
import { MongoPushSubscriptionRepository } from "@/infrastructure/repositories/MongoPushSubscriptionRepository";
import { webPushSender } from "@/infrastructure/push/WebPushSender";

let pushService: PushNotificationService | null = null;

/**
 * Best-effort Web Push mirror of an in-app notification. Fire-and-forget
 * — never awaited, never throws into the notification flow. Skips
 * entirely when VAPID isn't configured (no Mongo cost in CI/dev).
 */
function firePush(n: {
	recipient: string;
	message: string;
	url: string;
	type: string;
}): void {
	// web-push needs BOTH keys + the subject to sign payloads. A partial env
	// (e.g., only NEXT_PUBLIC_VAPID_PUBLIC_KEY in prod) would still pass a
	// public-only check and then crash downstream. Bail before instantiation.
	if (
		!process.env.VAPID_PUBLIC_KEY ||
		!process.env.VAPID_PRIVATE_KEY ||
		!process.env.VAPID_SUBJECT
	) {
		return;
	}
	if (!pushService) {
		pushService = new PushNotificationService(
			new MongoPushSubscriptionRepository(),
			webPushSender,
		);
	}
	pushService
		.sendToUser(n.recipient, {
			title: "Bible Comment",
			body: n.message,
			url: n.url,
			tag: n.type,
		})
		.catch(() => undefined);
}

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
	async create(
		notification: Omit<Notification, "_id" | "createdAt" | "read">,
	): Promise<Notification> {
		await connectToDatabase();
		const doc = await NotificationModel.create({
			...notification,
			read: false,
		});
		const entity = toEntity(doc);
		firePush(entity);
		return entity;
	}

	async createMany(
		notifications: Omit<Notification, "_id" | "createdAt" | "read">[],
	): Promise<number> {
		if (notifications.length === 0) return 0;
		await connectToDatabase();
		const docs = notifications.map((n) => ({ ...n, read: false }));
		const inserted = await NotificationModel.insertMany(docs, {
			ordered: false,
		});
		for (const n of notifications) {
			firePush({
				recipient: n.recipient,
				message: n.message,
				url: n.url,
				type: n.type,
			});
		}
		return inserted.length;
	}

	async findByRecipient(
		recipient: string,
		page: number,
		pageSize: number,
	): Promise<Notification[]> {
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

	async markAsRead(
		id: string,
		recipient: string,
	): Promise<Notification | null> {
		await connectToDatabase();
		if (!mongoose.Types.ObjectId.isValid(id)) return null;
		const doc = await NotificationModel.findOneAndUpdate(
			{ _id: id, recipient },
			{ $set: { read: true } },
			{ returnDocument: "after" },
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

	async deleteForUser(username: string): Promise<number> {
		await connectToDatabase();
		const result = await NotificationModel.deleteMany({
			$or: [{ recipient: username }, { actor: username }],
		});
		return result.deletedCount ?? 0;
	}

	async userHasMentioned(username: string): Promise<boolean> {
		await connectToDatabase();
		const doc = await NotificationModel.findOne(
			{ actor: username, type: { $in: ["comment_mention", "answer_mention"] } },
			{ _id: 1 },
		);
		return doc !== null;
	}

	async existsFor(
		recipient: string,
		actor: string,
		type: Notification["type"],
	): Promise<boolean> {
		await connectToDatabase();
		const doc = await NotificationModel.exists({ recipient, actor, type });
		return doc !== null;
	}

	async renameUsername(
		oldUsername: string,
		newUsername: string,
	): Promise<number> {
		await connectToDatabase();
		// Two updateMany — one per field — keeps each query selective on its
		// own index. A combined $or with mixed $set would touch fields the
		// user didn't actually change.
		const [a, b] = await Promise.all([
			NotificationModel.updateMany(
				{ recipient: oldUsername },
				{ $set: { recipient: newUsername } },
			),
			NotificationModel.updateMany(
				{ actor: oldUsername },
				{ $set: { actor: newUsername } },
			),
		]);
		return (a.modifiedCount ?? 0) + (b.modifiedCount ?? 0);
	}
}
