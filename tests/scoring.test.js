import test from "node:test";
import assert from "node:assert/strict";
import { ScoreManager } from "../src/scoring.js";
import {
  CLEAR_SCORE,
  PERFECT_SCORE,
  DEPLOY_SCORE,
  FLOW_STATE_COMBO_THRESHOLD,
  FLOW_STATE_MULTIPLIER,
} from "../src/constants.js";

test("a normal clear awards the base score and does not build combo", () => {
  const sm = new ScoreManager();
  const result = sm.registerClear({ perfect: false });
  assert.equal(result.points, CLEAR_SCORE);
  assert.equal(sm.score, CLEAR_SCORE);
  assert.equal(sm.combo, 0);
});

test("a perfect clear awards the perfect score and builds combo", () => {
  const sm = new ScoreManager();
  const result = sm.registerClear({ perfect: true });
  assert.equal(result.points, PERFECT_SCORE);
  assert.equal(sm.combo, 1);
});

test("consecutive perfects increment combo; a normal clear resets it", () => {
  const sm = new ScoreManager();
  sm.registerClear({ perfect: true });
  sm.registerClear({ perfect: true });
  sm.registerClear({ perfect: true });
  assert.equal(sm.combo, 3);
  sm.registerClear({ perfect: false });
  assert.equal(sm.combo, 0);
});

test("flow state activates exactly at the combo threshold, once", () => {
  const sm = new ScoreManager();
  let flowStarted = false;
  for (let i = 0; i < FLOW_STATE_COMBO_THRESHOLD; i++) {
    const r = sm.registerClear({ perfect: true });
    if (i === FLOW_STATE_COMBO_THRESHOLD - 1) {
      assert.equal(r.flowJustStarted, true);
      flowStarted = true;
    } else {
      assert.equal(r.flowJustStarted, false);
    }
  }
  assert.ok(flowStarted);
  assert.equal(sm.flowState, true);

  // Staying in flow state should not re-fire flowJustStarted.
  const again = sm.registerClear({ perfect: true });
  assert.equal(again.flowJustStarted, false);
});

test("flow state doubles per-obstacle score", () => {
  const sm = new ScoreManager();
  for (let i = 0; i < FLOW_STATE_COMBO_THRESHOLD; i++) sm.registerClear({ perfect: true });
  const scoreBefore = sm.score;
  const r = sm.registerClear({ perfect: true });
  assert.equal(r.points, PERFECT_SCORE * FLOW_STATE_MULTIPLIER);
  assert.equal(sm.score, scoreBefore + PERFECT_SCORE * FLOW_STATE_MULTIPLIER);
});

test("a miss (non-perfect clear) drops flow state", () => {
  const sm = new ScoreManager();
  for (let i = 0; i < FLOW_STATE_COMBO_THRESHOLD; i++) sm.registerClear({ perfect: true });
  assert.equal(sm.flowState, true);
  sm.registerClear({ perfect: false });
  assert.equal(sm.flowState, false);
  assert.equal(sm.combo, 0);
});

test("deployment adds the deploy score and increments releases", () => {
  const sm = new ScoreManager();
  sm.registerClear({ perfect: false });
  const result = sm.registerDeployment();
  assert.equal(result.releases, 1);
  assert.equal(sm.releases, 1);
  assert.equal(sm.score, CLEAR_SCORE + DEPLOY_SCORE);
  assert.equal(sm.clearsSinceCheckpoint, 0, "checkpoint counter resets after deploying");
});

test("collision resets combo and flow state but keeps score/releases", () => {
  const sm = new ScoreManager();
  for (let i = 0; i < FLOW_STATE_COMBO_THRESHOLD; i++) sm.registerClear({ perfect: true });
  sm.registerDeployment();
  const scoreBefore = sm.score;
  sm.registerCollision();
  assert.equal(sm.combo, 0);
  assert.equal(sm.flowState, false);
  assert.equal(sm.score, scoreBefore);
  assert.equal(sm.releases, 1);
});

test("reset clears all run state", () => {
  const sm = new ScoreManager();
  sm.registerClear({ perfect: true });
  sm.registerDeployment();
  sm.reset();
  assert.equal(sm.score, 0);
  assert.equal(sm.combo, 0);
  assert.equal(sm.releases, 0);
  assert.equal(sm.flowState, false);
});
