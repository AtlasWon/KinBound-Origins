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
import { TILE_PX, TILE_SIZE, Tileset } from '../gfx/tileset.js';
import { terrainFor, unknownChars, type TerrainDef } from './terrain.js';
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

    for (let y = 0; y < this.height; y++) {
      const row = file.rows[y] ?? '';
      for (let x = 0; x < this.width; x++) {
        const ch = row[x] ?? ' ';
        const t = terrainFor(ch);
        const i = y * this.width + x;
        this.ground[i] = t.ground;
        this.over[i] = t.over ?? 0;
        this.collision[i] = t.collision;
        this.terrain[i] = t;
      }
    }

    this.warps = file.warps ?? [];
    this.npcs = file.npcs ?? [];
    this.objects = file.objects ?? [];
    this.connections = file.connections ?? [];
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
