# Grammar Drive: Open Road Challenge

A multiplayer grammar driving game for Grade 10–12, built with plain HTML, CSS and JavaScript, Firebase Authentication and the Firebase Realtime Database (Spark free plan). It is hosted on GitHub Pages.

**Completed:** Phase 1 session foundation and Phase 2 student join/lobby flow. The current Phase 3 implementation adds a temporary multiplayer test track so real devices can verify shared car movement before the full driving world is built in Phase 4.

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
js/multiplayer.js          Shared live-car synchronization (Phase 3)
js/playtest.js             Temporary multiplayer test track (Phase 3)
play.html                  Temporary multiplayer test-track page
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
liveCars/{sessionId}/{uid}   { x, y, a, s, c, n, t }                                ← Phase 3 live positions
```
All times are set by the Firebase server clock, never by the device.

## What the rules guarantee
- Only active teachers (listed in `teachers`) can create and control sessions, and only their own.
- A session and its join code are created together in one atomic update. Start and End also update both together.
- Status only moves forward: `waiting → running → ended`. Start needs `startedAt`; End needs `endedAt`.
- Students can read the join code and their own player record. After joining, they can also read the shared live-car list for that session; they cannot read another student's player record. They can create their own player record once, by joining.
- Name and class can't be changed by the student afterwards; the teacher can fix them.
- Score updates only touch `progress`. Each update must be +1 answer, at most +60 points, at least 2 seconds apart, while the game is running and before the time limit. No score/progress updates are allowed after the game ends; a student may still delete their own live-car record for cleanup.
- Join codes contain no teacher information.
- Phase 3 students can read the live-car list only after joining the session; each student can write only their own car record while the session is running and within its time limit.
- Live-car records have bounded coordinates/speed, a server timestamp, a 150 ms minimum update interval, and a name that must match the student's current player record. The owner teacher can read the cars and delete the live-car subtree for their own session.
- Each connected device registers its own car for automatic removal on disconnect. The client waits for Firebase to acknowledge this registration before its first car upload. A deliberate Leave or Game Over also attempts to remove the car explicitly.

**Limit (accepted for this classroom version):** scores are *provisional*. They are calculated on each student's device, and the rules only limit how fast and how much they can change. Verified scoring would need a server (Cloud Functions, Blaze plan), which this project does not use. Phase 3 is only a multiplayer movement test; the grammar challenge and scoring system are separate later work.

## Firebase console checklist (one time)
1. **Authentication → Sign-in method:** *Email/Password* and *Anonymous* enabled (already done).
2. **Realtime Database → Data:** your teacher record exists at `teachers/<your UID>` with `role: "teacher"` and `active: true` (already done).

## Phase 3 release status
Phase 1 and Phase 2 have already been deployed and manually tested. The Phase 3 frontend, test track, self-tests, documentation, and database rules have now been committed to the repository, but the Phase 3 database rules have **not** been published to Firebase. Do not test the new multiplayer track against the old published rules: the `liveCars` path will be denied.

Before using Phase 3 with students, the matching frontend and `database.rules.json` must be released together. First back up the currently published rules. Then publish the Phase 3 rules and verify the updated `test.html` self-test, the manual checks in `docs/RULES-PLAYGROUND-TESTS.md`, and a real teacher laptop plus multiple student phones. The test-track page is `play.html`; it is a temporary multiplayer proof, not the finished driving game. The target is up to 30 students, but this is **not yet verified on the actual Firebase project**; a simulated 30-browser run had one test where some position updates were missing. Use the real-device checklist in `docs/RULES-PLAYGROUND-TESTS.md` before relying on a full class.

**Important:** adding files to the GitHub repository does not publish the Firebase Rules. The Firebase Rules update is a separate manual action and has not been performed by this project update.

**To undo a rules release:** restore the saved Firebase Rules backup. To undo a frontend release, restore the previous GitHub Pages commit.

## Existing data
Nothing is deleted. Sessions made with the earlier version:
- appear on the dashboard as **old** and are read-only;
- their old links tell students to ask for a new session.

You can delete old test data by hand in the console whenever you like.
