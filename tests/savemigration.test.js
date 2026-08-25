/**
 * Saves written before the Caelora rename.
 *
 * A version 1 save names `marrow_hollow`, `vess_station`, `ashgate_waystation`
 * and flags like `seal_1_taken`. None of those exist any more. Loading one
 * untouched drops the player into a failed fetch and a black screen, which is
 * the single worst thing a rename can do, so save.ts migrates every id-shaped
 * string on the way in.
 *
 * Version 2 to 3 is chained on the end of the same fixture: Ashgate was rebuilt
 * as Briarbell when the first Kin Hall was put in it, so `ashgate_waystation`
 * has to survive two hops -- to `ashgate_clinic` and then to `briarbell_clinic`.
 *
 * The strongest assertion here is the last one: every map id the migrated save
 * names has to exist on disk. That check keeps working when somebody renames a
 * map again later and forgets this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { loadRegistry } from './helpers/loadRegistry.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

loadRegistry();

/** A minimal localStorage, because save.ts talks to the browser's. */
function installStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  return store;
}

function legacySave() {
  return {
    version: 1,
    header: {
      slot: 1, name: 'AVEN', playTime: 900, seals: 2,
      vellumCaught: 7, savedAt: 1, mapName: 'Marrow Hollow',
    },
    state: {
      version: 1,
      playerName: 'AVEN',
      money: 3000,
      currentMap: 'vess_station', currentX: 8, currentY: 9, currentFacing: 'up',
      respawnMap: 'ashgate_waystation', respawnX: 4, respawnY: 5,
      flags: [
        'got_starter', 'met_perrin', 'perrin_first_done',
        'seal_1_taken', 'seal_2_taken',
        'item_mh_potion', 'item_mh_hidden', 'ways_met',
        'bastion1_gate_open', 'mom_sendoff',
      ],
      vars: [['act', 1], ['kellowmere_bastion_plates', 3]],
      visited: [
        'marrow_house_up', 'marrow_house_player', 'marrow_hollow', 'vess_station',
        'route_1', 'ashgate', 'ashgate_waystation', 'kellowmere',
        'kellowmere_bastion', 'brackwater_waystation_up',
      ],
      defeatedTrainers: ['perrin_first_rilltail', 'bastion1_roxen', 'r1_madden'],
      seals: [1, 2],
      inventory: [{ item: 'potion', count: 3 }],
      party: [{ species: 'sprigling', level: 8, metAt: 'vess_station', metLevel: 5 }],
      boxes: [[{ species: 'nibbet', level: 3, metAt: 'marrow_hollow', metLevel: 3 }]],
      seen: ['sprigling'],
      caught: ['sprigling'],
      playTime: 900,
    },
  };
}

async function loadLegacy() {
  const store = installStorage();
  store.set('kinbound.save.1', JSON.stringify(legacySave()));
  const save = await import('../build/js/systems/save.js');
  return { save, store, loaded: save.load(1) };
}

test('a pre-rename save loads, and lands somewhere that exists', async () => {
  const { loaded } = await loadLegacy();
  assert.ok(loaded, 'the save was refused rather than migrated');
  const s = loaded.state;

  assert.equal(s.currentMap, 'sorrell_lab');
  assert.equal(s.respawnMap, 'briarbell_clinic');

  const onDisk = new Set(
    readdirSync(resolve(ROOT, 'data/maps')).map((f) => f.slice(0, -5)),
  );
  const named = [s.currentMap, s.respawnMap, ...s.toJSON().visited,
    ...s.party.map((k) => k.metAt)];
  const missing = named.filter((m) => m && !onDisk.has(m));
  assert.deepEqual(missing, [], `the save names maps that do not exist: ${missing.join(', ')}`);
});

test('story flags, variables and defeated trainers come across', async () => {
  const { loaded } = await loadLegacy();
  const flags = loaded.state.toJSON().flags;

  assert.ok(flags.includes('met_tarin'), 'met_perrin did not become met_tarin');
  assert.ok(flags.includes('tarin_first_done'));
  assert.ok(flags.includes('crest_1_taken'));
  assert.ok(flags.includes('item_hm_potion'));
  assert.ok(flags.includes('clinic_met'));
  assert.ok(flags.includes('hall1_gate_open'));
  assert.ok(!flags.some((f) => /perrin|seal_|item_mh_|ways_met|bastion/.test(f)),
    `an old flag survived: ${flags.join(', ')}`);

  // Two renames deep: bastion -> hall in v2, Kellowmere -> Stonewake in v4, and
  // the Stone Hall's plates moved down into the workings with the challenge.
  const vars = Object.fromEntries(loaded.state.toJSON().vars);
  assert.equal(vars.stonewake_mine_plates, 3);
  assert.equal(vars.kellowmere_hall_plates, undefined);

  const beaten = loaded.state.toJSON().defeatedTrainers;
  assert.ok(beaten.includes('tarin_first_rilltail'));
  assert.ok(beaten.includes('hall1_roxen'));
});

test('earned seals become earned Bond Crests, in the state and the header', async () => {
  const { save, loaded } = await loadLegacy();
  assert.equal(loaded.state.crestCount, 2);
  assert.deepEqual([...loaded.state.crests].sort(), [1, 2]);

  // The select screen reads headers without touching the state.
  const header = save.readHeader(1);
  assert.equal(header.crests, 2);
  assert.equal(header.mapName, 'Hearthmere');
});

test('migrating never rewrites the stored save', async () => {
  const { store } = await loadLegacy();
  const raw = JSON.parse(store.get('kinbound.save.1'));
  assert.equal(raw.version, 1, 'the migration wrote itself back over the original');
});
