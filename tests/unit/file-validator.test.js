const { FileValidator } = require('../../backend/utils/file-validator');
const path = require('path');

describe('File Validator Tests', () => {
  const demoImg = path.join(__dirname, '../../demo-project/images/0-03.png');
  const demoVo = path.join(__dirname, '../../demo-project/voiceover.mp3');

  test('Validates existing PNG image file', () => {
    const res = FileValidator.validateImage(demoImg);
    assert.isTrue(res.valid);
  });

  test('Validates existing MP3 voiceover audio file', () => {
    const res = FileValidator.validateAudio(demoVo);
    assert.isTrue(res.valid);
  });

  test('Rejects non-existent media file', () => {
    const res = FileValidator.validateImage('/non/existent/file.png');
    assert.isFalse(res.valid);
    assert.ok(res.error.includes('not found'));
  });

  test('Validates project media collection', () => {
    const media = [
      { path: demoImg, type: 'image' },
      { path: demoVo, type: 'audio' }
    ];
    const res = FileValidator.validateMediaCollection(media);
    assert.isTrue(res.valid);
    assert.strictEqual(res.validCount, 2);
  });
});
