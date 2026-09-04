const Compression = require('../../backend/services/compression.service');

describe('Smart Compression & Bitrate Realism Tests', () => {
  test('Calculates exact video bitrate for 50 MB target on 30s 1080p video', () => {
    const calc = Compression.calculateTargetBitrate({
      targetSizeMB: 50,
      durationSeconds: 30,
      audioBitrateKbps: 128,
      width: 1920,
      height: 1080,
      fps: 30
    });

    assert.ok(calc.targetBitrateKbps > 10000); // approx 13.5 Mbps
    assert.ok(calc.bitsPerPixel > 0.15);
    assert.strictEqual(calc.qualityLevel, 'Very Good');
    assert.isTrue(calc.isRealistic);
  });

  test('Flags unrealistic target size (e.g. 10 MB for 1 hour video) with warning', () => {
    const calc = Compression.calculateTargetBitrate({
      targetSizeMB: 10,
      durationSeconds: 3600, // 1 hour
      audioBitrateKbps: 64,
      width: 1920,
      height: 1080,
      fps: 30
    });

    assert.strictEqual(calc.qualityLevel, 'Aggressive');
    assert.isFalse(calc.isRealistic);
    assert.ok(calc.warningMessage);
    assert.ok(calc.recommendedTargetMB > 100);
  });
});
