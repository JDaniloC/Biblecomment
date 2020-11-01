const express = require('express');
const cors = require('cors');
const routes = require("./routes");
const app = express();

app.options('*', cors({
  origin: ['http://www.biblecomment.net', 'http://localhost:3000'],
  optionsSuccessStatus: 200 
}))
app.use(cors());
app.use(express.json());
app.use(routes);

const port = process.env.PORT || 3333
app.listen(
  port, () => console.log("Server started on port", port));