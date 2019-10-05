const IncomingForm = require("formidable").IncomingForm;
const path = require('path');
const fs = require('fs');

module.exports = function upload(req, res) {
  var form = new IncomingForm();

  form.on("file", (field, file) => {
      const tempPath = file.path;
      const targetPath = path.join(__dirname, "./uploads/video.mp4");
      fs.rename(tempPath, targetPath, err => {
        if (err) {
          return handleError(err, res);
        }
        res.status(200).send();
      });
  });
  form.on("end", () => {
    res.json();
  });
  form.parse(req);
};
