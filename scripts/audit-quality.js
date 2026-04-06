#!/usr/bin/env node
'use strict';

/**
 * @file CLI-Einstiegspunkt für das Code-Qualitäts-Audit.
 *
 * Verwendung:
 *   node scripts/audit-quality.js [--fix] [--verbose]
 *
 * Validates: Requirements 9.1, 9.2, 9.4, 9.5
 */

const { runAudit } = require('./audit/orchestrator');

const TIME_LIMIT_MS = 120_000;

/**
 * Parst CLI-Argumente aus process.argv.
 *
 * @returns {{ fix: boolean, verbose: boolean }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose'),
  };
}

/**
 * Hauptfunktion – führt das Audit aus und misst die Laufzeit.
 */
async function main() {
  const config = parseArgs();
  const startTime = Date.now();

  if (config.verbose) {
    console.log('Code-Qualitäts-Audit gestartet...');
    console.log(`  --fix:     ${config.fix}`);
    console.log(`  --verbose: ${config.verbose}`);
    console.log('');
  }

  try {
    await runAudit(config);
  } catch (err) {
    console.error('Audit fehlgeschlagen:', err.message || err);
    process.exit(1);
  }

  const elapsed = Date.now() - startTime;
  const seconds = (elapsed / 1000).toFixed(1);

  console.log(`Audit abgeschlossen in ${seconds}s`);

  if (elapsed > TIME_LIMIT_MS) {
    console.warn(`⚠ Audit hat das Zeitlimit von 120 Sekunden überschritten (${seconds}s)`);
  }
}

main();
