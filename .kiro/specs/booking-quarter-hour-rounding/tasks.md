# Implementation Plan: Booking Quarter-Hour Rounding

## Overview

Implement automatic rounding of booking end times to the next quarter-hour boundary (xx:00, xx:15, xx:30, xx:45). The rounding logic is a shared pure function used both client-side (for instant preview) and server-side (for validation). Changes touch the Rounding Module, BookingModal, ExtendMeetingModal, and server routes.

## Tasks

- [x] 1. Create the Rounding Module
  - [x] 1.1 Create server-side rounding module `app/quarter-hour-rounding.js`
    - Implement `roundUpToQuarterHour(date)` as a pure function that returns a new Date rounded up to the next quarter-hour boundary
    - Implement `isQuarterHourBoundary(date)` helper that checks if minutes ∈ {0,15,30,45} and seconds=0, ms=0
    - Handle hour rollover (minutes past 59 → increment hour) and day rollover (hour past 23 → increment date, set to 00:00)
    - If input is already on a boundary, return unchanged (new Date with same time)
    - Use CommonJS exports (`module.exports`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.2 Create client-side rounding module `ui-react/src/utils/quarter-hour-rounding.js`
    - Implement identical logic as server-side module using ES module exports (`export function`)
    - Same `roundUpToQuarterHour(date)` and `isQuarterHourBoundary(date)` functions
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 1.3 Write unit tests for server-side rounding module `app/__tests__/quarter-hour-rounding.test.js`
    - Test exact boundaries (e.g. 10:15:00.000 → unchanged)
    - Test rounding up (e.g. 10:03:00.000 → 10:15:00.000, 10:16:00.000 → 10:30:00.000)
    - Test hour rollover (e.g. 10:46:00.000 → 11:00:00.000)
    - Test day rollover (e.g. 23:46:00.000 → next day 00:00:00.000)
    - Test non-zero seconds/milliseconds trigger rounding (e.g. 10:15:00.001 → 10:30:00.000)
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 1.4 Write unit tests for client-side rounding module `ui-react/src/utils/quarter-hour-rounding.test.js`
    - Mirror all server-side test cases to verify identical behavior
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 2. Implement property-based tests for the Rounding Module
  - [x] 2.1 Write property test for Property 1: Rounding always produces a quarter-hour boundary
    - **Property 1: Rounding always produces a quarter-hour boundary**
    - **Validates: Requirements 3.1, 1.1, 2.1, 4.1, 4.2**
    - File: `app/__tests__/quarter-hour-rounding.property.test.js`
    - Use `fast-check` to generate arbitrary Dates; assert result minutes ∈ {0,15,30,45}, seconds=0, ms=0

  - [x] 2.2 Write property test for Property 2: Rounding is idempotent
    - **Property 2: Rounding is idempotent**
    - **Validates: Requirements 3.4, 3.2, 1.2, 2.2, 4.4**
    - Assert: `roundUpToQuarterHour(roundUpToQuarterHour(x)).getTime() === roundUpToQuarterHour(x).getTime()`

  - [x] 2.3 Write property test for Property 3: Rounding delta is bounded
    - **Property 3: Rounding delta is bounded**
    - **Validates: Requirements 3.3**
    - Generate Dates NOT on a boundary; assert: 0 < diff ≤ 899000ms (14min 59sec)

  - [x] 2.4 Write property test for Property 4: Hour and day rollover correctness
    - **Property 4: Hour and day rollover correctness**
    - **Validates: Requirements 3.5**
    - Generate Dates with minutes > 45; assert hour/day increments correctly

  - [x] 2.5 Write property test for Property 5: Conflict detection uses rounded end time
    - **Property 5: Conflict detection uses rounded end time**
    - **Validates: Requirements 2.6, 4.5**
    - Generate scenarios where unrounded end < nextMeetingStart but rounded end ≥ nextMeetingStart; assert conflict is detected

- [x] 3. Checkpoint - Rounding Module complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate rounding into BookingModal
  - [x] 4.1 Add effective end time calculation and display to `BookingModal.jsx`
    - Import `roundUpToQuarterHour` from `../../utils/quarter-hour-rounding.js`
    - Add state `effectiveEndTime` to track the rounded end time
    - Implement `calculateEffectiveEndTime()`: compute `now + selectedDuration`, apply `roundUpToQuarterHour`, update state
    - Call `calculateEffectiveEndTime()` whenever duration selection changes (Quick-Book buttons and slider)
    - Display effective end time in HH:MM format in the modal UI
    - Add 30-second interval timer to recalculate effective end time while modal is open (clear on unmount)
    - On submit, send the rounded `endTime` to the API
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.3_

  - [x] 4.2 Add conflict detection to BookingModal
    - Before submission, check if `effectiveEndTime` conflicts with next appointment in `room.Appointments`
    - If conflict detected, display error message and prevent submission
    - _Requirements: 1.5_

  - [x] 4.3 Write unit tests for BookingModal rounding integration
    - Test that effective end time is displayed after duration selection
    - Test that timer updates the preview every 30 seconds
    - Test conflict detection prevents submission
    - _Requirements: 1.1, 1.4, 1.5, 5.1, 5.3_

- [x] 5. Integrate rounding into ExtendMeetingModal
  - [x] 5.1 Add effective end time calculation and display to `ExtendMeetingModal.jsx`
    - Import `roundUpToQuarterHour` from `../../utils/quarter-hour-rounding.js`
    - Add state `effectiveNewEndTime` to track the rounded new end time
    - Implement `calculateEffectiveNewEndTime()`: compute `currentMeetingEnd + selectedDuration`, apply `roundUpToQuarterHour`, update state
    - Call `calculateEffectiveNewEndTime()` whenever extension duration changes (Quick-Extend buttons and slider)
    - Display effective new end time in HH:MM format in the modal UI
    - Add 30-second interval timer to recalculate while modal is open (clear on unmount)
    - On submit, send the rounded `endTime` to the API
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.2, 5.4_

  - [x] 5.2 Add conflict and validation checks to ExtendMeetingModal
    - Check if no active meeting exists; if so, display error and prevent submission
    - Check if `effectiveNewEndTime` overlaps with the next scheduled meeting; if conflict, display error and prevent submission
    - _Requirements: 2.5, 2.6_

  - [x] 5.3 Write unit tests for ExtendMeetingModal rounding integration
    - Test that effective new end time is displayed after extension duration selection
    - Test that timer updates the preview every 30 seconds
    - Test no-active-meeting error handling
    - Test conflict detection against next meeting
    - _Requirements: 2.1, 2.4, 2.5, 2.6, 5.2, 5.4_

- [x] 6. Checkpoint - Client-side integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement server-side rounding and validation in routes.js
  - [x] 7.1 Add rounding to the booking endpoint in `app/routes.js`
    - Import `roundUpToQuarterHour` from `./quarter-hour-rounding.js`
    - In POST `/api/rooms/:roomEmail/book`: after parsing `endTime`, apply `roundUpToQuarterHour`
    - Use the rounded end time for conflict checking and Graph API event creation
    - Include `effectiveEndTime` (ISO 8601) in the success response
    - If rounded end time exceeds 23:59, reject with HTTP 400 and error message
    - If rounded end time conflicts with next event, reject with HTTP 409 and error message
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 7.2 Add rounding to the extend-meeting endpoint in `app/routes.js`
    - In POST `/api/extend-meeting`: after calculating `newEnd = currentEnd + minutes`, apply `roundUpToQuarterHour`
    - Use the rounded end time for conflict checking and Graph API event update
    - Include `effectiveEndTime` (ISO 8601) in the success response
    - If rounded end time exceeds 23:59, reject with HTTP 400
    - If rounded end time conflicts with next event, reject with HTTP 409
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x] 7.3 Write integration tests for server-side rounding endpoints
    - Test booking endpoint applies rounding before creating event
    - Test extend endpoint applies rounding before updating event
    - Test conflict rejection (409) when rounded time overlaps next event
    - Test end-of-day rejection (400) when rounded time exceeds 23:59
    - Test that already-on-boundary times pass through unchanged
    - Mock Graph API calls to verify rounded time is sent
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Final checkpoint - All components integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The rounding module is implemented twice (CommonJS for server, ES modules for client) with identical logic
- The 30-second timer refresh ensures the displayed end time stays current while modals are open

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "2.1", "2.2", "2.3", "2.4"] },
    { "id": 2, "tasks": ["4.1", "5.1", "7.1", "2.5"] },
    { "id": 3, "tasks": ["4.2", "5.2", "7.2"] },
    { "id": 4, "tasks": ["4.3", "5.3", "7.3"] }
  ]
}
```
