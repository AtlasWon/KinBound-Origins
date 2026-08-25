import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRegistry, registry } from './helpers/loadRegistry.js';

loadRegistry();

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(readFileSync(resolve(ROOT, rel), 'utf8'));
const listIds = (sub) => existsSync(resolve(ROOT, 'data', sub))
  ? readdirSync(resolve(ROOT, 'data', sub)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
  : [];

const MANIFEST = read('data/manifest.json');
const MAPS = Object.fromEntries(MANIFEST.maps.map((id) => [id, read(`data/maps/${id}.json`)]));
const ITEMS = new Set(read('data/items/items.json').map((i) => i.id));
const TRAINERS = Object.fromEntries(read('data/trainers/trainers.json').map((t) => [t.id, t]));
const SHOPS = new Set(read('data/items/shops.json').map((s) => s.id));

const ARTS = new Set(['clear', 'shoulder', 'kindle', 'wade', 'swim', 'updraft', 'delve', 'recall']);

/** Every script from every event file, flattened. */
function allScripts() {
  const out = [];
  for (const id of listIds('events')) {
    for (const s of read(`data/events/${id}.json`)) out.push({ file: id, script: s });
  }
  return out;
}

/** Walk a script's action tree, including nested if/ask/choice branches. */
function walkActions(actions, visit) {
  for (const a of actions ?? []) {
    visit(a);
    if (a.kind === 'if') { walkActions(a.then, visit); walkActions(a.else, visit); }
    if (a.kind === 'ask') { walkActions(a.yes, visit); walkActions(a.no, visit); }
    if (a.kind === 'choice') for (const o of a.options ?? []) walkActions(o.then, visit);
  }
}

/* ------------------------------------------------------------- manifest */

test('the manifest matches what is actually on disk', () => {
  for (const kind of ['maps', 'dialogue', 'events', 'encounters']) {
    assert.deepEqual(MANIFEST[kind], listIds(kind),
      `data/manifest.json is stale for "${kind}" - run tools/build-manifest.js`);
  }
});

/* ----------------------------------------------------------------- maps */

test('every warp points at a real map and a walkable tile', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    for (const warp of map.warps ?? []) {
      const target = MAPS[warp.toMap];
      assert.ok(target, `${id}: warp to unknown map "${warp.toMap}"`);
      const row = target.rows[warp.toY];
      assert.ok(row !== undefined,
        `${id}: warp lands on row ${warp.toY} of ${warp.toMap}, which has ${target.rows.length} rows`);
      const ch = row[warp.toX];
      assert.ok(ch !== undefined, `${id}: warp lands outside ${warp.toMap} at x=${warp.toX}`);
      // Landing inside a wall or a tree strands the player.
      assert.ok(!'TtoO#wR[]^|_!CcIK1234567890Ghmbek§¤«¬»°±÷¶µØÅÇ'.includes(ch),
        `${id}: warp lands on solid tile "${ch}" at ${warp.toX},${warp.toY} in ${warp.toMap}`);
    }
  }
});

test('every warp sits on a tile the player can actually stand on', () => {
  // The other direction of the warp check. A warp whose *source* tile is solid
  // can never fire, so whatever it leads to is unreachable -- and nothing else
  // in the suite notices, because the destination is perfectly valid. This is
  // exactly how Brackwater's Provisioner ended up walled off behind a window.
  const solid = 'TtoO#wR[]^|_!CcIK1234567890Ghmbek§¤«¬»°±÷¶µØÅÇ';
  for (const [id, map] of Object.entries(MAPS)) {
    // A tile that starts solid and is opened for good by a flag is a real
    // pattern the engine supports -- `cuttable` objects are cleared in
    // rebuildObstacles and stay cleared -- and a sealed door with a warp behind
    // it is exactly what it is for. Without this, no gated entrance could ever
    // carry a warp, which is not what this test is guarding against.
    const opened = new Set(
      (map.objects ?? [])
        .filter((o) => o.kind === 'cuttable' && o.flag)
        .map((o) => `${o.x},${o.y}`),
    );
    for (const warp of map.warps ?? []) {
      const row = map.rows[warp.y];
      assert.ok(row !== undefined, `${id}: warp at row ${warp.y}, outside the map`);
      const ch = row[warp.x];
      assert.ok(ch !== undefined, `${id}: warp at x=${warp.x}, outside the map`);
      if (opened.has(`${warp.x},${warp.y}`)) continue;
      assert.ok(!solid.includes(ch),
        `${id}: warp to ${warp.toMap} sits on solid tile "${ch}" at ${warp.x},${warp.y}, ` +
        'so the player can never reach it');
    }
  }
});

test('the world is one connected graph reachable from the starting town', () => {
  /*
   * Scripts move the player too, and the graph is wrong without them.
   *
   * An Aurelian site is entered by standing on a plate and letting the script
   * carry you down; a sealed gate is opened by a scene rather than by walking
   * through it. Counting only map warps reported four perfectly reachable
   * temple floors as orphans, which is a false alarm of exactly the kind this
   * suite exists to prevent -- so script warps are edges as well.
   */
  const scriptEdges = new Map();
  for (const { file, script } of allScripts()) {
    const from = script.map ?? file;
    walkActions(script.actions ?? [], (a) => {
      if (a.kind !== 'warp' || !a.map) return;
      if (!scriptEdges.has(from)) scriptEdges.set(from, new Set());
      scriptEdges.get(from).add(a.map);
    });
  }

  const seen = new Set(['hearthmere']);
  const queue = ['hearthmere'];
  while (queue.length) {
    const id = queue.shift();
    const targets = [
      ...(MAPS[id]?.warps ?? []).map((w) => w.toMap),
      ...(scriptEdges.get(id) ?? []),
    ];
    for (const toMap of targets) {
      if (!seen.has(toMap) && MAPS[toMap]) {
        seen.add(toMap);
        queue.push(toMap);
      }
    }
  }
  const unreachable = Object.keys(MAPS).filter((id) => !seen.has(id));
  assert.deepEqual(unreachable, [], `maps unreachable from Hearthmere: ${unreachable.join(', ')}`);
});

test('every door warp has a matching way back', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    for (const warp of map.warps ?? []) {
      if (warp.style !== 'door') continue;
      const back = (MAPS[warp.toMap].warps ?? []).some((b) => b.toMap === id);
      assert.ok(back, `${id}: door into ${warp.toMap} has no return warp`);
    }
  }
});

test('map objects reference real items and sit inside the map', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    const w = map.rows[0].length;
    const h = map.rows.length;
    for (const o of map.objects ?? []) {
      assert.ok(o.x >= 0 && o.x < w && o.y >= 0 && o.y < h,
        `${id}: object ${o.kind} at ${o.x},${o.y} is outside ${w}x${h}`);
      if (o.item) assert.ok(ITEMS.has(o.item), `${id}: object grants unknown item "${o.item}"`);
      if (o.kind === 'item' || o.kind === 'hiddenItem') {
        assert.ok(o.flag, `${id}: pickup at ${o.x},${o.y} has no flag, so it would respawn forever`);
      }
      if (o.kind === 'switch' || o.kind === 'pushable') {
        // A plate or a stone hidden under scenery cannot be used.
        const ch = map.rows[o.y][o.x];
        assert.ok(!'TtoO#wR[]^|_!CcI1234567890Ghmbek§¤«¬»°±÷¶µØÅÇ'.includes(ch),
          `${id}: ${o.kind} at ${o.x},${o.y} is on solid tile "${ch}"`);
      }
    }
    // Every pushable stone needs somewhere to go.
    const plates = (map.objects ?? []).filter((o) => o.kind === 'switch').length;
    const stones = (map.objects ?? []).filter((o) => o.kind === 'pushable').length;
    if (plates > 0) {
      assert.ok(stones >= plates, `${id}: ${plates} plates but only ${stones} stones`);
    }
  }
});

test('map NPCs reference real trainers and stand inside the map', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    const w = map.rows[0].length;
    const h = map.rows.length;
    const ids = new Set();
    for (const n of map.npcs ?? []) {
      assert.ok(!ids.has(n.id), `${id}: duplicate NPC id "${n.id}"`);
      ids.add(n.id);
      assert.ok(n.x >= 0 && n.x < w && n.y >= 0 && n.y < h,
        `${id}: NPC ${n.id} at ${n.x},${n.y} is outside ${w}x${h}`);
      if (n.trainer) {
        assert.ok(TRAINERS[n.trainer], `${id}: NPC ${n.id} references unknown trainer "${n.trainer}"`);
        assert.ok((n.sightRange ?? 0) >= 1, `${id}: trainer ${n.id} has no sight range`);
      }
    }
  }
});

/* --------------------------------------------------------------- events */

test('every event action references content that exists', () => {
  const scriptIds = new Set(allScripts().map((e) => e.script.id));
  for (const { file, script } of allScripts()) {
    assert.ok(script.id, `${file}: a script has no id`);
    assert.ok(['interact', 'step', 'enter', 'sight', 'call'].includes(script.trigger),
      `${file}/${script.id}: bad trigger "${script.trigger}"`);
    if (script.trigger === 'step') {
      assert.ok(script.at?.length, `${file}/${script.id}: step script lists no tiles`);
      assert.ok(script.map, `${file}/${script.id}: step script has no map`);
      assert.ok(MAPS[script.map], `${file}/${script.id}: step script names unknown map`);
      for (const t of script.at) {
        const row = MAPS[script.map].rows[t.y];
        assert.ok(row?.[t.x] !== undefined,
          `${file}/${script.id}: trigger tile ${t.x},${t.y} is outside ${script.map}`);
      }
    }

    walkActions(script.actions, (a) => {
      const where = `${file}/${script.id}: ${a.kind}`;
      if (a.kind === 'giveItem' || a.kind === 'takeItem') {
        assert.ok(ITEMS.has(a.item), `${where} references unknown item "${a.item}"`);
      }
      if (a.kind === 'battleTrainer') {
        assert.ok(TRAINERS[a.trainer], `${where} references unknown trainer "${a.trainer}"`);
      }
      if (a.kind === 'battleWild' || a.kind === 'giveKin') {
        assert.ok(registry.species.has(a.species), `${where} references unknown species "${a.species}"`);
      }
      if (a.kind === 'starterChoice') {
        for (const s of a.options) {
          assert.ok(registry.species.has(s), `${where} offers unknown starter "${s}"`);
        }
      }
      if (a.kind === 'openShop') {
        assert.ok(SHOPS.has(a.shop), `${where} opens unknown shop "${a.shop}"`);
      }
      if (a.kind === 'giveArt') {
        assert.ok(ARTS.has(a.art), `${where} grants unknown field art "${a.art}"`);
      }
      if (a.kind === 'giveCrest') {
        assert.ok(a.crest >= 1 && a.crest <= 8, `${where} grants crest ${a.crest}`);
      }
      if (a.kind === 'warp') {
        assert.ok(MAPS[a.map], `${where} warps to unknown map "${a.map}"`);
      }
      if (a.kind === 'call') {
        assert.ok(scriptIds.has(a.script), `${where} calls unknown script "${a.script}"`);
      }
      if (a.kind === 'say' || a.kind === 'ask' || a.kind === 'choice') {
        assert.ok(a.lines?.length, `${where} has no lines`);
        for (const line of a.lines) {
          assert.ok(line.length <= 120, `${where} has a very long line: "${line.slice(0, 40)}..."`);
        }
      }
    });
  }
});

test('scripts that move or remove an NPC name one that exists on that map', () => {
  // A script lives with its map, so the NPC it drives should be on that map.
  for (const { file, script } of allScripts()) {
    const map = MAPS[file];
    if (!map) continue;
    const npcIds = new Set([...(map.npcs ?? []).map((n) => n.id), 'player']);
    walkActions(script.actions, (a) => {
      if (a.kind === 'move' || a.kind === 'face' || a.kind === 'removeNpc') {
        const who = a.who;
        assert.ok(npcIds.has(who),
          `${file}/${script.id}: ${a.kind} names "${who}", who is not on map ${file}`);
      }
    });
  }
});

/* ------------------------------------------------------------- dialogue */

test('every NPC script resolves to either an event or a dialogue entry', () => {
  const scriptIds = new Set(allScripts().map((e) => e.script.id));
  const dialogueIds = new Set();
  for (const id of listIds('dialogue')) {
    for (const key of Object.keys(read(`data/dialogue/${id}.json`).entries ?? {})) {
      dialogueIds.add(key);
    }
  }

  const missing = [];
  for (const [mapId, map] of Object.entries(MAPS)) {
    for (const n of map.npcs ?? []) {
      // Trainers speak through their own trainer data.
      if (!n.script || n.trainer) continue;
      if (!scriptIds.has(n.script) && !dialogueIds.has(n.script)) {
        missing.push(`${mapId}/${n.id} -> "${n.script}"`);
      }
    }
  }
  assert.deepEqual(missing, [], `NPCs with no dialogue or event:\n  ${missing.join('\n  ')}`);
});

test('dialogue speakers are named for every NPC that has lines', () => {
  const speakers = new Set();
  for (const id of listIds('dialogue')) {
    for (const key of Object.keys(read(`data/dialogue/${id}.json`).speakers ?? {})) {
      speakers.add(key);
    }
  }
  // Not every NPC needs a name plate, but a named one must not be a typo:
  // every speaker key should match an NPC id somewhere in the world.
  const npcIds = new Set();
  for (const map of Object.values(MAPS)) for (const n of map.npcs ?? []) npcIds.add(n.id);
  const orphans = [...speakers].filter((s) => !npcIds.has(s));
  assert.deepEqual(orphans, [], `speaker names with no matching NPC: ${orphans.join(', ')}`);
});

/* ----------------------------------------------------------- encounters */

test('encounter tables reference real species and sane levels', () => {
  for (const id of listIds('encounters')) {
    const table = read(`data/encounters/${id}.json`);
    assert.ok(MAPS[table.mapId], `${id}: table names unknown map "${table.mapId}"`);
    for (const [method, m] of Object.entries(table.methods)) {
      assert.ok(m.slots.length > 0, `${id}/${method}: no slots`);
      let total = 0;
      for (const slot of m.slots) {
        assert.ok(registry.species.has(slot.species),
          `${id}/${method}: unknown species "${slot.species}"`);
        assert.ok(slot.minLevel >= 1 && slot.maxLevel <= 100 && slot.minLevel <= slot.maxLevel,
          `${id}/${method}: bad level range for ${slot.species}`);
        assert.ok(slot.weight > 0, `${id}/${method}: ${slot.species} has no weight`);
        total += slot.weight;
      }
      assert.equal(total, 100, `${id}/${method}: weights total ${total}, expected 100`);
      if (m.rate !== undefined) {
        assert.ok(m.rate > 0 && m.rate <= 400, `${id}/${method}: encounter rate ${m.rate}`);
      }
    }
  }
});

test('every map that declares an encounter table has one', () => {
  for (const [id, map] of Object.entries(MAPS)) {
    if (!map.encounterTable) continue;
    assert.ok(MANIFEST.encounters.includes(map.encounterTable),
      `${id}: declares encounter table "${map.encounterTable}" which does not exist`);
  }
});

/* -------------------------------------------------------- progression -- */

test('trainer levels rise along the intended route order', () => {
  const order = ['r1_', 'r2_', 'hall1_', 'r3_'];
  const peak = order.map((prefix) => {
    const levels = Object.values(TRAINERS)
      .filter((t) => t.id.startsWith(prefix))
      .flatMap((t) => t.party.map((m) => m.level));
    return levels.length ? Math.max(...levels) : 0;
  });
  for (let i = 1; i < peak.length; i++) {
    assert.ok(peak[i] >= peak[i - 1],
      `trainer levels drop from ${order[i - 1]} (${peak[i - 1]}) to ${order[i]} (${peak[i]})`);
  }
  // The first Keeper should sit at the reference badge-one level.
  const roxen = TRAINERS.hall1_roxen;
  const top = Math.max(...roxen.party.map((m) => m.level));
  assert.ok(top >= 14 && top <= 18, `first Keeper tops out at level ${top}, expected 14-18`);
});

test('shop stock is gated so early towns cannot sell late-game items', () => {
  for (const shop of read('data/items/shops.json')) {
    for (const entry of shop.stock) {
      const item = read('data/items/items.json').find((i) => i.id === entry.item);
      // Anything expensive must be behind at least one Bond Crest.
      if (item.price >= 1500) {
        assert.ok(entry.requiresCrest >= 1,
          `${shop.id} sells ${item.id} (${item.price}) with no Crest requirement`);
      }
    }
  }
});
