//reference : https://nanonets.com/blog/object-detection-tensorflow-js/

import React, {Component} from 'react';
import "../css/Video.css";
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import {getPredictions} from '../server/Server';
import {showDetections} from '../common/Utility';

class Image extends Component {
  imageRef = React.createRef();
  bbCanvasRef = React.createRef();


  componentDidUpdate(prevProps) {
    this.getPredictionsFromServer();
  }

  componentDidMount() {
    this.getPredictionsFromServer();
  }

  getPredictionsFromServer = () => {
    getPredictions(this.props.src, this.props.execution_mode, this.props.models)
         .then(data => {
           showDetections(data, this.bbCanvasRef.current);
         });
  }


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
