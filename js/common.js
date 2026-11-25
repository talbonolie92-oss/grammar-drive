
// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/common.js — shared helpers and database layout
// --------------------------------------------------

import { ref, get, onValue, serverTimestamp } from "./firebase.js";

/* ---------- constants ---------- */

export const RULES_VERSION = "phase1-v2";

export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

export const TOPICS = [
  "Question Forms",
  "Yes/No Questions",
  "Wh-Questions",
  "Tag Questions"
];

export const GRADES = ["10", "11", "12"];
export const DURATIONS = [10, 15, 20, 30, 45];

export const NAME_MAX = 40;
export const CLASS_MAX = 30;

/* ---------- database write builders ---------- */

export function buildCreateSession(sessionId, code, teacherUid, options) {
  const session = {
    teacherUid,
    code,
    grade: options.grade,
    topics: options.topics,
    durationMinutes: options.durationMinutes,
    allowLateJoin: !!options.allowLateJoin,
    status: "waiting",
    createdAt: serverTimestamp()
  };

  return {
    ["sessions/" + sessionId]: session,
    ["joinCodes/" + code]: {
      sessionId,
      grade: session.grade,
      topics: session.topics,
      status: "waiting",
      durationMinutes: session.durationMinutes,
      allowLateJoin: session.allowLateJoin
    }
  };
}

export function buildStartSession(sessionId, code) {
  return {
    ["sessions/" + sessionId + "/status"]: "running",
    ["sessions/" + sessionId + "/startedAt"]: serverTimestamp(),
    ["joinCodes/" + code + "/status"]: "running",
    ["joinCodes/" + code + "/startedAt"]: serverTimestamp()
  };
}

export function buildEndSession(sessionId, code) {
  return {
    ["sessions/" + sessionId + "/status"]: "ended",
    ["sessions/" + sessionId + "/endedAt"]: serverTimestamp(),
    ["joinCodes/" + code + "/status"]: "ended"
  };
}

export function buildPlayer(name, classSection) {
  return {
    name,
    classSection,
    joinedAt: serverTimestamp(),
    progress: {
      score: 0,
      correct: 0,
      answered: 0,
      updatedAt: serverTimestamp()
    }
  };
}

export function buildProgress(score, correct, answered) {
  return {
    score,
    correct,
    answered,
    updatedAt: serverTimestamp()
  };
}

/* ---------- database paths ---------- */

export const paths = {
  session: (sid) => "sessions/" + sid,
  players: (sid) => "sessions/" + sid + "/players",
  player: (sid, uid) => "sessions/" + sid + "/players/" + uid,
  progress: (sid, uid) =>
    "sessions/" + sid + "/players/" + uid + "/progress",
  joinCode: (code) => "joinCodes/" + code
};

/* ---------- general helpers ---------- */

export function makeCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);

  return Array.from(
    values,
    (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]
  ).join("");
}

export function cleanText(value, max) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function normaliseName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, "");
}

export function $(id) {
  return document.getElementById(id);
}

/* ---------- safe HTML element helper ---------- */

export function el(tag, props, children) {
  const node = document.createElement(tag);

  Object.entries(props || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) {
      return;
    }

    if (key === "text") {
      node.textContent = value;
    } else if (key === "className") {
      node.className = value;
    } else if (key.startsWith("on")) {
      node.addEventListener(key.slice(2), value);
    } else {
      node.setAttribute(key, value === true ? "" : value);
    }
  });

  (children || []).forEach((child) => {
    if (child === null || child === undefined || child === false) {
      return;
    }

    node.appendChild(
      typeof child === "string"
        ? document.createTextNode(child)
        : child
    );
  });

  return node;
}

/* ---------- messages ---------- */

export function showMessage(element, text, kind) {
  element.textContent = text;
  element.className = "message " + (kind || "error");
}

export function hideMessage(element) {
  element.textContent = "";
  element.className = "message hidden";
}

/* ---------- time helpers ---------- */

export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return minutes + ":" + String(seconds).padStart(2, "0");
}

export function formatTime(timestamp) {
  return typeof timestamp === "number"
    ? new Date(timestamp).toLocaleTimeString()
    : "";
}

export function serverClock(db) {
  let offset = 0;

  onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
    offset = Number(snap.val()) || 0;
  });

  return () => Date.now() + offset;
}

export function endsAt(record) {
  if (
    !record ||
    typeof record.startedAt !== "number" ||
    typeof record.durationMinutes !== "number"
  ) {
    return null;
  }

  return record.startedAt + record.durationMinutes * 60000;
}

/* ---------- Firebase rules version check ---------- */

export async function phase1RulesPublished(db) {
  try {
    const snapshot = await get(ref(db, "rulesVersion"));

    return snapshot.val() === RULES_VERSION;
  } catch (error) {
    return false;
  }
}

/* ---------- Firebase error messages ---------- */

export function friendlyError(error) {
  const code = String(
    (error && (error.code || error.message)) || ""
  );

  if (/PERMISSION_DENIED|permission[_ ]denied/i.test(code)) {
    return "Not allowed by the database rules.";
  }

  if (/network|unavailable|disconnected/i.test(code)) {
    return "Network problem. Check the internet connection and try again.";
  }

  if (
    /auth\/invalid-credential|auth\/wrong-password|auth\/user-not-found/.test(code)
  ) {
    return "Incorrect email or password.";
  }

  if (/auth\/invalid-email/.test(code)) {
    return "Please enter a valid email address.";
  }

  if (/auth\/too-many-requests/.test(code)) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }

  if (
    /auth\/admin-restricted-operation|auth\/operation-not-allowed/.test(code)
  ) {
    return "This sign-in method is turned off in Firebase Authentication.";
  }

  return (error && error.message) || "Something went wrong. Please try again.";
}

/* ---------- QR code drawing ---------- */

export function drawQR(canvas, matrix) {
  const quiet = 4;
  const size = matrix.length + quiet * 2;
  const scale = Math.max(4, Math.floor(600 / size));

  canvas.width = canvas.height = size * scale;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#000";

  matrix.forEach((row, r) => {
    row.forEach((dark, c) => {
      if (dark) {
        ctx.fillRect(
          (c + quiet) * scale,
          (r + quiet) * scale,
          scale,
          scale
        );
      }
    });
  });
}
