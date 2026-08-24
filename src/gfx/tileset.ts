/**
 * Procedural tileset.
 *
 * Tiles are generated at boot rather than loaded from a PNG: it keeps the whole
 * world editable in one place, guarantees one palette across every tile, and
 * means map work is never blocked waiting on art.
 *
 * Each cell is 32x32 buffer pixels covering 16 logical units, so the set carries
 * four times the detail of the reference hardware while framing the same amount
 * of world. The constraints a hand-drawn set would obey still apply: a fixed
 * palette, hard edges, ordered dithering instead of gradients, and no tile that
 * cannot sit beside a copy of itself without an obvious seam.
 */

import { Rng } from '../core/rng.js';
import { DETAIL } from '../engine/renderer.js';

/** Logical size of a tile. */
export const TILE_SIZE = 16;
/** Actual size of a tile in buffer pixels. */
export const TILE_PX = TILE_SIZE * DETAIL;

/** Tile ids. 0 is reserved for "nothing drawn". */
export enum T {
  EMPTY = 0,
  GRASS,
  GRASS_TUFT,
  GRASS_FLOWERS,
  TALL_GRASS,
  PATH,
  PATH_EDGE_N,
  PATH_EDGE_S,
  STONE_FLOOR,
  WATER,
  WATER_DEEP,
  WATER_EDGE_N,
  SAND,
  TREE,
  TREE_SMALL,
  ROCK,
  BOULDER,
  FENCE_H,
  FENCE_V,
  SIGN,
  WALL_PLASTER,
  WALL_WINDOW,
  ROOF,
  ROOF_EDGE_L,
  ROOF_EDGE_R,
  ROOF_PEAK,
  DOOR,
  CLIFF_FACE,
  CLIFF_TOP,
  LEDGE,
  FLOOR_WOOD,
  FLOOR_RUG,
  WALL_INTERIOR,
  COUNTER,
  STAIRS,
  PUDDLE,
  BRIDGE,
  BRAMBLE,
  BOULDER_FREE,
  PLATE,
  PLATE_DOWN,
  // Waystation: red roof, healing crest.
  ROOF_RED,
  ROOF_RED_L,
  ROOF_RED_R,
  ROOF_RED_PEAK,
  EMBLEM_HEAL,
  // Provisioner: blue roof, supply crest.
  ROOF_BLUE,
  ROOF_BLUE_L,
  ROOF_BLUE_R,
  ROOF_BLUE_PEAK,
  EMBLEM_SHOP,
  // Shared pale base course, entrance and wall plates.
  CIVIC_WALL,
  CIVIC_DOOR,
  CIVIC_SIGN_HEAL,
  CIVIC_SIGN_SHOP,
  // Interior furniture.
  BED_HEAD,
  BED_FOOT,
  BOOKSHELF,
  TABLE,
  CHAIR,
  TELEVISION,
  PLANT,
  FRIDGE,
  SINK,
  STOVE,
  WINDOW_IN,
  CIVIC_FLOOR,
  // Houses, second generation. A town of one roof and one wall reads as one
  // building stamped out repeatedly, however good that building is.
  ROOF_SLATE_L,
  ROOF_SLATE,
  ROOF_SLATE_R,
  ROOF_HIP_L,
  ROOF_HIP,
  ROOF_HIP_R,
  ROOF_CHIMNEY,
  WALL_TIMBER,
  WALL_BRICK,
  WINDOW_SHUTTER,
  WINDOW_BOX,
  DOOR_PORCH,
  // Laboratory: wide, flat-topped, glazed. Nothing here is shared with a house.
  LAB_WALL,
  LAB_WINDOW,
  LAB_SIGN,
  LAB_DOOR_L,
  LAB_DOOR_R,
  LAB_ROOF,
  LAB_VENT,
  // Interiors.
  LAB_MACHINE,
  LAB_CONSOLE,
  LAB_TANK,
  WORKBENCH,
  FLOOR_LAB,
  SOFA,
  SHOP_SHELF,
  // Outdoor dressing.
  FLOWER_BED,
  LAMP_POST,
  COUNT,
}

/** Which colour ramp a roof is painted from. */
export type RoofHue = 'tan' | 'red' | 'blue' | 'slate' | 'moss';

/**
 * Palette.
 *
 * Tuned to the 2002-era handheld look the project is modelled on: pastel,
 * low-contrast, warm. The single most important property is that the *ground*
 * is light. Dark saturated turf makes every sprite standing on it look pasted
 * on; a pale, softly dappled field lets a hard 1px outline do the separating,
 * which is exactly how the reference art gets its clarity.
 *
 * Ramps are five steps, deep -> pale, and every material shares one light
 * direction (upper left) so nothing has to be re-lit per tile.
 */
export const PAL = {
  // Turf: pale sage, narrow spread. The dapple must whisper, not shout.
  grassDeep: '#5f9a52',
  grassDark: '#74ac66',
  grassMid: '#8cc47c',
  grassLight: '#a2d492',
  grassHi: '#b6dea6',
  grassTip: '#cceabc',

  // Canopies sit a full step darker than turf so a treeline reads as mass.
  leafDeep: '#26512a',
  leafDark: '#356e33',
  leafMid: '#4a8c40',
  leafLight: '#66ab52',
  leafHi: '#87c76a',
  leafTip: '#a8dd88',

  // Paths are warm sand, not brown mud.
  dirtDeep: '#9c7c46',
  dirtDark: '#bc9c60',
  dirtMid: '#d6bc84',
  dirtLight: '#e6d29e',
  dirtPale: '#f4e6c2',

  stoneDeep: '#5c5a66',
  stoneDark: '#78767f',
  stoneMid: '#9a98a0',
  stoneLight: '#b8b6bd',
  stonePale: '#d6d4d9',

  waterDeep: '#245c94',
  waterDark: '#2f74b4',
  waterMid: '#4290d0',
  waterLight: '#5faee4',
  waterPale: '#8fcbf0',
  waterFoam: '#d8f0fc',

  sandDark: '#c4a468',
  sandMid: '#e0c890',
  sandLight: '#eedcae',
  sandPale: '#f8eecc',

  trunkDeep: '#3a2718',
  trunkDark: '#553a22',
  trunkMid: '#74512f',
  trunkLight: '#946a41',

  woodDeep: '#5c3d24',
  woodDark: '#7c5533',
  woodMid: '#a07548',
  woodLight: '#c09864',
  woodPale: '#dcbc8c',

  // Building walls: cream plaster with a warm shadow side.
  plasterDark: '#c2b697',
  plasterMid: '#ddd4b9',
  plasterLight: '#efe8d2',
  plasterPale: '#faf6e8',

  // The default house roof: warm terracotta with visible slats.
  roofDeep: '#8e5426',
  roofDark: '#b26d33',
  roofMid: '#cc8a42',
  roofLight: '#e2a75c',
  roofPale: '#f2c481',

  // Waystation red. Loud on purpose: it is a landmark, not decoration.
  redDeep: '#8c1f24',
  redDark: '#b52d31',
  redMid: '#dc4247',
  redLight: '#ee6165',
  redPale: '#ff8f92',

  // Provisioner blue, the other half of the pair.
  blueDeep: '#1e4478',
  blueDark: '#2a5c9e',
  blueMid: '#3a79c6',
  blueLight: '#589ade',
  bluePale: '#84bcf0',

  // Slate. Cold and blue-grey, so a slate house next to a terracotta one reads
  // as a different *material* and not as the same roof with a filter on it.
  slateDeep: '#2f3a4a',
  slateDark: '#43526a',
  slateMid: '#5d7090',
  slateLight: '#7c8fae',
  slatePale: '#a3b4cc',

  // Weathered moss green, for the older cottages.
  mossDeep: '#2e3d24',
  mossDark: '#445a33',
  mossMid: '#5e7845',
  mossLight: '#7d975e',
  mossPale: '#a2b880',

  // Brick, with a mortar that is pale enough to draw the courses on its own.
  brickDeep: '#5e2c20',
  brickDark: '#7c3d2c',
  brickMid: '#9a5140',
  brickLight: '#b46a54',
  brickPale: '#cc8a72',
  mortar: '#d8cdb8',

  // Painted metal: laboratory casings, shop fittings, lamp columns.
  steelDeep: '#3d4658',
  steelDark: '#5c6270',
  steelMid: '#98a0ae',
  steelLight: '#c6ccd8',
  steelPale: '#e8ecf2',
  panelInk: '#2b3040',

  // The white base course both civic buildings stand on.
  trimShade: '#a8adb8',
  trimMid: '#ccd2dc',
  trimLight: '#e6ebf2',
  trimPale: '#fbfdff',

  glass: '#6f9ec4',
  glassLight: '#9cc6e2',
  glassHi: '#d6ecf8',

  outline: '#20242e',
  shadow: 'rgba(24,28,38,0.26)',

  // Contact shadow under furniture. Translucent on purpose: furniture is drawn
  // over whatever floor the map has, so its shadow has to tint boards, civic
  // tile and turf alike rather than stamp one colour of its own.
  contact: 'rgba(38,32,34,0.34)',
  contactSoft: 'rgba(38,32,34,0.15)',
} as const;

type Px = (x: number, y: number, color: string) => void;

/** 4x4 ordered dither; texture here has to come from patterning, not blending. */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** One step darker, for the shaded edge of a small object. */
function mixDown(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function dither(x: number, y: number, level: number): boolean {
  return BAYER[y & 3]![x & 3]! < level * 16;
}

/**
 * Which tiles get alternate cuts, and how many.
 *
 * A single grass tile repeated across a field reads as a grid, no matter how
 * good the tile is -- the eye locks onto the repeat long before it notices the
 * blades. Alternates cost nothing at this scale and are the difference between
 * a lawn and a texture.
 */
const VARIED: Partial<Record<number, number>> = {
  [T.GRASS]: 4,
  [T.GRASS_TUFT]: 3,
  [T.TALL_GRASS]: 3,
  [T.PATH]: 4,
  [T.SAND]: 3,
  [T.STONE_FLOOR]: 3,
  [T.TREE_SMALL]: 2,
  [T.WATER]: 2,
  [T.FLOOR_WOOD]: 3,
  [T.CLIFF_FACE]: 3,
  [T.BRAMBLE]: 2,
  // Appended rather than filed with the other ground tiles on purpose: the
  // alternates are painted in this order from one shared Rng, so inserting a
  // key above an existing one repaints every tile after it.
  [T.TREE]: 3,
  [T.CLIFF_TOP]: 3,
  // Not texture, but the same mechanism used for a different reason: one door
  // tile serves every enterable house in the world, so without alternates every
  // frontage in every town has the identical front door.
  [T.DOOR_PORCH]: 3,
};

/**
 * Which tiles cycle, and how many frames they cycle through.
 *
 * The era animated water by rotating a few entries of the palette, which costs
 * nothing on that hardware and is not something a canvas can do. The equivalent
 * here is to bake the frames as extra atlas cells and pick between them by the
 * clock -- same result on screen, same handful of frames, and the map renderer
 * does not have to learn anything: it already asks the tileset for a source
 * rectangle every time it draws a tile.
 *
 * Keep these counts small. Every frame is a whole extra cell of every variant.
 */
const ANIMATED: Partial<Record<number, number>> = {
  [T.WATER]: 4,
  [T.WATER_EDGE_N]: 4,
  [T.WATER_DEEP]: 4,
};

/** How long one frame of an animated tile is held, in milliseconds. */
const FRAME_MS = 190;

/** Wall clock for the animation, guarded so a test host without one still runs. */
function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Offset folded into every noise lookup while a variant is being drawn, so the
 * alternates differ in their texture and not only in their scattered detail.
 */
let variantSeed = 0;

/**
 * Which frame of an animated tile is being drawn, for the tile functions to
 * read. Threaded through a module variable rather than an argument for the same
 * reason `variantSeed` is: every tile function would otherwise have to grow a
 * parameter it does not use.
 */
let animFrame = 0;

/** Deterministic value noise, so texture varies without looking like static. */
function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + (seed + variantSeed * 977) * 1442695040) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Smooth value noise whose field repeats exactly every TILE_PX pixels.
 *
 * Both properties are load-bearing. Smooth, because block-quantised noise
 * paints a visible rectangular grid over any large field. Wrapping, because a
 * tile whose texture does not meet itself at the seam turns a lawn into graph
 * paper the moment it is repeated.
 *
 * cell must divide TILE_PX; lattice indices wrap, and the corners are blended
 * with a smoothstep so there are no lattice creases either.
 */
function wrapNoise(x: number, y: number, cell: number, seed = 0): number {
  const period = TILE_PX / cell;
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = (x % cell) / cell, fy = (y % cell) / cell;
  const at = (ix: number, iy: number): number =>
    hash2(((ix % period) + period) % period, ((iy % period) + period) % period, seed);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = at(gx, gy), b = at(gx + 1, gy), c = at(gx, gy + 1), d = at(gx + 1, gy + 1);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

/** Position noise that must not shift between variants. */
function placeHash(x: number, y: number, seed = 0): number {
  let h = (x * 2654435761 + y * 40503 + seed * 2246822519) | 0;
  h = (h ^ (h >>> 15)) * 2246822519 | 0;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

export class Tileset {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  readonly columns: number;

  /** For each varied tile id, the atlas cells that may stand in for it. */
  private variants = new Map<number, number[]>();
  /** For each animated tile id, [variant][frame] -> atlas cell. */
  private frames = new Map<number, number[][]>();
  private cellCount: number;

  constructor(seed = 'kinbound-tiles') {
    this.columns = 8;

    // Base cells first, then the alternates appended after them, so `src`
    // stays a plain index lookup and tile ids keep their meaning.
    let cells = T.COUNT;
    for (const key of Object.keys(VARIED)) {
      const id = Number(key);
      const n = VARIED[id]!;
      const list = [id];
      for (let i = 1; i < n; i++) list.push(cells++);
      this.variants.set(id, list);
    }
    // Then the animation frames, last of all. Frame zero of every variant is
    // the cell already allocated above, so a tile that stops animating still
    // has its ordinary cell in its ordinary place.
    for (const key of Object.keys(ANIMATED)) {
      const id = Number(key);
      const n = ANIMATED[id]!;
      const base = this.variants.get(id) ?? [id];
      this.frames.set(id, base.map((cell) => {
        const row = [cell];
        for (let f = 1; f < n; f++) row.push(cells++);
        return row;
      }));
    }
    this.cellCount = cells;

    const rows = Math.ceil(cells / this.columns);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.columns * TILE_PX;
    this.canvas.height = rows * TILE_PX;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('tileset: no 2d context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.build(new Rng(seed));
  }

  /**
   * Source rect for a tile, choosing an alternate from the world position.
   * Hashing the position rather than rolling means the same map always looks
   * the same, which matters for screenshots, tests and player memory alike.
   */
  srcFor(id: number, tx: number, ty: number): { x: number; y: number } {
    const list = this.variants.get(id);
    const anim = this.frames.get(id);
    const pick = list
      ? Math.floor(placeHash(tx, ty, 7777) * list.length) % list.length
      : 0;
    if (anim) {
      // One clock for the whole surface. Offsetting the phase per tile would
      // hide the loop, and would also stop a pond reading as one body of water
      // -- the era cycled the palette, so every tile turned over together.
      const row = anim[pick] ?? anim[0]!;
      const f = Math.floor(now() / FRAME_MS) % row.length;
      return this.src(row[f]!);
    }
    if (!list) return this.src(id);
    return this.src(list[pick]!);
  }

  /** Source rectangle for a tile id, in buffer pixels. */
  src(id: number): { x: number; y: number } {
    return {
      x: (id % this.columns) * TILE_PX,
      y: Math.floor(id / this.columns) * TILE_PX,
    };
  }

  private build(rng: Rng): void {
    const paint = (cell: number, id: number, variant: number, frame = 0) => {
      const { x: ox, y: oy } = this.src(cell);
      /**
       * One pixel of the *authoring* grid, which is half the buffer's.
       *
       * The reference hardware drew a 16x16 tile at one pixel per unit. We
       * render at twice that density, and drawing tiles at full buffer
       * resolution is exactly what made the world look smooth and modern
       * rather than like the era it is quoting: fine noise where there should
       * be blocks, hairlines where there should be edges.
       *
       * Snapping every write to a 2x2 block puts the art back on the GBA's
       * grid while keeping the crisp integer scaling. Nothing else about the
       * tile code has to change -- last write still wins, so outlines drawn
       * after fills still land on top.
       */
      const px: Px = (x, y, color) => {
        if (x < 0 || y < 0 || x >= TILE_PX || y >= TILE_PX) return;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(ox + x - (x % DETAIL), oy + y - (y % DETAIL), DETAIL, DETAIL);
      };
      const fill = (color: string) => {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(ox, oy, TILE_PX, TILE_PX);
      };
      variantSeed = variant;
      animFrame = frame;
      this.drawTile(id, px, fill, rng);
      variantSeed = 0;
      animFrame = 0;
    };

    for (let id = 1; id < T.COUNT; id++) paint(id, id, 0);
    for (const [id, list] of this.variants) {
      for (let i = 1; i < list.length; i++) paint(list[i]!, id, i);
    }
    // Frames last, so adding an animation does not repaint everything that used
    // to come after it: the alternates are drawn from one shared Rng, in order.
    for (const [id, table] of this.frames) {
      for (let v = 0; v < table.length; v++) {
        for (let f = 1; f < table[v]!.length; f++) paint(table[v]![f]!, id, v, f);
      }
    }
    void this.cellCount;
  }

  private drawTile(id: number, px: Px, fill: (c: string) => void, rng: Rng): void {
    switch (id) {
      case T.GRASS: this.grass(px, fill, rng, 0); break;
      case T.GRASS_TUFT: this.grass(px, fill, rng, 1); break;
      case T.GRASS_FLOWERS: this.grass(px, fill, rng, 2); break;
      case T.TALL_GRASS: this.tallGrass(px, fill, rng); break;
      case T.PATH: this.path(px, fill, rng); break;
      case T.PATH_EDGE_N: this.pathEdge(px, fill, rng, 'n'); break;
      case T.PATH_EDGE_S: this.pathEdge(px, fill, rng, 's'); break;
      case T.STONE_FLOOR: this.stoneFloor(px, fill, rng); break;
      case T.WATER: this.water(px, fill, rng, false); break;
      case T.WATER_DEEP: this.deepWater(px, fill, rng); break;
      case T.WATER_EDGE_N: this.water(px, fill, rng, true); break;
      case T.SAND: this.sand(px, fill, rng); break;
      case T.TREE: this.tree(px, fill, rng, false); break;
      case T.TREE_SMALL: this.tree(px, fill, rng, true); break;
      case T.ROCK: this.rock(px, fill, rng, false, true); break;
      case T.BOULDER: this.rock(px, fill, rng, true, true); break;
      case T.BOULDER_FREE: this.rock(px, fill, rng, true, false); break;
      case T.FENCE_H: this.fence(px, fill, rng, true); break;
      case T.FENCE_V: this.fence(px, fill, rng, false); break;
      case T.SIGN: this.sign(px, fill, rng); break;
      case T.WALL_PLASTER: this.wall(px, fill, rng, false); break;
      case T.WALL_WINDOW: this.wall(px, fill, rng, true); break;
      case T.ROOF: this.roof(px, fill, 'mid'); break;
      case T.ROOF_EDGE_L: this.roof(px, fill, 'left'); break;
      case T.ROOF_EDGE_R: this.roof(px, fill, 'right'); break;
      case T.ROOF_PEAK: this.roof(px, fill, 'peak'); break;
      case T.DOOR: this.door(px, fill, rng); break;
      case T.CLIFF_FACE: this.cliff(px, fill, rng, false); break;
      case T.CLIFF_TOP: this.cliff(px, fill, rng, true); break;
      case T.LEDGE: this.ledge(px, fill, rng); break;
      case T.FLOOR_WOOD: this.woodFloor(px, fill, rng); break;
      case T.FLOOR_RUG: this.rug(px, fill); break;
      case T.WALL_INTERIOR: this.interiorWall(px, fill, rng); break;
      case T.COUNTER: this.counter(px); break;
      case T.STAIRS: this.stairs(px, fill); break;
      case T.PUDDLE: this.puddle(px, fill, rng); break;
      case T.BRIDGE: this.bridge(px, fill, rng); break;
      case T.BRAMBLE: this.bramble(px, fill, rng); break;
      case T.PLATE: this.plate(px, fill, false); break;
      case T.PLATE_DOWN: this.plate(px, fill, true); break;
      case T.ROOF_RED: this.roof(px, fill, 'mid', 'red'); break;
      case T.ROOF_RED_L: this.roof(px, fill, 'left', 'red'); break;
      case T.ROOF_RED_R: this.roof(px, fill, 'right', 'red'); break;
      case T.ROOF_RED_PEAK: this.roof(px, fill, 'peak', 'red'); break;
      case T.EMBLEM_HEAL: this.emblem(px, fill, 'heal'); break;
      case T.ROOF_BLUE: this.roof(px, fill, 'mid', 'blue'); break;
      case T.ROOF_BLUE_L: this.roof(px, fill, 'left', 'blue'); break;
      case T.ROOF_BLUE_R: this.roof(px, fill, 'right', 'blue'); break;
      case T.ROOF_BLUE_PEAK: this.roof(px, fill, 'peak', 'blue'); break;
      case T.EMBLEM_SHOP: this.emblem(px, fill, 'shop'); break;
      case T.CIVIC_WALL: this.civicWall(px, fill, 'plain'); break;
      case T.CIVIC_DOOR: this.civicWall(px, fill, 'door'); break;
      case T.CIVIC_SIGN_HEAL: this.civicWall(px, fill, 'heal'); break;
      case T.CIVIC_SIGN_SHOP: this.civicWall(px, fill, 'shop'); break;
      case T.BED_HEAD: this.bed(px, true); break;
      case T.BED_FOOT: this.bed(px, false); break;
      case T.BOOKSHELF: this.bookshelf(px); break;
      case T.TABLE: this.table(px); break;
      case T.CHAIR: this.chair(px); break;
      case T.TELEVISION: this.television(px); break;
      case T.PLANT: this.plant(px); break;
      case T.FRIDGE: this.fridge(px); break;
      case T.SINK: this.sink(px); break;
      case T.STOVE: this.stove(px); break;
      case T.WINDOW_IN: this.interiorWindow(px, fill, rng); break;
      case T.CIVIC_FLOOR: this.civicFloor(px, fill); break;
      case T.ROOF_SLATE_L: this.shingleRoof(px, fill, 'left', 'slate'); break;
      case T.ROOF_SLATE: this.shingleRoof(px, fill, 'mid', 'slate'); break;
      case T.ROOF_SLATE_R: this.shingleRoof(px, fill, 'right', 'slate'); break;
      case T.ROOF_HIP_L: this.hipRoof(px, fill, 'left', 'moss'); break;
      case T.ROOF_HIP: this.hipRoof(px, fill, 'mid', 'moss'); break;
      case T.ROOF_HIP_R: this.hipRoof(px, fill, 'right', 'moss'); break;
      case T.ROOF_CHIMNEY: this.chimney(px, fill); break;
      case T.WALL_TIMBER: this.timberWall(px, fill); break;
      case T.WALL_BRICK: this.brickWall(px, fill); break;
      case T.WINDOW_SHUTTER: this.shutteredWindow(px, fill); break;
      case T.WINDOW_BOX: this.windowBox(px, fill); break;
      case T.DOOR_PORCH: this.porchDoor(px, fill, rng); break;
      case T.LAB_WALL: this.labWall(px, fill, 'plain'); break;
      case T.LAB_WINDOW: this.labWall(px, fill, 'window'); break;
      case T.LAB_SIGN: this.labWall(px, fill, 'sign'); break;
      case T.LAB_DOOR_L: this.labDoor(px, fill, false); break;
      case T.LAB_DOOR_R: this.labDoor(px, fill, true); break;
      case T.LAB_ROOF: this.labRoof(px, fill, false); break;
      case T.LAB_VENT: this.labRoof(px, fill, true); break;
      case T.LAB_MACHINE: this.labMachines(px); break;
      case T.LAB_CONSOLE: this.labConsole(px); break;
      case T.LAB_TANK: this.specimenTank(px); break;
      case T.WORKBENCH: this.workbench(px); break;
      case T.FLOOR_LAB: this.labFloor(px, fill); break;
      case T.SOFA: this.sofa(px); break;
      case T.SHOP_SHELF: this.shopShelf(px); break;
      case T.FLOWER_BED: this.flowerBed(px); break;
      case T.LAMP_POST: this.lampPost(px); break;
      default: fill('#ff00ff'); break; // loud, so a missing tile is obvious
    }
  }

  /* ------------------------------------------------------------- ground */

  /**
   * Wraps the buffer writer as an authoring-grid writer: one unit, one block.
   *
   * Every tile below is designed at 16x16, the size the reference hardware
   * actually drew. Writing at buffer resolution is what made the ground read as
   * static rather than as texture.
   */
  private unit(px: Px): Px {
    return (x, y, c) => px(x * DETAIL, y * DETAIL, c);
  }

  /**
   * The dark line where a piece of furniture meets the floor.
   *
   * Furniture is drawn on the overlay layer and leaves its background
   * transparent, so the floor under a chair is the map's floor and not a colour
   * baked into the chair. That is what stops a sofa sitting in a cream square
   * on a white laboratory floor -- but it also costs the object its footing:
   * with real floor showing right up to the outline, the thing reads as a
   * sticker hovering above the room.
   *
   * So every object gets its shadow back explicitly, as two translucent rows
   * along the base. Translucent, because it has to darken boards, tile and turf
   * alike; two rows, because a single hard one reads as a painted stripe. The
   * lower row is inset by a pixel so the spill has a shape.
   *
   * Rows past the bottom of the cell are dropped by `px`, so passing y = 15 is
   * a legal way to ask for one row.
   */
  private footShadow(P: Px, x0: number, x1: number, y: number): void {
    for (let x = x0; x <= x1; x++) P(x, y, PAL.contact);
    for (let x = x0 + 1; x < x1; x++) P(x, y + 1, PAL.contactSoft);
  }

  /**
   * Base turf shared by every grassy tile.
   *
   * A fixed diagonal weave rather than noise. The reference art builds ground
   * out of a small repeating motif; noise at sixteen pixels across reads as
   * static, and every sprite standing on it then has to fight the texture to
   * be seen. The weave is (3x + 5y) mod 16, which wraps exactly at the tile
   * edge, so a field of these has no seams and no visible grid.
   */
  private turf(px: Px, fill: (c: string) => void, seed: number): void {
    fill(PAL.grassMid);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const d = (x * 3 + y * 5 + seed * 7) % 16;
        if (d === 1) P(x, y, PAL.grassLight);
        else if (d === 9) P(x, y, PAL.grassDark);
      }
    }
  }

  /** A tuft: three blades with lit tips. The smallest mark that reads as grass. */
  private tuft(P: Px, x: number, y: number): void {
    P(x, y, PAL.grassDeep);
    P(x + 1, y, PAL.grassDark);
    P(x + 2, y, PAL.grassDeep);
    P(x, y - 1, PAL.grassHi);
    P(x + 2, y - 1, PAL.grassTip);
  }

  private grass(px: Px, fill: (c: string) => void, rng: Rng, variant: number): void {
    this.turf(px, fill, 3);
    const P = this.unit(px);

    // Plain turf gets almost nothing; the tufted cut carries the detail. Two
    // cuts of the same field is what breaks up the grid without either of them
    // becoming busy on its own.
    const count = variant >= 1 ? 5 : 2;
    for (let i = 0; i < count; i++) {
      this.tuft(P, 1 + rng.below(TILE_SIZE - 4), 3 + rng.below(TILE_SIZE - 4));
    }

    if (variant === 2) {
      // Flower clumps, as in the reference towns: four petals around a pale
      // centre, with one shaded pixel underneath so they lift off the turf.
      const petals = ['#f0e8c8', '#f2c44c', '#e8788c', '#c8a8e8'];
      for (let i = 0; i < 3; i++) {
        const fx = 2 + rng.below(TILE_SIZE - 4);
        const fy = 3 + rng.below(TILE_SIZE - 5);
        const c = petals[rng.below(petals.length)]!;
        P(fx, fy - 1, c); P(fx - 1, fy, c); P(fx + 1, fy, c); P(fx, fy + 1, c);
        P(fx, fy, '#fff6d0');
        P(fx, fy + 2, PAL.grassDeep);
      }
    }
  }

  /**
   * Tall grass: one clump to a tile, standing on the field's own turf.
   *
   * The cut before this one filled the cell edge to edge and tiled seamlessly,
   * which is the right answer to the wrong question. It made a technically
   * flawless field that read as a dark rectangle laid over the map -- a lawn,
   * not grass you walk between. The reference games have never done that: a
   * tall grass tile there is a *discrete tuft* with ground showing on every
   * side of it, and a patch is a scatter of them rather than a mass.
   *
   * So the tile is a single clump rooted at the bottom of the cell, two units
   * of turf clear at each side and four above, giving every clump a visible gap
   * from its neighbours in both directions. The turf under it is the ordinary
   * field weave, unchanged, so the gaps are the same grass as the tile next
   * door and a patch sits *on* the map instead of being pasted over it.
   *
   * One constraint shapes the rest. Rows 6-15 of this cell are repainted in
   * front of a character wading through it (TileMap.renderGrassFrontRow and
   * renderGrassSkirt), so anything drawn in that band lands on the player as
   * well as on the ground -- and pale lawn there prints a stripe of turf across
   * their chest. Hence the shading: the ground between the clumps is lit only
   * in the top rows, the ones that stay behind the player, and falls away into
   * the tuft's own shadow from the wading line down. That shadow is what gives
   * each clump its footing anyway, so the constraint and the drawing want the
   * same thing.
   */
  private tallGrass(px: Px, fill: (c: string) => void, rng: Rng): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    const h = (x: number, y: number, seed: number) => hash2(x, y, seed);

    this.turf(px, fill, 3);

    // Clump bounds. L..R is the tuft; everything outside it is ground.
    //
    // Nudged and squatted per alternate: three cuts of the same clump in the
    // same place is still a stamp, and a patch of stamps is a grid however
    // good the stamp is. The nudge is kept to a unit so the gap to the clump
    // next door never closes on one side.
    const nudge = Math.floor(h(0, 0, 91) * 3) - 1;
    const squat = Math.floor(h(1, 0, 93) * 2);
    const L = 2 + nudge, R = 13 + nudge, ROOT = 14;
    const mid = (L + R) / 2;
    const half = (R - L) / 2;

    // The clump is composed into a grid first, not painted straight down: the
    // shadow has to know where the blades ended up.
    const cell: (string | null)[] = new Array(S * S).fill(null);
    const put = (x: number, y: number, c: string) => {
      if (x < L || x > R || y < 0 || y >= S) return;
      cell[y * S + x] = c;
    };

    // Understory: the dark, dense heart of the tuft the blades rise out of,
    // striped by column so it reads as packed stems rather than as a mound.
    for (let y = 10; y <= ROOT; y++) {
      for (let x = L; x <= R; x++) {
        const stem = (x * 3 + Math.floor(h(x, 0, 13) * 3)) % 4;
        put(x, y, y >= ROOT - 1 || stem === 0 ? PAL.leafDeep
          : h(x, y, 5) > 0.55 ? PAL.leafDark : PAL.leafDeep);
      }
    }

    /** One blade, drawn root upward, leaning as it rises. */
    const blade = (bx: number, by: number, len: number, lean: number, ramp: string[]) => {
      for (let i = 0; i < len; i++) {
        const y = by - i;
        if (y < 0) break;
        const x = bx + Math.round((lean * i) / 3);
        put(x, y, ramp[i === len - 1 ? 3 : i === len - 2 ? 2 : i * 2 > len ? 1 : 0]!);
      }
    };

    const back = [PAL.leafDeep, PAL.leafDark, PAL.leafMid, PAL.leafLight];
    const front = [PAL.leafDark, PAL.leafMid, PAL.leafLight, PAL.leafHi];

    // Back layer: one blade per column, tallest at the crown and falling away
    // at the shoulders, leaning outward. That arch is the tuft's silhouette,
    // and it is the only thing that tells a player where one clump stops.
    // The shoulders stay long on purpose: the whole clump has to be standing by
    // the wading line at row 6, or the band repainted in front of a character
    // has holes in it exactly where their legs are.
    for (let x = L; x <= R; x++) {
      const t = (x - mid) / half;
      const len = 7 - squat + Math.round((1 - t * t) * 4) + Math.floor(h(x, 3, 41) * 2);
      blade(x, ROOT - Math.floor(h(x, 7, 43) * 2), len, t < -0.3 ? -1 : t > 0.3 ? 1 : 0,
        (x & 1) === 0 ? back : front);
    }
    // Front layer: shorter, lit, leaning the other way so the two cross. One
    // layer alone is a comb; two crossing layers are a clump.
    for (let x = L + 1; x <= R; x += 2) {
      const t = (x - mid) / half;
      const len = 4 + Math.round((1 - t * t) * 4) + Math.floor(h(x, 11, 47) * 2);
      blade(x, ROOT, len, t < 0 ? 1 : -1, front);
    }

    // Two seed heads catching the light, up in the crown where they show.
    for (let i = 0; i < 2; i++) {
      const sx = L + 2 + rng.below(R - L - 3);
      const sy = 4 + rng.below(5);
      put(sx, sy, PAL.grassHi);
      put(sx, sy - 1, PAL.grassTip);
    }

    // The tuft's own shadow on the ground around it.
    //
    // Cast from the clump's silhouette rather than laid down as a band across
    // the bottom of the cell: a band is a rectangle, and a field of rectangles
    // is the checkerboard this tile is trying to stop being. So each column
    // remembers how high its blades reach, and a patch of ground is shaded by
    // how close it is to a column standing over it -- which leaves the turf
    // above the crown lit, darkens the slot between two clumps from both sides
    // evenly, and puts the deepest shade right where the stems meet the earth.
    const skyline = new Array<number>(S).fill(S);
    for (let x = 0; x < S; x++) {
      for (let y = 0; y < S; y++) if (cell[y * S + x]) { skyline[x] = y; break; }
    }
    const REACH = 3;
    /** Row the renderer starts painting this tile in front of a character. */
    const WADE = 6;
    const ramp = [PAL.grassMid, PAL.grassDark, PAL.grassDeep];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (cell[y * S + x]) continue;
        let near = REACH + 1;
        for (let dx = -REACH; dx <= REACH; dx++) {
          const c = x + dx;
          if (c < 0 || c >= S) continue;
          if (y >= skyline[c]! && Math.abs(dx) < near) near = Math.abs(dx);
        }
        // 0 columns away is the gap inside the tuft, REACH away is open field.
        let f = near > REACH ? 0 : (1 - near / (REACH + 1)) * 2;
        // ...but nothing below the wading line may be left at full turf
        // brightness whatever the silhouette does, because that band is
        // repainted in front of the player (GRASS_BLADE_TOP in TileMap) and a
        // pale pixel there prints a stripe of lawn across their chest. In
        // practice this only catches the few units the shoulders leave open.
        if (y >= WADE) f = Math.max(f, 1);
        if (f <= 0) continue;
        f = Math.min(1.999, f);
        const i0 = Math.floor(f);
        cell[y * S + x] = dither(x, y, f - i0) ? ramp[i0 + 1]! : ramp[i0]!;
      }
    }

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const c = cell[y * S + x];
        if (c) P(x, y, c);
      }
    }
  }

  /**
   * Path.
   *
   * Warm sand rather than brown mud, with a weave running the other way from
   * the turf so a road reads as a different *material* and not just a different
   * colour.
   */
  private path(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.dirtMid);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const d = (x * 5 + y * 3) % 16;
        if (d === 2) P(x, y, PAL.dirtLight);
        else if (d === 11) P(x, y, PAL.dirtDark);
      }
    }
    // Grit: a pale grain with its own shadow, three to a tile.
    for (let i = 0; i < 3; i++) {
      const bx = 1 + rng.below(TILE_SIZE - 2);
      const by = 1 + rng.below(TILE_SIZE - 2);
      P(bx, by, PAL.dirtPale);
      P(bx, by + 1, PAL.dirtDeep);
    }
  }

  /**
   * Where a path meets grass.
   *
   * A dithered fringe rather than a straight cut: two rows of alternating turf
   * and sand is the oldest trick in the era's tilesets and still the one that
   * stops a road looking like tape stuck on a lawn.
   */
  private pathEdge(px: Px, fill: (c: string) => void, rng: Rng, side: 'n' | 's'): void {
    this.path(px, fill, rng);
    const P = this.unit(px);
    const rowOf = (i: number) => (side === 'n' ? i : TILE_SIZE - 1 - i);

    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, rowOf(0), PAL.grassMid);
      if ((x * 3) % 5 !== 0) P(x, rowOf(1), PAL.grassDark);
      // The lip of the sand catches the light just under the turf.
      P(x, rowOf(2), x % 3 === 0 ? PAL.dirtPale : PAL.dirtLight);
    }
  }

  private stoneFloor(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.stoneMid);
    // Half-offset brick courses, 16x8 buffer pixels each.
    for (let y = 0; y < TILE_PX; y++) {
      const course = Math.floor(y / 8);
      const offset = (course % 2) * 8;
      for (let x = 0; x < TILE_PX; x++) {
        const bx = (x + offset) % 16;
        const by = y % 8;
        const n = hash2(Math.floor((x + offset) / 16), course, 13);
        let c: string = n > 0.66 ? PAL.stoneLight : n < 0.33 ? PAL.stoneDark : PAL.stoneMid;
        if (by === 0 || bx === 0) c = PAL.stoneDark;
        else if (by === 1) c = PAL.stoneLight;
        else if (by === 7) c = PAL.stoneDark;
        px(x, y, c);
      }
    }
    for (let i = 0; i < 4; i++) px(rng.below(TILE_PX), rng.below(TILE_PX), PAL.stoneDeep);
  }

  /* -------------------------------------------------------------- water */

  /**
   * Shallow water.
   *
   * The old version interfered two sine waves, which is cheap but lays down a
   * perfectly regular diagonal lattice -- a pond tiled with it reads as a
   * chequerboard. This uses wrapping noise for the body and reserves the only
   * regular structure for horizontal glitter lines, which is what actually
   * reads as a water surface seen from above.
   */
  private water(px: Px, fill: (c: string) => void, rng: Rng, edge: boolean): void {
    fill(PAL.waterMid);
    const N = TILE_PX;
    const TAU = Math.PI * 2;
    // Whole periods per cell and a phase that closes over the loop: the swell
    // has to be continuous from tile to tile and land back where it started on
    // the last frame, or a pond flickers instead of moving.
    const nf = ANIMATED[T.WATER] ?? 1;
    const phase = (animFrame / nf) * TAU;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        // The body of the surface is fixed. Only the swell over it moves --
        // animating the noise as well makes the whole pond swim about.
        const n = wrapNoise(x, y, 16, 61) * 0.6 + wrapNoise(x, y, 8, 23) * 0.4;
        const w = Math.sin((x / N) * TAU + (y / N) * TAU * 2 - phase) * 0.5 + 0.5;
        const v = n * 0.74 + w * 0.26;
        if (v > 0.66) px(x, y, PAL.waterLight);
        else if (v < 0.33) px(x, y, PAL.waterDark);
      }
    }
    // Glitter: short pale dashes that come and go rather than slide. Sparkle is
    // what a water surface actually does at this scale, and a dash that travels
    // has to jump back at the end of a four-frame loop.
    for (let i = 0; i < 4; i++) {
      const gy = 3 + i * 8 + Math.floor(hash2(i, animFrame, 71) * 4);
      const start = Math.floor(hash2(i, animFrame + 1, 13) * N);
      for (let k = 0; k < 3; k++) {
        const gx = (start + k * 11) % N;
        px(gx, gy, PAL.waterPale);
        px((gx + 1) % N, gy, PAL.waterFoam);
        px((gx + 2) % N, gy, PAL.waterPale);
      }
    }
    if (edge) {
      // Foam along a shoreline, breathing up and down the bank with the swell.
      for (let x = 0; x < N; x++) {
        const h = 2 + Math.floor(wrapNoise(x, 0, 8, 41) * 3)
          + (Math.sin((x / N) * TAU * 2 + phase) > 0.5 ? 1 : 0);
        for (let y = 0; y < h; y++) px(x, y, y < h - 1 ? PAL.waterFoam : PAL.waterPale);
      }
    }
    // Advance the shared Rng by the draws this tile used to take. Nothing in the
    // water is placed from it any more -- a fleck rolled per frame would jitter
    // rather than glint -- but every tile painted after this one comes out of
    // the same stream, so swallowing them leaves the rest of the set untouched.
    for (let i = 0; i < 6; i++) rng.below(N);
  }

  /**
   * Deep water, kept firmly distinct from the shallows: every coastline and the
   * whole Tide Bastion puzzle depend on reading "walkable" or "wall" from
   * colour alone.
   */
  private deepWater(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.waterDeep);
    const N = TILE_PX;
    const TAU = Math.PI * 2;
    const nf = ANIMATED[T.WATER_DEEP] ?? 1;
    // The swell here runs the other way from the shallows, so a coastline has
    // two bodies of water moving against each other rather than one big sheet.
    const phase = -(animFrame / nf) * TAU;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        // The old surface interfered two sines whose periods did not divide the
        // cell, which laid a row of identical comma shapes across every lake.
        const n = wrapNoise(x, y, 16, 131) * 0.45
          + wrapNoise(x, y, 8, 137) * 0.32 + wrapNoise(x, y, 4, 139) * 0.23;
        const w = Math.sin((x / N) * TAU - (y / N) * TAU * 2 + phase) * 0.5 + 0.5;
        const v = n * 0.82 + w * 0.18;
        if (v > 0.7) px(x, y, PAL.waterDark);
        else if (v > 0.55) px(x, y, '#20416b');
        else if (v < 0.3) px(x, y, '#12294a');
      }
    }
    // Two swell crests, undulating and travelling with the phase.
    for (let i = 0; i < 2; i++) {
      const sy = 8 + i * 16;
      for (let x = 0; x < N; x++) {
        const y = (sy + Math.round(Math.sin((x / N) * TAU + phase + i * 2.1) * 3) + N) % N;
        if ((x + i * 3) % 9 < 5) px(x, y, '#2e5680');
      }
    }
    // See `water`: the shared Rng is advanced, not read, so the frames of one
    // tile match and the tiles painted after it are unaffected.
    for (let i = 0; i < 2; i++) rng.below(N - 8);
  }

  private sand(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.sandMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(x, y, 51) * 0.55 + hash2(Math.floor(x / 4), Math.floor(y / 4), 7) * 0.45;
        if (n > 0.76) px(x, y, PAL.sandPale);
        else if (n > 0.6) px(x, y, PAL.sandLight);
        else if (n < 0.24) px(x, y, PAL.sandDark);
      }
    }
    // Ripple lines left by the tide, plus the odd shell fleck.
    for (let i = 0; i < 3; i++) {
      const ry = 3 + rng.below(TILE_PX - 6);
      for (let x = 0; x < TILE_PX; x++) {
        const y = ry + Math.round(Math.sin(x * 0.35 + i * 2) * 1.6);
        px(x, y, PAL.sandDark);
        px(x, y - 1, PAL.sandPale);
      }
    }
    for (let i = 0; i < 3; i++) px(rng.below(TILE_PX), rng.below(TILE_PX), '#f8f2e0');
  }

  /* -------------------------------------------------------------- flora */


  /**
   * A tree.
   *
   * This used to be a seamless canopy: four wrapping lobes with darkened
   * valleys between them, tuned so a block of the tiles fused into one
   * unbroken mass. It fused perfectly, and that was the whole problem -- with
   * no trunk anywhere and no gap between one crown and the next, a treeline
   * came out as lumpy green cladding. Nothing in it said *tree*.
   *
   * So each cell now holds one whole tree: a rounded crown with its own light
   * and a dark rim, a trunk under it, and open ground either side of the trunk.
   * Seeing the trunks and the ground between them is the entire difference
   * between a hedge and a wood.
   *
   * The crown stops short of the cell corners and everything outside it is
   * left transparent, so the turf the map put under the tree shows through. A
   * first attempt filled that space with dark foliage instead, on the theory
   * that a treeline must not have holes in it -- and every tree standing on its
   * own then became a dark green square with a crown inside it. A wood made of
   * separate trees with grass between them reads as a wood; a wood with no gaps
   * in it reads as a wall, which is the complaint this rewrite started from.
   *
   * A ring of translucent shade just outside the crown keeps the gaps from
   * going bright: the turf between the trees is turf in shadow, not lawn.
   *
   * The three variants move the centre, the radius and the wobble, so the trees
   * along a border are not the same tree three hundred times.
   */
  private tree(px: Px, fill: (c: string) => void, rng: Rng, small: boolean): void {
    if (small) { this.smallTree(px, fill, rng); return; }
    void fill;

    const P = this.unit(px);
    const S = TILE_SIZE;
    /** Per-variant constants; hash2 folds the variant seed, so these move. */
    const v = (s: number) => hash2(s, s * 3 + 1, 917);

    const cx = 7.5 + (v(1) - 0.5) * 1.4;
    const cy = 5.9 + (v(2) - 0.5) * 1.0;
    const rx = 6.9 + v(3) * 0.9;
    const ry = 6.1 + v(4) * 0.8;
    const phase = v(5) * 6.283;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx, dy = y - cy;
        const ang = Math.atan2(dy, dx);
        // A wobbled radius: a true ellipse reads as a ball, foliage does not.
        const wob = 1 + Math.sin(ang * 3 + phase) * 0.11 + Math.sin(ang * 5.4 - phase) * 0.07;
        const d = (dx * dx + dy * dy * (rx * rx) / (ry * ry)) / (rx * rx * wob * wob);

        if (d <= 1) {
          // Light from the upper left, broken into 2x2 clumps so the crown has
          // foliage in it rather than an airbrushed gradient.
          const clump = (hash2(x >> 1, y >> 1, 131) - 0.5) * 0.34;
          const lit = (-dx * 0.75 - dy) / ry + clump;
          let c: string;
          if (d > 0.88) c = lit > 0.3 ? PAL.leafDark : PAL.leafDeep;
          else if (lit > 0.58) c = PAL.leafTip;
          else if (lit > 0.3) c = PAL.leafHi;
          else if (lit > 0.02) c = PAL.leafLight;
          else if (lit > -0.32) c = PAL.leafMid;
          else if (lit > -0.66) c = PAL.leafDark;
          else c = PAL.leafDeep;
          P(x, y, c);
        } else {
          // Ground in the tree's shade: a rim hugging the crown, and the shadow
          // it casts down and to the right of itself. Both translucent, so they
          // darken whatever the map put underneath rather than stamping one
          // colour of forest floor over turf, sand and pond bank alike -- and
          // both round, because a square of shade is a square however soft.
          const sx = (dx - 1.1) / 7.2, sy = (dy - 4.6) / 5.2;
          if (d < 1.45) P(x, y, 'rgba(22,42,20,0.34)');
          else if (sx * sx + sy * sy < 1) P(x, y, 'rgba(22,42,20,0.28)');
        }
      }
    }

    // Trunk. Two units wide is four screen pixels: the smallest mark that still
    // reads as a trunk and not as a smudge of bark colour.
    const tx = Math.round(cx) - 1;
    for (let y = 9; y < S; y++) {
      P(tx, y, y < 11 ? PAL.trunkDark : PAL.trunkMid);
      P(tx + 1, y, y < 11 ? PAL.trunkDeep : PAL.trunkDark);
    }
    // Root flare, and the shadow the trunk throws on the ground beside it.
    P(tx - 1, 14, PAL.trunkDark); P(tx + 2, 14, PAL.trunkDeep);
    P(tx - 2, 15, PAL.trunkDeep); P(tx - 1, 15, PAL.trunkDark);
    P(tx + 2, 15, PAL.trunkDeep); P(tx + 3, 15, PAL.trunkDeep);
    for (let y = 12; y < S; y++) P(tx + 2, y, 'rgba(22,42,20,0.40)');

    // Leaves catching the light on the crown's upper-left shoulder.
    for (let i = 0; i < 14; i++) {
      const lx = rng.below(S), ly = rng.below(S);
      const dx = lx - cx, dy = ly - cy;
      if ((dx * dx + dy * dy * (rx * rx) / (ry * ry)) / (rx * rx) > 0.66) continue;
      if ((-dx * 0.75 - dy) / ry < 0.2) continue;
      P(lx, ly, PAL.leafTip);
      P(lx + 1, ly + 1, PAL.leafHi);
    }
  }

  /**
   * A single bush on open turf, for gardens and route dressing. Outlined all
   * the way round, unlike the canopy, because this one is meant to read as one
   * object rather than as part of a mass.
   */
  private smallTree(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.turf(px, fill, 17);

    const cx = 16, cy = 17, rx = 12, ry = 10;
    for (let y = -ry - 1; y <= ry + 1; y++) {
      for (let x = -rx - 1; x <= rx + 1; x++) {
        // A wobbled radius gives the outline its lumpy, hand-drawn edge.
        const ang = Math.atan2(y, x);
        const wob = 1 + Math.sin(ang * 3.3) * 0.1 + Math.sin(ang * 6.1 + 1.2) * 0.06;
        const d = (x * x) / (rx * rx * wob * wob) + (y * y) / (ry * ry * wob * wob);
        if (d > 1.18) continue;
        if (d > 1) { px(cx + x, cy + y, PAL.outline); continue; }
        const lit = (-x * 0.7 - y) / ry;
        px(cx + x, cy + y,
          d > 0.86 ? PAL.leafDeep
          : lit > 0.6 ? PAL.leafTip
          : lit > 0.25 ? PAL.leafHi
          : lit > -0.05 ? PAL.leafLight
          : lit > -0.45 ? PAL.leafMid : PAL.leafDark);
      }
    }
    for (let i = 0; i < 6; i++) {
      const lx = cx - 8 + rng.below(10), ly = cy - 7 + rng.below(8);
      px(lx, ly, PAL.leafTip);
      px(lx + 1, ly + 1, PAL.leafMid);
    }
    // Contact shadow, so the bush sits on the ground rather than floating.
    for (let x = -8; x <= 8; x++) {
      const h = Math.round(Math.sqrt(Math.max(0, 1 - (x * x) / 81)) * 2);
      for (let y = 0; y <= h; y++) px(cx + x + 1, cy + ry + y - 1, PAL.grassDeep);
    }
  }

  private bramble(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill('#26401f');
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 2), Math.floor(y / 2), 61);
        if (n > 0.68) px(x, y, '#33522a');
        else if (n < 0.3) px(x, y, '#1a2f16');
      }
    }
    for (let i = 0; i < 10; i++) {
      const y0 = rng.below(TILE_PX);
      const dir = rng.chance(50) ? 1 : -1;
      for (let x = 0; x < TILE_PX; x++) {
        const y = y0 + Math.round((x - 16) * 0.5 * dir + Math.sin(x * 0.3) * 2);
        px(x, y, '#4d7a3f');
        px(x, y + 1, '#1e3a1a');
      }
    }
    for (let i = 0; i < 26; i++) {
      const sx = rng.below(TILE_PX), sy = rng.below(TILE_PX);
      px(sx, sy, '#cbdc9c');
      px(sx, sy + 1, '#26401f');
    }
    for (let x = 0; x < TILE_PX; x++) { px(x, 0, PAL.outline); px(x, TILE_PX - 1, PAL.outline); }
  }

  /* -------------------------------------------------------------- stone */

  private rock(px: Px, fill: (c: string) => void, rng: Rng, big: boolean, ground: boolean): void {
    if (ground) this.turf(px, fill, 29);

    const r = big ? 12 : 8;
    const cy = big ? 18 : 22;
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        // Faceted rather than round: a wobbled radius reads as cut stone.
        const ang = Math.atan2(y, x);
        const wobble = 1 + Math.sin(ang * 3.1) * 0.09 + Math.sin(ang * 5.3) * 0.05;
        if (x * x + y * y * 1.55 > (r * wobble) ** 2) continue;
        const lit = (-x - y) / (r * 1.6);
        const c = lit > 0.42 ? PAL.stonePale
          : lit > 0.12 ? PAL.stoneLight
          : lit > -0.2 ? PAL.stoneMid
          : lit > -0.5 ? PAL.stoneDark : PAL.stoneDeep;
        px(16 + x, cy + y, c);
      }
    }
    for (let i = 0; i < 3; i++) {
      let cxx = 16 + rng.int(-Math.floor(r / 2), Math.floor(r / 2));
      let cyy = cy + rng.int(-Math.floor(r / 2), Math.floor(r / 2));
      for (let s = 0; s < 6; s++) {
        px(cxx, cyy, PAL.stoneDeep);
        cxx += rng.int(-1, 1);
        cyy += 1;
      }
    }
    for (let x = -r - 1; x <= r + 1; x++) {
      const yy = Math.floor(Math.sqrt(Math.max(0, r * r - x * x) / 1.55));
      if (yy <= 0) continue;
      px(16 + x, cy + yy, PAL.outline);
      px(16 + x, cy - yy, PAL.outline);
    }
    if (ground) for (let x = -r; x <= r; x++) px(16 + x, cy + Math.floor(r * 0.8), PAL.grassDeep);
  }

  /**
   * The rock face at the edge of the world.
   *
   * The old one was grey value noise with vertical scribbles ruled down it. It
   * had no form at all: no course, no lit edge, nothing casting a shadow on
   * anything else, so a map boundary came out as a grey carpet standing on its
   * end -- the wall read as floor.
   *
   * Rock reads as height because of strata, so the face is built as four bands
   * of broken stone. The top row of a band catches the light, the bottom row is
   * the undercut in shadow beneath the slab above it, and each band's boundary
   * waves across the cell on its own phase -- shared phases give a wall with
   * wavy courses, which is masonry, and independent ones give strata, which is
   * rock. The joints inside a band are few and wide for the same reason: a
   * cliff is broken slabs, and anything narrower turns straight into brickwork.
   *
   * Both axes wrap. Band heights add up to the cell, block widths add up to the
   * cell, and every wave is a whole number of periods across it, so a cliff of
   * any size and any shape -- the vertical wall down the side of Marrow Hollow,
   * the horizontal shelf above Kellowmere -- has no seam in it anywhere.
   */
  private cliff(px: Px, fill: (c: string) => void, rng: Rng, top: boolean): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    const TAU = Math.PI * 2;
    const wrap = (v: number) => ((v % S) + S) % S;

    fill(PAL.stoneMid);

    /**
     * How many strata cross one cell.
     *
     * Two, not four. Four gave bands of four rows, of which the lit top, its
     * front and the undercut took three -- so the face came out as light, dark,
     * light, dark every few pixels, which at map size is gravel. Eight rows to
     * a band leaves a body of real stone between the edges, and the strata read
     * as slabs the size of a person rather than as cobbles.
     */
    const BANDS = 2;
    /** Block widths that add up to a cell, so a band closes on itself. */
    const RUNS = [[7, 9], [9, 7], [6, 10], [5, 11], [8, 8], [6, 4, 6]];

    // Per band: where the joints fall and which slab each column belongs to, so
    // a slab can be tinted as one piece of stone rather than column by column.
    const joints: Set<number>[] = [];
    const slabOf: number[][] = [];
    for (let c = 0; c < BANDS; c++) {
      const run = RUNS[Math.floor(hash2(c, 1, 211) * RUNS.length) % RUNS.length]!;
      const rot = Math.floor(hash2(c, 2, 223) * S);
      const set = new Set<number>();
      let acc = rot;
      for (const w of run) { set.add(wrap(acc)); acc += w; }
      const ids = new Array<number>(S).fill(0);
      let id = 0;
      for (let k = 0; k < S; k++) {
        const x = wrap(rot + k);
        if (k > 0 && set.has(x)) id++;
        ids[x] = id;
      }
      joints.push(set);
      slabOf.push(ids);
    }

    const span = S / BANDS;
    /**
     * Row where band `c` starts in column `x`.
     *
     * Clamped either way at a quarter of the spacing: a boundary free to travel
     * further than that would overtake its neighbour and the strata would tie
     * themselves in a knot.
     */
    const bandTop = (c: number, x: number): number => {
      const ph = hash2(c, 7, 401) * TAU;
      const w = Math.sin((x / S) * TAU + ph) * 1.6 + Math.sin((x / S) * TAU * 2 + ph * 1.7) * 0.9;
      const lim = span / 4;
      return c * span + Math.max(-lim, Math.min(lim, Math.round(w)));
    };

    for (let x = 0; x < S; x++) {
      for (let c = 0; c < BANDS; c++) {
        const y0 = bandTop(c, x);
        const y1 = c === BANDS - 1 ? bandTop(0, x) + S : bandTop(c + 1, x);
        const h = y1 - y0;
        const b = slabOf[c]![x]!;
        // Slab tint, plus a slow wash across the whole face so a long cliff is
        // not one flat value from end to end.
        const tint = hash2(c * 9 + b, 3, 233) * 0.68
          + wrapNoise(x * DETAIL, c * 6 * DETAIL, 16, 97) * 0.32;
        const body = tint > 0.62 ? PAL.stoneMid : tint > 0.3 ? PAL.stoneDark : PAL.stoneDeep;

        for (let k = 0; k < h; k++) {
          // The four marks that make a band read as a slab seen edge on: a lit
          // top face, its front falling away, the body of the rock, and the
          // undercut where the next slab down lies in this one's shadow.
          let col: string = body;
          if (k === 0) col = tint > 0.62 ? PAL.stonePale : PAL.stoneLight;
          else if (k === 1) col = tint > 0.3 ? PAL.stoneMid : PAL.stoneDark;
          else if (k === h - 1) col = PAL.stoneDeep;
          else if (k === h - 2) col = tint > 0.62 ? PAL.stoneDark : PAL.stoneDeep;
          // The joint between two slabs: a dark cut that stops short of the lit
          // top, with the broken edge beside it catching a little light.
          if (joints[c]!.has(x) && k > 0 && k < h - 1) col = PAL.stoneDeep;
          else if (joints[c]!.has(wrap(x - 1)) && k > 1 && k < h - 2) col = PAL.stoneMid;
          P(x, wrap(y0 + k), col);
        }
      }
    }

    // Fractures running down the face, each with a lit edge on its left so the
    // crack reads as an opening rather than as a pencil line.
    for (let i = 0; i < 3; i++) {
      let fx = rng.below(S);
      const fy = rng.below(S);
      if (i === 2) continue;
      for (let s = 0; s < 6 + i * 3; s++) {
        P(wrap(fx), wrap(fy + s), PAL.stoneDeep);
        P(wrap(fx - 1), wrap(fy + s), PAL.stoneDark);
        if (hash2(fx, fy + s, 149) > 0.55) fx += hash2(fx, s, 151) > 0.5 ? 1 : -1;
      }
    }

    if (top) {
      // The lip. Turf on the shelf, a hard line where it stops, and two rows of
      // undercut shadow under that: the three marks that turn a grey texture
      // into an edge the player is standing above.
      const ph = hash2(4, 4, 307) * TAU;
      for (let x = 0; x < S; x++) {
        const h = 5 + Math.round(
          Math.sin((x / S) * TAU + ph) * 0.9 + Math.sin((x / S) * TAU * 3 + ph) * 0.6,
        );
        for (let y = 0; y < h; y++) {
          const d = (x * 3 + y * 5) % 16;
          P(x, y, y === h - 1 ? PAL.grassDark
            : d === 1 ? PAL.grassLight : d === 9 ? PAL.grassDark : PAL.grassMid);
        }
        P(x, h, PAL.outline);
        P(x, h + 1, PAL.stoneDeep);
        P(x, h + 2, PAL.stoneDark);
        // The odd clump hanging over the edge, so the lip is not a ruled line.
        if (hash2(x, 9, 2) > 0.62) { P(x, h + 1, PAL.grassDeep); P(x, h + 2, PAL.grassDeep); }
      }
    }
  }

  private ledge(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.turf(px, fill, 37);
    for (let x = 0; x < TILE_PX; x++) {
      const lip = 9 + Math.round(Math.sin(x * 0.28) * 1.5);
      px(x, lip, PAL.outline);
      for (let y = lip + 1; y < lip + 10; y++) {
        const t = (y - lip) / 10;
        const n = hash2(x, y, 43);
        let c: string = t < 0.25 ? PAL.dirtLight : t < 0.6 ? PAL.dirtMid : PAL.dirtDark;
        if (n > 0.78) c = PAL.dirtPale;
        else if (n < 0.2) c = PAL.dirtDeep;
        px(x, y, c);
      }
      px(x, lip + 10, PAL.outline);
      if (hash2(x, 5, 11) > 0.45) { px(x, lip + 1, PAL.grassDark); px(x, lip + 2, PAL.grassDeep); }
    }
    for (let i = 0; i < 8; i++) {
      const sx = rng.below(TILE_PX);
      const sy = 11 + rng.below(7);
      px(sx, sy, PAL.stoneLight);
      px(sx + 1, sy + 1, PAL.stoneDark);
    }
  }

  /* ------------------------------------------------------------ village */

  /**
   * Post-and-rail fence, in two directions that actually join.
   *
   * Three things were wrong with the old one and all three are about the run
   * rather than the tile. It was drawn straight onto the buffer grid, so posts
   * landed on half units and every stile came out a different width. It carried
   * two posts per tile, close to the ends, so a long fence read as a row of
   * separate H shapes rather than as one fence. And the two directions shared no
   * geometry at all: the east-west rails and the north-south post sat at
   * different offsets, so a corner was two fences passing each other.
   *
   * Now both are built around the same eight-to-eleven column. East-west: rails
   * across the full width, one post standing in that column, drawn last so it
   * passes in front of the rails. North-south: the rail runs down that same
   * column for the full height of the cell, with one post crossing it. So a
   * corner tile's post is where the next tile's rail arrives, from either
   * direction, and a run of any length is continuous timber.
   *
   * Nothing is painted outside the fence itself: the cell is an overlay, and
   * leaving it clear means the turf underneath keeps its own variation instead
   * of being stamped flat wherever a fence happens to stand.
   */
  private fence(px: Px, fill: (c: string) => void, rng: Rng, horizontal: boolean): void {
    const P = this.unit(px);

    // One rail, seen side on: lit head, body, shadowed underside.
    const railRow = (y: number, x0: number, x1: number) => {
      for (let x = x0; x <= x1; x++) {
        P(x, y, PAL.woodPale);
        P(x, y + 1, PAL.woodMid);
        P(x, y + 2, PAL.woodDark);
      }
    };

    if (horizontal) {
      railRow(4, 0, TILE_SIZE - 1);
      railRow(9, 0, TILE_SIZE - 1);
      // Post, in front of both rails.
      for (let y = 2; y <= 14; y++) {
        P(6, y, PAL.woodLight);
        P(7, y, PAL.woodMid);
        P(8, y, PAL.woodDark);
        P(9, y, PAL.woodDeep);
      }
      for (let x = 6; x <= 9; x++) P(x, 2, PAL.woodPale);   // chamfered cap
      P(6, 2, PAL.woodLight);
      for (let x = 6; x <= 9; x++) P(x, 15, PAL.outline);
      this.footShadow(P, 5, 10, 15);
    } else {
      // The rail seen end on, running away from the viewer.
      for (let y = 0; y < TILE_SIZE; y++) {
        P(6, y, PAL.woodPale);
        P(7, y, PAL.woodLight);
        P(8, y, PAL.woodMid);
        P(9, y, PAL.woodDark);
      }
      // Post crossing it, one to a cell so a north-south run keeps the same
      // rhythm as an east-west one.
      for (let x = 2; x <= 13; x++) {
        P(x, 6, PAL.woodPale);
        P(x, 7, PAL.woodLight);
        P(x, 8, PAL.woodMid);
        P(x, 9, PAL.woodDark);
      }
      for (let y = 6; y <= 9; y++) { P(2, y, PAL.woodLight); P(13, y, PAL.woodDeep); }
      this.footShadow(P, 2, 13, 10);
    }
    void fill; void rng;
  }

  /**
   * Signpost.
   *
   * The board sits high in the tile and the posts run to the bottom, which is
   * not decoration: the player is two tiles tall and stands on the tile below,
   * so anything drawn low here ends up behind their head. Put the writing up
   * top and standing in front of a sign looks like standing in front of a sign.
   */
  private sign(px: Px, fill: (c: string) => void, rng: Rng): void {
    // Left clear behind the post so the turf underneath keeps its own dapple
    // rather than being replaced by one flat stamp of grass.
    const P = this.unit(px);

    // Posts, with the light on the left of each and a shadow down the right.
    for (const lx of [5, 9]) {
      for (let y = 7; y <= 14; y++) {
        P(lx, y, PAL.woodLight);
        P(lx + 1, y, PAL.woodDark);
      }
      P(lx, 15, PAL.outline); P(lx + 1, 15, PAL.outline);
    }
    this.footShadow(P, 4, 11, 15);

    // Board: a hard outline, a planked face and a mitred lit edge along the top
    // and left, which is what gives it thickness at this size.
    for (let y = 1; y <= 9; y++) {
      for (let x = 1; x <= 14; x++) {
        const border = y === 1 || y === 9 || x === 1 || x === 14;
        P(x, y, border ? PAL.outline : y % 3 === 0 ? PAL.woodMid : PAL.woodLight);
      }
    }
    for (let x = 2; x <= 13; x++) P(x, 2, PAL.woodPale);
    for (let y = 2; y <= 8; y++) P(2, y, PAL.woodPale);
    for (let x = 2; x <= 13; x++) P(x, 8, PAL.woodDark);
    for (let y = 2; y <= 8; y++) P(13, y, PAL.woodDark);
    // Two lines of writing, which is all that is legible at this size, and a
    // nail at each corner so the board reads as fixed to the posts.
    for (let x = 4; x <= 12; x++) P(x, 4, PAL.woodDeep);
    for (let x = 4; x <= 10; x++) P(x, 6, PAL.woodDeep);
    P(3, 3, PAL.woodDeep); P(12, 3, PAL.woodDeep);
    P(3, 7, PAL.woodDeep); P(12, 7, PAL.woodDeep);
    void fill; void rng;
  }

  /**
   * The two rows every exterior wall tile starts and ends with.
   *
   * Head: the shadow the roof's overhang throws down the wall. Houses in this
   * game are one row of roof over one row of wall, and with the two rows flush
   * against each other the roof read as a coloured band pasted on rather than as
   * something with a lip standing out over the front of the building. The
   * shadow is the overhang.
   *
   * Foot: a plinth with a lit top edge and a hard line under it. Without it the
   * boards run straight into the turf and the house floats.
   */
  private wallHead(P: Px, shade: string, deeper: string): void {
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 0, deeper);
      P(x, 1, shade);
    }
  }

  private wallFoot(P: Px): void {
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 13, PAL.stoneLight);
      P(x, 14, PAL.stoneDark);
      P(x, 15, PAL.outline);
    }
  }

  /**
   * House wall.
   *
   * Plaster over a stone plinth, with the siding lines evenly spaced -- the
   * reference art never leaves a wall flat, but it never lets the texture
   * compete with the window either.
   */
  private wall(px: Px, fill: (c: string) => void, rng: Rng, window: boolean): void {
    fill(PAL.plasterMid);
    const P = this.unit(px);

    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y % 4 === 3) P(x, y, PAL.plasterDark);
        else if ((x * 7 + y * 3) % 16 === 5) P(x, y, PAL.plasterLight);
      }
    }
    this.wallHead(P, PAL.plasterDark, '#a89b7c');
    this.wallFoot(P);

    if (window) {
      for (let y = 3; y <= 11; y++) {
        for (let x = 3; x <= 12; x++) {
          const frame = y === 3 || y === 11 || x === 3 || x === 12;
          if (frame) { P(x, y, y === 11 ? PAL.trimShade : PAL.trimPale); continue; }
          P(x, y, x + y < 12 ? PAL.glassHi : x + y < 18 ? PAL.glassLight : PAL.glass);
        }
      }
      // The glass is recessed, so the head and the left jamb fall across it.
      for (let x = 4; x <= 11; x++) P(x, 4, '#4e78a0');
      for (let y = 4; y <= 10; y++) P(4, y, '#5a86ae');
      // Glazing bars, and a sill standing proud of the wall.
      for (let x = 4; x <= 11; x++) P(x, 7, PAL.trimMid);
      for (let y = 4; y <= 10; y++) P(8, y, PAL.trimMid);
      for (let x = 2; x <= 13; x++) { P(x, 12, PAL.trimPale); }
    }
    void rng;
  }

  /**
   * The way out of a room: a dark opening, not a door.
   *
   * Every interior exit in the game is this tile. A drawn door leaf standing on
   * a wall inside a room reads as furniture -- a wardrobe, a cupboard, some
   * panelling -- and the player has to be told where the exit is. A dark gap
   * needs no telling: a hole in a lit room is the one thing the eye is
   * guaranteed to find, and the reference art has used exactly this since the
   * first handheld generation.
   *
   * So: the tile's own doorcase in the wall's material, a hard head, and a void
   * that runs off the bottom of the cell. The void is *graded* -- almost black
   * under the lintel, opening out to a cold blue-grey at the threshold -- which
   * is what turns a black rectangle into a passage with somewhere on the other
   * end of it.
   */
  private door(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.interiorWall(px, fill, rng);
    const P = this.unit(px);

    const caseLit = '#e2dac9';     // jamb turned into the light
    const caseMid = '#c3b9a3';
    const caseDim = '#9b917c';     // jamb turned away from it
    const voidTop = '#12151d';
    const voidMid = '#1b2029';
    const voidLow = '#252c3a';

    // The opening, cut down through the bottom of the cell so nothing closes it
    // off: an exit with a floor drawn across its foot reads as an alcove.
    for (let y = 2; y <= 15; y++) {
      for (let x = 3; x <= 12; x++) {
        P(x, y, y <= 5 ? voidTop : y <= 10 ? voidMid : voidLow);
      }
    }
    // Reveal down the left of the opening: the wall has thickness, and the one
    // lit edge inside the dark is what stops it reading as a painted rectangle.
    for (let y = 3; y <= 15; y++) P(3, y, y <= 8 ? '#2c3446' : '#39435a');
    for (let x = 4; x <= 12; x++) P(x, 2, '#0e1017');

    // Doorcase.
    for (let y = 1; y <= 15; y++) {
      P(1, y, PAL.outline); P(2, y, caseLit);
      P(13, y, caseDim); P(14, y, PAL.outline);
    }
    for (let x = 1; x <= 14; x++) {
      P(x, 0, PAL.outline);
      P(x, 1, x <= 2 ? caseLit : caseMid);
    }
    P(13, 1, caseDim); P(14, 1, PAL.outline);
  }



  /** The five-step ramp a roof is painted from, by building type. */
  private roofRamp(hue: RoofHue): [string, string, string, string, string] {
    if (hue === 'red') return [PAL.redDeep, PAL.redDark, PAL.redMid, PAL.redLight, PAL.redPale];
    if (hue === 'blue') return [PAL.blueDeep, PAL.blueDark, PAL.blueMid, PAL.blueLight, PAL.bluePale];
    if (hue === 'slate') return [PAL.slateDeep, PAL.slateDark, PAL.slateMid, PAL.slateLight, PAL.slatePale];
    // Weathered copper, not the moss green the palette carries. The moss ramp
    // sits inside the leaf ramp's range, and a green roof one tile from a tree
    // line read as a hedge with windows under it -- which is the one thing a
    // roof must never do. Verdigris keeps the "third material" this hue exists
    // for and cannot be mistaken for foliage. The moss ramp still dresses the
    // shutters, where being leafy is the point.
    if (hue === 'moss') return ['#22423d', '#345c54', '#4a7c70', '#6a9e90', '#93c1b1'];
    return [PAL.roofDeep, PAL.roofDark, PAL.roofMid, PAL.roofLight, PAL.roofPale];
  }

  /**
   * Pantiled roof.
   *
   * The old version drew wide vertical slats, randomly lit, straight onto the
   * buffer grid -- five buffer pixels to a slat, so two and a half authoring
   * units, so nothing lined up with anything. At a distance it read as a garden
   * fence laid on its side.
   *
   * A pantile has two directions to it and both are needed: a rounded rib every
   * four units running down the slope, and a lap every four rows running across
   * it. Ribs alone are planks; laps alone are slate. Together, and with the
   * whole field falling one step darker towards the eave, it reads as a tiled
   * roof from a screen away -- which is what has to happen, because colour on
   * this tile is how a player finds the Waystation.
   */
  private roof(
    px: Px, fill: (c: string) => void,
    part: 'mid' | 'left' | 'right' | 'peak',
    hue: RoofHue = 'tan',
  ): void {
    const [deep, dark, mid, light, pale] = this.roofRamp(hue);
    fill(mid);
    const P = this.unit(px);

    for (let y = 0; y < TILE_SIZE; y++) {
      const inCourse = y % 4;
      for (let x = 0; x < TILE_SIZE; x++) {
        const rib = x % 4;
        // Across one rib: the shaded channel, the lit crown, then the fall away.
        let c: string = rib === 0 ? deep : rib === 1 ? light : rib === 2 ? mid : dark;
        // Head of the course, where the tile above stops and the light gets in.
        if (inCourse === 0) c = rib === 0 ? dark : rib === 1 ? pale : light;
        // The lap itself, in the shadow of the course above it. Only the channel
        // between two tiles goes fully dark here -- take the whole row down and
        // the horizontal joint outweighs the ribs, and the roof reads as brick.
        else if (inCourse === 3) c = rib === 0 ? deep : rib === 1 ? mid : dark;
        // The slope falls away from the ridge, so the bottom of every tile is
        // a step down from the top of it.
        if (y >= 12 && c === light) c = mid;
        else if (y >= 12 && c === pale) c = light;
        P(x, y, c);
      }
    }

    if (part === 'peak') {
      // Ridge cap: a course of half-round tiles sitting over the join.
      for (let x = 0; x < TILE_SIZE; x++) {
        P(x, 0, PAL.outline);
        P(x, 1, x % 4 === 0 ? light : pale);
        P(x, 2, x % 4 === 0 ? dark : light);
      }
    }
    if (part === 'left') {
      // Barge board down the gable end, turned into the light.
      for (let y = 0; y < TILE_SIZE; y++) {
        P(0, y, PAL.outline);
        P(1, y, pale);
        P(2, y, light);
      }
    }
    if (part === 'right') {
      for (let y = 0; y < TILE_SIZE; y++) {
        P(TILE_SIZE - 1, y, PAL.outline);
        P(TILE_SIZE - 2, y, deep);
        P(TILE_SIZE - 3, y, dark);
      }
    }
    // Eave. The overhang itself is sold by the shadow the wall tile below
    // carries at its head, not by a bright fascia here: this row also lands in
    // the middle of the two-row civic roofs, where a lit board would read as a
    // seam across the building.
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, TILE_SIZE - 2, deep);
      P(x, TILE_SIZE - 1, PAL.outline);
    }
  }

  /**
   * The crest on a civic roof.
   *
   * A white disc carrying one bold glyph: a cross for the Waystation, a crate
   * for the Provisioner. Two shapes, maximum contrast, no lettering -- the
   * player has to resolve this from across a town at a glance, and at this size
   * a glyph beats text every time.
   */
  private emblem(px: Px, fill: (c: string) => void, kind: 'heal' | 'shop'): void {
    const hue: RoofHue = kind === 'heal' ? 'red' : 'blue';
    this.roof(px, fill, 'mid', hue);
    const ink = this.roofRamp(hue)[1];

    const cx = 16, cy = 14, r = 12;
    for (let y = -r - 1; y <= r + 1; y++) {
      for (let x = -r - 1; x <= r + 1; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d > r + 1) continue;
        if (d > r - 0.4) { px(cx + x, cy + y, PAL.outline); continue; }
        // A shadow inside the lower right of the disc gives it a dome.
        px(cx + x, cy + y, x + y > r * 0.8 ? PAL.trimMid : PAL.trimPale);
      }
    }

    if (kind === 'heal') {
      for (let y = -8; y <= 8; y++) {
        for (let x = -8; x <= 8; x++) {
          if (Math.abs(x) <= 3 || Math.abs(y) <= 3) px(cx + x, cy + y, ink);
        }
      }
    } else {
      for (let y = -6; y <= 7; y++) {
        for (let x = -8; x <= 8; x++) px(cx + x, cy + y, ink);
      }
      // Lid line and two strap bands turn the block into a readable crate.
      for (let x = -8; x <= 8; x++) px(cx + x, cy - 3, PAL.trimPale);
      for (let y = -3; y <= 7; y++) { px(cx - 3, cy + y, PAL.trimPale); px(cx + 3, cy + y, PAL.trimPale); }
    }
  }

  /**
   * Civic base wall: the pale course both public buildings stand on, which is
   * what separates them at a glance from the plaster-and-timber houses.
   */
  private civicWall(px: Px, fill: (c: string) => void, kind: 'plain' | 'door' | 'heal' | 'shop'): void {
    fill(PAL.trimLight);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        if (wrapNoise(x, y, 16, 77) > 0.66) px(x, y, PAL.trimPale);
      }
    }
    // Head: the shadow of the roof's overhang. Foot: the plinth the frontage
    // stands on, so the building meets the paving instead of ending at it.
    const U = this.unit(px);
    for (let x = 0; x < TILE_SIZE; x++) {
      U(x, 0, PAL.stoneDark);
      U(x, 1, PAL.trimShade);
      U(x, 13, PAL.trimShade);
      U(x, 14, PAL.stoneDark);
      U(x, 15, PAL.outline);
    }

    if (kind === 'door') {
      // Automatic glass doors, split down the middle.
      for (let y = 4; y < TILE_PX - 3; y++) {
        for (let x = 3; x < 29; x++) {
          const frame = x < 5 || x > 26 || y < 6;
          px(x, y, frame ? PAL.trimShade : x + y < 30 ? PAL.glassHi : PAL.glassLight);
        }
      }
      for (let y = 6; y < TILE_PX - 3; y++) { px(15, y, PAL.trimShade); px(16, y, PAL.trimMid); }
      for (let x = 3; x < 29; x++) px(x, TILE_PX - 4, PAL.stoneDark);
    } else if (kind !== 'plain') {
      // Wall-mounted plate carrying the same glyph as the roof crest.
      const ink = kind === 'heal' ? PAL.redMid : PAL.blueMid;
      for (let y = 6; y < 24; y++) {
        for (let x = 4; x < 28; x++) {
          const border = y === 6 || y === 23 || x === 4 || x === 27;
          px(x, y, border ? PAL.outline : PAL.trimPale);
        }
      }
      const cx = 16, cy = 14;
      if (kind === 'heal') {
        for (let y = -6; y <= 6; y++) {
          for (let x = -6; x <= 6; x++) {
            if (Math.abs(x) <= 2 || Math.abs(y) <= 2) px(cx + x, cy + y, ink);
          }
        }
      } else {
        for (let y = -5; y <= 5; y++) for (let x = -7; x <= 7; x++) px(cx + x, cy + y, ink);
        for (let x = -7; x <= 7; x++) px(cx + x, cy - 2, PAL.trimPale);
        for (let y = -2; y <= 5; y++) { px(cx - 2, cy + y, PAL.trimPale); px(cx + 2, cy + y, PAL.trimPale); }
      }
    }
  }


  /* ------------------------------------------------- houses, second set */

  /**
   * Shingled roof, in whatever hue is asked for.
   *
   * Horizontal courses rather than the terracotta roof's vertical slats. At
   * sixteen units across, a change of *material* separates two neighbouring
   * houses far more reliably than a change of tint does: a town where every
   * roof is the same weave in a different colour still reads as one building
   * repeated, which is exactly the complaint this set exists to answer.
   *
   * The ridge cap is baked into every part, including the ends. Houses here are
   * two tiles tall -- one roof row, one wall row -- so an edge tile that leaves
   * its ridge to a separate row above puts a notch in both top corners.
   */
  private shingleRoof(
    px: Px, fill: (c: string) => void,
    part: 'mid' | 'left' | 'right',
    hue: RoofHue,
  ): void {
    const [deep, dark, mid, light, pale] = this.roofRamp(hue);
    fill(mid);
    const P = this.unit(px);

    for (let y = 0; y < TILE_SIZE; y++) {
      const course = Math.floor(y / 4);
      const inCourse = y % 4;
      // Courses break joint every other row, as slate is actually laid.
      const shift = (course % 2) * 2;
      for (let x = 0; x < TILE_SIZE; x++) {
        const n = hash2(Math.floor((x + shift) / 4), course, 131);
        let c: string = n > 0.7 ? light : n < 0.3 ? dark : mid;
        if (inCourse === 0) c = c === dark ? mid : light;   // lit head of the slate
        else if (inCourse === 3) c = deep;                  // shadow under the lip
        if ((x + shift) % 4 === 0) c = dark;                // joint between slates
        P(x, y, c);
      }
    }

    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 0, PAL.outline);
      P(x, 1, pale);
      P(x, 2, light);
      P(x, 14, deep);      // eave
      P(x, 15, PAL.outline);
    }

    // Barge boards. The left one faces the light and the right one does not,
    // which is the whole reason the two ends are separate tiles.
    if (part === 'left') {
      for (let y = 0; y < TILE_SIZE; y++) {
        P(0, y, PAL.outline);
        P(1, y, deep);
        P(2, y, pale);
        P(3, y, light);
      }
    }
    if (part === 'right') {
      for (let y = 0; y < TILE_SIZE; y++) {
        P(15, y, PAL.outline);
        P(14, y, deep);
        P(13, y, dark);
      }
    }
  }

  /**
   * Hipped roof end.
   *
   * The other roof *shape*, not another colour. On a hip the end wall stops
   * short and the roof folds in on a diagonal instead of being cut off square
   * at a gable, so the ridge is shorter than the building. The silhouette of
   * the tile stays rectangular -- there is a wall underneath it either way --
   * and the fold is carried entirely by the arris and by the end slope sitting
   * a step brighter, because it faces the light while the front slope faces
   * the viewer.
   */
  private hipRoof(
    px: Px, fill: (c: string) => void,
    part: 'mid' | 'left' | 'right',
    hue: RoofHue,
  ): void {
    this.shingleRoof(px, fill, 'mid', hue);
    if (part === 'mid') return;

    const [deep, dark, mid, light, pale] = this.roofRamp(hue);
    const P = this.unit(px);
    const flip = part === 'right';
    const at = (x: number, y: number, c: string) => P(flip ? TILE_SIZE - 1 - x : x, y, c);

    // The two hip ends are not the same tile mirrored: the left one turns into
    // the light and the right one turns away from it, so the west face sits a
    // step above the front slope and the east face a step below. Painting both
    // the same is what makes a hipped roof look like a decal.
    const face = flip ? dark : light;
    const band = flip ? deep : mid;
    const shoulder = flip ? mid : pale;

    for (let y = 0; y <= 10; y++) {
      for (let x = 0; x + y <= 10; x++) {
        const d = x + y;
        if (d === 10) { at(x, y, deep); continue; }        // the arris itself
        if (d === 9) { at(x, y, shoulder); continue; }
        at(x, y, y % 4 === 3 ? band : face);
      }
    }
    // The eave corner, where the hip runs out to the gutter.
    for (let y = 10; y <= 14; y++) {
      at(0, y, PAL.outline);
      at(1, y, y === 14 ? deep : mid);
    }
  }

  /**
   * A chimney, on the default terracotta ridge.
   *
   * Drops straight into a `^` slot in an existing roof row. The cap is drawn
   * wider than the stack and the shadow falls to the right of it: without both,
   * this reads as bricks painted on a roof rather than as something standing
   * on one.
   */
  private chimney(px: Px, fill: (c: string) => void): void {
    this.roof(px, fill, 'peak');
    const P = this.unit(px);

    for (let y = 3; y <= 11; y++) {
      const course = Math.floor((y - 3) / 3);
      const shift = (course % 2) * 2;
      for (let x = 5; x <= 10; x++) {
        const joint = (y - 3) % 3 === 2 || (x + shift) % 3 === 0;
        P(x, y, joint ? PAL.mortar : x < 7 ? PAL.brickLight : x > 8 ? PAL.brickDark : PAL.brickMid);
      }
    }
    for (let x = 4; x <= 11; x++) {
      P(x, 0, PAL.outline);
      P(x, 1, PAL.stoneLight);
      P(x, 2, PAL.stoneDark);
    }
    for (let y = 3; y <= 11; y++) { P(4, y, PAL.outline); P(11, y, PAL.outline); }
    for (let x = 4; x <= 11; x++) P(x, 12, PAL.outline);
    // Cast shadow, sheared to the right because the light is up and to the left.
    for (let x = 12; x <= 14; x++) {
      for (let y = 4 + (x - 12); y <= 12; y++) P(x, y, PAL.roofDeep);
    }
  }

  /**
   * Timber board siding.
   *
   * Lapped boards four units deep, each with a lit head and a shadow where the
   * next board oversails it. The plinth at the foot is stone rather than more
   * timber: a house whose boards run into the grass looks like it was dropped
   * there, not built.
   */
  private timberWall(px: Px, fill: (c: string) => void): void {
    fill(PAL.woodMid);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      const b = y % 4;
      for (let x = 0; x < TILE_SIZE; x++) {
        let c: string = b === 0 ? PAL.woodLight : b === 3 ? PAL.woodDark : PAL.woodMid;
        if ((x * 7 + y * 3) % 16 === 5) c = b === 3 ? PAL.woodMid : PAL.woodPale;
        P(x, y, c);
      }
    }
    this.wallHead(P, PAL.woodDark, PAL.woodDeep);
    this.wallFoot(P);
  }

  /** Brick, laid in stretcher bond with mortar pale enough to draw the courses. */
  private brickWall(px: Px, fill: (c: string) => void): void {
    fill(PAL.brickMid);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      const course = Math.floor(y / 4);
      const shift = (course % 2) * 2;
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y % 4 === 3 || (x + shift) % 4 === 3) { P(x, y, PAL.mortar); continue; }
        const n = hash2(Math.floor((x + shift) / 4), course, 149);
        let c: string = n > 0.72 ? PAL.brickLight : n < 0.28 ? PAL.brickDark : PAL.brickMid;
        if (y % 4 === 0) c = PAL.brickPale;                 // lit head of the brick
        if ((x + shift) % 4 === 2) c = mixDown(c);          // shaded far end
        P(x, y, c);
      }
    }
    this.wallHead(P, PAL.brickDark, PAL.brickDeep);
    this.wallFoot(P);
  }

  /** A window with louvred shutters thrown open against the boards. */
  private shutteredWindow(px: Px, fill: (c: string) => void): void {
    this.timberWall(px, fill);
    const P = this.unit(px);

    for (let y = 3; y <= 10; y++) {
      for (let x = 6; x <= 9; x++) {
        P(x, y, x + y < 12 ? PAL.glassHi : x + y < 16 ? PAL.glassLight : PAL.glass);
      }
    }
    for (let y = 2; y <= 11; y++) { P(5, y, PAL.trimPale); P(10, y, PAL.trimPale); }
    for (let x = 5; x <= 10; x++) { P(x, 2, PAL.trimPale); P(x, 11, PAL.trimShade); }
    for (let y = 3; y <= 10; y++) P(8, y, PAL.trimMid);

    for (const sx of [2, 11]) {
      for (let y = 2; y <= 11; y++) {
        for (let x = sx; x <= sx + 2; x++) {
          const border = y === 2 || y === 11 || x === sx || x === sx + 2;
          // Louvres, drawn as alternating rows. Anything finer at this size
          // turns into a grey smear and the shutter stops reading as a shutter.
          P(x, y, border ? PAL.mossDeep : y % 2 === 0 ? PAL.mossMid : PAL.mossDark);
        }
      }
    }
    for (let x = 1; x <= 14; x++) P(x, 12, PAL.woodPale);
  }

  /** A brick house's window, with a planted box under the sill. */
  private windowBox(px: Px, fill: (c: string) => void): void {
    this.brickWall(px, fill);
    const P = this.unit(px);

    for (let y = 2; y <= 8; y++) {
      for (let x = 4; x <= 11; x++) {
        const frame = y === 2 || y === 8 || x === 4 || x === 11;
        if (frame) { P(x, y, y === 8 ? PAL.trimShade : PAL.trimPale); continue; }
        P(x, y, x + y < 11 ? PAL.glassHi : x + y < 15 ? PAL.glassLight : PAL.glass);
      }
    }
    for (let x = 5; x <= 10; x++) P(x, 5, PAL.trimMid);
    for (let y = 3; y <= 7; y++) P(8, y, PAL.trimMid);

    for (let y = 10; y <= 13; y++) {
      for (let x = 3; x <= 12; x++) {
        const edge = x === 3 || x === 12 || y === 13;
        P(x, y, edge ? PAL.woodDeep : y === 10 ? PAL.woodLight : PAL.woodMid);
      }
    }
    // Planting drawn over the sill, so it spills out of the box instead of
    // sitting politely inside it.
    const blooms = ['#e8586a', '#f2c44c', '#f0e8d0', '#c47ad8'];
    for (let i = 0; i < 8; i++) {
      const bx = 4 + i;
      P(bx, 9, PAL.leafMid);
      P(bx, 10, i % 3 === 0 ? PAL.leafDark : PAL.leafDeep);
      if (i % 2 === 0) P(bx, 8, blooms[(i >> 1) % blooms.length]!);
    }
  }

  /**
   * The front door of a house, in three cuts.
   *
   * Every enterable house in the world uses this one tile, so drawing one door
   * meant nine identical front doors along nine different frontages -- and this
   * game has already been told once that its houses look like the same house
   * stamped out. The three cuts are chosen from the door's own position in the
   * map, so a given house always has the same door and no two neighbours have
   * to share one: a striped awning, a fanlight over a painted door, and a
   * pitched hood on brackets.
   *
   * All three sit in the same opening, on the same step, with the light coming
   * from the same corner. What changes is the head above the door and the
   * colour of the leaf, which is as much as reads at sixteen units.
   */
  private porchDoor(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.wall(px, fill, rng, false);
    const P = this.unit(px);
    const cut = variantSeed % 3;

    // The leaf. Its colour is the loudest thing about a frontage at this size.
    const leaf = cut === 0 ? PAL.woodMid : cut === 1 ? '#3f6a80' : '#7a4a6e';
    const leafLit = cut === 0 ? PAL.woodLight : cut === 1 ? '#5c8ba2' : '#9a688c';
    const leafDeep = cut === 0 ? PAL.woodDeep : cut === 1 ? '#27485a' : '#4e2c48';

    if (cut === 0) {
      // Striped awning, with a scalloped hem and the shadow it throws.
      for (let y = 0; y <= 2; y++) {
        for (let x = 1; x <= 14; x++) {
          P(x, y, y === 0 ? PAL.outline : x % 4 < 2 ? PAL.redMid : PAL.trimPale);
        }
      }
      for (let x = 1; x <= 14; x++) if (x % 4 < 2) P(x, 3, PAL.redDark);
      for (let x = 1; x <= 14; x++) P(x, 4, PAL.plasterDark);
    } else if (cut === 1) {
      // Fanlight: a lit half-round over the head, in its own frame.
      for (let x = 3; x <= 12; x++) P(x, 1, PAL.outline);
      for (let y = 2; y <= 3; y++) {
        for (let x = 3; x <= 12; x++) {
          const edge = x === 3 || x === 12;
          P(x, y, edge ? PAL.trimShade : y === 2 ? PAL.glassHi : PAL.glassLight);
        }
      }
      for (const bx of [6, 9]) for (let y = 2; y <= 3; y++) P(bx, y, PAL.trimMid);
      for (let x = 2; x <= 13; x++) { P(x, 4, PAL.trimPale); P(x, 5, PAL.plasterDark); }
    } else {
      // Pitched hood on two brackets.
      for (let x = 2; x <= 13; x++) P(x, 1, PAL.outline);
      for (let x = 2; x <= 13; x++) P(x, 2, PAL.roofLight);
      for (let x = 2; x <= 13; x++) P(x, 3, x % 3 === 0 ? PAL.roofDark : PAL.roofMid);
      for (let x = 1; x <= 14; x++) P(x, 4, PAL.roofDeep);
      for (let x = 1; x <= 14; x++) P(x, 5, PAL.plasterDark);
      for (const bx of [3, 12]) { P(bx, 6, PAL.woodDark); P(bx, 7, PAL.woodDeep); }
    }

    const head = cut === 0 ? 5 : 6;
    for (let y = head; y <= 13; y++) {
      for (let x = 4; x <= 11; x++) {
        const frame = x === 4 || x === 11 || y === head;
        P(x, y, frame ? PAL.trimShade : leaf);
      }
    }
    // Panels, and the light down the leading edge of the leaf.
    for (const [y0, y1] of [[head + 2, head + 4], [head + 5, head + 7]] as [number, number][]) {
      for (let y = y0; y <= Math.min(y1, 12); y++) {
        for (let x = 6; x <= 9; x++) {
          const edge = y === y0 || y === y1 || x === 6 || x === 9;
          P(x, y, edge ? leafDeep : leafLit);
        }
      }
    }
    for (let y = head + 1; y <= 13; y++) P(5, y, leafLit);
    P(10, head + 4, '#e8c24a');                    // handle
    P(10, head + 5, leafDeep);
    // Step, worn pale in the middle where it is walked on.
    for (let x = 3; x <= 12; x++) {
      P(x, 14, x >= 5 && x <= 10 ? PAL.stonePale : PAL.stoneLight);
      P(x, 15, PAL.stoneDark);
    }
  }

  /* -------------------------------------------------------- laboratory */

  /**
   * Laboratory cladding.
   *
   * Flat pale panels with a joint every half tile, a fascia band at the head
   * and a concrete plinth at the foot. Nothing here is lapped, grained or
   * weathered: the building has to read as *built by an institution* from the
   * wall alone, before the player sees the doors or the sign.
   */
  private labWall(px: Px, fill: (c: string) => void, kind: 'plain' | 'window' | 'sign'): void {
    fill(PAL.trimLight);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        let c: string = (x * 7 + y * 5) % 16 === 3 ? PAL.trimPale : PAL.trimLight;
        if (x % 8 === 0) c = PAL.trimShade;
        else if (x % 8 === 1) c = PAL.trimPale;
        P(x, y, c);
      }
    }
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 0, PAL.trimShade);
      P(x, 1, PAL.trimPale);
      P(x, 13, PAL.trimShade);
      P(x, 14, PAL.stoneDark);
      P(x, 15, PAL.outline);
    }

    if (kind === 'window') {
      // Full-height glazing in three lights. Tall and vertical is what makes
      // this a laboratory window and not a cottage one with the sill raised.
      for (let y = 2; y <= 12; y++) {
        for (let x = 2; x <= 13; x++) {
          const frame = y === 2 || y === 12 || x === 2 || x === 13;
          if (frame) { P(x, y, y === 12 ? PAL.trimShade : PAL.steelLight); continue; }
          P(x, y, x + y < 10 ? PAL.glassHi : x + y < 17 ? PAL.glassLight : PAL.glass);
        }
      }
      for (const mx of [6, 10]) for (let y = 3; y <= 11; y++) P(mx, y, PAL.steelLight);
      for (let x = 3; x <= 12; x++) P(x, 5, PAL.steelLight);   // transom
      for (let x = 1; x <= 14; x++) P(x, 13, PAL.steelMid);    // sill
    }

    if (kind === 'sign') {
      for (let y = 3; y <= 10; y++) {
        for (let x = 1; x <= 14; x++) {
          const border = y === 3 || y === 10 || x === 1 || x === 14;
          P(x, y, border ? PAL.outline : PAL.slateDark);
        }
      }
      for (let x = 2; x <= 13; x++) P(x, 4, PAL.slateMid);
      // Two bars of lettering, which is all that is legible at this size and
      // more honest than pretending a word will resolve.
      for (let x = 3; x <= 12; x++) P(x, 6, PAL.trimPale);
      for (let x = 3; x <= 9; x++) P(x, 8, PAL.trimPale);
      for (let x = 1; x <= 14; x++) P(x, 11, PAL.trimShade);
    }
  }

  /**
   * One leaf of the entrance.
   *
   * Two of these side by side, `q` then `u`, make a doorway twice the width of
   * any house door. That width is doing most of the work: a single-tile front
   * door on a wide pale building still reads as somebody's home.
   */
  private labDoor(px: Px, fill: (c: string) => void, right: boolean): void {
    this.labWall(px, fill, 'plain');
    const P = this.unit(px);
    const at = (x: number, y: number, c: string) => P(right ? TILE_SIZE - 1 - x : x, y, c);

    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 2, PAL.outline);
      P(x, 3, PAL.steelLight);
      P(x, 4, PAL.steelMid);
    }
    // Glass shaded in absolute coordinates: both leaves are lit from the same
    // corner, so this must not be mirrored along with the frame.
    // Warm light from inside, which is what tells a player this pane is the way
    // in and the identical panes either side of it are not.
    for (let y = 5; y <= 13; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        P(x, y, x + y < 12 ? '#f6e4bc' : x + y < 20 ? '#e3c48d' : '#c9a469');
      }
    }
    for (let y = 5; y <= 13; y++) {
      at(0, y, PAL.outline);       // outer jamb, heavy
      at(1, y, PAL.outline);
      at(2, y, PAL.steelLight);
      at(15, y, PAL.outline);      // meeting stile, at the seam between the pair
      at(14, y, PAL.steelMid);
    }
    for (let x = 2; x <= 15; x++) { at(x, 8, PAL.steelLight); at(x, 9, PAL.steelDeep); }
    at(4, 8, '#ffffff');
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 14, PAL.steelDeep);
      // A mat on the threshold. Two rows of something that is not glass, right
      // where a player's feet arrive.
      P(x, 15, x % 3 === 0 ? '#6a5f52' : '#877a6a');
    }
  }

  /**
   * Flat roof.
   *
   * A parapet at the back, a sheet deck with broad seams, and a fascia lip at
   * the front. The parapet is what sells it: a pitched roof flattened out just
   * looks like a house squashed, whereas a deck you can see the edge of reads
   * as a building with plant on top of it.
   */
  private labRoof(px: Px, fill: (c: string) => void, vent: boolean): void {
    fill(PAL.stoneMid);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        P(x, y, (x * 3 + y * 7) % 16 === 5 ? PAL.stoneLight : PAL.stoneMid);
      }
    }
    for (let y = 4; y < 13; y += 4) for (let x = 0; x < TILE_SIZE; x++) P(x, y, PAL.stoneDark);
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 0, PAL.outline);
      P(x, 1, PAL.trimPale);
      P(x, 2, PAL.trimMid);
      P(x, 3, PAL.stoneDeep);      // shadow the parapet drops on the deck
      P(x, 13, PAL.trimMid);
      P(x, 14, PAL.stoneDark);
      P(x, 15, PAL.outline);
    }

    if (vent) {
      // Air handling unit. One louvred box is worth more to a roofline than
      // any amount of texture on the deck.
      for (let y = 4; y <= 12; y++) {
        for (let x = 3; x <= 11; x++) {
          const edge = x === 3 || x === 11 || y === 4 || y === 12;
          P(x, y, edge ? PAL.outline : y <= 6 ? PAL.steelLight : PAL.steelMid);
        }
      }
      for (let x = 4; x <= 10; x++) P(x, 5, PAL.steelPale);
      for (let x = 5; x <= 9; x++) P(x, 7, PAL.steelDark);
      for (const ly of [8, 10]) for (let x = 5; x <= 9; x++) P(x, ly, PAL.steelDeep);
      for (let y = 2; y <= 4; y++) { P(12, y, PAL.steelMid); P(13, y, PAL.steelDark); }
      for (let y = 6; y <= 12; y++) { P(12, y, PAL.stoneDeep); P(13, y, PAL.stoneDark); }
    }
  }

  /* ----------------------------------------------------------- interior */

  /**
   * Floorboards.
   *
   * Long boards with a seam every four rows and staggered ends, which is what
   * a floor looks like from above. The old version textured every pixel and
   * the result read as woodchip rather than as a room.
   */
  private woodFloor(px: Px, fill: (c: string) => void, rng: Rng): void {
    // A near-white highlight on top of every board and a dark seam under it put
    // a hard light/dark pair on a four-unit repeat, and a room floored with them
    // read as a set of venetian blinds. One seam per board, one step down from
    // the board it parts, is all a floor needs at this size.
    const boardA = '#e0c69c';
    const boardB = '#d7bb8e';
    const seam = '#bd9d72';
    const grain = '#e8d2ac';

    fill(boardA);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      const board = Math.floor(y / 4);
      const base = board % 2 === 0 ? boardA : boardB;
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y % 4 === 3) { P(x, y, seam); continue; }
        // A little grain, always along the board rather than across it.
        P(x, y, (x * 5 + board * 7) % 11 === 0 ? grain : base);
      }
    }
    void rng;
  }

  /**
   * Rug.
   *
   * One tile of a larger rug: a woven field with a border stripe, so a block
   * of these reads as a single mat rather than as a grid of coasters.
   */
  private rug(px: Px, fill: (c: string) => void): void {
    // The old mat was a dark maroon with a dark motif on it, which at the size
    // it is seen came out as one flat bruise on the floorboards. A woven rug
    // wants a *pale* figure on a warm ground: the cream lozenges do the reading
    // and the weave underneath only has to give the pile its direction.
    const ground = '#9e5460';
    const weft = '#b46a72';
    const shade = '#7b3d4a';
    const cream = '#e7d2ae';

    fill(ground);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        P(x, y, (x + y) % 4 === 0 ? weft : (x + y) % 8 === 4 ? shade : ground);
      }
    }
    // No border on the tile itself. A mat is several of these side by side, and
    // a border drawn per tile turns one rug into a grid of doormats. The figure
    // is on an eight-unit lattice that divides the tile, so it carries across
    // the seam and the whole thing reads as one piece.
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const d = Math.abs((x % 8) - 4) + Math.abs((y % 8) - 4);
        if (d === 3) P(x, y, cream);
        else if (d < 2) P(x, y, d === 0 ? cream : shade);
      }
    }
  }

  /**
   * Interior wall: one papered colour, one quiet motif, nothing else.
   *
   * The old wall carried a dado rail and a band of dark panelling along its
   * bottom edge. That is fine for the one row of wall at the back of a room and
   * ruinous everywhere else: a room is walled on all four sides, so the left and
   * right columns stacked that band once per tile and each side of every
   * interior turned into a brown ladder. Whatever is drawn here is repeated in
   * both directions, so it has to be *uniform* in both directions.
   *
   * So the tile is flat. A papered ground, a pinstripe on an eight-unit repeat
   * and a small stencil between the stripes -- one step either side of the base
   * colour, no more. It is a step darker and a good deal greyer than either
   * floor in the game, which is what gives the room its edge without a line
   * being drawn for it, and it sits far enough back that a character standing
   * against it keeps their silhouette.
   */
  private interiorWall(px: Px, fill: (c: string) => void, rng: Rng): void {
    const base = '#b9ae9a';
    const stripe = '#c6bca9';
    const motif = '#aa9f8b';

    fill(base);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (x % 8 === 0) { P(x, y, stripe); continue; }
        // A four-unit stencil, centred between the stripes. Both repeats divide
        // sixteen, so the paper meets itself exactly at every seam.
        const d = Math.abs((x % 8) - 4) + Math.abs((y % 8) - 4);
        if (d === 2) P(x, y, motif);
        else if (d === 0) P(x, y, stripe);
      }
    }
    void rng;
  }

  /**
   * Service counter.
   *
   * A worktop with a lit front edge and a shadow under it, so the thing
   * between the player and the person behind it looks like furniture.
   *
   * Runs the full width so a row of them fuses into one counter, and stops one
   * row short of the bottom so the contact shadow has floor to fall on.
   */
  private counter(px: Px): void {
    const P = this.unit(px);
    // The old front carried a diagonal grain on a six-unit repeat, which at
    // this size read as hatching and turned a service counter into a packing
    // crate. Framed panels on a four-unit repeat are what joinery actually
    // looks like, and they wrap the tile so a run of counters is one counter.
    for (let y = 0; y <= 15; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y <= 1) P(x, y, PAL.woodPale);                 // worktop
        else if (y === 2) P(x, y, PAL.woodDeep);           // its shadowed lip
        else if (y === 3) P(x, y, PAL.woodLight);          // lit rail below it
        else P(x, y, PAL.woodMid);
      }
    }
    // Framed panels: a sunk face with a lit head and a shadowed foot.
    for (let px0 = 0; px0 < TILE_SIZE; px0 += 4) {
      for (let y = 6; y <= 12; y++) {
        for (let x = px0 + 1; x <= px0 + 2; x++) {
          P(x, y, y === 6 ? PAL.woodDeep : y === 12 ? PAL.woodLight : PAL.woodDark);
        }
      }
    }
    for (let x = 0; x < TILE_SIZE; x++) { P(x, 13, PAL.woodDark); P(x, 14, PAL.woodDeep); }
    this.footShadow(P, 0, TILE_SIZE - 1, 15);
  }





  /**
   * Stairs.
   *
   * A flight has to say two things at once: this is floor, walk onto it -- and
   * it goes somewhere. The old tile said only the first. Four evenly lit treads
   * ran flat to the top edge of the cell, so a stairway read as a step ladder
   * lying on the floorboards and stopping dead where the tile did.
   *
   * So the flight is lit where it meets the room and falls away into black
   * inside its own cell, dark by about halfway up. The treads keep their
   * structure the whole way -- riser, nosing, tread -- and are simply
   * multiplied down towards nothing as they recede, which is what makes the
   * darkness read as distance rather than as a black rectangle painted on. A
   * jamb down each side turns the flight into an opening in the room instead of
   * an object standing in it.
   */
  private stairs(px: Px, fill: (c: string) => void): void {
    const P = this.unit(px);
    fill('#05070b');

    /** One colour taken down towards black. */
    const dim = (hex: string, k: number): string => {
      const n = parseInt(hex.slice(1), 16);
      const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
      return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
    };

    // How much light reaches a row: full where the flight meets the room, half
    // gone by the middle of the cell, nothing at all a quarter from the top.
    // The bottom tread has to stay bright or the tile reads as a hole in the
    // floorboards rather than as a stairway with its lights off further up.
    const lit = (y: number): number => {
      const t = Math.max(0, Math.min(1, (y - 3) / 8));
      return Math.pow(t, 1.25);
    };

    // Four treads, four units each: the riser in its own shadow, the nosing
    // catching the light off it, then the tread falling away behind it.
    for (let y = 0; y < TILE_SIZE; y++) {
      const step = y % 4;
      const base = step === 0 ? PAL.stoneDeep
        : step === 1 ? PAL.trimPale
          : step === 2 ? PAL.stonePale : PAL.stoneLight;
      const k = lit(y);
      const tread = dim(base, k);
      for (let x = 1; x < TILE_SIZE - 1; x++) P(x, y, tread);
      // Jambs. The left one is turned into the light, the right one away from
      // it, so the shaft has a direction rather than two identical black lines.
      // Both keep a floor under the fade: a pair of faint walls running up into
      // the dark is what gives the darkness a shape, and without them the top
      // of the tile is an unreadable black square sitting on the floorboards.
      P(0, y, dim(PAL.stoneDark, Math.max(k * 0.6, 0.15)));
      P(TILE_SIZE - 1, y, dim(PAL.stoneDeep, Math.max(k * 0.4, 0.13)));
    }
  }

  private puddle(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.path(px, fill, rng);
    for (let y = 9; y < 25; y++) {
      const w = 12 - Math.abs(y - 17);
      for (let x = 16 - w; x <= 16 + w; x++) {
        px(x, y, hash2(x, y, 109) > 0.6 ? PAL.waterLight : PAL.waterMid);
      }
    }
    for (let x = 6; x < 26; x++) px(x, 9 + Math.round(Math.sin(x * 0.4) * 1.2), PAL.waterFoam);
    for (let i = 0; i < 4; i++) px(12 + rng.below(10), 12 + rng.below(8), PAL.waterFoam);
  }

  private bridge(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.woodMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 6), y, 113);
        px(x, y, n > 0.65 ? PAL.woodLight : n < 0.3 ? PAL.woodDark : PAL.woodMid);
      }
    }
    for (let x = 0; x < TILE_PX; x += 6) {
      for (let y = 0; y < TILE_PX; y++) { px(x, y, PAL.woodDeep); px(x + 1, y, PAL.woodPale); }
      px(x + 3, 5, PAL.stoneLight); px(x + 3, TILE_PX - 6, PAL.stoneLight);
    }
    for (let x = 0; x < TILE_PX; x++) {
      px(x, 0, PAL.woodDeep); px(x, 1, PAL.woodPale); px(x, 2, PAL.woodLight);
      px(x, TILE_PX - 3, PAL.woodDark); px(x, TILE_PX - 2, PAL.woodDeep); px(x, TILE_PX - 1, PAL.outline);
    }
    void rng;
  }

  /**
   * A bed, in two vertical halves.
   *
   * Drawn on the floor rather than replacing it -- the frame is fourteen units
   * wide and everything outside it is left clear, so the boards or the tile the
   * map actually has run right up to the bed rail. The head half carries the
   * pillow and the turned-down sheet, which is the pair of shapes that says
   * "bed" from across a 12-tile room faster than any amount of blanket detail.
   *
   * The shadow is a column down the right rather than a row along the bottom:
   * the halves stack vertically, and a shadow under the head half would fall
   * across the foot half instead of onto the floor.
   */
  private bed(px: Px, head: boolean): void {
    const P = this.unit(px);
    const L = 1, R = 14;

    // The foot half keeps its bottom row clear; that is where its shadow goes,
    // and a shadow drawn over the frame instead of over the floor is just a
    // dirty stripe on the woodwork.
    const bottom = head ? TILE_SIZE - 1 : 14;
    for (let y = 0; y <= bottom; y++) {
      for (let x = L; x <= R; x++) P(x, y, PAL.woodDark);
      P(L, y, PAL.outline); P(R, y, PAL.outline);
      P(R + 1, y, PAL.contact);
    }

    if (head) {
      // Headboard.
      for (let y = 0; y <= 2; y++) for (let x = L; x <= R; x++) P(x, y, y === 0 ? PAL.outline : PAL.woodDeep);
      // Pillow.
      for (let y = 3; y <= 6; y++) {
        for (let x = L + 2; x <= R - 2; x++) {
          P(x, y, y === 3 || y === 6 ? PAL.trimShade : (x + y) % 5 === 0 ? PAL.trimMid : PAL.trimPale);
        }
      }
      // Turned-down sheet under the pillow.
      for (let y = 7; y < TILE_SIZE; y++) {
        for (let x = L + 1; x <= R - 1; x++) {
          P(x, y, y <= 8 ? PAL.trimLight : y % 3 === 0 ? '#5f7fb0' : '#7196c8');
        }
      }
    } else {
      // Blanket, with a fold line and a lit top edge.
      for (let y = 0; y <= 12; y++) {
        for (let x = L + 1; x <= R - 1; x++) P(x, y, y % 3 === 0 ? '#5f7fb0' : '#7196c8');
      }
      for (let x = L + 1; x <= R - 1; x++) P(x, 0, '#8fb0dc');
      // Footboard, then the floor showing under it.
      for (let x = L; x <= R; x++) { P(x, 13, PAL.woodDeep); P(x, 14, PAL.outline); }
      this.footShadow(P, L, R + 1, 15);
    }
  }

  /** A shelf of books: the cheapest way to make a room look lived in. */
  /* --------------------------------------------------- house furniture */

  /**
   * Dining table.
   *
   * Drawn as a top with a lit edge and two legs under it. Furniture in the
   * reference art is always *lit from the same corner as everything else*,
   * which is what stops a room reading as a collection of stickers.
   *
   * Outlined hard all the way round, which it did not need back when it was
   * stamped onto a matching cream field: standing on the laboratory's white
   * tile, a mid-brown edge alone leaves the top with no silhouette at all.
   */
  private table(px: Px): void {
    const P = this.unit(px);
    // Top, in three boards running across the table. The old version put a
    // scattered pale grain on it, which at this size collapsed into a single
    // diagonal streak and read as glare on a sheet of glass.
    for (let y = 2; y <= 10; y++) {
      for (let x = 1; x <= 14; x++) {
        const edge = y === 2 || x === 1 || x === 14;
        P(x, y, edge ? PAL.outline : y % 3 === 1 ? PAL.woodMid : PAL.woodLight);
      }
    }
    for (let x = 2; x <= 13; x++) P(x, 3, PAL.woodPale);     // lit front of the top
    for (let y = 3; y <= 9; y++) P(2, y, PAL.woodPale);      // and its lit left edge
    for (let x = 2; x <= 13; x++) P(x, 9, PAL.woodDark);
    for (let x = 2; x <= 13; x++) P(x, 10, PAL.woodDeep);    // apron under the top
    for (let x = 1; x <= 14; x++) P(x, 11, PAL.outline);
    // Legs, and the shadow they cast.
    for (const lx of [3, 11]) {
      for (let y = 12; y <= 13; y++) { P(lx, y, PAL.outline); P(lx + 1, y, PAL.woodDark); }
    }
    this.footShadow(P, 1, 14, 14);
  }

  /**
   * A chair, seen from the front: back, cushioned seat, two legs.
   *
   * The seat is upholstered rather than more of the same brown. A chair drawn
   * in one wood tone next to a table drawn in the same wood tone is a brown
   * blob beside a brown blob; one patch of cloth is all it takes to separate
   * them across a room.
   */
  private chair(px: Px): void {
    const P = this.unit(px);
    const cloth = '#8c5f74';
    const clothLit = '#a9788c';

    // Back: two stiles with rails between them.
    for (let y = 1; y <= 7; y++) {
      for (let x = 4; x <= 11; x++) {
        P(x, y, y === 1 || x === 4 || x === 11 ? PAL.outline : PAL.woodMid);
      }
    }
    for (let x = 5; x <= 10; x++) { P(x, 2, PAL.woodPale); P(x, 5, PAL.woodDark); }
    for (let y = 3; y <= 4; y++) for (let x = 6; x <= 9; x++) P(x, y, PAL.woodDark);
    for (let y = 3; y <= 4; y++) P(5, y, PAL.woodLight);

    // Seat.
    for (let y = 8; y <= 10; y++) {
      for (let x = 3; x <= 12; x++) {
        P(x, y, x === 3 || x === 12 ? PAL.outline : y === 8 ? clothLit : cloth);
      }
    }
    for (let x = 4; x <= 11; x++) P(x, 10, '#6b4356');
    for (let x = 3; x <= 12; x++) P(x, 11, PAL.outline);
    for (const lx of [4, 11]) {
      for (let y = 12; y <= 13; y++) { P(lx, y, PAL.outline); }
      P(lx === 4 ? 5 : 10, 12, PAL.woodDark);
    }
    this.footShadow(P, 3, 12, 14);
  }

  /** Television on a stand, with the screen catching the window. */
  private television(px: Px): void {
    const P = this.unit(px);
    // Aerials.
    P(5, 0, '#4a4a58'); P(4, 1, '#4a4a58');
    P(10, 0, '#4a4a58'); P(11, 1, '#4a4a58');
    // Casing.
    for (let y = 2; y <= 11; y++) {
      for (let x = 2; x <= 13; x++) {
        const edge = y === 2 || y === 11 || x === 2 || x === 13;
        P(x, y, edge ? '#2c2c36' : '#41414f');
      }
    }
    // Screen.
    for (let y = 4; y <= 9; y++) {
      for (let x = 4; x <= 10; x++) {
        P(x, y, x + y < 10 ? '#9fc8dc' : x + y < 14 ? '#6f9cba' : '#4f7695');
      }
    }
    P(12, 5, '#c8c8d4'); P(12, 7, '#c8c8d4');
    // Stand.
    for (let x = 5; x <= 10; x++) P(x, 12, '#3a3a46');
    for (let x = 3; x <= 12; x++) P(x, 13, '#41414f');
    this.footShadow(P, 3, 12, 14);
  }

  /** Pot plant. Every house in the reference art has one. */
  private plant(px: Px): void {
    const P = this.unit(px);

    // Six fronds arching out of one crown rather than two thin sprigs. The
    // plant is the only soft shape in a room full of boxes, so it has to have
    // enough mass to be one -- and the ones on the outside are drawn a step
    // darker, which is what gives the crown a front and a back.
    const frond = (x0: number, y0: number, dx: number, len: number, tip: string) => {
      for (let i = 0; i < len; i++) {
        const x = x0 + Math.round(dx * i);
        const y = y0 - i;
        P(x, y, i >= len - 2 ? tip : i < 2 ? PAL.leafDeep : PAL.leafMid);
        P(x, y + 1, PAL.leafDeep);
      }
    };
    frond(7, 8, -1.0, 5, PAL.leafLight);
    frond(8, 8, 1.0, 5, PAL.leafLight);
    frond(7, 8, -0.5, 6, PAL.leafHi);
    frond(8, 8, 0.5, 6, PAL.leafHi);
    frond(7, 8, -1.4, 4, PAL.leafDark);
    frond(8, 8, 1.4, 4, PAL.leafDark);
    for (let i = 0; i < 7; i++) P(7 + (i % 2), 8 - i, i > 4 ? PAL.leafTip : PAL.leafLight);

    // Pot: a rim standing proud of a tapered body, outlined so the terracotta
    // keeps its shape against a pale floor.
    for (let x = 3; x <= 12; x++) {
      P(x, 9, PAL.outline);
      P(x, 10, x < 6 ? '#c07a50' : x > 9 ? '#8a4830' : '#ac6642');
    }
    P(3, 10, PAL.outline); P(12, 10, PAL.outline);
    for (let y = 11; y <= 14; y++) {
      const inset = y >= 13 ? 1 : 0;
      for (let x = 4 + inset; x <= 11 - inset; x++) {
        const edge = x === 4 + inset || x === 11 - inset || y === 14;
        P(x, y, edge ? PAL.outline : x < 6 ? '#b06a44' : x > 9 ? '#7a4028' : '#96543a');
      }
    }
    this.footShadow(P, 4, 11, 15);
  }

  /** Fridge: a tall pale box with a seam and a handle. */
  private fridge(px: Px): void {
    const P = this.unit(px);
    for (let y = 1; y <= 14; y++) {
      for (let x = 1; x <= 14; x++) {
        // A pale box on a pale floor is nothing without a hard border.
        const edge = x === 1 || x === 14 || y === 1 || y === 14;
        P(x, y, edge ? PAL.outline : x < 4 ? '#e4e8ee' : x > 11 ? '#c3c9d4' : '#d6dbe4');
      }
    }
    for (let x = 2; x <= 13; x++) P(x, 6, '#8f96a4');
    for (let y = 3; y <= 5; y++) P(12, y, '#8f96a4');
    for (let y = 8; y <= 11; y++) P(12, y, '#8f96a4');
    this.footShadow(P, 1, 14, 15);
  }

  /** Sink: worktop, basin, tap. */
  private sink(px: Px): void {
    this.counter(px);
    const P = this.unit(px);
    for (let y = 2; y <= 8; y++) {
      for (let x = 3; x <= 12; x++) {
        const edge = y === 2 || y === 8 || x === 3 || x === 12;
        P(x, y, edge ? '#77808c' : y < 5 ? '#aab3bf' : '#8e97a4');
      }
    }
    P(7, 5, '#c8ced8'); P(8, 5, '#c8ced8');
    // Tap.
    P(7, 1, '#c8ced8'); P(8, 1, '#aab3bf'); P(8, 2, '#c8ced8');
  }

  /** Stove: four rings and an oven door. */
  private stove(px: Px): void {
    this.counter(px);
    const P = this.unit(px);
    for (let y = 1; y <= 8; y++) {
      for (let x = 2; x <= 13; x++) {
        P(x, y, y === 1 || y === 8 || x === 2 || x === 13 ? '#4a4a56' : '#5e5e6c');
      }
    }
    for (const [cx, cy] of [[5, 3], [10, 3], [5, 6], [10, 6]] as [number, number][]) {
      P(cx, cy, '#2c2c36'); P(cx + 1, cy, '#2c2c36');
      P(cx, cy + 1, '#2c2c36'); P(cx + 1, cy + 1, '#2c2c36');
      P(cx, cy, '#3f3f4c');
    }
    for (let x = 4; x <= 11; x++) P(x, 11, '#8f96a4');
  }

  /** Interior window: a frame, glass, and a curtain either side. */
  private interiorWindow(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.interiorWall(px, fill, rng);
    const P = this.unit(px);

    // Curtain pole, then the reveal: the wall is thick, so the glass is set
    // back and the head and the left jamb throw a shadow across it.
    for (let x = 1; x <= 14; x++) P(x, 1, PAL.woodDark);
    for (let x = 1; x <= 14; x++) P(x, 0, PAL.woodMid);

    for (let y = 2; y <= 9; y++) {
      for (let x = 3; x <= 12; x++) {
        const frame = y === 2 || y === 9 || x === 3 || x === 12;
        if (frame) { P(x, y, y === 9 ? PAL.trimShade : PAL.trimPale); continue; }
        P(x, y, x + y < 10 ? PAL.glassHi : x + y < 15 ? PAL.glassLight : PAL.glass);
      }
    }
    for (let x = 4; x <= 11; x++) P(x, 3, '#4e78a0');
    for (let y = 3; y <= 8; y++) P(4, y, '#5a86ae');
    // Glazing bars.
    for (let x = 4; x <= 11; x++) P(x, 6, PAL.trimMid);
    for (let y = 3; y <= 8; y++) P(8, y, PAL.trimMid);
    // Sill, standing proud, with the wall's own shadow under it.
    for (let x = 2; x <= 13; x++) { P(x, 10, PAL.trimPale); P(x, 11, '#8f8672'); }

    // Curtains, gathered at each side: three folds apiece rather than one flat
    // stripe, which is what made them read as painted stripes on the wall.
    const folds = ['#c26e86', '#a8546c', '#8c3f56'];
    for (let y = 1; y <= 10; y++) {
      for (let i = 0; i < 3; i++) {
        P(1 + i, y, folds[i]!);
        P(14 - i, y, folds[i === 0 ? 2 : i === 2 ? 1 : 2]!);
      }
    }
    for (let i = 0; i < 3; i++) { P(1 + i, 10, '#6f2f44'); P(14 - i, 10, '#6f2f44'); }
  }

  /**
   * Waystation floor: pale tiles, laid square.
   *
   * Every public building in the reference art has a hard, light floor and
   * every house has boards. It is the fastest way to tell a player which kind
   * of room they have walked into, before they have read a word.
   */
  private civicFloor(px: Px, fill: (c: string) => void): void {
    fill(PAL.plasterPale);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const half = (x < 8) === (y < 8);
        P(x, y, half ? PAL.plasterPale : '#eef1f6');
      }
    }
    // Grout, and a highlight along the top of each tile.
    for (let i = 0; i < TILE_SIZE; i++) {
      P(i, 0, '#cfd3dc');
      P(0, i, '#cfd3dc');
      P(i, 8, '#cfd3dc');
      P(8, i, '#cfd3dc');
      P(i, 1, '#fbfcfe');
      P(i, 9, '#fbfcfe');
    }
  }

  /* ------------------------------------------------- laboratory fittings */

  /**
   * A bank of machines along a wall.
   *
   * Drawn full width with everything on an eight-unit repeat, so a run of them
   * reads as one continuous installation rather than as cabinets parked side by
   * side. The lit indicator band gets the row nearest eye level and nothing
   * else on the tile competes with it: those lamps are the only part a player
   * glancing at the room will actually register.
   */
  private labMachines(px: Px): void {
    const P = this.unit(px);
    for (let y = 0; y <= 14; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        P(x, y, x % 8 === 0 ? PAL.steelDark : x % 8 === 1 ? PAL.steelLight : PAL.steelMid);
      }
    }
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 0, PAL.outline);
      P(x, 1, PAL.steelPale);
      P(x, 2, PAL.steelDark);
    }
    for (let y = 3; y <= 6; y++) for (let x = 0; x < TILE_SIZE; x++) P(x, y, PAL.panelInk);
    const lamps = ['#7cf08a', '#f2d45c', '#ff7a6a', '#6cc8f0'];
    for (let i = 0; i < 8; i++) {
      const c = lamps[i % lamps.length]!;
      P(1 + i * 2, 4, c);
      P(1 + i * 2, 5, mixDown(c));
    }
    // Readout glass, with the trace kept to one bright row.
    for (let y = 8; y <= 10; y++) for (let x = 0; x < TILE_SIZE; x++) P(x, y, PAL.steelDeep);
    for (let x = 0; x < TILE_SIZE; x++) if (x % 8 < 5) P(x, 9, '#8fd8f0');
    for (let y = 12; y <= 13; y++) {
      for (let x = 0; x < TILE_SIZE; x++) P(x, y, x % 4 === 0 ? PAL.steelDark : PAL.steelMid);
    }
    for (let x = 0; x < TILE_SIZE; x++) P(x, 14, PAL.outline);
    this.footShadow(P, 0, TILE_SIZE - 1, 15);
  }

  /** A console with a screen: one object, outlined, standing on the floor. */
  private labConsole(px: Px): void {
    const P = this.unit(px);
    for (let y = 2; y <= 14; y++) {
      for (let x = 1; x <= 14; x++) {
        const edge = x === 1 || x === 14 || y === 2 || y === 14;
        P(x, y, edge ? PAL.outline : x < 4 ? PAL.steelLight : x > 11 ? PAL.steelDark : PAL.steelMid);
      }
    }
    for (let y = 4; y <= 9; y++) {
      for (let x = 3; x <= 12; x++) {
        const bezel = y === 4 || y === 9 || x === 3 || x === 12;
        P(x, y, bezel ? PAL.panelInk : '#16465e');
      }
    }
    for (let x = 4; x <= 11; x++) P(x, 5, '#2f7a96');
    // A trace across the screen. A blank screen reads as a cupboard door.
    const trace = [7, 6, 7, 8, 6, 5, 7, 8];
    for (let i = 0; i < 8; i++) P(4 + i, trace[i]!, '#7cf0d8');
    for (let x = 3; x <= 12; x++) { P(x, 11, PAL.steelPale); P(x, 12, PAL.steelDark); }
    for (let x = 3; x <= 12; x += 2) P(x, 11, PAL.steelDark);
    this.footShadow(P, 1, 14, 15);
  }

  /**
   * Specimen tank.
   *
   * There is something in it. An empty cylinder of green water reads as a
   * fridge with the door off; the silhouette and two lit eyes are what make
   * the room a laboratory that keeps living things.
   */
  private specimenTank(px: Px): void {
    const P = this.unit(px);
    for (let y = 12; y <= 14; y++) {
      for (let x = 2; x <= 13; x++) {
        P(x, y, y === 12 ? PAL.steelLight : y === 13 ? PAL.steelMid : PAL.steelDark);
      }
    }
    for (let y = 2; y <= 12; y++) {
      for (let x = 4; x <= 11; x++) {
        P(x, y, x <= 5 ? '#a8ecdc' : x >= 10 ? '#2f8878' : '#5fc4ae');
      }
    }
    for (let y = 6; y <= 10; y++) {
      for (let x = 6; x <= 9; x++) {
        if ((y === 6 || y === 10) && (x === 6 || x === 9)) continue;
        P(x, y, '#2a3a44');
      }
    }
    P(7, 7, '#8fe8ff'); P(9, 7, '#8fe8ff');
    P(5, 9, '#dffaf2'); P(6, 4, '#dffaf2'); P(10, 6, '#dffaf2');
    for (let x = 3; x <= 12; x++) { P(x, 1, PAL.outline); P(x, 2, PAL.steelPale); P(x, 3, PAL.steelMid); }
    for (let x = 4; x <= 11; x++) { P(x, 11, PAL.steelMid); P(x, 12, PAL.steelDark); }
    for (let y = 2; y <= 12; y++) { P(3, y, PAL.outline); P(12, y, PAL.outline); }
    // The plinth needs its own border now that real floor runs up to it.
    for (let y = 12; y <= 14; y++) { P(2, y, PAL.outline); P(13, y, PAL.outline); }
    for (let x = 2; x <= 13; x++) P(x, 14, PAL.outline);
    this.footShadow(P, 2, 13, 15);
  }

  /**
   * A run of bench: cupboards under, worktop over, glassware standing on it.
   *
   * The pale band the glassware stands on is the worktop seen receding, not a
   * background -- it used to be plaster, which is the colour of a wall, and
   * that is precisely why a bench in the middle of the room looked like a
   * cutting of wall laid on the floor. Steel, and drawn explicitly.
   */
  private workbench(px: Px): void {
    const P = this.unit(px);
    for (let y = 0; y <= 3; y++) {
      for (let x = 0; x < TILE_SIZE; x++) P(x, y, x % 8 === 0 ? PAL.steelMid : PAL.steelLight);
    }
    for (let y = 6; y <= 13; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        P(x, y, x % 8 === 0 ? PAL.steelDark : x % 8 === 1 ? PAL.steelLight : PAL.steelMid);
      }
    }
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 0, PAL.outline);        // far edge of the top
      P(x, 4, PAL.steelPale);
      P(x, 5, PAL.steelLight);
      P(x, 6, PAL.steelDeep);      // shadow under the front lip of the top
      P(x, 14, PAL.outline);
    }
    this.footShadow(P, 0, TILE_SIZE - 1, 15);
    for (let x = 2; x <= 5; x++) P(x, 10, PAL.steelDark);
    for (let x = 10; x <= 13; x++) P(x, 10, PAL.steelDark);
    // A flask, a microscope and a stack of paper. Three distinct shapes beat
    // any amount of clutter: clutter at this size is just noise on the top.
    for (let y = 1; y <= 3; y++) {
      for (let x = 2; x <= 4; x++) P(x, y, y === 1 ? '#dff2fa' : x === 2 ? '#8fd8b0' : '#4fa878');
    }
    P(3, 0, '#dff2fa');
    for (let y = 0; y <= 3; y++) P(11, y, PAL.steelDeep);
    P(10, 0, PAL.steelDeep); P(10, 1, '#6c7690');
    for (let x = 9; x <= 12; x++) P(x, 3, PAL.panelInk);
    for (let x = 6; x <= 8; x++) { P(x, 2, PAL.plasterPale); P(x, 3, PAL.steelLight); }
  }

  /**
   * Laboratory floor, with a cable run taped across it.
   *
   * The cable is drawn dead straight and unbroken. Anything wavy at sixteen
   * units across stops being a cable and becomes lint on the floor.
   */
  private labFloor(px: Px, fill: (c: string) => void): void {
    fill('#e2e8e6');
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) P(x, y, (x < 8) === (y < 8) ? '#e2e8e6' : '#d6dedb');
    }
    for (let i = 0; i < TILE_SIZE; i++) {
      P(i, 0, '#c3ccc9'); P(0, i, '#c3ccc9');
      P(i, 8, '#c3ccc9'); P(8, i, '#c3ccc9');
    }
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 10, '#6c7690');
      P(x, 11, PAL.steelDeep);
      P(x, 12, PAL.panelInk);
      P(x, 13, '#8f9aa8');
    }
    for (let x = 2; x < TILE_SIZE; x += 8) {
      for (let y = 9; y <= 13; y++) { P(x, y, PAL.steelMid); P(x + 1, y, PAL.steelDark); }
    }
  }

  /* --------------------------------------------- more house and shop kit */

  /** Two-seat sofa, seen from the front, to face the television across a rug. */
  /**
   * Sofa.
   *
   * The shape has to do the work. A padded rectangle with a border round it is
   * a window -- which is exactly what the first version of this read as in a
   * room that also had windows in it. So: arms standing proud at the sides, a
   * back above them, and the seat sitting lower and lighter between the two,
   * with a hard shadow where the back meets it.
   */
  private sofa(px: Px): void {
    const P = this.unit(px);

    const deep = '#2a4f51';
    const mid = '#48787a';
    const light = '#6fa3a1';
    const pale = '#93c2bd';

    // Back, set between the arms and darker than everything in front of it.
    for (let x = 3; x <= 12; x++) P(x, 1, PAL.outline);
    for (let y = 2; y <= 7; y++) for (let x = 3; x <= 12; x++) P(x, y, mid);
    for (let x = 3; x <= 12; x++) P(x, 2, light);
    for (let y = 2; y <= 7; y++) P(8, y, deep);

    // Arms: two lumps standing proud at the sides, a full tone lighter.
    for (let x = 1; x <= 2; x++) P(x, 3, PAL.outline);
    for (let x = 13; x <= 14; x++) P(x, 3, PAL.outline);
    for (let y = 4; y <= 14; y++) { P(0, y, PAL.outline); P(15, y, PAL.outline); }
    for (let y = 4; y <= 12; y++) {
      P(1, y, pale); P(2, y, light);
      P(13, y, mid); P(14, y, deep);
    }

    // Seat, lower and lighter, under a hard shadow from the back.
    for (let x = 3; x <= 12; x++) P(x, 8, deep);
    for (let y = 9; y <= 12; y++) for (let x = 3; x <= 12; x++) P(x, y, light);
    for (let x = 3; x <= 12; x++) P(x, 9, pale);
    for (let y = 9; y <= 12; y++) P(8, y, mid);

    for (let x = 1; x <= 14; x++) { P(x, 13, deep); P(x, 14, PAL.outline); }
    this.footShadow(P, 0, TILE_SIZE - 1, 15);
  }

  /**
   * Shop shelving, stocked.
   *
   * Steel uprights on the tile edge and boards running the full width, so a row
   * of these fuses into one gondola. The goods are blocks of flat colour with a
   * lit top: at this size a "product" is a coloured rectangle, and pretending
   * otherwise just makes the shelf muddy.
   *
   * The pale field behind the goods is the unit's own back board, not a floor
   * colour: leave it out and the stock reads as tins hovering in mid-air. It
   * stops a row short of the bottom so the shadow lands on the map's floor.
   */
  private shopShelf(px: Px): void {
    const P = this.unit(px);
    for (let y = 0; y <= 14; y++) for (let x = 0; x < TILE_SIZE; x++) P(x, y, PAL.plasterMid);

    const goods = ['#d8564a', '#4f8fd8', '#f2c44c', '#6ac48a', '#c47ad8', '#e8834a'];
    for (let s = 0; s < 3; s++) {
      const board = 3 + s * 5;
      let x = 2;
      let i = s * 3;
      while (x < TILE_SIZE) {
        const w = 2 + (i % 2);
        const h = 2 + (i % 3);
        const c = goods[(i + s) % goods.length]!;
        for (let k = 0; k < w && x + k < TILE_SIZE; k++) {
          for (let y = Math.max(0, board - h); y < board; y++) {
            P(x + k, y, y === board - h ? PAL.plasterPale : k === w - 1 ? mixDown(c) : c);
          }
        }
        x += w + 1;
        i++;
      }
      for (let bx = 0; bx < TILE_SIZE; bx++) {
        P(bx, board, PAL.stoneDeep);
        P(bx, board + 1, PAL.stoneLight);
      }
    }
    for (let y = 0; y <= 14; y++) { P(0, y, PAL.outline); P(1, y, PAL.stoneLight); }
    this.footShadow(P, 0, TILE_SIZE - 1, 15);
  }

  /* ----------------------------------------------------- town dressing */

  /**
   * A planted bed.
   *
   * Kerbed front and back only, so a row of them joins into one long border.
   * The blooms sit on a wrapping lattice rather than being scattered: planting
   * in rows reads as a garden, and the same flowers thrown at random read as
   * litter.
   *
   * The soil is the object, so it fills the cell -- but only down to the kerb,
   * with the bottom row left for the shadow the raised bed casts on whatever it
   * is standing in.
   */
  private flowerBed(px: Px): void {
    const P = this.unit(px);

    // Soil, and the planting that covers most of it. The old bed scattered
    // eight single-pixel blooms in four colours across bare earth and read, at
    // the size it is actually seen, as confetti dropped on a brown rectangle.
    // A bed is mostly *leaf*: a low mound of foliage with a few flowers showing
    // through it, and no more than two flower colours to a bed.
    for (let y = 2; y <= 12; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const d = (x * 5 + y * 3) % 16;
        P(x, y, d === 2 ? PAL.dirtMid : d === 9 ? PAL.dirtDeep : PAL.dirtDark);
      }
    }

    // Two rows of clumps, on an eight-unit repeat so a run of beds keeps its
    // rhythm across the seam instead of bunching wherever two tiles meet.
    const clump = (cx: number, cy: number, bloom: string) => {
      for (let y = cy - 1; y <= cy + 2; y++) {
        for (let x = cx - 2; x <= cx + 2; x++) {
          const r = Math.abs(x - cx) + Math.abs(y - cy);
          if (r > 3) continue;
          P(x, y, y >= cy + 1 ? PAL.leafDeep : r <= 1 ? PAL.leafMid : PAL.leafDark);
        }
      }
      P(cx - 1, cy - 1, PAL.leafLight);
      P(cx, cy - 1, bloom);
      P(cx + 1, cy, bloom);
      P(cx - 1, cy + 1, mixDown(bloom));
    };
    for (let i = 0; i < 2; i++) {
      clump(3 + i * 8, 5, '#e8586a');
      clump(7 + i * 8, 10, '#f2c44c');
    }

    // Kerb: a lit capping stone front and back only, so a row joins into one
    // long border rather than a line of separate troughs.
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 0, PAL.stonePale); P(x, 1, PAL.stoneDark);
      P(x, 13, PAL.stoneLight); P(x, 14, PAL.stoneDark);
      P(x, 15, PAL.outline);
    }
    this.footShadow(P, 0, TILE_SIZE - 1, 15);
  }

  /**
   * Street lamp.
   *
   * Left transparent everywhere it is not the lamp. Overlay cells are drawn on
   * top of the ground layer and the atlas starts empty, so anything this never
   * paints keeps whatever is underneath -- which is the only way one lamp tile
   * can stand on turf, path and paving alike.
   */
  private lampPost(px: Px): void {
    const P = this.unit(px);

    // Lantern: four panes of warm glass in a leaded frame, brightest at the top
    // left where the flame sits and falling away to the bottom right, so the box
    // reads as something lit from inside rather than as a yellow rectangle.
    for (let y = 2; y <= 7; y++) {
      for (let x = 4; x <= 11; x++) {
        const frame = x === 4 || x === 11 || y === 2 || y === 7;
        P(x, y, frame ? PAL.outline : x + y < 9 ? '#fff6d4' : x + y < 13 ? '#ffe08e' : '#e8a842');
      }
    }
    for (let y = 3; y <= 6; y++) P(8, y, '#c98c34');       // glazing bar
    for (let x = 5; x <= 10; x++) P(x, 5, '#c98c34');
    // Cap and finial.
    for (let x = 3; x <= 12; x++) { P(x, 1, PAL.stoneLight); P(x, 2, PAL.outline); }
    for (let x = 4; x <= 11; x++) P(x, 0, PAL.stoneDark);
    P(7, 0, PAL.stonePale); P(8, 0, PAL.stoneLight);

    // Column, with a swelling at the base.
    for (let y = 8; y <= 12; y++) { P(7, y, PAL.stoneLight); P(8, y, PAL.stoneDeep); }
    for (let y = 8; y <= 12; y++) { P(6, y, PAL.outline); P(9, y, PAL.outline); }
    for (let x = 5; x <= 10; x++) { P(x, 13, PAL.stoneMid); P(x, 14, PAL.stoneDark); }
    P(6, 13, PAL.stoneLight); P(7, 13, PAL.stoneLight);
    for (let x = 5; x <= 10; x++) P(x, 15, PAL.outline);
    P(4, 14, PAL.outline); P(11, 14, PAL.outline);
    P(4, 15, PAL.outline); P(11, 15, PAL.outline);
    // The column stands on turf, path and paving alike, so the pool at its foot
    // has to tint the ground rather than replace it.
    this.footShadow(P, 4, 11, 15);
    for (let x = 5; x <= 10; x++) P(x, 15, PAL.outline);
  }

  /**
   * A shelf of books: the cheapest way to make a room look lived in.
   *
   * Designed on the authoring grid like everything else, and stopping a row
   * above the floor so the carcass has a shadow under it instead of being sunk
   * into the boards.
   */
  private bookshelf(px: Px): void {
    const P = this.unit(px);
    for (let y = 0; y <= 14; y++) {
      for (let x = 0; x < TILE_SIZE; x++) P(x, y, x <= 1 || x >= 14 ? PAL.woodDeep : PAL.woodDark);
    }
    const spines = ['#b04840', '#3f7a5c', '#3f6ab0', '#c08a3a', '#8a5aa8', '#2f8090'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const top = 1 + shelf * 5;
      let x = 2;
      let i = shelf * 2;
      while (x <= 13) {
        const bw = 1 + (i % 2);
        const c = spines[(i + shelf) % spines.length]!;
        for (let k = 0; k < bw && x + k <= 13; k++) {
          for (let y = top; y <= top + 2; y++) P(x + k, y, k === 0 ? mixDown(c) : c);
        }
        // A gap every third book. A shelf packed edge to edge reads as one
        // striped block; the holes are what make it read as books.
        x += bw + (i % 3 === 2 ? 1 : 0);
        i++;
      }
      for (let bx = 2; bx <= 13; bx++) {
        P(bx, top + 3, PAL.woodDeep);
        if (top + 4 <= 13) P(bx, top + 4, PAL.woodLight);
      }
    }
    for (let y = 0; y <= 14; y++) { P(0, y, PAL.outline); P(15, y, PAL.outline); }
    for (let x = 0; x < TILE_SIZE; x++) { P(x, 0, PAL.outline); P(x, 14, PAL.outline); }
    this.footShadow(P, 0, TILE_SIZE - 1, 15);
  }

  /**
   * Pressure plate. The two states have to be legible from across the room,
   * because reading the board at a glance is the entire puzzle.
   */
  private plate(px: Px, fill: (c: string) => void, pressed: boolean): void {
    fill(PAL.stoneMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) if (dither(x, y, 0.2)) px(x, y, PAL.stoneLight);
    }
    for (let y = 2; y < TILE_PX - 2; y++) {
      for (let x = 2; x < TILE_PX - 2; x++) px(x, y, PAL.stoneDeep);
    }

    const inset = pressed ? 6 : 4;
    const face = pressed ? '#2f6a34' : '#a8863f';
    const lip = pressed ? '#5cc062' : '#e8c878';
    const under = pressed ? '#1c3f20' : '#6a5426';

    for (let y = inset; y < TILE_PX - inset; y++) {
      for (let x = inset; x < TILE_PX - inset; x++) px(x, y, face);
    }
    for (let x = inset; x < TILE_PX - inset; x++) {
      px(x, inset, lip); px(x, inset + 1, lip);
      px(x, TILE_PX - inset - 1, under); px(x, TILE_PX - inset - 2, under);
    }
    for (let y = inset; y < TILE_PX - inset; y++) {
      px(inset, y, lip); px(inset + 1, y, lip);
      px(TILE_PX - inset - 1, y, under); px(TILE_PX - inset - 2, y, under);
    }

    if (pressed) {
      // Glow right out to the tile edge, readable even under a stone.
      for (let i = 2; i < TILE_PX - 2; i++) {
        px(i, 2, '#5cc062'); px(i, 3, '#3f8a44'); px(i, TILE_PX - 3, '#2f6a34');
        px(2, i, '#5cc062'); px(3, i, '#3f8a44'); px(TILE_PX - 3, i, '#2f6a34');
      }
      for (let i = 10; i <= 21; i++) { px(i, 15, '#c8f8b0'); px(15, i, '#c8f8b0'); }
      px(15, 15, '#f0ffe8'); px(16, 16, '#f0ffe8');
    } else {
      for (let y = 12; y <= 19; y++) for (let x = 12; x <= 19; x++) px(x, y, '#e8cc84');
      for (let i = 12; i <= 19; i++) { px(i, 12, '#fff0c0'); px(12, i, '#fff0c0'); }
      px(19, 19, '#8a6c30'); px(18, 19, '#8a6c30'); px(19, 18, '#8a6c30');
    }
  }
}
