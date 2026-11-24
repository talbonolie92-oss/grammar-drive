// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/playtest.js — Phase 3 real multiplayer test track
// --------------------------------------------------

import {
  studentFirebase,
  authReady,
  signInAnonymously,
  ref,
  get,
  update,
  onValue
} from "./firebase.js";

import {
  CODE_PATTERN,
  paths,
  $,
  serverClock,
  endsAt,
  formatClock,
  friendlyError,
  paths,
  buildProgress
} from "./common.js";

import { createLiveCars, CAR_COLORS, colorFor } from "./multiplayer.js";
import { WORLD, drawMap, isOnRoad, collidesWithWorld } from "./world.js";
import { createVehicle, updateVehicle, refuelVehicle, repairVehicle } from "./vehicle.js";
import { nearbyService, nearbyChallenge } from "./world.js";
import { nextQuestion } from "./questions.js";

const { auth, db } = studentFirebase();
const serverNow = serverClock(db);

const canvas = $("track");
const ctx = canvas.getContext("2d");
const light = $("light");
const connText = $("connText");
const onlineEl = $("online");
const surfaceEl = $("surface");
const speedEl = $("speed");
const fuelEl = $("fuel");
const conditionEl = $("condition");
const serviceHintEl = $("serviceHint");
const serviceButton = $("serviceButton");
const challengeButton = $("challengeButton");
const challengeHintEl = $("challengeHint");
const challengePanel = $("challengePanel");
const challengeTopicEl = $("challengeTopic");
const challengeQuestionEl = $("challengeQuestion");
const challengeChoicesEl = $("challengeChoices");
const challengeFeedbackEl = $("challengeFeedback");
const challengeExplanationEl = $("challengeExplanation");
const challengeScoreEl = $("challengeScore");
const challengeNextButton = $("challengeNext");
const carSelect = $("carSelect");
const carSelectWrap = $("carSelectWrap");
const timerEl = $("timer");
const rosterEl = $("roster");
const debugEl = $("debug");
const overlay = $("overlay");
const overlayTitle = $("overlayTitle");
const overlayText = $("overlayText");
const overlayLink = $("overlayLink");

const keys = { left: false, right: false, gas: false, brake: false };
const car = createVehicle(1800, 1300, 0);
const CAR_MODELS = {
  compact: { label: "Compact", color: "#3b82f6", width: 34, height: 19 },
  sport: { label: "Sport", color: "#ef4444", width: 40, height: 17 },
  suv: { label: "SUV", color: "#eab308", width: 37, height: 23 }
};
car.model = "compact";
const others = new Map();

let uid = null;
let code = "";
let sessionId = null;
let me = null;
let codeInfo = null;
let live = null;
let running = false;
let finished = false;
let rafId = 0;
let statusTimer = 0;
let lastFrame = 0;
let lastSave = 0;
let stopCode = null;
let stopMe = null;
let canvasWidth = 0;
let canvasHeight = 0;
let pixelRatio = 1;
let activeQuestion = null;
let challengeAnswered = false;
let answerBusy = false;

function showOverlay(title, message, showBack = false) {
  overlayTitle.textContent = title;
  overlayText.textContent = message;
  overlay.style.display = "grid";
  overlayLink.classList.toggle("hidden", !showBack);
  overlayLink.href = "./student.html?code=" + encodeURIComponent(code);
}

function hideOverlay() {
  overlay.style.display = "none";
}

function setLight(state, detail = "") {
  light.className = "light " + (
    state === "online" ? "online" :
    state === "offline" || state === "refused" || state === "cleanup-registration-failed" ? "offline" :
    "connecting"
  );

  const labels = {
    online: "Connected",
    offline: "Offline",
    reconnecting: "Reconnecting…",
    "registering-cleanup": "Securing connection…",
    "cleanup-registration-failed": "Connection setup failed",
    refused: "Sync paused",
    connecting: "Connecting…"
  };

  connText.textContent = detail
    ? (labels[state] || state) + " · " + detail
    : (labels[state] || state);
}

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = Math.round(canvasWidth * pixelRatio);
  canvas.height = Math.round(canvasHeight * pixelRatio);
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function worldToScreen(x, y) {
  // Keep a close driving view instead of shrinking the entire map to fit.
  const scale = Math.max(0.45, Math.min(1, canvasWidth / 1000, canvasHeight / 700));
  const viewW = canvasWidth / scale;
  const viewH = canvasHeight / scale;
  const camX = Math.max(0, Math.min(WORLD.width - viewW, car.x - viewW / 2));
  const camY = Math.max(0, Math.min(WORLD.height - viewH, car.y - viewH / 2));
  return {
    x: (x - camX) * scale,
    y: (y - camY) * scale,
    scale
  };
}

function drawCar(x, y, angle, colorIndex, name, isMine = false, modelKey = "compact") {
  const p = worldToScreen(x, y);
  const scale = p.scale;
  const model = CAR_MODELS[modelKey] || CAR_MODELS.compact;
  const w = Math.max(24, model.width * scale);
  const h = Math.max(14, model.height * scale);
  const line = Math.max(1, 1.6 * scale);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Ground shadow and four visible tires.
  ctx.fillStyle = "rgba(0,0,0,.32)";
  ctx.beginPath();
  ctx.ellipse(1, 3 * scale, w * .55, h * .72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  const tireW = Math.max(4, w * (modelKey === "suv" ? .17 : .14));
  const tireH = Math.max(3, h * .27);
  [-1, 1].forEach((side) => {
    ctx.fillRect(-w * .29, side * (h * .39) - tireH / 2, tireW, tireH);
    ctx.fillRect(w * .25, side * (h * .39) - tireH / 2, tireW, tireH);
  });

  // Body silhouette: low wedge for Sport, tall squared body for SUV,
  // rounded hatchback for Compact.
  ctx.fillStyle = model.color;
  ctx.strokeStyle = isMine ? "#ffffff" : "#0f172a";
  ctx.lineWidth = Math.max(1.2, 1.8 * scale);
  ctx.beginPath();
  if (modelKey === "sport") {
    ctx.moveTo(-w * .5, -h * .25);
    ctx.lineTo(-w * .34, -h * .48);
    ctx.lineTo(w * .23, -h * .48);
    ctx.lineTo(w * .5, -h * .28);
    ctx.lineTo(w * .5, h * .28);
    ctx.lineTo(w * .23, h * .48);
    ctx.lineTo(-w * .34, h * .48);
    ctx.closePath();
  } else if (modelKey === "suv") {
    ctx.roundRect(-w * .5, -h * .5, w, h, Math.max(2, 3 * scale));
  } else {
    ctx.roundRect(-w * .5, -h * .46, w, h * .92, Math.max(3, 6 * scale));
  }
  ctx.fill();
  ctx.stroke();

  // Roof/cabin proportions differ clearly by vehicle class.
  if (modelKey === "sport") {
    ctx.fillStyle = "#172554";
    ctx.beginPath();
    ctx.moveTo(-w * .18, -h * .34);
    ctx.lineTo(-w * .04, -h * .43);
    ctx.lineTo(w * .19, -h * .34);
    ctx.lineTo(w * .27, h * .34);
    ctx.lineTo(-w * .16, h * .34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(191,219,254,.85)";
    ctx.fillRect(-w * .08, -h * .29, w * .25, h * .58);
    // Rear spoiler.
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-w * .47, -h * .53, w * .18, h * 1.06);
  } else if (modelKey === "suv") {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-w * .19, -h * .38, w * .48, h * .76);
    ctx.fillStyle = "rgba(191,219,254,.9)";
    ctx.fillRect(-w * .13, -h * .31, w * .17, h * .62);
    ctx.fillRect(w * .08, -h * .31, w * .15, h * .62);
    ctx.strokeStyle = "rgba(15,23,42,.8)";
    ctx.lineWidth = line;
    ctx.strokeRect(-w * .2, -h * .4, w * .5, h * .8);
    // Roof rails.
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(-w * .15, -h * .47);
    ctx.lineTo(w * .27, -h * .47);
    ctx.moveTo(-w * .15, h * .47);
    ctx.lineTo(w * .27, h * .47);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-w * .16, -h * .34, w * .42, h * .68);
    ctx.fillStyle = "rgba(191,219,254,.9)";
    ctx.fillRect(-w * .1, -h * .27, w * .3, h * .54);
    ctx.strokeStyle = "rgba(15,23,42,.7)";
    ctx.lineWidth = line;
    ctx.beginPath();
    ctx.moveTo(w * .06, -h * .28);
    ctx.lineTo(w * .06, h * .28);
    ctx.stroke();
  }

  // Front lights, rear lights and bumpers make orientation readable.
  ctx.fillStyle = "#fef3c7";
  ctx.fillRect(w * .42, -h * .32, w * .07, h * .2);
  ctx.fillRect(w * .42, h * .12, w * .07, h * .2);
  ctx.fillStyle = "#f87171";
  ctx.fillRect(-w * .49, -h * .3, w * .06, h * .2);
  ctx.fillRect(-w * .49, h * .1, w * .06, h * .2);
  ctx.fillStyle = "rgba(15,23,42,.75)";
  ctx.fillRect(w * .43, -h * .42, w * .07, h * .84);
  ctx.restore();

  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(15,23,42,.9)";
  ctx.strokeText(name || "Driver", p.x, p.y - h / 2 - 5);
  ctx.fillStyle = isMine ? "#ffffff" : "#f8fafc";
  ctx.fillText(name || "Driver", p.x, p.y - h / 2 - 5);
}
function drawWorld() {
  drawMap(ctx, worldToScreen, canvasWidth, canvasHeight);

  for (const [id, item] of others) {
    const pose = live ? live.pose(id) : item;
    if (pose) drawCar(pose.x, pose.y, pose.a, pose.c, pose.n, false, pose.m || "compact");
  }

  drawCar(car.x, car.y, car.a, colorFor(uid), me ? me.name : "You", true, car.model);
}

function renderRoster() {
  const rows = [];
  if (me && live && live.connected && running) rows.push({ uid, name: me.name, color: colorFor(uid), mine: true });
  for (const [id, value] of others) {
    rows.push({ uid: id, name: value.n || "Driver", color: value.c, mine: false });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  rosterEl.innerHTML = "";
  rosterEl.classList.toggle("hidden", rows.length === 0);
  rows.slice(0, 30).forEach((entry) => {
    const row = document.createElement("div");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = CAR_COLORS[entry.color] || "#94a3b8";
    row.append(dot, document.createTextNode(entry.name + (entry.mine ? " (You)" : "")));
    rosterEl.appendChild(row);
  });
  onlineEl.textContent = "Online: " + rows.length;
}

function updateCar(dt) {
  updateVehicle(car, keys, dt, { isOnRoad, collidesWithWorld });
  surfaceEl.textContent = car.onRoad ? "ROAD" : "OFF-ROAD";
  surfaceEl.style.borderColor = car.onRoad ? "#22c55e" : "#f59e0b";
  speedEl.textContent = Math.round(Math.abs(car.s) * 0.32) + " km/h";
  fuelEl.textContent = "Fuel: " + Math.round(car.fuel) + "%";
  conditionEl.textContent = "Condition: " + Math.round(car.condition) + "%";
  fuelEl.style.borderColor = car.fuel < 20 ? "#ef4444" : "#334155";
  conditionEl.style.borderColor = car.condition < 35 ? "#ef4444" : "#334155";

  const service = nearbyService(car.x, car.y);
  const challenge = nearbyChallenge(car.x, car.y);
  carSelectWrap.classList.toggle("hidden", !(service && service.type === "repair"));
  if (carSelect.value !== car.model) carSelect.value = car.model;
  serviceButton.classList.toggle("hidden", !service);
  serviceHintEl.classList.toggle("hidden", !service);
  if (service) {
    const action = service.type === "fuel" ? "Refuel" : "Repair";
    serviceHintEl.textContent = service.name + " · Press E or tap " + action;
    serviceButton.textContent = action;
    serviceButton.dataset.service = service.type;
  }
  challengeButton.classList.toggle("hidden", !challenge || challengePanel.classList.contains("hidden") === false);
  challengeHintEl.classList.toggle("hidden", !challenge || challengePanel.classList.contains("hidden") === false);
}

function useNearbyService() {
  if (!running) return;
  const service = nearbyService(car.x, car.y);
  if (!service) return;
  if (service.type === "fuel") refuelVehicle(car);
  if (service.type === "repair") repairVehicle(car);
  saveVehicleProfile();
  updateCar(0.001);
}

function openChallenge() {
  if (!running || !nearbyChallenge(car.x, car.y) || challengePanel.classList.contains("hidden") === false) return;
  if (!Array.isArray(codeInfo.topics) || !codeInfo.topics.length || !codeInfo.grade) {
    showOverlay("Challenge unavailable", "This session was created before the Grammar Challenge update. Ask your teacher to create a new session.", true);
    return;
  }
  challengePanel.classList.remove("hidden");
  clearControls();
  loadNextQuestion();
}

function closeChallenge() {
  challengePanel.classList.add("hidden");
  activeQuestion = null;
  challengeAnswered = false;
  answerBusy = false;
}

function loadNextQuestion() {
  activeQuestion = nextQuestion({
    grade: codeInfo.grade,
    topics: codeInfo.topics,
    uid,
    sessionId
  });
  challengeAnswered = false;
  answerBusy = false;
  challengeFeedbackEl.className = "message hidden";
  challengeFeedbackEl.textContent = "";
  challengeExplanationEl.textContent = "";
  challengeNextButton.classList.add("hidden");
  challengeChoicesEl.textContent = "";
  if (!activeQuestion) {
    challengeQuestionEl.textContent = "No questions are available for this session's topics.";
    return;
  }
  challengeTopicEl.textContent = "Grade " + codeInfo.grade + " · " + activeQuestion.topic;
  challengeQuestionEl.textContent = activeQuestion.q;
  activeQuestion.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary";
    button.textContent = String.fromCharCode(65 + index) + ". " + option.text;
    button.addEventListener("click", () => void submitChallengeAnswer(index, button));
    challengeChoicesEl.appendChild(button);
  });
  const progress = me && me.progress ? me.progress : { score: 0, correct: 0, answered: 0 };
  challengeScoreEl.textContent = "Score: " + (progress.score || 0) + " · Correct: " + (progress.correct || 0) + "/" + (progress.answered || 0);
}

async function submitChallengeAnswer(index, selectedButton) {
  if (!activeQuestion || challengeAnswered || answerBusy || !running) return;
  answerBusy = true;
  challengeChoicesEl.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  const selected = activeQuestion.options[index];
  const isCorrect = !!(selected && selected.correct);
  const progress = me && me.progress ? me.progress : { score: 0, correct: 0, answered: 0, updatedAt: 0 };
  const now = serverNow();
  const waitMs = Math.max(0, 2050 - (now - (Number(progress.updatedAt) || 0)));
  if (waitMs > 0) {
    challengeFeedbackEl.className = "message warn";
    challengeFeedbackEl.textContent = "Please wait a moment before answering the next question.";
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  const nextScore = (Number(progress.score) || 0) + (isCorrect ? 10 : 0);
  const nextCorrect = (Number(progress.correct) || 0) + (isCorrect ? 1 : 0);
  const nextAnswered = (Number(progress.answered) || 0) + 1;
  try {
    await update(ref(db, paths.progress(sessionId, uid)), buildProgress(nextScore, nextCorrect, nextAnswered));
    challengeAnswered = true;
    challengeFeedbackEl.className = "message " + (isCorrect ? "success" : "info");
    challengeFeedbackEl.textContent = isCorrect ? "Correct! +10 points." : "Not quite. No points lost—keep learning!";
    challengeExplanationEl.textContent = activeQuestion.why;
    challengeNextButton.classList.remove("hidden");
    challengeScoreEl.textContent = "Score: " + nextScore + " · Correct: " + nextCorrect + "/" + nextAnswered;
    selectedButton.classList.remove("secondary");
    selectedButton.classList.add(isCorrect ? "good" : "danger");
  } catch (error) {
    challengeFeedbackEl.className = "message error";
    challengeFeedbackEl.textContent = "Could not save your answer: " + friendlyError(error) + " Please try again.";
    challengeChoicesEl.querySelectorAll("button").forEach((button) => { button.disabled = false; });
  } finally {
    answerBusy = false;
  }
}

function profileStorageKey() { return "gd_vehicle_profile_" + uid; }

function saveVehicleProfile() {
  if (!uid) return;
  try {
    localStorage.setItem(profileStorageKey(), JSON.stringify({
      fuel: car.fuel, condition: car.condition, model: car.model
    }));
  } catch (error) {}
}

function loadVehicleProfile() {
  if (!uid) return;
  try {
    const saved = JSON.parse(localStorage.getItem(profileStorageKey()) || "null");
    if (!saved || typeof saved !== "object") return;
    if (Number.isFinite(saved.fuel)) car.fuel = Math.max(0, Math.min(100, saved.fuel));
    if (Number.isFinite(saved.condition)) car.condition = Math.max(0, Math.min(100, saved.condition));
    if (CAR_MODELS[saved.model]) car.model = saved.model;
  } catch (error) {}
}

function frame(timestamp) {
  if (finished) return;
  const dt = Math.min(0.05, lastFrame ? (timestamp - lastFrame) / 1000 : 0);
  lastFrame = timestamp;

  if (running) {
    updateCar(dt);
    if (live) live.publish({ x: car.x, y: car.y, a: car.a, s: car.s, m: car.model });
    if (timestamp - lastSave > 1000) {
      lastSave = timestamp;
      try {
        localStorage.setItem("gd_track_" + code + "_" + uid, JSON.stringify({
          x: car.x, y: car.y, a: car.a
        }));
        saveVehicleProfile();
      } catch (error) {}
    }
  }

  drawWorld();
  rafId = requestAnimationFrame(frame);
}

function clearControls() {
  Object.keys(keys).forEach((key) => { keys[key] = false; });
  document.querySelectorAll(".pad button").forEach((button) => button.classList.remove("on"));
}

function cleanupListeners() {
  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = 0;
  }
  if (stopCode) {
    stopCode();
    stopCode = null;
  }
  if (stopMe) {
    stopMe();
    stopMe = null;
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  clearControls();
}

async function finish(title, message, showBack = true) {
  if (finished) return;
  finished = true;
  running = false;
  cleanupListeners();
  if (live) {
    await live.stop(true);
    live = null;
  }
  showOverlay(title, message, showBack);
}

function applyStatus() {
  if (!codeInfo || finished) return;

  const status = codeInfo.status;
  const end = endsAt(codeInfo);
  const timeLeft = end === null ? null : end - serverNow();

  if (status === "ended") {
    void finish("Game Over", "Your teacher has ended the session. Thanks for playing!");
    return;
  }

  if (status === "running" && timeLeft !== null && timeLeft <= 0) {
    void finish("Time's Up!", "The session time has finished. Thanks for playing!");
    return;
  }

  if (status === "running") {
    running = true;
    if (live) live.setEnabled(true);
    renderRoster();
    hideOverlay();
    timerEl.textContent = timeLeft === null ? "⏱ Running" : "⏱ " + formatClock(timeLeft);
  } else {
    running = false;
    if (live) live.setEnabled(false);
    renderRoster();
    timerEl.textContent = "⏱ Waiting";
    showOverlay("Waiting for your teacher", "Your car is ready. The track opens when the teacher starts the session.", false);
  }
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
  if (key === "arrowleft" || key === "a") keys.left = true;
  if (key === "arrowright" || key === "d") keys.right = true;
  if (key === "arrowup" || key === "w") keys.gas = true;
  if (key === "arrowdown" || key === "s" || key === " ") keys.brake = true;
  if (key === "e") {
    if (nearbyService(car.x, car.y)) useNearbyService();
    else openChallenge();
  }
}

function onKeyUp(event) {
  const key = event.key.toLowerCase();
  if (key === "arrowleft" || key === "a") keys.left = false;
  if (key === "arrowright" || key === "d") keys.right = false;
  if (key === "arrowup" || key === "w") keys.gas = false;
  if (key === "arrowdown" || key === "s" || key === " ") keys.brake = false;
}

function bindTouch(buttonId, keyName) {
  const button = $(buttonId);
  const down = (event) => {
    event.preventDefault();
    keys[keyName] = true;
    button.classList.add("on");
    if (button.setPointerCapture && event.pointerId !== undefined) {
      try { button.setPointerCapture(event.pointerId); } catch (error) {}
    }
  };
  const up = (event) => {
    event.preventDefault();
    keys[keyName] = false;
    button.classList.remove("on");
  };
  button.addEventListener("pointerdown", down);
  ["pointerup", "pointercancel", "lostpointercapture", "pointerleave"].forEach((name) => {
    button.addEventListener(name, up);
  });
}

async function start() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  bindTouch("btnLeft", "left");
  bindTouch("btnRight", "right");
  bindTouch("btnGas", "gas");
  bindTouch("btnBrake", "brake");
  serviceButton.addEventListener("click", useNearbyService);
  challengeButton.addEventListener("click", openChallenge);
  $("challengeClose").addEventListener("click", closeChallenge);
  challengeNextButton.addEventListener("click", loadNextQuestion);
  carSelect.addEventListener("change", () => {
    if (!CAR_MODELS[carSelect.value]) return;
    car.model = carSelect.value;
    saveVehicleProfile();
    if (live) live.publish({ x: car.x, y: car.y, a: car.a, s: car.s, m: car.model });
    if (live) live.publishNow();
  });

  $("leaveButton").addEventListener("click", async () => {
    await finish("You left the track", "You can return using your teacher's QR code.");
    window.location.href = "./student.html?code=" + encodeURIComponent(code);
  });

  code = (new URLSearchParams(window.location.search).get("code") || "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    showOverlay("Scan your teacher's QR code", "This track needs the link from your teacher's QR code.", true);
    return;
  }

  try {
    await authReady(auth);
    if (!auth.currentUser) await signInAnonymously(auth);
    uid = auth.currentUser.uid;
    loadVehicleProfile();

    const codeSnap = await get(ref(db, paths.joinCode(code)));
    if (!codeSnap.exists()) throw new Error("This game link is no longer valid.");
    codeInfo = codeSnap.val();
    sessionId = codeInfo.sessionId;

    if (!sessionId) throw new Error("The session information is incomplete.");

    const playerSnap = await get(ref(db, paths.player(sessionId, uid)));
    if (!playerSnap.exists()) throw new Error("Your student entry was not found. Please join again from the QR code.");
    me = playerSnap.val();

    try {
      const saved = JSON.parse(localStorage.getItem("gd_track_" + code + "_" + uid) || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        const sx = Math.max(30, Math.min(WORLD.width - 30, saved.x));
        const sy = Math.max(30, Math.min(WORLD.height - 30, saved.y));
        if (!collidesWithWorld(sx, sy, 19)) {
          car.x = sx; car.y = sy; car.a = Number(saved.a) || 0;
          car.safeX = sx; car.safeY = sy;
        } else {
          car.x = 1800; car.y = 1300; car.a = 0;
        }
      } else {
        car.x = 1800 + (Math.random() - .5) * 110;
        car.y = 1300 + (Math.random() - .5) * 90;
      }
    } catch (error) {}

    live = createLiveCars({
      db,
      sessionId,
      uid,
      serverNow,
      getName: () => me ? me.name : "Driver",
      onChange: (cars) => {
        others.clear();
        cars.forEach((value, key) => others.set(key, value));
        renderRoster();
      },
      onStatus: (state, detail) => {
        setLight(state, detail);
        renderRoster();
      }
    });

    live.publish({ x: car.x, y: car.y, a: car.a, s: 0, m: car.model });
    live.start();
    live.setEnabled(codeInfo.status === "running");

    stopMe = onValue(
      ref(db, paths.player(sessionId, uid)),
      (snap) => {
        if (!snap.exists()) {
          void finish("Entry removed", "Your teacher removed your player entry. Please ask your teacher for help.");
          return;
        }
        me = snap.val();
        renderRoster();
      },
      (error) => {
        setLight("refused", friendlyError(error));
      }
    );

    stopCode = onValue(
      ref(db, paths.joinCode(code)),
      (snap) => {
        if (!snap.exists()) {
          void finish("Game closed", "This session is no longer available.");
          return;
        }
        codeInfo = snap.val();
        applyStatus();
      },
      (error) => {
        setLight("refused", friendlyError(error));
      }
    );

    statusTimer = setInterval(applyStatus, 500);
    renderRoster();
    hideOverlay();
    rafId = requestAnimationFrame(frame);
    applyStatus();
  } catch (error) {
    showOverlay("Could not enter the track", friendlyError(error), true);
  }
}

window.addEventListener("pagehide", () => {
  saveVehicleProfile();
  if (uid && code) {
    try { localStorage.setItem("gd_track_" + code + "_" + uid, JSON.stringify({ x: car.x, y: car.y, a: car.a })); } catch (error) {}
  }
  cleanupListeners();
  if (live) {
    void live.stop(true);
    live = null;
  }
});

window.GD_TRACK = {
  status() {
    return {
      uid,
      sessionId,
      status: codeInfo && codeInfo.status,
      running,
      connected: live ? live.connected : false,
      stats: live ? { ...live.stats } : null,
      otherCars: others.size
    };
  }
};

start();
