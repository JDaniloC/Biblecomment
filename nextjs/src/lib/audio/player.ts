// Pure, DOM-free helpers for the in-app audio player. Tested in Vitest (node env).
import { chapterAudioKey, chapterTimingsKey, manifestKey, hasChapter } from "./contract.js";
import type { VoiceManifest, VerseTimings } from "./types";

export function mediaBaseUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_AUDIO_BASE_URL;
  return base ? base.replace(/\/+$/, "") : null;
}

export function chapterAudioUrl(base: string, voiceId: string, abbrev: string, chapter: number): string {
  return `${base}/${chapterAudioKey(voiceId, abbrev, chapter)}`;
}

export function chapterTimingsUrl(base: string, voiceId: string, abbrev: string, chapter: number): string {
  return `${base}/${chapterTimingsKey(voiceId, abbrev, chapter)}`;
}

export function manifestUrl(base: string, voiceId: string): string {
  return `${base}/${manifestKey(voiceId)}`;
}

export function isChapterAvailable(
  manifest: VoiceManifest | null,
  abbrev: string,
  chapter: number,
): boolean {
  return !!manifest && hasChapter(manifest, abbrev, chapter);
}

/**
 * The verse whose [startMs, endMs) contains `ms`. During an inter-verse gap the
 * just-finished verse stays highlighted; past the end the last verse is kept.
 * Returns null only for empty timings.
 */
export function verseAtTime(timings: VerseTimings, ms: number): number | null {
  const nums = Object.keys(timings.verses)
    .map(Number)
    .sort((a, b) => a - b);
  if (nums.length === 0) return null;
  let fallback: number | null = null;
  for (const n of nums) {
    const span = timings.verses[String(n)];
    if (ms >= span.startMs && ms < span.endMs) return n;
    if (ms >= span.endMs) fallback = n; // already past this verse (gap or end)
    if (ms < span.startMs) break; // before this verse → stop; fallback holds the previous one
  }
  return fallback;
}

export function nextChapterWithin(
  manifest: VoiceManifest | null,
  abbrev: string,
  chapter: number,
): number | null {
  if (!manifest) return null;
  const next = chapter + 1;
  return hasChapter(manifest, abbrev, next) ? next : null;
}
