/**
 * The opening cinematic.
 *
 * Six shots and no gameplay: the sea at dawn, the herds crossing the plains,
 * the deep, the Turning, one house with a light on, and the logo. It exists to
 * answer "where am I and why should I care" before the player is asked to make
 * a single decision, and to put the kin on screen doing what they do -- flying,
 * running, swimming -- rather than waiting in a menu.
 *
 * Everything here is drawn from the same generators the game uses, so the
 * creatures in the cinematic are the creatures in the game: the sprites are
 * built from data/creatures, not hand-drawn for the intro and left to rot when
 * a species changes.
 *
 * THE RULE THIS FILE IS BUILT ON: no shot has fewer than three layers, and no
 * two layers move at the same rate. A shot where only the creatures move is a
 * slideshow with stickers on it -- which is exactly what the first cut of this
 * was. So every shot carries a camera (a drift, a pan, a heave, a push), a far
 * background that barely acknowledges it, a mid-ground the subject lives in,
 * and something close to the lens crossing fast enough to be a blur of an idea.
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
  /** Two lines at most. Anything longer is silently cropped by the caption box. */
  caption: string;
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
  const skein = wrap(t * 0.24 - 60, SCREEN_W, 46);
  for (let i = 0; i < 7; i++) {
    const lane = i - 3;
    const s = kin(FLYERS[i % FLYERS.length]!, 10, '#28375c', 0, beat(i, 0.3));
    r.image(
      s,
      skein + Math.abs(lane) * 7 - lane * 1.5,
      12 + par(0.5) + Math.abs(lane) * 3.5 + Math.sin(t * 0.035 + i * 0.8) * 1.5,
      0, 0, undefined, undefined, false, false, 0.8,
    );
  }

  for (let i = 0; i < 5; i++) {
    const s = kin(FLYERS[(i + 2) % FLYERS.length]!, 20, '#3a4d78', 0, beat(i, 0.26));
    const x = wrap(t * 0.5 + SEA_SEEDS[i + 7]! * 320, SCREEN_W, 34);
    const y = 20 + par(0.7) + SEA_SEEDS[i + 12]! * 26 + Math.sin(t * 0.055 + i * 2) * 3;
    r.image(s, x, y);
  }

  // The lead. It banks through the shot instead of holding one pose, and it is
  // the only bird in the frame with its own colour on it. One creature the eye
  // can actually follow is worth six more silhouettes.
  const bankPhase = Math.sin(t * 0.03);
  const leadX = wrap(t * 0.95, SCREEN_W, 52);
  const leadY = 28 + par(0.9) + bankPhase * 9 + Math.sin(t * 0.09) * 2;
  r.image(kin('kestrelle', 42, null, bankPhase * 0.32, Math.sin(t * 0.2) * 0.8), leadX, leadY);

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
  r.image(kin('gullswift', 26, null, -0.1, Math.sin(t * 0.26 + 1) * 0.85), skimX, skimY);

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
  // which is the point of putting them there.
  for (let i = 0; i < 3; i++) {
    const x = wrap(hash(i + 20) * SCREEN_W * 2 - t * 0.16, SCREEN_W, 20);
    const y = 12 + par(0.35) + hash(i + 26) * 16 + Math.sin(t * 0.03 + i) * 2;
    r.image(kin(FLYERS[(i + 1) % FLYERS.length]!, 8, '#7d9ec4', 0, Math.sin(t * 0.3 + i) * 0.7),
      x, y, 0, 0, undefined, undefined, false, false, 0.7);
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
      r.image(kin(id, size, null, glance, squash), x, feet - half * 2 - rise);
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
    const lean = (0.2 + Math.sin(t * 0.05 + i) * 0.08) * dir;
    if (!far) {
      const tail = dir > 0 ? x - 4 : x + size / DETAIL + 4;
      for (let k = 1; k < 6; k++) {
        const a = 0.2 * (1 - k / 6);
        r.rect(tail - (dir > 0 ? k * 6 : -k * 6), y + (size / DETAIL) * 0.55, 5, 1,
          `rgba(176,220,244,${a.toFixed(2)})`);
      }
    }
    r.image(kin(id, size, far ? '#0a1e33' : null, lean, Math.sin(t * 0.12 + i * 1.7) * 0.5),
      x, y, 0, 0, undefined, undefined, dir < 0);
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
  for (let i = 0; i < 2; i++) {
    const gust = Math.sin(t * 0.09 + i * 2) * 12 + Math.sin(t * 0.031 + i) * 20;
    const x = 56 + i * 96 + gust - t * 0.12;
    const y = 30 + heave * 0.5 + Math.sin(t * 0.07 + i * 1.6) * 7;
    r.image(kin(i ? 'slatewing' : 'craglide', 24, '#0b1222',
      Math.sin(t * 0.09 + i * 2) * 0.3, Math.sin(t * 0.3 + i) * 0.9), x, y);
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
 * Marrow Hollow before sunrise: one window lit, which is the whole point.
 *
 * A push in on that window. Every coordinate goes through `box`, which rounds
 * to whole logical units before drawing -- a zoom that lands on half-pixels
 * crawls, and crawling edges are exactly the smooth, modern artefact this art
 * style cannot afford. Snapping by a full design pixel is what the hardware
 * this game quotes actually did.
 */
function shotTown(r: Renderer, t: number, p: number): void {
  const e = smooth(p);
  const z = 1 + e * 1.4;
  // The focus is the middle of the lit window. The town sits high in the frame
  // -- the first cut hung it off the bottom edge under half a screen of empty
  // sky, with the one thing the shot is about tucked behind the letterbox.
  const FX = 124, FY = 110;
  const ox = FX + (SCREEN_W / 2 - FX) * e;
  const oy = FY + (SCREEN_H / 2 + 6 - FY) * e;
  const sx = (x: number): number => Math.round((x - FX) * z + ox);
  const sy = (y: number): number => Math.round((y - FY) * z + oy);
  // Widths are derived from the two transformed edges rather than scaled on
  // their own, so neighbouring shapes never open a seam as the zoom creeps.
  const box = (x: number, y: number, w: number, h: number, c: string): void =>
    r.rect(sx(x), sy(y), Math.max(1, sx(x + w) - sx(x)), Math.max(1, sy(y + h) - sy(y)), c);

  const seaY = sy(74);
  r.rect(0, 0, SCREEN_W, SCREEN_H, '#0e1430');
  sky(r, '#0e1430', '#6f5f80', 0, Math.max(4, seaY), 14);
  if (seaY > 4) sky(r, '#7a6478', '#c88a62', Math.max(0, seaY - 9), seaY, 4);

  const night = Math.max(0, 1 - p * 1.6);
  for (let i = 0; i < 30; i++) {
    const y = TOWN_SEEDS[i + 30]! * 44 * (1 - e * 0.4);
    const a = night * (0.4 + 0.6 * Math.sin(t * 0.04 + i));
    if (a <= 0.2 || y > seaY - 2) continue;
    r.rect(TOWN_SEEDS[i]! * SCREEN_W, y, 1, 1, `rgba(255,255,255,${a.toFixed(2)})`);
  }

  // The sea beyond the roofs, catching the first of the light.
  box(-40, 74, 320, 16, '#22385a');
  for (let i = 0; i < 8; i++) {
    const x = wrap(t * 0.3 + i * 42, 320, 20) - 40;
    box(x, 76 + (i % 5) * 3, 12, 1, 'rgba(200,158,142,0.30)');
  }
  box(-40, 88, 320, 4, '#16202f');
  box(-40, 90, 320, 90, '#1a2130');

  // Scrub along the shore road. Without it the houses stand on an unbroken
  // slab, and a village needs a ground line more than it needs another window.
  for (let i = 0; i < 22; i++) {
    const bx = -20 + hash(i + 900) * 280;
    const bw = 5 + Math.round(hash(i + 940) * 11);
    const by = 92 + Math.round(hash(i + 980) * 5);
    for (let k = 0; k < bw / 2; k++) {
      const lift = Math.round(Math.sin((k / (bw / 2)) * Math.PI) * 4) + 1;
      box(bx + k, by - lift, 1, lift + 1, '#1d2a28');
      box(bx + bw - k, by - lift, 1, lift + 1, '#18231f');
    }
  }

  // Gulls out over the water, small and slow and behind everything.
  for (let i = 0; i < 3; i++) {
    const gx = wrap(hash(i + 60) * 300 - t * 0.34, 300, 20) - 30;
    const gy = 60 + hash(i + 66) * 10 + Math.sin(t * 0.05 + i) * 2;
    const size = Math.max(6, Math.round((8 + i) * z / 2) * 2);
    r.image(kin(FLYERS[i % FLYERS.length]!, size, '#101a2c', 0, Math.sin(t * 0.28 + i) * 0.8),
      sx(gx), sy(gy), 0, 0, undefined, undefined, false, false, 0.8);
  }

  // The town. Walls first, then gables over them: a roof that narrows downward
  // is a tent, and that is what the first draft of this shot looked like.
  const houses: { x: number; w: number; y: number; roof: string; lit: boolean }[] = [
    { x: 6, w: 34, y: 106, roof: '#7a4228', lit: false },
    { x: 46, w: 30, y: 110, roof: '#39557e', lit: false },
    { x: 98, w: 42, y: 100, roof: '#8a4a2c', lit: true },
    { x: 152, w: 32, y: 108, roof: '#39557e', lit: false },
    { x: 194, w: 36, y: 112, roof: '#7a4228', lit: false },
  ];

  for (const h of houses) {
    if (sx(h.x + h.w) < -4 || sx(h.x) > SCREEN_W + 4) continue;
    box(h.x, h.y, h.w, 80, '#2a2b3a');
    box(h.x, h.y, 2, 80, '#343646');
    const peak = h.y - Math.round(h.w * 0.42);
    for (let y = peak; y <= h.y; y++) {
      const k = (y - peak) / (h.y - peak);
      const half = Math.round((h.w / 2 + 3) * k);
      box(h.x + h.w / 2 - half, y, half * 2, 1, y > h.y - 2 ? '#1c1c26' : h.roof);
    }
    box(h.x - 3, h.y, h.w + 6, 2, '#1c1c26');

    // Chimney smoke. It stays small and dies inside twenty units of the pot:
    // big soft discs drifting up the sky read as marks on the lens, not smoke.
    const ch = h.x + h.w * 0.24;
    const pot = h.y - Math.round(h.w * 0.42) - 4;
    box(ch, pot, 4, 6, '#23222e');
    // Fourteen puffs over twenty units, so they overlap into a plume. Seven
    // spaced over the same distance came out as a string of separate beads
    // climbing the sky, which reads as dirt on the lens.
    for (let i = 0; i < 14; i++) {
      const age = ((t * 0.6 + i * 6 + h.x * 3) % 84) / 84;
      const puff = 0.9 + age * 2.2;
      const px = ch + 2 + Math.sin(age * 4 + h.x) * 3 + age * 6;
      const py = pot - 1 - age * 20;
      const a = 0.15 * (1 - age) * (1 - age);
      if (a < 0.012) continue;
      r.ellipsePixel(sx(px) * DETAIL, sy(py) * DETAIL, puff * z * DETAIL, puff * z * DETAIL,
        `rgba(158,154,176,${a.toFixed(3)})`);
    }

    if (h.lit) {
      const flicker = 0.74 + 0.26 * Math.sin(t * 0.18) + 0.06 * Math.sin(t * 0.53);
      const wx = h.x + Math.round(h.w * 0.52);
      const wy = h.y + 6;
      const wW = 8, wH = 9;
      // The halo is stepped, not one disc. Two overlapping translucent ellipses
      // drew a hard-edged circle across the whole wall; a stack of thin rings
      // falls off in bands, which is how this era did light anyway.
      for (let k = 9; k >= 1; k--) {
        const rr = 3 + k * 2.6;
        r.ellipsePixel(sx(wx + wW / 2) * DETAIL, sy(wy + wH / 2) * DETAIL,
          rr * z * DETAIL, rr * 0.84 * z * DETAIL, 'rgba(255,196,110,0.024)');
      }
      // And the pool of it thrown down onto the lane.
      for (let k = 5; k >= 1; k--) {
        r.ellipsePixel(sx(wx + wW / 2) * DETAIL, sy(h.y + 34) * DETAIL,
          (6 + k * 4.4) * z * DETAIL, (3 + k * 2.2) * z * DETAIL, 'rgba(255,186,100,0.026)');
      }
      box(wx - 1, wy - 1, wW + 2, wH + 2, '#221c1c');
      box(wx, wy, wW, wH, `rgba(255,214,128,${flicker.toFixed(2)})`);
      box(wx, wy, wW, 1, 'rgba(255,244,200,0.92)');

      // Someone crosses the window near the end of the push. The whole
      // cinematic has been pointing at the fact that a person is awake in there.
      const cross = (t - 168) / 96;
      if (cross > 0 && cross < 1) {
        const cw = 4;
        const cx = wx - cw + (wW + cw * 2) * cross;
        const from = Math.max(wx, cx);
        const to = Math.min(wx + wW, cx + cw);
        if (to > from) box(from, wy + 1, to - from, wH - 1, 'rgba(96,58,34,0.82)');
      }

      // Window bars last, so the figure passes behind them.
      box(wx + wW / 2, wy, 1, wH, 'rgba(112,74,38,0.75)');
      box(wx, wy + Math.round(wH / 2), wW, 1, 'rgba(112,74,38,0.75)');
    } else {
      box(h.x + 6, h.y + 7, 5, 6, '#1b2434');
    }
  }

  // Four moths working the one light in the village. Seven specks read as dirt
  // on the wall; four on wide orbits read as something alive.
  for (let i = 0; i < 4; i++) {
    const a = t * (0.024 + hash(i + 700) * 0.026) + i * 1.6;
    const rr = 11 + hash(i + 740) * 15;
    const mx = 124 + Math.cos(a) * rr;
    const my = 110 + Math.sin(a * 1.7) * rr * 0.55;
    const s = Math.max(1, Math.round(z));
    r.rect(sx(mx), sy(my), s + 1, s,
      `rgba(255,230,178,${(0.4 + 0.35 * Math.sin(t * 0.2 + i)).toFixed(2)})`);
  }

  // A lane running out of frame, so the town has somewhere to lead. Ruts along
  // it rather than a flat wedge, which is what a triangle of one colour is.
  for (let y = 120; y < 190; y++) {
    const w = 6 + (y - 120) * 1.4;
    box(SCREEN_W / 2 - w / 2, y, w, 1, '#3d3a30');
    box(SCREEN_W / 2 - w / 2, y, 1, 1, '#2a2822');
    box(SCREEN_W / 2 + w / 2 - 1, y, 1, 1, '#2a2822');
    if (y % 7 === 0) box(SCREEN_W / 2 - w / 4, y, w / 2, 1, '#4a463a');
  }
  // Weeds along the verges, so the lane meets the ground instead of being
  // pasted onto it.
  for (let i = 0; i < 14; i++) {
    const u = hash(i + 1700);
    const y = 120 + u * 46;
    const w = 6 + (y - 120) * 1.4;
    const side = i % 2 === 0 ? -1 : 1;
    const gx = SCREEN_W / 2 + side * (w / 2 + hash(i + 1740) * 4);
    const gh = 2 + Math.round(hash(i + 1780) * 3);
    box(gx, y - gh, 1, gh, '#232c22');
  }

  // One flyer heading out over the water, small enough to be a promise.
  const fx = -20 + p * (SCREEN_W + 40);
  r.image(kin('pipwing', 16, '#0d1524', 0, Math.sin(t * 0.24) * 0.8),
    sx(fx), sy(46 - Math.sin(p * Math.PI) * 12));

  // Foreground hedges, on a far steeper zoom than the town: as the camera comes
  // forward they swell and swing outward past the edges of the frame. Something
  // leaving the lens sideways is the only cue a 2D drawing has for saying that
  // the camera moved rather than the subject grew.
  const zf = 1 + e * 2.6;
  const near = (x: number): number => (x - 120) * zf + 120;
  for (let side = 0; side < 2; side++) {
    const hx = near(side === 0 ? 30 : 210);
    const w0 = 34 * zf;
    if (hx + w0 < -4 || hx - w0 > SCREEN_W + 4) continue;
    const sway = Math.sin(t * 0.03 + side * 2) * 2;
    for (let k = 0; k < 30; k++) {
      const u = k / 30;
      const w = (34 + Math.sin(u * 3.1 + side * 2) * 9) * zf;
      r.rect(hx - w / 2 + sway * u, SCREEN_H + 6 - k * zf * 1.4, w,
        Math.max(1, zf * 1.5), '#101a18');
    }
  }
  for (let i = 0; i < 10; i++) {
    const x = near(wrap(hash(i + 800) * SCREEN_W - t * 0.4, SCREEN_W, 12));
    if (x < -20 || x > SCREEN_W + 20) continue;
    const step = Math.max(1, Math.round(zf));
    const bh = (12 + hash(i + 840) * 14) * zf;
    const sway = Math.sin(t * 0.09 + i) * 3;
    for (let k = 0; k < bh; k += step) {
      const u = k / bh;
      r.rect(x + sway * u * u, SCREEN_H + 6 - k, Math.max(1, Math.round(zf * 1.5)),
        step, '#0d1614');
    }
  }

  // Sea haze blowing through the lens. The hedges are gone by the time the push
  // is a third done, and a shot with nothing in front of the subject flattens
  // out; this is the layer that keeps a foreground for the other two thirds.
  // Kept below the skyline: haze streaking across the stars looked like a fault
  // in the gradient rather than like air coming off the water.
  for (let i = 0; i < 20; i++) {
    const sp = 1.4 + hash(i + 1400) * 2.6;
    const x = wrap(hash(i + 1440) * SCREEN_W * 2 - t * sp, SCREEN_W, 40);
    const y = 62 + hash(i + 1480) * 92 + Math.sin(t * 0.04 + i) * 5;
    const w = 14 + hash(i + 1520) * 34;
    r.rect(x, y, w, 1 + (i % 2), `rgba(206,214,236,${(0.05 + hash(i + 1560) * 0.05).toFixed(3)})`);
  }
  for (let i = 0; i < 10; i++) {
    const sp = 2.6 + hash(i + 1600) * 2.4;
    const x = wrap(hash(i + 1640) * SCREEN_W * 2 - t * sp, SCREEN_W, 12);
    const y = 66 + hash(i + 1680) * 84 + Math.sin(t * 0.1 + i) * 7;
    r.rect(x, y, 2, 2, 'rgba(226,214,190,0.20)');
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

const SHOTS: Shot[] = [
  {
    frames: 300,
    caption: 'Veldras. A ring of land around a sea with no bottom.',
    draw: shotSea,
  },
  {
    frames: 300,
    caption: 'Herds swim, flocks turn, whole species walk to the far shore.',
    draw: shotPlains,
  },
  {
    frames: 320,
    caption: 'The kin have crossed it longer than anyone has counted.',
    draw: shotDeep,
  },
  {
    frames: 280,
    caption: 'Every seventy years the sea reverses. They call it the Turning.',
    draw: shotTurning,
  },
  {
    frames: 320,
    caption: 'The Turning is due. One house still has its light on.',
    draw: shotTown,
  },
  {
    frames: 230,
    caption: '',
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

    // Captions hold still while the picture moves, and fade with the shot.
    const hold = Math.min(1, this.t / 50) * Math.min(1, (shot.frames - this.t) / 50);
    if (shot.caption && hold > 0.02) {
      const lines = r.wrapText(shot.caption, SCREEN_W - 32).slice(0, 2);
      const top = SCREEN_H - 6 - lines.length * 9;
      lines.forEach((line, i) => {
        r.text(line, SCREEN_W / 2, top + i * 9, {
          color: hold > 0.6 ? '#f0e6d2' : '#a49c8c',
          shadow: '#05070d',
          align: 'center',
        });
      });
    }

    if (this.shot === 0 && this.t < 220 && Math.floor(this.t / 34) % 2 === 0) {
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
