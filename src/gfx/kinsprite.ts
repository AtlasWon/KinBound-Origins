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

/**
 * The design cell, one cell to a buffer pixel. Everything after the fit --
 * shading, texture, eyes, rim, outline, cast shadow -- runs here at full
 * resolution.
 */
const DESIGN = 128;

/** The canvas a sprite is handed out on. Derived, so the two can never drift:
 *  the mask is the sprite now that nothing scales it on the way out. */
export const SPRITE_SIZE = DESIGN;
export const ICON_SIZE = DESIGN / 2;

/**
 * Plans draw into a larger scratch cell than they end up in.
 *
 * Composing straight into the design cell meant a tall species -- a reared
 * serpent, a horned brute, a crested biped -- ran off the top and was silently
 * beheaded, because the mask clamps rather than throws. Drawing with room and
 * then fitting the result is the difference between a creature that is too big
 * and a creature that is missing its skull. Measured in plan units.
 */
const WORK = 96;

/**
 * Design cells to a plan unit.
 *
 * The plans and the decoration passes are authored in units, not cells, and a
 * pen rasterises them at this density -- see `Pen`. Two means the geometry
 * that was tuned on the old grid comes out at exactly the same size, with
 * every curve resolved twice as finely and a half-unit reach for detail that
 * the old grid could not hold at all.
 */
const U = 2;

/** Mask cell meanings. Resolved to colours at the end. */
const EMPTY = 0;
const BASE = 1;
const SHADE = 2;
const LIGHT = 3;
const ACCENT = 4;
const ACCENT_DARK = 5;
const EYE_WHITE = 6;
const EYE_DARK = 7;
const OUTLINE = 8;
/** Extra ramp steps, only ever produced by the shading and finishing passes. */
const HILIGHT = 9;
const DEEP = 10;
/** Specular: the brightest step, reserved for the rim and the top of a curve. */
const SPEC = 11;
/** Lit outline. A silhouette drawn entirely in one dark tone reads as marker
 *  pen; letting the light side of the outline carry some of the body's own
 *  colour is most of what separates painted art from traced art. */
const OUTLINE_LIT = 12;
/** Contact shadow on the ground, drawn under everything and never outlined. */
const SHADOW = 13;
/**
 * The bright end of the accent ramp: flame cores, ice facets, quartz seams,
 * metal sheen, claw tips, feather quills. Small marks in this tone are what
 * make a detail read as a *thing* rather than as a lighter patch, so the
 * shading pass deliberately leaves it alone -- it is a material, not a band.
 */
const ACCENT_LIT = 14;
/**
 * Cavity colour: inner ear, open mouth, nostril, gill slit. Reference art
 * almost never leaves an opening in body colour, and one dark warm cell in the
 * right place does more for a face than another whole shading band.
 */
const INNER = 15;
/**
 * The dark heart of the cast shadow. A shadow of one flat opacity is a decal;
 * an umbra with a lighter penumbra around it is what puts a creature on the
 * floor rather than over it.
 */
const SHADOW_CORE = 16;
/** One past the last mask value, for the ramp lookup tables. */
const TONE_COUNT = 17;

export type BodyPlan =
  | 'quadruped' | 'biped' | 'brute' | 'critter' | 'bird' | 'grub'
  | 'arachnid' | 'mineral' | 'monolith' | 'orb' | 'fish' | 'moth'
  | 'aquatic' | 'serpentine';

class Mask {
  data: Uint8Array;
  constructor(readonly w = DESIGN, readonly h = DESIGN) {
    this.data = new Uint8Array(w * h);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return EMPTY;
    return this.data[y * this.w + x]!;
  }

  set(x: number, y: number, v: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = v;
  }

  /** Fills only where currently empty, so earlier shapes stay on top. */
  under(x: number, y: number, v: number): void {
    if (this.get(x, y) === EMPTY) this.set(x, y, v);
  }

  /** Paints only onto cells that are already body, so a seam, a marking or a
   *  crease can never accidentally extend the silhouette. */
  over(x: number, y: number, v: number): void {
    if (this.filled(x, y)) this.set(x, y, v);
  }

  filled(x: number, y: number): boolean {
    const v = this.get(x, y);
    return v !== EMPTY && v !== OUTLINE;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, v: number, beneath = false): void {
    if (rx <= 0 || ry <= 0) return;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) {
          if (beneath) this.under(x, y, v);
          else this.set(x, y, v);
        }
      }
    }
  }

  box(x0: number, y0: number, x1: number, y1: number, v: number, beneath = false): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        if (beneath) this.under(x, y, v);
        else this.set(x, y, v);
      }
    }
  }

  /** A limb that narrows from `w0` at the start to `w1` at the end. */
  limb(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, v: number, beneath = false): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      const w = Math.max(1, Math.round(w0 + (w1 - w0) * t));
      const r = Math.floor(w / 2);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r + 1) {
            if (beneath) this.under(x + dx, y + dy, v);
            else this.set(x + dx, y + dy, v);
          }
        }
      }
    }
  }

  /**
   * An ellipse that sits *in front of* whatever is already drawn: a dark seam
   * is laid down one cell proud of it, but only where it lands on existing
   * body. Two masses in the same colour with no seam between them read as one
   * blob however well the shading pass runs, and that -- not the palette -- is
   * why a generated head so often looks welded to its own shoulders.
   */
  ellipseFront(cx: number, cy: number, rx: number, ry: number, v: number, seam = DEEP, pad = 1): void {
    if (rx <= 0 || ry <= 0) return;
    for (let y = Math.floor(cy - ry - pad); y <= Math.ceil(cy + ry + pad); y++) {
      for (let x = Math.floor(cx - rx - pad); x <= Math.ceil(cx + rx + pad); x++) {
        const dx = (x - cx) / (rx + pad);
        const dy = (y - cy) / (ry + pad);
        if (dx * dx + dy * dy <= 1 && this.filled(x, y)) this.set(x, y, seam);
      }
    }
    this.ellipse(cx, cy, rx, ry, v);
  }

  /** The limb equivalent of `ellipseFront`. */
  limbFront(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, v: number, seam = DEEP, pad = 1): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      const w = Math.max(1, Math.round(w0 + (w1 - w0) * t)) + pad * 2;
      const r = Math.floor(w / 2);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r + 1 && this.filled(x + dx, y + dy)) this.set(x + dx, y + dy, seam);
        }
      }
    }
    this.limb(x0, y0, x1, y1, w0, w1, v);
  }

  /** Topmost body row in a column, or -1. */
  top(x: number): number {
    for (let y = 0; y < this.h; y++) if (this.filled(x, y)) return y;
    return -1;
  }

  /** Bottommost body row in a column, or -1. */
  bottom(x: number): number {
    for (let y = this.h - 1; y >= 0; y--) if (this.filled(x, y)) return y;
    return -1;
  }

  /** Mirror the left half onto the right, for a symmetric front view. */
  mirror(axis: number): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < axis; x++) {
        const v = this.get(x, y);
        const mx = Math.round(axis * 2 - x) - 1;
        if (v !== EMPTY) this.set(mx, y, v);
      }
    }
  }

  bounds(): { x0: number; y0: number; x1: number; y1: number } | null {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== EMPTY) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1 };
  }

}

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
 * 8x8 ordered dither, for the band boundaries.
 *
 * The 4x4 pattern was right when a shading block was two cells across: it gave
 * four visible levels and the checker read as deliberate. At one cell to a
 * block a 4x4 threshold repeats every four pixels and the transitions come out
 * as visible tartan. Eight levels over eight cells reads as a gradient built
 * out of dots, which is what the reference art actually does between bands.
 */
const BAYER8: number[][] = (() => {
  const g: number[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: number[] = [];
    for (let x = 0; x < 8; x++) {
      // Standard recursive Bayer construction, bit-interleaved.
      let v = 0;
      for (let b = 0; b < 3; b++) {
        v |= (((y >> b) ^ (x >> b)) & 1) << (2 * b + 1);
        v |= ((x >> b) & 1) << (2 * b);
      }
      row.push(v);
    }
    g.push(row);
  }
  return g;
})();
const ditherOn8 = (x: number, y: number, level: number): boolean =>
  BAYER8[y & 7]![x & 7]! < level * 64;

/**
 * Step an already-lit cell one place along its own ramp.
 *
 * The texture pass works on the shaded mask rather than before it, so a scale
 * or a quill or a rivet is a *modulation of the light* and not a fixed tone
 * pasted over it. Tables rather than a search, because this runs per cell.
 */
const TONE_UP = new Uint8Array(TONE_COUNT);
const TONE_DOWN = new Uint8Array(TONE_COUNT);
(() => {
  for (let i = 0; i < TONE_COUNT; i++) { TONE_UP[i] = i; TONE_DOWN[i] = i; }
  for (const ramp of [[SPEC, HILIGHT, LIGHT, BASE, SHADE, DEEP], [ACCENT_LIT, ACCENT, ACCENT_DARK]]) {
    for (let i = 0; i < ramp.length; i++) {
      TONE_UP[ramp[i]!] = ramp[Math.max(0, i - 1)]!;
      TONE_DOWN[ramp[i]!] = ramp[Math.min(ramp.length - 1, i + 1)]!;
    }
  }
})();

/**
 * The six shading bands, per material.
 *
 * A plan paints in materials -- body, pale underside, recessed mass, accent --
 * and the shading pass runs each of them through its own ramp. That is why a
 * belly plate stays pale in shadow and a far leg stays dark in light: they are
 * different surfaces, not different amounts of the same one.
 */
const RAMP_BASE = [SPEC, HILIGHT, LIGHT, BASE, SHADE, DEEP];
const RAMP_LIGHT = [SPEC, SPEC, HILIGHT, HILIGHT, LIGHT, BASE];
const RAMP_SHADE = [BASE, BASE, SHADE, SHADE, DEEP, DEEP];
const RAMP_ACCENT = [ACCENT_LIT, ACCENT_LIT, ACCENT, ACCENT, ACCENT_DARK, ACCENT_DARK];

/**
 * Light from the upper left, as banded form shading.
 *
 * This used to sample and paint whole 2x2 blocks, because the mask underneath
 * it was a doubled copy of a coarser design and a band that stepped on a
 * half-block boundary looked smoothed rather than drawn. The design cell is
 * now the buffer pixel, so the pass runs one cell at a time and the terminator
 * can follow the actual curve of the mass instead of a staircase of it. Every
 * distance in here is measured in the finer cells, which is why the numbers
 * are twice what they were.
 *
 * Each cell takes its band from where it sits *across* the thickness of its
 * own mass along the light axis, not from an absolute distance to the lit
 * edge. A leg then gets the same number of bands as the torso, just narrower,
 * which is how a person shades. The old absolute ramp could not: it lit thin
 * limbs almost flat, so every creature came out as a well-lit body with tubes
 * attached.
 *
 * Three things are layered on top of the falloff:
 *
 *  - a **core shadow**, holding the surface that turns away from the light a
 *    step darker than the falloff alone gives it, which is what makes a form
 *    have weight rather than merely a light side;
 *  - a **crevice** term from local coverage, so an armpit, the seam where a
 *    limb enters the torso, and any two masses that overlap all darken where
 *    they meet;
 *  - **ground contact**, because the last thing a sprite needs is to be
 *    equally bright where it touches the floor.
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

  // Where each band starts along the thickness. Kept as a table so the
  // fractional position inside a band is available for the dither.
  const EDGES = [0.10, 0.28, 0.52, 0.74, 0.92, 1.01];
  /** How many cells wide the feathered seam between two bands is. */
  const SEAM = 3.5;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = at(x, y);
      const ramp = v === BASE ? RAMP_BASE
        : v === LIGHT ? RAMP_LIGHT
          : v === SHADE ? RAMP_SHADE
            : v === ACCENT ? RAMP_ACCENT : null;
      if (!ramp) continue;

      const up = ray(x, y, -1, -1, 32);
      const down = ray(x, y, 1, 1, 32);
      const span = up + down;
      const t = span === 0 ? 0.5 : up / span;

      let band = 0;
      while (band < 5 && t >= EDGES[band]!) band++;
      const lo = band === 0 ? 0 : EDGES[band - 1]!;
      const frac = (t - lo) / Math.max(0.01, EDGES[band]! - lo);
      let forced = false;

      if (span <= 4) {
        // Too thin to carry six steps; two is honest and stays readable.
        band = up === 0 ? 2 : 4;
        forced = true;
      } else if (span <= 10) {
        const clamped = Math.max(1, Math.min(4, band));
        if (clamped !== band) forced = true;
        band = clamped;
      } else {
        // A large mass must not carry a highlight the size of a limb, nor let
        // its shadow eat half the body.
        const was = band;
        if (band === 0 && up > 3) band = 1;
        if (band === 1 && up > 7) band = 2;
        if (band === 2 && up > 15) band = 3;
        if (band === 5 && down > 5) band = 4;
        if (band === 4 && down > 13) band = 3;
        if (down <= 2) band = 5;
        if (band !== was) forced = true;
      }

      // The diagonal ray is degenerate at the lower-left and upper-right tips
      // of a round mass, where it reports a lit edge for a surface that is
      // plainly underneath. A second measurement on each axis vetoes that.
      // Only ever consulted for a cell the diagonal called lit, which keeps
      // four of the six rays off the hot path entirely.
      if (band < 3) {
        const vUp = ray(x, y, 0, -1, 24), vDn = ray(x, y, 0, 1, 24);
        if (vUp + vDn > 0 && vUp / (vUp + vDn) > 0.74) { band = 3; forced = true; }
        if (band < 3) {
          const hL = ray(x, y, -1, 0, 24), hR = ray(x, y, 1, 0, 24);
          if (hL + hR > 0 && hL / (hL + hR) > 0.82) { band = 3; forced = true; }
        }
      }

      // Crevice: close to an edge, but with the body wrapping around rather
      // than falling away. That is an armpit, never a tip.
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)
        || !solid(x - 1, y - 1) || !solid(x + 1, y - 1) || !solid(x - 1, y + 1) || !solid(x + 1, y + 1);
      if (edge && band < 5 && coverage(x, y) > 0.70) { band++; forced = true; }

      if (floor > 0 && y >= floor - 2 && band < 5) { band++; forced = true; }

      // Every boundary is dithered now, not just the terminator.
      //
      // Six bands over a 128-cell creature is a step every ten cells or so,
      // and at that spacing a hard edge reads as a contour line on a map. So
      // each boundary gets a narrow feathered seam and the bands themselves
      // stay flat: the eye reads eleven steps that still resolve into six when
      // it looks straight at them.
      //
      // The seam is measured in *cells*, not in a fraction of the band. That
      // distinction is the whole thing. A fractional threshold dithers the
      // last third of a band, and on a barrel-shaped torso the last third of a
      // band is fifteen cells wide, so the creature comes out wearing tartan.
      // Three cells is a seam whatever the mass behind it is doing.
      //
      // And a band narrower than the seam gets no seam at all. A leg eight
      // cells thick carries bands two cells wide, every one of which is inside
      // the feather distance, so the whole limb dithers and comes out looking
      // like wire mesh -- which is what the front legs of every quadruped on
      // the roster did until this guard went in.
      const bandCells = span * Math.max(0.01, EDGES[band]! - lo);
      const toEdge = (1 - frac) * bandCells;
      if (!forced && band < 5 && bandCells > SEAM * 1.6
        && toEdge < SEAM && ditherOn8(x, y, 1 - toEdge / SEAM)) band++;

      mask.set(x, y, ramp[band]!);
    }
  }
}

/**
 * Surface texture.
 *
 * This pass did not exist before and could not have: at one shading block to
 * two cells there was no spare pixel to put a scale, a barb or a bevel on, and
 * anything drawn at that size came out as a pattern of blobs rather than as a
 * material. It runs *after* the light, and it works by stepping cells one
 * place along the ramp they were already given, so a scale on the shadow side
 * is a dark scale and the same scale on the lit shoulder is a bright one --
 * which is the difference between texture and a decal.
 *
 * Everything here is one cell wide and one step deep on purpose. Two steps and
 * the creature reads as diseased; two cells and it reads as a knitted jumper.
 */
function texture(mask: Mask, sp: SpeciesData | undefined, seed: string): void {
  const b = mask.bounds();
  if (!b) return;
  const kind = sp?.types?.[0] ?? 'beast';
  const plan = sp?.design.plan;
  const rng = new Rng('skin:' + seed);
  const src = mask.data.slice();
  const W = mask.w, H = mask.h;

  const val = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= W || y >= H) return EMPTY;
    return src[y * W + x]!;
  };
  const body = (x: number, y: number): boolean => {
    const v = val(x, y);
    return v !== EMPTY && v !== OUTLINE && v !== OUTLINE_LIT && v !== SHADOW
      && v !== EYE_WHITE && v !== EYE_DARK && v !== INNER;
  };
  /** Two cells clear of the silhouette on every side. Texture that runs to the
   *  edge eats the rim light and the outline comes out looking chewed. */
  const inside = (x: number, y: number): boolean =>
    body(x, y) && body(x - 2, y) && body(x + 2, y) && body(x, y - 2) && body(x, y + 2);

  const up = (x: number, y: number): void => {
    if (!inside(x, y)) return;
    const v = val(x, y);
    // Texture never reaches the specular. That tone belongs to the rim light
    // and to nothing else; a pale creature speckled with it comes out looking
    // like television static, which is exactly how the first pass looked.
    if (v === HILIGHT || v === SPEC || v === ACCENT_LIT) return;
    mask.set(x, y, TONE_UP[v]!);
  };
  const dn = (x: number, y: number): void => { if (inside(x, y)) mask.set(x, y, TONE_DOWN[val(x, y)]!); };

  const family =
    kind === 'tide' || kind === 'frost' || plan === 'fish' || plan === 'serpentine' || plan === 'aquatic' ? 'scales'
      : kind === 'chitin' || kind === 'iron' ? 'plates'
        : kind === 'gale' || plan === 'bird' || plan === 'moth' ? 'feathers'
          : kind === 'stone' || kind === 'terra' || plan === 'mineral' || plan === 'monolith' ? 'grain'
            : kind === 'radiant' || kind === 'spirit' || kind === 'psyche' ? 'sheen'
              : 'hide';

  switch (family) {
    case 'scales': {
      // Offset rows of scallops: a dark lower rim with a lit crown, and the
      // row below staggered by half a pitch so the coverage reads as
      // imbricated rather than as a grid.
      //
      // Two cells a scale, not five. Five drew every scale in full and the
      // creature came out wearing chain mail; the eye only needs the shadow
      // under each scale and one catchlight to infer the rest.
      const pitch = 7, rowH = 5;
      for (let y = b.y0 + 3, row = 0; y <= b.y1 - 3; y += rowH, row++) {
        const off = (row & 1) ? Math.floor(pitch / 2) : 0;
        for (let x = b.x0 + 3 + off; x <= b.x1 - 3; x += pitch) {
          dn(x, y + 1);
          dn(x + 1, y + 1);
          up(x, y - 1);
        }
      }
      break;
    }

    case 'plates': {
      // Stacked armour: a dark gutter with a bevel catching the light on the
      // plate above it, and a rivet line down the middle of each band.
      for (let y = b.y0 + 4; y <= b.y1 - 3; y += 7) {
        for (let x = b.x0 + 1; x <= b.x1 - 1; x++) {
          const bow = Math.round(Math.abs(x - (b.x0 + b.x1) / 2) * 0.08);
          dn(x, y + bow);
          up(x, y + bow - 1);
        }
        for (let x = b.x0 + 4; x <= b.x1 - 4; x += 9) {
          const ry = y + Math.round(Math.abs(x - (b.x0 + b.x1) / 2) * 0.08) - 4;
          dn(x, ry + 1); dn(x + 1, ry); dn(x - 1, ry);
          up(x, ry - 1);
        }
      }
      break;
    }

    case 'feathers': {
      // Barbs: a short slanted stroke with a lit leading edge, laid in rows
      // that lean the way the wing does. Three cells each, which is exactly
      // one cell more than the old grid could spare and the reason a feather
      // now reads as a feather instead of as a dash.
      for (let y = b.y0 + 4, row = 0; y <= b.y1 - 3; y += 5, row++) {
        const off = (row & 1) ? 4 : 0;
        for (let x = b.x0 + 3 + off; x <= b.x1 - 5; x += 8) {
          up(x, y - 1);
          dn(x, y); dn(x + 1, y + 1); dn(x + 2, y + 1);
        }
      }
      break;
    }

    case 'grain': {
      // Mineral speckle plus a few straight cleavage lines. Hashed rather
      // than sampled from the rng so the cost stays one multiply per cell.
      for (let y = b.y0 + 2; y <= b.y1 - 2; y++) {
        for (let x = b.x0 + 2; x <= b.x1 - 2; x++) {
          const n = (x * 7 + y * 13 + ((x * y) & 7)) & 15;
          if (n === 0) dn(x, y);
          else if (n === 9) up(x, y);
        }
      }
      for (let i = 0; i < 5; i++) {
        const ax = b.x0 + rng.below(Math.max(1, b.x1 - b.x0));
        const ay = b.y0 + rng.below(Math.max(1, b.y1 - b.y0));
        const dx = rng.chance(50) ? 1 : -1;
        const slope = 0.3 + rng.next() * 0.6;
        for (let k = 0; k < 14; k++) {
          dn(ax + dx * k, ay + Math.round(k * slope));
          up(ax + dx * k, ay + Math.round(k * slope) - 1);
        }
      }
      break;
    }

    case 'sheen': {
      // Diagonal light banding, the way a lantern or a ghost reads: no
      // material at all, just the surface catching and losing the glow.
      for (let y = b.y0 + 2; y <= b.y1 - 2; y++) {
        for (let x = b.x0 + 2; x <= b.x1 - 2; x++) {
          const d = (x + y) % 9;
          if (d === 0) up(x, y);
          else if (d === 4) dn(x, y);
        }
      }
      break;
    }

    default: {
      // Hide and fur: short strokes lying the way the light falls. Sparse is
      // the whole discipline here -- a stroke every four cells reads as a coat
      // and a stroke every two reads as a knitted jumper, and the difference
      // between the two is one number.
      for (let y = b.y0 + 4, row = 0; y <= b.y1 - 3; y += 5, row++) {
        const off = (row & 1) ? 3 : 0;
        for (let x = b.x0 + 3 + off; x <= b.x1 - 4; x += 6) {
          up(x, y - 1);
          dn(x + 1, y);
        }
      }
      break;
    }
  }
}

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
      out.set(dx0 + Math.round((x - b.x0) * k), dy0 + Math.round((y - b.y0) * k), v);
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

/**
 * Inner rim light.
 *
 * A bright run along the edges that face the light. This is the highest-value
 * pass in the generator: it separates the creature from whatever it is
 * standing on, and it is the difference between a flat cutout and something
 * that looks like it has a surface.
 *
 * It used to be one shading block wide, which meant one flat step of specular
 * and nothing else -- a rim with no falloff, because there was no second row
 * to put the falloff in. There is now. The cell on the edge takes the full
 * lift and the cell behind it takes half of one, so the rim rolls off into the
 * body the way a real highlight on a curved surface does.
 *
 * Shadowed material gets a rim too, but only a modest one. A limb whose lit
 * edge is a contact seam otherwise looks sunk into the body it belongs to.
 */
function rimLight(mask: Mask): void {
  const W = mask.w, H = mask.h;
  const src = mask.data.slice();
  const at = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= W || y >= H) return EMPTY;
    return src[y * W + x]!;
  };
  const filled = (x: number, y: number): boolean => {
    const v = at(x, y);
    return v !== EMPTY && v !== OUTLINE && v !== SHADOW;
  };
  /** On the lit edge: nothing of the body up, left, or up-left of here. */
  const lit = (x: number, y: number): boolean =>
    !(filled(x, y - 1) && filled(x - 1, y) && filled(x - 1, y - 1));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = at(x, y);
      // Shadowed material is lifted exactly one step, never up to the
      // specular: a rim as bright as the lit side turns the whole silhouette
      // into a halo and undoes the banding underneath it.
      const full = (v === BASE || v === LIGHT || v === HILIGHT || v === SPEC) ? SPEC
        : v === SHADE ? BASE : v === DEEP ? SHADE : EMPTY;
      if (full === EMPTY) continue;
      if (lit(x, y)) { mask.set(x, y, full); continue; }
      // Second row in: half the lift, and only where the cell in front of it
      // actually took the rim.
      if (!filled(x, y) ) continue;
      if (lit(x - 1, y) || lit(x, y - 1) || lit(x - 1, y - 1)) mask.set(x, y, TONE_UP[v]!);
    }
  }
}

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

interface EyeSpot { x: number; y: number; spread: number; size: number; angry: boolean }

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
    spread: Math.round(spread * p.u), size: Math.round(size * p.u), angry,
  });
}

/**
 * Draw a recorded pair.
 *
 * The proportions matter more than the size: a mostly-dark eye with a single
 * bright glint reads as an animal looking at you, while a mostly-white eye with
 * a dot in it reads as a doll. The pupil sits slightly inboard so both eyes
 * converge on the viewer.
 *
 * Everything from the iris inward is new. An eye ten cells across used to be
 * five shading blocks and could hold a sclera, a pupil and a glint and nothing
 * else -- so every creature on the roster had the same black bead with a white
 * corner. Ten actual cells hold a coloured iris in the species accent, a
 * pupil, a fine dark limbal ring around the iris, a hard glint up towards the
 * light and a soft warm bounce reflected back into the lower rim. That last
 * pair is the whole trick: one cool highlight and one warm one is what makes a
 * painted eye look wet rather than merely shiny.
 */
function drawEyes(mask: Mask, spots: EyeSpot[]): void {
  for (const s of spots) {
    const cy = s.y;
    // Big enough to hold an expression across a battle, small enough that the
    // head still has room for a skull behind it.
    const r = Math.max(4.2, s.size * 1.25);

    for (const side of [-1, 1]) {
      const ex = s.x + side * s.spread;

      // Socket: a hard rim so the eye separates from any body colour.
      mask.ellipse(ex, cy, r + 1.4, r * 1.25 + 1.4, OUTLINE);
      // The white is kept to a rim. An eye at this size with a wide sclera
      // reads as a googly eye stuck on, and the point of a big eye is to make
      // the creature look at you, not to make it look surprised.
      mask.ellipse(ex, cy, r, r * 1.25, EYE_WHITE);
      // Limbal ring, then iris in the species accent, then the pupil. Three
      // rings inside a ten-cell eye, which is exactly the budget the finer
      // grid bought and exactly where it is best spent.
      mask.ellipse(ex - side * r * 0.1, cy + r * 0.08, r * 0.88, r * 1.08, EYE_DARK);
      mask.ellipse(ex - side * r * 0.1, cy + r * 0.08, r * 0.72, r * 0.92, ACCENT_DARK);
      mask.ellipse(ex - side * r * 0.12, cy + r * 0.1, r * 0.54, r * 0.72, ACCENT);
      mask.ellipse(ex - side * r * 0.12, cy + r * 0.12, r * 0.34, r * 0.5, EYE_DARK);
      // A lit crescent under the pupil, which is what makes an eye look wet.
      mask.ellipse(ex, cy + r * 0.86, r * 0.46, r * 0.22, EYE_WHITE);
      // Glint, up and towards the light: a hard square-cornered mark, because
      // a round glint at this size just looks like a smudge.
      const g = Math.max(1, Math.round(r * 0.3));
      mask.box(Math.round(ex - r * 0.5) - g, Math.round(cy - r * 0.6) - g,
        Math.round(ex - r * 0.5), Math.round(cy - r * 0.6), EYE_WHITE);
      // Bounce light reflected back into the far rim, one cell, warm. The eye
      // stops reading as a hole the moment this lands.
      mask.set(Math.round(ex + r * 0.5), Math.round(cy + r * 0.45), ACCENT_LIT);
      mask.set(Math.round(ex + r * 0.5), Math.round(cy + r * 0.45) + 1, ACCENT_LIT);

      if (s.angry) {
        // A heavy slanted brow: the cheapest way to say predator. It gets a lit
        // top edge now, so it reads as a ridge of bone over the socket rather
        // than as a stripe of paint above it.
        const bh = Math.max(2, Math.round(r * 0.5));
        for (let i = 0; i <= Math.round(r * 2.4); i++) {
          const bx = Math.round(ex - side * r * 1.2 + side * i);
          const by = Math.round(cy - r * 1.5 - i * 0.35);
          mask.box(bx, by, bx, by + bh, ACCENT_DARK);
          mask.set(bx, by, ACCENT);
        }
      }
    }
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

function paletteOf(sp: SpeciesData | undefined): string[] {
  const p = sp?.design.palette ?? ['#7a8a9a', '#4f5a68', '#a8b8c8', '#d0a050', '#20242c'];
  return [
    p[0] ?? '#7a8a9a',
    p[1] ?? p[0] ?? '#4f5a68',
    p[2] ?? p[0] ?? '#a8b8c8',
    p[3] ?? p[0] ?? '#d0a050',
    p[4] ?? '#20242c',
  ];
}

function maskToCanvas(mask: Mask, pal: string[], flip: boolean): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = mask.w;
  cv.height = mask.h;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;

  const [base, shadeC, lightC, accent, outlineC] = pal as [string, string, string, string, string];
  // The fifth slot is meant to be the ink, but a handful of species author a
  // pale colour there and every derived shadow tone then comes out lighter
  // than the thing it is shading -- which is how a creature ends up wearing a
  // cream halo. Take whichever declared colour is actually darkest as the
  // reference instead; for a correctly authored palette that is the fifth slot
  // and nothing changes.
  const ink = [outlineC, shadeC, base, accent].reduce((a, c) => (lumaOf(c) < lumaOf(a) ? c : a));
  // The extra ramp steps are derived, so a species still declares only five
  // colours in its JSON and never has to hand-pick a highlight.
  const accentDark = mixHex(accent, ink === accent ? '#101014' : ink, 0.45);
  const hilight = mixHex(lightC, '#ffffff', 0.42);
  const spec = mixHex(lightC, '#ffffff', 0.72);
  const deep = mixHex(shadeC, ink === shadeC ? '#101014' : ink, 0.5);
  // The bright accent is pushed towards warm white rather than pure white: a
  // flame core, a claw and a metal sheen all read hotter for it, and it never
  // collides with the specular step of the body ramp.
  const accentLit = mixHex(accent, '#fff4d8', 0.55);
  // A cavity is the darkest thing on the sprite that is still a colour. Warming
  // it slightly is what stops an open mouth reading as a hole in the sprite.
  const inner = mixHex(mixHex(ink, accent, 0.3), '#a04038', 0.25);
  // A pure-black border looks traced. Bleeding a little body colour into the
  // outline, and more of it into the lit side, is what makes it read as ink.
  const outlineInk = mixHex(ink, base, 0.12);
  const outlineLit = mixHex(ink, lightC, 0.42);

  const colorFor = (v: number): string | null => {
    switch (v) {
      case BASE: return base;
      case SHADE: return shadeC;
      case DEEP: return deep;
      case LIGHT: return lightC;
      case HILIGHT: return hilight;
      case SPEC: return spec;
      case ACCENT: return accent;
      case ACCENT_DARK: return accentDark;
      case ACCENT_LIT: return accentLit;
      case INNER: return inner;
      case EYE_WHITE: return '#f8f8fc';
      case EYE_DARK: return ink;
      case OUTLINE: return outlineInk;
      case OUTLINE_LIT: return outlineLit;
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

function build(speciesId: string, back: boolean): HTMLCanvasElement {
  const sp = registry.species.get(speciesId);
  const plan = (sp?.design.plan as BodyPlan) ?? 'quadruped';
  const s = Math.max(0.1, Math.min(1, sp?.design.scale ?? 0.45));
  const rng = new Rng(`${speciesId}:${back ? 'back' : 'front'}`);

  const work = new Mask(WORK * U, WORK * U);
  pendingEyes = [];
  const ctx: PlanCtx = {
    m: new Pen(work, U), rng, s, back,
    ground: WORK - 6, cx: Math.floor(WORK / 2),
  };

  (PLAN_FNS[plan] ?? planQuadruped)(ctx);
  // Decoration runs after the fit, so a tuft or a rivet is the same size on
  // every species regardless of how much its body plan had to be squeezed to
  // get into the frame -- and it is still authored in plan units, through a
  // pen of its own, so a horn is a horn and not a horn divided by two.
  const design = fitToCell(work, DESIGN - 6);
  const dpen = new Pen(design, U);
  appendages(dpen, speciesId);
  markings(dpen, speciesId);
  typeTraits(dpen, sp, speciesId);

  // Silhouette first, then everything that reads as craftsmanship: the light,
  // the surface it falls on, the eyes, the rim, the ink and the floor. All of
  // these run one cell at a time, which is the entire point of the finer cell.
  shade(design);
  texture(design, sp, speciesId);
  drawEyes(design, pendingEyes);
  pendingEyes = [];
  rimLight(design);
  outline(design);
  contactShadow(design);

  // The back view is the same animal seen from behind: mirrored, and the
  // generator has already suppressed the face.
  return maskToCanvas(design, paletteOf(sp), back);
}

export function frontSprite(speciesId: string): HTMLCanvasElement {
  const key = `f:${speciesId}`;
  let cv = cache.get(key);
  if (!cv) { cv = build(speciesId, false); cache.set(key, cv); }
  return cv;
}

export function backSprite(speciesId: string): HTMLCanvasElement {
  const key = `b:${speciesId}`;
  let cv = cache.get(key);
  if (!cv) { cv = build(speciesId, true); cache.set(key, cv); }
  return cv;
}

/** Half-size party/Vellum icon: the front sprite reduced by taking the dominant
 *  colour of each 2x2 block, which preserves the silhouette far better than a
 *  smoothed downscale. */
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
