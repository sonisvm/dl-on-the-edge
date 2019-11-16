import cv2
import time
import numpy as np
from flask import Flask, jsonify, abort, make_response, request
from flask_cors import CORS
import base64
import heapq

try:
    from armv7l.openvino.inference_engine import IENetwork, IEPlugin
except:
    from openvino.inference_engine import IENetwork, IEPlugin

framebuffers = []
models = {}
frameId = 0
model_results = None
fps_stats = []
app = Flask(__name__)
CORS(app)


def detect(image, model, frameid, conf=0.2, iou=0.45, mode="parallel"):
    framebuffers[models[model]].put((frameid, image, float(conf), float(iou)))


def base64tocv2(s):
    return cv2.imdecode(np.fromstring(base64.decodebytes(str.encode(s.split(',')[-1])), dtype=np.uint8), 1)


def init(apiresults, MODELS_IN_USE, frameBuffers):
    global models
    global framebuffers
    global model_results

    for mi, model in enumerate(MODELS_IN_USE):
        models[model[0]] = mi
    framebuffers.extend(frameBuffers)
    model_results = apiresults


@app.route('/detect_objects', methods=['POST'])
def detect_objects():
    global frameId
    if not request.json or not 'image' in request.json:
        abort(400)
    # print('request image:' + str(request.json['image']))
    # print('request mode:' + request.json['mode'])
    # print('request models:' + str(request.json['models']))

    frameId += 1
    image = base64tocv2(request.json['image'])
    response = {}

    for model in request.json['models']:
        conf, iou, model_name = model['conf'], model['iou'], model['model']
        detect(image, model_name, frameId, conf, iou, request.json['mode'])

        # objects, fps = detect(image, model_name, iou, conf)
        # responsePerModel = objects
        # response[model] = responsePerModel
    # elif request.json['mode'] == 'ensemble':
    #     # responseEnsemble is the prediction results(bounding boxes) of the ensemble model
    #     responseEnsemble = [{'bbox': [1, 0, 200, 200], 'class': 'person', 'score': 0.838}]
    #     response['all'] = responseEnsemble
    return jsonify(response), 201


def get_fps_stats():
    while fps_stats and fps_stats[0] < time.time() - 5:
        heapq.heappop(fps_stats)
    return len(fps_stats) / 5


def record_fps():
    heapq.heappush(fps_stats, time.time())


@app.route('/detect_objects_response', methods=['GET'])
def detect_objects_response():
    global models
    model_names = request.args.get('models', "")
    print(model_names)
    model_names = model_names.split(",") if model_names else []
    response = {}
    for model_name in model_names:
        model_index = models[model_name]
        objects_detected = []
        for obj in model_results[model_index].get()[1]:
            objects_detected.append({'bbox': [obj.xmin, obj.ymin, obj.xmax - obj.xmin, obj.ymax - obj.ymin],
                                     'class': obj.name, 'score': float(obj.confidence)})
        response[model_name] = objects_detected
    if model_names:
        record_fps()
        response["fps"] = get_fps_stats()
    else:
        response["fps"] = None
    print(response)
    return jsonify(response), 201


@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404)


@app.route('/shutdown', methods=['POST'])
def shutdown():
    global framebuffers
    global model_results
    shutdown_hook = request.environ.get('werkzeug.server.shutdown')
    for q in framebuffers + model_results:
        while not q.empty():
            q.get()

    if shutdown_hook is not None:
        shutdown_hook()
    return "", 200
