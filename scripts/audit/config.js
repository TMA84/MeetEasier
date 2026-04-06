'use strict';

const path = require('path');

/**
 * @file Standard-Konfiguration für das Code-Qualitäts-Audit-System.
 *
 * Enthält Gewichtungen, Pfade und Schwellenwerte, die von allen
 * Analyzer-Modulen und der ScoreEngine verwendet werden.
 */

/**
 * Gewichtungen der einzelnen Audit-Kategorien für die Gesamt-Score-Berechnung.
 * Die Summe aller Gewichtungen ergibt 1.0.
 */
const WEIGHTS = {
  linting: 0.20,
  complexity: 0.20,
  coverage: 0.20,
  security: 0.15,
  dependencies: 0.10,
  style: 0.15
};

/**
 * Standard-Schwellenwerte für die Analyse.
 */
const DEFAULT_THRESHOLDS = {
  maxComplexity: 20,
  maxFileLines: 500,
  minCoverage: 50,
  minDuplicateLines: 6
};

/**
 * Standard-Pfade für Backend- und Frontend-Dateien.
 */
const DEFAULT_PATHS = {
  backend: ['app/**/*.js', 'config/**/*.js', 'server.js'],
  frontend: ['ui-react/src/**/*.{js,jsx}']
};

/**
 * Erzeugt eine vollständige AuditConfig mit Standardwerten.
 *
 * @param {Partial<import('./types').AuditConfig>} [overrides] - Optionale Überschreibungen
 * @returns {import('./types').AuditConfig}
 */
function createDefaultConfig(overrides = {}) {
  const { paths, thresholds, ...rest } = overrides;
  return {
    fix: false,
    verbose: false,
    rootDir: path.resolve(__dirname, '..', '..'),
    paths: { ...DEFAULT_PATHS, ...paths },
    thresholds: { ...DEFAULT_THRESHOLDS, ...thresholds },
    ...rest
  };
}

module.exports = {
  WEIGHTS,
  DEFAULT_THRESHOLDS,
  DEFAULT_PATHS,
  createDefaultConfig
};
