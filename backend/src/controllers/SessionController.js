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

		var exists = await connection("users")
			.where("email", email)
			.orWhere("name", name)
			.first();

		if (!exists) {
			await connection("users").insert({
				email: email.toLowerCase(),
				name,
				password: md5(password),
				token: jwt.sign(email + Date.now().toString(), "SóDeusNaCausa"),
				total_comments: 0,
				chapters_commented: JSON.stringify({}),
				moderator: false,
			});

			return response.json({ msg: "Usuário criado com sucesso" });
		} else {
			return response.json({
				error: "E-mail ou nome de usuário já cadastrado",
			});
		}
	},

	async login(request, response) {
		const { email, password } = request.body;

		if ((typeof email === "undefined") | (typeof password === "undefined")) {
			return response.json({
				msg: "Faltando os campos: email, password",
			});
		}

		const user = await connection("users")
			.where("email", email.toLowerCase())
			.first();

		return (user) ? response.json(
			user.password === md5(password) ? user : { error: "Senha incorreta" }
		) : response.json({ error: "E-mail não cadastrado" });
	},

	async show(request, response) {
		const { token } = request.headers;

		if (token === null) {
			return response.json({
				error: "Faltando o campo: token",
			});
		}

		const user = await connection("users").where("token", token).first();

		return response.json(user ? user : { error: "Usuário não cadastrado." });
	},
};
