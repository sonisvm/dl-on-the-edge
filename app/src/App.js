import React, { Component } from "react";
import "./App.css";
import Upload from './upload/Upload';
import WebCam from './WebCam';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import CardDeck from 'react-bootstrap/CardDeck';
import {modelOptions} from './modelOptions';

class App extends Component {
  constructor(){
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

  addModel = event => {
    console.log("in addModel");
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
    let showScreen = this.state.option && this.state.execution_mode && this.state.models.size!==0;
    return (
        <Container className="main" fluid={true}>
          <Container className="dashboard" fluid={true}>
            <Row>
              <Col className="title">
                <h2>Deep Learning on the Edge</h2>
              </Col>
            </Row>
            <Row className="viewArea">
              <Col md={3}>
                <CardDeck className="optionCards">
                  <Card className="options">
                    <Card.Header>Input Source</Card.Header>
                    <Card.Body>
                      <Form>
                        <Form.Check
                          type="radio"
                          label="Upload video"
                          name="upload"
                          id="upload"
                          value = "upload"
                          checked = {this.state.option? this.state.option==="upload" : false}
                          onChange = {this.setOption}
                        />
                        <Form.Check
                          type="radio"
                          label="Use webcam"
                          name="webcam"
                          id="webcam"
                          value = "webcam"
                          checked = {this.state.option? this.state.option==="webcam" : false}
                          onChange = {this.setOption}
                        />
                      </Form>
                    </Card.Body>
                  </Card>
                  <Card className="options">
                    <Card.Header>Models</Card.Header>
                    <Card.Body>
                      <Form>
                        {modelOptions.map(option => {
                          return (<Form.Check
                            key={option.id}
                            type="checkbox"
                            label={option.display_name}
                            id={option.id}
                            value = {option.id}
                            checked = {this.state.models.has(option.id)}
                            onChange = {this.addModel}
                          />);
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
              <Col md={9} className="screen">
                {showScreen?
                  (this.state.option === "webcam" ? <WebCam execution_mode={this.state.execution_mode} models={this.state.models}/>
                  : <Upload execution_mode={this.state.execution_mode} models={this.state.models}/>)
                  : null}
              </Col>
            </Row>
          </Container>
        </Container>
    );
  }
}

export default App;
