import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, registry } from './helpers/loadRegistry.js';
import { Rng } from '../build/js/core/rng.js';
import { Kin, createKin } from '../build/js/systems/kin.js';
import { Battle } from '../build/js/battle/battle.js';
import { TrainerAI } from '../build/js/battle/ai.js';
import { expForLevel } from '../build/js/battle/formulas.js';

loadRegistry();

const perfectIvs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

function mk(species, level, rng, opts = {}) {
  return createKin(species, level, rng, { ivs: perfectIvs, nature: 'steady', ...opts });
}

/** Runs a battle to completion with both sides driven by AI. */
function autoBattle(playerParty, foeParty, seed, {
  playerTier = 'trained', foeTier = 'trained', foeTrainer, isWild = false, maxTurns = 300,
} = {}) {
  const battle = new Battle({
    playerParty, foeParty, foeTrainer, isWild, seed,
  });
  battle.begin();
  const rng = new Rng(seed + ':ai');
  const pAi = new TrainerAI(playerTier, rng);
  const fAi = new TrainerAI(foeTier, rng);

  let turns = 0;
  while (!battle.over && turns < maxTurns) {
    turns++;
    if (battle.awaitingPlayerReplacement) {
      const idx = battle.player.firstUsableIndex();
      if (idx < 0) { battle.forceLoss(); break; }
      battle.doSwitch('player', idx);
      battle.drainEvents();
    }
    if (battle.awaitingFoeReplacement) {
      battle.sendNextFoe();
    }
    if (battle.over) break;
    const pAction = pAi.choose(battle, 'player');
    const fAction = fAi.choose(battle, 'foe');
    battle.takeTurn(pAction, fAction);
  }
  return { battle, turns };
}

/* ------------------------------------------------------------- content */

test('every species references content that actually exists', () => {
  const typeIds = new Set(registry.typeChart.order);
  for (const [id, sp] of registry.species) {
    assert.equal(sp.id, id);
    assert.ok(sp.num > 0, `${id} has no Vellum number`);
    for (const t of sp.types) assert.ok(typeIds.has(t), `${id} has unknown type ${t}`);
    assert.ok(sp.types.length >= 1 && sp.types.length <= 2, `${id} has ${sp.types.length} types`);
    for (const a of sp.abilities) assert.ok(registry.abilities.has(a), `${id} has unknown ability ${a}`);
    if (sp.hiddenAbility) assert.ok(registry.abilities.has(sp.hiddenAbility), `${id} bad hidden ability`);
    for (const l of sp.learnset) {
      assert.ok(registry.moves.has(l.move), `${id} learns unknown move ${l.move}`);
      assert.ok(l.level >= 1 && l.level <= 100, `${id} learns ${l.move} at level ${l.level}`);
    }
    for (const evo of sp.evolutions ?? []) {
      assert.ok(registry.species.has(evo.to), `${id} evolves into unknown ${evo.to}`);
    }
    assert.ok(sp.catchRate >= 1 && sp.catchRate <= 255, `${id} catch rate ${sp.catchRate}`);
    assert.ok(sp.baseExp > 0, `${id} base exp`);
    assert.ok(sp.vellumEntry.length > 20, `${id} has a thin Vellum entry`);
    assert.ok(sp.design.palette.length >= 3, `${id} needs a palette for sprite generation`);
  }
});

test('Vellum numbers are unique and contiguous from 1', () => {
  const nums = [...registry.species.values()].map((s) => s.num).sort((a, b) => a - b);
  assert.equal(new Set(nums).size, nums.length, 'duplicate Vellum numbers');
  nums.forEach((n, i) => assert.equal(n, i + 1, `gap in Vellum numbering at ${n}`));
});

test('every move is internally consistent', () => {
  const typeIds = new Set(registry.typeChart.order);
  for (const [id, m] of registry.moves) {
    assert.equal(m.id, id);
    assert.ok(typeIds.has(m.type), `${id} has unknown type ${m.type}`);
    assert.ok(['physical', 'special', 'status'].includes(m.category), `${id} category`);
    if (m.category === 'status') assert.equal(m.power, 0, `${id} is a status move with power`);
    else assert.ok(m.power > 0, `${id} is a damaging move with no power`);
    assert.ok(m.pp >= 1 && m.pp <= 40, `${id} pp ${m.pp}`);
    assert.ok(m.accuracy === -1 || (m.accuracy > 0 && m.accuracy <= 100), `${id} accuracy`);
    assert.ok(m.priority >= -7 && m.priority <= 7, `${id} priority`);
    assert.ok(m.description.length > 5, `${id} needs a description`);
  }
});

test('no starter line is statistically dominant', () => {
  const finals = ['thornmarch', 'volcatrix', 'maelstrix'];
  const totals = finals.map((id) => {
    const b = registry.species.get(id).base;
    return b.hp + b.atk + b.def + b.spa + b.spd + b.spe;
  });
  const min = Math.min(...totals), max = Math.max(...totals);
  assert.equal(min, max, `starter base stat totals differ: ${totals.join(', ')}`);
  assert.ok(min >= 480 && min <= 540, `starter total ${min} is out of band`);
});

test('evolution levels never exceed the stage that follows them', () => {
  for (const sp of registry.species.values()) {
    for (const evo of sp.evolutions ?? []) {
      if (evo.method.kind !== 'level') continue;
      const next = registry.species.get(evo.to);
      const nextEvo = (next.evolutions ?? []).find((e) => e.method.kind === 'level');
      if (nextEvo) {
        assert.ok(nextEvo.method.level > evo.method.level,
          `${sp.id} -> ${evo.to} at ${evo.method.level} but ${evo.to} evolves at ${nextEvo.method.level}`);
      }
    }
  }
});

/* ----------------------------------------------------------------- kin */

test('a created kin has sane stats, moves and HP', () => {
  const rng = new Rng('kin-create');
  const k = mk('cinderpaw', 5, rng);
  assert.equal(k.speciesName, 'Cinderpaw');
  assert.equal(k.level, 5);
  assert.ok(k.maxHp > 10 && k.maxHp < 40, `level 5 HP was ${k.maxHp}`);
  assert.equal(k.currentHp, k.maxHp);
  assert.ok(k.moves.length >= 1 && k.moves.length <= 4);
  for (const m of k.moves) {
    assert.ok(registry.moves.has(m.id), `unknown move ${m.id}`);
    assert.equal(m.pp, m.maxPp);
  }
  assert.equal(k.exp, expForLevel('mediumSlow', 5));
});

test('moves are drawn from the learnset up to the current level', () => {
  const rng = new Rng('kin-moves');
  const low = mk('sprigling', 5, rng);
  const high = mk('sprigling', 30, rng);
  assert.ok(low.moves.every((m) => ['strike', 'brace', 'vinewhip'].includes(m.id)));
  assert.ok(high.moves.some((m) => m.id === 'bloomburst'), 'a level 30 Sprigling should know Bloomburst');
  assert.ok(high.moves.length === 4);
});

test('levelling raises max HP and current HP by the same amount', () => {
  const rng = new Rng('kin-level');
  const k = mk('nibbet', 5, rng);
  k.currentHp = k.maxHp - 3;
  const beforeMax = k.maxHp;
  const res = k.gainExp(expForLevel('fast', 12));
  assert.ok(res.levels.length > 0);
  assert.equal(k.maxHp - k.currentHp, 3, 'damage taken should survive a level up');
  assert.ok(k.maxHp > beforeMax);
});

test('level ups report the moves learned at each level crossed', () => {
  const rng = new Rng('kin-learn');
  const k = mk('pipwing', 3, rng);
  const res = k.gainExp(expForLevel('mediumFast', 13) - k.exp);
  assert.deepEqual(res.levels.slice(-1), [13]);
  const learnedMoves = res.learned.map((l) => l.move);
  assert.ok(learnedMoves.includes('gustline'));
  assert.ok(learnedMoves.includes('wingbeat'));
});

test('EV gains respect both the per-stat and total caps', () => {
  const rng = new Rng('kin-ev');
  const k = mk('nibbet', 50, rng);
  for (let i = 0; i < 400; i++) k.gainEvs({ spe: 3 });
  assert.ok(k.evs.spe <= 255, `spe EVs ${k.evs.spe}`);
  for (let i = 0; i < 400; i++) k.gainEvs({ atk: 3, def: 3 });
  const total = Object.values(k.evs).reduce((a, b) => a + b, 0);
  assert.ok(total <= 510, `total EVs ${total}`);
});

test('evolution triggers only when its condition is met', () => {
  const rng = new Rng('kin-evo');
  const young = mk('cinderpaw', 15, rng);
  assert.equal(young.checkEvolution({ trigger: 'levelUp' }), undefined);
  const ready = mk('cinderpaw', 16, rng);
  assert.equal(ready.checkEvolution({ trigger: 'levelUp' })?.to, 'blazelynx');

  const friend = mk('tuftail', 20, rng);
  friend.friendship = 100;
  assert.equal(friend.checkEvolution({ trigger: 'levelUp' }), undefined);
  friend.friendship = 200;
  assert.equal(friend.checkEvolution({ trigger: 'levelUp' })?.to, 'bristlebuck');
});

test('evolving keeps damage taken and updates the ability if needed', () => {
  const rng = new Rng('kin-evolve');
  const k = mk('cinderpaw', 16, rng);
  k.currentHp = k.maxHp - 5;
  const beforeMissing = k.maxHp - k.currentHp;
  k.evolveInto('blazelynx');
  assert.equal(k.speciesName, 'Blazelynx');
  assert.equal(k.maxHp - k.currentHp, beforeMissing);
  assert.ok(registry.species.get('blazelynx').abilities.includes(k.ability));
});

/* -------------------------------------------------------------- battle */

test('a wild battle opens with the expected events', () => {
  const rng = new Rng('battle-open');
  const battle = new Battle({
    playerParty: [mk('cinderpaw', 8, rng)],
    foeParty: [mk('nibbet', 5, rng)],
    isWild: true,
    seed: 'open',
  });
  const events = battle.begin();
  const kinds = events.map((e) => e.t);
  assert.ok(kinds.includes('sendOut'));
  const text = events.filter((e) => e.t === 'message').map((e) => e.text).join(' ');
  assert.match(text, /A wild Nibbet appeared/);
});

test('a damaging move reduces HP and emits a damage event', () => {
  const rng = new Rng('battle-damage');
  const attacker = mk('cinderpaw', 20, rng, { moves: ['ember_spit'] });
  const defender = mk('sprigling', 20, rng, { moves: ['brace'] });
  const battle = new Battle({ playerParty: [attacker], foeParty: [defender], isWild: true, seed: 'dmg' });
  battle.begin();
  const before = defender.currentHp;
  const events = battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  const dmg = events.find((e) => e.t === 'damage' && e.side === 'foe');
  assert.ok(dmg, 'expected a damage event on the foe');
  assert.ok(defender.currentHp < before);
  // Flame into Verdant is super effective.
  assert.equal(dmg.effectiveness, 2);
});

test('PP is spent and a move with no PP cannot be used', () => {
  const rng = new Rng('battle-pp');
  const a = mk('cinderpaw', 20, rng, { moves: ['ember_spit'] });
  const b = mk('pebblet', 20, rng, { moves: ['brace'] });
  const battle = new Battle({ playerParty: [a], foeParty: [b], isWild: true, seed: 'pp' });
  battle.begin();
  const start = a.moves[0].pp;
  battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  assert.equal(a.moves[0].pp, start - 1);

  a.moves[0].pp = 0;
  const events = battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  const text = events.filter((e) => e.t === 'message').map((e) => e.text).join(' ');
  assert.match(text, /no power left/);
});

test('immunity is reported and deals no damage', () => {
  const rng = new Rng('battle-immune');
  // Spark into Terra is an immunity in this chart.
  const a = mk('fizzlet', 30, rng, { moves: ['arcjolt'] });
  const b = mk('burrowen', 30, rng, { moves: ['brace'] });
  const battle = new Battle({ playerParty: [a], foeParty: [b], isWild: true, seed: 'imm' });
  battle.begin();
  const hp = b.currentHp;
  const events = battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  assert.equal(b.currentHp, hp);
  assert.ok(events.some((e) => e.t === 'noEffect'));
});

test('status conditions apply, chip HP, and are type-blocked correctly', () => {
  const rng = new Rng('battle-status');
  const a = mk('spinnet', 40, rng, { moves: ['creeping_dose'] });
  const b = mk('nibbet', 40, rng, { moves: ['brace'] });
  const battle = new Battle({ playerParty: [a], foeParty: [b], isWild: true, seed: 'tox' });
  battle.begin();
  battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  assert.equal(b.status, 'toxic');
  const afterFirst = b.currentHp;
  battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  assert.ok(b.currentHp < afterFirst, 'toxic should chip each turn');

  // A Venom-type cannot be poisoned.
  const venomous = mk('spinnet', 40, rng, { moves: ['brace'] });
  const poisoner = mk('spinnet', 40, rng, { moves: ['creeping_dose'] });
  const b2 = new Battle({ playerParty: [poisoner], foeParty: [venomous], isWild: true, seed: 'tox2' });
  b2.begin();
  for (let i = 0; i < 3; i++) b2.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  assert.equal(venomous.status, 'none');
});

test('a burn halves physical damage in a real battle', () => {
  const rng = new Rng('battle-burn');
  const attacker = mk('nibbet', 40, rng, { moves: ['batter'] });
  const wall = mk('pebblet', 60, rng, { moves: ['brace'] });
  const wall2 = mk('pebblet', 60, rng, { moves: ['brace'] });

  const clean = new Battle({ playerParty: [attacker], foeParty: [wall], isWild: true, seed: 'burn-a' });
  clean.begin();
  const evA = clean.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  const dmgA = evA.find((e) => e.t === 'damage' && e.side === 'foe').amount;

  const burned = mk('nibbet', 40, rng, { moves: ['batter'] });
  burned.status = 'burn';
  const hot = new Battle({ playerParty: [burned], foeParty: [wall2], isWild: true, seed: 'burn-a' });
  hot.begin();
  const evB = hot.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  const dmgB = evB.find((e) => e.t === 'damage' && e.side === 'foe').amount;

  assert.ok(dmgB < dmgA, `burned ${dmgB} should be under clean ${dmgA}`);
});

test('stat stages change, clamp, and report failure at the cap', () => {
  const rng = new Rng('battle-stages');
  const a = mk('cinderpaw', 30, rng, { moves: ['howl'] });
  const b = mk('nibbet', 30, rng, { moves: ['brace'] });
  const battle = new Battle({ playerParty: [a], foeParty: [b], isWild: true, seed: 'stage' });
  battle.begin();
  for (let i = 0; i < 6; i++) battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  assert.equal(battle.player.stages.atk, 6);
  const events = battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  assert.ok(events.some((e) => e.t === 'statChange' && e.failed));
});

test('switching resets stat stages but keeps HP and status', () => {
  const rng = new Rng('battle-switch');
  const a = mk('cinderpaw', 30, rng, { moves: ['howl'] });
  const bench = mk('sprigling', 30, rng, { moves: ['brace'] });
  const foe = mk('nibbet', 30, rng, { moves: ['brace'] });
  const battle = new Battle({ playerParty: [a, bench], foeParty: [foe], isWild: true, seed: 'sw' });
  battle.begin();
  battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  assert.equal(battle.player.stages.atk, 1);
  a.currentHp = a.maxHp - 7;
  battle.takeTurn({ kind: 'switch', partyIndex: 1 }, { kind: 'move', index: 0 });
  assert.equal(battle.player.stages.atk, 0);
  assert.equal(battle.player.active.species, 'sprigling');
  assert.equal(a.maxHp - a.currentHp >= 7, true);
});

test('using a potion in battle heals and consumes it from the bag', () => {
  const rng = new Rng('battle-item');
  const a = mk('cinderpaw', 30, rng, { moves: ['ember_spit'] });
  a.currentHp = 5;
  const foe = mk('nibbet', 5, rng, { moves: ['brace'] });
  let potions = 2;
  const bag = {
    has: (id) => id === 'potion' && potions > 0,
    take: (id) => { if (id === 'potion' && potions > 0) { potions--; return true; } return false; },
  };
  const battle = new Battle({ playerParty: [a], foeParty: [foe], isWild: true, seed: 'item', bag });
  battle.begin();
  battle.takeTurn({ kind: 'item', item: 'potion', partyIndex: 0 }, { kind: 'move', index: 0 });
  assert.ok(a.currentHp > 5);
  assert.equal(potions, 1);
});

test('a capture ends the battle and consumes the vessel', () => {
  const rng = new Rng('battle-capture');
  const a = mk('cinderpaw', 30, rng, { moves: ['ember_spit'] });
  const wild = mk('nibbet', 5, rng, { moves: ['brace'] });
  wild.currentHp = 1;
  wild.status = 'sleep';
  let vessels = 30;
  const bag = {
    has: () => vessels > 0,
    take: () => { vessels--; return true; },
  };
  const battle = new Battle({ playerParty: [a], foeParty: [wild], isWild: true, seed: 'cap', bag });
  battle.begin();
  // Nibbet has a 255 catch rate: at 1 HP and asleep this is guaranteed.
  const events = battle.takeTurn({ kind: 'item', item: 'field_vessel' }, { kind: 'move', index: 0 });
  const throwEvent = events.find((e) => e.t === 'throwVessel');
  assert.ok(throwEvent);
  assert.equal(throwEvent.caught, true);
  assert.equal(battle.result, 'caught');
  assert.equal(vessels, 29);
});

test('capture is refused in a trainer battle', () => {
  const rng = new Rng('battle-nocapture');
  const a = mk('cinderpaw', 30, rng, { moves: ['ember_spit'] });
  const foe = mk('nibbet', 5, rng, { moves: ['brace'] });
  const trainer = {
    id: 't', name: 'Test', className: 'Tester', sprite: 'villager_m', ai: 'novice',
    payout: 10, party: [], intro: ['x'], defeat: ['y'], victory: ['z'],
  };
  const bag = { has: () => true, take: () => true };
  const battle = new Battle({ playerParty: [a], foeParty: [foe], foeTrainer: trainer, isWild: false, seed: 'nc', bag });
  battle.begin();
  const events = battle.takeTurn({ kind: 'item', item: 'field_vessel' }, { kind: 'move', index: 0 });
  assert.ok(!events.some((e) => e.t === 'throwVessel'));
});

test('winning a trainer battle awards prize money and plays the defeat lines', () => {
  const rng = new Rng('battle-prize');
  const a = mk('volcatrix', 60, rng, { moves: ['kilnburst'] });
  const foe = mk('nibbet', 5, rng, { moves: ['brace'] });
  const trainer = {
    id: 't2', name: 'Madden', className: 'Hiker', sprite: 'hiker', ai: 'novice',
    payout: 40, party: [], intro: ['Up we go.'], defeat: ['Down I go.'], victory: ['Ha!'],
  };
  const { battle } = autoBattle([a], [foe], 'prize', { foeTrainer: trainer, isWild: false });
  assert.equal(battle.result, 'win');
  assert.equal(battle.prize, 40 * 5);
});

test('fainting awards experience only to participants', () => {
  const rng = new Rng('battle-exp');
  const fighter = mk('volcatrix', 50, rng, { moves: ['kilnburst'] });
  const bench = mk('sprigling', 5, rng, { moves: ['brace'] });
  const foe = mk('nibbet', 10, rng, { moves: ['brace'] });
  const benchExpBefore = bench.exp;
  const fighterExpBefore = fighter.exp;
  const battle = new Battle({ playerParty: [fighter, bench], foeParty: [foe], isWild: true, seed: 'exp' });
  battle.begin();
  battle.takeTurn({ kind: 'move', index: 0 }, { kind: 'move', index: 0 });
  assert.ok(foe.fainted, 'the foe should have fainted');
  assert.ok(fighter.exp > fighterExpBefore);
  assert.equal(bench.exp, benchExpBefore);
});

test('a battle always terminates and leaves exactly one side standing', () => {
  const rng = new Rng('battle-terminate');
  for (let i = 0; i < 60; i++) {
    const ids = [...registry.species.keys()];
    const pick = () => mk(rng.pick(ids), rng.int(15, 45), rng);
    const p = [pick(), pick(), pick()];
    const f = [pick(), pick(), pick()];
    const { battle, turns } = autoBattle(p, f, `term-${i}`, { maxTurns: 400 });
    assert.ok(battle.over, `battle ${i} did not finish in ${turns} turns`);
    assert.ok(['win', 'loss'].includes(battle.result), `battle ${i} ended as ${battle.result}`);
    const playerAlive = p.some((k) => !k.fainted);
    const foeAlive = f.some((k) => !k.fainted);
    assert.notEqual(playerAlive, foeAlive, `battle ${i} left both or neither side alive`);
    // HP must never go negative or exceed the maximum.
    for (const k of [...p, ...f]) {
      assert.ok(k.currentHp >= 0 && k.currentHp <= k.maxHp, `${k.name} HP ${k.currentHp}/${k.maxHp}`);
    }
  }
});

test('battles are reproducible from a seed', () => {
  const setup = (seed) => {
    const rng = new Rng('repro');
    return autoBattle(
      [mk('blazelynx', 30, rng), mk('brookmaw', 30, rng)],
      [mk('cairnling', 30, rng), mk('kestrelle', 30, rng)],
      seed,
    );
  };
  const a = setup('same-seed');
  const b = setup('same-seed');
  assert.equal(a.turns, b.turns);
  assert.equal(a.battle.result, b.battle.result);
  assert.deepEqual(
    a.battle.player.party.map((k) => k.currentHp),
    b.battle.player.party.map((k) => k.currentHp),
  );
});

/* ------------------------------------------------------------------ AI */

test('an elite trainer reliably beats a novice with identical teams', () => {
  let eliteWins = 0;
  const N = 40;
  for (let i = 0; i < N; i++) {
    const rng = new Rng(`ai-${i}`);
    const team = () => [
      mk('blazelynx', 32, rng), mk('brookmaw', 32, rng), mk('cairnling', 32, rng),
    ];
    // The elite side plays the 'player' seat here purely as a harness detail.
    const { battle } = autoBattle(team(), team(), `ai-${i}`, {
      playerTier: 'elite', foeTier: 'novice',
    });
    if (battle.result === 'win') eliteWins++;
  }
  const rate = eliteWins / N;
  assert.ok(rate >= 0.65, `elite only won ${(rate * 100).toFixed(0)}% of the time`);
});

test('the AI takes an available kill instead of setting up', () => {
  const rng = new Rng('ai-kill');
  const attacker = mk('blazelynx', 40, rng, { moves: ['howl', 'kilnburst'] });
  const victim = mk('sprigling', 20, rng, { moves: ['brace'] });
  victim.currentHp = 1;
  const battle = new Battle({ playerParty: [victim], foeParty: [attacker], isWild: false, seed: 'kill' });
  battle.begin();
  const ai = new TrainerAI('veteran', rng);
  const action = ai.choose(battle, 'foe');
  assert.equal(action.kind, 'move');
  assert.equal(attacker.moves[action.index].id, 'kilnburst');
});

test('the AI does not pick a move the target is immune to', () => {
  const rng = new Rng('ai-immune');
  const attacker = mk('fizzlet', 40, rng, { moves: ['arcjolt', 'quickstep'] });
  const ground = mk('burrowen', 40, rng, { moves: ['brace'] });
  const battle = new Battle({ playerParty: [ground], foeParty: [attacker], isWild: false, seed: 'aimm' });
  battle.begin();
  const ai = new TrainerAI('elite', rng);
  for (let i = 0; i < 10; i++) {
    const action = ai.choose(battle, 'foe');
    assert.notEqual(attacker.moves[action.index].id, 'arcjolt');
  }
});

test('a veteran AI switches away from a hopeless matchup', () => {
  const rng = new Rng('ai-switch');
  // A Verdant wall facing a Flame sweeper should want to leave.
  const trapped = mk('sprigling', 30, rng, { moves: ['vinewhip'] });
  const better = mk('currentail', 30, rng, { moves: ['breakwater'] });
  const threat = mk('blazelynx', 30, rng, { moves: ['kilnburst'] });
  const battle = new Battle({
    playerParty: [threat], foeParty: [trapped, better], isWild: false, seed: 'aisw',
  });
  battle.begin();
  const ai = new TrainerAI('elite', rng);
  let switched = 0;
  for (let i = 0; i < 20; i++) {
    const action = ai.choose(battle, 'foe');
    if (action.kind === 'switch' && action.partyIndex === 1) switched++;
  }
  assert.ok(switched > 10, `elite AI only switched ${switched}/20 times out of a losing matchup`);
});
