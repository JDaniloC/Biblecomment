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
import { escapeRegExp } from "@/lib/escape-regexp";

let pushService: PushNotificationService | null = null;

// Actor names that don't belong to a single account: badge notices
// ("system"), fallbacks when the actor can't be resolved ("alguém") and
// the name left behind by account deletion (ANONYMIZED_USERNAME).
const SENTINEL_ACTORS = new Set(["system", "alguém", "[usuário removido]"]);

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
	// web-push needs BOTH keys to sign payloads. A partial env (e.g., only
	// NEXT_PUBLIC_VAPID_PUBLIC_KEY in prod) would still pass a public-only
	// check and then crash downstream. VAPID_SUBJECT is optional —
	// WebPushSender falls back to a default mailto: when unset, matching
	// what `mobile/README.md` documents.
	if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
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
		.catch(() => {});
}

/**
 * Update pipeline for notifications whose actor is being renamed. Besides
 * `actor`, the old handle is denormalized into `message` ("@old mencionou
 * você", "@old começou a te seguir", …) and, for new_follower, into
 * `resourceId` and `url` ("/u/old"). Left alone those keep pointing at the
 * old slug, which anyone can re-register.
 *
 * MongoDB has no regex replace, so the message is rebuilt from the
 * $regexFindAll matches. Token boundaries mirror MENTION_REGEX in
 * lib/mentions.ts — not preceded by a word char or "@", not followed by a
 * username char — so renaming "ana" leaves "@anabela" and "x@ana" alone.
 * `idx` from $regexFindAll and $substrCP both count code points.
 */
function renameActorPipeline(oldUsername: string, newUsername: string) {
	const oldHandle = `@${oldUsername}`;
	const handleRegex = `(?<![A-Za-z0-9_@])${escapeRegExp(oldHandle)}(?![A-Za-z0-9_-])`;
	const isFollow = { $eq: ["$type", "new_follower"] };
	return [
		{
			$set: {
				actor: { $literal: newUsername },
				message: {
					$let: {
						vars: {
							acc: {
								$reduce: {
									input: {
										$regexFindAll: { input: "$message", regex: handleRegex },
									},
									initialValue: { out: "", pos: 0 },
									in: {
										out: {
											$concat: [
												"$$value.out",
												{
													$substrCP: [
														"$message",
														"$$value.pos",
														{ $subtract: ["$$this.idx", "$$value.pos"] },
													],
												},
												{ $literal: `@${newUsername}` },
											],
										},
										pos: { $add: ["$$this.idx", [...oldHandle].length] },
									},
								},
							},
						},
						in: {
							$concat: [
								"$$acc.out",
								{
									$substrCP: [
										"$message",
										"$$acc.pos",
										{ $subtract: [{ $strLenCP: "$message" }, "$$acc.pos"] },
									],
								},
							],
						},
					},
				},
				resourceId: {
					$cond: [isFollow, { $literal: newUsername }, "$resourceId"],
				},
				url: {
					$cond: [isFollow, { $literal: `/u/${newUsername}` }, "$url"],
				},
			},
		},
	];
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
		// Sentinel actors are shared by everyone, so never treat them as this
		// user's own activity — even for a legacy account holding that name.
		const or: Record<string, string>[] = [{ recipient: username }];
		if (!SENTINEL_ACTORS.has(username)) or.push({ actor: username });
		const result = await NotificationModel.deleteMany({ $or: or });
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

	/**
	 * Returns recipient-side + actor-side modified counts, so a notification
	 * where the user is both recipient and actor counts twice.
	 */
	async renameUsername(
		oldUsername: string,
		newUsername: string,
	): Promise<number> {
		await connectToDatabase();
		// Two updateMany — one per role — keeps each query selective on its
		// own field. A combined $or with mixed $set would touch fields the
		// user didn't actually change.
		const updates = [
			NotificationModel.updateMany(
				{ recipient: oldUsername },
				{ $set: { recipient: newUsername } },
			),
		];
		// Sentinel actors are shared by everyone (see deleteForUser): a legacy
		// account holding that name must not take over every badge notice.
		if (!SENTINEL_ACTORS.has(oldUsername)) {
			updates.push(
				NotificationModel.updateMany(
					{ actor: oldUsername },
					renameActorPipeline(oldUsername, newUsername),
					{ updatePipeline: true },
				),
			);
		}
		const results = await Promise.all(updates);
		return results.reduce((sum, r) => sum + (r.modifiedCount ?? 0), 0);
	}
}
