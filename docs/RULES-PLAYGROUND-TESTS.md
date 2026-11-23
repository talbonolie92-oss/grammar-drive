# Manual Firebase Rules Playground tests

These checks use the **Rules Playground** in the Firebase console:
**Realtime Database → Rules → Rules Playground**. The Playground only *simulates* reads and writes. It never changes your data.

The automatic self-test (`test.html`) covers almost everything. These manual tests cover what it cannot:
- a second teacher account (P6)
- signed-out visitors
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

## If a result is different
Don't use the new version in class. Copy the test number and the result, and send them together with the `test.html` report.
