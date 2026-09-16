import {
  GRAVITY,
  JUMP_VELOCITY,
  GROUND_Y,
  PLAYER_X,
  PLAYER_W,
  PLAYER_H,
} from "./constants.js";

/**
 * Pure, DOM-free player physics. Kept separate from rendering so it can be
 * unit tested and reasoned about deterministically.
 */
export class Player {
  constructor() {
    this.x = PLAYER_X;
    this.w = PLAYER_W;
    this.h = PLAYER_H;
    this.reset();
  }

  reset() {
    this.y = GROUND_Y - this.h;
    this.vy = 0;
    this.grounded = true;
    this.state = "run"; // run | jump | fall | land
    this.landTimer = 0;
    this.runPhase = 0;
  }

  get top() {
    return this.y;
  }
  get bottom() {
    return this.y + this.h;
  }
  get left() {
    return this.x;
  }
  get right() {
    return this.x + this.w;
  }

  jump() {
    if (!this.grounded) return false;
    this.vy = JUMP_VELOCITY;
    this.grounded = false;
    this.state = "jump";
    return true;
  }

  update(dt) {
    if (this.grounded) {
      this.runPhase += dt * 10;
      if (this.state === "land") {
        this.landTimer -= dt;
        if (this.landTimer <= 0) this.state = "run";
      }
    } else {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      this.state = this.vy < 0 ? "jump" : "fall";

      const groundLevel = GROUND_Y - this.h;
      if (this.y >= groundLevel) {
        this.y = groundLevel;
        this.vy = 0;
        this.grounded = true;
        this.state = "land";
        this.landTimer = 0.12;
      }
    }
  }
}

/** Axis-aligned bounding box overlap test. */
export function boxesOverlap(a, b) {
  return (
    a.left < b.right &&
    a.right > b.left &&
    a.top < b.bottom &&
    a.bottom > b.top
  );
}

/**
 * Vertical clearance (px) between the bottom of `a` (e.g. the player) and
 * the top of `b` (e.g. an obstacle), only meaningful while their x-ranges
 * overlap. Negative values mean they are colliding.
 */
export function verticalClearance(a, b) {
  return b.top - a.bottom;
}

export function xRangesOverlap(a, b) {
  return a.left < b.right && a.right > b.left;
}
