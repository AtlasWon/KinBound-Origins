/**
 * npm run item:check -- read every hand-drawn item PNG and say what is wrong.
 *
 * The items' counterpart to tools/kin-check.js. It reads assets/items, does to
 * every file exactly what the game's loader will do to it
 * (`tools/lib/itemseat.js` mirrors `src/gfx/itemart.ts` step for step), and
 * reports the difference between what was drawn and what will be seen.
 *
 * It is written for a person, not a build server: findings are grouped by the
 * mistake, worst group first, each group explains what that mistake does on
 * screen and what to change in the export. It also prints the thing you
 * actually need most often -- the full list of icon keys, which item each one
 * draws, and which of them are still generated.
 *
 * Nothing here can break the game. Every file it complains about either loads
 * anyway or falls back to the icon generated in src/gfx/itemart.ts, which is
 * why it exits 0 unless you ask it not to.
 *
 *   npm run item:check              the report
 *   npm run item:check -- --json    the same findings as JSON
 *   npm run item:check -- --strict  exit 1 if anything is broken (for a release)
 *   npm run item:check -- --list    just the icon keys, one per line, nothing else
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decodePng } from './lib/kinpng.js';
import {
  seatGroup, icon, inkBounds, hardenAlpha, iconKeys, nameResolver,
  splitFrameName, frameFile, FRAME_STATES,
  CELL, ALPHA_CUT, SOFT_ICON,
} from './lib/itemseat.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'items');

const argv = process.argv.slice(2);
const WANT_JSON = argv.includes('--json');
const STRICT = argv.includes('--strict');
const LIST_ONLY = argv.includes('--list');

/* ------------------------------------------------------------ thresholds */

/** A handful of stray part-transparent pixels is a stray pixel. Dozens, on a
 *  canvas this small, is an anti-aliased export. */
const SOFT_OK = 4;
/** An icon drawn smaller than this rattles around in a row of its neighbours.
 *  Two thirds of the cell is the low end of comfortable. */
const SMALL = 20;
/** GBA-era item icons live in 8-16 colours. Past this, something is blending. */
const MANY_COLOURS = 40;
/** Hundreds of colours on a 32x32 canvas is a lossy encoder's leavings. */
const LOSSY_COLOURS = 120;
const LOSSY_SINGLETON = 0.5;
/** Below this share of colour changes landing on an even pixel, the drawing is
 *  not really built from 2x2 blocks however flat its big areas are. */
const BLOCKY = 0.75;

/* ------------------------------------------------------------- item data */

const items = JSON.parse(readFileSync(join(ROOT, 'data', 'items', 'items.json'), 'utf8'));
const KEYS = iconKeys(items);
const KNOWN = new Map(KEYS.map((k) => [k.key, k]));
const ORDER = new Map(KEYS.map((k, i) => [k.key, i]));
const resolveName = nameResolver(items);

if (LIST_ONLY) {
  for (const k of KEYS) console.log(k.key);
  process.exit(0);
}

/**
 * The frame states the GAME knows about, read out of src/gfx/itemart.ts.
 *
 * `tools/lib/itemseat.js` carries its own copy of the list because the tools
 * cannot import a .ts file, and two copies of a list drift. A state the tools
 * accept and the game ignores is the worst kind of bug for an art pass: the
 * file imports, the report says it is fine, and it never once appears on
 * screen. So the two are compared, here, every run.
 */
function frameStateDrift() {
  let src;
  try {
    src = readFileSync(join(ROOT, 'src', 'gfx', 'itemart.ts'), 'utf8');
  } catch {
    return null;                       // not a source checkout; nothing to compare
  }
  const m = /FRAME_STATES\s*=\s*\[([^\]]*)\]/.exec(src);
  if (!m) return { game: null, tools: Object.keys(FRAME_STATES) };
  const game = [...m[1].matchAll(/'([^']+)'/g)].map((q) => q[1]).sort();
  const tools = Object.keys(FRAME_STATES).sort();
  return game.join(',') === tools.join(',') ? null : { game, tools };
}

/* ------------------------------------------------------------- utilities */

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

/**
 * What to tell someone whose file the game will never read.
 *
 * This is the finding that matters most, because it is the one the FIRST art
 * delivery hit and the one the next one will hit too. The names that arrived
 * were `Potion.png`, `Vessel-closed.png` and `Vessel-open.png`; the game asks
 * for `potion` and `vessel_field`, and it has no "open vessel" at all. None of
 * that is guessable from outside, so the answer here is never "unknown key" on
 * its own -- it is the exact filename to use and the reason, worked out by the
 * same resolver `npm run item:import` uses, so the two can never disagree.
 */
function explainName(stem) {
  const r = resolveName(stem);
  if (!r.ok) {
    return {
      why: `"${r.body}" is not an icon key, an item id or a family name`,
      fix: 'nothing in the game is called that. The list of every key is at the bottom '
        + 'of this report, and "npm run item:list" prints it bare.',
    };
  }
  const to = frameFile(r.key, r.state);
  const lead = {
    'exact': 'the key is right; only the capitals or the punctuation are wrong',
    'item-id': `"${r.body}" is an ITEM ID, and a file is named after the "icon" field in `
      + 'data/items/items.json rather than the id',
    'family': `"${r.body}" is a FAMILY, not an item: the game has `
      + `${(r.members ?? []).length} of them (${(r.members ?? []).join(', ')}), and the basic `
      + 'one is the first',
    'alias': `"${r.body}" is another word for ${r.key}`,
    'typo': `the nearest icon key is ${r.key} -- check that is the one you meant`,
  }[r.why] ?? `the nearest icon key is ${r.key}`;
  const state = r.state
    ? ` It is the "${r.state}" FRAME of that icon rather than an icon of its own -- `
      + `${FRAME_STATES[r.state].what} -- which is why the name has the state on the end.`
    : '';
  return {
    why: `"${stem}" is not one of the ${KEYS.length} icon keys`,
    fix: `${lead}, so rename it ${to}.${state}`
      + '  "npm run item:import" does this renaming for you, along with fitting the'
      + ' art to the cell.',
  };
}

/* --------------------------------------------------------- image measures */

/** 4-connected blobs of opaque pixels. The biggest one is the item; the rest
 *  are stray marks, and every one of them counts as "the item" when the loader
 *  looks for the bounding box to centre. */
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
 * The flat-2x2-block score the loader uses is the number that decides the list
 * icon, but it flatters a drawing made of big plain areas: art in 3px blocks
 * still scores high because most 2x2 windows land inside one colour anyway.
 * This is the independent check. In art really drawn in 2x2 blocks every colour
 * change falls on an even pixel; in 1px or 3px art about half of them do.
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

/* ------------------------------------------------------------ read files */

const records = [];
const badNames = [];
const failures = [];

if (existsSync(DIR)) {
  const entries = readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isFile());
  const ignoredNames = new Set(['index.json', 'readme.md', '.gitkeep', 'thumbs.db', 'desktop.ini', '.ds_store']);

  for (const d of entries) {
    const name = d.name;
    const lower = name.toLowerCase();
    if (ignoredNames.has(lower)) continue;

    if (!lower.endsWith('.png')) {
      badNames.push({ name, why: 'is not a .png, so the game never looks at it', fix: null });
      continue;
    }
    const stem = lower.replace(/\.png$/, '');
    const { key, state } = splitFrameName(stem);
    if (!KNOWN.has(key)) {
      badNames.push({ name, ...explainName(name.replace(/\.png$/i, '')) });
      continue;
    }

    const bytes = readFileSync(join(DIR, name));
    const rec = {
      name, key, state,
      bytes: bytes.length,
      sha: createHash('sha1').update(bytes).digest('hex'),
      capitals: name !== lower,
      items: KNOWN.get(key).items,
    };

    let img;
    try {
      img = decodePng(bytes);
    } catch (e) {
      failures.push({ name, key, why: e.message });
      continue;
    }

    rec.w = img.w;
    rec.h = img.h;
    rec.depth = img.depth;
    rec.interlaced = img.interlace;
    rec.chunks = img.chunks;

    const px = { w: img.w, h: img.h, data: img.rgba };
    rec.softness = hardenAlpha(px);
    const ink = inkBounds(px);
    if (!ink) {
      failures.push({ name, key, why: 'has no opaque pixels at all -- it is empty, or it was saved with everything hidden' });
      continue;
    }
    rec.ink = ink;

    const blobs = components(px);
    const body = blobs[0];
    rec.bboxGrowth = {
      left: body.x0 - ink.x0, right: ink.x1 - body.x1,
      top: body.y0 - ink.y0, bottom: ink.y1 - body.y1,
    };
    rec.dust = blobs.slice(1).filter((b) => b.area <= 2).length;
    rec.outliers = blobs.slice(1).filter((b) =>
      b.x1 < body.x0 || b.x0 > body.x1 || b.y1 < body.y0 || b.y0 > body.y1).length;

    const corner = (x, y) => px.data[(y * px.w + x) * 4 + 3] >= ALPHA_CUT;
    rec.corners = [corner(0, 0), corner(px.w - 1, 0), corner(0, px.h - 1), corner(px.w - 1, px.h - 1)]
      .filter(Boolean).length;

    const stats = colourStats(px);
    rec.colours = stats.colours;
    rec.opaque = stats.opaque;
    rec.singletonFraction = stats.singletonFraction;
    rec.fill = stats.opaque / (px.w * px.h);
    rec.background = rec.corners >= 3 || rec.fill > 0.95;

    rec.touchesEdge = [
      ink.x0 === 0 ? 'left' : null, ink.x1 === px.w - 1 ? 'right' : null,
      ink.y0 === 0 ? 'top' : null, ink.y1 === px.h - 1 ? 'bottom' : null,
    ].filter(Boolean);

    // Seating waits until every file has been read: the frames of one key are
    // measured together, so a key is not ready until its whole group is in.
    rec.px = { w: px.w, h: px.h, data: Uint8ClampedArray.from(px.data) };
    records.push(rec);
  }
}

/* Seat each key's files as one group, exactly as the loader does. */
{
  const groups = new Map();
  for (const r of records) {
    const g = groups.get(r.key) ?? [];
    g.push(r);
    groups.set(r.key, g);
  }
  for (const g of groups.values()) {
    g.sort((a, b) => Number(a.state !== null) - Number(b.state !== null));
    const seated = seatGroup(g.map((r) => ({ state: r.state, px: r.px })));
    g.forEach((r, i) => {
      const s = seated[i];
      r.scale = s.scale;
      r.grid = s.gridScore;
      r.shift = s.shift;
      r.placed = s.placed;
      r.grouped = s.grouped;
      r.iconExact = icon(s).exact;
      r.blocky = evenTransitions(s.data, CELL, CELL);
      delete r.px;
    });
  }
}

const byKey = new Map(records.filter((r) => !r.state).map((r) => [r.key, r]));
const frameRecords = records.filter((r) => r.state);
const drawn = [...byKey.keys()].sort((a, b) => ORDER.get(a) - ORDER.get(b));
const generated = KEYS.map((k) => k.key).filter((k) => !byKey.has(k));

/* -------------------------------------------------------------- findings */

const groups = [];
function group(key, rank, title, why, list) {
  if (list.length) groups.push({ key, rank, title, why, items: list });
}

// 1. Will not load.
group('unusable', 1,
  'Damaged files -- what the game draws is anyone\'s guess',
  'Nothing here crashes anything. A file the game cannot decode at all falls back to '
  + 'the generated icon for that key and says so in the console -- but a file that is '
  + 'merely damaged is worse than one that is missing: a browser will decode as much of '
  + 'a truncated PNG as arrived and cheerfully draw half a potion, centred and sized as '
  + 'though that were the whole drawing. Re-export these.',
  failures.map((f) => ({ file: f.name, line: `this tool cannot read it: ${f.why}`, sort: 1 })));

// 2. Anything opaque that is not the item.
{
  const list = [];
  for (const r of records) {
    if (r.background) {
      list.push({
        file: r.name, sort: 100 + r.fill,
        line: `${pct(r.fill)} of the canvas is opaque and ${r.corners} of the 4 corners are filled`,
        fix: 'the drawing has a background. Delete the background layer and save with real '
          + `transparency -- as it stands the whole ${CELL}x${CELL} square is "the item", so `
          + 'the centring has nothing to centre and the icon is a coloured box in a list.',
      });
      continue;
    }
    const g = r.bboxGrowth;
    const grown = Math.max(g.left, g.right, g.top, g.bottom);
    if (r.outliers && grown > 0) {
      const where = [
        g.left > 0 ? `${g.left}px on the left` : null,
        g.right > 0 ? `${g.right}px on the right` : null,
        g.top > 0 ? `${g.top}px above` : null,
        g.bottom > 0 ? `${g.bottom}px below` : null,
      ].filter(Boolean).join(', ');
      list.push({
        file: r.name, sort: 50 + grown,
        line: `${r.outliers} detached mark(s) outside the item, pushing the bounding box out by ${where}`,
        fix: 'a stray dot, a colour swatch, the corner of another layer. Everything opaque '
          + 'counts as the item when the loader centres it, so this shoves the whole drawing '
          + `off-centre -- and on a ${CELL}px canvas a two-pixel shove is visible. Erase it.`,
      });
    } else if (r.dust >= 2) {
      list.push({
        file: r.name, sort: 10 + r.dust,
        line: `${r.dust} loose speck(s) of 1-2 pixels away from the body`,
        fix: 'harmless where they are, but they are centred with the item and they survive '
          + 'into the 16px icon as a stray dot. Worth a pass with the eraser.',
      });
    }
  }
  group('stray', 2, 'Something on the canvas that is not the item',
    'The loader finds the bounding box of every opaque pixel and centres that in the cell. '
    + 'One dot in a corner is part of the item as far as it is concerned.',
    list);
}

// 3. Soft edges.
{
  const list = [];
  for (const r of records) {
    if (r.softness.soft <= SOFT_OK) continue;
    list.push({
      file: r.name, sort: r.softness.soft,
      line: `${n(r.softness.soft)} part-transparent pixel(s)`
        + (r.softness.interior ? `, ${n(r.softness.interior)} of them inside the body` : ''),
      fix: null,
    });
  }
  group('soft', 3, 'Soft, anti-aliased edges',
    'Every part-transparent pixel is forced to fully-on or fully-off at 50% when the file '
    + `loads. On a ${CELL}px canvas the outline is a large fraction of the drawing, so a soft `
    + 'edge does not lose a fringe -- it loses the shape. Draw with a hard pencil, not a '
    + `brush, and if you resize anything use nearest-neighbour, never bilinear. (Up to `
    + `${SOFT_OK} stray pixels are not reported.)`,
    list);
}

// 4. Canvas size.
{
  const list = [];
  for (const r of records) {
    if (r.w === CELL && r.h === CELL) continue;
    const scale = CELL / Math.max(r.w, r.h);
    list.push({
      file: r.name, sort: Math.abs(Math.log(scale)),
      line: `canvas is ${r.w}x${r.h}, not ${CELL}x${CELL}`,
      fix: r.w < CELL
        ? `the art is fitted, so its pixels end up ${(CELL / r.w).toFixed(1)}x the size of every `
          + 'other pixel on screen -- a chunky icon in a row of fine ones.'
        : r.w > CELL * 4
          ? 'this is an original as it came out of the art tool, not an icon. The loader '
            + 'nearest-neighbour shrinks it at load time, which turns pixel art to mush. Put '
            + 'it back in assets/items/ and run "npm run item:import": that fits a palette at '
            + 'full resolution and takes a per-block vote, which is a completely different '
            + 'answer, and it preserves your original under assets/items/source/.'
          : 'the art is nearest-neighbour shrunk to fit, which costs crispness and almost '
            + 'certainly costs the 2-pixel grid with it. Redraw at ' + CELL + 'x' + CELL + '.',
    });
  }
  group('canvas', 4, 'Wrong canvas size',
    `Everything on screen is drawn at the same pixel scale. A ${CELL}x${CELL} file keeps it; `
    + 'anything else is fitted.',
    list);
}

// 5. Too big for the cell.
group('oversize', 5, 'Drawing too big for the cell',
  `The cell is ${CELL}x${CELL}, and unlike a creature an item is centred in it rather than `
  + 'stood on a line, so there is no reserved margin -- you may use all of it. Anything '
  + 'larger is nearest-neighbour reduced by a fraction, which lands pixels on half-steps '
  + 'and is the one thing that reliably turns pixel art to mush.',
  records.filter((r) => r.scale < 1 && !r.background).map((r) => ({
    file: r.name, sort: 1 - r.scale,
    line: `the drawing is ${r.ink.w}x${r.ink.h}, so it was shrunk to ${pct(r.scale)}`,
    fix: null,
  })));

// 6. The 2-pixel grid, which decides the list icon.
{
  const list = [];
  for (const r of records) {
    // Only an ICON is ever halved. A frame is drawn at 32px by a scene and
    // never appears in a list, so the 2-pixel grid says nothing about it.
    if (r.background || r.state) continue;
    const offBlock = r.blocky < BLOCKY;
    if (r.grid >= 0.98 && !offBlock) continue;
    const bad = r.grid < SOFT_ICON || offBlock;
    const on = `${Math.floor(r.grid * 100)}%`;
    list.push({
      file: r.name, sort: (offBlock ? 1 : 0) + (1 - r.grid),
      line: `${on} of it sits on the 2-pixel grid`
        + (r.shift.x || r.shift.y ? ` (after the loader nudged it ${r.shift.x}px left, ${r.shift.y}px up)` : '')
        + (offBlock
          ? `, and only ${pct(r.blocky)} of its colour changes land on an even pixel -- so the `
            + 'detail in it is 1 or 3 pixels wide, whatever the big flat areas score'
          : ''),
      fix: bad
        ? 'if you are DRAWING this icon: the 16px version is what the bag and the shop list '
          + `show, which is where the item is seen most. Draw it at ${CELL / 2}x${CELL / 2} and `
          + 'scale up 2x with nearest-neighbour, or work with a 2x2 pencil. If this file came '
          + 'out of "npm run item:import", ignore it -- see the note under this list.'
        : 'close. The halving is nearly clean; the blocks that are not flat are usually a '
          + 'stray outline pixel or a one-pixel highlight.',
    });
  }
  group('grid', 6, 'Off the 2-pixel grid, so the 16px list icon may be soft',
    'The bag row and the shop row show the icon halved. Art built from 2x2 blocks halves '
    + 'exactly -- every icon pixel is a colour that was really there. Art that is not gets '
    + 'the majority colour of each block instead, and at 16px that can be the difference '
    + 'between a potion and a smudge. The loader will shift a drawing by up to one pixel to '
    + 'find the grid, so the alignment to the canvas does not matter; the block size does. '
    + '100% is the target for a HAND-DRAWN icon, and every generated icon hits it. '
    + 'BUT: art recovered from a high-resolution original by "npm run item:import" scores low '
    + 'here on purpose. The halving takes the DOMINANT colour of each block, not an average, '
    + 'so a 16px icon reduced from full-resolution art still contains only colours that are '
    + 'really in the drawing -- it invents nothing. Both were built and looked at and the '
    + 'block version lost badly (build/item-compare/). This number measures block alignment, '
    + 'which is a proxy for softness; on an imported file the softness it stands in for did '
    + 'not happen. Judge those at 1x on the contact sheet, not by this percentage.',
    list);
}

// 7. Colour.
{
  const list = [];
  for (const r of records) {
    if (r.colours >= LOSSY_COLOURS && r.singletonFraction >= LOSSY_SINGLETON) {
      list.push({
        file: r.name, sort: 1000 + r.colours,
        line: `${n(r.colours)} colours across ${n(r.opaque)} opaque pixels, `
          + `${pct(r.singletonFraction)} of them used on only one or two pixels`,
        fix: 'that is the signature of a lossy encoder -- the art has been through a JPEG, or '
          + 'a screenshot of a JPEG, before it got here. Every flat area is now a cloud of '
          + 'near-identical colours, which also breaks the 2x2 halving. Go back to the '
          + 'original and export straight to PNG.',
      });
    } else if (r.colours > MANY_COLOURS) {
      list.push({
        file: r.name, sort: r.colours,
        line: `${n(r.colours)} colours on a ${r.w}x${r.h} canvas`,
        fix: 'nothing breaks, but an item icon this size has room for about a dozen colours '
          + 'before they stop being distinguishable. A count this high usually means a soft '
          + 'airbrush or a gradient, and it will not survive the halving.',
      });
    }
  }
  group('colour', 7, 'Colour counts that suggest the art has been degraded',
    'A count of the distinct colours in the opaque pixels, and of how many of those colours '
    + 'are used essentially once.',
    list);
}

// 8. Size and framing oddities.
{
  const list = [];
  const sizes = records.filter((r) => !r.background).map((r) => Math.max(r.placed.w, r.placed.h))
    .sort((a, b) => a - b);
  const median = sizes.length ? sizes[sizes.length >> 1] : 0;
  for (const r of records) {
    if (r.background) continue;
    const big = Math.max(r.placed.w, r.placed.h);
    if (big < SMALL) {
      list.push({
        file: r.name, sort: 200 + (SMALL - big),
        line: `the drawing is only ${r.placed.w}x${r.placed.h} in a ${CELL}x${CELL} cell`,
        fix: 'it will look lost in a row next to icons that fill theirs, and at 16px it is '
          + 'barely there at all. Unless the item is meant to be a small thing held up, fill '
          + 'more of the square -- the loader centres art at the size it is given and never '
          + 'scales it up.',
      });
    } else if (median && records.length >= 5 && big > median * 1.6) {
      list.push({
        file: r.name, sort: 100 + big,
        line: `the drawing is ${r.placed.w}x${r.placed.h} against a median of ${median}px across the set`,
        fix: 'fine if this one is meant to be the big object in the bag; worth a look if not.',
      });
    }
  }
  // Filling the cell is allowed and encouraged, so touching one or two edges is
  // not worth a word -- a tall flask touches top and bottom by design. Three is
  // different: that is a drawing that was bigger than its canvas.
  for (const r of records) {
    if (r.touchesEdge.length < 3 || r.background) continue;
    list.push({
      file: r.name, sort: 150 + r.touchesEdge.length,
      line: `the ink runs right up to the ${r.touchesEdge.join(', ')} edges of the canvas`,
      fix: 'an item may use the whole cell, so this is allowed -- but three edges usually '
        + 'means the drawing was bigger than the canvas and got cropped. Whatever was past '
        + 'the edge when you drew it is gone.',
    });
  }
  group('framing', 8, 'Drawn, but it will look wrong sitting there',
    `The loader centres the real ink in the ${CELL}x${CELL} cell, both axes, so where you put `
    + 'it on the canvas does not matter. How much of the canvas it fills does: that is the '
    + 'only thing setting one icon\'s size against its neighbours in a list.',
    list);
}

// 9. Export settings.
{
  const list = [];
  for (const r of records) {
    if (r.capitals) {
      list.push({ file: r.name, sort: 90, line: 'has capital letters in its filename',
        fix: 'Windows does not care and a case-sensitive web host does. The file that worked '
          + 'all through the art pass 404s the day the game is published. Rename it '
          + `${r.name.toLowerCase()}.` });
    }
    if (r.interlaced) {
      list.push({ file: r.name, sort: 70, line: 'is Adam7 interlaced',
        fix: 'the game loads it, but the tools here cannot analyse an interlaced file, so you '
          + 'lose the on-grid report on it. Untick "interlaced" when saving.' });
    }
    if (r.depth === 16) {
      list.push({ file: r.name, sort: 60, line: 'is 16 bits per channel',
        fix: 'twice the file size for colour depth nothing in this game can show. Save as 8-bit.' });
    }
    if (r.chunks?.includes('iCCP')) {
      list.push({ file: r.name, sort: 80, line: 'carries an embedded colour profile (iCCP)',
        fix: 'the browser colour-manages it and the tools do not, so the colours on screen are '
          + 'not the ones you picked. Export without an embedded profile ("convert to sRGB", '
          + 'no profile).' });
    } else if (r.chunks?.includes('gAMA')) {
      list.push({ file: r.name, sort: 40, line: 'carries a gamma chunk (gAMA)',
        fix: 'usually harmless, but it lets the browser adjust your colours on load. If this '
          + 'icon looks slightly off-colour in game, this is why.' });
    }
  }
  group('export', 9, 'Export settings worth changing',
    'None of these change what is drawn. They change what happens to it between your editor '
    + 'and the screen.',
    list);
}

// 10. Files the game will never look at.
group('names', 10, 'Files in the folder the game will never read',
  'This is the one that catches every delivery, so read the fix line rather than the '
  + 'heading. The loader reads <icon-key>.png, and <icon-key>-<state>.png for the states '
  + `listed at the bottom (${Object.keys(FRAME_STATES).join(', ')}), and nothing else. The `
  + 'icon key is the "icon" field in data/items/items.json -- NOT the item id, NOT the item '
  + 'name, and NOT the name of a family: "vessel" is six different icons. They are '
  + 'deliberately separate because the key is the name of a DRAWING and several items may '
  + 'want the same one. Every line below says the exact filename to use, and '
  + '"npm run item:import" will do the renaming for you.',
  badNames.map((b) => ({ file: b.name, sort: 1, line: b.why, fix: b.fix })));

// 10b. A frame with no icon under it.
{
  const list = [];
  for (const r of frameRecords) {
    if (byKey.has(r.key)) continue;
    list.push({
      file: r.name, sort: 5,
      line: `is the "${r.state}" frame of ${r.key}, but ${frameFile(r.key)} is not here`,
      fix: 'the frame loads and a scene can ask for it, but the item itself still shows the '
        + 'icon generated in code -- so the bag row and the animation are two different '
        + `drawings. Deliver ${frameFile(r.key)} as well.`,
    });
  }
  group('orphan', 5.5, 'A frame with no icon under it',
    'A frame is a state of an icon, not an icon. It never appears in the bag, and on its '
    + 'own it leaves the item drawn by two different hands.', list);
}

// 11. One drawing doing two jobs.
{
  const list = [];
  const seenSha = new Map();
  for (const r of records) {
    const prev = seenSha.get(r.sha);
    if (prev) {
      list.push({
        file: r.name, sort: 20,
        line: `is byte-identical to ${prev}`,
        fix: 'two icon keys are sharing one drawing, so the two items are indistinguishable '
          + 'in the bag. If they are genuinely meant to look the same, point both items at '
          + 'the same "icon" key in items.json and delete one file.',
      });
    } else seenSha.set(r.sha, r.name);
  }
  group('duplicate', 7.5, 'The same drawing delivered twice', 'Byte for byte the same file.', list);
}

groups.sort((a, b) => a.rank - b.rank);

/* ----------------------------------------------------------------- print */

if (WANT_JSON) {
  console.log(JSON.stringify({
    folder: 'assets/items',
    keys: KEYS.map((k) => ({ key: k.key, items: k.items.map((i) => i.id) })),
    frameStates: Object.fromEntries(
      Object.entries(FRAME_STATES).map(([s, d]) => [s, { what: d.what, used: d.used }])),
    frameStateDrift: frameStateDrift(),
    expected: KEYS.length,
    present: records.length,
    unreadable: failures.length,
    drawn,
    generated,
    frames: frameRecords.map((r) => ({ key: r.key, state: r.state, file: r.name })),
    findings: groups.map((g) => ({
      key: g.key, title: g.title,
      items: g.items.sort((a, b) => b.sort - a.sort)
        .map((i) => ({ file: i.file, problem: i.line, fix: i.fix ?? null })),
    })),
    files: records.map((r) => ({
      file: r.name, icon: r.key, state: r.state, items: r.items.map((i) => i.id),
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
line('KinBound item art  --  assets/items');
line('='.repeat(W));
line();
line(`  files       ${String(records.length).padStart(3)} readable`
  + (failures.length ? `, ${failures.length} unreadable` : '')
  + `   of ${KEYS.length} icon key(s) the game asks for`);
line(`  icons       ${String(drawn.length).padStart(3)} hand-drawn, ${generated.length} still generated in code`);
if (frameRecords.length) {
  line(`  frames      ${String(frameRecords.length).padStart(3)} extra frame(s), not items: `
    + frameRecords.map((r) => `${r.key} ${r.state}`).join(', '));
}
if (records.length) {
  const clean = records.filter((r) => !groups.some((g) => g.items.some((i) => i.file.includes(r.name))));
  line(`  quality     ${String(clean.length).padStart(3)} file(s) with nothing to report`
    + `, ${records.length - clean.length} with something`);
  // Icons only: a frame is drawn at 32px by a scene and never halved.
  const icons = records.filter((r) => !r.state);
  const exact = icons.filter((r) => r.iconExact).length;
  line(`  halving     ${String(exact).padStart(3)} of ${icons.length} icon(s) halve exactly to a 16px list`
    + ' icon; the rest take a per-block vote');
}
line();

if (!records.length && !failures.length && !badNames.length) {
  line('  The folder is empty, which is fine: every item is drawn by the generated');
  line('  icons in src/gfx/itemart.ts and the bag looks finished either way.');
  line();
  line(`  Drop <icon-key>.png in assets/items and run this again. The keys are listed`);
  line('  at the bottom of this report, and docs/ITEM-SPEC.md has the full spec.');
  line();
} else if (!groups.length) {
  line('  Nothing wrong with any of it.');
  line();
} else {
  line('WHAT IS WRONG, WORST FIRST');
  line('-'.repeat(W));
  groups.forEach((g, i) => {
    const label = `  ${i + 1}. ${g.title}`;
    line(label.slice(0, W - 12).padEnd(W - 12) + `${g.items.length} file(s)`.padStart(12));
  });
  line();

  for (const g of groups) {
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

if (records.length) {
  line('EVERY FILE');
  line('-'.repeat(W));
  line('  file                      canvas   drawing  on-grid   soft  colours  draws');
  const sorted = [...records].sort((a, b) =>
    (ORDER.get(a.key) - ORDER.get(b.key)) || (a.state ?? '').localeCompare(b.state ?? ''));
  for (const r of sorted) {
    const flag = r.grid < SOFT_ICON || r.blocky < BLOCKY ? '!' : r.grid < 0.98 ? '?' : ' ';
    line('  ' + r.name.padEnd(26)
      + `${r.w}x${r.h}`.padEnd(9)
      + `${r.placed.w}x${r.placed.h}`.padEnd(9)
      + (`${Math.floor(r.grid * 100)}%${flag}`).padStart(7)
      + String(r.softness.soft).padStart(7)
      + String(r.colours).padStart(9)
      + '  ' + (r.state
        ? `${r.state} frame of ${r.key}`
        : r.items.map((i) => i.name).join(', ')));
  }
  line();
  line('  drawing = the ink in the file, after centring.  on-grid 100% means the 16px');
  line('  list icon is an exact halving; "!" means the halving is a per-block vote --');
  line('  read the note under that heading before treating it as a fault.  soft =');
  line('  part-transparent pixels, which should be 0.');
  if (records.some((r) => r.grouped)) {
    line();
    line('  Keys with more than one frame were seated TOGETHER: the union of every');
    line('  frame\'s ink is what was centred, so the object does not move between them.');
    line('  A frame\'s "drawing" size can differ from its icon\'s -- that is the part');
    line('  that moves.');
  }
  line();
}

/* The list the person drawing actually needs. */
line(`EVERY ICON THE GAME ASKS FOR   (${KEYS.length})`);
line('-'.repeat(W));
line(wrap('One file per row, named exactly as the first column. A row marked "drawn" already '
  + 'has one; the rest are generated in code and work perfectly well until you replace them.',
W - 2, '  '));
line();
line('  file                    category      item(s) it draws');
for (const k of KEYS) {
  const state = byKey.has(k.key) ? 'drawn' : '';
  line('  ' + `${k.key}.png`.padEnd(24)
    + [...k.categories].join('/').padEnd(14)
    + k.items.map((i) => i.name).join(', ')
    + (state ? `   [${state}]` : ''));
}
line();
line(`  ${KEYS.length} icon keys for ${items.length} items. The full data is data/items/items.json.`);
line();

/* The other half of the naming, which is the half nobody knows about. */
line(`EXTRA FRAMES AN ICON MAY ALSO HAVE   (${Object.keys(FRAME_STATES).length})`);
line('-'.repeat(W));
line(wrap('A frame is the same object doing something, not a second item. It is named after '
  + 'the icon it belongs to with the state on the end, it never appears in the bag, and it is '
  + 'seated together with its icon so the object does not move between them. Deliver it on '
  + 'the same canvas, in the same place, as the icon.', W - 2, '  '));
line();
for (const [state, def] of Object.entries(FRAME_STATES)) {
  const have = frameRecords.filter((r) => r.state === state).map((r) => r.key);
  line(`  <icon-key>-${state}.png`.padEnd(26) + def.what);
  line(''.padEnd(26) + `used by ${def.used}`);
  line(''.padEnd(26) + (have.length ? `drawn for: ${have.join(', ')}` : 'not drawn for any icon yet'));
  line();
}
const drift = frameStateDrift();
if (drift) {
  line('  WARNING: the frame states in tools/lib/itemseat.js and src/gfx/itemart.ts have');
  line(`  drifted apart -- tools say [${drift.tools.join(', ')}], the game says `
    + `[${drift.game ? drift.game.join(', ') : 'could not be read'}].`);
  line('  A state the tools accept and the game ignores is a file that imports cleanly');
  line('  and never appears on screen. Make the two lists match.');
  line();
}
line('  To look at the whole set rather than read about it -- generated icons and');
line('  drawn ones side by side, at 1x and blown up -- run the capture driver:');
line();
line('    node tools/serve.js');
line('    npx electron tools/capture.cjs tools/shots/items.js');
line();
line('  It writes build/shots/item-icons.png.');
line();

const brokenKeys = ['unusable', 'stray', 'soft', 'canvas', 'names', 'duplicate'];
process.exit(STRICT && groups.some((g) => brokenKeys.includes(g.key)) ? 1 : 0);
