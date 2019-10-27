//reference : https://nanonets.com/blog/object-detection-tensorflow-js/

import React, {Component} from 'react';
import "./Video.css";
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class Video extends Component {
  videoRef = React.createRef();
  canvasRef = React.createRef();

  constructor(props) {
    super(props);

    this.state = {
      src: props.src,
      videoSrc: props.video
    };
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

  componentDidMount() {
    console.log("componentDidMount");
      if(this.state.src === "webcam") {
        if (navigator.mediaDevices.getUserMedia) {
          // define a Promise that'll be used to load the webcam and read its frames
          const webcamPromise = navigator.mediaDevices
            .getUserMedia({
              video: true,
              audio: false,
            })
            .then(stream => {
              // pass the current frame to the window.stream
              window.stream = stream;
              // pass the stream to the videoRef
              this.videoRef.current.srcObject = stream;

              return new Promise(resolve => {
                this.videoRef.current.onloadedmetadata = () => {
                  resolve();
                };
              });
            }, (error) => {
              console.log("Couldn't start the webcam")
              console.error(error)
            });

          // define a Promise that'll be used to load the model
          const loadlModelPromise = cocoSsd.load();

          // resolve all the Promises
          Promise.all([loadlModelPromise, webcamPromise])
            .then(values => {
              this.detectFromVideoFrame(values[0], this.videoRef.current);
            })
            .catch(error => {
              console.error(error);
            });
        }
      } else {
        //this.videoRef.current.srcObject = this.videoSrc;

        // const loadlModelPromise = cocoSsd.load();
        //
        // const videoPromise = fetch("http://localhost:8000/video")
        //                     .then(response => response.body)
        //                     .then(body => {
        //                       window.stream = body;
        //                       // pass the stream to the videoRef
        //                       this.videoRef.current.srcObject = body;
        //
        //                       return new Promise(resolve => {
        //                         this.videoRef.current.onloadedmetadata = () => {
        //                           resolve();
        //                         };
        //                       });
        //                     })
        //                     .catch(err => {
        //                       console.log("Error while fetching ", err);
        //                     });
        //
        //
        // Promise.all([loadlModelPromise, videoPromise])
        //   .then(values => {
        //     console.log("Promise succeeded");
        //
        //     this.detectFromVideoFrame(values[0], this.videoRef.current);
        //   })
        //   .catch(error => {
        //     console.error("Error" + error);
        //   });
      }


  }

  render() {
    return (
      <Row>
        <Col>
        {this.state.src==="upload" ?
          (
              <video id="videoPlayer"
              src={this.state.videoSrc}
              muted>
              </video>
            ):
          (
            <video
              autoPlay
              muted
              ref={this.videoRef}
            />

          )}
          <canvas ref={this.canvasRef} width="720" height="500"/>
        </Col>

      </Row>
    );
  }
}

export default Video;
