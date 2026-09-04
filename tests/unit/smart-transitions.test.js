const SmartTransitions = require('../../backend/services/smart-transitions.service');

describe('Smart Visual Transitions Engine Tests', () => {
  test('Fast clips (< 2.2s) strictly receive Hard Cut to prevent visual clutter', () => {
    const prevClip = { id: 'c1', startTime: 0, duration: 1.5, prompt: 'Action sequence' };
    const nextClip = { id: 'c2', startTime: 1.5, duration: 2.0, prompt: 'Car drift' };

    const transition = SmartTransitions.selectTransition(prevClip, nextClip, {
      storyEmotion: 'energetic',
      pacingPreference: 'dynamic'
    });

    assert.strictEqual(transition.type, 'CUT');
    assert.strictEqual(transition.duration, 0.0);
  });

  test('Major shifts and reveals receive DIP_BLACK or dramatic transitions', () => {
    const prevClip = { id: 'c1', startTime: 0, duration: 5.0, prompt: 'The journey through the stormy night' };
    const nextClip = { id: 'c2', startTime: 5.0, duration: 6.0, prompt: 'Years later the kingdom was rebuilt' };

    const transition = SmartTransitions.selectTransition(prevClip, nextClip, {
      storyEmotion: 'dramatic',
      pacingPreference: 'conservative'
    });

    assert.ok(['DIP_BLACK', 'DISSOLVE'].includes(transition.type));
    assert.ok(transition.duration > 0);
  });

  test('applySmartTransitions enforces first clip Hard Cut and context-aware assignment', () => {
    const clips = [
      { id: 'c1', startTime: 0, duration: 4.0, prompt: 'Introductory scene' },
      { id: 'c2', startTime: 4.0, duration: 5.0, prompt: 'Cinematic vista with mountains' },
      { id: 'c3', startTime: 9.0, duration: 1.8, prompt: 'Quick close-up' },
      { id: 'c4', startTime: 10.8, duration: 5.0, prompt: 'Dramatic reveal of treasure' }
    ];

    const result = SmartTransitions.applySmartTransitions(clips, { storyEmotion: 'cinematic' });

    assert.strictEqual(result.length, 4);
    // First clip must always be CUT
    assert.strictEqual(result[0].transition.type, 'CUT');
    // Short clip must be CUT
    assert.strictEqual(result[2].transition.type, 'CUT');
    // Others have tasteful transitions
    assert.ok(result[1].transition !== undefined);
  });
});
