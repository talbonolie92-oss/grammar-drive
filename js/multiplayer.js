// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/multiplayer.js — shared live-car synchronization
//
// Position updates are throttled. A connection's onDisconnect cleanup is
// acknowledged before its first upload. Publishing stays disabled until the
// session is running.
// --------------------------------------------------

import {
  ref,
  set,
  update,
  remove,
  onValue,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  serverTimestamp
} from "./firebase.js";

export const MP = Object.freeze({
  SEND_MS: 500,
  HEARTBEAT_MS: 4000,
  DELAY_MS: 750,
  STALE_MS: 12000,
  EXTRAPOLATE_MS: 400,
  WORLD_MAX: 4000
});

export const CAR_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f8fafc", "#a3a3a3"
];

export function colorFor(uid) {
  let hash = 0;
  for (let i = 0; i < String(uid || "").length; i++) {
    hash = ((hash << 5) - hash + String(uid).charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % CAR_COLORS.length;
}

export function liveCarsPath(sessionId) {
  return "liveCars/" + sessionId;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrapAngle = (angle) => {
  const tau = Math.PI * 2;
  return ((angle + Math.PI) % tau + tau) % tau - Math.PI;
};
const angleDelta = (from, to) => wrapAngle(to - from);

export function createLiveCars(options) {
  const {
    db,
    sessionId,
    uid,
    serverNow = () => Date.now(),
    getName = () => "Driver",
    color = colorFor(uid),
    onChange = () => {},
    onStatus = () => {}
  } = options || {};

  if (!db || !sessionId || !uid) {
    throw new Error("createLiveCars needs db, sessionId, and uid.");
  }

  const carRef = ref(db, liveCarsPath(sessionId) + "/" + uid);
  const listRef = ref(db, liveCarsPath(sessionId));
  const others = new Map();
  const stops = [];

  const stats = {
    sent: 0,
    received: 0,
    refused: 0,
    connected: false,
    registrationReady: false,
    inFlight: false,
    lastSentAt: 0,
    lastError: ""
  };

  let connected = false;
  let registrationReady = false;
  let enabled = false;
  let stopped = false;
  let fullNeeded = true;
  let inFlight = false;
  let latest = null;
  let lastSentAt = 0;
  let pausedUntil = 0;
  let timer = null;
  let connectionGeneration = 0;
  let intentionalRemoval = false;

  function status(value, detail) {
    onStatus(value, detail || "");
  }

  function normalizedState(state) {
    const x = clamp(Number(state.x) || 0, 0, MP.WORLD_MAX);
    const y = clamp(Number(state.y) || 0, 0, MP.WORLD_MAX);
    const a = wrapAngle(Number(state.a) || 0);
    const s = clamp(Number(state.s) || 0, -1500, 1500);
    const model = ["compact", "sport", "suv", "truck", "motorcycle", "bicycle", "jeep", "police"].includes(state.m) ? state.m : "compact";
    return { x, y, a, s, m: model };
  }

  function currentName() {
    return String(getName() || "Driver").slice(0, 40);
  }

  function currentColor() {
    const value = typeof color === "function" ? color(uid) : color;
    return Number.isInteger(value) ? clamp(value, 0, CAR_COLORS.length - 1) : colorFor(uid);
  }

  function fullRecord(state) {
    const p = normalizedState(state);
    return {
      x: p.x,
      y: p.y,
      a: p.a,
      s: p.s,
      m: p.m,
      c: currentColor(),
      n: currentName(),
      t: serverTimestamp()
    };
  }

  function movementRecord(state) {
    const p = normalizedState(state);
    return {
      x: p.x,
      y: p.y,
      a: p.a,
      s: p.s,
      m: p.m,
      c: currentColor(),
      // Keep the display name synchronized with teacher renames.
      n: currentName(),
      t: serverTimestamp()
    };
  }

  async function tick(force = false) {
    if (
      stopped || !enabled || !connected || !registrationReady ||
      !latest || inFlight || Date.now() < pausedUntil
    ) return;

    const now = Date.now();
    const moving = Math.abs(Number(latest.s) || 0) > 1;
    const interval = moving ? MP.SEND_MS : MP.HEARTBEAT_MS;

    if (!force && now - lastSentAt < interval) return;

    inFlight = true;
    stats.inFlight = true;
    const wasFull = fullNeeded;
    const payload = wasFull ? fullRecord(latest) : movementRecord(latest);

    try {
      if (wasFull) {
        await set(carRef, payload);
      } else {
        await update(carRef, payload);
      }

      fullNeeded = false;
      lastSentAt = Date.now();
      stats.lastSentAt = lastSentAt;
      stats.sent += 1;
      stats.lastError = "";
      stats.refused = 0;
      status("online");
    } catch (error) {
      stats.refused += 1;
      stats.lastError = (error && error.code) || (error && error.message) || "write failed";
      pausedUntil = Date.now() + 2000;

      // If the record was removed during a reconnect or teacher cleanup,
      // the next attempt must recreate the complete record.
      if (!wasFull) fullNeeded = true;

      status("refused", stats.lastError);
    } finally {
      inFlight = false;
      stats.inFlight = false;
    }
  }

  function rememberCar(carUid, value) {
    if (carUid === uid || !value || typeof value !== "object") return;

    const sample = {
      x: Number(value.x) || 0,
      y: Number(value.y) || 0,
      a: Number(value.a) || 0,
      s: Number(value.s) || 0,
      m: ["compact", "sport", "suv", "truck", "motorcycle", "bicycle", "jeep", "police"].includes(value.m) ? value.m : "compact",
      c: Number.isInteger(value.c) ? value.c : colorFor(carUid),
      n: String(value.n || "Driver"),
      t: Number(value.t) || serverNow()
    };

    const previous = others.get(carUid);
    const history = previous && Array.isArray(previous.history)
      ? previous.history.slice()
      : [];

    if (!history.length || history[history.length - 1].t !== sample.t) {
      history.push(sample);
    }
    while (history.length > 8) history.shift();

    others.set(carUid, { ...sample, uid: carUid, history });
    stats.received += 1;
    onChange(others);
  }

  function removeCar(carUid) {
    if (carUid === uid) {
      if (!stopped && !intentionalRemoval && connected && enabled) {
        // A delayed onDisconnect from an older connection can remove the
        // shared UID record after this device has reconnected. Recreate it.
        fullNeeded = true;
        lastSentAt = 0;
        void tick(true);
      }
      return;
    }

    if (others.delete(carUid)) onChange(others);
  }

  function startListeners() {
    stops.push(onChildAdded(listRef, (snap) => rememberCar(snap.key, snap.val())));
    stops.push(onChildChanged(listRef, (snap) => rememberCar(snap.key, snap.val())));
    stops.push(onChildRemoved(listRef, (snap) => removeCar(snap.key)));

    stops.push(onValue(ref(db, ".info/connected"), async (snap) => {
      const isConnected = snap.val() === true;
      connected = isConnected;
      stats.connected = isConnected;

      if (!isConnected) {
        registrationReady = false;
        stats.registrationReady = false;
        connectionGeneration += 1;
        status("reconnecting");
        return;
      }

      const generation = ++connectionGeneration;
      registrationReady = false;
      stats.registrationReady = false;
      status("registering-cleanup");

      try {
        // Firebase confirms the disconnect operation before any car write.
        await onDisconnect(carRef).remove();

        if (
          stopped || !connected ||
          generation !== connectionGeneration
        ) return;

        registrationReady = true;
        stats.registrationReady = true;
        fullNeeded = true;
        lastSentAt = 0;
        status("online");
        void tick(true);
      } catch (error) {
        if (generation !== connectionGeneration || stopped) return;
        stats.lastError = (error && error.message) || "Could not register disconnect cleanup.";
        status("cleanup-registration-failed", stats.lastError);
      }
    }));
  }

  function start() {
    if (stopped) return;
    if (!stops.length) startListeners();
    if (!timer) {
      // 4 checks per second are sufficient: position uploads are already
      // throttled to 500ms and stale-player cleanup has a 12s grace period.
      timer = setInterval(() => {
        void tick(false);
        const now = serverNow();
        let removed = false;
        for (const [carUid, car] of others) {
          if (now - car.t > MP.STALE_MS) {
            others.delete(carUid);
            removed = true;
          }
        }
        if (removed) onChange(others);
      }, 250);
    }
  }

  function setEnabled(value) {
    const nextEnabled = value === true;
    if (enabled === nextEnabled) return;
    enabled = nextEnabled;
    if (enabled) {
      fullNeeded = true;
      lastSentAt = 0;
      void tick(true);
    }
  }

  function publish(state) {
    if (stopped || !state) return;
    latest = normalizedState(state);
    if (enabled) void tick(false);
  }

  function publishNow() {
    if (stopped || !latest || !enabled) return;
    void tick(true);
  }

  function pose(carOrUid, at = serverNow()) {
    const car = typeof carOrUid === "string" ? others.get(carOrUid) : carOrUid;
    if (!car) return null;

    const history = Array.isArray(car.history) && car.history.length
      ? car.history
      : [car];

    const target = at - MP.DELAY_MS;
    let before = history[0];
    let after = null;

    for (const sample of history) {
      if (sample.t <= target) before = sample;
      if (sample.t >= target) {
        after = sample;
        break;
      }
    }

    if (after && after.t > before.t) {
      const ratio = clamp((target - before.t) / (after.t - before.t), 0, 1);
      return {
        ...car,
        x: before.x + (after.x - before.x) * ratio,
        y: before.y + (after.y - before.y) * ratio,
        a: wrapAngle(before.a + angleDelta(before.a, after.a) * ratio),
        s: before.s + (after.s - before.s) * ratio
      };
    }

    const latestSample = history[history.length - 1];
    const age = target - latestSample.t;
    if (age > 0 && age <= MP.EXTRAPOLATE_MS) {
      const seconds = age / 1000;
      return {
        ...car,
        x: clamp(latestSample.x + Math.cos(latestSample.a) * latestSample.s * seconds, 0, MP.WORLD_MAX),
        y: clamp(latestSample.y + Math.sin(latestSample.a) * latestSample.s * seconds, 0, MP.WORLD_MAX),
        a: latestSample.a,
        s: latestSample.s
      };
    }

    return { ...car, ...latestSample };
  }

  async function stop(removeOwn = false) {
    if (stopped) return;
    stopped = true;
    enabled = false;
    intentionalRemoval = removeOwn === true;

    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    stops.splice(0).forEach((unsubscribe) => {
      try { unsubscribe(); } catch (error) {}
    });

    others.clear();
    onChange(others);

    if (removeOwn) {
      try {
        await remove(carRef);
      } catch (error) {
        stats.lastError = (error && error.message) || "Could not remove car.";
      }
    }
    status("offline");
  }

  return {
    start,
    setEnabled,
    publish,
    publishNow,
    pose,
    stop,
    others,
    stats,
    get connected() { return connected; },
    get enabled() { return enabled; }
  };
}
