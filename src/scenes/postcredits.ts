/**
 * THE POST-CREDITS.
 *
 * Canon section 65, and it is six lines long in the document because it is
 * meant to be almost wordless:
 *
 *     Deep underwater. Neravoss swims through ancient ruins. It passes a wall
 *     carving showing several enormous Kin. One is Neravoss. The others are
 *     unknown. One of the carvings begins to glow. End.
 *
 * This is the last thing anybody sees, and its job is to make Averra feel
 * enormous. The player has just finished thirty hours about ONE region and ONE
 * legendary creature. This says: there are others, and that was one carving on
 * one wall.
 *
 * SO THERE IS NO DIALOGUE IN THIS FILE, and there must never be any. Canon
 * gives it none and it does not need any. A caption here would be the film
 * explaining its own last shot, which is the one thing that would kill it.
 * What it has instead is four pictures:
 *
 *   1. THE DARK      -- black water, and something crossing it that we only
 *                       know by what it blots out.
 *   2. OPEN WATER    -- the creature the player let go, in full, unhurt,
 *                       unhurried, moving for the first time in the whole game
 *                       without being frightened of anything.
 *   3. THE RUINS     -- Aurelian columns, built at a scale that makes the
 *                       animal small, which is a thing this game has never once
 *                       done to it.
 *   4. THE WALL      -- the payload, and it is one continuous take.
 *
 * THE ONE THING THAT MUST LAND is in shot four, and it is landed by staging
 * rather than by pointing at it. The camera tracks a carved wall; five reliefs
 * go past; the animal swims the length of it BELOW the panels, so portrait and
 * subject are never on top of one another. Halfway through, it draws level with
 * its own carving -- same length, same silhouette, one above the other -- and
 * nothing whatsoever happens to mark the moment. No caption, no chord, no
 * camera move.
 *
 * The only help the shot gives is physics. Neravoss glows; a glowing thing
 * passing a wall lights the wall. So for the two seconds it is level with its
 * own relief, its own markings pick that relief out of the dark, and the panel
 * the player is looking at is lit BY the animal in front of it. That is not the
 * film pointing. That is just what light does, and it buys exactly the second
 * the recognition needs.
 *
 * Then it leaves, the camera gives up trying to keep pace, and settles on two
 * panels: Neravoss, and the winged thing next to it. The winged one lights.
 * Its light is warm and it comes from inside the stone, so it cannot be
 * mistaken for the animal's -- different colour, different source, and the
 * animal is not there any more. End.
 *
 * ART. Everything is drawn here in code. There is no image file, and no kin
 * sprite: the only thing borrowed is the CLIMAX'S OWN PALETTE, imported from
 * src/scenes/neravoss.ts rather than copied, so that if the animal's colours
 * are ever retuned the creature in the post-credits is retuned with it. A
 * player must not be able to tell that this is a second drawing of it.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { audio } from '../audio/audio.js';
import type { GameState } from '../systems/state.js';
import { BODY, BODY_BANDS, GLOW_CALM } from './neravoss.js';

/* ===================================================================== *
 *  PALETTE
 * ===================================================================== */

/**
 * The water, and it is much darker than any water this game has drawn before.
 *
 * Every other sea in KinBound is lit from a sky. This one has no sky in it: the
 * shallowest thing in the picture is a hundred fathoms down, so the brightest
 * blue on screen is `far`, and it appears only as a smear at the top of the
 * first shot. Everything else is built between `deep` and black.
 */
const WATER = {
  black: '#02060c',
  deep: '#04101c',
  mid: '#072030',
  far: '#0d3a52',
  dust: '#7fb6d0',
} as const;

/**
 * Aurelian stone.
 *
 * Pale, and pale on purpose. The ruins are the only thing down here that was
 * ever meant to be looked at, and the whole of the last shot is a light running
 * through a groove cut into this. A dark wall would have swallowed it.
 */
const STONE = {
  lit: '#6a889b',
  face: '#3a5666',
  shade: '#26404f',
  cut: '#050e18',
  silt: '#16394b',
} as const;

/**
 * THE LIGHT IN THE CARVING, and the single most important colour decision here.
 *
 * It is WARM, and nothing else in the picture is. Neravoss' own light is
 * `GLOW_CALM` -- a cold sea-green, the colour it settled to at the end of the
 * climax -- and it is all over shots one to four. If the carving woke in the
 * same colour the player would read it as the animal doing something. It is
 * not. It is something else, somewhere else, in a colour the sea has no
 * business containing.
 *
 * It is also deliberately NOT Meridian's amber (`RIG.lamp`). That is lamp
 * amber, on machined plate, and it means people. This is old gold in wet stone.
 */
const WAKE = {
  core: '#fff3d2',
  body: '#ffd98e',
  halo: '#f0b45e',
} as const;

/* ===================================================================== *
 *  MATHS
 * ===================================================================== */

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Smoothstep. A camera that starts and stops abruptly reads as a jump cut. */
function smooth(p: number): number {
  const c = clamp01(p);
  return c * c * (3 - 2 * c);
}

function easeIn(p: number): number {
  const c = clamp01(p);
  return c * c;
}

function easeOut(p: number): number {
  const c = clamp01(p);
  return 1 - (1 - c) ** 3;
}

/** A 0..1 value from an integer, with no table behind it. */
function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Wrap a scrolling coordinate into [-pad, span+pad). */
function wrap(x: number, span: number, pad: number): number {
  const s = span + pad * 2;
  return ((x % s) + s) % s - pad;
}

function hexRgb(color: string): [number, number, number] {
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
}

/**
 * MEMOISED, AND QUANTISED TO GET THERE.
 *
 * Measured before this existed, the wall shot cost 12.5ms of a 16.6ms frame,
 * and almost all of it was here: every groove pixel of five carvings, every
 * column of the animal, and every block of two separate light fields asked for
 * a colour, and each ask was six `parseInt`s, three `toString(16)`s and a
 * template literal. Nothing in this file needs more than about forty steps
 * between two colours, so the blend is rounded to fortieths and the answer is
 * kept. The cache is bounded by the number of colour PAIRS in the file, which
 * is a couple of dozen.
 */
const mixCache = new Map<string, string>();

function mix(a: string, b: string, k: number): string {
  const q = Math.round(clamp01(k) * 40);
  const key = `${a}${b}${q}`;
  const hit = mixCache.get(key);
  if (hit !== undefined) return hit;
  const t = q / 40;
  const [ar, ag, ab] = hexRgb(a);
  const [br, bg, bb] = hexRgb(b);
  const f = (x: number, y: number): string =>
    Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  const out = `#${f(ar, br)}${f(ag, bg)}${f(ab, bb)}`;
  mixCache.set(key, out);
  return out;
}

const rgbaCache = new Map<string, string>();

function rgba(hex: string, a: number): string {
  // Sixtieths. Fine enough that no gradient in here bands, coarse enough that
  // the bloom on the last shot is a few dozen strings rather than a few
  // thousand.
  const q = Math.round(clamp01(a) * 60);
  const key = `${hex}${q}`;
  const hit = rgbaCache.get(key);
  if (hit !== undefined) return hit;
  const [r, g, b] = hexRgb(hex);
  const out = `rgba(${r},${g},${b},${(q / 60).toFixed(3)})`;
  rgbaCache.set(key, out);
  return out;
}

/* ===================================================================== *
 *  LAYOUT
 *
 *  Authored for 240x160 and nudged for the wide fit rather than stretched:
 *  the wall keeps its proportions and simply sits lower in a taller frame,
 *  because a relief carving squashed to fit a viewport is a relief carving
 *  nobody believes was cut by hand.
 * ===================================================================== */

/**
 * One carved panel, and the width is the number the whole shot hangs off.
 *
 * Two panels plus the pier between them have to fit inside 240 with air round
 * them, because the last frame of the game is exactly that: Neravoss, and the
 * one next to it. 96 + 16 + 96 = 208, and the 16 units of margin either side is
 * what stops the pair reading as a diagram.
 */
const PANEL_W = 96;
const PANEL_H = 64;
/** The pilaster between two panels. */
const PIER_W = 16;
/** Panel-to-panel pitch along the wall. */
const BAY = PANEL_W + PIER_W;

/** Top of the carved band, in screen units. */
const WALL_TOP = Math.round(18 + (SCREEN_H - 160) * 0.45);
/** Where the frieze of little figures runs. */
const FRIEZE_Y = WALL_TOP + PANEL_H + 2;
/**
 * Centre-line the animal swims along when it is passing the wall.
 *
 * Clear of the panels by a good margin. Portrait above, subject below, and
 * never overlapping -- the second the animal covers part of its own carving the
 * comparison the whole scene is built on stops being available to make.
 */
const SWIM_Y = WALL_TOP + PANEL_H + 42;
/** Where the silt has drifted up the foot of the wall. */
const FLOOR_Y = WALL_TOP + PANEL_H + 56;

/**
 * How long the animal is, nose to tail fork, when it is at the wall.
 *
 * Deliberately a little longer than the relief it is being compared with. The
 * same length would read as a tracing; a bit longer reads as the thing the
 * tracing was of.
 */
const NERA_LEN = 100;

/* ===================================================================== *
 *  NERAVOSS
 *
 *  Same construction as the climax -- a parametric spine sampled once per
 *  authoring column, filled top to bottom out of BODY_BANDS -- but a different
 *  POSE. In the climax it is reared out of a pool with its head above the
 *  waterline and most of its length under the swell. Here it is in open water,
 *  side on, whole, and level. That is the difference the shot is about, so it
 *  had to be a different rig rather than the same rig with the sea removed.
 * ===================================================================== */

interface Nera {
  /** The snout, in screen units. The body runs LEFT from here: it faces right. */
  x: number;
  y: number;
  /** Nose to tail fork. */
  len: number;
  /** Its own clock, in ticks. */
  t: number;
  /**
   * How much of it the water gives back, 0..1.
   *
   * 0 is a hole in the picture -- the shape is there, and it is darker than the
   * water behind it, and that is all you get. 1 is close enough to read the
   * bands on its flank. This is the whole of shot one: it opens at about 0.05.
   */
  light: number;
  /** Marking brightness, 0..1. Never zero: the lights are what it is. */
  lamp: number;
  /** Fraction of its own length it climbs across its length. Shallow. */
  pitch?: number;
  /** How hard it is working. Small everywhere in this film, which is the point. */
  effort?: number;
}

/** Body centre-line at spine position s (0 = snout, 1 = tail fork). */
function neraSpineY(n: Nera, s: number): number {
  const work = n.effort ?? 0.12;
  // One long wave running down the whole animal, and it is SLOW. The climax
  // gave this term a second, faster harmonic scaled by how frightened it was;
  // there is no second harmonic here, because there is nothing frightening it.
  const swim = Math.sin(n.t * 0.019 - s * 2.9) * (0.9 + s * 5.4) * (0.55 + work);
  const climb = (n.pitch ?? 0) * s * n.len;
  return n.y + swim + climb;
}

/** Half-thickness at spine position s, as a share of overall length. */
function neraSpineR(n: Nera, s: number): number {
  const L = n.len;
  // The head is a blunt wedge that swells behind the jaw, then a long taper.
  // The ratios are the climax's, divided through by its 300-unit spine, so the
  // animal is the same animal at any size the film wants it.
  if (s < 0.055) return L * (0.020 + easeOut(s / 0.055) * 0.050);
  if (s < 0.16) return L * (0.070 + Math.sin(((s - 0.055) / 0.105) * Math.PI) * 0.017);
  const k = (s - 0.16) / 0.84;
  return Math.max(L * 0.006, L * 0.080 * (1 - easeIn(k) * 0.94));
}

function neraSpineX(n: Nera, s: number): number {
  return n.x - s * n.len;
}

/**
 * Draw it.
 *
 * Order matters: the far pectoral goes down first so the body covers its root,
 * then the hull, then everything that sits ON the hull.
 */
function drawNera(r: Renderer, n: Nera): void {
  const k = clamp01(n.light);
  // What the water has taken. Everything on the hull is mixed toward the water
  // behind it by distance, which is the only reason a black animal on black
  // water reads as an animal at all rather than as a missing rectangle.
  //
  // The floor is LOW -- four percent -- because shot one needs this creature to
  // be a hole in the picture, and an earlier pass that started at eighteen let
  // enough teal through that the thing crossing the dark was plainly visible,
  // which threw away the recognition the shot was built to earn.
  const sink = (c: string): string => mix(WATER.deep, c, 0.04 + k ** 0.8 * 0.96);

  drawNeraFin(r, n, 0.235, -1, sink, 0.55);

  const NOSE = 0.05;
  const nose = Math.round(n.x + n.len * NOSE);
  for (let x = nose; x >= Math.round(n.x - n.len); x -= 1) {
    if (x < -3 || x > SCREEN_W + 3) continue;
    const s = (n.x - x) / n.len;
    if (s > 1) continue;
    const ss = Math.max(0, s);
    const cy = neraSpineY(n, ss);
    // Ahead of the snout, a rounded cap rather than a straight taper. A linear
    // one closed in three units and left a flat vertical face on the front of
    // the head, which is a bow, and a bow is a boat.
    let rad = s < 0
      ? n.len * 0.021 * Math.sqrt(Math.max(0, 1 - (s / -NOSE) ** 2))
      : neraSpineR(n, ss);
    if (rad <= 0.4) continue;
    rad = Math.max(1, rad);

    const top = Math.round(cy - rad);
    const bot = Math.round(cy + rad);
    if (bot < -3 || top > SCREEN_H + 3) continue;

    // FIVE BANDS AND THE RAMP RUNS ONE WAY: bright along the back, darkening
    // all the way to the belly. Same table as the climax, imported not copied.
    const h = Math.max(2, bot - top);
    let y = top;
    r.rect(x, y, 1, 1, sink(BODY.edge));
    y += 1;
    for (let b = 0; b < BODY_BANDS.length; b++) {
      const bh = b === BODY_BANDS.length - 1
        ? Math.max(1, top + h - 2 - y)
        : Math.max(1, Math.round(h * BODY_BANDS[b].share));
      r.rect(x, y, 1, bh, sink(BODY_BANDS[b].color));
      y += bh;
      if (y >= top + h - 1) break;
    }
    // One unit of bounce along the very bottom. In the climax this was light
    // off the pool; here it is the animal's own belly lamps, which is why it
    // survives being this deep when nothing else does.
    r.rect(x, bot - 1, 1, 1, mix(sink(BODY.back), GLOW_CALM, 0.10 * n.lamp));
  }

  drawNeraTail(r, n, sink);
  drawNeraFin(r, n, 0.19, 1, sink, 1);
  drawNeraRidge(r, n, sink);
  drawNeraCrown(r, n, sink);
  drawNeraHead(r, n, sink);
  drawNeraMarks(r, n);
  drawNeraEye(r, n, k);
}

/**
 * The ridge of small crests down the spine.
 *
 * Left out of the first pass, and leaving it out was most of why the animal
 * read as an AIRSHIP: a smooth unbroken back on a smooth unbroken tube is a
 * hull. It is a low ridge and not a row of spikes -- tall black spikes on this
 * creature read as teeth, which is exactly the wrong thing for it to look like.
 */
function drawNeraRidge(r: Renderer, n: Nera, sink: (c: string) => string): void {
  for (let i = 0; i < 15; i++) {
    const s = 0.16 + i * 0.052;
    if (s > 0.94) break;
    const x = Math.round(neraSpineX(n, s));
    if (x < -4 || x > SCREEN_W + 4) continue;
    const rad = neraSpineR(n, s);
    const y = Math.round(neraSpineY(n, s) - rad);
    const h = Math.max(1, Math.round(rad * 0.22));
    const w = Math.max(2, Math.round(n.len * 0.024));
    r.rect(x - w / 2, y - h, w, h + 1, sink(BODY.back));
    // Rim on every other crest only. Lit on all of them and spaced this close,
    // the ridge stopped being bumps and became one bright unbroken stripe down
    // the back -- a zip fastener, which is a thing on a bag.
    if (i % 2 === 0) r.rect(x - w / 2, y - h, w, 1, sink(BODY.rim));
  }
}

/**
 * The head: a jaw line and gill slits.
 *
 * One hard stroke under the head is what separates a head from a neck without
 * drawing a second silhouette, and four slits behind it are what say this
 * breathes water. Between them they are the difference between a wedge and a
 * face, and a wedge is what the first pass had.
 */
function drawNeraHead(r: Renderer, n: Nera, sink: (c: string) => string): void {
  const jaw = Math.round(n.len * 0.115);
  for (let i = 0; i < jaw; i++) {
    const s = i / n.len;
    const x = Math.round(n.x - i);
    if (x < -2 || x > SCREEN_W + 2) continue;
    const y = Math.round(neraSpineY(n, s) + neraSpineR(n, s) * 0.42);
    r.rect(x, y, 1, 1, sink(BODY.edge));
    if (i % 5 === 0) r.rect(x, y - 1, 1, 1, rgba(GLOW_CALM, 0.20 * n.lamp));
  }
  for (let i = 0; i < 4; i++) {
    const s = 0.078 + i * 0.014;
    const x = Math.round(neraSpineX(n, s));
    if (x < -2 || x > SCREEN_W + 2) continue;
    const cy = neraSpineY(n, s);
    const rad = neraSpineR(n, s);
    r.rect(x, Math.round(cy - rad * 0.12), 1, Math.max(2, Math.round(rad * 0.5)), sink(BODY.edge));
  }
}

/**
 * The manta-like pectoral.
 *
 * Two of them, and the far one is drawn first, darker, and sweeping the other
 * way. One fin on a creature this wide reads as a fault in the drawing; two,
 * with the far one dimmer, is what makes a flat column field look round.
 */
function drawNeraFin(
  r: Renderer, n: Nera, baseS: number, side: 1 | -1,
  sink: (c: string) => string, weight: number,
): void {
  const bx = neraSpineX(n, baseS);
  const by = neraSpineY(n, baseS);
  const rad = neraSpineR(n, baseS);
  const sweep = Math.round(n.len * 0.30);
  const beat = Math.sin(n.t * 0.021 + (side < 0 ? 1.1 : 0)) * n.len * 0.030;
  for (let i = 0; i < sweep; i++) {
    const k = i / sweep;
    const x = Math.round(bx - i * 0.95);
    if (x < -2 || x > SCREEN_W + 2) continue;
    const drop = side > 0
      ? by + rad * 0.55 + easeIn(k) * (n.len * 0.20 + beat)
      : by - rad * 0.35 - easeIn(k) * (n.len * 0.10 + beat * 0.6);
    const y = Math.round(drop);
    const h = Math.max(1, Math.round((1 - easeIn(k)) * n.len * 0.10));
    const dim = weight;
    r.rect(x, y, 1, h, mix(WATER.deep, sink(BODY.mid), dim));
    r.rect(x, y, 1, 1, mix(WATER.deep, sink(BODY.rim), dim * 0.85));
    r.rect(x, y + h - 1, 1, 1, mix(WATER.deep, sink(BODY.edge), dim));
  }
}

/**
 * The fluke.
 *
 * The climax never showed this: the tail ran off the left of the frame and out
 * of the room, which was the right call there and would be a cheat here, in a
 * shot whose whole subject is the animal ENTIRE. Two lobes, forked, and it
 * leads the swim wave rather than following it -- a tail that flicks a beat
 * after the body is a tail being dragged.
 */
function drawNeraTail(r: Renderer, n: Nera, sink: (c: string) => string): void {
  const rootX = neraSpineX(n, 1);
  const rootY = neraSpineY(n, 1);
  const span = n.len * 0.150;
  const lobe = n.len * 0.135;
  const flick = Math.sin(n.t * 0.019 - 3.1) * n.len * 0.035;
  for (let i = 0; i <= span; i++) {
    const u = i / span;
    const x = Math.round(rootX - i);
    if (x < -2 || x > SCREEN_W + 2) continue;
    // Each lobe opens away from the centre-line as it goes back, and both are
    // carried by the same flick, so the fork stays a fork.
    const spread = easeIn(u) * lobe;
    const drift = flick * u;
    const up = Math.round(rootY - spread + drift);
    const dn = Math.round(rootY + spread * 0.86 + drift);
    // The lobes are SOLID, and they were not in the first pass -- two one-unit
    // lines opening apart is a wire fork, and the animal appeared to trail off
    // into a pair of scratches. A fluke is a slab of muscle. It reads as one.
    const th = Math.max(2, Math.round(n.len * 0.042 * (1 - u * 0.35)));
    r.rect(x, up, 1, th, sink(BODY.mid));
    r.rect(x, up, 1, 1, sink(BODY.rim));
    r.rect(x, dn - th, 1, th, sink(BODY.mid));
    r.rect(x, dn - 1, 1, 1, sink(BODY.edge));
    // The web between the lobes, thinning out to nothing.
    if (u < 0.6) {
      r.rect(x, up + th, 1, Math.max(1, dn - up - th * 2), sink(BODY.back));
    }
  }
}

/**
 * The crown.
 *
 * Canon asks for crown-like growths round the head and they are what makes the
 * silhouette this animal from one frame -- which is exactly the job they have
 * to do here, twice: once on the creature, and once on the wall.
 */
function drawNeraCrown(r: Renderer, n: Nera, sink: (c: string) => string): void {
  for (let i = 0; i < 5; i++) {
    const s = 0.048 + i * 0.024;
    const x = Math.round(neraSpineX(n, s));
    const y = Math.round(neraSpineY(n, s) - neraSpineR(n, s)) + 1;
    if (x < -8 || x > SCREEN_W + 8) continue;
    // Longest in the middle of the five, which is what makes the group read as
    // a crown rather than as a fence.
    const len = Math.max(3, Math.round(n.len * (0.115 - Math.abs(i - 2) * 0.022)));
    const lean = n.len * (0.05 + i * 0.022);
    const base = Math.max(2, Math.round(n.len * 0.026));
    for (let k = 0; k <= len; k++) {
      const kk = k / len;
      // Thick at the root and tapering to a point, and curving back as it goes
      // -- a growth, not an aerial. Four one-unit lines was the first pass and
      // it put a radio mast on a whale.
      const bw = Math.max(1, Math.round(base * (1 - kk * 0.8)));
      const bx = Math.round(x - kk * kk * lean);
      r.rect(bx - bw / 2, y - k, bw, 1, sink(BODY.back));
      r.rect(bx - bw / 2, y - k, 1, 1, sink(BODY.rim));
    }
    // A lamp on every tip. On a silhouette these five points are often the only
    // thing on screen, and they are enough to name the animal.
    const tx = Math.round(x - lean);
    const ty = y - len;
    r.rect(tx - 2, ty - 2, 4, 4, rgba(GLOW_CALM, (0.10 + n.lamp * 0.22)));
    r.rect(tx - 1, ty - 1, 2, 2, rgba(GLOW_CALM, 0.35 + n.lamp * 0.55));
  }
}

/**
 * The markings, and they are the whole reason this creature can be filmed in
 * the dark at all.
 *
 * Two rows, offset half a step so the flank never reads as a grid, and OPAQUE:
 * the climax learned the hard way that drawing these translucently over a hull
 * this dark turns cyan into grey and the rows into portholes on a liner. They
 * are mixed out of a fixed lit blue instead, so the dimmest one is still
 * plainly a light.
 *
 * They breathe on ONE slow cycle with no stutter term in it. In the climax the
 * stutter was how you could see it was frightened. There is nothing to stutter
 * about now, and a player who watched that fight will feel the difference
 * without being able to say what changed.
 */
function drawNeraMarks(r: Renderer, n: Nera): void {
  // TWO UNITS, AND NEVER MORE, whatever size the animal is drawn at.
  //
  // The first pass sized these off the body's own radius, which meant that the
  // bigger the creature got the bigger its lamps got -- and at the size shot
  // one draws it that produced ten-unit dashes in two perfectly even rows.
  // That is a row of LIT WINDOWS ON A LINER. A spot on an animal is a spot at
  // any distance; it is the SPACING that changes, not the spot.
  const w = 2;
  for (let i = 0; i < 13; i++) {
    const s = 0.10 + i * 0.064;
    if (s > 0.94) break;
    // Every lamp on its own phase and its own ceiling. A row that pulses in
    // unison at one brightness is instrumentation.
    const pulse = 0.62 + 0.38 * Math.sin(n.t * 0.028 - i * 0.72);
    const ceil = 0.68 + hash(i * 13) * 0.32;
    const a = clamp01(pulse * ceil * n.lamp);
    if (a <= 0.06) continue;
    for (const [off, slide] of [[-0.52, 0], [0.44, 0.030]] as const) {
      const mx = Math.round(neraSpineX(n, s + slide));
      if (mx < -3 || mx > SCREEN_W + 3) continue;
      const rad = neraSpineR(n, s + slide);
      if (rad < 2) continue;
      const my = Math.round(neraSpineY(n, s + slide) + rad * off);
      // Opaque, and mixed out of a fixed lit blue rather than out of the hull:
      // drawn translucently over a body this dark, cyan turns grey.
      const lit = mix('#2f7ea0', GLOW_CALM, a);
      r.rect(mx - w, my - 1, w * 2, 3, rgba(GLOW_CALM, a * 0.16));
      r.rect(mx - 1, my, w, 1, lit);
    }
  }
}

/**
 * The eye, and it is half-lidded the whole way through this film.
 *
 * In the climax the aperture was the readout: wide with pale showing all the
 * way round a small hard pupil is panic in any species, and the last thing that
 * happened in that fight was the lid coming down to a level line. It has stayed
 * down. Nothing in this scene ever opens it.
 */
/** The hull's darkest colour at this animal's distance. */
function sinkEdge(n: Nera): string {
  return mix(WATER.deep, BODY.edge, 0.04 + clamp01(n.light) ** 0.8 * 0.96);
}

function drawNeraEye(r: Renderer, n: Nera, k: number): void {
  const ex = Math.round(neraSpineX(n, 0.048));
  const ey = Math.round(neraSpineY(n, 0.048) - neraSpineR(n, 0.048) * 0.28);
  if (ex < -6 || ex > SCREEN_W + 6) return;
  // CAPPED AT THREE UNITS. Scaled off the body, this became a lit rectangle the
  // size of a windscreen the moment the animal was drawn large, and a
  // windscreen is the single fastest way to turn a leviathan into a vehicle.
  const w = Math.min(3, Math.max(1, Math.round(n.len * 0.02)));
  // Scaled hard by distance. In the first shot this creature is meant to be a
  // hole in the water, and a fixed-brightness eye put one lit rectangle on an
  // otherwise perfect silhouette -- which is where the eye goes on a boat.
  const white = mix(WATER.deep, '#a8ecd8', 0.12 + k * 0.80);
  // A lens, built as rows, because the difference between a calm eye and a
  // frightened one is entirely in the shape of the opening -- and this one has
  // been half-lidded since the last frame of the climax.
  // The socket is the body's own edge colour, not black: a hard black patch on
  // a lit flank is a porthole, and this animal has spent two files trying not
  // to have any of those.
  r.rect(ex - w - 1, ey - 2, w * 2 + 2, 4, sinkEdge(n));
  for (let dy = 0; dy <= 1; dy++) {
    const ww = Math.max(1, w - dy);
    r.rect(ex - ww, ey - 1 + dy, ww * 2, 1, white);
  }
  r.rect(ex - 1, ey - 1, Math.max(1, w - 1), 2, mix('#3f9c8a', '#03080e', 0.55));
  // The brow: one hard unit over the top. Without it a half-lidded eye reads
  // as a sleepy one rather than an easy one.
  r.rect(ex - w - 1, ey - 3, w * 2 + 2, 1, sinkEdge(n));
}

/* ===================================================================== *
 *  THE CARVINGS
 *
 *  A carving is a set of POLYLINES in a 0..1 box, and it is drawn twice: once
 *  as a groove cut into stone, and once as a light running through that groove.
 *  Both passes walk the same path in the same order, which is what lets the
 *  light travel ALONG the cut -- the way water finds a channel -- rather than
 *  fading up all at once like a switch being thrown.
 *
 *  Five of them. One is unmistakably Neravoss. The rest are deliberately not
 *  anything: no player has met a coiled thing, a winged thing, a six-limbed
 *  thing or an antlered thing, and they are not going to in this game.
 * ===================================================================== */

type Pt = readonly [number, number];

interface Stroke {
  readonly pts: readonly Pt[];
  /** A main outline gets a 2-unit channel; detail gets 1. */
  readonly deep?: boolean;
}

interface Carving {
  readonly id: string;
  readonly strokes: readonly Stroke[];
}

/** Mirror a polyline about the panel's centre-line. */
function mirror(pts: readonly Pt[]): Pt[] {
  return pts.map(([x, y]) => [1 - x, y] as Pt);
}

/** A spiral, because a spiral is exactly what a loop is good at and a hand-authored one wobbles. */
function coilPts(turns: number, from: number, to: number): Pt[] {
  const out: Pt[] = [];
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const ang = u * Math.PI * 2 * turns;
    const rad = from + (to - from) * u;
    out.push([0.5 + Math.cos(ang) * rad * 0.94, 0.5 + Math.sin(ang) * rad]);
  }
  return out;
}

/**
 * NERAVOSS, in relief. Head to the right, exactly as the animal swims.
 *
 * Authored against the rig above rather than by eye: the top and bottom curves
 * follow `neraSpineR`, the crown is five growths leaning back, the pectoral
 * sweeps down and away, and the tail forks. If any of those is wrong the whole
 * scene fails, because this is the shape the player has to pick out of a wall.
 */
const CARVE_NERAVOSS: Carving = {
  id: 'neravoss',
  strokes: [
    // THE OUTLINE, SOLVED RATHER THAN EYEBALLED.
    //
    // Every point on it is `neraSpineR` sampled at that position along the body
    // and scaled into the panel, with one deliberate exaggeration: the
    // thickness is a quarter over, because a carver cutting an animal into
    // stone at this size exaggerates the thing that makes it recognisable and
    // an honest ribbon fourteen units tall is not readable at four feet.
    //
    // The first pass of this was drawn by hand and was thickest at the MIDDLE,
    // which is a fish. This is thickest just behind the jaw, which is what the
    // animal actually is.
    {
      deep: true,
      pts: [
        [0.955, 0.469], [0.928, 0.399], [0.905, 0.391], [0.858, 0.365],
        [0.809, 0.376], [0.682, 0.379], [0.500, 0.395], [0.318, 0.424],
        [0.182, 0.455], [0.091, 0.479], [0.045, 0.491],
        [0.045, 0.509], [0.091, 0.521], [0.182, 0.545], [0.318, 0.576],
        [0.500, 0.605], [0.682, 0.621], [0.809, 0.624], [0.858, 0.635],
        [0.905, 0.609], [0.928, 0.601], [0.955, 0.531], [0.955, 0.469],
      ],
    },
    // The fluke: out to the upper lobe, back to the root, out to the lower.
    {
      deep: true,
      pts: [
        [0.062, 0.494], [0.006, 0.336], [0.070, 0.480],
        [0.070, 0.520], [0.010, 0.700], [0.062, 0.506],
      ],
    },
    // THE CROWN. Five growths, each one rooted on the back where the animal's
    // own is, curving back as it rises, longest in the middle of the five. It
    // is the single feature that names this creature from one frame, and the
    // first pass had it as four straight rays half the length of the body,
    // which read as speed lines on a dolphin.
    { deep: true, pts: [[0.911, 0.391], [0.900, 0.336], [0.865, 0.281]] },
    { deep: true, pts: [[0.889, 0.383], [0.873, 0.311], [0.824, 0.239]] },
    { deep: true, pts: [[0.867, 0.371], [0.846, 0.282], [0.782, 0.193]] },
    { deep: true, pts: [[0.845, 0.366], [0.819, 0.294], [0.739, 0.222]] },
    { deep: true, pts: [[0.824, 0.368], [0.793, 0.313], [0.698, 0.258]] },
    // The pectoral, rooted behind the jaw and swept down and back.
    { deep: true, pts: [[0.782, 0.623], [0.640, 0.760], [0.530, 0.862], [0.628, 0.652]] },
    // THE TWO ROWS OF LAMPS, as drilled marks. The brightest thing on the
    // living animal is these; putting them on the wall in the same two rows,
    // at the same offsets off the spine, is what makes the pair rhyme at a
    // glance rather than on inspection.
    { pts: [[0.800, 0.416], [0.760, 0.415]] },
    { pts: [[0.700, 0.416], [0.660, 0.418]] },
    { pts: [[0.600, 0.424], [0.560, 0.428]] },
    { pts: [[0.500, 0.434], [0.462, 0.440]] },
    { pts: [[0.400, 0.450], [0.364, 0.456]] },
    { pts: [[0.300, 0.468], [0.268, 0.474]] },
    { pts: [[0.200, 0.484], [0.172, 0.489]] },
    { pts: [[0.786, 0.584], [0.746, 0.583]] },
    { pts: [[0.686, 0.582], [0.646, 0.580]] },
    { pts: [[0.586, 0.576], [0.548, 0.572]] },
    { pts: [[0.486, 0.566], [0.450, 0.560]] },
    { pts: [[0.386, 0.550], [0.352, 0.544]] },
    { pts: [[0.286, 0.532], [0.256, 0.526]] },
    // Gills.
    { pts: [[0.876, 0.418], [0.872, 0.520]] },
    { pts: [[0.898, 0.422], [0.894, 0.516]] },
    // The eye.
    { pts: [[0.916, 0.452], [0.928, 0.442], [0.940, 0.452], [0.928, 0.462], [0.916, 0.452]] },
  ],
};

/**
 * THE WINGED ONE. This is the carving that wakes.
 *
 * It is next to Neravoss on the wall and it is as unlike Neravoss as a
 * silhouette can be: everything in the sea creature is horizontal and tapering,
 * everything in this one is vertical and spread. Sea, and sky. Put those two
 * shapes side by side and the player does the arithmetic in the second it takes
 * -- and that arithmetic is the whole point of the scene.
 */
const WING_L: Pt[] = [
  [0.462, 0.372], [0.352, 0.244], [0.196, 0.176], [0.052, 0.238],
  [0.104, 0.322], [0.028, 0.386], [0.132, 0.412], [0.076, 0.512],
  [0.198, 0.464], [0.184, 0.566], [0.296, 0.470], [0.404, 0.452], [0.462, 0.404],
];

const CARVE_WINGED: Carving = {
  id: 'winged',
  strokes: [
    // Body: a narrow spindle, head up.
    {
      deep: true,
      pts: [
        [0.500, 0.252], [0.548, 0.360], [0.548, 0.524], [0.508, 0.684],
        [0.492, 0.684], [0.452, 0.524], [0.452, 0.360], [0.500, 0.252],
      ],
    },
    { deep: true, pts: WING_L },
    { deep: true, pts: mirror(WING_L) },
    // A three-pointed crest, which is what stops the head reading as a beak.
    {
      deep: true,
      pts: [
        [0.500, 0.252], [0.428, 0.130], [0.474, 0.204],
        [0.500, 0.086], [0.526, 0.204], [0.572, 0.130], [0.500, 0.252],
      ],
    },
    // Tail, forked, with two long streamers behind it.
    { deep: true, pts: [[0.500, 0.684], [0.452, 0.822], [0.500, 0.760], [0.548, 0.822], [0.500, 0.684]] },
    { pts: [[0.482, 0.762], [0.446, 0.884], [0.462, 0.958]] },
    { pts: [[0.518, 0.762], [0.554, 0.884], [0.538, 0.958]] },
    // Eyes.
    { pts: [[0.474, 0.222], [0.482, 0.214], [0.490, 0.222], [0.482, 0.230], [0.474, 0.222]] },
    { pts: [[0.510, 0.222], [0.518, 0.214], [0.526, 0.222], [0.518, 0.230], [0.510, 0.222]] },
  ],
};

/** THE COILED ONE. Three turns and a horned head at the outer end. */
const CARVE_COILED: Carving = {
  id: 'coiled',
  strokes: [
    { deep: true, pts: coilPts(2.55, 0.055, 0.415) },
    { deep: true, pts: coilPts(2.55, 0.105, 0.470).slice(6) },
    // The head, where the outer turn runs out.
    { deep: true, pts: [[0.058, 0.470], [0.010, 0.560], [0.062, 0.640], [0.150, 0.612], [0.148, 0.512], [0.058, 0.470]] },
    { pts: [[0.086, 0.474], [0.052, 0.336]] },
    { pts: [[0.128, 0.492], [0.132, 0.348]] },
    { pts: [[0.062, 0.556], [0.078, 0.560], [0.070, 0.570]] },
  ],
};

/** THE SIX-LIMBED ONE. A mountain with tusks. Heaviest silhouette on the wall. */
const CARVE_BULWARK: Carving = {
  id: 'bulwark',
  strokes: [
    {
      deep: true,
      pts: [
        [0.104, 0.606], [0.164, 0.424], [0.300, 0.330], [0.520, 0.300],
        [0.700, 0.342], [0.822, 0.442], [0.884, 0.560], [0.944, 0.622],
        [0.918, 0.726], [0.798, 0.756], [0.716, 0.664], [0.700, 0.746],
        [0.450, 0.786], [0.220, 0.746], [0.104, 0.606],
      ],
    },
    { deep: true, pts: [[0.898, 0.702], [0.986, 0.808]] },
    { deep: true, pts: [[0.818, 0.744], [0.856, 0.868]] },
    // Six limbs: four planted, two forelimbs braced forward.
    { deep: true, pts: [[0.196, 0.740], [0.168, 0.926]] },
    { deep: true, pts: [[0.336, 0.774], [0.322, 0.944]] },
    { deep: true, pts: [[0.492, 0.786], [0.496, 0.952]] },
    { deep: true, pts: [[0.620, 0.772], [0.634, 0.940]] },
    { deep: true, pts: [[0.712, 0.640], [0.860, 0.908]] },
    { deep: true, pts: [[0.664, 0.664], [0.744, 0.928]] },
    // Plates along the back.
    { pts: [[0.272, 0.362], [0.330, 0.274]] },
    { pts: [[0.454, 0.318], [0.492, 0.228]] },
    { pts: [[0.634, 0.348], [0.658, 0.258]] },
    // A stub of tail.
    { pts: [[0.104, 0.606], [0.026, 0.512], [0.062, 0.400]] },
  ],
};

/** THE ANTLERED ONE. A colossal stag, and the only carving that is standing still. */
const CARVE_ANTLERED: Carving = {
  id: 'antlered',
  strokes: [
    {
      deep: true,
      pts: [
        [0.236, 0.664], [0.340, 0.578], [0.556, 0.566], [0.702, 0.618],
        [0.796, 0.500], [0.892, 0.436], [0.954, 0.500], [0.882, 0.572],
        [0.780, 0.604], [0.722, 0.724], [0.550, 0.762], [0.320, 0.750], [0.236, 0.664],
      ],
    },
    { deep: true, pts: [[0.884, 0.440], [0.796, 0.278], [0.658, 0.198]] },
    { deep: true, pts: [[0.802, 0.286], [0.778, 0.138]] },
    { pts: [[0.722, 0.240], [0.598, 0.122]] },
    { deep: true, pts: [[0.888, 0.440], [0.944, 0.262], [0.988, 0.118]] },
    { deep: true, pts: [[0.940, 0.268], [0.858, 0.158]] },
    { deep: true, pts: [[0.360, 0.750], [0.340, 0.944]] },
    { deep: true, pts: [[0.462, 0.762], [0.470, 0.952]] },
    { deep: true, pts: [[0.600, 0.760], [0.622, 0.944]] },
    { deep: true, pts: [[0.686, 0.730], [0.712, 0.930]] },
    { pts: [[0.236, 0.664], [0.140, 0.722], [0.100, 0.848]] },
  ],
};

/**
 * The wall, left to right.
 *
 * Neravoss is third and the winged one is fourth, which puts them adjacent --
 * that pairing is the last shot, so it is authored here rather than found by
 * the camera. The two on the outside are there to be half-seen and gone.
 */
const WALL: readonly Carving[] = [
  CARVE_COILED, CARVE_BULWARK, CARVE_NERAVOSS, CARVE_WINGED, CARVE_ANTLERED,
];

/** Index into WALL. Both are load-bearing for the camera and the light. */
const PANEL_NERAVOSS = 2;
const PANEL_WAKES = 3;

/* ---------------------------------------------------------------------- */

/**
 * Walk a carving's paths, handing every unit of groove to `emit` along with how
 * far along the whole carving it is.
 *
 * Both passes go through here, in the same order, so "how far along" means the
 * same thing to the stone and to the light.
 */
function walkCarving(
  c: Carving,
  x0: number, y0: number, w: number, h: number,
  emit: (px: number, py: number, deep: boolean, u: number) => void,
): void {
  // Total path length first, in screen units, so `u` is distance and not
  // segment count -- a light that crosses a short stroke at the same rate as a
  // long one is a light travelling at a different speed in every limb.
  let total = 0;
  const lens: number[][] = [];
  for (const st of c.strokes) {
    const seg: number[] = [];
    for (let i = 1; i < st.pts.length; i++) {
      const dx = (st.pts[i][0] - st.pts[i - 1][0]) * w;
      const dy = (st.pts[i][1] - st.pts[i - 1][1]) * h;
      const d = Math.hypot(dx, dy);
      seg.push(d);
      total += d;
    }
    lens.push(seg);
  }
  if (total <= 0) return;

  let walked = 0;
  for (let s = 0; s < c.strokes.length; s++) {
    const st = c.strokes[s];
    for (let i = 1; i < st.pts.length; i++) {
      const d = lens[s][i - 1];
      const steps = Math.max(1, Math.round(d));
      const ax = x0 + st.pts[i - 1][0] * w;
      const ay = y0 + st.pts[i - 1][1] * h;
      const bx = x0 + st.pts[i][0] * w;
      const by = y0 + st.pts[i][1] * h;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        emit(
          Math.round(ax + (bx - ax) * t),
          Math.round(ay + (by - ay) * t),
          !!st.deep,
          (walked + d * t) / total,
        );
      }
      walked += d;
    }
  }
}

/**
 * The stone pass: the groove itself.
 *
 * An incised line is not a dark line. Light in this room comes from above, so
 * the UPPER lip of a cut is in shadow and the LOWER lip catches -- and it is
 * that one lit unit underneath that turns a scratch into something with a depth
 * to it. Drawn without it the whole wall reads as ink on a flat panel.
 *
 * `wash` is a moving light source in screen units: the animal, when it is close
 * enough to be lighting this. See the note on shot four.
 */
function drawCarvingStone(
  r: Renderer, c: Carving,
  x0: number, y0: number, w: number, h: number,
  wash: { x: number; y: number; power: number } | null,
): void {
  const live = !!wash && wash.power > 0.01;
  // With no light on this panel the three colours are constant for the whole
  // carving, so they are resolved once instead of a few hundred times.
  const flatCut: string = STONE.cut;
  const flatLip: string = STONE.lit;
  const flatTop: string = STONE.shade;
  walkCarving(c, x0, y0, w, h, (px, py, deep) => {
    if (px < -2 || px > SCREEN_W + 2 || py < -2 || py > SCREEN_H + 2) return;
    let cut = flatCut;
    let lip = flatLip;
    let topC = flatTop;
    if (live) {
      const d = Math.hypot(px - wash!.x, (py - wash!.y) * 0.55);
      const lift = wash!.power * Math.max(0, 1 - d / 120) ** 2;
      if (lift > 0.02) {
        cut = mix(STONE.cut, '#0f2a3a', lift * 0.55);
        lip = mix(STONE.lit, GLOW_CALM, lift * 0.5);
        topC = mix(STONE.shade, '#20455a', lift * 0.4);
      }
    }
    const depth = deep ? 2 : 1;
    r.rect(px, py, 1, depth, cut);
    r.rect(px, py + depth, 1, 1, lip);
    r.rect(px, py - 1, 1, 1, topC);
  });
}

/**
 * The light pass.
 *
 * `prog` is how far the light has run, 0..1. Everything behind the head is lit;
 * the head itself is hot and white; and there is nothing at all in front of it.
 * That is the difference between a carving WAKING and a carving being switched
 * on, and it is the last frame of the game.
 */
function drawCarvingWake(
  r: Renderer, c: Carving,
  x0: number, y0: number, w: number, h: number,
  prog: number, bloom: number, t: number,
): void {
  if (prog <= 0) return;
  walkCarving(c, x0, y0, w, h, (px, py, deep, u) => {
    if (u > prog) return;
    if (px < -3 || px > SCREEN_W + 3 || py < -3 || py > SCREEN_H + 3) return;
    // Behind the head the light settles back to a steady burn, breathing very
    // slightly -- it is old, and it has just been woken, not switched on.
    const age = clamp01((prog - u) * 5);
    const breathe = 0.86 + 0.14 * Math.sin(t * 0.035 - u * 5);
    const head = clamp01(1 - (prog - u) * 12);
    const a = clamp01((0.30 + age * 0.55) * breathe + head * 0.45) * bloom;
    if (a < 0.03) return;
    const depth = deep ? 2 : 1;
    // Halo first, so the channel core is drawn over its own spill. Two rings of
    // it: a wide soft one and a tight bright one. A groove with a single unit
    // of spill round it is a line drawn on a wall; light coming OUT of a hole
    // in stone has an edge you cannot find.
    r.rect(px - 2, py - 2, 5, depth + 4, rgba(WAKE.halo, a * 0.10));
    r.rect(px - 1, py - 1, 3, depth + 2, rgba(WAKE.halo, a * 0.22));
    r.rect(px, py, 1, depth, rgba(mix(WAKE.body, WAKE.core, head * 0.8), a));
    if (head > 0.4) r.rect(px, py, 1, 1, rgba(WAKE.core, head * bloom));
  });
}

/* ===================================================================== *
 *  THE WALL, AND THE ROOM IT IS IN
 * ===================================================================== */

/**
 * The carved wall, in wall space, with the camera at `camX`.
 *
 * Panels sit in bays between fluted pilasters and the wall runs out of BOTH
 * ends of the frame. That is not decoration -- it is the sentence. The player
 * has to leave believing the wall goes on, so the ends of it are never in shot,
 * and the two bays past either end of the authored five are drawn eroded past
 * reading, which says the same thing again in a different way.
 */
function drawWall(
  r: Renderer, camX: number, t: number,
  wash: { x: number; y: number; power: number } | null,
  wake: { panel: number; prog: number; bloom: number } | null,
): void {
  const sx = (wx: number): number => wx - camX + SCREEN_W / 2;

  // The face itself, and the courses it was built in.
  r.rect(0, WALL_TOP - 12, SCREEN_W, FLOOR_Y - WALL_TOP + 14, STONE.face);
  r.rect(0, WALL_TOP - 12, SCREEN_W, 2, STONE.lit);
  r.rect(0, WALL_TOP - 10, SCREEN_W, 2, STONE.shade);
  for (let cy = WALL_TOP - 4; cy < FLOOR_Y; cy += 13) {
    r.rect(0, cy, SCREEN_W, 1, STONE.shade);
    r.rect(0, cy + 1, SCREEN_W, 1, mix(STONE.face, STONE.lit, 0.35));
  }
  // Vertical joints, on the wall's own grid so they scroll with it.
  const jointFrom = Math.floor((camX - SCREEN_W) / 29) - 1;
  for (let j = jointFrom; j < jointFrom + Math.ceil(SCREEN_W / 29) + 4; j++) {
    const x = sx(j * 29 + (j % 2 ? 14 : 0));
    if (x < -2 || x > SCREEN_W + 2) continue;
    r.rect(x, WALL_TOP - 4, 1, FLOOR_Y - WALL_TOP + 4, rgba(STONE.shade, 0.55));
  }

  // Bays. Two either side of the authored five, so the wall never ends.
  const first = Math.floor((camX - SCREEN_W) / BAY) - 1;
  const last = Math.ceil((camX + SCREEN_W) / BAY) + 1;
  for (let b = first; b <= last; b++) {
    const bx = sx(b * BAY);
    if (bx > SCREEN_W + 8 || bx + PANEL_W + PIER_W < -8) continue;

    // The panel is recessed: a sunk field with a lit sill under it.
    r.rect(bx, WALL_TOP, PANEL_W, PANEL_H, STONE.shade);
    r.rect(bx, WALL_TOP, PANEL_W, 1, STONE.cut);
    r.rect(bx, WALL_TOP + PANEL_H - 1, PANEL_W, 1, mix(STONE.lit, STONE.face, 0.3));
    for (let i = 0; i < 5; i++) {
      const y = WALL_TOP + 6 + i * 15;
      r.rect(bx + 1, y, PANEL_W - 2, 1, rgba(STONE.cut, 0.16));
    }

    // THE WASH, ON THE FIELD.
    //
    // Mixing the animal's light into the grooves alone was not enough to see:
    // a groove is a unit wide and the eye reads a panel, not a line. So the
    // FIELD is lit too, in bands, before anything is cut into it -- which is
    // what a lamp a few metres off a flat stone actually does, and what makes
    // one panel out of five plainly the one being looked at.
    if (wash && wash.power > 0.02) {
      // The vertical term is COMPRESSED, not stretched. The animal swims about
      // forty units below the middle of the panels, and weighting the vertical
      // distance UP -- which the first pass did -- meant the falloff had eaten
      // the whole effect before it reached the carving it was meant to light.
      for (let y = WALL_TOP + 1; y < WALL_TOP + PANEL_H - 1; y += 3) {
        for (let x = Math.max(0, Math.round(bx)); x < Math.min(SCREEN_W, bx + PANEL_W); x += 4) {
          const d = Math.hypot(x + 2 - wash.x, (y - wash.y) * 0.55);
          const lift = wash.power * Math.max(0, 1 - d / 120) ** 2;
          if (lift < 0.02) continue;
          r.rect(x, y, 4, 3, rgba('#4fa2c4', lift * 0.50));
        }
      }
    }

    const c = WALL[b];
    if (c) {
      const lit = wake && wake.panel === b ? wake : null;
      drawCarvingStone(r, c, bx + PANEL_W * 0.03, WALL_TOP + PANEL_H * 0.04,
        PANEL_W * 0.94, PANEL_H * 0.92, wash);
      if (lit) {
        drawCarvingWake(r, c, bx + PANEL_W * 0.03, WALL_TOP + PANEL_H * 0.04,
          PANEL_W * 0.94, PANEL_H * 0.92, lit.prog, lit.bloom, t);
      }
    } else {
      // Past the five: a panel eroded past reading. Enough marks left to be
      // obviously a carving, not enough to be any particular one.
      drawEroded(r, b, bx);
    }

    // The pilaster, fluted, between this bay and the next.
    const px = bx + PANEL_W;
    for (let i = 0; i < PIER_W; i++) {
      const x = px + i;
      if (x < -1 || x > SCREEN_W) continue;
      const k = Math.abs(i - (PIER_W - 1) / 2) / ((PIER_W - 1) / 2);
      const col = mix(STONE.lit, STONE.shade, k * 0.85);
      r.rect(x, WALL_TOP - 12, 1, PANEL_H + 20, col);
      if (i === 3 || i === 7 || i === 11) {
        r.rect(x, WALL_TOP - 6, 1, PANEL_H + 12, rgba(STONE.cut, 0.5));
      }
    }
    r.rect(px - 1, WALL_TOP - 14, PIER_W + 2, 3, STONE.lit);
    r.rect(px - 1, WALL_TOP - 11, PIER_W + 2, 1, STONE.shade);
  }

  // THE LIGHT ON THE ROOM.
  //
  // Drawn after every bay and before the frieze, so it lands on stone rather
  // than on water: a carving that lights up lights the wall it is cut into,
  // the pier beside it, and -- this is the one that matters -- the EDGES OF
  // NERAVOSS' OWN RELIEF next door. Without this the glow was a gold outline
  // sitting on a dark wall like a sticker, and the two carvings were plainly
  // not in the same room as one another.
  if (wake && wake.bloom > 0.02) {
    const gx = panelCentre(wake.panel) - camX + SCREEN_W / 2;
    const gy = WALL_TOP + PANEL_H * 0.5;
    for (let y = WALL_TOP - 14; y < FLOOR_Y; y += 4) {
      for (let x = 0; x < SCREEN_W; x += 6) {
        const d = Math.hypot(x + 3 - gx, (y - gy) * 0.9);
        const lift = wake.bloom * Math.max(0, 1 - d / 165) ** 2;
        if (lift < 0.015) continue;
        r.rect(x, y, 6, 4, rgba(WAKE.halo, lift * 0.34));
      }
    }
  }

  drawFrieze(r, camX, sx);

  // Silt banked against the foot of it, and the dark it comes out of.
  r.rect(0, FLOOR_Y, SCREEN_W, SCREEN_H - FLOOR_Y, STONE.silt);
  for (let x = 0; x < SCREEN_W; x++) {
    const wx = x + camX;
    const drift = Math.round(Math.sin(wx * 0.05) * 2 + Math.sin(wx * 0.017) * 3);
    r.rect(x, FLOOR_Y + drift, 1, 2, mix(STONE.silt, STONE.lit, 0.25));
    r.rect(x, FLOOR_Y + drift + 2, 1, SCREEN_H - FLOOR_Y, mix(WATER.deep, STONE.silt, 0.55));
  }
  r.rect(0, SCREEN_H - 6, SCREEN_W, 6, WATER.black);
}

/**
 * THE FRIEZE, and it is the cheapest thing in this file and does the most work.
 *
 * A row of carved human figures a few units high runs the whole length of the
 * wall under the panels. Nothing else on screen has a known size; the moment
 * there are PEOPLE in the picture, every creature above them acquires one. That
 * is the entire reason canon's word "enormous" survives the trip to a 240-unit
 * screen. They also say who cut this: the Aurelians lived alongside these
 * things, and the figures have their arms up.
 */
function drawFrieze(r: Renderer, camX: number, sx: (wx: number) => number): void {
  // Ten units apart and nine tall. The first pass had them at seven and five,
  // which on a 240-unit screen is smaller than the font -- the band read as a
  // dotted line, and a dotted line does not tell anybody how big a whale is.
  const PITCH = 10;
  const from = Math.floor((camX - SCREEN_W) / PITCH) - 1;
  const to = Math.ceil((camX + SCREEN_W) / PITCH) + 1;
  const dark = STONE.cut;
  const lip = mix(STONE.lit, STONE.face, 0.35);
  r.rect(0, FRIEZE_Y - 2, SCREEN_W, 1, STONE.cut);
  r.rect(0, FRIEZE_Y - 1, SCREEN_W, 1, mix(STONE.shade, STONE.face, 0.5));
  r.rect(0, FRIEZE_Y + 10, SCREEN_W, 1, STONE.cut);
  r.rect(0, FRIEZE_Y + 11, SCREEN_W, 1, lip);
  for (let i = from; i <= to; i++) {
    const x = Math.round(sx(i * PITCH + 2));
    if (x < -6 || x > SCREEN_W + 6) continue;
    // Every third has both arms up. A whole row of identical figures reads as a
    // fence; a row with a rhythm in it reads as a procession.
    const up = i % 3 === 0;
    const y = FRIEZE_Y + 1;
    r.rect(x + 2, y, 2, 2, dark);            // head
    r.rect(x + 2, y + 2, 2, 4, dark);        // body
    r.rect(x + 1, y + 6, 1, 3, dark);        // legs
    r.rect(x + 4, y + 6, 1, 3, dark);
    if (up) {
      r.rect(x, y, 1, 3, dark);
      r.rect(x + 5, y, 1, 3, dark);
      r.rect(x + 1, y + 2, 1, 1, dark);
      r.rect(x + 4, y + 2, 1, 1, dark);
    } else {
      r.rect(x, y + 3, 2, 1, dark);
      r.rect(x + 4, y + 3, 2, 1, dark);
    }
    // A lit unit down one side of every figure. Without it they are holes in a
    // band rather than things standing in front of one.
    r.rect(x + 4, y + 2, 1, 4, lip);
    r.rect(x + 3, y, 1, 1, lip);
  }

  // A course of Aurelian script under the procession.
  //
  // Not decoration and not filler, though it does fill a stretch of blank wall
  // that the last shot otherwise sat over for four seconds. It is the sentence
  // the frieze is already making, said again: this is a RECORD. Somebody wrote
  // down what these things were, at length, in a language nobody in the game
  // can read, and then the sea took the building.
  // FAINT, and set well above the animal's swim line.
  //
  // The first pass had it at full contrast directly behind the creature, and
  // the effect was immediate: for the two seconds of the shot that the whole
  // scene is built around, the animal was reading against a busy dark texture
  // instead of against plain stone. Anything in the strip of wall the animal
  // crosses is competing with the only thing the player has to look at.
  const gy = FRIEZE_Y + 14;
  const ink = rgba(STONE.cut, 0.45);
  const from2 = Math.floor((camX - SCREEN_W) / 5) - 1;
  const to2 = Math.ceil((camX + SCREEN_W) / 5) + 1;
  r.rect(0, gy - 3, SCREEN_W, 1, rgba(STONE.cut, 0.35));
  r.rect(0, gy + 8, SCREEN_W, 1, rgba(STONE.cut, 0.35));
  r.rect(0, gy + 9, SCREEN_W, 1, rgba(STONE.lit, 0.18));
  for (let i = from2; i <= to2; i++) {
    const x = Math.round(sx(i * 5));
    if (x < -3 || x > SCREEN_W + 3) continue;
    const g = hash(i * 31);
    // Three glyph shapes on a rota, and every eleventh column left blank --
    // word breaks, which is what makes a band of marks read as writing rather
    // than as a chain.
    if (i % 11 === 7) continue;
    for (const row of [0, 4]) {
      const yy = gy + row;
      if (g < 0.34) {
        r.rect(x, yy, 3, 1, ink);
        r.rect(x + 1, yy + 1, 1, 2, ink);
      } else if (g < 0.67) {
        r.rect(x, yy, 1, 3, ink);
        r.rect(x + 2, yy, 1, 3, ink);
        r.rect(x, yy + 1, 3, 1, ink);
      } else {
        r.rect(x, yy + 2, 3, 1, ink);
        r.rect(x + 2, yy, 1, 2, ink);
      }
      r.rect(x, yy + 3, 3, 1, rgba(STONE.lit, 0.14));
    }
  }
}

/** A bay past the authored five, worn down to marks. */
function drawEroded(r: Renderer, bay: number, bx: number): void {
  const seed = bay * 37;
  for (let i = 0; i < 26; i++) {
    const a = hash(seed + i) * Math.PI * 2;
    const rad = 0.12 + hash(seed + i + 40) * 0.34;
    const x = Math.round(bx + PANEL_W * (0.5 + Math.cos(a) * rad));
    const y = Math.round(WALL_TOP + PANEL_H * (0.5 + Math.sin(a) * rad * 0.9));
    const len = 2 + Math.round(hash(seed + i + 80) * 9);
    const vert = hash(seed + i + 120) > 0.55;
    if (x < -4 || x > SCREEN_W + 4) continue;
    if (vert) {
      r.rect(x, y, 1, len, STONE.cut);
      r.rect(x + 1, y, 1, len, mix(STONE.lit, STONE.face, 0.5));
    } else {
      r.rect(x, y, len, 1, STONE.cut);
      r.rect(x, y + 1, len, 1, mix(STONE.lit, STONE.face, 0.5));
    }
  }
}

/* ===================================================================== *
 *  WATER FURNITURE
 *
 *  Shared between every shot, because the thing that makes four separate
 *  drawings feel like one place is that the same dust is falling through all
 *  of them at the same rate.
 * ===================================================================== */

/**
 * Marine snow at two depths.
 *
 * `rise` is how fast it goes UP the frame, which is the only thing in shot one
 * saying the camera is going down. The near grains streak; the far ones barely
 * shift. Nothing else in the picture is available to say it.
 */
function snow(r: Renderer, t: number, rise: number, count = 46, drift = 0): void {
  for (let i = 0; i < count; i++) {
    const near = i >= count - 14;
    const sp = near ? 0.55 + hash(i) * 0.5 : 0.10 + hash(i) * 0.16;
    const y = wrap(hash(i + 44) * SCREEN_H - t * sp * rise, SCREEN_H, 10);
    const x = wrap(hash(i + 96) * SCREEN_W + Math.sin(t * 0.02 + i) * 3 - t * drift * (near ? 1 : 0.35),
      SCREEN_W, 8);
    const s = near ? 2 : 1;
    r.rect(x, y, s, s, near ? 'rgba(206,236,255,0.22)' : 'rgba(160,200,226,0.11)');
  }
}

/** The graded column of water everything else is drawn into. */
function openWater(r: Renderer, topLight: number): void {
  r.clear(WATER.black);
  const steps = 18;
  for (let i = 0; i < steps; i++) {
    const k = i / (steps - 1);
    const c = mix(mix(WATER.deep, WATER.far, topLight * (1 - k) ** 2), WATER.black, k * 0.75);
    r.rect(0, (SCREEN_H / steps) * i, SCREEN_W, Math.ceil(SCREEN_H / steps) + 1, c);
  }
}

/** A vignette. The same one the opening film uses, so the two films match. */
function cineVignette(r: Renderer): void {
  for (let i = 0; i < 10; i++) {
    const c = `rgba(2,6,12,${(0.055 * (1 - i / 10)).toFixed(3)})`;
    r.rect(0, i, SCREEN_W, 1, c);
    r.rect(0, SCREEN_H - 1 - i, SCREEN_W, 1, c);
    r.rect(i, 0, 1, SCREEN_H, c);
    r.rect(SCREEN_W - 1 - i, 0, 1, SCREEN_H, c);
  }
}

/* ===================================================================== *
 *  SHOT ONE -- THE DARK
 *
 *  Black water with almost nothing in it, and then something crosses. We never
 *  see it: we see it BLOT OUT the little light there is, and then five points
 *  of its own light go past, in a line, in the right order.
 *
 *  It opens this way for one reason. The last time the player saw this animal
 *  it filled the screen in a hurricane. Starting on it in full again would be
 *  a reprise. Starting on nothing, and making them recognise it from five
 *  lamps, puts them straight back in the water with it instead.
 * ===================================================================== */

function shotDark(r: Renderer, t: number, p: number): void {
  const fall = smooth(p);
  openWater(r, 0.42 * (1 - fall * 0.8));

  // The last of the surface light, a very long way up, sliding out of frame.
  const shaftY = -20 - fall * 60;
  for (let i = 0; i < 4; i++) {
    const bx = 20 + i * (SCREEN_W / 4) + Math.sin(t * 0.009 + i * 1.7) * 12;
    for (let y = Math.max(0, shaftY); y < SCREEN_H * 0.55; y += 2) {
      const d = (y - shaftY) / (SCREEN_H * 0.75);
      const a = 0.055 * (1 - fall) * Math.max(0, 1 - d) * (0.6 + 0.4 * Math.sin(t * 0.016 + i));
      if (a < 0.004) continue;
      r.rect(bx + (y - shaftY) * 0.22, y, Math.max(1, 14 - d * 10), 2, `rgba(150,205,235,${a.toFixed(3)})`);
    }
  }

  snow(r, t, 1.6, 52);

  // It crosses, LEFT TO RIGHT.
  //
  // Not a stylistic preference: the rig draws this animal facing right, with
  // the body running left from the snout, exactly as the climax does and for
  // the same reason. The first pass of this shot ran it the other way and the
  // creature swam the length of the frame backwards. Every shot in this film
  // travels the same way, and it is the way the animal is pointed.
  //
  // It is nearly unlit and it is too long for the frame, so what the shot
  // shows is a shape blotting out the last of the light, and five points of
  // its own coming up out of the dark in a line, in the right order.
  const n: Nera = {
    x: -212 + smooth(clamp01((p - 0.08) / 0.92)) * 480,
    y: SCREEN_H * 0.60,
    len: 190,
    t,
    light: 0.05,
    lamp: 0.22 + 0.42 * smooth(clamp01((p - 0.45) / 0.45)),
    pitch: -0.014,
    effort: 0.10,
  };
  drawNera(r, n);
}

/* ===================================================================== *
 *  SHOT TWO -- OPEN WATER
 *
 *  It, in full, at a distance, doing nothing.
 *
 *  This shot has no event in it and it is not supposed to. Every single frame
 *  of this creature the player has ever seen has had a storm, a machine or a
 *  restraint in it. This one has water. That IS the beat, and it needs four
 *  seconds of nothing happening to be legible as one.
 * ===================================================================== */

function shotOpen(r: Renderer, t: number, p: number): void {
  openWater(r, 0.20);
  snow(r, t, 0.55, 44, 0.10);

  // A school a long way off: something for the eye to measure the animal
  // against, and the only other living thing in the picture.
  const schoolX = wrap(t * 0.4 - 60, SCREEN_W, 70);
  const schoolY = SCREEN_H * 0.26 + Math.sin(t * 0.014) * 9;
  for (let i = 0; i < 34; i++) {
    const a = hash(i + 200) * 6.283;
    const rad = hash(i + 250);
    r.rect(schoolX + Math.cos(a) * rad * 36, schoolY + Math.sin(a) * rad * 11
      + Math.sin(t * 0.06 + i) * 1.2, 2, 1, 'rgba(120,168,196,0.30)');
  }

  const n: Nera = {
    // Enters at about a fifth of the way in and is not clear of the frame until
    // the fade has started, so the middle three seconds of this shot are just
    // the animal, whole, in the middle of it.
    x: -46 + smooth(p) * (SCREEN_W + 200),
    y: SCREEN_H * 0.56 - Math.sin(p * Math.PI) * 8,
    len: 150,
    t,
    light: 0.34 + smooth(clamp01((p - 0.2) / 0.5)) * 0.30,
    lamp: 0.86,
    pitch: 0.012,
    effort: 0.16,
  };
  drawNera(r, n);

  // The wake it drags: not spray, just water it has disturbed, going the other
  // way and giving up.
  for (let i = 0; i < 22; i++) {
    const age = ((t * 0.9 + i * 26) % 260) / 260;
    const x = n.x - n.len - age * 90;
    if (x < -6 || x > SCREEN_W + 6) continue;
    const y = n.y + Math.sin(i * 2.1) * (6 + age * 22);
    r.rect(x, y, 3, 1, `rgba(176,220,244,${(0.16 * (1 - age)).toFixed(3)})`);
  }
}

/* ===================================================================== *
 *  SHOT THREE -- THE RUINS
 *
 *  Columns, at a scale that makes the animal small.
 *
 *  This game has spent thirty hours establishing that Neravoss is the biggest
 *  thing in the world. One shot of it swimming between two column bases it
 *  cannot see the top of undoes that, on purpose, and hands the scale to the
 *  PEOPLE who built the place -- which is the setup the wall then cashes.
 * ===================================================================== */

function shotRuins(r: Renderer, t: number, p: number): void {
  const sink = smooth(p);
  openWater(r, 0.16 * (1 - sink * 0.5));
  const par = (depth: number): number => -sink * 34 * depth;

  // THREE RANKS, AND THE NEAR ONE IS THE DARKEST.
  //
  // `tone` mixes toward the water: a low tone is a near-black silhouette. That
  // is the right way round down here and the first pass had it inverted, which
  // put the palest, most detailed stone closest to the lens and flattened three
  // ranks of columns into one grey hedge. There is no light source in this
  // room. What little there is comes from a long way above and behind, so the
  // further a thing is the more scattered water there is behind it to stand
  // against, and the nearest columns are simply holes.
  const ranks: { depth: number; gap: number; w: number; tone: number; base: number }[] = [
    { depth: 0.25, gap: 62, w: 10, tone: 0.62, base: SCREEN_H * 0.86 },
    { depth: 0.55, gap: 100, w: 20, tone: 0.40, base: SCREEN_H * 1.00 },
    { depth: 1.15, gap: 176, w: 44, tone: 0.15, base: SCREEN_H * 1.30 },
  ];

  // The floor of the avenue, a long way back.
  r.rect(0, SCREEN_H * 0.80 + par(0.25), SCREEN_W, SCREEN_H, mix(WATER.black, STONE.silt, 0.35));

  for (let rk = 0; rk < ranks.length; rk++) {
    const rankCfg = ranks[rk];
    // The near rank goes down AFTER the animal, so it can pass behind it.
    if (rk === 2) continue;
    drawRank(r, rankCfg, t, par);
  }

  // A broken arch spanning the avenue, far off. It is the thing that says this
  // was architecture rather than geology.
  const archY = SCREEN_H * 0.30 + par(0.3);
  for (let i = 0; i < SCREEN_W; i++) {
    const k = i / SCREEN_W;
    const drop = Math.sin(k * Math.PI) * SCREEN_H * 0.10;
    // Broken through the middle: two thirds of an arch and a gap.
    if (k > 0.42 && k < 0.58) continue;
    const y = Math.round(archY - drop);
    r.rect(i, y, 1, 5, mix(WATER.deep, STONE.shade, 0.5));
    r.rect(i, y, 1, 1, mix(WATER.deep, STONE.face, 0.5));
  }

  snow(r, t, 0.9, 40, 0.14);

  // It comes up the avenue: small and far at the head of the shot, near and
  // enormous by the end, and it passes BEHIND the near columns.
  const grow = easeIn(clamp01((p - 0.05) / 0.9));
  const n: Nera = {
    x: SCREEN_W * 0.16 + grow * SCREEN_W * 0.98,
    y: SCREEN_H * 0.50 + par(0.4) + grow * SCREEN_H * 0.08,
    // It never gets bigger than half the frame, and that is the shot. This game
    // has spent thirty hours establishing that Neravoss is the largest thing in
    // the world; here it is smaller than the gap between two columns.
    len: 34 + grow * 88,
    t,
    light: 0.14 + grow * 0.30,
    lamp: 0.55 + grow * 0.32,
    pitch: 0.02,
    effort: 0.14,
  };
  drawNera(r, n);

  drawRank(r, ranks[2], t, par);
}

/** One rank of columns, tiled across the frame on its own parallax. */
function drawRank(
  r: Renderer,
  cfg: { depth: number; gap: number; w: number; tone: number; base: number },
  t: number, par: (d: number) => number,
): void {
  const shift = par(cfg.depth);
  const off = Math.sin(t * 0.004) * 2 * cfg.depth;
  const first = -1;
  const count = Math.ceil(SCREEN_W / cfg.gap) + 2;
  for (let i = first; i < first + count; i++) {
    const x = Math.round(i * cfg.gap + off + (cfg.gap * 0.3));
    if (x > SCREEN_W + cfg.w || x + cfg.w < -2) continue;
    const top = -20 + shift * 0.6;
    const bot = cfg.base + shift;
    const body = mix(WATER.deep, STONE.shade, cfg.tone * 0.9);
    const lit = mix(WATER.deep, STONE.lit, cfg.tone * 0.7);
    for (let k = 0; k < cfg.w; k++) {
      const u = k / (cfg.w - 1);
      // Round: a lit edge on the left, falling away to dark on the right.
      const col = mix(lit, body, easeIn(u * 1.05));
      r.rect(x + k, top, 1, bot - top, col);
      // Flutes. Three of them, and they are what stops a column being a post.
      if (cfg.w > 12 && (k === Math.round(cfg.w * 0.34) || k === Math.round(cfg.w * 0.62))) {
        r.rect(x + k, top, 1, bot - top, mix(col, STONE.cut, 0.45));
      }
    }
    // Drum joints, and a plinth where it meets the floor.
    for (let y = top + 22; y < bot; y += Math.round(cfg.w * 2.4)) {
      r.rect(x, y, cfg.w, 1, mix(WATER.deep, STONE.cut, cfg.tone));
      r.rect(x, y + 1, cfg.w, 1, mix(WATER.deep, STONE.lit, cfg.tone * 0.4));
    }
    r.rect(x - 2, bot - 4, cfg.w + 4, 5, mix(WATER.deep, STONE.shade, cfg.tone));
    r.rect(x - 2, bot - 4, cfg.w + 4, 1, mix(WATER.deep, STONE.lit, cfg.tone * 0.55));
  }
}

/* ===================================================================== *
 *  SHOT FOUR -- THE WALL
 *
 *  One continuous take, and the whole scene is in it. It does four things
 *  without ever cutting:
 *
 *    TRACK    p 0.00 -> 0.58  the camera runs the wall alongside the animal
 *    LEVEL    p 0.42          it draws level with its own carving. Nothing
 *                             marks the moment except its own light on the
 *                             stone.
 *    SETTLE   p 0.58 -> 0.66  it outswims the camera. The camera stops.
 *    WAKE     p 0.66 -> 1.00  one of the others lights.
 *
 *  The camera EASES to a stop rather than cutting, because a cut here would
 *  tell the player the film had chosen to look at something. It has not. It
 *  simply could not keep up, and what is left in the frame when it gives up is
 *  where the last thing happens.
 * ===================================================================== */

/** Wall-space x of a panel's centre. */
function panelCentre(i: number): number {
  return i * BAY + PANEL_W / 2;
}

/** Where the camera comes to rest: dead between Neravoss and the one that wakes. */
const REST_X = (panelCentre(PANEL_NERAVOSS) + panelCentre(PANEL_WAKES)) / 2;
/** Where it starts: the first bay is still off the right of the frame. */
const START_X = -40;

/** How far the light has run through the carving at shot progress p. */
function wakeProgress(p: number): number {
  return easeOut(clamp01((p - 0.68) / 0.24));
}

function shotWall(r: Renderer, t: number, p: number): void {
  openWater(r, 0.10);

  const camX = START_X + smooth(clamp01(p / 0.58)) * (REST_X - START_X);

  // The animal's CENTRE, in wall space.
  //
  // Solved rather than eyeballed: it is level with the centre of its own panel
  // at exactly p = 0.42, and the quadratic term means it is still speeding up
  // when it gets there. That acceleration is the whole reason the camera loses
  // it rather than the animal politely stopping to be looked at.
  const centre = -240 + 757 * p + 1100 * p * p;
  const sx = centre - camX + SCREEN_W / 2 + NERA_LEN / 2;
  const swimY = SWIM_Y + Math.sin(t * 0.013) * 2;

  // THE WASH. The animal's own markings, as a light source on the wall. This
  // is the only help the shot gives the recognition and it is not a hint, it
  // is optics: a glowing body a few metres off a stone face lights the stone
  // face. It falls off over about ninety units, which is a little less than one
  // panel -- so at most one carving is ever picked out, and at p = 0.42 that
  // carving is Neravoss.
  const onScreen = sx > -NERA_LEN * 1.4 && sx < SCREEN_W + NERA_LEN * 0.6;
  const wash = onScreen
    ? { x: sx - NERA_LEN * 0.5, y: swimY - 4, power: 1.0 * clamp01(1 - Math.abs(p - 0.42) / 0.5) }
    : null;

  const prog = wakeProgress(p);
  const wake = prog > 0
    ? { panel: PANEL_WAKES, prog, bloom: clamp01(0.25 + prog * 1.1) }
    : null;

  drawWall(r, camX, t, wash, wake);

  // Water between the camera and the wall: the wall is a flat thing and this
  // is what puts it behind something. Light, though -- an earlier pass had this
  // at 0.16 on top of a much darker stone and the carvings went to ink.
  r.tint(WATER.deep, 0.09);
  snow(r, t, 0.5, 34, 0.5);

  if (onScreen) {
    drawNera(r, {
      x: sx,
      y: swimY,
      len: NERA_LEN,
      t,
      light: 0.62,
      lamp: 0.94,
      pitch: -0.004,
      effort: 0.20,
    });
    // Its shadow on the wall behind it, offset and soft. Half of why the
    // animal reads as being IN FRONT of the carvings rather than on them.
    for (let i = 0; i < 30; i++) {
      const s = i / 30;
      const shx = Math.round(sx - s * NERA_LEN + 5);
      if (shx < 0 || shx > SCREEN_W) continue;
      const rad = neraSpineR({ x: sx, y: swimY, len: NERA_LEN, t, light: 1, lamp: 1 }, s);
      r.rect(shx, Math.round(swimY - rad + 6), 4, Math.round(rad * 2), 'rgba(2,10,18,0.16)');
    }
  }

  // The bloom off the woken carving, thrown back into the water in front of it,
  // and this is the last thing the game draws so it is allowed to be big. Not
  // bright -- BIG. A hard little glow inside a groove is a switch; a hundred
  // units of soft gold hanging in the water in front of a stone wall is
  // something the size of a building starting to wake up on the other side of
  // it, which is what this actually is.
  if (prog > 0.02) {
    const gx = panelCentre(PANEL_WAKES) - camX + SCREEN_W / 2;
    const gy = WALL_TOP + PANEL_H * 0.5;
    const strength = clamp01(prog * 1.25) * (0.86 + 0.14 * Math.sin(t * 0.03));
    for (let i = 1; i <= 9; i++) {
      const rad = i * 13;
      r.rect(gx - rad, gy - rad * 0.76, rad * 2, rad * 1.52,
        rgba(WAKE.halo, 0.052 * strength * (1 - i / 10) ** 1.4));
    }
    // And the dust in front of it catching, which is the only way a light in
    // water ever proves it is in water.
    for (let i = 0; i < 40; i++) {
      const a = hash(i + 700) * 6.283;
      const rad = 8 + hash(i + 740) * 84;
      const x = gx + Math.cos(a + t * 0.004) * rad;
      const y = gy + Math.sin(a + t * 0.004) * rad * 0.7;
      const s = hash(i + 820) > 0.8 ? 2 : 1;
      r.rect(x, y, s, s, rgba(WAKE.core, 0.34 * strength * hash(i + 780)));
    }
  }
}

/* ===================================================================== *
 *  THE REEL
 * ===================================================================== */

interface Shot {
  /** Length in ticks, 60 to the second. */
  frames: number;
  /** Ticks of black on the way in and out. */
  fadeIn: number;
  fadeOut: number;
  draw(r: Renderer, t: number, p: number): void;
}

/**
 * Four shots, about thirty-one seconds, and the joins are authored.
 *
 * The first three are one paragraph and blink between each other. The join into
 * the wall is the longest in the film, because that is the change of subject:
 * everything before it is an animal, everything after it is a record. And the
 * wall does not fade out at all until the very end, where it takes a hundred
 * ticks -- the slowest thing in either of this game's two films, because it is
 * the last frame of it.
 */
const REEL: Shot[] = [
  { frames: 270, fadeIn: 54, fadeOut: 22, draw: shotDark },
  { frames: 330, fadeIn: 22, fadeOut: 22, draw: shotOpen },
  { frames: 360, fadeIn: 22, fadeOut: 34, draw: shotRuins },
  { frames: 900, fadeIn: 34, fadeOut: 100, draw: shotWall },
];

/** The wall is the last shot, and every route through this scene ends on it. */
const LAST = REEL.length - 1;

/**
 * Where a hurried viewer is put down.
 *
 * Pressing a key does not skip this. It goes to the LAST PAGE: the wall, one
 * second before the animal draws level with its own carving.
 *
 * That second matters and getting it wrong is easy. An earlier pass dropped
 * the hurried player at 0.56 -- past the point where the animal has already
 * outswum the camera -- which handed them a lit carving on an empty wall and
 * threw away the one thing the entire scene exists to do. From here they get
 * the whole argument in ten seconds: the animal arrives, it passes its own
 * portrait, it goes, and the one beside it lights.
 */
const HURRY_TO = Math.round(REEL[LAST].frames * 0.34);

/* ===================================================================== *
 *  THE SCENE
 * ===================================================================== */

/**
 * Flag set the moment this scene starts.
 *
 * The postgame needs to know the player has been shown this: canon's Neravoss
 * quest in stage 8 is a direct sequel to it, and a save that reaches the temple
 * without having seen the wall should not be told it recognises anything.
 */
export const POSTCREDITS_FLAG = 'postcredits_seen';

export class PostCreditsScene implements Scene {
  readonly name = 'postcredits';

  private shot = 0;
  private t = 0;
  /** 0 = clear, 1 = black. Also the cross-fade between shots. */
  private veil = 1;
  private hurried = false;
  /**
   * Extra black over the picture after a hurry, decaying to nothing.
   *
   * Jumping the reel forward lands mid-shot, where neither the shot's fade-in
   * nor its fade-out is running, so without this the answer to a keypress is a
   * hard cut -- and a hard cut is the loudest join in film grammar. Every other
   * join in this scene is a dissolve. So is this one.
   */
  private jump = 0;
  /** Ticks of the final hold on black before the scene hands back. */
  private out = -1;
  /** Guards the one-shot sounds in the wake. */
  private lastProg = 0;

  constructor(private state: GameState | null, private onDone: () => void) {}

  enter(): void {
    audio.playMusic('postcredits_deep');
    this.state?.setFlag(POSTCREDITS_FLAG);
  }

  /** Take it to the last page. See HURRY_TO. */
  private hurry(): void {
    if (this.hurried) return;
    this.hurried = true;
    if (this.shot === LAST && this.t >= HURRY_TO) return;
    this.shot = LAST;
    this.t = HURRY_TO;
    this.jump = 1;
    this.lastProg = wakeProgress(HURRY_TO / REEL[LAST].frames);
  }

  update(game: Game, _dt: number): void {
    this.t++;

    if (this.out >= 0) {
      this.out++;
      // A full second of black at the end. There is nothing after this scene
      // and the player should be allowed to sit in that for a moment before a
      // menu appears over the top of it.
      if (this.out >= 60) {
        // Take itself off the stack ONLY if there is something under it. Pushed
        // by `setPiece` there always is, and the script resumes underneath.
        // Handed the screen with `replaceAll` by a credits scene there is not,
        // and popping would leave the game with no scene at all for however
        // long the callback takes to put one back -- so in that case the
        // callback owns the transition and this just gets out of its way.
        if (game.scenes.depth > 1) game.scenes.pop();
        this.out = -1;
        this.onDone();
      }
      return;
    }

    if (game.input.pressed('confirm') || game.input.pressed('cancel')
      || game.input.pressed('menu') || game.input.mouse.leftPressed) {
      this.hurry();
    }

    const shot = REEL[this.shot];
    if (shot.fadeIn > 0 && this.t < shot.fadeIn) this.veil = 1 - this.t / shot.fadeIn;
    else if (shot.fadeOut > 0 && this.t > shot.frames - shot.fadeOut) {
      this.veil = (this.t - (shot.frames - shot.fadeOut)) / shot.fadeOut;
    } else this.veil = 0;

    if (this.jump > 0) {
      this.jump = Math.max(0, this.jump - 1 / 30);
      this.veil = Math.max(this.veil, this.jump);
    }

    this.sound();

    if (this.t >= shot.frames) {
      if (this.shot >= LAST) { this.out = 0; return; }
      this.t = 0;
      this.shot++;
    }
  }

  /**
   * What this is allowed to make a noise about, which is almost nothing.
   *
   * There is no dialogue and there are no captions, so sound is the only thing
   * that can point -- which means it has to be as disciplined as the picture.
   * Three cues in thirty seconds: water when the animal passes close, a tick as
   * the light crosses into new stone, and one bloom when it reaches the end of
   * the carving. Nothing plays at the moment the player recognises the
   * silhouette, on purpose.
   */
  private sound(): void {
    if (this.shot === 0 && this.t === 150) {
      audio.playSfx('fx_water', { volume: 0.16, pitch: 0.36 });
    }
    if (this.shot === 1 && this.t === 168) {
      audio.playSfx('fx_water', { volume: 0.12, pitch: 0.44 });
    }
    if (this.shot === 2 && this.t === 250) {
      audio.playSfx('fx_water', { volume: 0.14, pitch: 0.40 });
    }
    if (this.shot !== LAST) { this.lastProg = 0; return; }

    const prog = wakeProgress(this.t / REEL[LAST].frames);
    if (prog > 0 && this.lastProg === 0) {
      audio.playSfx('fx_light', { volume: 0.26, pitch: 0.52 });
    }
    // A tick every tenth of the path, rising as the light gets further round.
    if (Math.floor(prog * 10) > Math.floor(this.lastProg * 10)) {
      audio.playSfx('fx_charge', { volume: 0.13, pitch: 0.44 + prog * 0.30 });
    }
    if (prog >= 1 && this.lastProg < 1) {
      audio.playSfx('fx_light', { volume: 0.34, pitch: 0.40 });
    }
    this.lastProg = prog;
  }

  render(_game: Game, r: Renderer): void {
    const shot = REEL[this.shot];
    const p = Math.min(1, this.t / shot.frames);
    r.clear(WATER.black);
    if (this.out < 0) {
      shot.draw(r, this.t, p);
      cineVignette(r);
      // Letterbox. Shut for the whole film and it never opens: this one does
      // not hand over to a menu in shot the way the opening does. It ends.
      r.rect(0, 0, SCREEN_W, 12, WATER.black);
      r.rect(0, SCREEN_H - 18, SCREEN_W, 18, WATER.black);
    }
    if (this.veil > 0) r.tint(WATER.black, this.veil);
    if (this.out >= 0) r.tint('#000000', 1);
  }
}

/**
 * The hook.
 *
 * Two ways in, and both of them exist so that the ENDING owns where this is
 * reached from and this file owns nothing but the picture:
 *
 *   - `{ "kind": "setPiece", "id": "postcredits" }` from an event script, which
 *     is registered in setPieceScene in src/scenes/neravoss.ts. The script
 *     blocks until the last frame and then carries on, so whatever the ending
 *     wants to do afterwards -- drop the player back in Hearthmere for the
 *     postgame, return to the title -- is the ending's decision and not this
 *     file's.
 *   - `new PostCreditsScene(state, done)` directly, for a credits scene that
 *     wants to hand over in code rather than through the event VM. Push it and
 *     the scene pops itself before calling back; hand it the whole stack with
 *     `replaceAll` and it leaves the stack alone, so `done` must put something
 *     on screen -- the title, or the overworld the postgame starts in.
 *
 * Either way `done` is called on a black frame, after a full second of it. The
 * scene has already faded out; whatever comes next should fade IN rather than
 * cut, because the player has just been sat in the dark on purpose.
 */
export function postCreditsScene(
  state: GameState | null, done: () => void,
): Scene {
  return new PostCreditsScene(state, done);
}
