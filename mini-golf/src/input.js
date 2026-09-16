import { OVERDRIVE_POWER } from "./constants.js";

const MAX_DRAG_PX = 130; // "normal" full power at this drag distance, regardless of hole zoom
const OVERDRIVE_DRAG_PX = MAX_DRAG_PX * OVERDRIVE_POWER; // drag past MAX_DRAG_PX keeps adding power, up to this
const MIN_DRAG_PX = 10; // shorter drags are treated as accidental, not a shot

/**
 * Wires pointer (mouse + touch, unified) drag-to-aim input to a Game.
 * Power is computed from on-screen drag distance so it feels consistent
 * across holes even though each hole is rendered at a different zoom
 * level; direction is just an angle, so it's scale-invariant and can be
 * computed in screen space directly.
 */
export function attachInput(canvas, game, renderer) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let dirX = 0;
  let dirY = 0;
  let power = 0;

  function rectPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e) {
    if (!game.canAim()) return;
    dragging = true;
    const p = rectPoint(e);
    startX = p.x;
    startY = p.y;
    canvas.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const p = rectPoint(e);
    const dx = p.x - startX;
    const dy = p.y - startY;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-6) {
      dirX = 0;
      dirY = 0;
      power = 0;
    } else {
      // Pull back to shoot forward, like a slingshot. Dragging past the
      // "normal" full-power distance keeps ramping power up to
      // OVERDRIVE_POWER — a deliberate, satisfying way to hit superhard.
      dirX = -dx / dist;
      dirY = -dy / dist;
      power = Math.min(dist, OVERDRIVE_DRAG_PX) / MAX_DRAG_PX;
    }
    game.aimPreview = dist >= MIN_DRAG_PX ? { dirX, dirY, power } : null;
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    const p = rectPoint(e);
    const dist = Math.hypot(p.x - startX, p.y - startY);
    game.aimPreview = null;
    if (dist >= MIN_DRAG_PX && power > 0) {
      game.shoot(dirX, dirY, power);
    }
    e.preventDefault();
  }

  canvas.style.touchAction = "none";
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
  };
}
