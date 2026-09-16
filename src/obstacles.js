import {
  WORLD_W,
  GROUND_Y,
  minGapSecondsForElapsed,
  MAX_EXTRA_GAP_SECONDS_START,
  MAX_EXTRA_GAP_SECONDS_FLOOR,
  EXTRA_GAP_RAMP_PER_SEC,
} from "./constants.js";

// Core obstacle vocabulary. Two heights only: "low" (must jump, generous)
// and "tall" (must jump with less margin). Every variant is mechanically
// identical within its height class — only the label/art differs — so
// variety never affects fairness, only readability and flavor.
export const OBSTACLE_TYPES = [
  { label: "BUG", icon: "🐛", height: "low" },
  { label: "404", icon: null, height: "low" },
  { label: "500", icon: null, height: "tall" },
  { label: "NULL", icon: null, height: "low" },
  { label: "CORS", icon: null, height: "tall" },
  { label: "npm ERR!", icon: null, height: "tall" },
  { label: "FAILED TEST", icon: null, height: "tall" },
  { label: "undefined", icon: null, height: "low" },
  { label: "<<<<<<<", icon: null, height: "low" },
  { label: "MERGE CONFLICT", icon: null, height: "tall" },
];

// Rare, purely cosmetic easter-egg labels. Same hitbox rules as their
// height class — they never change difficulty, only reward noticing them.
export const JOKE_TYPES = [
  { label: "it worked on my machine", icon: null, height: "low", isJoke: true },
  { label: "Friday deploy", icon: null, height: "low", isJoke: true },
  { label: "LGTM", icon: null, height: "low", isJoke: true },
  { label: "TODO", icon: null, height: "low", isJoke: true },
  { label: "hotfix", icon: null, height: "tall", isJoke: true },
  { label: "dependency update", icon: null, height: "tall", isJoke: true },
];

const LOW_HEIGHT_PX = 34;
const TALL_HEIGHT_PX = 62;
const OBSTACLE_W = 48; // wide enough for two-line horizontal labels to stay readable
const JOKE_CHANCE = 0.06;

// Tall obstacles (tighter clearance) become more common over time, from an
// even split at the start toward a tall-majority mix, capped well short of
// 100% so short ones never disappear entirely.
const TALL_WEIGHT_START = 0.5;
const TALL_WEIGHT_MAX = 0.75;
const TALL_WEIGHT_RAMP_PER_SEC = 0.0025;

let idCounter = 0;

function tallWeightForElapsed(elapsedSeconds) {
  return Math.min(
    TALL_WEIGHT_MAX,
    TALL_WEIGHT_START + elapsedSeconds * TALL_WEIGHT_RAMP_PER_SEC
  );
}

function pickType(rng, elapsedSeconds = 0) {
  if (rng() < JOKE_CHANCE) {
    return JOKE_TYPES[Math.floor(rng() * JOKE_TYPES.length)];
  }
  const tallWeight = tallWeightForElapsed(elapsedSeconds);
  const wantTall = rng() < tallWeight;
  const pool = OBSTACLE_TYPES.filter((t) =>
    wantTall ? t.height === "tall" : t.height === "low"
  );
  return pool[Math.floor(rng() * pool.length)];
}

/** Maximum extra random gap (seconds) on top of the guaranteed-safe minimum. */
export function extraGapSecondsForElapsed(elapsedSeconds) {
  const shrunk =
    MAX_EXTRA_GAP_SECONDS_START - elapsedSeconds * EXTRA_GAP_RAMP_PER_SEC;
  return Math.max(MAX_EXTRA_GAP_SECONDS_FLOOR, shrunk);
}

/**
 * Compute the horizontal gap (px) to the next obstacle. This is the single
 * choke point that guarantees fairness: no matter the current speed or
 * difficulty, the gap always allows enough time to jump, land, and react —
 * the guaranteed-safe minimum shrinks smoothly over elapsed time (see
 * `minGapSecondsForElapsed`) rather than ever being skipped.
 */
export function computeGapPx(speed, elapsedSeconds, rng = Math.random) {
  const extraMax = extraGapSecondsForElapsed(elapsedSeconds);
  const gapSeconds = minGapSecondsForElapsed(elapsedSeconds) + rng() * extraMax;
  return gapSeconds * speed;
}

export function makeObstacle(type, rng = Math.random) {
  const h = type.height === "tall" ? TALL_HEIGHT_PX : LOW_HEIGHT_PX;
  return {
    id: ++idCounter,
    type,
    label: type.label,
    icon: type.icon,
    w: OBSTACLE_W,
    h,
    x: WORLD_W + 10,
    _joke: !!type.isJoke,
    get top() {
      return GROUND_Y - this.h;
    },
    get bottom() {
      return GROUND_Y;
    },
    get left() {
      return this.x;
    },
    get right() {
      return this.x + this.w;
    },
    cleared: false,
    minClearance: Infinity,
  };
}

/**
 * Spawns and advances obstacles. Pure logic (no rendering); the renderer
 * reads `.obstacles` for drawing.
 */
export class ObstacleSpawner {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.obstacles = [];
    this.reset();
  }

  reset() {
    this.obstacles = [];
    this.distanceToNext = 400; // give the player a beat before the first one
    this.elapsed = 0;
  }

  update(dt, speed) {
    this.elapsed += dt;
    for (const o of this.obstacles) o.x -= speed * dt;
    this.obstacles = this.obstacles.filter((o) => o.right > -50);

    this.distanceToNext -= speed * dt;
    if (this.distanceToNext <= 0) {
      const type = pickType(this.rng, this.elapsed);
      this.obstacles.push(makeObstacle(type, this.rng));
      this.distanceToNext = computeGapPx(speed, this.elapsed, this.rng);
    }
  }

  /** Temporarily suppress spawns (used during the deployment cutscene). */
  holdNextSpawn(minPx) {
    this.distanceToNext = Math.max(this.distanceToNext, minPx);
  }
}
