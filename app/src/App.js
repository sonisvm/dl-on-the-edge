import React, { Component } from "react";
import "./App.css";
import Upload from './upload/Upload';
import Video from './video/Video';
import Form from 'react-bootstrap/Form';

class App extends Component {
  constructor(){
    super();
    this.state = {
      option:''
    };
  }

  setOption = event => {
    console.log(event);
    this.setState({
      option: event.currentTarget.value
    });
  }

  render() {
    return (
      <div className="App">
        <div className="Card">
          {this.state.option==='' ?
              <Form>
                <Form.Group>
                  <Form.Label as="legend">
                    Choose the input source
                  </Form.Label>
                    <Form.Check
                      type="radio"
                      label="Upload video"
                      name="upload"
                      id="upload"
                      value = "upload"
                      onChange = {this.setOption}
                    />
                    <Form.Check
                      type="radio"
                      label="Use webcam"
                      name="webcam"
                      id="webcam"
                      value = "webcam"
                      onChange = {this.setOption}
                    />
                </Form.Group>
              </Form>
            : this.state.option === "webcam" ? <Video src="webcam"/> : <Upload/>}

        </div>
      </div>
    );
  }
}

export default App;
