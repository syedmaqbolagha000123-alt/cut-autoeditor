const fs = require('fs');
const path = require('path');

describe('Project Serialization (.maqp) Tests', () => {
  test('Validates demo project structure and schema compatibility', () => {
    const demoPath = path.join(__dirname, '../../demo-project/demo.maqp');
    assert.isTrue(fs.existsSync(demoPath));

    const content = JSON.parse(fs.readFileSync(demoPath, 'utf8'));
    assert.strictEqual(content.version, '1.0.0');
    assert.ok(content.timeline.videoClips.length >= 5);
    assert.ok(content.timeline.captions.length >= 5);
    assert.ok(content.timeline.sfxClips.length >= 2);
    assert.ok(content.timeline.musicClips.length >= 1);
  });
});
