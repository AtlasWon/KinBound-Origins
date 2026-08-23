/**
 * The mask: the surface every Kin is drawn on, and the vocabulary of tones it
 * is drawn in.
 *
 * A mask holds palette *indices*, never colours. A design function paints BASE
 * or ACCENT or INNER; the finishing passes push those indices up and down their
 * own ramps to make light, and only at the very end does `maskToCanvas` in
 * `kinsprite.ts` resolve an index to a hex string out of the species palette.
 * That indirection is the whole reason a single design can be authored once and
 * still look correct in five different colour schemes.
 *
 * This lives apart from `kinsprite.ts` so that the parts library and the design
 * files can import the tone constants without a circular import back through
 * the sprite factory that calls them.
 */

/**
 * The design cell, one cell to a buffer pixel. Everything after the fit --
 * shading, texture, eyes, rim, outline, cast shadow -- runs here at full
 * resolution.
 */
export const DESIGN = 128;

/**
 * Plans and designs draw into a larger scratch cell than they end up in.
 *
 * Composing straight into the design cell meant a tall species -- a reared
 * serpent, a horned brute, a crested biped -- ran off the top and was silently
 * beheaded, because the mask clamps rather than throws. Drawing with room and
 * then fitting the result is the difference between a creature that is too big
 * and a creature that is missing its skull. Measured in plan units.
 */
export const WORK = 96;

/**
 * Design cells to a plan unit.
 *
 * The legacy plans and the decoration passes are authored in units, not cells,
 * and a pen rasterises them at this density. Two means the geometry that was
 * tuned on the old grid comes out at exactly the same size, with every curve
 * resolved twice as finely and a half-unit reach for detail that the old grid
 * could not hold at all.
 *
 * Hand-authored designs do *not* use this: they work in mask cells, one cell to
 * one sprite pixel, because at that resolution a proportion is easier to think
 * about than a unit is.
 */
export const U = 2;

/* --------------------------------------------------------------- tones */

/** Nothing. The background, and the only value the outline pass will fill. */
export const EMPTY = 0;
/** The species' main colour. Most of a creature is this. */
export const BASE = 1;
/** A recessed surface: far limbs, undersides, anything meant to sit behind. */
export const SHADE = 2;
/** A pale surface: bellies, muzzles, throat plates, the near face of a mass. */
export const LIGHT = 3;
/** The species' feature colour: markings, horns, fins, claws, leaves, flame. */
export const ACCENT = 4;
/** The dark end of the accent ramp. */
export const ACCENT_DARK = 5;
/** Sclera. Only ever drawn by an eye helper. */
export const EYE_WHITE = 6;
/** Pupil ink. Also used for hard black detail inside an eye. */
export const EYE_DARK = 7;
/** The silhouette border. Written by the outline pass, not by a design. */
export const OUTLINE = 8;
/** Extra ramp steps, normally produced by the shading and finishing passes. */
export const HILIGHT = 9;
export const DEEP = 10;
/** Specular: the brightest step, reserved for the rim and the top of a curve. */
export const SPEC = 11;
/** Lit outline. A silhouette drawn entirely in one dark tone reads as marker
 *  pen; letting the light side of the outline carry some of the body's own
 *  colour is most of what separates painted art from traced art. */
export const OUTLINE_LIT = 12;
/** Contact shadow on the ground, drawn under everything and never outlined. */
export const SHADOW = 13;
/**
 * The bright end of the accent ramp: flame cores, ice facets, quartz seams,
 * metal sheen, claw tips, feather quills. Small marks in this tone are what
 * make a detail read as a *thing* rather than as a lighter patch, so the
 * shading pass deliberately leaves it alone -- it is a material, not a band.
 */
export const ACCENT_LIT = 14;
/**
 * Cavity colour: inner ear, open mouth, nostril, gill slit. Reference art
 * almost never leaves an opening in body colour, and one dark warm cell in the
 * right place does more for a face than another whole shading band.
 */
export const INNER = 15;
/**
 * The dark heart of the cast shadow. A shadow of one flat opacity is a decal;
 * an umbra with a lighter penumbra around it is what puts a creature on the
 * floor rather than over it.
 */
export const SHADOW_CORE = 16;
/** One past the last mask value, for the ramp lookup tables. */
export const TONE_COUNT = 17;

/**
 * Tones the shading pass will re-light.
 *
 * Anything painted in one of these four is treated as a *material* and run
 * through its own ramp, so a belly plate stays pale in shadow and a far leg
 * stays dark in light. Anything painted in a tone outside this set -- DEEP, a
 * SPEC catchlight, ACCENT_LIT on a claw, INNER in a mouth -- survives the
 * shading pass untouched, which is exactly how a design pins a detail that must
 * not move.
 */
export const SHADEABLE: ReadonlySet<number> = new Set([BASE, SHADE, LIGHT, ACCENT]);

export class Mask {
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
