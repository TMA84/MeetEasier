---
# Installationsanleitung

## Voraussetzungen
Stellen Sie sicher, dass die folgenden Bedingungen erfüllt sind, bevor Sie mit der Installation fortfahren:

- **Node.js** Version 20 oder höher
- **npm** Version 9 oder höher
- Eine bestehende Microsoft 365-Integration, einschließlich:
  - Microsoft Graph API Anmeldung
  - Azure Active Directory konfiguriert
- Ein Webserver zum Hosten der Anwendung

## Schritte zur Installation

### 1. Projekt klonen
Klonen Sie das Repository auf Ihren lokalen Rechner:
```bash
git clone https://github.com/TMA84/MeetEasier.git
cd MeetEasier
```

### 2. Abhängigkeiten installieren
Installieren Sie die benötigten Abhängigkeiten:
```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren
Eine Vorlage für Umgebungsvariablen ist in der Datei `.env.template` enthalten. Erstellen Sie eine neue `.env`-Datei, indem Sie die Vorlage kopieren, und passen Sie die Werte an:
```bash
cp .env.template .env
```
Bearbeiten Sie die `.env`-Datei, um Ihre Microsoft Graph API-Anmeldeinformationen und andere Einstellungen hinzuzufügen.

### 4. Anwendung bauen
Bauen Sie das Projekt, bevor Sie es starten:
```bash
npm run build
```

### 5. Server starten
Starten Sie den Server mit folgendem Befehl:
```bash
npm start
```
Die Anwendung läuft standardmäßig auf [http://localhost:8080](http://localhost:8080).

### 6. Entwicklungsmodus (optional)
Für die Entwicklung können Sie den Entwicklungsmodus verwenden, um Backend- und Frontend-Änderungen überwachen zu lassen:
```bash
npm run start-dev
```

## Docker-Installation

### Docker-Image bauen und ausführen

1. Bauen Sie das Docker-Image:
```bash
docker build -t meeteasier .
```

2. Starten Sie den Container:
```bash
docker run -d -p 8080:8080 \
  -e OAUTH_CLIENT_ID=client_id \
  -e OAUTH_AUTHORITY=https://login.microsoftonline.com/tenant_id \
  -e OAUTH_CLIENT_SECRET=client_secret \
  -e API_TOKEN=secure_token \
  --name meeteasier \
  meeteasier
```

Damit ist die Installation abgeschlossen. Die Anwendung ist jetzt betriebsbereit.
---
