import { unstable_cache } from "next/cache";
import { IBookRepository } from "@/domain/repositories/IBookRepository";
import { Book } from "@/domain/entities/Book";
import { BookModel, IBookDocument } from "@/infrastructure/database/models/BookModel";
import { connectToDatabase } from "@/infrastructure/database/connection";

function toEntity(doc: IBookDocument): Book {
  return {
    _id: doc._id?.toString(),
    abbrev: doc.abbrev,
    author: doc.author,
    backdrop: doc.backdrop,
    chapters: doc.chapters,
    comment: doc.comment,
    group: doc.group,
    name: doc.name,
    testament: doc.testament,
  };
}

// Books are seeded once and never mutate at runtime, so we memoize reads
// behind Next's Data Cache. `revalidateTag("books")` from a seed script is
// enough to bust the cache when the corpus is reloaded. Module-scope keeps
// the wrapped function identity stable so the cache actually hits.
const findAllCached = unstable_cache(
  async (): Promise<Book[]> => {
    await connectToDatabase();
    const docs = await BookModel.find({});
    return docs.map(toEntity);
  },
  ["books-findAll"],
  { revalidate: 86400, tags: ["books"] },
);

const findByAbbrevCached = unstable_cache(
  async (abbrev: string): Promise<Book | null> => {
    await connectToDatabase();
    const doc = await BookModel.findOne({ abbrev });
    return doc ? toEntity(doc) : null;
  },
  ["books-findByAbbrev"],
  { revalidate: 86400, tags: ["books"] },
);

export class MongoBookRepository implements IBookRepository {
  async findAll(): Promise<Book[]> {
    return findAllCached();
  }

  async findByAbbrev(abbrev: string): Promise<Book | null> {
    return findByAbbrevCached(abbrev);
  }

  async create(book: Pick<Book, "name" | "abbrev" | "chapters">): Promise<Book> {
    await connectToDatabase();
    const doc = await BookModel.create(book);
    return toEntity(doc);
  }
}
