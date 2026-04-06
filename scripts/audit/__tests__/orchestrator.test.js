'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const { runAnalyzer, printSummary } = require('../orchestrator');

/**
 * Unit-Tests für den AuditOrchestrator.
 *
 * Validates: Requirements 9.1, 9.3, 9.4
 */

// --- runAnalyzer ---

describe('runAnalyzer', () => {
  it('should return the result from a successful analyzer', async () => {
    const fakeResult = {
      category: 'linting',
      score: 85,
      findings: [{ file: 'a.js', message: 'test', severity: 'low', effort: 'small' }],
      error: null,
    };
    const fakeAnalyzer = { analyze: async () => fakeResult };

    const result = await runAnalyzer('linting', fakeAnalyzer, {});

    assert.deepStrictEqual(result, fakeResult);
  });

  it('should catch errors and return a CategoryResult with score 0 and error message', async () => {
    const fakeAnalyzer = {
      analyze: async () => { throw new Error('ESLint not found'); },
    };

    const result = await runAnalyzer('linting', fakeAnalyzer, {});

    assert.strictEqual(result.category, 'linting');
    assert.strictEqual(result.score, 0);
    assert.deepStrictEqual(result.findings, []);
    assert.strictEqual(result.error, 'ESLint not found');
  });

  it('should handle non-Error throws gracefully', async () => {
    const fakeAnalyzer = {
      analyze: async () => { throw 'string error'; },
    };

    const result = await runAnalyzer('security', fakeAnalyzer, {});

    assert.strictEqual(result.category, 'security');
    assert.strictEqual(result.score, 0);
    assert.strictEqual(result.error, 'string error');
  });
});

// --- printSummary ---

describe('printSummary', () => {
  it('should print total score, rating, and category scores to console', () => {
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));

    const scoreResult = {
      totalScore: 72,
      rating: 'Gut',
      categoryScores: {
        linting: 80,
        complexity: 60,
        coverage: 90,
        security: 70,
        dependencies: 50,
        style: 40,
      },
    };

    printSummary(scoreResult);
    console.log = originalLog;

    const output = logs.join('\n');
    assert.ok(output.includes('72/100'), 'should include total score');
    assert.ok(output.includes('Gut'), 'should include rating');
    assert.ok(output.includes('linting'), 'should include linting category');
    assert.ok(output.includes('complexity'), 'should include complexity category');
    assert.ok(output.includes('coverage'), 'should include coverage category');
    assert.ok(output.includes('security'), 'should include security category');
    assert.ok(output.includes('dependencies'), 'should include dependencies category');
    assert.ok(output.includes('style'), 'should include style category');
  });
});


// --- Integration Tests ---

/**
 * Integrationstests für den AuditOrchestrator.
 *
 * Validates: Requirements 9.1, 9.3
 */

const { ANALYZERS } = require('../orchestrator');

describe('ANALYZERS registry', () => {
  const expectedKeys = [
    'linting',
    'complexity',
    'duplication',
    'coverage',
    'security',
    'dependencies',
    'style',
  ];

  it('should contain all 7 expected analyzer categories', () => {
    assert.strictEqual(ANALYZERS.length, 7);
    const keys = ANALYZERS.map((a) => a.key);
    assert.deepStrictEqual(keys, expectedKeys);
  });

  it('should have an analyze function on each analyzer module', () => {
    for (const { key, analyzer } of ANALYZERS) {
      assert.strictEqual(
        typeof analyzer.analyze,
        'function',
        `${key} analyzer should export an analyze function`
      );
    }
  });
});

describe('Orchestrator error tolerance (Integration)', () => {
  /**
   * Validates: Requirement 9.3
   * IF ein Prüfschritt fehlschlägt, THEN THE Audit_System SHALL den Fehler
   * protokollieren und mit den verbleibenden Prüfungen fortfahren.
   */

  it('should continue processing after a failing analyzer and collect all results', async () => {
    const mockAnalyzers = [
      {
        key: 'passing-first',
        analyzer: { analyze: async () => ({ category: 'passing-first', score: 90, findings: [], error: null }) },
      },
      {
        key: 'failing',
        analyzer: { analyze: async () => { throw new Error('Analyzer crashed'); } },
      },
      {
        key: 'passing-last',
        analyzer: { analyze: async () => ({ category: 'passing-last', score: 75, findings: [], error: null }) },
      },
    ];

    const results = {};
    for (const { key, analyzer } of mockAnalyzers) {
      results[key] = await runAnalyzer(key, analyzer, {});
    }

    // All three results should be present
    assert.strictEqual(Object.keys(results).length, 3);

    // Successful analyzers return their results
    assert.strictEqual(results['passing-first'].score, 90);
    assert.strictEqual(results['passing-first'].error, null);

    assert.strictEqual(results['passing-last'].score, 75);
    assert.strictEqual(results['passing-last'].error, null);

    // Failed analyzer returns score 0 with error message
    assert.strictEqual(results['failing'].score, 0);
    assert.strictEqual(results['failing'].error, 'Analyzer crashed');
    assert.deepStrictEqual(results['failing'].findings, []);
  });

  it('should handle multiple failing analyzers without stopping', async () => {
    const mockAnalyzers = [
      {
        key: 'fail-1',
        analyzer: { analyze: async () => { throw new Error('Timeout'); } },
      },
      {
        key: 'fail-2',
        analyzer: { analyze: async () => { throw new TypeError('Cannot read property'); } },
      },
      {
        key: 'success',
        analyzer: { analyze: async () => ({ category: 'success', score: 60, findings: [], error: null }) },
      },
    ];

    const results = {};
    for (const { key, analyzer } of mockAnalyzers) {
      results[key] = await runAnalyzer(key, analyzer, {});
    }

    assert.strictEqual(results['fail-1'].score, 0);
    assert.strictEqual(results['fail-1'].error, 'Timeout');
    assert.strictEqual(results['fail-2'].score, 0);
    assert.ok(results['fail-2'].error.includes('Cannot read property'));
    assert.strictEqual(results['success'].score, 60);
    assert.strictEqual(results['success'].error, null);
  });
});

describe('Complete orchestration run with mock analyzers (Integration)', () => {
  /**
   * Validates: Requirements 9.1, 9.3
   * Simulates a full audit run using mock analyzers, ScoreEngine, and printSummary.
   */

  it('should produce correct scores from a full mock analyzer pipeline', async () => {
    const { calculateScore } = require('../score-engine');

    // Create mock results matching the 7 real categories (with one error)
    const mockResults = {};
    const mockAnalyzers = [
      { key: 'linting', score: 80 },
      { key: 'complexity', score: 70 },
      { key: 'duplication', score: 90 },
      { key: 'coverage', score: 60 },
      { key: 'security', score: 0, error: 'npm audit failed' },
      { key: 'dependencies', score: 50 },
      { key: 'style', score: 85 },
    ];

    for (const { key, score, error } of mockAnalyzers) {
      const analyzer = error
        ? { analyze: async () => { throw new Error(error); } }
        : { analyze: async () => ({ category: key, score, findings: [], error: null }) };
      mockResults[key] = await runAnalyzer(key, analyzer, {});
    }

    // Verify all 7 categories are present
    assert.strictEqual(Object.keys(mockResults).length, 7);

    // Verify the failed analyzer has score 0 and error
    assert.strictEqual(mockResults.security.score, 0);
    assert.strictEqual(mockResults.security.error, 'npm audit failed');

    // Feed into ScoreEngine
    const scoreResult = calculateScore(mockResults);

    assert.strictEqual(typeof scoreResult.totalScore, 'number');
    assert.ok(scoreResult.totalScore >= 0 && scoreResult.totalScore <= 100);
    assert.ok(['Kritisch', 'Verbesserungsbedürftig', 'Gut', 'Sehr gut'].includes(scoreResult.rating));
    assert.strictEqual(Object.keys(scoreResult.categoryScores).length, 6); // 6 weighted categories

    // Verify printSummary doesn't throw with the result
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    printSummary(scoreResult);
    console.log = originalLog;

    const output = logs.join('\n');
    assert.ok(output.includes(`${scoreResult.totalScore}/100`));
    assert.ok(output.includes(scoreResult.rating));
  });
});
