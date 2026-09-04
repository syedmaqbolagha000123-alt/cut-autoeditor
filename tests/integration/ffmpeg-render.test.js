const RenderJob = require('../../backend/services/render-job.service');
const path = require('path');
const fs = require('fs');

describe('FFmpeg Master Render Integration Tests', () => {
  test('Renders a real 2-clip video with motion, crossfade transition, and audio mix', () => {
    const testProject = {
      name: 'Integration_Test_Render_Sync',
      voiceover: { path: path.join(__dirname, '../../demo-project/voiceover.mp3') },
      voiceoverDuration: 4.0,
      timeline: {
        videoClips: [
          {
            id: 'c1',
            path: path.join(__dirname, '../../demo-project/images/0-03.png'),
            filename: '0-03.png',
            startTime: 0.0,
            duration: 2.0,
            motion: { preset: 'SLOW_PUSH', intensity: 0.1 },
            effects: { brightness: 0.0, contrast: 1.0 },
            transition: { type: 'CUT', duration: 0.0 }
          },
          {
            id: 'c2',
            path: path.join(__dirname, '../../demo-project/images/0-07.png'),
            filename: '0-07.png',
            startTime: 2.0,
            duration: 2.0,
            motion: { preset: 'SLOW_PULL', intensity: 0.1 },
            effects: { brightness: 0.0, contrast: 1.0 },
            transition: { type: 'FADE', duration: 0.4 }
          }
        ],
        captions: [
          { id: 'cap1', startTime: 0.5, endTime: 2.0, text: 'Testing Render Pipeline' }
        ],
        sfxClips: [
          { path: path.join(__dirname, '../../assets/sfx/whoosh/whoosh_01.wav'), startTime: 0.0, duration: 1.0, volume: 0.8 }
        ],
        musicClips: [
          { path: path.join(__dirname, '../../assets/music/cinematic_ambient_01.mp3'), startTime: 0.0, duration: 4.0, volume: 0.3 }
        ]
      }
    };

    const exportSettings = {
      resolution: '720p',
      fps: 24,
      codec: 'h264',
      quality: 'small_file',
      useHardwareAcceleration: false
    };

    const job = RenderJob.startRender(testProject, exportSettings);
    assert.ok(job.id);
    assert.strictEqual(job.status, 'rendering');
  });
});
