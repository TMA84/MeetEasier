'use strict';

const { WEIGHTS } = require('./config');

/**
 * @file ScoreEngine – Berechnet den gewichteten Gesamt-Score und die Bewertung.
 *
 * Reine Funktion ohne Seiteneffekte.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.6, 8.7, 8.8, 8.9
 */

/**
 * Ermittelt die Bewertung anhand des Gesamt-Scores.
 *
 * @param {number} score - Gesamt-Score (0–100)
 * @returns {'Kritisch'|'Verbesserungsbedürftig'|'Gut'|'Sehr gut'}
 */
function getRating(score) {
  if (score >= 85) return 'Sehr gut';
  if (score >= 70) return 'Gut';
  if (score >= 50) return 'Verbesserungsbedürftig';
  return 'Kritisch';
}

/**
 * Berechnet den gewichteten Gesamt-Score aus den Einzel-Ergebnissen.
 *
 * @param {Record<string, import('./types').CategoryResult>} results - Ergebnisse der Analyzer
 * @returns {import('./types').ScoreResult}
 */
function calculateScore(results) {
  const categoryScores = {};
  let totalScore = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const score = results[key]?.score ?? 0;
    categoryScores[key] = score;
    totalScore += score * weight;
  }

  return {
    totalScore: Math.round(totalScore),
    categoryScores,
    rating: getRating(totalScore),
    timestamp: new Date().toISOString()
  };
}

module.exports = { calculateScore, getRating };
