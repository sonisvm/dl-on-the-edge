import React, { Component } from "react";
import Dropzone from "../dropzone/Dropzone";
import "./Upload.css";
import Video from '../video/Video';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class Upload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      uploading: false,
      uploaded: false,
      videoSrc: '',
      props: props
    };

  }

  onFilesAdded = (event) => {
    this.setState({ uploadProgress: {}, uploading: true });

    var reader = new FileReader();

    //onload will run after video has been loaded
    reader.onload = file => {
      this.setState({
        uploaded: true,
        uploading: false,
        videoSrc: file.target.result
      })
    }

    reader.readAsDataURL(event.target.files[0]);

  }

  render() {

    return (
      <Container>
        {this.state.uploaded===false ? (
          <Row className="title">
            <Col>
              <h3>Upload video file</h3>
            </Col>
          </Row>) : null}
        {this.state.uploaded===false ? (
          <Row>
            <Col>
              <div className="Upload">
                <div className="Content">
                  <div>
                    <Dropzone
                      onFilesAdded={this.onFilesAdded}
                      disabled={this.state.uploading || this.state.uploaded}
                    />
                  </div>
                </div>
              </div>
            </Col>
          </Row>):
        <Video video={this.state.videoSrc} execution_mode={this.state.props.execution_mode} models={this.state.props.models}/>}
      </Container>
    );
  }
}

export default Upload;
