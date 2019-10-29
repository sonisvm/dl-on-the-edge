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

from flask import Flask
from flask_cors import CORS
from flask import request
from flask import jsonify

app = Flask(__name__)
CORS(app)

@app.route('/detect_objects', methods = ['POST'])
def postJsonHandler():
    content = request.get_json()['data']
    return jsonify([{'bbox':[0,0,200,200], 'class':'person', 'score': 0.838}])

app.run(host='0.0.0.0', port= 8000)
