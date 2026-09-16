# ARCADE

Two tiny developer-themed games, meant for the couple of minutes you're
waiting on a long-running Codex/Claude Code task.

- **[SHIP IT](#ship-it)** — one-button endless runner. Your agent codes.
  You survive production.
- **[MERGE CONFLICT MINI GOLF ⛳](#merge-conflict-mini-golf)** — developer
  mini golf. Get your commit into main.

Play them live: **https://ship-it-prod-2026.web.app/arcade/**

## Install as a plugin

**Claude Code:**
```
/plugin marketplace add mrbooz/ship-it
/plugin install ship-it@ship-it
```
Then start a new session and ask Claude to "open the arcade" (or name a
game directly — "open Ship It", "launch mini golf").

**Codex** (via the ChatGPT desktop app):
```
codex plugin marketplace add mrbooz/ship-it
```
Then start a new thread and ask it the same way. (No `codex` CLI on your
machine? Open the ChatGPT app → Plugins tab → Personal, once your personal
marketplace has been pointed at this repo the same way.)

Either way, the plugin just opens a live URL in your browser — there's no
deeper integration, and both games work identically with or without it.
See [`codex-integration/NOTES.md`](codex-integration/NOTES.md) for exactly
what is and isn't possible here.

## Run locally

No build step, no framework, no dependencies, for either game.

```bash
npm run dev
```

Opens `http://localhost:4550`. `npm run dev` starts a zero-dependency
static file server (`server.js`) serving the whole repo — SHIP IT at `/`,
the arcade picker at `/arcade/`, mini golf at `/mini-golf/`.

## Repo layout

```
index.html, artifact.html, styles.css, src/, tests/   SHIP IT (repo root)
arcade/                                                the two-card launcher page
mini-golf/                                             MERGE CONFLICT MINI GOLF (self-contained)
server.js                                              shared zero-dependency dev server
.claude-plugin/, SKILL.md, scripts/                    Claude Code plugin (repo root doubles as the plugin)
plugins/ship-it/, .agents/                              Codex plugin (self-hosted repo marketplace)
codex-integration/                                     Codex integration research notes + submission prep
```

---

# SHIP IT

**Your agent codes. You survive production.**

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

Play it live: **https://ship-it-prod-2026.web.app**

## Controls

- **Space**, **↑**, or **W** to jump (also restarts instantly from game over)
- **Click / tap** the game to jump or restart
- 🔊/🔇 button to toggle sound (never autoplays; the whole game works muted)
- 🏆 button to view the global leaderboard and set your display name

## Testing

```bash
npm test
```

Runs on Node's built-in test runner (`node --test`) — no test framework
dependency. 44 tests cover jump physics, collision/clearance detection, the
obstacle spawn-gap fairness invariant (every generated gap always leaves
enough time to jump/land/react, at any speed or difficulty), endless
difficulty progression, scoring/PERFECT/combo/FLOW STATE, deployment
checkpoints, restart/reset, persistence fallback paths, and a full
simulated playthrough driven by a timing-based autoplay bot.

## Architecture

Plain HTML/CSS/JS (ES modules), Canvas for the game world, DOM for HUD and
screens (better text crispness and accessibility than drawing it all on
canvas). No bundler, no UI framework.

```
index.html          Page shell, HUD markup, screens (ready/game-over/leaderboard)
styles.css           All styling; dark-only by design (see note below)
src/
  constants.js        Every tunable number (physics, scoring, difficulty
                       curves) — see inline comments for the fairness
                       invariant obstacle spacing must preserve
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
  ever edit or delete an existing row** — including its own.
- **Firebase Hosting** serves the whole arcade at `ship-it-prod-2026.web.app`.
- On game over, the run is submitted automatically under a randomly
  generated nickname (e.g. `swift-otter-42`) stored in `localStorage` — no
  prompt, no interruption to the death → rebuild loop. Open the 🏆 panel
  any time to see the top 10 and change your display name.
- If the leaderboard is unreachable (offline, ad blocker, Firebase outage,
  or the sandboxed CSP inside a Claude Artifact), everything degrades
  silently — the game is fully playable and enjoyable with zero network
  access.

There's necessarily no anti-cheat beyond the Firestore rules' shape/range
validation — treat it as a friendly leaderboard, not a competitive-integrity
one.

---

# MERGE CONFLICT MINI GOLF

**Get your commit into main.**

Developer mini golf: the ball is your **commit**, the hole is **main**.
Drag back from the ball to aim, release to putt. Nine handcrafted holes
where developer concepts are actual physics, not just labels painted on
ordinary mini golf:

| Mechanic | Behavior |
|---|---|
| 🐛 **BUG** | A bouncy bumper — redirects the ball, can be used for trick shots |
| **404** | A portal pair — enter one, exit the other, velocity preserved |
| **CORS** | A blocking wall — route around it, don't fight it |
| **MERGE CONFLICT** | The course forks into a safe long route and a risky short one |
| **REBASE** | A trigger that swaps part of the course's geometry |
| **ROLLBACK** | Touch it and you're reset to a defined earlier point — never further back than that, never a loop |
| **CACHE** | Freezes the ball briefly, then releases it with its original velocity |

## The 9 holes

1. **HELLO WORLD** (par 2) — teaches aim, power, and a wall bounce
2. **BUG FIX** (par 3) — three bumpers guard the direct line
3. **CORS** (par 3) — a blocking wall forces a bank shot
4. **404** (par 3) — a portal shortcut, or the long way around
5. **MERGE CONFLICT** (par 4) — safe branch vs. risky branch
6. **REBASE** (par 3) — trigger the switch to open the path
7. **DEPENDENCY HELL** (par 4) — CORS + bumpers + a portal, combined
8. **FRIDAY DEPLOY** (par 4) — a narrow risky shortcut vs. a long safe loop
9. **PRODUCTION** (par 5) — the finale: cache, portal, and a bumper gauntlet

## Scoring

Golf scoring underneath, developer language on top: strokes relative to
par become `HOLE IN ONE`, `ONE-LINER` (-2), `10x ENGINEER` (-1), `CLEAN
COMMIT` (par), `LGTM` (+1), `NEEDS REVIEW` (+2), `TECH DEBT` (+3), or
`PRODUCTION INCIDENT` (worse). The full 9-hole round gets its own label
from `CLEAN CODE` down to `REVERT THIS`. Best round, best score per hole,
and hole-in-one count persist locally — no account, no backend.

## Controls

Click/touch-drag back from the ball and release — power comes from drag
distance (consistent across holes regardless of zoom), direction from drag
angle. Drag past the "normal" full-power distance to keep charging up to a
1.6x **overdrive** hit for a genuinely huge shot (with its own sound, color,
and particle burst).

Play it live: **https://ship-it-prod-2026.web.app/mini-golf/**

## Testing

```bash
npm run test:mini-golf
```

42 tests: vector math, wall/bumper collision + restitution, friction
stopping, adaptive sub-stepping (a ball can't tunnel through a thin wall
even at absurd speed), every trigger mechanic (portal teleport + cooldown,
REBASE toggle + re-arm, ROLLBACK reset, CACHE hold/release, MAIN capture
speed gate), structural validation of all 9 holes (in-bounds start/main,
mutual portal links, every mechanic from the spec represented at least
once), scoring labels, and an automated **playability** pass — a
shot-searching bot (not just "aim at the hole": it also considers aiming at
portal mouths) proves every hole is actually completable, not just
structurally valid.

## Architecture

Same philosophy as SHIP IT: plain HTML/CSS/JS, Canvas for the course, DOM
for HUD/screens, zero dependencies, dark-only by design.

```
mini-golf/
  index.html         Page shell, HUD, screens (ready/hole-result/round-complete)
  styles.css          Styling
  src/
    vec.js             2D vector math (pure)
    constants.js        Every tunable number (friction, restitution, power, mechanic radii)
    physics.js           Ball + wall/bumper collision, adaptive sub-stepping (pure)
    mechanics.js          Portal/REBASE/ROLLBACK/CACHE/MAIN-capture trigger logic (pure)
    holes.js               The 9 handcrafted hole definitions + structural validator
    scoring.js               Par-relative labels + RoundManager (pure)
    persistence.js            localStorage wrapper (best round/hole, hole-in-ones)
    audio.js                  Synthesized WebAudio SFX
    render.js                  Canvas rendering (course, mechanics, ball, trail, particles)
    input.js                   Drag-to-aim, screen-space power (scale-invariant across holes)
    game.js                    Orchestrates physics + mechanics + scoring into one state machine
    main.js                    DOM glue
  tests/               Node test-runner specs, including the playability simulation
```

Every hole is hand-placed data in `holes.js`, not procedurally generated.
The physics engine and mechanic handlers are generic — one engine, nine
data files.

---

## Codex integration

Read [`codex-integration/NOTES.md`](codex-integration/NOTES.md) for the
full investigation. Short version: this machine has a real local Codex
plugin/skill system, and this repo ships a plugin (`plugins/ship-it/`,
self-hosted via `.agents/plugins/marketplace.json`) whose one skill opens
the arcade. There is **no** documented Codex lifecycle API (task
started/finished/needs-input) exposed to third-party plugins — the plugin
manifest's `hooks` field is explicitly rejected by validation, and the
`apps` field that lets a plugin render its own persistent view is scoped to
OpenAI-issued connector ids from their Apps SDK, not something a local
plugin can self-register. So: **no auto-pause/auto-resume tied to Codex's
task state** — both games are opened and closed manually, and are
completely ordinary websites that work the same with or without Codex
installed.

## Known limitations

- SHIP IT's global leaderboard has no anti-cheat beyond basic Firestore
  rule validation.
- MERGE CONFLICT MINI GOLF has no drag-alternative input method yet for
  players who can't perform a drag gesture — a keyboard/switch-accessible
  aim mode would be a reasonable follow-up.
- No composer icon/logo assets in the Claude Code plugin listing (the
  Codex plugin has one, at `plugins/ship-it/assets/logo.svg`).
- Canvas rendering isn't screen-reader-accessible by itself in either game;
  HUD/screen text and score announcements are real DOM/ARIA-live content,
  but moment-to-moment obstacle/shot telegraphing is inherently visual
  (true of basically every reflex/physics arcade game).
