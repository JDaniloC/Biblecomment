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

export class CreateVerseUseCase {
  constructor(private readonly verseRepo: IVerseRepository) {}

  async execute(input: Omit<Verse, "_id">): Promise<Verse> {
    const existing = await this.verseRepo.findByAbbrevChapterVerse(
      input.abbrev,
      input.chapter,
      input.verseNumber,
    );
    if (existing) throw new Error("Verse already exists");
    return this.verseRepo.create(input);
  }
}

export class UpdateVerseUseCase {
  constructor(private readonly verseRepo: IVerseRepository) {}

  async execute(id: string, data: Partial<Pick<Verse, "text" | "reference">>): Promise<Verse> {
    const updated = await this.verseRepo.update(id, data);
    if (!updated) throw new Error("Verse not found");
    return updated;
  }
}
