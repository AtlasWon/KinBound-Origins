/**
 * Kin sprites.
 *
 * Creature art is generated from a body plan plus the species palette. Each
 * species declares a plan (quadruped, bird, arachnid, ...) and a scale; the
 * generator builds a 1-bit mask from primitives, runs a directional shading
 * pass over it, then wraps the whole silhouette in a hard 1px outline.
 *
 * This is not a substitute for a hand-drawn set, but it obeys the same rules a
 * hand-drawn set would -- 64x64 cells, five colours, no anti-aliasing, light
 * from the upper left -- so 200 creatures can exist, be readable and be
 * distinguishable long before an artist touches them. Every sprite is
 * deterministic: the same species id always produces the same animal.
 */

import { Rng } from '../core/rng.js';
import { registry } from '../data/registry.js';
import type { SpeciesData } from '../data/schema.js';

export const SPRITE_SIZE = 128;
export const ICON_SIZE = 64;

/**
 * Body plans are composed at 64x64 and the mask is then doubled with EPX before
 * shading. Authoring at design resolution keeps the proportions that were tuned
 * there, while every pass that actually makes a sprite look drawn -- the rim
 * light, the five-tone ramp, the outline, the eye glint -- runs at the final
 * density, where a pixel is a pixel rather than a 2x2 block.
 */
const DESIGN = 64;

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

  /** Shift so the creature sits on the ground line and is horizontally centred. */
  settle(groundY: number): void {
    const b = this.bounds();
    if (!b) return;
    const cx = Math.round((b.x0 + b.x1) / 2);
    const dx = Math.round(this.w / 2 - cx);
    const dy = groundY - b.y1;
    if (dx === 0 && dy === 0) return;
    const next = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const v = this.get(x, y);
        if (v === EMPTY) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
        next[ny * this.w + nx] = v;
      }
    }
    this.data = next;
  }
}

/* ------------------------------------------------------------- shading */

/** 4x4 ordered dither, used to break the boundaries between tone bands. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const ditherOn = (x: number, y: number, level: number): boolean =>
  BAYER[y & 3]![x & 3]! < level * 16;

/**
 * Light from the upper left, as a five-tone ramp.
 *
 * For every body pixel the pass measures how far the silhouette continues
 * towards the light and how far away from it. Close to the lit edge is
 * highlight, a little further is light, the far side falls to shade and then to
 * deep. The two outer boundaries are dithered so the bands read as a gradient
 * rather than as contour lines -- exactly the trick the era used, because a
 * real gradient was never an option.
 */
function shade(mask: Mask): void {
  const src = mask.data.slice();
  const at = (x: number, y: number): number => {
    if (x < 0 || y < 0 || x >= mask.w || y >= mask.h) return EMPTY;
    return src[y * mask.w + x]!;
  };
  const solid = (x: number, y: number): boolean => {
    const v = at(x, y);
    return v !== EMPTY && v !== OUTLINE;
  };
  /** How many steps the body continues in a direction, capped. */
  const ray = (x: number, y: number, dx: number, dy: number, max: number): number => {
    let d = 0;
    while (d < max && solid(x + dx * (d + 1), y + dy * (d + 1))) d++;
    return d;
  };

  // Ground contact: the last few rows of the silhouette sit in occlusion.
  let floor = 0;
  for (let y = mask.h - 1; y >= 0 && floor === 0; y--) {
    for (let x = 0; x < mask.w; x++) if (solid(x, y)) { floor = y; break; }
  }

  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      const v = at(x, y);
      if (v !== BASE && v !== ACCENT) continue;

      const up = ray(x, y, -1, -1, 12);
      const down = ray(x, y, 1, 1, 12);

      if (v === ACCENT) {
        // Accents carry a two-step ramp; a full five would drown the hue.
        if (down <= 2 || (down <= 4 && !ditherOn(x, y, 0.5))) mask.set(x, y, ACCENT_DARK);
        continue;
      }

      let out = BASE;
      if (up === 0) out = SPEC;
      else if (up <= 2) out = HILIGHT;
      else if (up <= 4) out = LIGHT;
      else if (up <= 7) out = ditherOn(x, y, 0.55) ? LIGHT : BASE;
      else if (down <= 1) out = DEEP;
      else if (down <= 4) out = SHADE;
      else if (down <= 7) out = ditherOn(x, y, 0.45) ? SHADE : BASE;

      // Occlusion where the body meets the ground.
      if (floor > 0 && y >= floor - 4 && out !== HILIGHT) {
        out = y >= floor - 2 ? DEEP : SHADE;
      }
      mask.set(x, y, out);
    }
  }
}

/**
 * EPX/Scale2x: doubles the mask while rounding corners instead of squaring
 * them. Running this before the shading and outline passes is what buys the
 * higher density real detail rather than four times as many big pixels.
 */
function upscale(src: Mask): Mask {
  const out = new Mask(src.w * 2, src.h * 2);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const P = src.get(x, y);
      const A = src.get(x, y - 1);
      const B = src.get(x + 1, y);
      const C = src.get(x - 1, y);
      const D = src.get(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      out.set(x * 2, y * 2, e0);
      out.set(x * 2 + 1, y * 2, e1);
      out.set(x * 2, y * 2 + 1, e2);
      out.set(x * 2 + 1, y * 2 + 1, e3);
    }
  }
  return out;
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
function appendages(mask: Mask, seed: string): void {
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

  const eye = pendingEyes[0];
  const faceX = eye ? eye.x : Math.round((x0 + x1) / 2);
  const faceY = eye ? eye.y : y0 + Math.round((y1 - y0) * 0.2);
  const faceR = eye ? Math.max(3, eye.spread + eye.size * 2) : Math.round(w * 0.22);

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
      const len = Math.max(3, Math.round(faceR * 0.9));
      for (const side of [-1, 1]) {
        const bx = faceX + side * Math.round(faceR * 0.55);
        const by = crown(bx);
        if (by < 0) continue;
        for (let i = 0; i < len; i++) {
          const t = i / len;
          const x = Math.round(bx + side * t * faceR * 0.5);
          const y = by - 1 - i;
          const half = Math.max(0, Math.round((1 - t) * 1.6));
          for (let d = -half; d <= half; d++) mask.set(x + d, y, ACCENT);
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
        const hgt = 2 + rng.below(3);
        for (let i = 0; i < hgt; i++) {
          const half = Math.max(0, 1 - Math.floor(i / 2));
          for (let d = -half; d <= half; d++) mask.set(x + d, top - 1 - i, ACCENT);
        }
      }
      break;
    }
    case 'antennae': {
      for (const side of [-1, 1]) {
        const bx = faceX + side * Math.round(faceR * 0.4);
        const by = crown(bx);
        if (by < 0) continue;
        const len = Math.max(4, Math.round(faceR * 1.3));
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
      }
      break;
    }
    case 'eartufts': {
      for (const side of [-1, 1]) {
        const bx = faceX + side * Math.round(faceR * 0.85);
        const by = crown(bx);
        if (by < 0) continue;
        for (let i = 0; i < 4; i++) {
          const half = Math.max(0, 2 - i);
          for (let d = -half; d <= half; d++) mask.set(bx + d, by - 1 - i, ACCENT);
        }
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
function markings(mask: Mask, seed: string): void {
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
  const eye = pendingEyes[0];
  const faceY = eye ? eye.y : y0 + Math.round(h * 0.22);
  const faceR = eye ? Math.max(3, eye.spread + eye.size * 2) : Math.round(w * 0.22);
  const faceX = eye ? eye.x : x0 + Math.round(w * 0.5);
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
}

/**
 * Inner rim light.
 *
 * A single bright pixel run along the edges that face the light. This is the
 * highest-value pass in the whole generator: it separates the creature from
 * whatever it is standing on, and it is the difference between a flat cutout
 * and something that looks like it has a surface.
 */
function rimLight(mask: Mask): void {
  const src = mask.data.slice();
  const filled = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= mask.w || y >= mask.h) return false;
    const v = src[y * mask.w + x]!;
    return v !== EMPTY && v !== OUTLINE && v !== SHADOW;
  };
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      const v = src[y * mask.w + x]!;
      if (v !== BASE && v !== LIGHT && v !== HILIGHT && v !== SPEC) continue;
      // Only edges whose outward direction points up and left.
      const openUp = !filled(x, y - 1);
      const openLeft = !filled(x - 1, y);
      const openUpLeft = !filled(x - 1, y - 1);
      if (openUp || openLeft || (openUpLeft && !openUp && !openLeft)) {
        mask.set(x, y, SPEC);
      }
    }
  }
}

/** Wrap the whole silhouette in a hard 1px outline. */
function outline(mask: Mask): void {
  const src = mask.data.slice();
  const solid = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= mask.w || y >= mask.h) return false;
    const v = src[y * mask.w + x]!;
    return v !== EMPTY && v !== OUTLINE;
  };
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      if (solid(x, y)) continue;
      const touching =
        solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1) ||
        solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1);
      if (!touching) continue;
      // The light side of the outline carries some of the body colour, so the
      // silhouette does not read as a uniform marker-pen border.
      const litSide = solid(x + 1, y) || solid(x, y + 1) || solid(x + 1, y + 1);
      const darkSide = solid(x - 1, y) || solid(x, y - 1);
      mask.set(x, y, litSide && !darkSide ? OUTLINE_LIT : OUTLINE);
    }
  }
}

/**
 * Contact shadow.
 *
 * Drawn last and only into empty cells, so it is never outlined. Without it a
 * sprite floats over whatever it is standing on no matter how well it is lit.
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

  const cx = (x0 + x1) / 2;
  const rx = (x1 - x0) * 0.55;
  const ry = Math.max(3, rx * 0.17);
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue;
      mask.under(Math.round(cx + x), Math.round(floor - 1 + y), SHADOW);
    }
  }
}

/* --------------------------------------------------------------- eyes */

interface EyeSpot { x: number; y: number; spread: number; size: number; angry: boolean }

/**
 * Eyes are the one feature a viewer reads first and forgives least, so they are
 * recorded here and drawn after the mask is doubled -- at design resolution a
 * pupil is one pixel, and doubling one pixel gives a blank square rather than
 * an eye.
 */
let pendingEyes: EyeSpot[] = [];

function eyes(mask: Mask, cx: number, cy: number, spread: number, size: number, angry: boolean): void {
  pendingEyes.push({ x: cx, y: cy, spread, size, angry });
  void mask;
}

/**
 * Draw a recorded pair at full resolution.
 *
 * The proportions matter more than the size: a mostly-dark eye with a single
 * bright glint reads as an animal looking at you, while a mostly-white eye with
 * a dot in it reads as a doll. The pupil sits slightly inboard so both eyes
 * converge on the viewer.
 */
function drawEyes(mask: Mask, spots: EyeSpot[], scale: number): void {
  for (const s of spots) {
    const cy = s.y * scale;
    const spread = s.spread * scale;
    const r = Math.max(2.5, s.size * scale * 0.85);

    for (const side of [-1, 1]) {
      const ex = s.x * scale + side * spread;

      // Socket: a hard rim so the eye separates from any body colour.
      mask.ellipse(ex, cy, r + 1.2, r * 1.25 + 1.2, OUTLINE);
      // The eye itself, dark, with a thin lit rim along the bottom.
      mask.ellipse(ex, cy, r, r * 1.25, EYE_DARK);
      mask.ellipse(ex, cy + r * 0.45, r * 0.75, r * 0.5, EYE_WHITE);
      mask.ellipse(ex - side * r * 0.15, cy + r * 0.15, r * 0.8, r * 0.95, EYE_DARK);
      // Glint, up and towards the light.
      mask.ellipse(ex - r * 0.38, cy - r * 0.45, Math.max(1, r * 0.32), Math.max(1, r * 0.32), EYE_WHITE);

      if (s.angry) {
        // A heavy slanted brow: the cheapest way to say predator.
        const bh = Math.max(1, Math.round(r * 0.45));
        for (let i = 0; i <= Math.round(r * 2.4); i++) {
          const bx = Math.round(ex - side * r * 1.2 + side * i);
          const by = Math.round(cy - r * 1.5 - i * 0.35);
          mask.box(bx, by, bx, by + bh, ACCENT_DARK);
        }
      }
    }
  }
}

/* ---------------------------------------------------------- body plans */

interface PlanCtx {
  m: Mask;
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

  // Cub proportions: small species get a head nearly as wide as the body.
  const headR = Math.round(7 + s * 5 + (1 - s) * 3);
  const headCx = cx - Math.round(bodyRx * 0.42);
  const headCy = bodyCy - bodyRy - Math.round(headR * 0.45);

  // Rear legs go down first and darker, so they sit behind the body.
  for (const side of [-1, 1]) {
    const lx = cx + side * Math.round(bodyRx * 0.62) + Math.round(bodyRx * 0.22);
    m.limb(lx, bodyCy, lx + side, ground - 1, Math.round(4 + s * 3), Math.round(4 + s * 3), SHADE);
    m.box(lx - 3, ground - 1, lx + 3, ground, ACCENT_DARK);
  }

  m.ellipse(cx, bodyCy, bodyRx, bodyRy, BASE);
  // haunch, which gives the rump some mass
  m.ellipse(cx + Math.round(bodyRx * 0.55), bodyCy - 1,
    Math.round(bodyRx * 0.45), Math.round(bodyRy * 0.95), BASE);

  // Front legs on top of the body, planted under the chest.
  for (const side of [-1, 1]) {
    const lx = cx - Math.round(bodyRx * 0.5) + side * Math.round(3 + s * 4);
    m.limb(lx, bodyCy + Math.round(bodyRy * 0.3), lx, ground - 1,
      Math.round(4 + s * 3), Math.round(4 + s * 3), BASE);
    m.box(lx - 3, ground - 1, lx + 3, ground, ACCENT_DARK);
  }

  // Tail.
  const tailRootX = cx + bodyRx - 3;
  switch (tailStyle) {
    case 0: // short upright flick
      m.limb(tailRootX, bodyCy - 2, tailRootX + Math.round(4 + s * 3), bodyCy - Math.round(7 + s * 5),
        Math.round(4 + s * 2), 2, ACCENT);
      break;
    case 1: // long sweeping tail
      m.limb(tailRootX, bodyCy - 1, tailRootX + Math.round(8 + s * 8), bodyCy - Math.round(10 + s * 9),
        Math.round(4 + s * 3), 2, ACCENT);
      break;
    case 2: // bushy: a limb with a mass on the end
      m.limb(tailRootX, bodyCy - 1, tailRootX + Math.round(5 + s * 4), bodyCy - Math.round(6 + s * 5),
        Math.round(3 + s * 2), 2, ACCENT);
      m.ellipse(tailRootX + Math.round(7 + s * 6), bodyCy - Math.round(8 + s * 6),
        Math.round(5 + s * 4), Math.round(5 + s * 4), ACCENT);
      break;
    default: // stub
      m.ellipse(tailRootX + 3, bodyCy - 2, Math.round(3 + s * 2), Math.round(3 + s * 2), ACCENT);
  }

  // Head, set forward of the shoulders.
  m.ellipse(headCx, headCy, headR, Math.round(headR * 0.92), BASE);
  // muzzle pushed out to the front
  m.ellipse(headCx - Math.round(headR * 0.6), headCy + Math.round(headR * 0.28),
    Math.round(headR * 0.45), Math.round(headR * 0.35), LIGHT);

  // Ears.
  for (const side of [-1, 1]) {
    const ex = headCx + side * Math.round(headR * 0.62);
    const shade = side < 0 ? BASE : SHADE;
    switch (earStyle) {
      case 0: // pointed
        m.limb(ex, headCy - Math.round(headR * 0.7),
          ex + side * 2, headCy - headR - Math.round(3 + s * 4),
          Math.round(4 + s * 2), 2, shade);
        break;
      case 1: // long and swept back
        m.limb(ex, headCy - Math.round(headR * 0.6),
          ex + side * Math.round(5 + s * 4), headCy - headR - Math.round(6 + s * 6),
          Math.round(4 + s * 2), 2, shade);
        break;
      case 2: // round
        m.ellipse(ex + side * 2, headCy - Math.round(headR * 0.85),
          Math.round(3 + s * 3), Math.round(3 + s * 3), shade);
        break;
      default: // frilled: a fan of short spines
        for (let i = -1; i <= 1; i++) {
          m.limb(ex, headCy - Math.round(headR * 0.6),
            ex + side * (3 + i) , headCy - headR - Math.round(2 + s * 3), 3, 1, shade);
        }
    }
  }

  if (horned) {
    for (const side of [-1, 1]) {
      m.limb(headCx + side * Math.round(headR * 0.35), headCy - Math.round(headR * 0.8),
        headCx + side * Math.round(headR * 0.5), headCy - headR - Math.round(4 + s * 4),
        3, 1, ACCENT_DARK);
    }
  }

  if (!back) {
    eyes(m, headCx, headCy - 1, Math.round(headR * 0.42), s > 0.45 ? 3 : 2, s > 0.55);
    m.box(headCx - Math.round(headR * 0.7), headCy + Math.round(headR * 0.3),
      headCx - Math.round(headR * 0.5), headCy + Math.round(headR * 0.3), ACCENT_DARK);
  }
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
  m.limb(cx + Math.round(hipW * 0.6), hipY,
    cx + hipW + Math.round(9 + s * 9), hipY + Math.round(4 + s * 3),
    Math.round(5 + s * 4), 2, ACCENT);

  // Digitigrade legs: thigh forward, shin back, foot forward again.
  for (const side of [-1, 1]) {
    const lx = cx + side * Math.round(hipW * 0.7);
    const kneeX = lx - Math.round(2 + s * 2);
    const kneeY = hipY + Math.round(legLen * 0.42);
    const hockX = lx + Math.round(2 + s * 2);
    const hockY = hipY + Math.round(legLen * 0.75);
    m.limb(lx, hipY, kneeX, kneeY, Math.round(6 + s * 4), Math.round(5 + s * 3), BASE);
    m.limb(kneeX, kneeY, hockX, hockY, Math.round(5 + s * 3), Math.round(4 + s * 2), BASE);
    m.limb(hockX, hockY, hockX - Math.round(1 + s), ground - 1, Math.round(4 + s * 2), Math.round(4 + s * 2), SHADE);
    m.box(hockX - Math.round(4 + s * 2), ground - 1, hockX + Math.round(3 + s * 2), ground, ACCENT_DARK);
  }

  // Wedge torso: wide at the shoulders, narrow at the hips.
  for (let y = shoulderY; y <= hipY; y++) {
    const t = (y - shoulderY) / Math.max(1, hipY - shoulderY);
    const w = Math.round(shoulderW + (hipW - shoulderW) * t);
    m.box(cx - w, y, cx + w, y, BASE);
  }
  // Belly plate.
  m.ellipse(cx, hipY - Math.round(torsoH * 0.35),
    Math.round(hipW * 0.9), Math.round(torsoH * 0.35), LIGHT);

  // Arms cocked, elbows back: a ready stance, not a T-pose.
  for (const side of [-1, 1]) {
    const ax = cx + side * shoulderW;
    const elbowX = ax + side * Math.round(4 + s * 4);
    const elbowY = shoulderY + Math.round(torsoH * 0.45);
    m.limb(ax, shoulderY + 2, elbowX, elbowY, Math.round(5 + s * 4), Math.round(4 + s * 3), BASE);
    m.limb(elbowX, elbowY, ax + side * Math.round(2 + s * 2), shoulderY + Math.round(torsoH * 0.2),
      Math.round(4 + s * 3), Math.round(5 + s * 3), BASE);
    // fist
    m.ellipse(ax + side * Math.round(2 + s * 2), shoulderY + Math.round(torsoH * 0.2),
      Math.round(3 + s * 2), Math.round(3 + s * 2), ACCENT);
  }

  // Head carried forward of the shoulders.
  const headR = Math.round(6 + s * 4);
  const headCx = cx - Math.round(2 + s * 3);
  const headCy = shoulderY - Math.round(headR * 0.75);
  m.ellipse(headCx, headCy, headR, Math.round(headR * 0.9), BASE);
  // snout
  m.ellipse(headCx - Math.round(headR * 0.75), headCy + Math.round(headR * 0.25),
    Math.round(headR * 0.5), Math.round(headR * 0.38), LIGHT);
  // swept-back crest
  m.limb(headCx + Math.round(headR * 0.3), headCy - headR + 1,
    headCx + Math.round(headR * 1.2), headCy - headR - Math.round(5 + s * 5), 5, 1, ACCENT);

  if (!back) {
    eyes(m, headCx, headCy - 1, Math.round(headR * 0.45), 3, true);
    m.box(headCx - Math.round(headR * 0.95), headCy + Math.round(headR * 0.28),
      headCx - Math.round(headR * 0.7), headCy + Math.round(headR * 0.28), ACCENT_DARK);
  }
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
    m.limb(lx, hipY - 2, lx + side * 2, ground - 2, Math.round(10 + s * 5), Math.round(9 + s * 4), BASE);
    m.box(lx + side * 2 - Math.round(6 + s * 3), ground - 2, lx + side * 2 + Math.round(6 + s * 3), ground, ACCENT_DARK);
  }

  // Torso: an inverted wedge, widest at the shoulders.
  for (let y = shoulderY; y <= hipY; y++) {
    const t = (y - shoulderY) / Math.max(1, hipY - shoulderY);
    const w = Math.round(shoulderW + (hipW - shoulderW) * t);
    m.box(cx - w, y, cx + w, y, BASE);
  }
  // Slab plates over the shoulders.
  m.box(cx - shoulderW + 1, shoulderY, cx + shoulderW - 1, shoulderY + Math.round(4 + s * 3), ACCENT);
  m.ellipse(cx, hipY - Math.round(torsoH * 0.3), Math.round(hipW * 0.8), Math.round(torsoH * 0.3), LIGHT);

  // Long arms reaching the ground, knuckles planted.
  for (const side of [-1, 1]) {
    const ax = cx + side * (shoulderW - 1);
    const elbowX = ax + side * Math.round(4 + s * 4);
    m.limb(ax, shoulderY + 3, elbowX, hipY, Math.round(9 + s * 5), Math.round(8 + s * 4), BASE);
    m.limb(elbowX, hipY, elbowX + side, ground - 2, Math.round(8 + s * 4), Math.round(7 + s * 3), SHADE);
    m.ellipse(elbowX + side, ground - 3, Math.round(5 + s * 3), Math.round(4 + s * 2), ACCENT);
  }

  // Small head, sunk between the shoulders.
  const headR = Math.round(6 + s * 3);
  const headCy = shoulderY - Math.round(headR * 0.35);
  m.ellipse(cx, headCy, Math.round(headR * 1.1), Math.round(headR * 0.85), BASE);
  // heavy brow
  m.box(cx - headR, headCy - Math.round(headR * 0.4), cx + headR, headCy - Math.round(headR * 0.15), SHADE);
  // horns
  for (const side of [-1, 1]) {
    m.limb(cx + side * headR, headCy - 2,
      cx + side * (headR + Math.round(4 + s * 4)), headCy - Math.round(7 + s * 5), 4, 1, ACCENT);
  }

  if (!back) {
    eyes(m, cx, headCy + 1, Math.round(headR * 0.5), 2, true);
    m.box(cx - 3, headCy + Math.round(headR * 0.5), cx + 3, headCy + Math.round(headR * 0.5), ACCENT_DARK);
  }
}

function planCritter(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const bodyR = Math.round(8 + s * 8);
  const bodyCy = ground - bodyR - 3;
  m.ellipse(cx, bodyCy, bodyR, Math.round(bodyR * 0.9), BASE);

  for (const side of [-1, 1]) {
    const lx = cx + side * Math.round(bodyR * 0.5);
    m.limb(lx, bodyCy + bodyR - 3, lx, ground, 4, 4, BASE);
  }

  const headR = Math.round(7 + s * 6);
  const headCy = bodyCy - bodyR - headR + Math.round(5 + s * 3);
  m.ellipse(cx, headCy, headR, Math.round(headR * 0.95), BASE);

  // oversized ears: the whole read of a small critter
  for (const side of [-1, 1]) {
    const ex = cx + side * Math.round(headR * 0.65);
    m.ellipse(ex + side * 2, headCy - headR - Math.round(2 + s * 4),
      Math.round(3 + s * 2), Math.round(5 + s * 4), BASE);
    m.ellipse(ex + side * 2, headCy - headR - Math.round(2 + s * 4),
      Math.round(1 + s * 1), Math.round(3 + s * 2), ACCENT);
  }

  m.limb(cx + bodyR - 2, bodyCy, cx + bodyR + Math.round(8 + s * 6), bodyCy - Math.round(4 + s * 4), 3, 2, ACCENT);

  if (!back) {
    eyes(m, cx, headCy, Math.round(headR * 0.42), 3, false);
    m.box(cx - 1, headCy + Math.round(headR * 0.5), cx + 1, headCy + Math.round(headR * 0.5), ACCENT_DARK);
  }
}

function planBird(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const bodyRx = Math.round(7 + s * 8);
  const bodyRy = Math.round(9 + s * 9);
  const legLen = Math.round(5 + s * 7);
  const bodyCy = ground - legLen - bodyRy + 2;

  for (const side of [-1, 1]) {
    const lx = cx + side * 3;
    m.limb(lx, bodyCy + bodyRy - 2, lx, ground - 1, 2, 2, ACCENT_DARK);
    m.box(lx - 2, ground, lx + 2, ground, ACCENT_DARK);
  }

  m.ellipse(cx, bodyCy, bodyRx, bodyRy, BASE);

  // wings sweeping back
  for (const side of [-1, 1]) {
    const wx = cx + side * bodyRx;
    m.limb(wx, bodyCy - Math.round(bodyRy * 0.4),
      wx + side * Math.round(6 + s * 9), bodyCy + Math.round(bodyRy * 0.6),
      Math.round(6 + s * 5), Math.round(3 + s * 3), back ? BASE : ACCENT);
  }

  // tail
  m.limb(cx, bodyCy + bodyRy - 3, cx, ground - 2, Math.round(6 + s * 4), Math.round(4 + s * 3), ACCENT);

  const headR = Math.round(5 + s * 4);
  const headCy = bodyCy - bodyRy - headR + 3;
  m.ellipse(cx, headCy, headR, headR, BASE);
  if (s > 0.4) {
    // crest
    m.limb(cx - 1, headCy - headR + 1, cx - Math.round(3 + s * 4), headCy - headR - Math.round(4 + s * 4), 3, 1, ACCENT);
  }
  if (!back) {
    eyes(m, cx, headCy - 1, Math.round(headR * 0.5), 2, s > 0.4);
    // beak
    m.limb(cx, headCy + 1, cx, headCy + headR + Math.round(2 + s * 2), 4, 1, ACCENT_DARK);
  }
}

function planGrub(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const segments = 4;
  const rx = Math.round(6 + s * 6);
  const ry = Math.round(5 + s * 5);
  const cy = ground - ry - 1;
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const sx = cx - Math.round((segments - 1) * rx * 0.55) + Math.round(i * rx * 1.1);
    const r = Math.round(rx * (0.6 + 0.4 * (1 - Math.abs(t - 0.35))));
    m.ellipse(sx, cy, r * 0.75, ry, i % 2 === 0 ? BASE : ACCENT);
    // bristles
    m.limb(sx, cy - ry, sx - 2, cy - ry - Math.round(3 + s * 4), 2, 1, ACCENT_DARK);
  }
  const headCx = cx - Math.round((segments - 1) * rx * 0.55) - Math.round(rx * 0.4);
  m.ellipse(headCx, cy, Math.round(rx * 0.8), Math.round(ry * 1.05), BASE);
  if (!back) eyes(m, headCx, cy - 1, 2, 2, false);
}

function planArachnid(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const abdRx = Math.round(9 + s * 9);
  const abdRy = Math.round(8 + s * 8);
  const legSpan = Math.round(12 + s * 12);
  const cy = ground - abdRy - Math.round(4 + s * 4);

  // eight legs, four each side, arched
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const spread = 0.5 + i * 0.28;
      const kneeX = cx + side * Math.round(legSpan * spread * 0.6);
      const kneeY = cy - Math.round(6 + s * 5) + i * 2;
      const footX = cx + side * Math.round(legSpan * spread);
      m.limb(cx, cy, kneeX, kneeY, 3, 3, ACCENT_DARK);
      m.limb(kneeX, kneeY, footX, ground, 3, 2, ACCENT_DARK);
    }
  }

  m.ellipse(cx + Math.round(abdRx * 0.4), cy, abdRx, abdRy, BASE);
  const headR = Math.round(5 + s * 4);
  const headCx = cx - Math.round(abdRx * 0.7);
  m.ellipse(headCx, cy, headR, Math.round(headR * 0.9), ACCENT);
  if (!back) {
    // a cluster of small eyes
    for (const dy of [-2, 1]) {
      for (const dx of [-2, 0, 2]) m.set(headCx + dx, cy + dy, EYE_DARK);
    }
    // jaws
    for (const side of [-1, 1]) {
      m.limb(headCx - 2, cy + 2, headCx - Math.round(4 + s * 3), cy + 4 + side, 2, 1, ACCENT_DARK);
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
    m.ellipse(cx + dx, ground - R * 0.7 + dy, r, Math.round(r * 0.85), i % 2 ? BASE : ACCENT);
  }
  m.ellipse(cx, ground - Math.round(R * 0.7), R, Math.round(R * 0.8), BASE, true);
  // a quartz seam
  m.limb(cx - Math.round(R * 0.5), ground - Math.round(R * 1.1),
    cx + Math.round(R * 0.4), ground - Math.round(R * 0.4), 3, 2, LIGHT);
  // stubby limbs
  for (const side of [-1, 1]) {
    m.limb(cx + side * Math.round(R * 0.7), ground - Math.round(R * 0.5),
      cx + side * Math.round(R * 0.85), ground, 5, 5, ACCENT);
  }
  if (!back) eyes(m, cx, ground - Math.round(R * 0.85), Math.round(R * 0.32), 2, true);
}

function planMonolith(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const w = Math.round(9 + s * 8);
  const h = Math.round(22 + s * 22);
  m.box(cx - w, ground - h, cx + w, ground, BASE);
  // chamfered top corners
  for (let i = 0; i < 4; i++) {
    m.box(cx - w, ground - h + i, cx - w + (3 - i), ground - h + i, EMPTY);
    m.box(cx + w - (3 - i), ground - h + i, cx + w, ground - h + i, EMPTY);
  }
  // ore veins
  for (let i = 0; i < 3; i++) {
    const y = ground - h + Math.round(h * (0.25 + i * 0.22));
    m.limb(cx - w + 2, y, cx + w - 2, y + 3, 2, 2, ACCENT);
  }
  // arms
  for (const side of [-1, 1]) {
    m.limb(cx + side * w, ground - Math.round(h * 0.6),
      cx + side * (w + Math.round(4 + s * 4)), ground - Math.round(h * 0.2), 6, 5, BASE);
  }
  if (!back) {
    eyes(m, cx, ground - Math.round(h * 0.78), Math.round(w * 0.42), 2, true);
    m.box(cx - 3, ground - Math.round(h * 0.68), cx + 3, ground - Math.round(h * 0.68), ACCENT_DARK);
  }
}

function planOrb(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const R = Math.round(9 + s * 9);
  const cy = ground - R - Math.round(4 + s * 6);
  m.ellipse(cx, cy, R, R, BASE);
  // filaments radiating out
  const spikes = 8;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 + 0.3;
    const len = R + Math.round(5 + s * 8);
    m.limb(cx + Math.round(Math.cos(a) * R * 0.8), cy + Math.round(Math.sin(a) * R * 0.8),
      cx + Math.round(Math.cos(a) * len), cy + Math.round(Math.sin(a) * len), 3, 1, ACCENT);
  }
  if (!back) {
    eyes(m, cx, cy - 1, Math.round(R * 0.4), 3, false);
    m.box(cx - 2, cy + Math.round(R * 0.45), cx + 2, cy + Math.round(R * 0.45), ACCENT_DARK);
  }
}

function planFish(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const rx = Math.round(12 + s * 12);
  const ry = Math.round(6 + s * 6);
  const cy = ground - ry - Math.round(6 + s * 6);
  m.ellipse(cx, cy, rx, ry, BASE);
  // tail fin
  m.limb(cx + rx - 2, cy, cx + rx + Math.round(7 + s * 7), cy - Math.round(6 + s * 5), 3, Math.round(6 + s * 4), ACCENT);
  m.limb(cx + rx - 2, cy, cx + rx + Math.round(7 + s * 7), cy + Math.round(6 + s * 5), 3, Math.round(6 + s * 4), ACCENT);
  // dorsal
  m.limb(cx - 2, cy - ry + 1, cx + 2, cy - ry - Math.round(5 + s * 5), Math.round(8 + s * 4), 2, ACCENT);
  // pectoral
  m.limb(cx - Math.round(rx * 0.2), cy + 1, cx - Math.round(rx * 0.4), cy + ry + Math.round(4 + s * 3), 5, 2, ACCENT);
  if (!back) {
    eyes(m, cx - Math.round(rx * 0.55), cy - 1, 0, 3, false);
    m.box(cx - rx + 2, cy + 2, cx - rx + 5, cy + 3, ACCENT_DARK);
  }
}

function planMoth(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const bodyRy = Math.round(9 + s * 8);
  const cy = ground - bodyRy - Math.round(5 + s * 6);
  // wings first, body on top
  for (const side of [-1, 1]) {
    const wr = Math.round(11 + s * 11);
    m.ellipse(cx + side * Math.round(wr * 0.75), cy - Math.round(3 + s * 3), wr, Math.round(wr * 0.8), ACCENT);
    m.ellipse(cx + side * Math.round(wr * 0.62), cy + Math.round(6 + s * 5),
      Math.round(wr * 0.6), Math.round(wr * 0.5), BASE);
    // eyespot
    m.ellipse(cx + side * Math.round(wr * 0.8), cy - Math.round(3 + s * 3), 3, 3, ACCENT_DARK);
  }
  m.ellipse(cx, cy, Math.round(4 + s * 3), bodyRy, BASE);
  const headR = Math.round(4 + s * 2);
  m.ellipse(cx, cy - bodyRy - headR + 3, headR, headR, BASE);
  // antennae
  for (const side of [-1, 1]) {
    m.limb(cx + side, cy - bodyRy - headR, cx + side * Math.round(7 + s * 5),
      cy - bodyRy - headR - Math.round(7 + s * 5), 2, 1, ACCENT_DARK);
  }
  if (!back) eyes(m, cx, cy - bodyRy - headR + 3, 2, 2, false);
}

function planAquatic(c: PlanCtx): void {
  const { m, s, back, ground, cx } = c;
  const rx = Math.round(13 + s * 11);
  const ry = Math.round(9 + s * 8);
  const cy = ground - ry - 3;
  m.ellipse(cx, cy, rx, ry, BASE);
  // fluked tail
  m.limb(cx + rx - 3, cy, cx + rx + Math.round(6 + s * 6), cy - 2, 6, 4, BASE);
  m.limb(cx + rx + Math.round(5 + s * 5), cy - 2, cx + rx + Math.round(9 + s * 7), cy - Math.round(6 + s * 5), 3, 5, ACCENT);
  m.limb(cx + rx + Math.round(5 + s * 5), cy - 2, cx + rx + Math.round(9 + s * 7), cy + Math.round(5 + s * 4), 3, 5, ACCENT);
  // flippers
  for (const side of [-1, 1]) {
    m.limb(cx - Math.round(rx * 0.25), cy + Math.round(ry * 0.5),
      cx - Math.round(rx * 0.5), ground, Math.round(6 + s * 3), Math.round(4 + s * 2), ACCENT);
    void side;
  }
  const headR = Math.round(7 + s * 5);
  const headCx = cx - rx + Math.round(2 + s * 2);
  m.ellipse(headCx, cy - Math.round(ry * 0.35), headR, Math.round(headR * 0.85), BASE);
  if (!back) {
    eyes(m, headCx, cy - Math.round(ry * 0.5), Math.round(headR * 0.5), 3, false);
    m.box(headCx - headR, cy - Math.round(ry * 0.1), headCx - Math.round(headR * 0.2), cy - Math.round(ry * 0.1) + 1, ACCENT_DARK);
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
  m.ellipse(cx - Math.round(amp * 0.4), ground - Math.round(thick * 0.9),
    Math.round(amp * 1.0), Math.round(thick * 0.6), BASE);

  // The S-curve itself.
  const steps = 34;
  let headX = cx, headY = ground - height;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = Math.round(ground - thick * 0.5 - t * height);
    const x = Math.round(cx + Math.sin(t * Math.PI * 1.6 + 0.4) * amp * (1 - t * 0.35));
    const w = Math.max(3, Math.round(thick * (1 - t * 0.42)));
    m.ellipse(x, y, Math.round(w / 2), Math.round(w / 2), i % 6 < 3 ? BASE : ACCENT);
    headX = x; headY = y;
  }

  // Dorsal fin running up the spine.
  for (let i = 4; i <= steps - 4; i += 2) {
    const t = i / steps;
    const y = Math.round(ground - thick * 0.5 - t * height);
    const x = Math.round(cx + Math.sin(t * Math.PI * 1.6 + 0.4) * amp * (1 - t * 0.35));
    m.limb(x, y, x - Math.round(4 + s * 3), y - Math.round(3 + s * 2), 2, 1, ACCENT);
  }

  const headR = Math.round(7 + s * 5);
  const hy = headY - Math.round(headR * 0.5);
  m.ellipse(headX, hy, Math.round(headR * 1.1), Math.round(headR * 0.8), BASE);
  // brow ridge
  m.ellipse(headX, hy - Math.round(headR * 0.5), Math.round(headR * 0.9), Math.round(headR * 0.35), LIGHT);

  // Crown fins.
  for (const side of [-1, 1]) {
    m.limb(headX + side * Math.round(headR * 0.8), hy - 1,
      headX + side * (headR + Math.round(6 + s * 6)), hy - Math.round(7 + s * 7),
      4, 1, ACCENT);
  }

  if (!back) {
    eyes(m, headX, hy, Math.round(headR * 0.5), 3, true);
    m.box(headX - 3, hy + Math.round(headR * 0.45), headX + 3, hy + Math.round(headR * 0.45), ACCENT_DARK);
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
  // The extra ramp steps are derived, so a species still declares only five
  // colours in its JSON and never has to hand-pick a highlight.
  const accentDark = mixHex(accent, outlineC, 0.45);
  const hilight = mixHex(lightC, '#ffffff', 0.42);
  const spec = mixHex(lightC, '#ffffff', 0.72);
  const deep = mixHex(shadeC, outlineC, 0.5);
  // A pure-black border looks traced. Bleeding a little body colour into the
  // outline, and more of it into the lit side, is what makes it read as ink.
  const outlineInk = mixHex(outlineC, base, 0.12);
  const outlineLit = mixHex(outlineC, lightC, 0.42);

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
      case EYE_WHITE: return '#f8f8fc';
      case EYE_DARK: return outlineC;
      case OUTLINE: return outlineInk;
      case OUTLINE_LIT: return outlineLit;
      case SHADOW: return 'rgba(18,22,30,0.20)';
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

  const design = new Mask();
  pendingEyes = [];
  const ctx: PlanCtx = { m: design, rng, s, back, ground: DESIGN - 4, cx: Math.floor(DESIGN / 2) };

  (PLAN_FNS[plan] ?? planQuadruped)(ctx);
  design.settle(DESIGN - 3);
  appendages(design, speciesId);
  markings(design, speciesId);

  // Silhouette first at design resolution, then everything that reads as
  // craftsmanship at the final one.
  const m = upscale(design);
  shade(m);
  drawEyes(m, pendingEyes, 2);
  pendingEyes = [];
  rimLight(m);
  outline(m);
  contactShadow(m);

  // The back view is the same animal seen from behind: mirrored, and the
  // generator has already suppressed the face.
  return maskToCanvas(m, paletteOf(sp), back);
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
