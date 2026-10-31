// Upload one book narrated by a cloned voice (tools/voice-clone, `voice_modal.py::book`)
// to R2, in the layout generate-audio.js uses, plus each verse's own MP3.
// Reads local files and the text API; writes only to R2 (nothing with --dry-run).
//
// Env: AUDIO_VOICE_ID (required, e.g. danilo-clone), AUDIO_VOICE_LABEL (e.g. Danilo),
//      AUDIO_GEN_BASE_URL, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
// CLI flags: --book=gn  --dir=<out folder of ::book>  --dry-run  --force (re-upload chapters
//            already in the manifest)
const fs = require("node:fs");
const path = require("node:path");
const {
  chapterAudioKey,
  chapterTimingsKey,
  verseAudioKey,
  manifestKey,
  emptyManifest,
  hasChapter,
  mergeManifestChapter,
  durationFromMp3Bytes,
  buildChapterTimings,
} = require("../src/lib/audio/contract.js");
const { makeR2Client, putObject, getJson } = require("./audio-r2.js");

const BASE = (process.env.AUDIO_GEN_BASE_URL || "http://localhost:3001").replace(/\/+$/, "");
const VOICE_ID = process.env.AUDIO_VOICE_ID;
const VOICE_LABEL = process.env.AUDIO_VOICE_LABEL || VOICE_ID;
const BITRATE_KBPS = 48; // voice_modal.py MP3_KBPS
const GAP_MS = 0; // the verse files are concatenated with nothing in between
const PARALLEL_PUTS = 8;

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : undefined;
}
const flag = (name) => process.argv.includes(`--${name}`);

async function fetchJson(urlPath) {
  const res = await fetch(`${BASE}${urlPath}`);
  if (!res.ok) throw new Error(`GET ${urlPath} -> ${res.status}`);
  return res.json();
}

async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

// Every verse of the API chapter must have its MP3, and the text it was made from
// (verses.json, written by ::book) must still be the text the site shows.
function checkChapter(dir, chapter, apiVerses, generatedVerses) {
  const problems = [];
  const said = new Map((generatedVerses || []).map((v) => [v.n, v.t]));
  const files = [];
  for (const v of apiVerses) {
    const file = path.join(dir, String(chapter), `${v.n}.mp3`);
    if (!fs.existsSync(file) || fs.statSync(file).size === 0) problems.push(`verse ${v.n}: no audio`);
    else if (said.get(v.n) !== v.t) problems.push(`verse ${v.n}: text changed since the audio was made`);
    files.push({ n: v.n, file });
  }
  return { problems, files };
}

async function main() {
  const book = arg("book");
  const dir = arg("dir");
  const dryRun = flag("dry-run");
  if (!VOICE_ID) throw new Error("Set AUDIO_VOICE_ID (e.g. danilo-clone)");
  if (VOICE_ID === "pt-BR-AntonioNeural") throw new Error("Refusing to write over the Edge voice");
  if (!book || !dir) throw new Error("Usage: --book=gn --dir=<out folder of voice_modal.py::book>");

  const { version } = await fetchJson("/api/books");
  const { chapters } = await fetchJson(`/api/books/${book}/verses`);
  const generated = JSON.parse(fs.readFileSync(path.join(dir, "verses.json"), "utf8"));

  const client = dryRun ? null : makeR2Client();
  const mKey = manifestKey(VOICE_ID);
  let manifest = client ? await getJson(client, mKey) : null;
  if (!manifest || manifest.version !== version) manifest = emptyManifest(VOICE_ID, VOICE_LABEL, version);
  // Every chapter this script uploads carries its verse files: the app may play one alone.
  manifest = { ...manifest, verseAudio: true };

  const chapterNums = Object.keys(chapters).map(Number).sort((a, b) => a - b);
  let uploaded = 0;
  let refused = 0;
  for (const chapter of chapterNums) {
    if (hasChapter(manifest, book, chapter) && !flag("force")) {
      console.log(`skip ${book} ${chapter} (already in manifest)`);
      continue;
    }
    const { problems, files } = checkChapter(dir, chapter, chapters[String(chapter)], generated[String(chapter)]);
    if (problems.length) {
      refused++;
      console.log(`REFUSED ${book} ${chapter}: ${problems.join("; ")}`);
      continue;
    }
    const buffers = files.map((f) => fs.readFileSync(f.file));
    const audio = Buffer.concat(buffers); // uniform 48 kbps mono frames, no ID3/Xing
    const timings = buildChapterTimings(
      files.map((f, i) => ({ n: f.n, durationMs: durationFromMp3Bytes(buffers[i].length, BITRATE_KBPS) })),
      { voiceId: VOICE_ID, abbrev: book, chapter, version, gapMs: GAP_MS },
    );
    const puts = [
      ...files.map((f, i) => [verseAudioKey(VOICE_ID, book, chapter, f.n), buffers[i], "audio/mpeg"]),
      [chapterAudioKey(VOICE_ID, book, chapter), audio, "audio/mpeg"],
      [chapterTimingsKey(VOICE_ID, book, chapter), JSON.stringify(timings), "application/json"],
    ];
    const seconds = (timings.durationMs / 1000).toFixed(1);
    if (dryRun) {
      console.log(`ok   ${book} ${chapter}: ${files.length} verses, ${seconds} s, ${puts.length} objects (dry run)`);
    } else {
      await inBatches(puts, PARALLEL_PUTS, ([key, body, type]) => putObject(client, key, body, type));
      manifest = mergeManifestChapter(manifest, book, chapter, { durationMs: timings.durationMs, sizeBytes: audio.length });
      // Persist the manifest after every chapter: the app only offers chapters listed in it.
      await putObject(client, mKey, JSON.stringify(manifest), "application/json");
      console.log(`up   ${book} ${chapter}: ${files.length} verses, ${seconds} s`);
    }
    uploaded++;
  }
  console.log(`${dryRun ? "checked" : "uploaded"} ${uploaded} chapter(s), refused ${refused}, ` +
    `voice ${VOICE_ID} ("${VOICE_LABEL}"), content ${version}`);
  if (refused) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
