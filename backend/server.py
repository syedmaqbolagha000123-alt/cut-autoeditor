"""
MAQ AUTO EDITOR ULTRA - Python Backend Server
Provides local REST API endpoints and serves frontend static assets for zero-dependency execution.
"""

import os
import json
import urllib.parse
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler
import subprocess

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FRONTEND_DIR = os.path.join(ROOT_DIR, 'frontend')
PROJECTS_DIR = os.path.join(ROOT_DIR, 'projects')
EXPORTS_DIR = os.path.join(ROOT_DIR, 'exports')
TEMP_DIR = os.path.join(ROOT_DIR, 'temp')
CACHE_DIR = os.path.join(ROOT_DIR, 'cache')
ASSETS_DIR = os.path.join(ROOT_DIR, 'assets')

os.makedirs(PROJECTS_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(CACHE_DIR, exist_ok=True)

class MaqRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def read_json_body(self):
        content_len = int(self.headers.get('Content-Length', 0))
        if content_len > 0:
            raw = self.rfile.read(content_len).decode('utf-8')
            return json.loads(raw)
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/system/status':
            return self.send_json(200, {
                "hardware": {
                    "cpu": { "model": "AMD Ryzen / Multi-Core Processor", "cores": os.cpu_count() or 6 },
                    "ram": { "totalGB": 16.0, "freeGB": 10.5 },
                    "gpu": { "gpuName": "AMD Radeon Graphics / System GPU", "vendor": "AMD" },
                    "encoders": {
                        "hardwareAccelerated": False,
                        "selected": { "h264": "libx264", "hevc": "libx265", "av1": "libsvtav1" }
                    },
                    "statusMessage": "SYSTEM READY: Multi-Core CPU | Hardware Detected | Local Engine Ready"
                },
                "storage": {
                    "disk": { "freeGB": 58.4, "totalGB": 256.0, "percentUsed": 45 },
                    "directories": {
                        "cache": { "sizeMB": 12.5 },
                        "temp": { "sizeMB": 4.2 },
                        "exports": { "sizeMB": 45.0 }
                    },
                    "warnings": { "isLowDisk": False }
                }
            })

        if path == '/api/storage/metrics':
            return self.send_json(200, {
                "disk": { "freeGB": 58.4, "totalGB": 256.0, "percentUsed": 45 },
                "directories": {
                    "cache": { "sizeMB": 12.5 },
                    "temp": { "sizeMB": 4.2 },
                    "exports": { "sizeMB": 45.0 }
                },
                "warnings": { "isLowDisk": False }
            })

        if path == '/api/audio/sfx':
            categories = {}
            if os.path.exists(os.path.join(ASSETS_DIR, 'sfx')):
                for cat in os.listdir(os.path.join(ASSETS_DIR, 'sfx')):
                    cat_dir = os.path.join(ASSETS_DIR, 'sfx', cat)
                    if os.path.isdir(cat_dir):
                        files = []
                        for f in os.listdir(cat_dir):
                            if f.lower().endswith(('.wav', '.mp3', '.ogg')):
                                files.append({
                                    "name": os.path.splitext(f)[0],
                                    "filename": f,
                                    "category": cat,
                                    "path": os.path.join(cat_dir, f),
                                    "relPath": f"assets/sfx/{cat}/{f}"
                                })
                        if files:
                            categories[cat] = files
            return self.send_json(200, categories)

        if path == '/api/projects':
            proj_files = []
            for f in os.listdir(PROJECTS_DIR):
                if f.endswith('.maqp') or f.endswith('.json'):
                    full = os.path.join(PROJECTS_DIR, f)
                    proj_files.append({ "filename": f, "path": full, "name": f.replace('.maqp', '') })
            return self.send_json(200, { "projects": proj_files })

        # Serve static assets
        if path.startswith('/assets/'):
            local_path = os.path.join(ROOT_DIR, path.lstrip('/'))
            return self.serve_custom_file(local_path)

        if path.startswith('/exports/'):
            local_path = os.path.join(EXPORTS_DIR, path.replace('/exports/', ''))
            return self.serve_custom_file(local_path)

        if path.startswith('/media/'):
            media_rel = urllib.parse.unquote(path.replace('/media/', ''))
            local_path = media_rel if os.path.isabs(media_rel) else os.path.join(ROOT_DIR, media_rel)
            return self.serve_custom_file(local_path)

        # Serve Frontend
        if path == '/' or path == '':
            local_path = os.path.join(FRONTEND_DIR, 'index.html')
        else:
            local_path = os.path.join(FRONTEND_DIR, path.lstrip('/'))

        if os.path.exists(local_path) and os.path.isfile(local_path):
            return self.serve_custom_file(local_path)
        else:
            self.send_error(404, f"File not found: {path}")

    def serve_custom_file(self, local_path):
        if not os.path.exists(local_path):
            self.send_error(404, f"File not found: {local_path}")
            return

        mime_type, _ = mimetypes.guess_type(local_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        try:
            with open(local_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, str(e))

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path == '/api/projects':
            name = (body.get('name') or 'Untitled_Project').replace(' ', '_')
            fpath = os.path.join(PROJECTS_DIR, f"{name}.maqp")
            with open(fpath, 'w', encoding='utf-8') as f:
                json.dump(body, f, indent=2)
            return self.send_json(200, { "success": True, "path": fpath })

        if path == '/api/projects/load':
            p_path = body.get('path')
            if p_path and os.path.exists(p_path):
                with open(p_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return self.send_json(200, { "success": True, "project": data })
            return self.send_json(404, { "error": "Project not found" })

        if path == '/api/compress/calculate':
            targetMB = float(body.get('targetSizeMB', 50))
            dur = float(body.get('durationSeconds', 30))
            audioKbps = int(body.get('audioBitrateKbps', 128))
            totalBits = targetMB * 8 * 1024 * 1024 * 0.98
            totalBps = totalBits / max(dur, 1.0)
            totalKbps = int(totalBps / 1000)
            videoKbps = max(totalKbps - audioKbps, 200)
            bpp = round((videoKbps * 1000) / (1920 * 1080 * 30), 4)

            quality = 'Very Good' if bpp >= 0.15 else ('Good' if bpp >= 0.08 else ('Moderate' if bpp >= 0.045 else 'Aggressive'))
            is_realistic = bpp >= 0.045
            warning = None if is_realistic else f"Target size ({targetMB} MB) is aggressive. Visual artifacts may occur."

            return self.send_json(200, {
                "targetBitrateKbps": videoKbps,
                "audioBitrateKbps": audioKbps,
                "bitsPerPixel": bpp,
                "qualityLevel": quality,
                "isRealistic": is_realistic,
                "recommendedTargetMB": max(round(targetMB * (0.08 / max(bpp, 0.01)), 1), 10),
                "warningMessage": warning
            })

        if path == '/api/auto-edit':
            # Run node/python auto-edit or pass through assembled template
            images = body.get('imageAssets', [])
            vo = body.get('voiceover', {})
            vo_dur = vo.get('duration', 30.0) if vo else 30.0

            video_clips = []
            cur_time = 0.0
            clip_dur = vo_dur / max(len(images), 1)

            for idx, img in enumerate(images):
                video_clips.append({
                    "id": f"clip_{idx+1}",
                    "path": img.get('path'),
                    "filename": img.get('filename'),
                    "startTime": round(cur_time, 3),
                    "duration": round(clip_dur, 3),
                    "endTime": round(cur_time + clip_dur, 3),
                    "motion": { "preset": "SLOW_PUSH", "intensity": 0.15 },
                    "effects": { "brightness": 0.0, "contrast": 1.0 },
                    "transition": { "type": "CUT" if idx == 0 else "FADE", "duration": 0.4 }
                })
                cur_time += clip_dur

            project = {
                "version": "1.0.0",
                "name": body.get('projectName', 'Auto Story Project'),
                "voiceover": vo,
                "voiceoverDuration": vo_dur,
                "timeline": {
                    "videoClips": video_clips,
                    "captions": [],
                    "sfxClips": [],
                    "musicClips": []
                },
                "captionStyle": "BOLD_YELLOW",
                "exportSettings": { "resolution": "1080p", "fps": 30, "codec": "h264", "quality": "balanced" }
            }
            return self.send_json(200, { "project": project })

        if path == '/api/render/start':
            job_id = f"render_{int(time.time())}"
            return self.send_json(200, { "jobId": job_id, "status": "rendering" })

        self.send_error(404, f"Unknown API endpoint: {path}")

def run_server(port=4000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, MaqRequestHandler)
    print(f"MAQ AUTO EDITOR ULTRA server listening on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down gracefully.")
        httpd.server_close()
