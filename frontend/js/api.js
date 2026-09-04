/**
 * MAQ AUTO EDITOR ULTRA - Client API & WebSocket Manager
 */

class ApiClient {
  static async request(endpoint, options = {}) {
    try {
      const res = await fetch(endpoint, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      console.error(`API Request Error [${endpoint}]:`, e);
      throw e;
    }
  }

  static getSystemStatus() {
    return this.request('/api/system/status');
  }

  static getStorageMetrics() {
    return this.request('/api/storage/metrics');
  }

  static clearCache() {
    return this.request('/api/storage/clear-cache', { method: 'POST' });
  }

  static clearTemp() {
    return this.request('/api/storage/clear-temp', { method: 'POST' });
  }

  static getProjects() {
    return this.request('/api/projects');
  }

  static saveProject(project) {
    return this.request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    });
  }

  static loadProject(filePath) {
    return this.request('/api/projects/load', {
      method: 'POST',
      body: JSON.stringify({ path: filePath })
    });
  }

  static importFolder(folderPath) {
    return this.request('/api/media/import-folder', {
      method: 'POST',
      body: JSON.stringify({ folderPath })
    });
  }

  static importZip(zipPath) {
    return this.request('/api/media/import-zip', {
      method: 'POST',
      body: JSON.stringify({ zipPath })
    });
  }

  static async uploadMediaFile(file) {
    const filename = file.name || 'upload.dat';
    const res = await fetch(`/api/media/upload?filename=${encodeURIComponent(filename)}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-Filename': encodeURIComponent(filename)
      },
      body: file
    });
    if (!res.ok) {
      throw new Error(`Upload failed for ${filename}: HTTP ${res.status}`);
    }
    return res.json();
  }

  static buildTimeline(imageAssets, voiceoverDuration, options = {}) {
    return this.request('/api/timeline/build', {
      method: 'POST',
      body: JSON.stringify({ imageAssets, voiceoverDuration, options })
    });
  }

  static getAvailableSFX() {
    return this.request('/api/audio/sfx');
  }

  static suggestSFX(clips, captions, options = {}) {
    return this.request('/api/audio/suggest-sfx', {
      method: 'POST',
      body: JSON.stringify({ clips, captions, options })
    });
  }

  static parseCaptions(content, format = 'srt') {
    return this.request('/api/captions/parse', {
      method: 'POST',
      body: JSON.stringify({ content, format })
    });
  }

  static runAutoEdit(payload) {
    return this.request('/api/auto-edit', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static startRender(project, exportSettings) {
    return this.request('/api/render/start', {
      method: 'POST',
      body: JSON.stringify({ project, exportSettings })
    });
  }

  static getRenderJob(jobId) {
    return this.request(`/api/render/jobs/${jobId}`);
  }

  static cancelRender(jobId) {
    return this.request(`/api/render/jobs/${jobId}/cancel`, { method: 'POST' });
  }

  static calculateCompression(params) {
    return this.request('/api/compress/calculate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  static generateCompressionSample(inputPath, targetSizeMB) {
    return this.request('/api/compress/sample', {
      method: 'POST',
      body: JSON.stringify({ inputPath, targetSizeMB })
    });
  }

  static compressVideo(options) {
    return this.request('/api/compress/start', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  static applySmartTransitions(clips, options = {}) {
    return this.request('/api/transitions/apply-smart', {
      method: 'POST',
      body: JSON.stringify({ clips, options })
    });
  }

  static generateSmartOverlays(captions, options = {}) {
    return this.request('/api/overlays/generate', {
      method: 'POST',
      body: JSON.stringify({ captions, options })
    });
  }

  static getAuthStatus() {
    return this.request('/api/auth/status');
  }

  static setAuthTier(tier) {
    return this.request('/api/auth/tier', {
      method: 'POST',
      body: JSON.stringify({ tier })
    });
  }

  static getMaqflowStatus() {
    return this.request('/api/maqflow/status');
  }
}

// WebSocket Live Event Hub
class WebSocketHub {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  init() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
        } catch (e) {}
      };
      this.socket.onclose = () => {
        setTimeout(() => this.init(), 3000);
      };
    } catch (e) {
      console.warn('WebSocket connection fallback active.');
    }
  }

  on(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }

  emit(type, data) {
    const handlers = this.listeners.get(type) || [];
    handlers.forEach(fn => fn(data));
  }
}

const wsHub = new WebSocketHub();
wsHub.init();
