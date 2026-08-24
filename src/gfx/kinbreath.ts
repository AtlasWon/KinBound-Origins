/**
 * How a kin breathes while it is stood on its pad.
 *
 * WHAT THIS USED TO DO, AND WHY IT IS GONE.
 *
 * For four versions the idle was a SQUASH: the sprite was cut at a horizontal
 * seam and the rows at the seam were dropped, so the creature lost a whole
 * logical pixel of height without anything being resampled. All the work went
 * into choosing the seam, and the seam was wrong every single time:
 *
 *   v0.7  a fixed 62% of the FRAME. Hand-drawn art is seated by its own ink on
 *         the ground line, so 62% of the cell landed near the top of the animal
 *         and the head compressed.
 *   v0.8  66% and 86% of the creature's own INK. On anything four-legged both
 *         landed in the legs -- cinderpaw's ink runs 46..123 and its legs start
 *         near 98 -- so every breath dropped the body onto its stumps.
 *   v0.9  the widest unbroken run of ink, on the theory that a barrel is wide
 *         and a limb is thin. True of an upright creature, false of every one
 *         drawn side-on: there the widest run is the line through the nose, the
 *         back and the tail at once, which is the line through the eyes.
 *   v0.10 vertical self-similarity -- the row least like the rows around it.
 *         Better, and still wrong: render chalkid's three poses side by side at
 *         1x and its eye is a tall oval in one, a round one in the next and a
 *         squeezed one in the third. The player's word for that was "stretches
 *         the kins eyes", and they were reading the picture correctly.
 *
 * The pattern is the answer. Four different measurements, each defensible, each
 * landing on somebody's face -- because on forty-eight drawings there is no row
 * that is safe on all of them, and a rule that is right forty-five times is
 * still a rule that visibly damages three creatures every second they stand
 * there. The technique cannot be rescued by a better number.
 *
 * WHAT IT DOES NOW.
 *
 * The whole sprite moves, as one rigid block, a whole logical pixel or two off
 * the ground and back. Nothing inside the drawing moves relative to anything
 * else, so no feature can be squashed, stretched, eaten or duplicated -- not by
 * accident, not on some species nobody checked, not ever. It is the same breath
 * the overworld has always given its people (see actor.ts idleBob), it is what
 * the reference era mostly does, and it needs no measurement of the artwork at
 * all beyond "is there enough creature here for a pixel to read as breathing".
 *
 * So this module is now four lines of arithmetic on a bounding box. That is the
 * point: there is nothing left in it to get wrong.
 */

import { kinAnchor } from './kinanchor.js';
import { SPRITE_SIZE } from './kinsprite.js';

export interface KinBreath {
  /** Ink bounding box rows, in design pixels within the cell. */
  y0: number;
  y1: number;
  /**
   * Whole LOGICAL pixels the creature rises at the top of its breath.
   *
   * 0 means this one does not breathe: under about sixteen logical pixels of
   * creature a whole pixel is a twitch rather than a breath, and the honest
   * thing is to hold still.
   *
   * Amplitude tracks size so the roster reads as one animal kingdom rather than
   * as small things trembling next to large things drifting: a pixel is a much
   * bigger share of a nibbet than of a menhir, so the menhir gets two.
   */
  lift: number;
  /**
   * Always empty. The seam list the squash used to publish, kept as a field
   * only so the seam-audit drivers in tools/shots -- breathmap, breathrows,
   * breathaudit, breathdiff, breathzoom -- report "no seams" instead of
   * throwing. They audit a technique that no longer exists; breathpair.js is
   * the one that still tells you anything.
   */
  seams: readonly number[];
}

/** Below this much ink there is nothing to breathe with. Design rows. */
const MIN_INK = 32;
/** Above this much ink one pixel is too small to notice. Design rows. */
const BIG_INK = 96;

const NO_SEAMS: readonly number[] = [];

const cache = new Map<string, KinBreath>();

export function kinBreath(speciesId: string, back: boolean): KinBreath {
  const key = `${back ? 'b' : 'f'}:${speciesId}`;
  const hit = cache.get(key);
  if (hit) return hit;

  let out: KinBreath = { y0: 0, y1: SPRITE_SIZE - 1, lift: 0, seams: NO_SEAMS };
  try {
    // kinanchor has already read this sprite's alpha and cached the bounds, so
    // asking it costs nothing and there is only ever one readback per sprite.
    const a = kinAnchor(speciesId, back);
    const lift = a.h >= BIG_INK ? 2 : a.h >= MIN_INK ? 1 : 0;
    out = { y0: a.y0, y1: a.y1, lift, seams: NO_SEAMS };
  } catch {
    // A sprite we could not measure simply holds still. Never throw in a render.
  }
  cache.set(key, out);
  return out;
}

/** For tests, and for anything that rebuilds the sprite cache under us. */
export function clearBreathCache(): void {
  cache.clear();
}
