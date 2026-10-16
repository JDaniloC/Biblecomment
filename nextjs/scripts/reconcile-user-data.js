#!/usr/bin/env node
/**
 * Reconcile data orphaned by account deletions that predate the LGPD
 * cascade in DeleteUserUseCase, plus denormalized-counter drift.
 *
 *   node --env-file=.env scripts/reconcile-user-data.js                  # dry run
 *   node --env-file=.env scripts/reconcile-user-data.js --apply          # write
 *   node --env-file=.env scripts/reconcile-user-data.js --apply --allow-remote
 *   node --env-file=.env scripts/reconcile-user-data.js --apply --anonymize-snapshots
 *
 * DRY RUN by default: every step reports what it would change (counts and
 * ids) and nothing is written. Writes happen only with --apply.
 *
 * Steps, in order (later steps read the state the earlier ones leave; the
 * dry run excludes rows an earlier step would delete, so its numbers match
 * what --apply does):
 *   1) Delete rows keyed by a user id that no longer exists (memberships,
 *      community follows, follows both ways, reading sessions, chapter
 *      reads, reset/verification tokens, likes, reports).
 *   2) Delete notifications whose recipient is not a live username, or whose
 *      actor is neither a live username nor a sentinel actor. (Renames have
 *      always cascaded to notifications, so an unknown name here is gone.)
 *   3) Detach discussion answers of deleted users: username →
 *      "[usuário removido]", userId → "deleted-user".
 *   4) Moderator snapshots (comments.verifiedBy / hiddenBy, users.disabledBy)
 *      naming a username that no longer exists. REPORT ONLY by default:
 *      renames did not cascade to these fields before the rename cascade
 *      existed, so a live moderator who renamed back then looks exactly like
 *      a deleted one. --anonymize-snapshots rewrites them to
 *      "[usuário removido]" once a human has checked the sample ids.
 *   5) Delete memberships / community follows pointing to a missing community.
 *   6) Communities whose creator is gone (including the "deleted-user"
 *      sentinel, which the app never writes to communities): the oldest
 *      approved member (moderators first) who is neither mid-deletion nor
 *      disabled becomes creator + moderator and gets the same
 *      "community_role_promoted" notification the app's hand-over sends.
 *      With no eligible member the community is only reported — never
 *      deleted here.
 *   7) REPORT ONLY: username-keyed rows whose username is not live (push
 *      subscriptions, reminder preferences, non-legacy comments, discussions).
 *      Pre-fix renames left such rows behind for live users, so a human has
 *      to decide. Legacy rows with `sourceId` are historical attribution and
 *      are never touched.
 *   8) Recompute community memberCount / followerCount and discussion
 *      likeCount / answersCount from the source rows. Only rows whose key has
 *      the BSON type the app writes and queries with are counted (communityId
 *      string, targetId / discussionId ObjectId); others are reported.
 *
 * Orphan detection is always distinct(field) minus the live set, then
 * {$in: orphans} — never {$nin: liveSet}, so a partial or wrong live set
 * can't widen a delete to a whole collection. "deleted-user" is an
 * already-detached sentinel on user-keyed rows (steps 1 and 3), not an
 * orphan. Users with `deletion` set still exist: their rows are left to
 * DeleteUserUseCase's retry, and they are never picked as a community's new
 * creator. Neither are moderator-disabled users (`disabledAt` set), whose
 * rows are kept as well.
 *
 * Concurrency: the live sets are a snapshot taken at startup, and the app
 * keeps running. Right before every write, the candidate values are checked
 * against `users` (or `communities`) again and any that exist NOW — a
 * sign-up or rename since the snapshot — are dropped. Community hand-overs
 * compare-and-set createdBy before touching the successor's membership.
 *
 * Idempotent: a second --apply run reports 0 changes. Report-only rows and
 * communities without a successor keep showing up until someone acts.
 *
 * Safety:
 *   - Local URIs only (scripts/safety.js). A non-local URI (Atlas) needs
 *     --allow-remote and prints a banner; with --apply it also waits 10s
 *     BEFORE connecting, so nothing is read before the countdown ends.
 *   - Refuses a URI with more than one '@' (an unescaped '@' in the
 *     password would otherwise surface in host-parsing errors).
 *   - Aborts when the `users` collection is empty (wrong database).
 *   - Uses the database named in the URI path, with maxPoolSize 1 (Atlas M0
 *     connection cap).
 *   - Output never contains emails or usernames — only counts, user ids,
 *     document ids and community slugs.
 *
 * The sentinels below mirror src/application/use-cases/UserUseCases.ts
 * (ANONYMIZED_USERNAME, DELETED_USER_ID) and the notification actors used by
 * BadgeUseCases ("system") and CommunityUseCases ("alguém"); keep in sync.
 * The successor rule (no mid-deletion or disabled user) and the hand-over
 * notification mirror HandOverOwnedCommunitiesUseCase.
 */

const mongoose = require("mongoose");
const { assertLocalMongoUri } = require("./safety");

const { ObjectId } = mongoose.mongo;

const ANONYMIZED_USERNAME = "[usuário removido]";
const DELETED_USER_ID = "deleted-user";
const ACTOR_SENTINELS = new Set(["system", "alguém", ANONYMIZED_USERNAME]);

// Legacy-tolerant "approved member" predicate — rows written before
// `status` existed count as approved everywhere in the app.
const APPROVED = {
	$or: [{ status: "approved" }, { status: { $exists: false } }],
};

const USAGE =
	"usage: node --env-file=.env scripts/reconcile-user-data.js [--apply] [--allow-remote] [--anonymize-snapshots]";
const KNOWN_FLAGS = new Set([
	"--apply",
	"--allow-remote",
	"--dry-run",
	"--anonymize-snapshots",
]);
const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const ALLOW_REMOTE = ARGS.includes("--allow-remote");
const ANONYMIZE_SNAPSHOTS = ARGS.includes("--anonymize-snapshots");

const IN_CHUNK = 1000; // values per {$in: [...]} query
const BULK_CHUNK = 500; // ops per bulkWrite
const SAMPLE = 10; // ids printed per line

const log = (msg) => console.log(`[reconcile] ${msg}`);

function sample(values) {
	const list = values.map(String);
	if (list.length <= SAMPLE) return list.join(", ");
	return `${list.slice(0, SAMPLE).join(", ")} … (+${list.length - SAMPLE} more)`;
}

/** A sample of document ids out of `n` matching rows. */
function idList(ids, n) {
	return `${ids.join(", ")}${n > ids.length ? ` … (+${n - ids.length} more)` : ""}`;
}

function chunks(list, size) {
	const out = [];
	for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
	return out;
}

const isBlank = (v) => v === null || v === undefined || v === "";

// Accounts that still exist but can't take over a community. Same tests as
// the app: MongoUserRepository's toEntity keeps `deletion` only with
// requestedAt, and lib/auth.ts blocks any account with disabledAt.
const isDeleting = (u) => Boolean(u.deletion?.requestedAt);
const isDisabled = (u) => Boolean(u.disabledAt);

const OBJECT_ID_HEX = /^[0-9a-f]{24}$/i;

/** _id lookup keys for id-like values: each value plus its ObjectId form. */
function idKeys(values) {
	const keys = [];
	for (const v of values) {
		keys.push(v);
		if (OBJECT_ID_HEX.test(String(v))) keys.push(new ObjectId(String(v)));
	}
	return keys;
}

// Hosts only — no credentials, no path or query string. Credentials end at
// the LAST '@': hosts never contain one, so an unescaped '@' in a password
// can't leave a fragment of it in front of the hosts.
function describeHosts(uri) {
	const noScheme = uri.replace(/^mongodb(\+srv)?:\/\//i, "");
	const noCreds = noScheme.slice(noScheme.lastIndexOf("@") + 1);
	return noCreds.split(/[/?]/, 1)[0] || "(unknown)";
}

async function main() {
	const unknown = ARGS.filter((a) => !KNOWN_FLAGS.has(a));
	if (unknown.length > 0 || (APPLY && ARGS.includes("--dry-run"))) {
		console.error(`[reconcile] unexpected arguments: ${ARGS.join(" ")}`);
		console.error(`[reconcile] ${USAGE}`);
		process.exit(2);
	}

	const uri = process.env.MONGODB_URI;
	if (!uri) {
		console.error("[reconcile] MONGODB_URI is not set. Aborting.");
		console.error(`[reconcile] ${USAGE}`);
		process.exit(1);
	}

	// A second '@' is an unescaped one (in the password, as a rule). safety.js
	// and the driver would split the credentials at the first '@' and quote
	// the rest of the password as a host in their errors.
	if (uri.indexOf("@") !== uri.lastIndexOf("@")) {
		console.error(
			"[reconcile] MONGODB_URI contains more than one '@' — percent-encode '@' in the credentials as %40. Aborting.",
		);
		process.exit(1);
	}

	let remote = false;
	try {
		assertLocalMongoUri(uri, "reconcile-user-data");
	} catch (err) {
		if (!ALLOW_REMOTE) {
			console.error(`[reconcile] ${err.message}`);
			console.error(
				"[reconcile] Pass --allow-remote to run against a non-local database.",
			);
			process.exit(1);
		}
		remote = true;
	}

	if (remote) {
		const bar = "!".repeat(72);
		console.warn(`\n${bar}`);
		console.warn("[reconcile] !!! REMOTE DATABASE — --allow-remote is set");
		console.warn(`[reconcile] !!!   hosts: ${describeHosts(uri)}`);
		console.warn(
			`[reconcile] !!!   mode : ${APPLY ? "APPLY — this run WRITES" : "dry run (no writes)"}`,
		);
		console.warn(`${bar}\n`);
		// Before connecting: the live-user snapshot below must not be 10s old
		// by the time the first write runs.
		if (APPLY) {
			console.warn(
				`[reconcile] !!! About to WRITE to ${describeHosts(uri)}. Ctrl+C within 10 seconds to abort.`,
			);
			await new Promise((r) => setTimeout(r, 10000));
		}
	}

	mongoose.set("strictQuery", false);
	await mongoose.connect(uri, {
		maxPoolSize: 1,
		serverSelectionTimeoutMS: 15000,
	});
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose has no db handle.");
	const col = (name) => db.collection(name);

	// Projection keeps emails (and everything else) out of memory.
	const users = await col("users")
		.find(
			{},
			{ projection: { _id: 1, username: 1, renameFrom: 1, deletion: 1, disabledAt: 1 } },
		)
		.toArray();
	log(`database: ${db.databaseName} @ ${describeHosts(uri)}`);
	log(`mode: ${APPLY ? "APPLY (writes enabled)" : "DRY RUN (no writes)"}`);
	if (users.length === 0) {
		throw new Error(
			`'users' is empty in database '${db.databaseName}' — wrong database? Refusing to continue.`,
		);
	}

	const liveIds = new Set(users.map((u) => String(u._id)));
	// A slug still held as `renameFrom` belongs to an unfinished rename: its
	// rows are about to be moved by UpdateUsernameUseCase, not orphaned.
	const liveUsernames = new Set(
		users.flatMap((u) => [u.username, u.renameFrom]).filter((u) => !isBlank(u)),
	);
	const deletingIds = new Set(users.filter(isDeleting).map((u) => String(u._id)));
	const disabledIds = new Set(users.filter(isDisabled).map((u) => String(u._id)));
	log(
		`live users: ${liveIds.size} (${deletingIds.size} with a deletion in progress, ${disabledIds.size} disabled)`,
	);

	const isLiveUserId = (v) => liveIds.has(v) || v === DELETED_USER_ID;

	// ── helpers ──────────────────────────────────────────────────────────

	/** distinct(field) values that are neither blank nor kept. */
	async function orphanValues(name, field, isKept, filter = {}) {
		const values = await col(name).distinct(field, filter);
		return values.filter((v) => !isBlank(v) && !isKept(String(v)));
	}

	// Candidates a pre-write re-check (or a compare-and-set) found changed
	// since the startup snapshot, and therefore left untouched.
	let raced = 0;

	/**
	 * Pre-write re-check against the live collection: returns a function
	 * that drops the candidate values which exist in `name` NOW (a user who
	 * signed up or renamed, a community created, after the snapshot).
	 */
	function stillMissingIn(name, field, label) {
		return async (values) => {
			if (values.length === 0) return values;
			const keys = field === "_id" ? idKeys(values) : values;
			const found = new Set(
				(
					await col(name)
						.find({ [field]: { $in: keys } }, { projection: { [field]: 1 } })
						.toArray()
				).map((d) => String(d[field])),
			);
			const still = values.filter((v) => !found.has(String(v)));
			if (still.length < values.length) {
				raced += values.length - still.length;
				log(
					`  re-check: ${values.length - still.length} ${label} exist now (created after the startup read) — left untouched`,
				);
			}
			return still;
		};
	}
	const stillGoneUserIds = stillMissingIn("users", "_id", "user id(s)");
	const stillGoneByUsername = stillMissingIn("users", "username", "username(s)");
	const stillGoneByRenameFrom = stillMissingIn(
		"users",
		"renameFrom",
		"username(s) held by a pending rename",
	);
	const stillGoneUsernames = async (values) =>
		stillGoneByRenameFrom(await stillGoneByUsername(values));
	const stillGoneCommunities = stillMissingIn(
		"communities",
		"_id",
		"community id(s)",
	);

	// Rows an earlier step deletes (or would delete, in a dry run), per
	// collection. Later steps AND `notDoomed(name)` into their filters so the
	// dry run doesn't double-count and counters ignore rows on their way out.
	// $nin here runs over the (small) orphan list, never over the live set.
	const doomed = {};
	function markDoomed(name, field, values) {
		if (values.length > 0) (doomed[name] ??= []).push({ field, values });
	}
	function notDoomed(name) {
		const list = doomed[name] ?? [];
		if (list.length === 0) return {};
		return { $and: list.map(({ field, values }) => ({ [field]: { $nin: values } })) };
	}

	async function sampleIds(name, filter, limit = SAMPLE) {
		const docs = await col(name)
			.find(filter, { projection: { _id: 1 } })
			.limit(limit)
			.toArray();
		return docs.map((d) => String(d._id));
	}

	/**
	 * Write (or count, in a dry run) rows with field ∈ values, one chunk at a
	 * time; each chunk goes through `recheck` right before its write. Returns
	 * the row count, the values actually acted on and, with `withIds`, a
	 * sample of the affected document ids (taken before the write).
	 */
	async function actIn(name, field, values, recheck, extra, write, withIds) {
		let n = 0;
		const acted = [];
		const ids = [];
		for (const part of chunks(values, IN_CHUNK)) {
			const still = await recheck(part);
			if (still.length === 0) continue;
			const filter = { $and: [extra, { [field]: { $in: still } }] };
			if (withIds && ids.length < SAMPLE) {
				ids.push(...(await sampleIds(name, filter, SAMPLE - ids.length)));
			}
			n += APPLY ? await write(filter) : await col(name).countDocuments(filter);
			acted.push(...still);
		}
		return { n, values: acted, ids };
	}

	/** deleteMany (or count) rows with field ∈ values, re-checked per chunk. */
	function deleteIn(name, field, values, recheck, { extra = {}, withIds = false } = {}) {
		return actIn(
			name,
			field,
			values,
			recheck,
			extra,
			async (filter) => (await col(name).deleteMany(filter)).deletedCount,
			withIds,
		);
	}

	/** updateMany (or count) rows with field ∈ values, re-checked per chunk. */
	function updateIn(
		name,
		field,
		values,
		recheck,
		update,
		{ extra = {}, withIds = false } = {},
	) {
		return actIn(
			name,
			field,
			values,
			recheck,
			extra,
			async (filter) => (await col(name).updateMany(filter, update)).modifiedCount,
			withIds,
		);
	}

	/** Rows with field ∈ values (report-only lines), plus a sample of their ids. */
	async function countIn(name, field, values, extra = {}) {
		let n = 0;
		const ids = [];
		for (const part of chunks(values, IN_CHUNK)) {
			const filter = { $and: [extra, { [field]: { $in: part } }] };
			n += await col(name).countDocuments(filter);
			if (ids.length < SAMPLE) {
				ids.push(...(await sampleIds(name, filter, SAMPLE - ids.length)));
			}
		}
		return { n, ids };
	}

	/**
	 * Map(String(groupKey) → count) over rows matching `match` whose `field`
	 * has the BSON type the app writes and queries with. Rows of any other
	 * type never match the app's own counts, so they are left out here (and
	 * reported by reportBadType) rather than merged into a bucket.
	 */
	async function countBy(name, field, type, match) {
		const rows = await col(name)
			.aggregate([
				{ $match: { $and: [match, { [field]: { $type: type } }] } },
				{ $group: { _id: `$${field}`, n: { $sum: 1 } } },
			])
			.toArray();
		const counts = new Map();
		for (const r of rows) {
			const key = String(r._id);
			counts.set(key, (counts.get(key) ?? 0) + r.n);
		}
		return counts;
	}

	async function bulkUpdate(name, ops) {
		if (!APPLY) return ops.length;
		let n = 0;
		for (const part of chunks(ops, BULK_CHUNK)) {
			const r = await col(name).bulkWrite(part, { ordered: false });
			n += r.modifiedCount;
		}
		return n;
	}

	const summary = [];
	function record(step, target, action, count, kind = "change") {
		summary.push({ step, target, action, count, kind });
	}

	/** Report rows whose `field` is not of `type` (missing included). */
	async function reportBadType(name, field, type) {
		const filter = {
			$and: [notDoomed(name), { [field]: { $not: { $type: type } } }],
		};
		const n = await col(name).countDocuments(filter);
		record(8, `${name}.${field} (not ${type})`, "report", n, "report");
		if (n > 0) {
			const ids = await sampleIds(name, filter);
			log(
				`  ${name}.${field}: ${n} row(s) not of type ${type} — not counted (the app never matches them); ids: ${idList(ids, n)}`,
			);
		}
	}

	// ── 1) rows keyed by a deleted user id ───────────────────────────────
	log("step 1 — rows keyed by a user id that no longer exists");
	const USER_ID_FIELDS = [
		["communitymemberships", "userId"],
		["communityfollows", "userId"],
		["follows", "followerId"],
		["follows", "followingId"],
		["readingsessions", "userId"],
		["userchapterreads", "userId"],
		["passwordresettokens", "userId"],
		["emailverificationtokens", "userId"],
		["commentlikes", "userId"],
		["discussionlikes", "userId"],
		["commentreports", "userId"],
	];
	for (const [name, field] of USER_ID_FIELDS) {
		// notDoomed: a follows row orphaned on both ends counts once.
		const scope = notDoomed(name);
		const candidates = await orphanValues(name, field, isLiveUserId, scope);
		const { n, values } = await deleteIn(name, field, candidates, stillGoneUserIds, {
			extra: scope,
		});
		markDoomed(name, field, values);
		record(1, `${name}.${field}`, "delete", n);
		if (n > 0) {
			log(`  ${name}.${field}: ${n} row(s), deleted user id(s): ${sample(values)}`);
		}
	}

	// ── 2) notifications ─────────────────────────────────────────────────
	log("step 2 — notifications for / from usernames that no longer exist");
	const byRecipient = await deleteIn(
		"notifications",
		"recipient",
		await orphanValues("notifications", "recipient", (u) => liveUsernames.has(u)),
		stillGoneUsernames,
		{ withIds: true },
	);
	record(2, "notifications.recipient", "delete", byRecipient.n);
	if (byRecipient.n > 0) {
		log(
			`  notifications.recipient: ${byRecipient.n} row(s) across ${byRecipient.values.length} unknown recipient(s); ids: ${idList(byRecipient.ids, byRecipient.n)}`,
		);
	}
	const keptRecipient = { recipient: { $nin: byRecipient.values } };
	const byActor = await deleteIn(
		"notifications",
		"actor",
		await orphanValues(
			"notifications",
			"actor",
			(u) => liveUsernames.has(u) || ACTOR_SENTINELS.has(u),
			keptRecipient,
		),
		stillGoneUsernames,
		{ extra: keptRecipient, withIds: true },
	);
	record(2, "notifications.actor", "delete", byActor.n);
	if (byActor.n > 0) {
		log(
			`  notifications.actor: ${byActor.n} row(s) across ${byActor.values.length} unknown actor(s); ids: ${idList(byActor.ids, byActor.n)}`,
		);
	}

	// ── 3) discussion answers of deleted users ───────────────────────────
	log("step 3 — discussion answers by deleted users → detached");
	const detached = await updateIn(
		"discussionanswers",
		"userId",
		await orphanValues("discussionanswers", "userId", isLiveUserId),
		stillGoneUserIds,
		{ $set: { username: ANONYMIZED_USERNAME, userId: DELETED_USER_ID } },
	);
	record(3, "discussionanswers.userId", "anonymize", detached.n);
	if (detached.n > 0) {
		log(
			`  discussionanswers: ${detached.n} answer(s), deleted user id(s): ${sample(detached.values)}`,
		);
	}

	// ── 4) moderator snapshots ───────────────────────────────────────────
	// Report only unless --anonymize-snapshots: before the rename cascade,
	// renaming did not touch these fields, so an unknown name here may be a
	// live moderator's old username rather than a deleted account.
	log(
		ANONYMIZE_SNAPSHOTS
			? "step 4 — moderator snapshots naming a username that no longer exists → anonymized"
			: "step 4 — moderator snapshots naming a username that no longer exists (report only; --anonymize-snapshots rewrites them)",
	);
	const SNAPSHOT_FIELDS = [
		["comments", "verifiedBy"],
		["comments", "hiddenBy"],
		["users", "disabledBy"],
	];
	for (const [name, field] of SNAPSHOT_FIELDS) {
		const candidates = await orphanValues(
			name,
			field,
			(u) => liveUsernames.has(u) || u === ANONYMIZED_USERNAME,
		);
		if (ANONYMIZE_SNAPSHOTS) {
			const r = await updateIn(
				name,
				field,
				candidates,
				stillGoneUsernames,
				{ $set: { [field]: ANONYMIZED_USERNAME } },
				{ withIds: true },
			);
			record(4, `${name}.${field}`, "anonymize", r.n);
			if (r.n > 0) {
				log(
					`  ${name}.${field}: ${r.n} doc(s) across ${r.values.length} unknown moderator(s); ids: ${idList(r.ids, r.n)}`,
				);
			}
		} else {
			const r = await countIn(name, field, candidates);
			record(4, `${name}.${field}`, "report", r.n, "report");
			if (r.n > 0) {
				log(
					`  ${name}.${field}: ${r.n} doc(s) across ${candidates.length} unknown moderator(s); ids: ${idList(r.ids, r.n)}`,
				);
			}
		}
	}

	// ── 5) rows pointing to a missing community ──────────────────────────
	log("step 5 — memberships / follows of communities that no longer exist");
	const communityIds = new Set(
		(await col("communities").find({}, { projection: { _id: 1 } }).toArray()).map(
			(c) => String(c._id),
		),
	);
	for (const name of ["communitymemberships", "communityfollows"]) {
		const scope = notDoomed(name);
		const candidates = await orphanValues(
			name,
			"communityId",
			(id) => communityIds.has(id),
			scope,
		);
		const { n, values } = await deleteIn(
			name,
			"communityId",
			candidates,
			stillGoneCommunities,
			{ extra: scope },
		);
		markDoomed(name, "communityId", values);
		record(5, `${name}.communityId`, "delete", n);
		if (n > 0) {
			log(`  ${name}: ${n} row(s), missing community id(s): ${sample(values)}`);
		}
	}

	// ── 6) communities whose creator is gone ─────────────────────────────
	// Any creator outside the live set, the "deleted-user" sentinel included:
	// the app never writes it to communities (a leaving creator hands over or
	// deletes), so a community carrying it is just as ownerless.
	log("step 6 — communities whose creator no longer exists");
	const ownerless = (
		await col("communities")
			.find({}, { projection: { _id: 1, slug: 1, name: 1, createdBy: 1 } })
			.toArray()
	).filter((c) => !liveIds.has(String(c.createdBy)));
	let reassigned = 0;
	let notified = 0;
	const noSuccessor = [];
	for (const c of ownerless) {
		const cid = String(c._id);
		const creator = c.createdBy ?? null;
		if ((await stillGoneUserIds([String(creator)])).length === 0) {
			log(`  ${c.slug} (${cid}): creator ${String(creator)} exists now — left as is`);
			continue;
		}
		const members = await col("communitymemberships")
			.find({ communityId: cid, ...APPROVED })
			.toArray();
		// Same order as listApprovedOrdered: moderators first, then joinedAt
		// ascending (missing first, as Mongo sorts it), then _id. Mid-deletion
		// and disabled accounts are skipped, as HandOverOwnedCommunitiesUseCase
		// skips them.
		const eligible = members
			.filter((m) => liveIds.has(String(m.userId)))
			.filter((m) => !deletingIds.has(String(m.userId)))
			.filter((m) => !disabledIds.has(String(m.userId)))
			.sort((a, b) => {
				const roleA = a.role === "moderator" ? 0 : 1;
				const roleB = b.role === "moderator" ? 0 : 1;
				if (roleA !== roleB) return roleA - roleB;
				const tA = a.joinedAt instanceof Date ? a.joinedAt.getTime() : -Infinity;
				const tB = b.joinedAt instanceof Date ? b.joinedAt.getTime() : -Infinity;
				if (tA !== tB) return tA < tB ? -1 : 1;
				return String(a._id).localeCompare(String(b._id));
			});
		// Re-check each candidate right before using it: the account must
		// still exist, and not have started a deletion or been disabled since
		// the snapshot (same tests as the snapshot, so the two can't disagree).
		let successor = null;
		let successorName = null;
		for (const m of eligible) {
			const u = await col("users").findOne(
				{ _id: { $in: idKeys([m.userId]) } },
				{ projection: { _id: 1, username: 1, "deletion.requestedAt": 1, disabledAt: 1 } },
			);
			let why = null;
			if (!u) why = "was deleted";
			else if (isDeleting(u)) why = "started a deletion";
			else if (isDisabled(u)) why = "was disabled";
			if (!why) {
				successor = m;
				successorName = u.username;
				break;
			}
			raced++;
			log(`  ${c.slug} (${cid}): candidate ${String(m.userId)} ${why} since the read — skipped`);
		}
		if (!successor) {
			noSuccessor.push(c);
			log(
				`  ${c.slug} (${cid}): creator ${String(creator)} gone, NO eligible approved member (live, not deleting, not disabled) — REPORT ONLY`,
			);
			continue;
		}
		const successorId = String(successor.userId);
		log(
			`  ${c.slug} (${cid}): creator ${String(creator)} gone → ${successorId} (${successor.role ?? "member"})`,
		);
		if (!APPLY) {
			reassigned++;
			if (!isBlank(successorName)) notified++;
			continue;
		}
		// createdBy is the commit point and goes first, compare-and-set
		// against the value read above: on a concurrent change nothing else
		// is written (no stray moderator promotion).
		const cas = await col("communities").updateOne(
			{ _id: c._id, createdBy: creator },
			{ $set: { createdBy: successorId, updatedAt: new Date() } },
		);
		if (cas.matchedCount !== 1) {
			raced++;
			log(
				`  ${c.slug} (${cid}): createdBy changed since the read (matched ${cas.matchedCount}) — skipped, nothing written`,
			);
			continue;
		}
		const promoted = await col("communitymemberships").updateOne(
			{ _id: successor._id },
			{ $set: { status: "approved", role: "moderator" } },
		);
		if (promoted.matchedCount !== 1) {
			// The successor left since the read: undo the hand-over, unless
			// someone else has changed createdBy in the meantime.
			await col("communities").updateOne(
				{ _id: c._id, createdBy: successorId },
				creator === null
					? { $unset: { createdBy: "" } }
					: { $set: { createdBy: creator } },
			);
			raced++;
			log(
				`  ${c.slug} (${cid}): successor's membership is gone — hand-over rolled back`,
			);
			continue;
		}
		reassigned++;
		if (!isBlank(successorName)) {
			// Same notification as HandOverOwnedCommunitiesUseCase; best-effort
			// there too. Raw insert, so the Mongoose defaults are spelled out.
			try {
				const now = new Date();
				await col("notifications").insertOne({
					recipient: successorName,
					actor: "system",
					type: "community_role_promoted",
					resourceType: "community",
					resourceId: cid,
					message: `Você agora é responsável pela comunidade ${c.name ?? c.slug}.`,
					url: `/communities/${c.slug}`,
					read: false,
					createdAt: now,
					updatedAt: now,
				});
				notified++;
			} catch (err) {
				log(
					`  ${c.slug} (${cid}): hand-over notification failed: ${err && err.message ? err.message : err}`,
				);
			}
		}
	}
	record(6, "communities.createdBy", "reassign", reassigned);
	record(6, "notifications (hand-over)", "insert", notified);
	record(6, "communities without successor", "report", noSuccessor.length, "report");

	// ── 7) username-keyed rows (report only) ─────────────────────────────
	log("step 7 — username-keyed rows whose username is not live (report only)");
	const isLiveOrAnon = (u) => liveUsernames.has(u) || u === ANONYMIZED_USERNAME;
	const NON_LEGACY = { sourceId: { $exists: false } };
	const LEGACY = { sourceId: { $exists: true } };
	const REPORTS = [
		["pushsubscriptions", {}, (u) => liveUsernames.has(u)],
		["readingreminderpreferences", {}, (u) => liveUsernames.has(u)],
		["comments", NON_LEGACY, isLiveOrAnon],
		["discussions", NON_LEGACY, isLiveOrAnon],
	];
	for (const [name, scope, isKept] of REPORTS) {
		const orphans = await orphanValues(name, "username", isKept, scope);
		const { n, ids } = await countIn(name, "username", orphans, scope);
		const label =
			scope === NON_LEGACY ? `${name}.username (no sourceId)` : `${name}.username`;
		record(7, label, "report", n, "report");
		if (n > 0) {
			log(
				`  ${label}: ${n} row(s) across ${orphans.length} unknown username(s); ids: ${idList(ids, n)}`,
			);
		}
		if (scope === NON_LEGACY) {
			const legacy = await orphanValues(name, "username", isKept, LEGACY);
			if (legacy.length > 0) {
				log(
					`  ${name}: ${legacy.length} legacy username(s) with sourceId — historical attribution, ignored`,
				);
			}
		}
	}

	// ── 8) counters ──────────────────────────────────────────────────────
	// Key types follow the Mongoose models: communityId is a String on
	// memberships/follows, targetId and discussionId are ObjectIds.
	log("step 8 — recompute denormalized counters");
	const memberCounts = await countBy("communitymemberships", "communityId", "string", {
		$and: [APPROVED, notDoomed("communitymemberships")],
	});
	const followerCounts = await countBy(
		"communityfollows",
		"communityId",
		"string",
		notDoomed("communityfollows"),
	);
	const communityOps = [];
	const communities = await col("communities")
		.find({}, { projection: { _id: 1, slug: 1, memberCount: 1, followerCount: 1 } })
		.toArray();
	for (const c of communities) {
		const want = {
			memberCount: memberCounts.get(String(c._id)) ?? 0,
			followerCount: followerCounts.get(String(c._id)) ?? 0,
		};
		const drifted = Object.keys(want).filter((k) => c[k] !== want[k]);
		if (drifted.length === 0) continue;
		const $set = { updatedAt: new Date() }; // raw writes skip Mongoose timestamps; sitemap lastmod
		for (const k of drifted) $set[k] = want[k];
		communityOps.push({
			updateOne: {
				filter: { _id: c._id, $or: drifted.map((k) => ({ [k]: { $ne: want[k] } })) },
				update: { $set },
			},
		});
		log(
			`  ${c.slug} (${String(c._id)}): ${drifted.map((k) => `${k} ${c[k] ?? "missing"} → ${want[k]}`).join(", ")}`,
		);
	}
	record(8, "communities counters", "update", await bulkUpdate("communities", communityOps));

	const likeCounts = await countBy("discussionlikes", "targetId", "objectId", {
		$and: [{ targetType: "discussion" }, notDoomed("discussionlikes")],
	});
	const answerCounts = await countBy("discussionanswers", "discussionId", "objectId", {});
	const discussionOps = [];
	const discussions = await col("discussions")
		.find({}, { projection: { _id: 1, likeCount: 1, answersCount: 1 } })
		.toArray();
	for (const d of discussions) {
		const want = {
			likeCount: likeCounts.get(String(d._id)) ?? 0,
			answersCount: answerCounts.get(String(d._id)) ?? 0,
		};
		const drifted = Object.keys(want).filter((k) => d[k] !== want[k]);
		if (drifted.length === 0) continue;
		const $set = {}; // discussion updatedAt deliberately untouched
		for (const k of drifted) $set[k] = want[k];
		discussionOps.push({
			updateOne: {
				filter: { _id: d._id, $or: drifted.map((k) => ({ [k]: { $ne: want[k] } })) },
				update: { $set },
			},
		});
	}
	if (discussionOps.length > 0) {
		log(
			`  discussions: ${discussionOps.length} drifted: ${sample(discussionOps.map((op) => op.updateOne.filter._id))}`,
		);
	}
	record(8, "discussions counters", "update", await bulkUpdate("discussions", discussionOps));

	await reportBadType("communitymemberships", "communityId", "string");
	await reportBadType("communityfollows", "communityId", "string");
	await reportBadType("discussionlikes", "targetId", "objectId");
	await reportBadType("discussionanswers", "discussionId", "objectId");

	// ── summary ──────────────────────────────────────────────────────────
	const changes = summary
		.filter((r) => r.kind === "change")
		.reduce((sum, r) => sum + r.count, 0);
	const reported = summary
		.filter((r) => r.kind === "report")
		.reduce((sum, r) => sum + r.count, 0);
	const head = APPLY ? "applied" : "would change";
	console.log("");
	log(`summary (${APPLY ? "APPLY" : "DRY RUN — nothing written"})`);
	console.log(`  step  ${"target".padEnd(48)}${"action".padEnd(11)}${head.padStart(12)}`);
	for (const r of summary) {
		console.log(
			`  ${String(r.step).padEnd(6)}${r.target.padEnd(48)}${r.action.padEnd(11)}${String(r.count).padStart(12)}`,
		);
	}
	log(`TOTAL changes: ${changes}${APPLY ? "" : " (dry run)"}`);
	log(`report-only rows: ${reported}`);
	if (raced > 0) {
		log(
			`${raced} candidate(s) changed during the run and were left untouched — re-run to re-check them.`,
		);
	}
	if (!APPLY && changes > 0) log("re-run with --apply to write these changes.");

	await mongoose.disconnect();
}

main().catch(async (err) => {
	console.error("[reconcile] FAILED:", err && err.message ? err.message : err);
	try {
		await mongoose.disconnect();
	} catch {
		/* ignore */
	}
	process.exit(1);
});
