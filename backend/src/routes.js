const express = require('express');

const BookController = require('./controllers/BookController');
const ChapterController = require(
    './controllers/ChapterController');
const CommentController = require(
    './controllers/CommentController');
const UserController = require('./controllers/UserController');

const routes = express.Router();

routes.get("/users/", UserController.getUser);
routes.post("/users/login", UserController.login);
routes.post("/users/register", UserController.register);

routes.get("/books", BookController.index);
routes.get("/books/:abbrev", BookController.show);
routes.post("/books", BookController.store);

routes.get("/books/:abbrev/chapters", ChapterController.index);
routes.get("/books/:abbrev/chapters/:number", ChapterController.show);
routes.post("/books/:abbrev/chapters/:number", ChapterController.store);

routes.get(
    "/books/:abbrev/chapters/:number/comments", 
    CommentController.index);
routes.get(
    "/books/:abbrev/chapters/:number/comments/:verse", 
    CommentController.show);
routes.post(
    "/books/:abbrev/chapters/:number/comments/:verse", 
    CommentController.store);
routes.delete("/comments/:id", CommentController.destroy);

module.exports = routes;