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
   * by rock -- Stonewake, which is quarried into a mountain -- and in a cave. Anywhere
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

  // --- Kin Clinic (healing). Red roof, white cross crest. --------------
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

  // --- The great bell tree of Briarbell. ------------------------------
  //
  // Four characters for a landmark thirteen cells wide and nine tall. The
  // crown is drawn as one outline with a single character and TileMap picks
  // its nine-slice edges from the neighbours (see autoGreatTree), which is the
  // only way a shape this size stays editable: move one row of apostrophes and
  // the silhouette follows.
  //
  // All four are overlays with no ground of their own, so the turf, path or
  // paving the map put under the tree shows through the gaps in the canopy and
  // between the roots. The bells are the exception that has to be walkable --
  // walking under the boughs with them hanging round you is the entire point of
  // standing here, and the overlay pass draws the row you are on after you.
  "'": { over: T.GREAT_LEAF_C, collision: 1, tag: 'grass' },
  '`': { over: T.GREAT_BELL, collision: 0, tag: 'grass', step: 'grass' },
  '{': { over: T.GREAT_TRUNK_C, collision: 1, tag: 'grass' },
  '}': { over: T.GREAT_ROOT_C, collision: 1, tag: 'grass' },

  // --- Emberfall: the volcanic city. ----------------------------------
  //
  // Non-ASCII characters, and not for fun: every printable ASCII character
  // except one was already spoken for by the time this material was needed, so
  // a thirteen-tile family had nowhere to live. Latin-1 keeps one character to
  // one tile, which is the whole contract the map format rests on.
  //
  // The set is mnemonic where it can be. '¦' is a broken bar for broken rock;
  // '«' '¬' '»' are the copper roof read as '[ ^ ]'; '±' and '÷' are the pipe
  // runs seen end-on and side-on; '°' is a pool and '·' a vent in the road.
  '¦': { ground: T.BASALT, collision: 0, tag: 'floor', step: 'stone' },
  '§': { ground: T.BASALT_WALL, collision: 1, tag: 'floor' },
  '¤': { ground: T.BASALT_WINDOW, collision: 1, tag: 'floor' },
  '«': { ground: T.ROOF_COPPER_L, collision: 1, tag: 'floor' },
  '¬': { ground: T.ROOF_COPPER, collision: 1, tag: 'floor' },
  '»': { ground: T.ROOF_COPPER_R, collision: 1, tag: 'floor' },
  // A spring is scalding. The town walks round them, so they are solid --
  // "look, do not paddle" is the correct reading and the only safe one.
  '°': { ground: T.SPRING, collision: 1, tag: 'water' },
  // A vent, on the other hand, is walkable, and that is the point of it: the
  // city paves over its fissures and steps across them all day long.
  '·': { ground: T.VENT, collision: 0, tag: 'ash', step: 'stone' },
  '±': { over: T.PIPE_H, collision: 1, tag: 'floor' },
  '÷': { over: T.PIPE_V, collision: 1, tag: 'floor' },
  '¶': { over: T.PIPE_RISER, collision: 1, tag: 'floor' },
  'µ': { over: T.LAMP_EMBER, collision: 1, tag: 'floor' },
  'Ø': { ground: T.FORGE, collision: 1, tag: 'floor' },
  // The city's own front door. Every other town uses the porch door, which is
  // right for a plastered cottage and reads as damage when it is dropped into
  // a wall of black rock -- see Tileset.basaltDoor.
  'Ä': { ground: T.BASALT_DOOR, collision: 0, tag: 'floor', step: 'stone' },
  // The sealed gate at the end of the causeway. Solid, and the whole district
  // is built around the fact that it is.
  'Å': { ground: T.SEALED_GATE, collision: 1, tag: 'cave' },
  // The city's notice board. A `sign` object only carries text -- the post is
  // terrain -- and the stock signpost stands on turf, so using it here would
  // put a bright green square in the middle of a black road. Without a post of
  // some kind the writing is invisible and the player never finds it.
  'Ç': { over: T.SIGN_EMBER, collision: 1, tag: 'floor' },

  // --- The Aurelians: the Embercoil Temple and every site after it. -----
  //
  // Non-ASCII for the same reason as the block above -- ASCII ran out -- but a
  // different block on purpose, so the two families cannot collide as later
  // stages add to either. GREEK is the Aurelian set; anything cut, machined or
  // powered by these people is spelled with a Greek letter, and the two maths
  // symbols are the conduit, which is the one thing here that is not stone.
  //
  // Mnemonic where it can be: 'Ω' is a closed arch, so it is the wall. 'Θ' is a
  // plate with a mark on it and 'θ' the same plate with the spiral cut into it.
  // 'Φ' is a ring standing on a stem, which is exactly what a resonance ring
  // is. 'Ψ' is fire, so it is the shaft. '≡' is a dead groove and '≈' the same
  // groove with the current running in it. 'Σ' is drifted cinder.
  //
  // A site in a later stage adds no characters: it is these eight, arranged
  // differently. That is deliberate -- the Aurelians built to one pattern
  // everywhere, and the player should recognise the second site as theirs from
  // the first screen of it.
  'Ω': { ground: T.AUR_WALL, collision: 1, tag: 'floor' },
  'Θ': { ground: T.AUR_FLOOR, collision: 0, tag: 'floor', step: 'stone' },
  'θ': { ground: T.AUR_GLYPH, collision: 0, tag: 'floor', step: 'stone' },
  '≡': { ground: T.AUR_VEIN, collision: 0, tag: 'floor', step: 'stone' },
  '≈': { ground: T.AUR_VEIN_LIT, collision: 0, tag: 'floor', step: 'stone' },
  // The ring is an overlay with no floor of its own, so it stands on whatever
  // the map put under it and the overlay pass draws it with its own row.
  'Φ': { over: T.AUR_RING, collision: 1, tag: 'floor' },
  // The shaft. Solid, and it has to stay solid: the temple is wound round a
  // hole in the mountain and the hole is the reason the temple is here.
  'Ψ': { ground: T.TEMPLE_MAGMA, collision: 1, tag: 'ash' },
  // The only tile in the building that carries a wild encounter. See the note
  // on aurAsh in src/gfx/tileset.ts: the engine rolls encounters on tiles that
  // declare one, so a sealed hall of cut stone is empty unless the mountain has
  // got into it, and the drift is where the mountain gets in.
  'Σ': {
    ground: T.AUR_ASH, collision: 0, tag: 'ash', encounter: true, step: 'sand',
  },
  // A seat. Furniture, not architecture: an overlay with no floor of its own,
  // because a lone cell of wall tile standing in the middle of a room reads as
  // a hole in the floor rather than as a thing somebody could sit on. 'Ξ' is
  // three bars, which is roughly what a cut stone stool looks like side-on.
  'Ξ': { over: T.AUR_SEAT, collision: 1, tag: 'floor' },

  // --- The wetlands and Mirehaven. ------------------------------------
  //
  // A third block, in a third script, for the reason the Emberfall note above
  // gives: ASCII ran out long ago, and two families that may both grow need to
  // be unable to collide as later stages add to either. CYRILLIC is the mire
  // set. Lower case is ground you stand on or wade through; upper case is
  // everything solid, built or lit.
  //
  // Mnemonic wherever it could be. 'д' is a deck, 'Р' a rail, 'Д' a trunk on
  // splayed roots, 'Г' a glowcap, 'С' a stilt, 'Б' a boat, 'Л' a lamp hanging
  // off a bracket, 'Ш' a comb and therefore combed thatch. The five ground
  // characters were chosen to be unmistakable from each other at a glance --
  // 'п ю ж ц д' -- because three of them make up almost the whole of the route
  // and a map you cannot read as text is a map nobody can edit.

  // Peat. The floor of the wetlands: wet, walkable, and slow to look at.
  'п': { ground: T.MIRE_MUD, collision: 0, tag: 'marsh', step: 'dirt' },
  // Standing marsh water. Wadeable, so it opens with the art the Tide Hall
  // gave the player -- which is what makes the wetlands the first region where
  // going straight across is a real option and not just a wish. The deep pools
  // beside it are ordinary deep water and stay shut until much later.
  'ю': { ground: T.MIRE_WATER, collision: 2, tag: 'water', step: 'water' },
  // Reeds are this region's tall grass and carry its encounters.
  'ж': { ground: T.REEDS, collision: 6, tag: 'tallGrass', encounter: true, step: 'water' },
  // Sedge: the walkable floor between the beds. Deliberately quiet.
  'ц': { ground: T.SEDGE, collision: 0, tag: 'marsh', step: 'grass' },
  // The boardwalk. The road of the whole region, and the only dry line in it.
  'д': { ground: T.BOARDWALK, collision: 0, tag: 'floor', step: 'wood' },
  // Its handrail: an overlay with no floor, so one tile rails a plank walk, a
  // stone platform and a jetty alike. Solid, and that is the point -- it is
  // what says which edge of a walkway is a way down into the water.
  'Р': { over: T.BOARD_RAIL, collision: 1, tag: 'floor' },
  // Mangrove: the wetlands' treeline and its map border.
  'Д': { ground: T.MIRE_MUD, over: T.MANGROVE, collision: 1, tag: 'marsh' },
  // Glowcap. The route is laid out so that a player who cannot see the
  // boardwalk through the fog can still see the next one of these.
  'Г': { ground: T.MIRE_MUD, over: T.GLOWCAP, collision: 1, tag: 'marsh' },
  // A piling, and a punt tied up beside one. Both carry their own water: out
  // in a lagoon there is no walkable neighbour to borrow a floor from, and an
  // overlay with nothing under it would land on turf.
  'С': { ground: T.STILT_POST, collision: 1, tag: 'water' },
  'Б': { ground: T.MOORED_BOAT, collision: 1, tag: 'water' },
  // Mirehaven's lantern, hung from a bracket. Floorless, so it hangs over
  // plank, stone and jetty without carrying a square of the wrong material.
  'Л': { over: T.LAMP_MIRE, collision: 1, tag: 'floor' },
  // Reed thatch, drawn like '[ ^ ]' -- 'Э' and 'Є' are the two bound ends and
  // face each other, which is the whole reason they are separate tiles.
  'Э': { ground: T.ROOF_THATCH_L, collision: 1, tag: 'floor' },
  'Ш': { ground: T.ROOF_THATCH, collision: 1, tag: 'floor' },
  'Є': { ground: T.ROOF_THATCH_R, collision: 1, tag: 'floor' },
  // Tarred plank: blank, window, hanging basket, and door.
  'Я': { ground: T.WALL_TAR, collision: 1, tag: 'floor' },
  'Ъ': { ground: T.WALL_TAR_WINDOW, collision: 1, tag: 'floor' },
  'Ч': { ground: T.WALL_TAR_PLANT, collision: 1, tag: 'floor' },
  'Џ': { ground: T.DOOR_TAR, collision: 0, tag: 'floor', step: 'wood' },
  // A marker post: the mire's signpost, and the one thing a player who has
  // walked off the boardwalk in the fog is likely to find. Floorless, so it
  // stands on plank and on peat alike -- which the turf-carrying ASCII sign
  // tile cannot do.
  'Ђ': { over: T.MIRE_POST, collision: 1, tag: 'floor' },
  // The deep cut. The lagoon Mirehaven stands over and the pool at the bottom
  // of the route, and it is a Swim gate exactly as the sea is -- but it is the
  // sea's colour that made it a separate tile. A saturated blue is right for
  // the Caeloran Sea and wrong for a marsh: it turned every gap between two
  // platforms into a stripe of open ocean running through the middle of a town
  // built on peat.
  'щ': { ground: T.MIRE_DEEP, collision: 8, tag: 'deepWater', encounter: true, step: 'water' },

  // --- Embercoil Pass: the road into the volcanic interior. -----------
  //
  // Latin-1 again, and for the same reason the Emberfall block above gives:
  // printable ASCII ran out long before this material was needed. The city
  // block took the symbols; this one takes the accents and the two Icelandic
  // letters, so the two families never collide even though they are next door
  // to each other on the map.
  //
  // Mnemonic where it can be. '¨' is ash falling and '¸' is ash banked up
  // against something; 'ß' is the one bold glyph in the set because the road is
  // the line an author traces first; '×' is the flow you do not cross and 'º'
  // the crust you do; '¡' is a plume standing over a cone; 'Æ'/'æ' are the
  // columnar cliff seen face-on and from above, 'Þ'/'ø' the same rock loose on
  // the ground; '©' and '®' are the two depths of a hot pool. The Foundation's
  // own kit is the numeric run -- '¯' and '¹' are its fence seen along and
  // across, '²' the survey mast, '³' the generator, 'ª' a spoil heap and '¾' a
  // stack of crates.
  '¨': { ground: T.ASH, collision: 0, tag: 'ash', step: 'sand' },
  '¸': { ground: T.ASH_DRIFT, collision: 0, tag: 'ash', step: 'sand' },
  // The same drift, with something living in it.
  //
  // Underground there is no scrub to hide in, and the encounter flag is what
  // makes a floor a hunting ground -- so a lava tube whose floor is all '¸' is
  // a corridor with nothing in it however good the tile is. This is that tile
  // with the flag on, so a cave author can say which stretches of loose ash a
  // player stirs up and which are bare rock, and can do it a tile at a time.
  // No new art: it is the identical cell.
  'ì': { ground: T.ASH_DRIFT, collision: 0, tag: 'ash', encounter: true, step: 'sand' },
  'ß': { ground: T.CINDER_ROAD, collision: 0, tag: 'ash', step: 'dirt' },
  // The route's tall grass. Knee-high and brittle rather than waist-deep, so it
  // is drawn under the player rather than round them -- see the note on the
  // painter -- but it rustles and it hides things exactly like the real thing.
  '¥': { ground: T.EMBER_SCRUB, collision: 6, tag: 'tallGrass', encounter: true, step: 'grass' },
  // A live flow is a wall. Nothing about it is ever negotiable, and it is the
  // one tile in the game that says so with colour alone.
  '×': { ground: T.LAVA, collision: 1, tag: 'ash' },
  'º': { ground: T.LAVA_CRUST, collision: 0, tag: 'ash', step: 'stone' },
  // Crust with something living on it. Same cell, encounter flag on -- the
  // floor of a lava tube is set rock, not ash, and a cave whose only hunting
  // ground is a pale grey drift reads as an outdoor field with a roof on it.
  'î': { ground: T.LAVA_CRUST, collision: 0, tag: 'ash', encounter: true, step: 'stone' },
  '¡': { ground: T.FUMAROLE, collision: 1, tag: 'ash' },
  // Overlays with no ground of their own, so whatever the map laid down --
  // ash, drift, road, crust -- shows through and round them.
  'þ': { over: T.CHAR_SNAG, collision: 1, tag: 'ash' },
  'ø': { ground: T.BASALT_ROCK, collision: 1, tag: 'ash' },
  'Þ': { ground: T.BASALT_CRAG, collision: 1, tag: 'ash' },
  'Æ': { ground: T.BASALT_FACE, collision: 1, tag: 'cave' },
  'æ': { ground: T.BASALT_TOP, collision: 1, tag: 'cave' },
  '¿': { ground: T.ASH_LEDGE, collision: 3, tag: 'ash', ledge: 'down' },
  '©': { ground: T.SPRING_SHALLOW, collision: 2, tag: 'water', step: 'water' },
  '®': { ground: T.SPRING_DEEP, collision: 8, tag: 'deepWater', step: 'water' },
  '¯': { over: T.MESH_FENCE_H, collision: 1, tag: 'ash' },
  '¹': { over: T.MESH_FENCE_V, collision: 1, tag: 'ash' },
  '²': { over: T.SURVEY_MAST, collision: 1, tag: 'ash' },
  '³': { over: T.GENERATOR, collision: 1, tag: 'ash' },
  'ª': { over: T.SPOIL_HEAP, collision: 1, tag: 'ash' },
  '¾': { over: T.CRATE_STACK, collision: 1, tag: 'ash' },
  // The mouth of a lava tube, cut in the pass wall. Walkable, because the warp
  // that leads into it stands on this tile.
  'Ð': { ground: T.VENT_MOUTH, collision: 0, tag: 'cave', step: 'stone' },
  // A signpost that is not standing in a square of imported lawn: the same
  // board and posts the whole region uses, with no ground of its own, so it
  // takes the ash, the road or the crust the map put under it.
  '´': { over: T.SIGN, collision: 1, tag: 'ash' },

  // --- Aureline: the capital. ------------------------------------------
  //
  // A fifth block, in a fifth script, for the reason the Emberfall note above
  // gives: printable ASCII ran out three settlements ago, and two families that
  // may both grow need to be unable to collide as later stages add to either.
  // BOX DRAWING AND BLOCK ELEMENTS is the capital's set, and it was chosen
  // because this map is far too big to edit any other way. Aureline is a
  // hundred and fifty-two characters across and a hundred and twenty deep --
  // eighteen thousand cells, three times Tideglass -- and at that size the
  // ASCII source has to be legible *as a picture* or nobody, human or
  // otherwise, can lay a street in it. So the glyphs are the thing they draw:
  // '▓' is a wall of glass, '█' the solid pier beside it, '┌─┐' is the parapet
  // along the top of a tower drawn exactly as it appears, '▬' is a road, '░'
  // is cobbles, '▪' is a cut block of granite and '▫' the window in it. Open a
  // district in an editor and you can see the district.
  //
  // The two kits do not blend, and that is the city's whole argument. The
  // modern kit STACKS -- cap, glass, pier, plinth, and a tower is the same
  // three characters repeated up the map, which is the only way a building gets
  // to be twelve rows tall without twelve pieces of art. The old kit does NOT
  // stack: granite, sash, arch, three storeys, and that is all it was ever
  // built to be.

  // Ground. Footway pale, carriageway dark, and the plan of the whole city
  // reads off the colour of the ground with no signage anywhere.
  '═': { ground: T.CITY_PAVE, collision: 0, tag: 'floor', step: 'stone' },
  '▬': { ground: T.CITY_ROAD, collision: 0, tag: 'floor', step: 'stone' },
  '░': { ground: T.CITY_COBBLE, collision: 0, tag: 'floor', step: 'stone' },
  '▒': { ground: T.PARK_PATH, collision: 0, tag: 'sand', step: 'dirt' },

  // The modern kit.
  '▓': { ground: T.GLASS_WALL, collision: 1, tag: 'floor' },
  '█': { ground: T.TOWER_PIER, collision: 1, tag: 'floor' },
  '┌': { ground: T.TOWER_CAP_L, collision: 1, tag: 'floor' },
  '─': { ground: T.TOWER_CAP, collision: 1, tag: 'floor' },
  '┐': { ground: T.TOWER_CAP_R, collision: 1, tag: 'floor' },
  '▄': { ground: T.TOWER_PLINTH, collision: 1, tag: 'floor' },
  '╬': { ground: T.TOWER_DOOR, collision: 0, tag: 'floor', step: 'stone' },
  '▌': { ground: T.SHOPFRONT, collision: 1, tag: 'floor' },
  '▐': { ground: T.AWNING, collision: 1, tag: 'floor' },

  // The old kit.
  '▪': { ground: T.GRANITE_WALL, collision: 1, tag: 'floor' },
  '▫': { ground: T.GRANITE_WINDOW, collision: 1, tag: 'floor' },
  '◘': { ground: T.GRANITE_ARCH, collision: 0, tag: 'floor', step: 'stone' },

  // The Meridian Foundation's own frontage. Nothing else in Caelora is built
  // out of it, which is the point: you can see where they are from four streets
  // away, and everything about it is meant to look like it is on your side.
  '╔': { ground: T.MER_WALL, collision: 1, tag: 'floor' },
  '╗': { ground: T.MER_GLASS, collision: 1, tag: 'floor' },
  '╦': { ground: T.MER_CREST, collision: 1, tag: 'floor' },
  '╩': { ground: T.MER_DOOR, collision: 0, tag: 'floor', step: 'stone' },

  // The trainshed, and only the trainshed. Aureline Central lays its track and
  // its platforms with the Central Road's own railway kit -- '━' '┃' '┗┛┏┓'
  // '╋' '┫' '▤' '▥', a few entries down this table -- because the line through
  // the terminus is the same line that crosses the plain outside it, and two
  // sets of rails drawn by two different hands meeting at a map seam is exactly
  // the join nobody owns. What a terminus needs on top of that is the one thing
  // a country halt never has: a roof over the whole of it.
  '╧': { ground: T.SHED_ROOF, collision: 1, tag: 'floor' },
  '╤': { ground: T.SHED_TRUSS, collision: 1, tag: 'floor' },

  // Street furniture. All overlay and all floorless, so one lamp stands on
  // flagstone, cobble, gravel and lawn without carrying a square of the wrong
  // ground with it -- which is exactly what the town lamp could not do, and the
  // reason the capital needed its own.
  '☼': { over: T.CITY_LAMP, collision: 1, tag: 'floor' },
  '♣': { over: T.STREET_TREE, collision: 1, tag: 'grass' },
  '♦': { over: T.BENCH, collision: 1, tag: 'floor' },
  '╫': { over: T.RAILING, collision: 1, tag: 'floor' },
  '♠': { over: T.HEDGE, collision: 1, tag: 'grass' },
  '◆': { over: T.STATUE, collision: 1, tag: 'floor' },
  // Ornamental water. Solid: a city fountain is something you walk round.
  '○': { ground: T.FOUNTAIN, collision: 1, tag: 'water' },

  // --- The Central Road: the farmed country and the main line. ---------
  //
  // A sixth block, and it had to be one: the capital next door had already
  // taken the light box drawing and the block elements by the time this
  // country needed characters, and two families that both grow have to be
  // unable to collide. HEAVY BOX DRAWING carries the railway and the
  // GEOMETRIC SHAPES carry the land, and neither is used anywhere else.
  //
  // The railway spells itself, which matters more here than in any other
  // family in the file -- this is the largest stretch of map in the game and
  // nearly all of it is nine characters repeated, so the source has to be
  // legible as a picture. A run of track looks like a run of track, the four
  // corners turn the way they are drawn, and the heavy cross is the one place
  // the road is allowed across it.
  //
  // The land is shapes. An arrow is standing corn, a filled circle is the mass
  // of a hedge, a triangle is a stook stood on its butt, a square is a stone by
  // the road, and the three hatched squares are the three made surfaces.

  // Macadam. The road itself, and the tile the player walks most of this act
  // on. Tagged 'sand' like every other road, so the battle backdrop and the
  // footstep tables keep treating a road as a road -- but it steps on stone,
  // because this one is stone.
  '▦': { ground: T.HIGHROAD, collision: 0, tag: 'sand', step: 'stone' },
  // Ploughed field. Walkable, and deliberately so: a field with a crop in it
  // is an encounter and a field that has been turned is a shortcut, which is
  // the only decision an arable plain can offer on its own.
  '▧': { ground: T.FURROW, collision: 0, tag: 'sand', step: 'dirt' },
  // Standing wheat: this country's tall grass, and where its Kin live.
  '↑': { ground: T.WHEAT, collision: 6, tag: 'tallGrass', encounter: true, step: 'grass' },
  // Hedgerow. The field wall, and the reason the plain is not one open sheet:
  // an overlay with turf under it, so the player walking the far side of a
  // hedge is correctly drawn behind it.
  '●': { ground: T.GRASS, over: T.HEDGEROW, collision: 1, tag: 'grass' },
  // A stook of sheaves. Floorless, so it stands in stubble, on a verge and in
  // a farmyard without carrying a square of the wrong ground with it.
  '▲': { over: T.STOOK, collision: 1, tag: 'grass' },
  // A milestone. Floorless for the same reason -- they stand on the verge, and
  // the verge is turf in one mile and macadam in the next.
  '■': { over: T.MILESTONE, collision: 1, tag: 'grass' },
  // A telegraph pole: a mast with two crossarms, which is what the glyph is.
  '╪': { over: T.TELEGRAPH, collision: 1, tag: 'grass' },
  // The embankment flank. Solid, and that is the whole point of a railway on a
  // map: the country is now in two halves and the road has to find the
  // crossing. Drawn as the face seen from the SOUTH, so it belongs in the row
  // below a run of track.
  '┅': { ground: T.EMBANKMENT, collision: 1, tag: 'floor' },
  // The permanent way. Solid: nobody walks up the middle of a working line.
  '━': { ground: T.TRACK_H, collision: 1, tag: 'floor' },
  '┃': { ground: T.TRACK_V, collision: 1, tag: 'floor' },
  // The four curves, named for the two edges they leave by, and drawn as the
  // corner they turn.
  '┗': { ground: T.TRACK_NE, collision: 1, tag: 'floor' },
  '┛': { ground: T.TRACK_NW, collision: 1, tag: 'floor' },
  '┏': { ground: T.TRACK_SE, collision: 1, tag: 'floor' },
  '┓': { ground: T.TRACK_SW, collision: 1, tag: 'floor' },
  // The level crossing, and the only tile of railway anybody is allowed on.
  '╋': { ground: T.TRACK_CROSSING, collision: 0, tag: 'sand', step: 'wood' },
  // The same crossing on a line running north to south. Two tiles rather than
  // one, because the deck timbers are laid parallel to the rails and a deck
  // drawn across the wrong axis reads as road markings.
  '╂': { ground: T.TRACK_CROSSING_V, collision: 0, tag: 'sand', step: 'wood' },
  // A semaphore signal: a mast with an arm off one side, which is the glyph.
  '┫': { over: T.TRACK_SIGNAL, collision: 1, tag: 'floor' },
  // The halt platform, and its coping. Both walkable; the coping row is the
  // one nearest the track, and the halt is laid out with the line to the south.
  '▤': { ground: T.HALT_DECK, collision: 0, tag: 'floor', step: 'stone' },
  '▥': { ground: T.HALT_EDGE, collision: 0, tag: 'floor', step: 'stone' },

  // --- The mountain roads: Route 8 to Frostmere, Route 9 to Skyreach. ---
  //
  // A seventh block, in a seventh script, for the reason every note above
  // gives: printable ASCII ran out five settlements ago and two families that
  // both grow have to be unable to collide. MATHEMATICAL OPERATORS is the
  // mountain set. Nothing else in the game uses it, and no glyph here is
  // confusable at a glance with one already spoken for -- which matters more
  // on these two maps than on any before them, because Route 8 is ninety per
  // cent five characters and a source you cannot read as a picture is a map
  // nobody can edit.
  //
  // Mnemonic wherever it could be. '∴' is three flecks lying on the ground and
  // '≋' the same snow banked into ridges; '∫' is the long line the road traces
  // up the map; '∀' is a tuft of twigs; '∩' is a treetop and '∪' the same tree
  // bowed under a load; '∆' is a lump of rock and '∇' the same rock shattered;
  // '≅' is a flat sheet with water moving under it and '≠' the same sheet
  // struck through, which is the only thing the map needs to say about rotten
  // ice; '√' is a stacked mark, so it is the cairn; '∈' is a rung between two
  // rails and '∋' the post it is made off on; '⊗' is a hole; '∧' is a blade
  // combed over by the wind; '⇓' is a great deal of water going down.
  //
  // THE ONE RULE THIS FAMILY IS BUILT ON: on every other map in Caelora the
  // road is the pale line and the country round it is dark. Up here it is the
  // other way about. The ground is the brightest thing on the screen and
  // everything the player has to read -- the road, the pines, the crags, the
  // scrub they get jumped in, the ice they must not stand on -- is darker than
  // it. That inversion is what a snow route feels like to walk across, and it
  // is why the trodden road below is grey rather than gold.

  // Open snow. The floor of Route 8, and the tile there is most of.
  '∴': { ground: T.SNOW, collision: 0, tag: 'snow', step: 'grass' },
  // Drift. Walkable, and it looks slower than it is on purpose: a player who
  // reads a bank of sastrugi as "the long way round" and takes the road is
  // reading the map exactly as intended.
  '≋': { ground: T.SNOW_DEEP, collision: 0, tag: 'snow', step: 'grass' },
  // Dwarf birch under the snow: this route's tall grass, and its encounters.
  '∀': { ground: T.SNOW_SCRUB, collision: 6, tag: 'tallGrass', encounter: true, step: 'grass' },
  // The trodden road. The one line a player can follow when the squall closes
  // in, which is the whole reason the visibility is allowed to close at all.
  '∫': { ground: T.SNOW_ROAD, collision: 0, tag: 'sand', step: 'dirt' },
  // A cornice: a step down you can take and cannot take back.
  '⌐': { ground: T.SNOW_LEDGE, collision: 3, tag: 'snow', ledge: 'down' },
  // Conifer, bare and laden. Overlays standing on their own snow, so a player
  // walking behind a stand is correctly drawn behind it, and so the ground
  // under a wood is the ground the map put there.
  // The same conifer standing on turf rather than on snow, which is what the
  // pine BAND on the climb is made of: the wood is halfway up the mountain and
  // the snow does not start until above it. No new art -- it is the identical
  // overlay -- and it is the tile that lets the treeline arrive twenty columns
  // before the snowline does.
  '∏': { ground: T.GRASS, over: T.PINE, collision: 1, tag: 'grass' },
  '∩': { ground: T.SNOW, over: T.PINE, collision: 1, tag: 'snow' },
  '∪': { ground: T.SNOW, over: T.PINE_SNOW, collision: 1, tag: 'snow' },
  // A boulder in the snow. Floorless, so one tile is a rock in a field, a rock
  // in the road and a rock out on the scree without carrying a square of the
  // wrong ground with it.
  '∆': { over: T.SNOW_ROCK, collision: 1, tag: 'snow' },
  // Scree: the rocky-hills band of the climb and the floor of every ledge on
  // Skyreach. Tagged 'cave' so a battle out here backs onto rock rather than
  // onto a lawn.
  '∇': { ground: T.SCREE, collision: 0, tag: 'cave', step: 'stone' },
  // Lake ice. Walkable, and the only walkable tile in the family that is
  // darker than the ground around it -- which is what makes a frozen tarn read
  // as a hole in the white from the far side of the screen.
  '≅': { ground: T.LAKE_ICE, collision: 0, tag: 'snow', step: 'stone' },
  // Rotten ice. Solid, and it has to be: it is the only way a map can say "not
  // here" about a surface the player has already walked on twenty tiles back.
  '≠': { ground: T.ICE_CRACK, collision: 1, tag: 'snow' },
  // A cairn. Navigation equipment, not decoration -- both roads are laid out
  // so that from any one of these you can see the next. Floorless, so it
  // stands on snow, road and scree alike.
  '√': { over: T.CAIRN, collision: 1, tag: 'snow' },
  // The rope bridge, and the bollard the cables are made off on. The deck
  // carries its OWN dark underneath, because the cell beside it is a chasm and
  // there is no floor to borrow.
  '∈': { ground: T.ROPE_DECK, collision: 0, tag: 'floor', step: 'wood' },
  '∋': { over: T.ROPE_POST, collision: 1, tag: 'cave' },
  // The drop. Solid, and the only solid tile in the game a player is meant to
  // walk up to the edge of and look into.
  '⊗': { ground: T.GORGE, collision: 1, tag: 'cave' },
  // Plateau tussock: Skyreach's tall grass, and its only green.
  '∧': { ground: T.WIND_TUSSOCK, collision: 6, tag: 'tallGrass', encounter: true, step: 'grass' },
  // A fall. Solid, and it is what gives a cliff its height: a grey wall is a
  // wall, and the same wall with a white thread down it is a mountain.
  '⇓': { ground: T.WATERFALL, collision: 1, tag: 'water' },

  // --- Frostmere, and the Frost Hall under it. -------------------------
  //
  // An eighth block, in an eighth script, for the reason every note above
  // gives -- and this one had a second reason. The mountain roads next door
  // took MATHEMATICAL OPERATORS for the *ground*, and Frostmere stands on that
  // ground and adds nothing to it: the snow in this town is '∴', the road out
  // of it is '∫', the pines round it are '∩'. What the town adds is the other
  // half of the picture, the fourteen characters a settlement is BUILT from,
  // and those had to be unmistakable from the ground they stand on at a
  // glance. So: LATIN EXTENDED-A. Every glyph here is a letter wearing
  // something, which is exactly how a Frostmere source file should read -- a
  // recognisable building alphabet with the weather on it.
  //
  // Mnemonic throughout, and the letter is the thing. 'Ħ' is a wall with a
  // course struck through it and 'Ĥ' the same wall with a light in it; 'Ď' is
  // a door with the porch hood over it; 'Ř Ŗ Ŕ' is the roof read as '[ ^ ]',
  // three accents leaning three ways; 'Ĵ' is a stack with smoke coming off it;
  // 'Ł' is a post with a bracket on it; 'Ŵ' is wood; 'Ų' is a stack of cut
  // blocks; 'Ę' is a pot standing on legs. The last three are the Hall: 'Ī' is
  // ice with the chalk mark on it, 'Į' is the same ice with the crack going
  // down through it, and 'ĩ' is what is underneath both of them.
  //
  // WHY THE TOWN IS THIS DARK. Every other settlement in Caelora is built out
  // of something lighter than the country round it. Frostmere is the only one
  // where the ground is the bright thing, so the buildings had to come from
  // the bottom of the value range or the town dissolves into the field. A
  // street of these characters on a page of '∴' is the silhouette of the
  // place: black blocks in white, warm roofs, and one blue light per door.

  // The wall, in three cuts. Mountain granite laid a metre thick, because
  // stone is the only insulation there is up here and there is a mountain of
  // it next door. The door is WALKABLE and is a doorway rather than a floor --
  // see DOORWAY below -- because a Frostmere door is recessed into the
  // thickness of its own wall, so the player really does step into the stone.
  'Ħ': { ground: T.FROST_WALL, collision: 1, tag: 'floor' },
  'Ĥ': { ground: T.FROST_WINDOW, collision: 1, tag: 'floor' },
  'Ď': { ground: T.FROST_DOOR, collision: 0, tag: 'floor', step: 'stone' },
  // Split cedar shingle with the winter still sitting on it, drawn like
  // '[ ^ ]'. Timber and not slate, and the reason is in the tileset: slate
  // sheds its load in one slab onto whoever is under it, shingle holds, and a
  // foot of snow on a roof is a foot of insulation nobody paid for.
  'Ř': { ground: T.ROOF_SHINGLE_L, collision: 1, tag: 'floor' },
  'Ŗ': { ground: T.ROOF_SHINGLE, collision: 1, tag: 'floor' },
  'Ŕ': { ground: T.ROOF_SHINGLE_R, collision: 1, tag: 'floor' },
  // The chimney. It drops into a run of 'Ŗ' and it is the most important
  // character on the map: a Frostmere roof with smoke over it is a house with
  // somebody in it, and the player is about to walk somewhere there are none.
  'Ĵ': { ground: T.ROOF_STACK, collision: 1, tag: 'floor' },
  // The blue lantern on its rope post. Floorless, so one post stands in snow,
  // on the swept road and on stone alike. The rope runs out of both sides of
  // the cell at hand height, so a RUN of these reads as one line rather than
  // as nine lamps -- which is the whole point of them, and the reason they are
  // always laid in unbroken runs from door to door on the map.
  'Ł': { over: T.LAMP_FROST, collision: 1, tag: 'snow' },
  // Cordwood, and sawn lake ice packed in straw. Both floorless. The ice is
  // the town's entire economy sitting in the street, and it is also the thing
  // the storm ruins, so a player who has read one of these understands what
  // has gone wrong here before anybody says it.
  'Ŵ': { over: T.WOODPILE, collision: 1, tag: 'snow' },
  'Ų': { over: T.ICE_STACK, collision: 1, tag: 'snow' },
  // A pot of fire. The only hot thing in the set, floorless, and it does the
  // same job in the street and out on the Hall's ice: it holds a piece of the
  // world open. Solid -- you warm your hands at one, you do not stand in it.
  'Ę': { over: T.FIREPOT, collision: 1, tag: 'floor' },

  // The Frost Hall's floor: one substance in three states, and the whole
  // argument of the sixth Hall is that the player needs two of them and cannot
  // choose which. These are NOT the lake tiles above. Lake ice is weather;
  // this is ice somebody measured and chalked at six o'clock this morning.
  //
  // Sound ice: passed, walkable, and the brightest floor in the game.
  'Ī': { ground: T.ICE_SOUND, collision: 0, tag: 'snow', step: 'stone' },
  // Failed ice: solid. The cracks are white, the lake is black through them,
  // and the chalk is a cross -- so a player can read it from four tiles away
  // and never has to learn it by falling through.
  'Į': { ground: T.ICE_ROTTEN, collision: 1, tag: 'snow' },
  // A channel the crew hold open with fire so the town has water in February.
  // Collision 2, so it is the art the Tide Hall gave -- three Halls back, and
  // this is the room that says what it was for.
  'ĩ': { ground: T.ICE_THAW, collision: 2, tag: 'water', step: 'water' },
};

/**
 * Ground tiles that are a doorway cut into a wall rather than floor.
 *
 * They are walkable, so the plain "most common walkable neighbour" vote that
 * gives furniture its floor would happily slide a front door under a pot plant
 * standing beside one.
 */
const DOORWAY = new Set<number>([
  T.DOOR, T.DOOR_PORCH, T.CIVIC_DOOR, T.LAB_DOOR_L, T.LAB_DOOR_R, T.BASALT_DOOR, T.DOOR_TAR,
  T.FROST_DOOR,
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
