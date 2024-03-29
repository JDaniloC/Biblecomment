const express = require("express");
const verifyToken = require("./utils/verifyToken");

const BookController = require("./controllers/BookController");
const VerseController = require("./controllers/VerseController");
const CommentController = require("./controllers/CommentController");

const UserController = require("./controllers/UserController");
const InfoController = require("./controllers/InfoController");
const SessionController = require("./controllers/SessionController");

const DiscussionController = require("./controllers/DiscussionController");
const SearchController = require("./controllers/SearchController");
const BackupController = require("./controllers/BackupController");

const routes = express.Router();

function Authentication(req, res, next) {
	const { data, auth, message } = verifyToken(req);
	if (!auth) {
		return res.status(401).json({ error: message });
	}
	res.locals.userData = data;
	next();
}

routes.post("/session/login", SessionController.login);
routes.post("/session/register", SessionController.register);
routes.get("/session/", Authentication, SessionController.show);

routes.get("/comments/", InfoController.getComments);
routes.get("/discussions/", InfoController.getDiscussions);
routes.get("/users/comments", Authentication, InfoController.userComments);
routes.get("/users/favorites", Authentication, InfoController.userFavorites);

routes.get("/users/", UserController.index);
routes.patch("/users/", Authentication, UserController.update);
routes.delete("/users/", Authentication, UserController.delete);

routes.get("/books", BookController.index);
routes.post("/books", BookController.store);
routes.get("/books/:abbrev", BookController.show);

routes.get("/books/:abbrev/verses", VerseController.index);
routes.get("/books/:abbrev/verses/:chapter", VerseController.show);
routes.post("/books/:abbrev/verses/:chapter/:verse", VerseController.store);
routes.patch("/books/:abbrev/verses/:chapter/:verse", VerseController.update);

routes.get("/comments/:abbrev/:chapter", CommentController.index);
routes.get("/comments/:abbrev/:chapter/:verse", CommentController.show);
routes.post("/comments/:verseID", Authentication, CommentController.store);
routes.patch("/comments/:id", Authentication, CommentController.update);
routes.delete("/comments/:id", Authentication, CommentController.destroy);

routes.get("/discussion/:abbrev", DiscussionController.index);
routes.get("/discussion/:abbrev/:id", DiscussionController.show);
routes.patch("/discussion/:id", Authentication, DiscussionController.update);
routes.delete("/discussion/:id", Authentication, DiscussionController.delete);
routes.post("/discussion/:abbrev", Authentication, DiscussionController.store);

routes.get("/backup/users", BackupController.saveUsers);
routes.post("/backup/users", BackupController.loadUsers);
routes.get("/backup/comments", BackupController.saveComments);
routes.post("/backup/comments", BackupController.loadComments);
routes.get("/backup/discussions", BackupController.saveDiscussions);
routes.post("/backup/discussions", BackupController.loadDiscussions);

routes.get("/search", SearchController.index);

module.exports = routes;
