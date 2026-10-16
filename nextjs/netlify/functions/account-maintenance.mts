import type { Config } from "@netlify/functions";

/**
 * Scheduled trigger that finishes account deletions and username renames
 * whose cascade failed partway. Netlify cron can't invoke a Next.js route
 * handler directly, so this thin function forwards to the internal API
 * route, which owns the cascades.
 *
 * `CRON_SECRET` gates the route; `URL` is injected by Netlify with the
 * site's primary address.
 */
export default async function handler() {
	const base = process.env.URL;
	const secret = process.env.CRON_SECRET;
	if (!base || !secret) {
		console.error(
			"account-maintenance: missing URL or CRON_SECRET env — skipping run",
		);
		return;
	}

	try {
		const res = await fetch(`${base}/api/cron/account-maintenance`, {
			method: "POST",
			headers: { "x-cron-secret": secret },
		});
		const body = await res.text();
		console.log(`account-maintenance: ${res.status} ${body}`);
	} catch (err) {
		console.error("account-maintenance: fetch failed", err);
	}
}

export const config: Config = {
	// A stuck deletion leaves the account locked but its data in place;
	// half-hourly keeps that window short at two cheap queries per idle run.
	schedule: "*/30 * * * *",
};
