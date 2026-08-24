/**
 * Where a creature can be compressed without breaking it.
 *
 * The battle idle squashes a sprite by dropping whole logical pixels out of it
 * at horizontal seams -- nothing is ever resampled, so a breath is a split blit
 * and the seams are where the rows go missing. That means the seams decide what
 * the animation looks like, and the seams have now been wrong three times.
 *
 * v0.7 put them at a fixed 62% of the FRAME. Hand-drawn art is seated by its
 * own ink on the ground line, so only the lower part of the cell is used and
 * 62% of the frame landed near the top of the animal. The head compressed.
 *
 * v0.8 measured each creature's own ink and put them at 66% and 86% of it.
 * On a four-legged animal both landed in the legs -- cinderpaw's ink runs
 * 46..123 and its legs start around 98 -- so every breath dropped the body
 * onto its stumps.
 *
 * v0.9 looked for the BARREL: the row with the widest unbroken run of ink in
 * the lower body, on the theory that a barrel is wide and a limb is thin. That
 * theory is true of a creature standing upright and false of every creature
 * drawn side-on, which is most of this roster. On a side-on animal the widest
 * unbroken run is the horizontal line that passes through the nose, the back
 * AND the tail at once -- which is the line through the animal's EYES. Render
 * the seams onto the art and it is not subtle: cinderpaw's seam cut across its
 * muzzle, craglide's and slatewing's went through the beak, frostnip's through
 * the neck, menhir's and cairnling's across the collarbone under the chin.
 * Every one of those is the player's "the kin's upper body gets messed up",
 * and no amount of moving a percentage around was ever going to find them,
 * because the fault was not in the number -- it was in what was being measured.
 *
 * SO MEASURE THE RIGHT THING. A dropped row is invisible exactly when the rows
 * around it are the same as it: delete one row of a straight flank and nothing
 * moves but the outline's length; delete one row of a muzzle, an eye, a belt or
 * a shoulder and the feature is visibly eaten. Vertical self-similarity is the
 * property that matters, and it is directly measurable -- how much does row y
 * differ from row y+1, in silhouette and in colour. The seam goes at the
 * quietest place on the animal.
 *
 * Width still has a say, but only as a floor: a leg is as self-similar as a
 * flank is, and seaming a leg shortens it. So candidates must be at least
 * roughly body-width before their quietness is considered at all. Between the
 * two tests -- wide enough to be a body, quiet enough to be a blank stretch of
 * it -- there is no percentage left to get wrong.
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
  /**
   * The quiet zone the seams were chosen out of, inclusive: the run of rows
   * around the chosen seam that scored nearly as well as it did. A deep quiet
   * zone means the seam had somewhere to hide; a shallow one is worth looking
   * at. Empty creature -> barrelTop > barrelBottom.
   *
   * Still called "barrel" because the audit drivers in tools/shots print it by
   * that name, but it is no longer a barrel: it is wherever the drawing repeats
   * itself, which on plenty of this roster is nothing like a ribcage.
   * Diagnostic only -- nothing in the game reads it.
   */
  barrelTop: number;
  barrelBottom: number;
  /**
   * Rows the idle removes or repeats, low one FIRST.
   *
   * Low first because the low seam is the one every breathing creature gets and
   * the high one is a bonus for something big enough to hide a second seam in.
   * Callers walk the list and stop when they run out.
   *
   * An empty list means this creature does not breathe -- it is too small, or
   * too thin, for a whole logical pixel to be anything but a twitch.
   */
  seams: readonly number[];
}

const cache = new Map<string, KinBreath>();

/**
 * Species that the general rule gets wrong, and the row to use instead.
 *
 * EMPTY, and the intention is that it stays empty. It exists because the player
 * is right that a rule can be wrong for one animal and it should be possible to
 * say so in one line -- but a table of forty-eight hand-tuned numbers is a
 * maintenance burden that rots the moment a piece of art is redrawn, and the
 * measurement above now reads the drawing rather than guessing at it. Add an
 * entry only for a creature whose picture proves the rule wrong, and say in a
 * comment what the picture showed.
 *
 * Key is `<speciesId>:<front|back>`; value is the seam list, low row first.
 */
const OVERRIDES: Record<string, readonly number[]> = {};

const NONE: KinBreath = {
  y0: 0, y1: SPRITE_SIZE - 1, barrelTop: 1, barrelBottom: 0, seams: [],
};

/** Even, and inside [lo, hi]. Rounds down so a seam never drifts downward. */
function evenClamp(v: number, lo: number, hi: number): number {
  const e = Math.floor(Math.max(lo, Math.min(hi, v)) / 2) * 2;
  return Math.max(0, Math.min(SPRITE_SIZE - 2, e));
}

/** A seam's score, and the rows it would take out. Sorted, quietest first. */
interface Candidate { seam: number; score: number }

function measure(cv: HTMLCanvasElement): KinBreath | null {
  const cx = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  if (!cx) return null;
  const W = cv.width, H = cv.height;
  const d = cx.getImageData(0, 0, W, H).data;

  // Per row: the widest unbroken run of ink, with small gaps bridged so that a
  // single transparent pixel in an outline does not saw a flank in half. This
  // is no longer used to CHOOSE the seam -- that was the v0.9 mistake -- only
  // to rule out rows too narrow to be body at all.
  const GAP = 2;
  const cover = new Int32Array(H);
  // And how much ink is actually IN the row. The two together are what tells a
  // body from a pair of legs: a row across two legs can have a wide `cover`,
  // because a small gap is bridged and a drooping wing tip joins on, but it
  // holds very little ink. A row across a belly holds a lot of both.
  const ink = new Int32Array(H);
  let y0 = -1, y1 = -1, widest = 0, solid = 0;
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
    ink[y] = any;
    if (any > 0) { if (y0 < 0) y0 = y; y1 = y; }
    if (best > widest) widest = best;
    if (any > solid) solid = any;
  }
  if (y0 < 0 || widest === 0) return null;

  const h = y1 - y0 + 1;
  // Under about sixteen logical pixels of creature there is nothing to take a
  // pixel out of, and a pixel of squash on something that small reads as a
  // stamped foot rather than as breathing.
  if (h < 32) return { y0, y1, barrelTop: 1, barrelBottom: 0, seams: [] };

  /*
   * How much row y differs from the row below it.
   *
   * A silhouette change counts full: that is an edge moving, and an edge that
   * moves is a shape being redrawn rather than repeated.
   *
   * A hard colour step inside the silhouette counts nearly as much, and that is
   * the part a first attempt got wrong by discounting it to a third. Craglide is
   * the proof: its beak is not a separate shape, it is a gold region inside one
   * continuous grey outline, so on silhouette alone the row through the beak is
   * as quiet as the flank and the seam went through the bird's eye. Weighted
   * properly, crossing the edge of the beak costs as much as crossing the edge
   * of the animal -- which is right, because a row deleted out of the middle of
   * the beak eats a third of it just as plainly.
   *
   * Only STEPS count: the threshold is well above the tone-to-tone difference
   * of ordinary shading, so a smoothly lit flank still reads as quiet and only
   * eyes, mouths, belts, stripes and the joins between body parts show up.
   */
  const change = new Float64Array(H);
  for (let y = y0; y < y1; y++) {
    let diff = 0;
    for (let x = 0; x < W; x++) {
      const a = (y * W + x) * 4, b = ((y + 1) * W + x) * 4;
      const inA = d[a + 3]! >= INK, inB = d[b + 3]! >= INK;
      if (inA !== inB) { diff += 1; continue; }
      if (!inA) continue;
      const dc = Math.abs(d[a]! - d[b]!) + Math.abs(d[a + 1]! - d[b + 1]!)
        + Math.abs(d[a + 2]! - d[b + 2]!);
      if (dc > 84) diff += 0.85;
    }
    change[y] = diff;
  }

  /*
   * Where a seam is allowed to be at all.
   *
   * Never in the top half. The quiet test alone would allow it -- a big upright
   * creature like menhir is one continuous slab of rock from its jaw to its
   * hips and the chest under its chin scores beautifully -- but a seam there
   * lowers the head into the shoulders, and a head sinking into shoulders is
   * precisely the report this file keeps failing to answer. Below the midline
   * the worst a seam can do is move the head DOWN AS A WHOLE, which is what
   * breathing looks like.
   *
   * Not within six logical pixels of the ground either: the last rows are toes
   * and the contact shadow's hard edge, and a seam in them is a stamp.
   */
  const lo = y0 + Math.max(6, Math.round(h * 0.5));
  const hi = y1 - 12;

  /*
   * How far either side of the join to look, and how much the far rows count.
   *
   * This window has to be WIDER than the tallest feature a seam could sit
   * inside, or the seam hides in the middle of one. Craglide's beak is a flat
   * gold wedge a dozen design rows deep: measured over half a dozen rows it is
   * the quietest place on the bird, because every one of those rows is the same
   * flat gold, and the seam went straight through its eye. Widened until the
   * window reaches the beak's top and bottom edges, those two edges are enormous
   * -- a whole beak's worth of silhouette appearing -- and the row is correctly
   * rejected. The falloff keeps a genuinely long flank from being punished for
   * having a shoulder eight rows above it.
   */
  const REACH_UP = 9, REACH_DOWN = 6;
  const weightAt = (k: number): number => 1 / (1 + Math.abs(k + 1.5) * 0.3);

  const quietness = (seam: number): number => {
    let sum = 0, wsum = 0;
    for (let k = -REACH_UP; k <= REACH_DOWN; k++) {
      const y = seam + k;
      const w = weightAt(k);
      wsum += w;
      sum += w * ((y >= y0 && y < y1) ? change[y]! : widest);
    }
    // Against the creature's widest row, NOT against this row's own width.
    // Dividing by the row's own width forgives a busy row for being wide, and
    // the rows that are widest are exactly the ones that run through the head:
    // chalkid's eye line spans the whole animal, so its two hard-edged eyes
    // came to less per pixel than the gentle slope of its flank and the seam
    // went across its face. Every candidate has passed the same gates, so
    // comparing them on absolute quietness compares like with like.
    return sum / wsum / widest;
  };

  /*
   * Body, not limb.
   *
   * A leg is every bit as self-similar as a flank, so quietness alone puts the
   * seam halfway down a shin and the animal bobs on its ankles -- which is the
   * v0.8 failure wearing a new hat. Two gates keep it out: the row's widest run
   * has to be a decent share of the creature's widest, and the row has to be
   * FULL. The second gate is the one that actually catches legs: a row across a
   * pair of legs can score well on width, because a two-pixel gap is bridged
   * and a trailing wing joins on, but it holds barely any ink.
   *
   * Relaxed in stages rather than fixed, because a strict pair of gates leaves
   * some perfectly reasonable creature with no legal row at all, and a species
   * that stands dead still while the other forty-seven breathe is more
   * noticeable than any seam. The strict pass still runs first.
   */
  const GATES: readonly [number, number][] = [[0.5, 0.45], [0.4, 0.3], [0, 0]];
  let cands: Candidate[] = [];
  for (const [wg, ig] of GATES) {
    cands = [];
    for (let seam = evenClamp(lo + 4, lo + 4, hi); seam <= hi; seam += 2) {
      // The blit deletes rows seam-2 and seam-1 and joins seam-3 to seam, so
      // the rows that have to be interchangeable bracket that join.
      const cut = seam - 2;
      if (cut < y0 + 2) continue;
      if (cover[cut]! < widest * wg || ink[cut]! < solid * ig) continue;
      cands.push({ seam, score: quietness(seam) });
    }
    if (cands.length > 0) break;
  }
  if (cands.length === 0) return { y0, y1, barrelTop: 1, barrelBottom: 0, seams: [] };

  // Quietest wins; where two are equally quiet the LOWER one does, because a
  // breath belongs in the belly rather than between the shoulder blades.
  let low = cands[0]!;
  for (const c of cands) if (c.score <= low.score) low = c;

  /*
   * A second seam, for something big enough to spend the pixel.
   *
   * The seam count is the breath's amplitude: one seam is a pixel either side
   * of rest, which on a forty-pixel animal is already plenty. Only a creature
   * most of a frame tall gets two, they have to be a clear distance apart --
   * otherwise both pixels come out of the same place and it is the one-seam
   * version with twice the damage -- and the second one has to be nearly as
   * quiet as the first, not merely the best of a bad set.
   */
  const seams = [low.seam];
  if (h >= 88) {
    let high: Candidate | null = null;
    for (const c of cands) {
      if (Math.abs(c.seam - low.seam) < 14) continue;
      if (c.score > low.score * 1.5 + 0.02) continue;
      if (!high || c.score < high.score) high = c;
    }
    if (high) seams.push(high.seam);
  }
  // Low on the body first, which is the order the caller's lag expects.
  seams.sort((a, b) => b - a);

  // How much room the winner had: the run of rows around it that scored nearly
  // as well. Diagnostic only -- nothing downstream reads it.
  const near = low.score * 1.25 + 0.02;
  const ok = new Set(cands.filter((c) => c.score <= near).map((c) => c.seam));
  let top = low.seam, bottom = low.seam;
  while (ok.has(top - 2)) top -= 2;
  while (ok.has(bottom + 2)) bottom += 2;

  return { y0, y1, barrelTop: top - 2, barrelBottom: bottom, seams };
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
  let out = m ?? NONE;
  const override = OVERRIDES[key];
  if (override) out = { ...out, seams: override };
  cache.set(key, out);
  return out;
}

/** For tests, and for anything that rebuilds the sprite cache under us. */
export function clearBreathCache(): void {
  cache.clear();
}
