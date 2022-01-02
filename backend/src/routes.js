const express = require("express");
const verifyToken = require("./utils/verifyToken");

const BookController = require("./controllers/BookController");
const UserController = require("./controllers/UserController");
const SessionController = require("./controllers/SessionController");
const ChapterController = require("./controllers/ChapterController");
const CommentController = require("./controllers/CommentController");
const DiscussionController = require("./controllers/DiscussionController");
const InfoController = require("./controllers/InfoController");
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

routes.get("/books/:abbrev/chapters", ChapterController.index);
routes.get("/books/:abbrev/chapters/:number", ChapterController.show);
routes.post("/books/:abbrev/chapters/:number", ChapterController.store);
routes.patch("/books/:abbrev/chapters/:number", ChapterController.update);

routes.get("/books/:abbrev/chapters/:number/comments", CommentController.index);
routes.get(
	"/books/:abbrev/chapters/:number/comments/:verse",
	CommentController.show
);
routes.post(
	"/books/:abbrev/chapters/:number/comments/:verse",
	Authentication,
	CommentController.store
);
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

module.exports = routes;
