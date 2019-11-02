//reference : https://nanonets.com/blog/object-detection-tensorflow-js/

import React, {Component} from 'react';
import "./Video.css";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

class Video extends Component {
  videoRef = React.createRef();
  canvasRef = React.createRef();
  bbCanvasRef = React.createRef();


  constructor(props) {
    super(props);

    this.paused = false;

  }

  drawFrame = () => {
    if(!this.paused) {
      this.videoRef.current.pause();
      const ctx = this.canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(this.videoRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height);

      this.canvasRef.current.toBlob(blob=>{
        let reader = new FileReader();
        reader.onload = file => {
          fetch("http://10.182.157.59:5000/detect_objects", {
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json'
                   },
                   body:JSON.stringify({
                     image:file.target.result,
                     mode: this.props.execution_mode,
                     models: Array.from(this.props.models)
                   })
               })
               .then(res => {
                 return res.json();
               })
               .then(data => {
                 console.log(data);
                 this.showDetections(data);

                 requestAnimationFrame(()=>{
                   if (this.videoRef.current.currentTime < this.videoRef.current.duration && !this.paused) {
                     this.videoRef.current.play();
                   }
                 });
               });
        }

        reader.readAsDataURL(blob);
      }, 'image/jpeg');
    }
  }

  componentDidMount() {
    this.videoRef.current = document.createElement('video');
    this.videoRef.current.src = this.props.src;
    this.videoRef.current.onplay = this.drawFrame;
    this.videoRef.current.muted = true;
  }

  showDetections = predictions => {
    const ctx = this.bbCanvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const font = "24px helvetica";
    ctx.font = font;
    ctx.textBaseline = "top";

console.log(predictions);
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

  startVideo = () => {
    this.videoRef.current.play();
    this.paused = false;
  }

  stopVideo = () => {
    this.videoRef.current.pause();
    this.paused = true;
  }

  render() {
    return (
      <Row>
        <Col>
          <div>
            <Button variant="outline-primary" onClick={this.startVideo}>Start</Button>
            <Button variant="outline-primary" onClick={this.stopVideo}>Stop</Button>
          </div>
          <canvas ref={this.canvasRef} width="720" height="500"/>
          <canvas ref={this.bbCanvasRef} width="720" height="500"/>
        </Col>

      </Row>
    );
  }
}

export default Video;
