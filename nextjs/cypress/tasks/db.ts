/**
 * DB tasks invoked from Cypress via cy.task("db:*", ...).
 * These run in the Node-side of Cypress, NOT in the browser.
 *
 * They connect to the Mongo instance pointed to by MONGODB_URI
 * (which MUST be a test database — never prod). Each task reuses
 * a single Mongoose connection across the test run.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { assertLocalMongoUri } from "./safety";

let connected = false;

async function ensureConnected(): Promise<void> {
	if (connected) return;
	const uri = process.env.MONGODB_URI;
	// Hard-stop if the URI isn't local. This guard is the last line of
	// defense against cy.task("db:reset") wiping a production database
	// when MONGODB_URI is inherited from .env or the shell.
	assertLocalMongoUri(uri, "Cypress db.ts");
	mongoose.set("strictQuery", false);
	await mongoose.connect(uri!);
	connected = true;
}

const COLLECTIONS = [
	"users",
	"books",
	"verses",
	"comments",
	"commentlikes",
	"commentreports",
	"discussions",
	"discussionanswers",
	"discussionlikes",
	"notifications",
	"passwordresettokens",
	"userchapterreads",
	"follows",
	"communities",
	"communitymemberships",
	"communityfollows",
];

export async function resetDatabase(): Promise<void> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	for (const name of COLLECTIONS) {
		try {
			await db.collection(name).deleteMany({});
		} catch {
			// Collection may not exist yet — fine.
		}
	}
}

export interface SeedUser {
	email: string;
	username: string;
	password: string;
	moderator?: boolean;
	state?: string;
	belief?: string;
	/** Opt-in flag: when true, the public /u/[username] page exposes `belief`. */
	showBelief?: boolean;
	/** Unlocked badge IDs (catalog ids from src/lib/badges/catalog.ts). */
	badges?: string[];
	tutorialsCompleted?: string[];
	/**
	 * Email-verification state. Defaults to `true` so the verification gate
	 * (CreateComment, CreateDiscussion, AddAnswer, CreateCommunity) doesn't
	 * block every existing test. Set to `false` for specs that exercise the
	 * unverified-user flow.
	 */
	emailVerified?: boolean;
	/** Pending email-change address awaiting confirmation. Rarely used in tests. */
	pendingEmail?: string;
}

export interface SeedBook {
	abbrev: string;
	name: string;
	chapters: number;
	testament: string;
	group: string;
	author: string;
}

export interface SeedVerse {
	abbrev: string;
	chapter: number;
	verseNumber: number;
	text: string;
	reference?: string;
}

export interface SeedCommunity {
	slug: string;
	name: string;
	description?: string;
	/** username of the creator; resolved to User._id at seed time. */
	createdBy: string;
	memberCount?: number;
}

export interface SeedCommunityMembership {
	username: string;
	communitySlug: string;
	status: "pending" | "approved";
	role?: "member" | "moderator";
}

export interface SeedCommunityFollow {
	username: string;
	communitySlug: string;
}

export interface SeedPayload {
	users?: SeedUser[];
	books?: SeedBook[];
	verses?: SeedVerse[];
	communities?: SeedCommunity[];
	communityMemberships?: SeedCommunityMembership[];
	communityFollows?: SeedCommunityFollow[];
}

export async function findUserByEmail(email: string): Promise<{
	exists: boolean;
	passwordHashLength: number;
	username: string | null;
	tutorialsCompleted: string[];
}> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const doc = await db
		.collection("users")
		.findOne({ email: email.toLowerCase().trim() });
	if (!doc) {
		return {
			exists: false,
			passwordHashLength: 0,
			username: null,
			tutorialsCompleted: [],
		};
	}
	return {
		exists: true,
		passwordHashLength:
			typeof doc.password === "string" ? doc.password.length : 0,
		username: typeof doc.username === "string" ? doc.username : null,
		tutorialsCompleted: Array.isArray(doc.tutorialsCompleted)
			? (doc.tutorialsCompleted as string[])
			: [],
	};
}

export interface InsertResetTokenInput {
	email: string;
	rawToken: string;
	expiresAt: string; // ISO date
}

/** Inserts a password reset token tied to the user with `email`. */
export async function insertResetToken(
	input: InsertResetTokenInput,
): Promise<void> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const user = await db
		.collection("users")
		.findOne({ email: input.email.toLowerCase().trim() });
	if (!user) throw new Error(`insertResetToken: user ${input.email} not found`);

	const tokenHash = crypto
		.createHash("sha256")
		.update(input.rawToken)
		.digest("hex");
	await db.collection("passwordresettokens").insertOne({
		userId: user._id.toString(),
		tokenHash,
		expiresAt: new Date(input.expiresAt),
		createdAt: new Date(),
	});
}

export async function getUserBadges(email: string): Promise<string[]> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const user = await db
		.collection("users")
		.findOne({ email: email.toLowerCase().trim() });
	if (!user) return [];
	return Array.isArray(user.badges) ? (user.badges as string[]) : [];
}

export interface SeedCommentInput {
	username: string;
	/** Verse identifiers — needs a verse seeded via seedDb so we can resolve the id. */
	abbrev: string;
	chapter: number;
	verseNumber: number;
	bookReference?: string;
	text: string;
	tags?: string[];
}

/**
 * Insert a comment row directly into Mongo, bypassing the API. Useful for
 * tests that need pre-existing content (feed assertions, profile timeline)
 * without driving through the UI/auth.
 */
export async function seedComment(
	input: SeedCommentInput,
): Promise<{ id: string }> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const verse = await db.collection("verses").findOne({
		abbrev: input.abbrev,
		chapter: input.chapter,
		verseNumber: input.verseNumber,
	});
	if (!verse) {
		throw new Error(
			`seedComment: verse ${input.abbrev} ${input.chapter}:${input.verseNumber} not found — seed it via cy.seedDb first.`,
		);
	}
	const now = new Date();
	const doc = {
		verseId: verse._id,
		username: input.username,
		onTitle: false,
		bookReference:
			input.bookReference ??
			`${input.abbrev} ${input.chapter}:${input.verseNumber}`,
		text: input.text,
		tags: input.tags ?? ["devocional"],
		verified: false,
		createdAt: now,
		updatedAt: now,
	};
	const result = await db.collection("comments").insertOne(doc);
	return { id: result.insertedId.toString() };
}

export async function seedChapterRead(input: {
	email: string;
	abbrev: string;
	chapter: number;
}): Promise<void> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const user = await db
		.collection("users")
		.findOne({ email: input.email.toLowerCase().trim() });
	if (!user) throw new Error(`seedChapterRead: user ${input.email} not found`);
	await db.collection("userchapterreads").updateOne(
		{
			userId: user._id.toString(),
			abbrev: input.abbrev.toLowerCase(),
			chapter: input.chapter,
		},
		{ $setOnInsert: { readAt: new Date() } },
		{ upsert: true },
	);
}

export async function countChapterReads(email: string): Promise<number> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const user = await db
		.collection("users")
		.findOne({ email: email.toLowerCase().trim() });
	if (!user) return 0;
	return db
		.collection("userchapterreads")
		.countDocuments({ userId: user._id.toString() });
}

/** Total likes given by `email` across all comments. */
export async function countCommentLikesByUser(email: string): Promise<number> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const user = await db
		.collection("users")
		.findOne({ email: email.toLowerCase().trim() });
	if (!user) return 0;
	return db
		.collection("commentlikes")
		.countDocuments({ userId: user._id.toString() });
}

/** Total likes received by a single comment (rows in commentlikes for that id). */
export async function countLikesForComment(commentId: string): Promise<number> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	if (!mongoose.Types.ObjectId.isValid(commentId)) return 0;
	return db
		.collection("commentlikes")
		.countDocuments({ commentId: new mongoose.Types.ObjectId(commentId) });
}

/** Total reports filed by a user across all comments. */
export async function countCommentReportsByUser(
	email: string,
): Promise<number> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const user = await db
		.collection("users")
		.findOne({ email: email.toLowerCase().trim() });
	if (!user) return 0;
	return db
		.collection("commentreports")
		.countDocuments({ userId: user._id.toString() });
}

/** Number of soft-hidden comments authored by `username`. */
export async function countHiddenCommentsByUsername(
	username: string,
): Promise<number> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	return db
		.collection("comments")
		.countDocuments({ username, hiddenAt: { $ne: null } });
}

/** Total reports filed against a single comment. */
export async function countReportsForComment(
	commentId: string,
): Promise<number> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	if (!mongoose.Types.ObjectId.isValid(commentId)) return 0;
	return db
		.collection("commentreports")
		.countDocuments({ commentId: new mongoose.Types.ObjectId(commentId) });
}

/** Total answers a user has authored across all discussions. */
export async function countAnswersByUser(email: string): Promise<number> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const user = await db
		.collection("users")
		.findOne({ email: email.toLowerCase().trim() });
	if (!user) return 0;
	return db
		.collection("discussionanswers")
		.countDocuments({ userId: user._id.toString() });
}

/** Number of answers attached to a single discussion. */
export async function countAnswersForDiscussion(
	discussionId: string,
): Promise<number> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	if (!mongoose.Types.ObjectId.isValid(discussionId)) return 0;
	return db.collection("discussionanswers").countDocuments({
		discussionId: new mongoose.Types.ObjectId(discussionId),
	});
}

/** Counts password reset tokens for a given email (active + expired). */
export async function countResetTokensForEmail(email: string): Promise<number> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");
	const user = await db
		.collection("users")
		.findOne({ email: email.toLowerCase().trim() });
	if (!user) return 0;
	return db
		.collection("passwordresettokens")
		.countDocuments({ userId: user._id.toString() });
}

export async function seedDatabase(payload: SeedPayload): Promise<void> {
	await ensureConnected();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection has no db handle.");

	if (payload.users?.length) {
		const docs = await Promise.all(
			payload.users.map(async (u) => {
				const verified = u.emailVerified !== false;
				return {
					email: u.email.toLowerCase().trim(),
					username: u.username,
					password: await bcrypt.hash(u.password, 12),
					state: u.state ?? "",
					belief: u.belief ?? "",
					showBelief: u.showBelief ?? false,
					badges: u.badges ?? [],
					moderator: u.moderator ?? false,
					tutorialsCompleted: u.tutorialsCompleted ?? [],
					...(verified ? { emailVerifiedAt: new Date() } : {}),
					...(u.pendingEmail
						? { pendingEmail: u.pendingEmail.toLowerCase().trim() }
						: {}),
					createdAt: new Date(),
					updatedAt: new Date(),
				};
			}),
		);
		await db.collection("users").insertMany(docs);
	}

	if (payload.books?.length) {
		await db.collection("books").insertMany(payload.books);
	}

	if (payload.verses?.length) {
		await db.collection("verses").insertMany(payload.verses);
	}

	// plan_community fixtures: resolve usernames → User._id (and slugs →
	// Community._id for memberships) since the storage uses ids.
	if (payload.communities?.length) {
		const usernames = [...new Set(payload.communities.map((c) => c.createdBy))];
		const userDocs = await db
			.collection("users")
			.find(
				{ username: { $in: usernames } },
				{ projection: { _id: 1, username: 1 } },
			)
			.toArray();
		const userIdByName = new Map(
			userDocs.map((u) => [u.username as string, String(u._id)]),
		);
		const docs = payload.communities.map((c) => ({
			slug: c.slug,
			name: c.name,
			description: c.description ?? "",
			createdBy: userIdByName.get(c.createdBy) ?? "",
			memberCount: c.memberCount ?? 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		}));
		await db.collection("communities").insertMany(docs);
	}

	if (payload.communityFollows?.length) {
		const usernames = [
			...new Set(payload.communityFollows.map((f) => f.username)),
		];
		const userDocs = await db
			.collection("users")
			.find(
				{ username: { $in: usernames } },
				{ projection: { _id: 1, username: 1 } },
			)
			.toArray();
		const userIdByName = new Map(
			userDocs.map((u) => [u.username as string, String(u._id)]),
		);
		const slugs = [
			...new Set(payload.communityFollows.map((f) => f.communitySlug)),
		];
		const commDocs = await db
			.collection("communities")
			.find({ slug: { $in: slugs } }, { projection: { _id: 1, slug: 1 } })
			.toArray();
		const commIdBySlug = new Map(
			commDocs.map((c) => [c.slug as string, String(c._id)]),
		);
		const docs = payload.communityFollows.map((f) => ({
			userId: userIdByName.get(f.username) ?? "",
			communityId: commIdBySlug.get(f.communitySlug) ?? "",
			followedAt: new Date(),
		}));
		await db.collection("communityfollows").insertMany(docs);
		// Bump followerCount per community so the listing/detail headers
		// show the right number on first render.
		for (const slug of slugs) {
			const count = docs.filter(
				(d) => d.communityId === commIdBySlug.get(slug),
			).length;
			if (count === 0) continue;
			await db
				.collection("communities")
				.updateOne({ slug }, { $inc: { followerCount: count } });
		}
	}

	if (payload.communityMemberships?.length) {
		const usernames = [
			...new Set(payload.communityMemberships.map((m) => m.username)),
		];
		const userDocs = await db
			.collection("users")
			.find(
				{ username: { $in: usernames } },
				{ projection: { _id: 1, username: 1 } },
			)
			.toArray();
		const userIdByName = new Map(
			userDocs.map((u) => [u.username as string, String(u._id)]),
		);
		const slugs = [
			...new Set(payload.communityMemberships.map((m) => m.communitySlug)),
		];
		const commDocs = await db
			.collection("communities")
			.find({ slug: { $in: slugs } }, { projection: { _id: 1, slug: 1 } })
			.toArray();
		const commIdBySlug = new Map(
			commDocs.map((c) => [c.slug as string, String(c._id)]),
		);
		const docs = payload.communityMemberships.map((m) => ({
			userId: userIdByName.get(m.username) ?? "",
			communityId: commIdBySlug.get(m.communitySlug) ?? "",
			status: m.status,
			role: m.role ?? "member",
			joinedAt: new Date(),
		}));
		await db.collection("communitymemberships").insertMany(docs);
	}
}
