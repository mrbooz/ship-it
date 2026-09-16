import { STORAGE_KEYS } from "./constants.js";

/**
 * Resolves a localStorage-like store, or null if unavailable (private
 * browsing, disabled storage, non-browser test environment, etc). Every
 * caller must tolerate null and fall back to defaults.
 */
export function resolveStorage(injected) {
  if (injected !== undefined) return injected;
  try {
    if (typeof localStorage === "undefined") return null;
    const probeKey = "__shipit_probe__";
    localStorage.setItem(probeKey, "1");
    localStorage.removeItem(probeKey);
    return localStorage;
  } catch {
    return null;
  }
}

function readNumber(storage, key, fallback) {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeValue(storage, key, value) {
  if (!storage) return false;
  try {
    storage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function loadStats(storage = resolveStorage()) {
  return {
    best: readNumber(storage, STORAGE_KEYS.best, 0),
    bestCombo: readNumber(storage, STORAGE_KEYS.bestCombo, 0),
    releases: readNumber(storage, STORAGE_KEYS.releases, 0),
  };
}

/** Persists a new best score if it beats the stored one. Returns the best. */
export function maybeSaveBest(score, storage = resolveStorage()) {
  const current = readNumber(storage, STORAGE_KEYS.best, 0);
  if (score > current) {
    writeValue(storage, STORAGE_KEYS.best, score);
    return score;
  }
  return current;
}

export function maybeSaveBestCombo(combo, storage = resolveStorage()) {
  const current = readNumber(storage, STORAGE_KEYS.bestCombo, 0);
  if (combo > current) {
    writeValue(storage, STORAGE_KEYS.bestCombo, combo);
    return combo;
  }
  return current;
}

export function saveReleasesRecord(releases, storage = resolveStorage()) {
  const current = readNumber(storage, STORAGE_KEYS.releases, 0);
  if (releases > current) {
    writeValue(storage, STORAGE_KEYS.releases, releases);
    return releases;
  }
  return current;
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
  writeValue(storage, STORAGE_KEYS.muted, muted ? "1" : "0");
}
