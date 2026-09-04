const AutoEdit = require('../../backend/services/auto-edit.service');
const path = require('path');

describe('Auto Edit Workflow Integration Tests', () => {
  test('Assembles complete storytelling project from raw images, voiceover, and transcript', () => {
    const images = [
      { filename: '0-03.png', path: path.join(__dirname, '../../demo-project/images/0-03.png'), timestampSeconds: 3 },
      { filename: '0-07.png', path: path.join(__dirname, '../../demo-project/images/0-07.png'), timestampSeconds: 7 },
      { filename: '0-12.png', path: path.join(__dirname, '../../demo-project/images/0-12.png'), timestampSeconds: 12 },
      { filename: '0-18.png', path: path.join(__dirname, '../../demo-project/images/0-18.png'), timestampSeconds: 18 }
    ];

    const transcript = `1
00:00:00,000 --> 00:00:03,000
Workshop door opened.

2
00:00:03,000 --> 00:00:07,000
Examining the blueprint archive.
`;

    const project = AutoEdit.runAutoEdit({
      projectName: 'Test Auto Assembly',
      voiceover: { path: path.join(__dirname, '../../demo-project/voiceover.mp3'), duration: 20.0 },
      imageAssets: images,
      transcriptContent: transcript,
      presetKey: 'CINEMATIC'
    });

    assert.strictEqual(project.timeline.videoClips.length, 4);
    assert.strictEqual(project.timeline.captions.length, 2);
    assert.ok(project.timeline.videoClips[0].motion.preset);
  });
});
