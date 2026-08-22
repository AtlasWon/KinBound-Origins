// Checks ASCII map files for ragged rows, unknown characters and broken warps.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAPDIR = join(ROOT, 'data', 'maps');

// Kept in step with TERRAIN in src/world/terrain.ts by hand; a character that
// is legal there and missing here fails the map rather than the tileset.
const LEGEND = new Set([...' .,*"-=~WsTtoO#wR[]^D|_!CcLfrIKSpBXx1234567890GghmbekAEVPJNQUF<%>()&jHMZdilnzquvy+?@$:/;aY']);

let problems = 0;
const ids = new Set();
const files = readdirSync(MAPDIR).filter((f) => f.endsWith('.json'));

for (const f of files) {
  const m = JSON.parse(readFileSync(join(MAPDIR, f), 'utf8'));
  ids.add(m.id);
  const rows = m.rows ?? [];
  const widths = new Set(rows.map((r) => r.length));
  if (widths.size !== 1) {
    problems++;
    console.log(`RAGGED ${f}: row widths ${[...widths].join(', ')}`);
    const target = rows.length ? rows[0].length : 0;
    rows.forEach((r, i) => {
      if (r.length !== target) console.log(`   row ${i}: ${r.length} (expected ${target}) | ${r}`);
    });
  }
  const bad = new Set();
  for (const r of rows) for (const ch of r) if (!LEGEND.has(ch)) bad.add(ch);
  if (bad.size) { problems++; console.log(`BADCHAR ${f}: ${[...bad].map((c) => JSON.stringify(c)).join(' ')}`); }

  const w = rows.length ? rows[0].length : 0, h = rows.length;
  for (const warp of m.warps ?? []) {
    if (warp.x < 0 || warp.y < 0 || warp.x >= w || warp.y >= h) {
      problems++; console.log(`WARP-OOB ${f}: warp at ${warp.x},${warp.y} outside ${w}x${h}`);
    }
  }
  for (const npc of m.npcs ?? []) {
    if (npc.x < 0 || npc.y < 0 || npc.x >= w || npc.y >= h) {
      problems++; console.log(`NPC-OOB ${f}: ${npc.id} at ${npc.x},${npc.y}`);
    }
  }
  console.log(`ok ${f}  ${w}x${h}  warps:${(m.warps??[]).length} npcs:${(m.npcs??[]).length} objs:${(m.objects??[]).length}`);
}

// Second pass: warp targets must exist.
for (const f of files) {
  const m = JSON.parse(readFileSync(join(MAPDIR, f), 'utf8'));
  for (const warp of m.warps ?? []) {
    if (!ids.has(warp.toMap)) {
      console.log(`WARP-MISSING ${f}: -> ${warp.toMap} (map does not exist yet)`);
    }
  }
}

console.log(problems === 0 ? '\nAll maps structurally valid.' : `\n${problems} structural problem(s).`);
process.exit(problems === 0 ? 0 : 1);
