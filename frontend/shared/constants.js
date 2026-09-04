/**
 * MAQ AUTO EDITOR ULTRA - System Constants, Presets & Profiles
 */

const RESOLUTIONS = {
  '1080p': { width: 1920, height: 1080, label: 'Full HD 1080p (16:9 - 1920x1080)', aspect: '16:9' },
  '1440p': { width: 2560, height: 1440, label: '2K QHD 1440p (16:9 - 2560x1440)', aspect: '16:9' },
  '4k': { width: 3840, height: 2160, label: '4K UHD (16:9 - 3840x2160)', aspect: '16:9' },
  '720p': { width: 1280, height: 720, label: 'HD 720p (16:9 - 1280x720)', aspect: '16:9' },
  'vertical_1080p': { width: 1080, height: 1920, label: 'Shorts/Reels 1080p (9:16 - 1080x1920)', aspect: '9:16' },
  'square_1080p': { width: 1080, height: 1080, label: 'Square 1080p (1:1 - 1080x1080)', aspect: '1:1' },
  'portrait_4_5': { width: 1080, height: 1350, label: 'Instagram Portrait (4:5 - 1080x1350)', aspect: '4:5' }
};

const CODECS = {
  H264: { id: 'h264', label: 'H.264 / AVC (Maximum Compatibility)', ext: 'mp4' },
  H265: { id: 'hevc', label: 'H.265 / HEVC (High Efficiency)', ext: 'mp4' },
  AV1: { id: 'av1', label: 'AV1 (Next-Gen Open Codec)', ext: 'mp4' }
};

const HARDWARE_ENCODERS = {
  AMD: { h264: 'h264_amf', hevc: 'hevc_amf' },
  NVIDIA: { h264: 'h264_nvenc', hevc: 'hevc_nvenc', av1: 'av1_nvenc' },
  INTEL: { h264: 'h264_qsv', hevc: 'hevc_qsv', av1: 'av1_qsv' },
  CPU: { h264: 'libx264', hevc: 'libx265', av1: 'libsvtav1' }
};

const MOTION_PRESETS = {
  SLOW_PUSH: { id: 'slow_push', name: 'Slow Push In', category: 'Smooth', startScale: 1.0, endScale: 1.15, startPos: [0.5, 0.5], endPos: [0.5, 0.5], icon: '🔍+' },
  SLOW_PULL: { id: 'slow_pull', name: 'Slow Pull Out', category: 'Smooth', startScale: 1.15, endScale: 1.0, startPos: [0.5, 0.5], endPos: [0.5, 0.5], icon: '🔍-' },
  KEN_BURNS_TL_BR: { id: 'ken_burns_tl_br', name: 'Ken Burns (TL ➔ BR)', category: 'Cinematic', startScale: 1.05, endScale: 1.22, startPos: [0.35, 0.35], endPos: [0.65, 0.65], icon: '↘' },
  KEN_BURNS_BR_TL: { id: 'ken_burns_br_tl', name: 'Ken Burns (BR ➔ TL)', category: 'Cinematic', startScale: 1.22, endScale: 1.05, startPos: [0.65, 0.65], endPos: [0.35, 0.35], icon: '↖' },
  ZOOM_IN: { id: 'zoom_in', name: 'Standard Zoom In', category: 'Dynamic', startScale: 1.0, endScale: 1.3, startPos: [0.5, 0.5], endPos: [0.5, 0.5], icon: '⊕' },
  ZOOM_OUT: { id: 'zoom_out', name: 'Standard Zoom Out', category: 'Dynamic', startScale: 1.3, endScale: 1.0, startPos: [0.5, 0.5], endPos: [0.5, 0.5], icon: '⊖' },
  PAN_LEFT: { id: 'pan_left', name: 'Pan Left', category: 'Pan', startScale: 1.15, endScale: 1.15, startPos: [0.65, 0.5], endPos: [0.35, 0.5], icon: '←' },
  PAN_RIGHT: { id: 'pan_right', name: 'Pan Right', category: 'Pan', startScale: 1.15, endScale: 1.15, startPos: [0.35, 0.5], endPos: [0.65, 0.5], icon: '→' },
  PAN_UP: { id: 'pan_up', name: 'Pan Up', category: 'Pan', startScale: 1.15, endScale: 1.15, startPos: [0.5, 0.65], endPos: [0.5, 0.35], icon: '↑' },
  PAN_DOWN: { id: 'pan_down', name: 'Pan Down', category: 'Pan', startScale: 1.15, endScale: 1.15, startPos: [0.5, 0.35], endPos: [0.5, 0.65], icon: '↓' },
  CENTER_PUNCH: { id: 'center_punch', name: 'Dynamic Punch', category: 'Dynamic', startScale: 1.0, endScale: 1.35, startPos: [0.5, 0.5], endPos: [0.5, 0.5], icon: '🎯' },
  NONE: { id: 'none', name: 'Static (No Motion)', category: 'Basic', startScale: 1.0, endScale: 1.0, startPos: [0.5, 0.5], endPos: [0.5, 0.5], icon: '⏹' }
};

const TRANSITIONS = {
  // Basic
  CUT: { id: 'cut', name: 'Hard Cut', category: 'Basic', defaultDuration: 0.0, ffmpegName: null, icon: '✂' },
  FADE: { id: 'fade', name: 'Cross Dissolve', category: 'Basic', defaultDuration: 0.5, ffmpegName: 'fade', icon: '◐' },
  DISSOLVE: { id: 'dissolve', name: 'Smooth Dissolve', category: 'Basic', defaultDuration: 0.5, ffmpegName: 'dissolve', icon: '◌' },
  // Smooth
  SMOOTH_ZOOM: { id: 'zoomin', name: 'Zoom In Transition', category: 'Smooth', defaultDuration: 0.5, ffmpegName: 'zoomin', icon: '🔎' },
  ZOOM_OUT: { id: 'zoomout', name: 'Zoom Out Transition', category: 'Smooth', defaultDuration: 0.5, ffmpegName: 'zoomout', icon: '🔍' },
  // Dynamic
  SLIDE_LEFT: { id: 'slideleft', name: 'Slide Left', category: 'Dynamic', defaultDuration: 0.4, ffmpegName: 'slideleft', icon: '⇠' },
  SLIDE_RIGHT: { id: 'slideright', name: 'Slide Right', category: 'Dynamic', defaultDuration: 0.4, ffmpegName: 'slideright', icon: '⇢' },
  SLIDE_UP: { id: 'slideup', name: 'Slide Up', category: 'Dynamic', defaultDuration: 0.4, ffmpegName: 'slideup', icon: '⇡' },
  SLIDE_DOWN: { id: 'slidedown', name: 'Slide Down', category: 'Dynamic', defaultDuration: 0.4, ffmpegName: 'slidedown', icon: '⇣' },
  WIPE_LEFT: { id: 'wipeleft', name: 'Wipe Left', category: 'Dynamic', defaultDuration: 0.4, ffmpegName: 'wipeleft', icon: '◀' },
  WIPE_RIGHT: { id: 'wiperight', name: 'Wipe Right', category: 'Dynamic', defaultDuration: 0.4, ffmpegName: 'wiperight', icon: '▶' },
  // Cinematic
  DIP_BLACK: { id: 'fadeblack', name: 'Dip to Black', category: 'Cinematic', defaultDuration: 0.5, ffmpegName: 'fadeblack', icon: '⬛' },
  DIP_WHITE: { id: 'fadewhite', name: 'Dip to White', category: 'Cinematic', defaultDuration: 0.4, ffmpegName: 'fadewhite', icon: '⬜' },
  // Light / Blur / Glitch
  HLICE: { id: 'hlslice', name: 'Horizontal Slice', category: 'Light', defaultDuration: 0.4, ffmpegName: 'hlslice', icon: '☰' },
  VLSICE: { id: 'vuslice', name: 'Vertical Slice', category: 'Light', defaultDuration: 0.4, ffmpegName: 'vuslice', icon: '☷' }
};

const EFFECT_PRESETS = {
  CINEMATIC: { id: 'cinematic', name: 'Cinematic Classic', category: 'Cinematic', brightness: 0.01, contrast: 1.18, saturation: 1.2, blur: 0, vignette: 0.3, icon: '🎬' },
  DOCUMENTARY: { id: 'documentary', name: 'Documentary Realism', category: 'Color', brightness: 0.0, contrast: 1.05, saturation: 0.9, blur: 0, vignette: 0.15, icon: '📜' },
  EMOTIONAL: { id: 'emotional', name: 'Emotional Drama', category: 'Atmosphere', brightness: 0.02, contrast: 1.12, saturation: 0.95, blur: 0, vignette: 0.35, icon: '🎭' },
  DARK: { id: 'dark', name: 'Dark Mystery', category: 'Atmosphere', brightness: -0.08, contrast: 1.3, saturation: 0.7, blur: 0, vignette: 0.5, icon: '🌑' },
  SUSPENSE: { id: 'suspense', name: 'Suspense Thriller', category: 'Atmosphere', brightness: -0.04, contrast: 1.35, saturation: 0.6, blur: 0, vignette: 0.45, icon: '👁' },
  WARM: { id: 'warm', name: 'Warm Sunset', category: 'Color', brightness: 0.03, contrast: 1.1, saturation: 1.25, blur: 0, vignette: 0.2, icon: '🌅' },
  COOL: { id: 'cool', name: 'Cool Arctic', category: 'Color', brightness: -0.02, contrast: 1.15, saturation: 0.85, blur: 0, vignette: 0.25, icon: '❄' },
  HIGH_CONTRAST: { id: 'high_contrast', name: 'High Contrast Bold', category: 'Color', brightness: 0.0, contrast: 1.4, saturation: 1.2, blur: 0, vignette: 0.3, icon: '⚡' },
  SOFT: { id: 'soft', name: 'Soft Dream Glow', category: 'Blur', brightness: 0.04, contrast: 0.95, saturation: 1.05, blur: 0.5, vignette: 0.18, icon: '✨' },
  WARM_CINEMA: { id: 'warm_cinema', name: 'Cinematic Warm', category: 'Color', brightness: 0.02, contrast: 1.1, saturation: 1.15, blur: 0, vignette: 0.25, icon: '🌅' },
  COLD_NOIR: { id: 'cold_noir', name: 'Cold Noir', category: 'Color', brightness: -0.05, contrast: 1.25, saturation: 0.35, blur: 0, vignette: 0.4, icon: '🏙' },
  TEAL_ORANGE: { id: 'teal_orange', name: 'Teal & Orange', category: 'Cinematic', brightness: 0.0, contrast: 1.2, saturation: 1.3, blur: 0, vignette: 0.3, icon: '🎬' },
  BW_HIGH_CONTRAST: { id: 'bw_contrast', name: 'Black & White Film', category: 'Color', brightness: 0.0, contrast: 1.35, saturation: 0.0, blur: 0, vignette: 0.35, icon: '🖤' },
  VINTAGE_SEPIA: { id: 'vintage_sepia', name: 'Vintage 1931 Sepia', category: 'Stylize', brightness: 0.02, contrast: 1.1, saturation: 0.4, blur: 0, vignette: 0.45, icon: '📜' },
  VIBRANT_POP: { id: 'vibrant_pop', name: 'Vibrant Pop', category: 'Basic', brightness: 0.02, contrast: 1.15, saturation: 1.45, blur: 0, vignette: 0.1, icon: '🎨' },
  NATURAL: { id: 'natural', name: 'Original / Neutral', category: 'Basic', brightness: 0.0, contrast: 1.0, saturation: 1.0, blur: 0, vignette: 0.0, icon: '🌿' }
};

const CAPTION_STYLES = {
  BOLD_YELLOW: {
    id: 'bold_yellow',
    name: '🟡 Bold Yellow Pop (MrBeast / Viral)',
    fontName: 'Montserrat, "Arial Black", sans-serif',
    fontSize: 30,
    primaryColor: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 3,
    shadowColor: 'rgba(0,0,0,0.85)',
    shadowOffset: 3,
    backgroundColor: 'transparent',
    position: 'bottom',
    yOffsetPercent: 86,
    highlightColor: '#FACC15',
    animation: 'word_pop',
    previewText: 'Bold Viral Captions'
  },
  CLEAN_PILL: {
    id: 'clean_pill',
    name: '🔤 Clean Modern Pill (Netflix / Modern Sans)',
    fontName: 'Inter, -apple-system, sans-serif',
    fontSize: 26,
    primaryColor: '#FFFFFF',
    outlineColor: 'transparent',
    outlineWidth: 0,
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    position: 'bottom',
    yOffsetPercent: 88,
    highlightColor: '#38BDF8',
    animation: 'fade',
    previewText: 'Clean Modern Subtitles'
  },
  CINEMATIC_SERIF: {
    id: 'cinematic_serif',
    name: '🎬 Cinematic Serif (Film & Documentary)',
    fontName: 'Georgia, "Times New Roman", serif',
    fontSize: 26,
    primaryColor: '#F1F5F9',
    outlineColor: '#0F172A',
    outlineWidth: 1,
    shadowColor: 'rgba(0,0,0,0.75)',
    shadowOffset: 2,
    backgroundColor: 'transparent',
    position: 'bottom',
    yOffsetPercent: 90,
    highlightColor: '#38BDF8',
    animation: 'fade',
    previewText: 'Cinematic Narrative Subtitles'
  },
  NEON_CYAN: {
    id: 'neon_cyan',
    name: '💎 Neon Cyan Glow (Cyber / Punchy)',
    fontName: 'Montserrat, sans-serif',
    fontSize: 28,
    primaryColor: '#38BDF8',
    outlineColor: '#0369A1',
    outlineWidth: 2,
    shadowColor: 'rgba(6, 182, 212, 0.8)',
    shadowOffset: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'bottom',
    yOffsetPercent: 86,
    highlightColor: '#22D3EE',
    animation: 'pop',
    previewText: 'Cyberpunk Neon Glow'
  },
  KARAOKE: {
    id: 'karaoke',
    name: '⚡ Viral Word-by-Word Highlight (Alex Hormozi)',
    fontName: 'Montserrat, "Arial Black", sans-serif',
    fontSize: 32,
    primaryColor: '#E2E8F0',
    outlineColor: '#000000',
    outlineWidth: 3,
    shadowColor: 'rgba(0,0,0,0.9)',
    shadowOffset: 3,
    backgroundColor: 'transparent',
    position: 'bottom',
    yOffsetPercent: 84,
    highlightColor: '#FDE047',
    animation: 'karaoke',
    previewText: 'Dynamic Word by Word'
  }
};

// Smart Text Overlay Presets for Graphic Callouts (Section 9)
const SMART_TEXT_OVERLAY_PRESETS = {
  KINETIC_TITLE: {
    id: 'kinetic_title',
    name: 'Kinetic Impact Title',
    fontName: 'Montserrat, Arial Black, sans-serif',
    fontSize: 68,
    color: '#FFFFFF',
    highlightColor: '#F59E0B',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: '12px 28px',
    borderRadius: '8px',
    position: 'center',
    yOffsetPercent: 48,
    animation: 'punch_zoom',
    shadow: '0 8px 30px rgba(0,0,0,0.7)'
  },
  NUMBER_STAT: {
    id: 'number_stat',
    name: 'Bold Metric / Statistic',
    fontName: 'Inter, sans-serif',
    fontSize: 76,
    color: '#38BDF8',
    highlightColor: '#FDE047',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: '14px 32px',
    borderRadius: '12px',
    position: 'center',
    yOffsetPercent: 45,
    animation: 'pop_in',
    shadow: '0 10px 35px rgba(56,189,248,0.4)'
  },
  DRAMATIC_STATEMENT: {
    id: 'dramatic_statement',
    name: 'Dramatic Emotional Callout',
    fontName: 'Georgia, serif',
    fontSize: 56,
    color: '#F8FAFC',
    highlightColor: '#EF4444',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: '16px 36px',
    borderRadius: '4px',
    position: 'center',
    yOffsetPercent: 50,
    animation: 'fade_glide',
    shadow: '0 6px 25px rgba(0,0,0,0.85)'
  },
  LOWER_THIRD_NAME: {
    id: 'lower_third_name',
    name: 'Lower Third Name / Location',
    fontName: 'Inter, sans-serif',
    fontSize: 40,
    color: '#FFFFFF',
    highlightColor: '#6366F1',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: '8px 24px',
    borderRadius: '6px',
    position: 'bottom_left',
    yOffsetPercent: 78,
    animation: 'slide_in_left',
    shadow: '0 4px 20px rgba(0,0,0,0.6)'
  },
  MINIMAL_ACCENT: {
    id: 'minimal_accent',
    name: 'Minimal Clean Accent',
    fontName: 'Inter, sans-serif',
    fontSize: 48,
    color: '#FDE047',
    highlightColor: '#FFFFFF',
    backgroundColor: 'transparent',
    padding: '6px 16px',
    borderRadius: '0px',
    position: 'top',
    yOffsetPercent: 22,
    animation: 'fade',
    shadow: '0 2px 10px rgba(0,0,0,0.9)'
  }
};

const AUTO_EDIT_PRESETS = {
  CINEMATIC: {
    id: 'cinematic',
    name: 'Cinematic Storytelling',
    description: 'Subtle slow push/pull motion, warm color tones, gentle crossfades, conservative sound effects, elegant lower captions.',
    motion: ['SLOW_PUSH', 'KEN_BURNS_TL_BR', 'SLOW_PULL'],
    motionIntensity: 0.12,
    transitions: ['DISSOLVE', 'FADE', 'CUT', 'DIP_BLACK'],
    transitionFrequency: 'conservative',
    transitionDuration: 0.5,
    sfxSensitivity: 'medium',
    musicMood: 'Cinematic',
    duckingStrength: -18,
    captionStyle: 'CINEMATIC',
    effectPreset: 'CINEMATIC',
    enableSmartOverlays: true
  },
  DYNAMIC_STORY: {
    id: 'dynamic_story',
    name: 'Dynamic Storyteller',
    description: 'Energetic pan and zoom, punchy transitions, bold pop captions, expressive sound effects, assertive voiceover ducking.',
    motion: ['ZOOM_IN', 'PAN_RIGHT', 'SLOW_PUSH', 'PAN_LEFT'],
    motionIntensity: 0.22,
    transitions: ['SMOOTH_ZOOM', 'SLIDE_LEFT', 'DISSOLVE', 'CUT'],
    transitionFrequency: 'moderate',
    transitionDuration: 0.4,
    sfxSensitivity: 'high',
    musicMood: 'Suspense',
    duckingStrength: -22,
    captionStyle: 'BOLD_YELLOW',
    effectPreset: 'HIGH_CONTRAST',
    enableSmartOverlays: true
  },
  DOCUMENTARY: {
    id: 'documentary',
    name: 'Historical & Documentary',
    description: 'Careful Ken Burns pacing, traditional cuts and dissolves, documentary caption styling, ambient background audio.',
    motion: ['KEN_BURNS_TL_BR', 'KEN_BURNS_BR_TL', 'SLOW_PUSH'],
    motionIntensity: 0.10,
    transitions: ['CUT', 'DISSOLVE', 'DIP_BLACK'],
    transitionFrequency: 'conservative',
    transitionDuration: 0.6,
    sfxSensitivity: 'low',
    musicMood: 'Documentary',
    duckingStrength: -20,
    captionStyle: 'DOCUMENTARY',
    effectPreset: 'DOCUMENTARY',
    enableSmartOverlays: false
  },
  MINIMAL: {
    id: 'minimal',
    name: 'Clean Minimalist',
    description: 'Zero clutter, gentle pan, pure clean cuts, crisp minimal captions, balanced voiceover priority.',
    motion: ['SLOW_PUSH'],
    motionIntensity: 0.08,
    transitions: ['CUT'],
    transitionFrequency: 'rare',
    transitionDuration: 0.0,
    sfxSensitivity: 'none',
    musicMood: 'Calm',
    duckingStrength: -16,
    captionStyle: 'MINIMAL',
    effectPreset: 'NATURAL',
    enableSmartOverlays: false
  }
};

// Role & Tier Capabilities for Future SaaS / Pro (Section 12)
const TIER_CAPABILITIES = {
  FREE: {
    name: 'Starter / Free',
    maxExportResolution: '1080p',
    maxFps: 30,
    allowedCodecs: ['h264'],
    allowSmartAutoEdit: true,
    allowSmartSFX: true,
    allowSmartTransitions: true,
    allowSmartTextOverlay: false,
    allowMaqflowDirectSync: false,
    allowTwoPassCompression: false,
    maxTimelineTracks: 4
  },
  PRO: {
    name: 'Ultra Pro',
    maxExportResolution: '4k',
    maxFps: 60,
    allowedCodecs: ['h264', 'hevc', 'av1'],
    allowSmartAutoEdit: true,
    allowSmartSFX: true,
    allowSmartTransitions: true,
    allowSmartTextOverlay: true,
    allowMaqflowDirectSync: true,
    allowTwoPassCompression: true,
    maxTimelineTracks: 16
  }
};

if (typeof window !== 'undefined') {
  window.RESOLUTIONS = RESOLUTIONS;
  window.CODECS = CODECS;
  window.HARDWARE_ENCODERS = HARDWARE_ENCODERS;
  window.MOTION_PRESETS = MOTION_PRESETS;
  window.TRANSITIONS = TRANSITIONS;
  window.EFFECT_PRESETS = EFFECT_PRESETS;
  window.CAPTION_STYLES = CAPTION_STYLES;
  window.SMART_TEXT_OVERLAY_PRESETS = SMART_TEXT_OVERLAY_PRESETS;
  window.AUTO_EDIT_PRESETS = AUTO_EDIT_PRESETS;
  window.TIER_CAPABILITIES = TIER_CAPABILITIES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RESOLUTIONS,
    CODECS,
    HARDWARE_ENCODERS,
    MOTION_PRESETS,
    TRANSITIONS,
    EFFECT_PRESETS,
    CAPTION_STYLES,
    SMART_TEXT_OVERLAY_PRESETS,
    AUTO_EDIT_PRESETS,
    TIER_CAPABILITIES
  };
}

