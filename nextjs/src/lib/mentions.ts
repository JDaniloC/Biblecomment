const MENTION_REGEX = /(?:^|[^\w@])@([a-zA-Z0-9_-]{2,40})/g;

export function parseMentions(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_REGEX)) {
    found.add(match[1]);
  }
  return Array.from(found);
}
