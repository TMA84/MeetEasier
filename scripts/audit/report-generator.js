'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @file ReportGenerator – Erzeugt JSON- und Markdown-Berichte aus Audit-Ergebnissen.
 *
 * Validates: Requirements 8.4, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */

/** Severity sort order: critical first, low last */
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

/** German labels for effort categories */
const EFFORT_LABELS = {
  small: 'Klein (<1h)',
  medium: 'Mittel (1–4h)',
  large: 'Groß (>4h)'
};

/** German labels for severity levels */
const SEVERITY_LABELS = {
  critical: 'Kritisch',
  high: 'Hoch',
  medium: 'Mittel',
  low: 'Niedrig'
};

/**
 * Collects all findings from category results, tagging each with its category.
 *
 * @param {Record<string, import('./types').CategoryResult>} categoryResults
 * @returns {import('./types').Finding[]}
 */
function collectFindings(categoryResults) {
  const findings = [];
  for (const [key, result] of Object.entries(categoryResults)) {
    if (!result || !Array.isArray(result.findings)) continue;
    for (const finding of result.findings) {
      findings.push({ ...finding, category: key });
    }
  }
  return findings;
}

/**
 * Sorts findings by severity (critical → low), with security findings
 * always sorted before non-security findings at the same severity level.
 *
 * @param {Array} findings
 * @returns {Array}
 */
function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.severity] ?? 4;
    const sevB = SEVERITY_ORDER[b.severity] ?? 4;
    if (sevA !== sevB) return sevA - sevB;
    // Security findings get highest priority within same severity
    const secA = a.category === 'security' ? 0 : 1;
    const secB = b.category === 'security' ? 0 : 1;
    return secA - secB;
  });
}


/**
 * Calculates the top-10 quick wins from findings.
 * Quick wins are findings with small effort; high/critical severity are best.
 *
 * @param {Array} findings - All findings (already tagged with category)
 * @returns {Array} Top 10 quick wins
 */
function calculateQuickWins(findings) {
  const candidates = findings.filter(f => f.effort === 'small');
  // Sort: critical/high first, then medium, then low
  candidates.sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.severity] ?? 4;
    const sevB = SEVERITY_ORDER[b.severity] ?? 4;
    if (sevA !== sevB) return sevA - sevB;
    const secA = a.category === 'security' ? 0 : 1;
    const secB = b.category === 'security' ? 0 : 1;
    return secA - secB;
  });
  return candidates.slice(0, 10);
}

/**
 * Generates concrete next steps per category.
 *
 * @param {Record<string, import('./types').CategoryResult>} categoryResults
 * @returns {Record<string, string[]>}
 */
function generateNextSteps(categoryResults) {
  const steps = {};

  const categorySteps = {
    linting: [
      'ESLint-Fehler beheben (ggf. mit --fix)',
      'Verbleibende Warnungen manuell prüfen und korrigieren',
      'ESLint in CI/CD-Pipeline integrieren'
    ],
    complexity: [
      'Funktionen mit hoher Komplexität in kleinere Hilfsfunktionen aufteilen',
      'Überdimensionierte Dateien in separate Module extrahieren',
      'app/routes.js in separate Router-Module aufteilen'
    ],
    duplication: [
      'Duplizierte Code-Blöcke in gemeinsame Utility-Module extrahieren',
      'Gemeinsame Funktionen zwischen routes.js und socket-controller.js konsolidieren'
    ],
    coverage: [
      'Backend-Unit-Tests erstellen (aktuell keine vorhanden)',
      'Frontend-Dateien mit niedriger Coverage gezielt testen',
      'Coverage-Schwellenwert von 50% als CI-Gate einrichten'
    ],
    security: [
      'Alle kritischen Sicherheitsbefunde sofort beheben',
      'npm audit Schwachstellen durch Updates oder Patches schließen',
      'Sensible Daten aus Log-Ausgaben entfernen'
    ],
    dependencies: [
      'Veraltete Abhängigkeiten aktualisieren',
      'Deprecated Pakete durch aktuelle Alternativen ersetzen',
      'Regelmäßige Dependency-Updates einplanen (z.B. Dependabot)'
    ],
    style: [
      'Einheitliche Formatierung mit EditorConfig durchsetzen',
      'Gemischte Tabs/Spaces bereinigen',
      'JSDoc-Kommentare für exportierte Funktionen ergänzen'
    ]
  };

  for (const key of Object.keys(categoryResults)) {
    steps[key] = categorySteps[key] || ['Kategorie-spezifische Verbesserungen umsetzen'];
  }

  return steps;
}


/**
 * Generates the JSON report data object.
 *
 * @param {import('./types').ScoreResult} scoreResult
 * @param {Record<string, import('./types').CategoryResult>} categoryResults
 * @returns {Object}
 */
function buildJsonReport(scoreResult, categoryResults) {
  const allFindings = collectFindings(categoryResults);
  const sorted = sortFindings(allFindings);
  const quickWins = calculateQuickWins(sorted);

  return {
    totalScore: scoreResult.totalScore,
    rating: scoreResult.rating,
    categoryScores: scoreResult.categoryScores,
    findings: sorted,
    quickWins,
    timestamp: scoreResult.timestamp
  };
}

/**
 * Generates the Markdown report string.
 *
 * @param {import('./types').ScoreResult} scoreResult
 * @param {Record<string, import('./types').CategoryResult>} categoryResults
 * @returns {string}
 */
function buildMarkdownReport(scoreResult, categoryResults) {
  const allFindings = collectFindings(categoryResults);
  const sorted = sortFindings(allFindings);
  const quickWins = calculateQuickWins(sorted);
  const nextSteps = generateNextSteps(categoryResults);

  const lines = [];

  // Header
  lines.push('# Code-Qualitätsbericht');
  lines.push('');
  lines.push(`**Gesamt-Score: ${scoreResult.totalScore}/100** – Bewertung: **${scoreResult.rating}**`);
  lines.push('');
  lines.push(`*Erstellt am: ${scoreResult.timestamp}*`);
  lines.push('');

  // Category scores
  lines.push('## Kategorie-Scores');
  lines.push('');
  lines.push('| Kategorie | Score |');
  lines.push('|-----------|-------|');
  for (const [key, score] of Object.entries(scoreResult.categoryScores)) {
    lines.push(`| ${key} | ${score}/100 |`);
  }
  lines.push('');

  // All findings sorted by severity
  lines.push('## Alle Befunde');
  lines.push('');
  if (sorted.length === 0) {
    lines.push('Keine Befunde gefunden.');
    lines.push('');
  } else {
    for (const severity of ['critical', 'high', 'medium', 'low']) {
      const group = sorted.filter(f => f.severity === severity);
      if (group.length === 0) continue;
      lines.push(`### ${SEVERITY_LABELS[severity]} (${group.length})`);
      lines.push('');
      for (const f of group) {
        const loc = f.line ? `${f.file}:${f.line}` : f.file;
        const effort = EFFORT_LABELS[f.effort] || f.effort;
        lines.push(`- **[${f.category}]** ${loc}: ${f.message} *(Aufwand: ${effort})*`);
        if (f.suggestion) {
          lines.push(`  - Vorschlag: ${f.suggestion}`);
        }
      }
      lines.push('');
    }
  }

  // Top-10 Quick Wins
  lines.push('## Top-10 Quick Wins');
  lines.push('');
  if (quickWins.length === 0) {
    lines.push('Keine Quick Wins identifiziert.');
    lines.push('');
  } else {
    for (let i = 0; i < quickWins.length; i++) {
      const f = quickWins[i];
      const loc = f.line ? `${f.file}:${f.line}` : f.file;
      lines.push(`${i + 1}. **[${SEVERITY_LABELS[f.severity]}]** ${loc}: ${f.message}`);
      if (f.suggestion) {
        lines.push(`   - ${f.suggestion}`);
      }
    }
    lines.push('');
  }

  // Next steps per category
  lines.push('## Nächste Schritte');
  lines.push('');
  for (const [category, steps] of Object.entries(nextSteps)) {
    lines.push(`### ${category}`);
    lines.push('');
    for (const step of steps) {
      lines.push(`- ${step}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}


/**
 * Generates both JSON and Markdown reports and writes them to disk.
 *
 * @param {import('./types').ScoreResult} scoreResult - Result from ScoreEngine
 * @param {Record<string, import('./types').CategoryResult>} categoryResults - Results from all analyzers
 * @returns {{ jsonPath: string, mdPath: string }}
 */
function generateReport(scoreResult, categoryResults) {
  const rootDir = path.resolve(__dirname, '..', '..');

  // Ensure data/ directory exists
  const dataDir = path.join(rootDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Build and write JSON report
  const jsonReport = buildJsonReport(scoreResult, categoryResults);
  const jsonPath = path.join(dataDir, 'quality-score.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf-8');

  // Build and write Markdown report
  const mdReport = buildMarkdownReport(scoreResult, categoryResults);
  const mdPath = path.join(rootDir, 'QUALITY_REPORT.md');
  fs.writeFileSync(mdPath, mdReport, 'utf-8');

  return { jsonPath, mdPath };
}

module.exports = {
  generateReport,
  sortFindings,
  calculateQuickWins,
  collectFindings,
  buildJsonReport,
  buildMarkdownReport,
  generateNextSteps,
  SEVERITY_ORDER,
  EFFORT_LABELS,
  SEVERITY_LABELS
};
