import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, registry, json } from './helpers/loadRegistry.js';
import { Rng } from '../build/js/core/rng.js';
import { createKin } from '../build/js/systems/kin.js';
import { GameState, formatPlayTime } from '../build/js/systems/state.js';

loadRegistry();

function populated() {
  const rng = new Rng('state-fixture');
  const s = new GameState();
  s.playerName = 'PERRIN';
  s.money = 4820;
  s.currentMap = 'route_1';
  s.currentX = 14;
  s.currentY = 18;
  s.currentFacing = 'left';
  s.respawnMap = 'ashgate_waystation';
  s.respawnX = 6;
  s.respawnY = 7;
  s.setFlag('got_starter');
  s.setFlag('ag_gate_asked');
  s.setVar('turning_progress', 3);
  s.visitMap('marrow_hollow');
  s.visitMap('route_1');
  s.markDefeated('r1_madden');
  s.giveArt('clear');
  s.giveSeal(1);
  s.giveItem('potion', 4);
  s.giveItem('field_vessel', 12);
  s.playTime = 3725;

  const lead = createKin('cinderpaw', 17, rng, { originalTrainer: 'player', nickname: 'Ash' });
  lead.currentHp = 12;
  lead.status = 'burn';
  lead.moves[0].pp = 3;
  lead.gainEvs({ spe: 40 });
  s.addKin(lead);
  s.addKin(createKin('pipwing', 12, rng, { originalTrainer: 'player' }));
  s.boxes[0][5] = createKin('nibbet', 6, rng, { originalTrainer: 'player' });
  s.boxNames[0] = 'KEEPERS';
  return s;
}

test('a full game state survives a save and load round trip', () => {
  const before = populated();
  const json = JSON.parse(JSON.stringify(before.toJSON()));
  const after = GameState.fromJSON(json);

  assert.equal(after.playerName, 'PERRIN');
  assert.equal(after.money, 4820);
  assert.equal(after.currentMap, 'route_1');
  assert.equal(after.currentX, 14);
  assert.equal(after.currentY, 18);
  assert.equal(after.currentFacing, 'left');
  assert.equal(after.respawnMap, 'ashgate_waystation');

  assert.equal(after.hasFlag('got_starter'), true);
  assert.equal(after.hasFlag('never_set'), false);
  assert.equal(after.getVar('turning_progress'), 3);
  assert.equal(after.hasVisited('route_1'), true);
  assert.equal(after.hasDefeated('r1_madden'), true);
  assert.equal(after.hasArt('clear'), true);
  assert.equal(after.sealCount, 1);
  assert.equal(after.itemCount('potion'), 4);
  assert.equal(after.itemCount('field_vessel'), 12);
  assert.equal(after.playTime, 3725);
});

test('party kin keep their identity, damage, status and PP across a save', () => {
  const before = populated();
  const after = GameState.fromJSON(JSON.parse(JSON.stringify(before.toJSON())));

  assert.equal(after.party.length, 2);
  const lead = after.party[0];
  assert.equal(lead.species, 'cinderpaw');
  assert.equal(lead.nickname, 'Ash');
  assert.equal(lead.name, 'Ash');
  assert.equal(lead.level, 17);
  assert.equal(lead.currentHp, 12);
  assert.equal(lead.status, 'burn');
  assert.equal(lead.moves[0].pp, 3);
  assert.equal(lead.evs.spe, before.party[0].evs.spe);
  assert.deepEqual(lead.ivs, before.party[0].ivs);
  assert.equal(lead.nature, before.party[0].nature);
  assert.equal(lead.maxHp, before.party[0].maxHp, 'stats must be identical after reload');
});

test('stored kin and box names survive a save', () => {
  const before = populated();
  const after = GameState.fromJSON(JSON.parse(JSON.stringify(before.toJSON())));
  assert.equal(after.boxNames[0], 'KEEPERS');
  assert.equal(after.boxes[0][5]?.species, 'nibbet');
  assert.equal(after.boxes[0][4], null);
  assert.equal(after.boxes.length, before.boxes.length);
});

test('the Vellum records what was seen and caught', () => {
  const s = new GameState();
  s.markSeen('pipwing');
  s.markCaught('nibbet');
  assert.equal(s.seen.has('pipwing'), true);
  assert.equal(s.caught.has('pipwing'), false);
  // Catching something implies having seen it.
  assert.equal(s.seen.has('nibbet'), true);
  assert.equal(s.caught.has('nibbet'), true);

  const after = GameState.fromJSON(JSON.parse(JSON.stringify(s.toJSON())));
  assert.equal(after.seen.size, 2);
  assert.equal(after.caught.size, 1);
});

test('the party caps at six and overflow goes to the Roost', () => {
  const rng = new Rng('overflow');
  const s = new GameState();
  for (let i = 0; i < 6; i++) {
    assert.equal(s.addKin(createKin('nibbet', 5, rng)), 'party');
  }
  assert.equal(s.party.length, 6);
  assert.equal(s.nextDestination(), 'storage');
  assert.equal(s.addKin(createKin('pipwing', 5, rng)), 'storage');
  assert.equal(s.party.length, 6);
  assert.equal(s.boxes[0][0]?.species, 'pipwing');
});

test('inventory add, spend and take behave at the edges', () => {
  const s = new GameState();
  s.giveItem('potion', 97);
  s.giveItem('potion', 10);
  assert.equal(s.itemCount('potion'), 99, 'stacks cap at 99');

  assert.equal(s.takeItem('potion', 200), false, 'cannot take more than held');
  assert.equal(s.itemCount('potion'), 99);
  assert.equal(s.takeItem('potion', 99), true);
  assert.equal(s.itemCount('potion'), 0);
  assert.equal(s.hasItem('potion'), false);
  assert.equal(s.takeItem('nothing_here'), false);

  s.money = 100;
  assert.equal(s.spend(150), false);
  assert.equal(s.money, 100);
  assert.equal(s.spend(60), true);
  assert.equal(s.money, 40);
});

test('healing the party clears damage, status and spent PP', () => {
  const rng = new Rng('heal');
  const s = new GameState();
  const k = createKin('cinderpaw', 20, rng);
  k.currentHp = 1;
  k.status = 'poison';
  k.moves[0].pp = 0;
  s.addKin(k);
  assert.equal(s.partyIsAlive, true);

  k.currentHp = 0;
  assert.equal(s.partyIsAlive, false);
  assert.equal(s.firstHealthyIndex(), -1);

  s.healParty();
  assert.equal(k.currentHp, k.maxHp);
  assert.equal(k.status, 'none');
  assert.equal(k.moves[0].pp, k.moves[0].maxPp);
  assert.equal(s.partyIsAlive, true);
});

test('play time formats as hours and minutes', () => {
  assert.equal(formatPlayTime(0), '0:00');
  assert.equal(formatPlayTime(59), '0:00');
  assert.equal(formatPlayTime(3600), '1:00');
  assert.equal(formatPlayTime(3725), '1:02');
  assert.equal(formatPlayTime(36000), '10:00');
});

test('a save header summarises the run', () => {
  const s = populated();
  const h = s.header(2, 'Route 1');
  assert.equal(h.slot, 2);
  assert.equal(h.name, 'PERRIN');
  assert.equal(h.seals, 1);
  assert.equal(h.mapName, 'Route 1');
  assert.equal(h.vellumCaught, s.caught.size);
  assert.ok(h.savedAt > 0);
});

test('loading a save written by a future version is refused rather than guessed at', () => {
  // fromJSON is tolerant of missing fields so old saves keep working.
  const minimal = GameState.fromJSON({ playerName: 'X' });
  assert.equal(minimal.playerName, 'X');
  assert.equal(minimal.money, 3000);
  assert.equal(minimal.party.length, 0);
  // A save with no position falls back to where a new game begins.
  assert.equal(minimal.currentMap, 'marrow_house_up');
});

test('every item referenced by a shop exists', () => {
  const shops = json('data/items/shops.json');
  for (const shop of shops) {
    assert.ok(shop.greeting.length > 0, `${shop.id} has no greeting`);
    for (const entry of shop.stock) {
      assert.ok(registry.items.has(entry.item), `${shop.id} sells unknown item ${entry.item}`);
      const item = registry.items.get(entry.item);
      assert.ok(item.price > 0, `${shop.id} sells ${entry.item} which has no price`);
    }
  }
});

test('every trainer fields a legal team', () => {
  const trainers = json('data/trainers/trainers.json');
  for (const t of trainers) {
    assert.ok(t.party.length >= 1 && t.party.length <= 6, `${t.id} has ${t.party.length} kin`);
    assert.ok(['novice', 'trained', 'veteran', 'keeper', 'elite'].includes(t.ai), `${t.id} ai`);
    assert.ok(t.payout > 0, `${t.id} payout`);
    assert.ok(t.intro.length && t.defeat.length && t.victory.length, `${t.id} is missing lines`);
    for (const mon of t.party) {
      assert.ok(registry.species.has(mon.species), `${t.id} uses unknown species ${mon.species}`);
      assert.ok(mon.level >= 1 && mon.level <= 100, `${t.id} level ${mon.level}`);
      for (const m of mon.moves ?? []) {
        assert.ok(registry.moves.has(m), `${t.id} uses unknown move ${m}`);
      }
    }
  }
});
