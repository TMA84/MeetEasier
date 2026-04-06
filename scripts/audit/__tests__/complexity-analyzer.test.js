'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { calculateScore, analyzeFile, analyze } = require('../complexity-analyzer');

/**
 * Unit-Tests für den ComplexityAnalyzer.
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */

describe('calculateScore', () => {
  it('should return 100 when all functions are compliant', () => {
    assert.strictEqual(calculateScore(10, 10), 100);
  });

  it('should return 0 when no functions are compliant', () => {
    assert.strictEqual(calculateScore(0, 10), 0);
  });

  it('should return proportional score for partial compliance', () => {
    assert.strictEqual(calculateScore(7, 10), 70);
  });

  it('should return 100 when there are no functions', () => {
    assert.strictEqual(calculateScore(0, 0), 100);
  });

  it('should round to nearest integer', () => {
    // 1/3 = 0.3333... → 33
    assert.strictEqual(calculateScore(1, 3), 33);
  });

  it('should return 50 for half compliant', () => {
    assert.strictEqual(calculateScore(5, 10), 50);
  });
});

describe('analyzeFile – oversized file detection', () => {
  /** @type {string} */
  let tmpDir;

  /**
   * Creates a temporary JS file with the given number of lines.
   * Each line is a simple comment to avoid parse errors.
   */
  function createTempFile(name, lineCount) {
    const lines = [];
    lines.push("'use strict';");
    for (let i = 1; i < lineCount; i++) {
      lines.push(`// line ${i}`);
    }
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    return filePath;
  }

  function makeConfig(overrides = {}) {
    return {
      fix: false,
      verbose: false,
      rootDir: tmpDir,
      paths: { backend: ['**/*.js'], frontend: [] },
      thresholds: { maxComplexity: 15, maxFileLines: 500, ...overrides }
    };
  }

  it('should flag a file exceeding maxFileLines as oversized (Req 2.3)', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'complexity-test-'));
    const filePath = createTempFile('big.js', 600);
    const config = makeConfig();

    const result = analyzeFile(filePath, config);

    const oversizedFinding = result.findings.find(f =>
      f.message.includes('überschreitet') && f.message.includes('Zeilen')
    );
    assert.ok(oversizedFinding, 'Expected an oversized-file finding');
    assert.strictEqual(oversizedFinding.severity, 'medium');
    assert.strictEqual(oversizedFinding.effort, 'medium');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should NOT flag a file within maxFileLines', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'complexity-test-'));
    const filePath = createTempFile('small.js', 100);
    const config = makeConfig();

    const result = analyzeFile(filePath, config);

    const oversizedFinding = result.findings.find(f =>
      f.message.includes('überschreitet') && f.message.includes('Zeilen')
    );
    assert.strictEqual(oversizedFinding, undefined, 'Should not flag a small file');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('analyzeFile – complexity detection', () => {
  /** @type {string} */
  let tmpDir;

  function makeConfig() {
    return {
      fix: false,
      verbose: false,
      rootDir: tmpDir,
      paths: { backend: ['**/*.js'], frontend: [] },
      thresholds: { maxComplexity: 15, maxFileLines: 500 }
    };
  }

  it('should detect functions with high cyclomatic complexity (Req 2.1, 2.2)', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'complexity-test-'));

    // Build a function with many branches to exceed complexity 15
    const branches = Array.from({ length: 18 }, (_, i) =>
      `  if (x === ${i}) return ${i};`
    ).join('\n');
    const source = `'use strict';\nfunction complex(x) {\n${branches}\n  return -1;\n}\nmodule.exports = { complex };\n`;

    const filePath = path.join(tmpDir, 'complex.js');
    fs.writeFileSync(filePath, source, 'utf8');

    const config = makeConfig();
    const result = analyzeFile(filePath, config);

    assert.ok(result.totalFunctions >= 1, 'Should detect at least one function');

    const highComplexity = result.findings.find(f =>
      f.message.includes('zyklomatische Komplexität')
    );
    assert.ok(highComplexity, 'Expected a high-complexity finding');
    assert.strictEqual(highComplexity.severity, 'high');
    assert.strictEqual(highComplexity.effort, 'large');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should mark simple functions as compliant', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'complexity-test-'));

    const source = `'use strict';\nfunction simple(x) {\n  return x + 1;\n}\nmodule.exports = { simple };\n`;
    const filePath = path.join(tmpDir, 'simple.js');
    fs.writeFileSync(filePath, source, 'utf8');

    const config = makeConfig();
    const result = analyzeFile(filePath, config);

    assert.ok(result.totalFunctions >= 1, 'Should detect at least one function');
    assert.strictEqual(result.compliantFunctions, result.totalFunctions, 'All functions should be compliant');

    const highComplexity = result.findings.find(f =>
      f.message.includes('zyklomatische Komplexität')
    );
    assert.strictEqual(highComplexity, undefined, 'Should not flag simple functions');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('analyze – error tolerance', () => {
  it('should return a valid CategoryResult with score 0 and error when config is invalid', async () => {
    const badConfig = {
      fix: false,
      verbose: false,
      rootDir: '/non/existent/path/for/complexity/test',
      paths: { backend: ['**/*.js'], frontend: [] },
      thresholds: { maxComplexity: 15, maxFileLines: 500 }
    };

    const result = await analyze(badConfig);

    assert.strictEqual(result.category, 'complexity');
    assert.ok(Array.isArray(result.findings));
    assert.strictEqual(typeof result.score, 'number');
    assert.ok(result.score >= 0 && result.score <= 100, `Score ${result.score} out of range`);
  });

  it('should always return the CategoryResult shape even on failure', async () => {
    const badConfig = {
      fix: false,
      verbose: false,
      rootDir: '/tmp/does-not-exist-complexity-test',
      paths: { backend: ['*.js'], frontend: ['*.js'] },
      thresholds: { maxComplexity: 15, maxFileLines: 500 }
    };

    const result = await analyze(badConfig);

    assert.ok('category' in result, 'Missing category field');
    assert.ok('score' in result, 'Missing score field');
    assert.ok('findings' in result, 'Missing findings field');
    assert.ok('error' in result, 'Missing error field');
  });
});
