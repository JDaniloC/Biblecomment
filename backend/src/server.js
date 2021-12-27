const express = require("express");
const cors = require("cors");
require('dotenv').config();

const routes = require("./routes");
const app = express();

app.options(
	"*",
	cors({
		origin: [
			"http://localhost:3000",
			"http://biblecomment.net",
			"http://www.biblecomment.net",
			"http://biblecomment.netlify.app",
			"http://www.biblecomment.com.br",
			"http://biblecomment.com.br",
			"https://biblecomment.net",
			"https://biblecomment.netlify.app",
			"https://www.biblecomment.net",
			"https://biblecomment.com.br",
			"https://www.biblecomment.com.br",
		],
		optionsSuccessStatus: 200,
	})
);
app.use(cors());
app.disable("x-powered-by");
app.use(express.json());
app.use(routes);

const defaultPort = 3333;
const port = process.env.PORT || defaultPort;

app.listen(port, () => console.log("HTTP server started on port", port));
