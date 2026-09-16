import { sub, dot, length, reflect, closestPointOnSegment } from "./vec.js";
import {
  BALL_RADIUS,
  FRICTION_PER_SEC,
  STOP_SPEED,
  WALL_RESTITUTION,
  BUMPER_RESTITUTION,
  MAX_SPEED_AFTER_BOUNCE,
  COLLISION_SUBSTEPS,
} from "./constants.js";

export class Ball {
  constructor(x, y, radius = BALL_RADIUS) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = radius;
    this.frozen = false; // true while held by a CACHE zone
  }

  get pos() {
    return { x: this.x, y: this.y };
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  get isMoving() {
    return !this.frozen && this.speed > STOP_SPEED;
  }

  launch(vx, vy) {
    this.vx = vx;
    this.vy = vy;
  }

  stop() {
    this.vx = 0;
    this.vy = 0;
  }

  teleportTo(x, y, { keepVelocity = true } = {}) {
    this.x = x;
    this.y = y;
    if (!keepVelocity) this.stop();
  }
}

/**
 * Resolve a circle (the ball) against a static line segment wall. Mutates
 * the ball's position/velocity in place if a collision occurred. Returns
 * true if a collision happened this call.
 */
function resolveWallCollision(ball, wall) {
  const { point } = closestPointOnSegment(ball.pos, { x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 });
  const delta = sub(ball.pos, point);
  const dist = length(delta);
  if (dist >= ball.radius || dist < 1e-9) return false;

  const normal = { x: delta.x / dist, y: delta.y / dist };
  // Push the ball back out of the wall so it doesn't get stuck inside it.
  const overlap = ball.radius - dist;
  ball.x += normal.x * overlap;
  ball.y += normal.y * overlap;

  const velocityIntoWall = dot({ x: ball.vx, y: ball.vy }, normal);
  if (velocityIntoWall < 0) {
    const reflected = reflect({ x: ball.vx, y: ball.vy }, normal);
    ball.vx = reflected.x * WALL_RESTITUTION;
    ball.vy = reflected.y * WALL_RESTITUTION;
    return true;
  }
  return false;
}

/** Same idea, but the obstacle is a circle (a BUG bumper) instead of a segment. */
function resolveBumperCollision(ball, bumper) {
  const delta = sub(ball.pos, bumper);
  const dist = length(delta);
  const minDist = ball.radius + bumper.radius;
  if (dist >= minDist || dist < 1e-9) return false;

  const normal = { x: delta.x / dist, y: delta.y / dist };
  const overlap = minDist - dist;
  ball.x += normal.x * overlap;
  ball.y += normal.y * overlap;

  const velocityIntoBumper = dot({ x: ball.vx, y: ball.vy }, normal);
  if (velocityIntoBumper < 0) {
    const reflected = reflect({ x: ball.vx, y: ball.vy }, normal);
    let vx = reflected.x * BUMPER_RESTITUTION;
    let vy = reflected.y * BUMPER_RESTITUTION;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_SPEED_AFTER_BOUNCE) {
      const scale = MAX_SPEED_AFTER_BOUNCE / speed;
      vx *= scale;
      vy *= scale;
    }
    ball.vx = vx;
    ball.vy = vy;
    return true;
  }
  return false;
}

/**
 * Advance the ball by dt seconds against the given walls/bumpers, applying
 * friction. Sub-steps the integration so a fast-moving ball can't tunnel
 * through a thin wall in one frame. Returns a list of collision events
 * ({type: "wall"|"bumper", cors, bumperId}) for the caller to react to
 * (sound, particles, "BLOCKED BY CORS" feedback, ...) — this module stays
 * DOM/audio-free and purely computes the physics.
 */
export function stepBall(ball, dt, { walls = [], bumpers = [] } = {}) {
  const events = [];
  if (ball.frozen) return events;

  // Substep count is adaptive: a fixed count is enough at normal shot
  // speeds, but an unusually fast ball (e.g. bumper chains stacking up)
  // could otherwise cover more than its own radius in one substep and hop
  // clean over a thin wall. Keep each substep's travel distance bounded by
  // the ball's radius, with a hard cap so a pathological speed can't blow
  // up the frame budget.
  const distanceThisFrame = ball.speed * dt;
  const neededSubsteps = Math.ceil(distanceThisFrame / Math.max(ball.radius, 1));
  const substeps = Math.min(64, Math.max(COLLISION_SUBSTEPS, neededSubsteps));

  const subDt = dt / substeps;
  for (let i = 0; i < substeps; i++) {
    if (ball.speed <= STOP_SPEED) {
      ball.stop();
      break;
    }

    // Exponential friction decay, applied per sub-step.
    const decay = Math.exp(-FRICTION_PER_SEC * subDt);
    ball.vx *= decay;
    ball.vy *= decay;

    ball.x += ball.vx * subDt;
    ball.y += ball.vy * subDt;

    for (const wall of walls) {
      if (resolveWallCollision(ball, wall)) {
        events.push({ type: "wall", cors: !!wall.cors });
      }
    }
    for (const bumper of bumpers) {
      if (resolveBumperCollision(ball, bumper)) {
        events.push({ type: "bumper", bumperId: bumper.id });
      }
    }
  }

  if (ball.speed <= STOP_SPEED) ball.stop();
  return events;
}
