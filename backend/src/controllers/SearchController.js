const connection = require("../database/connection");

module.exports = {
    async index(request, response) {
        const { text } = request.query;
        
        if (!text) {
            return response.json([]);
        }

        const comments = await connection("comments")
            .whereLike("text",  `%${text}%`)
            .select("*");

        return response.json(comments);
    }
}