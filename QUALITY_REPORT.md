# Code-Qualitätsbericht

**Gesamt-Score: 98/100** – Bewertung: **Sehr gut**

*Erstellt am: 2026-04-06T16:32:25.645Z*

## Kategorie-Scores

| Kategorie | Score |
|-----------|-------|
| linting | 100/100 |
| complexity | 100/100 |
| coverage | 90.53/100 |
| security | 100/100 |
| dependencies | 100/100 |
| style | 100/100 |

## Alle Befunde

### Hoch (26)

- **[complexity]** app/routes.js:2161: Funktion "<anon method-65>" hat zyklomatische Komplexität von 22 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-65>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** app/routes.js:2733: Funktion "<anon method-87>" hat zyklomatische Komplexität von 21 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-87>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** app/routes.js:2955: Funktion "<anon method-94>" hat zyklomatische Komplexität von 22 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-94>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** app/routes.js:3815: Funktion "<anon method-128>" hat zyklomatische Komplexität von 26 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-128>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** app/routes.js:3933: Funktion "<anon method-130>" hat zyklomatische Komplexität von 23 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-130>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** app/routes.js:4186: Funktion "<anon method-138>" hat zyklomatische Komplexität von 22 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-138>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** app/routes.js:4553: Funktion "<anon method-149>" hat zyklomatische Komplexität von 21 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-149>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** ui-react/src/components/admin/hooks/useAdminSubmissions.js:310: Funktion "<anon method-80>" hat zyklomatische Komplexität von 25 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-80>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** ui-react/src/components/admin/hooks/useAdminConfig.js:300: Funktion "<anon method-39>" hat zyklomatische Komplexität von 21 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-39>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** ui-react/src/components/admin/hooks/useAdminConfig.js:400: Funktion "<anon method-58>" hat zyklomatische Komplexität von 24 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-58>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** ui-react/src/components/admin/Admin.jsx:82: Funktion "<anon method-2>" hat zyklomatische Komplexität von 64 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-2>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** ui-react/src/components/admin/tabs/MqttTab.jsx:7: Funktion "<anon method-1>" hat zyklomatische Komplexität von 22 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-1>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** ui-react/src/components/admin/tabs/DevicesTab.jsx:7: Funktion "getDisplayStatus" hat zyklomatische Komplexität von 21 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "getDisplayStatus" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** ui-react/src/components/admin/tabs/DevicesTab.jsx:39: Funktion "<anon method-1>" hat zyklomatische Komplexität von 22 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-1>" in kleinere Hilfsfunktionen aufteilen
- **[complexity]** ui-react/src/components/admin/tabs/DevicesTab.jsx:123: Funktion "<anon method-15>" hat zyklomatische Komplexität von 21 (Schwellenwert: 20) *(Aufwand: Groß (>4h))*
  - Vorschlag: Funktion "<anon method-15>" in kleinere Hilfsfunktionen aufteilen
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:307: Frontend-Duplikat (26 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:307 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:289 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:456: Frontend-Duplikat (40 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:456 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:290 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/modals/TouchkioModal.test.jsx:14: Frontend-Duplikat (22 Zeilen): ui-react/src/components/admin/modals/TouchkioModal.test.jsx:14 ↔ ui-react/src/components/admin/modals/modals-boost.test.jsx:113 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/modals/PowerManagementModal.test.jsx:6: Frontend-Duplikat (23 Zeilen): ui-react/src/components/admin/modals/PowerManagementModal.test.jsx:6 ↔ ui-react/src/components/admin/modals/modals-boost.test.jsx:9 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Sidebar-boost.test.jsx:131: Frontend-Duplikat (68 Zeilen): ui-react/src/components/single-room/Sidebar-boost.test.jsx:131 ↔ ui-react/src/components/single-room/Sidebar-boost.test.jsx:107 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/flightboard/RoomFilter.test.jsx:109: Frontend-Duplikat (72 Zeilen): ui-react/src/components/flightboard/RoomFilter.test.jsx:109 ↔ ui-react/src/components/flightboard/RoomFilter.test.jsx:96 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/flightboard/Navbar.test.jsx:37: Frontend-Duplikat (45 Zeilen): ui-react/src/components/flightboard/Navbar.test.jsx:37 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:291 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/booking/ExtendMeetingModal.test.jsx:57: Frontend-Duplikat (49 Zeilen): ui-react/src/components/booking/ExtendMeetingModal.test.jsx:57 ↔ ui-react/src/components/booking/ExtendMeetingModal.test.jsx:49 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/booking/BookingModal.jsx:164: Frontend-Duplikat (34 Zeilen): ui-react/src/components/booking/BookingModal.jsx:164 ↔ ui-react/src/components/booking/ExtendMeetingModal.jsx:173 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:139: Frontend-Duplikat (26 Zeilen): ui-react/src/register-service-worker.test.js:139 ↔ ui-react/src/register-service-worker.test.js:100 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:297: Frontend-Duplikat (33 Zeilen): ui-react/src/register-service-worker.test.js:297 ↔ ui-react/src/register-service-worker.test.js:54 *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren

### Mittel (104)

- **[complexity]** app/touchkio.js: Datei hat 1072 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[complexity]** app/socket-controller.js: Datei hat 1183 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[complexity]** app/routes.js: Datei hat 4774 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[complexity]** app/routes.js: app/routes.js sollte in separate Router-Module aufgeteilt werden *(Aufwand: Groß (>4h))*
  - Vorschlag: app/routes.js in separate Router-Module aufteilen:
  - routes/graph-api.js (10 Funktionen)
  - routes/admin-auth.js (21 Funktionen)
  - routes/config-management.js (6 Funktionen)
  - routes/power-management.js (1 Funktionen)
  - routes/booking.js (11 Funktionen)
  - routes/helpers.js (170 Funktionen)
- **[complexity]** app/config-manager.js: Datei hat 3023 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[complexity]** ui-react/src/config/admin-translations.js: Datei hat 889 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[complexity]** ui-react/src/components/single-room/Display.test.jsx: Datei hat 642 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[complexity]** ui-react/src/components/admin/Admin.test.jsx: Datei hat 1512 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[complexity]** ui-react/src/components/admin/Admin.jsx: Datei hat 623 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[complexity]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx: Datei hat 520 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[complexity]** ui-react/src/components/admin/tabs/admin-tabs-oauth-booking.test.jsx: Datei hat 514 Zeilen und überschreitet den Schwellenwert von 500 Zeilen *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Datei in kleinere Module aufteilen, um unter 500 Zeilen zu bleiben
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:208: Frontend-Duplikat (17 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:208 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:186 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:291: Frontend-Duplikat (13 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:291 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:290 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:291: Frontend-Duplikat (17 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:291 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:188 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:392: Frontend-Duplikat (13 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:392 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:270 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:405: Frontend-Duplikat (15 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:405 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:186 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:426: Frontend-Duplikat (18 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:426 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:289 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:430: Frontend-Duplikat (14 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:430 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:210 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:128: Frontend-Duplikat (12 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:128 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:114 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:204: Frontend-Duplikat (13 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:204 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:182 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:304: Frontend-Duplikat (12 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:304 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:286 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/admin-tabs-oauth-booking.test.jsx:290: Frontend-Duplikat (18 Zeilen): ui-react/src/components/admin/tabs/admin-tabs-oauth-booking.test.jsx:290 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:466 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/LogoTab.jsx:30: Frontend-Duplikat (7 Zeilen): ui-react/src/components/admin/tabs/LogoTab.jsx:30 ↔ ui-react/src/components/admin/tabs/WiFiTab.jsx:25 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/tabs/DisplayTab.jsx:58: Frontend-Duplikat (7 Zeilen): ui-react/src/components/admin/tabs/DisplayTab.jsx:58 ↔ ui-react/src/components/admin/tabs/WiFiTab.jsx:25 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/services/mqtt-commands.js:159: Frontend-Duplikat (18 Zeilen): ui-react/src/components/admin/services/mqtt-commands.js:159 ↔ ui-react/src/components/admin/services/mqtt-commands.js:142 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/services/admin-submissions.js:219: Frontend-Duplikat (13 Zeilen): ui-react/src/components/admin/services/admin-submissions.js:219 ↔ ui-react/src/components/admin/services/admin-submissions.js:62 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/services/admin-submissions.js:310: Frontend-Duplikat (16 Zeilen): ui-react/src/components/admin/services/admin-submissions.js:310 ↔ ui-react/src/components/admin/services/admin-submissions.js:282 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/services/admin-submissions.js:327: Frontend-Duplikat (17 Zeilen): ui-react/src/components/admin/services/admin-submissions.js:327 ↔ ui-react/src/components/admin/services/admin-submissions.js:282 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/services/admin-submissions.js:345: Frontend-Duplikat (10 Zeilen): ui-react/src/components/admin/services/admin-submissions.js:345 ↔ ui-react/src/components/admin/services/admin-submissions.js:216 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/services/admin-submissions-extended.test.js:50: Frontend-Duplikat (7 Zeilen): ui-react/src/components/admin/services/admin-submissions-extended.test.js:50 ↔ ui-react/src/components/admin/services/admin-submissions-extended.test.js:27 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/services/admin-submissions-extended.test.js:153: Frontend-Duplikat (8 Zeilen): ui-react/src/components/admin/services/admin-submissions-extended.test.js:153 ↔ ui-react/src/components/admin/services/admin-submissions-extended.test.js:27 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/services/admin-submissions-extended.test.js:169: Frontend-Duplikat (8 Zeilen): ui-react/src/components/admin/services/admin-submissions-extended.test.js:169 ↔ ui-react/src/components/admin/services/admin-submissions-extended.test.js:27 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/modals/modals-boost.test.jsx:229: Frontend-Duplikat (7 Zeilen): ui-react/src/components/admin/modals/modals-boost.test.jsx:229 ↔ ui-react/src/components/admin/modals/modals-boost.test.jsx:206 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/wifi/WiFiInfo.test.jsx:170: Frontend-Duplikat (8 Zeilen): ui-react/src/components/wifi/WiFiInfo.test.jsx:170 ↔ ui-react/src/components/wifi/WiFiInfo.test.jsx:157 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/wifi/WiFiInfo-boost.test.jsx:174: Frontend-Duplikat (10 Zeilen): ui-react/src/components/wifi/WiFiInfo-boost.test.jsx:174 ↔ ui-react/src/components/wifi/WiFiInfo-boost.test.jsx:154 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/wifi/WiFiInfo-boost.test.jsx:196: Frontend-Duplikat (8 Zeilen): ui-react/src/components/wifi/WiFiInfo-boost.test.jsx:196 ↔ ui-react/src/components/wifi/WiFiInfo-boost.test.jsx:103 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/display-service.test.js:187: Frontend-Duplikat (7 Zeilen): ui-react/src/components/single-room/display-service.test.js:187 ↔ ui-react/src/components/single-room/display-service.test.js:144 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Sidebar-boost.test.jsx:6: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Sidebar-boost.test.jsx:6 ↔ ui-react/src/components/single-room/Sidebar.test.jsx:7 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Sidebar-boost.test.jsx:174: Frontend-Duplikat (7 Zeilen): ui-react/src/components/single-room/Sidebar-boost.test.jsx:174 ↔ ui-react/src/components/single-room/Sidebar-boost.test.jsx:163 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Sidebar-boost.test.jsx:185: Frontend-Duplikat (7 Zeilen): ui-react/src/components/single-room/Sidebar-boost.test.jsx:185 ↔ ui-react/src/components/single-room/Sidebar-boost.test.jsx:53 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Sidebar-boost.test.jsx:205: Frontend-Duplikat (10 Zeilen): ui-react/src/components/single-room/Sidebar-boost.test.jsx:205 ↔ ui-react/src/components/single-room/Sidebar-boost.test.jsx:53 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Sidebar-boost.test.jsx:214: Frontend-Duplikat (8 Zeilen): ui-react/src/components/single-room/Sidebar-boost.test.jsx:214 ↔ ui-react/src/components/single-room/Sidebar-boost.test.jsx:41 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Sidebar-boost.test.jsx:225: Frontend-Duplikat (10 Zeilen): ui-react/src/components/single-room/Sidebar-boost.test.jsx:225 ↔ ui-react/src/components/single-room/Sidebar-boost.test.jsx:53 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Sidebar-boost.test.jsx:234: Frontend-Duplikat (8 Zeilen): ui-react/src/components/single-room/Sidebar-boost.test.jsx:234 ↔ ui-react/src/components/single-room/Sidebar-boost.test.jsx:214 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Sidebar-boost.test.jsx:308: Frontend-Duplikat (8 Zeilen): ui-react/src/components/single-room/Sidebar-boost.test.jsx:308 ↔ ui-react/src/components/single-room/Sidebar-boost.test.jsx:88 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:139: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:139 ↔ ui-react/src/components/single-room/Display.test.jsx:94 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:162: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:162 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:226: Frontend-Duplikat (7 Zeilen): ui-react/src/components/single-room/Display.test.jsx:226 ↔ ui-react/src/components/single-room/Display.test.jsx:191 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:342: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:342 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:359: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:359 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:374: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:374 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:389: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:389 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:404: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:404 ↔ ui-react/src/components/single-room/Display.test.jsx:94 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:421: Frontend-Duplikat (10 Zeilen): ui-react/src/components/single-room/Display.test.jsx:421 ↔ ui-react/src/components/single-room/Display.test.jsx:94 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:436: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:436 ↔ ui-react/src/components/single-room/Display.test.jsx:94 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:456: Frontend-Duplikat (10 Zeilen): ui-react/src/components/single-room/Display.test.jsx:456 ↔ ui-react/src/components/single-room/Display.test.jsx:94 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:500: Frontend-Duplikat (7 Zeilen): ui-react/src/components/single-room/Display.test.jsx:500 ↔ ui-react/src/components/single-room/Display.test.jsx:482 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:536: Frontend-Duplikat (17 Zeilen): ui-react/src/components/single-room/Display.test.jsx:536 ↔ ui-react/src/components/single-room/Display.test.jsx:519 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:561: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:561 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:579: Frontend-Duplikat (12 Zeilen): ui-react/src/components/single-room/Display.test.jsx:579 ↔ ui-react/src/components/single-room/Display.test.jsx:150 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:602: Frontend-Duplikat (10 Zeilen): ui-react/src/components/single-room/Display.test.jsx:602 ↔ ui-react/src/components/single-room/Display.test.jsx:240 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:612: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:612 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display.test.jsx:627: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display.test.jsx:627 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:10: Frontend-Duplikat (8 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:10 ↔ ui-react/src/components/single-room/Display.test.jsx:12 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:50: Frontend-Duplikat (12 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:50 ↔ ui-react/src/components/single-room/Display.test.jsx:74 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:79: Frontend-Duplikat (8 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:79 ↔ ui-react/src/components/single-room/Display.test.jsx:192 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:90: Frontend-Duplikat (18 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:90 ↔ ui-react/src/components/single-room/Display.test.jsx:519 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:111: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:111 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:131: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:131 ↔ ui-react/src/components/single-room/Display.test.jsx:576 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:162: Frontend-Duplikat (14 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:162 ↔ ui-react/src/components/single-room/Display.test.jsx:223 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:182: Frontend-Duplikat (17 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:182 ↔ ui-react/src/components/single-room/Display-boost.test.jsx:162 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:202: Frontend-Duplikat (17 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:202 ↔ ui-react/src/components/single-room/Display-boost.test.jsx:162 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:218: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:218 ↔ ui-react/src/components/single-room/Display.test.jsx:102 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/single-room/Display-boost.test.jsx:231: Frontend-Duplikat (9 Zeilen): ui-react/src/components/single-room/Display-boost.test.jsx:231 ↔ ui-react/src/components/single-room/Display.test.jsx:591 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/global/ConnectionStatus.test.jsx:65: Frontend-Duplikat (9 Zeilen): ui-react/src/components/global/ConnectionStatus.test.jsx:65 ↔ ui-react/src/components/global/ConnectionStatus.test.jsx:38 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/global/ConnectionStatus.test.jsx:96: Frontend-Duplikat (7 Zeilen): ui-react/src/components/global/ConnectionStatus.test.jsx:96 ↔ ui-react/src/components/global/ConnectionStatus.test.jsx:50 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/global/ConnectionStatus.test.jsx:97: Frontend-Duplikat (10 Zeilen): ui-react/src/components/global/ConnectionStatus.test.jsx:97 ↔ ui-react/src/components/global/ConnectionStatus.test.jsx:38 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/global/ConnectionStatus.test.jsx:126: Frontend-Duplikat (10 Zeilen): ui-react/src/components/global/ConnectionStatus.test.jsx:126 ↔ ui-react/src/components/global/ConnectionStatus.test.jsx:50 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/flightboard/Navbar.test.jsx:101: Frontend-Duplikat (9 Zeilen): ui-react/src/components/flightboard/Navbar.test.jsx:101 ↔ ui-react/src/components/single-room/Sidebar.test.jsx:180 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/flightboard/FlightboardRow.test.jsx:107: Frontend-Duplikat (11 Zeilen): ui-react/src/components/flightboard/FlightboardRow.test.jsx:107 ↔ ui-react/src/components/single-room/RoomStatusBlock.test.jsx:232 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/flightboard/Flightboard.test.jsx:9: Frontend-Duplikat (17 Zeilen): ui-react/src/components/flightboard/Flightboard.test.jsx:9 ↔ ui-react/src/components/single-room/Display.test.jsx:27 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/flightboard/Flightboard.test.jsx:55: Frontend-Duplikat (10 Zeilen): ui-react/src/components/flightboard/Flightboard.test.jsx:55 ↔ ui-react/src/components/single-room/Display.test.jsx:78 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/flightboard/Flightboard.jsx:112: Frontend-Duplikat (8 Zeilen): ui-react/src/components/flightboard/Flightboard.jsx:112 ↔ ui-react/src/components/single-room/Display.jsx:148 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/flightboard/Clock.test.js:5: Frontend-Duplikat (9 Zeilen): ui-react/src/components/flightboard/Clock.test.js:5 ↔ ui-react/src/components/single-room/Clock.test.js:5 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/booking/ExtendMeetingModal.jsx:129: Frontend-Duplikat (11 Zeilen): ui-react/src/components/booking/ExtendMeetingModal.jsx:129 ↔ ui-react/src/components/booking/ExtendMeetingModal.jsx:80 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/booking/BookingModal.jsx:153: Frontend-Duplikat (17 Zeilen): ui-react/src/components/booking/BookingModal.jsx:153 ↔ ui-react/src/components/booking/ExtendMeetingModal.jsx:162 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/booking/BookingModal.jsx:72: Frontend-Duplikat (13 Zeilen): ui-react/src/components/booking/BookingModal.jsx:72 ↔ ui-react/src/components/booking/ExtendMeetingModal.jsx:44 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/booking/BookingModal.jsx:147: Frontend-Duplikat (17 Zeilen): ui-react/src/components/booking/BookingModal.jsx:147 ↔ ui-react/src/components/booking/ExtendMeetingModal.jsx:157 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/booking/BookingModal.jsx:200: Frontend-Duplikat (19 Zeilen): ui-react/src/components/booking/BookingModal.jsx:200 ↔ ui-react/src/components/booking/ExtendMeetingModal.jsx:208 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/components/admin/AdminContext.test.jsx:72: Frontend-Duplikat (13 Zeilen): ui-react/src/components/admin/AdminContext.test.jsx:72 ↔ ui-react/src/components/admin/AdminContext.test.jsx:57 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/layouts/FlightboardLayout.test.jsx:21: Frontend-Duplikat (9 Zeilen): ui-react/src/layouts/FlightboardLayout.test.jsx:21 ↔ ui-react/src/components/flightboard/Navbar.test.jsx:21 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/config/admin-translations.js:827: Frontend-Duplikat (11 Zeilen): ui-react/src/config/admin-translations.js:827 ↔ ui-react/src/config/maintenance-messages.js:59 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:89: Frontend-Duplikat (11 Zeilen): ui-react/src/register-service-worker.test.js:89 ↔ ui-react/src/register-service-worker.test.js:50 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:110: Frontend-Duplikat (10 Zeilen): ui-react/src/register-service-worker.test.js:110 ↔ ui-react/src/register-service-worker.test.js:70 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:128: Frontend-Duplikat (17 Zeilen): ui-react/src/register-service-worker.test.js:128 ↔ ui-react/src/register-service-worker.test.js:50 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:173: Frontend-Duplikat (13 Zeilen): ui-react/src/register-service-worker.test.js:173 ↔ ui-react/src/register-service-worker.test.js:137 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:185: Frontend-Duplikat (10 Zeilen): ui-react/src/register-service-worker.test.js:185 ↔ ui-react/src/register-service-worker.test.js:110 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:217: Frontend-Duplikat (12 Zeilen): ui-react/src/register-service-worker.test.js:217 ↔ ui-react/src/register-service-worker.test.js:69 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:232: Frontend-Duplikat (16 Zeilen): ui-react/src/register-service-worker.test.js:232 ↔ ui-react/src/register-service-worker.test.js:201 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:247: Frontend-Duplikat (17 Zeilen): ui-react/src/register-service-worker.test.js:247 ↔ ui-react/src/register-service-worker.test.js:216 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:276: Frontend-Duplikat (12 Zeilen): ui-react/src/register-service-worker.test.js:276 ↔ ui-react/src/register-service-worker.test.js:108 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/register-service-worker.test.js:353: Frontend-Duplikat (10 Zeilen): ui-react/src/register-service-worker.test.js:353 ↔ ui-react/src/register-service-worker.test.js:337 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[duplication]** ui-react/src/index.jsx:18: Frontend-Duplikat (10 Zeilen): ui-react/src/index.jsx:18 ↔ ui-react/src/main.jsx:78 *(Aufwand: Klein (<1h))*
  - Vorschlag: Duplizierten Code in ein gemeinsames Modul extrahieren
- **[coverage]** ui-react/src/components/admin/Admin.jsx: Testabdeckung 38.1% liegt unter dem Schwellenwert von 50% *(Aufwand: Mittel (1–4h))*
  - Vorschlag: Tests für Admin.jsx hinzufügen, um die Abdeckung zu erhöhen

## Top-10 Quick Wins

1. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:208: Frontend-Duplikat (17 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:208 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:186
   - Duplizierten Code in ein gemeinsames Modul extrahieren
2. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:291: Frontend-Duplikat (13 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:291 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:290
   - Duplizierten Code in ein gemeinsames Modul extrahieren
3. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:291: Frontend-Duplikat (17 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:291 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:188
   - Duplizierten Code in ein gemeinsames Modul extrahieren
4. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:392: Frontend-Duplikat (13 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:392 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:270
   - Duplizierten Code in ein gemeinsames Modul extrahieren
5. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:405: Frontend-Duplikat (15 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:405 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:186
   - Duplizierten Code in ein gemeinsames Modul extrahieren
6. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:426: Frontend-Duplikat (18 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:426 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:289
   - Duplizierten Code in ein gemeinsames Modul extrahieren
7. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:430: Frontend-Duplikat (14 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:430 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:210
   - Duplizierten Code in ein gemeinsames Modul extrahieren
8. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:128: Frontend-Duplikat (12 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:128 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:114
   - Duplizierten Code in ein gemeinsames Modul extrahieren
9. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:204: Frontend-Duplikat (13 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:204 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:182
   - Duplizierten Code in ein gemeinsames Modul extrahieren
10. **[Mittel]** ui-react/src/components/admin/tabs/admin-tabs.test.jsx:304: Frontend-Duplikat (12 Zeilen): ui-react/src/components/admin/tabs/admin-tabs.test.jsx:304 ↔ ui-react/src/components/admin/tabs/admin-tabs.test.jsx:286
   - Duplizierten Code in ein gemeinsames Modul extrahieren

## Nächste Schritte

### linting

- ESLint-Fehler beheben (ggf. mit --fix)
- Verbleibende Warnungen manuell prüfen und korrigieren
- ESLint in CI/CD-Pipeline integrieren

### complexity

- Funktionen mit hoher Komplexität in kleinere Hilfsfunktionen aufteilen
- Überdimensionierte Dateien in separate Module extrahieren
- app/routes.js in separate Router-Module aufteilen

### duplication

- Duplizierte Code-Blöcke in gemeinsame Utility-Module extrahieren
- Gemeinsame Funktionen zwischen routes.js und socket-controller.js konsolidieren

### coverage

- Backend-Unit-Tests erstellen (aktuell keine vorhanden)
- Frontend-Dateien mit niedriger Coverage gezielt testen
- Coverage-Schwellenwert von 50% als CI-Gate einrichten

### security

- Alle kritischen Sicherheitsbefunde sofort beheben
- npm audit Schwachstellen durch Updates oder Patches schließen
- Sensible Daten aus Log-Ausgaben entfernen

### dependencies

- Veraltete Abhängigkeiten aktualisieren
- Deprecated Pakete durch aktuelle Alternativen ersetzen
- Regelmäßige Dependency-Updates einplanen (z.B. Dependabot)

### style

- Einheitliche Formatierung mit EditorConfig durchsetzen
- Gemischte Tabs/Spaces bereinigen
- JSDoc-Kommentare für exportierte Funktionen ergänzen
