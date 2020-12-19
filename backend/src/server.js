const express = require('express');
const cors = require('cors');
const routes = require("./routes");
const app = express();

app.options('*', cors({
  origin: [
    'http://localhost:3000', 
    'http://biblecomment.net', 
    'http://www.biblecomment.net',
    'http://biblecomment.netlify.app',
    'https://biblecomment.net', 
    'https://biblecomment.netlify.app',
    'https://www.biblecomment.net'],
  optionsSuccessStatus: 200 
}))
app.use(cors());
app.use(express.json());
app.use(routes);

const port = process.env.PORT || 3333

app.listen(port, 
  () => console.log("HTTP server started on port", port));
