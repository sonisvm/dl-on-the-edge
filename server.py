import os
import cv2
import time
import numpy as np
import math
from flask import Flask, jsonify, abort, make_response, request
from flask_cors import CORS
import base64

try:
    from armv7l.openvino.inference_engine import IENetwork, IEPlugin
except:
    from openvino.inference_engine import IENetwork, IEPlugin

m_input_size = 416

yolo_scale_13 = 13
yolo_scale_26 = 26
yolo_scale_52 = 52

classes = 80
coords = 4
num = 3
anchors = [10, 14, 23, 27, 37, 58, 81, 82, 135, 169, 344, 319]
framebuffers = []
models = {}
frameId = 0
output = None

LABELS = ("person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck", "boat", "traffic light",
          "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow",
          "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
          "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard",
          "tennis racket", "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
          "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "sofa",
          "pottedplant", "bed", "diningtable", "toilet", "tvmonitor", "laptop", "mouse", "remote", "keyboard",
          "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock",
          "vase", "scissors", "teddy bear", "hair drier", "toothbrush")

label_text_color = (255, 255, 255)
label_background_color = (125, 175, 75)
box_color = (255, 128, 0)
box_thickness = 1
processes = []


def EntryIndex(side, lcoords, lclasses, location, entry):
    n = int(location / (side * side))
    loc = location % (side * side)
    return int(n * side * side * (lcoords + lclasses + 1) + entry * side * side + loc)


class DetectionObject:
    xmin = 0
    ymin = 0
    xmax = 0
    ymax = 0
    class_id = 0
    confidence = 0.0

    def __init__(self, x, y, h, w, class_id, confidence, h_scale, w_scale):
        self.xmin = int((x - w / 2) * w_scale)
        self.ymin = int((y - h / 2) * h_scale)
        self.xmax = int(self.xmin + w * w_scale)
        self.ymax = int(self.ymin + h * h_scale)
        self.class_id = class_id
        self.confidence = confidence


def IntersectionOverUnion(box_1, box_2):
    width_of_overlap_area = min(box_1.xmax, box_2.xmax) - max(box_1.xmin, box_2.xmin)
    height_of_overlap_area = min(box_1.ymax, box_2.ymax) - max(box_1.ymin, box_2.ymin)
    if width_of_overlap_area < 0.0 or height_of_overlap_area < 0.0:
        area_of_overlap = 0.0
    else:
        area_of_overlap = width_of_overlap_area * height_of_overlap_area
    box_1_area = (box_1.ymax - box_1.ymin) * (box_1.xmax - box_1.xmin)
    box_2_area = (box_2.ymax - box_2.ymin) * (box_2.xmax - box_2.xmin)
    area_of_union = box_1_area + box_2_area - area_of_overlap
    if area_of_union <= 0.0:
        retval = 0.0
    else:
        retval = (area_of_overlap / area_of_union)
    return retval


def ParseYOLOV3Output(blob, resized_im_h, resized_im_w, original_im_h, original_im_w, threshold, objects):
    out_blob_h = blob.shape[2]

    side = out_blob_h
    anchor_offset = 0

    if side == yolo_scale_13:
        anchor_offset = 2 * 3
    elif side == yolo_scale_26:
        anchor_offset = 2 * 0

    side_square = side * side
    output_blob = blob.flatten()

    for i in range(side_square):
        row = int(i / side)
        col = int(i % side)
        for n in range(num):
            obj_index = EntryIndex(side, coords, classes, n * side * side + i, coords)
            box_index = EntryIndex(side, coords, classes, n * side * side + i, 0)
            scale = output_blob[obj_index]
            if scale < threshold:
                continue
            x = (col + output_blob[box_index + 0 * side_square]) / side * resized_im_w
            y = (row + output_blob[box_index + 1 * side_square]) / side * resized_im_h
            height = math.exp(output_blob[box_index + 3 * side_square]) * anchors[anchor_offset + 2 * n + 1]
            width = math.exp(output_blob[box_index + 2 * side_square]) * anchors[anchor_offset + 2 * n]
            for j in range(classes):
                class_index = EntryIndex(side, coords, classes, n * side_square + i, coords + 1 + j)
                prob = scale * output_blob[class_index]
                if prob < threshold:
                    continue
                obj = DetectionObject(x, y, height, width, j, prob, (original_im_h / resized_im_h),
                                      (original_im_w / resized_im_w))
                objects.append(obj)
    return objects


def detect(image, model, frameid, conf=0.2, iou=0.45, mode="parallel"):

    global exec_net_index
    global models
    global output

    model_index = models[model]
    t1 = time.time()
    camera_width = image.shape[1]
    camera_height = image.shape[0]
    new_w = int(camera_width * min(m_input_size / camera_width, m_input_size / camera_height))
    new_h = int(camera_height * min(m_input_size / camera_width, m_input_size / camera_height))
    resized_image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    canvas = np.full((m_input_size, m_input_size, 3), 128)
    canvas[(m_input_size - new_h) // 2:(m_input_size - new_h) // 2 + new_h,
    (m_input_size - new_w) // 2:(m_input_size - new_w) // 2 + new_w, :] = resized_image
    prepimg = canvas
    prepimg = prepimg[np.newaxis, :, :, :]  # Batch size axis add
    prepimg = prepimg.transpose((0, 3, 1, 2))  # NHWC to NCHW
    # print(exec_net_index)
    # outputs = exec_net[exec_net_index].infer(inputs={input_blob: prepimg})
    # exec_net_index = (exec_net_index + 1) % 2
    framebuffers[model_index].put((frameid, image))
    return

    objects = []
    for output in outputs.values():
        objects = ParseYOLOV3Output(output, new_h, new_w, camera_height, camera_width, 0.4, objects)

    # Filtering overlapping boxes
    obj_len = len(objects)
    for i in range(obj_len):
        if objects[i].confidence == 0.0:
            continue
        for j in range(i + 1, obj_len):
            if IntersectionOverUnion(objects[i], objects[j]) >= 0.4:
                if objects[i].confidence < objects[j].confidence:
                    objects[i], objects[j] = objects[j], objects[i]
                objects[j].confidence = 0.0

    objects_detected = []
    for obj in objects:
        if obj.confidence < 0.2:
            continue
        objects_detected.append({'bbox': [obj.xmin, obj.ymin, obj.xmax-obj.xmin, obj.ymax-obj.ymin],
                                 'class': LABELS[obj.class_id], 'score': float(obj.confidence)})
    return objects_detected, float(1 / (time.time() - t1))


def base64tocv2(s):
    return cv2.imdecode(np.fromstring(base64.decodebytes(str.encode(s.split(',')[-1])), dtype=np.uint8), 1)


# Setup NCS2
model_xml = "lrmodels/tiny-YoloV3/FP32/frozen_tiny_yolo_v3.xml"  # <--- MYRIAD
model_bin = os.path.splitext(model_xml)[0] + ".bin"

time.sleep(1)

plugin = IEPlugin(device="CPU")
plugin.add_cpu_extension("../OpenVINO-YoloV3/lib/libcpu_extension.so")
exec_net = []
for _ in range(2):
    net = IENetwork(model=model_xml, weights=model_bin)
    input_blob = next(iter(net.inputs))
    exec_net += [plugin.load(network=net)]
exec_net_index = 0
app = Flask(__name__)
CORS(app)


def init(outstream, MODELS_IN_USE, frameBuffers):
    global models
    global framebuffers
    global output

    for mi, model in enumerate(MODELS_IN_USE):
        models[model[0]] = mi
    framebuffers.extend(frameBuffers)
    output = outstream

@app.route('/detect_objects', methods=['POST'])
def detect_objects():
    global frameId
    if not request.json or not 'image' in request.json:
        abort(400)
    # print('request image:' + str(request.json['image']))
    # print('request mode:' + request.json['mode'])
    # print('request models:' + str(request.json['models']))

    image = base64tocv2(request.json['image'])
    response = {}
    frameId += 1
    for model in request.json['models']:
        conf, iou, model_name = model['conf'], model['iou'], model['model']
        detect(image, model_name, frameId, iou, conf, request.json['mode'])

            # objects, fps = detect(image, model_name, iou, conf)
            # responsePerModel = objects
            # response[model] = responsePerModel
    # elif request.json['mode'] == 'ensemble':
    #     # responseEnsemble is the prediction results(bounding boxes) of the ensemble model
    #     responseEnsemble = [{'bbox': [1, 0, 200, 200], 'class': 'person', 'score': 0.838}]
    #     response['all'] = responseEnsemble
    return jsonify(response), 201

@app.route('/detect_objects_response', methods=['GET'])
def detect_objects_response():
    global models

    response = {}
    results = output.get()
    print("DEBUG", results)
    for model, index in models.items():
        objects_detected = []
        for obj in results[index]:
            if obj.confidence < 0.2:
                continue
            objects_detected.append({'bbox': [obj.xmin, obj.ymin, obj.xmax - obj.xmin, obj.ymax - obj.ymin],
                                     'class': LABELS[obj.class_id], 'score': float(obj.confidence)})
        response[model] = objects_detected

    return jsonify(response), 201

@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404)


if __name__ == '__main__':
    app.run(debug=False, host="0.0.0.0")

    del net
    del exec_net
    del plugin
