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
  onValue
} from "./firebase.js";

import {
  CODE_PATTERN,
  paths,
  $,
  serverClock,
  endsAt,
  formatClock,
  friendlyError
} from "./common.js";

import { createLiveCars, CAR_COLORS, colorFor } from "./multiplayer.js";
import { WORLD, drawMap, isOnRoad, collidesWithWorld } from "./world.js";
import { createVehicle, updateVehicle, refuelVehicle, repairVehicle } from "./vehicle.js";
import { nearbyService } from "./world.js";

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

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.fillRect(-w / 2 + 2, -h / 2 + 3, w, h);
  ctx.fillStyle = model.color;
  ctx.strokeStyle = isMine ? "#ffffff" : "#0f172a";
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.beginPath();
  if (modelKey === "sport") {
    ctx.moveTo(-w * .5, -h * .34);
    ctx.lineTo(-w * .28, -h * .5);
    ctx.lineTo(w * .28, -h * .5);
    ctx.lineTo(w * .5, -h * .25);
    ctx.lineTo(w * .5, h * .34);
    ctx.lineTo(-w * .5, h * .34);
    ctx.closePath();
  } else {
    ctx.roundRect(-w / 2, -h / 2, w, h, modelKey === "suv" ? Math.max(2, 3 * scale) : Math.max(3, 6 * scale));
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = modelKey === "suv" ? "#cbd5e1" : "rgba(255,255,255,.82)";
  const cabinW = modelKey === "sport" ? w * .42 : modelKey === "suv" ? w * .48 : w * .40;
  const cabinH = modelKey === "sport" ? h * .48 : modelKey === "suv" ? h * .68 : h * .58;
  ctx.fillRect(-w * .12, -cabinH / 2, cabinW, cabinH);
  if (modelKey === "suv") {
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = Math.max(1, scale * 1.5);
    ctx.strokeRect(-w * .16, -h * .43, w * .55, h * .86);
  }
  ctx.fillStyle = "#111827";
  ctx.fillRect(w * .31, -h * .34, w * .12, h * .68);
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
  if (key === "e") useNearbyService();
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
