import type { Metadata } from 'next';

export function buildTitle(segment?: string): Metadata['title'] {
  return segment ? `${segment} · Biblecomment` : 'Biblecomment';
}
