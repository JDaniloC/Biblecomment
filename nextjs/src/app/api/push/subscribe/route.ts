import { NextResponse } from "next/server";
import { MongoPushSubscriptionRepository } from "@/infrastructure/repositories/MongoPushSubscriptionRepository";
import { getSessionUser, unauthorized, serverError } from "@/lib/get-session";
import { parseBody } from "@/lib/parse-body";
import { PushSubscribeSchema, PushUnsubscribeSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
	try {
		const user = await getSessionUser();
		if (!user) return unauthorized();

		const parsed = await parseBody(req, PushSubscribeSchema);
		if (!parsed.ok) return parsed.response;

		const repo = new MongoPushSubscriptionRepository();
		await repo.upsert({
			username: user.username,
			endpoint: parsed.data.endpoint,
			p256dh: parsed.data.keys.p256dh,
			auth: parsed.data.keys.auth,
			userAgent: req.headers.get("user-agent") ?? undefined,
		});
		return NextResponse.json({ ok: true });
	} catch (err) {
		return serverError(err);
	}
}

export async function DELETE(req: Request) {
	try {
		const user = await getSessionUser();
		if (!user) return unauthorized();

		const parsed = await parseBody(req, PushUnsubscribeSchema);
		if (!parsed.ok) return parsed.response;

		const repo = new MongoPushSubscriptionRepository();
		// Owner-scoped — defense against another signed-in user passing in
		// someone else's endpoint to wipe their push subscription. The route
		// stays 200 OK either way so an attacker can't probe ownership.
		await repo.deleteByEndpointForUser(parsed.data.endpoint, user.username);
		return NextResponse.json({ ok: true });
	} catch (err) {
		return serverError(err);
	}
}
