---
name: ship-it
description: Open SHIP IT, a tiny one-button developer arcade game, in the user's browser. Use when the user wants to play a game, take a break, or pass time while Claude works on something longer — e.g. "open ship it", "let me play something while you work", "launch the arcade game", "I need a break".
---

# Ship It

SHIP IT is a standalone, publicly hosted browser game — a one-button endless
runner where you jump developer disasters (BUG, 404, MERGE CONFLICT, ...),
chain PERFECT jumps into FLOW STATE, and ship releases. It needs no local
server, no build step, and no login.

Live URL: https://ship-it-prod-2026.web.app

## What this skill does

Opens that URL in the user's default browser so they can play immediately.
There is no other integration: this skill does not, and cannot, pause or
resume based on Claude's own task state — see "Current limitations" below.

## Usage

Run the bundled script, which tries the platform's standard "open a URL"
command and falls back to just printing the link:

```bash
./scripts/launch.sh
```

If there's no GUI to open a browser in (headless/remote session), just hand
the user the link directly — it's a normal web page, nothing about it
requires Claude Code.

## Current limitations (read before promising more than this)

- There is no lifecycle API this skill can subscribe to for "task started",
  "task finished", or "needs input" — the game does not pause or resume
  itself based on what else Claude is doing. The user opens and closes it
  manually.
- The game itself has zero dependency on Claude or this plugin: it's a
  normal website. This skill is a thin, replaceable launcher on top of it.
- The game's global leaderboard talks to a Firebase project directly from
  the browser; that has nothing to do with this plugin or Claude Code.
