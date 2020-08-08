
exports.up = function(knex) {
    return knex.schema.createTable('comments', function(table) {
        table.increments();
        
        table.string("chapter_id")
        table.foreign("chapter_id").references("id").inTable("chapter")
        table.boolean("on_title").notNullable();
        table.string("name").notNullable();
        table.string("text").notNullable();
        table.json("tags").notNullable();
    })
};

exports.down = function(knex) {
    return knex.schema.dropTable('comments')
};
