# Manual Firebase Rules Playground tests

These checks use the **Rules Playground** in the Firebase console:
**Realtime Database → Rules → Rules Playground**. The Playground only *simulates* reads and writes. It never changes your data.

The automatic self-test (`test.html`) covers almost everything. These manual tests cover what it cannot:
- a second teacher account (P6)
- signed-out visitors
- live-car read permissions and forbidden writes (P13–P18)
- a few attacks typed by hand

## Before you start
1. Publish `database.rules.json` (see README).
2. Open `teacher.html`, log in, and create a session. Leave it **waiting**.
3. Write down:
   - **SESSION_ID**: on the dashboard, open *Technical details* under the session
   - **CODE**: the 6-letter session code
   - **TEACHER_UID**: shown at the top of the dashboard ("Teacher ID")
4. In each test below:
   - **Location:** type the path, replacing the words in CAPITALS.
   - **Authenticated:**
     - off when the test says *signed out*
     - otherwise on; choose the provider shown and type the UID shown
   - **Data:** for *set* tests, paste the data exactly.
   - Press **Run** and compare the result with the expected one.

| # | Type | Location | Signed in as | Data | Expected |
|---|------|----------|--------------|------|----------|
| P1 | read | `/joinCodes/CODE` | signed out | — | **Denied** |
| P2 | read | `/joinCodes/CODE` | Anonymous, UID `playground-student-1` | — | **Allowed** |
| P3 | read | `/sessions/SESSION_ID` | Anonymous, UID `playground-student-1` | — | **Denied** |
| P4 | read | `/sessions/SESSION_ID` | Password, UID `TEACHER_UID` | — | **Allowed** |
| P5 | read | `/sessions` | Password, UID `TEACHER_UID` | — | **Denied** (only the dashboard's "my sessions" search is allowed) |
| P6a | read | `/sessions/SESSION_ID` | Password, UID `another-teacher` | — | **Denied** |
| P6b | set | `/sessions/SESSION_ID/status` | Password, UID `another-teacher` | `"ended"` | **Denied** |
| P7 | set | `/teachers/TEACHER_UID/active` | Password, UID `TEACHER_UID` | `false` | **Denied** |
| P8 | set | `/sessions/SESSION_ID/status` | Password, UID `TEACHER_UID` | `"running"` | **Denied** (start must also set startedAt and update the join code) |
| P9 | set | `/joinCodes/CODE/teacherUid` | Password, UID `TEACHER_UID` | `"TEACHER_UID"` | **Denied** (no teacher data in public codes) |
| P10 | set | `/sessions/SESSION_ID/players/playground-student-2` | Anonymous, UID `playground-student-1` | see below | **Denied** (cannot create someone else's record) |
| P11 | set | `/sessions/SESSION_ID/players/playground-student-1` | Anonymous, UID `playground-student-1` | see below | **Denied** (device-clock times are refused) |
| P12 | set | `/sessions/SESSION_ID/players/playground-student-1/name` | Anonymous, UID `playground-student-1` | `"Hacker"` | **Denied** (a record must be created complete) |

Data for P10 and P11:
```json
{ "name": "Playground", "classSection": "TEST", "joinedAt": 123,
  "progress": { "score": 0, "correct": 0, "answered": 0, "updatedAt": 123 } }
```

When you've finished, you can cancel the test session on the dashboard.

## Phase 3: live multiplayer car permissions

For P13–P18, the test session must be **running**, and at least one student must have joined. Use a second anonymous UID for the non-member tests. If you need to test P18, end the session from the teacher dashboard first.

| # | Type | Location | Signed in as | Data | Expected |
|---|------|----------|--------------|------|----------|
| P13 | read | `/liveCars/SESSION_ID` | Anonymous, UID `another-student` (not in this session) | — | **Denied** |
| P14 | read | `/liveCars` | Password, UID `TEACHER_UID` | — | **Denied** (teacher access is limited to one owned session path) |
| P15 | read | `/liveCars/SESSION_ID` | Password, UID `TEACHER_UID` | — | **Allowed** |
| P16 | set | `/liveCars/SESSION_ID/another-student` | Anonymous, UID `playground-student-1` | Any object | **Denied** (a student cannot create or move another student's car) |
| P17 | set | `/liveCars/SESSION_ID/TEACHER_UID` | Password, UID `TEACHER_UID` | Any object | **Denied** (teacher can read and delete cars, not create or move one) |
| P18 | set | `/liveCars/SESSION_ID/playground-student-1` | Anonymous, UID `playground-student-1` | Any object | **Denied** after the session has ended |

The Playground tests above check permission boundaries, not successful movement payloads. A valid live-car write also requires a joined student's own UID, the current name from their player record, bounded numeric coordinates/speed, and a Firebase server timestamp. The actual `onDisconnect` behavior must be checked with a real browser connection; the Rules Playground cannot simulate a dropped network connection.

## Phase 3: real-device multiplayer checks

These checks cannot be completed in Rules Playground. Use the Phase 3 rules in Firebase and the matching GitHub Pages files only after the release is approved.

1. Open the teacher dashboard on a laptop, create a session, and show its QR code.
2. Join from at least two real student devices using the QR code and each student's name/class. Start the session.
3. Confirm both cars appear on both devices. Drive in different directions and confirm the cars move smoothly and the online count updates.
4. Refresh one student's browser. Their car should reconnect under the same student identity without creating a duplicate player.
5. Rename a student from the teacher dashboard while the session is running. Confirm the car name tag updates and position updates continue without a permission error.
6. Press **Leave** on one device. Its car should disappear from the other device.
7. Close a student's tab or temporarily disconnect its internet. After Firebase detects the disconnect, that car should disappear. Allow up to about a minute for server-side disconnect detection.
8. If late joining is enabled, join from another device after the session starts. Confirm it enters the same live track.
9. End the session from the teacher dashboard. All devices should stop driving and show Game Over; no live cars should remain.
10. Test keyboard controls on a desktop and the on-screen steering/accelerator/brake controls on a phone or tablet.

**Capacity note:** 30 simultaneous students is the design target, not a verified production limit. A simulated 30-browser test had one run where not all car updates were visible. Do not treat the 30-student target as proven until it is measured on the actual Firebase project and representative student devices.

## If a result is different
Don't use the new version in class. Copy the test number and the result, and send them together with the `test.html` report.
