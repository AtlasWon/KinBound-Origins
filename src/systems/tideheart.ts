/**
 * The Tideheart.
 *
 * The object the whole story hangs off, modelled as an object rather than as a
 * flag. Canon: palm-sized, a deep blue-turquoise core in a frame of ancient
 * metal, circles and spirals cut into it, something moving inside like liquid
 * or light. Half machine, half not. The Aurelians built it to *talk* to
 * Neravoss -- it opens their ruins, wakes their mechanisms, plays back what
 * they recorded, and points toward their structures. It is not a key and it is
 * not a weapon, and the game must never let it feel like either.
 *
 * WHAT LIVES HERE
 *
 *   1. THE SITES TABLE. Every Aurelian place the Tideheart can feel, in one
 *      list, gated by build stage. This is the mechanism the later stages
 *      need -- opening ruins, waking mechanisms, playing back recordings,
 *      pointing -- built once, now, even though Stage 1 uses a single row of
 *      it. See ADDING A SITE at the bottom of this comment.
 *
 *   2. THE READING. `readTideheart(state)` is the one answer to "what is this
 *      thing doing right now", and every screen that shows the object asks it
 *      rather than working it out again. It knows whether the player is
 *      holding it, whether they have learned its name, whether it is stirring,
 *      how hard, which way the source lies, and which echoes it has taken.
 *
 *   3. THE NAME AND THE DESCRIPTION. Canon is explicit: the player does not
 *      learn the name at once, so the *interface* must not say "Tideheart"
 *      until they do. That is done by rewriting the registry's own ItemData in
 *      place -- name, description and icon key -- so the bag, the shop, the
 *      "you received" line and anything written later all follow from one
 *      place and none of them need to know this file exists. The JSON on disk
 *      carries the pre-name text, so even with this code never running the
 *      game cannot spoil the name.
 *
 * HOW IT REACTS, AND HOW THE PLAYER CAN TELL
 *
 * Three channels, on purpose, because one is missable:
 *
 *   - THE WORLD. Arriving somewhere it can feel plays a low swelling cue,
 *     unprompted, with nobody saying anything. Driven from the map change
 *     itself (GameState.currentMap), so it happens whether or not the map's
 *     author remembered to write a scene for it.
 *   - THE BAG. The item's description changes to say it is warm and turning,
 *     and its icon key swaps to the lit one, so the row itself looks different
 *     in the list before it is even selected.
 *   - THE OBJECT. Open it (scenes/tideheart.ts) and it is visibly faster,
 *     brighter, and pointing.
 *
 * WHAT THE STORY SIDE HAS TO DO, which is almost nothing:
 *
 *   flag  tideheart_given        it is in the player's hands (set by the gift)
 *   flag  tideheart_named        the interface may now call it the Tideheart
 *   flag  tideheart_echo_<id>    site <id> has been woken; its echo is readable
 *   flag  tideheart_taken        Meridian have it; Stage 4 sets this
 *
 * All four are ordinary story flags, so they save, they load and they can be
 * set from JSON with `setFlag`. No new event opcode exists for the Tideheart
 * and none should: a beat that needs it is `hasItem` plus `setFlag`.
 *
 * ADDING A SITE IN A LATER STAGE
 *
 *   1. Add a row to SITES with the next `stage` number, the maps it can be
 *      felt on, optionally the tile its mechanism stands on, and its echo.
 *   2. Raise BUILT_STAGE when that stage ships. Rows above BUILT_STAGE are
 *      inert -- they do not stir, they do not point, they are not listed --
 *      so a half-built site cannot be walked into.
 *   3. In that map's own event JSON, when the player uses it:
 *          { "kind": "setFlag", "flag": "tideheart_echo_<id>" }
 *      or call the shared script `tideheart_wake_<id>` if you want the stock
 *      presentation (the cue, the shake, the line) rather than writing one.
 *
 * That is the whole extension. No engine change, no new scene, no new item.
 */

import { registry } from '../data/registry.js';
import { audio } from '../audio/audio.js';
import type { GameState } from './state.js';

/** The item id. Stable forever -- saves carry it. */
export const TIDEHEART = 'tideheart';

/** Story flags this system reads. Named here so nothing spells them twice. */
export const TH_FLAGS = {
  /** Set when it is handed over. */
  given: 'tideheart_given',
  /** Set when the player learns what it is called. Stage 2 (Cassian, in public). */
  named: 'tideheart_named',
  /** Set when Meridian take it. Stage 4. */
  taken: 'tideheart_taken',
} as const;

/** The flag that says a site has been woken and its echo is readable. */
export function echoFlag(siteId: string): string {
  return `tideheart_echo_${siteId}`;
}

/* --------------------------------------------------------------- the sites */

export interface AurelianSite {
  /** Short, stable. Appears in a flag name, so never rename one in place. */
  id: string;
  /** Build stage that ships it. Rows above BUILT_STAGE are inert. */
  stage: number;
  /** What the player ends up calling the place. */
  name: string;
  /**
   * Every map the Tideheart can feel this site from -- the ruin itself and
   * the approach to it. A whole route belongs here: feeling it the moment you
   * step onto the road is what turns a route into a place with something in
   * it, and the bearing below is what stops that being a nag.
   */
  maps: string[];
  /**
   * The mechanism's own tile, for pointing. Optional: without it the object
   * still stirs, it just cannot say which way. Fill it in when the map exists.
   */
  at?: { map: string; x: number; y: number };
  /** The instrument's own words while it is stirring and unanswered. */
  near: string;
  /** ...and once it has been answered and the place is behind you. */
  after: string;
  /** What it played back. Short boxes; the picture does the work, not the prose. */
  echo: { title: string; lines: string[] };
}

/**
 * The stage the game is built to. Stage 1 is Act 1: Hearthmere, Route 1,
 * Briarbell, Route 2's ruin, Stonewake. Stage 2 is Act 2: Eastwind Ridge, the
 * coast road and Tideglass. Stage 3 is Act 3: Embercoil, Emberfall, the
 * wetlands and Mirehaven, and it carries the first two of the three Aurelian
 * sites Sorrell finds in Elias' notes. Raise this when a later stage ships,
 * and not before -- it is the switch that keeps unbuilt sites out of the
 * player's hands.
 */
export const BUILT_STAGE = 3;

export const SITES: AurelianSite[] = [
  {
    id: 'sunken_arch',
    stage: 1,
    name: 'The Sunken Arch',
    // Route 2 carries the ruin. `route_2_ruin` is listed as well so that if
    // the ruin is built as its own interior map under that name it works with
    // no change here; if it lands under some other id, add that id to this
    // list and nothing else in the game has to move.
    maps: ['route_2', 'route_2_ruin'],
    near: 'Something old is close, and it is answering.',
    after: 'The Arch is quiet now. It was not quiet.',
    echo: {
      title: 'The Sunken Arch',
      lines: [
        'Light crawls along the wall, and the carving moves inside it.',
        'People. Kin beside them, not behind them. Then the sea.',
        'Then something under the sea, drawn so large the mason ran out of wall.',
        'The light gutters out. The stone is cold again, and older than it was.',
      ],
    },
  },
  {
    id: 'glass_quay',
    stage: 2,
    name: 'The Glass Quay',
    /*
     * ACT 2. The Aurelian mole the modern harbour was built on top of, and the
     * reason the third city has the name it has: the old sea-wall runs out
     * under the water in one unbroken piece of something that is not stone.
     *
     * NO `at` TILE, ON PURPOSE, and this is the whole trick of the beat. The
     * mechanism is not a thing standing on a tile that somebody has to build
     * and remember to hook up -- it is the ground. So the object stirs the
     * moment the player sets foot in Tideglass or on the coast road above the
     * old wall, with a steady half-intensity and no needle, and that happens
     * whether or not the city's author ever heard of this file. It is what
     * Cassian notices in the crowd, and it is what answers on the road when
     * somebody puts a hand in the player's bag. See `act2_night_attempt` and
     * `tideheart_wake_glass_quay` in data/events/common.json.
     *
     * The Hall and its works are on the list as well as the streets. Mabry
     * flooded that hall herself and the tank under it is cut into the same
     * wall, so the object going quietly mad three floors down is the correct
     * answer and it costs one string.
     */
    maps: ['tideglass', 'tideglass_hall', 'tideglass_hall_works', 'route_4'],
    near: 'The whole harbour is answering it. Not a room in it. The ground.',
    after: 'Quieter now, and still not quiet. It knows this coast.',
    echo: {
      title: 'The Glass Quay',
      lines: [
        'The harbour, and not this one. The same water, a different wall.',
        'Boats tied along it. People sitting on the edge with their feet in the sea.',
        'Something enormous goes by underneath them, slow, and lights the whole bay green.',
        'Nobody stands up. Nobody runs. A child waves at it.',
      ],
    },
  },
  {
    id: 'embercoil_temple',
    stage: 3,
    name: 'The Embercoil Temple',
    /*
     * ACT 3, and the first of the three sites Sorrell finds in Elias' notes.
     * The first time the player is properly inside Aurelian architecture
     * rather than looking at a doorway in a wood: a listening station wound
     * round a volcanic shaft, because these people worked through resonance
     * and the mountain was already loud.
     *
     * FOUR MAPS AND THE CITY OUTSIDE. Emberfall is on the list deliberately.
     * The temple is up the stair cut into the city's west cliff, and an object
     * that only wakes once the player is already indoors has told them
     * nothing: the point of listing the approach is that the player arrives in
     * a geothermal town, feels the thing in their bag start pulling west, and
     * goes looking before anybody has said a word to them. It is the Glass
     * Quay's trick from Act 2, done with a mountain instead of a harbour.
     *
     * The `at` tile is what stops that being a nag. It names a tile on
     * `embercoil_temple` only, so out in the city the object pulls at a steady
     * half with no needle, and the needle only appears once the player is
     * inside and it has something to point at.
     *
     * The tile is the head of the stair in the outer coil rather than the
     * listening room three floors down, because the object should pull the
     * player toward the way in, not through the rock at the answer.
     */
    maps: [
      'emberfall',
      'embercoil_temple',
      'embercoil_temple_deep',
      'embercoil_temple_vault',
      'embercoil_temple_heart',
    ],
    at: { map: 'embercoil_temple', x: 14, y: 10 },
    near: 'It is pulling. Not toward a wall this time -- toward the floor.',
    after: 'Warm, and turning over, and no longer in any hurry.',
    echo: {
      title: 'The Embercoil Temple',
      lines: [
        'A room of seats, all facing in, and every groove in the floor lit.',
        'A great many voices at once, in a language nobody alive has heard.',
        'One of them asking. A long way down, something answering it.',
        'The same voices later, not asking, and something underneath in pain.',
        'Then a man, close and tired, saying a name and saying it was a mistake.',
      ],
    },
  },
  {
    id: 'mirehaven_sanctum',
    stage: 3,
    name: 'The Mirehaven Sanctum',
    /*
     * ACT 3, the second of the three sites, and the one that carries the
     * second truth: the Great Deluge was not something Neravoss did to the
     * Aurelians, it was something the Aurelians did to Neravoss, and Meridian
     * are repeating it line for line.
     *
     * The `at` tile is the plinth in the sealed chamber, three floors down,
     * which means the needle points *through* the dungeon the whole way in.
     * That is the only navigation the Sanctum offers and it is deliberately
     * enough: the pumped floor is a room with a walkway across it and the
     * drowned gallery is a ring with two arms, and a player who is lost only
     * has to look at the thing in their bag.
     *
     * Mirehaven itself is NOT on this list. The town is somebody else's map
     * and a row that names a map nobody has built is silent rather than
     * broken (see tideheartAudit) -- but a row that names a map somebody else
     * builds *differently* is worse than silent, so the site claims only the
     * three maps its own author owns. If the town wants the object stirring on
     * its eastern boardwalk, add 'mirehaven' here and nothing else moves.
     */
    maps: ['mirehaven_sanctum', 'mirehaven_sanctum_deep', 'mirehaven_sanctum_heart'],
    at: { map: 'mirehaven_sanctum_heart', x: 9, y: 2 },
    near: 'It has not pulled like this since the day it was put in your bag.',
    after: 'Quiet, and heavier than it was. It is carrying something now.',
    echo: {
      title: 'The Mirehaven Sanctum',
      lines: [
        'A sea floor from above, with rings laid on it in a circle a mile across.',
        'Something enormous inside the circle. It is not moving. It has been made not to move.',
        'The lights on the rings go from blue to white. The sea stands up. Then there is only water.',
        'Last of all, nine people on a hill, cutting a room out of rock so that somebody would know.',
      ],
    },
  },
];

/** The sites that actually exist in the shipped build. */
export function builtSites(): AurelianSite[] {
  return SITES.filter((s) => s.stage <= BUILT_STAGE);
}

/** The site a map belongs to, if any. */
export function siteForMap(mapId: string | null | undefined): AurelianSite | null {
  if (!mapId) return null;
  for (const site of builtSites()) if (site.maps.includes(mapId)) return site;
  return null;
}

export function siteById(id: string): AurelianSite | null {
  return builtSites().find((s) => s.id === id) ?? null;
}

/* ------------------------------------------------------------- the reading */

export type Compass = 'north' | 'south' | 'east' | 'west'
  | 'north-east' | 'north-west' | 'south-east' | 'south-west' | 'here';

export interface TideheartReading {
  /** In the player's hands right now. */
  held: boolean;
  /** The name the interface is allowed to use. */
  label: string;
  /** Whether that label is the real one. */
  named: boolean;
  /** The site it can feel, or null. */
  site: AurelianSite | null;
  /** Feeling something. */
  stirring: boolean;
  /** Already answered this one. */
  answered: boolean;
  /** 0..1. Distance-driven where the site's tile is known, else a steady half. */
  intensity: number;
  /** Which way the source lies, when the tile is known. */
  bearing: Compass | null;
  /** Direction vector for the needle, unit-ish, screen axes (y down). */
  needle: { x: number; y: number } | null;
  /** Every echo it has taken, oldest first. */
  echoes: AurelianSite[];
  /** One line for the instrument's own panel. */
  reading: string;
}

/** The name the interface uses before the player has learned the real one. */
export const UNNAMED_LABEL = "Father's Keepsake";
export const NAMED_LABEL = 'Tideheart';

const QUIET_TEXT =
  'A blue-green core in a frame of old, strange metal. Something inside it turns, slowly.';
const STIR_TEXT =
  'The core is racing and the frame is warm. Something close by is answering it.';
const CARRIED_TEXT =
  'It has spoken once, in a place older than the road. It is listening for the next one.';
const NAMED_TEXT =
  'Aurelian work. Made to speak to something in the deep, and not to command it.';
const NAMED_STIR_TEXT =
  'The Tideheart is hot in your hand. Whatever is near it is talking back.';

/**
 * What it is, as opposed to what it is doing.
 *
 * Shown under the reading on the object's own screen whenever there is room
 * for it -- which is whenever it is calm, and calm is when a player is most
 * likely to be looking at it out of curiosity rather than for directions.
 * It is a fact the player can see for themselves and it does not name the
 * Aurelians, because at this point nobody in the game can.
 *
 * MEASURED. The panel is 112 units of text, which is eighteen characters, and
 * the calm reading leaves it three lines. Fifty-one characters is what fits;
 * anything longer is truncated with an ellipsis, in the one place on the
 * screen whose whole job is being read.
 */
export const TIDEHEART_DETAIL = 'Palm-sized. Nobody in Caelora works metal like this.';

/** Icon keys. See the note to the item-art owner in this file's header. */
const ICON_QUIET = 'key_tideheart';
const ICON_LIT = 'key_tideheart_lit';

export function readTideheart(state: GameState): TideheartReading {
  const held = state.hasItem(TIDEHEART);
  const named = state.hasFlag(TH_FLAGS.named);
  const site = held ? siteForMap(state.currentMap) : null;
  const answered = site ? state.hasFlag(echoFlag(site.id)) : false;
  const echoes = builtSites().filter((s) => state.hasFlag(echoFlag(s.id)));

  let intensity = 0;
  let bearing: Compass | null = null;
  let needle: { x: number; y: number } | null = null;

  if (site) {
    const at = site.at && site.at.map === state.currentMap ? site.at : null;
    if (at) {
      const dx = at.x - state.currentX;
      const dy = at.y - state.currentY;
      const dist = Math.hypot(dx, dy);
      // Full at the mechanism, a quarter at twenty tiles out, and never zero
      // while the site is on this map -- a needle that dies at range reads as
      // a bug rather than as distance.
      intensity = Math.max(0.25, Math.min(1, 1 - dist / 26));
      if (dist < 1.5) {
        bearing = 'here';
        needle = null;
      } else {
        bearing = compassOf(dx, dy);
        needle = { x: dx / dist, y: dy / dist };
      }
    } else {
      intensity = 0.5;
    }
  }

  // Answering a site does not switch it off -- the object is still in a place
  // that talks to it -- but it stops it pulling.
  const stirring = !!site && !answered;

  return {
    held,
    label: named ? NAMED_LABEL : UNNAMED_LABEL,
    named,
    site,
    stirring,
    answered,
    intensity: stirring ? intensity : site ? intensity * 0.4 : 0,
    bearing: stirring ? bearing : null,
    needle: stirring ? needle : null,
    echoes,
    reading: readingLine(held, named, site, answered, echoes.length),
  };
}

function readingLine(
  held: boolean, named: boolean, site: AurelianSite | null,
  answered: boolean, echoCount: number,
): string {
  if (!held) return 'Not in your hands.';
  if (site && !answered) return site.near;
  if (site && answered) return site.after;
  if (echoCount > 0) return 'Turning over, steady, the way it has since the coast.';
  if (named) return 'Quiet. Waiting on something that is not here.';
  return 'Quiet. Whatever is inside it is in no hurry.';
}

function compassOf(dx: number, dy: number): Compass {
  // Screen axes: +y is south. Eight points, with the diagonals claiming a
  // narrow band so "east" means east rather than "vaguely rightwards".
  const a = Math.atan2(dy, dx);
  const oct = Math.round((a * 4) / Math.PI);
  switch (((oct % 8) + 8) % 8) {
    case 0: return 'east';
    case 1: return 'south-east';
    case 2: return 'south';
    case 3: return 'south-west';
    case 4: return 'west';
    case 5: return 'north-west';
    case 6: return 'north';
    default: return 'north-east';
  }
}

/* ------------------------------------------- the name, in every interface */

/**
 * Rewrite the item's own registry entry to match the story.
 *
 * Cheap enough to call on any state change: three string assignments and a
 * lookup. Guarded on the item existing, so a unit test with an empty registry
 * is a no-op rather than a crash.
 */
export function refreshTideheart(state: GameState): void {
  const item = registry.items.get(TIDEHEART);
  if (!item) return;

  const named = state.hasFlag(TH_FLAGS.named);
  const site = state.hasItem(TIDEHEART) ? siteForMap(state.currentMap) : null;
  const answered = site ? state.hasFlag(echoFlag(site.id)) : false;
  const stirring = !!site && !answered;
  const carried = builtSites().some((s) => state.hasFlag(echoFlag(s.id)));

  item.name = named ? NAMED_LABEL : UNNAMED_LABEL;
  item.icon = stirring ? ICON_LIT : ICON_QUIET;
  item.description = stirring
    ? (named ? NAMED_STIR_TEXT : STIR_TEXT)
    : named ? NAMED_TEXT
      : carried ? CARRIED_TEXT
        : QUIET_TEXT;
}

/* ----------------------------------------------------------- the world cue */

/**
 * Called from GameState whenever the player arrives somewhere new.
 *
 * The unprompted half of "it reacts": walking into a place it can feel makes a
 * sound, with no dialogue box and nobody explaining it. Deliberately driven
 * from the state change rather than from a map's event script, so it cannot be
 * forgotten by whoever builds the map.
 *
 * The cue is `heal_cycle` dropped an octave and ducked -- a low swell with
 * three soft needles in it, which is as close as the existing sound library
 * gets to something waking up. A recipe of its own is wanted; see the note to
 * the audio owner in the handover.
 */
export function tideheartEnteredMap(state: GameState, from: string, to: string): void {
  refreshTideheart(state);
  if (!state.hasItem(TIDEHEART)) return;

  const now = siteForMap(to);
  if (!now) return;
  if (siteForMap(from) === now) return;
  if (state.hasFlag(echoFlag(now.id))) return;

  audio.playSfx('heal_cycle', { pitch: 0.5, volume: 0.5 });
}

/* ------------------------------------------------------------------ audit */

/**
 * Site rows whose maps are not on disk, for the shot driver and the console.
 *
 * A site that names a map nobody built is silent rather than broken, which is
 * exactly the failure that stays invisible until somebody plays Act 1 and
 * notices the ruin does nothing. This turns it into a line of text.
 */
export function tideheartAudit(): { site: string; missing: string[] }[] {
  const out: { site: string; missing: string[] }[] = [];
  for (const site of builtSites()) {
    const missing = site.maps.filter((m) => !registry.has('maps', m));
    // Every map missing means the site is unreachable. Some missing is normal:
    // the list names alternatives on purpose.
    if (missing.length === site.maps.length) out.push({ site: site.id, missing });
  }
  return out;
}
