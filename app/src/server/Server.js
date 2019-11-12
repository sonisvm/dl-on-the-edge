
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
         return res.json();
       })
}
