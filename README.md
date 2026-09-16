# SHIP IT

**Your agent codes. You survive production.**

A tiny one-button developer arcade game, meant for the couple of minutes
you're waiting on a long-running Codex/Claude Code task. Jump the bugs.
Chain PERFECT clears into FLOW STATE. Ship releases. Try to beat your best.

Play it live: **https://ship-it-prod-2026.web.app**

## Install as a plugin

**Claude Code:**
```
/plugin marketplace add mrbooz/ship-it
/plugin install ship-it@ship-it
```
Then start a new session and ask Claude to "open Ship It."

**Codex** (via the ChatGPT desktop app):
```
codex plugin marketplace add mrbooz/ship-it
```
Then start a new thread and ask it to "open Ship It." (No `codex` CLI on
your machine? Open the ChatGPT app → Plugins tab → Personal, once your
personal marketplace has been pointed at this repo the same way.)

Either way, the plugin just opens the live URL above in your browser —
there's no deeper integration, and the game works identically with or
without it. See [`codex-integration/NOTES.md`](codex-integration/NOTES.md)
for exactly what is and isn't possible here.

## What it is

An endless runner where your character auto-runs through a software
deployment pipeline and you press one button to jump. Obstacles are
developer disasters — `BUG`, `404`, `500`, `NULL`, `CORS`, `npm ERR!`,
`FAILED TEST`, `undefined`, `<<<<<<<`, `MERGE CONFLICT` — plus a handful of
rare cosmetic jokes (`LGTM`, `Friday deploy`, `it worked on my machine`, ...).
Clear obstacles with tight timing for a PERFECT; chain five PERFECTs into
FLOW STATE (2x score); survive long enough between obstacles and you hit a
deployment checkpoint (`✓ TESTS PASSED` → `DEPLOYING...` → `🚀 RELEASE
SHIPPED`) for a score bonus. Difficulty is endless — speed and obstacle
density keep climbing for as long as you survive, with no ceiling.

Local best score, best combo, and sound preference persist in your browser
(`localStorage`). There's also a **public global leaderboard** — see below.

## Controls

- **Space**, **↑**, or **W** to jump (also restarts instantly from game over)
- **Click / tap** the game to jump or restart
- 🔊/🔇 button to toggle sound (never autoplays; the whole game works muted)
- 🏆 button to view the global leaderboard and set your display name

## Run it locally

No build step, no framework, no dependencies.

```bash
npm run dev
```

Then open the printed `http://localhost:4550` URL. `npm run dev` just
starts a zero-dependency static file server (`server.js`) — you can equally
open `index.html` directly, or serve the folder with any static server.

## Testing

```bash
npm test
```

Runs on Node's built-in test runner (`node --test`) — no test framework
dependency. 44 tests cover:

- jump physics (gravity, single-jump-only, apex height)
- collision and clearance detection
- obstacle spawn-gap fairness (a mathematical invariant: every generated
  gap always leaves enough time to jump, land, and react, at any speed or
  difficulty — see `tests/obstacles.test.js`)
- endless difficulty progression (speed and gap-tightening curves)
- scoring, PERFECT detection, combo, and FLOW STATE
- deployment checkpoints and restart/reset behavior
- persistence (including storage-unavailable fallback paths)
- a full simulated playthrough (start → survive → deploy → collide →
  restart) driven by a timing-based autoplay bot

## Architecture

Plain HTML/CSS/JS (ES modules), Canvas for the game world, DOM for HUD and
screens (better text crispness and accessibility than drawing it all on
canvas). No bundler, no UI framework — the whole game is ~1500 lines.

```
index.html          Page shell, HUD markup, screens (ready/game-over/leaderboard)
styles.css           All styling; dark-only by design (see note below)
server.js            Zero-dependency static file server for local dev
src/
  constants.js        Every tunable number in one place (physics, scoring,
                       difficulty curves) — see inline comments for the
                       fairness invariant obstacle spacing must preserve
  physics.js           Player gravity/jump/collision (pure, DOM-free)
  obstacles.js         Obstacle types + spawner (pure, DOM-free)
  scoring.js            Score/combo/flow-state state machine (pure)
  persistence.js        localStorage wrapper, safe when storage is unavailable
  leaderboard.js         Public global leaderboard client (Firebase Firestore)
  audio.js               Synthesized WebAudio SFX (no audio files/licensing)
  render.js               Canvas rendering (background, player, obstacles, particles)
  input.js                 Keyboard/pointer wiring, scoped to the game container
  game.js                   Orchestrates the above into one state machine
  main.js                    DOM glue: wires Game events to the HUD/screens
tests/                Node test-runner specs, one file per module above
codex-integration/    Notes on what's investigated re: Codex integration
```

The dark, terminal-style visual language is a fixed art choice (not a
theme toggle) — see the comment at the top of `styles.css` for why: the
canvas world is drawn with hardcoded dark colors, so a light-mode DOM
overlay on top of it would visually clash rather than actually help
anyone.

## Global leaderboard

Backed by a real, publicly hosted Firebase project — genuinely public, no
Claude/Anthropic/OpenAI account, no login for players:

- **Firestore** (`scores` collection) stores `{name, score, releases,
  bestCombo, createdAt}` rows. Security rules (`firestore.rules`) make it
  append-only and publicly readable: anyone can read the top scores, a
  write must match a validated shape (score/releases/combo capped and
  numeric, name 1–20 chars, server timestamp required), and **no client can
  ever edit or delete an existing row** — including its own — so no one can
  tamper with another player's entry.
- **Firebase Hosting** serves the static site itself at
  `ship-it-prod-2026.web.app`.
- On game over, the run is submitted automatically under a randomly
  generated nickname (e.g. `swift-otter-42`) stored in `localStorage` — no
  prompt, no interruption to the death → rebuild loop. Open the 🏆 panel
  any time to see the top 10 and change your display name.
- If the leaderboard is unreachable (offline, ad blocker, Firebase outage),
  everything above degrades silently — the game is fully playable and
  enjoyable with zero network access. Submission/fetch failures are logged
  to the console and nothing else.

There's necessarily no anti-cheat beyond the Firestore rules' shape/range
validation: a determined client could still submit a plausible-looking
fake score. That's an accepted tradeoff for "no accounts, no backend logic
beyond a database" — treat it as a friendly leaderboard, not a
competitive-integrity one.

## Codex integration

Read `codex-integration/NOTES.md` for the full investigation. Short
version: this machine has a real local Codex plugin/skill system
(`~/plugins/`, `~/.agents/plugins/marketplace.json`, `.codex-plugin/
plugin.json`), and SHIP IT ships a plugin there (`~/plugins/ship-it`) whose
one skill opens the game's URL. There is **no** documented Codex lifecycle
API (task started/finished/needs-input) exposed to third-party plugins —
the plugin manifest's `hooks` field is explicitly rejected by validation,
and the `apps` field that lets a plugin render its own persistent view is
scoped to OpenAI-issued connector ids from their Apps SDK, not something a
local plugin can self-register. So: **no auto-pause/auto-resume tied to
Codex's task state** — the game is opened and closed manually, and is a
completely ordinary website that works the same with or without Codex
installed.

## Known limitations

- Global leaderboard has no anti-cheat beyond basic Firestore rule
  validation (see above).
- No composer icon/logo assets for the Codex plugin listing (optional
  fields, intentionally left out rather than filled with placeholder art).
- Canvas rendering isn't screen-reader-accessible by itself; the HUD,
  screens, and score announcements are real DOM/ARIA-live text specifically
  so the game's state is available without seeing the canvas, but the
  moment-to-moment obstacle telegraphing is inherently visual (true of
  basically every reflex arcade game).
