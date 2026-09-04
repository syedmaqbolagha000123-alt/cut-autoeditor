/**
 * MAQ AUTO EDITOR ULTRA - Caption & Subtitle Engine
 * Parses SRT, VTT, TXT transcripts, formats animated styling, and generates styled ASS files for FFmpeg burning.
 */

const fs = require('fs');
const path = require('path');
const { CAPTION_STYLES } = require('../../shared/constants');
const TimestampParser = require('../utils/timestamp-parser');

class CaptionService {
  /**
   * Convert timecode string (00:00:01.500 or 00:00:01,500) into seconds
   */
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

  /**
   * Format seconds to ASS timecode: H:MM:SS.CC (centiseconds)
   */
  static formatAssTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);

    const pad = (n, width = 2) => String(n).padStart(width, '0');
    return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(cs)}`;
  }

  /**
   * Convert hex color #RRGGBB to ASS BGR format &H00BBGGRR&
   */
  static hexToAssColor(hex, alphaHex = '00') {
    if (!hex) return `&H${alphaHex}FFFFFF&`;
    const clean = hex.replace('#', '');
    let r = 'FF', g = 'FF', b = 'FF';
    if (clean.length === 6) {
      r = clean.substring(0, 2);
      g = clean.substring(2, 4);
      b = clean.substring(4, 6);
    }
    return `&H${alphaHex}${b}${g}${r}&`;
  }

  /**
   * Parse an SRT subtitle string
   */
  static parseSRT(content) {
    const blocks = content.trim().split(/\r?\n\r?\n/);
    const captions = [];

    for (const block of blocks) {
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) continue;

      let timeLine = '';
      let textLines = [];

      if (lines[0].includes('-->')) {
        timeLine = lines[0];
        textLines = lines.slice(1);
      } else if (lines.length >= 2 && lines[1].includes('-->')) {
        timeLine = lines[1];
        textLines = lines.slice(2);
      }

      const match = timeLine.match(/([0-9:.,]+)\s*-->\s*([0-9:.,]+)/);
      if (match) {
        const start = this.parseTimecode(match[1]);
        const end = this.parseTimecode(match[2]);
        const text = textLines.join(' ');

        captions.push({
          id: `cap_${captions.length + 1}`,
          startTime: +start.toFixed(3),
          endTime: +end.toFixed(3),
          duration: +(end - start).toFixed(3),
          text,
          words: text.split(/\s+/).map((w, idx) => ({ word: w, index: idx }))
        });
      }
    }

    return captions;
  }

  /**
   * Parse a VTT subtitle string
   */
  static parseVTT(content) {
    const cleaned = content.replace(/^WEBVTT[^\n]*\n+/i, '');
    return this.parseSRT(cleaned);
  }

  /**
   * Break long text into viral 3-4 word energetic subtitle chunks (CapCut Pro / TikTok / Reels style)
   * Prevents large screen-covering paragraphs while keeping words synchronized.
   */
  static chunkTextIntoViralSegments(text, totalDuration, startTime = 0) {
    const rawWords = (text || '').trim().split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];
    
    // If text is already concise (<= 4 words), preserve as 1 segment
    if (rawWords.length <= 4) {
      return [{
        text: text.trim(),
        startTime: +startTime.toFixed(3),
        endTime: +(startTime + totalDuration).toFixed(3),
        duration: +totalDuration.toFixed(3),
        words: rawWords.map((w, idx) => ({ word: w, index: idx }))
      }];
    }

    // Group into chunks of 3-4 words (CapCut Pro style)
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

  /**
   * Parse plain text script with optional timestamp headers e.g. [00:03] or 0-03
   * Automatically segments long paragraphs into 3-4 word CapCut Pro chunks.
   * If totalVoDuration is provided, distributes chunks evenly across the entire narration duration.
   */
  static parseTXT(content, defaultDurationPerLine = 4.0, totalVoDuration = null) {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const captions = [];
    let currentTime = 0;

    const durPerLine = (totalVoDuration && totalVoDuration > 0)
      ? Math.max(1.5, +(totalVoDuration / lines.length).toFixed(3))
      : defaultDurationPerLine;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const tsMatch = line.match(/^\[?(\d{1,2}[-:]\d{2}(?:[-:]\d{2})?)\]?\s*(.*)$/);
      let text = line;
      let startTime = currentTime;

      if (tsMatch) {
        const parsed = TimestampParser.parse(tsMatch[1]);
        if (parsed.valid) {
          startTime = parsed.seconds;
        }
        text = tsMatch[2];
      }

      const duration = durPerLine;
      const segs = this.chunkTextIntoViralSegments(text, duration, startTime);
      for (const seg of segs) {
        captions.push({
          id: `cap_${captions.length + 1}`,
          ...seg
        });
      }

      currentTime = segs.length > 0 ? segs[segs.length - 1].endTime : startTime + duration;
    }

    return captions;
  }

  /**
   * Import file by detecting extension
   */
  static importSubtitleFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Subtitle file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.srt') return this.parseSRT(content);
    if (ext === '.vtt') return this.parseVTT(content);
    return this.parseTXT(content);
  }

  /**
   * Generate ASS file content with chosen style profile and optional text overlays
   * @param {Array<any>} captions 
   * @param {string} styleKey 
   * @param {number} videoWidth 
   * @param {number} videoHeight 
   * @param {Array<any>} textOverlays
   * @param {object} customOptions - { fontSize, positionPercent }
   * @returns {string} ASS formatted file content
   */
  static generateASS(captions = [], styleKey = 'BOLD_YELLOW', videoWidth = 1920, videoHeight = 1080, textOverlays = [], customOptions = {}) {
    const style = CAPTION_STYLES[styleKey] || CAPTION_STYLES.BOLD_YELLOW;

    const primaryColorAss = this.hexToAssColor(style.primaryColor);
    const outlineColorAss = this.hexToAssColor(style.outlineColor);
    const shadowColorAss = this.hexToAssColor('#000000', '80');
    const highlightColorAss = this.hexToAssColor(style.highlightColor || '#FACC15');

    // For karaoke/word_pop, PrimaryColour is highlight and SecondaryColour is unhighlighted base
    const isKaraoke = style.animation === 'karaoke' || style.animation === 'word_pop';
    const mainPriAss = isKaraoke ? highlightColorAss : primaryColorAss;
    const mainSecAss = isKaraoke ? primaryColorAss : highlightColorAss;

    const targetPos = (typeof customOptions.positionPercent === 'number')
      ? customOptions.positionPercent
      : (style.yOffsetPercent || 86);
    const marginV = Math.max(10, Math.round(videoHeight * (1 - targetPos / 100)));

    const baseSize = (typeof customOptions.fontSize === 'number' && customOptions.fontSize > 0)
      ? Math.round(customOptions.fontSize * (videoHeight / 720))
      : style.fontSize;
    const fontClean = (style.fontName || 'Montserrat, sans-serif').split(',')[0].trim().replace(/['"]/g, '');

    let ass = `[Script Info]
Title: MAK AutoEditor Subtitles & Graphic Overlays
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontClean},${baseSize},${mainPriAss},${mainSecAss},${outlineColorAss},${shadowColorAss},-1,0,0,0,100,100,1,0,1,${style.outlineWidth},${style.shadowOffset},2,50,50,${marginV},1
Style: Highlight,${fontClean},${baseSize},${highlightColorAss},${primaryColorAss},${outlineColorAss},${shadowColorAss},-1,0,0,0,100,100,1,0,1,${style.outlineWidth},${style.shadowOffset},2,50,50,${marginV},1
Style: OverlayTitle,Impact,${Math.round(videoHeight * 0.055)},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,4,3,5,50,50,0,1
Style: OverlayStat,Arial Black,${Math.round(videoHeight * 0.065)},&H00F8BD38,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,5,4,5,50,50,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // 1. Render standard captions with CapCut Pro style word timing
    for (const cap of captions) {
      const startAss = this.formatAssTime(cap.startTime);
      const endAss = this.formatAssTime(cap.endTime);

      let textFormatted = cap.text;

      if (style.animation === 'fade') {
        textFormatted = `{\\fad(120,120)}${cap.text}`;
      } else if (style.animation === 'pop') {
        textFormatted = `{\\t(0,80,\\fscx108\\fscy108)\\t(80,160,\\fscx100\\fscy100)}${cap.text}`;
      } else if (isKaraoke && cap.words && cap.words.length > 0) {
        const durMs = Math.max(100, (cap.endTime - cap.startTime) * 1000);
        const perWordCs = Math.max(5, Math.round((durMs / cap.words.length) / 10));
        const kTags = cap.words.map(w => `{\\k${perWordCs}}${w.word}`).join(' ');
        textFormatted = kTags;
      }

      ass += `Dialogue: 0,${startAss},${endAss},Default,,0,0,0,,${textFormatted}\n`;
    }

    // 2. Render Smart Text Overlays on upper layer (Layer 1)
    if (Array.isArray(textOverlays)) {
      for (const ov of textOverlays) {
        const startAss = this.formatAssTime(ov.startTime);
        const endAss = this.formatAssTime(ov.endTime);
        const styleName = ov.styleKey === 'NUMBER_STAT' ? 'OverlayStat' : 'OverlayTitle';
        ass += `Dialogue: 1,${startAss},${endAss},${styleName},,0,0,0,,{\\fad(200,200)}${ov.text}\n`;
      }
    }

    return ass;
  }
}

module.exports = CaptionService;
