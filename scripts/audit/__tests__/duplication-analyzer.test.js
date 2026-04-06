'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const {
  calculateScore,
  countDuplicateLines,
  clonesToFindings,
  findCrossModuleDuplicates,
  analyze
} = require('../duplication-analyzer');

/**
 * Unit-Tests für den DuplicationAnalyzer.
 *
 * Validates: Requirements 3.1
 */

// ---------------------------------------------------------------------------
// Helper: erzeugt ein Mock-Clone-Objekt im jscpd-Format
// ---------------------------------------------------------------------------
function mockClone(fileA, startA, endA, fileB, startB, endB, fragment) {
  return {
    duplicationA: {
      sourceId: fileA,
      start: { line: startA },
      end: { line: endA },
      fragment: fragment || 'duplicated code block'
    },
    duplicationB: {
      sourceId: fileB,
      start: { line: startB },
      end: { line: endB },
      fragment: fragment || 'duplicated code block'
    }
  };
}

// ---------------------------------------------------------------------------
// calculateScore
// ---------------------------------------------------------------------------
describe('calculateScore', () => {
  it('should return 100 when duplication is 0%', () => {
    assert.strictEqual(calculateScore(0), 100);
  });

  it('should return 50 when duplication is 10%', () => {
    // 100 - (10 * 5) = 50
    assert.strictEqual(calculateScore(10), 50);
  });

  it('should return 75 when duplication is 5%', () => {
    // 100 - (5 * 5) = 75
    assert.strictEqual(calculateScore(5), 75);
  });

  it('should return 0 when duplication is 20%', () => {
    // 100 - (20 * 5) = 0
    assert.strictEqual(calculateScore(20), 0);
  });

  it('should clamp to 0 when duplication exceeds 20%', () => {
    // 100 - (30 * 5) = -50 → 0
    assert.strictEqual(calculateScore(30), 0);
  });
});


// ---------------------------------------------------------------------------
// countDuplicateLines
// ---------------------------------------------------------------------------
describe('countDuplicateLines', () => {
  it('should return 0 for an empty clone list', () => {
    assert.strictEqual(countDuplicateLines([]), 0);
  });

  it('should count lines from duplicationA side only', () => {
    const clones = [
      mockClone('/a.js', 1, 10, '/b.js', 20, 29),  // 10 lines
      mockClone('/c.js', 5, 11, '/d.js', 50, 56)    // 7 lines
    ];
    // (10 - 1 + 1) + (11 - 5 + 1) = 10 + 7 = 17
    assert.strictEqual(countDuplicateLines(clones), 17);
  });
});

// ---------------------------------------------------------------------------
// clonesToFindings
// ---------------------------------------------------------------------------
describe('clonesToFindings', () => {
  const rootDir = '/project';

  it('should produce one finding per clone', () => {
    const clones = [
      mockClone('/project/app/a.js', 1, 10, '/project/app/b.js', 20, 29)
    ];
    const findings = clonesToFindings(clones, rootDir, 'Backend');
    assert.strictEqual(findings.length, 1);
  });

  it('should set severity to medium for clones <= 20 lines', () => {
    const clones = [
      mockClone('/project/app/a.js', 1, 15, '/project/app/b.js', 1, 15) // 15 lines
    ];
    const findings = clonesToFindings(clones, rootDir, 'Backend');
    assert.strictEqual(findings[0].severity, 'medium');
    assert.strictEqual(findings[0].effort, 'small');
  });

  it('should set severity to high for clones > 20 lines', () => {
    const clones = [
      mockClone('/project/app/a.js', 1, 25, '/project/app/b.js', 1, 25) // 25 lines
    ];
    const findings = clonesToFindings(clones, rootDir, 'Backend');
    assert.strictEqual(findings[0].severity, 'high');
    assert.strictEqual(findings[0].effort, 'medium');
  });

  it('should include area label and relative paths in message', () => {
    const clones = [
      mockClone('/project/app/a.js', 5, 10, '/project/app/b.js', 20, 25)
    ];
    const findings = clonesToFindings(clones, rootDir, 'Frontend');
    assert.ok(findings[0].message.includes('Frontend'));
    assert.ok(findings[0].message.includes('app/a.js'));
    assert.ok(findings[0].message.includes('app/b.js'));
  });
});

// ---------------------------------------------------------------------------
// findCrossModuleDuplicates
// ---------------------------------------------------------------------------
describe('findCrossModuleDuplicates', () => {
  const rootDir = '/project';

  it('should identify duplicates between routes.js and socket-controller.js', () => {
    const clones = [
      mockClone(
        '/project/app/routes.js', 10, 30,
        '/project/app/socket-controller.js', 50, 70,
        'function graphFetch() { ... }'
      )
    ];
    const findings = findCrossModuleDuplicates(clones, rootDir);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].severity, 'high');
    assert.ok(findings[0].message.includes('routes.js'));
    assert.ok(findings[0].message.includes('socket-controller.js'));
  });

  it('should ignore clones that do not involve the target pair', () => {
    const clones = [
      mockClone('/project/app/a.js', 1, 10, '/project/app/b.js', 1, 10)
    ];
    const findings = findCrossModuleDuplicates(clones, rootDir);
    assert.strictEqual(findings.length, 0);
  });

  it('should detect pair regardless of order (A↔B or B↔A)', () => {
    const clones = [
      mockClone(
        '/project/app/socket-controller.js', 10, 20,
        '/project/app/routes.js', 30, 40
      )
    ];
    const findings = findCrossModuleDuplicates(clones, rootDir);
    assert.strictEqual(findings.length, 1);
  });
});

// ---------------------------------------------------------------------------
// analyze – error tolerance
// ---------------------------------------------------------------------------
describe('analyze – error tolerance', () => {
  it('should return a valid CategoryResult with error when config is invalid', async () => {
    const badConfig = {
      fix: false,
      verbose: false,
      rootDir: '/non/existent/path',
      paths: {
        backend: ['**/*.js'],
        frontend: ['src/**/*.js']
      },
      thresholds: {
        minDuplicateLines: 6
      }
    };

    const result = await analyze(badConfig);

    assert.strictEqual(result.category, 'duplication');
    assert.strictEqual(typeof result.score, 'number');
    assert.ok(Array.isArray(result.findings));
    assert.ok('error' in result, 'Missing error field');
  });
});
