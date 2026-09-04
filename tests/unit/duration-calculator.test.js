const TimelineBuilder = require('../../backend/services/timeline-builder.service');

describe('Duration Calculation & Timeline Pacing Tests', () => {
  test('Calculates sequential clip durations from timestamps [0-03, 0-07, 0-12]', () => {
    const assets = [
      { filename: '0-03.png', timestampSeconds: 3, path: '/tmp/0-03.png' },
      { filename: '0-07.png', timestampSeconds: 7, path: '/tmp/0-07.png' },
      { filename: '0-12.png', timestampSeconds: 12, path: '/tmp/0-12.png' }
    ];

    // Voiceover total duration = 20s
    const clips = TimelineBuilder.buildVideoClips(assets, 20.0, { fillInitialGap: true });

    assert.strictEqual(clips.length, 3);

    // Clip 1 starts at 0 (fillInitialGap) and ends at 7
    assert.strictEqual(clips[0].startTime, 0);
    assert.strictEqual(clips[0].duration, 7);
    assert.strictEqual(clips[0].endTime, 7);

    // Clip 2 starts at 7 and ends at 12
    assert.strictEqual(clips[1].startTime, 7);
    assert.strictEqual(clips[1].duration, 5);
    assert.strictEqual(clips[1].endTime, 12);

    // Clip 3 starts at 12 and ends at voiceover duration 20
    assert.strictEqual(clips[2].startTime, 12);
    assert.strictEqual(clips[2].duration, 8);
    assert.strictEqual(clips[2].endTime, 20);
  });

  test('Distributes duration equally among multi-output duplicates (e.g. 0-03.png and 0-03-2.png)', () => {
    const assets = [
      { filename: '0-03.png', timestampSeconds: 3, outputIndex: 1, path: '/tmp/0-03.png' },
      { filename: '0-03-2.png', timestampSeconds: 3, outputIndex: 2, path: '/tmp/0-03-2.png' },
      { filename: '0-07.png', timestampSeconds: 7, outputIndex: 1, path: '/tmp/0-07.png' }
    ];

    const clips = TimelineBuilder.buildVideoClips(assets, 15.0, { fillInitialGap: true });
    assert.strictEqual(clips.length, 3);

    // Interval 0 to 7 is split between clip 1 and clip 2 (3.5s each)
    assert.strictEqual(clips[0].startTime, 0);
    assert.strictEqual(clips[0].duration, 3.5);
    assert.strictEqual(clips[1].startTime, 3.5);
    assert.strictEqual(clips[1].duration, 3.5);
  });
});
