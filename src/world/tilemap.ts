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

import { Renderer } from '../engine/renderer.js';
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
}

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
    const t1x = Math.min(this.width - 1, Math.floor((r.camX + 240) / TILE_SIZE));
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
      last: Math.min(this.height - 1, Math.floor((r.camY + 160) / TILE_SIZE)),
    };
  }

  /** Base terrain, drawn under everything. */
  renderGround(r: Renderer, tileset: Tileset): void {
    this.drawLayer(r, this.ground, tileset);
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
