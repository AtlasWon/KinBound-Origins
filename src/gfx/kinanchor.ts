/**
 * Where the creature actually is inside its cell.
 *
 * A sprite is a 128x128 cell (see kinsprite.ts) and for most of this project's
 * life the creature *was* the cell: the generator laid a body plan across the
 * whole frame, so "the middle of the frame" and "the middle of the animal" were
 * near enough the same point and the battle scene could use one for the other.
 *
 * That was never quite true and it is now plainly false. Hand-drawn art is
 * seated by its own ink bounding box onto the ground line at row 123, so a
 * drawing only occupies the lower part of its frame -- cinderpaw's ink runs
 * rows 46 to 123 with forty-five empty rows above it. Measure the generated
 * roster and the same thing turns out to be true there: pebblet's ink starts at
 * row 64, so the geometric centre of its frame is a point in the sky *above the
 * animal entirely*. Anything in the presentation that anchored to the frame was
 * therefore wrong for both routes, drawn art merely made it obvious.
 *
 * So: measure. Everything here is read off the finished sprite's own alpha, at
 * boot-cost-once and cached, and everything downstream asks this module rather
 * than assuming. It works identically on a drawn sprite and a generated one
 * because by the time it is asked, both are the same thing -- a 128x128 canvas.
 *
 * The contact shadow both routes bake under the feet is drawn at alpha 0.18 and
 * 0.34, so a >=128 alpha test finds the body and never the floor.
 *
 * Coordinates out of here are DESIGN pixels within the cell -- the same units
 * the sprite is drawn in. Callers divide by DETAIL to get logical units.
 */

import { backSprite, frontSprite, SPRITE_SIZE } from './kinsprite.js';

/** Opaque. Matches kinart.ts's ALPHA_CUT, and skips both shadow tones. */
const INK = 128;

export interface KinAnchor {
  /** Ink bounding box, inclusive, in design pixels within the cell. */
  x0: number; y0: number; x1: number; y1: number;
  /** Ink extent. */
  w: number; h: number;
  /**
   * Where a blow lands.
   *
   * The centre of the creature's *mass*, lifted toward the head by an amount
   * that grows with how tall and narrow it is. Mass rather than bounding box
   * because a bounding box counts an outstretched tail or a trailing wing as
   * body, and mass does not: a bird with thin legs has its centroid up in the
   * torso where it belongs, and a wide low creature has one in the middle of
   * the slab, with no special-casing anywhere.
   *
   * The lift is the part that separates the two shapes the brief asks about. A
   * hit on something wider than it is tall lands dead centre -- there is
   * nowhere else for it to land. A hit on something tall lands on the chest,
   * not the belly, because the far half of a tall creature's height is legs.
   */
  hitX: number; hitY: number;
  /**
   * DEAD. Always empty.
   *
   * This used to carry the rows the breathing squash removed, and the comment
   * that stood here described that technique at length. There is no squash any
   * more -- the idle moves the whole sprite as one rigid block, and kinbreath.ts
   * carries the postmortem on why four attempts at choosing a seam each ended
   * up landing on some creature's face. Nothing in src/ has read this field
   * since. It survives only so that the seam-audit drivers in tools/shots
   * report "no seams" rather than throwing; delete it with them.
   */
  seams: readonly number[];
}

const cache = new Map<string, KinAnchor>();

const NO_SEAMS: readonly number[] = [];

/** The whole cell, for anything we could not measure. Never throws in a render. */
function wholeFrame(): KinAnchor {
  const s = SPRITE_SIZE;
  return {
    x0: 0, y0: 0, x1: s - 1, y1: s - 1, w: s, h: s,
    hitX: s / 2, hitY: s * 0.45,
    seams: NO_SEAMS,
  };
}

function measure(cv: HTMLCanvasElement): KinAnchor | null {
  const cx = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  if (!cx) return null;
  const W = cv.width, H = cv.height;
  const d = cx.getImageData(0, 0, W, H).data;

  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3]! < INK) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      n++; sx += x; sy += y;
    }
  }
  if (x1 < 0 || n === 0) return null;

  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const cxm = sx / n, cym = sy / n;

  // Tallness, as a fraction: 0 for anything at least as wide as it is high,
  // 1 by the time it is nearly twice as tall as it is wide.
  const tall = Math.max(0, Math.min(1, (h / Math.max(1, w) - 0.9) / 0.9));
  const hitY = Math.max(y0 + h * 0.15, Math.min(y1 - h * 0.08,
    cym - h * (0.06 + 0.14 * tall)));

  return { x0, y0, x1, y1, w, h, hitX: cxm, hitY, seams: NO_SEAMS };
}

/**
 * The measured anchor for one species and view. Cached: the measurement is a
 * full 128x128 readback and this is called from a render tick.
 */
export function kinAnchor(speciesId: string, back: boolean): KinAnchor {
  const key = `${back ? 'b' : 'f'}:${speciesId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let a: KinAnchor | null = null;
  try {
    a = measure(back ? backSprite(speciesId) : frontSprite(speciesId));
  } catch {
    a = null;
  }
  const out = a ?? wholeFrame();
  cache.set(key, out);
  return out;
}

/** For tests, and for anything that rebuilds the sprite cache under us. */
export function clearAnchorCache(): void {
  cache.clear();
}
