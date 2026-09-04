/**
 * MAQ AUTO EDITOR ULTRA - One-Click Auto Edit Workflow Engine
 * Automatically synthesizes voiceover, timestamped assets, motion, transitions, SFX, music, and captions.
 */

const TimelineBuilder = require('./timeline-builder.service');
const SmartSFX = require('./smart-sfx.service');
const CaptionService = require('./caption.service');
const SmartTransitions = require('./smart-transitions.service');
const SmartTextOverlay = require('./smart-text-overlay.service');
const { AUTO_EDIT_PRESETS, EFFECT_PRESETS } = require('../../shared/constants');
const Logger = require('../utils/logger');
const logger = new Logger('AutoEditEngine');

class AutoEditService {
  /**
   * Execute full automatic storytelling video assembly
   * @param {{
   *   projectName?: string,
   *   voiceover: { path: string, duration?: number },
   *   imageAssets: Array<any>,
   *   transcriptContent?: string,
   *   presetKey?: 'CINEMATIC'|'DYNAMIC_STORY'|'DOCUMENTARY'|'MINIMAL',
   *   backgroundMusic?: { path: string, name?: string },
   *   enableSmartOverlays?: boolean
   * }} input 
   * @returns {any} Complete assembled project state (.maqp ready)
   */
  static runAutoEdit(input = {}) {
    const p = input.project || {};
    const projectName = input.projectName || p.name || 'Auto Story Project';
    const voiceover = input.voiceover || p.voiceover;
    const imageAssets = input.imageAssets || p.imageAssets || [];
    const transcriptContent = input.transcriptContent || p.transcriptContent || null;
    const presetKey = input.presetKey || input.preset || p.preset || 'CINEMATIC';
    const backgroundMusic = input.backgroundMusic || (p.timeline && p.timeline.musicClips && p.timeline.musicClips[0]) || null;
    const enableSmartOverlays = input.enableSmartOverlays ?? (input.options && input.options.smartOverlays) ?? null;

    const preset = AUTO_EDIT_PRESETS[presetKey] || AUTO_EDIT_PRESETS.CINEMATIC;
    const voDuration = (voiceover && voiceover.duration) ? voiceover.duration : 30.0;

    logger.info(`Starting Auto Edit with preset: ${preset.name}`, { imageCount: imageAssets.length, voDuration });

    // 1. Build Video Track
    const customMotion = input.motionPreset || (input.options && input.options.motionPreset) || null;
    const allowedMotions = input.allowedMotions || (input.options && input.options.allowedMotions) || (Array.isArray(customMotion) ? customMotion : null);
    const defaultMotion = (Array.isArray(allowedMotions) && allowedMotions.length > 0)
      ? allowedMotions[0]
      : (customMotion && customMotion !== 'mixture' ? customMotion : preset.motion[0]);

    let videoClips = TimelineBuilder.buildVideoClips(imageAssets, voDuration, {
      defaultImageDuration: 4.5,
      fillInitialGap: true,
      defaultMotion: defaultMotion,
      defaultTransition: preset.transitions[0],
      defaultTransitionDuration: preset.transitionDuration,
      motionIntensity: preset.motionIntensity
    });

    // 1b. Apply Smart Context-Aware Transitions
    const allowedTransitions = input.allowedTransitions || (input.options && input.options.allowedTransitions) || null;
    videoClips = SmartTransitions.applySmartTransitions(videoClips, {
      pacingPreference: preset.transitionFrequency || 'conservative',
      storyEmotion: presetKey,
      allowedTransitions
    });

    // 1c. Apply Visual Effect Preset & Motion Cycling
    const chosenFxKey = (input.options && input.options.effectPreset) || preset.effectPreset || 'WARM_CINEMA';
    const fxPreset = EFFECT_PRESETS[chosenFxKey] || EFFECT_PRESETS.WARM_CINEMA;
    videoClips.forEach((clip, idx) => {
      clip.effects = {
        brightness: fxPreset.brightness || 0.0,
        contrast: fxPreset.contrast || 1.0,
        saturation: fxPreset.saturation || 1.0,
        blur: fxPreset.blur || 0.0,
        vignette: fxPreset.vignette || 0.0
      };
      // If user provided a multi-selected list of motions, cycle through them
      if (Array.isArray(allowedMotions) && allowedMotions.length > 0) {
        const mKey = allowedMotions[idx % allowedMotions.length];
        clip.motion = { preset: mKey };
      } else if (customMotion === 'mixture') {
        const motionCycle = ['SLOW_PUSH', 'KEN_BURNS_TL_BR', 'SLOW_PULL', 'ORBIT_DRIFT', 'PAN_LEFT', 'DIAGONAL_FLOAT', 'KEN_BURNS_BR_TL'];
        const mKey = motionCycle[idx % motionCycle.length];
        clip.motion = { preset: mKey };
      } else if (customMotion && customMotion !== 'none') {
        clip.motion = { preset: customMotion };
      }
    });

    // 2. Parse Captions if transcript provided and captions are enabled
    const enableCaptions = input.options?.enableCaptions !== false;
    let captions = enableCaptions ? (input.captions || []) : [];
    if (enableCaptions && captions.length === 0 && transcriptContent) {
      if (transcriptContent.includes('-->')) {
        captions = CaptionService.parseSRT(transcriptContent);
      } else {
        captions = CaptionService.parseTXT(transcriptContent, 3.5, voDuration);
      }
    }

    // 3. Smart Text Overlays (Callouts, stats, emotional statements)
    let textOverlays = [];
    const shouldEnableOverlays = enableSmartOverlays !== null ? enableSmartOverlays : preset.enableSmartOverlays;
    if (shouldEnableOverlays) {
      textOverlays = SmartTextOverlay.generateOverlays(videoClips, captions, {
        frequencySeconds: presetKey === 'DYNAMIC_STORY' ? 7.0 : 12.0,
        maxOverlays: 6
      });
    }

    // 4. Smart Sound Effects Placement
    let sfxClips = [];
    const customSFXPath = input.customSFXPath || (input.options && input.options.customSFXPath);
    const customSFXName = input.customSFXName || (input.options && input.options.customSFXName) || 'Custom Transition SFX';
    const selectedSFX = input.options?.selectedSFX || [];
    const sfxEnabled = input.options?.sfxEnabled !== false && input.options?.sfxPreset !== 'none';

    if (!sfxEnabled) {
      sfxClips = [];
    } else if (customSFXPath) {
      // Place custom SFX at every scene boundary
      for (let i = 1; i < videoClips.length; i++) {
        sfxClips.push({
          id: `sfx_custom_${i}_${Date.now()}`,
          name: customSFXName,
          path: customSFXPath,
          startTime: Math.max(0, +(videoClips[i].startTime - 0.15).toFixed(2)),
          duration: 2.0,
          volume: 0.8,
          category: 'custom'
        });
      }
    } else if (Array.isArray(selectedSFX) && selectedSFX.length > 0) {
      // Rotate chosen multi-select SFX smoothly across scene boundaries
      for (let i = 1; i < videoClips.length; i++) {
        const sfxItem = selectedSFX[(i - 1) % selectedSFX.length];
        const sfxPath = typeof sfxItem === 'string' ? sfxItem : (sfxItem.path || sfxItem.relPath);
        const sfxName = path.basename(sfxPath, path.extname(sfxPath)).replace(/_/g, ' ');
        sfxClips.push({
          id: `sfx_selected_${i}_${Date.now()}`,
          name: sfxName,
          path: sfxPath,
          startTime: Math.max(0, +(videoClips[i].startTime - 0.15).toFixed(2)),
          duration: 1.8,
          volume: 0.75,
          category: 'transition'
        });
      }
    } else if (input.options?.sfxPreset === 'whoosh_transitions') {
      const defaultWhooshes = [
        'assets/sfx/whoosh/organic_air_whoosh_01.wav',
        'assets/sfx/whoosh/soft_cinematic_swish_02.wav',
        'assets/sfx/transition/smooth_camera_pan.wav'
      ];
      for (let i = 1; i < videoClips.length; i++) {
        const sfxP = defaultWhooshes[(i - 1) % defaultWhooshes.length];
        sfxClips.push({
          id: `sfx_whoosh_${i}_${Date.now()}`,
          name: path.basename(sfxP, path.extname(sfxP)).replace(/_/g, ' '),
          path: sfxP,
          startTime: Math.max(0, +(videoClips[i].startTime - 0.15).toFixed(2)),
          duration: 1.6,
          volume: 0.75,
          category: 'whoosh'
        });
      }
    } else if (input.options?.sfxPreset === 'impacts_subtle') {
      for (let i = 1; i < videoClips.length; i += 2) {
        sfxClips.push({
          id: `sfx_impact_${i}_${Date.now()}`,
          name: 'Subtle Dramatic Impact',
          path: 'assets/sfx/impact/cinematic_impact_01.wav',
          startTime: Math.max(0, +(videoClips[i].startTime).toFixed(2)),
          duration: 2.5,
          volume: 0.7,
          category: 'impact'
        });
      }
    } else if (preset.sfxSensitivity !== 'none') {
      sfxClips = SmartSFX.suggestSFX(videoClips, captions, {
        sensitivity: preset.sfxSensitivity,
        minIntervalSeconds: preset.sfxSensitivity === 'high' ? 3.0 : 5.0
      });
    }

    // 5. Background Music with Auto Ducking
    const musicClips = [];
    const musicVol = (input.options && typeof input.options.musicVolume === 'number')
      ? input.options.musicVolume
      : 0.35;

    if (backgroundMusic && backgroundMusic.path) {
      musicClips.push({
        id: `bgm_${Date.now()}`,
        name: backgroundMusic.name || 'Background Music Track',
        path: backgroundMusic.path,
        startTime: 0.0,
        duration: voDuration,
        volume: musicVol,
        fadeIn: 1.0,
        fadeOut: 1.5,
        duckingEnabled: input.options?.duckingEnabled !== false
      });
    }

    // 6. Final Assembled Project Object
    const project = {
      version: '1.0.0',
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preset: presetKey,
      voiceover: voiceover || null,
      voiceoverDuration: voDuration,
      voiceoverVolume: (typeof input.options?.voiceoverVolume === 'number') ? input.options.voiceoverVolume : 1.0,
      imageAssets: imageAssets || [],
      enableCaptions: enableCaptions,
      captionFontSize: input.options?.captionFontSize || 24,
      captionPositionPercent: input.options?.captionPositionPercent || 86,
      timeline: {
        videoClips,
        captions,
        textOverlays,
        sfxClips,
        musicClips
      },
      audioSettings: {
        duckingStrengthDB: (input.options && input.options.duckingEnabled === false) ? 0 : preset.duckingStrength,
        voiceoverVolume: (typeof input.options?.voiceoverVolume === 'number') ? input.options.voiceoverVolume : 1.0,
        musicVolume: musicVol,
        sfxVolume: 0.75
      },
      captionStyle: input.options?.captionStyle || preset.captionStyle,
      exportSettings: {
        resolution: '1080p',
        fps: 30,
        codec: 'h264',
        quality: 'balanced',
        audioBitrate: '128k',
        useHardwareAcceleration: true
      }
    };

    logger.info('Auto Edit project generated successfully', {
      clips: videoClips.length,
      sfx: sfxClips.length,
      captions: captions.length,
      overlays: textOverlays.length
    });

    return project;
  }
}

module.exports = AutoEditService;
