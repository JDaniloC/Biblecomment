const connection = require("../database/connection");

module.exports = {
    async getComments(request, response) {
        const { pages = 1 } = request.query;

        const comments = await connection('comments')
            .orderBy("created_at", "desc")
            .limit(5)
            .offset((pages - 1) * 5)
            .select("name", "book_reference", "id",
                "text", "likes", "reports");

        return response.json( comments ); 
    },

    async getDiscussions(request, response) {
        const { pages = 1 } = request.query;
        
        const discussions = await connection('discussions')
            .orderBy("id", "desc")
            .limit(5)
            .offset((pages - 1) * 5)
            .select("user_name", "question", "verse_reference",
                "comment_text", "verse_text", "id");

        return response.json( discussions );
    },

    async userComments(request, response) {
        const { name } = request.headers;
        const { pages = 1 } = request.query;
        
        if (name === undefined) {
            return response.json([]);
        }
        const result = await connection("comments")
            .where("name", name)

        if (!(result)) {
            return response.json([]);
        }
        return response.json(result);
    },

    async userFavorites(request, response) {
        const { name } = request.headers;
        if (name === undefined) {
            return response.json([]);
        }
        let comments = [];
        let favorites = [];
        await connection("comments")
            .where("likes", "!=", "[]")
            .orWhere("name", name).then(function(data) {
                data.forEach(element => {
                    if (element.name == name) {
                        comments.push(element)
                    }
                    const find = true ? JSON.parse(
                        element.likes
                    ).indexOf(name) !== -1 : false
                    if (find) {
                        favorites.push(element)
                    }
                });
            })
        
        return response.json({
            comments, favorites
        })
    }
}