# from http.server import BaseHTTPRequestHandler, HTTPServer
# import socketserver
# import json
# import urllib.parse as urlparse
# import subprocess
#
# class S(BaseHTTPRequestHandler):
#     def _set_headers(self):
#         self.send_response(200)
#         self.send_header('Content-type', 'application/json')
#         self.end_headers()
#
#     def do_OPTIONS(self):
#         self.send_response(200, "ok")
#         self.send_header('Access-Control-Allow-Origin', '*')
#         self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS, POST')
#         self.send_header("Access-Control-Allow-Headers", "X-Requested-With")
#         self.send_header("Access-Control-Allow-Headers", "Content-Type")
#         self.end_headers()
#
#     def do_GET(self):
#         self._set_headers()
#         parsed_path = urlparse.urlparse(self.path)
#         request_id = parsed_path.path
#         #response = subprocess.check_output(["python", request_id])
#         self.wfile.write(json.dumps({"c": 0, "b": 0, "a": 0}).encode(encoding='utf_8'))
#
#     def do_POST(self):
#         self._set_headers()
#         content_len = int(self.headers.get('Content-Length'))
#         post_body = self.rfile.read(content_len)
#         print(post_body)
#         #response = subprocess.check_output(["python", request_id])
#         self.wfile.write(json.dumps(["OK"]).encode(encoding='utf_8'))
#
#     def do_HEAD(self):
#         self._set_headers()
#
# def run(server_class=HTTPServer, handler_class=S, port=8000):
#     server_address = ('', port)
#     httpd = server_class(server_address, handler_class)
#     print('Starting httpd...')
#     httpd.serve_forever()
#
# if __name__ == "__main__":
#     from sys import argv
#
#     if len(argv) == 2:
#         run(port=int(argv[1]))
#     else:
#         run()

from flask import Flask, jsonify, abort, make_response, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

imageList = []

@app.route('/detect_objects', methods=['POST'])
def detect_objects():
	if not request.json or not 'image' in request.json:
		abort(400)
	
	# print('request image:' + str(request.json['image']))
	# print('request mode:' + request.json['mode'])
	# print('request models:' + str(request.json['models']))
	response = {}
	if request.json['mode'] == 'parallel':
		responsePerModel = []
		for model in request.json['models']:
			# responsePerModel is the prediction results(bounding boxes) of each model
			responsePerModel = [ { 'bbox': [1,0,200,200],'class': 'person','score': 0.838 } ] 
			response[model] = responsePerModel
	elif request.json['mode'] == 'ensemble':
		# responseEnsemble is the prediction results(bounding boxes) of the ensemble model
		responseEnsemble = []
		responseEnsemble = [ { 'bbox': [1,0,200,200],'class': 'person','score': 0.838 } ]
		response['all'] = responseEnsemble

	return jsonify(response), 201

@app.errorhandler(404)
def not_found(error):
	return make_response(jsonify({'error': 'Not found'}), 404)

# currently not called by anyone
def appendImage(image):
	imageList.append(image)

if __name__ == '__main__':
	app.run(debug=True, host="0.0.0.0")

