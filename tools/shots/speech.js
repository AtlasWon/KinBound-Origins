// Every line of the dialogue/trainer-speech pass, read out of the running game
// rather than out of the JSON, and shot at 1x with the typewriter forced
// complete so what lands on disk is what a player actually reads.
//
// Three things this driver exists to catch, all of which it did catch:
//
//  - Orphan pages. The box holds three wrapped lines; a four-line entry spills
//    one word onto a page of its own, which is invisible in the source and
//    obvious in the picture.
//  - `afterward` shadowing a script. overworld.interact() returns on a defeated
//    trainer's `afterward` BEFORE it ever looks at npc.data.script, so a trainer
//    NPC that also names a dialogue entry can never reach it.
//  - Dialogue files load per-map and merge cumulatively, so an entry only
//    resolves once its own town has been entered. Jumping straight into a
//    waystation reports "no dialogue" for a key that is perfectly fine in play.
//
// Usage: npx electron tools/capture.cjs tools/shots/speech.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;
const BODY_W = 11, BODY_H = 9;

async function go(map) {
  d.game.scenes.replaceAll(new Overworld(state, map, 5, 5, 'down'));
  await d.loadWait(1200);
  clear();
  return top();
}

/** Page through an open box, forcing each page fully revealed before shooting. */
async function readBox(shotBase) {
  let p = 0;
  while (top().name === 'dialogue' && p < 8) {
    const box = top();
    box.revealed = Infinity;
    d.tick(2);
    if (shotBase) await d.shoot(`${shotBase}-p${p}`, 0);
    out.push(`${shotBase || 'box'}-p${p}: ${d.probe().text}`);
    const more = box.page < box.pages.length - 1;
    d.key('Enter', 6);
    if (!more) break;
    p++;
  }
  clear();
}

/** Stand next to an NPC, face them, and interact -- the real player path. */
async function talkTo(sc, npcId, shotBase) {
  const npc = sc.npcs.find((n) => n.data.id === npcId);
  if (!npc) { out.push(`!! ${npcId} not on ${sc.map.id}`); return; }
  const nx = npc.data.x, ny = npc.data.y;
  const spots = [
    [nx, ny + 1, 'up'], [nx, ny - 1, 'down'], [nx - 1, ny, 'right'], [nx + 1, ny, 'left'],
  ];
  let placed = false;
  for (const [px, py, facing] of spots) {
    if (sc.map.collisionAt(px, py) === 1) continue;
    sc.player.x = px * 16 + (16 - BODY_W) / 2;
    sc.player.y = py * 16 + (16 - BODY_H) - 1;
    sc.player.facing = facing;
    d.tick(2);
    if (sc.npcInFront() && sc.npcInFront().data.id === npcId) { placed = true; break; }
  }
  if (!placed) { out.push(`!! could not reach ${npcId}`); return; }
  sc.busy = false;
  d.key('Enter', 6);
  await readBox(shotBase);
}

/* ---- 1. the Marrow Hollow well thread, one chapter per story stage ------ */
// Saffra stands on the well itself, so the picture and the line have to agree.

{
  const sc = await go('marrow_hollow');
  await talkTo(sc, 'hollow_villager', 'sp-well-0');
  state.setFlag('got_starter');
  await talkTo(sc, 'hollow_villager', 'sp-well-1');
  state.setFlag('seal_1_taken');
  await talkTo(sc, 'hollow_villager', 'sp-well-2');
  state.setFlag('seal_2_taken');
  await talkTo(sc, 'hollow_villager', 'sp-well-3');
}

/* ---- 2. `afterward`, which is what a beaten trainer actually says ------- */

for (const t of ['r1_madden', 'r1_cale', 'r3_bram', 'r3_holt', 'r4_gorse', 'bastion2_guard_a']) {
  state.markDefeated(t);
}
{
  const sc = await go('route_1');
  await talkTo(sc, 'r1_madden', 'sp-madden');
  await talkTo(sc, 'r1_cale', 'sp-cale');
}
{
  const sc = await go('route_3');
  await talkTo(sc, 'r3_bram', 'sp-bram');
  await talkTo(sc, 'r3_holt', 'sp-holt');
}
{
  const sc = await go('route_4');
  await talkTo(sc, 'r4_gorse', 'sp-gorse');
}

/* ---- 3. the rester, reached the way a player reaches him ---------------- */
// Straight into the waystation this reports "no dialogue": tanners_rest.json
// has not been loaded yet. Entering the town first is what a player does.

await go('tanners_rest');
{
  const sc = await go('tanners_waystation');
  await talkTo(sc, 'tr_ways_rester', 'sp-rester');
}

/* ---- 4. intro / defeat / victory, which never appear on the field ------- */
// The intro is a challenge box before the wipe and the other two are battle-log
// lines, so each is pushed through the same DialogueScene with the real
// nameplate to judge wrapping and plate width on the strings the registry holds.

const dlgMod = await import('/build/js/ui/dialogue.js');
const reg = (await import('/build/js/data/registry.js')).registry;
await go('route_4');

const CHECK = [
  ['r1_madden', 'intro'], ['r1_bex', 'afterward'], ['r1_cale', 'victory'],
  ['r2_pike', 'intro'], ['r2_pike', 'defeat'], ['r2_pike', 'victory'],
  ['r2_juna', 'defeat'], ['r2_juna', 'victory'], ['r2_shale', 'victory'],
  ['r3_bram', 'intro'], ['r3_bram', 'defeat'], ['r3_bram', 'victory'],
  ['r3_sill', 'victory'], ['r3_holt', 'defeat'], ['r3_holt', 'victory'],
  ['r4_gorse', 'intro'], ['r4_gorse', 'defeat'], ['r4_gorse', 'victory'],
  ['perrin_first_cinderpaw', 'intro'],
  ['perrin_first_cinderpaw', 'defeat'],
  ['perrin_first_cinderpaw', 'victory'],
];

let n = 0;
for (const [id, field] of CHECK) {
  const t = reg.trainers.get(id);
  if (!t) { out.push(`!! no trainer ${id}`); continue; }
  const lines = t[field];
  if (!lines || !lines.length) { out.push(`!! ${id}.${field} empty`); continue; }
  d.game.scenes.push(new dlgMod.DialogueScene(lines, { who: `${t.className} ${t.name}` }));
  d.tick(3);
  await readBox(`sp-${String(n++).padStart(2, '0')}-${id}-${field}`);
}

// A page that is not the last one and holds fewer than three lines is the
// orphan case; flag it rather than making somebody read the log for it.
const orphans = out.filter((l) => {
  const m = /-p(\d+): (.*)$/.exec(l);
  if (!m) return false;
  const isLast = !out.some((o) => o.startsWith(l.split('-p')[0] + '-p' + (Number(m[1]) + 1) + ':'));
  return isLast && Number(m[1]) > 0 && m[2].split(' / ').length === 1;
});
out.push(orphans.length ? 'ORPHAN PAGES: ' + orphans.join(' ; ') : 'no orphan final pages');

return { out };
