import test from "node:test";
import assert from "node:assert/strict";
import { add, sub, scale, dot, length, normalize, reflect, closestPointOnSegment, clamp } from "../src/vec.js";

test("basic vector arithmetic", () => {
  assert.deepEqual(add({ x: 1, y: 2 }, { x: 3, y: 4 }), { x: 4, y: 6 });
  assert.deepEqual(sub({ x: 5, y: 5 }, { x: 2, y: 1 }), { x: 3, y: 4 });
  assert.deepEqual(scale({ x: 2, y: 3 }, 2), { x: 4, y: 6 });
  assert.equal(dot({ x: 1, y: 0 }, { x: 0, y: 1 }), 0);
  assert.equal(length({ x: 3, y: 4 }), 5);
});

test("normalize returns a unit vector, and zero vector safely", () => {
  const n = normalize({ x: 3, y: 4 });
  assert.ok(Math.abs(length(n) - 1) < 1e-9);
  assert.deepEqual(normalize({ x: 0, y: 0 }), { x: 0, y: 0 });
});

test("reflect off a flat wall flips the perpendicular component", () => {
  const v = { x: 1, y: -1 }; // moving right and up
  const n = { x: 0, y: 1 }; // wall normal pointing up
  const r = reflect(v, n);
  assert.equal(r.x, 1); // tangential component unchanged
  assert.equal(r.y, 1); // normal component flipped
});

test("closestPointOnSegment clamps to the segment's endpoints", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };
  assert.deepEqual(closestPointOnSegment({ x: -5, y: 3 }, a, b).point, { x: 0, y: 0 });
  assert.deepEqual(closestPointOnSegment({ x: 15, y: 3 }, a, b).point, { x: 10, y: 0 });
  assert.deepEqual(closestPointOnSegment({ x: 4, y: 3 }, a, b).point, { x: 4, y: 0 });
});

test("clamp", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(50, 0, 10), 10);
});
