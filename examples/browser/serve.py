#!/usr/bin/env python3
"""
Simple HTTP server with COOP/COEP headers for SharedArrayBuffer support.
Run from the examples/browser directory:
    python3 serve.py
Then open http://localhost:8000/
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import sys

class COOPCOEPHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'credentialless')
        super().end_headers()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f'Starting server with COOP/COEP headers on http://localhost:{port}/')
    print('Press Ctrl+C to stop')
    HTTPServer(('localhost', port), COOPCOEPHandler).serve_forever()
