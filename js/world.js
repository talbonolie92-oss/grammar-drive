// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/world.js — Phase 4A map, roads, locations and collision geometry
// --------------------------------------------------

export const WORLD = Object.freeze({ width: 6000, height: 4400 });

const ROADS = [
  { x: 200, y: 250, w: 5600, h: 150, axis: "h" },
  { x: 200, y: 1250, w: 5600, h: 150, axis: "h" },
  { x: 200, y: 2250, w: 5600, h: 150, axis: "h" },
  { x: 200, y: 3250, w: 5600, h: 150, axis: "h" },
  { x: 200, y: 4050, w: 5600, h: 150, axis: "h" },
  { x: 200, y: 250, w: 150, h: 3950, axis: "v" },
  { x: 1500, y: 250, w: 150, h: 3950, axis: "v" },
  { x: 2800, y: 250, w: 150, h: 3950, axis: "v" },
  { x: 4100, y: 250, w: 150, h: 3950, axis: "v" },
  { x: 5400, y: 250, w: 150, h: 3950, axis: "v" }
];

const BUILDINGS = [
  { x: 380, y: 450, w: 900, h: 650, name: "CITY HALL", color: "#64748b" },
  { x: 1680, y: 450, w: 900, h: 650, name: "GRAND HOTEL", color: "#7c3aed" },
  { x: 380, y: 1450, w: 900, h: 650, name: "COURTHOUSE", color: "#475569" },
  { x: 1680, y: 1450, w: 900, h: 650, name: "CITY CENTER", color: "#0369a1" },
  { x: 2980, y: 450, w: 900, h: 650, name: "HIGH SCHOOL", color: "#a16207" },
  { x: 4280, y: 450, w: 900, h: 650, name: "UNIVERSITY", color: "#0e7490" },
  { x: 2980, y: 1450, w: 900, h: 650, name: "CITY LIBRARY", color: "#15803d" },
  { x: 4280, y: 1450, w: 900, h: 650, name: "SPORTS ARENA", color: "#7c3aed" },
  { x: 380, y: 2450, w: 900, h: 650, name: "SHOPPING MALL", color: "#475569" },
  { x: 1680, y: 2450, w: 900, h: 650, name: "FRESH MARKET", color: "#15803d" },
  { x: 380, y: 3450, w: 900, h: 500, name: "CAR DEALER", color: "#0369a1" },
  { x: 1680, y: 3450, w: 900, h: 500, name: "GARAGE", color: "#0e7490" },
  { x: 2980, y: 2450, w: 900, h: 650, name: "WAREHOUSE", color: "#57534e" },
  { x: 2980, y: 3450, w: 900, h: 500, name: "FACTORY", color: "#78716c" },
  { x: 4280, y: 2450, w: 900, h: 650, name: "RACE CLUB", color: "#9f1239" },
  { x: 4280, y: 3450, w: 900, h: 500, name: "COUNTRY CLUB", color: "#166534" }
];

const DISTRICTS = [
  { x: 350, y: 390, w: 2300, h: 1740, name: "DOWNTOWN CITY", labelX: 1500, labelY: 1180, fill: "rgba(59,130,246,.055)", edge: "rgba(147,197,253,.35)" },
  { x: 2950, y: 390, w: 2300, h: 1740, name: "SCHOOL DISTRICT", labelX: 4100, labelY: 1180, fill: "rgba(245,158,11,.055)", edge: "rgba(253,230,138,.35)" },
  { x: 350, y: 2390, w: 2300, h: 1640, name: "SHOPPING DISTRICT", labelX: 1500, labelY: 3180, fill: "rgba(236,72,153,.05)", edge: "rgba(249,168,212,.32)" },
  { x: 2950, y: 2390, w: 1000, h: 1640, name: "INDUSTRIAL DISTRICT", labelX: 3450, labelY: 3180, fill: "rgba(148,163,184,.07)", edge: "rgba(203,213,225,.32)" },
  { x: 4250, y: 2390, w: 1000, h: 1640, name: "COUNTRYSIDE & RACE ZONE", labelX: 4750, labelY: 3180, fill: "rgba(34,197,94,.06)", edge: "rgba(134,239,172,.35)" }
];

// Service markers are placed directly on drivable road surfaces.
const LOCATIONS = [
  { x: 1500, y: 1325, name: "GARAGE", type: "repair", color: "#38bdf8", symbol: "G" },
  { x: 2800, y: 2325, name: "CITY CENTER", color: "#facc15", symbol: "C" },
  { x: 1500, y: 2325, name: "CAR WASH", type: "repair", color: "#7dd3fc", symbol: "W" },
  { x: 4100, y: 2325, name: "CITY DISPATCH", color: "#fb7185", symbol: "D" },
  { x: 1500, y: 3325, name: "CAR SHOP", type: "shop", color: "#c4b5fd", symbol: "S" },
  { x: 4750, y: 3325, name: "RACE CLUB", type: "race", color: "#fb7185", symbol: "R" }
];

// Roadside grammar stops turn exploration into short learning encounters.
const GRAMMAR_STOPS = [
  { x: 1500, y: 325, name: "GRAMMAR CHECKPOINT 1" },
  { x: 2800, y: 1325, name: "GRAMMAR CHECKPOINT 2" },
  { x: 4100, y: 1325, name: "GRAMMAR CHECKPOINT 3" },
  { x: 5400, y: 2325, name: "GRAMMAR CHECKPOINT 4" },
  { x: 4100, y: 3325, name: "GRAMMAR CHECKPOINT 5" },
  { x: 2800, y: 3325, name: "GRAMMAR CHECKPOINT 6" },
  { x: 1500, y: 3325, name: "GRAMMAR CHECKPOINT 7" },
  { x: 200, y: 2325, name: "GRAMMAR CHECKPOINT 8" }
];

// Decorative greenery and small park-entry gates, kept clear of roads and services.
const TREES = [
  [1360, 470], [1400, 700], [1360, 930], [1360, 1530], [1400, 1760], [1360, 1980],
  [2660, 470], [2660, 900], [2660, 1530], [2660, 1950],
  [3960, 470], [3960, 900], [3960, 1530], [3960, 1950],
  [5260, 470], [5260, 900], [5260, 1530], [5260, 1950],
  [480, 2380], [800, 2380], [1150, 2380], [1800, 2380], [2200, 2380],
  [480, 4020], [800, 4020], [1150, 4020], [1800, 4020], [2200, 4020],
  [3100, 2380], [3600, 2380], [3100, 4020], [3600, 4020],
  [4400, 2380], [4900, 2380], [4400, 4020], [4900, 4020]
];

const PARK_GATES = [
  { x: 1450, y: 2325, width: 145, label: "CITY PARK" },
  { x: 4750, y: 2250, width: 145, label: "RACEWAY GATE" }
];

function drawTree(ctx, project, x, y) {
  const p = project(x, y);
  const s = p.scale;
  const r = Math.max(3, 22 * s);

  // Soft ground shadow and visible trunk make the canopy feel raised.
  ctx.fillStyle = "rgba(15,23,42,.24)";
  ctx.beginPath();
  ctx.ellipse(p.x + 5 * s, p.y + 9 * s, r * 1.12, r * .62, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#854d0e";
  ctx.fillRect(p.x - 4 * s, p.y - 2 * s, 8 * s, 17 * s);

  ctx.fillStyle = "#14532d";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 7 * s, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#166534";
  ctx.beginPath();
  ctx.arc(p.x - 8 * s, p.y - 12 * s, r * .72, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(p.x + 7 * s, p.y - 14 * s, r * .58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(187,247,208,.48)";
  ctx.beginPath();
  ctx.arc(p.x - 7 * s, p.y - 20 * s, r * .2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(5,46,22,.65)";
  ctx.lineWidth = Math.max(.7, 1.5 * s);
  ctx.beginPath();
  ctx.arc(p.x, p.y - 7 * s, r, 0, Math.PI * 2);
  ctx.stroke();
}

const STREETLIGHTS = [
  [620,390,0],[1950,390,0],[3250,390,0],[4550,390,0],
  [620,4190,0],[1950,4190,0],[3250,4190,0],[4550,4190,0],
  [820,1170,1],[2120,1170,1],[3420,1170,1],[4720,1170,1],
  [820,2170,1],[2120,2170,1],[3420,2170,1],[4720,2170,1],
  [820,3170,1],[2120,3170,1],[3420,3170,1],[4720,3170,1]
];
const GRASS_PATCHES = [
  [500,390,750,42],[1800,390,750,42],[3100,390,750,42],[4400,390,750,42],
  [500,4190,750,42],[1800,4190,750,42],[3100,4190,750,42],[4400,4190,750,42],
  [1360,500,90,580],[2660,500,90,580],[3960,500,90,580],[5260,500,90,580],
  [1360,2500,90,500],[2660,2500,90,500],[3960,2500,90,500],[5260,2500,90,500]
];
function drawStreetlight(ctx,project,x,y,vertical=false){const p=project(x,y),s=p.scale;ctx.save();ctx.strokeStyle="#334155";ctx.lineWidth=Math.max(2,4*s);ctx.beginPath();ctx.moveTo(p.x,p.y+7*s);ctx.lineTo(p.x,p.y-25*s);ctx.lineTo(p.x+(vertical?0:16*s),p.y-32*s);ctx.stroke();ctx.fillStyle="rgba(250,204,21,.16)";ctx.beginPath();ctx.arc(p.x+(vertical?0:16*s),p.y-32*s,13*s,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fde68a";ctx.beginPath();ctx.arc(p.x+(vertical?0:16*s),p.y-32*s,4*s,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawParkedPoliceCar(ctx,project,x,y){const p=project(x,y),s=p.scale,w=48*s,h=25*s;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle="rgba(0,0,0,.3)";ctx.fillRect(-w/2+3*s,-h/2+4*s,w,h);ctx.fillStyle="#f8fafc";ctx.fillRect(-w/2,-h/2,w,h);ctx.fillStyle="#1e3a8a";ctx.fillRect(-w/2,-h/2,w*.32,h);ctx.fillRect(w*.18,-h/2,w*.32,h);ctx.fillStyle="#1e293b";ctx.fillRect(-w*.12,-h*.38,w*.42,h*.76);ctx.fillStyle="#ef4444";ctx.fillRect(-5*s,-h*.62,6*s,4*s);ctx.fillStyle="#3b82f6";ctx.fillRect(1*s,-h*.62,6*s,4*s);ctx.fillStyle="#0f172a";ctx.font="bold "+Math.max(5,7*s)+"px system-ui";ctx.textAlign="center";ctx.fillText("POLICE",0,h*.12);ctx.restore();}
function drawParkGate(ctx, project, gate) {
  const p = project(gate.x, gate.y);
  const s = p.scale;
  const half = gate.width * s / 2;
  const postW = Math.max(3, 10 * s);
  const postH = Math.max(5, 28 * s);

  // Two stone pillars, a timber crossbar and small gold caps.
  ctx.fillStyle = "rgba(15,23,42,.28)";
  ctx.fillRect(p.x - half - postW / 2 + 2 * s, p.y - postH / 2 + 3 * s, postW, postH);
  ctx.fillRect(p.x + half - postW / 2 + 2 * s, p.y - postH / 2 + 3 * s, postW, postH);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(p.x - half - postW / 2, p.y - postH / 2, postW, postH);
  ctx.fillRect(p.x + half - postW / 2, p.y - postH / 2, postW, postH);
  ctx.fillStyle = "#92400e";
  ctx.fillRect(p.x - half, p.y - postH / 2 + 2 * s, half * 2, Math.max(3, 7 * s));
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(p.x - half - postW / 2 - 2 * s, p.y - postH / 2 - 3 * s, postW + 4 * s, Math.max(3, 5 * s));
  ctx.fillRect(p.x + half - postW / 2 - 2 * s, p.y - postH / 2 - 3 * s, postW + 4 * s, Math.max(3, 5 * s));

  if (s > .24) {
    ctx.fillStyle = "#fff7ed";
    ctx.font = "bold " + Math.max(6, 9 * s) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(gate.label, p.x, p.y - postH / 2 - 5 * s);
  }
}

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

  DISTRICTS.forEach((district) => {
    const p = project(district.x, district.y);
    const label = project(district.labelX, district.labelY);
    ctx.fillStyle = district.fill;
    ctx.fillRect(p.x, p.y, district.w * p.scale, district.h * p.scale);
    ctx.strokeStyle = district.edge;
    ctx.lineWidth = Math.max(1, 2 * p.scale);
    ctx.strokeRect(p.x, p.y, district.w * p.scale, district.h * p.scale);
    ctx.fillStyle = "rgba(15,23,42,.55)";
    ctx.fillRect(label.x - 170 * label.scale, label.y - 19 * label.scale, 340 * label.scale, 34 * label.scale);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 " + Math.max(9, 19 * label.scale) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(district.name, label.x, label.y);
  });

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
    const rw = road.w * scale;
    const rh = road.h * scale;

    // Wide concrete sidewalks and a subtle curb make the road feel built into a city.
    ctx.fillStyle = "#b8b8a6";
    ctx.fillRect(p.x - 5 * scale, p.y - 5 * scale, rw + 10 * scale, rh + 10 * scale);
    ctx.fillStyle = "#3b4858";
    ctx.fillRect(p.x, p.y, rw, rh);
    ctx.fillStyle = "rgba(255,255,255,.08)";
    if (road.axis === "h") {
      ctx.fillRect(p.x, p.y + 5 * scale, rw, 3 * scale);
      ctx.fillRect(p.x, p.y + rh - 8 * scale, rw, 3 * scale);
    } else {
      ctx.fillRect(p.x + 5 * scale, p.y, 3 * scale, rh);
      ctx.fillRect(p.x + rw - 8 * scale, p.y, 3 * scale, rh);
    }

    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = Math.max(1, 1.5 * scale);
    ctx.setLineDash([25 * scale, 22 * scale]);
    ctx.beginPath();
    if (road.axis === "h") {
      const cy = p.y + rh / 2;
      ctx.moveTo(p.x, cy);
      ctx.lineTo(p.x + rw, cy);
    } else {
      const cx = p.x + rw / 2;
      ctx.moveTo(cx, p.y);
      ctx.lineTo(cx, p.y + rh);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Short edge reflectors add definition without distracting from driving.
    if (scale > 0.22) {
      ctx.fillStyle = "rgba(248,250,252,.32)";
      const step = Math.max(24, 70 * scale);
      if (road.axis === "h") {
        for (let x = p.x + 18 * scale; x < p.x + rw; x += step) {
          ctx.fillRect(x, p.y + 4 * scale, 8 * scale, 2 * scale);
          ctx.fillRect(x, p.y + rh - 6 * scale, 8 * scale, 2 * scale);
        }
      } else {
        for (let y = p.y + 18 * scale; y < p.y + rh; y += step) {
          ctx.fillRect(p.x + 4 * scale, y, 2 * scale, 8 * scale);
          ctx.fillRect(p.x + rw - 6 * scale, y, 2 * scale, 8 * scale);
        }
      }
    }
  });

  GRASS_PATCHES.forEach(([x,y,w,h])=>{const p=project(x,y);ctx.fillStyle="rgba(134,239,172,.13)";ctx.fillRect(p.x,p.y,w*scale,h*scale);ctx.strokeStyle="rgba(187,247,208,.12)";ctx.lineWidth=Math.max(1,scale);ctx.strokeRect(p.x,p.y,w*scale,h*scale);});
  STREETLIGHTS.forEach(([x,y,vertical])=>drawStreetlight(ctx,project,x,y,!!vertical));
  TREES.forEach(([x,y])=>drawTree(ctx,project,x,y));
  drawParkedPoliceCar(ctx,project,3050,1180);
  PARK_GATES.forEach((gate) => drawParkGate(ctx, project, gate));

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

  BUILDINGS.forEach((b, buildingIndex) => {
    const p = project(b.x, b.y);
    const bw = b.w * scale;
    const bh = b.h * scale;
    const depth = Math.max(3, 12 * scale);
    const trim = Math.max(1, 3 * scale);
    const columns = Math.max(3, Math.floor(b.w / 76));
    const rows = b.h > 245 ? 3 : 2;
    const windowW = Math.max(4, 22 * scale);
    const windowH = Math.max(4, 17 * scale);
    const roofColors = ["#e2e8f0", "#d6d3d1", "#cbd5e1", "#e5e7eb"];

    ctx.save();

    // Long shadow and visible side walls create a low-poly, raised building shape.
    ctx.fillStyle = "rgba(8,18,34,.28)";
    ctx.fillRect(p.x + depth * 1.7, p.y + depth * 1.9, bw, bh);
    ctx.fillStyle = "rgba(15,23,42,.38)";
    ctx.beginPath();
    ctx.moveTo(p.x + bw, p.y + 3 * scale);
    ctx.lineTo(p.x + bw + depth, p.y + depth);
    ctx.lineTo(p.x + bw + depth, p.y + bh + depth);
    ctx.lineTo(p.x + bw, p.y + bh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(15,23,42,.24)";
    ctx.beginPath();
    ctx.moveTo(p.x + 3 * scale, p.y + bh);
    ctx.lineTo(p.x + bw, p.y + bh);
    ctx.lineTo(p.x + bw + depth, p.y + bh + depth);
    ctx.lineTo(p.x + depth, p.y + bh + depth);
    ctx.closePath();
    ctx.fill();

    const facade = ctx.createLinearGradient(p.x, p.y, p.x + bw, p.y + bh);
    facade.addColorStop(0, b.color);
    facade.addColorStop(1, "#26374d");
    ctx.fillStyle = facade;
    ctx.fillRect(p.x, p.y, bw, bh);

    // Raised rooftop with parapet edges, roof panels, and small utility units.
    const roof = ctx.createLinearGradient(p.x, p.y, p.x + bw, p.y + bh);
    roof.addColorStop(0, roofColors[buildingIndex % roofColors.length]);
    roof.addColorStop(1, "#94a3b8");
    ctx.fillStyle = roof;
    ctx.fillRect(p.x + 5 * scale, p.y + 5 * scale, bw - 10 * scale, bh * .67);
    ctx.strokeStyle = "rgba(15,23,42,.62)";
    ctx.lineWidth = trim;
    ctx.strokeRect(p.x + 5 * scale, p.y + 5 * scale, bw - 10 * scale, bh * .67);

    // Roof texture: ventilation units, skylights, and access hatches.
    if (scale > 0.13) {
      ctx.fillStyle = "rgba(51,65,85,.5)";
      const unitW = Math.max(7, 34 * scale);
      const unitH = Math.max(5, 22 * scale);
      for (let unit = 0; unit < 2; unit++) {
        const ux = p.x + bw * (.18 + unit * .52);
        const uy = p.y + bh * (.18 + (buildingIndex % 2) * .12);
        ctx.fillRect(ux, uy, unitW, unitH);
        ctx.fillStyle = "rgba(255,255,255,.45)";
        ctx.fillRect(ux + 2 * scale, uy + 2 * scale, unitW - 4 * scale, 2 * scale);
        ctx.fillStyle = "rgba(51,65,85,.5)";
      }
      ctx.fillStyle = "rgba(255,255,255,.42)";
      ctx.fillRect(p.x + bw * .42, p.y + bh * .58, bw * .16, Math.max(4, 15 * scale));
    }

    // Front facade strip, evenly spaced windows, and warm-lit ground floor.
    const facadeY = p.y + bh * .68;
    const facadeH = bh * .31;
    const facadeGradient = ctx.createLinearGradient(p.x, facadeY, p.x, p.y + bh);
    facadeGradient.addColorStop(0, "rgba(15,23,42,.18)");
    facadeGradient.addColorStop(1, "rgba(15,23,42,.52)");
    ctx.fillStyle = facadeGradient;
    ctx.fillRect(p.x + 4 * scale, facadeY, bw - 8 * scale, facadeH);
    if (scale > 0.15) {
      for (let col = 0; col < columns; col++) {
          const wx = p.x + (bw / (columns + 1)) * (col + 1) - windowW / 2;
          const wy = p.y + bh * .79;
          ctx.fillStyle = (col + buildingIndex) % 4 === 0
            ? "rgba(255,224,138,.92)"
            : "rgba(125,211,252,.86)";
          ctx.fillRect(wx, wy, windowW, windowH);
          ctx.strokeStyle = "rgba(15,23,42,.48)";
          ctx.lineWidth = Math.max(.7, scale);
          ctx.strokeRect(wx, wy, windowW, windowH);
          ctx.fillStyle = "rgba(255,255,255,.3)";
          ctx.fillRect(wx + 2 * scale, wy + 2 * scale, Math.max(1, 2 * scale), windowH - 4 * scale);
      }

      // Distinctive main entrance, glass doors, canopy, and steps.
      const doorW = bw * .18;
      const doorX = p.x + (bw - doorW) / 2;
      const doorY = p.y + bh - 34 * scale;
      ctx.fillStyle = "#182b40";
      ctx.fillRect(doorX, doorY, doorW, 29 * scale);
      ctx.fillStyle = "#8bd9ef";
      ctx.fillRect(doorX + 3 * scale, doorY + 3 * scale, doorW * .43, 22 * scale);
      ctx.fillRect(doorX + doorW * .54, doorY + 3 * scale, doorW * .4, 22 * scale);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(doorX - 5 * scale, doorY - 5 * scale, doorW + 10 * scale, 4 * scale);
      ctx.fillStyle = "rgba(15,23,42,.35)";
      ctx.fillRect(doorX - 4 * scale, doorY + 29 * scale, doorW + 8 * scale, 4 * scale);
    }

    // Signboard belongs to the building facade instead of floating as a text label.
    if (scale > 0.2) {
      const signW = Math.min(bw * .62, Math.max(54 * scale, b.name.length * 6 * scale));
      const signH = Math.max(10, 15 * scale);
      const signX = p.x + (bw - signW) / 2;
      const signY = p.y + bh * .69;
      ctx.fillStyle = "rgba(15,23,42,.82)";
      ctx.fillRect(signX, signY, signW, signH);
      ctx.strokeStyle = "rgba(255,255,255,.45)";
      ctx.lineWidth = Math.max(1, scale);
      ctx.strokeRect(signX, signY, signW, signH);
      ctx.fillStyle = "#fff";
      ctx.font = "900 " + Math.max(6, 8 * scale) + "px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.name, p.x + bw / 2, signY + signH / 2, signW - 6 * scale);
    }

    // Rooftop outline and corner highlights finish the building silhouette.
    ctx.strokeStyle = "rgba(255,255,255,.78)";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.strokeRect(p.x + 2 * scale, p.y + 2 * scale, bw - 4 * scale, bh - 4 * scale);
    ctx.fillStyle = "rgba(255,255,255,.32)";
    ctx.fillRect(p.x + 7 * scale, p.y + 7 * scale, bw - 14 * scale, Math.max(2, 3 * scale));

    ctx.restore();
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
  GRAMMAR_STOPS.forEach((stop, index) => {
    const p = project(stop.x, stop.y);
    const r = Math.max(8, 17 * scale);
    ctx.save();
    ctx.shadowColor = "rgba(15,23,42,.4)";
    ctx.shadowBlur = Math.max(2, 8 * scale);
    ctx.fillStyle = "#7c3aed";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ede9fe";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "900 " + Math.max(9, 13 * scale) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", p.x, p.y + 1);
    if (scale > .24) {
      ctx.font = "800 " + Math.max(7, 9 * scale) + "px system-ui";
      ctx.textBaseline = "top";
      ctx.fillText("GRAMMAR STOP " + (index + 1), p.x, p.y + r + 4, 120 * scale);
    }
    ctx.restore();
  });


  const topLeft = project(0, 0);
  ctx.strokeStyle = "#bbf7d0";
  ctx.lineWidth = 5;
  ctx.strokeRect(topLeft.x, topLeft.y, WORLD.width * scale, WORLD.height * scale);
}

export function nearbyChallenge(x, y, radius = 175) {
  const dx = x - 2800;
  const dy = y - 2325;
  return dx * dx + dy * dy <= radius * radius
    ? { x: 2800, y: 2325, name: "CITY CENTER", type: "challenge" }
    : null;
}

export function nearbyRace(x, y, radius = 190) {
  const dx = x - 4750;
  const dy = y - 3325;
  return dx * dx + dy * dy <= radius * radius
    ? { x: 4750, y: 3325, name: "RACE CLUB", type: "race" }
    : null;
}

export function nearbyDispatch(x, y, radius = 175) {
  const dx = x - 4100;
  const dy = y - 2325;
  return dx * dx + dy * dy <= radius * radius
    ? { x: 4100, y: 2325, name: "CITY DISPATCH", type: "dispatch" }
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


export function nearbyGrammarStop(x, y, radius = 150) {
  let nearest = null;
  let best = radius * radius;
  GRAMMAR_STOPS.forEach((stop, index) => {
    const dx = x - stop.x;
    const dy = y - stop.y;
    const distance = dx * dx + dy * dy;
    if (distance <= best) {
      best = distance;
      nearest = { ...stop, index, type: "grammar" };
    }
  });
  return nearest;
}
