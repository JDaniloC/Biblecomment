import type {
	PushSubscriptionInput,
	StoredPushSubscription,
} from "@/domain/entities/PushSubscription";

export interface IPushSubscriptionRepository {
	/** Insert or refresh a subscription (unique by endpoint). */
	upsert(sub: PushSubscriptionInput): Promise<void>;
	findByUsername(username: string): Promise<StoredPushSubscription[]>;
	deleteByEndpoint(endpoint: string): Promise<void>;
	/**
	 * Owner-scoped delete — removes the row only when both endpoint and
	 * username match. Returns `true` when a row was deleted.
	 *
	 * Endpoint URLs are long random strings (FCM/Mozilla), so guessing
	 * one is impractical — but the public DELETE handler is reachable by
	 * any signed-in user. The username guard is defense-in-depth so the
	 * route can't be used to wipe someone else's push subscription.
	 */
	deleteByEndpointForUser(endpoint: string, username: string): Promise<boolean>;
	/** LGPD cascade: drop every device of this user (account deletion). */
	deleteAllByUsername(username: string): Promise<number>;
	/**
	 * Re-key the user's devices after a username change. Rows are keyed by
	 * username, so without this the devices stop receiving pushes — and get
	 * the next owner's pushes if the old username is registered again. A
	 * pure move, safe to repeat.
	 */
	renameUsername(oldUsername: string, newUsername: string): Promise<number>;
	/** Remove expired/invalid endpoints; returns how many were deleted. */
	deleteByEndpoints(endpoints: string[]): Promise<number>;
}
