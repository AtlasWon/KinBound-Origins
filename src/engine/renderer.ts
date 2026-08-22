/**
 * Renderer.
 *
 * Two coordinate systems, deliberately:
 *
 *  - **Logical units** (240x160) are what every scene lays out in. This is the
 *    native field of the hardware the game is modelled on, and keeping it fixed
 *    means composition, camera framing and text size stay era-correct.
 *  - **Buffer pixels** are `DETAIL` times denser. Art -- tiles, characters,
 *    creatures, the font -- is authored at that density, so the picture carries
 *    roughly four times the detail of the reference hardware while framing the
 *    same amount of world.
 *
 * Everything a scene passes in is logical; the renderer multiplies. The buffer
 * is then blitted to the canvas at an integer scale with smoothing off, so the
 * pixel grid survives all the way to the screen.
 */

import { getGlyph, GLYPH_H, GLYPH_W, advanceOf, measureText, tokenize } from '../gfx/font.js';

/** Logical layout units. */
export const SCREEN_W = 240;
export const SCREEN_H = 160;

/** Buffer pixels per logical unit. */
export const DETAIL = 2;

export const BUFFER_W = SCREEN_W * DETAIL;
export const BUFFER_H = SCREEN_H * DETAIL;

export type Align = 'left' | 'center' | 'right';

export interface TextOptions {
  color?: string;
  /** Drop shadow offset colour; a hard 1-unit shadow, never a blur. */
  shadow?: string | null;
  align?: Align;
  /** Maximum width before wrapping, in logical units. */
  maxWidth?: number;
  lineHeight?: number;
  /** Render only the first N characters, for typewriter dialogue. */
  reveal?: number;
}

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  /** Back buffer everything draws into, at DETAIL density. */
  readonly buffer: HTMLCanvasElement;
  readonly bctx: CanvasRenderingContext2D;

  scale = 1;
  offsetX = 0;
  offsetY = 0;

  /** Camera translation in logical units. */
  camX = 0;
  camY = 0;

  private shakeFrames = 0;
  private shakePower = 0;
  private shakeX = 0;
  private shakeY = 0;

  private atlases = new Map<string, HTMLCanvasElement>();
  private atlasIndex = new Map<string, number>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;

    this.buffer = document.createElement('canvas');
    this.buffer.width = BUFFER_W;
    this.buffer.height = BUFFER_H;
    const bctx = this.buffer.getContext('2d', { alpha: false });
    if (!bctx) throw new Error('2D buffer context unavailable');
    this.bctx = bctx;

    this.ctx.imageSmoothingEnabled = false;
    this.bctx.imageSmoothingEnabled = false;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Fit the buffer to the window at the largest whole-number scale. */
  resize(): void {
    const availW = Math.floor(window.innerWidth);
    const availH = Math.floor(window.innerHeight);
    const scale = Math.max(1, Math.floor(Math.min(availW / BUFFER_W, availH / BUFFER_H)));
    this.scale = scale;
    this.canvas.width = availW;
    this.canvas.height = availH;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.offsetX = Math.floor((availW - BUFFER_W * scale) / 2);
    this.offsetY = Math.floor((availH - BUFFER_H * scale) / 2);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Mapping the input layer needs to turn client pixels into logical units. */
  viewport(): { x: number; y: number; scale: number } {
    return { x: this.offsetX, y: this.offsetY, scale: this.scale * DETAIL };
  }

  /* ------------------------------------------------------------- frame */

  beginFrame(): void {
    if (this.shakeFrames > 0) {
      this.shakeFrames--;
      const p = this.shakePower;
      this.shakeX = Math.round((Math.random() * 2 - 1) * p);
      this.shakeY = Math.round((Math.random() * 2 - 1) * p);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
    this.bctx.imageSmoothingEnabled = false;
  }

  present(): void {
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    c.fillStyle = '#000';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.drawImage(
      this.buffer,
      this.offsetX + this.shakeX * this.scale * DETAIL,
      this.offsetY + this.shakeY * this.scale * DETAIL,
      BUFFER_W * this.scale,
      BUFFER_H * this.scale,
    );
  }

  shake(frames: number, power = 2): void {
    this.shakeFrames = Math.max(this.shakeFrames, frames);
    this.shakePower = power;
  }

  /* ---------------------------------------------------------- primitives */

  clear(color = '#000000'): void {
    this.bctx.fillStyle = color;
    this.bctx.fillRect(0, 0, BUFFER_W, BUFFER_H);
  }

  /** Filled rectangle in logical units. */
  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.bctx.fillStyle = color;
    this.bctx.fillRect(
      Math.floor(x * DETAIL), Math.floor(y * DETAIL),
      Math.max(1, Math.floor(w * DETAIL)), Math.max(1, Math.floor(h * DETAIL)),
    );
  }

  /** A rectangle given directly in buffer pixels, for fine art detail. */
  pixel(x: number, y: number, w: number, h: number, color: string): void {
    this.bctx.fillStyle = color;
    this.bctx.fillRect(Math.floor(x), Math.floor(y), Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
  }

  /** 1-unit outline. */
  outline(x: number, y: number, w: number, h: number, color: string): void {
    const X = Math.floor(x * DETAIL), Y = Math.floor(y * DETAIL);
    const W = Math.floor(w * DETAIL), H = Math.floor(h * DETAIL);
    const t = DETAIL;
    this.bctx.fillStyle = color;
    this.bctx.fillRect(X, Y, W, t);
    this.bctx.fillRect(X, Y + H - t, W, t);
    this.bctx.fillRect(X, Y, t, H);
    this.bctx.fillRect(X + W - t, Y, t, H);
  }

  worldRect(x: number, y: number, w: number, h: number, color: string): void {
    this.rect(x - this.camX, y - this.camY, w, h, color);
  }

  /**
   * Camera origin in buffer pixels. World art snaps against this rather than
   * against logical units, so tiles and sprites share one pixel grid and the
   * scroll never lands anything on a half pixel.
   */
  get camPX(): number { return Math.round(this.camX * DETAIL); }
  get camPY(): number { return Math.round(this.camY * DETAIL); }

  /** World position (logical) to buffer pixel, camera applied. */
  worldPX(x: number): number { return Math.round(x * DETAIL) - this.camPX; }
  worldPY(y: number): number { return Math.round(y * DETAIL) - this.camPY; }

  line(x0: number, y0: number, x1: number, y1: number, color: string): void {
    let x = Math.floor(x0 * DETAIL), y = Math.floor(y0 * DETAIL);
    const ex = Math.floor(x1 * DETAIL), ey = Math.floor(y1 * DETAIL);
    const dx = Math.abs(ex - x), sx = x < ex ? 1 : -1;
    const dy = -Math.abs(ey - y), sy = y < ey ? 1 : -1;
    let err = dx + dy;
    this.bctx.fillStyle = color;
    for (;;) {
      this.bctx.fillRect(x, y, 1, 1);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }

  /** Full-screen tint, used by fades and weather. */
  tint(color: string, alpha: number): void {
    if (alpha <= 0) return;
    this.bctx.save();
    this.bctx.globalAlpha = Math.min(1, alpha);
    this.bctx.fillStyle = color;
    this.bctx.fillRect(0, 0, BUFFER_W, BUFFER_H);
    this.bctx.restore();
  }

  /* -------------------------------------------------------------- images */

  /**
   * Draw an image. `dx`/`dy` are logical; the source rectangle is in the
   * image's own pixels and is blitted 1:1 into the buffer, so art authored at
   * DETAIL density lands at the right logical size automatically.
   */
  image(
    img: CanvasImageSource,
    dx: number, dy: number,
    sx = 0, sy = 0, sw?: number, sh?: number,
    flipX = false, flipY = false,
    alpha = 1,
  ): void {
    const W = sw ?? (img as HTMLCanvasElement).width;
    const H = sh ?? (img as HTMLCanvasElement).height;
    const c = this.bctx;
    const X = Math.round(dx * DETAIL), Y = Math.round(dy * DETAIL);
    if (alpha !== 1) { c.save(); c.globalAlpha = alpha; }
    if (flipX || flipY) {
      c.save();
      c.translate(flipX ? X + W : X, flipY ? Y + H : Y);
      c.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      c.drawImage(img, sx, sy, W, H, 0, 0, W, H);
      c.restore();
    } else {
      c.drawImage(img, sx, sy, W, H, X, Y, W, H);
    }
    if (alpha !== 1) c.restore();
  }

  /** Soft-edged ellipse in buffer pixels. Used for contact shadows. */
  ellipsePixel(cx: number, cy: number, rx: number, ry: number, color: string): void {
    const c = this.bctx;
    c.save();
    c.fillStyle = color;
    c.beginPath();
    c.ellipse(Math.round(cx), Math.round(cy), Math.round(rx), Math.round(ry), 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /** Image draw with the destination already in buffer pixels. */
  imagePixel(
    img: CanvasImageSource, dx: number, dy: number,
    sx: number, sy: number, sw: number, sh: number,
  ): void {
    this.bctx.drawImage(img, sx, sy, sw, sh, Math.round(dx), Math.round(dy), sw, sh);
  }

  worldImage(
    img: CanvasImageSource, dx: number, dy: number,
    sx = 0, sy = 0, sw?: number, sh?: number, flipX = false, alpha = 1,
  ): void {
    this.image(img, dx - this.camX, dy - this.camY, sx, sy, sw, sh, flipX, false, alpha);
  }

  /* ---------------------------------------------------------------- text */

  private atlasFor(color: string): HTMLCanvasElement {
    const existing = this.atlases.get(color);
    if (existing) return existing;

    const keys = this.atlasKeys();
    const gw = GLYPH_W * DETAIL;
    const gh = GLYPH_H * DETAIL;
    const cv = document.createElement('canvas');
    cv.width = keys.length * gw;
    cv.height = gh;
    const cx = cv.getContext('2d')!;
    cx.imageSmoothingEnabled = false;
    cx.fillStyle = color;

    keys.forEach((ch, i) => {
      const g = getGlyph(ch);
      if (!g) return;
      // Glyphs are upscaled with an EPX/Scale2x pass rather than blocky
      // nearest-neighbour: it rounds diagonal stems and corners, which is what
      // keeps text legible once the rest of the art gains detail.
      const hi = scale2x(g.bits, GLYPH_W, GLYPH_H);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          if (hi[y * gw + x]) cx.fillRect(i * gw + x, y, 1, 1);
        }
      }
    });
    this.atlases.set(color, cv);
    return cv;
  }

  private cachedKeys: string[] | null = null;
  private atlasKeys(): string[] {
    if (this.cachedKeys) return this.cachedKeys;
    const keys: string[] = [];
    for (let c = 32; c < 127; c++) keys.push(String.fromCharCode(c));
    for (const extra of ['M~', '>>', '^^', 'vv', '..', 'oM', 'oF']) keys.push(extra);
    keys.forEach((k, i) => this.atlasIndex.set(k, i));
    this.cachedKeys = keys;
    return keys;
  }

  /**
   * Split text into lines that fit `maxWidth`, breaking on spaces, and
   * hard-breaking any single token wider than the box on its own.
   */
  wrapText(text: string, maxWidth: number): string[] {
    const out: string[] = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        for (const piece of this.breakLongWord(word, maxWidth)) {
          const candidate = line.length ? `${line} ${piece}` : piece;
          if (measureText(candidate) <= maxWidth || line.length === 0) {
            line = candidate;
          } else {
            out.push(line);
            line = piece;
          }
        }
      }
      out.push(line);
    }
    return out;
  }

  private breakLongWord(word: string, maxWidth: number): string[] {
    if (measureText(word) <= maxWidth) return [word];
    const pieces: string[] = [];
    let current = '';
    for (const ch of word) {
      if (measureText(current + ch) > maxWidth && current.length > 0) {
        pieces.push(current);
        current = ch;
      } else {
        current += ch;
      }
    }
    if (current) pieces.push(current);
    return pieces;
  }

  textWidth(text: string): number {
    return measureText(text);
  }

  text(text: string, x: number, y: number, opts: TextOptions = {}): number {
    const color = opts.color ?? '#f8f8f8';
    const lineHeight = opts.lineHeight ?? GLYPH_H + 3;
    const lines = opts.maxWidth ? this.wrapText(text, opts.maxWidth) : text.split('\n');

    let revealLeft = opts.reveal ?? Infinity;
    let cy = Math.floor(y);

    for (const line of lines) {
      if (revealLeft <= 0) break;
      const visible = revealLeft === Infinity ? line : line.slice(0, Math.max(0, Math.floor(revealLeft)));
      revealLeft -= line.length;

      let cx = Math.floor(x);
      const fullW = measureText(line);
      if (opts.align === 'center') cx = Math.floor(x - fullW / 2);
      else if (opts.align === 'right') cx = Math.floor(x - fullW);

      if (opts.shadow) this.drawRun(visible, cx + 1, cy + 1, opts.shadow);
      this.drawRun(visible, cx, cy, color);

      cy += lineHeight;
    }
    return cy - Math.floor(y);
  }

  private drawRun(text: string, x: number, y: number, color: string): void {
    const atlas = this.atlasFor(color);
    this.atlasKeys();
    const gw = GLYPH_W * DETAIL;
    const gh = GLYPH_H * DETAIL;
    let cx = x;
    for (const ch of tokenize(text)) {
      const idx = this.atlasIndex.get(ch);
      if (idx !== undefined) {
        this.bctx.drawImage(
          atlas, idx * gw, 0, gw, gh,
          Math.round(cx * DETAIL), Math.round(y * DETAIL), gw, gh,
        );
      }
      cx += advanceOf(ch);
    }
  }

  /* ------------------------------------------------------------- windows */

  /**
   * The standard UI frame: a hard border, an inner highlight and a flat fill,
   * with a soft drop shadow so panels sit above the world rather than in it.
   */
  window(
    x: number, y: number, w: number, h: number,
    style: { fill?: string; border?: string; highlight?: string; shadow?: string } = {},
  ): void {
    const fill = style.fill ?? '#f4f6fb';
    const border = style.border ?? '#232a3d';
    const highlight = style.highlight ?? '#aebbd4';
    const shadow = style.shadow ?? 'rgba(12,16,26,0.32)';

    const X = Math.floor(x), Y = Math.floor(y), W = Math.floor(w), H = Math.floor(h);

    this.rect(X + 2, Y + H, W - 2, 2, shadow);
    this.rect(X + W, Y + 2, 2, H - 2, shadow);

    this.rect(X, Y, W, H, border);
    this.rect(X + 1, Y + 1, W - 2, H - 2, highlight);
    this.rect(X + 2, Y + 2, W - 4, H - 4, fill);

    // A half-unit inner bevel, only possible now that the buffer is denser.
    this.pixel((X + 2) * DETAIL, (Y + 2) * DETAIL, (W - 4) * DETAIL, 1, 'rgba(255,255,255,0.55)');
    this.pixel((X + 2) * DETAIL, (Y + H - 2) * DETAIL - 1, (W - 4) * DETAIL, 1, 'rgba(40,50,70,0.18)');
  }

  /** Selection cursor used by every list in the game. */
  cursor(x: number, y: number, color = '#232a3d'): void {
    const X = Math.floor(x * DETAIL), Y = Math.floor(y * DETAIL);
    const c = this.bctx;
    // Drawn in buffer pixels so the arrow keeps a sharp point at this density.
    for (let i = 0; i < 12; i++) {
      const half = Math.max(0, 6 - Math.abs(i - 6));
      c.fillStyle = color;
      c.fillRect(X, Y + i, 1 + half, 1);
    }
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.fillRect(X, Y + 1, 1, 10);
  }

  /** Horizontal meter (HP / EXP) with a hard frame. */
  meter(
    x: number, y: number, w: number, h: number,
    fraction: number, fill: string, back = '#404058', frame: string | null = '#232a3d',
  ): void {
    const f = Math.max(0, Math.min(1, fraction));
    if (frame) this.outline(x, y, w, h, frame);
    const inx = frame ? 1 : 0;
    this.rect(x + inx, y + inx, w - inx * 2, h - inx * 2, back);
    const innerW = w - inx * 2;
    const filled = f > 0 ? Math.max(0.5, innerW * f) : 0;
    if (filled > 0) {
      this.rect(x + inx, y + inx, filled, h - inx * 2, fill);
      // A lit top edge turns a flat bar into a moulded one.
      this.pixel((x + inx) * DETAIL, (y + inx) * DETAIL, filled * DETAIL, 1, 'rgba(255,255,255,0.45)');
    }
  }
}

/**
 * EPX / Scale2x. Doubles a 1-bit bitmap while rounding corners, using only the
 * four orthogonal neighbours. Designed for exactly this job: enlarging pixel
 * art without either blurring it or turning every edge into a staircase.
 */
function scale2x(src: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * 2 * h * 2);
  const at = (x: number, y: number): number =>
    (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[y * w + x]!;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = at(x, y);
      const a = at(x, y - 1);
      const b = at(x + 1, y);
      const c = at(x - 1, y);
      const d = at(x, y + 1);

      let e0 = p, e1 = p, e2 = p, e3 = p;
      if (c === a && c !== d && a !== b) e0 = a;
      if (a === b && a !== c && b !== d) e1 = b;
      if (d === c && d !== b && c !== a) e2 = c;
      if (b === d && b !== a && d !== c) e3 = d;

      const ow = w * 2;
      out[(y * 2) * ow + x * 2] = e0;
      out[(y * 2) * ow + x * 2 + 1] = e1;
      out[(y * 2 + 1) * ow + x * 2] = e2;
      out[(y * 2 + 1) * ow + x * 2 + 1] = e3;
    }
  }
  return out;
}
