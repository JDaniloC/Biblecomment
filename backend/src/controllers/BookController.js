const connection = require("../database/connection");
const missingBodyParams = require("../utils/missingBodyParams");

module.exports = {
	async index(request, response) {
		const books = await connection("books")
			.select("*")
			.orderBy("created_at", "asc");

		return response.json(books);
	},

	async store(request, response) {
		const { title, abbrev, length } = request.body;

		if (missingBodyParams([title, abbrev, length])) {
			return response.json({
				error: "insufficient body: title, abbrev, length.",
			});
		}

		const exists = await connection("books").where("abbrev", abbrev).first();

		if (!exists) {
			const created_at = new Date()
				.toISOString()
				.replace("Z", "")
				.replace("T", " ");

			const book = await connection("books").insert({
				title,
				abbrev,
				length,
				created_at,
			});

			return response.json(book);
		}
		return response.json(exists);
	},

	async show(request, response) {
		const { abbrev } = request.params;

		if (typeof abbrev !== "undefined") {
			const book = await connection("books")
				.where("books.abbrev", abbrev)
				.first()
				.select("books.abbrev", "title", "length")

			return response.json(book);
		}
		return response.json({ error: "insufficient params: abbrev." });
	},
};
