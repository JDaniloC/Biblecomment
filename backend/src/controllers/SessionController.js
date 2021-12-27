const connection = require("../database/connection");
const missingBodyParams = require("../utils/missingBodyParams");

const jwt = require("jsonwebtoken");
const md5 = require("md5");

module.exports = {
	async register(request, response) {
		const { email, name, password } = request.body;

		if (missingBodyParams([email, name, password])) {
			return response.status(400).json({
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

		return response.status(400).json({
			error: "E-mail ou nome de usuário já cadastrado",
		});
	},

	async login(request, response) {
		const { email, password } = request.body;

		if (missingBodyParams([email, password])) {
			return response.status(400).json({
				msg: "Faltando os campos: email, password",
			});
		}

		const registeredUser = await connection("users")
			.where("email", email.toLowerCase()).first()
			.join('comments', 'comments.username', 'users.username')
			.select({
				email: "users.email",
				state: "users.state",
				belief: "users.belief",
				password: "users.password",
				username: "users.username",
				moderator: "users.moderator",
				created_at: "users.created_at",
			})
			.count("*", {as: "total_comments"});
		
		if (!registeredUser) {
			return response.status(400).json({ error: "E-mail não cadastrado" });
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
			
			const token = jwt.sign({
				email: registeredUser.email, 
				username: registeredUser.username,
				moderator: registeredUser.moderator,
			}, process.env.SECRET, {
				expiresIn: "1d",
			});
			return response.json({
				token,
				email: registeredUser.email,
				state: registeredUser.state,
				belief: registeredUser.belief,
				username: registeredUser.username,
				moderator: registeredUser.moderator,
				created_at: registeredUser.created_at,
				chapters_commented: chaptersCommented,
				total_comments: registeredUser.total_comments,
			});
		} 
		return response.status(400).json({ error: "Senha incorreta" });
	},

	async show(request, response) {
		const { email } = response.locals.userData;
		
		const registeredUser = await connection("users")
			.where("email", email).first()
			.join('comments', 'comments.username', 'users.username')
			.select({
				email: "users.email",
				state: "users.state",
				belief: "users.belief",
				password: "users.password",
				username: "users.username",
				moderator: "users.moderator",
				created_at: "users.created_at",
			})
			.count("*", {as: "total_comments"});
		
		if (!registeredUser) {
			return response.status(400).json({ error: "Usuário não cadastrado." });
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
