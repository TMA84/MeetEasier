'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { createDefaultConfig } = require('./config');

/**
 * @file StyleAnalyzer – Prüft Code-Stil und Konsistenz.
 *
 * - .editorconfig-Konformität (indent-style, indent-size, charset)
 * - Gemischte Tabs/Spaces erkennen
 * - Benennungskonventionen in Dateinamen prüfen
 * - Import-Muster-Konsistenz (CommonJS vs. ES-Module pro Verzeichnis)
 * - Fehlende JSDoc-Kommentare bei exportierten Funktionen
 * - Score basierend auf Anteil konformer Dateien
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

/**
 * Expandiert Glob-Muster mit geschweiften Klammern manuell.
 *
 * @param {string} pattern - Glob-Muster (z.B. "src/**\/*.{js,jsx}")
 * @returns {string[]} Expandierte Muster
 */
function expandBraces(pattern) {
  const braceMatch = pattern.match(/^(.*)\{([^}]+)\}(.*)$/);
  if (!braceMatch) {
    return [pattern];
  }
  const [, prefix, alternatives, suffix] = braceMatch;
  return alternatives.split(',').map(alt => `${prefix}${alt.trim()}${suffix}`);
}

/**
 * Sammelt alle JS-Dateien anhand der konfigurierten Glob-Muster.
 *
 * @param {import('./types').AuditConfig} config
 * @returns {string[]} Absolute Dateipfade
 */
function collectFiles(config) {
  const rawPatterns = [...config.paths.backend, ...config.paths.frontend];
  const files = new Set();

  for (const raw of rawPatterns) {
    const expanded = expandBraces(raw);
    for (const pattern of expanded) {
      const matches = globSync(pattern, { cwd: config.rootDir, absolute: true });
      for (const f of matches) {
        files.add(f);
      }
    }
  }

  return Array.from(files);
}


/**
 * Parst die .editorconfig-Datei und gibt die Regeln zurück.
 * Unterstützt Sektionen wie [*] und [*.{js,html,...}].
 *
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @returns {{ indentStyle: string|null, indentSize: number|null, charset: string|null }}
 */
function parseEditorConfig(rootDir) {
  const configPath = path.join(rootDir, '.editorconfig');
  const result = { indentStyle: null, indentSize: null, charset: null };

  if (!fs.existsSync(configPath)) {
    return result;
  }

  const content = fs.readFileSync(configPath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed === '' || trimmed.startsWith('[')) {
      continue;
    }
    const [key, ...valueParts] = trimmed.split('=');
    const k = key.trim().toLowerCase();
    const v = valueParts.join('=').trim().toLowerCase();

    if (k === 'indent_style') result.indentStyle = v;
    if (k === 'indent_size') result.indentSize = parseInt(v, 10) || null;
    if (k === 'charset') result.charset = v;
  }

  return result;
}

/**
 * Prüft eine Datei auf .editorconfig-Konformität und gemischte Tabs/Spaces.
 *
 * @param {string} filePath - Absoluter Dateipfad
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @param {{ indentStyle: string|null, indentSize: number|null, charset: string|null }} editorRules
 * @returns {{ findings: import('./types').Finding[], conforming: boolean }}
 */
function checkEditorConfigConformity(filePath, rootDir, editorRules) {
  const relativePath = path.relative(rootDir, filePath);
  /** @type {import('./types').Finding[]} */
  const findings = [];
  let conforming = true;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_err) {
    return { findings, conforming: true };
  }

  const lines = content.split('\n');
  let hasTabs = false;
  let hasSpaces = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const leadingWhitespace = line.match(/^(\s*)/)[1];
    if (leadingWhitespace.length === 0) continue;

    if (leadingWhitespace.includes('\t')) hasTabs = true;
    if (leadingWhitespace.includes(' ')) hasSpaces = true;

    // Check for mixed tabs and spaces on the same line
    if (leadingWhitespace.includes('\t') && leadingWhitespace.includes(' ')) {
      findings.push({
        file: relativePath,
        line: i + 1,
        message: 'Gemischte Tabs und Spaces in derselben Zeile',
        severity: 'low',
        effort: 'small',
        suggestion: 'Einheitlich Spaces oder Tabs verwenden'
      });
      conforming = false;
      break; // Report once per file
    }
  }

  // Check mixed indentation across the file
  if (hasTabs && hasSpaces && findings.length === 0) {
    findings.push({
      file: relativePath,
      message: 'Gemischte Tabs und Spaces in der Datei',
      severity: 'low',
      effort: 'small',
      suggestion: 'Einheitlich Spaces oder Tabs verwenden'
    });
    conforming = false;
  }

  // Check indent style conformity
  if (editorRules.indentStyle === 'space' && hasTabs) {
    findings.push({
      file: relativePath,
      message: `.editorconfig verlangt Spaces, aber Tabs gefunden`,
      severity: 'low',
      effort: 'small',
      suggestion: 'Tabs durch Spaces ersetzen (indent_style = space)'
    });
    conforming = false;
  } else if (editorRules.indentStyle === 'tab' && hasSpaces && !hasTabs) {
    findings.push({
      file: relativePath,
      message: `.editorconfig verlangt Tabs, aber nur Spaces gefunden`,
      severity: 'low',
      effort: 'small',
      suggestion: 'Spaces durch Tabs ersetzen (indent_style = tab)'
    });
    conforming = false;
  }

  // Check indent size conformity (only for space indentation)
  if (editorRules.indentStyle === 'space' && editorRules.indentSize && !hasTabs) {
    const expectedSize = editorRules.indentSize;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const leadingSpaces = line.match(/^( *)/)[1].length;
      if (leadingSpaces > 0 && leadingSpaces % expectedSize !== 0) {
        // Skip JSDoc comment lines (e.g. " * @param") – 1-space indent before * is standard
        const trimmedLine = line.trimStart();
        if (trimmedLine.startsWith('*') || trimmedLine.startsWith('/**') || trimmedLine.startsWith('*/')) {
          continue;
        }
        findings.push({
          file: relativePath,
          line: i + 1,
          message: `Einrückung von ${leadingSpaces} Spaces entspricht nicht indent_size=${expectedSize}`,
          severity: 'low',
          effort: 'small',
          suggestion: `Einrückung auf Vielfache von ${expectedSize} Spaces anpassen`
        });
        conforming = false;
        break; // Report once per file
      }
    }
  }

  return { findings, conforming };
}


/**
 * Prüft ob eine Datei eine React-Komponente ist (PascalCase erlaubt).
 * React-Komponenten in components/ und layouts/ Verzeichnissen dürfen PascalCase verwenden.
 *
 * @param {string} relativePath - Relativer Dateipfad
 * @param {string} ext - Dateiendung (z.B. '.js', '.jsx')
 * @returns {boolean} true wenn PascalCase erlaubt ist
 */
function isReactComponentFile(relativePath, ext) {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  const isJsFile = ext === '.js' || ext === '.jsx';
  if (!isJsFile) return false;

  // Allow PascalCase in React component and layout directories
  const reactDirs = ['ui-react/src/components/', 'ui-react/src/layouts/'];
  return reactDirs.some(dir => normalizedPath.startsWith(dir));
}

/**
 * Prüft ob eine Datei eine Test-Datei ist.
 *
 * @param {string} basename - Dateiname ohne Endung
 * @param {string} ext - Dateiendung
 * @returns {boolean} true wenn es eine Test-Datei ist
 */
function isTestFile(basename, ext) {
  return /\.(test|spec)$/.test(basename) ||
    ext === '.test.js' || ext === '.test.jsx' ||
    ext === '.spec.js' || ext === '.spec.jsx';
}

/**
 * Prüft Benennungskonventionen in Dateinamen.
 * Erwartet kebab-case für Dateien (z.B. my-component.js).
 * Meldet camelCase, snake_case oder PascalCase als inkonsistent.
 * Erlaubt PascalCase für React-Komponenten und Test-Dateien.
 *
 * @param {string} filePath - Absoluter Dateipfad
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @returns {{ findings: import('./types').Finding[], conforming: boolean }}
 */
function checkFileNaming(filePath, rootDir) {
  const relativePath = path.relative(rootDir, filePath);
  const ext = path.extname(filePath);
  const basename = path.basename(filePath, ext);
  /** @type {import('./types').Finding[]} */
  const findings = [];
  let conforming = true;

  // Skip dotfiles, index files, and test files with common patterns
  if (basename.startsWith('.') || basename === 'index') {
    return { findings, conforming };
  }

  // Strip .test/.spec suffix for naming check
  const nameForCheck = basename.replace(/\.(test|spec)$/, '');

  // Check for camelCase (lowercase start, has uppercase letters, no hyphens/underscores)
  const isCamelCase = /^[a-z][a-zA-Z0-9]*$/.test(nameForCheck) && /[A-Z]/.test(nameForCheck);
  // Check for PascalCase
  const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(nameForCheck);
  // Check for snake_case
  const isSnakeCase = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(nameForCheck);

  if (isCamelCase || isPascalCase || isSnakeCase) {
    // Allow PascalCase for React component files and test files
    if (isPascalCase && (isReactComponentFile(relativePath, ext) || isTestFile(basename, ext))) {
      return { findings, conforming };
    }

    // Allow camelCase for React hook files (useXxx convention)
    if (isCamelCase && nameForCheck.startsWith('use') && isReactComponentFile(relativePath, ext)) {
      return { findings, conforming };
    }

    const convention = isPascalCase ? 'PascalCase' : isSnakeCase ? 'snake_case' : 'camelCase';
    findings.push({
      file: relativePath,
      message: `Dateiname verwendet ${convention} statt kebab-case`,
      severity: 'low',
      effort: 'small',
      suggestion: `Datei in kebab-case umbenennen: ${toKebabCase(nameForCheck)}${ext}`
    });
    conforming = false;
  }

  return { findings, conforming };
}

/**
 * Konvertiert einen String in kebab-case.
 *
 * @param {string} str
 * @returns {string}
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

/**
 * Prüft Import-Muster-Konsistenz pro Verzeichnis.
 * Erkennt gemischte CommonJS (require) und ES-Module (import) im selben Verzeichnis.
 *
 * @param {string[]} files - Absolute Dateipfade
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @returns {import('./types').Finding[]}
 */
function checkImportConsistency(files, rootDir) {
  /** @type {import('./types').Finding[]} */
  const findings = [];

  // Group files by directory
  /** @type {Map<string, { cjs: string[], esm: string[] }>} */
  const dirMap = new Map();

  for (const filePath of files) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (_err) {
      continue;
    }

    const dir = path.dirname(path.relative(rootDir, filePath));
    if (!dirMap.has(dir)) {
      dirMap.set(dir, { cjs: [], esm: [] });
    }

    const entry = dirMap.get(dir);
    const relativePath = path.relative(rootDir, filePath);

    const hasRequire = /\brequire\s*\(/.test(content);
    const hasImport = /^\s*import\s+/m.test(content);

    if (hasRequire) entry.cjs.push(relativePath);
    if (hasImport) entry.esm.push(relativePath);
  }

  // Report directories with mixed patterns
  for (const [dir, { cjs, esm }] of dirMap) {
    if (cjs.length > 0 && esm.length > 0) {
      findings.push({
        file: dir,
        message: `Gemischte Import-Muster: ${cjs.length} Dateien mit CommonJS (require), ${esm.length} Dateien mit ES-Module (import)`,
        severity: 'medium',
        effort: 'medium',
        suggestion: 'Einheitliches Import-Muster pro Verzeichnis verwenden'
      });
    }
  }

  return findings;
}


/**
 * Prüft auf fehlende JSDoc-Kommentare bei exportierten Funktionen.
 *
 * @param {string} filePath - Absoluter Dateipfad
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @returns {{ findings: import('./types').Finding[], exportedCount: number, documentedCount: number }}
 */
function checkJSDocComments(filePath, rootDir) {
  const relativePath = path.relative(rootDir, filePath);
  /** @type {import('./types').Finding[]} */
  const findings = [];
  let exportedCount = 0;
  let documentedCount = 0;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (_err) {
    return { findings, exportedCount, documentedCount };
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect exported functions:
    // module.exports = function, module.exports.name = function, exports.name = function
    // export function, export default function, export const name = ...
    const isExport =
      /^\s*(module\.)?exports(\.\w+)?\s*=\s*(async\s+)?function/.test(line) ||
      /^\s*(module\.)?exports(\.\w+)?\s*=\s*(\w+|\(|async\s*\()/.test(line) ||
      /^\s*export\s+(default\s+)?(async\s+)?function/.test(line) ||
      /^\s*export\s+(const|let|var)\s+\w+\s*=/.test(line);

    if (!isExport) continue;

    exportedCount++;

    // Check if there's a JSDoc comment above (look backwards for /** ... */)
    let hasJSDoc = false;
    let j = i - 1;
    // Skip blank lines
    while (j >= 0 && lines[j].trim() === '') {
      j--;
    }
    if (j >= 0 && lines[j].trim().endsWith('*/')) {
      // Walk back to find the opening /**
      while (j >= 0) {
        if (lines[j].trim().startsWith('/**')) {
          hasJSDoc = true;
          break;
        }
        j--;
      }
    }

    if (hasJSDoc) {
      documentedCount++;
    } else {
      findings.push({
        file: relativePath,
        line: i + 1,
        message: 'Exportierte Funktion ohne JSDoc-Kommentar',
        severity: 'low',
        effort: 'small',
        suggestion: 'JSDoc-Kommentar mit @param und @returns hinzufügen'
      });
    }
  }

  return { findings, exportedCount, documentedCount };
}

/**
 * Berechnet den Style-Score basierend auf dem Anteil konformer Dateien.
 *
 * @param {number} totalFiles - Gesamtanzahl geprüfter Dateien
 * @param {number} conformingFiles - Anzahl konformer Dateien
 * @param {number} importFindings - Anzahl Import-Konsistenz-Findings
 * @param {number} jsdocExported - Anzahl exportierter Funktionen
 * @param {number} jsdocDocumented - Anzahl dokumentierter exportierter Funktionen
 * @returns {number} Score zwischen 0 und 100
 */
function calculateScore(totalFiles, conformingFiles, importFindings, jsdocExported, jsdocDocumented) {
  if (totalFiles === 0) return 100;

  // 50% weight: file conformity (editorconfig + naming)
  const conformityRatio = conformingFiles / totalFiles;

  // 20% weight: import consistency (deduct per finding)
  const importScore = Math.max(0, 100 - importFindings * 15);

  // 30% weight: JSDoc coverage
  const jsdocRatio = jsdocExported > 0 ? jsdocDocumented / jsdocExported : 1;

  const score = (conformityRatio * 100 * 0.5) + (importScore * 0.2) + (jsdocRatio * 100 * 0.3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Analysiert alle konfigurierten Dateien auf Stil-Konformität
 * und gibt ein CategoryResult zurück.
 *
 * @param {import('./types').AuditConfig} [config] - Audit-Konfiguration
 * @returns {Promise<import('./types').CategoryResult>}
 */
async function analyze(config) {
  const cfg = config || createDefaultConfig();

  try {
    const files = collectFiles(cfg);
    /** @type {import('./types').Finding[]} */
    const allFindings = [];
    const editorRules = parseEditorConfig(cfg.rootDir);

    let conformingFiles = 0;
    let totalJSDocExported = 0;
    let totalJSDocDocumented = 0;

    for (const filePath of files) {
      let fileConforming = true;

      try {
        // 1. EditorConfig conformity + mixed tabs/spaces
        const editorResult = checkEditorConfigConformity(filePath, cfg.rootDir, editorRules);
        allFindings.push(...editorResult.findings);
        if (!editorResult.conforming) fileConforming = false;

        // 2. Filename naming conventions
        const namingResult = checkFileNaming(filePath, cfg.rootDir);
        allFindings.push(...namingResult.findings);
        if (!namingResult.conforming) fileConforming = false;

        // 3. JSDoc comments for exported functions
        const jsdocResult = checkJSDocComments(filePath, cfg.rootDir);
        allFindings.push(...jsdocResult.findings);
        totalJSDocExported += jsdocResult.exportedCount;
        totalJSDocDocumented += jsdocResult.documentedCount;
      } catch (fileErr) {
        if (cfg.verbose) {
          console.warn(`[StyleAnalyzer] Fehler bei ${filePath}: ${fileErr.message}`);
        }
      }

      if (fileConforming) conformingFiles++;
    }

    // 4. Import pattern consistency (across all files)
    const importFindings = checkImportConsistency(files, cfg.rootDir);
    allFindings.push(...importFindings);

    const score = calculateScore(
      files.length,
      conformingFiles,
      importFindings.length,
      totalJSDocExported,
      totalJSDocDocumented
    );

    return {
      category: 'style',
      score,
      findings: allFindings,
      metadata: {
        filesScanned: files.length,
        conformingFiles,
        editorConfigRules: editorRules,
        importInconsistencies: importFindings.length,
        jsdocExported: totalJSDocExported,
        jsdocDocumented: totalJSDocDocumented
      },
      error: null
    };
  } catch (err) {
    return {
      category: 'style',
      score: 0,
      findings: [],
      metadata: null,
      error: err.message || String(err)
    };
  }
}

module.exports = {
  analyze,
  calculateScore,
  expandBraces,
  collectFiles,
  parseEditorConfig,
  checkEditorConfigConformity,
  checkFileNaming,
  isReactComponentFile,
  isTestFile,
  checkImportConsistency,
  checkJSDocComments,
  toKebabCase
};
