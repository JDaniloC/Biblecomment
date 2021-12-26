const connection = require("../database/connection");
const missingBodyParams = require("../utils/missingBodyParams");

const UNAUTHORIZED_STATUS = 401;
const BAD_REQUEST_STATUS = 400;

module.exports = {
	async index(request, response) {
		const { abbrev, number } = request.params;

		const chapter = await connection("chapters")
			.where("book_abbrev", abbrev)
			.andWhere("number", number)
			.first()
			.select("id");

		if (chapter) {
			const comments = await connection("comments")
				.where("chapter_id", chapter.id)
				.select("*");

			return response.json(comments);
		}
		return response.json({ error: "chapter not found" });
	},

	async show(request, response) {
		const { abbrev, number, verse } = request.params;

		const chapter = await connection("chapters")
			.where("book_abbrev", abbrev)
			.andWhere("number", number)
			.first()
			.select("id");

		const comments = await connection("comments")
			.where("chapter_id", chapter.id)
			.andWhere("verse", verse)
			.select("*");

		if (comments) {
			return response.json(comments);
		}

		return response.json({
			error: "chapter number doesn't exists",
		});
	},

	async store(request, response) {
		const { abbrev, number, verse } = request.params;
		const { token, text, tags, on_title } = request.body;

		if (missingBodyParams([token, text, tags, on_title])) {
			return response.json({
				error: "insufficient body: token, text, tags, on_title.",
			});
		}

		const chapter = await connection("chapters")
			.where("book_abbrev", abbrev)
			.andWhere("number", number)
			.first()
			.select("id", "book_abbrev", "number");

		const user = await connection("users")
						.where("token", token)
						.first();
		
		if (chapter && user) {
			const username = user.username;

			let capitalizedBookAbbrev = chapter.book_abbrev
				.charAt(0).toUpperCase() +
				chapter.book_abbrev.slice(1);
			if (capitalizedBookAbbrev === "Job") {
				capitalizedBookAbbrev = "Jó";
			}

			const created_at = new Date()
				.toISOString()
				.replace("Z", "")
				.replace("T", " ");
			
			const comment = await connection("comments").insert({
				username,
				text,
				verse,
				on_title,
				created_at,
				book_reference: `${capitalizedBookAbbrev} ${number}:${verse}`,
				tags: JSON.stringify(tags),
				chapter_id: chapter.id,
				reports: JSON.stringify([]),
				likes: JSON.stringify([]),
			});

			return response.json({
				id: comment[0],
				username,
				text,
				on_title,
				tags,
				verse: parseInt(verse, 10),
				reports: JSON.stringify([]),
				likes: JSON.stringify([]),
				book_reference: `${capitalizedBookAbbrev} ${number}:${verse}`,
				created_at,
			});
		}
		return response.json({ error: "Chapter/User doesn't exists" });
	},

	async update(request, response) {
		const { id } = request.params;
		const { token } = request.body;
		let { text, tags, likes, reports } = request.body;

		if (typeof token === "undefined") {
			return response.json({
				error: "It's missing the token",
			});
		}

		const user = await connection("users")
							.where("token", token)
							.first()
							.select("username");

		if (user) {
			const comment = await connection("comments").where("id", id).first();

			if (!comment) {
				return response.json({ error: "Comment not found" });
			}

			text = typeof text !== "undefined" ? text : comment.text;
			tags = typeof tags !== "undefined" ? JSON.stringify(tags) : comment.tags;
			if (typeof likes !== "undefined") {
				const likeList = JSON.parse(comment.likes);
				if (likeList.indexOf(user.username) === -1) {
					likeList.push(user.username);
				}
				likes = JSON.stringify(likeList);
			}
			if (typeof reports !== "undefined") {
				const reportList = JSON.parse(comment.reports);
				reportList.push({
					user: user.username,
					msg: reports,
				});
				reports = JSON.stringify(reportList);
			}

			await connection("comments").where("id", id).first().update({
				text,
				tags,
				likes,
				reports,
			});

			return response.json({
				text,
				tags,
				likes,
				reports,
			});
		}
		return response.json({ Unauthorized: "Você precisa estar logado" });
	},

	async destroy(request, response) {
		const { id } = request.params;
		const { token } = request.headers;

		if (typeof token === "undefined") {
			return response
				.status(BAD_REQUEST_STATUS)
				.json({ BadRequest: "It's missing the header token" });
		}

		const user = await connection("users")
			.where("token", token)
			.first()
			.select("username", "moderator");

		if (user.length === 0) {
			return response
				.status(UNAUTHORIZED_STATUS)
				.json({ Unauthorized: "Você precisa estar logado" });
		}

		const comment = await connection("comments")
			.where("id", id)
			.first();

		if (comment.username === user.username || user.moderator) {
			await connection("discussions")
				.where("comment_text", comment.text)
				.delete();

			await connection("comments")
				.where("id", id)
				.first()
				.delete();

			return response.json(comment);
		}
		return response
			.status(UNAUTHORIZED_STATUS)
			.json({ Unauthorized: "Comentário não correspondente ao usuário" });
	},
};
