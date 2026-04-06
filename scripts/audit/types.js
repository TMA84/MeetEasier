'use strict';

/**
 * @file Gemeinsame Typen und Interfaces für das Code-Qualitäts-Audit-System.
 *
 * Diese Datei enthält JSDoc-Typedefs, die von allen Analyzer-Modulen,
 * der ScoreEngine und dem ReportGenerator verwendet werden.
 */

/**
 * Ein einzelnes Audit-Finding (gefundenes Problem).
 *
 * @typedef {Object} Finding
 * @property {string} file - Betroffene Datei
 * @property {number} [line] - Zeilennummer
 * @property {string} message - Beschreibung des Problems
 * @property {'critical'|'high'|'medium'|'low'} severity - Schweregrad
 * @property {'small'|'medium'|'large'} effort - Geschätzter Aufwand
 * @property {string} [suggestion] - Verbesserungsvorschlag
 */

/**
 * Ergebnis eines einzelnen Analyzer-Moduls.
 *
 * @typedef {Object} CategoryResult
 * @property {string} category - Name der Kategorie
 * @property {number} score - Einzel-Score (0-100)
 * @property {Finding[]} findings - Gefundene Probleme
 * @property {Object} [metadata] - Zusätzliche Daten (z.B. Coverage-Zahlen)
 * @property {string|null} error - Fehlermeldung falls Analyse fehlschlug
 */

/**
 * Konfiguration für den Audit-Durchlauf.
 *
 * @typedef {Object} AuditConfig
 * @property {boolean} fix - Auto-Fix aktiviert
 * @property {boolean} verbose - Ausführliche Ausgabe
 * @property {string} rootDir - Projekt-Root-Verzeichnis
 * @property {Object} paths
 * @property {string[]} paths.backend - Glob-Muster für Backend-Dateien
 * @property {string[]} paths.frontend - Glob-Muster für Frontend-Dateien
 * @property {Object} thresholds
 * @property {number} thresholds.maxComplexity - Max. zyklomatische Komplexität (Standard: 15)
 * @property {number} thresholds.maxFileLines - Max. Zeilen pro Datei (Standard: 500)
 * @property {number} thresholds.minCoverage - Min. Testabdeckung in % (Standard: 50)
 * @property {number} thresholds.minDuplicateLines - Min. Zeilen für Duplikaterkennung (Standard: 6)
 */

/**
 * Ergebnis der Score-Berechnung.
 *
 * @typedef {Object} ScoreResult
 * @property {number} totalScore - Gesamt-Score (0-100)
 * @property {Record<string, number>} categoryScores - Einzel-Scores pro Kategorie
 * @property {'Kritisch'|'Verbesserungsbedürftig'|'Gut'|'Sehr gut'} rating - Bewertung
 * @property {string} timestamp - ISO-8601 Zeitstempel
 */

module.exports = {};
