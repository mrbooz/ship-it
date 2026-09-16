import { loadMuted, saveMuted } from "./persistence.js";

/** Synthesized SFX via WebAudio — same approach as SHIP IT's audio.js. */
export class AudioController {
  constructor() {
    this.ctx = null;
    this.muted = loadMuted();
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    saveMuted(this.muted);
    return this.muted;
  }

  _tone({ freq, duration, type = "sine", gain = 0.08, sweep = 0 }) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweep) osc.frequency.linearRampToValueAtTime(freq + sweep, ctx.currentTime + duration);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  putt(power) {
    if (power >= 1.2) {
      this._tone({ freq: 150, duration: 0.16, type: "sawtooth", sweep: 260, gain: 0.12 });
    } else {
      this._tone({ freq: 200 + power * 200, duration: 0.08, type: "triangle", gain: 0.09 });
    }
  }
  wallBounce() {
    this._tone({ freq: 320, duration: 0.05, type: "square", gain: 0.05 });
  }
  bumper() {
    this._tone({ freq: 520, duration: 0.09, type: "square", sweep: 120, gain: 0.09 });
  }
  cors() {
    this._tone({ freq: 140, duration: 0.16, type: "sawtooth", gain: 0.08 });
  }
  portal() {
    this._tone({ freq: 700, duration: 0.15, type: "sine", sweep: -400, gain: 0.08 });
  }
  rebase() {
    this._tone({ freq: 300, duration: 0.12, type: "triangle", sweep: 200, gain: 0.08 });
  }
  rollback() {
    this._tone({ freq: 400, duration: 0.14, type: "sawtooth", sweep: -250, gain: 0.08 });
  }
  cache() {
    this._tone({ freq: 900, duration: 0.1, type: "sine", gain: 0.06 });
  }
  holed(isHoleInOne) {
    if (isHoleInOne) {
      this._tone({ freq: 660, duration: 0.35, type: "triangle", sweep: 440, gain: 0.11 });
    } else {
      this._tone({ freq: 520, duration: 0.22, type: "triangle", sweep: 180, gain: 0.1 });
    }
  }
}
