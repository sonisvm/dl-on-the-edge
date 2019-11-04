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
    this.getPredictionsFromServer();
  }

  componentDidMount() {
    this.imageRef.current = document.createElement('img');
    this.imageRef.current.src = this.props.src;
    const ctx = this.canvasRef.current.getContext("2d");

    ctx.drawImage(this.imageRef.current, 0, 0, ctx.canvas.width, ctx.canvas.height);
    this.getPredictionsFromServer();
  }

  getPredictionsFromServer = () => {
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

export default Image;
