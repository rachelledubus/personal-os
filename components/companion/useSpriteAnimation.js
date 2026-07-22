import { useEffect, useRef, useState } from 'react';
import { ANIMATION_STATES } from './companion.config.js';

/** Steps through frames for a given animation state at its configured
 *  fps, using requestAnimationFrame (not setInterval) so it stays
 *  smooth and pauses cleanly with tab visibility. Returns the current
 *  frame index — the sprite-sheet renderer turns that into a
 *  background-position offset. Purely mechanical: knows nothing about
 *  what the frames look like, only how many there are and how fast to
 *  cycle. This is what makes swapping in a real sprite sheet later a
 *  config change, not a hook rewrite. */
export function useSpriteAnimation(stateName) {
  const [frame, setFrame] = useState(0);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);

  useEffect(() => {
    const anim = ANIMATION_STATES[stateName] || ANIMATION_STATES.idle;
    const frameDuration = 1000 / anim.fps;
    setFrame(0);
    lastTickRef.current = performance.now();

    function tick(now) {
      if (now - lastTickRef.current >= frameDuration) {
        lastTickRef.current = now;
        setFrame(f => (f + 1) % anim.frames);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stateName]);

  return frame;
}
