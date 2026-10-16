import { ICommentRepository } from "@/domain/repositories/ICommentRepository";
import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { Comment } from "@/domain/entities/Comment";
import { Verse } from "@/domain/entities/Verse";
import { parseBookRef } from "@/lib/parse-book-ref";
import { ImportCommentItemSchema } from "@/lib/schemas";
import {
  EmailNotVerifiedError,
  isActiveAccount,
  isEmailVerified,
} from "@/lib/auth-guards";

export interface ImportResult {
  imported: number;
  /** Already present (same verse + same text). */
  skipped: number;
  /**
   * Couldn't be created: malformed row, over a per-row limit (text, tags,
   * reference), bad reference, missing verse, or empty text.
   */
  failed: number;
}

/**
 * Restore a user's own comments from a previous export.
 *
 * Gate: the account is read fresh by id, so a disabled or deleting account
 * (whose session may still be cached elsewhere) is refused with
 * "Unauthorized", and an unverified one with EmailNotVerifiedError, the
 * same order CreateCommentUseCase checks them in. The username comes from
 * that record, never from the session claim, so a rename is honoured.
 *
 * Idempotent — re-running with the same file is safe. Dedup key is
 * (verseId, normalized text) scoped to the username, so the user can
 * import after a delete-then-restore without producing twins.
 *
 * The input is untrusted: each row is validated on its own with the same
 * limits as comment creation, and a bad row is counted as `failed`
 * instead of aborting the batch — partial imports are explicitly supported
 * so a single corrupt row can't block the rest. Verses are looked up once
 * per chapter. The account is re-checked right before the write, because
 * a deletion or rename can start while the rows are being resolved.
 *
 * Mentions and badges are deliberately not fired: this is a restore of
 * content that already existed, not new activity.
 */
export class ImportUserCommentsUseCase {
  constructor(
    private readonly commentRepo: ICommentRepository,
    private readonly verseRepo: IVerseRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(userId: string, items: readonly unknown[]): Promise<ImportResult> {
    const user = await this.userRepo.findById(userId);
    if (!user || !isActiveAccount(user)) throw new Error("Unauthorized");
    if (!isEmailVerified(user)) throw new EmailNotVerifiedError();
    const username = user.username;

    if (items.length === 0) return { imported: 0, skipped: 0, failed: 0 };

    const existing = await this.commentRepo.findByUsername(username);
    const seen = new Set(existing.map((c) => `${c.verseId}::${c.text.trim()}`));

    // One lookup per distinct chapter instead of one per row.
    const chapters = new Map<string, Promise<Verse[]>>();
    const findVerse = async (abbrev: string, chapter: number, verseNumber: number) => {
      const key = `${abbrev}:${chapter}`;
      let verses = chapters.get(key);
      if (!verses) {
        verses = this.verseRepo.findByAbbrevAndChapter(abbrev, chapter);
        chapters.set(key, verses);
      }
      return (await verses).find((v) => v.verseNumber === verseNumber) ?? null;
    };

    const toCreate: Omit<Comment, "_id" | "createdAt" | "updatedAt">[] = [];
    let skipped = 0;
    let failed = 0;

    for (const raw of items) {
      const row = ImportCommentItemSchema.safeParse(raw);
      if (!row.success) {
        failed++;
        continue;
      }
      const { text, tags, onTitle } = row.data;

      const parsed = parseBookRef(row.data.bookReference);
      if (!parsed) {
        failed++;
        continue;
      }

      const verse = await findVerse(parsed.abbrev, parsed.chapter, parsed.verse);
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
        onTitle: onTitle ?? false,
        bookReference: verse.reference ?? `${verse.abbrev} ${verse.chapter}:${verse.verseNumber}`,
        text,
        tags,
      });
    }

    if (toCreate.length === 0) return { imported: 0, skipped, failed };

    // The loop above can take a while; a deletion, disable or rename that
    // started meanwhile must win, or the rows would escape its cascade.
    const current = await this.userRepo.findById(userId);
    if (!current || !isActiveAccount(current) || current.username !== username) {
      throw new Error("Unauthorized");
    }

    const imported = await this.commentRepo.createMany(toCreate);
    return { imported, skipped, failed };
  }
}
