const connection = require("../database/connection");
const { destroy } = require("../database/connection");

module.exports = {
    async index(request, response) {
        const { abbrev, number } = request.params;
        const { pages = 1 } = request.query;

        const chapter = await connection('chapters')
            .where("book_abbrev", abbrev)
            .andWhere("number", number)
            .first()
            .select("id")

        const comments = await connection('comments')
            .where("chapter_id", chapter.id)
            .limit(5)
            .offset((pages - 1) * 5)
            .select("*");

        return response.json( comments );
    },

    async store(request, response) {
        const { abbrev, number, on_title } = request.params;
        const { name, text, tags } = request.body;
        
        if (!name | !text | !tags) {
            response.json(
                { "error": "insuficient body: name, text, tags" }
            )
        }

        const chapter = await connection('chapters')
            .where("book_abbrev", abbrev)
            .andWhere("number", number)
            .first()
            .select("id")

        if (chapter) {
            
            const comment = await connection('comments')
                .insert({
                    name,
                    text,
                    on_title,
                    tags: JSON.stringify(tags),
                    chapter_id: chapter.id
                })
            
            return response.json(comment);
        } else {
            return response.json({ "error": "Chapter doesn't exists" })
        }
    },

    async destroy(request, response) {
        const { id } = request.params;

        const comment = await connection("comments")
            .where("id", id)
            .delete()
        
        if (comment) {
            return response.json(comment)
        } else {
            return response.json({ "message": "Id not found" })
        }
    }
}