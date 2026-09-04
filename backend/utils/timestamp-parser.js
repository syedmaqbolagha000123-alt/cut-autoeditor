/**
 * MAQ AUTO EDITOR ULTRA - Timestamp Parser
 * Normalizes all MAQFLOW and standard timestamp formats into precise float/integer seconds.
 */

class TimestampParser {
  /**
   * Format seconds to standard display timecode (HH:MM:SS or MM:SS)
   * @param {number} totalSeconds 
   * @param {boolean} includeHours 
   * @returns {string}
   */
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

  /**
   * Parse a timestamp string or raw token into normalized seconds
   * @param {string|number} input 
   * @returns {{ valid: boolean, seconds: number, display: string, error?: string, raw: string }}
   */
  static parse(input) {
    if (input === null || input === undefined) {
      return { valid: false, seconds: 0, display: '00:00', error: 'Input timestamp is null or undefined', raw: '' };
    }

    if (typeof input === 'number') {
      if (isNaN(input) || input < 0) {
        return { valid: false, seconds: 0, display: '00:00', error: 'Negative or invalid numeric timestamp', raw: String(input) };
      }
      return {
        valid: true,
        seconds: input,
        display: this.formatSeconds(input),
        raw: String(input)
      };
    }

    const rawStr = String(input).trim();
    if (!rawStr) {
      return { valid: false, seconds: 0, display: '00:00', error: 'Empty timestamp string', raw: rawStr };
    }

    // Pattern 1: HH:MM:SS or H:MM:SS (colon-separated 3 parts)
    const colon3Match = rawStr.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
    if (colon3Match) {
      const h = parseInt(colon3Match[1], 10);
      const m = parseInt(colon3Match[2], 10);
      const s = parseFloat(colon3Match[3]);
      if (m > 59) return { valid: false, seconds: 0, display: '00:00', error: `Invalid minutes (${m} > 59)`, raw: rawStr };
      if (s >= 60) return { valid: false, seconds: 0, display: '00:00', error: `Invalid seconds (${s} >= 60)`, raw: rawStr };
      const totalSec = h * 3600 + m * 60 + s;
      return { valid: true, seconds: totalSec, display: this.formatSeconds(totalSec), raw: rawStr };
    }

    // Pattern 2: MM:SS or M:SS (colon-separated 2 parts)
    const colon2Match = rawStr.match(/^(\d{1,3}):(\d{1,2}(?:\.\d+)?)$/);
    if (colon2Match) {
      const m = parseInt(colon2Match[1], 10);
      const s = parseFloat(colon2Match[2]);
      if (s >= 60) return { valid: false, seconds: 0, display: '00:00', error: `Invalid seconds (${s} >= 60)`, raw: rawStr };
      const totalSec = m * 60 + s;
      return { valid: true, seconds: totalSec, display: this.formatSeconds(totalSec), raw: rawStr };
    }

    // Pattern 3: MAQFLOW 3-part hyphen format H-MM-SS or H-M-S (e.g. 1-02-03)
    const hyphen3Match = rawStr.match(/^(\d{1,2})-(\d{1,2})-(\d{1,2}(?:\.\d+)?)$/);
    if (hyphen3Match) {
      const h = parseInt(hyphen3Match[1], 10);
      const m = parseInt(hyphen3Match[2], 10);
      const s = parseFloat(hyphen3Match[3]);
      if (m > 59) return { valid: false, seconds: 0, display: '00:00', error: `Invalid minutes (${m} > 59)`, raw: rawStr };
      if (s >= 60) return { valid: false, seconds: 0, display: '00:00', error: `Invalid seconds (${s} >= 60)`, raw: rawStr };
      const totalSec = h * 3600 + m * 60 + s;
      return { valid: true, seconds: totalSec, display: this.formatSeconds(totalSec), raw: rawStr };
    }

    // Pattern 4: MAQFLOW 2-part hyphen format M-SS or MM-SS (e.g. 0-03, 1-23, 12-45)
    const hyphen2Match = rawStr.match(/^(\d{1,3})-(\d{1,2}(?:\.\d+)?)$/);
    if (hyphen2Match) {
      const m = parseInt(hyphen2Match[1], 10);
      const s = parseFloat(hyphen2Match[2]);
      if (s >= 60) return { valid: false, seconds: 0, display: '00:00', error: `Invalid seconds in '${rawStr}' (${s} >= 60). Expected 0-59.`, raw: rawStr };
      const totalSec = m * 60 + s;
      return { valid: true, seconds: totalSec, display: this.formatSeconds(totalSec), raw: rawStr };
    }

    // Pattern 5: Human verbal notation e.g. "1h 02m 03s", "1m 23s", "0m 03s"
    const verbalMatch = rawStr.match(/^(?:(\d+)\s*h(?:ours?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?\s*(?:(\d+(?:\.\d+)?)\s*s(?:ec(?:ond)?s?)?)?$/i);
    if (verbalMatch && (verbalMatch[1] || verbalMatch[2] || verbalMatch[3])) {
      const h = verbalMatch[1] ? parseInt(verbalMatch[1], 10) : 0;
      const m = verbalMatch[2] ? parseInt(verbalMatch[2], 10) : 0;
      const s = verbalMatch[3] ? parseFloat(verbalMatch[3]) : 0;
      if (m > 59 && h > 0) return { valid: false, seconds: 0, display: '00:00', error: `Invalid minutes (${m} > 59)`, raw: rawStr };
      if (s >= 60 && (m > 0 || h > 0)) return { valid: false, seconds: 0, display: '00:00', error: `Invalid seconds (${s} >= 60)`, raw: rawStr };
      const totalSec = h * 3600 + m * 60 + s;
      return { valid: true, seconds: totalSec, display: this.formatSeconds(totalSec), raw: rawStr };
    }

    // Pattern 6: Pure seconds e.g. "83s" or "3s"
    const pureSecMatch = rawStr.match(/^(\d+(?:\.\d+)?)\s*s$/i);
    if (pureSecMatch) {
      const s = parseFloat(pureSecMatch[1]);
      return { valid: true, seconds: s, display: this.formatSeconds(s), raw: rawStr };
    }

    return {
      valid: false,
      seconds: 0,
      display: '00:00',
      error: `Unrecognized timestamp format: '${rawStr}'. Expected format like '0-03', '1-23', '01:03', or '1m 23s'`,
      raw: rawStr
    };
  }
}

module.exports = TimestampParser;
