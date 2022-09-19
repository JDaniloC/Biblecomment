/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable("comments", (table) => {
        table.integer("verse_id").references("id").inTable("verses");
    }).then(async () => {
        const comments = await knex.select("*").from("comments");
        for (const comment of comments) {
            const chapter = await knex
                .select("book_abbrev", "number")
                .from("chapters")
                .where("id", comment.chapter_id)
                .first();

            const verse = await knex.select("id").from("verses").where({
                abbrev: chapter.book_abbrev,
                verse_number: comment.verse,
                chapter: chapter.number,
            }).first();
            
            await knex("comments").update({
                verse_id: verse.id,
            }).where({
                id: comment.id,
            });
        }
    });
    // .dropTableIfExists("chapters");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable("comments", (table) => {
        table.dropColumn("verse_id");
    });
};
