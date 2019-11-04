//reference : https://nanonets.com/blog/object-detection-tensorflow-js/

import React, {Component} from 'react';
import "../css/Video.css";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import {getPredictions} from '../server/Server';
import {showDetections} from '../common/Utility';

class Image extends Component {
  canvasRef = React.createRef();
  bbCanvasRef = React.createRef();
  imageRef = React.createRef();

  componentDidUpdate(prevProps) {
    console.log("In update");
    this.getPredictionsFromServer();
  }

  componentDidMount() {
    console.log("In mount");

    let image = document.getElementById("image");
    const ctx = this.canvasRef.current.getContext("2d");
    ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);

    this.getPredictionsFromServer();
  }

  getPredictionsFromServer = () => {
    console.log("In getPredictions");
    this.canvasRef.current.toBlob(blob=>{
      let reader = new FileReader();
      reader.onload = file => {
        getPredictions(file.target.result, this.props.execution_mode, this.props.models)
             .then(data => {
               showDetections(data, this.bbCanvasRef.current);
             });
      }

      reader.readAsDataURL(blob);
    }, 'image/jpeg');

  }


  render() {
    console.log("In render");
    return (
      <Row>
        <Col>
          <img src={this.props.src} width="720" height="500" id="image" alt="uploading.."/>
          <canvas ref={this.canvasRef} width="720" height="500" id="canvasRef"/>
          <canvas ref={this.bbCanvasRef} width="720" height="500"/>
        </Col>

      </Row>
    );
  }
}

export default Image;
