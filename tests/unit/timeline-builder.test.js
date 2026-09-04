const TimelineBuilder = require('../../backend/services/timeline-builder.service');

describe('Timeline Builder & Ripple Editing Tests', () => {
  test('Adjusts clip duration with ripple mode pushing subsequent clips', () => {
    const initialClips = [
      { id: 'c1', startTime: 0, duration: 5, endTime: 5 },
      { id: 'c2', startTime: 5, duration: 5, endTime: 10 },
      { id: 'c3', startTime: 10, duration: 5, endTime: 15 }
    ];

    // Increase c1 duration to 8 (delta +3)
    const adjusted = TimelineBuilder.adjustClipDuration(initialClips, 'c1', 8, true);

    assert.strictEqual(adjusted[0].duration, 8);
    assert.strictEqual(adjusted[0].endTime, 8);

    assert.strictEqual(adjusted[1].startTime, 8);
    assert.strictEqual(adjusted[1].duration, 5);
    assert.strictEqual(adjusted[1].endTime, 13);

    assert.strictEqual(adjusted[2].startTime, 13);
    assert.strictEqual(adjusted[2].duration, 5);
    assert.strictEqual(adjusted[2].endTime, 18);
  });
});
