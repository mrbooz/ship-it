import {
  PERFECT_CLEARANCE_PX,
  CHECKPOINT_CLEARS,
  DEPLOY_SPEED_BUMP,
  computeSpeed,
} from "./constants.js";
import { Player, boxesOverlap, xRangesOverlap, verticalClearance } from "./physics.js";
import { ObstacleSpawner } from "./obstacles.js";
import { ScoreManager } from "./scoring.js";
import { Renderer } from "./render.js";
import { AudioController } from "./audio.js";
import {
  loadStats,
  maybeSaveBest,
  maybeSaveBestCombo,
  saveReleasesRecord,
} from "./persistence.js";

const IMPACT_DURATION = 0.22;
const DEPLOY_STEPS = [
  { text: "✓ TESTS PASSED", duration: 0.5 },
  { text: "DEPLOYING...", duration: 0.55 },
  { text: "shipped", duration: 0.75 }, // text filled in dynamically
];
const MAX_DT = 1 / 30; // clamp to avoid huge steps after a hidden tab

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.audio = new AudioController();
    this.player = new Player();
    this.spawner = new ObstacleSpawner();
    this.scoreMgr = new ScoreManager();
    this.stats = loadStats();
    this.listeners = {};
    this.reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.state = "ready";
    this.elapsed = 0;
    this.deployBumps = 0;
    this.impactTimer = 0;
    this.deployStepIndex = 0;
    this.deployTimer = 0;
    this.scrollX = 0;
  }

  on(event, cb) {
    (this.listeners[event] ||= []).push(cb);
  }

  emit(event, payload) {
    for (const cb of this.listeners[event] || []) cb(payload);
  }

  get speed() {
    return computeSpeed(this.elapsed, this.deployBumps);
  }

  start() {
    this.player.reset();
    this.spawner.reset();
    this.scoreMgr.reset();
    this.elapsed = 0;
    this.deployBumps = 0;
    this.scrollX = 0;
    this.state = "playing";
    this.emit("start");
    this.emit("score", { score: 0, best: this.stats.best });
  }

  requestJump() {
    if (this.state === "ready") {
      this.start();
      return;
    }
    if (this.state === "gameover") {
      this.start();
      return;
    }
    if (this.state !== "playing") return; // no jumping mid-cutscene/impact
    if (this.player.jump()) {
      this.audio.jump();
    }
  }

  toggleMute() {
    return this.audio.toggleMute();
  }

  update(dtRaw) {
    const dt = Math.min(dtRaw, MAX_DT);

    if (this.state === "playing") {
      this._updatePlaying(dt);
    } else if (this.state === "deploying") {
      this._updateDeploying(dt);
      this.player.update(dt);
      this.scrollX += this.speed * dt * 0.3;
    } else if (this.state === "impact") {
      this.impactTimer -= dt;
      if (this.impactTimer <= 0) this._finishGameOver();
    } else {
      this.player.update(dt * 0.6);
      this.scrollX += 40 * dt;
    }

    this.renderer.updateParticles(dt);
  }

  _updatePlaying(dt) {
    this.elapsed += dt;
    this.scrollX += this.speed * dt;
    this.player.update(dt);
    this.spawner.update(dt, this.speed);

    for (const o of this.spawner.obstacles) {
      if (o.cleared) continue;

      if (xRangesOverlap(this.player, o)) {
        if (boxesOverlap(this.player, o)) {
          this._triggerCollision();
          return;
        }
        const clearance = verticalClearance(this.player, o);
        if (clearance < o.minClearance) o.minClearance = clearance;
      } else if (o.right <= this.player.left) {
        o.cleared = true;
        this._finalizeClear(o);
      }
    }
  }

  _finalizeClear(o) {
    const perfect = o.minClearance <= PERFECT_CLEARANCE_PX;
    const result = this.scoreMgr.registerClear({ perfect });

    const px = o.left + o.w / 2;
    const py = o.top;
    if (perfect) {
      this.audio.perfect();
      if (result.combo > 1) this.audio.combo(result.combo);
      this.renderer.spawnParticles(px, py, "#ffd166", this.reducedMotion ? 0 : 12);
    }

    this.emit("clear", result);
    this.emit("score", { score: this.scoreMgr.score, best: this.stats.best });
    if (result.flowJustStarted) this.emit("flowStart");
    if (!perfect && this.scoreMgr.combo === 0) this.emit("comboReset");

    if (this.scoreMgr.clearsSinceCheckpoint >= CHECKPOINT_CLEARS) {
      this._startDeployment();
    }
  }

  _startDeployment() {
    this.state = "deploying";
    this.deployStepIndex = 0;
    this.deployTimer = DEPLOY_STEPS[0].duration;
    this.spawner.holdNextSpawn(260);
    this.emit("deployStart", { step: DEPLOY_STEPS[0].text });
  }

  _updateDeploying(dt) {
    this.deployTimer -= dt;
    if (this.deployTimer > 0) return;

    this.deployStepIndex += 1;
    if (this.deployStepIndex >= DEPLOY_STEPS.length) {
      const result = this.scoreMgr.registerDeployment();
      this.deployBumps += DEPLOY_SPEED_BUMP;
      this.spawner.holdNextSpawn(220);
      this.emit("deployEnd", result);
      this.emit("score", { score: this.scoreMgr.score, best: this.stats.best });
      this.state = "playing";
      return;
    }

    const step = DEPLOY_STEPS[this.deployStepIndex];
    this.deployTimer = step.duration;
    if (this.deployStepIndex === 2) {
      this.emit("deployStep", {
        text: `🚀 RELEASE #${this.scoreMgr.releases + 1} SHIPPED`,
      });
    } else {
      this.emit("deployStep", { text: step.text });
    }
  }

  _triggerCollision() {
    this.state = "impact";
    this.impactTimer = IMPACT_DURATION;
    this.scoreMgr.registerCollision();
    this.audio.collision();
    this.renderer.spawnParticles(
      this.player.x + this.player.w / 2,
      this.player.y,
      "#ff6b6b",
      this.reducedMotion ? 0 : 18,
      220
    );
    this.emit("impact");
  }

  _finishGameOver() {
    const best = maybeSaveBest(this.scoreMgr.score);
    const bestCombo = maybeSaveBestCombo(this.scoreMgr.bestComboThisRun);
    saveReleasesRecord(this.scoreMgr.releases);
    this.stats = { ...this.stats, best, bestCombo };
    this.state = "gameover";
    this.emit("gameover", {
      score: this.scoreMgr.score,
      best,
      bestCombo,
      releases: this.scoreMgr.releases,
      isNewBest: this.scoreMgr.score >= best && this.scoreMgr.score > 0,
    });
  }

  render() {
    const r = this.renderer;
    r.drawBackground(this.scrollX, this.scoreMgr.flowState);
    for (const o of this.spawner.obstacles) r.drawObstacle(o);
    r.drawPlayer(this.player, this.scoreMgr.flowState);
    r.drawParticles();
    if (this.state === "impact") {
      r.drawImpactFlash(this.impactTimer / IMPACT_DURATION);
    }
  }
}
