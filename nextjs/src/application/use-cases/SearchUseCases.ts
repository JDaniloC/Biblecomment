import { IVerseRepository } from "@/domain/repositories/IVerseRepository";
import { IBookRepository } from "@/domain/repositories/IBookRepository";
import { Verse } from "@/domain/entities/Verse";
import { Book } from "@/domain/entities/Book";

export interface SearchResult {
  verse: Verse;
  book: Book;
}

export class SearchVersesUseCase {
  constructor(
    private readonly verseRepo: IVerseRepository,
    private readonly bookRepo: IBookRepository
  ) {}

  async execute(query: string, limit = 50): Promise<SearchResult[]> {
    const verses = await this.verseRepo.searchByText(query, limit);

    const abbrevs = [...new Set(verses.map((v) => v.abbrev))];
    const books = await Promise.all(abbrevs.map((a) => this.bookRepo.findByAbbrev(a)));
    const bookMap: Record<string, Book> = {};
    for (const b of books) {
      if (b) bookMap[b.abbrev] = b;
    }

    return verses
      .map((verse) => {
        const book = bookMap[verse.abbrev];
        if (!book) return null;
        return { verse, book };
      })
      .filter((r): r is SearchResult => r !== null);
  }
}
