/**
 * MAQ AUTO EDITOR ULTRA - Context-Sensitive Property Inspector
 */

class InspectorComponent {
  constructor(inspectorContentId, headerTitleId, typeBadgeId) {
    this.content = document.getElementById(inspectorContentId);
    this.headerTitle = document.getElementById(headerTitleId);
    this.typeBadge = document.getElementById(typeBadgeId);
  }

  render() {
    if (!this.headerTitle || !this.content) return;
    const selectedId = timelineStore.selectedClipId;
    const track = timelineStore.selectedTrack;

    if (!selectedId || !track) {
      this.headerTitle.textContent = 'Inspector';
      this.typeBadge.textContent = 'None';
      this.content.innerHTML = `
        <div class="inspector-empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <strong>No item selected</strong>
          <small>Click an image clip, transition, subtitle, or audio item on the timeline to view and adjust properties.</small>
        </div>
      `;
      return;
    }

    const project = projectStore.project;

    // 1. VIDEO / IMAGE CLIP
    if (track === 'video') {
      const clip = (project.timeline.videoClips || []).find(c => c.id === selectedId);
      if (!clip) return;

      this.headerTitle.textContent = 'Clip Properties';
      this.typeBadge.textContent = 'Image / Scene';

      this.content.innerHTML = `
        <div class="form-item">
          <label>Filename</label>
          <input type="text" class="input-full" value="${clip.filename}" readonly>
        </div>

        <div class="form-row-2col">
          <div class="form-item">
            <label>Start Time (s)</label>
            <input type="number" step="0.1" class="input-full" id="inspStartTime" value="${clip.startTime}">
          </div>
          <div class="form-item">
            <label>Duration (s)</label>
            <input type="number" step="0.1" min="0.3" class="input-full" id="inspDuration" value="${clip.duration}">
          </div>
        </div>

        <div class="form-item">
          <label>Camera Motion</label>
          <select class="input-full" id="inspMotionPreset">
            <option value="SLOW_PUSH" ${clip.motion?.preset === 'SLOW_PUSH' ? 'selected' : ''}>Slow Push In</option>
            <option value="SLOW_PULL" ${clip.motion?.preset === 'SLOW_PULL' ? 'selected' : ''}>Slow Pull Out</option>
            <option value="KEN_BURNS_TL_BR" ${clip.motion?.preset === 'KEN_BURNS_TL_BR' ? 'selected' : ''}>Ken Burns (TL ➔ BR)</option>
            <option value="KEN_BURNS_BR_TL" ${clip.motion?.preset === 'KEN_BURNS_BR_TL' ? 'selected' : ''}>Ken Burns (BR ➔ TL)</option>
            <option value="ZOOM_IN" ${clip.motion?.preset === 'ZOOM_IN' ? 'selected' : ''}>Standard Zoom In</option>
            <option value="ZOOM_OUT" ${clip.motion?.preset === 'ZOOM_OUT' ? 'selected' : ''}>Standard Zoom Out</option>
            <option value="PAN_LEFT" ${clip.motion?.preset === 'PAN_LEFT' ? 'selected' : ''}>Pan Left</option>
            <option value="PAN_RIGHT" ${clip.motion?.preset === 'PAN_RIGHT' ? 'selected' : ''}>Pan Right</option>
            <option value="NONE" ${clip.motion?.preset === 'NONE' ? 'selected' : ''}>Static (No Motion)</option>
          </select>
        </div>

        <div class="form-item">
          <label>Transition</label>
          <select class="input-full" id="inspTransitionType">
            <option value="CUT" ${clip.transition?.type === 'CUT' ? 'selected' : ''}>Hard Cut</option>
            <option value="FADE" ${clip.transition?.type === 'FADE' ? 'selected' : ''}>Cross Dissolve</option>
            <option value="DISSOLVE" ${clip.transition?.type === 'DISSOLVE' ? 'selected' : ''}>Smooth Dissolve</option>
            <option value="DIP_BLACK" ${clip.transition?.type === 'DIP_BLACK' ? 'selected' : ''}>Dip to Black</option>
            <option value="SLIDE_LEFT" ${clip.transition?.type === 'SLIDE_LEFT' ? 'selected' : ''}>Slide Left</option>
            <option value="SMOOTH_ZOOM" ${clip.transition?.type === 'SMOOTH_ZOOM' ? 'selected' : ''}>Zoom In</option>
          </select>
        </div>

        <div class="form-item">
          <label>Color & Filter Adjustment</label>
          <div class="slider-control-group mt-1">
            <div class="slider-header"><span>Contrast</span><strong id="inspValContrast">${clip.effects?.contrast || 1.0}</strong></div>
            <input type="range" class="range-slider" id="inspContrast" min="0.5" max="2.0" step="0.05" value="${clip.effects?.contrast || 1.0}">
          </div>
          <div class="slider-control-group mt-1">
            <div class="slider-header"><span>Vignette</span><strong id="inspValVignette">${clip.effects?.vignette || 0.0}</strong></div>
            <input type="range" class="range-slider" id="inspVignette" min="0.0" max="1.0" step="0.05" value="${clip.effects?.vignette || 0.0}">
          </div>
        </div>

        <button class="btn btn-primary btn-block mt-2" id="btnApplyInspectorClip">Save Clip Properties</button>
      `;

      document.getElementById('btnApplyInspectorClip')?.addEventListener('click', () => {
        const newStart = parseFloat(document.getElementById('inspStartTime').value) || clip.startTime;
        const newDur = parseFloat(document.getElementById('inspDuration').value) || clip.duration;
        const motionPreset = document.getElementById('inspMotionPreset').value;
        const transType = document.getElementById('inspTransitionType').value;
        const contrastVal = parseFloat(document.getElementById('inspContrast').value) || 1.0;
        const vigVal = parseFloat(document.getElementById('inspVignette').value) || 0.0;

        projectStore.updateClip(clip.id, {
          startTime: newStart,
          duration: newDur,
          endTime: +(newStart + newDur).toFixed(3),
          motion: { ...clip.motion, preset: motionPreset },
          transition: { ...clip.transition, type: transType },
          effects: { ...clip.effects, contrast: contrastVal, vignette: vigVal }
        });

        window.toastSystem?.show('Clip properties updated.', 'success');
      });
    }

    // 2. CAPTION ITEM
    else if (track === 'captions') {
      const cap = (project.timeline.captions || []).find(c => c.id === selectedId);
      if (!cap) return;

      this.headerTitle.textContent = 'Subtitle Properties';
      this.typeBadge.textContent = 'Caption';

      this.content.innerHTML = `
        <div class="form-item">
          <label>Subtitle Text</label>
          <textarea class="input-full" id="inspCaptionText" rows="3">${cap.text}</textarea>
        </div>

        <div class="form-row-2col">
          <div class="form-item">
            <label>Start (s)</label>
            <input type="number" step="0.1" class="input-full" id="inspCapStart" value="${cap.startTime}">
          </div>
          <div class="form-item">
            <label>Duration (s)</label>
            <input type="number" step="0.1" class="input-full" id="inspCapDuration" value="${cap.duration}">
          </div>
        </div>

        <button class="btn btn-primary btn-block mt-2" id="btnApplyInspectorCap">Update Subtitle</button>
      `;

      document.getElementById('btnApplyInspectorCap')?.addEventListener('click', () => {
        const newText = document.getElementById('inspCaptionText').value;
        const newStart = parseFloat(document.getElementById('inspCapStart').value) || cap.startTime;
        const newDur = parseFloat(document.getElementById('inspCapDuration').value) || cap.duration;

        cap.text = newText;
        cap.startTime = newStart;
        cap.duration = newDur;
        cap.endTime = +(newStart + newDur).toFixed(3);
        projectStore.notify();

        window.toastSystem?.show('Subtitle updated.', 'success');
      });
    }

    // 3. SMART TEXT OVERLAY ITEM
    else if (track === 'overlay') {
      const ov = (project.timeline?.textOverlays || []).find(o => o.id === selectedId);
      if (!ov) return;

      this.headerTitle.textContent = 'Text Overlay Properties';
      this.typeBadge.textContent = 'Callout Overlay';

      this.content.innerHTML = `
        <div class="form-item">
          <label>Callout Text</label>
          <input type="text" class="input-full" id="inspOverlayText" value="${ov.text}">
        </div>

        <div class="form-item">
          <label>Overlay Style</label>
          <select class="input-full" id="inspOverlayStyle">
            <option value="KINETIC_TITLE" ${ov.styleKey === 'KINETIC_TITLE' ? 'selected' : ''}>Kinetic Title</option>
            <option value="NUMBER_STAT" ${ov.styleKey === 'NUMBER_STAT' ? 'selected' : ''}>Bold Statistic / Number</option>
            <option value="DRAMATIC_STATEMENT" ${ov.styleKey === 'DRAMATIC_STATEMENT' ? 'selected' : ''}>Dramatic Statement</option>
            <option value="LOWER_THIRD_NAME" ${ov.styleKey === 'LOWER_THIRD_NAME' ? 'selected' : ''}>Lower Third Name / Place</option>
            <option value="MINIMAL_ACCENT" ${ov.styleKey === 'MINIMAL_ACCENT' ? 'selected' : ''}>Minimal Accent</option>
          </select>
        </div>

        <div class="form-row-2col">
          <div class="form-item">
            <label>Start (s)</label>
            <input type="number" step="0.1" class="input-full" id="inspOverlayStart" value="${ov.startTime}">
          </div>
          <div class="form-item">
            <label>Duration (s)</label>
            <input type="number" step="0.1" min="0.5" class="input-full" id="inspOverlayDuration" value="${ov.duration || 3.0}">
          </div>
        </div>

        <button class="btn btn-primary btn-block mt-2" id="btnApplyInspectorOverlay">Update Overlay</button>
      `;

      document.getElementById('btnApplyInspectorOverlay')?.addEventListener('click', () => {
        ov.text = document.getElementById('inspOverlayText').value;
        ov.styleKey = document.getElementById('inspOverlayStyle').value;
        const newStart = parseFloat(document.getElementById('inspOverlayStart').value) || ov.startTime;
        const newDur = parseFloat(document.getElementById('inspOverlayDuration').value) || (ov.duration || 3.0);
        ov.startTime = newStart;
        ov.duration = newDur;
        ov.endTime = +(newStart + newDur).toFixed(3);
        projectStore.notify();
        window.toastSystem?.show('Text overlay updated.', 'success');
      });
    }

    // 4. SFX / AUDIO ITEM
    else if (track === 'sfx' || track === 'music') {
      const isSFX = track === 'sfx';
      const items = isSFX ? (project.timeline.sfxClips || []) : (project.timeline.musicClips || []);
      const audioItem = items.find(i => i.id === selectedId);
      if (!audioItem) return;

      this.headerTitle.textContent = isSFX ? 'Sound FX Properties' : 'Music Properties';
      this.typeBadge.textContent = isSFX ? 'SFX Audio' : 'Music Audio';

      this.content.innerHTML = `
        <div class="form-item">
          <label>Track Name</label>
          <input type="text" class="input-full" value="${audioItem.name}" readonly>
        </div>

        <div class="form-row-2col">
          <div class="form-item">
            <label>Start (s)</label>
            <input type="number" step="0.1" class="input-full" id="inspAudioStart" value="${audioItem.startTime}">
          </div>
          <div class="form-item">
            <label>Volume</label>
            <input type="range" class="range-slider" id="inspAudioVolume" min="0" max="1" step="0.05" value="${audioItem.volume || 0.8}">
          </div>
        </div>

        <button class="btn btn-primary btn-block mt-2" id="btnApplyInspectorAudio">Update Audio Clip</button>
      `;

      document.getElementById('btnApplyInspectorAudio')?.addEventListener('click', () => {
        audioItem.startTime = parseFloat(document.getElementById('inspAudioStart').value) || audioItem.startTime;
        audioItem.volume = parseFloat(document.getElementById('inspAudioVolume').value) || 0.8;
        projectStore.notify();

        window.toastSystem?.show('Audio clip updated.', 'success');
      });
    }
  }
}
