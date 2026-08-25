/**
 * Item art: the generated icons, and the hand-drawn ones that replace them.
 *
 * This is the items' version of the road `kinart.ts` built for creatures, and
 * it works the same way from the outside -- ask for an item's icon, get a
 * canvas, never think about where it came from. Underneath there are two
 * routes and there always will be:
 *
 *   1. every icon is generated in code, from the block designs at the bottom
 *      of this file, so the bag is never empty of pictures; and
 *   2. any icon may ship as a hand-drawn PNG in `assets/items/`, and where one
 *      does it is used instead.
 *
 * Art arrives one item at a time. At any moment most of the list is generated
 * and the game has to look finished anyway, which is why the generated designs
 * are real drawings and not placeholders.
 *
 * WHERE THE FILES LIVE
 *
 *   assets/items/<icon-key>.png            the icon
 *   assets/items/<icon-key>-<state>.png    a frame of it, see below
 *
 * 32x32, hard alpha, one file per icon. The icon key is the `icon` field in
 * `data/items/items.json`, NOT the item id -- `field_vessel` is drawn by
 * `vessel_field.png`. The indirection is in the schema already and it is worth
 * keeping: it lets two items share one drawing, which the vessel family and
 * any future re-skin will want.
 *
 * FRAMES: THE SAME OBJECT DOING SOMETHING
 *
 * A vessel is not only a row in the bag. It is thrown, it splits open, it takes
 * a creature and shuts. The battle scene has always drawn that itself, and when
 * the art for a vessel arrives it arrives as a PAIR -- closed and open -- which
 * is not two items and must not become two icon keys: "open vessel" is nothing
 * a player can hold, buy or count.
 *
 * So an icon key may own extra FRAMES, named by a state suffix. The state list
 * is closed (`FRAME_STATES` below) rather than open-ended, because a suffix
 * nobody reads is worse than a missing file: it looks delivered and never
 * appears. Ask for one with `itemArt(key, state)`, which returns null when that
 * frame was not drawn -- the caller then keeps whatever it was drawing before,
 * so a half-delivered family never half-breaks an animation.
 *
 * FRAMES ARE SEATED AS A GROUP, and that is the whole reason this is not just
 * "another icon with a longer name". Seating centres a drawing by its own ink.
 * Do that to each frame separately and the vessel's base JUMPS the instant the
 * lid comes off, because the open drawing is taller and its centre is somewhere
 * else. So all the frames of one key are measured together: the union of their
 * ink is what gets centred and scaled, and each frame keeps its place inside
 * it. Which means the rule for whoever is drawing is simply
 *
 *   draw every frame on the same canvas with the object in the same place,
 *
 * and the loader will not move them relative to each other. With one frame the
 * union is that frame's own ink and this is exactly the old behaviour.
 *
 * WHY 32 AND NOT 128
 *
 * The creature cell is 128 because a creature fills half the battle screen.
 * An item never does. The renderer draws at DETAIL=2, so a 32px canvas is
 * exactly 16 logical units on screen -- one map tile, the same square a
 * character stands on, and the size an item wants to be in a description panel,
 * in a "you found it" line, or lying on the ground. Halved it is 16px = 8
 * logical units, which is what fits a 12-unit menu row with clearance.
 *
 * So there are two sizes and one file:
 *
 *   ITEM_ART_SIZE  32px = 16 logical   panels, messages, the overworld, battle
 *   ITEM_ICON_SIZE 16px =  8 logical   bag rows, shop rows, anywhere in a list
 *
 * and the second is the first halved. Which one a screen wants is decided by
 * the screen, once, at the bottom of this file: `drawItemSprite` for a panel
 * and `drawItemRowIcon` for a list row. Nothing scales an item icon at a call
 * site -- a 32px drawing squeezed into a 12-unit row is the exact blur the
 * halving exists to avoid, and it is the kind of thing that looks fine in the
 * code and is obvious in the picture.
 *
 * The 2-pixel block rule from the
 * creature spec applies here too. Every generated design below is authored
 * on a 16x16 grid at 2x, so its halving is exact by construction; a hand-drawn
 * file has to earn that, and `npm run item:check` says whether it did.
 *
 * The halving is a per-block PLURALITY VOTE, not an average, and that is what
 * makes the rule advice rather than law. Art that is not on the grid still
 * reduces to colours that are really in the drawing -- it invents nothing -- so
 * art recovered from a high-resolution original by `npm run item:import` is
 * deliberately left at full resolution. Both were rendered and compared; the
 * block version lost. See the header of tools/item-import.js.
 *
 * WHAT THE LOADER DOES TO AN IMAGE
 *
 * It does not blit the file. It finds the real ink bounding box and CENTRES it
 * in the cell, both axes -- and that is the one rule that genuinely differs
 * from creatures. A creature stands on a floor, so it is seated on a ground
 * line and given a contact shadow. An item is an object in a box: a row, a
 * panel, a message slot. Nothing it sits in has a floor, so centring is what
 * makes twenty-odd differently-framed drawings line up in a list, and a baked
 * shadow would just be a smudge under one of them. There is no contact shadow
 * here on purpose.
 *
 * Everything else is the creature pipeline: alpha flattened to hard on/off,
 * the drawing nudged up to a pixel to land on the even grid so the 16px
 * reduction stays crisp, and anything wrong with a file reported as a note and
 * a console line rather than an exception -- a bad PNG falls back to the
 * generated design for that key.
 *
 * THE ASYNC PROBLEM, same as creatures: `itemSprite` is called from inside a
 * render tick and must stay synchronous, so every image is decoded ONCE at
 * boot in `loadItemArt`, before the first frame. After that it is a lookup.
 */

import type { ItemCategory } from '../data/schema.js';
import { DETAIL, type Renderer } from '../engine/renderer.js';
import { GLYPH_H } from './font.js';

/** The folder the player drops PNGs into, relative to index.html. */
export const ITEM_ART_DIR = 'assets/items';
/** Generated listing of what is actually in that folder. See tools/itemart.js. */
export const ITEM_ART_INDEX = `${ITEM_ART_DIR}/index.json`;

/** The cell, in image pixels. 16 logical units at DETAIL=2 -- one map tile. */
export const ITEM_ART_SIZE = 32;
/** The list size: the cell halved. 8 logical units. */
export const ITEM_ICON_SIZE = ITEM_ART_SIZE / 2;

/** The design grid every generated icon is drawn on. 16 cells across a 32px
 *  canvas, so one design cell is a 2x2 block and the halving is exact. */
const DESIGN_CELLS = 16;
const BLOCK = ITEM_ART_SIZE / DESIGN_CELLS;

/** An edge is in or out. Anything between is an export mistake, and a halo of
 *  half-alpha fringe round a 32px icon is proportionally four times as ugly as
 *  it is round a creature. */
const ALPHA_CUT = 128;

/** Refuse to decode something absurd rather than allocate it. */
const MAX_SOURCE = 1024;
/** A load that never settles must not hold the boot open forever. */
const LOAD_TIMEOUT_MS = 8000;

/**
 * The states an icon key may have a second drawing for.
 *
 * Deliberately a list and not "any suffix". Every entry here has to be asked
 * for by name somewhere in the game, so a file named after a state that is not
 * on this list is a mistake the checker can name -- rather than a drawing that
 * silently never appears.
 *
 * `open` is the vessel coming apart. It is used by the send-out and the capture
 * throw in `src/scenes/battle.ts`, which draw a vessel that splits; when a
 * vessel ships an `open` frame those animations can show the drawing instead of
 * the shape the scene plots itself.
 *
 * tools/lib/itemseat.js carries the same list for the offline tools. If you add
 * one here, add it there, and say what it is for in docs/ITEM-SPEC.md -- that
 * document is what the person drawing reads.
 */
export const FRAME_STATES = ['open'] as const;
export type ItemFrameState = (typeof FRAME_STATES)[number];

const FRAME_STATE_SET: ReadonlySet<string> = new Set<string>(FRAME_STATES);

/** Split `vessel_field-open` into its key and its state. A stem with no known
 *  state suffix is a plain icon key, dashes and all -- so a mistyped state is
 *  reported as an unknown KEY, which is the message that names the real fault. */
export function splitFrameName(stem: string): { key: string; state: ItemFrameState | null } {
  const cut = stem.lastIndexOf('-');
  if (cut > 0) {
    const tail = stem.slice(cut + 1);
    if (FRAME_STATE_SET.has(tail)) {
      return { key: stem.slice(0, cut), state: tail as ItemFrameState };
    }
  }
  return { key: stem, state: null };
}

/** The file a key's frame is drawn by. One place, so nothing spells it twice. */
export function frameFile(key: string, state?: ItemFrameState | null): string {
  return state ? `${key}-${state}.png` : `${key}.png`;
}

export type ItemArtLevel = 'error' | 'warn' | 'info';

export interface ItemArtNote {
  key: string;
  file: string;
  level: ItemArtLevel;
  message: string;
}

export interface ItemArtEntry {
  /** The `icon` field from items.json, which is the filename stem. */
  key: string;
  /** null for the icon itself; a state for one of its extra frames. */
  state: ItemFrameState | null;
  file: string;
  /** Size of the file as delivered. */
  sourceW: number;
  sourceH: number;
  /** Where the ink ended up, after centring. */
  ink: { x0: number; y0: number; x1: number; y1: number };
  /** 1 unless the drawing was too big for the cell and had to be reduced. */
  scale: number;
  /** Fraction of 2x2 blocks that are a single flat colour. 1 is a perfect
   *  2:1 reduction; below ~0.6 the 16px list icon will look soft. */
  gridScore: number;
  /** How far the drawing had to be nudged to sit on an even pixel grid. */
  gridShift: { x: number; y: number };
  /** Pixels that were neither opaque nor clear before the alpha was flattened. */
  softPixels: number;
}

export interface ItemArtReport {
  /** True once loadItemArt has run, whatever it found. */
  loaded: boolean;
  /** Icon keys with an image. */
  keys: string[];
  entries: ItemArtEntry[];
  notes: ItemArtNote[];
  /** Keys whose list icon will be soft, worst first. Tell the player. */
  softIcons: { key: string; gridScore: number }[];
  /** Keys the game asked for that have a generated design and no drawing.
   *  Not a fault -- the to-do list. */
  generated: string[];
  /** Every extra frame that shipped, so a scene can ask what it may animate. */
  frames: { key: string; state: ItemFrameState }[];
}

const art = new Map<string, HTMLCanvasElement>();
/** Extra frames, keyed `<icon-key>:<state>`. Kept apart from `art` on purpose:
 *  a frame is never an icon, so nothing that lists icons can pick one up. */
const frames = new Map<string, HTMLCanvasElement>();
const entries: ItemArtEntry[] = [];
const notes: ItemArtNote[] = [];
const cache = new Map<string, HTMLCanvasElement>();
let wanted: string[] = [];
let loaded = false;

/* ------------------------------------------------------------- accessors */

/**
 * The 32x32 icon for an icon key: the drawing if one shipped, the generated
 * design otherwise. Never null, never async, cached.
 *
 * `category` is only consulted for a key with no design of its own -- a future
 * item whose art has not been written yet gets a crate in its category's
 * colour rather than nothing at all.
 */
export function itemSprite(iconKey: string, category?: ItemCategory): HTMLCanvasElement {
  const key = `s:${iconKey}:${category ?? ''}`;
  let cv = cache.get(key);
  if (!cv) {
    cv = art.get(iconKey) ?? generate(iconKey, category);
    cache.set(key, cv);
  }
  return cv;
}

/**
 * The 16x16 list icon: the 32px sprite halved by taking the dominant colour of
 * each 2x2 block.
 *
 * On art drawn in 2x2 blocks -- which every generated design is, and which a
 * hand-drawn file should be -- the dominant colour IS the block's colour, so
 * the reduction is exact and invents nothing. Art off that grid still reduces,
 * to the nearest thing to a majority vote, and comes out softer;
 * `itemArtReport().softIcons` names the files that landed in that case.
 */
export function itemIcon(iconKey: string, category?: ItemCategory): HTMLCanvasElement {
  const key = `i:${iconKey}:${category ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const src = itemSprite(iconKey, category);
  const cv = surface(ITEM_ICON_SIZE, ITEM_ICON_SIZE);
  const cx = cv.getContext('2d') as CanvasRenderingContext2D;
  const data = (src.getContext('2d') as CanvasRenderingContext2D)
    .getImageData(0, 0, src.width, src.height).data;

  for (let y = 0; y < ITEM_ICON_SIZE; y++) {
    for (let x = 0; x < ITEM_ICON_SIZE; x++) {
      const counts = new Map<string, number>();
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * src.width + x * 2 + dx) * 4;
          if (data[i + 3]! < ALPHA_CUT) continue;
          const k = `${data[i]},${data[i + 1]},${data[i + 2]}`;
          counts.set(k, (counts.get(k) ?? 0) + 1);
        }
      }
      if (!counts.size) continue;
      let best = '', bestN = 0;
      for (const [k, n] of counts) if (n > bestN) { best = k; bestN = n; }
      cx.fillStyle = `rgb(${best})`;
      cx.fillRect(x, y, 1, 1);
    }
  }
  cache.set(key, cv);
  return cv;
}

/**
 * The hand-drawn 32x32 art for an icon key, or for one of its frames -- and
 * NULL when that drawing has not shipped.
 *
 * This is the one accessor that tells the truth about what is on disk, and it
 * is what an animation wants. `itemSprite` can never say no: it falls back to
 * the generated design, which is right for a bag row and wrong for a scene that
 * is choosing between drawing the art and plotting its own shape. Ask here,
 * take both frames or neither, and a vessel whose `open` frame has not been
 * drawn yet keeps the animation the scene already had rather than opening into
 * a copy of its closed self.
 *
 *   itemArt('vessel_field')            the icon as delivered, or null
 *   itemArt('vessel_field', 'open')    the open frame, or null
 *
 * Both frames of a key are seated together, so they may be drawn one over the
 * other at the same position with nothing to line up: the object does not move
 * between them unless the drawing moves it.
 */
export function itemArt(iconKey: string, state?: ItemFrameState | null): HTMLCanvasElement | null {
  return (state ? frames.get(`${iconKey}:${state}`) : art.get(iconKey)) ?? null;
}

/**
 * A key's base drawing together with named frames of it -- ALL of them or none.
 *
 *   const v = itemArtFrames('vessel_field', 'open');
 *   if (v) { const [closed, open] = v; ... } else { plot the shape as before }
 *
 * Returns `[base, ...one canvas per state, in the order asked]`, or null the
 * moment any one of them has not shipped. Never throws, never returns a short
 * array, and never substitutes one frame for another.
 *
 * That all-or-nothing rule is the whole point, and it exists because the
 * half-delivered case is a real one this loader already warns about: a folder
 * can hold `vessel_field-open.png` and no `vessel_field.png`. Asking twice with
 * `itemArt` and using whatever came back would then give an animation that
 * plots its own closed vessel and cuts to a hand-drawn open one -- two
 * different objects in the same beat, which is worse than plotting both.
 *
 * Because the frames of a key are seated as a group (see the top of this file),
 * every canvas returned here is 32x32 with the object registered against the
 * others: draw them at the same position on successive frames and nothing moves
 * that the drawing did not move.
 */
export function itemArtFrames(
  iconKey: string, ...states: ItemFrameState[]
): HTMLCanvasElement[] | null {
  const base = art.get(iconKey);
  if (!base) return null;
  const out = [base];
  for (const state of states) {
    const frame = frames.get(`${iconKey}:${state}`);
    if (!frame) return null;
    out.push(frame);
  }
  return out;
}

/** True if this key is drawn by hand rather than generated. */
export function hasItemArt(iconKey: string): boolean {
  return art.has(iconKey);
}

/** The extra frames this key shipped, in FRAME_STATES order. Empty for most. */
export function itemFrameStates(iconKey: string): ItemFrameState[] {
  return FRAME_STATES.filter((s) => frames.has(`${iconKey}:${s}`));
}

/** True if the generated route has a design of its own for this key, rather
 *  than falling through to the category crate. Tooling asks this. */
export function hasItemDesign(iconKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(DESIGNS, iconKey);
}

/** Every key that has a hand-drawn image, for tooling and reports. */
export function itemArtKeys(): string[] {
  return [...art.keys()].sort();
}

/** Every key the generated route draws by name. The spec's to-do list. */
export function itemDesignKeys(): string[] {
  return Object.keys(DESIGNS).sort();
}

/* ------------------------------------------------- putting one on a screen */

/**
 * The two sizes again, in LOGICAL units this time.
 *
 * Everything above this line counts image pixels, because that is what a
 * loader and a 2x2 block vote deal in. Everything below it, and every screen
 * that calls it, counts logical units -- the 240x160 the game is laid out on.
 * The two are related by DETAIL and nothing else, so they are converted once,
 * here, rather than by a `/ 2` at each of the dozen call sites that would
 * otherwise have to know that the renderer draws at double density.
 */
export const ITEM_SPRITE_UNITS = ITEM_ART_SIZE / DETAIL;
export const ITEM_ICON_UNITS = ITEM_ICON_SIZE / DETAIL;

/**
 * Where a list icon sits inside a menu row, and the `padX` that row then needs.
 *
 * A `ListMenu` row is drawn as a selection cursor at `x + 3` and a label at
 * `x + padX`. The cursor is an arrow seven buffer pixels wide, so it has
 * finished by `x + 6.5`; the icon takes the eight units from `x + 8`, and the
 * label starts two units after it.
 *
 * The first attempt spent half a unit on the left of the icon and one on the
 * right, which is a single buffer pixel each, and at 1x the row read as one
 * smeared object: arrow, drawing and the first letter of the name all touching.
 * An item icon is not inset the way a glyph is -- the loader centres the
 * drawing's own ink in the cell, so a drawing that fills its cell really does
 * reach the edge -- which means the whole gap has to be spent out here. One and
 * a half units on the left and two on the right is what reads as separate.
 *
 * These are exported because the bag, the shop's two lists and the battle bag
 * all have to agree on them exactly. Two screens that each pick their own
 * indent look like two different games in consecutive menus, and the number is
 * not guessable from the outside -- it is a fact about `ui/menu.ts`.
 */
export const ITEM_ROW_ICON_X = 8;
export const ITEM_ROW_PAD_X = ITEM_ROW_ICON_X + ITEM_ICON_UNITS + 2;

/**
 * What either drawing helper needs to know about an item.
 *
 * Structural, so an `ItemData` straight out of the registry is one already and
 * nothing has to unpack it. Deliberately NOT an item id: this file has no
 * registry and should not grow one -- the caller has the item in hand at every
 * one of these call sites, and the `icon` field is the indirection that lets
 * two items share a drawing.
 */
export interface ItemIconRef {
  icon: string;
  category?: ItemCategory;
}

/**
 * The 16px icon for a menu row, vertically centred on that row's text.
 *
 * `textY` is the y the row's label is drawn at, not the top of the row: the
 * icon is eight units and a line of the face is seven, so it hangs half a unit
 * above the letters -- one buffer pixel, which the renderer can express and a
 * "centre it in the row height" calculation could not, because rows are 11 in
 * battle and 12 everywhere else.
 *
 * A missing or unknown item draws nothing rather than a crate: an empty row
 * ("Nothing here.") is not an item and must not be given a picture.
 */
export function drawItemRowIcon(
  r: Renderer, item: ItemIconRef | undefined | null, rowX: number, textY: number,
): void {
  if (!item?.icon) return;
  r.image(itemIcon(item.icon, item.category),
    rowX + ITEM_ROW_ICON_X, textY + (GLYPH_H - ITEM_ICON_UNITS) / 2);
}

/**
 * The 32px icon at its full size, for a description panel, a message or the
 * world. `x`/`y` are its top-left corner; it occupies ITEM_SPRITE_UNITS square.
 */
export function drawItemSprite(
  r: Renderer, item: ItemIconRef | undefined | null, x: number, y: number,
): void {
  if (!item?.icon) return;
  r.image(itemSprite(item.icon, item.category), x, y);
}

export function itemArtReport(): ItemArtReport {
  // Icons only. A frame is drawn at 32px by a scene and never appears in a
  // list, so it is never halved and the 2-pixel grid says nothing about it.
  const soft = entries
    .filter((e) => e.state === null && e.gridScore < 0.6)
    .sort((a, b) => a.gridScore - b.gridScore)
    .map((e) => ({ key: e.key, gridScore: Number(e.gridScore.toFixed(3)) }));
  return {
    loaded,
    keys: itemArtKeys(),
    entries: [...entries],
    notes: [...notes],
    softIcons: soft,
    generated: wanted.filter((k) => !art.has(k)).sort(),
    frames: entries
      .filter((e): e is ItemArtEntry & { state: ItemFrameState } => e.state !== null)
      .map((e) => ({ key: e.key, state: e.state })),
  };
}

/** For tests and for re-running a load after the folder changed. */
export function resetItemArt(): void {
  art.clear();
  frames.clear();
  cache.clear();
  entries.length = 0;
  notes.length = 0;
  wanted = [];
  loaded = false;
}

/* ---------------------------------------------------------------- loading */

function note(key: string, file: string, level: ItemArtLevel, message: string): void {
  notes.push({ key, file, level, message });
}

/**
 * Read the folder listing.
 *
 * Same rule the creature loader follows and for the same reason: never probe
 * blindly for content that might not be there. Both hosts that serve this game
 * synthesise `assets/items/index.json` from the directory, and
 * `tools/itemart.js` writes a static copy for anywhere else. If the listing
 * genuinely cannot be had we probe, because a player who has dropped files in
 * the folder should see them either way.
 */
async function readIndex(base: string, keys: string[]): Promise<string[]> {
  try {
    const res = await fetch(base + ITEM_ART_INDEX, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json() as { files?: unknown };
    if (!Array.isArray(body.files)) throw new Error('no "files" array');
    return body.files.filter((f): f is string => typeof f === 'string');
  } catch {
    const found: string[] = [];
    const probes: string[] = [];
    for (const key of keys) {
      probes.push(frameFile(key));
      for (const state of FRAME_STATES) probes.push(frameFile(key, state));
    }
    await Promise.all(probes.map(async (name) => {
      const ok = await fetch(base + `${ITEM_ART_DIR}/${name}`, { method: 'HEAD' })
        .then((r) => r.ok).catch(() => false);
      if (ok) found.push(name);
    }));
    if (found.length) {
      console.info(`[itemart] no ${ITEM_ART_INDEX}; found ${found.length} file(s) by probing. `
        + 'Run "npm run itemart" to write the listing.');
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
    const timer = setTimeout(() => done(null), LOAD_TIMEOUT_MS);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = url;
  });
}

/**
 * Decode every item image that exists, once, before anything renders.
 *
 * `keys` is every `icon` value in items.json -- the caller has the registry,
 * this file does not. Safe to call twice; the second call is a no-op. Never
 * rejects: with no files, or with an unreachable folder, every item simply
 * keeps its generated design.
 */
export async function loadItemArt(keys: string[], base = ''): Promise<ItemArtReport> {
  if (loaded) return itemArtReport();
  loaded = true;
  wanted = [...new Set(keys)];

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return itemArtReport();
  }

  let files: string[] = [];
  try {
    files = await readIndex(base, wanted);
  } catch (e) {
    note('*', ITEM_ART_INDEX, 'warn', `could not be read (${(e as Error).message})`);
  }

  const known = new Set(wanted);
  /* One job per file, gathered into one group per icon key -- because the
   * frames of a key are seated together and a group cannot be measured until
   * every one of its images has arrived. */
  const groups = new Map<string, { key: string; state: ItemFrameState | null; file: string }[]>();
  for (const raw of files) {
    const name = raw.replace(/^.*[\\/]/, '');
    const m = /^(.+)\.png$/i.exec(name);
    if (!m) continue;
    const stem = m[1]!.toLowerCase();
    const { key, state } = splitFrameName(stem);
    if (!known.has(key)) {
      note(stem, name, 'warn', `ignored: "${key}" is not an icon key used by any item`);
      continue;
    }
    if (name !== name.toLowerCase()) {
      // Windows does not care. A case-sensitive web host does, and the file
      // that worked all through the art pass 404s the day it is published.
      note(stem, name, 'warn', 'has capital letters in its name; rename it all-lowercase');
    }
    const g = groups.get(key) ?? [];
    g.push({ key, state, file: name });
    groups.set(key, g);
  }

  await Promise.all([...groups.values()].map(async (jobs) => {
    const ready: { state: ItemFrameState | null; file: string; img: HTMLImageElement }[] = [];
    await Promise.all(jobs.map(async (job) => {
      const img = await loadImage(base + `${ITEM_ART_DIR}/${job.file}`);
      if (!img) {
        note(job.key, job.file, 'error', 'could not be loaded or decoded; using the generated icon');
        return;
      }
      ready.push({ state: job.state, file: job.file, img });
    }));
    if (!ready.length) return;
    // Base first, so the grid phase is chosen on the drawing the bag shows.
    ready.sort((a, b) => Number(a.state !== null) - Number(b.state !== null));

    const key = jobs[0]!.key;
    let seated: { canvas: HTMLCanvasElement; entry: ItemArtEntry }[] = [];
    try {
      seated = seatGroup(key, ready);
    } catch (e) {
      note(key, ready[0]!.file, 'error', `failed while being prepared (${(e as Error).message})`);
      return;
    }
    for (const s of seated) {
      if (s.entry.state) frames.set(`${key}:${s.entry.state}`, s.canvas);
      else art.set(key, s.canvas);
      entries.push(s.entry);
    }
    if (seated.length && !seated.some((s) => s.entry.state === null)) {
      note(key, seated[0]!.entry.file, 'warn',
        `is the "${seated[0]!.entry.state}" frame of ${key}, but ${frameFile(key)} itself is not `
        + 'there. The frame is loaded, but the item still shows its generated icon.');
    }
  }));

  entries.sort((a, b) => a.key.localeCompare(b.key) || (a.state ?? '').localeCompare(b.state ?? ''));
  // Anything already handed out came from the generated route. Drop it, or an
  // item drawn once before boot finished keeps its crate forever.
  cache.clear();
  announce();
  return itemArtReport();
}

function announce(): void {
  const report = itemArtReport();
  if (!report.keys.length && !report.notes.length) return;
  console.info(`[itemart] ${report.keys.length} item icon(s) drawn by hand; `
    + `${report.generated.length} generated`
    + (report.frames.length
      ? `; ${report.frames.length} extra frame(s): `
        + report.frames.map((f) => `${f.key} ${f.state}`).join(', ')
      : '') + '.');
  for (const n of report.notes) {
    const line = `[itemart] ${n.file}: ${n.message}`;
    if (n.level === 'error') console.error(line);
    else if (n.level === 'warn') console.warn(line);
    else console.info(line);
  }
  if (report.softIcons.length) {
    // Not necessarily a fault: art recovered from a high-resolution original by
    // `npm run item:import` is deliberately off this grid, and its halving is a
    // vote over colours that are really in the drawing rather than a blur. See
    // the note under that heading in `npm run item:check`.
    console.info('[itemart] the 16px list icon is a per-block vote rather than an exact '
      + 'halving for: ' + report.softIcons.map((s) => s.key).join(', '));
  }
}

/* ----------------------------------------------------------- the seating */

interface Pixels { w: number; h: number; data: Uint8ClampedArray }
interface Box { x0: number; y0: number; x1: number; y1: number }
/** One measurement, shared by every frame of a key: where the union box lands
 *  in the cell, how far it was reduced, and which grid phase won. */
interface Fit {
  box: Box; scale: number; dw: number; dh: number;
  baseX: number; baseY: number; shift: { x: number; y: number };
}

function surface(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const cx = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  cx.imageSmoothingEnabled = false;
  return cv;
}

function scratch(w: number, h: number): CanvasRenderingContext2D {
  return surface(w, h).getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
}

/**
 * Turn one icon key's delivered PNGs into 32x32 canvases seated in their cell.
 *
 * Centred, not floored -- see the note at the top of the file. An item icon is
 * always drawn inside a box that has no floor, so the only thing that makes a
 * list of them look deliberate is that they all sit in the middle of the same
 * square.
 *
 * One key, all its frames, ONE measurement. The union of every frame's ink is
 * what is centred and scaled, and each frame is then sampled out of that same
 * union box -- so a frame contributes to where the group sits and keeps its own
 * position inside it. Seating the frames one at a time would centre each of
 * them separately, which is exactly the bug: the vessel would jolt sideways and
 * down on the frame the lid comes off.
 */
function seatGroup(key: string,
  imgs: { state: ItemFrameState | null; file: string; img: HTMLImageElement }[],
): { canvas: HTMLCanvasElement; entry: ItemArtEntry }[] {
  const prepared: {
    state: ItemFrameState | null; file: string; src: Pixels; b: Box; soft: number;
  }[] = [];

  for (const { state, file, img } of imgs) {
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    if (!sw || !sh) {
      note(key, file, 'error', 'decoded to a zero-sized image; using the generated icon');
      continue;
    }
    if (sw > MAX_SOURCE || sh > MAX_SOURCE) {
      note(key, file, 'error',
        `is ${sw}x${sh}, which is far larger than the ${ITEM_ART_SIZE}x${ITEM_ART_SIZE} the game `
        + 'expects; using the generated icon');
      continue;
    }
    if (sw !== ITEM_ART_SIZE || sh !== ITEM_ART_SIZE) {
      note(key, file, 'warn',
        `is ${sw}x${sh}, not ${ITEM_ART_SIZE}x${ITEM_ART_SIZE}; it has been fitted, which may cost detail`);
    }

    const cx = scratch(sw, sh);
    cx.drawImage(img, 0, 0);
    const src: Pixels = { w: sw, h: sh, data: cx.getImageData(0, 0, sw, sh).data };

    // Hard alpha, first thing. Everything below counts ink, and a fringe of
    // half-transparent anti-aliasing would widen every bounding box and wreck
    // every grid measurement.
    let soft = 0;
    for (let i = 3; i < src.data.length; i += 4) {
      const a = src.data[i]!;
      if (a === 0 || a === 255) continue;
      soft++;
      src.data[i] = a >= ALPHA_CUT ? 255 : 0;
    }
    if (soft > 0) {
      note(key, file, 'warn',
        `has ${soft} part-transparent pixel(s); the edge was flattened to hard alpha. `
        + 'Export with no anti-aliasing to control exactly where it lands.');
    }

    const b = inkBounds(src);
    if (!b) {
      note(key, file, 'error',
        'has no opaque pixels -- it is empty, or the file is truncated; using the generated icon');
      continue;
    }
    prepared.push({ state, file, src, b, soft });
  }
  if (!prepared.length) return [];

  // Frames of different canvas sizes cannot be registered against each other:
  // "the same place on the canvas" stops meaning anything. Say so and seat each
  // on its own rather than lining them up against a coordinate they do not share.
  const canvases = new Set(prepared.map((p) => `${p.src.w}x${p.src.h}`));
  const grouped = canvases.size === 1;
  if (!grouped && prepared.length > 1) {
    note(key, prepared.map((p) => p.file).join(', '), 'warn',
      `frames are on different canvas sizes (${[...canvases].join(', ')}), so they cannot be `
      + 'lined up against each other; each was centred on its own and the item will shift '
      + 'between frames. Draw every frame on one canvas.');
  }

  // The union: the box every frame is sampled out of.
  const u: Box | null = grouped
    ? prepared.reduce<Box>((a, p) => ({
      x0: Math.min(a.x0, p.b.x0), y0: Math.min(a.y0, p.b.y0),
      x1: Math.max(a.x1, p.b.x1), y1: Math.max(a.y1, p.b.y1),
    }), prepared[0]!.b)
    : null;

  const out: { canvas: HTMLCanvasElement; entry: ItemArtEntry }[] = [];
  let shared: Fit | null = null;

  for (const p of prepared) {
    const box: Box = u ?? p.b;
    let fit: Fit | null = shared;
    if (!fit) {
      const iw = box.x1 - box.x0 + 1, ih = box.y1 - box.y0 + 1;
      const scale = Math.min(1, ITEM_ART_SIZE / iw, ITEM_ART_SIZE / ih);
      if (scale < 1) {
        note(key, p.file, 'warn',
          `draws an item ${iw}x${ih}, which is bigger than the ${ITEM_ART_SIZE}x${ITEM_ART_SIZE} `
          + `cell; it was reduced to ${Math.round(scale * 100)}% and will lose crispness`);
      }
      const dw = Math.max(1, Math.round(iw * scale));
      const dh = Math.max(1, Math.round(ih * scale));
      const baseX = Math.round((ITEM_ART_SIZE - dw) / 2);
      const baseY = Math.round((ITEM_ART_SIZE - dh) / 2);
      // The phase is chosen once, on the first frame, which is the base drawing
      // -- the one the bag halves. Letting each frame pick its own would move
      // them a pixel apart for the sake of a percentage nobody sees.
      fit = { box, scale, dw, dh, baseX, baseY,
        shift: bestGridShift(p.src, box, scale, dw, dh, baseX, baseY) };
      if (u) shared = fit;
    }

    const surf = scratch(ITEM_ART_SIZE, ITEM_ART_SIZE);
    const dest = surf.createImageData(ITEM_ART_SIZE, ITEM_ART_SIZE);
    paint(p.src, fit.box, fit.scale, fit.dw, fit.dh,
      fit.baseX - fit.shift.x, fit.baseY - fit.shift.y, dest);
    surf.putImageData(dest, 0, 0);

    const placed = inkBounds({ w: ITEM_ART_SIZE, h: ITEM_ART_SIZE, data: dest.data })
      ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
    out.push({
      canvas: surf.canvas,
      entry: {
        key, state: p.state, file: p.file,
        sourceW: p.src.w, sourceH: p.src.h,
        ink: placed, scale: fit.scale, gridScore: gridScore(dest),
        gridShift: fit.shift, softPixels: p.soft,
      },
    });
  }
  return out;
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

/** How much of a drawing is made of flat 2x2 blocks: the number that decides
 *  whether the 16px list icon is a real halving or a majority vote. */
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
 * centred, and then not one block reduces cleanly. Ties go to no shift.
 */
function bestGridShift(src: Pixels, b: { x0: number; y0: number; x1: number; y1: number },
  scale: number, dw: number, dh: number, baseX: number, baseY: number): { x: number; y: number } {
  const probe = scratch(ITEM_ART_SIZE, ITEM_ART_SIZE);
  let best = { x: 0, y: 0 };
  let bestScore = -1, restScore = -1;
  for (const y of [0, 1]) {
    for (const x of [0, 1]) {
      const test = probe.createImageData(ITEM_ART_SIZE, ITEM_ART_SIZE);
      paint(src, b, scale, dw, dh, baseX - x, baseY - y, test);
      const s = gridScore(test);
      if (!x && !y) restScore = s;
      if (s > bestScore + 1e-9) { bestScore = s; best = { x, y }; }
    }
  }
  if ((best.x || best.y) && bestScore - restScore < 0.05) return { x: 0, y: 0 };
  return best;
}

/* -------------------------------------------------------- generated icons */

/**
 * The generated route.
 *
 * Every design is sixteen strings of sixteen characters, one character per 2x2
 * block of the 32px canvas. Working on the design grid rather than in pixels is
 * not a shortcut -- it is the same discipline the spec asks a person to follow,
 * enforced by construction: nothing drawn this way can be off the 2-pixel grid,
 * so every generated icon halves exactly to its list size and none of them can
 * ever turn up in `softIcons`.
 *
 * `.` is transparent. Every other character is a key into the design's palette,
 * merged over INK below, so a design only names the colours it actually uses.
 */

type Design = {
  rows: readonly string[];
  colors: Record<string, string>;
  /** Rows from this design row down have their glass ('v') filled with liquid
   *  ('l'). The four potions are one drawing at four levels. */
  fillFrom?: number;
  /** Individual cells stamped on after the rows, for sparkles and the like. */
  overlay?: readonly [number, number, string][];
};

/** Two inks: warm for organic and clay things, cool for metal and paper. Every
 *  design gets both, so a palette can reach for either without redeclaring it. */
const INK: Record<string, string> = {
  k: '#241a10',
  K: '#22202e',
  w: '#fffaea',
};

/* --- shared shapes ------------------------------------------------------ */

/** A capsule seen face on: the shape every vessel in the game is. Its palette
 *  is the only thing that changes between the six. */
const VESSEL = [
  '................',
  '.....kkkkkk.....',
  '...kkaaaaaakk...',
  '..kaaaaaaaaaak..',
  '..kwwaaaaaaaak..',
  '.kwwaaaaaaaaaak.',
  '.kaaaaaaaaabbbk.',
  '.kccccsssscccck.',
  '.kccccsssscccck.',
  '.kdddddddddeeek.',
  '.kddddddddeeeek.',
  '..kdddddeeeeek..',
  '..kddddeeeeeek..',
  '...kkeeeeeekk...',
  '.....kkkkkk.....',
  '................',
] as const;

/** A round-bottomed flask. The potions differ only in how far up the liquid
 *  goes, which is what tells four healing items apart in a list. */
const FLASK = [
  '.....kkkkkk.....',
  '.....kppppk.....',
  '.....kppppk.....',
  '.....kvvvvk.....',
  '.....kvvvvk.....',
  '....kkvvvvkk....',
  '...kkvvvvvvkk...',
  '..kkvvvvvvvvkk..',
  '..kvvvvvvvvvvk..',
  '.kwwvvvvvvvvvvk.',
  '.kwvvvvvvvvvvvk.',
  '.kvvvvvvvvvvvvk.',
  '.kvvvvvvvvvvvvk.',
  '..kvvvvvvvvvvk..',
  '..kkvvvvvvvvkk..',
  '...kkkkkkkkkk...',
] as const;

/**
 * A quill, for the two revives.
 *
 * Narrow, notched three times down each side, and left standing on a bare
 * quill. Every one of those is doing work: the first draft was a smooth
 * symmetric lens and read as a shell, and then as a diamond -- which was worse,
 * because the Thawcloth beside it in the bag is a diamond on purpose.
 */
const FEATHER = [
  '.......kk.......',
  '......kfsFk.....',
  '.....kffsFFk....',
  '....kfffsFFFk...',
  '.....kffsFFk....',
  '....kfffsFFFk...',
  '...kffffsFFFFk..',
  '....kfffsFFFk...',
  '...kffffsFFFFk..',
  '....kfffsFFFk...',
  '.....kffsFFk....',
  '......kfsFk.....',
  '.......ksk......',
  '.......ksk......',
  '.......ksk......',
  '.......kkk......',
] as const;

/** The last resort: a crate, tinted by category, for an icon key that has no
 *  design of its own yet. It is deliberately dull -- it should read as "art
 *  pending", not as a treasure chest. */
const CRATE = [
  '................',
  '................',
  '................',
  '....kkkkkkkk....',
  '...kppppppppk...',
  '..kkkkkkkkkkkk..',
  '..kppppppppppk..',
  '..kppppppppppk..',
  '..kppppppppppk..',
  '..kpppppPPPPPk..',
  '..kpppppPPPPPk..',
  '..kpppppPPPPPk..',
  '..kkkkkkkkkkkk..',
  '................',
  '................',
  '................',
] as const;

/* --- the roster --------------------------------------------------------- */

const DESIGNS: Record<string, Design> = {
  /* Vessels. Six capsules, told apart by colour and nothing else, because that
   * is how the player tells them apart on the shelf too. */
  vessel_field: { rows: VESSEL, colors: { a: '#c98b4a', b: '#9a6431', c: '#3a2c18', s: '#6a5330', d: '#e8dcc0', e: '#b6a988' } },
  vessel_fine: { rows: VESSEL, colors: { a: '#f0c860', b: '#c39a3c', c: '#40331a', s: '#7a6228', d: '#f6efdc', e: '#c8bda0' } },
  vessel_deep: { rows: VESSEL, colors: { a: '#4a7fbf', b: '#31578c', c: '#1a2740', s: '#3a5878', d: '#dce8f4', e: '#a4b6cc' } },
  vessel_dusk: { rows: VESSEL, colors: { a: '#7a5f9c', b: '#513c6d', c: '#241a33', s: '#463560', d: '#c4b6d4', e: '#8e82a4' } },
  vessel_net: { rows: VESSEL, colors: { a: '#48a08c', b: '#2f7062', c: '#173029', s: '#33604f', d: '#d8ece4', e: '#a0bcb0' } },
  vessel_warden: { rows: VESSEL, colors: { a: '#eae6d6', b: '#b2ae9e', c: '#8a6a28', s: '#d8b048', d: '#f8f6ee', e: '#c4c0b2' } },

  /* Healing. One flask, four fill levels -- the whole family reads as a
   * quantity at a glance, which no amount of separate drawings would do. */
  potion: { rows: FLASK, fillFrom: 10, colors: { p: '#8a6038', v: '#cfe0e4', l: '#e0587a' } },
  potion_strong: { rows: FLASK, fillFrom: 8, colors: { p: '#8a6038', v: '#cfe0e4', l: '#4f8fd8' } },
  potion_great: { rows: FLASK, fillFrom: 6, colors: { p: '#8a6038', v: '#cfe0e4', l: '#e8a838' } },
  potion_full: { rows: FLASK, fillFrom: 3, colors: { p: '#c8a040', v: '#cfe0e4', l: '#f2ece0' } },

  /* The stem runs the full height so the leaf, the stem and the berry are one
   * connected shape. Three floating pieces is what the first version was, and
   * at 16px it read as a smear with a green fleck above it. */
  berry_tonic: {
    rows: [
      '................',
      '.......ksk......',
      '..kkk..ksk......',
      '.kLLLkkksk......',
      '.kLLLLLksk......',
      '.kLLLLkksk......',
      '..kkkk.ksk......',
      '.....kkkkkkk....',
      '...kkrrrrrrrkk..',
      '..krwwrrrrrrrk..',
      '.krrwrrrrrrrrRk.',
      '.krrrrrrrrrrRRk.',
      '.krrrrrrrrrrRRk.',
      '.krrrrrrrrrRRRk.',
      '..kkrrrrrRRRkk..',
      '....kkkkkkkk....',
    ],
    colors: { L: '#6cae4a', s: '#7a5a30', r: '#d8465c', R: '#a02c46' },
  },

  /* Status cures. Five different objects on purpose: these are the five items
   * a player reaches for under pressure, and colour alone is not enough. */
  cure_poison: {
    rows: [
      '................',
      '...........kkk..',
      '.........kkLLLk.',
      '.......kkLLLLLk.',
      '.....kkLLLLLLLk.',
      '....kLLLLvLLLLk.',
      '...kLLLLvLLLLkk.',
      '..kLLLLvLLLLkk..',
      '..kLLLvLLLLkk...',
      '.kLLLvLLLLkk....',
      '.kLLvLLLLkk.....',
      '.kLvLLLkk.......',
      '.kvLLkk.........',
      '.kkkk...........',
      '................',
      '................',
    ],
    colors: { L: '#74c04e', v: '#3f7a30' },
  },
  /* A lidded pot, not a card: the lid is narrower than the body and sits proud
   * of it, which is the only cue at this size that says "something opens". */
  cure_burn: {
    rows: [
      '................',
      '................',
      '................',
      '....KKKKKKKK....',
      '...KllllllllK...',
      '..KllllllllllK..',
      '..KLLLLLLLLLLK..',
      '..KKKKKKKKKKKK..',
      '.KttttttttttttK.',
      '.KtwwttttttttTK.',
      '.KttttttttttTTK.',
      '.KttttttttttTTK.',
      '.KttttttttttTTK.',
      '.KKKKKKKKKKKKKK.',
      '................',
      '................',
    ],
    colors: { l: '#9fd8e4', L: '#6ba6bc', t: '#dcd2bc', T: '#a89c84' },
  },
  /* Cloth folded on the bias, hung from one corner, with its woven band across
   * the widest point. The first version was an axis-aligned rectangle and was
   * very nearly the same picture as the salve pot above -- two items that sit
   * next to each other in the same pocket. A shape on point cannot be confused
   * with a box at any size. */
  cure_freeze: {
    rows: [
      '................',
      '................',
      '.......KK.......',
      '......KccK......',
      '.....KccccK.....',
      '....KccccccK....',
      '...KccccccccK...',
      '..KccccccccccK..',
      '.KbbbbbbbbbbbbK.',
      '..KccccccccCCK..',
      '...KccccccCCK...',
      '....KccccCCK....',
      '.....KccCCK.....',
      '......KCCK......',
      '.......KK.......',
      '................',
    ],
    colors: { c: '#e4eef4', C: '#a8bccc', b: '#6fa8c8' },
  },
  cure_sleep: {
    rows: [
      '................',
      '.......KK.......',
      '......KmmK......',
      '.....KKmmKK.....',
      '....KbbbbbbK....',
      '...KbbbbbbbbK...',
      '..KbbwwbbbbbbK..',
      '..KbwbbbbbbbBK..',
      '.KbbbbbbbbbbBBK.',
      '.KbbbbbbbbbbBBK.',
      'KbbbbbbbbbbbBBBK',
      'KKKKKKKKKKKKKKKK',
      '.KmmmmmmmmmmmmK.',
      '.KKKKKKKKKKKKKK.',
      '......KmmK......',
      '.......KK.......',
    ],
    colors: { m: '#c8a848', b: '#e8c860', B: '#a8843a' },
  },
  cure_para: {
    rows: [
      '................',
      '......kkkk......',
      '.....krrrrk.....',
      '.....krrrrk.....',
      '..kk.krrrrk.kk..',
      '.krrkkrrrrkkrrk.',
      '.krrrrrrrrrrrrk.',
      '..kkkrrrrrrkkk..',
      '....krrrrrrk....',
      '....krrrrRRk....',
      '....krrrrRRk....',
      '.....krrRRk.....',
      '.....krrRRk.....',
      '......krRk......',
      '......kkkk......',
      '................',
    ],
    colors: { r: '#b98a52', R: '#8a6034' },
  },
  cure_all: {
    rows: [
      '................',
      '......kkkk......',
      '......kppk......',
      '.....kkppkk.....',
      '.....kvvvvk.....',
      '....kvvvvvvk....',
      '...kvvvvvvvvk...',
      '..kvvvvvvvvvvk..',
      '..kvvvvXXvvvvk..',
      '..kvvvvXXvvvvk..',
      '..kvvXXXXXXvvk..',
      '..kvvXXXXXXvvk..',
      '..kvvvvXXvvvvk..',
      '..kvvvvXXvvvvk..',
      '..kkvvvvvvvvkk..',
      '...kkkkkkkkkk...',
    ],
    colors: { p: '#8a6038', v: '#e8f0f4', X: '#48b47c' },
  },

  revive: { rows: FEATHER, colors: { f: '#e8dcc0', F: '#b0a488', s: '#8a7a58' } },
  revive_full: {
    rows: FEATHER,
    colors: { f: '#fbeec0', F: '#d8b858', s: '#a08430', g: '#fff4b0' },
    overlay: [[3, 1, 'g'], [13, 2, 'g'], [2, 4, 'g'], [14, 7, 'g'], [2, 9, 'g'], [12, 11, 'g']],
  },

  repel: {
    rows: [
      '..........ss....',
      '........ss......',
      '..........ss....',
      '........ss......',
      '................',
      '.......eee......',
      '......kiiik.....',
      '.....kiiiIIk....',
      '.....kiiiiIIk...',
      '....kiiiiiIIk...',
      '....kiiiiiiIIk..',
      '...kiiiiiiiIIk..',
      '...kiiiiiiiiIIk.',
      '..kiiiiiiiiiIIk.',
      '..kkkkkkkkkkkkk.',
      '................',
    ],
    colors: { s: '#9aa4b4', e: '#ffb454', i: '#8a6a48', I: '#5e4630' },
  },
  /* Ring, shank, two flukes: an anchor silhouette. The first version was a rope
   * with a closed loop at the bottom and read as a plunger. */
  escape: {
    rows: [
      '................',
      '......KrrK......',
      '......KrrK......',
      '......KRRK......',
      '.....KKmmKK.....',
      '....KmmKKmmK....',
      '....KmmKKmmK....',
      '.....KKmmKK.....',
      '......KmmK......',
      '......KmmK......',
      '..KK..KmmK..KK..',
      '.KmmK.KmmK.KmmK.',
      '.KmmKKKmmKKKmmK.',
      '.KmmmmmmmmmmmmK.',
      '..KmmmmmmmmmmK..',
      '...KKKKKKKKKK...',
    ],
    colors: { r: '#c8a878', R: '#96784e', m: '#b4bcc8' },
  },

  key_vellum: {
    rows: [
      '................',
      '................',
      '..KKKKKKKKKKK...',
      '..KbbbbbbbbbKp..',
      '..KbbbbbbbbbKp..',
      '..KbLLLLLLLbKp..',
      '..KbbbbbbbbbKp..',
      '..KbLLLLLLLbKp..',
      '..KbbbbbbbbbKp..',
      '..KbbbbbbbbbKp..',
      '..KbbbbbbbbbKp..',
      '..KbbbbbbbbbKp..',
      '..KKKKKKKKKKKp..',
      '...KKKKKKKKKKK..',
      '................',
      '................',
    ],
    colors: { b: '#8a4a3c', L: '#d8b060', p: '#e8e0cc' },
  },
  key_map: {
    rows: [
      '................',
      '................',
      '.KKKKKKKKKKKKKK.',
      '.KmmmmKmmmmKmmK.',
      '.KmmmmKmmmmKmmK.',
      '.KmmRRKmmmmKmmK.',
      '.KmmmRKRmmmKmmK.',
      '.KmmmmKmRRmKmmK.',
      '.KmmmmKmmmRKRmK.',
      '.KmmmmKmmmmKRmK.',
      '.KmmmmKmmmmKmmK.',
      '.KmmmmKmmmmKmmK.',
      '.KKKKKKKKKKKKKK.',
      '................',
      '................',
      '................',
    ],
    colors: { m: '#e0d4b0', R: '#c04838' },
  },
};

/** The crate colour for a category, when an icon key has no design yet. */
const CATEGORY_TINT: Record<string, [string, string]> = {
  vessel: ['#c08a52', '#8e6338'],
  healing: ['#d86a80', '#a04658'],
  statusHeal: ['#6cae7a', '#468253'],
  revive: ['#d8c060', '#a49038'],
  battle: ['#c86a48', '#94482f'],
  evolution: ['#9a7ac0', '#6d548c'],
  held: ['#7aa0c8', '#527494'],
  key: ['#c8a040', '#94741f'],
  disc: ['#8a94b4', '#5f6884'],
  berry: ['#d0607a', '#9a3e54'],
  treasure: ['#e0c060', '#ac9030'],
  fossil: ['#a89478', '#7a6a52'],
  exploration: ['#8ab070', '#5f8049'],
};

function generate(iconKey: string, category?: ItemCategory): HTMLCanvasElement {
  const design = DESIGNS[iconKey];
  if (design) return paintDesign(design);

  const tint = CATEGORY_TINT[category ?? ''] ?? ['#9aa4b4', '#6e7686'];
  return paintDesign({ rows: CRATE, colors: { p: tint[0], P: tint[1] } });
}

/**
 * Blow a design up into its 32x32 canvas.
 *
 * One design cell becomes one BLOCKxBLOCK square, which is what guarantees the
 * halving. Nothing here anti-aliases, blends or rounds: a cell is a rectangle
 * of one flat colour or it is nothing.
 */
function paintDesign(design: Design): HTMLCanvasElement {
  const cv = surface(ITEM_ART_SIZE, ITEM_ART_SIZE);
  const cx = cv.getContext('2d') as CanvasRenderingContext2D;
  const palette = { ...INK, ...design.colors };

  const grid = design.rows.map((row) => row.split(''));
  if (design.fillFrom !== undefined) {
    for (let y = design.fillFrom; y < grid.length; y++) {
      const row = grid[y]!;
      for (let x = 0; x < row.length; x++) if (row[x] === 'v') row[x] = 'l';
    }
  }
  for (const [x, y, ch] of design.overlay ?? []) {
    const row = grid[y];
    if (row && x >= 0 && x < row.length) row[x] = ch;
  }

  for (let y = 0; y < grid.length; y++) {
    const row = grid[y]!;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      const colour = palette[ch];
      if (!colour) continue;
      cx.fillStyle = colour;
      cx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
    }
  }
  return cv;
}
