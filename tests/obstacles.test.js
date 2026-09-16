import test from "node:test";
import assert from "node:assert/strict";
import {
  computeGapPx,
  extraGapSecondsForElapsed,
  makeObstacle,
  ObstacleSpawner,
  OBSTACLE_TYPES,
  JOKE_TYPES,
} from "../src/obstacles.js";
import { minGapSecondsForElapsed, BASE_SPEED, computeSpeed } from "../src/constants.js";

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

test("obstacle gap always leaves at least the guaranteed-safe survival window for its elapsed time", () => {
  const elapsedTimes = [0, 30, 60, 120, 300, 1800, 7200];
  const rng = seededRng(42);
  for (const elapsed of elapsedTimes) {
    const speed = computeSpeed(elapsed);
    const minGapSeconds = minGapSecondsForElapsed(elapsed);
    for (let i = 0; i < 50; i++) {
      const gapPx = computeGapPx(speed, elapsed, rng);
      const gapSeconds = gapPx / speed;
      assert.ok(
        gapSeconds >= minGapSeconds - 1e-9,
        `gap of ${gapSeconds}s at speed ${speed} after ${elapsed}s must be >= ${minGapSeconds}s`
      );
    }
  }
});

test("the safe minimum gap shrinks toward its floor over time but never below it", () => {
  const early = minGapSecondsForElapsed(0);
  const late = minGapSecondsForElapsed(1_000_000);
  const veryLate = minGapSecondsForElapsed(1_000_000_000);
  assert.ok(late < early, "minimum gap should tighten as difficulty rises");
  assert.ok(veryLate >= late - 1e-9, "must never go below the asymptotic floor");
});

test("extra gap shrinks with elapsed time but never below the floor", () => {
  const early = extraGapSecondsForElapsed(0);
  const late = extraGapSecondsForElapsed(10000);
  assert.ok(late < early);
  assert.ok(late >= 0.15 - 1e-9);
});

test("makeObstacle sets a height matching its type class", () => {
  const low = makeObstacle(OBSTACLE_TYPES.find((t) => t.height === "low"));
  const tall = makeObstacle(OBSTACLE_TYPES.find((t) => t.height === "tall"));
  assert.ok(tall.h > low.h);
});

test("joke obstacles carry the same mechanical shape as their height class", () => {
  const joke = makeObstacle(JOKE_TYPES[0]);
  assert.equal(joke._joke, true);
  assert.ok(joke.w > 0 && joke.h > 0);
});

test("spawner moves obstacles left at the given speed and culls off-screen ones", () => {
  const spawner = new ObstacleSpawner(seededRng(7));
  spawner.distanceToNext = 0; // force an immediate spawn
  spawner.update(1 / 60, 300);
  assert.equal(spawner.obstacles.length, 1);
  const before = spawner.obstacles[0].x;
  spawner.update(1, 300); // one second at 300px/s
  assert.ok(spawner.obstacles.length <= 1);
  if (spawner.obstacles.length === 1) {
    assert.ok(spawner.obstacles[0].x < before);
  }
});

test("spawner never spawns before distanceToNext counts down", () => {
  const spawner = new ObstacleSpawner(seededRng(1));
  spawner.distanceToNext = 1000;
  spawner.update(1 / 60, 300);
  assert.equal(spawner.obstacles.length, 0);
});

test("holdNextSpawn only ever increases the pending distance", () => {
  const spawner = new ObstacleSpawner(seededRng(1));
  spawner.distanceToNext = 50;
  spawner.holdNextSpawn(200);
  assert.equal(spawner.distanceToNext, 200);
  spawner.holdNextSpawn(10);
  assert.equal(spawner.distanceToNext, 200, "must not shrink an existing hold");
});
