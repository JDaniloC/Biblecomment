const connection = require("../database/connection");
const parseBookAbbrev = require("../utils/parseBookAbbrev");

const PAGE_LENGTH = 5;
const BAD_REQUEST_STATUS = 400;

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
		const { abbrev, chapter } = request.params;
		const { verses } = request.body;

		if (typeof verses === "undefined") {
			return response.status(BAD_REQUEST_STATUS).json({
				error: "insufficient body: verses",
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
				.delete();

			const bookAbbrev = parseBookAbbrev(abbrev);
			const chapterList = [];
			verses.forEach(async (verse, index) => {
				const verseNumber = index + 1;
				const newChapter = {
					abbrev,
					chapter,
					text: verse,
					verse_number: verseNumber,
					reference: `${bookAbbrev} ${chapter}:${verseNumber}`,
				};
				await connection("verses").insert(newChapter);
				chapterList.push(newChapter);
			});

			return response.json(chapterList);
		}
		return response.status(BAD_REQUEST_STATUS).json({
			error: "this books doesn't exists.",
		});
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

		if (chapter) {
			return response.json(chapter);
		}
		return response.json({ error: "this book doesn't exists" });
	},

	async update(request, response) {
		const { abbrev, chapter } = request.params;
		const { verses } = request.body;

		if (typeof verses === "undefined") {
			return response.status(BAD_REQUEST_STATUS).json({
				error: "insufficient body: verses.",
			});
		}

		const book = await connection("books")
			.where("abbrev", abbrev)
			.andWhere("length", ">=", chapter)
			.first();

		if (book) {
			const chapterList = [];
			verses.forEach(async (verse, index) => {
				const verseNumber = index + 1;
				const newChapter = {
					abbrev,
					chapter,
					text: verse,
					verse_number: verseNumber,
				};
				await connection("verses")
					.where("abbrev", abbrev)
					.andWhere("chapter", chapter)
					.andWhere("verse_number", verseNumber)
					.update({
						text: verse,
					});
				chapterList.push(newChapter);
			});
			return response.json(chapterList);
		}
		return response.status(BAD_REQUEST_STATUS).json({
			error: "this book doesn't exists",
		});
	},
};
