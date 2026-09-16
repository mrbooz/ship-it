// Tunable game-feel constants. Units: px, seconds.
export const WORLD_W = 960;
export const WORLD_H = 320;
export const GROUND_Y = 248; // y of the ground line; player's feet rest here

export const GRAVITY = 2600; // px/s^2
export const JUMP_VELOCITY = -900; // px/s, negative = up

export const PLAYER_X = 110; // fixed screen x of player's left edge
export const PLAYER_W = 42;
export const PLAYER_H = 46;

// Derived: with GRAVITY/JUMP_VELOCITY above, air time ~0.69s, apex height ~156px.
export const JUMP_AIR_TIME = (2 * Math.abs(JUMP_VELOCITY)) / GRAVITY;

export const BASE_SPEED = 320; // px/s at run start
export const SPEED_RAMP_SQRT_COEF = 19; // px/s per sqrt(second) survived — endless, no cap
export const DEPLOY_SPEED_BUMP = 14; // extra px/s granted per deployment

// Obstacle spacing must always give the player enough time to jump, clear,
// land, and react to the next obstacle. This is the fairness invariant
// obstacle generation must never violate (see tests/obstacles.test.js).
//
// Difficulty is endless: rather than only getting visually faster, the
// safety buffer built into the minimum gap shrinks smoothly over time
// toward a razor-thin floor just above the physical minimum (the time a
// jump's own arc takes). Speed and buffer both keep escalating forever —
// this is deliberately allowed to become "essentially unsurvivable" for
// a very long run, per design; a competent, consistent player can survive
// far longer than a careless one at any given elapsed time, but no run
// lasts forever.
export const REACTION_BUFFER_START = 0.16; // seconds, run start
export const LANDING_BUFFER_START = 0.12; // seconds, run start
export const BUFFER_FLOOR_SECONDS = 0.03; // combined reaction+landing floor
export const BUFFER_DECAY_TAU = 70; // seconds; larger = slower tightening

export function minGapSecondsForElapsed(elapsedSeconds) {
  const startBuffer = REACTION_BUFFER_START + LANDING_BUFFER_START;
  const buffer =
    BUFFER_FLOOR_SECONDS +
    (startBuffer - BUFFER_FLOOR_SECONDS) * Math.exp(-elapsedSeconds / BUFFER_DECAY_TAU);
  return JUMP_AIR_TIME + buffer;
}

// Extra random spacing on top of the guaranteed-safe minimum, in seconds.
// Shrinks as difficulty rises so the game gets denser without ever going
// below the safe minimum.
export const MAX_EXTRA_GAP_SECONDS_START = 1.1;
export const MAX_EXTRA_GAP_SECONDS_FLOOR = 0.15;
export const EXTRA_GAP_RAMP_PER_SEC = 0.012;

// A jump is "PERFECT" when the player clears an obstacle with less than this
// much vertical clearance (px) between their feet and the obstacle's top,
// measured continuously while their hitboxes overlap horizontally. Tight
// enough to require real timing skill, generous enough to be learnable.
export const PERFECT_CLEARANCE_PX = 22;

export const PERFECT_SCORE = 250;
export const CLEAR_SCORE = 10;
export const DEPLOY_SCORE = 1000;
export const FLOW_STATE_COMBO_THRESHOLD = 5;
export const FLOW_STATE_MULTIPLIER = 2;

export const CHECKPOINT_CLEARS = 15; // obstacles cleared between deployments

/**
 * Pure difficulty-progression formula, extracted so it's independently
 * testable. Endless by design: sqrt growth means speed never plateaus but
 * rises ever more gently, so early play stays smooth while long runs keep
 * climbing indefinitely.
 */
export function computeSpeed(elapsedSeconds, deployBumps = 0) {
  return BASE_SPEED + SPEED_RAMP_SQRT_COEF * Math.sqrt(elapsedSeconds) + deployBumps;
}

export const STORAGE_KEYS = {
  best: "shipit.best",
  bestCombo: "shipit.bestCombo",
  releases: "shipit.releasesRecord",
  muted: "shipit.muted",
};
