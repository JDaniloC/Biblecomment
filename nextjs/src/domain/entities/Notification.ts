export type NotificationType =
	| "discussion_answer"
	| "comment_mention"
	| "answer_mention"
	| "badge_unlocked"
	| "new_follower"
	// plan_community follow-up: viewer-facing events on the community
	// lifecycle. The resource is the Community itself (resourceType:
	// "community", resourceId: Community._id; url points to
	// /communities/<slug>).
	| "community_join_requested"
	| "community_join_approved"
	| "community_role_promoted";

export type NotificationResourceType =
	| "discussion"
	| "comment"
	| "badge"
	| "user"
	| "community";

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
