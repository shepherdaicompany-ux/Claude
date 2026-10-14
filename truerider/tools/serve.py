"""Local preview server with SPA fallback (same behaviour as .htaccess on the hosting).
Usage: python3 tools/serve.py [port]  -> http://localhost:8080"""
import http.server, os, sys, functools
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public_html')
class H(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) and '.' not in os.path.basename(self.path.split('?')[0]):
            self.path = '/index.html'
        return super().send_head()
    def log_message(self, *a):
        pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(H, directory=ROOT)).serve_forever()
