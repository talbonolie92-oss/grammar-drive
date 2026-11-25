
// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/selftest.js — Phase 1 Firebase Rules self-test
// Uses temporary Firebase instances and test-only sessions.
// --------------------------------------------------

import {
  testFirebase,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  deleteUser,
  ref,
  get,
  set,
  update,
  remove,
  push,
  query,
  orderByChild,
  equalTo,
  limitToLast,
  serverTimestamp,
  runTransaction
} from "./firebase.js";

import { liveCarsPath } from "./multiplayer.js";

import {
  buildCreateSession,
  buildStartSession,
  buildEndSession,
  buildPlayer,
  buildProgress,
  paths,
  makeCode,
  $,
  el,
  showMessage,
  friendlyError
} from "./common.js";

// --------------------------------------------------
// 1. CONNECTION TEST
// --------------------------------------------------

$("connButton").addEventListener("click", async () => {
  const box = $("connStatus");
  $("connButton").disabled = true;

  showMessage(box, "Connecting to Firebase…", "info");

  try {
    const t = testFirebase("connection");
    const result = await signInAnonymously(t.auth);

    await deleteUser(result.user);

    showMessage(
      box,
      "SUCCESS: Firebase Authentication and anonymous sign-in are working.",
      "success"
    );
  } catch (error) {
    showMessage(
      box,
      "CONNECTION FAILED: " +
        (error.code || "") +
        " " +
        friendlyError(error)
    );
  } finally {
    $("connButton").disabled = false;
  }
});

// --------------------------------------------------
// 2. TEST HELPERS
// --------------------------------------------------

const results = [];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isDenied = (error) =>
  /PERMISSION_DENIED|permission[_ ]denied/i.test(
    String((error && (error.code || error.message)) || "")
  );

function report(status, label, detail = "") {
  results.push({ status, label, detail });

  $("testResults").appendChild(
    el("div", { className: "test-row " + status }, [
      el("div", {
        className: "result",
        text: status.toUpperCase()
      }),
      el("div", {}, [
        label,
        detail
          ? el("div", {
              className: "detail",
              text: detail
            })
          : null
      ])
    ])
  );
}

async function allow(label, fn) {
  try {
    await fn();
    report("pass", "allowed: " + label);
    return true;
  } catch (error) {
    report(
      "fail",
      "should be ALLOWED: " + label,
      friendlyError(error)
    );
    return false;
  }
}

async function deny(label, fn, onUnexpected) {
  try {
    await fn();

    report(
      "fail",
      "should be REFUSED: " + label,
      "It was allowed."
    );

    if (onUnexpected) onUnexpected();
  } catch (error) {
    if (isDenied(error)) {
      report("pass", "refused: " + label);
    } else {
      report(
        "fail",
        "should be REFUSED: " + label,
        "Failed for another reason: " + friendlyError(error)
      );
    }
  }
}

function skip(label, why) {
  report("skip", label, why);
}

function newIds(db) {
  return {
    sid: push(ref(db, "sessions")).key,
    code: makeCode()
  };
}

// All test-created sessions carry testOnly: true.
// Normal classroom sessions do not use this property.

function createTestSession(sid, code, teacherUid, options) {
  const writes = buildCreateSession(
    sid,
    code,
    teacherUid,
    options
  );

  writes["sessions/" + sid].testOnly = true;

  return writes;
}

// --------------------------------------------------
// 3. MAIN RULES SELF-TEST
// --------------------------------------------------

$("testForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  $("runButton").disabled = true;
  $("testResults").textContent = "";
  $("copyReport").classList.add("hidden");

  results.length = 0;

  showMessage(
    $("testSummary"),
    "Running tests… Keep this tab open.",
    "info"
  );

  // Only these sessions are created by this test.
  // removeCode prevents accidental deletion of a reused code.
  const created = [];

  const T = testFirebase("teacher");
  const A = testFirebase("studentA");
  const B = testFirebase("studentB");
  const C = testFirebase("studentC");

  let tUid = null;

  try {
    // ------------------------------------------------
    // SIGN IN
    // ------------------------------------------------

    try {
      const credential = await signInWithEmailAndPassword(
        T.auth,
        $("tEmail").value.trim(),
        $("tPassword").value
      );

      tUid = credential.user.uid;
      report("pass", "Teacher login");
    } catch (error) {
      report("fail", "Teacher login", friendlyError(error));
      throw new Error("stop");
    }

    const ua = (await signInAnonymously(A.auth)).user.uid;
    const ub = (await signInAnonymously(B.auth)).user.uid;
    const uc = (await signInAnonymously(C.auth)).user.uid;

    report("pass", "Three temporary anonymous students signed in");

    // ------------------------------------------------
    // RULES VERSION MARKER
    // ------------------------------------------------

    try {
      const version = (
        await get(ref(A.db, "rulesVersion"))
      ).val();

      if (version !== "phase1-v2") {
        throw new Error(
          'Expected rulesVersion "phase1-v2", found: ' +
            JSON.stringify(version)
        );
      }

      report("pass", "Phase 1 rules marker verified: phase1-v2");
    } catch (error) {
      report(
        "fail",
        "Phase 1 rules marker is missing or incorrect",
        friendlyError(error) +
          '. The database must contain rulesVersion: "phase1-v2".'
      );

      throw new Error("stop");
    }

    // ------------------------------------------------
    // TEACHER RECORD
    // ------------------------------------------------

    await allow("teacher reads own teachers record", async () => {
      const record = (
        await get(ref(T.db, "teachers/" + tUid))
      ).val();

      if (
        !record ||
        record.role !== "teacher" ||
        record.active !== true
      ) {
        throw new Error(
          "Teacher record must contain role: teacher and active: true."
        );
      }
    });

    await deny(
      "student reads the teacher record",
      () => get(ref(A.db, "teachers/" + tUid))
    );

    await deny(
      "student writes a teachers record",
      () =>
        set(ref(A.db, "teachers/" + ua), {
          role: "teacher",
          active: true
        })
    );

    await deny(
      "teacher writes own teachers record",
      () =>
        set(
          ref(T.db, "teachers/" + tUid + "/active"),
          true
        )
    );

    // ------------------------------------------------
    // SESSION CREATION
    // ------------------------------------------------

    const options = {
      grade: "11",
      topics: ["Tag Questions", "Wh-Questions"],
      durationMinutes: 10,
      allowLateJoin: false
    };

    let x = newIds(T.db);

    await deny(
      "session without a join code",
      () => {
        const writes = createTestSession(
          x.sid,
          x.code,
          tUid,
          options
        );

        return update(ref(T.db), {
          ["sessions/" + x.sid]: writes["sessions/" + x.sid]
        });
      },
      () => created.push({ sid: x.sid, code: null })
    );

    const variant = async (label, change) => {
      const v = newIds(T.db);
      const writes = createTestSession(
        v.sid,
        v.code,
        tUid,
        options
      );

      change(writes, v);

      await deny(
        label,
        () => update(ref(T.db), writes),
        () => created.push(v)
      );
    };

    await variant(
      "createdAt from the device clock",
      (writes, v) => {
        writes["sessions/" + v.sid].createdAt = Date.now();
      }
    );

    await variant(
      "extra field in the session",
      (writes, v) => {
        writes["sessions/" + v.sid].teacherEmail =
          "test@example.com";
      }
    );

    await variant(
      "teacher data in the public join code",
      (writes, v) => {
        writes["joinCodes/" + v.code].teacherUid = tUid;
      }
    );

    await variant(
      "grade 9",
      (writes, v) => {
        writes["sessions/" + v.sid].grade = "9";
      }
    );

    await variant(
      "3-minute duration",
      (writes, v) => {
        writes["sessions/" + v.sid].durationMinutes = 3;
        writes["joinCodes/" + v.code].durationMinutes = 3;
      }
    );

    await variant(
      "new session already running",
      (writes, v) => {
        writes["sessions/" + v.sid].status = "running";
        writes["joinCodes/" + v.code].status = "running";
      }
    );

    x = newIds(A.db);

    await deny(
      "student creates a session",
      () =>
        update(
          ref(A.db),
          createTestSession(x.sid, x.code, ua, options)
        )
    );

    const S1 = newIds(T.db);

    const createdSuccessfully = await allow(
      "session + join code in ONE atomic update",
      () =>
        update(
          ref(T.db),
          createTestSession(S1.sid, S1.code, tUid, options)
        )
    );

    if (!createdSuccessfully) {
      throw new Error("stop");
    }

    created.push(S1);

    // Reusing an existing code must never cause cleanup
    // to delete the original session's join code.
    x = newIds(T.db);

    await deny(
      "re-using an existing join code",
      () =>
        update(
          ref(T.db),
          createTestSession(x.sid, S1.code, tUid, options)
        ),
      () => created.push({ sid: x.sid, code: null })
    );

    // ------------------------------------------------
    // SESSION SETTINGS MUST BE IMMUTABLE
    // ------------------------------------------------

    await deny(
      "teacher changes grade after creation",
      () =>
        set(
          ref(T.db, paths.session(S1.sid) + "/grade"),
          "12"
        )
    );

    await deny(
      "teacher changes topics after creation",
      () =>
        set(
          ref(T.db, paths.session(S1.sid) + "/topics"),
          ["Yes/No Questions"]
        )
    );

    await deny(
      "teacher changes late-join setting after creation",
      () =>
        set(
          ref(
            T.db,
            paths.session(S1.sid) + "/allowLateJoin"
          ),
          true
        )
    );

    // ------------------------------------------------
    // READING PERMISSIONS
    // ------------------------------------------------

    await allow(
      "student reads the join code",
      () => get(ref(A.db, paths.joinCode(S1.code)))
    );

    await deny(
      "student reads the session",
      () => get(ref(A.db, paths.session(S1.sid)))
    );

    await allow(
      "teacher reads own session",
      () => get(ref(T.db, paths.session(S1.sid)))
    );

    await allow(
      "teacher lists own sessions",
      () =>
        get(
          query(
            ref(T.db, "sessions"),
            orderByChild("teacherUid"),
            equalTo(tUid),
            limitToLast(5)
          )
        )
    );

    await deny(
      "teacher lists another teacher's sessions",
      () =>
        get(
          query(
            ref(T.db, "sessions"),
            orderByChild("teacherUid"),
            equalTo("someone-else"),
            limitToLast(5)
          )
        )
    );

    await deny(
      "teacher reads ALL sessions",
      () => get(ref(T.db, "sessions"))
    );

    await deny(
      "student lists sessions",
      () =>
        get(
          query(
            ref(A.db, "sessions"),
            orderByChild("teacherUid"),
            equalTo(ua)
          )
        )
    );

    // ------------------------------------------------
    // STUDENT JOINING
    // ------------------------------------------------

    await allow(
      "student A joins",
      () =>
        set(
          ref(A.db, paths.player(S1.sid, ua)),
          buildPlayer("Test Student A", "TEST")
        )
    );

    await deny(
      "student A joins again and overwrites record",
      () =>
        set(
          ref(A.db, paths.player(S1.sid, ua)),
          buildPlayer("Test Student A", "TEST")
        )
    );

    await deny(
      "join with a device-clock joinedAt",
      () =>
        set(
          ref(B.db, paths.player(S1.sid, ub)),
          Object.assign(
            buildPlayer("Test Student B", "TEST"),
            { joinedAt: Date.now() }
          )
        )
    );

    await deny(
      "join with a starting score",
      () =>
        set(
          ref(B.db, paths.player(S1.sid, ub)),
          Object.assign(
            buildPlayer("Test Student B", "TEST"),
            { progress: buildProgress(50, 0, 0) }
          )
        )
    );

    await deny(
      "join with an extra uid field",
      () =>
        set(
          ref(B.db, paths.player(S1.sid, ub)),
          Object.assign(
            buildPlayer("Test Student B", "TEST"),
            { uid: ub }
          )
        )
    );

    await deny(
      "41-character name",
      () =>
        set(
          ref(B.db, paths.player(S1.sid, ub)),
          buildPlayer("x".repeat(41), "TEST")
        )
    );

    await deny(
      "student B writes a record for student C",
      () =>
        set(
          ref(B.db, paths.player(S1.sid, uc)),
          buildPlayer("Fake", "TEST")
        )
    );

    await allow(
      "student B joins",
      () =>
        set(
          ref(B.db, paths.player(S1.sid, ub)),
          buildPlayer("Test Student B", "TEST")
        )
    );

    await allow(
      "student A reads own record",
      () => get(ref(A.db, paths.player(S1.sid, ua)))
    );

    await deny(
      "student A reads student B's record",
      () => get(ref(A.db, paths.player(S1.sid, ub)))
    );

    await deny(
      "student A reads the player list",
      () => get(ref(A.db, paths.players(S1.sid)))
    );

    await allow(
      "teacher reads the full player list",
      async () => {
        const playerSnapshot = await get(
          ref(T.db, paths.players(S1.sid))
        );

        const playerCount = Object.keys(
          playerSnapshot.val() || {}
        ).length;

        if (playerCount !== 2) {
          throw new Error(
            "Expected 2 students, found " + playerCount
          );
        }
      }
    );

    // ------------------------------------------------
    // BEFORE START
    // ------------------------------------------------

    await deny(
      "progress before the game starts",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          buildProgress(20, 1, 1)
        )
    );

    await deny(
      "student renames self",
      () =>
        set(
          ref(A.db, paths.player(S1.sid, ua) + "/name"),
          "Hacker"
        )
    );

    await allow(
      "teacher fixes a student's name and class",
      () =>
        update(
          ref(T.db, paths.player(S1.sid, ua)),
          {
            name: "Test Student A2",
            classSection: "TEST2"
          }
        )
    );

    // ------------------------------------------------
    // START SESSION
    // ------------------------------------------------

    await deny(
      "start without startedAt",
      () =>
        update(ref(T.db), {
          ["sessions/" + S1.sid + "/status"]: "running",
          ["joinCodes/" + S1.code + "/status"]: "running"
        })
    );

    await deny(
      "start without updating the join code",
      () =>
        update(ref(T.db), {
          ["sessions/" + S1.sid + "/status"]: "running",
          ["sessions/" + S1.sid + "/startedAt"]:
            serverTimestamp()
        })
    );

    await deny(
      "start with a device-clock startedAt",
      () =>
        update(ref(T.db), {
          ["sessions/" + S1.sid + "/status"]: "running",
          ["sessions/" + S1.sid + "/startedAt"]: 42,
          ["joinCodes/" + S1.code + "/status"]: "running",
          ["joinCodes/" + S1.code + "/startedAt"]: 42
        })
    );

    await deny(
      "student starts the game",
      () =>
        update(
          ref(A.db),
          buildStartSession(S1.sid, S1.code)
        )
    );

    await allow(
      "START: status + startedAt + join code in one update",
      () =>
        update(
          ref(T.db),
          buildStartSession(S1.sid, S1.code)
        )
    );

    await deny(
      "running to waiting",
      () =>
        update(ref(T.db), {
          ["sessions/" + S1.sid + "/status"]: "waiting",
          ["joinCodes/" + S1.code + "/status"]: "waiting"
        })
    );

    await deny(
      "late join when late join is off",
      () =>
        set(
          ref(C.db, paths.player(S1.sid, uc)),
          buildPlayer("Test Student C", "TEST")
        )
    );

    // ------------------------------------------------
    // PROGRESS / PROVISIONAL SCORING LIMITS
    // ------------------------------------------------

    await wait(2200);

    await allow(
      "valid progress update (+1 answer, +20 points)",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          buildProgress(20, 1, 1)
        )
    );

    await deny(
      "another update within 2 seconds",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          buildProgress(40, 2, 2)
        )
    );

    await wait(2200);

    await deny(
      "more than +60 points for one answer",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          buildProgress(81, 2, 2)
        )
    );

    await deny(
      "two answers at once",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          buildProgress(40, 3, 3)
        )
    );

    await deny(
      "score goes down",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          buildProgress(10, 1, 2)
        )
    );

    await deny(
      "correct greater than answered",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          buildProgress(40, 3, 2)
        )
    );

    await deny(
      "extra field inside progress",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          Object.assign(
            buildProgress(40, 2, 2),
            { coins: 999 }
          )
        )
    );

    await deny(
      "device-clock updatedAt",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          {
            score: 40,
            correct: 2,
            answered: 2,
            updatedAt: Date.now() - 5000
          }
        )
    );

    await deny(
      "progress write that also changes the name",
      () =>
        update(
          ref(A.db, paths.player(S1.sid, ua)),
          {
            progress: buildProgress(40, 2, 2),
            name: "Hacker"
          }
        )
    );

    await deny(
      "student B changes student A's score",
      () =>
        set(
          ref(B.db, paths.progress(S1.sid, ua)),
          buildProgress(40, 2, 2)
        )
    );

    await allow(
      "second valid update (wrong answer: +0 points)",
      () =>
        set(
          ref(A.db, paths.progress(S1.sid, ua)),
          buildProgress(20, 1, 2)
        )
    );

    // ------------------------------------------------
    // ONE-TIME MISSION REWARD TRANSACTION
    // ------------------------------------------------

    await wait(2200);

    const missionId = "Question Forms-selftest";

    await allow(
      "mission completion and +30 points commit atomically",
      async () => {
        const result = await runTransaction(
          ref(A.db, paths.progress(S1.sid, ua)),
          (current) => {
            if (!current) return;
            const completed = current.missionCompletions || {};
            if (completed[missionId]) return;
            return {
              ...current,
              score: (Number(current.score) || 0) + 30,
              correct: (Number(current.correct) || 0) + 1,
              answered: (Number(current.answered) || 0) + 1,
              updatedAt: serverTimestamp(),
              missionCompletions: { ...completed, [missionId]: true }
            };
          },
          { applyLocally: false }
        );

        const value = result.snapshot.val();
        if (
          !result.committed ||
          value.score !== 50 ||
          value.correct !== 2 ||
          value.answered !== 3 ||
          value.missionCompletions?.[missionId] !== true
        ) {
          throw new Error("Mission reward transaction did not produce the expected result.");
        }
      }
    );

    await allow(
      "same mission ID cannot award points twice",
      async () => {
        const result = await runTransaction(
          ref(A.db, paths.progress(S1.sid, ua)),
          (current) => {
            if (!current) return;
            const completed = current.missionCompletions || {};
            if (completed[missionId]) return;
            return {
              ...current,
              score: (Number(current.score) || 0) + 30,
              correct: (Number(current.correct) || 0) + 1,
              answered: (Number(current.answered) || 0) + 1,
              updatedAt: serverTimestamp(),
              missionCompletions: { ...completed, [missionId]: true }
            };
          },
          { applyLocally: false }
        );

        if (result.committed) {
          throw new Error("The duplicate mission ID was committed.");
        }
      }
    );

    await deny(
      "a second mission reward inside the two-second cooldown",
      () =>
        runTransaction(
          ref(A.db, paths.progress(S1.sid, ua)),
          (current) => {
            if (!current) return;
            const completed = current.missionCompletions || {};
            const nextId = "Wh-Questions-selftest";
            if (completed[nextId]) return;
            return {
              ...current,
              score: (Number(current.score) || 0) + 30,
              correct: (Number(current.correct) || 0) + 1,
              answered: (Number(current.answered) || 0) + 1,
              updatedAt: serverTimestamp(),
              missionCompletions: { ...completed, [nextId]: true }
            };
          },
          { applyLocally: false }
        )
    );

    // ------------------------------------------------
    // PHASE 3 — LIVE MULTIPLAYER CARS
    // ------------------------------------------------

    const livePath = liveCarsPath(S1.sid);
    const carA = ref(A.db, livePath + "/" + ua);
    const makeCar = (name, x = 100) => ({
      x,
      y: 100,
      a: 0,
      s: 0,
      c: 1,
      n: name,
      t: serverTimestamp()
    });

    const carCreated = await allow(
      "student A creates own live car while session is running",
      () => set(carA, makeCar("Test Student A2"))
    );
    S1.liveCars = carCreated;

    await allow(
      "student A reads the shared live-car list",
      () => get(ref(A.db, livePath))
    );

    await allow(
      "joined student B reads the shared live-car list",
      () => get(ref(B.db, livePath))
    );

    await deny(
      "non-member student C reads live cars",
      () => get(ref(C.db, livePath))
    );

    await deny(
      "student B writes student A's car",
      () => set(ref(B.db, livePath + "/" + ua), makeCar("Test Student A2"))
    );

    await deny(
      "student A uses a name that does not match the player record",
      () => set(carA, makeCar("Fake Driver"))
    );

    await deny(
      "student A sends an out-of-range car position",
      () => set(carA, makeCar("Test Student A2", 5000))
    );

    await deny(
      "teacher cannot create a live car",
      () => set(ref(T.db, livePath + "/" + tUid), makeCar("Teacher"))
    );

    await deny(
      "student A uses a device-clock car timestamp",
      () => update(carA, { x: 101, n: "Test Student A2", t: Date.now() })
    );

    // A sequential client request can take longer than 150 ms to reach the
    // server, so the rate-limit boundary is documented/manual rather than
    // reported as a flaky automated pass or failure.
    skip(
      "150 ms live-car rate limit",
      "Timing depends on network latency; verify with real devices and the Firebase Rules Playground."
    );

    await wait(220);

    await allow(
      "student A updates own car after the cooldown",
      () => update(carA, { x: 102, n: "Test Student A2", t: serverTimestamp() })
    );

    const carBCreated = await allow(
      "student B creates own live car",
      () => set(ref(B.db, livePath + "/" + ub), makeCar("Test Student B"))
    );
    S1.liveCars = S1.liveCars || carBCreated;

    await allow(
      "teacher reads live cars for own session",
      () => get(ref(T.db, livePath))
    );

    // ------------------------------------------------
    // END SESSION
    // ------------------------------------------------

    await deny(
      "end without endedAt",
      () =>
        update(ref(T.db), {
          ["sessions/" + S1.sid + "/status"]: "ended",
          ["joinCodes/" + S1.code + "/status"]: "ended"
        })
    );

    await allow(
      "END: status + endedAt + join code in one update",
      () =>
        update(
          ref(T.db),
          buildEndSession(S1.sid, S1.code)
        )
    );

    await deny(
      "student cannot move own car after END",
      () => update(carA, { x: 120, n: "Test Student A2", t: serverTimestamp() })
    );

    await allow(
      "student can remove own live car after END",
      () => remove(carA)
    );

    if (S1.liveCars) {
      await allow(
        "teacher can remove the live-car collection for own session",
        () => remove(ref(T.db, livePath))
      );
    }

    await deny(
      "ended to running",
      () =>
        update(ref(T.db), {
          ["sessions/" + S1.sid + "/status"]: "running",
          ["joinCodes/" + S1.code + "/status"]: "running"
        })
    );

    await deny(
      "ended to waiting",
      () =>
        update(ref(T.db), {
          ["sessions/" + S1.sid + "/status"]: "waiting",
          ["joinCodes/" + S1.code + "/status"]: "waiting"
        })
    );

    await wait(2200);

    await deny(
      "student progress after END",
      () =>
        set(
          ref(B.db, paths.progress(S1.sid, ub)),
          buildProgress(10, 1, 1)
        )
    );

    await deny(
      "new student joins after END",
      () =>
        set(
          ref(C.db, paths.player(S1.sid, uc)),
          buildPlayer("Test Student C", "TEST")
        )
    );

    await deny(
      "teacher changes a score",
      () =>
        set(
          ref(T.db, paths.progress(S1.sid, ua)),
          buildProgress(999, 1, 2)
        )
    );

    await deny(
      "teacher renames a student after END",
      () =>
        set(
          ref(
            T.db,
            paths.player(S1.sid, ua) + "/name"
          ),
          "Changed After End"
        )
    );

    await deny(
      "teacher removes a student after END",
      () =>
        remove(ref(T.db, paths.player(S1.sid, ub)))
    );

    await deny(
      "student deletes own record",
      () =>
        remove(ref(A.db, paths.player(S1.sid, ua)))
    );

    // ------------------------------------------------
    // CANCEL A WAITING SESSION
    // ------------------------------------------------

    const SC = newIds(T.db);

    if (
      await allow(
        "create a second session for cancellation",
        () =>
          update(
            ref(T.db),
            createTestSession(
              SC.sid,
              SC.code,
              tUid,
              options
            )
          )
      )
    ) {
      created.push(SC);

      await allow(
        "waiting to ended (cancel) with endedAt",
        () =>
          update(
            ref(T.db),
            buildEndSession(SC.sid, SC.code)
          )
      );
    }

    // ------------------------------------------------
    // LATE JOIN
    // ------------------------------------------------

    const SL = newIds(T.db);

    const lateJoinOptions = Object.assign({}, options, {
      allowLateJoin: true
    });

    if (
      await allow(
        "create a late-join session",
        () =>
          update(
            ref(T.db),
            createTestSession(
              SL.sid,
              SL.code,
              tUid,
              lateJoinOptions
            )
          )
      )
    ) {
      created.push(SL);

      await allow(
        "start the late-join session",
        () =>
          update(
            ref(T.db),
            buildStartSession(SL.sid, SL.code)
          )
      );

      await allow(
        "student joins after the start (late join on)",
        () =>
          set(
            ref(C.db, paths.player(SL.sid, uc)),
            buildPlayer("Test Student C", "TEST")
          )
      );

      await allow(
        "end the late-join session",
        () =>
          update(
            ref(T.db),
            buildEndSession(SL.sid, SL.code)
          )
      );
    }

    // ------------------------------------------------
    // OPTIONAL TIME-LIMIT TEST
    // ------------------------------------------------

    if ($("longTest").checked) {
      const ST = newIds(T.db);

      const shortOptions = Object.assign({}, options, {
        durationMinutes: 5,
        allowLateJoin: true
      });

      if (
        await allow(
          "create a 5-minute session",
          () =>
            update(
              ref(T.db),
              createTestSession(
                ST.sid,
                ST.code,
                tUid,
                shortOptions
              )
            )
        )
      ) {
        created.push(ST);

        await allow(
          "student A joins the timed session",
          () =>
            set(
              ref(A.db, paths.player(ST.sid, ua)),
              buildPlayer("Test Student A", "TEST")
            )
        );

        await allow(
          "start the timed session",
          () =>
            update(
              ref(T.db),
              buildStartSession(ST.sid, ST.code)
            )
        );

        showMessage(
          $("testSummary"),
          "Waiting 5 minutes 20 seconds for the time limit… Keep this tab open.",
          "info"
        );

        await wait(5 * 60000 + 20000);

        await deny(
          "progress after the time limit",
          () =>
            set(
              ref(A.db, paths.progress(ST.sid, ua)),
              buildProgress(20, 1, 1)
            )
        );

        await deny(
          "late join after the time limit",
          () =>
            set(
              ref(B.db, paths.player(ST.sid, ub)),
              buildPlayer("Test Student B", "TEST")
            )
        );

        await allow(
          "teacher ends the timed session",
          () =>
            update(
              ref(T.db),
              buildEndSession(ST.sid, ST.code)
            )
        );
      }
    } else {
      skip(
        "time-limit test",
        "Not selected. Tick the optional long test checkbox to include it."
      );
    }

    skip(
      "another teacher's sessions are protected",
      "Requires a second teacher account. Verify separately in docs/RULES-PLAYGROUND-TESTS.md."
    );

  } catch (error) {
    if (error.message !== "stop") {
      report(
        "fail",
        "Test run stopped",
        friendlyError(error)
      );
    }

  } finally {
    // ------------------------------------------------
    // CLEANUP — ONLY TEST-CREATED DATA
    // ------------------------------------------------

    for (const item of created) {
      try {
        // Remove test cars before the session is deleted; owner permission
        // for deleting the liveCars subtree depends on the session record.
        if (item.liveCars) {
          await remove(ref(T.db, liveCarsPath(item.sid)));
        }

        if (item.code) {
          await remove(
            ref(T.db, "joinCodes/" + item.code)
          );
        }

        await remove(
          ref(T.db, "sessions/" + item.sid)
        );

      } catch (error) {
        report(
          "fail",
          "clean-up of test session " + item.sid,
          friendlyError(error) +
            " — if it still exists, remove only this test session manually in Firebase Console."
        );
      }
    }

    // Delete temporary anonymous student accounts.
    for (const student of [A, B, C]) {
      if (student.auth.currentUser) {
        try {
          await deleteUser(student.auth.currentUser);
        } catch (error) {
          // Temporary account cleanup failure does not stop the report.
        }
      }
    }

    // Sign out the temporary teacher test instance.
    if (T.auth.currentUser) {
      try {
        await signOut(T.auth);
      } catch (error) {
        // Ignore sign-out cleanup failure.
      }
    }

    if (created.length) {
      report(
        "pass",
        "Cleanup attempted for " +
          created.length +
          " test session(s) and temporary students"
      );
    }

    const failures = results.filter(
      (item) => item.status === "fail"
    ).length;

    const passes = results.filter(
      (item) => item.status === "pass"
    ).length;

    const skips = results.filter(
      (item) => item.status === "skip"
    ).length;

    showMessage(
      $("testSummary"),
      failures
        ? failures +
            " check(s) FAILED, " +
            passes +
            " passed, " +
            skips +
            " skipped. Do not use the new version in class until the failures are fixed."
        : "All " +
            passes +
            " checks passed, " +
            skips +
            " skipped.",
      failures ? "error" : "success"
    );

    $("copyReport").classList.remove("hidden");
    $("runButton").disabled = false;
  }
});

// --------------------------------------------------
// 4. COPY TEST REPORT
// --------------------------------------------------

$("copyReport").addEventListener("click", () => {
  const reportText = results
    .map(
      (item) =>
        item.status.toUpperCase() +
        "  " +
        item.label +
        (item.detail ? "  — " + item.detail : "")
    )
    .join("\n");

  navigator.clipboard
    .writeText(reportText)
    .then(() => {
      showMessage(
        $("testSummary"),
        "Test report copied.",
        "success"
      );
    })
    .catch(() => {
      showMessage(
        $("testSummary"),
        "Unable to copy automatically. Select and copy the report manually.",
        "error"
      );
    });
});
