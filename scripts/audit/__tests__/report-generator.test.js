'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  sortFindings,
  calculateQuickWins,
  collectFindings,
  buildJsonReport,
  buildMarkdownReport,
  generateNextSteps,
  SEVERITY_ORDER,
  EFFORT_LABELS,
  SEVERITY_LABELS
} = require('../report-generator');

/**
 * Unit-Tests für den ReportGenerator.
 *
 * Validates: Requirements 10.1, 10.3
 */

// --- Helper factories ---

function makeFinding(overrides = {}) {
  return {
    file: 'app/test.js',
    line: 1,
    message: 'Test finding',
    severity: 'medium',
    effort: 'small',
    suggestion: null,
    ...overrides
  };
}

function makeCategoryResult(category, overrides = {}) {
  return {
    category,
    score: 80,
    findings: [],
    metadata: {},
    error: null,
    ...overrides
  };
}

function makeScoreResult(overrides = {}) {
  return {
    totalScore: 72,
    categoryScores: { linting: 80, complexity: 70, coverage: 60, security: 90, dependencies: 50, style: 65 },
    rating: 'Gut',
    timestamp: '2025-01-15T10:30:00.000Z',
    ...overrides
  };
}

// --- sortFindings ---

describe('sortFindings', () => {
  it('should sort critical before high before medium before low', () => {
    const findings = [
      makeFinding({ severity: 'low', category: 'linting' }),
      makeFinding({ severity: 'critical', category: 'linting' }),
      makeFinding({ severity: 'medium', category: 'linting' }),
      makeFinding({ severity: 'high', category: 'linting' })
    ];

    const sorted = sortFindings(findings);

    assert.strictEqual(sorted[0].severity, 'critical');
    assert.strictEqual(sorted[1].severity, 'high');
    assert.strictEqual(sorted[2].severity, 'medium');
    assert.strictEqual(sorted[3].severity, 'low');
  });

  it('should prioritize security findings within same severity', () => {
    const findings = [
      makeFinding({ severity: 'high', category: 'linting', message: 'lint issue' }),
      makeFinding({ severity: 'high', category: 'security', message: 'security issue' }),
      makeFinding({ severity: 'high', category: 'complexity', message: 'complexity issue' })
    ];

    const sorted = sortFindings(findings);

    assert.strictEqual(sorted[0].category, 'security');
    assert.strictEqual(sorted[0].message, 'security issue');
    // Non-security findings come after
    assert.notStrictEqual(sorted[1].category, 'security');
    assert.notStrictEqual(sorted[2].category, 'security');
  });

  it('should not mutate the original array', () => {
    const findings = [
      makeFinding({ severity: 'low', category: 'linting' }),
      makeFinding({ severity: 'critical', category: 'linting' })
    ];

    const sorted = sortFindings(findings);

    assert.notStrictEqual(sorted, findings);
    assert.strictEqual(findings[0].severity, 'low');
  });

  it('should return empty array for empty input', () => {
    assert.deepStrictEqual(sortFindings([]), []);
  });
});


// --- calculateQuickWins ---

describe('calculateQuickWins', () => {
  it('should return max 10 findings with effort small', () => {
    const findings = Array.from({ length: 15 }, (_, i) =>
      makeFinding({ effort: 'small', category: 'linting', message: `issue ${i}` })
    );

    const quickWins = calculateQuickWins(findings);

    assert.strictEqual(quickWins.length, 10);
    assert.ok(quickWins.every(f => f.effort === 'small'));
  });

  it('should prioritize critical/high severity', () => {
    const findings = [
      makeFinding({ severity: 'low', effort: 'small', category: 'linting', message: 'low' }),
      makeFinding({ severity: 'critical', effort: 'small', category: 'linting', message: 'critical' }),
      makeFinding({ severity: 'medium', effort: 'small', category: 'linting', message: 'medium' }),
      makeFinding({ severity: 'high', effort: 'small', category: 'linting', message: 'high' })
    ];

    const quickWins = calculateQuickWins(findings);

    assert.strictEqual(quickWins[0].severity, 'critical');
    assert.strictEqual(quickWins[1].severity, 'high');
    assert.strictEqual(quickWins[2].severity, 'medium');
    assert.strictEqual(quickWins[3].severity, 'low');
  });

  it('should exclude findings with medium or large effort', () => {
    const findings = [
      makeFinding({ effort: 'small', category: 'linting' }),
      makeFinding({ effort: 'medium', category: 'linting' }),
      makeFinding({ effort: 'large', category: 'linting' })
    ];

    const quickWins = calculateQuickWins(findings);

    assert.strictEqual(quickWins.length, 1);
    assert.strictEqual(quickWins[0].effort, 'small');
  });

  it('should return empty array when no small-effort findings exist', () => {
    const findings = [
      makeFinding({ effort: 'large', category: 'linting' }),
      makeFinding({ effort: 'medium', category: 'linting' })
    ];

    assert.deepStrictEqual(calculateQuickWins(findings), []);
  });
});

// --- collectFindings ---

describe('collectFindings', () => {
  it('should tag findings with their category', () => {
    const categoryResults = {
      linting: makeCategoryResult('linting', {
        findings: [makeFinding({ message: 'lint issue' })]
      }),
      security: makeCategoryResult('security', {
        findings: [makeFinding({ message: 'sec issue' })]
      })
    };

    const collected = collectFindings(categoryResults);

    assert.strictEqual(collected.length, 2);
    assert.strictEqual(collected[0].category, 'linting');
    assert.strictEqual(collected[1].category, 'security');
  });

  it('should skip categories with no findings array', () => {
    const categoryResults = {
      linting: makeCategoryResult('linting', { findings: null }),
      security: makeCategoryResult('security', {
        findings: [makeFinding({ message: 'sec issue' })]
      })
    };

    const collected = collectFindings(categoryResults);

    assert.strictEqual(collected.length, 1);
    assert.strictEqual(collected[0].category, 'security');
  });

  it('should return empty array for empty category results', () => {
    assert.deepStrictEqual(collectFindings({}), []);
  });
});


// --- buildJsonReport ---

describe('buildJsonReport', () => {
  it('should include totalScore, rating, findings, quickWins, and timestamp', () => {
    const scoreResult = makeScoreResult();
    const categoryResults = {
      linting: makeCategoryResult('linting', {
        findings: [makeFinding({ severity: 'high', effort: 'small' })]
      }),
      security: makeCategoryResult('security', {
        findings: [makeFinding({ severity: 'critical', effort: 'small' })]
      })
    };

    const report = buildJsonReport(scoreResult, categoryResults);

    assert.strictEqual(report.totalScore, 72);
    assert.strictEqual(report.rating, 'Gut');
    assert.strictEqual(report.timestamp, '2025-01-15T10:30:00.000Z');
    assert.ok(Array.isArray(report.findings));
    assert.ok(Array.isArray(report.quickWins));
    assert.ok(report.categoryScores !== undefined);
  });

  it('should have findings sorted by severity', () => {
    const scoreResult = makeScoreResult();
    const categoryResults = {
      linting: makeCategoryResult('linting', {
        findings: [
          makeFinding({ severity: 'low' }),
          makeFinding({ severity: 'critical' })
        ]
      })
    };

    const report = buildJsonReport(scoreResult, categoryResults);

    assert.strictEqual(report.findings[0].severity, 'critical');
    assert.strictEqual(report.findings[1].severity, 'low');
  });

  it('should compute quickWins from small-effort findings', () => {
    const scoreResult = makeScoreResult();
    const categoryResults = {
      linting: makeCategoryResult('linting', {
        findings: [
          makeFinding({ effort: 'small', severity: 'high' }),
          makeFinding({ effort: 'large', severity: 'critical' })
        ]
      })
    };

    const report = buildJsonReport(scoreResult, categoryResults);

    assert.strictEqual(report.quickWins.length, 1);
    assert.strictEqual(report.quickWins[0].effort, 'small');
  });
});

// --- buildMarkdownReport ---

describe('buildMarkdownReport', () => {
  it('should include section headers and severity groups', () => {
    const scoreResult = makeScoreResult();
    const categoryResults = {
      linting: makeCategoryResult('linting', {
        findings: [
          makeFinding({ severity: 'critical', message: 'critical lint' }),
          makeFinding({ severity: 'low', message: 'low lint' })
        ]
      })
    };

    const md = buildMarkdownReport(scoreResult, categoryResults);

    // Main header
    assert.ok(md.includes('# Code-Qualitätsbericht'));
    // Score line
    assert.ok(md.includes('Gesamt-Score: 72/100'));
    assert.ok(md.includes('Gut'));
    // Section headers
    assert.ok(md.includes('## Kategorie-Scores'));
    assert.ok(md.includes('## Alle Befunde'));
    assert.ok(md.includes('## Top-10 Quick Wins'));
    assert.ok(md.includes('## Nächste Schritte'));
    // Severity group headers
    assert.ok(md.includes('### Kritisch (1)'));
    assert.ok(md.includes('### Niedrig (1)'));
  });

  it('should include timestamp', () => {
    const scoreResult = makeScoreResult();
    const categoryResults = {};

    const md = buildMarkdownReport(scoreResult, categoryResults);

    assert.ok(md.includes('2025-01-15T10:30:00.000Z'));
  });

  it('should show "Keine Befunde" when there are no findings', () => {
    const scoreResult = makeScoreResult();
    const categoryResults = {
      linting: makeCategoryResult('linting', { findings: [] })
    };

    const md = buildMarkdownReport(scoreResult, categoryResults);

    assert.ok(md.includes('Keine Befunde gefunden.'));
  });

  it('should include effort labels for findings', () => {
    const scoreResult = makeScoreResult();
    const categoryResults = {
      linting: makeCategoryResult('linting', {
        findings: [makeFinding({ severity: 'high', effort: 'small' })]
      })
    };

    const md = buildMarkdownReport(scoreResult, categoryResults);

    assert.ok(md.includes('Klein (<1h)'));
  });

  it('should include suggestion when present', () => {
    const scoreResult = makeScoreResult();
    const categoryResults = {
      linting: makeCategoryResult('linting', {
        findings: [makeFinding({ severity: 'high', suggestion: 'Fix this now' })]
      })
    };

    const md = buildMarkdownReport(scoreResult, categoryResults);

    assert.ok(md.includes('Vorschlag: Fix this now'));
  });
});

// --- generateNextSteps ---

describe('generateNextSteps', () => {
  it('should return steps for all provided categories', () => {
    const categoryResults = {
      linting: makeCategoryResult('linting'),
      security: makeCategoryResult('security'),
      complexity: makeCategoryResult('complexity')
    };

    const steps = generateNextSteps(categoryResults);

    assert.ok('linting' in steps);
    assert.ok('security' in steps);
    assert.ok('complexity' in steps);
    assert.ok(Array.isArray(steps.linting));
    assert.ok(Array.isArray(steps.security));
    assert.ok(Array.isArray(steps.complexity));
    assert.ok(steps.linting.length > 0);
    assert.ok(steps.security.length > 0);
    assert.ok(steps.complexity.length > 0);
  });

  it('should provide a fallback for unknown categories', () => {
    const categoryResults = {
      unknownCategory: makeCategoryResult('unknownCategory')
    };

    const steps = generateNextSteps(categoryResults);

    assert.ok('unknownCategory' in steps);
    assert.ok(steps.unknownCategory.length > 0);
  });

  it('should return steps for all 7 known categories', () => {
    const allCategories = ['linting', 'complexity', 'duplication', 'coverage', 'security', 'dependencies', 'style'];
    const categoryResults = {};
    for (const cat of allCategories) {
      categoryResults[cat] = makeCategoryResult(cat);
    }

    const steps = generateNextSteps(categoryResults);

    for (const cat of allCategories) {
      assert.ok(cat in steps, `Missing steps for ${cat}`);
      assert.ok(steps[cat].length > 0, `Empty steps for ${cat}`);
    }
  });
});

// --- Constants ---

describe('SEVERITY_ORDER', () => {
  it('should define correct ordering: critical=0, high=1, medium=2, low=3', () => {
    assert.strictEqual(SEVERITY_ORDER.critical, 0);
    assert.strictEqual(SEVERITY_ORDER.high, 1);
    assert.strictEqual(SEVERITY_ORDER.medium, 2);
    assert.strictEqual(SEVERITY_ORDER.low, 3);
  });
});

describe('EFFORT_LABELS', () => {
  it('should have German labels for all effort levels', () => {
    assert.ok(EFFORT_LABELS.small.includes('<1h'));
    assert.ok(EFFORT_LABELS.medium.includes('1–4h'));
    assert.ok(EFFORT_LABELS.large.includes('>4h'));
  });
});

describe('SEVERITY_LABELS', () => {
  it('should have German labels for all severity levels', () => {
    assert.strictEqual(SEVERITY_LABELS.critical, 'Kritisch');
    assert.strictEqual(SEVERITY_LABELS.high, 'Hoch');
    assert.strictEqual(SEVERITY_LABELS.medium, 'Mittel');
    assert.strictEqual(SEVERITY_LABELS.low, 'Niedrig');
  });
});
