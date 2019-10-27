//REF: https://towardsdatascience.com/image-object-detection-with-tensorflow-js-b8861119ed46s
const tf = require('@tensorflow/tfjs-node');

const cocossd = require('@tensorflow-models/coco-ssd');
const toUint8Array =  require('base64-to-uint8array');

class ObjectDetector {

  constructor() {
     this.loadModel();
   }

   async loadModel(){
     this.model = await cocossd.load({
         base: 'mobilenet_v2'
     })
   }

   getTensor3dObject(image, numOfChannels) {

       const imageData = image.replace('data:image/jpeg;base64','')
                           .replace('data:image/png;base64','');

       const imageArray = toUint8Array(imageData);

       const tensor3d = tf.node.decodeJpeg( imageArray, numOfChannels );

       return tensor3d;
   }

   async process(image) {

       let predictions = null;
       const tensor3D = this.getTensor3dObject(image, 3);

       predictions = await this.model.detect(tensor3D);

       tensor3D.dispose();

      return {data: predictions};
   }
}

module.exports = {
  ObjectDetector: ObjectDetector
}
