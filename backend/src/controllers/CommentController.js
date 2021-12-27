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
		return response.status(BAD_REQUEST_STATUS)
			.json({ error: "chapter not found" });
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

		return response.status(BAD_REQUEST_STATUS).json({
			error: "chapter number doesn't exists",
		});
	},

	async store(request, response) {
		const { abbrev, number, verse } = request.params;
		const { text, tags, on_title } = request.body;
		const { username } = response.locals.userData;

		if (missingBodyParams([text, tags, on_title])) {
			return response.status(BAD_REQUEST_STATUS).json({
				error: "insufficient body: text, tags, on_title.",
			});
		}

		const chapter = await connection("chapters")
			.where("book_abbrev", abbrev)
			.andWhere("number", number)
			.first()
			.select("id", "book_abbrev", "number");

		if (chapter) {
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
				text,
				verse,
				username,
				on_title,
				created_at,
				chapter_id: chapter.id,
				likes: JSON.stringify([]),
				tags: JSON.stringify(tags),
				reports: JSON.stringify([]),
				book_reference: `${capitalizedBookAbbrev} ${number}:${verse}`,
			});

			return response.json({
				text,
				tags,
				username,
				on_title,
				created_at,
				id: comment[0],
				likes: JSON.stringify([]),
				verse: parseInt(verse, 10),
				reports: JSON.stringify([]),
				book_reference: `${capitalizedBookAbbrev} ${number}:${verse}`,
			});
		}
		return response.status(BAD_REQUEST_STATUS)
			.json({ error: "Chapter/User doesn't exists" });
	},

	async update(request, response) {
		const { id } = request.params;
		const { username } = response.locals.userData;
		let { text, tags, likes, reports } = request.body;

		const comment = await connection("comments").where("id", id).first();

		if (!comment) {
			return response.status(BAD_REQUEST_STATUS)
				.json({ error: "Comment not found" });
		}

		text = typeof text !== "undefined" ? text : comment.text;
		tags = typeof tags !== "undefined" ? JSON.stringify(tags) : comment.tags;
		if (typeof likes !== "undefined") {
			const likeList = JSON.parse(comment.likes);
			if (likeList.indexOf(username) === -1) {
				likeList.push(username);
			}
			likes = JSON.stringify(likeList);
		}
		if (typeof reports !== "undefined") {
			const reportList = JSON.parse(comment.reports);
			reportList.push({
				user: username,
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
	},

	async destroy(request, response) {
		const { id } = request.params;
		const { username, moderator } = response.locals.userData;

		const comment = await connection("comments")
			.where("id", id)
			.first();

		if (comment.username === username || moderator) {
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
