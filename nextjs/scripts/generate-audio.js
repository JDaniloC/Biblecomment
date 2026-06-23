// Pre-generate narrated audio for the whole Bible (one voice) into Cloudflare R2.
// Read-only against the text API; writes only to R2. Resumable via the manifest.
//
// Env: AUDIO_GEN_BASE_URL, AUDIO_VOICE_ID (default pt-BR-AntonioNeural),
//      AUDIO_VOICE_LABEL (default "Antonio"), AUDIO_GAP_MS (default 250),
//      R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
// CLI flags: --book=gn  (limit to one book)   --limit=N  (first N chapters)
const {
  chapterAudioKey,
  chapterTimingsKey,
  manifestKey,
  emptyManifest,
  hasChapter,
  mergeManifestChapter,
  buildChapterTimings,
} = require("../src/lib/audio/contract.js");
const { synthesizeVerse } = require("./audio-edge-tts.js");
const { makeR2Client, putObject, getJson } = require("./audio-r2.js");

const BASE = (process.env.AUDIO_GEN_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
const VOICE_ID = process.env.AUDIO_VOICE_ID || "pt-BR-AntonioNeural";
const VOICE_LABEL = process.env.AUDIO_VOICE_LABEL || "Antonio";
const GAP_MS = Number(process.env.AUDIO_GAP_MS || 250);

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=")[1] : undefined;
}

async function fetchJson(path) {
  // Retry transient text-API failures (e.g. a dev server hiccupping under load)
  // so a single 500 doesn't abort a multi-hour batch. withRetry is hoisted.
  return withRetry(async () => {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
    return res.json();
  }, `GET ${path}`);
}

// Retry a flaky async op with exponential backoff. The free TTS endpoint can
// blip over a multi-hour batch; without this a single hiccup aborts the run.
async function withRetry(fn, label, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        const waitMs = 500 * 2 ** (i - 1); // 0.5s, 1s, 2s
        console.log(`  retry ${label} (attempt ${i}: ${err.message}); waiting ${waitMs}ms`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  throw lastErr;
}

async function generateChapter(client, abbrev, chapter, verses, version) {
  const buffers = [];
  const verseDurations = [];
  for (const v of verses) {
    const { buffer, durationMs } = await withRetry(
      () => synthesizeVerse(v.t, VOICE_ID),
      `${abbrev} ${chapter}:${v.n}`,
    );
    buffers.push(buffer);
    verseDurations.push({ n: v.n, durationMs });
  }
  const audio = Buffer.concat(buffers); // uniform 48kbps mono frames
  const timings = buildChapterTimings(verseDurations, {
    voiceId: VOICE_ID, abbrev, chapter, version, gapMs: GAP_MS,
  });
  await putObject(client, chapterAudioKey(VOICE_ID, abbrev, chapter), audio, "audio/mpeg");
  await putObject(
    client,
    chapterTimingsKey(VOICE_ID, abbrev, chapter),
    JSON.stringify(timings),
    "application/json",
  );
  return { durationMs: timings.durationMs, sizeBytes: audio.length };
}

async function main() {
  const client = makeR2Client();
  const { books, version } = await fetchJson("/api/books");

  // Resume: load remote manifest (or start fresh if version changed).
  const mKey = manifestKey(VOICE_ID);
  let manifest = await getJson(client, mKey);
  if (!manifest || manifest.version !== version) {
    manifest = emptyManifest(VOICE_ID, VOICE_LABEL, version);
  }

  const onlyBook = arg("book");
  const limit = arg("limit") ? Number(arg("limit")) : Infinity;
  let done = 0;

  for (const book of books) {
    if (onlyBook && book.abbrev !== onlyBook) continue;
    const { chapters } = await fetchJson(`/api/books/${book.abbrev}/verses`);
    const chapterNums = Object.keys(chapters)
      .map(Number)
      .sort((a, b) => a - b);
    for (const chapter of chapterNums) {
      if (done >= limit) break;
      if (hasChapter(manifest, book.abbrev, chapter)) {
        console.log(`skip ${book.abbrev} ${chapter} (already in manifest)`);
        continue;
      }
      const verses = chapters[String(chapter)];
      console.log(`gen  ${book.abbrev} ${chapter} (${verses.length} verses)…`);
      const entry = await generateChapter(client, book.abbrev, chapter, verses, version);
      manifest = mergeManifestChapter(manifest, book.abbrev, chapter, entry);
      // Persist manifest after every chapter so a crash is fully resumable.
      await putObject(client, mKey, JSON.stringify(manifest), "application/json");
      done++;
    }
    if (done >= limit) break;
  }
  console.log(`Done. Generated ${done} chapter(s) for ${VOICE_ID}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
