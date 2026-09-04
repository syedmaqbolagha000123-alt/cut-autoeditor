/**
 * MAQ AUTO EDITOR ULTRA - Smart Sound Effect (SFX) Suggestion & Placement Engine
 * Conservatively analyzes prompts, transcripts, and scene changes to suggest and position high-impact audio effects.
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');
const logger = new Logger('SmartSFX');

class SmartSFXService {
  constructor() {
    this.sfxRootDir = path.join(__dirname, '../../assets/sfx');
    this.keywordMap = {
      door: ['door', 'slammed', 'creak', 'entrance', 'gate', 'lock', 'unlocked'],
      footsteps: ['footstep', 'footsteps', 'walk', 'walking', 'stepped', 'approached', 'crept', 'ran'],
      thunder: ['thunder', 'storm', 'lightning', 'explode', 'explosion', 'boom', 'blast'],
      impact: ['impact', 'hit', 'crash', 'smash', 'punch', 'struck', 'strike', 'fell'],
      whoosh: ['whoosh', 'fast', 'quick', 'zoom', 'fly', 'swish', 'rush', 'transition'],
      vehicle: ['car', 'engine', 'vehicle', 'drive', 'driving', 'road', 'race', 'raced', 'truck', 'motor'],
      nature: ['rain', 'wind', 'forest', 'nature', 'river', 'water', 'stream', 'birds', 'outdoor'],
      cinematic: ['dramatic', 'reveal', 'cinematic', 'epic', 'climax', 'mystery', 'darkness', 'dawn'],
      click: ['click', 'press', 'button', 'switch', 'tick', 'type', 'mechanism']
    };
  }

  /**
   * Scan available local SFX files grouped by category
   */
  getAvailableSFX() {
    const categories = {};
    if (!fs.existsSync(this.sfxRootDir)) return categories;

    const catDirs = fs.readdirSync(this.sfxRootDir, { withFileTypes: true });
    for (const cat of catDirs) {
      if (cat.isDirectory()) {
        const catPath = path.join(this.sfxRootDir, cat.name);
        const files = fs.readdirSync(catPath)
          .filter(f => ['.wav', '.mp3', '.ogg', '.flac', '.m4a'].includes(path.extname(f).toLowerCase()))
          .map(f => ({
            name: path.basename(f, path.extname(f)),
            filename: f,
            category: cat.name,
            path: path.join(catPath, f),
            relPath: `assets/sfx/${cat.name}/${f}`
          }));
        if (files.length > 0) {
          categories[cat.name] = files;
        }
      }
    }
    return categories;
  }

  /**
   * Analyze scene prompts and transcript cues to generate conservative SFX placements
   * @param {Array<any>} clips 
   * @param {Array<any>} captions 
   * @param {{ sensitivity?: 'low'|'medium'|'high'|'none', minIntervalSeconds?: number }} options 
   * @returns {Array<any>} List of suggested SFX clips
   */
  suggestSFX(clips = [], captions = [], options = {}) {
    const { sensitivity = 'medium', minIntervalSeconds = 4.0 } = options;
    if (sensitivity === 'none') return [];

    const available = this.getAvailableSFX();
    const suggested = [];
    let lastPlacedTime = -10.0;

    // Combine clip prompts and caption texts with timestamps
    const cues = [];

    clips.forEach(clip => {
      if (clip.prompt) {
        cues.push({
          time: clip.startTime,
          text: clip.prompt.toLowerCase(),
          source: 'prompt',
          clipId: clip.id
        });
      }
    });

    captions.forEach(cap => {
      if (cap.text) {
        cues.push({
          time: cap.startTime,
          text: cap.text.toLowerCase(),
          source: 'caption',
          captionId: cap.id
        });
      }
    });

    // Sort chronologically
    cues.sort((a, b) => a.time - b.time);

    for (const cue of cues) {
      if (cue.time - lastPlacedTime < minIntervalSeconds) {
        continue;
      }

      // Check each category for matching keywords
      for (const [category, keywords] of Object.entries(this.keywordMap)) {
        const matched = keywords.find(kw => new RegExp(`\\b${kw}\\b`, 'i').test(cue.text));
        if (matched) {
          const categoryFiles = available[category] || available['whoosh'] || [];
          if (categoryFiles.length > 0) {
            // Pick a file deterministically based on timestamp
            const chosenFile = categoryFiles[Math.floor(cue.time * 7) % categoryFiles.length];
            suggested.push({
              id: `sfx_${Date.now()}_${suggested.length}_${Math.random().toString(36).substr(2, 4)}`,
              name: chosenFile.name,
              category,
              path: chosenFile.path,
              relPath: chosenFile.relPath,
              startTime: +cue.time.toFixed(3),
              duration: 2.0, // Default duration, trimmed automatically by audio engine
              volume: 0.75, // -2.5 dB
              fadeIn: 0.05,
              fadeOut: 0.2,
              matchedKeyword: matched,
              sourceCue: cue.text
            });
            lastPlacedTime = cue.time;
            break;
          }
        }
      }
    }

    logger.info(`Generated ${suggested.length} smart SFX suggestions`, { sensitivity, minIntervalSeconds });
    return suggested;
  }
}

module.exports = new SmartSFXService();
