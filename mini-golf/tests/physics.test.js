import test from "node:test";
import assert from "node:assert/strict";
import { Ball, stepBall } from "../src/physics.js";
import { STOP_SPEED, BALL_RADIUS } from "../src/constants.js";

test("a launched ball loses speed to friction over time and stops", () => {
  const ball = new Ball(100, 100);
  ball.launch(300, 0);
  let steps = 0;
  while (ball.speed > STOP_SPEED && steps < 6000) {
    stepBall(ball, 1 / 60, {});
    steps++;
  }
  assert.ok(steps < 6000, "ball should come to rest in a bounded number of steps");
  assert.equal(ball.speed, 0);
});

test("a ball never gains energy from friction alone (speed is monotonically non-increasing without collisions)", () => {
  const ball = new Ball(100, 100);
  ball.launch(300, 40);
  let lastSpeed = ball.speed;
  for (let i = 0; i < 30; i++) {
    stepBall(ball, 1 / 60, {});
    assert.ok(ball.speed <= lastSpeed + 1e-6);
    lastSpeed = ball.speed;
  }
});

test("a ball bounces off a flat wall and loses some energy (restitution < 1)", () => {
  const ball = new Ball(90, 100);
  ball.launch(400, 0); // heading straight into a vertical wall at x=100
  const wall = { x1: 100, y1: 0, x2: 100, y2: 200 };
  const speedBefore = ball.speed;

  let bounced = false;
  for (let i = 0; i < 30 && !bounced; i++) {
    const events = stepBall(ball, 1 / 60, { walls: [wall] });
    if (events.some((e) => e.type === "wall")) bounced = true;
  }

  assert.ok(bounced, "the ball should have registered a wall collision");
  assert.ok(ball.vx < 0, "velocity should reverse direction after bouncing off a vertical wall");
  assert.ok(ball.speed < speedBefore, "restitution should be less than 1");
});

test("a ball never tunnels through a thin wall even at high speed", () => {
  const ball = new Ball(50, 100);
  ball.vx = 5000; // deliberately absurd speed to stress-test sub-stepping
  ball.vy = 0;
  const wall = { x1: 100, y1: 0, x2: 100, y2: 200 };
  for (let i = 0; i < 10; i++) {
    stepBall(ball, 1 / 60, { walls: [wall] });
  }
  assert.ok(ball.x < 100, "the ball must not end up on the far side of the wall");
});

test("a bumper adds energy back (restitution > 1) but is capped, never producing NaN or runaway speed", () => {
  const ball = new Ball(100 - 30, 100);
  ball.launch(500, 0);
  const bumper = { x: 100, y: 100, radius: 14, id: "b" };
  let hit = false;
  for (let i = 0; i < 60; i++) {
    const events = stepBall(ball, 1 / 60, { bumpers: [bumper] });
    if (events.some((e) => e.type === "bumper")) hit = true;
    assert.ok(Number.isFinite(ball.x) && Number.isFinite(ball.y));
    assert.ok(Number.isFinite(ball.vx) && Number.isFinite(ball.vy));
    assert.ok(ball.speed < 5000, "speed must never run away unbounded");
  }
  assert.ok(hit, "the ball should have registered a bumper collision");
});

test("the ball radius matches the configured constant by default", () => {
  const ball = new Ball(0, 0);
  assert.equal(ball.radius, BALL_RADIUS);
});

test("a frozen ball (held by CACHE) does not move even under stepBall", () => {
  const ball = new Ball(10, 10);
  ball.launch(200, 0);
  ball.frozen = true;
  const before = { x: ball.x, y: ball.y };
  stepBall(ball, 1 / 60, {});
  assert.deepEqual({ x: ball.x, y: ball.y }, before);
});
