/**
 * The opening cinematic.
 *
 * It has one job, and for three cuts it did not do it: explain why the game
 * starts. The film now argues in a straight line -- there is a sea, the kin
 * live by it, every seventy years it turns over, the last Turning drowned a
 * town called Old Tidefall in a night, a woman named Vess has spent ten years
 * charting the next one, the next one has arrived eleven years early, and she
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
 * Dawn over the Hollow Sea, with the flocks going out over it.
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

  const beat = (i: number, rate: number): number => Math.sin(t * rate + i * 2.1) * 0.7;

  // A far skein in loose formation, travelling as one shape. It is what makes
  // the two nearer layers read as individual birds rather than more of these.
  // The whole skein flies right, so the whole skein is flipped -- a vee where
  // the leader faces the way it is going and the wing does not is a mess.
  const skein = wrap(t * 0.24 - 60, SCREEN_W, 46);
  for (let i = 0; i < 7; i++) {
    const lane = i - 3;
    const s = kin(FLYERS[i % FLYERS.length]!, 10, '#28375c', 0, beat(i, 0.3));
    r.image(
      s,
      // The vee trails BEHIND the leader, so with the flock heading right the
      // stragglers sit to its left.
      skein - Math.abs(lane) * 7 + lane * 1.5,
      12 + par(0.5) + Math.abs(lane) * 3.5 + Math.sin(t * 0.035 + i * 0.8) * 1.5,
      0, 0, undefined, undefined, facing(1), false, 0.8,
    );
  }

  for (let i = 0; i < 5; i++) {
    const s = kin(FLYERS[(i + 2) % FLYERS.length]!, 20, '#3a4d78', 0, beat(i, 0.26));
    const x = wrap(t * 0.5 + SEA_SEEDS[i + 7]! * 320, SCREEN_W, 34);
    const y = 20 + par(0.7) + SEA_SEEDS[i + 12]! * 26 + Math.sin(t * 0.055 + i * 2) * 3;
    r.image(s, x, y, 0, 0, undefined, undefined, facing(1));
  }

  // The lead. It banks through the shot instead of holding one pose, and it is
  // the only bird in the frame with its own colour on it. One creature the eye
  // can actually follow is worth six more silhouettes.
  const bankPhase = Math.sin(t * 0.03);
  const leadX = wrap(t * 0.95, SCREEN_W, 52);
  const leadY = 28 + par(0.9) + bankPhase * 9 + Math.sin(t * 0.09) * 2;
  // The bank is authored for a bird facing left and then mirrored with it, so
  // the nose still leads into the climb once the flip is on.
  r.image(kin('kestrelle', 42, null, bankPhase * 0.32, Math.sin(t * 0.2) * 0.8),
    leadX, leadY, 0, 0, undefined, undefined, facing(1));

  // One flyer down on the deck, close enough to the water to drag a wake out of
  // it. Nothing else in the shot ties the sky to the sea.
  const skimX = wrap(t * 1.35 - 120, SCREEN_W, 44);
  const skimY = hz + 4 + Math.sin(t * 0.08) * 2;
  for (let i = 1; i < 9; i++) {
    const a = 0.26 * (1 - i / 9);
    r.rect(skimX - i * 5, skimY + 12 + i * 0.5, 5, 1, `rgba(255,236,206,${a.toFixed(2)})`);
  }
  r.ellipsePixel((skimX + 7) * DETAIL, (skimY + 13) * DETAIL, 7 * DETAIL, 2 * DETAIL,
    'rgba(10,24,42,0.34)');
  r.image(kin('gullswift', 26, null, -0.1, Math.sin(t * 0.26 + 1) * 0.85),
    skimX, skimY, 0, 0, undefined, undefined, facing(1));

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
    r.image(kin(FLYERS[(i + 1) % FLYERS.length]!, 8, '#7d9ec4', 0, Math.sin(t * 0.3 + i) * 0.7),
      x, y, 0, 0, undefined, undefined, facing(-1), false, 0.7);
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
    const clumps = tall ? 4 : 9;
    const speed = tall ? 2.3 : 4.6;
    const shade = tall ? '#152a1c' : '#1c3122';
    for (let i = 0; i < clumps; i++) {
      const s = i + rank * 40 + 1000;
      const cx = wrap(hash(s) * SCREEN_W * 1.5 - t * speed, SCREEN_W, 30);
      const blades = tall ? 7 : 4;
      for (let b = 0; b < blades; b++) {
        const q = hash(s * 11 + b);
        const lean = (b - (blades - 1) / 2) / blades;
        const x = cx + lean * (tall ? 15 : 8);
        // Every blade a different length, and the outer ones shorter: a clump
        // of equal blades is a comb.
        // Tall enough to clear the letterbox. Blades that top out level with
        // the bottom bar do all this work below the visible frame.
        const bh = (tall ? 36 + q * 24 : 14 + q * 12) * (1 - Math.abs(lean) * 0.55);
        const sway = Math.sin(t * 0.11 + i * 1.3 + b * 0.7) * (tall ? 6 : 3) + lean * 10;
        const base = Math.max(1, Math.round((tall ? 5 : 3) * (1 - Math.abs(lean) * 0.8)));
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
  const wx = SCREEN_W * 1.45 - smooth(p) * SCREEN_W * 2.1;
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
    r.image(kin(id, size, far ? '#0a1e33' : null, lean, Math.sin(t * 0.12 + i * 1.7) * 0.5),
      x, y, 0, 0, undefined, undefined, facing(dir));
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
 * The two lightning strikes are on a fixed clock, because a storm that flashes
 * at random reads as a fault in the display rather than as weather.
 */
function shotTurning(r: Renderer, t: number, p: number): void {
  const heave = Math.sin(t * 0.035) * 5 + Math.sin(t * 0.021 + 1.2) * 3;
  const roll = Math.sin(t * 0.027) * 4;
  const hz = 78 + heave;

  let flash = 0;
  let bolt = -1;
  for (const s of [96, 214]) {
    const d = t - s;
    if (d < 0 || d >= 28) continue;
    // A double blink: bright, gone, bright again, then decay.
    flash = Math.max(flash, d < 3 ? 1 : d < 6 ? 0.25 : d < 10 ? 0.85 : Math.max(0, 1 - (d - 10) / 18));
    if (d < 12) bolt = s;
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

  // A headland with a light on it, so the storm has something to be a threat
  // to. The dome carries a broken crest: a clean parabola reads as a hill in a
  // diagram rather than as rock in weather.
  const capeX = 178 + roll;
  for (let x = 0; x < SCREEN_W; x++) {
    const d = (x - capeX) / 48;
    const h = (1 - d * d) * 32
      + (Math.abs(d) < 1 ? Math.sin(x * 0.21) * 2 + Math.sin(x * 0.07 + 2) * 3 : 0);
    if (h <= 1) continue;
    r.rect(x, hz - h, 1, h + 6, '#0c1020');
    r.rect(x, hz - h, 1, 1, flash > 0.3 ? '#4b5780' : '#1a2036');
  }
  // A tower on the crest, and the light on it turning. The halo is a stack of
  // rings, not one translucent disc: a single ellipse at a readable alpha draws
  // a hard-edged egg on the hillside instead of a glow.
  const towerY = hz - 34;
  if (Math.sin(t * 0.05) > 0.35) {
    const lamp = 0.55 + 0.45 * Math.sin(t * 0.05);
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
  for (let i = 0; i < 2; i++) {
    const gust = Math.sin(t * 0.09 + i * 2) * 12 + Math.sin(t * 0.031 + i) * 20;
    const x = 56 + i * 96 + gust - t * 0.12;
    const y = 30 + heave * 0.5 + Math.sin(t * 0.07 + i * 1.6) * 7;
    r.image(kin(i ? 'slatewing' : 'craglide', 24, '#0b1222',
      Math.sin(t * 0.09 + i * 2) * 0.3, Math.sin(t * 0.3 + i) * 0.9),
      x, y, 0, 0, undefined, undefined, facing(1));
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
    const amp = 2 + u * 9;
    const wl = 0.06 - u * 0.035;
    const sp = 0.6 + u * 3.4;
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
  // surfaces: a shape you cannot resolve is larger than one you can.
  const bulgeX = SCREEN_W * 0.5 + Math.sin(t * 0.008) * 64;
  for (let i = 0; i < 54; i++) {
    const w = Math.sin((i / 54) * Math.PI) * 104;
    if (w < 2) continue;
    r.rect(bulgeX - w / 2, hz + 16 + i * 0.8, w, 1, 'rgba(3,10,20,0.28)');
  }

  for (let i = 4; i < RANKS; i++) rank(i);

  // Rain at two depths. The far layer is a haze of short marks; the near one is
  // long, fast and crosses the whole frame in half a second.
  for (let i = 0; i < 96; i++) {
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

  // Spray torn off the near ranks and blown across the lens.
  for (let i = 0; i < 26; i++) {
    const x = wrap(hash(i + 1200) * SCREEN_W * 1.5 - t * 4.4, SCREEN_W, 28);
    const y = 108 + hash(i + 1240) * 48 + Math.sin(t * 0.06 + i) * 4;
    r.rect(x, y, 6 + hash(i + 1280) * 16, 1, 'rgba(226,240,252,0.16)');
  }

  if (flash > 0.02) r.tint('#cfe0f4', flash * 0.34);
  void p;
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
    r.image(kin(id, size, null, 0.12 + Math.sin(t * 0.05 + i) * 0.07,
      Math.sin(t * 0.13 + i * 1.9) * 0.5),
      x, y, 0, 0, undefined, undefined, facing(dir));
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
 * Dr. Vess's room over the harbour office, and the wall she has spent ten years
 * covering.
 *
 * This is the shot the film kept ducking, and the reason the ending never
 * landed. Without it the cinematic states a fact about the sea and then cuts to
 * a house, and the player is entirely right to ask what one has to do with the
 * other. So: the coast pinned up with every arrow on it pointing inward at one
 * stretch of shore, a red ring struck through the town that is already gone, a
 * thread running from that ring to a fresh pin on the north shore, and a woman
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
    // Vess has her arm up at the wall.
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

  // The open ledger, ruled and half filled: the thing she wants somebody else
  // to be filling in, out in the region, instead of her at this desk.
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

  /* ---------------------------------------------------------------- Vess */

  // Far enough right that she is barely in frame when the shot opens: the wall
  // gets the first half of the track to itself and she arrives into the second,
  // which is the order the story wants. Parked nearer the middle she sat on top
  // of the two smaller sheets for the whole shot.
  const vx = 236 + px(0.95);
  if (vx > -44 && vx < SCREEN_W + 48) {
    // She looks up at the wall and back down at the ledger on a cycle far
    // slower than anything else in the room.
    const look = (Math.sin(t * 0.021) + 1) / 2;
    const reach = Math.max(0, Math.sin(t * 0.021));
    const headY = deskY - 44 - look * 3;
    for (let k = 0; k < 32; k++) {
      const u = k / 32;
      const half = 8 + u * u * 17;
      r.rect(vx - half, deskY - 32 + k, half * 2, 1, '#100c14');
      // One amber edge on the lamp side and nothing else. A face at this size
      // is a smudge with two dots in it, and the shot does not need her
      // features -- it needs the fact of somebody still being up.
      r.rect(vx - half, deskY - 32 + k, 1, 1, `rgba(216,142,74,${(0.55 * flame).toFixed(2)})`);
    }
    const tip = -3 + look * 5;
    r.ellipsePixel((vx + tip) * DETAIL, headY * DETAIL, 8 * DETAIL, 9 * DETAIL, '#100c14');
    r.ellipsePixel((vx + tip + 7) * DETAIL, (headY - 4) * DETAIL, 5 * DETAIL, 4 * DETAIL, '#100c14');
    r.rect(vx + tip - 8, headY - 5, 2, 11, `rgba(216,142,74,${(0.5 * flame).toFixed(2)})`);

    // The arm goes up to the wall on the same clock as her head, with a pin in
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

  // The back of the chair she is not sitting in, swinging out of frame in the
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
 * address at the end of Vess's thread. The last beat of the shot is a candle
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
  for (let i = 0; i < 3; i++) {
    const gX = -40 + hash(i + 660) * 300 + t * 0.5;
    const gY = 40 + hash(i + 700) * 14 + Math.sin(t * 0.06 + i) * 3;
    const size = Math.max(8, Math.round((12 + i * 3) * z / 4) * 4);
    r.image(kin(FLYERS[(i + 3) % FLYERS.length]!, size, '#1b2338', 0, Math.sin(t * 0.26 + i) * 0.8),
      sx(gX), sy(gY), 0, 0, undefined, undefined, facing(1), false, 0.85);
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

let logoSprite: HTMLCanvasElement | null = null;
let shineSprite: HTMLCanvasElement | null = null;
let subSprite: HTMLCanvasElement | null = null;

/** Built on first use: the cinematic is the only thing that ever asks for it. */
function titleArt(): { logo: HTMLCanvasElement; shine: HTMLCanvasElement; sub: HTMLCanvasElement } {
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
  shotSea(r, t + 900, 0.86 + p * 0.14);

  const { logo, shine, sub } = titleArt();
  const lw = logo.width / DETAIL;
  const lx = Math.round((SCREEN_W - lw) / 2);
  const rise = easeOut(t / 46);
  // Low in the frame, over the water. Centred, it sat on the brightest part of
  // the dawn sky -- an amber wordmark on an amber sky, which is a wordmark
  // nobody can read. The scrim below is the belt to that pair of braces.
  const ly = Math.round(84 - 8 * (1 - rise));

  const fade = Math.min(1, t / 26);
  for (let i = 0; i < 16; i++) {
    const a = 0.075 * Math.sin((i / 15) * Math.PI) * fade;
    r.rect(0, ly - 12 + i * 3, SCREEN_W, 3, `rgba(5,9,20,${a.toFixed(3)})`);
  }

  if (rise > 0.01) r.image(logo, lx, ly, 0, 0, undefined, undefined, false, false, fade);

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

  const subFade = Math.min(1, Math.max(0, (t - 60) / 40));
  if (subFade > 0.01) {
    const sw = sub.width / DETAIL;
    r.image(sub, Math.round((SCREEN_W - sw) / 2), ly + Math.round(logo.height / DETAIL) + 3,
      0, 0, undefined, undefined, false, false, subFade);
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
 */
const SHOTS: Shot[] = [
  {
    frames: 230,
    captions: ['Veldras. A ring of land around a sea with no bottom.'],
    draw: shotSea,
  },
  {
    frames: 210,
    captions: ['Herds swim, flocks turn, whole species walk to the far shore.'],
    draw: shotPlains,
  },
  {
    frames: 200,
    captions: ['The kin have crossed it longer than anyone has counted.'],
    draw: shotDeep,
  },
  {
    frames: 230,
    captions: ['Every seventy years the sea reverses. They call it the Turning.'],
    draw: shotTurning,
  },
  {
    frames: 270,
    captions: [
      'The last one took a town called Old Tidefall.',
      'One night. By morning there was only water.',
    ],
    draw: shotDrowned,
  },
  {
    frames: 300,
    captions: [
      'Dr. Vess has been pinning charts of it for ten years.',
      'The next is eleven years out. It began this spring.',
    ],
    draw: shotCharts,
  },
  {
    frames: 290,
    captions: [
      'She needs somebody out in it, writing down what they see.',
      'North shore. One light on. You are asleep under it.',
    ],
    draw: shotShore,
  },
  {
    frames: 180,
    captions: [],
    open: true,
    draw: shotTitle,
  },
];

const FADE = 30;

export class OpeningScene implements Scene {
  readonly name = 'opening';

  private shot = 0;
  private t = 0;
  /** 0 = clear, 1 = black. Doubles as the cross-fade between shots. */
  private veil = 1;
  private leaving = false;

  constructor(private state: GameState) {}

  enter(): void {
    audio.playMusic('opening_theme');
    // Build every icon this film needs up front. Generating a creature sprite
    // is not free, and doing it lazily meant each shot dropped frames on the
    // one tick it first showed a new species -- always right after a cut, where
    // it is most visible. One hitch under the transition beats five under the
    // picture.
    for (const id of [...FLYERS, ...RUNNERS, ...SWIMMERS]) iconSprite(id);
  }

  exit(): void {
    // The scaled copies are only ever wanted by this scene, and it plays once
    // per new game. Holding a few hundred canvases for the rest of the session
    // buys nothing.
    scaledCache.clear();
  }

  update(game: Game, _dt: number): void {
    this.t++;

    if (this.leaving) {
      this.veil = Math.min(1, this.veil + 0.025);
      if (this.veil >= 1) game.scenes.replaceAll(new CreatorScene(this.state));
      return;
    }

    if (game.input.pressed('confirm') || game.input.pressed('cancel')
      || game.input.pressed('menu') || game.input.mouse.leftPressed) {
      this.leaving = true;
      audio.playSfx('confirm', { volume: 0.4 });
      return;
    }

    const shot = SHOTS[this.shot]!;
    if (this.t < FADE) this.veil = 1 - this.t / FADE;
    else if (this.t > shot.frames - FADE) this.veil = (this.t - (shot.frames - FADE)) / FADE;
    else this.veil = 0;

    if (this.t >= shot.frames) {
      this.t = 0;
      this.shot++;
      if (this.shot >= SHOTS.length) {
        this.shot = SHOTS.length - 1;
        this.leaving = true;
      }
    }
  }

  render(_game: Game, r: Renderer): void {
    const shot = SHOTS[this.shot]!;
    const p = Math.min(1, this.t / shot.frames);
    r.clear('#05070d');
    shot.draw(r, this.t, p);

    this.vignette(r);

    // Letterbox. Cheap, and it tells the player at a glance that this is not a
    // screen they are meant to be pressing buttons at. The bars slide in at the
    // head of the film and pull back for the title card: the frame opening up
    // is the signal that the cinematic has handed over.
    let bars = 1;
    if (this.shot === 0) bars = Math.min(1, this.t / 34);
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

    if (this.shot === 0 && this.t < 190 && Math.floor(this.t / 34) % 2 === 0) {
      r.text('ENTER TO SKIP', SCREEN_W - 6, 4, { color: '#6d7893', align: 'right' });
    }

    if (this.veil > 0) r.tint('#05070d', this.veil);
  }

  /**
   * A soft darkening at the edges. Every shot in here is lit from one place,
   * and the vignette is what stops the flat borders of a procedural drawing
   * from reading as the borders of a poster.
   */
  private vignette(r: Renderer): void {
    for (let i = 0; i < 10; i++) {
      const c = `rgba(3,5,11,${(0.05 * (1 - i / 10)).toFixed(3)})`;
      r.rect(0, i, SCREEN_W, 1, c);
      r.rect(0, SCREEN_H - 1 - i, SCREEN_W, 1, c);
      r.rect(i, 0, 1, SCREEN_H, c);
      r.rect(SCREEN_W - 1 - i, 0, 1, SCREEN_H, c);
    }
  }
}
