// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/vehicle.js — Phase 4A/4B/4D driving physics and vehicle condition
// --------------------------------------------------

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const HANDLING = Object.freeze({
  compact: { roadMax: 440, offRoadMax: 185, acceleration: 390, steering: 2.45, grip: 1, fuelUse: 0.75 },
  sport:   { roadMax: 520, offRoadMax: 205, acceleration: 470, steering: 2.7,  grip: 1.08, fuelUse: 0.9 },
  suv:     { roadMax: 385, offRoadMax: 225, acceleration: 330, steering: 2.05, grip: 0.86, fuelUse: 0.82 }
});

export function createVehicle(x, y, angle = 0) {
  return {
    x, y, a: angle, s: 0,
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
  const steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  const throttle = (keys.gas ? 1 : 0) - (keys.brake ? 1 : 0);

  const conditionFactor = car.condition < 35
    ? 0.55 + (car.condition / 35) * 0.25
    : 1;
  const roadMax = handling.roadMax * conditionFactor;
  const offRoadMax = handling.offRoadMax * conditionFactor;
  const maxSpeed = onRoadBefore ? roadMax : offRoadMax;
  const acceleration = (onRoadBefore ? handling.acceleration : handling.acceleration * 0.59) * conditionFactor;
  const braking = 650;

  if (throttle > 0 && car.fuel > 0) {
    car.s += acceleration * dt;
    car.fuel = clamp(car.fuel - handling.fuelUse * dt, 0, 100);
  } else if (throttle < 0) {
    car.s -= braking * dt;
  } else {
    car.s *= Math.pow(onRoadBefore ? 0.986 : 0.955, dt * 60);
  }

  if (car.fuel <= 0 && throttle > 0) {
    car.s *= Math.pow(0.965, dt * 60);
  }

  car.s = clamp(car.s, -Math.min(180, maxSpeed * 0.45), maxSpeed);
  if (Math.abs(car.s) < 1.5) car.s = 0;

  if (steer && Math.abs(car.s) > 3) {
    const speedFactor = clamp(Math.abs(car.s) / 120, 0.18, 1);
    const grip = (onRoadBefore ? 1 : 0.55) * handling.grip;
    car.a += steer * Math.sign(car.s) * speedFactor * grip * handling.steering * dt;
  }

  const nextX = car.x + Math.cos(car.a) * car.s * dt;
  const nextY = car.y + Math.sin(car.a) * car.s * dt;
  const hit = world.collidesWithWorld(nextX, nextY, car.model === "suv" ? 21 : 19);

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
  car.fuel = clamp(car.fuel, 0, 100);
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
