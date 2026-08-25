/**
 * Briarbell's own difficulty measurement.
 *
 * The shipped harness cannot be used unchanged here, and the reason matters:
 * its bench unlocks Slatewing, Gravelet and Chalkid at level ten, because in
 * the old geography level ten meant Route 2 had been walked. Briarbell comes
 * BEFORE Route 2. A player who arrives here has caught nothing but what grows
 * in Hearthmere and on Route 1 -- Nibbet, Tuftail, Pipwing, Nettlebug -- so
 * measuring against the shipped bench measures a party nobody standing in this
 * doorway can have, and it flatters the fight by forty points.
 *
 *   node tests/helpers/simulate-briarbell.mjs [runs]
 *
 * Everything else is the shipped harness: the same Battle, the same TrainerAI,
 * the same novice player who presses the top move, no items on either side.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ROOT = pathToFileURL(HERE).href;
const { loadRegistry } = await import(`${ROOT}/tests/helpers/loadRegistry.js`);
const { registry } = await import(`${ROOT}/build/js/data/registry.js`);
const { Rng } = await import(`${ROOT}/build/js/core/rng.js`);
const { createKin } = await import(`${ROOT}/build/js/systems/kin.js`);
const { Battle } = await import(`${ROOT}/build/js/battle/battle.js`);
const { TrainerAI } = await import(`${ROOT}/build/js/battle/ai.js`);
const { readFileSync } = await import('node:fs');
const rel = (p) => resolve(HERE, p);
loadRegistry();

const trainers = new Map(JSON.parse(readFileSync(rel('data/trainers/trainers.json'), 'utf8')).map((t) => [t.id, t]));
const STARTERS = ['sprigling', 'cinderpaw', 'rilltail'];
/** Everything catchable between waking up and reaching Briarbell, best first. */
const BENCH = ['tuftail', 'nibbet', 'pipwing', 'nettlebug'];

function party(starter, level, size, rng) {
  const p = [createKin(starter, level, rng, { originalTrainer: 'player' })];
  for (let i = 0; i < size - 1; i++) {
    p.push(createKin(BENCH[i % BENCH.length], Math.max(2, level - 1), rng, { originalTrainer: 'player' }));
  }
  return p;
}

function one(starter, level, id, seed, tier, size) {
  const rng = new Rng('bb-' + seed);
  const t = trainers.get(id);
  const foes = t.party.map(({ species, level: lv, ...o }) => createKin(species, lv, rng, o));
  const b = new Battle({ playerParty: party(starter, level, size, rng), foeParty: foes, foeTrainer: t, isWild: false, seed: 'bb-' + seed });
  b.begin();
  const you = new TrainerAI(tier, rng);
  const them = new TrainerAI(t.ai ?? 'novice', rng);
  for (let turn = 0; turn < 120 && !b.over; turn++) {
    if (b.awaitingFoeReplacement) { b.sendNextFoe(); continue; }
    if (b.awaitingPlayerReplacement) {
      const i = b.player.firstUsableIndex();
      if (i < 0) break;
      b.doSwitch('player', i);
      continue;
    }
    b.takeTurn(you.choose(b, 'player'), them.choose(b, 'foe'));
  }
  return b.result ?? 'draw';
}

export const rate = (starter, level, id, runs, tier, size) => {
  let w = 0;
  for (let i = 0; i < runs; i++) if (one(starter, level, id, i, tier, size) === 'win') w++;
  return Math.round((w / runs) * 100);
};

if (process.argv[1]?.endsWith('simulate-briarbell.mjs')) {
  const runs = Number(process.argv[2] ?? 200);
  const pad = (s, n) => String(s).padStart(n);
  console.log('\nBRIARBELL, measured against a party a Route 1 player really has');
  console.log('  novice play, no items on either side.  (sprigling / cinderpaw / rilltail)\n');
  console.log('  trainer          ace | party of 3, L8   L9   L10  | lone starter L9  L11');
  for (const id of ['briar_hand_a', 'briar_hand_b', 'briar_keeper']) {
    const t = trainers.get(id);
    const size = Math.max(2, Math.min(4, t.party.length));
    const cell = (lv) => STARTERS.map((s) => pad(rate(s, lv, id, runs, 'novice', size), 3)).join('/');
    const solo = (lv) => STARTERS.map((s) => pad(rate(s, lv, id, runs, 'novice', 1), 3)).join('/');
    console.log('  ' + id.padEnd(16) + pad(Math.max(...t.party.map((p) => p.level)), 3)
      + ' | ' + cell(8) + ' ' + cell(9) + ' ' + cell(10) + ' | ' + solo(9) + ' ' + solo(11));
  }
  console.log('');
}
