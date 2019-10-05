const express = require("express");
const upload = require("./upload");
const streamVideo = require("./stream");
const cors = require("cors");

const server = express();

var corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200
};

server.use(cors(corsOptions));

server.get('/video', streamVideo);

server.post("/upload", upload);

server.listen(8000, () => {
  console.log("Server started!");
});
