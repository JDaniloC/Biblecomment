/** A Web Push subscription stored for a user (username = the same key
 *  the in-app Notification.recipient uses). */
export interface StoredPushSubscription {
	_id?: string;
	username: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	userAgent?: string;
	createdAt?: Date;
}

export type PushSubscriptionInput = Omit<
	StoredPushSubscription,
	"_id" | "createdAt"
>;

/** Payload the SW `push` handler renders into a Notification. */
export interface PushPayload {
	title: string;
	body: string;
	url: string;
	tag?: string;
}
