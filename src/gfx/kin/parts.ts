/**
 * The parts library: everything a hand-authored Kin design is built out of.
 *
 * WHY THIS EXISTS. Fourteen body plans is not fourteen creatures. Run forty
 * species through them and the eye sorts them into six shapes wearing different
 * colours, because two species on the same plan are recolours of each other by
 * construction. The fix is not better shading. It is to let every species be
 * *drawn*, individually, by somebody who has decided what animal it is -- and
 * to give that person enough anatomy in the box that drawing one takes an hour
 * rather than a week.
 *
 * HOW TO THINK IN THIS FILE.
 *
 *  - **One coordinate is one sprite pixel.** No units, no scaling, no pen. A
 *    creature is about 110 cells tall and up to 120 wide. If you say `r = 9`
 *    you get an eye eighteen pixels across and it will be too big; say `r = 5`.
 *  - **You paint tones, never colours.** BASE / SHADE / LIGHT / FORM / ACCENT /
 *    ACCENT2 are *materials*: the shading pass runs each of them through its own
 *    ramp, so a belly painted LIGHT stays pale in shadow and a far leg painted
 *    SHADE stays dark in light. Everything else -- DEEP, HILIGHT, SPEC,
 *    ACCENT_DARK, ACCENT_LIT, INNER -- the shading pass leaves exactly where you
 *    put it. That is the lever: paint in materials for anything that should
 *    catch the light, and in fixed tones for anything that must not move.
 *  - **The one distinction that decides whether you get a line.**
 *
 *      `FORM`  the SAME surface, turning away from the light, or something
 *              else's shadow on it. **Never inked.** This is the tone to reach
 *              for whenever you want "darker" and do not want a ring.
 *      `SHADE` a DIFFERENT part, set behind another one -- the far pair of
 *              legs, the far wing. **Always inked**, and that is the only
 *              reason to use it.
 *
 *    Every dark region on a continuous surface is `FORM`. If you find yourself
 *    painting `SHADE` on a haunch, a jaw underside or a barrel's belly, you are
 *    about to draw a black loop on an open surface.
 *  - **Draw back to front.** Anything you draw later covers what came before.
 *    The far legs go down first in SHADE, then the body, then the near legs in
 *    BASE, then the head.
 *  - **Separate two masses with a CAST SHADOW, not with a seam.** `cast()` and
 *    `{ cast: true }` throw the near mass's own silhouette down-and-right onto
 *    whatever is behind it. It costs no ink, no palette entry and no closed
 *    ring, and because every cast shadow on the sprite points the same way it
 *    is the only thing that establishes one light over the whole animal. Two to
 *    four per creature. The `*Front` helpers -- `blobFront`, `polyFront`,
 *    `{ front: true }` -- stamp a closed dark ring and are now reserved for
 *    genuinely closed objects sitting on a surface: a shell boss, a gem, a
 *    bell, an eye socket. **Two of those per creature, at most.**
 *  - **Anatomy belongs in the SILHOUETTE.** At 64 px an internal one-cell mark
 *    is gone and a notch in the outline is not. `notch`, `toeNotches`,
 *    `haunch`, a three-point `limbPath` and a `poly` with a slanted edge all
 *    cost nothing and all survive the icon. An interior line costs ink and
 *    disappears.
 *  - **Do not draw highlights.** The light pass puts one inset band on every
 *    mass thick enough to earn it. `HILIGHT` is hand-placed on `LIGHT`
 *    material only, and `SPEC` is one mark per creature, 8-16 cells, on
 *    something wet, icy or metal.
 *  - **Thickness decides how many tones a mass gets.** Under 14 cells thick:
 *    two tones and *no highlight at all* -- do not expect a lit edge on a
 *    6-cell ear and do not draw one. Under 60: three. Over 60: four.
 *  - **The outline is two cells and grows outward.** Two masses less than five
 *    cells apart will have their outlines merge into one bar. Leave gaps or
 *    make them touch; do not leave them nearly touching.
 *
 * WHAT TO REACH FOR. Two thirds of this file had never run when round 6 began,
 * because every anatomy helper carried a mandatory ink cost the ink budget then
 * forbade. That cost is gone. This is the short list.
 *
 *   MASSES        `poly` (name your vertices -- a slanted edge reads as bone,
 *                 an axis-aligned oval reads as a stain), `blob`, `limbPath`
 *                 **with three or four points**, `haunch` for a muscle that
 *                 welds in, `rect`.
 *   SILHOUETTE    `notch` (bite a wedge out), `toeNotches`, `poly(pts, EMPTY)`
 *                 and `cell(p, x, y, EMPTY)` to carve anything else,
 *                 `contourTop` / `contourBottom` to hang an ornament off the
 *                 shape you actually drew, `widthAt` / `atDepth` to place a
 *                 landmark at a proportion instead of a magic number.
 *   SEPARATION    `cast` and `{ cast: true }` FIRST. `occlude` for one open arc
 *                 with both ends on the outline. `*Front` only for a closed
 *                 object sitting on a surface, twice per creature.
 *   SURFACE       `flat` for anything hard: rock, crystal, membrane, blade,
 *                 scute, plate. `FORM` for anything soft that turns away.
 *   LEGS          `legDigitigrade` (cat, dog, raptor -- the zigzag),
 *                 `legPlantigrade` (bear, otter), `legColumn` (tortoise,
 *                 stump), `paw`, `hand`, `claw`.
 *   HEAD          `muzzle` (slanted rear edge, below the eye row), `brow`,
 *                 `jawLine`, `nostril` OR `mouthLine` OR `jaw` OR `beak` --
 *                 **exactly one mark below the eyes, never two**, `earPointed`
 *                 / `earRound` / `earTuft` sunk into the skull, `eyeRow`.
 *   EDGES         `mane` (one per creature, at the neck), `furEdge`, `frill`,
 *                 `spineRow`, `fin`, `wingFeathered`, `wingMembrane`.
 *
 * BUDGETS, per creature, measured off the reference and enforced by the
 * acceptance script: 12-20 masses; **2** `*Front` calls; **2** seams; **2-4**
 * cast shadows; <= 7 repeated elements in any row; **4** interior detail events
 * in total, one of which is the face; <= 4 `for` loops writing marks onto the
 * body; **0** all-over texture of any kind.
 */

import type { Rng } from '../../core/rng.js';
import type { SpeciesData } from '../../data/schema.js';
import {
  ACCENT, ACCENT2, ACCENT2_DARK, ACCENT2_LIT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP,
  EMPTY, EYE_DARK, EYE_WHITE, FORM, HILIGHT, INNER, LIGHT, Mask, OUTLINE, SHADE, SPEC,
} from './mask.js';

/* Re-exported so a design file imports its tones and its shapes from one
 * place. `FORM` and the `ACCENT2` family are new this round; see the note at
 * the top of `mask.ts` for what each one means and which of them ink. */
export {
  ACCENT, ACCENT2, ACCENT2_DARK, ACCENT2_LIT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP,
  EMPTY, EYE_DARK, EYE_WHITE, FORM, HILIGHT, INNER, LIGHT, OUTLINE, SHADE, SPEC,
};
import type { EyeOpts, EyeSize, EyeStamp, EyeStyle } from './eyes.js';
import {
  blitEyeStamp, checkEyeStamps, eyeStampCells, eyeStampOf, eyeWidth,
} from './eyes.js';

/* ------------------------------------------------------------------ pen */

/** A point in mask cells. Fractional values are fine and often useful. */
export type Pt = [number, number];

/**
 * What a design function is handed.
 *
 * The frame is generous on purpose: the sprite factory bottom-aligns and
 * centres whatever you draw, and only scales it down if it will not fit. So
 * `cx` and `ground` are the *composition* origin, not a hard frame -- a tail
 * that sticks out to the right will simply shift the whole creature left when
 * it is centred. Keep the drawing inside 120 cells wide and 110 tall above the
 * ground line and nothing is ever resampled.
 */
export interface Pen {
  /** The scratch mask. Use it directly for anything the library lacks. */
  m: Mask;
  /** Seeded on the species id, so a design is deterministic. */
  rng: Rng;
  /** True for the rear view. Suppress the face; the factory mirrors for you. */
  back: boolean;
  /** The species record: types, palette, scale, silhouette brief. */
  sp: SpeciesData;
  /** Horizontal centre of the composition, in mask cells. */
  cx: number;
  /** The ground line, in mask cells. Feet belong on it. */
  ground: number;

  /**
   * Ask for the stock eye pair, drawn after the light has run.
   *
   * Also registers the face anchor. Use this only if the stock eye suits the
   * creature; most designs should draw their own with `eyeRow`, because eye
   * shape is most of a creature's character.
   */
  eyes(x: number, y: number, spread: number, size: number, angry?: boolean): void;

  /**
   * Register where the face is without asking for any eyes.
   *
   * The type character pass uses it to keep leaf blades off the muzzle and
   * gill slits behind the jaw, and without it those features are placed
   * against the bounding box and land in the wrong place.
   *
   * `eyeRow` already calls this for you, which is the normal case. Call it
   * yourself only for a design that places its eyes some other way -- one eye,
   * a cluster of them, a head with no eyes at all -- and then exactly once.
   */
  face(x: number, y: number, r: number): void;

  /** Skip the type character pass for this species. */
  noTypeTraits(): void;
  /**
   * No-op, kept so the designs that called it still compile.
   *
   * There is no automatic surface texture pass any more -- the all-over
   * scales/plates/feathers/grain/sheen/hide stamp is gone, for good, because
   * the player read it as what it was: dots on every creature. Nothing calls
   * for it and nothing needs turning off. If a species needs a material, draw
   * it deliberately in the few places it belongs.
   */
  noTexture(): void;
}

/* ------------------------------------------------------------- numbers */

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number): number => v < lo ? lo : v > hi ? hi : v;
/** Smooth 0..1, for width profiles that should swell rather than ramp. */
export const ease = (t: number): number => t * t * (3 - 2 * t);

/* ---------------------------------------------------------- primitives */

/**
 * One cell, unconditionally.
 *
 * **`cell(p, x, y, EMPTY)` erases**, and so does `poly(p, pts, EMPTY)`. Both
 * work, both have always worked, and neither had a single call site on the
 * shipped roster -- which is why every foot on it is a bar. Carving is how a
 * structural fact gets into the silhouette for free. See `notch`.
 */
export function cell(p: Pen, x: number, y: number, v: number): void {
  p.m.set(Math.round(x), Math.round(y), v);
}
/** One cell, but only onto existing body -- a mark that can never extend the
 *  silhouette. Every crease, seam, stripe and lip should use this. */
export function cellOver(p: Pen, x: number, y: number, v: number): void {
  p.m.over(Math.round(x), Math.round(y), v);
}
/** One cell, but only into empty space -- for anything that must sit behind. */
export function cellUnder(p: Pen, x: number, y: number, v: number): void {
  p.m.under(Math.round(x), Math.round(y), v);
}

/* --------------------------------------------------- light and shadow */

/**
 * A FACET: everything drawn inside the callback takes **one flat tone across
 * its whole area**, with no gradient at all. The light pass will not touch it.
 *
 * That is how every mineral in the reference generation reads as *hard*. Two
 * planes meeting at a ridge are two `flat` calls in two tones with a hard
 * boundary between them, and **that step is the ridge** -- do not also draw a
 * line on it. The boundary-cleanup pass leaves facets alone, so the corners
 * stay sharp.
 *
 * ```ts
 * flat(p, () => poly(p, [[x0, y0], [x1, y1], [x2, y2]], LIGHT));  // near plane
 * flat(p, () => poly(p, [[x2, y2], [x1, y1], [x3, y3]], FORM));   // far plane
 * ```
 *
 * FOR: rock faces, crystal facets, wing membranes, leaf blades, fin webs, shell
 * scutes, ice, plate armour, anything with a machined or fractured surface.
 *
 * NOT FOR: flesh. A facetted haunch is a papercraft model. If the surface is
 * meant to be curved, leave it alone -- the light pass already bands it.
 */
export function flat(p: Pen, draw: () => void): void {
  p.m.beginFlat();
  try { draw(); } finally { p.m.endFlat(); }
}

/**
 * The offset a cast shadow of a caster `w` cells wide should be thrown by.
 *
 * `dx = dy = 0.18 * w`, clamped to 4..10 cells. Both are positive: the light is
 * up-left and in front, so every shadow on the sprite goes **down and to the
 * right**, and the fact that they all go the same way is most of what a cast
 * shadow buys you.
 */
export function castOffset(w: number): number {
  return clamp(Math.round(0.18 * w), 4, 10);
}

/**
 * A CAST SHADOW. **The highest-value mark available on a sprite.**
 *
 * Draw the near mass inside the callback; its own silhouette is then thrown
 * down-and-right onto whatever is already behind it.
 *
 * ```ts
 * cast(p, 20, () => {                      // 20 = the near thigh's width
 *   limbPath(p, [[cx+22, G-50], [cx+16, G-28]], 20, 13, BASE, { bulge: 3 });
 * });
 * ```
 *
 * `w` is the caster's width in cells and is the only number you have to think
 * about; it picks the offset through `castOffset`. Pass `dx`/`dy` yourself only
 * for a shadow that has to clear a specific landmark.
 *
 * It records what you **touched**, not what you changed, so a `BASE` limb laid
 * over a `BASE` torso still throws a shadow -- which is the commonest overlap on
 * the roster and the one that needs it most. It lands only on cells that are
 * already body and are not part of the caster, and it steps the *material*
 * rather than smearing one grey: `BASE`->`FORM`, `LIGHT`->`BASE`,
 * `ACCENT`->`ACCENT_DARK`. A shadow crossing from a flank onto a pale belly
 * stays one shadow.
 *
 * Hard edge on both sides. Do not feather it and do not outline it. Where it
 * crosses a region already in `FORM` it stops; if you want the second step
 * there, paint `DEEP` yourself.
 *
 * DRAW ONE wherever a mass overlaps a mass: near foreleg onto chest, near thigh
 * onto torso, brow onto eye socket, muzzle onto jaw, near wing onto body, shell
 * rim onto the body under it. **Target 2-4 per creature.**
 *
 * NOT FOR: a mass that does not actually overlap anything -- the shadow lands on
 * nothing and you have spent a call for no cells. And do not nest `cast` calls;
 * one caster at a time.
 */
export function cast(p: Pen, w: number, draw: () => void, dx?: number, dy?: number): void {
  const d = castOffset(w);
  p.m.beginCast();
  try { draw(); } finally { p.m.endCast(dx ?? d, dy ?? d); }
}

/**
 * THE specular mark. **One per creature, 8-16 cells, and only on something wet,
 * icy, metallic or glassy.**
 *
 * Nothing generates `SPEC` any more -- the old pass painted it round the whole
 * upper-left contour of every mass, 7.8 % of every sprite, at a measured chroma
 * of 18/255, which is to say white. It is now entirely yours, it is a *thing*
 * on a surface rather than a band of light, and there is exactly one of them.
 *
 * It warns if the sprite already carries a specular mark, because the second
 * one is what turns a wet nose into a disco ball.
 *
 * NOT FOR: fur, skin, feather, leaf, stone, cloth. Those are matte and the
 * light pass has already given them everything they get.
 */
export function spec(p: Pen, cx: number, cy: number, rx = 2, ry = 2): void {
  for (let i = 0; i < p.m.data.length; i++) {
    if (p.m.data[i] === SPEC) {
      console.warn('spec: this creature already has a specular mark. One per creature, ' +
        '8-16 cells, wet/icy/metal only -- delete the weaker of the two.');
      break;
    }
  }
  blob(p, cx, cy, rx, ry, SPEC);
}

/**
 * A hand-placed highlight on a PALE MATERIAL. `HILIGHT` is one step above
 * `LIGHT` and it only makes sense where `LIGHT` already is: a muzzle, a belly
 * plate, a horn, a mane.
 *
 * Small and few. The light pass no longer produces any highlights of its own,
 * and that was deliberate -- do not put them all back by hand.
 */
export function hilight(p: Pen, cx: number, cy: number, rx = 2, ry = 2): void {
  blob(p, cx, cy, rx, ry, HILIGHT);
}

/* ---------------------------------------------------------- silhouette */

/**
 * Bite a wedge out of the silhouette.
 *
 * **This is the cheapest structural mark in the library and the one the manual
 * ranks highest.** At 64 px an internal 1-cell line is half a reference pixel
 * and is gone; a notch in the outline is a shape change, gets its own ink from
 * the outline pass for free, and survives all the way down to the icon.
 *
 * The mouth of the wedge is `w` cells wide, centred on `(x, y)`, and it cuts
 * `depth` cells along the direction `(ux, uy)` -- which points INTO the body.
 *
 * ```ts
 * notch(p, cx + 19, G, 5, 3, 0, -1);        // between two toes, cutting up
 * notch(p, cx - 30, G - 62, 6, 4, 0,  1);   // ear root, cutting down
 * notch(p, cx + 26, G - 14, 5, 4, -1, 0);   // behind the hock, cutting forward
 * ```
 *
 * FOR: toe gaps, the dip between skull and ear, the step behind a hock or an
 * elbow, the gap between two fingers, the split in a hoof, a bitten shell rim.
 *
 * NOT FOR: anything in the middle of a mass. It erases cells, so it only does
 * something where it reaches the edge -- a notch cut into an interior is an
 * unpainted hole the outline pass will happily ink round.
 */
export function notch(p: Pen, x: number, y: number, w: number, depth: number, ux = 0, uy = -1): void {
  const d = Math.hypot(ux, uy) || 1;
  const nx = -uy / d, ny = ux / d;
  const hw = Math.max(0.5, w / 2);
  poly(p, [
    [x - nx * hw - (ux / d) * 1.5, y - ny * hw - (uy / d) * 1.5],
    [x + nx * hw - (ux / d) * 1.5, y + ny * hw - (uy / d) * 1.5],
    [x + (ux / d) * depth, y + (uy / d) * depth],
  ], EMPTY);
}

/**
 * The toe gaps on a foot, carved rather than drawn.
 *
 * `count` toes across a foot spanning `x0..x1` whose sole sits on row `y`. Cuts
 * `count - 1` notches up into the pad, so the toes are silhouette events.
 *
 * **Three toes, never four or five, on anything below about 1.2 m**, and the
 * middle one should be the longest -- which you get by making the pad's bottom
 * contour a shallow arch rather than a flat bar before you call this.
 */
export function toeNotches(p: Pen, x0: number, x1: number, y: number, count = 3, depth = 3): void {
  if (count < 2) return;
  const span = x1 - x0, pitch = span / count;
  for (let i = 1; i < count; i++) {
    notch(p, x0 + pitch * i, y + 1, Math.max(3, pitch * 0.42), depth, 0, -1);
  }
}

/**
 * A muscle mass that WELDS into the mass it sits on: a haunch, a shoulder, a
 * pectoral, a cheek, a calf belly.
 *
 * It registers as a **bulge in the silhouette and nothing else** -- no seam, no
 * ring, no sticker. This is the shape the whole roster was missing: there was
 * previously no way to ask for "a haunch" that did not stamp a closed dark loop
 * on the flank, so every author drew a smooth capsule instead.
 *
 * `cap` paints the upper-front quadrant in a paler material and `underside`
 * paints the lower-rear in `FORM`; both default off, because on a mass over 14
 * cells thick the light pass already bands it and a second opinion is what
 * turned the roster into airbrush.
 *
 * NOT FOR: a part that is genuinely behind another part -- that is `SHADE`, and
 * it wants the ink. And not for a mass that is meant to be readable *inside*
 * the silhouette; if the bulge does not change the outline it is not doing
 * anything.
 */
export function haunch(p: Pen, cx: number, cy: number, rx: number, ry: number, v = BASE,
  o: { cap?: number; underside?: boolean } = {}): void {
  blob(p, cx, cy, rx, ry, v);
  if (o.cap !== undefined) {
    // Upper-front quadrant only, and inset a cell so it never touches the
    // contour -- a pale material that reaches the outline reads as a rim.
    blob(p, cx - rx * 0.3, cy - ry * 0.3, rx * 0.5, ry * 0.5, o.cap);
  }
  if (o.underside) {
    // The turn-under, in FORM: the same surface rolling away from the light.
    // Never SHADE. SHADE here is the "sticker lozenge" the player complained of.
    for (let y = Math.round(cy); y <= Math.round(cy + ry); y++) {
      for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        const r2 = dx * dx + dy * dy;
        if (r2 <= 1 && r2 >= 0.42 && dx + dy > 0.35 && p.m.get(x, y) === v) cell(p, x, y, FORM);
      }
    }
  }
}

/* ----------------------------------------------------------- measuring */

/** Topmost body row in a column, or -1. Use it to sit an ornament on a back. */
export function topOf(p: Pen, x: number): number { return p.m.top(Math.round(x)); }
/** Bottommost body row in a column, or -1. */
export function bottomOf(p: Pen, x: number): number { return p.m.bottom(Math.round(x)); }

/**
 * How deep the creature is at column `x`, in cells, or 0 if nothing is there.
 *
 * Place a landmark at a proportion of the animal instead of at a magic number:
 * a limb starts at 70-80 % of the torso's local depth, a belly plate ends at
 * 60 %, a gill sits at 40 %. `atDepth` does the arithmetic.
 */
export function widthAt(p: Pen, x: number): number {
  const t = topOf(p, x), b = bottomOf(p, x);
  return t < 0 || b < 0 ? 0 : b - t + 1;
}

/**
 * The row `f` of the way down the creature at column `x`. `f = 0` is the top
 * contour, `1` the bottom. Returns -1 if that column is empty.
 *
 * ```ts
 * limbPath(p, [[hx, atDepth(p, hx, 0.75)], ...], ...);  // hip, not a guess
 * ```
 */
export function atDepth(p: Pen, x: number, f: number): number {
  const t = topOf(p, x), b = bottomOf(p, x);
  return t < 0 ? -1 : Math.round(lerp(t, b, clamp(f, 0, 1)));
}

/**
 * A filled ellipse. The workhorse mass -- and the reason for a lot of the
 * roster's problems, because an ellipse has no landmarks on it. **If the shape
 * has a name for any part of its outline -- a brisket, a stop, a croup, a
 * scapula -- draw it with `poly` and name the vertices instead.**
 *
 * `beneath` fills only empty cells, so a far part slides in behind everything
 * already drawn without a ring round it. That is the cheap way to put a far
 * wing or a far horn back there.
 */
export function blob(p: Pen, cx: number, cy: number, rx: number, ry: number, v: number, beneath = false): void {
  p.m.ellipse(cx, cy, rx, ry, v, beneath);
}

/**
 * An ellipse laid *in front of* what is already there, with a dark seam ring
 * pressed into the body **all the way round it**.
 *
 * RESERVED FOR GENUINELY CLOSED OBJECTS SITTING ON A SURFACE: a shell boss, a
 * gem, a bell, an eye socket, a rivet, a bolted plate. **Two `*Front` calls per
 * creature, at most.**
 *
 * A closed ring is exactly what the reference never draws on an open surface,
 * and this helper on a limb or a haunch is where the roster's black "heart"
 * shapes came from: a 9-wide near thigh becomes a `DEEP` disc of radius 6 under
 * a `BASE` disc of radius 4.5, which is a 1.5-cell loop of ink on a flank.
 *
 * For a mass overlapping a mass -- head on chest, limb on torso -- use `cast()`
 * instead. It says the same thing, harder, with no ink at all.
 */
export function blobFront(p: Pen, cx: number, cy: number, rx: number, ry: number, v: number, seamTone = DEEP, pad = 1.5): void {
  p.m.ellipseFront(cx, cy, rx, ry, v, seamTone, pad);
}

/** A filled axis-aligned rectangle. */
export function rect(p: Pen, x0: number, y0: number, x1: number, y1: number, v: number, beneath = false): void {
  p.m.box(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), v, beneath);
}

/**
 * A continuous run one cell wide.
 *
 * Steps in cells rather than in whole coordinates, so a shallow diagonal comes
 * out solid instead of dotted. `onlyBody` defaults true: a stroke is a mark on
 * a surface, not a new piece of silhouette.
 */
export function stroke(p: Pen, x0: number, y0: number, x1: number, y1: number, v: number, onlyBody = true): void {
  const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
    if (onlyBody) p.m.over(x, y, v); else p.m.set(x, y, v);
  }
}

/** A straight limb that narrows from `w0` to `w1`. */
export function taper(p: Pen, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, v: number, beneath = false): void {
  p.m.limb(x0, y0, x1, y1, w0, w1, v, beneath);
}

/** `taper`, with a closed dark seam pressed into whatever it is laid across.
 *  Same warning as `blobFront`: closed objects only, and a limb is not one.
 *  For a limb crossing a torso use `cast()`, or `occlude()` on the leading
 *  edge alone. */
export function taperFront(p: Pen, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, v: number, seamTone = DEEP, pad = 1): void {
  p.m.limbFront(x0, y0, x1, y1, w0, w1, v, seamTone, pad);
}

/* ------------------------------------------------------------- polygon */

/**
 * A filled polygon, boundary included. **The most important call in the file.**
 *
 * Every named landmark on a creature -- the withers, the back dip, the croup,
 * the point of shoulder, the brisket, the belly tuck, the stop, the slanted
 * rear edge of a muzzle -- is one vertex of one `poly`, and drawing the same
 * mass as a `blob` throws all of them away. Trace a reference quadruped and the
 * outline reverses direction about a dozen times; trace ours and it reverses
 * twice. That gap costs nothing but coordinates.
 *
 * `poly(p, pts, EMPTY)` CARVES: it erases the polygon instead of filling it,
 * which is how a notch, a toe gap or an ear-root dip gets into the silhouette.
 *
 * Scanline fills alone lose rows on a shape only two or three cells across --
 * which is most of a fin, a leaf tip or a feather -- so the boundary is always
 * stroked as well. That single decision is why thin shapes in this library
 * survive.
 */
export function poly(p: Pen, pts: Pt[], v: number, beneath = false): void {
  if (pts.length < 2) return;
  let minY = Infinity, maxY = -Infinity;
  for (const q of pts) { if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1]; }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const yy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
      if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
        xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.round(xs[i]!); x <= Math.round(xs[i + 1]!); x++) {
        if (beneath) p.m.under(x, y, v); else p.m.set(x, y, v);
      }
    }
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
    stroke(p, a[0], a[1], b[0], b[1], v, false);
  }
}

/** A polygon laid in front, with a closed dark seam ring around it. Same
 *  warning as `blobFront`: closed objects on a surface only, two per creature.
 *  An ear is NOT one -- draw an ear as a plain `poly` overlapping the cranium
 *  by 4-6 cells, so its outline is continuous with the skull's. */
export function polyFront(p: Pen, pts: Pt[], v: number, seamTone = DEEP, pad = 1.5): void {
  const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length;
  const cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
  const grown: Pt[] = pts.map((q) => {
    const dx = q[0] - cx, dy = q[1] - cy, d = Math.hypot(dx, dy) || 1;
    return [q[0] + (dx / d) * pad, q[1] + (dy / d) * pad];
  });
  // Seam only where it lands on body, so the ring never adds silhouette.
  const before = p.m.data.slice();
  poly(p, grown, seamTone);
  for (let i = 0; i < before.length; i++) {
    if (before[i] === EMPTY && p.m.data[i] === seamTone) p.m.data[i] = EMPTY;
  }
  poly(p, pts, v);
}

/** Stroke a polyline (or a closed loop) one cell wide. */
export function polyLine(p: Pen, pts: Pt[], v: number, close = false, onlyBody = false): void {
  for (let i = 0; i + 1 < pts.length; i++) stroke(p, pts[i]![0], pts[i]![1], pts[i + 1]![0], pts[i + 1]![1], v, onlyBody);
  if (close && pts.length > 2) {
    const a = pts[pts.length - 1]!, b = pts[0]!;
    stroke(p, a[0], a[1], b[0], b[1], v, onlyBody);
  }
}

/* ---------------------------------------------------------------- path */

/**
 * A dense polyline through control points, Catmull-Rom.
 *
 * This is the single most useful thing in the file. Every organic shape in a
 * creature -- a curling tail, a horn, a haunch contour, the sweep of a spine,
 * the free edge of a fin -- is a curve, and a curve made of three straight
 * `taper` calls always reads as three straight tapers. Give this four or five
 * control points and it gives you back something you can hang a limb, a row of
 * spines, a set of fin rays or a jagged mane off.
 */
export function path(pts: Pt[], density = 1): Pt[] {
  if (pts.length < 2) return pts.slice();
  const at = (i: number): Pt => pts[clamp(i, 0, pts.length - 1)]!;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const seg = Math.max(2, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 1.6 * density));
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const c = (a: number, b: number, c2: number, d: number): number =>
        0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** Points along an ellipse arc, angles in radians. Handy as `path` input. */
export function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, steps = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

/** The unit normal of a dense path at index `i`, pointing to its left. */
export function normalAt(pts: Pt[], i: number): Pt {
  const a = pts[clamp(i - 1, 0, pts.length - 1)]!, b = pts[clamp(i + 1, 0, pts.length - 1)]!;
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
  return [-dy / d, dx / d];
}

/** Offset a dense path sideways by a (possibly varying) distance. */
export function offsetPath(pts: Pt[], dist: number | ((t: number) => number)): Pt[] {
  return pts.map((q, i) => {
    const n = normalAt(pts, i);
    const d = typeof dist === 'number' ? dist : dist(i / Math.max(1, pts.length - 1));
    return [q[0] + n[0] * d, q[1] + n[1] * d] as Pt;
  });
}

export interface LimbOpts {
  /**
   * Stamp a closed `DEEP` ring round the entire limb. **Almost always wrong.**
   *
   * It walks the whole path stamping a disc of `width/2 + 1.5`, so a short fat
   * segment comes out as a closed loop of ink on an open surface -- which is
   * the single most-diagnosed defect on the shipped roster. Use `cast: true`
   * for a limb crossing a body, or `occlude()` for one open arc down the
   * limb's leading edge.
   */
  front?: boolean;
  seam?: number;
  /**
   * Throw this limb's cast shadow onto whatever is already behind it. **This is
   * what `front` should have been.** `true` uses the limb's own widest width to
   * pick the offset; a number overrides that width.
   *
   * Costs no ink, needs no palette entry, and separates the limb from the torso
   * harder than a seam does. Do not use it inside a `cast()` block -- one
   * caster at a time.
   */
  cast?: boolean | number;
  /** Only fill empty cells, so the limb sits behind everything already drawn. */
  beneath?: boolean;
  /** 0 tapers straight from w0 to w1; higher values swell the middle. A real
   *  limb has a muscle belly and a straight taper never looks like one.
   *  **Put it on the thigh only**, and put the segment ends at the JOINTS:
   *  joints narrow, muscle bellies widen between them. */
  bulge?: number;
  /** Paint a one-cell run along the upper-left flank. The light pass already
   *  bands anything 14 cells or thicker, so this is for a thin limb that gets
   *  no bands at all -- and even there, prefer leaving it alone. */
  lit?: number;
  /** Paint a one-cell dark run along the lower-right flank. `FORM` if it is the
   *  same surface turning away; `DEEP` only where something genuinely occludes
   *  it. */
  dark?: number;
}

/**
 * A tapered limb following a curved path. The backbone of every organic shape
 * here: tails, necks, horns, tentacles, arms, roots, stems.
 *
 * **GIVE IT THREE OR FOUR POINTS.** Half the `limbPath` calls on the shipped
 * roster are two-point straight tubes, and that is most of why the animals read
 * as four pegs under a barrel. A hind leg zigzags -- thigh down-and-forward,
 * shin down-and-back, metatarsus forward again -- and the reversals between
 * those segments are silhouette events that cost nothing and survive the icon:
 *
 * ```ts
 * limbPath(p, [[cx+22, G-50], [cx+16, G-28]], 20, 13, BASE, { bulge: 3 });
 * limbPath(p, [[cx+16, G-28], [cx+24, G-13]], 13,  8, BASE);
 * limbPath(p, [[cx+24, G-13], [cx+20, G- 5]],  8,  7, BASE);
 * ```
 *
 * A foreleg is comparatively straight -- one gentle S -- and **the difference
 * between the two pairs** is a large part of what says "quadruped".
 */
export function limbPath(p: Pen, pts: Pt[], w0: number, w1: number, v: number, o: LimbOpts = {}): void {
  if (o.cast) {
    const cw = typeof o.cast === 'number' ? o.cast : Math.max(w0, w1) + (o.bulge ?? 0);
    cast(p, cw, () => limbPath(p, pts, w0, w1, v, { ...o, cast: false }));
    return;
  }
  const dense = pts.length > 40 ? pts : path(pts);
  const n = dense.length;
  const stamp = (x: number, y: number, r: number, tone: number, mode: 0 | 1 | 2): void => {
    const ir = Math.max(0, Math.round(r));
    for (let dy = -ir; dy <= ir; dy++) {
      for (let dx = -ir; dx <= ir; dx++) {
        if (dx * dx + dy * dy > ir * ir + ir * 0.6) continue;
        const px = Math.round(x) + dx, py = Math.round(y) + dy;
        if (mode === 0) p.m.set(px, py, tone);
        else if (mode === 1) p.m.under(px, py, tone);
        else if (p.m.filled(px, py)) p.m.set(px, py, tone);
      }
    }
  };
  const width = (t: number): number => {
    const base = lerp(w0, w1, t);
    return base + (o.bulge ?? 0) * Math.sin(t * Math.PI);
  };
  if (o.front) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      stamp(dense[i]![0], dense[i]![1], width(t) / 2 + 1.5, o.seam ?? DEEP, 2);
    }
  }
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    stamp(dense[i]![0], dense[i]![1], width(t) / 2, v, o.beneath ? 1 : 0);
  }
  // Flank runs. A cylinder needs a lit side and a dark side more than it needs
  // another band, and these are one cell each so they never eat the limb.
  if (o.lit !== undefined || o.dark !== undefined) {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), r = width(t) / 2;
      const nrm = normalAt(dense, i);
      const up = nrm[1] < 0 || (nrm[1] === 0 && nrm[0] < 0) ? 1 : -1;
      const q = dense[i]!;
      if (o.lit !== undefined) cellOver(p, q[0] + nrm[0] * r * up, q[1] + nrm[1] * r * up, o.lit);
      if (o.dark !== undefined) cellOver(p, q[0] - nrm[0] * r * up, q[1] - nrm[1] * r * up, o.dark);
    }
  }
}

/* ----------------------------------------------------------- surface */

/**
 * A straight occlusion seam. **Both ends must land on the outer silhouette.**
 *
 * `lit` defaults to -1 (no pale lip). A lit lip on top of a `DEEP` line is
 * three cells to say what one cell says, and a great deal of the roster's ink
 * went there.
 */
export function seam(p: Pen, x0: number, y0: number, x1: number, y1: number, dark = DEEP, lit = -1): void {
  stroke(p, x0, y0, x1, y1, dark);
  if (lit >= 0) stroke(p, x0, y0 - 1, x1, y1 - 1, lit);
}

/** `seam`, along a curve. See `occlude`, which is the same thing with the
 *  endpoint rule checked for you and is what you should normally call. */
export function seamPath(p: Pen, pts: Pt[], dark = DEEP, lit = -1): void {
  const dense = path(pts);
  for (const q of dense) {
    cellOver(p, q[0], q[1], dark);
    if (lit >= 0) cellOver(p, q[0], q[1] - 1, lit);
  }
}

/**
 * An OPEN OCCLUSION SEAM: one dark arc where one part passes in front of
 * another, with **both terminals on the outer silhouette**.
 *
 * > **THE RULE: an internal dark line must have BOTH ENDS ON THE OUTER
 * > SILHOUETTE. If it does not, delete it or extend it.** A reference sprite
 * > never closes an internal contour on an open surface.
 *
 * Where a near foreleg crosses a chest, the dark line runs from the top of the
 * shoulder down the **leading** edge of the limb and stops the moment the limb
 * leaves the body silhouette. The trailing edge is not drawn at all -- it is a
 * value step, and `cast()` gives you that step for free.
 *
 * ```ts
 * limbPath(p, [[cx+22, G-50], [cx+16, G-28]], 20, 13, BASE, { bulge: 3 });
 * occlude(p, [[cx+13, G-50], [cx+9, G-40], [cx+8, G-30]]);
 * ```
 *
 * Budget: **two seams per creature**, and a cast shadow is usually better than
 * either of them. It warns at build time if an endpoint is stranded in the
 * middle of a mass, because that is the closed-ring defect starting.
 *
 * NOT FOR: a darker region on a continuous surface. That is `FORM`, and it must
 * not have a line round it.
 */
export function occlude(p: Pen, pts: Pt[], tone = DEEP): void {
  if (pts.length < 2) return;
  const dense = path(pts);
  for (const q of dense) cellOver(p, q[0], q[1], tone);
  for (const end of [dense[0]!, dense[dense.length - 1]!]) {
    if (!nearContour(p, end[0], end[1])) {
      console.warn(`occlude: endpoint (${Math.round(end[0])}, ${Math.round(end[1])}) is not on the ` +
        'silhouette. An internal line with a loose end is a closed ring waiting to happen -- ' +
        'extend it to the outer contour or delete it.');
    }
  }
}

/** True if `(x, y)` is within 2 cells of the outer edge of the body. */
function nearContour(p: Pen, x: number, y: number): boolean {
  const cx = Math.round(x), cy = Math.round(y);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (!p.m.filled(cx + dx, cy + dy)) return true;
    }
  }
  return false;
}

/**
 * Segment rings across a path. A ring is an overlap, not a scratch: the segment
 * in front of the gap catches the light along its whole length, so `lit` puts
 * one pale run just behind each ring.
 *
 * **Three to eight, never fifteen and never one**, and taper them -- reference
 * segment rows are widest at the base and shrink along the run, which this
 * already does. Below three reads as damage; above eight reads as texture.
 *
 * `lit` defaults to -1 (off), because on a tube under 14 cells thick the light
 * pass gives no bands and a pale run per ring is the whole tube striped.
 */
export function rings(p: Pen, pts: Pt[], count: number, half: number, v = ACCENT_DARK, lit = -1): void {
  const dense = path(pts);
  for (let i = 1; i <= count; i++) {
    const idx = Math.round((i / (count + 1)) * (dense.length - 1));
    const q = dense[idx]!, n = normalAt(dense, idx);
    const hh = Math.max(1, half * (1 - (i / (count + 1)) * 0.45));
    stroke(p, q[0] - n[0] * hh, q[1] - n[1] * hh, q[0] + n[0] * hh, q[1] + n[1] * hh, v);
    const back = dense[clamp(idx - 1, 0, dense.length - 1)]!;
    const lx = back[0] - q[0], ly = back[1] - q[1];
    if (lit >= 0) stroke(p, q[0] - n[0] * hh + lx, q[1] - n[1] * hh + ly, q[0] + n[0] * hh + lx, q[1] + n[1] * hh + ly, lit);
  }
}

/**
 * A bevelled edge: a pale lip with a dark gutter beneath it, for where one
 * plate overlaps another -- a scute, a scale, a collar, a shell rim.
 *
 * The defaults are now `LIGHT` over `FORM`: a *material* step, not a highlight
 * over a line. `HILIGHT`/`DEEP` are still available for a hard mineral edge,
 * but they cost ink and highlight budget and you have very little of either.
 *
 * Budget: **two bevel/seam calls per creature.** NOT FOR a soft surface -- a
 * bevelled belly is a piece of armour.
 */
export function bevel(p: Pen, pts: Pt[], lit = LIGHT, dark = FORM): void {
  const dense = path(pts);
  for (const q of dense) {
    cellOver(p, q[0], q[1] - 1, lit);
    cellOver(p, q[0], q[1], dark);
  }
}

/*
 * GONE THIS ROUND, and not coming back:
 *
 *   crease()      three ruled rows (DEEP, SHADE, LIGHT) across a limb -- about
 *                 24 cells of banding per joint, all of it inked, none of it
 *                 surviving the icon. It was hard-called twice by each leg
 *                 helper, which is the entire reason `legDigitigrade` -- the
 *                 correct dog leg -- had zero call sites. A joint is a
 *                 REVERSAL IN THE CONTOUR. See `LegOpts.joints`.
 *   bellyPlate()  a LIGHT blob with DEEP segment lines ruled across it. The
 *                 lines are half a reference pixel and vanish at 64; the ink is
 *                 charged anyway. Draw the belly as a plain LIGHT region whose
 *                 top edge follows the tuck.
 *   speckle()     an all-over texture pass by another name. There is no all-over
 *                 surface pattern anywhere in the reference generation.
 */

/* ------------------------------------------------------------ legs */

/**
 * How a leg helper marks its joints.
 *
 *   `'contour'`  **the default, and the right answer.** The joint is a
 *                REVERSAL IN THE SILHOUETTE: the limb narrows at the joint and
 *                the segment above and below it lean opposite ways. Costs no
 *                ink and survives the icon at 64 px, where a hock is the
 *                sharpest angle on a quadruped and is *the* cue that the animal
 *                has a skeleton.
 *   `'crease'`   one short `FORM` band wrapping the front of the joint. A value
 *                step, no line. Use it on a limb over ~14 cells thick where the
 *                contour reversal alone is not enough; it does nothing useful
 *                below that.
 *   `'none'`     a smooth tube. For a tentacle, a stem, a melted candle foot.
 */
export type LegJoints = 'contour' | 'crease' | 'none';

export interface LegOpts {
  /** Body tone for the limb. `SHADE` for a FAR leg -- it is a different part
   *  and it wants the ink -- `BASE` for a near one. Never `SHADE` for a near
   *  leg you merely want darker; that is `FORM`. */
  tone?: number;
  /** Which way the leg faces; -1 leans forward, +1 back. */
  side?: number;
  /** Thickness at the hip and at the ankle. For a 96-cell MID quadruped: thigh
   *  18-22 down to 12-14, foreleg 16-18 down to 10-12. */
  thick?: number;
  ankle?: number;
  /** How the joints are marked. Defaults to `'contour'`. See `LegJoints`. */
  joints?: LegJoints;
  /**
   * Stamp a closed `DEEP` ring where the limb meets the body. **Now OFF by
   * default, and it should stay off.**
   *
   * It used to default on, and a closed loop of ink round every leg root is
   * exactly the "balloon sculpture" the player is complaining about. A leg that
   * needs separating from the torso gets a CAST SHADOW (`cast: true`, the
   * default for a near leg) or one open `occlude()` arc down its leading edge.
   */
  front?: boolean;
  /**
   * Throw the leg's cast shadow onto the torso and the far legs behind it.
   *
   * Defaults ON for a near leg (`tone` is not `SHADE`) and off for a far one,
   * which has nothing behind it to catch a shadow. This is what replaced
   * `front`. Turn it off if you are wrapping the call in your own `cast()`.
   */
  cast?: boolean;
  /** Draw a foot at the bottom. Off if you want to place your own. */
  foot?: boolean;
  /** Foot half-width. **The paw is 60-100 % wider than the ankle** -- that step
   *  IS the foot, and ours were typically 10-20 %, which is why they did not
   *  exist. The default now honours that. */
  footHalf?: number;
  /** Foot tone, when the foot is a different material from the leg -- a hoof,
   *  a root, a talon, a boot. Defaults to the leg tone. */
  footTone?: number;
  /** Claws on the toes. Off by default: a claw only reads if it **crosses the
   *  outline**, which means placing it yourself with `claw()`. */
  claws?: boolean;
  /** Webbing between the toes. */
  webbed?: boolean;
}

/**
 * The FAR leg of a pair, from the near one's numbers.
 *
 * Spread it straight into any of the three leg helpers:
 *
 * ```ts
 * legDigitigrade(p, ...far(cx + 20, G - 44, G, { thick: 20, ankle: 12 }));  // far, first
 * // ... torso ...
 * legDigitigrade(p, cx + 20, G - 44, G, { thick: 20, ankle: 12 });          // near, after
 * ```
 *
 * **Measured: the mean foot-row spread across the shipped roster is 3.5 cells,
 * and six of ten quadrupeds register a single merged ground contact -- a solid
 * bar.** Every foot on the roster lands on the same horizontal line, which is
 * geometrically impossible in a three-quarter view and is why our animals read
 * as furniture. This encodes the numbers that fix it:
 *
 *  - the far foot lands **9 cells higher** (6-12; 3-6 reference pixels, and the
 *    single cue that turns four legs into an animal on a ground plane),
 *  - the far leg is **offset 10 cells forward** (6-14), so the far foreleg
 *    appears *between* the near foreleg and the chest rather than directly
 *    behind it,
 *  - it is **2-3 cells narrower**, and painted `SHADE` -- a genuinely separate
 *    part set behind another one, which is the one case that wants the ink,
 *  - no cast shadow, because there is nothing behind it to catch one.
 *
 * `dx` and `dy` override the offsets for a creature standing some other way.
 */
export function far(x: number, hipY: number, groundY: number, o: LegOpts = {},
  dx = -10, dy = -9): [number, number, number, LegOpts] {
  return [x + dx, hipY, groundY + dy, {
    ...o,
    tone: o.tone ?? SHADE,
    thick: o.thick === undefined ? undefined : Math.max(3, o.thick - 3),
    ankle: o.ankle === undefined ? undefined : Math.max(2, o.ankle - 2),
    footHalf: o.footHalf === undefined ? undefined : Math.max(3, o.footHalf - 2),
    cast: false,
  }];
}

/** One joint mark: a short `FORM` band across the front of the limb. Never ink,
 *  never three ruled rows. Silent below 8 cells, where nothing would read. */
function jointMark(p: Pen, x: number, y: number, half: number, kind: LegJoints): void {
  if (kind !== 'crease' || half < 4) return;
  const hh = Math.max(2, half);
  for (let d = -hh; d <= hh; d++) {
    const dy = Math.round(Math.abs(d) * 0.35);
    cellOver(p, x + d, y - dy, FORM);
    cellOver(p, x + d, y - dy + 1, FORM);
  }
}

/**
 * A digitigrade leg -- the backwards-bending kind a cat, a dog or a raptor has.
 * Thigh **forward**, shin **back**, foot **forward** again.
 *
 * That zigzag is the highest-value free change on any quadruped: three
 * segments, nine numbers, no ink, and the whole event lives in the outline so
 * it survives the icon. Half the roster's limbs are two-point straight tubes
 * and that is most of why the animals read as pegs under a barrel.
 *
 * It had **zero call sites** before this round because it hard-called `crease`
 * twice, painting about 48 cells of ruled inked banding per leg. That is gone.
 *
 * NOT FOR: the FOREleg. A foreleg is comparatively straight -- one gentle S --
 * and the *difference* between the two pairs is a large part of what says
 * "quadruped". Draw the foreleg with two or three `limbPath` calls yourself.
 */
export function legDigitigrade(p: Pen, hipX: number, hipY: number, groundY: number, o: LegOpts = {}): void {
  const tone = o.tone ?? BASE;
  const draw = (): void => {
    const side = o.side ?? -1, joints = o.joints ?? 'contour';
    const th = o.thick ?? 9, an = o.ankle ?? Math.max(4, th * 0.5);
    const len = groundY - hipY;
    const kneeX = hipX + side * len * 0.16, kneeY = hipY + len * 0.40;
    const hockX = hipX - side * len * 0.14, hockY = hipY + len * 0.72;
    const toeX = hockX + side * len * 0.16;
    const f = o.front ? { front: true } : {};
    limbPath(p, [[hipX, hipY], [kneeX, kneeY]], th, th * 0.78, tone, { ...f, bulge: th * 0.14 });
    limbPath(p, [[kneeX, kneeY], [hockX, hockY]], th * 0.78, an, tone);
    limbPath(p, [[hockX, hockY], [toeX, groundY - 2]], an, an * 0.88, tone);
    // The hock is the sharpest angle on the animal. Bite the reversal into the
    // contour so it is still there at 64 px.
    if (joints === 'contour') notch(p, hockX - side * an * 0.75, hockY, an * 0.8, an * 0.45, side, 0);
    jointMark(p, kneeX, kneeY, th * 0.42, joints);
    jointMark(p, hockX, hockY, an * 0.5, joints);
    if (o.foot !== false) {
      paw(p, toeX, groundY, o.footHalf ?? Math.max(5, an * 1.5),
        { tone: o.footTone ?? tone, claws: o.claws, webbed: o.webbed });
    }
  };
  if (o.cast ?? tone !== SHADE) cast(p, o.thick ?? 9, draw); else draw();
}

/**
 * A plantigrade leg -- the flat-footed kind a bear, an otter or a person has.
 * Heavier and more settled than digitigrade; use it for anything that sits,
 * stands square or is meant to look slow.
 *
 * NOT FOR: anything meant to look fast. A flat foot planted under a straight
 * knee is the silhouette of furniture.
 */
export function legPlantigrade(p: Pen, hipX: number, hipY: number, groundY: number, o: LegOpts = {}): void {
  const tone = o.tone ?? BASE;
  const draw = (): void => {
    const side = o.side ?? -1, joints = o.joints ?? 'contour';
    const th = o.thick ?? 11, an = o.ankle ?? Math.max(5, th * 0.55);
    const len = groundY - hipY;
    const kneeX = hipX + side * len * 0.22, kneeY = hipY + len * 0.52;
    const ankX = hipX + side * len * 0.06;
    const f = o.front ? { front: true } : {};
    limbPath(p, [[hipX, hipY], [kneeX, kneeY]], th, th * 0.72, tone, { ...f, bulge: th * 0.18 });
    limbPath(p, [[kneeX, kneeY], [ankX, groundY - 3]], th * 0.72, an, tone);
    if (joints === 'contour') notch(p, kneeX - side * th * 0.5, kneeY + len * 0.06, th * 0.5, th * 0.28, side, 0);
    jointMark(p, kneeX, kneeY, th * 0.44, joints);
    if (o.foot !== false) {
      // A flat foot is longer than it is wide and reaches forward of the ankle.
      const half = o.footHalf ?? Math.max(6, an * 1.6);
      paw(p, ankX + side * half * 0.35, groundY, half,
        { tone: o.footTone ?? tone, claws: o.claws, webbed: o.webbed, long: true });
    }
  };
  if (o.cast ?? tone !== SHADE) cast(p, o.thick ?? 11, draw); else draw();
}

/**
 * A braced column leg: short, thick, splayed outward, planted.
 *
 * For anything squat -- a tortoise, a stump, a bud, a boulder with feet. The
 * splay is the read: a vertical cylinder is furniture, a leaning one is weight.
 */
export function legColumn(p: Pen, topX: number, topY: number, groundY: number, o: LegOpts = {}): void {
  const tone = o.tone ?? BASE;
  const draw = (): void => {
    const side = o.side ?? -1;
    const th = o.thick ?? 13;
    const footX = topX + side * (groundY - topY) * 0.26;
    const f = o.front ? { front: true } : {};
    limbPath(p, [[topX, topY], [topX + side * (groundY - topY) * 0.10, topY + (groundY - topY) * 0.5], [footX, groundY - 3]],
      th, th * 1.02, tone, { ...f });
    if (o.foot !== false) {
      paw(p, footX, groundY, o.footHalf ?? Math.max(7, th * 0.95),
        { tone: o.footTone ?? tone, claws: o.claws, webbed: o.webbed, toes: 3 });
    }
  };
  if (o.cast ?? tone !== SHADE) cast(p, o.thick ?? 13, draw); else draw();
}

export interface PawOpts {
  tone?: number;
  /** How many toes. **Three, on anything below about 1.2 m.** Two for a hoof or
   *  a strict side view. Four and five are for a hand, and `thornmarch`'s five
   *  equal digits are the reason that rule exists. */
  toes?: number;
  /** Claws. **Off by default.** A claw drawn inside the foot is invisible; a
   *  claw only reads if it projects **past the silhouette**, and at this size
   *  the honest way to get one is `claw()` placed by hand at the toe tip. */
  claws?: boolean;
  webbed?: boolean;
  /** A long flat foot rather than a compact pad. */
  long?: boolean;
  /** Claw tone. `ACCENT_LIT` survives the shading pass, which is why a claw on a
   *  shadowed foot still reads. */
  clawTone?: number;
}

/**
 * A planted foot with **carved** toes.
 *
 * Toes are what stop a leg ending in a bar, and a bar is the loudest tell in
 * generated art -- but the gaps are cut out of the bottom contour, not ruled on
 * as 1-cell `DEEP` strokes. A stroke there is half a reference pixel and is
 * gone at 64 px; a notch is a shape change and survives all the way down.
 *
 * The pad's underside is a shallow **arch**, so the middle toe comes out about
 * a quarter longer than its neighbours, which is what a real foot does.
 *
 * NOT FOR: a hand -- see `hand()`, which has an opposed thumb. And do not make
 * it the same width as the ankle: **the foot is 60-100 % wider**, and that step
 * is the entire read.
 */
export function paw(p: Pen, x: number, y: number, half: number, o: PawOpts = {}): void {
  const hw = Math.max(2.5, half), tone = o.tone ?? BASE;
  const depth = o.long ? hw * 1.25 : hw * 0.8;
  blob(p, x, y - depth * 0.35, hw, depth * 0.8, tone);
  rect(p, x - hw, y - depth * 0.4, x + hw, y, tone);

  const toes = o.toes ?? 3;
  const pitch = (hw * 2) / toes;
  // The arch: shave the two outer corners back so the middle toe leads by about
  // a quarter. A flat bar of equal toes reads as a comb even after it is cut.
  const roll = Math.max(1.5, hw * 0.28);
  poly(p, [[x - hw - 1, y + 1], [x - hw - 1, y - roll], [x - hw + pitch * 0.9, y + 1]], EMPTY);
  poly(p, [[x + hw + 1, y + 1], [x + hw + 1, y - roll], [x + hw - pitch * 0.9, y + 1]], EMPTY);
  toeNotches(p, x - hw, x + hw, y, toes, Math.max(3, Math.round(depth * 0.55)));
  if (o.webbed) {
    // A web is a shallow sag between two toes: a value step, not a line.
    for (let i = 1; i < toes; i++) {
      const gx = x - hw + pitch * i;
      stroke(p, gx, y - depth * 0.5, gx, y - depth * 0.15, FORM);
    }
  }
  if (o.claws) {
    for (let i = 0; i < toes; i++) {
      const tx = x - hw + pitch * (i + 0.5);
      claw(p, tx, y - 1, 4, -0.4, 1, o.clawTone ?? ACCENT_LIT);
    }
  }
}

/**
 * One claw, grown outward from a point along a direction.
 *
 * **It must cross the outline.** Start it a cell or two inside the toe and aim
 * it out into empty space; a claw drawn wholly inside a foot is four cells of
 * accent nobody will ever see. 4-6 cells long, 3 at the root.
 */
export function claw(p: Pen, x: number, y: number, len: number, dx: number, dy: number, v = ACCENT_LIT): void {
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  for (let i = 0; i <= len; i++) {
    const t = i / Math.max(1, len);
    const half = Math.max(0, Math.round((1 - t) * 1.4));
    for (let k = -half; k <= half; k++) {
      cell(p, x + ux * i - uy * k, y + uy * i + ux * k, k < 0 ? v : ACCENT);
    }
  }
  cell(p, x, y, ACCENT_DARK);
}

export interface HandOpts {
  tone?: number;
  /** -1 for a left hand, +1 for a right; sets which side the thumb is on. */
  side?: number;
  fingers?: number;
  /** Closed into a fist rather than open. */
  fist?: boolean;
  claws?: boolean;
  webbed?: boolean;
}

/**
 * A hand that can grip: a palm mass, three fingers with **sky between them**,
 * and an opposed thumb. The thumb is the whole read -- three sausages without
 * one is a mitten.
 *
 * The gaps are carved out of the silhouette, not ruled on: at 64 px a finger is
 * two or three pixels and a `DEEP` line between two of them is nothing.
 * **Three fingers plus a thumb**, 5-7 cells long and 4-5 wide.
 *
 * NOT FOR: a foot. Use `paw()`. And not for anything under about 10 cells of
 * palm radius, where four digits cannot be told apart at any distance.
 */
export function hand(p: Pen, x: number, y: number, r: number, o: HandOpts = {}): void {
  const tone = o.tone ?? BASE, side = o.side ?? -1, n = o.fingers ?? 3;
  blob(p, x, y, r, r * 1.05, tone);
  if (o.fist) {
    // A fist is knuckles: a scalloped upper contour, not four ruled lines.
    for (let i = 0; i < n; i++) {
      const fy = y - r * 0.6 + (r * 1.3 * (i + 0.5)) / n;
      if (i > 0) notch(p, x - r * 0.95, fy - r * 0.65 / n, r * 0.5 / n + 1, r * 0.5, 1, 0);
      stroke(p, x - r * 0.8, fy, x + r * 0.4, fy, FORM);
    }
    return;
  }
  const angOf = (i: number): number =>
    -Math.PI / 2 + side * ((n === 1 ? 0.5 : i / (n - 1)) - 0.5) * 1.2;
  const lenOf = (i: number): number =>
    r * (1.45 - Math.abs((n === 1 ? 0.5 : i / (n - 1)) - 0.5) * 0.5);

  // Webbing first, behind the digits, one tone down so it reads as skin
  // stretched between them rather than as more finger.
  if (o.webbed) {
    for (let i = 1; i < n; i++) {
      const a0 = angOf(i - 1), a1 = angOf(i), l0 = lenOf(i - 1) * 0.75, l1 = lenOf(i) * 0.75;
      poly(p, [[x, y], [x + Math.cos(a0) * l0, y + Math.sin(a0) * l0],
        [x + Math.cos((a0 + a1) / 2) * l0 * 0.82, y + Math.sin((a0 + a1) / 2) * l0 * 0.82],
        [x + Math.cos(a1) * l1, y + Math.sin(a1) * l1]], SHADE);
    }
  }
  for (let i = 0; i < n; i++) {
    const ang = angOf(i), flen = lenOf(i);
    limbPath(p, [[x, y], [x + Math.cos(ang) * flen, y + Math.sin(ang) * flen]], r * 0.52, r * 0.36, tone);
  }
  // The gaps, CARVED. Drawn after every digit is down, because a gap cut before
  // the next finger goes on top of it is a gap that no longer exists -- which is
  // why the first version of this helper produced mittens. A carved gap is sky
  // between two fingers and it is still there at icon scale; the `DEEP` stroke
  // this used to draw was not.
  if (!o.webbed) {
    for (let i = 1; i < n; i++) {
      const am = (angOf(i - 1) + angOf(i)) / 2, l = Math.min(lenOf(i - 1), lenOf(i));
      const gx = x + Math.cos(am) * l * 1.05, gy = y + Math.sin(am) * l * 1.05;
      notch(p, gx, gy, Math.max(2, r * 0.5), l * 0.72, -Math.cos(am), -Math.sin(am));
    }
  }
  if (o.claws) {
    for (let i = 0; i < n; i++) {
      const ang = angOf(i), flen = lenOf(i);
      claw(p, x + Math.cos(ang) * flen, y + Math.sin(ang) * flen, 3, Math.cos(ang), Math.sin(ang));
    }
  }
  // Opposed thumb, low and on the near side. Without it this is a mitten
  // however many fingers are on it.
  const tang = side < 0 ? -Math.PI * 0.02 : Math.PI * 1.02;
  const thX = x - side * r * 1.05, thY = y + r * 0.45;
  limbPath(p, [[x, y + r * 0.2], [thX, thY]], r * 0.6, r * 0.44, tone);
  notch(p, lerp(x, thX, 0.55), thY - r * 0.55, r * 0.45, r * 0.5, 0, 1);
  if (o.claws) claw(p, thX, thY, 3, Math.cos(tang), Math.sin(tang));
  // The palm: a paler MATERIAL inset from the contour, not a lit rim.
  blob(p, x, y + r * 0.1, r * 0.5, r * 0.55, tone === SHADE ? SHADE : LIGHT);
}

/* ------------------------------------------------------------- heads */

export interface MuzzleOpts {
  /** -1 points the snout left (the house default), +1 right. */
  dir?: number;
  /** The muzzle's material. `BASE` for a no-stop head; `LIGHT` only where the
   *  species genuinely has a pale snout AND there is a stop for it to sit
   *  under. A pale ellipse on a straight wedge is a stain, not a muzzle. */
  tone?: number;
  /** Add the ONE mark below the eyes: a nostril. Off by default -- see the note
   *  on the function. Never combine with a `mouthLine`; one mark, never two. */
  detail?: boolean;
  /** Fangs at the corners of the closed jaw. */
  fangs?: boolean;
  /** How far the mouth line turns down (negative turns it up into a smile).
   *  Only drawn if you also ask for `mouth`. */
  frown?: number;
  /** Draw a closed mouth instead of a nostril. Only where the muzzle is wide. */
  mouth?: boolean;
  /** How steeply the rear edge slants back, in cells of run per cell of depth.
   *  0.5-0.9 is the useful band; 0 gives a vertical cut, which reads as a mask
   *  rather than as bone. */
  slant?: number;
  /** Throw the muzzle's shadow onto the jaw beneath it. On by default: it is
   *  one of the three tonal events a reference head carries. */
  cast?: boolean;
}

/**
 * A snout pushed forward of the skull, as a **polygon with a slanted rear
 * edge** -- not an ellipse, and not ringed.
 *
 * Four things separate a reference muzzle from the pale wedge we shipped, and
 * this helper does three of them; you do the fourth by choosing where to put it.
 *
 *  1. **The rear boundary is an angled straight edge**, running down-and-forward
 *     from behind the eye to under the jaw. The same area as an axis-aligned
 *     oval reads as a stain; slanted, it reads as bone.
 *  2. **It sits LOWER than the eye row.** Put `y` so the TOP of this mass is at
 *     or below the bottom of the eye and the face acquires a brow immediately.
 *     For a MID skull the top plane is **6-8 cells below the top of the
 *     cranium** -- that drop is the *stop*, and it must be visible in the
 *     silhouette.
 *  3. **It throws a shadow onto the jaw**, which is the tonal event that puts
 *     it in front of the head rather than painted on it.
 *  4. No ring. Nothing is stamped around it. It welds into the skull, and the
 *     silhouette does the separating.
 *
 * `detail` is **off** by default. Every creature gets exactly ONE mark below the
 * eyes and never two; if the nostril is that mark, ask for it here, and if the
 * mark is a beak, a jaw or nothing, do not.
 *
 * NOT FOR: a head with no stop -- a reptile, a bird, a grazer. **If the stop is
 * zero there must be no pale muzzle patch either.** Draw those heads as one
 * wedge and put the mark below the eyes somewhere on it.
 */
export function muzzle(p: Pen, x: number, y: number, rx: number, ry: number, o: MuzzleOpts = {}): void {
  const dir = o.dir ?? -1, rxx = Math.max(3, rx), ryy = Math.max(2.5, ry);
  const slant = o.slant ?? 0.7;
  const tone = o.tone ?? BASE;
  // Front to back: nose top, nose tip, chin, jaw corner, and the slanted rear
  // edge closing it. The rear edge is the whole point -- it is the line
  // Poochyena's face-mask ends on.
  const shape: Pt[] = [
    [x - dir * rxx * 0.9 - dir * ryy * slant, y - ryy],
    [x + dir * rxx * 0.72, y - ryy * 0.86],
    [x + dir * rxx, y - ryy * 0.1],
    [x + dir * rxx * 0.8, y + ryy * 0.85],
    [x - dir * rxx * 0.55, y + ryy],
    [x - dir * rxx * 0.9, y + ryy * 0.55],
  ];
  const draw = (): void => poly(p, shape, tone);
  if (o.cast === false) draw(); else cast(p, rxx * 2, draw);
  if (o.mouth) mouthLine(p, x, y + Math.max(2, ryy * 0.5), rxx * 0.7, o.frown ?? 1, o.fangs);
  else if (o.detail) nostril(p, x + dir * rxx * 0.62, y - ryy * 0.25, dir);
}

/**
 * A nostril: two or three `INNER` cells with one pale cell under them.
 *
 * **Three cells, and it is the highest value-per-cell mark anywhere on the
 * sprite.** 36 of 48 shipped species have fewer than three `INNER` cells
 * anywhere in the lower face, and that emptiness is a large part of the
 * kindergarten read. The pale cell under the cavity is the difference between a
 * nostril and a dirty mark.
 */
export function nostril(p: Pen, x: number, y: number, dir = -1): void {
  cellOver(p, x, y, INNER);
  cellOver(p, x + dir, y, INNER);
  cellOver(p, x, y + 1, LIGHT);
}

/**
 * THE JAW LINE: one open stroke from the ear root down-and-forward to the mouth
 * corner, **both ends terminating on the silhouette**.
 *
 * Three or four cells of ink and it is the whole difference between a head and
 * a wedge. Mightyena, Manectric, Absol, Vigoroth and Zangoose all draw it and
 * we draw it on nothing. 20-26 cells long, angled down-forward at about 25
 * degrees.
 *
 * NOT FOR: a head with no cheek -- a bird, a fish, a mineral. And never draw it
 * *and* a cheek marking; that is two events where the budget allows one.
 */
export function jawLine(p: Pen, earX: number, earY: number, chinX: number, chinY: number, tone = DEEP): void {
  occlude(p, [[earX, earY], [lerp(earX, chinX, 0.55), lerp(earY, chinY, 0.62)], [chinX, chinY]], tone);
}

/**
 * A closed mouth. `curve` positive drops the corners into a scowl, negative
 * lifts them into a smile, zero is a flat determined line.
 */
export function mouthLine(p: Pen, x: number, y: number, half: number, curve = 1, fangs = false): void {
  const h = Math.max(2, half);
  stroke(p, x - h + 1.5, y, x + h - 1.5, y, INNER);
  stroke(p, x - h, y + curve, x - h + 1.5, y, INNER);
  stroke(p, x + h - 1.5, y, x + h, y + curve, INNER);
  // The lower lip is a value step on the same surface, not a second colour.
  if (h >= 5) stroke(p, x - h + 1, y + 1, x + h - 1, y + 1, FORM);
  if (fangs) {
    for (const side of [-1, 1]) {
      const tx = x + side * (h - 1);
      cellOver(p, tx, y + 1, ACCENT_LIT);
      cellOver(p, tx, y + 2, ACCENT_LIT);
    }
  }
}

export interface JawOpts {
  dir?: number;
  /** How far open, 0..1. */
  open?: number;
  teeth?: number;
  tongue?: boolean;
  tone?: number;
}

/**
 * An open jaw: a dark cavity, a tongue in it, and teeth top and bottom.
 *
 * An open mouth is the single loudest expression a sprite can carry, and it is
 * mostly a hole -- the cavity has to be `INNER`, not shadow, or it reads as a
 * bite taken out of the head. **The gape must break the head's silhouette**, or
 * it is a dark patch painted on a face.
 *
 * This is one of the five permitted marks below the eyes, and it excludes the
 * other four. **Two or three species in the whole roster**, no more -- forty-
 * eight shouting creatures is a roster of one expression.
 */
export function jaw(p: Pen, x: number, y: number, rx: number, o: JawOpts = {}): void {
  const dir = o.dir ?? -1, open = clamp(o.open ?? 0.6, 0.1, 1);
  const gap = Math.max(3, rx * open * 1.25);
  poly(p, [[x - rx, y], [x + rx, y - gap * 0.25], [x + rx * 0.85, y + gap * 0.7], [x - rx * 0.9, y + gap * 0.55]], INNER);
  if (o.tongue !== false) {
    poly(p, [[x - rx * 0.55, y + gap * 0.28], [x + rx * 0.5, y + gap * 0.18],
      [x + rx * 0.45, y + gap * 0.55], [x - rx * 0.5, y + gap * 0.55]], ACCENT_DARK);
    stroke(p, x - rx * 0.5, y + gap * 0.3, x + rx * 0.45, y + gap * 0.24, ACCENT);
  }
  teeth(p, x - rx * 0.75, y + 1, o.teeth ?? 3, 2.5, 1, rx * 1.5);
  teeth(p, x - rx * 0.7, y + gap * 0.6, o.teeth ?? 3, 2, -1, rx * 1.4);
  // The lip: a lit rim on the upper jaw so the cavity is behind something.
  stroke(p, x - rx, y - 1, x + rx, y - gap * 0.25 - 1, o.tone ?? LIGHT);
}

/**
 * A row of triangular teeth. `dir` +1 points them down, -1 up.
 *
 * **Two fangs, or four to six inside an open jaw.** A fang is 4-6 cells and
 * reads best as a break in the lip line -- a silhouette event -- rather than as
 * pale cells inside a closed mouth, where at 64 px it is a smudge.
 */
export function teeth(p: Pen, x: number, y: number, count: number, size: number, dir = 1, span = 10, v = ACCENT_LIT): void {
  const pitch = span / Math.max(1, count);
  for (let i = 0; i < count; i++) {
    const tx = x + pitch * (i + 0.5);
    for (let k = 0; k <= size; k++) {
      const half = Math.max(0, Math.round((1 - k / size) * 1.2));
      for (let d = -half; d <= half; d++) cell(p, tx + d, y + dir * k, d > 0 ? ACCENT : v);
    }
  }
}

export interface BeakOpts {
  dir?: number;
  /** The beak's material. `ACCENT2` by default -- a beak is exactly the case
   *  the third palette slot exists for, and on the two birds the declared beak
   *  gold used to be thrown away because `accent` was doubling as the ink. */
  tone?: number;
  /** Hooked at the tip, like a raptor. */
  hooked?: boolean;
  /** Split into an upper and a lower mandible with a gap. */
  open?: number;
}

/**
 * A beak: a wedge projecting **past the head's silhouette**, with a cere line
 * where it meets the face and a nostril up near that line.
 *
 * This is one of the five permitted marks below the eyes, and on a bird it is
 * the whole lower face -- **do not also give it a mouth or a nostril of its
 * own.** Make it long enough to break the outline; a beak that stops inside the
 * head contour is a triangle painted on a face.
 */
export function beak(p: Pen, x: number, y: number, len: number, depth: number, o: BeakOpts = {}): void {
  const dir = o.dir ?? -1, tone = o.tone ?? ACCENT2;
  const dark = tone === ACCENT2 ? ACCENT2_DARK : ACCENT_DARK;
  const tipX = x + dir * len, tipY = y + depth * (o.hooked ? 0.55 : 0.15);
  poly(p, [[x, y - depth * 0.55], [tipX, tipY], [x, y + depth * 0.5]], tone);
  if (o.hooked) poly(p, [[tipX, tipY], [tipX + dir * 2, tipY + depth * 0.45], [tipX - dir * 2, tipY + depth * 0.2]], dark);
  if (o.open) {
    poly(p, [[x, y + depth * (0.5 + o.open * 0.5)], [x + dir * len * 0.8, tipY + depth * o.open],
      [x, y + depth * (0.25 + o.open * 0.4)]], tone);
    stroke(p, x, y + depth * 0.35, x + dir * len * 0.8, tipY + depth * 0.1, INNER, false);
  } else {
    // The gape: one line, tip to face, both ends on the silhouette.
    stroke(p, x, y + depth * 0.12, tipX, tipY - depth * 0.05, DEEP);
  }
  // Cere and nostril, up near the face where a bird's actually is.
  stroke(p, x - dir, y - depth * 0.55, x - dir, y + depth * 0.5, dark);
  cellOver(p, x + dir * len * 0.22, y - depth * 0.2, INNER);
}

/**
 * Whiskers: fine lines springing from the cheek. Drawn free of the body, so the
 * outline pass gives each one its own ink.
 *
 * **Two or three, and long.** Each one is a separate silhouette object and each
 * one gets a 2-cell outline of its own, so five short whiskers is five inked
 * blobs beside the face and nothing that reads as a whisker. At 64 px a whisker
 * under about 14 cells does not survive at all.
 */
export function whiskers(p: Pen, x: number, y: number, count: number, side: number, len: number, spread = 0.5, v = LIGHT): void {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const ang = (t - 0.5) * spread * 2;
    const pts: Pt[] = [[x, y], [x + side * len * 0.5, y + Math.sin(ang) * len * 0.35],
      [x + side * len, y + Math.sin(ang) * len * 0.9]];
    polyLine(p, path(pts), v, false, false);
  }
}

/* -------------------------------------------------------------- ears */

/*
 * EARS. The rule that changed, and it applies to every helper below.
 *
 * Ours were triangles fully outlined all the way round, sitting on the skull
 * with body colour visible between ear and cranium. That is a paper cut-out.
 *
 * In the reference the ear's outline is **continuous with the skull's** on the
 * rear side, and the ear root is a **DIP IN THE HEAD CONTOUR**, not a separate
 * shape. The interior is a **single dark cavity** (`INNER`), not a lighter
 * triangle inside a darker one.
 *
 * So: every ear here now overlaps the cranium and none of them stamp a ring.
 * Sink the root 4-6 cells INTO the skull when you place it, and use `notch()`
 * to bite the occiput dip in behind it. `front: true` is still available for
 * the rare ear that genuinely stands clear of the head, and it should stay
 * rare.
 *
 * And do not expect a lit edge on an ear: a mass under 14 cells thick gets two
 * tones and no highlight at all.
 */

export interface EarOpts {
  tone?: number;
  /** Inner-ear tone. `INNER` is a cavity -- one dark region, which is what the
   *  reference draws. `ACCENT` makes it a coloured ear; use that only if the
   *  colour is part of the species. */
  inner?: number;
  /** Stamp a ring where the ear meets the skull. **Off, and it should stay
   *  off** -- an ear is not a closed object sitting on a surface. */
  front?: boolean;
  /** Fur along the ear's leading edge. */
  tufted?: boolean;
}

/** A pointed ear leaning `lean` cells sideways over `len` cells of height.
 *  Place `y` 4-6 cells INSIDE the cranium so the two outlines are one. */
export function earPointed(p: Pen, x: number, y: number, len: number, lean: number, side: number, o: EarOpts = {}): void {
  const tone = o.tone ?? BASE, w = Math.max(4, len * 0.55);
  const tip: Pt = [x + side * lean, y - len];
  const shape: Pt[] = [[x - w * 0.5, y + 1], [x + w * 0.6, y], tip];
  if (o.front) polyFront(p, shape, tone, DEEP, 1.5); else poly(p, shape, tone);
  // One dark cavity, about half the ear's area. Not a paler triangle.
  poly(p, [[x - w * 0.15, y - 1], [x + w * 0.3, y - 2], [tip[0] + side * -0.5, tip[1] + len * 0.35]], o.inner ?? INNER);
  if (o.tufted) for (let i = 1; i < 4; i++) {
    const t = i / 4;
    tuft(p, lerp(x - w * 0.5, tip[0], t), lerp(y, tip[1], t), 3, Math.PI + side * 0.6, 0.5, tone);
  }
}

/** A round ear: a disc welded to the skull with a cavity inside it. */
export function earRound(p: Pen, x: number, y: number, r: number, side: number, o: EarOpts = {}): void {
  if (o.front) blobFront(p, x, y, r, r * 1.05, o.tone ?? BASE, DEEP, 1.5);
  else blob(p, x, y, r, r * 1.05, o.tone ?? BASE);
  // The bowl stays under half the ear. Filled to two thirds -- which looks
  // right on paper -- a small ear comes out as a hole punched in the skull.
  blob(p, x + side * r * 0.18, y + r * 0.16, r * 0.5, r * 0.55, o.inner ?? INNER);
}

/** A finned ear: a webbed fan with rays, for anything aquatic. */
export function earFinned(p: Pen, x: number, y: number, len: number, side: number, o: EarOpts = {}): void {
  const edge: Pt[] = [
    [x + side * len * 0.05, y - len * 0.9],
    [x + side * len * 0.45, y - len],
    [x + side * len * 0.85, y - len * 0.7],
    [x + side * len * 1.0, y - len * 0.25],
  ];
  fin(p, [x, y + 1], edge, { tone: o.tone ?? ACCENT, rays: 4, front: o.front });
}

/** A tufted ear: three or four spikes of fur rather than a flap. */
export function earTuft(p: Pen, x: number, y: number, len: number, side: number, o: EarOpts = {}): void {
  const tone = o.tone ?? BASE, w = Math.max(3, len * 0.22);
  // A wedge of hair behind the spikes, so the tuft has a body. Three bare
  // triangles with gaps between them read as three hairs, not as an ear.
  const body: Pt[] = [[x - w, y + 1], [x + w, y + 1], [x + side * w * 1.3, y - len * 0.55]];
  if (o.front) polyFront(p, body, tone, DEEP, 1.5); else poly(p, body, tone);
  for (let i = -1; i <= 1; i++) {
    const lean = side * (w * 0.5 + i * w * 0.9);
    const l = len * (1 - Math.abs(i) * 0.24);
    // The rearmost spike is a genuinely separate part behind the others, so it
    // takes SHADE and earns its ink; the other two are the same surface.
    poly(p, [[x - w * 0.7, y + 1], [x + w * 0.7, y + 1], [x + lean, y - l]], i === 1 ? SHADE : tone);
  }
}

/* ------------------------------------------------------ horns & spines */

export interface HornOpts {
  tone?: number;
  /** How far the horn curls, in cells, perpendicular to its length. */
  curl?: number;
  /** Growth rings. A horn has them; a spike does not. */
  ringed?: boolean;
  thick?: number;
}

/**
 * A tapered horn along a curve, with growth rings and a bright tip.
 *
 * The curl is the read: a straight cone is a traffic bollard. `ringed` gives it
 * **three to six** growth rings, tapering toward the tip; a spike has none.
 */
export function horn(p: Pen, x: number, y: number, len: number, side: number, o: HornOpts = {}): void {
  const curl = o.curl ?? len * 0.35, th = o.thick ?? Math.max(3, len * 0.32);
  const pts: Pt[] = [[x, y], [x + side * curl * 0.35, y - len * 0.45], [x + side * curl, y - len * 0.85], [x + side * curl * 1.5, y - len]];
  const dense = path(pts);
  limbPath(p, dense, th, 1.2, o.tone ?? ACCENT, { dark: ACCENT_DARK });
  if (o.ringed !== false) rings(p, dense, clamp(Math.round(len / 7), 3, 6), th * 0.55, ACCENT_DARK);
  const tip = dense[dense.length - 1]!;
  cell(p, tip[0], tip[1], ACCENT_LIT);
  cell(p, tip[0], tip[1] - 1, ACCENT_LIT);
}

/** An antler: a curved main beam with tines branching off it. Two or three
 *  tines; a rack of six at this size is a bush. */
export function antler(p: Pen, x: number, y: number, len: number, tines: number, side: number, o: HornOpts = {}): void {
  const tone = o.tone ?? ACCENT;
  const beam = path([[x, y], [x + side * len * 0.2, y - len * 0.4], [x + side * len * 0.5, y - len * 0.78], [x + side * len * 0.62, y - len]]);
  limbPath(p, beam, o.thick ?? 4, 1.4, tone, { dark: ACCENT_DARK });
  for (let i = 0; i < tines; i++) {
    const t = 0.3 + (i / Math.max(1, tines)) * 0.55;
    const q = beam[Math.round(t * (beam.length - 1))]!;
    const tl = len * (0.4 - i * 0.06);
    limbPath(p, [[q[0], q[1]], [q[0] + side * tl * 0.25, q[1] - tl * 0.7], [q[0] + side * tl * 0.55, q[1] - tl]], 3, 1.2, tone);
  }
}

/**
 * Triangular spines riding a path, tallest in the middle.
 *
 * **Three to eight, and they must VARY.** A reference spike row is tallest at
 * the shoulder and tapers both ways, which this does by construction;
 * `chalkmar`'s seven identical evenly-spaced back spikes are a comb, and
 * `rimehound`'s five taper and are the best thing on that sprite.
 *
 * `lit` defaults to -1 now: a pale run up every spike on a row of 5-cell spikes
 * is the row striped. Pass `ACCENT_LIT` only for a genuinely hard mineral crest.
 */
export function spineRow(p: Pen, pts: Pt[], count: number, len: number, v = ACCENT, lit = -1): void {
  const dense = path(pts);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const q = dense[Math.round(t * (dense.length - 1))]!;
    const n = normalAt(dense, Math.round(t * (dense.length - 1)));
    const l = len * (0.55 + Math.sin(t * Math.PI) * 0.7);
    const base = Math.max(2, l * 0.42);
    poly(p, [[q[0] - n[1] * base, q[1] + n[0] * base], [q[0] + n[1] * base, q[1] - n[0] * base],
      [q[0] + n[0] * l, q[1] + n[1] * l]], v);
    if (lit >= 0) stroke(p, q[0] - n[1] * base, q[1] + n[0] * base, q[0] + n[0] * l, q[1] + n[1] * l, lit, true);
  }
}

/* ------------------------------------------------------------ fur */

/** One spiky tuft of hairs, springing from a point. `ang` is the direction in
 *  radians, `spread` how wide the fan opens. */
export function tuft(p: Pen, x: number, y: number, len: number, ang: number, spread = 0.6, v = BASE): void {
  for (let i = -1; i <= 1; i++) {
    const a = ang + i * spread;
    const l = len * (1 - Math.abs(i) * 0.3);
    poly(p, [[x - Math.sin(ang) * 1.5, y + Math.cos(ang) * 1.5], [x + Math.sin(ang) * 1.5, y - Math.cos(ang) * 1.5],
      [x + Math.cos(a) * l, y + Math.sin(a) * l]], v);
  }
}

export interface ManeOpts {
  /** A pale run on the clump tips. Off by default: a lit tip is one specular
   *  event per clump, and the budget is one per creature. */
  lit?: number;
  /** The step where the coat meets the skin. `FORM` -- a value step, no line.
   *  -1 skips it. It used to be `DEEP`, which ruled a black seam the length of
   *  the root and is where a lot of the ink budget went. */
  root?: number;
  /** Force which side the clumps grow: -1 or +1. Leave unset and the mask is
   *  asked. Set it only for a mass drawn in open space, where there is no
   *  "inside" to detect -- the two faces of a plume tail, for instance. */
  side?: number;
}

/**
 * A fur mass with a jagged outer edge, laid along a path.
 *
 * **This is the only correct mechanism for fur on this roster, and there should
 * be exactly ONE call per creature.** Fur is drawn only where the coat makes
 * the SILHOUETTE jagged -- the neck ruff, and that is normally it. There is not
 * a single hair drawn on Mightyena's flank; Manectric's mane, Absol's cheek
 * tufts and Zangoose's ruff are all edge events on otherwise perfectly smooth
 * bodies. `blazelynx`, `rimehound`, `frostnip`, `tuftail`, `bristlebuck` and
 * `cinderpaw` each want one `mane()` at the neck and no fur anywhere else.
 *
 * The jag pattern alternates long and short so the edge reads as clumps rather
 * than as a saw blade. `root` steps the tone where the coat meets the skin --
 * `FORM` by default, which is a value step and never a line; it used to be
 * `DEEP`, which ruled a black seam along the whole root.
 *
 * `lit` defaults to -1. Highlights on clump tips were a per-clump specular
 * event, and there are no specular events left in the budget.
 *
 * **Lay the path ON THE CONTOUR**, not down the middle of the mass. `mane` asks
 * the mask which way is out and grows the clumps that way, so a path buried
 * inside the body has no outside to grow into and comes back as a dark lump.
 * `contourTop(p, x0, x1)` gives you the right path in one call.
 *
 * NOT FOR: a body surface. If the fur does not break the outline it is texture,
 * and there is no all-over texture anywhere in the reference generation.
 */
export function mane(p: Pen, pts: Pt[], depth: number, clumps: number, v = BASE, o: ManeOpts = {}): void {
  const lit = o.lit ?? -1, root = o.root ?? FORM;
  const dense = path(pts);
  // Which way is out. Without this the coat grows into the animal -- see
  // `outwardSign`.
  const sgn = o.side ?? outwardSign(p, dense, Math.max(2, depth * 0.5));
  const outer: Pt[] = [];
  for (let i = 0; i < dense.length; i++) {
    const t = i / Math.max(1, dense.length - 1);
    const nn = normalAt(dense, i);
    const n: Pt = [nn[0] * sgn, nn[1] * sgn];
    // Each clump ramps out to a point and drops back almost to the root. The
    // two numbers that matter: how near the trough gets to zero, and whether
    // consecutive clumps are the same length. A shallow trough gives a ribbed
    // tube and equal clumps give a comb -- both were the first two attempts at
    // this and both read as anything except hair.
    const phase = (t * clumps) % 1;
    const which = Math.floor(t * clumps);
    const vary = 0.7 + (((which * 37) % 7) / 7) * 0.55;
    const jag = depth * (0.16 + 0.84 * (1 - Math.abs(phase * 2 - 1)) ** 0.5) * vary;
    outer.push([dense[i]![0] + n[0] * jag, dense[i]![1] + n[1] * jag]);
  }
  poly(p, [...dense, ...outer.slice().reverse()], v);
  // Where the coat meets the skin: ONE value step, no line. A DEEP run here is
  // a black seam along the whole root and it is what the ink budget was going
  // on. Skipped entirely when `root` is negative.
  if (root >= 0) for (const q of dense) cellOver(p, q[0], q[1], root);
  if (lit >= 0) for (let i = 0; i < clumps; i++) {
    const idx = Math.round(((i + 0.5) / clumps) * (dense.length - 1));
    const tip = outer[idx]!, rt = dense[idx]!;
    cellOver(p, tip[0], tip[1], lit);
    cellOver(p, lerp(rt[0], tip[0], 0.75), lerp(rt[1], tip[1], 0.75), lit);
  }
}

/**
 * Which way is OUT along this path, by asking the mask rather than by trusting
 * the winding.
 *
 * A contour traced left-to-right and one traced right-to-left have opposite
 * normals, so a helper that trusts the geometry grows half its fur into the
 * inside of the creature where none of it is ever seen -- and then looks as
 * though it simply does not work. `furEdge` already asked; `mane` and `frill`
 * did not, which is a large part of why they had zero call sites between them.
 *
 * One vote for the whole path, not one per point: a per-point decision makes
 * the mass fold through itself wherever the body's own contour turns.
 */
function outwardSign(p: Pen, dense: Pt[], reach: number): number {
  let inside = 0, outside = 0;
  for (let i = 0; i < dense.length; i += Math.max(1, Math.floor(dense.length / 12))) {
    const q = dense[i]!, n = normalAt(dense, i);
    if (p.m.filled(Math.round(q[0] + n[0] * reach), Math.round(q[1] + n[1] * reach))) inside++;
    else outside++;
  }
  return inside > outside ? -1 : 1;
}

/**
 * Guard hairs breaking a contour: short spikes stepped along a path. Use it on
 * the shadow side only -- fur on the lit contour makes a silhouette fizz.
 *
 * Which way is "out" is decided by *asking the mask*, not by the path's
 * winding. A contour traced clockwise and one traced anticlockwise have
 * opposite normals, so a version that trusts the geometry grows half its fur
 * into the inside of the creature, where none of it is ever seen -- and the
 * helper looks like it simply does not work.
 */
export function furEdge(p: Pen, pts: Pt[], len: number, step: number, v = BASE): void {
  const dense = path(pts);
  for (let i = 0; i < dense.length; i += step) {
    const q = dense[i]!;
    let n = normalAt(dense, i);
    if (p.m.filled(Math.round(q[0] + n[0] * 3), Math.round(q[1] + n[1] * 3))) n = [-n[0], -n[1]];
    const l = len * (0.6 + ((i / step) % 3) * 0.2);
    tuft(p, q[0], q[1], l, Math.atan2(n[1], n[0]), 0.4, v);
  }
}

/* ---------------------------------------------------- leaves & frills */

/**
 * An almond leaf blade with a midrib. Grows from `(x, y)` at angle `ang`,
 * `len` long and `wide` across at its widest.
 *
 * The blade is drawn as a FACET -- one flat tone, no gradient -- because a leaf
 * is a plane and airbrushing it turns it into a green sausage. `veins` adds
 * three or four side ribs; off by default, because on a blade under 10 cells
 * wide they are noise.
 */
export function leaf(p: Pen, x: number, y: number, len: number, ang: number, wide: number, v = ACCENT,
  o: { veins?: boolean } = {}): void {
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const nx = -uy, ny = ux;
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, w = Math.sin(t * Math.PI) ** 0.72 * wide;
    pts.push([x + ux * len * t + nx * w, y + uy * len * t + ny * w]);
  }
  for (let i = 10; i >= 0; i--) {
    const t = i / 10, w = Math.sin(t * Math.PI) ** 0.72 * wide;
    pts.push([x + ux * len * t - nx * w, y + uy * len * t - ny * w]);
  }
  flat(p, () => poly(p, pts, v));
  // The midrib is the fold between the two halves of the blade: one dark line,
  // running the whole length, both ends on the outline.
  stroke(p, x, y, x + ux * len, y + uy * len, ACCENT_DARK);
  if (!o.veins) return;
  for (let i = 1; i <= 9; i++) {
    const t = i / 10, w = Math.sin(t * Math.PI) ** 0.72 * wide;
    if (i % 3 === 1 && w > 1.5) {
      const bx = x + ux * len * t, by = y + uy * len * t;
      stroke(p, bx, by, bx + nx * w * 0.7 - ux * w * 0.4, by + ny * w * 0.7 - uy * w * 0.4, ACCENT_DARK);
      stroke(p, bx, by, bx - nx * w * 0.7 - ux * w * 0.4, by - ny * w * 0.7 - uy * w * 0.4, ACCENT_DARK);
    }
  }
}

/**
 * A scalloped collar or frill along a path -- lobed rather than jagged. For
 * ruffs, gills, petal skirts, fungus caps and moth-wing trailing edges.
 *
 * **The scallop is the whole point and it lives in the silhouette.** Three to
 * eight lobes; below three reads as damage, above eight reads as texture. The
 * membrane is a facet, so it stays one flat tone.
 *
 * `ribs` draws one dark line per lobe from the root to the notch between two
 * lobes. On by default because it is what makes a frill read as pleated rather
 * than as a blob with a wavy edge -- but it is `lobes` marks, so count it
 * against the rule of four and turn it off on anything small.
 */
export function frill(p: Pen, pts: Pt[], depth: number, lobes: number, v = ACCENT,
  o: { ribs?: boolean } = {}): void {
  const dense = path(pts);
  const sgn = outwardSign(p, dense, Math.max(2, depth * 0.5));
  const outer: Pt[] = dense.map((q, i) => {
    const t = i / Math.max(1, dense.length - 1);
    const n = normalAt(dense, i);
    const d = depth * (0.65 + 0.35 * Math.abs(Math.sin(t * Math.PI * lobes))) * sgn;
    return [q[0] + n[0] * d, q[1] + n[1] * d] as Pt;
  });
  flat(p, () => poly(p, [...dense, ...outer.slice().reverse()], v));
  if (o.ribs === false) return;
  for (let i = 0; i < lobes; i++) {
    const idx = Math.round(((i + 0.5) / lobes) * (dense.length - 1));
    stroke(p, dense[idx]![0], dense[idx]![1], outer[idx]![0], outer[idx]![1], ACCENT_DARK);
  }
}

/* -------------------------------------------------------------- armour */

/**
 * One carapace plate: a FACET -- one flat tone, no gradient -- with a pale lip
 * along its upper edge and a dark gutter under its lower one. Stack them and
 * they overlap.
 *
 * The flatness is what makes it read as hard. **Scales are drawn only where a
 * plate overlaps another plate**, never as an all-over pattern: Seviper's belly
 * scutes, Aggron's five chest plates, Torkoal's seven. Three to eight.
 */
export function plate(p: Pen, pts: Pt[], v = ACCENT, lip = ACCENT_LIT, gutter = ACCENT_DARK): void {
  flat(p, () => poly(p, pts, v));
  // Whichever edges face up get the lip; whichever face down get the gutter.
  const cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
    const upward = (a[1] + b[1]) / 2 < cy;
    if (upward ? lip < 0 : gutter < 0) continue;
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, qx = lerp(a[0], b[0], t), qy = lerp(a[1], b[1], t);
      cellOver(p, qx, qy + (upward ? 1 : -1), upward ? lip : gutter);
    }
  }
}

/**
 * A domed shell: a boss, a ring of flat scutes, and the body disappearing under
 * the near rim.
 *
 * The scutes are FACETS -- alternating tones, hard boundaries, no gradient --
 * because that is how a shell reads as plate rather than as a painted dome.
 * `scutes` should be **five to eight**; Torkoal has seven.
 *
 * The near rim throws a real cast shadow onto the body beneath it instead of
 * the closed `DEEP` ring this used to draw all the way round. If you want the
 * shell to sit *on* something, that shadow is what does it.
 */
export function shell(p: Pen, cx: number, cy: number, rx: number, ry: number, scutes: number, v = ACCENT): void {
  const lit = v === ACCENT ? ACCENT_LIT : v === ACCENT2 ? ACCENT2_LIT : LIGHT;
  const dark = v === ACCENT ? ACCENT_DARK : v === ACCENT2 ? ACCENT2_DARK : FORM;
  cast(p, rx * 2, () => {
    for (let i = 0; i < scutes; i++) {
      const a0 = (i / scutes) * Math.PI * 2 - Math.PI / 2;
      const a1 = ((i + 1) / scutes) * Math.PI * 2 - Math.PI / 2;
      const wedge: Pt[] = [[cx, cy]];
      for (let k = 0; k <= 4; k++) {
        const a = lerp(a0, a1, k / 4);
        wedge.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
      }
      // Each scute is a facet, and its tone is which way that facet FACES.
      // Up-left toward the lamp: lit. Down-right, away: dark. That is a
      // faceted dome, and it is the reason the boundaries need no lines.
      const am = (a0 + a1) / 2;
      const face = -(Math.cos(am) * 0.4 + Math.sin(am) * 0.4) / 0.566;
      flat(p, () => poly(p, wedge, face > 0.6 ? lit : face < -0.2 ? dark : v));
    }
    // The boss: the raised centre, one flat tone, holding the dome together.
    flat(p, () => blob(p, cx - rx * 0.14, cy - ry * 0.12, rx * 0.34, ry * 0.36, v));
  });
}

/* ------------------------------------------------------- wings & fins */

export interface WingOpts {
  tone?: number;
  /** -1 for a wing on the left, +1 on the right. */
  side?: number;
  /** Folded against the body rather than spread. */
  folded?: boolean;
  /** How many primaries. **Four to six**, as a scalloped trailing edge. */
  feathers?: number;
  /** Stamp a ring where the wing meets the shoulder. Off, and leave it off --
   *  use `cast` instead. */
  front?: boolean;
  /** Throw the wing's shadow onto the body behind it. On by default for a NEAR
   *  wing (`tone` is not `SHADE`); this is what puts it in front. */
  cast?: boolean;
}

/**
 * A feathered wing: a covert mass at the shoulder, then a fan of primaries,
 * each a long tapered lozenge.
 *
 * **Feathers are drawn only at the terminals** -- 4-6 primaries as a scalloped
 * trailing edge -- and the rest of the wing is flat. Swellow's wing membrane
 * and Pelipper's body carry no feather detail at all.
 *
 * Folded, it is a swept teardrop with three feather tips showing past the
 * trailing end -- which is what a bird at rest actually looks like and what a
 * "wing" drawn as one lump never does. The overhang has to be about a quarter
 * of the wing's length or the tips are invisible.
 */
export function wingFeathered(p: Pen, x: number, y: number, len: number, o: WingOpts = {}): void {
  const tone = o.tone ?? BASE, side = o.side ?? 1, n = o.feathers ?? 5;
  if (o.cast ?? tone !== SHADE) {
    cast(p, len * 0.5, () => wingFeathered(p, x, y, len, { ...o, cast: false }));
    return;
  }
  if (o.folded) {
    // A swept teardrop lying along the flank, with three primary tips showing
    // past its trailing end. That overhang is the read: a folded wing that
    // stops in a clean curve is a cape.
    const tipX = x + side * len * 0.24, tipY = y + len * 0.58;
    const body: Pt[] = [[x - side * len * 0.26, y - len * 0.2], [x + side * len * 0.3, y + len * 0.06],
      [tipX + side * len * 0.06, tipY], [x - side * len * 0.18, y + len * 0.42]];
    if (o.front) polyFront(p, body, tone, DEEP, 1.5); else flat(p, () => poly(p, body, tone));
    // Primary tips hanging well past the trailing end, alternating tone, each
    // with its own dark edge. If they only just clear the wing body they are
    // invisible; the overhang has to be a quarter of the wing's length.
    for (let i = 2; i >= 0; i--) {
      const sp = i * len * 0.11;
      const rx = lerp(x, tipX, 0.4) - side * sp * 0.7, ry = lerp(y, tipY, 0.45) + sp * 0.15;
      const ex = tipX - side * sp * 0.35, ey = tipY + len * 0.26 + sp * 0.55;
      limbPath(p, [[rx, ry], [lerp(rx, ex, 0.5) + side * len * 0.02, lerp(ry, ey, 0.5)], [ex, ey]],
        len * 0.13, 2.2, i === 1 ? SHADE : tone, { bulge: len * 0.03 });
      stroke(p, rx + side * len * 0.06, ry, ex + side * len * 0.045, ey, DEEP);
    }
    return;
  }

  /* Spread. Four parts, in this order, and the order is the whole trick:
     the secondaries go down as one solid mass, the primaries as a fan of
     overlapping blades on top of it, then the coverts over their roots, then
     the arm bone over that.

     Two things sink this if you get them wrong. First, a feather drawn as a
     thin triangle converging on the wrist comes out as a *stick*, because a
     triangle two cells across at its base is two cells across for most of its
     length -- a feather is a blade, widest in the middle. Second, the fan has
     to be narrow enough that consecutive blades overlap; spread over much more
     than a right angle they separate into a handful of knives and the wing
     stops being a surface. Both of those were the first two versions of this. */
  const wristX = x + side * len * 0.46, wristY = y - len * 0.28;
  const tips: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    // Sweeping from up-and-out round to down-and-back, the way a spread wing
    // actually lies. Angles are absolute; `side` only mirrors the x term.
    const a = lerp(-0.5, 1.0, t);
    const fl = len * lerp(0.95, 0.72, t);
    tips.push([wristX + side * Math.cos(a) * fl, wristY + Math.sin(a) * fl]);
  }
  // Secondaries: the solid inner half of the fan, so the primaries stand on
  // something instead of radiating out of a point.
  poly(p, [[x, y + len * 0.1], [wristX, wristY],
    ...tips.map((t) => [lerp(wristX, t[0], 0.62), lerp(wristY, t[1], 0.62)] as Pt)], tone);
  const hw = Math.max(4, len * 0.19);
  for (let i = n - 1; i >= 0; i--) {
    const tp = tips[i]!;
    limbPath(p, [[wristX, wristY], [lerp(wristX, tp[0], 0.55), lerp(wristY, tp[1], 0.55)], [tp[0], tp[1]]],
      hw * 0.6, 1.8, i % 2 ? SHADE : tone, { bulge: hw * 0.45 });
  }
  // Separation and shafts, after every blade is down -- a gap cut before the
  // next feather covers it is a gap that no longer exists -- and only on the
  // outer half, so the roots of the fan stay one mass.
  for (let i = 0; i < n; i++) {
    const tp = tips[i]!;
    const dx = tp[0] - wristX, dy = tp[1] - wristY, d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    stroke(p, lerp(wristX, tp[0], 0.4) + nx * hw * 0.5, lerp(wristY, tp[1], 0.4) + ny * hw * 0.5,
      tp[0] + nx * 1.4, tp[1] + ny * 1.4, DEEP);
  }
  // Coverts: the rounded mass of small feathers over the shoulder and wrist.
  const coverts: Pt[] = [[x - side * len * 0.2, y - len * 0.06], [x + side * len * 0.06, y - len * 0.28],
    [wristX + side * len * 0.04, wristY - len * 0.02], [wristX - side * len * 0.04, wristY + len * 0.22],
    [x + side * len * 0.02, y + len * 0.2]];
  if (o.front) polyFront(p, coverts, tone, DEEP, 1.5); else poly(p, coverts, tone);
  limbPath(p, [[x, y], [x + side * len * 0.24, y - len * 0.22], [wristX, wristY]], len * 0.2, len * 0.13, tone,
    { dark: FORM });
}

/**
 * A membrane wing: an arm out to a wrist, three or four finger struts fanning
 * from it, and a membrane sagging between them in concave scallops.
 *
 * **The scallops matter more than the fingers.** A membrane stretched on
 * straight chords reads as a kite; the sag is what makes it skin, and it is a
 * silhouette event, so it survives the icon. The membrane itself is a FACET --
 * one flat tone, no gradient, because it is a plane and not a balloon.
 */
export function wingMembrane(p: Pen, x: number, y: number, len: number, o: WingOpts = {}): void {
  const tone = o.tone ?? SHADE, side = o.side ?? 1, n = o.feathers ?? 4;
  if (o.cast ?? tone !== SHADE) {
    cast(p, len * 0.5, () => wingMembrane(p, x, y, len, { ...o, cast: false }));
    return;
  }
  const wristX = x + side * len * 0.44, wristY = y - len * 0.4;
  const tips: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    // Absolute angles again, mirrored only in x. Folding `side` into the
    // trigonometry itself -- which is what the first version did -- makes the
    // fan sweep the wrong way for one of the two wings, and the animal comes
    // out with a wing wrapped across its own chest.
    const a = lerp(-0.55, 1.25, t);
    const fl = len * lerp(1.0, 0.66, t);
    tips.push([wristX + side * Math.cos(a) * fl, wristY + Math.sin(a) * fl]);
  }
  // Membrane: root, finger tips, and a sagging arc between each pair. The sag
  // matters more than the fingers -- a membrane on straight chords is a kite.
  const edge: Pt[] = [[x, y - len * 0.06]];
  for (let i = 0; i < tips.length; i++) {
    edge.push(tips[i]!);
    const nx = tips[i + 1];
    if (nx) {
      const mx = (tips[i]![0] + nx[0]) / 2, my = (tips[i]![1] + nx[1]) / 2;
      edge.push([lerp(mx, wristX, 0.26), lerp(my, wristY, 0.26)]);
    }
  }
  edge.push([lerp(x, wristX, 0.25), lerp(y, wristY, 0.25) + len * 0.2]);
  if (o.front) polyFront(p, edge, tone); else flat(p, () => poly(p, edge, tone));
  for (const t of tips) limbPath(p, [[wristX, wristY], [t[0], t[1]]], 3.6, 1.6, ACCENT_DARK);
  limbPath(p, [[x, y], [lerp(x, wristX, 0.5), lerp(y, wristY, 0.5) - len * 0.06], [wristX, wristY]],
    len * 0.19, len * 0.11, tone === SHADE ? BASE : tone, { dark: FORM });
  blob(p, wristX, wristY, len * 0.1, len * 0.1, tone === SHADE ? BASE : tone);
}

export interface FinOpts {
  tone?: number;
  /** How many ray struts. **Three to six.** */
  rays?: number;
  /** Tone for the ray struts. */
  ray?: number;
  /** Stamp a ring where the fin meets the body. Off, and leave it off. */
  front?: boolean;
}

/**
 * A fin: a FACET of membrane with visible rays converging on a root.
 *
 * `edge` is the free outline of the fin, `root` the point every ray runs back
 * to. A web with no struts in it is a paddle, and the struts are the whole
 * read -- so they are drawn last and never skipped. Three to six of them; the
 * membrane behind them stays one flat tone.
 *
 * **Scallop the free edge.** Give `edge` four or five points that do not lie on
 * a smooth arc and the fin reads as rayed skin instead of as a leaf.
 *
 * (`paddle()` is gone. It was this function plus nine ruled `ACCENT_DARK` rays
 * and a scalloped `ACCENT_LIT` rim -- roughly forty marks for one tail -- and it
 * had zero call sites. Build a fluke out of `fin` with a wide `edge`.)
 */
export function fin(p: Pen, root: Pt, edge: Pt[], o: FinOpts = {}): void {
  const tone = o.tone ?? ACCENT, n = o.rays ?? 4;
  const dense = path(edge);
  const shape: Pt[] = [root, ...dense];
  if (o.front) polyFront(p, shape, tone); else flat(p, () => poly(p, shape, tone));
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const q = dense[Math.round(t * (dense.length - 1))]!;
    // Stop a cell short of the free edge, or the rays eat the membrane.
    const ex = lerp(root[0], q[0], 0.92), ey = lerp(root[1], q[1], 0.92);
    stroke(p, lerp(root[0], q[0], 0.12), lerp(root[1], q[1], 0.12), ex, ey, o.ray ?? ACCENT_DARK);
  }
}

/* -------------------------------------------------------------- tails */

/*
 * TAILS. All four now default to NO ring at the root. A tail leaving a rump is
 * a mass overlapping a mass, and the answer to that is a cast shadow or an open
 * arc, never a closed loop of ink on the haunch.
 *
 * And give the path THREE OR FOUR POINTS. A tail is the one part of a creature
 * that is pure line, so a two-point tail is the most obviously mechanical thing
 * on the sprite.
 */

export interface TailOpts {
  tone?: number;
  thick?: number;
  tip?: number;
  /** Stamp a ring at the root. Off by default now; see the note above. */
  front?: boolean;
  /** Plume only: the tone of the far side of the fur, laid down first. */
  far?: number;
  /** Plume only: the tone that catches the light on the clump tips. Off by
   *  default -- a lit clump tip is a specular event per clump. */
  edgeLit?: number;
  /** Plume only: skip the bright ball on the end. */
  plainTip?: boolean;
}

/** A tapered tail curving along a path, with a `FORM` step along its lower
 *  flank. Give it three or four points. */
export function tailCurl(p: Pen, pts: Pt[], o: TailOpts = {}): void {
  limbPath(p, pts, o.thick ?? 9, o.tip ?? 2.5, o.tone ?? ACCENT,
    { front: o.front ?? false, bulge: 1, dark: FORM });
}

/** A tail with segment rings along it: reptile, insect, mineral.
 *  **Three to eight segments**, and they taper along the run. */
export function tailSegmented(p: Pen, pts: Pt[], segs: number, o: TailOpts = {}): void {
  const th = o.thick ?? 10;
  const dense = path(pts);
  limbPath(p, dense, th, o.tip ?? 3, o.tone ?? BASE, { front: o.front ?? false });
  rings(p, dense, clamp(segs, 3, 8), th * 0.55, ACCENT_DARK);
}

/**
 * A big fur plume: a curving core with a jagged fur mass on both sides.
 * The signature of anything meant to look fast, hot or vain.
 *
 * This is a `mane` call and it counts as the creature's ONE fur event. A
 * species with a plume tail does not also get a neck ruff.
 */
export function tailPlume(p: Pen, pts: Pt[], depth: number, clumps: number, o: TailOpts = {}): void {
  const dense = path(pts);
  const tone = o.tone ?? ACCENT;
  const far = o.far ?? (tone === ACCENT ? ACCENT_DARK : SHADE);
  const lit = o.edgeLit ?? -1;
  // The far side goes down first and darker so the plume has two faces. The
  // sides are forced, not detected: a plume hangs in open space and there is no
  // "inside" for the mask to vote on.
  mane(p, offsetPath(dense, -1.5), depth * 0.78, clumps, far, { root: -1, side: -1 });
  limbPath(p, dense, o.thick ?? 10, o.tip ?? 4, tone, { front: o.front ?? false });
  mane(p, dense, depth, clumps, tone, { lit, side: 1 });
  if (o.plainTip) return;
  const tip = dense[dense.length - 1]!;
  blob(p, tip[0], tip[1], depth * 0.5, depth * 0.5, lit >= 0 ? lit : ACCENT_LIT);
  blob(p, tip[0] + 1, tip[1] + 1, depth * 0.34, depth * 0.34, tone);
}

/** A tail ending in a rayed fin. */
export function tailFinned(p: Pen, pts: Pt[], finLen: number, o: TailOpts = {}): void {
  const dense = path(pts);
  limbPath(p, dense, o.thick ?? 9, o.tip ?? 3, o.tone ?? BASE, { front: o.front ?? false });
  const tip = dense[dense.length - 1]!, prev = dense[Math.max(0, dense.length - 6)]!;
  const dx = tip[0] - prev[0], dy = tip[1] - prev[1], d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  fin(p, [tip[0], tip[1]], [
    [tip[0] + ux * finLen * 0.4 + nx * finLen, tip[1] + uy * finLen * 0.4 + ny * finLen],
    [tip[0] + ux * finLen * 1.05, tip[1] + uy * finLen * 1.05],
    [tip[0] + ux * finLen * 0.4 - nx * finLen, tip[1] + uy * finLen * 0.4 - ny * finLen],
  ], { rays: 4 });
}

/* --------------------------------------------------------------- eyes */

/*
 * The eye itself now lives in `eyes.ts`, as a library of hand-authored pixel
 * stamps rather than as ellipse maths. Read the note at the top of that file
 * before you change anything here; the short version is that a circle equation
 * evaluated at a radius of three cells does not produce a circle, it produces
 * a different irregular octagon for every sub-cell offset, which is why the
 * old eyes were lumpy, why the pupil sat off centre, and why the two eyes of
 * one pair never matched each other.
 *
 * What this section adds on top is placement: the pair, on one shared row, at
 * a deliberate spacing, with the far eye a smaller *authored* stamp rather
 * than a scaled one.
 */

export type { EyeStyle, EyeSize, EyeOpts, EyeStamp };
export { blitEyeStamp, checkEyeStamps, eyeStampCells, eyeStampOf, eyeWidth };

/**
 * The largest eye any design may ask for.
 *
 * PICKED FROM MEASUREMENT, NOT FROM TASTE. A reference battle sprite is 64x64
 * and shows at 64 screen pixels; ours is 128x128 at the same screen size, so
 * our design grid is exactly twice as fine and any feature must be twice the
 * linear size -- four times the area -- before it looks one pixel bigger. One
 * whole eye on a fully-evolved reference starter, ink and all, measures about
 * 12 to 20 pixels: Sceptile's is a yellow almond, a black slit and a single
 * white cell. Four times that is 48 to 80 cells here, and a genuinely
 * big-eyed creature might justify 80.
 *
 * `MAX_EYE_R` survives as the ceiling on the radius the legacy `eye()` will
 * accept. New code picks an `EyeSize` instead and cannot exceed the cap at
 * all, because `'l'` is the largest thing in the library.
 */
export const MAX_EYE_R = 3.6;
/** Below this an eye stops being a shape and becomes a smudge. */
export const MIN_EYE_R = 1.6;

/**
 * The authored size nearest an old radius.
 *
 * The forty-eight designs written against the procedural eye all speak in
 * radii, so this is the bridge. The bands are chosen so each one lands on the
 * stamp that is the same number of cells across as the old call was: `r = 2.0`
 * drew five cells wide and gets `xs`, `r = 3.0` drew nine and gets `m`.
 */
export function eyeSizeFor(r: number): EyeSize {
  const v = clamp(r, MIN_EYE_R, MAX_EYE_R);
  if (v < 2.15) return 'xs';
  if (v < 2.75) return 's';
  if (v < 3.45) return 'm';
  return 'l';
}

/**
 * One eye, placed by its centre cell.
 *
 * `x` and `y` are the centre of the stamp and are rounded to whole cells --
 * there is no such thing as half a pixel in an eye, and pretending otherwise
 * is what made the old ones crooked.
 *
 * Prefer `eyeRow` for a normal face. Use this directly only for a creature
 * whose eyes genuinely are not a pair: one eye, three eyes, a cluster, a head
 * turned so far that the far eye is round the side of the skull.
 */
export function eyeStamp(p: Pen, x: number, y: number, style: EyeStyle = 'round', size: EyeSize = 'm', o: EyeOpts = {}): void {
  blitEyeStamp(p.m, eyeStampOf(style, size), x, y, o);
}

/**
 * A pair of eyes, on ONE row, at a deliberate spacing.
 *
 * THIS IS THE CALL YOU WANT. The player's complaint about our faces was two
 * things, and this is the second of them: the eyes were crooked. They were
 * crooked because forty-eight designs each placed two eyes with two separate
 * calls at two hand-typed y values, and a one-cell difference between them is
 * plainly visible on a head thirty cells wide. So the natural way to draw a
 * face now puts both eyes on the same integer row by construction, and you
 * have to ask, in writing, for anything else.
 *
 * Both eyes are the same authored stamp, so they are the same shape, cell for
 * cell. The right one is mirrored -- exactly, by reversing each row about the
 * centre column -- which is what makes an `angry` pair converge into a scowl
 * rather than both eyes leaning the same way, and what puts the two glints
 * symmetrically about the muzzle.
 *
 *   cx      the centre line of the face, in mask cells.
 *   y       the shared baseline. Both eye centres land here.
 *   spread  half the distance between the two eye centres. On a head thirty
 *           cells wide, 6 to 9 is the usual range; less and the eyes crowd the
 *           bridge of the nose, more and the creature looks like a hammerhead.
 *
 * Registers the face anchor for you, so a design that calls this does not also
 * need to call `p.face`.
 */
export function eyeRow(p: Pen, cx: number, y: number, spread: number, style: EyeStyle = 'round', size: EyeSize = 'm', o: EyeRowOpts = {}): void {
  if (p.back) return;
  const x = Math.round(cx), row = Math.round(y), sp = Math.round(spread);
  // No `far`, no far eye: an untilted head has two eyes of one size, and a
  // `farSide` on its own must not silently shrink one of them.
  const farSide = o.far === undefined ? 0 : (o.farSide ?? 1);
  const farSize = o.far ?? size;
  const tilt = Math.round(o.tilt ?? 0);

  const leftSize = farSide < 0 ? farSize : size;
  const rightSize = farSide > 0 ? farSize : size;
  // A turned head reads better if the far eye also sits a little closer to the
  // centre line, because the skull is foreshortened on that side. One cell,
  // and only when the sizes actually differ -- this is the single concession
  // to perspective in the whole function, and it is still an integer.
  const pull = leftSize === rightSize ? 0 : 1;

  eyeStamp(p, x - sp + (farSide < 0 ? pull : 0), row, style, leftSize, { ...o, mirror: false });
  eyeStamp(p, x + sp - (farSide > 0 ? pull : 0), row + tilt, style, rightSize, { ...o, mirror: true });
  p.face(x, row, sp + Math.round(eyeWidth(style, size) / 2) + 2);
}

export interface EyeRowOpts extends EyeOpts {
  /**
   * A smaller AUTHORED stamp for the far eye of a turned or three-quarter
   * head. Not a scaled one -- scaling a nine-cell picture is exactly the
   * rasterisation problem this library exists to remove.
   *
   * One step down is nearly always right: `size: 'm', far: 's'`. Two steps
   * reads as a creature looking hard over its own shoulder.
   */
  far?: EyeSize;
  /** Which eye is the far one: -1 for the left, +1 for the right. Only has
   *  any effect if `far` is set. Default +1. */
  farSide?: -1 | 1;
  /**
   * Rows to drop the right-hand eye by. Zero, and it should stay zero.
   *
   * It exists so that a creature with a genuinely lopsided face -- a scar, a
   * cocked head, one eye swollen shut -- can say so deliberately. If you find
   * yourself reaching for `tilt: 1` to make a face "look more natural", you
   * are about to reintroduce the exact defect the player complained about.
   */
  tilt?: number;
}

/**
 * One eye, by radius. The old entry point, kept working.
 *
 * Every one of the forty-eight designs written before the stamps calls this,
 * so it still does the right thing: the radius picks the nearest authored
 * size, `side: 1` mirrors the stamp, and everything else -- `iris`, `sclera`,
 * `lid`, `bare` -- means what it always meant.
 *
 * New designs should call `eyeRow`, which is the whole point: it will not let
 * you put the two halves of a face on different rows by accident.
 */
export function eye(p: Pen, x: number, y: number, r0: number, style: EyeStyle = 'round', o: EyeOpts = {}): void {
  eyeStamp(p, x, y, style, eyeSizeFor(r0), o);
}

/**
 * A converging pair, by radius. The old entry point, kept working.
 *
 * Identical to `eyeRow` apart from taking a radius instead of a size, and it
 * is now just as safe: one shared row, one shared stamp, mirrored.
 */
export function eyePair(p: Pen, cx: number, cy: number, spread: number, r: number, style: EyeStyle = 'round', o: EyeOpts = {}): void {
  eyeRow(p, cx, cy, spread, style, eyeSizeFor(r), o);
}

/**
 * A HEAVY BONE BROW: the ridge throwing its shadow down onto the eye socket.
 *
 * **The brow carries about 35 % of a face's expression** -- more than the tilt,
 * far more than the eye size. Poochyena's eye is four pixels of nothing and the
 * creature is unmistakably hostile; take the brow away and it is a spaniel. Our
 * two best faces, `volcatrix` and `craglide`, both work because they have a
 * brow and a slant.
 *
 * It is drawn as a `FORM` shadow -- a value step on the same surface, never a
 * line and never a stripe of accent. Call it BEFORE the eyes: the eye stamps
 * are blitted after the light runs and will sit on top of it.
 *
 * `len` is 8-11 cells, `slant` how far the outer end rises (0.25-0.45 is the
 * useful band; `side` is which way the face is turned, -1 for viewer-left).
 * Deeper over the inner corner, thinning to nothing over the outer one -- a
 * brow of constant depth is a painted stripe, which is what this used to be.
 *
 * `ridge` also bites the bulge into the head's top contour, so the brow is a
 * silhouette event as well as a tonal one. Use it on a predator.
 *
 * NOT FOR: a soft or a young species -- a brow is the single loudest "mean"
 * signal available, and on a round baby creature it reads as a scowl.
 */
export function brow(p: Pen, x: number, y: number, len: number, side: number, slant = 0.35,
  o: { ridge?: boolean; tone?: number } = {}): void {
  const v = o.tone ?? FORM;
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    const h = Math.max(1, Math.round(len * 0.26 * (1 - t * 0.7)));
    const bx = x - side * len * 0.5 + side * i;
    const by = y - t * len * slant;
    for (let k = 0; k < h; k++) cellOver(p, bx, by + k, v);
  }
  if (o.ridge) {
    // The bone above the shadow: a shallow bulge in the head's top contour.
    poly(p, [
      [x - side * len * 0.55, y - 1],
      [x + side * len * 0.5, y - len * slant - 1],
      [x + side * len * 0.5, y - len * slant - 3],
      [x - side * len * 0.55, y - 3],
    ], BASE);
  }
}

/* ----------------------------------------------------------- contours */

/**
 * The upper contour of whatever is currently drawn, between two columns, as a
 * path. Hang a spine row, a mane or a row of leaves off it and the ornament
 * follows the animal instead of a straight line ruled across it.
 *
 * ```ts
 * mane(p, contourTop(p, cx - 34, cx - 6), 9, 5, BASE);   // a ruff on the neck
 * ```
 */
export function contourTop(p: Pen, x0: number, x1: number, step = 3): Pt[] {
  const out: Pt[] = [];
  for (let x = Math.round(x0); x <= Math.round(x1); x += step) {
    const y = p.m.top(x);
    if (y >= 0) out.push([x, y]);
  }
  return out;
}

/** The lower contour, for a belly line, a trailing fringe or a row of gills. */
export function contourBottom(p: Pen, x0: number, x1: number, step = 3): Pt[] {
  const out: Pt[] = [];
  for (let x = Math.round(x0); x <= Math.round(x1); x += step) {
    const y = p.m.bottom(x);
    if (y >= 0) out.push([x, y]);
  }
  return out;
}

/** Mirror the left half of the mask onto the right, for a front-on symmetric
 *  creature. Draw the left side only, then call this last. */
export function mirrorInto(p: Pen, axis: number): void { p.m.mirror(axis); }
