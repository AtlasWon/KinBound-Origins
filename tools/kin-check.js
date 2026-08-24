/**
 * npm run kin:check -- read every hand-drawn creature PNG and say what is wrong.
 *
 * Ninety-six drawings are going to arrive over weeks, and the alternative to
 * this command is finding out about each mistake one at a time, inside a
 * battle, after a rebuild. So this reads the folder, does to every file exactly
 * what the game's loader will do to it (`tools/lib/kinseat.js` mirrors
 * `src/gfx/kinart.ts` step for step), and reports the difference between what
 * was drawn and what will be seen.
 *
 * It is written for a person, not a build server: findings are grouped by the
 * mistake, worst group first, each group explains what that mistake does on
 * screen and what to change in the export, and each line names the species. A
 * wall of PASS/FAIL would be quicker to write and useless to draw against.
 *
 * Nothing here can break the game. Every file it complains about either loads
 * anyway or falls back to the generated sprite for that species, which is why
 * it exits 0 unless you ask it not to.
 *
 *   npm run kin:check              the report
 *   npm run kin:check -- --json    the same findings as JSON
 *   npm run kin:check -- --strict  exit 1 if anything is broken (for a release)
 *   npm run kin:check -- --all     list every species, delivered or not
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodePng } from './lib/kinpng.js';
import {
  seat, icon, inkBounds, hardenAlpha,
  CELL, GROUND_ROW, ALPHA_CUT, SOFT_ICON,
} from './lib/kinseat.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'kin');

const argv = process.argv.slice(2);
const WANT_JSON = argv.includes('--json');
const STRICT = argv.includes('--strict');
const SHOW_ALL = argv.includes('--all');

/* ------------------------------------------------------------ thresholds */

/** A handful of stray part-transparent pixels is a stray pixel. Dozens is an
 *  anti-aliased export, and it will fringe against the battle background. */
const SOFT_OK = 8;
/** Seated shorter than this and it reads as a baby next to its neighbours. */
const SMALL_H = 56;
/** Front and back are the same creature; more than this much apart in height
 *  and switching views looks like a different one. */
const PAIR_H_DRIFT = 0.15;
/** GBA-era sprites live in 16-24 colours. Past this, something is blending. */
const MANY_COLOURS = 64;
/** Hundreds of colours, most of them used once or twice, or one colour for
 *  every few pixels: both are a lossy encoder's leavings. */
const LOSSY_COLOURS = 200;
const LOSSY_SINGLETON = 0.5;
const LOSSY_PER_PIXEL = 0.1;
/** Below this share of colour changes landing on an even pixel, the drawing is
 *  not really built from 2x2 blocks however flat its big areas are. */
const BLOCKY = 0.75;

/* ------------------------------------------------------------- utilities */

const species = JSON.parse(readFileSync(join(ROOT, 'data', 'creatures', 'species.json'), 'utf8'));
const IDS = species.map((s) => s.id);
const KNOWN = new Set(IDS);
const ORDER = new Map(IDS.map((id, i) => [id, i]));

function pct(x) { return `${Math.round(x * 100)}%`; }
function n(x) { return x.toLocaleString('en-US'); }

function wrap(text, width, indent) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > width) { lines.push(line); line = ''; }
    line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines.map((l) => indent + l).join('\n');
}

function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
    }
  }
  return prev[b.length];
}

/** The species a badly named file was probably meant to be: an id it starts
 *  with, or one close enough that the difference is a typo. */
function nearestId(text) {
  const bare = text.toLowerCase().replace(/[^a-z]/g, '');
  if (!bare) return null;
  const prefix = IDS.filter((id) => bare.startsWith(id)).sort((a, b) => b.length - a.length)[0];
  if (prefix) return prefix;
  let best = null, bestD = Infinity;
  for (const id of IDS) {
    const d = levenshtein(bare, id);
    if (d < bestD) { bestD = d; best = id; }
  }
  return bestD <= Math.max(2, Math.floor(best.length / 4)) ? best : null;
}

/* --------------------------------------------------------- image measures */

/** 4-connected blobs of opaque pixels. The biggest one is the creature; the
 *  rest are signatures, colour swatches and lasso dust, and every one of them
 *  counts as "the creature" when the loader looks for the bounding box. */
function components(px) {
  const { w, h, data } = px;
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || data[start * 4 + 3] < ALPHA_CUT) continue;
    seen[start] = 1;
    stack.push(start);
    let area = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w, y = (p / w) | 0;
      area++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
      for (const q of nb) {
        if (q < 0 || seen[q] || data[q * 4 + 3] < ALPHA_CUT) continue;
        seen[q] = 1;
        stack.push(q);
      }
    }
    out.push({ area, x0, y0, x1, y1 });
  }
  return out.sort((a, b) => b.area - a.area);
}

/**
 * Where the drawing's own pixel blocks change colour.
 *
 * The flat-2x2-block score the loader uses is the number that decides the icon,
 * but it flatters a drawing made of big plain areas: a creature drawn in 3px
 * blocks still scores high, because most 2x2 windows land inside one colour
 * anyway. This is the independent check. In art really drawn in 2x2 blocks
 * every colour change falls on an even pixel; in 1px or 3px art about half of
 * them do. Measured on the seated sprite, which is already nudged onto its best
 * phase, so a low number here means the block size is wrong, not the alignment.
 */
function evenTransitions(data, w, h) {
  let total = 0, even = 0;
  const at = (x, y) => {
    const i = (y * w + x) * 4;
    return data[i + 3] < ALPHA_CUT ? -1 : (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const a = at(x - 1, y), b = at(x, y);
      if (a === b || (a === -1 && b === -1)) continue;
      total++;
      if (x % 2 === 0) even++;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 1; y < h; y++) {
      const a = at(x, y - 1), b = at(x, y);
      if (a === b || (a === -1 && b === -1)) continue;
      total++;
      if (y % 2 === 0) even++;
    }
  }
  return total ? even / total : 1;
}

function colourStats(px) {
  const counts = new Map();
  let opaque = 0;
  for (let i = 0; i < px.data.length; i += 4) {
    if (px.data[i + 3] < ALPHA_CUT) continue;
    opaque++;
    const key = (px.data[i] << 16) | (px.data[i + 1] << 8) | px.data[i + 2];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let singles = 0;
  for (const c of counts.values()) if (c <= 2) singles++;
  return { colours: counts.size, opaque, singletonFraction: counts.size ? singles / counts.size : 0 };
}

/**
 * Does the bottom of the drawing look like a shadow the artist drew?
 *
 * The game lays its own contact shadow under every creature, generated or
 * drawn, so a drawn one is seated as part of the body -- the creature stands a
 * few pixels too high on a dark smear, with the real shadow under that. The
 * tell is a band at the very bottom that is much wider than the body above it
 * and made of dark, colourless pixels.
 */
function looksLikeDrawnShadow(px, ink) {
  if (ink.h < 24) return null;
  const band = Math.max(2, Math.round(ink.h * 0.06));
  const widthAt = (y0, y1) => {
    let lo = px.w, hi = -1;
    for (let y = y0; y <= y1; y++) {
      for (let x = 0; x < px.w; x++) {
        if (px.data[(y * px.w + x) * 4 + 3] < ALPHA_CUT) continue;
        if (x < lo) lo = x;
        if (x > hi) hi = x;
      }
    }
    return hi < 0 ? 0 : hi - lo + 1;
  };
  const bottom = widthAt(ink.y1 - band + 1, ink.y1);
  const body = widthAt(ink.y0, ink.y1 - band);
  if (!bottom || !body || bottom < body * 1.35 || bottom - body < 10) return null;

  let dark = 0, total = 0;
  for (let y = ink.y1 - band + 1; y <= ink.y1; y++) {
    for (let x = 0; x < px.w; x++) {
      const i = (y * px.w + x) * 4;
      if (px.data[i + 3] < ALPHA_CUT) continue;
      total++;
      const r = px.data[i], g = px.data[i + 1], b = px.data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (luma < 100 && sat < 60) dark++;
    }
  }
  if (!total || dark / total < 0.7) return null;
  return { bottom, body };
}

/* ------------------------------------------------------------ read files */

if (!existsSync(DIR)) {
  console.log(`kin:check: there is no ${DIR}. Nothing to check yet.`);
  process.exit(0);
}

const entries = readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isFile());
const ignoredNames = new Set(['index.json', 'readme.md', '.gitkeep', 'thumbs.db', 'desktop.ini', '.ds_store']);

const records = [];      // one per usable, named-correctly PNG
const badNames = [];     // files in the folder that will never be read
const failures = [];     // PNGs that are named right and cannot be decoded

for (const d of entries) {
  const name = d.name;
  const lower = name.toLowerCase();
  if (ignoredNames.has(lower)) continue;

  if (!lower.endsWith('.png')) {
    badNames.push({ name, why: 'is not a .png, so the game never looks at it', fix: null });
    continue;
  }
  const m = /^(.+)-(front|back)\.png$/i.exec(name);
  if (!m) {
    const guess = nearestId(lower.replace(/\.png$/, '').replace(/(front|back|f|b)$/, ''));
    const view = /back|rear|_b\b/i.test(lower) ? 'back' : 'front';
    badNames.push({
      name,
      why: 'is not named <species-id>-front.png or <species-id>-back.png, so the game ignores it',
      fix: guess ? `rename it ${guess}-${view}.png` : null,
    });
    continue;
  }
  const id = m[1].toLowerCase();
  const view = m[2].toLowerCase();
  if (!KNOWN.has(id)) {
    const guess = nearestId(id);
    badNames.push({
      name,
      why: `"${id}" is not one of the 48 species ids`,
      fix: guess ? `did you mean ${guess}-${view}.png?` : 'check the id against data/creatures/species.json',
    });
    continue;
  }

  const bytes = readFileSync(join(DIR, name));
  const rec = {
    name, id, view,
    bytes: bytes.length,
    sha: createHash('sha1').update(bytes).digest('hex'),
    capitals: name !== lower,
  };

  let img;
  try {
    img = decodePng(bytes);
  } catch (e) {
    failures.push({ name, id, view, why: e.message });
    continue;
  }

  rec.w = img.w;
  rec.h = img.h;
  rec.depth = img.depth;
  rec.colourType = img.colour;
  rec.interlaced = img.interlace;
  rec.chunks = img.chunks;
  rec.paletteSize = img.paletteSize;

  const px = { w: img.w, h: img.h, data: img.rgba };
  rec.softness = hardenAlpha(px);
  const ink = inkBounds(px);
  if (!ink) {
    failures.push({ name, id, view, why: 'has no opaque pixels at all -- it is empty, or it was saved with everything hidden' });
    continue;
  }
  rec.ink = ink;

  const blobs = components(px);
  const bodyOnly = blobs[0];
  rec.bboxGrowth = {
    left: bodyOnly.x0 - ink.x0,
    right: ink.x1 - bodyOnly.x1,
    top: bodyOnly.y0 - ink.y0,
    bottom: ink.y1 - bodyOnly.y1,
  };
  rec.dust = blobs.slice(1).filter((b) => b.area <= 4).length;
  rec.outliers = blobs.slice(1).filter((b) =>
    b.x1 < bodyOnly.x0 || b.x0 > bodyOnly.x1 || b.y1 < bodyOnly.y0 || b.y0 > bodyOnly.y1).length;

  // Background / frame: every opaque pixel is "the creature" to the loader.
  const corner = (x, y) => px.data[(y * px.w + x) * 4 + 3] >= ALPHA_CUT;
  rec.corners = [corner(0, 0), corner(px.w - 1, 0), corner(0, px.h - 1), corner(px.w - 1, px.h - 1)].filter(Boolean).length;
  const stats = colourStats(px);
  rec.colours = stats.colours;
  rec.opaque = stats.opaque;
  rec.singletonFraction = stats.singletonFraction;
  rec.fill = stats.opaque / (px.w * px.h);

  rec.shadow = looksLikeDrawnShadow(px, ink);

  // How the drawing sits relative to the canvas it was given. The loader fixes
  // this, so it is only a symptom -- of a crop, usually.
  rec.centreOffset = Math.round((ink.x0 + ink.x1) / 2 - px.w / 2);
  rec.touchesEdge = [
    ink.x0 === 0 ? 'left' : null, ink.x1 === px.w - 1 ? 'right' : null,
    ink.y0 === 0 ? 'top' : null, ink.y1 === px.h - 1 ? 'bottom' : null,
  ].filter(Boolean);

  // What the game will actually show.
  const seated = seat({ w: px.w, h: px.h, data: Uint8ClampedArray.from(px.data) });
  rec.scale = seated.scale;
  rec.grid = seated.gridScore;
  rec.shift = seated.shift;
  rec.placed = seated.placed;
  const ic = icon(seated);
  rec.iconExact = ic.exact;
  rec.blocky = evenTransitions(seated.data, CELL, CELL);
  // A background fill is the one fault that makes every other measurement
  // meaningless -- the "creature" is the whole canvas. Say it once.
  rec.background = rec.corners >= 3 || rec.fill > 0.97;

  records.push(rec);
}

/* ------------------------------------------------------------- pair work */

const byId = new Map();
for (const r of records) {
  const slot = byId.get(r.id) ?? {};
  slot[r.view] = r;
  byId.set(r.id, slot);
}
for (const f of failures) {
  const slot = byId.get(f.id) ?? {};
  slot[`${f.view}Failed`] = f;
  byId.set(f.id, slot);
}

const delivered = [...byId.keys()].sort((a, b) => ORDER.get(a) - ORDER.get(b));
const complete = delivered.filter((id) => byId.get(id).front && byId.get(id).back);
const partial = delivered.filter((id) => !(byId.get(id).front && byId.get(id).back));
const missing = IDS.filter((id) => !byId.has(id));

const heights = records.map((r) => r.placed.h).sort((a, b) => a - b);
const medianH = heights.length ? heights[heights.length >> 1] : 0;

/* -------------------------------------------------------------- findings */

const groups = [];
function group(key, rank, title, why, items) {
  if (items.length) groups.push({ key, rank, title, why, items });
}
/** items are { file, line, fix, sort } -- sort descending is "worst first". */

// 1. Will not load.
group('unusable', 1,
  'Damaged files -- what the game draws is anyone\'s guess',
  'Nothing here crashes anything. A file the game cannot decode at all falls back to '
  + 'the procedural sprite for that species and says so in the console -- but a file '
  + 'that is merely damaged is worse than one that is missing: a browser will decode '
  + 'as much of a truncated PNG as arrived and cheerfully draw half a creature '
  + '(measured: a cut-off file rendered as a 72x42 stump, seated and shadowed as '
  + 'though that were the whole animal). Re-export these.',
  failures.map((f) => ({ file: f.name, line: `this tool cannot read it: ${f.why}`, sort: 1 })));

// 2. Anything opaque that is not the creature.
{
  const items = [];
  for (const r of records) {
    if (r.background) {
      items.push({
        file: r.name, sort: 100 + r.fill,
        line: `${pct(r.fill)} of the canvas is opaque and ${r.corners} of the 4 corners are filled`,
        fix: 'the drawing has a background. Delete the background layer and save with '
          + 'real transparency -- as it stands the whole 128x128 square is "the creature", '
          + 'so the seating has nothing to seat.',
      });
      continue;
    }
    const g = r.bboxGrowth;
    const grown = Math.max(g.left, g.right, g.top, g.bottom);
    if (r.outliers && grown > 1) {
      const where = [
        g.left > 1 ? `${g.left}px on the left` : null,
        g.right > 1 ? `${g.right}px on the right` : null,
        g.top > 1 ? `${g.top}px above` : null,
        g.bottom > 1 ? `${g.bottom}px below` : null,
      ].filter(Boolean).join(', ');
      items.push({
        file: r.name, sort: 50 + grown,
        line: `${r.outliers} detached mark(s) outside the creature, pushing the bounding box out by ${where}`,
        fix: 'a signature, a colour swatch or lasso dust. Everything opaque counts as the '
          + 'creature when the loader seats it, so this shifts the whole drawing off the '
          + 'ground line. Erase it.',
      });
    } else if (r.dust >= 4) {
      items.push({
        file: r.name, sort: 10 + r.dust,
        line: `${r.dust} loose speck(s) of 1-4 pixels away from the body`,
        fix: 'harmless where they are, but they will be seated and shadowed with the '
          + 'creature. Worth a pass with the eraser.',
      });
    }
  }
  group('stray', 2, 'Something on the canvas that is not the creature',
    'The loader finds the bounding box of every opaque pixel and seats that on the '
    + 'ground line. One dot in a corner is part of the creature as far as it is concerned.',
    items);
}

// 3. Soft edges.
{
  const items = [];
  for (const r of records) {
    if (r.softness.soft <= SOFT_OK) continue;
    const edgeLen = Math.max(1, Math.round(2 * (r.ink.w + r.ink.h)));
    const share = r.softness.soft / edgeLen;
    items.push({
      file: r.name, sort: r.softness.soft,
      line: `${n(r.softness.soft)} part-transparent pixel(s)`
        + (share > 0.5 ? ` -- roughly ${pct(Math.min(1, share))} of the outline` : '')
        + (r.softness.interior ? `, ${n(r.softness.interior)} of them inside the body` : ''),
      fix: null,
    });
  }
  group('soft', 3, 'Soft, anti-aliased edges',
    'Every part-transparent pixel is forced to fully-on or fully-off at 50% when the '
    + 'file loads, so a soft edge loses its whole fringe in one step and you no longer '
    + 'choose where the silhouette lands. It shows worst in the white hit-flash, which '
    + 'is that silhouette lit up at full size. Draw with a hard pencil, not a brush, and '
    + 'if you resize anything use nearest-neighbour, never bilinear. '
    + `(Up to ${SOFT_OK} stray pixels are not reported.)`,
    items);
}

// 4. Canvas size.
{
  const items = [];
  for (const r of records) {
    if (r.w === CELL && r.h === CELL) continue;
    const scale = CELL / Math.max(r.w, r.h);
    items.push({
      file: r.name, sort: Math.abs(Math.log(scale)),
      line: `canvas is ${r.w}x${r.h}, not ${CELL}x${CELL}`,
      fix: r.w < CELL
        ? `the art is fitted, so its pixels end up ${(CELL / r.w).toFixed(1)}x the size of `
          + 'every other sprite on screen -- half the detail of its neighbours.'
        : 'the art is nearest-neighbour shrunk to fit, which costs crispness.',
    });
  }
  group('canvas', 4, 'Wrong canvas size',
    `Everything on screen is drawn at the same pixel scale. A ${CELL}x${CELL} file keeps it; `
    + 'anything else is fitted, and then the creature\'s pixels are a different size from '
    + 'its neighbours\'.',
    items);
}

// 5. Too big for the cell.
{
  const items = records.filter((r) => r.scale < 1 && !r.background).map((r) => ({
    file: r.name, sort: 1 - r.scale,
    line: `the creature is ${r.ink.w}x${r.ink.h}, so it was shrunk to ${pct(r.scale)}`,
    fix: null,
  }));
  group('oversize', 5, 'Creature too big for the cell',
    `The cell is ${CELL} wide and ${GROUND_ROW + 1} tall, measured from the ground line up. `
    + 'Anything larger is nearest-neighbour reduced by a fraction, which lands pixels on '
    + 'half-steps and is the one thing that reliably turns pixel art to mush. Redraw '
    + 'inside the box rather than letting the loader do it.',
    items);
}

// 6. The 2-pixel grid, which decides the icon.
{
  const items = [];
  for (const r of records) {
    if (r.view !== 'front') continue;       // only the front becomes an icon
    if (r.background) continue;             // already reported, and unmeasurable
    const offBlock = r.blocky < BLOCKY;
    if (r.grid >= 0.98 && !offBlock) continue;
    const bad = r.grid < SOFT_ICON || offBlock;
    // Floor, not round: 99.6% must not print as a clean 100%.
    const on = `${Math.floor(r.grid * 100)}%`;
    items.push({
      file: r.name, sort: (offBlock ? 1 : 0) + (1 - r.grid),
      line: `${on} of it sits on the 2-pixel grid`
        + (r.shift.x || r.shift.y ? ` (after the loader nudged it ${r.shift.x}px left, ${r.shift.y}px up)` : '')
        + (offBlock
          ? `, and only ${pct(r.blocky)} of its colour changes land on an even pixel -- so the `
            + 'detail in it is 1 or 3 pixels wide, whatever the big flat areas score'
          : ''),
      fix: bad
        ? 'the 64px icon will be visibly soft in the party rows, the switch screen, the '
          + 'Roost and the title flock. Draw it at 64x64 and scale up 2x with '
          + 'nearest-neighbour, or work with a 2x2 pencil.'
        : 'close. The icon is nearly a clean halving; the blocks that are not flat are '
          + 'usually a stray outline pixel or a one-pixel highlight.',
    });
  }
  group('grid', 6, 'Off the 2-pixel grid, so the 64px icon will be soft',
    'The party icon is the front sprite halved. Art built from 2x2 blocks halves exactly '
    + '-- every icon pixel is a colour that was really there. Art that is not gets the '
    + 'majority colour of each block instead, and looks blurred at icon size. The loader '
    + 'will shift a drawing by up to one pixel to find the grid, so the alignment to the '
    + 'canvas does not matter; the block size does. 100% is the target.',
    items);
}

// 7. Colour.
{
  const items = [];
  for (const r of records) {
    const perPixel = r.opaque ? r.colours / r.opaque : 0;
    if (r.colours >= LOSSY_COLOURS
      && (r.singletonFraction >= LOSSY_SINGLETON || perPixel >= LOSSY_PER_PIXEL)) {
      items.push({
        file: r.name, sort: 1000 + r.colours,
        line: `${n(r.colours)} colours across ${n(r.opaque)} opaque pixels`
          + (r.singletonFraction >= LOSSY_SINGLETON
            ? `, ${pct(r.singletonFraction)} of them used on only one or two pixels`
            : ` -- one new colour every ${(1 / perPixel).toFixed(1)} pixels`),
        fix: 'that is the signature of a lossy encoder -- the art has been through a JPEG, '
          + 'or a screenshot of a JPEG, before it got here. Every flat area is now a cloud '
          + 'of near-identical colours, which also breaks the 2x2 halving for the icon. '
          + 'Go back to the original and export straight to PNG.',
      });
    } else if (r.colours > MANY_COLOURS) {
      items.push({
        file: r.name, sort: r.colours,
        line: `${n(r.colours)} colours`,
        fix: 'nothing breaks, but the era this game is drawing from ran to 16-24 colours a '
          + 'sprite. A count this high usually means a soft airbrush or a gradient, which '
          + 'will not read as pixel art next to the generated creatures.',
      });
    }
  }
  group('colour', 7, 'Colour counts that suggest the art has been degraded',
    'A count of the distinct colours in the opaque pixels, and of how many of those '
    + 'colours are used essentially once.',
    items);
}

// 8. Size and seating oddities.
{
  const items = [];
  for (const r of records) {
    if (r.placed.h < SMALL_H) {
      items.push({
        file: r.name, sort: 200 + (SMALL_H - r.placed.h),
        line: `seated only ${r.placed.h}px tall, in a ${GROUND_ROW + 1}px cell`,
        fix: 'it will stand next to creatures twice its height. Unless it is meant to be '
          + 'tiny, draw it bigger -- the loader seats art at the size it is given and '
          + 'never scales up.',
      });
    } else if (medianH && records.length >= 6 && r.placed.h > medianH * 1.45) {
      items.push({
        file: r.name, sort: 100 + r.placed.h,
        line: `seated ${r.placed.h}px tall against a roster median of ${medianH}px`,
        fix: 'fine if this one is a big creature; worth a look if it is not.',
      });
    }
  }
  for (const id of delivered) {
    const { front, back } = byId.get(id);
    if (!front || !back) continue;
    const drift = Math.abs(front.placed.h - back.placed.h) / Math.max(front.placed.h, back.placed.h);
    if (drift <= PAIR_H_DRIFT) continue;
    items.push({
      file: `${id}-front.png / ${id}-back.png`, sort: 300 + drift,
      line: `front is ${front.placed.h}px tall, back is ${back.placed.h}px -- ${pct(drift)} apart`,
      fix: 'both views sit on the same ground line, so when the battle switches between '
        + 'them the creature visibly grows or shrinks. Match the heights.',
    });
  }
  for (const r of records) {
    if (!r.touchesEdge.length || r.background) continue;
    items.push({
      file: r.name, sort: 150 + r.touchesEdge.length,
      line: `the ink runs right up to the ${r.touchesEdge.join(' and ')} edge of the canvas`,
      fix: 'the loader will seat it anyway. Check it is not cropped: whatever was past the '
        + 'edge when you drew it is gone, and it is gone in the silhouette and the hit-flash too.',
    });
  }
  for (const r of records) {
    if (Math.abs(r.centreOffset) < 24) continue;
    items.push({
      file: r.name, sort: 20 + Math.abs(r.centreOffset) / 10,
      line: `the drawing sits ${Math.abs(r.centreOffset)}px ${r.centreOffset < 0 ? 'left' : 'right'} of the middle of its canvas`,
      fix: 'not a fault by itself -- the loader centres the real ink, which is what makes '
        + 'inconsistent framing survivable. Worth a glance in case the creature was drawn '
        + 'half off the canvas.',
    });
  }
  for (const r of records) {
    if (!r.shadow) continue;
    items.push({
      file: r.name, sort: 250,
      line: `the bottom of the drawing is ${r.shadow.bottom}px wide against a ${r.shadow.body}px `
        + 'body, in dark colourless pixels',
      fix: 'this looks like a hand-drawn shadow. The game lays down its own contact shadow '
        + 'under every creature, so a drawn one gets seated as part of the body -- the '
        + 'creature ends up standing a few pixels high, on two shadows. Delete it. '
        + '(If that is just wide dark feet, ignore this.)',
    });
  }
  group('seating', 8, 'Seated, but it will look wrong standing there',
    'The loader puts the creature\'s real ink on the ground line at row ' + GROUND_ROW
    + ' and centres it on x=' + (CELL / 2) + ', so framing does not have to be exact. Size does.',
    items);
}

// 9. Export settings.
{
  const items = [];
  for (const r of records) {
    if (r.capitals) {
      items.push({ file: r.name, sort: 90, line: 'has capital letters in its filename',
        fix: 'Windows does not care and a case-sensitive web host does. The file that '
          + 'worked all through the art pass 404s the day the game is published. Rename '
          + `it ${r.name.toLowerCase()}.` });
    }
    if (r.interlaced) {
      items.push({ file: r.name, sort: 70, line: 'is Adam7 interlaced',
        fix: 'the game loads it and this check reads it, but `npm run kinart` skips the '
          + 'analysis of an interlaced file, so you lose the on-grid report on the one '
          + 'command that runs during a build. Untick "interlaced" when saving.' });
    }
    if (r.depth === 16) {
      items.push({ file: r.name, sort: 60, line: 'is 16 bits per channel',
        fix: 'twice the file size for colour depth nothing in this game can show. Save as '
          + '8-bit.' });
    }
    if (r.chunks?.includes('iCCP')) {
      items.push({ file: r.name, sort: 80, line: 'carries an embedded colour profile (iCCP)',
        fix: 'the browser colour-manages it and the tools do not, so the colours on screen '
          + 'are not the ones you picked, and the two halves of the roster drift apart. '
          + 'Export without an embedded profile ("convert to sRGB", no profile).' });
    } else if (r.chunks?.includes('gAMA')) {
      items.push({ file: r.name, sort: 40, line: 'carries a gamma chunk (gAMA)',
        fix: 'usually harmless, but it lets the browser adjust your colours on load. If '
          + 'this creature looks slightly off-colour in game, this is why.' });
    }
  }
  group('export', 9, 'Export settings worth changing',
    'None of these change what is drawn. They change what happens to it between your '
    + 'editor and the screen.',
    items);
}

// 10. Files the game will never look at.
group('names', 10, 'Files in the folder the game will never read',
  'The loader only reads <species-id>-front.png and <species-id>-back.png, with the id '
  + 'exactly as it appears in data/creatures/species.json. Anything else is ignored '
  + 'silently, which is how a drawing goes missing without a single error.',
  badNames.map((b) => ({ file: b.name, sort: 1, line: b.why, fix: b.fix })));

// 11. One drawing doing two jobs.
{
  const items = [];
  const seenSha = new Map();
  for (const r of records) {
    const prev = seenSha.get(r.sha);
    if (prev) {
      items.push({
        file: r.name, sort: 20,
        line: `is byte-identical to ${prev}`,
        fix: prev.split('-')[0] === r.id
          ? 'the front and the back are the same file, so the creature does not turn round '
            + 'when the battle switches views -- and if it faces left as a front should, it '
            + 'walks backwards as a back.'
          : 'two different species are sharing one drawing.',
      });
    } else seenSha.set(r.sha, r.name);
  }
  group('duplicate', 7.5, 'The same drawing delivered twice', 'Byte for byte the same file.', items);
}

// 12. The to-do list. Not a fault, and not worth a paragraph each.
{
  const items = [];
  const noBack = partial.filter((id) => byId.get(id).front && !byId.get(id).back);
  const noFront = partial.filter((id) => byId.get(id).back && !byId.get(id).front);
  if (noBack.length) {
    items.push({
      file: `${noBack.length} species with a front and no back`, sort: 2,
      line: noBack.join(' '),
      fix: 'each of these fights with a hand-drawn front and a generated back, so the '
        + 'creature changes style when the battle turns it round. Nothing breaks.',
    });
  }
  if (noFront.length) {
    items.push({
      file: `${noFront.length} species with a back and no front`, sort: 1,
      line: noFront.join(' '),
      fix: 'the front is the one that is seen most -- as the opponent, in the party rows '
        + 'and as the icon -- so these are the ones to draw next.',
    });
  }
  group('pairs', 12, 'Half-delivered species',
    'Art can arrive in any order and the game stays playable throughout; this is a '
    + 'to-do list, not a fault.',
    items);
}

groups.sort((a, b) => a.rank - b.rank);

/* ----------------------------------------------------------------- print */

if (WANT_JSON) {
  console.log(JSON.stringify({
    folder: 'assets/kin',
    expected: IDS.length * 2,
    present: records.length,
    unreadable: failures.length,
    speciesComplete: complete,
    speciesPartial: partial,
    speciesMissing: missing,
    findings: groups.map((g) => ({
      key: g.key, title: g.title,
      items: g.items.sort((a, b) => b.sort - a.sort).map((i) => ({ file: i.file, problem: i.line, fix: i.fix ?? null })),
    })),
    files: records.map((r) => ({
      file: r.name, species: r.id, view: r.view,
      canvas: [r.w, r.h], depth: r.depth, interlaced: r.interlaced,
      inkSource: r.ink, seated: r.placed, scale: r.scale,
      gridScore: Number(r.grid.toFixed(4)), iconExact: r.iconExact,
      softPixels: r.softness.soft, colours: r.colours, bytes: r.bytes,
    })),
  }, null, 2));
  process.exit(STRICT && (failures.length || badNames.length) ? 1 : 0);
}

const W = 84;
const line = (s = '') => console.log(s);

line();
line('KinBound creature art  --  assets/kin');
line('='.repeat(W));
line();

const expected = IDS.length * 2;
line(`  files       ${String(records.length).padStart(3)} readable`
  + (failures.length ? `, ${failures.length} unreadable` : '')
  + `   of ${expected} expected (${IDS.length} species, front and back)`);
line(`  species     ${String(complete.length).padStart(3)} complete`
  + `, ${partial.length} half done, ${missing.length} not started`);

// `includes`, not `===`: a finding about a front/back pair names both files.
const clean = records.filter((r) => !groups.some((g) =>
  g.key !== 'pairs' && g.items.some((i) => i.file.includes(r.name))));
if (records.length) {
  line(`  quality     ${String(clean.length).padStart(3)} file(s) with nothing to report`
    + `, ${records.length - clean.length} with something`);
  const exactIcons = records.filter((r) => r.view === 'front' && r.iconExact).length;
  const fronts = records.filter((r) => r.view === 'front').length;
  if (fronts) line(`  icons       ${String(exactIcons).padStart(3)} of ${fronts} front sprite(s) halve exactly to a clean 64px icon`);
}
line();

if (!records.length && !failures.length && !badNames.length) {
  line('  The folder is empty. Every species is still drawn by the procedural');
  line('  pipeline, which is exactly what should happen until art arrives.');
  line();
  line('  Drop <species-id>-front.png and <species-id>-back.png in assets/kin and');
  line('  run this again. See assets/kin/README.md for the full spec.');
  line();
  process.exit(0);
}

const realProblems = groups.filter((g) => g.key !== 'pairs');
if (!realProblems.length) {
  line(records.length
    ? '  Nothing wrong with any of it.'
    + (partial.length ? ' Only the missing halves, listed below.' : '')
    : '  Nothing readable in the folder yet.');
  line();
} else {
  // An index first: the report is long, and the order of the sections is the
  // order to work in.
  line('WHAT IS WRONG, WORST FIRST');
  line('-'.repeat(W));
  realProblems.forEach((g, i) => {
    const label = `  ${i + 1}. ${g.title}`;
    line(label.slice(0, W - 12).padEnd(W - 12) + `${g.items.length} file(s)`.padStart(12));
  });
  line();

  for (const g of realProblems) {
    line(`${g.title.toUpperCase()}   (${g.items.length})`);
    line('-'.repeat(W));
    line(wrap(g.why, W - 2, '  '));
    line();
    for (const item of g.items.sort((a, b) => b.sort - a.sort)) {
      line(`  ${item.file}`);
      line(wrap(item.line, W - 8, '      '));
      if (item.fix) line(wrap('-> ' + item.fix, W - 8, '      '));
      line();
    }
  }
}

const pairGroup = groups.find((g) => g.key === 'pairs');
if (pairGroup) {
  line(`${pairGroup.title.toUpperCase()}   (${pairGroup.items.length})`);
  line('-'.repeat(W));
  line(wrap(pairGroup.why, W - 2, '  '));
  line();
  for (const item of pairGroup.items.sort((a, b) => b.sort - a.sort)) {
    line(`  ${item.file}`);
    line(wrap(item.line, W - 8, '      '));
    if (item.fix) line(wrap('-> ' + item.fix, W - 8, '      '));
    line();
  }
}

if (records.length) {
  line('EVERY FILE');
  line('-'.repeat(W));
  line('  file                        canvas   creature  seated    on-grid   soft  colours');
  const sorted = [...records].sort((a, b) =>
    (ORDER.get(a.id) - ORDER.get(b.id)) || a.view.localeCompare(b.view));
  for (const r of sorted) {
    const flag = r.grid < SOFT_ICON || r.blocky < BLOCKY ? '!' : r.grid < 0.98 ? '?' : ' ';
    line('  ' + r.name.padEnd(28)
      + `${r.w}x${r.h}`.padEnd(9)
      + `${r.ink.w}x${r.ink.h}`.padEnd(10)
      + `${r.placed.w}x${r.placed.h}`.padEnd(9)
      + (`${Math.floor(r.grid * 100)}%${flag}`).padStart(8)
      + String(r.softness.soft).padStart(7)
      + String(r.colours).padStart(9));
  }
  line();
  line('  creature = the ink in the file.  seated = what the game will draw, standing');
  line(`  on row ${GROUND_ROW}.  on-grid 100% means the 64px icon is an exact halving; "!" means`);
  line('  it will be soft.  soft = part-transparent pixels, which should be 0.');
  line();
}

if (missing.length && (SHOW_ALL || missing.length < IDS.length)) {
  line(`STILL TO DRAW   (${missing.length} species, ${missing.length * 2} files)`);
  line('-'.repeat(W));
  line(wrap(missing.join(' '), W - 2, '  '));
  line();
  line('  These render through the procedural pipeline, as they always have.');
  line();
}

if (records.length) {
  line('  npm run kin:sheet   draws the whole roster, and its icons, into build/shots');
  line('                      so it can be looked at rather than read about.');
  line();
}

// Nothing here is fatal to the game, so the default is a clean exit even when
// the report is full of faults; --strict is for a release check, where a
// species silently falling back to its generated sprite is worth stopping for.
const brokenKeys = ['unusable', 'stray', 'soft', 'canvas', 'names', 'duplicate'];
process.exit(STRICT && groups.some((g) => brokenKeys.includes(g.key)) ? 1 : 0);
