const ObjectDetector = require("./ObjectDetector").ObjectDetector;

const express = require("express");
const upload = require("./upload");
const streamVideo = require("./stream");
const cors = require("cors");
const bodyParser = require('body-parser')


const server = express();
server.use(bodyParser.json());
server.use(bodyParser.json({limit: '50mb'}));
const objectDetect = new ObjectDetector();

var corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200
};

server.use(cors(corsOptions));

server.get('/video', streamVideo);

server.post("/upload", upload);

server.post('/detect_objects', async (req, res)=>{

  const data = req.body.data;

  const results = await objectDetect.process(data);
  res.json(results);
});

server.listen(8000, () => {
  console.log("Server started!");
});
