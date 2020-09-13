
exports.up = function(knex) {
    return knex.schema.dropTableIfExists('comments')
        .createTable('comments', function(table) {
            table.increments();
            
            table.integer("chapter_id").unsigned();
            table.foreign("chapter_id").references("id").inTable("chapters");
            table.string("name").notNullable();
            table.foreign("name").references("name").inTable("users");
            table.boolean("on_title").notNullable();
            table.string("text").notNullable();
            table.integer("verse").notNullable();
            table.json("tags").notNullable();
            table.json("reports").notNullable();
            table.json("likes").notNullable();
    })
};

exports.down = function(knex) {
    return knex.schema.dropTable('comments')
};
