/**
 * Loads the on-disk content into the registry for headless tests.
 * The game does this over fetch; tests read the same files from disk so that a
 * data error is caught by the test suite rather than in the browser.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry } from '../../build/js/data/registry.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function json(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));
}

let loaded = false;

export function loadRegistry() {
  if (loaded) return registry;

  registry.typeChart = json('data/region/types.json');
  for (const s of json('data/creatures/species.json')) {
    registry.species.set(s.id, s);
    registry.speciesByNum.set(s.num, s);
  }
  for (const m of json('data/moves/moves.json')) registry.moves.set(m.id, m);
  for (const i of json('data/items/items.json')) registry.items.set(i.id, i);
  for (const a of json('data/creatures/abilities.json')) registry.abilities.set(a.id, a);
  registry.natures = json('data/creatures/natures.json');

  loaded = true;
  return registry;
}

export { registry, json, ROOT };
