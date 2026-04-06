# Requirements Document

## Einleitung

MeetEasier ist eine Node.js/Express-Anwendung zur Anzeige von Raumbuchungen. Aktuell nutzt sie ausschließlich die Microsoft Graph API für alle Kalenderoperationen (Raumlisten abrufen, Räume abrufen, Termine anzeigen, Buchungen erstellen, Meetings verlängern, Meetings vorzeitig beenden, No-Show-Freigabe). Dieses Feature führt eine Calendar-Provider-Abstraktionsschicht ein, die sowohl Microsoft Graph als auch Google Calendar (Google Workspace Calendar Resources) unterstützt. Der aktive Provider wird im Admin Panel konfiguriert; es ist jeweils nur ein Provider gleichzeitig aktiv.

## Glossar

- **Calendar_Provider**: Abstraktionsschicht, die eine einheitliche Schnittstelle für Kalenderoperationen bereitstellt, unabhängig vom darunterliegenden Backend (Microsoft Graph oder Google Calendar).
- **Microsoft_Provider**: Implementierung des Calendar_Provider, die Microsoft Graph API und MSAL-Authentifizierung nutzt (bestehende Funktionalität).
- **Google_Provider**: Implementierung des Calendar_Provider, die Google Calendar API und Google Workspace Admin SDK nutzt.
- **Provider_Registry**: Modul, das den aktuell konfigurierten Calendar_Provider verwaltet und die korrekte Implementierung an aufrufende Module liefert.
- **Room_List**: Logische Gruppierung von Räumen. Bei Microsoft: Exchange Room Lists. Bei Google: Gebäude (Buildings) aus der Directory API.
- **Room_Resource**: Ein einzelner buchbarer Raum. Bei Microsoft: Room-Objekt aus der Places API. Bei Google: Calendar Resource aus der Admin SDK Directory API.
- **Calendar_Event**: Ein Termin/Meeting in einem Raumkalender mit Start, Ende, Betreff, Organisator und Sichtbarkeit.
- **OAuth_Credentials**: Authentifizierungsdaten für den jeweiligen Provider (Client ID, Client Secret, Tenant/Domain).
- **Service_Account**: Google-spezifisches Authentifizierungskonzept. Ein JSON-Schlüssel, der domain-weite Delegation nutzt, um auf Kalenderressourcen zuzugreifen.
- **Admin_Panel**: React-basierte Administrationsoberfläche zur Konfiguration der Anwendung.
- **Socket_Controller**: Modul (`socket-controller.js`), das zyklisch Raumdaten abruft und per Socket.IO an verbundene Clients sendet.

## Requirements

### Requirement 1: Calendar Provider Interface

**User Story:** Als Entwickler möchte ich eine einheitliche Calendar-Provider-Schnittstelle, damit alle Kalenderoperationen provider-unabhängig aufgerufen werden können.

#### Acceptance Criteria

1. THE Calendar_Provider SHALL definieren folgende Operationen als einheitliche Schnittstelle: getRoomLists, getRooms, getCalendarView, createEvent, updateEventEnd, deleteEvent.
2. WHEN getRoomLists aufgerufen wird, THE Calendar_Provider SHALL ein Array von Objekten mit den Feldern displayName und id zurückgeben.
3. WHEN getRooms mit einer Room_List-ID aufgerufen wird, THE Calendar_Provider SHALL ein Array von Objekten mit den Feldern displayName, email und roomListName zurückgeben.
4. WHEN getCalendarView mit einer Raum-E-Mail, Startzeit und Endzeit aufgerufen wird, THE Calendar_Provider SHALL ein Array von Calendar_Event-Objekten mit den Feldern id, subject, organizer, start, end und sensitivity zurückgeben.
5. WHEN createEvent mit einer Raum-E-Mail und Buchungsdetails (subject, startTime, endTime, description) aufgerufen wird, THE Calendar_Provider SHALL einen neuen Termin im Raumkalender erstellen und ein Objekt mit eventId zurückgeben.
6. WHEN updateEventEnd mit einer Raum-E-Mail, Event-ID und neuem Endzeitpunkt aufgerufen wird, THE Calendar_Provider SHALL die Endzeit des bestehenden Termins aktualisieren.
7. WHEN deleteEvent mit einer Raum-E-Mail und Event-ID aufgerufen wird, THE Calendar_Provider SHALL den Termin aus dem Raumkalender entfernen.
8. IF eine Provider-Operation fehlschlägt, THEN THE Calendar_Provider SHALL einen Error mit einer aussagekräftigen Fehlermeldung werfen, die den Provider-Typ und die fehlgeschlagene Operation benennt.

### Requirement 2: Provider Registry und Konfiguration

**User Story:** Als Administrator möchte ich den aktiven Calendar Provider konfigurieren können, damit die Anwendung entweder mit Microsoft 365 oder Google Workspace arbeitet.

#### Acceptance Criteria

1. THE Provider_Registry SHALL genau einen aktiven Calendar_Provider zur Laufzeit bereitstellen.
2. THE Provider_Registry SHALL den konfigurierten Provider-Typ aus der persistierten Konfiguration laden (Werte: "microsoft" oder "google").
3. WHEN kein Provider-Typ konfiguriert ist, THE Provider_Registry SHALL "microsoft" als Standard-Provider verwenden.
4. WHEN der Provider-Typ in der Konfiguration geändert wird, THE Provider_Registry SHALL den aktiven Provider wechseln, ohne dass ein Neustart der Anwendung erforderlich ist.
5. WHILE ein Provider-Wechsel stattfindet, THE Provider_Registry SHALL laufende Polling-Zyklen im Socket_Controller abschließen lassen, bevor der neue Provider aktiviert wird.
6. IF ein ungültiger Provider-Typ konfiguriert wird, THEN THE Provider_Registry SHALL den Wert ablehnen und eine Fehlermeldung zurückgeben.

### Requirement 3: Microsoft Provider (Refactoring bestehender Logik)

**User Story:** Als Entwickler möchte ich die bestehende Microsoft Graph-Logik in das Calendar-Provider-Interface überführen, damit sie als austauschbare Implementierung funktioniert.

#### Acceptance Criteria

1. THE Microsoft_Provider SHALL alle Operationen des Calendar_Provider-Interface implementieren, indem die bestehende Logik aus `app/msgraph/graph.js`, `app/msgraph/rooms.js`, `app/msgraph/roomlists.js` und `app/msgraph/booking.js` gekapselt wird.
2. THE Microsoft_Provider SHALL die bestehende MSAL-Authentifizierung (Client Credentials Flow) für die Token-Beschaffung verwenden.
3. THE Microsoft_Provider SHALL die bestehenden Konfigurationswerte (OAUTH_CLIENT_ID, OAUTH_AUTHORITY, OAUTH_CLIENT_SECRET) aus der Admin-Konfiguration und Umgebungsvariablen nutzen.
4. WHEN der Microsoft_Provider als aktiver Provider konfiguriert ist, THE Anwendung SHALL sich funktional identisch zur aktuellen Implementierung verhalten.
5. THE Microsoft_Provider SHALL die bestehende Paginierung (getPaginatedResults) für Graph-API-Aufrufe beibehalten.
6. THE Microsoft_Provider SHALL die bestehenden Retry- und Timeout-Einstellungen (graphFetchTimeoutMs, graphFetchRetryAttempts, graphFetchRetryBaseMs) respektieren.

### Requirement 4: Google Calendar Provider

**User Story:** Als Administrator einer Google-Workspace-Organisation möchte ich MeetEasier mit Google Calendar nutzen, damit Raumverfügbarkeiten und Buchungen über Google Workspace verwaltet werden.

#### Acceptance Criteria

1. THE Google_Provider SHALL alle Operationen des Calendar_Provider-Interface implementieren.
2. THE Google_Provider SHALL sich über ein Google Service_Account-JSON-Schlüsselpaar mit domain-weiter Delegation authentifizieren.
3. WHEN getRoomLists aufgerufen wird, THE Google_Provider SHALL Gebäude (Buildings) über die Google Workspace Admin SDK Directory API abrufen und als Room_List-Objekte zurückgeben.
4. WHEN getRooms aufgerufen wird, THE Google_Provider SHALL Calendar Resources über die Google Workspace Admin SDK Directory API abrufen, gefiltert nach dem angegebenen Gebäude, und als Room_Resource-Objekte zurückgeben.
5. WHEN getCalendarView aufgerufen wird, THE Google_Provider SHALL Termine über die Google Calendar API (events.list) für den angegebenen Raumkalender abrufen.
6. WHEN createEvent aufgerufen wird, THE Google_Provider SHALL einen neuen Termin über die Google Calendar API (events.insert) im Raumkalender erstellen.
7. WHEN updateEventEnd aufgerufen wird, THE Google_Provider SHALL die Endzeit eines bestehenden Termins über die Google Calendar API (events.patch) aktualisieren.
8. WHEN deleteEvent aufgerufen wird, THE Google_Provider SHALL den Termin über die Google Calendar API (events.delete) aus dem Raumkalender entfernen.
9. THE Google_Provider SHALL die Google Calendar Resource-E-Mail-Adresse als Kalender-ID für alle Calendar-API-Aufrufe verwenden.
10. IF die Google-API ein Quota-Limit oder einen Rate-Limit-Fehler (HTTP 429) zurückgibt, THEN THE Google_Provider SHALL den Aufruf mit exponentiellem Backoff wiederholen (maximal 3 Versuche).

### Requirement 5: Google OAuth-Konfiguration im Admin Panel

**User Story:** Als Administrator möchte ich die Google-Workspace-Zugangsdaten im Admin Panel konfigurieren, damit ich den Google Provider einrichten kann, ohne Umgebungsvariablen manuell zu bearbeiten.

#### Acceptance Criteria

1. WHEN der Provider-Typ "google" ausgewählt ist, THE Admin_Panel SHALL Eingabefelder für die Google-Konfiguration anzeigen: Service-Account-E-Mail, Customer-ID und ein Upload-Feld für den Service-Account-JSON-Schlüssel.
2. WHEN der Provider-Typ "microsoft" ausgewählt ist, THE Admin_Panel SHALL die bestehenden OAuth-Felder (Client ID, Tenant ID, Client Secret) anzeigen.
3. THE Admin_Panel SHALL einen Umschalter (Toggle oder Dropdown) für die Auswahl des Provider-Typs ("Microsoft 365" oder "Google Workspace") bereitstellen.
4. WHEN ein Service-Account-JSON-Schlüssel hochgeladen wird, THE Admin_Panel SHALL die JSON-Struktur validieren und prüfen, ob die Felder client_email, private_key und project_id vorhanden sind.
5. WHEN die Google-Konfiguration gespeichert wird, THE Admin_Panel SHALL den private_key verschlüsselt auf der Festplatte speichern (analog zur bestehenden Client-Secret-Verschlüsselung).
6. IF die Google-Konfiguration unvollständig ist (fehlende Pflichtfelder), THEN THE Admin_Panel SHALL eine Fehlermeldung anzeigen und das Speichern verhindern.
7. THE Admin_Panel SHALL die aktuell konfigurierte Google-Service-Account-E-Mail und Customer-ID als Nur-Lese-Werte anzeigen, wenn bereits konfiguriert.
8. WHEN die Google-Konfiguration auch über Umgebungsvariablen gesetzt ist, THE Admin_Panel SHALL die Felder als gesperrt anzeigen mit dem Hinweis, dass die Konfiguration über Umgebungsvariablen erfolgt (analog zum bestehenden Verhalten bei Microsoft-OAuth).

### Requirement 6: Provider-Auswahl-API-Endpunkte

**User Story:** Als Admin-Panel-Entwickler möchte ich API-Endpunkte für die Provider-Konfiguration, damit das Frontend den Provider-Typ und die Zugangsdaten verwalten kann.

#### Acceptance Criteria

1. THE Anwendung SHALL einen GET-Endpunkt bereitstellen, der den aktuellen Provider-Typ und den Konfigurationsstatus (konfiguriert/nicht konfiguriert) für beide Provider zurückgibt.
2. THE Anwendung SHALL einen POST-Endpunkt bereitstellen, über den der aktive Provider-Typ gewechselt werden kann.
3. THE Anwendung SHALL einen POST-Endpunkt bereitstellen, über den die Google-Provider-Konfiguration (Service-Account-Schlüssel, Customer-ID) gespeichert werden kann.
4. WHEN der Provider-Typ gewechselt wird, THE Anwendung SHALL prüfen, ob der Ziel-Provider vollständig konfiguriert ist, bevor der Wechsel durchgeführt wird.
5. IF der Ziel-Provider nicht vollständig konfiguriert ist, THEN THE Anwendung SHALL den Wechsel ablehnen und eine Fehlermeldung mit den fehlenden Konfigurationswerten zurückgeben.
6. THE Anwendung SHALL alle Provider-Konfigurations-Endpunkte mit dem bestehenden API-Token-Schutz (checkApiToken) absichern.
7. WHEN die Provider-Konfiguration geändert wird, THE Anwendung SHALL einen Audit-Log-Eintrag erstellen.

### Requirement 7: Socket Controller Provider-Integration

**User Story:** Als Benutzer möchte ich, dass die Echtzeit-Raumanzeige unabhängig vom konfigurierten Provider funktioniert, damit ich immer aktuelle Rauminformationen sehe.

#### Acceptance Criteria

1. THE Socket_Controller SHALL den aktiven Calendar_Provider über die Provider_Registry beziehen, anstatt direkt `app/msgraph/rooms.js` zu importieren.
2. WHEN der Socket_Controller Raumdaten abruft, THE Socket_Controller SHALL die getRoomLists-, getRooms- und getCalendarView-Operationen des aktiven Calendar_Provider verwenden.
3. THE Socket_Controller SHALL das bestehende Ausgabeformat (Room-Objekte mit Name, Email, Roomlist, RoomAlias, Appointments, Busy-Status) beibehalten, unabhängig vom aktiven Provider.
4. WHEN der aktive Provider gewechselt wird, THE Socket_Controller SHALL den nächsten Polling-Zyklus mit dem neuen Provider durchführen.
5. IF der aktive Provider einen Authentifizierungsfehler zurückgibt, THEN THE Socket_Controller SHALL den bestehenden Maintenance-Mode-Fallback aktivieren (analog zum aktuellen Graph-Fehlerverhalten).
6. THE Socket_Controller SHALL die No-Show-Freigabe (deleteEvent) über den aktiven Calendar_Provider durchführen, anstatt direkt die Graph-API aufzurufen.

### Requirement 8: Booking- und Meeting-Operationen über Provider

**User Story:** Als Benutzer möchte ich Räume buchen, Meetings verlängern und vorzeitig beenden können, unabhängig davon, welcher Calendar Provider aktiv ist.

#### Acceptance Criteria

1. WHEN eine Raumbuchung angefordert wird, THE Anwendung SHALL die createEvent-Operation des aktiven Calendar_Provider verwenden.
2. WHEN ein Meeting verlängert wird, THE Anwendung SHALL die getCalendarView-Operation des aktiven Calendar_Provider für die Konfliktprüfung und die updateEventEnd-Operation für die Aktualisierung verwenden.
3. WHEN ein Meeting vorzeitig beendet wird, THE Anwendung SHALL die updateEventEnd-Operation des aktiven Calendar_Provider verwenden.
4. THE Anwendung SHALL die bestehende Validierungslogik (Zeitbereichsprüfung, Konfliktprüfung, Berechtigungsprüfung) unabhängig vom aktiven Provider beibehalten.
5. THE Anwendung SHALL die bestehenden Fehlermeldungen (deutsch/englisch) für Buchungsfehler beibehalten, unabhängig vom aktiven Provider.

### Requirement 9: Google Provider Gesundheitsprüfung

**User Story:** Als Administrator möchte ich den Verbindungsstatus des Google Providers überprüfen können, damit ich Konfigurationsprobleme schnell erkennen kann.

#### Acceptance Criteria

1. WHEN der Google_Provider als aktiver Provider konfiguriert ist, THE Anwendung SHALL eine Gesundheitsprüfung bereitstellen, die einen Google-API-Token-Abruf durchführt.
2. THE Gesundheitsprüfung SHALL den Status "ok" zurückgeben, wenn ein gültiger Access-Token beschafft werden kann, und "error" mit einer Fehlermeldung andernfalls.
3. THE Anwendung SHALL die bestehende Health-Endpunkt-Struktur erweitern, um den aktiven Provider-Typ und dessen Verbindungsstatus anzuzeigen.
4. THE Gesundheitsprüfung SHALL das Ergebnis für 60 Sekunden zwischenspeichern, um unnötige API-Aufrufe zu vermeiden (analog zur bestehenden Graph-Auth-Health-Cache-Logik).

### Requirement 10: Umgebungsvariablen für Google Provider

**User Story:** Als DevOps-Ingenieur möchte ich den Google Provider über Umgebungsvariablen konfigurieren können, damit die Anwendung in Container-Umgebungen ohne Admin Panel eingerichtet werden kann.

#### Acceptance Criteria

1. THE Anwendung SHALL folgende Umgebungsvariablen für den Google Provider unterstützen: CALENDAR_PROVIDER (Werte: "microsoft", "google"), GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_CUSTOMER_ID, GOOGLE_SERVICE_ACCOUNT_KEY_PATH (Pfad zur JSON-Schlüsseldatei).
2. WHEN CALENDAR_PROVIDER auf "google" gesetzt ist, THE Anwendung SHALL beim Start prüfen, ob alle erforderlichen Google-Umgebungsvariablen gesetzt sind.
3. IF erforderliche Google-Umgebungsvariablen fehlen und CALENDAR_PROVIDER auf "google" gesetzt ist, THEN THE Anwendung SHALL eine Warnung im Startup-Validierungslog ausgeben.
4. WHEN Umgebungsvariablen für den Google Provider gesetzt sind, THE Admin_Panel SHALL die entsprechenden Konfigurationsfelder als gesperrt anzeigen.
5. THE Anwendung SHALL Umgebungsvariablen gegenüber Admin-Panel-Konfiguration priorisieren (analog zum bestehenden Verhalten bei Microsoft-OAuth).
