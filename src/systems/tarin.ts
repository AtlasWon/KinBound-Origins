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

  /*
   * Stage 5. Act 5, the storm.
   *
   * THE COLUMN MOVES AGAIN, AND IT MOVES THE WRONG WAY IN THE MIDDLE. Act 1
   * alternated ahead and behind, Act 2 held him level, Act 3 gave him two and
   * stopped, Act 4 was flat on purpose. Act 5 is the act where the number
   * finally has to finish -- canon puts him at seven or eight Crests by
   * Crownspire -- so the interesting thing is not that it rises, it is WHERE it
   * stalls. He is AHEAD at Frostmere, having taken the Frost Crest days before
   * the player walked in and then not gone anywhere, and he is BEHIND at
   * Skyreach, having lost three days on the dock bridges getting other people
   * off them in the wind. That stall is his whole arc stated in one column: he
   * started wanting to be strong and he is now a boy who will drop the count to
   * hold a rope. Nothing in the dialogue has to say it, and nothing does.
   *
   * FOUR OF THESE SEVEN OPEN ON MAPS THAT ANOTHER AGENT IS BUILDING THIS WEEK,
   * which is exactly the case `any` and the last-beat-wins rule in tarinBeat
   * were put there for: a row keyed to a map id that never lands is stepped
   * over rather than stranding him in it, and listing two plausible ids for the
   * same place costs nothing. `snowroad` lists three because the road out of
   * Aureline has no number yet -- Stage 4 stopped at route_7_north and route_8
   * is a guess. If it is stepped over, he is simply still in Aureline until the
   * player reaches Frostmere, which is survivable and dull rather than broken.
   *
   * `observatory` is the one row with no map fallback AT ALL, and that is
   * deliberate. It must not open when the player walks into the Observatory; it
   * must open when they have heard their father. Keying it to the room would
   * have the town gossiping about a boy coming back down quiet before anything
   * had happened to him. So it takes a flag or it takes nothing. Both spellings
   * the Observatory build might use are listed; see the handover.
   *
   * HE HOLDS SIX FROM FROSTMERE TO THE END OF SKYREACH -- through the
   * Observatory, which is three beats without the number moving, in the middle
   * of the act where it is meant to be moving fastest. That is the Act 2 trick
   * used once more and for the last time, and it is pointed at the one scene in
   * the game where the count is beneath everybody.
   */
  {
    id: 'snowroad',
    opens: { any: [{ visited: 'route_8' }, { visited: 'route_9' }, { visited: 'route_8_pass' }] },
    crests: 5,
    where: 'the north road',
    doing: 'Went up two days ahead of you in the wrong coat. Sent word back down with a coachman.',
  },
  {
    id: 'frostmere',
    opens: { any: [{ visited: 'frostmere' }, { visited: 'frostmere_hall' }] },
    crests: 6,
    where: 'Frostmere',
    doing: 'Took the Frost Crest on Tuesday and then did not leave. He has been waiting for you.',
  },
  {
    id: 'observatory',
    opens: {
      any: [
        /*
         * The Observatory's own flag, read out of
         * data/events/frostmere_observatory_dome.json rather than agreed in
         * advance: that build asked for "a ledger row keyed on that flag" and
         * this is it. It is the RIGHT trigger, not merely a working one -- the
         * beat has to open when the player has heard their father, not when
         * they walked into the room.
         */
        { flag: 'act5_elias_message' },
        /*
         * LAST RESORT, and a worse trigger: the dome is the room the recording
         * plays in, so standing in it is very nearly having heard it, but
         * somebody who puts their head round the door and leaves opens the beat
         * a scene early and the town starts gossiping about a boy who has not
         * come back down yet. It is here because the failure it prevents is
         * total -- if that flag is ever renamed, this row is stepped over
         * entirely and Tarin is never at the Observatory at all.
         */
        { visited: 'frostmere_observatory_dome' },
      ],
    },
    crests: 6,
    where: 'the Observatory',
    doing: 'Came up the hill behind you and stopped at the door. Has not said one funny thing since.',
  },
  {
    id: 'skyreach',
    opens: { any: [{ visited: 'skyreach' }, { visited: 'skyreach_hall' }] },
    crests: 6,
    where: 'Skyreach',
    doing: 'Out on the dock bridges in it. Three days of that and not one hour at the Hall.',
  },
  {
    id: 'windward',
    opens: { any: [{ crest: 7 }, { flag: 'crest_7_taken' }] },
    crests: 7,
    where: 'Skyreach',
    doing: 'Took the Gale Crest the morning the wind dropped, on no sleep, and went straight on.',
  },
  {
    id: 'crownspire',
    opens: { any: [{ visited: 'crownspire' }, { visited: 'crownspire_hall' }] },
    crests: 7,
    where: 'Crownspire',
    doing: 'In the oldest city in Caelora, looking at the eighth Hall and saying nothing clever about it.',
  },
  {
    id: 'summit_pact',
    opens: { any: [{ crest: 8 }, { flag: 'crest_8_taken' }] },
    crests: 8,
    where: 'Crownspire',
    doing: 'Eight. Both of you have eight. Neither of you has said the word Summit out loud yet.',
  },

  /*
   * Stage 6. Act 6, the climax -- and specifically the OPERATION, which is
   * everything from the East Quay to the Temple's front door.
   *
   * THE COLUMN IS FINISHED AND THE LEDGER IS NOT, and that is the shape of the
   * act. Eight is all there is; there is no ninth Crest and there is never
   * going to be one, so for the first time since Hearthmere the number cannot
   * say anything about him at all. Every act so far has used it: Act 1
   * alternated ahead and behind, Act 2 held level to show that what was
   * changing was him, Act 3 moved twice and stopped, Act 4 was flat on purpose,
   * Act 5 stalled in the middle at the one scene where the count was beneath
   * everybody. Act 6 has nothing left to move. That is correct, because what
   * this act says about him was never going to be a score.
   *
   * IT IS THE `where` COLUMN THAT DOES THE WORK NOW, AND IT DOES IT BY BEING
   * SOMEWHERE ELSE. Canon is explicit: he disables Meridian towers while the
   * player moves toward the central facility. So the last two rows put him on
   * the far side of an island the player cannot see across, and the design of
   * the whole act is that they never meet him there. He is HEARD instead -- the
   * deck lurches, every lamp on it dips, a Foundation hand says something he
   * was not going to say, and a signalman on the beach with a glass counts them
   * off one at a time. Nothing anywhere quotes him. See the tower beats in
   * data/events/eastreach_platform.json and the sh_signal variants in
   * data/dialogue/eastreach_shore.json.
   *
   * THREE ROWS AND NOT ONE OF THEM NEEDS A common.json VARIANT, which is the
   * first time that has been true since the ledger was written. The gossip
   * voices are townspeople and this act has no towns in it: the player is on a
   * mole, a boat, a beach and a rig, and everybody on all four is IN the
   * operation and says so in their own file. A player who walks back to
   * Tideglass mid-act falls through to the ungated fallback at the bottom of
   * each voice, which is survivable, dull, and also the correct answer --
   * nobody in that city knows anything yet.
   *
   * `muster` and `crossing` open on maps as well as flags because both maps are
   * mine and both certainly exist. `towers` opens FIRST on op_landed, set by
   * the landing scene in data/events/eastreach_shore.json, because the beat
   * where he is off taking the ring apart has to begin when the player is
   * standing on the island without him -- which is when the boats come up the
   * shingle, not when somebody walks onto a particular tile.
   *
   * THE TEMPLE'S OWN ROWS, IF IT WANTS ANY, GO BETWEEN `towers` AND THE
   * AFTERMATH BLOCK BELOW. The ledger is read top to bottom and the last opened
   * beat wins, so a Crown Works row appended under `towers` correctly pulls him
   * out of the fog and into the room; one inserted above `muster` would strand
   * him on a quay he has already left.
   */
  {
    id: 'muster',
    opens: { any: [{ visited: 'eastreach_muster' }, { flag: 'op_called' }] },
    crests: 8,
    where: 'the East Quay',
    doing: 'At the far end of the mole with nineteen people he met on Tuesday, being the one who is not frightened.',
  },
  {
    id: 'crossing',
    opens: { any: [{ visited: 'eastreach_launch' }, { flag: 'op_sailed' }] },
    crests: 8,
    where: 'the second boat',
    doing: 'Went north-east up the coast while you went east. Did not wave, and did not look back either.',
  },
  {
    id: 'towers',
    opens: { any: [{ flag: 'op_landed' }, { visited: 'eastreach_shore' }] },
    crests: 8,
    where: 'the Meridian towers',
    doing: 'Somewhere on the far side of the island, taking the ring apart four relays at a time, out of sight.',
  },

  /*
   * Stage 6. The aftermath.
   *
   * THE LAST ROW OF THE STORY, AND IT MUST STAY LAST OF THE STORY. tarinBeat
   * returns the last opened beat, so anything below this one takes precedence
   * over it. A Stage 6 row for the operation or the Temple belongs ABOVE this
   * one, keyed on its own flag; this row is keyed on act6_done, which is the
   * moment Neravoss leaves and nothing in the story is pending. Stage 7's rows
   * DO belong below it -- they open on summit_open and later, which is after
   * this one in the only order that matters, the player's.
   *
   * THE COUNT DOES NOT MOVE. He has held eight since Crownspire and he holds
   * eight here, because the whole point of the ending canon describes is that
   * the story finished and the childhood thing did not, and a column that
   * ticked over at the climax would say the opposite. What changes is `where`:
   * off the boat, across the region, and into a room full of other people's
   * ambition, waiting. He does not go up without the player and the world is
   * allowed to know it before the player does.
   */
  {
    id: 'aftermath',
    opens: { flag: 'act6_done' },
    crests: 8,
    where: 'the Summit registry in Aureline',
    doing: 'Off a boat at Tideglass and straight across the region. Has been reading a list for two days.',
  },

  /*
   * Stage 7. The dream -- the Ascent, the last rival battle, the Masters and
   * the Champion.
   *
   * THE COLUMN HAS NOTHING LEFT TO SAY, AND FOR THE FIRST TIME THAT IS NOT A
   * DEVICE. Eight and eight since Crownspire. Every act before this one used
   * the Crest count to say something the dialogue was not allowed to: Act 1
   * alternated ahead and behind, Act 2 held level to show that what was
   * changing was him and not the score, Act 3 moved twice and stopped, Act 4
   * was flat in the largest city in Caelora with a qualifier running round
   * him, Act 5 stalled in the middle at the one scene where the count was
   * beneath everybody, Act 6 had run out of Crests to move. Act 7 has run out
   * as well -- and here the two of them genuinely ARE level, and the only
   * thing left that can separate them is one battle on a step, which is
   * precisely what both of them wanted when they were nine. Canon puts the
   * Summit after Neravoss so the game has two endings; the second one was
   * never going to be a number.
   *
   * IT IS `where` THAT CARRIES THE ACT, AND IT CARRIES IT BY COMING BACK.
   * Act 6 put him on the far side of an island the player could not see
   * across, on purpose, so that he could only be heard. This act puts him on
   * the same road, above, going up at his own pace -- and then sitting on the
   * top step with six Kin and nothing to say, which is the only place in the
   * whole ledger he has ever waited where the player could see him do it.
   *
   * NOT ONE OF THESE ROWS NEEDS A common.json GOSSIP VARIANT, which was also
   * true of Act 6 and for the same reason: the four gossip voices are
   * townspeople and there are no towns above Crownspire. A player who walks
   * back down to a city mid-act falls through to the ungated fallback at the
   * bottom of each voice, which is survivable, dull, and correct -- nobody
   * down there knows what is happening up here yet.
   *
   * FOUR OF THESE SIX OPEN ON MAPS AND FLAGS SOMEBODY ELSE IS BUILDING THIS
   * WEEK, which is exactly the case `any` and the last-beat-wins rule in
   * tarinBeat were put there for. Each lists every plausible id for its place;
   * a row keyed to something that never lands is stepped over rather than
   * stranding him in it, and the worst case is that he stays at the beat
   * below, which reads as dull rather than broken.
   */
  {
    /*
     * Opens on the flag the registry scene sets when the doors come off their
     * shut (aftermath_summit, data/events/aureline_summit.json). That scene is
     * where he says go home to Hearthmere first and then come and find me, so
     * this is the beat where he is doing the waiting he just asked for.
     */
    id: 'summit_road',
    opens: { flag: 'summit_open' },
    crests: 8,
    where: 'the foot of the Ascent',
    doing: 'Went home for one night, same as you, and was back on the road before you had finished breakfast.',
  },
  {
    id: 'ascent',
    opens: {
      any: [
        { visited: 'ascent_road' },
        { visited: 'ascent_deep' },
        { visited: 'ascent_shelf' },
        { visited: 'ascent_bothy' },
        { visited: 'ascent_ruin' },
        { visited: 'ascent_crown' },
        /* Fallbacks, in case the road is renamed under this row. */
        { visited: 'the_ascent' },
        { visited: 'ascent' },
        { flag: 'ascent_entered' },
      ],
    },
    crests: 8,
    where: 'the Ascent',
    doing: 'Somewhere above you on the same road, going up at his own pace and not once looking back down it.',
  },
  {
    /*
     * The platform outside the Summit door, and the beat the last rival battle
     * lives in. THIS FLAG IS LOAD-BEARING: `tarin_summit_gate` in
     * data/events/common.json is a step trigger on the two tiles below that
     * door and it will not fire without it, so the whole of the last rival
     * battle hangs off this row opening. It opens on the Summit maps rather
     * than on the top of the Ascent so that it opens where the actor is;
     * `ascent_crown` is deliberately in the row ABOVE this one for the same
     * reason.
     */
    id: 'summit_gate',
    opens: {
      any: [
        { visited: 'summit_approach' },
        { visited: 'summit_hall' },
        { visited: 'summit_muster' },
        /* Fallbacks, in case the door is renamed under this row. */
        { visited: 'summit_gate' },
        { flag: 'summit_gate_reached' },
      ],
    },
    crests: 8,
    where: 'the Summit door',
    doing: 'On the platform with six Kin and nothing clever to say, waiting for you to come up out of the field.',
  },
  {
    /*
     * THE TWO ROWS BELOW ARE THE ONLY PLACE IN THE LEDGER WHERE THE PLAYER'S
     * OWN RESULT DECIDES THE BEAT, and canon asks for exactly that: whether
     * the player wins or loses they both go on, and the battle decides who
     * enters the championship challenge first. `tarin_summit` sets one flag or
     * the other.
     *
     * LOST IS LISTED FIRST ON PURPOSE. The scene offers a rematch, so a player
     * can hold tarin_summit_lost and then win; the last opened beat wins, so
     * putting the won row underneath means the rematch correctly overrides the
     * loss. (The scene also clears the loser flag, so this is a belt as well
     * as braces -- but the ordering is the belt that does not depend on
     * anybody remembering to clear anything.)
     */
    id: 'gate_lost',
    opens: { flag: 'tarin_summit_lost' },
    crests: 8,
    where: 'the highest level of the Summit',
    doing: 'Beat you on the step and went up first, and is enjoying the order a great deal less than he said he would.',
  },
  {
    id: 'gate_won',
    opens: { flag: 'tarin_summit_won' },
    crests: 8,
    where: 'the Summit gate',
    doing: 'Lost the one thing he has been walking towards since he was nine, and held the door open with both hands.',
  },

  /*
   * THE MASTERS' AND THE CHAMPION'S OWN ROWS, IF THEY WANT ANY, GO BETWEEN
   * `gate_won` AND `crowned`. The ledger is read top to bottom and the last
   * opened beat wins, so a row appended under `crowned` would drag him back
   * out of Hearthmere and into a building he has already left.
   *
   * THE TWO ROWS BELOW ARE KEYED ON FLAGS THIS FILE DOES NOT OWN. `champion`
   * and `ending_seen` are both read out of the `ending_go_home` handoff in
   * data/events/common.json rather than agreed in advance -- that script is
   * what the Champion calls, and its own note names both. `act7_done` is
   * listed beside them because that note says the Hearthmere road accepts it
   * as well. Neither row has a map fallback, because both are about something
   * having HAPPENED to the player rather than about where they are standing:
   * a row keyed to the Champion's room would put him in the aftermath of a
   * fight the player has not had yet. If none of the listed names lands, both
   * rows are stepped over and he stays at `gate_won` or `gate_lost` for the
   * rest of the game, which is dull and not wrong.
   *
   * `home` IS LAST AND THAT IS THE ORDER THAT MATTERS. ending_go_home sets
   * `champion` and `ending_seen` within a few frames of each other, so both
   * rows open at once and the lower one wins -- which is correct, because by
   * then the player is standing on the road above the village and so is he.
   * `crowned` exists for the case where the Champion sets its own flag and
   * never calls the handoff.
   */
  {
    id: 'crowned',
    opens: { any: [{ flag: 'champion' }, { flag: 'champion_beaten' }, { flag: 'act7_done' }] },
    crests: 8,
    where: 'the Summit floor',
    doing: 'Watched the whole of it from the rail with his arms folded and did not make one sound until it was over.',
  },
  {
    id: 'home',
    opens: { any: [{ flag: 'ending_seen' }, { flag: 'ending_home' }, { flag: 'game_complete' }] },
    crests: 8,
    where: 'Hearthmere',
    doing: 'Home, in a village of four hundred, telling all of them the same story with rather more of himself in it.',
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
