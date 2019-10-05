//HREF: https://medium.com/better-programming/video-stream-with-node-js-and-html5-320b3191a6b6
const fs = require('fs');
const path = require('path');

module.exports = function streamVideo(req, res){
  const filepath = path.join(__dirname, "./uploads/video.mp4");
  const stat = fs.statSync(filepath);
  const fileSize = stat.size;

  const range = req.headers.range
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize-1
    const chunksize = (end-start)+1
    const file = fs.createReadStream(filepath, {start, end})
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head)
    fs.createReadStream(filepath).pipe(res)
  }
};
