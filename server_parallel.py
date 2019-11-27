from openvino.inference_engine import IENetwork, IEPlugin
from time import sleep
import multiprocessing as mp
import numpy as np
import threading
import argparse
import heapq
import math
import sys
import cv2

DATASET = 'voc'

class_names = []
with open('./data/%s.names' % DATASET, 'r') as f:
    for line in f.readlines():
        class_name = line.strip()
        if len(class_name) > 0:
            class_names.append(class_name)

ALL_MODELS = (  # NOTE: change models and input size here
    ("coco_tiny_yolov3_320", 320),
    ("coco_tiny_yolov3_352", 352),
    ("coco_tiny_yolov3_384", 384),
    ("coco_tiny_yolov3_416", 416),
    ("coco_tiny_yolov3_448", 448),
    ("coco_tiny_yolov3_480", 480),
    ("coco_tiny_yolov3_512", 512),
    ("coco_tiny_yolov3_544", 544),
    ("coco_tiny_yolov3_576", 576),
    ("coco_tiny_yolov3_608", 608),
)
MODELS_IN_USE = {"coco_tiny_yolov3_320"}
MODELS_IN_USE = set()


def server(frameBuffers, admin_queue, inf_ready_queue, api_results):
    from server import app, init
    init(api_results, ALL_MODELS, frameBuffers, admin_queue, inf_ready_queue)
    inf_ready_queue.get()
    while True:
        app.run(debug=False, host="0.0.0.0")



class DetectionObject(object):
    def __init__(self, x, y, h, w, class_id, confidence, h_scale, w_scale):
        self.xmin = int((x - w / 2) * w_scale)
        self.ymin = int((y - h / 2) * h_scale)
        self.xmax = int(self.xmin + w * w_scale)
        self.ymax = int(self.ymin + h * h_scale)
        self.class_id = class_id
        self.name = class_names[class_id]
        self.confidence = confidence


class YOLOParams:
    def __init__(self, param, side):
        self.num = int(param['num'])
        self.coords = int(param['coords'])
        self.classes = int(param['classes'])
        self.anchors = [float(a) for a in param['anchors'].split(',')]

        if 'mask' in param:
            mask = [int(idx) for idx in param['mask'].split(',')]
            self.num = len(mask)

            maskedAnchors = []
            for idx in mask:
                maskedAnchors += [self.anchors[idx * 2], self.anchors[idx * 2 + 1]]
            self.anchors = maskedAnchors

        self.side = side
        self.isYoloV3 = 'mask' in param  # Weak way to determine but the only one.


def entry_index(side, coord, classes, location, entry):
    side_power_2 = side ** 2
    n = location // side_power_2
    loc = location % side_power_2
    return int(side_power_2 * (n * (coord + classes + 1) + entry) + loc)


def parse_yolo_region(blob, resized_image_shape, original_im_shape, params, threshold):
    _, _, out_blob_h, out_blob_w = blob.shape
    assert out_blob_w == out_blob_h, "Invalid size of output blob. It sould be in NCHW layout and height should " \
                                     "be equal to width. Current height = {}, current width = {}" \
                                     "".format(out_blob_h, out_blob_w)
    orig_im_h, orig_im_w = original_im_shape
    resized_image_h, resized_image_w = resized_image_shape
    objects = list()
    predictions = blob.flatten()
    side_square = params.side * params.side

    for i in range(side_square):
        row = i // params.side
        col = i % params.side
        for n in range(params.num):
            obj_index = entry_index(params.side, params.coords, params.classes, n * side_square + i, params.coords)
            scale = predictions[obj_index]
            if scale < threshold:
                continue
            box_index = entry_index(params.side, params.coords, params.classes, n * side_square + i, 0)
            x = (col + predictions[box_index + 0 * side_square]) / params.side
            y = (row + predictions[box_index + 1 * side_square]) / params.side
            try:
                w_exp = math.exp(predictions[box_index + 2 * side_square])
                h_exp = math.exp(predictions[box_index + 3 * side_square])
            except OverflowError:
                continue
            w = w_exp * params.anchors[2 * n] / (resized_image_w if params.isYoloV3 else params.side)
            h = h_exp * params.anchors[2 * n + 1] / (resized_image_h if params.isYoloV3 else params.side)
            for j in range(params.classes):
                class_index = entry_index(params.side, params.coords, params.classes, n * side_square + i,
                                          params.coords + 1 + j)
                confidence = scale * predictions[class_index]
                if confidence < threshold:
                    continue
                objects.append(scale_bbox(x=x, y=y, h=h, w=w, class_id=j, confidence=confidence,
                                          h_scale=orig_im_h, w_scale=orig_im_w))
    return objects


def scale_bbox(x, y, h, w, class_id, confidence, h_scale, w_scale):
    xmin = int((x - w / 2) * w_scale)
    ymin = int((y - h / 2) * h_scale)
    xmax = int(xmin + w * w_scale)
    ymax = int(ymin + h * h_scale)
    return dict(xmin=xmin, xmax=xmax, ymin=ymin, ymax=ymax, class_id=class_id, confidence=confidence)


def intersection_over_union(box_1, box_2):
    width_of_overlap_area = min(box_1['xmax'], box_2['xmax']) - max(box_1['xmin'], box_2['xmin'])
    height_of_overlap_area = min(box_1['ymax'], box_2['ymax']) - max(box_1['ymin'], box_2['ymin'])
    if width_of_overlap_area < 0 or height_of_overlap_area < 0:
        area_of_overlap = 0
    else:
        area_of_overlap = width_of_overlap_area * height_of_overlap_area
    box_1_area = (box_1['ymax'] - box_1['ymin']) * (box_1['xmax'] - box_1['xmin'])
    box_2_area = (box_2['ymax'] - box_2['ymin']) * (box_2['xmax'] - box_2['xmin'])
    area_of_union = box_1_area + box_2_area - area_of_overlap
    if area_of_union == 0:
        return 0
    return area_of_overlap / area_of_union


def ParseYOLOV3Output(net, outputs, resized_image_shape, original_image_shape, t_conf=0.50, t_iou=0.40):
    objects = list()
    for layer_name, out_blob in outputs.items():
        out_blob = out_blob.reshape(net.layers[net.layers[layer_name].parents[0]].shape)
        layer_params = YOLOParams(net.layers[layer_name].params, out_blob.shape[2])
        objects += parse_yolo_region(out_blob, resized_image_shape, original_image_shape, layer_params, t_conf)

    objects = sorted(objects, key=lambda obj: obj['confidence'], reverse=True)
    for i in range(len(objects)):
        if objects[i]['confidence'] < t_conf:
            continue
        for j in range(i + 1, len(objects)):
            if intersection_over_union(objects[i], objects[j]) > t_iou:
                objects[j]['confidence'] = 0

    objects_c = []
    for obj in objects:
        if obj['confidence'] >= t_conf:
            x_min, y_min = max(obj['xmin'], 0), max(obj['ymin'], 0)
            x_max, y_max = min(obj['xmax'], original_image_shape[1]), min(obj['ymax'], original_image_shape[0])
            W, H = x_max - x_min, y_max - y_min
            x, y = x_min + W / 2., y_min + H / 2.
            objects_c.append(DetectionObject(x, y, H, W, obj['class_id'], obj['confidence'], 1., 1.))
    return objects_c


def search_list(l, x, NOT_FOUND=-1):
    # l = Search list, x = Search target value
    return l.index(x) if x in l else NOT_FOUND


def async_infer(worker):
    while True:
        worker.predict_async()


class NcsWorker(object):
    def __init__(self, devid, frameBuffer, results, number_of_ncs, api_results, model_name, input_size, plugin):
        self.devid = devid
        self.model_name = model_name.replace('coco', DATASET)
        self.model_xml = "./models/FP16/%s.xml" % self.model_name
        self.model_bin = "./models/FP16/%s.bin" % self.model_name

        self.m_input_size = input_size
        self.num_requests = 4
        self.inferred_request = [0] * self.num_requests
        self.heap_request = []
        self.inferred_cnt = 0

        self.plugin = plugin
        self.net = IENetwork(model=self.model_xml, weights=self.model_bin)
        self.input_blob = next(iter(self.net.inputs))
        self.exec_net = self.plugin.load(network=self.net, num_requests=self.num_requests)

        self.frameBuffer = frameBuffer
        self.results = results
        self.api_results = api_results
        self.number_of_ncs = number_of_ncs
        self.skip_frame = 0
        self.roop_frame = 0

    def image_preprocessing(self, color_image):
        camera_width, camera_height = color_image.shape[1], color_image.shape[0]
        scale = min(self.m_input_size / camera_width, self.m_input_size / camera_height)
        new_w, new_h = int(camera_width * scale), int(camera_height * scale)
        resized_image = cv2.resize(color_image, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        canvas = np.full((self.m_input_size, self.m_input_size, 3), 128)
        top = (self.m_input_size - new_h) // 2
        bottom = (self.m_input_size - new_h) // 2 + new_h
        left = (self.m_input_size - new_w) // 2
        right = (self.m_input_size - new_w) // 2 + new_w
        canvas[top:bottom, left:right, :] = resized_image
        prep_img = canvas
        prep_img = prep_img[np.newaxis, :, :, :]  # Batch size axis add
        prep_img = prep_img.transpose((0, 3, 1, 2))  # NHWC to NCHW
        return prep_img

    def predict_async(self):
        try:
            if not self.frameBuffer.empty():
                self.roop_frame += 1
                if self.roop_frame <= self.skip_frame:
                    self.frameBuffer.get()
                    return
                self.roop_frame = 0
                frameId, image, t_conf, t_iou, mode = self.frameBuffer.get()

                req_num = search_list(self.inferred_request, 0)
                if req_num > -1:
                    prep_img = self.image_preprocessing(image)
                    self.exec_net.start_async(request_id=req_num, inputs={self.input_blob: prep_img})
                    self.inferred_request[req_num] = 1
                    self.inferred_cnt += 1
                    if self.inferred_cnt == sys.maxsize:
                        self.inferred_request = [0] * self.num_requests
                        self.heap_request = []
                        self.inferred_cnt = 0
                    heapq.heappush(self.heap_request, (self.inferred_cnt, req_num, frameId,
                                                       image.shape[1], image.shape[0], t_conf, t_iou, mode))

            if len(self.heap_request) > 0:
                cnt, dev, frameId, camera_width, camera_height, t_conf, t_iou, mode = heapq.heappop(self.heap_request)
                if self.exec_net.requests[dev].wait(0) == 0:
                    self.exec_net.requests[dev].wait(-1)
                    scale = min(self.m_input_size / camera_width, self.m_input_size / camera_height)
                    new_w, new_h = int(camera_width * scale), int(camera_height * scale)
                    outputs = self.exec_net.requests[dev].outputs
                    objects = ParseYOLOV3Output(self.net, outputs, (new_h, new_w),
                                                (camera_height, camera_width), t_conf, t_iou)
                    self.api_results.put((frameId, objects, mode, t_iou))
                    self.inferred_request[dev] = 0
                else:
                    heapq.heappush(self.heap_request, (cnt, dev, frameId, camera_width, camera_height,
                                                       t_conf, t_iou, mode))
        except:
            import traceback
            traceback.print_exc()


def inferencer(results, frameBuffers, number_of_ncs, api_results, inf_ready_queue, models_in_use, sleep_time=2):
    threads = []

    for devid in range(number_of_ncs):
        print("Plugin the device in now")
        plugin = IEPlugin(device="MYRIAD")
        plugin_created = False
        loaded_model_count = 0
        for model_name in models_in_use:
            for mi in range(len(ALL_MODELS)):
                model = ALL_MODELS[mi]
                if model[0] == model_name:
                    break
            while True:
                try:
                    if not plugin_created:
                        # plugin = IEPlugin(device="MYRIAD")  # TODO: Keep creating new IEPlugin if failed?
                        print('[Device %d/%d] IEPlugin initialized' % (devid + 1, number_of_ncs))
                    model_name, input_size = model
                    thworker = threading.Thread(target=async_infer, args=(
                        NcsWorker(
                            devid, frameBuffers[mi], results, number_of_ncs, api_results[mi],
                            model_name=model_name, input_size=input_size,
                            plugin=plugin
                        ),
                    ))
                    thworker.start()
                    threads.append(thworker)
                    print('[Device %d/%d] %d/%d models loaded to the IEPlugin' % (devid + 1, number_of_ncs,
                                                                                  loaded_model_count + 1, len(models_in_use)))
                    loaded_model_count += 1
                    plugin_created = True
                    break
                except RuntimeError:
                    print("Failed, trying again in %d second(s)" % sleep_time)
                    sleep(sleep_time)
        print('[Device %d/%d] Initialization finished' % (devid + 1, number_of_ncs))
    print('All devices and models are initialized. Start serving detection requests...')
    inf_ready_queue.put("")
    for th in threads:
        th.join()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-numncs', '--number_of_ncs', dest='number_of_ncs', type=int, default=1,
                        help='Number of NCS. (Default=1)')
    args = parser.parse_args()
    number_of_ncs = args.number_of_ncs
    processes = []
    try:
        mp.set_start_method('forkserver')
        frameBuffers = []
        api_results = []

        for _ in ALL_MODELS:
            frameBuffers.append(mp.Queue(10))
            api_results.append(mp.Queue())
        results = mp.Queue()

        print("Starting inferencer and streaming")
        output = mp.Queue()
        admin_queue = mp.Queue()
        inf_ready_queue = mp.Queue()

        # Start inferencer
        p = mp.Process(target=server, args=(frameBuffers, admin_queue, inf_ready_queue, api_results), daemon=True)
        p.start()
        processes.append(p)

        # Start streaming
        p = mp.Process(target=inferencer, args=(results, frameBuffers, number_of_ncs, api_results, inf_ready_queue, MODELS_IN_USE), daemon=True)
        p.start()
        while True:
            models = set(admin_queue.get())
            if MODELS_IN_USE == models:
                inf_ready_queue.put("")
                continue
            while MODELS_IN_USE:
                MODELS_IN_USE.pop()
            MODELS_IN_USE.update(models)
            print("RELOADING", MODELS_IN_USE)
            p.terminate()
            p = mp.Process(target=inferencer, args=(results, frameBuffers, number_of_ncs, api_results, inf_ready_queue, MODELS_IN_USE), daemon=True)
            p.start()

        # while True:
        #     for p in processes:
        #         if p.exitcode is not None:
        #             for p2 in processes:
        #                 if p2.exitcode is None:
        #                     p.terminate()
        #             sys.exit(p.exitcode)
        #     sleep(1)
    except:
        import traceback
        traceback.print_exc()
    finally:
        for p in range(len(processes)):
            processes[p].terminate()
        print("\n\nFinished\n\n")
