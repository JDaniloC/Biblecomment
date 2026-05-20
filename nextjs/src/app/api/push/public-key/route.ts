import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public: the VAPID public key is meant to ship to the client (used as
// applicationServerKey for pushManager.subscribe). null when push isn't
// configured for this environment so the client can hide the opt-in.
export function GET() {
	return NextResponse.json({
		publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
	});
}
