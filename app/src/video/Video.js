//reference : https://nanonets.com/blog/object-detection-tensorflow-js/

import React, {Component} from 'react';
import "./Video.css";
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

class Video extends Component {
  videoRef = React.createRef();
  canvasRef = React.createRef();
  model = null;
  array = [];

  constructor(props) {
    super(props);

    this.state = {
      src: props.src,
      videoSrc: props.video,
      paused: false
    };

    this.videoRef.current = document.createElement('video');
    this.videoRef.current.src = props.video;
    this.videoRef.current.ontimeupdate = this.drawFrame;
    this.videoRef.current.muted = true;
  }

  detectFromVideoFrame = (model, video) => {
    model.detect(video)
          .then(predictions => {
            this.showDetections(predictions);
            requestAnimationFrame(()=>{
              this.detectFromVideoFrame(model, video);
            });
          })
          .catch(err => {
            console.log("Error from model " + err);
          });
  }


  drawFrame = (e) => {
    if(!this.state.paused) {
      console.log(" In draw frame");
      e.target.pause();
      const ctx = this.canvasRef.current.getContext("2d");
      ctx.drawImage(e.target, 0, 0, ctx.canvas.width, ctx.canvas.height);

      this.canvasRef.current.toBlob(blob=>{
        console.log("Created blob");
        console.log(blob);
        let reader = new FileReader();
        reader.onload = file => {
          console.log("Fetching results");
          fetch("http://localhost:8000/detect_objects", {
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json'
                   },
                   body:JSON.stringify({data:file.target.result})
               })
               .then(res => {
                 console.log("received response from server");
                 this.showDetections(res.json().data);
                 if (e.target.currentTime < e.target.duration) {
                   e.target.play();
                 }
               });
        }

        reader.readAsDataURL(blob);
      }, 'image/jpeg');
    }
  }

  showDetections = predictions => {
    console.log("showDetections");
    const ctx = this.canvasRef.current.getContext("2d");
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

  startVideo = () => {
    console.log(" Start video");
    this.videoRef.current.play();
    this.setState({paused:false});
  }

  stopVideo = () => {
    this.videoRef.current.pause();
    this.setState({paused:true});
  }

  // {this.state.src==="upload" ?
  //   (
  //       <video id="videoPlayer"
  //       src={this.state.videoSrc}
  //       ref={this.videoRef}
  //       onTimeUpdate = {this.drawFrame}
  //       muted>
  //       </video>
  //     ):
  //   (
  //     <video
  //       autoPlay
  //       muted
  //       ref={this.videoRef}
  //     />
  //
  //   )}
  render() {
    return (
      <Row>
        <Col>
          <div>
            <Button variant="outline-primary" onClick={this.startVideo}>Start</Button>
            <Button variant="outline-primary" onClick={this.stopVideo}>Stop</Button>
          </div>
          <canvas ref={this.canvasRef} width="720" height="500"/>
        </Col>

      </Row>
    );
  }
}

export default Video;
