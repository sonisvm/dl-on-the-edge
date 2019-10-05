import React, {Component} from 'react';


class Video extends Component {
  constructor() {
    super();

  }

  render() {
    console.log("rendering video");
    return (
      <div>
        <video id="videoPlayer" controls>
          <source src="http://localhost:8000/video" type="video/mp4"/>
        </video>
      </div>
    );
  }
}

export default Video;
