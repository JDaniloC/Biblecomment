/**
 * Pure helpers for sharing a comment as an image card — parallel to
 * share-verse.ts. No DOM / no Mongoose so it is unit-testable and safe to
 * import from both the client share button and the server OG route.
 */

export interface ShareableComment {
  _id?: string;
  text: string;
  username: string;
  tags?: string[];
  verified?: boolean;
  communitySlug?: string;
  /** Human reference stored on the comment, e.g. "Gênesis 1:1". */
  bookReference?: string;
}

export interface ShareVerseCoords {
  abbrev: string;
  chapter: number;
  verseNumber: number;
  reference?: string;
}

export interface CommentCardProps {
  text: string;
  username: string;
  reference: string;
  tags: string[];
  verified: boolean;
  communitySlug?: string;
  /** Canonical absolute share URL (/c/<id>). */
  url: string;
  /** In-app verse deep link the /c page forwards humans to. */
  verseHref: string;
}

/** Canonical absolute share link for a comment. */
export function formatCommentShareUrl(id: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}/c/${id}`;
}

/** Human reference: stored bookReference wins, else ABBREV chap:verse. */
export function formatCommentReference(
  comment: Pick<ShareableComment, "bookReference">,
  verse?: ShareVerseCoords,
): string {
  if (comment.bookReference) return comment.bookReference;
  if (verse) {
    return verse.reference
      ? verse.reference
      : `${verse.abbrev.toUpperCase()} ${verse.chapter}:${verse.verseNumber}`;
  }
  return "";
}

/** In-app verse hash path (no origin) for client-side forwarding. */
export function verseDeepLinkPath(verse: ShareVerseCoords): string {
  return `/verses/${verse.abbrev}/${verse.chapter}#${verse.verseNumber}`;
}

/**
 * Trim and cap card text. Never exceeds `max` (the ellipsis is counted);
 * text exactly at the boundary is returned untouched (no ellipsis).
 */
export function clampForCard(text: string, max = 280): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/** Formatted, copy-pasteable share text + link. */
export function formatCommentShare(
  parts: { text: string; username: string; reference: string },
  url: string,
): string {
  const ref = parts.reference ? ` (${parts.reference})` : "";
  return `"${parts.text}" — @${parts.username}${ref}\n${url}`;
}

/** Map a resolved comment (+ its verse) to everything the card needs. */
export function commentToCardProps(
  comment: ShareableComment,
  verse: ShareVerseCoords,
  origin: string,
): CommentCardProps {
  return {
    text: clampForCard(comment.text),
    username: comment.username,
    reference: formatCommentReference(comment, verse),
    tags: comment.tags ?? [],
    verified: Boolean(comment.verified),
    communitySlug: comment.communitySlug,
    url: formatCommentShareUrl(comment._id ?? "", origin),
    verseHref: verseDeepLinkPath(verse),
  };
}
