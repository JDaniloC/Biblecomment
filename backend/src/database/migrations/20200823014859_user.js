
exports.up = function(knex) {
    return knex.schema.createTable('users', function(table) {
        table.string("email").primary();
        table.string("password").notNullable();
        table.string("name").notNullable();
        table.string("token").notNullable();
    })
};

exports.down = function(knex) {
    return knex.schema.dropTable('users')
};
