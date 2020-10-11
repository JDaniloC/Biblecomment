
exports.up = function(knex) {
  return knex.schema.dropTableIfExists("discussions")
    .createTable("discussions", function(table) {
        table.increments();

        table.integer("book_abbrev").unsigned();
        table.foreign("book_abbrev").references("abbrev").inTable("books");
        table.integer("comment_id").unsigned();
        table.foreign("comment_id").references("id").inTable("comments");
        table.string("user_name").notNullable();
        table.foreign("user_name").references("name").inTable("users");
        table.string("verse_reference").notNullable();
        table.string("verse_text").notNullable();
        table.string("comment_text").notNullable();
        table.string("question").notNullable();
        table.json("answers").notNullable();
    })
};

exports.down = function(knex) {
  return knex.schema.dropTable("discussions");
};
