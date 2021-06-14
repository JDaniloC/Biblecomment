
exports.up = function (knex) {
  return knex.schema.dropTableIfExists('chapters')
    .createTable('chapters', function (table) {
      table.increments('id')

      table.string('book_abbrev')
      table.foreign('book_abbrev').references('abbrev').inTable('books')
      table.integer('number').notNullable()
      table.json('verses').notNullable()
    })
}

exports.down = function (knex) {
  return knex.schema.dropTable('chapters')
}
