import { STORAGE_KEYS } from "./constants.js";

/** Same pattern as SHIP IT's persistence.js: tolerate storage being absent. */
export function resolveStorage(injected) {
  if (injected !== undefined) return injected;
  try {
    if (typeof localStorage === "undefined") return null;
    const probeKey = "__minigolf_probe__";
    localStorage.setItem(probeKey, "1");
    localStorage.removeItem(probeKey);
    return localStorage;
  } catch {
    return null;
  }
}

function readJSON(storage, key, fallback) {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJSON(storage, key, value) {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadStats(storage = resolveStorage()) {
  return {
    bestRound: readJSON(storage, STORAGE_KEYS.bestRound, null), // {totalStrokes, totalPar}
    bestPerHole: readJSON(storage, STORAGE_KEYS.bestPerHole, {}), // {holeId: strokes}
    holeInOnes: readJSON(storage, STORAGE_KEYS.holeInOnes, 0),
    roundsPlayed: readJSON(storage, STORAGE_KEYS.roundsPlayed, 0),
  };
}

/** Returns {bestRound, isNewBest}. */
export function maybeSaveBestRound(totalStrokes, totalPar, storage = resolveStorage()) {
  const current = readJSON(storage, STORAGE_KEYS.bestRound, null);
  if (!current || totalStrokes < current.totalStrokes) {
    const next = { totalStrokes, totalPar };
    writeJSON(storage, STORAGE_KEYS.bestRound, next);
    return { bestRound: next, isNewBest: true };
  }
  return { bestRound: current, isNewBest: false };
}

export function maybeSaveBestForHole(holeId, strokes, storage = resolveStorage()) {
  const perHole = readJSON(storage, STORAGE_KEYS.bestPerHole, {});
  if (perHole[holeId] == null || strokes < perHole[holeId]) {
    perHole[holeId] = strokes;
    writeJSON(storage, STORAGE_KEYS.bestPerHole, perHole);
    return true;
  }
  return false;
}

export function recordHoleInOne(storage = resolveStorage()) {
  const count = readJSON(storage, STORAGE_KEYS.holeInOnes, 0) + 1;
  writeJSON(storage, STORAGE_KEYS.holeInOnes, count);
  return count;
}

export function recordRoundPlayed(storage = resolveStorage()) {
  const count = readJSON(storage, STORAGE_KEYS.roundsPlayed, 0) + 1;
  writeJSON(storage, STORAGE_KEYS.roundsPlayed, count);
  return count;
}

export function loadMuted(storage = resolveStorage()) {
  if (!storage) return false;
  try {
    return storage.getItem(STORAGE_KEYS.muted) === "1";
  } catch {
    return false;
  }
}

export function saveMuted(muted, storage = resolveStorage()) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEYS.muted, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
}
