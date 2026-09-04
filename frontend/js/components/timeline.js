/**
 * MAQ AUTO EDITOR ULTRA - Multi-Track Interactive Timeline Component
 */

class TimelineComponent {
  constructor(scrollStageId, rulerId, playheadId, lanesContainerId) {
    this.scrollStage = document.getElementById(scrollStageId);
    this.ruler = document.getElementById(rulerId);
    this.playhead = document.getElementById(playheadId);
    this.lanesContainer = document.getElementById(lanesContainerId);

    this.laneVideo = document.getElementById('laneVideo');
    this.laneOverlay = document.getElementById('laneOverlay');
    this.laneCaptions = document.getElementById('laneCaptions');
    this.laneVoiceover = document.getElementById('laneVoiceover');
    this.laneSFX = document.getElementById('laneSFX');
    this.laneMusic = document.getElementById('laneMusic');

    this.isDraggingPlayhead = false;
    if (this.ruler && this.lanesContainer && this.scrollStage) {
      this.initEvents();
    }
  }

  initEvents() {
    if (!this.ruler || !this.lanesContainer) return;
    // Scrubber drag on ruler or timeline background
    this.ruler.addEventListener('mousedown', (e) => this.handleScrubStart(e));
    this.lanesContainer.addEventListener('mousedown', (e) => {
      if (e.target.closest('.timeline-clip-box') || e.target.classList.contains('clip-trim-handle')) return;
      this.handleScrubStart(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingPlayhead) {
        this.updatePlayheadFromMouseEvent(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingPlayhead = false;
    });

    // Zoom slider
    const zoomSlider = document.getElementById('sliderTimelineZoom');
    if (zoomSlider) {
      zoomSlider.addEventListener('input', (e) => {
        timelineStore.setZoomLevel(parseInt(e.target.value, 10));
        this.render();
      });
    }

    document.getElementById('btnZoomIn')?.addEventListener('click', () => {
      timelineStore.setZoomLevel(timelineStore.zoomLevel + 20);
      if (zoomSlider) zoomSlider.value = timelineStore.zoomLevel;
      this.render();
    });

    document.getElementById('btnZoomOut')?.addEventListener('click', () => {
      timelineStore.setZoomLevel(timelineStore.zoomLevel - 20);
      if (zoomSlider) zoomSlider.value = timelineStore.zoomLevel;
      this.render();
    });

    document.getElementById('btnFitTimelineZoom')?.addEventListener('click', () => this.fitTimelineToScreen());

    // Ctrl + Mouse Wheel Zoom on Timeline
    this.scrollStage.addEventListener('wheel', (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 15 : -15;
        timelineStore.setZoomLevel(timelineStore.zoomLevel + delta);
        if (zoomSlider) zoomSlider.value = timelineStore.zoomLevel;
        this.render();
      }
    }, { passive: false });

    // Timeline Toolbar Actions
    document.getElementById('btnTbUndo')?.addEventListener('click', () => projectStore.undo());
    document.getElementById('btnTbRedo')?.addEventListener('click', () => projectStore.redo());
    document.getElementById('btnTbSplit')?.addEventListener('click', () => this.splitAtPlayhead());
    document.getElementById('btnTbDelete')?.addEventListener('click', () => this.deleteSelectedClip());
    document.getElementById('btnTbDuplicate')?.addEventListener('click', () => this.duplicateSelectedClip());

    // In/Out Point Toolbar Buttons (CapCut Pro workflow)
    document.getElementById('btnTbMarkIn')?.addEventListener('click', () => {
      timelineStore.setInPoint(timelineStore.currentTime);
      window.toastSystem?.show(`Marked In Point: ${TimestampParser.formatSeconds(timelineStore.currentTime)}`, 'info', 1500);
      this.render();
    });

    document.getElementById('btnTbMarkOut')?.addEventListener('click', () => {
      timelineStore.setOutPoint(timelineStore.currentTime);
      window.toastSystem?.show(`Marked Out Point: ${TimestampParser.formatSeconds(timelineStore.currentTime)}`, 'info', 1500);
      this.render();
    });

    document.getElementById('btnTbClearInOut')?.addEventListener('click', () => {
      timelineStore.clearInOutPoints();
      window.toastSystem?.show('Cleared In/Out range', 'info', 1500);
      this.render();
    });

    // Context Menu Global Listener
    window.addEventListener('click', () => {
      document.getElementById('timelineContextMenu')?.classList.add('hidden');
    });
  }

  handleScrubStart(e) {
    this.isDraggingPlayhead = true;
    this.updatePlayheadFromMouseEvent(e);
  }

  updatePlayheadFromMouseEvent(e) {
    const rect = this.scrollStage.getBoundingClientRect();
    const clickX = e.clientX - rect.left + this.scrollStage.scrollLeft;
    let time = Math.max(0, clickX / timelineStore.zoomLevel);

    // Snap to nearest clip edge if snapping enabled
    if (timelineStore.isSnappingEnabled) {
      time = this.getSnappedTime(time);
    }

    window.previewPlayer.seek(time);
  }

  getSnappedTime(time) {
    const zoom = timelineStore.zoomLevel;
    const snapThresholdSec = 8 / zoom; // 8px threshold
    const clips = projectStore.project.timeline?.videoClips || [];

    for (const c of clips) {
      if (Math.abs(time - c.startTime) <= snapThresholdSec) return c.startTime;
      if (Math.abs(time - c.endTime) <= snapThresholdSec) return c.endTime;
    }
    return time;
  }

  fitTimelineToScreen() {
    const totalDur = window.previewPlayer ? window.previewPlayer.getTotalDuration() : 30.0;
    const availWidth = this.scrollStage.clientWidth - 40;
    const optimalZoom = Math.max(15, Math.min(Math.floor(availWidth / totalDur), 300));
    timelineStore.setZoomLevel(optimalZoom);
    const zoomSlider = document.getElementById('sliderTimelineZoom');
    if (zoomSlider) zoomSlider.value = optimalZoom;
    this.render();
  }

  splitAtPlayhead() {
    const curTime = timelineStore.currentTime;
    const clips = projectStore.project.timeline.videoClips || [];
    const targetIdx = clips.findIndex(c => curTime > c.startTime && curTime < c.endTime);
    if (targetIdx === -1) return;

    const orig = clips[targetIdx];
    const firstDuration = +(curTime - orig.startTime).toFixed(3);
    const secondDuration = +(orig.endTime - curTime).toFixed(3);

    const firstClip = { ...orig, duration: firstDuration, endTime: curTime };
    const secondClip = {
      ...orig,
      id: `clip_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      startTime: curTime,
      duration: secondDuration,
      endTime: orig.endTime
    };

    const newClips = [...clips.slice(0, targetIdx), firstClip, secondClip, ...clips.slice(targetIdx + 1)];
    projectStore.updateVideoClips(newClips);
  }

  deleteSelectedClip() {
    if (!timelineStore.selectedClipId) return;

    if (timelineStore.selectedTrack === 'video') {
      const clips = projectStore.project.timeline.videoClips || [];
      projectStore.updateVideoClips(clips.filter(c => c.id !== timelineStore.selectedClipId));
    } else if (timelineStore.selectedTrack === 'captions') {
      const captions = projectStore.project.timeline.captions || [];
      projectStore.setCaptions(captions.filter(c => c.id !== timelineStore.selectedClipId));
    } else if (timelineStore.selectedTrack === 'sfx') {
      projectStore.project.timeline.sfxClips = (projectStore.project.timeline.sfxClips || []).filter(c => c.id !== timelineStore.selectedClipId);
      projectStore.notify();
    } else if (timelineStore.selectedTrack === 'music') {
      projectStore.project.timeline.musicClips = (projectStore.project.timeline.musicClips || []).filter(c => c.id !== timelineStore.selectedClipId);
      projectStore.notify();
    } else if (timelineStore.selectedTrack === 'overlay') {
      projectStore.project.timeline.textOverlays = (projectStore.project.timeline.textOverlays || []).filter(c => c.id !== timelineStore.selectedClipId);
      projectStore.notify();
    }

    timelineStore.clearSelection();
  }

  duplicateSelectedClip() {
    if (!timelineStore.selectedClipId) return;
    const clips = projectStore.project.timeline.videoClips || [];
    const target = clips.find(c => c.id === timelineStore.selectedClipId);
    if (!target) return;

    const dup = {
      ...target,
      id: `clip_${Date.now()}_dup`,
      startTime: target.endTime,
      endTime: +(target.endTime + target.duration).toFixed(3)
    };

    projectStore.updateVideoClips([...clips, dup]);
  }

  render() {
    if (!this.ruler || !this.lanesContainer) return;
    const zoom = timelineStore.zoomLevel;
    const project = projectStore.project;
    const totalDuration = window.previewPlayer ? window.previewPlayer.getTotalDuration() : 30.0;
    const totalWidthPx = Math.max(totalDuration * zoom + 400, 2500);

    // Resize ruler & lanes container
    this.ruler.style.width = `${totalWidthPx}px`;
    this.lanesContainer.style.width = `${totalWidthPx}px`;

    // Render Ruler Tick Marks
    this.ruler.innerHTML = '';
    const stepSec = zoom > 140 ? 1 : (zoom > 60 ? 5 : 10);
    for (let t = 0; t <= totalDuration + 15; t += stepSec) {
      const mark = document.createElement('div');
      mark.className = 'ruler-tick-mark';
      mark.style.left = `${t * zoom}px`;
      mark.textContent = TimestampParser.formatSeconds(t);
      this.ruler.appendChild(mark);
    }

    // Update Playhead
    const playheadX = timelineStore.currentTime * zoom;
    this.playhead.style.left = `${playheadX}px`;

    // Render Tracks
    this.renderVideoLane(project.timeline?.videoClips || [], zoom);
    this.renderOverlayLane(project.timeline?.textOverlays || [], zoom);
    this.renderCaptionsLane(project.timeline?.captions || [], zoom);
    this.renderVoiceoverLane(project.voiceover, project.voiceoverDuration, zoom);
    this.renderSFXLane(project.timeline?.sfxClips || [], zoom);
    this.renderMusicLane(project.timeline?.musicClips || [], zoom);

    // Render CapCut In / Out Region & Boundary Flags
    this.renderInOutRegion(zoom, totalDuration);
  }

  renderInOutRegion(zoom, totalDuration) {
    const oldRegion = this.lanesContainer.querySelector('.timeline-inout-region');
    if (oldRegion) oldRegion.remove();
    const oldMarkerIn = this.ruler.querySelector('.timeline-inout-marker-in');
    if (oldMarkerIn) oldMarkerIn.remove();
    const oldMarkerOut = this.ruler.querySelector('.timeline-inout-marker-out');
    if (oldMarkerOut) oldMarkerOut.remove();

    const inPt = timelineStore.inPoint;
    const outPt = timelineStore.outPoint;
    const badge = document.getElementById('badgeInOutRange');
    const clearBtn = document.getElementById('btnTbClearInOut');

    if (inPt === null && outPt === null) {
      if (badge) badge.classList.add('hidden');
      if (clearBtn) clearBtn.classList.add('hidden');
      return;
    }

    const effectiveStart = inPt !== null ? inPt : 0.0;
    const effectiveEnd = outPt !== null ? outPt : totalDuration;
    const leftPx = effectiveStart * zoom;
    const widthPx = Math.max((effectiveEnd - effectiveStart) * zoom, 4);

    // Shaded In/Out selection across tracks
    const region = document.createElement('div');
    region.className = 'timeline-inout-region';
    region.style.left = `${leftPx}px`;
    region.style.width = `${widthPx}px`;
    this.lanesContainer.appendChild(region);

    // In Marker
    if (inPt !== null) {
      const markerIn = document.createElement('div');
      markerIn.className = 'timeline-inout-marker-in';
      markerIn.style.left = `${inPt * zoom}px`;
      markerIn.textContent = `[IN ${TimestampParser.formatSeconds(inPt)}`;
      this.ruler.appendChild(markerIn);
    }

    // Out Marker
    if (outPt !== null) {
      const markerOut = document.createElement('div');
      markerOut.className = 'timeline-inout-marker-out';
      markerOut.style.left = `${outPt * zoom - 45}px`;
      markerOut.textContent = `OUT] ${TimestampParser.formatSeconds(outPt)}`;
      this.ruler.appendChild(markerOut);
    }

    // Update Toolbar Indicator
    if (badge) {
      badge.classList.remove('hidden');
      const startStr = TimestampParser.formatSeconds(effectiveStart);
      const endStr = TimestampParser.formatSeconds(effectiveEnd);
      const diffStr = (effectiveEnd - effectiveStart).toFixed(1);
      badge.innerHTML = `<span>Range: <strong>${startStr} - ${endStr}</strong> (${diffStr}s)</span>`;
    }
    if (clearBtn) clearBtn.classList.remove('hidden');
  }

  renderOverlayLane(overlays, zoom) {
    if (!this.laneOverlay) return;
    this.laneOverlay.innerHTML = '';
    overlays.forEach(ov => {
      const left = ov.startTime * zoom;
      const width = Math.max((ov.duration || 3.0) * zoom, 24);

      const el = document.createElement('div');
      el.className = `timeline-clip-box overlay-clip ${ov.id === timelineStore.selectedClipId ? 'selected' : ''}`;
      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      el.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.5), rgba(236, 72, 153, 0.5))';
      el.style.borderColor = '#818CF8';

      el.innerHTML = `
        <span style="font-size:10px;font-weight:700;color:#FDE047;margin-right:4px;">✦</span>
        <span class="clip-title-text" style="color:#FFF;">${ov.text}</span>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        timelineStore.selectClip(ov.id, 'overlay');
      });

      this.laneOverlay.appendChild(el);
    });
  }

  renderVideoLane(clips, zoom) {
    this.laneVideo.innerHTML = '';
    clips.forEach(clip => {
      const left = clip.startTime * zoom;
      const width = Math.max(clip.duration * zoom, 16);

      const ext = (clip.path || '').split('.').pop().toLowerCase();
      const isVideo = clip.mediaType?.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv'].includes(ext);

      const el = document.createElement('div');
      el.className = `timeline-clip-box ${clip.id === timelineStore.selectedClipId ? 'selected' : ''}`;
      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      if (isVideo) {
        el.style.borderColor = '#38BDF8';
      }

      const motionIcon = isVideo ? '🎥' : (clip.motion?.preset ? (MOTION_PRESETS[clip.motion.preset]?.icon || '✦') : '✦');

      el.innerHTML = `
        <div class="clip-trim-handle clip-trim-left"></div>
        <span class="clip-badge-motion">${motionIcon}</span>
        <span class="clip-title-text">${clip.filename} (${clip.duration}s)</span>
        <div class="clip-trim-handle clip-trim-right"></div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        timelineStore.selectClip(clip.id, 'video');
      });

      // Right-click context menu
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        timelineStore.selectClip(clip.id, 'video');
        this.openContextMenu(e.clientX, e.clientY, clip);
      });

      // Trim Handle Resizing
      const rightHandle = el.querySelector('.clip-trim-right');
      rightHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const startX = e.clientX;
        const origDuration = clip.duration;

        const onMouseMove = (moveEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const newDur = Math.max(origDuration + deltaX / zoom, 0.4);
          el.style.width = `${newDur * zoom}px`;
          el.querySelector('.clip-title-text').textContent = `${clip.filename} (${newDur.toFixed(1)}s)`;
        };

        const onMouseUp = (upEvent) => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          const deltaX = upEvent.clientX - startX;
          const finalDur = +(Math.max(origDuration + deltaX / zoom, 0.4)).toFixed(3);
          const adjusted = TimelineBuilderService.adjustClipDuration(
            projectStore.project.timeline.videoClips,
            clip.id,
            finalDur,
            timelineStore.isRippleEnabled
          );
          projectStore.updateVideoClips(adjusted);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      this.laneVideo.appendChild(el);
    });
  }

  renderCaptionsLane(captions, zoom) {
    this.laneCaptions.innerHTML = '';
    captions.forEach(cap => {
      const left = cap.startTime * zoom;
      const width = Math.max(cap.duration * zoom, 14);

      const el = document.createElement('div');
      el.className = `timeline-clip-box ${cap.id === timelineStore.selectedClipId ? 'selected' : ''}`;
      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      el.innerHTML = `<span>T ${cap.text}</span>`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        timelineStore.selectClip(cap.id, 'captions');
      });

      this.laneCaptions.appendChild(el);
    });
  }

  renderVoiceoverLane(vo, duration, zoom) {
    this.laneVoiceover.innerHTML = '';
    if (!vo || duration <= 0) return;

    const width = duration * zoom;
    const el = document.createElement('div');
    el.className = 'timeline-clip-box';
    el.style.left = '0px';
    el.style.width = `${width}px`;
    el.innerHTML = `<span>🎙 ${vo.filename || 'Voiceover'} (${duration}s)</span>`;
    this.laneVoiceover.appendChild(el);
  }

  renderSFXLane(sfxList, zoom) {
    this.laneSFX.innerHTML = '';
    sfxList.forEach(sfx => {
      const left = sfx.startTime * zoom;
      const width = Math.max((sfx.duration || 2.0) * zoom, 18);

      const el = document.createElement('div');
      el.className = `timeline-clip-box ${sfx.id === timelineStore.selectedClipId ? 'selected' : ''}`;
      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      el.innerHTML = `<span>🔊 ${sfx.name || 'SFX'}</span>`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        timelineStore.selectClip(sfx.id, 'sfx');
      });

      this.laneSFX.appendChild(el);
    });
  }

  renderMusicLane(musicList, zoom) {
    this.laneMusic.innerHTML = '';
    musicList.forEach(m => {
      const left = m.startTime * zoom;
      const width = Math.max(m.duration * zoom, 24);

      const el = document.createElement('div');
      el.className = `timeline-clip-box ${m.id === timelineStore.selectedClipId ? 'selected' : ''}`;
      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      el.innerHTML = `<span>🎵 ${m.name || 'Music'}</span>`;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        timelineStore.selectClip(m.id, 'music');
      });

      this.laneMusic.appendChild(el);
    });
  }

  openContextMenu(x, y, clip) {
    const menu = document.getElementById('timelineContextMenu');
    if (!menu) return;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.remove('hidden');

    menu.querySelectorAll('.menu-item').forEach(item => {
      item.onclick = () => {
        const action = item.dataset.action;
        if (action === 'split') this.splitAtPlayhead();
        if (action === 'duplicate') this.duplicateSelectedClip();
        if (action === 'delete') this.deleteSelectedClip();
        menu.classList.add('hidden');
      };
    });
  }
}
