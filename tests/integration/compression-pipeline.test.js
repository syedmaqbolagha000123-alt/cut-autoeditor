const Compression = require('../../backend/services/compression.service');
const path = require('path');
const fs = require('fs');

describe('Smart Video Compression Pipeline Integration Tests', () => {
  test('Compresses an existing video file to target size', async () => {
    // Generate small test video first
    const tempDir = path.join(__dirname, '../../temp');
    const inputVid = path.join(tempDir, 'test_input_comp.mp4');
    const outputVid = path.join(tempDir, 'test_output_comp.mp4');

    require('child_process').execSync(`ffmpeg -y -f lavfi -i testsrc=duration=4:size=1280x720:rate=24 -f lavfi -i sine=frequency=440:duration=4 -c:v libx264 -b:v 3000k -c:a aac "${inputVid}"`);

    const res = await Compression.compressVideo({
      inputPath: inputVid,
      outputPath: outputVid,
      mode: 'target_size',
      targetSizeMB: 1.0,
      codec: 'h264'
    });

    assert.isTrue(res.success);
    assert.isTrue(fs.existsSync(outputVid));
    assert.ok(res.compressedSizeMB > 0);
  });
});
