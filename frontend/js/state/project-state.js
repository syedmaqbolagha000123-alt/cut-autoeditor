/**
 * MAQ AUTO EDITOR ULTRA - Project State Store & Undo/Redo Engine
 */

class ProjectState {
  constructor() {
    this.project = this.createDefaultProject();
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 40;
    this.listeners = [];
  }

  createDefaultProject() {
    return {
      version: '1.0.0',
      id: `proj_${Date.now()}`,
      name: 'Storytelling Project 1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      voiceover: null,
      voiceoverDuration: 0,
      imageAssets: [],
      timeline: {
        videoClips: [],
        captions: [],
        sfxClips: [],
        musicClips: []
      },
      audioSettings: {
        duckingStrengthDB: -18,
        voiceoverVolume: 1.0,
        musicVolume: 0.35,
        sfxVolume: 0.75
      },
      captionStyle: 'BOLD_YELLOW',
      exportSettings: {
        resolution: '1080p',
        fps: 30,
        codec: 'h264',
        quality: 'balanced',
        audioBitrate: '128k',
        useHardwareAcceleration: true
      }
    };
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.project));
  }

  pushState() {
    this.undoStack.push(JSON.stringify(this.project));
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length === 0) return;
    this.redoStack.push(JSON.stringify(this.project));
    const previous = this.undoStack.pop();
    this.project = JSON.parse(previous);
    this.notify();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    this.undoStack.push(JSON.stringify(this.project));
    const next = this.redoStack.pop();
    this.project = JSON.parse(next);
    this.notify();
  }

  setProject(newProject) {
    this.pushState();
    this.project = newProject;
    this.notify();
  }

  setVoiceover(voObj) {
    this.pushState();
    this.project.voiceover = voObj;
    this.project.voiceoverDuration = voObj.duration || 0;
    this.notify();
  }

  addImageAssets(assets) {
    this.pushState();
    this.project.imageAssets.push(...assets);
    this.notify();
  }

  updateVideoClips(clips) {
    this.pushState();
    this.project.timeline.videoClips = clips;
    this.notify();
  }

  updateClip(clipId, updates) {
    this.pushState();
    const clip = this.project.timeline.videoClips.find(c => c.id === clipId);
    if (clip) {
      Object.assign(clip, updates);
      this.notify();
    }
  }

  setCaptions(captions) {
    this.pushState();
    this.project.timeline.captions = captions;
    this.notify();
  }

  addSFXClip(sfx) {
    this.pushState();
    this.project.timeline.sfxClips.push(sfx);
    this.notify();
  }

  addMusicClip(music) {
    this.pushState();
    this.project.timeline.musicClips.push(music);
    this.notify();
  }
}

const projectStore = new ProjectState();
