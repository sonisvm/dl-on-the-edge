
function *pollForResult(){
  while (true) {
    yield fetch('http://localhost:5000/detect_objects_response', {method:'get'})
          .then(res => {return res.json()});
  }
}

const generator = pollForResult();

function runPolling(resolve, reject) {
  console.log("in polling");

  let p = generator.next();
  p.value.then(res => {
    if (!res || res.length===0) {
      return runPolling(resolve, reject);
    } else {
      resolve(res);
    }
  });
}

export function getPredictions(image, mode, models, config) {
  let modelConfigs = [];
  models.forEach(model => {
    modelConfigs.push({
      model: model,
      conf: config[model].conf,
      iou: config[model].iou
    });
  });

  return fetch("http://localhost:5000/detect_objects", {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json'
           },
           body:JSON.stringify({
             image:image,
             mode: mode,
             models: modelConfigs
           })
       })
       .then(res => {
         console.log("in response");
         if (res.status === 201 || res.status===200) {
           return new Promise(runPolling);
         }

       })
}
