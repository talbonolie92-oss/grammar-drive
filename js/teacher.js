// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/teacher.js — teacher dashboard (login, sessions, QR, live lobby, start/end, results)
// --------------------------------------------------

import {
  teacherFirebase, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  ref, get, update, remove, push, onValue, query, orderByChild, equalTo, limitToLast
} from "./firebase.js";
import {
  TOPICS, DURATIONS, NAME_MAX, CLASS_MAX, buildCreateSession, buildStartSession, buildEndSession, paths,
  makeCode, cleanText, normaliseName, $, el, showMessage, hideMessage, formatClock, formatTime,
  serverClock, endsAt, friendlyError, phase1RulesPublished, drawQR
} from "./common.js";
import { qrMatrix } from "./vendor/qrcode.js";

const { auth, db } = teacherFirebase();
const serverNow = serverClock(db);

let teacher = null;          // { uid, email }
let sessions = {};           // sessionId -> session data (from the live query)
let selectedId = null;
let stopSessionList = null;
let loggingIn = false;
const endRequested = {};     // sessionId -> true once we asked the server to end it

/* ---------- form setup ---------- */
TOPICS.forEach((topic) => {
  $("topicList").appendChild(el("label", { className: "check" }, [
    el("input", { type: "checkbox", name: "topics", value: topic, checked: true }), topic
  ]));
});
DURATIONS.forEach((minutes) => {
  $("duration").appendChild(el("option", { value: String(minutes), text: minutes + " minutes", selected: minutes === 20 }));
});

/* ---------- login ---------- */
function showLogin() {
  $("loginView").classList.remove("hidden");
  $("dashboardView").classList.add("hidden");
  if (stopSessionList) { stopSessionList(); stopSessionList = null; }
  teacher = null; sessions = {}; selectedId = null;
}

async function verifyTeacher(user) {
  let record = null;
  try {
    record = (await get(ref(db, "teachers/" + user.uid))).val();
  } catch (error) {
    await signOut(auth);
    showLogin();
    showMessage($("loginMessage"), "Could not check teacher access: " + friendlyError(error));
    return false;
  }
  if (!record || record.role !== "teacher" || record.active !== true) {
    await signOut(auth);
    showLogin();
    showMessage($("loginMessage"), "This account is not an active teacher account.");
    return false;
  }
  teacher = { uid: user.uid, email: user.email || "" };
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
    const result = await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
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
  if (!user) { showLogin(); return; }
  if (!loggingIn && !teacher) verifyTeacher(user);
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
  $("teacherInfo").textContent = "Logged in as " + teacher.email + " · Teacher ID: " + teacher.uid;

  if (!(await phase1RulesPublished(db))) {
    showMessage($("rulesWarning"), "The new database rules are not published yet. Publish database.rules.json in the Firebase console (see README), then reload this page.", "warn");
  } else {
    hideMessage($("rulesWarning"));
  }

  const mine = query(ref(db, "sessions"), orderByChild("teacherUid"), equalTo(teacher.uid), limitToLast(30));
  stopSessionList = onValue(mine, (snap) => {
    sessions = snap.val() || {};
    renderSessionList();
    renderSession();
  }, (error) => {
    showMessage($("dashMessage"), "Could not load your sessions: " + friendlyError(error));
  });
}

function sortedSessions() {
  return Object.entries(sessions).sort((a, b) => (b[1].createdAt || 0) - (a[1].createdAt || 0));
}

function isOldFormat(session) {
  return !session || typeof session.code !== "string" || typeof session.durationMinutes !== "number";
}

function renderSessionList() {
  const box = $("sessionList");
  box.textContent = "";
  const list = sortedSessions();
  if (!list.length) { box.appendChild(el("p", { className: "muted", text: "No sessions yet." })); return; }
  list.forEach(([id, s]) => {
    const old = isOldFormat(s);
    const players = Object.keys(s.players || {}).length;
    box.appendChild(el("button", { type: "button", className: id === selectedId ? "selected" : "", onclick: () => selectSession(id) }, [
      el("span", { className: "badge " + (old ? "old" : s.status), text: old ? "old" : s.status }),
      " ", el("strong", { text: old ? (s.sessionCode || "—") : s.code }),
      el("div", { className: "small muted", text: (old ? "Created with an earlier version" : "Grade " + s.grade + " · " + players + " student" + (players === 1 ? "" : "s")) + " · " + (s.createdAt ? new Date(s.createdAt).toLocaleString() : "") })
    ]));
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
  const topics = Array.from(document.querySelectorAll('input[name="topics"]:checked')).map((c) => c.value);
  if (!topics.length) { showMessage($("dashMessage"), "Please select at least one grammar topic."); return; }
  const options = { grade: $("grade").value, topics, durationMinutes: Number($("duration").value), allowLateJoin: $("allowLateJoin").checked };
  $("createButton").disabled = true;
  $("createButton").textContent = "Creating…";
  let lastError = null;
  try {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      if ((await get(ref(db, paths.joinCode(code)))).exists()) continue; // code already used
      const sessionId = push(ref(db, "sessions")).key;                    // new unique id (no write yet)
      try {
        await update(ref(db), buildCreateSession(sessionId, code, teacher.uid, options)); // ONE atomic write
        selectSession(sessionId);
        showMessage($("dashMessage"), "Session created. Show the QR code to your class.", "success");
        return;
      } catch (error) {
        lastError = error; // most likely another teacher took the same code a moment ago: try a new one
      }
    }
    showMessage($("dashMessage"), "Could not create the session: " + friendlyError(lastError || new Error("no free code found")));
  } catch (error) {
    showMessage($("dashMessage"), "Could not create the session: " + friendlyError(error));
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

function renderSession() {
  const panel = $("sessionPanel");
  const s = selectedId ? sessions[selectedId] : null;
  panel.textContent = "";
  if (!s) {
    panel.appendChild(el("section", { className: "panel" }, [el("p", { className: "muted", text: "Create a session, or choose one from \"My sessions\"." })]));
    return;
  }
  const old = isOldFormat(s);
  const rows = playerRows(s);

  // header + controls
  const controls = el("div", { className: "row" });
  if (!old && s.status === "waiting") {
    controls.appendChild(el("button", { type: "button", className: "good", text: "▶ Start game", onclick: () => startGame(selectedId, s) }));
    controls.appendChild(el("button", { type: "button", className: "secondary", text: "Cancel session", onclick: () => confirmEnd(selectedId, s, true) }));
  }
  if (!old && s.status === "running") {
    controls.appendChild(el("button", { type: "button", className: "danger", text: "■ End game", onclick: () => confirmEnd(selectedId, s, false) }));
  }
  panel.appendChild(el("section", { className: "panel" }, [
    el("div", { className: "row" }, [
      el("span", { className: "badge " + (old ? "old" : s.status), text: old ? "old format" : s.status }),
      el("div", { className: "spacer" }),
      el("div", { className: "timer", id: "sessionTimer" })
    ]),
    el("h2", { style: "margin:10px 0 4px", text: old ? "Session " + (s.sessionCode || "") : "Session " + s.code }),
    el("p", { className: "muted", text: old ? "This session was created with an earlier version of the dashboard. It is shown read-only." :
      "Grade " + s.grade + " · " + Object.values(s.topics || {}).join(", ") + " · " + s.durationMinutes + " minutes · late join " + (s.allowLateJoin ? "allowed" : "off") }),
    controls,
    el("details", { className: "small muted", style: "margin-top:12px" }, [
      el("summary", { text: "Technical details" }),
      el("div", { text: "Session ID: " + selectedId }),
      el("div", { text: "Created: " + formatTime(s.createdAt) + (s.startedAt ? " · Started: " + formatTime(s.startedAt) : "") + (s.endedAt ? " · Ended: " + formatTime(s.endedAt) : "") })
    ])
  ]));

  // join QR (not for ended/old sessions)
  if (!old && s.status !== "ended" && (s.status === "waiting" || s.allowLateJoin)) {
    const link = joinLink(s.code);
    const canvas = el("canvas");
    panel.appendChild(el("section", { className: "panel" }, [
      el("h2", { text: "Students join here" }),
      el("div", { className: "row", style: "align-items:flex-start" }, [
        el("div", { className: "qr-box" }, [canvas]),
        el("div", { style: "flex:1;min-width:220px" }, [
          el("p", { text: "Students scan the QR code, type their name and class, and join." }),
          el("div", { className: "link-box", text: link }),
          el("div", { className: "row" }, [
            el("button", { type: "button", text: "Show QR full screen", onclick: () => showProjector(s.code, link) }),
            el("button", { type: "button", className: "secondary", text: "Copy link", onclick: () => copyText(link) })
          ])
        ])
      ])
    ]));
    drawQR(canvas, qrMatrix(link));
  }

  // lobby / results table
  const counts = {};
  rows.forEach((r) => { const k = normaliseName(r.name) + "|" + normaliseName(r.classSection); counts[k] = (counts[k] || 0) + 1; });
  const byName = {};
  rows.forEach((r) => { const k = normaliseName(r.name); byName[k] = (byName[k] || 0) + 1; });
  const ordered = rows.slice().sort(s.status === "waiting" ? (a, b) => (a.joinedAt || 0) - (b.joinedAt || 0) : (a, b) => b.score - a.score);
  const tbody = el("tbody");
  ordered.forEach((r, i) => {
    const sameBoth = counts[normaliseName(r.name) + "|" + normaliseName(r.classSection)] > 1;
    const sameName = byName[normaliseName(r.name)] > 1;
    tbody.appendChild(el("tr", { className: sameBoth || sameName ? "duplicate" : "" }, [
      el("td", { text: String(i + 1) }),
      el("td", {}, [r.name, sameBoth ? el("span", { className: "tag", text: "same name & class" }) : sameName ? el("span", { className: "tag", text: "same name" }) : null]),
      el("td", { text: r.classSection }),
      el("td", { text: formatTime(r.joinedAt) }),
      el("td", { text: r.answered ? r.correct + " / " + r.answered : "–" }),
      el("td", { text: String(r.score) }),
      el("td", { style: "white-space:nowrap" }, old ? [] : [
        el("button", { type: "button", className: "small secondary", text: "Rename", onclick: () => renamePlayer(selectedId, r) }), " ",
        el("button", { type: "button", className: "small danger", text: "Remove", onclick: () => removePlayer(selectedId, r) })
      ])
    ]));
  });
  panel.appendChild(el("section", { className: "panel" }, [
    el("div", { className: "row" }, [
      el("h2", { style: "margin:0", text: (s.status === "ended" ? "Results" : "Lobby") + " (" + rows.length + " student" + (rows.length === 1 ? "" : "s") + ")" }),
      el("div", { className: "spacer" }),
      rows.length ? el("button", { type: "button", className: "small secondary", text: "Copy results", onclick: () => copyResults(s, ordered) }) : null
    ]),
    rows.length ? el("div", { style: "overflow-x:auto;margin-top:10px" }, [el("table", {}, [
      el("thead", {}, [el("tr", {}, ["#", "Name", "Class", "Joined", "Correct", "Score", ""].map((h) => el("th", { text: h })))]),
      tbody
    ])]) : el("p", { className: "muted", text: s.status === "waiting" ? "Waiting for students to scan the QR code…" : "No students joined." }),
    s.status !== "waiting" && rows.length ? el("p", { className: "small muted", text: "Scores are provisional: they are calculated on each student's device." }) : null
  ]));
  updateTimer();
}

function updateTimer() {
  const box = $("sessionTimer");
  const s = selectedId ? sessions[selectedId] : null;
  if (!box || !s) return;
  const end = endsAt(s);
  box.textContent = s.status === "running" && end ? "⏱ " + formatClock(end - serverNow()) : "";
}

// Tick: countdown, and end a running game automatically once its time is up.
setInterval(() => {
  updateTimer();
  Object.entries(sessions).forEach(([id, s]) => {
    const end = endsAt(s);
    if (s.status === "running" && end && serverNow() > end + 2000 && !endRequested[id] && !isOldFormat(s)) {
      endRequested[id] = true;
      update(ref(db), buildEndSession(id, s.code)).catch(() => { endRequested[id] = false; });
    }
  });
}, 1000);

async function startGame(id, s) {
  try {
    await update(ref(db), buildStartSession(id, s.code));
  } catch (error) {
    showMessage($("dashMessage"), "Could not start the game: " + friendlyError(error));
  }
}

function confirmEnd(id, s, cancel) {
  openModal(cancel ? "Cancel this session?" : "End the game now?",
    [el("p", { text: cancel ? "Students will not be able to join any more." : "Students will see the results screen. This cannot be undone." })],
    cancel ? "Cancel session" : "End game",
    async () => {
      endRequested[id] = true;
      try { await update(ref(db), buildEndSession(id, s.code)); }
      catch (error) { endRequested[id] = false; showMessage($("dashMessage"), "Could not end the session: " + friendlyError(error)); }
    }, true);
}

function renamePlayer(id, row) {
  const nameInput = el("input", { type: "text", maxlength: String(NAME_MAX), value: row.name });
  const classInput = el("input", { type: "text", maxlength: String(CLASS_MAX), value: row.classSection });
  const err = el("div", { className: "message hidden" });
  openModal("Fix student name", [el("label", { text: "Name" }), nameInput, el("label", { text: "Class / Section" }), classInput, err], "Save", async () => {
    const name = cleanText(nameInput.value, NAME_MAX), classSection = cleanText(classInput.value, CLASS_MAX);
    if (!name || !classSection) { showMessage(err, "Name and class are required."); return false; }
    try { await update(ref(db, paths.player(id, row.uid)), { name, classSection }); }
    catch (error) { showMessage(err, friendlyError(error)); return false; }
    return true;
  });
}

function removePlayer(id, row) {
  openModal("Remove " + row.name + "?", [el("p", { text: "Use this for duplicate or accidental entries. The student can join again with the link while joining is open." })], "Remove", async () => {
    try { await remove(ref(db, paths.player(id, row.uid))); }
    catch (error) { showMessage($("dashMessage"), "Could not remove the student: " + friendlyError(error)); }
  }, true);
}

/* ---------- projector, clipboard, modal ---------- */
function showProjector(code, link) {
  const box = $("projector");
  box.textContent = "";
  const canvas = el("canvas");
  box.appendChild(el("button", { type: "button", className: "secondary close", text: "✕ Close", onclick: () => box.classList.add("hidden") }));
  box.appendChild(el("h1", { style: "margin:0", text: "Scan to join Grammar Drive" }));
  box.appendChild(canvas);
  box.appendChild(el("p", { className: "muted", style: "font-size:20px;margin:0", text: "Then type your name and class." }));
  box.appendChild(el("p", { className: "code-big", style: "margin:0", text: code }));
  drawQR(canvas, qrMatrix(link));
  box.classList.remove("hidden");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showMessage($("dashMessage"), "Copied.", "success");
  } catch (error) {
    showMessage($("dashMessage"), "Copy is blocked in this browser. Select the text and copy it manually.");
  }
}

function copyResults(s, ordered) {
  const lines = [["Rank", "Name", "Class", "Correct", "Answered", "Score (provisional)"].join("\t")];
  ordered.forEach((r, i) => lines.push([i + 1, r.name, r.classSection, r.correct, r.answered, r.score].join("\t")));
  copyText(lines.join("\n"));
}

function openModal(title, bodyNodes, okLabel, onOk, danger) {
  const root = $("modalRoot");
  const close = () => { root.textContent = ""; };
  const ok = el("button", { type: "button", className: danger ? "danger" : "", text: okLabel });
  ok.addEventListener("click", async () => {
    ok.disabled = true;
    const result = await onOk();
    ok.disabled = false;
    if (result !== false) close();
  });
  root.textContent = "";
  root.appendChild(el("div", { className: "modal-backdrop" }, [el("div", { className: "modal" }, [
    el("h2", { text: title }), ...bodyNodes,
    el("div", { className: "row", style: "margin-top:18px;justify-content:flex-end" }, [
      el("button", { type: "button", className: "secondary", text: "Cancel", onclick: close }), ok
    ])
  ])]));
}
