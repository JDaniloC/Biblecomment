
exports.up = function(knex) {
  return knex.schema.createTable('books', function(table) {    
    table.string('abbrev').primary();

    table.string('title').notNullable();
    table.integer('length').notNullable();
  })
};

exports.down = function(knex) {
  return knex.schema.dropTable('books');
};
