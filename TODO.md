# TODO

## Refactoring: Inline-Styles nach SCSS auslagern

Alle CSS-Konfigurationen sollten in den `scss/`-Ordner verschoben werden, um Konsistenz mit dem restlichen Projekt zu gewährleisten.

### Analyse (309 Inline-Styles in 11 Dateien)

| # | Datei | Inline-Styles | Priorität |
|---|-------|--------------|-----------|
| 1 | `Admin.js` | 118 | Hoch |
| 2 | `TouchkioModal.js` | 92 | Hoch |
| 3 | `DevicesTab.js` | 30 | Mittel |
| 4 | `ColorsTab.js` | 29 | Mittel |
| 5 | `BookingTab.js` | 15 | Niedrig |
| 6 | `TranslationsTab.js` | 10 | Niedrig |
| 7 | `DisplayTab.js` | 10 | Niedrig |
| 8 | `MqttTab.js` | 2 | Niedrig |
| 9 | `PowerManagementModal.js` | 2 | Niedrig |
| 10 | `BackupTab.js` | 1 | Niedrig |
| 11 | `AuditTab.js` | 1 | Niedrig |

### Dateien ohne Inline-Styles (keine Änderung nötig)
`AdminContext.js`, `colorHelpers.js`, `translationHelpers.js`, `adminApi.js`, `ApiTokenTab.js`, `OAuthTab.js`, `RateLimitTab.js`, `SearchTab.js`, `SystemTab.js`, `TranslationApiTab.js`, `LogoTab.js`, `MaintenanceTab.js`, `WiFiTab.js`

### Status
- [x] TouchkioModal.js → SCSS
- [ ] DevicesTab.js → SCSS
- [ ] Admin.js → SCSS
- [x] ColorsTab.js → SCSS
- [ ] BookingTab.js → SCSS
- [ ] TranslationsTab.js → SCSS
- [ ] DisplayTab.js → SCSS
- [ ] MqttTab.js → SCSS
- [ ] PowerManagementModal.js → SCSS
- [ ] BackupTab.js → SCSS
- [ ] AuditTab.js → SCSS

## Offene Punkte
- [ ] Modal Width Fix committen (v1.7.16)
