// ============================================================
// COMPANION CONFIG — the one file to edit when real sprite art
// arrives. Nothing else in the companion engine needs to change.
//
// Expected sprite sheet format (when USE_SPRITE_SHEET is turned on):
//   /public/companion/sprite-sheet.png
//   A horizontal filmstrip PNG, one row per animation state, each
//   frame the same fixed width/height (set below). Rows, in order:
//     0: idle (breathing loop)      — e.g. 4 frames
//     1: blink (plays over idle)    — e.g. 3 frames
//     2: run  (viewport reposition) — e.g. 6 frames
//   Frame count per row can differ — set per-state below.
//
// Until real art is dropped in, USE_SPRITE_SHEET stays false and the
// engine renders CompanionPlaceholderArt (layered SVG, CSS-animated)
// instead — same position/animation *engine*, different visual layer.
// Swapping later is a one-line flip, not a rewrite.
// ============================================================

export const USE_SPRITE_SHEET = false; // flip to true once sprite-sheet.png is in /public/companion/

export const SPRITE_SHEET_URL = '/companion/sprite-sheet.png';

export const FRAME_SIZE = { width: 96, height: 96 }; // px, per frame

export const ANIMATION_STATES = {
  idle: { row: 0, frames: 4, fps: 4 },
  blink: { row: 1, frames: 3, fps: 8 },
  run: { row: 2, frames: 6, fps: 10 },
};

export const DISPLAY_SIZE = 84; // rendered px size on screen (desktop)
export const DISPLAY_SIZE_MOBILE = 56;

// Blink is probabilistic, not on a fixed loop — feels alive rather than
// mechanical. Rolls roughly every `blinkCheckMs`.
export const BLINK_CHANCE = 0.15;
export const BLINK_CHECK_MS = 2600;

// Position anchors per breakpoint. "run" transition animates from the
// previous anchor to the new one whenever the breakpoint changes.
export const POSITION_RULES = {
  desktop: { corner: 'top-right', offsetX: 28, offsetY: 20 },
  tablet: { corner: 'top-right', offsetX: 16, offsetY: 84 }, // below any top bar
  mobile: { corner: 'bottom-right', offsetX: 12, offsetY: 84, minimized: true }, // above bottom nav
};

export function getBreakpoint(width) {
  if (width <= 640) return 'mobile';
  if (width <= 1000) return 'tablet';
  return 'desktop';
}
