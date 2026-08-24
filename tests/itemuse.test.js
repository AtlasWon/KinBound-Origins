/**
 * Regression: using something out of the bag has to be an event the battle
 * scene can perform.
 *
 * Nothing happened when you used a potion. The engine emitted `useItem`, the
 * scene's event mapper had no case for it, and it fell through `default` -- so
 * the whole of "use an item" was a line of text and a bar quietly filling. The
 * scene now animates it, and what it animates is these events, in this order:
 * the `useItem` first and the line that names it immediately after, because the
 * scene lifts that line out and plays it in FRONT of the effect (the same trick
 * it uses for moves and send-outs, and for the same reason -- the light has to
 * arrive after you have been told what you used).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, registry } from './helpers/loadRegistry.js';
import { Rng } from '../build/js/core/rng.js';
import { createKin } from '../build/js/systems/kin.js';
import { Battle } from '../build/js/battle/battle.js';

loadRegistry();

function battleWith(seed = 'items') {
  const rng = new Rng(seed);
  const a = createKin('cinderpaw', 30, rng, { originalTrainer: 'p' });
  const b = createKin('sprigling', 30, rng, { originalTrainer: 'p' });
  const bag = { has: () => true, take: () => true };
  const battle = new Battle({
    playerParty: [a, b], foeParty: [createKin('menhir', 30, rng)],
    isWild: true, seed, bag,
  });
  battle.begin();
  battle.drainEvents();
  return { battle, a, b };
}

test('a potion announces itself, and announces itself second', () => {
  const { battle, a } = battleWith();
  a.currentHp = Math.max(1, Math.floor(a.maxHp * 0.3));

  const events = battle.takeTurn(
    { kind: 'item', item: 'potion', partyIndex: 0 },
    { kind: 'move', index: 0 },
  );
  const i = events.findIndex((e) => e.t === 'useItem');
  assert.ok(i >= 0, 'the engine said an item was used');
  assert.equal(events[i].item, 'potion');
  assert.equal(events[i].kin, a, 'and which kin it was used on');
  assert.equal(events[i + 1]?.t, 'message',
    'the line naming the item follows the event, which is what lets the scene '
    + 'play it in front of the effect');
  assert.ok(events.some((e) => e.t === 'heal' && e.kin === a));
});

test('every item a player can reach for in battle produces something to perform', () => {
  const silent = [];
  for (const [id, item] of registry.items) {
    if (!item.usableInBattle) continue;
    const { battle } = battleWith('bag:' + id);
    battle.player.active.currentHp = Math.max(1, Math.floor(battle.player.active.maxHp * 0.4));
    battle.player.active.status = 'poison';
    const events = battle.takeTurn(
      { kind: 'item', item: id, partyIndex: 0 },
      { kind: 'move', index: 0 },
    );
    // A vessel is its own performance -- throwVessel, with the whole capture
    // sequence hanging off it. Everything else goes through useItem.
    const performed = events.some((e) => e.t === 'useItem' || e.t === 'throwVessel');
    if (!performed) silent.push(id);
  }
  assert.deepEqual(silent, [],
    'these can be used in a battle and nothing on screen would say so');
});

test('the flavours the scene draws cover every battle item', () => {
  // The scene picks its palette and its direction off the item's own effects.
  // Anything whose effects it does not recognise falls back to the cure look,
  // which is only right for a status item -- so nothing usable in battle should
  // be relying on that fallback by accident.
  const known = new Set(['healHp', 'healStatus', 'revive', 'battleStat', 'catch']);
  const strays = [];
  for (const [id, item] of registry.items) {
    if (!item.usableInBattle) continue;
    for (const eff of item.effects ?? []) {
      if (!known.has(eff.kind)) strays.push(`${id}:${eff.kind}`);
    }
  }
  assert.deepEqual(strays, []);
});
