/**
 * THE CHART OF AVERRA. The last picture in the main game.
 *
 * Canon 64, the final beat of the ending: "the player looks at a map of the
 * whole world, and Caelora is one small part of Averra." That is one sentence
 * and it cannot be carried by a dialogue box, because the whole point of it is
 * a proportion -- a shape you have spent thirty hours inside, seen at the size
 * it actually is.
 *
 * SO THE CHART UNROLLS, AND IT UNROLLS FROM THE RIGHT. Caelora is drawn in the
 * bottom-right corner of the sheet, which means the very first thing on screen
 * is the crescent from the region map: the ring of land round the Caeloran Sea,
 * with the strait in it, recognisable in about a second. Then the paper keeps
 * coming. Six more landmasses, an island chain, a compass and a title, and the
 * thing the player knows stays exactly the size it was. Nobody says a word over
 * it and nobody should: the two boxes on either side of this scene in
 * data/events/hearthmere_house_up.json are all the talking the beat gets.
 *
 * IT IS ALSO LITERALLY WHAT IS HAPPENING. The chart came out of the bin of
 * rolled charts in Elias' study four boxes earlier -- the player put something
 * into that room and took one thing out of it -- and they are unrolling it on
 * their own desk, at night, by one lamp. The roll at the leading edge, the
 * shadow it throws on the desk and the warm fall-off in the corners are that
 * room, not decoration.
 *
 * WHY IT IS AN UNROLL AND NOT A ZOOM. A pull-back from Caelora to the whole
 * world is the obvious way to shoot this and it is the wrong way to build it:
 * it means magnifying a baked sheet, and this game draws hard edges at one
 * density. Unrolling shows the same information, keeps every pixel 1:1, costs
 * one blit a frame, and is what a person does with a rolled chart.
 *
 * NOTHING HERE IS AN IMAGE FILE. The sheet is baked once on enter -- coastline,
 * relief hachure, sea hatching, paper grain, foxing, rhumb lines, frame, rose,
 * scale and lettering -- and then it is one `imagePixel` per frame.
 *
 * NAMES. The sheet carries exactly two: AVERRA and CAELORA. Canon names no
 * other region of the world and the last screen of the game is not the place to
 * invent seven, so the other landmasses are drawn and left unlabelled -- which
 * is also the better picture. A world you have not been told the names of yet
 * is the note this ending wants to go out on.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { makeTextSprite } from '../gfx/textart.js';

/* ------------------------------------------------------------------ sheet */

/** The sheet, in logical units, and where it lies on the desk. */
const SHEET_X = 5;
const SHEET_Y = 6;
const SHEET_W = 230;
const SHEET_H = 148;

/** The roll of paper still to come, at the leading edge. */
const ROLL_W = 7;

/* --------------------------------------------------------------- geography
 *
 * Everything below is in sheet units (0..SHEET_W by 0..SHEET_H). The layout
 * has one hard requirement and one soft one: Caelora sits in the bottom-right
 * so that it is revealed first, and the ocean has to keep three clear holes in
 * it for the rose, the scale and the title. */

interface Land {
  x: number; y: number;
  /** Mean radius. */
  r: number;
  /** How much the outline wanders, 0..1. */
  rough: number;
  seed: number;
  /** Vertical squash; 1 is round. */
  squash: number;
}

const LANDS: Land[] = [
  { x: 66, y: 34, r: 47, rough: 0.34, seed: 0.7, squash: 0.72 },
  { x: 170, y: 26, r: 31, rough: 0.40, seed: 2.1, squash: 0.86 },
  { x: 30, y: 98, r: 27, rough: 0.38, seed: 3.9, squash: 1.10 },
  { x: 104, y: 88, r: 23, rough: 0.44, seed: 5.2, squash: 0.90 },
  { x: 52, y: 143, r: 22, rough: 0.36, seed: 1.4, squash: 0.80 },
  { x: 222, y: 66, r: 24, rough: 0.42, seed: 4.4, squash: 1.15 },
  { x: 128, y: 6, r: 14, rough: 0.50, seed: 6.0, squash: 0.70 },
];

/** Small stuff: skerries, and the island chain out east that Crownspire's archive talks about. */
const ISLES: { x: number; y: number; r: number }[] = [
  { x: 146, y: 60, r: 2.6 }, { x: 152, y: 67, r: 1.8 }, { x: 141, y: 71, r: 2.2 },
  { x: 200, y: 88, r: 2.4 }, { x: 207, y: 95, r: 1.7 }, { x: 213, y: 103, r: 2.1 },
  { x: 219, y: 112, r: 1.6 }, { x: 224, y: 122, r: 2.3 },
  { x: 88, y: 122, r: 2.0 }, { x: 95, y: 128, r: 1.5 },
  { x: 12, y: 44, r: 2.2 }, { x: 8, y: 132, r: 1.9 },
];

/**
 * CAELORA. Not a blob: the ring from the region map, at the size the region
 * map's own grid implies once the whole world is on the paper. The strait is
 * the gap in the ring at STRAIT_A, and it is the detail that makes the shape
 * recognisable rather than merely small.
 */
const CAE = { x: 193, y: 121, rx: 14.5, ry: 12.0 };
const CAE_INNER = 0.56;
const STRAIT_A = 1.80;
const STRAIT_W = 0.30;

/** Chart furniture, in the holes the landmasses leave. */
const ROSE = { x: 156, y: 120, r: 11 };
/**
 * The title panel.
 *
 * Ruled and filled rather than set straight onto the paper, because the head of
 * this chart is a coastline and a title over a coastline loses both of them.
 *
 * Set into the top-LEFT rather than centred, which is both what an old chart
 * does and what the reveal needs: at the pause the last 60 units of the sheet
 * are showing, and a centred panel puts a bright empty rectangle on screen
 * beside Caelora at the one moment nothing should be competing with it.
 */
const CARTOUCHE = { x: 14, y: 8, w: 150, h: 27 };

/** The scale, in the open water between the middle landmass and Caelora. */
const SCALE_BAR = { x: 97, y: 137, w: 45 };

/* -------------------------------------------------------------- palette */

type RGB = readonly [number, number, number];

const PAPER: RGB = [223, 206, 172];
const SEA: RGB = [190, 181, 156];
const SEA_DEEP: RGB = [176, 168, 146];
const SHOAL: RGB = [209, 197, 168];
const LAND_LOW: RGB = [214, 196, 156];
const LAND_MID: RGB = [203, 181, 138];
const LAND_HIGH: RGB = [186, 160, 116];
const INK: RGB = [74, 58, 42];
const INK_SOFT: RGB = [126, 106, 80];
const FOX: RGB = [178, 146, 104];

const DESK: RGB = [40, 30, 24];
const DESK_LIT: RGB = [66, 48, 36];
const ROLL_A: RGB = [206, 188, 154];
const ROLL_B: RGB = [176, 156, 122];
const ROLL_C: RGB = [128, 110, 84];

/* -------------------------------------------------------------- helpers */

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgbStr(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
}

/** Deterministic hash for grain and foxing; the sheet must never shift. */
function ihash(x: number, y: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function wrapAngle(a: number): number {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

/** Value noise on a lattice, smoothed. One allocation, sampled per pixel. */
class NoiseField {
  private data: Float32Array;

  constructor(private cols: number, private rows: number, seed: number) {
    this.data = new Float32Array(cols * rows);
    let s = seed >>> 0;
    for (let i = 0; i < this.data.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      this.data[i] = s / 4294967296;
    }
  }

  at(u: number, v: number): number {
    const x = Math.min(this.cols - 1.001, Math.max(0, u));
    const y = Math.min(this.rows - 1.001, Math.max(0, v));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const i = y0 * this.cols + x0;
    const top = this.data[i]! + (this.data[i + 1]! - this.data[i]!) * sx;
    const j = i + this.cols;
    const bot = this.data[j]! + (this.data[j + 1]! - this.data[j]!) * sx;
    return top + (bot - top) * sy;
  }
}

/* ------------------------------------------------------------- the scene */

/**
 * Ticks of desk before the paper starts moving.
 *
 * The reveal that follows is in three parts, and the middle one is the beat the
 * whole scene exists for: the corner comes on, THE PAPER STOPS, and for a
 * second and a bit the only thing on the desk is the crescent from the region
 * map with its name under it. Then the rest of the world arrives. Unrolled at
 * one steady rate the shape the player knows goes past in a fifth of a second
 * with six others, and the proportion never lands.
 */
const INTRO = 34;
/** Ticks to bring Caelora's corner on. */
const REVEAL_A = 46;
/** Ticks the corner sits there by itself. */
const HOLD_A = 84;
/** Ticks the rest of the sheet takes. */
const REVEAL_B = 190;
/** How much of the sheet the first part shows: Caelora, its label, and water. */
const CAELORA_SHARE = 0.26;
/** The whole reveal. */
const UNROLL = REVEAL_A + HOLD_A + REVEAL_B;
/** Ticks held with the whole world on screen before the prompt appears. */
const SETTLE = 110;
/** Ticks after that before the scene leaves on its own. */
const AUTO = 560;
/** Ticks of fade at each end. */
const FADE = 34;

export class AverraScene implements Scene {
  readonly name = 'averra';

  private sheet: HTMLCanvasElement | null = null;
  private t = 0;
  /** Set when the player asks to move on; the scene then fades and leaves. */
  private leaving = 0;
  private done: () => void;
  private finished = false;

  constructor(done: () => void) {
    this.done = done;
  }

  enter(): void {
    this.sheet = bakeSheet();
  }

  update(game: Game, _dt: number): void {
    this.t++;
    if (this.leaving > 0) {
      this.leaving++;
      if (this.leaving > FADE && !this.finished) {
        this.finished = true;
        game.scenes.pop();
        this.done();
      }
      return;
    }
    const pressed = game.input.pressed('confirm') || game.input.pressed('cancel')
      || game.input.pressed('menu');
    if (pressed) {
      // First press finishes the unroll, second press leaves. A player who
      // wants the picture gets it; a player who has seen it is not held.
      if (this.t < INTRO + UNROLL) this.t = INTRO + UNROLL + SETTLE;
      else this.leaving = 1;
      return;
    }
    if (this.t > INTRO + UNROLL + SETTLE + AUTO) this.leaving = 1;
  }

  render(_game: Game, r: Renderer): void {
    drawDesk(r);
    const sheet = this.sheet;
    if (!sheet) return;

    const p = unrollProgress(this.t);
    // The leading edge, in logical units. At p = 0 nothing of the sheet is
    // showing; at p = 1 the whole of it is.
    const edge = SHEET_X + SHEET_W * (1 - p);
    const shownW = Math.max(0, Math.round((SHEET_X + SHEET_W - edge) * DETAIL));
    if (shownW > 0) {
      const srcX = sheet.width - shownW;
      // A hard contact shadow under the sheet, so it lies ON the desk.
      r.rect(edge, SHEET_Y + SHEET_H, SHEET_W - (edge - SHEET_X) + 2, 2, 'rgba(0,0,0,0.45)');
      r.imagePixel(sheet, Math.round(edge * DETAIL), Math.round(SHEET_Y * DETAIL),
        srcX, 0, shownW, sheet.height);
    }
    if (p < 1) drawRoll(r, edge, p);

    if (this.t > INTRO + UNROLL + SETTLE) {
      const on = Math.floor(this.t / 30) % 2 === 0;
      if (on) r.text('▼', SCREEN_W - 12, SCREEN_H - 12, { color: '#e8dcc0', shadow: '#20180f' });
    }

    // Fade in from the black the calling script left the screen on, and out
    // again on the way to the credits.
    if (this.t < FADE) r.tint('#000000', 1 - this.t / FADE);
    if (this.leaving > 0) r.tint('#000000', clamp01(this.leaving / FADE));
  }
}

/** 0..1 across the reveal: the corner, the pause on it, then the world. */
function unrollProgress(t: number): number {
  const u = t - INTRO;
  if (u <= 0) return 0;
  if (u < REVEAL_A) return CAELORA_SHARE * (1 - Math.pow(1 - u / REVEAL_A, 2.2));
  if (u < REVEAL_A + HOLD_A) return CAELORA_SHARE;
  const v = clamp01((u - REVEAL_A - HOLD_A) / REVEAL_B);
  return CAELORA_SHARE + (1 - CAELORA_SHARE) * (1 - Math.pow(1 - v, 2.2));
}

/** The desk the chart is lying on: one lamp, off to the right, and dark corners. */
function drawDesk(r: Renderer): void {
  r.clear(rgbStr(DESK));
  for (let y = 0; y < SCREEN_H; y += 2) {
    const k = 1 - Math.abs(y - SCREEN_H * 0.55) / (SCREEN_H * 0.9);
    r.rect(0, y, SCREEN_W, 2, rgbStr(mix(DESK, DESK_LIT, clamp01(k) * 0.9)));
  }
}

/** The paper still on the roll, plus the shadow it throws ahead of itself. */
function drawRoll(r: Renderer, edge: number, p: number): void {
  const w = ROLL_W - 3 * p;
  r.rect(edge - w - 5, SHEET_Y + 1, 5, SHEET_H - 1, 'rgba(0,0,0,0.35)');
  r.rect(edge - w, SHEET_Y - 1, w, SHEET_H + 2, rgbStr(ROLL_C));
  r.rect(edge - w + 1, SHEET_Y - 1, Math.max(1, w - 2), SHEET_H + 2, rgbStr(ROLL_B));
  r.rect(edge - w + 1, SHEET_Y - 1, Math.max(1, Math.round(w * 0.4)), SHEET_H + 2, rgbStr(ROLL_A));
}

/* ------------------------------------------------------------------ bake */

function bakeSheet(): HTMLCanvasElement | null {
  const W = SHEET_W * DETAIL;
  const H = SHEET_H * DETAIL;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;

  const img = ctx.createImageData(W, H);
  const data = img.data;
  const land = new Uint8Array(W * H);
  const relief = new NoiseField(40, 28, 0x2b71f3);
  const rough = new NoiseField(64, 44, 0x77c1a5);

  for (let py = 0; py < H; py++) {
    const sy = (py + 0.5) / DETAIL;
    for (let px = 0; px < W; px++) {
      const sx = (px + 0.5) / DETAIL;
      const i = py * W + px;

      // How far inside land we are, 0 at the coast and up towards 1 inland.
      let inland = -1;
      for (const L of LANDS) {
        const dx = (sx - L.x);
        const dy = (sy - L.y) / L.squash;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > L.r * 1.6) continue;
        const a = Math.atan2(dy, dx);
        const wob = 1
          + L.rough * 0.42 * Math.sin(3 * a + L.seed)
          + L.rough * 0.26 * Math.sin(5 * a - L.seed * 1.7)
          + L.rough * 0.16 * Math.sin(8 * a + L.seed * 2.3)
          + (rough.at(sx / 4 + 2, sy / 4 + 2) - 0.5) * L.rough * 0.5;
        const rr = L.r * wob;
        const v = 1 - d / Math.max(1, rr);
        if (v > inland) inland = v;
      }
      for (const s of ISLES) {
        const dx = sx - s.x;
        const dy = sy - s.y;
        const v = 1 - Math.sqrt(dx * dx + dy * dy) / s.r;
        if (v > inland) inland = Math.max(inland, v * 0.5);
      }
      // Caelora: the ring, with the strait cut out of it.
      {
        const nx = (sx - CAE.x) / CAE.rx;
        const ny = (sy - CAE.y) / CAE.ry;
        const d = Math.sqrt(nx * nx + ny * ny);
        const a = Math.atan2(ny, nx);
        const wob = 1 + 0.10 * Math.sin(3 * a + 1.1) + 0.06 * Math.sin(5 * a - 0.4);
        const outer = wob;
        const inner = CAE_INNER * (1 + 0.10 * Math.sin(4 * a + 2.2));
        const gap = Math.abs(wrapAngle(a - STRAIT_A)) < STRAIT_W;
        if (!gap && d < outer && d > inner) {
          const t = (d - inner) / Math.max(0.02, outer - inner);
          const v = Math.min(t, 1 - t) * 2;
          if (v > inland) inland = v;
        }
      }

      let col: RGB;
      if (inland >= 0) {
        const e = clamp01(inland * (0.35 + 0.9 * relief.at(sx / 5.8 + 1, sy / 5.8 + 1)));
        if (inland < 0.05) col = SHOAL;
        else if (e < 0.22) col = LAND_LOW;
        else if (e < 0.48) col = LAND_MID;
        else col = LAND_HIGH;
        // Hachure: raked strokes crossing themselves on the high ground, the
        // way relief was drawn before contours. A flat band reads as a stain.
        if (e > 0.42 && (px + py) % 6 < 1) col = mix(col, INK_SOFT, 0.30);
        if (e > 0.66 && (px - py + 900) % 6 < 1) col = mix(col, INK_SOFT, 0.34);
        land[i] = 1;
      } else {
        col = SEA;
        // Open water goes a shade deeper away from anything, so the sheet has
        // somewhere for the eye to rest.
        const far = clamp01((0 - inland) * 1.4);
        col = mix(col, SEA_DEEP, far * 0.7);
      }
      const grain = ihash(px, py);
      col = mix(col, PAPER, (grain - 0.5) * 0.10 + 0.02);

      const o = i * 4;
      data[o] = col[0];
      data[o + 1] = col[1];
      data[o + 2] = col[2];
      data[o + 3] = 255;
    }
  }

  inkCoast(data, land, W, H);
  agePaper(data, W, H);
  ctx.putImageData(img, 0, 0);

  drawRhumbs(ctx, W, H);
  drawFrame(ctx, W, H);
  drawRose(ctx);
  // Lettering first: the scale bar sits inside the cartouche, and the
  // cartouche's own fill would paint over a bar drawn before it.
  drawLettering(ctx);
  drawScaleBar(ctx);
  lampFall(ctx, W, H);
  return cv;
}

/** A pen line along every shore, and two hatch lines out into the water beside it. */
function inkCoast(data: Uint8ClampedArray, land: Uint8Array, W: number, H: number): void {
  const set = (i: number, c: RGB, t: number) => {
    const o = i * 4;
    data[o] = data[o]! + (c[0] - data[o]!) * t;
    data[o + 1] = data[o + 1]! + (c[1] - data[o + 1]!) * t;
    data[o + 2] = data[o + 2]! + (c[2] - data[o + 2]!) * t;
  };
  const dist = new Int16Array(W * H).fill(-1);
  const queue: number[] = [];
  for (let py = 1; py < H - 1; py++) {
    for (let px = 1; px < W - 1; px++) {
      const i = py * W + px;
      if (!land[i]) continue;
      if (land[i - 1] && land[i + 1] && land[i - W] && land[i + W]) continue;
      set(i, INK, 0.85);
      dist[i] = 0;
      queue.push(i);
    }
  }
  // Two rings of offshore hatching, which is what makes a coast read as a coast
  // on paper rather than as a colour change.
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]!;
    const d = dist[i]!;
    if (d >= 5) continue;
    const px = i % W;
    const py = (i / W) | 0;
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (j < 0 || j >= W * H || dist[j] !== -1 || land[j]) continue;
      dist[j] = d + 1;
      queue.push(j);
      const qx = j % W;
      const qy = (j / W) | 0;
      if (d + 1 <= 2) set(j, INK_SOFT, 0.30 - (d + 1) * 0.08);
      else if ((qx + qy) % 4 < 1) set(j, INK_SOFT, 0.16);
    }
    void px; void py;
  }
}

/** Sixteen years in a bin by a door: grain, foxing and a tide of damp at the edges. */
function agePaper(data: Uint8ClampedArray, W: number, H: number): void {
  const stains = new NoiseField(20, 14, 0x5a3c1d);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const i = (py * W + px) * 4;
      const s = stains.at(px / (DETAIL * 11) + 1, py / (DETAIL * 11) + 1);
      let t = clamp01((s - 0.62) * 1.5) * 0.22;
      // The edges have been handled, rolled and unrolled more than the middle.
      const ex = Math.min(px, W - 1 - px) / (12 * DETAIL);
      const ey = Math.min(py, H - 1 - py) / (12 * DETAIL);
      t += (1 - clamp01(Math.min(ex, ey))) * 0.18;
      if (ihash(px * 3 + 7, py * 5 + 11) > 0.9985) t = Math.max(t, 0.55);
      if (t <= 0) continue;
      data[i] = data[i]! + (FOX[0] - data[i]!) * t;
      data[i + 1] = data[i + 1]! + (FOX[1] - data[i + 1]!) * t;
      data[i + 2] = data[i + 2]! + (FOX[2] - data[i + 2]!) * t;
    }
  }
}

/**
 * Rhumb lines from the rose. On a real chart of this age they cross the land
 * as happily as the water, which is exactly why they can be laid down last and
 * cheaply -- sixteen straight lines over the top of everything.
 */
function drawRhumbs(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = rgbStr(INK_SOFT);
  ctx.lineWidth = 1;
  const cx = ROSE.x * DETAIL;
  const cy = ROSE.y * DETAIL;
  const reach = Math.hypot(W, H);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(cx) + 0.5, Math.round(cy) + 0.5);
    ctx.lineTo(Math.round(cx + Math.cos(a) * reach) + 0.5, Math.round(cy + Math.sin(a) * reach) + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** A double rule round the sheet, with the tick marks a chart carries. */
function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save();
  ctx.strokeStyle = rgbStr(INK);
  ctx.lineWidth = 1;
  const inset = [3 * DETAIL, 5 * DETAIL];
  for (const m of inset) {
    ctx.strokeRect(m + 0.5, m + 0.5, W - m * 2 - 1, H - m * 2 - 1);
  }
  ctx.globalAlpha = 0.85;
  const a = inset[0]!;
  const b = inset[1]!;
  for (let x = a; x < W - a; x += 4 * DETAIL) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x) + 0.5, a);
    ctx.lineTo(Math.round(x) + 0.5, b);
    ctx.moveTo(Math.round(x) + 0.5, H - a);
    ctx.lineTo(Math.round(x) + 0.5, H - b);
    ctx.stroke();
  }
  for (let y = a; y < H - a; y += 4 * DETAIL) {
    ctx.beginPath();
    ctx.moveTo(a, Math.round(y) + 0.5);
    ctx.lineTo(b, Math.round(y) + 0.5);
    ctx.moveTo(W - a, Math.round(y) + 0.5);
    ctx.lineTo(W - b, Math.round(y) + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRose(ctx: CanvasRenderingContext2D): void {
  const cx = ROSE.x * DETAIL;
  const cy = ROSE.y * DETAIL;
  const R = ROSE.r * DETAIL;
  ctx.save();
  ctx.strokeStyle = rgbStr(INK);
  ctx.fillStyle = rgbStr(INK);
  ctx.lineWidth = 1;
  for (const k of [1, 0.62]) {
    ctx.beginPath();
    ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const long = i % 2 === 0;
    const tip = R * (long ? 1.14 : 0.80);
    const wide = R * 0.17;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * tip, cy + Math.sin(a) * tip);
    ctx.lineTo(cx + Math.cos(a + Math.PI / 2) * wide, cy + Math.sin(a + Math.PI / 2) * wide);
    ctx.lineTo(cx + Math.cos(a + Math.PI) * wide * 0.5, cy + Math.sin(a + Math.PI) * wide * 0.5);
    ctx.closePath();
    ctx.globalAlpha = long ? 0.9 : 0.55;
    ctx.fill();
  }
  ctx.restore();
}

function drawScaleBar(ctx: CanvasRenderingContext2D): void {
  const w = SCALE_BAR.w * DETAIL;
  const x = SCALE_BAR.x * DETAIL;
  const y = SCALE_BAR.y * DETAIL;
  const h = 2 * DETAIL;
  ctx.save();
  ctx.strokeStyle = rgbStr(INK);
  ctx.fillStyle = rgbStr(INK);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  for (let k = 0; k < 6; k += 2) {
    ctx.fillRect(x + (w / 6) * k, y, w / 6, h);
  }
  ctx.restore();
}

/**
 * The only two names on the sheet.
 *
 * CAELORA is small, set beside the crescent with a hairline leader, and it is
 * the first thing the unroll brings on. AVERRA sits in the head of the chart
 * and arrives about halfway, by which time the proportion has already made the
 * argument and the word is only confirming it.
 */
function drawLettering(ctx: CanvasRenderingContext2D): void {
  // The cartouche. Without it the title is set straight over a coastline and
  // neither the word nor the coast survives the collision.
  const cx = CARTOUCHE.x * DETAIL;
  const cy = CARTOUCHE.y * DETAIL;
  const cw = CARTOUCHE.w * DETAIL;
  const ch = CARTOUCHE.h * DETAIL;
  ctx.save();
  ctx.fillStyle = 'rgba(228,213,181,0.94)';
  ctx.fillRect(cx, cy, cw, ch);
  ctx.strokeStyle = rgbStr(INK);
  ctx.lineWidth = 1;
  ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);
  ctx.globalAlpha = 0.7;
  ctx.strokeRect(cx + 2.5, cy + 2.5, cw - 5, ch - 5);
  ctx.restore();

  const title = makeTextSprite('AVERRA', {
    scale: DETAIL * 2,
    fill: ['#5c4630'],
    outline: null,
    letterSpacing: 3,
  });
  ctx.drawImage(title, Math.round(cx + cw / 2 - title.width / 2), Math.round(cy + 5 * DETAIL));

  const rule = makeTextSprite('THE KNOWN WORLD', {
    scale: DETAIL,
    fill: ['#6f5942'],
    outline: null,
    letterSpacing: 2,
  });
  ctx.drawImage(rule, Math.round(cx + cw / 2 - rule.width / 2), Math.round(cy + 17 * DETAIL));

  // Set right of the crescent's centre on purpose: the reveal pauses with only
  // the last 60 units of the sheet showing, and the name has to be whole in
  // that window or the beat is a shape nobody can put a word to.
  const cae = makeTextSprite('CAELORA', { scale: DETAIL, fill: ['#4a3a2a'], outline: null });
  const anchor = CAE.x + 6;
  const lx = Math.round(anchor * DETAIL - cae.width / 2);
  const ly = Math.round((CAE.y + CAE.ry + 4) * DETAIL);
  ctx.drawImage(cae, lx, ly);
  ctx.save();
  ctx.strokeStyle = rgbStr(INK_SOFT);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(Math.round(anchor * DETAIL) + 0.5, Math.round((CAE.y + CAE.ry * 0.5) * DETAIL) + 0.5);
  ctx.lineTo(Math.round(anchor * DETAIL) + 0.5, ly - 1.5);
  ctx.stroke();
  ctx.restore();
}

/** One lamp on a desk at night: warm in the middle, gone at the corners. */
function lampFall(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const g = ctx.createRadialGradient(W * 0.62, H * 0.52, H * 0.16, W * 0.62, H * 0.52, H * 1.05);
  g.addColorStop(0, 'rgba(255,236,196,0.12)');
  g.addColorStop(0.45, 'rgba(255,236,196,0.00)');
  g.addColorStop(1, 'rgba(26,18,10,0.42)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

void SCREEN_W;
