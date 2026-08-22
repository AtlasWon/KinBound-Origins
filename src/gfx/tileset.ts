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
  COUNT,
}

/** Which colour ramp a roof is painted from. */
export type RoofHue = 'tan' | 'red' | 'blue';

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
};

/**
 * Offset folded into every noise lookup while a variant is being drawn, so the
 * alternates differ in their texture and not only in their scattered detail.
 */
let variantSeed = 0;

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
    if (!list) return this.src(id);
    const pick = Math.floor(placeHash(tx, ty, 7777) * list.length) % list.length;
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
    const paint = (cell: number, id: number, variant: number) => {
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
      this.drawTile(id, px, fill, rng);
      variantSeed = 0;
    };

    for (let id = 1; id < T.COUNT; id++) paint(id, id, 0);
    for (const [id, list] of this.variants) {
      for (let i = 1; i < list.length; i++) paint(list[i]!, id, i);
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
      case T.COUNTER: this.counter(px, fill, rng); break;
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
      case T.BED_HEAD: this.bed(px, fill, true); break;
      case T.BED_FOOT: this.bed(px, fill, false); break;
      case T.BOOKSHELF: this.bookshelf(px, fill); break;
      case T.TABLE: this.table(px, fill); break;
      case T.CHAIR: this.chair(px, fill); break;
      case T.TELEVISION: this.television(px, fill); break;
      case T.PLANT: this.plant(px, fill); break;
      case T.FRIDGE: this.fridge(px, fill); break;
      case T.SINK: this.sink(px, fill); break;
      case T.STOVE: this.stove(px, fill); break;
      case T.WINDOW_IN: this.interiorWindow(px, fill, rng); break;
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
   * Tall grass.
   *
   * Its first job is not to look like grass, it is to be *unmistakable*: the
   * player has to know which tiles hide encounters at a glance and at speed.
   * So it is a solid mass with a jagged tip silhouette rather than scattered
   * strokes -- a shape the eye separates from ordinary turf instantly, and one
   * the player's legs can sink into.
   */
  private tallGrass(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.turf(px, fill, 11);
    const P = this.unit(px);

    // A wrapping sawtooth of blade points across the top of the mass.
    const tips = [3, 1, 4, 2, 5, 2, 4, 1, 3, 2, 5, 3, 4, 1, 3, 2];
    for (let x = 0; x < TILE_SIZE; x++) {
      const top = 5 + tips[x % tips.length]!;
      for (let y = top; y < TILE_SIZE; y++) {
        const shade = y === top ? PAL.grassTip
          : y === top + 1 ? PAL.grassHi
          : (x + y) % 5 === 0 ? PAL.grassDark : PAL.grassDeep;
        P(x, y, shade);
      }
    }
    // A couple of blades standing clear of the mass, so the top edge is not a
    // clean line across the tile.
    for (let i = 0; i < 2; i++) {
      const bx = 2 + rng.below(TILE_SIZE - 4);
      P(bx, 4 + rng.below(2), PAL.grassHi);
    }
    void rng;
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
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = wrapNoise(x, y, 16, 61) * 0.6 + wrapNoise(x, y, 8, 23) * 0.4;
        if (n > 0.68) px(x, y, PAL.waterLight);
        else if (n < 0.32) px(x, y, PAL.waterDark);
      }
    }
    // Glitter: short pale dashes on a few rows, offset per row so they do not
    // line up into columns.
    for (let i = 0; i < 4; i++) {
      const gy = 3 + i * 8 + Math.floor(hash2(i, 0, 71) * 3);
      const start = Math.floor(hash2(i, 1, 13) * TILE_PX);
      for (let k = 0; k < 3; k++) {
        const gx = (start + k * 11) % TILE_PX;
        px(gx, gy, PAL.waterPale);
        px((gx + 1) % TILE_PX, gy, PAL.waterFoam);
        px((gx + 2) % TILE_PX, gy, PAL.waterPale);
      }
    }
    for (let i = 0; i < 3; i++) {
      px(rng.below(TILE_PX), rng.below(TILE_PX), PAL.waterFoam);
    }
    if (edge) {
      for (let x = 0; x < TILE_PX; x++) {
        const h = 2 + Math.floor(wrapNoise(x, 0, 8, 41) * 3);
        for (let y = 0; y < h; y++) px(x, y, y < h - 1 ? PAL.waterFoam : PAL.waterPale);
      }
    }
  }

  /**
   * Deep water, kept firmly distinct from the shallows: every coastline and the
   * whole Tide Bastion puzzle depend on reading "walkable" or "wall" from
   * colour alone.
   */
  private deepWater(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.waterDeep);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const w = Math.sin(x * 0.28 + y * 0.18) + Math.sin(x * 0.11 - y * 0.24);
        if (w > 1.2) px(x, y, PAL.waterDark);
        else if (w > 0.5) px(x, y, '#20416b');
        else if (w < -1.2) px(x, y, '#12294a');
      }
    }
    for (let i = 0; i < 2; i++) {
      const sy = 4 + rng.below(TILE_PX - 8);
      for (let x = 0; x < TILE_PX; x++) {
        const y = sy + Math.round(Math.sin(x * 0.25 + i) * 2);
        if ((x + i * 3) % 9 < 5) px(x, y, '#2e5680');
      }
    }
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
   * Forest canopy.
   *
   * Built as a cluster of overlapping round lobes rather than one silhouette,
   * because that is what separates a treeline from a green wall: each lobe gets
   * its own light, and the valleys where two lobes meet are darkened, so the
   * mass reads as many bushes seen from above.
   *
   * Every lookup wraps in both axes, so a block of these tiles fuses into one
   * continuous canopy with no seam and no visible grid -- which is how the
   * reference art gets away with using trees as map borders everywhere.
   */
  private tree(px: Px, fill: (c: string) => void, rng: Rng, small: boolean): void {
    if (small) { this.smallTree(px, fill, rng); return; }

    const N = TILE_PX;
    const lobes: { x: number; y: number; r: number }[] = [];
    for (let ly = 0; ly < 2; ly++) {
      for (let lx = 0; lx < 2; lx++) {
        lobes.push({
          x: lx * 16 + 8 + Math.round((hash2(lx, ly, 23) - 0.5) * 5),
          y: ly * 16 + 8 + Math.round((hash2(lx, ly, 71) - 0.5) * 5),
          r: 11 + Math.round(hash2(lx, ly, 5) * 3),
        });
      }
    }

    const wrapD = (a: number, b: number): number => {
      let d = a - b;
      if (d > N / 2) d -= N;
      if (d < -N / 2) d += N;
      return d;
    };

    fill(PAL.leafMid);
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let bx = 0, by = 0, br = 1, t0 = Infinity, t1 = Infinity;
        for (const L of lobes) {
          const dx = wrapD(x, L.x), dy = wrapD(y, L.y);
          const t = (dx * dx + dy * dy) / (L.r * L.r);
          if (t < t0) { t1 = t0; t0 = t; bx = dx; by = dy; br = L.r; }
          else if (t < t1) { t1 = t; }
        }
        // Light comes from the upper left, weighted downward so the underside
        // of every lobe goes properly dark.
        const lit = (-bx - by * 1.25) / br;
        let c: string;
        if (lit > 0.55) c = PAL.leafTip;
        else if (lit > 0.24) c = PAL.leafHi;
        else if (lit > -0.02) c = PAL.leafLight;
        else if (lit > -0.4) c = PAL.leafMid;
        else c = PAL.leafDark;
        // The crease between two lobes. Without it the cluster fuses back into
        // a single blob and the whole effect is lost.
        if (t1 - t0 < 0.22) c = t1 - t0 < 0.09 ? PAL.leafDeep : PAL.leafDark;
        px(x, y, c);
      }
    }

    // Individual leaves catching the light on the lit shoulder of each lobe.
    for (let i = 0; i < 14; i++) {
      const lx = rng.below(N), ly = rng.below(N);
      let bx = 0, by = 0, br = 1, t0 = Infinity;
      for (const L of lobes) {
        const dx = wrapD(lx, L.x), dy = wrapD(ly, L.y);
        const t = (dx * dx + dy * dy) / (L.r * L.r);
        if (t < t0) { t0 = t; bx = dx; by = dy; br = L.r; }
      }
      if ((-bx - by * 1.25) / br < 0.15) continue;
      px(lx, ly, PAL.leafTip);
      px(lx + 1, ly, PAL.leafHi);
      px(lx, ly + 1, PAL.leafMid);
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

  private cliff(px: Px, fill: (c: string) => void, rng: Rng, top: boolean): void {
    fill(PAL.stoneMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 2), Math.floor(y / 3), 83);
        if (n > 0.7) px(x, y, PAL.stoneLight);
        else if (n < 0.28) px(x, y, PAL.stoneDark);
        else if (dither(x, y, 0.1)) px(x, y, PAL.stonePale);
      }
    }
    // Vertical strata: what makes a wall read as height rather than floor.
    for (let i = 0; i < 6; i++) {
      const x = 2 + i * 5 + rng.below(2);
      for (let y = 0; y < TILE_PX; y++) {
        if ((y + i * 3) % 11 > 1) {
          px(x, y, PAL.stoneDeep);
          px(x + 1, y, PAL.stoneDark);
          px(x - 1, y, PAL.stoneLight);
        }
      }
    }
    for (let y = 6; y < TILE_PX; y += 9) {
      for (let x = 0; x < TILE_PX; x++) {
        px(x, y + Math.round(Math.sin(x * 0.2) * 1.2), PAL.stoneDeep);
      }
    }
    if (top) {
      // Turf running over the lip of the cliff, with the odd tuft hanging on.
      const P = this.unit(px);
      for (let x = 0; x < TILE_SIZE; x++) {
        const h = 3 + Math.floor(hash2(x, 3, 91) * 2);
        for (let y = 0; y < h; y++) P(x, y, y < h - 1 ? PAL.grassMid : PAL.grassDark);
        if (hash2(x, 9, 2) > 0.7) P(x, h - 1, PAL.grassHi);
        P(x, h, PAL.outline);
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

  private fence(px: Px, fill: (c: string) => void, rng: Rng, horizontal: boolean): void {
    this.turf(px, fill, 53);
    const rail = (x0: number, y0: number, x1: number, y1: number) => {
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= steps; i++) {
        const x = Math.round(x0 + ((x1 - x0) * i) / steps);
        const y = Math.round(y0 + ((y1 - y0) * i) / steps);
        px(x, y - 1, PAL.woodPale);
        px(x, y, PAL.woodLight);
        px(x, y + 1, PAL.woodMid);
        px(x, y + 2, PAL.woodDark);
      }
    };
    if (horizontal) {
      rail(0, 13, TILE_PX - 1, 13);
      rail(0, 21, TILE_PX - 1, 21);
      for (const x of [5, 25]) {
        for (let y = 8; y < 28; y++) {
          px(x - 1, y, PAL.woodLight);
          px(x, y, PAL.woodMid);
          px(x + 1, y, PAL.woodDeep);
        }
        px(x - 1, 7, PAL.woodPale); px(x, 7, PAL.woodLight);
        px(x, 28, PAL.grassDeep);
      }
    } else {
      for (let y = 0; y < TILE_PX; y++) {
        px(14, y, PAL.woodPale);
        px(15, y, PAL.woodLight);
        px(16, y, PAL.woodMid);
        px(17, y, PAL.woodDeep);
      }
      for (const y of [6, 24]) rail(4, y, TILE_PX - 5, y);
    }
    void rng;
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
    this.turf(px, fill, 59);
    const P = this.unit(px);

    for (const lx of [6, 9]) {
      for (let y = 8; y < 14; y++) {
        P(lx, y, PAL.woodMid);
        P(lx + 1, y, PAL.woodDeep);
      }
    }
    for (let y = 1; y <= 8; y++) {
      for (let x = 1; x <= 14; x++) {
        const border = y === 1 || y === 8 || x === 1 || x === 14;
        P(x, y, border ? PAL.woodDeep : (x + y) % 7 === 0 ? PAL.woodPale : PAL.woodLight);
      }
    }
    for (let x = 2; x <= 13; x++) P(x, 2, PAL.woodPale);
    // Two lines of writing, which is all that is legible at this size.
    for (let x = 3; x <= 11; x++) P(x, 4, PAL.woodDeep);
    for (let x = 3; x <= 9; x++) P(x, 6, PAL.woodDeep);
    void rng;
  }

  /**
   * House wall.
   *
   * Plaster over a timber base course, with the siding lines evenly spaced --
   * the reference art never leaves a wall flat, but it never lets the texture
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
    // Where the wall meets the ground.
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, TILE_SIZE - 2, PAL.plasterDark);
      P(x, TILE_SIZE - 1, PAL.woodDark);
    }

    if (window) {
      for (let y = 3; y <= 11; y++) {
        for (let x = 3; x <= 12; x++) {
          const frame = y === 3 || y === 11 || x === 3 || x === 12;
          if (frame) { P(x, y, y === 11 ? PAL.trimShade : PAL.trimPale); continue; }
          P(x, y, x + y < 12 ? PAL.glassHi : x + y < 18 ? PAL.glassLight : PAL.glass);
        }
      }
      // Glazing bars, and a sill with a shadow under it.
      for (let x = 4; x <= 11; x++) P(x, 7, PAL.trimMid);
      for (let y = 4; y <= 10; y++) P(8, y, PAL.trimMid);
      for (let x = 2; x <= 13; x++) { P(x, 12, PAL.trimPale); P(x, 13, PAL.plasterDark); }
    }
    void rng;
  }

  /**
   * Front door.
   *
   * Framed, panelled and given a step, because a door drawn as a brown
   * rectangle is the single fastest way to make a town look unfinished.
   */
  private door(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.wall(px, fill, rng, false);
    const P = this.unit(px);

    for (let y = 2; y <= 15; y++) {
      for (let x = 3; x <= 12; x++) {
        const frame = x === 3 || x === 12 || y === 2;
        P(x, y, frame ? PAL.trimShade : PAL.woodMid);
      }
    }
    // Panels.
    for (const [y0, y1] of [[4, 7], [9, 12]] as [number, number][]) {
      for (let y = y0; y <= y1; y++) {
        for (let x = 5; x <= 10; x++) {
          const edge = y === y0 || y === y1 || x === 5 || x === 10;
          P(x, y, edge ? PAL.woodDeep : PAL.woodLight);
        }
      }
    }
    P(4, 3, PAL.woodPale);
    P(10, 8, '#e8c24a');           // handle
    P(10, 9, PAL.woodDeep);
    // Step.
    for (let x = 2; x <= 13; x++) {
      P(x, 14, PAL.stoneLight);
      P(x, 15, PAL.stoneDark);
    }
  }



  /** The five-step ramp a roof is painted from, by building type. */
  private roofRamp(hue: RoofHue): [string, string, string, string, string] {
    if (hue === 'red') return [PAL.redDeep, PAL.redDark, PAL.redMid, PAL.redLight, PAL.redPale];
    if (hue === 'blue') return [PAL.blueDeep, PAL.blueDark, PAL.blueMid, PAL.blueLight, PAL.bluePale];
    return [PAL.roofDeep, PAL.roofDark, PAL.roofMid, PAL.roofLight, PAL.roofPale];
  }

  /**
   * Roof.
   *
   * Vertical slats with a lit ridge band and a hard eave at the bottom. Colour
   * is the only thing that changes between a house, a Waystation and a
   * Provisioner, and that is the whole point: the player should be able to pick
   * the healing building out of a town from one screen away, by hue alone,
   * before they can read a single sign.
   */
  private roof(
    px: Px, fill: (c: string) => void,
    part: 'mid' | 'left' | 'right' | 'peak',
    hue: RoofHue = 'tan',
  ): void {
    const ramp = this.roofRamp(hue);
    const deep = ramp[0], dark = ramp[1], mid = ramp[2], light = ramp[3], pale = ramp[4];
    fill(mid);

    for (let x = 0; x < TILE_PX; x++) {
      const slat = Math.floor(x / 5);
      const inSlat = x % 5;
      const n = hash2(slat, 0, 89);
      let base: string = n > 0.66 ? light : n < 0.3 ? dark : mid;
      if (inSlat === 0) base = deep;
      else if (inSlat === 1) base = light;
      for (let y = 0; y < TILE_PX; y++) {
        // The roof darkens as it falls away from the ridge.
        px(x, y, y > TILE_PX * 0.78 ? (base === light ? mid : dark) : base);
      }
    }

    if (part === 'peak') {
      for (let x = 0; x < TILE_PX; x++) {
        px(x, 0, PAL.outline);
        px(x, 1, pale);
        px(x, 2, pale);
        px(x, 3, light);
        px(x, 4, light);
      }
    }
    if (part === 'left') {
      for (let y = 0; y < TILE_PX; y++) {
        px(0, y, PAL.outline);
        px(1, y, deep);
        px(2, y, dark);
        px(3, y, light);
      }
    }
    if (part === 'right') {
      for (let y = 0; y < TILE_PX; y++) {
        px(TILE_PX - 1, y, PAL.outline);
        px(TILE_PX - 2, y, deep);
        px(TILE_PX - 3, y, dark);
        px(TILE_PX - 4, y, light);
      }
    }
    // Eave: the shadow the roof throws onto the wall below it.
    for (let x = 0; x < TILE_PX; x++) {
      px(x, TILE_PX - 3, deep);
      px(x, TILE_PX - 2, PAL.outline);
      px(x, TILE_PX - 1, PAL.outline);
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
    for (let x = 0; x < TILE_PX; x++) {
      px(x, 0, PAL.trimShade);
      px(x, TILE_PX - 3, PAL.trimShade);
      px(x, TILE_PX - 2, PAL.stoneDark);
      px(x, TILE_PX - 1, PAL.outline);
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


  /* ----------------------------------------------------------- interior */

  /**
   * Floorboards.
   *
   * Long boards with a seam every four rows and staggered ends, which is what
   * a floor looks like from above. The old version textured every pixel and
   * the result read as woodchip rather than as a room.
   */
  private woodFloor(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.woodPale);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      const board = Math.floor(y / 4);
      // Two close pale tones. A floor that is as dark as the furniture on it
      // makes every room read as a cellar.
      const base = board % 2 === 0 ? PAL.woodPale : PAL.woodLight;
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y % 4 === 3) { P(x, y, PAL.woodMid); continue; }
        // A little grain, always along the board rather than across it.
        P(x, y, (x * 5 + board * 7) % 11 === 0 ? PAL.woodPale : base);
      }
      // A soft highlight along the top of each board, and nothing across it:
      // vertical joins at this size read as mortar, and a floor made of bricks
      // is indistinguishable from the wall behind it.
      if (y % 4 === 0) {
        for (let x = 0; x < TILE_SIZE; x++) P(x, y, PAL.plasterPale);
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
    fill('#8a4a52');
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if ((x + y) % 4 === 0) P(x, y, '#a35c64');
        else if ((x + y) % 8 === 4) P(x, y, '#5e2f36');
      }
    }
    // No border on the tile itself. A mat is several of these side by side, and
    // a border drawn per tile turns one rug into a grid of doormats. The weave
    // carries across the seam instead, so the whole thing reads as one piece.
    for (let i = 0; i < TILE_SIZE; i += 4) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if ((x + i) % 8 < 4) P(x, i, '#5e2f36');
      }
    }
  }

  /**
   * Interior wall.
   *
   * Papered above, panelled below, with a rail between them: three flat bands
   * read as a room, and a noisy wall reads as a cave.
   */
  private interiorWall(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.plasterLight);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y >= 11) P(x, y, PAL.woodDark);                        // panelling
        else if ((x + y * 2) % 8 === 0) P(x, y, PAL.plasterPale);  // paper motif
        else if ((x * 3 + y) % 13 === 0) P(x, y, PAL.plasterMid);
      }
    }
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 10, PAL.woodDark);                 // rail
      P(x, 11, PAL.woodPale);
      P(x, TILE_SIZE - 1, PAL.woodDeep);      // skirting shadow
    }
    // Vertical joints in the panelling.
    for (let x = 3; x < TILE_SIZE; x += 5) {
      for (let y = 12; y < TILE_SIZE - 1; y++) P(x, y, PAL.woodDeep);
    }
    void rng;
  }

  /**
   * Service counter.
   *
   * A worktop with a lit front edge and a shadow under it, so the thing
   * between the player and the person behind it looks like furniture.
   */
  private counter(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.woodMid);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y <= 1) P(x, y, PAL.woodPale);                 // top surface
        else if (y <= 3) P(x, y, PAL.woodLight);
        else if (y >= TILE_SIZE - 2) P(x, y, PAL.woodDeep); // shadow at the foot
        else P(x, y, (x + y) % 6 === 0 ? PAL.woodDark : PAL.woodMid);
      }
    }
    for (let x = 0; x < TILE_SIZE; x++) P(x, 2, PAL.woodDeep);
    // Panel grooves down the front.
    for (let x = 2; x < TILE_SIZE; x += 5) {
      for (let y = 5; y < TILE_SIZE - 2; y++) P(x, y, PAL.woodDark);
    }
    void rng;
  }





  private stairs(px: Px, fill: (c: string) => void): void {
    fill(PAL.stoneMid);
    for (let i = 0; i < 4; i++) {
      const y = i * 8;
      for (let x = 0; x < TILE_PX; x++) {
        px(x, y, PAL.stoneDeep);
        px(x, y + 1, PAL.stonePale);
        px(x, y + 2, PAL.stoneLight);
        for (let k = 3; k < 8; k++) px(x, y + k, k > 6 ? PAL.stoneDark : PAL.stoneMid);
      }
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
   * Drawn on the floor rather than replacing it, so it reads as an object in
   * the room instead of a hole in it. The head half carries the pillow and the
   * turned-down sheet, which is the pair of shapes that says "bed" from across
   * a 12-tile room faster than any amount of blanket detail.
   */
  private bed(px: Px, fill: (c: string) => void, head: boolean): void {
    fill(PAL.woodMid);
    // Floorboards showing either side of the frame.
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        px(x, y, y % 8 === 0 ? PAL.woodDeep : PAL.woodMid);
      }
    }

    const L = 3, R = TILE_PX - 4;
    // Frame.
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = L; x <= R; x++) px(x, y, PAL.woodDark);
      px(L, y, PAL.outline); px(R, y, PAL.outline);
    }

    if (head) {
      // Headboard.
      for (let y = 0; y < 5; y++) for (let x = L; x <= R; x++) px(x, y, y < 2 ? PAL.outline : PAL.woodDeep);
      // Pillow.
      for (let y = 6; y < 13; y++) {
        for (let x = L + 3; x <= R - 3; x++) {
          px(x, y, y === 6 || y === 12 ? PAL.trimShade : (x + y) % 7 === 0 ? PAL.trimMid : PAL.trimPale);
        }
      }
      // Turned-down sheet under the pillow.
      for (let y = 14; y < TILE_PX; y++) {
        for (let x = L + 1; x <= R - 1; x++) {
          px(x, y, y < 17 ? PAL.trimLight : y % 6 === 0 ? '#5f7fb0' : '#7196c8');
        }
      }
    } else {
      // Blanket, with a fold line and a lit top edge.
      for (let y = 0; y < TILE_PX - 3; y++) {
        for (let x = L + 1; x <= R - 1; x++) {
          px(x, y, y % 7 === 0 ? '#5f7fb0' : '#7196c8');
        }
      }
      for (let x = L + 1; x <= R - 1; x++) px(x, 0, '#8fb0dc');
      // Footboard.
      for (let y = TILE_PX - 3; y < TILE_PX; y++) {
        for (let x = L; x <= R; x++) px(x, y, y > TILE_PX - 3 ? PAL.outline : PAL.woodDeep);
      }
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
   */
  private table(px: Px, fill: (c: string) => void): void {
    fill(PAL.woodPale);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) P(x, y, PAL.woodPale);
    }
    // Top.
    for (let y = 2; y <= 10; y++) {
      for (let x = 1; x <= 14; x++) {
        const edge = y === 2 || y === 10 || x === 1 || x === 14;
        P(x, y, edge ? PAL.woodDark : (x + y) % 7 === 0 ? PAL.plasterPale : PAL.woodLight);
      }
    }
    for (let x = 2; x <= 13; x++) P(x, 3, PAL.plasterPale);
    for (let x = 1; x <= 14; x++) P(x, 11, PAL.woodDeep);
    // Legs, and the shadow they cast.
    for (const lx of [3, 11]) {
      for (let y = 12; y <= 14; y++) { P(lx, y, PAL.woodDark); P(lx + 1, y, PAL.woodDeep); }
    }
    for (let x = 2; x <= 13; x++) P(x, 15, 'rgba(40,30,24,0.25)');
  }

  /** A chair, seen from the front: back, seat, two legs. */
  private chair(px: Px, fill: (c: string) => void): void {
    fill(PAL.woodPale);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) P(x, y, PAL.woodPale);
    for (let y = 1; y <= 7; y++) {
      for (let x = 4; x <= 11; x++) {
        P(x, y, y === 1 || x === 4 || x === 11 ? PAL.woodDeep : PAL.woodMid);
      }
    }
    for (let x = 5; x <= 10; x++) P(x, 2, PAL.woodLight);
    for (let y = 8; y <= 10; y++) for (let x = 3; x <= 12; x++) P(x, y, y === 8 ? PAL.woodLight : PAL.woodMid);
    for (let x = 3; x <= 12; x++) P(x, 11, PAL.woodDeep);
    for (const lx of [4, 11]) for (let y = 12; y <= 14; y++) P(lx, y, PAL.woodDark);
    for (let x = 3; x <= 12; x++) P(x, 15, 'rgba(40,30,24,0.22)');
  }

  /** Television on a stand, with the screen catching the window. */
  private television(px: Px, fill: (c: string) => void): void {
    fill(PAL.plasterLight);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) P(x, y, PAL.plasterLight);
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
    for (let x = 5; x <= 10; x++) { P(x, 12, '#3a3a46'); P(x, 13, '#2c2c36'); }
    for (let x = 3; x <= 12; x++) P(x, 14, '#41414f');
    for (let x = 3; x <= 12; x++) P(x, 15, 'rgba(40,40,50,0.25)');
  }

  /** Pot plant. Every house in the reference art has one. */
  private plant(px: Px, fill: (c: string) => void): void {
    fill(PAL.plasterLight);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) for (let x = 0; x < TILE_SIZE; x++) P(x, y, PAL.plasterLight);
    // Fronds.
    const leaf = (x0: number, y0: number, dx: number) => {
      for (let i = 0; i < 5; i++) {
        P(x0 + dx * i, y0 - i, i < 2 ? PAL.leafDark : PAL.leafMid);
        P(x0 + dx * i, y0 - i + 1, PAL.leafDeep);
      }
    };
    leaf(7, 8, -1); leaf(8, 8, 1);
    for (let i = 0; i < 6; i++) P(7 + (i % 2), 8 - i, i > 3 ? PAL.leafLight : PAL.leafMid);
    P(6, 2, PAL.leafHi); P(9, 3, PAL.leafHi);
    // Pot.
    for (let y = 9; y <= 14; y++) {
      const inset = y >= 12 ? 1 : 0;
      for (let x = 4 + inset; x <= 11 - inset; x++) {
        P(x, y, y === 9 ? '#a05a3a' : x < 6 ? '#b06a44' : x > 9 ? '#7a4028' : '#96543a');
      }
    }
    for (let x = 5; x <= 10; x++) P(x, 15, 'rgba(40,30,24,0.25)');
  }

  /** Fridge: a tall pale box with a seam and a handle. */
  private fridge(px: Px, fill: (c: string) => void): void {
    fill(PAL.plasterLight);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const inside = x >= 1 && x <= 14 && y >= 1;
        if (!inside) { P(x, y, PAL.plasterLight); continue; }
        const edge = x === 1 || x === 14 || y === 1 || y === 15;
        P(x, y, edge ? '#8f96a4' : x < 4 ? '#e4e8ee' : x > 11 ? '#c3c9d4' : '#d6dbe4');
      }
    }
    for (let x = 2; x <= 13; x++) P(x, 6, '#8f96a4');
    for (let y = 3; y <= 5; y++) P(12, y, '#8f96a4');
    for (let y = 8; y <= 11; y++) P(12, y, '#8f96a4');
  }

  /** Sink: worktop, basin, tap. */
  private sink(px: Px, fill: (c: string) => void): void {
    this.counter(px, fill, new Rng('sink'));
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
  private stove(px: Px, fill: (c: string) => void): void {
    this.counter(px, fill, new Rng('stove'));
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
    for (let y = 2; y <= 9; y++) {
      for (let x = 3; x <= 12; x++) {
        const frame = y === 2 || y === 9 || x === 3 || x === 12;
        if (frame) { P(x, y, PAL.trimPale); continue; }
        P(x, y, x + y < 10 ? PAL.glassHi : x + y < 15 ? PAL.glassLight : PAL.glass);
      }
    }
    for (let x = 4; x <= 11; x++) P(x, 6, PAL.trimMid);
    for (let y = 3; y <= 8; y++) P(8, y, PAL.trimMid);
    for (let x = 2; x <= 13; x++) { P(x, 10, PAL.trimPale); P(x, 11, PAL.plasterDark); }
    // Curtains.
    for (let y = 1; y <= 9; y++) {
      P(2, y, '#b8607a'); P(3, y === 1 ? y : y, y === 1 ? '#b8607a' : PAL.trimPale);
      P(13, y, '#96485f');
    }
  }

  private bookshelf(px: Px, fill: (c: string) => void): void {
    fill(PAL.woodDark);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) px(x, y, x < 2 || x > TILE_PX - 3 ? PAL.woodDeep : PAL.woodDark);
    }
    const spines = ['#b04840', '#3f7a5c', '#3f6ab0', '#c08a3a', '#8a5aa8', '#2f8090'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const top = 2 + shelf * 10;
      for (let x = 2; x < TILE_PX - 2; x++) {
        px(x, top + 8, PAL.woodDeep);
        px(x, top + 9, PAL.woodLight);
      }
      let x = 3;
      let i = shelf * 2;
      while (x < TILE_PX - 3) {
        const bw = 2 + (i % 2);
        const c = spines[(i + shelf) % spines.length]!;
        for (let k = 0; k < bw && x + k < TILE_PX - 3; k++) {
          for (let y = top + 1; y < top + 8; y++) px(x + k, y, k === 0 ? mixDown(c) : c);
        }
        x += bw + 1;
        i++;
      }
    }
    for (let y = 0; y < TILE_PX; y++) { px(0, y, PAL.outline); px(TILE_PX - 1, y, PAL.outline); }
    for (let x = 0; x < TILE_PX; x++) { px(x, 0, PAL.outline); px(x, TILE_PX - 1, PAL.outline); }
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
