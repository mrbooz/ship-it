// Tunable physics/game-feel constants. Units: px, seconds (world units are
// per-hole, see holes.js — each hole defines its own width/height).

export const BALL_RADIUS = 6;
export const FRICTION_PER_SEC = 1.35; // exponential velocity decay rate
export const STOP_SPEED = 4; // below this, the ball is considered stopped
export const MAX_SHOT_SPEED = 1100; // speed at "normal" full power (power === 1)
export const OVERDRIVE_POWER = 1.6; // dragging past full still ramps power up to this — a real "superhard" hit
export const MEGA_SHOT_POWER = 1.2; // power above this counts as a MEGA hit for extra feedback
export const WALL_RESTITUTION = 0.72; // energy kept after bouncing off a wall
export const BUMPER_RESTITUTION = 1.15; // bumpers add a little energy back
export const MAX_SPEED_AFTER_BOUNCE = 2200; // hard cap so bumper chains can't runaway

export const HOLE_CAPTURE_RADIUS = 13; // must be within this of MAIN's center
export const HOLE_CAPTURE_MAX_SPEED = 260; // ...and slower than this, to be captured

export const BUMPER_RADIUS = 14;
export const PORTAL_RADIUS = 13;
export const PORTAL_COOLDOWN = 0.35; // seconds before a just-used portal can re-trigger
export const REBASE_TRIGGER_RADIUS = 15;
export const REBASE_REARM_DISTANCE = 30; // must move this far away before re-triggering
export const ROLLBACK_TRIGGER_RADIUS = 14;
export const CACHE_TRIGGER_RADIUS = 14;
export const CACHE_HOLD_SECONDS = 0.8;

export const MAX_STEP_DT = 1 / 60;
export const COLLISION_SUBSTEPS = 4; // sub-stepping avoids tunneling through thin walls

export const STORAGE_KEYS = {
  bestRound: "mini-golf.bestRound",
  bestPerHole: "mini-golf.bestPerHole",
  holeInOnes: "mini-golf.holeInOnes",
  roundsPlayed: "mini-golf.roundsPlayed",
  muted: "mini-golf.muted",
};
