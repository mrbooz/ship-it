---
name: ship-it
description: Open SHIP IT, a tiny one-button developer arcade game, in the user's browser. Use when the user wants to play a game, take a break, or pass time while a longer task runs — e.g. "open ship it", "let me play something while you work", "launch the arcade game".
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
resume based on Codex's own task state — see "Current limitations" below.

## Usage

Run the bundled script, which tries the platform's standard "open a URL"
command and falls back to just printing the link:

```bash
./scripts/launch.sh
```

If the script can't reach a GUI (headless/remote session), just hand the
user the link directly — it's a normal web page, nothing about it requires
Codex.

## Current limitations (read before promising more than this)

- There is no documented Codex/plugin lifecycle API for "task started",
  "task finished", or "needs input" that a plugin can subscribe to. Do not
  imply the game will pause or notify automatically when a Codex run
  completes — it will not. The user opens and closes it manually.
- This plugin's `apps` surface is intentionally omitted: registering a
  persistent in-conversation app view (like the bundled "Sites" or
  "Visualize" plugins use) requires an OpenAI-issued `connector_...` id from
  their Apps SDK/registration pipeline, which isn't available to a local
  third-party plugin. If that ever changes, the right integration point is
  a new `.app.json` alongside this manifest — not a hand-rolled substitute.
- The game itself has zero dependency on Codex or this plugin: it's a
  normal website. This skill is a thin, replaceable launcher on top of it.
