// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/vehicle.js — Phase 4A/4B/4D driving physics and vehicle condition
// --------------------------------------------------

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const HANDLING = Object.freeze({
 compact:{roadMax:440,offRoadMax:185,acceleration:390,steering:1.15,grip:1,radius:19},
 sport:{roadMax:520,offRoadMax:205,acceleration:470,steering:1.25,grip:1.08,radius:19},
 suv:{roadMax:385,offRoadMax:225,acceleration:330,steering:.95,grip:.86,radius:21},
 truck:{roadMax:330,offRoadMax:205,acceleration:260,steering:.72,grip:.78,radius:24},
 motorcycle:{roadMax:500,offRoadMax:145,acceleration:430,steering:1.42,grip:.82,radius:14},
 bicycle:{roadMax:175,offRoadMax:115,acceleration:125,steering:1.05,grip:.9,radius:12},
 jeep:{roadMax:390,offRoadMax:265,acceleration:340,steering:.92,grip:.9,radius:21},
 police:{roadMax:470,offRoadMax:185,acceleration:420,steering:1.18,grip:1.02,radius:20}
});

export function createVehicle(x, y, angle = 0) {
  return {
    x, y, a: angle, s: 0,
    steerInput: 0,
    fuel: 100,
    condition: 100,
    model: "compact",
    collided: false,
    onRoad: true,
    safeX: x,
    safeY: y
  };
}

export function updateVehicle(car, keys, dt, world) {
  if (!car || !world || dt <= 0) return;

  const handling = HANDLING[car.model] || HANDLING.compact;
  const onRoadBefore = world.isOnRoad(car.x, car.y);
  const targetSteer = Number.isFinite(keys.steer) && keys.steer !== 0
    ? clamp(keys.steer, -1, 1)
    : (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  // Steering builds up and settles smoothly instead of reacting instantly.
  const steeringResponse = Math.min(1, dt * 5.5);
  car.steerInput = (Number.isFinite(car.steerInput) ? car.steerInput : 0) +
    (targetSteer - (Number.isFinite(car.steerInput) ? car.steerInput : 0)) * steeringResponse;
  const steer = car.steerInput;

  const conditionFactor = car.condition < 35
    ? 0.55 + (car.condition / 35) * 0.25
    : 1;
  const roadMax = handling.roadMax * conditionFactor;
  const offRoadMax = handling.offRoadMax * conditionFactor;
  const maxSpeed = onRoadBefore ? roadMax : offRoadMax;
  const acceleration = (onRoadBefore ? handling.acceleration : handling.acceleration * 0.59) * conditionFactor;
  const braking = 900;
  const reverseAcceleration = car.model === "bicycle" ? 75 : 300;
  const reverseMax = car.model === "bicycle" ? 45 : 150;

  // Brake slows the vehicle to a stop. Reverse is a separate control.
  if (keys.brake) {
    if (car.s > 0) car.s = Math.max(0, car.s - braking * dt);
    else if (car.s < 0) car.s = Math.min(0, car.s + braking * dt);
  } else if (keys.reverse) {
    if (car.s > 0) car.s = Math.max(0, car.s - braking * dt);
    else car.s -= reverseAcceleration * conditionFactor * dt;
  } else if (keys.gas) {
    car.s += acceleration * dt;
  } else {
    car.s *= Math.pow(onRoadBefore ? 0.986 : 0.955, dt * 60);
  }

  car.s = clamp(car.s, -reverseMax, maxSpeed);
  if (Math.abs(car.s) < 1.5) car.s = 0;

  if (steer && Math.abs(car.s) > 3) {
    const speedFactor = clamp(Math.abs(car.s) / 160, 0.18, 1);
    const grip = (onRoadBefore ? 1 : 0.55) * handling.grip;
    car.a += steer * Math.sign(car.s) * speedFactor * grip * handling.steering * dt;
  }

  const nextX = car.x + Math.cos(car.a) * car.s * dt;
  const nextY = car.y + Math.sin(car.a) * car.s * dt;
  const hit = world.collidesWithWorld(nextX, nextY, handling.radius || 19);

  if (hit) {
    if (!car.collided && Math.abs(car.s) > 20) {
      const impactDamage = Math.min(25, Math.max(8, Math.abs(car.s) / 18));
      car.condition = clamp(car.condition - impactDamage, 0, 100);
      car.lastEvent = "collision";
    }
    car.x = Number.isFinite(car.safeX) ? car.safeX : car.x;
    car.y = Number.isFinite(car.safeY) ? car.safeY : car.y;
    car.collided = true;
    car.s = -Math.sign(car.s || 1) * Math.min(55, Math.abs(car.s) * 0.25);
  } else {
    car.collided = false;
    car.x = nextX;
    car.y = nextY;
    car.safeX = car.x;
    car.safeY = car.y;
  }

  car.onRoad = world.isOnRoad(car.x, car.y);
  if (!car.onRoad) car.s *= Math.pow(0.992, dt * 60);
  car.condition = clamp(car.condition, 0, 100);
}

export function refuelVehicle(car) {
  if (!car) return;
  car.fuel = 100;
  car.s = 0;
  car.lastEvent = "refueled";
}

export function repairVehicle(car) {
  if (!car) return;
  car.condition = 100;
  car.s = 0;
  car.lastEvent = "repaired";
}
