# Implementierungsplan: Code-Qualitäts-Audit und Scoring-System

## Übersicht

Schrittweise Implementierung des modularen Audit-Systems. Jeder Task baut auf den vorherigen auf. Alle Module folgen dem `CategoryResult`-Interface und werden am Ende über den `AuditOrchestrator` und das CLI-Skript zusammengeführt.

## Tasks

- [x] 1. Projektstruktur und gemeinsame Interfaces anlegen
  - [x] 1.1 Verzeichnis `scripts/audit/` erstellen und gemeinsame Typen/Interfaces definieren
    - Datei `scripts/audit/types.js` mit JSDoc-Typedefs für `Finding`, `CategoryResult`, `AuditConfig`, `ScoreResult`
    - Datei `scripts/audit/config.js` mit Standard-Konfiguration (Pfade, Schwellenwerte, Gewichtungen)
    - _Anforderungen: 8.2, 9.1_

- [x] 2. ESLint-Konfiguration einrichten
  - [x] 2.1 ESLint-Konfigurationsdateien erstellen
    - `.eslintrc.json` im Root für Backend (Node.js-Regeln, `app/`, `config/`, `server.js`)
    - `ui-react/.eslintrc.json` für Frontend (React-Regeln, `src/`)
    - Gemeinsame Basis-Regeln: `no-unused-vars`, `no-console`, `eqeqeq`
    - npm-Scripts `lint` in Root und `ui-react/package.json` hinzufügen
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 LintAnalyzer implementieren (`scripts/audit/lint-analyzer.js`)
    - ESLint Node API programmatisch aufrufen für Backend- und Frontend-Dateien
    - Score-Berechnung: `100 - (errors * 2 + warnings * 0.5)`, Minimum 0
    - `--fix`-Unterstützung integrieren
    - Rückgabe als `CategoryResult`
    - _Anforderungen: 1.1, 1.2, 1.3, 1.4, 9.5_

  - [x] 2.3 Unit-Tests für LintAnalyzer schreiben
    - Score-Berechnung mit verschiedenen Error/Warning-Kombinationen testen
    - Fehlertoleranz bei fehlender ESLint-Konfiguration testen
    - _Anforderungen: 1.1, 1.2_

- [x] 3. ComplexityAnalyzer implementieren
  - [x] 3.1 ComplexityAnalyzer erstellen (`scripts/audit/complexity-analyzer.js`)
    - `typhonjs-escomplex` zur Messung der zyklomatischen Komplexität nutzen
    - Schwellenwerte: Komplexität > 15, Datei > 500 Zeilen
    - Spezialbehandlung für `app/routes.js` mit Aufteilungsvorschlägen
    - Refactoring-Vorschläge als `suggestion` in Findings
    - Score basierend auf Anteil konformer Funktionen
    - _Anforderungen: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Unit-Tests für ComplexityAnalyzer schreiben
    - Score-Berechnung bei verschiedenen Komplexitätswerten testen
    - Erkennung überdimensionierter Dateien testen
    - _Anforderungen: 2.1, 2.2, 2.3_

- [x] 4. DuplicationAnalyzer implementieren
  - [x] 4.1 DuplicationAnalyzer erstellen (`scripts/audit/duplication-analyzer.js`)
    - `jscpd` programmatisch mit Mindestlänge 6 Zeilen nutzen
    - Backend und Frontend separat analysieren
    - Besonderer Fokus auf Duplikate zwischen `app/routes.js` und `app/socket-controller.js`
    - Score: `100 - (duplicatePercentage * 5)`, Minimum 0
    - _Anforderungen: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Unit-Tests für DuplicationAnalyzer schreiben
    - Score-Berechnung bei verschiedenen Duplikationsraten testen
    - _Anforderungen: 3.1_

- [x] 5. Checkpoint – Zwischenstand prüfen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. CoverageAnalyzer implementieren
  - [x] 6.1 CoverageAnalyzer erstellen (`scripts/audit/coverage-analyzer.js`)
    - Vitest-Coverage-Daten aus `ui-react/coverage/coverage-final.json` lesen
    - Falls keine Daten vorhanden: `vitest run --coverage` ausführen
    - Prüfung ob Backend-Tests existieren (kritischer Befund falls nicht)
    - Dateien unter 50% Coverage als "unzureichend getestet" markieren
    - Score: Gewichteter Durchschnitt aus Statements, Branches, Functions, Lines
    - _Anforderungen: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 6.2 Unit-Tests für CoverageAnalyzer schreiben
    - Score-Berechnung mit verschiedenen Coverage-Werten testen
    - Verhalten bei fehlenden Coverage-Daten testen
    - _Anforderungen: 4.1, 4.3_

- [x] 7. SecurityAnalyzer implementieren
  - [x] 7.1 SecurityAnalyzer erstellen (`scripts/audit/security-analyzer.js`)
    - Pattern-basierte Suche: `eval()`, `Function()`, `innerHTML`
    - Log-Leak-Erkennung (Tokens, Passwörter in console-Ausgaben)
    - Helmet- und CORS-Konfiguration in `server.js` prüfen
    - `npm audit --json` für beide `package.json` ausführen
    - Score: Abzüge je nach Schweregrad
    - _Anforderungen: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.2 Unit-Tests für SecurityAnalyzer schreiben
    - Pattern-Erkennung für unsichere Konstrukte testen
    - Score-Berechnung bei verschiedenen Schweregrad-Kombinationen testen
    - _Anforderungen: 5.1, 5.4_

- [x] 8. DependencyAnalyzer implementieren
  - [x] 8.1 DependencyAnalyzer erstellen (`scripts/audit/dependency-analyzer.js`)
    - `npm outdated --json` für Backend und Frontend ausführen
    - Deprecated-Pakete erkennen (insbesondere `ews-javascript-api`)
    - Direkte und transitive Abhängigkeiten zählen
    - Score basierend auf Anteil aktueller Abhängigkeiten
    - _Anforderungen: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.2 Unit-Tests für DependencyAnalyzer schreiben
    - Score-Berechnung bei verschiedenen Outdated-Anteilen testen
    - _Anforderungen: 6.1, 6.3_

- [x] 9. StyleAnalyzer implementieren
  - [x] 9.1 StyleAnalyzer erstellen (`scripts/audit/style-analyzer.js`)
    - `.editorconfig`-Konformität prüfen (Indent-Style, Indent-Size, Charset)
    - Gemischte Tabs/Spaces erkennen
    - Benennungskonventionen in Dateinamen prüfen
    - Import-Muster-Konsistenz bewerten (CommonJS vs. ES-Module pro Verzeichnis)
    - Fehlende JSDoc-Kommentare bei exportierten Funktionen identifizieren
    - Score basierend auf Anteil konformer Dateien
    - _Anforderungen: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 9.2 Unit-Tests für StyleAnalyzer schreiben
    - Erkennung gemischter Tabs/Spaces testen
    - JSDoc-Prüfung testen
    - _Anforderungen: 7.1, 7.3, 7.5_

- [x] 10. Checkpoint – Alle Analyzer prüfen
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. ScoreEngine implementieren
  - [x] 11.1 ScoreEngine erstellen (`scripts/audit/score-engine.js`)
    - Gewichtete Score-Berechnung: Linting 20%, Komplexität 20%, Coverage 20%, Sicherheit 15%, Abhängigkeiten 10%, Stil 15%
    - Einzel-Scores (0–100) pro Kategorie
    - Gesamt-Score (0–100) gerundet
    - Bewertung: Kritisch (<50), Verbesserungsbedürftig (50–69), Gut (70–84), Sehr gut (≥85)
    - Reine Funktion ohne Seiteneffekte
    - _Anforderungen: 8.1, 8.2, 8.3, 8.6, 8.7, 8.8, 8.9_

  - [x] 11.2 Unit-Tests für ScoreEngine schreiben
    - Gewichtete Berechnung mit bekannten Werten verifizieren
    - Alle vier Bewertungsstufen testen
    - Verhalten bei fehlenden Kategorien testen
    - _Anforderungen: 8.1, 8.2, 8.6, 8.7, 8.8, 8.9_

- [x] 12. ReportGenerator implementieren
  - [x] 12.1 ReportGenerator erstellen (`scripts/audit/report-generator.js`)
    - JSON-Ausgabe nach `data/quality-score.json` (maschinenlesbar)
    - Markdown-Ausgabe nach `QUALITY_REPORT.md` (menschenlesbar)
    - Findings nach Schweregrad sortieren: Kritisch → Hoch → Mittel → Niedrig
    - Sicherheits-Findings immer mit höchster Priorität
    - Top-10 Quick Wins berechnen und hervorheben
    - Aufwandskategorien pro Finding: Klein (<1h), Mittel (1–4h), Groß (>4h)
    - Konkrete nächste Schritte pro Kategorie
    - _Anforderungen: 8.4, 8.5, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 12.2 Unit-Tests für ReportGenerator schreiben
    - Sortierung nach Schweregrad testen
    - Quick-Win-Berechnung testen
    - JSON- und Markdown-Ausgabeformat verifizieren
    - _Anforderungen: 10.1, 10.3_

- [x] 13. AuditOrchestrator und CLI-Skript zusammenführen
  - [x] 13.1 AuditOrchestrator erstellen (`scripts/audit/orchestrator.js`)
    - Alle 7 Analyzer sequentiell aufrufen
    - Fehler einzelner Analyzer abfangen und `error` im `CategoryResult` setzen
    - Ergebnisse an ScoreEngine und ReportGenerator übergeben
    - Konsolenzusammenfassung mit Gesamt-Score ausgeben
    - _Anforderungen: 9.1, 9.3, 9.4_

  - [x] 13.2 CLI-Skript erstellen (`scripts/audit-quality.js`)
    - Argumente parsen: `--fix`, `--verbose`
    - `AuditOrchestrator` aufrufen
    - npm-Script `audit:quality` in Root `package.json` registrieren
    - Zeitlimit-Hinweis (< 120 Sekunden)
    - _Anforderungen: 9.1, 9.2, 9.4, 9.5_

  - [x] 13.3 Integrationstests für den Orchestrator schreiben
    - Fehlertoleranz bei fehlgeschlagenem Analyzer testen
    - Vollständigen Durchlauf mit Mock-Analyzern testen
    - _Anforderungen: 9.1, 9.3_

- [x] 14. Abschluss-Checkpoint – Gesamtsystem prüfen
  - Ensure all tests pass, ask the user if questions arise.

## Hinweise

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jeder Task referenziert spezifische Anforderungen zur Nachverfolgbarkeit
- Checkpoints dienen der inkrementellen Validierung
- Alle Analyzer nutzen dasselbe `CategoryResult`-Interface aus Task 1.1
