const connection = require("../database/connection");

const PAGE_LENGTH = 5;
const COMMENTS_AMOUNT = 50;

module.exports = {
	async getComments(request, response) {
		const { pages = 1 } = request.query;

		const comments = await connection("comments")
			.orderBy("created_at", "desc")
			.limit(PAGE_LENGTH)
			.offset((pages - 1) * PAGE_LENGTH)
			.select("*");

		return response.json(comments);
	},

	async getDiscussions(request, response) {
		const { pages = 1 } = request.query;

		const discussions = await connection("discussions")
			.orderBy("id", "desc")
			.limit(PAGE_LENGTH)
			.offset((pages - 1) * PAGE_LENGTH)
			.select("*");

		return response.json(discussions);
	},

	async userComments(request, response) {
		const { username } = response.locals.userData;
		const { pages = 1 } = request.query;

		const comments = await connection("comments")
			.where("username", username)
			.limit(COMMENTS_AMOUNT)
			.offset((pages - 1) * COMMENTS_AMOUNT);

		return response.json({
			comments: comments.map((comment) => {
				return {
					...comment,
					tags: JSON.parse(comment.tags),
					likes: JSON.parse(comment.likes),
					reports: JSON.parse(comment.reports),
				};
			}),
		});
	},

	async userFavorites(request, response) {
		const { username } = response.locals.userData;
		const { pages = 1 } = request.query;

		const favorites = await connection.raw(`
            SELECT * 
            FROM json_each(comments.likes), comments
            WHERE json_each.value LIKE "${username}"
            LIMIT ${COMMENTS_AMOUNT}
            OFFSET (${pages} - 1) * ${COMMENTS_AMOUNT}
        `);

		return response.json({ favorites });
	},
};
