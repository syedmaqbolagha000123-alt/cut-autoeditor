/**
 * MAQ AUTO EDITOR ULTRA - Local Application Launcher
 * Boots the local backend server, checks port availability, and automatically launches the desktop browser UI.
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 4000;
const URL = `http://localhost:${PORT}`;

console.log('===========================================================');
console.log('       MAQ AUTO EDITOR ULTRA - LOCAL DESKTOP LAUNCHER      ');
console.log('===========================================================');
console.log(`[1/3] Starting backend engine on ${URL}...`);

// Start backend server
require('./backend/server.js');

function openBrowser(targetUrl) {
  const platform = process.platform;
  let cmd = '';

  if (platform === 'win32') {
    cmd = `start "" "${targetUrl}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${targetUrl}"`;
  } else {
    cmd = `xdg-open "${targetUrl}" 2>/dev/null || sensible-browser "${targetUrl}" 2>/dev/null || true`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(`Please open your browser manually at: ${targetUrl}`);
    } else {
      console.log(`[3/3] Desktop UI opened successfully in browser: ${targetUrl}`);
    }
  });
}

// Poll server until ready, then open browser
let attempts = 0;
const checkInterval = setInterval(() => {
  attempts++;
  http.get(URL, (res) => {
    if (res.statusCode === 200) {
      clearInterval(checkInterval);
      console.log(`[2/3] Backend server is healthy (HTTP 200 OK).`);
      openBrowser(URL);
    }
  }).on('error', () => {
    if (attempts > 30) {
      clearInterval(checkInterval);
      console.error('Server startup timed out.');
    }
  });
}, 400);
