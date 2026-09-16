// Minimal 2D vector math. Plain {x,y} objects, no classes — cheap to create
// and easy to test.

export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a, s) => ({ x: a.x * s, y: a.y * s });
export const dot = (a, b) => a.x * b.x + a.y * b.y;
export const lengthSq = (a) => dot(a, a);
export const length = (a) => Math.sqrt(lengthSq(a));
export const dist = (a, b) => length(sub(a, b));

export function normalize(a) {
  const len = length(a);
  if (len < 1e-9) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

/** Reflect vector v off a surface with unit normal n. */
export function reflect(v, n) {
  const d = 2 * dot(v, n);
  return { x: v.x - d * n.x, y: v.y - d * n.y };
}

/**
 * Closest point on segment [a,b] to point p, and the distance to it.
 * Used for circle-vs-segment collision (walls).
 */
export function closestPointOnSegment(p, a, b) {
  const ab = sub(b, a);
  const abLenSq = lengthSq(ab);
  if (abLenSq < 1e-9) return { point: a, t: 0 };
  let t = dot(sub(p, a), ab) / abLenSq;
  t = clamp(t, 0, 1);
  return { point: add(a, scale(ab, t)), t };
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
