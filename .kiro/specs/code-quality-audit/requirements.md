# Anforderungsdokument: Code-Qualitäts-Audit und Scoring-System

## Einleitung

Dieses Dokument beschreibt die Anforderungen für ein umfassendes Code-Qualitäts-Audit der MeetEasier-Applikation. Die Applikation besteht aus einem Node.js/Express-Backend (ca. 15 Module in `app/` und `config/`) und einem React-Frontend (`ui-react/src/` mit Komponenten, Layouts, Utils und Konfiguration). Ziel ist es, die Codequalität systematisch zu analysieren, Verbesserungen umzusetzen und das Ergebnis mit einem nachvollziehbaren Qualitäts-Score zu belegen.

## Glossar

- **Audit_System**: Das Gesamtsystem zur Analyse, Bewertung und Verbesserung der Codequalität
- **Score_Engine**: Die Komponente, die den Qualitäts-Score berechnet und ausgibt
- **Linter**: Statisches Analyse-Werkzeug (ESLint) zur Erkennung von Code-Problemen
- **Backend**: Der Node.js/Express-Server (`server.js`, `app/`, `config/`)
- **Frontend**: Die React-Applikation (`ui-react/src/`)
- **Audit_Report**: Der generierte Bericht mit Ergebnissen und Score
- **Kategorie**: Ein bewerteter Qualitätsbereich (z.B. Linting, Komplexität, Testabdeckung)
- **Schwellenwert**: Ein definierter Grenzwert für eine Qualitätsmetrik

## Anforderungen

### Anforderung 1: ESLint-Konfiguration einrichten

**User Story:** Als Entwickler möchte ich eine einheitliche ESLint-Konfiguration für Backend und Frontend, damit Code-Stil und potenzielle Fehler automatisch erkannt werden.

#### Akzeptanzkriterien

1. THE Audit_System SHALL eine ESLint-Konfiguration für das Backend bereitstellen, die Node.js-spezifische Regeln enthält
2. THE Audit_System SHALL eine ESLint-Konfiguration für das Frontend bereitstellen, die React-spezifische Regeln enthält
3. WHEN ein Entwickler `npm run lint` im Root-Verzeichnis ausführt, THE Linter SHALL alle Backend-Dateien in `app/` und `config/` analysieren
4. WHEN ein Entwickler `npm run lint` im `ui-react/`-Verzeichnis ausführt, THE Linter SHALL alle Frontend-Dateien in `src/` analysieren
5. THE Audit_System SHALL eine gemeinsame Basis-Konfiguration definieren, die für Backend und Frontend gilt (z.B. `no-unused-vars`, `no-console`-Ausnahmen, `eqeqeq`)

### Anforderung 2: Code-Komplexität analysieren und reduzieren

**User Story:** Als Entwickler möchte ich übermäßig komplexe Dateien und Funktionen identifizieren, damit ich diese gezielt refaktorisieren kann.

#### Akzeptanzkriterien

1. THE Audit_System SHALL die zyklomatische Komplexität aller JavaScript-Funktionen in Backend und Frontend messen
2. WHEN eine Funktion eine zyklomatische Komplexität von mehr als 15 aufweist, THE Audit_System SHALL diese Funktion im Audit_Report als "hohe Komplexität" kennzeichnen
3. WHEN eine Datei mehr als 500 Zeilen Code enthält, THE Audit_System SHALL diese Datei im Audit_Report als "überdimensioniert" kennzeichnen
4. THE Audit_System SHALL für jede als komplex oder überdimensioniert identifizierte Stelle einen konkreten Refactoring-Vorschlag im Audit_Report dokumentieren
5. WHEN die Datei `app/routes.js` analysiert wird, THE Audit_System SHALL Vorschläge zur Aufteilung in separate Router-Module liefern

### Anforderung 3: Code-Duplikation erkennen

**User Story:** Als Entwickler möchte ich duplizierte Code-Abschnitte finden, damit ich diese in gemeinsame Module extrahieren kann.

#### Akzeptanzkriterien

1. THE Audit_System SHALL duplizierte Code-Blöcke mit einer Mindestlänge von 6 Zeilen erkennen
2. WHEN duplizierter Code zwischen Backend-Modulen gefunden wird, THE Audit_System SHALL die betroffenen Dateien und Zeilennummern im Audit_Report auflisten
3. WHEN duplizierter Code zwischen Frontend-Komponenten gefunden wird, THE Audit_System SHALL die betroffenen Dateien und Zeilennummern im Audit_Report auflisten
4. THE Audit_System SHALL insbesondere Duplikate zwischen `app/routes.js` und `app/socket-controller.js` identifizieren (z.B. `graphFetch`, `sanitizeErrorForLog`, `refreshMsalClient`)

### Anforderung 4: Testabdeckung messen und bewerten

**User Story:** Als Entwickler möchte ich die aktuelle Testabdeckung kennen, damit ich weiß, welche Bereiche unzureichend getestet sind.

#### Akzeptanzkriterien

1. THE Audit_System SHALL die Testabdeckung des Frontends mittels Vitest Coverage messen
2. THE Audit_System SHALL die Testabdeckung pro Datei im Audit_Report auflisten
3. WHEN eine Datei eine Testabdeckung von weniger als 50% aufweist, THE Audit_System SHALL diese Datei als "unzureichend getestet" kennzeichnen
4. THE Audit_System SHALL eine Gesamtabdeckung (Statements, Branches, Functions, Lines) im Audit_Report angeben
5. WHEN das Backend keine Unit-Tests besitzt, THE Audit_System SHALL dies als kritischen Befund im Audit_Report dokumentieren

### Anforderung 5: Sicherheitsrelevante Code-Muster prüfen

**User Story:** Als Entwickler möchte ich sicherheitsrelevante Code-Muster identifizieren, damit ich potenzielle Schwachstellen beheben kann.

#### Akzeptanzkriterien

1. THE Audit_System SHALL alle Stellen identifizieren, an denen Benutzereingaben ohne Validierung verwendet werden
2. THE Audit_System SHALL alle Stellen identifizieren, an denen sensible Daten (Passwörter, Tokens, Secrets) in Logs geschrieben werden könnten
3. WHEN eine unsichere Abhängigkeit in `package.json` oder `ui-react/package.json` gefunden wird, THE Audit_System SHALL diese im Audit_Report mit Schweregrad auflisten
4. THE Audit_System SHALL die Verwendung von `eval()`, `Function()` und ähnlichen unsicheren Konstrukten erkennen
5. THE Audit_System SHALL die korrekte Verwendung von Helmet-Headern und CORS-Konfiguration bewerten

### Anforderung 6: Abhängigkeiten analysieren

**User Story:** Als Entwickler möchte ich den Zustand meiner Abhängigkeiten kennen, damit ich veraltete oder unsichere Pakete aktualisieren kann.

#### Akzeptanzkriterien

1. THE Audit_System SHALL alle veralteten Abhängigkeiten in Backend und Frontend identifizieren
2. THE Audit_System SHALL bekannte Sicherheitslücken in Abhängigkeiten mittels `npm audit` erfassen
3. WHEN eine Abhängigkeit als "deprecated" markiert ist, THE Audit_System SHALL diese im Audit_Report mit einem Ersatzvorschlag auflisten
4. THE Audit_System SHALL die Anzahl der direkten und transitiven Abhängigkeiten im Audit_Report dokumentieren
5. WHEN die EWS-Abhängigkeit (`ews-javascript-api`) analysiert wird, THE Audit_System SHALL diese als deprecated kennzeichnen und die Entfernung empfehlen

### Anforderung 7: Code-Stil und Konsistenz bewerten

**User Story:** Als Entwickler möchte ich eine konsistente Code-Formatierung sicherstellen, damit der Code leichter lesbar und wartbar ist.

#### Akzeptanzkriterien

1. THE Audit_System SHALL die Einhaltung der `.editorconfig`-Regeln in allen Quelldateien prüfen
2. THE Audit_System SHALL inkonsistente Benennungskonventionen identifizieren (z.B. camelCase vs. snake_case in Dateinamen)
3. WHEN eine Datei Tabs und Spaces gemischt verwendet, THE Audit_System SHALL dies als Stil-Verstoß melden
4. THE Audit_System SHALL die Konsistenz von Modul-Import-Mustern bewerten (CommonJS `require` vs. ES-Module `import`)
5. THE Audit_System SHALL fehlende oder unvollständige JSDoc-Kommentare in öffentlichen Funktionen identifizieren

### Anforderung 8: Qualitäts-Score berechnen

**User Story:** Als Entwickler möchte ich einen Gesamt-Score für die Codequalität erhalten, damit ich den aktuellen Zustand und den Fortschritt nach Verbesserungen messen kann.

#### Akzeptanzkriterien

1. THE Score_Engine SHALL einen Gesamt-Score auf einer Skala von 0 bis 100 berechnen
2. THE Score_Engine SHALL den Score aus gewichteten Kategorien berechnen: Linting (20%), Komplexität (20%), Testabdeckung (20%), Sicherheit (15%), Abhängigkeiten (10%), Code-Stil (15%)
3. WHEN alle Kategorien bewertet sind, THE Score_Engine SHALL für jede Kategorie einen Einzel-Score von 0 bis 100 ausgeben
4. THE Score_Engine SHALL den Score in einer maschinenlesbaren JSON-Datei speichern (`data/quality-score.json`)
5. THE Score_Engine SHALL den Score zusätzlich in einem menschenlesbaren Markdown-Bericht ausgeben (`QUALITY_REPORT.md`)
6. WHEN der Gesamt-Score unter 50 liegt, THE Score_Engine SHALL den Bericht mit der Bewertung "Kritisch" versehen
7. WHEN der Gesamt-Score zwischen 50 und 69 liegt, THE Score_Engine SHALL den Bericht mit der Bewertung "Verbesserungsbedürftig" versehen
8. WHEN der Gesamt-Score zwischen 70 und 84 liegt, THE Score_Engine SHALL den Bericht mit der Bewertung "Gut" versehen
9. WHEN der Gesamt-Score 85 oder höher liegt, THE Score_Engine SHALL den Bericht mit der Bewertung "Sehr gut" versehen

### Anforderung 9: Audit-Skript bereitstellen

**User Story:** Als Entwickler möchte ich das Audit jederzeit per Kommandozeile ausführen können, damit ich den Qualitäts-Score regelmäßig überprüfen kann.

#### Akzeptanzkriterien

1. WHEN ein Entwickler `npm run audit:quality` im Root-Verzeichnis ausführt, THE Audit_System SHALL alle Prüfungen durchführen und den Audit_Report generieren
2. THE Audit_System SHALL den Audit-Prozess in weniger als 120 Sekunden abschließen
3. IF ein Prüfschritt fehlschlägt, THEN THE Audit_System SHALL den Fehler protokollieren und mit den verbleibenden Prüfungen fortfahren
4. THE Audit_System SHALL am Ende der Ausführung eine Zusammenfassung mit dem Gesamt-Score auf der Konsole ausgeben
5. WHEN das Skript mit dem Flag `--fix` ausgeführt wird, THE Audit_System SHALL automatisch behebbare Linting-Fehler korrigieren

### Anforderung 10: Verbesserungsmaßnahmen priorisieren

**User Story:** Als Entwickler möchte ich eine priorisierte Liste von Verbesserungsmaßnahmen erhalten, damit ich die wichtigsten Probleme zuerst angehen kann.

#### Akzeptanzkriterien

1. THE Audit_Report SHALL alle gefundenen Probleme nach Schweregrad sortieren: Kritisch, Hoch, Mittel, Niedrig
2. THE Audit_Report SHALL für jedes Problem eine geschätzte Aufwandskategorie angeben: Klein (< 1h), Mittel (1-4h), Groß (> 4h)
3. THE Audit_Report SHALL die Top-10 der wirkungsvollsten Verbesserungen als "Quick Wins" hervorheben
4. WHEN ein Problem die Sicherheit betrifft, THE Audit_Report SHALL dieses Problem mit der höchsten Priorität einstufen
5. THE Audit_Report SHALL für jede Kategorie konkrete nächste Schritte beschreiben
