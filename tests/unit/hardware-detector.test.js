const HardwareDetector = require('../../backend/services/hardware-detector.service');

describe('Hardware Detection & Encoder Fallback Tests', () => {
  test('Detects system CPU, RAM, and FFmpeg encoder availability', () => {
    const info = HardwareDetector.getSystemInfo();
    assert.ok(info.cpu.model);
    assert.ok(info.cpu.cores > 0);
    assert.ok(info.ram.totalGB > 0);
    assert.ok(info.encoders.available.libx264);
    assert.ok(info.encoders.selected.h264);
  });
});
