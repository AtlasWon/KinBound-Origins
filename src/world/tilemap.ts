/**
 * Tile map.
 *
 * Compiles an ASCII-authored map into render layers and a collision grid, then
 * draws it in two passes: ground before actors, overlays after, so a character
 * can stand behind a tree canopy or under a roof overhang.
 *
 * Only the tiles inside the camera rectangle are drawn, so map size costs
 * nothing at render time.
 */

import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { T, TILE_PX, TILE_SIZE, Tileset } from '../gfx/tileset.js';
import { donatesFloor, terrainFor, unknownChars, type TerrainDef } from './terrain.js';
import type {
  CollisionCode, Direction, MapNpc, MapObject, MapWarp, WeatherId,
} from '../data/schema.js';

/** The on-disk, human-authored form of a map. */
export interface AsciiMapFile {
  id: string;
  name: string;
  displayName?: string;
  music?: string;
  battleBackdrop?: string;
  indoor?: boolean;
  dark?: boolean;
  weather?: WeatherId;
  /** One string per row; all rows must be the same length. */
  rows: string[];
  warps?: MapWarp[];
  npcs?: MapNpc[];
  objects?: MapObject[];
  /** Per-tile overrides, e.g. making one wall tile interactable. */
  regionPos?: { x: number; y: number };
  connections?: { dir: Direction; map: string; offset: number }[];
  encounterTable?: string;
  /** Stones here can be pushed without the Shoulder art (gym puzzles). */
  freePush?: boolean;
  /** Shallow water here is crossable without the Wade art (gym puzzles). */
  freeWade?: boolean;
  /**
   * How thickly this map is fogged, 0 to 1. Absent or zero is a clear map.
   *
   * A number rather than a flag because the wetlands and the town built in the
   * middle of them need very different amounts of it: out on the route the fog
   * is the mechanic and closes to a few tiles, while in Mirehaven it is
   * atmosphere and must never stop a person finding the clinic. See
   * src/gfx/fog.ts for what the number actually does.
   */
  fog?: number;
  /**
   * How heavily it snows on this map, 0 to 1. Absent or zero is a clear map.
   *
   * A number rather than a flag for the reason `fog` is one, and then for a
   * second reason of its own: this is only the map's BASE weight. The squall
   * on top of it is worked out per frame from the player's own position and
   * the clock, so weather here is something the road passes through rather
   * than a property of a tile -- see src/gfx/snowfall.ts, which is where the
   * difference between this and the wetlands' fog is argued out.
   */
  snow?: number;
}

/**
 * How deep a character wades in tall grass, as a row inside the tile, in
 * authoring units. Everything from here down is drawn in front of them.
 *
 * Eight of sixteen. A sprite is 24 units tall with its feet on the foot of the
 * tile, so a cut here hides the bottom eight of them: both legs and a little of
 * the hips, leaving head, shoulders, chest and arms above the blades. That is
 * the era's silhouette, and it is a third of the body rather than half.
 *
 * It used to be six, which was right for the tile it was tuned against -- a
 * continuous field, solid to the top of the cell, where the only question was
 * taste. The tile is now a discrete clump with bare turf at its shoulders, and
 * that changes what the number is for. Two things now pin it from both sides.
 * Too shallow and the band repainted in front reaches up into the clump's crown
 * where the blades are single pixels with air between them -- a chest hidden
 * behind that is still a visible chest, and the character is a head floating on
 * a tuft. Too deep and the band is nothing but the clump's dark understory, a
 * flat mass with no tips in it, and the character reads as standing behind a
 * low hedge rather than in the grass. Eight is the last row that still catches
 * the tops of the short front blades while covering every pixel of leg.
 */
const GRASS_BLADE_TOP = 8;

/**
 * How far apart stacked copies of that band sit when it is lifted to a
 * character's waist.
 *
 * The band is eight units tall, so any step below eight leaves no seam; six
 * keeps the count down while staying clear, and matters because the top edge of
 * a band is the ragged one -- a copy that peeked out above the copy over it
 * would print a line of tips through the middle of the mass.
 */
const GRASS_STACK_STEP = 6;

/**
 * Ground tiles a character wades *through* rather than walks on.
 *
 * The two passes below repaint the lower half of one of these cells in front
 * of whoever is standing in it, which is what puts a player waist-deep in a
 * patch instead of on top of it. That used to be a comparison against one tile
 * id in four places, which quietly made the effect a property of that tile
 * rather than of the *idea* -- so the wetlands' reed beds, which are that
 * region's tall grass in every other respect, had the player standing on top
 * of the canes.
 *
 * Anything added here must be drawn to the same rule as the grass clump: the
 * plant has to be standing by GRASS_BLADE_TOP, or the band repainted in front
 * of a character has holes in it exactly where their legs are.
 */
const WADE_THROUGH = new Set<number>([T.TALL_GRASS, T.REEDS]);

export class TileMap {
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
  readonly width: number;
  readonly height: number;
  readonly indoor: boolean;
  readonly dark: boolean;
  readonly music: string;
  readonly battleBackdrop: string;
  readonly weather?: WeatherId;
  readonly encounterTable?: string;
  readonly freePush: boolean;
  readonly freeWade: boolean;
  readonly fog: number;
  readonly snow: number;

  readonly ground: Uint16Array;
  readonly over: Uint16Array;
  readonly collision: Uint8Array;
  readonly terrain: TerrainDef[];

  readonly warps: MapWarp[];
  readonly npcs: MapNpc[];
  readonly objects: MapObject[];
  readonly connections: { dir: Direction; map: string; offset: number }[];

  constructor(file: AsciiMapFile) {
    const bad = unknownChars(file.rows);
    if (bad.length) {
      console.warn(`map ${file.id}: unknown terrain characters ${JSON.stringify(bad)}`);
    }

    this.id = file.id;
    this.name = file.name;
    this.displayName = file.displayName;
    this.height = file.rows.length;
    this.width = this.height > 0 ? Math.max(...file.rows.map((r) => r.length)) : 0;
    this.indoor = file.indoor ?? false;
    this.dark = file.dark ?? false;
    this.music = file.music ?? 'town';
    this.battleBackdrop = file.battleBackdrop ?? 'grass';
    this.weather = file.weather;
    this.encounterTable = file.encounterTable;
    this.freePush = file.freePush ?? false;
    this.freeWade = file.freeWade ?? false;
    this.fog = file.fog ?? 0;
    this.snow = file.snow ?? 0;

    const n = this.width * this.height;
    this.ground = new Uint16Array(n);
    this.over = new Uint16Array(n);
    this.collision = new Uint8Array(n);
    this.terrain = new Array(n);

    const floorless: number[] = [];
    for (let y = 0; y < this.height; y++) {
      const row = file.rows[y] ?? '';
      for (let x = 0; x < this.width; x++) {
        const ch = row[x] ?? ' ';
        const t = terrainFor(ch);
        const i = y * this.width + x;
        this.ground[i] = t.ground ?? T.EMPTY;
        this.over[i] = t.over ?? 0;
        this.collision[i] = t.collision;
        this.terrain[i] = t;
        if (t.ground === undefined) floorless.push(i);
      }
    }

    this.autoGreatTree();
    this.inheritGround(floorless);
    this.autoPathEdges();

    this.warps = file.warps ?? [];
    this.npcs = file.npcs ?? [];
    this.objects = file.objects ?? [];
    this.connections = file.connections ?? [];
  }

  /**
   * Give every floorless cell the floor of the room it is standing in.
   *
   * Furniture is an overlay drawn with a transparent background, so something
   * has to be underneath it. Naming that something in the terrain table is what
   * caused the bug this pass exists to fix: one entry, one floor, and the same
   * chair then sits in a square of house floorboards in the middle of the
   * laboratory's pale tile.
   *
   * So the floor is taken from the neighbourhood instead -- the commonest floor
   * among the walkable cells around it. A chair on boards gets boards; the same
   * chair in the lab gets lab tile; nothing about either map has to say so.
   *
   * Resolved in passes rather than in one sweep, because furniture stands next
   * to furniture constantly: a counter in the middle of a run has no floor
   * anywhere near it until the ends of the run have found theirs.
   */
  private inheritGround(floorless: number[]): void {
    if (!floorless.length) return;

    // 0 = ordinary cell, 1 = still waiting, 2 = has borrowed a floor. The third
    // state is the one that matters: a chair that has just been given boards
    // must be able to pass them to the chair beside it, and its own terrain
    // still reads as solid furniture, so a walkability test alone would refuse.
    const state = new Uint8Array(this.ground.length);
    for (const i of floorless) state[i] = 1;

    let open = floorless;
    let reach = 1;
    while (open.length) {
      const waiting: number[] = [];
      const settled: number[] = [];
      const floors: number[] = [];
      // Every vote is counted before any of them is applied, so the result does
      // not depend on the order the cells happen to sit in the array.
      for (const i of open) {
        const g = this.floorVote(i, reach, state);
        if (g) { settled.push(i); floors.push(g); } else waiting.push(i);
      }
      for (let k = 0; k < settled.length; k++) {
        const i = settled[k]!;
        this.ground[i] = floors[k]!;
        state[i] = 2;
      }
      // Nothing found anywhere this pass: widen the search rather than give up,
      // and cap it so a room with no floor at all cannot spin here.
      if (!settled.length && ++reach > 4) break;
      open = waiting;
    }

    for (const i of open) this.ground[i] = this.indoor ? T.FLOOR_WOOD : T.GRASS;
  }

  /**
   * The commonest floor within `reach` steps of one index, or 0 if there is
   * none yet.
   *
   * Steps, not a square: the neighbourhood is everything within `reach` moves
   * of the cell, so at reach 1 only the four tiles the object actually touches
   * get a say. Counting the diagonals with them is what put a sofa standing on
   * the corner of a rug onto the tiling around it instead -- five cells of
   * floor at arm's length outvoting the two squares of rug under it.
   *
   * Ties break on the lowest tile id, so a map always compiles to the same
   * picture -- screenshots and player memory both depend on that.
   */
  private floorVote(i: number, reach: number, state: Uint8Array): number {
    const x0 = i % this.width;
    const y0 = (i - x0) / this.width;
    const tally = new Map<number, number>();
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > reach) continue;
        const x = x0 + dx, y = y0 + dy;
        if (!this.inBounds(x, y)) continue;
        const j = this.index(x, y);
        if (state[j] === 1) continue;
        if (state[j] !== 2 && !donatesFloor(this.terrain[j]!)) continue;
        const g = this.ground[j]!;
        if (g === T.EMPTY) continue;
        tally.set(g, (tally.get(g) ?? 0) + 1);
      }
    }
    let best = 0;
    let bestVotes = 0;
    for (const [g, votes] of tally) {
      if (votes > bestVotes || (votes === bestVotes && g < best)) { best = g; bestVotes = votes; }
    }
    return best;
  }

  /**
   * Give the great tree its edges.
   *
   * The crown is authored as a solid block of one character, because a
   * thirteen-by-five outline drawn from nineteen different characters is a
   * shape nobody can edit: nudge one row and every corner has to be retyped by
   * hand. So the map says *where the crown is* and this works out what each
   * cell has to be -- a nine-slice for the crown, left/middle/right for the
   * trunk and the roots, and the three bole cells where the trunk comes up
   * through the underside.
   *
   * Every cell is read before any is written, or a cell rewritten to an edge
   * would stop counting as part of the crown for the cell beside it.
   */
  private autoGreatTree(): void {
    const isLeaf: boolean[] = [];
    const isTrunk: boolean[] = [];
    const isRoot: boolean[] = [];
    let any = false;
    for (let i = 0; i < this.over.length; i++) {
      isLeaf[i] = this.over[i] === T.GREAT_LEAF_C;
      isTrunk[i] = this.over[i] === T.GREAT_TRUNK_C;
      isRoot[i] = this.over[i] === T.GREAT_ROOT_C;
      if (isLeaf[i] || isTrunk[i] || isRoot[i]) any = true;
    }
    if (!any) return;

    const at = (set: boolean[], x: number, y: number): boolean =>
      this.inBounds(x, y) && set[this.index(x, y)] === true;

    const LEAF = [
      [T.GREAT_LEAF_NW, T.GREAT_LEAF_N, T.GREAT_LEAF_NE],
      [T.GREAT_LEAF_W, T.GREAT_LEAF_C, T.GREAT_LEAF_E],
      [T.GREAT_LEAF_SW, T.GREAT_LEAF_S, T.GREAT_LEAF_SE],
    ];
    const BOLE = [T.GREAT_BOLE_L, T.GREAT_BOLE_C, T.GREAT_BOLE_R];
    const TRUNK = [T.GREAT_TRUNK_L, T.GREAT_TRUNK_C, T.GREAT_TRUNK_R];
    const ROOT = [T.GREAT_ROOT_L, T.GREAT_ROOT_C, T.GREAT_ROOT_R];
    /** 0 for the left column of a run, 1 for the middle, 2 for the right. */
    const span = (set: boolean[], x: number, y: number): number =>
      (at(set, x - 1, y) ? 1 : 0) + (at(set, x + 1, y) ? 1 : 0) === 2 ? 1
        : at(set, x - 1, y) ? 2 : 0;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = this.index(x, y);
        if (isLeaf[i]) {
          // The three cells the trunk pushes up through are drawn as bole
          // rather than as plain underside; nothing in the map file says so.
          if (at(isTrunk, x, y + 1)) { this.over[i] = BOLE[span(isTrunk, x, y + 1)]!; continue; }
          const col = at(isLeaf, x - 1, y) ? (at(isLeaf, x + 1, y) ? 1 : 2) : 0;
          const row = at(isLeaf, x, y - 1) ? (at(isLeaf, x, y + 1) ? 1 : 2) : 0;
          this.over[i] = LEAF[row]![col]!;
        } else if (isTrunk[i]) {
          this.over[i] = TRUNK[span(isTrunk, x, y)]!;
        } else if (isRoot[i]) {
          this.over[i] = ROOT[span(isRoot, x, y)]!;
        }
      }
    }
  }

  /**
   * Soften every place a path meets grass.
   *
   * The reference tilesets never butt two materials together with a straight
   * cut; there is always a dithered lip on the path side. Doing it here rather
   * than in the map files means an author draws a road with one character and
   * still gets the edges -- and it cannot be forgotten, which is exactly what
   * happened everywhere the edge tiles existed but were never placed.
   */
  private autoPathEdges(): void {
    const grassy = (i: number): boolean => {
      const g = this.ground[i];
      return g === T.GRASS || g === T.GRASS_TUFT || g === T.GRASS_FLOWERS || g === T.TALL_GRASS;
    };
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = this.index(x, y);
        if (this.ground[i] !== T.PATH) continue;
        if (y > 0 && grassy(this.index(x, y - 1))) this.ground[i] = T.PATH_EDGE_N;
        else if (y < this.height - 1 && grassy(this.index(x, y + 1))) this.ground[i] = T.PATH_EDGE_S;
      }
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }

  collisionAt(x: number, y: number): CollisionCode {
    if (!this.inBounds(x, y)) return 1;
    return this.collision[this.index(x, y)] as CollisionCode;
  }

  terrainAt(x: number, y: number): TerrainDef {
    if (!this.inBounds(x, y)) return terrainFor(' ');
    return this.terrain[this.index(x, y)]!;
  }

  warpAt(x: number, y: number): MapWarp | undefined {
    return this.warps.find((w) => w.x === x && w.y === y);
  }

  objectAt(x: number, y: number): MapObject | undefined {
    return this.objects.find((o) => o.x === x && o.y === y);
  }

  /** Pixel size of the whole map. */
  get pixelWidth(): number { return this.width * TILE_SIZE; }
  get pixelHeight(): number { return this.height * TILE_SIZE; }

  /* ------------------------------------------------------------ drawing */

  private drawLayer(r: Renderer, tiles: Uint16Array, tileset: Tileset): void {
    const rows = this.visibleRows(r);
    for (let ty = rows.first; ty <= rows.last; ty++) this.drawRow(r, tiles, tileset, ty);
  }

  private drawRow(r: Renderer, tiles: Uint16Array, tileset: Tileset, ty: number): void {
    const t0x = Math.max(0, Math.floor(r.camX / TILE_SIZE));
    const t1x = Math.min(this.width - 1, Math.floor((r.camX + SCREEN_W) / TILE_SIZE));
    for (let tx = t0x; tx <= t1x; tx++) {
      const id = tiles[this.index(tx, ty)]!;
      if (id === 0) continue;
      const s = tileset.srcFor(id, tx, ty);
      r.bctx.drawImage(
        tileset.canvas, s.x, s.y, TILE_PX, TILE_PX,
        tx * TILE_PX - r.camPX, ty * TILE_PX - r.camPY,
        TILE_PX, TILE_PX,
      );
    }
  }

  /** Rows of the map currently on screen. */
  visibleRows(r: Renderer): { first: number; last: number } {
    return {
      first: Math.max(0, Math.floor(r.camY / TILE_SIZE)),
      last: Math.min(this.height - 1, Math.floor((r.camY + SCREEN_H) / TILE_SIZE)),
    };
  }

  /** Base terrain, drawn under everything. */
  renderGround(r: Renderer, tileset: Tileset): void {
    this.drawLayer(r, this.ground, tileset);
  }

  /**
   * The blades of one row of tall grass, painted a second time so they land in
   * front of whoever is standing in them.
   *
   * Tall grass is a ground tile, so the first pass has already drawn it under
   * the actors. This pass repaints the lower part of the very same tile at the
   * very same place, which is what makes it safe: the pixels are identical to
   * the ones already there, so the tile cannot end up looking different from
   * its neighbours. The only thing that changes is what is *behind* them -- a
   * character whose sprite reaches down into this row is now cut off by the
   * grass instead of standing on top of the patch.
   *
   * Handed out a row at a time so the caller can drop it into the actor sort:
   * the grass on your own row is in front of you, the row above is behind you.
   * Anything cheaper -- one pass over the whole layer -- and the patch two rows
   * up starts swallowing your head.
   */
  renderGrassFrontRow(r: Renderer, tileset: Tileset, ty: number): void {
    const t0x = Math.max(0, Math.floor(r.camX / TILE_SIZE));
    const t1x = Math.min(this.width - 1, Math.floor((r.camX + SCREEN_W) / TILE_SIZE));
    const top = GRASS_BLADE_TOP * DETAIL;
    const h = TILE_PX - top;
    for (let tx = t0x; tx <= t1x; tx++) {
      const id = this.ground[this.index(tx, ty)]!;
      if (!WADE_THROUGH.has(id)) continue;
      const s = tileset.srcFor(id, tx, ty);
      r.bctx.drawImage(
        tileset.canvas, s.x, s.y + top, TILE_PX, h,
        tx * TILE_PX - r.camPX, ty * TILE_PX + top - r.camPY,
        TILE_PX, h,
      );
    }
  }

  /** True if this row has any tall grass on screen worth a second pass. */
  rowHasTallGrass(r: Renderer, ty: number): boolean {
    const t0x = Math.max(0, Math.floor(r.camX / TILE_SIZE));
    const t1x = Math.min(this.width - 1, Math.floor((r.camX + SCREEN_W) / TILE_SIZE));
    for (let tx = t0x; tx <= t1x; tx++) {
      if (WADE_THROUGH.has(this.ground[this.index(tx, ty)]!)) return true;
    }
    return false;
  }

  /**
   * The grass immediately around one character's feet, drawn in front of them.
   *
   * The row pass above is not enough on its own, and the reason is that this
   * game does not walk on a grid. The row pass can only ever cut at a fixed
   * height inside a tile, so how deep a body stands depends on where in its tile
   * the feet happen to be: a character walking south sinks to the chest over the
   * back half of every tile and surfaces to the knees over the front half, once
   * per tile, forever. On the original hardware the question never came up,
   * because you were always parked dead centre on a tile.
   *
   * So the grass a character is wading through follows the character instead.
   * A sprite-wide slice of the same tile is stacked from the foot of the tile up
   * to their waist -- the grass they are standing in, drawn where they are
   * standing in it, and sampled at the tile's own horizontal phase so the blades
   * stay in step with the ones underneath. Stood still in the middle of a tile
   * the lift is zero and the slice lands exactly on top of the pixels already
   * there, so the patch looks untouched; step forward and the grass rides up
   * with you and the character stays exactly as deep in it.
   */
  renderGrassSkirt(r: Renderer, tileset: Tileset, centerX: number, footY: number): void {
    const ty = Math.floor(footY / TILE_SIZE);
    if (ty < 0 || ty >= this.height) return;

    // How far the feet sit above their resting place at the foot of the tile.
    const lift = Math.max(0, (ty + 1) * TILE_SIZE - 2 - footY);

    const left = Math.round(centerX - TILE_SIZE / 2);
    const right = left + TILE_SIZE;
    const sy = GRASS_BLADE_TOP * DETAIL;
    const sh = TILE_PX - sy;

    for (let tx = Math.floor(left / TILE_SIZE); tx <= Math.floor((right - 1) / TILE_SIZE); tx++) {
      if (!this.inBounds(tx, ty)) continue;
      const id = this.ground[this.index(tx, ty)]!;
      if (!WADE_THROUGH.has(id)) continue;

      // Clipped to the part of the sprite's width that this tile actually
      // covers, so the blades stay in step with the ones drawn underneath.
      const x0 = Math.max(left, tx * TILE_SIZE);
      const x1 = Math.min(right, (tx + 1) * TILE_SIZE);
      const src = tileset.srcFor(id, tx, ty);
      const sx = src.x + (x0 - tx * TILE_SIZE) * DETAIL;
      const sw = (x1 - x0) * DETAIL;
      const dx = r.worldPX(x0);

      // Bottom copy upwards, in steps short enough that each one buries the
      // cut top edge of the one below it. Step further than the band is tall
      // and the seams print as horizontal lines straight across the mass.
      for (let l = 0; ; l += GRASS_STACK_STEP) {
        const step = Math.min(l, lift);
        const dy = r.worldPY(ty * TILE_SIZE + GRASS_BLADE_TOP - step);
        r.bctx.drawImage(tileset.canvas, sx, src.y + sy, sw, sh, dx, dy, sw, sh);
        if (step >= lift) break;
      }
    }
  }

  /**
   * One row of the overlay layer.
   *
   * Handed out a row at a time so the caller can interleave them with the
   * actors standing between them. Drawing the whole layer last -- which is
   * what this used to do -- means every tall object eats the head of whoever
   * is standing in front of it: walk up to a signpost and the top half of you
   * disappears into it.
   *
   * Sorting by row rather than by tile keeps it cheap, and a row is the right
   * granularity anyway: two things on the same row cannot overlap.
   */
  renderOverlayRow(r: Renderer, tileset: Tileset, ty: number): void {
    this.drawRow(r, this.over, tileset, ty);
  }
}
