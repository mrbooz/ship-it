import test from "node:test";
import assert from "node:assert/strict";

// Minimal DOM/BOM stand-ins so game.js (canvas + audio + matchMedia) can run
// headlessly in Node. Installed before importing Game so any lazy lookups
// at call time resolve correctly.
function fakeCtx() {
  const noop = () => {};
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "canvas") return undefined;
        return noop;
      },
    }
  );
}

function installFakeBrowserGlobals() {
  globalThis.window = {
    devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }),
  };
}
installFakeBrowserGlobals();

const { Game } = await import("../src/game.js");
const { CHECKPOINT_CLEARS, JUMP_AIR_TIME } = await import("../src/constants.js");

function makeFakeCanvas() {
  return {
    width: 0,
    height: 0,
    getContext: () => fakeCtx(),
    getBoundingClientRect: () => ({ width: 960, height: 320 }),
  };
}

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

test("a full run: start, survive, deploy, collide, restart", () => {
  const game = new Game(makeFakeCanvas());
  game.spawner.rng = seededRng(123);
  game.renderer.resize();

  const events = [];
  for (const name of ["start", "clear", "deployStart", "deployEnd", "impact", "gameover"]) {
    game.on(name, (payload) => events.push({ name, payload }));
  }

  game.requestJump(); // ready -> playing
  assert.equal(game.state, "playing");
  assert.equal(events[0].name, "start");

  const dt = 1 / 60;
  let deployed = false;
  let gameOver = false;
  for (let i = 0; i < 20000 && !gameOver; i++) {
    // A simple timing-based autoplay bot: jump once the nearest obstacle
    // gets within a fixed fraction of the jump's air-time-at-current-speed.
    // This exercises the real fairness guarantee end-to-end (obstacle
    // generation must make every sequence survivable by a competent,
    // consistent jump policy) rather than asserting anything about a
    // human's reflexes.
    if (game.state === "playing" && game.player.grounded) {
      const nearest = game.spawner.obstacles.find(
        (o) => !o.cleared && o.right > game.player.left
      );
      if (nearest) {
        const gap = nearest.left - game.player.right;
        const triggerDistance = game.speed * JUMP_AIR_TIME * 0.4;
        if (gap <= triggerDistance && gap > -40) game.requestJump();
      }
    }
    game.update(dt);
    if (game.state === "deploying") deployed = true;
    if (game.state === "gameover") gameOver = true;
  }

  assert.ok(deployed, "a long run should reach at least one deployment checkpoint");
  assert.ok(events.some((e) => e.name === "deployStart"));
  assert.ok(events.some((e) => e.name === "deployEnd"));
  assert.ok(game.scoreMgr.releases >= 1 || gameOver);

  // Restart must work immediately from game over.
  if (gameOver) {
    assert.ok(events.some((e) => e.name === "gameover"));
    const scoreAtGameOver = game.scoreMgr.score;
    game.requestJump();
    assert.equal(game.state, "playing");
    assert.equal(game.scoreMgr.score, 0, "score resets on rebuild");
    assert.notEqual(scoreAtGameOver, undefined);
  }
});

test("checkpoint math: deployment triggers after CHECKPOINT_CLEARS clears", () => {
  const game = new Game(makeFakeCanvas());
  game.renderer.resize();
  game.start();

  for (let i = 0; i < CHECKPOINT_CLEARS - 1; i++) {
    game.scoreMgr.registerClear({ perfect: false });
  }
  assert.equal(game.scoreMgr.clearsSinceCheckpoint, CHECKPOINT_CLEARS - 1);
  game._finalizeClear({ minClearance: 999, left: 0, w: 10, top: 0 });
  assert.equal(game.state, "deploying");
});

test("collision transitions playing -> impact -> gameover without throwing", () => {
  const game = new Game(makeFakeCanvas());
  game.renderer.resize();
  game.start();

  game._triggerCollision();
  assert.equal(game.state, "impact");

  const dt = 1 / 60;
  for (let i = 0; i < 60 && game.state === "impact"; i++) game.update(dt);
  assert.equal(game.state, "gameover");
});

test("no jumping is accepted mid-deployment or mid-impact", () => {
  const game = new Game(makeFakeCanvas());
  game.renderer.resize();
  game.start();

  game._startDeployment();
  const grounded = game.player.grounded;
  game.requestJump();
  assert.equal(game.player.grounded, grounded, "jump input must be ignored during deployment");

  game._triggerCollision();
  game.requestJump();
  assert.equal(game.state, "impact", "jump input must be ignored during impact");
});
