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
  { x: 2040, y: 1510, w: 390, h: 280, name: "REST STOP", color: "#15803d" },
  { x: 2780, y: 1510, w: 330, h: 280, name: "CITY DISPATCH", color: "#be123c" },
  { x: 470, y: 1870, w: 330, h: 220, name: "WAREHOUSE", color: "#57534e" },
  { x: 1040, y: 1870, w: 390, h: 220, name: "PARKING", color: "#475569" },
  { x: 2040, y: 1870, w: 390, h: 220, name: "RACE CLUB", color: "#9f1239" },
  { x: 2780, y: 1870, w: 330, h: 220, name: "AIRPORT OFFICE", color: "#475569" }
];

// Service markers are placed directly on drivable road surfaces.
const LOCATIONS = [
  { x: 960, y: 1300, name: "GARAGE", type: "repair", color: "#38bdf8", symbol: "G" },
  { x: 1940, y: 1140, name: "CITY CENTER", color: "#facc15", symbol: "C" },
  { x: 970, y: 1420, name: "CAR WASH", color: "#7dd3fc", symbol: "W" },
  { x: 1940, y: 1420, name: "CITY DISPATCH", color: "#fb7185", symbol: "D" },
  { x: 2670, y: 1140, name: "CAR SHOP", type: "shop", color: "#c4b5fd", symbol: "S" }
];

// Roadside grammar stops turn exploration into short learning encounters.
const GRAMMAR_STOPS = [
  { x: 1725, y: 800, name: "GRAMMAR CHECKPOINT 1" },
  { x: 2580, y: 800, name: "GRAMMAR CHECKPOINT 2" },
  { x: 900, y: 2220, name: "GRAMMAR CHECKPOINT 3" },
  { x: 3220, y: 2220, name: "GRAMMAR CHECKPOINT 4" }
];

// Decorative greenery and small park-entry gates, kept clear of roads and services.
const TREES = [
  [1510, 455], [1625, 520], [1515, 650], [1635, 760], [1510, 900], [1620, 1045],
  [1510, 1515], [1630, 1600], [1515, 1745], [1625, 1850], [1510, 2025], [1635, 2110],
  [1955, 500], [1950, 900], [1955, 1570], [1950, 2020],
  [410, 430], [410, 1120], [410, 1460], [410, 2140],
  [3150, 430], [3150, 1120], [3150, 1460], [3150, 2140]
];

const PARK_GATES = [
  { x: 1450, y: 1135, width: 145, label: "CITY PARK" },
  { x: 2110, y: 1445, width: 145, label: "GARDEN" }
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

const STREETLIGHTS=[[620,390,0],[1280,390,0],[2210,390,0],[2920,390,0],[620,2180,0],[1280,2180,0],[2210,2180,0],[2920,2180,0],[820,1150,1],[1620,1150,1],[2480,1150,1],[3020,1150,1]];
const GRASS_PATCHES=[[520,390,170,42],[1120,390,190,42],[2070,390,180,42],[2800,390,190,42],[520,2140,170,42],[1120,2140,190,42],[2070,2140,180,42],[2800,2140,190,42],[1450,520,120,170],[1450,1580,120,160],[1980,520,90,160],[1980,1600,90,150]];
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
    ctx.fillRect(p.x + 5 * scale, p.y + 5 * scale, bw - 10 * scale, bh - 10 * scale);
    ctx.strokeStyle = "rgba(15,23,42,.62)";
    ctx.lineWidth = trim;
    ctx.strokeRect(p.x + 5 * scale, p.y + 5 * scale, bw - 10 * scale, bh - 10 * scale);

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
    ctx.fillStyle = "rgba(15,23,42,.18)";
    ctx.fillRect(p.x + 7 * scale, p.y + bh * .66, bw - 14 * scale, bh * .31);
    if (scale > 0.15) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const wx = p.x + (bw / (columns + 1)) * (col + 1) - windowW / 2;
          const wy = p.y + bh * (.24 + row * .19);
          ctx.fillStyle = (row + col + buildingIndex) % 4 === 0
            ? "rgba(255,224,138,.88)"
            : "rgba(125,211,252,.78)";
          ctx.fillRect(wx, wy, windowW, windowH);
          ctx.strokeStyle = "rgba(15,23,42,.48)";
          ctx.lineWidth = Math.max(.7, scale);
          ctx.strokeRect(wx, wy, windowW, windowH);
          ctx.fillStyle = "rgba(255,255,255,.3)";
          ctx.fillRect(wx + 2 * scale, wy + 2 * scale, Math.max(1, 2 * scale), windowH - 4 * scale);
        }
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
      const signW = Math.min(bw * .76, Math.max(62 * scale, b.name.length * 7 * scale));
      const signH = Math.max(13, 23 * scale);
      const signX = p.x + (bw - signW) / 2;
      const signY = p.y + bh * .49;
      ctx.fillStyle = "rgba(15,23,42,.82)";
      ctx.fillRect(signX, signY, signW, signH);
      ctx.strokeStyle = "rgba(255,255,255,.45)";
      ctx.lineWidth = Math.max(1, scale);
      ctx.strokeRect(signX, signY, signW, signH);
      ctx.fillStyle = "#fff";
      ctx.font = "900 " + Math.max(7, 11 * scale) + "px system-ui";
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
  const dx = x - 1940;
  const dy = y - 1420;
  return dx * dx + dy * dy <= radius * radius
    ? { x: 1940, y: 1420, name: "CITY DISPATCH", type: "challenge" }
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
