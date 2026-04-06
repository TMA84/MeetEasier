'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createDefaultConfig } = require('./config');

/**
 * @file CoverageAnalyzer – Liest Vitest-Coverage-Daten und bewertet die Testabdeckung.
 *
 * Liest bestehende Coverage-Daten aus ui-react/coverage/coverage-final.json (Istanbul-Format).
 * Falls keine Daten vorhanden: führt `npx vitest run --coverage` aus.
 * Prüft ob Backend-Tests existieren (kritischer Befund falls nicht).
 * Dateien unter 50% Coverage werden als "unzureichend getestet" markiert.
 *
 * Score: Gewichteter Durchschnitt aus Statements, Branches, Functions, Lines.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

/**
 * Berechnet die Coverage-Prozentwerte für eine einzelne Datei aus Istanbul-Daten.
 *
 * @param {Object} fileData - Istanbul coverage data for a single file
 * @returns {{statements: number, branches: number, functions: number, lines: number}}
 */
function calculateFileCoverage(fileData) {
  const stmtKeys = Object.keys(fileData.s || {});
  const stmtTotal = stmtKeys.length;
  const stmtCovered = stmtKeys.filter(k => fileData.s[k] > 0).length;

  const fnKeys = Object.keys(fileData.f || {});
  const fnTotal = fnKeys.length;
  const fnCovered = fnKeys.filter(k => fileData.f[k] > 0).length;

  // Branches: each entry in b is an array of counts (one per branch path)
  const branchEntries = Object.values(fileData.b || {});
  let branchTotal = 0;
  let branchCovered = 0;
  for (const counts of branchEntries) {
    for (const count of counts) {
      branchTotal++;
      if (count > 0) branchCovered++;
    }
  }

  // Lines: derive from statementMap + s counters
  const lineSet = new Set();
  const coveredLineSet = new Set();
  const stmtMap = fileData.statementMap || {};
  for (const key of stmtKeys) {
    const loc = stmtMap[key];
    if (loc && loc.start) {
      lineSet.add(loc.start.line);
      if (fileData.s[key] > 0) {
        coveredLineSet.add(loc.start.line);
      }
    }
  }
  const lineTotal = lineSet.size;
  const lineCovered = coveredLineSet.size;

  return {
    statements: stmtTotal > 0 ? (stmtCovered / stmtTotal) * 100 : 100,
    branches: branchTotal > 0 ? (branchCovered / branchTotal) * 100 : 100,
    functions: fnTotal > 0 ? (fnCovered / fnTotal) * 100 : 100,
    lines: lineTotal > 0 ? (lineCovered / lineTotal) * 100 : 100
  };
}

/**
 * Berechnet den gewichteten Durchschnitt der Coverage-Metriken.
 *
 * @param {number} statements - Statement coverage %
 * @param {number} branches - Branch coverage %
 * @param {number} functions - Function coverage %
 * @param {number} lines - Line coverage %
 * @returns {number} Gewichteter Score (0-100)
 */
function calculateCoverageScore(statements, branches, functions, lines) {
  // Equal weighting across all four metrics
  const score = (statements + branches + functions + lines) / 4;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Prüft ob Backend-Tests existieren.
 *
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @returns {boolean} true wenn Backend-Tests gefunden wurden
 */
function backendTestsExist(rootDir) {
  const searchDirs = ['app', 'config'];
  for (const dir of searchDirs) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;
    if (findTestFiles(dirPath)) return true;
  }
  return false;
}

/**
 * Sucht rekursiv nach Test-Dateien in einem Verzeichnis.
 *
 * @param {string} dirPath - Verzeichnis zum Durchsuchen
 * @returns {boolean} true wenn Test-Dateien gefunden wurden
 */
function findTestFiles(dirPath) {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (findTestFiles(fullPath)) return true;
      } else if (entry.isFile()) {
        if (/\.(test|spec)\.js$/.test(entry.name)) return true;
      }
    }
  } catch (_err) {
    // Ignore read errors
  }
  return false;
}

/**
 * Liest Coverage-Daten aus der coverage-final.json oder führt vitest aus.
 *
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @returns {Object|null} Istanbul coverage data oder null bei Fehler
 */
function loadCoverageData(rootDir) {
  const coveragePath = path.join(rootDir, 'ui-react', 'coverage', 'coverage-final.json');

  if (fs.existsSync(coveragePath)) {
    const raw = fs.readFileSync(coveragePath, 'utf-8');
    return JSON.parse(raw);
  }

  // No coverage data found – run vitest to generate it
  try {
    execSync('npx vitest run --coverage --coverage.reportOnFailure', {
      cwd: path.join(rootDir, 'ui-react'),
      stdio: 'pipe',
      timeout: 120000
    });
  } catch (_err) {
    // vitest may exit non-zero when tests fail, but coverage is still generated
  }

  if (fs.existsSync(coveragePath)) {
    const raw = fs.readFileSync(coveragePath, 'utf-8');
    return JSON.parse(raw);
  }

  return null;
}

/**
 * Macht einen absoluten Dateipfad relativ zum Projekt-Root.
 *
 * @param {string} filePath - Absoluter Dateipfad
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @returns {string} Relativer Pfad
 */
function toRelativePath(filePath, rootDir) {
  if (filePath.startsWith(rootDir)) {
    return filePath.slice(rootDir.length).replace(/^[/\\]/, '');
  }
  return filePath;
}

/**
 * Analysiert die Testabdeckung und gibt ein CategoryResult zurück.
 *
 * @param {import('./types').AuditConfig} [config] - Audit-Konfiguration
 * @returns {Promise<import('./types').CategoryResult>}
 */
async function analyze(config) {
  const cfg = config || createDefaultConfig();

  try {
    const rootDir = cfg.rootDir;
    const minCoverage = cfg.thresholds.minCoverage || 50;
    /** @type {import('./types').Finding[]} */
    const findings = [];

    // Check for backend tests
    const hasBackendTests = backendTestsExist(rootDir);
    if (!hasBackendTests) {
      findings.push({
        file: 'app/',
        message: 'Keine Backend-Tests gefunden (*.test.js / *.spec.js in app/, config/)',
        severity: 'critical',
        effort: 'large',
        suggestion: 'Unit-Tests für Backend-Module erstellen (z.B. mit Node.js test runner oder Jest)'
      });
    }

    // Load coverage data
    const coverageData = loadCoverageData(rootDir);

    if (!coverageData || Object.keys(coverageData).length === 0) {
      return {
        category: 'coverage',
        score: 0,
        findings,
        metadata: {
          hasBackendTests,
          totalFiles: 0,
          coveredFiles: 0,
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        },
        error: 'Keine Coverage-Daten verfügbar'
      };
    }

    // Exclusion patterns for non-source files
    const exclusionPatterns = [
      /node_modules[/\\]/,
      /cypress[/\\]/,
      /build[/\\]/,
      /dist[/\\]/,
      /\.config\.js$/,
      /__mocks__[/\\]/,
      /\.min\.js$/,
      /[/\\]public[/\\]/,
      /single-room[/\\]single-room[/\\]/,
      /test-helpers\.(js|jsx)$/
    ];

    // Process per-file coverage
    let totalStatements = 0;
    let totalBranches = 0;
    let totalFunctions = 0;
    let totalLines = 0;
    let fileCount = 0;
    let insufficientCount = 0;
    let excludedCount = 0;

    /** @type {Array<{file: string, statements: number, branches: number, functions: number, lines: number, average: number}>} */
    const perFileCoverage = [];

    for (const [filePath, fileData] of Object.entries(coverageData)) {
      const relPath = toRelativePath(filePath, rootDir);

      // Skip non-source files
      if (exclusionPatterns.some(pattern => pattern.test(relPath))) {
        excludedCount++;
        continue;
      }

      const cov = calculateFileCoverage(fileData);
      const avg = (cov.statements + cov.branches + cov.functions + cov.lines) / 4;

      perFileCoverage.push({
        file: relPath,
        statements: Math.round(cov.statements * 100) / 100,
        branches: Math.round(cov.branches * 100) / 100,
        functions: Math.round(cov.functions * 100) / 100,
        lines: Math.round(cov.lines * 100) / 100,
        average: Math.round(avg * 100) / 100
      });

      totalStatements += cov.statements;
      totalBranches += cov.branches;
      totalFunctions += cov.functions;
      totalLines += cov.lines;
      fileCount++;

      if (avg < minCoverage) {
        insufficientCount++;
        findings.push({
          file: relPath,
          message: `Testabdeckung ${avg.toFixed(1)}% liegt unter dem Schwellenwert von ${minCoverage}%`,
          severity: 'medium',
          effort: 'medium',
          suggestion: `Tests für ${path.basename(filePath)} hinzufügen, um die Abdeckung zu erhöhen`
        });
      }
    }

    // Calculate overall averages (per-file average)
    const avgStatements = fileCount > 0 ? totalStatements / fileCount : 0;
    const avgBranches = fileCount > 0 ? totalBranches / fileCount : 0;
    const avgFunctions = fileCount > 0 ? totalFunctions / fileCount : 0;
    const avgLines = fileCount > 0 ? totalLines / fileCount : 0;

    const score = calculateCoverageScore(avgStatements, avgBranches, avgFunctions, avgLines);

    return {
      category: 'coverage',
      score,
      findings,
      metadata: {
        hasBackendTests,
        totalFiles: fileCount,
        excludedFiles: excludedCount,
        insufficientFiles: insufficientCount,
        statements: Math.round(avgStatements * 100) / 100,
        branches: Math.round(avgBranches * 100) / 100,
        functions: Math.round(avgFunctions * 100) / 100,
        lines: Math.round(avgLines * 100) / 100,
        perFileCoverage
      },
      error: null
    };
  } catch (err) {
    return {
      category: 'coverage',
      score: 0,
      findings: [],
      metadata: null,
      error: err.message || String(err)
    };
  }
}

module.exports = {
  analyze,
  calculateFileCoverage,
  calculateCoverageScore,
  backendTestsExist,
  toRelativePath
};
