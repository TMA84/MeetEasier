'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  checkEditorConfigConformity,
  checkJSDocComments,
  calculateScore,
  toKebabCase,
  checkFileNaming,
  expandBraces,
  parseEditorConfig
} = require('../style-analyzer');

/**
 * Unit-Tests für den StyleAnalyzer.
 *
 * Validates: Requirements 7.1, 7.3, 7.5
 */

/** Helper: creates a temp directory with files for testing. */
function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'style-analyzer-test-'));
}

function writeTempFile(dir, name, content) {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function cleanupDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// --- checkEditorConfigConformity ---

describe('checkEditorConfigConformity', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = createTempDir(); });
  afterEach(() => { cleanupDir(tmpDir); });

  it('should detect mixed tabs and spaces on the same line', () => {
    const filePath = writeTempFile(tmpDir, 'mixed.js', '\t const x = 1;\n');
    const rules = { indentStyle: null, indentSize: null, charset: null };

    const result = checkEditorConfigConformity(filePath, tmpDir, rules);

    assert.strictEqual(result.conforming, false);
    assert.ok(result.findings.length > 0, 'Expected at least one finding');
    assert.ok(
      result.findings[0].message.includes('Gemischte Tabs und Spaces'),
      `Unexpected message: ${result.findings[0].message}`
    );
  });

  it('should detect mixed tabs and spaces across the file', () => {
    // Line 1 uses tab, line 2 uses spaces — mixed across file
    const content = '\tconst a = 1;\n  const b = 2;\n';
    const filePath = writeTempFile(tmpDir, 'mixed-across.js', content);
    const rules = { indentStyle: null, indentSize: null, charset: null };

    const result = checkEditorConfigConformity(filePath, tmpDir, rules);

    assert.strictEqual(result.conforming, false);
    assert.ok(result.findings.length > 0);
    assert.ok(result.findings.some(f => f.message.includes('Gemischte Tabs und Spaces')));
  });

  it('should pass for a file using only spaces', () => {
    const content = '  const a = 1;\n  const b = 2;\n';
    const filePath = writeTempFile(tmpDir, 'spaces-only.js', content);
    const rules = { indentStyle: null, indentSize: null, charset: null };

    const result = checkEditorConfigConformity(filePath, tmpDir, rules);

    assert.strictEqual(result.conforming, true);
    assert.strictEqual(result.findings.length, 0);
  });

  it('should pass for a file using only tabs', () => {
    const content = '\tconst a = 1;\n\tconst b = 2;\n';
    const filePath = writeTempFile(tmpDir, 'tabs-only.js', content);
    const rules = { indentStyle: null, indentSize: null, charset: null };

    const result = checkEditorConfigConformity(filePath, tmpDir, rules);

    assert.strictEqual(result.conforming, true);
    assert.strictEqual(result.findings.length, 0);
  });

  it('should report when editorconfig expects spaces but file uses tabs', () => {
    const content = '\tconst a = 1;\n';
    const filePath = writeTempFile(tmpDir, 'tabs-bad.js', content);
    const rules = { indentStyle: 'space', indentSize: 2, charset: null };

    const result = checkEditorConfigConformity(filePath, tmpDir, rules);

    assert.strictEqual(result.conforming, false);
    assert.ok(result.findings.some(f => f.message.includes('editorconfig verlangt Spaces')));
  });

  it('should return conforming true for an empty file', () => {
    const filePath = writeTempFile(tmpDir, 'empty.js', '');
    const rules = { indentStyle: 'space', indentSize: 2, charset: null };

    const result = checkEditorConfigConformity(filePath, tmpDir, rules);

    assert.strictEqual(result.conforming, true);
    assert.strictEqual(result.findings.length, 0);
  });
});


// --- checkJSDocComments ---

describe('checkJSDocComments', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = createTempDir(); });
  afterEach(() => { cleanupDir(tmpDir); });

  it('should detect missing JSDoc on exported functions', () => {
    const content = `'use strict';

function helper() { return 1; }

module.exports = function doStuff() {
  return helper();
};
`;
    const filePath = writeTempFile(tmpDir, 'no-jsdoc.js', content);

    const result = checkJSDocComments(filePath, tmpDir);

    assert.ok(result.exportedCount > 0, 'Should detect at least one export');
    assert.strictEqual(result.documentedCount, 0);
    assert.ok(result.findings.length > 0);
    assert.ok(result.findings[0].message.includes('ohne JSDoc'));
  });

  it('should pass when JSDoc is present on exported functions', () => {
    const content = `'use strict';

/**
 * Does stuff.
 * @returns {number}
 */
module.exports = function doStuff() {
  return 42;
};
`;
    const filePath = writeTempFile(tmpDir, 'with-jsdoc.js', content);

    const result = checkJSDocComments(filePath, tmpDir);

    assert.strictEqual(result.exportedCount, 1);
    assert.strictEqual(result.documentedCount, 1);
    assert.strictEqual(result.findings.length, 0);
  });

  it('should detect missing JSDoc on named exports', () => {
    const content = `'use strict';

exports.foo = function foo() { return 1; };
exports.bar = function bar() { return 2; };
`;
    const filePath = writeTempFile(tmpDir, 'named-exports.js', content);

    const result = checkJSDocComments(filePath, tmpDir);

    assert.strictEqual(result.exportedCount, 2);
    assert.strictEqual(result.documentedCount, 0);
    assert.strictEqual(result.findings.length, 2);
  });

  it('should return zero counts for a file with no exports', () => {
    const content = `'use strict';

function internal() { return 1; }
const x = internal();
`;
    const filePath = writeTempFile(tmpDir, 'no-exports.js', content);

    const result = checkJSDocComments(filePath, tmpDir);

    assert.strictEqual(result.exportedCount, 0);
    assert.strictEqual(result.documentedCount, 0);
    assert.strictEqual(result.findings.length, 0);
  });

  it('should handle non-existent file gracefully', () => {
    const result = checkJSDocComments('/non/existent/file.js', tmpDir);

    assert.strictEqual(result.exportedCount, 0);
    assert.strictEqual(result.documentedCount, 0);
    assert.strictEqual(result.findings.length, 0);
  });
});

// --- calculateScore ---

describe('calculateScore', () => {
  it('should return 100 when all files conform and all exports documented', () => {
    const score = calculateScore(10, 10, 0, 5, 5);
    assert.strictEqual(score, 100);
  });

  it('should return a low score when nothing conforms', () => {
    // 0 conforming, many import findings, no jsdoc
    const score = calculateScore(10, 0, 10, 10, 0);
    // conformity: 0*0.5=0, import: max(0,100-150)*0.2=0, jsdoc: 0*0.3=0
    assert.strictEqual(score, 0);
  });

  it('should return 100 when there are no files', () => {
    const score = calculateScore(0, 0, 0, 0, 0);
    assert.strictEqual(score, 100);
  });

  it('should weight conformity at 50%, imports at 20%, jsdoc at 30%', () => {
    // 50% conforming, 0 import findings, 100% jsdoc
    // conformity: 0.5*100*0.5=25, import: 100*0.2=20, jsdoc: 1*100*0.3=30 => 75
    const score = calculateScore(10, 5, 0, 4, 4);
    assert.strictEqual(score, 75);
  });

  it('should deduct 15 points per import finding from import sub-score', () => {
    // All conforming, 2 import findings, all jsdoc
    // conformity: 50, import: (100-30)*0.2=14, jsdoc: 30 => 94
    const score = calculateScore(10, 10, 2, 5, 5);
    assert.strictEqual(score, 94);
  });

  it('should clamp score between 0 and 100', () => {
    const low = calculateScore(100, 0, 20, 100, 0);
    assert.ok(low >= 0, `Score ${low} should be >= 0`);
    assert.ok(low <= 100, `Score ${low} should be <= 100`);
  });

  it('should handle jsdocExported=0 as full jsdoc coverage', () => {
    // No exports means jsdocRatio = 1
    // conformity: 100*0.5=50, import: 100*0.2=20, jsdoc: 100*0.3=30 => 100
    const score = calculateScore(10, 10, 0, 0, 0);
    assert.strictEqual(score, 100);
  });
});

// --- toKebabCase ---

describe('toKebabCase', () => {
  it('should convert camelCase to kebab-case', () => {
    assert.strictEqual(toKebabCase('myComponent'), 'my-component');
  });

  it('should convert PascalCase to kebab-case', () => {
    assert.strictEqual(toKebabCase('MyComponent'), 'my-component');
  });

  it('should convert snake_case to kebab-case', () => {
    assert.strictEqual(toKebabCase('my_component'), 'my-component');
  });

  it('should leave already kebab-case unchanged', () => {
    assert.strictEqual(toKebabCase('my-component'), 'my-component');
  });

  it('should handle single word', () => {
    assert.strictEqual(toKebabCase('component'), 'component');
  });
});

// --- checkFileNaming ---

describe('checkFileNaming', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = createTempDir(); });
  afterEach(() => { cleanupDir(tmpDir); });

  it('should detect camelCase filenames', () => {
    const filePath = writeTempFile(tmpDir, 'myComponent.js', '');

    const result = checkFileNaming(filePath, tmpDir);

    assert.strictEqual(result.conforming, false);
    assert.ok(result.findings.length > 0);
    assert.ok(result.findings[0].message.includes('camelCase'));
  });

  it('should detect PascalCase filenames', () => {
    const filePath = writeTempFile(tmpDir, 'MyComponent.js', '');

    const result = checkFileNaming(filePath, tmpDir);

    assert.strictEqual(result.conforming, false);
    assert.ok(result.findings[0].message.includes('PascalCase'));
  });

  it('should accept kebab-case filenames', () => {
    const filePath = writeTempFile(tmpDir, 'my-component.js', '');

    const result = checkFileNaming(filePath, tmpDir);

    assert.strictEqual(result.conforming, true);
    assert.strictEqual(result.findings.length, 0);
  });

  it('should skip index files', () => {
    const filePath = writeTempFile(tmpDir, 'index.js', '');

    const result = checkFileNaming(filePath, tmpDir);

    assert.strictEqual(result.conforming, true);
    assert.strictEqual(result.findings.length, 0);
  });
});

// --- expandBraces ---

describe('expandBraces', () => {
  it('should expand brace patterns', () => {
    const result = expandBraces('src/**/*.{js,jsx}');
    assert.deepStrictEqual(result, ['src/**/*.js', 'src/**/*.jsx']);
  });

  it('should return pattern as-is when no braces', () => {
    const result = expandBraces('src/**/*.js');
    assert.deepStrictEqual(result, ['src/**/*.js']);
  });
});

// --- parseEditorConfig ---

describe('parseEditorConfig', () => {
  let tmpDir;

  beforeEach(() => { tmpDir = createTempDir(); });
  afterEach(() => { cleanupDir(tmpDir); });

  it('should parse indent_style and indent_size from .editorconfig', () => {
    const content = `root = true

[*]
indent_style = space
indent_size = 2
charset = utf-8
`;
    writeTempFile(tmpDir, '.editorconfig', content);

    const result = parseEditorConfig(tmpDir);

    assert.strictEqual(result.indentStyle, 'space');
    assert.strictEqual(result.indentSize, 2);
    assert.strictEqual(result.charset, 'utf-8');
  });

  it('should return nulls when no .editorconfig exists', () => {
    const result = parseEditorConfig(tmpDir);

    assert.strictEqual(result.indentStyle, null);
    assert.strictEqual(result.indentSize, null);
    assert.strictEqual(result.charset, null);
  });
});
