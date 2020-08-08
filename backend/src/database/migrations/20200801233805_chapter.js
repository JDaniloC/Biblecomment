
exports.up = function(knex) {
  return knex.schema.createTable('chapters', function(table) {
        table.increments();
        
        table.string('book_abbrev')
        table.foreign('book_abbrev').references('abbrev').inTable('books');
        table.integer('number').notNullable()
        table.json('verses').notNullable();
    })
};

exports.down = function(knex) {
  return knex.schema.dropTable('chapters')
};
