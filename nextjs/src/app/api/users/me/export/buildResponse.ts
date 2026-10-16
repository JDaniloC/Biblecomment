import type { UserDataExport } from "@/domain/dto/UserDataExportDTO";
import { sanitizeUsername } from "@/lib/sanitize-username";

// Pure builders (no Next/next-auth imports) so the headers and filename are
// unit-testable in Vitest's node env — a route file can only export its
// handlers.

/**
 * ASCII-only download name. Legacy usernames are grandfathered (accents,
 * spaces, quotes), and those would break or garble the header.
 */
export function exportFilename(dump: UserDataExport): string {
  const slug = sanitizeUsername(dump.profile.username) || "usuario";
  return `biblecomment-meus-dados-${slug}-${dump.generatedAt.slice(0, 10)}.json`;
}

/**
 * The export as a pretty-printed JSON attachment. Never cached (it holds
 * sensitive data such as belief); `bytes` is the body size, for the log.
 */
export function buildExportResponse(dump: UserDataExport): {
  response: Response;
  bytes: number;
} {
  const body = JSON.stringify(dump, null, 2);
  const response = new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(dump)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
  return { response, bytes: Buffer.byteLength(body, "utf8") };
}

/** Per-section row counts — what the route logs instead of any content. */
export function exportCounts(dump: UserDataExport): Record<string, number> {
  return {
    comments: dump.comments.length,
    ownedDiscussions: dump.ownedDiscussions.length,
    answersAuthored: dump.answersAuthored.length,
    notifications: dump.notifications.length,
    likesGiven:
      dump.likesGiven.comments.length +
      dump.likesGiven.discussions.length +
      dump.likesGiven.answers.length,
    commentReports: dump.commentReports.length,
    communities:
      dump.communities.created.length +
      dump.communities.memberships.length +
      dump.communities.follows.length,
    follows: dump.social.following.length + dump.social.followers.length,
    chaptersRead: dump.reading.chaptersRead.length,
    activeDays: dump.reading.activeDays.length,
    pushSubscriptions: dump.pushSubscriptions.length,
  };
}
