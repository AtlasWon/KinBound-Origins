/**
 * Headless difficulty simulator.
 *
 * Used to measure difficulty rather than guess at it: the first fight in the
 * game was once won three times in a hundred, and "it feels hard" is not
 * something you can tune against. Nothing here uses items on the player's
 * side, so a win is a win on the raw matchup.
 *
 * Three things get measured, and they answer different questions.
 *
 *   1. WHAT LEVEL THE PLAYER ACTUALLY IS. `progression()` walks the content in
 *      the order the NPCs stand in on the maps and adds up the experience the
 *      game really pays out -- every wild fight on a route weighted by its
 *      encounter slots, every trainer party, through the real expForLevel
 *      curve. This is the number the whole file exists for: a route is only
 *      "two levels too high" relative to where the player arrives, and until
 *      this was measured that was guesswork. Three play styles are reported
 *      because experience is split between everything that took the field:
 *      the solo lead never switches and banks all of it, the rotating team
 *      raises four and each of them is years behind. The rotating column is
 *      the floor, and it is the column the bug reports come from.
 *
 *   2. WHETHER THE PLAYER CAN WIN THERE. Win rates are sampled at the level
 *      the progression table says the player arrives with, not at a level
 *      picked by hand. Two player skill tiers: the *veteran* reads the type
 *      chart and always picks their best move, the *novice* presses the top
 *      move and hopes. The novice is the person who wrote the bug report.
 *
 *   3. WITH WHAT, AND AT THE LEVEL THAT PARTY REALLY IS. A lone starter
 *      against a four-kin Keeper is not a fight anybody has; it is one kin
 *      against four with no healing. Trainer rows are therefore fought twice
 *      -- once solo, which is the floor, and once with a party the size of
 *      the trainer's own, which is the fight.
 *
 *      The two rows must be sampled at DIFFERENT levels, and for two passes
 *      they were not. Experience is divided between everything that took the
 *      field (Battle.awardExp splits by participant), so the player holding
 *      four kin is the `rotating team` column of table 1 and the player
 *      holding one is the `solo lead` column -- five or six levels apart by
 *      Brackwater. Sampling both at the middle `two up` column handed the
 *      party player a full bench at a level only a solo player ever reaches,
 *      and the matched column duly read 100% for twenty-three of twenty-five
 *      trainers while the bug reports kept coming. Nothing was wrong with the
 *      game that column was describing; that player does not exist. Each row
 *      is now sampled at its own share, so the party is one a player who
 *      raised a party actually has.
 *
 * Starters evolve at 16 and again at 34, so every row past level 16 uses the
 * evolved form. Measuring a level-22 Sprigling measures a kin that cannot
 * exist.
 *
 *   node tests/helpers/simulate.mjs [runs]
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { loadRegistry } = await import('./loadRegistry.js');
const { registry } = await import('../../build/js/data/registry.js');
const { Rng } = await import('../../build/js/core/rng.js');
const { createKin } = await import('../../build/js/systems/kin.js');
const { Battle } = await import('../../build/js/battle/battle.js');
const { TrainerAI } = await import('../../build/js/battle/ai.js');
const { expForLevel, levelForExp } = await import('../../build/js/battle/formulas.js');

loadRegistry();

const trainers = JSON.parse(readFileSync(resolve(ROOT, 'data/trainers/trainers.json'), 'utf8'));
const byId = new Map((Array.isArray(trainers) ? trainers : Object.values(trainers)).map((t) => [t.id, t]));
const encounters = new Map();
const encounterTable = (id) => {
  if (!encounters.has(id)) {
    encounters.set(id, JSON.parse(readFileSync(resolve(ROOT, `data/encounters/${id}.json`), 'utf8')));
  }
  return encounters.get(id);
};
const species = (id) => registry.species.get(id);

/* ------------------------------------------------------------------ the player */

export const STARTERS = ['sprigling', 'cinderpaw', 'rilltail'];

/**
 * Starters evolve on level, so "the player's Sprigling at 22" is really a
 * Bramblehusk. Every measurement has to follow the line or it measures a kin
 * the player stopped having six levels ago.
 */
function evolveTo(id, level) {
  let cur = id;
  for (;;) {
    const evo = (species(cur)?.evolutions ?? []).find(
      (e) => e.method?.kind === 'level' && level >= e.method.level && species(e.to),
    );
    if (!evo) return cur;
    cur = evo.to;
  }
}

/**
 * A plausible bench. Nobody walks into a Kin Hall with one kin, so trainer
 * fights are also measured with a party the size of the trainer's own: the
 * lead is the starter line, the rest are ordinary catchables one level down.
 *
 * The bench has to be one a player of that level would really have. A fixed
 * list read as a Kin Hall fought with three Nibbets, which made every late
 * fight look unwinnable and would have had the whole back half of the game
 * nerfed to compensate for the harness. Each entry is the level by which the
 * route that holds it has been walked, and the party is the strongest three
 * unlocked so far -- players keep a good catch, they do not swap their whole
 * bench at every route sign. Taking only the newest tier put a hard cliff at
 * each boundary: one trainer read 100% at level seventeen and 0% at eighteen,
 * purely because the harness threw away a Mossback.
 */
const CATCHABLE = [
  [1, 'tuftail'], [1, 'pipwing'], [1, 'nibbet'], [1, 'rillfry'],
  [10, 'slatewing'], [10, 'gravelet'], [10, 'chalkid'], [10, 'nettlebug'],
  [14, 'mossback'], [14, 'spinnet'], [14, 'frostnip'], [14, 'emberbore'],
  [18, 'gullswift'], [18, 'kestrelle'], [18, 'silthopper'], [18, 'shalefin'],
];
const bst = (id) => Object.values(species(id)?.base ?? {}).reduce((a, b) => a + b, 0);

function bench(level) {
  return CATCHABLE.filter(([l]) => l <= level).map(([, id]) => id).sort((a, b) => bst(b) - bst(a));
}

function buildParty(starter, level, size, rng) {
  const party = [createKin(evolveTo(starter, level), level, rng, { originalTrainer: 'player' })];
  const pool = bench(level);
  for (let i = 0; i < size - 1; i++) {
    const lv = Math.max(2, level - 1);
    party.push(createKin(evolveTo(pool[i % pool.length], lv), lv, rng, { originalTrainer: 'player' }));
  }
  return party;
}

/* ------------------------------------------------------------------ battles */

/**
 * Build a trainer's kin the way the game does, honouring every per-mon
 * override in the party entry. Reading only `species` and `level` silently
 * ignored hand-written movesets, which made any moveset tuning unmeasurable.
 */
function buildFoe(entry, rng) {
  const { species: sp, level, ...opts } = entry;
  return createKin(sp, level, rng, opts);
}

export function runOne(playerSpecies, playerLevel, trainerId, seed, playerTier = 'veteran', partySize = 1) {
  const rng = new Rng('sim-' + seed);
  const trainer = byId.get(trainerId);
  const party = buildParty(playerSpecies, playerLevel, partySize, rng);
  const foes = trainer.party.map((p) => buildFoe(p, rng));

  const battle = new Battle({
    playerParty: party, foeParty: foes, foeTrainer: trainer,
    isWild: false, seed: 'sim-' + seed,
  });
  battle.begin();

  const you = new TrainerAI(playerTier, rng);
  const them = new TrainerAI(trainer.ai ?? 'novice', rng);

  for (let turn = 0; turn < 120 && !battle.over; turn++) {
    if (battle.awaitingFoeReplacement) { battle.sendNextFoe(); continue; }
    if (battle.awaitingPlayerReplacement) {
      const idx = battle.player.firstUsableIndex();
      if (idx < 0) break;
      battle.doSwitch('player', idx);
      continue;
    }
    battle.takeTurn(you.choose(battle, 'player'), them.choose(battle, 'foe'));
  }
  return battle.result ?? 'draw';
}

export const rate = (starter, level, id, runs, tier = 'veteran', partySize = 1) => {
  let wins = 0;
  for (let i = 0; i < runs; i++) if (runOne(starter, level, id, i, tier, partySize) === 'win') wins++;
  return Math.round((wins / runs) * 100);
};

/** Party the size of the trainer's own, minimum two, capped at four. */
export const matchedRate = (starter, level, id, runs, tier = 'novice') =>
  rate(starter, level, id, runs, tier, Math.max(2, Math.min(4, byId.get(id)?.party.length ?? 1)));

/**
 * One wild encounter, fought to a finish with no fleeing and no items. Wild
 * fights are the level curve: they are what a player grinds on to arrive at a
 * trainer, so a route whose grass can beat your starter is a route you cannot
 * safely grind.
 */
function runWild(playerSpecies, playerLevel, foeSpecies, foeLevel, seed, tier) {
  const rng = new Rng('wild-' + seed);
  const party = [createKin(evolveTo(playerSpecies, playerLevel), playerLevel, rng, { originalTrainer: 'player' })];
  const foes = [createKin(foeSpecies, foeLevel, rng)];
  const battle = new Battle({ playerParty: party, foeParty: foes, isWild: true, seed: 'wild-' + seed });
  battle.begin();
  const you = new TrainerAI(tier, rng);
  const them = new TrainerAI('novice', rng);
  for (let turn = 0; turn < 60 && !battle.over; turn++) {
    if (battle.awaitingPlayerReplacement) break;
    battle.takeTurn(you.choose(battle, 'player'), them.choose(battle, 'foe'));
  }
  return battle.result ?? 'draw';
}

/**
 * Win rate across a route's grass, weighted by slot and drawn across each
 * slot's whole level band -- the encounter a player actually walks into.
 * `worst` reports the same thing pinned to the top of every band instead,
 * which is the encounter that ends a run.
 */
export function wildRate(routeId, playerSpecies, playerLevel, runs, tier = 'novice', worst = false) {
  const slots = encounterTable(routeId).methods?.tallGrass?.slots ?? [];
  const total = slots.reduce((n, s) => n + s.weight, 0);
  let wins = 0, fights = 0;
  for (const slot of slots) {
    const n = Math.max(20, Math.round((runs * slot.weight) / total));
    const span = slot.maxLevel - slot.minLevel + 1;
    for (let i = 0; i < n; i++) {
      const lv = worst ? slot.maxLevel : slot.minLevel + (i % span);
      if (runWild(playerSpecies, playerLevel, slot.species, lv, i, tier) === 'win') wins++;
      fights++;
    }
  }
  return Math.round((wins / fights) * 100);
}

/* ------------------------------------------------------------------ the curve */

/**
 * The road, in the order the NPCs stand in on the maps. Route 1 runs south to
 * north: Madden and Ottel both at y25 at the mouth, Cale at y6, the surveyor
 * at y2. Route 2 the same: Dell y26, Juna y24, Pike y14, Wren y3. Route 3 runs
 * west to east from Kellowmere. r1_wray, r1_bex and r2_shale are defined but
 * placed on no map, so they are not on the road and earn nothing.
 *
 * `wilds` is how many wild fights a player picks up crossing the stage without
 * setting out to grind: an encounter rate of 170 in 1000 per grass step, over
 * the grass on the way through and back for the items.
 */
export const STAGES = [
  { name: 'Hearthmere', grass: 'hearthmere', wilds: 5,
    trainers: ['tarin_first'] },
  { name: 'Route 1', grass: 'route_1', wilds: 14,
    trainers: ['r1_madden', 'r1_ottel', 'r1_cale', 'concord_surveyor_1'] },
  { name: 'Briarbell', grass: null, wilds: 0,
    trainers: ['briar_hand_a', 'briar_hand_b', 'briar_keeper'] },
  { name: 'Route 2', grass: 'route_2', wilds: 14,
    trainers: ['r2_dell', 'r2_juna', 'r2_pike', 'r2_wren'] },
  { name: 'Stonewake', grass: null, wilds: 0,
    trainers: ['tarin_town', 'sw_hall_delve_a', 'sw_hall_delve_b', 'sw_hall_delve_c', 'sw_keeper_roxen'] },
  // Route 3 is Eastwind Ridge and runs west to east across five shelves, so the
  // order below is the order the player meets them on the road: Bram on the ash
  // ramp, Sill above the dray, Wenna in the Foundation yard, Kessel on the crest,
  // Ivo out on the wind-station spur, and Holt down in the basin, who is optional.
  { name: 'Route 3', grass: 'route_3', wilds: 14,
    trainers: ['r3_bram', 'r3_sill', 'r3_wenna', 'r3_kessel', 'concord_surveyor_2', 'r3_holt'] },
  { name: 'Route 4', grass: 'route_4', wilds: 14,
    trainers: ['r4_teal', 'r4_gorse', 'r4_marrin', 'r4_nesh', 'r4_bay'] },
  // Stage 2 renamed Brackwater to Tideglass and rebuilt its Tide Hall as the
  // race (data/maps/tideglass_hall_works.json). The old hall2_* rows are still
  // in trainers.json but no longer stand on any map, so they are off the road
  // and earn nothing, exactly like r1_wray and r2_shale above.
  { name: 'Tideglass', grass: null, wilds: 0,
    trainers: ['tg_hand_a', 'tg_hand_b', 'tg_hand_c', 'tg_keeper_vane'] },
  // Stage 3, the past: Embercoil Pass, Emberfall and Hall 4, the Mire Road and
  // Mirehaven with Hall 5. Appended in the order the road runs, because that
  // order is the whole point of this table -- a route is only 'too high'
  // relative to the level a player actually arrives with, and that number comes
  // from everything in front of it.
  { name: 'Route 5', grass: 'route_5', wilds: 14,
    trainers: ['r5_dunnock', 'r5_tem', 'r5_marrow', 'r5_kell', 'r5_shale', 'r5_ravel'] },
  { name: 'Emberfall', grass: null, wilds: 0,
    trainers: ['ef_tap_a', 'ef_tap_b', 'ef_bath_crew', 'ef_keeper_cade'] },
  // The Mire Road forks round the broken span, so a player meets either Ordway
  // or nobody. Both are listed: this table is the ceiling of what the route
  // pays, and the wading line is measured against it in the notes on the map.
  { name: 'Route 6', grass: 'route_6', wilds: 14,
    trainers: ['r6_hallow', 'r6_wick', 'r6_kess', 'r6_ordway', 'r6_selm'] },
  { name: 'Mirehaven', grass: null, wilds: 0,
    trainers: ['mh_hand_a', 'mh_hand_b', 'mh_hand_c', 'mh_hand_d', 'mh_keeper_tallow'] },
  // Stage 4, the capital: the Central Road north out of the wetlands. Two
  // route maps and two optional villages, appended in the order the road runs.
  // The optional branches are listed because this table is the CEILING of what
  // the road pays -- a player who takes neither the Old Fen nor the relay yard
  // arrives at the capital about a level under the numbers below, which is the
  // margin the tables are cut against.
  { name: 'Route 7', grass: 'route_7', wilds: 14,
    trainers: ['r7_bankman', 'r7_dyke', 'r7_carter', 'r7_gate', 'r7_stubble', 'r7f_fowler'] },
  { name: 'Marlbeck', grass: null, wilds: 0, trainers: [] },
  { name: 'Route 7 N', grass: 'route_7_north', wilds: 14,
    trainers: ['r7n_wagon', 'r7n_ganger', 'r7n_ferry', 'r7n_reaper', 'r7n_courier', 'r7n_wire', 'r7r_linesman'] },
  { name: 'Harrowgate', grass: null, wilds: 0, trainers: ['hg_granary_hand'] },
  /*
   * Stage 5, the storm: the two mountain roads out of the capital, and the
   * Crown Road on to Crownspire. Appended in the order the roads run.
   *
   * THE THREE HALL ROWS BELOW ARE DELIBERATELY EMPTY and must be filled in by
   * whoever builds them. Frostmere, Skyreach and Crownspire each pay a Keeper
   * and three or four hands' worth of experience, and with those rows blank
   * this table UNDER-counts where the player is by three or four levels by the
   * time they reach the Crown Road. That is the safe direction to be wrong in
   * -- every win rate measured against it is pessimistic, so a route that
   * reads as fair here is fairer in the game than it looks. It is still wrong,
   * and the roads were cut against it knowing that.
   *
   * The optional branches are listed because this table is the CEILING of what
   * the road pays: a player who takes neither the charcoal hollow nor the
   * falls arrives at each Hall about a level under the numbers below, which is
   * the margin the encounter tables are cut against.
   */
  { name: 'Route 8', grass: 'route_8', wilds: 14,
    trainers: ['r8_drover', 'r8_forester', 'r8_agent', 'r8_carter', 'r8_warden', 'r8k_burner'] },
  { name: 'Wintergate', grass: 'route_8_pass', wilds: 14,
    trainers: ['r8p_packman', 'r8p_iceman', 'r8p_lakewarden', 'r8p_gatewarden'] },
  // Hall 6, the Frost Crest, filled in as the note above asks. Four hands and
  // a Keeper, in the order the cistern is crossed: Roke on the north ice where
  // the landing puts you, Fell in the channel the intake is entered from, then
  // the two on the east side who are the longer way round, then Eira Brand on
  // the intake itself. Roke and Fell are the only two a route can be forced
  // through; Varn and Slate are optional and are listed because this table is
  // the CEILING of what the Hall pays.
  { name: 'Frostmere', grass: null, wilds: 0,
    trainers: ['fm_hall_roke', 'fm_hall_fell', 'fm_hall_varn', 'fm_hall_slate', 'fm_keeper_brand'] },
  { name: 'Route 9', grass: 'route_9', wilds: 14,
    trainers: ['r9_carter', 'r9_ropewalker', 'r9_windwatch', 'r9_shepherd', 'r9f_hermit', 'r9_dockrunner'] },
  // Hall 7, the Gale Crest, filled into the row the road agent left empty for
  // it. Corran and Nesse are the two the Masthouse cannot be crossed without;
  // Kellow and Wisp stand on the two dead-end decks and are listed because this
  // table is the CEILING of what the stage pays, not the floor. The Windward
  // Headland has one patch of tussock on it, but Skyreach is a settlement row
  // and settlements carry no wild allowance here, exactly as Mirehaven does not.
  { name: 'Skyreach', grass: null, wilds: 0,
    trainers: ['sh_spur_corran', 'sh_spur_kellow', 'sh_spur_nesse', 'sh_spur_wisp', 'sh_keeper_fenn'] },
  { name: 'Route 10', grass: 'route_10', wilds: 14,
    trainers: ['r10_toll', 'r10_drover', 'r10_terrace', 'r10_courier', 'r10_gatehand'] },
  // Hall 8, the Crown Crest, filled in as the note above asks. The three
  // Stewards stand in the Long Gallery off the centre aisle and are all
  // optional -- they are listed because this table is the CEILING of what the
  // Hall pays -- and Merrin Ord is on the Crown Floor above it. The Long Floor
  // (the three Stewards and the Keeper back to back, offered as a choice on
  // that floor) is NOT a fifth row: it re-fights the same four and pays them
  // once, because a trainer already defeated pays nothing the second time.
  { name: 'Crownspire', grass: null, wilds: 0,
    trainers: ['cs_steward_hollis', 'cs_steward_derrin', 'cs_steward_mabe', 'cs_keeper_ord'] },
  /*
   * Stage 6, the operation: the East Quay, the crossing, the drowned shore and
   * Meridian's outer deck. Four trainers and no grass at all -- there is no
   * wild allowance anywhere in this act, because a wild encounter in the middle
   * of a rescue would be a different game.
   *
   * ALL FOUR ARE LISTED AND ONLY TWO CAN BE FORCED, so this row is the CEILING
   * of what the operation pays, exactly as the Hall rows above it are. The
   * lookout on the stairhead watches the only tile that reaches the platform
   * stair and the two north catwalks are one tile wide with somebody on each,
   * so a player who takes the west road meets the lookout, the deck lead and
   * nobody else; the deckhand in the south bay and the technician on the east
   * catwalk are both avoidable.
   *
   * THE ROW UNDER THIS ONE IS THE TEMPLE'S AND IT IS NOT MINE TO WRITE. The
   * td_* and tdr_* trainers are already in trainers.json with Commander Kell's
   * ace at 44; append them here in road order, below this line, and the table
   * will report the climax against a player who has walked this deck first.
   */
  { name: 'The Operation', grass: null, wilds: 0,
    trainers: ['op_shore_watch', 'op_deck_hand', 'op_deck_tech', 'op_deck_lead'] },
  /*
   * The Temple, appended exactly as the note above this line asks. The two gate
   * fights and the ruin, then the yard, the plant, the tower and the deck, then
   * Commander Kell. `temple_deep` is the only grass in the act and eight fights
   * is a generous allowance for a dungeon a player is crossing on business, so
   * this row is if anything still under-counting.
   *
   * IT IS HERE BECAUSE THE ASCENT BELOW IT CANNOT BE MEASURED WITHOUT IT. Every
   * win rate on the mountain is relative to the level a player arrives with, and
   * with this row missing that number was three levels low.
   */
  { name: 'The Temple', grass: 'temple_deep', wilds: 8,
    trainers: ['tdr_gate_syl', 'tdr_gate_orren', 'tdr_ruin_bern', 'td_yard_ostrey',
      'td_plant_vasse', 'td_tower_hale', 'td_deck_marrow', 'td_kell'] },
  /*
   * STAGE 7, THE ASCENT: the road from Crownspire's north gate to the Summit
   * door. Six maps and eighteen Trainers, in the order the road runs.
   *
   * TWO OF THESE FIVE ROWS ARE OPTIONAL AND ARE LISTED ANYWAY, because this
   * table is the CEILING of what the road pays. The terrace keeper is behind a
   * thorn wall (Clear) and the two at the High Waystation are up a side spur
   * across a meltwater cut, so a player who takes neither arrives at the Summit
   * about a level and a half under the numbers below -- which is the margin the
   * encounter tables were cut against.
   *
   * THE CEILING ABOVE THIS BLOCK IS SOMEBODY ELSE'S. The Summit's four Masters
   * top out at 49 and its Champion at 52, and Tarin's last battle is a 49. The
   * Ascent therefore runs 43 to 48 and never touches 49. If the Summit re-cuts
   * its levels, this road should move with it and not the other way about:
   * canon says the Champion is the hardest normal Trainer battle in the game.
   *
   * THE SUMMIT'S OWN ROWS BELONG UNDER THIS LINE and are not mine to write --
   * summit_master_power, _control, _adapt, _bonds and summit_champion are all
   * already in trainers.json, and the last rival battle is one of the three
   * tarin_summit_* ids keyed on the player's starter.
   */
  { name: 'Ascent Road', grass: 'ascent_road', wilds: 14,
    trainers: ['asr_pilgrim', 'asr_carrier', 'asr_ford', 'asr_terrace', 'asr_falls'] },
  { name: 'The Throat', grass: 'ascent_deep', wilds: 10,
    trainers: ['asd_delver', 'asd_sump', 'asd_stonecrew'] },
  { name: 'West Shoulder', grass: 'ascent_shelf', wilds: 14,
    trainers: ['ass_warden', 'ass_ropewalk', 'ass_cairn', 'ass_notch'] },
  { name: 'Waystation', grass: 'ascent_ruin', wilds: 8,
    trainers: ['asu_pilgrim', 'asu_scholar'] },
  { name: 'The Crown', grass: 'ascent_crown', wilds: 12,
    trainers: ['asc_snowline', 'asc_tarn', 'asc_cornice', 'asc_lastwarden'] },
  /*
   * THE SUMMIT, filled into the slot the Ascent left open above. Tarin's last
   * battle, the four Masters and the Champion, in the order the doors open.
   * No grass anywhere: nothing lives on this mountain above the Waystation,
   * and a wild encounter between two Masters would be a different game.
   *
   * `tarin_summit` is the rival and is resolved through RIVAL below, exactly
   * as `tarin_first` and `tarin_town` are, because he mirrors the starter --
   * six kin either way and the ace is the final form of whichever starter the
   * player did NOT pick. Writing one of the three ids here directly would
   * measure a fight two players in three never have.
   *
   * THE ROW UNDER THIS ONE IS THE POSTGAME'S AND IS STAGE 8's TO WRITE.
   *
   * WHY THIS ROW MATTERS MORE THAN ITS OWN CONTENTS. Everything above it pays
   * out before the last fight, so the Champion's difficulty is a function of
   * this whole table and not of his own levels. The first cut of that bench
   * aced at 52 against a table that stopped at The Operation; when the Temple
   * and the Ascent arrived the same six kin measured 93/84/98 for a novice
   * and were softer than the eighth Hall. It aces at 55 now. ANYBODY WHO
   * CHANGES WHAT THE ASCENT OR THE MASTERS PAY MUST RE-READ THE MEASURED
   * TABLE IN THE $comment ON summit_champion IN data/trainers/trainers.json:
   * every level this road adds is a level that bench owes.
   */
  { name: 'The Summit', grass: null, wilds: 0,
    trainers: ['tarin_summit', 'summit_master_power', 'summit_master_control',
      'summit_master_adapt', 'summit_master_bonds', 'summit_champion'] },
];

/**
 * Tarin mirrors the starter, so his id depends on which one you picked.
 *
 * He takes the one the PLAYER'S beats -- sprigling > rilltail > cinderpaw >
 * sprigling -- and every id below is keyed by the species HE leads with, not by
 * the player's. See docs/TARIN.md; getting this table backwards measures a fight
 * nobody has, which is how the opening ended up tuned to a 97 percent walkover.
 */
const RIVAL = {
  tarin_first: { sprigling: 'tarin_first_rilltail', cinderpaw: 'tarin_first_sprigling', rilltail: 'tarin_first_cinderpaw' },
  tarin_town: { sprigling: 'tarin_stonewake_rilltail', cinderpaw: 'tarin_stonewake_sprigling', rilltail: 'tarin_stonewake_cinderpaw' },
  tarin_summit: { sprigling: 'tarin_summit_rilltail', cinderpaw: 'tarin_summit_sprigling', rilltail: 'tarin_summit_cinderpaw' },
};
export const trainerFor = (id, starter) => RIVAL[id]?.[starter] ?? id;

/** Mean level and mean experience of one wild fight in a route's grass. */
export function grassStats(routeId) {
  const slots = encounterTable(routeId).methods.tallGrass.slots;
  const total = slots.reduce((n, s) => n + s.weight, 0);
  let exp = 0, level = 0, top = 0, bottom = Infinity;
  for (const s of slots) {
    const mid = (s.minLevel + s.maxLevel) / 2;
    exp += (s.weight / total) * Math.floor(((species(s.species)?.baseExp ?? 60) * mid) / 7);
    level += (s.weight / total) * mid;
    top = Math.max(top, s.maxLevel);
    bottom = Math.min(bottom, s.minLevel);
  }
  return { exp, level, top, bottom };
}

/** Experience a whole trainer party pays out. Trainers pay 1.5x wild. */
export const trainerExp = (id) => (byId.get(id)?.party ?? []).reduce(
  (n, p) => n + Math.floor(((species(p.species)?.baseExp ?? 60) * p.level * 1.5) / 7), 0);

export const ace = (id) => Math.max(0, ...(byId.get(id)?.party ?? []).map((p) => p.level));

/**
 * Level the player holds at the start and end of each stage, for a given
 * experience share. Professor Sorrell hands out a level six starter (src/scenes/
 * starter.ts) and all three are mediumSlow.
 *
 * `share` is the mean number of kin that took the field per fight, because
 * experience is divided between them: 1 never switches, 2.5 is a team of four
 * being raised together.
 */
export function progression(share = 1, starter = 'cinderpaw') {
  const growth = species(starter)?.growthRate ?? 'mediumSlow';
  let exp = expForLevel(growth, 6);
  return STAGES.map((st) => {
    const arrive = levelForExp(growth, exp);
    const g = st.grass ? grassStats(st.grass) : null;
    const ids = st.trainers.map((id) => trainerFor(id, starter));
    let gain = (g ? g.exp * st.wilds : 0) + ids.reduce((n, id) => n + trainerExp(id), 0);
    exp += gain / share;
    return {
      stage: st.name, arrive, leave: levelForExp(growth, exp), grass: g,
      first: ace(ids[0]), last: ace(ids[ids.length - 1]), ids,
    };
  });
}

export const SHARES = [['solo lead', 1], ['two up', 1.6], ['rotating team', 2.5]];

/** Experience share each of the two sampled players is really on. */
export const SOLO_SHARE = 1;
export const PARTY_SHARE = 2.5;

/**
 * Level a given player holds partway through a stage. Trainers are not met at
 * the level you entered the route with -- you level up walking to them -- so
 * each one is sampled between the arrive and leave levels of its own stage,
 * spaced by where it stands in the running order.
 */
export function levelAt(share, stageIndex, slot, count) {
  const r = progression(share)[stageIndex];
  return Math.round(r.arrive + (r.leave - r.arrive) * ((slot + 0.5) / count));
}

/* ------------------------------------------------------------------ report */

if (process.argv[1]?.endsWith('simulate.mjs')) {
  const runs = Number(process.argv[2] ?? 200);
  const pad = (s, n) => String(s).padStart(n);

  console.log('\nWHERE THE PLAYER IS  (level held on arriving at / leaving each stage)');
  console.log('  stage           ' + SHARES.map(([n]) => n.padStart(14)).join('')
    + '  |  wild band   trainer aces');
  for (let i = 0; i < STAGES.length; i++) {
    const cells = SHARES.map(([, s]) => {
      const r = progression(s)[i];
      return pad(r.arrive + '-' + r.leave, 14);
    }).join('');
    const r = progression(1)[i];
    const band = r.grass ? `${r.grass.bottom}-${r.grass.top} (${r.grass.level.toFixed(1)})` : '-';
    console.log('  ' + r.stage.padEnd(16) + cells + '  |  ' + band.padEnd(12) + r.first + '-' + r.last);
  }

  // Each of the two players below is sampled at ITS OWN level, not at a shared
  // middle one: the solo lead banks every point of experience, the player
  // raising four kin splits it four ways and is genuinely levels behind.
  const soloAt = new Map(progression(SOLO_SHARE).map((r) => [r.stage, r.arrive]));
  const partyAt = new Map(progression(PARTY_SHARE).map((r) => [r.stage, r.arrive]));

  console.log('\nGRASS AT ARRIVAL  novice play, no items, one kin in front  (average roll / top of band)');
  console.log('  route            solo lead                                   team-raiser');
  for (const st of STAGES) {
    if (!st.grass) continue;
    const cell = (lv) => 'L' + String(lv).padEnd(3) + STARTERS.map((s) =>
      evolveTo(s, lv).slice(0, 5).padEnd(5) + ' '
      + pad(wildRate(st.grass, evolveTo(s, lv), lv, runs), 3) + '/'
      + pad(wildRate(st.grass, evolveTo(s, lv), lv, runs, 'novice', true), 3) + '%').join(' ');
    console.log('  ' + st.grass.padEnd(15) + cell(soloAt.get(st.name))
      + '  ' + cell(partyAt.get(st.name)));
  }

  console.log('\nTRAINERS WHERE THEY STAND  novice play, no items');
  console.log('  trainer             ace | lone starter, solo-lead level   | matched party, team-raiser level');
  STAGES.forEach((st, si) => {
    st.trainers.forEach((raw, i) => {
      const soloLv = levelAt(SOLO_SHARE, si, i, st.trainers.length);
      const partyLv = levelAt(PARTY_SHARE, si, i, st.trainers.length);
      const solo = STARTERS.map((s) => s.slice(0, 4) + ' '
        + pad(rate(s, soloLv, trainerFor(raw, s), runs, 'novice'), 3) + '%').join(' ');
      const team = STARTERS.map((s) => s.slice(0, 4) + ' '
        + pad(matchedRate(s, partyLv, trainerFor(raw, s), runs), 3) + '%').join(' ');
      console.log('  ' + raw.padEnd(20) + pad(ace(trainerFor(raw, 'cinderpaw')), 3)
        + ' | L' + String(soloLv).padEnd(3) + solo
        + ' | L' + String(partyLv).padEnd(3) + team);
    });
  });
  console.log('');
}
