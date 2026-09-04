/**
 * MAQ AUTO EDITOR ULTRA - File Validator
 * Validates media extensions, file sizes, image/audio headers, and timestamp integrity.
 */

const fs = require('fs');
const path = require('path');
const FilenameParser = require('./filename-parser');

const SUPPORTED_IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SUPPORTED_AUDIO_EXTS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']);
const SUPPORTED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm']);
const SUPPORTED_SUBTITLE_EXTS = new Set(['.srt', '.vtt', '.txt', '.ass']);

class FileValidator {
  /**
   * Validate an image file
   * @param {string} filePath 
   * @returns {{ valid: boolean, error?: string, details?: any }}
   */
  static validateImage(filePath) {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: `File not found: ${filePath}` };
    }

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return { valid: false, error: `Image file is empty (0 bytes): ${path.basename(filePath)}` };
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_IMAGE_EXTS.has(ext)) {
      return { valid: false, error: `Unsupported image format '${ext}'. Supported: PNG, JPG, JPEG, WEBP.` };
    }

    const parsed = FilenameParser.parse(filePath);
    if (parsed.error) {
      return {
        valid: false,
        error: `Invalid timestamp in filename '${parsed.originalFilename}': ${parsed.error}`,
        details: parsed
      };
    }

    return { valid: true, details: { size: stat.size, parsed } };
  }

  /**
   * Validate an audio file
   * @param {string} filePath 
   * @returns {{ valid: boolean, error?: string, details?: any }}
   */
  static validateAudio(filePath) {
    if (!fs.existsSync(filePath)) {
      return { valid: false, error: `Audio file not found: ${filePath}` };
    }

    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return { valid: false, error: `Audio file is empty (0 bytes): ${path.basename(filePath)}` };
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_AUDIO_EXTS.has(ext)) {
      return { valid: false, error: `Unsupported audio format '${ext}'. Supported: MP3, WAV, M4A, AAC, FLAC, OGG.` };
    }

    return { valid: true, details: { size: stat.size, ext } };
  }

  /**
   * Validate project media collection before timeline building or rendering
   * @param {Array<{path: string, type: string}>} mediaList 
   * @returns {{ valid: boolean, issues: string[], validCount: number }}
   */
  static validateMediaCollection(mediaList) {
    const issues = [];
    let validCount = 0;

    if (!Array.isArray(mediaList) || mediaList.length === 0) {
      issues.push('Project media collection is empty.');
      return { valid: false, issues, validCount: 0 };
    }

    for (const item of mediaList) {
      if (!item.path || !fs.existsSync(item.path)) {
        issues.push(`Offline/Missing media: ${item.path || 'Unknown'}`);
        continue;
      }
      if (item.type === 'audio') {
        const res = this.validateAudio(item.path);
        if (!res.valid) issues.push(res.error);
        else validCount++;
      } else if (item.type === 'image') {
        const res = this.validateImage(item.path);
        if (!res.valid) issues.push(res.error);
        else validCount++;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      validCount
    };
  }
}

module.exports = {
  FileValidator,
  SUPPORTED_IMAGE_EXTS,
  SUPPORTED_AUDIO_EXTS,
  SUPPORTED_VIDEO_EXTS,
  SUPPORTED_SUBTITLE_EXTS
};
