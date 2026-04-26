/**
 * Migration script: SQLite (backend) -> MongoDB (nextjs)
 *
 * Usage:
 *   node nextjs/scripts/migrate-sqlite-to-mongo.js
 *
 * The script is idempotent: re-running it will upsert existing documents
 * without creating duplicates.
 */

const path = require("path");

try {
  require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
} catch { /* dotenv optional */ }

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is required. Set it in nextjs/.env.local");
  process.exit(1);
}

const SQLITE_PATH = path.join(__dirname, "../../backend/src/database/db.sqlite");
const BATCH_SIZE  = 500;

const BOOK_META = {
  gn:    { testament: "VT", group: "Pentateuco",       author: "Moisés" },
  ex:    { testament: "VT", group: "Pentateuco",       author: "Moisés" },
  lv:    { testament: "VT", group: "Pentateuco",       author: "Moisés" },
  nm:    { testament: "VT", group: "Pentateuco",       author: "Moisés" },
  dt:    { testament: "VT", group: "Pentateuco",       author: "Moisés" },
  js:    { testament: "VT", group: "Históricos",       author: "Josué" },
  jz:    { testament: "VT", group: "Históricos",       author: "Desconhecido" },
  rt:    { testament: "VT", group: "Históricos",       author: "Desconhecido" },
  "1sm": { testament: "VT", group: "Históricos",       author: "Samuel / Natã / Gade" },
  "2sm": { testament: "VT", group: "Históricos",       author: "Samuel / Natã / Gade" },
  "1rs": { testament: "VT", group: "Históricos",       author: "Jeremias" },
  "2rs": { testament: "VT", group: "Históricos",       author: "Jeremias" },
  "1cr": { testament: "VT", group: "Históricos",       author: "Esdras" },
  "2cr": { testament: "VT", group: "Históricos",       author: "Esdras" },
  ed:    { testament: "VT", group: "Históricos",       author: "Esdras" },
  ne:    { testament: "VT", group: "Históricos",       author: "Neemias" },
  et:    { testament: "VT", group: "Históricos",       author: "Desconhecido" },
  "jó":  { testament: "VT", group: "Poéticos",         author: "Desconhecido" },
  job:   { testament: "VT", group: "Poéticos",         author: "Desconhecido" },
  sl:    { testament: "VT", group: "Poéticos",         author: "Davi e outros" },
  pv:    { testament: "VT", group: "Poéticos",         author: "Salomão" },
  ec:    { testament: "VT", group: "Poéticos",         author: "Salomão" },
  ct:    { testament: "VT", group: "Poéticos",         author: "Salomão" },
  is:    { testament: "VT", group: "Profetas Maiores", author: "Isaías" },
  jr:    { testament: "VT", group: "Profetas Maiores", author: "Jeremias" },
  lm:    { testament: "VT", group: "Profetas Maiores", author: "Jeremias" },
  ez:    { testament: "VT", group: "Profetas Maiores", author: "Ezequiel" },
  dn:    { testament: "VT", group: "Profetas Maiores", author: "Daniel" },
  os:    { testament: "VT", group: "Profetas Menores", author: "Oséias" },
  jl:    { testament: "VT", group: "Profetas Menores", author: "Joel" },
  am:    { testament: "VT", group: "Profetas Menores", author: "Amós" },
  ob:    { testament: "VT", group: "Profetas Menores", author: "Obadias" },
  jn:    { testament: "VT", group: "Profetas Menores", author: "Jonas" },
  mq:    { testament: "VT", group: "Profetas Menores", author: "Miquéias" },
  na:    { testament: "VT", group: "Profetas Menores", author: "Naum" },
  hc:    { testament: "VT", group: "Profetas Menores", author: "Habacuque" },
  sf:    { testament: "VT", group: "Profetas Menores", author: "Sofonias" },
  ag:    { testament: "VT", group: "Profetas Menores", author: "Ageu" },
  zc:    { testament: "VT", group: "Profetas Menores", author: "Zacarias" },
  ml:    { testament: "VT", group: "Profetas Menores", author: "Malaquias" },
  mt:    { testament: "NT", group: "Evangelhos",       author: "Mateus" },
  mc:    { testament: "NT", group: "Evangelhos",       author: "Marcos" },
  lc:    { testament: "NT", group: "Evangelhos",       author: "Lucas" },
  jo:    { testament: "NT", group: "Evangelhos",       author: "João" },
  at:    { testament: "NT", group: "Atos",             author: "Lucas" },
  rm:    { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  "1co": { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  "2co": { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  gl:    { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  ef:    { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  fp:    { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  cl:    { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  "1ts": { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  "2ts": { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  "1tm": { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  "2tm": { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  tt:    { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  fm:    { testament: "NT", group: "Cartas Paulinas",  author: "Paulo" },
  hb:    { testament: "NT", group: "Hebreus",          author: "Desconhecido" },
  tg:    { testament: "NT", group: "Cartas Gerais",    author: "Tiago" },
  "1pe": { testament: "NT", group: "Cartas Gerais",    author: "Pedro" },
  "2pe": { testament: "NT", group: "Cartas Gerais",    author: "Pedro" },
  "1jo": { testament: "NT", group: "Cartas Gerais",    author: "João" },
  "2jo": { testament: "NT", group: "Cartas Gerais",    author: "João" },
  "3jo": { testament: "NT", group: "Cartas Gerais",    author: "João" },
  jd:    { testament: "NT", group: "Cartas Gerais",    author: "Judas" },
  ap:    { testament: "NT", group: "Apocalipse",       author: "João" },
};

function parseJsonArray(str) {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function bulkUpsert(Model, ops) {
  if (!ops.length) return { upsertedCount: 0, modifiedCount: 0 };
  const result = await Model.bulkWrite(ops, { ordered: false });
  return result;
}

async function run() {
  let Database;
  try {
    Database = require("better-sqlite3");
  } catch {
    console.error("❌ better-sqlite3 not installed. Run: cd nextjs && npm install better-sqlite3");
    process.exit(1);
  }

  const mongoose = require("mongoose");
  const { Schema, Types } = mongoose;

  // Silence deprecation warnings
  mongoose.set("strictQuery", false);

  const sqliteDb = new Database(SQLITE_PATH, { readonly: true });

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB:", MONGODB_URI.replace(/\/\/[^@]+@/, "//<credentials>@"));

  // ─── Inline Models ────────────────────────────────────────────────────────
  const UserModel = mongoose.models.User || mongoose.model("User", new Schema({
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    username:     { type: String, required: true, trim: true },
    password:     { type: String, required: true },
    passwordType: { type: String, enum: ["md5", "bcrypt"], default: "md5" },
    state:        String,
    belief:       String,
    moderator:    { type: Boolean, default: false },
  }, { timestamps: true }));

  const BookModel = mongoose.models.Book || mongoose.model("Book", new Schema({
    abbrev:    { type: String, required: true, unique: true },
    author:    { type: String, required: true },
    backdrop:  String,
    chapters:  { type: Number, required: true },
    comment:   String,
    group:     { type: String, required: true },
    name:      { type: String, required: true },
    testament: { type: String, required: true },
  }));

  const VerseSchema = new Schema({
    reference:   String,
    abbrev:      { type: String, required: true },
    chapter:     { type: Number, required: true },
    verseNumber: { type: Number, required: true },
    text:        { type: String, required: true },
  });
  VerseSchema.index({ abbrev: 1, chapter: 1, verseNumber: 1 }, { unique: true });
  const VerseModel = mongoose.models.Verse || mongoose.model("Verse", VerseSchema);

  const CommentSchema = new Schema({
    sourceId:      { type: Number },
    verseId:       Schema.Types.ObjectId,
    username:      String,
    onTitle:       { type: Boolean, default: false },
    bookReference: String,
    text:          String,
    tags:          [String],
    reports:       [String],
    likes:         [String],
  }, { timestamps: true });
  CommentSchema.index({ sourceId: 1 }, { unique: true, sparse: true });
  const CommentModel = mongoose.models.Comment || mongoose.model("Comment", CommentSchema);

  const DiscussionSchema = new Schema({
    sourceId:       { type: Number },
    bookAbbrev:     String,
    commentId:      Schema.Types.ObjectId,
    username:       String,
    verseReference: String,
    verseText:      String,
    commentText:    String,
    question:       String,
    answers:        [{ _id: false, name: String, text: String }],
  }, { timestamps: true });
  DiscussionSchema.index({ sourceId: 1 }, { unique: true, sparse: true });
  const DiscussionModel = mongoose.models.Discussion || mongoose.model("Discussion", DiscussionSchema);

  const report = {};

  // =========================================================================
  // 1. Books (66 — small, simple upsert loop is fine)
  // =========================================================================
  const sqliteBooks = sqliteDb.prepare("SELECT * FROM books").all();
  console.log(`\n📚 Migrating ${sqliteBooks.length} books...`);

  const bookOps = sqliteBooks.map((book) => {
    const abbrev = (book.abbrev || "").toLowerCase();
    const meta   = BOOK_META[abbrev] || { testament: "VT", group: "Desconhecido", author: "Desconhecido" };
    return {
      updateOne: {
        filter: { abbrev },
        update: { $set: {
          abbrev,
          name:      book.title || book.name || abbrev,
          chapters:  book.length || book.chapters || 0,
          testament: meta.testament,
          group:     meta.group,
          author:    meta.author,
          backdrop:  book.backdrop || null,
          comment:   book.comment  || null,
        }},
        upsert: true,
      },
    };
  });
  await bulkUpsert(BookModel, bookOps);
  report.books = { sqlite: sqliteBooks.length, migrated: sqliteBooks.length };
  console.log(`   ✅ Done (${sqliteBooks.length} books).`);

  // =========================================================================
  // 2. Users (7 — small)
  // =========================================================================
  const sqliteUsers = sqliteDb.prepare("SELECT * FROM users").all();
  console.log(`\n👤 Migrating ${sqliteUsers.length} users...`);

  const userOps = sqliteUsers
    .filter((u) => u.email)
    .map((u) => ({
      updateOne: {
        filter: { email: u.email.toLowerCase().trim() },
        update: { $set: {
          email:        u.email.toLowerCase().trim(),
          username:     u.username || u.name || u.email.split("@")[0],
          password:     u.password || "",
          passwordType: "md5",
          state:        u.state  || null,
          belief:       u.belief || null,
          moderator:    u.moderator ? true : false,
        }},
        upsert: true,
      },
    }));
  await bulkUpsert(UserModel, userOps);
  report.users = { sqlite: sqliteUsers.length, migrated: userOps.length };
  console.log(`   ✅ Done (${userOps.length} users).`);

  // =========================================================================
  // 3. Verses (30,095) — bulk batches, build SQLite id → ObjectId map
  // =========================================================================
  const sqliteVerses = sqliteDb.prepare("SELECT * FROM verses ORDER BY id").all();
  console.log(`\n📖 Migrating ${sqliteVerses.length} verses (batch size ${BATCH_SIZE})...`);

  // First pass: ensure all verses exist with their canonical filter key.
  // We use ordered:false so each batch is atomic individually.
  let versesDone = 0;
  for (let i = 0; i < sqliteVerses.length; i += BATCH_SIZE) {
    const slice = sqliteVerses.slice(i, i + BATCH_SIZE);
    const ops = slice.map((v) => ({
      updateOne: {
        filter: { abbrev: v.abbrev, chapter: v.chapter, verseNumber: v.verse_number },
        update: { $setOnInsert: {
          reference:   v.reference || null,
          abbrev:      v.abbrev,
          chapter:     v.chapter,
          verseNumber: v.verse_number,
          text:        v.text || "",
        }},
        upsert: true,
      },
    }));
    await bulkUpsert(VerseModel, ops);
    versesDone += slice.length;
    if (versesDone % 5000 === 0 || versesDone === sqliteVerses.length) {
      console.log(`   ... ${versesDone} / ${sqliteVerses.length}`);
    }
  }

  // Second pass: build the SQLite id → MongoDB ObjectId map by reading back all verses.
  console.log("   Building verse ID map...");
  const allMongoVerses = await VerseModel
    .find({}, { _id: 1, abbrev: 1, chapter: 1, verseNumber: 1 })
    .lean();

  const verseKey2id = {};
  for (const v of allMongoVerses) {
    verseKey2id[`${v.abbrev}|${v.chapter}|${v.verseNumber}`] = v._id;
  }

  const verseIdMap = {};
  for (const sv of sqliteVerses) {
    const key = `${sv.abbrev}|${sv.chapter}|${sv.verse_number}`;
    if (verseKey2id[key]) verseIdMap[sv.id] = verseKey2id[key];
  }

  report.verses = { sqlite: sqliteVerses.length, migrated: versesDone };
  console.log(`   ✅ Done (${versesDone} verses, ${Object.keys(verseIdMap).length} mapped).`);

  // =========================================================================
  // 4. Comments (819) — keyed by sourceId
  // =========================================================================
  const sqliteComments = sqliteDb.prepare("SELECT * FROM comments").all();
  console.log(`\n💬 Migrating ${sqliteComments.length} comments...`);

  const commentIdMap   = {};
  let   commentsMigrated = 0;
  let   commentsSkipped  = 0;
  const skippedComments  = [];
  const commentOps     = [];

  for (const c of sqliteComments) {
    const verseObjId = verseIdMap[c.verse_id];
    if (!verseObjId) {
      skippedComments.push({ id: c.id, reason: `verse_id=${c.verse_id} not found` });
      commentsSkipped++;
      continue;
    }
    commentOps.push({
      updateOne: {
        filter: { sourceId: c.id },
        update: {
          $setOnInsert: { createdAt: c.created_at ? new Date(c.created_at) : new Date() },
          $set: {
            sourceId:      c.id,
            verseId:       verseObjId,
            username:      c.username       || "",
            onTitle:       c.on_title       ? true : false,
            bookReference: c.book_reference || "",
            text:          c.text           || "",
            tags:          parseJsonArray(c.tags).map(String),
            reports:       parseJsonArray(c.reports).map(String),
            likes:         parseJsonArray(c.likes).map(String),
          },
        },
        upsert: true,
      },
    });
    commentsMigrated++;
  }

  if (commentOps.length) await bulkUpsert(CommentModel, commentOps);

  // Build SQLite comment id → MongoDB ObjectId map
  const allMongoComments = await CommentModel.find({ sourceId: { $exists: true } }, { _id: 1, sourceId: 1 }).lean();
  for (const mc of allMongoComments) {
    if (mc.sourceId != null) commentIdMap[mc.sourceId] = mc._id;
  }

  report.comments = { sqlite: sqliteComments.length, migrated: commentsMigrated, skipped: commentsSkipped };
  console.log(`   ✅ Done (${commentsMigrated} migrated, ${commentsSkipped} skipped).`);

  // =========================================================================
  // 5. Discussions (0 in SQLite, but migration is ready)
  // =========================================================================
  const sqliteDiscussions = sqliteDb.prepare("SELECT * FROM discussions").all();
  console.log(`\n🗣️  Migrating ${sqliteDiscussions.length} discussions...`);

  let discussionsMigrated = 0;
  const skippedDiscussions = [];
  const discussionOps = [];

  for (const d of sqliteDiscussions) {
    const commentObjId = d.comment_id ? commentIdMap[d.comment_id] || null : null;
    if (d.comment_id && !commentObjId) {
      skippedDiscussions.push({ id: d.id, reason: `comment_id=${d.comment_id} not mapped` });
    }

    const rawAnswers = parseJsonArray(d.answers);
    const answers = rawAnswers.map((a) =>
      typeof a === "object" && a !== null && a.name && a.text
        ? { name: String(a.name), text: String(a.text) }
        : { name: "", text: String(a) }
    );

    discussionOps.push({
      updateOne: {
        filter: { sourceId: d.id },
        update: {
          $setOnInsert: { createdAt: d.created_at ? new Date(d.created_at) : new Date() },
          $set: {
            sourceId:       d.id,
            bookAbbrev:     d.book_abbrev     || "",
            commentId:      commentObjId,
            username:       d.username        || "",
            verseReference: d.verse_reference || "",
            verseText:      d.verse_text      || "",
            commentText:    d.comment_text    || "",
            question:       d.question        || "",
            answers,
          },
        },
        upsert: true,
      },
    });
    discussionsMigrated++;
  }

  if (discussionOps.length) await bulkUpsert(DiscussionModel, discussionOps);

  report.discussions = { sqlite: sqliteDiscussions.length, migrated: discussionsMigrated, skipped: 0 };
  console.log(`   ✅ Done (${discussionsMigrated} migrated).`);

  // =========================================================================
  // 6. Smoke test: sample 5 random verses + 5 random comments and compare
  // =========================================================================
  console.log("\n🔬 Running smoke test (5 verses + 5 comments)...");
  const smokeFailures = [];

  function pickRandom(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (out.length < Math.min(n, copy.length)) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  for (const sv of pickRandom(sqliteVerses, 5)) {
    const mv = await VerseModel.findOne({
      abbrev: sv.abbrev,
      chapter: sv.chapter,
      verseNumber: sv.verse_number,
    }).lean();
    if (!mv) {
      smokeFailures.push(`verse ${sv.abbrev} ${sv.chapter}:${sv.verse_number} missing in Mongo`);
      continue;
    }
    if ((sv.text || "") !== mv.text) {
      smokeFailures.push(`verse ${sv.abbrev} ${sv.chapter}:${sv.verse_number} text mismatch`);
    }
  }

  const sqliteCommentsWithVerse = sqliteComments.filter((c) => verseIdMap[c.verse_id]);
  for (const sc of pickRandom(sqliteCommentsWithVerse, 5)) {
    const mc = await CommentModel.findOne({ sourceId: sc.id }).lean();
    if (!mc) {
      smokeFailures.push(`comment sourceId=${sc.id} missing in Mongo`);
      continue;
    }
    if ((sc.text || "") !== mc.text) {
      smokeFailures.push(`comment sourceId=${sc.id} text mismatch`);
    }
    if ((sc.username || "") !== mc.username) {
      smokeFailures.push(`comment sourceId=${sc.id} username mismatch`);
    }
  }

  if (smokeFailures.length) {
    console.warn(`   ⚠️  Smoke test found ${smokeFailures.length} discrepancies:`);
    for (const f of smokeFailures) console.warn(`      - ${f}`);
  } else {
    console.log("   ✅ Smoke test passed (no discrepancies in sampled records).");
  }

  // =========================================================================
  // 7. Final report
  // =========================================================================
  const [mBooks, mUsers, mVerses, mComments, mDiscussions] = await Promise.all([
    BookModel.countDocuments(),
    UserModel.countDocuments(),
    VerseModel.countDocuments(),
    CommentModel.countDocuments(),
    DiscussionModel.countDocuments(),
  ]);

  const W  = 55;
  const ln = "=".repeat(W);
  console.log(`\n${ln}`);
  console.log("  MIGRATION REPORT");
  console.log(ln);
  console.log(`  ${"Collection".padEnd(14)} ${"SQLite".padStart(8)} ${"→ Mongo".padStart(10)}`);
  console.log("  " + "-".repeat(35));

  const rows = [
    ["books",       report.books.sqlite,       mBooks],
    ["users",       report.users.sqlite,        mUsers],
    ["verses",      report.verses.sqlite,       mVerses],
    ["comments",    report.comments.sqlite,     mComments],
    ["discussions", report.discussions.sqlite,  mDiscussions],
  ];
  for (const [col, sqlite, mongo] of rows) {
    console.log(`  ${col.padEnd(14)} ${String(sqlite).padStart(8)} ${String(mongo).padStart(10)}`);
  }
  console.log(ln);

  if (skippedComments.length || skippedDiscussions.length) {
    console.log("\n  SKIPPED RECORDS");
    console.log("  " + "-".repeat(35));
    if (skippedComments.length) {
      console.log(`  Comments (${skippedComments.length}):`);
      for (const s of skippedComments.slice(0, 50)) {
        console.log(`    - id=${s.id}: ${s.reason}`);
      }
      if (skippedComments.length > 50) {
        console.log(`    ... and ${skippedComments.length - 50} more`);
      }
    }
    if (skippedDiscussions.length) {
      console.log(`  Discussions (${skippedDiscussions.length}):`);
      for (const s of skippedDiscussions.slice(0, 50)) {
        console.log(`    - id=${s.id}: ${s.reason}`);
      }
      if (skippedDiscussions.length > 50) {
        console.log(`    ... and ${skippedDiscussions.length - 50} more`);
      }
    }
    console.log(ln);
  }

  if (smokeFailures.length) {
    console.log("\n  SMOKE TEST DISCREPANCIES");
    console.log("  " + "-".repeat(35));
    for (const f of smokeFailures) {
      console.log(`    - ${f}`);
    }
    console.log(ln);
  }

  sqliteDb.close();
  await mongoose.disconnect();

  if (smokeFailures.length) {
    console.error("\n❌ Migration finished with smoke test discrepancies.\n");
    process.exit(2);
  }

  console.log("\n✅ Migration complete.\n");
}

run().catch((err) => {
  console.error("\n❌ Migration failed:", err.message || err);
  process.exit(1);
});
