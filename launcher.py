"""
MAQ AUTO EDITOR ULTRA - Universal Python Launcher
Boots local backend, checks ports, and opens the default browser UI automatically.
"""

import os
import sys
import webbrowser
import threading
import time
import urllib.request
import subprocess

PORT = int(os.environ.get('PORT', 4000))
URL = f"http://localhost:{PORT}"

def check_and_open():
    for _ in range(30):
        time.sleep(0.5)
        try:
            with urllib.request.urlopen(URL, timeout=1) as response:
                if response.status == 200:
                    print(f"\n[OK] Backend server is running at {URL}")
                    print(f"[OK] Opening browser automatically...\n")
                    webbrowser.open(URL)
                    break
        except Exception:
            pass

if __name__ == '__main__':
    print("===========================================================")
    print("       MAQ AUTO EDITOR ULTRA - DESKTOP LAUNCHER           ")
    print("===========================================================")
    print(f"Starting server on {URL}...")

    # Start browser opener in background thread
    threading.Thread(target=check_and_open, daemon=True).start()

    # Import and run server
    from backend.server import run_server
    run_server(PORT)
