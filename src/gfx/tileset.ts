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
  // Kin Clinic: red roof, healing crest.
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
  /**
   * The great bell tree of Briarbell.
   *
   * One landmark spread across a 13x9 block of the map, because no single 16x16
   * cell can be "gigantic" -- that is the whole point of it. The crown is a
   * nine-slice blob so an author draws its outline with one character and the
   * map compiler picks the edges (see TileMap.autoGreatTree); the bole tiles are
   * the three cells where the trunk comes up through the underside of the crown;
   * and the bells hang in the open air under the boughs on their own walkable
   * row, which is what makes them visible at all rather than buried in leaf.
   *
   * Appended at the very end of the enum, and none of these painters touches the
   * shared Rng: tile ids are atlas indices and the alternates are painted from
   * one ordered stream, so anything that inserts an id above an existing one or
   * draws a random number moves every varied tile in the world.
   */
  GREAT_LEAF_NW,
  GREAT_LEAF_N,
  GREAT_LEAF_NE,
  GREAT_LEAF_W,
  GREAT_LEAF_C,
  GREAT_LEAF_E,
  GREAT_LEAF_SW,
  GREAT_LEAF_S,
  GREAT_LEAF_SE,
  GREAT_BOLE_L,
  GREAT_BOLE_C,
  GREAT_BOLE_R,
  GREAT_BELL,
  GREAT_TRUNK_L,
  GREAT_TRUNK_C,
  GREAT_TRUNK_R,
  GREAT_ROOT_L,
  GREAT_ROOT_C,
  GREAT_ROOT_R,
  /**
   * Emberfall.
   *
   * A volcanic city needs its own material or it is Briarbell painted grey:
   * basalt for the ground and the walls, copper for the roofs and the pipework,
   * fire in the road, and water that arrives hot. Appended at the very end for
   * the reason given above -- tile ids are atlas indices, and an id inserted in
   * the middle of the enum moves every varied cell in the world.
   */
  BASALT,
  BASALT_WALL,
  BASALT_WINDOW,
  ROOF_COPPER_L,
  ROOF_COPPER,
  ROOF_COPPER_R,
  SPRING,
  VENT,
  PIPE_H,
  PIPE_V,
  PIPE_RISER,
  LAMP_EMBER,
  FORGE,
  BASALT_DOOR,
  SEALED_GATE,
  SIGN_EMBER,
  /**
   * The wetlands and Mirehaven.
   *
   * Two families that share one material. The route is peat, standing water,
   * reed and plank; the town is the same plank raised on pilings over the same
   * water, with thatch on top and tar down the walls. Nothing here reuses a
   * turf, a path or a sea tile, because the point of the wetlands is that the
   * ground itself behaves differently -- you walk on a line somebody built, or
   * you wade.
   *
   * Appended at the very end for the reason given above: tile ids are atlas
   * indices, and an id inserted in the middle of the enum moves every varied
   * cell in the world.
   */
  MIRE_MUD,
  MIRE_WATER,
  REEDS,
  SEDGE,
  BOARDWALK,
  BOARD_RAIL,
  MANGROVE,
  GLOWCAP,
  STILT_POST,
  MOORED_BOAT,
  LAMP_MIRE,
  ROOF_THATCH_L,
  ROOF_THATCH,
  ROOF_THATCH_R,
  WALL_TAR,
  WALL_TAR_WINDOW,
  WALL_TAR_PLANT,
  DOOR_TAR,
  MIRE_POST,
  MIRE_DEEP,
  /**
   * The Aurelians.
   *
   * The first proper interior of the civilisation that built the Tideheart, and
   * the one material family in the game that is not quarried, grown or nailed
   * together. Two ideas carry all of it. The first is that they cut pale
   * limestone into machined plates and ran bronze through the joints, so their
   * rooms read as *made to a tolerance* next to anything else in Caelora. The
   * second is that their power is visible: it runs in grooves cut through the
   * floor, and it is the same cold blue-green as the thing in the player's bag,
   * because it is the same technology. A dead groove and a living one are two
   * tiles rather than one tile with a flag, which is what lets a map say
   * "upstairs is off and downstairs is on" with no engine behind it.
   *
   * The magma is the other half of the argument: they built here because the
   * mountain was already loud, and the shaft the whole temple is wound around
   * drops straight into it.
   *
   * Appended at the very end for the reason given above -- tile ids are atlas
   * indices, and an id inserted in the middle of the enum moves every varied
   * cell in the world.
   */
  AUR_WALL,
  AUR_FLOOR,
  AUR_GLYPH,
  AUR_VEIN,
  AUR_VEIN_LIT,
  AUR_RING,
  AUR_ASH,
  AUR_SEAT,
  TEMPLE_MAGMA,
  /**
   * Embercoil Pass.
   *
   * The open volcanic country between Tideglass and Emberfall. The city's
   * basalt, copper and ember ramps are already here and are reused wherever
   * they fit; what a *route* needs on top of that is ground it can be built
   * out of by the acre -- ash, clinker road, dead scrub, running lava, cooled
   * crust, black cliff -- plus the Meridian field kit that is now standing on
   * top of it. Nothing in this family touches the shared Rng: every one of the
   * painters below draws from position hashes only, so appending them here
   * cannot move a single varied tile anywhere else in the world.
   *
   * Appended at the very end for the reason given further up: tile ids are
   * atlas indices.
   */
  ASH,
  ASH_DRIFT,
  CINDER_ROAD,
  EMBER_SCRUB,
  LAVA,
  LAVA_CRUST,
  FUMAROLE,
  CHAR_SNAG,
  BASALT_ROCK,
  BASALT_CRAG,
  BASALT_FACE,
  BASALT_TOP,
  ASH_LEDGE,
  SPRING_SHALLOW,
  SPRING_DEEP,
  MESH_FENCE_H,
  MESH_FENCE_V,
  SURVEY_MAST,
  GENERATOR,
  SPOIL_HEAP,
  CRATE_STACK,
  VENT_MOUTH,
  /**
   * Aureline: the capital.
   *
   * The one settlement in Caelora that is not made of what is under it. Every
   * other town in the game is quarried, felled or dug out of its own ground --
   * Stonewake is the mountain, Emberfall is the lava, Mirehaven is the reeds --
   * and that is exactly why the capital needs a material family of its own:
   * Aureline is made of things that were *brought here*. Float glass, rolled
   * steel, imported granite, macadam.
   *
   * The set is built round one argument, which is the whole point of the city:
   * the seam between old and new. So it is two kits that do not blend. The
   * modern kit is a curtain wall, a pier, a parapet and a plinth, and it stacks
   * -- a tower is the same three tiles repeated up the map, which is what lets
   * a building be twelve rows tall without twelve pieces of art. The old kit is
   * coursed granite, a sash window and an arched door, and it does not stack:
   * three storeys is all it was ever built to.
   *
   * Nothing in this family touches the shared Rng -- every painter below draws
   * from position hashes only -- so appending it here cannot move a single
   * varied tile anywhere else in the world. Appended at the very end for the
   * reason given further up: tile ids are atlas indices.
   */
  CITY_PAVE,
  CITY_ROAD,
  CITY_COBBLE,
  PARK_PATH,
  GLASS_WALL,
  TOWER_PIER,
  TOWER_CAP_L,
  TOWER_CAP,
  TOWER_CAP_R,
  TOWER_PLINTH,
  TOWER_DOOR,
  SHOPFRONT,
  AWNING,
  GRANITE_WALL,
  GRANITE_WINDOW,
  GRANITE_ARCH,
  MER_WALL,
  MER_GLASS,
  MER_CREST,
  MER_DOOR,
  SHED_ROOF,
  SHED_TRUSS,
  CITY_LAMP,
  STREET_TREE,
  BENCH,
  RAILING,
  HEDGE,
  STATUE,
  FOUNTAIN,
  /**
   * The Central Road.
   *
   * The country between the wetlands and the capital, and the first place in
   * Caelora that is *farmed*. Everything else the player has walked through is
   * what the ground happens to be doing -- turf, ash, peat, reed -- and this is
   * the first ground somebody has decided about: ploughed, cropped, hedged,
   * metalled, and cut through by a railway.
   *
   * Three ideas carry the family and they are meant to argue with each other.
   * The FIELD is soft: wheat, loam, hedge, straw, all warm and all irregular.
   * The ROAD is hard: macadam, greyer and duller than any road so far, because
   * this one was engineered rather than worn. The LINE is harder still: broken
   * stone, creosoted timber, and two rails whose heads are the brightest thing
   * on the map -- nothing else in Caelora is polished. A player who reads gold
   * as food, grey as traffic and white as iron has read the whole act before
   * anybody says a word about the capital.
   *
   * Nothing in this family touches the shared Rng: every painter draws from
   * position hashes only, so appending it here cannot move a varied tile
   * anywhere else in the world. Appended at the very end for the reason given
   * further up -- tile ids are atlas indices.
   */
  HIGHROAD,
  FURROW,
  WHEAT,
  HEDGEROW,
  STOOK,
  MILESTONE,
  TELEGRAPH,
  EMBANKMENT,
  TRACK_H,
  TRACK_V,
  TRACK_NE,
  TRACK_NW,
  TRACK_SE,
  TRACK_SW,
  TRACK_CROSSING,
  TRACK_CROSSING_V,
  TRACK_SIGNAL,
  HALT_DECK,
  HALT_EDGE,
  COUNT,
}

/** Which colour ramp a roof is painted from. */
export type RoofHue = 'tan' | 'red' | 'blue' | 'slate' | 'moss' | 'copper';

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
  // bottom end. Every coastline and the whole Tide Hall puzzle depend on
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

  // Kin Clinic red. Loud on purpose: it is a landmark, not decoration.
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
  // --- The Central Road. -----------------------------------------------
  //
  // Three ramps and two accents, and they exist because the three materials
  // this country is made of are all things the palette could only fake before.
  // Wheat is not turf with the green taken out -- ripe grain is a saturated
  // gold that has to survive being seen beside a green field. Loam is not the
  // path ramp: a road is dry and dusty, freshly turned earth is dark and wet,
  // and a ploughed field drawn in road colours reads as a car park. Macadam is
  // the awkward one and the most important: every road in the game so far has
  // been a warm gold stripe worn into turf, and this one is engineered, so it
  // is duller, greyer and colder than any of them. That single reversal is
  // what tells the player the country changed.
  wheatDeep: '#6b5518',
  wheatDark: '#9a7f28',
  wheatMid: '#c6a840',
  wheatLight: '#e2c76a',
  wheatPale: '#f8e7a6',
  loamDeep: '#33261a',
  loamDark: '#4e3a27',
  loamMid: '#6d5238',
  loamLight: '#8d6f4d',
  loamPale: '#ac8f68',
  roadDeep: '#4f4636',
  roadDark: '#736750',
  roadMid: '#98896b',
  roadLight: '#bbac8b',
  roadPale: '#dccfae',
  // The rail head, and the only polished surface in Caelora. It is brighter
  // than anything else outdoors on purpose: a line that is in use has two
  // white threads running down it and a line that is not has none, and that is
  // the whole difference the player needs to read at a glance.
  railHead: '#e4ebf3',
  railRust: '#8a5732',

  contact: 'rgba(38,32,34,0.34)',
  contactSoft: 'rgba(38,32,34,0.15)',

  // Cast bronze, for the bells in the great tree. Warmer and darker than the
  // brass end of the wood ramp so a bell reads as metal hanging in leaf rather
  // than as a knot of the tree it hangs from.
  bronzeDeep: '#4a2f0c',
  bronzeDark: '#7d5518',
  bronzeMid: '#ac7d28',
  bronzeLight: '#d5a94a',
  bronzePale: '#f3d98d',

  // --- Emberfall. -----------------------------------------------------
  //
  // A city built on the heat under it: everything above ground is made of what
  // the ground gave it. Basalt is the only stone within a day of the place, so
  // the streets, the walls and the sills are all the same black rock, and the
  // ramp has to work as *ground* -- the house rule is that turf is light so a
  // sprite's outline can do the separating, and a black street breaks it. So
  // this is a warm charcoal rather than true black: dark enough that the town
  // reads as cut from lava, light enough that a character standing on it still
  // has a silhouette. The warmth is not decoration either -- basalt weathers
  // rusty where steam touches it, which is everywhere here.
  basaltDeep: '#241f22',
  basaltDark: '#3b3237',
  basaltMid: '#544850',
  basaltLight: '#6e6069',
  basaltPale: '#8b7b84',
  basaltRust: '#7a5240',

  // Copper, twenty years on a roof. The forges here are the region's, so roofs
  // and pipework are sheet copper rather than clay, and sheet copper goes green.
  // Against the basalt it is the one cool note in the town and it is what makes
  // the skyline legible from across the valley.
  //
  // Pulled down in chroma from where it started. At full saturation a row of
  // these roofs was the loudest thing on the map by a distance -- a street of
  // black rock with a neon green stripe ruled along the top of it -- and the
  // roof stopped reading as metal and started reading as paint. Weathered
  // copper is a *grey* with green in it, and it only looks green at all
  // because of what it is sitting next to.
  copperDeep: '#123c37',
  copperDark: '#1e5c51',
  copperMid: '#2f7a6a',
  copperLight: '#4a9a86',
  copperPale: '#78bda9',
  copperBright: '#c98a3e',

  // Fire, in every register it appears in here: down a fissure, in a forge
  // mouth, behind a lamp glass. One ramp, so a vent in the road and the lamp
  // above it are lit by the same thing -- which is the point of the town.
  emberDeep: '#5d1503',
  emberDark: '#a52f06',
  emberMid: '#e2600f',
  emberLight: '#ff8f28',
  emberPale: '#ffc264',
  emberWhite: '#fff0c2',

  // The springs. Mineral water, hot: pale, chalky and green-blue, with a
  // sinter rim where it has been depositing for centuries.
  springDeep: '#2f7d7a',
  springDark: '#46a29a',
  springMid: '#6ec2b7',
  springLight: '#9fdcd1',
  springPale: '#dcf3ec',
  sinter: '#cbbfa6',

  // The wetlands.
  //
  // Everything east of Emberfall is lit through leaf and standing water, and
  // the palette has to say so before a single reed is drawn. Peat is the base
  // material: a brown with green in it, because it is half rotted plant, and
  // dark enough that the boardwalk laid across it reads as a bright line. The
  // one rule the ramp obeys is that its lit end never climbs as high as the
  // turf ramp's -- a mire with a highlight as bright as a field in Briarbell
  // is a muddy field, not a mire, and the whole route depends on the ground
  // being the darkest thing on the screen so the lanterns can be the brightest.
  peatDeep: '#241d13',
  peatDark: '#3b3120',
  peatMid: '#54452c',
  peatLight: '#6d5b3b',
  peatPale: '#7c6947',

  // Standing water stained by tannin. Not blue: a mire pool is the colour of
  // strong tea over black, and the only blue in it is the scrap of sky it
  // catches, which is why the highlight is a step of near-white rather than a
  // ramp. Two body tones sit close together so a pool reads as flat and dead
  // still, which is the whole difference between marsh water and the sea.
  mireDeep: '#0c1510',
  mireDark: '#152214',
  mireMid: '#20321b',
  mireLight: '#2e4626',
  mireSky: '#68847f',
  mireGlint: '#a9c2ba',

  // Reeds and sedge. Olive rather than green, and greyer as they rise, so a
  // reed bed reads as last year's growth standing in this year's water. The
  // seed heads are the only warm thing out here in daylight.
  reedDeep: '#2c3a18',
  reedDark: '#425219',
  reedMid: '#5d6f24',
  reedLight: '#748234',
  reedPale: '#8d9750',
  reedHead: '#b09a63',

  // Bioluminescence. The one saturated colour in the wetlands, and the reason
  // the fog can be as thick as it is: a glowcap is a light source the player
  // can navigate by. Cold green-cyan so it cannot be mistaken for a lantern,
  // which is warm, and the two together are what make Mirehaven legible at
  // night -- people's light is orange, the mire's light is green.
  glowDeep: '#0d3a34',
  glowDark: '#12786a',
  glowMid: '#25c3a2',
  glowLight: '#71f0cb',
  glowPale: '#c8ffee',

  // Tarred plank. Mirehaven builds out of pine dipped in pitch, because
  // anything else standing in this water is gone in five years, so its houses
  // are near-black with a warm grey bloom where the sun has burned the tar.
  // Against the thatch above it the contrast is the town's whole silhouette.
  tarDeep: '#14120f',
  tarDark: '#231f1a',
  tarMid: '#332e26',
  tarLight: '#4a4235',
  tarPale: '#6d6250',

  // Weathered pine, for the boardwalk and everything built out of it. The
  // harbour decking at Tideglass is a cool blue-grey and would have done for
  // free, and it was wrong twice over: it is a *sea* material, and against
  // peat it read as pale brick. This is the same timber gone silver in the
  // wet, warm enough to stay wood and light enough that the walk is the
  // brightest line on a mire screen -- which is the whole job of the tile.
  plankDeep: '#33261a',
  plankDark: '#57432c',
  plankMid: '#7d6446',
  plankLight: '#a28461',
  plankPale: '#c6a985',

  // Reed thatch. Cut from the same beds the route walks through, so it is the
  // reed ramp gone grey and dry -- and it is the only bright mass in the town,
  // which is what stops a settlement built out of pitch reading as a ruin.
  thatchDeep: '#4a3c1e',
  thatchDark: '#6d5a2c',
  thatchMid: '#947c3f',
  thatchLight: '#b89b56',
  thatchPale: '#d8bd7d',

  // Embercoil Pass.
  //
  // The road between the coast and Emberfall, and the one place in the game
  // where the *ground* is the event. Three ramps, and each is here because the
  // basalt/copper/ember set the city is built from cannot carry open country.
  //
  // Ash first. It is the surface the player walks on for two thirds of the
  // route, so the house rule applies to it exactly as it applies to turf: it
  // has to be light enough that a sprite's outline separates from it. So this
  // is a pale warm grey with a lilac cast rather than the charcoal a fresh fall
  // actually is -- old ash, rained on, walked over, blown into drifts. It is
  // also deliberately *desaturated to nothing*, because it is the field the
  // lava has to read against, and every scrap of chroma in this route is
  // reserved for the fire.
  ashDeep: '#5b5158',
  ashDark: '#7d7279',
  ashMid: '#9d9299',
  ashLight: '#bdb2b7',
  ashPale: '#dcd3d6',

  // The road. Crushed clinker rather than gold dirt: the same warm brown-red
  // the basalt weathers to, one clear step darker than the ash it runs through,
  // so a road here is a dark line on a pale ground -- the exact opposite of
  // every other route in the game, and the quickest way to say "you are not in
  // the green country any more" without a word of text.
  cinderDeep: '#2d1a14',
  cinderDark: '#4a2c1f',
  cinderMid: '#68402c',
  cinderLight: '#87593c',
  cinderPale: '#a9764f',

  // What still grows here. Not green: heat-cured scrub is olive going to straw,
  // with black stems, and the seed heads are the only warm note. It sits below
  // the ash in value so a patch reads as something standing in the ash rather
  // than a stain on it, which is what makes it legible as the tile you get
  // jumped in.
  scrubDeep: '#2b2617',
  scrubDark: '#463d21',
  scrubMid: '#63552d',
  scrubLight: '#877340',
  scrubHead: '#c09a4c',
  scrubTip: '#e6c072',
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
  // The great tree's crown is thirteen cells wide and five deep, and sixty-five
  // copies of one cell is a lattice of identical clumps however good the cell
  // is -- the tile repeat was the only thing left in it that read as tiling.
  // Appended last, as the note above requires. The three alternates differ in
  // their foliage noise only: their outlines come from functions that do not
  // fold the variant seed, so any two of them still meet without a step.
  [T.GREAT_LEAF_C]: 3,
  [T.GREAT_LEAF_N]: 3,
  [T.GREAT_LEAF_S]: 3,
  // Emberfall's ground. Appended last, as the note above requires. Basalt is
  // laid as broken setts rather than sawn slabs -- there is no straight edge in
  // the material -- so a street of one cut reads as a chequerboard faster than
  // paving does.
  [T.BASALT]: 3,
  [T.BASALT_WALL]: 2,
  // The wetlands. Appended last, as the note above requires. Peat and reed are
  // the two the player sees most of by a wide margin -- a mire route is almost
  // entirely these two tiles -- so they get the widest sets in the game after
  // turf, or the fog reveals a lattice every time it thins.
  [T.MIRE_MUD]: 4,
  [T.REEDS]: 3,
  [T.SEDGE]: 3,
  [T.MIRE_WATER]: 2,
  [T.BOARDWALK]: 3,
  [T.MANGROVE]: 2,
  [T.ROOF_THATCH]: 3,
  [T.WALL_TAR]: 2,
  // Four marker posts. The mark painted on the board differs between them,
  // because a route signed with the same number eleven times over is worse
  // than a route signed nowhere at all.
  [T.MIRE_POST]: 4,
  [T.MIRE_DEEP]: 2,
  // The Aurelians. Appended last, as the note above requires. Their floor is
  // the one that most needs alternates and the one that can least afford to
  // look noisy: it is machined plate, so the variation has to be in which plate
  // was cut from which block, not in the texture of any one of them. The ash
  // drifted over it varies for the ordinary reason -- it is the only loose
  // material in the building.
  [T.AUR_FLOOR]: 3,
  [T.AUR_WALL]: 2,
  [T.AUR_ASH]: 3,
  // The lake in the descending coil is a hundred and fifty cells of one tile.
  // Wrapping noise means every one of them meets its neighbours, and also that
  // every one of them is the SAME -- from across the room the field prints a
  // grid of identical motifs, which is the one thing a sheet of live rock must
  // not do.
  [T.TEMPLE_MAGMA]: 3,
  // Embercoil Pass. Appended last, as the note above requires, and safe to
  // append for a second reason as well: every painter in this family draws from
  // position hashes and never touches the shared Rng, so no alternate anywhere
  // else in the world moves.
  //
  // Ash gets the widest set in the family because there is more of it than
  // anything else on the route by a factor of four, and a plain field of one
  // grey cut is where a repeat shows soonest -- there are no trees or buildings
  // out here to break the eye's lock on the grid.
  [T.ASH]: 4,
  [T.ASH_DRIFT]: 3,
  [T.CINDER_ROAD]: 3,
  [T.EMBER_SCRUB]: 3,
  [T.LAVA_CRUST]: 3,
  [T.BASALT_FACE]: 3,
  [T.BASALT_ROCK]: 2,
  // The flow gets alternates too, and for a reason the other tiles do not have.
  // Its cracks are drawn by banding on a noise contour, and that contour wraps
  // at the cell -- so without alternates every tile of a lava field carries the
  // identical seam in the identical place, and a river reads as one cell
  // stamped out forty times. The variant seed folds into the noise, so three
  // cuts is three different sets of plates.
  [T.LAVA]: 3,
  // Aureline. Appended last, as the note above requires, and safe to append for
  // the second reason as well: every painter in the capital's family draws from
  // position hashes and never touches the shared Rng.
  //
  // The paving gets the widest set in the city because there is more of it than
  // everything else put together -- a capital is mostly the ground between the
  // buildings -- and a square four hundred cells across laid from one cut is
  // where a repeat shows soonest. The curtain wall gets alternates for a
  // different reason: a tower is one tile stacked ten high beside another tower
  // that is the same tile stacked ten high, and without variation the whole
  // skyline is one window printed six hundred times. What varies is which panes
  // have the blinds down, which is the only thing that varies on a real one.
  [T.CITY_PAVE]: 4,
  [T.CITY_ROAD]: 3,
  [T.CITY_COBBLE]: 3,
  [T.PARK_PATH]: 3,
  [T.GLASS_WALL]: 4,
  [T.GRANITE_WALL]: 3,
  [T.GRANITE_WINDOW]: 2,
  [T.SHOPFRONT]: 3,
  [T.HEDGE]: 2,
  [T.MER_GLASS]: 3,
  [T.FOUNTAIN]: 3,
  // The Central Road. Appended last, as the note above requires, and safe for
  // the second reason as well: every painter in this family draws from
  // position hashes and never touches the shared Rng.
  //
  // The crop and the plough get the widest sets in the family because a field
  // is the largest single-tile shape in the game -- forty by twelve of one
  // cell -- and a repeat shows in an arable field faster than anywhere else,
  // since there is nothing growing out there to break the eye's lock on the
  // grid. The road gets three because the player walks the length of it twice.
  [T.WHEAT]: 4,
  [T.FURROW]: 4,
  [T.HIGHROAD]: 3,
  [T.HEDGEROW]: 3,
  [T.EMBANKMENT]: 2,
  [T.HALT_DECK]: 2,
  // Four stones, four different distances cut into them. A road signed with
  // the identical mark nine times over is worse than a road signed nowhere.
  [T.MILESTONE]: 4,
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
  // The bells swing. Four frames -- middle, out, middle, back -- so the loop is
  // a pendulum rather than a twitch, and the clapper lags the shell by a frame
  // the way a real one does. Safe to append: frames are allocated and painted
  // last of all, after every base cell and every alternate.
  [T.GREAT_BELL]: 4,
  // Emberfall breathes. A vent in the road, a forge mouth and a spring are all
  // the same fire seen through different amounts of rock and water, so they
  // share a clock: the whole town pulses together, which is what sells the idea
  // that one thing underneath is doing it. Safe to append -- frames are
  // allocated and painted last of all, after every base cell and alternate.
  [T.VENT]: 4,
  [T.FORGE]: 4,
  [T.SPRING]: 4,
  // The wetlands breathe on a slower clock than the sea does, and that is the
  // point of animating them at all: marsh water barely moves, so four frames of
  // a single drifting scum ring is the difference between "stagnant" and
  // "painted". The glowcaps pulse on the same clock, which is what ties the
  // light in the fog to the water it is standing in.
  [T.MIRE_WATER]: 4,
  [T.MIRE_DEEP]: 4,
  [T.GLOWCAP]: 4,
  // The Aurelians. A living conduit is a current, so it has to be seen moving
  // or the whole idea of the place -- power running through the floor from the
  // rings to the shaft -- is a caption rather than a picture. Four frames of a
  // pulse travelling one tile length, which loops seamlessly because the pulse
  // that leaves the right edge is the one entering the left. The magma shares
  // the clock, so the shaft and the grooves round it breathe together.
  [T.AUR_VEIN_LIT]: 4,
  [T.TEMPLE_MAGMA]: 4,
  // Embercoil Pass. Lava is the only thing on the route that must move -- a
  // still lava flow is an orange carpet and reads as decoration, and the whole
  // argument of the map is that the ground is dangerous. The crust it cools
  // into breathes on the same clock through its cracks, and so do the vents and
  // the springs, so the entire route pulses as one system: it is all the same
  // fire, seen through different amounts of rock and water.
  [T.LAVA]: 4,
  [T.FUMAROLE]: 4,
  [T.SPRING_SHALLOW]: 4,
  [T.SPRING_DEEP]: 4,
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

/**
 * A wobble that repeats exactly every tile.
 *
 * Used for the outline of anything drawn across several cells of the same
 * tile -- the crown and the trunk of the great tree. Both harmonics have a
 * whole number of periods inside TILE_SIZE, so the profile meets itself at the
 * seam and a five-cell-tall edge has no step in it.
 */
function wave(t: number, a: number, b: number, p1: number, p2: number): number {
  const u = (t / TILE_SIZE) * Math.PI * 2;
  return Math.sin(u + p1) * a + Math.sin(u * 2 + p2) * b;
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
      case T.GREAT_LEAF_NW: this.greatLeaf(px, 0); break;
      case T.GREAT_LEAF_N: this.greatLeaf(px, 1); break;
      case T.GREAT_LEAF_NE: this.greatLeaf(px, 2); break;
      case T.GREAT_LEAF_W: this.greatLeaf(px, 3); break;
      case T.GREAT_LEAF_C: this.greatLeaf(px, 4); break;
      case T.GREAT_LEAF_E: this.greatLeaf(px, 5); break;
      case T.GREAT_LEAF_SW: this.greatLeaf(px, 6); break;
      case T.GREAT_LEAF_S: this.greatLeaf(px, 7); break;
      case T.GREAT_LEAF_SE: this.greatLeaf(px, 8); break;
      case T.GREAT_BOLE_L: this.greatLeaf(px, 7, -1); break;
      case T.GREAT_BOLE_C: this.greatLeaf(px, 7, 0); break;
      case T.GREAT_BOLE_R: this.greatLeaf(px, 7, 1); break;
      case T.GREAT_BELL: this.greatBell(px); break;
      case T.GREAT_TRUNK_L: this.greatTrunk(px, -1); break;
      case T.GREAT_TRUNK_C: this.greatTrunk(px, 0); break;
      case T.GREAT_TRUNK_R: this.greatTrunk(px, 1); break;
      case T.GREAT_ROOT_L: this.greatRoot(px, -1); break;
      case T.GREAT_ROOT_C: this.greatRoot(px, 0); break;
      case T.GREAT_ROOT_R: this.greatRoot(px, 1); break;
      case T.BASALT: this.basalt(px, fill, rng, 'ground'); break;
      case T.BASALT_WALL: this.basalt(px, fill, rng, 'wall'); break;
      case T.BASALT_WINDOW: this.basalt(px, fill, rng, 'window'); break;
      case T.ROOF_COPPER_L: this.shingleRoof(px, fill, 'left', 'copper'); break;
      case T.ROOF_COPPER: this.shingleRoof(px, fill, 'mid', 'copper'); break;
      case T.ROOF_COPPER_R: this.shingleRoof(px, fill, 'right', 'copper'); break;
      case T.SPRING: this.spring(px, fill); break;
      // A vent and a forge mouth are both ground tiles, so both lay their own
      // rock down first. They could have been overlays -- they are transparent
      // outside the opening -- but an overlay on the row a character is standing
      // on is drawn *after* them, and a crack in the road that paints over your
      // boots reads as a crack you are standing behind.
      case T.VENT: this.basalt(px, fill, rng, 'ground'); this.vent(px); break;
      case T.FORGE: this.basalt(px, fill, rng, 'wall'); this.forge(px); break;
      case T.PIPE_H: this.pipe(px, 'h'); break;
      case T.PIPE_V: this.pipe(px, 'v'); break;
      case T.PIPE_RISER: this.pipe(px, 'riser'); break;
      case T.LAMP_EMBER: this.emberLamp(px); break;
      case T.BASALT_DOOR: this.basalt(px, fill, rng, 'wall'); this.basaltDoor(px); break;
      case T.SEALED_GATE: this.sealedGate(px, fill); break;
      case T.SIGN_EMBER: this.emberSign(px); break;
      case T.MIRE_MUD: this.peat(px, fill, rng); break;
      case T.MIRE_WATER: this.mireWater(px, fill, rng, false); break;
      case T.MIRE_DEEP: this.mireWater(px, fill, rng, true); break;
      case T.REEDS: this.reeds(px, fill, rng); break;
      case T.SEDGE: this.sedge(px, fill, rng); break;
      case T.BOARDWALK: this.boardwalk(px, fill, rng); break;
      case T.BOARD_RAIL: this.boardRail(px); break;
      case T.MANGROVE: this.mangrove(px, fill, rng); break;
      case T.GLOWCAP: this.glowcap(px, fill, rng); break;
      case T.STILT_POST: this.stiltPost(px, fill, rng); break;
      case T.MOORED_BOAT: this.mooredBoat(px, fill, rng); break;
      case T.LAMP_MIRE: this.mireLantern(px); break;
      case T.ROOF_THATCH_L: this.thatchRoof(px, fill, 'left'); break;
      case T.ROOF_THATCH: this.thatchRoof(px, fill, 'mid'); break;
      case T.ROOF_THATCH_R: this.thatchRoof(px, fill, 'right'); break;
      case T.WALL_TAR: this.tarWall(px, fill, 'plain'); break;
      case T.WALL_TAR_WINDOW: this.tarWall(px, fill, 'window'); break;
      case T.WALL_TAR_PLANT: this.tarWall(px, fill, 'plant'); break;
      case T.DOOR_TAR: this.tarWall(px, fill, 'door'); break;
      case T.MIRE_POST: this.mirePost(px); break;
      case T.AUR_WALL: this.aurWall(px, fill); break;
      case T.AUR_FLOOR: this.aurFloor(px, fill, false); break;
      case T.AUR_GLYPH: this.aurFloor(px, fill, true); break;
      case T.AUR_VEIN: this.aurVein(px, fill, false); break;
      case T.AUR_VEIN_LIT: this.aurVein(px, fill, true); break;
      case T.AUR_RING: this.aurRing(px); break;
      case T.AUR_ASH: this.aurAsh(px, fill, rng); break;
      case T.AUR_SEAT: this.aurSeat(px); break;
      case T.TEMPLE_MAGMA: this.magma(px, fill); break;
      // --- Embercoil Pass. None of these is passed `rng`, on purpose: see the
      // note on the enum entries. They draw from position hashes only.
      case T.ASH: this.ash(px, fill, 0); break;
      case T.ASH_DRIFT: this.ash(px, fill, 1); break;
      case T.CINDER_ROAD: this.cinderRoad(px, fill); break;
      case T.EMBER_SCRUB: this.emberScrub(px, fill); break;
      case T.LAVA: this.lava(px, fill); break;
      case T.LAVA_CRUST: this.lavaCrust(px, fill); break;
      case T.FUMAROLE: this.fumarole(px, fill); break;
      case T.CHAR_SNAG: this.charSnag(px, fill); break;
      case T.BASALT_ROCK: this.basaltRock(px, fill, false); break;
      case T.BASALT_CRAG: this.basaltRock(px, fill, true); break;
      case T.BASALT_FACE: this.basaltCliff(px, fill, false); break;
      case T.BASALT_TOP: this.basaltCliff(px, fill, true); break;
      case T.ASH_LEDGE: this.ashLedge(px, fill); break;
      case T.SPRING_SHALLOW: this.mineralPool(px, fill, false); break;
      case T.SPRING_DEEP: this.mineralPool(px, fill, true); break;
      case T.MESH_FENCE_H: this.meshFence(px, fill, true); break;
      case T.MESH_FENCE_V: this.meshFence(px, fill, false); break;
      case T.SURVEY_MAST: this.surveyMast(px); break;
      case T.GENERATOR: this.generator(px); break;
      case T.SPOIL_HEAP: this.spoilHeap(px); break;
      case T.CRATE_STACK: this.crateStack(px); break;
      case T.VENT_MOUTH: this.ventMouth(px, fill); break;

      // Aureline.
      case T.CITY_PAVE: this.cityPave(px, fill); break;
      case T.CITY_ROAD: this.cityRoad(px, fill); break;
      case T.CITY_COBBLE: this.cityCobble(px, fill); break;
      case T.PARK_PATH: this.parkPath(px, fill); break;
      case T.GLASS_WALL: this.glassWall(px, fill); break;
      case T.TOWER_PIER: this.towerPier(px, fill); break;
      case T.TOWER_CAP_L: this.towerCap(px, fill, 'left'); break;
      case T.TOWER_CAP: this.towerCap(px, fill, 'mid'); break;
      case T.TOWER_CAP_R: this.towerCap(px, fill, 'right'); break;
      case T.TOWER_PLINTH: this.towerPlinth(px, fill, false); break;
      case T.TOWER_DOOR: this.towerPlinth(px, fill, true); break;
      case T.SHOPFRONT: this.shopfront(px, fill); break;
      case T.AWNING: this.awning(px, fill); break;
      case T.GRANITE_WALL: this.granite(px, fill, 'plain'); break;
      case T.GRANITE_WINDOW: this.granite(px, fill, 'window'); break;
      case T.GRANITE_ARCH: this.granite(px, fill, 'arch'); break;
      case T.MER_WALL: this.meridianWall(px, fill, 'plain'); break;
      case T.MER_GLASS: this.meridianWall(px, fill, 'glass'); break;
      case T.MER_CREST: this.meridianWall(px, fill, 'crest'); break;
      case T.MER_DOOR: this.meridianWall(px, fill, 'door'); break;
      case T.SHED_ROOF: this.shedRoof(px, fill, false); break;
      case T.SHED_TRUSS: this.shedRoof(px, fill, true); break;
      case T.CITY_LAMP: this.cityLamp(px); break;
      case T.STREET_TREE: this.streetTree(px); break;
      case T.BENCH: this.bench(px); break;
      case T.RAILING: this.railing(px); break;
      case T.HEDGE: this.hedge(px); break;
      case T.STATUE: this.statue(px); break;
      case T.FOUNTAIN: this.fountain(px, fill); break;
      // --- The Central Road. None of these is passed `rng`, on purpose: see
      // the note on the enum entries. They draw from position hashes only.
      case T.HIGHROAD: this.highroad(px, fill); break;
      case T.FURROW: this.furrow(px, fill); break;
      case T.WHEAT: this.wheat(px, fill); break;
      case T.HEDGEROW: this.hedgerow(px, fill); break;
      case T.STOOK: this.stook(px); break;
      case T.MILESTONE: this.milestone(px); break;
      case T.TELEGRAPH: this.telegraph(px); break;
      case T.EMBANKMENT: this.embankment(px, fill); break;
      case T.TRACK_H: this.track(px, fill, 'h'); break;
      case T.TRACK_V: this.track(px, fill, 'v'); break;
      case T.TRACK_NE: this.trackTurn(px, fill, 16, 0); break;
      case T.TRACK_NW: this.trackTurn(px, fill, 0, 0); break;
      case T.TRACK_SE: this.trackTurn(px, fill, 16, 16); break;
      case T.TRACK_SW: this.trackTurn(px, fill, 0, 16); break;
      case T.TRACK_CROSSING: this.trackCrossing(px, fill, 'h'); break;
      case T.TRACK_CROSSING_V: this.trackCrossing(px, fill, 'v'); break;
      case T.TRACK_SIGNAL: this.trackSignal(px); break;
      case T.HALT_DECK: this.haltDeck(px, fill, false); break;
      case T.HALT_EDGE: this.haltDeck(px, fill, true); break;

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
   * whole Tide Hall puzzle depend on reading "walkable" or "wall" from
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

  /* ------------------------------------------------- the great bell tree */

  /**
   * One cell of the crown of the great tree, as a nine-slice.
   *
   * `slice` is the cell's place in a 3x3: 0 is the north-west corner, 4 the
   * interior, 8 the south-east. A cell only cuts away the sides it is actually
   * on the edge of, so the interior is a full square of foliage and the ring
   * around it carries the silhouette.
   *
   * The edges are drawn from functions that are *periodic over the tile*, which
   * is the property the whole thing hangs on: the west edge of a crown five
   * cells tall is the same tile five times, so a profile that did not meet
   * itself at the seam would print a step straight across the outline.
   *
   * Foliage comes from three lobes measured with a wrapped delta, so a block of
   * interior cells is a mass of clumps with lit tops and shaded undersides
   * rather than one flat green -- the difference between a canopy and cladding.
   * Over the top of that sits one dome of light spanning the whole crown, taken
   * from where the cell stands in the nine-slice.
   *
   * `bole`, when given, is the cell where the trunk comes up through the
   * underside: -1, 0 and 1 for its left, middle and right columns.
   */
  private greatLeaf(px: Px, slice: number, bole?: number): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    // One species for the whole crown. `this.leaf()` picks its ramp from the
    // variant seed, which is right for a wood of separate trees and wrong for
    // one tree: the alternates here exist to break the tile repeat, and taking
    // the ramp with them would put three different greens in a single canopy.
    const r0 = CANOPY[0]!;
    const R: Leaf = { deep: r0[0]!, dark: r0[1]!, mid: r0[2]!, light: r0[3]!, hi: r0[4]!, tip: r0[5]! };
    const col = slice % 3;
    const row = (slice / 3) | 0;
    const cutL = col === 0, cutR = col === 2, cutT = row === 0, cutB = row === 2;

    const edgeL = (y: number) => 2.4 + wave(y, 1.9, 1.0, 0.4, 1.1);
    const edgeR = (y: number) => S - 3.4 - wave(y, 1.9, 1.0, 2.3, 0.4);
    const edgeT = (x: number) => 2.2 + wave(x, 1.6, 1.1, 0.7, 2.0);
    /**
     * The underside hangs, and hangs unevenly.
     *
     * It used to stop three units short of the foot of the cell with a gentle
     * wobble on it, and thirteen copies of a gentle wobble in a row is a
     * straight line: the crown read as the flat top of a hedge, and the bells
     * on the row below hung from nothing with daylight between. This reaches
     * past the foot of the cell at its low points and pulls up five units at
     * its high ones, so leaf comes down into the row the bells hang in.
     */
    const edgeB = (x: number) => S - 1.4 - wave(x, 2.7, 1.7, 1.9, 2.2);

    // Five clumps, deliberately not on a lattice. Three of them sat on a
    // diagonal and sixty-five copies of a diagonal is corduroy: the crown came
    // out as green roof shingles laid at forty-five degrees.
    const LOBES = [
      [3.5, 3.0, 5.2], [10.0, 5.5, 5.6], [6.0, 10.5, 5.4],
      [13.0, 12.5, 5.0], [1.5, 13.5, 4.8],
    ];
    const wrap = (d: number): number => ((d + S * 1.5) % S) - S / 2;

    // Where this cell sits in the crown, so all thirteen columns of it carry
    // one light rather than each looking lit from its own corner.
    const dome = -(col - 1) * 0.26 - (row - 1) * 0.30;

    /** How far inside the crown a pixel is, in units. Negative is outside. */
    const depth = (x: number, y: number): number => {
      let out = 99;
      if (cutL) out = Math.min(out, x - edgeL(y));
      if (cutR) out = Math.min(out, edgeR(y) - x);
      if (cutT) out = Math.min(out, y - edgeT(x));
      if (cutB) out = Math.min(out, edgeB(x) - y);
      // Corner cells lose their square corner to a wobbled chamfer, or the
      // crown comes out as a rectangle with four bites taken out of it.
      if (cutL && cutT) out = Math.min(out, x + y - (7.6 + wave(x - y, 0.8, 0.5, 1.3, 0.2)));
      if (cutR && cutT) out = Math.min(out, S - 1 - x + y - (7.6 + wave(x + y, 0.8, 0.5, 0.3, 1.2)));
      if (cutL && cutB) out = Math.min(out, x + S - 1 - y - (7.0 + wave(x + y, 0.7, 0.5, 2.1, 0.6)));
      if (cutR && cutB) out = Math.min(out, 2 * S - 2 - x - y - (7.0 + wave(x - y, 0.7, 0.5, 1.7, 2.4)));
      return out;
    };

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const d = depth(x, y);
        if (d < 0) {
          // Turf just outside the crown is turf in shadow. Translucent, so it
          // darkens whatever the map put down rather than stamping one green.
          if (d > -2.4) P(x, y, 'rgba(20,40,18,0.30)');
          continue;
        }
        let near = LOBES[0]!, t = 9;
        for (const L of LOBES) {
          const q = Math.hypot(wrap(x - L[0]!), wrap(y - L[1]!)) / L[2]!;
          if (q < t) { t = q; near = L; }
        }
        const ldx = wrap(x - near[0]!), ldy = wrap(y - near[1]!);
        // Two scales of wrapping noise over the lobes. The lobes alone put the
        // same three clumps in every one of sixty-five cells, and sixty-five
        // copies of three clumps is corduroy -- the crown came out as diagonal
        // ridges of cladding. The noise breaks the repeat and, at the low end,
        // opens dark hollows where boughs would part.
        const lit = dome
          + (-(x - 7.5) * 0.5 - (y - 7.5)) / S * 0.36
          + ((-ldx * 0.8 - ldy) / (near[2]! * 1.7)) * 0.45
          - Math.max(0, t - 0.70) * 0.6
          + (wrapNoise(x * DETAIL, y * DETAIL, 8, 51) - 0.5) * 0.62
          + (wrapNoise(x * DETAIL, y * DETAIL, 4, 53) - 0.5) * 0.34
          + (hash2(x >> 1, y >> 1, 131) - 0.5) * 0.24;
        let c: string;
        if (d < 1.1) c = R.deep;
        else if (d < 2.1) c = lit > 0.40 ? R.mid : lit > 0.05 ? R.dark : R.deep;
        else if (lit > 0.60) c = R.tip;
        else if (lit > 0.32) c = R.hi;
        else if (lit > 0.04) c = R.light;
        else if (lit > -0.28) c = R.mid;
        else if (lit > -0.62) c = R.dark;
        else c = R.deep;
        P(x, y, c);
      }
    }

    if (bole !== undefined) this.greatBole(P, bole);
  }

  /** The trunk coming up out of the underside of the crown. */
  private greatBole(P: Px, side: number): void {
    const S = TILE_SIZE;
    const R = this.leaf();
    for (let y = 3; y < S; y++) {
      const spread = (y - 3) * 0.58;
      const lo = side < 0 ? 8.4 - spread : 0;
      const hi = side > 0 ? 7.6 + spread : S - 1;
      for (let x = Math.max(0, Math.ceil(lo)); x <= Math.min(S - 1, Math.floor(hi)); x++) {
        // A ragged top, so the bark rises out of the leaf rather than being
        // pasted over it on a straight line. Two units of raggedness, not four:
        // four gave the trunk a row of teeth where it met the crown.
        if (y < 5 + Math.floor(hash2(x >> 1, 1, 271) * 2)) continue;
        const edge = Math.min(x - lo, hi - x);
        const band = hash2((side * S + x) >> 1, 0, 613);
        const step = band > 0.68 ? 0.18 : band < 0.34 ? -0.14 : 0;
        const lit = -side * 0.42 + (7.5 - x) / S * 0.55 + step;
        let c: string = lit > 0.34 ? PAL.trunkLit
          : lit > 0.08 ? PAL.trunkLight
          : lit > -0.18 ? PAL.trunkMid : PAL.trunkDark;
        if (edge < 1) c = PAL.trunkDeep;
        P(x, y, c);
      }
    }
    // Leaf hanging over the shoulders of the bole, so the join is foliage and
    // not a seam.
    for (let i = 0; i < 30; i++) {
      const lx = Math.floor(hash2(i, 3, 811) * S);
      const ly = 3 + Math.floor(hash2(i, 7, 823) * 5);
      P(lx, ly, hash2(i, 11, 829) > 0.5 ? R.dark : R.mid);
      P(lx, ly + 1, R.deep);
    }
  }

  /**
   * One cell of the trunk. -1, 0 and 1 are its left, middle and right columns.
   *
   * The light runs across all three cells rather than resetting inside each,
   * which is what makes forty-eight pixels of bark read as one round trunk
   * instead of three planks standing side by side.
   */
  private greatTrunk(px: Px, side: number): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let y = 0; y < S; y++) {
      const lo = side < 0 ? 1.2 + wave(y, 0.6, 0.35, 0.9, 2.2) : 0;
      const hi = side > 0 ? S - 2.2 - wave(y, 0.6, 0.35, 2.7, 1.4) : S - 1;
      for (let x = Math.max(0, Math.ceil(lo)); x <= Math.min(S - 1, Math.floor(hi)); x++) {
        const gx = side * S + x;
        /**
         * Bark, as vertical grain rather than as speckle.
         *
         * The ridges belong to a *column* of the trunk and run its whole
         * height; hashing per pixel gave the middle cell a rash of light chips
         * that read as gravel glued to a post. One value per two-unit column,
         * plus occasional short fissures four units long.
         */
        const band = hash2(gx >> 1, 0, 613);
        let step = band > 0.68 ? 0.5 : band < 0.34 ? -0.4 : 0;
        if (hash2(gx, y >> 2, 641) > 0.86) step = -1.1;
        const lit = -((gx - 8) / 24) * 0.85 + 0.10 + step * 0.35;
        let c: string = lit > 0.72 ? PAL.trunkLit
          : lit > 0.34 ? PAL.trunkLight
          : lit > -0.06 ? PAL.trunkMid
          : lit > -0.44 ? PAL.trunkDark : PAL.trunkDeep;
        // Moss up the shaded flank, because the thing is a thousand years old.
        if (side > 0 && x > 9 && hash2(x, y, 401) > 0.82) c = PAL.mossDark;
        if (side < 0 && x < 5 && hash2(x, y, 409) > 0.90) c = PAL.mossDeep;
        // The silhouette, and only where there is one: the middle cell has no
        // outside edge, and outlining it drew a dark seam down both sides of
        // the trunk, which is what made forty-eight pixels of bark read as
        // three planks stood side by side.
        if (side < 0 && x - lo < 1) c = PAL.trunkDeep;
        if (side > 0 && hi - x < 1) c = PAL.trunkDeep;
        P(x, y, c);
      }
    }
  }

  /** The root flare. -1 and 1 are the roots that run out onto the turf. */
  private greatRoot(px: Px, side: number): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    const bark = (x: number, y: number, lit: number, edge: boolean): void => {
      let c: string = lit > 0.5 ? PAL.trunkLight
        : lit > 0.1 ? PAL.trunkMid
        : lit > -0.3 ? PAL.trunkDark : PAL.trunkDeep;
      if (hash2(x, y, 617) > 0.76) c = mixDown(c);
      if (edge) c = PAL.trunkDeep;
      P(x, y, c);
    };

    if (side === 0) {
      for (let x = 0; x < S; x++) {
        // Buttresses: the foot of the trunk is scalloped, not cut off square.
        const base = 10.5 + Math.abs(Math.sin((x / S) * Math.PI * 3 + 0.6)) * 3.4;
        for (let y = 0; y <= base; y++) {
          bark(x, y, (7.5 - x) / S * 1.1 + 0.15, y > base - 1.2);
        }
        for (let y = Math.ceil(base); y < S; y++) P(x, y, 'rgba(20,32,18,0.26)');
      }
      return;
    }

    // A single root running out of the flare and dying away into the turf.
    for (let x = 0; x < S; x++) {
      const t = side < 0 ? x / (S - 1) : (S - 1 - x) / (S - 1);
      const cy = 4.5 + (1 - t) * 7.5;
      const th = 0.4 + Math.pow(t, 0.7) * 3.6;
      for (let y = Math.round(cy - th); y <= Math.round(cy + th); y++) {
        if (y < 0 || y >= S) continue;
        const e = Math.min(y - (cy - th), cy + th - y);
        bark(x, y, (cy - y) / Math.max(1, th) * 0.6 + 0.1, e < 0.9);
      }
      for (let y = Math.round(cy + th) + 1; y <= Math.round(cy + th) + 3; y++) {
        if (y < S) P(x, y, 'rgba(20,32,18,0.24)');
      }
    }
  }

  /**
   * A bell hanging on its cord under the boughs.
   *
   * Four frames: middle, out, middle, back. The clapper is given its own
   * offsets a frame out of step with the shell, because a bell whose clapper
   * moves with it is a lamp.
   */
  private greatBell(px: Px): void {
    const P = this.unit(px);
    const swing = [0, -1.5, 0, 1.5][animFrame % 4]!;
    const clap = [0, -2.6, 0.5, 2.6][animFrame % 4]!;

    // The cord runs from the very top of the cell so it meets the leaf hanging
    // out of the cell above; a bell with a gap over it is a bell on a pole.
    for (let y = 0; y < 3; y++) {
      const cx = 8 + Math.round(swing * (y / 3) * 0.5);
      P(cx - 1, y, PAL.trunkDeep);
      P(cx, y, PAL.woodDark);
    }
    // The yoke, so the thing is hung rather than balanced.
    const yx = 8 + Math.round(swing * 0.25);
    for (let x = yx - 2; x <= yx + 1; x++) P(x, 3, PAL.bronzeDark);
    P(yx - 1, 2, PAL.bronzeMid);

    /**
     * The shell.
     *
     * Straight-ish shoulders, a hard flare into the lip, and an outline the
     * whole way round. The first cut of this was a smooth quadratic taper with
     * no rim on it, which at sixteen units reads as a traffic cone -- what says
     * "bell" at this size is the sudden widening at the bottom and the dark
     * band of the mouth under it, not the curve above.
     */
    for (let y = 4; y <= 13; y++) {
      const t = (y - 4) / 9;
      // Wide shoulders, not a spire. At sixteen units a shell that starts
      // narrow and only flares at the lip reads as a little pine tree hanging
      // in a big one; the mass has to be there from the top.
      const half = y >= 12 ? 5.6 : 2.4 + t * t * 2.6;
      const cx = 8 + swing * (0.3 + t * 0.8);
      const lo = Math.round(cx - half), hi = Math.round(cx + half);
      for (let x = lo; x <= hi; x++) {
        const lit = (cx - x) / half;
        let c: string = lit > 0.5 ? PAL.bronzePale
          : lit > 0.12 ? PAL.bronzeLight
          : lit > -0.4 ? PAL.bronzeMid : PAL.bronzeDark;
        // A single vertical highlight, the way cast metal catches a sky.
        if (Math.abs(cx - 1.6 - x) < 0.7 && y < 11) c = PAL.bronzePale;
        if (y === 11) c = PAL.bronzeDark;        // the moulding above the lip
        if (y >= 12) c = y === 13 ? PAL.bronzeDeep : PAL.bronzeDark;
        if (x === lo || x === hi) c = PAL.bronzeDeep;
        P(x, y, c);
        if (y === 4) P(x, 3, PAL.bronzeDeep);   // top edge, drawn over the yoke
      }
    }
    // Clapper, swinging a frame behind the shell, and its shadow inside the
    // mouth so the bell reads as hollow.
    const clx = 8 + Math.round(clap);
    P(clx - 1, 14, PAL.bronzeDeep);
    P(clx, 14, PAL.bronzeDark);
    P(clx, 15, PAL.bronzeDeep);
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
   * any size and any shape -- the vertical wall down the side of Hearthmere,
   * the horizontal shelf above Stonewake -- has no seam in it anywhere.
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
    // Emberfall's roofs are sheet copper, and old sheet copper is darker and
    // bluer than the moss ramp above -- which is a *shutter* green, chosen to
    // sit beside foliage. This one has to sit on black rock under an orange
    // sky, so it is pushed deeper and cooler: the town's only cold colour.
    if (hue === 'copper') {
      return [PAL.copperDeep, PAL.copperDark, PAL.copperMid, PAL.copperLight, PAL.copperPale];
    }
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
   * this tile is how a player finds the Kin Clinic.
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
   * A white disc carrying one bold glyph: a cross for the Kin Clinic, a crate
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
   * Kin Clinic floor: pale tiles, laid square.
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
    // clinic than anything else in the room. The chroma all goes into the
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

  /* ----------------------------------------------------------- Emberfall */

  /**
   * Basalt: the street, the wall and the window of one city.
   *
   * Three cuts of the same rock rather than three tiles, because that is
   * literally true of the place -- Emberfall is built out of the flow it stands
   * on, and the mason who paved the street faced the house behind it out of the
   * same quarry the same week.
   *
   * The one thing that had to be got right is that basalt is *columnar*: it
   * cools into five- and six-sided prisms, so the joints run at angles and
   * never line up into courses. Laying it like the stone floor tile -- offset
   * brick courses -- is what made the first version read as a grey pavement
   * somebody had turned the brightness down on. Here the setts come from
   * hashing a coarse lattice with a per-row skew, so no two joints agree, and
   * that irregularity is doing all the work of saying "this is not cut stone,
   * it is broken rock".
   */
  private basalt(
    px: Px, fill: (c: string) => void, rng: Rng,
    kind: 'ground' | 'wall' | 'window',
  ): void {
    fill(PAL.basaltMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      // The skew is what breaks the courses. It has to wrap over the cell or
      // every tile shows the same diagonal and the street reads as corduroy.
      const skew = Math.round(Math.sin((y / S) * Math.PI * 2) * 2);
      for (let x = 0; x < S; x++) {
        const cx = Math.floor((x + skew) / 5);
        const cy = Math.floor(y / 4);
        const n = hash2(cx, cy, 617);
        let c: string = n > 0.72 ? PAL.basaltLight : n < 0.3 ? PAL.basaltDark : PAL.basaltMid;
        // Vesicles: basalt cools full of gas bubbles, and a fine speckle of
        // them is the difference between rock and a flat swatch.
        if ((x * 7 + y * 5) % 13 === 3) c = PAL.basaltDeep;
        else if ((x * 3 + y * 11) % 17 === 5) c = PAL.basaltPale;
        // Joints, drawn one step down rather than in the deepest tone: a black
        // grid over a black street leaves nothing for a sprite to stand out
        // against.
        if ((x + skew) % 5 === 0 || y % 4 === 3) c = PAL.basaltDark;
        P(x, y, c);
      }
    }

    if (kind === 'ground') {
      // Rust where the steam gets at it, and it gets at everything here. Two
      // small stains rather than an even wash, so a street has weather in it.
      for (let i = 0; i < 3; i++) {
        const sx = rng.below(S - 2), sy = rng.below(S - 2);
        P(sx, sy, PAL.basaltRust);
        P(sx + 1, sy, PAL.basaltRust);
        P(sx, sy + 1, mixDown(PAL.basaltRust));
      }
      return;
    }

    // A wall is the same rock, but *coursed* -- squared off and laid by a mason
    // rather than a road gang -- with a copper drip course along the head. The
    // copper is what ties a building to its roof and is the only reason a black
    // wall under a green roof does not look like two unrelated objects.
    for (let x = 0; x < S; x++) {
      P(x, 0, PAL.copperDark);
      P(x, 1, x % 3 === 0 ? PAL.copperLight : PAL.copperMid);
      P(x, 2, PAL.copperDeep);
      P(x, 15, PAL.basaltDeep);
    }

    if (kind === 'window') {
      // Lit from inside. Emberfall's windows are small and deep because the
      // walls are thick, and every one of them is orange after dark -- the town
      // has no other light source and never has had.
      //
      // Small, and deliberately so. A window that fills two thirds of its cell
      // turns a terrace into a ribbon of lit boxes with no wall left between
      // them, which is what the first Emberfall street came out as: the eye
      // reads the orange as the building and the black as the gap. Four units
      // of rock on each side is what puts the wall back.
      for (let y = 5; y <= 11; y++) {
        for (let x = 4; x <= 11; x++) {
          const edge = x === 4 || x === 11 || y === 5 || y === 11;
          P(x, y, edge ? PAL.basaltDeep : y <= 7 ? PAL.emberLight : PAL.emberMid);
        }
      }
      // Reveal: the sill catches the light and the head throws a shadow, which
      // is what makes the opening read as cut through something thick.
      for (let x = 4; x <= 11; x++) { P(x, 12, PAL.basaltPale); P(x, 6, PAL.emberPale); }
      for (let y = 6; y <= 11; y++) P(7, y, PAL.basaltDeep);   // glazing bar
      for (let x = 5; x <= 10; x++) P(x, 9, PAL.basaltDeep);
    }
  }

  /**
   * A hot spring, seen from above.
   *
   * The whole city is here because of these, so they cannot read as ordinary
   * water with a filter on it. Three things separate them: the colour is
   * mineral rather than marine -- chalky green-blue, opaque, nothing visible
   * under the surface; the rim is *sinter*, the pale crust the water lays down
   * as it cools, which no other water in the game has; and the movement is a
   * slow convective roll from the middle outwards instead of wind chop, so it
   * looks like something rising rather than something blowing across.
   */
  private spring(px: Px, fill: (c: string) => void): void {
    fill(PAL.springMid);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const nf = ANIMATED[T.SPRING] ?? 1;
    const TAU = Math.PI * 2;
    const phase = (animFrame / nf) * TAU;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        /*
         * Two wrapping octaves for the body and a wrapping swell over them.
         *
         * The swell used to be radial -- distance from the middle of the cell,
         * which is a lovely convection roll for exactly one tile and stamps a
         * horseshoe into every cell of a pool eight across. Anything measured
         * from the centre of a tile becomes the tile's signature the moment it
         * is repeated. This wave has whole periods inside the cell in both
         * axes, so it meets itself at every seam and the pool moves as one
         * surface.
         */
        const n = wrapNoise(x * DETAIL, y * DETAIL, 16, 41) * 0.62
          + wrapNoise(x * DETAIL, y * DETAIL, 8, 97) * 0.38;
        const swell = Math.sin((x / S) * TAU * 2 - (y / S) * TAU - phase) * 0.5 + 0.5;
        const v = n * 0.82 + swell * 0.18;
        P(x, y, v > 0.7 ? PAL.springPale
          : v > 0.56 ? PAL.springLight
            : v < 0.34 ? PAL.springDeep : PAL.springMid);
      }
    }

    // Steam. Translucent and thin, drifting up and left with the frame -- a
    // solid plume at this size is a cloud sitting in a puddle.
    const drift = Math.round((animFrame / nf) * S);
    for (let i = 0; i < 5; i++) {
      const bx = Math.floor(hash2(i, 3, 401) * S);
      const by = Math.floor(hash2(i, 4, 409) * S);
      for (let j = 0; j < 4; j++) {
        const x = (bx + j + drift) % S;
        const y = (by - j + S) % S;
        P(x, y, j < 2 ? 'rgba(240,252,248,0.42)' : 'rgba(240,252,248,0.20)');
      }
    }

    /*
     * No rim.
     *
     * The first cut of this drew a sinter crust round all four edges of the
     * tile, which is right for one pool and catastrophic for a pool eight
     * cells across: every cell then has its own frame, and a spring terrace
     * comes out as a wall of bathroom tiles. It is the same trap the tall
     * grass and the great tree both had to be got out of -- anything a tile
     * draws at its own border becomes a grid the moment two of them touch.
     *
     * So the water is seamless, and the crust is a ring of paving stamped
     * round the pool by the map, which knows where the pool actually ends.
     */
  }

  /**
   * A fissure in the street with fire a long way down it.
   *
   * Walkable on purpose. Emberfall does not fence these off -- there are too
   * many and they move -- so the town paves round them and steps over them, and
   * being able to stand on one is the single strongest thing the map can say
   * about what living here is like. Transparent everywhere but the crack, so it
   * cuts through whatever paving the map put underneath.
   */
  private vent(px: Px): void {
    const P = this.unit(px);
    const nf = ANIMATED[T.VENT] ?? 1;
    // A slow breath rather than a flicker: the heat below is not a candle.
    const beat = Math.sin((animFrame / nf) * Math.PI * 2) * 0.5 + 0.5;

    // The crack, as a run of cells of varying width down the middle of the
    // tile. Widths come from a hash so no two vents in a street are the same
    // shape, and the profile closes at both ends so a single tile reads as one
    // fissure rather than as a channel running off the edges.
    for (let y = 2; y <= 13; y++) {
      const t = (y - 2) / 11;
      const swell = Math.sin(t * Math.PI);
      const half = Math.max(0, Math.round(swell * 2.6 + hash2(y, 0, 733) * 1.2 - 0.4));
      if (half <= 0) continue;
      const cx = 8 + Math.round(Math.sin(t * Math.PI * 1.6) * 2);
      for (let x = cx - half; x <= cx + half; x++) {
        const d = Math.abs(x - cx) / (half + 0.01);
        // Cool crust at the lips, then the ramp down into it. The brightest
        // pixel is a single one at the core, because that is what makes a hole
        // look deep rather than like a painted stripe.
        P(x, y, d > 0.8 ? PAL.basaltDeep
          : d > 0.5 ? PAL.emberDark
            : d > 0.2 ? PAL.emberMid
              : beat > 0.5 ? PAL.emberWhite : PAL.emberPale);
      }
    }

    // The light it throws on the paving around it, which is most of what sells
    // it: a glow that appears only inside the crack reads as a twig somebody
    // dropped in the road. It has to reach the whole cell and it has to be
    // strong enough to see at 1x, or the fissures in a street of black rock
    // simply do not register as light coming out of the ground.
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const d = Math.abs(x - 8) + Math.abs(y - 8) * 0.7;
        if (d < 3 || d > 13) continue;
        P(x, y, d > 9 ? `rgba(255,140,40,${(0.08 + beat * 0.04).toFixed(2)})`
          : d > 6 ? `rgba(255,150,50,${(0.16 + beat * 0.06).toFixed(2)})`
            : `rgba(255,165,60,${(0.26 + beat * 0.08).toFixed(2)})`);
      }
    }
  }

  /**
   * Emberfall's front door.
   *
   * Every other town in Caelora uses the porch door, and it is the right tile
   * for a plastered cottage with a garden in front of it. Dropped into a
   * street cut out of black rock it is a square of cream with a blue panel in
   * it, and the eye reads it as damage.
   *
   * So this is the same *job* done in the city's own materials: the opening is
   * cut straight through the wall with a copper lintel over it, the door
   * itself is planked and studded, and the threshold is lit from inside.
   * It still has to be findable from across a district -- twelve doors in a
   * city this size is not many -- and the warm spill on the step is what does
   * that, without the frontage having to stop being basalt.
   */
  private basaltDoor(px: Px): void {
    const P = this.unit(px);

    // Copper lintel and the shadow it throws down the head of the opening.
    for (let x = 3; x <= 12; x++) { P(x, 3, PAL.copperDark); P(x, 4, PAL.copperMid); }
    for (let x = 4; x <= 11; x++) P(x, 4, PAL.copperLight);
    P(3, 4, PAL.outline); P(12, 4, PAL.outline);

    // The reveal: two units of rock on each side, lit on the left and shaded
    // on the right, so the opening reads as cut through something thick.
    for (let y = 5; y <= 15; y++) {
      P(3, y, PAL.basaltPale); P(4, y, PAL.basaltLight);
      P(11, y, PAL.basaltDark); P(12, y, PAL.basaltDeep);
    }

    // The door. Planks running down, a copper strap across, and a ring handle.
    for (let y = 5; y <= 15; y++) {
      for (let x = 5; x <= 10; x++) {
        const plank = (x - 5) % 3 === 0;
        P(x, y, plank ? PAL.trunkDeep : (x - 5) % 3 === 1 ? PAL.trunkMid : PAL.trunkDark);
      }
    }
    for (let x = 5; x <= 10; x++) { P(x, 8, PAL.copperBright); P(x, 9, PAL.copperDeep); }
    for (let x = 5; x <= 10; x++) P(x, 5, PAL.outline);
    P(9, 12, PAL.copperBright); P(9, 11, PAL.copperBright);

    // Light under the door and on the step. This is the findable part.
    for (let x = 4; x <= 11; x++) P(x, 15, 'rgba(255,170,70,0.34)');
    for (let x = 5; x <= 10; x++) P(x, 14, 'rgba(255,190,100,0.20)');
  }

  /**
   * Emberfall's notice board.
   *
   * A sign object in this engine only carries text; the *post* is a terrain
   * tile, and if the map does not draw one the writing is invisible and the
   * player has to press the button at a random piece of empty street to find
   * it. Eight pieces of the city's own storytelling were sitting on bare
   * paving before this existed.
   *
   * The stock signpost cannot be used here for the same reason the stock rock
   * cannot: it is a post standing on turf, and it puts a bright green square
   * in the middle of a black road. This is the same object in the city's
   * materials -- a copper plate bolted to a basalt post -- and it is an
   * overlay with a transparent ground, so it stands on street, slag and
   * causeway alike.
   */
  private emberSign(px: Px): void {
    const P = this.unit(px);

    // The post: basalt, squared off, with the light on its left face.
    for (let y = 8; y <= 14; y++) {
      P(6, y, PAL.outline); P(7, y, PAL.basaltPale);
      P(8, y, PAL.basaltDark); P(9, y, PAL.outline);
    }

    // The plate. Copper, weathered green over most of it and rubbed back to
    // bright metal along the bottom edge where people lean on it.
    for (let y = 2; y <= 9; y++) {
      for (let x = 2; x <= 13; x++) {
        const edge = x === 2 || x === 13 || y === 2 || y === 9;
        P(x, y, edge ? PAL.outline
          : y <= 3 ? PAL.copperPale
            : y >= 8 ? PAL.copperDeep : PAL.copperMid);
      }
    }
    for (let x = 3; x <= 12; x++) P(x, 8, PAL.copperBright);
    // Lines of writing, as marks rather than letters: at this size a legible
    // glyph is impossible and a suggestion of text is what the era used.
    for (const [y, x0, x1] of [[4, 4, 11], [5, 4, 9], [6, 4, 12], [7, 4, 8]]) {
      for (let x = x0; x <= x1; x++) if ((x + y) % 2 === 0) P(x, y, PAL.copperDeep);
    }
    // Two bolts, so the plate is fixed to something.
    P(4, 3, PAL.copperPale); P(11, 3, PAL.copperPale);

    for (let x = 5; x <= 10; x++) { P(x, 15, PAL.basaltDeep); }
    this.footShadow(P, 5, 10, 15);
  }

  /**
   * The sealed gate at the end of the causeway.
   *
   * The one thing in Emberfall that Emberfall did not build. A single slab of
   * pale stone set into the caldera wall, with no seam, no hinge and nothing
   * that could be a lock -- and a palm-sized hollow cut dead centre, ringed
   * with the spiral marks that turn up on every Aurelian thing in Caelora.
   *
   * The whole district is arranged around not being able to open it, so the
   * tile has two jobs and only two: be obviously *older and other* than
   * everything round it, and put that hollow where a player will see it and
   * think about what is in their bag.
   */
  private sealedGate(px: Px, fill: (c: string) => void): void {
    fill(PAL.stoneDark);
    const P = this.unit(px);

    // The slab. Faintly warm-white and almost featureless: the point of the
    // material is that nobody here has anything like it.
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const edge = x <= 1 || x >= 14 || y <= 1;
        P(x, y, edge ? PAL.basaltDeep
          : hash2(x >> 1, y >> 1, 909) > 0.72 ? PAL.trimPale : PAL.trimMid);
      }
    }
    // Chisel scars, stopping short of the middle. Four generations of them.
    for (const [sx, sy] of [[3, 4], [12, 6], [4, 12], [13, 11], [3, 8]]) {
      P(sx, sy, PAL.trimShade); P(sx + 1, sy, PAL.stoneDark);
    }

    // The spiral ring, then the hollow inside it. The hollow is drawn as a
    // shadowed dish rather than a hole: there is nothing behind it.
    for (let y = 3; y <= 12; y++) {
      for (let x = 3; x <= 12; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        if (d > 4.6 || d < 3.4) continue;
        // Broken into arcs, so it reads as carving rather than as a drawn
        // circle: an unbroken ring at this size is a washer.
        if ((x + y) % 3 === 0) continue;
        P(x, y, PAL.stoneDeep);
      }
    }
    for (let y = 4; y <= 11; y++) {
      for (let x = 4; x <= 11; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        if (d > 2.8) continue;
        P(x, y, d > 2.2 ? PAL.stoneDark : x + y < 15 ? PAL.stoneDeep : PAL.stoneMid);
      }
    }
    // A single lit pixel on the lower right of the dish, so it has depth and
    // is not a grey blot.
    P(9, 9, PAL.stoneLight); P(6, 6, '#1a1820');

    // The rock it is set into, closing the tile so it belongs to the cliff.
    for (let x = 0; x < TILE_SIZE; x++) { P(x, 0, PAL.outline); P(x, 15, PAL.basaltDeep); }
    for (let y = 0; y < TILE_SIZE; y++) { P(0, y, PAL.outline); P(15, y, PAL.outline); }
  }

  /**
   * Steam main.
   *
   * The pipes are the reason the city works and they are above ground because
   * nobody digs a trench in basalt twice: they run along the house fronts on
   * short piers, and where they have to cross a street they climb. Copper,
   * lagged in places, weeping at every joint.
   *
   * Overlay and solid: a main is chest-high, so it blocks the street it runs
   * along, and the map uses that -- it is what turns an open square into a
   * route with sides to it.
   */
  private pipe(px: Px, part: 'h' | 'v' | 'riser'): void {
    const P = this.unit(px);

    /** One length of pipe, drawn as a lit cylinder across a span. */
    const barrel = (a0: number, a1: number, c0: number, c1: number, horizontal: boolean) => {
      for (let a = a0; a <= a1; a++) {
        for (let c = c0; c <= c1; c++) {
          const t = (c - c0) / Math.max(1, c1 - c0);
          // Light from the upper left, so the highlight is a third of the way
          // across and the underside carries the outline.
          const col = t < 0.12 ? PAL.outline
            : t < 0.3 ? PAL.copperPale
              : t < 0.5 ? PAL.copperLight
                : t < 0.74 ? PAL.copperMid
                  : t < 0.9 ? PAL.copperDark : PAL.outline;
          if (horizontal) P(a, c, col); else P(c, a, col);
        }
      }
    };

    if (part !== 'v') {
      barrel(0, TILE_SIZE - 1, 5, 12, true);
      // Flange every tile, so a long run has joints in it rather than being an
      // extruded tube from one side of town to the other.
      for (let c = 4; c <= 13; c++) {
        P(3, c, c === 4 || c === 13 ? PAL.outline : PAL.copperBright);
        P(4, c, c === 4 || c === 13 ? PAL.outline : PAL.copperDark);
      }
      // Weep: every joint in this town drips, and the stain under it is warm.
      P(3, 14, 'rgba(255,180,90,0.30)'); P(4, 14, 'rgba(255,180,90,0.18)');
    }
    if (part !== 'h') {
      barrel(0, TILE_SIZE - 1, 5, 12, false);
      for (let c = 4; c <= 13; c++) {
        P(c, 3, c === 4 || c === 13 ? PAL.outline : PAL.copperBright);
        P(c, 4, c === 4 || c === 13 ? PAL.outline : PAL.copperDark);
      }
    }

    if (part === 'riser') {
      // Valve wheel and a bleed of steam off the gland. The wheel is the only
      // circle in the whole material and it is what makes the stack read as
      // plant rather than as a post.
      for (let y = 4; y <= 10; y++) {
        for (let x = 1; x <= 7; x++) {
          const d = Math.hypot(x - 4, y - 7);
          if (d > 3.4) continue;
          P(x, y, d > 2.6 ? PAL.outline : d > 1.6 ? PAL.copperBright : 'rgba(0,0,0,0)');
        }
      }
      for (let x = 2; x <= 6; x++) P(x, 7, PAL.copperBright);
      for (let y = 5; y <= 9; y++) P(4, y, PAL.copperBright);
      P(3, 6, PAL.emberPale);
      for (let i = 0; i < 4; i++) {
        P(12 + (i % 2), 4 - i, i < 2 ? 'rgba(240,252,248,0.40)' : 'rgba(240,252,248,0.20)');
      }
    }
  }

  /**
   * Emberfall's street lamp.
   *
   * Not the civic lamp with a different bulb in it. Nothing here burns oil --
   * the lamps are tapped straight off the steam mains, so the standard is a
   * copper pipe with a valve at the foot, and the head is a plain glass
   * cylinder with a gas flame in it. Cheaper than the lamps in Tideglass and
   * about four times as bright, which is exactly the impression the town wants
   * to give: heat is the one thing it has never had to pay for.
   */
  private emberLamp(px: Px): void {
    const P = this.unit(px);

    for (let y = 0; y <= 11; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const d = Math.abs(x - 7.5) + Math.abs(y - 4) * 0.9;
        if (d > 9) continue;
        P(x, y, d > 6 ? 'rgba(255,146,44,0.12)' : 'rgba(255,170,70,0.26)');
      }
    }

    // The glass: a cylinder, brightest in its lower half where the flame is.
    for (let y = 1; y <= 8; y++) {
      for (let x = 5; x <= 10; x++) {
        const frame = x === 5 || x === 10;
        P(x, y, frame ? PAL.outline
          : y <= 2 ? PAL.copperDark
            : y >= 4 && x >= 6 && x <= 9 ? (y >= 6 ? PAL.emberWhite : PAL.emberPale)
              : PAL.emberLight);
      }
    }
    // The flame itself, a two-pixel tongue with white at the root.
    P(7, 6, PAL.emberWhite); P(8, 6, PAL.emberWhite);
    P(7, 5, PAL.emberPale); P(8, 5, PAL.emberLight);
    P(7, 4, PAL.emberMid);
    // Copper cowl over the top, so rain does not get in and the light is
    // thrown down onto the street rather than up at nothing.
    for (let x = 3; x <= 12; x++) P(x, 0, PAL.copperMid);
    for (let x = 4; x <= 11; x++) P(x, 1, PAL.copperPale);
    P(3, 1, PAL.outline); P(12, 1, PAL.outline);

    // Standard: a copper pipe rather than a fluted column, with the tap on it.
    for (let y = 9; y <= 13; y++) {
      P(6, y, PAL.outline); P(7, y, PAL.copperPale);
      P(8, y, PAL.copperDark); P(9, y, PAL.outline);
    }
    P(5, 11, PAL.copperBright); P(10, 11, PAL.copperBright);   // the tap handle
    for (let x = 5; x <= 10; x++) { P(x, 14, PAL.basaltDark); P(x, 15, PAL.outline); }
    P(4, 15, PAL.outline); P(11, 15, PAL.outline);
    this.footShadow(P, 4, 11, 15);
  }

  /**
   * A forge mouth, open onto the street.
   *
   * The forge district is the economy, not the scenery, so the workshops are
   * open-fronted the way a real smithy is -- you want the heat out of the room
   * and you want passers-by to see the work. What the tile has to carry is the
   * *interior* being brighter than the outdoors, which is the one lighting
   * relationship that instantly says furnace.
   *
   * Overlay and solid: it is a wall opening, and it sits in a run of basalt.
   */
  private forge(px: Px): void {
    const P = this.unit(px);
    const nf = ANIMATED[T.FORGE] ?? 1;
    const beat = Math.sin((animFrame / nf) * Math.PI * 2) * 0.5 + 0.5;

    // The arch. Cut square with a splayed head, because basalt does not carry
    // a voussoir arch and a mason here would corbel it instead.
    for (let y = 2; y <= 15; y++) {
      const inset = y <= 3 ? 5 : y <= 4 ? 4 : 3;
      for (let x = inset; x <= 15 - inset; x++) {
        const t = (y - 2) / 13;
        // Deepest at the back of the opening, hottest at the hearth line about
        // two thirds down, then the lit floor of the shop in front of it.
        const heat = Math.max(0, 1 - Math.abs(t - 0.62) * 2.6);
        const v = heat * (0.72 + beat * 0.28);
        P(x, y, v > 0.82 ? PAL.emberWhite
          : v > 0.6 ? PAL.emberPale
            : v > 0.38 ? PAL.emberLight
              : v > 0.18 ? PAL.emberMid
                : v > 0.06 ? PAL.emberDark : PAL.emberDeep);
      }
    }
    // The anvil, in silhouette against it. One black shape in the middle of the
    // glow is worth more than any amount of detail in the fire behind it.
    for (let x = 6; x <= 10; x++) P(x, 11, PAL.basaltDeep);
    for (let x = 7; x <= 9; x++) P(x, 12, PAL.basaltDeep);
    P(8, 13, PAL.basaltDeep); P(7, 14, PAL.basaltDeep);
    P(8, 14, PAL.basaltDeep); P(9, 14, PAL.basaltDeep);
    P(11, 10, PAL.basaltDeep); P(11, 11, PAL.basaltDeep);      // the hardy tools

    // Jambs and lintel, in the wall's own rock so the opening belongs to it.
    for (let y = 2; y <= 15; y++) {
      const inset = y <= 3 ? 5 : y <= 4 ? 4 : 3;
      P(inset - 1, y, PAL.basaltDeep);
      P(inset - 2, y, PAL.basaltDark);
      P(16 - inset, y, PAL.basaltDeep);
      P(17 - inset, y, PAL.basaltDark);
    }
    for (let x = 2; x <= 13; x++) { P(x, 1, PAL.basaltDeep); P(x, 0, PAL.copperDark); }
    for (let x = 3; x <= 12; x++) P(x, 0, PAL.copperMid);
    // The light thrown out onto the street in front of the opening.
    for (let x = 2; x <= 13; x++) P(x, 15, `rgba(255,150,50,${(0.22 + beat * 0.10).toFixed(2)})`);
  }

  /* ----------------------------------------------------------- Aurelian */

  /**
   * Aurelian floor, and the same floor with a spiral cut into it.
   *
   * The one idea the whole material family hangs off: this civilisation cut
   * stone to a tolerance. Every other floor in the game is laid -- boards
   * nailed down, setts rammed into sand, slabs dressed by eye -- and reads as
   * laid, because the joints wander and the pieces are different sizes. These
   * are machined plates on an eight-unit pitch with a bronze pin at the centre
   * of each, so a room of them is flat, regular and slightly inhuman, and the
   * player knows they are somewhere else before anybody says a word about it.
   *
   * The variation is in the *block* each plate was cut from rather than in the
   * texture of any one plate, which is why the tone is keyed off the plate
   * index and the mottle inside it is kept to a whisper. Noise across the face
   * of a machined plate would undo the entire point of it.
   */
  private aurFloor(px: Px, fill: (c: string) => void, glyph: boolean): void {
    fill(AUR.mid);
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = hash2(Math.floor(x / 8), Math.floor(y / 8), 41);
        let c: string = n > 0.60 ? AUR.light : n < 0.35 ? AUR.dark : AUR.mid;
        if ((x * 5 + y * 3) % 23 === 6) c = AUR.pale;
        // ONE unit of joint, ONE step down, and nothing else. The first cut of
        // this tile had a lit lip on two sides of every plate and a bronze pin
        // in four colours at the middle of each, which at sixteen pixels is not
        // a floor, it is a wall of gold lockers -- and the room stood on it
        // could not be seen past it. A machined floor is supposed to be the
        // quietest surface in the game.
        if (x % 8 === 0 || y % 8 === 0) c = AUR.deep;
        P(x, y, c);
      }
    }
    // The pins. One to a plate, one unit, and dim.
    for (const [cx, cy] of [[4, 4], [12, 4], [4, 12], [12, 12]] as const) P(cx, cy, AUR.goldDim);
    if (!glyph) return;

    // The spiral. Canon puts circles and spirals on the Tideheart's own frame,
    // so the mark cut into the floor where one of their mechanisms stands is
    // the same mark -- drawn as one continuous line of bronze rather than as a
    // ring, because a ring is a decoration and a spiral is a diagram.
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const a = t * Math.PI * 3.6;
      const r = 1.4 + t * 5.4;
      const gx = Math.round(7.5 + Math.cos(a) * r);
      const gy = Math.round(7.5 + Math.sin(a) * r);
      // Bronze laid INTO pale stone reads dark, not bright. Drawing the line
      // in the lit end of the ramp put a spiral of highlight on a highlight.
      P(gx, gy, AUR.gold);
      P(gx, gy + 1, AUR.goldDim);
    }
  }

  /**
   * Aurelian wall.
   *
   * Basalt, cut with the same machine as the floor and half its brightness, so
   * a room reads as a pale plate laid inside a dark box -- which is the whole
   * silhouette of the temple seen from above.
   *
   * Coursed ashlar: eight-by-four blocks, courses offset by half a block, one
   * unit of joint. The first cut of this tile was fluted on a four-unit rhythm
   * instead, and a dark rectangle with a bright vertical bar every four pixels
   * and a bronze line across the top of every tile is not a wall, it is a bank
   * of lockers -- which is exactly what a gallery of it looked like. Coursing
   * is what says masonry at this size, and it says it without a single bright
   * pixel: the blocks differ from each other by one step of the ramp and the
   * joint by two, and the eye assembles a wall out of that on its own.
   */
  private aurWall(px: Px, fill: (c: string) => void): void {
    fill(AUR.wallMid);
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let y = 0; y < S; y++) {
      const course = Math.floor(y / 4);
      const offset = (course & 1) * 4;
      for (let x = 0; x < S; x++) {
        const bx = (x + offset) % 8;
        const by = y % 4;
        const n = hash2(Math.floor((x + offset) / 8), course, 63);
        let c: string = n > 0.66 ? AUR.wallLight : n < 0.33 ? AUR.wallDark : AUR.wallMid;
        if (hash2(x, y, 64) > 0.88) c = AUR.wallDeep;
        // The lit head of the block, then the two joints. Light comes from the
        // upper left everywhere in this game, so the head is lit and the bed
        // and the left-hand joint are in shadow.
        if (by === 0) c = n > 0.5 ? AUR.wallPale : AUR.wallLight;
        else if (by === 3) c = AUR.wallDeep;
        if (bx === 0) c = AUR.wallDeep;
        P(x, y, c);
      }
    }
  }

  /**
   * A seat, cut from one block.
   *
   * Furniture rather than architecture, and the distinction matters: a single
   * cell of wall tile standing on its own in the middle of a floor reads as a
   * hole in the floor, not as a thing in the room. This is an overlay with no
   * ground of its own and a contact shadow under it, like every chair in every
   * house in Caelora, so it sits on the plates instead of being cut out of
   * them -- and it is drawn with its own row, so a player standing behind one
   * is behind it.
   *
   * Eight of them ring the listening room, all facing in. They are the whole
   * argument of the civilisation that built the place, made out of furniture.
   */
  private aurSeat(px: Px): void {
    const P = this.unit(px);
    // A TOP FACE and a FRONT FACE, and the outline only around the outside of
    // both. The first cut of this was one square with a hard border all the
    // way round it, which at this size is not a block, it is a hole in the
    // floor -- and eight of them ringing the room read as eight open pits.
    // Two faces at different values is the whole trick: the eye takes the
    // brighter one as a surface it is looking down at.
    for (let y = 3; y <= 8; y++) {
      for (let x = 2; x <= 13; x++) {
        const rim = y === 3 || x === 2 || x === 13;
        P(x, y, rim ? AUR.outline : y <= 4 ? AUR.pale : AUR.light);
      }
    }
    // The dish worn into the top, which is what says people sat here.
    for (let x = 5; x <= 10; x++) { P(x, 6, AUR.mid); P(x, 7, AUR.dark); }
    // The front, in real shadow. The value gap between the two faces is what
    // does all the work: mixed from the light end of the ramp, as it was at
    // first, the front came out the same value as the floor and the whole seat
    // read as a pale square lying flat on it.
    for (let y = 9; y <= 13; y++) {
      for (let x = 2; x <= 13; x++) {
        const rim = x === 2 || x === 13 || y === 13;
        P(x, y, rim ? AUR.outline : y === 9 ? AUR.dark : AUR.deep);
      }
    }
    for (let x = 3; x <= 12; x++) P(x, 12, AUR.cut);
    // Two feet, so it is standing on the plates rather than sunk into them.
    P(3, 13, AUR.outline); P(12, 13, AUR.outline);
    for (let x = 5; x <= 10; x++) P(x, 13, AUR.cut);
    this.footShadow(P, 2, 13, 14);
  }

  /**
   * A conduit cut through the floor, dead or alive.
   *
   * Drawn as a cross with a boss at the middle rather than as a straight run,
   * and that is the only reason the temple's circuit can be authored as ASCII
   * art at all: every arm reaches the edge of the cell, so any two of these
   * side by side join, a corner joins, a T joins, and a map author never has
   * to think about which of nine tiles a bend needs. A straight run comes out
   * beaded at each cell, which is what inlay of this kind actually looks like.
   *
   * The dead one is an empty stone channel. The living one is the same channel
   * with the Tideheart's own blue-green in it, breathing on the shared clock,
   * spilling a little light onto the plates either side. Two tiles rather than
   * one tile with a state, because that is what lets the temple say "the coil
   * above is off and the coil below is on" with nothing behind it but the map.
   */
  private aurVein(px: Px, fill: (c: string) => void, lit: boolean): void {
    this.aurFloor(px, fill, false);
    const P = this.unit(px);
    const S = TILE_SIZE;

    const beat = lit ? 0.5 + 0.5 * Math.sin((animFrame / 4) * Math.PI * 2) : 0;
    // Three steps down the channel, outside in. Dead, they run pale cut stone
    // to shadow; alive, the same three carry the current and the middle one
    // breathes on the shared clock.
    const bed = lit ? AUR.glowDim : AUR.slotDark;
    const body = lit ? (beat > 0.4 ? AUR.glowHi : AUR.glowMid) : AUR.slotDeep;
    const core = lit ? (beat > 0.5 ? AUR.glowCore : AUR.glowHi) : AUR.slotDeep;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const ax = Math.abs(x - 7.5);
        const ay = Math.abs(y - 7.5);
        // Arms two units either side of the centreline, and a boss at the
        // crossing a little wider than they are. The first cut had the arms as
        // wide as the boss, which turns a straight run into a row of plus
        // signs; narrow arms and a round boss read as a channel with a bead in
        // it, which is what inlay of this kind actually looks like.
        const hx = ax <= 1.5, hy = ay <= 1.5;
        const r = Math.hypot(x - 7.5, y - 7.5);
        const boss = r <= 3.6;
        if (!hx && !hy && !boss) {
          // Light does not stop at the lip of the groove. The spill runs to the
          // corners of the cell so a run of these reads as one lit channel
          // rather than as a string of separate lamps -- and it is the only
          // thing making the plates either side of the current look lit at all.
          if (lit) {
            const t = Math.min(ax, ay);
            P(x, y, t < 3 ? AUR.spill : t < 5 ? AUR.spillFar : AUR.spillEdge);
          }
          continue;
        }
        // Depth into the channel. At a crossing the shallower of the two axes
        // wins, which is what keeps the junction open instead of pinching.
        const d = boss && !hx && !hy ? r * 0.55 : hx && hy ? Math.min(ax, ay) : hx ? ax : ay;
        const c = d > 2.2 ? AUR.cut : d > 1.2 ? bed : d > 0.6 ? body : core;
        P(x, y, c);
      }
    }
  }

  /**
   * A resonance ring.
   *
   * The mechanism the Tideheart answers: a bronze hoop standing upright in a
   * cut socket, tall enough to walk through and deliberately not machinery --
   * no plating, no housing, no dials. The Aurelians built instruments that
   * work by shape, and the player should be able to see that there is nothing
   * inside it to break.
   *
   * An overlay with no floor of its own, so it stands on whatever the map put
   * under it, and it is drawn with the row it is on: walk behind one and it
   * covers you, which is what proves it is a thing in the room rather than a
   * pattern on the ground.
   */
  private aurRing(px: Px): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    const cx = 7.5, cy = 6.5;

    // TALLER THAN IT IS WIDE, and that is the whole point of the shape. The
    // first cut of this tile drew a near-circle lying flat, which at sixteen
    // pixels is indistinguishable from the spiral cut into the floor
    // underneath it -- so the mechanism and its markings read as the same
    // thing and neither read as an object. Squashing the horizontal axis puts
    // the hoop up on its edge, which is the only way a ring seen from this
    // camera angle says "standing" rather than "painted on".
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x - cx) * 1.35, dy = y - cy;
        const r = Math.hypot(dx, dy);
        if (r > 6.6 || r < 3.4) continue;
        let c: string;
        if (r > 5.9 || r < 4.1) c = AUR.outline;
        else {
          const l = (dx + dy) / (r || 1);
          c = l < -0.45 ? AUR.goldLit : l > 0.55 ? AUR.goldDim : AUR.gold;
        }
        P(x, y, c);
      }
    }
    // The socket it is stepped into. Wider than the hoop, so the thing has a
    // footing rather than balancing on a line.
    for (let x = 3; x <= 12; x++) {
      P(x, 12, AUR.outline);
      P(x, 13, x <= 6 ? AUR.pale : x >= 11 ? AUR.deep : AUR.light);
      P(x, 14, AUR.dark);
      P(x, 15, AUR.outline);
    }
    // The dead bead at the crown, which is where the current will come out.
    P(7, 1, AUR.glowDeep); P(8, 1, AUR.glowDim);
    this.footShadow(P, 3, 12, 15);
  }

  /**
   * Cinder drifted over the plates.
   *
   * The only loose material in the building, blown up the shaft and banked
   * against the walls of the lower gallery -- and, because the engine only
   * rolls a wild encounter on a tile that says it carries one, the only place
   * in the temple where anything living is found. That is not a workaround: a
   * sealed hall of cut stone should be empty, and the drift is where the
   * mountain gets in.
   */
  private aurAsh(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.aurFloor(px, fill, false);
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // Two octaves, the finer one leading. One octave at eight pixels is a
        // blob field, and a floor covered in it reads as lichen or as fog on
        // the ground rather than as something loose that blew in.
        const n = wrapNoise(x * DETAIL, y * DETAIL, 4, 91) * 0.6
          + wrapNoise(x * DETAIL, y * DETAIL, 8, 137) * 0.4;
        if (n < 0.46) continue;
        // The edge of a drift is a stipple, not a coastline: dithering the
        // first two steps is what makes it thin out over the plates instead of
        // stopping dead along a contour.
        if (n < 0.53 && !dither(x, y, (n - 0.46) * 12)) continue;
        P(x, y, n > 0.68 ? AUR.ashLight : n > 0.57 ? AUR.ashMid : AUR.ashDark);
      }
    }
    for (let i = 0; i < 3; i++) P(rng.below(S), rng.below(S), AUR.ember);
  }

  /**
   * The shaft.
   *
   * Crusted magma seen from directly above: dark plates of set rock with the
   * live rock showing in the cracks between them. The cracks are the animated
   * part and the crust is not, because that is what the material does -- the
   * skin holds still and the seams breathe -- and it means the shaft can be a
   * wall of the map without flickering like water.
   */
  private magma(px: Px, fill: (c: string) => void): void {
    fill(AUR.crust);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const drift = 0.05 * Math.sin((animFrame / 4) * Math.PI * 2);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 55);
        let c: string = n > 0.58 ? AUR.crustLight : n > 0.4 ? AUR.crust : AUR.crustDeep;
        const t = Math.abs(n - (0.47 + drift));
        if (t < 0.03) c = AUR.lavaHot;
        else if (t < 0.06) c = AUR.lavaMid;
        else if (t < 0.095) c = AUR.lavaDark;
        P(x, y, c);
      }
    }
  }

  /* ------------------------------------------------- the wetlands ------ */

  /**
   * Peat.
   *
   * The ground of the whole route, and the tile everything else out here is
   * drawn on top of. It is not a path and it is not a field: it is saturated
   * rotted plant matter with water standing in the low parts of it, so the
   * texture is *patchy* rather than woven -- soft dark islands with a wet
   * sheen between them, which is what stops a mire reading as brown carpet.
   *
   * The sheen is the whole tile. Peat with no water in it is a dirt path in a
   * different colour; the scraps of caught sky are what say the ground is
   * holding water and what make the boardwalk above it worth building.
   */
  private peat(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.peatMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // Two octaves. The coarse one makes the islands, the fine one makes
        // the crumb; either alone reads as camouflage or as static.
        const n = wrapNoise(x * DETAIL, y * DETAIL, 12, 401) * 0.62
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 409) * 0.38;
        let c: string = n > 0.62 ? PAL.peatLight : n < 0.36 ? PAL.peatDark : PAL.peatMid;
        if (n > 0.78) c = PAL.peatPale;
        else if (n < 0.24) c = PAL.peatDeep;
        P(x, y, c);
      }
    }

    // Standing water in the hollows: the darkest tone with one unit of sky on
    // its upper lip, which is the only mark that reads as a surface at this
    // size. Taken from the low points of the coarse octave rather than hashed,
    // so the wet is in the dips instead of scattered over the whole cell.
    for (let y = 1; y < S - 1; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 12, 401);
        if (n > 0.22) continue;
        P(x, y, PAL.mireDeep);
        if (wrapNoise(x * DETAIL, (y - 1) * DETAIL, 12, 401) > 0.22) P(x, y, PAL.mireSky);
      }
    }

    // Roots and dead stalks. A mire floor with nothing lying on it is a
    // texture; one with last year's stems in it is a place things have been
    // growing and rotting for a long time.
    const stems = 2 + rng.below(3);
    for (let i = 0; i < stems; i++) {
      const sx = rng.below(S - 3), sy = 2 + rng.below(S - 4);
      const len = 2 + rng.below(3);
      const lean = rng.below(2) === 0 ? 1 : -1;
      for (let j = 0; j < len; j++) {
        P(sx + j * lean, sy - Math.floor(j / 2), PAL.peatDeep);
        P(sx + j * lean, sy - Math.floor(j / 2) - 1, PAL.reedDark);
      }
    }
  }

  /**
   * Standing marsh water.
   *
   * The opposite of the sea tile in every way that matters. Sea is bright,
   * blue and always moving; this is dark, tannin-green and very nearly dead
   * still, and the difference has to be readable in one glance because one of
   * them is a wall and the other is the route. What movement there is comes
   * from a single ring of scum turning slowly round the cell over four frames
   * -- barely anything, which is exactly the reading.
   *
   * Wadeable, so the player crosses it with the art the Tide Hall gave them.
   * The deep pools beside it use the ordinary deep-water tile and stay shut
   * until much later.
   */
  private mireWater(px: Px, fill: (c: string) => void, rng: Rng, deep: boolean): void {
    fill(deep ? PAL.mireDeep : PAL.mireDark);
    const N = TILE_PX;
    const S = TILE_SIZE;
    const P = this.unit(px);
    const nf = ANIMATED[T.MIRE_WATER] ?? 1;

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const n = wrapNoise(x, y, 16, 431) * 0.6 + wrapNoise(x, y, 8, 433) * 0.4;
        // The body sits in a narrow band. Water this still has no swell in it,
        // and a wide ramp here made a pool read as spilt oil.
        //
        // The deep cut drops the whole thing a step and closes the band right
        // up. This is the lagoon Mirehaven is built over and the pool at the
        // bottom of the route, and both of them have to be the darkest thing on
        // their screen: it is what makes a plank walk read as bright, and the
        // ordinary sea tile -- which is a real, saturated blue, correctly, for
        // the sea -- turned every gap between two platforms into a stripe of
        // open ocean running through the middle of a marsh.
        px(x, y, deep
          ? (n > 0.7 ? PAL.mireDark : n < 0.34 ? '#070e0a' : PAL.mireDeep)
          : (n > 0.68 ? PAL.mireMid : n < 0.32 ? PAL.mireDeep : PAL.mireDark));
      }
    }

    // Sky caught on the surface: a few short flat marks, because a still
    // surface reflects in *lines* rather than glinting in points. Deep water
    // catches less of it -- there is nothing under it throwing anything back.
    for (let i = 0; i < (deep ? 2 : 3); i++) {
      const ry = 2 + Math.floor(hash2(i, 3, 601) * (S - 5));
      const rx = Math.floor(hash2(i, 4, 607) * S);
      const len = 2 + Math.floor(hash2(i, 5, 613) * 3);
      for (let j = 0; j < len; j++) {
        P((rx + j) % S, ry, j === 0 ? (deep ? PAL.mireMid : PAL.mireLight) : PAL.mireSky);
      }
    }

    // The scum ring: duckweed and pollen gathered into a slow eddy. One shape,
    // turned a quarter round per frame, so the whole marsh moves together and
    // the loop closes exactly on itself.
    const step = (animFrame / nf) * Math.PI * 2;
    for (let a = 0; a < 10; a++) {
      const th = (a / 10) * Math.PI * 2 + step;
      const r = 4.4 + Math.sin(th * 3) * 1.1;
      const x = Math.round(7.5 + Math.cos(th) * r);
      const y = Math.round(7.5 + Math.sin(th) * r * 0.7);
      P(x, y, a % 3 === 0 ? PAL.reedDark : PAL.mireMid);
    }

    // Two or three reed stubs standing through the surface, with the smear of
    // their own reflection under them. Without these a pool is a hole in the
    // map; with them it is water with a bottom somewhere under it.
    //
    // Nothing stands through the deep cut, and that is the reading: reed grows
    // where a person could wade, so the tile with no reed in it is the tile
    // that is over your head.
    const stubs = deep ? 0 : 2 + rng.below(2);
    for (let i = 0; i < stubs; i++) {
      const sx = 2 + rng.below(S - 4), sy = 4 + rng.below(S - 8);
      P(sx, sy, PAL.reedMid);
      P(sx, sy - 1, PAL.reedLight);
      P(sx, sy - 2, PAL.reedDark);
      P(sx, sy + 1, PAL.mireDeep);
      P(sx, sy + 2, PAL.mireDeep);
    }
  }

  /**
   * Reeds: the wetlands' tall grass, and where its encounters live.
   *
   * Built to the same rule as the grass clump it stands in for -- a discrete
   * stand with water showing on every side, standing by the wading line at row
   * 8 so the band repainted in front of a character has no holes in it where
   * their legs are (see TileMap.renderGrassFrontRow). What is different is the
   * *shape*: grass arches and reed does not. These are near-vertical canes
   * with a heavy seed head at the top and no taper, growing out of water
   * rather than turf, and that stiffness is the whole visual difference
   * between wading a meadow and wading a reed bed.
   */
  private reeds(px: Px, fill: (c: string) => void, rng: Rng): void {
    const P = this.unit(px);
    const S = TILE_SIZE;

    // The bed stands in water, not on soil, so the ground under it is the
    // marsh surface darkened -- which also keeps the repainted band dark, and
    // that band lands across the player's chest.
    fill(PAL.mireDark);
    for (let y = 0; y < TILE_PX; y++) {
      for (let x = 0; x < TILE_PX; x++) {
        const n = wrapNoise(x, y, 12, 439);
        px(x, y, n > 0.66 ? PAL.mireMid : n < 0.3 ? PAL.mireDeep : PAL.mireDark);
      }
    }
    for (let x = 2; x <= 13; x++) P(x, 8, hash2(x, 1, 443) > 0.5 ? PAL.mireSky : PAL.mireDark);

    const nudge = Math.floor(hash2(0, 0, 447) * 3) - 1;
    const L = 2 + nudge, R = 13 + nudge;

    // Understory: the dark tangle the canes come out of. It has to reach the
    // foot of the cell or the stand appears to float on the water.
    for (let y = 11; y < S; y++) {
      for (let x = L; x <= R; x++) {
        P(x, y, hash2(x, y, 449) > 0.55 ? PAL.reedDeep : PAL.mireDeep);
      }
    }

    /** One cane, drawn root upward: stem, then a head if it stands tall. */
    const cane = (bx: number, top: number, front: boolean) => {
      const stem = front ? PAL.reedLight : PAL.reedDark;
      const lit = front ? PAL.reedPale : PAL.reedMid;
      for (let y = 13; y >= top; y--) {
        P(bx, y, y % 3 === 0 ? lit : stem);
        P(bx + 1, y, PAL.reedDeep);              // the cane's own shadow side
      }
      // Seed head: a fat dark plume two units wide, the mark that says reed.
      if (top <= 5) {
        for (let y = top; y <= top + 2; y++) {
          P(bx, y, y === top ? PAL.reedHead : PAL.reedDark);
          P(bx + 1, y, y === top ? PAL.reedDark : PAL.reedDeep);
        }
        P(bx, top - 1, PAL.reedHead);
      }
    };

    // Back rank first, then front, so the pale canes overlap the dull ones.
    for (let x = L; x <= R; x += 3) {
      cane(x, 3 + Math.floor(hash2(x, 2, 457) * 5), false);
    }
    for (let x = L + 1; x <= R; x += 3) {
      cane(x, 2 + Math.floor(hash2(x, 3, 461) * 4), true);
    }

    // A leaf or two thrown out sideways, which is what stops the stand reading
    // as a bar chart.
    for (let i = 0; i < 3; i++) {
      const lx = L + rng.below(Math.max(1, R - L)), ly = 5 + rng.below(6);
      const dir = rng.below(2) === 0 ? 1 : -1;
      for (let j = 1; j <= 3; j++) P(lx + j * dir, ly + Math.floor(j / 2), PAL.reedMid);
    }
  }

  /**
   * Sedge: the walkable marsh floor between the reed beds.
   *
   * The wetlands' answer to turf, and it has to be legibly *not* the reed tile
   * from across the screen, because one of them starts fights and the other
   * does not. So the tussocks here are low, round and separated, sitting in
   * visible standing water, and nothing in the cell rises above the halfway
   * line -- whereas a reed stand fills its cell to the top edge.
   */
  private sedge(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.peat(px, fill, rng);
    const P = this.unit(px);
    const S = TILE_SIZE;

    const clumps = 3 + rng.below(2);
    for (let i = 0; i < clumps; i++) {
      const cx = 2 + rng.below(S - 4), cy = 6 + rng.below(S - 8);
      // A tussock is a dome of short blades: dark at the base, olive over it,
      // one pale unit at the crown. Four units across is enough to read.
      for (let x = cx - 2; x <= cx + 2; x++) {
        const d = Math.abs(x - cx);
        for (let y = cy - (2 - d); y <= cy + 1; y++) {
          P(x, y, y >= cy + 1 ? PAL.reedDeep
            : y <= cy - 1 ? (hash2(x, y, 463) > 0.5 ? PAL.reedLight : PAL.reedMid)
            : PAL.reedDark);
        }
      }
      P(cx, cy - 2, PAL.reedPale);
      P(cx - 1, cy + 2, PAL.peatDeep);
      P(cx + 1, cy + 2, PAL.peatDeep);
    }
  }

  /**
   * Boardwalk.
   *
   * The road of everything east of Emberfall, and the reason the wetlands read
   * as somewhere people live rather than as an obstacle. Cross boards on two
   * stringers, pale against the peat, and deliberately with no rail on it --
   * the rail is a separate tile, so a walk can be railed on the side where the
   * drop is and open on the side where it is not, and so this one tile serves
   * a walk running north-south and one running east-west alike.
   *
   * The gaps between the boards show the dark underneath, which is what makes
   * a plank walk read as *raised* without anything standing up off it.
   */
  private boardwalk(px: Px, fill: (c: string) => void, rng: Rng): void {
    fill(PAL.plankMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    // Four boards to the cell rather than five, and a real gap between them.
    // The first cut of this had thin boards and bright fixings and came out as
    // pale brickwork -- at sixteen units a plank needs three clear rows of its
    // own face before the dark line under it can read as a joint at all.
    for (let y = 0; y < S; y++) {
      const board = Math.floor(y / 4);
      const b = y % 4;
      // Every board a different piece of timber, or a walk is one plank
      // photocopied the length of the route.
      const tone = hash2(board, 0, 467);
      for (let x = 0; x < S; x++) {
        let c: string = tone > 0.66 ? PAL.plankLight
          : tone < 0.33 ? PAL.plankDark : PAL.plankMid;
        if (b === 0) c = tone > 0.5 ? PAL.plankPale : PAL.plankLight;  // lit head
        else if (b === 2) c = tone > 0.5 ? PAL.plankMid : PAL.plankDark;
        else if (b === 3) c = PAL.plankDeep;                            // the joint
        // Grain along the board, never across it.
        if (b !== 3 && (x * 5 + board * 7) % 13 === 3) c = PAL.plankPale;
        // Weed and wet in the joints. A dry walk in a marsh is a lie.
        if (b === 3 && hash2(x, board, 479) > 0.72) c = PAL.mireDeep;
        else if (b === 2 && hash2(x, board, 481) > 0.93) c = PAL.reedDark;
        P(x, y, c);
      }
    }

    // Fixings: two per board, in fixed columns, so a run of the tile lines up
    // into a rail of nail heads down the walk rather than a scatter of dots.
    // Dark, not bright -- iron in wet timber is a stain, and picking it out in
    // stone-white was most of what made the first cut read as masonry.
    for (let y = 0; y < S; y += 4) {
      P(3, y + 1, PAL.plankDeep);
      P(12, y + 1, PAL.plankDeep);
    }
    void rng;
  }

  /**
   * Boardwalk handrail.
   *
   * An overlay with nothing behind it, so the same rail stands on plank, on
   * stone platform and on a jetty without dragging a square of the wrong
   * material along with it. Two rails and an upright, drawn symmetrically
   * about the middle of the cell so a run reads as a railing whichever way the
   * walk turns.
   *
   * Solid, and that is the point of it: it is what decides which edge of a
   * boardwalk is a way down into the water and which is not.
   */
  private boardRail(px: Px): void {
    const P = this.unit(px);
    const S = TILE_SIZE;

    // Two rails, each two units deep: a lit head and the shadow under it, and
    // nothing else. Three units apiece was a ladder lying on the deck.
    for (const ry of [3, 9]) {
      for (let x = 0; x < S; x++) {
        P(x, ry, hash2(x, ry, 491) > 0.7 ? PAL.plankPale : PAL.plankLight);
        P(x, ry + 1, PAL.plankDeep);
      }
    }
    // Upright, in front of the rails, with the pitch on it that everything in
    // this region is dipped in. It has to be the darkest thing in the cell or
    // the two rails read as rungs with nothing holding them up.
    for (let y = 1; y <= 13; y++) { P(7, y, PAL.tarLight); P(8, y, PAL.tarDeep); }
    P(7, 1, PAL.outline); P(8, 1, PAL.outline);
    P(7, 2, PAL.tarPale);
    this.footShadow(P, 6, 9, 14);
  }

  /**
   * Mangrove.
   *
   * The wetlands' border and its treeline, and it has to be a different
   * *silhouette* from the woodland tree rather than a green one recoloured --
   * the promise of the whole region is that even the trees stand differently
   * here. So the mass is carried low: a dark crown with almost no daylight
   * under it, and a fan of stilt roots leaving the trunk above the waterline
   * and going down into the mud, which is the one shape nobody mistakes for an
   * oak.
   */
  private mangrove(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.peat(px, fill, rng);
    const P = this.unit(px);
    const S = TILE_SIZE;

    // Crown: heavy, flat-bottomed, and wrapping at the cell edge so a stand of
    // them is one canopy rather than a row of lollipops.
    //
    // Much darker than a woodland crown, and the darkness is doing a job. This
    // tile is the map border for the whole region, which means the player sees
    // more of it than of anything else out here; a treeline mixed from the
    // ordinary leaf ramp came out as a hedge of bright green blobs that
    // competed with the reed beds the route is supposed to read by. A border
    // has to be *mass* and nothing else, so the ramp is squashed into its
    // bottom three steps and the light is rationed to a handful of units.
    for (let y = 0; y <= 9; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 499) * 0.6
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 503) * 0.4;
        // The underside breaks up rather than ending on a ruled line: the last
        // two rows only fill where the noise is strong.
        if (y >= 8 && n < 0.52) continue;
        P(x, y, n > 0.80 ? '#175a1e'
          : n > 0.6 ? '#0f4416'
          : n > 0.36 ? '#0a3512'
          : '#06240d');
      }
    }
    // Light only ever reaches the top-left shoulder of a crown this dense.
    for (let i = 0; i < 5; i++) {
      const lx = 1 + rng.below(6), ly = rng.below(3);
      P(lx, ly, PAL.leafDark);
      P(lx + 1, ly, '#175a1e');
    }

    // Trunk, off-centre and different per alternate, so a thicket is not a
    // colonnade.
    const tx = 6 + (Math.floor(hash2(0, 0, 509) * 3) - 1);
    for (let y = 8; y <= 12; y++) {
      P(tx, y, PAL.trunkDark); P(tx + 1, y, PAL.trunkDeep);
      P(tx - 1, y, PAL.trunkDeep);
    }

    // Stilt roots: an arch each side of the bole, landing in the mud. This is
    // the tile, and it is the one shape nobody mistakes for an oak -- but it
    // is drawn one unit thick and in the trunk's shadow tones, because a root
    // picked out in a lit brown reads as something crawling.
    for (const dir of [-1, 1]) {
      for (let j = 0; j < 5; j++) {
        const x = tx + (dir < 0 ? 0 : 1) + dir * (j + 1);
        const y = 10 + Math.round(Math.sqrt(j) * 2.2);
        if (x < 0 || x >= S || y >= S) continue;
        P(x, y, PAL.trunkDeep);
        if (j < 3) P(x, y - 1, PAL.trunkDark);
      }
    }
    for (let x = 0; x < S; x++) if (hash2(x, 9, 521) > 0.82) P(x, 15, PAL.trunkDeep);
  }

  /**
   * Glowcap.
   *
   * A rotted stump with luminous fungus on it, and the only thing out here
   * that makes its own light. It exists for the fog: the route is laid out so
   * a player who cannot see the boardwalk can still see the next green smudge,
   * and walking glowcap to glowcap is how the middle of the mire gets crossed.
   * Cold green, so it never reads as a lantern -- people's light out here is
   * orange and the mire's light is not, and keeping those two apart is what
   * makes the whole region legible in the dark.
   *
   * Pulses over four frames, on the same clock as the water it stands in.
   */
  private glowcap(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.peat(px, fill, rng);
    const P = this.unit(px);
    const nf = ANIMATED[T.GLOWCAP] ?? 1;
    // A slow breath rather than a blink: a sine, so the loop has no seam.
    const beat = 0.5 + Math.sin((animFrame / nf) * Math.PI * 2) * 0.5;

    // The light on the air, laid down first so everything solid draws over it.
    // Translucent for the same reason the street lamp's halo is: this stands
    // on peat, on sedge and on plank.
    for (let y = 1; y <= 14; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const d = Math.abs(x - 7.5) * 0.9 + Math.abs(y - 9) * 1.15;
        if (d > 8) continue;
        const a = (d > 5.5 ? 0.10 : d > 3 ? 0.20 : 0.32) * (0.75 + beat * 0.45);
        P(x, y, `rgba(60,220,180,${a.toFixed(2)})`);
      }
    }

    // The stump: a broken bole, dark, so the caps have something to be bright
    // against.
    for (let y = 8; y <= 14; y++) {
      for (let x = 5; x <= 10; x++) {
        P(x, y, x <= 6 ? PAL.trunkDeep : hash2(x, y, 523) > 0.6 ? PAL.trunkDark : PAL.peatDeep);
      }
    }
    for (let x = 5; x <= 10; x++) P(x, 8, PAL.trunkMid);

    // Caps: three of them up the stump, each a dome with a pale rim and a
    // stalk under it.
    const caps: [number, number, number][] = [[4, 10, 2], [8, 7, 3], [11, 11, 2]];
    for (const [cx, cy, r] of caps) {
      const face = beat > 0.55 ? PAL.glowPale : PAL.glowLight;
      for (let x = cx - r; x <= cx + r; x++) {
        const d = Math.abs(x - cx);
        P(x, cy, d === r ? PAL.glowDark : d === 0 ? face : PAL.glowMid);
        if (d < r) P(x, cy - 1, d === 0 ? PAL.glowPale : face);
      }
      P(cx, cy + 1, PAL.glowDark);
      P(cx, cy + 2, PAL.glowDeep);
    }

    // Spores off the top cap, moving with the pulse, which is what stops the
    // whole thing reading as a decal.
    const drift = Math.round(beat * 3);
    P(9, 4 - drift, PAL.glowLight);
    P(6, 3 - Math.round(beat * 2), PAL.glowMid);
  }

  /**
   * A piling standing in open water.
   *
   * Ground rather than overlay, and painted with its own water under it. A
   * post out in the channel has no walkable neighbour to borrow a floor from,
   * so an overlay one would land on whatever the map compiler could find --
   * which, in the middle of a lagoon, is turf. This way a stilt is always in
   * the water it was driven into.
   *
   * These are what Mirehaven stands on, and there are meant to be forests of
   * them under the town: the gaps between the platforms are the view down onto
   * the piling field, and that view is what the settlement is built around.
   */
  private stiltPost(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.mireWater(px, fill, rng, false);
    const P = this.unit(px);

    // The reflection first, smeared down the still water under the post.
    for (let y = 12; y <= 15; y++) {
      P(6, y, PAL.mireDeep); P(7, y, PAL.mireDeep); P(8, y, PAL.mireDeep);
    }
    P(7, 13, PAL.mireDark); P(6, 15, PAL.mireDark);

    // The pile: pitched pine, lit down one side, dark down the other, and gone
    // green at the waterline because everything here is.
    for (let y = 0; y <= 12; y++) {
      P(5, y, PAL.outline);
      P(6, y, PAL.tarLight);
      P(7, y, PAL.tarMid);
      P(8, y, PAL.tarDark);
      P(9, y, PAL.outline);
      if (y % 4 === 1) { P(6, y, PAL.tarPale); P(7, y, PAL.tarLight); }
    }
    for (let y = 10; y <= 12; y++) {
      P(6, y, PAL.reedDark); P(7, y, PAL.reedDeep); P(8, y, PAL.mireDeep);
    }
    // Cap, and the iron band under it.
    for (let x = 4; x <= 10; x++) P(x, 0, PAL.outline);
    for (let x = 5; x <= 9; x++) P(x, 1, PAL.tarPale);
    for (let x = 5; x <= 9; x++) P(x, 3, PAL.steelMid);
    P(5, 3, PAL.steelDark); P(9, 3, PAL.steelDark);

    // A cross-brace running away to the next pile, so a field of them reads as
    // a structure rather than as a row of sticks.
    for (let x = 0; x <= 4; x++) P(x, 5 + Math.floor(x / 2), PAL.tarDark);
    for (let x = 10; x < TILE_SIZE; x++) P(x, 7 - Math.floor((x - 10) / 2), PAL.tarDark);
  }

  /**
   * A punt, tied up.
   *
   * Mirehaven has more boats than it has streets, so a moored one is dressing
   * here the way a parked cart is elsewhere: it goes anywhere there is water
   * beside a deck. Flat-bottomed and square-ended, because that is what people
   * pole about a marsh in, and because it is a shape that reads at sixteen
   * units where a pointed hull does not.
   */
  private mooredBoat(px: Px, fill: (c: string) => void, rng: Rng): void {
    this.mireWater(px, fill, rng, false);
    const P = this.unit(px);

    // Hull from above, lying along the cell rather than across it: narrow,
    // long, and tapered at the bow. The first cut of this was a wide box with
    // two full-width thwarts in it and read as a bench -- a punt is *thin*,
    // and the taper at one end is the only thing that says which way it points.
    // Half-beam at each row: one at the bow, widening over four rows, square
    // at the stern. Four rows of taper is the least that reads as a point at
    // this size, and the point is the only thing that says which end is which.
    const beam = (y: number): number =>
      y <= 1 ? 1 : y === 2 ? 2 : y >= 13 ? 3 : 3;

    // Inside of the hull: dark, so the thwarts across it have something to be
    // light against. The first cut filled this with lit timber and came out as
    // a crate.
    for (let y = 1; y <= 14; y++) {
      const b = beam(y);
      for (let x = 7 - b; x <= 8 + b; x++) P(x, y, PAL.trunkDeep);
    }
    // Gunwale: lit down the left, in shadow down the right, capped at the ends.
    for (let y = 1; y <= 14; y++) {
      const b = beam(y);
      P(7 - b, y, PAL.trunkLight);
      P(8 + b, y, PAL.trunkDark);
    }
    for (let x = 6; x <= 9; x++) P(x, 14, PAL.trunkDark);
    P(7, 0, PAL.trunkLight); P(8, 0, PAL.trunkDark);
    for (let x = 4; x <= 11; x++) P(x, 15, PAL.mireDeep);   // its shadow in the water

    // Two thwarts, and they sit *in* the hull rather than on top of it: at
    // three rungs in a lit brown the whole thing read as a ladder floating in
    // the water, and the fix is that the gunwale must be the lightest thing in
    // the cell by a clear step.
    for (const ty of [6, 11]) {
      for (let x = 5; x <= 10; x++) { P(x, ty, PAL.trunkDark); P(x, ty + 1, PAL.trunkDeep); }
    }
    P(6, 8, PAL.steelDark); P(7, 8, PAL.steelMid); P(6, 9, PAL.steelDark);

    // The pole laid the length of the boat, and the painter tying it to
    // whatever is off the bow.
    for (let y = 3; y <= 13; y++) P(9, y, PAL.reedDark);
    P(9, 3, PAL.reedMid);
    for (let x = 10; x < TILE_SIZE; x++) P(x, 2 - Math.floor((x - 10) / 3), PAL.trunkLight);
  }

  /**
   * Mirehaven's lantern.
   *
   * Hung, not planted. There is no ground here to sink a lamp standard into,
   * so the town's light comes off brackets and chain over the walkways, and
   * the silhouette says so at a glance: a bracket, three links, and a fat oil
   * lantern under a smoke cowl. Warm, and the only warm light in the region --
   * the mire's own light is green.
   */
  private mireLantern(px: Px): void {
    const P = this.unit(px);

    // Halo. Wider and lower than the street lamp's, because this hangs over a
    // walkway rather than standing above a road.
    for (let y = 2; y <= 15; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const d = Math.abs(x - 7.5) * 1.0 + Math.abs(y - 8) * 0.95;
        if (d > 9) continue;
        P(x, y, d > 6 ? 'rgba(255,190,110,0.10)'
          : d > 3.5 ? 'rgba(255,200,120,0.20)' : 'rgba(255,214,140,0.30)');
      }
    }

    // Bracket and chain: iron out from the top corner, then links down.
    for (let x = 1; x <= 6; x++) P(x, 1, PAL.tarDark);
    P(6, 1, PAL.steelMid);
    for (let y = 2; y <= 4; y++) P(7, y, y % 2 === 0 ? PAL.steelLight : PAL.steelDark);

    // Cowl, to keep rain off a flame somewhere it always rains.
    for (let x = 4; x <= 11; x++) P(x, 5, PAL.steelDark);
    for (let x = 5; x <= 10; x++) P(x, 4, PAL.steelMid);
    P(5, 5, PAL.steelLight); P(6, 5, PAL.steelLight);

    // The glass: four panes, brightest where the wick is, in an iron cage.
    for (let y = 6; y <= 12; y++) {
      for (let x = 5; x <= 10; x++) {
        const frame = x === 5 || x === 10 || y === 12;
        P(x, y, frame ? PAL.outline
          : x + y < 13 ? '#fff4cc' : x + y < 17 ? '#ffca6e' : '#d9832c');
      }
    }
    for (let y = 7; y <= 11; y++) P(7, y, '#b96f22');
    for (let x = 6; x <= 9; x++) P(x, 9, '#b96f22');
    // The flame: one unit of white, which is what stops the box reading as a
    // yellow brick.
    P(8, 8, '#fffdf2'); P(8, 7, '#fff0bd');
    // Ring at the foot, and a drip of oil-black under it.
    for (let x = 6; x <= 9; x++) P(x, 13, PAL.steelDark);
    P(7, 14, PAL.tarDeep); P(8, 14, PAL.tarDeep);
  }

  /**
   * Reed thatch.
   *
   * Cut from the beds the route walks through, so Mirehaven wears its own
   * marsh on its roofs -- and it is the one bright mass in a town built out of
   * pitch, which is what stops the place reading as a burnt-out one. Combed
   * courses running down the slope, a bound ridge along the top, and a thick
   * ragged butt at the eave, because thatch has no straight edge anywhere on
   * it and that raggedness is the whole difference from slate.
   */
  private thatchRoof(px: Px, fill: (c: string) => void, part: 'mid' | 'left' | 'right'): void {
    fill(PAL.thatchMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // Combed reed runs *down* the slope, so the grain is vertical and the
        // variation is per column. Horizontal banding here is what makes bad
        // thatch look like corduroy laid the wrong way.
        // One tone per *column* for the whole depth of the roof, so the grain
        // is unbroken from ridge to eave. Banding it by row -- which the first
        // cut did -- turns thatch into corduroy laid the wrong way, and that
        // was the single thing making this read as planking.
        const stalk = hash2(x, 0, 541);
        let c: string = stalk > 0.68 ? PAL.thatchLight
          : stalk < 0.3 ? PAL.thatchDark : PAL.thatchMid;
        if (stalk > 0.9) c = PAL.thatchPale;
        else if (stalk < 0.1) c = PAL.thatchDeep;
        // Individual stems standing proud of the comb, sparse and never in a
        // run: a reed roof's texture is a few vertical flecks, and any more
        // than that turns the slope into static.
        if (hash2(x, y, 547) > 0.95) c = PAL.thatchPale;
        else if (hash2(x, y, 557) > 0.96) c = PAL.thatchDeep;
        P(x, y, c);
      }
    }

    // Ridge: a roll of reed held down by split hazel spars, pegged in a zigzag.
    for (let x = 0; x < S; x++) {
      P(x, 0, PAL.outline);
      P(x, 1, PAL.thatchPale);
      P(x, 2, PAL.thatchLight);
      P(x, 3, x % 4 === 1 ? PAL.trunkDark : PAL.thatchMid);
      P(x, 4, x % 4 === 3 ? PAL.trunkDark : PAL.thatchDark);
    }

    // The eave: ragged by a unit, and darkest at the cut, so the roof ends in
    // a shadow the wall below can sit under.
    for (let x = 0; x < S; x++) {
      const jut = hash2(x, 11, 563) > 0.55 ? 1 : 0;
      P(x, 13 + jut, PAL.thatchDeep);
      P(x, 14, PAL.thatchDeep);
      P(x, 15, PAL.outline);
      if (jut === 0) P(x, 13, PAL.thatchDark);
    }

    // The ends are bound and netted against the wind off the water, and that
    // netting is the only thing separating the two of them.
    if (part === 'left') {
      for (let y = 0; y < S; y++) {
        P(0, y, PAL.outline);
        P(1, y, PAL.thatchDeep);
        P(2, y, y % 3 === 0 ? PAL.trunkDark : PAL.thatchLight);
      }
    }
    if (part === 'right') {
      for (let y = 0; y < S; y++) {
        P(15, y, PAL.outline);
        P(14, y, PAL.thatchDeep);
        P(13, y, y % 3 === 0 ? PAL.trunkDark : PAL.thatchDark);
      }
    }
  }

  /**
   * Tarred plank, in four cuts: blank, window, hanging plant and door.
   *
   * Mirehaven builds out of pine dipped in pitch, because anything that is not
   * is eaten by this water in five years. That gives the town the darkest
   * walls in the game and everything else about it follows: the thatch above
   * reads bright, the lanterns read hot, and the hanging baskets are the only
   * green on the frontage.
   *
   * There is no stone plinth on these, unlike every other wall in the region.
   * A Mirehaven house does not meet the ground; it meets a deck, and the last
   * row is the shadow it throws on the planks it is standing on.
   */
  private tarWall(
    px: Px, fill: (c: string) => void,
    cut: 'plain' | 'window' | 'plant' | 'door',
  ): void {
    fill(PAL.tarMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      const board = Math.floor(y / 4);
      const b = y % 4;
      const tone = hash2(board, 0, 569);
      for (let x = 0; x < S; x++) {
        let c: string = b === 0 ? PAL.tarLight : b === 3 ? PAL.tarDeep : PAL.tarMid;
        if (b === 1 && tone > 0.6) c = PAL.tarLight;
        else if (b === 2 && tone < 0.4) c = PAL.tarDark;
        // Where the sun has burned the pitch grey. This is the only relief the
        // material gets, and without it the wall is a black rectangle.
        if ((x * 5 + y * 3) % 19 === 4) c = b === 3 ? PAL.tarDark : PAL.tarPale;
        else if (hash2(x, board, 571) > 0.9 && b !== 3) c = PAL.tarDeep;
        P(x, y, c);
      }
      if (b === 1) { P(3, y, PAL.steelDark); P(12, y, PAL.steelDark); }
    }
    this.wallHead(P, PAL.tarDeep, PAL.outline);
    // No plinth: the shadow the wall throws onto the decking it stands on.
    for (let x = 0; x < S; x++) { P(x, 14, PAL.tarDeep); P(x, 15, PAL.outline); }

    if (cut === 'window') {
      // Small, because a marsh house does not give the weather a big one, and
      // hooded, because it rains here more or less always.
      for (let y = 3; y <= 9; y++) {
        for (let x = 5; x <= 10; x++) {
          const frame = y === 3 || y === 9 || x === 5 || x === 10;
          if (frame) { P(x, y, y === 9 ? PAL.trunkDark : PAL.trunkLight); continue; }
          P(x, y, x + y < 12 ? PAL.glassHi : x + y < 15 ? PAL.glassLight : PAL.glass);
        }
      }
      for (let y = 4; y <= 8; y++) P(7, y, PAL.trunkMid);
      for (let x = 6; x <= 9; x++) P(x, 6, PAL.trunkMid);
      for (let x = 4; x <= 11; x++) P(x, 2, PAL.thatchDark);
      for (let x = 4; x <= 11; x++) P(x, 1, PAL.thatchLight);
    }

    if (cut === 'plant') {
      // A basket on an iron hook, trailing. The one green thing on the wall,
      // and the reason a street of pitch does not read as a warehouse row.
      P(4, 2, PAL.steelDark); P(5, 2, PAL.steelMid);
      for (let y = 2; y <= 4; y++) P(6, y, PAL.steelLight);
      for (let y = 5; y <= 7; y++) {
        for (let x = 3; x <= 10; x++) {
          const edge = x === 3 || x === 10;
          P(x, y, edge ? PAL.trunkDark : y === 5 ? PAL.trunkLight : PAL.trunkMid);
        }
      }
      // Foliage over the rim and down the wall, lit at the top left.
      for (let x = 2; x <= 11; x++) {
        const h = 2 + Math.floor(hash2(x, 1, 577) * 5);
        for (let y = 4; y >= 4 - Math.floor(h / 2); y--) {
          P(x, y, hash2(x, y, 587) > 0.55 ? PAL.leafLight : PAL.leafMid);
        }
        for (let y = 8; y <= 8 + h; y++) {
          P(x, y, hash2(x, y, 593) > 0.6 ? PAL.leafMid : PAL.leafDeep);
        }
      }
      for (let i = 0; i < 3; i++) {
        const fx = 3 + Math.floor(hash2(i, 2, 599) * 8);
        P(fx, 9 + Math.floor(hash2(i, 3, 601) * 3), '#f0a4c8');
      }
    }

    if (cut === 'door') {
      // A plank door with a rain hood and a raised sill, because the water
      // comes over the deck two or three times a winter and everyone knows it.
      for (let y = 4; y <= 14; y++) {
        for (let x = 4; x <= 11; x++) {
          const frame = x === 4 || x === 11;
          P(x, y, frame ? PAL.trunkDark
            : y === 4 ? PAL.trunkLight
            : (x - 4) % 3 === 0 ? PAL.trunkDeep : PAL.trunkMid);
        }
      }
      for (const by of [7, 11]) for (let x = 5; x <= 10; x++) P(x, by, PAL.steelDark);
      P(9, 9, PAL.steelLight); P(10, 9, PAL.steelMid);
      for (let x = 3; x <= 12; x++) { P(x, 2, PAL.thatchLight); P(x, 3, PAL.thatchDeep); }
      for (let x = 4; x <= 11; x++) { P(x, 14, PAL.stoneLight); P(x, 15, PAL.outline); }
    }
  }

  /**
   * A marker post.
   *
   * Every sign in the game until now has stood on grass, because the sign tile
   * carries turf with it -- which is fine everywhere there is turf and absurd
   * on a plank walk over open water. So the mire has its own, and it is the
   * better object anyway: a pitched post with a numbered board nailed to it,
   * the thing Mirehaven counts the boardwalk in and the thing a lost player
   * finds first when the fog closes.
   *
   * An overlay with no floor of its own, so it stands on plank, peat and sedge
   * without dragging a square of the wrong ground along with it. The mark on
   * the board changes per alternate: a route signed with the same digit eleven
   * times over is worse than a route signed nowhere.
   */
  private mirePost(px: Px): void {
    const P = this.unit(px);

    // Post: pitched, and leaning a unit per alternate, because nothing driven
    // into peat has stayed upright for long.
    const lean = Math.floor(hash2(0, 0, 617) * 3) - 1;
    for (let y = 1; y <= 15; y++) {
      const x = 7 + Math.round((lean * (15 - y)) / 12);
      P(x, y, PAL.tarLight);
      P(x + 1, y, PAL.tarDeep);
      if (y % 5 === 2) P(x, y, PAL.tarPale);
    }

    // Board: pale, so it is the one thing on the post that carries through
    // fog, with the grain of the plank showing under the paint.
    for (let y = 2; y <= 8; y++) {
      for (let x = 3; x <= 12; x++) {
        const edge = y === 2 || y === 8 || x === 3 || x === 12;
        P(x, y, edge ? PAL.trunkDark
          : hash2(x, y, 619) > 0.86 ? PAL.plankLight : PAL.plankPale);
      }
    }
    for (let x = 3; x <= 12; x++) P(x, 9, PAL.trunkDeep);   // its own shadow

    // The number, drawn as a stroke pattern rather than as type: at five units
    // tall a real glyph is mush, and what has to read is "there is a mark on
    // this board" -- which four different marks do perfectly well.
    const mark = Math.floor(hash2(1, 0, 623) * 4);
    const strokes: number[][][] = [
      [[6, 4], [6, 5], [6, 6], [5, 4], [8, 4], [8, 5], [8, 6]],
      [[5, 4], [6, 4], [7, 4], [8, 5], [7, 5], [5, 6], [6, 6], [7, 6]],
      [[5, 4], [5, 5], [5, 6], [6, 6], [7, 6], [8, 5], [8, 4]],
      [[5, 4], [8, 4], [5, 5], [6, 5], [7, 5], [8, 6], [5, 6]],
    ];
    for (const s of strokes[mark]!) P(s[0]!, s[1]!, PAL.tarDeep);
    // A second, smaller mark under it: the year the span was last relaid.
    for (let x = 5; x <= 10; x += 2) P(x, 7, PAL.tarDark);
  }

  /* ------------------------------------------------- Embercoil Pass ---- */

  /**
   * Ash.
   *
   * The ground of the whole route, and the tile the rest of the family is
   * measured against, so it obeys the house rule the turf obeys: light, low
   * contrast, and doing nothing that competes with a sprite standing on it. The
   * two things that make it read as ash rather than as grey sand are the drift
   * lines and the grit. Wind-blown ash lies in long shallow ridges with a lit
   * windward face and a shadow behind, which is the only structure in the tile;
   * the grit is the coarse fraction the wind could not lift, so it is black
   * basalt rather than another value of grey, and it is what stops the surface
   * reading as fog lying on a floor.
   *
   * `coarse` is the drift variant: the same ground with far more clinker in it,
   * for where the map wants the ash to look walked over, spoiled, or banked
   * against something. It is a separate tile rather than an alternate because
   * an author needs to be able to *place* it -- along a road, round a camp --
   * and an alternate is chosen by position hash and cannot be placed at all.
   *
   * Everything here is hashed from position. Nothing in this family touches the
   * shared Rng, which is what makes appending the whole family safe.
   */
  private ash(px: Px, fill: (c: string) => void, coarse: number): void {
    fill(PAL.ashMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 611) * 0.6
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 617) * 0.4;
        if (n > 0.68) P(x, y, PAL.ashPale);
        else if (n > 0.56) P(x, y, PAL.ashLight);
        else if (n < 0.36) P(x, y, PAL.ashDark);
      }
    }

    /**
     * One drift ridge: crest, body, shadow.
     *
     * Three tones, for the same reason the beach ripples use three -- a pale
     * line over a dark line is a drawn stroke, and only a crest that falls away
     * through the mid tone into shadow reads as a surface with relief in it.
     * The wave has a whole period across the cell, so a field of ash of any
     * size has no step at any seam.
     */
    const drift = (ry: number, phase: number, amp: number, gap: number) => {
      for (let x = 0; x < S; x++) {
        if ((x + gap) % 7 === 0) continue;
        const y = ry + Math.round(Math.sin((x / S) * Math.PI * 2 + phase) * amp);
        P(x, y, PAL.ashPale);
        P(x, y + 1, PAL.ashLight);
        P(x, y + 2, PAL.ashDark);
      }
    };
    for (let i = 0; i < 3; i++) {
      drift(1 + Math.floor(hash2(i, 3, 623) * (S - 3)),
        hash2(i, 4, 629) * 6.28, 1.7, i * 2);
    }

    // Clinker. A chip is three units -- a lit crown, the stone, its own shadow
    // -- because a single black dot at this size is dirt on the screen rather
    // than a stone lying on the ground.
    const chips = coarse ? 22 : 7;
    for (let i = 0; i < chips; i++) {
      const cx = Math.floor(hash2(i, 11, 631) * S);
      const cy = Math.floor(hash2(i, 12, 641) * S);
      P(cx, cy, PAL.basaltLight);
      P(cx + 1, cy, PAL.basaltDark);
      P(cx, cy + 1, PAL.basaltDeep);
      if (coarse && hash2(i, 13, 643) > 0.6) {
        P(cx + 1, cy + 1, PAL.basaltDark);
        P(cx + 2, cy, PAL.basaltMid);
      }
    }
    // The chips that have been steamed. Three per cell at most: it is the one
    // warm thing in the ash, and it is what ties the ground to the rock.
    if (coarse) {
      for (let i = 0; i < 3; i++) {
        P(Math.floor(hash2(i, 21, 647) * S), Math.floor(hash2(i, 22, 653) * S), PAL.basaltRust);
      }
    }
  }

  /**
   * The road.
   *
   * Crushed clinker, and the point of it is that it is *darker* than the ground
   * it runs through. Every other road in Caelora is a gold stripe on a green
   * field; this one is a dark stripe on a pale one, and that reversal is the
   * single loudest thing the route says about where the player has arrived.
   *
   * The structure is two wheel ruts with the crown between them, which is what
   * a hauled road looks like from above and what keeps a long straight run from
   * reading as a painted band.
   */
  private cinderRoad(px: Px, fill: (c: string) => void): void {
    fill(PAL.cinderMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 661) * 0.62
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 673) * 0.38;
        let c: string = n > 0.66 ? PAL.cinderLight : n < 0.36 ? PAL.cinderDark : PAL.cinderMid;
        // Grit: the individual lumps the road is made of. Sparse, and from both
        // ends of the ramp, so the surface reads as loose material.
        if (hash2(x, y, 677) > 0.93) c = PAL.cinderPale;
        else if (hash2(x, y, 683) > 0.94) c = PAL.cinderDeep;
        P(x, y, c);
      }
    }
    // Two ruts, wandering. A compacted lane rather than a ruled line, so they
    // survive being seen at 1x.
    for (let y = 0; y < S; y++) {
      const w = Math.sin((y / S) * Math.PI * 2) * 1.2;
      for (const base of [4, 11]) {
        const x = Math.round(base + w);
        P(x, y, PAL.cinderDark);
        if ((y * 3) % 5 !== 0) P(x + 1, y, PAL.cinderDeep);
      }
    }
  }

  /**
   * What still grows out here.
   *
   * Cured scrub standing in ash: black stems, olive going to straw, and a seed
   * head on about a third of them. It is the encounter tile, so its job is to
   * be recognised instantly at 1x from anywhere on the screen -- which on a
   * pale grey ground means being the darkest mass in view, and that is why the
   * ramp bottoms out nearly at the basalt.
   *
   * Deliberately drawn short, and drawn *under* the player. The waist-deep wade
   * tall grass gets belongs to a crop you push through; this is knee-high
   * brittle brush on open ground, and a character striding over it is the
   * honest picture.
   */
  private emberScrub(px: Px, fill: (c: string) => void): void {
    this.ash(px, fill, 0);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const W = (x: number, y: number, c: string) => P(((x % S) + S) % S, y, c);

    /** One bush: a splay of stems from a root, tips carrying the seed. */
    const bush = (bx: number, by: number, r: number, seed: number) => {
      for (let i = 0; i < 7; i++) {
        const lean = (hash2(i, seed, 701) - 0.5) * 2.2 * r;
        const h = r + Math.floor(hash2(i, seed, 709) * r);
        for (let k = 0; k <= h; k++) {
          const t = k / Math.max(1, h);
          const x = Math.round(bx + lean * t);
          const y = by - k;
          if (y < 0) continue;
          const c = k === h ? (hash2(i, seed, 719) > 0.62 ? PAL.scrubTip : PAL.scrubHead)
            : t > 0.62 ? PAL.scrubLight
            : t > 0.3 ? PAL.scrubMid
            : PAL.scrubDark;
          W(x, y, c);
          // A stem one unit wide vanishes at 1x; the shaded side gives it body
          // without doubling the mass.
          if (t < 0.6) W(x + 1, y, PAL.scrubDeep);
        }
      }
      // Contact: ash banked against the foot of the bush.
      for (let x = bx - r; x <= bx + r; x++) W(x, by, PAL.scrubDeep);
    };

    bush(4, 13, 5, 1);
    bush(12, 15, 6, 2);
    bush(9, 8, 4, 3);
  }

  /**
   * Running lava.
   *
   * A wall the player must never mistake for a floor, so it is built the way
   * deep water is built: it takes its danger from value and chroma rather than
   * from an outline it cannot have when it is laid by the acre. The body is the
   * deepest ember in the ramp with set rock riding on it, and the only bright
   * marks are the seams -- so a flow reads as black rock split open, not as an
   * orange carpet.
   *
   * The seams travel. Four frames, one whole period, so a flow moves in one
   * direction forever and never stutters at the loop; and it shares its clock
   * with the vents and the springs, so the route breathes as one system.
   */
  private lava(px: Px, fill: (c: string) => void): void {
    fill(PAL.emberDeep);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const nf = ANIMATED[T.LAVA] ?? 1;
    const drift = animFrame / nf;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 733) * 0.65
          + wrapNoise((x + 3) * DETAIL, y * DETAIL, 4, 739) * 0.35;
        // Molten first, crust second.
        //
        // The first cut of this tile had it the other way round -- mostly dark
        // plate with a few orange seams -- on the theory that a flow should get
        // its danger from value the way deep water does. At 1x it read as
        // burnt brick: a dark red-brown band the eye walks straight over. Water
        // can afford to be dark because water is not the hazard; this is, and
        // the one thing every player already knows on sight is that orange
        // means do not. So two thirds of the cell is fire and the set rock is
        // reduced to scum floating on it, which is also what a real flow looks
        // like from above.
        let c: string = n > 0.70 ? PAL.emberPale
          : n > 0.55 ? PAL.emberLight
          : n > 0.40 ? PAL.emberMid
          : PAL.emberDark;
        // Plates of set rock riding on the surface, in the low band only, so
        // they read as islands on the fire rather than as the ground it is in.
        if (n < 0.26) c = PAL.basaltDark;
        else if (n < 0.33) c = PAL.basaltDeep;
        // The seams, travelling down the flow. Banding on distance from a
        // moving threshold rather than on a drawn line keeps the cracks
        // organic and keeps them wrapping at every edge.
        const t = Math.abs(((n + drift) % 1) - 0.5);
        if (t < 0.014) c = PAL.emberWhite;
        else if (t < 0.042) c = PAL.emberPale;
        P(x, y, c);
      }
    }
  }

  /**
   * Cooled crust: the road's only way across a flow.
   *
   * The same material as the lava with the argument reversed -- here the rock
   * has won and the fire is only what shows through the cracks. It has to be
   * obviously walkable at a glance beside a tile that is obviously not, so the
   * body sits a long way up the basalt ramp, the glow is confined to two thin
   * seams, and there is no bright field anywhere in it.
   */
  private lavaCrust(px: Px, fill: (c: string) => void): void {
    fill(PAL.basaltMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 751) * 0.6
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 757) * 0.4;
        let c: string = n > 0.66 ? PAL.basaltLight : n > 0.44 ? PAL.basaltMid : PAL.basaltDark;
        if (hash2(x, y, 761) > 0.94) c = PAL.basaltPale;
        // Ropy texture: the fold lines cooled lava sets into.
        if ((x * 3 + Math.round(Math.sin((y / S) * Math.PI * 2) * 3)) % 7 === 0) {
          c = n > 0.5 ? PAL.basaltPale : PAL.basaltLight;
        }
        // The fissures, still warm -- but only in one cut of three.
        //
        // Banding on a noise contour puts a crack through every cell that uses
        // the tile, and a floor with a glowing seam in every single square is
        // a floor that looks as dangerous as the flow beside it. Confining the
        // cracks to one alternate leaves two thirds of the crust cold, so the
        // warm stretches read as the exception they are meant to be -- and the
        // player can still tell at a glance which side of the bank is walkable.
        if (variantSeed % 3 === 0) {
          const t = Math.abs(n - 0.5);
          if (t < 0.010) c = PAL.emberDark;
          else if (t < 0.026) c = PAL.emberDeep;
        }
        P(x, y, c);
      }
    }
  }

  /**
   * A fumarole.
   *
   * A sinter cone with steam standing over it. Solid, because a vent is a thing
   * on the map and not a floor pattern, and because the plume needs a footprint
   * the player walks around -- steam rising out of a tile you can stand on
   * reads as a bug.
   *
   * The plume never reaches the top of the cell. A plume cut off flat by the
   * tile edge is what makes a vent look like wallpaper, and stopping it short
   * means two vents side by side read as two vents.
   */
  private fumarole(px: Px, fill: (c: string) => void): void {
    this.ash(px, fill, 1);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const nf = ANIMATED[T.FUMAROLE] ?? 1;
    const phase = animFrame / nf;

    // The cone: sinter, pale and chalky, built up round the hole.
    for (let y = 9; y < S; y++) {
      const half = Math.round((y - 8) * 1.05) + 1;
      for (let x = 8 - half; x <= 7 + half; x++) {
        if (x < 0 || x >= S) continue;
        const lit = (8 - x) / 8 + (y - 12) / 10;
        P(x, y, lit > 0.35 ? PAL.sinter : lit > -0.1 ? PAL.basaltPale : PAL.basaltMid);
      }
    }
    // The mouth, and the light coming out of it.
    for (let x = 6; x <= 9; x++) {
      P(x, 10, PAL.basaltDeep);
      P(x, 11, x === 7 || x === 8 ? PAL.emberDark : PAL.basaltDeep);
    }
    // Rust where the steam has been condensing for a hundred years.
    for (let i = 0; i < 5; i++) {
      P(3 + Math.floor(hash2(i, 1, 769) * 10),
        12 + Math.floor(hash2(i, 2, 773) * 4), PAL.basaltRust);
    }

    // The plume: blobs on a slow rise, thinning as they go.
    for (let i = 0; i < 5; i++) {
      const rise = (i / 5 + phase) % 1;
      const cy = Math.round(10 - rise * 8);
      if (cy < 1) continue;
      const cx = 7 + Math.round(Math.sin(rise * 4 + i) * 2.2);
      const r = 1 + Math.round(rise * 2);
      const shade = rise > 0.72 ? PAL.ashLight : rise > 0.4 ? PAL.ashPale : '#f4eef0';
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r + 1) continue;
          if (hash2(cx + x, cy + y, 787 + i) < rise * 0.55) continue;
          P(cx + x, cy + y, shade);
        }
      }
    }
  }

  /**
   * A dead tree.
   *
   * The last thing standing from before the flow came through, and the only
   * silhouette on an otherwise flat horizon -- which is exactly what it is for.
   * Charred black at the foot and bleached bone-pale at the top, because that
   * is what a snag does after a decade, and because a wholly black tree on a
   * pale ground is a hole punched in the map.
   */
  private charSnag(px: Px, fill: (c: string) => void): void {
    void fill;
    const P = this.unit(px);
    const S = TILE_SIZE;

    /** One limb, from (x,y) outward, tapering and paling as it goes. */
    const limb = (x0: number, y0: number, dx: number, dy: number, len: number, seed: number) => {
      let x = x0, y = y0;
      for (let k = 0; k < len; k++) {
        const t = k / len;
        const c = t > 0.7 ? PAL.ashPale : t > 0.4 ? PAL.ashDark : PAL.basaltDark;
        P(Math.round(x), Math.round(y), c);
        if (t < 0.5) P(Math.round(x) + 1, Math.round(y), PAL.basaltDeep);
        x += dx + (hash2(k, seed, 797) - 0.5) * 0.7;
        y += dy;
      }
    };

    // Trunk. Wider at the foot, and it stops short of the top of the cell.
    for (let y = 2; y < S; y++) {
      const w = y > 12 ? 2 : y > 7 ? 1 : 0;
      for (let x = 7 - w; x <= 8 + w; x++) {
        const lit = (7 - x) / 4 + (y < 6 ? 0.5 : 0);
        P(x, y, lit > 0.4 ? PAL.ashDark : lit > -0.2 ? PAL.basaltDark : PAL.basaltDeep);
      }
    }
    limb(7, 7, -0.9, -0.6, 6, 1);
    limb(8, 5, 1.0, -0.5, 5, 2);
    limb(8, 10, 1.1, -0.3, 4, 3);
    limb(7, 12, -1.1, -0.2, 3, 4);
    this.footShadow(P, 4, 11, 15);
  }

  /**
   * Black rock, loose on the ash.
   *
   * The same silhouette job the grey field rock does, in a material that cannot
   * borrow its ramp: a stone wearing Route 1's lichen, sitting in ash, reads as
   * a boulder imported from another game. This one is a fractured block rather
   * than a rounded one -- basalt breaks on planes -- and the only colour on it
   * is the rust the steam leaves on the weather side.
   */
  private basaltRock(px: Px, fill: (c: string) => void, big: boolean): void {
    this.ash(px, fill, big ? 1 : 0);
    const P = this.unit(px);
    const r = big ? 7 : 4;
    const cy = big ? 9 : 11;

    for (let y = -r - 1; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        // Angular: a radius stepped by facets rather than wobbled smoothly.
        const ang = Math.atan2(y, x);
        const facet = 1 + Math.sin(ang * 2.6 + 0.7) * 0.13 + Math.sin(ang * 4.1) * 0.08;
        if (x * x + y * y * 1.4 > (r * facet) ** 2) continue;
        const lit = (-x - y * 1.2) / (r * 1.5);
        let c: string = lit > 0.45 ? PAL.basaltPale
          : lit > 0.14 ? PAL.basaltLight
          : lit > -0.18 ? PAL.basaltMid
          : lit > -0.5 ? PAL.basaltDark : PAL.basaltDeep;
        if (lit > 0.0 && hash2(x >> 1, y >> 1, 809) > 0.9) c = PAL.basaltRust;
        P(8 + x, cy + y, c);
      }
    }
    // The fracture planes. Straight, because that is how this rock breaks.
    for (let i = 0; i < (big ? 3 : 2); i++) {
      const y0 = cy - r + 1 + Math.floor(hash2(i, 1, 811) * (r * 1.4));
      const slope = hash2(i, 2, 821) > 0.5 ? 0.4 : -0.4;
      for (let k = -r + 1; k < r - 1; k++) {
        if ((k * 3) % 7 === 0) continue;
        const x = 8 + k;
        const y = Math.round(y0 + k * slope);
        P(x, y, PAL.basaltDeep);
        P(x, y - 1, PAL.basaltLight);
      }
    }
    // Outline, so a crag at the edge of the map is a hard shape against sky.
    for (let x = -r - 1; x <= r + 1; x++) {
      const yy = Math.floor(Math.sqrt(Math.max(0, r * r - x * x) / 1.4));
      if (yy <= 0) continue;
      P(8 + x, cy + yy, PAL.outline);
      P(8 + x, cy - yy, PAL.outline);
    }
    this.footShadow(P, 8 - r, 8 + r, cy + Math.floor(r * 0.85));
  }

  /**
   * The wall of the pass.
   *
   * The grey cliff already in the tileset is the right drawing and entirely the
   * wrong material here: a pass cut through a lava field is walled with the
   * flow it was cut through, and limestone strata beside an orange flow pulls
   * the whole picture back towards Stonewake.
   *
   * So this is columnar basalt, which is the one rock formation drawn with
   * *vertical* joints rather than horizontal ones -- a palisade of six-sided
   * columns. That single change of direction says "volcanic" more forcefully
   * than any amount of colour would, and it means the walls of this pass cannot
   * be mistaken for the walls of the quarry two acts back even in a thumbnail.
   */
  private basaltCliff(px: Px, fill: (c: string) => void, top: boolean): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    fill(PAL.basaltMid);

    if (top) {
      // Seen from above: the broken ends of the columns, a pavement of
      // polygons with ash blown into the joints.
      for (let y = 0; y < S; y++) {
        const stagger = (Math.floor(y / 5) % 2) * 2;
        for (let x = 0; x < S; x++) {
          const cellX = Math.floor((x + stagger) / 5);
          const cellY = Math.floor(y / 5);
          const n = hash2(cellX, cellY, 823);
          let c: string = n > 0.66 ? PAL.basaltLight : n > 0.33 ? PAL.basaltMid : PAL.basaltDark;
          if (wrapNoise(x * DETAIL, y * DETAIL, 8, 827) > 0.66) c = PAL.basaltPale;
          const inX = (x + stagger) % 5;
          if (inX === 0 || y % 5 === 0) c = PAL.basaltDeep;
          else if (inX === 1) c = n > 0.5 ? PAL.basaltPale : PAL.basaltLight;
          if (hash2(x, y, 829) > 0.94) c = PAL.ashLight;
          P(x, y, c);
        }
      }
      return;
    }

    /**
     * The face: columns running the full height of the cell, so a wall of any
     * height is continuous.
     *
     * Widths come from a fixed set that sums to the cell and the rotation is
     * hashed per variant, so the three alternates are three different palisades
     * that still meet each other without a step.
     */
    const RUNS = [[3, 4, 3, 3, 3], [4, 3, 5, 4], [3, 3, 4, 3, 3], [5, 3, 4, 4], [4, 4, 3, 5]];
    const run = RUNS[Math.floor(hash2(0, 1, 839) * RUNS.length) % RUNS.length]!;
    const rot = Math.floor(hash2(0, 2, 853) * S);
    const edge = new Set<number>();
    const colOf = new Array<number>(S).fill(0);
    let acc = rot, id = 0;
    for (const w of run) { edge.add(((acc % S) + S) % S); acc += w; }
    for (let k = 0; k < S; k++) {
      const x = ((rot + k) % S + S) % S;
      if (k > 0 && edge.has(x)) id++;
      colOf[x] = id;
    }

    for (let x = 0; x < S; x++) {
      const c = colOf[x]!;
      const tint = hash2(c, 3, 857);
      const isJoint = edge.has(x);
      const isLit = edge.has(((x - 1) % S + S) % S);
      for (let y = 0; y < S; y++) {
        // A slow vertical wash, so a tall wall is not one value top to base.
        const n = wrapNoise(x * DETAIL, y * DETAIL, 16, 859);
        let col: string = tint > 0.55
          ? (n > 0.5 ? PAL.basaltMid : PAL.basaltDark)
          : (n > 0.5 ? PAL.basaltDark : PAL.basaltDeep);
        if (isJoint) col = PAL.basaltDeep;
        else if (isLit) col = tint > 0.5 ? PAL.basaltLight : PAL.basaltMid;
        // Cross-fractures: every column is broken into lengths. Without them a
        // face is a barcode.
        else if ((y + c * 5) % 11 === 0) col = PAL.basaltDeep;
        else if ((y + c * 5) % 11 === 1) col = PAL.basaltLight;
        else if (hash2(x, y, 863) > 0.965) col = PAL.basaltRust;
        P(x, y, col);
      }
    }
  }

  /**
   * A bank you can drop off but not climb.
   *
   * The turf ledge already in the set is a grass lip over a soil face, and out
   * here that is two materials the route does not contain. This is the same
   * idea in ash and clinker -- a wind-cut bank with the coarse fraction
   * slumping out of the bottom of it -- and the one thing it inherits exactly
   * is the *shape*, because a ledge is read at a glance and the player has been
   * reading that silhouette since Route 1.
   */
  private ashLedge(px: Px, fill: (c: string) => void): void {
    this.ash(px, fill, 1);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let x = 0; x < S; x++) {
      const lip = 4 + Math.round(Math.sin((x / S) * Math.PI * 2) * 1.2);
      P(x, lip, PAL.ashPale);
      P(x, lip + 1, PAL.ashLight);
      // The cut face under it, in shadow, clinker showing through.
      for (let y = lip + 2; y < lip + 7 && y < S; y++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 877);
        P(x, y, n > 0.62 ? PAL.ashDark : n > 0.36 ? PAL.ashDeep : PAL.basaltDark);
      }
      // Spoil at the foot of the face.
      if ((x * 5) % 7 < 3) P(x, lip + 7, PAL.basaltDark);
    }
    for (let i = 0; i < 6; i++) {
      const cx = Math.floor(hash2(i, 5, 881) * S);
      const cy = 6 + Math.floor(hash2(i, 6, 883) * 5);
      P(cx, cy, PAL.basaltDeep);
      P(cx, cy - 1, PAL.ashLight);
    }
  }

  /**
   * A hot pool.
   *
   * The one place on this route the palette is allowed to be beautiful.
   * Mineral water over white sinter is milky green-blue and *pale* -- brighter
   * than the ash round it -- which is what makes a terrace of pools the thing
   * the eye goes to from anywhere on the screen.
   *
   * Two depths, and they have to be told apart from across the map, because one
   * is a wade and the other is a wall until the player can swim. So they are
   * separated the way the sea's two depths are: the deep one takes its darkness
   * from chroma, and its brightest mark still sits below the shallow one's body
   * colour. Nothing on the deep pool is ever allowed to say "you may walk here"
   * -- which is why the sinter floor showing through only exists in the
   * shallows.
   */
  private mineralPool(px: Px, fill: (c: string) => void, deep: boolean): void {
    fill(deep ? PAL.springDeep : PAL.springMid);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const nf = ANIMATED[deep ? T.SPRING_DEEP : T.SPRING_SHALLOW] ?? 1;
    const phase = (animFrame / nf) * Math.PI * 2;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 887) * 0.6
          + wrapNoise(x * DETAIL, (y + animFrame * 2) * DETAIL, 4, 907) * 0.4;
        let c: string;
        if (deep) {
          c = n > 0.62 ? PAL.springDark : n > 0.4 ? PAL.springDeep : '#1e5a58';
        } else {
          c = n > 0.66 ? PAL.springLight : n > 0.42 ? PAL.springMid : PAL.springDark;
          if (n > 0.80) c = PAL.sinter;
        }
        P(x, y, c);
      }
    }
    // Steam scud on the surface, drifting. Held to the pale end of the ramp on
    // the shallows and one step down on the deep, so the two never meet in
    // brightness.
    const scud = deep ? PAL.springMid : PAL.springPale;
    for (let i = 0; i < 4; i++) {
      const y = 2 + Math.floor(hash2(i, 1, 911) * (S - 4));
      const off = Math.round(Math.sin(phase + i) * 3);
      for (let x = 0; x < S; x++) {
        if ((x + off + i * 3) % 6 > 2) continue;
        P(x, y, scud);
        if (!deep) P(x, y + 1, PAL.springLight);
      }
    }
  }

  /**
   * The Foundation's fencing.
   *
   * Galvanised mesh on driven posts, which is the tone of the Meridian camps in
   * one object: nothing sinister and nothing ceremonial, just the cheapest
   * possible way of saying "this is ours now", put up in a hurry across
   * somebody else's country. It borrows the laboratory's steel ramp and the
   * Institute's teal on purpose -- it is the same organisation, and the player
   * should feel that before anybody says it.
   */
  private meshFence(px: Px, fill: (c: string) => void, horizontal: boolean): void {
    void fill;
    const P = this.unit(px);
    const S = TILE_SIZE;
    /** One unit in (along the run, across it). */
    const A = (t: number, d: number, c: string) =>
      (horizontal ? P(t, d, c) : P(d, t, c));

    // The mesh: a diamond lattice, drawn on the authoring grid so it reads as a
    // lattice and not as a grey haze.
    for (let t = 0; t < S; t++) {
      for (let d = 3; d < 13; d++) {
        if ((t + d) % 4 !== 0 && (t - d + 64) % 4 !== 0) continue;
        A(t, d, d < 6 ? PAL.steelLight : PAL.steelMid);
      }
    }
    // Top and bottom rails.
    for (let t = 0; t < S; t++) {
      A(t, 3, PAL.steelPale);
      A(t, 4, PAL.steelDark);
      A(t, 12, PAL.steelDark);
    }
    // Posts at the cell ends, so a run has uprights at a believable spacing.
    for (const t of [0, 1]) {
      for (let d = 1; d <= 14; d++) A(t, d, t === 0 ? PAL.steelMid : PAL.steelDeep);
      A(t, 0, PAL.steelPale);
    }
    if (horizontal) this.footShadow(P, 0, 15, 13);
  }

  /**
   * A survey mast.
   *
   * A guyed lattice tower with an instrument head. It is the tallest thing on
   * the route and it is deliberately drawn to the very top of the cell, so a
   * camp is visible over a rise before the player can see what else is in it --
   * which is most of the reason for putting these here at all.
   */
  private surveyMast(px: Px): void {
    const P = this.unit(px);

    // Guys first, so the lattice is drawn over them.
    for (let k = 0; k < 8; k++) {
      P(8 - k, 7 + k, PAL.steelDark);
      P(7 + k, 7 + k, PAL.steelDark);
    }
    // Two legs and the bracing between them.
    for (let y = 3; y < 16; y++) {
      P(6, y, PAL.steelMid);
      P(9, y, PAL.steelDeep);
      if (y % 3 === 0) { P(7, y, PAL.steelLight); P(8, y, PAL.steelDark); }
      else if (y % 3 === 1) P(7, y, PAL.steelDark);
    }
    // The head: a drum and a crossarm, in the Foundation's teal.
    for (let x = 4; x <= 11; x++) P(x, 2, PAL.steelLight);
    for (let x = 6; x <= 9; x++) { P(x, 0, PAL.labAccent); P(x, 1, PAL.labAccentDark); }
    P(4, 1, PAL.steelPale);
    P(11, 1, PAL.steelPale);
    this.footShadow(P, 4, 11, 15);
  }

  /**
   * A generator.
   *
   * Running, with nobody near it. A skid-mounted set with a radiator, an
   * exhaust and a fuel drum lashed to the frame -- about the least dramatic
   * object it is possible to draw, which is exactly why it belongs here. What
   * is frightening about these camps is that they are ordinary.
   */
  private generator(px: Px): void {
    const P = this.unit(px);

    // Skid.
    for (let x = 1; x <= 14; x++) { P(x, 14, PAL.steelDeep); P(x, 13, PAL.steelDark); }
    // Body.
    for (let y = 6; y <= 12; y++) {
      for (let x = 2; x <= 13; x++) {
        const lit = (4 - y) / 6 + (6 - x) / 10;
        P(x, y, lit > 0.15 ? PAL.steelMid : lit > -0.35 ? PAL.steelDark : PAL.steelDeep);
      }
    }
    // Radiator louvres on the near end.
    for (let y = 7; y <= 11; y += 2) for (let x = 3; x <= 6; x++) P(x, y, PAL.panelInk);
    // The paint band, and one indicator that is lit.
    for (let x = 2; x <= 13; x++) P(x, 6, PAL.labAccent);
    P(11, 8, PAL.panelInk);
    P(12, 8, PAL.emberLight);
    // Exhaust, and the shimmer over it.
    for (let y = 2; y <= 5; y++) P(10, y, PAL.steelDark);
    P(10, 1, PAL.steelLight);
    for (let i = 0; i < 3; i++) {
      const rise = (i / 3 + animFrame / 4) % 1;
      P(10 + Math.round(Math.sin(rise * 6) * 1.6), Math.max(0, Math.round(1 - rise)), PAL.ashPale);
    }
    // Fuel drum.
    for (let y = 8; y <= 13; y++) {
      P(14, y, PAL.cinderLight);
      P(15, y, PAL.cinderDark);
    }
    P(14, 8, PAL.dirtLight);
    this.footShadow(P, 1, 15, 15);
  }

  /**
   * Spoil.
   *
   * What comes out of a trench and has to go somewhere. A graded heap, layered
   * in the order the ground was cut -- ash on top, clinker and broken basalt
   * beneath -- with a plank walked up its flank. The layering is the
   * storytelling: this ground has been opened and turned over, and the heap
   * says so without a sign standing next to it.
   */
  private spoilHeap(px: Px): void {
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 4; y < S; y++) {
      const half = Math.round((y - 3) * 0.95);
      for (let x = 8 - half; x <= 7 + half; x++) {
        if (x < 0 || x >= S) continue;
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 919);
        const lit = (8 - x) / 9 + (y - 12) / 12;
        let c: string;
        if (y < 8) c = lit > 0.1 ? PAL.ashPale : PAL.ashLight;
        else if (y < 11) c = n > 0.5 ? PAL.ashMid : PAL.ashDark;
        else c = n > 0.6 ? PAL.basaltMid : n > 0.3 ? PAL.basaltDark : PAL.basaltDeep;
        if (hash2(x, y, 929) > 0.93) c = PAL.basaltRust;
        P(x, y, c);
      }
    }
    // The plank up the flank.
    for (let k = 0; k < 7; k++) {
      P(11 + Math.floor(k * 0.6), 14 - k, PAL.woodMid);
      P(12 + Math.floor(k * 0.6), 14 - k, PAL.woodDark);
    }
    this.footShadow(P, 3, 13, 15);
  }

  /**
   * Foundation crates.
   *
   * Two lidded cases and a coil of cable. Stencilled, because a numbered crate
   * is a document: somebody catalogued whatever came out of the ground here,
   * and the number is the only trace of it the player will ever see.
   */
  private crateStack(px: Px): void {
    const P = this.unit(px);

    /** One case: lid, body, a banding strap, a shadowed base. */
    const crate = (x0: number, y0: number, w: number, h: number, band: string) => {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const lit = (x0 + 1 - x) / w + (y0 + 1 - y) / h;
          P(x, y, lit > -0.2 ? PAL.steelMid : lit > -0.9 ? PAL.steelDark : PAL.steelDeep);
        }
      }
      for (let x = x0; x < x0 + w; x++) { P(x, y0, PAL.steelLight); P(x, y0 + h - 1, PAL.panelInk); }
      for (let y = y0; y < y0 + h; y++) P(x0 + Math.floor(w / 2), y, band);
      // The stencil: unreadable at this size, legible as writing.
      P(x0 + 1, y0 + 2, PAL.trimPale);
      P(x0 + 2, y0 + 2, PAL.trimPale);
      P(x0 + w - 2, y0 + 2, PAL.trimPale);
    };

    crate(1, 6, 8, 9, PAL.labAccent);
    crate(9, 3, 7, 12, PAL.labAccentDark);
    // Cable, coiled on the ground in front of them.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      P(4 + Math.round(Math.cos(a) * 3), 14 + Math.round(Math.sin(a) * 1.2), PAL.panelInk);
    }
    this.footShadow(P, 1, 15, 15);
  }

  /**
   * The mouth of a lava tube.
   *
   * A doorway cut in columnar basalt. The plaster doorcase the rest of the game
   * uses for a cave would be a white frame nailed to a black cliff out here, so
   * this is the cliff's own material broken open instead: the columns carry on
   * round the arch, the opening is the darkest thing on the map, and there is
   * one dull ember low in it, because the tube is still warm and that is the
   * only invitation the tile is allowed to give.
   */
  private ventMouth(px: Px, fill: (c: string) => void): void {
    this.basaltCliff(px, fill, false);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 3; y < S; y++) {
      // A pointed arch: wide at the floor, closing to a keystone.
      const half = y < 6 ? Math.round((y - 2) * 1.6) : 5;
      for (let x = 8 - half; x <= 7 + half; x++) {
        if (x < 0 || x >= S) continue;
        const rim = x === 8 - half || x === 7 + half || y === 3;
        P(x, y, rim ? PAL.basaltPale : PAL.outline);
      }
    }
    // Spoil and rubble across the sill, so the opening has a floor to it.
    for (let x = 3; x <= 12; x++) {
      if ((x * 3) % 5 === 0) continue;
      P(x, 15, PAL.basaltDark);
      P(x, 14, hash2(x, 1, 941) > 0.55 ? PAL.basaltMid : PAL.basaltDeep);
    }
    // The ember, low and dull.
    P(7, 13, PAL.emberDark);
    P(8, 13, PAL.emberDeep);
    P(7, 12, PAL.emberDeep);
  }

  /* ------------------------------------------------ Aureline: the capital */

  /**
   * The city's paving.
   *
   * Big imported granite flags, eight units across, courses breaking joint --
   * deliberately twice the module of the stone floor every other town is laid
   * with, because scale in a top-down city is carried by the size of the unit
   * as much as by the size of the map. A capital's square is not a village
   * square with more of it; the stones themselves are bigger.
   *
   * Warm rather than cool, and kept high in the ramp. This is the surface the
   * player spends the whole act standing on and every sprite in the city is
   * seen against it, so it has to be a value and not a texture.
   */
  private cityPave(px: Px, fill: (c: string) => void): void {
    fill(CITY.paveMid);
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let y = 0; y < S; y++) {
      const course = Math.floor(y / 8);
      const offset = (course % 2) * 4;
      for (let x = 0; x < S; x++) {
        const bx = (x + offset) % 8;
        const by = y % 8;
        // One tone per slab, so a flag reads as a single piece of stone that
        // happened to be cut from a different block than the one beside it.
        const n = hash2(Math.floor((x + offset) / 8), course, 617);
        let c: string = n > 0.72 ? CITY.paveLight : n < 0.28 ? CITY.paveDark : CITY.paveMid;
        // Wear across the face. Sparse, on a repeat that divides the cell.
        if ((x * 5 + y * 3) % 13 === 6) c = n > 0.5 ? CITY.pavePale : CITY.paveLight;
        if (by === 0) c = n > 0.5 ? CITY.pavePale : CITY.paveLight;   // lit head
        else if (by === 7) c = CITY.paveDark;                          // the joint
        if (bx === 0) c = CITY.paveDark;
        else if (bx === 1 && by !== 7) c = n > 0.5 ? CITY.paveLight : CITY.paveMid;
        P(x, y, c);
      }
    }
    // A chip or two out of a corner. Position-hashed, never rolled: the four
    // cuts have to be reproducible for screenshots and for player memory.
    for (let i = 0; i < 3; i++) {
      const cx = Math.floor(hash2(i, 1, 733) * S);
      const cy = Math.floor(hash2(i, 2, 733) * S);
      P(cx, cy, CITY.paveDeep);
      P(cx + 1, cy, CITY.paveDark);
    }
  }

  /**
   * The carriageway.
   *
   * Macadam: dark, fine and almost featureless, and that is the job. The
   * footway is pale and the road is dark, so the plan of the whole city reads
   * from the colour of the ground alone -- a player who has never been here can
   * see where the traffic goes and where they are supposed to walk without one
   * tile of signage. Nothing else in the game is this dark on the ground layer,
   * which is exactly why the boulevards read as boulevards from four screens
   * away.
   */
  private cityRoad(px: Px, fill: (c: string) => void): void {
    fill(CITY.roadMid);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        // Almost flat. The first cut of this ran wrapping noise at an eight-unit
        // cell and the boulevard came out as wet slate -- big soft blotches
        // that read as depth in a surface which has none, and which fought
        // every sprite standing on it. A made road is a FIELD, and the only
        // structure in it is the aggregate: one value, a step either side of it
        // at single-pixel scale, and a scatter of pale chips.
        const n = hash2(x, y, 431);
        let c: string = n > 0.72 ? CITY.roadLight : n < 0.3 ? CITY.roadDark : CITY.roadMid;
        if (hash2(x, y, 887) > 0.965) c = CITY.roadGrit;
        // Wheel polish: two faint bands where the traffic runs, on a repeat
        // that divides the cell so a carriageway forty rows long has a memory
        // in it rather than a texture.
        if ((y + 3) % 8 === 0) c = n > 0.5 ? CITY.roadLight : CITY.roadMid;
        P(x, y, c);
      }
    }
  }

  /**
   * The Old City's setts.
   *
   * Rounded, laid by hand, and small: a four-unit module against the paving's
   * eight. That halving is the whole trick of the old quarter -- the same lane
   * width feels narrower when the stones in it are half the size, and the seam
   * between the two surfaces is visible on the ground at the exact line where
   * the city stopped being medieval.
   */
  private cityCobble(px: Px, fill: (c: string) => void): void {
    fill(CITY.cobbleMid);
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let y = 0; y < S; y++) {
      const course = Math.floor(y / 4);
      const offset = (course % 2) * 2;
      for (let x = 0; x < S; x++) {
        const bx = (x + offset) % 4;
        const by = y % 4;
        const n = hash2(Math.floor((x + offset) / 4), course, 199);
        // Each sett is domed: lit at the upper left, falling to the mortar.
        const lit = (1 - bx / 3) * 0.55 + (1 - by / 3) * 0.45;
        let c: string;
        if (lit > 0.74) c = n > 0.5 ? CITY.cobblePale : CITY.cobbleLight;
        else if (lit > 0.45) c = n > 0.5 ? CITY.cobbleLight : CITY.cobbleMid;
        else c = n > 0.5 ? CITY.cobbleMid : CITY.cobbleDark;
        if (bx === 0 || by === 0) c = CITY.cobbleDeep;   // the joint between setts
        P(x, y, c);
      }
    }
  }

  /**
   * Park gravel.
   *
   * Buff, fine, and warm against the lawn. The park's paths are the only
   * walkable surface in Aureline that is not manufactured, and it matters that
   * the player can feel that underfoot: everywhere else the ground is quarried
   * flat or poured, and here it is loose.
   */
  private parkPath(px: Px, fill: (c: string) => void): void {
    fill(CITY.gravelMid);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 1213);
        let c: string = n > 0.6 ? CITY.gravelLight : n < 0.36 ? CITY.gravelDark : CITY.gravelMid;
        if (hash2(x, y, 457) > 0.9) c = CITY.gravelPale;
        else if (hash2(x, y, 641) > 0.93) c = CITY.gravelDeep;
        P(x, y, c);
      }
    }
  }

  /**
   * Curtain wall.
   *
   * The single most important tile in the capital, because a tower is this
   * cell stacked. Four glazed bays across and two floors up, mullions and
   * transoms in rolled steel, and the whole thing has to meet itself top and
   * bottom or a twelve-storey building has a seam every two floors.
   *
   * The panes are not all the same, and that is the only thing that keeps a
   * skyline from being one window printed six hundred times. What differs is
   * what a real one differs in: blinds down, lights on, or nothing. Three
   * states, chosen per bay from a position hash that folds the variant seed, so
   * four cuts of the tile give a tower a plausible pattern of occupancy rather
   * than a pattern of texture.
   */
  private glassWall(px: Px, fill: (c: string) => void): void {
    fill(CITY.glassMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const bay = Math.floor(x / 4);
        const floor = Math.floor(y / 8);
        const ix = x % 4, iy = y % 8;
        // The frame. Mullion on the left of every bay, transom at the head of
        // every floor, both with the light on their upper-left face.
        if (ix === 0) { P(x, y, CITY.steelDark); continue; }
        if (ix === 1 && iy > 0) { P(x, y, CITY.steelLight); continue; }
        if (iy === 0) { P(x, y, CITY.steelDark); continue; }
        if (iy === 1) { P(x, y, CITY.steelLight); continue; }

        const state = hash2(bay, floor, 2711);
        if (state > 0.86) {
          // Blinds down: horizontal slats, flat and pale, no reflection.
          P(x, y, iy % 2 === 0 ? CITY.blindLight : CITY.blindMid);
          continue;
        }
        if (state < 0.12) {
          // A lit floor. Warm, because every other light in the picture is
          // cold, and one warm window in a tower is worth more than fifty
          // clever reflections.
          P(x, y, iy < 4 ? CITY.litPale : CITY.litMid);
          continue;
        }
        // Sky in the glass: pale at the head of the pane, deep at the foot,
        // with the reflection running across the bay rather than down it.
        const v = (ix + iy) / 10;
        P(x, y, v < 0.28 ? CITY.glassHi : v < 0.55 ? CITY.glassLight
          : v < 0.82 ? CITY.glassMid : CITY.glassDark);
      }
    }
  }

  /**
   * The pier between the glazing.
   *
   * Solid stone cladding, seamless top to bottom, and the reason a tower has
   * corners. A building faced entirely in curtain wall is a slab of blue; the
   * piers are what give it a rhythm and an edge, and the map author places them
   * exactly where the structure would be.
   */
  private towerPier(px: Px, fill: (c: string) => void): void {
    fill(CITY.clad);
    const P = this.unit(px);
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 1489);
        let c: string = n > 0.64 ? CITY.cladPale : n < 0.36 ? CITY.cladDark : CITY.clad;
        // Panel joints down the face. Vertical only: the pier has to stack.
        if (x % 8 === 0) c = CITY.cladDeep;
        else if (x % 8 === 1) c = CITY.cladPale;
        P(x, y, c);
      }
    }
  }

  /**
   * The top of a tower.
   *
   * A roof deck seen over its own parapet. The coping is the brightest line in
   * the city and it is doing all the work: it is what says a building has an
   * edge and a top, and therefore that it has a height. Corner pieces return
   * the coping down the side, so a block of towers has a drawn silhouette
   * rather than four right angles of glass.
   */
  private towerCap(px: Px, fill: (c: string) => void, part: 'mid' | 'left' | 'right'): void {
    fill(CITY.deckMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        P(x, y, (x * 3 + y * 7) % 14 === 5 ? CITY.deckLight : CITY.deckMid);
      }
    }
    // Deck bays, with the light catching the sheet beyond each seam.
    for (let y = 6; y < 13; y += 5) {
      for (let x = 0; x < S; x++) { P(x, y, CITY.deckDark); P(x, y + 1, CITY.deckLight); }
    }
    // Plant on the roof: one cooling unit, hashed into place so a run of caps
    // is not one silhouette repeated. About a third of the cells carry one.
    if (hash2(0, 0, 1861) > 0.62 && part === 'mid') {
      for (let y = 6; y <= 11; y++) {
        for (let x = 4; x <= 11; x++) {
          const edge = x === 4 || x === 11 || y === 6 || y === 11;
          P(x, y, edge ? CITY.outline : y <= 8 ? PAL.steelMid : PAL.steelDark);
        }
      }
      for (let x = 5; x <= 10; x++) P(x, 7, PAL.steelPale);
      for (const ly of [9, 10]) for (let x = 5; x <= 10; x++) P(x, ly, PAL.steelDeep);
    }

    // Parapet: outline, coping, the city's gilt band under it, then the shadow
    // the parapet throws back across its own deck.
    for (let x = 0; x < S; x++) {
      P(x, 0, CITY.outline);
      P(x, 1, CITY.cladPale);
      P(x, 2, CITY.gold);
      P(x, 3, CITY.goldDark);
      P(x, 4, CITY.deckDeep);
      P(x, 13, CITY.goldDark);
      P(x, 14, CITY.deckDeep);
      P(x, 15, CITY.outline);
    }

    if (part === 'left') {
      for (let y = 0; y < S; y++) {
        P(0, y, CITY.outline);
        P(1, y, CITY.cladPale);
        P(2, y, CITY.gold);
        P(3, y, CITY.deckDeep);
      }
    }
    if (part === 'right') {
      for (let y = 0; y < S; y++) {
        P(S - 1, y, CITY.outline);
        P(S - 2, y, CITY.cladDark);
        P(S - 3, y, CITY.gold);
        P(S - 4, y, CITY.deckDeep);
      }
    }
  }

  /**
   * The ground floor of a tower, with or without a way in.
   *
   * Polished dark stone up to head height, which is what every expensive
   * building in the world does at street level and what nothing else in Caelora
   * does at all. The door is warm and everything around it is cold, so at a
   * glance down a street of forty identical bases the two that open are the two
   * that are lit.
   */
  private towerPlinth(px: Px, fill: (c: string) => void, door: boolean): void {
    fill(CITY.plinthMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 16, 907);
        // Polished granite: the veining is broad and soft, not speckled.
        let c: string = n > 0.66 ? CITY.plinthLight : n < 0.33 ? CITY.plinthDark : CITY.plinthMid;
        if (x % 8 === 0) c = CITY.plinthDeep;         // slab joint
        P(x, y, c);
      }
    }
    // Head: the shadow the glazing above throws down the face. Foot: the kerb
    // the frontage stands on, so the building meets the paving.
    for (let x = 0; x < S; x++) {
      P(x, 0, CITY.outline);
      P(x, 1, CITY.plinthLight);
      P(x, 2, CITY.gold);
      P(x, 13, CITY.plinthDeep);
      P(x, 14, CITY.paveDark);
      P(x, 15, CITY.outline);
    }

    if (!door) {
      // A tall slot of lobby glass. Narrow on purpose: the bays that open are
      // the wide ones, and a player learns that in about four seconds.
      for (let y = 4; y <= 12; y++) {
        for (let x = 5; x <= 10; x++) {
          const frame = x === 5 || x === 10 || y === 4;
          P(x, y, frame ? PAL.steelMid : x + y < 13 ? CITY.glassLight : CITY.glassMid);
        }
      }
      return;
    }

    // The entrance. Brass surround, glazed leaves, warm light behind them, and
    // a mat on the threshold where the player's feet arrive.
    for (let y = 3; y <= 13; y++) {
      for (let x = 1; x <= 14; x++) {
        P(x, y, x + y < 10 ? CITY.litPale : x + y < 19 ? CITY.litMid : CITY.litDark);
      }
    }
    for (let y = 3; y <= 13; y++) {
      P(1, y, CITY.outline); P(2, y, CITY.gold);
      P(14, y, CITY.outline); P(13, y, CITY.goldDark);
      P(7, y, CITY.goldDark); P(8, y, CITY.gold);
    }
    for (let x = 1; x <= 14; x++) { P(x, 3, CITY.outline); P(x, 4, CITY.gold); }
    for (let x = 3; x <= 12; x++) { P(x, 8, CITY.goldLit); P(x, 9, CITY.goldDark); }
    for (let x = 0; x < S; x++) {
      P(x, 14, CITY.plinthDeep);
      P(x, 15, x % 3 === 0 ? '#4b4238' : '#63594c');
    }
  }

  /**
   * A shop window.
   *
   * Plate glass to the pavement, a stallriser under it, and something on
   * display behind. What is on display is deliberately unreadable -- three
   * blocks of colour on a shelf -- because a legible product at sixteen units
   * across is a lie, and three blocks of colour is exactly what a shop window
   * looks like from the other side of a busy street.
   */
  private shopfront(px: Px, fill: (c: string) => void): void {
    fill(CITY.cladDark);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        P(x, y, wrapNoise(x * DETAIL, y * DETAIL, 8, 1601) > 0.55 ? CITY.clad : CITY.cladDark);
      }
    }
    // The glass: one big light per cell, framed in painted timber.
    for (let y = 2; y <= 12; y++) {
      for (let x = 1; x <= 14; x++) {
        const v = (x + y * 1.4) / 26;
        P(x, y, v < 0.3 ? CITY.glassHi : v < 0.62 ? CITY.glassLight : CITY.glassMid);
      }
    }
    // Goods on the shelf behind it. Colour chosen per cell, so a parade of
    // fifteen shops is fifteen different windows.
    const wares = [CITY.wareA, CITY.wareB, CITY.wareC, CITY.gold, CITY.litMid];
    for (let i = 0; i < 3; i++) {
      const w = wares[Math.floor(hash2(i, 3, 1979) * wares.length) % wares.length]!;
      const x0 = 2 + i * 4;
      const h = 3 + Math.floor(hash2(i, 5, 1979) * 3);
      for (let y = 11 - h; y <= 10; y++) for (let x = x0; x <= x0 + 2; x++) P(x, y, w);
      for (let x = x0; x <= x0 + 2; x++) P(x, 11 - h, CITY.pavePale);
    }
    for (let x = 1; x <= 14; x++) { P(x, 11, CITY.cladDeep); P(x, 12, CITY.cladPale); }
    // Frame, stallriser and the kerb line at the foot.
    for (let y = 2; y <= 12; y++) { P(1, y, CITY.cladDeep); P(14, y, CITY.cladDeep); }
    for (let x = 0; x < S; x++) {
      P(x, 0, CITY.outline);
      P(x, 1, CITY.cladPale);
      P(x, 13, CITY.cladDeep);
      P(x, 14, CITY.paveDark);
      P(x, 15, CITY.outline);
    }
  }

  /**
   * The canopy over a shop window, and the fascia over that.
   *
   * Laid in the row above the frontage, which is where a canopy actually is
   * when a street is drawn from above and slightly in front. Striped, because
   * one band of alternating colour running the length of a parade does more to
   * say "this is where the shops are" than any number of individual signs, and
   * because it is the only saturated horizontal line in the whole city.
   */
  private awning(px: Px, fill: (c: string) => void): void {
    fill(CITY.awnA);
    const P = this.unit(px);
    const S = TILE_SIZE;

    // Fascia: the painted board the shop's name is on. Two bars of lettering,
    // which is all that resolves and more honest than pretending to a word.
    for (let y = 0; y <= 5; y++) for (let x = 0; x < S; x++) P(x, y, CITY.fascia);
    for (let x = 0; x < S; x++) { P(x, 0, CITY.outline); P(x, 1, CITY.fasciaLit); }
    for (let x = 2; x <= 13; x++) P(x, 3, CITY.pavePale);
    for (let x = 4; x <= 10; x++) P(x, 4, CITY.paveLight);

    // Canopy: vertical stripes, lit at the head and falling into shadow at the
    // scalloped lip.
    for (let y = 6; y <= 13; y++) {
      for (let x = 0; x < S; x++) {
        const stripe = Math.floor(x / 4) % 2 === 0;
        const base = stripe ? CITY.awnA : CITY.awnB;
        const lit = stripe ? CITY.awnALit : CITY.awnBLit;
        P(x, y, y <= 7 ? lit : y >= 12 ? (stripe ? CITY.awnADark : CITY.awnBDark) : base);
      }
    }
    // The scallop: a shallow round on every stripe, and the shadow it throws.
    for (let x = 0; x < S; x++) {
      const t = (x % 4) / 3;
      const dip = Math.round(Math.sin(t * Math.PI) * 1.6);
      P(x, 13 + Math.min(1, dip), CITY.outline);
    }
    for (let x = 0; x < S; x++) { P(x, 15, PAL.contact); }
  }

  /**
   * The Old City.
   *
   * Coursed granite ashlar, three hundred years of soot in the joints, and a
   * module that has nothing to do with the module of anything built since. The
   * blocks are big and irregular and the courses are deep, so a wall of this
   * beside a curtain wall is not a different colour of the same idea -- it is
   * plainly a different century, which is the argument the whole district
   * exists to make.
   */
  private granite(px: Px, fill: (c: string) => void, kind: 'plain' | 'window' | 'arch'): void {
    fill(CITY.graniteMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      const course = Math.floor(y / 5);
      const offset = (course % 2) * 3;
      for (let x = 0; x < S; x++) {
        const block = Math.floor((x + offset) / 6);
        const n = hash2(block, course, 337);
        let c: string = n > 0.68 ? CITY.graniteLight : n < 0.3 ? CITY.graniteDark : CITY.graniteMid;
        if ((x * 7 + y * 5) % 17 === 3) c = n > 0.5 ? CITY.granitePale : CITY.graniteLight;
        if (y % 5 === 0) c = n > 0.5 ? CITY.granitePale : CITY.graniteLight;   // lit bed
        else if (y % 5 === 4) c = CITY.graniteDeep;                             // the joint
        if ((x + offset) % 6 === 0) c = CITY.graniteDeep;                       // perpend
        P(x, y, c);
      }
    }
    // Soot. It gathers under the beds and on the north face of every course,
    // and it is the reason this stone is not the same colour as the paving it
    // was cut from.
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (hash2(x, y, 761) > 0.9) P(x, y, CITY.soot);
      }
    }
    for (let x = 0; x < S; x++) { P(x, 15, CITY.outline); P(x, 14, CITY.graniteDeep); }

    if (kind === 'window') {
      // Sash: a stone lintel, six lights over six, a projecting sill. Tall and
      // narrow, which is the proportion of the whole quarter.
      for (let x = 3; x <= 12; x++) { P(x, 1, CITY.granitePale); P(x, 2, CITY.graniteLight); }
      for (let y = 3; y <= 11; y++) {
        for (let x = 4; x <= 11; x++) {
          const v = (x - 4 + (y - 3) * 1.2) / 15;
          P(x, y, v < 0.3 ? CITY.paneHi : v < 0.62 ? CITY.paneLight : CITY.paneMid);
        }
      }
      for (let y = 3; y <= 11; y++) { P(3, y, CITY.sash); P(12, y, CITY.sashDark); }
      for (let x = 3; x <= 12; x++) { P(x, 3, CITY.sashDark); P(x, 7, CITY.sash); P(x, 11, CITY.sash); }
      for (const mx of [6, 9]) for (let y = 4; y <= 10; y++) P(mx, y, CITY.sash);
      for (let x = 2; x <= 13; x++) { P(x, 12, CITY.granitePale); P(x, 13, CITY.graniteDark); }
    }

    if (kind === 'arch') {
      // A round-headed doorway with a fanlight, and a step worn hollow. The
      // arch is what makes it obviously older than everything with a lintel.
      for (let y = 2; y < S; y++) {
        const half = y < 6 ? Math.round(Math.sqrt(Math.max(0, 16 - (6 - y) * (6 - y))) + 1) : 5;
        for (let x = 8 - half; x <= 7 + half; x++) {
          if (x < 0 || x >= S) continue;
          const rim = x === 8 - half || x === 7 + half || y === 2;
          if (rim) { P(x, y, CITY.granitePale); continue; }
          if (y <= 6) { P(x, y, x + y < 12 ? CITY.paneHi : CITY.paneLight); continue; }  // fanlight
          P(x, y, y === 7 ? CITY.outline : x < 8 ? CITY.doorMid : CITY.doorDark);
        }
      }
      for (let y = 9; y <= 12; y++) { P(6, y, CITY.doorDeep); P(9, y, CITY.doorDeep); }
      P(10, 10, CITY.gold);                                    // the knob
      for (let x = 3; x <= 12; x++) { P(x, 14, CITY.granitePale); P(x, 15, CITY.graniteDark); }
    }
  }

  /**
   * The Meridian Foundation.
   *
   * Their own material, and it has to be: the whole point of the Foundation is
   * that it looks like the future and looks like it is on your side. So it is
   * white composite with a hairline joint, glazing in the Foundation's own deep
   * blue, and their mark on a plate beside the door -- a ring with a line drawn
   * through the pole of it, which is what a meridian is.
   *
   * Nothing about it is sinister and nothing about it should be. It is the
   * best-built thing in Caelora and it was paid for honestly.
   */
  private meridianWall(px: Px, fill: (c: string) => void, kind: 'plain' | 'glass' | 'crest' | 'door'): void {
    fill(CITY.merPanel);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 16, 1051);
        let c: string = n > 0.6 ? CITY.merPale : CITY.merPanel;
        if (x % 8 === 0) c = CITY.merShade;      // the hairline between panels
        else if (x % 8 === 1) c = CITY.merPale;
        P(x, y, c);
      }
    }
    for (let x = 0; x < S; x++) {
      P(x, 0, CITY.merShade);
      P(x, 1, CITY.merPale);
      P(x, 7, CITY.merBlue);                     // the accent course
      P(x, 8, CITY.merBlueDark);
      P(x, 14, CITY.merShade);
      P(x, 15, CITY.outline);
    }

    if (kind === 'glass') {
      // Deep blue glazing, four bays across and two floors up, and it has to
      // meet itself top and bottom: this is the tile the headquarters is made
      // of, four hundred and fifty cells of it, and anything with a motif in it
      // prints a lattice across the biggest building in Caelora.
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const bay = Math.floor(x / 4), floor = Math.floor(y / 8);
          const ix = x % 4, iy = y % 8;
          if (ix === 0) { P(x, y, CITY.merBlueDark); continue; }
          if (ix === 1 && iy > 0) { P(x, y, CITY.merShade); continue; }
          if (iy === 0) { P(x, y, CITY.merBlueDark); continue; }
          if (iy === 1) { P(x, y, CITY.merShade); continue; }
          const state = hash2(bay, floor, 3313);
          if (state > 0.88) { P(x, y, iy % 2 === 0 ? CITY.merPale : CITY.merShade); continue; }
          if (state < 0.14) { P(x, y, iy < 4 ? CITY.merSky : CITY.merGlassLight); continue; }
          const v = (ix + iy) / 10;
          P(x, y, v < 0.3 ? CITY.merGlassLight : v < 0.7 ? CITY.merGlass : CITY.merGlassDeep);
        }
      }
    }

    if (kind === 'crest') {
      // The mark, on a plate. A ring, a meridian through it, and a chord under
      // the ring for the horizon -- readable at a glance from across a square,
      // which is the only test a crest has to pass.
      for (let y = 2; y <= 13; y++) {
        for (let x = 2; x <= 13; x++) {
          const border = y === 2 || y === 13 || x === 2 || x === 13;
          P(x, y, border ? CITY.merBlueDark : CITY.merBlue);
        }
      }
      const cx = 8, cy = 8, r = 4.4;
      for (let y = -5; y <= 5; y++) {
        for (let x = -5; x <= 5; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (Math.abs(d - r) < 0.9) P(cx + x, cy + y, CITY.merPale);
        }
      }
      for (let y = -4; y <= 4; y++) P(cx, cy + y, CITY.merPale);
      for (let x = -3; x <= 3; x++) P(cx + x, cy + 2, CITY.merSky);
    }

    if (kind === 'door') {
      // The public entrance. Twice the width of anything else on the frontage,
      // glazed the whole height, and lit from inside: the Foundation wants you
      // to walk in.
      for (let y = 2; y <= 13; y++) {
        for (let x = 1; x <= 14; x++) {
          P(x, y, x + y < 10 ? CITY.merSky : x + y < 20 ? CITY.merGlassLight : CITY.merGlass);
        }
      }
      for (let y = 2; y <= 13; y++) {
        P(1, y, CITY.outline); P(2, y, CITY.merShade);
        P(14, y, CITY.outline); P(13, y, CITY.merShade);
        P(7, y, CITY.merShade); P(8, y, CITY.merPale);
      }
      for (let x = 1; x <= 14; x++) { P(x, 2, CITY.outline); P(x, 3, CITY.merBlue); }
      for (let x = 3; x <= 12; x++) { P(x, 8, CITY.merPale); P(x, 9, CITY.merShade); }
      for (let x = 0; x < S; x++) {
        P(x, 14, CITY.merBlueDark);
        P(x, 15, x % 3 === 0 ? '#3c4552' : '#525c6b');
      }
    }
  }

  /**
   * The trainshed.
   *
   * A glazed barrel roof on steel ribs. Half the point of a nineteenth-century
   * terminus is that it is the biggest single roofed volume anybody in this
   * country has ever built, so it is drawn as one enormous piece of glazing and
   * the ribs are what tell you how far across it goes.
   */
  private shedRoof(px: Px, fill: (c: string) => void, truss: boolean): void {
    fill(CITY.shedGlass);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // Sooty glass, lighter where the light comes through it.
        const v = wrapNoise(x * DETAIL, y * DETAIL, 16, 1409);
        P(x, y, v > 0.68 ? CITY.shedGlassLit : v < 0.34 ? CITY.shedGlassDark : CITY.shedGlass);
      }
    }
    // Glazing bars, both ways: a barrel roof from above is a grid.
    for (let x = 0; x < S; x++) {
      if (x % 4 === 0) for (let y = 0; y < S; y++) P(x, y, CITY.shedSteel);
      if (x % 4 === 1) for (let y = 0; y < S; y++) P(x, y, CITY.shedSteelLit);
    }
    for (let y = 0; y < S; y += 8) {
      for (let x = 0; x < S; x++) { P(x, y, CITY.shedSteel); P(x, y + 1, CITY.shedSteelLit); }
    }

    if (truss) {
      // A principal rib, and the lattice inside it.
      for (let y = 0; y < S; y++) {
        for (let x = 5; x <= 10; x++) {
          P(x, y, x === 5 || x === 10 ? CITY.outline : CITY.shedSteelLit);
        }
      }
      for (let y = 0; y < S; y++) {
        const t = y % 6;
        const x = t < 3 ? 6 + t : 9 - (t - 3);
        P(x, y, CITY.shedSteel);
        P(x + 1, y, CITY.shedSteel);
      }
    }
  }

  /**
   * A street lamp, capital pattern.
   *
   * Cast iron, twice the height of the one every town uses, with a fluted
   * column and a gilt band. Floorless, so it stands on paving, cobble, gravel
   * and grass without carrying a square of the wrong ground with it -- which is
   * the whole reason the town lamp had to be replaced rather than reused.
   */
  private cityLamp(px: Px): void {
    const P = this.unit(px);

    // Column, tapering, lit down its left flank.
    for (let y = 5; y <= 14; y++) {
      P(7, y, CITY.ironLight);
      P(8, y, CITY.ironMid);
      P(9, y, CITY.ironDark);
    }
    for (let y = 12; y <= 14; y++) { P(6, y, CITY.ironMid); P(10, y, CITY.ironDark); }
    P(7, 9, CITY.gold); P(8, 9, CITY.goldDark); P(9, 9, CITY.goldDark);

    // The lantern: a glazed box under a cap, warm inside.
    for (let y = 1; y <= 5; y++) {
      for (let x = 5; x <= 11; x++) {
        const edge = x === 5 || x === 11 || y === 5;
        P(x, y, edge ? CITY.ironDark : y <= 2 ? CITY.lampCore : CITY.lampGlow);
      }
    }
    for (let x = 4; x <= 12; x++) { P(x, 0, CITY.outline); P(x, 1, CITY.ironMid); }
    P(5, 3, CITY.ironMid); P(11, 3, CITY.ironMid);
    // The light it throws down onto whatever it is standing on.
    for (let x = 6; x <= 10; x++) P(x, 6, CITY.lampSpill);
    for (let x = 5; x <= 11; x++) P(x, 7, CITY.lampSpillFar);

    this.footShadow(P, 6, 10, 15);
  }

  /**
   * A street tree.
   *
   * A plane, pollarded, in an iron grate. Every avenue in the city has two rows
   * of these and they are doing something no building can: they are the only
   * thing at street level that is alive, and a boulevard without them is a
   * runway. Floorless, so the paving shows through the grate and round the
   * crown.
   */
  private streetTree(px: Px): void {
    const P = this.unit(px);

    // The grate, then the bole standing in it.
    for (let x = 5; x <= 10; x++) { P(x, 13, CITY.ironDark); P(x, 14, CITY.ironMid); }
    for (let x = 5; x <= 10; x += 2) P(x, 14, CITY.ironDark);
    for (let y = 9; y <= 13; y++) { P(7, y, PAL.trunkLight); P(8, y, PAL.trunkMid); P(9, y, PAL.trunkDark); }

    // The crown: a pollarded ball, lit from the upper left, with the sky
    // showing through it in two or three places.
    const cx = 8, cy = 6, r = 5.6;
    for (let y = -6; y <= 6; y++) {
      for (let x = -7; x <= 7; x++) {
        const wob = Math.sin(x * 1.1) * 0.5 + Math.cos(y * 0.9) * 0.4;
        const d = Math.sqrt(x * x + y * y * 1.15) + wob;
        if (d > r) continue;
        if (hash2(cx + x, cy + y, 1873) > 0.93) continue;      // sky through the leaf
        const lit = (-x - y) / 9;
        const c = d > r - 0.9 ? PAL.leafDeep
          : lit > 0.35 ? PAL.leafTip : lit > 0.05 ? PAL.leafHi
            : lit > -0.25 ? PAL.leafMid : PAL.leafDark;
        P(cx + x, cy + y, c);
      }
    }
    this.footShadow(P, 5, 10, 15);
  }

  /**
   * A bench.
   *
   * Iron ends, timber slats, and it is here for one reason: a city with nowhere
   * to sit is a set. Floorless, so it takes gravel in the park and flagstone on
   * the boulevard.
   */
  private bench(px: Px): void {
    const P = this.unit(px);
    for (let y = 5; y <= 9; y++) {
      for (let x = 2; x <= 13; x++) {
        P(x, y, y % 2 === 0 ? PAL.woodMid : PAL.woodDark);
      }
    }
    for (let x = 2; x <= 13; x++) { P(x, 4, PAL.woodLight); P(x, 10, PAL.woodDeep); }
    for (const ex of [2, 3, 12, 13]) for (let y = 4; y <= 12; y++) P(ex, y, CITY.ironDark);
    for (const ex of [3, 12]) for (let y = 5; y <= 9; y++) P(ex, y, CITY.ironMid);
    this.footShadow(P, 2, 13, 13);
  }

  /**
   * Iron railings.
   *
   * Bars, a top rail and spear heads. Drawn to read the same run vertically as
   * horizontally, because the park, the areas and the station forecourt all
   * need it and a set with a corner piece per direction is four tiles for one
   * idea. Floorless.
   */
  private railing(px: Px): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let x = 0; x < S; x++) {
      if (x % 3 === 0) {
        for (let y = 4; y <= 14; y++) P(x, y, CITY.ironDark);
        for (let y = 4; y <= 14; y++) P(x + 1, y, CITY.ironMid);
        P(x, 3, CITY.gold);            // the spear head
        P(x + 1, 3, CITY.goldDark);
      }
    }
    for (let x = 0; x < S; x++) { P(x, 6, CITY.ironDark); P(x, 7, CITY.ironLight); }
    for (let x = 0; x < S; x++) { P(x, 14, CITY.ironDark); P(x, 15, PAL.contact); }
  }

  /**
   * Clipped hedge.
   *
   * The park's walls, and the only wall in Aureline that is not load-bearing.
   * Floorless, so it takes lawn on one side and gravel on the other without
   * dragging a border of the wrong ground behind it.
   */
  private hedge(px: Px): void {
    const P = this.unit(px);
    const S = TILE_SIZE;
    for (let y = 2; y <= 15; y++) {
      for (let x = 0; x < S; x++) {
        const n = hash2(x, y, 1129);
        const lit = (15 - y) / 13;
        let c: string = lit > 0.62 ? (n > 0.5 ? PAL.leafHi : PAL.leafLight)
          : lit > 0.3 ? (n > 0.5 ? PAL.leafMid : PAL.leafLight)
            : (n > 0.6 ? PAL.leafDark : PAL.leafDeep);
        if (n > 0.94) c = PAL.leafTip;
        P(x, y, c);
      }
    }
    // The clipped top: one hard lit line, which is what says this was cut by a
    // person and not grown.
    for (let x = 0; x < S; x++) { P(x, 1, CITY.outline); P(x, 2, PAL.leafTip); }
    for (let x = 0; x < S; x++) P(x, 15, PAL.contact);
  }

  /**
   * A monument.
   *
   * Bronze on a pale plinth, and quite deliberately not identified: the capital
   * is full of statues of people the player has never heard of, which is what
   * having a history looks like from outside. Floorless.
   */
  private statue(px: Px): void {
    const P = this.unit(px);

    // Plinth.
    for (let y = 10; y <= 14; y++) {
      for (let x = 3; x <= 12; x++) {
        P(x, y, x < 5 ? CITY.pavePale : x > 10 ? CITY.paveDark : CITY.paveLight);
      }
    }
    for (let x = 2; x <= 13; x++) { P(x, 10, CITY.pavePale); P(x, 14, CITY.paveDeep); }
    for (let x = 3; x <= 12; x++) P(x, 12, CITY.paveMid);

    // The figure: a standing person with a raised arm and a cloak. Read as a
    // silhouette, because at this size that is all a statue ever is.
    for (let y = 3; y <= 9; y++) {
      const w = y < 5 ? 1 : y < 7 ? 2 : 3;
      for (let x = 8 - w; x <= 7 + w; x++) {
        P(x, y, x <= 7 ? CITY.bronzeLit : CITY.bronze);
      }
    }
    for (let y = 1; y <= 3; y++) for (let x = 7; x <= 8; x++) P(x, y, CITY.bronzeLit);
    for (let y = 4; y <= 6; y++) P(10, y, CITY.bronze);            // the raised arm
    P(10, 3, CITY.bronzeLit);
    for (let y = 6; y <= 9; y++) { P(5, y, CITY.bronzeDark); P(11, y, CITY.bronzeDark); }
    for (let y = 1; y <= 9; y++) P(9, y, CITY.bronzeDark);          // the shaded flank

    this.footShadow(P, 2, 13, 15);
  }

  /**
   * Ornamental water.
   *
   * A basin, not a pond: a stone floor a hand's depth under still water, laid
   * so that a block of any size reads as one sheet. Solid, because a city
   * fountain is something you walk round.
   */
  private fountain(px: Px, fill: (c: string) => void): void {
    fill(CITY.basinMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        // The stone under the water shows through, dimmed and blued. The first
        // cut laid it as a four-unit chequer and a basin twelve cells across
        // printed the chequer seventy-two times -- the one thing a sheet of
        // water must not do. Two octaves of wrapping noise instead, so the
        // paving under the surface is a pattern of blocks that never repeats
        // where the eye can catch it.
        const a = wrapNoise(x * DETAIL, y * DETAIL, 16, 1291);
        const b = wrapNoise(x * DETAIL, y * DETAIL, 8, 733);
        const v = a * 0.6 + b * 0.4;
        P(x, y, v > 0.68 ? CITY.basinSky : v > 0.5 ? CITY.basinLight
          : v > 0.32 ? CITY.basinMid : CITY.basinDeep);
      }
    }
    // Glitter: short horizontal breaks, which is what still water does when it
    // is seen from above and something is moving in it.
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (hash2(x >> 1, y, 1451) > 0.955) { P(x, y, CITY.basinGlint); P(x + 1, y, CITY.basinSky); }
      }
    }
  }
  /* ------------------------------------------------ The Central Road ---- */

  /**
   * Macadam.
   *
   * The first road in Caelora that was built rather than worn, and the tile has
   * exactly one job: to be the wrong colour. Every path the player has walked
   * since Hearthmere is a warm gold stripe rubbed into turf by feet, and this
   * one is grey, hard and dusty, because a hundred and fifty thousand people
   * eat at the end of it and somebody had to engineer the way in.
   *
   * Deliberately isotropic -- no ruts, no crown, no direction. A cambered road
   * with wheel tracks in it is a better single tile and a much worse road,
   * because this one turns four times between the wetlands and the capital and
   * a directional surface makes every corner a seam. What carries it instead is
   * the aggregate: chippings from both ends of the ramp, so the surface reads
   * as crushed stone rolled flat rather than as a painted band.
   */
  private highroad(px: Px, fill: (c: string) => void): void {
    fill(PAL.roadMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 1031) * 0.6
          + wrapNoise(x * DETAIL, y * DETAIL, 4, 1033) * 0.4;
        let c: string = n > 0.63 ? PAL.roadLight : n < 0.37 ? PAL.roadDark : PAL.roadMid;
        const g = hash2(x, y, 1039);
        if (g > 0.968) c = PAL.roadPale;
        else if (g > 0.952) c = PAL.stoneLight;
        else if (g < 0.03) c = PAL.roadDeep;
        P(x, y, c);
      }
    }

    // Three worn hollows per cell, wrapping at the edges so a road of any
    // length has no lattice. A patched road is a used road.
    for (let i = 0; i < 3; i++) {
      const cx = Math.floor(hash2(i, 5, 1049) * S);
      const cy = Math.floor(hash2(i, 6, 1051) * S);
      const r = 1 + Math.floor(hash2(i, 7, 1061) * 2);
      for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r * r) continue;
          P(((x % S) + S) % S, ((y % S) + S) % S,
            hash2(x, y, 1063) > 0.5 ? PAL.roadDark : PAL.roadDeep);
        }
      }
    }
  }

  /**
   * Ploughed ground.
   *
   * Not the path ramp with the sun taken out of it. A road is dry, packed and
   * pale; turned earth is dark, wet and open, and the difference between them
   * is most of what tells a player that the brown field beside the brown road
   * is a field. So this is its own ramp, and the structure is ridge and furrow:
   * a lit crest, the body of the ridge, and the shadow in the bottom of the
   * cut, repeating every four units.
   *
   * The ridges wander by a whole sine period across the cell, which wraps, so
   * an eighty-tile field has no seam and no ruled line running through it.
   */
  private furrow(px: Px, fill: (c: string) => void): void {
    fill(PAL.loamMid);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const W = (x: number, y: number, c: string) =>
      P(((x % S) + S) % S, ((y % S) + S) % S, c);

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const wobble = Math.round(Math.sin((x / S) * Math.PI * 2) * 0.9);
        const b = (((y + wobble) % 4) + 4) % 4;
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 1069);
        let c: string = b === 0 ? PAL.loamLight
          : b === 1 ? PAL.loamMid
          : b === 2 ? PAL.loamDark
          : PAL.loamDeep;
        if (b === 0 && n > 0.58) c = PAL.loamPale;
        else if (b === 3 && n > 0.66) c = PAL.loamDark;
        P(x, y, c);
      }
    }

    // Clods and flints. A clod is a lit crown over its own shadow, because a
    // single dark unit at this size is dirt on the screen rather than a lump
    // of earth lying on a field.
    for (let i = 0; i < 11; i++) {
      const cx = Math.floor(hash2(i, 11, 1087) * S);
      const cy = Math.floor(hash2(i, 12, 1091) * S);
      W(cx, cy, PAL.loamPale);
      W(cx + 1, cy, PAL.loamMid);
      W(cx, cy + 1, PAL.loamDeep);
    }
    for (let i = 0; i < 3; i++) {
      W(Math.floor(hash2(i, 21, 1093) * S), Math.floor(hash2(i, 22, 1097) * S), PAL.stoneLight);
    }
    // Last year's stubble, still in the ground.
    for (let i = 0; i < 5; i++) {
      W(Math.floor(hash2(i, 31, 1103) * S), Math.floor(hash2(i, 32, 1109) * S), PAL.wheatDark);
    }
  }

  /**
   * Standing wheat: this country's tall grass.
   *
   * The encounter tile, so the only test that matters is whether a player can
   * pick it out at 1x from the far side of the screen without being told. On
   * ash that meant being the darkest mass in view; on a green and brown
   * farmland map it means being the most SATURATED, which is why the ramp
   * carries more chroma than anything else outdoors in the game.
   *
   * Two ranks of ears to the cell rather than one. A crop is deep -- the
   * player is walking into it, not over it -- and one rank per tile draws a
   * field of identical stripes sixteen units apart, which is a lawn with
   * markings on it. Two ranks, each with its own lean and height, read as a
   * mass standing at different heights, which is what a field of corn is.
   */
  private wheat(px: Px, fill: (c: string) => void): void {
    fill(PAL.wheatDark);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const W = (x: number, y: number, c: string) =>
      P(((x % S) + S) % S, ((y % S) + S) % S, c);

    // The shaded floor of the crop, so the stalks have something to stand in.
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 8, 1117);
        P(x, y, n < 0.42 ? PAL.wheatDeep : PAL.wheatDark);
      }
    }
    // Each column's two ranks stand a unit or two off its neighbour's. Level
    // ranks drew a horizontal band across every cell, and a field of that is a
    // crop with lines ruled through it -- which is a picket fence, not corn.
    const stand = (x: number) => Math.floor(hash2(x, 9, 1131) * 3);
    for (const base of [7, 15]) for (let x = 0; x < S; x++) W(x, base + stand(x), PAL.wheatDeep);

    for (const base of [7, 15]) {
      for (let x = 0; x < S; x++) {
        const foot = base + stand(x);
        const h = 5 + Math.floor(hash2(x, base, 1123) * 3);
        const lean = (hash2(x, base, 1129) - 0.5) * 2.4;
        for (let k = 1; k <= h; k++) {
          const t = k / h;
          const xx = x + Math.round(lean * t);
          const c = t > 0.58 ? PAL.wheatLight : t > 0.26 ? PAL.wheatMid : PAL.wheatDark;
          W(xx, foot - k, c);
          // The shaded side of the stalk. One unit wide vanishes at 1x.
          if (t < 0.7) W(xx + 1, foot - k, PAL.wheatDeep);
        }
        // The ear, and the awns over it: the pale flecks are the whole reason
        // a field of this reads as grain rather than as long grass.
        const ex = x + Math.round(lean);
        W(ex, foot - h, PAL.wheatPale);
        W(ex, foot - h - 1, hash2(x, base, 1151) > 0.45 ? PAL.wheatPale : PAL.wheatLight);
        W(ex + 1, foot - h, PAL.wheatDark);
      }
    }
  }

  /**
   * Hedgerow.
   *
   * The field boundary, and the wall of every enclosed map in this country. It
   * is not the woodland tree recoloured and it is not the city's clipped box:
   * a laid hedge is a thicket somebody bent over and wove together forty years
   * ago, so the silhouette is a low dense mass with a ragged top and no gap
   * underneath at all.
   *
   * Drawn edge to edge with no transparent margin, which is the whole trick: a
   * run of these in either direction has to be a continuous wall, and a tree
   * tile with daylight round it draws a row of bushes with holes between them.
   * It stays an overlay rather than a ground tile so the player walking along
   * the far side of a hedge is correctly behind it.
   */
  private hedgerow(px: Px, fill: (c: string) => void): void {
    void fill;
    const P = this.unit(px);
    const S = TILE_SIZE;
    const W = (x: number, y: number, c: string) =>
      P(((x % S) + S) % S, ((y % S) + S) % S, c);

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 5, 1153) * 0.6
          + wrapNoise(x * DETAIL, y * DETAIL, 3, 1163) * 0.4;
        // Light falls on the top and the upper left, the way it does on
        // everything else in the tileset.
        const lit = n + (S - y) / 40 + (S - x) / 70;
        const c: string = lit > 1.02 ? PAL.leafHi
          : lit > 0.86 ? PAL.leafLight
          : lit > 0.66 ? PAL.leafMid
          : lit > 0.46 ? PAL.leafDark
          : PAL.leafDeep;
        P(x, y, c);
      }
    }
    // The ragged crown. A hedge that stops on a ruled line is a wall with
    // leaves painted on it.
    for (let x = 0; x < S; x++) {
      const top = Math.floor(hash2(x, 0, 1171) * 3);
      for (let y = 0; y < top; y++) P(x, y, PAL.leafDeep);
      P(x, top, hash2(x, 1, 1181) > 0.5 ? PAL.leafTip : PAL.leafHi);
    }
    // Old wood showing through: the stools the hedge was laid from.
    for (let i = 0; i < 4; i++) {
      const bx = Math.floor(hash2(i, 7, 1187) * S);
      for (let y = 11; y < S; y++) W(bx, y, PAL.trunkDark);
      W(bx + 1, 13, PAL.trunkDeep);
    }
    // Haw and may, one or the other depending on the alternate.
    for (let i = 0; i < 5; i++) {
      const bx = Math.floor(hash2(i, 13, 1193) * S);
      const by = 2 + Math.floor(hash2(i, 14, 1201) * 9);
      W(bx, by, hash2(i, 15, 1213) > 0.5 ? PAL.redMid : PAL.plasterPale);
    }
    for (let x = 0; x < S; x++) P(x, S - 1, PAL.leafDeep);
  }

  /**
   * A stook of sheaves.
   *
   * Bound sheaves stood on their butts and leant together to dry, which is what
   * a harvested field is covered in for the fortnight before the carts come. It
   * is here to do a job no wall or crop can: it dates the act. The player
   * arrives in the capital's granary at harvest, everybody they meet is busy,
   * and the road is full because of that -- and the stooks say it in the
   * background without anybody having to mention the season.
   */
  private stook(px: Px): void {
    const P = this.unit(px);

    /** One sheaf: a tapering bundle, a tie, and ears fanning off the top. */
    const sheaf = (bx: number, tx: number, top: number, seed: number) => {
      for (let y = 15; y >= top; y--) {
        const t = (15 - y) / (15 - top);
        const cx = bx + (tx - bx) * t;
        const half = 2 - Math.round(t);
        const lo = Math.round(cx - half), hi = Math.round(cx + half);
        for (let x = lo; x <= hi; x++) {
          const edge = x === lo ? PAL.wheatDeep : x === hi ? PAL.wheatDark : PAL.wheatMid;
          P(x, y, (x * 3 + y * 5 + seed) % 7 === 0 ? PAL.wheatLight : edge);
        }
      }
      // The band. Every sheaf in Caelora is tied with a twist of its own straw.
      const bandY = top + Math.round((15 - top) * 0.42);
      for (let x = -2; x <= 2; x++) P(Math.round(bx + (tx - bx) * 0.58) + x, bandY, PAL.loamDark);
      // Ears, fanned.
      for (let k = -2; k <= 2; k++) {
        P(tx + k, top - 1, PAL.wheatPale);
        if (k % 2 === 0) P(tx + k, top - 2, PAL.wheatLight);
      }
    };

    sheaf(4, 5, 6, 1);
    sheaf(12, 11, 6, 4);
    sheaf(8, 8, 3, 2);
    this.footShadow(P, 2, 13, 15);
  }

  /**
   * A milestone.
   *
   * The oldest piece of infrastructure on the road and the smallest, and it
   * carries the whole shape of the act: the number on it goes down. Nobody has
   * to say the capital is close. The player reads it off a stone.
   *
   * Four alternates, four different cuts, because a road signed with the same
   * mark nine times over is worse than a road signed nowhere at all -- and the
   * moss is always on the same side, because it always is.
   */
  private milestone(px: Px): void {
    const P = this.unit(px);

    for (let y = 6; y < 16; y++) {
      const half = y === 6 ? 2 : 3;
      for (let x = 8 - half; x <= 7 + half; x++) {
        const lit = (8 - x) / 6 + (10 - y) / 14;
        P(x, y, lit > 0.25 ? PAL.stonePale : lit > -0.25 ? PAL.stoneLight
          : lit > -0.8 ? PAL.stoneMid : PAL.stoneDark);
      }
    }
    for (let x = 5; x <= 10; x++) P(x, 5, PAL.stoneLight);
    for (let x = 6; x <= 9; x++) P(x, 4, PAL.outline);
    P(5, 5, PAL.outline); P(10, 5, PAL.outline);
    for (let y = 5; y < 16; y++) { P(4, y, PAL.outline); P(11, y, PAL.outline); }
    P(5, 6, PAL.stoneMid); P(10, 6, PAL.stoneDark);
    // The cut face: a name above a distance, both drawn as strokes rather than
    // as type, because five units of real lettering is mush.
    const cut = Math.floor(hash2(0, 0, 1217) * 4);
    for (let x = 6; x <= 9; x++) P(x, 8, PAL.stoneDeep);
    const digits: number[][] = [[6, 8], [6, 7, 9], [7, 9], [6, 9]];
    for (const x of digits[cut]!) { P(x, 10, PAL.stoneDeep); P(x, 11, PAL.stoneDeep); }
    P(7, 12, PAL.stoneDeep); P(8, 12, PAL.stoneDeep);
    // North side, and it is always the north side.
    for (let y = 8; y < 15; y++) {
      if (hash2(y, 3, 1223) > 0.45) P(5, y, PAL.mossDark);
      if (hash2(y, 4, 1229) > 0.7) P(6, y, PAL.mossMid);
    }
    this.footShadow(P, 4, 11, 15);
  }

  /**
   * A telegraph pole.
   *
   * The quietest thing on the road and one of the loudest arguments in it. The
   * wetlands ring a bell when somebody is late; this country writes ahead. A
   * line of these marching up the verge beside the rails says that the capital
   * knows what is coming before it arrives, which is the single most Meridian
   * fact about the place, and it is said entirely in scenery.
   *
   * No wires, on purpose. A wire drawn across the cell only joins up if a pole
   * stands on every tile, and a pole every sixteen pixels is a picket fence;
   * drawn as a stub it ends in mid-air. The crossarm silhouette is what reads
   * at 1x, so the crossarms are what the tile spends its units on.
   */
  private telegraph(px: Px): void {
    const P = this.unit(px);

    for (let y = 1; y < 16; y++) {
      P(7, y, PAL.woodLight);
      P(8, y, PAL.woodDeep);
      if (y % 4 === 1) P(7, y, PAL.woodPale);
      if (y > 11) { P(7, y, PAL.woodDark); P(8, y, PAL.trunkDeep); }
    }
    /** One crossarm: the arm, its shadow, and glass insulators along it. */
    const arm = (y: number, half: number) => {
      for (let x = 8 - half; x <= 7 + half; x++) {
        P(x, y, PAL.woodMid);
        P(x, y + 1, PAL.woodDeep);
      }
      for (const x of [8 - half, 7 + half, 8 - half + 2, 7 + half - 2]) {
        P(x, y - 1, PAL.glassLight);
        P(x, y - 2, PAL.glassHi);
      }
    };
    arm(4, 6);
    arm(8, 4);
    P(7, 1, PAL.woodPale);
    this.footShadow(P, 5, 10, 15);
  }

  /**
   * The embankment.
   *
   * The flank of the raised line, and the reason a railway is a shape on the
   * map rather than a stripe painted across it. It is solid: the whole point
   * of putting a main line through farmland is that the farmland is now in two
   * halves and the road has to find a crossing, which is what turns a flat
   * plain into a route with decisions in it.
   *
   * Drawn as the face a player standing SOUTH of the line sees -- broken stone
   * at the shoulder, grading down through weeds into the field at the foot --
   * so it belongs in the row below a track run. The far side of the line gets
   * no bank, exactly as a cliff in this genre only ever shows one face.
   */
  private embankment(px: Px, fill: (c: string) => void): void {
    fill(PAL.stoneMid);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 6, 1231) * 0.6
          + wrapNoise(x * DETAIL, y * DETAIL, 3, 1237) * 0.4;
        // The line where stone gives out and the bank goes green, wandering by
        // a couple of units so a long run is a slope and not a painted band.
        const grassAt = 7 + Math.round(Math.sin((x / S) * Math.PI * 2) * 1.6) + (n > 0.6 ? 1 : 0);
        let c: string;
        if (y < grassAt) {
          c = n > 0.64 ? PAL.stonePale : n > 0.48 ? PAL.stoneLight
            : n > 0.32 ? PAL.stoneMid : PAL.stoneDark;
          if (hash2(x, y, 1249) > 0.94) c = PAL.stoneDeep;
        } else {
          const d = (y - grassAt) / 9;
          c = d < 0.2 ? PAL.weedLight : d < 0.5 ? PAL.weedMid
            : d < 0.78 ? PAL.weedDark : PAL.weedDeep;
          if (hash2(x, y, 1259) > 0.9) c = PAL.seedHead;
        }
        P(x, y, c);
      }
    }
    // The lit crest, so a run of these reads as ground that is higher than the
    // field beside it.
    for (let x = 0; x < S; x++) P(x, 0, hash2(x, 0, 1277) > 0.5 ? PAL.stonePale : PAL.stoneLight);
    for (let x = 0; x < S; x++) P(x, S - 1, PAL.contact);
  }

  /**
   * The permanent way.
   *
   * Ballast, sleepers and two rails, and it is solid, because nobody in this
   * game walks up the middle of a working main line. One painter draws both
   * directions: the vertical run is the horizontal one transposed through the
   * writer, so the two can never drift apart as the tile is tuned.
   *
   * The rail head is the brightest colour used outdoors anywhere in Caelora,
   * and that is the tile's whole argument. Nothing else in this world is
   * polished. Two white threads running away to the north are the first thing
   * the player has seen that was made by an industry rather than by a trade,
   * and the capital is at the end of them.
   */
  private track(px: Px, fill: (c: string) => void, dir: 'h' | 'v'): void {
    fill(PAL.stoneMid);
    const P0 = this.unit(px);
    const S = TILE_SIZE;
    const P: Px = dir === 'h' ? P0 : (x, y, c) => P0(y, x, c);

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 4, 1283);
        let c: string = n > 0.62 ? PAL.stoneLight : n < 0.38 ? PAL.stoneDark : PAL.stoneMid;
        const g = hash2(x, y, 1289);
        if (g > 0.9) c = PAL.stonePale;
        else if (g < 0.08) c = PAL.stoneDeep;
        P(x, y, c);
      }
    }
    // Sleepers, four to the cell with a clear unit of ballast between them, so
    // a run of the tile draws an even ladder rather than a moire. Pulled back
    // off black on purpose: they are the ground the rail sits on, and when they
    // were the darkest thing in the cell they took the tile over.
    for (let sx = 1; sx < S; sx += 4) {
      for (let y = 1; y <= 14; y++) {
        P(sx, y, PAL.tarPale);
        P(sx + 1, y, PAL.tarLight);
        P(sx + 2, y, PAL.tarMid);
        if ((y * 3 + sx) % 7 === 0) P(sx + 1, y, PAL.tarDark);
      }
    }
    // Rails, at a seven-unit gauge: the shadow the rail throws, the polished
    // head, the lit web under it and the foot. Four rows apiece, because a
    // one-unit head at 1x is a rumour.
    for (const ry of [4, 11]) {
      for (let x = 0; x < S; x++) {
        P(x, ry - 1, PAL.steelDeep);
        P(x, ry, hash2(x, ry, 1291) > 0.1 ? PAL.railHead : PAL.steelPale);
        P(x, ry + 1, PAL.steelLight);
        P(x, ry + 2, hash2(x, ry, 1297) > 0.82 ? PAL.railRust : PAL.steelDeep);
      }
    }
  }

  /**
   * The permanent way, turning.
   *
   * A railway cannot corner on a tile the way a footpath can -- a right angle
   * in a rail is a derailment, and it reads as one. So the curve is a real
   * quarter circle struck from the corner the track is turning around, with
   * the sleepers laid radially the way they actually are on a curve.
   *
   * cx, cy is that corner in authoring units: 0 or 16 on each axis. The two
   * open edges are the two the corner does not touch.
   */
  private trackTurn(px: Px, fill: (c: string) => void, cx: number, cy: number): void {
    fill(PAL.stoneMid);
    const P = this.unit(px);
    const S = TILE_SIZE;
    const sx = cx === 0 ? 1 : -1;
    const sy = cy === 0 ? 1 : -1;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 4, 1301);
        let c: string = n > 0.62 ? PAL.stoneLight : n < 0.38 ? PAL.stoneDark : PAL.stoneMid;
        const g = hash2(x, y, 1303);
        if (g > 0.9) c = PAL.stonePale;
        else if (g < 0.08) c = PAL.stoneDeep;
        P(x, y, c);
      }
    }
    // Radial sleepers, laid the way they are on a real curve: six across the
    // quarter, each three units wide, and reaching a unit past both rails so
    // the track has a bed rather than two arcs floating on ballast.
    for (let i = 0; i < 6; i++) {
      const a = ((i + 0.5) / 6) * (Math.PI / 2);
      const dx = sx * Math.cos(a), dy = sy * Math.sin(a);
      const nx = -dy, ny = dx;
      for (let r = 1.5; r <= 14; r += 0.25) {
        for (let w = -1.2; w <= 1.2; w += 0.6) {
          P(Math.round(cx + dx * r + nx * w), Math.round(cy + dy * r + ny * w),
            w < -0.5 ? PAL.tarPale : w < 0.5 ? PAL.tarLight : PAL.tarMid);
        }
      }
    }
    // Two rails, struck at the same gauge the straight uses.
    for (const rr of [4, 11]) {
      for (let t = 0; t <= 1.0001; t += 0.006) {
        const a = t * (Math.PI / 2);
        const dx = sx * Math.cos(a), dy = sy * Math.sin(a);
        P(Math.round(cx + dx * (rr - 1)), Math.round(cy + dy * (rr - 1)), PAL.steelDeep);
        P(Math.round(cx + dx * (rr + 1)), Math.round(cy + dy * (rr + 1)), PAL.steelLight);
        P(Math.round(cx + dx * (rr + 2)), Math.round(cy + dy * (rr + 2)), PAL.steelDeep);
        P(Math.round(cx + dx * rr), Math.round(cy + dy * rr), PAL.railHead);
      }
    }
  }

  /**
   * A level crossing.
   *
   * The one tile of railway a player is allowed to stand on, and the reason
   * the line is a barrier everywhere else. Baulks of timber laid between and
   * outside the rails, with the road running straight over them and the two
   * heads left flush and bright.
   *
   * The timber is what makes it read as a place to cross rather than as road
   * paint, and timber has a direction -- so the tile has one too, and the
   * vertical cut is the horizontal one transposed through the writer, exactly
   * as the straight track is. 'h' is a line running east to west with the road
   * crossing it north to south; 'v' is the other way round.
   */
  private trackCrossing(px: Px, fill: (c: string) => void, dir: 'h' | 'v'): void {
    this.highroad(px, fill);
    const P0 = this.unit(px);
    const S = TILE_SIZE;
    const P: Px = dir === 'h' ? P0 : (x, y, c) => P0(y, x, c);

    const baulk = (y0: number, y1: number) => {
      for (let y = y0; y <= y1; y++) {
        const tone = hash2(y, 0, 1307);
        for (let x = 0; x < S; x++) {
          let c: string = tone > 0.62 ? PAL.plankLight : tone < 0.32 ? PAL.plankDark : PAL.plankMid;
          if ((x * 5 + y * 7) % 13 === 2) c = PAL.plankPale;
          if (hash2(x, y, 1319) > 0.94) c = PAL.roadDark;   // road dirt trodden in
          P(x, y, c);
        }
      }
      for (let x = 0; x < S; x++) P(x, y1, PAL.plankDeep);
    };
    baulk(1, 3);
    baulk(6, 10);
    baulk(13, 15);
    for (const ry of [4, 11]) {
      for (let x = 0; x < S; x++) {
        P(x, ry, hash2(x, ry, 1321) > 0.1 ? PAL.railHead : PAL.steelPale);
        P(x, ry + 1, PAL.steelDark);
      }
    }
  }

  /**
   * A semaphore signal.
   *
   * One arm, off, and it is off because there is no train in the section right
   * now -- which is the only way a still picture can say that a railway is
   * being operated by somebody rather than merely existing. It is the tallest
   * thing on the open plain and it is worth the units for that alone.
   */
  private trackSignal(px: Px): void {
    const P = this.unit(px);

    // Lattice mast. Two uprights and a zigzag between them, which is what a
    // lattice post looks like once it is four units wide.
    for (let y = 1; y < 16; y++) {
      P(6, y, PAL.steelMid);
      P(9, y, PAL.steelDeep);
      P(y % 2 === 0 ? 7 : 8, y, PAL.steelDark);
      if (y % 3 === 0) P(7, y, PAL.steelLight);
    }
    for (let x = 5; x <= 10; x++) { P(x, 15, PAL.steelDeep); P(x, 14, PAL.steelDark); }
    // The arm, lowered to clear: a red blade with a white bar across it.
    for (let x = 0; x <= 5; x++) {
      P(x, 3, PAL.redDark);
      P(x, 4, PAL.redMid);
      P(x, 5, PAL.redDeep);
    }
    for (const x of [1, 2]) { P(x, 3, PAL.plasterPale); P(x, 4, PAL.trimPale); }
    P(0, 4, PAL.outline);
    // Spectacle plate and lamp, hung below the pivot.
    P(6, 6, PAL.outline); P(5, 6, PAL.redLight); P(5, 7, PAL.redDeep);
    // The ladder somebody climbs to trim that lamp.
    for (let y = 7; y < 14; y += 2) { P(10, y, PAL.steelLight); P(11, y, PAL.steelDark); }
    this.footShadow(P, 4, 11, 15);
  }

  /**
   * A platform.
   *
   * Asphalt over a stone-faced bank, which is what a country halt is made of,
   * and the one piece of civil engineering in this act that exists purely so
   * that people can wait. edge swaps the bottom rows for the coping and the
   * painted line, so it belongs in the row of the platform nearest the track --
   * the halt is laid out with the line running along the south side.
   */
  private haltDeck(px: Px, fill: (c: string) => void, edge: boolean): void {
    fill(PAL.roadLight);
    const P = this.unit(px);
    const S = TILE_SIZE;

    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const n = wrapNoise(x * DETAIL, y * DETAIL, 6, 1327);
        let c: string = n > 0.6 ? PAL.roadPale : n < 0.4 ? PAL.roadMid : PAL.roadLight;
        if (hash2(x, y, 1331) > 0.94) c = PAL.roadDark;
        P(x, y, c);
      }
    }
    // Slab joints, so the surface reads as laid rather than poured. Kept to
    // one step below the slab: a joint drawn at full contrast turns a platform
    // into a chequerboard long before it turns into paving.
    for (let x = 0; x < S; x++) {
      if ((x + 3) % 8) continue;
      for (let y = 0; y < S; y++) P(x, y, hash2(x, y, 1373) > 0.3 ? PAL.roadMid : PAL.roadDark);
    }
    for (let y = 0; y < S; y++) {
      if ((y + 5) % 8) continue;
      for (let x = 0; x < S; x++) P(x, y, hash2(x, y, 1381) > 0.3 ? PAL.roadMid : PAL.roadDark);
    }

    if (!edge) return;
    // Coping, painted line, and the drop into the four-foot.
    for (let x = 0; x < S; x++) {
      P(x, 12, hash2(x, 1, 1361) > 0.2 ? PAL.plasterPale : PAL.roadPale);
      P(x, 13, hash2(x, 2, 1367) > 0.5 ? PAL.stonePale : PAL.stoneLight);
      P(x, 14, PAL.stoneMid);
      P(x, 15, PAL.stoneDeep);
      if ((x + 2) % 6 === 0) { P(x, 13, PAL.stoneDark); P(x, 14, PAL.stoneDark); }
    }
  }

}

/**
 * The Aurelian ramps.
 *
 * Kept out of PAL on purpose. Every other material in the file belongs to
 * Caelora as it is now and gets mixed against its neighbours; this one belongs
 * to a civilisation that has been gone for three thousand years and is only
 * ever seen on its own, in rooms nothing else is allowed into. Filing it apart
 * is also what stops somebody reaching for "that nice pale stone" when they
 * are building a house.
 *
 * The current is deliberately the Tideheart's own blue-green rather than a
 * colour of its own. It is the same technology, and the player should be able
 * to see that before anybody explains it.
 */
const AUR = {
  // Machined limestone. Warm and pale -- brighter than anything else
  // underground, so a lit Aurelian room reads as lit from inside itself.
  //
  // The range across the whole ramp is deliberately narrow. This is the surface
  // the player spends the entire dungeon standing on and every other thing in
  // the temple is seen against it, so it has to be a value rather than a
  // texture: the first cut ran from #4a3f2c to #efe4c6, a five-stop ramp with
  // real contrast in it, and the floor ate the room.
  deep: '#8d8168',
  dark: '#a89b80',
  mid: '#bcb094',
  light: '#cdc2a7',
  pale: '#ddd3ba',
  // Basalt, cut to the same tolerance and half the brightness.
  wallDeep: '#191a24',
  wallDark: '#2b2d3c',
  wallMid: '#3d4053',
  wallLight: '#565a72',
  wallPale: '#767b96',
  // Bronze inlay: pins, courses and the spirals cut into the floor.
  goldDim: '#7a6224',
  gold: '#bd9438',
  goldLit: '#f0d183',
  // The current.
  glowDeep: '#05262f',
  glowDim: '#0e5f6c',
  glowMid: '#2bbfb9',
  glowHi: '#8bf1e3',
  glowCore: '#eafffb',
  spill: 'rgba(70,225,210,0.22)',
  spillFar: 'rgba(70,225,210,0.13)',
  spillEdge: 'rgba(70,225,210,0.07)',
  // The lip of anything cut into the floor: a groove, a socket, a joint that
  // has to be seen from across the room rather than felt underfoot.
  cut: '#5f5644',
  // A groove with nothing in it. Cut stone in shadow -- dark enough to read as
  // a channel at a glance, light enough not to read as a hole in the floor.
  slotDark: '#7b7159',
  slotDeep: '#453e2f',
  // Cinder blown up the shaft.
  ashDark: '#4e463c',
  ashMid: '#6d6357',
  ashLight: '#8d8375',
  ember: '#d85c1c',
  // The shaft itself.
  //
  // The crust is deliberately NOT black. Set rock at this scale wants to be a
  // dark warm grey with fire showing between the plates; mixed from near-black
  // it stops reading as rock at all and the lake comes out as a grid of holes
  // with orange in the gaps, which is what the first cut of it did.
  crustDeep: '#3b2b22',
  crust: '#553c2e',
  crustLight: '#6e4d38',
  lavaDark: '#a5330f',
  lavaMid: '#e9691a',
  lavaHot: '#ffd15c',
  outline: '#181a22',
} as const;

/**
 * Aureline's ramps.
 *
 * Kept out of PAL for the reason the Aurelian block above gives, turned round:
 * that family is a civilisation nothing else is allowed near, and this one is a
 * city that must not be allowed to leak. Aureline is made of imported and
 * manufactured material -- float glass, rolled steel, macadam, granite brought
 * in by rail -- and none of it should ever end up on a cottage in Briarbell
 * because somebody reached for "that nice pale stone".
 *
 * Three arguments are baked into the numbers. FIRST, the ground is split: the
 * footway is the palest surface in the game and the carriageway is the darkest,
 * so the plan of a city of a hundred and fifty thousand reads from colour alone
 * with no signage at all. SECOND, the glass is cold and the doors are warm --
 * every way into a building in this city is the only warm thing on its
 * frontage, which is what stops a street of forty identical bases from being a
 * puzzle. THIRD, the old quarter's granite is warmer and dirtier than the
 * paving it was cut from, because three hundred years of soot is the difference
 * between the two halves of the city and it has to be visible on the stone.
 */
const CITY = {
  // Footway. Imported granite flags, warm, and high in the ramp: every sprite
  // in the capital is seen against this.
  paveDeep: '#8b8577',
  paveDark: '#a7a091',
  paveMid: '#c3bcac',
  paveLight: '#d9d3c5',
  pavePale: '#efeade',
  // Carriageway. The darkest ground layer in the game, on purpose.
  roadDeep: '#2c3037',
  roadDark: '#474c56',
  roadMid: '#585e69',
  roadLight: '#6a707c',
  roadGrit: '#9aa0ab',
  // The Old City's setts: a four-unit module, warm, hand-laid.
  cobbleDeep: '#463f37',
  cobbleDark: '#61594d',
  cobbleMid: '#786e5f',
  cobbleLight: '#8e8371',
  cobblePale: '#a49883',
  // Park gravel.
  gravelDeep: '#a09a86',
  gravelDark: '#b9b099',
  gravelMid: '#cec5ad',
  gravelLight: '#ded6c1',
  gravelPale: '#eee7d6',
  // Curtain wall. A cold blue-green: the sea and the sky in a north-facing
  // window, and nothing at all like the warm Aurelian current.
  glassDark: '#1f4356',
  glassMid: '#336c81',
  glassLight: '#5fa2b4',
  glassHi: '#a6d7e2',
  // Blinds and lit floors, the two things a pane can be other than sky.
  blindMid: '#b6bcbd',
  blindLight: '#d7dcdc',
  litDark: '#c9a469',
  litMid: '#e8c98f',
  litPale: '#fbeec5',
  // Stone cladding on the piers and the shopfront pilasters.
  cladDeep: '#77726b',
  cladDark: '#948e85',
  clad: '#b3aca1',
  cladPale: '#dcd6cb',
  // Rolled steel, in the curtain wall's own frame.
  steelDark: '#4b5461',
  steelLight: '#aeb8c4',
  // Roof decks.
  deckDeep: '#2f3a44',
  deckDark: '#48555f',
  deckMid: '#606e79',
  deckLight: '#84929c',
  // Gilt. The one warm accent the modern city allows itself, and it is on every
  // parapet, every railing head and every door surround -- which is the whole
  // reason the place is called Aureline.
  goldDark: '#9b7a2c',
  gold: '#cfa845',
  goldLit: '#f2dc95',
  // Polished granite at street level.
  plinthDeep: '#20242b',
  plinthDark: '#333944',
  plinthMid: '#454d5b',
  plinthLight: '#646e7f',
  // Shop window dressing. Three saturated blocks, unreadable on purpose.
  wareA: '#c0392b',
  wareB: '#2f7d5a',
  wareC: '#7a4fa0',
  // Awnings and the fascia over them.
  awnA: '#b8443c',
  awnALit: '#d76a5c',
  awnADark: '#8a2f2b',
  awnB: '#e8dfcb',
  awnBLit: '#faf3e4',
  awnBDark: '#b3a892',
  fascia: '#2f4a3e',
  fasciaLit: '#456658',
  // The Old City's ashlar, and the soot in it.
  graniteDeep: '#544f47',
  graniteDark: '#726c60',
  graniteMid: '#8c8578',
  graniteLight: '#a69e8f',
  granitePale: '#c0b8a8',
  soot: '#464239',
  // Old glass, old paint, old timber.
  paneMid: '#6f93a3',
  paneLight: '#9fc0cb',
  paneHi: '#d5e8ee',
  sash: '#e9e2d2',
  sashDark: '#b3aa96',
  doorDeep: '#2a1c16',
  doorDark: '#4a3226',
  doorMid: '#63432f',
  // The Meridian Foundation. White composite, their blue, their glazing.
  merShade: '#b7c2d1',
  merPanel: '#e3eaf3',
  merPale: '#f8fbff',
  merBlueDark: '#17406f',
  merBlue: '#2668ad',
  merSky: '#9ed2f5',
  merGlassDeep: '#12314c',
  merGlass: '#1d4e77',
  merGlassLight: '#3079a8',
  // Track, sleepers and ballast.
  ballastDark: '#4a4741',
  ballastMid: '#6b675e',
  ballastLight: '#8d8779',
  sleeper: '#463427',
  sleeperLit: '#5e4835',
  // Platform slab and the line you do not cross.
  slabDeep: '#8d8b85',
  slabDark: '#a8a69f',
  slabMid: '#c2c0b8',
  slabLight: '#d9d7cf',
  warnLine: '#e8b53a',
  warnDark: '#a67d1e',
  // The trainshed: sooty glazing on steel.
  shedGlassDark: '#4d5a5e',
  shedGlass: '#67767a',
  shedGlassLit: '#93a5a8',
  shedSteel: '#39424c',
  shedSteelLit: '#7c8998',
  // Cast iron: lamps, railings, tree grates, bench ends.
  ironDark: '#22262e',
  ironMid: '#3a4049',
  ironLight: '#5b626d',
  // Lamplight, and what it throws on the ground.
  lampGlow: '#f3d99a',
  lampCore: '#fff6dc',
  lampSpill: 'rgba(250,220,150,0.30)',
  lampSpillFar: 'rgba(250,220,150,0.15)',
  // Bronze, for the statues nobody remembers the names of.
  bronzeDark: '#4b3a18',
  bronze: '#7d6428',
  bronzeLit: '#b39a4e',
  // Ornamental water: a stone basin a hand's depth under still water.
  basinDeep: '#3d5f74',
  basinMid: '#5f8ba0',
  basinLight: '#7fa9bb',
  basinSky: '#a9cfdc',
  basinGlint: '#eafaff',
  outline: '#1c1f27',
} as const;
