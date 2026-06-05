# Requirements Document

## Introduction

Dieses Dokument beschreibt die Anforderungen für das Aufrunden von Buchungsendzeiten auf Viertelstundengrenzen. Bei der Buchung eines Meetingraums über das TouchKio-Display (sowohl bei neuen Buchungen als auch bei Verlängerungen) sollen die Endzeiten immer auf die nächste Viertelstunde (xx:00, xx:15, xx:30, xx:45) aufgerundet werden. Dies betrifft die Quick-Book-Buttons (15/30/60 min) sowie benutzerdefinierte Zeiten und Meeting-Verlängerungen.

## Glossary

- **Display_Client**: Ein TouchKio-Gerät (Raspberry Pi mit Chromium-Kiosk), das die Raum-Verfügbarkeit anzeigt und Buchungen ermöglicht
- **Booking_Service**: Die serverseitige Komponente (routes.js), die Buchungs- und Verlängerungsanfragen an die Microsoft Graph API weiterleitet
- **Quarter_Hour_Boundary**: Ein Zeitpunkt, dessen Minutenanteil exakt 0, 15, 30 oder 45 beträgt (z.B. 10:00, 10:15, 10:30, 10:45)
- **Rounding_Module**: Das Modul (client- oder serverseitig), das die Berechnung der aufgerundeten Endzeit auf die nächste Quarter_Hour_Boundary durchführt
- **BookingModal**: Der Client-seitige Dialog für neue Raumbuchungen mit Quick-Book-Buttons und Slider
- **ExtendMeetingModal**: Der Client-seitige Dialog für die Verlängerung eines laufenden Meetings

## Requirements

### Requirement 1: Endzeit-Rundung bei neuen Buchungen

**User Story:** Als Meetingraum-Nutzer möchte ich, dass die Endzeit meiner Buchung automatisch auf die nächste Viertelstunde aufgerundet wird, damit Meetingzeiten einheitlich auf Viertelstundengrenzen enden und der Kalender übersichtlich bleibt.

#### Acceptance Criteria

1. WHEN a user initiates a booking via the BookingModal, THE Rounding_Module SHALL calculate the end time by adding the selected duration to the current client-local time and rounding up to the next Quarter_Hour_Boundary
2. WHEN the calculated end time already falls exactly on a Quarter_Hour_Boundary, THE Rounding_Module SHALL keep the end time unchanged
3. THE Rounding_Module SHALL apply the rounding for all Quick-Book durations (15, 30, 60, and 120 minutes) and for custom slider durations ranging from 5 to 240 minutes in 5-minute increments
4. WHEN the Rounding_Module rounds a booking end time, THE BookingModal SHALL display the effective end time (after rounding) in HH:MM format to the user before submission
5. IF the rounded end time would conflict with an existing booking for the same room, THEN THE BookingModal SHALL display an error message indicating a scheduling conflict and SHALL prevent submission of the booking

### Requirement 2: Endzeit-Rundung bei Meeting-Verlängerungen

**User Story:** Als Meetingraum-Nutzer möchte ich, dass auch bei der Verlängerung eines Meetings die neue Endzeit auf die nächste Viertelstunde aufgerundet wird, damit verlängerte Meetings ebenfalls an Viertelstundengrenzen enden.

#### Acceptance Criteria

1. WHEN a user extends a meeting via the ExtendMeetingModal, THE Rounding_Module SHALL calculate the new end time by adding the selected extension duration to the current meeting end time (the end time of the currently active appointment) and rounding up to the next Quarter_Hour_Boundary
2. WHEN the calculated new end time after extension already falls exactly on a Quarter_Hour_Boundary, THE Rounding_Module SHALL keep the new end time unchanged
3. THE Rounding_Module SHALL apply the rounding for all Quick-Extend durations (15, 30, 60, and 120 minutes) and for custom slider durations ranging from 5 to 240 minutes in steps of 5 minutes
4. WHEN the Rounding_Module rounds an extension end time, THE ExtendMeetingModal SHALL display the effective new end time (after rounding) to the user before submission
5. IF the user attempts to extend a meeting but no active meeting exists for the room (room is not busy or has no appointments), THEN THE ExtendMeetingModal SHALL display an error message indicating that no active meeting is available for extension and SHALL NOT submit the extension request
6. IF the calculated new end time (after rounding) would overlap with the next scheduled meeting in the room, THEN THE ExtendMeetingModal SHALL display an error message indicating the time conflict and SHALL NOT submit the extension request

### Requirement 3: Rundungslogik

**User Story:** Als Entwickler möchte ich eine deterministische und testbare Rundungsfunktion, damit die Endzeit-Berechnung konsistent und korrekt arbeitet.

#### Acceptance Criteria

1. THE Rounding_Module SHALL round any given time (a value with hours 0–23, minutes 0–59, seconds 0–59, and milliseconds 0–999) up to the nearest Quarter_Hour_Boundary by advancing the minutes to the next value in the set {0, 15, 30, 45} and setting seconds and milliseconds to zero
2. IF the input time is already exactly on a Quarter_Hour_Boundary (minutes in {0, 15, 30, 45} and seconds and milliseconds are zero), THEN THE Rounding_Module SHALL return the input time unchanged
3. IF the input time has minutes not exactly on a Quarter_Hour_Boundary or has non-zero seconds or milliseconds, THEN THE Rounding_Module SHALL return a rounded time that is strictly greater than the original time and at most 14 minutes and 59 seconds later
4. THE Rounding_Module SHALL be idempotent: applying the rounding function to an already-rounded result SHALL produce the same value as the first rounding
5. WHEN the rounding advances the minutes past 59, THE Rounding_Module SHALL increment the hour by one, and IF the hour advances past 23, THEN THE Rounding_Module SHALL increment the date by one day and set the hour to 00:00

### Requirement 4: Server-seitige Validierung der Viertelstundengrenzen

**User Story:** Als Systembetreiber möchte ich, dass der Server die Viertelstunden-Rundung ebenfalls durchführt oder validiert, damit auch bei manipulierten Client-Anfragen die Endzeiten auf Quarter_Hour_Boundaries liegen.

#### Acceptance Criteria

1. WHEN the Booking_Service receives a new booking request, THE Booking_Service SHALL round the provided end time up to the next Quarter_Hour_Boundary before performing conflict checking and before creating the calendar event via the Graph API
2. WHEN the Booking_Service receives a meeting extension request, THE Booking_Service SHALL round the calculated new end time up to the next Quarter_Hour_Boundary before performing conflict checking and before updating the calendar event via the Graph API
3. WHEN the Booking_Service applies rounding to an end time, THE Booking_Service SHALL include the effective (rounded) end time as an ISO 8601 datetime string in the API response so that the client can display the correct time
4. IF the Booking_Service receives an end time that already falls on a Quarter_Hour_Boundary, THEN THE Booking_Service SHALL accept the end time without modification
5. IF rounding the end time up to the next Quarter_Hour_Boundary would cause a conflict with a subsequent calendar event or would exceed end of day (23:59), THEN THE Booking_Service SHALL reject the request with an error response indicating the conflict or boundary violation without creating or updating the calendar event

### Requirement 5: Anzeige der effektiven Endzeit

**User Story:** Als Meetingraum-Nutzer möchte ich vor der Bestätigung sehen, bis wann mein Meeting tatsächlich gebucht wird (nach Rundung), damit ich die tatsächliche Belegungszeit kenne.

#### Acceptance Criteria

1. WHEN the user selects a booking duration (via Quick-Book or Slider), THE BookingModal SHALL display the effective end time (rounded to Quarter_Hour_Boundary) in the format HH:MM within 1 second of the selection
2. WHEN the user selects an extension duration (via Quick-Extend or Slider), THE ExtendMeetingModal SHALL display the effective new end time (rounded to Quarter_Hour_Boundary) in the format HH:MM within 1 second of the selection
3. WHILE the BookingModal is open, THE BookingModal SHALL recalculate and update the displayed effective end time every 30 seconds to reflect the current time, ensuring the displayed end time is never based on a current-time value older than 60 seconds
4. WHILE the ExtendMeetingModal is open, THE ExtendMeetingModal SHALL recalculate and update the displayed effective new end time every 30 seconds to reflect the current time, ensuring the displayed end time is never based on a current-time value older than 60 seconds
