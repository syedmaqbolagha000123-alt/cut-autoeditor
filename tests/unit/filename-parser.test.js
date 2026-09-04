const FilenameParser = require('../../backend/utils/filename-parser');

describe('Filename Parser Tests', () => {
  test('Parses standard timestamp file "0-03.png"', () => {
    const res = FilenameParser.parse('0-03.png');
    assert.isTrue(res.hasTimestamp);
    assert.strictEqual(res.timestampSeconds, 3);
    assert.strictEqual(res.outputIndex, 1);
    assert.strictEqual(res.extension, '.png');
  });

  test('Parses duplicate timestamp multi-output files "0-03-2.png" and "0-03-3.png"', () => {
    const res2 = FilenameParser.parse('0-03-2.png');
    assert.isTrue(res2.hasTimestamp);
    assert.strictEqual(res2.timestampSeconds, 3);
    assert.strictEqual(res2.outputIndex, 2);

    const res3 = FilenameParser.parse('0-03-3.png');
    assert.isTrue(res3.hasTimestamp);
    assert.strictEqual(res3.timestampSeconds, 3);
    assert.strictEqual(res3.outputIndex, 3);
  });

  test('Parses long format with output index "1-02-03-2.png"', () => {
    const res = FilenameParser.parse('1-02-03-2.png');
    assert.isTrue(res.hasTimestamp);
    assert.strictEqual(res.timestampSeconds, 3723);
    assert.strictEqual(res.outputIndex, 2);
  });

  test('Detects sequential untimestamped files "001.png" and "scene_02.png"', () => {
    const res1 = FilenameParser.parse('001.png');
    assert.isFalse(res1.hasTimestamp);
    assert.isTrue(res1.isSequential);
    assert.strictEqual(res1.sequentialIndex, 1);

    const res2 = FilenameParser.parse('scene_02.png');
    assert.isFalse(res2.hasTimestamp);
    assert.isTrue(res2.isSequential);
    assert.strictEqual(res2.sequentialIndex, 2);
  });

  test('Handles invalid timestamp filename "0-99.png" with error details', () => {
    const res = FilenameParser.parse('0-99.png');
    assert.isFalse(res.hasTimestamp);
    assert.ok(res.error);
  });
});
