
exports.up = function(knex) {
    return knex.schema.dropTableIfExists('comments')
        .createTable('comments', function(table) {
            table.increments();
            
            table.integer("chapter_id").unsigned();
            table.foreign("chapter_id").references("id").inTable("chapters");
            table.string("username").notNullable();
            table.foreign("username").references("name").inTable("users");

            table.boolean("on_title").notNullable();
            table.string("book_reference").notNullable();
            table.integer("verse").notNullable();
            table.timestamp("created_at").defaultTo(knex.fn.now());
            
            table.text("text").notNullable();
            table.json("tags").notNullable();
            table.json("reports").notNullable();
            table.json("likes").notNullable();
    })
};

exports.down = function(knex) {
    return knex.schema.dropTable('comments')
};
