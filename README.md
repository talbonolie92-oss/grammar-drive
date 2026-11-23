# Grammar Drive: Open Road Challenge

A multiplayer grammar driving game for Grade 10–12, built with plain HTML, CSS and JavaScript, Firebase Authentication and the Firebase Realtime Database (Spark free plan). It is hosted on GitHub Pages.

**Phase 1 (this version):** a stable join → lobby → start → end foundation. The driving game arrives in Phase 2.

## Project structure
```
index.html                 Landing page (students: scan the QR code; teachers: dashboard link)
teacher.html               Teacher dashboard
student.html               Student join page (opened from the QR code / link only)
test.html                  System check: Firebase connection + automatic database-rules self-test
database.rules.json        Realtime Database Rules (paste into the Firebase console)
css/style.css              Shared styles for all pages
js/firebase.js             Firebase setup: separate teacher and student sign-ins
js/common.js               Shared helpers + the ONE definition of the database layout
js/teacher.js              Dashboard logic
js/student.js              Student join logic
js/selftest.js             Rules self-test logic (used by test.html)
js/vendor/qrcode.js        QR code generator (MIT), no npm needed
docs/RULES-PLAYGROUND-TESTS.md   Manual checks in the Firebase Rules Playground
```

## How students join
1. The teacher creates a session and shows the QR code (or shares the link).
2. The student opens the link and types their **name** and **class/section**.
3. Firebase signs them in anonymously and silently. There's no email, password, account or code to type.
4. The teacher sees them in the live lobby and presses **Start**.

If a student refreshes the page or locks their phone, they return to the same place: the same browser remembers the same anonymous identity.

## Database layout
```
teachers/{teacherUid}        { role: "teacher", active: true }          ← create by hand in the console
sessions/{sessionId}         { teacherUid, code, grade, topics, durationMinutes, allowLateJoin,
                               status: waiting|running|ended, createdAt, startedAt?, endedAt? }
sessions/{sessionId}/players/{studentUid}
                             { name, classSection, joinedAt, progress: { score, correct, answered, updatedAt } }
joinCodes/{CODE}             { sessionId, status, durationMinutes, allowLateJoin, startedAt? }  ← students' public copy
```
All times are set by the Firebase server clock, never by the device.

## What the rules guarantee
- Only active teachers (listed in `teachers`) can create and control sessions, and only their own.
- A session and its join code are created together in one atomic update. Start and End also update both together.
- Status only moves forward: `waiting → running → ended`. Start needs `startedAt`; End needs `endedAt`.
- Students can read only the join code and their own record. They can create their own record once, by joining.
- Name and class can't be changed by the student afterwards; the teacher can fix them.
- Score updates only touch `progress`. Each update must be +1 answer, at most +60 points, at least 2 seconds apart, while the game is running and before the time limit. Nothing can be written after the game ends.
- Join codes contain no teacher information.

**Limit (accepted for this classroom version):** scores are *provisional*. They are calculated on each student's device, and the rules only limit how fast and how much they can change. Verified scoring would need a server (Cloud Functions, Blaze plan), which this project does not use. Scoring will live in its own file (`js/scoring.js`, Phase 3) so it can be replaced later.

## Firebase console checklist (one time)
1. **Authentication → Sign-in method:** *Email/Password* and *Anonymous* enabled (already done).
2. **Realtime Database → Data:** your teacher record exists at `teachers/<your UID>` with `role: "teacher"` and `active: true` (already done).

## Deploying Phase 1 (do this outside class time)
The new pages and the new rules belong together. Old pages don't work with the new rules, and new pages don't work with the old rules.
1. **Copy your current rules** from the console (Realtime Database → Rules) into a text file, so you can restore them if needed.
2. Upload the new files to GitHub and delete `js/index.html`. Wait about a minute for GitHub Pages to update.
3. In the console, replace the rules with the contents of `database.rules.json` and press **Publish**.
4. Open `test.html`:
   - press **Test Firebase Connection**;
   - then log in to **Run rules self-test**;
   - all checks must pass. Tick the time-limit box once, too.
5. Do the manual checks in `docs/RULES-PLAYGROUND-TESTS.md`.
6. Try a real lobby: the dashboard on a laptop and 2–3 phones scanning the QR code.

**To undo:** paste your saved old rules back and publish them, then restore the old files from GitHub history.

## Existing data
Nothing is deleted. Sessions made with the earlier version:
- appear on the dashboard as **old** and are read-only;
- their old links tell students to ask for a new session.

You can delete old test data by hand in the console whenever you like.
