import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { Verse } from "@/domain/entities/Verse";

export class GetVerseByIdUseCase {
  constructor(private readonly verseRepo: IVerseRepository) {}

  async execute(id: string): Promise<Verse | null> {
    return this.verseRepo.findById(id);
  }
}

export class GetVerseByReferenceUseCase {
  constructor(private readonly verseRepo: IVerseRepository) {}

  async execute(abbrev: string, chapter: number, verseNumber: number): Promise<Verse | null> {
    return this.verseRepo.findByAbbrevChapterVerse(abbrev, chapter, verseNumber);
  }
}

export class GetVersesByChapterUseCase {
  constructor(private readonly verseRepo: IVerseRepository) {}

  async execute(abbrev: string, chapter: number): Promise<Verse[]> {
    return this.verseRepo.findByAbbrevAndChapter(abbrev, chapter);
  }
}
