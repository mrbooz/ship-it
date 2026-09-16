import {
  PERFECT_SCORE,
  CLEAR_SCORE,
  DEPLOY_SCORE,
  FLOW_STATE_COMBO_THRESHOLD,
  FLOW_STATE_MULTIPLIER,
} from "./constants.js";

/**
 * Pure scoring/combo/flow-state state machine. No DOM, no timers — the
 * caller drives it with discrete events, which makes it trivial to test.
 */
export class ScoreManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.bestComboThisRun = 0;
    this.releases = 0;
    this.flowState = false;
    this.clearsSinceCheckpoint = 0;
  }

  get multiplier() {
    return this.flowState ? FLOW_STATE_MULTIPLIER : 1;
  }

  /** Register a successfully cleared obstacle. Returns event info for UI/SFX. */
  registerClear({ perfect }) {
    const base = perfect ? PERFECT_SCORE : CLEAR_SCORE;
    const points = base * this.multiplier;
    this.score += points;

    let flowJustStarted = false;
    if (perfect) {
      this.combo += 1;
      this.bestComboThisRun = Math.max(this.bestComboThisRun, this.combo);
      if (!this.flowState && this.combo >= FLOW_STATE_COMBO_THRESHOLD) {
        this.flowState = true;
        flowJustStarted = true;
      }
    } else {
      this.combo = 0;
      this.flowState = false;
    }

    this.clearsSinceCheckpoint += 1;

    return { points, perfect, combo: this.combo, flowJustStarted };
  }

  registerDeployment() {
    this.releases += 1;
    this.score += DEPLOY_SCORE;
    this.clearsSinceCheckpoint = 0;
    return { releases: this.releases, points: DEPLOY_SCORE };
  }

  registerCollision() {
    this.combo = 0;
    this.flowState = false;
  }
}
