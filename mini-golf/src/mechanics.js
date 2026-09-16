import { dist, normalize } from "./vec.js";
import {
  PORTAL_RADIUS,
  PORTAL_COOLDOWN,
  REBASE_TRIGGER_RADIUS,
  REBASE_REARM_DISTANCE,
  ROLLBACK_TRIGGER_RADIUS,
  CACHE_TRIGGER_RADIUS,
  CACHE_HOLD_SECONDS,
  HOLE_CAPTURE_RADIUS,
  HOLE_CAPTURE_MAX_SPEED,
} from "./constants.js";

/** Fresh per-hole mutable state for the trigger-based mechanics below. */
export function createRuntimeState(hole) {
  return {
    portalCooldowns: Object.fromEntries((hole.portals || []).map((p) => [p.id, 0])),
    rebased: false,
    rebaseArmed: true,
    cacheHold: null, // { x, y, vx, vy, timer } while a ball is held
    captured: false,
  };
}

/** The walls actually in play this frame, accounting for REBASE toggles. */
export function activeWalls(hole, state) {
  if (!hole.movable) return hole.walls;
  const extra = state.rebased ? hole.movable.altWalls : hole.movable.defaultWalls;
  return hole.walls.concat(extra);
}

/**
 * Advance trigger-based mechanics for one frame: portals, REBASE, ROLLBACK,
 * CACHE, and MAIN capture. Mutates `ball` and `state` in place. Returns an
 * events array the caller can use for sound/visual feedback.
 */
export function applyMechanics(ball, hole, state, dt) {
  const events = [];

  for (const id in state.portalCooldowns) {
    if (state.portalCooldowns[id] > 0) state.portalCooldowns[id] -= dt;
  }

  if (state.cacheHold) {
    state.cacheHold.timer -= dt;
    if (state.cacheHold.timer <= 0) {
      ball.frozen = false;
      ball.vx = state.cacheHold.vx;
      ball.vy = state.cacheHold.vy;
      state.cacheHold = null;
      events.push({ type: "cache-release" });
    }
    return events; // frozen ball: nothing else can trigger this frame
  }

  if (state.captured) return events;

  for (const portal of hole.portals || []) {
    if (state.portalCooldowns[portal.id] > 0) continue;
    if (dist(ball.pos, portal) >= PORTAL_RADIUS + ball.radius) continue;
    if (ball.speed < 20) continue;
    const target = (hole.portals || []).find((p) => p.id === portal.linkId);
    if (!target) continue;

    const exitDir = normalize({ x: ball.vx, y: ball.vy });
    ball.teleportTo(
      target.x + exitDir.x * (PORTAL_RADIUS + ball.radius + 2),
      target.y + exitDir.y * (PORTAL_RADIUS + ball.radius + 2)
    );
    state.portalCooldowns[portal.id] = PORTAL_COOLDOWN;
    state.portalCooldowns[target.id] = PORTAL_COOLDOWN;
    events.push({ type: "portal" });
    break; // one teleport per frame is plenty
  }

  if (hole.movable) {
    const t = hole.movable.trigger;
    const d = dist(ball.pos, t);
    if (state.rebaseArmed && d < REBASE_TRIGGER_RADIUS + ball.radius) {
      state.rebased = !state.rebased;
      state.rebaseArmed = false;
      events.push({ type: "rebase" });
    } else if (!state.rebaseArmed && d > REBASE_REARM_DISTANCE) {
      state.rebaseArmed = true;
    }
  }

  for (const rb of hole.rollbacks || []) {
    if (dist(ball.pos, rb) < ROLLBACK_TRIGGER_RADIUS + ball.radius) {
      ball.teleportTo(rb.resetTo.x, rb.resetTo.y, { keepVelocity: false });
      events.push({ type: "rollback" });
      break;
    }
  }

  for (const cache of hole.caches || []) {
    if (dist(ball.pos, cache) < CACHE_TRIGGER_RADIUS + ball.radius) {
      state.cacheHold = { vx: ball.vx, vy: ball.vy, timer: cache.holdSeconds ?? CACHE_HOLD_SECONDS };
      ball.frozen = true;
      ball.x = cache.x;
      ball.y = cache.y;
      events.push({ type: "cache-enter" });
      break;
    }
  }

  if (!state.captured && dist(ball.pos, hole.main) < HOLE_CAPTURE_RADIUS) {
    if (ball.speed < HOLE_CAPTURE_MAX_SPEED) {
      state.captured = true;
      ball.teleportTo(hole.main.x, hole.main.y, { keepVelocity: false });
      events.push({ type: "captured" });
    }
  }

  return events;
}
