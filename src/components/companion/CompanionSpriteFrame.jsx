import React from 'react';
import { SPRITE_SHEET_URL, FRAME_SIZE, ANIMATION_STATES, DISPLAY_SIZE } from './companion.config.js';

/** Renders one frame of the sprite sheet as a background-position
 *  offset on a fixed-size box. Completely dumb — just math from
 *  config + current frame index. This is the piece that starts doing
 *  something the moment a real sprite-sheet.png lands in /public/companion/
 *  and USE_SPRITE_SHEET flips to true. */
export default function CompanionSpriteFrame({ stateName, frame, size = DISPLAY_SIZE }) {
  const anim = ANIMATION_STATES[stateName] || ANIMATION_STATES.idle;
  const scale = size / FRAME_SIZE.width;

  const bgX = -(frame * FRAME_SIZE.width) * scale;
  const bgY = -(anim.row * FRAME_SIZE.height) * scale;

  return (
    <div
      className="companion-sprite-frame"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${SPRITE_SHEET_URL})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${FRAME_SIZE.width * scale * anim.frames}px auto`,
        imageRendering: 'pixelated',
      }}
    />
  );
}
