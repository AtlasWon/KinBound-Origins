/**
 * Turn the player's item drawings into the icons the game can use.
 *
 *   npm run item:import                 do it
 *   npm run item:import -- --dry        say what would happen, write nothing
 *   npm run item:import -- --compare    also write build/item-compare/ (see below)
 *   npm run item:import -- --blocks     build it in 2x2 blocks instead (see below)
 *   npm run item:import -- --only=potion,vessel_field
 *
 * WHAT ARRIVES
 *
 * The same thing that arrived for the creatures: 1254x1254 PNGs with ninety to
 * a hundred and ten THOUSAND distinct colours where an item icon has a dozen,
 * and five to eight thousand part-transparent pixels round every edge. The
 * drawing underneath is on a coarse block grid and is good; what sits on top of
 * it is a lossy encoder's leavings and has to go.
 *
 * `tools/kin-import.js` solved this and the interesting half of it is unchanged
 * here, in `tools/lib/kinrecover.js`: fit a palette at FULL resolution, because
 * the encoder's noise is scattered symmetrically around each true colour and a
 * mean is exactly the estimator that ignores that; then take a per-output-block
 * plurality VOTE rather than an average, so a block inside a flat area returns
 * that flat colour and a block on an edge picks a side instead of inventing a
 * blend.
 *
 * THE THREE THINGS THAT ARE NOT THE CREATURE PIPELINE
 *
 * 1. THE 2x2 BLOCK RULE LOSES HERE TOO -- and it was much less obvious than it
 *    was for creatures, so it was rendered and looked at rather than assumed.
 *
 *    `docs/ITEM-SPEC.md` asks a person drawing an icon to work in 2x2 blocks,
 *    because the 16px list icon is this file halved and only block art halves
 *    exactly. That is right advice for someone drawing at 32x32. It is the
 *    wrong thing to do to a 1254px original, and the reason is the same one
 *    kin-import found: the halving takes the DOMINANT colour of each 2x2 block,
 *    not an average, so a 16px icon reduced from full-resolution art still
 *    contains only colours that are really in the drawing -- it invents nothing.
 *
 *    `--compare` builds both and the difference is not close. In 2x2 blocks the
 *    vessel loses its silver frame and reads as a dark lump with a white bar on
 *    it; the potion stops being round. At full resolution both keep their
 *    outline, and their 16px icons are BETTER as well, not worse, because half
 *    of a legible drawing beats all of an illegible one. So the block build is
 *    kept as `--blocks` and the evidence is kept in build/item-compare/.
 *
 *    `npm run item:check` will report a low on-grid percentage on these files.
 *    That number measures block alignment, which is a proxy for softness; the
 *    softness it stands in for did not happen, and the "halving" column in the
 *    report below is the direct measurement.
 *
 * 2. THE NAME IS AN ICON KEY, AND WHAT ARRIVES IS A WORD. `Potion.png` is
 *    `potion`; `Vessel-closed.png` is the basic vessel, which is `vessel_field`
 *    and could not possibly be guessed from the file name alone. Every mapping
 *    this tool makes is printed with its reason, and anything it cannot resolve
 *    is left in source/ and named rather than quietly skipped.
 *
 * 3. SOME FILES ARE FRAMES, NOT ICONS. `Vessel-open.png` is not an item -- no
 *    player holds an open vessel -- it is a state of one, drawn for the throw
 *    animation. It lands as `vessel_field-open.png` and the game reaches it
 *    through `itemArt(key, state)`. The frames of a key are seated TOGETHER:
 *    the base does not move when the lid comes off, which it would if each
 *    frame were centred on its own ink. See `docs/ITEM-SPEC.md`.
 *
 * Nothing here assumes a count or a list. It processes whatever is in source/,
 * and every item with no drawing keeps its generated icon exactly as before.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './lib/kinpng.js';
import * as R from './lib/kinrecover.js';
import {
  iconKeys, nameResolver, splitFrameName, frameFile, FRAME_STATES,
  CELL, ICON_SIZE, ALPHA_CUT, seatGroup, icon as iconOf,
} from './lib/itemseat.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'items');
const SOURCE = join(DIR, 'source');
const COMPARE = join(ROOT, 'build', 'item-compare');

/** Colours to fit, over a whole key at once. Lower than the creatures' 28: an
 *  icon is a few hundred opaque pixels and a palette wider than the picture
 *  only gives the vote more ways to disagree with itself. */
const PALETTE = 20;
/** A block is ink when more than half of it was. Same threshold, same reason. */
const COVERAGE = 0.5;

/* --------------------------------------------------------- the item table */

const items = JSON.parse(readFileSync(join(ROOT, 'data', 'items', 'items.json'), 'utf8'));
const KEYS = iconKeys(items);
const KNOWN = new Set(KEYS.map((k) => k.key));
const KEY_TO_ITEMS = new Map(KEYS.map((k) => [k.key, k.items.map((i) => i.name)]));
/* Naming lives in tools/lib/itemseat.js so that the checker resolves a
 * delivered file exactly the way the importer does -- one road, one answer. */
const resolveName = nameResolver(items);

/** The sentence the report prints for one mapping. */
function because(r, file) {
  const to = frameFile(r.key, r.state);
  switch (r.why) {
    case 'exact': return `${file} -> ${to}`;
    case 'item-id': return `${file} -> ${to}   ("${r.body ?? ''}" was the item id; the file is named after the icon key)`;
    case 'family': return `${file} -> ${to}   (the ${r.members.length} ${r.members[0].split('_')[0]} icons are `
      + `${r.members.join(', ')}; a bare family name lands on the basic one)`;
    case 'alias': return `${file} -> ${to}   (a known other word for it)`;
    case 'typo': return `${file} -> ${to}   (nearest icon key -- check this one)`;
    default: return `${file} -> ${to}`;
  }
}

/* ------------------------------------------------------- preserving input */

/**
 * Move everything that is not a finished icon into source/.
 *
 * "Not a finished icon" is decided by looking, not by the name: a PNG that is
 * not 32x32 is an original whatever it is called. That way the next delivery,
 * dropped into assets/items/ next month, is picked up without anyone having to
 * remember a convention.
 */
function preserve(log) {
  mkdirSync(SOURCE, { recursive: true });
  const moved = [];
  for (const name of readdirSync(DIR)) {
    if (!/\.png$/i.test(name)) continue;
    const from = join(DIR, name);
    if (!statSync(from).isFile()) continue;
    let size;
    try {
      const png = decodePng(readFileSync(from));
      size = `${png.w}x${png.h}`;
      if (png.w === CELL && png.h === CELL && name === name.toLowerCase()) continue;
    } catch {
      size = 'unreadable';
    }
    const to = join(SOURCE, name);
    if (existsSync(to)) {
      // The original is already preserved. Only ever remove the copy, never the
      // preserved one, and only when they are byte-identical.
      if (Buffer.compare(readFileSync(from), readFileSync(to)) === 0) {
        unlinkSync(from);
        log(`  kept  assets/items/source/${name} (already preserved; removed the duplicate copy)`);
      } else {
        log(`  LEFT  assets/items/${name}: a DIFFERENT file of that name is already in source/. `
          + 'Nothing was overwritten. Rename one of them and run again.');
      }
      continue;
    }
    // Copy, verify the copy byte for byte, and only then remove the original.
    // A rename would be atomic and would also be one syscall between the
    // player's only copy of their art and nothing at all.
    const bytes = readFileSync(from);
    writeFileSync(to, bytes);
    if (Buffer.compare(readFileSync(to), bytes) !== 0) {
      throw new Error(`copying ${name} into source/ did not round-trip; the original is untouched`);
    }
    unlinkSync(from);
    moved.push(name);
    log(`  moved assets/items/${name} -> source/  (${size})`);
  }
  return moved;
}

/* ---------------------------------------------------------------- reading */

/** Decode one source file and harden it. The palette is fitted per KEY, not per
 *  file, so that step waits until the whole group is in hand -- two frames with
 *  two palettes would change colour as the vessel opened. */
function prepare(path) {
  const png = decodePng(readFileSync(path));
  const px = new Uint8ClampedArray(png.rgba);
  let fringe = 0;
  for (let i = 3; i < px.length; i += 4) {
    const a = px[i];
    if (a > 16 && a < 240) fringe++;
  }
  R.hardenSource(px, png.w, png.h, ALPHA_CUT);
  const ink = R.inkBounds(px, png.w, png.h, ALPHA_CUT);
  if (!ink) throw new Error('has no opaque pixels');
  const set = new Set();
  for (let i = 0; i < png.w * png.h; i++) {
    if (px[i * 4 + 3] < ALPHA_CUT) continue;
    set.add((px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2]);
  }
  return { w: png.w, h: png.h, px, ink, fringe, colours: set.size };
}

/** One palette for a whole key: the frames stacked into one image and fitted
 *  once. Two frames fitted separately come back with two nearly-equal greys and
 *  the vessel changes colour the moment it opens. */
function groupPalette(srcs, k) {
  const w = Math.max(...srcs.map((s) => s.w));
  const h = srcs.reduce((a, s) => a + s.h, 0);
  const buf = new Uint8ClampedArray(w * h * 4);
  let y0 = 0;
  for (const s of srcs) {
    for (let y = 0; y < s.h; y++) {
      buf.set(s.px.subarray(y * s.w * 4, (y * s.w + s.w) * 4), ((y0 + y) * w) * 4);
    }
    y0 += s.h;
  }
  return R.fitPalette(buf, w, h, { k, alphaCut: ALPHA_CUT });
}

/* --------------------------------------------------------------- geometry */

/**
 * Where each frame's ink goes, in a cell of `cell` pixels.
 *
 * All the frames of a key are placed by ONE scale and ONE origin. The origin is
 * the base frame's, and a frame is registered against it by the anchor its
 * state declares:
 *
 *   bottom  the drawings share a bottom edge, so the object rests where it
 *           rested and only the moving part moves. This is what an opening lid
 *           is: the base of the vessel does not go anywhere.
 *   centre  the drawings share a centre. The default, and what a single frame
 *           trivially gets.
 *
 * Anything else -- centring each frame on its own ink, or lining the raw
 * canvases up -- moves the object between frames, and two pixels of jump on a
 * thirty-two pixel icon is the whole animation ruined.
 */
function layout(frames, cell) {
  // ONE anchor for the whole key, not one per frame. A state declares how it
  // registers, and the icon it belongs to has to be measured the same way or
  // the two are lined up by different features of the drawing -- base-centre
  // against lid-bottom -- which is not a registration at all.
  const bottom = frames.some((f) => f.state && FRAME_STATES[f.state].align === 'bottom');
  const anchor = (f) => {
    const b = f.src.ink;
    return { x: (b.x0 + b.x1 + 1) / 2, y: bottom ? b.y1 + 1 : (b.y0 + b.y1 + 1) / 2 };
  };
  // Every frame in one coordinate system, measured from its own anchor.
  const rel = frames.map((f) => {
    const a = anchor(f);
    const b = f.src.ink;
    return { f, l: b.x0 - a.x, r: b.x1 + 1 - a.x, t: b.y0 - a.y, b: b.y1 + 1 - a.y };
  });
  const L = Math.min(...rel.map((q) => q.l));
  const Rr = Math.max(...rel.map((q) => q.r));
  const T = Math.min(...rel.map((q) => q.t));
  const B = Math.max(...rel.map((q) => q.b));
  const scale = Math.min(cell / (Rr - L), cell / (B - T));

  const unionW = Math.min(cell, Math.max(1, Math.round((Rr - L) * scale)));
  const unionH = Math.min(cell, Math.max(1, Math.round((B - T) * scale)));
  const offX = Math.round((cell - unionW) / 2);
  const offY = Math.round((cell - unionH) / 2);

  return {
    scale, unionW, unionH,
    places: rel.map((q) => {
      const w = Math.min(cell, Math.max(1, Math.round((q.r - q.l) * scale)));
      const h = Math.min(cell, Math.max(1, Math.round((q.b - q.t) * scale)));
      return {
        frame: q.f, w, h,
        x: Math.max(0, Math.min(cell - w, offX + Math.round((q.l - L) * scale))),
        y: Math.max(0, Math.min(cell - h, offY + Math.round((q.t - T) * scale))),
      };
    }),
  };
}

/** Recover one key into `cell`-sized canvases, one per frame. */
function render(frames, pal, cell, vote = true) {
  const lay = layout(frames, cell);
  const out = [];
  for (const p of lay.places) {
    const { src } = p.frame;
    const art = vote
      ? R.voteDownsample(src.px, src.idx, src.w, src.ink, p.w, p.h, pal,
        { coverage: COVERAGE, alphaCut: ALPHA_CUT })
      : R.boxDownsample(src.px, src.w, src.ink, p.w, p.h, pal,
        { coverage: COVERAGE, alphaCut: ALPHA_CUT });
    const speck = R.despeckle(art, p.w, p.h);
    const cv = new Uint8ClampedArray(cell * cell * 4);
    for (let y = 0; y < p.h; y++) {
      for (let x = 0; x < p.w; x++) {
        const s = (y * p.w + x) * 4;
        if (art[s + 3] < ALPHA_CUT) continue;
        const d = ((p.y + y) * cell + p.x + x) * 4;
        cv[d] = art[s]; cv[d + 1] = art[s + 1]; cv[d + 2] = art[s + 2]; cv[d + 3] = 255;
      }
    }
    out.push({ frame: p.frame, data: cv, w: cell, h: cell, speck, place: p });
  }
  return { layout: lay, frames: out };
}

/** 16x16 art blown up to the 32x32 cell. Every block is 2x2 by construction, so
 *  the list icon the bag shows is an exact halving of this and contains only
 *  colours that are really in the drawing. */
function blocks(frames, pal) {
  const half = render(frames, pal, ICON_SIZE);
  return {
    layout: half.layout,
    frames: half.frames.map((f) => {
      const m = R.magnify(f.data, ICON_SIZE, ICON_SIZE, 2);
      return { ...f, data: m.data, w: CELL, h: CELL };
    }),
  };
}

/* ------------------------------------------------------------------ main */

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const compare = args.includes('--compare');
/* Full resolution is the default and `--blocks` is the alternative, which is
 * the opposite way round from what docs/ITEM-SPEC.md asks a person for. See the
 * note at the top: both were built and looked at, and the block build lost. */
const full = !args.includes('--blocks');
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const paletteSize = Number((args.find((a) => a.startsWith('--palette=')) ?? '').slice(10)) || PALETTE;
const log = (s) => console.log(s);

log('Preserving originals');
if (dry) log('  --dry: skipped');
else {
  const moved = preserve(log);
  if (!moved.length) log('  (nothing new to move; source/ already holds the originals)');
}

/* Where each original is read from. Normally source/, because preserve() has
 * just put everything there. Under --dry nothing has been moved, so a file
 * still sitting in assets/items/ has to be read where it lies -- otherwise
 * --dry would report "nothing to do" about the very delivery it was run on. */
const where = new Map();
if (existsSync(SOURCE)) {
  for (const f of readdirSync(SOURCE)) if (/\.png$/i.test(f)) where.set(f, SOURCE);
}
if (dry) {
  for (const f of readdirSync(DIR)) {
    if (!/\.png$/i.test(f) || where.has(f)) continue;
    try {
      const png = decodePng(readFileSync(join(DIR, f)));
      if (png.w === CELL && png.h === CELL && f === f.toLowerCase()) continue;
    } catch { /* unreadable here counts as an original; preserve() would move it */ }
    where.set(f, DIR);
  }
}
const sources = [...where.keys()].sort();
if (!sources.length) {
  log('');
  log('No sources in assets/items/source/. Nothing to do.');
  log('Drop the drawings in assets/items/ at whatever size they came out of the');
  log('art tool and run this again -- it will preserve them and fit them itself.');
  process.exit(0);
}

/* ------------------------------------------------------------ the mapping */

log('');
log('Naming');
const groups = new Map();
const unresolved = [];
for (const file of sources) {
  const stem = file.replace(/\.png$/i, '');
  // A file already named the way the game wants it needs no guessing at all.
  const direct = splitFrameName(stem.toLowerCase());
  const r = KNOWN.has(direct.key)
    ? { ok: true, key: direct.key, state: direct.state, why: 'exact', notes: [] }
    : resolveName(stem);
  if (!r.ok) {
    unresolved.push({ file, body: r.body, state: r.state });
    continue;
  }
  if (only.length && !only.includes(r.key)) continue;
  log('  ' + because({ ...r, body: stem.toLowerCase() }, file));
  for (const n of r.notes) log(`        ${n}`);
  const g = groups.get(r.key) ?? { key: r.key, frames: [] };
  const clash = g.frames.find((f) => f.state === r.state);
  if (clash) {
    log(`        BOTH ${clash.file} and ${file} resolve to ${frameFile(r.key, r.state)}. `
      + `Keeping ${clash.file}; rename the other or pass --only=`);
    continue;
  }
  g.frames.push({ state: r.state, file });
  groups.set(r.key, g);
}

if (unresolved.length) {
  log('');
  log('  These were NOT imported -- nothing in the game is called any of them:');
  for (const u of unresolved) {
    log(`    ${u.file}: "${u.body}" is not an icon key, an item id or a family name`);
  }
  log('    Run "npm run item:list" for the keys. The originals are untouched in source/.');
}
if (!groups.size) {
  log('');
  log('Nothing resolved to an icon key. Nothing written.');
  process.exit(0);
}

/* --------------------------------------------------------------- the work */

log('');
log('Reading and measuring');
for (const g of groups.values()) {
  // Base first: it is the frame everything else is registered against.
  g.frames.sort((a, b) => Number(a.state !== null) - Number(b.state !== null));
  for (const f of g.frames) {
    f.src = prepare(join(where.get(f.file), f.file));
    log(`  ${f.file.padEnd(22)} ${f.src.w}x${f.src.h}  ink ${f.src.ink.w}x${f.src.ink.h}  `
      + `${f.src.colours.toLocaleString()} colours  ${f.src.fringe.toLocaleString()} soft px`
      + (f.state ? `  [${f.state} frame]` : ''));
  }
  if (!g.frames.some((f) => f.state === null)) {
    log(`  NOTE ${g.key}: only frames arrived, no plain icon. The bag will keep the generated `
      + `one until ${frameFile(g.key)} is drawn.`);
  }
  g.pal = groupPalette(g.frames.map((f) => f.src), paletteSize);
  for (const f of g.frames) {
    f.src.idx = R.indexImage(f.src.px, f.src.w, f.src.h, g.pal, ALPHA_CUT);
  }
  const runs = R.runScale(g.frames[0].src.idx, g.frames[0].src.w, g.frames[0].src.h);
  g.native = runs.found ? Math.round(g.frames[0].src.ink.h / runs.block) : null;
  log(`  ${''.padEnd(22)} palette ${g.pal.length} colours, fitted over `
    + `${g.frames.length} frame(s) together`
    + (g.native ? `; the drawing is about ${g.native} of the artist's own pixels tall` : ''));
}

/* ------------------------------------------------------------- rendering */

log('');
log('Recovering');
if (compare && !dry) mkdirSync(COMPARE, { recursive: true });
const report = [];
for (const g of groups.values()) {
  const built = full ? render(g.frames, g.pal, CELL) : blocks(g.frames, g.pal);

  // Measure what the game will do to these files, with the game's own code.
  const seated = seatGroup(built.frames.map((f) => ({
    state: f.frame.state, px: { w: f.w, h: f.h, data: Uint8ClampedArray.from(f.data) },
  })));

  built.frames.forEach((f, i) => {
    const name = frameFile(g.key, f.frame.state);
    if (!dry) writeFileSync(join(DIR, name), encodePng(f.w, f.h, Buffer.from(f.data)));
    const s = seated[i];
    const ic = iconOf(s);
    const m = R.measure(f.data, f.w, f.h);
    report.push({
      key: g.key, state: f.frame.state, file: name, from: f.frame.file,
      source: `${f.frame.src.w}x${f.frame.src.h}`,
      srcInk: `${f.frame.src.ink.w}x${f.frame.src.ink.h}`,
      srcColours: f.frame.src.colours, srcFringe: f.frame.src.fringe,
      ink: `${s.placed.w}x${s.placed.h}`,
      at: `${s.placed.x0},${s.placed.y0}`,
      moved: s.shift.x || s.shift.y ? `${s.shift.x},${s.shift.y}` : '-',
      colours: m.colours, soft: m.soft, palette: g.pal.length,
      grid: s.gridScore, exact: ic.exact, speck: f.speck,
    });
    log(`  ${name.padEnd(24)} ink ${report.at(-1).ink.padEnd(7)} at ${report.at(-1).at.padEnd(6)} `
      + `${m.colours} colours  ${m.soft} soft px  on-grid ${Math.round(s.gridScore * 100)}%  `
      + `specks -${f.speck.removed}/+${f.speck.filled}`);
  });

  if (compare && !dry) {
    const alt = full ? blocks(g.frames, g.pal) : render(g.frames, g.pal, CELL);
    const avg = render(g.frames, g.pal, full ? CELL : ICON_SIZE, false);
    built.frames.forEach((f, i) => {
      const stem = frameFile(g.key, f.frame.state).replace(/\.png$/, '');
      writeFileSync(join(COMPARE, `${stem}-chosen.png`), encodePng(f.w, f.h, Buffer.from(f.data)));
      const a = alt.frames[i];
      writeFileSync(join(COMPARE, `${stem}-${full ? 'blocks' : 'full'}.png`),
        encodePng(a.w, a.h, Buffer.from(a.data)));
      const b = avg.frames[i];
      const mag = full ? b : R.magnify(b.data, ICON_SIZE, ICON_SIZE, 2);
      writeFileSync(join(COMPARE, `${stem}-average.png`),
        encodePng(mag.w ?? b.w, mag.h ?? b.h, Buffer.from(mag.data ?? b.data)));
      const ic = iconOf(seatGroup([{ state: null, px: { w: f.w, h: f.h, data: Uint8ClampedArray.from(f.data) } }])[0]);
      writeFileSync(join(COMPARE, `${stem}-icon16.png`),
        encodePng(ic.w, ic.h, Buffer.from(ic.data)));
    });
  }
}

/* ------------------------------------------------------------- the table */

log('');
log('Report');
log('  file                      source      src ink     out ink   on-grid  halving  colours  soft');
for (const r of report) {
  log(`  ${r.file.padEnd(25)} ${r.source.padEnd(11)} ${r.srcInk.padEnd(11)} ${r.ink.padEnd(9)} `
    + `${(Math.round(r.grid * 100) + '%').padStart(6)}   ${(r.exact ? 'exact' : 'soft ').padEnd(8)} `
    + `${String(r.colours).padStart(6)}  ${r.soft}`);
}
log('');
log('  on-grid = the fraction of 2x2 blocks that are one flat colour. "halving" is what');
log('            that means for the 16px bag row: exact, or a majority vote per block.');

const bad = report.filter((r) => r.soft > 0);
log('');
log(bad.length
  ? `  ${bad.length} file(s) still have soft pixels -- that is a bug`
  : '  All output alpha is hard: every pixel fully opaque or fully clear.');
log(`  Palette: ${Math.min(...report.map((r) => r.colours))}-${Math.max(...report.map((r) => r.colours))} `
  + `colours per icon (sources had ${Math.min(...report.map((r) => r.srcColours)).toLocaleString()}-`
  + `${Math.max(...report.map((r) => r.srcColours)).toLocaleString()}).`);

const frames = report.filter((r) => r.state);
if (frames.length) {
  log('');
  log('  Frames, not icons:');
  for (const f of frames) {
    log(`    ${f.file}  --  ${FRAME_STATES[f.state].what}`);
    log(`      asked for as itemArt('${f.key}', '${f.state}'); used by ${FRAME_STATES[f.state].used}`);
  }
  log('    These are seated with their icon, not on their own, so the object does not');
  log('    move between them. They never appear in the bag and are not items.');
}

const drew = new Set(report.map((r) => r.key));
log('');
log(`  ${drew.size} icon key(s) now drawn by hand, ${KEYS.length - drew.size} still generated:`);
for (const k of drew) log(`    ${k}  ->  ${(KEY_TO_ITEMS.get(k) ?? []).join(', ')}`);

if (dry) log('\n  --dry: no files were written.');
else {
  log(`\n  Wrote ${report.length} file(s) to assets/items/.`);
  log('  Look at them:  node tools/serve.js');
  log('                 npx electron tools/capture.cjs tools/shots/items.js');
  log('  Check them:    npm run item:check');
}
if (compare && !dry) {
  log(`  Comparison renders in build/item-compare/ -- "-chosen" is what was written, `);
  log(`  "-${full ? 'blocks' : 'full'}" is the other resolution, "-average" is the same`);
  log('  reduction with a mean instead of a vote, "-icon16" is the bag row.');
}
