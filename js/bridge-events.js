// --------------------------------------------------
// Grammar Drive — individualized bridge repair event
// Bridge barriers are local to each player and separate from map geometry.
// --------------------------------------------------

const BRIDGE_SITES = [
  { x: 1800, y: 650, axis: "vertical", exit: { x: 1800, y: 900 } },
  { x: 1800, y: 1850, axis: "vertical", exit: { x: 1800, y: 2100 } },
  { x: 650, y: 1300, axis: "horizontal", exit: { x: 900, y: 1300 } },
  { x: 2850, y: 1300, axis: "horizontal", exit: { x: 3100, y: 1300 } }
];

export function createBridge(seedText) {
  const text = String(seedText || "bridge");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const site = BRIDGE_SITES[(hash >>> 0) % BRIDGE_SITES.length];
  return { ...site, exit: { ...site.exit }, id: "bridge-" + ((hash >>> 0).toString(36)), repaired: false };
}

export function nearbyBridge(x, y, bridge, radius = 145) {
  if (!bridge || bridge.repaired) return false;
  const dx = x - bridge.x;
  const dy = y - bridge.y;
  return dx * dx + dy * dy <= radius * radius;
}

export function isBridgeBlocked(x, y, radius, bridge) {
  if (!bridge || bridge.repaired) return false;
  const halfWidth = 88 + (Number(radius) || 18);
  const halfDepth = 13 + (Number(radius) || 18);
  return bridge.axis === "vertical"
    ? Math.abs(x - bridge.x) <= halfWidth && Math.abs(y - bridge.y) <= halfDepth
    : Math.abs(y - bridge.y) <= halfWidth && Math.abs(x - bridge.x) <= halfDepth;
}

export function drawBridge(ctx, project, bridge) {
  if (!bridge) return;
  const p = project(bridge.x, bridge.y);
  const scale = p.scale;
  const half = 76 * scale;
  const depth = Math.max(7, 12 * scale);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (bridge.axis === "horizontal") ctx.rotate(Math.PI / 2);
  ctx.fillStyle = bridge.repaired ? "#92400e" : "#7f1d1d";
  ctx.fillRect(-half, -depth, half * 2, depth * 2);
  ctx.fillStyle = bridge.repaired ? "#fbbf24" : "#f59e0b";
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(i * half * .34 - Math.max(1, scale), -depth, Math.max(2, scale * 2), depth * 2);
  }
  ctx.strokeStyle = bridge.repaired ? "#86efac" : "#fecaca";
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.strokeRect(-half, -depth, half * 2, depth * 2);
  if (!bridge.repaired) {
    ctx.strokeStyle = "#fff7ed";
    ctx.lineWidth = Math.max(2, 4 * scale);
    ctx.beginPath();
    ctx.moveTo(-half * .55, -depth * 1.5);
    ctx.lineTo(half * .55, depth * 1.5);
    ctx.moveTo(-half * .55, depth * 1.5);
    ctx.lineTo(half * .55, -depth * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}
