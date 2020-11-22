const connection = require('../database/connection');
const jwt = require('jsonwebtoken');
const md5 = require('md5')

module.exports = {
    async index(request, response) {
        const { pages = 1 } = request.query;

        const users = await connection('users')
            .limit(5)
            .offset((pages - 1) * 5)
            .select('email', 'name', 'total_comments', 
                'state', 'belief');

        return response.json(users);
    },

    async update(request, response) {
        const { token, belief, state } = request.body;

        if (token === undefined || state === undefined 
            || belief === undefined) {
            return response.json({
                "error": "It's missing the token, state or belief"
            })
        }

        const user = await connection('users')
            .where("token", token)
            .first()
            .update({ belief, state })
        
        return response.json(user);
    },

    async delete(request, response) {
        const { token, email } = request.body;

        if (token === undefined || email === undefined) {
            return response.json({"msg": "insulficient body: token or email"})
        }

        const user = await connection('users')
            .where('token', token)
            .first()
            .select('moderator', 'email')

        if (!user) {
            return response.json({"msg": "User doesn't exists"})
        }

        if (user.email === email | user.moderator) {
            return await connection('users')
                .where('email', email)
                .first()
                .delete();
        } else {
            return response.json({"msg": "Not authorized"})
        }
    }
}