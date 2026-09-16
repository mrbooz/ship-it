# Marketplace submission prep

Everything below is ready to paste into the actual submission forms. Neither
submission can be completed by an agent — both require your own verified
account at the final step. This doc exists so that step is copy/paste, not
a fresh writing task.

## Claude Code community marketplace

**Submit at:** https://platform.claude.com/plugins/submit (individual
authors) — the claude.ai form is for Team/Enterprise orgs only.

Validated locally already:
```
claude plugin validate ~/ship-it --strict
✔ Validation passed
```

Fields to enter:
- **Name:** ship-it
- **Description:** SHIP IT — a tiny one-button developer arcade game to
  play while Claude works. Your agent codes. You survive production.
- **Repository:** https://github.com/mrbooz/ship-it
- **Homepage:** https://ship-it-prod-2026.web.app
- **License:** MIT
- **Category:** Fun / Games (pick whatever the form's closest option is —
  "fun" isn't necessarily a recognized enum value there, just a label I
  used locally)

## Codex / ChatGPT plugin directory

**Submit at:** https://platform.openai.com/plugins — requires your
verified individual or business identity in the OpenAI Platform, plus
"Apps Management" write access. That verification step is yours to do; I
can't complete it for you.

### Listing details
- **Name:** Ship It
- **Short description:** A tiny arcade game for while Codex works
- **Long description:** SHIP IT is a one-button endless runner themed
  around shipping software: jump BUG, 404, MERGE CONFLICT and other
  developer disasters, chain PERFECT jumps into FLOW STATE, and rack up
  deployments. Meant to be opened for a couple of minutes while a longer
  Codex task runs, then closed again. Runs entirely in the browser; local
  high score is stored on your device, and the global leaderboard is
  public (no account needed).
- **Category:** Games / Fun
- **Logo:** `plugins/ship-it/assets/logo.svg` in the repo (512×512,
  matches the game's in-canvas art). If the form insists on a raster
  PNG rather than SVG, open that file in any browser and save/export it,
  or run `rsvg-convert -w 512 -h 512 logo.svg -o logo.png` if you have
  librsvg installed (`brew install librsvg`) — I didn't have a working
  SVG→PNG converter available in this session to do it for you.
- **URLs:** homepage `https://ship-it-prod-2026.web.app`, repository
  `https://github.com/mrbooz/ship-it`
- **Remote MCP server:** none — this plugin is skill-only, no MCP server
- **Release notes (v1.0.0):** Initial release. One-button endless runner,
  endless difficulty curve, public global leaderboard, local high score.

### Starter prompts
1. Open SHIP IT so I can play while you work
2. Launch the SHIP IT arcade game
3. Give me the SHIP IT link

### The 8 required test cases (5 positive, 3 negative)

**Positive — the plugin should activate and succeed:**
1. "Open Ship It" → opens https://ship-it-prod-2026.web.app in the
   default browser.
2. "I want to play a game while this runs" → recognizes the request,
   opens the game.
3. "Launch the arcade game" → opens the game.
4. "Give me a break, something fun to do for a few minutes" → opens the
   game.
5. "Can you open the Ship It link for me" → opens the game.

**Negative — the plugin should NOT activate:**
1. "Ship this code to production" (talking about deploying real
   software, not the game) → does not open the game; proceeds with the
   actual deployment/ship request.
2. "What's a good way to pass time waiting on a build?" (open-ended,
   not naming this specific game or asking to launch anything) → answers
   conversationally; does not assume the user wants this specific game
   opened.
3. "Fix the bug in ship_it.py" (a real file/module literally named
   "ship_it", unrelated to this game) → treats it as a normal code-fix
   request; does not confuse the filename with the plugin name.

## Notes for whoever picks this up later

- Both plugin manifests are validated and this repo is public:
  https://github.com/mrbooz/ship-it
- `claude plugin marketplace add mrbooz/ship-it` +
  `claude plugin install ship-it@ship-it` were tested end-to-end this
  session and work.
- `codex plugin marketplace add mrbooz/ship-it` was NOT tested end-to-end
  — there's no `codex` CLI on this machine, only the ChatGPT desktop app.
  The manifest passed the offline validator
  (`plugin-creator/scripts/validate_plugin.py`), and the marketplace.json
  follows the same schema already proven to work for the personal
  marketplace, but a live test is still worth doing before or right after
  submission.
