import React, { Component } from "react";
import "./App.css";
import Upload from './upload/Upload';
import ObjectDetector from './ObjectDetector';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ListGroup from 'react-bootstrap/ListGroup';

class Options extends Component {

  constructor() {
    super();
    this.state = {
      option:'',
      execution_mode:'',
      models: new Set()
    };
  }

  setOption = event => {
    this.setState({
      option: event.currentTarget.value
    });
  }


  render() {
    let option = this.state.option;
    if (option) {
      if (option === "upload") {
        return <Upload/>;
      } else {
        return <ObjectDetector type="webcam"/>;
      }
    } else {
      return (
        <Container>
          <Row className="viewArea">
            <Col>
              <ListGroup>
                <ListGroup.Item action onClick={this.setOption} value="upload">
                  Upload a Video
                </ListGroup.Item>
                <ListGroup.Item action onClick={this.setOption} value="upload">
                  Upload an Image
                </ListGroup.Item>
                <ListGroup.Item action onClick={this.setOption} value="webcam">
                  Use webcam
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>
        </Container>
      );
    }
  }
}

export default Options;
