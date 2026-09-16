import test from "node:test";
import assert from "node:assert/strict";
import { holeResultLabel, roundResultLabel, formatRelative, RoundManager } from "../src/scoring.js";

test("hole-in-one always wins regardless of par", () => {
  assert.equal(holeResultLabel(1, 5), "HOLE IN ONE");
  assert.equal(holeResultLabel(1, 2), "HOLE IN ONE");
});

test("hole result labels follow strokes relative to par", () => {
  assert.equal(holeResultLabel(2, 4), "ONE-LINER"); // -2
  assert.equal(holeResultLabel(3, 4), "10x ENGINEER"); // -1
  assert.equal(holeResultLabel(4, 4), "CLEAN COMMIT"); // par
  assert.equal(holeResultLabel(5, 4), "LGTM"); // +1
  assert.equal(holeResultLabel(6, 4), "NEEDS REVIEW"); // +2
  assert.equal(holeResultLabel(7, 4), "TECH DEBT"); // +3
  assert.equal(holeResultLabel(9, 4), "PRODUCTION INCIDENT"); // +5
});

test("formatRelative", () => {
  assert.equal(formatRelative(0), "E");
  assert.equal(formatRelative(-3), "-3");
  assert.equal(formatRelative(3), "+3");
});

test("roundResultLabel scales with total strokes vs total par", () => {
  assert.equal(roundResultLabel(27, 30), "CLEAN CODE");
  assert.equal(roundResultLabel(30, 30), "MERGED");
  assert.equal(roundResultLabel(34, 30), "REVERT THIS");
});

const holes = [
  { id: 1, name: "H1", par: 3 },
  { id: 2, name: "H2", par: 4 },
  { id: 3, name: "H3", par: 3 },
];

test("RoundManager tracks strokes per hole and totals across a round", () => {
  const round = new RoundManager(holes);
  assert.equal(round.currentHole.id, 1);

  round.registerStroke();
  round.registerStroke();
  const r1 = round.finishHole();
  assert.equal(r1.strokes, 2);
  assert.equal(r1.label, "10x ENGINEER");
  assert.equal(round.isLastHole, false);

  round.advanceHole();
  assert.equal(round.currentHole.id, 2);
  round.registerStroke();
  round.registerStroke();
  round.registerStroke();
  round.registerStroke();
  round.finishHole();

  round.advanceHole();
  assert.equal(round.isLastHole, true);
  round.registerStroke();
  round.registerStroke();
  round.registerStroke();
  round.finishHole();

  assert.equal(round.roundComplete, true);
  const summary = round.summary();
  assert.equal(summary.totalStrokes, 2 + 4 + 3);
  assert.equal(summary.totalPar, 3 + 4 + 3);
  assert.equal(summary.relative, "-1");
});

test("finishHole always counts at least one stroke even if called with zero registered", () => {
  const round = new RoundManager(holes);
  const r = round.finishHole();
  assert.equal(r.strokes, 1);
});

test("reset clears all round state", () => {
  const round = new RoundManager(holes);
  round.registerStroke();
  round.finishHole();
  round.advanceHole();
  round.reset();
  assert.equal(round.holeIndex, 0);
  assert.equal(round.strokesThisHole, 0);
  assert.deepEqual(round.results, []);
});
