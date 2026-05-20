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
 *
 * Default is 1000 — matches the platform's effective comment cap. The
 * card font auto-shrinks via [[pickCardFontSize]] so longer text still
 * fits without mid-word "decorrer d…" cutoffs.
 */
export function clampForCard(text: string, max = 1000): string {
	const trimmed = text.trim();
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Pick a body font size for the share card based on how much text it has
 * to render. Tiered (not continuous) so the rendered card stays visually
 * stable across small length deltas — two cards in the same tier look
 * the same. Calibrated against the square card body area (~904×584 px
 * inside 88px padding); `wide` shaves ~25% to fit the 1200×630 OG box.
 *
 * Exposed (and tested) separately so the card component stays a pure
 * presentation file — no math hidden in the JSX.
 */
export function pickCardFontSize(
	length: number,
	format: "square" | "wide" = "square",
): number {
	const wide = format === "wide";
	// Tier boundaries are in characters; the rightmost tier handles the
	// 1000-char cap from `clampForCard`.
	if (length <= 200) return wide ? 40 : 52;
	if (length <= 320) return wide ? 34 : 44;
	if (length <= 480) return wide ? 28 : 36;
	if (length <= 700) return wide ? 24 : 30;
	return wide ? 20 : 26;
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
