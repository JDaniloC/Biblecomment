import { IUserChapterReadRepository } from "@/domain/repositories/IUserChapterReadRepository";

export class MarkChapterReadUseCase {
  constructor(private readonly repo: IUserChapterReadRepository) {}

  /**
   * Idempotently mark (userId, abbrev, chapter) as read.
   * Returns true when this call inserted a new mark, false if it was already there.
   * The boolean lets the caller know whether to re-evaluate badges.
   */
  async execute(userId: string, abbrev: string, chapter: number): Promise<boolean> {
    if (chapter < 1) throw new Error("chapter must be >= 1");
    return this.repo.markRead(userId, abbrev, chapter);
  }
}

export class UnmarkChapterReadUseCase {
  constructor(private readonly repo: IUserChapterReadRepository) {}

  async execute(userId: string, abbrev: string, chapter: number): Promise<void> {
    if (chapter < 1) throw new Error("chapter must be >= 1");
    return this.repo.unmarkRead(userId, abbrev, chapter);
  }
}

export class GetReadChaptersForBookUseCase {
  constructor(private readonly repo: IUserChapterReadRepository) {}

  async execute(userId: string, abbrev: string): Promise<number[]> {
    return this.repo.findChaptersForBook(userId, abbrev);
  }
}
