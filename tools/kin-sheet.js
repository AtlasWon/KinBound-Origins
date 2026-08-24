/**
 * npm run kin:sheet -- the whole hand-drawn roster on one page.
 *
 * Two PNGs into build/shots:
 *
 *   kin-sheet.png        every image-backed species, front and back, seated
 *                        exactly as the game will seat them, standing on a
 *                        marked ground line, at 1:1.
 *   kin-sheet-icons.png  the same species as 64px party icons, reduced the way
 *                        `iconSprite` reduces them, drawn at 2x so the softness
 *                        of an off-grid halving is visible on the page. A star
 *                        on the name means that halving had to guess.
 *
 * The point of the first sheet is the things you can only see side by side:
 * whether the roster stands at a consistent height, whether every front faces
 * left and every back faces away to the right, whether one creature is drawn at
 * twice the detail of its neighbour. The point of the second is that the icon
 * is where bad art shows first and where nobody looks until the party screen.
 *
 * These are drawn from the files, through the same seating the game uses -- not
 * captured from the running game -- so they work with no build, no Electron and
 * no display. `npx electron tools/capture.cjs tools/shots/...` is still the way
 * to see art inside an actual battle.
 *
 *   npm run kin:sheet
 *   npm run kin:sheet -- --cols 6 --light
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodePng, encodePng } from './lib/kinpng.js';
import { seat, icon, CELL, GROUND_ROW, ICON_SIZE } from './lib/kinseat.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'kin');
const OUT = join(ROOT, 'build', 'shots');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const LIGHT = argv.includes('--light');
const COLS = Math.max(1, parseInt(flag('cols', '4'), 10) || 4);

const THEME = LIGHT ? {
  page: [0xef, 0xf2, 0xf7, 255], cellA: [0xe2, 0xe7, 0xf0, 255], cellB: [0xd8, 0xde, 0xea, 255],
  ground: [0xa8, 0xb4, 0xc8, 255], frame: [0xc2, 0xcb, 0xda, 255],
  text: [0x27, 0x2f, 0x3d, 255], dim: [0x77, 0x82, 0x95, 255], warn: [0xa8, 0x3a, 0x2a, 255],
} : {
  page: [0x14, 0x18, 0x22, 255], cellA: [0x22, 0x2a, 0x3a, 255], cellB: [0x1b, 0x22, 0x30, 255],
  ground: [0x3d, 0x4b, 0x64, 255], frame: [0x2e, 0x38, 0x4c, 255],
  text: [0xd6, 0xdd, 0xea, 255], dim: [0x76, 0x83, 0x99, 255], warn: [0xe8, 0x8a, 0x6a, 255],
};

/* ------------------------------------------------------------- the font */

/**
 * The game's own 5x7 face, so a name on the sheet is drawn in the same letters
 * it will be drawn in on the party screen. Preferably from the compiled build;
 * failing that, straight out of the source, where the glyphs are authored as
 * literal pixel rows precisely so they can be read by eye.
 */
async function loadFont() {
  try {
    const mod = await import(new URL('../build/js/gfx/font.js', import.meta.url).href);
    return {
      glyph: (ch) => mod.getGlyph(ch),
      advance: (ch) => mod.advanceOf(ch),
      tokenize: (s) => mod.tokenize(s),
      w: mod.GLYPH_W, h: mod.GLYPH_H,
    };
  } catch { /* not compiled; read the source instead */ }

  const src = readFileSync(join(ROOT, 'src', 'gfx', 'font.ts'), 'utf8');
  const glyphs = new Map();
  const re = /^\s*(?:'((?:[^'\\]|\\.)*)'|"([^"]*)"):\s*'([.#\s]+)',?\s*$/gm;
  let m;
  while ((m = re.exec(src))) {
    const key = (m[1] ?? m[2]).replace(/\\(.)/g, '$1');
    const rows = m[3].trim().split(/\s+/);
    if (rows.length !== 7 || rows.some((r) => r.length !== 5)) continue;
    glyphs.set(key, rows);
  }
  if (!glyphs.size) throw new Error('could not read the font from src/gfx/font.ts');

  const narrow = new Map();
  const block = /const NARROW[^{]*\{([\s\S]*?)\n\};/.exec(src);
  if (block) {
    const nre = /'((?:[^'\\]|\\.)*)':\s*(\d+)/g;
    let k;
    while ((k = nre.exec(block[1]))) narrow.set(k[1].replace(/\\(.)/g, '$1'), Number(k[2]));
  }
  return {
    glyph: (ch) => {
      const rows = glyphs.get(ch);
      if (!rows) return null;
      const bits = [];
      for (const row of rows) for (const c of row) bits.push(c === '#' ? 1 : 0);
      return { bits, w: 5, h: 7 };
    },
    advance: (ch) => (narrow.get(ch) ?? 5) + 1,
    tokenize: (s) => [...s],
    w: 5, h: 7,
  };
}

/* ----------------------------------------------------------- the canvas */

function surface(w, h, fill) {
  const data = new Uint8ClampedArray(w * h * 4);
  const s = { w, h, data };
  rect(s, 0, 0, w, h, fill);
  return s;
}

function rect(s, x, y, w, h, colour) {
  for (let j = 0; j < h; j++) {
    const py = y + j;
    if (py < 0 || py >= s.h) continue;
    for (let i = 0; i < w; i++) {
      const px = x + i;
      if (px < 0 || px >= s.w) continue;
      const d = (py * s.w + px) * 4;
      s.data[d] = colour[0]; s.data[d + 1] = colour[1]; s.data[d + 2] = colour[2]; s.data[d + 3] = colour[3] ?? 255;
    }
  }
}

/** Straight-alpha source over an opaque page. */
function blit(s, src, x, y, scale = 1) {
  for (let j = 0; j < src.h; j++) {
    for (let i = 0; i < src.w; i++) {
      const si = (j * src.w + i) * 4;
      const a = src.data[si + 3] / 255;
      if (!a) continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = x + i * scale + sx, py = y + j * scale + sy;
          if (px < 0 || py < 0 || px >= s.w || py >= s.h) continue;
          const d = (py * s.w + px) * 4;
          s.data[d] = src.data[si] * a + s.data[d] * (1 - a);
          s.data[d + 1] = src.data[si + 1] * a + s.data[d + 1] * (1 - a);
          s.data[d + 2] = src.data[si + 2] * a + s.data[d + 2] * (1 - a);
          s.data[d + 3] = 255;
        }
      }
    }
  }
}

function text(s, font, str, x, y, colour, scale = 1) {
  let cx = x;
  for (const ch of font.tokenize(str)) {
    const g = font.glyph(ch) ?? font.glyph(ch.toUpperCase()) ?? font.glyph('?');
    if (g) {
      for (let j = 0; j < g.h; j++) {
        for (let i = 0; i < g.w; i++) {
          if (!g.bits[j * g.w + i]) continue;
          rect(s, cx + i * scale, y + j * scale, scale, scale, colour);
        }
      }
    }
    cx += font.advance(ch) * scale;
  }
  return cx - x;
}

function textWidth(font, str, scale = 1) {
  let w = 0;
  for (const ch of font.tokenize(str)) w += font.advance(ch) * scale;
  return Math.max(0, w - scale);
}

/** A hatched box standing in for a view that has no art, so the gap in the
 *  roster is visible rather than blank. */
function placeholder(s, font, x, y, w, h) {
  rect(s, x, y, w, h, THEME.cellB);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if ((i + j) % 8) continue;
      rect(s, x + i, y + j, 1, 1, THEME.frame);
    }
  }
  const label = 'generated';
  text(s, font, label, x + Math.round((w - textWidth(font, label)) / 2), y + Math.round(h / 2) - 3, THEME.dim);
}

/* --------------------------------------------------------------- gather */

const speciesList = JSON.parse(readFileSync(join(ROOT, 'data', 'creatures', 'species.json'), 'utf8'));
const IDS = speciesList.map((sp) => sp.id);
const KNOWN = new Set(IDS);

if (!existsSync(DIR)) {
  console.log('kin:sheet: there is no assets/kin folder yet. Nothing to draw.');
  process.exit(0);
}

const found = new Map();
for (const name of readdirSync(DIR)) {
  const m = /^(.+)-(front|back)\.png$/i.exec(name);
  if (!m) continue;
  const id = m[1].toLowerCase();
  if (!KNOWN.has(id)) continue;
  let seated = null;
  try {
    const img = decodePng(readFileSync(join(DIR, name)));
    seated = seat({ w: img.w, h: img.h, data: img.rgba });
  } catch (e) {
    console.warn(`kin:sheet: ${name} could not be read (${e.message}); it is left off the sheet.`);
    continue;
  }
  if (!seated) {
    console.warn(`kin:sheet: ${name} has no opaque pixels; it is left off the sheet.`);
    continue;
  }
  const slot = found.get(id) ?? {};
  slot[m[2].toLowerCase()] = seated;
  found.set(id, slot);
}

const drawn = IDS.filter((id) => found.has(id));
if (!drawn.length) {
  console.log('kin:sheet: no hand-drawn art in assets/kin yet, so there is nothing to');
  console.log('           contact-sheet. Every species is still generated in code.');
  process.exit(0);
}

const font = await loadFont();
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

/* ---------------------------------------------------------- sheet: full */

{
  const GUTTER = 6;
  const PAD = 14;
  const LABEL = 14;
  const blockW = CELL * 2 + GUTTER;
  const blockH = CELL + LABEL;
  const cols = Math.min(COLS, drawn.length);
  const rows = Math.ceil(drawn.length / cols);
  const HEADER = 44;
  const title = 'KinBound creature art';
  const sub = `${drawn.length} of ${IDS.length} species drawn  -  front faces left, back faces away right  -  1:1, standing on row ${GROUND_ROW}`;
  // Never crop the header: with one species on the sheet the caption is wider
  // than the grid.
  const w = Math.max(PAD + cols * (blockW + PAD), PAD * 2 + textWidth(font, sub));
  const h = HEADER + PAD + rows * (blockH + PAD);
  const sheet = surface(w, h, THEME.page);

  text(sheet, font, title, PAD, 8, THEME.text, 2);
  text(sheet, font, sub, PAD, 28, THEME.dim);

  drawn.forEach((id, i) => {
    const cx = PAD + (i % cols) * (blockW + PAD);
    const cy = HEADER + PAD + Math.floor(i / cols) * (blockH + PAD);
    const slot = found.get(id);
    const shade = (Math.floor(i / cols) + (i % cols)) % 2 ? THEME.cellB : THEME.cellA;

    for (const [k, view] of ['front', 'back'].entries()) {
      const x = cx + k * (CELL + GUTTER);
      rect(sheet, x, cy, CELL, CELL, shade);
      // The floor. Every creature in the game stands on this row, which is the
      // whole reason the loader re-seats hand-made framing.
      rect(sheet, x, cy + GROUND_ROW + 1, CELL, 1, THEME.ground);
      if (slot[view]) blit(sheet, slot[view], x, cy);
      else placeholder(sheet, font, x, cy, CELL, CELL);
    }

    const missing = !slot.front || !slot.back;
    const label = id + (missing ? `  (${slot.front ? 'back' : 'front'} still generated)` : '');
    text(sheet, font, label, cx, cy + CELL + 4, missing ? THEME.warn : THEME.text);
  });

  const file = join(OUT, 'kin-sheet.png');
  writeFileSync(file, encodePng(w, h, sheet.data));
  console.log(`kin:sheet: build/shots/kin-sheet.png   ${w}x${h}, ${drawn.length} species`);
}

/* --------------------------------------------------------- sheet: icons */

{
  const SCALE = 2;
  const PAD = 12;
  const LABEL = 12;
  const cellW = ICON_SIZE * SCALE;
  const cols = Math.min(8, drawn.length);
  const rows = Math.ceil(drawn.length / cols);
  const HEADER = 44;
  const sub = `${ICON_SIZE}px, the front sprite halved, drawn here at ${SCALE}x  -  this is the party row, the switch screen and the Roost`;
  const w = Math.max(PAD + cols * (cellW + PAD), PAD * 2 + textWidth(font, sub));
  const h = HEADER + PAD + rows * (cellW + LABEL + PAD) + 8;
  const sheet = surface(w, h, THEME.page);

  text(sheet, font, 'party icons', PAD, 8, THEME.text, 2);
  text(sheet, font, sub, PAD, 28, THEME.dim);

  drawn.forEach((id, i) => {
    const cx = PAD + (i % cols) * (cellW + PAD);
    const cy = HEADER + PAD + Math.floor(i / cols) * (cellW + LABEL + PAD);
    const slot = found.get(id);
    rect(sheet, cx, cy, cellW, cellW, (i % 2) ? THEME.cellB : THEME.cellA);
    if (!slot.front) {
      placeholder(sheet, font, cx, cy, cellW, cellW);
      text(sheet, font, id, cx, cy + cellW + 3, THEME.dim);
      return;
    }
    const ic = icon(slot.front);
    blit(sheet, ic, cx, cy, SCALE);
    // A star rather than a word: at 64px the cells are narrow enough that two
    // labels on one line run into the next species.
    text(sheet, font, ic.exact ? id : `${id}*`, cx, cy + cellW + 3, ic.exact ? THEME.text : THEME.warn);
  });

  text(sheet, font, '* not an exact halving: this icon is a majority vote per 2x2 block, and looks soft',
    PAD, h - 11, THEME.warn);

  const file = join(OUT, 'kin-sheet-icons.png');
  writeFileSync(file, encodePng(w, h, sheet.data));
  const soft = drawn.filter((id) => found.get(id).front && !icon(found.get(id).front).exact);
  console.log(`kin:sheet: build/shots/kin-sheet-icons.png   ${w}x${h}`
    + (soft.length ? `, ${soft.length} icon(s) not an exact halving: ${soft.join(', ')}` : ', every icon an exact halving'));
}

const half = drawn.filter((id) => !found.get(id).front || !found.get(id).back);
if (half.length) {
  console.log(`kin:sheet: still one view short: ${half.join(', ')}`);
}
const none = IDS.filter((id) => !found.has(id));
if (none.length) {
  console.log(`kin:sheet: ${none.length} species not on the sheet because they have no art yet.`);
}
