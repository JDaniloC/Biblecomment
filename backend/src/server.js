const express = require('express');
const cors = require('cors');
const routes = require("./routes");
const app = express();

app.use((req, res) => {
    res.header("Access-Control-Allow-Origin", "http://www.biblecomment.net");
    res.header("Access-Control-Allow-Methods", 'GET,PUT,POST,DELETE');
    app.use(cors());
});

app.use(express.json());
app.use(routes);

const port = process.env.PORT || 3333
app.listen(
  port, () => console.log("Server started on port", port));