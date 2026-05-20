import type { IPushSubscriptionRepository } from "@/domain/repositories/IPushSubscriptionRepository";
import type { PushPayload } from "@/domain/entities/PushSubscription";

/** Port over the web-push library so the service is unit-testable
 *  without network. The real adapter lives in infrastructure/push. */
export interface WebPushTarget {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}
export interface WebPushSendResult {
	ok: boolean;
	/** HTTP status from the push service when !ok (404/410 = gone). */
	statusCode?: number;
}
export interface WebPushSender {
	send(target: WebPushTarget, payloadJson: string): Promise<WebPushSendResult>;
}

export class PushNotificationService {
	constructor(
		private readonly repo: IPushSubscriptionRepository,
		private readonly sender: WebPushSender,
	) {}

	/** Fan a payload out to every subscription of `username`. Endpoints
	 *  the push service reports as gone (404/410) are pruned. Never
	 *  throws — push is best-effort and must not break callers. */
	async sendToUser(username: string, payload: PushPayload): Promise<void> {
		const subs = await this.repo.findByUsername(username);
		if (subs.length === 0) return;

		const json = JSON.stringify(payload);
		const expired: string[] = [];

		await Promise.all(
			subs.map(async (s) => {
				const res = await this.sender
					.send(
						{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
						json,
					)
					.catch((): WebPushSendResult => ({ ok: false }));
				if (!res.ok && (res.statusCode === 404 || res.statusCode === 410)) {
					expired.push(s.endpoint);
				}
			}),
		);

		if (expired.length > 0) await this.repo.deleteByEndpoints(expired);
	}
}
