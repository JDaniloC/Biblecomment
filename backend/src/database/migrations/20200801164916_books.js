exports.up = function (knex) {
	return knex.schema
		.dropTableIfExists("books")
		.createTable("books", (table) => {
			table.string("abbrev").primary();
			
			table.string("title").notNullable();
			table.integer("length").notNullable();
			table.timestamp("created_at").defaultTo(knex.fn.now());
		});
};

exports.down = function (knex) {
	return knex.schema.dropTable("books");
};
