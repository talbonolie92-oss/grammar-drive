// --------------------------------------------------
// Grammar Drive: Open Road Challenge
// js/vehicle.js — Phase 4A driving physics
// --------------------------------------------------

import { WORLD } from "./world.js";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createVehicle(x, y, angle = 0) {
  return {
    x, y, a: angle, s: 0,
    fuel: 100,
    condition: 100,
    collided: false,
    onRoad: true
  };
}

export function updateVehicle(car, keys, dt, world) {
  if (!car || !world || dt <= 0) return;

  const onRoadBefore = world.isOnRoad(car.x, car.y);
  const steer = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  const throttle = (keys.gas ? 1 : 0) - (keys.brake ? 1 : 0);

  const roadMax = 440;
  const offRoadMax = 185;
  const maxSpeed = onRoadBefore ? roadMax : offRoadMax;
  const acceleration = onRoadBefore ? 390 : 230;
  const braking = 650;

  if (throttle > 0) car.s += acceleration * dt;
  else if (throttle < 0) car.s -= braking * dt;
  else car.s *= Math.pow(onRoadBefore ? 0.986 : 0.955, dt * 60);

  car.s = clamp(car.s, -Math.min(180, maxSpeed * 0.45), maxSpeed);
  if (Math.abs(car.s) < 1.5) car.s = 0;

  if (steer && Math.abs(car.s) > 3) {
    const speedFactor = clamp(Math.abs(car.s) / 120, 0.18, 1);
    const grip = onRoadBefore ? 1 : 0.55;
    car.a += steer * Math.sign(car.s) * speedFactor * grip * 2.45 * dt;
  }

  const nextX = car.x + Math.cos(car.a) * car.s * dt;
  const nextY = car.y + Math.sin(car.a) * car.s * dt;
  const hitX = world.collidesWithWorld(nextX, car.y, 19);
  const hitY = world.collidesWithWorld(car.x, nextY, 19);

  car.collided = false;
  if (hitX || hitY) {
    car.collided = true;
    car.s *= -0.18;
    if (hitX && !hitY) car.y = nextY;
    else if (hitY && !hitX) car.x = nextX;
  } else {
    car.x = nextX;
    car.y = nextY;
  }

  car.onRoad = world.isOnRoad(car.x, car.y);
  if (!car.onRoad) car.s *= Math.pow(0.992, dt * 60);

  // Fuel and condition are introduced in the next Phase 4 milestone.
  car.fuel = clamp(car.fuel ?? 100, 0, 100);
  car.condition = clamp(car.condition ?? 100, 0, 100);
}
