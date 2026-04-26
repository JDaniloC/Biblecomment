import { Book } from "../entities/Book";

export interface IBookRepository {
  findAll(): Promise<Book[]>;
  findByAbbrev(abbrev: string): Promise<Book | null>;
  create(book: Pick<Book, "name" | "abbrev" | "chapters">): Promise<Book>;
}
