Drop your real sprite sheet here as: sprite-sheet.png

Format expected (see src/components/companion/companion.config.js):
- Horizontal filmstrip, one row per animation state, fixed frame size
  (default 96x96px per frame — change FRAME_SIZE in the config if yours differs).
- Row 0: idle (breathing loop)
- Row 1: blink (plays as an overlay during idle)
- Row 2: run (plays during the responsive reposition transition)
- Frame counts per row are set in ANIMATION_STATES in the config —
  update them to match your sheet.

Once the file is here, open companion.config.js and flip:
  export const USE_SPRITE_SHEET = false;
to:
  export const USE_SPRITE_SHEET = true;

Nothing else needs to change — Companion.jsx already branches on this
flag between the placeholder SVG and the real sprite-sheet renderer.
