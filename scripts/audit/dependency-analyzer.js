'use strict';

const path = require('path');
const { execSync } = require('child_process');
const { createDefaultConfig } = require('./config');

/**
 * @file DependencyAnalyzer – Analysiert Abhängigkeiten auf Aktualität, Deprecation und Umfang.
 *
 * - Führt `npm outdated --json` für Backend und Frontend aus
 * - Erkennt deprecated Pakete
 * - Zählt direkte und transitive Abhängigkeiten via `npm ls --json`
 * - Score basierend auf Anteil aktueller Abhängigkeiten
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

/**
 * Bekannte deprecated Pakete mit Ersatzvorschlägen.
 */
const KNOWN_DEPRECATED = {};

/** Severity deduction map */
const SEVERITY_DEDUCTIONS = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  info: 0
};

/**
 * Führt `npm outdated --json` in einem Verzeichnis aus und gibt das Ergebnis zurück.
 *
 * @param {string} directory - Verzeichnis mit package.json
 * @returns {Object} Parsed JSON-Ergebnis von npm outdated
 */
function runNpmOutdated(directory) {
  try {
    let stdout;
    try {
      stdout = execSync('npm outdated --json', {
        cwd: directory,
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (execErr) {
      // npm outdated exits with code 1 when outdated packages exist
      stdout = execErr.stdout || '{}';
    }
    return JSON.parse(stdout || '{}');
  } catch (_err) {
    return {};
  }
}

/**
 * Führt `npm ls --json --all` in einem Verzeichnis aus und zählt Abhängigkeiten.
 *
 * @param {string} directory - Verzeichnis mit package.json
 * @returns {{ direct: number, transitive: number }} Anzahl direkter und transitiver Abhängigkeiten
 */
function countDependencies(directory) {
  try {
    let stdout;
    try {
      stdout = execSync('npm ls --json --all', {
        cwd: directory,
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (execErr) {
      // npm ls may exit non-zero for peer dep issues
      stdout = execErr.stdout || '{}';
    }

    const tree = JSON.parse(stdout || '{}');
    const directDeps = tree.dependencies ? Object.keys(tree.dependencies) : [];
    const allDeps = new Set();

    function walk(deps) {
      if (!deps) return;
      for (const [name, info] of Object.entries(deps)) {
        allDeps.add(name);
        if (info.dependencies) {
          walk(info.dependencies);
        }
      }
    }

    walk(tree.dependencies);

    return {
      direct: directDeps.length,
      transitive: Math.max(0, allDeps.size - directDeps.length)
    };
  } catch (_err) {
    return { direct: 0, transitive: 0 };
  }
}

/**
 * Prüft ob der Versionsunterschied nur ein Major-Version-Sprung ist.
 * Vergleicht current mit wanted – wenn current === wanted, ist das Paket
 * innerhalb seines semver-Bereichs aktuell (nur Major-Update verfügbar).
 *
 * @param {string} current - Aktuelle Version
 * @param {string} wanted - Gewünschte Version (semver-kompatibel)
 * @param {string} latest - Neueste verfügbare Version
 * @returns {'major'|'minor'|'patch'} Art des Updates
 */
function classifyUpdate(current, wanted, latest) {
  // If current matches wanted, the package is up-to-date within its semver range
  // The difference to latest is a major version bump only
  if (current === wanted && latest !== wanted) {
    return 'major';
  }
  // If current doesn't match wanted, there's a minor/patch update available
  if (current !== wanted) {
    return 'minor';
  }
  return 'patch';
}

/**
 * Erzeugt Findings für veraltete Pakete.
 * Major-only updates (current === wanted but latest differs) are informational
 * and don't heavily penalize the score.
 *
 * @param {Object} outdatedData - Ergebnis von npm outdated --json
 * @param {string} context - 'Backend' oder 'Frontend'
 * @param {string} packageJsonRelative - Relativer Pfad zur package.json
 * @returns {{ findings: import('./types').Finding[], outdatedCount: number, totalCount: number }}
 */
function analyzeOutdated(outdatedData, context, packageJsonRelative) {
  /** @type {import('./types').Finding[]} */
  const findings = [];
  const packages = Object.entries(outdatedData);
  let outdatedCount = 0;

  for (const [name, info] of packages) {
    const current = info.current || 'unbekannt';
    const wanted = info.wanted || 'unbekannt';
    const latest = info.latest || 'unbekannt';

    const updateType = classifyUpdate(current, wanted, latest);

    if (updateType === 'major') {
      // Major-only update: package is current within semver range.
      // Flag as informational (info severity) – not a real "outdated" issue.
      findings.push({
        file: packageJsonRelative,
        message: `${context}: ${name} – neue Major-Version verfügbar (aktuell: ${current}, neueste: ${latest})`,
        severity: 'info',
        effort: 'medium',
        suggestion: `Major-Update prüfen: npm install ${name}@${latest} (Breaking Changes beachten)`
      });
    } else {
      // Minor/patch update available within semver range – actually outdated
      outdatedCount++;
      findings.push({
        file: packageJsonRelative,
        message: `${context}: ${name} ist veraltet (aktuell: ${current}, gewünscht: ${wanted}, neueste: ${latest})`,
        severity: 'medium',
        effort: 'small',
        suggestion: `npm update ${name} oder npm install ${name}@${wanted}`
      });
    }
  }

  return { findings, outdatedCount, totalCount: packages.length };
}

/**
 * Prüft auf bekannte deprecated Pakete in einer package.json.
 *
 * @param {string} directory - Verzeichnis mit package.json
 * @param {string} packageJsonRelative - Relativer Pfad zur package.json
 * @returns {import('./types').Finding[]}
 */
function checkDeprecated(directory, packageJsonRelative) {
  /** @type {import('./types').Finding[]} */
  const findings = [];

  try {
    const pkgPath = path.join(directory, 'package.json');
    const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf8'));
    const requiredDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies
    };
    const optionalDeps = pkg.optionalDependencies || {};

    for (const [name, deprecation] of Object.entries(KNOWN_DEPRECATED)) {
      if (requiredDeps[name]) {
        // Required deprecated dependency – high severity
        findings.push({
          file: packageJsonRelative,
          message: deprecation.message,
          severity: 'high',
          effort: 'large',
          suggestion: deprecation.suggestion
        });
      } else if (optionalDeps[name]) {
        // Optional deprecated dependency – reduced severity (opt-in legacy support)
        findings.push({
          file: packageJsonRelative,
          message: `${deprecation.message} (optionale Abhängigkeit)`,
          severity: 'info',
          effort: 'large',
          suggestion: deprecation.suggestion
        });
      }
    }
  } catch (_err) {
    // Ignore read errors
  }

  return findings;
}

/**
 * Berechnet den Dependency-Score basierend auf Findings.
 * Startet bei 100 und zieht je nach Schweregrad ab.
 *
 * @param {import('./types').Finding[]} findings
 * @returns {number} Score zwischen 0 und 100
 */
function calculateScore(findings) {
  let score = 100;
  for (const finding of findings) {
    score -= SEVERITY_DEDUCTIONS[finding.severity] || 0;
  }
  return Math.max(0, Math.min(100, score));
}

/**
 * Analysiert Abhängigkeiten für Backend und Frontend und gibt ein CategoryResult zurück.
 *
 * @param {import('./types').AuditConfig} [config] - Audit-Konfiguration
 * @returns {Promise<import('./types').CategoryResult>}
 */
async function analyze(config) {
  const cfg = config || createDefaultConfig();

  try {
    /** @type {import('./types').Finding[]} */
    const allFindings = [];

    // 1. Backend outdated
    const backendOutdated = runNpmOutdated(cfg.rootDir);
    const backendResult = analyzeOutdated(backendOutdated, 'Backend', 'package.json');
    allFindings.push(...backendResult.findings);

    // 2. Frontend outdated
    const frontendDir = path.join(cfg.rootDir, 'ui-react');
    const frontendOutdated = runNpmOutdated(frontendDir);
    const frontendResult = analyzeOutdated(frontendOutdated, 'Frontend', 'ui-react/package.json');
    allFindings.push(...frontendResult.findings);

    // 3. Check deprecated packages
    const backendDeprecated = checkDeprecated(cfg.rootDir, 'package.json');
    allFindings.push(...backendDeprecated);

    const frontendDeprecated = checkDeprecated(frontendDir, 'ui-react/package.json');
    allFindings.push(...frontendDeprecated);

    // 4. Count dependencies
    const backendDeps = countDependencies(cfg.rootDir);
    const frontendDeps = countDependencies(frontendDir);

    const score = calculateScore(allFindings);

    return {
      category: 'dependencies',
      score,
      findings: allFindings,
      metadata: {
        backend: {
          outdated: backendResult.outdatedCount,
          directDependencies: backendDeps.direct,
          transitiveDependencies: backendDeps.transitive,
          deprecated: backendDeprecated.length
        },
        frontend: {
          outdated: frontendResult.outdatedCount,
          directDependencies: frontendDeps.direct,
          transitiveDependencies: frontendDeps.transitive,
          deprecated: frontendDeprecated.length
        },
        totalOutdated: backendResult.outdatedCount + frontendResult.outdatedCount,
        totalDeprecated: backendDeprecated.length + frontendDeprecated.length
      },
      error: null
    };
  } catch (err) {
    return {
      category: 'dependencies',
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
  classifyUpdate,
  runNpmOutdated,
  countDependencies,
  analyzeOutdated,
  checkDeprecated,
  KNOWN_DEPRECATED
};
