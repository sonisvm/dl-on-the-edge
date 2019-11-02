import React, { Component } from "react";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import WebCam from './WebCam';
import Video from './video/Video';
import Image from './Image';
import Card from 'react-bootstrap/Card';
import CardDeck from 'react-bootstrap/CardDeck';
import {modelOptions} from './modelOptions';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import './ObjectDetector.css';


class ObjectDetector extends Component {
  constructor(props){
    super(props);

    this.state = {
      models: new Set(),
      execution_mode: ''
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
    console.log(models);

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
        screen = <Image src={this.props.src} execution_mode={this.state.execution_mode} models={this.state.models}/>
      }
    }


    return (
      <Container>
        <Row>
          <Button variant="link" onClick={this.props.back} className="backButton">
            <i className="fa fa-arrow-circle-left fa-2x" aria-hidden="true"></i>
          </Button>
        </Row>
        <Row>
          <Col md={4}>
            <CardDeck className="optionCards">
              <Card className="modelSelector">
                <Card.Header>Select the model</Card.Header>
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
                <Card.Header>Mode of Execution</Card.Header>
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
        </Row>
      </Container>
    );
  }
}

export default ObjectDetector;
