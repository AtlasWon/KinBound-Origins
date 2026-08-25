/**
 * Regression: handing control back after a battle.
 *
 * The game-breaking version of this was losing the first fight in
 * Hearthmere. That script is authored `onLoss: "continue"` -- Tarin commiserates
 * and the scene walks the player home to be patched up -- but the overworld ran
 * its standard blackout on every loss regardless. Two owners then drove the
 * field at once: the blackout held `busy` until its own fade called back, and
 * the script fell through to its `warp`. The overworld keeps exactly one fade,
 * so the second one to start overwrote the first, completion callback and all.
 * When the warp won, nothing was left to clear `busy` and the player could
 * never move again.
 *
 * The invariant these tests pin down: a scripted battle that declares
 * `onLoss: "continue"` must tell the overworld not to blackout, and the event
 * VM really does keep running after such a loss (which is what makes the
 * overlap possible in the first place).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, registry } from './helpers/loadRegistry.js';
import { OverworldEventHost } from '../build/js/scenes/eventHost.js';
import { EventRunner } from '../build/js/systems/eventvm.js';

loadRegistry();

registry.trainers.set('test_rival', {
  id: 'test_rival',
  name: 'Rival',
  className: 'Rival',
  ai: 'novice',
  prize: 100,
  intro: [],
  defeat: [],
  afterward: [],
  party: [{ species: 'sprigling', level: 5 }],
});

/** Just enough of the overworld for the host to talk to. */
function stubScene() {
  return {
    calls: [],
    map: { id: 'test_map', music: 'none', weather: undefined, battleBackdrop: 'grass' },
    state: {},
    startBattle(_game, opts) { this.calls.push(opts); },
  };
}

const stubGame = { rng: { int: () => 1, chance: () => false, pick: (a) => a[0], next: () => 0.5 } };

test('a scripted battle that says onLoss:continue asks the overworld not to blackout', () => {
  const scene = stubScene();
  const host = new OverworldEventHost(stubGame, scene);
  host.battleTrainer('test_rival', 'continue', () => {});

  assert.equal(scene.calls.length, 1);
  assert.equal(scene.calls[0].noWhiteout, true,
    'the script owns the field after this loss; the blackout must stay out of it');
});

test('an ordinary scripted battle still blacks out on a loss', () => {
  const scene = stubScene();
  const host = new OverworldEventHost(stubGame, scene);
  host.battleTrainer('test_rival', 'whiteout', () => {});

  assert.equal(scene.calls.length, 1);
  assert.ok(!scene.calls[0].noWhiteout,
    'nothing else is driving the field, so the blackout is the only thing that can');
});

test('the event VM carries on after an onLoss:continue defeat', () => {
  const seen = [];
  let resolveBattle;
  const host = {
    state: {
      setVar() {}, getVar: () => 0, setFlag() {}, hasFlag: () => false,
      addVar() {}, giveItem() {}, takeItem() {}, earn() {}, spend() {},
    },
    battleTrainer(_id, _onLoss, done) { resolveBattle = done; },
    say(lines, _who, done) { seen.push(lines[0]); done(); },
    script: () => undefined,
  };
  const vm = new EventRunner(host);
  vm.start({
    id: 'test', actions: [
      { kind: 'battleTrainer', trainer: 'test_rival', onLoss: 'continue' },
      { kind: 'say', lines: ['after the loss'] },
    ],
  });
  vm.update();
  assert.equal(seen.length, 0, 'the script waits for the battle');

  resolveBattle(false);
  vm.update();
  assert.deepEqual(seen, ['after the loss'],
    'a continue-loss keeps the script running -- so the overworld must not also take the field');
});

test('an onLoss:whiteout defeat stops the script dead', () => {
  const seen = [];
  let resolveBattle;
  const host = {
    state: {
      setVar() {}, getVar: () => 0, setFlag() {}, hasFlag: () => false,
      addVar() {}, giveItem() {}, takeItem() {}, earn() {}, spend() {},
    },
    battleTrainer(_id, _onLoss, done) { resolveBattle = done; },
    say(lines, _who, done) { seen.push(lines[0]); done(); },
    script: () => undefined,
  };
  const vm = new EventRunner(host);
  vm.start({
    id: 'test', actions: [
      { kind: 'battleTrainer', trainer: 'test_rival', onLoss: 'whiteout' },
      { kind: 'say', lines: ['never reached'] },
    ],
  });
  vm.update();
  resolveBattle(false);
  vm.update();
  assert.deepEqual(seen, [], 'the blackout owns the field, so the script must not run on');
  assert.equal(vm.running, false);
});

test('every authored onLoss:continue battle is one the blackout will skip', async () => {
  // The bug was reachable because exactly one script in the game asks for it.
  // If another is added, this test makes sure it goes through the same door.
  const { readdirSync, readFileSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const { ROOT } = await import('./helpers/loadRegistry.js');
  const dir = resolve(ROOT, 'data', 'events');
  let found = 0;
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    if (node.kind === 'battleTrainer' && node.onLoss === 'continue') found++;
    for (const v of Object.values(node)) walk(v);
  };
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    walk(JSON.parse(readFileSync(resolve(dir, f), 'utf8')));
  }
  assert.ok(found > 0, 'the first battle in Hearthmere is authored onLoss:continue');

  // And the host maps that flag through for every one of them.
  const scene = stubScene();
  new OverworldEventHost(stubGame, scene).battleTrainer('test_rival', 'continue', () => {});
  assert.equal(scene.calls[0].noWhiteout, true);
});
