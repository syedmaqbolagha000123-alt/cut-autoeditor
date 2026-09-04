/**
 * MAQ AUTO EDITOR ULTRA - Master Application Coordinator & Universal Drag/Drop Engine
 */

// Global Studio State Variables (hoisted and immediately available everywhere)
var currentWorkspaceMode = 'creator';
var currentCreatorStep = 1;
if (typeof window !== 'undefined') {
  window.currentWorkspaceMode = currentWorkspaceMode;
  window.currentCreatorStep = currentCreatorStep;
}

// Toast Notification Manager
class ToastSystem {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  show(message, type = 'info', durationMs = 3500) {
    if (!this.container) return;
    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let icon = 'ℹ';
    if (type === 'success') icon = '✓';
    if (type === 'warning') icon = '⚠';
    if (type === 'error') icon = '✕';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 250);
    }, durationMs);
  }
}

// Global Audio Preview Player
class AudioPreviewPlayer {
  constructor() {
    this.audio = new Audio();
    this.currentPlayingBtn = null;
    this.audio.onended = () => this.stop();
  }

  play(src, triggerBtn) {
    if (this.currentPlayingBtn === triggerBtn && !this.audio.paused) {
      this.stop();
      return;
    }

    this.stop();
    this.currentPlayingBtn = triggerBtn;
    if (triggerBtn) {
      triggerBtn.textContent = '⏹';
      triggerBtn.classList.add('playing');
    }

    const resolved = src.startsWith('http') || src.startsWith('/')
      ? src
      : `/${src.replace(/^\/+/, '')}`;
    this.audio.src = resolved;
    this.audio.play().catch((err) => {
      console.warn('Audio preview error:', err);
      this.stop();
    });
  }

  stop() {
    this.audio.pause();
    if (this.currentPlayingBtn) {
      this.currentPlayingBtn.textContent = '▶';
      this.currentPlayingBtn.classList.remove('playing');
      this.currentPlayingBtn = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const safeRun = (name, fn) => {
    try {
      fn();
    } catch (err) {
      console.warn(`[Subsystem init warning: ${name}]:`, err);
    }
  };

  // 1. Core UI Systems (Priority 1: All Buttons, File Dialogs, and Step Tabs MUST Work Instantly)
  safeRun('initToast', () => { window.toastSystem = new ToastSystem('toastContainer'); });
  safeRun('initAudioPreviewer', () => { window.audioPreviewer = new AudioPreviewPlayer(); });
  safeRun('initModeSwitcher', () => initModeSwitcher());
  safeRun('initCreatorMode', () => initCreatorMode());
  safeRun('initFileInputTriggers', () => initFileInputTriggers());

  // 2. Viewport Canvas & Story Studio Preview
  safeRun('initPreviewPlayer', () => {
    window.previewPlayer = new PreviewEngine('previewCanvas', 'captionOverlay');
  });

  // 3. Resilient Fallbacks for Timeline & Inspector (Graceful in Single-Studio Architecture)
  safeRun('initTimelineAndInspector', () => {
    const scrollStage = document.getElementById('timelineScrollStage');
    if (scrollStage && typeof TimelineComponent !== 'undefined') {
      window.timelineComponent = new TimelineComponent(
        'timelineScrollStage',
        'timelineRuler',
        'timelinePlayheadLine',
        'timelineLanesContainer'
      );
    } else {
      window.timelineComponent = {
        render: () => {},
        splitAtPlayhead: () => {},
        deleteSelectedClip: () => {},
        duplicateSelectedClip: () => {}
      };
    }

    const inspContent = document.getElementById('inspectorContent');
    if (inspContent && typeof InspectorComponent !== 'undefined') {
      window.inspector = new InspectorComponent('inspectorContent', 'inspectorHeaderTitle', 'inspectorTypeBadge');
    } else {
      window.inspector = { render: () => {} };
    }
  });

  // 4. Project & Timeline State Subscriptions
  safeRun('initStoreSubscriptions', () => {
    projectStore.subscribe(() => {
      window.timelineComponent?.render();
      window.previewPlayer?.renderFrame(timelineStore.currentTime);
      window.inspector?.render();
      updateMediaUI();
      if (typeof updateCreatorModeUI === 'function') updateCreatorModeUI();

      const saveInd = document.getElementById('saveIndicator');
      if (saveInd) {
        saveInd.textContent = '● Unsaved';
        saveInd.className = 'save-indicator unsaved';
      }
    });

    timelineStore.subscribe(() => {
      window.timelineComponent?.render();
      window.inspector?.render();
    });
  });

  // 5. Layout & Universal Drag & Drop
  safeRun('loadPersistedLayout', () => loadPersistedLayout());
  safeRun('initUniversalDragAndDrop', () => initUniversalDragAndDrop());

  // 6. Secondary Controls, Popovers & Catalogs
  safeRun('initPerformancePopover', () => initPerformancePopover());
  safeRun('initTransportControls', () => initTransportControls());
  safeRun('initModalActions', () => initModalActions());
  safeRun('initKeyboardShortcuts', () => initKeyboardShortcuts());
  safeRun('renderCaptionStylePresets', () => renderCaptionStylePresets());
});

// ============================================================
// UNIVERSAL DRAG & DROP ENGINE
// ============================================================
function initUniversalDragAndDrop() {
  // Prevent browser default file open behavior across the entire window
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
  });

  // 1. Voiceover Card Drop Area
  const voDropArea = document.getElementById('voDropArea');
  if (voDropArea) {
    voDropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      voDropArea.style.borderColor = 'var(--accent-primary)';
      voDropArea.style.backgroundColor = 'var(--bg-card-hover)';
    });

    voDropArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      voDropArea.style.borderColor = '';
      voDropArea.style.backgroundColor = '';
    });

    voDropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      voDropArea.style.borderColor = '';
      voDropArea.style.backgroundColor = '';

      const files = Array.from(e.dataTransfer.files);
      const audioFile = files.find(f => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(f.name));
      if (audioFile) {
        processVoiceoverFile(audioFile);
      } else {
        window.toastSystem.show('Please drop a valid audio file (MP3, WAV, M4A).', 'warning');
      }
    });

    voDropArea.addEventListener('click', () => {
      document.getElementById('inputTriggerVoiceover')?.click();
    });
  }

  // 2. Media Drawer & Image Grid Drop Area
  const mediaGrid = document.getElementById('mediaThumbnailsGrid');
  const mediaView = document.getElementById('view-media');
  const emptyMediaState = document.getElementById('emptyMediaState');

  [mediaGrid, mediaView, emptyMediaState].forEach(zone => {
    if (!zone) return;

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.style.outline = '2px dashed var(--accent-primary)';
    });

    zone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      zone.style.outline = '';
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.style.outline = '';

      const files = Array.from(e.dataTransfer.files);
      handleDroppedFileList(files);
    });
  });

  // 3. Main Workspace / Preview Canvas Drop Area
  const canvasContainer = document.getElementById('viewportCanvasContainer');
  if (canvasContainer) {
    canvasContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    canvasContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      handleDroppedFileList(files);
    });
  }

  // 4. Timeline Lanes Drop Area
  const timelineLanes = document.getElementById('timelineLanesContainer');
  if (timelineLanes) {
    timelineLanes.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    timelineLanes.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      handleDroppedFileList(files);
    });
  }
}

// Smart File Classifier on Drop
function handleDroppedFileList(files) {
  if (!files || files.length === 0) return;

  const audioFiles = [];
  const imageFiles = [];
  const zipFiles = [];
  const subtitleFiles = [];

  files.forEach(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'].includes(ext) || f.type.startsWith('audio/')) {
      audioFiles.push(f);
    } else if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(ext) || f.type.startsWith('image/')) {
      imageFiles.push(f);
    } else if (ext === 'zip') {
      zipFiles.push(f);
    } else if (['srt', 'vtt', 'txt'].includes(ext)) {
      subtitleFiles.push(f);
    }
  });

  if (audioFiles.length > 0) {
    processVoiceoverFile(audioFiles[0]);
  }

  if (imageFiles.length > 0) {
    processImageFiles(imageFiles);
  }

  if (subtitleFiles.length > 0) {
    processSubtitleFile(subtitleFiles[0]);
  }

  if (zipFiles.length > 0) {
    window.toastSystem.show(`MAQFLOW ZIP '${zipFiles[0].name}' received. Extracting manifest...`, 'info');
    // Read zip or extract
    processImageFiles(imageFiles);
  }
}

// Process and Load Voiceover (Unified for both Creator & Pro Workspaces)
function processVoiceoverFile(file) {
  handleAudioVoiceoverFile(file);
}

function handleAudioVoiceoverFile(file) {
  if (!file) return;
  const audioUrl = URL.createObjectURL(file);
  const audio = new Audio(audioUrl);

  const applyVoiceover = (dur) => {
    const finalDur = Math.round(dur * 10) / 10 || 30.0;
    projectStore.project.voiceover = {
      filename: file.name,
      path: audioUrl,
      duration: finalDur,
      isBlob: true,
      _file: file
    };
    projectStore.project.voiceoverDuration = finalDur;

    // Recalculate timeline with new voiceover duration if images exist
    if (projectStore.project.imageAssets && projectStore.project.imageAssets.length > 0) {
      const clips = TimelineBuilderService.buildVideoClips(projectStore.project.imageAssets, finalDur);
      projectStore.project.timeline.videoClips = clips;
    }

    projectStore.notify();
    if (typeof updateCreatorModeUI === 'function') updateCreatorModeUI();
    updateMediaUI();
    window.timelineComponent?.render();
    window.previewPlayer?.renderFrame(0);
    window.toastSystem?.show(`🎙 Voiceover '${file.name}' loaded (${finalDur}s).`, 'success');

    // Background upload so file is ready for master rendering
    ApiClient.uploadMediaFile(file)
      .then(res => {
        if (projectStore.project.voiceover && projectStore.project.voiceover.filename === file.name) {
          projectStore.project.voiceover.path = res.path;
          projectStore.project.voiceover.isBlob = false;
        }
      })
      .catch(e => console.warn('[Upload] Voiceover background sync note:', e));
  };

  audio.addEventListener('loadedmetadata', () => {
    applyVoiceover(audio.duration);
  });

  audio.addEventListener('error', () => {
    console.warn('Audio metadata load error, applying fallback duration 30.0s');
    applyVoiceover(30.0);
  });
}

async function ensureProjectAssetsUploaded(project) {
  if (!project) return;
  // 1. Voiceover
  if (project.voiceover && (project.voiceover.path.startsWith('blob:') || project.voiceover.isBlob)) {
    if (project.voiceover._file) {
      window.toastSystem?.show('Preparing voiceover file for master render...', 'info', 1500);
      try {
        const res = await ApiClient.uploadMediaFile(project.voiceover._file);
        project.voiceover.path = res.path;
        project.voiceover.isBlob = false;
      } catch (err) {
        console.warn('Voiceover upload note:', err);
      }
    }
  }

  // 2. Video & Image Clips
  const assets = project.imageAssets || [];
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    if ((a.path.startsWith('blob:') || a.isBlob) && a._file) {
      try {
        const res = await ApiClient.uploadMediaFile(a._file);
        a.path = res.path;
        a.isBlob = false;
        if (project.timeline?.videoClips) {
          project.timeline.videoClips.forEach(c => {
            if (c.id === a.id || c.name === a.filename) {
              c.path = res.path;
            }
          });
        }
      } catch (err) {
        console.warn(`Scene ${i + 1} upload note:`, err);
      }
    }
  }
}

function loadDemoSampleVoiceover() {
  projectStore.project.voiceover = {
    filename: 'voiceover.mp3',
    path: 'demo-project/voiceover.mp3',
    duration: 30.0
  };
  projectStore.project.voiceoverDuration = 30.0;
  if (projectStore.project.imageAssets?.length > 0) {
    const clips = TimelineBuilderService.buildVideoClips(projectStore.project.imageAssets, 30.0);
    projectStore.project.timeline.videoClips = clips;
  }
  projectStore.notify();
  if (typeof updateCreatorModeUI === 'function') updateCreatorModeUI();
  updateMediaUI();
  window.timelineComponent?.render();
  window.previewPlayer?.renderFrame(0);
  window.toastSystem?.show('Sample voiceover narration loaded (30.0s)', 'success');
}

function removeVoiceoverAudio() {
  window.audioPreviewer?.stop();
  projectStore.project.voiceover = null;
  projectStore.project.voiceoverDuration = 0;
  projectStore.notify();
  if (typeof updateCreatorModeUI === 'function') updateCreatorModeUI();
  updateMediaUI();
  window.timelineComponent?.render();
  window.previewPlayer?.renderFrame(0);
  window.toastSystem?.show('Voiceover narration removed', 'info');
}

// Process and Load Images or Videos from Computer
function processImageFiles(files) {
  if (!files || files.length === 0) return;

  const validFiles = files.filter(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    return f.type.startsWith('image/') || f.type.startsWith('video/') ||
      ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'mp4', 'mov', 'webm', 'mkv'].includes(ext);
  });

  if (validFiles.length === 0) {
    window.toastSystem.show('Please select valid image or video files (PNG, JPG, MP4, MOV, WebP).', 'warning');
    return;
  }

  const existingAssets = projectStore.project.imageAssets || [];
  const voDuration = projectStore.project.voiceoverDuration || 30.0;
  const startIdx = existingAssets.length;

  const newAssets = validFiles.map((f, idx) => {
    const parsed = FilenameParser.parse(f.name);
    const overallIdx = startIdx + idx;
    
    // Auto-pace if no explicit timestamp in filename
    const defaultInterval = 4.5;
    const computedSec = +(overallIdx * defaultInterval).toFixed(1);
    const tsSec = parsed.hasTimestamp ? parsed.timestampSeconds : computedSec;
    const displayTs = parsed.hasTimestamp ? parsed.displayTimestamp : TimestampParser.formatSeconds(tsSec);

    const assetObj = {
      id: `asset_${Date.now()}_${overallIdx}_${Math.random().toString(36).substr(2, 4)}`,
      filename: f.name,
      path: URL.createObjectURL(f),
      timestampSeconds: tsSec,
      displayTimestamp: displayTs,
      outputIndex: parsed.outputIndex || 1,
      mediaType: f.type || (['mp4', 'mov', 'webm'].includes(f.name.split('.').pop().toLowerCase()) ? 'video/mp4' : 'image/png'),
      isBlob: true,
      _file: f
    };

    // Asynchronously upload scene to backend for master rendering
    ApiClient.uploadMediaFile(f)
      .then(res => {
        assetObj.path = res.path;
        assetObj.isBlob = false;
        if (projectStore.project.timeline?.videoClips) {
          projectStore.project.timeline.videoClips.forEach(c => {
            if (c.id === assetObj.id || c.name === assetObj.filename) {
              c.path = res.path;
            }
          });
        }
      })
      .catch(e => console.warn(`[Upload] Scene ${f.name} background sync note:`, e));

    return assetObj;
  });

  // Sort assets by timestamp
  const allAssets = [...existingAssets, ...newAssets];
  allAssets.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  projectStore.project.imageAssets = allAssets;

  // Automatically construct & pace video timeline clips
  const clips = TimelineBuilderService.buildVideoClips(allAssets, voDuration);
  projectStore.updateVideoClips(clips);

  window.toastSystem.show(`✓ Added ${newAssets.length} media scenes to timeline!`, 'success');
  updateMediaUI();
  if (typeof updateCreatorModeUI === 'function') updateCreatorModeUI();
  window.timelineComponent?.render();
  window.previewPlayer?.renderFrame(timelineStore.currentTime);
}

function clearAllMedia() {
  projectStore.project.imageAssets = [];
  if (projectStore.project.timeline) {
    projectStore.project.timeline.videoClips = [];
  }
  projectStore.notify();
  if (typeof updateCreatorModeUI === 'function') updateCreatorModeUI();
  updateMediaUI();
  window.timelineComponent?.render();
  window.previewPlayer?.renderFrame(0);
  window.toastSystem?.show('🗑 Cleared all media scenes.', 'info');
}

function createNewProject() {
  if (confirm('Start a fresh new project? This will reset all current media and timeline clips.')) {
    projectStore.setProject({
      version: '1.0.0',
      id: `proj_${Date.now()}`,
      name: 'Untitled Story',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preset: 'CINEMATIC',
      voiceover: null,
      voiceoverDuration: 0,
      imageAssets: [],
      timeline: {
        videoClips: [],
        captions: [],
        textOverlays: [],
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
    });
    setCreatorStep(1);
    window.toastSystem?.show('Started fresh new project!', 'success');
  }
}

// Process and Load Subtitle Transcript
function processSubtitleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    let parsed = [];
    if (file.name.endsWith('.srt') || text.includes('-->')) {
      parsed = CaptionService.parseSRT(text);
    } else if (file.name.endsWith('.vtt')) {
      parsed = CaptionService.parseVTT(text);
    } else {
      parsed = CaptionService.parseTXT(text);
    }
    projectStore.setCaptions(parsed);
    window.toastSystem.show(`Loaded ${parsed.length} subtitles from '${file.name}'.`, 'success');
  };
  reader.readAsText(file);
}

// File Input Trigger Attachments
function initFileInputTriggers() {
  const voInput = document.getElementById('inputTriggerVoiceover');
  const imgInput = document.getElementById('inputTriggerImages');
  const folderInput = document.getElementById('inputTriggerFolder');
  const srtInput = document.getElementById('inputTriggerTranscript');

  // Creator Mode Direct Trigger Attachments
  document.getElementById('btnCreatorBrowseVO')?.addEventListener('click', (e) => {
    e.stopPropagation();
    voInput?.click();
  });

  document.getElementById('btnCreatorBrowseMedia')?.addEventListener('click', (e) => {
    e.stopPropagation();
    imgInput?.click();
  });

  document.getElementById('btnCreatorBrowseFolder')?.addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput?.click();
  });

  // Creator Mode Drop Zones Click Handlers
  document.getElementById('creatorVoDropZone')?.addEventListener('click', (e) => {
    if (e.target.closest('#btnCreatorBrowseVO') || e.target.closest('#btnCreatorLoadDemoVO')) return;
    voInput?.click();
  });

  document.getElementById('creatorMediaDropZone')?.addEventListener('click', (e) => {
    if (e.target.closest('#btnCreatorBrowseMedia') || e.target.closest('#btnCreatorBrowseFolder') || e.target.closest('#btnCreatorLoadDemoMedia')) return;
    imgInput?.click();
  });

  // Top Bar Quick Import Button
  document.getElementById('btnQuickImport')?.addEventListener('click', () => imgInput?.click());

  // Pro Drawer Media Header Buttons
  document.getElementById('btnDrawerAddFiles')?.addEventListener('click', () => imgInput?.click());
  document.getElementById('btnHeaderAddFiles')?.addEventListener('click', () => imgInput?.click());

  // Prominent Drop Card Buttons
  document.getElementById('btnSelectComputerImages')?.addEventListener('click', (e) => {
    e.stopPropagation();
    imgInput?.click();
  });

  document.getElementById('btnDrawerImportFolder')?.addEventListener('click', () => folderInput?.click());
  document.getElementById('btnSelectComputerFolder')?.addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput?.click();
  });

  // Clicking anywhere on the empty media state card opens file picker
  const emptyMedia = document.getElementById('emptyMediaState');
  emptyMedia?.addEventListener('click', (e) => {
    if (e.target.closest('#btnSelectComputerFolder') || e.target.closest('#btnLoadProDemoMedia')) return;
    imgInput?.click();
  });

  // Load sample demo media in Pro Mode
  document.getElementById('btnLoadProDemoMedia')?.addEventListener('click', (e) => {
    e.stopPropagation();
    loadDemoSampleScenes();
  });

  // Load sample demo voiceover in Pro Mode
  document.getElementById('btnProLoadDemoVO')?.addEventListener('click', (e) => {
    e.stopPropagation();
    loadDemoSampleVoiceover();
  });

  // Voiceover Drop Area
  const voDrop = document.getElementById('voDropArea');
  voDrop?.addEventListener('click', (e) => {
    if (e.target.closest('#btnRemoveVoiceover')) return;
    voInput?.click();
  });

  document.getElementById('btnDrawerImportVoiceover')?.addEventListener('click', () => voInput?.click());

  // Input change listeners
  imgInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(Array.from(e.target.files));
      imgInput.value = '';
    }
  });

  folderInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(Array.from(e.target.files));
      folderInput.value = '';
    }
  });

  voInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processVoiceoverFile(e.target.files[0]);
      voInput.value = '';
    }
  });

  srtInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSubtitleFile(e.target.files[0]);
      srtInput.value = '';
    }
  });

  // Voiceover Remove Action
  document.getElementById('btnRemoveVoiceover')?.addEventListener('click', (e) => {
    e.stopPropagation();
    projectStore.project.voiceover = null;
    projectStore.project.voiceoverDuration = 0;
    projectStore.notify();
    window.toastSystem.show('Voiceover removed.', 'info');
  });

  // Auto Pace Button
  document.getElementById('btnAutoPaceTimeline')?.addEventListener('click', () => {
    const voDuration = projectStore.project.voiceoverDuration || 30.0;
    const clips = TimelineBuilderService.buildVideoClips(projectStore.project.imageAssets, voDuration);
    projectStore.updateVideoClips(clips);
    window.toastSystem.show('Timeline synchronized to timestamps.', 'success');
  });
}

function loadDemoSampleScenes() {
  const demoAssets = [
    { id: 'asset_1', filename: '0-03.png', path: 'demo-project/images/0-03.png', timestampSeconds: 3, displayTimestamp: '00:03', outputIndex: 1, mediaType: 'image/png' },
    { id: 'asset_2', filename: '0-07.png', path: 'demo-project/images/0-07.png', timestampSeconds: 7, displayTimestamp: '00:07', outputIndex: 1, mediaType: 'image/png' },
    { id: 'asset_3', filename: '0-12.png', path: 'demo-project/images/0-12.png', timestampSeconds: 12, displayTimestamp: '00:12', outputIndex: 1, mediaType: 'image/png' },
    { id: 'asset_4', filename: '0-18.png', path: 'demo-project/images/0-18.png', timestampSeconds: 18, displayTimestamp: '00:18', outputIndex: 1, mediaType: 'image/png' },
    { id: 'asset_5', filename: '0-24.png', path: 'demo-project/images/0-24.png', timestampSeconds: 24, displayTimestamp: '00:24', outputIndex: 1, mediaType: 'image/png' },
    { id: 'asset_6', filename: '0-30.png', path: 'demo-project/images/0-30.png', timestampSeconds: 30, displayTimestamp: '00:30', outputIndex: 1, mediaType: 'image/png' }
  ];
  projectStore.project.imageAssets = demoAssets;
  const voDuration = projectStore.project.voiceoverDuration || 30.0;
  const clips = TimelineBuilderService.buildVideoClips(demoAssets, voDuration);
  projectStore.updateVideoClips(clips);
  updateMediaUI();
  if (typeof updateCreatorModeUI === 'function') updateCreatorModeUI();
  window.toastSystem.show('Loaded 6 demo scene images into timeline!', 'success');
}

// Resizer Splitter Engine
function initPanelResizers() {
  const resizerLeft = document.getElementById('resizerLeft');
  const resizerRight = document.getElementById('resizerRight');
  const resizerTimeline = document.getElementById('resizerTimeline');

  if (resizerLeft) {
    resizerLeft.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizerLeft.classList.add('dragging');
      const startX = e.clientX;
      const startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--drawer-width'), 10) || 290;

      const onMove = (mv) => {
        const newW = Math.max(180, Math.min(startWidth + (mv.clientX - startX), 480));
        document.documentElement.style.setProperty('--drawer-width', `${newW}px`);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        resizerLeft.classList.remove('dragging');
        localStorage.setItem('maq_drawer_width', document.documentElement.style.getPropertyValue('--drawer-width'));
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  if (resizerRight) {
    resizerRight.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizerRight.classList.add('dragging');
      const startX = e.clientX;
      const startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--inspector-width'), 10) || 290;

      const onMove = (mv) => {
        const newW = Math.max(200, Math.min(startWidth - (mv.clientX - startX), 480));
        document.documentElement.style.setProperty('--inspector-width', `${newW}px`);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        resizerRight.classList.remove('dragging');
        localStorage.setItem('maq_inspector_width', document.documentElement.style.getPropertyValue('--inspector-width'));
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  if (resizerTimeline) {
    resizerTimeline.addEventListener('mousedown', (e) => {
      e.preventDefault();
      resizerTimeline.classList.add('dragging');
      const startY = e.clientY;
      const startHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--timeline-height'), 10) || 250;

      const onMove = (mv) => {
        const newH = Math.max(160, Math.min(startHeight - (mv.clientY - startY), window.innerHeight * 0.55));
        document.documentElement.style.setProperty('--timeline-height', `${newH}px`);
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        resizerTimeline.classList.remove('dragging');
        localStorage.setItem('maq_timeline_height', document.documentElement.style.getPropertyValue('--timeline-height'));
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }
}

function loadPersistedLayout() {
  const dW = localStorage.getItem('maq_drawer_width');
  if (dW) document.documentElement.style.setProperty('--drawer-width', dW);
  const iW = localStorage.getItem('maq_inspector_width');
  if (iW) document.documentElement.style.setProperty('--inspector-width', iW);
  const tH = localStorage.getItem('maq_timeline_height');
  if (tH) document.documentElement.style.setProperty('--timeline-height', tH);
  const isExp = localStorage.getItem('maq_rail_expanded') === 'true';
  if (isExp) document.getElementById('toolRail')?.classList.add('expanded');
}

// Visual Motion Presets Grid
function renderMotionPresets() {
  const grid = document.getElementById('motionPresetsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.values(MOTION_PRESETS).forEach(preset => {
    const card = document.createElement('div');
    card.className = 'preset-card-box';
    card.innerHTML = `
      <span class="preset-icon">${preset.icon}</span>
      <span class="preset-name">${preset.name}</span>
      <span class="preset-desc">${preset.category}</span>
    `;

    card.addEventListener('click', () => {
      grid.querySelectorAll('.preset-card-box').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const selectedId = timelineStore.selectedClipId;
      if (selectedId) {
        projectStore.updateClip(selectedId, { motion: { preset: preset.id, intensity: 0.15 } });
        window.toastSystem.show(`Motion '${preset.name}' applied to clip.`, 'success');
      } else {
        window.toastSystem.show(`Motion '${preset.name}' selected.`, 'info');
      }
    });

    grid.appendChild(card);
  });

  // Apply to all button
  document.getElementById('btnApplyMotionToAll')?.addEventListener('click', () => {
    const activeCard = grid.querySelector('.preset-card-box.active');
    const presetName = activeCard ? activeCard.querySelector('.preset-name').textContent : 'Slow Push In';
    const presetObj = Object.values(MOTION_PRESETS).find(p => p.name === presetName) || MOTION_PRESETS.SLOW_PUSH;

    const clips = projectStore.project.timeline.videoClips || [];
    clips.forEach(c => {
      c.motion = { preset: presetObj.id, intensity: 0.15 };
    });
    projectStore.notify();
    window.toastSystem.show(`Applied motion '${presetObj.name}' to all clips!`, 'success');
  });
}

// Visual Transitions Catalog Grid
function renderTransitionsCatalog() {
  const grid = document.getElementById('transitionsCardGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.values(TRANSITIONS).forEach(trans => {
    const card = document.createElement('div');
    card.className = 'preset-card-box';
    card.innerHTML = `
      <span class="preset-icon">${trans.icon}</span>
      <span class="preset-name">${trans.name}</span>
      <span class="preset-desc">${trans.category} (${trans.defaultDuration}s)</span>
    `;

    card.addEventListener('click', () => {
      grid.querySelectorAll('.preset-card-box').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const selectedId = timelineStore.selectedClipId;
      if (selectedId) {
        projectStore.updateClip(selectedId, { transition: { type: trans.id.toUpperCase(), duration: trans.defaultDuration } });
        window.toastSystem.show(`Transition '${trans.name}' applied.`, 'success');
      }
    });

    grid.appendChild(card);
  });

  document.getElementById('btnApplyTransitionToAll')?.addEventListener('click', () => {
    const activeCard = grid.querySelector('.preset-card-box.active');
    const transName = activeCard ? activeCard.querySelector('.preset-name').textContent : 'Cross Dissolve';
    const transObj = Object.values(TRANSITIONS).find(t => t.name === transName) || TRANSITIONS.FADE;

    const clips = projectStore.project.timeline.videoClips || [];
    clips.forEach((c, idx) => {
      if (idx > 0) c.transition = { type: transObj.id.toUpperCase(), duration: transObj.defaultDuration };
    });
    projectStore.notify();
    window.toastSystem.show(`Applied transition '${transObj.name}' to all scenes!`, 'success');
  });

  document.getElementById('btnSmartMixTransitions')?.addEventListener('click', () => {
    const pool = ['FADE', 'DISSOLVE', 'SLIDE_LEFT', 'SMOOTH_ZOOM'];
    const clips = projectStore.project.timeline.videoClips || [];
    clips.forEach((c, idx) => {
      if (idx === 0) c.transition = { type: 'CUT', duration: 0.0 };
      else {
        const chosen = pool[idx % pool.length];
        c.transition = { type: chosen, duration: 0.4 };
      }
    });
    projectStore.notify();
    window.toastSystem.show('Applied Smart Mix transitions conservatively.', 'success');
  });
}

// Visual Effects Presets Grid
function renderEffectsPresets() {
  const grid = document.getElementById('effectPresetsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.values(EFFECT_PRESETS).forEach(fx => {
    const card = document.createElement('div');
    card.className = 'preset-card-box';
    card.innerHTML = `
      <span class="preset-icon">${fx.icon}</span>
      <span class="preset-name">${fx.name}</span>
      <span class="preset-desc">${fx.category}</span>
    `;

    card.addEventListener('click', () => {
      grid.querySelectorAll('.preset-card-box').forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const selectedId = timelineStore.selectedClipId;
      if (selectedId) {
        projectStore.updateClip(selectedId, {
          effects: {
            brightness: fx.brightness,
            contrast: fx.contrast,
            saturation: fx.saturation,
            blur: fx.blur,
            vignette: fx.vignette
          }
        });
        window.toastSystem.show(`Effect '${fx.name}' applied.`, 'success');
      }
    });

    grid.appendChild(card);
  });

  document.getElementById('btnApplyEffectsToAll')?.addEventListener('click', () => {
    const activeCard = grid.querySelector('.preset-card-box.active');
    const fxName = activeCard ? activeCard.querySelector('.preset-name').textContent : 'Cinematic Warm';
    const fxObj = Object.values(EFFECT_PRESETS).find(f => f.name === fxName) || EFFECT_PRESETS.WARM_CINEMA;

    const clips = projectStore.project.timeline.videoClips || [];
    clips.forEach(c => {
      c.effects = {
        brightness: fxObj.brightness,
        contrast: fxObj.contrast,
        saturation: fxObj.saturation,
        blur: fxObj.blur,
        vignette: fxObj.vignette
      };
    });
    projectStore.notify();
    window.toastSystem.show(`Applied effect '${fxObj.name}' to all clips!`, 'success');
  });
}

// Visual Caption Styles Grid
function renderCaptionStylePresets() {
  const grid = document.getElementById('captionStylesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.values(CAPTION_STYLES).forEach(style => {
    const card = document.createElement('div');
    card.className = `preset-card-box ${projectStore.project.captionStyle === style.id.toUpperCase() ? 'active' : ''}`;
    card.innerHTML = `
      <span class="preset-icon">T</span>
      <span class="preset-name">${style.name}</span>
      <span class="preset-desc" style="color: ${style.highlightColor}">${style.previewText}</span>
    `;

    card.addEventListener('click', () => {
      grid.querySelectorAll('.preset-card-box').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      projectStore.project.captionStyle = style.id.toUpperCase();
      projectStore.notify();
      window.toastSystem.show(`Caption style updated to '${style.name}'.`, 'success');
    });

    grid.appendChild(card);
  });
}

// Load Extended SFX Catalog with Audio Player
async function loadSFXCatalog() {
  try {
    const sfxMap = await ApiClient.getAvailableSFX();
    const chipsContainer = document.getElementById('sfxCategoryChips');
    const listContainer = document.getElementById('sfxItemsList');
    if (!chipsContainer || !listContainer) return;

    chipsContainer.innerHTML = '';
    const categories = Object.keys(sfxMap);

    categories.forEach((cat, idx) => {
      const chip = document.createElement('button');
      chip.className = `chip-btn ${idx === 0 ? 'active' : ''}`;
      chip.textContent = cat.toUpperCase();

      chip.addEventListener('click', () => {
        chipsContainer.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderSFXListItems(sfxMap[cat]);
      });

      chipsContainer.appendChild(chip);
    });

    if (categories.length > 0) {
      renderSFXListItems(sfxMap[categories[0]]);
    }
  } catch (e) {}
}

function renderSFXListItems(items) {
  const listContainer = document.getElementById('sfxItemsList');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  (items || []).forEach(item => {
    const card = document.createElement('div');
    card.className = 'sfx-card-item';
    card.innerHTML = `
      <div class="item-main-info">
        <span class="item-title">${item.name}</span>
        <span class="item-sub-meta">🔊 ${item.category}</span>
      </div>
      <div class="item-actions">
        <button class="btn-play-preview" title="Preview Audio">▶</button>
        <button class="btn btn-xs btn-primary">+ Add</button>
      </div>
    `;

    const playBtn = card.querySelector('.btn-play-preview');
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.audioPreviewer.play(item.relPath || item.path, playBtn);
    });

    card.querySelector('.btn-primary').addEventListener('click', () => {
      projectStore.addSFXClip({
        id: `sfx_${Date.now()}`,
        name: item.name,
        path: item.path,
        startTime: timelineStore.currentTime,
        duration: 2.0,
        volume: 0.8
      });
      window.toastSystem.show(`Added '${item.name}' to SFX track at ${TimestampParser.formatSeconds(timelineStore.currentTime)}.`, 'success');
    });

    listContainer.appendChild(card);
  });
}

// Load Background Music Catalog with Audio Player
async function loadMusicCatalog() {
  const listContainer = document.getElementById('musicCatalogList');
  if (!listContainer) return;

  const demoMusicTracks = [
    { name: 'Cinematic Majesty', mood: 'Cinematic', duration: '00:30', bpm: 90, path: 'assets/music/cinematic_ambient_01.mp3' },
    { name: 'Dark Investigation', mood: 'Suspense', duration: '00:30', bpm: 110, path: 'assets/music/suspense_pulse_01.mp3' },
    { name: 'Reflective Journey', mood: 'Calm', duration: '00:30', bpm: 80, path: 'assets/music/calm_story_01.mp3' },
    { name: 'Nostalgic Memories', mood: 'Emotional', duration: '00:30', bpm: 72, path: 'assets/music/emotional_piano_01.mp3' },
    { name: 'Modern Innovation', mood: 'Corporate', duration: '00:30', bpm: 120, path: 'assets/music/corporate_tech_01.mp3' },
    { name: 'Archive Chronology', mood: 'Documentary', duration: '00:30', bpm: 78, path: 'assets/music/documentary_historic_01.mp3' },
    { name: 'Dynamic Drive', mood: 'Energetic', duration: '00:30', bpm: 128, path: 'assets/music/energetic_beat_01.mp3' },
    { name: 'Synthetic Horizon', mood: 'Technology', duration: '00:30', bpm: 115, path: 'assets/music/cyberpunk_synth_01.mp3' }
  ];

  listContainer.innerHTML = '';
  demoMusicTracks.forEach(track => {
    const card = document.createElement('div');
    card.className = 'music-card-item';
    card.innerHTML = `
      <div class="item-main-info">
        <span class="item-title">${track.name}</span>
        <span class="item-sub-meta">🎵 ${track.mood} • ${track.duration} • BPM ${track.bpm}</span>
      </div>
      <div class="item-actions">
        <button class="btn-play-preview" title="Preview Music">▶</button>
        <button class="btn btn-xs btn-primary">+ Add</button>
      </div>
    `;

    const playBtn = card.querySelector('.btn-play-preview');
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.audioPreviewer.play(track.path, playBtn);
    });

    card.querySelector('.btn-primary').addEventListener('click', () => {
      projectStore.addMusicClip({
        id: `bgm_${Date.now()}`,
        name: track.name,
        path: track.path,
        startTime: 0.0,
        duration: projectStore.project.voiceoverDuration || 30.0,
        volume: 0.35,
        fadeIn: 1.0,
        fadeOut: 1.5,
        duckingEnabled: true
      });
      window.toastSystem.show(`Added music track '${track.name}'.`, 'success');
    });

    listContainer.appendChild(card);
  });
}

function initPerformancePopover() {
  const popover = document.getElementById('performancePopover');
  const btn = document.getElementById('btnPerformancePopover');
  const btnClose = document.getElementById('btnClosePerfPopover');

  btn?.addEventListener('click', () => popover?.classList.toggle('hidden'));
  btnClose?.addEventListener('click', () => popover?.classList.add('hidden'));

  document.getElementById('selectAspectRatio')?.addEventListener('change', (e) => {
    window.previewPlayer.setAspectRatio(e.target.value);
  });
}

function initTransportControls() {
  document.getElementById('btnTransportPlayPause')?.addEventListener('click', () => window.previewPlayer.togglePlayPause());
  document.getElementById('btnTransportSkipStart')?.addEventListener('click', () => window.previewPlayer.seek(0));
  document.getElementById('btnTransportStepBack')?.addEventListener('click', () => window.previewPlayer.seek(timelineStore.currentTime - 1));
  document.getElementById('btnTransportStepForward')?.addEventListener('click', () => window.previewPlayer.seek(timelineStore.currentTime + 1));
  document.getElementById('btnTransportSkipEnd')?.addEventListener('click', () => window.previewPlayer.seek(window.previewPlayer.getTotalDuration()));
  document.getElementById('btnTransportLoop')?.addEventListener('click', (e) => {
    window.previewPlayer.isLooping = !window.previewPlayer.isLooping;
    e.target.style.opacity = window.previewPlayer.isLooping ? '1.0' : '0.5';
  });

  document.getElementById('sliderMasterVolume')?.addEventListener('input', (e) => {
    window.previewPlayer.masterVolume = parseFloat(e.target.value);
  });

  document.getElementById('btnToggleFullscreenPreview')?.addEventListener('click', () => {
    const wrap = document.getElementById('viewportCanvasContainer');
    if (wrap.requestFullscreen) wrap.requestFullscreen();
  });
}

function initModalActions() {
  // Top Save Action
  document.getElementById('btnSaveProjectTop')?.addEventListener('click', async () => {
    try {
      await ApiClient.saveProject(projectStore.project);
      const saveInd = document.getElementById('saveIndicator');
      if (saveInd) {
        saveInd.textContent = '● Saved';
        saveInd.className = 'save-indicator saved';
      }
      window.toastSystem.show('Project saved successfully.', 'success');
    } catch (e) {
      window.toastSystem.show(`Save failed: ${e.message}`, 'error');
    }
  });

  // AI Auto Edit Modal
  const modalAutoEdit = document.getElementById('modalAutoEdit');
  document.getElementById('btnOpenAutoEditModal')?.addEventListener('click', () => modalAutoEdit?.classList.remove('hidden'));
  document.getElementById('btnCloseAutoEditModal')?.addEventListener('click', () => modalAutoEdit?.classList.add('hidden'));
  document.getElementById('btnCancelAutoEditModal')?.addEventListener('click', () => modalAutoEdit?.classList.add('hidden'));

  // Preset Card Selection
  document.querySelectorAll('.choice-preset-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.choice-preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  // Execute AI Auto Edit with Visualized Step Progress
  document.getElementById('btnExecuteAutoEditWorkflow')?.addEventListener('click', async () => {
    const p = projectStore.project;
    const assets = p.imageAssets || [];
    if (assets.length === 0) {
      window.toastSystem.show('Please add media scenes first! You can click "Load Sample Scenes" in Project Media.', 'warning');
      return;
    }

    const activeCard = document.querySelector('.choice-preset-card.active');
    const presetKey = activeCard ? activeCard.dataset.preset : 'CINEMATIC';

    const progressBox = document.getElementById('aiProgressBox');
    progressBox.classList.remove('hidden');

    const steps = ['step1', 'step2', 'step3', 'step4', 'step5'];
    for (let i = 0; i < steps.length; i++) {
      const stepRow = document.getElementById(steps[i]);
      if (stepRow) {
        stepRow.className = 'ai-step-row active';
        stepRow.querySelector('.step-icon').textContent = '●';
        await new Promise(r => setTimeout(r, 120));
        stepRow.className = 'ai-step-row completed';
        stepRow.querySelector('.step-icon').textContent = '✓';
      }
    }

    try {
      const res = await ApiClient.runAutoEdit({
        projectName: p.name || 'Auto Edit Project',
        voiceover: p.voiceover,
        imageAssets: assets,
        presetKey
      });

      if (res && res.project) {
        if (!res.project.imageAssets || res.project.imageAssets.length === 0) {
          res.project.imageAssets = assets;
        }
        projectStore.setProject(res.project);
        modalAutoEdit.classList.add('hidden');
        progressBox.classList.add('hidden');
        window.toastSystem.show('✨ AI Auto Edit assembled your video successfully!', 'success');
        window.timelineComponent?.render();
        window.previewPlayer?.renderFrame(0);
      }
    } catch (e) {
      console.warn('Backend Auto Edit notice, assembling locally:', e);
      const voDur = p.voiceoverDuration || Math.max(assets.length * 4.5, 10.0);
      const clips = TimelineBuilderService.buildVideoClips(assets, voDur, { defaultMotion: 'SLOW_PUSH' });
      p.timeline.videoClips = clips;
      projectStore.notify();
      modalAutoEdit.classList.add('hidden');
      progressBox.classList.add('hidden');
      window.timelineComponent?.render();
      window.previewPlayer?.renderFrame(0);
      window.toastSystem.show('✨ AI Auto Edit assembled video locally!', 'success');
    }
  });

  // Export MP4 Modal
  const modalExport = document.getElementById('modalExport');
  document.getElementById('btnOpenExportModal')?.addEventListener('click', () => modalExport?.classList.remove('hidden'));
  document.getElementById('btnCloseExportModal')?.addEventListener('click', () => modalExport?.classList.add('hidden'));
  document.getElementById('btnCancelRenderAction')?.addEventListener('click', () => modalExport?.classList.add('hidden'));

  // Start Render Execution
  document.getElementById('btnStartExportNow')?.addEventListener('click', async () => {
    const execBox = document.getElementById('renderExecutionBox');
    execBox.classList.remove('hidden');

    const exportSettings = {
      resolution: document.getElementById('exportResolutionSelect').value,
      fps: parseInt(document.getElementById('exportFpsSelect').value, 10),
      codec: document.getElementById('exportCodecSelect').value,
      quality: document.getElementById('exportQualitySelect').value,
      useHardwareAcceleration: true
    };

    if (timelineStore.inPoint !== null || timelineStore.outPoint !== null) {
      const p = projectStore.project;
      const fullDur = p.voiceoverDuration || (p.timeline?.videoClips?.reduce((acc, c) => Math.max(acc, c.endTime), 0)) || 30.0;
      const effStart = timelineStore.inPoint !== null ? timelineStore.inPoint : 0.0;
      const effEnd = timelineStore.outPoint !== null ? timelineStore.outPoint : fullDur;
      exportSettings.trimRange = {
        start: effStart,
        duration: +(effEnd - effStart).toFixed(3)
      };
    }

    try {
      let backendStarted = false;
      try {
        await ensureProjectAssetsUploaded(projectStore.project);
        const jobRes = await ApiClient.startRender(projectStore.project, exportSettings);
        if (jobRes && jobRes.jobId) {
          backendStarted = true;
          pollExportProgress(jobRes.jobId);
          return;
        }
      } catch (beErr) {
        console.warn('Backend render not available, switching to browser export:', beErr);
      }

      // In-Browser Client-Side Rendering Fallback (Canvas + MediaRecorder)
      window.toastSystem.show('Web Studio: Rendering video directly in browser...', 'info', 3000);
      const renderFill = document.getElementById('renderProgressFill');
      const renderStage = document.getElementById('renderStageText');
      const renderPercent = document.getElementById('renderPercentText');
      const renderFps = document.getElementById('renderFpsText');
      const renderDownloadBtn = document.getElementById('btnDownloadExportedVideo');

      const expResult = await previewEngine.exportInBrowser({
        fps: 30,
        onProgress: (prog) => {
          if (renderFill) renderFill.style.width = `${prog.progressPercent}%`;
          if (renderPercent) renderPercent.textContent = `${prog.progressPercent}%`;
          if (renderStage) renderStage.textContent = prog.stage;
          if (renderFps) renderFps.textContent = `${prog.fps || 30} FPS`;
        }
      });

      if (renderFill) renderFill.style.width = '100%';
      if (renderPercent) renderPercent.textContent = '100%';
      if (renderStage) renderStage.textContent = '✓ Rendering Complete! Downloading video...';

      if (renderDownloadBtn) {
        renderDownloadBtn.href = expResult.downloadUrl;
        const pName = (projectStore.project.name || 'MAK_Video_Project').replace(/[^a-zA-Z0-9_-]/g, '_');
        renderDownloadBtn.download = `${pName}_export.${expResult.ext}`;
        renderDownloadBtn.classList.remove('hidden');
        renderDownloadBtn.click();
      }

      window.toastSystem.show(`🎉 Video rendered & downloaded successfully! (${expResult.ext.toUpperCase()})`, 'success', 5000);
    } catch (e) {
      window.toastSystem.show(`Render failed: ${e.message}`, 'error');
    }
  });

  // Keyboard Shortcuts Modal
  const modalShortcuts = document.getElementById('modalShortcuts');
  document.getElementById('btnShowKeyboardShortcuts')?.addEventListener('click', () => modalShortcuts?.classList.remove('hidden'));
  document.getElementById('btnCloseShortcutsModal')?.addEventListener('click', () => modalShortcuts?.classList.add('hidden'));
  document.getElementById('btnCloseShortcutsBtn')?.addEventListener('click', () => modalShortcuts?.classList.add('hidden'));

  // Clear Cache & Temp Actions
  document.getElementById('btnSettingsClearCache')?.addEventListener('click', async () => {
    await ApiClient.clearCache();
    window.toastSystem.show('Cache cleared.', 'success');
  });

  document.getElementById('btnSettingsClearTemp')?.addEventListener('click', async () => {
    await ApiClient.clearTemp();
    window.toastSystem.show('Temporary files purged.', 'success');
  });

  document.getElementById('btnResetWorkspaceLayout')?.addEventListener('click', () => {
    localStorage.removeItem('maq_drawer_width');
    localStorage.removeItem('maq_inspector_width');
    localStorage.removeItem('maq_timeline_height');
    localStorage.removeItem('maq_rail_expanded');
    document.documentElement.style.setProperty('--drawer-width', '290px');
    document.documentElement.style.setProperty('--inspector-width', '290px');
    document.documentElement.style.setProperty('--timeline-height', '250px');
    window.toastSystem.show('Workspace layout reset to default.', 'info');
  });
}

function updateMediaUI() {
  const p = projectStore.project;
  const countPill = document.getElementById('mediaCountPill');
  if (countPill) countPill.textContent = `${(p.imageAssets || []).length} assets`;

  const voEmpty = document.getElementById('voEmptyView');
  const voLoaded = document.getElementById('voLoadedView');
  const voTag = document.getElementById('voTagStatus');

  if (p.voiceover) {
    voEmpty?.classList.add('hidden');
    voLoaded?.classList.remove('hidden');
    if (voTag) voTag.textContent = `${p.voiceoverDuration}s`;
    const voTitle = document.getElementById('voCardTitle');
    if (voTitle) voTitle.textContent = p.voiceover.filename;
    const voDur = document.getElementById('voCardDuration');
    if (voDur) voDur.textContent = `${p.voiceoverDuration}s`;
  } else {
    voEmpty?.classList.remove('hidden');
    voLoaded?.classList.add('hidden');
    if (voTag) voTag.textContent = 'Empty';
  }

  // Thumbnails Grid
  const grid = document.getElementById('mediaThumbnailsGrid');
  const emptyState = document.getElementById('emptyMediaState');
  if (!grid) return;

  grid.innerHTML = '';
  const assets = p.imageAssets || [];

  if (assets.length === 0) {
    emptyState?.classList.remove('hidden');
  } else {
    emptyState?.classList.add('hidden');
    assets.forEach(asset => {
      const card = document.createElement('div');
      card.className = 'thumb-card';
      const imgSrc = asset.path.startsWith('http') || asset.path.startsWith('/') || asset.path.startsWith('blob:')
        ? asset.path
        : `/media/${encodeURIComponent(asset.path)}`;

      card.innerHTML = `
        <img src="${imgSrc}" alt="${asset.filename}">
        <div class="thumb-footer">
          <span class="thumb-name">${asset.filename}</span>
          <span class="thumb-ts">${asset.displayTimestamp || '00:00'}</span>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  // Sync Creator Mode View
  if (typeof updateCreatorModeUI === 'function') {
    updateCreatorModeUI();
  }
}

function pollExportProgress(jobId) {
  const bar = document.getElementById('renderProgressBar');
  const stage = document.getElementById('lblRenderStage');
  const percent = document.getElementById('lblRenderPercent');
  const frame = document.getElementById('lblRenderFrame');
  const fps = document.getElementById('lblRenderFps');
  const elapsed = document.getElementById('lblRenderElapsed');
  const eta = document.getElementById('lblRenderRemaining');

  const interval = setInterval(async () => {
    try {
      const job = await ApiClient.getRenderJob(jobId);
      if (!job) return;

      bar.style.width = `${job.progressPercent}%`;
      stage.textContent = job.stage;
      percent.textContent = `${job.progressPercent}%`;
      frame.textContent = `${job.currentFrame} / ${job.totalFrames}`;
      fps.textContent = job.fps || '0';
      elapsed.textContent = `${job.elapsedSeconds}s`;
      eta.textContent = `${job.remainingSecondsEstimate}s`;

      if (job.status === 'completed') {
        clearInterval(interval);
        stage.textContent = '✓ Render Complete!';
        document.getElementById('btnOpenExportedFolder').classList.remove('hidden');
        document.getElementById('btnStartExportNow').classList.add('hidden');
        window.toastSystem.show('Master MP4 exported successfully!', 'success');
      } else if (job.status === 'failed' || job.status === 'cancelled') {
        clearInterval(interval);
        stage.textContent = `Error: ${job.error || 'Failed'}`;
        window.toastSystem.show(`Render error: ${job.error}`, 'error');
      }
    } catch (e) {
      clearInterval(interval);
    }
  }, 800);
}

function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      e.preventDefault();
      window.previewPlayer.togglePlayPause();
    } else if (e.code === 'KeyM' && !e.ctrlKey) {
      e.preventDefault();
      const current = localStorage.getItem('maq_workspace_mode') || 'creator';
      setWorkspaceMode(current === 'creator' ? 'pro' : 'creator');
    } else if (e.code === 'KeyS' && !e.ctrlKey) {
      window.timelineComponent.splitAtPlayhead();
    } else if (e.code === 'Delete' || e.code === 'Backspace') {
      window.timelineComponent.deleteSelectedClip();
    } else if (e.ctrlKey && e.code === 'KeyD') {
      e.preventDefault();
      window.timelineComponent.duplicateSelectedClip();
    } else if (e.ctrlKey && e.code === 'KeyZ') {
      e.preventDefault();
      if (e.shiftKey) projectStore.redo();
      else projectStore.undo();
    } else if (e.ctrlKey && e.code === 'KeyS') {
      e.preventDefault();
      document.getElementById('btnSaveProjectTop')?.click();
    } else if (e.code === 'KeyI' && !e.ctrlKey) {
      e.preventDefault();
      timelineStore.setInPoint(timelineStore.currentTime);
      window.toastSystem?.show(`Marked In Point: ${TimestampParser.formatSeconds(timelineStore.currentTime)}`, 'info', 1500);
      window.timelineComponent?.render();
    } else if (e.code === 'KeyO' && !e.ctrlKey) {
      e.preventDefault();
      timelineStore.setOutPoint(timelineStore.currentTime);
      window.toastSystem?.show(`Marked Out Point: ${TimestampParser.formatSeconds(timelineStore.currentTime)}`, 'info', 1500);
      window.timelineComponent?.render();
    } else if (e.code === 'KeyX' && (e.altKey || !e.ctrlKey)) {
      e.preventDefault();
      timelineStore.clearInOutPoints();
      window.toastSystem?.show('Cleared In/Out selection range', 'info', 1500);
      window.timelineComponent?.render();
    } else if (e.ctrlKey && e.code === 'KeyE') {
      e.preventDefault();
      document.getElementById('btnOpenExportModal')?.click();
    }
  });
}

// Load Default Demo Project Assets on startup
async function loadInitialDemoState() {
  try {
    const res = await ApiClient.loadProject('demo-project/demo.maqp');
    if (res && res.project) {
      projectStore.setProject(res.project);
      updateCreatorModeUI();
    }
  } catch (e) {
    console.warn('Initial demo project load notice:', e);
  }
}

// Time formatting helper: converts seconds to MM:SS.S
function formatTime(sec) {
  if (isNaN(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const tenths = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
}

// ============================================================
// UNIFIED MAQ AI STORY STUDIO ARCHITECTURE
// ============================================================
function initModeSwitcher() {
  // Pro mode is retired; MAQ Studio is the singular, unified storytelling workspace
  document.body.classList.add('mode-creator');
  document.body.classList.remove('mode-pro');

  // Wire top bar Export MP4 button directly to Step 5
  document.getElementById('btnOpenExportModal')?.addEventListener('click', () => setCreatorStep(5));
}

function setWorkspaceMode(mode) {
  document.body.classList.add('mode-creator');
}

// ============================================================
// MAQ AI STORY STUDIO: 5-STEP STORYTELLING WORKSPACE
// ============================================================
function initCreatorMode() {
  // Stepper Header Click Handlers (Supports both direct ID and data-step query)
  for (let s = 1; s <= 5; s++) {
    const btn = document.getElementById(`stepItem${s}`);
    btn?.addEventListener('click', () => setCreatorStep(s));
  }
  document.querySelectorAll('.stepper-step-item').forEach(item => {
    item.addEventListener('click', () => {
      const s = parseInt(item.dataset.step, 10);
      if (s) setCreatorStep(s);
    });
  });

  // Stepper Nav Buttons
  document.getElementById('btnStep1Next')?.addEventListener('click', () => {
    if (!projectStore.project.voiceover) {
      window.toastSystem.show('Tip: You can add voiceover now or continue to media', 'info', 2000);
    }
    setCreatorStep(2);
  });

  document.getElementById('btnStep2Back')?.addEventListener('click', () => setCreatorStep(1));
  document.getElementById('btnStep2Next')?.addEventListener('click', () => {
    const assets = projectStore.project.imageAssets || [];
    if (assets.length === 0) {
      window.toastSystem.show('Please add at least one image or video scene', 'warning');
      return;
    }
    setCreatorStep(3);
  });

  document.getElementById('btnClearAllMedia')?.addEventListener('click', () => {
    const assets = projectStore.project.imageAssets || [];
    if (assets.length === 0) return;
    if (confirm(`Are you sure you want to clear all ${assets.length} imported scenes?`)) {
      projectStore.project.imageAssets = [];
      projectStore.notify();
      window.toastSystem?.show('Cleared all imported scenes.', 'info');
    }
  });

  document.getElementById('btnStep3Back')?.addEventListener('click', () => setCreatorStep(2));
  document.getElementById('btnStep4Back')?.addEventListener('click', () => setCreatorStep(3));
  document.getElementById('btnCreatorReassemble')?.addEventListener('click', () => setCreatorStep(3));
  document.getElementById('btnStep4Next')?.addEventListener('click', () => setCreatorStep(5));
  document.getElementById('btnStep5Back')?.addEventListener('click', () => setCreatorStep(4));

  // Studio Guide Modal handlers
  const guideModal = document.getElementById('modalCreatorGuide');
  const openGuide = () => guideModal?.classList.remove('hidden');
  const closeGuide = () => guideModal?.classList.add('hidden');

  document.getElementById('btnOpenCreatorGuide')?.addEventListener('click', openGuide);
  document.getElementById('btnCloseCreatorGuideModal')?.addEventListener('click', closeGuide);
  document.getElementById('btnCloseCreatorGuideBtn')?.addEventListener('click', closeGuide);
  guideModal?.addEventListener('click', (e) => {
    if (e.target === guideModal) closeGuide();
  });

  // Initialize individual step controllers
  initCreatorVoiceoverHandlers();
  initCreatorMediaHandlers();
  initCreatorAutoEditHandlers();
  initCreatorReviewHandlers();
  initCreatorExportHandlers();

  // Reactive UI update on any project state modification
  projectStore.subscribe(() => {
    updateCreatorModeUI();
  });

  window.setWorkspaceMode = setWorkspaceMode;
  window.setCreatorStep = setCreatorStep;

  setCreatorStep(1);
}

function setCreatorStep(step) {
  currentCreatorStep = Math.max(1, Math.min(5, step));
  if (typeof window !== 'undefined') window.currentCreatorStep = currentCreatorStep;

  // Update Stepper Progress Bar
  const fill = document.getElementById('creatorProgressFill');
  if (fill) fill.style.width = `${(currentCreatorStep / 5) * 100}%`;

  // Update Step Badges & Cards
  for (let i = 1; i <= 5; i++) {
    const item = document.getElementById(`stepItem${i}`);
    const badge = document.getElementById(`stepBadge${i}`);
    const card = document.getElementById(`creatorStep${i}`);

    if (item) {
      item.classList.remove('active', 'completed');
      if (i === currentCreatorStep) {
        item.classList.add('active');
      } else if (i < currentCreatorStep) {
        item.classList.add('completed');
        if (badge) badge.innerHTML = '✓';
      }
      if (i >= currentCreatorStep && badge) {
        badge.innerHTML = `${i}`;
      }
    }

    if (card) {
      if (i === currentCreatorStep) card.classList.remove('hidden');
      else card.classList.add('hidden');
    }
  }

  // Manage Storyboard Deck & Preview Canvas
  if (currentCreatorStep === 4) {
    renderStoryboardCards();
    window.previewPlayer?.renderFrame(timelineStore.currentTime);
  }

  // Step 5: Refresh summary numbers
  if (currentCreatorStep === 5) {
    updateCreatorExportSummary();
  }
}

function updateCreatorModeUI() {
  const p = projectStore.project;

  // 1. Sync Voiceover Card
  const voCard = document.getElementById('creatorVoLoadedCard');
  const voDrop = document.getElementById('creatorVoDropZone');
  if (p.voiceover) {
    voCard?.classList.remove('hidden');
    voDrop?.classList.add('hidden');
    const title = document.getElementById('creatorVoTitle');
    const dur = document.getElementById('creatorVoDuration');
    if (title) title.textContent = p.voiceover.filename || 'voiceover.mp3';
    if (dur) dur.textContent = `${formatTime(p.voiceoverDuration || 30.0)} • 44.1 kHz Stereo`;
  } else {
    voCard?.classList.add('hidden');
    voDrop?.classList.remove('hidden');
  }

  // 2. Sync Media Scenes Grid (Auto-sorted by timestamp)
  const grid = document.getElementById('creatorMediaGrid');
  const countEl = document.getElementById('creatorMediaCount');
  if (grid) {
    grid.innerHTML = '';
    const assets = p.imageAssets || [];

    // Chronologically sort scenes by timestamp
    assets.sort((a, b) => {
      const getTs = (item) => {
        if (typeof item.timestampSeconds === 'number') return item.timestampSeconds;
        const parsed = FilenameParser.parse(item.filename || item.path || '');
        return parsed.hasTimestamp ? parsed.timestampSeconds : 999999;
      };
      const tsA = getTs(a);
      const tsB = getTs(b);
      if (tsA !== tsB) return tsA - tsB;
      return (a.outputIndex || 1) - (b.outputIndex || 1);
    });

    if (countEl) countEl.textContent = `${assets.length} scenes`;

    if (assets.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #64748B; font-size: 12px;">No scene media uploaded yet. Drag & drop images above or click "Browse Media".</div>`;
    } else {
      assets.forEach((asset, idx) => {
        const card = document.createElement('div');
        card.className = 'creator-media-item';
        const imgSrc = asset.path.startsWith('http') || asset.path.startsWith('/') || asset.path.startsWith('blob:')
          ? asset.path
          : `/media/${encodeURIComponent(asset.path)}`;

        const ext = (asset.path || '').split('.').pop().toLowerCase();
        const isVid = ['mp4', 'mov', 'webm'].includes(ext);
        const parsedTs = FilenameParser.parse(asset.filename || asset.path);
        const timeLabel = parsedTs.hasTimestamp ? TimestampParser.formatSeconds(parsedTs.timestampSeconds) : (asset.displayTimestamp || `#${idx + 1}`);

        card.innerHTML = `
          <div class="creator-media-thumb-wrap">
            ${isVid ? `<video src="${imgSrc}" muted></video>` : `<img src="${imgSrc}" alt="${asset.filename}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 60%22><rect width=%22100%22 height=%2260%22 fill=%22%231e293b%22/><text x=%2250%22 y=%2235%22 fill=%22%2364748b%22 font-size=%2210%22 text-anchor=%22middle%22>#${idx + 1}</text></svg>'">`}
            <span class="media-index-pill">#${idx + 1}</span>
            <span class="media-time-badge">${timeLabel}</span>
            <button type="button" class="creator-del-btn" title="Remove scene">✕</button>
          </div>
          <div class="creator-media-meta">
            <span class="media-fname" title="${asset.filename}">${asset.filename}</span>
          </div>
        `;

        card.querySelector('.creator-del-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          p.imageAssets = (p.imageAssets || []).filter(a => a.id !== asset.id);
          projectStore.notify();
        });

        grid.appendChild(card);
      });
    }
  }

  // 3. Sync Audio Mixer Sliders in Pro Mode
  updateMixerSlidersFromProject();

  // 4. If viewing Step 4 in Creator Mode, keep storyboard cards updated
  if (currentCreatorStep === 4) {
    renderStoryboardCards();
  }
}

function initCreatorVoiceoverHandlers() {
  const voInput = document.getElementById('inputTriggerVoiceover');

  document.getElementById('btnCreatorBrowseVO')?.addEventListener('click', (e) => {
    e.stopPropagation();
    voInput?.click();
  });

  const dropZone = document.getElementById('creatorVoDropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleAudioVoiceoverFile(e.dataTransfer.files[0]);
      }
    });
    dropZone.addEventListener('click', (e) => {
      if (e.target.closest('#btnCreatorBrowseVO')) return;
      voInput?.click();
    });
  }

  document.getElementById('btnCreatorPlayVO')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const vo = projectStore.project.voiceover;
    if (vo && vo.path) {
      window.audioPreviewer.play(vo.path, e.currentTarget);
    }
  });

  document.getElementById('btnCreatorRemoveVO')?.addEventListener('click', (e) => {
    e.stopPropagation();
    removeVoiceoverAudio();
  });
}

function initCreatorMediaHandlers() {
  const mediaInput = document.getElementById('inputTriggerImages');
  const folderInput = document.getElementById('inputTriggerFolder');

  document.getElementById('btnCreatorBrowseMedia')?.addEventListener('click', (e) => {
    e.stopPropagation();
    mediaInput?.click();
  });

  document.getElementById('btnCreatorBrowseFolder')?.addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput?.click();
  });

  const dropZone = document.getElementById('creatorMediaDropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleCreatorMediaFiles(Array.from(e.dataTransfer.files));
      }
    });
    dropZone.addEventListener('click', (e) => {
      if (e.target.closest('#btnCreatorBrowseMedia') || e.target.closest('#btnCreatorBrowseFolder')) return;
      mediaInput?.click();
    });
  }

  document.getElementById('btnCreatorClearAllMedia')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearAllMedia();
  });
}

function handleCreatorMediaFiles(files) {
  const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/') || f.name.endsWith('.zip'));
  if (validFiles.length === 0) {
    window.toastSystem.show('No supported image or video files detected', 'warning');
    return;
  }

  const existingAssets = projectStore.project.imageAssets || [];
  const startIdx = existingAssets.length;
  const newAssets = validFiles.map((f, idx) => {
    const parsed = FilenameParser.parse(f.name);
    const overallIdx = startIdx + idx;
    const defaultInterval = 4.5;
    const computedSec = +(overallIdx * defaultInterval).toFixed(1);
    const tsSec = parsed.hasTimestamp ? parsed.timestampSeconds : computedSec;
    const displayTs = parsed.hasTimestamp ? parsed.displayTimestamp : TimestampParser.formatSeconds(tsSec);

    return {
      id: `asset_${Date.now()}_${overallIdx}_${Math.random().toString(36).substr(2, 4)}`,
      filename: f.name,
      path: URL.createObjectURL(f),
      timestampSeconds: tsSec,
      displayTimestamp: displayTs,
      outputIndex: parsed.outputIndex || 1,
      mediaType: f.type || (['mp4', 'mov', 'webm'].includes(f.name.split('.').pop().toLowerCase()) ? 'video/mp4' : 'image/png'),
      isBlob: true
    };
  });

  const allAssets = [...existingAssets, ...newAssets];
  allAssets.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  projectStore.project.imageAssets = allAssets;

  const voDuration = projectStore.project.voiceoverDuration || Math.max(allAssets.length * 4.5, 10.0);
  const clips = TimelineBuilderService.buildVideoClips(allAssets, voDuration);
  projectStore.project.timeline.videoClips = clips;

  projectStore.notify();
  updateCreatorModeUI();
  updateMediaUI();
  window.timelineComponent?.render();
  window.previewPlayer?.renderFrame(timelineStore.currentTime);
  window.toastSystem.show(`Added ${newAssets.length} scenes to project and timeline!`, 'success');
}

function initCreatorAutoEditHandlers() {
  const cards = document.querySelectorAll('.creator-preset-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      projectStore.project.preset = card.dataset.preset;
    });
  });

  // Transitions Mode: Mixture vs Specific Checkboxes
  const radMixture = document.getElementById('radTransMixture');
  const radCustom = document.getElementById('radTransCustom');
  const boxSpecific = document.getElementById('boxSpecificTransitions');

  radMixture?.addEventListener('change', () => {
    if (radMixture.checked) boxSpecific?.classList.add('hidden');
  });

  radCustom?.addEventListener('change', () => {
    if (radCustom.checked) boxSpecific?.classList.remove('hidden');
  });

  // Motion Mode: Mixture vs Specific
  const radMotionMixture = document.getElementById('radMotionMixture');
  const radMotionCustom = document.getElementById('radMotionCustom');
  const boxSpecificMotions = document.getElementById('boxSpecificMotions');

  radMotionMixture?.addEventListener('change', () => {
    if (radMotionMixture.checked) boxSpecificMotions?.classList.add('hidden');
  });

  radMotionCustom?.addEventListener('change', () => {
    if (radMotionCustom.checked) boxSpecificMotions?.classList.remove('hidden');
  });

  // Grading Chips Visual Selection
  document.querySelectorAll('input[name="radGradingPreset"]').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.grading-chip').forEach(c => c.classList.remove('active'));
      input.closest('.grading-chip')?.classList.add('active');
    });
  });

  // Multi-Select Motion Chips Visual Selection
  document.querySelectorAll('input[name="chkMotionSpecific"]').forEach(input => {
    input.addEventListener('change', () => {
      const chip = input.closest('.motion-chip');
      if (input.checked) {
        chip?.classList.add('active');
      } else {
        const checkedCount = document.querySelectorAll('input[name="chkMotionSpecific"]:checked').length;
        if (checkedCount === 0) {
          input.checked = true;
          window.toastSystem?.show('At least one camera motion style must remain selected.', 'warning', 2000);
          return;
        }
        chip?.classList.remove('active');
      }
    });
  });

  // 4. Organic Sound Effects Multi-Select Suite
  const chkSFXEnabled = document.getElementById('chkCreatorSFXEnabled');
  const boxSFXChips = document.getElementById('boxCreatorSFXChips');
  const fileSFXInput = document.getElementById('fileCreatorCustomSFX');
  const btnUploadSFX = document.getElementById('btnUploadCustomSFX');
  const lblCustomSFX = document.getElementById('lblCustomSFXName');

  chkSFXEnabled?.addEventListener('change', () => {
    if (boxSFXChips) {
      boxSFXChips.style.opacity = chkSFXEnabled.checked ? '1' : '0.4';
      boxSFXChips.style.pointerEvents = chkSFXEnabled.checked ? 'auto' : 'none';
    }
  });

  // Audition preview buttons
  let currentAuditionAudio = null;
  document.querySelectorAll('.btn-sfx-audition').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const audioPath = btn.dataset.audio;
      if (!audioPath) return;

      if (currentAuditionAudio) {
        currentAuditionAudio.pause();
        currentAuditionAudio = null;
      }

      currentAuditionAudio = new Audio(audioPath);
      currentAuditionAudio.volume = 0.85;
      currentAuditionAudio.play().catch(err => console.warn('Audition playback:', err));

      btn.textContent = '🔊';
      setTimeout(() => { btn.textContent = '▶'; }, 1200);
    });
  });

  // Checkbox toggle styles for SFX Chips
  document.querySelectorAll('input[name="chkSFXItem"]').forEach(input => {
    input.addEventListener('change', () => {
      const card = input.closest('.sfx-chip-card');
      if (input.checked) {
        card?.classList.add('active');
      } else {
        card?.classList.remove('active');
      }
    });
  });

  btnUploadSFX?.addEventListener('click', () => fileSFXInput?.click());

  fileSFXInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('media', file);
      const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const data = await res.json();
      const sfxPath = data.path || data.relPath || `projects/media/${file.name}`;
      window.customUploadedSFX = { path: sfxPath, name: file.name };
      if (lblCustomSFX) lblCustomSFX.textContent = `✓ ${file.name}`;
      window.toastSystem.show(`Custom SFX '${file.name}' ready for scene cuts!`, 'success');
    } catch (err) {
      console.warn('Local SFX reference fallback:', err);
      window.customUploadedSFX = { path: `projects/media/${file.name}`, name: file.name };
      if (lblCustomSFX) lblCustomSFX.textContent = `✓ ${file.name}`;
      window.toastSystem.show(`Custom SFX '${file.name}' assigned!`, 'success');
    }
  });

  // Music Volume Slider
  const musicSlider = document.getElementById('sliderCreatorMusicVol');
  const musicVal = document.getElementById('valCreatorMusicVol');
  musicSlider?.addEventListener('input', (e) => {
    const vol = parseInt(e.target.value, 10);
    if (musicVal) musicVal.textContent = `${vol}%`;
    const floatVol = +(vol / 100).toFixed(2);
    window.selectedMusicVolume = floatVol;
    if (projectStore.project.audioSettings) {
      projectStore.project.audioSettings.musicVolume = floatVol;
    }
    if (projectStore.project.timeline?.musicClips?.length > 0) {
      projectStore.project.timeline.musicClips[0].volume = floatVol;
    }
  });

  // 6. Captions & Subtitles Setup Engine
  const chkCaptions = document.getElementById('chkCreatorEnableCaptions');
  const wrapCaptions = document.getElementById('creatorCaptionsControlsWrap');
  chkCaptions?.addEventListener('change', () => {
    const enabled = chkCaptions.checked;
    projectStore.project.enableCaptions = enabled;
    if (wrapCaptions) {
      wrapCaptions.style.opacity = enabled ? '1' : '0.35';
      wrapCaptions.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    window.previewPlayer?.renderFrame(timelineStore.currentTime);
    window.toastSystem?.show(enabled ? 'Captions enabled' : 'Captions disabled for clean video', 'info', 1800);
  });

  // Caption Font Size Slider
  const sliderFontSize = document.getElementById('sliderCaptionFontSize');
  const lblFontSize = document.getElementById('lblCaptionFontSize');
  sliderFontSize?.addEventListener('input', (e) => {
    const size = parseInt(e.target.value, 10);
    if (lblFontSize) lblFontSize.textContent = `${size}px`;
    projectStore.project.captionFontSize = size;
    window.previewPlayer?.renderFrame(timelineStore.currentTime);
  });

  // Caption Screen Position Buttons & Slider
  const sliderCaptionPos = document.getElementById('sliderCaptionPosV');
  const lblCaptionPos = document.getElementById('lblCaptionPosV');

  function updateCaptionPosUI(posVal) {
    projectStore.project.captionPositionPercent = posVal;
    if (sliderCaptionPos) sliderCaptionPos.value = posVal;
    if (lblCaptionPos) {
      let posDesc = 'Bottom';
      if (posVal < 35) posDesc = 'Top';
      else if (posVal < 70) posDesc = 'Center';
      lblCaptionPos.textContent = `${posVal}% (${posDesc})`;
    }
    document.querySelectorAll('.btn-caption-pos').forEach(btn => {
      if (parseInt(btn.dataset.pos, 10) === posVal) {
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-primary', 'active');
      } else {
        btn.classList.add('btn-outline');
        btn.classList.remove('btn-primary', 'active');
      }
    });
    window.previewPlayer?.renderFrame(timelineStore.currentTime);
  }

  document.querySelectorAll('.btn-caption-pos').forEach(btn => {
    btn.addEventListener('click', () => {
      const pos = parseInt(btn.dataset.pos, 10);
      updateCaptionPosUI(pos);
    });
  });

  sliderCaptionPos?.addEventListener('input', (e) => {
    const pos = parseInt(e.target.value, 10);
    updateCaptionPosUI(pos);
  });

  // Captions Setup Tab Switcher (Option 1 vs Option 2)
  const tabAuto = document.getElementById('tabCreatorAutoCaptions');
  const tabImport = document.getElementById('tabCreatorImportCaptions');
  const paneAuto = document.getElementById('paneCreatorAutoCaptions');
  const paneImport = document.getElementById('paneCreatorImportCaptions');

  tabAuto?.addEventListener('click', () => {
    tabAuto.className = 'btn btn-sm btn-primary';
    tabImport.className = 'btn btn-sm btn-outline';
    paneAuto?.classList.remove('hidden');
    paneImport?.classList.add('hidden');
  });

  tabImport?.addEventListener('click', () => {
    tabImport.className = 'btn btn-sm btn-primary';
    tabAuto.className = 'btn btn-sm btn-outline';
    paneImport?.classList.remove('hidden');
    paneAuto?.classList.add('hidden');
  });

  // Option 1: AI Auto-Generate Captions
  document.getElementById('btnCreatorGenerateCaptionsNow')?.addEventListener('click', () => {
    const style = document.getElementById('selectCreatorCaptionStyle')?.value || 'BOLD_YELLOW';
    projectStore.project.captionStyle = style;
    const scriptText = document.getElementById('txtCreatorScriptInput')?.value?.trim();
    const voDuration = projectStore.project.voiceoverDuration || 30.0;

    let captions = [];
    if (scriptText) {
      if (scriptText.includes('-->')) {
        captions = CaptionService.parseSRT(scriptText);
      } else {
        captions = CaptionService.parseTXT(scriptText, 3.5, voDuration);
      }
    } else {
      const sampleLines = [
        "Every great story begins with a bold vision.",
        "Through every challenge, new possibilities appear.",
        "Focus on what creates the greatest impact.",
        "Innovation happens when clarity meets execution.",
        "The results speak with absolute authority.",
        "Engineered for high cinematic storytelling."
      ];
      const interval = Math.max(3.0, +(voDuration / sampleLines.length).toFixed(1));
      sampleLines.forEach((line, idx) => {
        const start = +(idx * interval).toFixed(2);
        if (start < voDuration) {
          captions.push({
            id: `cap_auto_${idx + 1}`,
            index: idx + 1,
            startTime: start,
            endTime: +(Math.min(start + interval - 0.2, voDuration)).toFixed(2),
            duration: +(Math.min(interval - 0.2, voDuration - start)).toFixed(2),
            text: line
          });
        }
      });
    }

    projectStore.setCaptions(captions);
    const status = document.getElementById('creatorCaptionsStatusText');
    if (status) status.textContent = `✓ Generated ${captions.length} captions using ${style} preset!`;
    window.toastSystem.show(`✨ ${captions.length} captions generated & timed to voiceover!`, 'success');
    window.timelineComponent?.render();
    renderStoryboardCards();
  });

  // Option 2: Import Subtitle File (.srt, .vtt, .txt)
  const fileSubInput = document.getElementById('fileCreatorSubtitleImport');
  document.getElementById('btnChooseSubtitleFile')?.addEventListener('click', () => {
    fileSubInput?.click();
  });

  fileSubInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fnEl = document.getElementById('txtSubtitleFileName');
    if (fnEl) fnEl.textContent = file.name;

    const text = await file.text();
    const ext = file.name.split('.').pop().toLowerCase();
    const voDuration = projectStore.project.voiceoverDuration || 30.0;
    let captions = [];

    if (ext === 'srt') {
      captions = CaptionService.parseSRT(text);
    } else if (ext === 'vtt') {
      captions = CaptionService.parseVTT(text);
    } else {
      captions = CaptionService.parseTXT(text, 3.5, voDuration);
    }

    if (captions.length > 0) {
      projectStore.setCaptions(captions);
      const style = document.getElementById('selectCreatorCaptionStyle')?.value || 'BOLD_YELLOW';
      projectStore.project.captionStyle = style;
      const countEl = document.getElementById('creatorImportedCaptionsCount');
      if (countEl) countEl.textContent = `✓ Imported ${captions.length} captions aligned to timeline!`;
      window.toastSystem.show(`Loaded ${captions.length} captions from ${file.name}!`, 'success');
      window.timelineComponent?.render();
      renderStoryboardCards();
    } else {
      window.toastSystem.show('Could not parse subtitles from file. Please verify format.', 'warning');
    }
  });

  // Background Music Track Selector & Custom Song Upload
  const fileBGMInput = document.getElementById('fileCreatorCustomBGM');
  document.getElementById('btnUploadCustomBGM')?.addEventListener('click', () => {
    fileBGMInput?.click();
  });

  fileBGMInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('media', file);
      const uploadRes = await fetch('/api/media/upload', { method: 'POST', body: formData });
      const data = await uploadRes.json();
      const serverPath = data.path || data.relPath || `projects/media/${file.name}`;

      const voDur = projectStore.project.voiceoverDuration || 30.0;
      const vol = window.selectedMusicVolume !== undefined ? window.selectedMusicVolume : 0.35;
      projectStore.project.timeline.musicClips = [{
        id: `bgm_custom_${Date.now()}`,
        name: file.name,
        path: serverPath,
        startTime: 0.0,
        duration: voDur,
        volume: vol,
        duckingEnabled: true
      }];
      projectStore.notify();

      const lbl = document.getElementById('lblCustomBGMName');
      if (lbl) lbl.textContent = `✓ Custom Song: ${file.name}`;
      window.toastSystem.show(`Custom song '${file.name}' added to music track!`, 'success');
      window.timelineComponent?.render();
    } catch (err) {
      console.error('Custom BGM upload error:', err);
      const voDur = projectStore.project.voiceoverDuration || 30.0;
      const vol = window.selectedMusicVolume !== undefined ? window.selectedMusicVolume : 0.35;
      projectStore.project.timeline.musicClips = [{
        id: `bgm_custom_${Date.now()}`,
        name: file.name,
        path: `projects/media/${file.name}`,
        startTime: 0.0,
        duration: voDur,
        volume: vol,
        duckingEnabled: true
      }];
      projectStore.notify();
      window.toastSystem.show(`Custom song '${file.name}' added to music track!`, 'success');
      window.timelineComponent?.render();
    }
  });

  document.getElementById('selectCreatorBGMTrack')?.addEventListener('change', (e) => {
    const val = e.target.value;
    const voDur = projectStore.project.voiceoverDuration || 30.0;
    const vol = window.selectedMusicVolume !== undefined ? window.selectedMusicVolume : 0.35;
    projectStore.project.timeline.musicClips = [{
      id: `bgm_${Date.now()}`,
      name: e.target.options[e.target.selectedIndex].text,
      path: `assets/music/${val}`,
      startTime: 0.0,
      duration: voDur,
      volume: vol,
      duckingEnabled: true
    }];
    projectStore.notify();
    window.timelineComponent?.render();
  });

  // Master Story Assembly Function (Supports Zero-Config & Custom Directives & Re-Assembly)
  async function executeStoryAssembly(isZeroConfig = false) {
    const p = projectStore.project;
    const assets = p.imageAssets || [];
    if (assets.length === 0) {
      window.toastSystem.show('Please import visual scenes first!', 'warning');
      setCreatorStep(2);
      return;
    }

    let preset = 'CINEMATIC';
    let allowedTransitions = null;
    let motionPreset = 'mixture';
    let effectPreset = 'WARM_CINEMA';
    let sfxVal = 'auto_match';
    let enableBGM = true;
    let musicVol = 0.35;
    let enableOverlays = true;

    if (!isZeroConfig) {
      const activeCard = document.querySelector('.creator-preset-card.active');
      preset = activeCard ? activeCard.dataset.preset : (p.preset || 'CINEMATIC');
      effectPreset = document.querySelector('input[name="radGradingPreset"]:checked')?.value || 'WARM_CINEMA';

      // Motion mode
      const isCustomMotion = document.getElementById('radMotionCustom')?.checked;
      let allowedMotions = null;
      if (isCustomMotion) {
        const checkedMotionBoxes = Array.from(document.querySelectorAll('input[name="chkMotionSpecific"]:checked')).map(cb => cb.value);
        if (checkedMotionBoxes.length > 0) {
          allowedMotions = checkedMotionBoxes;
          motionPreset = checkedMotionBoxes.length === 1 ? checkedMotionBoxes[0] : checkedMotionBoxes;
        } else {
          motionPreset = 'SLOW_PUSH';
        }
      } else {
        motionPreset = 'mixture';
      }

      // Transitions
      const isCustomTrans = document.getElementById('radTransCustom')?.checked;
      if (isCustomTrans) {
        const checkedBoxes = Array.from(document.querySelectorAll('input[name="chkTransSpecific"]:checked')).map(cb => cb.value);
        if (checkedBoxes.length > 0) allowedTransitions = checkedBoxes;
      }

      enableBGM = document.getElementById('chkCreatorBGM')?.checked ?? true;
      enableOverlays = document.getElementById('chkCreatorTextOverlays')?.checked ?? true;
      musicVol = window.selectedMusicVolume !== undefined ? window.selectedMusicVolume : 0.35;
    }

    const sfxEnabled = document.getElementById('chkCreatorSFXEnabled')?.checked ?? true;
    const selectedSFX = Array.from(document.querySelectorAll('input[name="chkSFXItem"]:checked')).map(cb => cb.value);
    const enableCaptions = document.getElementById('chkCreatorEnableCaptions')?.checked ?? true;
    const captionFontSize = parseInt(document.getElementById('sliderCaptionFontSize')?.value || '24', 10);
    const captionPosV = parseInt(document.getElementById('sliderCaptionPosV')?.value || '86', 10);
    const voVolume = (typeof p.voiceoverVolume === 'number') ? p.voiceoverVolume : 1.0;

    window.toastSystem.show(isZeroConfig ? '⚡ AI Magic assembling your story video...' : 'Assembling story with chosen creative directives...', 'info', 2500);

    try {
      const payload = {
        projectName: p.name || 'Story Video',
        preset,
        voiceover: p.voiceover,
        imageAssets: assets,
        options: {
          motionEnabled: true,
          motionPreset,
          allowedMotions,
          effectPreset,
          transitionsEnabled: true,
          smartTransitions: true,
          allowedTransitions,
          smartOverlays: enableOverlays,
          sfxEnabled: sfxEnabled && (selectedSFX.length > 0 || !!window.customUploadedSFX),
          selectedSFX: selectedSFX,
          customSFXPath: window.customUploadedSFX ? window.customUploadedSFX.path : null,
          customSFXName: window.customUploadedSFX ? window.customUploadedSFX.name : null,
          musicEnabled: enableBGM,
          musicVolume: musicVol,
          duckingEnabled: enableBGM,
          enableCaptions: enableCaptions,
          captionFontSize: captionFontSize,
          captionPositionPercent: captionPosV,
          voiceoverVolume: voVolume
        }
      };

      if (document.getElementById('txtCreatorScriptInput')?.value?.trim()) {
        payload.transcriptContent = document.getElementById('txtCreatorScriptInput').value.trim();
      }

      const result = await ApiClient.runAutoEdit(payload);
      if (result && result.project) {
        if (!result.project.imageAssets || result.project.imageAssets.length === 0) {
          result.project.imageAssets = assets;
        }
        // Preserve user custom captions & settings
        if (p.timeline?.captions?.length > 0 && (!result.project.timeline.captions || result.project.timeline.captions.length === 0)) {
          result.project.timeline.captions = p.timeline.captions;
        }
        if (p.captionStyle) {
          result.project.captionStyle = p.captionStyle;
        }
        if (p.timeline?.musicClips?.length > 0 && p.timeline.musicClips[0].id?.startsWith('bgm_custom')) {
          result.project.timeline.musicClips = p.timeline.musicClips;
        }

        result.project.enableCaptions = enableCaptions;
        result.project.captionFontSize = captionFontSize;
        result.project.captionPositionPercent = captionPosV;
        result.project.voiceoverVolume = voVolume;

        projectStore.setProject(result.project);
        window.toastSystem.show('✨ Story video assembled successfully with transitions & audio!', 'success');
        setCreatorStep(4);
        renderStoryboardCards();
        window.previewPlayer?.renderFrame(0);
      }
    } catch (err) {
      console.warn('Backend auto-edit synthesis fallback, building locally:', err);
      const defaultTrans = (allowedTransitions && allowedTransitions.length > 0) ? allowedTransitions[0] : 'DISSOLVE';
      const clips = TimelineBuilderService.buildVideoClips(assets, p.voiceoverDuration || Math.max(assets.length * 4.5, 10.0), {
        defaultMotion: motionPreset === 'mixture' ? 'SLOW_PUSH' : motionPreset,
        defaultTransition: defaultTrans
      });
      p.timeline.videoClips = clips;
      p.enableCaptions = enableCaptions;
      p.captionFontSize = captionFontSize;
      p.captionPositionPercent = captionPosV;
      p.voiceoverVolume = voVolume;
      projectStore.notify();
      setCreatorStep(4);
      renderStoryboardCards();
      window.previewPlayer?.renderFrame(0);
      window.toastSystem.show('✨ Story assembled locally with full motion & transitions!', 'success');
    }
  }

  // Trigger handlers for Assemble actions
  document.getElementById('btnZeroConfigAssembleTop')?.addEventListener('click', () => executeStoryAssembly(true));
  document.getElementById('btnZeroConfigAssembleBottom')?.addEventListener('click', () => executeStoryAssembly(true));
  document.getElementById('btnTriggerCreatorAutoEdit')?.addEventListener('click', () => executeStoryAssembly(false));
}

// ============================================================
// STEP 4: INTERACTIVE VISUAL STORYBOARD CARD DECK & VO CONTROLS
// ============================================================
let _step4ControlsInitialized = false;

function initStep4ReviewControls() {
  if (_step4ControlsInitialized) return;
  _step4ControlsInitialized = true;

  // 1. Voiceover Play / Pause Button
  const btnVoPlay = document.getElementById('btnVoReviewPlayPause');
  btnVoPlay?.addEventListener('click', () => {
    window.previewPlayer?.togglePlayPause();
    if (btnVoPlay) {
      btnVoPlay.textContent = window.previewPlayer?.isPlaying ? '⏸' : '▶';
    }
  });

  // 2. Voiceover Volume Slider
  const sliderVoVol = document.getElementById('sliderVoReviewVolume');
  const lblVoVol = document.getElementById('lblVoReviewVolume');
  sliderVoVol?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    const floatVol = +(val / 100).toFixed(2);
    if (lblVoVol) lblVoVol.textContent = `${val}%`;
    projectStore.project.voiceoverVolume = floatVol;
    if (projectStore.project.audioSettings) {
      projectStore.project.audioSettings.voiceoverVolume = floatVol;
    }
    window.previewPlayer?.setVoiceoverVolume(floatVol);
  });

  // 3. Click / Drag to seek on Voiceover Progress Track
  const voTrack = document.getElementById('voProgressTrack');
  if (voTrack) {
    const seekWithEvent = (e) => {
      const rect = voTrack.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = clickX / rect.width;
      const totalDur = window.previewPlayer?.getTotalDuration() || projectStore.project.voiceoverDuration || 30.0;
      window.previewPlayer?.seek(pct * totalDur);
    };

    voTrack.addEventListener('click', seekWithEvent);

    let isScrubbingVo = false;
    voTrack.addEventListener('mousedown', (e) => {
      isScrubbingVo = true;
      seekWithEvent(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isScrubbingVo) seekWithEvent(e);
    });
    window.addEventListener('mouseup', () => {
      isScrubbingVo = false;
    });
  }

  // 4. Storyboard Zoom Slider
  const sliderZoom = document.getElementById('sliderStoryboardZoom');
  const lblZoom = document.getElementById('lblStoryboardZoom');
  const deck = document.getElementById('creatorStoryboardDeck');

  sliderZoom?.addEventListener('input', (e) => {
    const val = e.target.value;
    if (lblZoom) lblZoom.textContent = `${val}px`;
    if (deck) deck.style.setProperty('--card-width', `${val}px`);
  });

  // 5. Deck View vs Grid View Buttons
  const btnDeck = document.getElementById('btnStoryboardDeckView');
  const btnGrid = document.getElementById('btnStoryboardGridView');

  btnDeck?.addEventListener('click', () => {
    deck?.classList.remove('grid-view');
    if (btnDeck) btnDeck.className = 'btn btn-xs btn-primary';
    if (btnGrid) btnGrid.className = 'btn btn-xs btn-outline';
  });

  btnGrid?.addEventListener('click', () => {
    deck?.classList.add('grid-view');
    if (btnGrid) btnGrid.className = 'btn btn-xs btn-primary';
    if (btnDeck) btnDeck.className = 'btn btn-xs btn-outline';
  });
}

function updateStep4VoiceoverUI() {
  const p = projectStore.project;
  const fnEl = document.getElementById('voReviewFilename');
  const badgeEl = document.getElementById('voReviewDurationBadge');
  const sliderVol = document.getElementById('sliderVoReviewVolume');
  const lblVol = document.getElementById('lblVoReviewVolume');

  if (fnEl) {
    fnEl.textContent = p.voiceover?.filename || p.voiceover?.name || 'voiceover.mp3';
  }
  const totalVoDur = p.voiceoverDuration || (p.timeline?.videoClips?.length ? p.timeline.videoClips[p.timeline.videoClips.length - 1].endTime : 30.0);
  if (badgeEl) {
    badgeEl.textContent = TimestampParser.formatSeconds(totalVoDur);
  }
  const curVol = Math.round(((typeof p.voiceoverVolume === 'number') ? p.voiceoverVolume : 1.0) * 100);
  if (sliderVol) sliderVol.value = curVol;
  if (lblVol) lblVol.textContent = `${curVol}%`;
}

function renderStoryboardCards() {
  initStep4ReviewControls();
  updateStep4VoiceoverUI();

  const deck = document.getElementById('creatorStoryboardDeck');
  const countEl = document.getElementById('storyboardSceneCount');
  if (!deck) return;

  const clips = projectStore.project.timeline?.videoClips || [];
  if (countEl) countEl.textContent = `${clips.length} scenes`;

  if (clips.length === 0) {
    deck.innerHTML = `<div style="padding:16px;color:#94A3B8;font-size:12px;">No scenes assembled yet. Complete Step 2 & 3 first.</div>`;
    return;
  }

  deck.innerHTML = '';
  clips.forEach((clip, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'storyboard-card-wrap';

    // Scene Card
    const card = document.createElement('div');
    card.className = 'storyboard-card';
    card.dataset.clipId = clip.id;
    card.dataset.startTime = clip.startTime;

    const ext = (clip.path || '').split('.').pop().toLowerCase();
    const isVideo = clip.mediaType?.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext);
    const motionIcon = isVideo ? '🎥' : (clip.motion?.preset ? (MOTION_PRESETS[clip.motion.preset]?.icon || '✦') : '✦');
    const captionForClip = (projectStore.project.timeline?.captions || []).find(c => clip.startTime >= c.startTime && clip.startTime < c.endTime)?.text || '';

    card.innerHTML = `
      <div class="storyboard-thumb-box">
        <img class="storyboard-thumb-img" src="${clip.path}" alt="${clip.filename}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 60%22><rect width=%22100%22 height=%2260%22 fill=%22%231e293b%22/><text x=%2250%22 y=%2235%22 fill=%22%2364748b%22 font-size=%2210%22 text-anchor=%22middle%22>Scene ${idx + 1}</text></svg>'">
        <span class="storyboard-motion-pill" title="Camera Motion: ${clip.motion?.preset || 'None'}">${motionIcon}</span>
        <span class="storyboard-time-pill">${TimestampParser.formatSeconds(clip.startTime)}</span>
        <button type="button" class="storyboard-card-gear-btn" title="Edit Scene Settings" data-clip-id="${clip.id}">⚙</button>
      </div>
      <div class="storyboard-card-body">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
          <span class="storyboard-scene-title" style="flex:1;">#${idx + 1} ${clip.filename}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
          <span class="storyboard-caption-snippet" style="flex:1;" title="${captionForClip}">${captionForClip || `${clip.duration}s scene`}</span>
          <button type="button" class="storyboard-quick-edit-link" data-clip-id="${clip.id}" title="Edit Scene">Edit</button>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.storyboard-card-gear-btn') || e.target.closest('.storyboard-quick-edit-link')) {
        e.stopPropagation();
        openSceneCardEditor(clip.id);
        return;
      }
      window.previewPlayer?.seek(clip.startTime);
      highlightActiveStoryboardCard(clip.startTime);
    });

    wrap.appendChild(card);

    // Transition Connector Badge between Scene Cards
    if (idx < clips.length - 1) {
      const nextClip = clips[idx + 1];
      const nextTrans = nextClip.transition?.type || 'DISSOLVE';
      const transIcon = TRANSITIONS[nextTrans]?.icon || '◐';

      const transChip = document.createElement('div');
      transChip.className = 'storyboard-trans-connector';
      transChip.title = `Click to edit transition into Scene #${idx + 2}: ${nextTrans} (${nextClip.transition?.duration || 0.5}s)`;
      transChip.innerHTML = `<span>${transIcon}</span><span style="font-size:8px;margin-top:2px;">${nextTrans}</span><span style="font-size:7.5px;opacity:0.75;">⚙</span>`;

      transChip.addEventListener('click', (e) => {
        e.stopPropagation();
        openTransitionPickerModal(idx + 1);
      });

      wrap.appendChild(transChip);
    }

    deck.appendChild(wrap);
  });

  highlightActiveStoryboardCard(timelineStore.currentTime);
}

function highlightActiveStoryboardCard(currentTime) {
  const deck = document.getElementById('creatorStoryboardDeck');
  if (!deck) return;

  const clips = projectStore.project.timeline?.videoClips || [];
  const activeClip = clips.find(c => currentTime >= c.startTime && currentTime < c.endTime);

  deck.querySelectorAll('.storyboard-card').forEach(card => {
    if (activeClip && card.dataset.clipId === activeClip.id) {
      card.classList.add('active-playing');
    } else {
      card.classList.remove('active-playing');
    }
  });
}

// Expose globally for PreviewEngine
window.highlightActiveStoryboardCard = highlightActiveStoryboardCard;

// ------------------------------------------------------------
// INTERACTIVE SCENE CARD EDITOR (MODAL)
// ------------------------------------------------------------
function openSceneCardEditor(clipId) {
  const clips = projectStore.project.timeline?.videoClips || [];
  const idx = clips.findIndex(c => c.id === clipId);
  if (idx === -1) return;
  const clip = clips[idx];

  window._activeEditingClipId = clipId;

  const modal = document.getElementById('modalCardSceneEditor');
  const titleEl = document.getElementById('modalSceneEditorTitle');
  const thumbEl = document.getElementById('sceneEditorThumb');
  const fnEl = document.getElementById('sceneEditorFilename');
  const timingEl = document.getElementById('sceneEditorTimingLabel');
  const capEl = document.getElementById('sceneEditorCaptionSnippet');
  const selMotion = document.getElementById('selectSceneMotion');
  const inDur = document.getElementById('inputSceneDuration');
  const selIntensity = document.getElementById('selectSceneIntensity');

  if (titleEl) titleEl.textContent = `Edit Scene #${idx + 1} (${clip.filename})`;
  if (thumbEl) thumbEl.src = clip.path;
  if (fnEl) fnEl.textContent = `#${idx + 1} - ${clip.filename}`;
  if (timingEl) timingEl.textContent = `Timeline: ${TimestampParser.formatSeconds(clip.startTime)} ➔ ${TimestampParser.formatSeconds(clip.endTime)} (${clip.duration}s)`;

  const cap = (projectStore.project.timeline?.captions || []).find(c => clip.startTime >= c.startTime && clip.startTime < c.endTime);
  if (capEl) capEl.textContent = cap ? `Caption: "${cap.text}"` : '';

  if (selMotion) selMotion.value = clip.motion?.preset || 'SLOW_PUSH';
  if (inDur) inDur.value = clip.duration || 4.5;
  if (selIntensity) selIntensity.value = clip.motion?.intensity ? String(clip.motion.intensity) : '0.15';

  modal?.classList.remove('hidden');
}

function saveSceneCardChanges() {
  const clipId = window._activeEditingClipId;
  const clips = projectStore.project.timeline?.videoClips || [];
  const idx = clips.findIndex(c => c.id === clipId);
  if (idx === -1) return;
  const clip = clips[idx];

  const selMotion = document.getElementById('selectSceneMotion');
  const inDur = document.getElementById('inputSceneDuration');
  const selIntensity = document.getElementById('selectSceneIntensity');

  const newMotion = selMotion ? selMotion.value : (clip.motion?.preset || 'SLOW_PUSH');
  const newDur = Math.max(0.5, inDur ? parseFloat(inDur.value) || 4.5 : 4.5);
  const newIntensity = selIntensity ? parseFloat(selIntensity.value) || 0.15 : 0.15;

  clip.motion = {
    preset: newMotion,
    intensity: newIntensity
  };
  clip.duration = +newDur.toFixed(2);

  // Recalculate timeline starts/ends for all clips
  let curr = 0;
  clips.forEach(c => {
    c.startTime = +curr.toFixed(3);
    c.endTime = +(curr + c.duration).toFixed(3);
    curr = c.endTime;
  });

  document.getElementById('modalCardSceneEditor')?.classList.add('hidden');
  renderStoryboardCards();
  window.timelineComponent?.render();
  window.previewPlayer?.renderFrame(clip.startTime);
  updateCreatorExportSummary();
  window.toastSystem?.show(`Scene #${idx + 1} updated successfully!`, 'success', 2500);
}

function moveScene(direction) {
  const clipId = window._activeEditingClipId;
  const clips = projectStore.project.timeline?.videoClips || [];
  const idx = clips.findIndex(c => c.id === clipId);
  if (idx === -1) return;

  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= clips.length) {
    window.toastSystem?.show(direction < 0 ? 'Scene is already at the beginning.' : 'Scene is already at the end.', 'info');
    return;
  }

  // Swap clips
  const temp = clips[idx];
  clips[idx] = clips[targetIdx];
  clips[targetIdx] = temp;

  // Recalculate timeline starts/ends
  let curr = 0;
  clips.forEach(c => {
    c.startTime = +curr.toFixed(3);
    c.endTime = +(curr + c.duration).toFixed(3);
    curr = c.endTime;
  });

  renderStoryboardCards();
  window.timelineComponent?.render();
  openSceneCardEditor(clipId);
  window.previewPlayer?.renderFrame(temp.startTime);
  updateCreatorExportSummary();
  window.toastSystem?.show(`Scene moved to #${targetIdx + 1}!`, 'success', 2000);
}

function deleteSceneCard() {
  const clipId = window._activeEditingClipId;
  const clips = projectStore.project.timeline?.videoClips || [];
  const idx = clips.findIndex(c => c.id === clipId);
  if (idx === -1) return;

  if (!confirm(`Are you sure you want to delete Scene #${idx + 1} (${clips[idx].filename})?`)) return;

  clips.splice(idx, 1);

  // Recalculate timeline starts/ends
  let curr = 0;
  clips.forEach(c => {
    c.startTime = +curr.toFixed(3);
    c.endTime = +(curr + c.duration).toFixed(3);
    curr = c.endTime;
  });

  document.getElementById('modalCardSceneEditor')?.classList.add('hidden');
  renderStoryboardCards();
  window.timelineComponent?.render();
  if (clips.length > 0) {
    window.previewPlayer?.renderFrame(clips[0].startTime);
  }
  updateCreatorExportSummary();
  window.toastSystem?.show('Scene deleted from storyboard.', 'info');
}

// ------------------------------------------------------------
// INTERACTIVE TRANSITION PICKER (MODAL)
// ------------------------------------------------------------
function openTransitionPickerModal(clipIndex) {
  const clips = projectStore.project.timeline?.videoClips || [];
  if (clipIndex < 1 || clipIndex >= clips.length) return;

  window._activeTransitionClipIndex = clipIndex;
  const prevClip = clips[clipIndex - 1];
  const targetClip = clips[clipIndex];

  const modal = document.getElementById('modalTransitionPicker');
  const titleEl = document.getElementById('modalTransPickerTitle');
  const descEl = document.getElementById('lblTransPickerSceneDesc');
  const selType = document.getElementById('selectPickerTransType');
  const inDur = document.getElementById('inputPickerTransDuration');

  if (titleEl) titleEl.textContent = `Transition: Scene #${clipIndex} ➔ Scene #${clipIndex + 1}`;
  if (descEl) descEl.textContent = `Connecting '${prevClip.filename}' into '${targetClip.filename}'`;

  if (selType) selType.value = targetClip.transition?.type || 'DISSOLVE';
  if (inDur) inDur.value = targetClip.transition?.duration ? String(targetClip.transition.duration) : '0.5';

  modal?.classList.remove('hidden');
}

function applyTransition(isAll = false) {
  const clipIndex = window._activeTransitionClipIndex;
  const clips = projectStore.project.timeline?.videoClips || [];
  if (clipIndex < 1 || clipIndex >= clips.length) return;

  const selType = document.getElementById('selectPickerTransType');
  const inDur = document.getElementById('inputPickerTransDuration');

  const chosenType = selType ? selType.value : 'DISSOLVE';
  const chosenDur = Math.max(0.1, Math.min(2.0, inDur ? parseFloat(inDur.value) || 0.5 : 0.5));

  if (isAll) {
    for (let i = 1; i < clips.length; i++) {
      clips[i].transition = {
        type: chosenType,
        duration: chosenDur
      };
    }
    window.toastSystem?.show(`Applied ${chosenType} (${chosenDur}s) across all ${clips.length - 1} scene transitions!`, 'success', 3000);
  } else {
    clips[clipIndex].transition = {
      type: chosenType,
      duration: chosenDur
    };
    window.toastSystem?.show(`Transition into Scene #${clipIndex + 1} set to ${chosenType} (${chosenDur}s)!`, 'success', 2500);
  }

  document.getElementById('modalTransitionPicker')?.classList.add('hidden');
  renderStoryboardCards();
  window.timelineComponent?.render();
}

function initStoryboardEditorModals() {
  // Scene Card Editor Modal
  const modalScene = document.getElementById('modalCardSceneEditor');
  document.getElementById('btnCloseSceneEditorModal')?.addEventListener('click', () => {
    modalScene?.classList.add('hidden');
  });
  document.getElementById('btnCloseSceneEditor')?.addEventListener('click', () => {
    modalScene?.classList.add('hidden');
  });
  modalScene?.addEventListener('click', (e) => {
    if (e.target === modalScene) modalScene.classList.add('hidden');
  });

  document.getElementById('btnSaveSceneEditor')?.addEventListener('click', () => {
    saveSceneCardChanges();
  });
  document.getElementById('btnSceneMoveLeft')?.addEventListener('click', () => {
    moveScene(-1);
  });
  document.getElementById('btnSceneMoveRight')?.addEventListener('click', () => {
    moveScene(1);
  });
  document.getElementById('btnSceneDelete')?.addEventListener('click', () => {
    deleteSceneCard();
  });

  // Transition Picker Modal
  const modalTrans = document.getElementById('modalTransitionPicker');
  document.getElementById('btnCloseTransitionPickerModal')?.addEventListener('click', () => {
    modalTrans?.classList.add('hidden');
  });
  document.getElementById('btnCloseTransitionPicker')?.addEventListener('click', () => {
    modalTrans?.classList.add('hidden');
  });
  modalTrans?.addEventListener('click', (e) => {
    if (e.target === modalTrans) modalTrans.classList.add('hidden');
  });

  document.getElementById('btnPickerApplySingle')?.addEventListener('click', () => {
    applyTransition(false);
  });
  document.getElementById('btnPickerApplyAll')?.addEventListener('click', () => {
    applyTransition(true);
  });

  document.querySelectorAll('.btn-quick-trans-dur').forEach(btn => {
    btn.addEventListener('click', () => {
      const dur = btn.dataset.dur;
      const inp = document.getElementById('inputPickerTransDuration');
      if (inp) inp.value = dur;
    });
  });
}

function initCreatorReviewHandlers() {
  const playBtn = document.getElementById('btnCreatorPlayPause');
  playBtn?.addEventListener('click', () => {
    window.previewPlayer.togglePlayPause();
  });

  initStoryboardEditorModals();

  timelineStore.subscribe(() => {
    if (playBtn) {
      playBtn.textContent = timelineStore.isPlaying ? '⏸' : '▶';
    }
    const timeDisp = document.getElementById('creatorTimeDisplay');
    if (timeDisp) {
      const cur = formatTime(timelineStore.currentTime);
      const total = formatTime(window.previewPlayer ? window.previewPlayer.getTotalDuration() : 30.0);
      timeDisp.textContent = `${cur} / ${total}`;
    }

    // Highlight active card in visual storyboard in sync with playback
    highlightActiveStoryboardCard(timelineStore.currentTime);
  });
}

function updateCreatorExportSummary() {
  const p = projectStore.project;
  const inPt = timelineStore.inPoint;
  const outPt = timelineStore.outPoint;
  const inOutBox = document.getElementById('boxCreatorInOutExport');
  const inOutTxt = document.getElementById('txtCreatorExportInOutRange');
  const inOutChk = document.getElementById('chkCreatorExportInOutOnly');

  let dur = p.voiceoverDuration || (p.timeline?.videoClips?.reduce((acc, c) => Math.max(acc, c.endTime), 0)) || 30.0;

  if (inPt !== null || outPt !== null) {
    const effStart = inPt !== null ? inPt : 0.0;
    const effEnd = outPt !== null ? outPt : dur;
    if (inOutBox) inOutBox.classList.remove('hidden');
    if (inOutTxt) inOutTxt.textContent = `${TimestampParser.formatSeconds(effStart)} - ${TimestampParser.formatSeconds(effEnd)} (${(effEnd - effStart).toFixed(1)}s)`;
    if (inOutChk && inOutChk.checked) {
      dur = Math.max(0.5, +(effEnd - effStart).toFixed(2));
    }
  } else if (inOutBox) {
    inOutBox.classList.add('hidden');
  }

  const durStr = formatTime(dur);
  const expDur = document.getElementById('creatorExpDur');
  if (expDur) expDur.textContent = durStr;

  const prof = document.getElementById('creatorSelectProfile')?.value || '1080p';
  const expRes = document.getElementById('creatorExpRes');
  if (expRes) {
    if (prof === '4k') expRes.textContent = '4K Ultra HD (3840x2160)';
    else if (prof === 'vertical_1080p') expRes.textContent = '1080x1920 (9:16 Shorts)';
    else if (prof === '720p') expRes.textContent = '720p HD (1280x720)';
    else expRes.textContent = '1080p Full HD (1920x1080)';
  }

  const expSize = document.getElementById('creatorExpSize');
  if (expSize) {
    const mb = Math.max(10, Math.round(dur * 1.4));
    expSize.textContent = `~${mb} MB`;
  }
}

function initCreatorExportHandlers() {
  document.getElementById('creatorSelectProfile')?.addEventListener('change', updateCreatorExportSummary);
  document.getElementById('chkCreatorExportInOutOnly')?.addEventListener('change', updateCreatorExportSummary);

  document.getElementById('btnCreatorStartExport')?.addEventListener('click', async () => {
    const p = projectStore.project;
    const profile = document.getElementById('creatorSelectProfile')?.value || '1080p';
    const hw = document.getElementById('creatorSelectHw')?.value || 'auto';
    const inOutChk = document.getElementById('chkCreatorExportInOutOnly');

    const exportSettings = {
      resolution: profile,
      fps: 30,
      codec: 'h264',
      quality: 'balanced',
      useHardwareAcceleration: hw !== 'cpu'
    };

    // CapCut In/Out Range Export
    if (inOutChk && inOutChk.checked && (timelineStore.inPoint !== null || timelineStore.outPoint !== null)) {
      const fullDur = p.voiceoverDuration || (p.timeline?.videoClips?.reduce((acc, c) => Math.max(acc, c.endTime), 0)) || 30.0;
      const effStart = timelineStore.inPoint !== null ? timelineStore.inPoint : 0.0;
      const effEnd = timelineStore.outPoint !== null ? timelineStore.outPoint : fullDur;
      exportSettings.trimRange = {
        start: effStart,
        duration: +(effEnd - effStart).toFixed(3)
      };
      window.toastSystem?.show(`Exporting In/Out range: ${TimestampParser.formatSeconds(effStart)} to ${TimestampParser.formatSeconds(effEnd)}`, 'info', 2000);
    }

    const progressBox = document.getElementById('creatorRenderProgressBox');
    const startBtn = document.getElementById('btnCreatorStartExport');
    const downloadBtn = document.getElementById('btnCreatorDownloadMp4');

    progressBox?.classList.remove('hidden');
    startBtn?.classList.add('hidden');
    downloadBtn?.classList.add('hidden');

    try {
      window.toastSystem?.show('Preparing master render...', 'info', 1500);

      // 1. Try high-performance backend FFmpeg render if available
      try {
        await ensureProjectAssetsUploaded(p);
        const res = await ApiClient.startRender(p, exportSettings);
        if (res && res.jobId) {
          pollCreatorExportProgress(res.jobId);
          return;
        }
      } catch (backendErr) {
        console.warn('Backend FFmpeg render unavailable, activating browser renderer:', backendErr);
      }

      // 2. Client-Side In-Browser Fallback (Canvas Stream & MediaRecorder)
      // Works seamlessly on Vercel or any web host with zero backend dependencies!
      window.toastSystem?.show('Web Cloud Mode: Rendering master video directly in your browser with Canvas & MediaRecorder...', 'info', 3500);

      const fill = document.getElementById('creatorRenderProgressFill');
      const stage = document.getElementById('creatorRenderStage');
      const percent = document.getElementById('creatorRenderPercent');
      const fps = document.getElementById('creatorRenderFps');
      const eta = document.getElementById('creatorRenderEta');

      const result = await previewEngine.exportInBrowser({
        fps: 30,
        onProgress: (prog) => {
          if (fill) fill.style.width = `${prog.progressPercent}%`;
          if (percent) percent.textContent = `${prog.progressPercent}%`;
          if (stage) stage.textContent = prog.stage;
          if (fps) fps.textContent = `${prog.fps || 30} FPS`;
          const remainingSec = Math.max(0, Math.round((previewEngine.getTotalDuration() * (100 - prog.progressPercent)) / 100));
          if (eta) eta.textContent = `ETA: ${remainingSec}s`;
        }
      });

      if (fill) fill.style.width = '100%';
      if (percent) percent.textContent = '100%';
      if (stage) stage.textContent = '✓ Rendering Complete! Downloading video...';

      if (downloadBtn) {
        downloadBtn.href = result.downloadUrl;
        const cleanName = (p.name || 'MAK_Video_Project').replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadBtn.download = `${cleanName}_export.${result.ext}`;
        downloadBtn.classList.remove('hidden');
        downloadBtn.click();
      }

      window.toastSystem.show(`🎉 Video rendered & downloaded successfully! (${result.ext.toUpperCase()})`, 'success', 5000);

    } catch (err) {
      window.toastSystem.show(`Render failed: ${err.message}`, 'error');
      startBtn?.classList.remove('hidden');
      progressBox?.classList.add('hidden');
    }
  });
}

function pollCreatorExportProgress(jobId) {
  const fill = document.getElementById('creatorRenderProgressFill');
  const stage = document.getElementById('creatorRenderStage');
  const percent = document.getElementById('creatorRenderPercent');
  const fps = document.getElementById('creatorRenderFps');
  const eta = document.getElementById('creatorRenderEta');
  const downloadBtn = document.getElementById('btnCreatorDownloadMp4');

  const timer = setInterval(async () => {
    try {
      const job = await ApiClient.getRenderJob(jobId);
      if (!job) return;

      const pct = job.progressPercent || 0;
      if (fill) fill.style.width = `${pct}%`;
      if (percent) percent.textContent = `${pct}%`;
      if (stage) stage.textContent = job.stage || 'Rendering Video...';
      if (fps) fps.textContent = `${job.fps || 0} FPS`;
      if (eta) eta.textContent = `ETA: ${job.remainingSecondsEstimate || 0}s`;

      if (job.status === 'completed') {
        clearInterval(timer);
        if (fill) fill.style.width = '100%';
        if (percent) percent.textContent = '100%';
        if (stage) stage.textContent = '✓ Rendering Complete! Downloading MP4...';
        if (downloadBtn) {
          downloadBtn.href = `/api/render/download?jobId=${jobId}`;
          downloadBtn.classList.remove('hidden');
          try {
            downloadBtn.click();
          } catch (e) {
            console.warn('Auto-download note:', e);
          }
        }
        window.toastSystem.show('🎉 Master MP4 rendered and downloaded successfully!', 'success', 4000);
      } else if (job.status === 'failed' || job.status === 'cancelled') {
        clearInterval(timer);
        if (stage) stage.textContent = `Render error: ${job.error || 'Failed'}`;
        document.getElementById('btnCreatorStartExport')?.classList.remove('hidden');
        window.toastSystem.show(`Render failed: ${job.error}`, 'error');
      }
    } catch (e) {
      clearInterval(timer);
    }
  }, 800);
}

// ============================================================
// PRO MODE: AUDIO MIXER & DUCKING CONTROLS
// ============================================================
function initProAudioMixer() {
  const sMaster = document.getElementById('sliderMixerMaster');
  const sVo = document.getElementById('sliderMixerVo');
  const sMusic = document.getElementById('sliderMixerMusic');
  const sSfx = document.getElementById('sliderMixerSfx');
  const sDuck = document.getElementById('sliderMixerDucking');

  sMaster?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    document.getElementById('valMixerMaster').textContent = `${val}%`;
    if (!projectStore.project.audioSettings) projectStore.project.audioSettings = {};
    projectStore.project.audioSettings.masterVolume = val / 100;
  });

  sVo?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    document.getElementById('valMixerVo').textContent = `${val}%`;
    if (!projectStore.project.audioSettings) projectStore.project.audioSettings = {};
    projectStore.project.audioSettings.voiceoverVolume = val / 100;
  });

  sMusic?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    document.getElementById('valMixerMusic').textContent = `${val}%`;
    if (!projectStore.project.audioSettings) projectStore.project.audioSettings = {};
    projectStore.project.audioSettings.musicVolume = val / 100;
  });

  sSfx?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    document.getElementById('valMixerSfx').textContent = `${val}%`;
    if (!projectStore.project.audioSettings) projectStore.project.audioSettings = {};
    projectStore.project.audioSettings.sfxVolume = val / 100;
  });

  sDuck?.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    document.getElementById('valMixerDucking').textContent = `${val} dB`;
    if (!projectStore.project.audioSettings) projectStore.project.audioSettings = {};
    projectStore.project.audioSettings.duckingStrengthDB = val;
    projectStore.project.audioSettings.duckingDepthDb = val;
  });
}

function updateMixerSlidersFromProject() {
  const s = projectStore.project.audioSettings || {};
  const sMaster = document.getElementById('sliderMixerMaster');
  const sVo = document.getElementById('sliderMixerVo');
  const sMusic = document.getElementById('sliderMixerMusic');
  const sSfx = document.getElementById('sliderMixerSfx');
  const sDuck = document.getElementById('sliderMixerDucking');

  if (sMaster && s.masterVolume !== undefined) {
    sMaster.value = Math.round(s.masterVolume * 100);
    document.getElementById('valMixerMaster').textContent = `${sMaster.value}%`;
  }
  if (sVo && s.voiceoverVolume !== undefined) {
    sVo.value = Math.round(s.voiceoverVolume * 100);
    document.getElementById('valMixerVo').textContent = `${sVo.value}%`;
  }
  if (sMusic && s.musicVolume !== undefined) {
    sMusic.value = Math.round(s.musicVolume * 100);
    document.getElementById('valMixerMusic').textContent = `${sMusic.value}%`;
  }
  if (sSfx && s.sfxVolume !== undefined) {
    sSfx.value = Math.round(s.sfxVolume * 100);
    document.getElementById('valMixerSfx').textContent = `${sSfx.value}%`;
  }
  if (sDuck && (s.duckingStrengthDB !== undefined || s.duckingDepthDb !== undefined)) {
    const dVal = s.duckingStrengthDB ?? s.duckingDepthDb;
    sDuck.value = dVal;
    document.getElementById('valMixerDucking').textContent = `${dVal} dB`;
  }
}

// ============================================================
// PRO MODE: SMART TEXT OVERLAYS DRAWER
// ============================================================
function initProSmartOverlays() {
  document.getElementById('btnExtractSmartOverlays')?.addEventListener('click', async () => {
    const captions = projectStore.project.timeline?.captions || [];
    if (captions.length === 0) {
      window.toastSystem.show('Please import or generate captions first to extract smart overlays.', 'warning');
      return;
    }

    window.toastSystem.show('Analyzing speech semantics for key metrics & callouts...', 'info', 2000);
    try {
      const res = await ApiClient.generateSmartOverlays(captions);
      if (res && res.overlays && res.overlays.length > 0) {
        if (!projectStore.project.timeline) projectStore.project.timeline = {};
        projectStore.project.timeline.textOverlays = res.overlays;
        projectStore.notify();
        renderOverlaysList();
        window.toastSystem.show(`✨ Extracted ${res.overlays.length} smart graphic callouts!`, 'success');
      } else {
        window.toastSystem.show('No prominent numbers or dramatic metrics found in speech.', 'info');
      }
    } catch (e) {
      window.toastSystem.show(`Overlay extraction failed: ${e.message}`, 'error');
    }
  });

  document.getElementById('btnAddCustomOverlay')?.addEventListener('click', () => {
    const input = document.getElementById('inputNewOverlayText');
    const text = input?.value.trim();
    if (!text) return;

    if (!projectStore.project.timeline) projectStore.project.timeline = {};
    if (!projectStore.project.timeline.textOverlays) projectStore.project.timeline.textOverlays = [];

    const curTime = timelineStore.currentTime;
    projectStore.project.timeline.textOverlays.push({
      id: `ov_${Date.now()}`,
      text,
      startTime: curTime,
      duration: 3.0,
      endTime: curTime + 3.0,
      style: 'METRIC_BADGE',
      color: '#FFFFFF',
      highlightColor: '#FDE047',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      fontSize: 60,
      yOffsetPercent: 48
    });

    if (input) input.value = '';
    projectStore.notify();
    renderOverlaysList();
    window.toastSystem.show(`Added overlay callout: "${text}"`, 'success');
  });

  renderOverlaysList();
}

function renderOverlaysList() {
  const container = document.getElementById('overlaysEditorList');
  if (!container) return;

  container.innerHTML = '';
  const overlays = projectStore.project.timeline?.textOverlays || [];

  if (overlays.length === 0) {
    container.innerHTML = '<div style="color:#64748B;font-size:12px;padding:8px 0;">No active text overlays. Click "Auto Extract" or add one above.</div>';
    return;
  }

  overlays.forEach(ov => {
    const row = document.createElement('div');
    row.className = 'subtitle-item-row';
    row.innerHTML = `
      <div style="flex:1;">
        <strong style="color:#FDE047;font-size:12px;">✦ ${ov.text}</strong>
        <div style="color:#94A3B8;font-size:11px;">${formatTime(ov.startTime)} - ${formatTime(ov.endTime)} (${ov.duration}s)</div>
      </div>
      <button class="btn-icon-xs text-danger btn-del-ov" title="Delete overlay">✕</button>
    `;

    row.querySelector('.btn-del-ov')?.addEventListener('click', () => {
      projectStore.project.timeline.textOverlays = projectStore.project.timeline.textOverlays.filter(o => o.id !== ov.id);
      projectStore.notify();
      renderOverlaysList();
    });

    row.addEventListener('click', () => {
      timelineStore.seek(ov.startTime);
      timelineStore.selectClip(ov.id, 'overlay');
    });

    container.appendChild(row);
  });
}

// ============================================================
// AUTOSAVE & CRASH RECOVERY SYSTEM
// ============================================================
function initAutosaveRecovery() {
  const saved = localStorage.getItem('maq_project_autosave');
  if (saved) {
    try {
      const snap = JSON.parse(saved);
      if (snap && snap.name && snap.timeline?.videoClips?.length > 0) {
        console.info('Autosave snapshot available for recovery:', snap.name);
      }
    } catch (e) {}
  }

  setInterval(() => {
    try {
      if (projectStore.project && projectStore.project.name) {
        localStorage.setItem('maq_project_autosave', JSON.stringify(projectStore.project));
        const saveInd = document.getElementById('saveIndicator');
        if (saveInd) {
          saveInd.textContent = '● Autosaved';
          saveInd.className = 'save-indicator saved';
        }
      }
    } catch (e) {}
  }, 30000);
}
