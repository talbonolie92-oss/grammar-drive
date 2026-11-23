// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/student.js — student joining (QR/link only: name + class, no code typing, no accounts)
// --------------------------------------------------

import {
  studentFirebase, authReady, signInAnonymously, ref, get, set, onValue
} from "./firebase.js";
import {
  CODE_PATTERN, NAME_MAX, CLASS_MAX, buildPlayer, paths, cleanText, $, showMessage, hideMessage,
  formatClock, serverClock, endsAt, friendlyError
} from "./common.js";

const { auth, db } = studentFirebase();
const serverNow = serverClock(db);
const code = (new URLSearchParams(window.location.search).get("code") || "").trim().toUpperCase();

let uid = null;
let sessionId = null;
let codeInfo = null;     // live copy of joinCodes/{code}: { sessionId, status, durationMinutes, allowLateJoin, startedAt? }
let me = null;           // this student's own record once joined
let stopMe = null;

const VIEWS = ["loadingView", "noticeView", "joinForm", "joinedView"];
function show(view) { VIEWS.forEach((v) => $(v).classList.toggle("hidden", v !== view)); }
function notice(title, text) { $("noticeTitle").textContent = title; $("noticeText").textContent = text; show("noticeView"); }

function canJoinNow() {
  if (!codeInfo) return false;
  if (codeInfo.status === "waiting") return true;
  const end = endsAt(codeInfo);
  return codeInfo.status === "running" && codeInfo.allowLateJoin === true && end !== null && serverNow() < end;
}

function showFormOrClosed() {
  if (canJoinNow()) {
    $("sessionInfo").textContent = codeInfo.status === "running" ? "The game has already started, but you can still join." : "Type your name and class, then press Join.";
    show("joinForm");
  } else if (codeInfo && codeInfo.status === "ended") {
    notice("This game has ended", "Ask your teacher if there is a new game to join.");
  } else {
    notice("The game has already started", "Joining is closed for this game. Please tell your teacher.");
  }
}

function renderJoined() {
  if (!me || !codeInfo) return;
  $("joinedName").textContent = me.name + " · " + me.classSection;
  const status = codeInfo.status;
  const end = endsAt(codeInfo);
  if (status === "waiting") {
    $("statusTitle").textContent = "You're in!";
    $("statusText").textContent = "Waiting for your teacher to start the game…";
    $("statusTitle").classList.add("pulse");
  } else if (status === "running") {
    $("statusTitle").classList.remove("pulse");
    const timeUp = end !== null && serverNow() >= end;
    $("statusTitle").textContent = timeUp ? "Time's up!" : "The game has started!";
    $("statusText").textContent = timeUp ? "Waiting for your teacher to close the game." : "The driving game will appear here in the next version.";
  } else {
    $("statusTitle").classList.remove("pulse");
    $("statusTitle").textContent = "Game over";
    $("statusText").textContent = "Thanks for playing! Your teacher has the results.";
  }
  show("joinedView");
}

setInterval(() => {
  const end = endsAt(codeInfo);
  $("studentTimer").textContent = me && codeInfo && codeInfo.status === "running" && end !== null ? "⏱ " + formatClock(end - serverNow()) : "";
  if (me) renderJoined();
}, 1000);

function watchMyRecord() {
  if (stopMe) stopMe();
  stopMe = onValue(ref(db, paths.player(sessionId, uid)), (snap) => {
    if (snap.exists()) {
      me = snap.val();      // also picks up a name fixed by the teacher
      renderJoined();
    } else if (me) {
      me = null;            // the teacher removed this entry
      stopMe(); stopMe = null;
      showMessage($("message"), "Your teacher removed this entry. If that was a mistake, join again with your correct name and class.", "warn");
      showFormOrClosed();
    }
  });
}

$("joinForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage($("message"));
  const name = cleanText($("studentName").value, NAME_MAX);
  const classSection = cleanText($("classSection").value, CLASS_MAX);
  if (!name || !classSection) { showMessage($("message"), "Please type your name and your class/section."); return; }
  $("joinButton").disabled = true;
  $("joinButton").textContent = "Joining…";
  try {
    await set(ref(db, paths.player(sessionId, uid)), buildPlayer(name, classSection));
    me = { name, classSection };
    watchMyRecord();
    renderJoined();
  } catch (error) {
    // Already joined from this device (e.g. a double tap)? Then just continue.
    const mine = await get(ref(db, paths.player(sessionId, uid))).catch(() => null);
    if (mine && mine.exists()) { me = mine.val(); watchMyRecord(); renderJoined(); }
    else if (!canJoinNow()) showFormOrClosed();
    else showMessage($("message"), "Could not join: " + friendlyError(error));
  } finally {
    $("joinButton").disabled = false;
    $("joinButton").textContent = "Join Game";
  }
});

async function start() {
  if (!CODE_PATTERN.test(code)) {
    notice("Scan your teacher's QR code", "This page needs the link from your teacher's QR code. Ask your teacher to show it again.");
    return;
  }
  try {
    await authReady(auth);                                  // restores this device's identity after a refresh
    if (!auth.currentUser) await signInAnonymously(auth);   // silent, no account needed
    uid = auth.currentUser.uid;
  } catch (error) {
    notice("Could not connect", friendlyError(error));
    return;
  }

  let first;
  try {
    first = await get(ref(db, paths.joinCode(code)));
  } catch (error) {
    notice("Could not open this game", friendlyError(error));
    return;
  }
  if (!first.exists()) { notice("Game not found", "This link is not valid any more. Ask your teacher for the QR code."); return; }
  codeInfo = first.val();
  if (typeof codeInfo.sessionId !== "string" || typeof codeInfo.durationMinutes !== "number") {
    notice("Old link", "This link was made with an earlier version. Ask your teacher to create a new session.");
    return;
  }
  sessionId = codeInfo.sessionId;

  // Already joined on this device? (refresh, phone locked, browser reopened)
  try {
    const mine = await get(ref(db, paths.player(sessionId, uid)));
    if (mine.exists()) { me = mine.val(); watchMyRecord(); }
  } catch (error) {
    notice("Could not open this game", friendlyError(error));
    return;
  }

  onValue(ref(db, paths.joinCode(code)), (snap) => {
    if (!snap.exists()) { notice("Game closed", "Your teacher closed this game."); return; }
    codeInfo = snap.val();
    if (me) renderJoined();
    else if (!$("joinForm").classList.contains("hidden") && !canJoinNow()) showFormOrClosed();
    else if ($("joinForm").classList.contains("hidden")) showFormOrClosed();
  });
}

start();
