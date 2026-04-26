/*
 * Initial indexes migration.
 *
 * MongoDB stores documents in camelCase (JavaScript convention).
 * The SQLite→MongoDB migration script maps each snake_case column to camelCase:
 *   SQLite: verse_id   → MongoDB: verseId    (comments.verseId)
 *   SQLite: book_abbrev → MongoDB: bookAbbrev (discussions.bookAbbrev)
 *   SQLite: on_title   → MongoDB: onTitle    (comments.onTitle)
 *   SQLite: book_reference → MongoDB: bookReference (comments.bookReference)
 *   SQLite: verse_number → MongoDB: verseNumber (verses.verseNumber)
 *
 * Indexes target the actual stored field names (camelCase).
 */
module.exports = {
  async up(db) {
    // books
    await db.collection("books").createIndex(
      { abbrev: 1 },
      { unique: true, name: "books_abbrev_unique" }
    );

    // verses — compound index for chapter queries; unique on full reference
    await db.collection("verses").createIndex(
      { abbrev: 1, chapter: 1 },
      { name: "verses_abbrev_chapter" }
    );
    await db.collection("verses").createIndex(
      { abbrev: 1, chapter: 1, verseNumber: 1 },
      { unique: true, name: "verses_abbrev_chapter_verseNumber" }
    );

    // comments — verseId is the migrated SQLite verse_id FK
    await db.collection("comments").createIndex(
      { verseId: 1 },
      { name: "comments_verseId" }          // maps from SQLite: verse_id
    );
    await db.collection("comments").createIndex(
      { username: 1 },
      { name: "comments_username" }
    );
    await db.collection("comments").createIndex(
      { bookReference: 1 },
      { name: "comments_bookReference" }    // maps from SQLite: book_reference
    );

    // discussions — bookAbbrev is the migrated SQLite book_abbrev column
    await db.collection("discussions").createIndex(
      { bookAbbrev: 1 },
      { name: "discussions_bookAbbrev" }    // maps from SQLite: book_abbrev
    );
    await db.collection("discussions").createIndex(
      { commentId: 1 },
      { name: "discussions_commentId" }     // maps from SQLite: comment_id FK
    );

    // users
    await db.collection("users").createIndex(
      { email: 1 },
      { unique: true, name: "users_email_unique" }
    );
    await db.collection("users").createIndex(
      { username: 1 },
      { unique: true, name: "users_username_unique" }
    );
  },

  async down(db) {
    await db.collection("books").dropIndex("books_abbrev_unique").catch(() => {});
    await db.collection("verses").dropIndex("verses_abbrev_chapter").catch(() => {});
    await db.collection("verses").dropIndex("verses_abbrev_chapter_verseNumber").catch(() => {});
    await db.collection("comments").dropIndex("comments_verseId").catch(() => {});
    await db.collection("comments").dropIndex("comments_username").catch(() => {});
    await db.collection("comments").dropIndex("comments_bookReference").catch(() => {});
    await db.collection("discussions").dropIndex("discussions_bookAbbrev").catch(() => {});
    await db.collection("discussions").dropIndex("discussions_commentId").catch(() => {});
    await db.collection("users").dropIndex("users_email_unique").catch(() => {});
    await db.collection("users").dropIndex("users_username_unique").catch(() => {});
  },
};
