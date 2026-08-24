/**
 * What the game will do to a delivered PNG, done offline.
 *
 * This is a line-for-line mirror of the seating in `src/gfx/kinart.ts` and the
 * icon reduction in `src/gfx/kinsprite.ts`, in plain arrays instead of canvases.
 * It exists so the checker and the contact sheet can report and draw the sprite
 * the player will actually see -- not the file they handed over.
 *
 * Mirrors are a liability, so keep the shape obvious: the constants below are
 * the same constants, the four steps are the same four steps, in the same
 * order, and nothing here is "improved". If the loader's framing ever moves,
 * `tools/shots/seat.js` re-measures it and both sides change together.
 *
 *   1. flatten alpha at 50%          (a fringe would widen every measurement)
 *   2. find the ink, shrink to fit    (only a drawing too big for the cell)
 *   3. seat it: centre x=64, last row 123
 *   4. nudge up to one pixel to land on the even grid, then lay the shadow
 */

export const CELL = 128;
export const GROUND_ROW = 123;
export const CENTRE_X = CELL / 2;
export const ALPHA_CUT = 128;
export const ICON_SIZE = CELL / 2;
/** Below this fraction of flat 2x2 blocks, the 64px icon looks soft. */
export const SOFT_ICON = 0.6;

/** Flatten every part-transparent pixel, and say how many there were and where.
 *  An interior soft pixel is a different mistake from a soft edge -- one is a
 *  ghost, the other is anti-aliasing -- so they are counted separately. */
export function hardenAlpha(px) {
  const { w, h, data } = px;
  let soft = 0, interior = 0;
  const wasSoft = [];
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a === 0 || a === 255) continue;
    soft++;
    wasSoft.push((i - 3) / 4);
    data[i] = a >= ALPHA_CUT ? 255 : 0;
  }
  // Interior = flattened to opaque and completely surrounded by opaque.
  for (const p of wasSoft) {
    const x = p % w, y = (p / w) | 0;
    if (!data[p * 4 + 3]) continue;
    let boxed = true;
    for (let dy = -1; dy <= 1 && boxed; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) { boxed = false; break; }
        if (!data[(ny * w + nx) * 4 + 3]) { boxed = false; break; }
      }
    }
    if (boxed) interior++;
  }
  return { soft, interior, edge: soft - interior };
}

export function inkBounds(px) {
  const { w, h, data } = px;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < ALPHA_CUT) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Nearest-neighbour, source-driven, hard alpha. Identical to a straight copy
 *  when nothing needed reducing. */
function paint(src, b, scale, dw, dh, dx, dy, dest) {
  const iw = b.x1 - b.x0 + 1, ih = b.y1 - b.y0 + 1;
  for (let j = 0; j < dh; j++) {
    const ty = dy + j;
    if (ty < 0 || ty >= CELL) continue;
    const sy = b.y0 + (scale === 1 ? j : Math.min(ih - 1, Math.floor((j + 0.5) / scale)));
    for (let i = 0; i < dw; i++) {
      const tx = dx + i;
      if (tx < 0 || tx >= CELL) continue;
      const sx = b.x0 + (scale === 1 ? i : Math.min(iw - 1, Math.floor((i + 0.5) / scale)));
      const s = (sy * src.w + sx) * 4;
      if (src.data[s + 3] < ALPHA_CUT) continue;
      const d = (ty * CELL + tx) * 4;
      dest[d] = src.data[s];
      dest[d + 1] = src.data[s + 1];
      dest[d + 2] = src.data[s + 2];
      dest[d + 3] = 255;
    }
  }
}

/** Fraction of 2x2 blocks, on the canvas's own even grid, that are one flat
 *  colour. This number is exactly what decides whether the 64px icon is a real
 *  halving or a majority vote. */
export function gridScore(data, w = CELL, h = CELL, step = 2) {
  let blocks = 0, flat = 0;
  for (let y = 0; y + step - 1 < h; y += step) {
    for (let x = 0; x + step - 1 < w; x += step) {
      let any = false;
      for (let j = 0; j < step && !any; j++) {
        for (let i = 0; i < step; i++) if (data[((y + j) * w + x + i) * 4 + 3]) { any = true; break; }
      }
      if (!any) continue;
      blocks++;
      const i0 = (y * w + x) * 4;
      let same = true;
      for (let j = 0; j < step && same; j++) {
        for (let i = 0; i < step; i++) {
          const k = ((y + j) * w + x + i) * 4;
          if (data[k] !== data[i0] || data[k + 1] !== data[i0 + 1]
            || data[k + 2] !== data[i0 + 2] || data[k + 3] !== data[i0 + 3]) { same = false; break; }
        }
      }
      if (same) flat++;
    }
  }
  return blocks ? flat / blocks : 1;
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** The same contact shadow the generator bakes into every sprite, composited
 *  underneath (destination-over) so it never enters a measurement. */
export function contactShadow(dest, ink) {
  const span = ink.x1 - ink.x0;
  if (span <= 0) return;
  const centre = (ink.x0 + ink.x1) / 2 + span * 0.06;
  const rx = span * 0.56;
  const ry = Math.max(6, rx * 0.18);
  const cy = ink.y1 - 2;
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (d > 1) continue;
      const px = Math.round(centre + x), py = Math.round(cy + y);
      if (px < 0 || py < 0 || px >= CELL || py >= CELL) continue;
      if (d > 0.72 && BAYER[py & 3][px & 3] >= ((1 - d) / 0.28) * 16) continue;
      const k = (py * CELL + px) * 4;
      if (dest[k + 3]) continue;               // destination-over: art wins
      const inner = d < 0.42;
      dest[k] = inner ? 14 : 18;
      dest[k + 1] = inner ? 17 : 22;
      dest[k + 2] = inner ? 24 : 30;
      dest[k + 3] = Math.round((inner ? 0.34 : 0.18) * 255);
    }
  }
}

/**
 * Seat a decoded image the way the game will.
 *
 * `px` is mutated (its alpha is hardened) -- callers want that, because every
 * other measurement they take should be on the same hard-alpha pixels the game
 * sees. Returns null only when there is no ink at all, which is the one case
 * the loader also refuses.
 */
export function seat(px, { shadow = true } = {}) {
  const softness = hardenAlpha(px);
  const b = inkBounds(px);
  if (!b) return null;

  const iw = b.w, ih = b.h;
  const scale = Math.min(1, CELL / iw, (GROUND_ROW + 1) / ih);
  const dw = Math.max(1, Math.round(iw * scale));
  const dh = Math.max(1, Math.round(ih * scale));
  const baseX = Math.round(CENTRE_X - dw / 2);
  const baseY = GROUND_ROW - dh + 1;

  // Which half-pixel phase the drawing's own grid sits on. Always shifted up
  // and left, so the creature can never be pushed below the ground line.
  let best = { x: 0, y: 0 }, bestScore = -1, restScore = -1;
  for (const y of [0, 1]) {
    for (const x of [0, 1]) {
      const test = new Uint8ClampedArray(CELL * CELL * 4);
      paint(px, b, scale, dw, dh, baseX - x, baseY - y, test);
      const s = gridScore(test);
      if (!x && !y) restScore = s;
      if (s > bestScore + 1e-9) { bestScore = s; best = { x, y }; }
    }
  }
  const shift = (best.x || best.y) && bestScore - restScore < 0.05 ? { x: 0, y: 0 } : best;

  const out = new Uint8ClampedArray(CELL * CELL * 4);
  paint(px, b, scale, dw, dh, baseX - shift.x, baseY - shift.y, out);
  const grid = gridScore(out);
  const placed = inkBounds({ w: CELL, h: CELL, data: out }) ?? { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
  if (shadow) contactShadow(out, placed);

  return { data: out, w: CELL, h: CELL, source: b, scale, shift, gridScore: grid, placed, softness };
}

/**
 * The 64px party icon: the front sprite halved by taking the dominant colour of
 * each 2x2 block. On art drawn in 2x2 blocks the dominant colour IS the block's
 * colour, so the reduction is exact and invents nothing. `exact` says which of
 * those two happened.
 */
export function icon(seated) {
  const out = new Uint8ClampedArray(ICON_SIZE * ICON_SIZE * 4);
  const src = seated.data;
  let blocks = 0, exactBlocks = 0;
  for (let y = 0; y < ICON_SIZE; y++) {
    for (let x = 0; x < ICON_SIZE; x++) {
      const counts = new Map();
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * CELL + x * 2 + dx) * 4;
          if (src[i + 3] < ALPHA_CUT) continue;
          const key = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      if (!counts.size) continue;
      blocks++;
      if (counts.size === 1) exactBlocks++;
      let bestKey = 0, bestN = 0;
      for (const [k, n] of counts) if (n > bestN) { bestKey = k; bestN = n; }
      const d = (y * ICON_SIZE + x) * 4;
      out[d] = (bestKey >> 16) & 0xff;
      out[d + 1] = (bestKey >> 8) & 0xff;
      out[d + 2] = bestKey & 0xff;
      out[d + 3] = 255;
    }
  }
  return { data: out, w: ICON_SIZE, h: ICON_SIZE, blocks, exactBlocks, exact: blocks === exactBlocks };
}
