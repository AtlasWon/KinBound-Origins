/**
 * Sound library integrity.
 *
 * A missing sound id fails silently at runtime -- the game just goes quiet in
 * one spot, which is exactly the kind of bug nobody files and everybody feels.
 * These tests make a typo a build failure instead.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const { SFX, SFX_IDS } = await import('../build/js/audio/sfx.js');

/** Every .ts file under src/, so the scan cannot miss a new caller. */
function sources(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (name.endsWith('.ts')) out.push(path);
  }
  return out;
}

const files = sources('src');

test('every sound played by name exists in the library', () => {
  const missing = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    // Only literal ids can be checked; computed ones are covered separately.
    for (const m of text.matchAll(/playSfx\(\s*'([a-z0-9_]+)'/g)) {
      if (!SFX[m[1]]) missing.push(`${file}: ${m[1]}`);
    }
  }
  assert.deepEqual(missing, [], `unknown sound ids:\n${missing.join('\n')}`);
});

test('every move animation maps to a sound that exists', async () => {
  // sfxForAnim lives in the battle scene; exercise it through the move data so
  // a new animation id cannot quietly land on a sound nobody wrote.
  const moves = JSON.parse(readFileSync('data/moves/moves.json', 'utf8'));
  const list = Array.isArray(moves) ? moves : moves.moves;
  const battle = readFileSync('src/scenes/battle.ts', 'utf8');
  const fn = battle.slice(battle.indexOf('function sfxForAnim'), battle.indexOf('/* ----------------------------------------------------------- layout */'));

  const ids = new Set();
  for (const m of fn.matchAll(/return '([a-z0-9_]+)'/g)) ids.add(m[1]);
  assert.ok(ids.size > 5, 'expected sfxForAnim to name several sounds');

  const unknown = [...ids].filter((id) => !SFX[id]);
  assert.deepEqual(unknown, [], `sfxForAnim returns ids with no recipe: ${unknown}`);
  assert.ok(list.length > 0);
});

test('every terrain step tag has a matching footstep sound', () => {
  const terrain = readFileSync('src/world/terrain.ts', 'utf8');
  const tags = new Set();
  for (const m of terrain.matchAll(/step:\s*'([a-z]+)'/g)) tags.add(m[1]);
  assert.ok(tags.size > 0, 'expected terrain to declare step sounds');

  const missing = [...tags].filter((tag) => !SFX[`step_${tag}`]);
  assert.deepEqual(missing, [], `terrain steps with no sound: ${missing}`);
});

test('recipes are well formed', () => {
  for (const id of SFX_IDS) {
    const layers = SFX[id];
    assert.ok(Array.isArray(layers) && layers.length > 0, `${id} has no layers`);
    for (const l of layers) {
      assert.ok(l.dur > 0 && l.dur <= 1.2, `${id}: duration ${l.dur} out of range`);
      assert.ok(l.freq >= 20 && l.freq <= 12000, `${id}: frequency ${l.freq} out of range`);
      // Loud effects clip once several layers stack on the same bus.
      assert.ok(l.vol > 0 && l.vol <= 0.3, `${id}: volume ${l.vol} out of range`);
      assert.ok(['pulse', 'triangle', 'noise'].includes(l.kind), `${id}: bad kind ${l.kind}`);
      if (l.duty !== undefined) assert.ok(l.duty > 0 && l.duty < 1, `${id}: bad duty`);
    }
    // A stack that would run past a second is a sound, not an effect.
    const end = Math.max(...layers.map((l) => (l.at ?? 0) + l.dur));
    assert.ok(end <= 1.3, `${id} runs for ${end.toFixed(2)}s`);
  }
});

test('the menu, battle and field sounds a player hears constantly are quiet', () => {
  // These fire many times a minute; anything loud here becomes fatiguing fast.
  for (const id of ['select', 'step_grass', 'step_stone', 'step_wood', 'step_sand', 'talk', 'talk_low', 'talk_high', 'exp_tick']) {
    const peak = Math.max(...SFX[id].map((l) => l.vol));
    assert.ok(peak <= 0.16, `${id} is too loud at ${peak}`);
  }
});
