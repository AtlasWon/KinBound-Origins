/**
 * Display text as pixel art.
 *
 * Titles and headings are built by expanding the 5x7 font into a bigger grid and
 * then treating the result as a sprite: a hard outline, a banded vertical fill
 * and a drop shadow. This is how the era made logos look solid at low
 * resolution, and it keeps every pixel on the grid.
 */

import { getGlyph, GLYPH_H, GLYPH_W } from './font.js';

export interface TextSpriteOptions {
  scale?: number;
  /** Vertical colour bands, top to bottom. One entry means a flat fill. */
  fill?: string[];
  outline?: string | null;
  shadow?: string | null;
  shadowOffset?: number;
  /** Extra pixels between characters, in unscaled units. */
  letterSpacing?: number;
}

export function makeTextSprite(text: string, opts: TextSpriteOptions = {}): HTMLCanvasElement {
  const scale = Math.max(1, Math.floor(opts.scale ?? 3));
  const fill = opts.fill ?? ['#ffffff'];
  const outline = opts.outline === undefined ? '#181820' : opts.outline;
  const shadow = opts.shadow ?? null;
  const shadowOffset = opts.shadowOffset ?? 2;
  const spacing = opts.letterSpacing ?? 1;

  const chars = [...text];
  const cellW = GLYPH_W + spacing;
  const gridW = chars.length * cellW - spacing;
  const gridH = GLYPH_H;

  // Build a 1-bit mask first; outlining is then a simple neighbour test.
  const mask = new Uint8Array(gridW * gridH);
  chars.forEach((ch, ci) => {
    const g = getGlyph(ch);
    if (!g) return;
    for (let y = 0; y < GLYPH_H; y++) {
      for (let x = 0; x < GLYPH_W; x++) {
        if (g.bits[y * GLYPH_W + x]) {
          mask[y * gridW + ci * cellW + x] = 1;
        }
      }
    }
  });

  const pad = outline ? 1 : 0;
  const outW = (gridW + pad * 2) * scale + (shadow ? shadowOffset * scale : 0);
  const outH = (gridH + pad * 2) * scale + (shadow ? shadowOffset * scale : 0);

  const cv = document.createElement('canvas');
  cv.width = outW;
  cv.height = outH;
  const cx = cv.getContext('2d')!;
  cx.imageSmoothingEnabled = false;

  const px = (gx: number, gy: number, color: string, ox = 0, oy = 0) => {
    cx.fillStyle = color;
    cx.fillRect((gx + pad + ox) * scale, (gy + pad + oy) * scale, scale, scale);
  };

  const on = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < gridW && y < gridH && mask[y * gridW + x] === 1;

  if (shadow) {
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (on(x, y)) px(x, y, shadow, shadowOffset, shadowOffset);
      }
    }
  }

  if (outline) {
    for (let y = -1; y <= gridH; y++) {
      for (let x = -1; x <= gridW; x++) {
        if (on(x, y)) continue;
        // 8-neighbour outline reads better than 4 at this size.
        if (
          on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1) ||
          on(x - 1, y - 1) || on(x + 1, y - 1) || on(x - 1, y + 1) || on(x + 1, y + 1)
        ) {
          px(x, y, outline);
        }
      }
    }
  }

  for (let y = 0; y < gridH; y++) {
    const band = fill[Math.min(fill.length - 1, Math.floor((y / gridH) * fill.length))]!;
    for (let x = 0; x < gridW; x++) {
      if (on(x, y)) px(x, y, band);
    }
  }

  return cv;
}
