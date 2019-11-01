import React, { Component } from "react";
import "./App.css";
import Options from './Options';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class App extends Component {
  render() {
    return (
        <Container className="main" fluid={true}>
          <Container className="dashboard">
            <Row>
              <Col className="main_title">
                <h2>Deep Learning on the Edge</h2>
              </Col>
            </Row>
            <Options/>
          </Container>
        </Container>
    );
  }
}

export default App;
