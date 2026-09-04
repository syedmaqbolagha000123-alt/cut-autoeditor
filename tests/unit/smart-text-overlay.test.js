const SmartTextOverlay = require('../../backend/services/smart-text-overlay.service');

describe('Smart Text Overlay Engine Tests', () => {
  test('Extracts numerical statistics and percentages from captions', () => {
    const captions = [
      { id: 'c1', startTime: 2.0, duration: 4.0, text: 'In 1931, production increased by 45%.' },
      { id: 'c2', startTime: 12.0, duration: 3.5, text: 'Over 10,000 engineers worked on the project.' }
    ];

    const overlays = SmartTextOverlay.generateOverlays([], captions, { frequencySeconds: 5.0, maxOverlays: 4 });

    assert.ok(overlays.length >= 1);
    const hasMetric = overlays.some(o => /\d+/.test(o.text));
    assert.isTrue(hasMetric);
  });

  test('Extracts dramatic keywords and quotes from narrative text', () => {
    const captions = [
      { id: 'c1', startTime: 1.0, duration: 4.0, text: 'The secret was hidden for generations.' },
      { id: 'c2', startTime: 15.0, duration: 4.0, text: 'A catastrophic warning echoed across the valley.' }
    ];

    const overlays = SmartTextOverlay.generateOverlays([], captions, { frequencySeconds: 5.0 });

    assert.ok(overlays.length >= 1);
    const words = overlays.map(o => o.text.toLowerCase());
    assert.ok(words.some(w => w.includes('secret') || w.includes('warning') || w.includes('catastrophic')));
  });

  test('Respects frequency interval and max overlays limit', () => {
    const captions = [
      { id: 'c1', startTime: 1.0, duration: 2.0, text: '100 units made.' },
      { id: 'c2', startTime: 2.0, duration: 2.0, text: '200 units delivered.' },
      { id: 'c3', startTime: 3.0, duration: 2.0, text: '300 units completed.' },
      { id: 'c4', startTime: 4.0, duration: 2.0, text: '400 units tested.' }
    ];

    // With frequency 8.0s, only 1 overlay can be placed within a 4s span
    const overlays = SmartTextOverlay.generateOverlays([], captions, { frequencySeconds: 8.0, maxOverlays: 1 });

    assert.strictEqual(overlays.length, 1);
  });
});
