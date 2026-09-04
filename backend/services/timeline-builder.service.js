/**
 * MAQ AUTO EDITOR ULTRA - Timeline Builder & Pacing Engine
 * Constructs non-overlapping, synchronized multi-track timelines from voiceover and timestamped images.
 */

const { MOTION_PRESETS, TRANSITIONS } = require('../../shared/constants');
const TimestampParser = require('../utils/timestamp-parser');
const FilenameParser = require('../utils/filename-parser');

class TimelineBuilderService {
  /**
   * Build complete video track clips from image assets and voiceover duration
   * @param {Array<any>} imageAssets 
   * @param {number} totalVoiceoverDuration 
   * @param {{
   *   defaultImageDuration?: number,
   *   fillInitialGap?: boolean,
   *   defaultMotion?: string,
   *   defaultTransition?: string,
   *   defaultTransitionDuration?: number,
   *   motionIntensity?: number
   * }} options 
   * @returns {Array<any>} List of timeline video clips
   */
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

    // Clone and parse timestamps if not already populated
    const items = imageAssets.map((asset, idx) => {
      let tsSec = typeof asset.timestampSeconds === 'number' ? asset.timestampSeconds : null;
      let outputIdx = asset.outputIndex || 1;
      let isSeq = asset.isSequential || false;

      if (tsSec === null) {
        const parsed = FilenameParser.parse(asset.path || asset.filename || `clip_${idx}`);
        tsSec = parsed.hasTimestamp ? parsed.timestampSeconds : idx * defaultImageDuration;
        outputIdx = parsed.outputIndex;
        isSeq = !parsed.hasTimestamp;
      }

      return {
        ...asset,
        timestampSeconds: tsSec,
        outputIndex: outputIdx,
        isSequential: isSeq
      };
    });

    // Group items by timestamp to handle multi-output duplicates
    const timestampGroups = new Map();
    items.forEach(item => {
      const key = item.timestampSeconds;
      if (!timestampGroups.has(key)) timestampGroups.set(key, []);
      timestampGroups.get(key).push(item);
    });

    // Sorted unique timestamps
    const sortedTimestamps = Array.from(timestampGroups.keys()).sort((a, b) => a - b);

    // Motion presets pool for alternating subtle cinematic movement
    const motionPool = [
      'SLOW_PUSH',
      'KEN_BURNS_TL_BR',
      'SLOW_PULL',
      'KEN_BURNS_BR_TL',
      'PAN_RIGHT',
      'PAN_LEFT'
    ];

    const clips = [];

    for (let i = 0; i < sortedTimestamps.length; i++) {
      const currentTs = sortedTimestamps[i];
      const group = timestampGroups.get(currentTs);
      
      // Determine interval start and end
      let intervalStart = currentTs;
      
      // If first clip and fillInitialGap is enabled, stretch start to 0
      if (i === 0 && fillInitialGap && intervalStart > 0) {
        intervalStart = 0;
      }

      // Next timestamp or voiceover end
      let intervalEnd;
      if (i < sortedTimestamps.length - 1) {
        intervalEnd = sortedTimestamps[i + 1];
      } else {
        // Last clip
        if (totalVoiceoverDuration > intervalStart) {
          intervalEnd = totalVoiceoverDuration;
        } else {
          intervalEnd = intervalStart + defaultImageDuration;
        }
      }

      const totalIntervalDuration = Math.max(intervalEnd - intervalStart, 0.5);

      // If group has multiple outputs (e.g. 0-03.png and 0-03-2.png), divide duration equally
      const subDuration = +(totalIntervalDuration / group.length).toFixed(3);

      group.forEach((asset, subIdx) => {
        const clipStart = +(intervalStart + subIdx * subDuration).toFixed(3);
        const clipDuration = (subIdx === group.length - 1)
          ? +(intervalEnd - clipStart).toFixed(3)
          : subDuration;

        // Choose motion preset
        const motionKey = motionPool[(clips.length) % motionPool.length];
        const motionPreset = MOTION_PRESETS[motionKey] || MOTION_PRESETS.SLOW_PUSH;

        // Transition: First clip cut, subsequent clips use default transition or conservative cuts
        let transitionType = 'CUT';
        let transitionDur = 0.0;
        if (clips.length > 0) {
          transitionType = defaultTransition;
          transitionDur = defaultTransitionDuration;
        }

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
            type: transitionType,
            duration: transitionDur
          }
        });
      });
    }

    // Strict Voiceover Duration Lock:
    // When totalVoiceoverDuration is specified, the total timeline duration MUST strictly match it!
    if (totalVoiceoverDuration > 0 && clips.length > 0) {
      const lastClip = clips[clips.length - 1];
      if (lastClip.endTime !== totalVoiceoverDuration) {
        if (lastClip.endTime < totalVoiceoverDuration) {
          // Stretch last clip to fill the exact remainder of voiceover
          lastClip.endTime = +totalVoiceoverDuration.toFixed(3);
          lastClip.duration = +(lastClip.endTime - lastClip.startTime).toFixed(3);
        } else if (lastClip.endTime > totalVoiceoverDuration) {
          // Scale all clip durations proportionally so total duration matches voiceover
          const scaleFactor = totalVoiceoverDuration / lastClip.endTime;
          let runningTime = 0.0;
          clips.forEach((c, cIdx) => {
            c.startTime = +runningTime.toFixed(3);
            if (cIdx === clips.length - 1) {
              c.endTime = +totalVoiceoverDuration.toFixed(3);
              c.duration = +(c.endTime - c.startTime).toFixed(3);
            } else {
              c.duration = Math.max(+(c.duration * scaleFactor).toFixed(3), 0.3);
              c.endTime = +(c.startTime + c.duration).toFixed(3);
              runningTime = c.endTime;
            }
          });
        }
      }
    }

    return clips;
  }

  /**
   * Recalculate timeline after manual trim or duration adjustment
   * @param {Array<any>} clips 
   * @param {string} editedClipId 
   * @param {number} newDuration 
   * @param {boolean} ripple 
   * @returns {Array<any>}
   */
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
      // Non-ripple: push next clip start or absorb difference
      updated[targetIdx + 1].startTime = targetClip.endTime;
      updated[targetIdx + 1].duration = Math.max(updated[targetIdx + 1].endTime - updated[targetIdx + 1].startTime, 0.2);
    }

    return updated;
  }
}

module.exports = TimelineBuilderService;
