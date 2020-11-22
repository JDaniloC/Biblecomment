const connection = require("../database/connection");

module.exports = {
    async index(request, response) {
        const { abbrev, number } = request.params;
        const { pages = 1 } = request.query;

        const chapter = await connection('chapters')
            .where("book_abbrev", abbrev)
            .andWhere("number", number)
            .first()
            .select("id")

        if (chapter) {
            const comments = await connection('comments')
                .where("chapter_id", chapter.id)
                // .limit(5)
                // .offset((pages - 1) * 5)
                .select("*");
            
            return response.json( comments );
        } else {
            return response.json({ "error": "chapter not found" })
        }    
    },

    async show(request, response) {
        const { abbrev, number, verse } = request.params;

        const chapter = await connection('chapters')
            .where("book_abbrev", abbrev)
            .andWhere("number", number)
            .first()
            .select("id")

        const comments = await connection('comments')
            .where("chapter_id", chapter.id)
            .andWhere("verse", verse)
            .select("*");

        if (comments) {
            return response.json(comments)
        } else {
            return response.json({ 
                "error": "chapter number doesn't exists" 
            })
        }
    },

    async store(request, response) {
        const { abbrev, number, verse } = request.params;
        const { token, text, tags, on_title } = request.body;
        
        if (!token | !text | !tags | on_title == undefined) {
            return response.json({ "error": 
                "insufficient body: token, text, tags, on_title" 
            })
        }
 
        const chapter = await connection('chapters')
            .where("book_abbrev", abbrev)
            .andWhere("number", number)
            .first()
            .select("id", "book_abbrev", "number")
        
        if (chapter) {
            var name = "Visitante";
            const user = await connection('users')
                .where("token", token)
                .first()
            if (user) {
                name = user.name;

                // Add the abbrev to commented chapters array in user
                const new_chapter_commented = JSON.parse(
                    user.chapters_commented)
                if (abbrev in new_chapter_commented) {
                    if (!(number in new_chapter_commented[abbrev])) {
                        new_chapter_commented[abbrev].push(number)
                    }
                } else {
                    new_chapter_commented[abbrev] = [number]
                }
                await connection('users')
                    .where("token", token)
                    .first()
                    .increment("total_comments", 1)
                    .update({
                        "chapters_commented": JSON.stringify(
                            new_chapter_commented)
                })
            }
            
            let book_abbrev = chapter.book_abbrev.charAt(
                0).toUpperCase() + chapter.book_abbrev.slice(1)
            if (book_abbrev === "Job") {
                book_abbrev = "Jó"
            }

            const comment = await connection('comments')
                .insert({
                    name, text, verse, on_title,
                    created_at: new Date().toISOString().replace('Z','').replace('T', ' '),
                    book_reference: `${book_abbrev} ${number}:${verse}`,
                    tags: JSON.stringify(tags),
                    chapter_id: chapter.id,
                    reports: JSON.stringify([]),
                    likes: JSON.stringify([])
                })
            
            return response.json({ 
                id: comment[0], name,
                text, on_title, tags,
                verse: parseInt(verse),
                reports: JSON.stringify([]),
                likes: JSON.stringify([]),
                book_reference: `${book_abbrev} ${number}:${verse}`
            });
        } else {
            return response.json({ "error": "Chapter doesn't exists" })
        }
    },

    async  update(request, response) {
        const { id } = request.params;
        let { token, text, tags, likes, reports } = request.body;
        
        if (token === undefined) {
            return response.json({
                "error": "It's missing the token"
            })
        }

        const user = await connection('users')
            .where("token", token)
            .select('name')

        if (user.length > 0) {
            const comment = await connection('comments')
                .where("id", id)
                .first()
            
            if (!comment) {
                return response.json(
                    {"error": "Comment not found"}
                )
            }

            text = (text !== undefined) ? text : comment.text
            tags = (tags !== undefined) ? JSON.stringify(tags) : comment.tags
            let aux;
            if (likes !== undefined) {
                aux = JSON.parse(comment.likes)
                if (aux.indexOf(user[0].name) === -1) {
                    aux.push(user[0].name)
                }
                likes = JSON.stringify(aux)
            }
            if (reports !== undefined) {
                aux = JSON.parse(comment.reports)
                aux.push({
                    "user": user[0].name,
                    "msg": reports
                })
                reports = JSON.stringify(aux)
            }
            
            await connection('comments')
                .where('id', id)
                .first()
                .update({
                    "text": text,
                    "tags": tags,
                    "likes": likes,
                    "reports": reports
                })
            
            return response.json({
                text,
                tags,
                likes,
                reports
            })
        } else {
            return response
                .json({ 'Unauthorized': "Você precisa estar logado" })
        }
    },

    async destroy(request, response) {
        const { id } = request.params;
        const { token } = request.headers;
        console.log(id)
        if (token === undefined) {
            return response
                .json({ 'BadRequest': "It's missing the header token" })
        }

        const user = await connection('users')
            .where("token", token)
            .first()
            .select('name', "moderator")

        if (user.length === 0) {
            return response
                .json({ 'Unauthorized': "Você precisa estar logado" })
        }

        const comment = await connection("comments")
            .where("id", id)
            .first()
        
        if (comment.name === user.name || user.moderator) {
            await connection("comments")
                .where("id", id)
                .first()
                .delete()

            await connection('users')
                .where("name", comment.name)
                .first()
                .decrement("total_comments", 1)
            return response.json(comment)
        } else {
            return response.json(
                { "message": "Comentário não correspondente ao usuário" })
        }
    }
}