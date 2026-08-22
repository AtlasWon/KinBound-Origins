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
      const px: Px = (x, y, color) => {
        if (x < 0 || y < 0 || x >= TILE_PX || y >= TILE_PX) return;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(ox + x, oy + y, 1, 1);
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
      default: fill('#ff00ff'); break; // loud, so a missing tile is obvious
    }
  }

  /* ------------------------------------------------------------- ground */

  /**
   * Base turf shared by every grassy tile.
   *
   * Two octaves of *wrapping* smooth noise, kept small and faint. Both
   * properties are load-bearing: smooth, because block-quantised noise paints a
   * visible rectangular grid over a field; wrapping, because a tile whose
   * texture does not meet itself at the seam turns any lawn into graph paper.
   *
   * Coverage is the setting that matters most. Only about a sixth of the tile
   * moves off the base tone in either direction -- push it further and the
   * field starts reading as camouflage, which buries every sprite standing on
   * it. The reference art keeps its ground almost flat and spends all of its
   * contrast on outlines instead.
   */
  private turf(px: Px, fill: (c: string) => void, seed: number): void {
    fill(PAL.grassMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = wrapNoise(x, y, 16, seed) * 0.55 + wrapNoise(x, y, 8, seed + 9) * 0.45;
        if (n > 0.70) px(x, y, PAL.grassLight);
        else if (n < 0.30) px(x, y, PAL.grassDark);
      }
    }
    // A sparse scatter of single lighter pixels: the sparkle that keeps a pale
    // field from reading as a flat fill, without adding visible structure.
    for (let y = 0; y < TILE_PX; y += 6) {
      for (let x = 0; x < TILE_PX; x += 6) {
        const j = hash2(x, y, seed + 41);
        if (j > 0.66) px(x + Math.floor(j * 40) % 5, y + Math.floor(j * 130) % 5, PAL.grassHi);
      }
    }
  }

  /**
   * A single blade. One pixel wide with no shadow beside it: a two-tone blade
   * at this scale reads as a hook or a stray mark rather than as grass, and a
   * field of stray marks looks like litter.
   */
  private blade(px: Px, x: number, y: number, h: number, tip: string): void {
    for (let i = 0; i < h; i++) px(x, y - i, i >= h - 1 ? tip : PAL.grassHi);
  }

  private grass(px: Px, fill: (c: string) => void, rng: Rng, variant: number): void {
    this.turf(px, fill, 3);

    // Plain turf gets almost nothing; the tufted cut carries the detail. Two
    // cuts of the same field is what breaks up the grid without either of them
    // becoming busy on its own.
    const count = variant >= 1 ? 6 : 2;
    for (let i = 0; i < count; i++) {
      const bx = 3 + rng.below(TILE_PX - 6);
      const by = 8 + rng.below(TILE_PX - 12);
      this.blade(px, bx, by, 3 + rng.below(2), PAL.grassTip);
    }

    if (variant === 2) {
      // Flower clumps, as in the reference towns: four petals around a pale
      // centre, sitting on a one-pixel shadow so they lift off the turf.
      const petals = ['#f0e8c8', '#f2c44c', '#e8788c', '#c8a8e8'];
      for (let i = 0; i < 3; i++) {
        const fx = 5 + rng.below(TILE_PX - 10);
        const fy = 6 + rng.below(TILE_PX - 12);
        const c = petals[rng.below(petals.length)]!;
        px(fx, fy - 1, c); px(fx - 1, fy, c); px(fx + 1, fy, c); px(fx, fy + 1, c);
        px(fx, fy, '#fff6d0');
        px(fx, fy + 2, PAL.grassDark);
      }
    }
  }

  /**
   * Tall grass.
   *
   * Its first job is not to look like grass, it is to be *unmistakable*: the
   * player has to know which tiles hide encounters from a glance at speed. So
   * it is built as a solid mass with a jagged blade-tip silhouette rather than
   * as scattered strokes -- a shape the eye separates from ordinary turf
   * instantly, and one the player's legs can sink into.
   *
   * The mass runs edge to edge horizontally and the tip profile wraps, so a
   * patch of these tiles is one continuous thicket with no seams.
   */
  private tallGrass(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.turf(px, fill, 11);

    // Tip profile: a wrapping sawtooth of blade points across the tile.
    const tipY: number[] = [];
    for (let x = 0; x < TILE_PX; x++) {
      const tooth = x % 8;
      const peak = tooth < 4 ? tooth : 7 - tooth;
      const jitter = Math.round(wrapNoise(x, 4, 16, 131) * 3);
      tipY.push(3 + (3 - peak) * 2 + jitter);
    }

    for (let x = 0; x < TILE_PX; x++) {
      const top = tipY[x]!;
      for (let y = top; y < TILE_PX; y++) {
        const depth = (y - top) / (TILE_PX - top);
        // Three bands: lit tips, body, shadowed root. Vertical striations give
        // the mass its blade texture without breaking up the silhouette.
        const stripe = wrapNoise(x, y, 8, 57);
        let c: string;
        if (depth < 0.16) c = PAL.grassTip;
        else if (depth < 0.42) c = stripe > 0.55 ? PAL.leafHi : PAL.leafLight;
        else if (depth < 0.78) c = stripe > 0.5 ? PAL.leafLight : PAL.leafMid;
        else c = stripe > 0.55 ? PAL.leafMid : PAL.leafDark;
        px(x, y, c);
      }
      // Hard top edge, which is what makes the silhouette read at speed.
      px(x, top - 1, PAL.leafDeep);
    }

    // A handful of stray blades breaking the line, so it is not a hedge.
    for (let i = 0; i < 4; i++) {
      const bx = 2 + rng.below(TILE_PX - 4);
      const h = 3 + rng.below(3);
      for (let k = 0; k < h; k++) {
        px(bx, tipY[bx]! - 2 - k, k === h - 1 ? PAL.grassTip : PAL.leafHi);
      }
    }
  }

  /**
   * Sandy track. Warm, pale and almost smooth: in the reference art the path is
   * a quiet ribbon the eye follows, and strong texture in it competes with
   * everything standing on it. Same wrapping noise as the turf, so long roads
   * do not show a tile grid.
   */
  private path(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.dirtMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = wrapNoise(x, y, 16, 21) * 0.55 + wrapNoise(x, y, 8, 5) * 0.45;
        if (n > 0.72) px(x, y, PAL.dirtLight);
        else if (n < 0.28) px(x, y, PAL.dirtDark);
      }
    }
    // A few pale flecks of grit, lit from above.
    for (let i = 0; i < 5; i++) {
      const gx = 2 + rng.below(TILE_PX - 4);
      const gy = 2 + rng.below(TILE_PX - 4);
      px(gx, gy, PAL.dirtPale);
      px(gx + 1, gy + 1, PAL.dirtDeep);
    }
  }

  /**
   * Where sand meets turf. The reference art never cuts this seam straight: it
   * dots the boundary so the path looks worn into the grass rather than laid
   * on top of it.
   */
  private pathEdge(px: Px, fill: (c: string) => void, rng: Rng, side: 'n' | 's'): void {
    this.path(px, fill, rng);
    for (let x = 0; x < TILE_PX; x++) {
      const jag = 3 + Math.floor(hash2(x, side === 'n' ? 1 : 2, 31) * 4);
      for (let d = 0; d <= jag; d++) {
        const y = side === 'n' ? d : TILE_PX - 1 - d;
        px(x, y, d === jag ? PAL.grassDark : PAL.grassMid);
      }
      if (hash2(x, 7, 3) > 0.68) {
        this.blade(px, x, side === 'n' ? jag + 2 : TILE_PX - jag - 2, 3, PAL.grassTip);
      }
      // Loose sand dotted into the turf side, which is what softens the join.
      if (hash2(x, 13, 17) > 0.6) {
        px(x, side === 'n' ? jag - 1 : TILE_PX - jag, PAL.dirtLight);
      }
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
      for (let x = 0; x < TILE_PX; x++) {
        const h = 5 + Math.floor(hash2(x, 3, 91) * 4);
        for (let y = 0; y < h; y++) px(x, y, y < h - 2 ? PAL.grassMid : PAL.grassDark);
        if (hash2(x, 9, 2) > 0.55) this.blade(px, x, h - 1, 3, PAL.grassTip);
        px(x, h, PAL.outline);
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

  private sign(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.turf(px, fill, 59);
    for (const lx of [12, 19]) {
      for (let y = 19; y < 30; y++) {
        px(lx, y, PAL.woodMid);
        px(lx + 1, y, PAL.woodDark);
      }
    }
    for (let y = 6; y < 21; y++) {
      for (let x = 3; x < 29; x++) {
        const border = y === 6 || y === 20 || x === 3 || x === 28;
        const n = hash2(x, Math.floor(y / 2), 67);
        px(x, y, border ? PAL.woodDeep : n > 0.62 ? PAL.woodPale : n < 0.3 ? PAL.woodMid : PAL.woodLight);
      }
    }
    for (let x = 4; x < 28; x++) px(x, 7, '#dcbd93');
    for (let i = 0; i < 4; i++) {
      const y = 10 + i * 3;
      const w = 14 + Math.floor(hash2(i, 1, 5) * 8);
      for (let x = 6; x < 6 + w; x++) px(x, y, PAL.woodDeep);
    }
    void rng;
  }

  /**
   * Plaster wall. Deliberately almost plain: in the reference art a house is
   * read from its roof and its door, and a busy wall only muddies that. All the
   * wall has to do is be a warm, light field with a believable base shadow.
   */
  private wall(px: Px, fill: (c: string) => void, rng: Rng, window: boolean): void {
    fill(PAL.plasterMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 7), Math.floor(y / 6), 73);
        if (n > 0.78) px(x, y, PAL.plasterLight);
        else if (n < 0.2) px(x, y, PAL.plasterDark);
      }
    }
    // Faint horizontal siding courses, and a shadow where wall meets ground.
    for (let y = 5; y < TILE_PX; y += 11) {
      for (let x = 0; x < TILE_PX; x++) px(x, y, PAL.plasterDark);
    }
    for (let x = 0; x < TILE_PX; x++) {
      px(x, TILE_PX - 2, PAL.plasterDark);
      px(x, TILE_PX - 1, PAL.woodDark);
    }

    if (window) {
      for (let y = 7; y < 24; y++) {
        for (let x = 6; x < 26; x++) {
          const frame = y < 9 || y > 21 || x < 8 || x > 23;
          if (frame) { px(x, y, y > 21 ? PAL.trimShade : PAL.trimPale); continue; }
          px(x, y, x + y < 26 ? PAL.glassHi : x + y < 34 ? PAL.glassLight : PAL.glass);
        }
      }
      for (let x = 8; x <= 23; x++) px(x, 15, PAL.trimMid);
      for (let y = 9; y <= 21; y++) px(15, y, PAL.trimMid);
      for (let x = 5; x < 27; x++) { px(x, 24, PAL.trimPale); px(x, 25, PAL.woodDark); }
    }
    void rng;
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

  /**
   * House door. Arched, recessed, with a stone step in front -- the three cues
   * that make a doorway read as enterable from a tile away, which matters
   * because the player finds every interior by spotting one of these.
   */
  private door(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.wall(px, fill, rng, false);

    // Recess shadow, so the door sits *in* the wall rather than on it.
    for (let y = 2; y < TILE_PX - 3; y++) {
      for (let x = 4; x < 28; x++) px(x, y, PAL.plasterDark);
    }

    const left = 6, right = 25, top = 5;
    for (let y = top; y < TILE_PX - 3; y++) {
      for (let x = left; x <= right; x++) {
        // Arched head: trim the top corners against a circle.
        const dx = x - 16, dy = y - (top + 8);
        if (dy < 0 && dx * dx + dy * dy * 1.6 > 110) continue;
        const plank = Math.floor((x - left) / 5);
        const n = hash2(plank, Math.floor(y / 3), 97);
        let c: string = n > 0.66 ? PAL.woodLight : n < 0.3 ? PAL.woodDark : PAL.woodMid;
        if ((x - left) % 5 === 0) c = PAL.woodDeep;
        if (x === left || x === right) c = PAL.outline;
        px(x, y, c);
      }
    }
    // Lintel highlight and a pair of cross braces.
    for (let x = left; x <= right; x++) px(x, top - 1, PAL.woodPale);
    for (const y of [16, 24]) {
      for (let x = left + 1; x < right; x++) { px(x, y, PAL.woodDeep); px(x, y + 1, PAL.woodPale); }
    }
    // Handle.
    px(21, 21, '#f4dc98'); px(22, 21, '#d8b45c');
    px(21, 22, '#d8b45c'); px(22, 22, '#9c7c34');

    // Stone step.
    for (let x = 3; x < 29; x++) {
      px(x, TILE_PX - 3, PAL.stoneLight);
      px(x, TILE_PX - 2, PAL.stoneMid);
      px(x, TILE_PX - 1, PAL.outline);
    }
  }

  /* ----------------------------------------------------------- interior */

  /**
   * Floorboards.
   *
   * Grain runs *along* the plank, in long thin streaks, with one dark seam per
   * course and nothing else. A floor is the largest single surface in any
   * interior: blobby two-dimensional noise on it reads as damp stone, and
   * strong seams turn the room into a barcode the furniture has to fight.
   */
  private woodFloor(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.woodMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        // Stretched horizontally: sampling x eight times slower than y turns
        // round noise into wood grain.
        const n = wrapNoise(x, y * 4, 16, 101);
        px(x, y, n > 0.68 ? PAL.woodLight : n < 0.32 ? PAL.woodDark : PAL.woodMid);
      }
    }
    // Two courses per tile, each a single dark seam with a lit lip above it.
    for (const y of [0, 16]) {
      for (let x = 0; x < TILE_PX; x++) {
        px(x, y, PAL.woodDeep);
        px(x, y + 1, PAL.woodPale);
      }
    }
    // A knot or two, which is the only detail this surface needs.
    for (let i = 0; i < 2; i++) {
      const kx = 3 + rng.below(TILE_PX - 6);
      const ky = 4 + rng.below(10) + (i === 0 ? 0 : 16);
      px(kx, ky, PAL.woodDark);
      px(kx + 1, ky, PAL.woodDeep);
      px(kx, ky + 1, PAL.woodDeep);
      px(kx + 1, ky + 1, PAL.woodDark);
    }
  }

  private rug(px: Px, fill: (c: string) => void): void {
    fill('#8a4a52');
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        // Woven texture: alternating warp and weft.
        px(x, y, ((x >> 1) + (y >> 1)) % 2 === 0 ? '#93505a' : '#82454d');
      }
    }
    for (let x = 0; x < TILE_PX; x++) { px(x, 0, '#5e2f36'); px(x, TILE_PX - 1, '#5e2f36'); }
    for (let y = 0; y < TILE_PX; y++) { px(0, y, '#5e2f36'); px(TILE_PX - 1, y, '#5e2f36'); }
    for (let i = 0; i < 2; i++) {
      const inset = 5 + i * 4;
      const c = i === 0 ? '#d8b06a' : '#e8caa0';
      for (let x = inset; x < TILE_PX - inset; x++) { px(x, inset, c); px(x, TILE_PX - 1 - inset, c); }
      for (let y = inset; y < TILE_PX - inset; y++) { px(inset, y, c); px(TILE_PX - 1 - inset, y, c); }
    }
    for (let d = 0; d < 5; d++) {
      px(16 - d, 16, '#e8caa0'); px(16 + d, 16, '#e8caa0');
      px(16, 16 - d, '#e8caa0'); px(16, 16 + d, '#e8caa0');
    }
  }

  private interiorWall(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.plasterDark);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(x, y, 103) * 0.5 + hash2(Math.floor(x / 4), Math.floor(y / 4), 29) * 0.5;
        if (n > 0.7) px(x, y, PAL.plasterLight);
        else if (n > 0.55) px(x, y, PAL.plasterMid);
        else if (n < 0.25) px(x, y, '#8f7f63');
      }
    }
    for (let x = 0; x < TILE_PX; x++) {
      px(x, 22, PAL.woodDeep);
      px(x, 23, PAL.woodPale);
      for (let y = 24; y < TILE_PX; y++) px(x, y, x % 8 === 0 ? PAL.woodDark : PAL.woodMid);
      px(x, TILE_PX - 1, PAL.woodDeep);
    }
    void rng;
  }

  private counter(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.woodMid);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = hash2(Math.floor(x / 3), y, 107);
        px(x, y, n > 0.66 ? PAL.woodLight : n < 0.3 ? PAL.woodDark : PAL.woodMid);
      }
    }
    for (let x = 0; x < TILE_PX; x++) {
      px(x, 0, PAL.woodPale); px(x, 1, '#e0bd8f'); px(x, 2, PAL.woodPale);
      px(x, 3, PAL.woodLight);
      px(x, TILE_PX - 3, PAL.woodDeep);
      px(x, TILE_PX - 2, PAL.outline);
      px(x, TILE_PX - 1, PAL.outline);
    }
    for (let i = 0; i < 3; i++) {
      for (let x = 0; x < TILE_PX; x++) px(x, 8 + i * 7, PAL.woodDeep);
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
