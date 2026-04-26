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

export class MongoBookRepository implements IBookRepository {
  async findAll(): Promise<Book[]> {
    await connectToDatabase();
    const docs = await BookModel.find({});
    return docs.map(toEntity);
  }

  async findByAbbrev(abbrev: string): Promise<Book | null> {
    await connectToDatabase();
    const doc = await BookModel.findOne({ abbrev });
    return doc ? toEntity(doc) : null;
  }

  async create(book: Pick<Book, "name" | "abbrev" | "chapters">): Promise<Book> {
    await connectToDatabase();
    const doc = await BookModel.create(book);
    return toEntity(doc);
  }
}
