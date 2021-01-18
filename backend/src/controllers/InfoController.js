const connection = require("../database/connection");

module.exports = {
    async getComments(request, response) {
        const { pages = 1 } = request.query;

        const comments = await connection('comments')
            .orderBy("created_at", "desc")
            .limit(5)
            .offset((pages - 1) * 5)
            .select("*");

        return response.json( comments ); 
    },

    async getDiscussions(request, response) {
        const { pages = 1 } = request.query;
        
        const discussions = await connection('discussions')
            .orderBy("id", "desc")
            .limit(5)
            .offset((pages - 1) * 5)
            .select("*");

        return response.json( discussions );
    },

    async userComments(request, response) {
        const { name } = request.headers;
        const { pages = 1 } = request.query;

        if (name === undefined) {
            return response.json([]);
        }
        const comments = await connection("comments")
            .where("username", name)
            .limit(50)
            .offset((pages - 1) * 50);

            return response.json({ comments });
    },

    async userFavorites(request, response) {
        const { name } = request.headers;
        const { pages = 1 } = request.query;

        if (name === undefined) {
            return response.json([]);
        }

        const favorites = await connection.raw(`
            SELECT * 
            FROM json_each(comments.likes), comments
            WHERE json_each.value LIKE "${name}"
            LIMIT 5
            OFFSET (${pages} - 1) * 5
        `)

        return response.json({ favorites });
    }
}