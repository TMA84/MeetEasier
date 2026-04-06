'use strict';

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { execSync } = require('child_process');
const { createDefaultConfig } = require('./config');

/**
 * @file SecurityAnalyzer – Prüft sicherheitsrelevante Code-Muster.
 *
 * - Pattern-basierte Suche nach unsicheren Konstrukten: eval(), Function(), innerHTML
 * - Suche nach potenziellen Log-Leaks (Tokens, Passwörter in console.log/console.error)
 * - Prüfung der Helmet- und CORS-Konfiguration in server.js
 * - npm audit --json für beide package.json-Dateien
 * - Score: Abzüge je nach Schweregrad (critical: -20, high: -10, medium: -5, low: -2)
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

/** Severity deduction map */
const SEVERITY_DEDUCTIONS = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2
};

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
 * Patterns for unsafe code constructs.
 * Each pattern has a regex, severity, effort, and message template.
 */
const UNSAFE_PATTERNS = [
  {
    regex: /\beval\s*\(/g,
    severity: 'critical',
    effort: 'medium',
    message: 'Verwendung von eval() erkannt',
    suggestion: 'eval() durch sichere Alternative ersetzen (z.B. JSON.parse, Function-Mapping)'
  },
  {
    regex: /\bnew\s+Function\s*\(/g,
    severity: 'critical',
    effort: 'medium',
    message: 'Verwendung von new Function() erkannt',
    suggestion: 'new Function() durch sichere Alternative ersetzen'
  },
  {
    regex: /\.innerHTML\s*=/g,
    severity: 'high',
    effort: 'small',
    message: 'Direkte innerHTML-Zuweisung erkannt (XSS-Risiko)',
    suggestion: 'textContent oder DOM-API statt innerHTML verwenden'
  }
];

/**
 * Patterns for potential log leaks of sensitive data.
 */
const LOG_LEAK_PATTERNS = [
  {
    regex: /console\.(log|error|warn|info|debug)\s*\([^)]*\b(token|password|secret|apikey|api_key|authorization|credential|passphrase)\b/gi,
    severity: 'high',
    effort: 'small',
    message: 'Potenzieller Log-Leak: Sensible Daten könnten in Console-Ausgabe gelangen',
    suggestion: 'Sensible Daten vor dem Logging maskieren oder entfernen'
  }
];

/**
 * Scannt eine einzelne Datei auf unsichere Muster und Log-Leaks.
 *
 * @param {string} filePath - Absoluter Dateipfad
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @returns {import('./types').Finding[]}
 */
function scanFileForPatterns(filePath, rootDir) {
  const source = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(rootDir, filePath);
  const lines = source.split('\n');

  /** @type {import('./types').Finding[]} */
  const findings = [];

  // Check unsafe patterns
  for (const pattern of UNSAFE_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Reset regex lastIndex for each line
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        findings.push({
          file: relativePath,
          line: i + 1,
          message: pattern.message,
          severity: pattern.severity,
          effort: pattern.effort,
          suggestion: pattern.suggestion
        });
      }
    }
  }

  // Check log leak patterns
  for (const pattern of LOG_LEAK_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      pattern.regex.lastIndex = 0;
      if (pattern.regex.test(line)) {
        findings.push({
          file: relativePath,
          line: i + 1,
          message: pattern.message,
          severity: pattern.severity,
          effort: pattern.effort,
          suggestion: pattern.suggestion
        });
      }
    }
  }

  return findings;
}

/**
 * Prüft die Helmet- und CORS-Konfiguration in server.js.
 *
 * @param {string} rootDir - Projekt-Root-Verzeichnis
 * @returns {import('./types').Finding[]}
 */
function checkHelmetAndCors(rootDir) {
  /** @type {import('./types').Finding[]} */
  const findings = [];
  const serverPath = path.join(rootDir, 'server.js');

  if (!fs.existsSync(serverPath)) {
    findings.push({
      file: 'server.js',
      message: 'server.js nicht gefunden – Helmet/CORS-Konfiguration kann nicht geprüft werden',
      severity: 'critical',
      effort: 'large',
      suggestion: 'server.js mit Helmet- und CORS-Konfiguration erstellen'
    });
    return findings;
  }

  const source = fs.readFileSync(serverPath, 'utf8');

  // Check Helmet usage
  if (!source.includes("require('helmet')") && !source.includes('require("helmet")')) {
    findings.push({
      file: 'server.js',
      message: 'Helmet-Middleware wird nicht verwendet',
      severity: 'critical',
      effort: 'small',
      suggestion: 'Helmet-Middleware installieren und konfigurieren: app.use(helmet())'
    });
  } else {
    // Check for specific Helmet configurations
    if (!source.includes('contentSecurityPolicy')) {
      findings.push({
        file: 'server.js',
        message: 'Content-Security-Policy (CSP) ist nicht konfiguriert',
        severity: 'high',
        effort: 'medium',
        suggestion: 'CSP-Direktiven in der Helmet-Konfiguration definieren'
      });
    }
    if (!source.includes('frameguard') && !source.includes('frameAncestors')) {
      findings.push({
        file: 'server.js',
        message: 'Frameguard/X-Frame-Options ist nicht konfiguriert',
        severity: 'medium',
        effort: 'small',
        suggestion: "frameguard: { action: 'deny' } in Helmet-Konfiguration hinzufügen"
      });
    }
  }

  // Check CORS usage
  if (!source.includes("require('cors')") && !source.includes('require("cors")')) {
    findings.push({
      file: 'server.js',
      message: 'CORS-Middleware wird nicht verwendet',
      severity: 'high',
      effort: 'small',
      suggestion: 'CORS-Middleware installieren und konfigurieren'
    });
  } else {
    // Check for wildcard CORS (origin: '*' or origin: true without restrictions)
    if (/cors\(\s*\)/.test(source)) {
      findings.push({
        file: 'server.js',
        message: 'CORS ist ohne Einschränkungen konfiguriert (Wildcard)',
        severity: 'high',
        effort: 'small',
        suggestion: 'CORS-Origins explizit konfigurieren statt Wildcard zu verwenden'
      });
    }
  }

  // Check HSTS
  if (!source.includes('hsts') && !source.includes('Strict-Transport-Security')) {
    findings.push({
      file: 'server.js',
      message: 'HSTS (HTTP Strict Transport Security) ist nicht konfiguriert',
      severity: 'medium',
      effort: 'small',
      suggestion: 'HSTS in Helmet-Konfiguration aktivieren oder manuell setzen'
    });
  }

  return findings;
}

/**
 * Führt npm audit --json aus und parst die Ergebnisse.
 *
 * @param {string} directory - Verzeichnis mit package.json
 * @param {string} rootDir - Projekt-Root für relative Pfade
 * @returns {import('./types').Finding[]}
 */
function runNpmAudit(directory, rootDir) {
  /** @type {import('./types').Finding[]} */
  const findings = [];
  const packageJsonPath = path.join(directory, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return findings;
  }

  const relativePkg = path.relative(rootDir, packageJsonPath);

  try {
    // npm audit exits with non-zero when vulnerabilities are found, so we catch that
    let stdout;
    try {
      stdout = execSync('npm audit --json', {
        cwd: directory,
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (execErr) {
      // npm audit returns non-zero exit code when vulnerabilities exist
      stdout = execErr.stdout || '{}';
    }

    const auditResult = JSON.parse(stdout);

    // Handle npm audit v2+ format (vulnerabilities object)
    if (auditResult.vulnerabilities) {
      for (const [name, vuln] of Object.entries(auditResult.vulnerabilities)) {
        const severity = mapNpmSeverity(vuln.severity);
        findings.push({
          file: relativePkg,
          message: `Unsichere Abhängigkeit: ${name} (${vuln.severity}) – ${vuln.title || vuln.via?.[0]?.title || 'Sicherheitslücke'}`,
          severity,
          effort: 'small',
          suggestion: vuln.fixAvailable
            ? `npm audit fix oder manuelles Update von ${name}`
            : `Abhängigkeit ${name} manuell prüfen und ggf. ersetzen`
        });
      }
    }

    // Handle metadata summary
    if (auditResult.metadata?.vulnerabilities) {
      const vulns = auditResult.metadata.vulnerabilities;
      const total = (vulns.critical || 0) + (vulns.high || 0) + (vulns.moderate || 0) + (vulns.low || 0);
      if (total === 0 && findings.length === 0) {
        // No vulnerabilities – no findings needed
      }
    }
  } catch (parseErr) {
    findings.push({
      file: relativePkg,
      message: `npm audit konnte nicht ausgeführt werden: ${parseErr.message}`,
      severity: 'medium',
      effort: 'small',
      suggestion: 'npm audit manuell ausführen und Ergebnisse prüfen'
    });
  }

  return findings;
}

/**
 * Maps npm audit severity to our severity levels.
 *
 * @param {string} npmSeverity
 * @returns {'critical'|'high'|'medium'|'low'}
 */
function mapNpmSeverity(npmSeverity) {
  switch (npmSeverity) {
    case 'critical': return 'critical';
    case 'high': return 'high';
    case 'moderate': return 'medium';
    case 'low': return 'low';
    default: return 'low';
  }
}

/**
 * Berechnet den Security-Score basierend auf Findings.
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
 * Analysiert alle konfigurierten Dateien auf Sicherheitsprobleme
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

    // 1. Pattern-basierte Suche in allen Dateien
    for (const filePath of files) {
      try {
        const fileFindings = scanFileForPatterns(filePath, cfg.rootDir);
        allFindings.push(...fileFindings);
      } catch (fileErr) {
        if (cfg.verbose) {
          console.warn(`[SecurityAnalyzer] Fehler bei ${filePath}: ${fileErr.message}`);
        }
      }
    }

    // 2. Helmet- und CORS-Konfiguration prüfen
    const helmetCorsFindings = checkHelmetAndCors(cfg.rootDir);
    allFindings.push(...helmetCorsFindings);

    // 3. npm audit für Backend
    const backendAuditFindings = runNpmAudit(cfg.rootDir, cfg.rootDir);
    allFindings.push(...backendAuditFindings);

    // 4. npm audit für Frontend (ui-react)
    const frontendDir = path.join(cfg.rootDir, 'ui-react');
    const frontendAuditFindings = runNpmAudit(frontendDir, cfg.rootDir);
    allFindings.push(...frontendAuditFindings);

    const score = calculateScore(allFindings);

    return {
      category: 'security',
      score,
      findings: allFindings,
      metadata: {
        filesScanned: files.length,
        unsafePatterns: allFindings.filter(f =>
          f.message.includes('eval()') ||
          f.message.includes('Function()') ||
          f.message.includes('innerHTML')
        ).length,
        logLeaks: allFindings.filter(f =>
          f.message.includes('Log-Leak')
        ).length,
        npmVulnerabilities: allFindings.filter(f =>
          f.message.includes('Unsichere Abhängigkeit')
        ).length
      },
      error: null
    };
  } catch (err) {
    return {
      category: 'security',
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
  scanFileForPatterns,
  checkHelmetAndCors,
  runNpmAudit,
  expandBraces,
  collectFiles
};
