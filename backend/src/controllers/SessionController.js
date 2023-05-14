const connection = require("../database/connection");
const missingBodyParams = require("../utils/missingBodyParams");

const jwt = require("jsonwebtoken");
const md5 = require("md5");

const BAD_REQUEST_STATUS = 400;

function getCommentedChapters(username) {
	return connection("comments")
		.where("username", username)
		.join("verses", "verses.id", "verse_id")
		.distinct("abbrev", "chapter")
		.then((chapters) => {
			return chapters.reduce((prevDict, chapter) => {
				if (typeof prevDict[chapter.abbrev] === "undefined") {
					prevDict[chapter.abbrev] = [];
				}
				prevDict[chapter.abbrev].push(chapter.chapter);
				return prevDict;
			}, {});
		});
}

module.exports = {
	async register(request, response) {
		const { email, name, password } = request.body;

		if (missingBodyParams([email, name, password])) {
			return response.status(BAD_REQUEST_STATUS).json({
				error: "Faltando os campos: email, name, password",
			});
		}

		const exists = await connection("users")
			.where("email", email)
			.orWhere("username", name)
			.first();

		if (!exists) {
			await connection("users").insert({
				email: email.toLowerCase(),
				username: name,
				moderator: false,
				password: md5(password),
			});

			return response.json({ msg: "Usuário criado com sucesso" });
		}

		return response.status(BAD_REQUEST_STATUS).json({
			error: "E-mail ou nome de usuário já cadastrado",
		});
	},

	async login(request, response) {
		const { email, password } = request.body;

		if (missingBodyParams([email, password])) {
			return response.status(BAD_REQUEST_STATUS).json({
				msg: "Faltando os campos: email, password",
			});
		}

		const registeredUser = await connection("users")
			.where("email", email.toLowerCase())
			.first()
			.join("comments", "comments.username", "users.username")
			.select({
				email: "users.email",
				state: "users.state",
				belief: "users.belief",
				password: "users.password",
				username: "users.username",
				moderator: "users.moderator",
				created_at: "users.created_at",
			})
			.count("*", { as: "total_comments" });

		if (!registeredUser) {
			return response
				.status(BAD_REQUEST_STATUS)
				.json({ error: "E-mail não cadastrado" });
		}

		if (registeredUser.password === md5(password)) {
			const commentedChapters = await getCommentedChapters(
				registeredUser.username
			);

			const token = jwt.sign(
				{
					email: registeredUser.email,
					username: registeredUser.username,
					moderator: registeredUser.moderator,
				},
				process.env.SECRET,
				{
					expiresIn: "1d",
				}
			);
			return response.json({
				token,
				email: registeredUser.email,
				state: registeredUser.state,
				belief: registeredUser.belief,
				username: registeredUser.username,
				moderator: registeredUser.moderator,
				created_at: registeredUser.created_at,
				commented_chapters: commentedChapters,
				total_comments: registeredUser.total_comments,
			});
		}
		return response
			.status(BAD_REQUEST_STATUS)
			.json({ error: "Senha incorreta" });
	},

	async show(request, response) {
		const { email } = response.locals.userData;

		const registeredUser = await connection("users")
			.where("email", email)
			.first()
			.join("comments", "comments.username", "users.username")
			.select({
				email: "users.email",
				state: "users.state",
				belief: "users.belief",
				password: "users.password",
				username: "users.username",
				moderator: "users.moderator",
				created_at: "users.created_at",
			})
			.count("*", { as: "total_comments" });

		if (!registeredUser) {
			return response
				.status(BAD_REQUEST_STATUS)
				.json({ error: "Usuário não cadastrado." });
		}

		const commentedChapters = await getCommentedChapters(
			registeredUser.username
		);

		return response.json({
			email: registeredUser.email,
			state: registeredUser.state,
			belief: registeredUser.belief,
			username: registeredUser.username,
			moderator: registeredUser.moderator,
			created_at: registeredUser.created_at,
			commented_chapters: commentedChapters,
			total_comments: registeredUser.total_comments,
		});
	},
};
