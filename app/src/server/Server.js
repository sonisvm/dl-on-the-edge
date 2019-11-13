
function *pollForResult(){
  var models = yield [];
  while (true) {
    yield fetch('http://localhost:5000/detect_objects_response?models='+Array.from(models).toString(), {method:'get'})
          .then(res => {return res.json()});
  }
}

const generator = pollForResult();
generator.next();

// function runPolling(resolve, reject) {
//   console.log("in polling");
//
//
// }

var wrapper = function(models, count) {
  return new Promise(function(resolve, reject) {
    console.log("polling for ", count);
    let p = generator.next(models);
    p.value.then(res => {
      if (!res || res.length===0) {
        setTimeout(()=> {return wrapper(models, count)}, 1000);
      } else {
        resolve(res);
      }
    });
  })
}

export function getPredictions(image, mode, models, config, count) {
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
         if (res.status === 201 || res.status===200) {
           return wrapper(models, count);
         }

       })
}
