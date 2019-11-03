
export function getPredictions(image, mode, models) {
  return fetch("http://localhost:5000/detect_objects", {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json'
           },
           body:JSON.stringify({
             image:image,
             mode: mode,
             models: Array.from(models)
           })
       })
       .then(res => {
         return res.json();
       })
}
