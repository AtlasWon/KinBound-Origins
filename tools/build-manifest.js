// Generates data/manifest.json from what is actually on disk, so the game
// never probes for files that do not exist (each miss is a wasted request and
// a console error). Run after adding or removing any content file.
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');

const listIds = (sub) => {
  const dir = join(DATA, sub);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort();
};

const manifest = {
  generated: new Date().toISOString(),
  maps: listIds('maps'),
  dialogue: listIds('dialogue'),
  events: listIds('events'),
  encounters: listIds('encounters'),
};

writeFileSync(join(DATA, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest:',
  manifest.maps.length, 'maps,',
  manifest.dialogue.length, 'dialogue,',
  manifest.events.length, 'events,',
  manifest.encounters.length, 'encounter tables');
