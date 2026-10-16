import { NextResponse } from "next/server";
import {
	makeFinishPendingDeletionsUseCase,
	makeFinishPendingRenamesUseCase,
} from "@/app/actions/_account";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Leave deletions alone while their own request may still be running. */
const DELETION_GRACE_MS = 5 * 60 * 1000;
/** Per run and per kind; each cascade is dozens of queries on a 3-connection pool. */
const BATCH = 10;

/**
 * Cron entrypoint that finishes account changes whose cascade failed
 * partway: deletions (the account is locked as soon as its deletion
 * starts, so its owner can't retry) and username renames (the old slug
 * stays held until its cascade completes). Invoked by the
 * account-maintenance Netlify scheduled function with the shared secret in
 * `x-cron-secret`; refuses to run without CRON_SECRET.
 */
export async function POST(req: Request) {
	const secret = process.env.CRON_SECRET;
	if (!secret) {
		return NextResponse.json(
			{ error: "CRON_SECRET not configured" },
			{ status: 503 },
		);
	}
	if (req.headers.get("x-cron-secret") !== secret) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	try {
		const deletions = await makeFinishPendingDeletionsUseCase().execute({
			now: new Date(),
			graceMs: DELETION_GRACE_MS,
			limit: BATCH,
		});
		const renames = await makeFinishPendingRenamesUseCase().execute({
			limit: BATCH,
		});
		for (const [kind, run] of [
			["deletion", deletions],
			["rename", renames],
		] as const) {
			if (run.finished.length > 0) {
				logger.info(
					{ kind, userIds: run.finished, action: "account_maintenance" },
					"resumed pending account changes",
				);
			}
			for (const f of run.failed) {
				logger.error(
					{ kind, userId: f.userId, error: f.error, action: "account_maintenance" },
					"pending account change still failing",
				);
			}
		}
		return NextResponse.json({
			deletions: { finished: deletions.finished.length, failed: deletions.failed.length },
			renames: { finished: renames.finished.length, failed: renames.failed.length },
		});
	} catch (err) {
		logger.error({ err, action: "account_maintenance" }, "account maintenance failed");
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}
