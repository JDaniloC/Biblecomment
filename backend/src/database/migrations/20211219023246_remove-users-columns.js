
exports.up = function(knex) {
    return knex.schema
        .alterTable("users", (table) => {
            table.dropColumn("token");
            table.dropColumn("total_comments");
            table.dropColumn("chapters_commented");
            table.renameColumn("name", "username");
        });
};

exports.down = function(knex) {
    return knex.schema.table("users", (table) => {
            table.integer("total_comments")
                 .defaultTo(0).notNullable();
            table.json("chapters_commented")
                 .defaultTo("[]").notNullable();
            table.string("token")
                 .defaultTo("").notNullable();
            table.renameColumn("username", "name");
        });
};
