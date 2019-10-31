import React, { Component } from "react";
import Dropzone from "../dropzone/Dropzone";
import Video from '../video/Video';
import './Upload.css';
import Image from '../Image';
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
    };

  }

  static getDerivedStateFromProps(nextProps,prevState){
    return {image: nextProps.option === "image",
            execution_mode: nextProps.execution_mode,
            models: nextProps.models};
  }

  onFilesAdded = (event) => {
    this.setState({ uploading: true });

    if (event.target.files[0].type === 'image/png' || event.target.files[0].type === 'image/jpeg') {
      this.image = true;
    }
    var reader = new FileReader();

    //onload will run after video has been loaded
    reader.onload = file => {
      this.setState({
        uploaded: true,
        uploading: false,
        src: file.target.result
      })
    }

    reader.readAsDataURL(event.target.files[0]);

  }

  startOver = () => {
    this.setState({
      uploading: false,
      uploaded: false,
      src: ''
    })
  }


  render() {
    console.log("Render in Upload");
    console.log(this.state);
    return (
      <Container>
        {this.state.uploaded===false ? (
          <Row className="title">
            <Col>
              <h3>Upload file</h3>
            </Col>
          </Row>) : null}
        {this.state.uploaded===false ? (
          <Row className="upload">
            <Col className="content">
              <Dropzone
                onFilesAdded={this.onFilesAdded}
                disabled={this.state.uploading || this.state.uploaded}
              />
            </Col>
          </Row>):
        this.state.image ?
        <Image src={this.state.src} execution_mode={this.state.execution_mode} models={this.state.models} reset={this.startOver}/> :
        <Video video={this.state.src} execution_mode={this.state.execution_mode} models={this.state.models} reset={this.startOver}/>}
      </Container>
    );
  }
}

export default Upload;
