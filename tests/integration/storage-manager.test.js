const StorageService = require('../../backend/services/storage.service');

describe('Storage Manager Integration Tests', () => {
  test('Retrieves storage metrics and verifies cache directories', () => {
    const metrics = StorageService.getStorageMetrics();
    assert.ok(metrics.disk.totalGB > 0);
    assert.ok(metrics.disk.freeGB > 0);
    assert.isFalse(metrics.warnings.isLowDisk);
  });
});
