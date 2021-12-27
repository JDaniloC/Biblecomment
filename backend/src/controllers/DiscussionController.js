const connection = require("../database/connection");
const missingBodyParams = require("../utils/missingBodyParams");

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
		const { abbrev: oldAbbrev } = request.params;
		const abbrev = oldAbbrev.toLocaleLowerCase();
		const { verse_reference, comment_id, verse_text, question, token } =
			request.body;

		if (
			missingBodyParams([
				verse_reference,
				comment_id,
				verse_text,
				question,
				token,
			]) ||
			question === ""
		) {
			return response.json({
				error:
					"insufficient body: comment_id, token, \
						verse_reference, verse_text, question",
			});
		}

		const user = await connection("users")
			.where("token", token)
			.first()
			.select("username");

		if (!user) {
			return response.json({ error: "not authorized" });
		}

		const book = await connection("books").where("abbrev", abbrev).first();

		const comment = await connection("comments")
			.where("id", comment_id)
			.first()
			.select("text");

		if (book && comment) {
			const discussion = await connection("discussions").insert({
				book_abbrev: abbrev,
				comment_id,
				comment_text: comment.text,
				username: user.username,
				verse_text,
				verse_reference,
				question,
				answers: JSON.stringify([]),
			});

			return response.json({
				id: discussion[0],
				comment_text: comment.text,
				username: user.username,
				verse_text,
				verse_reference,
				question,
				answers: JSON.stringify([]),
			});
		}
		return response.json({ error: "Book/Comment don't exist" });
	},

	async update(request, response) {
		const { token, text } = request.body;
		const { id } = request.params;

		if (missingBodyParams([token, text])) {
			return response.json({
				error: "It's missing the token",
			});
		}

		const user = await connection("users")
			.where("token", token)
			.first()
			.select("username");

		if (user) {
			const discussion = await connection("discussions")
				.where("id", id)
				.first();

			if (!discussion) {
				return response.json({ error: "Discussion not found" });
			}

			const prevAnswers = JSON.parse(discussion.answers);
			prevAnswers.push({ name: user.username, text });
			const answers = JSON.stringify(prevAnswers);

			await connection("discussions").where("id", id).first().update({
				answers,
			});

			return response.json({
				id,
				text,
				answers,
			});
		}
		return response.json({ Unauthorized: "Você precisa estar logado" });
	},

	async delete(request, response) {
		const { id } = request.params;
		const { token } = request.body;

		if (typeof token === "undefined") {
			return response.json({ msg: "insufficient body: token" });
		}

		const user = await connection("users")
			.where("token", token)
			.first()
			.select("moderator", "username");

		const discussion = await connection("discussions").where("id", id).first();

		if (!discussion) {
			return response.json({ msg: "Discussion doesn't exists'" });
		}

		if ((discussion.username === user.username) | user.moderator) {
			const deletedDiscussion = await connection("discussions")
				.where("id", id)
				.first()
				.delete();

			return response.json(deletedDiscussion);
		}
		return response.json({ msg: "Not authorized" });
	},
};
