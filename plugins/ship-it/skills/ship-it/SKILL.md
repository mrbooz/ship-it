---
name: ship-it
description: Open the arcade — SHIP IT (a one-button developer runner) and MERGE CONFLICT MINI GOLF (developer mini golf) — in the user's browser. Use when the user wants to play a game, take a break, or pass time while Claude works on something longer — e.g. "open ship it", "let me play something while you work", "launch mini golf", "I need a break", "get my commit into main".
---

# Arcade (SHIP IT + MERGE CONFLICT MINI GOLF)

Two standalone, publicly hosted browser games, meant for the couple of
minutes you're waiting on a longer Claude/Codex task:

- **SHIP IT** — a one-button endless runner. Jump developer disasters
  (BUG, 404, MERGE CONFLICT...), chain PERFECT jumps into FLOW STATE, ship
  releases. Has a public global leaderboard.
- **MERGE CONFLICT MINI GOLF ⛳** — developer mini golf. Nine handcrafted
  holes built from real dev concepts with real gameplay behavior: BUG
  bumpers, 404 portals, CORS barriers, REBASE-able geometry, ROLLBACK and
  CACHE hazards. Get your commit into main. Local scores only.

Neither needs an account, a local server, or a build step.

Arcade (pick a game): https://ship-it-prod-2026.web.app/arcade/
SHIP IT directly: https://ship-it-prod-2026.web.app/
MERGE CONFLICT MINI GOLF directly: https://ship-it-prod-2026.web.app/mini-golf/

## What this skill does

Opens the arcade URL above in the user's default browser. If the user
names a specific game ("open mini golf", "play ship it"), open that
game's URL directly instead of the arcade picker.

## Usage

```bash
./scripts/launch.sh
```

If there's no GUI to open a browser in (headless/remote session), just
hand the user the relevant link directly — these are normal web pages,
nothing about them requires Claude Code.

## Current limitations (read before promising more than this)

- There is no lifecycle API this skill can subscribe to for "task
  started", "task finished", or "needs input" — neither game pauses or
  resumes itself based on what else Claude is doing. The user opens and
  closes them manually.
- Both games are ordinary websites with zero dependency on Claude or this
  plugin. This skill is a thin, replaceable launcher on top of them.
- SHIP IT's global leaderboard talks to a Firebase project directly from
  the browser; that has nothing to do with this plugin or Claude Code.
  MERGE CONFLICT MINI GOLF has no backend at all — local records only.
