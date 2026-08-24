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
  /**
   * Base layer tile.
   *
   * Furniture leaves this out. A chair has to stand on floorboards in a house
   * and on civic tile in the laboratory, so naming one floor here is exactly
   * what put every sofa in a cream square on a white floor. TileMap fills the
   * gap from the floor around the cell instead -- see `inheritGround`.
   */
  ground?: number;
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
  /**
   * The map border.
   *
   * 'T' is what the edge of a map is made of, everywhere. A wall of woodland
   * is the era's way of saying "the world continues and you do not go that
   * way", and it says it without claiming anything about the terrain: trees
   * ring a coast, a marsh and a farm equally happily.
   *
   * The rock border below ('C' and 'c') is the exception and has to earn its
   * place: a cliff edge is a statement that this place is up against a
   * mountain, so it belongs on a highland map, on a settlement genuinely ringed
   * by rock -- Kellowmere, which is a quarry town -- and in a cave. Anywhere
   * else it reads as a quarry the map is not.
   */
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
  /**
   * The way out of a room.
   *
   * The tile draws a doorcase and a dark opening in the interior wall's own
   * material, so it only reads as a doorway when it is *part of a wall run* --
   * put it in the middle of a floor and it is a stub of wall standing on the
   * boards with a hole in it. It belongs in the row of 'I' that closes the
   * bottom of the room, not on the floor in front of that row.
   */
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
  'K': { over: T.COUNTER, collision: 1, tag: 'floor' },
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

  // --- Interior furniture. All overlay, all floorless: see TerrainDef.ground.
  'b': { over: T.BED_HEAD, collision: 1, tag: 'floor' },
  'e': { over: T.BED_FOOT, collision: 1, tag: 'floor' },
  'k': { over: T.BOOKSHELF, collision: 1, tag: 'floor' },
  'A': { over: T.TABLE, collision: 1, tag: 'floor' },
  'E': { over: T.CHAIR, collision: 1, tag: 'floor' },
  'V': { over: T.TELEVISION, collision: 1, tag: 'floor' },
  'P': { over: T.PLANT, collision: 1, tag: 'floor' },
  'J': { over: T.FRIDGE, collision: 1, tag: 'floor' },
  'N': { over: T.SINK, collision: 1, tag: 'floor' },
  'Q': { over: T.STOVE, collision: 1, tag: 'floor' },
  // A window is cut into the wall, not stood in front of it, so it stays fabric.
  'U': { ground: T.WINDOW_IN, collision: 1, tag: 'floor' },
  'F': { ground: T.CIVIC_FLOOR, collision: 0, tag: 'floor', step: 'stone' },

  // --- Second house set. ----------------------------------------------
  // These are meant to be mixed: a roof hue, a wall material and a window
  // belong to a house, not to each other, and four frontages built from
  // different combinations is what stops a street reading as one house
  // stamped out six times.
  //
  // Slate gable, drawn like '[ ^ ]': the end tiles carry their own ridge cap,
  // so a one-row roof has no notch in either top corner.
  '<': { ground: T.ROOF_SLATE_L, collision: 1, tag: 'floor' },
  '%': { ground: T.ROOF_SLATE, collision: 1, tag: 'floor' },
  '>': { ground: T.ROOF_SLATE_R, collision: 1, tag: 'floor' },
  // Moss hipped roof: the other roof *shape*, ends folded in on a diagonal.
  '(': { ground: T.ROOF_HIP_L, collision: 1, tag: 'floor' },
  '&': { ground: T.ROOF_HIP, collision: 1, tag: 'floor' },
  ')': { ground: T.ROOF_HIP_R, collision: 1, tag: 'floor' },
  // Chimney on the default terracotta ridge; drops into a '^' slot.
  'j': { ground: T.ROOF_CHIMNEY, collision: 1, tag: 'floor' },
  'H': { ground: T.WALL_TIMBER, collision: 1, tag: 'floor' },
  'M': { ground: T.WALL_BRICK, collision: 1, tag: 'floor' },
  'Z': { ground: T.WINDOW_SHUTTER, collision: 1, tag: 'floor' },
  'd': { ground: T.WINDOW_BOX, collision: 1, tag: 'floor' },
  'i': { ground: T.DOOR_PORCH, collision: 0, tag: 'floor', step: 'stone' },

  // --- Laboratory. Wide, flat-topped, glazed; shares nothing with a house.
  'l': { ground: T.LAB_WALL, collision: 1, tag: 'floor' },
  'n': { ground: T.LAB_WINDOW, collision: 1, tag: 'floor' },
  'z': { ground: T.LAB_SIGN, collision: 1, tag: 'floor' },
  // 'q' and 'u' are the two leaves of one double door and only work as a pair.
  'q': { ground: T.LAB_DOOR_L, collision: 0, tag: 'floor', step: 'stone' },
  'u': { ground: T.LAB_DOOR_R, collision: 0, tag: 'floor', step: 'stone' },
  'v': { ground: T.LAB_ROOF, collision: 1, tag: 'floor' },
  'y': { ground: T.LAB_VENT, collision: 1, tag: 'floor' },

  // --- Laboratory interior. -------------------------------------------
  '+': { over: T.LAB_MACHINE, collision: 1, tag: 'floor' },
  '?': { over: T.LAB_CONSOLE, collision: 1, tag: 'floor' },
  '@': { over: T.LAB_TANK, collision: 1, tag: 'floor' },
  '$': { over: T.WORKBENCH, collision: 1, tag: 'floor' },
  ':': { ground: T.FLOOR_LAB, collision: 0, tag: 'floor', step: 'stone' },

  // --- More house and shop furniture. ---------------------------------
  '/': { over: T.SOFA, collision: 1, tag: 'floor' },
  ';': { over: T.SHOP_SHELF, collision: 1, tag: 'floor' },

  // --- Town dressing. Overlays with transparent backgrounds, so the ground
  // under a lamp is the same ground as the tile beside it -- turf, path or
  // paving, whichever the map put there. ---------------------------------
  'a': { over: T.FLOWER_BED, collision: 1, tag: 'grass' },
  'Y': { over: T.LAMP_POST, collision: 1, tag: 'grass' },
};

/**
 * Ground tiles that are a doorway cut into a wall rather than floor.
 *
 * They are walkable, so the plain "most common walkable neighbour" vote that
 * gives furniture its floor would happily slide a front door under a pot plant
 * standing beside one.
 */
const DOORWAY = new Set<number>([
  T.DOOR, T.DOOR_PORCH, T.CIVIC_DOOR, T.LAB_DOOR_L, T.LAB_DOOR_R,
]);

/** Whether a cell's ground may be borrowed by floorless terrain next to it. */
export function donatesFloor(t: TerrainDef): boolean {
  return t.collision === 0 && t.ground !== undefined && !DOORWAY.has(t.ground);
}

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
