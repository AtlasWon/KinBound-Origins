/**
 * Overworld character sprites.
 *
 * 32x48 walkers covering 16x24 logical units: four facings, three frames each
 * (contact, passing, contact), played as a 4-step cycle so the walk reads as
 * left-right-left-right rather than a two-frame shuffle.
 *
 * Sprites are generated from a small palette description, which means an NPC
 * "sprite" is a handful of colours in JSON and a hundred townspeople never
 * become a hundred PNGs. Each frame is drawn into a scratch buffer and then run
 * through a silhouette outline pass, which is what gives every character the
 * same hard read against grass, stone or water without hand-drawing the border.
 */

import { DETAIL } from '../engine/renderer.js';

/** Frame size in buffer pixels. */
export const CHAR_W = 16 * DETAIL;
export const CHAR_H = 24 * DETAIL;
/** Frame size in logical units, for anything positioning in world space. */
export const CHAR_LW = CHAR_W / DETAIL;
export const CHAR_LH = CHAR_H / DETAIL;

export const DIRS = ['down', 'up', 'left', 'right'] as const;
export type CharDir = (typeof DIRS)[number];

export interface CharPalette {
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  top: string;
  topShade: string;
  legs: string;
  legsShade: string;
  shoes: string;
  outline: string;
  /** Optional hat/hood drawn over the hair. */
  hat?: string;
  hatShade?: string;
  /** Optional pack on the back, visible facing up. */
  pack?: string;
}

export const DEFAULT_PALETTES: Record<string, CharPalette> = {
  player: {
    skin: '#e8b48c', skinShade: '#c08a63',
    hair: '#4a3320', hairShade: '#31210f',
    top: '#c8543f', topShade: '#8f3a2b',
    legs: '#3f5478', legsShade: '#2b3c58',
    shoes: '#2a2a30', outline: '#1a1a22',
    hat: '#e8e0d0', hatShade: '#b8b0a0',
    pack: '#6a5a3a',
  },
  rival: {
    skin: '#f0c49c', skinShade: '#c89a70',
    hair: '#c8a04a', hairShade: '#9a7830',
    top: '#3f7a5c', topShade: '#2b5640',
    legs: '#4a4a58', legsShade: '#33333f',
    shoes: '#2a2a30', outline: '#1a1a22',
  },
  professor: {
    skin: '#e0aa84', skinShade: '#b8825e',
    hair: '#9a9aa8', hairShade: '#70707e',
    top: '#e8e8ee', topShade: '#b8b8c4',
    legs: '#5a5a68', legsShade: '#40404c',
    shoes: '#3a3038', outline: '#1a1a22',
  },
  villager_m: {
    skin: '#d8a078', skinShade: '#b07850',
    hair: '#5a3a24', hairShade: '#3d2614',
    top: '#5a7ab0', topShade: '#3f5880',
    legs: '#6a5a48', legsShade: '#4a3e30',
    shoes: '#3a3038', outline: '#1a1a22',
  },
  villager_f: {
    skin: '#eabb95', skinShade: '#c0916b',
    hair: '#7a3a30', hairShade: '#552620',
    top: '#c88ab0', topShade: '#9a6484',
    legs: '#8a6a90', legsShade: '#654c6a',
    shoes: '#3a3038', outline: '#1a1a22',
  },
  hiker: {
    skin: '#d09068', skinShade: '#a86c48',
    hair: '#3a2a1a', hairShade: '#241a10',
    top: '#c08a3a', topShade: '#8f6528',
    legs: '#4a5a3a', legsShade: '#344028',
    shoes: '#3a3038', outline: '#1a1a22',
    pack: '#8a4a30',
  },
  concord: {
    skin: '#e0b48c', skinShade: '#b88a64',
    hair: '#2a2a34', hairShade: '#1a1a22',
    top: '#3a5a7a', topShade: '#284058',
    legs: '#2f3f52', legsShade: '#1f2b38',
    shoes: '#20242c', outline: '#12141a',
    hat: '#d8dde4', hatShade: '#a8b0ba',
  },
};

type Ctx = CanvasRenderingContext2D;

/** Vertical landmarks, chosen once so every facing lines up exactly. */
const CX = 16;
const HEAD_TOP = 4;
const HEAD_BOT = 22;
const HEAD_L = 7;
const HEAD_R = 24;
const SHOULDER = 23;
const HIP = 36;
const FOOT = 46;

/**
 * The sheet is laid out as 4 rows (facings) x 3 columns (walk cycle), so a
 * caller just needs frame = cycle[step] and row = dirIndex.
 */
export class CharSheet {
  readonly canvas: HTMLCanvasElement;
  static readonly FRAMES = 4;
  /** Walk cycle order: stand, step A, stand, step B. */
  static readonly CYCLE = [0, 1, 0, 2];

  constructor(private pal: CharPalette) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = CHAR_W * 3;
    this.canvas.height = CHAR_H * 4;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('charsprite: no 2d context');
    ctx.imageSmoothingEnabled = false;

    // Frames are composed in a scratch buffer so the outline pass has a clean
    // silhouette to work from rather than the whole sheet.
    const tmp = document.createElement('canvas');
    tmp.width = CHAR_W;
    tmp.height = CHAR_H;
    const tctx = tmp.getContext('2d');
    if (!tctx) throw new Error('charsprite: no scratch context');
    tctx.imageSmoothingEnabled = false;

    DIRS.forEach((dir, row) => {
      for (let frame = 0; frame < 3; frame++) {
        tctx.clearRect(0, 0, CHAR_W, CHAR_H);
        this.draw(tctx, dir, frame);
        this.outline(tctx);
        ctx.drawImage(tmp, frame * CHAR_W, row * CHAR_H);
      }
    });
  }

  /** Source rect for a facing and animation step. */
  src(dir: CharDir, step: number): { x: number; y: number; w: number; h: number; flip: boolean } {
    // Right is the left sheet mirrored: half the pixels, and it guarantees the
    // two profiles stay identical.
    const flip = dir === 'right';
    const row = DIRS.indexOf(flip ? 'left' : dir);
    const frame = CharSheet.CYCLE[step % CharSheet.CYCLE.length]!;
    return { x: frame * CHAR_W, y: row * CHAR_H, w: CHAR_W, h: CHAR_H, flip };
  }

  /** Expand the silhouette by one pixel in the outline colour. */
  private outline(ctx: Ctx): void {
    const img = ctx.getImageData(0, 0, CHAR_W, CHAR_H);
    const d = img.data;
    const solid = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < CHAR_W && y < CHAR_H && d[(y * CHAR_W + x) * 4 + 3]! > 0;

    const [r, g, b] = hexRgb(this.pal.outline);
    const edges: number[] = [];
    for (let y = 0; y < CHAR_H; y++) {
      for (let x = 0; x < CHAR_W; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)
          || solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1)) {
          edges.push((y * CHAR_W + x) * 4);
        }
      }
    }
    for (const i of edges) {
      d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  private draw(ctx: Ctx, dir: CharDir, frame: number): void {
    const p = this.pal;
    const px = (x: number, y: number, c: string) => {
      if (x < 1 || y < 1 || x >= CHAR_W - 1 || y >= CHAR_H - 1) return;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    };
    const box = (x0: number, y0: number, x1: number, y1: number, c: string) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c);
    };
    /** Filled ellipse, the workhorse for heads and limbs. */
    const ell = (cx: number, cy: number, rx: number, ry: number, c: string) => {
      for (let y = -ry; y <= ry; y++) {
        for (let x = -rx; x <= rx; x++) {
          if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) px(cx + x, cy + y, c);
        }
      }
    };

    // Passing frames lift the whole body a pixel, which is most of what sells a
    // walk at this size.
    const bob = frame === 0 ? 0 : -1;
    const profile = dir === 'left' || dir === 'right';
    const headCy = (HEAD_TOP + HEAD_BOT) / 2 + bob;
    const headRx = profile ? 8 : 9;
    const headCx = profile ? CX - 1 : CX;

    /* ------------------------------------------------------------- legs */
    // Drawn first so the tunic hem overlaps them.
    const stride = frame === 0 ? 0 : frame === 1 ? 1 : -1;
    const legTop = HIP - 2;
    if (profile) {
      // One leg forward, one trailing; the forward foot lands flat.
      const fwd = stride * 4;
      const back = -stride * 4;
      box(CX - 4 + back, legTop, CX + 1 + back, FOOT - 3, p.legsShade);
      box(CX - 5 + back, FOOT - 3, CX + 2 + back, FOOT, p.shoes);
      box(CX - 4 + fwd, legTop, CX + 1 + fwd, FOOT - 3, p.legs);
      box(CX - 5 + fwd, FOOT - 3, CX + 2 + fwd, FOOT, p.shoes);
    } else {
      // Front and back views read the stride as one foot lifted.
      const liftL = stride > 0 ? 2 : 0;
      const liftR = stride < 0 ? 2 : 0;
      box(CX - 7, legTop, CX - 1, FOOT - 3 - liftL, p.legs);
      box(CX + 1, legTop, CX + 7, FOOT - 3 - liftR, p.legsShade);
      box(CX - 8, FOOT - 3 - liftL, CX - 1, FOOT - liftL, p.shoes);
      box(CX + 1, FOOT - 3 - liftR, CX + 8, FOOT - liftR, p.shoes);
      // Inner shadow separates the two legs.
      for (let y = legTop; y <= FOOT - 4; y++) px(CX, y, p.legsShade);
    }

    /* ------------------------------------------------------------ torso */
    const shoulderY = SHOULDER + bob;
    const torsoHalf = profile ? 5 : 7;
    box(CX - torsoHalf, shoulderY, CX + torsoHalf, HIP, p.top);
    // Light from the upper left: a lit band down the left, shade down the right.
    box(CX - torsoHalf, shoulderY, CX - torsoHalf + 2, HIP, lighten(p.top, 0.16));
    box(CX + torsoHalf - 2, shoulderY, CX + torsoHalf, HIP, p.topShade);
    // Hem shadow.
    box(CX - torsoHalf, HIP - 1, CX + torsoHalf, HIP, p.topShade);
    // Shoulders rounded off so the silhouette is not a slab.
    px(CX - torsoHalf, shoulderY, 'rgba(0,0,0,0)');
    px(CX + torsoHalf, shoulderY, 'rgba(0,0,0,0)');

    if (dir === 'down') {
      // Collar and a centre seam.
      box(CX - 3, shoulderY, CX + 3, shoulderY + 1, lighten(p.top, 0.3));
      for (let y = shoulderY + 2; y <= HIP - 2; y++) px(CX, y, p.topShade);
      // Belt.
      box(CX - torsoHalf, HIP - 4, CX + torsoHalf, HIP - 3, darken(p.legsShade, 0.15));
      box(CX - 1, HIP - 4, CX + 1, HIP - 3, '#d8b05a');
    } else if (dir === 'up') {
      box(CX - torsoHalf, HIP - 4, CX + torsoHalf, HIP - 3, darken(p.legsShade, 0.15));
      if (p.pack) {
        box(CX - 5, shoulderY + 2, CX + 5, HIP - 5, p.pack);
        box(CX - 5, shoulderY + 2, CX - 3, HIP - 5, lighten(p.pack, 0.18));
        box(CX + 3, shoulderY + 2, CX + 5, HIP - 5, darken(p.pack, 0.2));
        box(CX - 5, HIP - 6, CX + 5, HIP - 5, darken(p.pack, 0.3));
        px(CX, shoulderY + 4, darken(p.pack, 0.35));
      }
    } else {
      // Profile: a shoulder highlight facing forward.
      box(CX - torsoHalf, shoulderY, CX - torsoHalf + 1, shoulderY + 4, lighten(p.top, 0.24));
    }

    /* ------------------------------------------------------------- arms */
    // Arms swing opposite the legs.
    const swing = -stride;
    if (profile) {
      const ay = shoulderY + 2 + Math.max(0, swing);
      box(CX - 5, ay, CX - 2, ay + 7, p.topShade);
      ell(CX - 4, ay + 8, 2, 2, p.skin);
      px(CX - 5, ay + 8, p.skinShade);
    } else {
      const lY = shoulderY + 2 - swing;
      const rY = shoulderY + 2 + swing;
      box(CX - torsoHalf - 3, lY, CX - torsoHalf - 1, lY + 7, lighten(p.top, 0.1));
      box(CX + torsoHalf + 1, rY, CX + torsoHalf + 3, rY + 7, p.topShade);
      ell(CX - torsoHalf - 2, lY + 9, 2, 2, p.skin);
      ell(CX + torsoHalf + 2, rY + 9, 2, 2, p.skinShade);
    }

    /* ------------------------------------------------------------- head */
    ell(headCx, headCy, headRx, 9, p.skin);
    // Jaw shadow and a cheek highlight.
    ell(headCx, headCy + 4, headRx - 1, 5, p.skinShade);
    ell(headCx, headCy + 1, headRx - 1, 7, p.skin);
    ell(headCx - 3, headCy - 2, 3, 3, lighten(p.skin, 0.12));
    // Neck.
    box(CX - 3, HEAD_BOT + bob - 2, CX + 2, shoulderY, p.skinShade);

    /* ------------------------------------------------------------- hair */
    const hairTop = headCy - 10;
    if (dir === 'up') {
      // Back of the head: hair all the way down to the collar.
      ell(headCx, headCy, headRx, 9, p.hair);
      ell(headCx, headCy + 3, headRx, 6, p.hairShade);
      ell(headCx - 3, headCy - 3, 4, 4, lighten(p.hair, 0.22));
      box(headCx - 3, headCy + 7, headCx + 3, headCy + 9, p.hairShade);
    } else {
      // Crown and fringe.
      for (let y = hairTop; y <= headCy - 1; y++) {
        const t = (y - hairTop) / 10;
        const half = Math.round(headRx * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)) + 1);
        box(headCx - half, y, headCx + half, y, y < headCy - 6 ? p.hair : p.hair);
      }
      // Fringe edge, jagged rather than a flat line.
      for (let x = -headRx; x <= headRx; x++) {
        const dip = 1 + ((x + 9) % 3 === 0 ? 1 : 0);
        for (let k = 0; k < dip; k++) px(headCx + x, headCy - 1 + k, p.hairShade);
      }
      // Sideburns down past the ear.
      box(headCx - headRx, headCy - 3, headCx - headRx + 1, headCy + 3, p.hairShade);
      box(headCx + headRx - 1, headCy - 3, headCx + headRx, headCy + 3, p.hairShade);
      ell(headCx - 4, headCy - 6, 4, 3, lighten(p.hair, 0.24));
    }

    /* -------------------------------------------------------------- hat */
    if (p.hat) {
      const hatShade = p.hatShade ?? p.hat;
      // Dome.
      for (let y = headCy - 12; y <= headCy - 2; y++) {
        const t = (y - (headCy - 12)) / 10;
        const half = Math.round((headRx + 1) * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)));
        box(headCx - half, y, headCx + half, y, y < headCy - 7 ? p.hat : hatShade);
      }
      ell(headCx - 3, headCy - 9, 4, 2, lighten(p.hat, 0.2));
      // Band.
      box(headCx - headRx - 1, headCy - 3, headCx + headRx + 1, headCy - 2, darken(hatShade, 0.25));
      // Brim: forward for the front and profile views, a short lip from behind.
      if (dir === 'down') {
        box(headCx - headRx - 2, headCy - 2, headCx + headRx + 2, headCy - 1, hatShade);
        box(headCx - headRx - 1, headCy - 1, headCx + headRx + 1, headCy, darken(hatShade, 0.3));
      } else if (profile) {
        box(headCx - headRx - 5, headCy - 3, headCx - headRx + 2, headCy - 2, hatShade);
        box(headCx - headRx - 5, headCy - 2, headCx - headRx + 2, headCy - 1, darken(hatShade, 0.3));
      } else {
        box(headCx - headRx - 1, headCy - 3, headCx + headRx + 1, headCy - 2, hatShade);
      }
    }

    /* ------------------------------------------------------------- face */
    if (dir === 'down') {
      // Whites first, then pupils, so the eyes read at a glance.
      box(headCx - 6, headCy + 1, headCx - 3, headCy + 3, '#f4f0e8');
      box(headCx + 3, headCy + 1, headCx + 6, headCy + 3, '#f4f0e8');
      box(headCx - 5, headCy + 1, headCx - 4, headCy + 3, p.outline);
      box(headCx + 4, headCy + 1, headCx + 5, headCy + 3, p.outline);
      px(headCx - 5, headCy + 1, '#8fb8d8');
      px(headCx + 4, headCy + 1, '#8fb8d8');
      // Brows.
      box(headCx - 6, headCy - 1, headCx - 3, headCy - 1, p.hairShade);
      box(headCx + 3, headCy - 1, headCx + 6, headCy - 1, p.hairShade);
      // Mouth and a hint of a nose.
      px(headCx, headCy + 4, p.skinShade);
      box(headCx - 2, headCy + 6, headCx + 1, headCy + 6, darken(p.skinShade, 0.3));
    } else if (profile) {
      box(headCx + 1, headCy + 1, headCx + 3, headCy + 3, '#f4f0e8');
      box(headCx + 2, headCy + 1, headCx + 3, headCy + 3, p.outline);
      box(headCx + 1, headCy - 1, headCx + 4, headCy - 1, p.hairShade);
      // Nose bump on the leading edge.
      px(headCx + headRx - 1, headCy + 2, p.skin);
      px(headCx + headRx, headCy + 3, p.skinShade);
      box(headCx + 2, headCy + 6, headCx + 4, headCy + 6, darken(p.skinShade, 0.3));
    }
  }
}

/* ----------------------------------------------------------- colour bits */

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function mix(hex: string, target: number, amount: number): string {
  const [r, g, b] = hexRgb(hex);
  const f = (v: number) => Math.round(v + (target - v) * amount).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

function lighten(hex: string, amount: number): string { return mix(hex, 255, amount); }
function darken(hex: string, amount: number): string { return mix(hex, 0, amount); }

const sheetCache = new Map<string, CharSheet>();

/** Cached sheet for a named palette, falling back to a villager look. */
export function getCharSheet(spriteId: string): CharSheet {
  const cached = sheetCache.get(spriteId);
  if (cached) return cached;
  const pal = DEFAULT_PALETTES[spriteId] ?? DEFAULT_PALETTES.villager_m!;
  const sheet = new CharSheet(pal);
  sheetCache.set(spriteId, sheet);
  return sheet;
}
