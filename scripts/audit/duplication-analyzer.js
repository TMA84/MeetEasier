'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { detectClones } = require('jscpd');
const { createDefaultConfig } = require('./config');

/**
 * @file DuplicationAnalyzer – Erkennt duplizierte Code-Blöcke mit jscpd.
 *
 * Analysiert Backend und Frontend separat.
 * Besonderer Fokus auf Duplikate zwischen app/routes.js und app/socket-controller.js.
 *
 * Score = 100 - (duplicatePercentage * 5), Minimum 0
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
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
 * Sammelt Dateien anhand von Glob-Mustern.
 *
 * @param {string[]} patterns - Glob-Muster
 * @param {string} rootDir - Projekt-Root
 * @returns {string[]} Absolute Dateipfade
 */
function collectFiles(patterns, rootDir) {
  const files = new Set();
  for (const raw of patterns) {
    const expanded = expandBraces(raw);
    for (const pattern of expanded) {
      const matches = globSync(pattern, { cwd: rootDir, absolute: true });
      for (const f of matches) {
        files.add(f);
      }
    }
  }
  return Array.from(files);
}

/**
 * Zählt die Gesamtzeilen aller übergebenen Dateien.
 *
 * @param {string[]} files - Absolute Dateipfade
 * @returns {number} Gesamtanzahl Zeilen
 */
function countTotalLines(files) {
  let total = 0;
  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      total += content.split('\n').length;
    } catch (_err) {
      // Datei nicht lesbar – überspringen
    }
  }
  return total;
}

/**
 * Ermittelt eindeutige Verzeichnisse aus einer Dateiliste.
 * Filtert das Projekt-Root heraus, da jscpd dort rekursiv alles scannen würde.
 *
 * @param {string[]} files - Absolute Dateipfade
 * @param {string} rootDir - Projekt-Root-Verzeichnis (wird ausgeschlossen)
 * @returns {string[]} Eindeutige Verzeichnispfade (ohne Root)
 */
function getUniqueDirs(files, rootDir) {
  const resolved = path.resolve(rootDir);
  const dirs = new Set();
  for (const f of files) {
    const dir = path.dirname(f);
    if (path.resolve(dir) !== resolved) {
      dirs.add(dir);
    }
  }
  return [...dirs];
}

/**
 * Führt jscpd für eine Liste von Verzeichnissen aus.
 *
 * @param {string[]} dirs - Zu analysierende Verzeichnisse (absolut)
 * @param {number} minLines - Mindestlänge für Duplikaterkennung
 * @returns {Promise<Object[]>} Gefundene Klone
 */
async function runJscpd(dirs, minLines) {
  if (dirs.length === 0) {
    return [];
  }
  return detectClones({
    path: dirs,
    ignore: ['**/node_modules/**', '**/coverage/**', '**/dist/**', '**/build/**'],
    minLines,
    silent: true,
    reporters: [],
    format: ['javascript', 'jsx'],
    absolute: true,
  });
}

/**
 * Berechnet die Anzahl duplizierter Zeilen aus den Klonen.
 * Zählt nur eine Seite jedes Klons, um Doppelzählung zu vermeiden.
 *
 * @param {Object[]} clones - jscpd-Klone
 * @returns {number} Anzahl duplizierter Zeilen
 */
function countDuplicateLines(clones) {
  let total = 0;
  for (const clone of clones) {
    const lines = clone.duplicationA.end.line - clone.duplicationA.start.line + 1;
    total += lines;
  }
  return total;
}

/**
 * Berechnet den Duplikations-Score.
 * Score = 100 - (duplicatePercentage * 5), Minimum 0
 *
 * @param {number} duplicatePercentage - Duplikationsanteil in Prozent
 * @returns {number} Score zwischen 0 und 100
 */
function calculateScore(duplicatePercentage) {
  return Math.max(0, Math.round(100 - (duplicatePercentage * 5)));
}

/**
 * Konvertiert Klone in Findings.
 *
 * @param {Object[]} clones - jscpd-Klone
 * @param {string} rootDir - Projekt-Root für relative Pfade
 * @param {string} area - 'Backend' oder 'Frontend'
 * @returns {import('./types').Finding[]}
 */
function clonesToFindings(clones, rootDir, area) {
  /** @type {import('./types').Finding[]} */
  const findings = [];

  for (const clone of clones) {
    const fileA = path.relative(rootDir, clone.duplicationA.sourceId);
    const fileB = path.relative(rootDir, clone.duplicationB.sourceId);
    const lineA = clone.duplicationA.start.line;
    const lineB = clone.duplicationB.start.line;
    const lines = clone.duplicationA.end.line - clone.duplicationA.start.line + 1;

    findings.push({
      file: fileA,
      line: lineA,
      message: `${area}-Duplikat (${lines} Zeilen): ${fileA}:${lineA} ↔ ${fileB}:${lineB}`,
      severity: lines > 20 ? 'high' : 'medium',
      effort: lines > 20 ? 'medium' : 'small',
      suggestion: 'Duplizierten Code in ein gemeinsames Modul extrahieren'
    });
  }

  return findings;
}

/**
 * Prüft Klone auf Duplikate zwischen app/routes.js und app/socket-controller.js.
 *
 * @param {Object[]} clones - jscpd-Klone
 * @param {string} rootDir - Projekt-Root
 * @returns {import('./types').Finding[]}
 */
function findCrossModuleDuplicates(clones, rootDir) {
  /** @type {import('./types').Finding[]} */
  const findings = [];
  const targetPair = ['app/routes.js', 'app/socket-controller.js'];

  for (const clone of clones) {
    const fileA = path.relative(rootDir, clone.duplicationA.sourceId).replace(/\\/g, '/');
    const fileB = path.relative(rootDir, clone.duplicationB.sourceId).replace(/\\/g, '/');

    if (targetPair.includes(fileA) && targetPair.includes(fileB)) {
      const lines = clone.duplicationA.end.line - clone.duplicationA.start.line + 1;
      const fragment = (clone.duplicationA.fragment || '').substring(0, 100);

      findings.push({
        file: fileA,
        line: clone.duplicationA.start.line,
        message: `Kritisches Duplikat zwischen routes.js und socket-controller.js (${lines} Zeilen): "${fragment}..."`,
        severity: 'high',
        effort: 'medium',
        suggestion: 'Gemeinsame Funktionen (z.B. graphFetch, sanitizeErrorForLog, refreshMsalClient) in ein Shared-Modul extrahieren'
      });
    }
  }

  return findings;
}

/**
 * Analysiert Code-Duplikation in Backend und Frontend.
 *
 * @param {import('./types').AuditConfig} [config] - Audit-Konfiguration
 * @returns {Promise<import('./types').CategoryResult>}
 */
async function analyze(config) {
  const cfg = config || createDefaultConfig();
  const minLines = cfg.thresholds.minDuplicateLines || 6;

  try {
    // Backend- und Frontend-Dateien sammeln
    const backendFiles = collectFiles(cfg.paths.backend, cfg.rootDir);
    const frontendFiles = collectFiles(cfg.paths.frontend, cfg.rootDir);
    const allFiles = [...backendFiles, ...frontendFiles];

    // Gesamtzeilen zählen
    const totalLines = countTotalLines(allFiles);

    /** @type {import('./types').Finding[]} */
    const allFindings = [];
    let totalDuplicateLines = 0;

    // Backend-Analyse
    if (backendFiles.length > 0) {
      const backendDirs = getUniqueDirs(backendFiles, cfg.rootDir);
      const backendClones = await runJscpd(backendDirs, minLines);
      totalDuplicateLines += countDuplicateLines(backendClones);
      allFindings.push(...clonesToFindings(backendClones, cfg.rootDir, 'Backend'));

      // Spezialprüfung: routes.js ↔ socket-controller.js
      const crossFindings = findCrossModuleDuplicates(backendClones, cfg.rootDir);
      allFindings.push(...crossFindings);
    }

    // Frontend-Analyse
    if (frontendFiles.length > 0) {
      const frontendDirs = getUniqueDirs(frontendFiles, cfg.rootDir);
      const frontendClones = await runJscpd(frontendDirs, minLines);
      totalDuplicateLines += countDuplicateLines(frontendClones);
      allFindings.push(...clonesToFindings(frontendClones, cfg.rootDir, 'Frontend'));
    }

    // Score berechnen
    const duplicatePercentage = totalLines > 0
      ? (totalDuplicateLines / totalLines) * 100
      : 0;
    const score = calculateScore(duplicatePercentage);

    return {
      category: 'duplication',
      score,
      findings: allFindings,
      metadata: {
        totalLines,
        totalDuplicateLines,
        duplicatePercentage: Math.round(duplicatePercentage * 100) / 100,
        backendFiles: backendFiles.length,
        frontendFiles: frontendFiles.length
      },
      error: null
    };
  } catch (err) {
    return {
      category: 'duplication',
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
  countDuplicateLines,
  clonesToFindings,
  findCrossModuleDuplicates,
  collectFiles,
  countTotalLines,
  getUniqueDirs
};
