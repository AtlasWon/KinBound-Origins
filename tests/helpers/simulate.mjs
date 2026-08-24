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
 *   3. WITH WHAT. A lone starter against a four-kin Keeper is not a fight
 *      anybody has; it is one kin against four with no healing. Trainer rows
 *      are therefore fought twice -- once solo, which is the floor, and once
 *      with a party the size of the trainer's own, which is the fight.
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
 * A plausible bench. Nobody walks into a Bastion with one kin, so trainer
 * fights are also measured with a party the size of the trainer's own: the
 * lead is the starter line, the rest are ordinary catchables one level down.
 *
 * The bench has to be one a player of that level would really have. A fixed
 * list read as a Bastion fought with three Nibbets, which made every late
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
  { name: 'Marrow Hollow', grass: 'marrow_hollow', wilds: 5,
    trainers: ['perrin_first'] },
  { name: 'Route 1', grass: 'route_1', wilds: 14,
    trainers: ['r1_madden', 'r1_ottel', 'r1_cale', 'concord_surveyor_1'] },
  { name: 'Route 2', grass: 'route_2', wilds: 14,
    trainers: ['r2_dell', 'r2_juna', 'r2_pike', 'r2_wren'] },
  { name: 'Kellowmere', grass: null, wilds: 0,
    trainers: ['perrin_km', 'bastion1_guard_a', 'bastion1_guard_b', 'bastion1_roxen'] },
  { name: 'Route 3', grass: 'route_3', wilds: 14,
    trainers: ['r3_bram', 'r3_sill', 'r3_holt', 'concord_surveyor_2'] },
  { name: 'Route 4', grass: 'route_4', wilds: 14,
    trainers: ['r4_teal', 'r4_gorse', 'r4_nesh', 'r4_bay'] },
  { name: 'Brackwater', grass: null, wilds: 0,
    trainers: ['bastion2_guard_a', 'bastion2_guard_b', 'bastion2_guard_c', 'bastion2_mabry'] },
];

/** Perrin mirrors the starter, so his id depends on which one you picked. */
const RIVAL = {
  perrin_first: { sprigling: 'perrin_first_cinderpaw', cinderpaw: 'perrin_first_rilltail', rilltail: 'perrin_first_sprigling' },
  perrin_km: { sprigling: 'perrin_km_sprigling', cinderpaw: 'perrin_km_cinderpaw', rilltail: 'perrin_km_rilltail' },
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
 * experience share. Dr. Vess hands out a level six starter (src/scenes/
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

  // Everything below is sampled at where the "two up" player actually stands
  // when they walk in, which is the middle of the three columns above.
  const arriveAt = new Map(progression(1.6).map((r) => [r.stage, r.arrive]));

  console.log('\nGRASS AT ARRIVAL  novice play, solo lead, no items  (average roll / top of band)');
  for (const st of STAGES) {
    if (!st.grass) continue;
    const lv = arriveAt.get(st.name);
    const cells = STARTERS.map((s) => evolveTo(s, lv).slice(0, 5).padEnd(5) + ' '
      + pad(wildRate(st.grass, evolveTo(s, lv), lv, runs), 3) + '/'
      + pad(wildRate(st.grass, evolveTo(s, lv), lv, runs, 'novice', true), 3) + '%');
    console.log('  ' + st.grass.padEnd(15) + 'L' + String(lv).padEnd(3) + cells.join('  '));
  }

  // A trainer is not met at the level you entered the route with -- you level
  // up walking to them. Each one is sampled where they actually stand in the
  // stage, between the arrive and leave levels of the "two up" column.
  console.log('\nTRAINERS WHERE THEY STAND  novice play  (lone starter / party the size of theirs)');
  for (const r of progression(1.6)) {
    const st = STAGES.find((s) => s.name === r.stage);
    st.trainers.forEach((raw, i) => {
      const lv = Math.round(r.arrive + (r.leave - r.arrive) * ((i + 0.5) / st.trainers.length));
      const cells = STARTERS.map((s) => {
        const id = trainerFor(raw, s);
        return s.slice(0, 4) + ' ' + pad(rate(s, lv, id, runs, 'novice'), 3) + '/'
          + pad(matchedRate(s, lv, id, runs), 3) + '%';
      });
      console.log('  ' + raw.padEnd(20) + 'L' + String(lv).padEnd(3)
        + 'ace' + pad(ace(trainerFor(raw, 'cinderpaw')), 3) + '  ' + cells.join('  '));
    });
  }
  console.log('');
}
