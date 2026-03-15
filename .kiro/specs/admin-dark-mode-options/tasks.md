# Implementation Plan: Admin Panel Dark-Mode Konfiguration

## Overview

Diese Implementierung erweitert die bestehende Admin-Komponente (`ui-react/src/components/admin/Admin.js`), um Dark-Mode-spezifische Konfigurationsoptionen kontextabhängig anzuzeigen. Die Optionen "Gefüllt" und "Transparent" werden nur angezeigt, wenn der Dark-Mode aktiv ist. Die Lösung nutzt React's bedingtes Rendering und State-Management.

## Tasks

- [x] 1. Übersetzungsschlüssel hinzufügen
  - Neue Übersetzungsschlüssel in `ui-react/src/config/adminTranslations.js` hinzufügen
  - Deutsch: "Diese Optionen sind nur im Dark-Mode verfügbar."
  - Englisch: "These options are only available in Dark Mode."
  - _Requirements: 4.1, 4.2_

- [-] 1.1 Property-Test für Nachrichtenlänge schreiben
  - **Property 6: Message Length Constraint**
  - **Validates: Requirements 4.2**

- [x] 2. Bedingte Rendering-Logik implementieren
  - [x] 2.1 Conditional Rendering für minimalHeaderStyle-Optionen hinzufügen
    - Optionen nur anzeigen wenn `singleRoomDarkMode === true`
    - Radio-Buttons für "Gefüllt" und "Transparent" in bedingtem Block wrappen
    - _Requirements: 1.1, 1.2_
  
  - [ ] 2.2 Property-Test für Options-Sichtbarkeit schreiben
    - **Property 1: Dark Mode Options Visibility**
    - **Validates: Requirements 1.1, 1.2**
  
  - [x] 2.3 Informationsnachricht-Komponente hinzufügen
    - Nachricht nur anzeigen wenn `singleRoomDarkMode === false`
    - Übersetzungsschlüssel verwenden
    - Styling: Subtile Info-Nachricht (graue Schrift, kleine Schriftgröße)
    - _Requirements: 1.3, 1.4, 4.1_
  
  - [ ] 2.4 Property-Test für Options-Ausblendung schreiben
    - **Property 2: Dark Mode Options Hidden**
    - **Validates: Requirements 1.3, 1.4**
  
  - [ ] 2.5 Property-Test für Informationsnachricht schreiben
    - **Property 5: Informational Message Display**
    - **Validates: Requirements 4.1**

- [ ] 3. State-Persistenz sicherstellen
  - [x] 3.1 Verifizieren dass minimalHeaderStyle-State erhalten bleibt
    - State bleibt beim Toggle von Dark-Mode erhalten
    - Werte werden korrekt vom Server geladen
    - Werte werden korrekt an Server gesendet
    - _Requirements: 3.1, 3.2_
  
  - [ ] 3.2 Property-Test für State-Persistenz schreiben
    - **Property 4: Configuration Persistence Through Toggle**
    - **Validates: Requirements 3.1, 3.2**
  
  - [ ] 3.3 Property-Test für Dark-Mode-Status-Erkennung schreiben
    - **Property 3: Dark Mode Status Detection**
    - **Validates: Requirements 2.1**

- [ ] 4. Unit-Tests schreiben
  - Test: Optionen werden angezeigt wenn Dark Mode aktiv ist
  - Test: Optionen werden ausgeblendet wenn Dark Mode inaktiv ist
  - Test: Informationsnachricht wird angezeigt wenn Dark Mode inaktiv ist
  - Test: Informationsnachricht wird ausgeblendet wenn Dark Mode aktiv ist
  - Test: minimalHeaderStyle bleibt erhalten beim Umschalten
  - Test: Dark Mode Checkbox Toggle funktioniert
  - Test: Radio Button Selection funktioniert
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 4.1_

- [ ] 5. Checkpoint - Tests ausführen und Funktionalität verifizieren
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check library
- Die Implementierung erfolgt in der bestehenden `Admin.js` Komponente
- Keine Änderungen am Backend oder API-Endpoints erforderlich
- Die Konfiguration wird weiterhin in `data/sidebar-config.json` gespeichert
