const connection = require("../database/connection");

const CREATED_STATUS = 201;

module.exports = {
	async saveComments(request, response) {
		return response.json(await connection("comments"));
	},
	loadComments(request, response) {
		const { comments } = request.body;
		for (const comment of comments) {
			connection("comments").insert(comment);
		}
		return response.status(CREATED_STATUS).json({});
	},
	async saveUsers(request, response) {
		return response.json(await connection("users"));
	},
	loadUsers(request, response) {
		const { users } = request.body;
		for (const user of users) {
			connection("users").insert(user);
		}
		return response.status(CREATED_STATUS).json({});
	},
	async saveDiscussions(request, response) {
		return response.json(await connection("discussions"));
	},
	loadDiscussions(request, response) {
		const { discussions } = request.body;
		for (const discussion of discussions) {
			connection("discussions").insert(discussion);
		}
		return response.status(CREATED_STATUS).json({});
	},
};
