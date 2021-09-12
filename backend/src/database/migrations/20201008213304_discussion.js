exports.up = function (knex) {
  return knex.schema
    .dropTableIfExists("discussions")
    .createTable("discussions", (table) => {
      table.increments();

      table.string("book_abbrev");
      table.foreign("book_abbrev").references("abbrev").inTable("books");
      table.integer("comment_id").unsigned();
      table.foreign("comment_id").references("id").inTable("comments");
      table.string("username").notNullable();
      table.foreign("username").references("name").inTable("users");
      table.timestamp("created_at").defaultTo(knex.fn.now());

      table.string("verse_reference").notNullable();
      table.string("verse_text").notNullable();
      table.string("comment_text").notNullable();

      table.string("question").notNullable();
      table.json("answers").notNullable();
    });
};

exports.down = function (knex) {
  return knex.schema.dropTable("discussions");
};
