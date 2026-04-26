export interface ShareableVerse {
  reference?: string;
  abbrev: string;
  chapter: number;
  verseNumber: number;
  text: string;
}

export function formatVerseReference(verse: ShareableVerse): string {
  if (verse.reference) return verse.reference;
  return `${verse.abbrev.toUpperCase()} ${verse.chapter}:${verse.verseNumber}`;
}

export function formatVerseShareUrl(verse: ShareableVerse, origin: string): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/verses/${verse.abbrev}/${verse.chapter}#${verse.verseNumber}`;
}

export function formatVerseShare(verse: ShareableVerse, origin: string): string {
  const ref = formatVerseReference(verse);
  const url = formatVerseShareUrl(verse, origin);
  const text = verse.text.trim();
  return `${ref} — "${text}"\n${url}`;
}
