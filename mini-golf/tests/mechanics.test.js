import test from "node:test";
import assert from "node:assert/strict";
import { Ball } from "../src/physics.js";
import { createRuntimeState, applyMechanics, activeWalls } from "../src/mechanics.js";

function baseHole(overrides = {}) {
  return {
    id: 99,
    width: 500,
    height: 300,
    start: { x: 10, y: 10 },
    main: { x: 480, y: 280 },
    walls: [],
    bumpers: [],
    portals: [],
    movable: null,
    rollbacks: [],
    caches: [],
    ...overrides,
  };
}

test("portals teleport the ball to the linked portal and preserve velocity direction", () => {
  const hole = baseHole({
    portals: [
      { id: "a", x: 100, y: 100, linkId: "b" },
      { id: "b", x: 400, y: 200, linkId: "a" },
    ],
  });
  const state = createRuntimeState(hole);
  const ball = new Ball(90, 100);
  ball.launch(300, 0); // moving toward portal a

  let teleported = false;
  for (let i = 0; i < 5 && !teleported; i++) {
    const events = applyMechanics(ball, hole, state, 1 / 60);
    if (events.some((e) => e.type === "portal")) teleported = true;
  }

  assert.ok(teleported);
  assert.ok(Math.abs(ball.x - 400) < 30 && Math.abs(ball.y - 200) < 30, "ball should exit near portal b");
});

test("a used portal pair is on cooldown and won't immediately re-trigger", () => {
  const hole = baseHole({
    portals: [
      { id: "a", x: 100, y: 100, linkId: "b" },
      { id: "b", x: 102, y: 100, linkId: "a" }, // deliberately adjacent, to try to abuse re-entry
    ],
  });
  const state = createRuntimeState(hole);
  const ball = new Ball(90, 100);
  ball.launch(300, 0);
  let teleports = 0;
  for (let i = 0; i < 10; i++) {
    const events = applyMechanics(ball, hole, state, 1 / 60);
    teleports += events.filter((e) => e.type === "portal").length;
  }
  assert.equal(teleports, 1, "cooldown should prevent an immediate double-teleport");
});

test("REBASE trigger toggles which wall set is active, and re-arms only after leaving the trigger", () => {
  const hole = baseHole({
    movable: {
      trigger: { x: 250, y: 150 },
      defaultWalls: [{ x1: 0, y1: 0, x2: 1, y2: 1 }],
      altWalls: [{ x1: 5, y1: 5, x2: 6, y2: 6 }],
    },
  });
  const state = createRuntimeState(hole);
  assert.deepEqual(activeWalls(hole, state), hole.walls.concat(hole.movable.defaultWalls));

  const ball = new Ball(250, 150); // sitting right on the trigger
  applyMechanics(ball, hole, state, 1 / 60);
  assert.equal(state.rebased, true);
  assert.deepEqual(activeWalls(hole, state), hole.walls.concat(hole.movable.altWalls));

  // Still on the trigger — should NOT toggle again until it moves away.
  applyMechanics(ball, hole, state, 1 / 60);
  assert.equal(state.rebased, true);

  ball.x = 250 + 1000; // move far away to re-arm
  applyMechanics(ball, hole, state, 1 / 60);
  ball.x = 250;
  ball.y = 150;
  applyMechanics(ball, hole, state, 1 / 60);
  assert.equal(state.rebased, false, "second trigger after re-arming should toggle back");
});

test("ROLLBACK resets the ball's position and zeroes velocity, never looping forever", () => {
  const hole = baseHole({
    rollbacks: [{ x: 200, y: 150, radius: 14, resetTo: { x: 20, y: 20 } }],
  });
  const state = createRuntimeState(hole);
  const ball = new Ball(200, 150);
  ball.launch(100, 100);
  const events = applyMechanics(ball, hole, state, 1 / 60);
  assert.ok(events.some((e) => e.type === "rollback"));
  assert.equal(ball.x, 20);
  assert.equal(ball.y, 20);
  assert.equal(ball.vx, 0);
  assert.equal(ball.vy, 0);
});

test("CACHE freezes the ball and releases it with its stored velocity after the hold time", () => {
  const hole = baseHole({ caches: [{ x: 200, y: 150, radius: 14, holdSeconds: 0.2 }] });
  const state = createRuntimeState(hole);
  const ball = new Ball(200, 150);
  ball.launch(150, -50);

  let events = applyMechanics(ball, hole, state, 1 / 60);
  assert.ok(events.some((e) => e.type === "cache-enter"));
  assert.equal(ball.frozen, true);

  // Still within the hold window: stays frozen.
  events = applyMechanics(ball, hole, state, 0.1);
  assert.equal(ball.frozen, true);

  // Past the hold window: releases with the original velocity.
  events = applyMechanics(ball, hole, state, 0.2);
  assert.ok(events.some((e) => e.type === "cache-release"));
  assert.equal(ball.frozen, false);
  assert.equal(ball.vx, 150);
  assert.equal(ball.vy, -50);
});

test("MAIN captures a slow ball but not a fast one passing through", () => {
  const hole = baseHole();
  const stateSlow = createRuntimeState(hole);
  const slowBall = new Ball(hole.main.x, hole.main.y);
  slowBall.vx = 10;
  slowBall.vy = 0;
  const slowEvents = applyMechanics(slowBall, hole, stateSlow, 1 / 60);
  assert.ok(slowEvents.some((e) => e.type === "captured"));

  const stateFast = createRuntimeState(hole);
  const fastBall = new Ball(hole.main.x, hole.main.y);
  fastBall.vx = 900;
  fastBall.vy = 0;
  const fastEvents = applyMechanics(fastBall, hole, stateFast, 1 / 60);
  assert.ok(!fastEvents.some((e) => e.type === "captured"), "a fast ball should not be captured");
});

test("once captured, no further mechanics fire for that hole", () => {
  const hole = baseHole();
  const state = createRuntimeState(hole);
  const ball = new Ball(hole.main.x, hole.main.y);
  ball.vx = 5;
  applyMechanics(ball, hole, state, 1 / 60);
  assert.equal(state.captured, true);
  const events = applyMechanics(ball, hole, state, 1 / 60);
  assert.equal(events.length, 0);
});
