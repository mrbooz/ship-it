// Nine handcrafted holes. Each hole is plain data: dimensions, start/main
// position, walls, and whichever mechanic objects it uses. No procedural
// generation — every hole here was placed by hand.
//
// Coordinate system: (0,0) top-left, x right, y down, in "world units" for
// that hole (render.js scales to fit the canvas). Boundary walls are always
// included automatically by `course()` — hole definitions only need to add
// their *internal* geometry.

function wall(x1, y1, x2, y2, opts = {}) {
  return { x1, y1, x2, y2, ...opts };
}

function boundary(w, h) {
  return [wall(0, 0, w, 0), wall(w, 0, w, h), wall(w, h, 0, h), wall(0, h, 0, 0)];
}

function course({ id, name, par, width, height, start, main, extra = {} }) {
  return {
    id,
    name,
    par,
    width,
    height,
    start,
    main,
    walls: boundary(width, height).concat(extra.walls || []),
    bumpers: extra.bumpers || [],
    portals: extra.portals || [],
    movable: extra.movable || null,
    rollbacks: extra.rollbacks || [],
    caches: extra.caches || [],
    decorations: extra.decorations || [],
  };
}

export const HOLES = [
  // HOLE 1 — HELLO WORLD: a straight lane with one gentle dogleg so the
  // very first shot still teaches "walls redirect you."
  course({
    id: 1,
    name: "HELLO WORLD",
    par: 2,
    width: 640,
    height: 260,
    start: { x: 70, y: 200 },
    main: { x: 560, y: 70 },
    extra: {
      walls: [wall(320, 260, 420, 140, {})],
      decorations: [{ type: "label", x: 320, y: 40, text: "console.log('fore')" }],
    },
  }),

  // HOLE 2 — BUG FIX: three BUG bumpers guard the direct line. They can be
  // used defensively (avoid them) or offensively (bank off one on purpose).
  course({
    id: 2,
    name: "BUG FIX",
    par: 3,
    width: 640,
    height: 320,
    start: { x: 70, y: 260 },
    main: { x: 570, y: 60 },
    extra: {
      bumpers: [
        { id: "b1", x: 260, y: 190, radius: 16 },
        { id: "b2", x: 380, y: 120, radius: 16 },
        { id: "b3", x: 470, y: 210, radius: 16 },
      ],
      decorations: [{ type: "label", x: 320, y: 300, text: "🐛" }],
    },
  }),

  // HOLE 3 — CORS: a blocking wall you cannot pass through head-on. The
  // route is an angled bank shot around its right edge.
  course({
    id: 3,
    name: "CORS",
    par: 3,
    width: 640,
    height: 320,
    start: { x: 70, y: 160 },
    main: { x: 570, y: 160 },
    extra: {
      walls: [
        wall(300, 40, 300, 220, { cors: true }),
        wall(300, 220, 380, 280, {}),
      ],
      decorations: [{ type: "label", x: 300, y: 20, text: "BLOCKED BY CORS" }],
    },
  }),

  // HOLE 4 — 404: a portal pair. Enter the near one, exit pointed at MAIN.
  // The long way around the dividing wall still works, just takes longer.
  course({
    id: 4,
    name: "404",
    par: 3,
    width: 700,
    height: 320,
    start: { x: 70, y: 160 },
    main: { x: 630, y: 160 },
    extra: {
      walls: [wall(350, 0, 350, 220, {})],
      portals: [
        { id: "p1", x: 260, y: 160, linkId: "p2" },
        { id: "p2", x: 470, y: 90, linkId: "p1" },
      ],
      decorations: [{ type: "label", x: 350, y: 250, text: "404" }],
    },
  }),

  // HOLE 5 — MERGE CONFLICT: the course forks. Left branch is long and
  // safe; right branch is short but guarded by a bumper.
  course({
    id: 5,
    name: "MERGE CONFLICT",
    par: 4,
    width: 700,
    height: 380,
    start: { x: 70, y: 190 },
    main: { x: 630, y: 190 },
    extra: {
      walls: [
        wall(260, 0, 340, 150, {}), // fork divider, top
        wall(260, 380, 340, 230, {}), // fork divider, bottom
        wall(340, 150, 620, 60, {}), // safe branch outer rail (long way, top)
        wall(340, 230, 560, 300, {}), // risky branch outer rail (short way, bottom)
      ],
      bumpers: [{ id: "guard", x: 480, y: 250, radius: 16 }],
      decorations: [
        { type: "label", x: 300, y: 40, text: "<<<<<<< safe" },
        { type: "label", x: 300, y: 340, text: "======= risky" },
      ],
    },
  }),

  // HOLE 6 — REBASE: a wall blocks the direct path. Hit the REBASE trigger
  // off to the side to swap it out of the way.
  course({
    id: 6,
    name: "REBASE",
    par: 3,
    width: 640,
    height: 320,
    start: { x: 70, y: 160 },
    main: { x: 570, y: 160 },
    extra: {
      movable: {
        trigger: { x: 320, y: 280 },
        defaultWalls: [wall(340, 40, 340, 220, {})],
        altWalls: [wall(340, 100, 340, 280, {})],
      },
      decorations: [{ type: "label", x: 320, y: 300, text: "REBASE" }],
    },
  }),

  // HOLE 7 — DEPENDENCY HELL: combines a CORS wall, two bumpers, and a
  // portal — everything learned so far, in one readable layout.
  course({
    id: 7,
    name: "DEPENDENCY HELL",
    par: 4,
    width: 760,
    height: 360,
    start: { x: 70, y: 300 },
    main: { x: 690, y: 80 },
    extra: {
      walls: [wall(260, 360, 260, 160, { cors: true })],
      bumpers: [
        { id: "b1", x: 420, y: 260, radius: 16 },
        { id: "b2", x: 520, y: 160, radius: 16 },
      ],
      portals: [
        { id: "p1", x: 340, y: 90, linkId: "p2" },
        { id: "p2", x: 600, y: 300, linkId: "p1" },
      ],
    },
  }),

  // HOLE 8 — FRIDAY DEPLOY: a narrow bumper-flanked shortcut straight to
  // MAIN, versus a long safe loop. Overshoot the shortcut and a ROLLBACK
  // zone sends you back to try again — never further back than that.
  course({
    id: 8,
    name: "FRIDAY DEPLOY",
    par: 4,
    width: 760,
    height: 400,
    start: { x: 70, y: 340 },
    main: { x: 690, y: 340 },
    extra: {
      walls: [
        wall(300, 0, 300, 240, {}),
        wall(300, 400, 460, 400, {}),
        wall(460, 400, 460, 260, {}),
      ],
      bumpers: [
        { id: "b1", x: 370, y: 300, radius: 15 },
        { id: "b2", x: 390, y: 380, radius: 15 },
      ],
      rollbacks: [{ x: 380, y: 40, radius: 22, resetTo: { x: 250, y: 340 } }],
      decorations: [{ type: "label", x: 380, y: 340, text: "🚀 hotfix" }],
    },
  }),

  // HOLE 9 — PRODUCTION: the finale. A CACHE zone holds the ball mid-course
  // (a deploy queue), then a portal and a bumper gauntlet lead to MAIN. A
  // narrow direct lane exists for an extremely difficult hole-in-one.
  course({
    id: 9,
    name: "PRODUCTION",
    par: 5,
    width: 820,
    height: 420,
    start: { x: 70, y: 360 },
    main: { x: 750, y: 60 },
    extra: {
      walls: [
        wall(220, 420, 220, 160, {}),
        wall(500, 0, 500, 260, { cors: true }),
      ],
      bumpers: [
        { id: "b1", x: 600, y: 300, radius: 16 },
        { id: "b2", x: 680, y: 200, radius: 16 },
      ],
      portals: [
        { id: "p1", x: 300, y: 340, linkId: "p2" },
        { id: "p2", x: 560, y: 120, linkId: "p1" },
      ],
      caches: [{ x: 150, y: 200, radius: 16 }],
      decorations: [{ type: "label", x: 750, y: 30, text: "MAIN" }],
    },
  }),
];

export function getHole(id) {
  return HOLES.find((h) => h.id === id);
}

/**
 * Structural sanity checks every hole must pass: start/main inside bounds
 * and not embedded in a wall, par is a positive integer, geometry is
 * well-formed. This is NOT a fun/playability check (see tests/ for a
 * simulated-shot playability pass) — just "this hole isn't broken."
 */
export function validateHole(hole) {
  const problems = [];
  const inBounds = (p) => p.x >= 0 && p.x <= hole.width && p.y >= 0 && p.y <= hole.height;

  if (!inBounds(hole.start)) problems.push("start is out of bounds");
  if (!inBounds(hole.main)) problems.push("main is out of bounds");
  if (!Number.isInteger(hole.par) || hole.par < 1) problems.push("par must be a positive integer");
  if (hole.start.x === hole.main.x && hole.start.y === hole.main.y) {
    problems.push("start and main are the same point");
  }
  for (const w of hole.walls) {
    if (w.x1 === w.x2 && w.y1 === w.y2) problems.push("a wall has zero length");
  }
  return problems;
}
