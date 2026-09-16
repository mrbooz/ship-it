import test from "node:test";
import assert from "node:assert/strict";
import { HOLES } from "../src/holes.js";
import { Ball, stepBall } from "../src/physics.js";
import { createRuntimeState, activeWalls, applyMechanics } from "../src/mechanics.js";
import { dist } from "../src/vec.js";
import { MAX_SHOT_SPEED } from "../src/constants.js";

const DT = 1 / 60;
const MAX_STEPS_PER_SHOT = 4000;

/** Simulate one candidate shot from a cloned ball/state, without mutating the originals. */
function trySimulatedShot(hole, ball, state, angle, power) {
  const trial = new Ball(ball.x, ball.y);
  trial.vx = Math.cos(angle) * MAX_SHOT_SPEED * power;
  trial.vy = Math.sin(angle) * MAX_SHOT_SPEED * power;
  const trialState = JSON.parse(JSON.stringify(state));
  // cacheHold has no methods to lose, plain data — safe to deep-clone.

  for (let i = 0; i < MAX_STEPS_PER_SHOT; i++) {
    const walls = activeWalls(hole, trialState);
    stepBall(trial, DT, { walls, bumpers: hole.bumpers });
    const events = applyMechanics(trial, hole, trialState, DT);
    if (events.some((e) => e.type === "captured")) {
      return { finalDist: 0, captured: true };
    }
    if (!trial.isMoving && !trialState.cacheHold) break;
  }
  return { finalDist: dist(trial.pos, hole.main), captured: false };
}

/**
 * A "reasonable player" bot: for each shot, search a spread of angles
 * around the direct line to MAIN (to find bank shots around obstacles)
 * at a couple of power levels, simulate each candidate, and commit
 * whichever gets closest (or sinks it). This is intentionally not
 * optimal play — it's a floor proving a hole is solvable without
 * hand-crafted per-hole solutions baked into the test.
 */
function simulateHole(hole, { maxStrokes = 30 } = {}) {
  const state = createRuntimeState(hole);
  const ball = new Ball(hole.start.x, hole.start.y);
  let strokes = 0;

  const angleOffsets = [0, 10, -10, 20, -20, 35, -35, 50, -50, 70, -70, 90, -90, 120, -120, 160, -160, 180].map(
    (d) => (d * Math.PI) / 180
  );
  const powers = [1, 0.6, 0.35];

  // A real player would recognize a portal mouth as worth aiming at, not
  // just the hole itself — so the bot's candidate targets include every
  // portal on the hole in addition to MAIN, whichever this position's
  // straight line most plausibly threads a bank shot toward.
  const targets = [hole.main, ...(hole.portals || [])];

  while (!state.captured && strokes < maxStrokes) {
    let best = null;
    for (const target of targets) {
      const baseAngle = Math.atan2(target.y - ball.y, target.x - ball.x);
      for (const offset of angleOffsets) {
        for (const power of powers) {
          const result = trySimulatedShot(hole, ball, state, baseAngle + offset, power);
          if (!best || result.finalDist < best.finalDist) {
            best = { ...result, angle: baseAngle + offset, power };
          }
          if (result.captured) break;
        }
        if (best?.captured) break;
      }
      if (best?.captured) break;
    }

    // Commit the best candidate for real.
    ball.launch(Math.cos(best.angle) * MAX_SHOT_SPEED * best.power, Math.sin(best.angle) * MAX_SHOT_SPEED * best.power);
    strokes++;
    for (let i = 0; i < MAX_STEPS_PER_SHOT; i++) {
      const walls = activeWalls(hole, state);
      stepBall(ball, DT, { walls, bumpers: hole.bumpers });
      const events = applyMechanics(ball, hole, state, DT);

      assert.ok(Number.isFinite(ball.x) && Number.isFinite(ball.y), `Hole ${hole.id}: non-finite ball position`);
      assert.ok(
        ball.x > -500 && ball.x < hole.width + 500 && ball.y > -500 && ball.y < hole.height + 500,
        `Hole ${hole.id}: ball escaped the course bounds`
      );

      if (events.some((e) => e.type === "captured")) break;
      if (!ball.isMoving && !state.cacheHold) break;
    }
  }

  return { captured: state.captured, strokes };
}

test("every hole is completable by a shot-searching bot within a generous stroke budget", () => {
  for (const hole of HOLES) {
    const result = simulateHole(hole);
    assert.ok(
      result.captured,
      `Hole ${hole.id} (${hole.name}) was not completed within ${result.strokes} strokes — likely unreachable or a trap`
    );
  }
});
