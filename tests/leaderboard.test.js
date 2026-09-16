import test from "node:test";
import assert from "node:assert/strict";
import { getPlayerName, setPlayerName } from "../src/leaderboard.js";

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

test("getPlayerName mints and persists a random name on first call", () => {
  const storage = new MapStorage();
  const name = getPlayerName(storage);
  assert.ok(name.length > 0);
  assert.equal(getPlayerName(storage), name, "subsequent calls reuse the stored name");
});

test("getPlayerName never throws when storage is unavailable", () => {
  assert.doesNotThrow(() => getPlayerName(null));
  const name = getPlayerName(null);
  assert.ok(name.length > 0);
});

test("setPlayerName trims, caps length, and persists", () => {
  const storage = new MapStorage();
  const saved = setPlayerName("  a very long nickname that exceeds the cap  ", storage);
  assert.ok(saved.length <= 20);
  assert.equal(getPlayerName(storage), saved);
});

test("setPlayerName falls back to a fresh name when given an empty string", () => {
  const storage = new MapStorage();
  const result = setPlayerName("   ", storage);
  assert.ok(result.length > 0);
});
