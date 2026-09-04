const TimestampParser = require('../../backend/utils/timestamp-parser');

describe('Timestamp Parser Tests', () => {
  test('Parses MAQFLOW 2-part hyphen "0-03" to 3 seconds', () => {
    const res = TimestampParser.parse('0-03');
    assert.isTrue(res.valid);
    assert.strictEqual(res.seconds, 3);
    assert.strictEqual(res.display, '00:03');
  });

  test('Parses MAQFLOW 2-part hyphen "0-07" to 7 seconds', () => {
    const res = TimestampParser.parse('0-07');
    assert.isTrue(res.valid);
    assert.strictEqual(res.seconds, 7);
    assert.strictEqual(res.display, '00:07');
  });

  test('Parses MAQFLOW 2-part hyphen "1-03" to 63 seconds', () => {
    const res = TimestampParser.parse('1-03');
    assert.isTrue(res.valid);
    assert.strictEqual(res.seconds, 63);
    assert.strictEqual(res.display, '01:03');
  });

  test('Parses MAQFLOW 2-part hyphen "1-23" to 83 seconds', () => {
    const res = TimestampParser.parse('1-23');
    assert.isTrue(res.valid);
    assert.strictEqual(res.seconds, 83);
    assert.strictEqual(res.display, '01:23');
  });

  test('Parses MAQFLOW 3-part hyphen "1-02-03" to 3723 seconds', () => {
    const res = TimestampParser.parse('1-02-03');
    assert.isTrue(res.valid);
    assert.strictEqual(res.seconds, 3723);
    assert.strictEqual(res.display, '01:02:03');
  });

  test('Parses colon standard format "00:03" and "01:23"', () => {
    assert.strictEqual(TimestampParser.parse('00:03').seconds, 3);
    assert.strictEqual(TimestampParser.parse('01:23').seconds, 83);
    assert.strictEqual(TimestampParser.parse('01:02:03').seconds, 3723);
  });

  test('Parses verbal notation "1m 23s", "0m 03s", "83s", "3s"', () => {
    assert.strictEqual(TimestampParser.parse('1m 23s').seconds, 83);
    assert.strictEqual(TimestampParser.parse('0m 03s').seconds, 3);
    assert.strictEqual(TimestampParser.parse('83s').seconds, 83);
    assert.strictEqual(TimestampParser.parse('3s').seconds, 3);
  });

  test('Rejects invalid seconds (> 59) e.g. "0-99"', () => {
    const res = TimestampParser.parse('0-99');
    assert.isFalse(res.valid);
    assert.ok(res.error.includes('Invalid seconds'));
  });
});
