const connection = require("../database/connection");

module.exports = {
	async index(request, response) {
		let { abbrev } = request.params;
		abbrev = abbrev.toLocaleLowerCase();
		const { pages = 1 } = request.query;

		const book = await connection("books").where("abbrev", abbrev).first();

		if (book) {
			const discussions = await connection("discussions")
				.where("book_abbrev", abbrev)
				.limit(5)
				.offset((pages - 1) * 5)
				.select("*");

			return response.json(discussions);
		} else {
			return response.json([]);
		}
	},

	async show(request, response) {
		let { abbrev, id } = request.params;
		abbrev = abbrev.toLocaleLowerCase();

		const book = await connection("books").where("abbrev", abbrev).first();

		if (book) {
			const discussion = await connection("discussions")
				.where("book_abbrev", abbrev)
				.andWhere("comment_id", id)
				.select("*");

			return response.json(discussion);
		} else {
			return response.json([]);
		}
	},

	async store(request, response) {
		let { abbrev } = request.params;
		abbrev = abbrev.toLocaleLowerCase();
		const { comment_id, verse_reference, verse_text, question, token } =
			request.body;

		if (
			[comment_id, token, verse_reference, verse_text, question].some(
				(element) => typeof element === "undefined"
			) ||
			question === ""
		) {
			return response.json({
				error:
					"insufficient body: comment_id, token, verse_reference, verse_text, question",
			});
		}

		const user = await connection("users")
			.where("token", token)
			.first()
			.select("name");

		if (typeof user === "undefined") {
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
				username: user.name,
				verse_text,
				verse_reference,
				question,
				answers: JSON.stringify([]),
			});

			return response.json({
				id: discussion[0],
				comment_text: comment.text,
				username: user.name,
				verse_text,
				verse_reference,
				question,
				answers: JSON.stringify([]),
			});
		} else {
			return response.json({ error: "Book/Comment don't exist" });
		}
	},

	async update(request, response) {
		const { id } = request.params;
		let { token, text } = request.body;

		if (typeof token === "undefined" || typeof text === "undefined") {
			return response.json({
				error: "It's missing the token",
			});
		}

		const user = await connection("users")
			.where("token", token)
			.first()
			.select("name");

		if (user) {
			const discussion = await connection("discussions")
				.where("id", id)
				.first();

			if (!discussion) {
				return response.json({ error: "Discussion not found" });
			}

			const prevAnswers = JSON.parse(discussion.answers);
			prevAnswers.push({
				name: user.name,
				text: text,
			});
			const answers = JSON.stringify(prevAnswers);

			await connection("discussions").where("id", id).first().update({
				answers,
			});

			return response.json({
				id,
				text,
				answers,
			});
		} else {
			return response.json({ Unauthorized: "Você precisa estar logado" });
		}
	},

	async delete(request, response) {
		const { id } = request.params;
		const { token } = request.body;

		if (typeof token === "undefined") {
			return response.json({ msg: "insulficient body: token" });
		}

		const user = await connection("users")
			.where("token", token)
			.first()
			.select("moderator", "name");

		const discussion = await connection("discussions").where("id", id).first();

		if (!discussion) {
			return response.json({ msg: "Discussion doesn't exists'" });
		}

		if ((discussion.username === user.name) | user.moderator) {
			const deletedDiscussion = await connection("discussions")
				.where("id", id)
				.first()
				.delete();

			return response.json(deletedDiscussion);
		} else {
			return response.json({ msg: "Not authorized" });
		}
	},
};
