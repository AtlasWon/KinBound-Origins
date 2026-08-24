/**
 * Kin sprites.
 *
 * Creature art is generated from a body plan plus the species palette. Each
 * species declares a plan (quadruped, bird, arachnid, ...) and a scale; the
 * generator builds a mask of palette indices from primitives, decorates it with
 * appendages, markings and type character, runs a banded directional shading
 * pass over it, then wraps the whole silhouette in a hard outline.
 *
 * This is not a substitute for a hand-drawn set, but it obeys the same rules a
 * hand-drawn set would -- a fixed cell, a small ramp, no anti-aliasing, light
 * from the upper left -- so 200 creatures can exist, be readable and be
 * distinguishable long before an artist touches them. Every sprite is
 * deterministic: the same species id always produces the same animal.
 *
 * RESOLUTION. The cell is 128x128 and one design cell is one buffer pixel, so
 * a creature is 128 buffer pixels tall in a 480x320 buffer -- the same 64
 * logical pixels it has always occupied, at twice the detail. The world around
 * it is still drawn one design pixel to a 2x2 block, and that difference is
 * deliberate: it is the whole reason a reference-quality creature can carry
 * separate toes, teeth and scale texture while a tile cannot.
 */

import { Rng } from '../core/rng.js';
import { registry } from '../data/registry.js';
import type { SpeciesData } from '../data/schema.js';
import {
  ACCENT, ACCENT2, ACCENT2_DARK, ACCENT2_LIT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, DESIGN,
  EDGE, EMPTY, EYE_DARK, EYE_WHITE, FORM, HILIGHT, INNER, LIGHT, Mask, OUTLINE, OUTLINE_LIT,
  SHADE, SHADOW, SHADOW_CORE, SPEC, TONE_COUNT, U, WORK,
} from './kin/mask.js';
import { DESIGNS } from './kin/index.js';
import { kinArtSprite } from './kinart.js';
import type { Pen as DesignPen } from './kin/parts.js';
import type { EyeSize, EyeStyle } from './kin/eyes.js';
import { blitEyeStamp, eyeStampOf } from './kin/eyes.js';

/** The canvas a sprite is handed out on. Derived, so the two can never drift:
 *  the mask is the sprite now that nothing scales it on the way out. */
export const SPRITE_SIZE = DESIGN;
export const ICON_SIZE = DESIGN / 2;

export type BodyPlan =
  | 'quadruped' | 'biped' | 'brute' | 'critter' | 'bird' | 'grub'
  | 'arachnid' | 'mineral' | 'monolith' | 'orb' | 'fish' | 'moth'
  | 'aquatic' | 'serpentine';

/**
 * A pen that draws in plan units onto a finer mask.
 *
 * Every number in the body plans and the decoration passes -- a haunch radius,
 * the lean on a crest, the gap between two rivets -- is a proportion that took
 * a lot of looking to settle, and there are several hundred of them. Doubling
 * the design grid must not mean retyping all of them and hoping the animals
 * come out the same shape. So they keep their units and the pen rasterises at
 * `u` cells to the unit: the silhouette is identical, every curve and taper
 * resolves twice as finely, and -- the part that is actually new -- fractional
 * coordinates reach inside a unit. `cell` paints a single mask cell, which is
 * where claws, teeth, bevels, quills and eyelids live.
 */
class Pen {
  constructor(readonly m: Mask, readonly u: number) {}

  get w(): number { return Math.floor(this.m.w / this.u); }
  get h(): number { return Math.floor(this.m.h / this.u); }

  /** A length measured in mask cells, expressed in pen units. */
  units(v: number): number { return v / this.u; }

  /** Unit coordinate to the top-left mask cell of that unit. */
  private c(v: number): number { return Math.round(v * this.u); }
  /** Unit coordinate to the centre of that unit, for the round primitives. */
  private p(v: number): number { return v * this.u + (this.u - 1) / 2; }

  get(x: number, y: number): number { return this.m.get(this.c(x), this.c(y)); }
  filled(x: number, y: number): boolean { return this.m.filled(this.c(x), this.c(y)); }

  /** Exactly one mask cell. Half-unit coordinates are the point of it. */
  cell(x: number, y: number, v: number): void { this.m.set(this.c(x), this.c(y), v); }
  /** One cell, but only onto existing body -- the fine-grained `over`. */
  cellOver(x: number, y: number, v: number): void { this.m.over(this.c(x), this.c(y), v); }

  /**
   * A continuous run one cell wide, between two points in unit space.
   *
   * The trap this exists to close: a loop that steps a whole unit and plots
   * one cell each time leaves every other cell untouched, because a unit is
   * two cells. Mouth lines, plate bevels, gill lips and fin rays all came out
   * looking like zips the first time they were drawn that way. Stepping in
   * cells and letting the coordinates be fractional is the fix.
   */
  line(x0: number, y0: number, x1: number, y1: number, v: number, onlyBody = true): void {
    const steps = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * this.u));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (onlyBody) this.cellOver(x, y, v); else this.cell(x, y, v);
    }
  }

  set(x: number, y: number, v: number): void { this.block(x, y, v, 0); }
  under(x: number, y: number, v: number): void { this.block(x, y, v, 1); }
  over(x: number, y: number, v: number): void { this.block(x, y, v, 2); }

  private block(x: number, y: number, v: number, mode: 0 | 1 | 2): void {
    const bx = this.c(x), by = this.c(y);
    for (let dy = 0; dy < this.u; dy++) {
      for (let dx = 0; dx < this.u; dx++) {
        if (mode === 0) this.m.set(bx + dx, by + dy, v);
        else if (mode === 1) this.m.under(bx + dx, by + dy, v);
        else this.m.over(bx + dx, by + dy, v);
      }
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, v: number, beneath = false): void {
    this.m.ellipse(this.p(cx), this.p(cy), this.p(rx), this.p(ry), v, beneath);
  }

  box(x0: number, y0: number, x1: number, y1: number, v: number, beneath = false): void {
    const lo = (a: number, b: number) => this.c(Math.min(a, b));
    const hi = (a: number, b: number) => this.c(Math.max(a, b)) + this.u - 1;
    this.m.box(lo(x0, x1), lo(y0, y1), hi(x0, x1), hi(y0, y1), v, beneath);
  }

  limb(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, v: number, beneath = false): void {
    this.m.limb(this.p(x0), this.p(y0), this.p(x1), this.p(y1), w0 * this.u, w1 * this.u, v, beneath);
  }

  ellipseFront(cx: number, cy: number, rx: number, ry: number, v: number, seam = DEEP): void {
    this.m.ellipseFront(this.p(cx), this.p(cy), this.p(rx), this.p(ry), v, seam, this.u);
  }

  limbFront(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, v: number, seam = DEEP): void {
    this.m.limbFront(this.p(x0), this.p(y0), this.p(x1), this.p(y1), w0 * this.u, w1 * this.u, v, seam, this.u);
  }

  top(x: number): number {
    const y = this.m.top(this.c(x));
    return y < 0 ? -1 : Math.floor(y / this.u);
  }

  bottom(x: number): number {
    const y = this.m.bottom(this.c(x));
    return y < 0 ? -1 : Math.floor(y / this.u);
  }

  bounds(): { x0: number; y0: number; x1: number; y1: number } | null {
    const b = this.m.bounds();
    if (!b) return null;
    return {
      x0: Math.floor(b.x0 / this.u), y0: Math.floor(b.y0 / this.u),
      x1: Math.floor(b.x1 / this.u), y1: Math.floor(b.y1 / this.u),
    };
  }
}

/* ------------------------------------------------------- anatomy pieces */

/**
 * A planted foot.
 *
 * On the old grid this was a pad with two seams cut in it and three bright
 * cells for claws, because three cells was all there was room for. The finer
 * grid buys the thing a foot actually needs: separate toes with a gap between
 * them, a knuckle highlight on each, and a claw that is a *shape* -- a dark
 * root, a lit body and a point -- rather than a lit dot. Toes are what stop a
 * leg ending in a bar, and a bar is the loudest tell there is.
 */
function foot(p: Pen, x: number, y: number, half: number, dark: boolean): void {
  const hw = Math.max(2, half);
  const body = dark ? SHADE : BASE;
  p.box(x - hw, y - 2, x + hw, y, body);
  // The heel rolls under: a dark run along the very bottom so the pad has a
  // near edge rather than being sliced off flat by the ground line.
  p.line(x - hw, y + 0.5, x + hw, y + 0.5, DEEP);

  const toes = hw >= 5 ? 4 : 3;
  const pitch = (hw * 2) / (toes - 1);
  for (let i = 0; i < toes; i++) {
    const tx = x - hw + i * pitch;
    // The gap between two toes is half a unit of dark. Cutting it a whole unit
    // wide -- the only option before -- ate the toes it was meant to separate.
    if (i > 0) p.line(tx - pitch / 2, y - 1.5, tx - pitch / 2, y + 0.5, DEEP);
    // Knuckle: one lit cell on the upper left of each toe, which is what makes
    // the digits read as rounded rather than as slots cut in a slab.
    p.cellOver(tx - 0.25, y - 1.5, dark ? BASE : LIGHT);
    // Claws stay in the bright accent on purpose: the shading pass never
    // touches that tone, so a claw survives the ground occlusion under it.
    p.cell(tx, y + 0.5, ACCENT_DARK);
    p.cell(tx, y, ACCENT_LIT);
    p.cell(tx - 0.5, y + 0.5, ACCENT);
  }
}

/**
 * A muzzle pushed forward of the skull.
 *
 * A head that is one flat ellipse reads as a ball with eyes stuck on it
 * however carefully it is lit, so this carries a bridge, a nostril, a parted
 * mouth and -- new, and only possible now there are cells to spare -- a tongue
 * behind the lip and a pair of teeth at the corners. Teeth are two cells each
 * and they change the animal completely.
 */
function muzzle(p: Pen, x: number, y: number, rx: number, ry: number, dir: number, detail: boolean): void {
  const rxx = Math.max(2, rx);
  const ryy = Math.max(1, ry);
  p.ellipseFront(x, y, rxx, ryy, LIGHT);
  if (!detail) return;

  // Bridge: a lit plane along the top of the snout, one cell proud of the
  // shading, so the muzzle has a top face and not just a lit half.
  p.line(x - rxx, y - ryy * 0.6, x + rxx * 0.4, y - ryy * 0.6, HILIGHT);

  // Nostril: a cavity with a lit lip under it, which is the difference between
  // a nostril and a dirty mark.
  const nx = x + dir * rxx * 0.45;
  p.cellOver(nx, y - ryy * 0.35, INNER);
  p.cellOver(nx - 0.5, y - ryy * 0.35, INNER);
  p.cellOver(nx, y - ryy * 0.35 + 0.5, LIGHT);

  const half = Math.max(2, Math.round(rxx * 0.85));
  const lipY = y + Math.max(1, Math.round(ryy * 0.5));
  // The mouth turns down at both corners, so it is drawn as three runs rather
  // than one: a flat middle and a dropped corner each side.
  p.line(x - half + 1.5, lipY, x + half - 1.5, lipY, INNER);
  p.line(x - half, lipY + 0.5, x - half + 1.5, lipY, INNER);
  p.line(x + half - 1.5, lipY, x + half, lipY + 0.5, INNER);
  // Tongue behind the lip, only where the mouth is deep enough to show one.
  if (half >= 4) p.line(x - half + 2, lipY + 0.5, x + half - 2, lipY + 0.5, ACCENT_DARK);
  else p.line(x - half + 1, lipY + 0.5, x + half - 1, lipY + 0.5, INNER);
  // Two teeth at the corners of the jaw, hanging below the lip line.
  if (half >= 3) {
    for (const side of [-1, 1]) {
      const tx = x + side * (half - 1);
      p.cellOver(tx, lipY + 1, ACCENT_LIT);
      p.cellOver(tx, lipY + 1.5, ACCENT_LIT);
    }
  }
}

/**
 * A crease across a limb, so a leg reads as bending rather than bowing. The
 * fine grid lets the crease be a cell of dark under a cell of light instead of
 * two whole units of each, which is the difference between a joint and a belt.
 */
function joint(p: Pen, x: number, y: number, half: number): void {
  const hh = Math.max(1, half);
  for (const side of [-1, 1]) {
    // The crease arcs up towards the outside of the limb, so it reads as
    // wrapping round a cylinder rather than as a bar laid across one.
    const ey = y - hh * 0.4;
    p.line(x, y, x + side * hh, ey, DEEP);
    p.line(x, y + 0.5, x + side * hh, ey + 0.5, SHADE);
    p.line(x, y - 0.5, x + side * hh, ey - 0.5, LIGHT);
  }
}

/**
 * Creases at intervals along a path, drawn perpendicular to it. Tails, grub
 * abdomens and serpent bodies all read as one extruded tube without them.
 */
function segments(p: Pen, x0: number, y0: number, x1: number, y1: number, count: number, half: number, v: number): void {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len, ny = dx / len;
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const px = x0 + dx * t, py = y0 + dy * t;
    const hh = Math.max(1, Math.round(half * (1 - t * 0.45)));
    p.line(px - nx * hh, py - ny * hh, px + nx * hh, py + ny * hh, v);
    // A ring is an overlap, not a scratch: the segment in front of the gap
    // catches a lit edge along its whole length. Half a unit of light is all
    // it takes and there was never anywhere to put it before.
    const lx = -0.5 * dx / len, ly = -0.5 * dy / len;
    p.line(px - nx * hh + lx, py - ny * hh + ly, px + nx * hh + lx, py + ny * hh + ly, LIGHT);
  }
}

/**
 * Rays across a fin or a wing membrane, fanning from a root. A web with no
 * struts in it is a paddle; the struts are the whole read.
 */
function rays(p: Pen, rootX: number, rootY: number, tipX: number, tipY: number, spanX: number, spanY: number, count: number, v: number): void {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const ex = Math.round(tipX + (t - 0.5) * spanX);
    const ey = Math.round(tipY + (t - 0.5) * spanY);
    // Stepped in cells, not units: a strut plotted one cell at a time along a
    // path that advances a whole unit each step comes out as a dotted line.
    const steps = Math.max(Math.abs(ex - rootX), Math.abs(ey - rootY), 1) * 2;
    for (let k = 2; k <= steps; k++) {
      const q = k / steps;
      const px = rootX + (ex - rootX) * q;
      const py = rootY + (ey - rootY) * q;
      const gx = Math.round(px), gy = Math.round(py);
      // Interior only. A ray laid along a fin that is three cells wide eats the
      // whole fin and the creature comes out drawn in twigs.
      if (!p.filled(gx - 1, gy) || !p.filled(gx + 1, gy)) continue;
      if (!p.filled(gx, gy - 1) || !p.filled(gx, gy + 1)) continue;
      // Half a unit of strut with half a unit of lit membrane beside it. On
      // the old grid a ray was a whole unit and a membrane with four rays in it
      // was mostly rays; now the webbing survives and the struts still read.
      p.cellOver(px, py, v);
      p.cellOver(px - 0.5, py, LIGHT);
    }
  }
}

/* ------------------------------------------------------------- shading */

/** 4x4 ordered dither, used to fray an edge into the background. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const ditherOn = (x: number, y: number, level: number): boolean =>
  BAYER[y & 3]![x & 3]! < level * 16;

/**
 * THE LADDER. Every body tone in one order, brightest first.
 *
 * The shading pass no longer has a ramp per material with its own private
 * arrangement of tones. It has one ladder and each material sits on a rung of
 * it, so "one step darker" means the same thing on a belly, on a flank and
 * inside a cast shadow, and a cast shadow crossing from one material onto
 * another stays the same shadow.
 */
const LADDER = [SPEC, HILIGHT, LIGHT, BASE, FORM, DEEP];
const RUNG_LIGHT = 2, RUNG_BASE = 3, RUNG_FORM = 4;

/**
 * How far each material moves off its home rung at each of the four light
 * levels: full light, the body's own colour, turned away, and occluded.
 *
 * **THREE TONES PER MATERIAL, not six per creature.** This is the structural
 * fact and it is not an impression: a reference sprite gets fifteen colours and
 * spends them on MATERIALS -- three of blue skin, three of orange fin, two of
 * cream belly -- while we were spending ours on ramp steps, six of one body
 * colour plus three of one accent. One thing, nine steps. That is why a
 * reference sprite reads as an animal with skin and fins and a belly and ours
 * read as one inflated object.
 *
 * SPEC and HILIGHT are therefore gone from every body surface. They survive as
 * hand-placed tones -- a HILIGHT on a pale material, one SPEC catchlight of
 * eight to sixteen cells on a wet or icy or metal species -- and nothing
 * generates them any more.
 *
 * FORM is the flattest of the four on purpose. A cast shadow is a hard-edged
 * region of one value; if the pass put a gradient through it, it would stop
 * reading as a shadow and start reading as a marking.
 */
const OFF_BASE = [-1, 0, 1, 2];
const OFF_LIGHT = [-1, 0, 1, 1];
const OFF_FORM = [-1, 0, 0, 1];
/** Off the ladder: a far part is its own colour and never borrows the body's. */
const RAMP_SHADE = [SHADE, SHADE, SHADE, DEEP];
const RAMP_ACCENT = [ACCENT_LIT, ACCENT, ACCENT, ACCENT_DARK];
const RAMP_ACCENT2 = [ACCENT2_LIT, ACCENT2, ACCENT2, ACCENT2_DARK];

/**
 * THE LAMP.
 *
 * One light for the whole creature: up-left AND well in front of it, over the
 * viewer's shoulder. **L = (-0.40, -0.40, +0.82).**
 *
 * The old lamp was `L = (-0.707, -0.707, 0)` -- beside the creature, at its
 * height, with no component toward the viewer at all. Under that lamp the
 * physically brightest point on any convex mass *is* its up-left silhouette
 * edge, and that is exactly what we rendered: the outermost lit cell of every
 * mass on the roster came out between HILIGHT and SPEC, and the rim pass then
 * promoted it the rest of the way. Every mass wore a cream halo over a diagonal
 * wash. That is not volume; it is colouring-in.
 *
 * With a z component the lit contour is no longer the bright point. At the
 * contour the surface is edge-on to the viewer and n.L is only 0.57 -- mid
 * tone. The brightest band falls on the **shoulder** of the mass, the part
 * facing both up-left and toward the viewer, about a fifth of the way in, and
 * the terminator falls at about 91% across. So a mass is mostly its own colour,
 * with a bounded light patch inset from the edge and a narrow band of real
 * shadow on the far side -- which is what a reference sprite looks like.
 */
const LAMP_XY = 0.566;
const LAMP_Z = 0.824;

/**
 * Lambert term across a mass, as a function of fractional position across it.
 *
 * `t` runs 0 at the lit contour to 1 at the dark contour. The cross-section is
 * taken as a circle, so at fraction `t` the surface normal is
 * `(u, sqrt(1 - u^2))` in the (across, toward-viewer) frame with `u = 2t - 1`.
 * Everything the pass does about *where* the light lands comes out of this one
 * line, which is the point of writing it down rather than hand-tuning band
 * edges: 0.57 at the lit rim, peak 1.0 at t = 0.22, zero at t = 0.91.
 */
const lambert = (t: number): number => {
  const u = 2 * t - 1;
  return -LAMP_XY * u + LAMP_Z * Math.sqrt(Math.max(0, 1 - u * u));
};

/** Light level from the Lambert term: 0 lit, 1 body colour, 2 turned away, 3 occluded. */
const levelOf = (lam: number): number => (lam >= 0.93 ? 0 : lam >= 0.16 ? 1 : lam >= -0.30 ? 2 : 3);

/**
 * Banded form shading under one lamp.
 *
 * Two things changed here and they are the whole of the "colouring-in" fix.
 *
 * **The bands run parallel to each mass's own axis.** They used to run on a
 * fixed 45 degree SCREEN diagonal: every mass on every creature was airbrushed
 * on the same angle regardless of which way it pointed, which is why the
 * measured tone-field gradient came out at 45-60 degrees on all forty-eight
 * species. A cylinder does not do that. Every tone band on a cylinder is a
 * stripe PARALLEL TO ITS AXIS and does not change along the length: a vertical
 * leg gets vertical stripes, a horizontal barrel gets horizontal stripes. So
 * the pass measures the mass locally, three chords through the cell -- across,
 * down, and along the diagonal -- takes the THINNEST as the direction the light
 * wraps, and bands across that. On a sphere the three are equal and the tie
 * goes to the diagonal, which is what a sphere wants.
 *
 * **Band widths are in cells; what scales with the mass is the tone COUNT.**
 * `t` is a fraction of the local chord, so a six-cell ear and a ninety-cell
 * torso used to get identically proportioned bands -- which is how an ear ended
 * up carrying a one-cell specular stripe, half a reference pixel, that the icon
 * downsample then flipped a coin over. Now a mass under fourteen cells thick
 * gets two tones and no highlight at all, a mass under sixty gets three, and
 * only a mass over sixty is allowed the fourth; and the light and shadow bands
 * are capped in cells so a big torso gets a bounded light patch rather than a
 * proportional one.
 *
 * Layered on top of the falloff:
 *
 *  - a **crevice** term from local coverage, so an armpit, the seam where a
 *    limb enters the torso, and any two masses that overlap all darken where
 *    they meet;
 *  - **directional occlusion**: a cell that finds an occlusion seam between it
 *    and the lamp is in that seam's shadow, which is the automatic half of cast
 *    shadow;
 *  - **ground contact**, because the last thing a sprite needs is to be equally
 *    bright where it touches the floor.
 *
 * There is no dithering anywhere in here any more. Gen 1 and 2 dithered; Gen 3
 * is the generation that stopped, and a 2.5-cell feathered seam is 1.25
 * reference pixels -- a checkerboard of half-pixels that becomes a coin flip
 * under the icon's 2x2 vote. Every boundary this pass draws is hard.
 */
function shade(mask: Mask): void {
  const W = mask.w, H = mask.h;
  const src = mask.data.slice();

  const at = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= W || y >= H) return EMPTY;
    return src[y * W + x]!;
  };
  const solid = (x: number, y: number): boolean => {
    const v = at(x, y);
    return v !== EMPTY && v !== OUTLINE && v !== SHADOW;
  };
  /** How many cells the mass continues in a direction, capped. */
  const ray = (x: number, y: number, dx: number, dy: number, max: number): number => {
    let d = 0;
    while (d < max && solid(x + dx * (d + 1), y + dy * (d + 1))) d++;
    return d;
  };

  // Coverage table, so the crevice term costs four lookups per cell rather
  // than a neighbourhood scan. This is the one place a bigger radius would
  // have cost quadratically, and the summed area is why it does not.
  const stride = W + 1;
  const sum = new Int32Array(stride * (H + 1));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      sum[(y + 1) * stride + x + 1] = (solid(x, y) ? 1 : 0)
        + sum[y * stride + x + 1]! + sum[(y + 1) * stride + x]! - sum[y * stride + x]!;
    }
  }
  const AO_R = 10;
  const AO_AREA = (AO_R * 2 + 1) * (AO_R * 2 + 1);
  const coverage = (cx: number, cy: number): number => {
    const x0 = Math.max(0, cx - AO_R), y0 = Math.max(0, cy - AO_R);
    const x1 = Math.min(W - 1, cx + AO_R), y1 = Math.min(H - 1, cy + AO_R);
    if (x1 < x0 || y1 < y0) return 0;
    const s = sum[(y1 + 1) * stride + x1 + 1]! - sum[y0 * stride + x1 + 1]!
      - sum[(y1 + 1) * stride + x0]! + sum[y0 * stride + x0]!;
    return s / AO_AREA;
  };

  let floor = 0;
  for (let y = H - 1; y >= 0 && floor === 0; y--) {
    for (let x = 0; x < W; x++) if (solid(x, y)) { floor = y; break; }
  }

  /**
   * The three chords, and which way each one has to be walked to face the lamp.
   *
   * Only three, not four: the anti-diagonal is exactly perpendicular to the
   * light and carries no information about which of its two ends is lit, so
   * banding across it would be a coin flip. `k` converts a step count into a
   * distance in cells, which matters because a diagonal step covers 1.41 cells
   * and without it every mass would measure thinnest along its diagonal and the
   * bands would collapse back onto the screen diagonal we are getting rid of.
   */
  const CHORDS: ReadonlyArray<{ dx: number; dy: number; k: number }> = [
    { dx: -1, dy: 0, k: 1 },        // across: vertical bands, for an upright limb
    { dx: 0, dy: -1, k: 1 },        // down:   horizontal bands, for a barrel
    { dx: -1, dy: -1, k: 1.414 },   // diagonal: for a sphere, and for the ties
  ];
  /** A tie goes to the diagonal, because that is what a sphere wants. */
  const TIE = [1, 1, 0.92];

  /** Two tones under this thickness, four only above the second. */
  const THIN = 14, THICK = 60;
  /** Band caps in cells, so a big mass gets a bounded light patch, not a proportional one. */
  const LIGHT_INSET = 2, LIGHT_MAX = 18, FORM_MAX = 10, DEEP_MAX = 4;
  /** How far a cell looks toward the lamp for something occluding it. */
  const OCCLUDE_REACH = 5;
  /**
   * Only a real seam throws a shadow.
   *
   * The first version of the directional term cast from any DEEP cell, and a
   * DEEP cell is also a toe gap, a nostril, a hatch stroke and a knuckle. Each
   * one of those threw its own five-cell streak down-right along the light
   * direction, and the creature came out combed. An occlusion seam is tens of
   * cells long and connected; anything shorter is a detail, and a detail does
   * not occlude a surface.
   */
  const SEAM_CAST_AREA = 24;
  const caster = new Uint8Array(W * H);
  {
    const seen = new Uint8Array(W * H);
    const stack: number[] = [];
    const comp: number[] = [];
    for (let s = 0; s < W * H; s++) {
      if (src[s] !== DEEP || seen[s]) continue;
      comp.length = 0; stack.length = 0;
      stack.push(s); seen[s] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        comp.push(i);
        const x = i % W, y = (i / W) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const j = ny * W + nx;
            if (seen[j] || src[j] !== DEEP) continue;
            seen[j] = 1; stack.push(j);
          }
        }
      }
      if (comp.length >= SEAM_CAST_AREA) for (const i of comp) caster[i] = 1;
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = at(x, y);
      // A facet is a plane. One tone across its whole area, no gradient, no
      // exceptions -- that is how a mineral reads as hard rather than inflated.
      if (mask.isFlat(x, y)) continue;
      const isBody = v === BASE || v === LIGHT || v === FORM;
      if (!isBody && v !== SHADE && v !== ACCENT && v !== ACCENT2) continue;

      // Which way does the light wrap round this mass? The thinnest chord.
      let best = 0, bestThick = Infinity, up = 0, down = 0;
      for (let c = 0; c < 3; c++) {
        const ch = CHORDS[c]!;
        const a = ray(x, y, ch.dx, ch.dy, 40);
        const b = ray(x, y, -ch.dx, -ch.dy, 40);
        const thick = (a + b + 1) * ch.k * TIE[c]!;
        if (thick < bestThick) { bestThick = thick; best = c; up = a; down = b; }
      }
      const ch = CHORDS[best]!;
      const span = up + down;
      const spanCells = (span + 1) * ch.k;
      const t = span === 0 ? 0.5 : up / span;

      let level = levelOf(lambert(t));

      // Band widths in cells. The light patch is inset from the lit contour and
      // bounded on the far side; the shadow band hugs the shadow contour; the
      // fourth tone only exists at all on a mass big enough to need it.
      const upCells = up * ch.k, downCells = down * ch.k;
      if (level === 0 && (upCells < LIGHT_INSET || upCells > LIGHT_MAX)) level = 1;
      if (level === 2 && downCells > FORM_MAX) level = 1;
      if (level === 3 && downCells > DEEP_MAX) level = 2;

      // Tone count from thickness. Under fourteen cells -- seven reference
      // pixels -- a mass gets two tones and no highlight, because a highlight
      // on a mass that thin is one or two cells and does not survive the icon.
      if (spanCells < THIN) level = Math.max(1, Math.min(2, level));
      else if (spanCells < THICK) level = Math.min(2, level);

      // Crevice: close to an edge, but with the body wrapping around rather
      // than falling away. That is an armpit, never a tip.
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)
        || !solid(x - 1, y - 1) || !solid(x + 1, y - 1) || !solid(x - 1, y + 1) || !solid(x + 1, y + 1);
      if (edge && coverage(x, y) > 0.70) level = Math.max(level, 2);

      // Directional occlusion -- the automatic half of cast shadow.
      //
      // Nothing in this pass used to ask "is this cell occluded ALONG THE LIGHT
      // DIRECTION?"; `coverage` is a symmetric box sum and darkens a crevice
      // equally from all sides. March toward the lamp instead: an occlusion
      // seam between this cell and the light means some part is in front of
      // this surface, and a surface behind another part is in its shadow. Every
      // shadow this produces points the same way, which is exactly the property
      // that makes the creature read as being under one light.
      if (isBody && level < 2) {
        for (let d = 1; d <= OCCLUDE_REACH; d++) {
          const nx = x - d, ny = y - d;
          if (nx < 0 || ny < 0) break;
          const s = at(nx, ny);
          if (s === EMPTY || s === OUTLINE) break;
          if (caster[ny * W + nx]) { level = 2; break; }
        }
      }

      if (floor > 0 && y >= floor - 2) level = Math.max(level, 2);

      if (v === SHADE) { mask.set(x, y, RAMP_SHADE[level]!); continue; }
      if (v === ACCENT) { mask.set(x, y, RAMP_ACCENT[level]!); continue; }
      if (v === ACCENT2) { mask.set(x, y, RAMP_ACCENT2[level]!); continue; }

      // Body materials all live on one ladder, so "a step darker" is the same
      // step whether it lands on a flank, on a pale belly or inside a shadow.
      const home = v === LIGHT ? RUNG_LIGHT : v === FORM ? RUNG_FORM : RUNG_BASE;
      const off = v === LIGHT ? OFF_LIGHT : v === FORM ? OFF_FORM : OFF_BASE;
      // A pale material stops at the body's own colour: three tones, and a
      // belly that goes darker than the flank it sits on is not a belly.
      const cap = v === LIGHT ? RUNG_BASE : 5;
      mask.set(x, y, LADDER[Math.max(0, Math.min(cap, home + off[level]!))]!);
    }
  }
}

/**
 * Settle the tone boundaries.
 *
 * The shading pass decides each cell independently off ray measurements, and
 * ray measurements are noisy by one cell wherever a contour steps. The result
 * is a boundary that reads as a 1-on-1 jagged staircase with the odd stray cell
 * in it -- and on a broad curve the reference draws a small number of long
 * straight runs instead: five segments of six to ten pixels across a whole
 * flank, never a single-cell zigzag. It also leaves single stray cells, which
 * at icon scale become a coin flip in the 2x2 dominant-colour vote.
 *
 * So one majority pass over the generated body tones. A cell surrounded by six
 * or more neighbours of a single other generated tone joins them. That deletes
 * every isolated cell and every one-cell notch while leaving any boundary that
 * is genuinely a corner, because a corner has at most five neighbours on the
 * other side.
 *
 * Only tones this pass produced are eligible, in both directions. A hand-placed
 * DEEP seam, an ACCENT_LIT claw tip, an INNER nostril, a SPEC catchlight and
 * every eye cell are invisible to it -- a two-cell mark an author placed
 * deliberately is not noise, and majority-filtering it away is exactly the kind
 * of helpfulness that loses a claw.
 */
const SETTLE = new Set([HILIGHT, LIGHT, BASE, FORM, SHADE, ACCENT, ACCENT2]);

function settle(mask: Mask): void {
  const W = mask.w, H = mask.h;
  const src = mask.data.slice();
  const tally = new Uint8Array(TONE_COUNT);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const v = src[i]!;
      if (!SETTLE.has(v)) continue;
      // A facet is exempt. Where two planes meet, the hard step IS the ridge,
      // and a majority filter would round the one corner that has to stay sharp.
      if (mask.isFlat(x, y)) continue;
      let bestV = -1, bestN = 0;
      tally.fill(0);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const n = src[(y + dy) * W + x + dx]!;
          if (n === v || !SETTLE.has(n)) continue;
          const c = ++tally[n]!;
          if (c > bestN) { bestN = c; bestV = n; }
        }
      }
      if (bestN >= 6) mask.data[i] = bestV;
    }
  }
}

/*
 * SURFACE TEXTURE -- REMOVED.
 *
 * There used to be a pass here that stamped a repeating pattern -- scales,
 * plates, feathers, grain, sheen, hide -- across the whole body of every
 * creature, one cell wide and one ramp step deep. It was defended as being
 * "a modulation of the light rather than a decal", and that defence was true
 * and beside the point: at a stroke every five cells, over a body a hundred
 * cells across, it put four hundred flecks on every Kin. The player read them
 * exactly as what they were -- dots -- and asked for none.
 *
 * The reference this roster is measured against holds large FLAT areas. A
 * Ruby-era battle sprite has no all-over surface pattern anywhere on it; what
 * looks like scales on a reptile is four deliberately drawn scales in the one
 * place a scale would read, not a field of them. Generated texture cannot do
 * that, because it does not know where the interesting places are.
 *
 * So: no automatic texture, at any strength. A design that genuinely needs a
 * material -- a plated back, a feathered breast, a faceted crystal -- draws it
 * deliberately, in the handful of places it belongs, with `seamPath`, `rings`,
 * `bevel`, `plate`, `shell` or a short loop of its own. `p.noTexture()` is
 * kept as a no-op so the designs that called it still compile.
 */

/**
 * Appendages.
 *
 * Fourteen body plans is not fourteen creatures: run forty species through them
 * and the eye immediately sorts them into six shapes wearing different colours.
 * This pass breaks the silhouette instead of the palette, which is the thing
 * that actually makes two quadrupeds read as two animals.
 *
 * Everything is anchored to the face the plan already recorded, and every
 * feature is grown *outward from a pixel that is already solid*, so nothing
 * ever floats free of the body -- a detached horn is worse than no horn.
 */
function appendages(mask: Pen, seed: string): void {
  const rng = new Rng('limb:' + seed);

  let x0 = mask.w, x1 = 0, y0 = mask.h, y1 = 0;
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      const v = mask.get(x, y);
      if (v === EMPTY || v === OUTLINE) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 - x0 < 8 || y1 - y0 < 8) return;
  const w = x1 - x0;

  // The eyes are recorded in mask cells; this pass is authored in pen units.
  const eye = pendingEyes[0];
  const faceX = eye ? Math.round(mask.units(eye.x)) : Math.round((x0 + x1) / 2);
  const faceY = eye ? Math.round(mask.units(eye.y)) : y0 + Math.round((y1 - y0) * 0.2);
  const faceR = eye ? Math.max(3, Math.round(mask.units(eye.spread + eye.size * 2))) : Math.round(w * 0.22);

  /** Topmost solid pixel in a column, or -1. */
  const crown = (x: number): number => {
    for (let y = 0; y < mask.h; y++) {
      const v = mask.get(x, y);
      if (v !== EMPTY && v !== OUTLINE) return y;
    }
    return -1;
  };

  const features = ['horns', 'spines', 'antennae', 'eartufts', 'collar', 'none', 'none'] as const;
  const pick = features[rng.below(features.length)]!;

  switch (pick) {
    case 'horns': {
      const want = Math.max(3, Math.round(faceR * 0.9));
      for (const side of [-1, 1]) {
        const bx = faceX + side * Math.round(faceR * 0.55);
        const by = crown(bx);
        if (by < 0) continue;
        // Everything here grows upward, so every length is capped by whatever
        // headroom the fit pass left: a horn through the top of the cell is a
        // horn with a flat end.
        const len = Math.max(1, Math.min(want, by - 2));
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const x = Math.round(bx + side * t * faceR * 0.5);
          const y = by - 1 - i;
          const half = Math.max(0, Math.round((1 - t) * 1.6));
          for (let d = -half; d <= half; d++) mask.set(x + d, y, ACCENT);
          // Growth rings, which is what a horn has and a spike does not.
          if (i % 3 === 1) for (let d = -half; d <= half; d++) mask.set(x + d, y, ACCENT_DARK);
          // Half a unit of lit leading edge and half a unit of dark trailing
          // edge, so the horn reads as a cone. A whole unit of each -- all the
          // old grid could manage -- left nothing in between for the horn.
          // Both half-rows, since a unit is two cells tall as well as wide.
          for (const dy of [0, 0.5]) {
            mask.cell(x - half, y + dy, ACCENT_LIT);
            mask.cell(x + half + 0.5, y + dy, ACCENT_DARK);
          }
        }
      }
      break;
    }
    case 'spines': {
      // A row of triangles riding the upper contour, behind the head.
      const from = faceX + Math.round(faceR * 0.9);
      const to = x1 - 1;
      if (to - from < 6) break;
      for (let x = from; x <= to; x += 4) {
        const top = crown(x);
        if (top < 0) continue;
        const hgt = Math.max(1, Math.min(2 + rng.below(3), top - 2));
        for (let i = 0; i < hgt; i++) {
          const half = Math.max(0, 1 - Math.floor(i / 2));
          for (let d = -half; d <= half; d++) mask.set(x + d, top - 1 - i, ACCENT);
        }
        mask.set(x, top - hgt, ACCENT_LIT);
      }
      break;
    }
    case 'antennae': {
      for (const side of [-1, 1]) {
        const bx = faceX + side * Math.round(faceR * 0.4);
        const by = crown(bx);
        if (by < 0) continue;
        const len = Math.max(1, Math.min(Math.max(4, Math.round(faceR * 1.3)), by - 3));
        for (let i = 0; i < len; i++) {
          const t = i / len;
          mask.set(Math.round(bx + side * Math.sin(t * 1.5) * faceR * 0.7), by - 1 - i, ACCENT);
        }
        // A bead on the end, which is what stops it reading as a stray line.
        const tipX = Math.round(bx + side * Math.sin(1.5) * faceR * 0.7);
        const tipY = by - len;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) mask.set(tipX + dx, tipY + dy, ACCENT);
        }
        mask.set(tipX - 1, tipY - 1, ACCENT_LIT);
      }
      break;
    }
    case 'eartufts': {
      for (const side of [-1, 1]) {
        const bx = faceX + side * Math.round(faceR * 0.85);
        const by = crown(bx);
        if (by < 0) continue;
        const len = Math.max(1, Math.min(4, by - 2));
        for (let i = 0; i < len; i++) {
          const half = Math.max(0, 2 - i);
          for (let d = -half; d <= half; d++) mask.set(bx + d, by - 1 - i, ACCENT);
          // The lit front edge of the shell, half a unit of it.
          mask.line(bx - half, by - 1 - i, bx - half, by - 0.5 - i, ACCENT_LIT, false);
        }
        // A real ear canal: a cavity that narrows upward, with a dark rim on
        // the near lip. One flat cell of INNER was all that used to fit, and it
        // read as a hole punched in the head.
        const deep = Math.min(3, len);
        mask.line(bx, by - deep, bx, by - 0.5, INNER, false);
        mask.line(bx + 0.5, by - deep + 1, bx + 0.5, by - 0.5, INNER, false);
        mask.line(bx - 0.5, by - deep, bx - 0.5, by - 0.5, ACCENT_DARK, false);
      }
      break;
    }
    case 'collar': {
      // A ruff around the neck: widest at the sides, thin at the front.
      const ny = faceY + Math.round(faceR * 1.05);
      const half = Math.round(faceR * 1.35);
      for (let x = faceX - half; x <= faceX + half; x++) {
        const t = Math.abs(x - faceX) / Math.max(1, half);
        const thick = 1 + Math.round(t * 2);
        for (let k = 0; k < thick; k++) {
          if (mask.get(x, ny + k) === EMPTY && mask.get(x, ny + k - 1) === EMPTY) continue;
          mask.set(x, ny + k, ACCENT);
        }
        // A frill is a stack of separate lobes, so its lower edge scallops and
        // each lobe carries a lit ridge. Drawing one dark cell every third unit
        // -- which is what a coarser grid forced -- came out as a dotted line
        // across the neck and read as a zip. Half-unit steps make each scallop
        // an actual arc.
        const base = ny + Math.round(t * 2);
        const lobe = ((x - faceX) % 3 + 3) % 3;
        mask.line(x, base + (lobe === 1 ? 1 : 0.5), x + 1, base + (lobe === 0 ? 1 : 0.5), ACCENT_DARK);
        if (lobe === 2) mask.line(x, base - 0.5, x + 1, base - 0.5, ACCENT_LIT);
      }
      break;
    }
    default:
      break;
  }
}

/**
 * Markings.
 *
 * Run at design resolution, before shading, so the pattern is lit along with
 * the body instead of sitting on top of it like a decal. Every species gets one
 * deterministic pattern from its own id, which is the cheapest way to stop
 * forty generated creatures reading as forty recolours of six shapes.
 *
 * Two rules keep the result looking painted rather than stamped:
 *
 *  - **Nothing touches the outline.** Every pattern is eroded away from the
 *    silhouette edge, so a rim of body colour always survives around it. A
 *    marking that runs off the edge of the body reads as a printing error.
 *  - **Nothing crosses the face by accident.** The plans have already recorded
 *    where the eyes are, so the head is a known region: body patterns start
 *    below it and head patterns are confined to it. The first version drew a
 *    stripe straight down the middle of every face, which is the single most
 *    artificial thing a generated sprite can do.
 */
function markings(mask: Pen, seed: string): void {
  const rng = new Rng('mark:' + seed);

  // Body extent, so a pattern can be placed in proportion rather than in pixels.
  let x0 = mask.w, x1 = 0, y0 = mask.h, y1 = 0;
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      if (mask.get(x, y) !== BASE) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 - x0 < 6 || y1 - y0 < 6) return;
  const w = x1 - x0, h = y1 - y0;

  // Where the face is. Falls back to "the top third" for plans with no eyes.
  // Eye coordinates are mask cells; this pass is authored in pen units.
  const eye = pendingEyes[0];
  const faceY = eye ? Math.round(mask.units(eye.y)) : y0 + Math.round(h * 0.22);
  const faceR = eye ? Math.max(3, Math.round(mask.units(eye.spread + eye.size * 2))) : Math.round(w * 0.22);
  const faceX = eye ? Math.round(mask.units(eye.x)) : x0 + Math.round(w * 0.5);
  const bodyTop = Math.min(y1 - 2, Math.round(faceY + faceR * 1.1));

  /** Paint only well inside the silhouette, so a rim of body colour survives. */
  const paint = (x: number, y: number) => {
    if (mask.get(x, y) !== BASE) return;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx * dx + dy * dy > 5) continue;
        const v = mask.get(x + dx, y + dy);
        if (v === EMPTY || v === OUTLINE) return;
      }
    }
    mask.set(x, y, ACCENT);
  };

  /**
   * Feather the edge of the patch into the body.
   *
   * A marking whose edge is a clean arc reads as a sticker. Painted art breaks
   * that edge up, and breaking it up needs a grid fine enough that a broken
   * cell is smaller than the shapes either side of it -- which is exactly what
   * the old design cell was not, and why this pass could not exist before.
   *
   * The two halves use the same ordered threshold from opposite directions, so
   * the cells the patch gives up are precisely the ones the body takes back and
   * the fringe interlocks instead of merely being noisy.
   *
   * Worked in mask cells on purpose. The first attempt tracked painted units
   * and rimmed them in unit space, which put a mark on both cell rows of every
   * unit -- a unit being two cells tall -- so the belly of every quadruped came
   * out as a ladder. Cells cannot make that mistake.
   */
  const border = () => {
    const raw = mask.m;
    const src = raw.data.slice();
    const is = (x: number, y: number, v: number): boolean =>
      x >= 0 && y >= 0 && x < raw.w && y < raw.h && src[y * raw.w + x] === v;
    for (let y = 0; y < raw.h; y++) {
      for (let x = 0; x < raw.w; x++) {
        const touching = is(x - 1, y, ACCENT) || is(x + 1, y, ACCENT)
          || is(x, y - 1, ACCENT) || is(x, y + 1, ACCENT);
        if (is(x, y, ACCENT)) {
          const open = !is(x - 1, y, ACCENT) || !is(x + 1, y, ACCENT)
            || !is(x, y - 1, ACCENT) || !is(x, y + 1, ACCENT);
          if (open && ditherOn(x, y, 0.5)) raw.set(x, y, BASE);
        } else if (touching && is(x, y, BASE) && !ditherOn(x, y, 0.5)) {
          raw.set(x, y, ACCENT);
        }
      }
    }
  };

  const kinds = ['belly', 'saddle', 'bands', 'spots', 'crest', 'cheeks', 'plain'] as const;
  const kind = kinds[rng.below(kinds.length)]!;

  switch (kind) {
    case 'belly': {
      // A pale front: the commonest real animal marking there is.
      const top = bodyTop + Math.round((y1 - bodyTop) * (0.18 + rng.next() * 0.15));
      for (let y = top; y <= y1; y++) {
        const t = (y - top) / Math.max(1, y1 - top);
        const half = Math.round(w * 0.26 * (1 - t * 0.5));
        for (let x = faceX - half; x <= faceX + half; x++) paint(x, y);
      }
      break;
    }
    case 'saddle': {
      // A patch over the shoulders and back, tapering front and rear.
      const top = bodyTop;
      const bot = bodyTop + Math.round((y1 - bodyTop) * 0.5);
      for (let y = top; y <= bot; y++) {
        const t = (y - top) / Math.max(1, bot - top);
        const half = Math.round(w * (0.30 - 0.14 * Math.abs(t - 0.4) * 2));
        for (let x = faceX - half; x <= faceX + half; x++) paint(x, y);
      }
      break;
    }
    case 'bands': {
      // Short chevrons across the body only, never the head.
      const span = y1 - bodyTop;
      if (span < 6) break;
      const count = 2 + rng.below(3);
      for (let i = 0; i < count; i++) {
        const y = bodyTop + Math.round(span * (0.2 + i * (0.55 / count)));
        const half = Math.round(w * (0.30 + rng.next() * 0.1));
        for (let k = 0; k < 1 + rng.below(2); k++) {
          for (let x = faceX - half; x <= faceX + half; x++) {
            paint(x, y + k + Math.round(Math.abs(x - faceX) * 0.12));
          }
        }
      }
      break;
    }
    case 'spots': {
      const count = 4 + rng.below(5);
      for (let i = 0; i < count; i++) {
        const sx = x0 + 2 + rng.below(Math.max(1, w - 4));
        const sy = bodyTop + rng.below(Math.max(1, y1 - bodyTop));
        const r = 1 + rng.below(2);
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r + 1) paint(sx + dx, sy + dy);
          }
        }
      }
      break;
    }
    case 'crest': {
      // A cap over the top of the skull, above the eyes.
      const bot = Math.max(y0 + 1, faceY - Math.round(faceR * 0.35));
      for (let y = y0; y <= bot; y++) {
        for (let x = faceX - faceR; x <= faceX + faceR; x++) paint(x, y);
      }
      break;
    }
    case 'cheeks': {
      // Two patches flanking the eyes.
      const r = Math.max(2, Math.round(faceR * 0.42));
      for (const side of [-1, 1]) {
        const cxp = faceX + side * Math.round(faceR * 0.95);
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if ((dx * dx) / (r * r) + (dy * dy) / (r * r) > 1) continue;
            paint(cxp + dx, faceY + dy);
          }
        }
      }
      break;
    }
    default:
      break;
  }
  border();
}

/**
 * Fit the scratch cell into the design cell.
 *
 * The content is bottom-aligned onto the ground line and centred, and only if
 * it still will not fit is it scaled down. Losing a claw to a resample is
 * better than losing a head to a clip. The scatter runs source to destination
 * rather than the other way round so that every authored cell lands somewhere:
 * sampling from the destination drops one-cell details -- seams, claws, gill
 * slits -- which are exactly what this pass exists to protect.
 */
function fitToCell(work: Mask, groundY: number): Mask {
  const out = new Mask(DESIGN, DESIGN);
  const b = work.bounds();
  if (!b) return out;
  const cw = b.x1 - b.x0 + 1, ch = b.y1 - b.y0 + 1;
  // Two units of margin on each side for the outline, and five above the body
  // for whatever the appendage and type passes are about to grow up there.
  const k = Math.min(1, (DESIGN - 4 * U) / cw, (groundY - 6 * U) / ch);
  const dx0 = Math.round((DESIGN - cw * k) / 2);
  const dy0 = Math.round(groundY - ch * k);

  for (let y = b.y0; y <= b.y1; y++) {
    for (let x = b.x0; x <= b.x1; x++) {
      const v = work.get(x, y);
      if (v === EMPTY) continue;
      const ox = dx0 + Math.round((x - b.x0) * k), oy = dy0 + Math.round((y - b.y0) * k);
      out.set(ox, oy, v);
      // The facet flags travel with the cells they belong to, or a mineral
      // authored as flat planes would be airbrushed the moment it was fitted.
      if (work.isFlat(x, y) && ox >= 0 && oy >= 0 && ox < out.w && oy < out.h) {
        out.flat[oy * out.w + ox] = 1;
      }
    }
  }
  // The eyes were recorded in scratch coordinates and are drawn much later, so
  // they have to make the same journey.
  for (const e of pendingEyes) {
    e.x = dx0 + Math.round((e.x - b.x0) * k);
    e.y = dy0 + Math.round((e.y - b.y0) * k);
    e.spread = Math.max(0, Math.round(e.spread * k));
    e.size = Math.max(3, Math.round(e.size * k));
  }
  return out;
}

/* -------------------------------------------------------- type character */

interface EdgePt { x: number; y: number; nx: number; ny: number }

/**
 * Type character.
 *
 * A creature should read as its type from silhouette and detail alone, with the
 * palette switched off. Colour cannot carry it: half the roster is some shade
 * of green or blue, and a red quadruped is not a fire type, it is a red
 * quadruped. So each type gets *shapes* -- tongues of flame, fin rays, leaf
 * blades, faceted shards, rivets, drips -- grown from the silhouette the plan
 * already built.
 *
 * Runs at design resolution, after markings, so everything here is lit by the
 * shading pass along with the body rather than pasted over the top of it.
 */
function typeTraits(m: Pen, sp: SpeciesData | undefined, seed: string): void {
  const kind = sp?.types?.[0];
  if (!kind) return;
  const b = m.bounds();
  if (!b) return;
  const w = b.x1 - b.x0, h = b.y1 - b.y0;
  if (w < 8 || h < 8) return;

  const rng = new Rng('type:' + seed);
  // Eye coordinates are mask cells; this pass is authored in pen units.
  const eye = pendingEyes[0];
  const faceX = eye ? Math.round(m.units(eye.x)) : Math.round((b.x0 + b.x1) / 2);
  const faceY = eye ? Math.round(m.units(eye.y)) : b.y0 + Math.round(h * 0.2);
  const faceR = eye ? Math.max(3, Math.round(m.units(eye.spread + eye.size * 2))) : Math.round(w * 0.22);

  // Nothing may rise more than a few cells above the silhouette the plan
  // built, and nothing may grow off a tip. Both rules exist because the first
  // version happily stacked a flame tuft on the point of an ear and a dorsal
  // fin on the point of a dorsal fin, and the result was a creature with a
  // radio mast: one column of ornament running clean off the top of the cell.
  const ceiling = Math.max(2, b.y0 - 6);
  const anchor = (x: number, need: number): number => {
    const ty = m.top(x);
    if (ty <= ceiling + 1) return -1;
    for (let k = 0; k < need; k++) if (!m.filled(x, ty + k)) return -1;
    return ty;
  };
  const rise = (ty: number, want: number): number => Math.max(0, Math.min(want, ty - ceiling));

  /**
   * Paint, but only where the body is a real mass rather than a limb, a leg or
   * a fin. A seam ruled straight across a sprite catches every leg on the way
   * and comes out as polka dots -- which is exactly what the first pass at the
   * carapace seams did to an eight-legged spider.
   */
  const isMass = (x: number, y: number): boolean => {
    if (!m.filled(x, y)) return false;
    // Body three units away on all four sides. A limb fails this on one axis
    // however densely it is packed against its neighbours, which a coverage
    // count alone does not catch.
    if (!m.filled(x - 3, y) || !m.filled(x + 3, y) || !m.filled(x, y - 3) || !m.filled(x, y + 3)) return false;
    let n = 0;
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) if (m.filled(x + dx, y + dy)) n++;
    }
    return n >= 42;
  };
  const mark = (x: number, y: number, v: number) => { if (isMass(x, y)) m.set(x, y, v); };
  /** `mark` at a single cell. Bevels, barbs and rivet highlights live here:
   *  each of them is a half-unit mark and none of them existed before there
   *  was a half unit to put them in. */
  const markCell = (x: number, y: number, v: number) => {
    if (isMass(Math.round(x), Math.round(y))) m.cell(x, y, v);
  };

  let edgeCache: EdgePt[] | null = null;
  /** Every body cell that touches empty space, with the direction it faces. */
  const edges = (): EdgePt[] => {
    if (edgeCache) return edgeCache;
    const pts: EdgePt[] = [];
    for (let y = b.y0; y <= b.y1; y++) {
      for (let x = b.x0; x <= b.x1; x++) {
        if (!m.filled(x, y)) continue;
        let nx = 0, ny = 0;
        if (!m.filled(x - 1, y)) nx--;
        if (!m.filled(x + 1, y)) nx++;
        if (!m.filled(x, y - 1)) ny--;
        if (!m.filled(x, y + 1)) ny++;
        if (nx !== 0 || ny !== 0) pts.push({ x, y, nx, ny });
      }
    }
    edgeCache = pts;
    return pts;
  };

  /** Short points grown outward wherever the silhouette faces a given way. */
  const spikeEdge = (want: (p: EdgePt) => boolean, len: number, step: number, v: number) => {
    const pts = edges();
    for (let i = 0; i < pts.length; i += step) {
      const p = pts[i]!;
      if (!want(p)) continue;
      m.limb(p.x, p.y, p.x + p.nx * len, p.y + p.ny * len, 3, 1, v);
    }
  };

  switch (kind) {
    case 'flame': {
      // Tongues riding the upper contour, each with a hot core one cell in.
      // Fire reads from its notched, leaning silhouette; the colour only
      // confirms what the shape already said.
      for (let x = b.x0 + 1; x <= b.x1 - 1; x += 3) {
        const ty = anchor(x, 3);
        if (ty < 0) continue;
        const len = rise(ty, 2 + rng.below(5));
        if (len < 2) continue;
        const lean = -1 - rng.below(2);
        m.limb(x, ty, x + lean, ty - len, 3, 1, ACCENT);
        m.limb(x, ty - 1, x + Math.round(lean * 0.6), ty - len + 1, 1, 1, ACCENT_LIT);
        // The trailing edge of a tongue is cooler than its core. Half a unit
        // of it -- a whole one would have been the entire flame.
        m.line(x + 0.5, ty - 1, x + lean + 0.5, ty - len + 1, ACCENT_DARK);
      }
      break;
    }

    case 'tide': {
      // Dorsal fin with visible rays, gill slits behind the jaw, and a wet
      // sheen on the shoulder. Three details, three different reads of water.
      const fx = faceX + Math.round((b.x1 - faceX) * 0.4);
      for (let i = -3; i <= 3; i++) {
        const x = fx + i;
        const ty = anchor(x, 4);
        if (ty < 0) continue;
        const up = rise(ty, Math.round(6 * Math.cos(i * 0.4)));
        if (up < 2) continue;
        m.limb(x, ty, x + 1, ty - up, 2, 1, ACCENT);
        if (i % 2 === 0) m.limb(x, ty - 1, x + 1, ty - up + 1, 1, 1, ACCENT_DARK);
      }
      const gx = faceX + Math.round(faceR * 1.3);
      for (let i = 0; i < 3; i++) {
        const gy = faceY + Math.round(faceR * 0.6);
        for (let k = -1; k <= 1; k++) m.over(gx + i * 2, gy + k, INNER);
        // Each slit gets a lit leading lip, so the gills read as flaps standing
        // off the neck rather than as three scratches ruled into it.
        m.line(gx + i * 2 - 0.5, gy - 1, gx + i * 2 - 0.5, gy + 1, ACCENT_LIT);
      }
      for (let i = 0; i < 2; i++) {
        const sx = faceX + Math.round(w * (0.3 + i * 0.16));
        for (let d = 0; d < 3; d++) m.over(sx + d, m.top(sx + d) + 2 + i, ACCENT_LIT);
      }
      break;
    }

    case 'verdant': {
      // Leaf blades: almonds with a mid-vein, growing off the back at
      // different angles so they read as growth rather than as a fringe.
      for (let i = 0; i < 3; i++) {
        const lx = faceX + Math.round(w * (-0.2 + i * 0.3));
        const ly = anchor(lx, 4);
        if (ly < 0) continue;
        const len = rise(ly, 5 + rng.below(4));
        if (len < 4) continue;
        const lean = (i % 2 === 0 ? -1 : 1) * (1 + rng.below(2));
        for (let k = 0; k <= len; k++) {
          const t = k / len;
          const half = Math.round(Math.sin(t * Math.PI) * 2.3);
          const px = lx + Math.round(lean * t * 2);
          const py = ly - k;
          for (let d = -half; d <= half; d++) m.set(px + d, py, ACCENT);
          if (half > 0) m.set(px - half, py, ACCENT_LIT);
          if (k > 0 && k < len) m.set(px, py, ACCENT_DARK);
          // Side veins branching off the midrib. Half a unit each, angled down
          // and out, which is the read the mid-vein alone never gave.
          if (half > 1 && k % 3 === 1) {
            m.cellOver(px - 0.5, py + 0.5, ACCENT_DARK);
            m.cellOver(px + 0.5, py + 0.5, ACCENT_DARK);
          }
        }
      }
      break;
    }

    case 'spark': {
      // Crackle etched into the body -- a bright zigzag with a dark side, so
      // it sits in the surface -- plus fur that stands up off the silhouette.
      for (let n = 0; n < 2; n++) {
        let px = b.x0 + Math.round(w * (0.22 + n * 0.3));
        let py = b.y0 + Math.round(h * (0.34 + n * 0.22));
        let dir = 1;
        for (let k = 0; k < 8; k++) {
          for (let d = 0; d < 3; d++) {
            const yy = py + Math.round(d * dir);
            mark(px + d, yy, ACCENT_LIT);
            mark(px + d, yy + 1, ACCENT_DARK);
          }
          px += 3; py += 2 * dir; dir = -dir;
        }
      }
      spikeEdge((p) => p.ny > 0 || (p.nx > 0 && p.ny >= 0), 3, 7, BASE);
      break;
    }

    case 'frost': {
      // Faceted shards: straight sides, a lit plane and a dark plane, and a
      // seam between them. Ice is convincing because of its flats.
      for (let n = 0; n < 4; n++) {
        const sx = b.x0 + Math.round(w * (0.15 + n * 0.22));
        const sy = anchor(sx, 4);
        if (sy < 0) continue;
        const len = rise(sy, 4 + rng.below(5));
        if (len < 3) continue;
        const lean = n % 2 === 0 ? -1 : 1;
        for (let k = 0; k <= len; k++) {
          const half = Math.max(0, Math.round((1 - k / len) * 2.4));
          const px = sx + Math.round(lean * k * 0.4);
          for (let d = -half; d <= half; d++) m.set(px + d, sy - k, d < 0 ? ACCENT_LIT : ACCENT);
        }
        m.limb(sx, sy - 1, sx + Math.round(lean * (len - 1) * 0.4), sy - len + 1, 1, 1, ACCENT_DARK);
      }
      break;
    }

    case 'stone':
    case 'terra': {
      // Straight facet seams and broken edges. A rock convinces through its
      // flats and its chips, never through being grey.
      for (let n = 0; n < 4; n++) {
        const ax = b.x0 + rng.below(Math.max(1, w));
        const ay = b.y0 + rng.below(Math.max(1, h));
        const dx = rng.chance(50) ? 1 : -1;
        const slope = 0.3 + rng.next() * 0.5;
        const len = 5 + rng.below(8);
        for (let k = 0; k < len; k++) mark(ax + dx * k, ay + Math.round(k * slope), ACCENT_DARK);
        mark(ax, ay - 1, ACCENT_LIT);
      }
      // Chips: knocked out along the tangent so a notch can never punch a hole.
      const pts = edges();
      for (let i = 3; i < pts.length; i += 11) {
        const p = pts[i]!;
        m.set(p.x, p.y, EMPTY);
        m.set(p.x + (p.ny !== 0 ? 1 : 0), p.y + (p.nx !== 0 ? 1 : 0), EMPTY);
      }
      if (kind === 'terra') {
        for (let x = b.x0 + 2; x <= b.x1 - 2; x += 5) {
          const by = m.bottom(x);
          if (by < 0) continue;
          m.ellipse(x, by - 1, 2, 2, ACCENT_DARK);
        }
      }
      break;
    }

    case 'iron': {
      // A plate seam with rivets along it, and one sheen streak. Three cheap
      // marks that say metal without needing a metallic colour to do it.
      const sy = Math.min(b.y1 - 2, faceY + Math.round(faceR * 1.7));
      for (let x = b.x0; x <= b.x1; x++) mark(x, sy + Math.round((x - faceX) * 0.12), ACCENT_DARK);
      for (let x = b.x0 + 3; x <= b.x1 - 3; x += 6) {
        const ry = sy + Math.round((x - faceX) * 0.12) - 3;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) mark(x + dx, ry + dy, ACCENT_DARK);
        }
        mark(x, ry, ACCENT);
        // A rivet is a dome: a specular on its upper left and its own little
        // shadow on the lower right. Two cells, and the head stops being a
        // flat square of accent.
        markCell(x - 0.5, ry - 0.5, ACCENT_LIT);
        markCell(x + 0.5, ry + 0.5, INNER);
      }
      for (let k = 0; k < 5; k++) {
        const sx = faceX + Math.round(w * 0.3) + k;
        m.over(sx, m.top(sx) + 2, ACCENT_LIT);
      }
      break;
    }

    case 'chitin': {
      // Stacked carapace plates: a dark seam with a lit ridge riding above it,
      // which is what makes the segments look overlapped rather than ruled on.
      const from = Math.min(b.y1 - 3, faceY + Math.round(faceR * 1.2));
      for (let i = 0; i < 4; i++) {
        const sy = from + Math.round((b.y1 - from) * ((i + 1) / 5));
        for (let x = b.x0; x <= b.x1; x++) {
          const bow = Math.round(Math.abs(x - faceX) * 0.1);
          mark(x, sy + bow, ACCENT_DARK);
          // A bevel half a unit above the seam and a gutter half a unit below
          // it. That pair is what "overlapped" means: a lip catching the light
          // and an edge disappearing under the plate in front of it.
          // Both half-cells of the unit, or the bevel comes out as a dashed
          // line: a unit is two cells wide and one plot only fills one of them.
          markCell(x, sy + bow - 0.5, ACCENT_LIT);
          markCell(x + 0.5, sy + bow - 0.5, ACCENT_LIT);
          markCell(x, sy + bow + 0.5, INNER);
          markCell(x + 0.5, sy + bow + 0.5, INNER);
        }
      }
      break;
    }

    case 'gale': {
      // Feather edges: the trailing silhouette is scalloped rather than
      // smooth, and long quills run over the body in the same direction.
      spikeEdge((p) => p.ny > 0 || p.nx > 0, 2, 6, BASE);
      for (let n = 0; n < 3; n++) {
        const qx = b.x0 + Math.round(w * (0.26 + n * 0.2));
        const qy = b.y0 + Math.round(h * (0.3 + n * 0.14));
        for (let k = 0; k < 9; k++) {
          mark(qx + k, qy + Math.round(k * 0.5), ACCENT_LIT);
          mark(qx + k, qy + Math.round(k * 0.5) + 1, ACCENT_DARK);
          // Barbs off the shaft: half a unit each, alternating sides. They are
          // the whole reason this now reads as a feather and not a pinstripe.
          markCell(qx + k - 0.5, qy + Math.round(k * 0.5) - 0.5, ACCENT_LIT);
          if ((k & 1) === 0) markCell(qx + k + 0.5, qy + Math.round(k * 0.5) + 1.5, ACCENT_DARK);
        }
      }
      break;
    }

    case 'venom': {
      // Drips off the underside, each with a bead on the end. Anything that
      // hangs below the ground line is skipped: a drip through the floor
      // reads as a mistake, not as poison.
      for (let x = b.x0 + 3; x <= b.x1 - 3; x += 5) {
        if (!rng.chance(60)) continue;
        const by = m.bottom(x);
        if (by < 0 || by > m.h - 6) continue;
        const len = 2 + rng.below(3);
        m.limb(x, by, x, by + len, 3, 1, ACCENT);
        m.ellipse(x, by + len + 1, 1, 2, ACCENT);
        m.over(x, by, ACCENT_DARK);
      }
      break;
    }

    case 'umbral': {
      // The underside is not merely unlit, it is swallowed: the lower body is
      // pushed down the ramp before the light ever runs, so the shading pass
      // darkens an already dark surface instead of relighting it.
      for (let y = b.y0; y <= b.y1; y++) {
        const t = (y - b.y0) / Math.max(1, h);
        if (t < 0.55) continue;
        for (let x = b.x0; x <= b.x1; x++) {
          const v = m.get(x, y);
          if (v === BASE) m.set(x, y, t > 0.78 ? DEEP : SHADE);
          else if (v === LIGHT) m.set(x, y, BASE);
        }
      }
      const pts = edges();
      for (let i = 2; i < pts.length; i += 9) {
        const p = pts[i]!;
        if (p.ny <= 0) continue;
        m.limb(p.x, p.y, p.x - 2, p.y + 3, 2, 1, ACCENT_DARK);
      }
      break;
    }

    case 'radiant': {
      // A lit rim on every edge facing the light, so the creature reads as
      // the source rather than as something standing near one.
      for (const p of edges()) {
        if (p.nx > 0 || p.ny > 0) continue;
        m.set(p.x, p.y, ACCENT_LIT);
      }
      for (let n = -2; n <= 2; n++) {
        const rx = faceX + n * 3;
        const ty = anchor(rx, 3);
        if (ty < 0) continue;
        m.limb(rx, ty, rx + n, ty - rise(ty, 3 + Math.abs(n)), 1, 1, ACCENT_LIT);
      }
      break;
    }

    case 'spirit': {
      // A dissolving hem. An ordered dither is the only way a hard silhouette
      // can read as not entirely there, and it has to eat the feet to work --
      // a spirit standing flat on the floor is just a pale animal.
      for (let y = b.y0; y <= b.y1; y++) {
        const t = (y - b.y0) / Math.max(1, h);
        if (t < 0.62) continue;
        const density = (t - 0.62) / 0.38;
        for (let x = b.x0; x <= b.x1; x++) {
          if (!m.filled(x, y)) continue;
          if (ditherOn(x, y, density * 0.95)) m.set(x, y, EMPTY);
          else if (t > 0.75) m.set(x, y, ACCENT);
        }
      }
      break;
    }

    case 'psyche': {
      // A gem set in the forehead and two orbit arcs. The read is focus, so
      // everything is centred and nothing is scattered.
      const gy = Math.max(b.y0 + 2, faceY - Math.round(faceR * 1.15));
      for (let d = -2; d <= 2; d++) {
        const half = 2 - Math.abs(d);
        for (let k = -half; k <= half; k++) m.over(faceX + k, gy + d, ACCENT_DARK);
      }
      m.over(faceX, gy, ACCENT_LIT);
      m.over(faceX, gy - 1, ACCENT_LIT);
      for (let n = 0; n < 2; n++) {
        const r = Math.round(w * (0.28 + n * 0.12));
        const oy = faceY + Math.round(h * 0.35);
        for (let a = 0; a < 22; a++) {
          const ang = -0.4 + (a / 21) * 2.2;
          mark(faceX + Math.round(Math.cos(ang) * r), oy + Math.round(Math.sin(ang) * r * 0.45), ACCENT_LIT);
        }
      }
      break;
    }

    case 'brawl': {
      // Wraps bound round the limbs, with a knot line under them.
      const wy = b.y1 - Math.round(h * 0.24);
      for (let k = 0; k < 3; k++) {
        for (let x = b.x0; x <= b.x1; x++) m.over(x, wy + k, k === 0 ? ACCENT_LIT : ACCENT);
      }
      for (let x = b.x0; x <= b.x1; x += 3) mark(x, wy + 3, ACCENT_DARK);
      break;
    }

    default: {
      // beast, and anything a future type falls back to: guard hairs breaking
      // the shaded edges, and a heavier ruff across the shoulders. Fur is what
      // stops a beast silhouette reading as moulded rubber.
      // Only the edges away from the light get fur. Breaking the lit contour
      // as well makes the whole silhouette fizz, and at icon size a fizzy
      // silhouette is no silhouette at all.
      spikeEdge((p) => p.ny > 0 || (p.nx > 0 && p.ny >= 0), 2, 9, BASE);
      const rx = faceX + Math.round(faceR * 1.1);
      for (let i = 0; i < 4; i++) {
        const x = rx + i * 2;
        const ty = anchor(x, 3);
        if (ty < 0) continue;
        m.limb(x, ty, x + 1, ty - rise(ty, 2 + rng.below(3)), 3, 1, BASE);
      }
      break;
    }
  }
}

/* ------------------------------------------------------ internal edges */

/**
 * The four intents a cell can have been painted with, collapsed into the
 * three that a division can be drawn between.
 *
 * Read off the *intent map* -- the mask as the design left it, before the
 * light ran -- because after `shade` the information is gone: a far limb's
 * middle band and a torso's dark band are both literally SHADE, and a pass
 * that keys off the shaded mask would either miss the boundary or ink every
 * shading band on the creature.
 */
const PART_NONE = 0;
/** The near surface of the animal: body, belly, muzzle, the lit face of a mass. */
const PART_BODY = 1;
/** Set back: a far limb, an underside, a seam the design drew for itself. */
const PART_RECESS = 2;
/** Feature material: horn, fin, claw, plate, leaf, flame, marking. */
const PART_ACCENT = 3;

function partOf(v: number): number {
  switch (v) {
    // FORM is body. It is the same surface as the BASE beside it, turned away
    // from the light or standing in something's shadow, and inking round it
    // would be inking round a shadow -- which is the exact wall that made the
    // whole roster come out as smooth blobs.
    case BASE: case LIGHT: case HILIGHT: case SPEC: case FORM: return PART_BODY;
    case SHADE: case DEEP: return PART_RECESS;
    case ACCENT: case ACCENT_DARK: case ACCENT_LIT: return PART_ACCENT;
    case ACCENT2: case ACCENT2_DARK: case ACCENT2_LIT: return PART_ACCENT;
    // EMPTY, OUTLINE, the eye tones, INNER, SHADOW. An eye is already ringed in
    // its own ink and a mouth is already a cavity; neither wants inking twice.
    default: return PART_NONE;
  }
}

/**
 * Internal edges: the dark line between two parts of the same creature.
 *
 * THE PROBLEM. Every distinct part of a reference sprite is bounded by ink,
 * not just the outer silhouette. An arm crossing the chest has a black edge
 * along it; a far leg is both darker than the near one *and* outlined against
 * it. We only inked the silhouette, so any limb drawn in a tone close to the
 * body's dissolved into it and the creature read as one lump with bumps -- the
 * single most damaging difference between this roster and the reference.
 *
 * THE RULE, and why it is this rule. The temptation is to ink wherever two
 * tones differ, which turns a creature into a stained-glass window: the
 * shading pass alone puts six tones on one flank. So the pass never looks at
 * tone. It looks at *intent*, off the pre-shading map, and inks exactly two
 * kinds of boundary:
 *
 *   1. **Recess against body** -- SHADE or DEEP touching BASE/LIGHT. This is
 *      the far-limb case, and it is unconditional, because SHADE is documented
 *      as meaning "set behind" and the designs use it that way. The ink goes
 *      on the *recessed* side, so the near part keeps its full shape and the
 *      far one is both darker and outlined, which is what the reference does.
 *      It also promotes a one-cell DEEP seam -- what `limbFront`, `taperFront`
 *      and `blobFront` lay down -- from a mid-dark tone that the shading could
 *      swallow into hard ink that it cannot.
 *
 *   2. **An accent MASS against body or recess** -- and mass is the load-
 *      bearing word. ACCENT is a horn and a fin, but it is also every stripe,
 *      every claw tip and every iris, and ringing all of those is the
 *      stained-glass failure by another route. So the accent regions are
 *      connected-component labelled and only a component that is both large
 *      (>= ACCENT_MASS_AREA cells) and genuinely thick (it has interior cells,
 *      i.e. cells whose whole 3x3 is the same component) earns a division.
 *      A two-cell claw, a brow, a one-cell rim stripe and an eye all fail that
 *      test and are left alone. Here the ink goes on the *body* side instead,
 *      because eating a cell off a horn changes the horn and eating a cell off
 *      the shoulder behind it changes nothing.
 *
 * What is deliberately NOT inked: LIGHT against BASE. A belly, a throat, a pale
 * muzzle is a change of material on one continuous surface, not a separate
 * part, and lining it is what would make the pass look like a colouring book.
 *
 * Eight-connected, so a boundary that steps diagonally comes out as one
 * unbroken line rather than a dotted one.
 */
const ACCENT_MASS_AREA = 64;
const ACCENT_MASS_INTERIOR = 12;
/**
 * The smallest run of recessed cells that counts as a division rather than a
 * dot.
 *
 * A seam is a line: `limbFront` lays a two-cell-thick ring, `seam` and
 * `crease` lay a single-cell stroke, and either way it is tens of cells long
 * and connected. A `speckle` call in SHADE or DEEP -- and there are several on
 * the roster, painting a flank at ten per cent density -- is hundreds of
 * one-cell islands. Without this floor every one of them would come out as a
 * hard black fleck, which is the dots complaint returning by the back door.
 */
const RECESS_RUN_AREA = 10;
/**
 * How much of a recess component may be interior before it stops being a seam.
 *
 * The rule that changed with FORM. Hard ink is now reserved for genuine
 * OCCLUSION -- one part passing in front of another -- and not charged against
 * every dark patch on the creature.
 *
 * A seam is a stroke: `limbFront` lays a two-cell ring, `seamPath` and `crease`
 * lay a single-cell run, and neither has any cell whose whole 3x3 is also seam.
 * A core shadow is a patch, and a patch is mostly interior. So a DEEP stroke
 * still inks -- that is what DEEP is for and it is how a near limb reads
 * against the chest it crosses -- and a DEEP patch does not, because a dark
 * region on a continuous surface is a shadow and a shadow is not a division.
 *
 * SHADE is exempt from the test in both directions: it is a declaration that
 * this is a separate part set behind another, so it inks at any shape. That is
 * its entire job and the only reason to reach for it.
 */
const RECESS_SOLID_RATIO = 0.35;

function internalEdges(mask: Mask, intent: Uint8Array): void {
  const W = mask.w, H = mask.h, N = W * H;
  const part = new Uint8Array(N);
  for (let i = 0; i < N; i++) part[i] = partOf(intent[i]!);

  /**
   * Connected-component pass. Both groups are labelled the same way and differ
   * only in what they have to prove: a recess has to be a run, an accent has
   * to be a mass. An iterative stack rather than recursion, because a crest
   * can be two thousand cells.
   */
  const eligible = new Uint8Array(N);
  const seen = new Uint8Array(N);
  const stack: number[] = [];
  const comp: number[] = [];
  const label = (group: number, keeps: (c: number[]) => boolean): void => {
    for (let s = 0; s < N; s++) {
      if (part[s] !== group || seen[s]) continue;
      comp.length = 0;
      stack.length = 0;
      stack.push(s);
      seen[s] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        comp.push(i);
        const x = i % W, y = (i / W) | 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const j = ny * W + nx;
            if (seen[j] || part[j] !== group) continue;
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
      if (keeps(comp)) for (const i of comp) eligible[i] = 1;
    }
  };

  label(PART_RECESS, (c) => {
    if (c.length < RECESS_RUN_AREA) return false;
    // A far part inks whatever shape it is; a hand-drawn dark only inks if it
    // is a stroke rather than a patch. See RECESS_SOLID_RATIO.
    let solidCells = 0;
    for (const i of c) {
      if (intent[i] === SHADE) return true;
      const x = i % W, y = (i / W) | 0;
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      if (part[i - W - 1] === PART_RECESS && part[i - W] === PART_RECESS && part[i - W + 1] === PART_RECESS
        && part[i - 1] === PART_RECESS && part[i + 1] === PART_RECESS
        && part[i + W - 1] === PART_RECESS && part[i + W] === PART_RECESS && part[i + W + 1] === PART_RECESS) {
        solidCells++;
      }
    }
    return solidCells < c.length * RECESS_SOLID_RATIO;
  });
  label(PART_ACCENT, (c) => {
    if (c.length < ACCENT_MASS_AREA) return false;
    // Thickness: does the component contain cells whose entire 3x3 is also in
    // it? A one-cell stripe two hundred cells long never will, and that is
    // precisely the shape that must not be ringed.
    let interior = 0;
    for (const i of c) {
      const x = i % W, y = (i / W) | 0;
      if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
      if (part[i - W - 1] === PART_ACCENT && part[i - W] === PART_ACCENT && part[i - W + 1] === PART_ACCENT
        && part[i - 1] === PART_ACCENT && part[i + 1] === PART_ACCENT
        && part[i + W - 1] === PART_ACCENT && part[i + W] === PART_ACCENT && part[i + W + 1] === PART_ACCENT) {
        if (++interior >= ACCENT_MASS_INTERIOR) return true;
      }
    }
    return false;
  });

  // Collected first, written after, so a cell that has just become ink cannot
  // seed a second line against its own neighbour and let the division creep.
  const ink: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const g = part[i]!;
      if (g === PART_NONE) continue;
      // A recessed cell inks itself; a body cell is inked by the accent mass
      // in front of it. Either way the check below has to find a qualifying
      // neighbour of the other kind.
      if (g === PART_RECESS && !eligible[i]) continue;
      let hit = false;
      for (let dy = -1; dy <= 1 && !hit; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          const ng = part[j]!;
          if (ng === PART_NONE) continue;
          if (g === PART_RECESS && ng === PART_BODY) { hit = true; break; }
          if (g !== PART_ACCENT && ng === PART_ACCENT && eligible[j]) { hit = true; break; }
        }
      }
      if (hit) ink.push(i);
    }
  }
  for (const i of ink) mask.data[i] = EDGE;
}

/*
 * INNER RIM LIGHT -- REMOVED.
 *
 * There used to be a pass here that walked the up-left silhouette of every mass
 * and promoted it to SPEC, with a half-step behind it, on the grounds that it
 * separated the creature from the floor and was "the difference between a flat
 * cutout and something with a surface".
 *
 * It was measured. It promoted every lit-edge body cell to SPEC wherever the
 * body did not continue up, left or up-left -- the entire upper-left contour of
 * every mass and every protrusion, regardless of thickness or material. Sitting
 * directly on OUTLINE_LIT, the upper-left border of every creature ran
 * OUTLINE_LIT -> SPEC -> HILIGHT -> LIGHT -> BASE in about three reference
 * pixels: a smooth airbrushed gradient wrapped round the whole silhouette.
 * SPEC + HILIGHT + OUTLINE_LIT came to 22.3% of an average sprite, of which
 * 15.8% was this halo. It is most of what made the roster look like coloured-in
 * balloons, and the player named it before we measured it.
 *
 * It is not coming back as a weaker version either. Under a lamp with a z
 * component the lit contour is edge-on to the viewer and is genuinely NOT the
 * bright part of the mass -- the shading pass now gives it BASE on purpose, and
 * any rim pass at all would put the brightest tone straight back on the one
 * place the physics says it does not belong. Separation from the background is
 * the outline's job, and OUTLINE_LIT does it.
 *
 * Reflected light on the shadow contour is a real effect, but it is one cell
 * on a mass forty reference pixels across on a wet or icy species, so it is
 * hand-placed by the author who wants it, not generated for everybody.
 */

/**
 * Wrap the whole silhouette in a hard outline, two cells thick.
 *
 * Two rather than one, and worth being deliberate about. One cell would be
 * half the ink the silhouette carries today and the creature would read as
 * spindly against a world drawn on a coarser grid. Two keeps the border the
 * same physical weight it has always had, while the finer grid lets it follow
 * the actual contour instead of a staircase of blocks -- so the outline is
 * unchanged in strength and considerably better in shape.
 */
function outline(mask: Mask): void {
  const W = mask.w, H = mask.h;
  const src = mask.data.slice();
  const solid = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const v = src[y * W + x]!;
    return v !== EMPTY && v !== OUTLINE;
  };

  // First ring, eight-connected, so a diagonal step in the silhouette is
  // closed rather than leaking a pinhole of background through the corner.
  const ring: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (solid(x, y)) continue;
      const touching =
        solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1) ||
        solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1);
      if (!touching) continue;
      // The light side of the outline carries some of the body colour, so the
      // silhouette does not read as a uniform marker-pen border.
      const litSide = solid(x + 1, y) || solid(x, y + 1) || solid(x + 1, y + 1);
      const darkSide = solid(x - 1, y) || solid(x, y - 1);
      const v = litSide && !darkSide ? OUTLINE_LIT : OUTLINE;
      mask.set(x, y, v);
      ring.push(x, y, v);
    }
  }

  // Second ring, four-connected only. Eight here would balloon every convex
  // corner into a lump and the creature would come out looking shrink-wrapped.
  for (let i = 0; i < ring.length; i += 3) {
    const x = ring[i]!, y = ring[i + 1]!, v = ring[i + 2]!;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      // Anything already written is either body or first ring or a second-ring
      // cell laid down a moment ago; leaving all three alone is what keeps the
      // border exactly two cells and stops it growing across the loop.
      if (mask.data[ny * W + nx] !== EMPTY) continue;
      mask.set(nx, ny, v);
    }
  }
}

/**
 * Cast shadow.
 *
 * Drawn last and only into empty cells, so it is never outlined. Without it a
 * sprite floats over whatever it is standing on no matter how well it is lit.
 *
 * It used to be one flat ellipse of one opacity, because at two cells to a
 * shading block anything more structured came out as a stack of bars. It is
 * now an umbra with a penumbra around it, thrown down and to the right of the
 * light, with a hard dark core where the feet actually meet the ground -- the
 * three things that separate a cast shadow from a grey oval.
 */
function contactShadow(mask: Mask): void {
  let floor = 0, x0 = mask.w, x1 = 0;
  for (let y = mask.h - 1; y >= 0; y--) {
    let any = false;
    for (let x = 0; x < mask.w; x++) {
      const v = mask.get(x, y);
      if (v === EMPTY || v === OUTLINE || v === SHADOW) continue;
      any = true;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
    }
    if (any) { floor = y; break; }
  }
  if (x1 <= x0) return;

  // Thrown away from the light, which is up and to the left.
  const cx = (x0 + x1) / 2 + (x1 - x0) * 0.06;
  const rx = (x1 - x0) * 0.56;
  const ry = Math.max(6, rx * 0.18);
  const cy = floor - 1;
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (d > 1) continue;
      // The penumbra frays into the floor rather than ending on a hard arc,
      // which is what a soft light does and what a single ellipse never did.
      if (d > 0.72 && !ditherOn(Math.round(cx + x), Math.round(cy + y), (1 - d) / 0.28)) continue;
      mask.under(Math.round(cx + x), Math.round(cy + y), d < 0.42 ? SHADOW_CORE : SHADOW);
    }
  }
}

/* --------------------------------------------------------------- eyes */

interface EyeSpot {
  x: number; y: number; spread: number; size: number; angry: boolean;
  /**
   * False for a face anchor that carries no eyes of its own.
   *
   * A hand-authored design draws its own eyes -- eye shape is most of a
   * creature's character and the stock pair cannot carry six different ones --
   * but the later passes still need to know where the face *is*, or the type
   * character pass hangs leaf blades off the muzzle and the marking pass rules
   * a stripe down the middle of it. So a design registers the anchor without
   * asking for eyes, and `drawEyes` skips it.
   */
  draw: boolean;
}

/**
 * Eyes are the one feature a viewer reads first and forgives least, so they are
 * recorded by the plans and drawn at the very end, after the light has run. A
 * lit eye is a wrong eye: the glint has to be the brightest thing on the
 * creature no matter which way its head is turned.
 *
 * Coordinates are recorded in mask cells, not pen units, because the fit pass
 * moves them and the fit pass works in cells.
 */
let pendingEyes: EyeSpot[] = [];

function eyes(p: Pen, cx: number, cy: number, spread: number, size: number, angry: boolean): void {
  pendingEyes.push({
    x: Math.round(cx * p.u), y: Math.round(cy * p.u),
    spread: Math.round(spread * p.u), size: Math.round(size * p.u), angry, draw: true,
  });
}

/**
 * Draw a recorded pair -- the stock eye, for the legacy body plans.
 *
 * This used to draw its own ellipses, in step with the old procedural `eye()`,
 * and it inherited the same defect: a ring computed at a three-cell radius is
 * a lumpy octagon, and the two eyes of a pair sit at different x and so came
 * out as two different lumpy octagons. It now blits the same hand-authored
 * stamps the parts library uses, so a creature that falls through to a body
 * plan gets exactly the eye a hand-authored one gets.
 *
 * The pair is placed the way `eyeRow` places one: both eyes on a single
 * integer row, symmetric about an integer centre, the right one an exact
 * mirror of the left. A body plan cannot produce a crooked pair any more.
 */
function drawEyes(mask: Mask, spots: EyeSpot[]): void {
  for (const s of spots) {
    if (!s.draw) continue;
    // The plans speak in a 0..n "size"; the library speaks in authored stamps.
    // A plan that asks for a big eye is asking for the thing the player told
    // us to stop doing, so the ceiling is the library's own ceiling.
    const size: EyeSize = s.size <= 3 ? 's' : s.size <= 5 ? 'm' : 'l';
    const style: EyeStyle = s.angry ? 'angry' : 'round';
    const cy = Math.round(s.y), cx = Math.round(s.x), sp = Math.round(s.spread);
    const st = eyeStampOf(style, size);
    blitEyeStamp(mask, st, cx - sp, cy, { mirror: false });
    blitEyeStamp(mask, st, cx + sp, cy, { mirror: true });
  }
}

/* ---------------------------------------------------------- body plans */

interface PlanCtx {
  /** Addressed in plan units. See `Pen`: the numbers below are the ones these
   *  animals were tuned with and the pen resolves them onto the finer cell. */
  m: Pen;
  rng: Rng;
  /** 0..1 size, mapped to a pixel radius by each plan. */
  s: number;
  back: boolean;
  ground: number;
  cx: number;
}

/**
 * A three-quarter-front four-legged animal.
 *
 * The trap here is composing a quadruped like a biped -- head stacked directly
 * on a vertical body -- which reads as a standing doll. The fix is a body that
 * is wider than it is tall, a head set forward and to one side rather than on
 * top, a visible rear pair of legs drawn darker and further back, and a tail
 * that breaks the silhouette. Younger species get a proportionally bigger head.
 */
function planQuadruped(c: PlanCtx): void {
  const { m, rng, s, back, ground, cx } = c;

  // Quadruped is the most-used plan, so it carries the most variation: without
  // it, seven different species would share one silhouette. Every roll is
  // seeded on the species id, so a given creature always looks the same.
  const earStyle = rng.below(4);      // 0 pointed, 1 long, 2 round, 3 frilled
  const tailStyle = rng.below(4);     // 0 short, 1 long, 2 bushy, 3 stub
  const horned = rng.chance(30);
  const longBody = rng.chance(40);
  const tallLegs = rng.chance(35);

  const bodyRx = Math.round((longBody ? 13 : 11) + s * 11);
  const bodyRy = Math.round((longBody ? 6 : 8) + s * 6);
  const legLen = Math.round((tallLegs ? 10 : 7) + s * 8);
  const bodyCy = ground - legLen - bodyRy + 3;
  const legW = Math.round(4 + s * 3);

  // Cub proportions: small species get a head nearly as wide as the body.
  const headR = Math.round(7 + s * 5 + (1 - s) * 3);
  const headCx = cx - Math.round(bodyRx * 0.42);
  const headCy = bodyCy - bodyRy - Math.round(headR * 0.45);

  // Rear legs go down first and darker, so they sit behind the body. They bend
  // at the hock rather than dropping straight, which is the whole difference
  // between a leg and a table leg.
  for (const side of [-1, 1]) {
    const lx = cx + side * Math.round(bodyRx * 0.62) + Math.round(bodyRx * 0.22);
    const hockY = bodyCy + Math.round((ground - bodyCy) * 0.52);
    m.limb(lx, bodyCy, lx + side, hockY, legW + 1, legW, SHADE);
    m.limb(lx + side, hockY, lx + side, ground - 2, legW, legW - 1, SHADE);
    joint(m, lx + side, hockY, Math.round(legW * 0.6));
    foot(m, lx + side, ground, Math.round(legW * 0.8), true);
  }

  m.ellipse(cx, bodyCy, bodyRx, bodyRy, BASE);
  // Haunch, drawn in front of the barrel so the rump carries its own mass and
  // does not merge into one long sausage.
  m.ellipseFront(cx + Math.round(bodyRx * 0.55), bodyCy - 1,
    Math.round(bodyRx * 0.45), Math.round(bodyRy * 0.95), BASE);
  // Scapula and the crease behind the ribs. One cell each and both of them
  // sweeping rather than straight, because a straight line across a barrel is
  // a strap and a curved one is an animal.
  m.line(cx - Math.round(bodyRx * 0.5), bodyCy - Math.round(bodyRy * 0.55),
    cx - Math.round(bodyRx * 0.15), bodyCy + Math.round(bodyRy * 0.35), DEEP);
  m.line(cx - Math.round(bodyRx * 0.5) - 0.5, bodyCy - Math.round(bodyRy * 0.55),
    cx - Math.round(bodyRx * 0.15) - 0.5, bodyCy + Math.round(bodyRy * 0.35), LIGHT);
  m.line(cx + Math.round(bodyRx * 0.18), bodyCy - Math.round(bodyRy * 0.7),
    cx + Math.round(bodyRx * 0.08), bodyCy + Math.round(bodyRy * 0.5), SHADE);

  // Front legs on top of the body, planted under the chest.
  for (const side of [-1, 1]) {
    const lx = cx - Math.round(bodyRx * 0.5) + side * Math.round(3 + s * 4);
    const kneeY = bodyCy + Math.round((ground - bodyCy) * 0.55);
    m.limbFront(lx, bodyCy + Math.round(bodyRy * 0.3), lx, kneeY, legW + 1, legW, BASE);
    m.limb(lx, kneeY, lx, ground - 2, legW, legW - 1, BASE);
    joint(m, lx, kneeY, Math.round(legW * 0.6));
    foot(m, lx, ground, Math.round(legW * 0.8), side > 0);
  }

  // Tail.
  const tailRootX = cx + bodyRx - 3;
  switch (tailStyle) {
    case 0: { // short upright flick
      const tx = tailRootX + Math.round(4 + s * 3), ty = bodyCy - Math.round(7 + s * 5);
      m.limbFront(tailRootX, bodyCy - 2, tx, ty, Math.round(4 + s * 2), 2, ACCENT);
      segments(m, tailRootX, bodyCy - 2, tx, ty, 2, Math.round(2 + s), ACCENT_DARK);
      break;
    }
    case 1: { // long sweeping tail
      const tx = tailRootX + Math.round(8 + s * 8), ty = bodyCy - Math.round(10 + s * 9);
      m.limbFront(tailRootX, bodyCy - 1, tx, ty, Math.round(4 + s * 3), 2, ACCENT);
      segments(m, tailRootX, bodyCy - 1, tx, ty, 4, Math.round(2 + s * 2), ACCENT_DARK);
      m.ellipse(tx, ty, 2, 2, ACCENT_LIT);
      break;
    }
    case 2: { // bushy: a limb with a mass on the end
      m.limbFront(tailRootX, bodyCy - 1, tailRootX + Math.round(5 + s * 4), bodyCy - Math.round(6 + s * 5),
        Math.round(3 + s * 2), 2, ACCENT);
      m.ellipseFront(tailRootX + Math.round(7 + s * 6), bodyCy - Math.round(8 + s * 6),
        Math.round(5 + s * 4), Math.round(5 + s * 4), ACCENT);
      // A pale tip, which every bushy tail in the reference art has.
      m.ellipse(tailRootX + Math.round(6 + s * 5), bodyCy - Math.round(10 + s * 7),
        Math.round(2 + s * 2), Math.round(2 + s * 2), ACCENT_LIT);
      break;
    }
    default: // stub
      m.ellipseFront(tailRootX + 3, bodyCy - 2, Math.round(3 + s * 2), Math.round(3 + s * 2), ACCENT);
  }

  // Head, set forward of the shoulders and seated with a seam so it is not
  // welded to the chest.
  m.ellipseFront(headCx, headCy, headR, Math.round(headR * 0.92), BASE);
  // Cheek line, running from under the eye back to the jaw hinge.
  for (let i = 0; i <= Math.round(headR * 0.9); i++) {
    m.over(headCx + i, headCy + Math.round(headR * 0.4) + Math.round(i * 0.28), DEEP);
  }
  muzzle(m, headCx - Math.round(headR * 0.6), headCy + Math.round(headR * 0.28),
    Math.round(headR * 0.5), Math.round(headR * 0.38), -1, !back);

  // Ears, each with a coloured inside.
  for (const side of [-1, 1]) {
    const ex = headCx + side * Math.round(headR * 0.62);
    const tone = side < 0 ? BASE : SHADE;
    switch (earStyle) {
      case 0: { // pointed
        const tx = ex + side * 2, ty = headCy - headR - Math.round(3 + s * 4);
        m.limbFront(ex, headCy - Math.round(headR * 0.7), tx, ty, Math.round(4 + s * 2), 2, tone);
        m.limb(ex, headCy - Math.round(headR * 0.5), tx, ty + 3, 1, 1, INNER);
        break;
      }
      case 1: { // long and swept back
        const tx = ex + side * Math.round(5 + s * 4), ty = headCy - headR - Math.round(6 + s * 6);
        m.limbFront(ex, headCy - Math.round(headR * 0.6), tx, ty, Math.round(4 + s * 2), 2, tone);
        m.limb(ex, headCy - Math.round(headR * 0.4), tx, ty + 3, 1, 1, INNER);
        break;
      }
      case 2: { // round
        const r = Math.round(3 + s * 3);
        m.ellipseFront(ex + side * 2, headCy - Math.round(headR * 0.85), r, r, tone);
        m.ellipse(ex + side * 2, headCy - Math.round(headR * 0.85), Math.max(1, r - 2), Math.max(1, r - 1), INNER);
        break;
      }
      default: // frilled: a fan of short spines
        for (let i = -1; i <= 1; i++) {
          m.limb(ex, headCy - Math.round(headR * 0.6),
            ex + side * (3 + i), headCy - headR - Math.round(2 + s * 3), 3, 1, tone);
        }
        m.limb(ex, headCy - Math.round(headR * 0.6), ex + side * 3, headCy - headR - Math.round(1 + s * 2), 1, 1, INNER);
    }
  }

  if (horned) {
    for (const side of [-1, 1]) {
      const bx = headCx + side * Math.round(headR * 0.35);
      const by = headCy - Math.round(headR * 0.8);
      const tx = headCx + side * Math.round(headR * 0.5);
      const ty = headCy - headR - Math.round(4 + s * 4);
      m.limbFront(bx, by, tx, ty, 3, 1, ACCENT_DARK);
      m.limb(bx - side, by, tx - side, ty + 1, 1, 1, ACCENT_LIT);
    }
  }

  if (!back) eyes(m, headCx, headCy - 1, Math.round(headR * 0.42), s > 0.45 ? 3 : 2, s > 0.55);
}

/**
 * An upright animal, not a person.
 *
 * The difference is all posture: digitigrade legs that bend backwards at the
 * hock, shoulders noticeably wider than the hips, a head carried forward of the
 * spine with a snout, and a counterbalancing tail. Straight legs and a centred
 * ball head read as a doll no matter how good the colours are.
 */
function planBiped(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;

  const shoulderW = Math.round(9 + s * 8);
  const hipW = Math.round(6 + s * 5);
  const torsoH = Math.round(13 + s * 11);
  const legLen = Math.round(11 + s * 10);
  const hipY = ground - legLen;
  const shoulderY = hipY - torsoH;

  // Tail first, so the body overlaps its root.
  const tailX = cx + hipW + Math.round(9 + s * 9);
  const tailY = hipY + Math.round(4 + s * 3);
  m.limb(cx + Math.round(hipW * 0.6), hipY, tailX, tailY, Math.round(5 + s * 4), 2, ACCENT);
  segments(m, cx + Math.round(hipW * 0.6), hipY, tailX, tailY, 4, Math.round(2 + s * 2), ACCENT_DARK);

  // Digitigrade legs: thigh forward, shin back, foot forward again.
  for (const side of [-1, 1]) {
    const lx = cx + side * Math.round(hipW * 0.7);
    const kneeX = lx - Math.round(2 + s * 2);
    const kneeY = hipY + Math.round(legLen * 0.42);
    const hockX = lx + Math.round(2 + s * 2);
    const hockY = hipY + Math.round(legLen * 0.75);
    m.limbFront(lx, hipY, kneeX, kneeY, Math.round(6 + s * 4), Math.round(5 + s * 3), BASE);
    m.limb(kneeX, kneeY, hockX, hockY, Math.round(5 + s * 3), Math.round(4 + s * 2), BASE);
    m.limb(hockX, hockY, hockX - Math.round(1 + s), ground - 2, Math.round(4 + s * 2), Math.round(4 + s * 2), SHADE);
    joint(m, kneeX, kneeY, Math.round(3 + s * 2));
    joint(m, hockX, hockY, Math.round(2 + s * 2));
    // Thigh sweep and calf bulge: a lit run down the front of the femur and a
    // dark one behind the shin, so the leg has a near face and a far one.
    m.line(lx - side, hipY + 2, kneeX - Math.round(1 + s), kneeY - 1, LIGHT);
    m.line(lx + side * Math.round(2 + s * 2), hipY + 3, kneeX + Math.round(1 + s), kneeY - 1, DEEP);
    m.line(kneeX + Math.round(1 + s), kneeY + 2, hockX + Math.round(1 + s), hockY - 1, DEEP);
    foot(m, hockX - Math.round(1 + s), ground, Math.round(4 + s * 2), side > 0);
  }

  // Wedge torso: wide at the shoulders, narrow at the hips.
  for (let y = shoulderY; y <= hipY; y++) {
    const t = (y - shoulderY) / Math.max(1, hipY - shoulderY);
    const w = Math.round(shoulderW + (hipW - shoulderW) * t);
    m.box(cx - w, y, cx + w, y, BASE);
  }
  // Belly plate, with segment lines across it: a bare torso reads as a bib.
  m.ellipse(cx, hipY - Math.round(torsoH * 0.35),
    Math.round(hipW * 0.9), Math.round(torsoH * 0.35), LIGHT);
  for (let i = 1; i <= 3; i++) {
    const py = hipY - Math.round(torsoH * 0.62) + Math.round(torsoH * 0.2 * i);
    const half = Math.round(hipW * 0.55);
    for (let d = -half; d <= half; d++) m.over(cx + d, py + Math.round(Math.abs(d) * 0.2), DEEP);
  }
  // Pectoral seam, so the chest is not one plane.
  for (let d = -Math.round(shoulderW * 0.7); d <= Math.round(shoulderW * 0.7); d++) {
    m.over(cx + d, shoulderY + Math.round(torsoH * 0.28) + Math.round(Math.abs(d) * 0.35), DEEP);
  }

  // Arms cocked, elbows back: a ready stance, not a T-pose.
  for (const side of [-1, 1]) {
    const ax = cx + side * shoulderW;
    const elbowX = ax + side * Math.round(4 + s * 4);
    const elbowY = shoulderY + Math.round(torsoH * 0.45);
    const handX = ax + side * Math.round(2 + s * 2);
    const handY = shoulderY + Math.round(torsoH * 0.2);
    m.limbFront(ax, shoulderY + 2, elbowX, elbowY, Math.round(5 + s * 4), Math.round(4 + s * 3), BASE);
    m.limb(elbowX, elbowY, handX, handY, Math.round(4 + s * 3), Math.round(5 + s * 3), BASE);
    joint(m, elbowX, elbowY, Math.round(2 + s * 2));
    // Deltoid cap and the tendon down the back of the upper arm. One cell each,
    // which is the whole reason they can exist: a muscle drawn a unit wide on
    // an arm five units thick is not a muscle, it is a stripe.
    m.line(ax - side, shoulderY + 2, ax + side * Math.round(2 + s * 2), shoulderY + Math.round(torsoH * 0.2), LIGHT);
    m.line(ax + side * Math.round(2 + s * 2), shoulderY + Math.round(torsoH * 0.2),
      elbowX, elbowY - 1, DEEP);
    m.line(ax - side, shoulderY + 3, elbowX - side, elbowY - 1, SHADE);
    // Fist, with knuckle seams and claw tips.
    const fr = Math.round(3 + s * 2);
    m.ellipseFront(handX, handY, fr, fr, ACCENT);
    for (let k = -1; k <= 1; k++) m.over(handX + k * Math.max(1, fr - 1), handY, ACCENT_DARK);
    m.set(handX - side * fr, handY - fr, ACCENT_LIT);
  }

  // Head carried forward of the shoulders.
  const headR = Math.round(6 + s * 4);
  const headCx = cx - Math.round(2 + s * 3);
  const headCy = shoulderY - Math.round(headR * 0.75);
  m.ellipseFront(headCx, headCy, headR, Math.round(headR * 0.9), BASE);
  muzzle(m, headCx - Math.round(headR * 0.75), headCy + Math.round(headR * 0.25),
    Math.round(headR * 0.5), Math.round(headR * 0.38), -1, !back);
  // Jaw line back to the hinge.
  for (let i = 0; i <= headR; i++) {
    m.over(headCx - Math.round(headR * 0.2) + i, headCy + Math.round(headR * 0.5) + Math.round(i * 0.2), DEEP);
  }
  // Swept-back crest with a lit leading edge.
  const crestX = headCx + Math.round(headR * 1.2);
  const crestY = headCy - headR - Math.round(5 + s * 5);
  m.limbFront(headCx + Math.round(headR * 0.3), headCy - headR + 1, crestX, crestY, 5, 1, ACCENT);
  m.limb(headCx + Math.round(headR * 0.3), headCy - headR, crestX - 1, crestY + 1, 1, 1, ACCENT_LIT);

  if (!back) eyes(m, headCx, headCy - 1, Math.round(headR * 0.45), 3, true);
}

/**
 * A heavy, hunched, knuckle-walking build.
 *
 * Reads as a brute because of proportion, not size: enormous shoulders, arms
 * long enough to reach the ground, and a small head sunk between them so there
 * is barely any neck.
 */
function planBrute(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;

  const shoulderW = Math.round(15 + s * 10);
  const hipW = Math.round(11 + s * 7);
  const torsoH = Math.round(15 + s * 10);
  const legLen = Math.round(8 + s * 6);
  const hipY = ground - legLen;
  const shoulderY = hipY - torsoH;

  // Short, thick, wide-set legs.
  for (const side of [-1, 1]) {
    const lx = cx + side * Math.round(hipW * 0.62);
    m.limb(lx, hipY - 2, lx + side * 2, ground - 3, Math.round(10 + s * 5), Math.round(9 + s * 4), BASE);
    foot(m, lx + side * 2, ground, Math.round(5 + s * 2), side > 0);
  }

  // Torso: an inverted wedge, widest at the shoulders.
  for (let y = shoulderY; y <= hipY; y++) {
    const t = (y - shoulderY) / Math.max(1, hipY - shoulderY);
    const w = Math.round(shoulderW + (hipW - shoulderW) * t);
    m.box(cx - w, y, cx + w, y, BASE);
  }
  // Slab plates over the shoulders, with rivets and a lit top edge.
  const plateH = Math.round(4 + s * 3);
  m.box(cx - shoulderW + 1, shoulderY, cx + shoulderW - 1, shoulderY + plateH, ACCENT);
  m.box(cx - shoulderW + 1, shoulderY + plateH, cx + shoulderW - 1, shoulderY + plateH, ACCENT_DARK);
  for (let x = cx - shoulderW + 3; x <= cx + shoulderW - 3; x += 5) {
    m.over(x, shoulderY + 2, ACCENT_LIT);
  }
  m.ellipse(cx, hipY - Math.round(torsoH * 0.3), Math.round(hipW * 0.8), Math.round(torsoH * 0.3), LIGHT);
  // Ribs across the flanks. Two, stopping well short of the sides: a crease
  // that runs the full width of a torso reads as a painted stripe.
  for (let i = 1; i <= 2; i++) {
    const py = shoulderY + plateH + Math.round(torsoH * 0.14 * i);
    const half = Math.round(shoulderW * 0.6);
    for (let d = -half; d <= half; d++) m.over(cx + d, py + Math.round(Math.abs(d) * 0.2), DEEP);
  }

  // Long arms reaching the ground, knuckles planted.
  for (const side of [-1, 1]) {
    const ax = cx + side * (shoulderW - 1);
    const elbowX = ax + side * Math.round(4 + s * 4);
    m.limbFront(ax, shoulderY + 3, elbowX, hipY, Math.round(9 + s * 5), Math.round(8 + s * 4), BASE);
    m.limb(elbowX, hipY, elbowX + side, ground - 3, Math.round(8 + s * 4), Math.round(7 + s * 3), SHADE);
    joint(m, elbowX, hipY, Math.round(4 + s * 2));
    // A brute's arms are the point of it, so they get the most anatomy: a lit
    // bicep swelling on the near face, a dark tricep behind it, and a pair of
    // forearm tendons running down to the knuckles. All one cell wide.
    m.line(ax - side * 2, shoulderY + 5, elbowX - side * 2, hipY - 2, LIGHT);
    m.line(ax + side * Math.round(4 + s * 2), shoulderY + 6, elbowX + side * Math.round(3 + s * 2), hipY - 2, DEEP);
    for (const k of [-2, 1]) {
      m.line(elbowX + k, hipY + 2, elbowX + side + k, ground - 5, k < 0 ? LIGHT : DEEP);
    }
    // Knuckles: three lobes with dark gaps, then claws on the ground.
    const kr = Math.round(5 + s * 3);
    m.ellipseFront(elbowX + side, ground - 3, kr, Math.round(kr * 0.8), ACCENT);
    for (const k of [-1, 1]) m.over(elbowX + side + k * Math.max(1, kr - 2), ground - 3, ACCENT_DARK);
    for (const k of [-1, 0, 1]) m.set(elbowX + side + k * Math.max(1, kr - 2), ground - 1, ACCENT_LIT);
  }

  // Small head, sunk between the shoulders.
  const headR = Math.round(6 + s * 3);
  const headCy = shoulderY - Math.round(headR * 0.35);
  m.ellipseFront(cx, headCy, Math.round(headR * 1.1), Math.round(headR * 0.85), BASE);
  // Heavy brow, then a jaw with tusks showing under it.
  m.box(cx - headR, headCy - Math.round(headR * 0.4), cx + headR, headCy - Math.round(headR * 0.15), SHADE);
  for (const side of [-1, 1]) {
    m.limb(cx + side * headR, headCy - 2,
      cx + side * (headR + Math.round(4 + s * 4)), headCy - Math.round(7 + s * 5), 4, 1, ACCENT);
    m.limb(cx + side * headR - side, headCy - 2,
      cx + side * (headR + Math.round(3 + s * 3)) - side, headCy - Math.round(6 + s * 4), 1, 1, ACCENT_LIT);
  }
  if (!back) {
    const my = headCy + Math.round(headR * 0.5);
    m.box(cx - Math.round(headR * 0.6), my, cx + Math.round(headR * 0.6), my, INNER);
    for (const k of [-1, 1]) m.set(cx + k * Math.round(headR * 0.4), my - 1, ACCENT_LIT);
    eyes(m, cx, headCy + 1, Math.round(headR * 0.5), 2, true);
  }
}

function planCritter(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const bodyR = Math.round(8 + s * 8);
  const bodyCy = ground - bodyR - 3;
  m.ellipse(cx, bodyCy, bodyR, Math.round(bodyR * 0.9), BASE);
  m.ellipse(cx, bodyCy + Math.round(bodyR * 0.3), Math.round(bodyR * 0.55), Math.round(bodyR * 0.45), LIGHT);

  for (const side of [-1, 1]) {
    const lx = cx + side * Math.round(bodyR * 0.5);
    m.limbFront(lx, bodyCy + bodyR - 3, lx, ground - 2, 4, 4, BASE);
    foot(m, lx, ground, 3, side > 0);
  }

  const headR = Math.round(7 + s * 6);
  const headCy = bodyCy - bodyR - headR + Math.round(5 + s * 3);
  m.ellipseFront(cx, headCy, headR, Math.round(headR * 0.95), BASE);

  // Oversized ears: the whole read of a small critter, so they get a proper
  // inner shell rather than a stripe of accent.
  for (const side of [-1, 1]) {
    const ex = cx + side * Math.round(headR * 0.65) + side * 2;
    const ey = headCy - headR - Math.round(2 + s * 4);
    m.ellipseFront(ex, ey, Math.round(3 + s * 2), Math.round(5 + s * 4), BASE);
    m.ellipse(ex, ey, Math.max(1, Math.round(1 + s)), Math.round(3 + s * 2), INNER);
  }

  const tx = cx + bodyR + Math.round(8 + s * 6), ty = bodyCy - Math.round(4 + s * 4);
  m.limbFront(cx + bodyR - 2, bodyCy, tx, ty, 3, 2, ACCENT);
  m.ellipse(tx, ty, 2, 2, ACCENT_LIT);

  if (!back) {
    muzzle(m, cx, headCy + Math.round(headR * 0.45), Math.round(headR * 0.4), Math.round(headR * 0.3), -1, true);
    eyes(m, cx, headCy, Math.round(headR * 0.42), 3, false);
  }
}

function planBird(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const bodyRx = Math.round(7 + s * 8);
  const bodyRy = Math.round(9 + s * 9);
  const legLen = Math.round(5 + s * 7);
  const bodyCy = ground - legLen - bodyRy + 2;

  // Scaled legs: rings up the shank and three splayed toes on the ground.
  for (const side of [-1, 1]) {
    const lx = cx + side * 3;
    m.limb(lx, bodyCy + bodyRy - 2, lx, ground - 1, 2, 2, ACCENT_DARK);
    for (let k = 2; k < legLen; k += 2) m.over(lx, ground - 1 - k, ACCENT);
    for (const t of [-2, 0, 2]) {
      m.limb(lx, ground - 1, lx + t, ground, 1, 1, ACCENT_DARK);
      m.set(lx + t, ground, ACCENT_LIT);
    }
  }

  m.ellipse(cx, bodyCy, bodyRx, bodyRy, BASE);
  m.ellipse(cx, bodyCy + Math.round(bodyRy * 0.35), Math.round(bodyRx * 0.6), Math.round(bodyRy * 0.4), LIGHT);

  // Wings sweeping back, with primaries split out along the trailing edge.
  for (const side of [-1, 1]) {
    const wx = cx + side * bodyRx;
    const tipX = wx + side * Math.round(6 + s * 9);
    const tipY = bodyCy + Math.round(bodyRy * 0.6);
    const rootY = bodyCy - Math.round(bodyRy * 0.4);
    m.limbFront(wx, rootY, tipX, tipY,
      Math.round(6 + s * 5), Math.round(3 + s * 3), back ? BASE : ACCENT);
    rays(m, wx, bodyCy - Math.round(bodyRy * 0.3), tipX, tipY, side * 4, 8, 4, ACCENT_DARK);
    m.limb(wx, rootY, tipX, tipY - 2, 1, 1, ACCENT_LIT);

    // Coverts: the shorter layer of feathers lying over the root of the wing.
    // Drawn as the *seam* it makes rather than as a second mass -- a lit
    // trailing edge with its own shadow immediately under it. Laying an actual
    // slab of feathers over the wing was the obvious approach and it swallowed
    // the wing whole on every species whose accent is near-black, which is
    // most of them. Three cells of seam say the same thing and cost nothing.
    const covX = wx + Math.round((tipX - wx) * 0.52);
    const covY = rootY + Math.round((tipY - rootY) * 0.5);
    m.line(wx, rootY + 1, covX, covY, ACCENT_LIT);
    m.line(wx, rootY + 1.5, covX, covY + 0.5, ACCENT_DARK);
    m.line(wx, rootY + 2, covX, covY + 1, DEEP);
  }

  // Tail, split into feathers.
  m.limbFront(cx, bodyCy + bodyRy - 3, cx, ground - 2, Math.round(6 + s * 4), Math.round(4 + s * 3), ACCENT);
  rays(m, cx, bodyCy + bodyRy - 3, cx, ground - 2, Math.round(6 + s * 3), 0, 3, ACCENT_DARK);

  const headR = Math.round(5 + s * 4);
  const headCy = bodyCy - bodyRy - headR + 3;
  m.ellipseFront(cx, headCy, headR, headR, BASE);
  if (s > 0.4) {
    const crestX = cx - Math.round(3 + s * 4), crestY = headCy - headR - Math.round(4 + s * 4);
    m.limbFront(cx - 1, headCy - headR + 1, crestX, crestY, 3, 1, ACCENT);
    m.limb(cx - 1, headCy - headR, crestX, crestY + 1, 1, 1, ACCENT_LIT);
  }
  if (!back) {
    // Beak: an upper and a lower mandible with a hard line between them, which
    // is the difference between a beak and a traffic cone.
    const by = headCy + headR + Math.round(2 + s * 2);
    m.limbFront(cx, headCy + 1, cx, by, 4, 1, ACCENT_DARK);
    m.over(cx - 1, headCy + Math.round(headR * 0.7), ACCENT_LIT);
    for (let k = 1; k < Math.round(3 + s * 2); k++) m.over(cx, headCy + 2 + k, INNER);
    eyes(m, cx, headCy - 1, Math.round(headR * 0.5), 2, s > 0.4);
  }
}

function planGrub(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const segCount = 4;
  const rx = Math.round(6 + s * 6);
  const ry = Math.round(5 + s * 5);
  const cy = ground - ry - 1;
  const startX = cx - Math.round((segCount - 1) * rx * 0.55);
  for (let i = 0; i < segCount; i++) {
    const t = i / (segCount - 1);
    const sx = startX + Math.round(i * rx * 1.1);
    const r = Math.round(rx * (0.6 + 0.4 * (1 - Math.abs(t - 0.35))));
    // Each segment drawn in front of the last, so the body reads as rings
    // rather than as one extruded tube.
    m.ellipseFront(sx, cy, Math.max(2, Math.round(r * 0.75)), ry, i % 2 === 0 ? BASE : ACCENT);
    // Bristles and a proleg under each ring.
    m.limb(sx, cy - ry, sx - 2, cy - ry - Math.round(3 + s * 4), 2, 1, ACCENT_DARK);
    m.limb(sx, cy + Math.round(ry * 0.6), sx - 1, ground, 3, 2, SHADE);
    m.set(sx - 1, ground, ACCENT_LIT);
  }
  const headCx = startX - Math.round(rx * 0.4);
  m.ellipseFront(headCx, cy, Math.round(rx * 0.8), Math.round(ry * 1.05), BASE);
  if (!back) {
    // Mandibles, which is most of what makes a grub read as an animal.
    for (const side of [-1, 1]) {
      m.limb(headCx - Math.round(rx * 0.5), cy + 1,
        headCx - Math.round(rx * 0.9), cy + 1 + side * 2, 2, 1, ACCENT_DARK);
    }
    m.over(headCx - Math.round(rx * 0.4), cy + 2, INNER);
    eyes(m, headCx, cy - 1, 2, 2, false);
  }
}

function planArachnid(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const abdRx = Math.round(9 + s * 9);
  const abdRy = Math.round(8 + s * 8);
  const legSpan = Math.round(12 + s * 12);
  const cy = ground - abdRy - Math.round(4 + s * 4);

  // Eight legs, four each side, arched and jointed at the knee.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const spread = 0.5 + i * 0.28;
      const kneeX = cx + side * Math.round(legSpan * spread * 0.6);
      const kneeY = cy - Math.round(6 + s * 5) + i * 2;
      const footX = cx + side * Math.round(legSpan * spread);
      m.limb(cx, cy, kneeX, kneeY, 3, 3, ACCENT_DARK);
      m.limb(kneeX, kneeY, footX, ground, 3, 2, ACCENT_DARK);
      m.set(kneeX, kneeY - 1, ACCENT);
      m.set(footX, ground, ACCENT_LIT);
    }
  }

  const abdCx = cx + Math.round(abdRx * 0.4);
  m.ellipse(abdCx, cy, abdRx, abdRy, BASE);
  // Abdomen plates: arcs across the back, each catching a highlight.
  for (let i = 1; i <= 3; i++) {
    const py = cy - abdRy + Math.round(abdRy * 0.45 * i);
    // Stopping short of the rim keeps the seam off the legs behind it, which
    // otherwise pick up a row of dots each and read as beading.
    const half = Math.round(abdRx * 0.72);
    for (let d = -half; d <= half; d++) {
      m.over(abdCx + d, py + Math.round(Math.abs(d) * 0.18), ACCENT_DARK);
    }
    // A continuous lit ridge riding half a unit above the seam. It used to be
    // laid on every other unit, because a whole unit of highlight above every
    // seam was too much ink -- and every other unit reads as stitching.
    const bow = Math.round(half * 0.18);
    m.line(abdCx - half, py + bow - 0.5, abdCx, py - 0.5, ACCENT_LIT);
    m.line(abdCx, py - 0.5, abdCx + half, py + bow - 0.5, ACCENT_LIT);
  }

  const headR = Math.round(5 + s * 4);
  const headCx = cx - Math.round(abdRx * 0.7);
  m.ellipseFront(headCx, cy, headR, Math.round(headR * 0.9), ACCENT);
  if (!back) {
    // A cluster of small eyes: two large, four small, which is the real
    // arrangement and reads far better than a symmetric grid.
    for (const d of [-2, 2]) m.ellipse(headCx + d, cy - 2, 2, 2, EYE_DARK);
    for (const d of [-3, -1, 1, 3]) m.set(headCx + d, cy + 1, EYE_DARK);
    m.set(headCx - 3, cy - 3, EYE_WHITE);
    // Fangs.
    for (const side of [-1, 1]) {
      m.limb(headCx - 2, cy + 2, headCx - Math.round(4 + s * 3), cy + 4 + side, 2, 1, ACCENT_DARK);
      m.set(headCx - Math.round(4 + s * 3), cy + 4 + side, ACCENT_LIT);
    }
  }
}

function planMineral(c: PlanCtx): void {
  const { m, rng, s, back, ground, cx } = c;
  const chunks = 3 + Math.round(s * 3);
  const R = Math.round(10 + s * 12);
  for (let i = 0; i < chunks; i++) {
    const a = (i / chunks) * Math.PI * 2;
    const dx = Math.round(Math.cos(a) * R * 0.45);
    const dy = Math.round(Math.sin(a) * R * 0.3);
    const r = Math.round(R * (0.42 + rng.next() * 0.3));
    const px = cx + dx, py = Math.round(ground - R * 0.7 + dy);
    m.ellipseFront(px, py, r, Math.round(r * 0.85), i % 2 ? BASE : ACCENT);
    // A chipped facet on the lit shoulder of each chunk: a rock without flats
    // is a potato.
    m.limb(px - Math.round(r * 0.7), py - Math.round(r * 0.4),
      px + Math.round(r * 0.2), py - Math.round(r * 0.8), 1, 1, ACCENT_LIT);
  }
  m.ellipse(cx, ground - Math.round(R * 0.7), R, Math.round(R * 0.8), BASE, true);
  // A quartz seam with a bright core.
  m.limb(cx - Math.round(R * 0.5), ground - Math.round(R * 1.1),
    cx + Math.round(R * 0.4), ground - Math.round(R * 0.4), 3, 2, LIGHT);
  m.limb(cx - Math.round(R * 0.5), ground - Math.round(R * 1.1),
    cx + Math.round(R * 0.4), ground - Math.round(R * 0.4), 1, 1, ACCENT_LIT);
  // Stubby limbs.
  for (const side of [-1, 1]) {
    m.limbFront(cx + side * Math.round(R * 0.7), ground - Math.round(R * 0.5),
      cx + side * Math.round(R * 0.85), ground - 2, 5, 5, ACCENT);
    foot(m, cx + side * Math.round(R * 0.85), ground, 3, side > 0);
  }
  if (!back) eyes(m, cx, ground - Math.round(R * 0.85), Math.round(R * 0.32), 2, true);
}

function planMonolith(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const w = Math.round(9 + s * 8);
  const h = Math.round(22 + s * 22);
  m.box(cx - w, ground - h, cx + w, ground, BASE);
  // Chamfered top corners, with the chamfer catching the light.
  for (let i = 0; i < 4; i++) {
    m.box(cx - w, ground - h + i, cx - w + (3 - i), ground - h + i, EMPTY);
    m.box(cx + w - (3 - i), ground - h + i, cx + w, ground - h + i, EMPTY);
    m.set(cx - w + (4 - i), ground - h + i, ACCENT_LIT);
  }
  // Ore veins with a bright core running through them.
  for (let i = 0; i < 3; i++) {
    const y = ground - h + Math.round(h * (0.25 + i * 0.22));
    m.limb(cx - w + 2, y, cx + w - 2, y + 3, 2, 2, ACCENT);
    m.limb(cx - w + 2, y, cx + w - 2, y + 3, 1, 1, ACCENT_LIT);
  }
  // Rivets down the leading edge: the cheapest possible read of worked stone.
  for (let y = ground - h + 6; y < ground - 4; y += 7) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) m.over(cx - w + 3 + dx, y + dy, ACCENT_DARK);
    }
    m.over(cx - w + 3, y, ACCENT_LIT);
  }
  // Arms.
  for (const side of [-1, 1]) {
    m.limbFront(cx + side * w, ground - Math.round(h * 0.6),
      cx + side * (w + Math.round(4 + s * 4)), ground - Math.round(h * 0.2), 6, 5, BASE);
    for (const k of [-1, 0, 1]) {
      m.set(cx + side * (w + Math.round(5 + s * 4)), ground - Math.round(h * 0.2) + k, ACCENT_LIT);
    }
  }
  if (!back) {
    eyes(m, cx, ground - Math.round(h * 0.78), Math.round(w * 0.42), 2, true);
    m.box(cx - 3, ground - Math.round(h * 0.68), cx + 3, ground - Math.round(h * 0.68), INNER);
  }
}

function planOrb(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const R = Math.round(9 + s * 9);
  const cy = ground - R - Math.round(4 + s * 6);
  m.ellipse(cx, cy, R, R, BASE);
  // An inner shell, so the orb reads as a hollow thing with something in it.
  m.ellipse(cx, cy, Math.round(R * 0.62), Math.round(R * 0.62), LIGHT);
  m.ellipse(cx, cy, Math.round(R * 0.3), Math.round(R * 0.3), ACCENT);
  // Filaments radiating out, each with a bead on the end.
  const spikes = 8;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 + 0.3;
    const len = R + Math.round(5 + s * 8);
    const tipX = cx + Math.round(Math.cos(a) * len);
    const tipY = cy + Math.round(Math.sin(a) * len);
    m.limb(cx + Math.round(Math.cos(a) * R * 0.8), cy + Math.round(Math.sin(a) * R * 0.8),
      tipX, tipY, 3, 1, ACCENT);
    m.set(tipX, tipY, ACCENT_LIT);
  }
  if (!back) {
    eyes(m, cx, cy - 1, Math.round(R * 0.4), 3, false);
    m.box(cx - 2, cy + Math.round(R * 0.45), cx + 2, cy + Math.round(R * 0.45), INNER);
  }
}

function planFish(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const rx = Math.round(12 + s * 12);
  const ry = Math.round(6 + s * 6);
  const cy = ground - ry - Math.round(6 + s * 6);
  m.ellipse(cx, cy, rx, ry, BASE);
  // Pale underside, which every fish in the reference art has.
  m.ellipse(cx, cy + Math.round(ry * 0.45), Math.round(rx * 0.75), Math.round(ry * 0.5), LIGHT);

  // Tail fin, upper and lower lobe, with rays running out from the peduncle.
  const rootX = cx + rx - 2;
  for (const dir of [-1, 1]) {
    const tipX = cx + rx + Math.round(7 + s * 7);
    const tipY = cy + dir * Math.round(6 + s * 5);
    m.limbFront(rootX, cy, tipX, tipY, 3, Math.round(6 + s * 4), ACCENT);
    rays(m, rootX, cy, tipX, tipY, 0, dir * Math.round(5 + s * 3), 3, ACCENT_DARK);
  }
  // Dorsal, with rays.
  const dTip = cy - ry - Math.round(5 + s * 5);
  m.limbFront(cx - 2, cy - ry + 1, cx + 2, dTip, Math.round(8 + s * 4), 2, ACCENT);
  rays(m, cx, cy - ry + 1, cx + 2, dTip, Math.round(7 + s * 3), 0, 4, ACCENT_DARK);
  // Pectoral.
  const pTip = cy + ry + Math.round(4 + s * 3);
  m.limbFront(cx - Math.round(rx * 0.2), cy + 1, cx - Math.round(rx * 0.4), pTip, 5, 2, ACCENT);
  rays(m, cx - Math.round(rx * 0.2), cy + 1, cx - Math.round(rx * 0.4), pTip, 4, 0, 3, ACCENT_DARK);

  // Gill plate and lateral line: two marks that turn a lozenge into a fish.
  const gx = cx - Math.round(rx * 0.3);
  for (let d = -Math.round(ry * 0.8); d <= Math.round(ry * 0.8); d++) {
    m.over(gx + Math.round(Math.abs(d) * 0.3), cy + d, ACCENT_DARK);
  }
  for (let x = gx + 2; x <= cx + Math.round(rx * 0.7); x++) m.over(x, cy - 1, ACCENT_LIT);

  if (!back) {
    eyes(m, cx - Math.round(rx * 0.55), cy - 1, 0, 3, false);
    // Lips, parted.
    m.box(cx - rx + 1, cy + 2, cx - rx + 5, cy + 2, INNER);
    m.box(cx - rx + 1, cy + 3, cx - rx + 4, cy + 3, ACCENT_DARK);
  }
}

function planMoth(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const bodyRy = Math.round(9 + s * 8);
  const cy = ground - bodyRy - Math.round(5 + s * 6);
  // Wings first, body on top.
  for (const side of [-1, 1]) {
    const wr = Math.round(11 + s * 11);
    const fx = cx + side * Math.round(wr * 0.75);
    const fy = cy - Math.round(3 + s * 3);
    m.ellipse(fx, fy, wr, Math.round(wr * 0.8), ACCENT);
    m.ellipse(cx + side * Math.round(wr * 0.62), cy + Math.round(6 + s * 5),
      Math.round(wr * 0.6), Math.round(wr * 0.5), BASE);
    // Veins fanning from the shoulder, and a scalloped outer margin.
    rays(m, cx, cy - Math.round(bodyRy * 0.5), fx + side * Math.round(wr * 0.7), fy, 0, wr, 5, ACCENT_DARK);
    for (let a = -1.2; a <= 1.2; a += 0.3) {
      const ex = fx + side * Math.round(Math.cos(a) * wr * 0.85);
      const ey = fy + Math.round(Math.sin(a) * wr * 0.68);
      m.over(ex, ey, ACCENT_DARK);
    }
    // Leading edge of the forewing, and the seam where the forewing lies over
    // the hind. Two runs, and between them the wings stop reading as one flat
    // sheet of colour with veins printed on it.
    m.line(cx, cy - Math.round(bodyRy * 0.5) - 0.5, fx + side * Math.round(wr * 0.8), fy - Math.round(wr * 0.55), ACCENT_LIT);
    m.line(cx + side * 2, cy + Math.round(3 + s * 2), fx + side * Math.round(wr * 0.85), fy + Math.round(wr * 0.5), DEEP);
    // Eyespot: a dark disc with a lit ring, not a flat dot.
    m.ellipse(fx + side * Math.round(wr * 0.1), fy, 4, 4, ACCENT_LIT);
    m.ellipse(fx + side * Math.round(wr * 0.1), fy, 3, 3, ACCENT_DARK);
    // A crescent catchlight in the eyespot rather than a single cell, which is
    // what stops it reading as a printed dot.
    m.line(fx + side * Math.round(wr * 0.1) - 1.5, fy - 1, fx + side * Math.round(wr * 0.1) - 0.5, fy - 1.5, ACCENT_LIT);
  }
  m.ellipseFront(cx, cy, Math.round(4 + s * 3), bodyRy, BASE);
  segments(m, cx, cy - bodyRy, cx, cy + bodyRy, 4, Math.round(3 + s * 2), ACCENT_DARK);
  const headR = Math.round(4 + s * 2);
  const headCy = cy - bodyRy - headR + 3;
  m.ellipseFront(cx, headCy, headR, headR, BASE);
  // Plumed antennae: a shaft with barbs, which is what makes it a moth.
  for (const side of [-1, 1]) {
    const tipX = cx + side * Math.round(7 + s * 5);
    const tipY = cy - bodyRy - headR - Math.round(7 + s * 5);
    m.limb(cx + side, cy - bodyRy - headR, tipX, tipY, 2, 1, ACCENT_DARK);
    for (let k = 1; k <= 4; k++) {
      const t = k / 5;
      const px = Math.round(cx + side + (tipX - cx - side) * t);
      const py = Math.round(cy - bodyRy - headR + (tipY - cy + bodyRy + headR) * t);
      m.set(px - side, py - 1, ACCENT_DARK);
    }
  }
  if (!back) eyes(m, cx, headCy, 2, 2, false);
}

function planAquatic(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const rx = Math.round(13 + s * 11);
  const ry = Math.round(9 + s * 8);
  const cy = ground - ry - 3;
  m.ellipse(cx, cy, rx, ry, BASE);
  // Pale belly with throat grooves along it.
  m.ellipse(cx - Math.round(rx * 0.2), cy + Math.round(ry * 0.45),
    Math.round(rx * 0.6), Math.round(ry * 0.45), LIGHT);
  for (let i = 0; i < 4; i++) {
    const px = cx - Math.round(rx * 0.7) + i * 3;
    for (let d = 0; d < Math.round(ry * 0.7); d++) m.over(px, cy + Math.round(ry * 0.3) + d, DEEP);
  }

  // Fluked tail with rays through both blades.
  const pedX = cx + rx + Math.round(5 + s * 5);
  m.limbFront(cx + rx - 3, cy, cx + rx + Math.round(6 + s * 6), cy - 2, 6, 4, BASE);
  for (const dir of [-1, 1]) {
    const tipX = cx + rx + Math.round(9 + s * 7);
    const tipY = cy + dir * Math.round(5 + s * 5);
    m.limbFront(pedX, cy - 2, tipX, tipY, 3, 5, ACCENT);
    rays(m, pedX, cy - 2, tipX, tipY, 0, dir * 4, 3, ACCENT_DARK);
  }

  // Flippers, with the near one overlapping the body.
  for (const side of [-1, 1]) {
    const fx = cx - Math.round(rx * (0.25 + side * 0.08));
    const tipX = cx - Math.round(rx * (0.5 + side * 0.1));
    m.limbFront(fx, cy + Math.round(ry * 0.5), tipX, ground - 1,
      Math.round(6 + s * 3), Math.round(4 + s * 2), side < 0 ? ACCENT : SHADE);
    rays(m, fx, cy + Math.round(ry * 0.5), tipX, ground - 2, 4, 0, 3, ACCENT_DARK);
  }

  const headR = Math.round(7 + s * 5);
  const headCx = cx - rx + Math.round(2 + s * 2);
  const headCy = cy - Math.round(ry * 0.35);
  m.ellipseFront(headCx, headCy, headR, Math.round(headR * 0.85), BASE);
  // Blowhole and a long jaw line.
  m.over(headCx + Math.round(headR * 0.2), headCy - Math.round(headR * 0.7), INNER);
  if (!back) {
    const my = cy - Math.round(ry * 0.1);
    for (let i = 0; i <= Math.round(headR * 1.6); i++) {
      m.over(headCx - headR + i, my + Math.round(i * 0.15), INNER);
    }
    eyes(m, headCx, cy - Math.round(ry * 0.5), Math.round(headR * 0.5), 3, false);
  }
}

/**
 * A serpent rearing out of a coiled base.
 *
 * Drawn as a single continuous S-curve traced from the ground up, with the
 * thickness tapering along its length. Stacking discrete rings (the obvious
 * first approach) reads as a pile of plates, not an animal.
 */
function planSerpentine(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;

  const thick = Math.round(7 + s * 6);
  const height = Math.round(30 + s * 18);
  const amp = Math.round(9 + s * 7);

  // Coiled base, so the body has somewhere to come from.
  m.ellipse(cx, ground - Math.round(thick * 0.6), Math.round(amp * 1.5), Math.round(thick * 0.75), SHADE);
  m.ellipseFront(cx - Math.round(amp * 0.4), ground - Math.round(thick * 0.9),
    Math.round(amp * 1.0), Math.round(thick * 0.6), BASE);

  // The S-curve itself.
  const steps = 34;
  let headX = cx, headY = ground - height;
  const path: { x: number; y: number; w: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = Math.round(ground - thick * 0.5 - t * height);
    const x = Math.round(cx + Math.sin(t * Math.PI * 1.6 + 0.4) * amp * (1 - t * 0.35));
    const w = Math.max(3, Math.round(thick * (1 - t * 0.42)));
    m.ellipse(x, y, Math.round(w / 2), Math.round(w / 2), i % 6 < 3 ? BASE : ACCENT);
    path.push({ x, y, w });
    headX = x; headY = y;
  }
  // Belly scutes down the front of the column: flat plates with a dark gap
  // between them, which is what separates a snake from a length of rope.
  for (let i = 2; i < steps - 2; i += 2) {
    const p = path[i]!;
    const half = Math.round(p.w * 0.3);
    for (let d = -half; d <= half; d++) m.over(p.x - Math.round(p.w * 0.25) + d, p.y, LIGHT);
    m.over(p.x - Math.round(p.w * 0.25), p.y + 1, DEEP);
  }

  // Dorsal fin running up the spine, with rays.
  for (let i = 4; i <= steps - 4; i += 2) {
    const p = path[i]!;
    m.limb(p.x, p.y, p.x - Math.round(4 + s * 3), p.y - Math.round(3 + s * 2), 2, 1, ACCENT);
    m.set(p.x - Math.round(4 + s * 3), p.y - Math.round(3 + s * 2), ACCENT_LIT);
  }

  const headR = Math.round(7 + s * 5);
  const hy = headY - Math.round(headR * 0.5);
  m.ellipseFront(headX, hy, Math.round(headR * 1.1), Math.round(headR * 0.8), BASE);
  // Brow ridge and a jaw line under it.
  m.ellipse(headX, hy - Math.round(headR * 0.5), Math.round(headR * 0.9), Math.round(headR * 0.35), LIGHT);
  for (let d = -Math.round(headR * 0.9); d <= Math.round(headR * 0.9); d++) {
    m.over(headX + d, hy + Math.round(headR * 0.4), DEEP);
  }

  // Crown fins, webbed with rays.
  for (const side of [-1, 1]) {
    const tipX = headX + side * (headR + Math.round(6 + s * 6));
    const tipY = hy - Math.round(7 + s * 7);
    m.limbFront(headX + side * Math.round(headR * 0.8), hy - 1, tipX, tipY, 4, 1, ACCENT);
    rays(m, headX + side * Math.round(headR * 0.7), hy - 1, tipX, tipY, side * 3, 5, 3, ACCENT_DARK);
  }

  if (!back) {
    m.box(headX - 3, hy + Math.round(headR * 0.55), headX + 3, hy + Math.round(headR * 0.55), INNER);
    eyes(m, headX, hy, Math.round(headR * 0.5), 3, true);
  }
}

const PLAN_FNS: Record<BodyPlan, (c: PlanCtx) => void> = {
  quadruped: planQuadruped, biped: planBiped, brute: planBrute, critter: planCritter,
  bird: planBird, grub: planGrub, arachnid: planArachnid, mineral: planMineral,
  monolith: planMonolith, orb: planOrb, fish: planFish, moth: planMoth,
  aquatic: planAquatic, serpentine: planSerpentine,
};

/* ---------------------------------------------------------- rendering */

/**
 * The six palette slots.
 *
 *   0 `base`    the species' own colour. Most of the creature.
 *   1 `shade`   its dark. Far parts, and every FORM shadow on it.
 *   2 `light`   its pale material: belly, muzzle, mane, plate.
 *   3 `accent`  the second hue, as a material.
 *   4 `accent2` the third hue. A beak, a flame core, a gem, a leaf.
 *   5 `ink`     the outline. **The ink, and nothing else.**
 *
 * Slot 5 is new and it exists because `accent` was doubling as the ink. The old
 * five-slot layout ended at `ink`, and `maskToCanvas` took whichever declared
 * colour was actually darkest as the ink reference -- a sound guard against the
 * species that authored a pale colour in the last slot, but on sixteen of
 * forty-eight species the ACCENT was darker than the declared ink, so the
 * accent became the ink and the declared colour was silently thrown away. That
 * deleted a fire highlight on all three flame cats, a beak gold on both birds
 * and the electric blue on both spark species; `voltwick` was designed
 * yellow-and-blue and shipped yellow-and-black.
 *
 * A five-slot palette still works and still looks the same. It is read as
 * `[base, shade, light, accent, ink]`, and if the declared ink is NOT the
 * darkest colour on the sheet -- which is precisely the case where it was being
 * discarded -- it is recovered as `accent2` instead of being lost.
 */
function paletteOf(sp: SpeciesData | undefined): string[] {
  const p = sp?.design.palette ?? ['#7a8a9a', '#4f5a68', '#a8b8c8', '#d0a050', '#20242c'];
  const base = p[0] ?? '#7a8a9a';
  const shade = p[1] ?? base;
  const light = p[2] ?? base;
  const accent = p[3] ?? base;
  if (p.length >= 6) return [base, shade, light, accent, p[4] ?? accent, p[5] ?? '#20242c'];

  const last = p[4] ?? '#20242c';
  const ink = [last, shade, base, accent].reduce((a, c) => (lumaOf(c) < lumaOf(a) ? c : a));
  return [base, shade, light, accent, ink === last ? accent : last, ink];
}

/**
 * Which way the light end of a species' palette leans.
 *
 * Mixing a highlight toward pure white by t multiplies its chroma by exactly
 * (1 - t), which is why the measured SPEC came out at chroma 18/255 on luma 239
 * -- essentially white -- and why the palette drained to near-grey at the lit
 * end on every species at once. A highlight is not white; it is the colour of
 * the lamp. So the light end is mixed toward a saturated tint and ROTATES
 * rather than desaturating, and cool species get a cool lamp so the whole
 * roster does not come out wearing the same cream.
 */
const COOL_TYPES = new Set(['tide', 'frost', 'gale', 'spirit', 'psyche', 'umbral', 'iron', 'venom']);
function tintOf(sp: SpeciesData | undefined): { warm: string; hot: string; dark: string } {
  const cool = (sp?.types ?? []).some((t) => COOL_TYPES.has(t));
  return cool
    ? { warm: '#b8e4ff', hot: '#e0f4ff', dark: '#101a30' }
    : { warm: '#ffe08a', hot: '#fff2c0', dark: '#1a1024' };
}

function maskToCanvas(mask: Mask, pal: string[], tint: { warm: string; hot: string; dark: string }, flip: boolean): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = mask.w;
  cv.height = mask.h;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;

  const [base, shadeC, lightC, accent, accent2, ink] = pal as
    [string, string, string, string, string, string];
  // The extra ramp steps are derived, so a species declares six colours in its
  // JSON and never has to hand-pick a highlight.
  const accentDark = mixHex(accent, ink === accent ? '#101014' : ink, 0.45);
  const accent2Dark = mixHex(accent2, ink === accent2 ? '#101014' : ink, 0.45);
  // The light end ROTATES toward the colour of the lamp rather than draining
  // toward white. Mixing toward #ffffff by t multiplies chroma by (1 - t), so
  // the old SPEC kept 28% of its own colour and came out near-grey on every
  // species; mixing toward a saturated tint keeps the chroma and swings the hue
  // 15-25 degrees toward the light instead. See `tintOf`.
  const hilight = mixHex(lightC, tint.warm, 0.38);
  const spec = mixHex(lightC, tint.hot, 0.60);
  // And the dark end rotates the other way: a shadow that is merely a darker
  // version of the surface is a computer's shadow. Mixing toward a cool dark
  // gives it somewhere to go.
  const deep = mixHex(mixHex(shadeC, ink === shadeC ? '#101014' : ink, 0.42), tint.dark, 0.22);
  // FORM is the species' own authored dark. A shadow on a creature costs no
  // palette entry -- that is a large part of why it is the cheapest mark on the
  // sheet and why we can afford one on every overlap.
  const form = shadeC;
  const accentLit = mixHex(accent, tint.hot, 0.55);
  const accent2Lit = mixHex(accent2, tint.hot, 0.55);
  // A cavity is the darkest thing on the sprite that is still a colour. Warming
  // it slightly is what stops an open mouth reading as a hole in the sprite.
  const inner = mixHex(mixHex(ink, accent, 0.3), '#a04038', 0.25);
  // A pure-black border looks traced. Bleeding a little body colour into the
  // outline, and more of it into the lit side, is what makes it read as ink.
  // The lit side carries BASE, not LIGHT: against LIGHT the step from border to
  // body measured 52 luma, which is a third gradient stop wrapped round the
  // silhouette. Against BASE it is about 25 and reads as one edge.
  const outlineInk = mixHex(ink, base, 0.12);
  const outlineLit = mixHex(ink, base, 0.42);

  const colorFor = (v: number): string | null => {
    switch (v) {
      case BASE: return base;
      case SHADE: return shadeC;
      case FORM: return form;
      case DEEP: return deep;
      case LIGHT: return lightC;
      case HILIGHT: return hilight;
      case SPEC: return spec;
      case ACCENT: return accent;
      case ACCENT_DARK: return accentDark;
      case ACCENT_LIT: return accentLit;
      case ACCENT2: return accent2;
      case ACCENT2_DARK: return accent2Dark;
      case ACCENT2_LIT: return accent2Lit;
      case INNER: return inner;
      case EYE_WHITE: return '#f8f8fc';
      case EYE_DARK: return ink;
      case OUTLINE: return outlineInk;
      case OUTLINE_LIT: return outlineLit;
      // An internal division is the same ink as the border, carrying a little
      // more of the body's colour. Identical to the border and the creature
      // reads as separate pieces laid on top of each other; much lighter and
      // it stops dividing anything, which was the whole complaint.
      case EDGE: return mixHex(ink, base, 0.22);
      case SHADOW: return 'rgba(18,22,30,0.18)';
      case SHADOW_CORE: return 'rgba(14,17,24,0.34)';
      default: return null;
    }
  };

  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      const c = colorFor(mask.get(x, y));
      if (!c) continue;
      cx.fillStyle = c;
      cx.fillRect(flip ? mask.w - 1 - x : x, y, 1, 1);
    }
  }
  return cv;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = hexToRgb(a), pb = hexToRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function lumaOf(h: string): number {
  const [r, g, b] = hexToRgb(h);
  return r * 0.299 + g * 0.587 + b * 0.114;
}

function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16) || 0,
    parseInt(s.slice(2, 4), 16) || 0,
    parseInt(s.slice(4, 6), 16) || 0,
  ];
}

/* ------------------------------------------------------------ factory */

const cache = new Map<string, HTMLCanvasElement>();

/**
 * The composition origin a hand-authored design is handed.
 *
 * Designs work in mask cells, one cell to one sprite pixel, rather than in the
 * plan units the old body plans use -- at 128 cells a creature is best thought
 * about in the pixels it will actually occupy. The scratch mask is much larger
 * than the design cell, so a tall or a wide creature has somewhere to go before
 * the fit pass brings it home, and these are simply a comfortable place to
 * stand inside it.
 */
const DESIGN_CX = Math.round(WORK * U / 2);
const DESIGN_GROUND = Math.round(WORK * U * 0.78);

function build(speciesId: string, back: boolean): HTMLCanvasElement {
  const sp = registry.species.get(speciesId);
  const plan = (sp?.design.plan as BodyPlan) ?? 'quadruped';
  const s = Math.max(0.1, Math.min(1, sp?.design.scale ?? 0.45));
  const rng = new Rng(`${speciesId}:${back ? 'back' : 'front'}`);

  const work = new Mask(WORK * U, WORK * U);
  pendingEyes = [];

  /**
   * A design is run *instead of* the body plan, and instead of the two random
   * decoration passes that go with it.
   *
   * Appendages and markings exist to stop forty species on fourteen plans
   * reading as fourteen creatures in forty colours. A design has already solved
   * that problem properly, by being a specific animal, so bolting a random
   * frill and a random spot pattern onto it can only make it worse. Everything
   * that is genuinely craft rather than variety -- the light, the surface, the
   * rim, the ink, the floor, the fit -- still runs, so an author gets all of it
   * for free and only has to think about the creature.
   */
  const designed = sp ? DESIGNS[speciesId] : undefined;
  let wantTypeTraits = true;

  if (designed && sp) {
    const pen: DesignPen = {
      m: work, rng, back, sp,
      cx: DESIGN_CX, ground: DESIGN_GROUND,
      eyes: (x, y, spread, size, angry = false) => {
        pendingEyes.push({
          x: Math.round(x), y: Math.round(y),
          spread: Math.round(spread), size: Math.round(size), angry, draw: true,
        });
      },
      face: (x, y, r) => {
        pendingEyes.push({
          x: Math.round(x), y: Math.round(y),
          spread: Math.round(r * 0.5), size: Math.round(r * 0.25), angry: false, draw: false,
        });
      },
      noTypeTraits: () => { wantTypeTraits = false; },
      // The texture pass is gone; the hook stays so old designs compile.
      noTexture: () => { /* no-op: see SURFACE TEXTURE -- REMOVED, above */ },
    };
    designed(pen);
  } else {
    const ctx: PlanCtx = {
      m: new Pen(work, U), rng, s, back,
      ground: WORK - 6, cx: Math.floor(WORK / 2),
    };
    (PLAN_FNS[plan] ?? planQuadruped)(ctx);
  }

  // Decoration runs after the fit, so a tuft or a rivet is the same size on
  // every species regardless of how much its body plan had to be squeezed to
  // get into the frame -- and it is still authored in plan units, through a
  // pen of its own, so a horn is a horn and not a horn divided by two.
  const design = fitToCell(work, DESIGN - 6);
  const dpen = new Pen(design, U);
  if (!designed) {
    appendages(dpen, speciesId);
    markings(dpen, speciesId);
  }
  if (wantTypeTraits) typeTraits(dpen, sp, speciesId);

  // The intent map: what the design *meant* each cell to be, captured before
  // the light runs over it and turns four materials into eleven tones. The
  // internal-edge pass reads it to find the boundaries that matter -- see
  // `internalEdges` -- and it can only be taken here, because after `shade`
  // a far limb's mid band and the torso's dark band are the same number.
  const intent = design.data.slice();

  // Silhouette first, then everything that reads as craftsmanship: the light,
  // the divisions between the parts, the eyes, the rim, the ink and the floor.
  // All of these run one cell at a time, which is the point of the finer cell.
  shade(design);
  settle(design);
  internalEdges(design, intent);
  drawEyes(design, pendingEyes);
  pendingEyes = [];
  outline(design);
  contactShadow(design);

  // The back view is the same animal seen from behind: mirrored, and the
  // generator has already suppressed the face.
  return maskToCanvas(design, paletteOf(sp), tintOf(sp), back);
}

/**
 * TWO ROUTES, ONE RETURN TYPE.
 *
 * A species that ships hand-drawn art (assets/kin/<id>-front.png, see
 * gfx/kinart.ts) is handed that image, already seated on the same ground line
 * and centre line the generator uses. A species that does not is built from its
 * design exactly as before. Both come back as a 128x128 canvas, cached the same
 * way, so everything downstream -- the hit flash, the icon, the capture and
 * send-out crops, the party and switch screens, the region map -- works on
 * either without knowing which it got.
 *
 * The images were decoded during boot, so this stays synchronous. A species
 * with a front but no back yet keeps its generated back: art arrives in
 * batches and the game has to be playable in between.
 */
export function frontSprite(speciesId: string): HTMLCanvasElement {
  const key = `f:${speciesId}`;
  let cv = cache.get(key);
  if (!cv) { cv = kinArtSprite(speciesId, false) ?? build(speciesId, false); cache.set(key, cv); }
  return cv;
}

export function backSprite(speciesId: string): HTMLCanvasElement {
  const key = `b:${speciesId}`;
  let cv = cache.get(key);
  if (!cv) { cv = kinArtSprite(speciesId, true) ?? build(speciesId, true); cache.set(key, cv); }
  return cv;
}

/**
 * Half-size party/Vellum icon: the front sprite reduced by taking the dominant
 * colour of each 2x2 block, which preserves the silhouette far better than a
 * smoothed downscale.
 *
 * Note what this does on art that is already drawn in 2x2 blocks -- which the
 * generator's is, and which a hand-drawn sprite should be: every block is one
 * flat colour, so the dominant colour IS that colour and the reduction is
 * exact. No blending, no new colours, nothing invented. Art that is not on that
 * grid still reduces, to the nearest thing to a majority vote, and comes out
 * softer; `kinArtReport().softIcons` names the images that fall in that case so
 * the artist can be told which ones to redraw on the grid.
 */
export function iconSprite(speciesId: string): HTMLCanvasElement {
  const key = `i:${speciesId}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const src = frontSprite(speciesId);
  const sctx = src.getContext('2d')!;
  const data = sctx.getImageData(0, 0, src.width, src.height).data;

  const cv = document.createElement('canvas');
  cv.width = ICON_SIZE;
  cv.height = ICON_SIZE;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;

  for (let y = 0; y < ICON_SIZE; y++) {
    for (let x = 0; x < ICON_SIZE; x++) {
      const counts = new Map<string, number>();
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const sx = x * 2 + dx, sy = y * 2 + dy;
          const i = (sy * src.width + sx) * 4;
          if (data[i + 3]! < 128) continue;
          const key2 = `${data[i]},${data[i + 1]},${data[i + 2]}`;
          counts.set(key2, (counts.get(key2) ?? 0) + 1);
        }
      }
      if (counts.size === 0) continue;
      let best = '', bestN = 0;
      for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
      cx.fillStyle = `rgb(${best})`;
      cx.fillRect(x, y, 1, 1);
    }
  }
  cache.set(key, cv);
  return cv;
}

/**
 * A pure-white copy of a sprite, used for the hit flash. Compositing a tint
 * over the sprite is not an option -- the buffer is shared with the backdrop --
 * so the silhouette is baked once and cached alongside the sprite itself.
 */
export function whiteSprite(speciesId: string, back: boolean): HTMLCanvasElement {
  const key = `w${back ? 'b' : 'f'}:${speciesId}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const src = back ? backSprite(speciesId) : frontSprite(speciesId);
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;
  cx.drawImage(src, 0, 0);
  cx.globalCompositeOperation = 'source-in';
  cx.fillStyle = '#ffffff';
  cx.fillRect(0, 0, cv.width, cv.height);
  cache.set(key, cv);
  return cv;
}

export function clearSpriteCache(): void {
  cache.clear();
}
