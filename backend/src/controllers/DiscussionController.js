const connection = require("../database/connection");
const missingBodyParams = require("../utils/missingBodyParams");

const BAD_REQUEST_STATUS = 400;
const PAGE_LENGTH = 5;

module.exports = {
	async index(request, response) {
		const { abbrev: oldAbbrev } = request.params;
		const { pages = 1 } = request.query;

		const abbrev = oldAbbrev.toLocaleLowerCase();
		const book = await connection("books").where("abbrev", abbrev).first();

		if (book) {
			const discussions = await connection("discussions")
				.where("book_abbrev", abbrev)
				.limit(PAGE_LENGTH)
				.offset((pages - 1) * PAGE_LENGTH)
				.select("*");

			return response.json(discussions);
		}
		return response.json([]);
	},

	async show(request, response) {
		const { id } = request.params;
		const { abbrev: oldAbbrev } = request.params;

		const abbrev = oldAbbrev.toLocaleLowerCase();
		const book = await connection("books").where("abbrev", abbrev).first();

		if (book) {
			const discussion = await connection("discussions")
				.where("book_abbrev", abbrev)
				.andWhere("comment_id", id)
				.select("*");

			return response.json(discussion);
		}
		return response.json([]);
	},

	async store(request, response) {
		const { username } = response.locals.userData;
		const { abbrev: oldAbbrev } = request.params;
		const abbrev = oldAbbrev.toLocaleLowerCase();

		const { verse_reference, comment_id, verse_text, question } = request.body;

		if (
			missingBodyParams([verse_reference, comment_id, verse_text, question]) ||
			question === ""
		) {
			return response.status(BAD_REQUEST_STATUS).json({
				error:
					"insufficient body: comment_id, " +
					"verse_reference, verse_text, question",
			});
		}

		const book = await connection("books").where("abbrev", abbrev).first();

		const comment = await connection("comments")
			.where("id", comment_id)
			.first()
			.select("text");

		if (book && comment) {
			const discussion = await connection("discussions").insert({
				question,
				username,
				verse_text,
				comment_id,
				verse_reference,
				book_abbrev: abbrev,
				comment_text: comment.text,
				answers: JSON.stringify([]),
			});

			return response.json({
				username,
				question,
				verse_text,
				verse_reference,
				id: discussion[0],
				comment_text: comment.text,
				answers: JSON.stringify([]),
			});
		}
		return response
			.status(BAD_REQUEST_STATUS)
			.json({ error: "Book/Comment don't exist" });
	},

	async update(request, response) {
		const { username } = response.locals.userData;
		const { text } = request.body;
		const { id } = request.params;

		if (missingBodyParams([text])) {
			return response.json({
				error: "insufficient body: text",
			});
		}

		const discussion = await connection("discussions").where("id", id).first();

		if (!discussion) {
			return response
				.status(BAD_REQUEST_STATUS)
				.json({ error: "Discussion not found" });
		}

		const prevAnswers = JSON.parse(discussion.answers);
		prevAnswers.push({ name: username, text });
		const answers = JSON.stringify(prevAnswers);

		await connection("discussions").where("id", id).first().update({ answers });

		return response.json({
			id,
			text,
			answers,
		});
	},

	async delete(request, response) {
		const { username, moderator } = response.locals.userData;
		const { id } = request.params;

		const discussion = await connection("discussions").where("id", id).first();

		if (!discussion) {
			return response
				.status(BAD_REQUEST_STATUS)
				.json({ error: "Discussion doesn't exists'" });
		}

		if (discussion.username === username || moderator) {
			const deletedDiscussion = await connection("discussions")
				.where("id", id)
				.first()
				.delete();

			return response.json(deletedDiscussion);
		}
		return response
			.status(BAD_REQUEST_STATUS)
			.json({ error: "Not authorized" });
	},
};
