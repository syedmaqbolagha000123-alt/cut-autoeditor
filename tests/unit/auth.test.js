const AuthService = require('../../backend/services/auth.service');

describe('Auth & Licensing Tier Tests', () => {
  test('Returns tier capabilities and verifies Free tier restrictions', () => {
    AuthService.setTier('FREE');
    const status = AuthService.getStatus();

    assert.strictEqual(status.tier, 'FREE');
    assert.strictEqual(status.capabilities.maxExportResolution, '1080p');
    assert.strictEqual(status.capabilities.allowSmartTextOverlay, false);
    assert.strictEqual(AuthService.canAccess('allowMaqflowDirectSync'), false);
  });

  test('Verifies Pro tier capabilities and unlocks all features', () => {
    AuthService.setTier('PRO');
    const status = AuthService.getStatus();

    assert.strictEqual(status.tier, 'PRO');
    assert.strictEqual(status.capabilities.maxExportResolution, '4k');
    assert.strictEqual(status.capabilities.allowSmartTextOverlay, true);
    assert.strictEqual(AuthService.canAccess('allowMaqflowDirectSync'), true);
  });
});
