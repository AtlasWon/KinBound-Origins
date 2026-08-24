/**
 * Where a creature can be compressed without breaking it.
 *
 * The battle idle squashes a sprite by dropping whole logical pixels out of it
 * at horizontal seams -- nothing is ever resampled, so a breath is a split blit
 * and the seams are where the rows go missing. That means the seams decide what
 * the animation looks like, and the seams have been wrong twice.
 *
 * The first version put them at a fixed 62% of the FRAME, which on hand-drawn
 * art -- seated by its own ink on the ground line, so only the lower part of
 * the cell is used -- landed near the top of the animal. The head compressed.
 *
 * The second version measured each creature's own ink and put them at 66% and
 * 86% of it. That is much better placed but it is still a guess about a shape
 * nobody looked at, and on a four-legged animal it is a bad one: cinderpaw's
 * ink runs rows 46..123, so 66% is row 96 and 86% is row 112, and cinderpaw's
 * legs start at about row 98. BOTH seams landed in the legs. Every breath took
 * four design rows out of a twenty-five-row leg and dropped the whole body onto
 * the stumps -- which is exactly the "the top half is being smushed" the player
 * reported, twice.
 *
 * So this module does not use a percentage at all. It finds the BARREL: the
 * deep, wide, solid part of the silhouette, the part an animal actually
 * breathes with. Legs are thin and often split the row into two or three runs,
 * a tail is thin, ears and antennae are thin; the barrel is the one region
 * where a horizontal slice is nearly as wide as the widest slice in the whole
 * creature. Seams go inside it and nowhere else, so a breath moves the ribcage
 * and carries the head and the legs as rigid blocks. Neither is ever deformed.
 *
 * Same measurement for a drawn sprite and a generated one -- by the time this
 * is asked, both are a 128x128 canvas and nothing here knows the difference.
 *
 * Coordinates are DESIGN rows within the cell. Every seam is even, so the two
 * halves of a split blit stay on the same 2x2 phase and the design grid
 * survives.
 */

import { backSprite, frontSprite, SPRITE_SIZE } from './kinsprite.js';

/** Opaque. Matches kinart's ALPHA_CUT, and so skips both baked shadow tones. */
const INK = 128;

export interface KinBreath {
  /** Ink bounding box rows, for callers that want to sanity-check a seam. */
  y0: number;
  y1: number;
  /** The solid mass, inclusive. Empty creature -> y0 > y1. */
  barrelTop: number;
  barrelBottom: number;
  /**
   * Rows the idle removes or repeats, low one FIRST.
   *
   * Low first because the low seam is the one every breathing creature gets and
   * the high one is a bonus for something with a deep enough barrel to hide a
   * second seam in. Callers walk the list and stop when they run out.
   *
   * An empty list means this creature does not breathe -- it is too small, or
   * too thin, for a whole logical pixel to be anything but a twitch.
   */
  seams: readonly number[];
}

const cache = new Map<string, KinBreath>();

/** Even, and inside [lo, hi]. Rounds down so a seam never drifts downward. */
function evenClamp(v: number, lo: number, hi: number): number {
  const e = Math.floor(Math.max(lo, Math.min(hi, v)) / 2) * 2;
  return Math.max(0, Math.min(SPRITE_SIZE - 2, e));
}

const NONE: KinBreath = {
  y0: 0, y1: SPRITE_SIZE - 1, barrelTop: 1, barrelBottom: 0, seams: [],
};

function measure(cv: HTMLCanvasElement): KinBreath | null {
  const cx = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  if (!cx) return null;
  const W = cv.width, H = cv.height;
  const d = cx.getImageData(0, 0, W, H).data;

  // The WIDEST UNBROKEN RUN in the row, not the amount of ink in it. That
  // distinction is the whole measurement: four legs and a tail put as much ink
  // in a row as a barrel does, so counting pixels calls the ankles solid body
  // and drops the seam onto the floor. A run cannot be faked by adding limbs.
  //
  // Gaps of a couple of pixels are bridged, so an eye, a highlight or the
  // single transparent pixel a drawn outline sometimes leaves does not saw a
  // barrel in half.
  const GAP = 2;
  const cover = new Int32Array(H);
  let y0 = -1, y1 = -1, widest = 0;
  for (let y = 0; y < H; y++) {
    let best = 0, run = 0, hole = 0, any = 0;
    for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3]! >= INK) {
        any++;
        run += hole + 1;
        hole = 0;
        if (run > best) best = run;
      } else if (run > 0 && hole < GAP) {
        hole++;
      } else {
        run = 0; hole = 0;
      }
    }
    cover[y] = best;
    if (any > 0) { if (y0 < 0) y0 = y; y1 = y; }
    if (best > widest) widest = best;
  }
  if (y0 < 0 || widest === 0) return null;

  const h = y1 - y0 + 1;
  // Under about sixteen logical pixels of creature there is nothing to take a
  // pixel out of, and a pixel of squash on something that small reads as a
  // stamped foot rather than as breathing.
  if (h < 32) return { y0, y1, barrelTop: 1, barrelBottom: 0, seams: [] };

  // The barrel is found relative to the LOWER BODY, never to the creature as a
  // whole. Measuring against the widest row anywhere is what a first attempt
  // did and it fails on exactly the roster this has to work on: cinderpaw's
  // flame tail and rilltail's brush are both wider than the animal wearing
  // them, so the real barrel scored below the threshold and the seam fell into
  // the ankles. Search below the shoulders and the widest thing down there is
  // the body, by a long way -- a leg is a tenth of its width.
  const lo = Math.max(y0 + 2, y0 + Math.round(h * 0.4));
  const hi = Math.max(lo, y1 - 2);
  let pick = lo, best = 0;
  // Downward with >=, so where two rows are equally wide the lower one wins: a
  // breath belongs in the belly, not between the shoulder blades.
  for (let y = lo; y <= hi; y++) if (cover[y]! >= best) { best = cover[y]!; pick = y; }
  if (best < 8) return { y0, y1, barrelTop: 1, barrelBottom: 0, seams: [] };

  // Grown out from that row for as long as the silhouette stays about as wide,
  // which is the region a repeated or dropped row disappears into.
  //
  // Loosened in stages rather than fixed at one tolerance. A tightly tapered
  // creature -- bramblehusk from behind, voltwick from the front -- is widest
  // for two or three rows and then narrows steadily, so a single strict
  // tolerance finds a barrel too shallow to put a seam in and the species
  // simply stops breathing. Falling back keeps every one of the forty-eight
  // alive, and the strict pass still runs first for everything that has a real
  // barrel to find.
  //
  // Only the top end is ever loosened. Downward is where the legs are, and a
  // barrel allowed to slacken its way down into them puts the seam straight
  // back into an ankle -- which is the bug this file was written to fix.
  let bottom = pick;
  while (bottom < y1 && cover[bottom + 1]! >= best * 0.72) bottom++;
  let top = pick;
  for (const tol of [0.72, 0.56, 0.42]) {
    const near = best * tol;
    top = pick;
    while (top > y0 && cover[top - 1]! >= near) top--;
    // Never above the shoulders, however far the solid mass runs. A big upright
    // creature like menhir is one continuous slab from its jaw to its hips, so
    // the region grows all the way up and the second seam ends up in the NECK
    // -- which puts the head back in the animation, and the head is the one
    // thing this module exists to keep out of it.
    if (top < lo) top = lo;
    if (bottom - top + 1 >= 8) break;
  }

  const depth = bottom - top + 1;
  const seams: number[] = [];
  if (depth < 5) {
    // No barrel worth the name: something that is widest for two rows and
    // tapers away above and below, like bramblehusk seen from behind. It still
    // has to breathe -- one creature in the roster standing dead still while
    // the other forty-seven move is more noticeable than any seam -- so the
    // seam goes on the widest row of the lower body itself, which is the least
    // visible row available even when it is the only one.
    const only = evenClamp(pick, y0 + 4, y1 - 6);
    if (only >= y0 + 4 && only <= y1 - 6) seams.push(only);
    return { y0, y1, barrelTop: top, barrelBottom: bottom, seams };
  }

  // Low in the barrel but not on its edge: a seam on the boundary row takes its
  // pixels off the silhouette's own outline and the shape changes visibly. Two
  // rows in, the row above and the row below are both barrel and the join is
  // invisible.
  const low = evenClamp(bottom - 2, top + 2, bottom - 2);
  seams.push(low);
  // A second seam only where the barrel is deep enough to keep the two of them
  // a clear distance apart -- otherwise both pixels come out of the same place
  // and the result is the single-seam version with twice the damage -- AND
  // where the creature is big enough for the extra pixel to be a small share of
  // it. The seam count is the breath's amplitude: one seam is a pixel either
  // side of rest, which on a forty-pixel animal is already plenty, and only
  // something the size of menhir can spend two without appearing to melt.
  if (depth >= 18 && h >= 80) {
    const high = evenClamp(top + Math.round(depth * 0.3), top + 2, low - 8);
    if (high >= top + 2 && high <= low - 8) seams.push(high);
  }

  return { y0, y1, barrelTop: top, barrelBottom: bottom, seams };
}

/** The measured breath seams for one species and view. Cached: the measurement
 *  is a full 128x128 readback and this is called from a render tick. */
export function kinBreath(speciesId: string, back: boolean): KinBreath {
  const key = `${back ? 'b' : 'f'}:${speciesId}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let m: KinBreath | null = null;
  try {
    m = measure(back ? backSprite(speciesId) : frontSprite(speciesId));
  } catch {
    m = null;
  }
  const out = m ?? NONE;
  cache.set(key, out);
  return out;
}

/** For tests, and for anything that rebuilds the sprite cache under us. */
export function clearBreathCache(): void {
  cache.clear();
}
