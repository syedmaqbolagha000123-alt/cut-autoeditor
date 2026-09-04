/**
 * MAQ AUTO EDITOR ULTRA - Real-Time Canvas Preview & WebAudio Multi-Track Engine
 */

class PreviewEngine {
  constructor(canvasId, captionOverlayId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.captionOverlay = document.getElementById(captionOverlayId);
    this.isPlaying = false;
    this.isLooping = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.masterVolume = 0.9;
    this.aspectRatio = '16:9';

    this.imageCache = new Map();
    this.audioPool = new Map(); // id -> HTMLAudioElement

    this.initAudio();
  }

  initAudio() {
    this.voiceoverAudio = new Audio();
    this.musicAudio = new Audio();
  }

  setAspectRatio(ratioStr) {
    this.aspectRatio = ratioStr;
    const aspectBox = document.getElementById('canvasAspectBox');
    if (aspectBox) {
      aspectBox.className = `canvas-aspect-box aspect-${ratioStr.replace(':', '-')}`;
    }
    if (ratioStr === '9:16') {
      this.canvas.width = 1080;
      this.canvas.height = 1920;
    } else if (ratioStr === '1:1') {
      this.canvas.width = 1080;
      this.canvas.height = 1080;
    } else if (ratioStr === '4:5') {
      this.canvas.width = 1080;
      this.canvas.height = 1350;
    } else {
      this.canvas.width = 1920;
      this.canvas.height = 1080;
    }
    this.renderFrame(timelineStore.currentTime);
  }

  resolveMediaUrl(src) {
    if (!src) return '';
    if (
      src.startsWith('blob:') ||
      src.startsWith('data:') ||
      src.startsWith('http://') ||
      src.startsWith('https://') ||
      src.startsWith('/')
    ) {
      return src;
    }
    return `/media/${encodeURIComponent(src)}`;
  }

  preloadImage(src) {
    if (!src) return Promise.resolve(null);
    if (this.imageCache.has(src)) return Promise.resolve(this.imageCache.get(src));

    return new Promise((resolve) => {
      const img = new Image();
      const resolvedSrc = this.resolveMediaUrl(src);
      img.src = resolvedSrc;
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = (err) => {
        console.warn('Failed to load image:', resolvedSrc, err);
        resolve(null);
      };
    });
  }

  play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastFrameTime = performance.now();

    // Sync Audio
    const project = projectStore.project;
    if (project.voiceover && project.voiceover.path) {
      const voSrc = this.resolveMediaUrl(project.voiceover.path);
      if (this.voiceoverAudio.src !== voSrc && this.voiceoverAudio.src !== window.location.origin + voSrc) {
        this.voiceoverAudio.src = voSrc;
      }
      this.voiceoverAudio.currentTime = Math.min(timelineStore.currentTime, project.voiceoverDuration || this.voiceoverAudio.duration || 0);
      const voVol = (typeof project.voiceoverVolume === 'number')
        ? project.voiceoverVolume
        : (project.audioSettings?.voiceoverVolume ?? 1.0);
      this.voiceoverAudio.volume = Math.max(0, Math.min(1.0, voVol)) * this.masterVolume;
      this.voiceoverAudio.play().catch((e) => console.warn('Audio play notice:', e));
    }

    const playIcon = document.getElementById('playIcon');
    if (playIcon) playIcon.textContent = '⏸';

    this.loop();
  }

  setVoiceoverVolume(vol) {
    if (this.voiceoverAudio) {
      this.voiceoverAudio.volume = Math.max(0, Math.min(1.0, vol)) * this.masterVolume;
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.voiceoverAudio) {
      this.voiceoverAudio.pause();
    }
    const playIcon = document.getElementById('playIcon');
    if (playIcon) playIcon.textContent = '▶';
  }

  togglePlayPause() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  seek(timeSeconds) {
    const totalDur = this.getTotalDuration();
    const clamped = Math.max(0, Math.min(timeSeconds, totalDur));
    timelineStore.setCurrentTime(clamped);

    if (this.voiceoverAudio && !isNaN(this.voiceoverAudio.duration)) {
      this.voiceoverAudio.currentTime = clamped;
    }

    this.renderFrame(clamped);
  }

  loop() {
    if (!this.isPlaying) return;
    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    let nextTime = timelineStore.currentTime + delta;
    const totalDur = this.getTotalDuration();

    if (nextTime >= totalDur) {
      if (this.isLooping) {
        nextTime = 0;
        this.seek(0);
      } else {
        nextTime = totalDur;
        this.pause();
        timelineStore.setCurrentTime(nextTime);
        this.renderFrame(nextTime);
        return;
      }
    }

    timelineStore.setCurrentTime(nextTime);
    this.renderFrame(nextTime);

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  getTotalDuration() {
    const p = projectStore.project;
    if (p.voiceoverDuration && p.voiceoverDuration > 0) {
      return p.voiceoverDuration;
    }
    const clips = p.timeline?.videoClips || [];
    if (clips.length > 0) {
      const lastClip = clips[clips.length - 1];
      return Math.max(lastClip.endTime || (lastClip.startTime + lastClip.duration), 5.0);
    }
    return 5.0;
  }

  async renderFrame(time) {
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Clear background
    this.ctx.fillStyle = '#08090C';
    this.ctx.fillRect(0, 0, width, height);

    const project = projectStore.project;
    const clips = project.timeline?.videoClips || [];

    // Empty state placeholder
    if (clips.length === 0) {
      this.renderEmptyStatePlaceholder(width, height);
      return;
    }

    // Find active clip at current time
    const activeClip = clips.find(c => time >= c.startTime && time < c.endTime);

    if (activeClip) {
      const ext = (activeClip.path || '').split('.').pop().toLowerCase();
      const isVideo = activeClip.mediaType?.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv'].includes(ext);

      if (isVideo) {
        let vid = this.videoCache?.get(activeClip.path);
        if (!vid) {
          vid = document.createElement('video');
          vid.src = this.resolveMediaUrl(activeClip.path);
          vid.muted = true;
          vid.preload = 'auto';
          if (!this.videoCache) this.videoCache = new Map();
          this.videoCache.set(activeClip.path, vid);
        }
        const clipProgress = Math.max(0, time - activeClip.startTime);
        if (Math.abs(vid.currentTime - clipProgress) > 0.3) {
          vid.currentTime = clipProgress;
        }
        if (this.isPlaying && vid.paused) {
          vid.play().catch(() => {});
        } else if (!this.isPlaying && !vid.paused) {
          vid.pause();
        }

        this.ctx.save();
        this.ctx.drawImage(vid, 0, 0, width, height);
        this.ctx.restore();
      } else {
        const img = await this.preloadImage(activeClip.path);
        if (img) {
          const progress = Math.min(Math.max((time - activeClip.startTime) / activeClip.duration, 0), 1);
          const motion = activeClip.motion || { preset: 'SLOW_PUSH', intensity: 0.15 };
          const intensity = motion.intensity || 0.15;

          let currentScale = 1.0;
          if (motion.preset === 'SLOW_PUSH' || motion.preset === 'ZOOM_IN') {
            currentScale = 1.0 + (intensity * progress);
          } else if (motion.preset === 'SLOW_PULL' || motion.preset === 'ZOOM_OUT') {
            currentScale = (1.0 + intensity) - (intensity * progress);
          } else if (motion.preset === 'CENTER_PUNCH') {
            currentScale = 1.0 + (intensity * 1.5 * Math.sin(progress * Math.PI));
          }

          // Pan interpolation
          const startPos = motion.startPos || [0.5, 0.5];
          const endPos = motion.endPos || [0.5, 0.5];
          const curX = startPos[0] + (endPos[0] - startPos[0]) * progress;
          const curY = startPos[1] + (endPos[1] - startPos[1]) * progress;

          this.ctx.save();

          // Image filter effects
          const fx = activeClip.effects || {};
          let filters = [];
          if (fx.brightness) filters.push(`brightness(${1 + fx.brightness})`);
          if (fx.contrast) filters.push(`contrast(${fx.contrast})`);
          if (fx.saturation) filters.push(`saturate(${fx.saturation})`);
          if (fx.blur) filters.push(`blur(${fx.blur * 2}px)`);

          this.ctx.filter = filters.join(' ') || 'none';

          const drawW = width * currentScale;
          const drawH = height * currentScale;
          const drawX = (width - drawW) * curX;
          const drawY = (height - drawH) * curY;

          this.ctx.drawImage(img, drawX, drawY, drawW, drawH);

          // Vignette effect overlay
          if (fx.vignette && fx.vignette > 0) {
            const grad = this.ctx.createRadialGradient(width/2, height/2, width * 0.25, width/2, height/2, width * 0.65);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, `rgba(0,0,0,${fx.vignette})`);
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, width, height);
          }

          this.ctx.restore();
        }
      }
    }

    // Render Smart Text Overlays (Graphic Callouts - Section 9)
    const overlays = project.timeline?.textOverlays || [];
    const activeOverlay = overlays.find(o => time >= o.startTime && time <= o.endTime);
    if (activeOverlay) {
      this.ctx.save();
      const fontSize = Math.round((activeOverlay.fontSize || 60) * (height / 1080));
      this.ctx.font = `bold ${fontSize}px Montserrat, Arial Black, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const posX = width / 2;
      const posY = height * ((activeOverlay.yOffsetPercent || 48) / 100);

      const metrics = this.ctx.measureText(activeOverlay.text);
      const padX = fontSize * 0.5;
      const padY = fontSize * 0.3;
      const boxW = metrics.width + padX * 2;
      const boxH = fontSize + padY * 2;

      // Draw rounded background badge
      this.ctx.fillStyle = activeOverlay.backgroundColor || 'rgba(0, 0, 0, 0.75)';
      this.ctx.beginPath();
      if (typeof this.ctx.roundRect === 'function') {
        this.ctx.roundRect(posX - boxW / 2, posY - boxH / 2, boxW, boxH, 10);
      } else {
        this.ctx.rect(posX - boxW / 2, posY - boxH / 2, boxW, boxH);
      }
      this.ctx.fill();

      // Border glow
      this.ctx.strokeStyle = activeOverlay.highlightColor || '#6366F1';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Text with drop shadow
      this.ctx.shadowColor = 'rgba(0,0,0,0.85)';
      this.ctx.shadowBlur = 10;
      this.ctx.fillStyle = activeOverlay.color || '#FFFFFF';
      this.ctx.fillText(activeOverlay.text, posX, posY);

      this.ctx.restore();
    }

    // Render Captions Overlay (CapCut Pro / TikTok Style Word Highlight)
    const enableCaptions = project.enableCaptions !== false;
    const captions = enableCaptions ? (project.timeline?.captions || []) : [];
    const activeCaption = captions.find(c => time >= c.startTime && time <= c.endTime);

    if (activeCaption && this.captionOverlay) {
      const styleKey = project.captionStyle || 'BOLD_YELLOW';
      const style = CAPTION_STYLES[styleKey] || CAPTION_STYLES.BOLD_YELLOW;

      const isKaraoke = style.animation === 'karaoke' || style.animation === 'word_pop';
      const wordsList = activeCaption.words && activeCaption.words.length > 0
        ? activeCaption.words
        : (activeCaption.text ? activeCaption.text.split(/\s+/).map((w, i) => ({ word: w, index: i })) : []);

      if (isKaraoke && wordsList.length > 0) {
        const totalDur = Math.max(0.1, activeCaption.endTime - activeCaption.startTime);
        const elapsed = Math.max(0, time - activeCaption.startTime);
        const progress = Math.min(Math.max(elapsed / totalDur, 0), 0.999);
        const activeIdx = Math.min(Math.floor(progress * wordsList.length), wordsList.length - 1);
        const highlightColor = style.highlightColor || '#FACC15';

        const wordsHtml = wordsList.map((wObj, idx) => {
          const isCur = idx === activeIdx;
          const isPast = idx < activeIdx;
          const wordStr = typeof wObj === 'string' ? wObj : (wObj.word || '');
          const cls = isCur ? 'caption-word active-word' : (isPast ? 'caption-word past-word' : 'caption-word');
          const inlineStyle = isCur ? `color: ${highlightColor};` : `color: ${style.primaryColor};`;
          return `<span class="${cls}" style="${inlineStyle}">${wordStr}</span>`;
        }).join(' ');

        this.captionOverlay.innerHTML = `<div class="caption-inner-badge" style="background: ${style.backgroundColor || 'rgba(0,0,0,0.5)'}">${wordsHtml}</div>`;
      } else {
        this.captionOverlay.innerHTML = `<div class="caption-inner-badge" style="background: ${style.backgroundColor || 'rgba(0,0,0,0.5)'}; color: ${style.primaryColor};">${activeCaption.text}</div>`;
      }

      this.captionOverlay.style.fontFamily = style.fontName;
      // Proportional responsive font size controlled by user slider or preset
      const baseFontSize = project.captionFontSize || style.fontSize || 24;
      const calculatedFontSize = Math.max(14, Math.round(baseFontSize * (height / 720)));
      this.captionOverlay.style.fontSize = `${calculatedFontSize}px`;

      // Screen position (Top, Center, Bottom or custom % percentage from top)
      const posPercent = (typeof project.captionPositionPercent === 'number')
        ? project.captionPositionPercent
        : (style.yOffsetPercent || 86);
      this.captionOverlay.style.bottom = `${100 - posPercent}%`;
      this.captionOverlay.style.transform = 'translateY(50%)';
      this.captionOverlay.classList.remove('hidden');
    } else if (this.captionOverlay) {
      this.captionOverlay.innerHTML = '';
      this.captionOverlay.classList.add('hidden');
    }

    // Update Timecode Readout
    const totalDur = this.getTotalDuration();
    const readout = document.getElementById('timecodeReadout');
    if (readout) {
      readout.textContent = `${this.formatTimecode(time)} / ${this.formatTimecode(totalDur)}`;
    }

    const badge = document.getElementById('playheadTimeBadge');
    if (badge) {
      badge.textContent = this.formatShortTime(time);
    }

    const creatorDisplay = document.getElementById('creatorTimeDisplay');
    if (creatorDisplay) {
      creatorDisplay.textContent = `${this.formatShortTime(time)} / ${this.formatShortTime(totalDur)}`;
    }

    const voDisplay = document.getElementById('voReviewTimeDisplay');
    if (voDisplay) {
      voDisplay.textContent = `${this.formatShortTime(time)} / ${this.formatShortTime(totalDur)}`;
    }

    const voFill = document.getElementById('voProgressFill');
    const voHandle = document.getElementById('voProgressHandle');
    if (voFill && totalDur > 0) {
      const pct = Math.min(100, Math.max(0, (time / totalDur) * 100));
      voFill.style.width = `${pct}%`;
      if (voHandle) voHandle.style.left = `${pct}%`;
    }

    if (typeof window.highlightActiveStoryboardCard === 'function') {
      window.highlightActiveStoryboardCard(time);
    }
  }

  formatTimecode(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 30);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(m)}:${pad(s)}:${pad(ms)}`;
  }

  formatShortTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const d = Math.floor((seconds % 1) * 10);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(m)}:${pad(s)}.${d}`;
  }

  renderEmptyStatePlaceholder(width, height) {
    this.ctx.save();
    // Subtle modern gradient background
    const bgGrad = this.ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0F131D');
    bgGrad.addColorStop(1, '#07090E');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, width, height);

    // Subtle 16:9 safe margin frame
    this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(width * 0.06, height * 0.06, width * 0.88, height * 0.88);

    const cx = width / 2;
    const cy = height / 2;

    // Glowing circle
    this.ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 35, 75, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Play/camera icon
    this.ctx.fillStyle = '#818CF8';
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 15, cy - 60);
    this.ctx.lineTo(cx + 30, cy - 35);
    this.ctx.lineTo(cx - 15, cy - 10);
    this.ctx.closePath();
    this.ctx.fill();

    // Title
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#F8FAFC';
    this.ctx.font = 'bold 34px Inter, -apple-system, system-ui, sans-serif';
    this.ctx.fillText('PROGRAM MONITOR', cx, cy + 85);

    // Subtitle
    this.ctx.fillStyle = '#64748B';
    this.ctx.font = '500 20px Inter, -apple-system, system-ui, sans-serif';
    this.ctx.fillText('Select images or audio from left panel to begin playback', cx, cy + 125);

    this.ctx.restore();

    // Clear overlay text
    if (this.captionOverlay) {
      this.captionOverlay.textContent = '';
      this.captionOverlay.classList.add('hidden');
    }
  }

  /**
   * Export video directly in browser using Canvas Stream & MediaRecorder
   * Enables 100% serverless video exports on Vercel or any static host!
   */
  async exportInBrowser(options = {}) {
    const totalDuration = this.getTotalDuration();
    const onProgress = options.onProgress || (() => {});

    return new Promise((resolve, reject) => {
      try {
        this.pause();
        this.seek(0);

        const fps = options.fps || 30;
        const canvasStream = this.canvas.captureStream(fps);

        const audioTracks = [];
        let audioCtx = null;
        let dest = null;

        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            dest = audioCtx.createMediaStreamDestination();

            if (this.voiceoverAudio && this.voiceoverAudio.src) {
              const voSrc = audioCtx.createMediaElementSource(this.voiceoverAudio);
              voSrc.connect(dest);
              voSrc.connect(audioCtx.destination);
            }
            if (this.musicAudio && this.musicAudio.src) {
              const bgmSrc = audioCtx.createMediaElementSource(this.musicAudio);
              bgmSrc.connect(dest);
              bgmSrc.connect(audioCtx.destination);
            }
            dest.stream.getAudioTracks().forEach(t => audioTracks.push(t));
          }
        } catch (audioErr) {
          console.warn('Audio capture note:', audioErr);
        }

        const combinedTracks = [...canvasStream.getVideoTracks(), ...audioTracks];
        const recordStream = new MediaStream(combinedTracks);

        const preferredTypes = [
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm'
        ];
        let mimeType = preferredTypes.find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || '';
        const recOptions = mimeType ? { mimeType, videoBitsPerSecond: 8000000 } : { videoBitsPerSecond: 8000000 };
        const recorder = new MediaRecorder(recordStream, recOptions);
        const recordedChunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          const finalMime = mimeType || 'video/webm';
          const ext = finalMime.includes('mp4') ? 'mp4' : 'webm';
          const blob = new Blob(recordedChunks, { type: finalMime });
          const downloadUrl = URL.createObjectURL(blob);
          if (audioCtx) {
            try { audioCtx.close(); } catch(e) {}
          }
          this.seek(0);
          resolve({ blob, downloadUrl, ext });
        };

        recorder.start(100);

        this.play();

        const checkTimer = setInterval(() => {
          const currentT = timelineStore.currentTime;
          const progressPercent = Math.min(99, Math.round((currentT / totalDuration) * 100));

          onProgress({
            progressPercent,
            stage: `Recording video frames (${currentT.toFixed(1)}s / ${totalDuration.toFixed(1)}s)...`,
            fps
          });

          if (currentT >= totalDuration - 0.1 || !this.isPlaying) {
            clearInterval(checkTimer);
            this.pause();
            onProgress({
              progressPercent: 100,
              stage: 'Finalizing and packaging video file...',
              fps
            });
            setTimeout(() => {
              if (recorder.state !== 'inactive') {
                recorder.stop();
              }
            }, 300);
          }
        }, 100);

      } catch (err) {
        reject(err);
      }
    });
  }
}
