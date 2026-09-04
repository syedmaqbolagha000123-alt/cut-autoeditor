/**
 * MAQ AUTO EDITOR ULTRA - Smart Visual Transitions Engine
 * Context-aware transition selection based on story context, scene emotion, pacing, and media type.
 */

const { TRANSITIONS } = require('../../shared/constants');

class SmartTransitionsService {
  /**
   * Determine optimal transition for a boundary between two clips
   * @param {any} prevClip 
   * @param {any} nextClip 
   * @param {{
   *   storyEmotion?: string,
   *   pacingPreference?: 'conservative'|'moderate'|'dynamic',
   *   index?: number,
   *   totalClips?: number
   * }} context 
   * @returns {{ type: string, duration: number, reason: string }}
   */
  static selectTransition(prevClip, nextClip, context = {}) {
    const {
      storyEmotion = 'neutral',
      pacingPreference = 'conservative',
      index = 1,
      totalClips = 10
    } = context;

    // Boundary check
    if (!prevClip || !nextClip) {
      return { type: 'CUT', duration: 0.0, reason: 'First or last clip boundary' };
    }

    const prevDur = prevClip.duration || 4.0;
    const nextDur = nextClip.duration || 4.0;
    const minDur = Math.min(prevDur, nextDur);

    // Rule 1: Fast pacing (< 2.2s) must use Hard Cut to prevent visual clutter
    if (minDur < 2.2) {
      return {
        type: 'CUT',
        duration: 0.0,
        reason: 'Fast-paced cut to maintain clarity'
      };
    }

    // Extract prompt text cues
    const cueText = `${prevClip.prompt || ''} ${nextClip.prompt || ''} ${storyEmotion}`.toLowerCase();

    // Rule 2: Major chapter/scene breaks or dramatic reveals
    const isMajorShift = /\b(darkness|night|dawn|years later|meanwhile|suddenly|climax|end|reveal)\b/i.test(cueText);
    if (isMajorShift && minDur >= 2.0) {
      const transDur = +(Math.min(minDur * 0.15, 0.5)).toFixed(2);
      return {
        type: 'DIP_BLACK',
        duration: transDur,
        reason: 'Dramatic scene mood beat'
      };
    }

    // Rule 3: High energy or motion cues (action, storm, race, fly, chase)
    const isAction = /\b(run|running|chase|fly|storm|lightning|fast|quick|action|blast|speed)\b/i.test(cueText);
    if (isAction) {
      const transDur = +(Math.min(minDur * 0.12, 0.4)).toFixed(2);
      const actionTypes = ['SLIDE_LEFT', 'SMOOTH_ZOOM', 'WIPE_LEFT'];
      const chosen = actionTypes[index % actionTypes.length];
      return {
        type: chosen,
        duration: transDur,
        reason: 'Dynamic movement matching action context'
      };
    }

    // Rule 4: Contextual smooth cinematic transitions between EVERY image
    const transDur = +(Math.min(minDur * 0.12, 0.45)).toFixed(2);
    const userPool = context.allowedTransitions && Array.isArray(context.allowedTransitions) && context.allowedTransitions.length > 0
      ? context.allowedTransitions
      : null;
    const flowPool = userPool || ['DISSOLVE', 'SMOOTH_ZOOM', 'SLIDE_LEFT', 'WIPE_LEFT', 'SMOOTH_RIGHT', 'RADIAL', 'CIRCLE_OPEN', 'DISSOLVE', 'SLIDE_RIGHT', 'FADE'];
    const chosenType = flowPool[index % flowPool.length];

    return {
      type: chosenType,
      duration: transDur,
      reason: 'Seamless cinematic transition between scenes'
    };
  }

  /**
   * Apply context-aware transitions across a full array of timeline clips
   * @param {Array<any>} clips 
   * @param {{ pacingPreference?: 'conservative'|'moderate'|'dynamic', storyEmotion?: string, allowedTransitions?: Array<string> }} options 
   * @returns {Array<any>} Clips with smart transitions assigned
   */
  static applySmartTransitions(clips, options = {}) {
    if (!Array.isArray(clips) || clips.length === 0) return [];

    const updated = JSON.parse(JSON.stringify(clips));

    // First clip is always a clean start cut
    updated[0].transition = { type: 'CUT', duration: 0.0, reason: 'Opening scene' };

    for (let i = 1; i < updated.length; i++) {
      const prev = updated[i - 1];
      const curr = updated[i];
      const result = this.selectTransition(prev, curr, {
        index: i,
        totalClips: updated.length,
        pacingPreference: options.pacingPreference || 'conservative',
        storyEmotion: options.storyEmotion || 'neutral',
        allowedTransitions: options.allowedTransitions || null
      });

      curr.transition = {
        type: result.type,
        duration: result.duration,
        reason: result.reason
      };
    }

    return updated;
  }
}

module.exports = SmartTransitionsService;
