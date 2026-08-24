/**
 * Headless battle simulator.
 *
 * Used to measure difficulty rather than guess at it: the first fight in the
 * game was won three times in a hundred, and "it feels hard" is not something
 * you can tune against. It uses no items on the player's side, so a win here
 * is a win on the raw matchup.
 *
 * Two player skill tiers are reported, because they answer different
 * questions. The *veteran* column is the ceiling -- someone who reads the type
 * chart and always picks their best move. The *novice* column is the person
 * who actually wrote the bug report: they press the top move and hope. A first
 * trainer has to be comfortable in the novice column, not just the veteran one.
 *
 *   node tests/helpers/simulate.mjs [starterLevel] [runs]
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { loadRegistry } = await import('./loadRegistry.js');
const { Rng } = await import('../../build/js/core/rng.js');
const { createKin } = await import('../../build/js/systems/kin.js');
const { Battle } = await import('../../build/js/battle/battle.js');
const { TrainerAI } = await import('../../build/js/battle/ai.js');

loadRegistry();

const trainers = JSON.parse(readFileSync(resolve(ROOT, 'data/trainers/trainers.json'), 'utf8'));
const byId = new Map((Array.isArray(trainers) ? trainers : Object.values(trainers)).map((t) => [t.id, t]));

/**
 * Build a trainer's kin the way the game does, honouring every per-mon
 * override in the party entry. Reading only `species` and `level` silently
 * ignored hand-written movesets, which made any moveset tuning unmeasurable.
 */
function buildFoe(entry, rng) {
  const { species, level, ...opts } = entry;
  return createKin(species, level, rng, opts);
}

export function runOne(playerSpecies, playerLevel, trainerId, seed, playerTier = 'veteran') {
  const rng = new Rng('sim-' + seed);
  const trainer = byId.get(trainerId);
  const party = [createKin(playerSpecies, playerLevel, rng, { originalTrainer: 'player' })];
  const foes = trainer.party.map((p) => buildFoe(p, rng));

  const battle = new Battle({
    playerParty: party, foeParty: foes, foeTrainer: trainer,
    isWild: false, seed: 'sim-' + seed,
  });
  battle.begin();

  const you = new TrainerAI(playerTier, rng);
  const them = new TrainerAI(trainer.ai ?? 'novice', rng);

  for (let turn = 0; turn < 60 && !battle.over; turn++) {
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

export const rate = (species, level, id, runs, tier = 'veteran') => {
  let wins = 0;
  for (let i = 0; i < runs; i++) if (runOne(species, level, id, i, tier) === 'win') wins++;
  return Math.round((wins / runs) * 100);
};

/**
 * One wild encounter, fought to a finish with no fleeing and no items. Wild
 * fights are the level curve: they are what a player grinds on to arrive at a
 * trainer, so a route whose grass can beat your starter is a route you cannot
 * safely grind. The foe level is drawn from the slot's own band.
 */
function runWild(playerSpecies, playerLevel, foeSpecies, foeLevel, seed, tier) {
  const rng = new Rng('wild-' + seed);
  const party = [createKin(playerSpecies, playerLevel, rng, { originalTrainer: 'player' })];
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
  const table = JSON.parse(readFileSync(resolve(ROOT, `data/encounters/${routeId}.json`), 'utf8'));
  const slots = table.methods?.tallGrass?.slots ?? [];
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

const STARTERS = ['sprigling', 'cinderpaw', 'rilltail'];
const RIVAL_FOR = {
  sprigling: 'perrin_first_cinderpaw',
  cinderpaw: 'perrin_first_rilltail',
  rilltail: 'perrin_first_sprigling',
};

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('simulate.mjs')) {
  // Dr. Vess hands out a level SIX starter (src/scenes/starter.ts). Defaulting
  // to five measured a fight nobody ever has.
  const level = Number(process.argv[2] ?? 6);
  const runs = Number(process.argv[3] ?? 500);

  console.log('\nfirst rival fight, player at level ' + level + ', ' + runs + ' battles each');
  console.log('  ' + 'starter'.padEnd(10) + ' ' + 'rival'.padEnd(24) + 'novice   veteran');
  for (const s of STARTERS) {
    const foe = RIVAL_FOR[s];
    if (!byId.has(foe)) continue;
    const nov = String(rate(s, level, foe, runs, 'novice')) + '%';
    const vet = String(rate(s, level, foe, runs, 'veteran')) + '%';
    console.log('  ' + s.padEnd(10) + ' ' + foe.padEnd(24) + nov.padStart(4) + '   ' + vet.padStart(7));
  }

  // Route order and arrival levels taken from where the NPCs actually stand.
  // Route 1 runs south to north: Madden at y26 (sight range 4, so unavoidable),
  // Ottel at y13, Cale at y6, the surveyor at y3. The old table listed these at
  // levels 8 to 11, which is two or three levels past where a player really
  // meets them -- it measured a comfortable walk that nobody takes. r1_wray and
  // r1_bex are defined but placed on no map, so they are not on the road.
  const ROUTE = [
    ['r1_madden', 6], ['r1_ottel', 7], ['r1_cale', 8], ['concord_surveyor_1', 10],
    ['r2_dell', 12], ['r2_pike', 12], ['r2_juna', 13], ['r2_wren', 14],
    ['bastion1_roxen', 16],
  ];
  const routeRuns = Math.max(60, Math.round(runs / 2));
  console.log('\nthe road ahead, one starter alone, novice play, ' + routeRuns + ' battles each');
  for (const [id, lv] of ROUTE) {
    if (!byId.has(id)) continue;
    const cells = STARTERS.map((s) => s.slice(0, 4) + ' ' + String(rate(s, lv, id, routeRuns, 'novice')).padStart(3) + '%');
    console.log('  ' + id.padEnd(20) + 'L' + String(lv).padEnd(3) + cells.join('   '));
  }

  const GRASS = [['marrow_hollow', 6], ['route_1', 6], ['route_1', 8], ['route_2', 10]];
  console.log('\ngrinding in the grass, solo starter, novice play  (average / top of band)');
  for (const [routeId, lv] of GRASS) {
    const cells = STARTERS.map((s) => s.slice(0, 4) + ' '
      + String(wildRate(routeId, s, lv, routeRuns)).padStart(3) + '/'
      + String(wildRate(routeId, s, lv, routeRuns, 'novice', true)).padStart(3) + '%');
    console.log('  ' + routeId.padEnd(20) + 'L' + String(lv).padEnd(3) + cells.join('   '));
  }
  console.log('');
}
