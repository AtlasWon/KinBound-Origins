/**
 * Terrain vocabulary.
 *
 * Maps are authored as ASCII art (see data/maps/*.json) and compiled to layers
 * at load time. One character is one 16x16 tile. This is the whole map-editing
 * workflow: a new map is a text block plus a warp list, and needs no engine
 * changes and no binary tooling.
 */

import { T } from '../gfx/tileset.js';
import type { CollisionCode, TerrainTag } from '../data/schema.js';

export interface TerrainDef {
  /** Base layer tile. */
  ground: number;
  /** Overlay tile drawn above the player when they are behind it. */
  over?: number;
  collision: CollisionCode;
  tag: TerrainTag;
  /** Overlay is drawn on top of the player (canopies, roof overhangs). */
  aboveActors?: boolean;
  /** Direction a ledge can be hopped. */
  ledge?: 'down' | 'left' | 'right';
  /** Plays a rustle and can trigger an encounter. */
  encounter?: boolean;
  /** Footstep sound key. */
  step?: string;
}

/** Character -> terrain. Anything unmapped becomes solid void, loudly. */
export const TERRAIN: Record<string, TerrainDef> = {
  ' ': { ground: T.EMPTY, collision: 1, tag: 'floor' },
  '.': { ground: T.GRASS, collision: 0, tag: 'grass', step: 'grass' },
  ',': { ground: T.GRASS_TUFT, collision: 0, tag: 'grass', step: 'grass' },
  '*': { ground: T.GRASS_FLOWERS, collision: 0, tag: 'grass', step: 'grass' },
  '"': { ground: T.TALL_GRASS, collision: 6, tag: 'tallGrass', encounter: true, step: 'grass' },
  '-': { ground: T.PATH, collision: 0, tag: 'sand', step: 'dirt' },
  '=': { ground: T.STONE_FLOOR, collision: 0, tag: 'floor', step: 'stone' },
  '~': { ground: T.WATER, collision: 2, tag: 'water', step: 'water' },
  'W': { ground: T.WATER_DEEP, collision: 8, tag: 'deepWater', encounter: true, step: 'water' },
  's': { ground: T.SAND, collision: 0, tag: 'sand', step: 'sand' },
  'T': { ground: T.GRASS, over: T.TREE, collision: 1, tag: 'grass' },
  't': { ground: T.GRASS, over: T.TREE_SMALL, collision: 1, tag: 'grass' },
  'o': { ground: T.GRASS, over: T.ROCK, collision: 1, tag: 'grass' },
  'O': { ground: T.PATH, over: T.BOULDER, collision: 1, tag: 'sand' },
  '#': { ground: T.WALL_PLASTER, collision: 1, tag: 'floor' },
  'w': { ground: T.WALL_WINDOW, collision: 1, tag: 'floor' },
  'R': { ground: T.ROOF, collision: 1, tag: 'floor' },
  '[': { ground: T.ROOF_EDGE_L, collision: 1, tag: 'floor' },
  ']': { ground: T.ROOF_EDGE_R, collision: 1, tag: 'floor' },
  '^': { ground: T.ROOF_PEAK, collision: 1, tag: 'floor' },
  'D': { ground: T.DOOR, collision: 0, tag: 'floor', step: 'stone' },
  '|': { ground: T.GRASS, over: T.FENCE_V, collision: 1, tag: 'grass' },
  '_': { ground: T.GRASS, over: T.FENCE_H, collision: 1, tag: 'grass' },
  '!': { ground: T.GRASS, over: T.SIGN, collision: 1, tag: 'grass' },
  'C': { ground: T.CLIFF_FACE, collision: 1, tag: 'cave' },
  'c': { ground: T.CLIFF_TOP, collision: 1, tag: 'cave' },
  'L': { ground: T.LEDGE, collision: 3, tag: 'grass', ledge: 'down' },
  'f': { ground: T.FLOOR_WOOD, collision: 0, tag: 'floor', step: 'wood' },
  'r': { ground: T.FLOOR_RUG, collision: 0, tag: 'floor', step: 'wood' },
  'I': { ground: T.WALL_INTERIOR, collision: 1, tag: 'floor' },
  'K': { ground: T.COUNTER, collision: 1, tag: 'floor' },
  'S': { ground: T.STAIRS, collision: 0, tag: 'floor', step: 'stone' },
  'p': { ground: T.PUDDLE, collision: 0, tag: 'sand', step: 'water' },
  'B': { ground: T.BRIDGE, collision: 0, tag: 'floor', step: 'wood' },
  'X': { ground: T.GRASS, over: T.BRAMBLE, collision: 1, tag: 'grass' },
  'x': { ground: T.PLATE, collision: 0, tag: 'floor', step: 'stone' },

  // --- Waystation (healing). Red roof, white cross crest. --------------
  '1': { ground: T.ROOF_RED_L, collision: 1, tag: 'floor' },
  '2': { ground: T.ROOF_RED, collision: 1, tag: 'floor' },
  '3': { ground: T.ROOF_RED_R, collision: 1, tag: 'floor' },
  '4': { ground: T.ROOF_RED_PEAK, collision: 1, tag: 'floor' },
  '5': { ground: T.EMBLEM_HEAL, collision: 1, tag: 'floor' },

  // --- Provisioner (supplies). Blue roof, white crate crest. -----------
  '6': { ground: T.ROOF_BLUE_L, collision: 1, tag: 'floor' },
  '7': { ground: T.ROOF_BLUE, collision: 1, tag: 'floor' },
  '8': { ground: T.ROOF_BLUE_R, collision: 1, tag: 'floor' },
  '9': { ground: T.ROOF_BLUE_PEAK, collision: 1, tag: 'floor' },
  '0': { ground: T.EMBLEM_SHOP, collision: 1, tag: 'floor' },

  // --- Shared civic frontage. 'g' is the entrance and is walkable. ----
  'G': { ground: T.CIVIC_WALL, collision: 1, tag: 'floor' },
  'g': { ground: T.CIVIC_DOOR, collision: 0, tag: 'floor', step: 'stone' },
  'h': { ground: T.CIVIC_SIGN_HEAL, collision: 1, tag: 'floor' },
  'm': { ground: T.CIVIC_SIGN_SHOP, collision: 1, tag: 'floor' },

  // --- Interior furniture. -------------------------------------------
  'b': { ground: T.BED_HEAD, collision: 1, tag: 'floor' },
  'e': { ground: T.BED_FOOT, collision: 1, tag: 'floor' },
  'k': { ground: T.BOOKSHELF, collision: 1, tag: 'floor' },
  'A': { ground: T.TABLE, collision: 1, tag: 'floor' },
  'E': { ground: T.CHAIR, collision: 1, tag: 'floor' },
  'V': { ground: T.TELEVISION, collision: 1, tag: 'floor' },
  'P': { ground: T.PLANT, collision: 1, tag: 'floor' },
  'J': { ground: T.FRIDGE, collision: 1, tag: 'floor' },
  'N': { ground: T.SINK, collision: 1, tag: 'floor' },
  'Q': { ground: T.STOVE, collision: 1, tag: 'floor' },
  'U': { ground: T.WINDOW_IN, collision: 1, tag: 'floor' },
  'F': { ground: T.CIVIC_FLOOR, collision: 0, tag: 'floor', step: 'stone' },
};

export function terrainFor(ch: string): TerrainDef {
  return TERRAIN[ch] ?? { ground: T.EMPTY, collision: 1, tag: 'floor' };
}

/** Characters that should not silently pass validation. */
export function unknownChars(rows: string[]): string[] {
  const bad = new Set<string>();
  for (const row of rows) {
    for (const ch of row) if (!TERRAIN[ch]) bad.add(ch);
  }
  return [...bad];
}
