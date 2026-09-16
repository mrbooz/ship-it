# Codex integration — what's real vs. what isn't

This documents what was actually investigated on this machine before
building anything, per the instruction not to fabricate Codex APIs.

## What exists here (verified, not assumed)

This machine runs OpenAI's Codex desktop app, which has a genuine local
plugin/skill system:

- `~/.codex/skills/.system/plugin-creator/` — the official scaffolding
  skill, with `references/plugin-json-spec.md` (the canonical manifest
  schema) and `references/installing-and-updating.md` (install/reinstall
  flow).
- `~/plugins/<name>/.codex-plugin/plugin.json` — a plugin manifest.
  Supported top-level fields: `name`, `version`, `description`, `author`,
  `homepage`, `repository`, `license`, `keywords`, `skills`, `mcpServers`,
  `apps`, `interface` (display metadata). **`hooks` is explicitly rejected
  by validation** — there is no lifecycle-hook mechanism for third-party
  plugins.
- `~/.agents/plugins/marketplace.json` — the personal marketplace file
  that makes a plugin discoverable in the Codex UI.
- Bundled first-party plugins (`sites`, `visualize`, `browser`, etc.) live
  at `~/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/*` and were
  read directly to see real, shipped manifest shapes rather than
  guessing.

## What SHIP IT uses

A plugin at `~/plugins/ship-it` (personal marketplace, `AVAILABLE` /
`ON_INSTALL` policy, category `Games`) containing one skill
(`skills/ship-it/SKILL.md`) whose job is: open
`https://ship-it-prod-2026.web.app` in the user's browser. That's it — no
MCP server, no hooks, no persistent in-conversation view.

## What does NOT exist (and was not faked)

1. **No task lifecycle events.** There is no documented way for a
   third-party plugin or skill to be notified "a Codex task started",
   "finished", or "needs input". The `hooks` field that might imply
   something like this is explicitly in the validator's rejection list
   (see `plugin-json-spec.md`'s "Plugin validation notes"). Nothing in
   the bundled plugins' manifests references any such event either.

2. **No self-registerable persistent app view.** The `sites` and
   `visualize` bundled plugins render a live, interactive surface inside
   Codex conversations via an `apps` field pointing at `.app.json`, whose
   only observed content is `{"apps": {"<name>": {"id":
   "connector_..."}}}`. That `connector_...` id is issued by OpenAI's own
   backend when a plugin goes through their Apps SDK / app-directory
   registration — it is not something a local, unpublished plugin can
   mint for itself. Without a real connector id, an `.app.json` is just
   dead configuration, so SHIP IT doesn't ship one.

3. **No fake "Codex finished" state.** Section 15 of the build brief was
   explicit: if there's no reliable, documented state API, don't simulate
   one. So there isn't a fake polling loop, a fake file-watch heuristic
   for "Codex seems idle", or any such thing pretending to be integration.

## Practical result

SHIP IT is a completely ordinary, independently useful website. The Codex
plugin is a thin, optional convenience for opening it from inside a Codex
session — remove the plugin entirely and the game is unaffected. If OpenAI
later documents a real lifecycle/state API for third-party plugins, the
right next step is to extend `skills/ship-it/SKILL.md` (or add an MCP
server) to use it — not to retrofit a guess now.
