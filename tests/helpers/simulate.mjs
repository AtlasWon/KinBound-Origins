/**
 * Headless battle simulator.
 *
 * Used to measure difficulty rather than guess at it: the first fight in the
 * game was won three times in a hundred, and "it feels hard" is not something
 * you can tune against. Both sides are played by the novice AI, which is a fair
 * stand-in for someone new to the game and, importantly, uses no items.
 *
 *   node tests/helpers/simulate.mjs [starterLevel]
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

function runOne(playerSpecies, playerLevel, trainerId, seed) {
  const rng = new Rng('sim-' + seed);
  const trainer = byId.get(trainerId);
  const party = [createKin(playerSpecies, playerLevel, rng, { originalTrainer: 'player' })];
  const foes = trainer.party.map((p) => createKin(p.species, p.level, rng));

  const battle = new Battle({
    playerParty: party, foeParty: foes, foeTrainer: trainer,
    isWild: false, seed: 'sim-' + seed,
  });
  battle.begin();

  // The player is played by a competent AI: a person picks their strongest
  // move, which the novice tier deliberately does not.
  const you = new TrainerAI('veteran', rng);
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

const STARTERS = ['sprigling', 'cinderpaw', 'rilltail'];
const RIVAL_FOR = {
  sprigling: 'perrin_first_cinderpaw',
  cinderpaw: 'perrin_first_rilltail',
  rilltail: 'perrin_first_sprigling',
};

const rate = (species, level, id, runs) => {
  let wins = 0;
  for (let i = 0; i < runs; i++) if (runOne(species, level, id, i) === 'win') wins++;
  return Math.round((wins / runs) * 100);
};

const level = Number(process.argv[2] ?? 5);
console.log('\nfirst rival fight, player at level ' + level);
for (const s of STARTERS) {
  const foe = RIVAL_FOR[s];
  if (!byId.has(foe)) continue;
  console.log('  ' + s.padEnd(10) + ' vs ' + foe.padEnd(24) + rate(s, level, foe, 200) + '% wins');
}

const ROUTE = [
  ['r1_madden', 8], ['r1_wray', 8], ['r1_bex', 8], ['r1_ottel', 9], ['r1_cale', 10],
  ['concord_surveyor_1', 11], ['r2_dell', 12], ['r2_juna', 13], ['bastion1_roxen', 16],
];
console.log('\nthe road ahead, each starter at the level you would arrive with');
for (const [id, lv] of ROUTE) {
  if (!byId.has(id)) continue;
  const cells = STARTERS.map((s) => s.slice(0, 4) + ' ' + String(rate(s, lv, id, 120)).padStart(3) + '%');
  console.log('  ' + id.padEnd(20) + 'L' + String(lv).padEnd(3) + cells.join('   '));
}
console.log('');
