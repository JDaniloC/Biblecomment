
exports.up = function(knex) {
    return knex.schema.createTable('users', function(table) {
        table.string("email").primary();
        table.string("password").notNullable();
        table.string("name").notNullable();
        table.string("token").notNullable();
        table.integer("total_comments").notNullable();
        table.json('chapters_commented').notNullable();
    })
};

exports.down = function(knex) {
    return knex.schema.dropTable('users')
};
