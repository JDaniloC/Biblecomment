const connection = require("../database/connection");

module.exports = {
	async index(request, response) {
		const books = await connection("books")
			.select("*")
			.orderBy("created_at", "asc");

		return response.json(books);
	},

	async store(request, response) {
		const { title, abbrev, length } = request.body;

		if ((title === null) | (abbrev === null) | (length === null)) {
			return response.json({
				error: "insufficient body: title, abbrev, length",
			});
		}

		const exists = await connection("books").where("abbrev", abbrev).first();

		if (!exists) {
			const book = await connection("books").insert({
				title,
				abbrev,
				length,
				created_at: new Date()
					.toISOString()
					.replace("Z", "")
					.replace("T", " "),
			});

			return response.json(book);
		} else {
			return response.json(exists);
		}
	},

	async show(request, response) {
		const { abbrev } = request.params;

		if (abbrev !== null) {
			const book = await connection("books")
				.where("abbrev", abbrev)
				.select("abbrev", "title", "length")
				.join("chapters", "abbrev", "=", "book_abbrev")
				.select("number", "verses");

			return response.json(book);
		} else {
			response.json({ error: "insuficient params: abbrev" });
		}
	},
};
