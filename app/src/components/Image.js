//reference : https://nanonets.com/blog/object-detection-tensorflow-js/

import React, {Component} from 'react';
import "../css/Video.css";
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';
import {getPredictions} from '../server/Server';
import {showDetections} from '../common/Utility';

class Image extends Component {
  canvasRef = React.createRef();
  bbCanvasRef = React.createRef();
  imageRef = React.createRef();

  // componentDidUpdate(prevProps) {
  //   this.getPredictionsFromServer();
  // }

  componentDidMount() {

    let image = document.getElementById("image");

    const ctx = this.canvasRef.current.getContext("2d");

    ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);

  }

  detectObjects = ()=>{
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
      <div className="fullHeight">
        <Row>
          <div>
            <Button variant="outline-primary" onClick={this.detectObjects}>Detect Objects</Button>
          </div>
        </Row>
        <Row className="fullHeight">
            <img src={this.props.src} width="720" height="500" id="image" alt="uploading.."/>
            <canvas ref={this.canvasRef}  id="canvasRef"/>
            <canvas ref={this.bbCanvasRef} />
        </Row>
      </div>

    );
  }
}

export default Image;
