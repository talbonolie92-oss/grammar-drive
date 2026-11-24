// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/world.js — Phase 4A map, roads, locations and collision geometry
// --------------------------------------------------

export const WORLD = Object.freeze({ width: 3600, height: 2600 });

const ROADS = [
  { x: 300, y: 230, w: 3000, h: 150, axis: "h" },
  { x: 300, y: 2220, w: 3000, h: 150, axis: "h" },
  { x: 230, y: 300, w: 150, h: 2000, axis: "v" },
  { x: 3220, y: 300, w: 150, h: 2000, axis: "v" },
  { x: 300, y: 1225, w: 3000, h: 150, axis: "h" },
  { x: 1725, y: 300, w: 150, h: 2000, axis: "v" },
  { x: 900, y: 300, w: 120, h: 2000, axis: "v" },
  { x: 2580, y: 300, w: 120, h: 2000, axis: "v" }
];

const BUILDINGS = [
  { x: 470, y: 470, w: 330, h: 260, name: "CITY HALL", color: "#64748b" },
  { x: 1040, y: 470, w: 390, h: 260, name: "APARTMENTS", color: "#78716c" },
  { x: 2040, y: 470, w: 390, h: 260, name: "SHOPPING MALL", color: "#475569" },
  { x: 2780, y: 470, w: 330, h: 260, name: "OFFICES", color: "#64748b" },
  { x: 470, y: 790, w: 330, h: 280, name: "SCHOOL", color: "#a16207" },
  { x: 1040, y: 790, w: 390, h: 280, name: "GARAGE", color: "#0e7490" },
  { x: 2040, y: 790, w: 390, h: 280, name: "CAR DEALER", color: "#0369a1" },
  { x: 2780, y: 790, w: 330, h: 280, name: "HOTEL", color: "#7c3aed" },
  { x: 470, y: 1510, w: 330, h: 280, name: "CAR WASH", color: "#0284c7" },
  { x: 1040, y: 1510, w: 390, h: 280, name: "SERVICE BAY", color: "#b45309" },
  { x: 2040, y: 1510, w: 390, h: 280, name: "FUEL STOP", color: "#15803d" },
  { x: 2780, y: 1510, w: 330, h: 280, name: "CHALLENGE HUB", color: "#be123c" },
  { x: 470, y: 1870, w: 330, h: 220, name: "WAREHOUSE", color: "#57534e" },
  { x: 1040, y: 1870, w: 390, h: 220, name: "PARKING", color: "#475569" },
  { x: 2040, y: 1870, w: 390, h: 220, name: "RACE CLUB", color: "#9f1239" },
  { x: 2780, y: 1870, w: 330, h: 220, name: "AIRPORT OFFICE", color: "#475569" }
];

// Service markers are placed directly on drivable road surfaces.
const LOCATIONS = [
  { x: 960, y: 1300, name: "GARAGE", type: "repair", color: "#38bdf8", symbol: "G" },
  { x: 1940, y: 1140, name: "CITY CENTER", color: "#facc15", symbol: "C" },
  { x: 2640, y: 1420, name: "FUEL STOP", type: "fuel", color: "#4ade80", symbol: "F" },
  { x: 970, y: 1420, name: "CAR WASH", color: "#7dd3fc", symbol: "W" },
  { x: 1940, y: 1420, name: "CHALLENGE HUB", color: "#fb7185", symbol: "?" },
  { x: 2670, y: 1140, name: "DEALERSHIP", color: "#c4b5fd", symbol: "D" }
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function isOnRoad(x, y) {
  return ROADS.some((r) =>
    x >= r.x && x <= r.x + r.w &&
    y >= r.y && y <= r.y + r.h
  );
}

export function collidesWithWorld(x, y, radius = 18) {
  if (
    x - radius < 35 || y - radius < 35 ||
    x + radius > WORLD.width - 35 ||
    y + radius > WORLD.height - 35
  ) return true;

  return BUILDINGS.some((b) => {
    const nearestX = clamp(x, b.x, b.x + b.w);
    const nearestY = clamp(y, b.y, b.y + b.h);
    const dx = x - nearestX;
    const dy = y - nearestY;
    return dx * dx + dy * dy < radius * radius;
  });
}

function screenRect(ctx, project, x, y, w, h) {
  const p = project(x, y);
  ctx.fillRect(p.x, p.y, w * p.scale, h * p.scale);
}

export function drawMap(ctx, project, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#287447";
  ctx.fillRect(0, 0, width, height);

  const origin = project(0, 0);
  const scale = origin.scale;

  ctx.strokeStyle = "rgba(220,252,231,.09)";
  ctx.lineWidth = 1;
  const grid = 100 * scale;
  if (grid > 8) {
    for (let x = origin.x % grid; x < width; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = origin.y % grid; y < height; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }

  ROADS.forEach((road) => {
    const p = project(road.x, road.y);
    ctx.fillStyle = "#334155";
    ctx.fillRect(p.x, p.y, road.w * scale, road.h * scale);
    ctx.strokeStyle = "rgba(226,232,240,.55)";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.setLineDash([24 * scale, 20 * scale]);
    ctx.beginPath();
    if (road.axis === "h") {
      const cy = p.y + road.h * scale / 2;
      ctx.moveTo(p.x, cy);
      ctx.lineTo(p.x + road.w * scale, cy);
    } else {
      const cx = p.x + road.w * scale / 2;
      ctx.moveTo(cx, p.y);
      ctx.lineTo(cx, p.y + road.h * scale);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  const crosswalks = [
    { x: 1650, y: 1190, w: 12, h: 220 },
    { x: 1870, y: 1190, w: 12, h: 220 },
    { x: 850, y: 1190, w: 12, h: 220 },
    { x: 2520, y: 1190, w: 12, h: 220 }
  ];
  ctx.fillStyle = "rgba(248,250,252,.72)";
  crosswalks.forEach((c) => {
    for (let i = 0; i < 5; i++) {
      screenRect(ctx, project, c.x + i * 18, c.y, c.w, c.h);
    }
  });

  BUILDINGS.forEach((b) => {
    const p = project(b.x, b.y);
    const bw = b.w * scale;
    const bh = b.h * scale;
    ctx.fillStyle = "rgba(15,23,42,.28)";
    ctx.fillRect(p.x + 7 * scale, p.y + 9 * scale, bw, bh);
    ctx.fillStyle = b.color;
    ctx.fillRect(p.x, p.y, bw, bh);
    ctx.fillStyle = "rgba(255,255,255,.13)";
    ctx.fillRect(p.x + 8 * scale, p.y + 8 * scale, bw - 16 * scale, 12 * scale);
    ctx.strokeStyle = "rgba(15,23,42,.65)";
    ctx.lineWidth = Math.max(1, 3 * scale);
    ctx.strokeRect(p.x, p.y, bw, bh);

    if (scale > 0.22) {
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold " + Math.max(8, 13 * scale) + "px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.name, p.x + bw / 2, p.y + bh / 2, Math.max(30, bw - 14 * scale));
    }
  });

  LOCATIONS.forEach((loc) => {
    const p = project(loc.x, loc.y);
    const r = Math.max(7, 17 * scale);
    ctx.beginPath();
    ctx.fillStyle = "rgba(15,23,42,.75)";
    ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = loc.color;
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold " + Math.max(9, 13 * scale) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(loc.symbol, p.x, p.y + 1);
    if (scale > 0.25) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.max(8, 11 * scale) + "px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(loc.name, p.x, p.y + r + 5, 110 * scale);
    }
  });

  const topLeft = project(0, 0);
  ctx.strokeStyle = "#bbf7d0";
  ctx.lineWidth = 5;
  ctx.strokeRect(topLeft.x, topLeft.y, WORLD.width * scale, WORLD.height * scale);
}

export function nearbyChallenge(x, y, radius = 175) {
  const dx = x - 1940;
  const dy = y - 1420;
  return dx * dx + dy * dy <= radius * radius
    ? { x: 1940, y: 1420, name: "CHALLENGE HUB", type: "challenge" }
    : null;
}

export function nearbyService(x, y, radius = 165) {
  for (const location of LOCATIONS) {
    if (!location.type) continue;
    const dx = x - location.x;
    const dy = y - location.y;
    if (dx * dx + dy * dy <= radius * radius) return location;
  }
  return null;
}
