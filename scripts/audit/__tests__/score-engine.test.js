'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { calculateScore, getRating } = require('../score-engine');

/**
 * Unit-Tests für die ScoreEngine.
 *
 * Validates: Requirements 8.1, 8.2, 8.6, 8.7, 8.8, 8.9
 */

// --- getRating ---

describe('getRating', () => {
  it('should return "Sehr gut" for score >= 85', () => {
    assert.strictEqual(getRating(85), 'Sehr gut');
    assert.strictEqual(getRating(100), 'Sehr gut');
    assert.strictEqual(getRating(99.5), 'Sehr gut');
  });

  it('should return "Gut" for score 70–84', () => {
    assert.strictEqual(getRating(70), 'Gut');
    assert.strictEqual(getRating(84), 'Gut');
    assert.strictEqual(getRating(84.9), 'Gut');
  });

  it('should return "Verbesserungsbedürftig" for score 50–69', () => {
    assert.strictEqual(getRating(50), 'Verbesserungsbedürftig');
    assert.strictEqual(getRating(69), 'Verbesserungsbedürftig');
    assert.strictEqual(getRating(69.9), 'Verbesserungsbedürftig');
  });

  it('should return "Kritisch" for score < 50', () => {
    assert.strictEqual(getRating(49), 'Kritisch');
    assert.strictEqual(getRating(0), 'Kritisch');
    assert.strictEqual(getRating(49.9), 'Kritisch');
  });
});

// --- calculateScore – weighted calculation ---

describe('calculateScore', () => {
  it('should return totalScore 100 and rating "Sehr gut" when all categories score 100', () => {
    const results = {
      linting:      { category: 'linting',      score: 100, findings: [], error: null },
      complexity:   { category: 'complexity',    score: 100, findings: [], error: null },
      coverage:     { category: 'coverage',      score: 100, findings: [], error: null },
      security:     { category: 'security',      score: 100, findings: [], error: null },
      dependencies: { category: 'dependencies',  score: 100, findings: [], error: null },
      style:        { category: 'style',         score: 100, findings: [], error: null }
    };

    const result = calculateScore(results);

    assert.strictEqual(result.totalScore, 100);
    assert.strictEqual(result.rating, 'Sehr gut');
  });

  it('should return totalScore 0 and rating "Kritisch" when all categories score 0', () => {
    const results = {
      linting:      { category: 'linting',      score: 0, findings: [], error: null },
      complexity:   { category: 'complexity',    score: 0, findings: [], error: null },
      coverage:     { category: 'coverage',      score: 0, findings: [], error: null },
      security:     { category: 'security',      score: 0, findings: [], error: null },
      dependencies: { category: 'dependencies',  score: 0, findings: [], error: null },
      style:        { category: 'style',         score: 0, findings: [], error: null }
    };

    const result = calculateScore(results);

    assert.strictEqual(result.totalScore, 0);
    assert.strictEqual(result.rating, 'Kritisch');
  });

  it('should compute correct weighted totalScore with mixed values', () => {
    // linting:80*0.20=16, complexity:60*0.20=12, coverage:90*0.20=18,
    // security:70*0.15=10.5, dependencies:50*0.10=5, style:40*0.15=6
    // total = 67.5 → rounded = 68
    const results = {
      linting:      { category: 'linting',      score: 80, findings: [], error: null },
      complexity:   { category: 'complexity',    score: 60, findings: [], error: null },
      coverage:     { category: 'coverage',      score: 90, findings: [], error: null },
      security:     { category: 'security',      score: 70, findings: [], error: null },
      dependencies: { category: 'dependencies',  score: 50, findings: [], error: null },
      style:        { category: 'style',         score: 40, findings: [], error: null }
    };

    const result = calculateScore(results);

    assert.strictEqual(result.totalScore, 68);
    assert.strictEqual(result.rating, 'Verbesserungsbedürftig');
  });

  it('should default missing categories to score 0', () => {
    // Only linting provided: 75*0.20=15, rest 0 → total = 15
    const results = {
      linting: { category: 'linting', score: 75, findings: [], error: null }
    };

    const result = calculateScore(results);

    assert.strictEqual(result.totalScore, 15);
    assert.strictEqual(result.rating, 'Kritisch');
  });

  it('should default to score 0 when results is empty', () => {
    const result = calculateScore({});

    assert.strictEqual(result.totalScore, 0);
    assert.strictEqual(result.rating, 'Kritisch');
  });

  it('should include all 6 categories in categoryScores', () => {
    const results = {
      linting:      { category: 'linting',      score: 50, findings: [], error: null },
      complexity:   { category: 'complexity',    score: 60, findings: [], error: null },
      coverage:     { category: 'coverage',      score: 70, findings: [], error: null },
      security:     { category: 'security',      score: 80, findings: [], error: null },
      dependencies: { category: 'dependencies',  score: 90, findings: [], error: null },
      style:        { category: 'style',         score: 100, findings: [], error: null }
    };

    const result = calculateScore(results);
    const keys = Object.keys(result.categoryScores);

    assert.deepStrictEqual(keys.sort(), [
      'complexity', 'coverage', 'dependencies', 'linting', 'security', 'style'
    ]);
    assert.strictEqual(result.categoryScores.linting, 50);
    assert.strictEqual(result.categoryScores.complexity, 60);
    assert.strictEqual(result.categoryScores.coverage, 70);
    assert.strictEqual(result.categoryScores.security, 80);
    assert.strictEqual(result.categoryScores.dependencies, 90);
    assert.strictEqual(result.categoryScores.style, 100);
  });

  it('should include a valid ISO-8601 timestamp', () => {
    const before = new Date().toISOString();
    const result = calculateScore({});
    const after = new Date().toISOString();

    assert.strictEqual(typeof result.timestamp, 'string');
    // Verify it parses as a valid date
    const ts = new Date(result.timestamp);
    assert.ok(!isNaN(ts.getTime()), 'timestamp should be a valid date');
    // Verify it's within the test window
    assert.ok(result.timestamp >= before, 'timestamp should be >= test start');
    assert.ok(result.timestamp <= after, 'timestamp should be <= test end');
  });

  it('should set missing category scores to 0 in categoryScores output', () => {
    // Provide only 2 categories
    const results = {
      linting:  { category: 'linting',  score: 100, findings: [], error: null },
      security: { category: 'security', score: 100, findings: [], error: null }
    };

    const result = calculateScore(results);

    assert.strictEqual(result.categoryScores.linting, 100);
    assert.strictEqual(result.categoryScores.security, 100);
    assert.strictEqual(result.categoryScores.complexity, 0);
    assert.strictEqual(result.categoryScores.coverage, 0);
    assert.strictEqual(result.categoryScores.dependencies, 0);
    assert.strictEqual(result.categoryScores.style, 0);
  });

  it('should use getRating based on the unrounded totalScore', () => {
    // Construct a case where unrounded is 84.5 → rounds to 85
    // but getRating should use the unrounded value (84.5 → "Gut")
    // linting:100*0.20=20, complexity:100*0.20=20, coverage:100*0.20=20,
    // security:100*0.15=15, dependencies:95*0.10=9.5, style:0*0.15=0
    // total = 84.5 → rounded = 85, but rating based on 84.5 → "Gut"
    const results = {
      linting:      { category: 'linting',      score: 100, findings: [], error: null },
      complexity:   { category: 'complexity',    score: 100, findings: [], error: null },
      coverage:     { category: 'coverage',      score: 100, findings: [], error: null },
      security:     { category: 'security',      score: 100, findings: [], error: null },
      dependencies: { category: 'dependencies',  score: 95,  findings: [], error: null },
      style:        { category: 'style',         score: 0,   findings: [], error: null }
    };

    const result = calculateScore(results);

    assert.strictEqual(result.totalScore, 85);
    // Rating is based on the unrounded 84.5, so it should be "Gut"
    assert.strictEqual(result.rating, 'Gut');
  });
});
