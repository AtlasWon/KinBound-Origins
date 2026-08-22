/**
 * The opening cinematic.
 *
 * Four shots and no gameplay: the sea, the plains, the deep, and one house with
 * a light on. It exists to answer "where am I and why should I care" before the
 * player is asked to make a single decision, and to put the kin on screen doing
 * what they do -- flying, running, swimming -- rather than waiting in a menu.
 *
 * Everything here is drawn from the same generators the game uses, so the
 * creatures in the cinematic are the creatures in the game: the sprites are
 * built from data/creatures, not hand-drawn for the intro and left to rot when
 * a species changes.
 *
 * Skippable from the first frame. A cinematic you cannot get out of is a
 * cinematic people learn to resent.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { Renderer, SCREEN_H, SCREEN_W, DETAIL } from '../engine/renderer.js';
import { audio } from '../audio/audio.js';
import { iconSprite } from '../gfx/kinsprite.js';
import { CreatorScene } from './creator.js';
import type { GameState } from '../systems/state.js';

interface Shot {
  /** Length in ticks (60 per second). */
  frames: number;
  caption: string;
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
  // Squash is quantised: a creature that changes shape by a fraction of a pixel
  // every frame just shimmers, and every distinct value costs a cached canvas.
  const step = Math.round(squash * 6);
  const key = `${id}:${size}:${tint ?? ''}:${turn}:${step}`;
  const hit = scaledCache.get(key);
  if (hit) return hit;

  const src = iconSprite(id);
  const h = Math.max(4, Math.round(size * (1 + step / 24)));
  const w = Math.max(4, Math.round(size * (1 - step / 48)));
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  if (turn) {
    // Front sprites stand up. A creature in open water does not, and a few
    // degrees of lean is the difference between swimming and drowning.
    c.translate(size / 2, size / 2);
    c.rotate(turn);
    c.translate(-size / 2, -size / 2);
  }
  // Drawn bottom-aligned, so a squashed creature keeps its feet on the ground.
  c.drawImage(src, 0, 0, src.width, src.height, (size - w) / 2, size - h, w, h);
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (tint) {
    // Flatten to a silhouette: distance reads as shape, not detail.
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = tint;
    c.fillRect(0, 0, size, size);
  }
  scaledCache.set(key, cv);
  return cv;
}

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

function band(from: string, to: string, t: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const f = (i: number) =>
    Math.round(p(from, i) + (p(to, i) - p(from, i)) * t).toString(16).padStart(2, '0');
  return `#${f(0)}${f(1)}${f(2)}`;
}

/** Sky as horizontal bands between two colours. */
function sky(r: Renderer, top: string, bottom: string, y0: number, y1: number, steps = 12): void {
  const h = (y1 - y0) / steps;
  for (let i = 0; i < steps; i++) {
    r.rect(0, y0 + i * h, SCREEN_W, Math.ceil(h) + 1, band(top, bottom, i / (steps - 1)));
  }
}

/* ------------------------------------------------------------- the shots */

const HORIZON = 84;

/** Dawn over the Hollow Sea, with the flocks going out over it. */
function shotSea(r: Renderer, t: number, p: number): void {
  sky(r, '#1d2a52', '#f0b071', 0, HORIZON, 14);
  sky(r, '#d99260', '#2c527d', HORIZON, HORIZON + 22, 6);
  sky(r, '#2c527d', '#101f34', HORIZON + 22, SCREEN_H, 10);

  // The sun clearing the water, and its path across it.
  const sunY = HORIZON - 4 - p * 8;
  r.ellipsePixel(SCREEN_W * 0.62 * DETAIL, sunY * DETAIL, 26 * DETAIL, 26 * DETAIL, 'rgba(255,196,120,0.10)');
  r.ellipsePixel(SCREEN_W * 0.62 * DETAIL, sunY * DETAIL, 11 * DETAIL, 11 * DETAIL, '#ffdf9e');
  for (let i = 0; i < 14; i++) {
    const w = 26 * (1 - i / 18);
    r.rect(SCREEN_W * 0.62 - w / 2, HORIZON + 2 + i * 4, w, 1, 'rgba(255,205,140,0.35)');
  }

  // Two headlands closing the frame, drifting to sell the camera move.
  const drift = p * 10;
  for (let x = 0; x < SCREEN_W; x++) {
    const edge = Math.min(1, Math.abs(x - SCREEN_W / 2 + drift) / (SCREEN_W / 2));
    // Two humps rather than one ramp, so the headlands have shoulders instead
    // of looking like a shelf someone put the sea on.
    const swell = Math.sin(edge * Math.PI * 0.5) ** 3;
    const bumps = Math.sin(x * 0.09) * 1.6 + Math.sin(x * 0.031) * 2.4;
    const h = Math.floor(swell * 30 + (edge > 0.55 ? bumps : 0));
    if (h <= 1) continue;
    r.rect(x, HORIZON - h, 1, h + 2, '#16203a');
    r.rect(x, HORIZON - h, 1, 1, '#2c3c60');
  }

  // Shimmer.
  for (let i = 0; i < 16; i++) {
    const y = HORIZON + 3 + i * 4;
    const w = 8 + ((i * 13) % 22);
    const x = ((t * (0.4 + i * 0.05) + i * 37) % (SCREEN_W + 60)) - 30;
    r.rect(Math.round(x), y, w, 1, i < 8 ? 'rgba(255,226,186,0.30)' : 'rgba(150,196,240,0.20)');
  }

  // Three depths of flock: far silhouettes, mid, then one bird close enough to
  // have colour. Depth is the whole trick -- one layer would read as clip art.
  const seeds = series(18, 4242);
  // Each bird beats its own wings at its own rate; a flock in lockstep reads as
  // one object with copies of itself stuck to it.
  const beat = (i: number, rate: number) => Math.sin(t * rate + i * 2.1) * 0.7;
  for (let i = 0; i < 6; i++) {
    const s = kin(FLYERS[i % FLYERS.length]!, 12, '#22304e', 0, beat(i, 0.34));
    const x = ((t * 0.35 + seeds[i]! * 300) % (SCREEN_W + 40)) - 20;
    const y = 16 + seeds[i + 6]! * 34 + Math.sin(t * 0.05 + i) * 2;
    r.image(s, x, y);
  }
  for (let i = 0; i < 4; i++) {
    const s = kin(FLYERS[(i + 2) % FLYERS.length]!, 22, '#33456e', 0, beat(i, 0.28));
    const x = ((t * 0.7 + seeds[i + 12]! * 320) % (SCREEN_W + 60)) - 30;
    const y = 24 + seeds[i + 3]! * 26 + Math.sin(t * 0.07 + i * 2) * 3;
    r.image(s, x, y);
  }
  const lead = kin('kestrelle', 44, null, 0, Math.sin(t * 0.22) * 0.8);
  const lx = ((t * 1.1) % (SCREEN_W + 90)) - 45;
  r.image(lead, lx, 34 + Math.sin(t * 0.06) * 5);
}

/** The grasslands, and the herds crossing them. */
function shotPlains(r: Renderer, t: number, p: number): void {
  sky(r, '#4d84cc', '#dceaf4', 0, 70, 10);
  const scroll = t * 0.9;

  // Clouds, drifting slower than the ground: the cheapest parallax there is.
  const puffs = series(18, 313);
  for (let i = 0; i < 6; i++) {
    const cw = 22 + puffs[i]! * 30;
    const cy = 8 + puffs[i + 6]! * 34;
    const cx = (((puffs[i + 12]! * SCREEN_W * 1.5) - scroll * 0.08) % (SCREEN_W + 80)
      + SCREEN_W + 80) % (SCREEN_W + 80) - 40;
    r.rect(cx, cy, cw, 4, 'rgba(255,255,255,0.55)');
    r.rect(cx + cw * 0.2, cy - 3, cw * 0.5, 3, 'rgba(255,255,255,0.45)');
    r.rect(cx + 2, cy + 4, cw - 6, 1, 'rgba(190,215,235,0.5)');
  }

  // Two ridgelines at different speeds, then the treeline, then the ground.
  for (let layer = 0; layer < 2; layer++) {
    const speed = 0.12 + layer * 0.16;
    const baseY = 64 + layer * 10;
    const colour = layer === 0 ? '#5b7f6a' : '#48705c';
    for (let x = 0; x < SCREEN_W; x++) {
      const wx = x + scroll * speed;
      const h = 10 + Math.sin(wx * 0.035 + layer) * 5 + Math.sin(wx * 0.011) * 4;
      r.rect(x, baseY - h, 1, h + 30, colour);
    }
  }

  // Bushes along the near ridge, which is where the eye looks for scale.
  const bushes = series(30, 616);
  for (let i = 0; i < 15; i++) {
    const bx = ((bushes[i]! * SCREEN_W * 1.4) - scroll * 0.30) % (SCREEN_W + 30);
    const x = (bx + SCREEN_W + 30) % (SCREEN_W + 30) - 15;
    const bw = 5 + bushes[i + 15]! * 9;
    for (let k = 0; k < bw / 2; k++) {
      r.rect(x + k, 88 - Math.round(Math.sin((k / (bw / 2)) * Math.PI) * 5), 1, 8, '#33553f');
      r.rect(x + bw - k, 88 - Math.round(Math.sin((k / (bw / 2)) * Math.PI) * 5), 1, 8, '#2c4a37');
    }
  }

  r.rect(0, 92, SCREEN_W, SCREEN_H - 92, '#7ab463');
  r.rect(0, 92, SCREEN_W, 2, '#93c777');
  // Broad bands of lighter grass, so the field has ground rather than paint.
  for (let i = 0; i < 7; i++) {
    const y = 96 + i * 9;
    const w = 40 + ((i * 37) % 90);
    const x = (((i * 61) - scroll * (0.5 + i * 0.06)) % (SCREEN_W + 120) + SCREEN_W + 120)
      % (SCREEN_W + 120) - 60;
    r.rect(x, y, w, 2, i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(40,90,50,0.10)');
  }

  // Grass tufts scrolling past at ground speed, which is what gives the herd
  // something to be running against.
  const tufts = series(60, 909);
  for (let i = 0; i < 30; i++) {
    const y = 96 + tufts[i]! * 56;
    const x = (((tufts[i + 30]! * SCREEN_W) - scroll * (0.6 + y / 200)) % (SCREEN_W + 20) + SCREEN_W + 20)
      % (SCREEN_W + 20) - 10;
    const dark = y > 120;
    r.rect(x, y, 2, 1, dark ? '#4f8244' : '#5f9a52');
    r.rect(x + 1, y - 1, 1, 1, dark ? '#5f9a52' : '#79b566');
  }

  // The herd: three lanes, nearer lanes bigger and faster.
  const seeds = series(12, 777);
  for (let lane = 0; lane < 3; lane++) {
    const size = 20 + lane * 10;          // buffer pixels
    const half = size / DETAIL / 2;       // logical half-width
    const feet = 100 + lane * 13;         // where this lane's feet land
    for (let i = 0; i < 3; i++) {
      const id = RUNNERS[(lane * 2 + i) % RUNNERS.length]!;
      const speed = 0.55 + lane * 0.35;
      const x = ((t * speed + seeds[lane * 3 + i]! * 340) % (SCREEN_W + 80)) - 40;
      // A bound: the body rises and stretches on the push, lands and squashes
      // on the contact. Sliding a static sprite sideways is what made the old
      // version look like the kin were being dragged across the screen.
      const phase = t * 0.24 + i * 1.9 + lane;
      const gallop = Math.abs(Math.sin(phase));
      const rise = Math.sin(phase) > 0 ? gallop * 4 : 0;
      const squash = Math.cos(phase) * 0.5 - 0.2;
      r.ellipsePixel((x + half) * DETAIL, feet * DETAIL,
        half * DETAIL * (0.9 - gallop * 0.25), 2 * DETAIL, 'rgba(40,70,40,0.22)');
      r.image(kin(id, size, null, 0, squash), x, feet - half * 2 - rise);
      // Dust kicked up on the down-beat, trailing behind.
      if (gallop > 0.75) {
        r.rect(x - 2, feet - 1, 4, 1, 'rgba(220,230,200,0.45)');
        r.rect(x - 5, feet - 2, 2, 1, 'rgba(220,230,200,0.25)');
      }
    }
  }
  void p;
}

/** Under the surface, where the sea keeps its own weather. */
function shotDeep(r: Renderer, t: number, p: number): void {
  sky(r, '#2f6f9a', '#04101f', 0, SCREEN_H, 14);

  // Light shafts leaning in from the surface.
  for (let i = 0; i < 5; i++) {
    const x = 20 + i * 46 + Math.sin(t * 0.01 + i) * 6;
    for (let y = 0; y < SCREEN_H; y++) {
      const w = 10 - (y / SCREEN_H) * 6;
      const a = 0.10 * (1 - y / SCREEN_H);
      r.rect(x + y * 0.22, y, w, 1, `rgba(180,225,255,${a.toFixed(3)})`);
    }
  }

  // Bubbles.
  const bubbles = series(40, 31337);
  for (let i = 0; i < 20; i++) {
    const speed = 0.25 + bubbles[i]! * 0.5;
    const y = SCREEN_H - ((t * speed + bubbles[i + 20]! * 400) % (SCREEN_H + 20));
    const x = bubbles[i]! * SCREEN_W + Math.sin(t * 0.04 + i) * 3;
    r.rect(x, y, 1 + (i % 2), 1 + (i % 2), 'rgba(200,235,255,0.35)');
  }

  // The Warden, vast and unhurried, passing behind everything else.
  const wx = SCREEN_W * 1.2 - p * SCREEN_W * 1.6;
  const wy = 104 + Math.sin(t * 0.012) * 4;
  for (let i = 0; i <= 46; i++) {
    const u = i / 46;
    const wing = u * 74;
    const lift = Math.sin(u * Math.PI * 0.85) * 9;
    const thick = Math.max(1, (1 - u * u) * 22);
    r.rect(wx + wing, wy - lift - thick / 2, 2, thick, '#061426');
    r.rect(wx - wing, wy - lift - thick / 2, 2, thick, '#061426');
  }
  for (let i = 0; i < 22; i++) {
    const u = i / 22;
    r.rect(wx - 5 + u * 2, wy + 6 + u * 26, Math.max(1, 6 - u * 5), 1, '#061426');
  }
  const glow = 0.4 + 0.6 * Math.sin(t * 0.05);
  if (glow > 0.45) {
    r.rect(wx - 6, wy - 1, 3, 1, `rgba(214,148,78,${glow.toFixed(2)})`);
    r.rect(wx + 3, wy - 1, 3, 1, `rgba(214,148,78,${glow.toFixed(2)})`);
  }

  // Swimmers, drifting with a slow tail-beat.
  const seeds = series(14, 5150);
  for (let i = 0; i < 7; i++) {
    const id = SWIMMERS[i % SWIMMERS.length]!;
    const size = i < 3 ? 20 : 34;
    const speed = 0.3 + (i % 3) * 0.25;
    const dir = i % 2 === 0 ? 1 : -1;
    const raw = (t * speed + seeds[i]! * 340) % (SCREEN_W + 70);
    const x = dir > 0 ? raw - 35 : SCREEN_W + 35 - raw;
    const y = 22 + seeds[i + 7]! * 92 + Math.sin(t * 0.045 + i * 1.4) * 5;
    const lean = (0.22 + Math.sin(t * 0.05 + i) * 0.06) * dir;
    const beat = Math.sin(t * 0.11 + i * 1.7) * 0.45;
    r.image(kin(id, size, i < 3 ? '#0b2138' : null, lean, beat),
      x, y, 0, 0, undefined, undefined, dir < 0);
  }
}

/** Marrow Hollow before sunrise: one window lit, which is the whole point. */
function shotTown(r: Renderer, t: number, p: number): void {
  sky(r, '#121936', '#7a6a86', 0, 88, 14);
  sky(r, '#8a7080', '#c08a6a', 88, 100, 4);

  const stars = series(60, 8080);
  for (let i = 0; i < 30; i++) {
    const a = Math.max(0, 1 - p * 1.3) * (0.4 + 0.6 * Math.sin(t * 0.04 + i));
    if (a <= 0.2) continue;
    r.rect(stars[i]! * SCREEN_W, stars[i + 30]! * 56, 1, 1, `rgba(255,255,255,${a.toFixed(2)})`);
  }

  // The sea beyond the roofs, catching the first of the light.
  r.rect(0, 100, SCREEN_W, 14, '#22385a');
  for (let i = 0; i < 6; i++) {
    const x = ((t * 0.3 + i * 52) % (SCREEN_W + 40)) - 20;
    r.rect(x, 102 + (i % 4) * 3, 10, 1, 'rgba(190,150,140,0.28)');
  }
  r.rect(0, 112, SCREEN_W, 4, '#16202f');

  // The town. Walls first, then gables over them: a roof that narrows downward
  // is a tent, and that is what the first draft of this shot looked like.
  const houses: { x: number; w: number; y: number; roof: string; lit: boolean }[] = [
    { x: 8, w: 34, y: 124, roof: '#7a4228', lit: false },
    { x: 48, w: 30, y: 128, roof: '#39557e', lit: false },
    { x: 96, w: 44, y: 118, roof: '#8a4a2c', lit: true },
    { x: 152, w: 32, y: 126, roof: '#39557e', lit: false },
    { x: 194, w: 36, y: 130, roof: '#7a4228', lit: false },
  ];
  r.rect(0, 114, SCREEN_W, SCREEN_H - 114, '#1a2130');

  for (const h of houses) {
    const wallTop = h.y;
    r.rect(h.x, wallTop, h.w, SCREEN_H - wallTop, '#2a2b3a');
    r.rect(h.x, wallTop, 2, SCREEN_H - wallTop, '#343646');
    // Gable: widening as it comes down, ending flush with the wall.
    const peak = wallTop - Math.round(h.w * 0.42);
    for (let y = peak; y <= wallTop; y++) {
      const k = (y - peak) / (wallTop - peak);
      const half = Math.round((h.w / 2 + 3) * k);
      r.rect(h.x + h.w / 2 - half, y, half * 2, 1, y > wallTop - 2 ? '#1c1c26' : h.roof);
    }
    r.rect(h.x - 3, wallTop, h.w + 6, 2, '#1c1c26');

    if (h.lit) {
      const flicker = 0.72 + 0.28 * Math.sin(t * 0.18);
      const wx = h.x + Math.round(h.w * 0.55);
      const wy = wallTop + 6;
      r.ellipsePixel((wx + 3) * DETAIL, (wy + 4) * DETAIL, 20 * DETAIL, 16 * DETAIL,
        'rgba(255,196,110,0.06)');
      r.rect(wx, wy, 7, 8, `rgba(255,214,128,${flicker.toFixed(2)})`);
      r.rect(wx, wy, 7, 1, 'rgba(255,242,196,0.92)');
      r.rect(wx + 3, wy, 1, 8, 'rgba(120,80,40,0.7)');
      r.rect(wx, wy + 4, 7, 1, 'rgba(120,80,40,0.7)');
    } else {
      r.rect(h.x + 6, wallTop + 7, 5, 6, '#1b2434');
    }
  }

  // A lane running out of frame, so the town has somewhere to lead.
  for (let y = 140; y < SCREEN_H; y++) {
    const w = 6 + (y - 140) * 1.6;
    r.rect(SCREEN_W / 2 - w / 2, y, w, 1, '#3a3324');
  }

  // One flyer heading out over the water, small enough to be a promise.
  const fx = -20 + p * (SCREEN_W + 40);
  r.image(kin('pipwing', 16, '#0d1524'), fx, 70 - Math.sin(p * Math.PI) * 10);
}

const SHOTS: Shot[] = [
  {
    frames: 400,
    caption: 'Veldras. A ring of land around a sea with no bottom.',
    draw: shotSea,
  },
  {
    frames: 380,
    caption: 'Every seventy years the Hollow Sea turns over.',
    draw: shotPlains,
  },
  {
    frames: 400,
    caption: 'The kin have crossed it longer than anyone has counted.',
    draw: shotDeep,
  },
  {
    frames: 340,
    caption: 'The turning is due. One house on the north shore still has a light on.',
    draw: shotTown,
  },
];

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
    const fadeIn = 40;
    const fadeOut = 40;
    if (this.t < fadeIn) this.veil = 1 - this.t / fadeIn;
    else if (this.t > shot.frames - fadeOut) this.veil = (this.t - (shot.frames - fadeOut)) / fadeOut;
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

    // Letterbox. Cheap, and it tells the player at a glance that this is not a
    // screen they are meant to be pressing buttons at.
    r.rect(0, 0, SCREEN_W, 14, '#05070d');
    r.rect(0, SCREEN_H - 22, SCREEN_W, 22, '#05070d');

    // Captions hold still while the picture moves, and fade with the shot.
    const hold = Math.min(1, this.t / 50) * Math.min(1, (shot.frames - this.t) / 50);
    if (hold > 0.02) {
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

    if (this.shot === 0 && this.t < 220 && Math.floor(this.t / 30) % 2 === 0) {
      r.text('ENTER TO SKIP', SCREEN_W - 6, 4, { color: '#6d7893', align: 'right' });
    }

    if (this.veil > 0) r.tint('#05070d', this.veil);
  }
}
