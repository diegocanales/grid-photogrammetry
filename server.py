import http.server
import socketserver
import os
from urllib.parse import urlparse, parse_qs

# Configure the server
PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def do_GET(self):
        # Parse the URL and query parameters
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        
        # Serve the index.html file for the root path
        if path == "/" or path == "":
            self.path = "/index.html"
        
        return http.server.SimpleHTTPRequestHandler.do_GET(self)
    
    def log_message(self, format, *args):
        # Safely format the log message without assuming args length
        message = f"[SERVER] {format % args}"
        print(message)

def run_server():
    with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print(f"Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    run_server()
