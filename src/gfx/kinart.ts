/**
 * Hand-drawn creature art.
 *
 * Every sprite in this game is generated in code, and for a long time that was
 * a hard rule with no exceptions. It is no longer: a species may now ship a
 * pair of hand-drawn PNGs, and where it does they are used instead of the
 * procedural build. The two routes coexist permanently -- art arrives one
 * creature at a time, so at any moment most of the roster is still generated
 * and the game has to be playable anyway.
 *
 * WHERE THE FILES LIVE
 *
 *   assets/kin/<species-id>-front.png     the creature as an opponent, facing LEFT
 *   assets/kin/<species-id>-back.png      seen from behind, facing away to the RIGHT
 *
 * 128x128, hard alpha, one file per view. A species with only a front keeps the
 * generated back until its partner arrives; nothing has to be delivered in
 * pairs and nothing has to be delivered at once.
 *
 * THE ASYNC PROBLEM
 *
 * `frontSprite` and friends are called from inside a render tick and must stay
 * synchronous -- returning a promise, or a canvas that fills in later, is how
 * you get a frame that draws nothing and a bug that only shows up on a cold
 * cache. So every image that exists is decoded ONCE during boot, in
 * `loadKinArt`, alongside the JSON warm-up in `registry.loadCore`, and by the
 * time the title screen draws its first frame the art is already flat pixels in
 * a canvas. After that the accessors are pure lookups. Nothing here is ever
 * awaited from a render path.
 *
 * WHAT THE LOADER DOES TO AN IMAGE
 *
 * It does not blit the file. It finds the creature's real ink bounding box and
 * seats that on the same ground line and the same centre line the generator
 * uses (measured: the last opaque row of every procedural sprite is row 123,
 * and the ink centres on x=64). Ninety-six hand-made drawings will not be
 * framed identically, and without this a roster half of them floats and half of
 * them sinks. It also flattens the alpha to hard on/off, drops the drawing onto
 * an even pixel grid where the art has one -- which is what keeps the 64px icon
 * from turning to mud -- and lays a contact shadow underneath so an image
 * creature and a generated one stand on the same floor side by side.
 *
 * Anything wrong with a file is a note in `kinArtReport()` and a console line,
 * never an exception: a bad PNG falls back to the generated design.
 */

import { DESIGN } from './kin/mask.js';

/** The folder the player drops PNGs into, relative to index.html. */
export const KIN_ART_DIR = 'assets/kin';
/** Generated listing of what is actually in that folder. See tools/kinart.js. */
export const KIN_ART_INDEX = `${KIN_ART_DIR}/index.json`;

export const KIN_ART_SIZE = DESIGN;

/**
 * The floor.
 *
 * Both numbers are measurements, not choices: every one of the 48 procedural
 * sprites, front and back, ends its last opaque row at 123 and centres its ink
 * on x=64. Seating a drawing anywhere else makes it stand at a different height
 * from its neighbours in the same battle. `tools/shots/seat.js` re-measures
 * these if the generator's framing ever moves.
 */
const GROUND_ROW = 123;
const CENTRE_X = DESIGN / 2;

/** An edge is in or out. Anything between is an export mistake, so it is one of
 *  the two -- a halo of half-alpha fringe is worse than a slightly blocky edge,
 *  and it would flash grey through `whiteSprite`. */
const ALPHA_CUT = 128;

/** Refuse to decode something absurd rather than allocate it. */
const MAX_SOURCE = 2048;
/** A load that never settles must not hold the boot open forever. */
const LOAD_TIMEOUT_MS = 8000;

export type KinArtLevel = 'error' | 'warn' | 'info';

export interface KinArtNote {
  species: string;
  file: string;
  level: KinArtLevel;
  message: string;
}

export interface KinArtEntry {
  species: string;
  view: 'front' | 'back';
  file: string;
  /** Size of the file as delivered. */
  sourceW: number;
  sourceH: number;
  /** Where the ink ended up, after seating. */
  ink: { x0: number; y0: number; x1: number; y1: number };
  /** 1 unless the drawing was too big for the cell and had to be reduced. */
  scale: number;
  /** Fraction of 2x2 blocks that are a single flat colour. 1 is a perfect
   *  2:1 reduction; below ~0.6 the 64px icon will look soft. */
  gridScore: number;
  /** How far the drawing had to be nudged to sit on an even pixel grid. */
  gridShift: { x: number; y: number };
  /** Pixels that were neither opaque nor clear before the alpha was flattened. */
  softPixels: number;
}

export interface KinArtReport {
  /** True once loadKinArt has run, whatever it found. */
  loaded: boolean;
  /** Species with at least one image. */
  species: string[];
  entries: KinArtEntry[];
  notes: KinArtNote[];
  /** Species whose icon will be soft, worst first. Tell the player about these. */
  softIcons: { species: string; view: string; gridScore: number }[];
  /** Species with a front but no back, or the other way round. */
  unpaired: string[];
}

interface Pair { front?: HTMLCanvasElement; back?: HTMLCanvasElement }

const art = new Map<string, Pair>();
const entries: KinArtEntry[] = [];
const notes: KinArtNote[] = [];
let loaded = false;

/* ------------------------------------------------------------- accessors */

/** The hand-drawn sprite for a species, or null if it has none. Synchronous:
 *  everything was decoded at boot. */
export function kinArtSprite(speciesId: string, back: boolean): HTMLCanvasElement | null {
  const pair = art.get(speciesId);
  if (!pair) return null;
  return (back ? pair.back : pair.front) ?? null;
}

export function hasKinArt(speciesId: string, back?: boolean): boolean {
  const pair = art.get(speciesId);
  if (!pair) return false;
  if (back === undefined) return Boolean(pair.front ?? pair.back);
  return Boolean(back ? pair.back : pair.front);
}

/** Every species that has at least one image, for tooling and reports. */
export function kinArtSpecies(): string[] {
  return [...art.keys()].sort();
}

export function kinArtReport(): KinArtReport {
  const soft = entries
    .filter((e) => e.gridScore < 0.6)
    .sort((a, b) => a.gridScore - b.gridScore)
    .map((e) => ({ species: e.species, view: e.view, gridScore: Number(e.gridScore.toFixed(3)) }));
  const unpaired = [...art.entries()]
    .filter(([, p]) => !p.front || !p.back)
    .map(([id]) => id)
    .sort();
  return { loaded, species: kinArtSpecies(), entries: [...entries], notes: [...notes], softIcons: soft, unpaired };
}

/* ---------------------------------------------------------------- loading */

function note(species: string, file: string, level: KinArtLevel, message: string): void {
  notes.push({ species, file, level, message });
}

function fileFor(speciesId: string, back: boolean): string {
  return `${speciesId}-${back ? 'back' : 'front'}.png`;
}

/**
 * Read the folder listing.
 *
 * The registry makes a point of never probing blindly for content that might
 * not be there -- every miss is a wasted request and a console error, and there
 * would be up to 96 of them here. So both hosts that serve this game (the dev
 * server and the Electron scheme handler) synthesise `assets/kin/index.json`
 * from the directory, and `tools/kinart.js` writes a static copy for anywhere
 * else. If the listing genuinely cannot be had we fall back to probing, because
 * a player who has dropped files in the folder should see them either way.
 */
async function readIndex(base: string, ids: string[]): Promise<string[] | null> {
  try {
    const res = await fetch(base + KIN_ART_INDEX, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json() as { files?: unknown };
    if (!Array.isArray(body.files)) throw new Error('no "files" array');
    return body.files.filter((f): f is string => typeof f === 'string');
  } catch {
    // No listing. Probe, quietly -- 404s here are the normal case.
    const known = new Set(ids);
    const found: string[] = [];
    await Promise.all([...known].flatMap((id) => [false, true].map(async (back) => {
      const name = fileFor(id, back);
      const ok = await fetch(base + `${KIN_ART_DIR}/${name}`, { method: 'HEAD' })
        .then((r) => r.ok).catch(() => false);
      if (ok) found.push(name);
    })));
    if (found.length) {
      console.info(`[kinart] no ${KIN_ART_INDEX}; found ${found.length} file(s) by probing. `
        + 'Run "npm run kinart" to write the listing.');
    }
    return found;
  }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const done = (v: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(v);
    };
    // The project has been bitten by a load that simply never resolves and
    // wedges the boot behind it. It cannot happen twice.
    const timer = setTimeout(() => done(null), LOAD_TIMEOUT_MS);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = url;
  });
}

/**
 * Decode every image that exists, once, before anything renders.
 *
 * Safe to call twice; the second call is a no-op. Never rejects.
 */
export async function loadKinArt(ids: string[], base = ''): Promise<KinArtReport> {
  if (loaded) return kinArtReport();
  loaded = true;

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return kinArtReport();
  }

  let files: string[] = [];
  try {
    files = (await readIndex(base, ids)) ?? [];
  } catch (e) {
    note('*', KIN_ART_INDEX, 'warn', `could not be read (${(e as Error).message})`);
  }

  const known = new Set(ids);
  const wanted: { species: string; back: boolean; file: string }[] = [];
  for (const raw of files) {
    const name = raw.replace(/^.*[\\/]/, '');
    const m = /^(.+)-(front|back)\.png$/i.exec(name);
    if (!m) {
      note('?', name, 'warn', 'ignored: name must be <species-id>-front.png or <species-id>-back.png');
      continue;
    }
    const id = m[1]!.toLowerCase();
    if (!known.has(id)) {
      note(id, name, 'warn', `ignored: "${id}" is not a species id`);
      continue;
    }
    if (name !== name.toLowerCase()) {
      // Windows does not care. A case-sensitive web host does, and the file
      // that worked all through the art pass 404s the day it is published.
      note(id, name, 'warn', 'has capital letters in its name; rename it all-lowercase');
    }
    wanted.push({ species: id, back: m[2]!.toLowerCase() === 'back', file: name });
  }

  await Promise.all(wanted.map(async ({ species, back, file }) => {
    const img = await loadImage(base + `${KIN_ART_DIR}/${file}`);
    if (!img) {
      note(species, file, 'error', 'could not be loaded or decoded; using the generated sprite');
      return;
    }
    let seated: { canvas: HTMLCanvasElement; entry: KinArtEntry } | null = null;
    try {
      seated = seat(img, species, back, file);
    } catch (e) {
      note(species, file, 'error', `failed while being prepared (${(e as Error).message})`);
      return;
    }
    if (!seated) return;
    const pair = art.get(species) ?? {};
    if (back) pair.back = seated.canvas; else pair.front = seated.canvas;
    art.set(species, pair);
    entries.push(seated.entry);
  }));

  entries.sort((a, b) => (a.species + a.view).localeCompare(b.species + b.view));
  announce();
  return kinArtReport();
}

function announce(): void {
  const report = kinArtReport();
  if (!report.species.length && !report.notes.length) return;
  console.info(`[kinart] ${report.species.length} species drawn `
    + `(${report.entries.length} images); the rest are generated.`);
  for (const n of report.notes) {
    const line = `[kinart] ${n.file}: ${n.message}`;
    if (n.level === 'error') console.error(line);
    else if (n.level === 'warn') console.warn(line);
    else console.info(line);
  }
  if (report.unpaired.length) {
    console.warn(`[kinart] front/back missing its partner, so one view is still generated: `
      + report.unpaired.join(', '));
  }
  if (report.softIcons.length) {
    console.warn('[kinart] these will have a soft 64px icon -- the drawing is not on a '
      + '2-pixel grid: ' + report.softIcons.map((s) => `${s.species}/${s.view}`).join(', '));
  }
}

/** For tests and for re-running a load after the folder changed. */
export function resetKinArt(): void {
  art.clear();
  entries.length = 0;
  notes.length = 0;
  loaded = false;
}

/* ----------------------------------------------------------- the seating */

interface Pixels { w: number; h: number; data: Uint8ClampedArray }

function scratch(w: number, h: number): CanvasRenderingContext2D {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  cx.imageSmoothingEnabled = false;
  return cx;
}

/**
 * Turn a delivered PNG into a 128x128 sprite that stands where the generated
 * ones stand.
 */
function seat(img: HTMLImageElement, species: string, back: boolean, file: string):
{ canvas: HTMLCanvasElement; entry: KinArtEntry } | null {
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  if (!sw || !sh) {
    note(species, file, 'error', 'decoded to a zero-sized image; using the generated sprite');
    return null;
  }
  if (sw > MAX_SOURCE || sh > MAX_SOURCE) {
    note(species, file, 'error',
      `is ${sw}x${sh}, which is far larger than the 128x128 the game expects; using the generated sprite`);
    return null;
  }
  if (sw !== KIN_ART_SIZE || sh !== KIN_ART_SIZE) {
    note(species, file, 'warn',
      `is ${sw}x${sh}, not ${KIN_ART_SIZE}x${KIN_ART_SIZE}; it has been fitted, which may cost detail`);
  }

  const cx = scratch(sw, sh);
  cx.drawImage(img, 0, 0);
  const src: Pixels = { w: sw, h: sh, data: cx.getImageData(0, 0, sw, sh).data };

  // Hard alpha, first thing. Everything below counts ink, and a fringe of
  // half-transparent anti-aliasing would otherwise widen every bounding box and
  // wreck every grid measurement.
  let soft = 0;
  for (let i = 3; i < src.data.length; i += 4) {
    const a = src.data[i]!;
    if (a === 0 || a === 255) continue;
    soft++;
    src.data[i] = a >= ALPHA_CUT ? 255 : 0;
  }
  if (soft > 0) {
    note(species, file, 'warn',
      `has ${soft} part-transparent pixel(s); the edge was flattened to hard alpha. `
      + 'Export with no anti-aliasing to control exactly where it lands.');
  }

  const b = inkBounds(src);
  if (!b) {
    // A truncated or damaged PNG usually lands here rather than on the error
    // handler: the browser decodes the header, gives up, and hands back a blank
    // image of the right size.
    note(species, file, 'error',
      'has no opaque pixels -- it is empty, or the file is truncated; using the generated sprite');
    return null;
  }

  const iw = b.x1 - b.x0 + 1, ih = b.y1 - b.y0 + 1;
  // Room: the full width of the cell, and everything from the top down to the
  // ground line. Only a drawing that will not fit is ever resampled.
  const scale = Math.min(1, DESIGN / iw, (GROUND_ROW + 1) / ih);
  if (scale < 1) {
    note(species, file, 'warn',
      `draws a creature ${iw}x${ih}, which is bigger than the ${DESIGN}x${GROUND_ROW + 1} cell; `
      + `it was reduced to ${Math.round(scale * 100)}% and will lose crispness`);
  }

  const dw = Math.max(1, Math.round(iw * scale));
  const dh = Math.max(1, Math.round(ih * scale));
  const baseX = Math.round(CENTRE_X - dw / 2);
  const baseY = GROUND_ROW - dh + 1;

  // Which 2x2 phase the drawing's own pixel grid sits on. Shifting up to one
  // pixel to land on the even grid is invisible in battle and is the whole
  // difference between a crisp 64px icon and a smeared one.
  const shift = bestGridShift(src, b, scale, dw, dh, baseX, baseY);
  const dx = baseX - shift.x;
  const dy = baseY - shift.y;

  const out = scratch(DESIGN, DESIGN);
  const dest = out.createImageData(DESIGN, DESIGN);
  paint(src, b, scale, dw, dh, dx, dy, dest);
  out.putImageData(dest, 0, 0);

  const grid = gridScore(dest);
  const placed = inkBounds({ w: DESIGN, h: DESIGN, data: dest.data })
    ?? { x0: 0, y0: 0, x1: 0, y1: 0 };

  // The floor goes on last and underneath, so it never enters a measurement.
  contactShadow(out, placed);

  return {
    canvas: out.canvas,
    entry: {
      species, view: back ? 'back' : 'front', file,
      sourceW: sw, sourceH: sh,
      ink: placed, scale, gridScore: grid,
      gridShift: shift, softPixels: soft,
    },
  };
}

function inkBounds(p: Pixels): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (p.data[(y * p.w + x) * 4 + 3]! < ALPHA_CUT) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Nearest-neighbour, source-driven, hard alpha. Identical to a straight copy
 *  when nothing needed reducing, which is the case the spec asks for. */
function paint(src: Pixels, b: { x0: number; y0: number; x1: number; y1: number },
  scale: number, dw: number, dh: number, dx: number, dy: number, dest: ImageData): void {
  const iw = b.x1 - b.x0 + 1, ih = b.y1 - b.y0 + 1;
  for (let j = 0; j < dh; j++) {
    const ty = dy + j;
    if (ty < 0 || ty >= dest.height) continue;
    const sy = b.y0 + (scale === 1 ? j : Math.min(ih - 1, Math.floor((j + 0.5) / scale)));
    for (let i = 0; i < dw; i++) {
      const tx = dx + i;
      if (tx < 0 || tx >= dest.width) continue;
      const sx = b.x0 + (scale === 1 ? i : Math.min(iw - 1, Math.floor((i + 0.5) / scale)));
      const s = (sy * src.w + sx) * 4;
      if (src.data[s + 3]! < ALPHA_CUT) continue;
      const d = (ty * dest.width + tx) * 4;
      dest.data[d] = src.data[s]!;
      dest.data[d + 1] = src.data[s + 1]!;
      dest.data[d + 2] = src.data[s + 2]!;
      dest.data[d + 3] = 255;
    }
  }
}

/**
 * How much of a drawing is made of flat 2x2 blocks.
 *
 * The icon is the front sprite halved, so a drawing whose pixels come in 2x2
 * squares reduces exactly -- every output pixel is a colour that was really
 * there. A drawing that does not gets the dominant colour of each block
 * instead, which is the best available answer and still looks softer. This is
 * the number that says which of the two a species got.
 */
function gridScore(dest: ImageData): number {
  let blocks = 0, flat = 0;
  const d = dest.data, w = dest.width;
  for (let y = 0; y + 1 < dest.height; y += 2) {
    for (let x = 0; x + 1 < w; x += 2) {
      const i0 = (y * w + x) * 4, i1 = i0 + 4;
      const i2 = ((y + 1) * w + x) * 4, i3 = i2 + 4;
      const a = d[i0 + 3]! | d[i1 + 3]! | d[i2 + 3]! | d[i3 + 3]!;
      if (!a) continue;
      blocks++;
      if (same(d, i0, i1) && same(d, i0, i2) && same(d, i0, i3)) flat++;
    }
  }
  return blocks ? flat / blocks : 1;
}

function same(d: Uint8ClampedArray, a: number, b: number): boolean {
  return d[a] === d[b] && d[a + 1] === d[b + 1] && d[a + 2] === d[b + 2] && d[a + 3] === d[b + 3];
}

/**
 * Try all four half-pixel phases and keep the best.
 *
 * A drawing done in 2x2 blocks can still land on the odd row once it has been
 * seated, and then not one block reduces cleanly. Shifting is always up and to
 * the left so the creature can never be pushed below the ground line.
 */
function bestGridShift(src: Pixels, b: { x0: number; y0: number; x1: number; y1: number },
  scale: number, dw: number, dh: number, baseX: number, baseY: number): { x: number; y: number } {
  const probe = scratch(DESIGN, DESIGN);
  let best = { x: 0, y: 0 };
  let bestScore = -1, restScore = -1;
  for (const y of [0, 1]) {
    for (const x of [0, 1]) {
      const test = probe.createImageData(DESIGN, DESIGN);
      paint(src, b, scale, dw, dh, baseX - x, baseY - y, test);
      const s = gridScore(test);
      if (!x && !y) restScore = s;
      // Ties go to no shift: never move a drawing for nothing.
      if (s > bestScore + 1e-9) { bestScore = s; best = { x, y }; }
    }
  }
  // Only worth moving if it is a real improvement, not measurement noise.
  if ((best.x || best.y) && bestScore - restScore < 0.05) return { x: 0, y: 0 };
  return best;
}

/**
 * The floor under the creature.
 *
 * The generator bakes one of these into every sprite, so a drawing without one
 * hovers next to its neighbours. Same geometry, same two greys, same dither, so
 * an image species and a generated one cast the same shadow in the same battle.
 * Drawn beneath the art, so a creature that overhangs its own feet still sits
 * in front of it.
 */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function contactShadow(cx: CanvasRenderingContext2D,
  ink: { x0: number; y0: number; x1: number; y1: number }): void {
  const span = ink.x1 - ink.x0;
  if (span <= 0) return;
  const centre = (ink.x0 + ink.x1) / 2 + span * 0.06;
  const rx = span * 0.56;
  const ry = Math.max(6, rx * 0.18);
  // Two rows up from the last drawn row: the generator measures its floor from
  // the body, one row above the ink line the outline adds.
  const cy = ink.y1 - 2;

  cx.save();
  cx.globalCompositeOperation = 'destination-over';
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (d > 1) continue;
      const px = Math.round(centre + x), py = Math.round(cy + y);
      if (px < 0 || py < 0 || px >= DESIGN || py >= DESIGN) continue;
      if (d > 0.72 && BAYER[py & 3]![px & 3]! >= ((1 - d) / 0.28) * 16) continue;
      cx.fillStyle = d < 0.42 ? 'rgba(14,17,24,0.34)' : 'rgba(18,22,30,0.18)';
      cx.fillRect(px, py, 1, 1);
    }
  }
  cx.restore();
}
