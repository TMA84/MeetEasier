# Requirements Document

## Introduction

Dieses Dokument beschreibt die Anforderungen für Performance- und Stabilitätsverbesserungen der MeetEasier-Applikation. Die Anwendung zeigt auf Raspberry-Pi-basierten TouchKio-Displays die Verfügbarkeit von Meetingräumen an und kommuniziert über Socket.IO mit einem Node.js-Backend, das Kalenderdaten über die Microsoft Graph API bezieht.

Aktuell bestehen drei Kernprobleme:
1. **Performance**: Die Graph-API-Abfragen und das Polling sind nicht optimal – einzelne Kalender-Abfragen pro Raum erzeugen unnötige Last und Latenz.
2. **Offline-Anzeige**: Die Displays zeigen häufig "Offline" an, obwohl der Server erreichbar ist. Dies liegt an zu aggressivem Connection-Monitoring und unzureichendem Reconnection-Handling.
3. **Kleinere Bugs**: Speicherlecks auf langlebigen Kiosk-Displays, veraltete Daten nach Reconnects und Race Conditions im Display-Tracking.

## Glossary

- **MeetEasier_Server**: Die Node.js-Backend-Applikation, die Graph-API-Daten abruft und per Socket.IO an Clients verteilt
- **Display_Client**: Ein TouchKio-Gerät (Raspberry Pi mit Chromium-Kiosk), das die Raum-Verfügbarkeit anzeigt
- **Connection_Monitor**: Das clientseitige Modul, das die Netzwerkverbindung zum Server überwacht und den Online/Offline-Status steuert
- **Graph_Poller**: Die serverseitige Komponente (socket-controller.js), die zyklisch Kalenderdaten von der Microsoft Graph API abruft
- **Room_Cache**: Der serverseitige In-Memory-Cache für Raum- und Kalenderdaten
- **Socket_Controller**: Das serverseitige Modul zur Verwaltung von Socket.IO-Verbindungen und Datenverteilung
- **Heartbeat**: Das periodische Signal zwischen Display_Client und MeetEasier_Server zur Verbindungsüberwachung
- **Graph_Batch_API**: Die Microsoft Graph JSON-Batching-Schnittstelle, die bis zu 20 Anfragen in einem HTTP-Request bündelt

## Requirements

### Requirement 1: Graph-API-Batching für Kalenderabfragen

**User Story:** Als Systembetreiber möchte ich, dass Kalenderabfragen an die Graph API gebündelt werden, damit die Anzahl der HTTP-Requests reduziert und die Polling-Performance verbessert wird.

#### Acceptance Criteria

1. WHEN the Graph_Poller executes a polling cycle, THE MeetEasier_Server SHALL partition all room email addresses into batches of at most 20 and fetch calendar views using Graph_Batch_API, processing batches sequentially
2. WHEN a single request within a Graph_Batch_API response returns an error status, THE MeetEasier_Server SHALL mark only the affected room as errored and continue processing remaining rooms in the same batch
3. WHEN the Graph_Batch_API is used, THE MeetEasier_Server SHALL complete a full polling cycle for 50 rooms within 5 seconds when network round-trip time is below 200ms
4. IF a Graph_Batch_API request does not receive a response within the configured GRAPH_FETCH_TIMEOUT_MS (default 30000ms), THEN THE MeetEasier_Server SHALL retry the failed batch with exponential backoff (initial delay 2 seconds, doubling each attempt) up to a maximum of 3 retries
5. WHEN a room was previously marked as errored in an earlier batch cycle and a subsequent batch cycle returns a successful result for that room, THE MeetEasier_Server SHALL clear the error state and process the room data normally

### Requirement 2: Intelligentes Polling mit Adaptive Intervallen

**User Story:** Als Systembetreiber möchte ich, dass der Server nur dann pollt wenn Clients verbunden sind und die Intervalle sich an die Serverlast anpassen, damit Ressourcen geschont werden.

#### Acceptance Criteria

1. WHILE no Display_Client is connected, THE Graph_Poller SHALL pause polling and resume within 5 seconds after the first client connects
2. WHEN a polling cycle takes longer than 80% of the configured poll interval, THE MeetEasier_Server SHALL log a performance warning with the actual cycle duration
3. IF a polling cycle exceeds the configured poll interval, THEN THE MeetEasier_Server SHALL skip scheduling and start the next cycle immediately after the current one completes
4. WHILE Graph webhook notifications are enabled, THE Graph_Poller SHALL use the webhook fallback interval of 300 seconds instead of the standard polling interval
5. THE MeetEasier_Server SHALL complete each polling cycle before starting the next one, regardless of the configured interval
6. IF a polling cycle has not completed within 120 seconds, THEN THE MeetEasier_Server SHALL abort the cycle, log an error with the elapsed duration, and schedule the next cycle after the configured interval

### Requirement 3: Verbessertes Connection-Monitoring auf Displays

**User Story:** Als Anwender möchte ich, dass die Displays nicht fälschlicherweise "Offline" anzeigen, damit die Rauminformation zuverlässig sichtbar bleibt.

#### Acceptance Criteria

1. WHEN the Connection_Monitor detects a failed health check, THE Display_Client SHALL require 3 consecutive failed checks (each spaced 5 seconds apart) before showing the offline indicator
2. WHILE the Display_Client shows the offline indicator, THE Connection_Monitor SHALL attempt to reconnect every 5 seconds with a 5-second request timeout per attempt
3. WHEN the Connection_Monitor receives a successful health check response (HTTP 200), THE Display_Client SHALL remove the offline indicator within the next check interval (5 seconds)
4. WHILE the Socket.IO connection is active and has delivered a room update within the last 60 seconds, THE Connection_Monitor SHALL treat the connection as online regardless of health check results
5. IF the Display_Client has been offline for more than 60 seconds and reconnects, THEN THE Display_Client SHALL perform a full page reload to ensure consistent state

### Requirement 4: Socket.IO Reconnection-Robustheit

**User Story:** Als Systembetreiber möchte ich, dass die Socket.IO-Verbindungen auf den Displays auch bei kurzen Netzwerkunterbrechungen stabil bleiben, damit keine unnötigen Reloads und "Offline"-Meldungen auftreten.

#### Acceptance Criteria

1. WHEN a Socket.IO disconnect occurs, THE Display_Client SHALL attempt reconnection with exponential backoff starting at 1 second, doubling each attempt, capping at 30 seconds per interval, for a maximum of 10 attempts before stopping
2. WHEN the Display_Client reconnects after a disconnect shorter than 30 seconds, THE Socket_Controller SHALL resend the latest cached room data within 1 second without waiting for the next polling cycle
3. WHEN the Display_Client reconnects after a disconnect of 30 seconds or longer, THE Socket_Controller SHALL resend the latest cached room data within 1 second and THE Display_Client SHALL treat the data as potentially stale until the next successful polling cycle completes
4. WHEN the Display_Client reconnects, THE Socket_Controller SHALL re-register the client in the correct Socket.IO room (room:alias) within the same connection handshake before emitting any room data events
5. IF a Display_Client disconnects for more than 120 seconds without reconnecting, THEN THE Display_Client SHALL perform a full page reload regardless of the Connection_Monitor offline timer
6. WHILE the Display_Client is attempting reconnection, THE Display_Client SHALL continue displaying the last known room data without showing the offline indicator

### Requirement 5: Serverseitiger Room-Data-Cache

**User Story:** Als Systembetreiber möchte ich, dass der Server einen aktuellen Cache der Raumdaten vorhält, damit neue und reconnectende Clients sofort Daten erhalten.

#### Acceptance Criteria

1. THE MeetEasier_Server SHALL maintain a Room_Cache with the most recent successfully fetched room data, updating it atomically so that concurrent reads always see a consistent snapshot
2. WHEN a new Display_Client connects and the Room_Cache is not empty, THE Socket_Controller SHALL send the cached room data within 500 milliseconds of the connection handshake completing
3. WHEN a new Display_Client connects and the Room_Cache is empty (no successful polling has occurred yet), THE Socket_Controller SHALL not emit room data and SHALL wait for the first successful polling cycle before sending data
4. WHEN the Room_Cache is older than 180 seconds and no successful polling has occurred, THE MeetEasier_Server SHALL mark the sync status as stale
5. IF the Room_Cache contains stale data and a client requests room data via the API, THEN THE MeetEasier_Server SHALL include a stale indicator and the lastSync timestamp in the response

### Requirement 6: Memory-Management auf Kiosk-Displays

**User Story:** Als Systembetreiber möchte ich, dass die Displays auch nach tagelangem Dauerbetrieb stabil laufen, ohne dass Speicher-Probleme zu Abstürzen oder Verlangsamung führen.

#### Acceptance Criteria

1. WHILE the auto-reload feature is enabled in the sidebar configuration, THE Display_Client SHALL schedule a page reload once per day at the configured time (default 03:00, format HH:MM)
2. WHEN the Display_Client performs a scheduled reload, THE Display_Client SHALL complete the reload and display room data within 10 seconds
3. THE MeetEasier_Server SHALL limit the disconnect log to a maximum of 50 entries and remove disconnected display clients from tracking after the configured retention period (default 2 hours)
4. WHEN the MeetEasier_Server disconnect log exceeds 50 entries, THE MeetEasier_Server SHALL discard the oldest entries to maintain the limit
5. IF the Display_Client fails to complete a scheduled reload within 10 seconds, THEN THE Display_Client SHALL retry the reload after 30 seconds

### Requirement 7: Heartbeat-Optimierung

**User Story:** Als Systembetreiber möchte ich, dass der Heartbeat-Mechanismus zwischen Displays und Server zuverlässig funktioniert und unnötige Disconnects vermeidet.

#### Acceptance Criteria

1. WHILE the Socket.IO connection is established, THE Display_Client SHALL send a Heartbeat to the MeetEasier_Server every 30 seconds
2. WHEN the MeetEasier_Server receives a Heartbeat, THE Socket_Controller SHALL update the lastSeenAt timestamp for the display client and respond with a heartbeat-ack event
3. WHEN the MeetEasier_Server has not received a Heartbeat from a Display_Client for 90 seconds, THE Socket_Controller SHALL set the potentiallyDisconnected flag to true for that client in the connected-clients tracking
4. WHEN a Display_Client marked as potentiallyDisconnected sends a Heartbeat, THE Socket_Controller SHALL clear the potentiallyDisconnected flag and update the lastSeenAt timestamp
5. THE MeetEasier_Server SHALL use a ping timeout of 60 seconds and a ping interval of 25 seconds for Socket.IO connections to accommodate slow Raspberry Pi devices

### Requirement 8: Targeted Room Updates statt Full Broadcast

**User Story:** Als Systembetreiber möchte ich, dass Single-Room-Displays nur die Daten ihres eigenen Raumes erhalten, damit die Netzwerklast und der Speicherverbrauch auf den Displays reduziert werden.

#### Acceptance Criteria

1. WHEN a Display_Client connects with a room alias, THE Socket_Controller SHALL add the client to the Socket.IO room "room:{alias}" within the same connection handshake
2. WHEN the Graph_Poller completes a polling cycle with updated room data, THE Socket_Controller SHALL emit an individual room update event to each room-specific channel "room:{alias}" containing only that room's data object
3. WHILE a Display_Client is subscribed to a room-specific channel, THE Display_Client SHALL process the individual room update event and discard any received full rooms broadcast without updating state from it
4. THE Socket_Controller SHALL emit the full room array to all connected clients that did not provide a room alias during connection (flightboard and admin clients)
5. IF a Display_Client connects with a room alias that does not match any room in the current Room_Cache, THEN THE Socket_Controller SHALL add the client to the Socket.IO room "room:{alias}" and not emit any room data until a matching room becomes available in a subsequent polling cycle

### Requirement 9: Graceful Error Recovery

**User Story:** Als Systembetreiber möchte ich, dass die Anwendung bei Graph-API-Ausfällen den letzten bekannten Stand anzeigt und sich automatisch erholt, sobald der Service wieder verfügbar ist.

#### Acceptance Criteria

1. WHEN the Graph_Poller encounters 3 consecutive failures (HTTP error status, network timeout, or invalid response), THE MeetEasier_Server SHALL activate automatic maintenance mode and notify all connected Display_Clients via Socket.IO with a message indicating the service disruption reason
2. WHEN the Graph_Poller succeeds after automatic maintenance mode was activated, THE MeetEasier_Server SHALL deactivate automatic maintenance mode within 1 polling cycle and reset the consecutive failure counter to zero
3. WHILE automatic maintenance mode is active, THE Display_Client SHALL continue showing the last known room data with a visible maintenance indicator that is distinguishable from the offline indicator
4. IF the Graph_Poller fails, THEN THE MeetEasier_Server SHALL preserve the existing Room_Cache and not overwrite it with empty data
5. WHEN the MeetEasier_Server activates or deactivates automatic maintenance mode, THE Socket_Controller SHALL emit a maintenance status event to all connected Display_Clients within 2 seconds

### Requirement 10: Static Asset Caching-Optimierung

**User Story:** Als Systembetreiber möchte ich, dass statische Assets auf den Displays effizient gecacht werden, damit Page-Reloads schnell ablaufen und die Netzwerkbelastung gering bleibt.

#### Acceptance Criteria

1. THE MeetEasier_Server SHALL serve JavaScript (.js) and CSS (.css) assets with a Cache-Control header of "max-age=3600, must-revalidate" and an ETag header for conditional revalidation
2. THE MeetEasier_Server SHALL serve image (.png, .jpg, .gif, .svg, .ico) and font (.woff, .woff2, .ttf, .eot) assets with a Cache-Control header of "max-age=86400" and an ETag header
3. THE MeetEasier_Server SHALL serve HTML files with a Cache-Control header of "no-cache" to ensure clients revalidate on every request
4. THE MeetEasier_Server SHALL include content-hash strings in JavaScript and CSS bundle filenames so that a change in file content produces a different filename
5. WHEN content-hashed filenames are generated for JavaScript and CSS bundles, THE MeetEasier_Server SHALL reference the current hashed filenames in served HTML files so that clients load updated bundles after a deployment
