// --------------------------------------------------
// Grammar Drive — player-specific road loot
// Collectibles are render-only and never affect vehicle physics.
// --------------------------------------------------

const SPAWN_POINTS = [
  [520,305],[1120,305],[2050,305],[3000,305],
  [520,1300],[1120,1300],[2050,1300],[3000,1300],
  [520,2295],[1120,2295],[2050,2295],[3000,2295],
  [305,520],[305,1000],[305,1650],[305,2100],
  [975,520],[975,1000],[975,1650],[975,2100],
  [1800,520],[1800,1000],[1800,1650],[1800,2100],
  [2640,520],[2640,1000],[2640,1650],[2640,2100],
  [3295,520],[3295,1000],[3295,1650],[3295,2100]
];

function randomFor(seedText) {
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

export function createRoadLoot(seedText) {
  const random = randomFor(String(seedText || "road-loot"));
  const points = SPAWN_POINTS.slice();
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }
  return points.slice(0, 15).map(([x, y], index) => {
    const chest = index >= 11;
    return {
      id: "loot-" + index,
      x, y,
      type: chest ? "chest" : "coin",
      reward: chest ? 75 + Math.floor(random() * 51) : 8 + Math.floor(random() * 5)
    };
  });
}

export function nearbyRoadLoot(x, y, loot, collected, radius = 42) {
  let nearest = null;
  let best = radius * radius;
  for (const item of loot || []) {
    if (collected && collected.has(item.id)) continue;
    const dx = x - item.x;
    const dy = y - item.y;
    const distance = dx * dx + dy * dy;
    if (distance <= best) {
      best = distance;
      nearest = item;
    }
  }
  return nearest;
}

export function drawRoadLoot(ctx, project, loot, collected) {
  for (const item of loot || []) {
    if (collected && collected.has(item.id)) continue;
    const p = project(item.x, item.y);
    const scale = p.scale;
    const size = Math.max(6, 10 * scale);
    ctx.save();
    ctx.translate(p.x, p.y);
    if (item.type === "chest") {
      ctx.fillStyle = "rgba(250,204,21,.2)";
      ctx.beginPath();
      ctx.arc(0, 0, size * 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#92400e";
      ctx.fillRect(-size * 1.2, -size * .55, size * 2.4, size * 1.5);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-size * 1.2, -size * .7, size * 2.4, size * .5);
      ctx.fillRect(-size * .16, -size * .7, size * .32, size * 1.65);
      ctx.strokeStyle = "#fef3c7";
      ctx.lineWidth = Math.max(1, scale * 1.4);
      ctx.strokeRect(-size * 1.2, -size * .55, size * 2.4, size * 1.5);
    } else {
      ctx.fillStyle = "rgba(250,204,21,.2)";
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff7ae";
      ctx.lineWidth = Math.max(1, scale * 1.5);
      ctx.stroke();
      ctx.fillStyle = "#854d0e";
      ctx.font = "900 " + Math.max(7, size * 1.1) + "px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", 0, 1);
    }
    ctx.restore();
  }
}
