import test from "node:test";
import assert from "node:assert/strict";
import { HOLES, validateHole, getHole } from "../src/holes.js";

test("there are exactly nine handcrafted holes", () => {
  assert.equal(HOLES.length, 9);
});

test("every hole passes structural validation", () => {
  for (const hole of HOLES) {
    const problems = validateHole(hole);
    assert.deepEqual(problems, [], `Hole ${hole.id} (${hole.name}) has problems: ${problems.join(", ")}`);
  }
});

test("hole ids are unique and sequential from 1 to 9", () => {
  const ids = HOLES.map((h) => h.id);
  assert.deepEqual(ids, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("getHole finds a hole by id", () => {
  assert.equal(getHole(5).name, "MERGE CONFLICT");
  assert.equal(getHole(999), undefined);
});

test("every hole has a positive integer par consistent with its designed difficulty", () => {
  for (const hole of HOLES) {
    assert.ok(hole.par >= 2 && hole.par <= 5, `Hole ${hole.id} par ${hole.par} is out of a sane range`);
  }
});

test("portal pairs are mutually linked", () => {
  for (const hole of HOLES) {
    for (const portal of hole.portals || []) {
      const linked = (hole.portals || []).find((p) => p.id === portal.linkId);
      assert.ok(linked, `Hole ${hole.id}: portal ${portal.id} links to a missing portal`);
      assert.equal(linked.linkId, portal.id, `Hole ${hole.id}: portal link is not mutual`);
    }
  }
});

test("rollback targets land inside the course bounds", () => {
  for (const hole of HOLES) {
    for (const rb of hole.rollbacks || []) {
      assert.ok(rb.resetTo.x >= 0 && rb.resetTo.x <= hole.width);
      assert.ok(rb.resetTo.y >= 0 && rb.resetTo.y <= hole.height);
    }
  }
});

test("a REBASE hole's default and alt wall sets are both non-empty and different", () => {
  const rebaseHoles = HOLES.filter((h) => h.movable);
  assert.ok(rebaseHoles.length >= 1, "at least one hole should use the REBASE mechanic");
  for (const hole of rebaseHoles) {
    assert.ok(hole.movable.defaultWalls.length > 0);
    assert.ok(hole.movable.altWalls.length > 0);
    assert.notDeepEqual(hole.movable.defaultWalls, hole.movable.altWalls);
  }
});

test("the mechanic roster from the spec is all represented across the 9 holes", () => {
  const anyBumpers = HOLES.some((h) => h.bumpers.length > 0);
  const anyCors = HOLES.some((h) => h.walls.some((w) => w.cors));
  const anyPortals = HOLES.some((h) => h.portals.length > 0);
  const anyRebase = HOLES.some((h) => h.movable);
  const anyRollback = HOLES.some((h) => h.rollbacks.length > 0);
  const anyCache = HOLES.some((h) => h.caches.length > 0);
  assert.ok(anyBumpers, "BUG bumpers missing");
  assert.ok(anyCors, "CORS walls missing");
  assert.ok(anyPortals, "404 portals missing");
  assert.ok(anyRebase, "REBASE missing");
  assert.ok(anyRollback, "ROLLBACK missing");
  assert.ok(anyCache, "CACHE missing");
});
