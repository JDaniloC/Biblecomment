
exports.up = function(knex) {
    return knex.schema.createTable('comments', function(table) {
        table.increments();
        
        table.string("chapter_id")
        table.foreign("chapter_id").references("id").inTable("chapter")
        table.string("name")
        table.foreign("name").references("name").inTable("users")
        table.boolean("on_title").notNullable();
        table.string("text").notNullable();
        table.json("tags").notNullable();
        table.integer("verse").notNullable();
    })
};

exports.down = function(knex) {
    return knex.schema.dropTable('comments')
};
