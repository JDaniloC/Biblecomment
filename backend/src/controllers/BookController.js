const connection = require('../database/connection');

module.exports = {
    async index(request, response) {
        const { pages = 1 } = request.query;

        const books = await connection('books')
            // .limit(5)
            // .offset((pages - 1) * 5)
            .select([
                'title',
                "abbrev",
                "length"
            ]);

        return response.json( books );
    },

    async store(request, response) {
        const { title, abbrev, length } = request.body
        
        if (title == null | abbrev == null | length == null) {
            return response.json(
                { "error": "insufficient body: title, abbrev, length" })
        }

        var exists = await connection('books')
            .where('abbrev', abbrev)
            .first()

        if (!exists) {
            const book = await connection('books').insert({
                title,
                abbrev,
                length
            })
    
            return response.json(book);
        } else {
            return response.json( exists )
        }
    },

    async show(request, response) {
        const { abbrev } = request.params;

        if (abbrev != null) {
            const book = await connection('books')
            .where("abbrev", abbrev)
            .select('abbrev', "title", "length")
            .join("chapters", "abbrev", "=", "book_abbrev")
            .select("number", "verses");

            return response.json( book );
        } else {
            response.json({ "error": "insuficient params: abbrev" })
        }
    }
}