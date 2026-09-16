import { Game } from "./game.js";
import { attachInput } from "./input.js";
import { Leaderboard, getPlayerName, setPlayerName } from "./leaderboard.js";

const stage = document.getElementById("stage");
const canvas = document.getElementById("game");
const game = new Game(canvas);
const leaderboard = new Leaderboard();

attachInput(stage, game);

const el = {
  score: document.getElementById("stat-score"),
  best: document.getElementById("stat-best"),
  release: document.getElementById("stat-release"),
  popup: document.getElementById("popup"),
  flowBanner: document.getElementById("flow-banner"),
  deployToast: document.getElementById("deploy-toast"),
  deployText: document.getElementById("deploy-text"),
  screenReady: document.getElementById("screen-ready"),
  screenGameover: document.getElementById("screen-gameover"),
  goScore: document.getElementById("go-score"),
  goBest: document.getElementById("go-best"),
  goReleases: document.getElementById("go-releases"),
  goCombo: document.getElementById("go-combo"),
  goNewBest: document.getElementById("go-newbest"),
  rebuildBtn: document.getElementById("rebuild-btn"),
  muteBtn: document.getElementById("mute-btn"),
  srStatus: document.getElementById("sr-status"),
  trophyBtn: document.getElementById("trophy-btn"),
  screenLeaderboard: document.getElementById("screen-leaderboard"),
  lbList: document.getElementById("lb-list"),
  lbNameInput: document.getElementById("lb-name-input"),
  lbSaveBtn: document.getElementById("lb-save-btn"),
  lbCloseBtn: document.getElementById("lb-close-btn"),
  lbSubmitStatus: document.getElementById("lb-submit-status"),
};

el.best.textContent = game.stats.best.toLocaleString();

function announce(text) {
  el.srStatus.textContent = text;
}

function popPopup(text) {
  el.popup.textContent = text;
  el.popup.classList.remove("show");
  // Force reflow so the animation restarts on rapid consecutive perfects.
  void el.popup.offsetWidth;
  el.popup.classList.add("show");
}

game.on("start", () => {
  el.screenReady.hidden = true;
  el.screenGameover.hidden = true;
  el.screenLeaderboard.hidden = true;
  el.flowBanner.classList.remove("show");
});

game.on("clear", (result) => {
  if (result.perfect) {
    popPopup(result.combo > 1 ? `PERFECT ×${result.combo}` : "PERFECT");
    announce(`Perfect jump, combo ${result.combo}`);
  }
});

game.on("flowStart", () => {
  el.flowBanner.classList.add("show");
  announce("Flow state activated");
});

game.on("comboReset", () => {
  el.flowBanner.classList.remove("show");
});

game.on("deployStart", ({ step }) => {
  el.deployText.textContent = step;
  el.deployToast.classList.add("show");
});

game.on("deployStep", ({ text }) => {
  el.deployText.textContent = text;
});

game.on("deployEnd", ({ releases }) => {
  el.deployToast.classList.remove("show");
  announce(`Release ${releases} shipped`);
});

game.on("impact", () => {
  announce("Build failed");
});

game.on("gameover", (stats) => {
  el.goScore.textContent = Math.round(stats.score).toLocaleString();
  el.goBest.textContent = Math.round(stats.best).toLocaleString();
  el.goReleases.textContent = stats.releases;
  el.goCombo.textContent = stats.bestCombo;
  el.goNewBest.hidden = !stats.isNewBest;
  el.screenGameover.hidden = false;
  el.flowBanner.classList.remove("show");
  announce(
    `Build failed. Score ${Math.round(stats.score)}. Best ${Math.round(stats.best)}.`
  );
  submitToLeaderboard(stats);
});

// --- Global leaderboard -----------------------------------------------

async function submitToLeaderboard(stats) {
  if (stats.score <= 0) return;
  el.lbSubmitStatus.textContent = "";
  const ok = await leaderboard.submit(stats);
  if (ok) {
    el.lbSubmitStatus.textContent = `Submitted to the global leaderboard as ${getPlayerName()}`;
  }
  // A failed/unavailable submit stays silent here — the game must stay fully
  // enjoyable offline; the trophy panel simply won't have fresh data.
}

async function renderLeaderboard() {
  el.lbList.innerHTML = `<li class="lb-empty">Loading…</li>`;
  const top = await leaderboard.fetchTop(10);
  if (top.length === 0) {
    el.lbList.innerHTML = `<li class="lb-empty">No scores yet — be the first to ship.</li>`;
    return;
  }
  el.lbList.innerHTML = top
    .map((row, i) => {
      const name = escapeHtml(String(row.name || "anonymous").slice(0, 20));
      const score = Math.round(row.score || 0).toLocaleString();
      return `<li><span class="lb-rank">#${i + 1}</span><span class="lb-name">${name}</span><span class="lb-score">${score}</span></li>`;
    })
    .join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

el.trophyBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  el.lbNameInput.value = getPlayerName();
  el.screenLeaderboard.hidden = false;
  renderLeaderboard();
});

el.lbCloseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  el.screenLeaderboard.hidden = true;
  stage.focus();
});

el.lbSaveBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const saved = setPlayerName(el.lbNameInput.value);
  el.lbNameInput.value = saved;
});

el.lbNameInput.addEventListener("keydown", (e) => {
  e.stopPropagation(); // don't let Space/typing reach the game's jump handler
  if (e.key === "Enter") el.lbSaveBtn.click();
});
el.lbNameInput.addEventListener("pointerdown", (e) => e.stopPropagation());

el.rebuildBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  game.requestJump();
});

el.muteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const muted = game.toggleMute();
  syncMuteButton(muted);
});

function syncMuteButton(muted) {
  el.muteBtn.textContent = muted ? "🔇" : "🔊";
  el.muteBtn.setAttribute("aria-pressed", String(muted));
}
syncMuteButton(game.audio.muted);

function resize() {
  game.renderer.resize();
}
window.addEventListener("resize", resize);
if (window.ResizeObserver) {
  new ResizeObserver(resize).observe(stage);
} else {
  resize();
}
resize();

stage.focus();

let lastTime = null;
function frame(t) {
  if (lastTime == null) lastTime = t;
  const dt = (t - lastTime) / 1000;
  lastTime = t;

  // The leaderboard panel acts as a simple pause: freeze simulation and
  // rendering while it's open so nothing can kill the player off-screen.
  if (!el.screenLeaderboard.hidden) {
    requestAnimationFrame(frame);
    return;
  }

  game.update(dt);
  game.render();

  el.score.textContent = Math.round(game.scoreMgr.score).toLocaleString();
  el.release.textContent = game.scoreMgr.releases;

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") lastTime = null;
});
