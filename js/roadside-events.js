// --------------------------------------------------
// Grammar Drive — individualized roadside encounters
// Visual-only road hazards: they never enter vehicle collision physics.
// --------------------------------------------------

const CANDIDATES = [
  { x: 650, y: 305 }, { x: 1450, y: 305 }, { x: 2850, y: 305 },
  { x: 650, y: 1300 }, { x: 2850, y: 1300 },
  { x: 650, y: 2295 }, { x: 1450, y: 2295 }, { x: 2850, y: 2295 },
  { x: 305, y: 650 }, { x: 305, y: 1850 },
  { x: 975, y: 650 }, { x: 975, y: 1850 },
  { x: 1800, y: 650 }, { x: 1800, y: 1850 },
  { x: 2640, y: 650 }, { x: 2640, y: 1850 },
  { x: 3295, y: 650 }, { x: 3295, y: 1850 }
];

function seededRandom(seedText) {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6D2B79F5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRoadsideEvents(seedText) {
  const random = seededRandom(String(seedText || "road-trip"));
  const points = CANDIDATES.slice();
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }
  return points.slice(0, 7).map((point, index) => ({
    id: "roadside-" + index,
    x: point.x,
    y: point.y
  }));
}

export function nearbyRoadsideEvent(x, y, events, cleared, radius = 78) {
  let nearest = null;
  let best = radius * radius;
  for (const event of events || []) {
    if (cleared && cleared.has(event.id)) continue;
    const dx = x - event.x;
    const dy = y - event.y;
    const distance = dx * dx + dy * dy;
    if (distance <= best) {
      best = distance;
      nearest = event;
    }
  }
  return nearest;
}

export function drawRoadsideEvents(ctx, project, events, cleared) {
  for (const event of events || []) {
    if (cleared && cleared.has(event.id)) continue;
    const p = project(event.x, event.y);
    const scale = p.scale;
    const size = Math.max(7, 13 * scale);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(245,158,11,.18)";
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.moveTo(-size, size);
    ctx.lineTo(0, -size);
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#fff7ed";
    ctx.lineWidth = Math.max(1, scale * 1.5);
    ctx.stroke();
    ctx.fillStyle = "#7c2d12";
    ctx.font = "900 " + Math.max(8, size) + "px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", 0, size * .25);
    ctx.restore();
  }
}
