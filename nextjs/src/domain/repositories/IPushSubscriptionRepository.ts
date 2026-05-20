import type {
	PushSubscriptionInput,
	StoredPushSubscription,
} from "@/domain/entities/PushSubscription";

export interface IPushSubscriptionRepository {
	/** Insert or refresh a subscription (unique by endpoint). */
	upsert(sub: PushSubscriptionInput): Promise<void>;
	findByUsername(username: string): Promise<StoredPushSubscription[]>;
	deleteByEndpoint(endpoint: string): Promise<void>;
	/** Remove expired/invalid endpoints; returns how many were deleted. */
	deleteByEndpoints(endpoints: string[]): Promise<number>;
}
