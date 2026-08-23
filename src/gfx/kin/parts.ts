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
 *  - **You paint tones, never colours.** BASE / SHADE / LIGHT / ACCENT are
 *    *materials*: the shading pass runs each of them through its own ramp, so
 *    a belly painted LIGHT stays pale in shadow and a far leg painted SHADE
 *    stays dark in light. Everything else -- DEEP, HILIGHT, SPEC, ACCENT_DARK,
 *    ACCENT_LIT, INNER -- the shading pass leaves exactly where you put it.
 *    That is the lever: paint in materials for anything that should catch the
 *    light, and in fixed tones for anything that must not move.
 *  - **Draw back to front.** Anything you draw later covers what came before.
 *    The far legs go down first in SHADE, then the body, then the near legs in
 *    BASE, then the head. Use the `*Front` variants to lay a dark seam under a
 *    mass as it goes down, or two shapes in the same tone weld into one blob
 *    however well they are lit.
 *  - **Nothing thinner than six cells shades.** The banding pass gives a mass
 *    under five cells thick two flat tones and no gradient, so a limb five
 *    cells wide reads as a wire. Seven is the working minimum for anything
 *    that should look round.
 *  - **The outline is two cells and grows outward.** Two masses less than five
 *    cells apart will have their outlines merge into one bar. Leave gaps or
 *    make them touch; do not leave them nearly touching.
 */

import type { Rng } from '../../core/rng.js';
import type { SpeciesData } from '../../data/schema.js';
import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, EMPTY, EYE_DARK, EYE_WHITE,
  HILIGHT, INNER, LIGHT, Mask, OUTLINE, SHADE, SPEC,
} from './mask.js';

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
   * creature; most designs should draw their own with `eyePair` and call
   * `face` instead, because eye shape is most of a creature's character.
   */
  eyes(x: number, y: number, spread: number, size: number, angry?: boolean): void;

  /**
   * Register where the face is without asking for any eyes.
   *
   * Call this exactly once in every design that draws its own eyes. The type
   * character pass uses it to keep leaf blades off the muzzle and gill slits
   * behind the jaw, and without it those features are placed against the
   * bounding box and land in the wrong place.
   */
  face(x: number, y: number, r: number): void;

  /** Skip the type character pass for this species. */
  noTypeTraits(): void;
  /** Skip the automatic surface texture pass for this species. */
  noTexture(): void;
}

/* ------------------------------------------------------------- numbers */

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number): number => v < lo ? lo : v > hi ? hi : v;
/** Smooth 0..1, for width profiles that should swell rather than ramp. */
export const ease = (t: number): number => t * t * (3 - 2 * t);

/* ---------------------------------------------------------- primitives */

/** One cell, unconditionally. */
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

/** A filled ellipse. The workhorse mass. */
export function blob(p: Pen, cx: number, cy: number, rx: number, ry: number, v: number, beneath = false): void {
  p.m.ellipse(cx, cy, rx, ry, v, beneath);
}

/**
 * An ellipse laid *in front of* what is already there, with a dark seam ring
 * pressed into the body around it.
 *
 * A head drawn with `blob` on top of a chest in the same tone is one blob with
 * eyes. The seam is what makes it a head sitting on a chest.
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

/** `taper`, with a dark seam pressed into whatever it is laid across. */
export function taperFront(p: Pen, x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, v: number, seamTone = DEEP, pad = 1): void {
  p.m.limbFront(x0, y0, x1, y1, w0, w1, v, seamTone, pad);
}

/* ------------------------------------------------------------- polygon */

/**
 * A filled polygon, boundary included.
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

/** A polygon laid in front, with a dark seam ring around it. */
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
  /** Lay a dark seam into the body around the limb as it goes down. */
  front?: boolean;
  seam?: number;
  /** Only fill empty cells, so the limb sits behind everything already drawn. */
  beneath?: boolean;
  /** 0 tapers straight from w0 to w1; higher values swell the middle. A real
   *  limb has a muscle belly and a straight taper never looks like one. */
  bulge?: number;
  /** Paint a one-cell lit run along the upper-left flank of the whole limb. */
  lit?: number;
  /** Paint a one-cell dark run along the lower-right flank. */
  dark?: number;
}

/**
 * A tapered limb following a curved path. The backbone of every organic shape
 * here: tails, necks, horns, tentacles, arms, roots, stems.
 */
export function limbPath(p: Pen, pts: Pt[], w0: number, w1: number, v: number, o: LimbOpts = {}): void {
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
 * A crease in a surface: one dark cell with a lit cell riding above it.
 *
 * A single dark line is a scratch. The dark-plus-lit pair is what reads as a
 * fold, and it costs one extra cell.
 */
export function seam(p: Pen, x0: number, y0: number, x1: number, y1: number, dark = DEEP, lit = LIGHT): void {
  stroke(p, x0, y0, x1, y1, dark);
  if (lit >= 0) stroke(p, x0, y0 - 1, x1, y1 - 1, lit);
}

/** `seam`, along a curve. */
export function seamPath(p: Pen, pts: Pt[], dark = DEEP, lit = LIGHT): void {
  const dense = path(pts);
  for (const q of dense) {
    cellOver(p, q[0], q[1], dark);
    if (lit >= 0) cellOver(p, q[0], q[1] - 1, lit);
  }
}

/**
 * A joint crease wrapping a limb, so a leg reads as bending rather than bowing.
 * The crease arcs up towards the outside, which is what makes it read as
 * wrapping a cylinder rather than as a bar laid across one.
 */
export function crease(p: Pen, x: number, y: number, half: number): void {
  const hh = Math.max(1, half);
  for (const side of [-1, 1]) {
    const ey = y - hh * 0.4;
    stroke(p, x, y, x + side * hh, ey, DEEP);
    stroke(p, x, y + 1, x + side * hh, ey + 1, SHADE);
    stroke(p, x, y - 1, x + side * hh, ey - 1, LIGHT);
  }
}

/**
 * Segment rings across a path, each with a lit leading edge.
 *
 * A ring is an overlap, not a scratch: the segment in front of the gap catches
 * light along its whole length. Tails, abdomens and serpent bodies all read as
 * one extruded tube without them.
 */
export function rings(p: Pen, pts: Pt[], count: number, half: number, v = ACCENT_DARK, lit = LIGHT): void {
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
 * A bevelled edge: a lit lip with a dark gutter beneath it.
 *
 * This is what "overlapped" means on a plate, a shell, a scale or a collar --
 * an edge catching the light and the surface behind it disappearing under it.
 * One line of dark alone reads as ruled on.
 */
export function bevel(p: Pen, pts: Pt[], lit = HILIGHT, dark = DEEP): void {
  const dense = path(pts);
  for (const q of dense) {
    cellOver(p, q[0], q[1] - 1, lit);
    cellOver(p, q[0], q[1], dark);
  }
}

/**
 * A pale plate on the front of a mass -- belly, throat, chest -- with segment
 * lines across it. A bare torso reads as a bib; the segments read as an animal.
 */
export function bellyPlate(p: Pen, cx: number, cy: number, rx: number, ry: number, segs = 3): void {
  blob(p, cx, cy, rx, ry, LIGHT);
  for (let i = 1; i <= segs; i++) {
    const t = i / (segs + 1);
    const py = cy - ry + ry * 2 * t;
    const half = rx * Math.sqrt(Math.max(0, 1 - ((py - cy) / ry) ** 2)) * 0.82;
    for (let d = -half; d <= half; d++) cellOver(p, cx + d, py + Math.abs(d) * 0.18, DEEP);
  }
}

/** Random speckle inside a region, one step of tone each. Deterministic. */
export function speckle(p: Pen, x0: number, y0: number, x1: number, y1: number, chance: number, v: number): void {
  for (let y = Math.round(y0); y <= Math.round(y1); y++) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) {
      if (p.rng.next() < chance) cellOver(p, x, y, v);
    }
  }
}

/* ------------------------------------------------------------ legs */

export interface LegOpts {
  /** Body tone for the limb. SHADE for a far leg, BASE for a near one. */
  tone?: number;
  /** Which way the leg faces; -1 leans forward, +1 back. */
  side?: number;
  /** Thickness at the hip and at the ankle. */
  thick?: number;
  ankle?: number;
  /** Lay a seam where the limb meets the body. */
  front?: boolean;
  /** Draw a foot at the bottom. Off if you want to place your own. */
  foot?: boolean;
  /** Foot half-width. Defaults to a little wider than the ankle. */
  footHalf?: number;
  /** Foot tone, when the foot is a different material from the leg -- a hoof,
   *  a root, a talon, a boot. Defaults to the leg tone. */
  footTone?: number;
  /** Claws on the toes. */
  claws?: boolean;
  /** Webbing between the toes. */
  webbed?: boolean;
}

/**
 * A digitigrade leg -- the backwards-bending kind a cat, a dog or a raptor has.
 * Thigh forward, shin back, foot forward again. This shape alone is most of
 * what separates a predator from a plush toy.
 */
export function legDigitigrade(p: Pen, hipX: number, hipY: number, groundY: number, o: LegOpts = {}): void {
  const tone = o.tone ?? BASE, side = o.side ?? -1;
  const th = o.thick ?? 9, an = o.ankle ?? Math.max(4, th * 0.5);
  const len = groundY - hipY;
  const kneeX = hipX + side * len * 0.16, kneeY = hipY + len * 0.40;
  const hockX = hipX - side * len * 0.14, hockY = hipY + len * 0.72;
  const toeX = hockX + side * len * 0.16;
  const f = o.front ? { front: true } : {};
  limbPath(p, [[hipX, hipY], [kneeX, kneeY]], th, th * 0.78, tone, { ...f, bulge: th * 0.14 });
  limbPath(p, [[kneeX, kneeY], [hockX, hockY]], th * 0.78, an, tone);
  limbPath(p, [[hockX, hockY], [toeX, groundY - 2]], an, an * 0.88, tone);
  crease(p, kneeX, kneeY, th * 0.42);
  crease(p, hockX, hockY, an * 0.5);
  if (o.foot !== false) paw(p, toeX, groundY, o.footHalf ?? Math.max(4, an * 0.95), { tone: o.footTone ?? tone, claws: o.claws, webbed: o.webbed });
}

/**
 * A plantigrade leg -- the flat-footed kind a bear, an otter or a person has.
 * Heavier and more settled than digitigrade; use it for anything that sits,
 * stands square or is meant to look slow.
 */
export function legPlantigrade(p: Pen, hipX: number, hipY: number, groundY: number, o: LegOpts = {}): void {
  const tone = o.tone ?? BASE, side = o.side ?? -1;
  const th = o.thick ?? 11, an = o.ankle ?? Math.max(5, th * 0.55);
  const len = groundY - hipY;
  const kneeX = hipX + side * len * 0.22, kneeY = hipY + len * 0.52;
  const ankX = hipX + side * len * 0.06;
  const f = o.front ? { front: true } : {};
  limbPath(p, [[hipX, hipY], [kneeX, kneeY]], th, th * 0.72, tone, { ...f, bulge: th * 0.18 });
  limbPath(p, [[kneeX, kneeY], [ankX, groundY - 3]], th * 0.72, an, tone);
  crease(p, kneeX, kneeY, th * 0.44);
  if (o.foot !== false) {
    // A flat foot is longer than it is wide and reaches forward of the ankle.
    const half = o.footHalf ?? Math.max(5, an);
    paw(p, ankX + side * half * 0.35, groundY, half, { tone: o.footTone ?? tone, claws: o.claws, webbed: o.webbed, long: true });
  }
}

/**
 * A braced column leg: short, thick, splayed outward, planted.
 *
 * For anything squat -- a tortoise, a stump, a bud, a boulder with feet. The
 * splay is the read: a vertical cylinder is furniture, a leaning one is weight.
 */
export function legColumn(p: Pen, topX: number, topY: number, groundY: number, o: LegOpts = {}): void {
  const tone = o.tone ?? BASE, side = o.side ?? -1;
  const th = o.thick ?? 13;
  const footX = topX + side * (groundY - topY) * 0.26;
  const f = o.front ? { front: true } : {};
  limbPath(p, [[topX, topY], [topX + side * (groundY - topY) * 0.10, topY + (groundY - topY) * 0.5], [footX, groundY - 3]],
    th, th * 1.02, tone, { ...f });
  if (o.foot !== false) paw(p, footX, groundY, o.footHalf ?? Math.max(6, th * 0.7), { tone: o.footTone ?? tone, claws: o.claws, webbed: o.webbed, toes: 3 });
}

export interface PawOpts {
  tone?: number;
  /** How many toes. Three reads as a beast, four as a paw, two as a hoofed
   *  thing, five as a hand. */
  toes?: number;
  claws?: boolean;
  webbed?: boolean;
  /** A long flat foot rather than a compact pad. */
  long?: boolean;
  /** Claw tone. ACCENT_LIT survives the shading pass, which is why a claw on a
   *  shadowed foot still reads. */
  clawTone?: number;
}

/**
 * A planted foot with separated toes.
 *
 * Toes are what stop a leg ending in a bar, and a bar is the loudest tell in
 * generated art. Each toe gets a gap of dark beside it, a knuckle highlight on
 * its upper left, and -- optionally -- a claw that is a *shape*: dark root, lit
 * body, point.
 */
export function paw(p: Pen, x: number, y: number, half: number, o: PawOpts = {}): void {
  const hw = Math.max(2.5, half), tone = o.tone ?? BASE;
  const depth = o.long ? hw * 1.25 : hw * 0.75;
  const dark = tone === SHADE;
  blob(p, x, y - depth * 0.35, hw, depth * 0.8, tone);
  rect(p, x - hw, y - depth * 0.4, x + hw, y, tone);
  // The heel rolls under: a dark run along the very bottom so the pad has a
  // near edge rather than being sliced off flat by the ground line.
  stroke(p, x - hw, y + 1, x + hw, y + 1, DEEP);

  const toes = o.toes ?? (hw >= 6 ? 4 : 3);
  const pitch = (hw * 2) / toes;
  for (let i = 0; i < toes; i++) {
    const tx = x - hw + pitch * (i + 0.5);
    if (i > 0) stroke(p, tx - pitch / 2, y - depth * 0.55, tx - pitch / 2, y + 1, DEEP);
    if (o.webbed && i > 0) {
      // A web is a shallow sag between two toes, one tone down from the pad.
      stroke(p, tx - pitch / 2, y - depth * 0.5, tx - pitch / 2, y - depth * 0.2, SHADE);
    }
    cellOver(p, tx - 0.6, y - depth * 0.6, dark ? BASE : LIGHT);
    if (o.claws !== false) {
      const ct = o.clawTone ?? ACCENT_LIT;
      cell(p, tx, y + 1, ACCENT_DARK);
      cell(p, tx, y, ct);
      cell(p, tx - 1, y + 1, ACCENT);
    }
  }
}

/** One claw, grown outward from a point along a direction. */
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
 * A hand that can grip: a palm mass, fingers with knuckle creases, and an
 * opposed thumb. The thumb is the whole read -- three sausages without one is
 * a mitten.
 */
export function hand(p: Pen, x: number, y: number, r: number, o: HandOpts = {}): void {
  const tone = o.tone ?? BASE, side = o.side ?? -1, n = o.fingers ?? 3;
  blobFront(p, x, y, r, r * 1.05, tone);
  if (o.fist) {
    for (let i = 0; i < n; i++) {
      const fy = y - r * 0.6 + (r * 1.3 * (i + 0.5)) / n;
      stroke(p, x - r * 0.9, fy, x + r * 0.55, fy, DEEP);
      stroke(p, x - r * 0.9, fy - 1, x + r * 0.55, fy - 1, LIGHT);
    }
    cell(p, x - side * r * 0.8, y - r * 0.7, HILIGHT);
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
  // The gaps. Drawn after every digit is down, because a gap cut before the
  // next finger goes on top of it is a gap that no longer exists -- which is
  // why the first version of this helper produced mittens.
  for (let i = 1; i < n; i++) {
    const am = (angOf(i - 1) + angOf(i)) / 2, l = Math.min(lenOf(i - 1), lenOf(i));
    stroke(p, x + Math.cos(am) * r * 0.15, y + Math.sin(am) * r * 0.15,
      x + Math.cos(am) * l * 1.02, y + Math.sin(am) * l * 1.02, DEEP);
  }
  for (let i = 0; i < n; i++) {
    const ang = angOf(i), flen = lenOf(i);
    const tipX = x + Math.cos(ang) * flen, tipY = y + Math.sin(ang) * flen;
    // Knuckle: one lit cell on the light side of each digit, halfway up.
    cellOver(p, x + Math.cos(ang) * flen * 0.55 - 1, y + Math.sin(ang) * flen * 0.55, HILIGHT);
    if (o.claws) claw(p, tipX, tipY, 3, Math.cos(ang), Math.sin(ang));
  }
  // Opposed thumb, low and on the near side. Without it this is a mitten
  // however many fingers are on it.
  const tang = side < 0 ? -Math.PI * 0.02 : Math.PI * 1.02;
  const thX = x - side * r * 1.05, thY = y + r * 0.45;
  limbPath(p, [[x, y + r * 0.2], [thX, thY]], r * 0.6, r * 0.44, tone, { front: true });
  if (o.claws) claw(p, thX, thY, 3, Math.cos(tang), Math.sin(tang));
  blob(p, x, y + r * 0.1, r * 0.5, r * 0.55, tone === SHADE ? SHADE : LIGHT);
  stroke(p, x - r * 0.5, y + r * 0.5, x + r * 0.5, y + r * 0.45, DEEP);
}

/* ------------------------------------------------------------- heads */

export interface MuzzleOpts {
  /** -1 points the snout left, +1 right. */
  dir?: number;
  tone?: number;
  /** Draw the mouth, nostril and bridge. Off for the rear view. */
  detail?: boolean;
  /** Fangs at the corners of the closed jaw. */
  fangs?: boolean;
  /** How far the mouth line turns down (negative turns it up into a smile). */
  frown?: number;
}

/**
 * A snout pushed forward of the skull: a bridge plane along the top, a nostril
 * cavity with a lit lip under it, and a mouth line that turns at the corners.
 *
 * A head that is one flat ellipse reads as a ball with eyes stuck on it however
 * carefully it is lit. This is the cheapest fix there is.
 */
export function muzzle(p: Pen, x: number, y: number, rx: number, ry: number, o: MuzzleOpts = {}): void {
  const dir = o.dir ?? -1, rxx = Math.max(2, rx), ryy = Math.max(1.5, ry);
  blobFront(p, x, y, rxx, ryy, o.tone ?? LIGHT);
  if (o.detail === false) return;
  stroke(p, x - rxx, y - ryy * 0.6, x + rxx * 0.4, y - ryy * 0.6, HILIGHT);
  nostril(p, x + dir * rxx * 0.5, y - ryy * 0.3, dir);
  mouthLine(p, x, y + Math.max(1.5, ryy * 0.55), rxx * 0.85, o.frown ?? 1, o.fangs);
}

/** A nostril: a cavity with a lit lip under it, which is the difference between
 *  a nostril and a dirty mark. */
export function nostril(p: Pen, x: number, y: number, dir = -1): void {
  cellOver(p, x, y, INNER);
  cellOver(p, x + dir, y, INNER);
  cellOver(p, x, y + 1, LIGHT);
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
  stroke(p, x - h + 1, y + 1, x + h - 1, y + 1, h >= 5 ? ACCENT_DARK : INNER);
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
 * mostly a hole -- the cavity has to be INNER, not shadow, or it reads as a
 * bite taken out of the head.
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

/** A row of triangular teeth. `dir` +1 points them down, -1 up. */
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
  tone?: number;
  /** Hooked at the tip, like a raptor. */
  hooked?: boolean;
  /** Split into an upper and a lower mandible with a gap. */
  open?: number;
}

/** A beak with a nostril and a cere line where it meets the face. */
export function beak(p: Pen, x: number, y: number, len: number, depth: number, o: BeakOpts = {}): void {
  const dir = o.dir ?? -1, tone = o.tone ?? ACCENT;
  const tipX = x + dir * len, tipY = y + depth * (o.hooked ? 0.55 : 0.15);
  poly(p, [[x, y - depth * 0.55], [tipX, tipY], [x, y + depth * 0.5]], tone);
  if (o.hooked) poly(p, [[tipX, tipY], [tipX + dir * 2, tipY + depth * 0.45], [tipX - dir * 2, tipY + depth * 0.2]], ACCENT_DARK);
  if (o.open) {
    poly(p, [[x, y + depth * (0.5 + o.open * 0.5)], [x + dir * len * 0.8, tipY + depth * o.open],
      [x, y + depth * (0.25 + o.open * 0.4)]], tone);
    stroke(p, x, y + depth * 0.35, x + dir * len * 0.8, tipY + depth * 0.1, INNER, false);
  } else {
    stroke(p, x, y + depth * 0.12, tipX, tipY - depth * 0.05, DEEP);
  }
  stroke(p, x, y - depth * 0.5, x + dir * len * 0.45, y - depth * 0.35, ACCENT_LIT);
  // Cere and nostril, up near the face where a bird's actually is.
  stroke(p, x - dir, y - depth * 0.55, x - dir, y + depth * 0.5, ACCENT_DARK);
  cellOver(p, x + dir * len * 0.22, y - depth * 0.2, INNER);
}

/** Whiskers: fine lines springing from the cheek. Drawn free of the body, so
 *  the outline pass gives each one its own ink. */
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

export interface EarOpts {
  tone?: number;
  /** Inner-ear tone. INNER is a cavity; ACCENT makes it a coloured ear. */
  inner?: number;
  /** Lay a seam where the ear meets the skull. */
  front?: boolean;
  /** Fur along the ear's leading edge. */
  tufted?: boolean;
}

/** A pointed ear leaning `lean` cells sideways over `len` cells of height. */
export function earPointed(p: Pen, x: number, y: number, len: number, lean: number, side: number, o: EarOpts = {}): void {
  const tone = o.tone ?? BASE, w = Math.max(4, len * 0.55);
  const tip: Pt = [x + side * lean, y - len];
  polyFront(p, [[x - w * 0.5, y + 1], [x + w * 0.6, y], tip], tone, DEEP, o.front ? 1.5 : 0);
  poly(p, [[x - w * 0.15, y - 1], [x + w * 0.3, y - 2], [tip[0] + side * -0.5, tip[1] + len * 0.35]], o.inner ?? INNER);
  stroke(p, x - w * 0.5, y, tip[0], tip[1], HILIGHT, true);
  if (o.tufted) for (let i = 1; i < 4; i++) {
    const t = i / 4;
    tuft(p, lerp(x - w * 0.5, tip[0], t), lerp(y, tip[1], t), 3, Math.PI + side * 0.6, 0.5, tone);
  }
}

/** A round ear: a disc with a coloured bowl inside it. */
export function earRound(p: Pen, x: number, y: number, r: number, side: number, o: EarOpts = {}): void {
  blobFront(p, x, y, r, r * 1.05, o.tone ?? BASE, DEEP, o.front ? 1.5 : 0);
  // The bowl stays under half the ear. Filled to two thirds -- which looks
  // right on paper -- a small ear comes out as a hole punched in the skull.
  blob(p, x + side * r * 0.18, y + r * 0.16, r * 0.5, r * 0.55, o.inner ?? INNER);
  // A lit rim on the near lip, so the bowl has an edge to be inside of.
  for (const q of arc(x + side * r * 0.18, y + r * 0.16, r * 0.62, r * 0.68, Math.PI * 0.9, Math.PI * 1.9, 10)) {
    cellOver(p, q[0], q[1], HILIGHT);
  }
  cellOver(p, x - r * 0.55, y - r * 0.55, HILIGHT);
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
  polyFront(p, [[x - w, y + 1], [x + w, y + 1], [x + side * w * 1.3, y - len * 0.55]], tone, DEEP, o.front ? 1.5 : 0);
  for (let i = -1; i <= 1; i++) {
    const lean = side * (w * 0.5 + i * w * 0.9);
    const l = len * (1 - Math.abs(i) * 0.24);
    poly(p, [[x - w * 0.7, y + 1], [x + w * 0.7, y + 1], [x + lean, y - l]], i === 1 ? SHADE : tone);
  }
  stroke(p, x - w * 0.6, y, x + side * w * 0.5 - w * 0.4, y - len, HILIGHT, true);
  stroke(p, x + w * 0.5, y, x + side * w * 1.4, y - len * 0.72, DEEP, true);
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

/** A tapered horn along a curve, with growth rings, a lit leading edge and a
 *  bright tip. */
export function horn(p: Pen, x: number, y: number, len: number, side: number, o: HornOpts = {}): void {
  const curl = o.curl ?? len * 0.35, th = o.thick ?? Math.max(3, len * 0.32);
  const pts: Pt[] = [[x, y], [x + side * curl * 0.35, y - len * 0.45], [x + side * curl, y - len * 0.85], [x + side * curl * 1.5, y - len]];
  const dense = path(pts);
  limbPath(p, dense, th, 1.2, o.tone ?? ACCENT, { front: true, lit: ACCENT_LIT, dark: ACCENT_DARK });
  if (o.ringed !== false) rings(p, dense, Math.max(2, Math.round(len / 6)), th * 0.55, ACCENT_DARK, ACCENT_LIT);
  const tip = dense[dense.length - 1]!;
  cell(p, tip[0], tip[1], ACCENT_LIT);
  cell(p, tip[0], tip[1] - 1, ACCENT_LIT);
}

/** An antler: a curved main beam with tines branching off it. */
export function antler(p: Pen, x: number, y: number, len: number, tines: number, side: number, o: HornOpts = {}): void {
  const tone = o.tone ?? ACCENT;
  const beam = path([[x, y], [x + side * len * 0.2, y - len * 0.4], [x + side * len * 0.5, y - len * 0.78], [x + side * len * 0.62, y - len]]);
  limbPath(p, beam, o.thick ?? 4, 1.4, tone, { front: true, lit: ACCENT_LIT, dark: ACCENT_DARK });
  for (let i = 0; i < tines; i++) {
    const t = 0.3 + (i / Math.max(1, tines)) * 0.55;
    const q = beam[Math.round(t * (beam.length - 1))]!;
    const tl = len * (0.4 - i * 0.06);
    limbPath(p, [[q[0], q[1]], [q[0] + side * tl * 0.25, q[1] - tl * 0.7], [q[0] + side * tl * 0.55, q[1] - tl]], 3, 1.2, tone, { lit: ACCENT_LIT });
  }
}

/** Triangular spines riding a path, tallest in the middle. */
export function spineRow(p: Pen, pts: Pt[], count: number, len: number, v = ACCENT, lit = ACCENT_LIT): void {
  const dense = path(pts);
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const q = dense[Math.round(t * (dense.length - 1))]!;
    const n = normalAt(dense, Math.round(t * (dense.length - 1)));
    const l = len * (0.55 + Math.sin(t * Math.PI) * 0.7);
    const base = Math.max(2, l * 0.42);
    poly(p, [[q[0] - n[1] * base, q[1] + n[0] * base], [q[0] + n[1] * base, q[1] - n[0] * base],
      [q[0] + n[0] * l, q[1] + n[1] * l]], v);
    stroke(p, q[0] - n[1] * base, q[1] + n[0] * base, q[0] + n[0] * l, q[1] + n[1] * l, lit, true);
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

/**
 * A fur mass with a jagged outer edge, laid along a path.
 *
 * This is how a mane, a ruff, a shoulder coat or a chest tuft is made. The jag
 * pattern alternates long and short so the edge reads as clumps of hair rather
 * than as a saw blade, and the tips carry a lit run because that is where the
 * light catches a coat.
 */
export function mane(p: Pen, pts: Pt[], depth: number, clumps: number, v = BASE, lit = HILIGHT): void {
  const dense = path(pts);
  const outer: Pt[] = [];
  for (let i = 0; i < dense.length; i++) {
    const t = i / Math.max(1, dense.length - 1);
    const n = normalAt(dense, i);
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
  // Root shadow where the coat meets the skin, clump points catching the light.
  for (const q of dense) cellOver(p, q[0], q[1], DEEP);
  for (let i = 0; i < clumps; i++) {
    const idx = Math.round(((i + 0.5) / clumps) * (dense.length - 1));
    const tip = outer[idx]!, root = dense[idx]!;
    cellOver(p, tip[0], tip[1], lit);
    cellOver(p, lerp(root[0], tip[0], 0.75), lerp(root[1], tip[1], 0.75), lit);
    // A strand line down the middle of every other clump, so the mass has
    // depth. Every clump and the coat comes out looking combed.
    if (i % 2 === 0) stroke(p, lerp(root[0], tip[0], 0.15), lerp(root[1], tip[1], 0.15), lerp(root[0], tip[0], 0.8), lerp(root[1], tip[1], 0.8), DEEP);
  }
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

/** An almond leaf blade with a midrib and side veins. Grows from (x,y) at
 *  angle `ang`, `len` long and `wide` across at its widest. */
export function leaf(p: Pen, x: number, y: number, len: number, ang: number, wide: number, v = ACCENT): void {
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
  poly(p, pts, v);
  // Midrib dark, the leading edge lit, side veins angled back toward the stem.
  stroke(p, x, y, x + ux * len, y + uy * len, ACCENT_DARK);
  for (let i = 1; i <= 9; i++) {
    const t = i / 10, w = Math.sin(t * Math.PI) ** 0.72 * wide;
    cellOver(p, x + ux * len * t + nx * w, y + uy * len * t + ny * w, ACCENT_LIT);
    if (i % 3 === 1 && w > 1.5) {
      const bx = x + ux * len * t, by = y + uy * len * t;
      stroke(p, bx, by, bx + nx * w * 0.7 - ux * w * 0.4, by + ny * w * 0.7 - uy * w * 0.4, ACCENT_DARK);
      stroke(p, bx, by, bx - nx * w * 0.7 - ux * w * 0.4, by - ny * w * 0.7 - uy * w * 0.4, ACCENT_DARK);
    }
  }
}

/**
 * A scalloped collar or frill along a path -- lobed rather than jagged, each
 * lobe with a bevelled lit lip. For ruffs, gills, petal skirts and fungus caps.
 */
export function frill(p: Pen, pts: Pt[], depth: number, lobes: number, v = ACCENT): void {
  const dense = path(pts);
  const outer: Pt[] = dense.map((q, i) => {
    const t = i / Math.max(1, dense.length - 1);
    const n = normalAt(dense, i);
    const d = depth * (0.65 + 0.35 * Math.abs(Math.sin(t * Math.PI * lobes)));
    return [q[0] + n[0] * d, q[1] + n[1] * d] as Pt;
  });
  poly(p, [...dense, ...outer.slice().reverse()], v);
  for (let i = 0; i < lobes; i++) {
    const idx = Math.round(((i + 0.5) / lobes) * (dense.length - 1));
    stroke(p, dense[idx]![0], dense[idx]![1], outer[idx]![0], outer[idx]![1], ACCENT_DARK);
  }
  for (let i = 0; i < outer.length; i++) {
    cellOver(p, outer[i]![0], outer[i]![1] - 1, ACCENT_LIT);
  }
}

/* -------------------------------------------------------------- armour */

/**
 * One carapace plate: a filled polygon with a lit bevel along its upper edge
 * and a dark gutter under its lower one. Stack them and they overlap.
 */
export function plate(p: Pen, pts: Pt[], v = ACCENT): void {
  poly(p, pts, v);
  // Whichever edges face up get the bevel; whichever face down get the gutter.
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    const upward = mid[1] < cy;
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, qx = lerp(a[0], b[0], t), qy = lerp(a[1], b[1], t);
      cellOver(p, qx, qy + (upward ? 1 : -1), upward ? ACCENT_LIT : ACCENT_DARK);
    }
  }
}

/**
 * A domed shell of overlapping plates: a central boss with a ring of scutes
 * around it, each bevelled. The single most legible "armoured" read there is.
 */
export function shell(p: Pen, cx: number, cy: number, rx: number, ry: number, scutes: number, v = ACCENT): void {
  blobFront(p, cx, cy, rx, ry, v);
  blob(p, cx - rx * 0.18, cy - ry * 0.16, rx * 0.44, ry * 0.46, ACCENT_LIT);
  blob(p, cx - rx * 0.18, cy - ry * 0.16, rx * 0.36, ry * 0.38, v);
  for (let i = 0; i < scutes; i++) {
    const a = (i / scutes) * Math.PI * 2;
    const ax = cx + Math.cos(a) * rx * 0.42, ay = cy + Math.sin(a) * ry * 0.44;
    const bx = cx + Math.cos(a) * rx * 1.02, by = cy + Math.sin(a) * ry * 1.02;
    stroke(p, ax, ay, bx, by, ACCENT_DARK);
    stroke(p, ax, ay - 1, bx, by - 1, ACCENT_LIT);
  }
  // Rim: the shell has a lip and the body disappears under it.
  for (const q of arc(cx, cy, rx, ry, 0, Math.PI * 2, 60)) cellOver(p, q[0], q[1] + 1, DEEP);
}

/* ------------------------------------------------------- wings & fins */

export interface WingOpts {
  tone?: number;
  /** -1 for a wing on the left, +1 on the right. */
  side?: number;
  /** Folded against the body rather than spread. */
  folded?: boolean;
  feathers?: number;
  /** Lay a seam where the wing meets the shoulder. */
  front?: boolean;
}

/**
 * A feathered wing: a covert mass at the shoulder, then a fan of primaries,
 * each a long tapered lozenge with its own shaft and a lit leading edge.
 *
 * Folded, it is a swept teardrop with three feather tips showing at the trailing
 * end -- which is what a bird at rest actually looks like and what a "wing"
 * drawn as one lump never does.
 */
export function wingFeathered(p: Pen, x: number, y: number, len: number, o: WingOpts = {}): void {
  const tone = o.tone ?? BASE, side = o.side ?? 1, n = o.feathers ?? 5;
  if (o.folded) {
    // A swept teardrop lying along the flank, with three primary tips showing
    // past its trailing end. That overhang is the read: a folded wing that
    // stops in a clean curve is a cape.
    const tipX = x + side * len * 0.24, tipY = y + len * 0.58;
    polyFront(p, [[x - side * len * 0.26, y - len * 0.2], [x + side * len * 0.3, y + len * 0.06],
      [tipX + side * len * 0.06, tipY], [x - side * len * 0.18, y + len * 0.42]], tone, DEEP, o.front ? 1.5 : 0);
    // A lit leading edge along the top of the folded wing.
    stroke(p, x - side * len * 0.24, y - len * 0.16, x + side * len * 0.26, y + len * 0.06, HILIGHT);
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
    stroke(p, lerp(wristX, tp[0], 0.3), lerp(wristY, tp[1], 0.3), tp[0], tp[1], i % 2 ? BASE : HILIGHT);
  }
  // Coverts: the rounded mass of small feathers over the shoulder and wrist.
  polyFront(p, [[x - side * len * 0.2, y - len * 0.06], [x + side * len * 0.06, y - len * 0.28],
    [wristX + side * len * 0.04, wristY - len * 0.02], [wristX - side * len * 0.04, wristY + len * 0.22],
    [x + side * len * 0.02, y + len * 0.2]], tone, DEEP, o.front ? 1.5 : 0);
  for (let i = 0; i < 3; i++) {
    const t = 0.24 + i * 0.26;
    stroke(p, lerp(x, wristX, t) - side * len * 0.09, lerp(y, wristY, t) + len * 0.05,
      lerp(x, wristX, t) + side * len * 0.07, lerp(y, wristY, t) + len * 0.14, DEEP);
  }
  limbPath(p, [[x, y], [x + side * len * 0.24, y - len * 0.22], [wristX, wristY]], len * 0.2, len * 0.13, tone,
    { front: true, lit: HILIGHT, dark: DEEP });
}

/**
 * A membrane wing: an arm out to a wrist, three or four finger struts fanning
 * from it, and a membrane sagging between them in concave scallops.
 *
 * The scallops matter more than the fingers. A membrane stretched on straight
 * chords reads as a kite; the sag is what makes it skin.
 */
export function wingMembrane(p: Pen, x: number, y: number, len: number, o: WingOpts = {}): void {
  const tone = o.tone ?? SHADE, side = o.side ?? 1, n = o.feathers ?? 4;
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
  if (o.front) polyFront(p, edge, tone); else poly(p, edge, tone);
  for (const t of tips) {
    limbPath(p, [[wristX, wristY], [t[0], t[1]]], 3.6, 1.6, ACCENT_DARK);
    stroke(p, wristX - side, wristY, t[0] - side, t[1], ACCENT_LIT);
  }
  limbPath(p, [[x, y], [lerp(x, wristX, 0.5), lerp(y, wristY, 0.5) - len * 0.06], [wristX, wristY]],
    len * 0.19, len * 0.11, tone === SHADE ? BASE : tone, { front: true, lit: HILIGHT, dark: DEEP });
  blob(p, wristX, wristY, len * 0.1, len * 0.1, tone === SHADE ? BASE : tone);
}

export interface FinOpts {
  tone?: number;
  rays?: number;
  /** Tone for the ray struts. */
  ray?: number;
  /** Lay a seam where the fin meets the body. */
  front?: boolean;
}

/**
 * A fin: a polygon of membrane with visible rays converging on a root.
 *
 * `edge` is the free outline of the fin, `root` the point every ray runs back
 * to. A web with no struts in it is a paddle, and the struts are the whole
 * read -- so they are drawn last and never skipped.
 */
export function fin(p: Pen, root: Pt, edge: Pt[], o: FinOpts = {}): void {
  const tone = o.tone ?? ACCENT, n = o.rays ?? 5;
  const dense = path(edge);
  const shape: Pt[] = [root, ...dense];
  if (o.front) polyFront(p, shape, tone); else poly(p, shape, tone);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const q = dense[Math.round(t * (dense.length - 1))]!;
    // Stop a cell short of the free edge, or the rays eat the membrane.
    const ex = lerp(root[0], q[0], 0.92), ey = lerp(root[1], q[1], 0.92);
    stroke(p, lerp(root[0], q[0], 0.12), lerp(root[1], q[1], 0.12), ex, ey, o.ray ?? ACCENT_DARK);
    stroke(p, lerp(root[0], q[0], 0.12) - 1, lerp(root[1], q[1], 0.12), ex - 1, ey, ACCENT_LIT);
  }
}

/**
 * A broad flat paddle -- an otter's tail, a beaver's, a fluke -- with a central
 * ridge, rays fanning to a scalloped edge, and a lit upper face.
 */
export function paddle(p: Pen, x: number, y: number, len: number, wide: number, ang: number, v = ACCENT): void {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const pts: Pt[] = [];
  const prof = (t: number): number => Math.sin(Math.min(1, t * 1.12) * Math.PI) ** 0.55 * wide * (0.55 + t * 0.55);
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, w = prof(t);
    pts.push([x + ux * len * t + nx * w, y + uy * len * t + ny * w]);
  }
  for (let i = 12; i >= 0; i--) {
    const t = i / 12, w = prof(t);
    pts.push([x + ux * len * t - nx * w, y + uy * len * t - ny * w]);
  }
  polyFront(p, pts, v);
  // Central ridge, then rays out to the edge on both sides.
  stroke(p, x, y, x + ux * len * 0.95, y + uy * len * 0.95, ACCENT_DARK);
  stroke(p, x - ny, y + nx, x + ux * len * 0.95 - ny, y + uy * len * 0.95 + nx, ACCENT_LIT);
  for (let i = 2; i <= 10; i += 2) {
    const t = i / 12, w = prof(t) * 0.85;
    const bx = x + ux * len * t * 0.6, by = y + uy * len * t * 0.6;
    for (const s of [-1, 1]) {
      stroke(p, bx, by, x + ux * len * t + nx * w * s, y + uy * len * t + ny * w * s, ACCENT_DARK);
    }
  }
  // Scalloped rim: a paddle's edge is lobed, never a clean arc.
  for (let i = 0; i <= 12; i += 2) {
    const t = i / 12, w = prof(t);
    for (const s of [-1, 1]) cellOver(p, x + ux * len * t + nx * w * s, y + uy * len * t + ny * w * s - 1, ACCENT_LIT);
  }
}

/* -------------------------------------------------------------- tails */

export interface TailOpts {
  tone?: number;
  thick?: number;
  tip?: number;
  front?: boolean;
  /** Plume only: the tone of the far side of the fur, laid down first. */
  far?: number;
  /** Plume only: the tone that catches the light on the clump tips. */
  edgeLit?: number;
  /** Plume only: skip the bright ball on the end. */
  plainTip?: boolean;
}

/** A tapered tail curving along a path, with a lit and a dark flank. */
export function tailCurl(p: Pen, pts: Pt[], o: TailOpts = {}): void {
  limbPath(p, pts, o.thick ?? 9, o.tip ?? 2.5, o.tone ?? ACCENT,
    { front: o.front ?? true, bulge: 1, lit: HILIGHT, dark: DEEP });
}

/** A tail with segment rings along it: reptile, insect, mineral. */
export function tailSegmented(p: Pen, pts: Pt[], segs: number, o: TailOpts = {}): void {
  const th = o.thick ?? 10;
  const dense = path(pts);
  limbPath(p, dense, th, o.tip ?? 3, o.tone ?? BASE, { front: o.front ?? true });
  rings(p, dense, segs, th * 0.55, ACCENT_DARK, LIGHT);
}

/**
 * A big fur plume: a curving core with a jagged fur mass on both sides.
 * The signature of anything meant to look fast, hot or vain.
 */
export function tailPlume(p: Pen, pts: Pt[], depth: number, clumps: number, o: TailOpts = {}): void {
  const dense = path(pts);
  const tone = o.tone ?? ACCENT;
  const far = o.far ?? (tone === ACCENT ? ACCENT_DARK : SHADE);
  const lit = o.edgeLit ?? ACCENT_LIT;
  // The far side goes down first and darker so the plume has two faces.
  mane(p, offsetPath(dense, -1.5), depth * 0.78, clumps, far, far);
  limbPath(p, dense, o.thick ?? 10, o.tip ?? 4, tone, { front: o.front ?? true });
  mane(p, dense, depth, clumps, tone, lit);
  if (o.plainTip) return;
  const tip = dense[dense.length - 1]!;
  blob(p, tip[0], tip[1], depth * 0.5, depth * 0.5, lit);
  blob(p, tip[0] + 1, tip[1] + 1, depth * 0.34, depth * 0.34, tone);
}

/** A tail ending in a rayed fin. */
export function tailFinned(p: Pen, pts: Pt[], finLen: number, o: TailOpts = {}): void {
  const dense = path(pts);
  limbPath(p, dense, o.thick ?? 9, o.tip ?? 3, o.tone ?? BASE, { front: o.front ?? true });
  const tip = dense[dense.length - 1]!, prev = dense[Math.max(0, dense.length - 6)]!;
  const dx = tip[0] - prev[0], dy = tip[1] - prev[1], d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  fin(p, [tip[0], tip[1]], [
    [tip[0] + ux * finLen * 0.4 + nx * finLen, tip[1] + uy * finLen * 0.4 + ny * finLen],
    [tip[0] + ux * finLen * 1.05, tip[1] + uy * finLen * 1.05],
    [tip[0] + ux * finLen * 0.4 - nx * finLen, tip[1] + uy * finLen * 0.4 - ny * finLen],
  ], { rays: 5 });
}

/* --------------------------------------------------------------- eyes */

export type EyeStyle = 'round' | 'slit' | 'hooded' | 'compound' | 'sleepy' | 'angry';

export interface EyeOpts {
  /** -1 for the eye nearer the light, +1 for the far one. Sets which way the
   *  pupil converges. The glint always lands upper-left regardless. */
  side?: number;
  /**
   * Iris tone. Defaults to ACCENT_DARK.
   *
   * IMPORTANT: everything inside an eye must be painted in a tone the shading
   * pass leaves alone -- ACCENT_DARK, ACCENT_LIT, EYE_DARK, EYE_WHITE, INNER.
   * Paint an iris in plain ACCENT and the banding pass will light it like a
   * shoulder and the eye comes out looking bruised.
   */
  iris?: number;
  sclera?: number;
  /** Lid tone for hooded and sleepy eyes. Body colour by default, so it shades
   *  with the head and reads as skin. */
  lid?: number;
  /** Skip the hard socket ring, for an eye set into something that already
   *  has its own dark rim -- a mask marking, a helmet slot, a shell notch. */
  bare?: boolean;
}

/**
 * One eye.
 *
 * Eye shape is most of a creature's character and no two species on this roster
 * should share one. The proportions matter more than the size: a mostly-dark
 * eye with a single bright glint reads as an animal looking at you, while a
 * mostly-white eye with a dot in it reads as a doll.
 *
 * `r` is the horizontal half-width. Six is a large expressive eye on a
 * 110-cell creature; three is a small mean one.
 */
export function eye(p: Pen, x: number, y: number, r: number, style: EyeStyle = 'round', o: EyeOpts = {}): void {
  const side = o.side ?? -1;
  const iris = o.iris ?? ACCENT_DARK;
  const sclera = o.sclera ?? EYE_WHITE;
  const glint = (gx: number, gy: number, g: number): void => {
    // Square-cornered on purpose: a round glint at this size is a smudge.
    p.m.box(Math.round(gx) - g, Math.round(gy) - g, Math.round(gx), Math.round(gy), EYE_WHITE);
  };

  switch (style) {
    case 'slit': {
      // Cat, reptile, predator. The whole opening is iris and the pupil is a
      // hard vertical bar through it -- almost no white at all, which is the
      // difference between an eye that hunts and an eye that is startled.
      const w = r * 1.32, h = r * 0.86;
      const alm: Pt[] = [[x - w, y + r * 0.12], [x - w * 0.35, y - h], [x + w * 0.45, y - h * 0.88],
        [x + w, y - r * 0.02], [x + w * 0.4, y + h * 0.92], [x - w * 0.45, y + h]];
      if (!o.bare) poly(p, alm.map((q) => [q[0] + Math.sign(q[0] - x) * 1.3, q[1] + Math.sign(q[1] - y) * 1.3]), OUTLINE);
      poly(p, alm, iris);
      // Lid shadow across the top third of the iris, and a lit floor along the
      // bottom. The pair is what gives a flat coloured almond any depth at all.
      //
      // The floor has to be *brighter* than the iris, which is why it is picked
      // rather than fixed: a design that already asked for the bright accent as
      // its iris got the dark one back here, and the eyes came out as black
      // slots. Never assume which end of the ramp a caller started from.
      poly(p, alm.map((q) => [lerp(x, q[0], 0.86), lerp(y - r * 0.72, q[1], 0.42)]), ACCENT_DARK);
      poly(p, alm.map((q) => [lerp(x, q[0], 0.74), lerp(y + r * 0.78, q[1], 0.3)]), iris === ACCENT_LIT ? SPEC : ACCENT_LIT);
      const pw = Math.max(1, r * 0.21);
      rect(p, x - side * r * 0.1 - pw, y - h * 0.92, x - side * r * 0.1 + pw, y + h * 0.92, EYE_DARK);
      // A sliver of white in the inner corner, where the sclera actually shows.
      // Small: this eye is meant to be almost all iris, and every cell of white
      // added to it walks it back towards looking startled.
      poly(p, [[x - w * 0.94, y + r * 0.12], [x - w * 0.72, y - h * 0.34], [x - w * 0.74, y + h * 0.46]], EYE_WHITE);
      polyLine(p, alm, EYE_DARK, true, true);
      glint(x - r * 0.5, y - r * 0.32, 1);
      cell(p, x + r * 0.6, y + r * 0.3, ACCENT_LIT);
      break;
    }

    case 'compound': {
      // Insect. A domed lens with a lattice in it and one enormous soft
      // catchlight, which is the only way a faceted eye reads at this size.
      if (!o.bare) blob(p, x, y, r + 1.3, r * 1.2 + 1.3, OUTLINE);
      blob(p, x, y, r, r * 1.2, ACCENT_DARK);
      for (let dy = -Math.ceil(r * 1.2); dy <= r * 1.2; dy++) {
        for (let dx = -Math.ceil(r); dx <= r; dx++) {
          if ((dx / r) ** 2 + (dy / (r * 1.2)) ** 2 > 1) continue;
          if (((dx + (dy & 1) * 1) % 3 + 3) % 3 === 0 && (dy % 2 === 0)) cell(p, x + dx, y + dy, ACCENT);
        }
      }
      blob(p, x - r * 0.35, y - r * 0.45, r * 0.42, r * 0.42, ACCENT_LIT);
      glint(x - r * 0.35, y - r * 0.5, Math.max(1, Math.round(r * 0.28)));
      break;
    }

    case 'hooded': {
      // Calm, stubborn, ancient. A full eye with a heavy brow lid across the
      // top third, and a lash line under the lid.
      if (!o.bare) blob(p, x, y, r + 1.3, r * 1.2 + 1.3, OUTLINE);
      blob(p, x, y, r, r * 1.2, sclera);
      blob(p, x - side * r * 0.1, y + r * 0.1, r * 0.86, r * 1.0, EYE_DARK);
      blob(p, x - side * r * 0.1, y + r * 0.1, r * 0.68, r * 0.82, iris);
      blob(p, x - side * r * 0.12, y + r * 0.14, r * 0.34, r * 0.44, EYE_DARK);
      glint(x - r * 0.4, y - r * 0.25, Math.max(1, Math.round(r * 0.3)));
      cell(p, x + r * 0.5, y + r * 0.55, ACCENT_LIT);
      // The lid. Body-toned so the shading pass lights it as skin.
      const lid = o.lid ?? BASE;
      for (let dy = -Math.ceil(r * 1.2) - 2; dy <= r * 0.1; dy++) {
        for (let dx = -Math.ceil(r) - 2; dx <= r + 2; dx++) {
          if ((dx / (r + 1.4)) ** 2 + (dy / (r * 1.2 + 1.4)) ** 2 > 1) continue;
          if (dy > -r * 0.35 + dx * 0.12 * side) continue;
          cell(p, x + dx, y + dy, lid);
        }
      }
      for (let dx = -Math.ceil(r) - 1; dx <= r + 1; dx++) {
        const ly = -r * 0.35 + dx * 0.12 * side;
        if ((dx / (r + 1.4)) ** 2 + (ly / (r * 1.2 + 1.4)) ** 2 > 1) continue;
        cell(p, x + dx, y + ly, DEEP);
        cell(p, x + dx, y + ly - 1, HILIGHT);
      }
      break;
    }

    case 'sleepy': {
      // Half shut. Almost all lid: one long dark curve with the eye showing
      // beneath it as a shallow lens. Reads placid, or smug.
      const lid = o.lid ?? BASE;
      if (!o.bare) blob(p, x, y + r * 0.35, r + 1.2, r * 0.72 + 1.2, OUTLINE);
      blob(p, x, y + r * 0.35, r, r * 0.6, sclera);
      blob(p, x - side * r * 0.1, y + r * 0.5, r * 0.72, r * 0.52, iris);
      blob(p, x - side * r * 0.1, y + r * 0.5, r * 0.32, r * 0.3, EYE_DARK);
      glint(x - r * 0.4, y + r * 0.15, 1);
      for (let dx = -Math.ceil(r) - 1; dx <= r + 1; dx++) {
        const t = dx / (r + 1);
        const ly = y - r * 0.05 - (1 - t * t) * r * 0.32;
        cell(p, x + dx, ly, DEEP);
        cell(p, x + dx, ly - 1, lid);
        cell(p, x + dx, ly - 2, HILIGHT);
      }
      break;
    }

    case 'angry': {
      // A hard narrow almond leaning down toward the nose, jammed under a bone
      // brow that all but touches it.
      //
      // The trap: a big white almond with a small pupil in it reads as alarm,
      // not aggression, whatever angle the brow is at -- and alarm is what the
      // first version of this eye said. A predator's eye is mostly *iris*, with
      // the white showing only in the corners, and the brow has to sit on the
      // lid rather than float above it.
      const w = r * 1.18, h = r * 0.62;
      const drop = side * r * 0.3;
      const alm: Pt[] = [[x - w, y + drop + h * 0.5], [x - w * 0.35, y + drop - h],
        [x + w * 0.5, y - drop - h * 0.72], [x + w, y - drop + h * 0.35],
        [x + w * 0.25, y + drop + h * 0.95]];
      if (!o.bare) poly(p, alm.map((q) => [q[0] + Math.sign(q[0] - x) * 1.3, q[1] + Math.sign(q[1] - y) * 1.4]), OUTLINE);
      poly(p, alm, sclera);
      // The iris nearly fills the opening; only the two corners stay white.
      blob(p, x - side * r * 0.16, y, r * 0.92, r * 0.86, EYE_DARK);
      blob(p, x - side * r * 0.16, y, r * 0.74, r * 0.68, iris);
      blob(p, x - side * r * 0.18, y + r * 0.04, r * 0.3, r * 0.36, EYE_DARK);
      glint(x - r * 0.5, y - r * 0.28, 1);
      cell(p, x + r * 0.5, y + r * 0.34, ACCENT_LIT);
      // The lid line: the brow's shadow falling across the top of the iris,
      // which is what makes the eye look narrowed rather than merely small.
      for (let dx = -Math.ceil(w); dx <= w; dx++) {
        const ly = y + drop - h * 0.55 - dx * 0.28 * side;
        if (Math.abs(dx) > w * 0.92) continue;
        cellOver(p, x + dx, ly, EYE_DARK);
      }
      brow(p, x, y - r * 1.35, r * 1.9, side, 0.34);
      break;
    }

    default: {
      // Round: big, wet, looking straight at you. The friendly default.
      if (!o.bare) blob(p, x, y, r + 1.4, r * 1.22 + 1.4, OUTLINE);
      blob(p, x, y, r, r * 1.22, sclera);
      blob(p, x - side * r * 0.12, y + r * 0.08, r * 0.86, r * 1.04, EYE_DARK);
      blob(p, x - side * r * 0.12, y + r * 0.08, r * 0.68, r * 0.86, iris);
      blob(p, x - side * r * 0.14, y + r * 0.12, r * 0.36, r * 0.5, EYE_DARK);
      // A lit crescent under the pupil: the thing that makes an eye look wet.
      blob(p, x, y + r * 0.88, r * 0.46, r * 0.22, EYE_WHITE);
      glint(x - r * 0.45, y - r * 0.5, Math.max(1, Math.round(r * 0.32)));
      // Warm bounce reflected into the far rim. One cool highlight and one warm
      // one is what separates a painted eye from a shiny bead.
      cell(p, x + r * 0.52, y + r * 0.42, ACCENT_LIT);
      cell(p, x + r * 0.52, y + r * 0.42 + 1, ACCENT_LIT);
      // An upper lid clipping the top of the iris. Without it the eye is a
      // perfect circle, and a perfect circle has no gaze -- it stares.
      for (let dx = -Math.ceil(r); dx <= r; dx++) {
        const ly = y - r * 1.22 * Math.sqrt(Math.max(0, 1 - (dx / (r + 0.5)) ** 2)) + r * 0.2;
        cell(p, x + dx, ly, EYE_DARK);
      }
      break;
    }
  }
}

/**
 * A converging pair. The two eyes are drawn with opposite `side`, so both
 * pupils sit slightly inboard and the creature looks at the viewer rather than
 * past both of its shoulders.
 */
export function eyePair(p: Pen, cx: number, cy: number, spread: number, r: number, style: EyeStyle = 'round', o: EyeOpts = {}): void {
  if (p.back) return;
  eye(p, cx - spread, cy, r, style, { ...o, side: -1 });
  eye(p, cx + spread, cy, r, style, { ...o, side: 1 });
  p.face(cx, cy, spread + r * 2);
}

/** A heavy bone brow over a socket. The cheapest way to say predator. */
export function brow(p: Pen, x: number, y: number, len: number, side: number, slant = 0.35, v = ACCENT_DARK): void {
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    // Tapered: thick over the inner corner, thinning away to nothing over the
    // outer one. A brow of constant depth is a painted stripe.
    const h = Math.max(1, Math.round(len * 0.2 * (1 - t * 0.7)));
    const bx = x - side * len * 0.5 + side * i;
    const by = y - t * len * slant;
    rect(p, bx, by, bx, by + h, v);
    cell(p, bx, by, ACCENT);
    cellOver(p, bx, by - 1, ACCENT_LIT);
  }
}

/* ----------------------------------------------------------- contours */

/** Topmost body row in a column, or -1. Use it to sit an ornament on a back. */
export function topOf(p: Pen, x: number): number { return p.m.top(Math.round(x)); }
/** Bottommost body row in a column, or -1. */
export function bottomOf(p: Pen, x: number): number { return p.m.bottom(Math.round(x)); }

/**
 * The upper contour of whatever is currently drawn, between two columns, as a
 * path. Hang a spine row, a mane or a row of leaves off it and the ornament
 * follows the animal instead of a straight line ruled across it.
 */
export function contourTop(p: Pen, x0: number, x1: number, step = 3): Pt[] {
  const out: Pt[] = [];
  for (let x = Math.round(x0); x <= Math.round(x1); x += step) {
    const y = p.m.top(x);
    if (y >= 0) out.push([x, y]);
  }
  return out;
}

/** Mirror the left half of the mask onto the right, for a front-on symmetric
 *  creature. Draw the left side only, then call this last. */
export function mirrorInto(p: Pen, axis: number): void { p.m.mirror(axis); }
