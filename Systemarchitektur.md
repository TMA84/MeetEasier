---
# Systemarchitektur

## Hauptkomponenten
Die Systemarchitektur von MeetEasier ist modular aufgebaut und beinhaltet folgende zentrale Komponenten:

### 1. Backend-Module
- **`app/`**: Beinhaltet die Routen und Logik der Microsoft Graph API und veraltete EWS-APIs.
- **`config/`**: Konfigurationsdateien für die Servereinstellungen.
- **`data/`**: Enthält Konfigurationsdateien für Logos, WiFi-Einstellungen und Sidebar.
- **`app/wifi-manager.js`**: Verwaltung der WiFi-Konfiguration einschließlich QR-Code-Erstellung.
- **`app/socket-controller.js`**: Implementierung von Echtzeit-Updates mit Socket.IO.

### 2. Frontend-Module
- **`ui-react/`**: Frontend-Komponenten, die auf React basieren.
  - **Komponenten**: Geteilt in globale Layouts wie `flightboard`, `single-room`, `wifi`.
  - **Konfigurierbare Layouts**: Passend für kompakte und minimalistische Anzeigen.
- **`scss/`**: Gestaltung und Styling mit Unterstützung für modernes SASS.

### 3. Schnitstellen und APIs
- REST-APIs und Admin-Endpunkte:
  - API für WiFi-Einstellungen.
  - API-Konfigurationen für Logos und Sidebar.

## Verzeichnisstruktur
Eine Übersicht der wichtigsten Ordner in der Basisstruktur des Projekts:
- **`app/`** - Enthält alle backendseitigen Logiken wie Controller und spezifische APIs.
- **`static/`** - Statische Ressourcen wie Bilder und hochladbare Dateien.
- **`ui-react/components`** - Beispielhafte React-Komponentenstruktur für spezialisierte Layouts.

## Sicherheitskonzepte
- OAuth2 Authentifizierung mit den Graph-API-Endpunkten.
- API-Token-basierter Zugriffsschutz für Admin-Endpunkte.

---