/**
 * MAQ AUTO EDITOR ULTRA - Smart Text Overlay Engine
 * Identifies key words, statistics, names, and emotional statements from narration/prompts to generate tasteful graphic overlays.
 */

const { SMART_TEXT_OVERLAY_PRESETS } = require('../../shared/constants');

class SmartTextOverlayService {
  /**
   * Analyze clips and captions to generate tasteful graphic callout overlays
   * @param {Array<any>} clips 
   * @param {Array<any>} captions 
   * @param {{
   *   frequencySeconds?: number,
   *   maxOverlays?: number,
   *   preferredStyle?: string
   * }} options 
   * @returns {Array<any>} Array of smart text overlay items
   */
  static generateOverlays(clips = [], captions = [], options = {}) {
    const {
      frequencySeconds = 10.0,
      maxOverlays = 6,
      preferredStyle = 'KINETIC_TITLE'
    } = options;

    const overlays = [];
    let lastPlacedTime = -frequencySeconds;

    // Pattern matchers
    const numberRegex = /\b(\$?\d+(?:,\d{3})*(?:\.\d+)?%?|\b(?:one|two|three|four|five|ten|hundred|thousand|million|billion)\b)/i;
    const dramaticRegex = /\b(secret|betrayal|truth|power|danger|impossible|never|destiny|victory|catastrophe|miracle|warning|mystery|alive|dead|death)\b/i;
    const nameOrPlaceRegex = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/;

    // Gather candidate text items
    const candidates = [];

    // 1. From captions
    captions.forEach(cap => {
      if (!cap.text) return;
      candidates.push({
        time: cap.startTime,
        duration: Math.min(cap.duration || 3.0, 3.5),
        text: cap.text,
        source: 'caption'
      });
    });

    // 2. From prompts if no captions or supplementary
    if (candidates.length === 0) {
      clips.forEach(clip => {
        if (clip.prompt) {
          candidates.push({
            time: clip.startTime,
            duration: Math.min(clip.duration || 4.0, 3.5),
            text: clip.prompt,
            source: 'prompt'
          });
        }
      });
    }

    // Sort candidates chronologically
    candidates.sort((a, b) => a.time - b.time);

    for (const cand of candidates) {
      if (overlays.length >= maxOverlays) break;
      if (cand.time - lastPlacedTime < frequencySeconds) continue;

      let extracted = null;
      let styleKey = preferredStyle;

      // Check 1: Metric or Number ($10M, 75%, 2026)
      const numMatch = cand.text.match(numberRegex);
      if (numMatch && numMatch[0].length > 1) {
        extracted = numMatch[0].toUpperCase();
        styleKey = 'NUMBER_STAT';
      }

      // Check 2: Dramatic keyword or Emotional callout
      if (!extracted) {
        const dramMatch = cand.text.match(dramaticRegex);
        if (dramMatch) {
          extracted = dramMatch[0].toUpperCase();
          styleKey = 'DRAMATIC_STATEMENT';
        }
      }

      // Check 3: Name or Location
      if (!extracted && cand.text.length < 50) {
        const nameMatch = cand.text.match(nameOrPlaceRegex);
        if (nameMatch && !['The', 'And', 'For', 'With', 'From', 'This', 'That'].includes(nameMatch[0])) {
          extracted = nameMatch[0];
          styleKey = 'LOWER_THIRD_NAME';
        }
      }

      // Check 4: Short punchy phrase (first 3-4 words)
      if (!extracted && cand.text.split(/\s+/).length <= 4 && cand.text.length >= 4) {
        extracted = cand.text.trim().toUpperCase();
        styleKey = 'KINETIC_TITLE';
      }

      if (extracted) {
        const preset = SMART_TEXT_OVERLAY_PRESETS[styleKey] || SMART_TEXT_OVERLAY_PRESETS.KINETIC_TITLE;

        overlays.push({
          id: `overlay_${Date.now()}_${overlays.length}`,
          text: extracted,
          startTime: +cand.time.toFixed(3),
          duration: +cand.duration.toFixed(3),
          endTime: +(cand.time + cand.duration).toFixed(3),
          styleKey,
          presetName: preset.name,
          fontSize: preset.fontSize,
          color: preset.color,
          highlightColor: preset.highlightColor,
          backgroundColor: preset.backgroundColor,
          position: preset.position,
          yOffsetPercent: preset.yOffsetPercent,
          animation: preset.animation
        });

        lastPlacedTime = cand.time;
      }
    }

    return overlays;
  }
}

module.exports = SmartTextOverlayService;
