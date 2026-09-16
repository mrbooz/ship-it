// Checked against e.code (layout-independent — what "the space bar" means
// regardless of keyboard layout). Also checked against e.key as a fallback:
// most real keyboard events populate both, but some input sources (certain
// virtual keyboards, remote/automated input, older browsers) only set one.
const JUMP_CODES = new Set(["Space", "ArrowUp", "KeyW"]);
const JUMP_KEY_VALUES = new Set([" ", "Spacebar", "ArrowUp", "w", "W"]);

/**
 * Wires keyboard/mouse/touch input to a Game instance, scoped to `container`
 * so the page doesn't hijack keys when focus is elsewhere (e.g. an
 * embedding host page with other controls).
 */
export function attachInput(container, game) {
  container.tabIndex = 0;

  const isScoped = (e) =>
    document.activeElement === container || container.contains(e.target);

  function onKeyDown(e) {
    if (!JUMP_CODES.has(e.code) && !JUMP_KEY_VALUES.has(e.key)) return;
    if (!isScoped(e)) return;
    e.preventDefault(); // stop Space/ArrowUp from scrolling the page
    game.requestJump();
  }

  function onPointerDown(e) {
    // Let buttons/inputs (mute, trophy, rebuild, the leaderboard name field)
    // handle their own clicks instead of also triggering a jump/restart.
    if (e.target.closest("button, input, a, [role='button'], .screen-leaderboard")) return;
    container.focus();
    game.requestJump();
    e.preventDefault();
  }

  window.addEventListener("keydown", onKeyDown);
  container.addEventListener("pointerdown", onPointerDown);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    container.removeEventListener("pointerdown", onPointerDown);
  };
}
