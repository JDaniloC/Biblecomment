import { Verse } from "../entities/Verse";

export interface IVerseRepository {
  findByAbbrevAndChapter(abbrev: string, chapter: number): Promise<Verse[]>;
  findById(id: string): Promise<Verse | null>;
  findByAbbrevChapterVerse(abbrev: string, chapter: number, verseNumber: number): Promise<Verse | null>;
  searchByText(query: string, limit?: number): Promise<Verse[]>;
}
