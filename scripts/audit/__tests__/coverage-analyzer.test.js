'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateCoverageScore,
  calculateFileCoverage,
  toRelativePath,
  analyze
} = require('../coverage-analyzer');

/**
 * Unit-Tests für den CoverageAnalyzer.
 *
 * Validates: Requirements 4.1, 4.3
 */

describe('calculateCoverageScore', () => {
  it('should return 100 when all metrics are 100%', () => {
    assert.strictEqual(calculateCoverageScore(100, 100, 100, 100), 100);
  });

  it('should return 0 when all metrics are 0%', () => {
    assert.strictEqual(calculateCoverageScore(0, 0, 0, 0), 0);
  });

  it('should return the average of all four metrics', () => {
    // (75 + 75 + 50 + 75) / 4 = 68.75
    assert.strictEqual(calculateCoverageScore(75, 75, 50, 75), 68.75);
  });

  it('should return 50 for uniform 50% coverage', () => {
    assert.strictEqual(calculateCoverageScore(50, 50, 50, 50), 50);
  });

  it('should clamp to 0 for negative inputs', () => {
    const score = calculateCoverageScore(-10, -20, -30, -40);
    assert.strictEqual(score, 0);
  });

  it('should clamp to 100 for inputs exceeding 100', () => {
    const score = calculateCoverageScore(200, 200, 200, 200);
    assert.strictEqual(score, 100);
  });
});

describe('calculateFileCoverage', () => {
  it('should calculate correct percentages from Istanbul data', () => {
    const fileData = {
      s: { '0': 1, '1': 1, '2': 0, '3': 1 },       // 3/4 = 75%
      f: { '0': 1, '1': 0 },                          // 1/2 = 50%
      b: { '0': [1, 0], '1': [1, 1] },                // 3/4 = 75%
      statementMap: {
        '0': { start: { line: 1 }, end: { line: 1 } },
        '1': { start: { line: 2 }, end: { line: 2 } },
        '2': { start: { line: 3 }, end: { line: 3 } },
        '3': { start: { line: 4 }, end: { line: 4 } }
      }
    };

    const result = calculateFileCoverage(fileData);

    assert.strictEqual(result.statements, 75);
    assert.strictEqual(result.functions, 50);
    assert.strictEqual(result.branches, 75);
    // Lines: 4 unique lines, 3 covered → 75%
    assert.strictEqual(result.lines, 75);
  });

  it('should return 100% for all metrics when data is empty', () => {
    const fileData = { s: {}, f: {}, b: {}, statementMap: {} };
    const result = calculateFileCoverage(fileData);

    assert.strictEqual(result.statements, 100);
    assert.strictEqual(result.branches, 100);
    assert.strictEqual(result.functions, 100);
    assert.strictEqual(result.lines, 100);
  });

  it('should handle missing properties gracefully', () => {
    const fileData = {};
    const result = calculateFileCoverage(fileData);

    assert.strictEqual(result.statements, 100);
    assert.strictEqual(result.branches, 100);
    assert.strictEqual(result.functions, 100);
    assert.strictEqual(result.lines, 100);
  });

  it('should return 0% statements when none are covered', () => {
    const fileData = {
      s: { '0': 0, '1': 0 },
      f: {},
      b: {},
      statementMap: {
        '0': { start: { line: 1 }, end: { line: 1 } },
        '1': { start: { line: 2 }, end: { line: 2 } }
      }
    };
    const result = calculateFileCoverage(fileData);
    assert.strictEqual(result.statements, 0);
    assert.strictEqual(result.lines, 0);
  });
});

describe('toRelativePath', () => {
  it('should strip rootDir prefix from file path', () => {
    const result = toRelativePath('/home/user/project/src/file.js', '/home/user/project');
    assert.strictEqual(result, 'src/file.js');
  });

  it('should return the original path if rootDir is not a prefix', () => {
    const result = toRelativePath('/other/path/file.js', '/home/user/project');
    assert.strictEqual(result, '/other/path/file.js');
  });

  it('should strip leading slash after removing rootDir', () => {
    const result = toRelativePath('/root/dir/file.js', '/root/dir');
    assert.strictEqual(result, 'file.js');
  });
});

describe('analyze – missing coverage data', () => {
  it('should return score 0 and error when coverage data is unavailable', async () => {
    const config = {
      fix: false,
      verbose: false,
      rootDir: '/tmp/non-existent-coverage-test-dir',
      paths: { backend: ['**/*.js'], frontend: ['src/**/*.js'] },
      thresholds: { minCoverage: 50 }
    };

    const result = await analyze(config);

    assert.strictEqual(result.category, 'coverage');
    assert.strictEqual(result.score, 0);
    assert.ok(Array.isArray(result.findings));
    assert.ok(result.error !== null, 'Expected error to be set');
    assert.strictEqual(result.metadata.totalFiles, 0);
  });

  it('should always return the CategoryResult shape on failure', async () => {
    const config = {
      fix: false,
      verbose: false,
      rootDir: '/tmp/does-not-exist-coverage-test',
      paths: { backend: ['*.js'], frontend: ['*.js'] },
      thresholds: { minCoverage: 50 }
    };

    const result = await analyze(config);

    assert.ok('category' in result, 'Missing category field');
    assert.ok('score' in result, 'Missing score field');
    assert.ok('findings' in result, 'Missing findings field');
    assert.ok('error' in result, 'Missing error field');
  });
});
