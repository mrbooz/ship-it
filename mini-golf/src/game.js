import { HOLES } from "./holes.js";
import { Ball, stepBall } from "./physics.js";
import { createRuntimeState, activeWalls, applyMechanics } from "./mechanics.js";
import { RoundManager } from "./scoring.js";
import { AudioController } from "./audio.js";
import {
  loadStats,
  maybeSaveBestRound,
  maybeSaveBestForHole,
  recordHoleInOne,
  recordRoundPlayed,
} from "./persistence.js";
import { MAX_SHOT_SPEED } from "./constants.js";

const MAX_STEP_DT = 1 / 30; // clamp so a hidden-tab stutter can't jump physics

export class Game {
  constructor() {
    this.round = new RoundManager(HOLES);
    this.audio = new AudioController();
    this.stats = loadStats();
    this.listeners = {};
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.state = "ready"; // ready | aiming | moving | hole-result | round-complete
    this.aimPreview = null; // {dirX, dirY, power} while dragging, set by input.js
    this.pendingHoleResult = null;
    this.loadHole(HOLES[0]);
  }

  on(event, cb) {
    (this.listeners[event] ||= []).push(cb);
  }
  emit(event, payload) {
    for (const cb of this.listeners[event] || []) cb(payload);
  }

  loadHole(hole) {
    this.hole = hole;
    this.ball = new Ball(hole.start.x, hole.start.y);
    this.mechState = createRuntimeState(hole);
    this.state = "aiming";
    this.emit("holeLoaded", hole);
  }

  startRound() {
    this.round.reset();
    this.loadHole(HOLES[0]);
    this.emit("roundStart");
  }

  toggleMute() {
    return this.audio.toggleMute();
  }

  // --- Aiming -------------------------------------------------------

  canAim() {
    return this.state === "aiming";
  }

  /** direction is the unit vector the ball should travel (already flipped
   * from the drag vector by the caller); power is 0..1. */
  shoot(dirX, dirY, power) {
    if (!this.canAim()) return;
    const speed = power * MAX_SHOT_SPEED;
    this.ball.launch(dirX * speed, dirY * speed);
    this.round.registerStroke();
    this.aimPreview = null;
    this.state = "moving";
    this.audio.putt(power);
    this.emit("shot", { power });
  }

  // --- Simulation -----------------------------------------------------

  update(dtRaw) {
    if (this.state !== "moving") return;
    const dt = Math.min(dtRaw, MAX_STEP_DT);

    const walls = activeWalls(this.hole, this.mechState);
    const physicsEvents = stepBall(this.ball, dt, { walls, bumpers: this.hole.bumpers });
    for (const e of physicsEvents) {
      if (e.type === "wall") {
        e.cors ? this.audio.cors() : this.audio.wallBounce();
        this.emit("wallHit", e);
      } else if (e.type === "bumper") {
        this.audio.bumper();
        this.emit("bumperHit", e);
      }
    }

    const mechEvents = applyMechanics(this.ball, this.hole, this.mechState, dt);
    for (const e of mechEvents) {
      if (e.type === "portal") {
        this.audio.portal();
        this.emit("portal");
      } else if (e.type === "rebase") {
        this.audio.rebase();
        this.emit("rebase", { rebased: this.mechState.rebased });
      } else if (e.type === "rollback") {
        this.audio.rollback();
        this.emit("rollback");
      } else if (e.type === "cache-enter") {
        this.audio.cache();
        this.emit("cacheEnter");
      } else if (e.type === "cache-release") {
        this.emit("cacheRelease");
      } else if (e.type === "captured") {
        this._finishHole();
        return;
      }
    }

    if (!this.ball.isMoving && !this.mechState.captured) {
      this.state = "aiming";
      this.emit("ballStopped");
    }
  }

  _finishHole() {
    const result = this.round.finishHole();
    const isHoleInOne = result.strokes === 1;
    this.audio.holed(isHoleInOne);
    maybeSaveBestForHole(result.holeId, result.strokes);
    if (isHoleInOne) recordHoleInOne();
    this.pendingHoleResult = result;
    this.state = "hole-result";
    this.emit("holeComplete", result);
  }

  /** Called by the UI once the player dismisses the hole-result screen. */
  continueAfterHole() {
    if (this.state !== "hole-result") return;
    if (this.round.isLastHole) {
      recordRoundPlayed();
      const summary = this.round.summary();
      const { isNewBest } = maybeSaveBestRound(summary.totalStrokes, summary.totalPar);
      this.stats = loadStats();
      this.state = "round-complete";
      this.emit("roundComplete", { ...summary, isNewBest });
      return;
    }
    this.round.advanceHole();
    this.loadHole(this.round.currentHole);
  }
}
