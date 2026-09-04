/**
 * MAQ AUTO EDITOR ULTRA - Zero-Dependency Local HTTP & WebSocket Server Engine
 * Works out of the box with standard Node.js without requiring npm install.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

require('./utils/bin-locator');

const HardwareDetector = require('./services/hardware-detector.service');
const StorageService = require('./services/storage.service');
const MAQFlowImporter = require('./services/maqflow-importer.service');
const TimelineBuilder = require('./services/timeline-builder.service');
const AutoEditService = require('./services/auto-edit.service');
const RenderJobService = require('./services/render-job.service');
const CompressionService = require('./services/compression.service');
const SmartSFXService = require('./services/smart-sfx.service');
const CaptionService = require('./services/caption.service');
const SmartTransitions = require('./services/smart-transitions.service');
const SmartTextOverlay = require('./services/smart-text-overlay.service');
const AuthService = require('./services/auth.service');
const TimestampParser = require('./utils/timestamp-parser');
const FilenameParser = require('./utils/filename-parser');
const { FileValidator } = require('./utils/file-validator');
const Logger = require('./utils/logger');
const logger = new Logger('Server');

const PORT = process.env.PORT || 4000;
const ROOT_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

// MIME Types Map
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.ass': 'text/plain',
  '.srt': 'text/plain',
  '.vtt': 'text/vtt'
};

// Parse JSON request body helper
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', err => reject(err));
  });
}

// Read raw binary request body helper
function readBinaryBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => { resolve(Buffer.concat(chunks)); });
    req.on('error', err => reject(err));
  });
}

// Send JSON response helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Send Static File Helper with Range Requests for Audio/Video Streaming
function serveStaticFile(req, res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`File not found: ${path.basename(filePath)}`);
    return;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return serveStaticFile(req, res, indexPath);
    }
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Directory listing forbidden.');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Support HTTP range requests for smooth media preview playback
  const range = req.headers.range;
  if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  try {
    // API Routes
    if (pathname.startsWith('/api/')) {
      // 1. System & Hardware
      if (pathname === '/api/system/status' && method === 'GET') {
        const hardware = HardwareDetector.getSystemInfo();
        const storage = StorageService.getStorageMetrics();
        return sendJson(res, 200, { hardware, storage });
      }

      // 2. Storage Manager
      if (pathname === '/api/storage/metrics' && method === 'GET') {
        return sendJson(res, 200, StorageService.getStorageMetrics());
      }
      if (pathname === '/api/storage/clear-cache' && method === 'POST') {
        return sendJson(res, 200, StorageService.clearCache());
      }
      if (pathname === '/api/storage/clear-temp' && method === 'POST') {
        return sendJson(res, 200, StorageService.clearTemp());
      }

      // 3. Projects CRUD
      if (pathname === '/api/projects' && method === 'GET') {
        const projDir = StorageService.projectsDir;
        const files = fs.readdirSync(projDir)
          .filter(f => f.endsWith('.maqp') || f.endsWith('.json'))
          .map(f => {
            const pPath = path.join(projDir, f);
            const stat = fs.statSync(pPath);
            let meta = { name: f.replace('.maqp', '') };
            try {
              const content = JSON.parse(fs.readFileSync(pPath, 'utf8'));
              meta.name = content.name || meta.name;
              meta.updatedAt = content.updatedAt || stat.mtime.toISOString();
              meta.clipCount = content.timeline?.videoClips?.length || 0;
            } catch (e) {}
            return { filename: f, path: pPath, size: stat.size, mtime: stat.mtime, ...meta };
          });
        return sendJson(res, 200, { projects: files });
      }

      if (pathname === '/api/projects' && method === 'POST') {
        const projectData = await readJsonBody(req);
        const name = (projectData.name || 'Untitled_Project').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `${name}.maqp`;
        const filePath = path.join(StorageService.projectsDir, filename);

        projectData.updatedAt = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2), 'utf8');
        logger.info(`Saved project file: ${filePath}`);
        return sendJson(res, 200, { success: true, path: filePath, filename });
      }

      if (pathname.startsWith('/api/projects/load') && method === 'POST') {
        const { path: pPath } = await readJsonBody(req);
        if (!pPath) {
          return sendJson(res, 400, { error: 'Project path is required.' });
        }
        let resolvedPath = pPath;
        if (!fs.existsSync(resolvedPath)) {
          resolvedPath = path.resolve(__dirname, '..', pPath);
        }
        if (!fs.existsSync(resolvedPath)) {
          return sendJson(res, 404, { error: 'Project file not found.' });
        }
        const data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        return sendJson(res, 200, { success: true, project: data });
      }

      // 4. Timestamp & Filename Parsers
      if (pathname === '/api/parser/timestamp' && method === 'POST') {
        const { input } = await readJsonBody(req);
        return sendJson(res, 200, TimestampParser.parse(input));
      }
      if (pathname === '/api/parser/filename' && method === 'POST') {
        const { filename } = await readJsonBody(req);
        return sendJson(res, 200, FilenameParser.parse(filename));
      }

      // 5. MAQFLOW & Media Upload/Import
      if (pathname === '/api/media/upload' && method === 'POST') {
        const contentType = req.headers['content-type'] || '';
        let filename = parsedUrl.query.filename || (req.headers['x-filename'] ? decodeURIComponent(req.headers['x-filename']) : null) || 'upload.dat';
        let buffer;
        if (contentType.includes('application/json')) {
          const jsonBody = await readJsonBody(req);
          filename = jsonBody.filename || filename;
          buffer = Buffer.from(jsonBody.data, 'base64');
        } else {
          buffer = await readBinaryBody(req);
        }
        const result = StorageService.saveUploadedFile(filename, buffer);
        return sendJson(res, 200, { success: true, ...result });
      }

      if (pathname === '/api/media/import-folder' && method === 'POST') {
        const { folderPath } = await readJsonBody(req);
        const result = MAQFlowImporter.importFolder(folderPath);
        return sendJson(res, 200, result);
      }
      if (pathname === '/api/media/import-zip' && method === 'POST') {
        const { zipPath } = await readJsonBody(req);
        const result = MAQFlowImporter.importZip(zipPath, StorageService.cacheDir);
        return sendJson(res, 200, result);
      }

      // 6. Timeline Construction
      if (pathname === '/api/timeline/build' && method === 'POST') {
        const { imageAssets, voiceoverDuration, options } = await readJsonBody(req);
        const clips = TimelineBuilder.buildVideoClips(imageAssets, voiceoverDuration, options);
        return sendJson(res, 200, { clips });
      }
      if (pathname === '/api/timeline/adjust-duration' && method === 'POST') {
        const { clips, clipId, newDuration, ripple } = await readJsonBody(req);
        const updated = TimelineBuilder.adjustClipDuration(clips, clipId, newDuration, ripple);
        return sendJson(res, 200, { clips: updated });
      }

      // 7. SFX & Audio
      if (pathname === '/api/audio/sfx' && method === 'GET') {
        return sendJson(res, 200, SmartSFXService.getAvailableSFX());
      }
      if (pathname === '/api/audio/suggest-sfx' && method === 'POST') {
        const { clips, captions, options } = await readJsonBody(req);
        const suggestions = SmartSFXService.suggestSFX(clips, captions, options);
        return sendJson(res, 200, { suggestions });
      }

      // 8. Captions
      if (pathname === '/api/captions/parse' && method === 'POST') {
        const { content, format } = await readJsonBody(req);
        let parsed = [];
        if (format === 'srt' || content.includes('-->')) parsed = CaptionService.parseSRT(content);
        else if (format === 'vtt') parsed = CaptionService.parseVTT(content);
        else parsed = CaptionService.parseTXT(content);
        return sendJson(res, 200, { captions: parsed });
      }

      // 9. Auto Edit 1-Click
      if (pathname === '/api/auto-edit' && method === 'POST') {
        const payload = await readJsonBody(req);
        const project = AutoEditService.runAutoEdit(payload);
        return sendJson(res, 200, { project });
      }

      // 10. Render Engine
      if (pathname === '/api/render/start' && method === 'POST') {
        const { project, exportSettings } = await readJsonBody(req);
        const job = RenderJobService.startRender(project, exportSettings, {
          onProgress: (j) => broadcastWS({ type: 'render_progress', job: j }),
          onComplete: (r) => broadcastWS({ type: 'render_complete', record: r }),
          onError: (e) => broadcastWS({ type: 'render_error', error: e })
        });
        return sendJson(res, 200, { jobId: job.id, status: job.status });
      }

      if (pathname.startsWith('/api/render/jobs/') && method === 'GET') {
        const jobId = pathname.split('/').pop();
        const job = RenderJobService.getJob(jobId);
        if (!job) return sendJson(res, 404, { error: 'Job not found' });
        return sendJson(res, 200, {
          jobId: job.id,
          status: job.status,
          stage: job.stage,
          progressPercent: job.progressPercent,
          currentFrame: job.currentFrame,
          totalFrames: job.totalFrames,
          fps: job.fps,
          elapsedSeconds: job.elapsedSeconds,
          remainingSecondsEstimate: job.remainingSecondsEstimate,
          error: job.error
        });
      }

      if (pathname.startsWith('/api/render/jobs/') && pathname.endsWith('/cancel') && method === 'POST') {
        const parts = pathname.split('/');
        const jobId = parts[parts.length - 2];
        const success = RenderJobService.cancelRender(jobId);
        return sendJson(res, 200, { success });
      }

      if (pathname === '/api/render/history' && method === 'GET') {
        return sendJson(res, 200, { history: RenderJobService.getExportHistory() });
      }

      // 11. Smart Compression
      if (pathname === '/api/compress/calculate' && method === 'POST') {
        const params = await readJsonBody(req);
        const calc = CompressionService.calculateTargetBitrate(params);
        return sendJson(res, 200, calc);
      }
      if (pathname === '/api/compress/sample' && method === 'POST') {
        const { inputPath, targetSizeMB } = await readJsonBody(req);
        const sample = CompressionService.generateSample(inputPath, targetSizeMB);
        return sendJson(res, 200, sample);
      }
      if (pathname === '/api/compress/start' && method === 'POST') {
        const options = await readJsonBody(req);
        const result = await CompressionService.compressVideo(options);
        return sendJson(res, 200, result);
      }

      // 12. Smart Transitions
      if (pathname === '/api/transitions/apply-smart' && method === 'POST') {
        const { clips, options } = await readJsonBody(req);
        const updated = SmartTransitions.applySmartTransitions(clips, options);
        return sendJson(res, 200, { clips: updated });
      }

      // 13. Smart Text Overlays
      if (pathname === '/api/overlays/generate' && method === 'POST') {
        const { clips, captions, options } = await readJsonBody(req);
        const overlays = SmartTextOverlay.generateOverlays(clips, captions, options);
        return sendJson(res, 200, { overlays });
      }

      // 14. MAQFLOW Chrome Extension Integration Bridge (Section 11)
      if (pathname === '/api/maqflow/status' && method === 'GET') {
        return sendJson(res, 200, {
          status: 'ready',
          app: 'MAQ AUTO EDITOR ULTRA',
          version: '1.0.0',
          bridge: 'active',
          port: PORT,
          features: ['auto_edit', 'smart_sfx', 'smart_transitions', 'smart_overlays']
        });
      }

      if (pathname === '/api/maqflow/push' && method === 'POST') {
        const payload = await readJsonBody(req);
        logger.info('Received scene payload from MAQFLOW Chrome Extension', {
          sceneCount: payload.manifest?.scenes?.length || payload.scenes?.length || 0
        });

        let imageAssets = [];
        if (payload.folderPath) {
          const imported = MAQFlowImporter.importFolder(payload.folderPath);
          imageAssets = imported.assets;
        } else if (payload.scenes) {
          imageAssets = payload.scenes;
        }

        const autoProject = AutoEditService.runAutoEdit({
          projectName: payload.projectName || 'MAQFLOW Story Project',
          voiceover: payload.voiceover || null,
          imageAssets,
          transcriptContent: payload.transcript || null,
          presetKey: payload.presetKey || 'CINEMATIC',
          backgroundMusic: payload.backgroundMusic || null,
          enableSmartOverlays: payload.enableSmartOverlays !== false
        });

        broadcastWS({ type: 'maqflow_imported', project: autoProject });
        return sendJson(res, 200, { success: true, project: autoProject });
      }

      // 15. License & Role Tier (Section 12)
      if (pathname === '/api/auth/status' && method === 'GET') {
        return sendJson(res, 200, AuthService.getTierInfo());
      }
      if (pathname === '/api/auth/tier' && method === 'POST') {
        const { tier } = await readJsonBody(req);
        AuthService.setTier(tier);
        return sendJson(res, 200, AuthService.getTierInfo());
      }

      // 16. Native Save / Export File Download (Section 15)
      if ((pathname.startsWith('/api/render/download') || pathname.startsWith('/api/render/jobs/') && pathname.endsWith('/download')) && method === 'GET') {
        const parts = pathname.split('/');
        let jobId = parsedUrl.query.jobId;
        if (!jobId) {
          if (parts[parts.length - 1] === 'download') {
            jobId = parts[parts.length - 2];
          } else {
            jobId = parts[parts.length - 1];
          }
        }
        const job = RenderJobService.getJob(jobId);
        if (!job || !fs.existsSync(job.outputPath)) {
          return sendJson(res, 404, { error: 'Rendered video file not found or not ready.' });
        }
        const stat = fs.statSync(job.outputPath);
        res.writeHead(200, {
          'Content-Length': stat.size,
          'Content-Type': 'video/mp4',
          'Content-Disposition': `attachment; filename="${job.filename}"`,
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(job.outputPath).pipe(res);
        return;
      }
    }

    // Static Asset & Frontend Serving
    if (pathname.startsWith('/shared/')) {
      const sharedPath = path.join(ROOT_DIR, pathname);
      return serveStaticFile(req, res, sharedPath);
    }
    if (pathname.startsWith('/assets/')) {
      const assetPath = path.join(ROOT_DIR, pathname);
      return serveStaticFile(req, res, assetPath);
    }
    if (pathname.startsWith('/exports/')) {
      const expPath = path.join(StorageService.exportsDir, pathname.replace('/exports/', ''));
      return serveStaticFile(req, res, expPath);
    }
    if (pathname.startsWith('/temp/')) {
      const tmpPath = path.join(StorageService.tempDir, pathname.replace('/temp/', ''));
      return serveStaticFile(req, res, tmpPath);
    }
    if (pathname.startsWith('/demo-project/')) {
      const demoPath = path.join(ROOT_DIR, pathname);
      return serveStaticFile(req, res, demoPath);
    }
    if (pathname.startsWith('/media/')) {
      const mediaRel = decodeURIComponent(pathname.replace('/media/', ''));
      const fullMedia = path.isAbsolute(mediaRel) ? mediaRel : path.join(ROOT_DIR, mediaRel);
      return serveStaticFile(req, res, fullMedia);
    }

    // Serve Frontend Files
    let localFilePath = path.join(FRONTEND_DIR, pathname === '/' ? 'index.html' : pathname);
    serveStaticFile(req, res, localFilePath);

  } catch (err) {
    logger.error(`Error processing request: ${req.url}`, { message: err.message, stack: err.stack });
    sendJson(res, 500, { error: err.message || 'Internal server error.' });
  }
});

// Optional WebSocket setup (gracefully handles if 'ws' package is not installed)
let wss = null;
const connectedClients = new Set();

try {
  const WebSocketModule = require('ws');
  wss = new WebSocketModule.Server({ server });
  wss.on('connection', (socket) => {
    connectedClients.add(socket);
    socket.on('close', () => connectedClients.delete(socket));
    socket.send(JSON.stringify({
      type: 'system_connected',
      message: 'Connected to MAQ Auto Editor Ultra local daemon'
    }));
  });
} catch (e) {
  // If ws is not installed, client polling automatically handles progress
}

function broadcastWS(data) {
  if (!wss) return;
  const msg = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` MAQ AUTO EDITOR ULTRA SERVER RUNNING ON PORT ${PORT}`);
  console.log(` Local UI: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});

module.exports = { server, wss, broadcastWS };
