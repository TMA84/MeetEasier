'use strict';

const { createDefaultConfig } = require('./config');
const { calculateScore } = require('./score-engine');
const { generateReport } = require('./report-generator');

const lintAnalyzer = require('./lint-analyzer');
const complexityAnalyzer = require('./complexity-analyzer');
const duplicationAnalyzer = require('./duplication-analyzer');
const coverageAnalyzer = require('./coverage-analyzer');
const securityAnalyzer = require('./security-analyzer');
const dependencyAnalyzer = require('./dependency-analyzer');
const styleAnalyzer = require('./style-analyzer');

/**
 * @file AuditOrchestrator – Koordiniert alle Analyzer, ScoreEngine und ReportGenerator.
 *
 * Validates: Requirements 9.1, 9.3, 9.4
 */

/**
 * Analyzer-Definitionen mit Kategorie-Schlüssel und Modul-Referenz.
 */
const ANALYZERS = [
  { key: 'linting', analyzer: lintAnalyzer },
  { key: 'complexity', analyzer: complexityAnalyzer },
  { key: 'duplication', analyzer: duplicationAnalyzer },
  { key: 'coverage', analyzer: coverageAnalyzer },
  { key: 'security', analyzer: securityAnalyzer },
  { key: 'dependencies', analyzer: dependencyAnalyzer },
  { key: 'style', analyzer: styleAnalyzer },
];

/**
 * Führt einen einzelnen Analyzer aus und fängt Fehler ab.
 *
 * @param {string} key - Kategorie-Schlüssel
 * @param {{ analyze: (config: import('./types').AuditConfig) => Promise<import('./types').CategoryResult> }} mod
 * @param {import('./types').AuditConfig} config
 * @returns {Promise<import('./types').CategoryResult>}
 */
async function runAnalyzer(key, mod, config) {
  try {
    return await mod.analyze(config);
  } catch (err) {
    return {
      category: key,
      score: 0,
      findings: [],
      error: err.message || String(err),
    };
  }
}

/**
 * Gibt eine Konsolenzusammenfassung mit Gesamt-Score, Bewertung und Einzel-Scores aus.
 *
 * @param {import('./types').ScoreResult} scoreResult
 */
function printSummary(scoreResult) {
  console.log('\n========================================');
  console.log('  Code-Qualitäts-Audit – Zusammenfassung');
  console.log('========================================\n');
  console.log(`  Gesamt-Score: ${scoreResult.totalScore}/100`);
  console.log(`  Bewertung:    ${scoreResult.rating}\n`);
  console.log('  Kategorie-Scores:');
  for (const [category, score] of Object.entries(scoreResult.categoryScores)) {
    const bar = '█'.repeat(Math.round(score / 5)) + '░'.repeat(20 - Math.round(score / 5));
    console.log(`    ${category.padEnd(14)} ${bar} ${score}/100`);
  }
  console.log('\n========================================\n');
}

/**
 * Führt das vollständige Audit durch: alle Analyzer, Score-Berechnung, Report-Generierung.
 *
 * @param {Partial<import('./types').AuditConfig>} [configOverrides] - Optionale Konfigurationsüberschreibungen
 * @returns {Promise<{ results: Record<string, import('./types').CategoryResult>, scoreResult: import('./types').ScoreResult, reportPaths: { jsonPath: string, mdPath: string } }>}
 */
async function runAudit(configOverrides) {
  const config = createDefaultConfig(configOverrides);
  const results = {};

  // Run all 7 analyzers sequentially
  for (const { key, analyzer } of ANALYZERS) {
    if (config.verbose) {
      console.log(`Analysiere: ${key}...`);
    }
    results[key] = await runAnalyzer(key, analyzer, config);
    if (config.verbose && results[key].error) {
      console.warn(`  ⚠ ${key} fehlgeschlagen: ${results[key].error}`);
    }
  }

  // Calculate scores
  const scoreResult = calculateScore(results);

  // Generate reports
  const reportPaths = generateReport(scoreResult, results);

  // Print console summary
  printSummary(scoreResult);

  console.log(`  JSON-Bericht: ${reportPaths.jsonPath}`);
  console.log(`  Markdown-Bericht: ${reportPaths.mdPath}\n`);

  return { results, scoreResult, reportPaths };
}

module.exports = { runAudit, printSummary, runAnalyzer, ANALYZERS };
