exports.up = function (knex) {
	return knex.schema
		.dropTableIfExists("users")
		.createTable("users", (table) => {
			table.string("email").primary();
			table.string("password").notNullable();
			table.string("name").notNullable().unique();
			table.string("token").notNullable();
			table.integer("total_comments").notNullable();
			table.json("chapters_commented").notNullable();

			table.timestamp("created_at").defaultTo(knex.fn.now());
			table.string("state");
			table.string("belief");
			table.boolean("moderator");
		});
};

exports.down = function (knex) {
	return knex.schema.dropTable("users");
};
