const express = require('express');

const BookController = require(
    './controllers/BookController');
const UserController = require(
    './controllers/UserController');
const ChapterController = require(
    './controllers/ChapterController');
const CommentController = require(
    './controllers/CommentController');
const DiscussionController = require(
    './controllers/DiscussionController');

const routes = express.Router();

routes.get("/users/", UserController.getUser);
routes.patch("/users/", UserController.update);
routes.delete("/users/", UserController.delete);
routes.post("/users/login", UserController.login);
routes.post("/users/register", UserController.register);

routes.get("/books", BookController.index);
routes.get("/books/:abbrev", BookController.show);
routes.post("/books", BookController.store);

routes.get("/books/:abbrev/chapters", 
    ChapterController.index);
routes.get("/books/:abbrev/chapters/:number", ChapterController.show);
routes.post("/books/:abbrev/chapters/:number", ChapterController.store);

routes.get(
    "/users/comments", CommentController.user_comments);
routes.get(
    "/users/infos", CommentController.user_infos);
routes.get(
    "/books/:abbrev/chapters/:number/comments", 
    CommentController.index);
routes.get(
    "/books/:abbrev/chapters/:number/comments/:verse", 
    CommentController.show);
routes.post(
    "/books/:abbrev/chapters/:number/comments/:verse", 
    CommentController.store);
routes.patch(
    "/comments/:id", CommentController.update);
routes.delete(
    "/comments/:id", CommentController.destroy);

routes.get(
    "/discussion/:abbrev", DiscussionController.index);
routes.get(
    "/discussion/:abbrev/:id", DiscussionController.show);
routes.post(
    "/discussion/:abbrev", DiscussionController.store);
routes.patch(
    "/discussion/:id", DiscussionController.update);

module.exports = routes;