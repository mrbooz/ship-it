import test from "node:test";
import assert from "node:assert/strict";
import {
  loadStats,
  maybeSaveBestRound,
  maybeSaveBestForHole,
  recordHoleInOne,
  recordRoundPlayed,
  loadMuted,
  saveMuted,
} from "../src/persistence.js";

class MapStorage {
  constructor() {
    this.m = new Map();
  }
  getItem(k) {
    return this.m.has(k) ? this.m.get(k) : null;
  }
  setItem(k, v) {
    this.m.set(k, String(v));
  }
}

test("loadStats defaults are sane when storage is unavailable", () => {
  const stats = loadStats(null);
  assert.equal(stats.bestRound, null);
  assert.deepEqual(stats.bestPerHole, {});
  assert.equal(stats.holeInOnes, 0);
  assert.equal(stats.roundsPlayed, 0);
});

test("maybeSaveBestRound only overwrites with a lower stroke count", () => {
  const storage = new MapStorage();
  let r = maybeSaveBestRound(30, 30, storage);
  assert.equal(r.isNewBest, true);
  r = maybeSaveBestRound(32, 30, storage);
  assert.equal(r.isNewBest, false);
  assert.equal(r.bestRound.totalStrokes, 30);
  r = maybeSaveBestRound(27, 30, storage);
  assert.equal(r.isNewBest, true);
  assert.equal(r.bestRound.totalStrokes, 27);
});

test("maybeSaveBestForHole tracks a best score independently per hole", () => {
  const storage = new MapStorage();
  assert.equal(maybeSaveBestForHole(1, 3, storage), true);
  assert.equal(maybeSaveBestForHole(1, 4, storage), false);
  assert.equal(maybeSaveBestForHole(2, 2, storage), true);
  assert.deepEqual(loadStats(storage).bestPerHole, { 1: 3, 2: 2 });
});

test("hole-in-one and rounds-played counters increment", () => {
  const storage = new MapStorage();
  assert.equal(recordHoleInOne(storage), 1);
  assert.equal(recordHoleInOne(storage), 2);
  assert.equal(recordRoundPlayed(storage), 1);
});

test("mute preference round-trips", () => {
  const storage = new MapStorage();
  assert.equal(loadMuted(storage), false);
  saveMuted(true, storage);
  assert.equal(loadMuted(storage), true);
});

test("a throwing storage never crashes callers", () => {
  const throwing = {
    getItem() {
      throw new Error("nope");
    },
    setItem() {
      throw new Error("nope");
    },
  };
  assert.doesNotThrow(() => loadStats(throwing));
  assert.doesNotThrow(() => maybeSaveBestRound(10, 10, throwing));
});
