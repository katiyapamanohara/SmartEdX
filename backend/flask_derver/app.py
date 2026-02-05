from flask import Flask, request, jsonify, Response
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

SAAS_SERVICE_URL = os.getenv('SAAS_SERVICE_URL', 'http://localhost:5002')
GATEWAY_SECRET = os.getenv('GATEWAY_SECRET')
PORT = int(os.getenv('PORT', 5001))

@app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
def proxy(path):
    # Construct target URL
    target_url = f"{SAAS_SERVICE_URL}/{path}"
    
    # Prepare headers (inject secret)
    headers = {
        'X-Gateway-Secret': GATEWAY_SECRET,
        'Content-Type': request.headers.get('Content-Type'),
        'Authorization': request.headers.get('Authorization')
    }
    
    # Filter out None headers
    headers = {k: v for k, v in headers.items() if v is not None}

    try:
        # Forward the request
        resp = requests.request(
            method=request.method,
            url=target_url,
            headers=headers,
            data=request.get_data(),
            cookies=request.cookies,
            params=request.args
        )

        # Exclude some hop-by-hop headers
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [
            (name, value) for (name, value) in resp.raw.headers.items()
            if name.lower() not in excluded_headers
        ]

        return Response(resp.content, resp.status_code, headers)

    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Service unavailable'}), 503

if __name__ == '__main__':
    print(f"🚀 API Gateway running on port {PORT}")
    print(f"👉 Proxying to {SAAS_SERVICE_URL}")
    app.run(port=PORT, debug=True)
