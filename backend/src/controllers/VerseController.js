const connection = require("../database/connection");
const parseBookAbbrev = require("../utils/parseBookAbbrev");

const PAGE_LENGTH = 5;
const BAD_REQUEST_STATUS = 400;

module.exports = {
	async index(request, response) {
		const { pages = 1 } = request.query;

		const verses = await connection("verses")
			.limit(PAGE_LENGTH)
			.offset((pages - 1) * PAGE_LENGTH)
			.orderBy("abbrev", "chapter", "verse_number")
			.select("*");

		return response.json(verses);
	},

	async store(request, response) {
		const { abbrev, chapter, verse } = request.params;
		const { text } = request.body;

		if (typeof text === "undefined") {
			return response.status(BAD_REQUEST_STATUS).json({
				error: "insufficient body: text",
			});
		}

		const book = await connection("books")
			.where("abbrev", abbrev)
			.andWhere("length", ">=", chapter)
			.first();

		if (book) {
			await connection("verses")
				.where("abbrev", abbrev)
				.andWhere("chapter", chapter)
				.andWhere("verse_number", verse)
				.delete();

			const bookAbbrev = parseBookAbbrev(abbrev);
			const newChapter = {
				text,
				abbrev,
				chapter,
				verse_number: verse,
				reference: `${bookAbbrev} ${chapter}:${verse}`,
			};
			await connection("verses").insert(newChapter);

			return response.json(newChapter);
		}
		return response.status(BAD_REQUEST_STATUS).json({
			error: "Chapter doesn't exist in the book",
		});
	},

	async show(request, response) {
		const { abbrev, chapter } = request.params;

		const verseList = await connection("verses")
			.where("abbrev", abbrev)
			.andWhere("chapter", chapter)
			.orderBy("verse_number")
			.select("*");

		if (verseList) {
			return response.json(verseList);
		}
		return response.status(BAD_REQUEST_STATUS).json({
			error: "this chapter doesn't exists",
		});
	},

	async update(request, response) {
		const { abbrev, chapter, verse } = request.params;
		const { text } = request.body;

		if (typeof text === "undefined") {
			return response.status(BAD_REQUEST_STATUS).json({
				error: "insufficient body: verse.",
			});
		}

		const book = await connection("books")
			.where("abbrev", abbrev)
			.andWhere("length", ">=", chapter)
			.first();

		if (book) {
			const newChapter = {
				abbrev,
				chapter,
				text: text,
				verse_number: verse,
			};
			await connection("verses")
				.where("abbrev", abbrev)
				.andWhere("chapter", chapter)
				.andWhere("verse_number", verse)
				.update({ text });
			return response.json(newChapter);
		}
		return response.status(BAD_REQUEST_STATUS).json({
			error: "this book doesn't exists",
		});
	},
};
