const connection = require("../database/connection");

module.exports = {
	async index(request, response) {
		const { pages = 1 } = request.query;

		const users = await connection("users")
			.orderBy("created_at", "desc")
			.limit(5)
			.offset((pages - 1) * 5)
			.select(
				"email",
				"name",
				"total_comments",
				"state",
				"belief",
				"created_at"
			);

		return response.json(users);
	},

	async update(request, response) {
		const { token, belief, state } = request.body;

		if (
			typeof token === "undefined" ||
			typeof state === "undefined" ||
			typeof belief === "undefined"
		) {
			return response.json({
				error: "It's missing the token, state or belief",
			});
		}

		const user = await connection("users")
			.where("token", token)
			.first()
			.update({ belief, state });

		return response.json(user);
	},

	async delete(request, response) {
		const { token, email } = request.body;

		if (typeof token === "undefined" || typeof email === "undefined") {
			return response.json({ msg: "insufficient body: token or email" });
		}

		const user = await connection("users")
			.where("token", token)
			.first()
			.select("moderator", "email", "name");

		if (!user) {
			return response.json({ msg: "User doesn't exists" });
		}

		if ((user.email === email) | user.moderator) {
			const deleted = await connection("users")
				.where("email", email.toLowerCase())
				.first();

			await connection("discussions").where("username", deleted.name).delete();

			await connection("comments")
				.where("username", deleted.name)
				.first()
				.delete();

			return response.json(
				await connection("users").where("email", email).first().delete()
			);
		} else {
			return response.json({ msg: "Not authorized" });
		}
	},
};
