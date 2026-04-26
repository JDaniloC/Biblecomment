import { IBookRepository } from "@/domain/repositories/IBookRepository";
import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { Book } from "@/domain/entities/Book";
import { Verse } from "@/domain/entities/Verse";

export class GetAllBooksUseCase {
  constructor(private readonly bookRepo: IBookRepository) {}

  async execute(): Promise<Book[]> {
    return this.bookRepo.findAll();
  }
}

export class GetBookByAbbrevUseCase {
  constructor(private readonly bookRepo: IBookRepository) {}

  async execute(abbrev: string): Promise<Book | null> {
    return this.bookRepo.findByAbbrev(abbrev);
  }
}

export class CreateBookUseCase {
  constructor(private readonly bookRepo: IBookRepository) {}

  async execute(name: string, abbrev: string, chapters: number): Promise<Book> {
    const existing = await this.bookRepo.findByAbbrev(abbrev);
    if (existing) return existing;
    return this.bookRepo.create({ name, abbrev, chapters });
  }
}

export class GetVersesByChapterUseCase {
  constructor(private readonly verseRepo: IVerseRepository) {}

  async execute(abbrev: string, chapter: number): Promise<Verse[]> {
    return this.verseRepo.findByAbbrevAndChapter(abbrev, chapter);
  }
}
