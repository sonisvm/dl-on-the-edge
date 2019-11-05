
import modelOptions from '../config/modelOptions';

export function showDetections(data, canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const font = "16px helvetica";
  ctx.font = font;
  ctx.textBaseline = "top";

  for (let [key, value] of Object.entries(data)) {
    if (key === 'fps') {
      continue;
    }
    let color = "#2fff00"
    if (key !== "all") {
      color = modelOptions.filter(d => d.id === key)[0].color
    }

    let predictions = value;
    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];
      // Draw the bounding box.
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, width, height);
      // Draw the label background.
      ctx.fillStyle = color;
      const textWidth = ctx.measureText(prediction.class).width;
      const textHeight = parseInt(font, 10);
      // draw top left rectangle
      ctx.fillRect(x, y, textWidth*2, textHeight);
      // draw bottom left rectangle
      //ctx.fillRect(x, y + height - textHeight, textWidth + 15, textHeight + 10);

      // Draw the text last to ensure it's on top.
      ctx.fillStyle = "#000000";
      ctx.fillText(prediction.class, x, y);
      ctx.fillText(prediction.score.toFixed(2), textWidth+10, y);
    });
  }

  //let fps = data['fps'];
  let fps = '2';
  if (fps) {
    ctx.fillStyle = "#2fff00";
    ctx.lineWidth = 1;
    const textWidth = ctx.measureText("fps: "+fps).width;
    const textHeight = parseInt(font, 10);
    ctx.fillRect(ctx.canvas.width*0.9, ctx.canvas.height*0.025, textWidth+10, textHeight+10);
    ctx.fillStyle = "#000000";
    ctx.fillText("fps: "+fps, ctx.canvas.width*0.9+5, ctx.canvas.height*0.025+5);
  }

}
