/**
 * MAQ AUTO EDITOR ULTRA - Automated Test Suite Runner
 * Runs all unit and integration test suites with formatted diagnostics.
 */

const fs = require('fs');
const path = require('path');
require('../backend/utils/bin-locator');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

global.assert = {
  strictEqual(actual, expected, msg = '') {
    if (actual !== expected) {
      throw new Error(`Assertion Failed: ${msg} | Expected: ${expected}, Got: ${actual}`);
    }
  },
  deepStrictEqual(actual, expected, msg = '') {
    const aStr = JSON.stringify(actual);
    const eStr = JSON.stringify(expected);
    if (aStr !== eStr) {
      throw new Error(`Assertion Failed: ${msg} | Expected: ${eStr}, Got: ${aStr}`);
    }
  },
  ok(value, msg = '') {
    if (!value) {
      throw new Error(`Assertion Failed: ${msg} | Value is falsy: ${value}`);
    }
  },
  isTrue(value, msg = '') {
    this.strictEqual(value, true, msg);
  },
  isFalse(value, msg = '') {
    this.strictEqual(value, false, msg);
  }
};

global.test = function(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ✗ ${name}`);
    console.error(`    -> ${err.message}`);
    failures.push({ name, error: err });
  }
};

global.describe = function(suiteName, fn) {
  console.log(`\n======================================================`);
  console.log(` SUITE: ${suiteName}`);
  console.log(`======================================================`);
  fn();
};

async function runAllTests() {
  const testsDir = __dirname;
  const unitDir = path.join(testsDir, 'unit');
  const integDir = path.join(testsDir, 'integration');

  const files = [
    ...fs.readdirSync(unitDir).filter(f => f.endsWith('.test.js')).map(f => path.join(unitDir, f)),
    ...fs.readdirSync(integDir).filter(f => f.endsWith('.test.js')).map(f => path.join(integDir, f))
  ];

  for (const file of files) {
    require(file);
  }

  console.log(`\n======================================================`);
  console.log(` TEST RUN COMPLETE`);
  console.log(` Total Tests:  ${totalTests}`);
  console.log(` Passed:       ${passedTests}`);
  console.log(` Failed:       ${failedTests}`);
  if (failures.length > 0) {
    console.log(` Failures:`);
    failures.forEach(f => console.log(`   - ${f.name}: ${f.error.message}`));
  }
  console.log(` Status:       ${failedTests === 0 ? 'ALL TESTS PASSED ✓' : 'TESTS FAILED ✗'}`);
  console.log(`======================================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests();
