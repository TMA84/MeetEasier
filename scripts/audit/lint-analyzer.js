'use strict';

const { ESLint } = require('eslint');
const path = require('path');
const { createDefaultConfig } = require('./config');

/**
 * @file LintAnalyzer – Führt ESLint programmatisch für Backend und Frontend aus.
 *
 * Nutzt die ESLint v8 Node API, um Backend- und Frontend-Dateien zu analysieren.
 * Berechnet einen Score basierend auf Fehler- und Warnungsanzahl.
 *
 * Score-Formel: 100 - (errors * 2 + warnings * 0.5), Minimum 0
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 9.5
 */

/**
 * Berechnet den Lint-Score aus Fehler- und Warnungsanzahl.
 *
 * @param {number} errors - Anzahl der Fehler
 * @param {number} warnings - Anzahl der Warnungen
 * @returns {number} Score zwischen 0 und 100
 */
function calculateScore(errors, warnings) {
  const raw = 100 - (errors * 2 + warnings * 0.5);
  return Math.max(0, Math.min(100, raw));
}

/**
 * Erstellt eine ESLint-Instanz für einen bestimmten Bereich (Backend/Frontend).
 *
 * @param {string} cwd - Arbeitsverzeichnis für ESLint
 * @param {boolean} fix - Auto-Fix aktivieren
 * @returns {ESLint}
 */
function createESLintInstance(cwd, fix) {
  return new ESLint({
    cwd,
    fix
  });
}

/**
 * Führt ESLint für die angegebenen Patterns aus und sammelt Ergebnisse.
 *
 * @param {ESLint} eslint - ESLint-Instanz
 * @param {string[]} patterns - Glob-Muster für zu analysierende Dateien
 * @param {boolean} fix - Ob Fixes geschrieben werden sollen
 * @returns {Promise<{errors: number, warnings: number, findings: import('./types').Finding[]}>}
 */
async function lintFiles(eslint, patterns, fix) {
  const results = await eslint.lintFiles(patterns);

  if (fix) {
    await ESLint.outputFixes(results);
  }

  let errors = 0;
  let warnings = 0;
  /** @type {import('./types').Finding[]} */
  const findings = [];

  for (const result of results) {
    errors += result.errorCount;
    warnings += result.warningCount;

    for (const msg of result.messages) {
      findings.push({
        file: result.filePath,
        line: msg.line || undefined,
        message: `${msg.ruleId || 'parse-error'}: ${msg.message}`,
        severity: msg.severity === 2 ? 'high' : 'low',
        effort: 'small',
        suggestion: msg.fix ? 'Auto-fixbar mit --fix' : undefined
      });
    }
  }

  return { errors, warnings, findings };
}


/**
 * Analysiert Backend- und Frontend-Dateien mit ESLint und gibt ein CategoryResult zurück.
 *
 * @param {import('./types').AuditConfig} [config] - Audit-Konfiguration
 * @returns {Promise<import('./types').CategoryResult>}
 */
async function analyze(config) {
  const cfg = config || createDefaultConfig();

  try {
    const rootDir = cfg.rootDir;

    // Backend linting (root ESLint config)
    const backendESLint = createESLintInstance(rootDir, cfg.fix);
    const backendResult = await lintFiles(backendESLint, cfg.paths.backend, cfg.fix);

    // Frontend linting (ui-react ESLint config)
    const frontendCwd = path.join(rootDir, 'ui-react');
    const frontendESLint = createESLintInstance(frontendCwd, cfg.fix);
    // Frontend patterns are relative to ui-react/, strip the prefix
    const frontendPatterns = cfg.paths.frontend.map(p =>
      p.startsWith('ui-react/') ? p.slice('ui-react/'.length) : p
    );
    const frontendResult = await lintFiles(frontendESLint, frontendPatterns, cfg.fix);

    // Combine results
    const totalErrors = backendResult.errors + frontendResult.errors;
    const totalWarnings = backendResult.warnings + frontendResult.warnings;
    const allFindings = [...backendResult.findings, ...frontendResult.findings];
    const score = calculateScore(totalErrors, totalWarnings);

    return {
      category: 'linting',
      score,
      findings: allFindings,
      metadata: {
        backendErrors: backendResult.errors,
        backendWarnings: backendResult.warnings,
        frontendErrors: frontendResult.errors,
        frontendWarnings: frontendResult.warnings,
        totalErrors,
        totalWarnings,
        fixApplied: cfg.fix
      },
      error: null
    };
  } catch (err) {
    return {
      category: 'linting',
      score: 0,
      findings: [],
      metadata: null,
      error: err.message || String(err)
    };
  }
}

module.exports = { analyze, calculateScore };
