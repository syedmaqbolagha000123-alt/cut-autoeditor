/**
 * MAQ AUTO EDITOR ULTRA - Client Utilities & Timeline Pacing Engine
 * Zero-dependency parser and timeline construction for browser and server.
 */

class TimestampParser {
  static formatSeconds(totalSeconds, includeHours = false) {
    if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
      return '00:00';
    }
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    const pad = (n) => String(n).padStart(2, '0');
    if (includeHours || hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  static parse(input) {
    if (input === null || input === undefined) {
      return { valid: false, seconds: 0, display: '00:00', error: 'Input is null or undefined', raw: '' };
    }
    if (typeof input === 'number') {
      if (isNaN(input) || input < 0) return { valid: false, seconds: 0, display: '00:00', error: 'Invalid number', raw: String(input) };
      return { valid: true, seconds: input, display: this.formatSeconds(input), raw: String(input) };
    }

    const rawStr = String(input).trim();
    if (!rawStr) return { valid: false, seconds: 0, display: '00:00', error: 'Empty string', raw: rawStr };

    // Pattern 1: HH:MM:SS or H:MM:SS
    const colon3 = rawStr.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
    if (colon3) {
      const h = parseInt(colon3[1], 10);
      const m = parseInt(colon3[2], 10);
      const s = parseFloat(colon3[3]);
      const total = h * 3600 + m * 60 + s;
      return { valid: true, seconds: +total.toFixed(3), display: this.formatSeconds(total, true), raw: rawStr };
    }

    // Pattern 2: MM:SS or M:SS
    const colon2 = rawStr.match(/^(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
    if (colon2) {
      const m = parseInt(colon2[1], 10);
      const s = parseFloat(colon2[2]);
      const total = m * 60 + s;
      return { valid: true, seconds: +total.toFixed(3), display: this.formatSeconds(total), raw: rawStr };
    }

    // Pattern 3: H-MM-SS or HH-MM-SS
    const dash3 = rawStr.match(/^(\d{1,2})-(\d{1,2})-(\d{1,2})$/);
    if (dash3) {
      const h = parseInt(dash3[1], 10);
      const m = parseInt(dash3[2], 10);
      const s = parseInt(dash3[3], 10);
      const total = h * 3600 + m * 60 + s;
      return { valid: true, seconds: total, display: this.formatSeconds(total, true), raw: rawStr };
    }

    // Pattern 4: M-SS or MM-SS (e.g. 0-03, 1-15)
    const dash2 = rawStr.match(/^(\d{1,2})-(\d{1,2})$/);
    if (dash2) {
      const m = parseInt(dash2[1], 10);
      const s = parseInt(dash2[2], 10);
      const total = m * 60 + s;
      return { valid: true, seconds: total, display: this.formatSeconds(total), raw: rawStr };
    }

    // Pattern 5: Raw integer or float seconds
    const pureSec = rawStr.match(/^(\d+(?:\.\d+)?)$/);
    if (pureSec) {
      const sec = parseFloat(pureSec[1]);
      return { valid: true, seconds: +sec.toFixed(3), display: this.formatSeconds(sec), raw: rawStr };
    }

    return { valid: false, seconds: 0, display: '00:00', error: `Unrecognized format: ${rawStr}`, raw: rawStr };
  }
}

class FilenameParser {
  static parse(fullFilenameOrPath) {
    const filename = String(fullFilenameOrPath).split(/[\\/]/).pop();
    const dotIdx = filename.lastIndexOf('.');
    const ext = dotIdx !== -1 ? filename.substring(dotIdx).toLowerCase() : '';
    const nameWithoutExt = dotIdx !== -1 ? filename.substring(0, dotIdx) : filename;

    const result = {
      hasTimestamp: false,
      timestampSeconds: 0,
      displayTimestamp: '00:00',
      outputIndex: 1,
      originalFilename: filename,
      extension: ext,
      baseName: nameWithoutExt,
      isSequential: false,
      rawTimestamp: null
    };

    // Case 1: timestamp with output index e.g. "0-03-2" or "1-02-03_2"
    const tsWithIndex = nameWithoutExt.match(/(?:^|[_#\s])(\d{1,2}-\d{1,2}(?:-\d{1,2})?)[-_](\d+)$/);
    if (tsWithIndex) {
      const rawTs = tsWithIndex[1];
      const outIdx = parseInt(tsWithIndex[2], 10);
      const parsed = TimestampParser.parse(rawTs);
      if (parsed.valid) {
        result.hasTimestamp = true;
        result.timestampSeconds = parsed.seconds;
        result.displayTimestamp = parsed.display;
        result.outputIndex = outIdx;
        result.rawTimestamp = rawTs;
        return result;
      }
    }

    // Case 2: standard timestamp without index e.g. "0-03" or "00-15" or "1-02-03"
    const tsStandard = nameWithoutExt.match(/(?:^|[_#\s])(\d{1,2}-\d{1,2}(?:-\d{1,2})?)(?:$|[_#\s])/);
    if (tsStandard) {
      const rawTs = tsStandard[1];
      const parsed = TimestampParser.parse(rawTs);
      if (parsed.valid) {
        result.hasTimestamp = true;
        result.timestampSeconds = parsed.seconds;
        result.displayTimestamp = parsed.display;
        result.rawTimestamp = rawTs;
        return result;
      }
    }

    // Case 3: sequential index e.g. "image_001", "frame-05"
    const seqMatch = nameWithoutExt.match(/(?:^|[_#\s-])(?:image|img|frame|scene|slide)?[-_#\s]*0*(\d{1,4})$/i);
    if (seqMatch) {
      result.isSequential = true;
      result.sequentialIndex = parseInt(seqMatch[1], 10);
      return result;
    }

    return result;
  }
}

class TimelineBuilderService {
  static buildVideoClips(imageAssets, totalVoiceoverDuration = 0, options = {}) {
    const {
      defaultImageDuration = 5.0,
      fillInitialGap = true,
      defaultMotion = 'SLOW_PUSH',
      defaultTransition = 'DISSOLVE',
      defaultTransitionDuration = 0.5,
      motionIntensity = 0.15
    } = options;

    if (!Array.isArray(imageAssets) || imageAssets.length === 0) {
      return [];
    }

    // Clone and assign timestamps
    const items = imageAssets.map((asset, idx) => {
      let tsSec = typeof asset.timestampSeconds === 'number' ? asset.timestampSeconds : null;
      let outIdx = asset.outputIndex || 1;

      if (tsSec === null) {
        const parsed = FilenameParser.parse(asset.path || asset.filename || `clip_${idx}`);
        tsSec = parsed.hasTimestamp ? parsed.timestampSeconds : idx * defaultImageDuration;
        outIdx = parsed.outputIndex || 1;
      }

      return {
        ...asset,
        timestampSeconds: tsSec,
        outputIndex: outIdx
      };
    });

    // Group by timestamp
    const timestampGroups = new Map();
    items.forEach(item => {
      const key = item.timestampSeconds;
      if (!timestampGroups.has(key)) timestampGroups.set(key, []);
      timestampGroups.get(key).push(item);
    });

    const sortedTimestamps = Array.from(timestampGroups.keys()).sort((a, b) => a - b);
    const motionPool = ['SLOW_PUSH', 'KEN_BURNS_TL_BR', 'SLOW_PULL', 'KEN_BURNS_BR_TL', 'PAN_RIGHT', 'PAN_LEFT'];
    const clips = [];

    for (let i = 0; i < sortedTimestamps.length; i++) {
      const currentTs = sortedTimestamps[i];
      const group = timestampGroups.get(currentTs);

      let intervalStart = currentTs;
      if (i === 0 && fillInitialGap && intervalStart > 0) {
        intervalStart = 0;
      }

      let intervalEnd;
      if (i < sortedTimestamps.length - 1) {
        intervalEnd = sortedTimestamps[i + 1];
      } else {
        if (totalVoiceoverDuration > intervalStart) {
          intervalEnd = totalVoiceoverDuration;
        } else {
          intervalEnd = intervalStart + defaultImageDuration;
        }
      }

      const totalIntervalDuration = Math.max(intervalEnd - intervalStart, 0.5);
      const subDuration = +(totalIntervalDuration / group.length).toFixed(3);

      group.forEach((asset, subIdx) => {
        const clipStart = +(intervalStart + subIdx * subDuration).toFixed(3);
        const clipDuration = (subIdx === group.length - 1)
          ? +(intervalEnd - clipStart).toFixed(3)
          : subDuration;

        const motionKey = motionPool[(clips.length) % motionPool.length];
        const motionPreset = (typeof MOTION_PRESETS !== 'undefined' && MOTION_PRESETS[motionKey])
          ? MOTION_PRESETS[motionKey]
          : { startScale: 1.0, endScale: 1.15, startPos: [0.5, 0.5], endPos: [0.5, 0.5] };

        clips.push({
          id: `clip_${Date.now()}_${clips.length}_${Math.random().toString(36).substr(2, 4)}`,
          assetId: asset.id || `asset_${clips.length}`,
          path: asset.path,
          filename: asset.filename,
          mediaType: asset.mediaType || 'image/png',
          startTime: clipStart,
          duration: clipDuration,
          endTime: +(clipStart + clipDuration).toFixed(3),
          originalTimestamp: currentTs,
          displayTimestamp: TimestampParser.formatSeconds(currentTs),
          outputIndex: asset.outputIndex,
          prompt: asset.prompt || null,
          motion: {
            preset: motionKey,
            startScale: motionPreset.startScale,
            endScale: motionPreset.endScale,
            startPos: motionPreset.startPos,
            endPos: motionPreset.endPos,
            intensity: motionIntensity,
            easing: 'ease_in_out'
          },
          effects: {
            brightness: 0.0,
            contrast: 1.0,
            saturation: 1.0,
            temperature: 0.0,
            tint: 0.0,
            blur: 0.0,
            vignette: 0.0,
            filmGrain: 0.0
          },
          transition: {
            type: clips.length === 0 ? 'CUT' : defaultTransition,
            duration: clips.length === 0 ? 0.0 : defaultTransitionDuration
          }
        });
      });
    }

    return clips;
  }

  static adjustClipDuration(clips, editedClipId, newDuration, ripple = true) {
    const updated = JSON.parse(JSON.stringify(clips));
    const targetIdx = updated.findIndex(c => c.id === editedClipId);
    if (targetIdx === -1) return updated;

    const targetClip = updated[targetIdx];
    const durationDelta = newDuration - targetClip.duration;
    targetClip.duration = Math.max(newDuration, 0.2);
    targetClip.endTime = +(targetClip.startTime + targetClip.duration).toFixed(3);

    if (ripple) {
      for (let i = targetIdx + 1; i < updated.length; i++) {
        updated[i].startTime = +(updated[i].startTime + durationDelta).toFixed(3);
        updated[i].endTime = +(updated[i].startTime + updated[i].duration).toFixed(3);
      }
    } else if (targetIdx < updated.length - 1) {
      updated[targetIdx + 1].startTime = targetClip.endTime;
      updated[targetIdx + 1].duration = Math.max(updated[targetIdx + 1].endTime - updated[targetIdx + 1].startTime, 0.2);
    }

    return updated;
  }
}

class CaptionService {
  static parseTimecode(tcStr) {
    if (!tcStr) return 0;
    const clean = tcStr.trim().replace(',', '.');
    const parts = clean.split(':');
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return parseFloat(clean) || 0;
  }

  static chunkTextIntoViralSegments(text, totalDuration, startTime = 0) {
    const rawWords = (text || '').trim().split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];
    if (rawWords.length <= 4) {
      return [{
        text: text.trim(),
        startTime: +startTime.toFixed(3),
        endTime: +(startTime + totalDuration).toFixed(3),
        duration: +totalDuration.toFixed(3),
        words: rawWords.map((w, idx) => ({ word: w, index: idx }))
      }];
    }

    const chunks = [];
    let currentChunk = [];
    for (let i = 0; i < rawWords.length; i++) {
      currentChunk.push(rawWords[i]);
      const hasPunctuation = /[.!?]$/.test(rawWords[i]);
      if (currentChunk.length >= 4 || (currentChunk.length >= 3 && hasPunctuation) || i === rawWords.length - 1) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }
    if (currentChunk.length > 0) {
      if (chunks.length > 0 && currentChunk.length < 2) {
        chunks[chunks.length - 1] += ' ' + currentChunk.join(' ');
      } else {
        chunks.push(currentChunk.join(' '));
      }
    }

    const segments = [];
    let segStart = startTime;
    const durPerWord = totalDuration / rawWords.length;

    for (const chunk of chunks) {
      const chunkWords = chunk.split(/\s+/).map((w, idx) => ({ word: w, index: idx }));
      const segDur = +(durPerWord * chunkWords.length).toFixed(3);
      const segEnd = +(segStart + segDur).toFixed(3);
      segments.push({
        text: chunk,
        startTime: +segStart.toFixed(3),
        endTime: segEnd,
        duration: segDur,
        words: chunkWords
      });
      segStart = segEnd;
    }
    return segments;
  }

  static parseSRT(srtContent) {
    if (!srtContent || typeof srtContent !== 'string') return [];
    const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const blocks = normalized.trim().split(/\n\s*\n/);
    const captions = [];

    blocks.forEach((block, idx) => {
      const lines = block.trim().split('\n');
      if (lines.length < 2) return;

      let timeLineIdx = lines.findIndex(l => l.includes('-->'));
      if (timeLineIdx === -1) return;

      const timeLine = lines[timeLineIdx];
      const timeMatch = timeLine.match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/);
      if (!timeMatch) return;

      const startTime = this.parseTimecode(timeMatch[1]);
      const endTime = this.parseTimecode(timeMatch[2]);
      const duration = +(endTime - startTime).toFixed(3);
      const text = lines.slice(timeLineIdx + 1).join(' ').replace(/<[^>]*>/g, '').trim();

      if (text) {
        const segs = this.chunkTextIntoViralSegments(text, Math.max(duration, 0.5), startTime);
        segs.forEach(seg => {
          captions.push({
            id: `cap_${captions.length + 1}`,
            index: captions.length + 1,
            ...seg
          });
        });
      }
    });

    return captions;
  }

  static parseVTT(vttContent) {
    const withoutHeader = (vttContent || '').replace(/^WEBVTT[^\n]*\n+/i, '');
    return this.parseSRT(withoutHeader);
  }

  static parseTXT(txtContent, intervalSeconds = 3.5, totalVoDuration = null) {
    if (!txtContent) return [];
    const lines = txtContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];
    const captions = [];
    let curTime = 0.0;

    const durPerLine = (totalVoDuration && totalVoDuration > 0)
      ? Math.max(1.5, +(totalVoDuration / lines.length).toFixed(3))
      : intervalSeconds;

    lines.forEach(line => {
      const segs = this.chunkTextIntoViralSegments(line, durPerLine, curTime);
      segs.forEach(seg => {
        captions.push({
          id: `cap_txt_${captions.length + 1}`,
          index: captions.length + 1,
          ...seg
        });
      });
      curTime = segs.length > 0 ? segs[segs.length - 1].endTime : curTime + durPerLine;
    });

    return captions;
  }
}

// Expose on global window object for browser
if (typeof window !== 'undefined') {
  window.TimestampParser = TimestampParser;
  window.FilenameParser = FilenameParser;
  window.TimelineBuilderService = TimelineBuilderService;
  window.TimelineBuilder = TimelineBuilderService;
  window.CaptionService = CaptionService;
}

// Expose on module.exports for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TimestampParser,
    FilenameParser,
    TimelineBuilderService,
    CaptionService
  };
}
