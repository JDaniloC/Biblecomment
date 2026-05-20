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
	/** Remove expired/invalid endpoints; returns how many were deleted. */
	deleteByEndpoints(endpoints: string[]): Promise<number>;
}
