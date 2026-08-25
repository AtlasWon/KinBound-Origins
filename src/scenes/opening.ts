/**
 * The opening cinematic.
 *
 * It has one job, and for three cuts it did not do it: explain why the game
 * starts. The film now argues in a straight line -- there is a sea, the kin
 * live by it, every seventy years it turns over, the last Turning drowned a
 * town called Old Tidefall in a night, Professor Sorrell has spent ten years
 * charting the next one, the next one has arrived eleven years early, and he
 * needs somebody out in the region writing down what they see. The last shot is
 * that somebody's house, with the water already gone off the flats in front of
 * it. Nothing in the ending is a mood any more; every frame of it is a reason.
 *
 * Everything here is drawn from the same generators the game uses, so the
 * creatures in the cinematic are the creatures in the game: the sprites are
 * built from data/creatures, not hand-drawn for the intro and left to rot when
 * a species changes.
 *
 * THE RULE THIS FILE IS BUILT ON: no shot has fewer than three layers, and no
 * two layers move at the same rate. A shot where only the creatures move is a
 * slideshow with stickers on it -- which is exactly what the first cut of this
 * was. So every shot carries a camera (a drift, a pan, a heave, a push, a
 * track), a far background that barely acknowledges it, a mid-ground the
 * subject lives in, and something close to the lens crossing fast enough to be
 * a blur of an idea.
 *
 * Skippable from the first frame. A cinematic you cannot get out of is a
 * cinematic people learn to resent.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W, DETAIL } from '../engine/renderer.js';
import { audio } from '../audio/audio.js';
import { iconSprite } from '../gfx/kinsprite.js';
import { makeTextSprite } from '../gfx/textart.js';
import { CreatorScene } from './creator.js';
import type { GameState } from '../systems/state.js';

interface Shot {
  /** Length in ticks (60 per second). */
  frames: number;
  /**
   * Beats of caption, held in order across the shot's length. Two lines each at
   * most -- anything longer is cropped by the caption box, so measure with
   * wrapText before adding one. Long shots earn a second beat; short ones do
   * not, and an empty list is a shot that talks with the picture.
   */
  captions: string[];
  /** The letterbox pulls back: the film is over and the frame opens up. */
  open?: boolean;
  /**
   * How this shot arrives and how it leaves, in ticks of black. Default FADE.
   *
   * These exist because eight identical dips to black is not a cut, it is a
   * metronome -- and the last cut of this film had exactly one transition,
   * repeated seven times, at the same length every time, which flattened a
   * storm and a drowned town into the same beat as a meadow. A montage gets its
   * rhythm from its joins, so the joins are authored per shot:
   *
   *   0 is a hard cut, and a hard cut is loud. Use it where the film wants the
   *     audience to flinch -- and set BOTH sides of the join, since a shot that
   *     fades out into a shot that starts hard still fades.
   *   A short number is a blink. It keeps two shots in the same paragraph.
   *   A long number is a full stop, and only the ends of the film get one.
   */
  fadeIn?: number;
  fadeOut?: number;
  draw(r: Renderer, t: number, p: number): void;
}

const FLYERS = ['pipwing', 'kestrelle', 'galecrest', 'gullswift', 'slatewing', 'craglide'];
const RUNNERS = ['tuftail', 'nibbet', 'bristlebuck', 'burrowen', 'cinderpaw', 'rimehound'];
const SWIMMERS = ['rilltail', 'brookmaw', 'shalefin', 'currentail', 'pinchel', 'deeplum'];

/** Scaled (and optionally flattened) copies of the kin icons, built once. */
const scaledCache = new Map<string, HTMLCanvasElement>();

function kin(
  id: string, size: number, tint: string | null = null, turn = 0, squash = 0,
): HTMLCanvasElement {
  // Both shape parameters are quantised. A creature that changes shape by a
  // fraction of a pixel every frame just shimmers -- and worse, every distinct
  // value costs a cached canvas that is never looked up again. The lean used to
  // be a raw float, which grew this map by one canvas per creature per frame.
  const px = Math.round(size);
  const step = Math.round(squash * 6);
  const lean = Math.round(turn * 10);
  const key = `${id}:${px}:${tint ?? ''}:${lean}:${step}`;
  const hit = scaledCache.get(key);
  if (hit) return hit;

  const src = iconSprite(id);
  const h = Math.max(4, Math.round(px * (1 + step / 24)));
  const w = Math.max(4, Math.round(px * (1 - step / 48)));
  const cv = document.createElement('canvas');
  cv.width = px;
  cv.height = px;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  if (lean) {
    // Front sprites stand up. A creature in open water does not, and a few
    // degrees of lean is the difference between swimming and drowning.
    c.translate(px / 2, px / 2);
    c.rotate(lean / 10);
    c.translate(-px / 2, -px / 2);
  }
  // Drawn bottom-aligned, so a squashed creature keeps its feet on the ground.
  c.drawImage(src, 0, 0, src.width, src.height, (px - w) / 2, px - h, w, h);
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (tint) {
    // Flatten to a silhouette: distance reads as shape, not detail.
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = tint;
    c.fillRect(0, 0, px, px);
  }
  scaledCache.set(key, cv);
  return cv;
}

/**
 * Where the creature actually is inside its own sprite, as fractions of the
 * sprite box.
 *
 * A kin icon is a square with a creature somewhere in it, and how much of that
 * square the creature fills is not a constant: a generated sprite is planned to
 * the cell, while the hand-drawn art in assets/kin is fitted from whatever the
 * artist exported and routinely leaves a wide margin on one side. Anything that
 * has to attach to the ANIMAL rather than to the picture of it -- a tail on the
 * back of a body, a wing on a shoulder -- has to measure, or it ends up bolted
 * to empty space. The first pass of the swimmers' tails did exactly that and
 * swam a detached dark wedge alongside every fish in the shot.
 *
 * Measured once per species and cached, off the icon rather than off a scaled
 * copy, so the numbers hold at every size the film draws.
 */
const inkCache = new Map<string, { x: number; y: number; w: number; h: number }>();

function ink(id: string): { x: number; y: number; w: number; h: number } {
  const hit = inkCache.get(id);
  if (hit) return hit;
  // Whole-sprite is the honest fallback, and the one this has to land on if the
  // canvas ever comes back tainted: a fin an inch out of place beats a crash in
  // the first thing anybody sees.
  let box = { x: 0, y: 0, w: 1, h: 1 };
  try {
    const src = iconSprite(id);
    const px = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data;
    let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1;
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        if (px[(y * src.width + x) * 4 + 3]! <= 8) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 >= 0) {
      box = {
        x: x0 / src.width, y: y0 / src.height,
        w: (x1 - x0 + 1) / src.width, h: (y1 - y0 + 1) / src.height,
      };
    }
  } catch { /* tainted or unreadable: keep the whole-sprite box */ }
  inkCache.set(id, box);
  return box;
}

/**
 * A point on the creature, in buffer pixels, given as fractions along and down
 * its INK -- and mirrored with the sprite, so `along` always means "from the
 * nose" whichever way the thing is pointed.
 */
function onKin(
  id: string, size: number, x: number, y: number,
  along: number, down: number, flip: boolean,
): { px: number; py: number; w: number; h: number } {
  const b = ink(id);
  const fx = b.x + b.w * along;
  return {
    px: x * DETAIL + (flip ? 1 - fx : fx) * size,
    py: y * DETAIL + (b.y + b.h * down) * size,
    w: b.w * size,
    h: b.h * size,
  };
}

/**
 * One wing, rooted on the shoulder and beating.
 *
 * A kin sprite is a portrait of a creature STANDING. That is what battle wants,
 * it is what every planner in gfx/kinsprite builds, and it is what the
 * hand-drawn art in assets/kin follows. Hang one in an empty sky and the pose is
 * the entire problem: legs under it, weight on them, nothing beating. A previous
 * pass fixed the biggest bird in the film by flattening it to a silhouette,
 * which throws away the DETAIL that disagrees but keeps the SHAPE that does --
 * and at 3x on the title card the flock still read as five perched creatures
 * being slid sideways through a sunrise.
 *
 * A wing is the missing piece and a wing is cheap: a swept arc whose tip throws
 * several times as far as its root. Two of them, the far one lagging a fifth of
 * a stroke and drawn behind the body, and the same sprite reads as flight from
 * the back of the room. It also MOVES, which no amount of squash on a standing
 * portrait ever did -- and motion is the difference between a creature doing
 * something and a sticker travelling across a background.
 *
 * Drawn in buffer pixels rather than logical units, because it is bolted to a
 * sprite that lands on the device grid: a wing rounded to the logical grid opens
 * a seam along the shoulder on every other frame.
 */
function wingStroke(
  r: Renderer, rootX: number, rootY: number, span: number,
  beat: number, back: number, col: string, bias = 0.26,
): void {
  // Oversampled deliberately. The tip moves furthest per step, and a wing
  // sampled once per pixel of span comes apart into dashes at the end of a hard
  // downbeat -- which is the exact frame anyone looking at it will freeze on.
  const steps = Math.max(6, Math.round(span * 2.2));
  // Wings live ABOVE the body far more of the time than below it, and that bias
  // is most of what separates a bird from a fish. The first pass of this had
  // none, and every bird in the sky grew a horizontal spike out of its back --
  // which is to say, grew a tail. Pass 0 and the same machinery draws exactly
  // that on purpose: a caudal fin, symmetrical about the spine. See washKin.
  const rise = beat * 0.72 + bias;
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    // Reach BACK about as far as it reaches up. Steeper than that and the wing
    // is a shark fin standing on a bird's back -- which is what this looked like
    // when the vertical throw was half again the horizontal one. A wing is a
    // crescent, and a crescent is a shape that is wider than it is tall.
    const px = rootX + back * span * (u * 0.55 + u * u * 0.45);
    // The tip throws and the root does not, and the curve between them is the
    // camber. A wing rotating rigidly about the shoulder is a pair of scissors
    // opening and closing.
    const py = rootY - rise * u ** 1.5 * span * 0.8;
    // Squared, so the wing holds its depth through the middle and only gives it
    // up at the tip. Tapered linearly it comes to a point too early and reads as
    // a spar with nothing stretched over it.
    const chord = Math.max(1, Math.round((1 - u * u * 0.86) * span * 0.62));
    r.pixel(px, py - chord * 0.5, 2, chord, col);
  }
}

/**
 * A kin in the air: far wing, body, near wing, in one flat colour.
 *
 * `phase` is the stroke in radians and every caller must hand each bird its own.
 * A flock beating in unison is a mobile, not a flock.
 *
 * Colours come in as rgba rather than as a hex plus an alpha argument, so the
 * wings and the body it grows out of are laid down at one opacity in one pass.
 * Fading the sprite with r.image's alpha and the wing with its own would show
 * the join every time the two overlapped.
 */
/**
 * How much of a kin sprite survives into the air. The bottom sixth is feet, and
 * a flying creature has them tucked. Anything that needs to know where an
 * airborne sprite's belly actually is has to measure with this.
 */
const TUCK = 0.84;

function airKin(
  r: Renderer, id: string, size: number, x: number, y: number,
  phase: number, turn: number, squash: number, flip: boolean,
  col: string, rim: string | null = null, amp = 1,
): void {
  const back = flip ? -1 : 1;
  // As long as the creature. A wing shorter than the body it is bolted to reads
  // as a fin, which is what the first pass of this looked like: the silhouette
  // has to get WIDER when the wing goes out, or nothing has happened. Measured
  // off the ink, so a hand-drawn sprite sitting in a corner of its cell gets a
  // wing to match itself rather than to match the empty square around it.
  const shoulder = onKin(id, size, x, y, 0.56, 0.34, flip);
  const span = shoulder.w * 1.05;
  const pass = (ox: number, oy: number, c: string): void => {
    // Behind the middle of the body and a little above it, which is where a
    // wing joins a bird -- and `back` puts it behind whichever way this one is
    // pointed, since every sprite in the game is drawn facing left and the flip
    // is what turns it round.
    const rx = shoulder.px + ox * DETAIL;
    const ry = shoulder.py + oy * DETAIL;
    // The far wing runs a quarter of a stroke behind and is rooted well back and
    // high, so it clears the near one instead of hiding under it. Two wings on
    // one clock along one line is one wing drawn twice, which was the first
    // version of this and cost a draw for nothing.
    wingStroke(r, rx + back * size * 0.2, ry - size * 0.16, span * 0.78,
      Math.sin(phase - 0.8) * amp, back, c);
    // The legs come off. A kin sprite stands on them, and a bird in the air does
    // not have them hanging: cropping the bottom sixth of the source is the
    // whole of tucking your feet up, and it is the single change that stops
    // these reading as creatures being carried through a sky by a crane.
    r.image(kin(id, size, c, turn, squash), x + ox, y + oy,
      0, 0, size, Math.round(size * TUCK), flip);
    wingStroke(r, rx, ry, span, Math.sin(phase) * amp, back, c);
  };
  // The rim goes down first as a whole bird, wings included, offset toward the
  // light. Rimming the body alone left the wings as holes cut in the sky.
  if (rim) pass(1, 1, rim);
  pass(0, 0, col);
}

/**
 * A creature drawn backlit: a warm edge with a dark body sitting on top of it.
 *
 * A silhouette has no pose to disagree with. It has an outline, and an outline
 * of a bird against a dawn sky is a bird. The rim is the whole trick: one unit
 * of the sun's colour showing past the dark shape on the side the light is
 * coming from, so it reads as a thing with light behind it rather than as a
 * hole cut in the picture.
 *
 * The sun in this film is always low and to the right of frame, so the light
 * spills round the bottom-right edge. One unit, never two: two is a halo. And
 * the body is darker than anything it can fly across -- this was one shade off
 * the near headland's own fill for a pass, and the result was a bird that
 * dissolved into the coast every time it crossed one, leaving its rim behind as
 * a squiggle in mid-air.
 */
const RIM_LIT = 'rgba(255,190,130,0.85)';
const RIM_DARK = '#080d1c';

function rimKin(
  r: Renderer, id: string, size: number, x: number, y: number,
  phase: number, turn: number, squash: number, flip: boolean, amp = 1,
): void {
  airKin(r, id, size, x, y, phase, turn, squash, flip, RIM_DARK, RIM_LIT, amp);
}

/**
 * A creature graded into the water it is swimming in.
 *
 * The two underwater shots are each built on a single hue -- one blue, one
 * green -- and the reason they look like water and not like a blue rectangle is
 * that NOTHING in either of them escapes that hue. Every building, every frond,
 * every shaft of light is a value of the one colour.
 *
 * The creatures were the exception, and once hand-drawn art landed they became
 * a loud one: an orange kin at full saturation forty feet under is a sticker on
 * the picture, and it is also a lie, because red is the first thing the water
 * takes. So the sprite is drawn, and then a silhouette of itself is laid over
 * it in the colour of the water at partial alpha. Shape and internal value
 * survive; the palette does not. It is a colour grade, done with the two
 * operations this renderer actually has.
 */
function washKin(
  r: Renderer, id: string, size: number, x: number, y: number,
  phase: number, turn: number, squash: number, flip: boolean,
  water: string, depth: number, lit: string, fin: string,
): void {
  // The tail, sweeping, rooted on the back of the body and drawn behind it.
  //
  // The grade fixed the COLOUR of a creature in open water and left the other
  // half of the problem alone: a kin sprite is a portrait of something standing
  // still, and forty feet down a portrait of something standing still is a
  // stuffed animal being towed sideways. A tail is what a fish moves with, and
  // it is the same stroke as a wing with the bias taken out -- so the two
  // underwater shots now have something in them that is swimming rather than
  // drifting, on the same twenty lines that got the sky flying.
  // Rooted three quarters of the way down the body and halfway through its
  // depth -- on the ANIMAL, measured, not on the corner of the square it was
  // drawn in. See ink().
  const back = flip ? -1 : 1;
  const root = onKin(id, size, x, y, 0.76, 0.52, flip);
  wingStroke(r, root.px, root.py, root.w * 0.42, Math.sin(phase), back, fin, 0);
  // Underwater the light comes from straight up, so the edge that catches it is
  // the TOP one -- the opposite of every backlit bird in the sky shots, and the
  // reason this is its own function rather than rimKin with a different colour.
  // Without it a hard grade turns a creature into a flat patch of water-coloured
  // nothing; with it, the same patch has a back and a belly.
  r.image(kin(id, size, lit, turn, squash), x, y - 0.5,
    0, 0, undefined, undefined, flip);
  r.image(kin(id, size, null, turn, squash), x, y,
    0, 0, undefined, undefined, flip);
  r.image(kin(id, size, water, turn, squash), x, y,
    0, 0, undefined, undefined, flip, false, depth);
}

/**
 * Whether a kin travelling at `vx` needs r.image's flipX.
 *
 * EVERY generated sprite is drawn facing LEFT. That is not a style choice in
 * this file, it is how gfx/kinsprite builds them: planQuadruped puts the head
 * at `cx - bodyRx * 0.42` and the tail root at `cx + bodyRx`, planFish puts the
 * eyes and lips at `cx - rx` and the caudal fin at `cx + rx`, planAquatic the
 * same. So the creature that needs flipping is the one going RIGHT.
 *
 * This was inverted -- in the deep shot -- or simply missing -- everywhere else
 * -- for the whole of the last cut, which is why every herd in the film ran one
 * way and looked the other. Route every moving creature through this rather
 * than passing a literal, so there is one place to be wrong.
 */
function facing(vx: number): boolean {
  return vx > 0;
}

/* --------------------------------------------------------------- maths */

/** Deterministic scatter so the cinematic plays the same way every time. */
function series(n: number, seed: number): number[] {
  const out: number[] = [];
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(s / 0x7fffffff);
  }
  return out;
}

/**
 * A 0..1 value from an integer, with no table behind it. Scatter that is looked
 * up sixty times a second must not allocate an array sixty times a second, and
 * most of the layers in here want a different jitter per element per layer.
 */
function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Smoothstep. A camera that starts and stops abruptly reads as a jump cut. */
function smooth(p: number): number {
  const c = Math.max(0, Math.min(1, p));
  return c * c * (3 - 2 * c);
}

/** For things that arrive: they decelerate into place, never into a wall. */
function easeOut(p: number): number {
  const c = Math.max(0, Math.min(1, p));
  return 1 - (1 - c) ** 3;
}

/**
 * Wrap a scrolling coordinate into [-pad, span+pad). Every parallax layer here
 * is an endless belt of a few shapes; this is what joins the belt up instead of
 * snapping it back to zero in the middle of the frame.
 */
function wrap(x: number, span: number, pad: number): number {
  const s = span + pad * 2;
  return ((x % s) + s) % s - pad;
}

function band(from: string, to: string, t: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const f = (i: number) =>
    Math.round(p(from, i) + (p(to, i) - p(from, i)) * t).toString(16).padStart(2, '0');
  return `#${f(0)}${f(1)}${f(2)}`;
}

/** Sky as horizontal bands between two colours. */
function sky(r: Renderer, top: string, bottom: string, y0: number, y1: number, steps = 12): void {
  const h = (y1 - y0) / steps;
  if (h <= 0) return;
  for (let i = 0; i < steps; i++) {
    r.rect(0, y0 + i * h, SCREEN_W, Math.ceil(h) + 1, band(top, bottom, i / (steps - 1)));
  }
}

/* ---------------------------------------------------------- shared layers */

interface CloudBand {
  seed: number;
  count: number;
  y: number;
  spread: number;
  /** Logical units per tick. The only thing that says how far away this is. */
  speed: number;
  minW: number;
  maxW: number;
  thick: number;
  top: string;
  under: string;
}

/** One drifting deck of cloud. Stack two or three of these at different speeds. */
function clouds(r: Renderer, t: number, c: CloudBand): void {
  for (let i = 0; i < c.count; i++) {
    const s = c.seed + i * 7;
    const cw = c.minW + hash(s) * (c.maxW - c.minW);
    const cy = c.y + hash(s + 1) * c.spread;
    const cx = wrap(hash(s + 2) * (SCREEN_W + 120) - t * c.speed, SCREEN_W, 70);
    r.rect(cx, cy, cw, c.thick, c.top);
    // Two shoulders on top: a cloud drawn as one slab is a shelf.
    r.rect(cx + cw * 0.18, cy - c.thick * 0.6, cw * 0.44, c.thick * 0.7, c.top);
    r.rect(cx + cw * 0.56, cy - c.thick, cw * 0.24, c.thick, c.top);
    r.rect(cx + 1, cy + c.thick, cw - 3, 1, c.under);
  }
}

/* ------------------------------------------------------------- the shots */

const HORIZON = 84;

const SEA_SEEDS = series(24, 4242);
const STAR_SEEDS = series(48, 2201);
const HERD_SEEDS = series(18, 777);
const DEEP_SEEDS = series(24, 5150);
const TOWN_SEEDS = series(60, 8080);

/**
 * Dawn over the Caeloran Sea, with the flocks going out over it.
 *
 * The camera starts on the sky and drifts down onto the water over the whole
 * shot. Everything hangs off `par(depth)`: the sky barely moves, the birds move
 * more the nearer they are, and the swell at the bottom of the frame overshoots
 * the camera entirely. That single number is the shot.
 */
function shotSea(r: Renderer, t: number, p: number): void {
  const cam = -30 + smooth(p) * 38;
  const par = (depth: number): number => -cam * depth;
  const hz = HORIZON + par(1);
  const high = par(0.35);

  r.rect(0, 0, SCREEN_W, SCREEN_H, '#0e1633');
  sky(r, '#0e1633', '#f4b878', -46 + high, hz, 16);

  // Stars, going out as the sun comes up. They are on the slowest layer, so
  // they also anchor how little the far sky moves next to everything else.
  const night = Math.max(0, 1 - p * 1.9);
  if (night > 0.03) {
    for (let i = 0; i < 24; i++) {
      const y = STAR_SEEDS[i + 24]! * 44 + high;
      if (y < 1 || y > hz - 24) continue;
      const a = night * (0.35 + 0.65 * Math.sin(t * 0.06 + i * 2.3));
      if (a < 0.14) continue;
      r.rect(STAR_SEEDS[i]! * SCREEN_W, y, 1, 1, `rgba(226,236,255,${a.toFixed(2)})`);
    }
  }

  clouds(r, t, {
    seed: 771, count: 7, y: 6 + par(0.3), spread: 22, speed: 0.05,
    minW: 34, maxW: 78, thick: 1,
    top: 'rgba(255,214,178,0.30)', under: 'rgba(226,150,116,0.24)',
  });
  clouds(r, t, {
    seed: 908, count: 5, y: 28 + par(0.42), spread: 18, speed: 0.12,
    minW: 22, maxW: 54, thick: 2,
    top: 'rgba(255,198,152,0.36)', under: 'rgba(198,124,104,0.32)',
  });

  // The sun clearing the water. Three rings rather than a glow gradient: a soft
  // falloff at this resolution is just a smear.
  const sunX = SCREEN_W * 0.63;
  const sunY = hz - 3 - smooth(p) * 9;
  r.ellipsePixel(sunX * DETAIL, sunY * DETAIL, 32 * DETAIL, 32 * DETAIL, 'rgba(255,186,108,0.07)');
  r.ellipsePixel(sunX * DETAIL, sunY * DETAIL, 19 * DETAIL, 19 * DETAIL, 'rgba(255,208,136,0.11)');
  r.ellipsePixel(sunX * DETAIL, sunY * DETAIL, 11 * DETAIL, 11 * DETAIL, '#ffe2a6');

  // Two headlands closing the frame. They are not the same coast twice: the far
  // range is shifted 34 units along, hunched lower and cut off nearer the
  // middle of the frame, because two silhouettes on the same curve at slightly
  // different speeds just look like one silhouette with a fringe on it.
  for (let layer = 0; layer < 2; layer++) {
    const far = layer === 0;
    const drift = smooth(p) * (far ? 4 : 17);
    const shift = far ? 34 : 0;
    const fill = far ? '#33436a' : '#131c33';
    const lip = far ? '#4a5c86' : '#26334f';
    // Two humps rather than one ramp, so the coast has shoulders instead of
    // looking like a shelf someone put the sea on.
    for (let x = 0; x < SCREEN_W; x++) {
      const wx = x + drift + shift;
      const edge = Math.min(1, Math.abs(wx - SCREEN_W / 2) / (SCREEN_W / 2));
      const swell = Math.sin(edge * Math.PI * (far ? 0.62 : 0.5)) ** (far ? 2 : 3);
      const bumps = edge > (far ? 0.34 : 0.5)
        ? Math.sin(wx * (far ? 0.052 : 0.09) + layer) * (far ? 2.6 : 1.6)
          + Math.sin(wx * (far ? 0.019 : 0.031)) * 2.4
        : 0;
      const h = Math.floor(swell * (far ? 26 : 33) + bumps);
      if (h <= 1) continue;
      r.rect(x, hz - h, 1, h + 3, fill);
      r.rect(x, hz - h, 1, 1, lip);
    }
  }

  sky(r, '#d08a5e', '#2b5079', hz, hz + 16, 5);
  sky(r, '#2b5079', '#0c1a2e', hz + 16, SCREEN_H + 30, 10);

  // The sun's road on the water: it widens toward the lens and every rung of it
  // slides sideways on its own clock.
  for (let i = 0; i < 20; i++) {
    const y = hz + 2 + i * 3;
    if (y > SCREEN_H) break;
    const j = Math.sin(t * 0.09 + i * 1.7) * (2 + i * 1.1);
    const w = 3 + (i % 3) * 3 + hash(i + 60) * 7;
    const a = 0.44 - i * 0.017;
    if (a <= 0.02) continue;
    r.rect(sunX - w / 2 + j, y, w, 1, `rgba(255,214,150,${a.toFixed(2)})`);
  }

  // Swell lines. The spacing opens up toward the bottom of the frame and the
  // speed climbs with it, which is the only perspective a flat sea gets.
  for (let i = 0; i < 22; i++) {
    const y = hz + 3 + i * 1.6 + i * i * 0.13;
    if (y > SCREEN_H + 8) break;
    const speed = 0.18 + i * 0.08;
    const w = 10 + hash(i + 200) * 26;
    const x = wrap(hash(i + 240) * SCREEN_W * 2 + t * speed, SCREEN_W, 40);
    r.rect(x, y, w, 1, i > 12 ? 'rgba(198,224,255,0.22)' : 'rgba(255,232,198,0.20)');
    r.rect(x + w * 0.3, y + 1, w * 0.4, 1, 'rgba(18,38,64,0.26)');
  }

  // The stroke, per bird. A wing is the only clock in the sky that has to be
  // fast: the body bob it replaces is now a fraction of what it was, because a
  // bird that pumps its chest AND beats its wings is a bird having a fit.
  const beat = (i: number, rate: number): number => Math.sin(t * rate + i * 2.1) * 0.24;

  // A far skein in loose formation, travelling as one shape. It is what makes
  // the two nearer layers read as individual birds rather than more of these.
  // The whole skein flies right, so the whole skein is flipped -- a vee where
  // the leader faces the way it is going and the wing does not is a mess.
  //
  // The stroke runs DOWN the vee rather than across it: each bird is a fifth of
  // a beat behind the one ahead, so the flap travels back through the formation
  // the way it does over a real skein. Seven birds on one phase is a machine.
  const skein = wrap(t * 0.24 - 60, SCREEN_W, 46);
  for (let i = 0; i < 7; i++) {
    const lane = i - 3;
    airKin(
      r, FLYERS[i % FLYERS.length]!, 10,
      // The vee trails BEHIND the leader, so with the flock heading right the
      // stragglers sit to its left.
      skein - Math.abs(lane) * 7 + lane * 1.5,
      12 + par(0.5) + Math.abs(lane) * 3.5 + Math.sin(t * 0.035 + i * 0.8) * 1.5,
      t * 0.3 - Math.abs(lane) * 0.42, 0, beat(i, 0.3), facing(1),
      'rgba(40,55,92,0.8)',
    );
  }

  for (let i = 0; i < 5; i++) {
    const x = wrap(t * 0.5 + SEA_SEEDS[i + 7]! * 320, SCREEN_W, 34);
    const y = 20 + par(0.7) + SEA_SEEDS[i + 12]! * 26 + Math.sin(t * 0.055 + i * 2) * 3;
    airKin(r, FLYERS[(i + 2) % FLYERS.length]!, 20, x, y,
      t * 0.26 + i * 2.1, 0, beat(i, 0.26), facing(1), '#3a4d78');
  }

  // The lead. It banks through the shot instead of holding one pose, and it is
  // the one bird in the frame with an edge of light on it -- which is what the
  // eye follows here, not colour.
  //
  // It used to be drawn full colour at 42 units, and that stopped working the
  // day half the roster became hand-drawn art: every sprite in this game, drawn
  // or generated, is a creature STANDING, and a standing portrait blown up to a
  // quarter of the screen height in an empty sky reads as a bird perched on
  // nothing. Backlit is both the truth of the shot -- the sun is behind
  // everything up there -- and the one treatment that reads the same whichever
  // route the sprite came down. See rimKin and wingStroke.
  const bankPhase = Math.sin(t * 0.03);
  const leadX = wrap(t * 0.95, SCREEN_W, 52);
  const leadY = 28 + par(0.9) + bankPhase * 9 + Math.sin(t * 0.09) * 2;
  // Beats to climb, then holds the wings out and rides. A big bird does not
  // row continuously and one that does looks like a wind-up toy: the stroke
  // dies away at the top and bottom of the bank, which is exactly where a
  // soaring bird is coasting, and comes back hardest through the middle where
  // it is working. `amp` is that -- three or four beats, a long glide, repeat.
  const workRate = Math.abs(Math.cos(t * 0.03));
  rimKin(r, 'kestrelle', 32, leadX, leadY,
    t * 0.115, bankPhase * 0.32, Math.sin(t * 0.115) * 0.22, true,
    0.2 + workRate * 0.9);

  // One flyer down on the deck. It does not slide across the water: it drops
  // onto it on a fixed clock, touches, and climbs away leaving a ring that goes
  // on opening after it has gone. A creature doing one thing is worth three
  // crossing the frame, and the touch is the only moment in the shot that ties
  // the sky to the sea.
  const DIVE = 112;
  const dive = (t % DIVE) / DIVE;
  // Down over the first two fifths, away over the remaining three: a bird
  // pulling out of a dip climbs slower than it fell.
  const drop = dive < 0.4 ? smooth(dive / 0.4) : 1 - smooth((dive - 0.4) / 0.6);
  // Where the bird's belly meets the water, and the sprite hung off it.
  //
  // This used to subtract SKIM -- the sprite's size in BUFFER pixels -- from a
  // waterline in LOGICAL units, so at the bottom of its arc the bird still hung
  // eleven units clear of the ring it was supposed to be making. The touch is
  // the only thing this whole beat exists for, so it is measured properly now:
  // the drawn height of a tucked sprite is `SKIM * TUCK / DETAIL`, and the bird
  // reaches the water when its bottom edge does.
  //
  // It works the water just under the horizon, and that is a lighting decision
  // rather than a staging one: down on the open blue a dark bird is a dark bird
  // on dark water and simply disappears. The band immediately below the horizon
  // is the sky's reflection, it is the brightest water in the frame, and a
  // silhouette laid across it reads from the back of the room.
  const SKIM = 22;
  const seaY = hz + 13;
  const skimX = wrap(t * 1.35 - 120, SCREEN_W, 44);
  const skimY = seaY - (SKIM * TUCK) / DETAIL - 15 * (1 - drop);
  // Ticks since the last touch, and where along the water that touch happened.
  const since = ((dive - 0.4 + 1) % 1) * DIVE;
  const ringX = skimX + SKIM * 0.42 - since * 1.35;
  if (since < 54 && ringX > -30 && ringX < SCREEN_W + 30) {
    const age = since / 54;
    for (let k = 0; k < 2; k++) {
      const rr = (2 + age * 15) * (1 - k * 0.42);
      if (rr < 1) continue;
      r.ellipsePixel(ringX * DETAIL, (seaY - 1) * DETAIL, rr * DETAIL, rr * 0.34 * DETAIL,
        `rgba(255,238,208,${(0.34 * (1 - age) * (1 - k * 0.4)).toFixed(2)})`);
    }
    // The splash itself: a handful of specks thrown up out of the ring and
    // falling back, alive for well under a second.
    if (since < 16) {
      for (let k = 0; k < 7; k++) {
        const u = since / 16;
        const vx = (hash(k + 480) - 0.5) * 9;
        r.rect(ringX + vx * u * 2, seaY - 3 - (1 - (2 * u - 1) ** 2) * (4 + hash(k + 520) * 5),
          1, 1, `rgba(255,244,216,${(0.7 * (1 - u)).toFixed(2)})`);
      }
    }
  }
  // The shadow lives on the WATER, not under the bird: it stays at the surface
  // and tightens as the bird comes down. A blob pinned to the feet is what made
  // this look like a wader standing in the shallows.
  const gap = Math.max(0, 1 - drop);
  r.ellipsePixel((skimX + SKIM * 0.42) * DETAIL, seaY * DETAIL,
    (4 + gap * 6) * DETAIL, 1.4 * DETAIL, `rgba(10,24,42,${(0.3 - gap * 0.16).toFixed(2)})`);
  // Two behaviours, not one loop. Coming down it does not row: the wings are
  // cocked high and still and it falls on them, which is what makes the drop
  // read as a decision rather than as a sprite descending. The moment it has
  // touched, it hauls -- hard and fast, and the stroke fades back to a hold as
  // it gets its height. A bird that beats at one rate through a dive is a bird
  // that has not noticed the water.
  const climbing = dive >= 0.4;
  const haul = climbing ? Math.min(1, (dive - 0.4) / 0.3) : 0;
  rimKin(r, 'gullswift', SKIM, skimX, skimY,
    climbing ? t * 0.34 : Math.PI / 2, -0.1 - drop * 0.12,
    Math.sin(t * 0.34) * 0.22 * haul, true,
    climbing ? 1.25 - haul * 0.55 : 0.62);

  // The closest thing to the lens: a swell crossing at twice the camera's own
  // rate. Depth in a flat drawing comes from things crossing at different
  // speeds, not from shading.
  const swellY = 136 + par(1.25) * 0.4 + Math.sin(t * 0.05) * 3;
  const crest = (x: number): number => {
    const wx = x + t * 2.2;
    return 7 + Math.sin(wx * 0.045) * 4 + Math.sin(wx * 0.013 + 1.7) * 3;
  };
  for (let x = 0; x < SCREEN_W; x += 2) {
    const top = swellY - crest(x);
    r.rect(x, top, 2, SCREEN_H + 10 - top, '#0a1526');
    r.rect(x, top, 2, 1, '#1c3552');
  }
  for (let i = 0; i < 14; i++) {
    const fx = wrap(hash(i + 90) * SCREEN_W - t * 2.2, SCREEN_W, 14);
    r.rect(fx, swellY - crest(fx) - 1, 2 + (i % 3), 1, 'rgba(214,236,255,0.32)');
  }
}

/**
 * The grasslands, and the herds crossing them.
 *
 * A lateral pan that also tilts up: the frame starts pointed at the grass and
 * comes level with the ridgeline. Nine layers cross at nine speeds, from cirrus
 * at a twentieth of a unit a frame to foreground blades at four and a half.
 */
function shotPlains(r: Renderer, t: number, p: number): void {
  const pan = t * 1.05;
  const cam = 8 - smooth(p) * 8;
  const par = (depth: number): number => cam * depth;
  // The grass line sits high. The first cut put it at 92, which left a third of
  // the frame of empty sky over a strip of field with a herd crammed into the
  // letterbox; the shot is about the ground, so the ground gets the frame.
  const hz = 66 + par(0.8);
  const gy = 84 + par(1);

  sky(r, '#3f79c6', '#d2e6f3', -12 + par(0.3), hz, 12);

  clouds(r, t, {
    seed: 1301, count: 6, y: 4 + par(0.3), spread: 16, speed: 0.04,
    minW: 40, maxW: 84, thick: 1,
    top: 'rgba(255,255,255,0.42)', under: 'rgba(196,220,240,0.34)',
  });
  clouds(r, t, {
    seed: 1471, count: 6, y: 14 + par(0.38), spread: 26, speed: 0.1,
    minW: 24, maxW: 52, thick: 4,
    top: 'rgba(255,255,255,0.62)', under: 'rgba(184,210,234,0.55)',
  });
  clouds(r, t, {
    seed: 1607, count: 4, y: 44 + par(0.46), spread: 12, speed: 0.19,
    minW: 18, maxW: 40, thick: 3,
    top: 'rgba(248,252,255,0.55)', under: 'rgba(176,202,228,0.5)',
  });

  // Two specks crossing the far sky. Nothing in the herd's world reaches them,
  // which is the point of putting them there. They drift left, against the
  // herd, so the sky is not just a slower copy of the ground.
  for (let i = 0; i < 3; i++) {
    const x = wrap(hash(i + 20) * SCREEN_W * 2 - t * 0.16, SCREEN_W, 20);
    const y = 12 + par(0.35) + hash(i + 26) * 16 + Math.sin(t * 0.03 + i) * 2;
    airKin(r, FLYERS[(i + 1) % FLYERS.length]!, 8, x, y,
      t * 0.24 + i * 2.4, 0, Math.sin(t * 0.24 + i) * 0.2, facing(-1),
      'rgba(125,158,196,0.7)');
  }

  // Two ridgelines and then the treeline. The ridges are landform; the trees
  // are the layer that gives them a scale to be big against.
  for (let layer = 0; layer < 2; layer++) {
    const speed = 0.13 + layer * 0.17;
    const baseY = hz - 6 + layer * 11 + par(0.15 * layer);
    const fill = layer === 0 ? '#61866f' : '#4a7260';
    const lip = layer === 0 ? '#76997f' : '#5c8770';
    for (let x = 0; x < SCREEN_W; x++) {
      const wx = x + pan * speed;
      const h = 11 + Math.sin(wx * 0.035 + layer) * 5 + Math.sin(wx * 0.011) * 4;
      r.rect(x, baseY - h, 1, h + 34, fill);
      r.rect(x, baseY - h, 1, 1, lip);
    }
  }

  for (let i = 0; i < 26; i++) {
    const x = wrap(hash(i + 300) * SCREEN_W * 1.6 - pan * 0.44, SCREEN_W, 18);
    const th = Math.round(6 + hash(i + 360) * 7);
    const base = gy - 2 + Math.round(hash(i + 420) * 3);
    for (let k = 0; k < th; k++) {
      const w = Math.round((k / th) * 5) + 1;
      r.rect(Math.round(x - w / 2), base - th + k, w, 1, k < th * 0.35 ? '#32523f' : '#274330');
    }
    r.rect(Math.round(x), base - 1, 1, 2, '#22321f');
  }

  r.rect(0, gy, SCREEN_W, SCREEN_H + 20 - gy, '#79b262');
  r.rect(0, gy, SCREEN_W, 2, '#93c777');

  // Bushes rooted in the grass rather than hidden behind it. They used to be
  // drawn before the ground fill, which buried all but four units of them.
  for (let i = 0; i < 15; i++) {
    const x = wrap(hash(i + 500) * SCREEN_W * 1.4 - pan * 0.62, SCREEN_W, 16);
    const bw = Math.round(5 + hash(i + 540) * 9);
    const base = gy + 3 + Math.round(hash(i + 580) * 3);
    for (let k = 0; k < bw / 2; k++) {
      const lift = Math.round(Math.sin((k / (bw / 2)) * Math.PI) * 6);
      r.rect(x + k, base - lift, 1, lift + 2, '#33553f');
      r.rect(x + bw - k, base - lift, 1, lift + 2, '#2c4a37');
    }
  }

  // THE COLUMN. The line over this shot says whole species walk to the far
  // shore, and for three cuts the picture under it was nine animals spread over
  // an empty field -- which is nine animals, not a species. So there is a mass
  // of them strung along the foot of the treeline: small enough to be shape
  // rather than creature, dense enough to read as one body moving, and drawn
  // dark against the light grass so the eye takes them as a single dark stripe
  // crossing the field before it takes them as anything else.
  //
  // It is the same job the skein does in the sea shot and the school does in the
  // deep. The individuals in the near lanes cannot read as members of something
  // until there is a something for them to be members of, and once there is, the
  // three big ones in the foreground stop being the whole population and start
  // being the ones the camera happened to catch.
  for (let i = 0; i < 22; i++) {
    const file = i % 2;
    const size = 10 + Math.round(hash(i + 1200) * 3) * 2;
    const half = size / DETAIL / 2;
    // Down off the treeline and out into the open grass. Sat at its foot they
    // were the same value, the same size and the same colour as the bushes and
    // simply became more shrubbery: a distant animal only reads as an animal
    // while there is clear ground under it.
    const feet = gy + 6 + file * 4 + Math.round(hash(i + 1240) * 2);
    // Bunched rather than sprinkled evenly across the belt. Twenty-two animals
    // spaced at regular intervals is a fence of animals; the same twenty-two
    // crowded into two thirds of the belt is a column with a head and a tail.
    // Barely faster than the ridge behind them and far slower than the near
    // lanes: distance is speed in a flat drawing and nothing else.
    const x = wrap(hash(i + 1280) * SCREEN_W * 0.85 + t * (0.26 + file * 0.07),
      SCREEN_W, 22);
    const ph = t * 0.3 + hash(i + 1320) * 6.283;
    const air = Math.max(0, Math.sin(ph));
    r.ellipsePixel((x + half) * DETAIL, feet * DETAIL,
      half * DETAIL * 0.95, 1.2 * DETAIL, 'rgba(30,58,32,0.34)');
    // Dusty brown, not another green. Every plant in this frame is a value of
    // the field; the column has to be the one dark thing on it that is not.
    r.image(kin(RUNNERS[i % RUNNERS.length]!, size, '#4e4432', 0, Math.cos(ph) * 0.32),
      x, feet - half * 2 - air * 1.4, 0, 0, undefined, undefined, facing(1));
  }
  // The dust the column is raising, hanging over it and drifting back. A mass of
  // animals crossing dry ground is visible from a mile off because of this and
  // not because of the animals.
  for (let i = 0; i < 12; i++) {
    const x = wrap(hash(i + 1360) * SCREEN_W * 0.9 + t * 0.19, SCREEN_W, 30);
    const y = gy + 3 + hash(i + 1400) * 5 + Math.sin(t * 0.03 + i) * 1.2;
    r.rect(x, y, 16 + hash(i + 1440) * 26, 2, 'rgba(226,232,198,0.13)');
  }

  // The ground takes four passes, because one flat slab of green is exactly
  // what the last cut of this shot was. Broad bands first, then the worn track
  // the herd runs on, then tufts, then a shadow across the near edge.
  for (let i = 0; i < 10; i++) {
    const y = gy + 4 + i * 7;
    const w = 40 + ((i * 37) % 90);
    const x = wrap(i * 61 - pan * (0.55 + i * 0.07), SCREEN_W, 70);
    r.rect(x, y, w, 3, i % 2 ? 'rgba(255,255,255,0.09)' : 'rgba(34,84,44,0.20)');
  }

  // Three worn strips, one per lane. Grass that has been crossed for seventy
  // years is not grass any more, and it gives the dust somewhere to come from.
  for (let lane = 0; lane < 3; lane++) {
    const y = 92 + par(1) + lane * 17;
    const h = 3 + lane;
    r.rect(0, y, SCREEN_W, h, 'rgba(150,142,88,0.16)');
    for (let i = 0; i < 12; i++) {
      const s = i + lane * 20 + 620;
      const x = wrap(hash(s) * SCREEN_W * 1.3 - pan * (0.75 + lane * 0.22), SCREEN_W, 24);
      r.rect(x, y + (i % 2), 8 + hash(s + 1) * 22, 1, 'rgba(178,166,104,0.28)');
    }
  }

  // Tufts, sized and paced by how near the camera they are.
  for (let i = 0; i < 88; i++) {
    const u = hash(i + 700);
    const y = gy + 3 + u * u * 68;
    const sz = 1 + Math.round(u * 2);
    const x = wrap(hash(i + 740) * SCREEN_W - pan * (0.6 + u * 1.1), SCREEN_W, 14);
    r.rect(x, y, sz + 1, 1, u > 0.55 ? '#487c3d' : '#5f9a52');
    r.rect(x + sz, y - sz, 1, sz, u > 0.55 ? '#63a054' : '#7cba68');
  }

  // Gusts crossing the field. The grass has to acknowledge the wind that is
  // moving the clouds, or the two halves of the frame look like different days.
  for (let g = 0; g < 3; g++) {
    const gx = wrap(-t * 2.6 + g * 150, SCREEN_W, 84);
    for (let i = 0; i < 26; i++) {
      const y = gy + 4 + hash(i + g * 50 + 800) * 68;
      const bend = Math.sin((y - gy) * 0.3 + t * 0.2) * 2;
      r.rect(gx + hash(i + g * 50 + 860) * 74 + bend, y, 4, 1, 'rgba(220,246,196,0.26)');
    }
  }

  // The near edge of the field falls into shadow, so the ground has a front.
  for (let i = 0; i < 14; i++) {
    r.rect(0, 128 + par(1) + i * 2, SCREEN_W, 2, `rgba(22,58,30,${(0.02 + i * 0.011).toFixed(3)})`);
  }

  // The herd. Three lanes; nearer lanes are bigger, faster, lower in frame.
  // Each kin gets its own gait -- a bounder throws itself into the air and
  // lands heavy, a trotter keeps four feet under it. One shared sine wave is
  // what made the first cut of this look like a conveyor belt.
  for (let lane = 0; lane < 3; lane++) {
    const size = 20 + lane * 11;
    const half = size / DETAIL / 2;
    const feet = 93 + par(1) + lane * 17;
    const speed = 0.5 + lane * 0.42;
    for (let i = 0; i < 3; i++) {
      const n = lane * 3 + i;
      const id = RUNNERS[n % RUNNERS.length]!;
      const bounder = n % 2 === 0;
      const rate = bounder ? 0.2 : 0.34;
      const ph = (t * rate + HERD_SEEDS[n]! * 6.283) % (Math.PI * 2);
      const air = Math.max(0, Math.sin(ph));
      const rise = bounder ? air * air * 8 : air * 2.4;
      const squash = bounder ? Math.cos(ph) * 0.55 - 0.15 : Math.cos(ph) * 0.28;
      const x = wrap(t * speed + HERD_SEEDS[n + 9]! * 340, SCREEN_W, 46);

      // Dust is spawned at the contact and then left behind: it expands and
      // fades where the foot landed rather than travelling glued to the animal.
      if (ph < 1.5) {
        const age = ph / 1.5;
        const dx = x + half - (ph / rate) * speed;
        const dr = (1.6 + age * 4.5) * (0.7 + lane * 0.3);
        r.ellipsePixel(dx * DETAIL, (feet - 1 - age * 2) * DETAIL,
          dr * DETAIL, dr * DETAIL * 0.55,
          `rgba(228,234,208,${(0.4 * (1 - age)).toFixed(2)})`);
      }

      r.ellipsePixel((x + half) * DETAIL, feet * DETAIL,
        half * DETAIL * (1.05 - air * 0.3), (1.8 + lane * 0.5) * DETAIL,
        `rgba(28,54,30,${(0.42 - air * 0.14).toFixed(2)})`);

      // The near lane's leader glances aside now and then. A herd where nothing
      // ever looks up is a herd of props.
      const glance = lane === 2 && i === 0 ? Math.sin(t * 0.045) * 0.13 : 0;
      // The whole herd is running right, so the whole herd is flipped.
      r.image(kin(id, size, null, glance, squash), x, feet - half * 2 - rise,
        0, 0, undefined, undefined, facing(speed));
    }
  }

  // Seed heads torn loose and crossing the lens.
  for (let i = 0; i < 16; i++) {
    const sp = 1.6 + hash(i + 900) * 2.4;
    const x = wrap(hash(i + 940) * SCREEN_W * 2 - t * sp, SCREEN_W, 10);
    const y = 34 + hash(i + 980) * 104 + Math.sin(t * 0.07 + i) * 6;
    r.rect(x, y, 1, 1, 'rgba(246,238,196,0.55)');
  }

  // Foreground grass. Pure silhouette, crossing at up to four times ground
  // speed, and the layer that turns a scrolling backdrop into a camera moving
  // through a field. Drawn as clumps, never as single stalks: one tall blade on
  // its own in the middle of a meadow reads as a fence post, which is exactly
  // what this layer looked like on the last pass.
  for (let rank = 0; rank < 2; rank++) {
    const tall = rank === 1;
    const clumps = tall ? 5 : 9;
    const speed = tall ? 2.3 : 4.6;
    const shade = tall ? '#152a1c' : '#1c3122';
    for (let i = 0; i < clumps; i++) {
      const s = i + rank * 40 + 1000;
      const cx = wrap(hash(s) * SCREEN_W * 1.5 - t * speed, SCREEN_W, 30);
      // More blades, each thinner. A clump of four fat ones is a set of spears
      // and a clump of nine narrow ones is grass, and the difference between
      // those two readings is the difference between a camera standing in a
      // field and a camera looking at a fence.
      const blades = tall ? 9 : 5;
      for (let b = 0; b < blades; b++) {
        const q = hash(s * 11 + b);
        const lean = (b - (blades - 1) / 2) / blades;
        const x = cx + lean * (tall ? 15 : 8);
        // Every blade a different length, and the outer ones shorter: a clump
        // of equal blades is a comb.
        // Tall enough to clear the letterbox by a wide margin. Blades that top
        // out level with the bottom bar do all their work below the visible
        // frame -- the bar is 22 units deep, so 36 units of blade was fourteen
        // units of visible grass, which is why this layer read as a handful of
        // scratches on the picture. Sixty was the over-correction: it put a
        // hedge across half the frame. This clears the bar by about a fifth of
        // the picture, which is a near layer rather than a wall.
        const bh = (tall ? 38 + q * 20 : 22 + q * 14) * (1 - Math.abs(lean) * 0.55);
        const sway = Math.sin(t * 0.11 + i * 1.3 + b * 0.7) * (tall ? 6 : 3) + lean * 9;
        const base = Math.max(1, Math.round((tall ? 4 : 3) * (1 - Math.abs(lean) * 0.8)));
        for (let k = 0; k < bh; k++) {
          const u = k / bh;
          r.rect(x + sway * u * u, SCREEN_H + 8 - k,
            Math.max(1, Math.round(base * (1 - u * 0.75))), 1, shade);
        }
      }
    }
  }
}

/**
 * Under the surface, where the sea keeps its own weather.
 *
 * The camera sinks: we start with the caustics still legible on the underside
 * of the surface and end in the dark with the Warden. Light leaving the frame
 * is the shot's entire argument, so every layer is pinned to `sink`.
 */
function shotDeep(r: Renderer, t: number, p: number): void {
  const sink = smooth(p) * 48;
  const par = (depth: number): number => -sink * depth;
  const surf = 8 + par(0.4);

  r.rect(0, 0, SCREEN_W, SCREEN_H, '#020c18');
  sky(r, '#4a93b8', '#020c18', surf, surf + 196, 16);

  // The underside of the surface, broken by the swell above it. It slides out
  // of the top of the frame as we go down, which is the clock on this shot.
  if (surf > -16) {
    r.rect(0, surf - 8, SCREEN_W, 8, '#6fb3d2');
    for (let x = 0; x < SCREEN_W; x += 2) {
      const h = Math.max(1, 2 + Math.sin(x * 0.16 + t * 0.09) * 1.6
        + Math.sin(x * 0.05 - t * 0.05) * 1.4);
      r.rect(x, surf, 2, h, 'rgba(178,226,246,0.55)');
      r.rect(x, surf + h, 2, 1, 'rgba(120,180,212,0.32)');
    }
  }

  // Shafts leaning in from the surface, each breathing on its own cycle.
  for (let i = 0; i < 6; i++) {
    const baseX = 8 + i * 42 + Math.sin(t * 0.012 + i * 1.7) * 10;
    const strength = Math.max(0, 1 - sink / 56) * (0.6 + 0.4 * Math.sin(t * 0.02 + i));
    if (strength <= 0.02) continue;
    for (let y = Math.max(0, surf); y < SCREEN_H; y += 2) {
      const d = (y - surf) / 150;
      const a = 0.13 * strength * Math.max(0, 1 - d);
      if (a < 0.008) continue;
      r.rect(baseX + (y - surf) * 0.26, y, Math.max(1, 12 - d * 8), 2,
        `rgba(180,228,255,${a.toFixed(3)})`);
    }
  }

  // Marine snow at two depths. The far grains barely shift; the near ones
  // streak past. Nothing else in the frame says the camera is descending.
  for (let i = 0; i < 44; i++) {
    const near = i >= 28;
    const sp = near ? 0.9 + hash(i) * 0.8 : 0.16 + hash(i) * 0.2;
    const y = wrap(hash(i + 44) * SCREEN_H - t * sp - par(near ? 1.3 : 0.4), SCREEN_H, 10);
    const x = hash(i + 96) * SCREEN_W + Math.sin(t * 0.03 + i) * 3;
    const s = near ? 2 : 1;
    r.rect(x, y, s, s, near ? 'rgba(206,236,255,0.30)' : 'rgba(160,200,226,0.16)');
  }

  // The Warden. Drawn as one flat silhouette with a single rim light: detail on
  // something this size would only make it look near, and the whole point of
  // the shot is that it is far away and still does not fit in the frame.
  // It used to clear frame left at about seventy percent, and the last second of
  // the shot was then empty water with kelp in it -- a dead tail on the shot
  // immediately before the film's only hard cut, which is the worst place in the
  // picture to run out of things to look at. It now travels far enough to have
  // passed the lens and no further: at the fade it is still filling the left of
  // the frame while the camera keeps sinking past it, so the last thing the deep
  // does is go UP and out rather than sideways and away.
  const wx = SCREEN_W * 1.45 - smooth(p) * SCREEN_W * 1.55;
  const wy = 96 + par(0.5) + Math.sin(t * 0.011) * 6;
  const flex = Math.sin(t * 0.018);
  const lift = (u: number): number => Math.sin(u * Math.PI * 0.9) * (10 + flex * 7) - u * u * 6;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i <= 58; i++) {
      const u = i / 58;
      const px = wx + side * u * 86;
      if (px < -6 || px > SCREEN_W + 6) continue;
      const thick = Math.max(1, (1 - u * u * 0.9) * 20);
      r.rect(px, wy - lift(u) - thick / 2, 2, thick, '#04101f');
      // Two units of rim, not one: a single unit of edge light on a shape this
      // wide disappears into the water it is meant to separate the animal from.
      r.rect(px, wy - lift(u) - thick / 2, 2, 2, '#17415f');
    }
  }
  for (let i = 0; i < 14; i++) {
    const w = 6 + Math.sin((i / 14) * Math.PI) * 9;
    r.rect(wx - w / 2, wy - 13 + i, w, 1, '#04101f');
  }
  for (let i = 0; i < 34; i++) {
    const u = i / 34;
    r.rect(wx - Math.max(1, 9 - u * 8) / 2, wy + 6 + u * 34, Math.max(1, 9 - u * 8), 1, '#04101f');
  }
  const eye = 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.04));
  if (eye > 0.3) {
    r.rect(wx - 5, wy - 7, 3, 2, `rgba(226,158,84,${eye.toFixed(2)})`);
    r.rect(wx + 2, wy - 7, 3, 2, `rgba(226,158,84,${eye.toFixed(2)})`);
  }
  // Lantern spots firing down the wings in sequence, outward from the body.
  for (let i = 1; i <= 5; i++) {
    const u = i / 6;
    const a = Math.max(0, Math.sin(t * 0.05 - i * 0.8)) * 0.7;
    if (a < 0.06) continue;
    const c = `rgba(120,200,226,${a.toFixed(2)})`;
    r.rect(wx + u * 86, wy - lift(u), 2, 2, c);
    r.rect(wx - u * 86, wy - lift(u), 2, 2, c);
  }

  // A school between the Warden and the swimmers: forty specks holding one
  // shape and turning together. It is the layer that says the middle distance
  // is occupied, which four large creatures spread over the frame cannot.
  const schoolX = wrap(t * 0.7 - 40, SCREEN_W, 60);
  const schoolY = 54 + par(0.7) + Math.sin(t * 0.02) * 14;
  for (let i = 0; i < 40; i++) {
    const a = hash(i + 200) * 6.283;
    const rad = hash(i + 250);
    const sx = schoolX + Math.cos(a) * rad * 42;
    const sy = schoolY + Math.sin(a) * rad * 13 + Math.sin(t * 0.09 + i) * 1.5;
    // Dark, not pale: the school is between the camera and the light, and pale
    // specks on this blue vanished into it entirely.
    r.rect(sx, sy, 2, 1, 'rgba(10,36,56,0.62)');
    r.rect(sx + 2, sy, 1, 1, 'rgba(158,204,228,0.45)');
  }

  // Swimmers at two depths, the near ones dragging a wake behind the tail.
  for (let i = 0; i < 9; i++) {
    const far = i < 4;
    const id = SWIMMERS[i % SWIMMERS.length]!;
    const size = far ? 16 : 30 + (i % 3) * 8;
    const speed = (far ? 0.22 : 0.5) + (i % 3) * 0.16;
    const dir = i % 2 === 0 ? 1 : -1;
    const raw = wrap(t * speed + DEEP_SEEDS[i]! * 340, SCREEN_W, 42);
    const x = dir > 0 ? raw : SCREEN_W - raw;
    const y = 16 + par(far ? 0.35 : 0.9) + DEEP_SEEDS[i + 10]! * 100
      + Math.sin(t * 0.04 + i * 1.4) * 6;
    // The lean is authored once, for the unflipped (left-facing) sprite, and
    // mirrored by the flip along with everything else. Multiplying it by `dir`
    // as well was the old bug twice over: the fish faced backwards AND leaned
    // its nose into the water it was leaving.
    const lean = 0.18 + Math.sin(t * 0.05 + i) * 0.08;
    if (!far) {
      const tail = dir > 0 ? x - 4 : x + size / DETAIL + 4;
      for (let k = 1; k < 6; k++) {
        const a = 0.2 * (1 - k / 6);
        r.rect(tail - (dir > 0 ? k * 6 : -k * 6), y + (size / DETAIL) * 0.55, 5, 1,
          `rgba(176,220,244,${a.toFixed(2)})`);
      }
    }
    if (far) {
      r.image(kin(id, size, '#0a1e33', lean, Math.sin(t * 0.12 + i * 1.7) * 0.5),
        x, y, 0, 0, undefined, undefined, facing(dir));
    } else {
      // Graded into the water rather than drawn on top of it, and graded harder
      // the deeper in the frame it is: this shot sinks, and the light it is
      // losing has to be lost off the creatures too or they float free of it.
      // The grade got harder. At 0.42 an orange kin forty feet down was still
      // orange enough to be the brightest thing in a blue frame, which is both
      // a sticker on the picture and a lie -- red is the first colour the water
      // takes, and it takes it in the first ten feet.
      washKin(r, id, size, x, y, t * 0.15 + i * 1.7, lean,
        Math.sin(t * 0.15 + i * 1.7) * 0.28,
        facing(dir), '#2a5c86', 0.66 + smooth(p) * 0.24,
        'rgba(154,214,244,0.55)', 'rgba(12,44,72,0.82)');
    }
  }

  // Kelp at the lens, swaying on its own clock and growing as the floor comes
  // up to meet us. It is what the eye uses to measure everything behind it.
  // Stalks alone came out as scratches on the picture, so each one carries
  // blades: the frond is the shape people recognise, not the stem.
  for (let i = 0; i < 5; i++) {
    const bx = hash(i + 500) * SCREEN_W;
    const h = 40 + hash(i + 540) * 40 + sink * 0.5;
    const bend = (u: number): number => Math.sin(t * 0.035 + i * 1.9 + u * 2.4) * (4 + u * 10);
    for (let k = 0; k < h; k++) {
      const u = k / h;
      r.rect(bx + bend(u), SCREEN_H + 8 - k, Math.max(2, Math.round(5 - u * 3)), 1, '#04141c');
    }
    for (let b = 0; b < 7; b++) {
      const u = 0.12 + b * 0.13;
      if (u >= 1) break;
      const y = SCREEN_H + 8 - u * h;
      const side = b % 2 === 0 ? 1 : -1;
      const len = (8 + hash(i * 9 + b) * 10) * (1 - u * 0.4);
      for (let k = 0; k < len; k++) {
        const v = k / len;
        // A leaf, not a twig: it swells through the middle and droops as it
        // goes out. Arms of constant thickness made these read as bare branches.
        const th = Math.max(1, Math.round(Math.sin(v * Math.PI) * 7));
        r.rect(bx + bend(u) + side * (k + 2), y - 3 + v * v * 10, 2, th, '#04141c');
      }
    }
  }
}

/**
 * The Turning: the sea standing up.
 *
 * The whole frame rides the swell -- one vertical offset applied to every
 * layer. A storm shot with the camera bolted down is a painting of a storm.
 * The lightning is on a fixed clock, because a storm that flashes at random
 * reads as a fault in the display rather than as weather.
 *
 * THE SHOT ALSO HAS TO REVERSE, because that is what the caption over it says
 * and for a whole cut it did not: this was the one shot in the film with no arc
 * in it -- four seconds of a looping storm that ended in the same place it
 * started, under a line promising the sea turns over. So the water now leaves.
 * `withdraw` drags the whole sea DOWN the frame through the first half of the
 * shot, uncovering the foot of the cape and forty units of nothing, and then
 * `surge` brings it back past where it began with the swell twice the size it
 * was. Out, and then back over the top. That is the Turning, and it is the same
 * behaviour the shore shot cashes in three cuts later when the flats are dry.
 */
function shotTurning(r: Renderer, t: number, p: number): void {
  // Out over the first 46% of the shot, back over the rest -- an ebb is slow
  // and a surge is not, so the return runs on a shorter clock and arrives late.
  const withdraw = smooth(Math.min(1, p / 0.46));
  const surge = smooth(Math.max(0, (p - 0.46) / 0.54));
  // The swell grows with the surge: the sea that comes back is not the sea that
  // left. Everything downstream of this multiplies by it.
  const rage = 0.72 + surge * 1.15;

  const heave = (Math.sin(t * 0.035) * 5 + Math.sin(t * 0.021 + 1.2) * 3) * rage;
  const roll = Math.sin(t * 0.027) * 4;
  // The reveal used to be twenty-one units on a hundred-and-sixty unit frame,
  // which is a tide going out by a hand's width. The caption over this shot
  // promises a sea that reverses; the picture has to give up enough ground for
  // that to be a thing that happened.
  //
  // AND IT DOES NOT COME BACK TO WHERE IT WAS. The surge used to be forty-four
  // against a withdrawal of thirty-four, so the water ended nine units above
  // its own opening line -- which, on this scale, is a shot that goes out and
  // comes back and leaves the sea where it found it. The next shot in the film
  // is a town that has been underwater for seventy years BECAUSE of this, so
  // the last frame of this one has to be a sea standing higher than the frame
  // it started on, with the foot of the headland already gone under it. That is
  // the difference between weather and a Turning.
  const hz = 78 + heave + withdraw * 34 - surge * 50;

  let flash = 0;
  let bolt = -1;
  // Three strikes, and they build: one distant at the top of the shot, one as
  // the water goes, and one timed so the film cuts out of this shot in the
  // middle of it. The last one is the point -- there is no fade off the end of
  // the Turning, the picture is at its brightest on the last frame and the next
  // thing on screen is a town seventy years underwater. A hard cut needs
  // something to cut ON, and lightning is what this shot has.
  for (const s of [40, 118, 221]) {
    const d = t - s;
    if (d < 0 || d >= 30) continue;
    // A double blink: bright, gone, bright again, then decay.
    const scale = s < 60 ? 0.5 : s < 160 ? 0.8 : 1;
    flash = Math.max(flash, scale
      * (d < 3 ? 1 : d < 6 ? 0.25 : d < 10 ? 0.85 : Math.max(0, 1 - (d - 10) / 20)));
    if (d < 14) bolt = s;
  }

  sky(r, '#2c3252', '#6d7290', -14 + heave, hz, 12);

  // The cloud decks are much darker than the sky they hang in. They were within
  // a shade or two of it in the first cut, which made the whole upper half of
  // the frame one flat wash with rain falling through it.
  clouds(r, t, {
    seed: 4411, count: 6, y: -4 + heave * 0.5, spread: 18, speed: 0.09,
    minW: 46, maxW: 98, thick: 8, top: '#0f1326', under: '#1d2340',
  });
  clouds(r, t, {
    seed: 5522, count: 5, y: 20 + heave * 0.7, spread: 14, speed: 0.18,
    minW: 32, maxW: 72, thick: 6, top: '#161b33', under: '#28304e',
  });
  clouds(r, t, {
    seed: 6633, count: 4, y: 42 + heave * 0.85, spread: 10, speed: 0.3,
    minW: 26, maxW: 56, thick: 4, top: '#1e2440', under: '#333c5e',
  });

  if (bolt > 0 && flash > 0.35) {
    // One stroke, seeded off the strike time so it stays the same bolt for the
    // whole flash instead of redrawing itself every frame.
    const c = `rgba(238,246,255,${flash.toFixed(2)})`;
    let bx = Math.round(50 + hash(bolt) * 130);
    for (let y = 0; y < hz - 4; y += 2) {
      r.rect(bx, y, 1, 2, c);
      const j = Math.round((hash(bolt + y) - 0.5) * 5);
      if (j !== 0) r.rect(Math.min(bx, bx + j), y, Math.abs(j) + 1, 1, c);
      bx += j;
    }
  }

  // Where the water stood when the shot opened. The land is measured off THIS
  // and not off `hz`, because rock does not go up and down with the tide: pin
  // the cape to the waterline and the whole headland sinks as the sea leaves,
  // which is the exact opposite of what is happening.
  const shore = 78 + heave;

  // The ground the sea has walked off. It is only there while the water is out,
  // it is wet, and it holds what light there is -- which is what makes the
  // withdrawal read as ground uncovering rather than as the camera tilting up.
  const bare = hz - shore;
  if (bare > 1) {
    // Nothing about this band may be the colour of the sea, or the whole beat
    // reads as the camera tilting up rather than as the water leaving. The last
    // pass filled it with #252c46 against a #16273f sea -- two dark blues one
    // step apart -- and the ground it was meant to uncover was invisible.
    //
    // Wet sand under a storm sky is the BRIGHTEST thing on this side of the
    // frame, because it is a mirror lying flat under the only light there is,
    // and it is grey where the water is blue. It also grades: darker at the
    // waterline where it is still awash, paler up by the old shore where it has
    // had a minute to drain.
    //
    // WARM grey, not another cool one. The last pass fixed this band against
    // the sea and left it losing to the SKY: #4b4d5e is a blue-violet a shade
    // darker than the storm sky's own underside, so at full withdrawal the
    // uncovered seabed read as more weather. It cannot win on brightness -- the
    // sky is what is lighting it -- so it wins on hue instead. A neutral-warm
    // grey against a violet sky separates at any value, and it is also what wet
    // sand actually is.
    for (let i = 0; i < Math.ceil(bare) + 3; i++) {
      const u = i / Math.max(1, bare);
      r.rect(0, shore - 1 + i, SCREEN_W, 1, band('#736c62', '#3b3a46', Math.min(1, u)));
    }
    // Runnels: the water finding its way off the flat. They point down the
    // slope, they are brighter than what they cross, and they are what turns a
    // grey band into a surface with a fall on it.
    for (let i = 0; i < 30; i++) {
      const y = shore + hash(i + 1600) * bare;
      const w = 10 + hash(i + 1680) * 34;
      const x = wrap(hash(i + 1640) * SCREEN_W * 1.3 - t * 0.5, SCREEN_W, 40);
      r.rect(x, y, w, 1, i % 3 === 0 ? 'rgba(226,236,255,0.4)' : 'rgba(58,64,88,0.55)');
      if (i % 3 === 0) r.rect(x + 2, y + 1, w - 4, 1, 'rgba(30,34,52,0.35)');
    }
    // Things that were under the sea an hour ago and are not now. The eye will
    // not accept a band of colour as floor until there is an object standing on
    // it, and one that CASTS -- a shadow pulling away from the light on the cape
    // is what fixes a stone to the ground instead of onto it.
    for (let i = 0; i < 9; i++) {
      const sy2 = shore + 2 + hash(i + 1720) * Math.max(0, bare - 3);
      if (sy2 > hz - 1) continue;
      const sw = 6 + hash(i + 1760) * 16;
      const sh = 3 + hash(i + 1800) * 5;
      const sx2 = hash(i + 1840) * SCREEN_W;
      r.rect(sx2 - 3, sy2, sw + 5, 1, 'rgba(18,22,38,0.5)');
      r.rect(sx2, sy2 - sh, sw, sh + 1, '#141a2c');
      r.rect(sx2, sy2 - sh, sw, 1, flash > 0.3 ? '#6b779c' : '#4a5474');
    }
    // Weed the sea left lying, which is the one thing out here that could not
    // be a rock and could not be a wave.
    for (let i = 0; i < 6; i++) {
      const wy2 = shore + 3 + hash(i + 1880) * Math.max(0, bare - 4);
      if (wy2 > hz - 1) continue;
      const wx2 = hash(i + 1920) * SCREEN_W;
      for (let k = 0; k < 5; k++) {
        r.rect(wx2 + k * 3, wy2 + Math.round(Math.sin(k * 1.4 + i) * 1.6), 4, 1, '#232b2e');
      }
    }
    // The lip the water left behind, brightest the moment it has just gone, and
    // a second line of foam still draining off it a unit below.
    r.rect(0, shore - 1, SCREEN_W, 1, 'rgba(216,230,252,0.5)');
    r.rect(0, hz - 3, SCREEN_W, 1, 'rgba(198,218,246,0.3)');
  }

  /*
   * THE JETTY, AND WHY THE SHOT NEEDED ONE.
   *
   * A sea going out is a horizontal line moving down a frame, and a horizontal
   * line moving down a frame is indistinguishable from a camera tilting up.
   * Runnels and stones fixed the ground; they did not fix the MEASUREMENT,
   * because everything on that ground arrives with the ground and so has
   * nothing to say about how far the water has fallen.
   *
   * Six rotten posts do. They are in the frame from the first tick, standing
   * out of the water; the sea slides down them; and each one carries a pale
   * band at the height the water normally stands, with weed hanging off it. The
   * band is the whole device. Once the eye has seen where the water is SUPPOSED
   * to be on a post, every unit of post showing under that band is a unit the
   * sea has given up, and it can read that off the picture without being told.
   *
   * Then the surge puts them back under, faster than they came out, and the
   * last thing the shot does with them is take them away again.
   *
   * They are drawn here -- after the flat, before the cape and long before the
   * water -- so the sea simply paints over whatever it currently covers. There
   * is no "how much of this post is submerged" arithmetic anywhere, and there
   * cannot be a frame where the two disagree.
   */
  const postX: number[] = [];
  const postTop: number[] = [];
  for (let i = 0; i < 6; i++) {
    // Further down the frame is nearer, so a post that stands lower stands
    // taller. Ranged left of the cape, and unevenly: a row of posts at a
    // regular pitch is a fence, and nobody builds a jetty out of a fence.
    const px = 14 + i * 20 + Math.round(hash(i + 2100) * 7);
    const feet = shore + 4 + i * 5.2;
    // Well clear of the water. The first version stood them thirteen units out
    // of a seabed whose tide mark was two units off the crown, and six dark
    // uprights with a pale band and a fringe of weed at the top of each is not
    // a jetty, it is six people standing on a beach. A post has to carry most
    // of its length ABOVE the line the water keeps, or the mark cannot be read
    // as a mark.
    const ph = 22 + i * 3.4;
    const w = 2 + Math.floor(i / 3);
    const lean = (hash(i + 2140) - 0.5) * 5;
    const top = feet - ph;
    postX.push(px + lean);
    postTop.push(top);
    for (let k = 0; k <= ph; k++) {
      const u = k / ph;
      r.rect(Math.round(px + lean * u * u), Math.round(feet - k), w, 1, '#0d1220');
    }
    // The crown catches the lightning, like everything else standing up in this
    // shot. A frame where only the headland flashes is a frame with one light
    // in it and two directions of shadow.
    r.rect(Math.round(px + lean), Math.round(top), w, 1, flash > 0.3 ? '#7c88ae' : '#2a3350');
    // The tide mark, at the height the water was standing when the shot opened.
    // Two units of pale, and weed below it: the mark says how high, the weed
    // says how long it has been true.
    const markY = shore - 1;
    if (markY > top && markY < feet) {
      const mu = (feet - markY) / ph;
      const mx = Math.round(px + lean * mu * mu);
      r.rect(mx, markY - 1, w, 2, 'rgba(198,214,240,0.55)');
      for (let k = 1; k < Math.min(11, feet - markY); k++) {
        if (hash(i * 13 + k + 2180) < 0.42) continue;
        r.rect(mx, markY + 1 + k, w, 1, '#1b2321');
      }
    }
  }
  // What is left of the deck. Three spans out of five, because a jetty with all
  // of its decking on is a jetty somebody still uses, and this one has been
  // standing in a sea that turns over twice a century.
  for (let i = 0; i < 5; i++) {
    if (i === 1 || i === 3) continue;
    const x0 = postX[i]!;
    const x1 = postX[i + 1]!;
    const y0 = postTop[i]! + 2;
    const y1 = postTop[i + 1]! + 2;
    const steps = Math.max(2, Math.round(x1 - x0));
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      // A sag, so the beam is carrying its own weight rather than ruled on.
      const y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * 2.2;
      r.rect(Math.round(x0 + (x1 - x0) * u), Math.round(y), 1, 2, '#0d1220');
    }
  }

  /*
   * The front.
   *
   * A tide has a level. A surge has an EDGE, and the edge arrives before the
   * level does: water runs up a flat in tongues, well ahead of the line it will
   * settle at, and it is the tongues rather than the line that make a returning
   * sea look like it is coming for something. Without them the water simply
   * rose, evenly, all the way across -- which is what a bath does.
   */
  if (surge > 0.02 && bare > 2) {
    const reach = surge * 30;
    for (let x = 0; x < SCREEN_W; x += 2) {
      const run = reach * (0.45 + 0.55 * Math.sin(x * 0.052 + t * 0.19))
        * (0.7 + 0.3 * Math.sin(x * 0.017 - t * 0.07));
      if (run < 1.5) continue;
      const y0 = Math.max(shore - 2, hz - run);
      r.rect(x, y0, 2, hz - y0, 'rgba(26,48,78,0.62)');
      r.rect(x, y0, 2, 1, 'rgba(228,242,255,0.8)');
    }
  }

  // A headland with a light on it, so the storm has something to be a threat
  // to. The dome carries a broken crest: a clean parabola reads as a hill in a
  // diagram rather than as rock in weather.
  const capeX = 178 + roll;
  for (let x = 0; x < SCREEN_W; x++) {
    const d = (x - capeX) / 48;
    const h = (1 - d * d) * 32
      + (Math.abs(d) < 1 ? Math.sin(x * 0.21) * 2 + Math.sin(x * 0.07 + 2) * 3 : 0);
    if (h <= 1) continue;
    // Top on the land, foot carried down to wherever the water is now: as the
    // sea goes out the cape does not move, it gets taller.
    r.rect(x, shore - h, 1, h + Math.max(6, hz - shore + 6), '#0c1020');
    r.rect(x, shore - h, 1, 1, flash > 0.3 ? '#4b5780' : '#1a2036');
  }
  // A tower on the crest, and the light on it turning. The halo is a stack of
  // rings, not one translucent disc: a single ellipse at a readable alpha draws
  // a hard-edged egg on the hillside instead of a glow.
  const towerY = shore - 34;
  // The light stops sweeping and simply stays on once the sea starts coming
  // back. That is the beat this shot ends on: the water climbs the rock the
  // light is standing on, and the light is still lit when the picture cuts. A
  // beam that happened to be pointed away on the last frame -- which is a coin
  // toss, and lost it more often than not -- threw that away.
  const held = surge > 0.66;
  if (held || Math.sin(t * 0.05) > 0.35) {
    const lamp = held ? 1 : 0.55 + 0.45 * Math.sin(t * 0.05);
    for (let k = 6; k >= 1; k--) {
      r.ellipsePixel(capeX * DETAIL, (towerY - 1) * DETAIL, k * 2.4 * DETAIL, k * 1.7 * DETAIL,
        `rgba(255,196,110,${(0.035 * lamp).toFixed(3)})`);
    }
    r.rect(capeX - 5, towerY - 2, 10, 3, '#0a0e1c');
    r.rect(capeX - 2, towerY - 1, 4, 2, `rgba(255,228,160,${lamp.toFixed(2)})`);
  } else {
    r.rect(capeX - 5, towerY - 2, 10, 3, '#0a0e1c');
  }
  r.rect(capeX - 3, towerY + 1, 6, 14, '#0a0e1c');

  // Two flyers holding station against the wind: they barely advance, they get
  // shoved sideways, they recover. That is the difference between weather and
  // wallpaper on a backdrop.
  //
  // These are the one pair in the film that face the opposite way to their
  // drift, and deliberately: the rain leans left, so the gale is going left, so
  // a bird beating into it points RIGHT while losing ground. Facing the way
  // they are sliding would make them look like they had given up.
  // And they BEAT, harder than anything else in the film: this is the only
  // sky in it where flying is work. The stroke rate is nearly double the sea
  // shot's and the throw is over-driven, so the pair look like they are being
  // held up rather than carried -- and the wings stall for a moment at the top
  // of each gust, where the wind has taken the air out from under them.
  for (let i = 0; i < 2; i++) {
    const gust = Math.sin(t * 0.09 + i * 2) * 12 + Math.sin(t * 0.031 + i) * 20;
    const x = 56 + i * 96 + gust - t * 0.12;
    const y = 30 + heave * 0.5 + Math.sin(t * 0.07 + i * 1.6) * 7;
    const stall = 0.55 + 0.45 * Math.sin(t * 0.031 + i + 1.6);
    airKin(r, i ? 'slatewing' : 'craglide', 24, x, y,
      t * 0.42 + i * 2.6, Math.sin(t * 0.09 + i * 2) * 0.3,
      Math.sin(t * 0.42 + i) * 0.24, facing(1), '#0b1222', null, 0.5 + stall * 0.75);
  }

  // Seven ranks of swell. Each rank is a full-width sine at its own wavelength,
  // amplitude and speed; stacking them is what gives the water a surface rather
  // than a texture. Rank four is where the thing turning over goes.
  // A base of water under the ranks. Without it the gap between the bottom of
  // the sky and the first crest showed the cleared screen through as a black
  // line along the horizon.
  r.rect(0, hz - 1, SCREEN_W, SCREEN_H + 22 - hz, '#16273f');

  const RANKS = 7;
  const rank = (i: number): void => {
    const u = i / (RANKS - 1);
    const y = hz + 4 + u * 14 + u * u * 62;
    // Both scale with the surge. The sea that comes back is bigger and faster
    // than the sea that left, and the water is where the shot has to say so --
    // the sky is the same sky either side of the reversal.
    const amp = (2 + u * 9) * rage;
    const wl = 0.06 - u * 0.035;
    const sp = (0.6 + u * 3.4) * (0.7 + surge * 0.8);
    const fill = band('#16273f', '#071322', u);
    const lip = band('#335072', '#12283f', u);
    for (let x = 0; x < SCREEN_W; x += 2) {
      const h = Math.sin((x + t * sp) * wl + i * 1.7) * amp
        + Math.sin((x + t * sp * 0.6) * wl * 2.3 + i) * amp * 0.35;
      const top = Math.round(y - h);
      r.rect(x, top, 2, SCREEN_H + 20 - top, fill);
      r.rect(x, top, 2, 2, lip);
      // Foam only where the crest is highest, which is where it would tear.
      if (u > 0.55 && h > amp * 0.72) r.rect(x, top - 1, 2, 1, 'rgba(212,232,250,0.5)');
    }
  };

  for (let i = 0; i < 4; i++) rank(i);

  // Something the size of the shot rolling over under the swell. It never
  // surfaces: a shape you cannot resolve is larger than one you can. It comes
  // up with the surge, though -- close enough to press the crests out of shape
  // and no closer, because the moment it has an edge it stops being enormous.
  const bulgeX = SCREEN_W * 0.5 + Math.sin(t * 0.008) * 64;
  for (let i = 0; i < 54; i++) {
    const w = Math.sin((i / 54) * Math.PI) * (104 + surge * 40);
    if (w < 2) continue;
    r.rect(bulgeX - w / 2, hz + 16 - surge * 9 + i * 0.8, w, 1,
      `rgba(3,10,20,${(0.28 + surge * 0.14).toFixed(2)})`);
  }

  for (let i = 4; i < RANKS; i++) rank(i);

  // Rain at two depths. The far layer is a haze of short marks; the near one is
  // long, fast and crosses the whole frame in half a second. It thickens across
  // the shot: the front is still arriving.
  const wet = 0.55 + 0.45 * smooth(p);
  for (let i = 0; i < 96; i++) {
    if (hash(i + 1900) > wet) continue;
    const near = i >= 62;
    const sp = near ? 11 : 6;
    // Slanted the way the wind is blowing everything else -- left. Rain that
    // leans into the spray it is supposed to be driving looks like two storms.
    const slant = near ? -1.8 : -1.1;
    const span = SCREEN_H + 40;
    const y = wrap(hash(i + 1000) * span + t * sp, span, 0) - 20;
    const x = wrap(hash(i + 1100) * SCREEN_W * 1.4 - t * sp * 0.34, SCREEN_W, 30);
    const c = near ? 'rgba(200,224,248,0.32)' : 'rgba(178,204,232,0.16)';
    const steps = near ? 5 : 3;
    for (let k = 0; k < steps; k++) r.rect(x + k * slant, y + k * 2, 1, 2, c);
  }

  // Spray torn off the near ranks and blown across the lens. It goes with the
  // surge too, and harder than anything else does: the last second of this shot
  // is mostly water in the air.
  for (let i = 0; i < 26; i++) {
    const x = wrap(hash(i + 1200) * SCREEN_W * 1.5 - t * (4.4 + surge * 3.4), SCREEN_W, 28);
    const y = 108 - surge * 22 + hash(i + 1240) * (48 + surge * 26)
      + Math.sin(t * 0.06 + i) * 4;
    r.rect(x, y, 6 + hash(i + 1280) * 16, 1,
      `rgba(226,240,252,${(0.16 + surge * 0.14).toFixed(2)})`);
  }

  if (flash > 0.02) r.tint('#cfe0f4', flash * 0.34);
}

/**
 * Old Tidefall, seventy years under.
 *
 * The town the last Turning took. The sea came the wrong way up the valley in
 * one night and it has never gone back, and the film has to SHOW that rather
 * than assert it: this is the shot that turns "every seventy years the sea
 * reverses" from a piece of lore into a consequence with a name on it.
 *
 * The camera swims the length of what used to be the high street. Three clocks
 * run it -- `lane(depth)` slides the layers sideways at the pace of a slow
 * swim, `drop(depth)` settles the frame down onto the cobbles across the shot,
 * and the belfry rides neither of them at its own rate, because it is the thing
 * being swum toward rather than another piece of the belt.
 */
function shotDrowned(r: Renderer, t: number, p: number): void {
  const track = t * 0.85;
  const settle = smooth(p) * 26;
  const lane = (depth: number): number => -track * depth;
  const drop = (depth: number): number => -settle * depth;
  const streetY = 122 + drop(1);

  r.rect(0, 0, SCREEN_W, SCREEN_H, '#04121c');
  sky(r, '#2d757f', '#04121c', -54 + drop(0.15), 136 + drop(0.15), 14);

  // Caustics, and nothing else left of the surface: it is far enough above this
  // valley that the shot never sees it, and the light rolling over the murk is
  // the only evidence there is one.
  for (let i = 0; i < 10; i++) {
    const y = 2 + i * 5 + drop(0.18) + Math.sin(t * 0.03 + i * 1.4) * 2;
    if (y < -2 || y > 74) continue;
    const w = 26 + hash(i + 11) * 62;
    const x = wrap(hash(i + 21) * SCREEN_W * 1.6 - t * 0.22, SCREEN_W, 62);
    r.rect(x, y, w, 1, `rgba(150,224,232,${(0.085 - i * 0.006).toFixed(3)})`);
  }

  // Shafts, leaning the way the current runs.
  for (let i = 0; i < 5; i++) {
    const bx = wrap(i * 52 + Math.sin(t * 0.011 + i * 1.6) * 14 + lane(0.08), SCREEN_W, 40);
    for (let y = 0; y < SCREEN_H; y += 2) {
      const d = y / 132;
      const a = 0.075 * Math.max(0, 1 - d) * (0.55 + 0.45 * Math.sin(t * 0.02 + i));
      if (a < 0.006) continue;
      r.rect(bx + y * 0.3, y, Math.max(1, 15 - d * 11), 2, `rgba(168,224,244,${a.toFixed(3)})`);
    }
  }

  // Both walls of the drowned valley. The far one is this shot's horizon; the
  // near one is the ridge the town was built under, and is what says the water
  // is standing where a hillside used to be dry.
  for (let layer = 0; layer < 2; layer++) {
    const spd = layer === 0 ? 0.08 : 0.2;
    const base = 78 + layer * 12 + drop(0.2 + layer * 0.16);
    const fill = layer === 0 ? '#0b2b36' : '#08242f';
    const lip = layer === 0 ? '#15505f' : '#0f3b49';
    for (let x = 0; x < SCREEN_W; x++) {
      const wx = x - lane(spd);
      const h = 20 + Math.sin(wx * 0.021 + layer * 2.4) * 10 + Math.sin(wx * 0.0075) * 8;
      r.rect(x, base - h, 1, h + 70, fill);
      r.rect(x, base - h, 1, 1, lip);
    }
  }

  // The upper terraces: roofs too far off to be anything but shape, hazed by
  // all the water between them and the lens.
  for (let i = 0; i < 16; i++) {
    const x = wrap(hash(i + 300) * SCREEN_W * 1.6 + lane(0.3), SCREEN_W, 26);
    const w = 12 + Math.round(hash(i + 340) * 15);
    const base = 100 + drop(0.5) + Math.round(hash(i + 380) * 7);
    r.rect(x, base - 11, w, 13, '#07222c');
    const peak = base - 11 - Math.round(w * 0.42);
    for (let y = peak; y < base - 11; y++) {
      const k = (y - peak) / Math.max(1, base - 11 - peak);
      const half = Math.max(1, Math.round((w / 2 + 2) * k));
      r.rect(x + w / 2 - half, y, half * 2, 1, '#051b24');
    }
  }

  // The high street itself: six fronts on a belt, each with a roof, dead
  // windows and a door, and one of them with the roof folded into the house. A
  // row of intact buildings under fifty fathoms reads as a diagram of a town,
  // not as a town something happened to.
  for (let i = 0; i < 6; i++) {
    const s = i * 9 + 400;
    const w = 30 + Math.round(hash(s) * 20);
    const bh = 34 + Math.round(hash(s + 1) * 24);
    const x = Math.round(wrap(hash(s + 2) * SCREEN_W * 1.8 + lane(0.55), SCREEN_W, 76));
    const base = Math.round(streetY + hash(s + 3) * 4);
    const fallen = i === 3;

    r.rect(x, base - bh, w, bh, '#10333f');
    // The light still comes from above, so the top course of every wall is the
    // lit one. Edge-lighting the sides made these read as columns.
    r.rect(x, base - bh, w, 2, '#1a4c5c');
    r.rect(x + w - 2, base - bh, 2, bh, '#0b2833');

    const peak = base - bh - Math.round(w * 0.4);
    for (let y = peak; y < base - bh; y++) {
      const k = (y - peak) / Math.max(1, base - bh - peak);
      const half = Math.max(1, Math.round((w / 2 + 3) * k));
      // The fallen roof keeps its landward slope and loses everything past the
      // ridge, so the gap is a hole into the house rather than a flat top.
      const from = x + w / 2 - half;
      const to = fallen ? x + w / 2 : x + w / 2 + half;
      if (to > from) r.rect(from, y, to - from, 1, '#0c2b36');
    }
    if (fallen) {
      r.rect(x + w / 2, base - bh - 2, w / 2, 3, '#04141c');
      for (let k = 0; k < 5; k++) r.rect(x + w / 2 + 2 + k * 4, base - bh - 1 - k, 3, 1, '#0a2530');
    }

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const wx = x + 6 + col * Math.round(w * 0.45);
        const wy = base - bh + 9 + row * 15;
        if (wy + 9 > base) continue;
        r.rect(wx - 1, wy - 1, 8, 10, '#0a2833');
        r.rect(wx, wy, 6, 8, '#02101a');
        r.rect(wx - 2, wy + 8, 10, 1, '#154453');
      }
    }
    r.rect(x + Math.round(w * 0.5), base - 12, 8, 12, '#02101a');
    r.rect(x + Math.round(w * 0.5) - 1, base - 13, 10, 1, '#154453');

    // One shop still has its sign out, and the water works it the way wind
    // would. It is the single detail that made this row read as a street.
    if (i === 1) {
      const gx = x + w - 4;
      const gy = base - bh + 16;
      const swing = Math.sin(t * 0.022) * 0.3;
      r.rect(gx, gy, 10, 1, '#0a2530');
      for (let k = 0; k < 10; k++) r.rect(gx + 8 + swing * k, gy + 1 + k, 1, 1, '#0a2530');
      r.rect(gx + 4 + swing * 12, gy + 11, 10, 7, '#123a46');
      r.rect(gx + 4 + swing * 12, gy + 11, 10, 1, '#1c5567');
    }
  }

  // The belfry, and the only clock in the frame. Nothing rings it -- the
  // current does, on a period far too slow for anything happening in air, which
  // is the entire reason it is in the shot.
  const towX = Math.round(276 + lane(0.55));
  if (towX > -60 && towX < SCREEN_W + 20) {
    const tw = 30;
    const topY = Math.round(34 + drop(0.55));
    const botY = Math.round(streetY + 3);
    r.rect(towX, topY, tw, botY - topY, '#123846');
    r.rect(towX, topY, tw, 2, '#1e5a6c');
    r.rect(towX + tw - 3, topY, 3, botY - topY, '#0c2a35');
    for (let y = topY + 6; y < botY; y += 7) r.rect(towX, y, tw, 1, 'rgba(3,16,24,0.4)');

    // The cap. It narrows UPWARD -- the first pass had the widest row at the
    // apex, which is a funnel balanced on a tower, not a spire on one. The
    // break is at the seaward eave, where a roof actually loses tiles.
    for (let k = 0; k < 14; k++) {
      const half = Math.round(((k + 1) / 14) * (tw / 2 + 4));
      const from = towX + tw / 2 - half;
      const to = towX + tw / 2 + (k > 8 ? Math.round(half * 0.35) : half);
      if (to > from) r.rect(from, topY - 14 + k, to - from, 1, '#0d2c38');
    }

    // The arch, then the bell hanging in it.
    const arcX = towX + 7, arcY = topY + 12, arcW = 16;
    for (let k = 0; k < 8; k++) {
      const half = Math.round(Math.sqrt(Math.max(0, 1 - ((7 - k) / 8) ** 2)) * (arcW / 2));
      r.rect(arcX + arcW / 2 - half, arcY + k, Math.max(1, half * 2), 1, '#02101a');
    }
    r.rect(arcX, arcY + 8, arcW, 26, '#02101a');
    const swing = Math.sin(t * 0.017) * 0.24;
    const hang = arcY + 12;
    r.rect(arcX + arcW / 2 - 5, hang - 3, 10, 2, '#2c3a30');
    for (let k = 0; k < 14; k++) {
      const u = k / 13;
      const bw = Math.max(2, Math.round(3 + u * u * 10));
      const bx = arcX + arcW / 2 + swing * (k + 4);
      r.rect(bx - bw / 2, hang + k, bw, 1, k > 11 ? '#8a8058' : '#5d5740');
      if (k < 11) r.rect(bx - bw / 2, hang + k, 1, 1, '#7d7452');
    }
    r.rect(arcX + arcW / 2 + swing * 19 - 1, hang + 14, 2, 4, '#3b3729');
  }

  // The cobbles, and everything the night left lying on them.
  r.rect(0, streetY, SCREEN_W, SCREEN_H + 24 - streetY, '#0a2530');
  r.rect(0, streetY, SCREEN_W, 2, '#154655');
  for (let i = 0; i < 34; i++) {
    const x = wrap(hash(i + 600) * SCREEN_W * 1.4 + lane(0.8), SCREEN_W, 30);
    const y = streetY + 3 + hash(i + 640) * 34;
    r.rect(x, y, 4 + hash(i + 680) * 8, 1, 'rgba(21,70,85,0.35)');
  }
  for (let i = 0; i < 9; i++) {
    const x = wrap(hash(i + 700) * SCREEN_W * 1.5 + lane(0.85), SCREEN_W, 30);
    const y = streetY + 4 + hash(i + 740) * 26;
    switch (i % 3) {
      case 0: {
        // A cartwheel on its side, still round.
        const rr = 5 + hash(i + 780) * 4;
        r.ellipsePixel(x * DETAIL, y * DETAIL, rr * DETAIL, rr * 0.42 * DETAIL, '#08202a');
        r.ellipsePixel(x * DETAIL, y * DETAIL, (rr - 2) * DETAIL, rr * 0.24 * DETAIL, '#0a2530');
        break;
      }
      case 1:
        // Slates off a roof, stacked where the water put them down.
        for (let k = 0; k < 4; k++) r.rect(x + k * 2, y - k, 9, 2, '#0b2932');
        break;
      default:
        r.rect(x, y - 12, 2, 12, '#08202a');
        r.rect(x - 6, y - 9, 16, 1, '#08202a');
    }
  }

  // Silt lifting off the street: the layer that stops the floor being a painted
  // plane with objects standing on it.
  for (let i = 0; i < 20; i++) {
    const x = wrap(hash(i + 820) * SCREEN_W * 1.3 + lane(0.9), SCREEN_W, 24);
    const y = streetY - 4 + hash(i + 860) * 24 + Math.sin(t * 0.02 + i) * 3;
    r.rect(x, y, 10 + hash(i + 900) * 20, 1, 'rgba(96,150,164,0.10)');
  }

  // A shoal going down the street with the current, and four larger kin working
  // the fronts. Everything travels left, with the water, except the one that is
  // coming back up against it.
  const shoalX = wrap(-t * 1.15, SCREEN_W, 70);
  const shoalY = 78 + drop(0.7) + Math.sin(t * 0.019) * 10;
  for (let i = 0; i < 34; i++) {
    const a = hash(i + 200) * 6.283;
    const rad = hash(i + 250);
    const fx = shoalX + Math.cos(a) * rad * 46;
    const fy = shoalY + Math.sin(a) * rad * 12 + Math.sin(t * 0.1 + i) * 1.5;
    r.rect(fx, fy, 2, 1, 'rgba(8,32,44,0.6)');
    // The pale fleck goes on the LEADING edge, which for a shoal running left is
    // the left one. It was on the trailing edge and the whole shoal read as
    // swimming backwards, same bug as the sprites, one pixel wide.
    r.rect(fx - 1, fy, 1, 1, 'rgba(150,204,222,0.42)');
  }

  for (let i = 0; i < 4; i++) {
    const dir = i === 2 ? 1 : -1;
    const id = SWIMMERS[(i + 2) % SWIMMERS.length]!;
    const size = 22 + (i % 3) * 8;
    const speed = 0.45 + (i % 3) * 0.2;
    const raw = wrap(t * speed + hash(i + 950) * 320, SCREEN_W, 44);
    const x = dir > 0 ? raw : SCREEN_W - raw;
    const y = 62 + drop(0.8) + hash(i + 980) * 44 + Math.sin(t * 0.035 + i * 1.7) * 7;
    // Graded hard into the green. This shot is the most single-hued picture in
    // the film -- the whole town is one colour at nine values -- and a kin at
    // full palette in the middle of it does not read as a creature living down
    // there, it reads as a sticker somebody put on the drowned town.
    washKin(r, id, size, x, y, t * 0.16 + i * 1.9,
      0.12 + Math.sin(t * 0.05 + i) * 0.07,
      Math.sin(t * 0.16 + i * 1.9) * 0.28, facing(dir), '#2c6b72', 0.76,
      'rgba(142,222,224,0.5)', 'rgba(8,44,52,0.82)');
  }

  // Weed rooted in what used to be somebody's doorway, and silt tearing past
  // the lens at eight times the pace of the street behind it.
  for (let i = 0; i < 4; i++) {
    const bx = wrap(hash(i + 1100) * SCREEN_W * 1.2 + lane(1.5), SCREEN_W, 40);
    const h = 46 + hash(i + 1140) * 34;
    const bend = (u: number): number => Math.sin(t * 0.033 + i * 2.1 + u * 2.6) * (5 + u * 12);
    for (let k = 0; k < h; k++) {
      const u = k / h;
      r.rect(bx + bend(u), SCREEN_H + 8 - k, Math.max(2, Math.round(5 - u * 3)), 1, '#03151c');
    }
    for (let b = 0; b < 6; b++) {
      const u = 0.16 + b * 0.14;
      const y = SCREEN_H + 8 - u * h;
      const side = b % 2 === 0 ? 1 : -1;
      const len = (7 + hash(i * 7 + b) * 9) * (1 - u * 0.4);
      for (let k = 0; k < len; k++) {
        const v = k / len;
        const th = Math.max(1, Math.round(Math.sin(v * Math.PI) * 6));
        r.rect(bx + bend(u) + side * (k + 2), y - 3 + v * v * 9, 2, th, '#03151c');
      }
    }
  }

  // A shutter off one of the windows, end over end through the frame. One thing
  // with a rotation on it is worth twenty more specks of drift.
  const tumble = ((t + 40) % 300) / 300;
  const shX = SCREEN_W + 30 - tumble * (SCREEN_W + 80);
  const shY = 40 + tumble * 96 + Math.sin(tumble * 9) * 8;
  const spin = tumble * 7;
  for (let k = -7; k <= 7; k++) {
    r.rect(shX + Math.cos(spin) * k * 1.6, shY + Math.sin(spin) * k * 1.6, 3, 3, '#071c26');
  }

  for (let i = 0; i < 26; i++) {
    const sp = 1.4 + hash(i + 1300) * 2.8;
    const x = wrap(hash(i + 1340) * SCREEN_W * 1.6 - t * sp, SCREEN_W, 20);
    const y = wrap(hash(i + 1380) * SCREEN_H - t * 0.4, SCREEN_H, 12);
    r.rect(x, y, 2, 2, 'rgba(186,224,238,0.24)');
  }
}

/**
 * Professor Sorrell's room over the harbour office, and the wall he has spent ten years
 * covering.
 *
 * This is the shot the film kept ducking, and the reason the ending never
 * landed. Without it the cinematic states a fact about the sea and then cuts to
 * a house, and the player is entirely right to ask what one has to do with the
 * other. So: the coast pinned up with every arrow on it pointing inward at one
 * stretch of shore, a red ring struck through the town that is already gone, a
 * thread running from that ring to a fresh pin on the north shore, and a man
 * still awake at four in the morning at the far end of the thread. The next
 * shot is the address that pin is pointing at.
 *
 * An interior earns its parallax from the move rather than from weather. The
 * camera tracks right along the thread and tilts down as it goes: the boards
 * take a sixth of the track, the pinned sheets four tenths, the desk all of it,
 * and the chair back at the lens half again as much, so it is gone before the
 * shot is a third over.
 */
function shotCharts(r: Renderer, t: number, p: number): void {
  const e = smooth(p);
  const pan = -12 + e * 72;
  const tilt = e * 13;
  const px = (d: number): number => -pan * d;
  const py = (d: number): number => -tilt * d;
  // One oil lamp is the only light in this room, so nothing in it may be lit
  // steadily. Every warm value below is multiplied by this.
  const flame = 0.84 + 0.11 * Math.sin(t * 0.21) + 0.05 * Math.sin(t * 0.63 + 1.1);

  const deskY = 116 + py(0.95);
  const lampX = 146 + px(0.95);
  const lampY = deskY - 2;

  /* ------------------------------------------------------------ the wall */

  r.rect(0, 0, SCREEN_W, SCREEN_H, '#171520');
  for (let i = 0; i < 22; i++) {
    const x = wrap(i * 13 + px(0.16), SCREEN_W, 22);
    r.rect(x, 0, 1, SCREEN_H, '#110f19');
    r.rect(x + 1, 0, 1, SCREEN_H, '#1d1b28');
  }
  // The lamp's reach across the boards, in rings. A smooth radial falloff at
  // this resolution is a smear with no edge anywhere in it to read.
  for (let k = 13; k >= 1; k--) {
    r.ellipsePixel(lampX * DETAIL, (lampY - 14) * DETAIL, k * 8 * DETAIL, k * 6 * DETAIL,
      `rgba(255,172,84,${(0.014 * flame).toFixed(3)})`);
  }

  // The window at the back, with the weather from two shots ago still in it.
  // The room is warm and dry and forty feet from all of that, which is exactly
  // the problem the shot is about.
  const wnX = Math.round(2 + px(0.16));
  const wnY = Math.round(24 + py(0.16));
  const strike = t % 210 < 7 ? 1 - (t % 210) / 7 : 0;
  if (wnX > -46) {
    r.rect(wnX - 2, wnY - 2, 42, 34, '#0c0b12');
    r.rect(wnX, wnY, 38, 30, strike > 0.2 ? '#5c6f9a' : '#2c3c5e');
    r.rect(wnX, wnY + 16, 38, 14, strike > 0.2 ? '#39507a' : '#1c2c47');
    for (let i = 0; i < 5; i++) {
      r.rect(wnX + wrap(hash(i + 40) * 30 - t * 0.5, 30, 0), wnY + 17 + i * 2.4, 8, 1,
        'rgba(174,200,232,0.24)');
    }
    for (let i = 0; i < 16; i++) {
      const x = wnX + wrap(hash(i + 60) * 37 - t * 1.6, 37, 0);
      const y = wnY + wrap(hash(i + 80) * 27 + t * 5, 27, 0);
      r.rect(x, y, 1, 3, 'rgba(198,220,244,0.30)');
    }
    r.rect(wnX + 18, wnY, 2, 30, '#0c0b12');
    r.rect(wnX, wnY + 14, 38, 2, '#0c0b12');
  }

  /* -------------------------------------------------------- the chart wall */

  const ax = Math.round(34 + px(0.42));
  const ay = Math.round(24 + py(0.42));
  const AW = 102, AH = 76;
  /** The coastline on the big sheet, in chart-local units. */
  const coast = (u: number): number =>
    30 + Math.sin(u * 0.085) * 9 + Math.sin(u * 0.028 + 1.2) * 6;
  // Where the arrows converge, in chart-local units. It has to sit far enough
  // inside the sheet that a 32-unit arrow tail still lands on paper: the first
  // pass put it at 74 and the guard below silently culled half the arrows.
  const TARGET = 62;

  if (ax + AW > -4 && ax < SCREEN_W + 4) {
    r.rect(ax, ay, AW, AH, '#d6cbaa');
    r.rect(ax, ay, AW, 1, '#efe6c6');
    r.rect(ax, ay + AH - 2, AW, 2, '#b0a37e');
    r.rect(ax + AW - 2, ay, 2, AH, '#bfb28c');
    // A crease down it, because it lived folded in a case for ten years.
    r.rect(ax + 44, ay + 2, 1, AH - 4, 'rgba(150,138,104,0.5)');

    // The rings the Turning is measured in: broken arcs around a centre well
    // off the bottom of the sheet, so they read as part of something the paper
    // is too small to hold.
    // Walked along x and solved for y rather than swept round by angle: at
    // these radii an even sweep in theta puts most of its samples off the sheet
    // and leaves seven surviving dots per ring, which reads as dirt on the
    // paper instead of as a curve.
    for (let ring = 0; ring < 5; ring++) {
      const rr = 55 + ring * 16;
      for (let u = 4; u < AW - 4; u++) {
        const dx = u - 50;
        if (Math.abs(dx) >= rr) continue;
        const gy = AH + 40 - Math.sqrt(rr * rr - dx * dx) * 0.86;
        if (gy < 3 || gy > AH - 3) continue;
        // Dashed, and out of phase per ring, so five nested arcs never stack
        // into a solid band where they crowd together.
        if ((u + ring * 3) % 5 < 2) continue;
        r.rect(ax + u, ay + gy, 1, 1, 'rgba(96,110,120,0.55)');
      }
    }

    // The coast, inked, with the land side hatched off it.
    for (let u = 4; u < AW - 4; u++) {
      const cy = coast(u);
      r.rect(ax + u, ay + cy, 1, 1, '#453b2b');
      if (u % 3 === 0) {
        for (let k = 2; k < 8; k += 2) r.rect(ax + u, ay + cy - k, 1, 1, 'rgba(69,59,43,0.4)');
      }
    }

    // Every arrow on the sheet points at the same forty units of shore. They
    // ink in one at a time across the shot, and the last one arrives while
    // Sorrell has his arm up at the wall.
    const inked = Math.min(6, Math.floor(p * 7.4));
    const tx = ax + TARGET, ty = ay + coast(TARGET);
    for (let i = 0; i < inked; i++) {
      const th = Math.PI * (0.15 + i * 0.14);
      const len = 16 + (i % 3) * 4;
      const x0 = tx + Math.cos(th) * (len + 8);
      const y0 = ty + Math.sin(th) * (len + 8);
      const x1 = tx + Math.cos(th) * 8;
      const y1 = ty + Math.sin(th) * 8;
      if (x0 < ax + 2 || x0 > ax + AW - 2 || y0 < ay + 2 || y0 > ay + AH - 2) continue;
      r.line(x0, y0, x1, y1, '#33456b');
      // Heads drawn as two strokes off the tip, never as a filled triangle: a
      // triangle two units on a side is a blob with an opinion.
      r.line(x1, y1, x1 - Math.cos(th - 0.5) * 5, y1 - Math.sin(th - 0.5) * 5, '#33456b');
      r.line(x1, y1, x1 - Math.cos(th + 0.5) * 5, y1 - Math.sin(th + 0.5) * 5, '#33456b');
    }

    // Old Tidefall, ringed and struck through. It is the precedent, not the
    // target -- which is the whole reason the arrows are somewhere else.
    const ox2 = ax + 26, oy2 = ay + coast(26);
    for (let a = 0; a < 24; a++) {
      const th = (a / 24) * 6.283;
      r.rect(ox2 + Math.cos(th) * 9, oy2 + Math.sin(th) * 7, 1, 1, '#8b2f22');
    }
    r.line(ox2 - 7, oy2 - 6, ox2 + 7, oy2 + 6, '#8b2f22');
    r.line(ox2 + 7, oy2 - 6, ox2 - 7, oy2 + 6, '#8b2f22');
    // The only words in the film that are not captions. Two lines, because
    // OLD TIDEFALL on one runs two thirds of the way across the sheet.
    r.text('OLD', ox2, oy2 + 12, { color: '#7c2a20', align: 'center' });
    r.text('TIDEFALL', ox2, oy2 + 20, { color: '#7c2a20', align: 'center' });

    // And the pin in the north shore. Brass head: the only warm thing on paper.
    r.ellipsePixel(tx * DETAIL, ty * DETAIL, 3 * DETAIL, 3 * DETAIL, '#20242e');
    r.rect(tx - 2, ty - 2, 3, 2, `rgba(240,196,116,${(0.9 * flame).toFixed(2)})`);
  }

  // The second sheet: four Turnings, evenly spaced, and then a mark that does
  // not fit. The shot never says a number out loud -- the gap coming up short
  // says it, and the caption says it once in words for anyone who missed it.
  const bx2 = Math.round(156 + px(0.42));
  const by2 = Math.round(22 + py(0.42));
  if (bx2 < SCREEN_W + 4 && bx2 + 58 > -4) {
    r.rect(bx2, by2, 58, 40, '#cfc4a3');
    r.rect(bx2, by2, 58, 1, '#e8dfc0');
    r.rect(bx2, by2 + 38, 58, 2, '#a99d79');
    r.rect(bx2 + 5, by2 + 22, 48, 1, '#453b2b');
    for (let i = 0; i < 4; i++) {
      const x = bx2 + 5 + i * 13;
      r.rect(x, by2 + 14, 1, 9, '#453b2b');
      r.rect(x - 2, by2 + 25, 5, 1, 'rgba(69,59,43,0.45)');
    }
    // The bracket out to the one that has not happened yet...
    r.rect(bx2 + 44, by2 + 10, 9, 1, '#453b2b');
    r.rect(bx2 + 44, by2 + 10, 1, 4, '#453b2b');
    r.rect(bx2 + 52, by2 + 10, 1, 4, '#453b2b');
    // ...and the red mark, landing nowhere near it.
    const fresh = Math.min(1, Math.max(0, (p - 0.34) * 5));
    if (fresh > 0) {
      r.rect(bx2 + 46, by2 + 16, 1, Math.max(1, Math.round(10 * fresh)), '#8b2f22');
      if (fresh > 0.8) {
        r.rect(bx2 + 43, by2 + 28, 7, 1, '#8b2f22');
        r.rect(bx2 + 44, by2 + 30, 5, 1, '#8b2f22');
      }
    }
  }

  // The third: tide tables in a hand nobody is meant to be able to read, with
  // the last row underscored twice.
  const cx2 = Math.round(160 + px(0.42));
  const cy2 = Math.round(70 + py(0.42));
  if (cx2 < SCREEN_W + 4 && cx2 + 50 > -4) {
    r.rect(cx2, cy2, 50, 44, '#d2c7a6');
    r.rect(cx2, cy2, 50, 1, '#ebe2c3');
    r.rect(cx2, cy2 + 42, 50, 2, '#ab9f7b');
    for (let row = 0; row < 8; row++) {
      const y = cy2 + 5 + row * 4;
      r.rect(cx2 + 4, y, 20 + hash(row + 500) * 22, 1, 'rgba(69,59,43,0.6)');
      r.rect(cx2 + 40, y, 5, 1, 'rgba(69,59,43,0.45)');
    }
    r.rect(cx2 + 3, cy2 + 37, 40, 1, '#8b2f22');
    r.rect(cx2 + 3, cy2 + 39, 40, 1, '#8b2f22');
  }

  // The thread. It is the only line in the room that touches all three sheets,
  // and it is what the camera is actually following as it tracks right.
  const pinA: [number, number] = [ax + TARGET, ay + coast(TARGET)];
  const pinB: [number, number] = [bx2 + 46, by2 + 16];
  const pinC: [number, number] = [cx2 + 24, cy2 + 38];
  const sag = 3 + Math.sin(t * 0.02);
  const thread = (a: [number, number], b: [number, number]): void => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 + sag;
    r.line(a[0], a[1], mx, my, 'rgba(150,52,40,0.9)');
    r.line(mx, my, b[0], b[1], 'rgba(150,52,40,0.9)');
  };
  thread(pinA, pinB);
  thread(pinB, pinC);
  for (const pin of [pinB, pinC]) {
    r.rect(pin[0] - 1, pin[1] - 1, 3, 3, '#20242e');
    r.rect(pin[0] - 1, pin[1] - 1, 2, 1, `rgba(240,196,116,${(0.85 * flame).toFixed(2)})`);
  }

  /* ------------------------------------------------------------ the desk */

  r.rect(0, deskY, SCREEN_W, SCREEN_H + 24 - deskY, '#241a16');
  r.rect(0, deskY, SCREEN_W, 2, `rgba(122,84,54,${(0.9 * flame).toFixed(2)})`);
  r.rect(0, deskY + 2, SCREEN_W, 1, '#17100e');
  for (let i = 0; i < 18; i++) {
    const gx = wrap(hash(i + 560) * SCREEN_W * 1.4 + px(0.95), SCREEN_W, 44);
    r.rect(gx, deskY + 6 + hash(i + 600) * 32, 14 + hash(i + 640) * 30, 1, 'rgba(74,52,38,0.55)');
  }

  // Books, stacked and slumped. A level stack is a brick.
  const bkX = 26 + px(0.95);
  for (let k = 0; k < 4; k++) {
    const w = 30 - k * 3;
    const lean = k * 2 - 3;
    r.rect(bkX + lean, deskY - 5 - k * 5, w, 5, k % 2 ? '#3a2a3c' : '#2c3346');
    r.rect(bkX + lean, deskY - 5 - k * 5, w, 1, k % 2 ? '#513c52' : '#3f4a63');
    r.rect(bkX + lean + w - 2, deskY - 5 - k * 5, 2, 5, '#191322');
  }

  // The open ledger, ruled and half filled: the thing he wants somebody else
  // to be filling in, out in the region, instead of him at this desk.
  const ldX = 72 + px(0.95);
  r.rect(ldX, deskY - 9, 48, 10, '#c8bd9c');
  r.rect(ldX, deskY - 10, 48, 1, '#e2d9ba');
  r.rect(ldX + 23, deskY - 10, 2, 11, '#a2946f');
  for (let row = 0; row < 4; row++) {
    const w = 13 + hash(row + 700) * 6;
    r.rect(ldX + 3, deskY - 8 + row * 2, w, 1, 'rgba(69,59,43,0.55)');
    if (row < 3) r.rect(ldX + 27, deskY - 8 + row * 2, w * 0.8, 1, 'rgba(69,59,43,0.4)');
  }

  // Dividers, open, lying where they were dropped.
  const dvX = 128 + px(0.95);
  r.line(dvX, deskY - 1, dvX + 9, deskY - 10, '#6a6250');
  r.line(dvX + 14, deskY - 1, dvX + 9, deskY - 10, '#6a6250');
  const inkX = 112 + px(0.95);
  r.rect(inkX, deskY - 7, 8, 7, '#1b2230');
  r.rect(inkX, deskY - 8, 8, 1, '#2e3a4e');
  r.rect(inkX + 3, deskY - 14, 1, 7, '#3a2f26');
  r.rect(inkX + 3, deskY - 15, 2, 2, '#584736');

  // The lamp: base, chimney, flame inside it, halo in rings.
  r.rect(lampX - 7, lampY - 4, 14, 4, '#2a2028');
  r.rect(lampX - 5, lampY - 8, 10, 4, '#3a2c2e');
  r.rect(lampX - 4, lampY - 22, 8, 14, `rgba(255,214,140,${(0.28 * flame).toFixed(2)})`);
  r.rect(lampX - 4, lampY - 22, 1, 14, 'rgba(226,206,180,0.4)');
  r.rect(lampX + 3, lampY - 22, 1, 14, 'rgba(226,206,180,0.4)');
  r.rect(lampX - 5, lampY - 24, 10, 2, '#2a2028');
  for (let k = 6; k >= 1; k--) {
    r.ellipsePixel(lampX * DETAIL, (lampY - 15) * DETAIL, k * 2.2 * DETAIL, k * 2.6 * DETAIL,
      `rgba(255,206,130,${(0.05 * flame).toFixed(3)})`);
  }
  r.rect(lampX - 1, lampY - 18, 2, 6, `rgba(255,244,206,${flame.toFixed(2)})`);

  // Somebody's nibbet asleep against the warm side of the lamp, breathing, and
  // shifting about once every fifteen seconds. A workplace at four in the
  // morning has exactly one animal in it that gave up on the night hours ago.
  const nbX = 174 + px(0.95);
  const stir = Math.max(0, Math.sin(t * 0.008 - 1.4)) ** 6;
  r.ellipsePixel((nbX + 7) * DETAIL, deskY * DETAIL, 8 * DETAIL, 2 * DETAIL, 'rgba(12,8,10,0.5)');
  r.image(kin('nibbet', 28, null, -0.06 + stir * 0.16, Math.sin(t * 0.045) * 0.22),
    nbX, deskY - 14, 0, 0, undefined, undefined, facing(-1));

  /* ---------------------------------------------------------------- Sorrell */

  // Far enough right that he is barely in frame when the shot opens: the wall
  // gets the first half of the track to itself and he arrives into the second,
  // which is the order the story wants. Parked nearer the middle he sat on top
  // of the two smaller sheets for the whole shot.
  const vx = 236 + px(0.95);
  if (vx > -44 && vx < SCREEN_W + 48) {
    // He looks up at the wall and back down at the ledger on a cycle far
    // slower than anything else in the room.
    const look = (Math.sin(t * 0.021) + 1) / 2;
    const reach = Math.max(0, Math.sin(t * 0.021));
    const headY = deskY - 44 - look * 3;
    for (let k = 0; k < 32; k++) {
      const u = k / 32;
      const half = 8 + u * u * 17;
      r.rect(vx - half, deskY - 32 + k, half * 2, 1, '#100c14');
      // One amber edge on the lamp side and nothing else. A face at this size
      // is a smudge with two dots in it, and the shot does not need his
      // features -- it needs the fact of somebody still being up.
      r.rect(vx - half, deskY - 32 + k, 1, 1, `rgba(216,142,74,${(0.55 * flame).toFixed(2)})`);
    }
    const tip = -3 + look * 5;
    r.ellipsePixel((vx + tip) * DETAIL, headY * DETAIL, 8 * DETAIL, 9 * DETAIL, '#100c14');
    r.ellipsePixel((vx + tip + 7) * DETAIL, (headY - 4) * DETAIL, 5 * DETAIL, 4 * DETAIL, '#100c14');
    r.rect(vx + tip - 8, headY - 5, 2, 11, `rgba(216,142,74,${(0.5 * flame).toFixed(2)})`);

    // The arm goes up to the wall on the same clock as his head, with a pin in
    // it. The last arrow on the chart inks in while it is up there.
    const hx = vx - 18 - reach * 26;
    const hy = deskY - 14 - reach * 50;
    for (let k = 0; k <= 20; k++) {
      const u = k / 20;
      const armX = vx - 7 + (hx - (vx - 7)) * u;
      const armY = deskY - 26 + (hy - (deskY - 26)) * u;
      const th = Math.max(2, Math.round(7 - u * 4));
      r.rect(armX - th / 2, armY - th / 2, th, th, '#100c14');
    }
    if (reach > 0.55) r.rect(hx - 1, hy - 3, 2, 3, `rgba(240,204,128,${(0.85 * flame).toFixed(2)})`);
  }

  /* ---------------------------------------------------------------- lens */

  // The back of the chair he is not sitting in, swinging out of frame in the
  // first third of the track. Something leaving the lens sideways is the only
  // cue a flat drawing has for saying the camera moved rather than the room.
  // Anchored off the left edge, not the middle: at 34 it stood across the big
  // chart -- including the ring the shot exists to show -- for four fifths of
  // the track before it finally cleared.
  const chX = -24 + px(1.55);
  if (chX > -46) {
    r.rect(chX, 44, 12, SCREEN_H - 44, '#0b0910');
    r.rect(chX + 26, 44, 12, SCREEN_H - 44, '#0b0910');
    r.rect(chX, 48, 38, 7, '#0b0910');
    r.rect(chX, 70, 38, 5, '#0b0910');
    r.rect(chX + 11, 48, 2, 46, '#0b0910');
  }

  // Dust turning over in the lamp cone: the layer that says the air in here is
  // still and warm, which is half of why the shot reads as the small hours.
  for (let i = 0; i < 22; i++) {
    const dx2 = lampX - 40 + hash(i + 1200) * 80;
    const dy2 = deskY - 92
      + wrap(hash(i + 1240) * 90 - t * (0.12 + hash(i + 1280) * 0.2), 90, 6);
    const a = 0.24 * flame * Math.max(0, 1 - Math.abs(dx2 - lampX) / 44);
    if (a < 0.02) continue;
    r.rect(dx2, dy2, 1, 1, `rgba(255,222,168,${a.toFixed(2)})`);
  }

  // And the corner of a note lifting on the draught off the window, which is
  // the one thing in this room that is not indoors.
  const lift = 1 + Math.sin(t * 0.06) * 0.9;
  const ntX = 56 + px(0.95);
  r.rect(ntX, deskY - 2, 22, 2, '#cdc2a1');
  for (let k = 0; k < 6; k++) r.rect(ntX + 18 + k, deskY - 2 - k * lift * 0.7, 2, 1, '#ded4b4');
}

/**
 * The north shore, an hour before dawn, with the water gone.
 *
 * This is the shot the last cut got wrong, and the note was fair: a lit window
 * on its own is a picture of a window. What makes it mean anything is what is
 * standing in front of it. The sea has pulled a quarter of a mile back off the
 * flats eleven years early, there are boats sitting on dry ground that were
 * afloat at midnight, and the kin have already started walking out after the
 * water -- which is the behaviour the second shot of the film promised. The
 * Turning has begun, it has begun HERE, and the house with the light on is the
 * address at the end of Sorrell's thread. The last beat of the shot is a candle
 * being carried into the dark window upstairs, which is the game starting.
 *
 * The push works the way the old town shot's did: every coordinate goes through
 * `box`, which rounds to whole logical units before drawing, because a zoom
 * landing on half-pixels crawls, and crawling edges are exactly the smooth,
 * modern artefact this art style cannot afford. Three transforms rather than
 * one -- the headland barely grows, the shore grows with the push, and the
 * marram at the lens grows two and a half times as fast and leaves sideways.
 */
function shotShore(r: Renderer, t: number, p: number): void {
  const e = smooth(p);
  // The gable window: the frame the entire shot is walking toward.
  const FX = 112, FY = 77;
  const z = 1 + e * 0.95;
  const ox = FX + (120 - FX) * e;
  const oy = FY + (78 - FY) * e;
  const sx = (x: number): number => Math.round((x - FX) * z + ox);
  const sy = (y: number): number => Math.round((y - FY) * z + oy);
  // Widths come from the two transformed edges rather than being scaled on
  // their own, so neighbouring shapes never open a seam as the zoom creeps.
  const box = (x: number, y: number, w: number, h: number, c: string): void =>
    r.rect(sx(x), sy(y), Math.max(1, sx(x + w) - sx(x)), Math.max(1, sy(y + h) - sy(y)), c);

  // The far arm of the bay is a mile off and the camera has moved thirty yards,
  // so it takes a third of the zoom and is anchored to the waterline rather
  // than transformed on its own -- mixing two zooms on one horizon opens a gap
  // along it halfway through the push.
  const far = 1 + e * 0.32;
  const fx2 = (x: number): number => Math.round((x - FX) * far + ox);

  const waterY = sy(50);
  const flatY = sy(58);

  /* ----------------------------------------------------------------- sky */

  r.rect(0, 0, SCREEN_W, SCREEN_H, '#0d1430');
  sky(r, '#0d1430', '#3d4368', -20, Math.max(6, waterY - 18), 12);
  sky(r, '#3d4368', '#8f6d72', Math.max(2, waterY - 18), Math.max(4, waterY - 4), 5);
  sky(r, '#8f6d72', '#c98d64', Math.max(1, waterY - 4), Math.max(3, waterY), 3);

  // Thirty stars, not thirty-four: the seed table holds sixty and this loop
  // reads it at i and i+30, so anything past thirty walks off the end and the
  // non-null assertion turns the miss into a silent NaN instead of a crash.
  const night = Math.max(0, 1 - p * 1.5);
  for (let i = 0; i < 30; i++) {
    const y = TOWN_SEEDS[i + 30]! * 40 * (1 - e * 0.3);
    if (y > waterY - 6) continue;
    const a = night * (0.35 + 0.65 * Math.sin(t * 0.04 + i * 1.7));
    if (a <= 0.18) continue;
    r.rect(TOWN_SEEDS[i]! * SCREEN_W, y, 1, 1, `rgba(240,246,255,${a.toFixed(2)})`);
  }

  clouds(r, t, {
    seed: 2211, count: 6, y: Math.max(2, waterY - 40), spread: 20, speed: 0.05,
    minW: 34, maxW: 82, thick: 2,
    top: 'rgba(128,112,142,0.5)', under: 'rgba(74,64,92,0.45)',
  });

  /* ------------------------------------------------------ what is left of it */

  // The headland, thrown left so it closes that side of the frame and leaves
  // the right open for the flats and the house. Centred and a third wider it
  // sat across the whole upper frame as a black band by the end of the push.
  const capeX = fx2(-10);
  const capeW = 70 * far;
  const capeH = 18 * far;
  const cape = (x: number): number => {
    const u = (x - capeX) / capeW;
    return Math.abs(u) >= 1 ? 0 : (1 - u * u) * capeH + Math.sin(x * 0.17) * 1.6;
  };
  for (let x = 0; x < SCREEN_W; x++) {
    const h = cape(x);
    if (h <= 1) continue;
    r.rect(x, waterY - h, 1, h + 3, '#191f3a');
    r.rect(x, waterY - h, 1, 1, '#28304f');
  }
  // The light on the end of it, and it is out. The Turning shot had one
  // burning over the same water; nobody has been up this stretch of coast to
  // relight this one in a long time.
  const lhX = Math.round(capeX + capeW * 0.66);
  const lhH = Math.round(13 * far);
  const lhBase = waterY - cape(lhX);
  r.rect(lhX - 2, lhBase - lhH, Math.max(3, Math.round(4 * far)), lhH + 2, '#141a30');
  r.rect(lhX - 4, lhBase - lhH - 3, Math.max(6, Math.round(8 * far)), 3, '#0f1428');
  r.rect(lhX - 1, lhBase - lhH - 2, 2, 2, '#232a44');

  // A thin bright line of water where a whole bay stood at midnight.
  r.rect(0, waterY, SCREEN_W, Math.max(2, flatY - waterY), '#2c4a6d');
  r.rect(0, waterY, SCREEN_W, 1, 'rgba(224,196,178,0.55)');
  for (let i = 0; i < 16; i++) {
    const y = waterY + 1 + (i % 3);
    if (y >= flatY) continue;
    r.rect(wrap(hash(i + 40) * SCREEN_W * 1.4 - t * 0.28, SCREEN_W, 30), y,
      8 + hash(i + 80) * 18, 1, 'rgba(206,178,166,0.28)');
  }

  /* --------------------------------------------------------------- the flats */

  // Wet sand with the sky lying on it. Bands, not a wash: the whole argument of
  // this ground is that it is a mirror that ought to be under six feet of water.
  box(-160, 58, 560, 120, '#333a4c');
  for (let i = 0; i < 22; i++) {
    const y = 58 + i * 2.4 + i * i * 0.1;
    const x = -120 + ((i * 97) % 420) + Math.sin(t * 0.01 + i) * 3;
    box(x, y, 90 + ((i * 53) % 180), 1,
      i % 3 === 0 ? 'rgba(196,166,158,0.16)' : 'rgba(122,140,172,0.14)');
  }
  // Ripple ribs, running with the coast and packed tighter near the water.
  for (let i = 0; i < 46; i++) {
    const u = hash(i + 300);
    const y = 59 + u * u * 54;
    const x = -100 + hash(i + 340) * 420;
    const w = 16 + hash(i + 380) * 46;
    box(x, y, w, 1, 'rgba(206,190,196,0.13)');
    box(x + 2, y + 1, w - 4, 1, 'rgba(28,34,48,0.20)');
  }

  // Pools left in the hollows, catching the only part of the sky with colour
  // in it yet.
  const POOLS: [number, number, number][] = [
    [40, 78, 15], [96, 92, 11], [158, 84, 13], [206, 100, 9], [-6, 100, 12], [130, 108, 16],
  ];
  for (const [pX, pY, pR] of POOLS) {
    r.ellipsePixel(sx(pX) * DETAIL, sy(pY) * DETAIL, pR * z * DETAIL, pR * 0.34 * z * DETAIL,
      '#4c5f80');
    r.ellipsePixel(sx(pX) * DETAIL, sy(pY - 1) * DETAIL, (pR - 2) * z * DETAIL,
      pR * 0.2 * z * DETAIL, '#7d8bab');
    r.rect(sx(pX - pR * 0.4), sy(pY - 1), pR * 0.8 * z, 1,
      `rgba(226,186,166,${(0.3 + 0.2 * Math.sin(t * 0.05 + pX)).toFixed(2)})`);
  }

  // Weed and rock the sea has covered every day since the last Turning, and
  // uncovered again tonight.
  for (let i = 0; i < 18; i++) {
    const wX = -90 + hash(i + 420) * 400;
    const wY = 62 + hash(i + 460) * 52;
    const ww = 6 + Math.round(hash(i + 500) * 14);
    for (let k = 0; k < ww / 2; k++) {
      const liftK = Math.round(Math.sin((k / (ww / 2)) * Math.PI) * 3) + 1;
      box(wX + k, wY - liftK, 1, liftK + 1, '#2b3328');
      box(wX + ww - k, wY - liftK, 1, liftK + 1, '#232a20');
    }
  }
  for (let i = 0; i < 10; i++) {
    const rX = -60 + hash(i + 540) * 360;
    const rY = 66 + hash(i + 580) * 46;
    const rw = 5 + Math.round(hash(i + 620) * 9);
    box(rX, rY - rw * 0.5, rw, rw * 0.5 + 1, '#3b4050');
    box(rX, rY - rw * 0.5, rw, 1, '#525a6c');
  }

  // A boat that was afloat at midnight, over on its bilge with the mooring line
  // slack across the sand. Nothing else in the frame states the tide as flatly.
  const btX = 168, btY = 96;
  for (let k = 0; k < 9; k++) {
    const u = k / 8;
    const half = Math.round((1 - u * u * 0.8) * 15);
    box(btX - half + k * 0.6, btY - 8 + k, half * 2, 1, k < 2 ? '#6b4a34' : '#3f2c22');
  }
  box(btX - 12, btY, 26, 2, '#2a1d17');
  box(btX - 2, btY - 22, 2, 15, '#4a3527');
  for (let k = 0; k < 22; k++) {
    box(btX - 14 - k, btY + 1 + Math.round(Math.sin(k * 0.4) * 1.4), 1, 1, '#5a4a3a');
  }
  box(btX - 38, btY - 8, 2, 10, '#3a2f26');
  box(btX - 40, btY - 9, 6, 2, '#4a3d31');

  // The kin, already walking out after the sea. They are the reason this is not
  // simply weather: the animals in this game move when the water moves, and
  // they set off before anybody in the town had noticed anything.
  for (let i = 0; i < 6; i++) {
    const wX = 30 + i * 22 + Math.sin(t * 0.02 + i) * 2 + t * 0.16;
    const wY = 100 - i * 5.5;
    // Sizes quantised in fours: a creature resized by a fraction of a pixel per
    // frame shimmers, and costs a cached canvas per frame to do it.
    const size = Math.max(8, Math.round((26 - i * 2.6) * z / 4) * 4);
    const gait = Math.sin(t * 0.13 + i * 1.9);
    const half = size / DETAIL / 2;
    r.ellipsePixel((sx(wX) + half) * DETAIL, sy(wY) * DETAIL, half * DETAIL, 1.6 * z * DETAIL,
      'rgba(24,28,40,0.4)');
    // Walking east along the flats, so every one of them is flipped.
    r.image(kin(RUNNERS[(i + 1) % RUNNERS.length]!, size, '#1c2334', 0, gait * 0.2),
      sx(wX), sy(wY) - size / DETAIL - Math.max(0, gait) * 1.6,
      0, 0, undefined, undefined, facing(1));
  }
  // Flyers going the same way the herd is walking. They beat slowly -- this is
  // the calm before, and nothing in this frame is panicking yet; the storm shot
  // three cuts back is where the sky is work.
  for (let i = 0; i < 3; i++) {
    const gX = -40 + hash(i + 660) * 300 + t * 0.5;
    const gY = 40 + hash(i + 700) * 14 + Math.sin(t * 0.06 + i) * 3;
    const size = Math.max(8, Math.round((12 + i * 3) * z / 4) * 4);
    airKin(r, FLYERS[(i + 3) % FLYERS.length]!, size, sx(gX), sy(gY),
      t * 0.2 + i * 2.3, 0, Math.sin(t * 0.2 + i) * 0.2, facing(1),
      'rgba(27,35,56,0.85)');
  }

  // One swimmer caught in a pool, waiting it out. Its tail flicks and the water
  // answers: the only thing on the flats still moving under its own power.
  const flick = Math.max(0, Math.sin(t * 0.09)) ** 3;
  const spSize = Math.max(8, Math.round(30 * z / 4) * 4);
  // Negative squash, which is the direction that FLATTENS: positive stretches
  // the sprite upward, and a fish standing to attention in two inches of water
  // is not the read this beat wants.
  r.image(kin('shalefin', spSize, null, 0.45 + flick * 0.2, -0.35),
    sx(130), sy(108) - spSize / DETAIL, 0, 0, undefined, undefined, facing(-1));
  if (flick > 0.2) {
    for (let k = 0; k < 5; k++) {
      const rr = (4 + k * 3) * z;
      r.ellipsePixel(sx(138) * DETAIL, sy(108) * DETAIL, rr * DETAIL, rr * 0.3 * DETAIL,
        `rgba(200,214,238,${(0.16 * flick * (1 - k / 5)).toFixed(2)})`);
    }
  }

  /* -------------------------------------------------------------- the shore */

  box(-160, 114, 560, 60, '#232a26');
  box(-160, 112, 560, 2, '#2e3628');
  box(-160, 114, 560, 2, '#39432f');
  for (let i = 0; i < 30; i++) {
    const gh = 2 + Math.round(hash(i + 800) * 4);
    box(-80 + hash(i + 760) * 400, 113 - gh, 1, gh, '#3d4a34');
  }
  box(-160, 120, 560, 5, '#4a4437');
  box(-160, 120, 560, 1, '#5c5442');
  for (let i = 0; i < 16; i++) {
    box(-70 + hash(i + 840) * 380, 121 + (i % 3), 10 + hash(i + 880) * 20, 1, '#3a3529');
  }

  // Three houses, and only the middle one matters. The old cut of this shot had
  // five and gave the eye no reason to settle on any particular one of them.
  const HOUSES: { x: number; w: number; y: number; roof: string; home: boolean }[] = [
    { x: 24, w: 32, y: 96, roof: '#3a4f74', home: false },
    { x: 88, w: 48, y: 84, roof: '#8a4a2c', home: true },
    { x: 178, w: 34, y: 98, roof: '#6d3f28', home: false },
  ];
  const BASE = 124;

  for (const h of HOUSES) {
    if (sx(h.x + h.w) < -6 || sx(h.x) > SCREEN_W + 6) continue;
    box(h.x, h.y, h.w, BASE - h.y, '#2b2c3a');
    box(h.x, h.y, 2, BASE - h.y, '#373948');
    box(h.x + h.w - 2, h.y, 2, BASE - h.y, '#1f2029');
    // Walls first, then the gable over them: a roof that narrows downward is a
    // tent, and that is what the first draft of the old town shot looked like.
    const peak = h.y - Math.round(h.w * 0.44);
    for (let y = peak; y <= h.y; y++) {
      const k = (y - peak) / Math.max(1, h.y - peak);
      const half = (h.w / 2 + 3) * k;
      box(h.x + h.w / 2 - half, y, half * 2, 1, y > h.y - 2 ? '#1a1a24' : h.roof);
    }
    box(h.x - 3, h.y, h.w + 6, 2, '#1a1a24');
    box(h.x + h.w * 0.25, BASE, h.w * 0.5, 3, '#171720');

    if (!h.home) {
      box(h.x + 7, h.y + 12, 6, 8, '#161d2c');
      box(h.x + h.w - 14, h.y + 12, 6, 8, '#161d2c');
      continue;
    }

    // Chimney smoke, kept small and dead inside twenty units of the pot: big
    // soft discs climbing the sky read as marks on the lens, not as smoke.
    const ch = h.x + h.w * 0.24;
    // The pot has to start below the roof SURFACE at its own x, not below the
    // ridge: a quarter of the way along a gable the slope is ten units down
    // from the peak, and a stack measured off the peak hangs in the open air
    // beside the roof with nothing under it.
    const pot = peak - 3;
    box(ch, pot, 5, 15, '#23222e');
    box(ch, pot, 5, 1, '#34333f');
    for (let i = 0; i < 14; i++) {
      const age = ((t * 0.6 + i * 6) % 84) / 84;
      const a = 0.14 * (1 - age) * (1 - age);
      if (a < 0.012) continue;
      const puff = 1 + age * 2.4;
      r.ellipsePixel(sx(ch + 2.5 + Math.sin(age * 4) * 3 + age * 7) * DETAIL,
        sy(pot - 1 - age * 22) * DETAIL, puff * z * DETAIL, puff * z * DETAIL,
        `rgba(158,154,176,${a.toFixed(3)})`);
    }

    // The kitchen window: somebody is up before the rest of the house. The halo
    // is stepped, not one disc -- a single translucent ellipse at a readable
    // alpha draws a hard-edged egg on the wall instead of a glow.
    const flicker = 0.76 + 0.24 * Math.sin(t * 0.17) + 0.06 * Math.sin(t * 0.51);
    const kx = h.x + 8, ky = h.y + 14, kw = 11, kh = 12;
    for (let k = 10; k >= 1; k--) {
      r.ellipsePixel(sx(kx + kw / 2) * DETAIL, sy(ky + kh / 2) * DETAIL,
        (4 + k * 3) * z * DETAIL, (4 + k * 2.4) * z * DETAIL, 'rgba(255,196,110,0.022)');
    }
    for (let k = 6; k >= 1; k--) {
      r.ellipsePixel(sx(kx + kw / 2) * DETAIL, sy(BASE + 2) * DETAIL,
        (8 + k * 5) * z * DETAIL, (3 + k * 2) * z * DETAIL, 'rgba(255,186,100,0.024)');
    }
    box(kx - 1, ky - 1, kw + 2, kh + 2, '#221c1c');
    box(kx, ky, kw, kh, `rgba(255,214,128,${flicker.toFixed(2)})`);
    box(kx, ky, kw, 1, 'rgba(255,244,200,0.9)');
    const cross = ((t + 30) % 320) / 320;
    if (cross > 0.15 && cross < 0.62) {
      const u = (cross - 0.15) / 0.47;
      const cw = 5;
      const cX = kx - cw + (kw + cw * 2) * u;
      const from = Math.max(kx, cX), to = Math.min(kx + kw, cX + cw);
      if (to > from) box(from, ky + 1, to - from, kh - 1, 'rgba(92,54,32,0.82)');
    }
    // Bars last, so the figure passes behind them.
    box(kx + Math.round(kw / 2), ky, 1, kh, 'rgba(112,74,38,0.72)');
    box(kx, ky + Math.round(kh / 2), kw, 1, 'rgba(112,74,38,0.72)');

    // And the gable window: dark for two thirds of the shot, and then a candle
    // carried into it. That rectangle is the whole film's argument -- somebody
    // upstairs is about to be woken and handed a notebook, and it is you.
    const gw = 8, gh2 = 10;
    const gx = h.x + h.w / 2 - gw / 2, gy = 72;
    const wake = Math.max(0, Math.min(1, (p - 0.62) / 0.3));
    box(gx - 1, gy - 1, gw + 2, gh2 + 2, '#1d1820');
    if (wake > 0.02) {
      const cf = 0.8 + 0.2 * Math.sin(t * 0.3);
      box(gx, gy, gw, gh2, `rgba(${Math.round(30 + 220 * wake * cf)},`
        + `${Math.round(36 + 172 * wake * cf)},${Math.round(56 + 60 * wake)},1)`);
      for (let k = 8; k >= 1; k--) {
        r.ellipsePixel(sx(gx + gw / 2) * DETAIL, sy(gy + gh2 / 2) * DETAIL,
          (3 + k * 2.6) * z * DETAIL, (3 + k * 2.2) * z * DETAIL,
          `rgba(255,196,110,${(0.02 * wake).toFixed(3)})`);
      }
      // The candle, and the hand around it as a shadow across the pane.
      box(gx + 5, gy + 2, 2, 6, `rgba(70,40,26,${wake.toFixed(2)})`);
      box(gx + 5, gy + 1, 2, 1, `rgba(255,246,206,${(cf * wake).toFixed(2)})`);
      box(gx + 1, gy + 4, 3, 6, `rgba(58,34,22,${(0.7 * wake).toFixed(2)})`);
    } else {
      box(gx, gy, gw, gh2, '#1e2434');
    }
    box(gx + gw / 2, gy, 1, gh2, 'rgba(96,66,36,0.7)');
  }

  // Four moths working the one light on this stretch of coast. Seven specks
  // read as dirt on the wall; four on wide orbits read as something alive.
  for (let i = 0; i < 4; i++) {
    const a = t * (0.024 + hash(i + 700) * 0.026) + i * 1.6;
    const rr = 10 + hash(i + 740) * 14;
    const s = Math.max(1, Math.round(z));
    r.rect(sx(100 + Math.cos(a) * rr), sy(100 + Math.sin(a * 1.7) * rr * 0.55), s + 1, s,
      `rgba(255,230,178,${(0.4 + 0.35 * Math.sin(t * 0.2 + i)).toFixed(2)})`);
  }

  /* ---------------------------------------------------------------- lens */

  // Marram on the near bank, on a far steeper zoom than anything behind it: as
  // the camera comes forward these swell and swing out past the edges of the
  // frame. Drawn as clumps, never as single stalks -- one tall blade on its own
  // reads as a fence post, which is what this layer used to look like.
  // Both axes go through the near transform. Anchoring these to SCREEN_H and
  // only scaling their height was the mistake in the first pass: the camera
  // pushes FORWARD, so the near bank has to sink out of the bottom of frame,
  // and instead the whole layer grew upward across the house.
  const zn = 1 + e * 2.2;
  const nx = (x: number): number => (x - FX) * zn + ox;
  const ny = (y: number): number => (y - FY) * zn + oy;
  const bankY = ny(128);
  // Placed at fixed scene positions well off the middle, so what swings out of
  // frame is the edges of the picture and never the house in the centre.
  for (const cx3 of [20, 52, 176, 208]) {
    const cX = nx(cx3);
    if (cX < -70 || cX > SCREEN_W + 70 || bankY - 20 > SCREEN_H + 40) continue;
    const blades = 7;
    for (let b = 0; b < blades; b++) {
      const q = hash(cx3 * 13 + b + 1240);
      const leanU = (b - (blades - 1) / 2) / blades;
      const x = cX + leanU * 20 * zn;
      const bh = (24 + q * 26) * zn * (1 - Math.abs(leanU) * 0.5);
      const sway = Math.sin(t * 0.09 + cx3 * 0.1 + b * 0.8) * 5 + leanU * 12;
      const base = Math.max(1, Math.round(zn * 1.4 * (1 - Math.abs(leanU) * 0.7)));
      for (let k = 0; k < bh; k++) {
        const u = k / bh;
        const y = bankY - k;
        if (y > SCREEN_H + 8) continue;
        r.rect(x + sway * u * u, y, Math.max(1, Math.round(base * (1 - u * 0.7))), 1, '#111a18');
      }
    }
  }

  // A fence post on the near verge with two strands still on it. The wires are
  // a unit tall and cross the whole frame, which is what a wire does; they and
  // the post are gone by the time the push is half over.
  const fpX = nx(8);
  const fpTop = ny(112);
  if (fpX > -40 && fpX < SCREEN_W + 40 && fpTop < SCREEN_H) {
    r.rect(fpX, fpTop, Math.max(2, Math.round(4 * zn)), ny(134) - fpTop, '#0d1512');
    for (const wy of [ny(118), ny(126)]) {
      if (wy > SCREEN_H) continue;
      r.rect(0, wy + Math.sin(t * 0.03) * zn * 0.5, SCREEN_W,
        Math.max(1, Math.round(zn * 0.7)), '#0d1512');
    }
  }

  // Air coming off the flats, kept under the skyline: haze streaking across the
  // stars looked like a fault in the gradient rather than like weather.
  for (let i = 0; i < 18; i++) {
    const sp = 1.2 + hash(i + 1400) * 2.4;
    const y = flatY + 4 + hash(i + 1480) * 70 + Math.sin(t * 0.04 + i) * 5;
    if (y > SCREEN_H) continue;
    r.rect(wrap(hash(i + 1440) * SCREEN_W * 2 - t * sp, SCREEN_W, 40), y,
      16 + hash(i + 1520) * 36, 1 + (i % 2),
      `rgba(206,214,236,${(0.045 + hash(i + 1560) * 0.05).toFixed(3)})`);
  }
}

/* ------------------------------------------------------------ title card */

/**
 * The title card's clock offset into the sea shot, and where the wordmark
 * lands. Both are exported through HANDOFF so the start screen can take the
 * picture over mid-move.
 */
const SEA_OFFSET = 900;
const LOGO_Y = 84;

let logoSprite: HTMLCanvasElement | null = null;
let shineSprite: HTMLCanvasElement | null = null;
let subSprite: HTMLCanvasElement | null = null;

/**
 * Built on first use, and shared.
 *
 * The film is no longer the only thing that asks for it: since the cinematic
 * now runs BEFORE the start screen and hands straight into it, the wordmark on
 * the film's last frame and the wordmark on the first frame of the menu have to
 * be the same object at the same size in the same place, or the join -- which
 * the player watches happen, with no black in between -- shows a seam.
 * Rebuilding an identical sprite in the other file would have worked right up
 * until somebody changed one palette and not the other.
 */
export function titleArt(): { logo: HTMLCanvasElement; shine: HTMLCanvasElement; sub: HTMLCanvasElement } {
  if (!logoSprite || !shineSprite || !subSprite) {
    // The same palette the title screen uses. Two different KINBOUNDs a minute
    // apart would read as two different games.
    logoSprite = makeTextSprite('KINBOUND', {
      scale: 4,
      fill: ['#ffe9b0', '#ffd27a', '#f0a94e', '#d4813a'],
      outline: '#241c28',
      shadow: 'rgba(8,10,20,0.55)',
      shadowOffset: 2,
      letterSpacing: 1,
    });
    shineSprite = makeTextSprite('KINBOUND', {
      scale: 4,
      fill: ['#fffdf2', '#fff4d2', '#ffe1a4', '#ffc887'],
      outline: '#241c28',
      shadow: null,
      letterSpacing: 1,
    });
    subSprite = makeTextSprite('AMBER VERSION', {
      scale: 2,
      fill: ['#d6e6f4'],
      outline: '#1a2030',
      shadow: null,
      letterSpacing: 2,
    });
  }
  return { logo: logoSprite, shine: shineSprite, sub: subSprite };
}

/**
 * The wordmark, centred, with AMBER VERSION under it.
 *
 * Centring measures in GAME units, not canvas pixels. A text sprite built at
 * scale 4 is a canvas four font-pixels wide per glyph pixel, and the renderer
 * draws it into a buffer that is DETAIL pixels per game unit -- so the sprite
 * covers `width / DETAIL` units on screen, not `width`. The start screen used
 * to centre on the raw canvas width and hung its logo forty units left of the
 * middle of the screen for as long as the screen has existed. Nobody reads a
 * title screen looking for a centring bug; they just think it looks cheap.
 *
 * Returns the logo's height in game units, so a caller can stack under it.
 */
export function wordmark(r: Renderer, y: number, alpha = 1, subAlpha = 1): number {
  const { logo, sub } = titleArt();
  const lw = logo.width / DETAIL;
  const lh = Math.round(logo.height / DETAIL);
  if (alpha > 0.004) {
    r.image(logo, Math.round((SCREEN_W - lw) / 2), y,
      0, 0, undefined, undefined, false, false, alpha);
  }
  if (subAlpha > 0.004) {
    const sw = sub.width / DETAIL;
    r.image(sub, Math.round((SCREEN_W - sw) / 2), y + lh + 3,
      0, 0, undefined, undefined, false, false, subAlpha);
  }
  return lh;
}

/**
 * The scrim the wordmark sits on: a soft band of dark, thickest through the
 * middle of the letters.
 *
 * Amber type on an amber sky is type nobody can read, and the start screen has
 * to survive five different backdrops rather than the one this was written for,
 * so it is a function both files call rather than a loop either one owns.
 */
export function wordmarkScrim(r: Renderer, y: number, alpha: number, strength = 0.075): void {
  if (alpha <= 0.004) return;
  for (let i = 0; i < 16; i++) {
    const a = strength * Math.sin((i / 15) * Math.PI) * alpha;
    r.rect(0, y - 12 + i * 3, SCREEN_W, 3, `rgba(5,9,20,${a.toFixed(3)})`);
  }
}

/**
 * The logo, over the shot the film opened on.
 *
 * Returning to the first image is the cheapest way to make a montage feel like
 * it was about something, and it means the title arrives over a frame that is
 * still fully alive rather than over a plate.
 */
function shotTitle(r: Renderer, t: number, p: number): void {
  // Offset time so the flock is not caught in the same pose it left in, and
  // keep the sea camera creeping: a title card over a frozen picture is a plate
  // however pretty the picture is.
  shotSea(r, t + SEA_OFFSET, 0.86 + p * 0.14);

  const { logo, shine } = titleArt();
  const lw = logo.width / DETAIL;
  const lx = Math.round((SCREEN_W - lw) / 2);
  const rise = easeOut(t / 46);
  // Low in the frame, over the water. Centred, it sat on the brightest part of
  // the dawn sky -- an amber wordmark on an amber sky, which is a wordmark
  // nobody can read. The scrim below is the belt to that pair of braces.
  const ly = Math.round(LOGO_Y - 8 * (1 - rise));

  const fade = Math.min(1, t / 26);
  wordmarkScrim(r, ly, fade);

  const subFade0 = Math.min(1, Math.max(0, (t - 60) / 40));
  if (rise > 0.01) wordmark(r, ly, fade, subFade0);

  // The landing: a few frames of light off the whole frame, so the logo
  // arrives with a weight the fade alone cannot give it.
  if (t >= 44 && t < 52) r.tint('#f6ecd8', (52 - t) / 26);

  // A highlight travelling across the letters. It is a vertical slice of a
  // brighter copy of the same sprite, so it can only ever land on logo pixels:
  // no mask, and no compositing modes the renderer does not have.
  const sweep = (t - 74) / 92;
  if (sweep > 0 && sweep < 1) {
    const w = 22;
    const s = Math.round(-w + sweep * (logo.width + w * 2));
    const from = Math.max(0, s);
    // Clamped against the shine sprite, not the logo: the logo canvas is larger
    // because it carries a drop shadow, and a source rect that runs off the end
    // of an image is squeezed by drawImage rather than cropped.
    const to = Math.min(shine.width, s + w);
    if (to > from) {
      r.image(shine, lx + from / DETAIL, ly, from, 0, to - from, shine.height,
        false, false, 0.75);
    }
  }
}

/* --------------------------------------------------------------- the film */

/**
 * The cut. Eight shots, about thirty-two seconds, and it now reads as one
 * argument rather than five postcards and a window: sea, kin, deep, Turning,
 * the town the last one took, the woman who has been charting the next one, the
 * shore where it has already started, logo.
 *
 * The two long shots in the middle carry two beats of caption each because they
 * are the two carrying the plot. Everything else gets one line, and the title
 * card gets none.
 *
 * THE RHYTHM OF THE JOINS. The first three shots are one paragraph -- here is
 * the sea, here is what lives beside it, here is what lives under it -- so they
 * blink between one another at half the old length. Then the Turning arrives on
 * a proper fade, because it is a change of subject, and it LEAVES on nothing at
 * all: a lightning strike lands four frames before the end of it and the film
 * cuts on the white, straight into a town that has been underwater for seventy
 * years. That is the only hard cut in the picture, and it is the moment the
 * film stops describing a place and starts describing a disaster. Everything
 * after it slows back down: the town fades out properly, the archive fades in
 * properly, and the last two joins are the longest in the film because the
 * shore and the logo are each meant to land as an ending.
 */
const SHOTS: Shot[] = [
  {
    frames: 230,
    captions: ['Caelora. A ring of land around a sea with no bottom.'],
    fadeOut: 16,
    draw: shotSea,
  },
  {
    frames: 210,
    captions: ['Herds swim, flocks turn, whole species walk to the far shore.'],
    fadeIn: 16,
    fadeOut: 16,
    draw: shotPlains,
  },
  {
    frames: 200,
    captions: ['The kin have crossed it longer than anyone has counted.'],
    fadeIn: 16,
    fadeOut: 26,
    draw: shotDeep,
  },
  {
    frames: 230,
    captions: ['Every seventy years the sea reverses. They call it the Turning.'],
    fadeIn: 26,
    fadeOut: 0,
    draw: shotTurning,
  },
  {
    frames: 270,
    captions: [
      'The last one took a town called Old Tidefall.',
      'One night. By morning there was only water.',
    ],
    fadeIn: 0,
    fadeOut: 30,
    draw: shotDrowned,
  },
  {
    frames: 300,
    captions: [
      'Professor Sorrell has been pinning charts of it for ten years.',
      'The next is eleven years out. It began this spring.',
    ],
    draw: shotCharts,
  },
  {
    frames: 290,
    captions: [
      'He needs somebody out in it, writing down what they see.',
      'North shore. One light on. You are asleep under it.',
    ],
    fadeOut: 38,
    draw: shotShore,
  },
  {
    frames: 180,
    captions: [],
    open: true,
    fadeIn: 38,
    // No fade out. The card is the last thing in the film and what happens
    // after it is not a cut: either the start screen takes the live picture
    // over (the dip in HANDOFF), or `leaving` takes it down slowly. A default
    // 30-tick fade here put the frame most of the way to black before either
    // of those got a chance to start.
    fadeOut: 0,
    draw: shotTitle,
  },
];

const FADE = 30;

/** The title card. Every route through the film finishes on this one. */
const CARD = SHOTS.length - 1;

/* ------------------------------------------------------ the living backdrop */

/**
 * The shots the start screen is allowed to run behind its menu.
 *
 * These are the film's own shots, not new drawings of the same places. That is
 * deliberate twice over: the start screen inherits four-layer parallax and a
 * moving camera for nothing, and the region behind the menu is provably the
 * region in the picture -- there is no second set of art to fall out of date
 * when a species or a palette changes.
 *
 * Two things are authored per entry because a backdrop is not a shot:
 *
 *  `from`/`to` bound the camera move. A shot's move was written for four or
 *   five seconds and a backdrop holds for ten, so it runs a slice rather than
 *   the whole thing -- and the slice is chosen to keep the composition in the
 *   part of the move that frames well AND to stay away from anything that
 *   flashes. The Turning ends on a lightning strike that whites out the frame;
 *   over a menu that is not weather, it is a fault. It stops at 0.82.
 *
 *  `lift` is how much extra scrim this particular picture needs under the
 *   wordmark. Dawn over the sea is amber exactly where the amber logo goes; a
 *   drowned town at night needs almost nothing.
 */
export interface Backdrop {
  /** For the lower-third, and for shot lists. */
  readonly place: string;
  readonly from: number;
  readonly to: number;
  readonly lift: number;
  draw(r: Renderer, t: number, p: number): void;
}

export const BACKDROPS: readonly Backdrop[] = [
  { place: 'THE CAELORAN SEA', from: 0.10, to: 0.96, lift: 1.00, draw: shotSea },
  { place: 'THE LONG GRASS', from: 0.06, to: 0.94, lift: 0.85, draw: shotPlains },
  { place: 'BELOW THE SHELF', from: 0.05, to: 0.95, lift: 0.35, draw: shotDeep },
  { place: 'THE TURNING', from: 0.08, to: 0.82, lift: 0.45, draw: shotTurning },
  { place: 'OLD TIDEFALL', from: 0.05, to: 0.92, lift: 0.30, draw: shotDrowned },
  { place: 'THE NORTH SHORE', from: 0.04, to: 0.88, lift: 0.55, draw: shotShore },
];

/**
 * Where the film puts the wordmark down, so the start screen can pick it up
 * without the player seeing the handover.
 *
 * The film no longer fades out and the menu no longer fades in: the last frame
 * of the cinematic and the first frame of the start screen are the same
 * picture, the same sea, at the same point in the same camera move, with the
 * same logo in the same place. Everything in here is a number both files have
 * to agree on for that to be true.
 */
export const HANDOFF = {
  /**
   * What to add to the card's own clock to get the sea's. `handOff` is called
   * with the card's tick count, so the picture is picked up on the exact frame
   * it was put down rather than on a number somebody wrote down once.
   */
  seaOffset: SEA_OFFSET,
  /** Where the camera has come to rest by then. */
  seaP: 1,
  /** Where the wordmark sits, in game units. */
  logoY: LOGO_Y,
  /** How dark the picture is at the moment of the join. */
  dip: 0.55,
  /** How long the film spends dipping into it, and the start screen coming out. */
  dipIn: 46,
  dipOut: 44,
} as const;

/**
 * The film's vignette, so the screen that takes over from it has the same
 * edges. Without this the corners jump on the join.
 */
export function cineVignette(r: Renderer): void {
  for (let i = 0; i < 10; i++) {
    const c = `rgba(3,5,11,${(0.05 * (1 - i / 10)).toFixed(3)})`;
    r.rect(0, i, SCREEN_W, 1, c);
    r.rect(0, SCREEN_H - 1 - i, SCREEN_W, 1, c);
    r.rect(i, 0, 1, SCREEN_H, c);
    r.rect(SCREEN_W - 1 - i, 0, 1, SCREEN_H, c);
  }
}

/** Build every icon the film and the backdrops need, before the first frame. */
export function warmOpeningArt(): void {
  for (const id of [...FLYERS, ...RUNNERS, ...SWIMMERS]) iconSprite(id);
}

/**
 * Drop the scaled copies. Only worth calling when nothing is going to ask for
 * a cinematic frame again -- which is the moment the player commits to a game,
 * not the moment the film ends, because the start screen behind the menu is
 * still drawing these shots.
 */
export function releaseOpeningArt(): void {
  scaledCache.clear();
}

/**
 * How the cinematic was reached.
 *
 * `cold` is the film starting on its own: black screen, bars slide in, fade up.
 * That is now the normal case -- the film is the first thing a launch shows.
 * `handed` is some other screen having already closed the letterbox and taken
 * the picture to black before starting this scene, in which case the opening
 * must NOT play the same move again or the bars slide in twice and the player
 * watches the film start over the top of itself.
 */
export type OpeningEntry = 'cold' | 'handed';

/**
 * Which cut to run.
 *
 * `full` is the film: eight shots, half a minute, the whole argument.
 *
 * `overture` is for somebody who has played before. It is not the film with
 * bits cut out of it -- it is one of the film's shots, played at its authored
 * speed with its own line under it, and then the title card. Six seconds, a
 * beginning, a middle and an end. A returning player is not made to sit through
 * a story they already know, and they are not made to press a button to escape
 * one either, which was the other way of solving this and is the way that makes
 * a player feel they have skipped something.
 *
 * The shot rotates from launch to launch, so the thing a regular player sees
 * every day is different every day.
 */
export type OpeningCut = 'full' | 'overture';

export interface OpeningPlan {
  entry?: OpeningEntry;
  cut?: OpeningCut;
  /**
   * Which shot the overture is built on. Defaults to the rotation; passing one
   * is how a capture driver gets the same six seconds twice.
   */
  overture?: number;
  /**
   * What to do when the last frame is gone. Defaults to character creation.
   * Called with the title card's own tick count, which is the sea's clock minus
   * HANDOFF.seaOffset -- everything the next screen needs to carry the picture
   * on from where the film left it.
   */
  handOff?: (game: Game, cardT: number) => void;
}

/**
 * The shots an overture may be built on: the ones that open on a picture rather
 * than on a plot point. The archive is a room with a woman explaining something
 * in it, which is a scene; these are places.
 */
const OVERTURE_SHOTS = [0, 1, 2, 3, 4, 6];

/**
 * Which one comes up this launch.
 *
 * Persisted, so it walks the list rather than rolling dice -- a player who
 * opens the game twice in an evening should not see the same six seconds twice
 * because a coin landed the same way. Storage failing is not an error worth
 * having: an unwritable browser just gets the first shot every time.
 */
function nextOverture(): number {
  let n = 0;
  try {
    const raw = localStorage.getItem('kinbound.overture');
    n = raw ? (Number.parseInt(raw, 10) || 0) : 0;
    localStorage.setItem('kinbound.overture', String((n + 1) % 1000));
  } catch { /* private mode, or no storage at all. The first shot will do. */ }
  return OVERTURE_SHOTS[n % OVERTURE_SHOTS.length]!;
}

/**
 * The overture, built out of one of the film's shots plus the title card.
 *
 * The picture runs the MIDDLE of the source shot's camera move rather than all
 * of it squeezed into three seconds. A camera move played at the wrong speed is
 * the loudest way to say "this is an abridgement".
 */
function overtureCut(index: number): Shot[] {
  const src = SHOTS[index]!;
  const from = 0.22;
  const to = 0.86;
  const card = SHOTS[CARD]!;
  return [
    {
      frames: 200,
      captions: src.captions.slice(0, 1),
      fadeIn: 26,
      fadeOut: 26,
      draw: (r, t, p) => src.draw(r, t + Math.round(src.frames * from), from + p * (to - from)),
    },
    { ...card, fadeIn: 30 },
  ];
}

export class OpeningScene implements Scene {
  readonly name = 'opening';

  private shot = 0;
  private t = 0;
  /** 0 = clear, 1 = black. Doubles as the cross-fade between shots. */
  private veil = 1;
  private leaving = false;
  /** The reel this run is playing: the whole film, or the overture. */
  private reel: Shot[];
  private entry: OpeningEntry;
  /** True once the picture has been asked to go to its last page early. */
  private hurried = false;
  /** Ticks of the dip into the start screen. -1 until the card is over. */
  private hand = -1;

  constructor(private state: GameState, private plan: OpeningPlan = {}) {
    this.entry = plan.entry ?? 'cold';
    this.reel = plan.cut === 'overture'
      ? overtureCut(plan.overture ?? nextOverture())
      : SHOTS;
  }

  enter(): void {
    audio.playMusic('opening_theme');
    // Build every icon this film needs up front. Generating a creature sprite
    // is not free, and doing it lazily meant each shot dropped frames on the
    // one tick it first showed a new species -- always right after a cut, where
    // it is most visible. One hitch under the transition beats five under the
    // picture.
    warmOpeningArt();
  }

  /** The last shot of whatever reel is running: always the title card. */
  private get card(): number { return this.reel.length - 1; }

  /**
   * The way out that is not a skip.
   *
   * The film used to answer a keypress by fading to black in a fifth of a
   * second and dropping the player somewhere else -- which is what abandoning
   * something looks like, and it is what the player was told they were doing by
   * a caption reading ENTER TO SKIP. It now answers by going to the LAST PAGE:
   * the title card, over the sea the film opened on, with the wordmark rising
   * out of it and the menu on the other side of it. Whatever route you take
   * through the cinematic, it ends the same way and it ends on purpose.
   */
  private hurry(): void {
    if (this.hurried) return;
    this.hurried = true;
    audio.playSfx('confirm', { volume: 0.35 });
    if (this.shot === this.card) {
      // Already on the card. Take it to the point where the logo has landed
      // and let the ending play from there.
      this.t = Math.max(this.t, 96);
      return;
    }
    this.shot = this.card;
    this.t = 0;
    this.veil = 1;
  }

  update(game: Game, _dt: number): void {
    this.t++;

    if (this.leaving) {
      // The one remaining route that still goes to black: something asked for
      // the old hand-off to character creation. The title card stays alive
      // under the fade for the best part of a second while it goes.
      this.veil = Math.min(1, this.veil + 0.019);
      if (this.veil >= 1) this.finish(game);
      return;
    }

    // The dip. Not a fade-out: it settles onto the start screen's own scrim and
    // stops there, and the screen that takes over comes up out of the same
    // number. See HANDOFF.
    if (this.hand >= 0) {
      this.hand++;
      if (this.hand === 1) audio.playMusic('title_theme');
      if (this.hand >= HANDOFF.dipIn) this.finish(game);
      return;
    }

    if (game.input.pressed('confirm') || game.input.pressed('cancel')
      || game.input.pressed('menu') || game.input.mouse.leftPressed) {
      this.hurry();
      return;
    }

    const shot = this.reel[this.shot]!;
    const fin = shot.fadeIn ?? FADE;
    const fout = shot.fadeOut ?? FADE;
    if (fin > 0 && this.t < fin) this.veil = 1 - this.t / fin;
    else if (fout > 0 && this.t > shot.frames - fout) {
      this.veil = (this.t - (shot.frames - fout)) / fout;
    } else this.veil = 0;

    if (this.t >= shot.frames) {
      if (this.shot >= this.card) {
        // The film is over. If somebody is waiting to be handed the picture it
        // is handed over live -- see `finish`. Note what does NOT happen here:
        // `t` is not pinned. The card's clock keeps running all the way through
        // the dip, so the sea under the wordmark is still moving at the instant
        // the start screen takes it over. Freezing the frame for the last two
        // thirds of a second is the one thing that would give the join away.
        if (this.plan.handOff) this.hand = 0;
        else this.leaving = true;
        return;
      }
      this.t = 0;
      this.shot++;
    }
  }

  /**
   * Give the screen away.
   *
   * `handOff` is how the cinematic reaches the start screen, and it is called
   * with the picture still up rather than after a fade, because the two screens
   * are drawing the same frame at that moment and the join is meant to be
   * invisible.
   */
  private finish(game: Game): void {
    if (this.plan.handOff) this.plan.handOff(game, this.t);
    else game.scenes.replaceAll(new CreatorScene(this.state));
  }

  render(_game: Game, r: Renderer): void {
    const shot = this.reel[this.shot]!;
    const p = Math.min(1, this.t / shot.frames);
    r.clear('#05070d');
    shot.draw(r, this.t, p);

    cineVignette(r);

    // Letterbox. Cheap, and it tells the player at a glance that this is not a
    // screen they are meant to be pressing buttons at. The bars slide in at the
    // head of the film and pull back for the title card: the frame opening up
    // is the signal that the cinematic has handed over.
    let bars = 1;
    // Only when the film starts cold. Reached from the title screen the bars
    // are already shut -- that screen closed them itself, in shot, before it
    // handed over, and sliding them in a second time would be the film
    // announcing a beginning the player has just watched happen.
    if (this.shot === 0 && this.entry === 'cold') bars = Math.min(1, this.t / 34);
    if (shot.open) bars = Math.max(0, 1 - this.t / 46);
    const topH = 14 * bars;
    const botH = 22 * bars;
    if (topH > 0.5) r.rect(0, 0, SCREEN_W, topH, '#05070d');
    if (botH > 0.5) r.rect(0, SCREEN_H - botH, SCREEN_W, botH, '#05070d');

    // Captions hold still while the picture moves. A shot with two beats splits
    // its length between them and each one fades up and down inside its own
    // slot, so the swap never lands as a hard cut under a held frame.
    if (shot.captions.length > 0) {
      const span = shot.frames / shot.captions.length;
      const idx = Math.min(shot.captions.length - 1, Math.floor(this.t / span));
      const local = this.t - idx * span;
      const ramp = Math.min(34, span * 0.28);
      const hold = Math.min(1, local / ramp) * Math.min(1, (span - local) / ramp);
      if (hold > 0.02) {
        const lines = r.wrapText(shot.captions[idx]!, SCREEN_W - 32).slice(0, 2);
        const top = SCREEN_H - 6 - lines.length * 9;
        lines.forEach((line, i) => {
          r.text(line, SCREEN_W / 2, top + i * 9, {
            color: hold > 0.6 ? '#f0e6d2' : '#a49c8c',
            shadow: '#05070d',
            align: 'center',
          });
        });
      }
    }

    // What the key actually does, said honestly. It does not skip the film: it
    // takes it to its last page and out into the menu, which is the same place
    // sitting through the whole thing gets you. A caption that says SKIP tells
    // a player that the thing in front of them is an obstacle.
    if (this.shot === 0 && this.t < 240 && Math.floor(this.t / 34) % 2 === 0) {
      r.text('ENTER TO BEGIN', SCREEN_W - 6, 4, { color: '#6d7893', align: 'right' });
    }

    if (this.veil > 0) r.tint('#05070d', this.veil);

    // The dip, over everything including the veil, so the last thing on screen
    // is the exact colour and weight the start screen's first frame opens on.
    if (this.hand >= 0) {
      r.tint('#060b18', HANDOFF.dip * smooth(this.hand / HANDOFF.dipIn));
    }
  }

}
