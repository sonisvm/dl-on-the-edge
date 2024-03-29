import sys, os, cv2, time, heapq, argparse
import numpy as np, math
try:
    from armv7l.openvino.inference_engine import IENetwork, IEPlugin
except:
    from openvino.inference_engine import IENetwork, IEPlugin
import multiprocessing as mp
from time import sleep
import threading

yolo_scale_13 = 13
yolo_scale_26 = 26
yolo_scale_52 = 52

classes = 80
coords = 4
num = 3
anchors = [10,14, 23,27, 37,58, 81,82, 135,169, 344,319]
fps_stats = []

LABELS = ("person", "bicycle", "car", "motorbike", "aeroplane",
          "bus", "train", "truck", "boat", "traffic light",
          "fire hydrant", "stop sign", "parking meter", "bench", "bird",
          "cat", "dog", "horse", "sheep", "cow",
          "elephant", "bear", "zebra", "giraffe", "backpack",
          "umbrella", "handbag", "tie", "suitcase", "frisbee",
          "skis", "snowboard", "sports ball", "kite", "baseball bat",
          "baseball glove", "skateboard", "surfboard","tennis racket", "bottle",
          "wine glass", "cup", "fork", "knife", "spoon",
          "bowl", "banana", "apple", "sandwich", "orange",
          "broccoli", "carrot", "hot dog", "pizza", "donut",
          "cake", "chair", "sofa", "pottedplant", "bed",
          "diningtable", "toilet", "tvmonitor", "laptop", "mouse",
          "remote", "keyboard", "cell phone", "microwave", "oven",
          "toaster", "sink", "refrigerator", "book", "clock",
          "vase", "scissors", "teddy bear", "hair drier", "toothbrush")
MODELS_IN_USE = (
    ("coco_tiny_yolov3_320", 320),
    ("coco_tiny_yolov3_352", 352),
    # ("coco_tiny_yolov3_384", 384),
    # ("coco_tiny_yolov3_416", 416),
    # ("coco_tiny_yolov3_448", 448),
    # ("coco_tiny_yolov3_480", 480),
    # ("coco_tiny_yolov3_512", 512),
    # ("coco_tiny_yolov3_544", 544),
    # ("coco_tiny_yolov3_576", 576),
    # ("coco_tiny_yolov3_608", 608),
    #
    # ("coco_tiny_yolov3_320", 320),
    # ("coco_tiny_yolov3_608", 608),
    # ("frozen_tiny_yolo_v3", 416),
    # ("frozen_tiny_yolo_v3", 416),
    # ("frozen_tiny_yolo_v3", 416),
    # ("coco_tiny_yolov3_320", 320),
    # NOTE: change models and input size here
)

label_text_color = (255, 255, 255)
label_background_color = (125, 175, 75)
box_color = (255, 128, 0)
box_thickness = 1

processes = []

fps = ""
detectfps = ""
framecount = 0
detectframecount = 0
time1 = 0
time2 = 0
lastresults = None



def EntryIndex(side, lcoords, lclasses, location, entry):
    n = int(location / (side * side))
    loc = location % (side * side)
    return int(n * side * side * (lcoords + lclasses + 1) + entry * side * side + loc)


class DetectionObject():
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
    area_of_overlap = 0.0
    if (width_of_overlap_area < 0.0 or height_of_overlap_area < 0.0):
        area_of_overlap = 0.0
    else:
        area_of_overlap = width_of_overlap_area * height_of_overlap_area
    box_1_area = (box_1.ymax - box_1.ymin)  * (box_1.xmax - box_1.xmin)
    box_2_area = (box_2.ymax - box_2.ymin)  * (box_2.xmax - box_2.xmin)
    area_of_union = box_1_area + box_2_area - area_of_overlap
    retval = 0.0
    if area_of_union <= 0.0:
        retval = 0.0
    else:
        retval = (area_of_overlap / area_of_union)
    return retval


def ParseYOLOV3Output(blob, resized_im_h, resized_im_w, original_im_h, original_im_w, threshold, objects):

    out_blob_h = blob.shape[2]
    out_blob_w = blob.shape[3]

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
            if (scale < threshold):
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
                obj = DetectionObject(x, y, height, width, j, prob, (original_im_h / resized_im_h), (original_im_w / resized_im_w))
                objects.append(obj)
    return objects

def server(frameBuffers, api_results):
    from server import app, init

    init(api_results, MODELS_IN_USE, frameBuffers)
    while True:
        app.run(debug=False, host="0.0.0.0")

def camThread(LABELS, results, frameBuffers, camera_width, camera_height, vidfps):
    global fps
    global detectfps
    global lastresults
    global framecount
    global detectframecount
    global time1
    global time2
    global cam
    global window_name

    cam = cv2.VideoCapture(0)
    if cam.isOpened() != True:
        print("USB Camera Open Error!!!")
        sys.exit(0)
    cam.set(cv2.CAP_PROP_FPS, vidfps)
    cam.set(cv2.CAP_PROP_FRAME_WIDTH, camera_width)
    cam.set(cv2.CAP_PROP_FRAME_HEIGHT, camera_height)
    window_name = "USB Camera"
    wait_key_time = 1

    #cam = cv2.VideoCapture("data/input/testvideo4.mp4")
    #camera_width = int(cam.get(cv2.CAP_PROP_FRAME_WIDTH))
    #camera_height = int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT))
    #frame_count = int(cam.get(cv2.CAP_PROP_FRAME_COUNT))
    #window_name = "Movie File"
    #wait_key_time = int(1000 / vidfps)

    cv2.namedWindow(window_name, cv2.WINDOW_AUTOSIZE)
    frameId = 0
    while True:
        t1 = time.perf_counter()

        # USB Camera Stream Read
        s, color_image = cam.read()
        if not s:
            continue
        height = color_image.shape[0]
        width = color_image.shape[1]

        for frameBuffer in frameBuffers:
            while frameBuffer.full():
                sleep(0.1)

        for frameBuffer in frameBuffers:
            frameBuffer.put(
                (frameId, color_image.copy())
            )


        frameId = (frameId + 1) % sys.maxsize

        if not results.empty():
            objects = results.get(False)
            detectframecount += 1

            for obj in objects:
                if obj.confidence < 0.2:
                    continue
                label = obj.class_id
                confidence = obj.confidence
                if confidence > 0.2:
                    label_text = LABELS[label] + " (" + "{:.1f}".format(confidence * 100) + "%)"
                    cv2.rectangle(color_image, (obj.xmin, obj.ymin), (obj.xmax, obj.ymax), box_color, box_thickness)
                    cv2.putText(color_image, label_text, (obj.xmin, obj.ymin - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, label_text_color, 1)
            lastresults = objects
        else:
            if not isinstance(lastresults, type(None)):
                for obj in lastresults:
                    if obj.confidence < 0.2:
                        continue
                    label = obj.class_id
                    confidence = obj.confidence
                    if confidence > 0.2:
                        label_text = LABELS[label] + " (" + "{:.1f}".format(confidence * 100) + "%)"
                        cv2.rectangle(color_image, (obj.xmin, obj.ymin), (obj.xmax, obj.ymax), box_color, box_thickness)
                        cv2.putText(color_image, label_text, (obj.xmin, obj.ymin - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, label_text_color, 1)

        cv2.putText(color_image, fps,       (width-170,15), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (38,0,255), 1, cv2.LINE_AA)
        cv2.putText(color_image, detectfps, (width-170,30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (38,0,255), 1, cv2.LINE_AA)
        cv2.imshow(window_name, cv2.resize(color_image, (width, height)))

        if cv2.waitKey(wait_key_time)&0xFF == ord('q'):
            sys.exit(0)

        ## Print FPS
        framecount += 1
        if framecount >= 15:
            fps       = "(Playback) {:.1f} FPS".format(time1/15)
            detectfps = "(Detection) {:.1f} FPS".format(detectframecount/time2)
            framecount = 0
            detectframecount = 0
            time1 = 0
            time2 = 0
        t2 = time.perf_counter()
        elapsedTime = t2-t1
        time1 += 1/elapsedTime
        time2 += elapsedTime


# l = Search list
# x = Search target value
def searchlist(l, x, notfoundvalue=-1):
    if x in l:
        return l.index(x)
    else:
        return notfoundvalue


def async_infer(ncsworker):

    #ncsworker.skip_frame_measurement()

    while True:
        ncsworker.predict_async()


class NcsWorker(object):

    def __init__(self, devid, frameBuffer, results, camera_width, camera_height, number_of_ncs, vidfps,  api_results, model_name="coco_tiny_yolov3_320", input_size=320, plugin=None):
        self.devid = devid
        self.frameBuffer = frameBuffer
        # self.model_xml = "./lrmodels/tiny-YoloV3/FP16/frozen_tiny_yolo_v3.xml"
        # self.model_bin = "./lrmodels/tiny-YoloV3/FP16/frozen_tiny_yolo_v3.bin"
        self.model_xml = "./OpenVINO-YoloV3/cs6220-ncs2-yolo-api/models/%s.xml" % model_name
        self.model_bin = "./OpenVINO-YoloV3/cs6220-ncs2-yolo-api/models/%s.bin" % model_name
        self.camera_width = camera_width
        self.camera_height = camera_height
        self.m_input_size = input_size
        self.threshould = 0.4
        self.num_requests = 4
        self.inferred_request = [0] * self.num_requests
        self.heap_request = []
        self.inferred_cnt = 0
        self.plugin = plugin
        self.net = IENetwork(model=self.model_xml, weights=self.model_bin)
        # self.net2 = IENetwork(model=self.model_xml, weights=self.model_bin)
        self.input_blob = next(iter(self.net.inputs))
        self.exec_net = self.plugin.load(network=self.net, num_requests=self.num_requests)
        # self.exec_net2 = self.plugin.load(network=self.net2, num_requests=self.num_requests)

        self.results = results
        self.api_results = api_results
        self.number_of_ncs = number_of_ncs
        self.predict_async_time = 800
        self.skip_frame = 0
        self.roop_frame = 0
        self.vidfps = vidfps
        self.new_w = int(camera_width * min(self.m_input_size/camera_width, self.m_input_size/camera_height))
        self.new_h = int(camera_height * min(self.m_input_size/camera_width, self.m_input_size/camera_height))

    def image_preprocessing(self, color_image):
        resized_image = cv2.resize(color_image, (self.new_w, self.new_h), interpolation = cv2.INTER_CUBIC)
        canvas = np.full((self.m_input_size, self.m_input_size, 3), 128)
        canvas[(self.m_input_size-self.new_h)//2:(self.m_input_size-self.new_h)//2 + self.new_h,(self.m_input_size-self.new_w)//2:(self.m_input_size-self.new_w)//2 + self.new_w,  :] = resized_image
        prepimg = canvas
        prepimg = prepimg[np.newaxis, :, :, :]     # Batch size axis add
        prepimg = prepimg.transpose((0, 3, 1, 2))  # NHWC to NCHW
        return prepimg


    def skip_frame_measurement(self):
            surplustime_per_second = (1000 - self.predict_async_time)
            if surplustime_per_second > 0.0:
                frame_per_millisecond = (1000 / self.vidfps)
                total_skip_frame = surplustime_per_second / frame_per_millisecond
                self.skip_frame = int(total_skip_frame / self.num_requests)
            else:
                self.skip_frame = 0


    def predict_async(self):
        try:

            if self.frameBuffer.empty():
                return

            self.roop_frame += 1
            if self.roop_frame <= self.skip_frame:
               self.frameBuffer.get()
               return
            self.roop_frame = 0
            frameId, image = self.frameBuffer.get()
            print("Processed ", self.devid, frameId)
            prepimg = self.image_preprocessing(image)
            reqnum = searchlist(self.inferred_request, 0)

            if reqnum > -1:
                self.exec_net.start_async(request_id=reqnum, inputs={self.input_blob: prepimg})
                self.inferred_request[reqnum] = 1
                self.inferred_cnt += 1
                if self.inferred_cnt == sys.maxsize:
                    self.inferred_request = [0] * self.num_requests
                    self.heap_request = []
                    self.inferred_cnt = 0
                heapq.heappush(self.heap_request, (self.inferred_cnt, reqnum))

            cnt, dev = heapq.heappop(self.heap_request)

            if self.exec_net.requests[dev].wait(0) == 0:
                self.exec_net.requests[dev].wait(-1)

                objects = []
                outputs = self.exec_net.requests[dev].outputs
                for output in outputs.values():
                    objects = ParseYOLOV3Output(output, self.new_h, self.new_w, self.camera_height, self.camera_width, self.threshould, objects)

                objlen = len(objects)
                for i in range(objlen):
                    if (objects[i].confidence == 0.0):
                        continue
                    for j in range(i + 1, objlen):
                        if (IntersectionOverUnion(objects[i], objects[j]) >= 0.4):
                            if objects[i].confidence < objects[j].confidence:
                                objects[i], objects[j] = objects[j], objects[i]
                            objects[j].confidence = 0.0

                # if not self.devid:
                # self.results.put(objects)
                # print("putting", (frameId, objects))
                self.api_results.put((frameId, objects))
                self.inferred_request[dev] = 0
            else:
                heapq.heappush(self.heap_request, (cnt, dev))
        except:
            import traceback
            traceback.print_exc()


def inferencer(results, frameBuffers, number_of_ncs, camera_width, camera_height, vidfps, api_results):

    # Init infer threads
    threads = []
    sleep_time = 2
    for devid in range(number_of_ncs):
        print("Plugin the device in now")
        # sleep(devid * 5)
        for mi, model in enumerate(MODELS_IN_USE):
            while True:
                try:
                    if mi == 0:
                        plugin = IEPlugin(device="MYRIAD")
                    model_name, input_size = model
                    print(mi)
                    thworker = threading.Thread(target=async_infer, args=(
                        NcsWorker(
                            devid, frameBuffers[mi], results, camera_width,
                            camera_height, number_of_ncs, vidfps, api_results[mi],
                            model_name=model_name, input_size=input_size,
                            # model_name="frozen_tiny_yolo_v3", input_size=416,
                            plugin=plugin
                        ),
                    ))
                    thworker.start()
                    threads.append(thworker)
                    break
                except RuntimeError:
                    print("failed, trying again in ", sleep_time)

                    sleep(sleep_time)
    for th in threads:
        th.join()

def aggregateThread(api_results, output):
    def _aggregate():
        # buffer = [None] * len(api_results)
        # current_frame_id = 0
        while True:
            yield [r.get()[1] for r in api_results]
            continue
            #
            # if current_frame_id == sys.maxsize:
            #     current_frame_id = 0  # reset frameid to 0, but we probably won't reach this
            # for i, fb in enumerate(api_results):
            #     if buffer[i] is not None:
            #         continue
            #     frame_id, objs = fb.get()
            #     while frame_id < current_frame_id:
            #         frame_id, objs = fb.get()
            #
            #     if frame_id > current_frame_id:
            #         print("Skipped frame %d on thread %d, next frame %d" % (current_frame_id, i, frame_id))
            #         current_frame_id = frame_id
            #         buffer = [None] * len(api_results)
            #         buffer[i] = objs
            #         break
            #     buffer[i] = objs
            # else:
            #     current_frame_id += 1
            #     yield buffer
            #     buffer = [None] * len(api_results)

    for results in _aggregate():
        # print("HOOOO", results)
        output.put(results)
        continue
        for i, objs in enumerate(results):
            # results[i] is the prediction results of ith device
            for obj in objs:
                if obj.confidence < 0.2:
                    continue
                # NOTE: do something meaningful here (ensemble learning?)
                print(
                    "Model %d:" % i,
                    obj.class_id,  # this is the label
                    obj.confidence,
                    # these are the boxes positions
                    obj.xmin,
                    obj.xmax,
                    obj.ymin,
                    obj.ymax
                )


    # aggregateThread(
    #     [
    #         [
    #             (1, "1"),
    #             (3, "3"),
    #             (5, "5"),
    #             (6, "6"),
    #         ],
    #         [
    #             (1, "1"),
    #             (5, "5"),
    #             (6, "6b"),
    #         ],
    #         [
    #             (1, "1"),
    #             (3, "3"),
    #             (5, "5"),
    #             (6, "6c"),
    #         ]
    #     ]
    # )
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-numncs','--numberofncs',dest='number_of_ncs',type=int,default=1,help='Number of NCS. (Default=1)')
    args = parser.parse_args()

    number_of_ncs = args.number_of_ncs
    camera_width = int(cv2.VideoCapture(0).get(cv2.CAP_PROP_FRAME_WIDTH))
    camera_height = int(cv2.VideoCapture(0).get(cv2.CAP_PROP_FRAME_HEIGHT))
    vidfps = 30

    try:

        mp.set_start_method('forkserver')
        frameBuffers = []
        api_results = []

        for _ in MODELS_IN_USE:
            frameBuffers.append(mp.Queue(10))
            api_results.append(mp.Queue())
        results = mp.Queue()

        # Start detection MultiStick
        # Activation of inferencer
        print("starting inferencer")
        output = mp.Queue()

        p = mp.Process(target=inferencer, args=(results, frameBuffers, number_of_ncs, camera_width, camera_height, vidfps, api_results), daemon=True)
        p.start()
        processes.append(p)

        # p = mp.Process(target=camThread, args=(LABELS, results, frameBuffers, camera_width, camera_height, vidfps),
        #                daemon=True)
        # p.start()
        # processes.append(p)
        # sleep(number_of_ncs * 7)

        # Start streaming
        p = mp.Process(target=server, args=(frameBuffers, api_results), daemon=True)
        p.start()
        processes.append(p)

        # # Start combining outputs
        # p = mp.Process(target=aggregateThread, args=(api_results, output), daemon=True)
        # p.start()
        # processes.append(p)

        while True:
            for p in processes:
                if p.exitcode is not None:
                    for p2 in processes:
                        if p2.exitcode is None:
                            p.terminate()
                    sys.exit(p.exitcode)

            sleep(1)
    except:
        import traceback
        traceback.print_exc()
    finally:
        for p in range(len(processes)):
            processes[p].terminate()

        print("\n\nFinished\n\n")
