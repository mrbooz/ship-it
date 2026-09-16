import { Game } from "./game.js";
import { Renderer } from "./render.js";
import { attachInput } from "./input.js";
import { formatRelative } from "./scoring.js";
import { OVERDRIVE_POWER, MEGA_SHOT_POWER } from "./constants.js";

const stage = document.getElementById("stage");
const canvas = document.getElementById("course");
const game = new Game();
const renderer = new Renderer(canvas);
renderer.setHole(game.hole);
attachInput(canvas, game, renderer);

const el = {
  statHole: document.getElementById("stat-hole"),
  statPar: document.getElementById("stat-par"),
  statStrokes: document.getElementById("stat-strokes"),
  holeName: document.getElementById("hole-name"),
  screenReady: document.getElementById("screen-ready"),
  startBtn: document.getElementById("start-btn"),
  screenHoleResult: document.getElementById("screen-hole-result"),
  hrHoleName: document.getElementById("hr-hole-name"),
  hrLabel: document.getElementById("hr-label"),
  hrDetail: document.getElementById("hr-detail"),
  continueBtn: document.getElementById("continue-btn"),
  screenRoundComplete: document.getElementById("screen-round-complete"),
  rcScore: document.getElementById("rc-score"),
  rcLabel: document.getElementById("rc-label"),
  rcBest: document.getElementById("rc-best"),
  scorecard: document.getElementById("scorecard"),
  playAgainBtn: document.getElementById("play-again-btn"),
  muteBtn: document.getElementById("mute-btn"),
  srStatus: document.getElementById("sr-status"),
  popup: document.getElementById("popup"),
  powerMeter: document.getElementById("power-meter"),
  powerFill: document.getElementById("power-fill"),
};

function announce(text) {
  el.srStatus.textContent = text;
}

function popPopup(text) {
  el.popup.textContent = text;
  el.popup.classList.remove("show");
  void el.popup.offsetWidth; // restart the animation on rapid repeats
  el.popup.classList.add("show");
}

function syncHud() {
  el.statHole.textContent = `${game.round.holeIndex + 1}/9`;
  el.statPar.textContent = game.hole.par;
  el.statStrokes.textContent = game.round.strokesThisHole;
  el.holeName.textContent = game.hole.name;
}

game.on("roundStart", () => {
  el.screenReady.hidden = true;
  el.screenHoleResult.hidden = true;
  el.screenRoundComplete.hidden = true;
});

game.on("holeLoaded", (hole) => {
  renderer.setHole(hole);
  syncHud();
});

game.on("shot", ({ power }) => {
  syncHud();
  if (power >= MEGA_SHOT_POWER) {
    popPopup("💥 MEGA COMMIT");
    renderer.spawnParticles(game.ball.pos, "#ffd166", 20);
  }
});
game.on("ballStopped", () => syncHud());

game.on("wallHit", (e) => {
  if (e.cors) {
    popPopup("BLOCKED BY CORS");
    renderer.spawnParticles(game.ball.pos, "#ff6b6b", 8);
  }
});
game.on("bumperHit", () => renderer.spawnParticles(game.ball.pos, "#ffd166", 10));
game.on("portal", () => popPopup("404"));
game.on("rebase", ({ rebased }) => popPopup(rebased ? "REBASED" : "REBASE UNDONE"));
game.on("rollback", () => popPopup("ROLLBACK"));
game.on("cacheEnter", () => popPopup("CACHED..."));
game.on("cacheRelease", () => popPopup("CACHE RELEASED"));

game.on("holeComplete", (result) => {
  renderer.spawnParticles(game.hole.main, "#2ecc9c", result.strokes === 1 ? 24 : 14);
  el.hrHoleName.textContent = result.name;
  el.hrLabel.textContent = result.label;
  el.hrDetail.textContent = `PAR ${result.par} · ${result.strokes} STROKE${result.strokes === 1 ? "" : "S"}`;
  el.screenHoleResult.hidden = false;
  announce(`${result.name} complete. ${result.label}. ${result.strokes} strokes, par ${result.par}.`);
});

game.on("roundComplete", (summary) => {
  el.screenHoleResult.hidden = true;
  el.rcScore.innerHTML = `${summary.totalStrokes} <span class="rc-relative">(${formatRelative(summary.totalStrokes - summary.totalPar)})</span>`;
  el.rcLabel.textContent = summary.label;
  el.rcBest.hidden = !summary.isNewBest;
  el.scorecard.innerHTML = summary.results
    .map(
      (r) =>
        `<div class="sc-row"><span>${r.name}</span><span>${r.strokes}/${r.par}</span><span>${r.label}</span></div>`
    )
    .join("");
  el.screenRoundComplete.hidden = false;
  announce(`Round complete. ${summary.totalStrokes} strokes, ${summary.label}.`);
});

el.startBtn.addEventListener("click", () => {
  el.screenReady.hidden = true;
  game.startRound();
});

el.continueBtn.addEventListener("click", () => {
  el.screenHoleResult.hidden = true;
  game.continueAfterHole();
});

el.playAgainBtn.addEventListener("click", () => {
  el.screenRoundComplete.hidden = true;
  game.startRound();
});

el.muteBtn.addEventListener("click", () => {
  const muted = game.toggleMute();
  el.muteBtn.textContent = muted ? "🔇" : "🔊";
  el.muteBtn.setAttribute("aria-pressed", String(muted));
});
el.muteBtn.textContent = game.audio.muted ? "🔇" : "🔊";
el.muteBtn.setAttribute("aria-pressed", String(game.audio.muted));

function resize() {
  renderer.resize();
}
window.addEventListener("resize", resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
resize();

let lastTime = null;
function frame(t) {
  if (lastTime == null) lastTime = t;
  const dt = (t - lastTime) / 1000;
  lastTime = t;

  game.update(dt);
  renderer.updateParticles(dt);
  renderer.draw(game.hole, game.ball, game.mechState, game.aimPreview);

  if (game.aimPreview) {
    el.powerMeter.hidden = false;
    const pct = Math.min(1, game.aimPreview.power / OVERDRIVE_POWER) * 100;
    el.powerFill.style.width = `${pct}%`;
    el.powerMeter.classList.toggle("mega", game.aimPreview.power >= MEGA_SHOT_POWER);
  } else {
    el.powerMeter.hidden = true;
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") lastTime = null;
});
