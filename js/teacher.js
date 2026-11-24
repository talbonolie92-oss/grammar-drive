
// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/teacher.js — teacher dashboard
// Login, sessions, QR, live lobby, start/end, results
// --------------------------------------------------

import {
  teacherFirebase, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  ref, get, update, remove, push, onValue, query, orderByChild, equalTo, limitToLast
} from "./firebase.js";

import {
  TOPICS, DURATIONS, NAME_MAX, CLASS_MAX,
  buildCreateSession, buildStartSession, buildEndSession, paths,
  makeCode, cleanText, normaliseName, $, el,
  showMessage, hideMessage, formatClock, formatTime,
  serverClock, endsAt, friendlyError, phase1RulesPublished, drawQR
} from "./common.js";

import { qrMatrix } from "./vendor/qrcode.js";

const { auth, db } = teacherFirebase();
const serverNow = serverClock(db);

let teacher = null;
let sessions = {};
let selectedId = null;
let stopSessionList = null;
let loggingIn = false;

const endRequested = {};

/* ---------- form setup ---------- */

TOPICS.forEach((topic) => {
  $("topicList").appendChild(
    el("label", { className: "check" }, [
      el("input", {
        type: "checkbox",
        name: "topics",
        value: topic,
        checked: true
      }),
      topic
    ])
  );
});

DURATIONS.forEach((minutes) => {
  $("duration").appendChild(
    el("option", {
      value: String(minutes),
      text: minutes + " minutes",
      selected: minutes === 20
    })
  );
});

/* ---------- login ---------- */

function showLogin() {
  $("loginView").classList.remove("hidden");
  $("dashboardView").classList.add("hidden");

  if (stopSessionList) {
    stopSessionList();
    stopSessionList = null;
  }

  teacher = null;
  sessions = {};
  selectedId = null;
}

async function verifyTeacher(user) {
  let record = null;

  try {
    record = (await get(ref(db, "teachers/" + user.uid))).val();
  } catch (error) {
    await signOut(auth);
    showLogin();

    showMessage(
      $("loginMessage"),
      "Could not check teacher access: " + friendlyError(error)
    );

    return false;
  }

  if (!record || record.role !== "teacher" || record.active !== true) {
    await signOut(auth);
    showLogin();

    showMessage(
      $("loginMessage"),
      "This account is not an active teacher account."
    );

    return false;
  }

  teacher = {
    uid: user.uid,
    email: user.email || ""
  };

  showDashboard();
  return true;
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (loggingIn) return;

  loggingIn = true;
  $("loginButton").disabled = true;
  $("loginButton").textContent = "Checking…";

  hideMessage($("loginMessage"));

  try {
    const result = await signInWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );

    await verifyTeacher(result.user);

  } catch (error) {
    showLogin();
    showMessage($("loginMessage"), friendlyError(error));

  } finally {
    loggingIn = false;
    $("loginButton").disabled = false;
    $("loginButton").textContent = "Teacher Login";
  }
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    showLogin();
    return;
  }

  if (!loggingIn && !teacher) {
    verifyTeacher(user);
  }
});

$("logoutButton").addEventListener("click", async () => {
  await signOut(auth);
  $("loginForm").reset();
  showLogin();
});

/* ---------- dashboard ---------- */

async function showDashboard() {
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");

  $("teacherInfo").textContent =
    "Logged in as " + teacher.email + " · Teacher ID: " + teacher.uid;

  if (!(await phase1RulesPublished(db))) {
    showMessage(
      $("rulesWarning"),
      "The new database rules are not published yet. Publish database.rules.json in the Firebase console (see README), then reload this page.",
      "warn"
    );
  } else {
    hideMessage($("rulesWarning"));
  }

  const mine = query(
    ref(db, "sessions"),
    orderByChild("teacherUid"),
    equalTo(teacher.uid),
    limitToLast(30)
  );

  stopSessionList = onValue(
    mine,
    (snap) => {
      sessions = snap.val() || {};
      renderSessionList();
      renderSession();
    },
    (error) => {
      showMessage(
        $("dashMessage"),
        "Could not load your sessions: " + friendlyError(error)
      );
    }
  );
}

function sortedSessions() {
  return Object.entries(sessions).sort(
    (a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0)
  );
}

function isOldFormat(session) {
  return (
    !session ||
    typeof session.code !== "string" ||
    typeof session.durationMinutes !== "number"
  );
}

function renderSessionList() {
  const box = $("sessionList");
  box.textContent = "";

  const list = sortedSessions();

  if (!list.length) {
    box.appendChild(
      el("p", {
        className: "muted",
        text: "No sessions yet."
      })
    );
    return;
  }

  list.forEach(([id, s]) => {
    const old = isOldFormat(s);
    const players = Object.keys(s.players || {}).length;

    box.appendChild(
      el("button", {
        type: "button",
        className: id === selectedId ? "selected" : "",
        onclick: () => selectSession(id)
      }, [
        el("span", {
          className: "badge " + (old ? "old" : s.status),
          text: old ? "old" : s.status
        }),

        " ",

        el("strong", {
          text: old ? (s.sessionCode || "—") : s.code
        }),

        el("div", {
          className: "small muted",
          text:
            (
              old
                ? "Created with an earlier version"
                : "Grade " + s.grade + " · " +
                  players + " student" + (players === 1 ? "" : "s")
            ) +
            " · " +
            (s.createdAt ? new Date(s.createdAt).toLocaleString() : "")
        })
      ])
    );
  });
}

function selectSession(id) {
  selectedId = id;
  renderSessionList();
  renderSession();
}

/* ---------- create ---------- */

$("createForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  hideMessage($("dashMessage"));

  const topics = Array.from(
    document.querySelectorAll('input[name="topics"]:checked')
  ).map((c) => c.value);

  if (!topics.length) {
    showMessage($("dashMessage"), "Please select at least one grammar topic.");
    return;
  }

  const options = {
    grade: $("grade").value,
    topics,
    durationMinutes: Number($("duration").value),
    allowLateJoin: $("allowLateJoin").checked
  };

  $("createButton").disabled = true;
  $("createButton").textContent = "Creating…";

  let lastError = null;

  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();

      if ((await get(ref(db, paths.joinCode(code)))).exists()) {
        continue;
      }

      const sessionId = push(ref(db, "sessions")).key;

      try {
        await update(
          ref(db),
          buildCreateSession(sessionId, code, teacher.uid, options)
        );

        selectSession(sessionId);

        showMessage(
          $("dashMessage"),
          "Session created. Show the QR code to your class.",
          "success"
        );

        return;

      } catch (error) {
        lastError = error;
      }
    }

    showMessage(
      $("dashMessage"),
      "Could not create the session: " +
        friendlyError(lastError || new Error("no free code found"))
    );

  } catch (error) {
    showMessage(
      $("dashMessage"),
      "Could not create the session: " + friendlyError(error)
    );

  } finally {
    $("createButton").disabled = false;
    $("createButton").textContent = "Create Game Session";
  }
});

/* ---------- selected session ---------- */

function joinLink(code) {
  const url = new URL("./student.html", window.location.href);

  url.search = "";
  url.hash = "";

  url.searchParams.set("code", code);

  return url.href;
}

function playerRows(session) {
  return Object.entries(session.players || {}).map(([uid, p]) => ({
    uid,
    name: String(p.name || ""),
    classSection: String(p.classSection || ""),
    joinedAt: p.joinedAt,
    score: (p.progress && p.progress.score) || 0,
    correct: (p.progress && p.progress.correct) || 0,
    answered: (p.progress && p.progress.answered) || 0
  }));
}

function accuracyPercent(row) {
  return row.answered > 0 ? Math.round((row.correct / row.answered) * 100) : 0;
}

function createResultsOverview(rows) {
  const ranked = rows.slice().sort((a, b) =>
    b.score - a.score || b.correct - a.correct ||
    accuracyPercent(b) - accuracyPercent(a) ||
    b.answered - a.answered || (a.joinedAt || 0) - (b.joinedAt || 0)
  );
  const totalAnswered = rows.reduce((sum, row) => sum + row.answered, 0);
  const totalCorrect = rows.reduce((sum, row) => sum + row.correct, 0);
  const totalScore = rows.reduce((sum, row) => sum + row.score, 0);
  const eligible = rows.filter(row => row.answered > 0);
  const awards = [];

  if (ranked.length && ranked[0].score > 0) {
    awards.push({ title: "Grammar Master", icon: "🏆", row: ranked[0], detail: ranked[0].score + " points" });
  }
  if (eligible.length) {
    const accuracy = eligible.slice().sort((a, b) =>
      accuracyPercent(b) - accuracyPercent(a) || b.correct - a.correct || b.score - a.score
    )[0];
    awards.push({ title: "Accuracy Star", icon: "🎯", row: accuracy, detail: accuracyPercent(accuracy) + "% accuracy" });
    const active = eligible.slice().sort((a, b) =>
      b.answered - a.answered || b.correct - a.correct || b.score - a.score
    )[0];
    awards.push({ title: "Most Active Driver", icon: "🚗", row: active, detail: active.answered + " answers" });
  }

  return {
    ranked,
    totalAnswered,
    totalCorrect,
    averageScore: rows.length ? Math.round(totalScore / rows.length) : 0,
    accuracy: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
    awards
  };
}

function renderResultsOverview(rows) {
  const report = createResultsOverview(rows);
  const section = el("section", { className: "panel results-report" }, [
    el("div", { className: "row" }, [
      el("div", {}, [
        el("span", { className: "badge ended", text: "SESSION COMPLETE" }),
        el("h2", { style: "margin:8px 0 2px", text: "Class performance report" }),
        el("p", { className: "muted small", text: "Final standings and classroom performance summary." })
      ]),
      el("div", { className: "spacer" }),
      el("button", {
        type: "button",
        className: "small secondary",
        text: "Download CSV",
        onclick: () => downloadResultsCSV(rows, report.ranked)
      })
    ]),
    el("div", { className: "report-stats" }, [
      ["Students", String(rows.length)],
      ["Average score", String(report.averageScore)],
      ["Overall accuracy", report.accuracy + "%"],
      ["Answers submitted", String(report.totalAnswered)]
    ].map(([label, value]) => el("div", { className: "report-stat" }, [
      el("span", { className: "muted small", text: label }),
      el("strong", { text: value })
    ]))),
    el("h3", { text: "🏁 Top 3 drivers" }),
    renderPodium(report.ranked.slice(0, 3)),
    el("h3", { text: "🏅 Class awards" }),
    el("div", { className: "award-grid" }, report.awards.map(award =>
      el("div", { className: "award-card" }, [
        el("span", { className: "award-icon", text: award.icon }),
        el("div", {}, [
          el("strong", { text: award.title }),
          el("div", { className: "small muted", text: award.row.name + " · " + award.row.classSection }),
          el("div", { className: "small", text: award.detail })
        ])
      ])
    ))
  ]);
  return section;
}

function renderPodium(top) {
  const podium = el("div", { className: "podium" });
  if (!top.length) {
    podium.appendChild(el("p", { className: "muted", text: "No scores recorded for this session." }));
    return podium;
  }
  const order = top.length >= 3 ? [top[1], top[0], top[2]] : top.slice();
  order.forEach((row) => {
    const rank = top.indexOf(row) + 1;
    podium.appendChild(el("div", { className: "podium-place place-" + rank }, [
      el("span", { className: "podium-medal", text: rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉" }),
      el("strong", { text: row.name }),
      el("span", { className: "small muted", text: row.classSection }),
      el("strong", { className: "podium-score", text: row.score + " pts" }),
      el("span", { className: "small muted", text: accuracyPercent(row) + "% accuracy" })
    ]));
  });
  return podium;
}

function downloadResultsCSV(rows, ranked) {
  const quote = value => '"' + String(value ?? "").replace(/"/g, '""') + '"';
  const lines = [
    ["Rank", "Name", "Class / Section", "Score", "Correct", "Answered", "Accuracy"].map(quote).join(",")
  ];
  ranked.forEach((row, index) => {
    lines.push([
      index + 1, row.name, row.classSection, row.score,
      row.correct, row.answered, accuracyPercent(row) + "%"
    ].map(quote).join(","));
  });
  const blob = new Blob(["\\uFEFF" + lines.join("\\r\\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "grammar-drive-results.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderSession() {
  const panel = $("sessionPanel");
  const s = selectedId ? sessions[selectedId] : null;

  panel.textContent = "";

  if (!s) {
    panel.appendChild(
      el("section", { className: "panel" }, [
        el("p", {
          className: "muted",
          text: 'Create a session, or choose one from "My sessions".'
        })
      ])
    );
    return;
  }

  const old = isOldFormat(s);
  const rows = playerRows(s);

  /* ---------- header + controls ---------- */

  const controls = el("div", { className: "row" });

  if (!old && s.status === "waiting") {
    controls.appendChild(
      el("button", {
        type: "button",
        className: "good",
        text: "▶ Start game",
        onclick: () => startGame(selectedId, s)
      })
    );

    controls.appendChild(
      el("button", {
        type: "button",
        className: "secondary",
        text: "Cancel session",
        onclick: () => confirmEnd(selectedId, s, true)
      })
    );
  }

  if (!old && s.status === "running") {
    controls.appendChild(
      el("button", {
        type: "button",
        className: "danger",
        text: "■ End game",
        onclick: () => confirmEnd(selectedId, s, false)
      })
    );
  }

  panel.appendChild(
    el("section", { className: "panel" }, [
      el("div", { className: "row" }, [
        el("span", {
          className: "badge " + (old ? "old" : s.status),
          text: old ? "old format" : s.status
        }),

        el("div", { className: "spacer" }),

        el("div", {
          className: "timer",
          id: "sessionTimer"
        })
      ]),

      el("h2", {
        style: "margin:10px 0 4px",
        text: old ? "Session " + (s.sessionCode || "") : "Session " + s.code
      }),

      el("p", {
        className: "muted",
        text: old
          ? "This session was created with an earlier version of the dashboard. It is shown read-only."
          : "Grade " + s.grade +
            " · " + Object.values(s.topics || {}).join(", ") +
            " · " + s.durationMinutes +
            " minutes · late join " +
            (s.allowLateJoin ? "allowed" : "off")
      }),

      controls,

      el("details", {
        className: "small muted",
        style: "margin-top:12px"
      }, [
        el("summary", { text: "Technical details" }),

        el("div", {
          text: "Session ID: " + selectedId
        }),

        el("div", {
          text:
            "Created: " + formatTime(s.createdAt) +
            (s.startedAt ? " · Started: " + formatTime(s.startedAt) : "") +
            (s.endedAt ? " · Ended: " + formatTime(s.endedAt) : "")
        })
      ])
    ])
  );

  /* ---------- join QR ---------- */

  if (
    !old &&
    s.status !== "ended" &&
    (s.status === "waiting" || s.allowLateJoin)
  ) {
    const link = joinLink(s.code);
    const canvas = el("canvas");

    panel.appendChild(
      el("section", { className: "panel" }, [
        el("h2", { text: "Students join here" }),

        el("div", {
          className: "row",
          style: "align-items:flex-start"
        }, [
          el("div", { className: "qr-box" }, [canvas]),

          el("div", {
            style: "flex:1;min-width:220px"
          }, [
            el("p", {
              text: "Students scan the QR code, type their name and class, and join."
            }),

            el("div", {
              className: "link-box",
              text: link
            }),

            el("div", { className: "row" }, [
              el("button", {
                type: "button",
                text: "Show QR full screen",
                onclick: () => showProjector(s.code, link)
              }),

              el("button", {
                type: "button",
                className: "secondary",
                text: "Copy link",
                onclick: () => copyText(link)
              })
            ])
          ])
        ])
      ])
    );

    drawQR(canvas, qrMatrix(link));
  }

  /* ---------- lobby / results ---------- */

  const counts = {};
  const byName = {};

  rows.forEach((r) => {
    const key =
      normaliseName(r.name) + "|" +
      normaliseName(r.classSection);

    counts[key] = (counts[key] || 0) + 1;

    const nameKey = normaliseName(r.name);
    byName[nameKey] = (byName[nameKey] || 0) + 1;
  });

  const ordered = rows.slice().sort(
    s.status === "waiting"
      ? (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0)
      : (a, b) => b.score - a.score || b.correct - a.correct ||
        accuracyPercent(b) - accuracyPercent(a) || b.answered - a.answered
  );

  const tbody = el("tbody");

  ordered.forEach((r, i) => {
    const sameBoth =
      counts[
        normaliseName(r.name) + "|" +
        normaliseName(r.classSection)
      ] > 1;

    const sameName =
      byName[normaliseName(r.name)] > 1;

    const canManagePlayers =
      !old && s.status !== "ended";

    tbody.appendChild(
      el("tr", {
        className: sameBoth || sameName ? "duplicate" : ""
      }, [
        el("td", { text: String(i + 1) }),

        el("td", {}, [
          r.name,

          sameBoth
            ? el("span", {
                className: "tag",
                text: "same name & class"
              })
            : sameName
              ? el("span", {
                  className: "tag",
                  text: "same name"
                })
              : null
        ]),

        el("td", { text: r.classSection }),

        el("td", { text: formatTime(r.joinedAt) }),

        el("td", {
          text: r.answered
            ? r.correct + " / " + r.answered
            : "–"
        }),

        el("td", { text: r.answered ? accuracyPercent(r) + "%" : "–" }),

        el("td", { text: String(r.score) }),

        el("td", {
          style: "white-space:nowrap"
        }, canManagePlayers ? [
          el("button", {
            type: "button",
            className: "small secondary",
            text: "Rename",
            onclick: () => renamePlayer(selectedId, r)
          }),

          " ",

          el("button", {
            type: "button",
            className: "small danger",
            text: "Remove",
            onclick: () => removePlayer(selectedId, r)
          })
        ] : [])
      ])
    );
  });

  if (s.status === "ended" && rows.length) {
    panel.appendChild(renderResultsOverview(ordered));
  }

  panel.appendChild(
    el("section", { className: "panel" }, [
      el("div", { className: "row" }, [
        el("h2", {
          style: "margin:0",
          text:
            (s.status === "ended" ? "Final student results" : "Lobby") +
            " (" + rows.length +
            " student" + (rows.length === 1 ? "" : "s") + ")"
        }),

        el("div", { className: "spacer" }),

        rows.length
          ? el("button", {
              type: "button",
              className: "small secondary",
              text: "Copy results",
              onclick: () => copyResults(s, ordered)
            })
          : null
      ]),

      rows.length
        ? el("div", {
            style: "overflow-x:auto;margin-top:10px"
          }, [
            el("table", {}, [
              el("thead", {}, [
                el("tr", {}, [
                  "#",
                  "Name",
                  "Class",
                  "Joined",
                  "Correct",
                  "Accuracy",
                  "Score",
                  ""
                ].map((h) => el("th", { text: h })))
              ]),

              tbody
            ])
          ])
        : el("p", {
            className: "muted",
            text:
              s.status === "waiting"
                ? "Waiting for students to scan the QR code…"
                : "No students joined."
          }),

      s.status !== "waiting" && rows.length
        ? el("p", {
            className: "small muted",
            text: "Scores are provisional: they are calculated on each student's device."
          })
        : null
    ])
  );

  updateTimer();
}

/* ---------- timer ---------- */

function updateTimer() {
  const box = $("sessionTimer");
  const s = selectedId ? sessions[selectedId] : null;

  if (!box || !s) return;

  const end = endsAt(s);

  box.textContent =
    s.status === "running" && end
      ? "⏱ " + formatClock(end - serverNow())
      : "";
}

// Countdown and automatic session ending.
setInterval(() => {
  updateTimer();

  Object.entries(sessions).forEach(([id, s]) => {
    const end = endsAt(s);

    if (
      s.status === "running" &&
      end &&
      serverNow() > end + 2000 &&
      !endRequested[id] &&
      !isOldFormat(s)
    ) {
      endRequested[id] = true;

      update(ref(db), buildEndSession(id, s.code))
        .catch(() => {
          endRequested[id] = false;
        });
    }
  });
}, 1000);

/* ---------- start / end ---------- */

async function startGame(id, s) {
  if (!sessions[id] || sessions[id].status !== "waiting") {
    return;
  }

  try {
    await update(ref(db), buildStartSession(id, s.code));

  } catch (error) {
    showMessage(
      $("dashMessage"),
      "Could not start the game: " + friendlyError(error)
    );
  }
}

function confirmEnd(id, s, cancel) {
  openModal(
    cancel ? "Cancel this session?" : "End the game now?",

    [
      el("p", {
        text: cancel
          ? "Students will not be able to join any more."
          : "Students will see the results screen. This cannot be undone."
      })
    ],

    cancel ? "Cancel session" : "End game",

    async () => {
      if (!sessions[id] || sessions[id].status === "ended") {
        showMessage(
          $("dashMessage"),
          "This session has already ended."
        );
        return false;
      }

      endRequested[id] = true;

      try {
        await update(ref(db), buildEndSession(id, s.code));
        return true;

      } catch (error) {
        endRequested[id] = false;

        showMessage(
          $("dashMessage"),
          "Could not end the session: " + friendlyError(error)
        );

        return false;
      }
    },

    true
  );
}

/* ---------- rename student ---------- */

function renamePlayer(id, row) {
  if (!sessions[id] || sessions[id].status === "ended") {
    return;
  }

  const nameInput = el("input", {
    type: "text",
    maxlength: String(NAME_MAX),
    value: row.name
  });

  const classInput = el("input", {
    type: "text",
    maxlength: String(CLASS_MAX),
    value: row.classSection
  });

  const err = el("div", {
    className: "message hidden"
  });

  openModal(
    "Fix student name",

    [
      el("label", { text: "Name" }),
      nameInput,

      el("label", { text: "Class / Section" }),
      classInput,

      err
    ],

    "Save",

    async () => {
      // Recheck in case the session ended while the modal was open.
      if (!sessions[id] || sessions[id].status === "ended") {
        showMessage(
          err,
          "This session has ended. Student information can no longer be changed."
        );
        return false;
      }

      const name = cleanText(nameInput.value, NAME_MAX);
      const classSection = cleanText(classInput.value, CLASS_MAX);

      if (!name || !classSection) {
        showMessage(err, "Name and class are required.");
        return false;
      }

      try {
        await update(
          ref(db, paths.player(id, row.uid)),
          { name, classSection }
        );

        return true;

      } catch (error) {
        showMessage(err, friendlyError(error));
        return false;
      }
    }
  );
}

/* ---------- remove student ---------- */

function removePlayer(id, row) {
  if (!sessions[id] || sessions[id].status === "ended") {
    return;
  }

  openModal(
    "Remove " + row.name + "?",

    [
      el("p", {
        text: "Use this for duplicate or accidental entries. The student can join again with the link while joining is open."
      })
    ],

    "Remove",

    async () => {
      // Recheck in case the session ended while the modal was open.
      if (!sessions[id] || sessions[id].status === "ended") {
        showMessage(
          $("dashMessage"),
          "This session has ended. Students can no longer be removed."
        );
        return false;
      }

      try {
        await remove(ref(db, paths.player(id, row.uid)));
        return true;

      } catch (error) {
        showMessage(
          $("dashMessage"),
          "Could not remove the student: " + friendlyError(error)
        );

        return false;
      }
    },

    true
  );
}

/* ---------- projector ---------- */

function showProjector(code, link) {
  const box = $("projector");
  box.textContent = "";

  const canvas = el("canvas");

  box.appendChild(
    el("button", {
      type: "button",
      className: "secondary close",
      text: "✕ Close",
      onclick: () => box.classList.add("hidden")
    })
  );

  box.appendChild(
    el("h1", {
      style: "margin:0",
      text: "Scan to join Grammar Drive"
    })
  );

  box.appendChild(canvas);

  box.appendChild(
    el("p", {
      className: "muted",
      style: "font-size:20px;margin:0",
      text: "Then type your name and class."
    })
  );

  box.appendChild(
    el("p", {
      className: "code-big",
      style: "margin:0",
      text: code
    })
  );

  drawQR(canvas, qrMatrix(link));
  box.classList.remove("hidden");
}

/* ---------- clipboard ---------- */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);

    showMessage(
      $("dashMessage"),
      "Copied.",
      "success"
    );

  } catch (error) {
    showMessage(
      $("dashMessage"),
      "Copy is blocked in this browser. Select the text and copy it manually."
    );
  }
}

function copyResults(s, ordered) {
  const lines = [
    [
      "Rank",
      "Name",
      "Class",
      "Correct",
      "Answered",
      "Accuracy",
      "Score (provisional)"
    ].join("\t")
  ];

  ordered.forEach((r, i) => {
    lines.push([
      i + 1,
      r.name,
      r.classSection,
      r.correct,
      r.answered,
      accuracyPercent(r) + "%",
      r.score
    ].join("\t"));
  });

  copyText(lines.join("\n"));
}

/* ---------- modal ---------- */

function openModal(title, bodyNodes, okLabel, onOk, danger) {
  const root = $("modalRoot");

  const close = () => {
    root.textContent = "";
  };

  const ok = el("button", {
    type: "button",
    className: danger ? "danger" : "",
    text: okLabel
  });

  ok.addEventListener("click", async () => {
    ok.disabled = true;

    try {
      const result = await onOk();

      if (result !== false) {
        close();
      }

    } catch (error) {
      showMessage(
        $("dashMessage"),
        "Action failed: " + friendlyError(error)
      );

    } finally {
      ok.disabled = false;
    }
  });

  root.textContent = "";

  root.appendChild(
    el("div", {
      className: "modal-backdrop"
    }, [
      el("div", {
        className: "modal"
      }, [
        el("h2", { text: title }),

        ...bodyNodes,

        el("div", {
          className: "row",
          style: "margin-top:18px;justify-content:flex-end"
        }, [
          el("button", {
            type: "button",
            className: "secondary",
            text: "Cancel",
            onclick: close
          }),

          ok
        ])
      ])
    ])
  );
}
