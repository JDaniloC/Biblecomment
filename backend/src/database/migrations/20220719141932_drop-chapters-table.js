/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
	return knex.schema
		.alterTable("comments", (table) => {
			table.integer("verse_id").references("id").inTable("verses");
		})
		.then(async () => {
			const comments = await knex.select("*").from("comments");
			for (const comment of comments) {
				const chapter = await knex
					.select("book_abbrev", "number")
					.from("chapters")
					.where("id", comment.chapter_id)
					.first();

				const verse = await knex
					.select("id")
					.from("verses")
					.where({
						abbrev: chapter.book_abbrev,
						verse_number: comment.verse,
						chapter: chapter.number,
					})
					.first();

				await knex("comments")
					.update({
						verse_id: verse.id,
					})
					.where({
						id: comment.id,
					});
			}
            knex.schema.dropTableIfExists("chapters");
		});
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema
		.createTable("chapters", (table) => {
			table.increments("id");

			table.string("book_abbrev");
			table.foreign("book_abbrev").references("abbrev").inTable("books");
			table.integer("number").notNullable();
			table.json("verses").notNullable();
		}).then(async () => {
			const books = await knex.select("*").from("books");
			for (const book of books) {
				for (let chapter = 1; chapter <= book.length; chapter++) {
					const verses = await knex.select("*").from("verses")
						.where({ abbrev: book.abbrev, chapter }).orderBy("verse_number");
					const versesText = JSON.stringify(verses.map((verse) => verse.text));
					await knex.insert({
						book_abbrev: book.abbrev,
						number: chapter,
						verses: versesText,
					}).into("chapters");
				}
			}
		});
};
