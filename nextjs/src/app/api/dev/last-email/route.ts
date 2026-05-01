import { NextRequest, NextResponse } from "next/server";
import { getMemoryInbox, clearMemoryInbox } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Test-only inspector for the in-memory email transport (EMAIL_TRANSPORT=memory).
 *
 * - GET  /api/dev/last-email?email=foo@bar  → newest captured payload for `email`
 * - GET  /api/dev/last-email                → entire inbox (newest first)
 * - DELETE /api/dev/last-email              → clears the inbox
 *
 * Gated on EMAIL_TRANSPORT=memory — that variable is the explicit opt-in,
 * set only by scripts/cy-test.js and scripts/dev-with-mongo.js. A real prod
 * deploy never sets it (RESEND_API_KEY drives the live transport instead).
 */

function disabled(): NextResponse {
  return NextResponse.json({ error: "Not available" }, { status: 404 });
}

export async function GET(req: NextRequest) {
  if (process.env.EMAIL_TRANSPORT !== "memory") return disabled();

  const inbox = [...getMemoryInbox()].reverse(); // newest first
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ messages: inbox });
  }

  const target = email.toLowerCase().trim();
  const match = inbox.find((m) => m.to.toLowerCase().trim() === target);
  if (!match) return NextResponse.json({ message: null }, { status: 200 });
  return NextResponse.json({ message: match });
}

export async function DELETE() {
  if (process.env.EMAIL_TRANSPORT !== "memory") return disabled();

  clearMemoryInbox();
  return NextResponse.json({ cleared: true });
}
