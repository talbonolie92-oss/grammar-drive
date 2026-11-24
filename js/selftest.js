
 // --------------------------------------------------
 // Grammar Drive: Open Road Challenge
 // js/selftest.js — Firebase Rules self-test
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
  serverTimestamp
} from "./firebase.js";

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

/* ---------- helpers ---------- */

const results = [];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isDenied = (error) =>
  /PERMISSION_DENIED|permission[_ ]denied/i.test(
    String((error && (error.code || error.message)) || "")
  );

function report(status, label, detail) {
  results.push({
    status,
    label,
    detail: detail || ""
  });

  $("testResults").appendChild(
    el("div", {
      className: "test-row " + status
    }, [
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

    return false;
  } catch (error) {
    if (isDenied(error)) {
      report("pass", "refused: " + label);
      return true;
    }

    report(
      "fail",
      "should be REFUSED: " + label,
      "Failed for another reason: " + friendlyError(error)
    );

    return false;
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

/*
 * Every test session carries testOnly:true.
 * The revised Rules permit deletion only for these
 * explicitly marked test sessions.
 */
function createTestSession(sid, code, uid, options) {
  const writes = buildCreateSession(sid, code, uid, options);

  writes["sessions/" + sid].testOnly = true;

  return writes;
}

/* ---------- 1. connection test ---------- */

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
        (error.code || "") + " " +
        friendlyError(error)
    );

  } finally {
    $("connButton").disabled = false;
  }
});

/* ---------- 2. rules self-test ---------- */

$("testForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  $("runButton").disabled = true;
  $("copyReport").classList.add("hidden");
  $("testResults").textContent = "";

  results.length = 0;

  showMessage(
    $("testSummary"),
    "Running… keep this tab open.",
    "info"
  );

  /*
   * created entries:
   * { sid, code, deleteCode }
   */
  const created = [];

  const T = testFirebase("teacher");
  const A = testFirebase("studentA");
  const B = testFirebase("studentB");
  const C = testFirebase("studentC");

  let tUid = null;

  try {
    /* ---------- sign in ---------- */

    try {
      tUid = (
        await signInWithEmailAndPassword(
          T.auth,
          $("tEmail").value.trim(),
          $("tPassword").value
        )
      ).user.uid;

      report("pass", "Teacher login");

    } catch (error) {
      report("fail", "Teacher login", friendlyError(error));
      throw new Error("stop");
    }

    const ua = (await signInAnonymously(A.auth)).user.uid;
    const ub = (await signInAnonymously(B.auth)).user.uid;
    const uc = (await signInAnonymously(C.auth)).user.uid;

    report("pass", "Three temporary anonymous students signed in");

    /* ---------- check rules publication ---------- */

    try {
      await get(ref(A.db, "rulesVersion"));

      report(
        "pass",
        "Phase 1 rules are published (rulesVersion is readable)"
      );

    } catch (error) {
      report(
        "fail",
        "Phase 1 rules are NOT published",
        "Publish database.rules.json in Firebase Console, then run this test again. Nothing was written."
      );

      throw new Error("stop");
    }

    /* ---------- teacher record ---------- */

    await allow(
      "teacher reads own teachers record",
      async () => {
        const rec = (
          await get(ref(T.db, "teachers/" + tUid))
        ).val();

        if (
          !rec ||
          rec.role !== "teacher" ||
          rec.active !== true
        ) {
          throw new Error(
            "Teacher record is not { role: 'teacher', active: true }"
          );
        }
      }
    );

    await deny(
      "student reads the teacher record",
      () => get(ref(A.db, "teachers/" + tUid))
    );

    await deny(
      "student writes a teachers record",
      () => set(
        ref(A.db, "teachers/" + ua),
        { role: "teacher", active: true }
      )
    );

    await deny(
      "teacher writes own teachers record",
      () => set(
        ref(T.db, "teachers/" + tUid + "/active"),
        true
      )
    );

    /* ---------- session creation ---------- */

    const opts = {
      grade: "11",
      topics: ["Tag Questions", "Wh-Questions"],
      durationMinutes: 10,
      allowLateJoin: false
    };

    let x = newIds(T.db);

    const noJoinCode = createTestSession(
      x.sid,
      x.code,
      tUid,
      opts
    );

    await deny(
      "session without a join code",
      () => update(ref(T.db), {
        ["sessions/" + x.sid]:
          noJoinCode["sessions/" + x.sid]
      }),
      () => created.push({
        sid: x.sid,
        code: null,
        deleteCode: false
      })
    );

    x = newIds(T.db);

    const orphanCode = createTestSession(
      x.sid,
      x.code,
      tUid,
      opts
    );

    await deny(
      "join code without a session",
      () => update(ref(T.db), {
        ["joinCodes/" + x.code]:
          orphanCode["joinCodes/" + x.code]
      })
    );

    const variant = async (label, change) => {
      const v = newIds(T.db);

      const writes = createTestSession(
        v.sid,
        v.code,
        tUid,
        opts
      );

      change(writes, v);

      await deny(
        label,
        () => update(ref(T.db), writes),
        () => created.push({
          sid: v.sid,
          code: null,
          deleteCode: false
        })
      );
    };

    await variant(
      "createdAt from the device clock",
      (writes, v) => {
        writes["sessions/" + v.sid].createdAt = Date.now();
      }
    );

    await variant(
      "extra field (teacherEmail) in the session",
      (writes, v) => {
        writes["sessions/" + v.sid].teacherEmail = "x@example.com";
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

    const studentSession = createTestSession(
      x.sid,
      x.code,
      ua,
      opts
    );

    await deny(
      "student creates a session",
      () => update(ref(A.db), studentSession)
    );

    /* ---------- valid session ---------- */

    const S1 = newIds(T.db);

    const okCreate = await allow(
      "session + join code in ONE atomic update",
      () => update(
        ref(T.db),
        createTestSession(S1.sid, S1.code, tUid, opts)
      )
    );

    if (!okCreate) {
      throw new Error("stop");
    }

    created.push({
      sid: S1.sid,
      code: S1.code,
      deleteCode: true
    });

    /* ---------- duplicate join code ---------- */

    x = newIds(T.db);

    await deny(
      "re-using an existing join code",
      () => update(
        ref(T.db),
        createTestSession(x.sid, S1.code, tUid, opts)
      ),
      () => created.push({
        sid: x.sid,
        code: null,
        deleteCode: false
      })
    );

    /* ---------- reading ---------- */

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
      () => get(
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
      () => get(
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
      () => get(
        query(
          ref(A.db, "sessions"),
          orderByChild("teacherUid"),
          equalTo(ua)
        )
      )
    );

    /* ---------- session settings are immutable ---------- */

    await deny(
      "teacher changes grade after creation",
      () => update(
        ref(T.db, paths.session(S1.sid)),
        { grade: "12" }
      )
    );

    await deny(
      "teacher changes topics after creation",
      () => set(
        ref(T.db, paths.session(S1.sid) + "/topics"),
        ["Yes/No Questions"]
      )
    );

    await deny(
      "teacher changes late-join setting after creation",
      () => set(
        ref(T.db, paths.session(S1.sid) + "/allowLateJoin"),
        true
      )
    );

    /* ---------- joining ---------- */

    await allow(
      "student A joins (name, class, server time)",
      () => set(
        ref(A.db, paths.player(S1.sid, ua)),
        buildPlayer("Test Student A", "TEST")
      )
    );

    await deny(
      "student A joins again (overwrite)",
      () => set(
        ref(A.db, paths.player(S1.sid, ua)),
        buildPlayer("Test Student A", "TEST")
      )
    );

    await deny(
      "join with a device-clock joinedAt",
      () => set(
        ref(B.db, paths.player(S1.sid, ub)),
        Object.assign(
          buildPlayer("Test Student B", "TEST"),
          { joinedAt: Date.now() }
        )
      )
    );

    await deny(
      "join with a starting score",
      () => set(
        ref(B.db, paths.player(S1.sid, ub)),
        Object.assign(
          buildPlayer("Test Student B", "TEST"),
          { progress: buildProgress(50, 0, 0) }
        )
      )
    );

    await deny(
      "join with an extra uid field",
      () => set(
        ref(B.db, paths.player(S1.sid, ub)),
        Object.assign(
          buildPlayer("Test Student B", "TEST"),
          { uid: ub }
        )
      )
    );

    await deny(
      "41-character name",
      () => set(
        ref(B.db, paths.player(S1.sid, ub)),
        buildPlayer("x".repeat(41), "TEST")
      )
    );

    await deny(
      "student B writes a record for student C",
      () => set(
        ref(B.db, paths.player(S1.sid, uc)),
        buildPlayer("Fake", "TEST")
      )
    );

    await allow(
      "student B joins",
      () => set(
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
      "teacher reads the full player list (2 students)",
      async () => {
        const n = Object.keys(
          (await get(ref(T.db, paths.players(S1.sid))).val() || {})
        ).length;

        if (n !== 2) {
          throw new Error(
            "Expected 2 students, found " + n
          );
        }
      }
    );

    /* ---------- before start ---------- */

    await deny(
      "progress before the game starts",
      () => set(
        ref(A.db, paths.progress(S1.sid, ua)),
        buildProgress(20, 1, 1)
      )
    );

    await deny(
      "student renames self",
      () => set(
        ref(A.db, paths.player(S1.sid, ua) + "/name"),
        "Hacker"
      )
    );

    await allow(
      "teacher fixes a student's name",
      () => update(
        ref(T.db, paths.player(S1.sid, ua)),
        {
          name: "Test Student A2",
          classSection: "TEST2"
        }
      )
    );

    /* ---------- start ---------- */

    await deny(
      "start without startedAt",
      () => update(ref(T.db), {
        ["sessions/" + S1.sid + "/status"]: "running",
        ["joinCodes/" + S1.code + "/status"]: "running"
      })
    );

    await deny(
      "start without updating the join code",
      () => update(ref(T.db), {
        ["sessions/" + S1.sid + "/status"]: "running",
        ["sessions/" + S1.sid + "/startedAt"]: serverTimestamp()
      })
    );

    await deny(
      "start with a device-clock startedAt",
      () => update(ref(T.db), {
        ["sessions/" + S1.sid + "/status"]: "running",
        ["sessions/" + S1.sid + "/startedAt"]: 42,
        ["joinCodes/" + S1.code + "/status"]: "running",
        ["joinCodes/" + S1.code + "/startedAt"]: 42
      })
    );

    await deny(
      "student starts the game",
      () => update(
        ref(A.db),
        buildStartSession(S1.sid, S1.code)
      )
    );

    await allow(
      "START: status + startedAt + join code in one update",
      () => update(
        ref(T.db),
        buildStartSession(S1.sid, S1.code)
      )
    );

    await deny(
      "running → waiting",
      () => update(ref(T.db), {
        ["sessions/" + S1.sid + "/status"]: "waiting",
        ["joinCodes/" + S1.code + "/status"]: "waiting"
      })
    );

    await deny(
      "late join when late join is off",
      () => set(
        ref(C.db, paths.player(S1.sid, uc)),
        buildPlayer("Test Student C", "TEST")
      )
    );

    /* ---------- progress ---------- */

    await wait(2200);

    await allow(
      "valid progress update (+1 answer, +20 points)",
      () => set(
        ref(A.db, paths.progress(S1.sid, ua)),
        buildProgress(20, 1, 1)
      )
    );

    await deny(
      "another update within 2 seconds",
      () => set(
        ref(A.db, paths.progress(S1.sid, ua)),
        buildProgress(40, 2, 2)
      )
    );

    await wait(2200);

    await deny(
      "more than +60 points for one answer",
      () => set(
        ref(A.db, paths.progress(S1.sid, ua)),
        buildProgress(81, 2, 2)
      )
    );

    await deny(
      "two answers at once",
      () => set(
        ref(A.db, paths.progress(S1.sid, ua)),
        buildProgress(40, 3, 3)
      )
    );

    await deny(
      "score goes down",
      () => set(
        ref(A.db, paths.progress(S1.sid, ua)),
        buildProgress(10, 1, 2)
      )
    );

    await deny(
      "correct greater than answered",
      () => set(
        ref(A.db, paths.progress(S1.sid, ua)),
        buildProgress(40, 3, 2)
      )
    );

    await deny(
      "extra field inside progress",
      () => set(
        ref(A.db, paths.progress(S1.sid, ua)),
        Object.assign(
          buildProgress(40, 2, 2),
          { coins: 999 }
        )
      )
    );

    await deny(
      "device-clock updatedAt",
      () => set(
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
      () => update(
        ref(A.db, paths.player(S1.sid, ua)),
        {
          progress: buildProgress(40, 2, 2),
          name: "Hacker"
        }
      )
    );

    await deny(
      "student B changes student A's score",
      () => set(
        ref(B.db, paths.progress(S1.sid, ua)),
        buildProgress(40, 2, 2)
      )
    );

    await allow(
      "second valid update (wrong answer: +0 points)",
      () => set(
        ref(A.db, paths.progress(S1.sid, ua)),
        buildProgress(20, 1, 2)
      )
    );

    /* ---------- end ---------- */

    await deny(
      "end without endedAt",
      () => update(ref(T.db), {
        ["sessions/" + S1.sid + "/status"]: "ended",
        ["joinCodes/" + S1.code + "/status"]: "ended"
      })
    );

    await allow(
      "END: status + endedAt + join code in one update",
      () => update(
        ref(T.db),
        buildEndSession(S1.sid, S1.code)
      )
    );

    await deny(
      "ended → running",
      () => update(ref(T.db), {
        ["sessions/" + S1.sid + "/status"]: "running",
        ["joinCodes/" + S1.code + "/status"]: "running"
      })
    );

    await deny(
      "ended → waiting",
      () => update(ref(T.db), {
        ["sessions/" + S1.sid + "/status"]: "waiting",
        ["joinCodes/" + S1.code + "/status"]: "waiting"
      })
    );

    await wait(2200);

    await deny(
      "student progress after END",
      () => set(
        ref(B.db, paths.progress(S1.sid, ub)),
        buildProgress(10, 1, 1)
      )
    );

    await deny(
      "new student joins after END",
      () => set(
        ref(C.db, paths.player(S1.sid, uc)),
        buildPlayer("Test Student C", "TEST")
      )
    );

    await deny(
      "teacher changes a score after END",
      () => set(
        ref(T.db, paths.progress(S1.sid, ua)),
        buildProgress(999, 1, 2)
      )
    );

    await deny(
      "teacher renames a student after END",
      () => update(
        ref(T.db, paths.player(S1.sid, ua)),
        {
          name: "Changed After End",
          classSection: "HACKED"
        }
      )
    );

    await deny(
      "teacher removes a student after END",
      () => remove(
        ref(T.db, paths.player(S1.sid, ub))
      )
    );

    await deny(
      "student deletes own record",
      () => remove(
        ref(A.db, paths.player(S1.sid, ua))
      )
    );

    /* ---------- cancel a waiting session ---------- */

    const SC = newIds(T.db);

    if (
      await allow(
        "create a second session (for cancel)",
        () => update(
          ref(T.db),
          createTestSession(SC.sid, SC.code, tUid, opts)
        )
      )
    ) {
      created.push({
        sid: SC.sid,
        code: SC.code,
        deleteCode: true
      });

      await allow(
        "waiting → ended (cancel) with endedAt",
        () => update(
          ref(T.db),
          buildEndSession(SC.sid, SC.code)
        )
      );
    }

    /* ---------- late join ---------- */

    const SL = newIds(T.db);

    if (
      await allow(
        "create a late-join session",
        () => update(
          ref(T.db),
          createTestSession(
            SL.sid,
            SL.code,
            tUid,
            Object.assign({}, opts, { allowLateJoin: true })
          )
        )
      )
    ) {
      created.push({
        sid: SL.sid,
        code: SL.code,
        deleteCode: true
      });

      await allow(
        "start the late-join session",
        () => update(
          ref(T.db),
          buildStartSession(SL.sid, SL.code)
        )
      );

      await allow(
        "student joins after the start (late join on)",
        () => set(
          ref(C.db, paths.player(SL.sid, uc)),
          buildPlayer("Test Student C", "TEST")
        )
      );

      await allow(
        "end the late-join session",
        () => update(
          ref(T.db),
          buildEndSession(SL.sid, SL.code)
        )
      );
    }

    /* ---------- time limit (optional) ---------- */

    if ($("longTest").checked) {
      const ST = newIds(T.db);

      const shortOpts = Object.assign({}, opts, {
        durationMinutes: 5,
        allowLateJoin: true
      });

      if (
        await allow(
          "create a 5-minute session",
          () => update(
            ref(T.db),
            createTestSession(ST.sid, ST.code, tUid, shortOpts)
          )
        )
      ) {
        created.push({
          sid: ST.sid,
          code: ST.code,
          deleteCode: true
        });

        await allow(
          "student A joins it",
          () => set(
            ref(A.db, paths.player(ST.sid, ua)),
            buildPlayer("Test Student A", "TEST")
          )
        );

        await allow(
          "start it",
          () => update(
            ref(T.db),
            buildStartSession(ST.sid, ST.code)
          )
        );

        showMessage(
          $("testSummary"),
          "Waiting 5 minutes 20 seconds for the time limit… keep this tab open.",
          "info"
        );

        await wait(5 * 60000 + 20000);

        await deny(
          "progress after the time limit",
          () => set(
            ref(A.db, paths.progress(ST.sid, ua)),
            buildProgress(20, 1, 1)
          )
        );

        await deny(
          "late join after the time limit",
          () => set(
            ref(B.db, paths.player(ST.sid, ub)),
            buildPlayer("Test Student B", "TEST")
          )
        );

        await allow(
          "teacher ends it",
          () => update(
            ref(T.db),
            buildEndSession(ST.sid, ST.code)
          )
        );
      }
    } else {
      skip(
        "time-limit test",
        "Not selected (tick the box to include it)."
      );
    }

    skip(
      "another teacher's sessions are protected",
      "Needs a second teacher account. Checked separately in the Rules Playground."
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
    /* ---------- cleanup ---------- */

    let cleaned = 0;

    for (const item of created) {
      /*
       * Delete join code first.
       * The Rules verify the existing testOnly session
       * before allowing the code to be deleted.
       */
      if (item.deleteCode && item.code) {
        try {
          await remove(
            ref(T.db, paths.joinCode(item.code))
          );
        } catch (error) {
          report(
            "fail",
            "clean-up of test join code " + item.code,
            friendlyError(error)
          );
        }
      }

      /*
       * Then delete the test-only session.
       * Ordinary classroom sessions are not eligible.
       */
      try {
        await remove(
          ref(T.db, paths.session(item.sid))
        );

        cleaned++;

      } catch (error) {
        report(
          "fail",
          "clean-up of test session " + item.sid,
          friendlyError(error) +
            " — inspect this test-only session in Firebase Console."
        );
      }
    }

    /* Delete temporary anonymous accounts. */

    for (const student of [A, B, C]) {
      if (student.auth.currentUser) {
        try {
          await deleteUser(student.auth.currentUser);
        } catch (error) {
          report(
            "fail",
            "temporary student account cleanup",
            friendlyError(error)
          );
        }
      }
    }

    if (T.auth.currentUser) {
      try {
        await signOut(T.auth);
      } catch (error) {
        report(
          "fail",
          "temporary teacher test sign-out",
          friendlyError(error)
        );
      }
    }

    if (cleaned) {
      report(
        "pass",
        "clean-up: " + cleaned + " test session(s) deleted"
      );
    }

    const fails = results.filter(
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
      fails
        ? fails + " check(s) FAILED, " + passes +
          " passed, " + skips +
          " skipped. Do not use this version in class until the failures are fixed."
        : "All " + passes + " checks passed. " +
          skips + " skipped.",
      fails ? "error" : "success"
    );

    $("copyReport").classList.remove("hidden");
    $("runButton").disabled = false;
  }
});

/* ---------- copy report ---------- */

$("copyReport").addEventListener("click", () => {
  const text = results
    .map((item) =>
      item.status.toUpperCase() +
      "  " + item.label +
      (item.detail ? "  — " + item.detail : "")
    )
    .join("\n");

  navigator.clipboard.writeText(text).then(
    () => showMessage(
      $("testSummary"),
      "Report copied.",
      "success"
    ),
    () => showMessage(
      $("testSummary"),
      "Could not copy the report. You can select and copy the results manually."
    )
  );
});
