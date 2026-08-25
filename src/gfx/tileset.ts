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
  /**
   * The other two path edges.
   *
   * PATH_EDGE_N and S have existed since the first tileset, and every road in
   * the game that runs east to west gets its dithered lip from them. A road
   * that runs north to south gets nothing, because the code that picks the
   * edge tiles only ever looks up and down -- so every high street in every
   * town is a straight-cut gold stripe laid on the lawn, which is exactly the
   * join the N/S pair exists to prevent.
   *
   * Appended here rather than filed beside their siblings: tile ids are atlas
   * indices, so inserting one in the middle of the enum moves every cell after
   * it.
   */
  PATH_EDGE_W,
  PATH_EDGE_E,
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
  // Turf.
  //
  // The ground still has to be *light* -- that is what lets a hard 1px outline
  // do the separating and stops every sprite looking pasted on. What it does
  // not have to be is pale sage. The era's outdoor scenes carry far more chroma
  // than a sage does at the same brightness, and green is the hue that takes
  // the most of it before it turns garish, so the ramp holds its luminance and
  // spends the room on saturation instead. The deep end also drifts a little
  // cooler and the lit end a little warmer, which is what sunlight through a
  // leaf actually does and is worth more than another step of the ramp.
  //
  // Chroma climbs with lightness rather than staying flat along the ramp, and
  // the hue rotates with it -- 109 degrees at the shaded end, 93 at the tip.
  // That is what sunlight through a leaf does, and it is why this reads as a
  // field with light falling across it rather than as one green at six
  // brightnesses. Luminance is unchanged from the sage version it replaces; all
  // of the extra is spent on saturation, so the ground is no darker under a
  // sprite than it was.
  grassDeep: '#3d8f2b',
  grassDark: '#52ad3a',
  grassMid: '#74d24d',
  grassLight: '#8ede62',
  grassHi: '#a9ea7d',
  grassTip: '#c9f8a2',

  // Canopies sit a full step darker than turf so a treeline reads as mass.
  //
  // The same rotation, taken further: the deep end is a cold blue-green because
  // shadow under leaf is lit by sky rather than by sun, and the tip is a warm
  // yellow-green because the top of a crown is lit by both. A canopy drawn
  // between those two ends has depth in it; one drawn from a single hue at six
  // brightnesses is a green ball, which is what a treeline used to read as.
  // A treeline is *mass*, and mass is a value relationship, not a hue one --
  // so the whole ramp gained chroma but only the shadow end gained brightness.
  // The lit end sits a clear step below the turf it stands on, which is what
  // keeps a wood reading as a wood when the field behind it went this green.
  leafDeep: '#0d4416',
  leafDark: '#1b6823',
  leafMid: '#2a8a2c',
  leafLight: '#3ba634',
  leafHi: '#54c343',
  leafTip: '#7ade5c',

  // Tall grass gets its own ramp rather than borrowing the canopy's.
  //
  // The thing you wade through is *grass*, and mixing it out of tree greens is
  // what made a patch read as a hedge lying across the field -- same hue, same
  // depth, same cold shadow as the wood on the far side of the map. This sits
  // exactly one step below the turf at every point: dense enough that a clump
  // separates from the lawn it stands in, light enough that it is obviously the
  // same plant grown longer. The seed heads are the only warm thing in it, and
  // they are what makes a patch read as ripe rather than as scrub.
  weedDeep: '#22551a',
  weedDark: '#337524',
  weedMid: '#489533',
  weedLight: '#60b444',
  weedHi: '#7fd05a',
  seedHead: '#ecd775',
  seedTip: '#fff2b0',

  // Paths are warm sand, not brown mud. Warmer and one notch more golden than
  // they were, because a road running through the new turf has to hold its own
  // as a *material* and a grey-tan beside a saturated green reads as dust.
  // A road beside the new turf has to be *gold*, not oat. The mid is also a
  // notch darker than it was: a path that is nearly as light as the grass is a
  // pale shape on a pale shape, and the two only separate once the road sits
  // clearly below the field it runs through.
  dirtDeep: '#8f6a2c',
  dirtDark: '#bd9240',
  dirtMid: '#dfb662',
  dirtLight: '#f0d189',
  dirtPale: '#fdedbb',

  // Stone stays neutral -- it is the one outdoor material that must not gain
  // chroma, or a cliff starts competing with the foliage in front of it -- but
  // the ramp is widened at both ends so rock can carry form.
  stoneDeep: '#4a4856',
  stoneDark: '#6f6d7c',
  stoneMid: '#95939e',
  stoneLight: '#b9b7c1',
  stonePale: '#dcdae0',

  // Water is where the outdoor palette is allowed to peak. Nothing stands on
  // it, so it can carry chroma the turf never could, and a pond that is a real
  // blue is what makes the green beside it read as green rather than as olive.
  waterDeep: '#0d4e9e',
  waterDark: '#1a72cd',
  waterMid: '#2496e6',
  waterLight: '#4fb8f5',
  waterPale: '#8adcfd',
  waterFoam: '#e6fbff',

  // Deep water gets a ramp of its own rather than borrowing the shallows'
  // bottom end. Every coastline and the whole Tide Bastion puzzle depend on
  // reading "wall" from colour alone, so this is built to a rule: the brightest
  // tone here is still darker than the *body* of the shallows, and it gets its
  // separation from chroma instead of from light. The old face was mixed from
  // greyed navies that were duller than the new palette's base blue, which is
  // why a lake came out as a flat slab with nothing moving on it.
  // The three body tones are kept deliberately close together. A wide range
  // over noise this coarse does not read as depth, it reads as naval
  // camouflage -- the event on deep water belongs in the crests, which are
  // shapes, not in the field, which is only there to be dark and blue.
  deepSink: '#072f66',
  deepBody: '#0b3f86',
  deepLift: '#12539d',
  deepCrest: '#1a6ec8',
  deepTrough: '#04193f',
  // The brightest mark deep water is allowed. Deliberately a shade *under* the
  // body colour of the shallows, so a handful of glints can never add up to
  // "you may walk here".
  deepGlint: '#2f86d4',

  sandDark: '#d9a44e',
  sandMid: '#f0ca77',
  sandLight: '#fadfa0',
  sandPale: '#fff5cf',

  trunkDeep: '#331d0a',
  trunkDark: '#5b3614',
  trunkMid: '#875421',
  trunkLight: '#b57c34',
  trunkLit: '#d7a256',

  woodDeep: '#5c360f',
  woodDark: '#82521f',
  woodMid: '#ae7a32',
  woodLight: '#d4a24f',
  woodPale: '#f0cd86',

  // Building walls: cream plaster with a warm shadow side.
  plasterDark: '#c9b489',
  plasterMid: '#e6d8b1',
  plasterLight: '#f5ebcb',
  plasterPale: '#fdf8e6',

  // The default house roof: warm terracotta with visible slats.
  roofDeep: '#96430f',
  roofDark: '#c25f18',
  roofMid: '#e4842a',
  roofLight: '#f7a441',
  roofPale: '#ffc76b',

  // Waystation red. Loud on purpose: it is a landmark, not decoration.
  redDeep: '#8d0f1d',
  redDark: '#c11d2b',
  redMid: '#ec2f3c',
  redLight: '#fb555d',
  redPale: '#ff8b8e',

  // Provisioner blue, the other half of the pair.
  blueDeep: '#123b80',
  blueDark: '#1d5cb2',
  blueMid: '#2a81e0',
  blueLight: '#4ea5f4',
  bluePale: '#84c9fa',

  // Slate. Cold and blue-grey, so a slate house next to a terracotta one reads
  // as a different *material* and not as the same roof with a filter on it.
  slateDeep: '#26334c',
  slateDark: '#374b73',
  slateMid: '#4d6ca8',
  slateLight: '#6e8dc4',
  slatePale: '#9bb2dd',

  // Weathered moss green, for the older cottages.
  mossDeep: '#2b401e',
  mossDark: '#43602c',
  mossMid: '#5f843e',
  mossLight: '#82a758',
  mossPale: '#abc97e',

  // Brick, with a mortar that is pale enough to draw the courses on its own.
  brickDeep: '#5b2013',
  brickDark: '#83341e',
  brickMid: '#ac4c2c',
  brickLight: '#c9673d',
  brickPale: '#e28a5b',
  // Mortar has to draw the courses without shouting them: at four units to a
  // brick a joint that is much lighter than this turns a wall into candy
  // stripes long before it turns into brickwork.
  mortar: '#cdbea0',

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

  // The laboratory's own materials.
  //
  // The roof deck used to be mixed from the stone ramp, which meant the one
  // building in the game that is supposed to share nothing with a house shared
  // its entire palette with the cliff face at the edge of the map -- and on
  // any map with both, the lab read as an outcrop with windows in it. A cool
  // blue-steel says "built" where grey says "quarried", and the accent is the
  // painted band institutions of the period put under their coping.
  deckDeep: '#2b3a4d',
  deckDark: '#42566e',
  deckMid: '#5b7186',
  deckLight: '#7e93a6',
  deckPale: '#a4b6c4',
  labAccent: '#2f8f9e',
  labAccentDark: '#1f6b78',

  glass: '#4f9ad9',
  glassLight: '#8ccbf1',
  glassHi: '#ddf2fe',

  outline: '#20242e',
  shadow: 'rgba(24,28,38,0.26)',

  // Contact shadow under furniture. Translucent on purpose: furniture is drawn
  // over whatever floor the map has, so its shadow has to tint boards, civic
  // tile and turf alike rather than stamp one colour of its own.
  contact: 'rgba(38,32,34,0.34)',
  contactSoft: 'rgba(38,32,34,0.15)',
} as const;

/**
 * Canopy ramps, deep -> tip, one per tree alternate.
 *
 * A wood mixed from a single six-green ramp is cladding, however good the
 * individual crown is: what separates one tree from the next in a real treeline
 * is not silhouette, which the eye forgives at this size, but *hue*. So the
 * alternates are three species rather than three shapes -- the house green at
 * 121 degrees, a sunnier olive at 101, and a cooler spring green at 133 -- and
 * because `srcFor` picks an alternate from world position, a stand comes out
 * mixed instead of striped.
 *
 * All three hold the same luminance at every step, so no species is a brighter
 * or darker mass than its neighbours and a treeline still reads as one wall.
 */
const CANOPY: readonly string[][] = [
  [PAL.leafDeep, PAL.leafDark, PAL.leafMid, PAL.leafLight, PAL.leafHi, PAL.leafTip],
  ['#17470f', '#2a6d15', '#418f1c', '#59ac26', '#78c73c', '#9fdd60'],
  ['#0a3f1c', '#136328', '#1c8434', '#28a441', '#3fc35a', '#68dd80'],
];

/** Named steps of whichever canopy ramp is in play. */
interface Leaf {
  deep: string; dark: string; mid: string; light: string; hi: string; tip: string;
}

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
  // Same reason again, for colour rather than for shape: one bed of red and
  // gold planted outside every building in the world is a municipal contract,
  // not a garden. The alternates carry different flowers.
  [T.FLOWER_BED]: 3,
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
      case T.PATH_EDGE_W: this.pathEdge(px, fill, rng, 'w'); break;
      case T.PATH_EDGE_E: this.pathEdge(px, fill, rng, 'e'); break;
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
    const S = TILE_SIZE;
    /**
     * Authoring-grid write that wraps at the cell.
     *
     * A mark placed near an edge has to arrive on the opposite one, or the
     * scatter thins out along every tile boundary and a field draws its own
     * grid in negative space -- which is the exact failure the weave was built
     * to avoid, reintroduced by the thing sitting on top of it.
     */
    const W = (x: number, y: number, c: string) =>
      P(((x % S) + S) % S, ((y % S) + S) % S, c);

    // 1. Sun and shade.
    //
    // The weave alone gave every square unit of the world the same value, so a
    // town green was one flat colour with a stipple ruled over it -- correct,
    // seamless, and completely inert. Two octaves of wrapping noise put slow
    // patches of light and shade under the weave, which is what a lawn actually
    // has. Kept to one step either side of the base so it reads as ground that
    // is not perfectly level, never as blotches. Both octaves wrap at the cell,
    // so a field of any size still has no seam and no lattice.
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 300 + seed) * 0.62
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 400 + seed) * 0.38;
        if (n > 0.60) P(x, y, PAL.grassLight);
        else if (n < 0.40) P(x, y, PAL.grassDark);
      }
    }

    // 2. The weave, in two directions.
    //
    // The original single diagonal stays -- it is the stroke that makes this
    // read as grass rather than as noise, and it is the half of the tile the
    // player says they like. A second, sparser diagonal running the other way
    // crosses it, so the ground has blades lying two ways instead of a ruled
    // hatch, and the accents on that one reach a step further up and down the
    // ramp than the first. Both moduli wrap at sixteen, so both meet themselves
    // exactly at every edge.
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const a = (x * 3 + y * 5 + seed * 7) % 16;
        const b = (x * 5 + y * 3 + seed * 11) % 16;
        if (a === 1) P(x, y, PAL.grassLight);
        else if (a === 9) P(x, y, PAL.grassDark);
        // The counter-weave is gated down to roughly a third of its old
        // density. It reaches two steps further up and down the ramp than the
        // first one does, and once the palette gained this much chroma a mark
        // that pale every sixteenth pixel stopped reading as a glint and
        // started reading as salt spilled over the field. The gate is another
        // modulus of sixteen, so it wraps like everything else here.
        if (b === 4 && (x * 7 + y * 9 + seed) % 16 < 7) P(x, y, PAL.grassHi);
        else if (b === 12 && (x * 9 + y * 7 + seed) % 16 < 7) P(x, y, PAL.grassDeep);
      }
    }

    // 3. Blades.
    //
    // The weave is a pattern; blades are objects, and a field needs both. Nine
    // short strokes per cell, each a shaded stem with a lit tip and leaning
    // whichever way its hash says, is the smallest thing that reads as grass
    // you could put a hand into rather than as a hatched surface. One
    // authoring unit is one logical pixel, so a three-unit blade is three
    // pixels tall on the hardware this is quoting -- the size the era drew
    // them at, and small enough that a creature standing here still wins.
    for (let i = 0; i < 9; i++) {
      const bx = Math.floor(hash2(i, 1, 860 + seed) * S);
      const by = Math.floor(hash2(i, 2, 871 + seed) * S);
      const lean = hash2(i, 3, 883 + seed) < 0.5 ? -1 : 1;
      const len = 2 + Math.floor(hash2(i, 4, 897 + seed) * 2);
      for (let k = 0; k < len; k++) {
        const tip = k === len - 1;
        W(bx + (tip ? lean : 0), by - k, tip ? PAL.grassHi : PAL.grassDark);
      }
      // The blade's own shadow on the turf at its root, so it is growing out of
      // the ground rather than lying on it.
      W(bx, by + 1, PAL.grassDeep);
    }
  }

  /**
   * A tuft: blades out of one root, lit at the tips, with its own shadow.
   *
   * Seven marks rather than five. The two extra are the ones that do the work:
   * a lit middle blade, so the clump has a crown instead of two horns, and a
   * shaded unit under the root, so it is standing on the turf rather than
   * printed onto it.
   */
  private tuft(P: Px, x: number, y: number): void {
    P(x, y, PAL.grassDark);
    P(x + 1, y, PAL.grassDeep);
    P(x + 2, y, PAL.grassDark);
    P(x, y - 1, PAL.grassHi);
    P(x + 1, y - 1, PAL.grassLight);
    P(x + 2, y - 1, PAL.grassTip);
    P(x + 1, y + 1, PAL.grassDeep);
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
      // centre. The petals are no longer one flat colour -- the two turned away
      // from the light are a step down, which at four units across is the whole
      // difference between a bloom and a coloured cross -- and each clump now
      // sits on a scrap of its own foliage, so the flowers are growing out of
      // something instead of lying on the lawn.
      const petals = ['#f6eec4', '#ffd23c', '#ff6f8c', '#c07ef0'];
      for (let i = 0; i < 3; i++) {
        const fx = 2 + rng.below(TILE_SIZE - 4);
        const fy = 3 + rng.below(TILE_SIZE - 5);
        const c = petals[rng.below(petals.length)]!;
        const cd = mixDown(c);
        P(fx - 1, fy + 1, PAL.grassDark);
        P(fx + 1, fy + 1, PAL.grassDark);
        P(fx, fy - 1, c); P(fx - 1, fy, c);
        P(fx + 1, fy, cd); P(fx, fy + 1, cd);
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
        put(x, y, y >= ROOT - 1 || stem === 0 ? PAL.weedDeep
          : h(x, y, 5) > 0.55 ? PAL.weedDark : PAL.weedDeep);
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

    const back = [PAL.weedDeep, PAL.weedDark, PAL.weedMid, PAL.weedLight];
    const front = [PAL.weedDark, PAL.weedMid, PAL.weedLight, PAL.weedHi];

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

    // Seed heads catching the light, up in the crown where they show.
    //
    // Three marks each rather than two, and gold rather than pale green: a
    // seed head that is only a brighter green is another blade, and the whole
    // point of it is to be the one warm thing in the clump. The stalk under it
    // is a step down so the head is sitting on something.
    // Placed from hashes rather than the shared Rng: three heads want six
    // draws where the old pair took four, and every tile painted after this one
    // comes out of the same stream, so the four are swallowed below instead and
    // the rest of the set is left exactly where it was.
    for (let i = 0; i < 3; i++) {
      const sx = L + 2 + Math.floor(h(i, 21, 1301) * (R - L - 3));
      const sy = 4 + Math.floor(h(i, 22, 1307) * 5);
      put(sx, sy + 1, PAL.weedDark);
      put(sx, sy, PAL.seedHead);
      put(sx, sy - 1, PAL.seedTip);
    }
    for (let i = 0; i < 4; i++) rng.below(S);

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
        //
        // Two things soften what was otherwise a flat dark slab filling the
        // bottom of every cell -- which at map size turned a patch into a row
        // of rectangles rather than clumps standing in grass. The skirt now
        // *deepens* towards the root instead of holding one value, so it reads
        // as the clump's own shadow; and the two rows above the wading line,
        // which are behind the player and may safely stay part turf, carry a
        // dithered lead-in so the band does not begin on a ruled edge.
        if (y >= WADE) f = Math.max(f, 1 + Math.min(0.95, (y - WADE) * 0.16));
        else if (y >= WADE - 2) f = Math.max(f, (y - (WADE - 2)) * 0.5);
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
    const S = TILE_SIZE;

    // Worn and packed, the same way the turf has sun and shade: a road that is
    // one flat value with a stipple on it is a strip of paper. Wrapping noise,
    // so a square in a town is one continuous surface and not a grid.
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 511) * 0.62
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 523) * 0.38;
        if (n > 0.62) P(x, y, PAL.dirtLight);
        else if (n < 0.38) P(x, y, PAL.dirtDark);
      }
    }
    // The weave, running the other way from the turf's, so a road reads as a
    // different material and not just as a different colour. One diagonal
    // only, and never at the pale end of the ramp: a second stroke or a
    // brighter one turns a road into a ploughed field seen from the air.
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const d = (x * 5 + y * 3) % 16;
        if (d === 2) P(x, y, PAL.dirtLight);
        else if (d === 11) P(x, y, PAL.dirtDark);
      }
    }
    // Grit worked into the surface.
    //
    // One patch of three grains, and in road grey rather than in the stone
    // ramp. The first cut of this put eight cool-grey grains in every cell and
    // a town square came out looking like it had been rained on by pigeons:
    // against gold this saturated, true grey is the loudest thing that can be
    // put on the tile, so it takes almost none of it. What is left says "there
    // is stone in this road" and nothing else.
    const gritLit = '#b3a794';
    const gritDim = '#8b7f6d';
    const gx = Math.floor(hash2(0, 1, 1601) * (S - 5));
    const gy = Math.floor(hash2(0, 2, 1607) * (S - 5));
    for (let k = 0; k < 3; k++) {
      const sx = gx + Math.floor(hash2(k, 3, 1613) * 5);
      const sy = gy + Math.floor(hash2(k, 4, 1619) * 5);
      P(sx, sy, hash2(k, 0, 1621) > 0.5 ? gritLit : gritDim);
      P(sx, sy + 1, PAL.dirtDark);
    }
    // Stones trodden into the surface: a lit crown, a shaded far side and a
    // shadow on the ground. Four marks rather than three, so a pebble has a
    // corner turning away from the light instead of a flat shaded half.
    for (let i = 0; i < 4; i++) {
      const bx = 1 + rng.below(S - 3);
      const by = 1 + rng.below(S - 3);
      P(bx, by, PAL.dirtPale);
      P(bx + 1, by, PAL.dirtLight);
      P(bx + 1, by + 1, PAL.dirtDark);
      P(bx, by + 1, PAL.dirtDeep);
    }
    // Grass finding its way up through the road. Two sprigs, in the shaded end
    // of the turf ramp only: a bright green mark on a road is a weed the size
    // of a person, and a street that is losing to the verge everywhere is a
    // track rather than the main road of a town.
    for (let i = 0; i < 2; i++) {
      const sx = 1 + Math.floor(hash2(i, 5, 1627) * (S - 2));
      const sy = 3 + Math.floor(hash2(i, 6, 1637) * (S - 4));
      P(sx, sy, PAL.grassDeep);
      P(sx, sy - 1, PAL.grassDark);
    }
  }

  /**
   * Where a path meets grass.
   *
   * A dithered fringe rather than a straight cut: two rows of alternating turf
   * and sand is the oldest trick in the era's tilesets and still the one that
   * stops a road looking like tape stuck on a lawn.
   *
   * One drawing, four orientations. The fringe is described in (along, depth)
   * and mapped onto rows or columns at the end, so the side of a road gets the
   * identical treatment to its top and there is no second copy of the pattern
   * to keep in step with the first.
   */
  private pathEdge(px: Px, fill: (c: string) => void, rng: Rng,
    side: 'n' | 's' | 'w' | 'e'): void {
    this.path(px, fill, rng);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const vertical = side === 'n' || side === 's';
    const leading = side === 'n' || side === 'w';
    /** Depth i counted inward from whichever edge this tile borders grass on. */
    const lane = (i: number) => (leading ? i : S - 1 - i);
    /** One unit at (along the edge, depth into the tile). */
    const A = (t: number, i: number, c: string) =>
      (vertical ? P(t, lane(i), c) : P(lane(i), t, c));

    for (let t = 0; t < S; t++) {
      // The turf rows carry the field's own weave rather than a flat band of
      // one green, so the fringe is the same grass as the tile it borders and
      // the join does not show as a ruled line of colour.
      const w = (t * 3 + lane(0) * 5 + 21) % 16;
      A(t, 0, w === 1 ? PAL.grassLight : w === 9 ? PAL.grassDark : PAL.grassMid);
      if ((t * 3) % 5 !== 0) A(t, 1, PAL.grassDark);
      // Blades overhanging the kerb, then the lip of the sand catching the
      // light just under them, then the ground falling away into the road.
      if ((t * 7) % 5 === 0) A(t, 2, PAL.grassDeep);
      else A(t, 2, PAL.dirtLight);
      A(t, 3, (t * 5) % 7 === 0 ? PAL.dirtDark : PAL.dirtMid);
    }
  }

  /**
   * Paving.
   *
   * Half-offset slabs, but drawn on the authoring grid so a joint is one unit
   * and not two-and-a-half buffer pixels of grey. Each slab gets its own tint,
   * a lit head where it catches the light and a shaded joint on two sides, so a
   * square reads as laid stone rather than as a grey brick wallpaper.
   */
  private stoneFloor(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.stoneMid);
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let y = 0; y < S; y++) {
      const course = Math.floor(y / 4);
      const offset = (course % 2) * 4;
      for (let x = 0; x < S; x++) {
        const bx = (x + offset) % 8;
        const by = y % 4;
        const n = hash2(Math.floor((x + offset) / 8), course, 13);
        let c: string = n > 0.66 ? PAL.stoneLight : n < 0.33 ? PAL.stoneDark : PAL.stoneMid;
        // Wear inside the slab: a sparse mottle on a repeat that divides the
        // cell, so the stone is not one flat value edge to edge.
        if ((x * 5 + y * 3) % 11 === 4) c = n > 0.5 ? PAL.stonePale : PAL.stoneLight;
        if (by === 0) c = n > 0.5 ? PAL.stonePale : PAL.stoneLight;
        // The joint is one step down, not four. Paving cut with the deepest
        // stone in the ramp puts a black grid over a town square and drowns
        // out everything standing on it.
        else if (by === 3) c = PAL.stoneDark;
        if (bx === 0) c = PAL.stoneDark;
        else if (bx === 1 && by !== 3) c = n > 0.5 ? PAL.stoneLight : PAL.stoneMid;
        P(x, y, c);
      }
    }
    // Chips knocked out of the corners, so the paving has been walked on.
    for (let i = 0; i < 4; i++) {
      const cxp = rng.below(S), cyp = rng.below(S);
      P(cxp, cyp, PAL.stoneDeep);
      P(cxp + 1, cyp, PAL.stoneDark);
    }
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
    const S = TILE_SIZE;
    const P = this.unit(px);
    const TAU = Math.PI * 2;
    // Whole periods per cell and a phase that closes over the loop: the swell
    // has to be continuous from tile to tile and land back where it started on
    // the last frame, or a pond flickers instead of moving.
    const nf = ANIMATED[T.WATER] ?? 1;
    const phase = (animFrame / nf) * TAU;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        // The body of the surface is fixed. Only the swell over it moves --
        // animating the noise as well makes the whole pond swim about. Four
        // tones rather than three: the deepest one gathers into the troughs
        // between crests and is what gives the surface any depth at all.
        // Three octaves rather than two. The coarsest one wraps at a two-cell
        // lattice, so on its own it lays big soft diagonal patches across a
        // pond -- correct as depth, but it reads as camouflage. The finest
        // octave is the chop on top of that, and it is what turns the patches
        // back into a surface with water moving over it.
        const n = wrapNoise(x, y, 16, 61) * 0.45
          + wrapNoise(x, y, 8, 23) * 0.35
          + wrapNoise(x, y, 4, 29) * 0.20;
        const w = Math.sin((x / N) * TAU + (y / N) * TAU * 2 - phase) * 0.5 + 0.5;
        const v = n * 0.74 + w * 0.26;
        if (v > 0.79) px(x, y, PAL.waterPale);
        else if (v > 0.6) px(x, y, PAL.waterLight);
        else if (v < 0.22) px(x, y, PAL.waterDeep);
        else if (v < 0.38) px(x, y, PAL.waterDark);
      }
    }
    /**
     * Crests.
     *
     * The old glitter threw three-pixel dashes at hashed positions and rerolled
     * them every frame, so a pond came out speckled like static and the sparkle
     * flickered rather than travelled. A crest is a *shape*: a short pale head
     * with a dark trough directly under it, which is the only mark that reads
     * as a wave seen from above. They sit on four fixed rows, and the whole set
     * slides exactly a quarter of a cell per frame -- so the surface moves, the
     * loop closes on itself, and every tile of the pond is moving together.
     */
    const drift = Math.round((animFrame / nf) * S);
    // Long swell lines under the foam were tried here and taken out again. Any
    // horizontal mark drawn at a fixed row appears at that row in *every* tile
    // of the pond, so a seven-pixel line becomes a stripe the width of the
    // lake -- the same failure the crests below are scattered to avoid, only
    // worse, because a long mark cannot be scattered enough to hide it. The
    // crests have to carry the surface on their own.
    for (let i = 0; i < 8; i++) {
      // Scattered rows, not a ruled set of four: evenly spaced crest lines
      // across every tile of a pond come out as lined paper.
      const ry = Math.floor(hash2(i, 5, 811) * (S - 3));
      const len = 2 + Math.floor(hash2(i, 6, 73) * 3);
      // Half the crests run the other way, so the surface has cross-swell in
      // it rather than one conveyor belt of dashes.
      const x0 = Math.floor(hash2(i, 7, 71) * S) + drift * (i % 2 === 0 ? 1 : -1);
      // Two thirds of them are foam and the rest only pale water. Every crest
      // at full white was the loudest thing on the map after the sun, and a
      // pond of them read as a page of typing.
      const head = hash2(i, 8, 79) > 0.34 ? PAL.waterFoam : PAL.waterPale;
      for (let j = 0; j < len; j++) {
        const x = ((x0 + j) % S + S) % S;
        // The ends of a crest fall away, so the mark is a shallow arc rather
        // than a dash. Three pixels of arc is the difference between a wave
        // seen from above and a hyphen floating on a blue rectangle.
        const y = ry + (j === 0 || j === len - 1 ? 1 : 0);
        P(x, y, head);
        P(x, y + 1, PAL.waterDark);
      }
    }
    if (edge) {
      // Foam along a shoreline, breathing up and down the bank with the swell.
      // Three bands rather than two: the lace at the very top, the body of the
      // foam under it and the stain it leaves in the water below, which is what
      // stops a shoreline reading as a white stripe ruled along the tile.
      for (let x = 0; x < S; x++) {
        const h = 2 + Math.floor(wrapNoise(x * DETAIL, 0, 8, 41) * 3)
          + (Math.sin((x / S) * TAU * 2 + phase) > 0.5 ? 1 : 0);
        for (let y = 0; y < h; y++) P(x, y, y < h - 1 ? PAL.waterFoam : PAL.waterPale);
        P(x, h, PAL.waterLight);
        if ((x + Math.floor(phase)) % 3 !== 0) P(x, h + 1, PAL.waterMid);
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
    fill(PAL.deepBody);
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
        // Its replacement stacked three octaves of noise and four tones, which
        // fixed the repeat and produced naval camouflage instead: at this size
        // a body of deep water wants *few* tones and slow shapes, and all the
        // event on it belongs in the crests below.
        const n = wrapNoise(x, y, 16, 131) * 0.62 + wrapNoise(x, y, 8, 137) * 0.38;
        // The swell is a *diagonal* sine, so weighting it heavily crosses it
        // with the noise and lays argyle over the whole lake. It is here to
        // make the surface breathe, not to be seen.
        const w = Math.sin((x / N) * TAU - (y / N) * TAU * 2 + phase) * 0.5 + 0.5;
        const v = n * 0.9 + w * 0.1;
        if (v > 0.66) px(x, y, PAL.deepLift);
        else if (v < 0.34) px(x, y, PAL.deepSink);
      }
    }
    // Swell crests, undulating and travelling with the phase. Each is a lit
    // head over its own trough, the same two-mark shape the shallows use, only
    // taken far enough down the ramp that deep water never brightens towards
    // the colour a player is allowed to walk on.
    //
    // Three lines rather than two, on three different periods. Two lines on one
    // period is a pair of parallel ripples travelling in step, which is what a
    // lake read as: an animated stripe. Three that never line up is a surface.
    for (let i = 0; i < 3; i++) {
      const sy = 5 + i * 10;
      const per = 1 + i * 0.5;
      for (let x = 0; x < N; x++) {
        const y = (sy + Math.round(Math.sin((x / N) * TAU * per + phase + i * 2.1) * 3) + N) % N;
        if ((x + i * 4) % 11 < 6) {
          px(x, y, PAL.deepCrest);
          px(x, (y + 2) % N, PAL.deepTrough);
        }
      }
    }
    // Points of sky caught on the swell. A body of water this dark needs a few
    // hard bright marks or it is a painted floor; two pixels each and only a
    // handful of them, so it glints rather than sparkles.
    for (let i = 0; i < 3; i++) {
      const gx = Math.floor(hash2(i, 3, 1451) * N);
      const gy = (Math.floor(hash2(i, 4, 1453) * N) + Math.round((animFrame / nf) * N)) % N;
      px(gx, gy, PAL.deepGlint);
      px(gx + 2, gy, PAL.deepGlint);
    }
    // See `water`: the shared Rng is advanced, not read, so the frames of one
    // tile match and the tiles painted after it are unaffected.
    for (let i = 0; i < 2; i++) rng.below(N - 8);
  }

  /**
   * Beach sand.
   *
   * The old one was per-pixel hash noise, which at this size is not sand: it is
   * television static, and it fought every sprite that stood on it. Sand seen
   * from above is smooth, with slow banks of light and shade across it and the
   * tide's ripples ruled over the top -- so the body is wrapping noise (smooth,
   * seamless), the grain is a sparse stipple rather than every pixel, and the
   * ripples get a lit crest and a shaded trough so they read as corrugation
   * instead of as pencil lines.
   */
  private sand(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.sandMid);
    const S = TILE_SIZE;
    const P = this.unit(px);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 51) * 0.62
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 7) * 0.38;
        if (n > 0.70) P(x, y, PAL.sandPale);
        else if (n > 0.56) P(x, y, PAL.sandLight);
        else if (n < 0.32) P(x, y, PAL.sandDark);
        // Grain, scattered rather than ruled. A modulus of x and y draws a
        // diagonal line however small the numbers are, and a beach ribbed with
        // diagonal corduroy is worse than a beach with no grain at all.
        //
        // Sparser than it was by roughly half. At the old rate nearly a fifth
        // of the cell was a speck of one extreme or the other, which on a
        // palette this warm stopped reading as grain and started reading as
        // porridge -- and the ripples below, which are the marks that actually
        // say "beach", could not be seen through it.
        else if (hash2(x, y, 57) > 0.95) P(x, y, PAL.sandPale);
        else if (hash2(x, y, 59) > 0.96) P(x, y, PAL.sandDark);
      }
    }
    /**
     * One tide ripple: a lit crest, a body under it and its own shadow trough.
     *
     * Three tones, not two. A pale line with a dark line under it is a drawn
     * stroke; a crest that falls away through the mid tone into shadow is
     * corrugation, and corrugation is the only thing on a beach that tells you
     * which way the water came in from.
     */
    const ripple = (ry: number, phase: number, amp: number, gap: number) => {
      for (let x = 0; x < S; x++) {
        if ((x + gap) % 5 === 0) continue;      // broken along its length
        const y = ry + Math.round(Math.sin((x / S) * Math.PI * 2 + phase) * amp);
        P(x, y, PAL.sandPale);
        P(x, y + 1, PAL.sandMid);
        P(x, y + 2, PAL.sandDark);
      }
    };
    // Two ripples still come off the shared Rng, so the stream is untouched;
    // two more are placed from hashes, because four crossing sets at different
    // amplitudes is what turns a ribbed surface into a raked one.
    for (let i = 0; i < 2; i++) ripple(3 + rng.below(S - 6), i * 2, 1.6, i * 2);
    for (let i = 0; i < 2; i++) {
      ripple(2 + Math.floor(hash2(i, 9, 1511) * (S - 5)),
        hash2(i, 10, 1523) * 6.28, 2.4, i * 2 + 1);
    }
    // Shells and pebbles, each with a shadow so the beach has things lying on
    // it rather than pale dots printed into it. Half of them get a shell's own
    // colour instead of another value of sand -- a beach with two pink scraps
    // and a grey pebble on it has been somewhere, and it costs nine pixels.
    const litter = ['#fdf8ec', '#f6c0c6', '#cfd6dd'];
    for (let i = 0; i < 3; i++) {
      const sx = 1 + rng.below(S - 2), sy = 1 + rng.below(S - 2);
      P(sx, sy, litter[i % litter.length]!);
      P(sx + 1, sy, PAL.sandPale);
      P(sx, sy + 1, PAL.sandDark);
      P(sx + 1, sy + 1, mixDown(PAL.sandDark));
    }
  }

  /* -------------------------------------------------------------- flora */

  /**
   * The canopy ramp for the alternate currently being painted.
   *
   * `variantSeed` is already set by `build` for the duration of one tile, so
   * this needs no argument and every leafy tile that wants a species can just
   * ask. Tiles that must stay on the house green -- bramble, tall grass, the
   * flower bed -- simply keep using PAL directly.
   */
  private leaf(): Leaf {
    const r = CANOPY[variantSeed % CANOPY.length]!;
    return { deep: r[0]!, dark: r[1]!, mid: r[2]!, light: r[3]!, hi: r[4]!, tip: r[5]! };
  }

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
   * The three variants move the centre, the radius, the wobble and -- since the
   * palette gained its chroma -- the *species*: each alternate is mixed from its
   * own canopy ramp (see CANOPY), so a stand of trees is three greens rather
   * than three outlines of one.
   */
  private tree(px: Px, fill: (c: string) => void, rng: Rng, small: boolean): void {
    if (small) { this.smallTree(px, fill, rng); return; }
    void fill;

    const R = this.leaf();
    const P = this.unit(px);
    const S = TILE_SIZE;
    /** Per-variant constants; hash2 folds the variant seed, so these move. */
    const v = (s: number) => hash2(s, s * 3 + 1, 917);

    const cx = 7.5 + (v(1) - 0.5) * 1.4;
    const cy = 5.9 + (v(2) - 0.5) * 1.0;
    const rx = 6.9 + v(3) * 0.9;
    const ry = 6.1 + v(4) * 0.8;
    const phase = v(5) * 6.283;

    /**
     * The crown, as a cluster of lobes rather than one dome.
     *
     * A single radial light on an ellipse is a ball, and a wood full of balls
     * is what a treeline read as from a screen away: correct shading, no
     * foliage. Five overlapping masses -- one at the middle and four around it,
     * each with its own lit shoulder and its own shaded underside, and a valley
     * of shadow wherever two of them meet -- is how the era drew a canopy, and
     * it is the whole difference between leaves and a painted sphere.
     */
    const TAU = Math.PI * 2;
    const lobe: { x: number; y: number; r: number }[] = [
      { x: cx, y: cy - 0.7, r: rx * 0.58 },
    ];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + phase;
      lobe.push({
        x: cx + Math.cos(a) * rx * 0.50,
        y: cy + Math.sin(a) * ry * 0.50,
        r: rx * (0.40 + v(6 + i) * 0.15),
      });
    }

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx, dy = y - cy;
        const ang = Math.atan2(dy, dx);
        // A wobbled radius: a true ellipse reads as a ball, foliage does not.
        const wob = 1 + Math.sin(ang * 3 + phase) * 0.11 + Math.sin(ang * 5.4 - phase) * 0.07;
        const d = (dx * dx + dy * dy * (rx * rx) / (ry * ry)) / (rx * rx * wob * wob);

        if (d <= 1) {
          // Which mass this pixel belongs to, and how far out on it it sits.
          let near = lobe[0]!, t = 9;
          for (const L of lobe) {
            const q = Math.sqrt((x - L.x) ** 2 + (y - L.y) ** 2) / L.r;
            if (q < t) { t = q; near = L; }
          }
          const ldx = x - near.x, ldy = y - near.y;
          // Light from the upper left, broken into 2x2 clumps so the crown has
          // foliage in it rather than an airbrushed gradient.
          const clump = (hash2(x >> 1, y >> 1, 131) - 0.5) * 0.26;
          const lit = ((-dx * 0.75 - dy) / ry) * 0.5
            + ((-ldx * 0.8 - ldy) / (near.r * 1.6)) * 0.6
            - Math.max(0, t - 0.75) * 0.85          // the valley between lobes
            + clump;
          let c: string;
          // The outermost ring stays dark whatever the light does -- it is the
          // silhouette, and a treeline stops being a treeline the moment its
          // edge brightens. The ring just inside it is allowed to catch the
          // sun, which is what puts a lit shoulder on the crown instead of a
          // uniform dark band all the way round a lit ball.
          if (d > 0.955) c = R.deep;
          else if (d > 0.86) c = lit > 0.46 ? R.mid : lit > 0.10 ? R.dark : R.deep;
          else if (lit > 0.62) c = R.tip;
          else if (lit > 0.32) c = R.hi;
          else if (lit > 0.02) c = R.light;
          else if (lit > -0.32) c = R.mid;
          else if (lit > -0.66) c = R.dark;
          else c = R.deep;
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
    // reads as a trunk and not as a smudge of bark colour. The grain is one
    // hashed row in three taken a step up the ramp -- bark is ridged, and two
    // flat columns of brown is a post.
    const tx = Math.round(cx) - 1;
    for (let y = 9; y < S; y++) {
      const shaded = y < 11;                          // still under the crown
      const ridge = hash2(0, y, 613) > 0.6;
      P(tx, y, shaded ? PAL.trunkDark : ridge ? PAL.trunkLit : PAL.trunkLight);
      P(tx + 1, y, shaded ? PAL.trunkDeep : ridge ? PAL.trunkMid : PAL.trunkDark);
    }
    // Root flare, and the shadow the trunk throws on the ground beside it.
    P(tx - 1, 14, PAL.trunkDark); P(tx + 2, 14, PAL.trunkDeep);
    P(tx - 2, 15, PAL.trunkDeep); P(tx - 1, 15, PAL.trunkDark);
    P(tx + 2, 15, PAL.trunkDeep); P(tx + 3, 15, PAL.trunkDeep);
    for (let y = 12; y < S; y++) P(tx + 2, y, 'rgba(22,42,20,0.40)');

    // Leaves catching the light, gathered on the lit shoulder of whichever
    // lobe they land on rather than sprayed over the whole crown: highlights
    // that cluster read as sprays of leaf, highlights that scatter read as
    // dust on the glass.
    for (let i = 0; i < 14; i++) {
      const lx = rng.below(S), ly = rng.below(S);
      const dx = lx - cx, dy = ly - cy;
      if ((dx * dx + dy * dy * (rx * rx) / (ry * ry)) / (rx * rx) > 0.7) continue;
      let near = lobe[0]!, t = 9;
      for (const L of lobe) {
        const q = Math.sqrt((lx - L.x) ** 2 + (ly - L.y) ** 2) / L.r;
        if (q < t) { t = q; near = L; }
      }
      if (t > 0.8) continue;
      if ((-(lx - near.x) * 0.8 - (ly - near.y)) / near.r < 0.15) continue;
      P(lx, ly, R.tip);
      P(lx + 1, ly, R.hi);
      P(lx, ly + 1, R.hi);
    }

    // Gaps in the leaf.
    //
    // A crown with no holes in it is a cauliflower. Real foliage is thin in
    // places, and the shade behind it shows through -- so four small notches of
    // the deepest green are punched into the underside of the crown, on the
    // side away from the light where a break in the leaf would actually read.
    // Placed from hashes rather than the shared Rng so the notches move with
    // the species and not with the paint order.
    for (let i = 0; i < 4; i++) {
      const gx = Math.round(cx + (hash2(i, 1, 1051) - 0.35) * rx * 1.3);
      const gy = Math.round(cy + (hash2(i, 2, 1063) * 0.55 + 0.15) * ry);
      const dx = gx - cx, dy = gy - cy;
      if ((dx * dx + dy * dy * (rx * rx) / (ry * ry)) / (rx * rx) > 0.62) continue;
      P(gx, gy, R.deep);
      P(gx + 1, gy, R.dark);
      P(gx, gy + 1, R.dark);
    }
  }

  /**
   * A single bush on open turf, for gardens and route dressing. Outlined all
   * the way round, unlike the canopy, because this one is meant to read as one
   * object rather than as part of a mass.
   */
  private smallTree(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.turf(px, fill, 17);

    const R = this.leaf();
    const cx = 16, cy = 17, rx = 12, ry = 10;
    // Three masses across the bush, same reasoning as the canopy above: one
    // radial light on one ellipse is a green egg, whatever the outline does.
    const lobe = [
      { x: -5.5, y: -1.5, r: 6.5 },
      { x: 1.5, y: -3.5, r: 6.0 },
      { x: 6.5, y: 0.5, r: 5.5 },
    ];
    for (let y = -ry - 1; y <= ry + 1; y++) {
      for (let x = -rx - 1; x <= rx + 1; x++) {
        // A wobbled radius gives the outline its lumpy, hand-drawn edge.
        const ang = Math.atan2(y, x);
        const wob = 1 + Math.sin(ang * 3.3) * 0.1 + Math.sin(ang * 6.1 + 1.2) * 0.06;
        const d = (x * x) / (rx * rx * wob * wob) + (y * y) / (ry * ry * wob * wob);
        if (d > 1.18) continue;
        // The outline is only ink where it is a contact edge.
        //
        // A full ring of near-black round a bush this small is most of the
        // bush: at 1x it read as a dark doughnut with a green hole in it, and
        // once the field went this bright the doughnut was the only thing that
        // registered. So the lower arc -- the edge that has to sit against the
        // ground -- keeps its ink, and the upper arc is drawn in the species'
        // own deepest green, which separates it from the turf without spending
        // a quarter of the object on a border.
        if (d > 1) { px(cx + x, cy + y, y > -2 ? PAL.outline : R.deep); continue; }
        let near = lobe[0]!, t = 9;
        for (const L of lobe) {
          const q = Math.sqrt((x - L.x) ** 2 + (y - L.y) ** 2) / L.r;
          if (q < t) { t = q; near = L; }
        }
        const lit = ((-x * 0.7 - y) / ry) * 0.5
          + ((-(x - near.x) * 0.8 - (y - near.y)) / (near.r * 1.5)) * 0.6
          - Math.max(0, t - 0.72) * 0.9
          + (hash2(x >> 1, y >> 1, 271) - 0.5) * 0.22;
        // The rim band is narrower and the interior is lit harder than the
        // canopy's. A bush is a small object with an ink line already round it,
        // so a wide dark shoulder inside that line spends most of the shape on
        // border and the thing reads as a doughnut.
        px(cx + x, cy + y,
          d > 0.93 ? R.deep
          : lit > 0.5 ? R.tip
          : lit > 0.15 ? R.hi
          : lit > -0.15 ? R.light
          : lit > -0.5 ? R.mid : R.dark);
      }
    }
    for (let i = 0; i < 6; i++) {
      const lx = cx - 8 + rng.below(10), ly = cy - 7 + rng.below(8);
      px(lx, ly, R.tip);
      px(lx + 1, ly + 1, R.mid);
    }
    // Berries in the shade under the crown. Two clusters of a colour nothing
    // else outdoors uses is what stops a roadside bush being a green lump, and
    // it costs six pixels.
    for (let i = 0; i < 2; i++) {
      const bx = cx - 6 + Math.floor(hash2(i, 3, 1181) * 13);
      const by = cy + 1 + Math.floor(hash2(i, 4, 1187) * 6);
      if ((bx - cx) ** 2 / (rx * rx) + (by - cy) ** 2 / (ry * ry) > 0.7) continue;
      px(bx, by, '#e2415c');
      px(bx + 2, by + 2, '#c22a45');
      px(bx + 1, by + 1, R.deep);
    }
    // Contact shadow, so the bush sits on the ground rather than floating.
    for (let x = -8; x <= 8; x++) {
      const h = Math.round(Math.sqrt(Math.max(0, 1 - (x * x) / 81)) * 2);
      for (let y = 0; y <= h; y++) px(cx + x + 1, cy + ry + y - 1, PAL.grassDeep);
    }
  }

  /**
   * Bramble: the thicket that blocks a route until something clears it.
   *
   * The old one ruled ten straight diagonals across a field of two-pixel noise
   * and threw twenty-six pale specks over the top. It had no canes, no thorns
   * and nothing growing anywhere: at map size it read as a dark green carpet
   * with scratches on it.
   *
   * A bramble is *arcs*. Five canes bow across the cell, each with a lit upper
   * edge and its own shadow under it, with thorns standing off the top and a
   * few berries down in the mass. Every arc is a whole period across the cell,
   * so a hedge of any length is one continuous thicket.
   */
  private bramble(px: Px, fill: (c: string) => void, rng: Rng): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    const TAU = Math.PI * 2;
    fill('#1f3a1a');

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 611) * 0.6
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 617) * 0.4;
        P(x, y, n > 0.62 ? PAL.leafDark : n < 0.34 ? '#16301a' : PAL.leafDeep);
      }
    }
    // Leaf, in clumps, over most of the mass. Canes with nothing between them
    // are wire; the leaf is what makes this a thicket you cannot walk through.
    for (let i = 0; i < 16; i++) {
      const lx = rng.below(S), ly = rng.below(S);
      P(lx, ly, PAL.leafMid);
      P(lx + 1, ly, PAL.leafDark);
      P(lx, ly + 1, PAL.leafDeep);
    }

    for (let i = 0; i < 4; i++) {
      const y0 = 3 + i * 4;
      const amp = 2 + Math.floor(hash2(i, 1, 701) * 2);
      const ph = hash2(i, 2, 703) * TAU;
      for (let x = 0; x < S; x++) {
        const y = y0 + Math.round(Math.sin((x / S) * TAU + ph) * amp);
        P(x, y, PAL.leafLight);
        P(x, y + 1, '#16301a');
        if ((x + i) % 6 === 0) P(x, y - 1, PAL.leafHi);      // thorn
      }
    }

    // Berries, down in the shade where they show against the dark.
    for (let i = 0; i < 5; i++) {
      const bx = 1 + rng.below(S - 2), by = 2 + rng.below(S - 4);
      P(bx, by, '#6e1230');
      P(bx + 1, by, '#a82048');
      P(bx, by + 1, '#0f2210');
    }
    for (let x = 0; x < S; x++) { P(x, 0, PAL.outline); P(x, S - 1, PAL.outline); }
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
        let c: string = lit > 0.42 ? PAL.stonePale
          : lit > 0.12 ? PAL.stoneLight
          : lit > -0.2 ? PAL.stoneMid
          : lit > -0.5 ? PAL.stoneDark : PAL.stoneDeep;
        // Lichen on the weather side. Two small patches of dry yellow-green is
        // the whole difference between a rock and a grey egg, and it is the one
        // colour a stone in a field is allowed to have.
        if (lit > 0.0 && hash2(x >> 1, y >> 1, 373) > 0.88) c = '#9ba469';
        else if (lit > -0.2 && hash2(x >> 1, y >> 1, 379) > 0.92) c = '#7f8a56';
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
        /**
         * The body of the slab, over two tones rather than three.
         *
         * Letting the body reach the deepest stone put a third of the face in
         * the same value as the joints and the undercuts, so the marks that
         * carry the strata stopped being marks and the whole cliff came out as
         * grey camouflage. With the deep tone reserved for structure -- joints,
         * undercuts, fractures -- every dark unit on the face means something.
         */
        const body = tint > 0.5 ? PAL.stoneMid : PAL.stoneDark;
        // Rock is not neutral: half the slabs are warmed and half cooled by a
        // step, which is the difference between a cliff and a concrete panel.
        const warm = hash2(c * 9 + b, 11, 239) > 0.5;

        for (let k = 0; k < h; k++) {
          // The four marks that make a band read as a slab seen edge on: a lit
          // top face, its front falling away, the body of the rock, and the
          // undercut where the next slab down lies in this one's shadow.
          let col: string = body;
          if (k === 0) col = tint > 0.5 ? PAL.stonePale : PAL.stoneLight;
          else if (k === 1) col = tint > 0.5 ? PAL.stoneLight : PAL.stoneMid;
          else if (k === h - 1) col = PAL.stoneDeep;
          else if (k === h - 2) col = PAL.stoneDark;
          else if (col === body && hash2(x, y0 + k, 257) > 0.86) {
            col = warm ? '#8d8479' : '#8a8ea0';
          }
          // The joint between two slabs: a dark cut that stops short of the lit
          // top, with the broken edge beside it catching a little light.
          if (joints[c]!.has(x) && k > 0 && k < h - 1) col = PAL.stoneDeep;
          else if (joints[c]!.has(wrap(x - 1)) && k > 1 && k < h - 2) col = PAL.stoneLight;
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
        // The shelf carries the field's own turf -- mottle and both weaves, at
        // the seed `turf` uses -- so the grass on top of a cliff is the same
        // grass as the grass beside it and the lip is the only thing that
        // shows. A simplified copy of the ground here is a visible patch.
        for (let y = 0; y < h; y++) {
          if (y === h - 1) { P(x, y, PAL.grassDark); continue; }
          const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 303) * 0.62
            + wrapNoise(x * DETAIL, y * DETAIL, 4, 403) * 0.38;
          let c: string = n > 0.60 ? PAL.grassLight : n < 0.40 ? PAL.grassDark : PAL.grassMid;
          const wa = (x * 3 + y * 5 + 21) % 16;
          const wb = (x * 5 + y * 3 + 33) % 16;
          if (wa === 1) c = PAL.grassLight;
          else if (wa === 9) c = PAL.grassDark;
          if (wb === 4) c = PAL.grassHi;
          else if (wb === 12) c = PAL.grassDeep;
          P(x, y, c);
        }
        P(x, h, PAL.outline);
        P(x, h + 1, PAL.stoneDeep);
        P(x, h + 2, PAL.stoneDark);
        // The odd clump hanging over the edge, so the lip is not a ruled line.
        if (hash2(x, 9, 2) > 0.62) { P(x, h + 1, PAL.grassDeep); P(x, h + 2, PAL.grassDeep); }
      }
    }
  }

  /**
   * A ledge: the bank you can hop down and not climb back up.
   *
   * The old one was drawn straight onto the buffer grid -- a hairline lip, nine
   * rows of dithered dirt and another hairline under it -- so a run of them
   * came out as a brown hedge with black wire along the top and bottom. It gave
   * no reason to believe the ground was higher on one side.
   *
   * Rebuilt on the authoring grid as four marks in a row: turf, a hard lip with
   * blades falling over it, a short earth face lit directly under the lip and
   * falling into shadow, and the shadow the whole bank throws on the ground
   * below. That last one is the important one -- a drop is only legible if
   * something beneath it is in shade.
   */
  private ledge(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.turf(px, fill, 37);
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let x = 0; x < S; x++) {
      // A wandering lip, so a run of ledges is a bank and not a plank.
      const lip = 5 + (hash2(x, 0, 331) > 0.62 ? 1 : 0);
      P(x, lip - 1, PAL.grassDark);
      P(x, lip, PAL.outline);
      // The face is *rock*, not earth. Warm brown under saturated turf reads as
      // a hedge of straw at map size, whichever way it is shaded; grey is the
      // one thing that reads as a drop the moment you see it.
      // Four marks down the face: the lit edge directly under the lip, the
      // stone falling away from it, the body, and the undercut at the bottom.
      // A joint every four units gives the bank blocks; without them the face
      // is a grey ribbon and the whole thing reads as a wire fence.
      const joint = x % 4 === 0;
      for (let k = 1; k <= 4; k++) {
        const n = hash2(x >> 2, k, 43);
        P(x, lip + k, joint && k > 1 ? PAL.stoneDark
          : k === 1 ? PAL.stonePale
            : k === 2 ? (n > 0.5 ? PAL.stoneLight : PAL.stoneMid)
              : k === 3 ? (n > 0.5 ? PAL.stoneMid : PAL.stoneDark)
                : PAL.stoneDeep);
      }
      P(x, lip + 5, PAL.outline);
      // Blades and roots spilling over the edge, so the lip is not a ruled line.
      if (hash2(x, 5, 11) > 0.55) { P(x, lip + 1, PAL.grassDeep); P(x, lip + 2, PAL.grassDark); }
      // The shadow the bank throws on whatever is below it.
      P(x, lip + 6, 'rgba(26,42,22,0.42)');
      if ((x * 3) % 4 !== 0) P(x, lip + 7, 'rgba(26,42,22,0.20)');
    }
    // Weeds rooted in the face. Brown flecks were tried here and read as dirt
    // on the screen; something growing out of the rock reads as rock.
    for (let i = 0; i < 3; i++) {
      const sx = rng.below(S);
      const sy = 7 + rng.below(3);
      P(sx, sy, PAL.leafMid);
      P(sx, sy + 1, PAL.leafDeep);
      P(sx + 1, sy, PAL.leafDark);
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

    // One rail, seen side on: lit head, body, shadowed underside. The grain
    // runs along the rail and the odd unit drops a step, which is what keeps
    // fifteen tiles of fence from reading as three ruled lines of paint.
    const railRow = (y: number, x0: number, x1: number) => {
      for (let x = x0; x <= x1; x++) {
        const knot = hash2(x, y, 1031) > 0.8;
        P(x, y, knot ? PAL.woodLight : PAL.woodPale);
        P(x, y + 1, knot ? PAL.woodDark : PAL.woodMid);
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

    // Posts, three units to each so the timber is round rather than flat: a
    // lit face, the body, and the side turned away from the light.
    for (const lx of [5, 9]) {
      for (let y = 7; y <= 14; y++) {
        const knot = hash2(lx, y, 1013) > 0.82;
        P(lx, y, knot ? PAL.woodMid : PAL.woodLight);
        P(lx + 1, y, knot ? PAL.woodDeep : PAL.woodDark);
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
    // Grain along the planks, and the seams between them picked out one step
    // each way, so the face is three boards and not a flat panel.
    for (let y = 2; y <= 8; y++) {
      for (let x = 2; x <= 13; x++) {
        if (y % 3 === 0) continue;
        if (hash2(x, y, 1019) > 0.84) P(x, y, PAL.woodPale);
      }
    }
    for (let x = 2; x <= 13; x++) { P(x, 2, PAL.woodPale); P(x, 5, PAL.woodDark); }
    for (let y = 2; y <= 8; y++) P(2, y, PAL.woodPale);
    for (let x = 2; x <= 13; x++) P(x, 8, PAL.woodDark);
    for (let y = 2; y <= 8; y++) P(13, y, PAL.woodDark);
    // Two lines of writing, which is all that is legible at this size. The
    // second is broken into words: one unbroken bar reads as a slot cut in the
    // board, two bars with a gap between them read as a line of text.
    for (let x = 4; x <= 12; x++) P(x, 3, PAL.woodDeep);
    for (let x = 4; x <= 12; x++) P(x, 4, '#7a5a34');
    for (let x = 4; x <= 7; x++) P(x, 6, PAL.woodDeep);
    for (let x = 9; x <= 11; x++) P(x, 6, PAL.woodDeep);
    // Nails at the corners, so the board reads as fixed to the posts.
    for (const [nx, ny] of [[3, 2], [12, 2], [3, 8], [12, 8]] as [number, number][]) {
      P(nx, ny, PAL.stoneLight);
      P(nx, ny + 1, PAL.woodDeep);
    }
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
    // A plinth of coursed stone rather than one light row over one dark one:
    // a capping that catches the light, the stones under it with their own
    // joints, and a hard line where the building meets the ground.
    for (let x = 0; x < TILE_SIZE; x++) {
      const joint = (x + 1) % 5 === 0;
      P(x, 12, PAL.stoneDark);
      P(x, 13, joint ? PAL.stoneMid : PAL.stoneLight);
      P(x, 14, joint ? PAL.stoneDeep : PAL.stoneDark);
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

    // Roughcast render: a mottle under the scoring, so the wall is a surface
    // that was floated on by hand rather than a rectangle of one cream.
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 811) * 0.6
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 821) * 0.4;
        let c: string = n > 0.64 ? PAL.plasterLight : n < 0.36 ? PAL.plasterDark : PAL.plasterMid;
        // Scored into courses. One shadow line per course and nothing bright
        // beside it: a dark row with a pale row against it is a venetian blind.
        if (y % 4 === 3) c = PAL.plasterDark;
        else if ((x * 7 + y * 3) % 16 === 5) c = PAL.plasterPale;
        P(x, y, c);
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
    // Pushed well up in chroma along with everything else outdoors: at the old
    // saturation the verdigris was a grey with a rumour of green in it, which
    // beside the new turf read as more slate rather than as the third material
    // it is there to be.
    if (hue === 'moss') return ['#1c4740', '#2b6a5d', '#3d8f7d', '#59b39c', '#87d6bd'];
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

    /**
     * The pantile, built as a level on a ramp rather than as a table of tones.
     *
     * A rib runs down the slope and a lap runs across it, and the two have to
     * be added together, not chosen between: naming a colour per (rib, row)
     * pair is what produced a roof of flat vertical planks with an occasional
     * dark line ruled over them. Adding a rib profile to a course profile puts
     * the crown of every tile at the head of its course, where the light
     * actually lands, and takes the channel down four steps whatever row it is
     * in -- which is what makes the surface read as rolls of clay.
     */
    const ramp = [deep, dark, mid, light, pale];
    const ribLevel = [0, 3, 2, 1];     // channel, crown, crown falling, shade
    // The course, top to bottom: the shadow the tile above throws over the
    // head of this one, the lit head itself, the body, then the fall towards
    // the lap. Without that first row every rib runs unbroken from ridge to
    // eave and the roof reads as corrugated sheet.
    const rowLevel = [-2, 1, 0, -1];
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        let k = ribLevel[x % 4]! + rowLevel[y % 4]!;
        // The slope falls away from the ridge, so the bottom of every tile is
        // a step down from the top of it.
        if (y >= 12) k -= 1;
        // Weathering, one clay tile in five taken a step down. Clay is fired in
        // batches and laid by hand; a roof with no variation in it at all is a
        // sheet of plastic.
        if (hash2(x >> 2, y >> 2, 353) > 0.8) k -= 1;
        P(x, y, ramp[Math.max(0, Math.min(4, k))]!);
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
        const col = (x + shift) % 4;
        const n = hash2(Math.floor((x + shift) / 4), course, 131);
        let c: string = n > 0.7 ? light : n < 0.3 ? dark : mid;
        if (inCourse === 0) c = n > 0.5 ? pale : light;     // lit head of the slate
        else if (inCourse === 2) c = n > 0.5 ? mid : dark;  // the slate falling away
        else if (inCourse === 3) c = deep;                  // shadow under the lip
        if (col === 0) c = deep;                            // joint between slates
        else if (col === 1 && inCourse < 2) c = n > 0.5 ? pale : light;
        // The butt of the slate is *scalloped*: the middle two units of each
        // one hang a step lighter than the joints either side, so a course
        // reads as a row of tile ends rather than as a stripe ruled across the
        // roof -- which is what made this read as brickwork.
        if (inCourse === 3 && (col === 1 || col === 2)) c = dark;
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
      const board = Math.floor(y / 4);
      // Each board is a different piece of timber, so a wall is not one plank
      // repeated four times up its own height.
      const tone = hash2(board, 0, 907);
      for (let x = 0; x < TILE_SIZE; x++) {
        let c: string = b === 0 ? PAL.woodLight : b === 3 ? PAL.woodDark : PAL.woodMid;
        if (b === 1 && tone > 0.6) c = PAL.woodLight;
        else if (b === 2 && tone < 0.4) c = PAL.woodDark;
        // Grain, always along the board and never across it.
        if ((x * 7 + y * 3) % 16 === 5) c = b === 3 ? PAL.woodMid : PAL.woodPale;
        else if (hash2(x, board, 911) > 0.88 && b !== 3) c = PAL.woodDark;
        P(x, y, c);
      }
      // Nails at the stud lines, which is what fixes boards to a house.
      if (b === 1) { P(2, y, PAL.woodDeep); P(11, y, PAL.woodDeep); }
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
        // The lit head of the brick, taken from the brick's own tone rather
        // than jumped straight to the palest step: a bright row on top of every
        // brick in the wall stops reading as light and starts reading as icing.
        if (y % 4 === 0) c = n > 0.6 ? PAL.brickPale : PAL.brickLight;
        else if (y % 4 === 2) c = mixDown(c);               // face falling away
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
        // A little unevenness in the coating. Flat is the right *character* for
        // this building, but a wall that is literally one value is a hole in
        // the picture where a surface should be.
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 1091);
        let c: string = n > 0.64 ? PAL.trimPale : n < 0.36 ? PAL.trimMid : PAL.trimLight;
        if ((x * 7 + y * 5) % 16 === 3) c = PAL.trimPale;
        if (x % 8 === 0) c = PAL.trimShade;
        else if (x % 8 === 1) c = PAL.trimPale;
        P(x, y, c);
      }
    }
    // A string course across the panel, and the rivets fixing each panel to the
    // frame behind it. Both are covered by a window or a sign where there is
    // one, so only a blank stretch of cladding carries them -- which is exactly
    // the stretch that had nothing on it at all.
    // The string course carries the same painted band as the parapet above, so
    // the whole frontage is tied together by one line of colour instead of
    // being an acre of near-white with rivets in it.
    for (let x = 0; x < TILE_SIZE; x++) { P(x, 6, PAL.labAccent); P(x, 7, PAL.labAccentDark); }
    for (let y = 3; y < 13; y += 3) {
      for (let x = 4; x < TILE_SIZE; x += 8) { P(x, y, PAL.steelMid); P(x, y + 1, PAL.trimShade); }
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
    fill(PAL.deckMid);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        P(x, y, (x * 3 + y * 7) % 16 === 5 ? PAL.deckLight : PAL.deckMid);
      }
    }
    // Deck joints, each with the light catching the sheet on its far side, so
    // the roof reads as laid panels rather than as one ruled grey field.
    for (let y = 4; y < 13; y += 4) {
      for (let x = 0; x < TILE_SIZE; x++) { P(x, y, PAL.deckDark); P(x, y + 1, PAL.deckLight); }
    }
    for (let x = 0; x < TILE_SIZE; x++) {
      P(x, 0, PAL.outline);
      P(x, 1, PAL.trimPale);       // white coping
      P(x, 2, PAL.labAccent);      // the painted band under it
      P(x, 3, PAL.deckDeep);       // shadow the parapet drops on the deck
      P(x, 13, PAL.labAccentDark);
      P(x, 14, PAL.deckDeep);
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
      for (let y = 6; y <= 12; y++) { P(12, y, PAL.deckDeep); P(13, y, PAL.deckDark); }
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
    // Honey oak rather than the blond it was. The old boards held their
    // lightness -- which the room needs -- by spending nothing on chroma, and
    // beside a wall that is itself a warm grey the floor came out as the same
    // colour as the wall with lines ruled on it. This holds the lightness and
    // takes the saturation instead, so a room has a floor in it.
    //
    // Four board tones, not two. Timber is sawn from different trees and a
    // floor is laid from whatever came off the pile; alternating exactly two
    // values every four rows is veneer, and reads as stripes at any size.
    const boards = ['#e8c795', '#dfb783', '#e4bf8d', '#d6ad77'];
    const seam = '#b98d5b';
    const grain = '#f2d6a8';

    const knotDark = '#9c7440';
    const knotRing = '#c9a166';

    fill(boards[0]!);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      const board = Math.floor(y / 4);
      const base = boards[Math.floor(hash2(board, 3, 991) * boards.length) % boards.length]!;
      for (let x = 0; x < TILE_SIZE; x++) {
        if (y % 4 === 3) { P(x, y, seam); continue; }
        // A little grain, always along the board rather than across it.
        P(x, y, (x * 5 + board * 7) % 11 === 0 ? grain : base);
      }
      // The butt joint where one plank ends and the next begins. Planks are
      // finite; a floor whose boards run unbroken from wall to wall is a
      // gymnasium, and the joints are what say "house".
      if (y % 4 !== 3) P(Math.floor(hash2(board, 0, 971) * TILE_SIZE), y, seam);
    }
    // Two knots, with the grain closing round them. Placed from the shared Rng
    // so the three cuts of the floor put them in different places and a room
    // is not one board tiled twelve times.
    for (let i = 0; i < 2; i++) {
      const kx = 2 + rng.below(TILE_SIZE - 4);
      const ky = 1 + rng.below(TILE_SIZE - 3);
      if (ky % 4 === 3) continue;
      P(kx, ky, knotDark);
      P(kx + 1, ky, knotRing);
      P(kx - 1, ky, knotRing);
    }
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
    // The paper keeps its lightness and its quiet, and spends what it has on
    // the stencil instead: the ground is still a warm neutral, but the figure
    // printed on it is a dusty rose rather than another value of the ground.
    // A period wallpaper is a coloured pattern on a neutral, and one flat tan
    // with a tan pattern on it is lining paper -- which is what every room in
    // the game was hung with while the world outside got this green.
    const base = '#c2b294';
    const stripe = '#d4c6ab';
    const stripeEdge = '#ada085';
    const motif = '#b09184';
    const motifLit = '#d8c0b2';

    fill(base);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        // The pinstripe is now two units -- a lit face with a shadow down one
        // side -- because a single flat column of one colour at this size is a
        // scratch on the paper, not a printed stripe.
        if (x % 8 === 0) { P(x, y, stripe); continue; }
        if (x % 8 === 1) { P(x, y, stripeEdge); continue; }
        // A four-unit stencil, centred between the stripes. Both repeats divide
        // sixteen, so the paper meets itself exactly at every seam. It carries
        // its own highlight now, so the figure reads as printed on the paper
        // rather than as a smudge one step off the ground colour.
        const d = Math.abs((x % 8) - 5) + Math.abs((y % 8) - 4);
        if (d === 2) P(x, y, motif);
        else if (d === 1) P(x, y, motifLit);
        else if (d === 0) P(x, y, motif);
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
    fill('#171216');

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
    //
    // The falloff is floored well short of black. Taken all the way down, the
    // top of the cell became a hole cut in the floorboards with a set of white
    // bars under it -- a television standing against the wall, not a stairway
    // -- because the darkest tread and the lightest were a full black and a
    // near white four pixels apart. There has to be enough light at the top
    // for a tread to still be *visible* as a tread; the dark only has to say
    // that there is more of this than fits in the tile.
    const lit = (y: number): number => {
      const t = Math.max(0, Math.min(1, (y - 2) / 10));
      return 0.30 + Math.pow(t, 1.15) * 0.70;
    };

    // Four treads, four units each: the riser in its own shadow, the nosing
    // catching the light off it, then the tread falling away behind it.
    //
    // Cut from the timber ramp rather than the stone one. Every flight in the
    // game is inside a house or a shop, standing on floorboards, and a stone
    // stair dropped into a room of oak reads as a service hatch.
    for (let y = 0; y < TILE_SIZE; y++) {
      const step = y % 4;
      const base = step === 0 ? PAL.woodDeep
        : step === 1 ? PAL.woodPale
          : step === 2 ? PAL.woodLight : PAL.woodMid;
      const k = lit(y);
      const tread = dim(base, k);
      for (let x = 1; x < TILE_SIZE - 1; x++) P(x, y, tread);
      // Jambs. The left one is turned into the light, the right one away from
      // it, so the shaft has a direction rather than two identical black lines.
      // Both keep a floor under the fade: a pair of faint walls running up into
      // the dark is what gives the darkness a shape, and without them the top
      // of the tile is an unreadable black square sitting on the floorboards.
      P(0, y, dim(PAL.woodDark, Math.max(k * 0.7, 0.30)));
      P(TILE_SIZE - 1, y, dim(PAL.woodDeep, Math.max(k * 0.5, 0.26)));
    }
  }

  /**
   * A puddle.
   *
   * Three rings, not one shape. Damp ground around the water, because a puddle
   * standing on dry dirt reads as spilt paint; the water itself, darker at the
   * far edge where it is deepest; and a pale lip along the near side where the
   * sky is caught in it. The lip is the mark that says "this is a surface" --
   * without it the whole thing is a blue hole in the road.
   */
  private puddle(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.path(px, fill, rng);
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x - 7.5) / 6.2, dy = (y - 8.5) / 3.8;
        // A wobbled radius. Water lying in a rut takes the shape of the rut;
        // a true ellipse reads as a painted lozenge dropped on the road.
        const ang = Math.atan2(dy, dx);
        const wob = 1 + Math.sin(ang * 3.1 + 0.7) * 0.16 + Math.sin(ang * 5.3) * 0.09;
        const d = (dx * dx + dy * dy) / (wob * wob);
        if (d > 1.5) continue;
        if (d > 1) { P(x, y, d > 1.2 ? PAL.dirtDark : PAL.dirtDeep); continue; }
        const n = hash2(x, y, 109);
        P(x, y, d > 0.78 && y > 9 ? PAL.waterPale
          : y <= 6 ? PAL.waterDark
          : n > 0.72 ? PAL.waterLight : n < 0.28 ? PAL.waterDark : PAL.waterMid);
      }
    }
    for (let i = 0; i < 3; i++) {
      const gx = 4 + rng.below(8), gy = 7 + rng.below(4);
      P(gx, gy, PAL.waterFoam);
      P(gx + 1, gy, PAL.waterPale);
    }
  }

  /**
   * A plank bridge.
   *
   * Boards laid across the span, each a different piece of timber, with a
   * handrail along the far side and a bearer along the near one. The rail is
   * what does the work: a deck alone is a strip of floorboards laid on water,
   * and it is the thing standing up off the deck that says "bridge".
   */
  private bridge(px: Px, fill: (c: string) => void, rng: Rng): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    fill(PAL.woodMid);

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const board = Math.floor(x / 4);
        const tone = hash2(board, 0, 1061);
        let c: string = tone > 0.66 ? PAL.woodLight : tone < 0.33 ? PAL.woodDark : PAL.woodMid;
        if (x % 4 === 0) c = PAL.woodDeep;          // the gap between boards
        else if (x % 4 === 1) c = PAL.woodPale;     // lit edge of the next one
        else if (hash2(x, y, 1063) > 0.88) c = PAL.woodDark;
        P(x, y, c);
      }
    }
    // Handrail along the far edge, bearer along the near one.
    for (let x = 0; x < S; x++) {
      P(x, 0, PAL.outline);
      P(x, 1, PAL.woodPale);
      P(x, 2, PAL.woodMid);
      P(x, 3, PAL.woodDeep);                        // its shadow on the deck
      P(x, 13, PAL.woodDark);
      P(x, 14, PAL.woodDeep);
      P(x, 15, PAL.outline);
    }
    // Nails, one pair per board, where the deck crosses the bearers.
    for (let x = 2; x < S; x += 4) {
      P(x, 5, PAL.stoneLight); P(x, 6, PAL.woodDeep);
      P(x, 11, PAL.stoneLight); P(x, 12, PAL.woodDeep);
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
      // Turned-down sheet under the pillow, then the quilt. The quilt carries a
      // check on a four-unit repeat that divides the frame, so the pattern
      // carries across the join into the foot half and the two tiles read as
      // one bed rather than as two blue rectangles stacked.
      for (let y = 7; y < TILE_SIZE; y++) {
        for (let x = L + 1; x <= R - 1; x++) {
          P(x, y, y <= 8 ? PAL.trimLight
            : y % 4 === 0 || x % 4 === 0 ? '#5f7fb0'
              : (x + y) % 4 === 1 ? '#82a6d6' : '#7196c8');
        }
      }
      for (let x = L + 1; x <= R - 1; x++) P(x, 9, '#8fb0dc');
    } else {
      // Blanket, with a fold line and a lit top edge.
      for (let y = 0; y <= 12; y++) {
        for (let x = L + 1; x <= R - 1; x++) {
          P(x, y, y % 4 === 0 || x % 4 === 0 ? '#5f7fb0'
            : (x + y) % 4 === 1 ? '#82a6d6' : '#7196c8');
        }
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
    // Grain along the boards, sparse enough that it is texture and not a
    // pattern: at this size four flecks per board is the whole difference
    // between sawn timber and a sheet of laminate.
    for (let y = 4; y <= 8; y++) {
      for (let x = 3; x <= 12; x++) if (hash2(x, y, 1049) > 0.86) P(x, y, PAL.woodPale);
    }
    for (let x = 2; x <= 13; x++) P(x, 3, PAL.woodPale);     // lit front of the top
    for (let y = 3; y <= 9; y++) P(2, y, PAL.woodPale);      // and its lit left edge
    // A dish and a mug standing on it. A bare top is a bench; the moment
    // something is laid on a table the room reads as lived in. Both are kept
    // small and off the palest step -- at sixteen units a wide bright shape in
    // the middle of a dark-edged rectangle stops being crockery and starts
    // being a television screen.
    for (let x = 5; x <= 7; x++) { P(x, 5, '#e4dfd0'); P(x, 6, '#bdb7a6'); }
    P(5, 5, '#f2eee2');
    P(10, 5, '#cfd2da'); P(11, 5, '#a5a8b2');
    P(10, 6, '#b7bac4'); P(11, 6, '#8d909a');
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
    // Screen: a dark bezel round it so the glass is sunk into the casing, then
    // the picture, then the scan lines. A tube television with no lines on it
    // is a mirror, and a mirror in a room reads as another window.
    for (let y = 3; y <= 10; y++) for (let x = 3; x <= 11; x++) P(x, y, '#1c1c26');
    for (let y = 4; y <= 9; y++) {
      for (let x = 4; x <= 10; x++) {
        P(x, y, y % 2 === 0
          ? (x + y < 10 ? '#9fc8dc' : x + y < 14 ? '#6f9cba' : '#4f7695')
          : (x + y < 10 ? '#84b2c8' : x + y < 14 ? '#5c86a2' : '#3f6180'));
      }
    }
    P(4, 4, '#d8f0fa'); P(5, 4, '#b6dcec');   // the corner catching the room
    // Dials, and a lit standby lamp.
    P(12, 5, '#c8c8d4'); P(12, 6, '#83838f');
    P(12, 8, '#c8c8d4'); P(12, 9, '#83838f');
    P(12, 10, '#ff7a6a');
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
    // A note and two magnets on the door, and the vent grille at the foot.
    // Every white box in a kitchen looks the same; what people stick on theirs
    // is the only thing that says whose kitchen it is.
    for (let y = 8; y <= 10; y++) for (let x = 4; x <= 7; x++) P(x, y, '#f4ecc8');
    for (let x = 4; x <= 7; x++) P(x, 8, '#fffae0');
    for (let x = 5; x <= 7; x++) { P(x, 9, '#b9b2a0'); }
    P(4, 3, '#e35a4a'); P(6, 3, '#4f8fd8');
    for (let x = 3; x <= 12; x++) P(x, 13, x % 2 === 0 ? '#8f96a4' : '#b6bcc8');
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
    // Water standing in the basin, with the drain at the bottom of it and a
    // highlight where the light off the window lands. An empty steel box is a
    // tray; the moment there is water in it, it is a sink.
    for (let y = 5; y <= 7; y++) {
      for (let x = 5; x <= 10; x++) P(x, y, y === 5 ? '#8fc8dc' : '#6fa8c4');
    }
    P(7, 6, '#4f7e98'); P(8, 6, '#4f7e98');
    P(5, 5, '#d8f0fa');
    // Tap and a mixer lever.
    P(7, 1, '#c8ced8'); P(8, 1, '#aab3bf'); P(8, 2, '#c8ced8'); P(8, 3, '#8b95a2');
    P(6, 2, '#c8ced8'); P(9, 2, '#8b95a2');
    // A cloth folded over the edge of the worktop.
    for (let x = 11; x <= 13; x++) { P(x, 3, '#d8e0e6'); P(x, 4, '#aeb8c2'); }
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
    // Four rings, each a dark plate with a lit rim on the side facing the
    // light. A flat black square is a hole in the hob; the rim is what makes
    // it a burner sitting in one.
    for (const [cx, cy] of [[5, 3], [10, 3], [5, 6], [10, 6]] as [number, number][]) {
      P(cx, cy, '#8b8b98'); P(cx + 1, cy, '#2c2c36');
      P(cx, cy + 1, '#2c2c36'); P(cx + 1, cy + 1, '#1a1a22');
    }
    // Control knobs along the front of the hob, and the oven door under it
    // with its handle and a lit window.
    for (const kx of [4, 7, 10, 13]) { P(kx, 9, '#c8ced8'); P(kx, 10, '#6b6b78'); }
    for (let x = 4; x <= 11; x++) P(x, 11, '#8f96a4');
    for (let x = 5; x <= 10; x++) { P(x, 12, '#e8a842'); P(x, 13, '#a8703a'); }
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
    // One cool family, not a cream tile beside a blue one: the old pair mixed
    // plaster with a blue-white and the floor came out looking stained.
    //
    // The floor stays light -- that is the whole point of it, and it is how a
    // player knows at a glance which kind of room they walked into -- but it no
    // longer stays *colourless*. A near-white tile with a near-white figure on
    // it was the flattest surface in the game, and it covers more of a
    // Waystation than anything else in the room. The chroma all goes into the
    // inlay below; the field only warms enough to stop reading as paper.
    const tileA = '#f0f5f6';
    const tileB = '#e4ecee';
    const grout = '#c3ced2';

    fill(tileA);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const half = (x < 8) === (y < 8);
        P(x, y, half ? tileA : tileB);
      }
    }
    // An inlaid lozenge at the middle of each slab.
    //
    // Two other things were tried here. A diagonal sheen ruled right across the
    // cell put a continuous white line over the whole room -- at map size that
    // is not polish, it is a scratch -- and a short glint stopping inside the
    // slab read as the same slash mark stamped on every tile in the building.
    // Public floors in the reference art are *patterned*, and a small figure
    // that belongs to its slab is detail the eye can rest on rather than
    // texture it has to look past.
    for (const [gx, gy] of [[0, 0], [8, 0], [0, 8], [8, 8]] as [number, number][]) {
      for (let y = -2; y <= 2; y++) {
        for (let x = -2; x <= 2; x++) {
          const d = Math.abs(x) + Math.abs(y);
          if (d > 2) continue;
          // A sea-green inlay rather than another value of the tile. Four small
          // figures of one real colour is the whole difference between a laid
          // floor and a sheet of paper, and because they are small and cool
          // they take nothing away from a character standing on them.
          P(gx + 4 + x, gy + 4 + y, d === 2 ? '#8fbfc4' : d === 1 ? '#b6d8da' : '#dcf0f0');
        }
      }
    }
    // Grout, and a highlight along the top of each tile.
    for (let i = 0; i < TILE_SIZE; i++) {
      P(i, 0, grout);
      P(0, i, grout);
      P(i, 8, grout);
      P(8, i, grout);
      P(i, 1, '#fdffff');
      P(i, 9, '#fdffff');
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
    // Two cushions, buttoned: the pair of dark seams down them is what makes
    // upholstery read as upholstery rather than as a padded panel.
    for (let x = 3; x <= 12; x++) P(x, 1, PAL.outline);
    for (let y = 2; y <= 7; y++) for (let x = 3; x <= 12; x++) P(x, y, mid);
    for (let x = 3; x <= 12; x++) P(x, 2, light);
    for (let y = 2; y <= 7; y++) P(8, y, deep);
    for (const bx of [5, 11]) { P(bx, 4, pale); P(bx, 5, deep); }
    for (let x = 3; x <= 12; x++) if (x !== 8) P(x, 7, deep);

    // Arms: two lumps standing proud at the sides, a full tone lighter, with a
    // roll along the top of each.
    for (let x = 1; x <= 2; x++) P(x, 3, PAL.outline);
    for (let x = 13; x <= 14; x++) P(x, 3, PAL.outline);
    for (let y = 4; y <= 14; y++) { P(0, y, PAL.outline); P(15, y, PAL.outline); }
    for (let y = 4; y <= 12; y++) {
      P(1, y, pale); P(2, y, light);
      P(13, y, mid); P(14, y, deep);
    }
    P(1, 4, '#b4dcd6'); P(2, 4, pale);
    P(13, 4, light); P(14, 4, mid);

    // Seat, lower and lighter, under a hard shadow from the back. Piping along
    // the front edge, which is the mark that gives the cushion its thickness.
    for (let x = 3; x <= 12; x++) P(x, 8, deep);
    for (let y = 9; y <= 12; y++) for (let x = 3; x <= 12; x++) P(x, y, light);
    for (let x = 3; x <= 12; x++) P(x, 9, pale);
    for (let y = 9; y <= 12; y++) P(8, y, mid);
    for (let x = 3; x <= 12; x++) P(x, 12, pale);

    for (let x = 1; x <= 14; x++) { P(x, 13, deep); P(x, 14, PAL.outline); }
    // Feet, so the frame is standing on something.
    for (const fx of [2, 13]) { P(fx, 14, '#1b3536'); P(fx, 15, PAL.outline); }
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
      for (let y = cy - 2; y <= cy + 2; y++) {
        for (let x = cx - 2; x <= cx + 2; x++) {
          const r = Math.abs(x - cx) + Math.abs(y - cy);
          if (r > 3) continue;
          P(x, y, y >= cy + 1 ? PAL.leafDeep : r <= 1 ? PAL.leafMid : PAL.leafDark);
        }
      }
      // The lit side of the foliage, then three blooms on the crown of it with
      // a shaded one underneath. One bloom to a clump left the bed reading as
      // leaves with a dot on top; three is what makes it a plant in flower.
      P(cx - 1, cy - 1, PAL.leafLight);
      P(cx, cy - 2, bloom);
      P(cx - 1, cy, bloom);
      P(cx + 1, cy - 1, bloom);
      P(cx, cy - 1, '#fff4d2');
      P(cx + 1, cy + 1, mixDown(bloom));
      P(cx - 2, cy + 1, PAL.leafDeep);
    };
    // Two blooms to a bed, and a different pair per alternate. More than two
    // colours in one trough is a seed catalogue; the same two in every trough
    // in the world is a council planting scheme. Three pairs, picked by world
    // position, is a street where somebody chose what to put outside.
    const beds = [
      ['#f2545f', '#ffd23c'],     // scarlet and gold
      ['#a86ce8', '#f7f0d8'],     // violet and white
      ['#ff6fa8', '#61b6f0'],     // pink and cornflower
    ];
    const bed = beds[variantSeed % beds.length]!;
    for (let i = 0; i < 2; i++) {
      clump(3 + i * 8, 5, bed[0]!);
      clump(7 + i * 8, 10, bed[1]!);
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

    // The light the lantern throws on the air around it, laid down first so
    // everything solid is drawn over it. Translucent, because the lamp stands
    // on turf, path and paving alike and a halo in one flat colour would stamp
    // a square of that colour onto all three.
    for (let y = 0; y <= 10; y++) {
      for (let x = 1; x <= 14; x++) {
        const d = Math.abs(x - 7.5) + Math.abs(y - 4.5);
        if (d > 8.5) continue;
        P(x, y, d > 6 ? 'rgba(255,214,120,0.10)' : 'rgba(255,214,120,0.22)');
      }
    }

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

    // Column: fluted, with a swelling at the base.
    for (let y = 8; y <= 12; y++) { P(7, y, PAL.stoneLight); P(8, y, PAL.stoneDeep); }
    for (let y = 8; y <= 12; y++) { P(6, y, PAL.outline); P(9, y, PAL.outline); }
    for (const fy of [9, 11]) { P(7, fy, PAL.stonePale); P(8, fy, PAL.stoneDark); }
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
