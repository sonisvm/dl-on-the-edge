import React, { Component } from "react";
import Dropzone from "../dropzone/Dropzone";
import './Upload.css';
import ObjectDetector from '../ObjectDetector';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

class Upload extends Component {
  constructor(props) {
    super(props);
    this.state = {
      uploading: false,
      uploaded: false,
      src: '',
      image: false
    };

  }

  onFilesAdded = (event) => {
    this.setState({ uploading: true });

    let image = false;
    if (event.target.files[0].type === 'image/png' || event.target.files[0].type === 'image/jpeg') {
      image = true;
    }
    var reader = new FileReader();

    //onload will run after video has been loaded
    reader.onload = file => {
      this.setState({
        uploaded: true,
        uploading: false,
        src: file.target.result,
        image: image
      })
    }

    reader.readAsDataURL(event.target.files[0]);

  }


  render() {
    if (this.state.uploaded) {
      return <ObjectDetector src={this.state.src} type={this.state.image? "image" : "video"}/>;
    } else {
      return (
        <Container>
            <Row className="title">
              <Col>
                <h3>Upload file</h3>
              </Col>
            </Row>
            <Row className="upload">
              <Col className="content">
                <Dropzone
                  onFilesAdded={this.onFilesAdded}
                  disabled={this.state.uploading || this.state.uploaded}
                />
              </Col>
            </Row>
        </Container>
      );
    }

  }
}

export default Upload;
