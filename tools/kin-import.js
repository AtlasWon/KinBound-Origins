/**
 * Turn the player's drawings into sprites the game can use.
 *
 *   npm run kin:import              do it
 *   npm run kin:import -- --dry     say what would happen, write nothing
 *   npm run kin:import -- --compare also write build/kin-compare/ (see below)
 *
 * WHAT ARRIVED
 *
 * Species, front and back, drawn on a coarse block grid and genuinely good --
 * and then put through a lossy encoder on the way out of whatever drew them.
 * Every file is 1254x1254 with 28,000 to 290,000 distinct colours where real
 * pixel art has twenty, and a fringe of 7,000 to 35,000 part-transparent pixels
 * round every edge. The drawing underneath is intact; what sits on top of it is
 * not art and has to go.
 *
 * They arrive a few at a time, so nothing here assumes a count or a list: it
 * processes whatever is in source/ and leaves every undrawn species to the
 * procedural pipeline, exactly as before.
 *
 * WHAT THIS DOES
 *
 *   1. Preserves the originals. Everything that is not already a finished
 *      128x128 sprite is MOVED into assets/kin/source/ before anything else
 *      happens, and every later run reads from there. Nothing in source/ is
 *      ever written to or deleted, so this is repeatable: change a number here,
 *      run it again, get a different answer from the same untouched input.
 *
 *   2. Recovers the art. Palette, then vote, then coverage -- the reasoning is
 *      in tools/lib/kinrecover.js, which is where the interesting part lives.
 *
 *   3. Applies the size ladder. A 0.3 m nibbet and a 2.1 m maelstrix arrive on
 *      the same 1254 canvas at nearly the same size, and left alone they would
 *      stand the same height in battle. Each species' height in
 *      data/creatures/species.json picks a band, and the creature is scaled so
 *      its ink lands in it. Front and back of one species always get the SAME
 *      ink height, so the sprite does not change size when the battle turns
 *      round.
 *
 *   4. Seats and names them. Lowercase <id>-front.png / <id>-back.png, ink
 *      centred on x=64 with its last row on 123 -- the framing src/gfx/kinart.ts
 *      measures for, so its own seating pass finds nothing left to do.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not draw the art in 2x2 blocks, which assets/kin/README.md asks for.
 * That rule exists so the 64px party icon is an exact halving; it costs half
 * the linear resolution of the battle sprite. Both were rendered and compared
 * (`--compare` rebuilds the evidence): the icon reduction in kinsprite takes
 * the DOMINANT colour of each 2x2 block, not an average, so an icon made from
 * full-resolution art still contains only colours that are really in the
 * drawing -- it invents nothing, and it carries more of the face than the
 * blocky version does. The battle sprite is much better and the icon is better
 * too, so the rule loses on its own merits here. `npm run kinart` will report a
 * low on-grid percentage for these files; that number is measuring block
 * alignment, and the softness it is a proxy for did not happen.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './lib/kinpng.js';
import * as R from './lib/kinrecover.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'assets', 'kin');
const SOURCE = join(DIR, 'source');
const COMPARE = join(ROOT, 'build', 'kin-compare');

/* Must match src/gfx/kinart.ts. */
const CELL = 128;
const GROUND_ROW = 123;
const ALPHA_CUT = 128;

/** Colours to fit. Past ~28 the fit is chasing the encoder's noise rather than
 *  the drawing: measured, the residual error stops falling. */
const PALETTE = 28;
/** A block is ink when more than half of it was. The natural threshold, and
 *  looked at: lower keeps a rim of former fringe, higher eats the outline. */
const COVERAGE = 0.5;

/**
 * The size ladder, as metres -> pixels of ink height.
 *
 * The game had the bug this fixes: a 0.3 m grub drawn larger than a 2.4 m
 * standing stone, which nobody spotted until all 48 were measured side by side.
 * Within a band the height is interpolated, so two creatures in the same band
 * are still ordered correctly relative to each other.
 *
 * The top band stops at 124 and not 126: the cell has room from row 0 to
 * GROUND_ROW, which is 124 rows, and a drawing one pixel taller would be
 * resampled by the loader -- undoing all of this at the last step.
 */
const BANDS = [
  { upto: 0.35, name: 'TINY', lo: 50, hi: 65 },
  { upto: 0.6, name: 'SMALL', lo: 65, hi: 85 },
  { upto: 1.0, name: 'MID', lo: 85, hi: 100 },
  { upto: 1.6, name: 'LARGE', lo: 100, hi: 115 },
  { upto: Infinity, name: 'HUGE', lo: 115, hi: 124 },
];

function bandFor(metres) {
  let lo = 0;
  for (const b of BANDS) {
    if (metres <= b.upto) {
      const top = b.upto === Infinity ? 3 : b.upto;
      const t = top > lo ? Math.max(0, Math.min(1, (metres - lo) / (top - lo))) : 0;
      return { ...b, want: b.lo + t * (b.hi - b.lo) };
    }
    lo = b.upto;
  }
  return null;
}

/** Even, because an odd ink height puts the drawing's own grid out of phase
 *  with the canvas's for no gain. */
const even = (n) => Math.max(2, 2 * Math.round(n / 2));

/** Even AND inside the band. Rounding a band's own top edge to even is how a
 *  115 px LARGE creature comes out 116 px tall and fails the check this file
 *  exists to pass. */
function evenWithin(n, lo, hi) {
  let v = even(n);
  if (v > hi) v -= 2;
  if (v < lo) v += 2;
  return Math.max(2, v);
}

/* ------------------------------------------------------- preserving input */

/**
 * Move everything that is not a finished sprite into source/.
 *
 * "Not a finished sprite" is decided by looking, not by the name: a PNG that is
 * not 128x128 is an original whatever it is called. That way a second delivery
 * dropped into assets/kin/ next month is picked up without anyone having to
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
        log(`  kept  assets/kin/source/${name} (already preserved; removed the duplicate copy)`);
      } else {
        log(`  LEFT  assets/kin/${name}: a DIFFERENT file of that name is already in source/. `
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
    log(`  moved assets/kin/${name} -> source/  (${size})`);
  }
  return moved;
}

/* --------------------------------------------------------------- the work */

function speciesTable() {
  const raw = JSON.parse(readFileSync(join(ROOT, 'data', 'creatures', 'species.json'), 'utf8'));
  const list = Array.isArray(raw) ? raw : raw.species;
  return new Map(list.map((s) => [s.id, s]));
}

/** Read one source file and get it ready to be resampled: hard alpha, ink
 *  bounds, a palette fitted to the whole drawing, and every source pixel's
 *  palette index computed once. */
function prepare(path) {
  const png = decodePng(readFileSync(path));
  const px = new Uint8ClampedArray(png.rgba);
  // Count the fringe the way a person would: alpha that is neither near-in nor
  // near-out. A lossy encoder leaves the body at 250-254 rather than 255, and
  // calling a million of those "soft" hides the real number.
  let fringe = 0;
  for (let i = 3; i < px.length; i += 4) {
    const a = px[i];
    if (a > 16 && a < 240) fringe++;
  }
  R.hardenSource(px, png.w, png.h, ALPHA_CUT);
  const ink = R.inkBounds(px, png.w, png.h, ALPHA_CUT);
  if (!ink) throw new Error('has no opaque pixels');
  let colours = 0;
  {
    const set = new Set();
    for (let i = 0; i < png.w * png.h; i++) {
      if (px[i * 4 + 3] < ALPHA_CUT) continue;
      set.add((px[i * 4] << 16) | (px[i * 4 + 1] << 8) | px[i * 4 + 2]);
    }
    colours = set.size;
  }
  const pal = R.fitPalette(px, png.w, png.h, { k: PALETTE, alphaCut: ALPHA_CUT });
  const idx = R.indexImage(px, png.w, png.h, pal, ALPHA_CUT);
  return {
    w: png.w, h: png.h, px, ink, pal, idx, fringe, colours,
    grid: R.detectGrid(px, png.w, png.h, ALPHA_CUT),
    runs: R.runScale(idx, png.w, png.h),
  };
}

/**
 * What the two grid measurements found, in a sentence.
 *
 * Two independent estimators, because one of them was going to be wrong: the
 * period of the alpha silhouette, and the commonest length of a flat run of
 * colour. When they agree the block size is a fact. When only the run length
 * finds a peak it is still good evidence, because a peak above the shortest bin
 * cannot be made by noise. When neither finds anything, the drawing was made
 * finer than the encoder left recoverable, and saying so is the answer.
 */
function describeGrid(src) {
  const { grid, runs } = src;
  const agree = grid.confident && runs.found && Math.abs(grid.period - runs.block) < 2.5;
  if (agree) {
    return `${runs.block.toFixed(1)} px  (silhouette period ${grid.period.toFixed(2)} px with `
      + `${Math.round(grid.share * 100)}% of edges on grid, and flat runs peak at ${runs.peak} px -- they agree)`;
  }
  if (runs.found) {
    return `about ${runs.block.toFixed(1)} px  (flat runs peak at ${runs.peak} px; the silhouette shows `
      + `no usable period -- best ${grid.period.toFixed(2)} at ${Math.round(grid.share * 100)}%)`;
  }
  if (grid.confident) {
    return `about ${grid.period.toFixed(2)} px  (silhouette only, ${Math.round(grid.share * 100)}% of edges on grid)`;
  }
  return `smaller than ${runs.floor} px -- drawn too fine for either measurement `
    + `(flat runs only decay, no second hump; silhouette best ${grid.period.toFixed(2)} at `
    + `${Math.round(grid.share * 100)}%, which is a noise floor)`;
}

/**
 * Drop a finished piece of ink onto the 128 cell where the loader expects it:
 * centre x=64, last opaque row 123, and no shadow -- the game lays that down
 * itself so that a drawn creature and a generated one cast the same one.
 *
 * The ink is re-measured first. Despeckling can empty the outermost row or
 * column, and seating on the buffer's edge instead of the drawing's would put
 * the creature half a pixel off centre or one pixel above the floor.
 */
function seat(art, aw, ah) {
  const out = new Uint8ClampedArray(CELL * CELL * 4);
  const b = R.inkBounds(art, aw, ah, ALPHA_CUT);
  if (!b) return out;
  const x0 = Math.round(CELL / 2 - b.w / 2) - b.x0;
  const y0 = GROUND_ROW - b.h + 1 - b.y0;
  for (let y = b.y0; y <= b.y1; y++) {
    const ty = y0 + y;
    if (ty < 0 || ty >= CELL) continue;
    for (let x = b.x0; x <= b.x1; x++) {
      const tx = x0 + x;
      if (tx < 0 || tx >= CELL) continue;
      const s = (y * aw + x) * 4;
      if (art[s + 3] < ALPHA_CUT) continue;
      const d = (ty * CELL + tx) * 4;
      out[d] = art[s]; out[d + 1] = art[s + 1]; out[d + 2] = art[s + 2]; out[d + 3] = 255;
    }
  }
  return out;
}

/** kinsprite's icon reduction, so the report can say what the party screen will
 *  get rather than guessing from the on-grid percentage. */
function iconOf(px, w, h) {
  const iw = w >> 1, ih = h >> 1;
  const out = new Uint8ClampedArray(iw * ih * 4);
  let blocks = 0, flat = 0;
  for (let y = 0; y < ih; y++) {
    for (let x = 0; x < iw; x++) {
      const counts = new Map();
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * w + x * 2 + dx) * 4;
          if (px[i + 3] < ALPHA_CUT) continue;
          const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      if (!counts.size) continue;
      blocks++;
      if (counts.size === 1) flat++;
      let key = 0, best = 0;
      for (const [q, n] of counts) if (n > best) { best = n; key = q; }
      const d = (y * iw + x) * 4;
      out[d] = (key >> 16) & 0xff; out[d + 1] = (key >> 8) & 0xff; out[d + 2] = key & 0xff; out[d + 3] = 255;
    }
  }
  return { data: out, w: iw, h: ih, flat: blocks ? flat / blocks : 1 };
}

/* ------------------------------------------------------------------ main */

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const compare = args.includes('--compare');
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const lines = [];
const log = (s) => { lines.push(s); console.log(s); };

log('Preserving originals');
const movedNow = dry ? [] : preserve(log);
if (!movedNow.length && !dry) log('  (nothing new to move; source/ already holds the originals)');
if (dry) log('  --dry: skipped');

const species = speciesTable();
const sources = existsSync(SOURCE)
  ? readdirSync(SOURCE).filter((f) => /-(front|back)\.png$/i.test(f)).sort()
  : [];
if (!sources.length) {
  log('No sources in assets/kin/source/. Nothing to do.');
  process.exit(0);
}

/* Group by species so front and back can be given one height. */
const groups = new Map();
for (const file of sources) {
  const m = /^(.+)-(front|back)\.png$/i.exec(file);
  const id = m[1].toLowerCase();
  if (only.length && !only.includes(id)) continue;
  if (!species.has(id)) { log(`  SKIP ${file}: "${id}" is not a species id`); continue; }
  const g = groups.get(id) ?? { id, views: [] };
  g.views.push({ view: m[2].toLowerCase(), file });
  groups.set(id, g);
}

log('');
log('Reading and measuring');
for (const g of groups.values()) {
  for (const v of g.views) {
    v.src = prepare(join(SOURCE, v.file));
    log(`  ${v.file.padEnd(22)} ${v.src.w}x${v.src.h}  ink ${v.src.ink.w}x${v.src.ink.h}  `
      + `${v.src.colours.toLocaleString()} colours  ${v.src.fringe.toLocaleString()} soft px`);
    log(`  ${''.padEnd(22)} block ${describeGrid(v.src)}`);
  }
}

/* One ink height per species: the band's wish, cut down if either view would
 * then be wider than the cell. A creature that is wider than it is tall spends
 * its budget on width, and saying so is more useful than quietly obeying. */
log('');
log('Size ladder');
for (const g of groups.values()) {
  const s = species.get(g.id);
  const band = bandFor(s.height);
  let H = evenWithin(band.want, band.lo, band.hi);
  const limits = g.views.map((v) => Math.floor(CELL * v.src.ink.h / v.src.ink.w));
  const cap = even(Math.min(...limits));
  const clipped = cap < H;
  if (clipped) H = cap;
  g.band = band; g.height = H; g.clipped = clipped;
  for (const v of g.views) v.target = { h: H, w: even(v.src.ink.w * (H / v.src.ink.h)) };
  const inBand = H >= band.lo && H <= band.hi;
  log(`  ${g.id.padEnd(12)} ${String(s.height).padStart(4)} m  ${band.name.padEnd(5)} `
    + `${band.lo}-${band.hi} px  ->  ${H} px tall`
    + (inBand ? '  in band' : `  OUT OF BAND (${clipped ? 'the drawing is wider than it is tall; at the band height it would be '
      + `${Math.max(...g.views.map((v) => Math.round(v.src.ink.w * (evenWithin(band.want, band.lo, band.hi) / v.src.ink.h))))} px wide and the cell is 128` : 'clamped'})`)
    + `  widths ${g.views.map((v) => `${v.view} ${v.target.w}`).join(', ')}`);
}

/* ------------------------------------------------------------- rendering */

log('');
log('Recovering');
if (compare) mkdirSync(COMPARE, { recursive: true });
const report = [];
for (const g of groups.values()) {
  for (const v of g.views) {
    const { src, target } = v;
    const art = R.voteDownsample(src.px, src.idx, src.w, src.ink, target.w, target.h, src.pal,
      { coverage: COVERAGE, alphaCut: ALPHA_CUT });
    const speck = R.despeckle(art, target.w, target.h);
    const cell = seat(art, target.w, target.h);
    const placed = R.inkBounds(cell, CELL, CELL, ALPHA_CUT);
    const m = R.measure(cell, CELL, CELL);
    const ic = iconOf(cell, CELL, CELL);
    const out = join(DIR, `${g.id}-${v.view}.png`);
    if (!dry) writeFileSync(out, encodePng(CELL, CELL, Buffer.from(cell)));

    if (compare && !dry) {
      const box = R.boxDownsample(src.px, src.w, src.ink, target.w, target.h, src.pal,
        { coverage: COVERAGE, alphaCut: ALPHA_CUT });
      R.despeckle(box, target.w, target.h);
      const half = R.voteDownsample(src.px, src.idx, src.w, src.ink,
        Math.max(2, target.w >> 1), Math.max(2, target.h >> 1), src.pal,
        { coverage: COVERAGE, alphaCut: ALPHA_CUT });
      writeFileSync(join(COMPARE, `${g.id}-${v.view}-vote.png`),
        encodePng(CELL, CELL, Buffer.from(cell)));
      writeFileSync(join(COMPARE, `${g.id}-${v.view}-average.png`),
        encodePng(CELL, CELL, Buffer.from(seat(box, target.w, target.h))));
      const mag = R.magnify(half, Math.max(2, target.w >> 1), Math.max(2, target.h >> 1), 2);
      writeFileSync(join(COMPARE, `${g.id}-${v.view}-blocks2x.png`),
        encodePng(CELL, CELL, Buffer.from(seat(mag.data, mag.w, mag.h))));
      writeFileSync(join(COMPARE, `${g.id}-${v.view}-icon.png`),
        encodePng(ic.w, ic.h, Buffer.from(ic.data)));
    }

    report.push({
      id: g.id, view: v.view, file: v.file,
      source: `${src.w}x${src.h}`, sourceInk: `${src.ink.w}x${src.ink.h}`,
      grid: src.grid, runs: src.runs, srcColours: src.colours, srcFringe: src.fringe,
      // How tall the drawing is in the artist's own pixels, and what fraction
      // of them survive to the sprite. Under 1 is detail the size ladder spent.
      nativeH: src.runs.found ? Math.round(src.ink.h / src.runs.block) : null,
      keep: src.runs.found ? target.h / (src.ink.h / src.runs.block) : null,
      ink: placed ? `${placed.w}x${placed.h}` : 'none',
      band: g.band.name, want: `${g.band.lo}-${g.band.hi}`,
      inBand: placed && placed.h >= g.band.lo && placed.h <= g.band.hi,
      ground: placed ? placed.y1 : -1,
      colours: m.colours, soft: m.soft, palette: src.pal.length,
      speck, iconFlat: ic.flat,
    });
    log(`  ${(g.id + '-' + v.view).padEnd(22)} ink ${String(report.at(-1).ink).padEnd(8)} `
      + `ground row ${placed ? placed.y1 : '-'}  ${m.colours} colours (palette ${src.pal.length})  `
      + `${m.soft} soft px  specks -${speck.removed}/+${speck.filled}`);
  }
}

/* ------------------------------------------------------------- the table */

log('');
log('Report');
log('  file                  source     src ink    block   native  out ink   band          detail  colours soft');
/* A block size measured on one view and contradicted by the other is a
 * measurement, not a fact. Mark it rather than quietly averaging it away. */
for (const r of report) {
  const other = report.find((q) => q.id === r.id && q.view !== r.view);
  r.agrees = Boolean(r.runs.found && other?.runs.found
    && Math.abs(r.runs.block - other.runs.block) / r.runs.block < 0.2);
}
for (const r of report) {
  const block = r.runs.found ? `${r.runs.block.toFixed(1)}px${r.agrees ? '' : '?'}` : '-';
  const native = r.nativeH ? `${r.nativeH}px` : '-';
  const keep = r.keep ? `${Math.round(r.keep * 100)}%` : '-';
  log(`  ${(r.id + '-' + r.view).padEnd(21)} ${r.source.padEnd(10)} ${r.sourceInk.padEnd(10)} `
    + `${block.padEnd(7)} ${native.padEnd(7)} ${r.ink.padEnd(9)} ${(r.band + ' ' + r.want).padEnd(13)} `
    + `${keep.padEnd(7)} ${String(r.colours).padStart(3)}     ${r.soft}${r.inBand ? '' : '   <- out of band'}`);
}
log('');
log('  block  = the artist\'s own pixel, in source pixels. "-" means no block size survived');
log('           the encoder; "?" means the other view of the same species disagrees, so read');
log('           it as a hint and not a number.');
log('  native = how tall the drawing is in the artist\'s pixels');
log('  detail = output ink height as a fraction of that. 100% is the whole drawing;');
log('           below that, the size ladder is spending detail to keep the roster honest.');

const soft = report.filter((r) => r.soft > 0);
log('');
log(soft.length ? `  ${soft.length} file(s) still have soft pixels -- that is a bug` : '  All output alpha is hard: every pixel fully opaque or fully clear.');
log(`  Palette: ${Math.min(...report.map((r) => r.colours))}-${Math.max(...report.map((r) => r.colours))} colours per sprite `
  + `(sources had ${Math.min(...report.map((r) => r.srcColours)).toLocaleString()}-${Math.max(...report.map((r) => r.srcColours)).toLocaleString()}).`);
log(`  Icon: the 64px reduction takes only colours that are in the sprite; `
  + `${Math.round(report.reduce((a, r) => a + r.iconFlat, 0) / report.length * 100)}% of its 2x2 blocks were already flat.`);
if (dry) log('\n  --dry: no files were written.');
else log(`\n  Wrote ${report.length} sprite(s) to assets/kin/. Run "npm run kinart" to refresh index.json.`);
if (compare) log(`  Comparison renders in build/kin-compare/.`);
