const express = require('express');
const cors = require('cors');
const routes = require("./routes");
const app = express();

const fs = require('fs');
const https = require('https');
const key = fs.readFileSync('ssl/selfsigned.key');
const cert = fs.readFileSync('ssl/selfsigned.crt');

const credentials = {key: key, cert: cert};

app.options('*', cors({
  origin: [
    'http://localhost:3000', 
    'http://www.biblecomment.net', 
    'https://www.biblecomment.net'],
  optionsSuccessStatus: 200 
}))
app.use(cors());
app.use(express.json());
app.use(routes);

const port = process.env.PORT || 3333

const httpsServer = https.createServer(credentials, app);
httpsServer.listen(port);
console.log("HTTPS server started on port", port)

// app.listen(3333, 
//   () => console.log("HTTP server started on port", 3333));