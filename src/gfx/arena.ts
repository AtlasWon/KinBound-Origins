/**
 * Battle arenas.
 *
 * The field a fight happens on, drawn in code. It replaces the banded painter
 * that used to live in `battle.ts` -- three flat strips of sky, three flat
 * strips of ground and one hill -- which read as a placeholder because it was
 * one.
 *
 * HOW TO WIRE IT IN
 *
 *   drawArena(r, this.opts.backdrop ?? 'highland', this.ticks)
 *
 * replaces the whole of `renderBackdrop` AND `renderPads`, because the pads
 * are part of the field here. If the pads should keep shaking with the
 * combatants -- and they should -- call `drawArena(..., { pads: false })`
 * outside the shake transform and `drawPads(r, kind)` inside it. `FOE_PAD`
 * and `PLAYER_PAD` are exported: they are where the creatures actually stand,
 * and `openPoint` should read them so a vessel bursts over its own platform.
 *
 * WHAT AN ERA-CORRECT BATTLE FIELD IS MADE OF
 *
 * Depth, and nothing else. A GBA battle screen has no camera and no lighting
 * model; it fakes distance with a stack of layers that each lose a little
 * contrast and a little detail as they go back:
 *
 *   sky          flat bands with row-interleaved seams, no detail at all
 *   far range    silhouette only, veiled by haze
 *   mid range    the first lit crest appears
 *   near hills   properly coloured, still no interior
 *   horizon trim a hedgerow standing ON the field, occluding its first metre,
 *                which is what stops the seam being a ruled line
 *   ground       zones with wandering edges, each burying the back of the last
 *   pads         a raised disc per combatant -- the layer that plants a sprite
 *   foreground   the nearest and darkest layer, clumped with real gaps
 *
 * The pads are the load-bearing part. A creature standing on a flat green
 * field floats no matter how good the sprite is; a creature standing on a
 * lit disc with a wall and a shadow under it is standing on something.
 *
 * WHY IT IS BAKED
 *
 * All of the above is static, and dithered ramps plus per-row jittered
 * ellipses are far too many `fillRect`s to pay for sixty times a second. Each
 * arena is therefore painted once into an offscreen buffer-sized canvas and
 * blitted, and only what genuinely moves -- drifting cloud, glints on water, a
 * cave drip -- is drawn live on top. That is also why the texture can be as
 * careful as it is: it costs one bake, not one frame.
 *
 * RESTRAINT
 *
 * This sits behind the fight. Every value range here is deliberately narrow
 * and every piece of texture is placed by hand in a named spot rather than
 * scattered, because uniform noise across a field is what turns a backdrop to
 * mush at 1x and makes a sprite hard to read. Detail is also spent where it
 * can be seen: the HP panels cover the top-left and the middle-right, and the
 * message box owns everything below y=114, so the sky's left half and the
 * ground's right flank are behind furniture and get nothing.
 */

import { BUFFER_H, BUFFER_W, DETAIL, Renderer, SCREEN_W } from '../engine/renderer.js';

/** The backdrops a map may ask for. */
export type BackdropKind = 'highland' | 'coast' | 'quarry' | 'cave' | 'indoor';

/**
 * Older maps and drivers name backdrops loosely; a battle must never come up
 * black because a map said "grass". Anything unrecognised is highland.
 */
const ALIAS: Record<string, BackdropKind> = {
  grass: 'highland', field: 'highland', meadow: 'highland', route: 'highland',
  forest: 'highland', hill: 'highland', highland: 'highland',
  beach: 'coast', sand: 'coast', sea: 'coast', water: 'coast', coast: 'coast',
  mine: 'quarry', rock: 'quarry', mountain: 'quarry', quarry: 'quarry',
  cave: 'cave', tunnel: 'cave', cavern: 'cave',
  indoor: 'indoor', gym: 'indoor', house: 'indoor', inside: 'indoor',
};

export function arenaKind(name: string | undefined): BackdropKind {
  return ALIAS[(name ?? '').toLowerCase()] ?? 'highland';
}

/*
 * Where the combatants stand.
 *
 * These are measurements, not taste. Every creature frame is 128 design pixels
 * tall and seats its feet on design row 123, so a sprite drawn at logical y
 * puts its feet at y + 61.5. With FOE_SPRITE at y=2 and PLAYER_SPRITE at y=40
 * that is y=63.5 and y=101.5, and each pad is centred just under its own
 * creature's soles.
 *
 * The foe pad is small and sits high: the player's HP panel starts at y=68 and
 * eats everything below that on the right, so a foe pad centred any lower is a
 * pad nobody ever sees. The player pad is large, low and almost entirely in
 * the clear -- only its front lip goes under the message box, which is exactly
 * where a foreground element should be losing itself anyway.
 */
export const FOE_PAD = { x: 190, y: 63, rx: 33, ry: 8 };
export const PLAYER_PAD = { x: 46, y: 102, rx: 43, ry: 11 };

/** Bottom of the playable field: the message box owns everything below. */
const FIELD_BOTTOM = 114;

/* ------------------------------------------------------------- utilities */

type Ctx = CanvasRenderingContext2D;

/** Rect in buffer pixels. */
function px(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  if (w <= 0 || h <= 0) return;
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Rect in logical units. */
function ux(c: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  px(c, x * DETAIL, y * DETAIL, w * DETAIL, h * DETAIL, color);
}

function hash1(i: number): number {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Blend two `#rrggbb` colours. Used to step a pad's shading finely. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number): number =>
    Math.round(((pa >> sh) & 255) + (((pb >> sh) & 255) - ((pa >> sh) & 255)) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

/** Smooth 1D value noise. Every wobble in this file comes from here. */
function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i) + (hash1(i + 1) - hash1(i)) * u;
}

/**
 * A vertical ramp: flat bands, blended by interleaving whole ROWS.
 *
 * Two wrong answers were tried before this one. Dithering every row toward the
 * next colour puts a fifty-percent checkerboard across the widest part of the
 * ramp; at this density that is not a blend, it is a wire mesh laid over the
 * sky, and it is the exact "uniform texture" failure this field has to avoid.
 * Confining a checker to the seams only moves the mesh.
 *
 * The era's answer was one-dimensional. A seam is made by alternating entire
 * scanlines of the two colours in a dispersed order, so the transition reads
 * as fine horizontal banding -- which is what a sky does anyway -- and there
 * is no cross-hatch anywhere. `ROW4` is a four-row ordered pattern; a logical
 * row takes the next colour once the seam is far enough along.
 *
 * `bias` warps where the boundaries fall, which is how a ground ramp gets its
 * perspective: thin bands at the back, wide ones underfoot.
 */
const ROW4 = [0, 2, 1, 3];
function ramp(c: Ctx, y0: number, y1: number, stops: string[], bias = 1, blend = 4): void {
  const n = stops.length;
  const edge = (i: number): number => Math.round(y0 + (y1 - y0) * Math.pow(i / n, bias));

  for (let i = 0; i < n; i++) {
    ux(c, 0, edge(i), SCREEN_W, edge(i + 1) - edge(i), stops[i]!);
  }
  for (let i = 0; i < n - 1; i++) {
    const b = edge(i + 1);
    for (let j = -blend; j <= blend; j++) {
      const y = b + j;
      if (y < y0 || y >= y1) continue;
      const t = (j + blend) / (2 * blend);
      const next = ROW4[((y % 4) + 4) % 4]! < t * 4;
      ux(c, 0, y, SCREEN_W, 1, next ? stops[i + 1]! : stops[i]!);
    }
  }
}

/**
 * Distance haze: a pale veil that thickens toward the horizon.
 *
 * Stepped over its own height rather than laid on flat, because a hard-edged
 * band of translucent white across a hillside is a ruled line by another name.
 */
function haze(c: Ctx, y0: number, y1: number, strength: number, tone = '200,224,242'): void {
  const n = Math.max(1, Math.round(y1 - y0));
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / n;
    ux(c, 0, y0 + i, SCREEN_W, 1, `rgba(${tone},${(strength * t * t).toFixed(3)})`);
  }
}

/**
 * A broad, very low-contrast wash across the ground -- a cloud's shadow, or
 * the gap between two of them.
 *
 * Large-scale value variation is what keeps a big field from reading as one
 * flat mass, and it does it without adding any detail at all: at 1x these are
 * barely nameable, they just stop the ground being a single colour.
 */
function wash(
  c: Ctx, cx: number, cy: number, rx: number, ry: number, seed: number, color: string,
): void {
  const CX = cx * DETAIL, CY = cy * DETAIL, RX = rx * DETAIL, RY = ry * DETAIL;
  for (let y = -RY; y <= RY; y++) {
    const t = y / RY;
    const w = Math.round(RX * Math.sqrt(Math.max(0, 1 - t * t))
      + (noise1(seed + y * 0.09) - 0.5) * 2 * 14 * DETAIL);
    if (w <= 0) continue;
    px(c, CX - w, CY + y, w * 2, 1, color);
  }
}

/**
 * A band of ground with a wandering top edge, filling everything below it.
 *
 * Zones are painted far to near, each one burying the back of the last. It is
 * the cheapest honest way to get depth out of a flat field: the eye reads four
 * curved edges receding as four changes of ground, where the same four values
 * stacked as straight rectangles read as a test card.
 */
function zone(
  c: Ctx, y: number, amp: number, freq: number, seed: number,
  fill: string, lit?: string, litH = 1,
): void {
  const A = amp * DETAIL;
  for (let X = 0; X < BUFFER_W; X++) {
    const e = Math.round(y * DETAIL + (noise1(X * freq + seed) - 0.5) * 2 * A);
    px(c, X, e, 1, BUFFER_H - e, fill);
    if (lit) px(c, X, e, 1, litH, lit);
  }
}

/** A jittered filled ellipse, buffer pixels. `wobble` breaks the perfect arc. */
function blob(
  c: Ctx, cx: number, cy: number, rx: number, ry: number,
  color: string, seed = 0, wobble = 0,
): void {
  for (let y = -ry; y <= ry; y++) {
    const t = y / ry;
    let w = rx * Math.sqrt(Math.max(0, 1 - t * t));
    if (wobble) w += (noise1(seed + y * 0.41) - 0.5) * 2 * wobble;
    w = Math.round(w);
    if (w <= 0) continue;
    px(c, cx - w, cy + y, w * 2, 1, color);
  }
}

/** The same, drawn live through the renderer. */
function blobR(r: Renderer, cx: number, cy: number, rx: number, ry: number, color: string): void {
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)));
    if (w > 0) r.pixel(cx - w, cy + y, w * 2, 1, color);
  }
}

/**
 * A distant landform.
 *
 * `height(X)` returns how far the ridge rises above `baseY` at that buffer
 * column; everything from the crest down to `downTo` is filled. A 2px lit
 * crest is optional and is the only interior detail a far layer ever gets --
 * past a certain distance a hill is a silhouette and a value, nothing more.
 */
function ridge(
  c: Ctx, baseY: number, downTo: number,
  height: (X: number) => number, color: string, crest?: string,
): void {
  const B = Math.round(baseY * DETAIL);
  const D = Math.round(downTo * DETAIL);
  for (let X = 0; X < BUFFER_W; X++) {
    const h = Math.round(height(X));
    if (h <= 0) continue;
    const top = B - h;
    px(c, X, top, 1, D - top, color);
    if (crest) px(c, X, top, 1, 2, crest);
  }
}

/**
 * A curved contour across the ground.
 *
 * Land does not have straight edges, and neither does a mown strip or a change
 * of soil. Every horizontal division below the horizon in this file is one of
 * these, never a `rect`.
 */
function contour(
  c: Ctx, y: number, amp: number, freq: number, seed: number,
  thickness: number, color: string, under?: string,
): void {
  const Y = Math.round(y * DETAIL);
  for (let X = 0; X < BUFFER_W; X++) {
    const d = Math.round((noise1(X * freq + seed) - 0.5) * 2 * amp);
    px(c, X, Y + d, 1, thickness, color);
    if (under) px(c, X, Y + d + thickness, 1, 1, under);
  }
}

/**
 * A clump of grass: a handful of blades leaning off one root.
 *
 * Placed by hand, never scattered. Six of these in chosen spots read as a
 * field; two hundred of them spread evenly read as static.
 */
function tuft(
  c: Ctx, x: number, y: number, n: number, tall: number,
  seed: number, blade: string, tip: string, root: string,
): void {
  const X = Math.round(x * DETAIL);
  const Y = Math.round(y * DETAIL);
  px(c, X - n, Y, n * 2 + 1, 1, root);
  for (let i = 0; i < n; i++) {
    const off = Math.round((i - (n - 1) / 2) * 2 + (hash1(seed + i) - 0.5) * 2);
    const h = Math.round(tall * (0.55 + hash1(seed + i * 3.7) * 0.6));
    const lean = hash1(seed + i * 9.1) < 0.5 ? -1 : 1;
    for (let k = 0; k < h; k++) {
      const bend = Math.round((k / Math.max(1, h)) ** 2 * 2) * lean;
      px(c, X + off + bend, Y - 1 - k, 1, 1, k >= h - 2 ? tip : blade);
    }
  }
}

/**
 * A low patch of ground cover: a flat lozenge with a wandering edge and a lit
 * top rim. The rim is the whole point -- without it a patch is a stain, with
 * it the patch is a thing lying on the ground.
 */
function turf(
  c: Ctx, x: number, y: number, w: number, h: number, seed: number,
  body: string, lit: string,
): void {
  const CX = x * DETAIL, CY = y * DETAIL, RX = w * DETAIL / 2, RY = h * DETAIL / 2;
  for (let k = -RY; k <= RY; k++) {
    const t = k / RY;
    const half = Math.round(RX * Math.sqrt(Math.max(0, 1 - t * t))
      + (noise1(seed + k * 0.9) - 0.5) * 5);
    if (half <= 0) continue;
    px(c, CX - half, CY + k, half * 2, 1, body);
    if (k <= -RY + 1) px(c, CX - half, CY + k, half * 2, 1, lit);
  }
}

/**
 * A shrub: a lumpy dome, lit on top, sitting in its own shadow.
 *
 * Two or three of these in the middle distance do more for a flat field than
 * any amount of ground texture, because they are the only things out there
 * with a vertical dimension -- the eye reads them as objects standing in
 * space, and the space around them becomes ground rather than paint.
 */
function bush(
  c: Ctx, x: number, y: number, w: number, h: number, seed: number,
  body: string, lit: string, shade: string,
): void {
  const CX = x * DETAIL, CY = y * DETAIL, RX = w * DETAIL / 2, RY = h * DETAIL;
  px(c, CX - RX, CY, RX * 2, 2, shade);
  for (let k = 0; k < RY; k++) {
    const t = k / RY;
    let half = RX * Math.sqrt(Math.max(0, 1 - t * t));
    half += (noise1(seed + k * 0.7) - 0.5) * 3;
    half = Math.round(half);
    if (half <= 0) continue;
    px(c, CX - half, CY - k, half * 2, 1, body);
    if (k > RY * 0.55) px(c, CX - half, CY - k, Math.max(2, half), 1, lit);
  }
}

/** A rounded stone: lit above-left, dark below, with a contact shadow. */
function stone(
  c: Ctx, x: number, y: number, w: number, h: number,
  body: string, lit: string, dark: string, shade: string,
): void {
  const CX = x * DETAIL, CY = y * DETAIL, RX = w * DETAIL / 2, RY = h * DETAIL;
  px(c, CX - RX - 1, CY, RX * 2 + 3, 2, shade);
  for (let k = 0; k < RY; k++) {
    const t = k / RY;
    const half = Math.round(RX * Math.sqrt(Math.max(0, 1 - t * t)));
    if (half <= 0) continue;
    px(c, CX - half, CY - k, half * 2, 1, k < RY * 0.4 ? dark : body);
  }
  px(c, CX - Math.round(RX * 0.7), CY - RY + 1, Math.round(RX * 0.9), 2, lit);
}

/* ------------------------------------------------------------------ pads */

interface PadSkin {
  /** Flat top surface, at the pad's outer edge. */
  top: string;
  /** One step up from `top`, filling most of the face. */
  mid: string;
  /** The lit core, offset toward the light (upper-left). */
  lit: string;
  /** Back rim, catching sky. */
  rim: string;
  /** Front lip, in its own shade. */
  lip: string;
  /** Extruded side wall, and its lower half. */
  wall: string;
  wallDark: string;
  /** Cast shadow on the ground. Must be translucent: it lands on live paint. */
  shadow: string;
  /** How many buffer pixels the disc is raised. */
  depth: number;
  /** Irregularity of the outline, buffer pixels. Zero for cut stone and tile. */
  wobble: number;
  /** Marks scattered on the top face -- grass, gravel, grain. */
  fleck?: string;
}

/**
 * One creature's platform.
 *
 * Built as a genuine extrusion rather than as a decal: a cast shadow, a side
 * wall with its own two values, a top face, two steps of light on it, then a
 * bright back rim and a dark front lip. The rim pair is what does the work --
 * it is the only place on the field with a hard value step, and it draws the
 * eye to exactly where the creature's feet are.
 *
 * The light goes on in TWO steps, not one. A single lit ellipse inside a flat
 * top reads as a painted donut at any zoom; a mid tone between them, plus a
 * stippled edge on the innermost step, reads as a surface curving up to meet
 * the light.
 */
function pad(
  c: Ctx, p: { x: number; y: number; rx: number; ry: number }, s: PadSkin, seed: number,
): void {
  const cx = Math.round(p.x * DETAIL);
  const cy = Math.round(p.y * DETAIL);
  const rx = Math.round(p.rx * DETAIL);
  const ry = Math.round(p.ry * DETAIL);
  const lx = cx - Math.round(rx * 0.11);
  const ly = cy - Math.round(ry * 0.20);

  // Cast shadow, thrown down-right away from the light.
  blob(c, cx + 2, cy + s.depth + 2, rx + 1, ry, s.shadow, seed, s.wobble);
  // Side wall, darker as it drops.
  for (let d = s.depth; d >= 1; d--) {
    blob(c, cx, cy + d, rx, ry, d > s.depth / 2 ? s.wallDark : s.wall, seed, s.wobble);
  }
  /*
   * The top face, lit by a sweep rather than by a bullseye.
   *
   * Nesting ellipses on the same centre -- which is the obvious way to shade a
   * disc -- draws concentric rings, and a creature then appears to be standing
   * on a dartboard. Each step here is both smaller AND pushed toward the light,
   * so the darkest tone survives only as a crescent along the lower-right edge.
   * That is what a lit dome actually looks like, and the steps stop reading as
   * outlines the moment they stop being concentric.
   */
  const STEPS = 4;
  for (let k = 0; k <= STEPS; k++) {
    const t = k / STEPS;
    const col = t < 0.5 ? mix(s.top, s.mid, t * 2) : mix(s.mid, s.lit, t * 2 - 1);
    blob(c,
      cx - rx * 0.30 * t, cy - ry * 0.38 * t,
      rx * (1 - t * 0.44), ry * (1 - t * 0.56),
      col, seed + k * 11, s.wobble * (1 - t * 0.4));
  }

  // Marks on the surface, off to the sides so nothing lands under the feet.
  if (s.fleck) {
    for (let i = 0; i < 10; i++) {
      const a = hash1(seed + i * 3.3) * Math.PI * 2;
      const rr = 0.55 + hash1(seed + i * 6.1) * 0.35;
      const x = cx + Math.cos(a) * rx * rr;
      const y = cy + Math.sin(a) * ry * rr;
      if (Math.abs(x - cx) < rx * 0.22) continue;
      px(c, x, y, 2 + Math.round(hash1(seed + i) * 3), 1, s.fleck);
    }
  }

  // Rims: recompute the outline and paint only its top and bottom rows.
  for (let y = -ry; y <= ry; y++) {
    const t = y / ry;
    let w = rx * Math.sqrt(Math.max(0, 1 - t * t));
    if (s.wobble) w += (noise1(seed + y * 0.41) - 0.5) * 2 * s.wobble;
    w = Math.round(w);
    if (w <= 0) continue;
    if (y <= -ry + 2) px(c, cx - w, cy + y, w * 2, 1, s.rim);
    if (y >= ry - 1) px(c, cx - w, cy + y, w * 2, 1, s.lip);
  }
}

/* -------------------------------------------------------------- palettes */

interface Kit {
  /** Where sky meets land. Never drawn as a line; something always breaks it. */
  horizon: number;
  padFoe: PadSkin;
  padPlayer: PadSkin;
  /** Painted after the pads, in front of them. */
  fringe?: (c: Ctx) => void;
}

/* ----------------------------------------------------------- highland */

const HIGHLAND_PAD: PadSkin = {
  top: '#57883c', mid: '#649744', lit: '#7ab052', rim: '#98c968', lip: '#38602c',
  wall: '#6d6a41', wallDark: '#4d4b2c', shadow: 'rgba(22,42,20,0.34)',
  depth: 5, wobble: 1.6, fleck: 'rgba(150,196,112,0.34)',
};

/**
 * A hedgerow's top edge.
 *
 * Bushes of irregular size at irregular spacing, the tallest of them winning
 * each column. A hedge built from a sine, or from evenly spaced identical
 * lumps, reads as decoration; built from overlapping circles nobody chose the
 * positions of, it reads as a hedge.
 */
const HEDGE: ReadonlyArray<readonly [number, number, number]> = (() => {
  const out: Array<readonly [number, number, number]> = [];
  let x = -12;
  for (let i = 0; x < 254; i++) {
    const rad = 7 + hash1(i * 3.1 + 1) * 9;
    out.push([x, rad, 4.5 + hash1(i * 7.7 + 2) * 6.5]);
    x += rad * 1.15 + hash1(i * 5.3) * 7;
  }
  return out;
})();

function hedgeTop(X: number): number {
  let top = 2.5 * DETAIL;
  for (const [bx, rad, h] of HEDGE) {
    const d = (X - bx * DETAIL) / (rad * DETAIL);
    if (d > -1 && d < 1) top = Math.max(top, Math.sqrt(1 - d * d) * h * DETAIL);
  }
  return top;
}

/**
 * A tiered conifer.
 *
 * Three skirts rather than one cone: the notches between tiers are the whole
 * silhouette, and a smooth triangle at this size reads as a tent.
 */
function conifer(c: Ctx, x: number, base: number, h: number, body: string, lit: string): void {
  const tiers = 3;
  for (let t = 0; t < tiers; t++) {
    const tierTop = h - (h / tiers) * t;
    const tierH = h / tiers + 2;
    const wide = 1.4 + t * 1.9;
    for (let k = 0; k < tierH; k++) {
      const half = Math.round((k / tierH) * wide * DETAIL);
      const Y = Math.round((base - tierTop + k) * DETAIL);
      px(c, x * DETAIL - half, Y, half * 2 + 2, DETAIL, body);
      px(c, x * DETAIL - half, Y, DETAIL, DETAIL, lit);
    }
  }
  px(c, x * DETAIL - 1, (base - h) * DETAIL - 2, 2, 4, body);
}

function bakeHighland(c: Ctx): Kit {
  const H = 50;

  // Sky: four flat fields with soft seams. No detail whatsoever -- everything
  // that reads as sky depth here is the haze band down at the hills.
  ramp(c, 0, H, ['#4a86c2', '#5c94ca', '#6ea3d2', '#82b3da', '#96c3e3', '#abd3eb'], 1.2);

  /*
   * Three ranges, each hazed only AFTER it is drawn.
   *
   * The order matters more than the colours. Laying one wash over the finished
   * stack put the same veil on the near hills as on the far ones and flattened
   * all three into a smear; hazing between the layers is what makes each one
   * sit at its own distance, because each has been through one more veil than
   * the layer in front of it.
   */
  ridge(c, H - 3, H + 2, (X) => 12 + noise1(X * 0.0048 + 3) * 26 + noise1(X * 0.019) * 4,
    '#6f8fac');
  haze(c, H - 22, H, 0.34);
  ridge(c, H - 1, H + 2, (X) => 6 + noise1(X * 0.0085 + 21) * 18, '#4e7776', '#628a84');
  haze(c, H - 14, H, 0.20);
  ridge(c, H + 1, H + 4, (X) => 3 + noise1(X * 0.013 + 51) * 12, '#3f6c4b', '#537f55');
  haze(c, H - 7, H + 1, 0.13);

  /*
   * The ground, as four zones with wandering edges rather than as one ramp.
   * Each is painted over the back of the one before it, so the edges are true
   * occlusions and the field recedes instead of merely getting lighter.
   */
  zone(c, H, 0.8, 0.03, 900, '#3f6a3c');
  zone(c, H + 9, 2.0, 0.0090, 61, '#476f40', 'rgba(198,228,168,0.12)');
  zone(c, H + 17, 2.6, 0.0075, 97, '#4d7943', 'rgba(200,230,170,0.13)');
  zone(c, H + 28, 3.2, 0.0065, 133, '#548045', 'rgba(202,232,172,0.14)', 2);
  zone(c, H + 44, 3.8, 0.0050, 205, '#5c8c4a', 'rgba(206,236,176,0.15)', 2);

  /*
   * The hedgerow. It stands ON the field, so it goes down after the first
   * ground zone and occludes it -- that overlap is what stops the horizon
   * being a seam between two colours. Three conifers push through it at
   * irregular spacing.
   */
  for (let X = 0; X < BUFFER_W; X++) {
    const h = Math.round(hedgeTop(X));
    const top = (H + 1) * DETAIL - h;
    px(c, X, top, 1, (H + 5) * DETAIL - top, '#33573f');
    px(c, X, top, 1, 2, '#446b48');
  }
  conifer(c, 34, H + 2, 15, '#2c4a37', '#3d6144');
  conifer(c, 121, H + 2, 11, '#2c4a37', '#3d6144');
  conifer(c, 129, H + 2, 8, '#2c4a37', '#3d6144');
  conifer(c, 213, H + 2, 17, '#2c4a37', '#3d6144');

  /*
   * Cloud shadow, and the sun between. Three washes, none of them nameable at
   * 1x, all of them doing the same job: giving sixty rows of green a large
   * shape so it is not one flat mass. They also sit deliberately around the
   * pads -- a dark wash behind the foe's platform and a light one under the
   * player's is free separation that costs no contrast anywhere else.
   */
  wash(c, 172, 61, 62, 13, 71, 'rgba(30,58,28,0.13)');
  wash(c, 96, 88, 74, 17, 131, 'rgba(226,246,190,0.09)');
  wash(c, 26, 100, 50, 13, 191, 'rgba(30,58,28,0.11)');

  /*
   * Field furniture. Four objects, and that is the whole list.
   *
   * Placed where they can actually be seen and where they do not sit behind a
   * combatant: the creatures occupy x14-78 and x158-222, and the HP panels own
   * the top-left and middle-right, which leaves the left edge, the strip beside
   * the foe's pad, and the corridor down the middle. Each one gives the flat
   * middle distance an object to measure itself against.
   */
  bush(c, 146, 60, 15, 6, 401, '#386142', '#4a7a4e', 'rgba(30,54,28,0.34)');
  bush(c, 7, 70, 19, 8, 409, '#355d3f', '#47764b', 'rgba(30,54,28,0.34)');
  bush(c, 137, 71, 11, 5, 419, '#3a6644', '#4d7d50', 'rgba(30,54,28,0.30)');
  stone(c, 112, 95, 11, 5, '#6e6d60', '#948f82', '#4e4d43', 'rgba(30,54,28,0.30)');
  stone(c, 120, 97, 7, 3, '#6e6d60', '#948f82', '#4e4d43', 'rgba(30,54,28,0.28)');

  /*
   * Ground cover: low patches of a slightly different green, each with a lit
   * top edge so it reads as sitting ON the field rather than being a stain in
   * it. Sized and spaced by distance -- small and few at the back, broad and
   * frequent underfoot -- which is the only kind of texture gradient that
   * actually says "this plane is receding".
   */
  for (const [x, y, w, h, s] of [
    [86, 67, 18, 3, 11], [104, 78, 24, 4, 23], [138, 76, 16, 3, 29],
    [6, 94, 16, 4, 37], [100, 99, 28, 5, 41], [128, 92, 21, 4, 47],
    [112, 108, 26, 5, 53], [152, 110, 20, 4, 59], [206, 107, 24, 5, 61],
    [232, 96, 18, 4, 67]] as const) {
    turf(c, x, y, w, h, s, 'rgba(46,84,40,0.20)', 'rgba(196,232,164,0.22)');
  }

  /*
   * Grain. Short two-tone dashes in clusters, with bare ground between them --
   * the ground catching light on its own folds. Placed on the near half only:
   * distance has no texture, and an even scatter over the whole field is the
   * exact thing that turns a backdrop to mush at 1x.
   */
  for (const [gx, gy, gw, gh, n, s] of [
    [30, 82, 46, 9, 8, 11], [150, 78, 42, 8, 7, 23], [92, 94, 56, 12, 9, 37],
    [196, 100, 44, 10, 10, 51], [4, 104, 52, 9, 11, 67]] as const) {
    for (let i = 0; i < n; i++) {
      const x = gx + hash1(s + i * 1.7) * gw;
      const y = gy + hash1(s + i * 4.3) * gh;
      const w = 2 + Math.round(hash1(s + i * 8.9) * 5);
      ux(c, x, y, w, 1, 'rgba(200,236,168,0.15)');
      ux(c, x, y + 1, w, 1, 'rgba(42,76,36,0.19)');
    }
  }

  return { horizon: H, padFoe: HIGHLAND_PAD, padPlayer: HIGHLAND_PAD, fringe: highlandFringe };
}

/**
 * Grass, placed by hand.
 *
 * Every clump here is in a spot chosen for what is around it: banked against
 * the back of a pad so the pad has something to sit in, along the open middle
 * corridor where the eye travels between the two creatures, and across the
 * very bottom where the foreground band needs a broken top edge. The two
 * regions that get nothing are the ones the HP panels cover.
 */
function highlandFringe(c: Ctx): void {
  const B = '#4a7c3d', T = '#6fa855', R = 'rgba(38,66,34,0.45)';

  /*
   * Around the foe pad, never on it. A tuft drawn over a pad's top face is the
   * same value as the pad and simply disappears; what a pad needs is grass
   * standing BEHIND its back rim and leaning over its front lip, so the
   * silhouette is broken in the two places the eye checks.
   */
  tuft(c, 158, 57, 4, 6, 11, B, T, R);
  tuft(c, 168, 55, 3, 5, 17, B, T, R);
  tuft(c, 208, 55, 3, 5, 19, B, T, R);
  tuft(c, 220, 58, 4, 6, 23, B, T, R);
  tuft(c, 229, 62, 3, 5, 29, B, T, R);
  tuft(c, 154, 65, 4, 5, 31, B, T, R);

  // The open middle. Sparse: this is the corridor between the combatants and
  // the one part of the field the eye crosses on every turn.
  tuft(c, 96, 74, 3, 5, 41, B, T, R);
  tuft(c, 128, 84, 4, 6, 47, B, T, R);
  tuft(c, 110, 92, 3, 5, 53, B, T, R);

  // One small stand of flowers, so the field has exactly one warm accent.
  tuft(c, 118, 70, 3, 5, 59, B, T, R);
  px(c, 234, 137, 2, 2, '#f2ecc0');
  px(c, 240, 140, 2, 2, '#f2ecc0');
  px(c, 229, 142, 2, 2, '#e6dca4');

  // Around the player pad: taller, because it is nearer.
  tuft(c, 1, 99, 5, 9, 71, B, T, R);
  tuft(c, 91, 99, 5, 9, 79, B, T, R);
  tuft(c, 98, 105, 4, 8, 83, B, T, R);

  /*
   * The foreground.
   *
   * The first attempt at this was a solid dark band across the bottom, and it
   * swallowed the whole front of the player's pad -- the pad's lit rim and
   * dark lip are the two things that plant the sprite, and burying them undid
   * the layer they exist for. So the nearest layer is clumps with gaps
   * instead: dark blades rooted below the message box, tall enough to frame
   * the shot, placed only where the pad is not. Corners get the most, because
   * that is where a frame does its work and where nothing else is happening.
   */
  const fg = (x: number, n: number, h: number, s: number): void =>
    tuft(c, x, FIELD_BOTTOM + 1, n, h, s, '#33582f', '#457038', 'rgba(0,0,0,0)');
  fg(-3, 7, 13, 301); fg(6, 6, 10, 305); fg(14, 5, 8, 307);
  fg(100, 6, 11, 311); fg(108, 5, 9, 313); fg(120, 6, 12, 317);
  fg(150, 5, 8, 319); fg(178, 6, 11, 323); fg(188, 5, 9, 329);
  fg(214, 7, 13, 331); fg(224, 6, 11, 337); fg(234, 7, 14, 341);
  // A shallow darkening under them, so they grow out of shadow.
  px(c, 0, (FIELD_BOTTOM - 3) * DETAIL, BUFFER_W, 4 * DETAIL, 'rgba(34,58,30,0.28)');
}

/* --------------------------------------------------------------- coast */

function bakeCoast(c: Ctx): Kit {
  const H = 50;
  const SEA_TOP = H - 13;

  ramp(c, 0, SEA_TOP, ['#4e9bc9', '#66aad2', '#7fbadb', '#99cae5', '#b4dbee'], 1.4);

  /*
   * The far headland.
   *
   * The first pass put this at x=46, where the foe's HP panel covers it
   * completely -- a whole landform painted into a hole. It lives in the middle
   * corridor now, which is the only stretch of horizon nothing sits in front
   * of. The panels are the composition here as much as the layers are.
   */
  ridge(c, SEA_TOP + 1, SEA_TOP + 2, (X) => {
    const d = (X - 132 * DETAIL) / (58 * DETAIL);
    return d < -1 || d > 1 ? 0
      : (1 - d * d) * 8 * DETAIL + noise1(X * 0.013 + 4) * 5 * DETAIL * (1 - d * d);
  }, '#7e9fae');
  haze(c, SEA_TOP - 4, SEA_TOP + 2, 0.30);

  /*
   * Open water.
   *
   * Sea holds its value far better than land does -- it is a mirror, so the
   * far edge is nearly sky and the near edge is nearly its own colour. The
   * dark line right under the horizon is the single most important pixel row
   * in this backdrop: without it the water and the sky are one wash.
   */
  ramp(c, SEA_TOP + 2, H, ['#2f6f9c', '#36809f', '#3d8fb0', '#4aa2c0', '#59b4cf'], 1);
  ux(c, 0, SEA_TOP + 1, SCREEN_W, 1, '#255f8c');
  contour(c, SEA_TOP + 5, 1.2, 0.014, 9, 1, 'rgba(186,230,242,0.26)');
  contour(c, SEA_TOP + 9, 1.4, 0.011, 90, 1, 'rgba(186,230,242,0.20)');

  // Wet sand and the foam edge. Foam is the horizon here, and it wanders.
  ramp(c, H, BUFFER_H / DETAIL, ['#b5a075', '#c7b184', '#d6c292', '#e3d2a4', '#d8c48e'], 0.7);
  // Backwash: a darker soaked strip, then the foam itself, then dry sand.
  contour(c, H + 1, 1.8, 0.012, 41, 3, 'rgba(126,106,72,0.42)');
  contour(c, H - 1, 1.8, 0.012, 41, 2, '#f2f6f0', 'rgba(198,216,200,0.60)');
  // The tide's last reach: a damp band a little inland of the foam.
  contour(c, H + 6, 2.2, 0.009, 77, 2, 'rgba(140,116,76,0.32)', 'rgba(255,246,214,0.18)');

  /*
   * Sand ripples. Nested arcs that follow the shoreline rather than crossing
   * it, in two clusters with bare sand between them -- ripples come in patches
   * on a real beach, and an even field of them would be exactly the uniform
   * texture this backdrop cannot afford.
   */
  for (const [y, amp, seed, alpha] of [[62, 2.4, 201, 0.20], [65, 2.2, 211, 0.16],
    [68, 2.6, 221, 0.18], [92, 3.4, 231, 0.16], [97, 3.2, 241, 0.14],
    [103, 3.6, 251, 0.13]] as const) {
    const Y = Math.round(y * DETAIL);
    for (let X = 0; X < BUFFER_W; X++) {
      // A window function: each ripple only exists across part of the width.
      const w = noise1(X * 0.004 + seed);
      if (w < 0.42) continue;
      const d = Math.round((noise1(X * 0.008 + seed) - 0.5) * 2 * amp * DETAIL);
      px(c, X, Y + d, 1, 2, `rgba(150,126,84,${alpha})`);
      px(c, X, Y + d + 2, 1, 1, 'rgba(255,246,214,0.13)');
    }
  }

  // Large washes: sun on the open sand, damp shade where the dunes shoulder in.
  wash(c, 132, 82, 70, 16, 461, 'rgba(255,246,206,0.09)');
  wash(c, 30, 96, 54, 14, 471, 'rgba(120,98,58,0.13)');
  wash(c, 206, 62, 56, 10, 481, 'rgba(120,98,58,0.11)');

  // Wet rock at the waterline, and a stranded boulder on the dry sand. Sea
  // stacks are the one thing on a beach with a hard edge, so they are also the
  // only place this backdrop is allowed any contrast.
  stone(c, 106, 54, 13, 6, '#6f6a62', '#98938a', '#4c483f', 'rgba(90,74,44,0.34)');
  stone(c, 116, 55, 8, 4, '#6f6a62', '#98938a', '#4c483f', 'rgba(90,74,44,0.30)');
  stone(c, 236, 58, 15, 7, '#6f6a62', '#98938a', '#4c483f', 'rgba(90,74,44,0.34)');
  stone(c, 122, 92, 14, 6, '#7c7466', '#a49d90', '#575044', 'rgba(120,98,58,0.28)');

  // Three small drifts of shell and pebble, and nothing anywhere else.
  for (const [x, y, s] of [[100, 82, 401], [86, 100, 411], [212, 108, 421]] as const) {
    for (let i = 0; i < 5; i++) {
      const dx = Math.round((hash1(s + i) - 0.5) * 16);
      const dy = Math.round((hash1(s + i * 2.3) - 0.5) * 8);
      px(c, (x + dx) * DETAIL, (y + dy) * DETAIL, 2, 2,
        i % 2 ? '#f4ecd6' : 'rgba(138,114,74,0.55)');
    }
  }

  const skin: PadSkin = {
    top: '#c4ad7c', mid: '#d5c08e', lit: '#eadaad', rim: '#f8ecc6', lip: '#8f7549',
    wall: '#ab9166', wallDark: '#836c47', shadow: 'rgba(84,64,34,0.30)',
    depth: 6, wobble: 2.2, fleck: 'rgba(150,124,80,0.32)',
  };
  return { horizon: H, padFoe: skin, padPlayer: skin, fringe: coastFringe };
}

function coastFringe(c: Ctx): void {
  // Marram grass, in four stands, and nowhere near the pads.
  for (const [x, n, h, s] of [[100, 5, 9, 601], [108, 4, 7, 607],
    [150, 4, 6, 611], [196, 5, 8, 613], [206, 4, 6, 619]] as const) {
    tuft(c, x, 108, n, h, s, '#6f7d4a', '#93a266', 'rgba(120,98,58,0.30)');
  }
  // The nearest layer: dune grass rooted under the message box, clumped with
  // real gaps, exactly as on the highland -- a solid band here would bury the
  // player's mound the same way it did there.
  const fg = (x: number, n: number, h: number, s: number): void =>
    tuft(c, x, FIELD_BOTTOM + 1, n, h, s, '#5f6b3e', '#7d8a52', 'rgba(0,0,0,0)');
  fg(-2, 7, 12, 701); fg(8, 5, 8, 705);
  fg(102, 6, 11, 711); fg(112, 5, 8, 713);
  fg(168, 6, 10, 719); fg(178, 5, 8, 723);
  fg(222, 7, 13, 727); fg(232, 6, 10, 733);
  px(c, 0, (FIELD_BOTTOM - 3) * DETAIL, BUFFER_W, 4 * DETAIL, 'rgba(112,92,54,0.24)');
}

/* -------------------------------------------------------------- quarry */

function bakeQuarry(c: Ctx): Kit {
  const H = 50;

  // Overcast: almost no ramp at all, which is what makes stone read as stone.
  ramp(c, 0, H, ['#8ea3ba', '#9cadc2', '#abbaca', '#bcc8d5', '#cdd6e0'], 1.2);

  /*
   * A cut face is stepped, not rounded. Each terrace is a shelf with a lit lip
   * and a shadow thrown down the face below it, and the steps sit at irregular
   * heights because a working quarry follows the seam rather than a plan.
   *
   * The first version of this had all five terraces within a few percent of
   * each other's value and the whole wall read as one grey smear. They now run
   * cool and pale at the back to warm and dark at the front, with a haze pass
   * between each -- the same distance trick the highland's ranges use, which
   * is the only thing that makes five layers of one material legible.
   */
  const terraces = [
    { y: 24, from: -4, to: 100, fill: '#6b7480', lip: '#8b95a0', haze: 0.30 },
    { y: 32, from: 62, to: 178, fill: '#71736f', lip: '#8f9086', haze: 0.22 },
    { y: 29, from: 152, to: 244, fill: '#6c6e6b', lip: '#8a8b82', haze: 0.22 },
    { y: 39, from: 18, to: 152, fill: '#7b7367', lip: '#9c9284', haze: 0.13 },
    { y: 43, from: 130, to: 244, fill: '#746c60', lip: '#948a7c', haze: 0.13 },
  ];
  for (const t of terraces) {
    const F = Math.max(0, Math.round(t.from * DETAIL));
    const T = Math.min(BUFFER_W, Math.round(t.to * DETAIL));
    for (let X = F; X < T; X++) {
      // A cut edge crumbles by a pixel or two; it is never ruled.
      const jag = Math.round(noise1(X * 0.06 + t.y) * 3);
      const top = Math.round(t.y * DETAIL) + jag;
      px(c, X, top, 1, Math.round((H + 3) * DETAIL) - top, t.fill);
      px(c, X, top, 1, 2, t.lip);
      // The shelf above throws a shadow onto the face it stands on.
      px(c, X, top + 2, 1, 4, 'rgba(38,36,34,0.22)');
      // Strata: seams inside the face, following its own crumble.
      for (const off of [7, 15, 21]) {
        px(c, X, top + off, 1, 1, 'rgba(46,44,40,0.26)');
        px(c, X, top + off + 1, 1, 1, 'rgba(226,224,216,0.09)');
      }
    }
    haze(c, t.y - 2, H, t.haze, '196,208,224');
  }

  ramp(c, H, BUFFER_H / DETAIL, ['#6f685d', '#7a7268', '#867d72', '#928879', '#847a6b'], 0.85);
  // Spoil lines: the ground of a quarry lies in long drifts of grade.
  contour(c, 58, 2.0, 0.009, 301, 2, 'rgba(72,66,58,0.26)', 'rgba(230,226,214,0.10)');
  contour(c, 72, 2.8, 0.007, 311, 2, 'rgba(72,66,58,0.22)', 'rgba(230,226,214,0.11)');
  contour(c, 94, 3.4, 0.006, 321, 2, 'rgba(72,66,58,0.18)', 'rgba(230,226,214,0.12)');

  // The face throws a shadow onto the floor it stands on -- strongest at its
  // foot and gone eight units out, which is what stops the wall and the
  // ground reading as two unrelated slabs of the same grey.
  for (let i = 0; i < 9; i++) {
    ux(c, 0, H + i, SCREEN_W, 1, `rgba(40,36,32,${(0.30 * (1 - i / 9) ** 2).toFixed(3)})`);
  }
  wash(c, 120, 84, 70, 16, 361, 'rgba(232,228,214,0.055)');
  wash(c, 38, 98, 54, 13, 371, 'rgba(44,40,34,0.16)');
  wash(c, 196, 63, 58, 11, 381, 'rgba(44,40,34,0.14)');

  // Boulders where the face has shed them, and a rubble drift in the open
  // middle. Nothing anywhere the panels or the combatants cover.
  stone(c, 140, 57, 17, 8, '#736b60', '#9c9284', '#544e45', 'rgba(50,46,40,0.34)');
  stone(c, 152, 58, 10, 5, '#736b60', '#9c9284', '#544e45', 'rgba(50,46,40,0.30)');
  stone(c, 130, 94, 15, 7, '#7b7267', '#a49a8b', '#59534a', 'rgba(50,46,40,0.32)');
  stone(c, 141, 96, 8, 4, '#7b7267', '#a49a8b', '#59534a', 'rgba(50,46,40,0.28)');

  /*
   * Standing water in the pit -- a worked quarry always has some.
   *
   * It is the only bright, cool thing in an otherwise entirely warm-grey
   * picture, which is exactly why there is one of it and no more. A backdrop
   * gets one accent; a second would start competing with the fight.
   */
  blob(c, 106 * DETAIL, 88 * DETAIL, 25 * DETAIL, 5 * DETAIL, '#5d6b71', 555, 3);
  blob(c, 106 * DETAIL, 88 * DETAIL, 22 * DETAIL, 4 * DETAIL, '#8fa3b0', 559, 2.5);
  blob(c, 105 * DETAIL, 87 * DETAIL, 17 * DETAIL, 2 * DETAIL, '#b3c4cf', 563, 2);
  for (const [x, w] of [[95, 13], [110, 9], [102, 6]] as const) {
    ux(c, x, 87, w, 1, 'rgba(226,238,246,0.45)');
  }

  // Weeds in the gravel: three, all in the corridor, so the pit is not sterile.
  for (const [x, y, n, h, s] of [[86, 78, 4, 5, 811], [148, 72, 3, 4, 817],
    [96, 100, 4, 6, 823]] as const) {
    tuft(c, x, y, n, h, s, '#5c6a4a', '#7b8a5e', 'rgba(48,44,38,0.34)');
  }
  for (const [x, y, n, s] of [[132, 61, 6, 701], [110, 97, 7, 721]] as const) {
    for (let i = 0; i < n; i++) {
      const dx = Math.round((hash1(s + i) - 0.5) * 26);
      const dy = Math.round((hash1(s + i * 2.7) - 0.5) * 7);
      const w = 2 + Math.round(hash1(s + i * 5.1) * 3);
      px(c, (x + dx) * DETAIL, (y + dy) * DETAIL, w, w - 1, '#655f56');
      px(c, (x + dx) * DETAIL, (y + dy) * DETAIL, w, 1, '#a09788');
    }
  }

  const skin: PadSkin = {
    top: '#847b6e', mid: '#948b7e', lit: '#a8a094', rim: '#c2b9aa', lip: '#514c43',
    wall: '#6e6759', wallDark: '#514b41', shadow: 'rgba(44,40,34,0.36)',
    depth: 7, wobble: 3.0, fleck: 'rgba(66,60,52,0.34)',
  };
  return { horizon: H, padFoe: skin, padPlayer: skin, fringe: quarryFringe };
}

function quarryFringe(c: Ctx): void {
  // Foreground boulders, in three groups with bare ground between, rooted at
  // the message box so they read as the nearest thing in the shot.
  for (const [x, y, w, h] of [
    [-2, 116, 20, 11], [16, 118, 13, 8],
    [104, 117, 16, 9], [120, 119, 11, 7], [134, 116, 14, 10],
    [196, 118, 15, 8], [214, 115, 21, 12], [236, 118, 16, 9]] as const) {
    stone(c, x, y, w, h, '#514b41', '#786f62', '#3b362f', 'rgba(0,0,0,0)');
  }
  px(c, 0, (FIELD_BOTTOM - 3) * DETAIL, BUFFER_W, 4 * DETAIL, 'rgba(48,44,38,0.26)');
}

/* ---------------------------------------------------------------- cave */

function bakeCave(c: Ctx): Kit {
  const H = 46;

  // No sky. The far dark, with a cold glow toward the middle so the space has
  // a depth rather than being a flat black card.
  ramp(c, 0, H, ['#121622', '#171d2c', '#1d2537', '#242e46', '#2c3856'], 1.3);
  /*
   * A shaft of light from a hole somewhere above and behind.
   *
   * Its edges are feathered by stepping the alpha across the last few columns
   * rather than by cutting it: a translucent triangle with a hard edge reads
   * as a polygon, and the whole point of the shaft is that it has none.
   */
  for (let Y = 0; Y < (H + 40) * DETAIL; Y++) {
    const t = Y / ((H + 40) * DETAIL);
    const w = (11 + t * 34) * DETAIL;
    const cxs = 118 * DETAIL - t * 8 * DETAIL;
    const core = Math.max(0, 1 - t) * 0.055 + 0.02;
    for (let k = 0; k < 5; k++) {
      const ww = Math.round(w * (1 - k * 0.13));
      px(c, cxs - ww / 2, Y, ww, 1, `rgba(126,170,220,${(core * 0.42).toFixed(3)})`);
    }
  }

  // The ceiling and its teeth. Hung from the very top, only as far as the HP
  // panel does not already cover.
  for (let X = 0; X < BUFFER_W; X++) {
    const base = 7 + noise1(X * 0.02 + 5) * 6;
    px(c, X, 0, 1, Math.round(base * DETAIL), '#0f121c');
    px(c, X, Math.round(base * DETAIL) - 1, 1, 1, '#232a3c');
  }
  for (const [x, w, h] of [[120, 5, 15], [134, 3, 9], [148, 6, 19],
    [196, 4, 12], [224, 5, 16], [110, 3, 8]] as const) {
    for (let k = 0; k < h; k++) {
      const half = Math.max(0, Math.round((w * (1 - k / h)) / 2));
      ux(c, x - half, 12 + k, half * 2 + 1, 1, '#161b28');
      ux(c, x - half, 12 + k, 1, 1, '#2a3348');
    }
  }

  ramp(c, H, BUFFER_H / DETAIL, ['#2e2f3a', '#373845', '#41424f', '#4b4c5a', '#3f4049'], 0.85);
  contour(c, 54, 2.0, 0.009, 901, 2, 'rgba(16,18,26,0.40)', 'rgba(150,168,200,0.07)');
  contour(c, 70, 2.6, 0.007, 911, 2, 'rgba(16,18,26,0.34)', 'rgba(150,168,200,0.08)');
  contour(c, 92, 3.2, 0.006, 921, 2, 'rgba(16,18,26,0.28)', 'rgba(150,168,200,0.09)');

  // A shallow pool, off to one side of the open middle. It is the only bright
  // thing on the floor, which is why there is exactly one of it.
  blob(c, 112 * DETAIL, 88 * DETAIL, 26 * DETAIL, 6 * DETAIL, '#20304a', 555, 2.5);
  blob(c, 112 * DETAIL, 88 * DETAIL, 23 * DETAIL, 4 * DETAIL, '#2c4568', 559, 2.0);
  for (const [x, w] of [[100, 12], [116, 9], [108, 6]] as const) {
    ux(c, x, 87, w, 1, 'rgba(150,196,236,0.30)');
  }

  /*
   * Crystal clusters.
   *
   * Two of them, each a group of leaning shards with a lit facet and a bloom
   * on the floor around it. The first pass drew three lone three-pixel spikes
   * and they read as interface markers, not as rock -- a crystal needs a
   * cluster, a bright edge on one side only, and something to glow onto.
   */
  const glow = (x: number, y: number): void => {
    // Five faint steps rather than three stronger ones. A blue tint over a
    // desaturated dark floor is a hue change as much as a value change, and
    // the eye finds the edge of one at a far lower alpha than it would on a
    // grey -- so the falloff has to be finer than it looks like it needs.
    for (const [rx, ry, a] of [
      [19, 7, 0.020], [15, 5.6, 0.024], [11, 4.2, 0.028],
      [8, 3, 0.034], [5, 2, 0.040]] as const) {
      blob(c, x * DETAIL, y * DETAIL, rx * DETAIL, ry * DETAIL,
        `rgba(80,150,206,${a})`, x + rx, 3);
    }
  };
  const shard = (x: number, y: number, h: number, lean: number): void => {
    for (let k = 0; k < h * DETAIL; k++) {
      const t = k / (h * DETAIL);
      const half = Math.max(1, Math.round((1 - t) * 2.6 * DETAIL));
      const off = Math.round(t * lean * DETAIL);
      px(c, x * DETAIL - half + off, y * DETAIL - k, half * 2, 1, '#2f5f8e');
      px(c, x * DETAIL - half + off, y * DETAIL - k, DETAIL, 1, '#6aa8d4');
    }
    px(c, x * DETAIL + Math.round(lean * h * DETAIL) - 1, (y - h) * DETAIL, 2, 3, '#a8dcf4');
  };
  for (const [x, y] of [[92, 64], [136, 60]] as const) {
    glow(x, y);
    shard(x - 4, y, 5, -0.25);
    shard(x, y + 1, 8, 0.10);
    shard(x + 4, y, 4, 0.30);
  }

  // The floor has the same job the highland's washes do: give a large flat
  // area a shape without giving it any detail.
  wash(c, 118, 84, 66, 16, 311, 'rgba(96,140,196,0.055)');
  wash(c, 32, 96, 52, 14, 331, 'rgba(6,8,14,0.20)');
  wash(c, 198, 62, 56, 11, 351, 'rgba(6,8,14,0.18)');

  const skin: PadSkin = {
    top: '#43444f', mid: '#4e4f5c', lit: '#5c5e6d', rim: '#71748c', lip: '#22232b',
    wall: '#3a3b46', wallDark: '#2a2b34', shadow: 'rgba(8,10,16,0.42)',
    depth: 6, wobble: 2.4, fleck: 'rgba(110,116,140,0.22)',
  };
  return { horizon: H, padFoe: skin, padPlayer: skin, fringe: caveFringe };
}

function caveFringe(c: Ctx): void {
  // Foreground stalagmites, in three groups with gaps, rooted below the
  // message box. Silhouettes only, with one lit edge each.
  const spike = (x: number, w: number, h: number): void => {
    for (let k = 0; k < h; k++) {
      const half = Math.max(0, Math.round((w * (1 - k / h)) / 2));
      ux(c, x - half, FIELD_BOTTOM + 1 - k, half * 2 + 1, 1, '#191a24');
      ux(c, x - half, FIELD_BOTTOM + 1 - k, 1, 1, '#333750');
    }
  };
  spike(-4, 15, 22); spike(11, 9, 13); spike(23, 6, 7);
  spike(101, 8, 11); spike(113, 13, 19); spike(126, 7, 9);
  spike(198, 9, 12); spike(214, 6, 8);
  spike(231, 16, 24); spike(244, 11, 15);
  px(c, 0, (FIELD_BOTTOM - 3) * DETAIL, BUFFER_W, 4 * DETAIL, 'rgba(10,12,18,0.34)');
}

/* -------------------------------------------------------------- indoor */

function bakeIndoor(c: Ctx): Kit {
  const H = 44;

  // Wall: a ramp downward, so light falls from the ceiling.
  ramp(c, 0, H, ['#39334a', '#3f3850', '#463e58', '#4c4460', '#534a68'], 1);
  /*
   * Pilasters with a lit face and a cast shadow, spaced widely.
   *
   * A wall is a backdrop's backdrop and must not carry any weight, but a flat
   * one is a void -- the trick is to give it structure with no contrast at
   * all, so the eye registers a room and then moves on.
   */
  for (let x = -6; x < 250; x += 34) {
    ux(c, x + 6, 0, 3, H - 7, 'rgba(28,24,38,0.30)');
    ux(c, x, 0, 6, H - 7, '#443d55');
    ux(c, x, 0, 2, H - 7, '#544c66');
  }
  // A run of high windows, throwing the light everything else is lit by.
  for (let x = 8; x < 240; x += 34) {
    ux(c, x, 6, 12, 9, '#5e6f8e');
    ux(c, x + 1, 7, 10, 7, '#8fa6c4');
    ux(c, x + 1, 7, 4, 7, '#adc2da');
    ux(c, x, 15, 12, 1, '#2f2a3e');
  }
  // Dado rail and skirting: the horizontal that stops the wall being a void.
  ux(c, 0, H - 7, SCREEN_W, 3, '#6a5f80');
  ux(c, 0, H - 7, SCREEN_W, 1, '#8478a0');
  ux(c, 0, H - 4, SCREEN_W, 4, '#332e42');
  ux(c, 0, H - 1, SCREEN_W, 1, '#25212f');

  ramp(c, H, BUFFER_H / DETAIL, ['#63513f', '#6f5c47', '#7b674f', '#876f57', '#7a6349'], 0.85);

  /*
   * Board lines in one-point perspective, converging on a vanishing point set
   * back at the wall. The floor is the only place indoors with any structure,
   * so it carries the depth on its own.
   */
  const vpX = 120 * DETAIL;
  const vpY = (H - 10) * DETAIL;
  const bottom = (FIELD_BOTTOM + 6) * DETAIL;
  for (let i = -14; i <= 14; i++) {
    const endX = vpX + i * 26 * DETAIL;
    for (let Y = Math.round(H * DETAIL); Y < bottom; Y++) {
      const t = (Y - vpY) / (bottom - vpY);
      const X = Math.round(vpX + (endX - vpX) * t);
      if (X < 0 || X >= BUFFER_W) continue;
      px(c, X, Y, 1, 1, 'rgba(46,34,24,0.34)');
      px(c, X + 1, Y, 1, 1, 'rgba(240,214,180,0.09)');
    }
  }
  // Cross joints: fewer as they recede, which is the whole perspective trick.
  for (const y of [47, 52, 60, 72, 90, 112]) {
    ux(c, 0, y, SCREEN_W, 1, 'rgba(46,34,24,0.26)');
    ux(c, 0, y + 1, SCREEN_W, 1, 'rgba(240,214,180,0.07)');
  }

  /*
   * Stone rounds set into the boards.
   *
   * The first attempt made the pads out of the floor's own browns and they
   * vanished into it -- indoors there is no raised earth, no grass fringe and
   * no cast shadow from a hillside to separate a platform from its ground, so
   * the separation has to come from the material itself. Grey rounds on a wood
   * floor read instantly and cost no contrast: they are darker than the boards,
   * not brighter, so the creature standing on one still owns the frame.
   */
  const skin: PadSkin = {
    top: '#5f5d59', mid: '#6e6c67', lit: '#807d76', rim: '#948f86', lip: '#37352f',
    wall: '#4c4a45', wallDark: '#383632', shadow: 'rgba(24,16,10,0.40)',
    depth: 4, wobble: 0,
  };
  return { horizon: H, padFoe: skin, padPlayer: skin, fringe: indoorFringe };
}

function indoorFringe(c: Ctx): void {
  /*
   * A painted mark on the boards, which is what an indoor "pad" is.
   *
   * Nothing indoors is raised, so a mark has none of the rim-and-lip machinery
   * that plants a creature outdoors -- which left the first version's pads
   * invisible. What replaces it is a hard painted ring plus a soft contact
   * pool inside it: the ring says "stand here", the pool is the shadow the
   * creature would cast, and between them the sprite has a floor again.
   */
  for (const p of [FOE_PAD, PLAYER_PAD]) {
    const cx = Math.round(p.x * DETAIL);
    const cy = Math.round(p.y * DETAIL);
    blob(c, cx, cy, Math.round(p.rx * DETAIL * 0.82), Math.round(p.ry * DETAIL * 0.72),
      'rgba(32,22,14,0.16)', 0, 0);
    for (const [grow, tone] of [[3, 'rgba(238,222,180,0.34)'], [5, 'rgba(56,40,26,0.30)']] as const) {
      const rx = Math.round((p.rx + grow) * DETAIL);
      const ry = Math.round((p.ry + grow * 0.55) * DETAIL);
      for (let y = -ry; y <= ry; y++) {
        const t = Math.max(0, 1 - (y / ry) ** 2);
        const w = Math.round(rx * Math.sqrt(t));
        const inner = Math.round((rx - 2 * DETAIL) * Math.sqrt(t));
        if (w <= 0 || w <= inner) continue;
        px(c, cx - w, cy + y, w - inner, 1, tone);
        px(c, cx + inner, cy + y, w - inner, 1, tone);
      }
    }
  }
}

/* ---------------------------------------------------------------- cache */

const BAKERS: Record<BackdropKind, (c: Ctx) => Kit> = {
  highland: bakeHighland,
  coast: bakeCoast,
  quarry: bakeQuarry,
  cave: bakeCave,
  indoor: bakeIndoor,
};

interface Baked { field: HTMLCanvasElement; pads: HTMLCanvasElement; kit: Kit }

const cache = new Map<BackdropKind, Baked>();

/**
 * Two canvases, not one.
 *
 * The field never moves. The pads do: `battle.ts` shakes the combat group on
 * every hit, and the ground under a creature has to travel with it or the
 * whole effect reads as the sprite sliding on glass. Keeping them apart lets
 * the caller put each one on the side of the shake it belongs on.
 */
function baked(kind: BackdropKind): Baked {
  const hit = cache.get(kind);
  if (hit) return hit;

  const field = document.createElement('canvas');
  field.width = BUFFER_W;
  field.height = BUFFER_H;
  const fc = field.getContext('2d')!;
  fc.imageSmoothingEnabled = false;
  const kit = BAKERS[kind](fc);

  const pads = document.createElement('canvas');
  pads.width = BUFFER_W;
  pads.height = BUFFER_H;
  const pc = pads.getContext('2d')!;
  pc.imageSmoothingEnabled = false;
  pad(pc, FOE_PAD, kit.padFoe, 3);
  pad(pc, PLAYER_PAD, kit.padPlayer, 91);
  kit.fringe?.(pc);

  const out = { field, pads, kit };
  cache.set(kind, out);
  return out;
}

/** Drop the bakes; only development needs this after editing a palette. */
export function clearArenaCache(): void {
  cache.clear();
}

/* --------------------------------------------------------------- motion */

/**
 * A cloud with a flat bottom.
 *
 * Built per column from a set of overlapping lobes rather than from stacked
 * ellipses, because the flat underside is the only thing that makes a cumulus
 * read as sitting on air rather than as a blob.
 */
const LOBES: ReadonlyArray<readonly [number, number, number]> = [
  [0.20, 0.24, 0.62], [0.44, 0.32, 1.00], [0.70, 0.26, 0.78], [0.88, 0.16, 0.45],
];

/*
 * Clouds are baked too, and blitted at a drifting x.
 *
 * Drawn column by column they cost about seven hundred fill calls a frame for
 * two of them, every frame, forever -- for a shape that never changes. Painting
 * each one once into a small canvas and moving that canvas is the same picture
 * for two draw calls.
 */
const clouds = new Map<string, HTMLCanvasElement>();
function cloudArt(w: number, h: number, alpha: number): HTMLCanvasElement {
  const key = `${w}:${h}:${alpha}`;
  const hit = clouds.get(key);
  if (hit) return hit;

  const W = Math.round(w * DETAIL);
  const H = Math.round(h * DETAIL);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const body = `rgba(232,242,250,${alpha})`;
  const under = `rgba(186,210,232,${alpha})`;
  const crest = `rgba(255,255,255,${alpha * 0.8})`;
  for (let i = 0; i < W; i++) {
    let top = 0;
    const t = i / W;
    for (const [c0, rad, ht] of LOBES) {
      const d = (t - c0) / rad;
      if (d > -1 && d < 1) top = Math.max(top, Math.sqrt(1 - d * d) * ht);
    }
    const th = Math.round(top * H);
    if (th <= 0) continue;
    px(c, i, H - th, 1, th, body);
    px(c, i, H - 2, 1, 2, under);
    if (th > 3) px(c, i, H - th, 1, 1, crest);
  }
  clouds.set(key, cv);
  return cv;
}

function cloud(r: Renderer, x: number, y: number, w: number, h: number, alpha: number): void {
  r.image(cloudArt(w, h, alpha), Math.round(x), Math.round(y) - h);
}

/** Everything that moves, per kind. Deliberately small: the fight is the show. */
function motion(r: Renderer, kind: BackdropKind, ticks: number, kit: Kit): void {
  if (kind === 'highland' || kind === 'coast') {
    // Two clouds at different speeds, so the sky has parallax. They are pale
    // and low-contrast on purpose -- a bright cloud behind a creature's head
    // is a readability problem, not scenery.
    const span = SCREEN_W + 120;
    const a = ((ticks * 0.035 + 30) % span) - 90;
    const b = ((ticks * 0.017 + 190) % span) - 90;
    cloud(r, a, 22, 62, 11, 0.85);
    cloud(r, b, 14, 44, 8, 0.62);
  }

  if (kind === 'coast') {
    /*
     * Glints, in a band, drifting shoreward and twinkling out at the ends of
     * their run so none of them ever pops into or out of existence.
     */
    const seaTop = kit.horizon - 12;
    for (let i = 0; i < 11; i++) {
      const period = 150 + (i % 4) * 40;
      const t = ((ticks + i * 37) % period) / period;
      const fade = Math.sin(t * Math.PI);
      if (fade < 0.25) continue;
      const y = seaTop + 1 + (i % 5) * 2 + t * 3;
      const x = ((i * 43 + 7) % (SCREEN_W + 20)) - 10 + t * 6;
      const w = 2 + Math.round(fade * 3);
      r.rect(x, y, w, 1, `rgba(198,236,248,${(fade * 0.7).toFixed(2)})`);
    }
    // The foam edge breathes rather than sits still. Stepped two buffer pixels
    // at a time: it is a whole-width loop on every frame and the extra
    // resolution buys nothing an eye can see.
    const swell = Math.sin(ticks * 0.02) * 1.2;
    for (let X = 0; X < BUFFER_W; X += 2) {
      const d = Math.round((noise1(X * 0.012 + 41) - 0.5) * 2 * 1.8 * DETAIL + swell);
      r.pixel(X, Math.round((kit.horizon - 1) * DETAIL) + d - 1, 2, 1,
        'rgba(255,255,255,0.35)');
    }
  }

  if (kind === 'cave') {
    // One drip, on a long cycle, from the tallest stalactite.
    const t = ticks % 210;
    if (t < 46) r.rect(148, 30 + t * 1.15, 1, 2, '#8fbadd');
    else if (t < 58) {
      const k = (t - 46) / 12;
      const w = Math.round(2 + k * 7);
      r.rect(148 - w, 82, w * 2, 1, `rgba(143,186,221,${(0.5 - k * 0.5).toFixed(2)})`);
    }
    // Crystals breathing, out of phase so it never pulses as a set.
    for (const [i, x, y] of [[0, 86, 57], [1, 166, 54], [2, 130, 57]] as const) {
      const g = 0.35 + 0.35 * Math.sin(ticks * 0.028 + i * 2.1);
      r.rect(x, y, 1, 2, `rgba(150,206,244,${g.toFixed(2)})`);
    }
  }

  if (kind === 'quarry') {
    // Three motes of dust in the light, and nothing else.
    for (let i = 0; i < 3; i++) {
      const period = 320 + i * 90;
      const t = ((ticks + i * 110) % period) / period;
      const x = 70 + i * 54 + Math.sin(t * Math.PI * 2 + i) * 12;
      const y = 62 + i * 8 - t * 14;
      r.rect(x, y, 1, 1, `rgba(236,232,220,${(0.28 * Math.sin(t * Math.PI)).toFixed(2)})`);
    }
  }
}

/* ----------------------------------------------------------------- entry */

/**
 * Paint the arena.
 *
 * One call replaces the whole of the old `renderBackdrop` plus `renderPads`.
 * Pass `pads: false` and call `drawPads` yourself if the pads need to be
 * inside the scene's shake transform, which is where they belong.
 */
export function drawArena(
  r: Renderer, kind: BackdropKind | string, ticks: number,
  opts: { pads?: boolean } = {},
): void {
  const k = typeof kind === 'string' ? arenaKind(kind) : kind;
  const b = baked(k);
  r.image(b.field, 0, 0);
  motion(r, k, ticks, b.kit);
  if (opts.pads !== false) r.image(b.pads, 0, 0);
}

/** The two platforms alone, for callers that shake them with the combatants. */
export function drawPads(r: Renderer, kind: BackdropKind | string): void {
  const k = typeof kind === 'string' ? arenaKind(kind) : kind;
  r.image(baked(k).pads, 0, 0);
}
