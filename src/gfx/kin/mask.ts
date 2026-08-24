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
/**
 * A part of the creature that is set BEHIND another part: a far limb, a far
 * wing, a tail passing behind a haunch.
 *
 * SHADE is not "a darker colour". The internal-edge pass reads it as a
 * statement that this is a *different part* and lays hard ink along every
 * boundary where it meets body tone. That is exactly what you want for a far
 * leg and exactly what you do not want for the underside of one continuous
 * belly, which would come out with a black line ruled across the middle of it.
 *
 * **For a darker region of the SAME surface, paint `FORM`.** That is the whole
 * distinction, and it is the grammar the whole roster is drawn in:
 *
 *   - `SHADE` — another part, behind this one. Inks.
 *   - `FORM`  — this part, turning away from the light, or something else's
 *               shadow falling on it. Never inks.
 */
export const SHADE = 2;
/** A pale surface: bellies, muzzles, throat plates, the near face of a mass. */
export const LIGHT = 3;
/** The species' feature colour: markings, horns, fins, claws, leaves, flame. */
export const ACCENT = 4;
/** The dark end of the accent ramp. */
export const ACCENT_DARK = 5;
/*
 * A NOTE ON DEEP, ACCENT and the internal-edge pass, since it changes what
 * these tones mean in practice:
 *
 *  - DEEP is an OCCLUSION SEAM: a stroke laid where one part passes in front of
 *    another, and the internal-edge pass promotes it to hard ink. A DEEP
 *    *stroke* still inks; a DEEP *patch* -- a filled region with a real
 *    interior -- no longer does, because a dark patch is a shadow and a shadow
 *    is not a division. If you want a dark region on one continuous surface,
 *    paint FORM: that is what it is for, and it can never ink.
 *  - An ACCENT region gets ink around it only if it is a *mass* -- at least 64
 *    cells and genuinely thick. A stripe, a claw tip, a fin ray or an iris is
 *    left alone. So a horn reads as a horn and a marking stays a marking.
 */
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
/**
 * An internal division: the dark line between two parts of the same creature.
 *
 * Written only by the internal-edge pass in `kinsprite.ts`, never by a design.
 * It is the same ink as the silhouette border, and it exists as its own value
 * rather than reusing OUTLINE for one specific reason: the outline pass treats
 * OUTLINE as *not* body, so an OUTLINE cell laid down inside the silhouette
 * would be re-inked as border and then grown outward into a lump. EDGE counts
 * as body everywhere -- `filled`, `top`, `bottom`, the outline pass -- and so
 * it divides the creature without touching its outer shape at all.
 *
 * If you are a design author: paint DEEP for a seam you want to draw yourself.
 * EDGE is not yours to write.
 */
export const EDGE = 17;
/**
 * FORM -- one value step DOWN from BASE, on the same surface, that NEVER inks.
 *
 * This is the tone the roster was missing, and its absence is why forty-eight
 * creatures came out as smooth blobs. Before it, an author had three line-free
 * tones *above* BASE (LIGHT, HILIGHT, SPEC) and **none below it**: every way of
 * saying "this part of the surface is darker" -- SHADE, DEEP -- was classified
 * as a recess and had a hard black line ruled round it by `internalEdges`. So
 * "a darker haunch with no ring round it", which is the single most common
 * structural statement in reference art, was literally unwritable, and every
 * author drew a smooth mass instead.
 *
 * FORM means: **the same continuous surface, turned away from the light, or
 * with another part's shadow cast onto it.** It is classified as body, it is
 * never a division, and it is the tone every hand-placed cast shadow is painted
 * in. It resolves to the species' own SHADE colour -- the authored dark -- so
 * it costs no palette entry.
 *
 * Contrast with its two neighbours:
 *   - `SHADE` is a different PART. Inks.
 *   - `DEEP`  is a hand-placed occlusion seam or core shadow. Inks when it is a
 *              stroke; does not when it is a patch.
 *   - `FORM`  is the same part, darker. Never inks, ever.
 */
export const FORM = 18;
/**
 * The second feature hue.
 *
 * ACCENT is one hue and one hue only, and twenty-eight of forty-eight species
 * therefore ship with effectively a single colour plus its own light and dark.
 * A reference sprite spends its fifteen colours on MATERIALS -- Swampert is
 * blue skin, orange fins, a cream belly and white teeth -- so there is a second
 * accent family here, with its own palette slot, for the species that needs a
 * beak, a flame, a gem or a leaf that is genuinely not the first accent.
 *
 * Behaves exactly like ACCENT in every pass: shaded through its own three-tone
 * ramp, inked only when it is a mass. A five-colour species that never asks for
 * it simply gets ACCENT back.
 */
export const ACCENT2 = 19;
/** The dark end of the second accent ramp. */
export const ACCENT2_DARK = 20;
/** The bright end of the second accent ramp. */
export const ACCENT2_LIT = 21;
/** One past the last mask value, for the ramp lookup tables. */
export const TONE_COUNT = 22;

/**
 * Tones the shading pass will re-light.
 *
 * Anything painted in one of these is treated as a *material* and run through
 * its own ramp, so a belly plate stays pale in shadow and a far leg stays dark
 * in light. Anything painted in a tone outside this set -- DEEP, a SPEC
 * catchlight, ACCENT_LIT on a claw, INNER in a mouth -- survives the shading
 * pass untouched, which is exactly how a design pins a detail that must not
 * move.
 *
 * FORM is in the set: a cast shadow still has to obey the light that falls on
 * the surface under it. Its ramp is the body ramp, one rung down, and it is
 * deliberately the flattest of them -- a cast shadow is a hard-edged region of
 * one value, not a gradient.
 */
export const SHADEABLE: ReadonlySet<number> = new Set([BASE, SHADE, LIGHT, FORM, ACCENT, ACCENT2]);

export class Mask {
  data: Uint8Array;
  /**
   * The facet plane: one flag per cell, set while `beginFlat`/`endFlat` are
   * open. A flagged cell is a **plane**, not a curved surface, and the shading
   * pass leaves it exactly as it was painted.
   *
   * A flat plane takes one tone across its whole area and no gradient at all --
   * that is how every mineral in the reference generation reads as *hard*. We
   * had no way to say it, so `menhir`, a standing stone, came out wearing six
   * vertical airbrushed stripes. Wing membranes, leaf blades, fin webs, shell
   * scutes and rock faces all want this.
   */
  flat: Uint8Array;
  /** True while a `beginFlat` region is open. See `flat`. */
  private recFlat = false;
  /** Cells touched since `beginCast`, or null when no cast is being recorded. */
  private castRec: Uint8Array | null = null;

  constructor(readonly w = DESIGN, readonly h = DESIGN) {
    this.data = new Uint8Array(w * h);
    this.flat = new Uint8Array(w * h);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return EMPTY;
    return this.data[y * this.w + x]!;
  }

  set(x: number, y: number, v: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.data[i] = v;
    // Painted inside a facet region: a plane. Painted outside one: a curved
    // surface, even if a facet used to be here -- whatever was drawn last is
    // what the cell is.
    this.flat[i] = this.recFlat ? 1 : 0;
    if (this.castRec) this.castRec[i] = 1;
  }

  /**
   * Open a facet region. Everything painted until `endFlat` is a plane and the
   * shading pass will not touch it.
   *
   * The author-facing wrapper is `flat(p, () => { ... })` in the parts library;
   * this is the mechanism under it. Nestable regions are not needed and not
   * supported -- a facet is one flat statement.
   */
  beginFlat(): void { this.recFlat = true; }
  /** Close a facet region. */
  endFlat(): void { this.recFlat = false; }
  /** Is this cell a facet? */
  isFlat(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.flat[y * this.w + x] === 1;
  }

  /**
   * Start recording a caster. Draw the near mass, then `endCast` throws that
   * mass's own silhouette onto whatever is behind it.
   *
   * It records cells TOUCHED, not cells changed. A near foreleg drawn in BASE
   * across a torso already in BASE changes not one cell, and that is the single
   * commonest overlap on the roster -- a diff would have found no caster at all
   * and thrown no shadow on precisely the case that needs one most.
   */
  beginCast(): void { this.castRec = new Uint8Array(this.w * this.h); }

  /**
   * Throw the shadow of everything drawn since `beginCast` onto the surfaces
   * around it. **The single highest-value mark available on a sprite.**
   *
   * When mass A overlaps mass B the reference throws a hard-edged dark region
   * from A onto B -- not an outline, a *region*, offset down-and-right of A's
   * contour by two to four reference pixels and following A's silhouette.
   * Swampert's near arm onto its belly; Blaziken's near thigh onto the torso;
   * every quadruped's near foreleg onto its chest. We had zero of them on the
   * entire roster, because there was no tone to draw one in.
   *
   * It costs no palette entry, it separates two masses without a line, and --
   * because every cast shadow on the creature is thrown the same way -- it is
   * the only thing that establishes ONE light over the whole animal.
   *
   * The offset is the light: `(+dx, +dy)` must be down and to the right. A near
   * mass of width W wants `dx = dy = round(0.18 * W)`, clamped to 4..10 cells.
   *
   * The shadow lands only on cells that are already body and are not part of
   * the caster, and it lands as a *material step*, not as one flat grey: body
   * goes to FORM, a pale belly goes to BASE, an accent goes to its own dark.
   * That is what keeps a shadow crossing a two-coloured surface reading as one
   * shadow rather than as a sticker.
   */
  endCast(dx: number, dy: number, tone = FORM): void {
    const rec = this.castRec;
    this.castRec = null;
    if (!rec) return;
    const N = this.w * this.h;
    const caster = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const v = this.data[i]!;
      if (rec[i] && v !== EMPTY && v !== OUTLINE && v !== SHADOW) caster[i] = 1;
    }
    const hits: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (!caster[y * this.w + x]) continue;
        const tx = x + dx, ty = y + dy;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        const j = ty * this.w + tx;
        if (caster[j]) continue;
        hits.push(j);
      }
    }
    for (const j of hits) {
      switch (this.data[j]) {
        // A shadow on a pale material is one step down that material's own
        // ramp, not a smear of body shadow across it.
        case LIGHT: this.data[j] = BASE; break;
        case BASE: case FORM: this.data[j] = tone; break;
        case ACCENT: this.data[j] = ACCENT_DARK; break;
        case ACCENT2: this.data[j] = ACCENT2_DARK; break;
        // Anything else -- a far part, an existing seam, a cavity, an eye -- is
        // already dark or already spoken for.
        default: break;
      }
    }
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
