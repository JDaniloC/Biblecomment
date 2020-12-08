const connection = require('../database/connection');

module.exports = {
    async saveComments(request, response) {
        return response.json(await connection("comments"));
    },
    async loadComments(request, response) {
        const { comments } = request.body;
        for (const comment of comments) {
            await connection("comments")
                .insert(comment);
        }
        return response.status(201).json({})
    },
    async saveUsers(request, response) {
        return response.json(await connection("users"));
    },
    async loadUsers(request, response) {
        const { users } = request.body;
        for (const user of users) {
            await connection("users")
                .insert(user);
        }
        return response.status(201).json({})
    },
    async saveDiscussions(request, response) {
        return response.json(await connection("discussions"));
    },
    async loadDiscussions(request, response) {
        const { discussions } = request.body;
        for (const discussion of discussions) {
            await connection("discussions")
                .insert(discussion);
        }
        return response.status(201).json({})
    }
}