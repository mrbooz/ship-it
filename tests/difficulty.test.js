import test from "node:test";
import assert from "node:assert/strict";
import { computeSpeed, BASE_SPEED } from "../src/constants.js";

test("speed starts at the base speed", () => {
  assert.equal(computeSpeed(0), BASE_SPEED);
});

test("speed increases smoothly with survival time", () => {
  const s1 = computeSpeed(10);
  const s2 = computeSpeed(20);
  const s3 = computeSpeed(40);
  assert.ok(s2 > s1);
  assert.ok(s3 > s2);
});

test("difficulty is endless: speed keeps climbing with no cap, however long the run", () => {
  const s1 = computeSpeed(3600); // 1 hour
  const s2 = computeSpeed(36000); // 10 hours
  const s3 = computeSpeed(360000); // ~4 days
  assert.ok(s2 > s1);
  assert.ok(s3 > s2, "there is no ceiling — a long enough run always keeps getting faster");
});

test("growth slows over time (sqrt curve) rather than climbing linearly forever", () => {
  const early = computeSpeed(20) - computeSpeed(10); // gain over 10s early
  const late = computeSpeed(3610) - computeSpeed(3600); // gain over 10s an hour in
  assert.ok(late < early, "the same 10-second window should add less speed later in a run");
});

test("deployment speed bumps stack additively on top of the base curve", () => {
  const withoutBumps = computeSpeed(0, 0);
  const withBumps = computeSpeed(0, 500);
  assert.equal(withBumps - withoutBumps, 500);
});

test("difficulty ramp has no sudden jumps for nearby time deltas", () => {
  const a = computeSpeed(50);
  const b = computeSpeed(50.1);
  assert.ok(Math.abs(b - a) < 5, "a tenth of a second should not spike speed");
});
