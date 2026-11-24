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
  buildProgress
} from "./common.js";

import { createLiveCars, CAR_COLORS, colorFor } from "./multiplayer.js";
import { WORLD, drawMap, isOnRoad, collidesWithWorld, nearbyService, nearbyChallenge, nearbyGrammarStop } from "./world.js";
import { createVehicle, updateVehicle, repairVehicle } from "./vehicle.js";
import { createMission, nearbyMissionCrate, drawMissionMarkers } from "./missions.js";
import { createGrammarChallenge } from "./grammar-challenges.js";
import { initAudio, playSfx, updateEngineSound, stopEngineSound, toggleMuted, isMuted, setVolume, getVolume } from "./audio.js";

const { auth, db } = studentFirebase();
const serverNow = serverClock(db);

const canvas = $("track");
const ctx = canvas.getContext("2d");
const light = $("light");
const connText = $("connText");
const onlineEl = $("online");
const surfaceEl = $("surface");
const speedEl = $("speed");
const conditionEl = $("condition");
const missionHudEl = $("missionHud");
const serviceHintEl = $("serviceHint");
const serviceButton = $("serviceButton");
const challengeButton = $("challengeButton");
const challengeHintEl = $("challengeHint");
const challengePanel = $("challengePanel");
const missionTopicEl = $("missionTopic");
const missionTitleEl = $("missionTitle");
const missionBriefingEl = $("missionBriefing");
const missionCargoStatusEl = $("missionCargoStatus");
const missionPuzzleEl = $("missionPuzzle");
const missionSentenceEl = $("missionSentence");
const missionWordBankEl = $("missionWordBank");
const missionFeedbackEl = $("missionFeedback");
const missionExplanationEl = $("missionExplanation");
const missionRewardEl = $("missionReward");
const grammarPanel = $("grammarPanel");
const grammarTypeEl = $("grammarType");
const grammarPromptEl = $("grammarPrompt");
const grammarInstructionEl = $("grammarInstruction");
const grammarOptionsEl = $("grammarOptions");
const grammarSelectionEl = $("grammarSelection");
const grammarFeedbackEl = $("grammarFeedback");
const grammarExplanationEl = $("grammarExplanation");
const grammarCheckButton = $("grammarCheck");
const grammarNextButton = $("grammarNext");
const grammarUndoButton = $("grammarUndo");
const missionActionButton = $("missionAction");
const missionSubmitButton = $("missionSubmit");
const missionUndoButton = $("missionUndo");
const carSelect = $("carSelect");
const carSelectWrap = $("carSelectWrap");
const carShopPanel=$("carShopPanel"),carShopCards=$("carShopCards"),carShopColors=$("carShopColors"),carShopSelection=$("carShopSelection"),carShopWallet=$("carShopWallet"),coinsHud=$("coinsHud"),carShopApply=$("carShopApply");
let pendingModel="compact",pendingPaint=5;
const VEHICLE_PRICES={compact:0,bicycle:150,motorcycle:300,suv:450,jeep:500,truck:600,sport:650,police:1200};
const economy={coins:500,ownedModels:["compact"]};
const timerEl = $("timer");
const rosterEl = $("roster");
const debugEl = $("debug");
const overlay = $("overlay");
const overlayTitle = $("overlayTitle");
const overlayText = $("overlayText");
const overlayLink = $("overlayLink");

const keys = { left: false, right: false, steer: 0, gas: false, brake: false, reverse: false };
const car = createVehicle(1800, 1300, 0);
const CAR_MODELS = {
  compact:{label:"Compact",icon:"🚗",note:"Easy handling",width:36,height:20},
  sport:{label:"Sports Car",icon:"🏎️",note:"Fast and agile",width:43,height:18},
  suv:{label:"SUV",icon:"🚙",note:"Stable all-rounder",width:40,height:25},
  truck:{label:"Truck",icon:"🚚",note:"Heavy duty",width:49,height:28},
  motorcycle:{label:"Motorcycle",icon:"🏍️",note:"Quick and nimble",width:31,height:15},
  bicycle:{label:"Bicycle",icon:"🚲",note:"Slow and light",width:29,height:15},
  jeep:{label:"Jeep",icon:"🚙",note:"Rugged utility",width:43,height:25},
  police:{label:"Police Cruiser",icon:"🚓",note:"Patrol style",width:42,height:22}
};
const PAINT_COLORS=[
 {name:"Blue",value:"#3b82f6"},{name:"Red",value:"#ef4444"},{name:"Yellow",value:"#eab308"},
 {name:"Green",value:"#22c55e"},{name:"Orange",value:"#f97316"},{name:"Purple",value:"#8b5cf6"},
 {name:"Pink",value:"#ec4899"},{name:"White",value:"#f8fafc"},{name:"Black",value:"#334155"},{name:"Teal",value:"#14b8a6"}
];
car.model = "compact";
car.paintIndex=5;
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
let lastProfileSave = 0;
let stopCode = null;
let stopMe = null;
let canvasWidth = 0;
let canvasHeight = 0;
let pixelRatio = 1;
let mission = null;
let missionBusy = false;
let grammarChallenge = null;
let grammarBusy = false;

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
  // A 1.5x backing scale keeps the canvas crisp while avoiding the large
  // memory and fill-rate cost of 2x-3x mobile displays.
  pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  canvas.width = Math.round(canvasWidth * pixelRatio);
  canvas.height = Math.round(canvasHeight * pixelRatio);
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function getCamera() {
  // Keep a close driving view instead of shrinking the entire map to fit.
  const scale = Math.max(0.45, Math.min(1, canvasWidth / 1000, canvasHeight / 700));
  const viewW = canvasWidth / scale;
  const viewH = canvasHeight / scale;
  const camX = Math.max(0, Math.min(WORLD.width - viewW, car.x - viewW / 2));
  const camY = Math.max(0, Math.min(WORLD.height - viewH, car.y - viewH / 2));
  return { scale, viewW, viewH, camX, camY };
}

function worldToScreen(x, y) {
  const camera = getCamera();
  return {
    x: (x - camera.camX) * camera.scale,
    y: (y - camera.camY) * camera.scale,
    scale: camera.scale
  };
}

// The city scenery never changes while driving. Render it once into a
// world-sized canvas, then copy only the camera's visible area each frame.
// This avoids rebuilding building gradients, windows, roads and scenery
// on every animation frame.
let staticMapCanvas = null;
let staticMapReady = false;
let staticMapFailed = false;

function prepareStaticMap() {
  if (staticMapReady || staticMapFailed) return;
  try {
    const mapCanvas = document.createElement("canvas");
    mapCanvas.width = WORLD.width;
    mapCanvas.height = WORLD.height;
    const mapContext = mapCanvas.getContext("2d", { alpha: false });
    if (!mapContext) throw new Error("2D canvas unavailable");

    drawMap(
      mapContext,
      (x, y) => ({ x, y, scale: 1 }),
      WORLD.width,
      WORLD.height
    );

    staticMapCanvas = mapCanvas;
    staticMapReady = true;
  } catch (error) {
    // Keep the game playable on browsers that cannot allocate the cache.
    staticMapCanvas = null;
    staticMapFailed = true;
    console.warn("Static map cache unavailable; using direct rendering.", error);
  }
}

function drawCar(x, y, angle, colorIndex, name, isMine = false, modelKey = "compact") {
  const p = worldToScreen(x, y);
  const scale = p.scale;
  const model = CAR_MODELS[modelKey] || CAR_MODELS.compact;
  const paint=PAINT_COLORS[colorIndex]||PAINT_COLORS[5];
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
  ctx.fillStyle = paint.value;
  ctx.strokeStyle = isMine ? "#ffffff" : "#0f172a";
  ctx.lineWidth = Math.max(1.2, 1.8 * scale);
  ctx.beginPath();
  if (modelKey === "motorcycle" || modelKey === "bicycle") {
    // Two-wheelers are drawn from their frame and wheels below, not a car body.
  } else if (modelKey === "sport") {
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

  if(modelKey==="truck"){
    ctx.fillStyle="#1e293b";ctx.fillRect(w*.08,-h*.43,w*.35,h*.86);ctx.fillStyle="rgba(191,219,254,.9)";ctx.fillRect(w*.16,-h*.32,w*.2,h*.64);
    ctx.fillStyle="#64748b";ctx.fillRect(-w*.46,-h*.38,w*.5,h*.76);ctx.strokeStyle="#cbd5e1";ctx.lineWidth=line;ctx.strokeRect(-w*.46,-h*.38,w*.5,h*.76);
  }else if(modelKey==="jeep"){
    ctx.fillStyle="#1e293b";ctx.fillRect(-w*.13,-h*.39,w*.43,h*.78);ctx.fillStyle="rgba(191,219,254,.85)";ctx.fillRect(-w*.05,-h*.32,w*.27,h*.64);
    ctx.strokeStyle="#e2e8f0";ctx.lineWidth=line;ctx.beginPath();ctx.moveTo(-w*.28,-h*.48);ctx.lineTo(w*.32,-h*.48);ctx.moveTo(-w*.28,h*.48);ctx.lineTo(w*.32,h*.48);ctx.stroke();
  }else if(modelKey==="motorcycle"||modelKey==="bicycle"){
    const wr=Math.max(4,h*.42);ctx.fillStyle="#0f172a";[-w*.34,w*.34].forEach(x=>{ctx.beginPath();ctx.arc(x,0,wr,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#cbd5e1";ctx.lineWidth=Math.max(1,scale);ctx.stroke();});
    ctx.strokeStyle=modelKey==="bicycle"?"#e2e8f0":"#1e293b";ctx.lineWidth=Math.max(2,3*scale);ctx.beginPath();ctx.moveTo(-w*.34,0);ctx.lineTo(-w*.04,-h*.35);ctx.lineTo(w*.34,0);ctx.lineTo(w*.08,h*.25);ctx.lineTo(-w*.34,0);ctx.stroke();
    if(modelKey==="motorcycle"){ctx.fillStyle="#111827";ctx.fillRect(-w*.12,-h*.2,w*.45,h*.4);ctx.fillStyle="#fef3c7";ctx.fillRect(w*.34,-h*.13,w*.1,h*.26);}
  }else if(modelKey==="police"){
    ctx.fillStyle="#f8fafc";ctx.fillRect(-w*.13,-h*.38,w*.44,h*.76);ctx.fillStyle="#1e3a8a";ctx.fillRect(-w*.48,-h*.36,w*.32,h*.72);ctx.fillRect(w*.18,-h*.36,w*.29,h*.72);
    ctx.fillStyle="#1e293b";ctx.fillRect(-w*.12,-h*.32,w*.4,h*.64);ctx.fillStyle="#ef4444";ctx.fillRect(-5*scale,-h*.55,6*scale,h*.12);ctx.fillStyle="#3b82f6";ctx.fillRect(1*scale,-h*.55,6*scale,h*.12);
    ctx.fillStyle="#0f172a";ctx.font="bold "+Math.max(5,7*scale)+"px system-ui";ctx.textAlign="center";ctx.fillText("POLICE",0,h*.12);
  }

  // Highly visible cyan arrow at the nose: this is the FRONT of the vehicle.
  ctx.fillStyle = "#67e8f9";
  ctx.strokeStyle = "#083344";
  ctx.lineWidth = Math.max(1.5, 2.2 * scale);
  ctx.beginPath();
  ctx.moveTo(w * .62, 0);
  ctx.lineTo(w * .30, -h * .34);
  ctx.lineTo(w * .38, 0);
  ctx.lineTo(w * .30, h * .34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

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
  prepareStaticMap();
  const camera = getCamera();

  if (staticMapReady && staticMapCanvas) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.drawImage(
      staticMapCanvas,
      camera.camX,
      camera.camY,
      camera.viewW,
      camera.viewH,
      0,
      0,
      canvasWidth,
      canvasHeight
    );
  } else {
    drawMap(ctx, worldToScreen, canvasWidth, canvasHeight);
  }

  // Mission crates and vehicles are dynamic, so they remain on the live layer.
  drawMissionMarkers(ctx, worldToScreen, mission);

  // Avoid drawing cars outside the visible camera area. The margin prevents
  // vehicles entering the screen from popping in at the edge.
  const margin = 120;
  const minX = camera.camX - margin;
  const maxX = camera.camX + camera.viewW + margin;
  const minY = camera.camY - margin;
  const maxY = camera.camY + camera.viewH + margin;

  for (const [id, item] of others) {
    const pose = live ? live.pose(id) : item;
    if (
      pose &&
      pose.x >= minX && pose.x <= maxX &&
      pose.y >= minY && pose.y <= maxY
    ) {
      drawCar(pose.x, pose.y, pose.a, pose.c, pose.n, false, pose.m || "compact");
    }
  }

  drawCar(car.x, car.y, car.a, car.paintIndex, me ? me.name : "You", true, car.model);
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
  conditionEl.textContent = "Condition: " + Math.round(car.condition) + "%";
  conditionEl.style.borderColor = car.condition < 35 ? "#ef4444" : "#334155";

  const service = nearbyService(car.x, car.y);
  const challenge = nearbyChallenge(car.x, car.y);
  const grammarStop = nearbyGrammarStop(car.x, car.y);
  const crate = nearbyMissionCrate(car.x, car.y, mission);
  carSelectWrap.classList.add("hidden");
  serviceButton.classList.toggle("hidden",!service);serviceHintEl.classList.toggle("hidden",!service);
  if(service){const action=service.type==="shop"?"OPEN CAR SHOP":"REPAIR";serviceHintEl.textContent=service.name+" · Press E or tap "+action;serviceButton.textContent=action;serviceButton.dataset.service=service.type;}
  const missionOpen = challengePanel.classList.contains("hidden") === false;
  const grammarOpen = grammarPanel && !grammarPanel.classList.contains("hidden");
  const canInteract = !!crate || !!challenge || !!grammarStop;
  const missionActive = mission && ["collecting", "return"].includes(mission.status);
  missionHudEl.classList.toggle("hidden", !missionActive);
  if (missionActive) {
    const target = mission.status === "return"
      ? { x: 1940, y: 1420 }
      : mission.stops.find((stop, index) => !mission.collected.includes(index));
    if (target) {
      const dx = target.x - car.x;
      const dy = target.y - car.y;
      const angle = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;
      const directions = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];
      const direction = directions[Math.round(angle / 45) % 8];
      const distance = Math.round(Math.hypot(dx, dy));
      missionHudEl.textContent = mission.status === "return"
        ? "Cargo complete · Dispatch " + direction + " · " + distance + "m"
        : "Cargo " + mission.collected.length + "/" + mission.fragments.length +
          (mission.lastRecovered ? " · Found: " + mission.lastRecovered : "") +
          " · Next " + direction + " · " + distance + "m";
    }
  }
  challengeButton.classList.toggle("hidden", !canInteract || missionOpen || grammarOpen || !running);
  challengeHintEl.classList.toggle("hidden", !canInteract || missionOpen || grammarOpen || !running);
  if (crate) {
    challengeButton.textContent = "Collect Cargo";
    challengeHintEl.textContent = "Message Crate " + (crate.index + 1) + " · Press E or tap Collect Cargo";
  } else if (grammarStop) {
    challengeButton.textContent = "Grammar Challenge";
    challengeHintEl.textContent = grammarStop.name + " · Stop and answer a quick grammar challenge";
  } else if (challenge) {
    challengeButton.textContent = mission && mission.status === "return" ? "Return Message" : "Open Dispatch";
    challengeHintEl.textContent = mission && mission.status === "collecting"
      ? "City Dispatch · Cargo " + mission.collected.length + "/" + mission.fragments.length
      : "City Dispatch · Press E or tap Open Dispatch";
  }
}

function useNearbyService() {
  if (!running) return;
  const service = nearbyService(car.x, car.y);
  if (!service) return;
  if(service.type==="shop"){openCarShop();return;}
  if(service.type==="repair"){repairVehicle(car);playSfx("repair");}
  saveVehicleProfile();updateCar(0.001);
}

function missionStorageKey() {
  return "gd_mission_" + sessionId + "_" + uid;
}

function saveMissionState() {
  if (!mission || !uid || !sessionId) return;
  try {
    localStorage.setItem(missionStorageKey(), JSON.stringify(mission));
  } catch (error) {}
}

function loadMissionState() {
  try {
    const saved = JSON.parse(localStorage.getItem(missionStorageKey()) || "null");
    if (saved && Array.isArray(saved.fragments) && Array.isArray(saved.stops) && Array.isArray(saved.collected)) {
      mission = saved;
      return;
    }
  } catch (error) {}
  mission = createMission({ grade: codeInfo.grade, topics: codeInfo.topics });
  saveMissionState();
}

function openGrammarPanel() {
  if (!running || !nearbyGrammarStop(car.x, car.y) || !grammarPanel) return;
  grammarChallenge = createGrammarChallenge(codeInfo.grade, codeInfo.topics);
  if (!grammarChallenge) return;
  grammarBusy = false;
  grammarPanel.classList.remove("hidden");
  playSfx("click");
  clearControls();
  renderGrammarChallenge();
}

function closeGrammarPanel() {
  if (grammarBusy) return;
  if (grammarPanel) grammarPanel.classList.add("hidden");
  grammarChallenge = null;
}

function renderGrammarChallenge() {
  if (!grammarChallenge) return;
  const challenge = grammarChallenge;
  grammarTypeEl.textContent = "GRADE " + codeInfo.grade + " · " + challenge.topic + " · " + challenge.mode.toUpperCase();
  grammarPromptEl.textContent = challenge.prompt;
  grammarInstructionEl.textContent = challenge.instruction;
  grammarFeedbackEl.className = "message hidden";
  grammarFeedbackEl.textContent = "";
  grammarExplanationEl.textContent = "";
  grammarOptionsEl.textContent = "";
  grammarSelectionEl.textContent = challenge.mode === "order"
    ? (challenge.selectedWords.length ? challenge.selectedWords.join(" ") : "Your sentence will appear here.")
    : "Choose one answer.";
  grammarCheckButton.classList.remove("hidden");
  grammarNextButton.classList.add("hidden");
  grammarUndoButton.classList.toggle("hidden", challenge.mode !== "order");
  grammarCheckButton.disabled = false;

  const options = challenge.mode === "order" ? challenge.words : challenge.options;
  options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "grammar-option";
    button.textContent = option;
    if (challenge.mode === "order" && challenge.selectedWordIndexes.includes(index)) button.disabled = true;
    if (challenge.mode !== "order" && challenge.selectedOption === option) button.classList.add("selected");
    button.addEventListener("click", () => {
      if (grammarBusy) return;
      if (challenge.mode === "order") {
        if (challenge.selectedWordIndexes.includes(index)) return;
        challenge.selectedWordIndexes.push(index);
        challenge.selectedWords.push(option);
        grammarSelectionEl.textContent = challenge.selectedWords.join(" ");
        button.disabled = true;
      } else {
        challenge.selectedOption = option;
        grammarOptionsEl.querySelectorAll("button").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
      }
    });
    grammarOptionsEl.appendChild(button);
  });
}

async function submitGrammarChallenge() {
  if (!running || !grammarChallenge || grammarBusy) return;
  const challenge = grammarChallenge;
  let answered = false;
  if (challenge.mode === "order") {
    answered = challenge.selectedWords.length === challenge.answer.length;
  } else {
    answered = !!challenge.selectedOption;
  }
  if (!answered) {
    grammarFeedbackEl.className = "message warn";
    grammarFeedbackEl.textContent = challenge.mode === "order"
      ? "Tap all the words to build your sentence first."
      : "Choose an answer before checking.";
    return;
  }

  const correct = challenge.mode === "order"
    ? challenge.selectedWords.every((word, index) => word === challenge.answer[index])
    : challenge.selectedOption === challenge.answer;

  grammarBusy = true;
  grammarCheckButton.disabled = true;
  const progress = me && me.progress
    ? me.progress
    : { score: 0, correct: 0, answered: 0, updatedAt: 0 };
  const waitMs = Math.max(0, 2050 - (serverNow() - (Number(progress.updatedAt) || 0)));

  try {
    if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
    if (!running || finished) return;

    const nextScore = (Number(progress.score) || 0) + (correct ? 15 : 0);
    const nextCorrect = (Number(progress.correct) || 0) + (correct ? 1 : 0);
    const nextAnswered = (Number(progress.answered) || 0) + 1;
    await update(ref(db, paths.progress(sessionId, uid)), buildProgress(nextScore, nextCorrect, nextAnswered));
    me.progress = { score: nextScore, correct: nextCorrect, answered: nextAnswered, updatedAt: serverNow() };

    grammarFeedbackEl.className = correct ? "message success" : "message warn";
    grammarFeedbackEl.textContent = correct
      ? "Correct! +15 points. Great driving, great grammar!"
      : "Not quite. No points this time, but here's the rule to remember.";
    grammarExplanationEl.textContent = challenge.explanation;
    playSfx(correct ? "correct" : "wrong");
    grammarCheckButton.classList.add("hidden");
    grammarNextButton.classList.remove("hidden");
    grammarUndoButton.classList.add("hidden");
  } catch (error) {
    grammarFeedbackEl.className = "message error";
    grammarFeedbackEl.textContent = "Your answer could not be saved: " + friendlyError(error) + " Please try again.";
    grammarCheckButton.disabled = false;
  } finally {
    grammarBusy = false;
  }
}

function nextGrammarChallenge() {
  if (!running) return;
  grammarChallenge = createGrammarChallenge(codeInfo.grade, codeInfo.topics);
  renderGrammarChallenge();
}

function openMissionPanel() {
  if (!running || !nearbyChallenge(car.x, car.y) || challengePanel.classList.contains("hidden") === false) return;
  if (!mission) loadMissionState();
  challengePanel.classList.remove("hidden");
  playSfx("click");
  clearControls();
  renderMissionPanel();
}

function closeMissionPanel() {
  if (missionBusy) return;
  challengePanel.classList.add("hidden");
}

function renderMissionPanel() {
  if (!mission) return;
  missionTopicEl.textContent = "GRADE " + codeInfo.grade + " · " + mission.topic;
  missionTitleEl.textContent = mission.title;
  missionBriefingEl.textContent = mission.briefing;
  missionCargoStatusEl.textContent = "Recovered cargo: " + mission.collected.length + " / " + mission.fragments.length;
  missionExplanationEl.textContent = "";
  missionFeedbackEl.className = "message hidden";
  missionFeedbackEl.textContent = "";
  missionPuzzleEl.classList.toggle("hidden", mission.status !== "return");
  missionSubmitButton.disabled = missionBusy;
  missionUndoButton.disabled = missionBusy;
  missionRewardEl.textContent = "Mission reward: +30 points · +30 coins";

  if (mission.status === "available") {
    missionBriefingEl.textContent += " Drive to each glowing crate marker, collect all message fragments, then return here.";
    missionActionButton.textContent = "Start Mission";
    missionActionButton.classList.remove("hidden");
  } else if (mission.status === "collecting") {
    missionBriefingEl.textContent = "Your mission is active. Close Dispatch, drive to the glowing cargo markers, and press E or Collect Cargo at each stop.";
    missionActionButton.classList.add("hidden");
  } else if (mission.status === "return") {
    missionBriefingEl.textContent = "All cargo recovered. Now arrange the fragments to reconstruct the original message.";
    missionActionButton.classList.add("hidden");
    renderMissionBuilder();
  } else if (mission.status === "complete") {
    missionBriefingEl.textContent = "Delivery complete. Your message has been reconstructed and the city route is clear.";
    missionCargoStatusEl.textContent = "All cargo delivered";
    missionExplanationEl.textContent = mission.explanation;
    missionFeedbackEl.className = "message success";
    missionFeedbackEl.textContent = "MISSION COMPLETE · +30 POINTS";
    missionActionButton.textContent = "Start Another Mission";
    missionActionButton.classList.remove("hidden");
  }
}

function renderMissionBuilder() {
  missionSentenceEl.textContent = "";
  missionWordBankEl.textContent = "";
  const placed = new Set(mission.assembled);
  mission.assembled.forEach((fragmentId, position) => {
    const fragment = mission.fragments[fragmentId];
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "good";
    chip.textContent = fragment.text;
    chip.title = "Tap to remove";
    chip.addEventListener("click", () => {
      if (missionBusy) return;
      mission.assembled.splice(position, 1);
      saveMissionState();
      renderMissionBuilder();
    });
    missionSentenceEl.appendChild(chip);
  });
  mission.shuffled.forEach((fragment) => {
    if (placed.has(fragment.id)) return;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "secondary";
    chip.textContent = fragment.text;
    chip.addEventListener("click", () => {
      if (missionBusy) return;
      mission.assembled.push(fragment.id);
      saveMissionState();
      renderMissionBuilder();
    });
    missionWordBankEl.appendChild(chip);
  });
  missionSubmitButton.disabled = missionBusy || mission.assembled.length !== mission.fragments.length;
}

function startMission() {
  if (!mission || mission.status !== "available") return;
  mission.status = "collecting";
  playSfx("mission");
  saveMissionState();
  challengePanel.classList.add("hidden");
  updateCar(0.001);
}

function collectMissionCrate(crate) {
  if (!mission || mission.status !== "collecting" || !crate) return;
  if (mission.collected.includes(crate.index)) return;
  mission.collected.push(crate.index);
  playSfx("collect");
  const recovered = mission.fragments[crate.index];
  mission.lastRecovered = recovered.text;
  if (mission.collected.length >= mission.fragments.length) mission.status = "return";
  saveMissionState();
  challengeHintEl.textContent = "Recovered: " + recovered.text + " · " + mission.collected.length + "/" + mission.fragments.length;
  challengeHintEl.classList.remove("hidden");
  challengeButton.classList.add("hidden");
  updateCar(0.001);
}

async function deliverMission() {
  if (!mission || mission.status !== "return" || missionBusy || !running) return;
  const correctOrder = mission.assembled.length === mission.fragments.length &&
    mission.assembled.every((fragmentId, index) => fragmentId === index);
  if (!correctOrder) {
    missionFeedbackEl.className = "message warn";
    missionFeedbackEl.textContent = "The message is not in the right order yet. Rearrange the fragments and try again.";
    playSfx("wrong");
    return;
  }

  missionBusy = true;
  missionSubmitButton.disabled = true;
  missionUndoButton.disabled = true;
  const progress = me && me.progress ? me.progress : { score: 0, correct: 0, answered: 0, updatedAt: 0 };
  const waitMs = Math.max(0, 2050 - (serverNow() - (Number(progress.updatedAt) || 0)));
  if (waitMs > 0) {
    missionFeedbackEl.className = "message warn";
    missionFeedbackEl.textContent = "Dispatch is verifying the delivery…";
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const nextScore = (Number(progress.score) || 0) + 30;
  const nextCorrect = (Number(progress.correct) || 0) + 1;
  const nextAnswered = (Number(progress.answered) || 0) + 1;
  try {
    await update(ref(db, paths.progress(sessionId, uid)), buildProgress(nextScore, nextCorrect, nextAnswered));
    me.progress = { score: nextScore, correct: nextCorrect, answered: nextAnswered, updatedAt: serverNow() };
    mission.status = "complete";
    playSfx("reward");
    economy.coins += 30;
    saveVehicleProfile();
    updateWalletDisplay();
    saveMissionState();
    renderMissionPanel();
  } catch (error) {
    missionFeedbackEl.className = "message error";
    missionFeedbackEl.textContent = "Delivery could not be recorded: " + friendlyError(error) + " Please try again.";
  } finally {
    missionBusy = false;
    missionSubmitButton.disabled = false;
    missionUndoButton.disabled = false;
  }
}

function startAnotherMission() {
  mission = createMission({ grade: codeInfo.grade, topics: codeInfo.topics });
  saveMissionState();
  renderMissionPanel();
}

function interactMission() {
  if (!running || challengePanel.classList.contains("hidden") === false || (grammarPanel && !grammarPanel.classList.contains("hidden"))) return;
  const crate = nearbyMissionCrate(car.x, car.y, mission);
  if (crate) {
    collectMissionCrate(crate);
    return;
  }
  if (nearbyGrammarStop(car.x, car.y)) {
    openGrammarPanel();
    return;
  }
  if (nearbyChallenge(car.x, car.y)) openMissionPanel();
}

function ownsVehicle(key){return economy.ownedModels.includes(key);}
function updateWalletDisplay(){
 if(coinsHud)coinsHud.textContent="🪙 "+economy.coins;
 if(carShopWallet)carShopWallet.textContent="Wallet · "+economy.coins+" coins";
}
function renderCarShop(){
 if(!carShopCards||!carShopColors)return;
 updateWalletDisplay();
 carShopCards.innerHTML="";
 Object.entries(CAR_MODELS).forEach(([key,model])=>{
  const card=document.createElement("button");card.type="button";
  const owned=ownsVehicle(key),price=VEHICLE_PRICES[key]||0;
  card.className="vehicle-card"+(pendingModel===key?" selected":"")+(owned?" owned":" locked");
  card.innerHTML='<span class="vehicle-icon"></span><strong></strong><small></small><em></em>';
  card.querySelector(".vehicle-icon").textContent=model.icon;
  card.querySelector("strong").textContent=model.label;
  card.querySelector("small").textContent=model.note;
  card.querySelector("em").textContent=owned?"✓ OWNED":("🔒 "+price+" coins");
  card.addEventListener("click",()=>{pendingModel=key;renderCarShop();});
  carShopCards.appendChild(card);
 });
 carShopColors.innerHTML="";
 PAINT_COLORS.forEach((paint,index)=>{
  const sw=document.createElement("button");sw.type="button";
  sw.className="color-swatch"+(pendingPaint===index?" selected":"");
  sw.style.background=paint.value;sw.title=paint.name;
  sw.setAttribute("aria-label",paint.name+" paint");
  sw.addEventListener("click",()=>{pendingPaint=index;renderCarShop();});
  carShopColors.appendChild(sw);
 });
 const price=VEHICLE_PRICES[pendingModel]||0,owned=ownsVehicle(pendingModel);
 carShopSelection.textContent=CAR_MODELS[pendingModel].label+" · "+PAINT_COLORS[pendingPaint].name+" · "+(owned?"Ready to use":price+" coins");
 carShopApply.textContent=owned?"Use this vehicle":(economy.coins>=price?"Buy for "+price+" coins":"Need "+(price-economy.coins)+" more coins");
 carShopApply.disabled=!owned&&economy.coins<price;
}
function openCarShop(){const s=nearbyService(car.x,car.y);if(!running||!s||s.type!=="shop")return;pendingModel=car.model;pendingPaint=car.paintIndex;renderCarShop();carShopPanel.classList.remove("hidden");playSfx("click");clearControls();}
function closeCarShop(){carShopPanel.classList.add("hidden");}
function applyCarShopSelection(){
 if(!running||!CAR_MODELS[pendingModel]||!PAINT_COLORS[pendingPaint])return;
 if(!ownsVehicle(pendingModel)){
  const price=VEHICLE_PRICES[pendingModel]||0;
  if(economy.coins<price)return;
  economy.coins-=price;
  economy.ownedModels.push(pendingModel);
 }
 car.model=pendingModel;car.paintIndex=pendingPaint;car.s=0;
 saveVehicleProfile();updateWalletDisplay();
 if(live){live.publish({x:car.x,y:car.y,a:car.a,s:car.s,m:car.model});live.publishNow();}
 closeCarShop();updateCar(.001);
}
function profileStorageKey() { return "gd_vehicle_profile_" + uid; }

function saveVehicleProfile() {
 if(!uid)return;
 try{
  localStorage.setItem(profileStorageKey(),JSON.stringify({
   condition:car.condition,model:car.model,paintIndex:car.paintIndex,
   coins:economy.coins,ownedModels:economy.ownedModels
  }));
 }catch(error){}
}
function loadVehicleProfile() {
 if(!uid)return;
 try{
  const saved=JSON.parse(localStorage.getItem(profileStorageKey())||"null");
  if(!saved||typeof saved!=="object")return;
  if(Number.isFinite(saved.condition))car.condition=Math.max(0,Math.min(100,saved.condition));
  if(CAR_MODELS[saved.model])car.model=saved.model;
  if(Number.isInteger(saved.paintIndex))car.paintIndex=Math.max(0,Math.min(PAINT_COLORS.length-1,saved.paintIndex));
  if(Number.isFinite(saved.coins))economy.coins=Math.max(0,Math.floor(saved.coins));
  if(Array.isArray(saved.ownedModels))economy.ownedModels=[...new Set(["compact",...saved.ownedModels.filter(key=>CAR_MODELS[key])])];
  if(!ownsVehicle(car.model))car.model="compact";
 }catch(error){}
 updateWalletDisplay();
}

function frame(timestamp) {
  if (finished) return;
  const dt = Math.min(0.05, lastFrame ? (timestamp - lastFrame) / 1000 : 0);
  lastFrame = timestamp;

  const modalOpen =
    challengePanel.classList.contains("hidden") === false ||
    (grammarPanel && grammarPanel.classList.contains("hidden") === false) ||
    carShopPanel.classList.contains("hidden") === false;

  if (running && !modalOpen) {
    updateEngineSound(car.s, keys.gas);
    updateCar(dt);
    if (live) live.publish({ x: car.x, y: car.y, a: car.a, s: car.s, m: car.model });
    if (timestamp - lastSave > 1000) {
      lastSave = timestamp;
      try {
        localStorage.setItem("gd_track_" + code + "_" + uid, JSON.stringify({
          x: car.x, y: car.y, a: car.a
        }));
      } catch (error) {}
    }

    // Vehicle profile data changes far less often than position. Persist it
    // periodically instead of serializing and writing it every second.
    if (timestamp - lastProfileSave > 10000) {
      lastProfileSave = timestamp;
      saveVehicleProfile();
    }
  } else {
    updateEngineSound(0, false);
  }

  drawWorld();
  rafId = requestAnimationFrame(frame);
}

function handleVisibilityChange() {
  if (document.hidden) {
    clearControls();
    updateEngineSound(0, false);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    lastFrame = 0;
    return;
  }

  if (!finished && rafId === 0) {
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }
}

function clearControls() {
  Object.keys(keys).forEach((key) => { keys[key] = key === "steer" ? 0 : false; });
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
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  clearControls();
}

async function finish(title, message, showBack = true) {
  if (finished) return;
  finished = true;
  running = false;
  stopEngineSound();
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
  if (grammarPanel && !grammarPanel.classList.contains("hidden")) {
    if (key === "escape") closeGrammarPanel();
    return;
  }
  if (!challengePanel.classList.contains("hidden")) {
    if (key === "escape") closeMissionPanel();
    return;
  }
  if (!carShopPanel.classList.contains("hidden")) {
    if (key === "escape") closeCarShop();
    return;
  }
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
  if (key === "arrowleft" || key === "a") { keys.left = true; keys.steer = -1; }
  if (key === "arrowright" || key === "d") { keys.right = true; keys.steer = 1; }
  if (key === "arrowup" || key === "w") keys.gas = true;
  if (key === "arrowdown" || key === "s") keys.reverse = true;
  if (key === " ") keys.brake = true;
  if (key === "e") {
    if (nearbyService(car.x, car.y)) useNearbyService();
    else interactMission();
  }
}

function onKeyUp(event) {
  const key = event.key.toLowerCase();
  if (key === "arrowleft" || key === "a") { keys.left = false; if (!keys.right) keys.steer = 0; }
  if (key === "arrowright" || key === "d") { keys.right = false; if (!keys.left) keys.steer = 0; }
  if (key === "arrowup" || key === "w") keys.gas = false;
  if (key === "arrowdown" || key === "s") keys.reverse = false;
  if (key === " ") keys.brake = false;
}

function bindTouch(buttonId, keyName) {
  const button = $(buttonId);
  if (!button) return;

  let activePointer = null;
  const release = (event) => {
    if (activePointer === null) return;
    if (event && event.pointerId !== undefined && event.pointerId !== activePointer) return;
    activePointer = null;
    keys[keyName] = false;
    button.classList.remove("on");
  };

  button.addEventListener("pointerdown", (event) => {
    if (activePointer !== null || !running) return;
    event.preventDefault();
    activePointer = event.pointerId;
    keys[keyName] = true;
    button.classList.add("on");
    try { button.setPointerCapture(event.pointerId); } catch (error) {}
  });

  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

function bindSteeringJoystick() {
  const base = $("steeringJoystick");
  const knob = $("steeringKnob");
  const track = base && base.querySelector(".analog-track");
  if (!base || !knob || !track) return;

  let pointerId = null;
  const getMaxTravel = () => Math.max(18, track.clientWidth / 2 - knob.offsetWidth / 2 - 2);

  const moveKnob = (event) => {
    const rect = track.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const maxTravel = getMaxTravel();
    const dx = Math.max(-maxTravel, Math.min(maxTravel, event.clientX - centerX));

    // The steering control is deliberately one-axis: the thumb moves only left/right.
    knob.style.transform = "translate(-50%, -50%) translate(" + dx + "px, 0px)";
    const rawX = Math.max(-1, Math.min(1, dx / maxTravel));
    const deadZone = 0.12;
    const magnitude = Math.abs(rawX);
    const curved = magnitude <= deadZone
      ? 0
      : Math.pow((magnitude - deadZone) / (1 - deadZone), 1.35);
    // A little less than full input keeps steering gradual and predictable.
    keys.steer = Math.sign(rawX) * curved * 0.82;
    keys.left = keys.steer < -0.02;
    keys.right = keys.steer > 0.02;
  };

  base.addEventListener("pointerdown", (event) => {
    if (!running || pointerId !== null) return;
    event.preventDefault();
    pointerId = event.pointerId;
    base.classList.add("active");
    try { base.setPointerCapture(pointerId); } catch (error) {}
    moveKnob(event);
  });

  base.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;
    event.preventDefault();
    moveKnob(event);
  });

  const release = (event) => {
    if (pointerId === null || (event && event.pointerId !== undefined && pointerId !== event.pointerId)) return;
    pointerId = null;
    keys.steer = 0;
    keys.left = false;
    keys.right = false;
    knob.style.transform = "translate(-50%, -50%)";
    base.classList.remove("active");
  };

  base.addEventListener("pointerup", release);
  base.addEventListener("pointercancel", release);
  base.addEventListener("lostpointercapture", release);
}
async function start() {
  resizeCanvas();
  const soundButton = $("soundToggle");
  const soundVolume = $("soundVolume");
  const refreshSoundButton = () => {
    if (soundButton) {
      soundButton.textContent = isMuted() ? "🔇 Sound Off" : "🔊 Sound On";
      soundButton.setAttribute("aria-pressed", String(!isMuted()));
    }
  };
  document.addEventListener("pointerdown", initAudio, { once: true });
  document.addEventListener("keydown", initAudio, { once: true });
  if (soundButton) {
    refreshSoundButton();
    soundButton.addEventListener("click", () => {
      initAudio();
      toggleMuted();
      refreshSoundButton();
      if (!isMuted()) playSfx("click");
    });
  }
  if (soundVolume) {
    soundVolume.value = String(Math.round(getVolume() * 100));
    soundVolume.addEventListener("input", () => {
      initAudio();
      setVolume(Number(soundVolume.value) / 100);
    });
  }
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  bindSteeringJoystick();
  bindTouch("btnForward", "gas");
  bindTouch("btnBackward", "reverse");
  serviceButton.addEventListener("click", useNearbyService);
  challengeButton.addEventListener("click", interactMission);
  $("missionClose").addEventListener("click", closeMissionPanel);
  $("grammarClose").addEventListener("click", closeGrammarPanel);
  grammarCheckButton.addEventListener("click", () => void submitGrammarChallenge());
  grammarNextButton.addEventListener("click", nextGrammarChallenge);
  grammarUndoButton.addEventListener("click", () => {
    if (!grammarChallenge || grammarBusy || grammarChallenge.mode !== "order") return;
    grammarChallenge.selectedWordIndexes.pop();
    grammarChallenge.selectedWords.pop();
    renderGrammarChallenge();
  });
  missionActionButton.addEventListener("click", () => {
    if (!mission) return;
    if (mission.status === "available") startMission();
    else if (mission.status === "complete") startAnotherMission();
  });
  missionSubmitButton.addEventListener("click", () => void deliverMission());
  missionUndoButton.addEventListener("click", () => {
    if (!mission || missionBusy || !mission.assembled.length) return;
    mission.assembled.pop();
    saveMissionState();
    renderMissionBuilder();
  });
  $("carShopClose").addEventListener("click",closeCarShop);
  $("carShopApply").addEventListener("click",applyCarShopSelection);
  carShopPanel.addEventListener("click",event=>{if(event.target===carShopPanel)closeCarShop();});
  renderCarShop();

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
    if (!codeInfo.grade || !codeInfo.topics) throw new Error("This session is missing its grade or grammar topics. Ask your teacher to create a new session.");
    loadMissionState();

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
      color: () => car.paintIndex,
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
