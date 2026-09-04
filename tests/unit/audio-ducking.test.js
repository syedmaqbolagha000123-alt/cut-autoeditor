const AudioDucking = require('../../backend/services/audio-ducking.service');

describe('Audio Ducking Filtergraph Tests', () => {
  test('Constructs sidechain compression filter for voiceover priority over music', () => {
    const filter = AudioDucking.buildAudioFilterGraph({
      voiceoverPath: '/tmp/vo.mp3',
      musicClips: [{ path: '/tmp/music.mp3', startTime: 0, volume: 0.35 }],
      sfxClips: [{ path: '/tmp/sfx.wav', startTime: 5.0, volume: 0.7 }],
      duckingStrengthDB: -18,
      totalDuration: 30.0
    });

    assert.ok(filter.filterComplex.includes('sidechaincompress'));
    assert.ok(filter.filterComplex.includes('loudnorm'));
    assert.strictEqual(filter.outputMap, '[aout]');
  });
});
