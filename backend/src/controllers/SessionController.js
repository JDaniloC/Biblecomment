const connection = require('../database/connection');
const jwt = require('jsonwebtoken');
const md5 = require('md5')

module.exports = {
    async register(request, response) {
        const { email, name, password } = request.body;

        if (email == null | name == null | password == null) {
            return response.json({"error": 
                "insufficient body: email, name, password"})
        }
        
        var exists = await connection('users')
            .where('email', email)
            .orWhere('name', name)
            .first()

        if (!exists) {
            await connection('users').insert({
                email,
                name,
                password: md5(password),
                token: jwt.sign(email + Date.now().toString(), "SóDeusNaCausa"),
                total_comments: 0,
                chapters_commented: JSON.stringify({}),
                moderator: false
            })
            
            return response.json(
                { "msg": "Usuário criado com sucesso" })
        } else {
            return response.json({"error": 
                "E-mail ou nome de usuário já cadastrado" })
        }
    },

    async login(request, response) {
        const { email, password } = request.body
        
        if (email === undefined | password === undefined) {
            return response.json({"msg": 
                "insulficient body: email, password"})
        }

        const user = await connection('users')
            .where('email', email)
            .first()
        
        if (user) {
            if (user.password === md5(password)) {
                return response.json(user)
            } else {
                return response.json({"msg":
                    "Senha incorreta"})
            }
        } else {
            return response.json({"msg": 
                "E-mail não cadastrado"})
        }
    },

    async show(request, response) {
        const { token } = request.headers;

        if (token == null) {
            return response.json({
                "error": "insufficient body: token"
            })
        }

        const user = await connection('users')
            .where("token", token)
            .first()

        if (user) {
            return response.json(user)
        } else {
            return response.json({
                "msg": "Usuário não cadastrado"
            })
        }
    }
}