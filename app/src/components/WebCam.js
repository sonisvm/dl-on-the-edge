//reference : https://nanonets.com/blog/object-detection-tensorflow-js/
// reference: http://html5doctor.com/video-canvas-magic/

import React, {Component} from 'react';
import "../css/Video.css";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import {getPredictions} from '../server/Server';
import {showDetections} from '../common/Utility';

class WebCam extends Component {
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
          getPredictions(file.target.result, this.props.execution_mode, this.props.models)
               .then(data => {
                 showDetections(data, this.bbCanvasRef.current);

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

  startVideo = () => {
      this.paused = false;
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

  stopVideo = () => {
    window.stream.getTracks().forEach(track => track.stop())
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

export default WebCam;
