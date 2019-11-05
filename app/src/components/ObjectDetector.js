import React, { Component } from "react";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import WebCam from './WebCam';
import Video from './Video';
import Photo from './Photo';
import Card from 'react-bootstrap/Card';
import CardDeck from 'react-bootstrap/CardDeck';
import modelOptions from '../config/modelOptions';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import '../css/ObjectDetector.css';


class ObjectDetector extends Component {
  constructor(props){
    super(props);

    this.state = {
      models: new Set(['coco_tiny_yolov3_320']),
      execution_mode: 'parallel'
    }
  }

  addModel = event => {
    const model = event.currentTarget.value;
    let models = this.state.models;
    if (models.has(model)) {
      models.delete(model);
    } else {
      models.add(model);
    }


    this.setState({
      models: models
    });
  }


  render() {
    let showScreen = this.state.execution_mode && this.state.models.size!==0;

    let screen = null;
    if (showScreen) {
      if (this.props.type === "webcam") {
        screen = <WebCam execution_mode={this.state.execution_mode} models={this.state.models}/>;
      } else if (this.props.type === "video") {
        screen = <Video src={this.props.src} execution_mode={this.state.execution_mode} models={this.state.models}/>;
      } else {
        screen = <Photo src={this.props.src} execution_mode={this.state.execution_mode} models={this.state.models}/>
      }
    }


    return (
      <Container>
        <Row>
          <Button variant="link" onClick={this.props.back} className="backButton">
            <i className="fa fa-arrow-circle-left fa-2x" aria-hidden="true"></i>
          </Button>
        </Row>
        <Row className="topRow">
          <Col md={2}>
            <CardDeck className="optionCards">
              <Card className="modelSelector">
                <Card.Header>Models</Card.Header>
                <Card.Body>
                  <Form>
                    {modelOptions.map(option => {
                      return (
                          <Form.Check
                            key={option.id}
                            type="checkbox"
                            label={option.display_name}
                            id={option.id}
                            value = {option.id}
                            checked = {this.state.models.has(option.id)}
                            onChange = {this.addModel}
                          />
                      );
                    })}
                  </Form>
                </Card.Body>
              </Card>
              <Card className="options">
                <Card.Header>Execution Mode</Card.Header>
                <Card.Body>
                  <Form>
                      <Form.Check
                        type="radio"
                        label="Parallel"
                        id="parallel"
                        value = "parallel"
                        checked = {this.state.execution_mode? this.state.execution_mode==="parallel" : false}
                        onChange = {()=>{this.setState({execution_mode: "parallel"})}}
                      />
                      <Form.Check
                        type="radio"
                        label="Ensemble"
                        id="ensemble"
                        value = "ensemble"
                        checked = {this.state.execution_mode? this.state.execution_mode==="ensemble" : false}
                        onChange = {()=>{this.setState({execution_mode: "ensemble"})}}
                      />
                  </Form>
                </Card.Body>
              </Card>
            </CardDeck>
          </Col>
          <Col md={8} className="screen">
            {showScreen? screen: null}
          </Col>
          <Col md={2} className="legend">
            {showScreen && this.state.execution_mode==="parallel"?
                (
                  Array.from(this.state.models).map(model => {

                    let modelInfo = modelOptions.filter(d => d.id === model)[0]
                    let color = modelInfo.color;
                    let name = modelInfo.display_name;
                    const styleObj = {
                      border: "2px solid " + color,
                      backgroundColor: color
                    }
                    return (<div key={name}>
                      <div className="box" style={styleObj}></div>
                      <div className="label" >{name}</div>
                    </div>)
                  })
                )
              : null}
          </Col>
        </Row>
      </Container>
    );
  }
}

export default ObjectDetector;
