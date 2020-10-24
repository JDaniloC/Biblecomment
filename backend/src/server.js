const express = require('express');
const cors = require('cors');
const routes = require("./routes");
const app = express();

app.use(cors({
  origin: 'http://www.biblecomment.net',
  optionsSuccessStatus: 200 
}));
app.use(express.json());
app.use(routes);

const port = process.env.PORT || 3333
app.listen(
  port, () => console.log("Server started on port", port));