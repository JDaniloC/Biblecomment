import type { Config } from "@netlify/functions";

/**
 * Scheduled trigger for the daily reading reminder. Netlify cron can't
 * invoke a Next.js route handler directly, so this thin function fires
 * every 30 minutes and forwards to the internal API route, which owns
 * the Mongoose + Web Push logic.
 *
 * `CRON_SECRET` gates the route; `URL` is injected by Netlify with the
 * site's primary address.
 */
export default async function handler() {
	const base = process.env.URL;
	const secret = process.env.CRON_SECRET;
	if (!base || !secret) {
		console.error(
			"send-reminders: missing URL or CRON_SECRET env — skipping run",
		);
		return;
	}

	try {
		const res = await fetch(`${base}/api/cron/send-reminders`, {
			method: "POST",
			headers: { "x-cron-secret": secret },
		});
		const body = await res.text();
		console.log(`send-reminders: ${res.status} ${body}`);
	} catch (err) {
		console.error("send-reminders: fetch failed", err);
	}
}

export const config: Config = {
	// Every 30 minutes. Half-hour granularity matches the user-facing
	// reminder time picker (00:00, 00:30, …, 23:30).
	schedule: "*/30 * * * *",
};
