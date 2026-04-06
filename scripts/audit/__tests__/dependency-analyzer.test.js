'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  calculateScore,
  analyzeOutdated,
  checkDeprecated,
  KNOWN_DEPRECATED
} = require('../dependency-analyzer');

/**
 * Unit-Tests für den DependencyAnalyzer.
 *
 * Validates: Requirements 6.1, 6.3
 */

// --- calculateScore ---

describe('calculateScore', () => {
  it('should return 100 when there are no findings', () => {
    assert.strictEqual(calculateScore([]), 100);
  });

  it('should deduct 20 points per critical finding', () => {
    const findings = [
      { file: 'package.json', message: 'critical issue', severity: 'critical', effort: 'large' }
    ];
    assert.strictEqual(calculateScore(findings), 80);
  });

  it('should deduct 10 points per high finding', () => {
    const findings = [
      { file: 'package.json', message: 'high issue', severity: 'high', effort: 'medium' }
    ];
    assert.strictEqual(calculateScore(findings), 90);
  });

  it('should deduct 5 points per medium finding', () => {
    const findings = [
      { file: 'package.json', message: 'medium issue', severity: 'medium', effort: 'small' }
    ];
    assert.strictEqual(calculateScore(findings), 95);
  });

  it('should deduct 2 points per low finding', () => {
    const findings = [
      { file: 'package.json', message: 'low issue', severity: 'low', effort: 'small' }
    ];
    assert.strictEqual(calculateScore(findings), 98);
  });

  it('should combine deductions from mixed severities', () => {
    const findings = [
      { file: 'a.json', message: 'c', severity: 'critical', effort: 'large' },
      { file: 'a.json', message: 'h', severity: 'high', effort: 'medium' },
      { file: 'a.json', message: 'm', severity: 'medium', effort: 'small' },
      { file: 'a.json', message: 'l', severity: 'low', effort: 'small' }
    ];
    // 100 - 20 - 10 - 5 - 2 = 63
    assert.strictEqual(calculateScore(findings), 63);
  });

  it('should clamp to 0 when deductions exceed 100', () => {
    // 6 critical findings = 6 * 20 = 120 deduction → clamped to 0
    const findings = Array.from({ length: 6 }, (_, i) => ({
      file: 'package.json',
      message: `critical ${i}`,
      severity: 'critical',
      effort: 'large'
    }));
    assert.strictEqual(calculateScore(findings), 0);
  });

  it('should ignore findings with unknown severity', () => {
    const findings = [
      { file: 'package.json', message: 'unknown', severity: 'unknown', effort: 'small' }
    ];
    assert.strictEqual(calculateScore(findings), 100);
  });
});


// --- analyzeOutdated ---

describe('analyzeOutdated', () => {
  it('should return no findings for empty outdated data', () => {
    const result = analyzeOutdated({}, 'Backend', 'package.json');
    assert.strictEqual(result.findings.length, 0);
    assert.strictEqual(result.outdatedCount, 0);
    assert.strictEqual(result.totalCount, 0);
  });

  it('should produce findings for outdated packages', () => {
    const outdatedData = {
      express: { current: '4.17.1', wanted: '4.18.2', latest: '4.18.2' },
      lodash: { current: '4.17.15', wanted: '4.17.21', latest: '4.17.21' }
    };
    const result = analyzeOutdated(outdatedData, 'Backend', 'package.json');

    assert.strictEqual(result.findings.length, 2);
    assert.strictEqual(result.outdatedCount, 2);
    assert.strictEqual(result.totalCount, 2);
  });

  it('should assign medium severity when latest equals wanted', () => {
    const outdatedData = {
      express: { current: '4.17.1', wanted: '4.18.2', latest: '4.18.2' }
    };
    const result = analyzeOutdated(outdatedData, 'Backend', 'package.json');
    assert.strictEqual(result.findings[0].severity, 'medium');
  });

  it('should assign high severity when latest differs from wanted (major behind)', () => {
    const outdatedData = {
      express: { current: '3.0.0', wanted: '3.5.0', latest: '4.18.2' }
    };
    const result = analyzeOutdated(outdatedData, 'Backend', 'package.json');
    assert.strictEqual(result.findings[0].severity, 'high');
  });

  it('should include context and package name in finding message', () => {
    const outdatedData = {
      axios: { current: '0.21.0', wanted: '0.21.4', latest: '1.6.0' }
    };
    const result = analyzeOutdated(outdatedData, 'Frontend', 'ui-react/package.json');
    const msg = result.findings[0].message;
    assert.ok(msg.includes('Frontend'), 'Message should include context');
    assert.ok(msg.includes('axios'), 'Message should include package name');
  });

  it('should set file to the provided packageJsonRelative', () => {
    const outdatedData = {
      chalk: { current: '4.0.0', wanted: '4.1.2', latest: '5.3.0' }
    };
    const result = analyzeOutdated(outdatedData, 'Backend', 'ui-react/package.json');
    assert.strictEqual(result.findings[0].file, 'ui-react/package.json');
  });

  it('should include a suggestion with npm update/install command', () => {
    const outdatedData = {
      chalk: { current: '4.0.0', wanted: '4.1.2', latest: '5.3.0' }
    };
    const result = analyzeOutdated(outdatedData, 'Backend', 'package.json');
    assert.ok(result.findings[0].suggestion.includes('npm'));
  });
});

// --- checkDeprecated ---

describe('checkDeprecated', () => {
  it('should return no findings when no deprecated packages are present', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dep-test-'));
    const pkg = {
      dependencies: { express: '^4.18.0', lodash: '^4.17.21' }
    };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg));

    const findings = checkDeprecated(tmpDir, 'package.json');
    assert.strictEqual(findings.length, 0);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return no findings when package.json does not exist', () => {
    const findings = checkDeprecated('/non/existent/path', 'package.json');
    assert.strictEqual(findings.length, 0);
  });
});

// --- KNOWN_DEPRECATED ---

describe('KNOWN_DEPRECATED', () => {
  it('should be an empty object after EWS removal', () => {
    assert.deepStrictEqual(KNOWN_DEPRECATED, {});
  });
});
