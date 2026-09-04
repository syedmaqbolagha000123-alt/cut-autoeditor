/**
 * MAQ AUTO EDITOR ULTRA - Filename Parser
 * Extracts timestamp metadata, scene number, duplicate indices, and file extensions.
 */

const path = require('path');
const TimestampParser = require('./timestamp-parser');

class FilenameParser {
  /**
   * Parse a filename into structured metadata
   * @param {string} fullFilenameOrPath 
   * @returns {{
   *   hasTimestamp: boolean,
   *   timestampSeconds: number,
   *   displayTimestamp: string,
   *   outputIndex: number,
   *   originalFilename: string,
   *   extension: string,
   *   baseName: string,
   *   isSequential: boolean,
   *   sequentialIndex: number|null,
   *   error?: string,
   *   rawTimestamp?: string
   * }}
   */
  static parse(fullFilenameOrPath) {
    const filename = path.basename(fullFilenameOrPath);
    const ext = path.extname(filename).toLowerCase();
    const nameWithoutExt = path.basename(filename, ext);

    const result = {
      hasTimestamp: false,
      timestampSeconds: 0,
      displayTimestamp: '00:00',
      outputIndex: 1,
      originalFilename: filename,
      extension: ext,
      baseName: nameWithoutExt,
      isSequential: false,
      sequentialIndex: null,
      rawTimestamp: null
    };

    // Case 1: 4-part or 3-part timestamp with explicit output index e.g. "1-02-03-2" or "1-02-03_2"
    const ts3WithIndexMatch = nameWithoutExt.match(/(?:^|[_#\s])(\d{1,2}-\d{1,2}-\d{1,2})[-_](\d+)$/);
    if (ts3WithIndexMatch) {
      const rawTs = ts3WithIndexMatch[1];
      const outIdx = parseInt(ts3WithIndexMatch[2], 10);
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

    // Case 2: 2-part timestamp with explicit output index e.g. "0-03-2" or "0-03_2" or "1-23-4"
    const ts2WithIndexMatch = nameWithoutExt.match(/(?:^|[_#\s])(\d{1,3}-\d{2})[-_](\d+)$/);
    if (ts2WithIndexMatch) {
      const rawTs = ts2WithIndexMatch[1];
      const outIdx = parseInt(ts2WithIndexMatch[2], 10);
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

    // Case 3: Pure 3-part timestamp without suffix e.g. "1-02-03"
    const ts3Match = nameWithoutExt.match(/(?:^|[_#\s])(\d{1,2}-\d{1,2}-\d{1,2})$/);
    if (ts3Match) {
      const rawTs = ts3Match[1];
      const parsed = TimestampParser.parse(rawTs);
      if (parsed.valid) {
        result.hasTimestamp = true;
        result.timestampSeconds = parsed.seconds;
        result.displayTimestamp = parsed.display;
        result.outputIndex = 1;
        result.rawTimestamp = rawTs;
        return result;
      } else {
        result.error = parsed.error;
        result.rawTimestamp = rawTs;
        return result;
      }
    }

    // Case 4: Pure 2-part timestamp e.g. "0-03" or "1-23" or "12-45"
    const ts2Match = nameWithoutExt.match(/(?:^|[_#\s])(\d{1,3}-\d{1,2})$/);
    if (ts2Match) {
      const rawTs = ts2Match[1];
      const parsed = TimestampParser.parse(rawTs);
      if (parsed.valid) {
        result.hasTimestamp = true;
        result.timestampSeconds = parsed.seconds;
        result.displayTimestamp = parsed.display;
        result.outputIndex = 1;
        result.rawTimestamp = rawTs;
        return result;
      } else {
        result.error = parsed.error;
        result.rawTimestamp = rawTs;
        return result;
      }
    }

    // Case 5: Colon timestamp e.g. "01:23" or "01:02:03" with optional index
    const colonMatch = nameWithoutExt.match(/(?:^|[_#\s])(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)(?:[-_](\d+))?$/);
    if (colonMatch) {
      const normalizedTs = colonMatch[1].replace(/\./g, ':');
      const outIdx = colonMatch[2] ? parseInt(colonMatch[2], 10) : 1;
      const parsed = TimestampParser.parse(normalizedTs);
      if (parsed.valid) {
        result.hasTimestamp = true;
        result.timestampSeconds = parsed.seconds;
        result.displayTimestamp = parsed.display;
        result.outputIndex = outIdx;
        result.rawTimestamp = normalizedTs;
        return result;
      }
    }

    // Case 6: Pure sequential numbering e.g. "001", "002", "scene_01", "image-5"
    const seqMatch = nameWithoutExt.match(/(?:scene|img|image|frame|pic)?[-_]?(\d+)$/i);
    if (seqMatch) {
      result.isSequential = true;
      result.sequentialIndex = parseInt(seqMatch[1], 10);
      return result;
    }

    // Untimestamped non-numbered file
    result.isSequential = true;
    result.sequentialIndex = null;
    return result;
  }
}

module.exports = FilenameParser;
