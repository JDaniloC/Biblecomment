const connection = require("../database/connection");
const missingBodyParams = require("../utils/missingBodyParams");

const PAGE_LENGTH = 5;

module.exports = {
	async index(request, response) {
		const { pages = 1 } = request.query;

		const users = await connection("users")
			.orderBy("users.created_at", "desc")
			.limit(PAGE_LENGTH)
			.offset((pages - 1) * PAGE_LENGTH)
			.join("comments", "comments.username", "users.username")
			.select({
				email: "users.email",
				state: "users.state",
				belief: "users.belief",
				username: "users.username",
				created_at: "users.created_at",
			})
			.count("*", { as: "total_comments" })
			.groupBy("users.username");

		return response.json(users);
	},

	async update(request, response) {
		const { belief, state } = request.body;
		const { email } = response.locals.userData;

		if (missingBodyParams([state, belief])) {
			return response.json({
				error: "insufficient body: state, belief",
			});
		}

		const user = await connection("users")
			.where("email", email)
			.first()
			.update({ belief, state });

		return response.json(user);
	},

	async delete(request, response) {
		const user = response.locals.userData;
		const { email } = request.body;

		if (typeof email === "undefined") {
			return response.json({ msg: "insufficient body: email" });
		}

		if (user.email === email || user.moderator) {
			const deleted = await connection("users")
				.where("email", email.toLowerCase())
				.first();

			await connection("discussions")
				.where("username", deleted.username)
				.delete();

			await connection("comments")
				.where("username", deleted.username)
				.first()
				.delete();

			return response.json(
				await connection("users").where("email", email).first().delete(),
			);
		}
		return response.json({ msg: "Not authorized" });
	},
};
