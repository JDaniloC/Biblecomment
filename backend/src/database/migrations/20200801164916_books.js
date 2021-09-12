exports.up = function (knex) {
	return knex.schema
		.dropTableIfExists("books")
		.createTable("books", (table) => {
			table.timestamp("created_at").defaultTo(knex.fn.now());
			table.string("abbrev").primary();

			table.string("title").notNullable();
			table.integer("length").notNullable();
		});
};

exports.down = function (knex) {
	return knex.schema.dropTable("books");
};
