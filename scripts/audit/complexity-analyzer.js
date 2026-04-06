'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const escomplex = require('typhonjs-escomplex');
const { createDefaultConfig } = require('./config');

/**
 * @file ComplexityAnalyzer – Misst zyklomatische Komplexität mit typhonjs-escomplex.
 *
 * Schwellenwerte:
 * - Funktion mit Komplexität > maxComplexity (15) → Finding severity 'high', effort 'large'
 * - Datei mit > maxFileLines (500) Zeilen → Finding severity 'medium', effort 'medium'
 * - Spezialbehandlung für app/routes.js mit Aufteilungsvorschlägen
 *
 * Score = (konforme Funktionen / Gesamtfunktionen) * 100
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

/**
 * Expandiert Glob-Muster mit geschweiften Klammern manuell,
 * da die brace-expansion-Override im Projekt inkompatibel sein kann.
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
 * Erzeugt Aufteilungsvorschläge für app/routes.js basierend auf den erkannten Funktionen.
 *
 * @param {Object[]} methods - Erkannte Methoden aus escomplex
 * @returns {string} Vorschlag zur Aufteilung
 */
function generateRoutesSplitSuggestion(methods) {
  const routeGroups = {
    'routes/graph-api.js': [],
    'routes/admin-auth.js': [],
    'routes/config-management.js': [],
    'routes/power-management.js': [],
    'routes/booking.js': [],
    'routes/helpers.js': []
  };

  for (const m of methods) {
    const name = (m.name || '').toLowerCase();
    if (name.includes('graph') || name.includes('msal') || name.includes('fetch')) {
      routeGroups['routes/graph-api.js'].push(m.name);
    } else if (name.includes('admin') || name.includes('auth') || name.includes('token') || name.includes('csrf') || name.includes('cookie')) {
      routeGroups['routes/admin-auth.js'].push(m.name);
    } else if (name.includes('config') || name.includes('setting') || name.includes('oauth')) {
      routeGroups['routes/config-management.js'].push(m.name);
    } else if (name.includes('power') || name.includes('mqtt') || name.includes('display')) {
      routeGroups['routes/power-management.js'].push(m.name);
    } else if (name.includes('book') || name.includes('checkin') || name.includes('meeting') || name.includes('room')) {
      routeGroups['routes/booking.js'].push(m.name);
    } else {
      routeGroups['routes/helpers.js'].push(m.name);
    }
  }

  const parts = Object.entries(routeGroups)
    .filter(([, fns]) => fns.length > 0)
    .map(([file, fns]) => `  - ${file} (${fns.length} Funktionen)`)
    .join('\n');

  return `app/routes.js in separate Router-Module aufteilen:\n${parts}`;
}

/**
 * Analysiert eine einzelne Datei auf Komplexität und Zeilenlänge.
 *
 * @param {string} filePath - Absoluter Dateipfad
 * @param {import('./types').AuditConfig} config
 * @returns {{findings: import('./types').Finding[], totalFunctions: number, compliantFunctions: number}}
 */
function analyzeFile(filePath, config) {
  const { maxComplexity, maxFileLines } = config.thresholds;
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split('\n').length;
  const relativePath = path.relative(config.rootDir, filePath);

  /** @type {import('./types').Finding[]} */
  const findings = [];
  let totalFunctions = 0;
  let compliantFunctions = 0;

  // Datei-Längen-Prüfung
  if (lines > maxFileLines) {
    findings.push({
      file: relativePath,
      message: `Datei hat ${lines} Zeilen und überschreitet den Schwellenwert von ${maxFileLines} Zeilen`,
      severity: 'medium',
      effort: 'medium',
      suggestion: `Datei in kleinere Module aufteilen, um unter ${maxFileLines} Zeilen zu bleiben`
    });
  }

  // Komplexitätsanalyse mit escomplex
  const result = escomplex.analyzeModule(source, { newmi: true });

  for (const method of (result.methods || [])) {
    totalFunctions += 1;
    const cyclomatic = method.cyclomatic || 0;

    if (cyclomatic > maxComplexity) {
      findings.push({
        file: relativePath,
        line: method.lineStart,
        message: `Funktion "${method.name}" hat zyklomatische Komplexität von ${cyclomatic} (Schwellenwert: ${maxComplexity})`,
        severity: 'high',
        effort: 'large',
        suggestion: `Funktion "${method.name}" in kleinere Hilfsfunktionen aufteilen`
      });
    } else {
      compliantFunctions += 1;
    }
  }

  // Spezialbehandlung für app/routes.js
  const normalizedPath = relativePath.replace(/\\/g, '/');
  if (normalizedPath === 'app/routes.js') {
    const splitSuggestion = generateRoutesSplitSuggestion(result.methods || []);
    findings.push({
      file: relativePath,
      message: 'app/routes.js sollte in separate Router-Module aufgeteilt werden',
      severity: 'medium',
      effort: 'large',
      suggestion: splitSuggestion
    });
  }

  return { findings, totalFunctions, compliantFunctions };
}

/**
 * Berechnet den Komplexitäts-Score basierend auf dem Anteil konformer Funktionen.
 *
 * @param {number} compliantFunctions - Anzahl konformer Funktionen
 * @param {number} totalFunctions - Gesamtanzahl Funktionen
 * @returns {number} Score zwischen 0 und 100
 */
function calculateScore(compliantFunctions, totalFunctions) {
  if (totalFunctions === 0) {
    return 100;
  }
  return Math.round((compliantFunctions / totalFunctions) * 100);
}

/**
 * Analysiert alle konfigurierten Dateien auf Komplexität und gibt ein CategoryResult zurück.
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
    let totalFunctions = 0;
    let compliantFunctions = 0;

    for (const filePath of files) {
      try {
        const result = analyzeFile(filePath, cfg);
        allFindings.push(...result.findings);
        totalFunctions += result.totalFunctions;
        compliantFunctions += result.compliantFunctions;
      } catch (fileErr) {
        // Fehlertoleranz: Datei überspringen und weitermachen
        if (cfg.verbose) {
          console.warn(`[ComplexityAnalyzer] Fehler bei ${filePath}: ${fileErr.message}`);
        }
      }
    }

    const score = calculateScore(compliantFunctions, totalFunctions);

    return {
      category: 'complexity',
      score,
      findings: allFindings,
      metadata: {
        filesAnalyzed: files.length,
        totalFunctions,
        compliantFunctions,
        nonCompliantFunctions: totalFunctions - compliantFunctions
      },
      error: null
    };
  } catch (err) {
    return {
      category: 'complexity',
      score: 0,
      findings: [],
      metadata: null,
      error: err.message || String(err)
    };
  }
}

module.exports = { analyze, calculateScore, analyzeFile, collectFiles };
