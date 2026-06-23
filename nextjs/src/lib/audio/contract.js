// Shared, dependency-free audio contract. CommonJS so the CommonJS generation
// script can require() it and the TS app can import it. Pure functions only.

/**
 * @typedef {Object} VoiceManifest
 * @property {string} voiceId
 * @property {string} label
 * @property {"pt-BR"} lang
 * @property {string} version
 * @property {Record<string, Record<string, {durationMs:number, sizeBytes:number}>>} chapters
 */

function chapterAudioKey(voiceId, abbrev, chapter) {
  return `audio/${voiceId}/${abbrev}/${chapter}.mp3`;
}

function chapterTimingsKey(voiceId, abbrev, chapter) {
  return `audio/${voiceId}/${abbrev}/${chapter}.json`;
}

function manifestKey(voiceId) {
  return `audio/${voiceId}/manifest.json`;
}

/** @returns {VoiceManifest} */
function emptyManifest(voiceId, label, version) {
  return { voiceId, label, lang: "pt-BR", version, chapters: {} };
}

function hasChapter(manifest, abbrev, chapter) {
  return Boolean(manifest.chapters?.[abbrev]?.[String(chapter)]);
}

/** @returns {VoiceManifest} a new manifest with the chapter set */
function mergeManifestChapter(manifest, abbrev, chapter, entry) {
  const chapters = { ...manifest.chapters };
  const book = { ...(chapters[abbrev] ?? {}) };
  book[String(chapter)] = { durationMs: entry.durationMs, sizeBytes: entry.sizeBytes };
  chapters[abbrev] = book;
  return { ...manifest, chapters };
}

/** CBR estimate: kbps == bits per ms, so ms = byteLength*8 / bitrateKbps. */
function durationFromMp3Bytes(byteLength, bitrateKbps) {
  if (!byteLength) return 0;
  return Math.round((byteLength * 8) / bitrateKbps);
}

/**
 * @param {{n:number, durationMs:number}[]} verses in chapter order
 * @param {{voiceId:string, abbrev:string, chapter:number, version:string, gapMs:number}} meta
 * @returns {import("./types").VerseTimings}
 */
function buildChapterTimings(verses, meta) {
  /** @type {Record<string,{startMs:number,endMs:number}>} */
  const out = {};
  let cursor = 0;
  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    const startMs = cursor;
    const endMs = startMs + v.durationMs;
    out[String(v.n)] = { startMs, endMs };
    cursor = endMs + meta.gapMs; // gap added after each verse
  }
  const durationMs = verses.length
    ? out[String(verses[verses.length - 1].n)].endMs
    : 0;
  return {
    voiceId: meta.voiceId,
    abbrev: meta.abbrev,
    chapter: meta.chapter,
    version: meta.version,
    durationMs,
    verses: out,
  };
}

module.exports = {
  chapterAudioKey,
  chapterTimingsKey,
  manifestKey,
  emptyManifest,
  hasChapter,
  mergeManifestChapter,
  durationFromMp3Bytes,
  buildChapterTimings,
};
