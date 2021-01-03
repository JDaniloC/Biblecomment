const express = require('express');

const BookController = require(
    './controllers/BookController');
const UserController = require(
    './controllers/UserController');
const SessionController = require(
    './controllers/SessionController');
const ChapterController = require(
    './controllers/ChapterController');
const CommentController = require(
    './controllers/CommentController');
const DiscussionController = require(
    './controllers/DiscussionController');
const InfoController = require(
    './controllers/InfoController');
const BackupController = require(
    './controllers/BackupController');

const routes = express.Router();

routes.get("/session/", SessionController.show);
routes.post("/session/login", SessionController.login);
routes.post("/session/register", SessionController.register);

routes.get("/users/comments", InfoController.userComments);
routes.get("/users/favorites", InfoController.userFavorites);
routes.get("/comments/", InfoController.getComments);
routes.get("/discussions/", InfoController.getDiscussions);

routes.get("/users/", UserController.index);
routes.patch("/users/", UserController.update);
routes.delete("/users/", UserController.delete);

routes.get("/books", BookController.index);
routes.get("/books/:abbrev", BookController.show);
routes.post("/books", BookController.store);

routes.get("/books/:abbrev/chapters", ChapterController.index);
routes.get("/books/:abbrev/chapters/:number", ChapterController.show);
routes.post("/books/:abbrev/chapters/:number", ChapterController.store);
routes.patch("/books/:abbrev/chapters/:number", ChapterController.update);

routes.get("/books/:abbrev/chapters/:number/comments", 
    CommentController.index);
routes.get("/books/:abbrev/chapters/:number/comments/:verse", 
    CommentController.show);
routes.post("/books/:abbrev/chapters/:number/comments/:verse", 
    CommentController.store);
routes.patch("/comments/:id", CommentController.update);
routes.delete("/comments/:id", CommentController.destroy);

routes.get("/discussion/:abbrev", DiscussionController.index);
routes.get("/discussion/:abbrev/:id", DiscussionController.show);
routes.post("/discussion/:abbrev", DiscussionController.store);
routes.patch("/discussion/:id", DiscussionController.update);
routes.delete("/discussion/:id", DiscussionController.delete);

routes.get("/backup/users", BackupController.saveUsers);
routes.get("/backup/comments", BackupController.saveComments);
routes.get("/backup/discussions", BackupController.saveDiscussions);
routes.post("/backup/users", BackupController.loadUsers);
routes.post("/backup/comments", BackupController.loadComments);
routes.post("/backup/discussions", BackupController.loadDiscussions);

module.exports = routes;