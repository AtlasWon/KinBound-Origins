/**
 * Regression: a kin's health across a switch.
 *
 * The reported bug is "health being depleted when it shouldn't be when the
 * player switches kin". Three separate things have to hold for that never to be
 * true, and each is pinned down here:
 *
 *  1. The engine must never touch a kin that is not on the field.
 *  2. A kin must be no easier to hurt on the turn it walks on than on any
 *     other turn -- there is no hidden switch-in penalty.
 *  3. Every point of health a kin loses on arrival must be accounted for on
 *     screen. The send-out event carries the health the kin walked on WITH, so
 *     the bar starts at the right number, and anything that takes health off it
 *     afterwards says so in the message box.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, registry } from './helpers/loadRegistry.js';
import { Rng } from '../build/js/core/rng.js';
import { createKin } from '../build/js/systems/kin.js';
import { Battle } from '../build/js/battle/battle.js';
import { TrainerAI } from '../build/js/battle/ai.js';

loadRegistry();

const trainer = {
  id: 't', name: 'T', className: 'C', ai: 'trained', prize: 1,
  intro: [], defeat: [], victory: [], afterward: [], party: [],
};

function mkBattle(seed, playerParty, foeParty) {
  const b = new Battle({ playerParty, foeParty, foeTrainer: trainer, isWild: false, seed });
  b.begin();
  b.drainEvents();
  return b;
}

test('a kin off the field never loses health', () => {
  const species = [...registry.species.keys()];
  let checked = 0;
  const losses = [];

  for (let n = 0; n < 120; n++) {
    const rng = new Rng('bench:' + n);
    const party = [0, 1, 2].map((i) =>
      createKin(species[(n * 7 + i * 13) % species.length], 20 + i * 3, rng, { originalTrainer: 'p' }));
    const foes = [0, 1].map((i) =>
      createKin(species[(n * 11 + i * 5) % species.length], 22 + i, rng));
    const battle = mkBattle('bench:' + n, party, foes);
    const ai = new TrainerAI('trained', new Rng('ai:' + n));

    for (let turn = 0; turn < 30 && !battle.over; turn++) {
      if (battle.awaitingPlayerReplacement) {
        const i = battle.player.firstUsableIndex();
        if (i < 0) break;
        battle.doSwitch('player', i);
        battle.drainEvents();
      }
      if (battle.awaitingFoeReplacement) battle.sendNextFoe();
      if (battle.over) break;

      let action;
      if (turn % 3 === 1) {
        const idx = party.findIndex((k, i) => !k.fainted && i !== battle.player.activeIndex);
        action = idx >= 0 ? { kind: 'switch', partyIndex: idx } : ai.choose(battle, 'player');
      } else {
        action = ai.choose(battle, 'player');
      }

      // Anything that held the field at any point this turn is fair game.
      const onField = new Set([battle.player.activeIndex]);
      if (action.kind === 'switch') onField.add(action.partyIndex);
      const before = party.map((k) => k.currentHp);
      battle.takeTurn(action, ai.choose(battle, 'foe'));
      onField.add(battle.player.activeIndex);

      for (let i = 0; i < party.length; i++) {
        if (onField.has(i)) continue;
        checked++;
        if (party[i].currentHp < before[i]) {
          losses.push(`${party[i].name} ${before[i]} -> ${party[i].currentHp} while benched`);
        }
      }
    }
  }
  assert.ok(checked > 500, `only ${checked} bench samples`);
  assert.deepEqual(losses, []);
});

test('walking on is not itself dangerous', () => {
  // The same kin, same foe, same seed: once already standing there, once
  // switched in on the turn the blow lands. If a switch carried a hidden cost
  // the second column would run consistently higher.
  const hurt = (switchedIn, seed) => {
    const rng = new Rng(seed);
    const a = createKin('cinderpaw', 30, rng, { originalTrainer: 'p' });
    const b = createKin('sprigling', 30, rng, { originalTrainer: 'p' });
    const foe = createKin('menhir', 28, rng);
    const battle = mkBattle(seed, switchedIn ? [a, b] : [b, a], [foe]);
    battle.takeTurn(
      switchedIn ? { kind: 'switch', partyIndex: 1 } : { kind: 'move', index: 0 },
      { kind: 'move', index: 0 },
    );
    return b.maxHp - b.currentHp;
  };
  let inTotal = 0;
  let outTotal = 0;
  for (let i = 0; i < 40; i++) {
    inTotal += hurt(true, 'x' + i);
    outTotal += hurt(false, 'x' + i);
  }
  // Not equal -- the two turns diverge for honest reasons -- but nowhere near
  // the "switching costs you a chunk of health" the report describes.
  assert.ok(inTotal < outTotal * 2,
    `switched in took ${inTotal} across 40 turns, already out took ${outTotal}`);
});

test('the send-out carries the health the kin walked on with, not the health it ends the turn on', () => {
  const rng = new Rng('snap');
  const a = createKin('cinderpaw', 30, rng, { originalTrainer: 'p' });
  const b = createKin('sprigling', 30, rng, { originalTrainer: 'p' });
  const battle = mkBattle('snap', [a, b], [createKin('menhir', 30, rng)]);
  const fullB = b.currentHp;

  const events = battle.takeTurn({ kind: 'switch', partyIndex: 1 }, { kind: 'move', index: 0 });
  const sendOut = events.find((e) => e.t === 'sendOut' && e.side === 'player');
  assert.ok(sendOut, 'the switch announced a send-out');
  assert.equal(sendOut.kin, b);
  assert.equal(sendOut.hp, fullB,
    'the bar must start where the kin started, not where the turn left it');
  assert.equal(sendOut.exp, b.exp);
  assert.equal(sendOut.level, b.level);
});

test('everything that hurts a kin as it arrives says so', () => {
  // Both hazards, one layer of each, so the incoming kin takes damage from
  // something that is not an attack. Every damage event must have a line to go
  // with it: health that drains with nothing on screen explaining it is
  // indistinguishable from the switch itself doing the damage.
  for (const hazard of ['grit', 'spikes']) {
    const rng = new Rng('haz:' + hazard);
    const a = createKin('cinderpaw', 30, rng, { originalTrainer: 'p' });
    const b = createKin('sprigling', 30, rng, { originalTrainer: 'p' });
    const battle = mkBattle('haz:' + hazard, [a, b], [createKin('menhir', 5, rng)]);
    battle.player.hazards[hazard] = hazard === 'spikes' ? 2 : 1;

    battle.doSwitch('player', 1);
    const events = battle.drainEvents();
    const i = events.findIndex((e) => e.t === 'sendOut');
    const after = events.slice(i);
    const damage = after.filter((e) => e.t === 'damage');
    assert.equal(damage.length, 1, `${hazard} hurt the arriving kin exactly once`);
    const messages = after.filter((e) => e.t === 'message').map((e) => e.text);
    assert.ok(messages.some((m) => /hurt by/.test(m)),
      `${hazard} took health off ${b.name} without a word about it: ${JSON.stringify(messages)}`);
  }
});
