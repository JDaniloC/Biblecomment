// Canonical data contract consumed by the in-app player (Plan 2).
// The generation pipeline writes data conforming to these shapes.

export interface VoiceManifest {
  voiceId: string;
  label: string;
  lang: "pt-BR";
  version: string;
  /** Each verse also has its own MP3 (verseAudioKey), so one verse can play alone. */
  verseAudio?: boolean;
  /** chapters[abbrev][chapterNumberAsString] */
  chapters: Record<string, Record<string, { durationMs: number; sizeBytes: number }>>;
}

export interface VerseTimings {
  voiceId: string;
  abbrev: string;
  chapter: number;
  version: string;
  durationMs: number;
  /** verses[verseNumberAsString] = { startMs, endMs } */
  verses: Record<string, { startMs: number; endMs: number }>;
}
