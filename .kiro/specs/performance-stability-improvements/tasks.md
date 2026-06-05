# Implementation Plan: Performance & Stability Improvements

## Overview

Implementierung von Performance- und Stabilitätsverbesserungen für die MeetEasier-Applikation. Die Änderungen umfassen Graph-API-Batching, intelligentes Polling, verbessertes Connection-Monitoring, Socket.IO-Reconnection-Robustheit, Memory-Management und Targeted Room Updates.

## Tasks

- [x] 1. Graph-API-Batching in rooms.js aktivieren
  - [x] 1.1 In `app/msgraph/rooms.js`: Die bestehende `Promise.all`-basierte Einzelabfrage durch `graph.getCalendarViewBatch()` ersetzen
    - Batch-Aufruf mit `msalClient` und Email-Liste der Räume
    - _Requirements: 1.1, 1.3_
  - [x] 1.2 Batch-Ergebnisse (Map<email, result>) den Room-Objekten zuordnen und Appointments verarbeiten
    - Iteration über Rooms, Zuordnung der Batch-Results per Email-Key
    - _Requirements: 1.1_
  - [x] 1.3 Fehlerbehandlung: Bei Einzel-Raum-Fehlern im Batch nur `room.ErrorMessage` setzen, nicht den gesamten Batch abbrechen
    - `toClientRoomErrorMessage()` für einzelne Fehler verwenden
    - _Requirements: 1.2_
  - [x] 1.4 Fallback implementieren: Bei komplettem Batch-API-Fehler (z.B. 401 Auth) auf alte Einzelabfragen zurückfallen
    - Try/catch um Batch-Call, bei Fehler `Promise.all` mit Einzelabfragen
    - _Requirements: 1.4_
  - [x] 1.5 Timeout-Wrapper für den gesamten Batch-Call (konfigurierbar via `GRAPH_FETCH_TIMEOUT_MS`) statt 10s pro Raum
    - _Requirements: 1.3_

- [x] 2. Intelligentes Polling mit Pause und Performance-Logging
  - [x] 2.1 In `app/socket-controller.js`: Am Anfang von `fetchAndBroadcastRooms()` prüfen ob `connectedDisplayClients.size > 0`, sonst Zyklus überspringen
    - _Requirements: 2.1_
  - [x] 2.2 Beim ersten Client-Connect (wenn vorher pausiert) sofort einen Polling-Zyklus auslösen
    - _Requirements: 2.1_
  - [x] 2.3 Performance-Zeitmessung: `Date.now()` vor und nach dem Polling-Zyklus, Warning loggen wenn Dauer > 80% des Intervalls
    - _Requirements: 2.2_
  - [x] 2.4 Sicherstellen, dass `isRunning`-Flag parallele Zyklen verhindert (existiert bereits, Verhalten validieren)
    - _Requirements: 2.4_

- [x] 3. Connection-Monitor mit 3-Strikes-Regel
  - [x] 3.1 In `ui-react/src/utils/connection-monitor.js`: Neues Feld `consecutiveFailures` und `requiredFailures = 3` hinzufügen
    - _Requirements: 3.1_
  - [x] 3.2 `checkConnection()` ändern: Bei Fehlschlag `consecutiveFailures++`, erst bei >= 3 `handleOffline()` aufrufen
    - _Requirements: 3.1_
  - [x] 3.3 Bei erfolgreichem Check `consecutiveFailures = 0` setzen und sofort `handleOnline()` aufrufen falls offline
    - _Requirements: 3.3_
  - [x] 3.4 Neue Methode `setSocketActive(active)`: Wenn Socket.IO aktiv ist und Daten liefert, Monitor auf "online" setzen
    - _Requirements: 3.4_
  - [x] 3.5 In Display-Komponenten: `setSocketActive(true)` bei Socket.IO `connect` Event und `updatedRoom`/`updatedRooms` Events aufrufen
    - _Requirements: 3.4_

- [x] 4. Socket.IO Immediate-Cache-Delivery bei Connect
  - [x] 4.1 In `app/socket-controller.js`: Im Socket.IO `connection`-Handler nach der Client-Registrierung den `lastRoomsCache` prüfen
    - _Requirements: 5.2_
  - [x] 4.2 Für Clients mit `roomAlias`: Den spezifischen Raum aus dem Cache suchen und via `socket.emit('updatedRoom', room)` senden
    - _Requirements: 4.2, 5.2_
  - [x] 4.3 Für Clients ohne `roomAlias` (Flightboard): Gesamten Cache via `socket.emit('updatedRooms', lastRoomsCache)` senden
    - _Requirements: 5.2_
  - [x] 4.4 Nur senden wenn Cache nicht stale ist (< 180 Sekunden alt)
    - _Requirements: 5.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Targeted Room Updates – Client-seitige Event-Filterung
  - [x] 6.1 In `Display.jsx` (Single-Room): Nur auf `updatedRoom` Event hören, `updatedRooms` Event-Listener entfernen
    - _Requirements: 8.3_
  - [x] 6.2 In `Flightboard.jsx`: Weiterhin auf `updatedRooms` hören (keine Änderung, nur validieren)
    - _Requirements: 8.4_
  - [x] 6.3 In `Display.jsx`: Bei `updatedRoom` Event prüfen ob `room.RoomAlias` zum eigenen Alias passt
    - _Requirements: 8.3_
  - [x] 6.4 Sicherstellen, dass nach Reconnect der korrekte Room-Alias im Socket.IO Query mitgegeben wird
    - _Requirements: 8.1_

- [x] 7. Reconnect-Logik mit zeitbasierter Entscheidung
  - [x] 7.1 In `Display.jsx` und `Flightboard.jsx`: `_disconnectedAt` Timestamp speichern bei Disconnect
    - _Requirements: 4.1_
  - [x] 7.2 Bei Reconnect: Dauer berechnen. < 30s → nur Data-Refresh. 30-120s → Data-Refresh + State-Reset. > 120s → Full Page Reload
    - _Requirements: 4.2, 4.4_
  - [x] 7.3 Den bestehenden 2-Minuten-Reload-Timer beibehalten als Fallback
    - _Requirements: 4.4_
  - [x] 7.4 Während Reconnect-Versuchen die letzte bekannte Raum-Anzeige beibehalten (kein "Offline" nur wegen Disconnect)
    - _Requirements: 4.5_

- [x] 8. Heartbeat-ACK und potentiallyDisconnected-Status
  - [x] 8.1 In `app/socket-controller.js`: Auf `display-heartbeat` Event mit `heartbeat-ack` antworten
    - _Requirements: 7.2_
  - [x] 8.2 In `app/socket-controller.js`: Display-Clients ohne Heartbeat seit 90s als `potentiallyDisconnected: true` markieren
    - _Requirements: 7.3_
  - [x] 8.3 In `display-utils.js` Client-seitig: `heartbeat-ack` empfangen und Connection-Monitor mit `setSocketActive(true)` benachrichtigen
    - _Requirements: 7.1, 3.4_
  - [x] 8.4 Cleanup: `potentiallyDisconnected`-Feld in `getConnectedDisplayClients()` Response aufnehmen
    - _Requirements: 7.3_

- [x] 9. Polling-Pause bei null Clients testen und absichern
  - [x] 9.1 Sicherstellen, dass nach dem letzten Client-Disconnect der nächste Polling-Zyklus übersprungen wird
    - _Requirements: 2.1_
  - [x] 9.2 Sicherstellen, dass nach neuem Client-Connect innerhalb von 5s ein Polling-Zyklus startet
    - _Requirements: 2.1_
  - [x] 9.3 Log-Meldung bei Pause/Resume: "Polling paused (no clients connected)" und "Polling resumed (client connected)"
    - _Requirements: 2.1_
  - [x] 9.4 Demo-Mode-Ausnahme: Im Demo-Mode trotzdem pollen (oder statische Daten sofort liefern)
    - _Requirements: 2.1_

- [x] 10. Server-seitige Memory-Optimierung
  - [x] 10.1 Validieren, dass `recentDisconnects` Array korrekt auf `MAX_DISCONNECT_LOG = 50` begrenzt ist (Ring-Buffer-Logik prüfen)
    - _Requirements: 6.4_
  - [x] 10.2 Validieren, dass `cleanupOldDisplays()` korrekt alte Einträge entfernt
    - _Requirements: 6.3_
  - [x] 10.3 Sicherstellen, dass Socket.IO Event-Listener bei Client-Disconnect ordnungsgemäß bereinigt werden
    - _Requirements: 6.3_
  - [x] 10.4 Optional: Log-Rotation für Konsolen-Ausgabe (bestehende Logging-Praxis prüfen)
    - _Requirements: 6.3_

- [x] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Die Design-Dokumentation nutzt JavaScript, daher werden alle Implementierungen in JavaScript (Node.js Backend, React Frontend) durchgeführt
- `graph.getCalendarViewBatch()` existiert bereits in `app/msgraph/graph.js` und muss nicht neu geschrieben werden
- Die bestehende Socket.IO-Konfiguration in `server.js` (Ping-Timeout 60s, Ping-Interval 25s) bleibt unverändert
- Static Asset Caching (Requirement 10) ist bereits korrekt implementiert und erfordert keine Code-Änderungen
- Tasks referenzieren spezifische Requirements aus dem Requirements-Dokument
- Checkpoints dienen der inkrementellen Validierung

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "3.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3", "3.2", "3.3", "3.4"] },
    { "id": 2, "tasks": ["1.4", "1.5", "2.4", "3.5", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "6.1", "6.2"] },
    { "id": 4, "tasks": ["6.3", "6.4", "7.1", "8.1", "8.2"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4", "8.3", "8.4"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3", "9.4", "10.1", "10.2"] },
    { "id": 7, "tasks": ["10.3", "10.4"] }
  ]
}
```
