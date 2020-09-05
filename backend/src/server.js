const express = require('express');
const cors = require('cors');
const routes = require("./routes");
const app = express();

// Code from https://stackoverflow.com/questions/36504768/deploy-the-backend-and-frontend-on-the-same-heroku-app-dyno
const path = require('path')

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../../frontend/build')))

// AFTER defining routes: Anything that doesn't match what's above, send back index.html; (the beginning slash ('/') in the string is important!)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/../../frontend/build/index.html'))
})

app.use(cors());
app.use(express.json());
app.use(routes);

app.listen(3333);