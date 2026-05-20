/**
 * One-shot migration to the plan_community model:
 *   1) Every legacy CommunityMembership row (no `status`) → status:"approved"
 *      role:"member" (legacy users are implicit approved members).
 *   2) For each Community, ensure the creator has an approved moderator
 *      membership (insert if absent; promote if present).
 *   3) Recompute community.memberCount = count of approved memberships.
 *
 * Idempotent — running twice is a no-op after the first pass. Pass
 * --dry-run to print what would change without writing.
 *
 *   node scripts/migrate-community-membership.js [--dry-run]
 *
 * Connection comes from process.env.MONGODB_URI (same env the app uses).
 * NEVER run against a non-local URI without --dry-run first; use
 * scripts/safety.js#assertLocalMongoUri pattern if in doubt.
 */

const mongoose = require("mongoose");

const DRY = process.argv.includes("--dry-run");

async function main() {
	const uri = process.env.MONGODB_URI;
	if (!uri) throw new Error("MONGODB_URI not set");
	mongoose.set("strictQuery", false);
	await mongoose.connect(uri);
	const db = mongoose.connection.db;
	if (!db) throw new Error("No db handle");

	console.log(`[migrate] mode: ${DRY ? "DRY RUN" : "WRITE"}`);

	// 1) Backfill legacy memberships missing status/role.
	const legacy = await db
		.collection("communitymemberships")
		.countDocuments({ status: { $exists: false } });
	console.log(`[migrate] legacy memberships (no status): ${legacy}`);
	if (!DRY && legacy > 0) {
		const r = await db
			.collection("communitymemberships")
			.updateMany(
				{ status: { $exists: false } },
				{ $set: { status: "approved", role: "member" } },
			);
		console.log(`[migrate]   backfilled: ${r.modifiedCount}`);
	}

	// 2) Each community creator → approved moderator membership.
	const communities = await db.collection("communities").find({}).toArray();
	let creatorEnsured = 0;
	for (const c of communities) {
		const owner = c.createdBy;
		if (!owner) continue;
		const existing = await db
			.collection("communitymemberships")
			.findOne({ communityId: String(c._id), userId: String(owner) });
		if (existing) {
			const needsBump =
				existing.status !== "approved" || existing.role !== "moderator";
			if (needsBump) {
				creatorEnsured++;
				if (!DRY) {
					await db
						.collection("communitymemberships")
						.updateOne(
							{ _id: existing._id },
							{ $set: { status: "approved", role: "moderator" } },
						);
				}
			}
		} else {
			creatorEnsured++;
			if (!DRY) {
				await db.collection("communitymemberships").insertOne({
					userId: String(owner),
					communityId: String(c._id),
					status: "approved",
					role: "moderator",
					joinedAt: c.createdAt ?? new Date(),
				});
			}
		}
	}
	console.log(`[migrate] creator memberships ensured: ${creatorEnsured}`);

	// 3) Recompute memberCount = count of approved memberships per community.
	let recounted = 0;
	for (const c of communities) {
		const count = await db.collection("communitymemberships").countDocuments({
			communityId: String(c._id),
			status: "approved",
		});
		if (count !== (c.memberCount ?? 0)) {
			recounted++;
			if (!DRY) {
				await db
					.collection("communities")
					.updateOne({ _id: c._id }, { $set: { memberCount: count } });
			}
		}
	}
	console.log(`[migrate] memberCount recomputed (off): ${recounted}`);

	// 4) Backfill CommunityFollow rows for every approved member — the
	//    plan_community follow-up assumes "approved => auto-followed", and
	//    pre-existing approved users won't be reapproved to trigger the
	//    auto-follow side effect of ApproveMemberUseCase.
	const approved = await db
		.collection("communitymemberships")
		.find({ status: "approved" })
		.toArray();
	let followsInserted = 0;
	for (const m of approved) {
		const existing = await db.collection("communityfollows").findOne({
			userId: String(m.userId),
			communityId: String(m.communityId),
		});
		if (existing) continue;
		followsInserted++;
		if (!DRY) {
			await db.collection("communityfollows").insertOne({
				userId: String(m.userId),
				communityId: String(m.communityId),
				followedAt: m.joinedAt ?? new Date(),
			});
		}
	}
	console.log(`[migrate] community follows backfilled: ${followsInserted}`);

	// 5) Recompute followerCount per community from CommunityFollow rows.
	let followerRecounted = 0;
	for (const c of communities) {
		const count = await db.collection("communityfollows").countDocuments({
			communityId: String(c._id),
		});
		if (count !== (c.followerCount ?? 0)) {
			followerRecounted++;
			if (!DRY) {
				await db
					.collection("communities")
					.updateOne({ _id: c._id }, { $set: { followerCount: count } });
			}
		}
	}
	console.log(`[migrate] followerCount recomputed (off): ${followerRecounted}`);

	console.log(
		DRY
			? "[migrate] DRY RUN done — no writes performed."
			: "[migrate] complete.",
	);
	await mongoose.disconnect();
}

main().catch(async (err) => {
	console.error("[migrate] FAILED:", err && err.message ? err.message : err);
	try {
		await mongoose.disconnect();
	} catch {
		/* ignore */
	}
	process.exit(1);
});
