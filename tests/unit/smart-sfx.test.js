const SmartSFX = require('../../backend/services/smart-sfx.service');

describe('Smart SFX Analyzer Tests', () => {
  test('Matches prompt keywords to correct sound effect categories', () => {
    const clips = [
      { id: 'c1', startTime: 3.0, prompt: 'Classic garage workshop door slammed shut' },
      { id: 'c2', startTime: 8.0, prompt: 'Engineer footsteps approaching precision machinery' },
      { id: 'c3', startTime: 14.0, prompt: 'Thunderous engine combustion ignition' },
      { id: 'c4', startTime: 20.0, prompt: 'High speed car raced across the track' }
    ];

    const suggestions = SmartSFX.suggestSFX(clips, [], { sensitivity: 'high', minIntervalSeconds: 2.0 });

    assert.ok(suggestions.length >= 3);
    const categories = suggestions.map(s => s.category);
    assert.ok(categories.includes('door'));
    assert.ok(categories.includes('footsteps'));
    assert.ok(categories.includes('thunder') || categories.includes('vehicle'));
  });

  test('Enforces conservative minimum spacing between SFX triggers', () => {
    const clips = [
      { id: 'c1', startTime: 1.0, prompt: 'door opened' },
      { id: 'c2', startTime: 1.5, prompt: 'door slammed' },
      { id: 'c3', startTime: 2.0, prompt: 'footsteps' }
    ];

    // With 4.0s minimum interval, only the first trigger should place SFX
    const suggestions = SmartSFX.suggestSFX(clips, [], { sensitivity: 'medium', minIntervalSeconds: 4.0 });
    assert.strictEqual(suggestions.length, 1);
  });
});
