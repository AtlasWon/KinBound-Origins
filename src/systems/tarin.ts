/**
 * Tarin's journey.
 *
 * Tarin is not a set of cutscenes. He is a sixteen-year-old doing the same
 * thing the player is doing, at the same time, mostly off screen, and the
 * player is meant to keep hearing about him between the four or five times
 * they actually see him. That is the whole difference between a rival and a
 * boss you fight periodically.
 *
 * This file is the ledger of where he is and what he has done. It is the only
 * place a later stage has to change to extend his story.
 *
 * ---------------------------------------------------------------- how it works
 *
 * The ledger is an ordered list of BEATS. A beat opens when the *player's* own
 * progress reaches it; the last beat whose condition holds is the one Tarin is
 * living in right now. GameState re-derives that on every flag, every Crest and
 * every map visit, and publishes the result as read-only flags and text tokens:
 *
 *   tarin_at_<beat>    the beat he is in. Exactly one is ever set.
 *   tarin_holds_1..8   a Bond Crest he has earned.
 *   tarin_ahead        he holds more Crests than the player.
 *   tarin_even         the same number.
 *   tarin_behind       fewer.
 *   {tarin_where}      where he was last heard of, for dialogue to name.
 *
 * Publishing as *flags* is the point. Every content mechanism in the game
 * already reads flags -- dialogue variants (`ifFlags`), event conditions,
 * NPC `requiresFlag`/`hiddenIfFlag`, shop stock -- so the whole world can react
 * to Tarin without one line of new engine support. Any townsperson anywhere
 * becomes a source of news about him by pointing at a dialogue entry that
 * branches on `tarin_at_*`.
 *
 * These flags are DERIVED. Nothing writes them, they are never saved, and they
 * are recomputed from scratch on load, so they cannot drift out of step with a
 * save file and they cost nothing to store. `hasFlag` consults them; `setFlag`
 * cannot touch them.
 *
 * Ahead/behind is deliberately *not* authored. The ledger only says how many
 * Crests Tarin holds at each beat; whether that puts him in front of the player
 * falls out of the comparison. A player who dawdles finds Tarin ahead of them
 * in places the script never planned for, which is exactly right -- he is
 * supposed to be running his own race, not waiting for you.
 *
 * ------------------------------------------------------------- how to extend it
 *
 * A later stage adds Tarin to a settlement in three edits and no code:
 *
 *   1. Append a row to TARIN_LEDGER below, in story order, with a stable id.
 *      Say how many Crests he holds by then and where he is.
 *   2. Add a variant to each voice in data/dialogue/common.json
 *      (`tarin_word_street`, `_hall`, `_clinic`, `_shop`) gated on
 *      "tarin_at_<your id>". That is what the world starts saying about him.
 *      List it ABOVE the existing variants -- first match wins.
 *   3. If he turns up in person, add a branch to the `tarin_town` script in
 *      data/events/common.json and put an NPC with the id `town_tarin` and
 *      `script: "tarin_town"` on the map, hidden by the branch's done-flag.
 *
 * That is all. No new scene, no new save field, no engine change.
 */

/** What opens a beat. Small on purpose: these are milestones, not logic. */
export type TarinWhen =
  | { flag: string }
  /** A map the player has set foot on. Beats that must fire on arrival. */
  | { visited: string }
  /** A Bond Crest the player holds. */
  | { crest: number }
  | { all: TarinWhen[] }
  /**
   * Any one of these. Added for Stage 2, where a settlement is more than one
   * map: a player can reach Tideglass and go straight down the Hall steps, and
   * a beat keyed to the street alone would not have opened. It is also the
   * cheap way to survive a map id changing under a beat -- list both.
   */
  | { any: TarinWhen[] };

export interface TarinBeat {
  /** Stable id. Publishes as the flag `tarin_at_<id>`; never rename one. */
  id: string;
  /** The player's progress that puts Tarin here. */
  opens: TarinWhen;
  /** Bond Crests Tarin holds during this beat, 0..8. */
  crests: number;
  /** Where he is, for dialogue to name through {tarin_where}. */
  where: string;
  /** Author's note. Not shown; it is what the voices in common.json describe. */
  doing: string;
}

/**
 * Stage 1. Act 1, end to end.
 *
 * The shape that matters is the alternation. He is level with the player on the
 * road, AHEAD at Briarbell -- he took the first Crest the morning the player
 * walked in, and the town is still talking about it -- and BEHIND at Stonewake,
 * because he spent three days trying to get into the Meridian office instead of
 * fighting the Hallkeeper. Sometimes he wins the race, sometimes he loses it to
 * his own worst habit, and neither is a scripted humiliation.
 */
export const TARIN_LEDGER: TarinBeat[] = [
  {
    id: 'dawn',
    opens: { flag: 'got_starter' },
    crests: 0,
    where: 'Hearthmere',
    doing: 'Waiting outside the lab since before it was light. Has not eaten.',
  },
  {
    id: 'road',
    opens: { flag: 'tarin_first_done' },
    crests: 0,
    where: 'Route 1',
    doing: 'Gone north at a run. Losing things. Telling everyone he won.',
  },
  {
    id: 'north',
    opens: { flag: 'tarin_route1_done' },
    crests: 0,
    where: 'Briarbell',
    doing: 'Walked the top of Route 1 with the player, then went on ahead.',
  },
  {
    id: 'briarbell',
    opens: { visited: 'briarbell' },
    crests: 1,
    where: 'Briarbell',
    doing: 'Beat the Hallkeeper this morning, first try, and has not shut up.',
  },
  {
    id: 'ruinwood',
    opens: { flag: 'crest_1_taken' },
    crests: 1,
    where: 'Route 2',
    doing: 'Hauled a farmer\'s cart out of the ford. Caught something rare in the ruin wood.',
  },
  {
    id: 'stonewake',
    opens: { visited: 'stonewake' },
    crests: 1,
    where: 'Stonewake',
    doing: 'Thrown out of the Meridian office twice. Lost badly to the Hallkeeper.',
  },
  {
    id: 'quarry',
    opens: { flag: 'crest_2_taken' },
    crests: 2,
    where: 'Stonewake',
    doing: 'Took the second Crest on the third attempt. Furious that it took three.',
  },

  /*
   * Stage 2. Act 2, the coast.
   *
   * He is EVEN with the player for the whole act and that is deliberate. Act 1
   * alternated ahead and behind to establish that he is running his own race;
   * doing it again here would be the same joke twice. What changes in Act 2 is
   * not the score, it is him: he arrives on the ridge counting Foundation
   * drays for fun, and he leaves Tideglass having worked out that the thing he
   * has been poking at since Stonewake puts people in the road at night. The
   * Crest column staying flat is what makes that visible.
   *
   * Two beats open on a map rather than a flag, so he turns up whether or not
   * the player did the story in the order it was written, and each lists the
   * settlement AND the part of it a player can arrive in first -- see
   * TarinWhen's `any`. Somebody who walks off the ridge and straight down the
   * Hall steps has still reached Tideglass, and the world should be talking
   * about him by the time they come back up.
   */
  {
    id: 'ridge',
    opens: { any: [{ visited: 'route_3' }, { visited: 'route_3_whistle' }] },
    crests: 2,
    where: 'Eastwind Ridge',
    doing: 'Sat on the milestone counting Foundation drays. Has got to fourteen.',
  },
  {
    id: 'tideglass',
    opens: { any: [{ visited: 'tideglass' }, { visited: 'tideglass_hall' }] },
    crests: 2,
    where: 'Tideglass',
    doing: 'Went to hear Veyl speak and came out liking him, which is bothering him.',
  },
  {
    id: 'harbour',
    opens: { flag: 'crest_3_taken' },
    crests: 3,
    where: 'Tideglass',
    doing: 'Took the Channel Crest off Mabry. Went in the deep lane on purpose.',
  },
  {
    id: 'nightafter',
    opens: { flag: 'lyra_doubt' },
    crests: 3,
    where: 'Tideglass',
    doing: 'Heard what happened on the north road. Has not made a joke since.',
  },

  /*
   * Stage 3. Act 3, the past.
   *
   * THE OTHER ACT 3 BEATS BELONG ABOVE THESE TWO. Embercoil, Emberfall, the
   * wetlands and Mirehaven each want a row and they all come before the
   * Sanctum in the road order; the ledger is read top to bottom and the LAST
   * opened beat wins, so a beat appended under `sanctum` would drag him back
   * out of the dungeon he is standing in. Insert, do not append.
   *
   * These two are the only rows in the whole ledger where he is not off doing
   * his own thing somewhere the player is not, and that is the point of the
   * act. `sanctum` is the one beat with no Crest movement in it at all -- he
   * walks past a Kin Hall to come down a hole in a marsh with somebody, which
   * is the first time in the game he has chosen anything over the count.
   *
   * `sanctum_after` opens on ms_second_truth rather than on leaving the map,
   * because what changed him is the record, not the walk. A player who somehow
   * gets out of the Sanctum without playing it stays on `sanctum`, which is
   * exactly right: he has not heard it yet either.
   */
  {
    id: 'sanctum',
    opens: { any: [{ visited: 'mirehaven_sanctum' }, { flag: 'ms_arrived' }] },
    crests: 5,
    where: 'the Sanctum',
    doing: 'Walked away from a Hall to come down a hole in a marsh. Went first.',
  },
  {
    id: 'sanctum_after',
    opens: { flag: 'ms_second_truth' },
    crests: 5,
    where: 'Mirehaven',
    doing: 'Heard what the Aurelians did. Has stopped talking about being the best.',
  },

  /*
   * Stage 4. Act 4, the capital.
   *
   * FIVE CRESTS FOR THE WHOLE ACT, AND THAT IS NOT AN OVERSIGHT. Canon puts
   * Halls 6, 7 and 8 in Frostmere, Skyreach and Crownspire, all of which are
   * Stage 5, so there is no Crest in Aureline for anybody to take. Every act
   * so far has moved his number: Act 1 alternated ahead and behind, Act 2 held
   * him level to show that what was changing was him and not the score, Act 3
   * gave him two and then stopped. Act 4 is the first act where the column
   * being flat is the *point* -- he is in the largest city in Caelora, there is
   * a Summit qualifier running in it, and he is in a records office instead.
   *
   * FOUR BEATS AND THREE OF THEM ARE IN THE ROOM WITH THE PLAYER. This is the
   * only act where that is true. The gossip voices in data/dialogue/common.json
   * cannot report a boy who is standing next to you, so the Act 4 variants are
   * written the other way round: what the *city* makes of the pair of you. See
   * the note in the handover -- those variants are the dialogue owner's file,
   * not this one, and without them these beats fall through to the ungated
   * fallback at the bottom of each voice, which is survivable and dull.
   *
   * `northroad` opens on the road maps rather than on a flag because the road
   * north is somebody else's build and a beat keyed to a map that does not
   * exist is stepped over rather than stalling him (see tarinBeat). It lists
   * both plausible ids for the same reason `capital` lists two.
   */
  {
    id: 'northroad',
    opens: { any: [{ visited: 'route_7' }, { visited: 'route_8' }] },
    crests: 5,
    where: 'the central road',
    doing: 'Walking north beside you. Reads every milestone out loud and does not make anything of it.',
  },
  {
    id: 'capital',
    opens: { any: [{ visited: 'aureline' }, { visited: 'aureline_meridian' }] },
    crests: 5,
    where: 'Aureline',
    doing: 'Stood in the gate square a quarter of an hour and did not say one word about it.',
  },
  {
    id: 'headquarters',
    opens: { flag: 'act4_inside' },
    crests: 5,
    where: 'the Meridian building',
    doing: 'Went through the front doors in daylight on a borrowed pass, carrying a clipboard he found.',
  },
  {
    id: 'robbed',
    /*
     * Opens on `tideheart_taken` rather than on a scene flag of its own, so it
     * cannot get out of step with the object: the beat where Tarin is walking
     * a robbed friend around a city is exactly the state where the bag is
     * empty, and there is only one thing in the game that empties it.
     */
    opens: { flag: 'tideheart_taken' },
    crests: 5,
    where: 'Aureline',
    doing: 'Has not once asked whether you are all right. He knows the answer and he is staying close.',
  },
];

/* ------------------------------------------------------------------ derived */

/** Everything the ledger is capable of publishing. Cleared before every sync. */
export const TARIN_FLAGS: readonly string[] = [
  ...TARIN_LEDGER.map((b) => `tarin_at_${b.id}`),
  ...Array.from({ length: 8 }, (_, i) => `tarin_holds_${i + 1}`),
  'tarin_ahead', 'tarin_even', 'tarin_behind',
];

/** What the ledger needs to know about the player to place him. */
export interface TarinProbe {
  hasFlag(flag: string): boolean;
  hasVisited(map: string): boolean;
  hasCrest(n: number): boolean;
  crestCount: number;
}

function opened(when: TarinWhen, p: TarinProbe): boolean {
  if ('flag' in when) return p.hasFlag(when.flag);
  if ('visited' in when) return p.hasVisited(when.visited);
  if ('crest' in when) return p.hasCrest(when.crest);
  if ('any' in when) return when.any.some((w) => opened(w, p));
  return when.all.every((w) => opened(w, p));
}

/**
 * The beat Tarin is living in: the last one the player's progress has opened.
 *
 * Last rather than first, so a beat whose condition never fires -- a map that
 * has not been built yet, a flag a later stage owns -- is simply stepped over
 * instead of stalling him there forever.
 */
export function tarinBeat(p: TarinProbe): TarinBeat | undefined {
  let found: TarinBeat | undefined;
  for (const beat of TARIN_LEDGER) if (opened(beat.opens, p)) found = beat;
  return found;
}

/** The flags a beat publishes, given where the player has got to. */
export function tarinFlagsFor(beat: TarinBeat | undefined, playerCrests: number): string[] {
  if (!beat) return [];
  const out = [`tarin_at_${beat.id}`];
  for (let n = 1; n <= beat.crests; n++) out.push(`tarin_holds_${n}`);
  if (beat.crests > playerCrests) out.push('tarin_ahead');
  else if (beat.crests === playerCrests) out.push('tarin_even');
  else out.push('tarin_behind');
  return out;
}
