// Generates data/manifest.json from what is actually on disk, so the game
// never probes for files that do not exist (each miss is a wasted request and
// a console error). Run after adding or removing any content file.
import { readdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
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

const out = join(DATA, 'manifest.json');
const lists = {
  maps: listIds('maps'),
  dialogue: listIds('dialogue'),
  events: listIds('events'),
  encounters: listIds('encounters'),
};

/**
 * Keep the old timestamp when nothing actually changed.
 *
 * Stamping a fresh time on every run makes this file differ from git every
 * time the tool is invoked, whether or not any content moved. That is noise in
 * every diff, and it makes "is the manifest up to date?" impossible to answer
 * with `git diff --exit-code` -- which is exactly the check CI wants to run.
 */
let previous = null;
try {
  previous = JSON.parse(readFileSync(out, 'utf8'));
} catch {
  // No manifest yet, or an unreadable one: write a fresh one below.
}

const unchanged = previous
  && Object.keys(lists).every((k) => JSON.stringify(previous[k]) === JSON.stringify(lists[k]));

const manifest = {
  generated: unchanged ? previous.generated : new Date().toISOString(),
  ...lists,
};

writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest:',
  manifest.maps.length, 'maps,',
  manifest.dialogue.length, 'dialogue,',
  manifest.events.length, 'events,',
  manifest.encounters.length, 'encounter tables',
  unchanged ? '(unchanged)' : '(updated)');
