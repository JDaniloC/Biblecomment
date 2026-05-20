import mongoose, { Schema, Document, Model } from "mongoose";
import type {
	NotificationType,
	NotificationResourceType,
} from "@/domain/entities/Notification";

export interface INotificationDocument extends Document {
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

const NotificationSchema = new Schema<INotificationDocument>(
	{
		recipient: { type: String, required: true },
		actor: { type: String, required: true },
		type: {
			type: String,
			enum: [
				"discussion_answer",
				"comment_mention",
				"answer_mention",
				"badge_unlocked",
				"new_follower",
				"community_join_requested",
				"community_join_approved",
				"community_role_promoted",
			],
			required: true,
		},
		resourceType: {
			type: String,
			enum: ["discussion", "comment", "badge", "user", "community"],
			required: true,
		},
		resourceId: { type: String, required: true },
		message: { type: String, required: true },
		url: { type: String, required: true },
		read: { type: Boolean, default: false, index: true },
	},
	{ timestamps: true },
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });

export const NotificationModel: Model<INotificationDocument> =
	mongoose.models.Notification ||
	mongoose.model<INotificationDocument>("Notification", NotificationSchema);
