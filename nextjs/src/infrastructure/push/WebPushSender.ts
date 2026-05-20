import webpush from "web-push";
import type {
	WebPushSender,
	WebPushTarget,
	WebPushSendResult,
} from "@/application/services/PushNotificationService";

let configured = false;

/** Lazily wire VAPID from env on first use. Returns false (sender
 *  no-ops) when keys are absent so non-configured envs don't crash. */
function ensureConfigured(): boolean {
	if (configured) return true;
	const pub = process.env.VAPID_PUBLIC_KEY;
	const priv = process.env.VAPID_PRIVATE_KEY;
	const subject =
		process.env.VAPID_SUBJECT || "mailto:felipe@simpleread.foundation";
	if (!pub || !priv) return false;
	webpush.setVapidDetails(subject, pub, priv);
	configured = true;
	return true;
}

/** Real adapter over the `web-push` library. Not unit-tested (network
 *  + library); PushNotificationService is tested against the port. */
export const webPushSender: WebPushSender = {
	async send(
		target: WebPushTarget,
		payloadJson: string,
	): Promise<WebPushSendResult> {
		if (!ensureConfigured()) return { ok: false };
		try {
			await webpush.sendNotification(
				{
					endpoint: target.endpoint,
					keys: { p256dh: target.keys.p256dh, auth: target.keys.auth },
				},
				payloadJson,
			);
			return { ok: true };
		} catch (err) {
			const statusCode = (err as { statusCode?: number })?.statusCode;
			return { ok: false, statusCode };
		}
	},
};
