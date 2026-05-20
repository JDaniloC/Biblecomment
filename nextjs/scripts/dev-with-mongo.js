/**
 * One-shot dev orchestrator that mirrors cy-test.js but stops short of
 * Cypress: in-memory Mongo + seeded fixtures + `next dev`. Useful when
 * you want a real, browseable app for manual testing or, in this case,
 * a chrome-devtools MCP attaching to an actual session.
 *
 *   npm run dev:mongo
 *
 * Seeds three users (alice/bob/mod), Gênesis with chapter count = 50,
 * and Gn 1:1-3. Same fixture data as the Cypress suite, so anything
 * the spec exercises also exists here.
 *
 * On SIGINT/SIGTERM stops next dev and tears Mongo memory down.
 *
 * No docker, no setup. The Mongo binary downloads on first run
 * (~80 MB, cached under %LOCALAPPDATA%\.cache\mongodb-binaries on
 * Windows or ~/.cache/mongodb-binaries elsewhere).
 */

const path = require("path");
const { spawn } = require("child_process");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { assertLocalMongoUri } = require("./safety");

if (process.env.MONGODB_URI) {
	try {
		assertLocalMongoUri(process.env.MONGODB_URI, "dev-with-mongo pre-flight");
	} catch (err) {
		console.error(`[dev] aborting: ${err.message}`);
		process.exit(1);
	}
	console.warn(
		"[dev] note: MONGODB_URI was already set in env — that value will be overridden by the in-memory server.",
	);
}

const FIXTURES = {
	users: [
		{
			email: "alice@cypress.test",
			username: "alice",
			password: "alice-secret-123",
			moderator: false,
		},
		{
			email: "bob@cypress.test",
			username: "bob",
			password: "bob-secret-123",
			moderator: false,
		},
		{
			email: "mod@cypress.test",
			username: "mod",
			password: "mod-secret-123",
			moderator: true,
		},
	],
	book: {
		abbrev: "gn",
		name: "Gênesis",
		chapters: 50,
		testament: "VT",
		group: "Pentateuco",
		author: "Moisés",
	},
	verses: [
		{
			abbrev: "gn",
			chapter: 1,
			verseNumber: 1,
			text: "No princípio, Deus criou os céus e a terra.",
			reference: "Gn 1:1",
		},
		{
			abbrev: "gn",
			chapter: 1,
			verseNumber: 2,
			text: "A terra era sem forma e vazia; havia trevas sobre a face do abismo.",
			reference: "Gn 1:2",
		},
		{
			abbrev: "gn",
			chapter: 1,
			verseNumber: 3,
			text: "Disse Deus: Haja luz; e houve luz.",
			reference: "Gn 1:3",
		},
	],
	// Demo comments on Gn 1:1 so the multi-category badges + share card +
	// inline delete are actually visible when browsing (the API/Cypress
	// path seeds none). verseNumber is resolved to the inserted verse _id
	// in seed(). likeCount is derived from the CommentLike collection, so
	// these show "0 Perspectivas" — enough to inspect the footer layout.
	comments: [
		{
			verseNumber: 1,
			username: "alice",
			tags: ["exegese", "pessoal"],
			text: "Comentário multi-categoria: 'bara' (criar) aqui implica criação do nada — e me faz lembrar que minha própria história também começou do nada nas mãos de Deus.",
		},
		{
			verseNumber: 1,
			username: "bob",
			tags: ["inspirado", "devocional", "pessoal"],
			text: "Três perspectivas num só: o Espírito me inspirou a ver beleza no caos, devocionalmente isso me acalma, e pessoalmente reorganiza meu dia.",
		},
		{
			verseNumber: 1,
			username: "alice",
			tags: ["devocional"],
			text: "Comentário de categoria única — começar o dia lembrando que tudo tem uma origem boa.",
		},
		{
			verseNumber: 1,
			username: "bob",
			tags: [],
			text: "Comentário sem categoria nenhuma — deve cair no badge neutro 'Comentário'.",
		},
	],
};

const COLLECTIONS = [
	"users",
	"books",
	"verses",
	"comments",
	"commentlikes",
	"commentreports",
	"communities",
	"communitymemberships",
	"communityfollows",
	"discussions",
	"discussionanswers",
	"notifications",
	"passwordresettokens",
	"userchapterreads",
];

async function seed(uri) {
	mongoose.set("strictQuery", false);
	await mongoose.connect(uri);
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose has no db handle.");

	for (const name of COLLECTIONS) {
		try {
			await db.collection(name).deleteMany({});
		} catch {
			/* collection may not exist yet */
		}
	}

	const userDocs = await Promise.all(
		FIXTURES.users.map(async (u) => ({
			email: u.email.toLowerCase().trim(),
			username: u.username,
			password: await bcrypt.hash(u.password, 12),
			state: "",
			belief: "",
			moderator: u.moderator,
			createdAt: new Date(),
			updatedAt: new Date(),
		})),
	);
	const userIns = await db.collection("users").insertMany(userDocs);
	const aliceId = String(userIns.insertedIds[0]); // FIXTURES.users[0] = alice
	const bobId = String(userIns.insertedIds[1]); // = bob (NOT a member)

	// Demo community for the plan_community read-path: alice is an
	// approved moderator of "reformados"; bob is not a member. The
	// comment endpoint with ?community=reformados then partitions
	// alice's comments into `prioritized` and bob's into `others`.
	const nowC = new Date();
	const commIns = await db.collection("communities").insertOne({
		slug: "reformados",
		name: "Reformados",
		description: "Comunidade de demonstração (plan_community)",
		createdBy: aliceId,
		memberCount: 1,
		// alice follows her own community by default (plan_community
		// follow-up: approving a member auto-follows; we mirror that
		// invariant in the seed so the picker shows Reformados out of the
		// box).
		followerCount: 1,
		createdAt: nowC,
		updatedAt: nowC,
	});
	await db.collection("communitymemberships").insertMany([
		{
			userId: aliceId,
			communityId: String(commIns.insertedId),
			status: "approved",
			role: "moderator",
			joinedAt: nowC,
		},
	]);
	await db.collection("communityfollows").insertOne({
		userId: aliceId,
		communityId: String(commIns.insertedId),
		followedAt: nowC,
	});
	// bobId intentionally unused — kept around for ad-hoc seed extensions
	// (e.g. seeding bob into a community). Reference it so eslint doesn't
	// complain about unused vars.
	if (bobId === "") throw new Error("unreachable");

	await db.collection("books").insertOne(FIXTURES.book);
	const { insertedIds } = await db
		.collection("verses")
		.insertMany(FIXTURES.verses);

	// Map verseNumber -> inserted _id so demo comments can reference it.
	const verseIdByNumber = new Map(
		FIXTURES.verses.map((v, i) => [v.verseNumber, insertedIds[i]]),
	);
	const now = new Date();
	const commentDocs = FIXTURES.comments.map((c) => ({
		verseId: verseIdByNumber.get(c.verseNumber),
		username: c.username,
		onTitle: false,
		bookReference: `Gn 1:${c.verseNumber}`,
		text: c.text,
		tags: c.tags,
		verified: false,
		createdAt: now,
		updatedAt: now,
	}));
	await db.collection("comments").insertMany(commentDocs);

	console.log(
		`[dev] seeded ${FIXTURES.users.length} users (alice/bob/mod), 1 book (gn), ${FIXTURES.verses.length} verses, ${commentDocs.length} demo comments on Gn 1:1`,
	);
	await mongoose.disconnect();
}

async function main() {
	console.log("[dev] starting mongodb-memory-server...");
	const mongo = await MongoMemoryServer.create({
		instance: { dbName: "biblecomment-dev" },
	});
	const uri = mongo.getUri();
	// Sanity-check the in-memory URI is local. Defends against any future
	// mongodb-memory-server change that might emit a non-localhost address.
	assertLocalMongoUri(uri, "dev-with-mongo in-memory mongo");
	console.log(`[dev] mongo ready at ${uri}`);

	await seed(uri);

	const env = {
		...process.env,
		MONGODB_URI: uri,
		NEXTAUTH_SECRET:
			process.env.NEXTAUTH_SECRET || "dev-mongo-secret-not-for-prod",
		NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://localhost:3000",
		AUTH_TRUST_HOST: "true",
		NODE_ENV: "development",
		// Each dev:mongo run spins a fresh memory-mongo with new ObjectIds,
		// but Next's unstable_cache persists on disk under .next/cache. Skip
		// the cache wrapper for these runs so verseIds, counts, etc. always
		// reflect the just-seeded DB (see src/lib/conditional-cache.ts).
		BC_SKIP_CACHE: "1",
		// Capture password-reset emails locally so /api/_test/last-email can
		// hand back the link instead of relying on a real Resend account.
		EMAIL_TRANSPORT: process.env.EMAIL_TRANSPORT ?? "memory",
		APP_URL:
			process.env.APP_URL ??
			process.env.NEXTAUTH_URL ??
			"http://localhost:3000",
	};

	console.log(
		"[dev] launching next dev on :3000 — log in as alice@cypress.test / alice-secret-123\n",
	);

	// Windows requires shell:true for .cmd shims like npm.cmd; harmless on
	// POSIX where /usr/bin/npm is a regular executable.
	const child = spawn("npm", ["run", "dev"], {
		stdio: "inherit",
		env,
		cwd: path.resolve(__dirname, ".."),
		shell: true,
	});

	let teardownStarted = false;
	const teardown = async (signal) => {
		if (teardownStarted) return;
		teardownStarted = true;
		console.log(`\n[dev] received ${signal ?? "exit"}, tearing down...`);
		if (!child.killed) {
			try {
				child.kill("SIGTERM");
			} catch {
				/* ignore */
			}
		}
		try {
			await mongo.stop();
		} catch {
			/* ignore */
		}
		process.exit(0);
	};

	process.on("SIGINT", () => teardown("SIGINT"));
	process.on("SIGTERM", () => teardown("SIGTERM"));
	child.on("exit", () => teardown("child-exit"));
}

main().catch(async (err) => {
	console.error("[dev] fatal:", err && err.message ? err.message : err);
	process.exit(1);
});
