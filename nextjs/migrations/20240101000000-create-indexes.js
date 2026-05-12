/*
 * Initial indexes migration.
 *
 * MongoDB stores documents in camelCase (JavaScript convention).
 * Indexes target the stored field names.
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

    // comments
    await db.collection("comments").createIndex(
      { verseId: 1 },
      { name: "comments_verseId" }
    );
    await db.collection("comments").createIndex(
      { username: 1 },
      { name: "comments_username" }
    );
    await db.collection("comments").createIndex(
      { bookReference: 1 },
      { name: "comments_bookReference" }
    );

    // discussions
    await db.collection("discussions").createIndex(
      { bookAbbrev: 1 },
      { name: "discussions_bookAbbrev" }
    );
    await db.collection("discussions").createIndex(
      { commentId: 1 },
      { name: "discussions_commentId" }
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
