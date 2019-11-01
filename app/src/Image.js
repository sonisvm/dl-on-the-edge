//reference : https://nanonets.com/blog/object-detection-tensorflow-js/

import React, {Component} from 'react';
import "./video/Video.css";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

class Image extends Component {
  imageRef = React.createRef();
  bbCanvasRef = React.createRef();

  componentDidUpdate(prevProps) {
    this.getPredictions();
  }

  componentDidMount() {
    this.getPredictions();
  }

  getPredictions = () => {
    fetch("http://localhost:8000/detect_objects", {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json'
             },
             body:JSON.stringify({
               image:this.props.src,
               mode: this.props.execution_mode,
               models: Array.from(this.props.models)
             })
         })
         .then(res => {
           return res.json();
         })
         .then(data => {
           this.showDetections(data);
         });
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


  render() {
    return (
      <Row>
        <Col>
          <img src={this.props.src} width="720" height="500" alt="uploading..."/>
          <canvas ref={this.bbCanvasRef} width="720" height="500"/>
        </Col>

      </Row>
    );
  }
}

export default Image;
