import test from "node:test";
import assert from "node:assert/strict";
import {
  loadStats,
  maybeSaveBest,
  maybeSaveBestCombo,
  saveReleasesRecord,
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
  removeItem(k) {
    this.m.delete(k);
  }
}

class ThrowingStorage {
  getItem() {
    throw new Error("storage unavailable");
  }
  setItem() {
    throw new Error("storage unavailable");
  }
  removeItem() {
    throw new Error("storage unavailable");
  }
}

test("loadStats returns zeroed defaults when storage is unavailable (null)", () => {
  const stats = loadStats(null);
  assert.deepEqual(stats, { best: 0, bestCombo: 0, releases: 0 });
});

test("maybeSaveBest only overwrites when the new score is higher", () => {
  const storage = new MapStorage();
  assert.equal(maybeSaveBest(100, storage), 100);
  assert.equal(maybeSaveBest(50, storage), 100, "lower score must not overwrite");
  assert.equal(maybeSaveBest(150, storage), 150);
  assert.equal(loadStats(storage).best, 150);
});

test("maybeSaveBestCombo only overwrites when higher", () => {
  const storage = new MapStorage();
  assert.equal(maybeSaveBestCombo(4, storage), 4);
  assert.equal(maybeSaveBestCombo(2, storage), 4);
  assert.equal(maybeSaveBestCombo(9, storage), 9);
});

test("saveReleasesRecord only overwrites when higher", () => {
  const storage = new MapStorage();
  assert.equal(saveReleasesRecord(3, storage), 3);
  assert.equal(saveReleasesRecord(1, storage), 3);
});

test("mute preference round-trips through storage", () => {
  const storage = new MapStorage();
  assert.equal(loadMuted(storage), false, "defaults to unmuted");
  saveMuted(true, storage);
  assert.equal(loadMuted(storage), true);
  saveMuted(false, storage);
  assert.equal(loadMuted(storage), false);
});

test("a throwing storage never crashes callers and falls back to safe defaults", () => {
  const storage = new ThrowingStorage();
  assert.doesNotThrow(() => loadStats(storage));
  assert.doesNotThrow(() => maybeSaveBest(100, storage));
  assert.doesNotThrow(() => loadMuted(storage));
  assert.doesNotThrow(() => saveMuted(true, storage));
  assert.deepEqual(loadStats(storage), { best: 0, bestCombo: 0, releases: 0 });
});
