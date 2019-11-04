import base64

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
