'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculateScore, analyze } = require('../lint-analyzer');

/**
 * Unit-Tests für den LintAnalyzer.
 *
 * Validates: Requirements 1.1, 1.2
 */

describe('calculateScore', () => {
  it('should return 100 when there are no errors and no warnings', () => {
    assert.strictEqual(calculateScore(0, 0), 100);
  });

  it('should deduct 2 points per error', () => {
    // 100 - (10 * 2 + 0 * 0.5) = 80
    assert.strictEqual(calculateScore(10, 0), 80);
  });

  it('should deduct 0.5 points per warning', () => {
    // 100 - (0 * 2 + 20 * 0.5) = 90
    assert.strictEqual(calculateScore(0, 20), 90);
  });

  it('should combine error and warning deductions', () => {
    // 100 - (10 * 2 + 20 * 0.5) = 100 - 30 = 70
    assert.strictEqual(calculateScore(10, 20), 70);
  });

  it('should clamp to 0 when deductions exceed 100 (many errors)', () => {
    // 100 - (50 * 2 + 0 * 0.5) = 100 - 100 = 0
    assert.strictEqual(calculateScore(50, 0), 0);
  });

  it('should clamp to 0 when deductions exceed 100 (many warnings)', () => {
    // 100 - (0 * 2 + 200 * 0.5) = 100 - 100 = 0
    assert.strictEqual(calculateScore(0, 200), 0);
  });

  it('should clamp to 0 for extreme values', () => {
    // 100 - (100 * 2 + 100 * 0.5) = 100 - 250 = -150 → 0
    assert.strictEqual(calculateScore(100, 100), 0);
  });

  it('should never exceed 100', () => {
    const score = calculateScore(0, 0);
    assert.ok(score <= 100, `Score ${score} exceeds 100`);
  });
});

describe('analyze – error tolerance', () => {
  it('should return a valid CategoryResult with score 0 and error message when ESLint config is invalid', async () => {
    // Use a non-existent rootDir to trigger an ESLint error
    const badConfig = {
      fix: false,
      verbose: false,
      rootDir: '/non/existent/path',
      paths: {
        backend: ['**/*.js'],
        frontend: ['src/**/*.js']
      },
      thresholds: {
        maxComplexity: 15,
        maxFileLines: 500,
        minCoverage: 50,
        minDuplicateLines: 6
      }
    };

    const result = await analyze(badConfig);

    assert.strictEqual(result.category, 'linting');
    assert.strictEqual(result.score, 0);
    assert.ok(Array.isArray(result.findings));
    assert.strictEqual(result.findings.length, 0);
    assert.ok(result.error !== null, 'Expected error to be set');
    assert.strictEqual(typeof result.error, 'string');
  });

  it('should always return the CategoryResult shape even on failure', async () => {
    const badConfig = {
      fix: false,
      verbose: false,
      rootDir: '/tmp/does-not-exist-audit-test',
      paths: {
        backend: ['*.js'],
        frontend: ['*.js']
      },
      thresholds: {}
    };

    const result = await analyze(badConfig);

    // Verify CategoryResult structure
    assert.ok('category' in result, 'Missing category field');
    assert.ok('score' in result, 'Missing score field');
    assert.ok('findings' in result, 'Missing findings field');
    assert.ok('error' in result, 'Missing error field');
  });
});
