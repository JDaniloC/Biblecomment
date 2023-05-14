const connection = require("../database/connection");
const parseComments = require("../utils/parseComments");
const missingBodyParams = require("../utils/missingBodyParams");

const UNAUTHORIZED_STATUS = 401;
const BAD_REQUEST_STATUS = 400;

module.exports = {
	async index(request, response) {
		const { abbrev, chapter } = request.params;

		const verses = await connection("verses")
			.where("chapter", chapter)
			.andWhere("abbrev", abbrev)
			.select("id");

		const titleComments = [];
		const verseComments = [];
		for (const verse of verses) {
			const comments = await connection("comments")
				.where("verse_id", verse.id)
				.select("*");

			const {
				titleComments: tComments,
				verseComments: vComments
			} = parseComments(comments)
			titleComments.push(...tComments);
			verseComments.push(...vComments);
		}
		return response.json({ titleComments, verseComments });
	},

	async show(request, response) {
		const { abbrev, chapter, verse } = request.params;

		const verses = await connection("verses")
			.where("chapter", chapter)
			.andWhere("abbrev", abbrev)
			.andWhere("verse_number", verse)	
			.select("id").first();

		if (!verses) {
			return response.status(BAD_REQUEST_STATUS).json({
				error: "comments not found for this verse.",
			});
		}

		const comments = await connection("comments")
			.where("verse_id", verses.id)
			.select("*");

		return response.json(parseComments(comments));
	},

	async store(request, response) {
		const { verseID } = request.params;
		const { text, tags, on_title } = request.body;
		const { username } = response.locals.userData;

		if (missingBodyParams([text, tags, on_title])) {
			return response.status(BAD_REQUEST_STATUS).json({
				error: "insufficient body: text, tags, on_title.",
			});
		}

		const verses = await connection("verses")
			.where("id", verseID)
			.select("abbrev", "chapter", "verse_number").first();

		if (!verses) {
			return response.status(BAD_REQUEST_STATUS).json({
				error: "Verse not found"
			});
		}
		let newBookAbbrev = verses.abbrev.charAt(0).toUpperCase() +
							verses.abbrev.slice(1);
		if (newBookAbbrev === "Job") {
			newBookAbbrev = "Jó";
		}

		const created_at = new Date()
			.toISOString()
			.replace("Z", "")
			.replace("T", " ");

		const chapVers = `${verses.chapter}:${verses.verse_number}`;
		const reference = `${newBookAbbrev} ${chapVers}`
		const newComment = {
			text,
			username,
			on_title,
			created_at,
			book_reference: reference,
			likes: JSON.stringify([]),
			tags: JSON.stringify(tags),
			verse_id: parseInt(verseID),
			reports: JSON.stringify([]),
		};
		const comment = await connection("comments").insert(newComment);

		return response.json({
			...newComment, id: comment[0],
			likes: [], reports: [], tags: []
		});
	},

	async update(request, response) {
		const { id } = request.params;
		const { username } = response.locals.userData;
		const {
			text: newText,
			tags: newTags,
			likes: newLikes,
			reports: newReports,
		} = request.body;

		const comment = await connection("comments").where("id", id).first();

		if (!comment) {
			return response
				.status(BAD_REQUEST_STATUS)
				.json({ error: "Comment not found" });
		}

		let { text, tags, likes, reports } = comment;
		if (typeof newText !== "undefined") {
			text = newText;
		}
		if (typeof newTags !== "undefined") {
			tags = JSON.stringify(newTags);
		}
		if (typeof newLikes !== "undefined") {
			const likeList = JSON.parse(likes);
			if (likeList.indexOf(username) === -1) {
				likeList.push(username);
			}
			likes = JSON.stringify(likeList);
		}
		if (typeof newReports !== "undefined") {
			const reportList = JSON.parse(reports);
			reportList.push({
				user: username,
				msg: newReports,
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
			tags: JSON.parse(tags),
			likes: JSON.parse(likes),
			reports: JSON.parse(reports),
		});
	},

	async destroy(request, response) {
		const { id } = request.params;
		const { username, moderator } = response.locals.userData;

		const comment = await connection("comments").where("id", id).first();

		if (comment.username === username || moderator) {
			await connection("discussions")
				.where("comment_text", comment.text)
				.delete();

			await connection("comments").where("id", id).first().delete();

			return response.json(comment);
		}
		return response.status(UNAUTHORIZED_STATUS).json({
			Unauthorized: "Comentário não correspondente ao usuário"
		});
	},
};
