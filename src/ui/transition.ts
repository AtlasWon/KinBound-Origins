/**
 * Screen transitions.
 *
 * Lives on its own because both halves of a battle transition need it and they
 * sit in different scenes: the overworld closes the shutters while the map is
 * still the thing on screen, and the battle scene opens them again once it has
 * taken over. Importing one scene from the other to share the drawing would be
 * a cycle, and duplicating it would let the two halves drift apart -- which is
 * exactly the kind of seam a player reads as a stutter.
 */

import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';

/**
 * The battle shutters.
 *
 * `p` runs 0 (open, field fully visible) to 1 (closed, screen black). Eight
 * diagonal bands sweep in from alternating sides, each lagging the one above
 * it, so the field is swallowed in a diagonal sweep rather than all at once.
 *
 * Diagonal rather than horizontal on purpose: a horizontal wipe reads as a
 * scene change, a diagonal one reads as an impact, which is the right note for
 * something that just jumped you out of the grass.
 */
export function drawShutters(r: Renderer, p: number): void {
  const bands = 8;
  const bandH = Math.ceil(SCREEN_H / bands);
  const clamped = Math.max(0, Math.min(1, p));
  for (let i = 0; i < bands; i++) {
    // Stagger: the last band runs a third of the sweep behind the first.
    const local = Math.max(0, Math.min(1, clamped * 1.35 - (i / bands) * 0.35));
    if (local <= 0) continue;
    const w = Math.ceil(local * (SCREEN_W + 24));
    const x = i % 2 === 0 ? 0 : SCREEN_W - w;
    r.rect(x, i * bandH, w, bandH, '#0d1018');
    // A lit leading edge, so the bands read as moving rather than growing.
    if (local < 1) {
      r.rect(i % 2 === 0 ? x + w - 2 : x, i * bandH, 2, bandH, '#5a6c98');
    }
  }
}
