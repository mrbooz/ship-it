import { loadMuted, saveMuted } from "./persistence.js";

/**
 * Minimal synthesized SFX via WebAudio — no audio files to license or load.
 * The AudioContext is created lazily on the first user gesture (the first
 * jump) so nothing ever autoplays before interaction.
 */
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

  setMuted(value) {
    this.muted = value;
    saveMuted(this.muted);
  }

  _tone({ freq, duration, type = "square", gain = 0.08, sweep = 0 }) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (sweep) {
      osc.frequency.linearRampToValueAtTime(freq + sweep, ctx.currentTime + duration);
    }
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  jump() {
    this._tone({ freq: 420, duration: 0.09, type: "square", sweep: 180 });
  }

  perfect() {
    this._tone({ freq: 880, duration: 0.12, type: "triangle", sweep: 220, gain: 0.09 });
  }

  combo(level) {
    const freq = 660 + Math.min(level, 8) * 40;
    this._tone({ freq, duration: 0.08, type: "triangle", gain: 0.07 });
  }

  deploy() {
    this._tone({ freq: 260, duration: 0.28, type: "sine", sweep: 340, gain: 0.1 });
  }

  collision() {
    this._tone({ freq: 160, duration: 0.28, type: "sawtooth", sweep: -110, gain: 0.12 });
  }
}
