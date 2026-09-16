// Golf scoring underneath, developer language on top.

const HOLE_LABELS = [
  { max: -2, label: "ONE-LINER" },
  { max: -1, label: "10x ENGINEER" },
  { max: 0, label: "CLEAN COMMIT" },
  { max: 1, label: "LGTM" },
  { max: 2, label: "NEEDS REVIEW" },
  { max: 3, label: "TECH DEBT" },
  { max: Infinity, label: "PRODUCTION INCIDENT" },
];

/** strokes relative to par -> developer-flavored result label. */
export function holeResultLabel(strokes, par) {
  if (strokes === 1) return "HOLE IN ONE";
  const diff = strokes - par;
  return HOLE_LABELS.find((row) => diff <= row.max).label;
}

const ROUND_LABELS = [
  { max: -3, label: "CLEAN CODE" },
  { max: -1, label: "SOLID PR" },
  { max: 0, label: "MERGED" },
  { max: 1, label: "MINOR NITS" },
  { max: 2, label: "REQUESTED CHANGES" },
  { max: Infinity, label: "REVERT THIS" },
];

export function roundResultLabel(totalStrokes, totalPar) {
  const diff = totalStrokes - totalPar;
  return ROUND_LABELS.find((row) => diff <= row.max).label;
}

export function formatRelative(diff) {
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/**
 * Tracks strokes across a 9-hole round. Pure state machine, no DOM/timers —
 * the caller (game.js) drives it with discrete events.
 */
export class RoundManager {
  constructor(holes) {
    this.holes = holes;
    this.reset();
  }

  reset() {
    this.holeIndex = 0;
    this.strokesThisHole = 0;
    this.results = []; // [{holeId, par, strokes, label}]
  }

  get currentHole() {
    return this.holes[this.holeIndex];
  }

  get isLastHole() {
    return this.holeIndex === this.holes.length - 1;
  }

  registerStroke() {
    this.strokesThisHole += 1;
  }

  /** Call when the ball is captured. Returns the result row for this hole. */
  finishHole() {
    const hole = this.currentHole;
    const strokes = Math.max(1, this.strokesThisHole);
    const result = {
      holeId: hole.id,
      name: hole.name,
      par: hole.par,
      strokes,
      label: holeResultLabel(strokes, hole.par),
    };
    this.results.push(result);
    return result;
  }

  advanceHole() {
    this.holeIndex += 1;
    this.strokesThisHole = 0;
  }

  get totalStrokes() {
    return this.results.reduce((sum, r) => sum + r.strokes, 0);
  }

  get totalPar() {
    return this.results.reduce((sum, r) => sum + r.par, 0);
  }

  get roundComplete() {
    return this.results.length === this.holes.length;
  }

  summary() {
    const totalStrokes = this.totalStrokes;
    const totalPar = this.totalPar;
    return {
      results: this.results,
      totalStrokes,
      totalPar,
      relative: formatRelative(totalStrokes - totalPar),
      label: roundResultLabel(totalStrokes, totalPar),
    };
  }
}
