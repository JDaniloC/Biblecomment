import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { Comment } from "@/domain/entities/Comment";
import { parseBookRef } from "@/lib/parse-book-ref";

export interface ImportableComment {
  bookReference: string;
  text: string;
  tags?: string[];
  onTitle?: boolean;
}

export interface ImportResult {
  imported: number;
  /** Already present (same verse + same text). */
  skipped: number;
  /** Couldn't be created — bad reference, missing verse, or empty text. */
  failed: number;
}

/**
 * Restore a user's own comments from a previous export.
 *
 * Idempotent — re-running with the same file is safe. Dedup key is
 * (verseId, normalized text) scoped to the username, so the user can
 * import after a delete-then-restore without producing twins.
 *
 * Failures (unparseable reference, missing verse, blank text) are
 * counted but never abort the batch — partial imports are explicitly
 * supported so a single corrupt row can't block the rest.
 */
export class ImportUserCommentsUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly verseRepo: IVerseRepository,
  ) {}

  async execute(username: string, items: ImportableComment[]): Promise<ImportResult> {
    if (items.length === 0) return { imported: 0, skipped: 0, failed: 0 };

    const existing = await this.commentRepo.findByUsername(username);
    const seen = new Set(existing.map((c) => `${c.verseId}::${c.text.trim()}`));

    const toCreate: Omit<Comment, "_id" | "createdAt" | "updatedAt">[] = [];
    let skipped = 0;
    let failed = 0;

    for (const item of items) {
      const text = (item.text ?? "").trim();
      if (!text) {
        failed++;
        continue;
      }

      const parsed = parseBookRef(item.bookReference ?? "");
      if (!parsed) {
        failed++;
        continue;
      }

      const verse = await this.verseRepo.findByAbbrevChapterVerse(
        parsed.abbrev,
        parsed.chapter,
        parsed.verse,
      );
      if (!verse?._id) {
        failed++;
        continue;
      }

      const key = `${verse._id}::${text}`;
      if (seen.has(key)) {
        skipped++;
        continue;
      }
      seen.add(key);

      toCreate.push({
        verseId: verse._id,
        username,
        onTitle: item.onTitle ?? false,
        bookReference: verse.reference ?? `${verse.abbrev} ${verse.chapter}:${verse.verseNumber}`,
        text,
        tags: Array.isArray(item.tags) ? item.tags : [],
      });
    }

    const imported = toCreate.length > 0 ? await this.commentRepo.createMany(toCreate) : 0;
    return { imported, skipped, failed };
  }
}
