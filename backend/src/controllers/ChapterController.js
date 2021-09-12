const connection = require("../database/connection");

const PAGE_LENGTH = 5;

module.exports = {
	async index(request, response) {
		const { pages = 1 } = request.query;

		const chapters = await connection("chapters")
			.limit(PAGE_LENGTH)
			.offset((pages - 1) * PAGE_LENGTH)
			.select("number", "verses");

		return response.json(chapters);
	},

	async store(request, response) {
		const { abbrev, number } = request.params;
		const { verses } = request.body;

		if (!verses) {
			return response.json({ error: "insufficient body: verses" });
		}

		const book = await connection("books").where("abbrev", abbrev).first();

		if (book) {
			await connection("chapters")
				.where("book_abbrev", abbrev)
				.andWhere("number", number)
				.delete();

			const chapter = await connection("chapters").insert({
				verses: JSON.stringify(verses),
				book_abbrev: abbrev,
				number,
			});
			return response.json(chapter);
		}
		return response.json({ error: "this books doesn't exists" });
	},

	async show(request, response) {
		const { abbrev, number } = request.params;

		const chapter = await connection("chapters")
			.where("book_abbrev", abbrev)
			.andWhere("number", number)
			.first()
			.join("books", "book_abbrev", "=", "abbrev")
			.select(
				"books.abbrev",
				"books.title",
				"chapters.number",
				"chapters.verses"
			);

		return response.json(
			chapter
				? chapter
				: {
						error: "this book doesn't exists",
				  }
		);
	},

	async update(request, response) {
		const { abbrev, number } = request.params;
		const { verses } = request.body;

		if (!verses) {
			return response.json({ error: "insufficient body: verses" });
		}

		const book = await connection("books").where("abbrev", abbrev).first();

		if (book) {
			await connection("chapters")
				.where("book_abbrev", abbrev)
				.andWhere("number", number)
				.update({
					verses: JSON.stringify(verses),
				});

			return response.json(verses);
		}
		return response.json({ error: "this books doesn't exists" });
	},
};
