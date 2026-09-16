import test from "node:test";
import assert from "node:assert/strict";
import { Player, boxesOverlap, xRangesOverlap, verticalClearance } from "../src/physics.js";
import { GROUND_Y, GRAVITY, JUMP_VELOCITY } from "../src/constants.js";

test("player starts grounded on the ground line", () => {
  const p = new Player();
  assert.equal(p.grounded, true);
  assert.equal(p.bottom, GROUND_Y);
});

test("jump only works while grounded (no double/infinite jump)", () => {
  const p = new Player();
  assert.equal(p.jump(), true);
  assert.equal(p.grounded, false);
  assert.equal(p.jump(), false, "a second jump mid-air must be rejected");
});

test("gravity pulls the player back down and they re-land on the ground line", () => {
  const p = new Player();
  p.jump();
  const dt = 1 / 60;
  let steps = 0;
  while (!p.grounded && steps < 600) {
    p.update(dt);
    steps++;
  }
  assert.ok(steps < 600, "player should land within a reasonable time");
  assert.equal(p.bottom, GROUND_Y);
  assert.equal(p.vy, 0);
});

test("velocity increases while airborne according to gravity", () => {
  const p = new Player();
  p.jump();
  const v0 = p.vy;
  p.update(1 / 60);
  assert.ok(p.vy > v0, "vy should increase (become less negative / more positive) each tick");
});

test("jump apex height matches the physics constants", () => {
  const expectedApex = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * GRAVITY);
  const p = new Player();
  p.jump();
  let minY = p.y;
  const dt = 1 / 240; // fine-grained to get a precise apex reading
  for (let i = 0; i < 2000 && !p.grounded; i++) {
    p.update(dt);
    minY = Math.min(minY, p.y);
  }
  const actualApex = GROUND_Y - p.h - minY;
  assert.ok(
    Math.abs(actualApex - expectedApex) < 2,
    `apex ~${actualApex} should match derived ${expectedApex}`
  );
});

test("boxesOverlap detects overlap and non-overlap correctly", () => {
  const a = { left: 0, right: 10, top: 0, bottom: 10 };
  const b = { left: 5, right: 15, top: 5, bottom: 15 };
  const c = { left: 20, right: 30, top: 0, bottom: 10 };
  assert.equal(boxesOverlap(a, b), true);
  assert.equal(boxesOverlap(a, c), false);
});

test("xRangesOverlap and verticalClearance", () => {
  const player = { left: 100, right: 140, top: 190, bottom: 240 };
  const obstacle = { left: 110, right: 144, top: 210, bottom: 248 };
  assert.equal(xRangesOverlap(player, obstacle), true);
  assert.equal(verticalClearance(player, obstacle), 210 - 240);

  const clearObstacle = { left: 500, right: 534, top: 210, bottom: 248 };
  assert.equal(xRangesOverlap(player, clearObstacle), false);
});
