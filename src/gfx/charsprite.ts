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
 *
 * The player is the same machinery with the knobs exposed: an appearance is a
 * dozen indices into the tables at the bottom of this file, and it turns into a
 * palette like any other. That is what makes character creation possible at all
 * -- there is no sprite sheet to redraw, only numbers to change.
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

/** Hair silhouettes. The head is nine pixels across, so these are shapes, not
 *  hairdressing: what matters is the outline you can recognise from a tile
 *  away. */
export type HairStyle = 'short' | 'swept' | 'spiky' | 'bob' | 'long' | 'ponytail' | 'bun' | 'curls';
export type HatStyle = 'cap' | 'beanie' | 'bandana' | 'sunhat' | 'band';
export type JacketStyle = 'open' | 'hoodie' | 'vest';
export type GlassesStyle = 'round' | 'square' | 'shades';

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
  /** Shape of that headwear. A hat colour with no style is a cap, as before. */
  hatStyle?: HatStyle;
  /** Optional pack on the back, visible facing up. */
  pack?: string;
  /** Iris colour. */
  eye?: string;
  /** Hair silhouette; short if unset, which is what every NPC had. */
  hairStyle?: HairStyle;
  /** Optional jacket worn over the top. */
  jacket?: string;
  jacketShade?: string;
  jacketStyle?: JacketStyle;
  /** Shoulder width and waist. */
  build?: 'broad' | 'slim';
  /** Eyewear, drawn over the face. */
  glasses?: GlassesStyle;
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
    hairStyle: 'swept', eye: '#6aa87c',
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
    hairStyle: 'bob', build: 'slim',
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
    const slim = p.build === 'slim';
    const headCy = (HEAD_TOP + HEAD_BOT) / 2 + bob;
    const headRx = profile ? 8 : 9;
    const headCx = profile ? CX - 1 : CX;
    const eye = p.eye ?? '#8fb8d8';
    const style: HairStyle = p.hairStyle ?? 'short';
    const jacket = p.jacket;
    const jacketShade = p.jacketShade ?? (jacket ? darken(jacket, 0.28) : undefined);
    const jacketStyle: JacketStyle = p.jacketStyle ?? 'open';
    /** Sleeves take the jacket colour unless it is a vest. */
    const sleeve = jacket && jacketStyle !== 'vest' ? jacket : p.top;
    const sleeveShade = jacket && jacketStyle !== 'vest' ? jacketShade! : p.topShade;

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
      const legHalf = slim ? 6 : 7;
      box(CX - legHalf, legTop, CX - 1, FOOT - 3 - liftL, p.legs);
      box(CX + 1, legTop, CX + legHalf, FOOT - 3 - liftR, p.legsShade);
      box(CX - legHalf - 1, FOOT - 3 - liftL, CX - 1, FOOT - liftL, p.shoes);
      box(CX + 1, FOOT - 3 - liftR, CX + legHalf + 1, FOOT - liftR, p.shoes);
      // Inner shadow separates the two legs.
      for (let y = legTop; y <= FOOT - 4; y++) px(CX, y, p.legsShade);
    }

    /* ------------------------------------------------------------ torso */
    const shoulderY = SHOULDER + bob;
    const torsoHalf = profile ? (slim ? 4 : 5) : (slim ? 6 : 7);
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
    } else {
      // Profile: a shoulder highlight facing forward.
      box(CX - torsoHalf, shoulderY, CX - torsoHalf + 1, shoulderY + 4, lighten(p.top, 0.24));
    }

    /* ----------------------------------------------------------- jacket */
    if (jacket) {
      const js = jacketShade!;
      if (dir === 'up') {
        // From behind a jacket is simply the back of a jacket.
        box(CX - torsoHalf, shoulderY, CX + torsoHalf, HIP - 1, jacket);
        box(CX + torsoHalf - 2, shoulderY, CX + torsoHalf, HIP - 1, js);
        box(CX - torsoHalf, HIP - 2, CX + torsoHalf, HIP - 1, js);
      } else if (profile) {
        box(CX - torsoHalf, shoulderY, CX + torsoHalf - 2, HIP - 1, jacket);
        box(CX - torsoHalf, shoulderY, CX - torsoHalf + 1, HIP - 1, lighten(jacket, 0.18));
        box(CX + torsoHalf - 3, shoulderY, CX + torsoHalf - 2, HIP - 1, js);
      } else {
        // Open at the front: two panels with the shirt showing between them.
        box(CX - torsoHalf, shoulderY, CX - torsoHalf + 3, HIP - 1, jacket);
        box(CX + torsoHalf - 3, shoulderY, CX + torsoHalf, HIP - 1, jacket);
        box(CX - torsoHalf, shoulderY, CX - torsoHalf + 1, HIP - 1, lighten(jacket, 0.18));
        box(CX + torsoHalf - 1, shoulderY, CX + torsoHalf, HIP - 1, js);
        // Collar folded back over the shoulders.
        box(CX - torsoHalf + 3, shoulderY, CX - 2, shoulderY + 2, js);
        box(CX + 2, shoulderY, CX + torsoHalf - 3, shoulderY + 2, js);
        box(CX - torsoHalf, HIP - 2, CX - torsoHalf + 3, HIP - 1, js);
        box(CX + torsoHalf - 3, HIP - 2, CX + torsoHalf, HIP - 1, js);
      }
      if (jacketStyle === 'hoodie') {
        // A hood bunched behind the neck, which is most of what says "hoodie"
        // from the front and all of it from behind.
        const hy = shoulderY - 1;
        ell(CX, hy + 1, torsoHalf - 1, 3, js);
        ell(CX, hy, torsoHalf - 2, 2, jacket);
        if (dir === 'up') ell(CX, hy + 3, torsoHalf - 1, 4, js);
      }
    }

    /* ------------------------------------------------------------- arms */
    // Arms swing opposite the legs.
    const swing = -stride;
    if (profile) {
      const ay = shoulderY + 2 + Math.max(0, swing);
      box(CX - 5, ay, CX - 2, ay + 7, sleeveShade);
      ell(CX - 4, ay + 8, 2, 2, p.skin);
      px(CX - 5, ay + 8, p.skinShade);
    } else {
      const lY = shoulderY + 2 - swing;
      const rY = shoulderY + 2 + swing;
      box(CX - torsoHalf - 3, lY, CX - torsoHalf - 1, lY + 7, lighten(sleeve, 0.1));
      box(CX + torsoHalf + 1, rY, CX + torsoHalf + 3, rY + 7, sleeveShade);
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
    const back = profile ? 1 : 0;   // in profile the back of the head is +x

    /** The dome on top of the head. */
    const crown = (rise = 0) => {
      const top = hairTop - rise;
      const span = headCy - 1 - top;
      for (let y = top; y <= headCy - 1; y++) {
        const t = (y - top) / span;
        const half = Math.round((headRx + (rise > 0 ? 1 : 0)) * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)) + 1);
        box(headCx - half, y, headCx + half, y, p.hair);
      }
    };

    /** Jagged fringe edge, rather than a flat line across the brow. */
    const fringe = () => {
      for (let x = -headRx; x <= headRx; x++) {
        const dip = 1 + ((x + 9) % 3 === 0 ? 1 : 0);
        for (let k = 0; k < dip; k++) px(headCx + x, headCy - 1 + k, p.hairShade);
      }
    };

    /** Hair hanging past the jaw. In profile only the back side has length. */
    const sides = (len: number, width = 2) => {
      const run = (sign: number) => {
        for (let k = 0; k < width; k++) {
          const x = headCx + sign * (headRx - k);
          box(x, headCy - 4, x, headCy + len, k === 0 ? p.hairShade : p.hair);
        }
      };
      if (!profile) { run(-1); run(1); } else run(back === 1 ? 1 : -1);
    };

    if (dir === 'up') {
      // Back of the head: hair all the way down to the collar.
      ell(headCx, headCy, headRx, 9, p.hair);
      ell(headCx, headCy + 3, headRx, 6, p.hairShade);
      ell(headCx - 3, headCy - 3, 4, 4, lighten(p.hair, 0.22));
      box(headCx - 3, headCy + 7, headCx + 3, headCy + 9, p.hairShade);
    } else {
      crown(style === 'spiky' || style === 'curls' ? 1 : 0);
      fringe();
      // Sideburns down past the ear -- in profile only on the back of the head,
      // where there is a head to have hair on.
      if (!profile) {
        box(headCx - headRx, headCy - 3, headCx - headRx + 1, headCy + 3, p.hairShade);
      }
      box(headCx + headRx - 1, headCy - 3, headCx + headRx, headCy + 3, p.hairShade);
      ell(headCx - 4, headCy - 6, 4, 3, lighten(p.hair, 0.24));
    }

    switch (style) {
      case 'swept':
        // A lock combed across the brow, climbing as it goes.
        if (dir !== 'up') {
          for (let x = -headRx; x <= 3; x++) {
            const y = headCy - 1 - Math.floor((x + headRx) / 5);
            box(headCx + x, y, headCx + x, headCy - 1, p.hair);
            px(headCx + x, y, lighten(p.hair, 0.2));
          }
        }
        break;

      case 'spiky':
        // Five spikes off the crown, tallest in the middle.
        for (let i = 0; i < 5; i++) {
          const sx = headCx - 6 + i * 3;
          const tall = 3 + (i === 2 ? 2 : i === 1 || i === 3 ? 1 : 0);
          for (let k = 0; k < tall; k++) {
            const w = Math.max(0, 1 - Math.floor(k / 2));
            box(sx - w, hairTop - 1 - k, sx + w, hairTop - 1 - k, k > tall - 2 ? p.hairShade : p.hair);
          }
        }
        break;

      case 'bob':
        sides(6, 3);
        if (dir === 'up') box(headCx - headRx, headCy + 6, headCx + headRx, headCy + 8, p.hairShade);
        break;

      case 'long':
        sides(13, 3);
        if (dir === 'up') {
          box(headCx - 5, headCy + 7, headCx + 5, shoulderY + 9, p.hair);
          box(headCx + 2, headCy + 7, headCx + 5, shoulderY + 9, p.hairShade);
          box(headCx - 5, shoulderY + 8, headCx + 5, shoulderY + 9, p.hairShade);
        }
        break;

      case 'ponytail':
        if (dir === 'up') {
          box(headCx - 2, headCy + 6, headCx + 2, shoulderY + 7, p.hair);
          box(headCx + 1, headCy + 6, headCx + 2, shoulderY + 7, p.hairShade);
          box(headCx - 2, headCy + 5, headCx + 2, headCy + 6, darken(p.hair, 0.35));
        } else if (profile) {
          // Swept back and down behind the head.
          for (let i = 0; i < 10; i++) {
            const x = headCx + headRx + 1 + Math.floor(i / 3);
            const y = headCy - 4 + i;
            box(x, y, x + 1, y, i > 6 ? p.hairShade : p.hair);
          }
          box(headCx + headRx - 1, headCy - 5, headCx + headRx + 1, headCy - 4, darken(p.hair, 0.35));
        } else {
          // From the front it is a bump either side of the head.
          box(headCx - headRx - 1, headCy - 4, headCx - headRx, headCy - 1, p.hairShade);
          box(headCx + headRx, headCy - 4, headCx + headRx + 1, headCy - 1, p.hairShade);
        }
        break;

      case 'bun':
        if (dir === 'up') {
          ell(headCx, headCy - 5, 4, 4, p.hair);
          ell(headCx - 1, headCy - 6, 2, 2, lighten(p.hair, 0.22));
        } else {
          ell(headCx, hairTop - 1, 4, 3, p.hair);
          ell(headCx - 1, hairTop - 2, 2, 1, lighten(p.hair, 0.22));
          box(headCx - 3, hairTop, headCx + 3, hairTop + 1, p.hairShade);
        }
        break;

      case 'curls':
        // Bumps around the outline, which is all a curl is at this size.
        for (let i = 0; i < 7; i++) {
          const a = Math.PI + (i / 6) * Math.PI;
          const cx2 = headCx + Math.round(Math.cos(a) * (headRx + 1));
          const cy2 = headCy - 1 + Math.round(Math.sin(a) * 9);
          ell(cx2, cy2, 2, 2, i % 2 ? p.hair : p.hairShade);
        }
        sides(3, 3);
        break;

      default:
        break;
    }

    /* -------------------------------------------------------------- hat */
    if (p.hat) {
      const hatShade = p.hatShade ?? darken(p.hat, 0.22);
      const shape: HatStyle = p.hatStyle ?? 'cap';

      if (shape === 'band' || shape === 'bandana') {
        // Worn on the hair rather than over it, so the style still reads.
        const y = shape === 'band' ? headCy - 6 : headCy - 4;
        box(headCx - headRx - 1, y, headCx + headRx + 1, y + 1, p.hat);
        box(headCx - headRx - 1, y + 1, headCx + headRx + 1, y + 1, hatShade);
        if (shape === 'bandana') {
          box(headCx - headRx - 1, y + 2, headCx - headRx + 1, y + 3, p.hat);
          if (dir !== 'up') px(headCx - headRx - 2, y + 3, hatShade);
          // Knot tails trailing off the side.
          box(headCx - headRx - 3, y + 1, headCx - headRx - 2, y + 2, hatShade);
        }
      } else {
        // Dome.
        const domeTop = shape === 'beanie' ? headCy - 13 : headCy - 12;
        for (let y = domeTop; y <= headCy - 2; y++) {
          const t = (y - domeTop) / (headCy - 2 - domeTop);
          const half = Math.round((headRx + 1) * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)));
          box(headCx - half, y, headCx + half, y, y < headCy - 7 ? p.hat : hatShade);
        }
        ell(headCx - 3, headCy - 9, 4, 2, lighten(p.hat, 0.2));

        if (shape === 'beanie') {
          // Folded brim and a bobble.
          box(headCx - headRx - 1, headCy - 5, headCx + headRx + 1, headCy - 2, lighten(p.hat, 0.12));
          box(headCx - headRx - 1, headCy - 3, headCx + headRx + 1, headCy - 2, hatShade);
          ell(headCx, domeTop - 1, 2, 2, lighten(p.hat, 0.24));
        } else if (shape === 'sunhat') {
          // A brim all the way round, wider than the shoulders.
          box(headCx - headRx - 5, headCy - 3, headCx + headRx + 5, headCy - 2, p.hat);
          box(headCx - headRx - 5, headCy - 2, headCx + headRx + 5, headCy - 1, hatShade);
          box(headCx - headRx - 2, headCy - 4, headCx + headRx + 2, headCy - 4, darken(hatShade, 0.2));
        } else {
          // Cap: a band, and a brim that points where the character is facing.
          box(headCx - headRx - 1, headCy - 3, headCx + headRx + 1, headCy - 2, darken(hatShade, 0.25));
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
      }
    }

    /* ------------------------------------------------------------- face */
    if (dir === 'down') {
      // Whites first, then pupils, so the eyes read at a glance.
      box(headCx - 6, headCy + 1, headCx - 3, headCy + 3, '#f4f0e8');
      box(headCx + 3, headCy + 1, headCx + 6, headCy + 3, '#f4f0e8');
      box(headCx - 5, headCy + 1, headCx - 4, headCy + 3, eye);
      box(headCx + 4, headCy + 1, headCx + 5, headCy + 3, eye);
      // Pupil and a catchlight, which is what makes the eye look wet.
      box(headCx - 5, headCy + 2, headCx - 4, headCy + 3, darken(eye, 0.55));
      box(headCx + 4, headCy + 2, headCx + 5, headCy + 3, darken(eye, 0.55));
      px(headCx - 5, headCy + 1, lighten(eye, 0.4));
      px(headCx + 4, headCy + 1, lighten(eye, 0.4));
      // Brows.
      box(headCx - 6, headCy - 1, headCx - 3, headCy - 1, p.hairShade);
      box(headCx + 3, headCy - 1, headCx + 6, headCy - 1, p.hairShade);
      // Mouth and a hint of a nose.
      px(headCx, headCy + 4, p.skinShade);
      box(headCx - 2, headCy + 6, headCx + 1, headCy + 6, darken(p.skinShade, 0.3));
    } else if (profile) {
      box(headCx - 3, headCy + 1, headCx - 1, headCy + 3, '#f4f0e8');
      box(headCx - 3, headCy + 1, headCx - 2, headCy + 3, eye);
      box(headCx - 3, headCy + 2, headCx - 2, headCy + 3, darken(eye, 0.55));
      px(headCx - 3, headCy + 1, lighten(eye, 0.4));
      box(headCx - 4, headCy - 1, headCx - 1, headCy - 1, p.hairShade);
      // Nose bump on the leading edge.
      px(headCx - headRx + 1, headCy + 2, p.skin);
      px(headCx - headRx, headCy + 3, p.skinShade);
      box(headCx - 4, headCy + 6, headCx - 2, headCy + 6, darken(p.skinShade, 0.3));
    }

    /* ---------------------------------------------------------- glasses */
    if (p.glasses && dir !== 'up') {
      const frame = p.glasses === 'shades' ? '#22242c' : p.glasses === 'round' ? '#c8a44a' : '#3a3f4c';
      const lens = p.glasses === 'shades' ? '#161820' : null;
      if (dir === 'down') {
        for (const side of [-1, 1]) {
          const x0 = side < 0 ? headCx - 7 : headCx + 2;
          if (lens) box(x0 + 1, headCy + 1, x0 + 4, headCy + 3, lens);
          box(x0, headCy, x0 + 5, headCy, frame);
          box(x0, headCy + 4, x0 + 5, headCy + 4, frame);
          box(x0, headCy, x0, headCy + 4, frame);
          box(x0 + 5, headCy, x0 + 5, headCy + 4, frame);
        }
        // Bridge, and arms running back towards the ears.
        box(headCx - 2, headCy + 1, headCx + 1, headCy + 1, frame);
        px(headCx - 8, headCy + 1, frame);
        px(headCx + 7, headCy + 1, frame);
        if (p.glasses !== 'shades') px(headCx - 6, headCy + 1, lighten(frame, 0.5));
      } else {
        const x0 = headCx - 5;
        if (lens) box(x0 + 1, headCy + 1, x0 + 3, headCy + 3, lens);
        box(x0, headCy, x0 + 4, headCy, frame);
        box(x0, headCy + 4, x0 + 4, headCy + 4, frame);
        box(x0, headCy, x0, headCy + 4, frame);
        box(x0 + 4, headCy, x0 + 4, headCy + 4, frame);
        box(x0 + 5, headCy + 1, headCx + 4, headCy + 1, frame);
      }
    }

    /* ------------------------------------------------------------- pack */
    // Drawn last, over the jacket: a bag goes on top of the coat. From behind
    // it is the whole bag; from any other angle it is the strap across the
    // chest, which is what says it is there at all.
    if (p.pack) {
      const strap = darken(p.pack, 0.15);
      if (dir === 'up') {
        box(CX - 5, shoulderY + 2, CX + 5, HIP - 5, p.pack);
        box(CX - 5, shoulderY + 2, CX - 3, HIP - 5, lighten(p.pack, 0.18));
        box(CX + 3, shoulderY + 2, CX + 5, HIP - 5, darken(p.pack, 0.2));
        box(CX - 5, HIP - 6, CX + 5, HIP - 5, darken(p.pack, 0.3));
        px(CX, shoulderY + 4, darken(p.pack, 0.35));
        // Straps over each shoulder, so it is being carried rather than floating.
        box(CX - 6, shoulderY, CX - 5, shoulderY + 3, strap);
        box(CX + 5, shoulderY, CX + 6, shoulderY + 3, strap);
      } else if (dir === 'down') {
        for (let i = 0; i < 9; i++) {
          box(CX - 6 + i, shoulderY + 1 + i, CX - 5 + i, shoulderY + 2 + i, strap);
        }
      } else {
        // In profile the bag itself clears the back of the torso.
        box(CX + torsoHalf - 1, shoulderY + 2, CX + torsoHalf + 2, HIP - 4, p.pack);
        box(CX + torsoHalf + 1, shoulderY + 2, CX + torsoHalf + 2, HIP - 4, darken(p.pack, 0.2));
        box(CX - torsoHalf, shoulderY + 1, CX - torsoHalf + 1, HIP - 3, strap);
        box(CX - torsoHalf, shoulderY + 1, CX + torsoHalf - 3, shoulderY + 2, strap);
      }
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

/* ------------------------------------------------------------ appearance */

export interface Swatch { name: string; c: string; shade?: string }

/** Skin is two tones: everything else is derived from them. */
export const SKIN_TONES: Swatch[] = [
  { name: 'Porcelain', c: '#f6d9c0', shade: '#d0a888' },
  { name: 'Fair', c: '#f0c9a4', shade: '#c99a72' },
  { name: 'Warm', c: '#e8b48c', shade: '#c08a63' },
  { name: 'Olive', c: '#d8a274', shade: '#a97a50' },
  { name: 'Tan', c: '#c08658', shade: '#94603a' },
  { name: 'Umber', c: '#9a6440', shade: '#71462a' },
  { name: 'Deep', c: '#70452c', shade: '#4d2d1b' },
];

export const HAIR_COLOURS: Swatch[] = [
  { name: 'Black', c: '#26222c', shade: '#141119' },
  { name: 'Cocoa', c: '#3d2a1c', shade: '#241710' },
  { name: 'Brown', c: '#5a3a24', shade: '#3d2614' },
  { name: 'Auburn', c: '#7a3a26', shade: '#542517' },
  { name: 'Ginger', c: '#c06030', shade: '#8c401e' },
  { name: 'Honey', c: '#c8a04a', shade: '#9a7830' },
  { name: 'Blond', c: '#e8cc84', shade: '#b89a58' },
  { name: 'Silver', c: '#e6e2d6', shade: '#b4b0a4' },
  { name: 'Ash', c: '#8e8e9c', shade: '#65656f' },
  { name: 'Sea', c: '#3f8a90', shade: '#2a6066' },
  { name: 'Plum', c: '#7a4a86', shade: '#54305e' },
  { name: 'Rose', c: '#d07a96', shade: '#a1546e' },
];

export const EYE_COLOURS: Swatch[] = [
  { name: 'Slate', c: '#6f7f96' },
  { name: 'Blue', c: '#5f9fd8' },
  { name: 'Ice', c: '#9ad4e4' },
  { name: 'Green', c: '#5aa85e' },
  { name: 'Hazel', c: '#a07a3c' },
  { name: 'Amber', c: '#d08c30' },
  { name: 'Brown', c: '#6a4428' },
  { name: 'Violet', c: '#8a6ac0' },
];

/** Shirts, jackets and hats all pull from one set, so nothing clashes by
 *  accident and the creator only has to teach the player one row of swatches. */
export const CLOTH_COLOURS: Swatch[] = [
  { name: 'Ember', c: '#c8543f', shade: '#8f3a2b' },
  { name: 'Coral', c: '#e08060', shade: '#a85840' },
  { name: 'Amber', c: '#d8a03c', shade: '#a3742a' },
  { name: 'Sand', c: '#e0cf9c', shade: '#b0a074' },
  { name: 'Moss', c: '#6a8c46', shade: '#4a6430' },
  { name: 'Fern', c: '#3f7a5c', shade: '#2b5640' },
  { name: 'Teal', c: '#3f8a90', shade: '#2a6066' },
  { name: 'Sea', c: '#3a6ea8', shade: '#284d78' },
  { name: 'Sky', c: '#7ab0dc', shade: '#5482a8' },
  { name: 'Indigo', c: '#4a4a86', shade: '#33335e' },
  { name: 'Plum', c: '#7a4a86', shade: '#54305e' },
  { name: 'Rose', c: '#d07a96', shade: '#a1546e' },
  { name: 'Snow', c: '#e8e8ee', shade: '#b4b4c0' },
  { name: 'Coal', c: '#3a3a44', shade: '#26262e' },
];

export const TROUSER_COLOURS: Swatch[] = [
  { name: 'Denim', c: '#3f5478', shade: '#2b3c58' },
  { name: 'Navy', c: '#2c3a5c', shade: '#1d2740' },
  { name: 'Slate', c: '#4a4a58', shade: '#33333f' },
  { name: 'Khaki', c: '#9a8a5e', shade: '#6f6342' },
  { name: 'Olive', c: '#5a6440', shade: '#3e462b' },
  { name: 'Brown', c: '#6a5040', shade: '#48362a' },
  { name: 'Coal', c: '#35353e', shade: '#232329' },
  { name: 'Rust', c: '#8a4a34', shade: '#603022' },
];

export const SHOE_COLOURS: Swatch[] = [
  { name: 'Black', c: '#2a2a30' },
  { name: 'Brown', c: '#4d3627' },
  { name: 'Grey', c: '#5c5c66' },
  { name: 'Red', c: '#9a3a34' },
  { name: 'Cream', c: '#ddd6c4' },
  { name: 'Green', c: '#3c5a40' },
];

export const HAIR_STYLES: { name: string; style: HairStyle }[] = [
  { name: 'Short', style: 'short' },
  { name: 'Swept', style: 'swept' },
  { name: 'Spiky', style: 'spiky' },
  { name: 'Bob', style: 'bob' },
  { name: 'Long', style: 'long' },
  { name: 'Ponytail', style: 'ponytail' },
  { name: 'Bun', style: 'bun' },
  { name: 'Curls', style: 'curls' },
];

export const HAT_STYLES: { name: string; style: HatStyle | null }[] = [
  { name: 'None', style: null },
  { name: 'Cap', style: 'cap' },
  { name: 'Beanie', style: 'beanie' },
  { name: 'Sun hat', style: 'sunhat' },
  { name: 'Bandana', style: 'bandana' },
  { name: 'Headband', style: 'band' },
];

export const JACKET_STYLES: { name: string; style: JacketStyle | null }[] = [
  { name: 'None', style: null },
  { name: 'Jacket', style: 'open' },
  { name: 'Hoodie', style: 'hoodie' },
  { name: 'Vest', style: 'vest' },
];

export const GLASSES_STYLES: { name: string; style: GlassesStyle | null }[] = [
  { name: 'None', style: null },
  { name: 'Round', style: 'round' },
  { name: 'Square', style: 'square' },
  { name: 'Shades', style: 'shades' },
];

/** The pack is worn on the back and shows as a strap from the front. */
export const PACK_COLOURS: Swatch[] = [
  { name: 'None', c: '#000000' },
  { name: 'Leather', c: '#6a5a3a' },
  { name: 'Canvas', c: '#8a7a58' },
  { name: 'Rust', c: '#8a4a30' },
  { name: 'Fern', c: '#3f6a4c' },
  { name: 'Slate', c: '#4a4f60' },
];

export const BUILDS: { name: string; build: 'broad' | 'slim' }[] = [
  { name: 'Boy', build: 'broad' },
  { name: 'Girl', build: 'slim' },
];

/** Every choice the character creator makes, as indices into the tables above.
 *  Indices rather than colours so a save stays small and stays readable, and so
 *  a retuned palette reaches characters that were made before it. */
export interface CharAppearance {
  build: number;
  skin: number;
  hairStyle: number;
  hairColour: number;
  eyes: number;
  hat: number;
  hatColour: number;
  jacket: number;
  jacketColour: number;
  shirt: number;
  trousers: number;
  shoes: number;
  glasses: number;
  pack: number;
}

export const DEFAULT_APPEARANCE: CharAppearance = {
  build: 0,
  skin: 2,
  hairStyle: 0,
  hairColour: 2,
  eyes: 1,
  hat: 1,
  hatColour: 12,
  jacket: 0,
  jacketColour: 9,
  shirt: 0,
  trousers: 0,
  shoes: 0,
  glasses: 0,
  pack: 1,
};

/** Clamped lookup: a save written against an older table never crashes. */
function pick<T>(list: T[], index: number): T {
  return list[((Math.round(index) % list.length) + list.length) % list.length]!;
}

export function normaliseAppearance(a: Partial<CharAppearance> | undefined): CharAppearance {
  return { ...DEFAULT_APPEARANCE, ...(a ?? {}) };
}

export function appearancePalette(raw: Partial<CharAppearance> | undefined): CharPalette {
  const a = normaliseAppearance(raw);
  const skin = pick(SKIN_TONES, a.skin);
  const hair = pick(HAIR_COLOURS, a.hairColour);
  const shirt = pick(CLOTH_COLOURS, a.shirt);
  const legs = pick(TROUSER_COLOURS, a.trousers);
  const hat = pick(HAT_STYLES, a.hat);
  const hatColour = pick(CLOTH_COLOURS, a.hatColour);
  const jacket = pick(JACKET_STYLES, a.jacket);
  const jacketColour = pick(CLOTH_COLOURS, a.jacketColour);

  return {
    skin: skin.c, skinShade: skin.shade ?? darken(skin.c, 0.2),
    hair: hair.c, hairShade: hair.shade ?? darken(hair.c, 0.3),
    top: shirt.c, topShade: shirt.shade ?? darken(shirt.c, 0.28),
    legs: legs.c, legsShade: legs.shade ?? darken(legs.c, 0.28),
    shoes: pick(SHOE_COLOURS, a.shoes).c,
    outline: '#1a1a22',
    ...(pick(GLASSES_STYLES, a.glasses).style
      ? { glasses: pick(GLASSES_STYLES, a.glasses).style! }
      : {}),
    ...(a.pack % PACK_COLOURS.length !== 0
      ? { pack: pick(PACK_COLOURS, a.pack).c }
      : {}),
    eye: pick(EYE_COLOURS, a.eyes).c,
    hairStyle: pick(HAIR_STYLES, a.hairStyle).style,
    build: pick(BUILDS, a.build).build,
    ...(hat.style ? { hat: hatColour.c, hatShade: hatColour.shade, hatStyle: hat.style } : {}),
    ...(jacket.style
      ? { jacket: jacketColour.c, jacketShade: jacketColour.shade, jacketStyle: jacket.style }
      : {}),
  };
}

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

/** Cached sheet for a built appearance, keyed on the choices themselves: the
 *  creator can preview a hundred combinations and only pay for the ones it
 *  actually draws. */
export function getAppearanceSheet(raw: Partial<CharAppearance> | undefined): CharSheet {
  const a = normaliseAppearance(raw);
  const key = 'a:' + [
    a.build, a.skin, a.hairStyle, a.hairColour, a.eyes,
    a.hat, a.hatColour, a.jacket, a.jacketColour, a.shirt, a.trousers, a.shoes,
    a.glasses, a.pack,
  ].join(',');
  const cached = sheetCache.get(key);
  if (cached) return cached;
  const sheet = new CharSheet(appearancePalette(a));
  sheetCache.set(key, sheet);
  return sheet;
}
