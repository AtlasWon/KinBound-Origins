/**
 * Text layout.
 *
 * Every overlap this game has shipped came from the same three habits: a fixed
 * x for a value column that assumed a short label, a paragraph drawn with no
 * idea how tall it would end up, and two strings written from opposite ends of
 * the same bar with nothing checking they did not meet in the middle.
 *
 * The fix is not forty nudged constants, it is measuring. Everything here takes
 * the box it is drawing into and refuses to leave it: `fit` shortens, `para`
 * clamps, `pair` gives up the middle rather than colliding. Screens ask for a
 * rectangle and get text inside it, at 240x160 and at every string length the
 * data can produce.
 */

import type { Renderer } from '../engine/renderer.js';

/** Height of one line of the 5x7 face plus its natural leading. */
export const LINE = 10;

/** A tighter pitch for body copy in a small panel. Still clears the descenders. */
export const LINE_TIGHT = 9;

/**
 * Minimum clear space between two pieces of text on the same row.
 *
 * Five units, plus the blank column every glyph carries on its right, is six --
 * exactly the clearance a typed space produces. That is the number to hold it
 * against, and it is worth being precise about which gap is meant: a *letter*
 * gap in this face is one single column, and five of them between two words
 * would be enormous. Anything less than a word's worth here and the eye joins
 * the two strings, which is what "changes a valueX switches tab" was.
 *
 * Letters sitting too close INSIDE a word is a different fault with a different
 * home -- it is the glyph advances in `gfx/font.ts`, not this constant. Two
 * spacing passes were spent here before that was understood.
 */
export const GAP = 5;

/** Units of frame plus bevel an `r.window` eats on each side. */
export const FRAME = 3;

export interface Rect { x: number; y: number; w: number; h: number }

/**
 * The rectangle you may actually draw into, given a window's outer rectangle.
 * `window()` spends 2 units on border and highlight and one more on the inner
 * bevel, and text laid against that line reads as touching the frame.
 */
export function inside(x: number, y: number, w: number, h: number, pad = 2): Rect {
  const p = FRAME + pad;
  return { x: x + p, y: y + p, w: Math.max(0, w - p * 2), h: Math.max(0, h - p * 2) };
}

/**
 * Shorten `text` until it fits `maxWidth`, marking the cut.
 *
 * The mark is a single period rather than three dots: at 5x7 an ellipsis costs
 * as much as two letters, so it eats the very name it is standing in for.
 */
export function fit(r: Renderer, text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (r.textWidth(text) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && r.textWidth(`${out}.`) > maxWidth) out = out.slice(0, -1);
  return out.length > 1 ? `${out}.` : out;
}

export interface PairOptions {
  color?: string;
  detailColor?: string;
  align?: 'left';
  /** Extra clearance beyond GAP, for a scroll gutter or a badge. */
  gap?: number;
}

/**
 * A label on the left and a value on the right of the same row.
 *
 * The value is measured first and keeps its space; the label is then fitted to
 * whatever is left. That ordering is deliberate -- a truncated name is still
 * recognisable, a truncated number is a lie.
 *
 * Returns the x where the value starts, so a caller can hang something else off
 * it if it needs to.
 */
export function pair(
  r: Renderer, x: number, y: number, w: number,
  label: string, detail: string, opts: PairOptions = {},
): number {
  const gap = GAP + (opts.gap ?? 0);
  const dw = detail ? r.textWidth(detail) : 0;
  const labelMax = Math.max(0, w - (dw ? dw + gap : 0));
  r.text(fit(r, label, labelMax), x, y, { color: opts.color ?? '#282838' });
  if (detail) {
    r.text(detail, x + w, y, { color: opts.detailColor ?? '#485068', align: 'right' });
  }
  return x + w - dw;
}

export interface ParaOptions {
  color?: string;
  lineHeight?: number;
  /** Draw at most this many lines whatever the box height allows. */
  maxLines?: number;
}

/**
 * A wrapped paragraph that cannot outgrow its box.
 *
 * `r.text` with a `maxWidth` wraps happily past the bottom of whatever panel it
 * was given, which is how a four-line move description ended up written across
 * the next move's name. This measures the wrap, clamps it to the height it was
 * handed, and marks the last line when there was more to say.
 *
 * Returns the height actually used, so a caller can stack the next block under
 * it rather than guessing.
 */
export function para(
  r: Renderer, text: string, box: Rect, opts: ParaOptions = {},
): number {
  const lh = opts.lineHeight ?? LINE_TIGHT;
  if (box.w <= 0 || box.h <= 0) return 0;
  const lines = r.wrapText(text, box.w);
  // A line needs its full 7 rows of ink inside the box, not just its origin.
  const room = Math.max(0, Math.floor((box.h - 7) / lh) + 1);
  const limit = Math.min(room, opts.maxLines ?? room, lines.length);
  for (let i = 0; i < limit; i++) {
    let line = lines[i]!;
    // Say that it was cut. A paragraph that simply stops mid-sentence reads as
    // a rendering fault; one that ends in a mark reads as "there is more".
    //
    // The mark's width is RESERVED before the line is trimmed, rather than
    // appended and then fitted. Handing "line .." to fit() lets fit apply its
    // own single-dot mark to the mark, which came out as "... hold ." -- a
    // stray full stop after a space, which reads as a typo rather than as an
    // elision.
    if (i === limit - 1 && limit < lines.length) {
      const MARK = '..';
      const markW = r.textWidth(` ${MARK}`);
      let body = line;
      while (body.length > 1 && r.textWidth(body) + markW > box.w) body = body.slice(0, -1);
      line = `${body.replace(/[ ,;:]+$/, '')} ${MARK}`;
    }
    r.text(line, box.x, box.y + i * lh, { color: opts.color ?? '#282838' });
  }
  return limit > 0 ? (limit - 1) * lh + 7 : 0;
}

/** How tall `para` would draw `text` at width `w`, unclamped. */
export function paraHeight(r: Renderer, text: string, w: number, lineHeight = LINE_TIGHT): number {
  const n = r.wrapText(text, w).length;
  return n > 0 ? (n - 1) * lineHeight + 7 : 0;
}

/**
 * A type chip sized to the word inside it.
 *
 * Fixed-width chips are why the Vellum said VERDAN: the badge was 40 units, the
 * word is 41, and nobody had ever typed a seven-letter type into it. Returns
 * the advance to the next chip.
 */
export function typeChip(
  r: Renderer, x: number, y: number, label: string, color: string,
  h = 9, ink = '#ffffff',
): number {
  const text = label.toUpperCase();
  const w = r.textWidth(text) + 7;
  r.rect(x, y, w, h, color);
  r.outline(x, y, w, h, '#282838');
  r.text(text, x + Math.floor(w / 2), y + Math.floor((h - 7) / 2), { color: ink, align: 'center' });
  return w + 4;
}

/**
 * Draw a run of type chips left to right, and report the width they took.
 * Callers that need to know where the row ends (to hang a level or a number off
 * it) get that without measuring the same strings twice.
 */
export function typeChips(
  r: Renderer, x: number, y: number, labels: string[], colors: string[], h = 9,
): number {
  let cx = x;
  labels.forEach((l, i) => { cx += typeChip(r, cx, y, l, colors[i] ?? '#888', h); });
  return Math.max(0, cx - x - 4);
}
