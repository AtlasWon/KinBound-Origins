/**
 * The Tideheart.
 *
 * The object is worth locking down in tests because almost all of it is
 * invisible from any single file: the item lives in JSON, its name and
 * description are rewritten at runtime from story flags, and the reaction is
 * driven by the map the player is standing on rather than by a script. Any one
 * of those can quietly stop working without anything else noticing.
 *
 * The rule these protect, in order of how much it would hurt to break it:
 *
 *   1. The interface must NOT say "Tideheart" before the player has learned
 *      the name. Canon is explicit; a leak here spoils a Stage 2 beat, and it
 *      would leak silently.
 *   2. It must react to an Aurelian site, and stop reacting once answered.
 *   3. Sites belonging to unbuilt stages must be completely inert, so a
 *      half-built later stage cannot be walked into.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, registry, json } from './helpers/loadRegistry.js';
import { GameState } from '../build/js/systems/state.js';
import {
  TIDEHEART, TH_FLAGS, SITES, BUILT_STAGE, builtSites, siteForMap, siteById,
  echoFlag, readTideheart, refreshTideheart, NAMED_LABEL, UNNAMED_LABEL,
} from '../build/js/systems/tideheart.js';
import { audio } from '../build/js/audio/audio.js';

loadRegistry();
// Nothing in a test run may reach for the sound hardware.
audio.disable();

/** A player holding the object, standing wherever they are told. */
function holder(map = 'hearthmere') {
  const s = new GameState();
  s.giveItem(TIDEHEART, 1);
  s.setFlag(TH_FLAGS.given);
  s.currentMap = map;
  return s;
}

test('the item exists, is a key item, and cannot be sold or spent', () => {
  const item = json('data/items/items.json').find((i) => i.id === TIDEHEART);
  assert.ok(item, 'data/items/items.json defines the tideheart');
  assert.equal(item.category, 'key');
  assert.equal(item.consumable, false);
  assert.equal(item.price, 0);
  assert.equal(item.sellPrice, 0);
  assert.equal(item.usableInField, true, 'because using it opens its own screen');
});

test('the name on disk does not spoil the name', () => {
  const item = json('data/items/items.json').find((i) => i.id === TIDEHEART);
  assert.ok(!/tideheart/i.test(item.name),
    'the JSON default has to be the pre-name label, so the name cannot leak '
    + 'even if none of the runtime code ever runs');
  assert.ok(!/tideheart/i.test(item.description));
});

test('the interface calls it something else until the player learns the name', () => {
  const s = holder();
  assert.equal(readTideheart(s).label, UNNAMED_LABEL);
  assert.equal(registry.itemName(TIDEHEART), UNNAMED_LABEL);
  assert.equal(readTideheart(s).named, false);

  s.setFlag(TH_FLAGS.named);
  assert.equal(readTideheart(s).label, NAMED_LABEL);
  assert.equal(registry.itemName(TIDEHEART), NAMED_LABEL,
    'and the bag, the shop and every "you received" line follow from the '
    + 'registry entry rather than from a second copy of the rule');

  // Leave the shared registry as the rest of the suite expects to find it.
  s.setFlag(TH_FLAGS.named, false);
  refreshTideheart(s);
});

test('it is not in the reading at all when the player is not carrying it', () => {
  const s = new GameState();
  const r = readTideheart(s);
  assert.equal(r.held, false);
  assert.equal(r.site, null);
  assert.equal(r.stirring, false);
});

test('it stirs on an Aurelian site and says so in the bag as well as on its own screen', () => {
  const site = builtSites()[0];
  const s = holder('hearthmere');
  assert.equal(readTideheart(s).stirring, false, 'a village is not a ruin');
  const quiet = registry.getItem(TIDEHEART).description;
  const quietIcon = registry.getItem(TIDEHEART).icon;

  s.currentMap = site.maps[0];
  const r = readTideheart(s);
  assert.equal(r.site?.id, site.id);
  assert.equal(r.stirring, true);
  assert.ok(r.intensity > 0);
  assert.notEqual(registry.getItem(TIDEHEART).description, quiet,
    'the description is one of the three ways a player can notice');
  assert.notEqual(registry.getItem(TIDEHEART).icon, quietIcon,
    'and the row icon is another, so the bag looks different before it is opened');
});

test('answering a site quiets it and files the echo', () => {
  const site = builtSites()[0];
  const s = holder(site.maps[0]);
  assert.equal(readTideheart(s).echoes.length, 0);

  s.setFlag(echoFlag(site.id));
  const r = readTideheart(s);
  assert.equal(r.stirring, false, 'it has had its answer');
  assert.equal(r.echoes.length, 1);
  assert.equal(r.echoes[0].id, site.id);
  assert.ok(r.echoes[0].echo.lines.length > 0, 'and there is something to play back');
});

test('an echo survives a save and a load', () => {
  const site = builtSites()[0];
  const s = holder(site.maps[0]);
  s.setFlag(echoFlag(site.id));

  const back = GameState.fromJSON(JSON.parse(JSON.stringify(s.toJSON())));
  assert.ok(back.hasItem(TIDEHEART));
  assert.equal(readTideheart(back).echoes.length, 1);
  assert.equal(back.currentMap, site.maps[0], 'and loading lands on the same map');
});

test('sites above the built stage are completely inert', () => {
  for (const site of SITES) {
    if (site.stage <= BUILT_STAGE) continue;
    for (const map of site.maps) {
      assert.equal(siteForMap(map), null,
        `${site.id} is stage ${site.stage} and must not be reachable at stage ${BUILT_STAGE}`);
    }
    assert.equal(siteById(site.id), null);
  }
});

test('site ids are unique and usable as flag names', () => {
  const seen = new Set();
  for (const site of SITES) {
    assert.ok(!seen.has(site.id), `duplicate site id "${site.id}"`);
    seen.add(site.id);
    assert.match(site.id, /^[a-z0-9_]+$/,
      'a site id becomes part of a story flag, so it has to look like one');
    assert.ok(site.maps.length > 0, `${site.id} names no maps`);
    assert.ok(site.echo.lines.length > 0, `${site.id} has nothing to play back`);
  }
});

test('the shared scripts that hand it over and wake it are on disk', () => {
  const scripts = json('data/events/common.json');
  const byId = Object.fromEntries(scripts.map((s) => [s.id, s]));

  const gift = byId['tideheart_gift'];
  assert.ok(gift, 'Mira has a script to call');
  assert.ok(JSON.stringify(gift).includes('"tideheart"'), 'and it gives the object');

  // The safety net: if the gift is never wired in, walking out of the village
  // still puts the object in the player's hands rather than losing Act 1.
  const net = byId['tideheart_carried'];
  assert.ok(net, 'the fallback exists');
  assert.equal(net.trigger, 'enter');
  assert.ok(net.map, 'and it names the map it fires on');

  for (const site of builtSites()) {
    assert.ok(byId[`tideheart_wake_${site.id}`],
      `${site.id} has no stock wake script for its map's author to call`);
  }
});
