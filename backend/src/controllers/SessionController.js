const connection = require("../database/connection");
const jwt = require("jsonwebtoken");
const md5 = require("md5");

module.exports = {
	async register(request, response) {
		const { email, name, password } = request.body;

		if ((email === null) | (name === null) | (password === null)) {
			return response.json({
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
				password: md5(password),
				token: jwt.sign(email + Date.now().toString(), "SóDeusNaCausa"),
				moderator: false,
			});

			return response.json({ msg: "Usuário criado com sucesso" });
		}

		return response.json({
			error: "E-mail ou nome de usuário já cadastrado",
		});
	},

	async login(request, response) {
		const { email, password } = request.body;

		if ((typeof email === "undefined") | (typeof password === "undefined")) {
			return response.json({
				msg: "Faltando os campos: email, password",
			});
		}

		const registeredUser = await connection("users")
			.where("email", email.toLowerCase()).first()
			.join('comments', 'comments.username', 'users.username')
			.select({
				email: "users.email",
				token: "users.token",
				state: "users.state",
				belief: "users.belief",
				password: "users.password",
				username: "users.username",
				moderator: "users.moderator",
				created_at: "users.created_at",
			})
			.count("*", {as: "total_comments"});
		
		if (!registeredUser) {
			return response.json({ error: "E-mail não cadastrado" });
		}

		if (registeredUser.password === md5(password)) {
			const chaptersCommented = await connection("comments")
				.where("username", registeredUser.username)
				.join("chapters", "chapters.id", "comments.chapter_id")
				.distinct("book_abbrev", "number").then(chapters => {
					return chapters.reduce((prevDict, chapter) => {
						if (prevDict[chapter.book_abbrev] === undefined) {
							prevDict[chapter.book_abbrev] = [];
						}
						prevDict[chapter.book_abbrev].push(chapter.number);
						return prevDict;
					}, {});
				});

			return response.json({
				email: registeredUser.email,
				token: registeredUser.token,
				state: registeredUser.state,
				belief: registeredUser.belief,
				username: registeredUser.username,
				moderator: registeredUser.moderator,
				created_at: registeredUser.created_at,
				chapters_commented: chaptersCommented,
				total_comments: registeredUser.total_comments,
			});
		} 
		return response.json({ error: "Senha incorreta" });
	},

	async show(request, response) {
		const { token } = request.headers;

		if (token === null) {
			return response.json({
				error: "Faltando o campo: token",
			});
		}

		const registeredUser = await connection("users")
			.where("token", token).first()
			.join('comments', 'comments.username', 'users.username')
			.select({
				email: "users.email",
				token: "users.token",
				state: "users.state",
				belief: "users.belief",
				password: "users.password",
				username: "users.username",
				moderator: "users.moderator",
				created_at: "users.created_at",
			})
			.count("*", {as: "total_comments"});
		
		if (!registeredUser) {
			return response.json({ error: "Usuário não cadastrado." });
		}
		
		const chaptersCommented = await connection("comments")
			.where("username", registeredUser.username)
			.join("chapters", "chapters.id", "comments.chapter_id")
			.distinct("book_abbrev", "number").then(chapters => {
				return chapters.reduce((prevDict, chapter) => {
					if (prevDict[chapter.book_abbrev] === undefined) {
						prevDict[chapter.book_abbrev] = [];
					}
					prevDict[chapter.book_abbrev].push(chapter.number);
					return prevDict;
				}, {});
			});

		return response.json({
			email: registeredUser.email,
			token: registeredUser.token,
			state: registeredUser.state,
			belief: registeredUser.belief,
			username: registeredUser.username,
			moderator: registeredUser.moderator,
			created_at: registeredUser.created_at,
			chapters_commented: chaptersCommented,
			total_comments: registeredUser.total_comments,
		});
	},
};
