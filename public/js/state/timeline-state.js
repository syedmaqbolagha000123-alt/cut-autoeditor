/**
 * MAQ AUTO EDITOR ULTRA - Timeline UI State
 */

class TimelineState {
  constructor() {
    this.currentTime = 0.0;
    this.zoomLevel = 80; // pixels per second
    this.selectedClipId = null;
    this.selectedTrack = null;
    this.isSnappingEnabled = true;
    this.isRippleEnabled = true;
    this.isScrubbing = false;
    this.inPoint = null;
    this.outPoint = null;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  setCurrentTime(time) {
    this.currentTime = Math.max(0, +time.toFixed(3));
    this.notify();
  }

  setZoomLevel(zoom) {
    this.zoomLevel = Math.max(10, Math.min(zoom, 400));
    this.notify();
  }

  selectClip(clipId, track = 'video') {
    this.selectedClipId = clipId;
    this.selectedTrack = track;
    this.notify();
  }

  clearSelection() {
    this.selectedClipId = null;
    this.selectedTrack = null;
    this.notify();
  }

  setInPoint(time) {
    this.inPoint = (time !== null && time !== undefined) ? Math.max(0, +time.toFixed(3)) : null;
    if (this.outPoint !== null && this.inPoint !== null && this.inPoint >= this.outPoint) {
      this.outPoint = null;
    }
    this.notify();
  }

  setOutPoint(time) {
    this.outPoint = (time !== null && time !== undefined) ? Math.max(0, +time.toFixed(3)) : null;
    if (this.inPoint !== null && this.outPoint !== null && this.outPoint <= this.inPoint) {
      this.inPoint = null;
    }
    this.notify();
  }

  clearInOutPoints() {
    this.inPoint = null;
    this.outPoint = null;
    this.notify();
  }
}

const timelineStore = new TimelineState();
