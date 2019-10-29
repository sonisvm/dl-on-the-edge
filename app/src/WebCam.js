//reference : https://nanonets.com/blog/object-detection-tensorflow-js/
// reference: http://html5doctor.com/video-canvas-magic/

import React, {Component} from 'react';
import "./video/Video.css";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class WebCam extends Component {
  videoRef = React.createRef();
  canvasRef = React.createRef();
  bbCanvasRef = React.createRef();

  constructor() {
    super();

    this.state = {
      paused:false
    };
  }

  drawFrame = () => {
    if(!this.state.paused) {
      this.videoRef.current.pause();
      const ctx = this.canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(this.videoRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height);

      this.canvasRef.current.toBlob(blob=>{
        let reader = new FileReader();
        reader.onload = file => {
          fetch("http://localhost:8000/detect_objects", {
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json'
                   },
                   body:JSON.stringify({data:file.target.result})
               })
               .then(res => {
                 return res.json();
               })
               .then(data => {
                 this.showDetections(data);

                 requestAnimationFrame(()=>{
                   if (this.videoRef.current.currentTime < this.videoRef.current.duration) {
                     this.videoRef.current.play();
                   }
                 });
               });
        }

        reader.readAsDataURL(blob);
      }, 'image/jpeg');
    }
  }

  showDetections = predictions => {
    const ctx = this.bbCanvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const font = "24px helvetica";
    ctx.font = font;
    ctx.textBaseline = "top";

    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];
      // Draw the bounding box.
      ctx.strokeStyle = "#2fff00";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
      // Draw the label background.
      ctx.fillStyle = "#2fff00";
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10);
      // draw top left rectangle
      ctx.fillRect(x, y, textWidth + 10, textHeight + 10);
      // draw bottom left rectangle
      ctx.fillRect(x, y + height - textHeight, textWidth + 15, textHeight + 10);

      // Draw the text last to ensure it's on top.
      ctx.fillStyle = "#000000";
      ctx.fillText(prediction.class, x, y);
      ctx.fillText(prediction.score.toFixed(2), x, y + height - textHeight);
    });
  };

  componentDidMount() {
      if (navigator.mediaDevices.getUserMedia) {
        // define a Promise that'll be used to load the webcam and read its frames
        navigator.mediaDevices
          .getUserMedia({
            video: true,
            audio: false,
          })
          .then(stream => {
            // pass the current frame to the window.stream
            window.stream = stream;
            // pass the stream to the videoRef
            this.videoRef.current = document.createElement('video');
            this.videoRef.current.srcObject = stream;
            this.videoRef.current.onplay = this.drawFrame;
            this.videoRef.current.muted = true;

            this.videoRef.current.onloadedmetadata = () => {
              this.videoRef.current.play();
            };

          }, (error) => {
            console.log("Couldn't start the webcam")
            console.error(error)
          });


      }
  }
  render() {
    return (
      <Row>
        <Col>
          <canvas ref={this.canvasRef} width="720" height="500"/>
          <canvas ref={this.bbCanvasRef} width="720" height="500"/>
        </Col>

      </Row>
    );
  }
}

export default WebCam;
