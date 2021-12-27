const jwt = require("jsonwebtoken");

module.exports = function verifyToken(request) {
    const token = request.headers.authorization;
    const noData = {
        email: "",
        username: "",
        moderator: false,
    };

    if (!token) return { 
        auth: false, 
        data: noData,
        message: 'UNAUTHORIZED: No token provided.', 
    };
    
    try { 
        const { 
            exp,
            email, 
            username, 
            moderator 
        } = jwt.verify(token, process.env.SECRET);
        
        if (!exp || exp < 0) {
            return { 
                auth: false, 
                data: noData,
                message: 'UNAUTHORIZED: Token expired.', 
            };
        }
        return { 
            data: {
                email, 
                username, 
                moderator
            },
            auth: true, 
            message: 'Authenticated', 
        };
    } catch (error) {
        return { 
            auth: false, 
            data: noData,
            message: 'UNAUTHORIZED: Failed to authenticate token.', 
        };
    }
}