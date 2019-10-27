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
      files: [],
      uploading: false,
      uploadProgress: {},
      uploaded: false,
      videoSrc: ''
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


    // this.setState(prevState => ({
    //   files: prevState.files.concat(files)
    // }));
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
        <Video video={this.state.videoSrc}/>}
      </Container>
    );
  }
}

export default Upload;
