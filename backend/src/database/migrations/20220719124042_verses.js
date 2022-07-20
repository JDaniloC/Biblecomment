/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTableIfNotExists("verses", (table) => {
    table.increments("id").primary();
    table.string("reference").notNullable();
    table.string("abbrev").notNullable().references("abbrev").inTable("books");
    table.integer("chapter").notNullable();
    table.integer("verse_number").notNullable();
    table.string("text").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
  }).then(async () => {
    const chapters = await knex.select("*").from("chapters");
    for (const chapter of chapters) {
      const verses = JSON.parse(chapter.verses);
      const {
        number: chapterNumber,
        book_abbrev: bookAbbrev
      } = chapter;

      let capitalizedBookAbbrev =
        bookAbbrev.charAt(0).toUpperCase() +
        bookAbbrev.slice(1);
      if (capitalizedBookAbbrev === "Job") {
        capitalizedBookAbbrev = "Jó";
      }
      
      verses.forEach(async (verse, index) => {
        const verseNumber = index + 1;
        await knex.insert({
          text: verse,
          abbrev: bookAbbrev,
          chapter: chapterNumber,
          verse_number: verseNumber,
          reference: `${capitalizedBookAbbrev} ${chapterNumber}:${verseNumber}`,
        }).into("verses");
      });
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists("verses");
};
