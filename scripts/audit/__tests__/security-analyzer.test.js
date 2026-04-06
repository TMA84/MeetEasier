'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { calculateScore, scanFileForPatterns } = require('../security-analyzer');

/**
 * Unit-Tests für den SecurityAnalyzer.
 *
 * Validates: Requirements 5.1, 5.4
 */

// ── Helper: temp directory for pattern scanning tests ──

let tmpDir;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-test-'));
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Write a temp file and return its absolute path. */
function writeTmp(name, content) {
  const filePath = path.join(tmpDir, name);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

// ── calculateScore ──

describe('calculateScore', () => {
  it('should return 100 when there are no findings', () => {
    assert.strictEqual(calculateScore([]), 100);
  });

  it('should deduct 20 points for one critical finding', () => {
    const findings = [
      { file: 'a.js', message: 'eval', severity: 'critical', effort: 'medium' }
    ];
    assert.strictEqual(calculateScore(findings), 80);
  });

  it('should deduct 10 points for one high finding', () => {
    const findings = [
      { file: 'a.js', message: 'innerHTML', severity: 'high', effort: 'small' }
    ];
    assert.strictEqual(calculateScore(findings), 90);
  });

  it('should deduct 5 points for one medium finding', () => {
    const findings = [
      { file: 'a.js', message: 'issue', severity: 'medium', effort: 'small' }
    ];
    assert.strictEqual(calculateScore(findings), 95);
  });

  it('should deduct 2 points for one low finding', () => {
    const findings = [
      { file: 'a.js', message: 'minor', severity: 'low', effort: 'small' }
    ];
    assert.strictEqual(calculateScore(findings), 98);
  });

  it('should combine deductions for mixed severities', () => {
    // 100 - 20 (critical) - 10 (high) - 5 (medium) - 2 (low) = 63
    const findings = [
      { file: 'a.js', message: 'eval', severity: 'critical', effort: 'medium' },
      { file: 'b.js', message: 'innerHTML', severity: 'high', effort: 'small' },
      { file: 'c.js', message: 'issue', severity: 'medium', effort: 'small' },
      { file: 'd.js', message: 'minor', severity: 'low', effort: 'small' }
    ];
    assert.strictEqual(calculateScore(findings), 63);
  });

  it('should clamp to 0 when deductions exceed 100', () => {
    // 6 critical findings: 6 * 20 = 120 → clamped to 0
    const findings = Array.from({ length: 6 }, (_, i) => ({
      file: `f${i}.js`, message: 'eval', severity: 'critical', effort: 'medium'
    }));
    assert.strictEqual(calculateScore(findings), 0);
  });
});


// ── scanFileForPatterns ──

describe('scanFileForPatterns', () => {
  it('should detect eval() usage', () => {
    const fp = writeTmp('eval-test.js', 'const x = eval("1+1");\n');
    const findings = scanFileForPatterns(fp, tmpDir);

    assert.ok(findings.length >= 1, 'Expected at least one finding');
    const evalFinding = findings.find(f => f.message.includes('eval()'));
    assert.ok(evalFinding, 'Expected a finding about eval()');
    assert.strictEqual(evalFinding.severity, 'critical');
    assert.strictEqual(evalFinding.line, 1);
  });

  it('should detect new Function() usage', () => {
    const fp = writeTmp('func-test.js', 'const fn = new Function("return 1");\n');
    const findings = scanFileForPatterns(fp, tmpDir);

    const funcFinding = findings.find(f => f.message.includes('Function()'));
    assert.ok(funcFinding, 'Expected a finding about new Function()');
    assert.strictEqual(funcFinding.severity, 'critical');
  });

  it('should detect innerHTML assignment', () => {
    const fp = writeTmp('inner-test.js', 'el.innerHTML = userInput;\n');
    const findings = scanFileForPatterns(fp, tmpDir);

    const innerFinding = findings.find(f => f.message.includes('innerHTML'));
    assert.ok(innerFinding, 'Expected a finding about innerHTML');
    assert.strictEqual(innerFinding.severity, 'high');
  });

  it('should detect log leaks with sensitive keywords', () => {
    const fp = writeTmp('leak-test.js', 'console.log("token:", token);\n');
    const findings = scanFileForPatterns(fp, tmpDir);

    const leakFinding = findings.find(f => f.message.includes('Log-Leak'));
    assert.ok(leakFinding, 'Expected a log-leak finding');
    assert.strictEqual(leakFinding.severity, 'high');
  });

  it('should detect log leaks for password keyword', () => {
    const fp = writeTmp('leak-pw.js', 'console.error("password is", password);\n');
    const findings = scanFileForPatterns(fp, tmpDir);

    const leakFinding = findings.find(f => f.message.includes('Log-Leak'));
    assert.ok(leakFinding, 'Expected a log-leak finding for password');
  });

  it('should not flag safe code without unsafe patterns', () => {
    const safeCode = [
      "'use strict';",
      'const x = 42;',
      'function add(a, b) { return a + b; }',
      'module.exports = { add };',
      ''
    ].join('\n');
    const fp = writeTmp('safe-test.js', safeCode);
    const findings = scanFileForPatterns(fp, tmpDir);

    assert.strictEqual(findings.length, 0, 'Safe code should produce no findings');
  });

  it('should report correct relative file paths', () => {
    const fp = writeTmp('path-test.js', 'eval("x");\n');
    const findings = scanFileForPatterns(fp, tmpDir);

    assert.ok(findings.length >= 1);
    assert.strictEqual(findings[0].file, 'path-test.js');
  });

  it('should detect multiple patterns in the same file', () => {
    const code = [
      'eval("bad");',
      'el.innerHTML = x;',
      'console.log("secret:", secret);',
      ''
    ].join('\n');
    const fp = writeTmp('multi-test.js', code);
    const findings = scanFileForPatterns(fp, tmpDir);

    // At least one of each type
    assert.ok(findings.some(f => f.message.includes('eval()')), 'Should detect eval');
    assert.ok(findings.some(f => f.message.includes('innerHTML')), 'Should detect innerHTML');
    assert.ok(findings.some(f => f.message.includes('Log-Leak')), 'Should detect log leak');
  });
});
