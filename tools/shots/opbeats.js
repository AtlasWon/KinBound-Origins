// The operation, PLAYED rather than looked at.
//
// tools/shots/eastreach.js photographs the four maps. This one walks the whole
// road the way a player walks it -- Tideglass, the summons, the jetty, the
// length of the quay talking to everybody on it, Tarin's goodbye, the plank,
// the crossing, the landing, the deck, both catwalk fights, three towers and
// the Temple door -- pathfinding over each map's own collision, and reports
// the flags at every join. A map that photographs well and cannot be crossed
// is not a map.
//
//   npx electron tools/capture.cjs tools/shots/opbeats.js

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => log.push(s);
const key = (x, y) => `${x},${y}`;
// Read the flag off the STATE, never off top().state: when a dialogue box is
// still up, top() is the DialogueScene and has no state, and every flag in the
// report silently reads false. That is how the first run of this driver claimed
// the summons had not fired while its four boxes were on the screen.
let state = null;
const flag = (f) => !!state?.hasFlag(f);

const route = (sx, sy, tx, ty) => {
  const sc = top();
  const map = sc.map;
  if (!map) return null;
  const blocked = new Set((sc.npcs ?? []).map((n) => key(n.actor?.tileX ?? n.data?.x, n.actor?.tileY ?? n.data?.y)));
  const open = (x, y) => map.inBounds(x, y) && sc.canEnter(x, y, 'down') && !blocked.has(key(x, y));
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) break;
    for (const [dx, dy, k] of [[0, -1, 'KeyW'], [0, 1, 'KeyS'], [-1, 0, 'KeyA'], [1, 0, 'KeyD']]) {
      const nx = x + dx, ny = y + dy;
      if (!open(nx, ny) || from.has(key(nx, ny))) continue;
      from.set(key(nx, ny), [x, y, k]);
      q.push([nx, ny]);
    }
  }
  if (!from.has(key(tx, ty))) return null;
  const steps = [];
  let cur = [tx, ty];
  for (;;) {
    const prev = from.get(key(cur[0], cur[1]));
    if (!prev) break;
    steps.unshift(prev[2]);
    cur = [prev[0], prev[1]];
  }
  return steps;
};

const goTo = async (tx, ty) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const p = d.probe();
    if (top().name !== 'overworld') return false;
    const [x, y] = (p.pos || '0,0').split(',').map(Number);
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) return false;
    // 16 ticks a tile, not 14. A tile is 16 pixels at the walk speed, and the
    // short hold under-steps by a fraction that compounds: a thirty-tile walk
    // down the mole never arrived and the driver reported the NPC unreachable.
    for (const k of steps) { d.hold(k, 14); d.tick(2); if (top().name !== 'overworld') return true; }
  }
  const p = d.probe();
  const [x, y] = (p.pos || '0,0').split(',').map(Number);
  return x === tx && y === ty;
};

const talk = async (picks = [], budget = 1400) => {
  const seen = [];
  let pick = 0;
  let idle = 0;
  for (let i = 0; i < budget; i++) {
    const sc = top();
    if (sc.name === 'battle') { idle = 0; d.key('Enter', 6); continue; }
    if (sc.name !== 'dialogue') {
      // A warp fetches its map, so the loop has to yield to the event loop or
      // the fade never finishes and the driver walks off the end of a scene
      // that is still loading.
      idle++; d.tick(4);
      if (i % 8 === 0) await d.sleep(16);
      // Do NOT leave while the event runner is still going. An overworld frame
      // is not the end of a scene: a scripted move hands control back to the
      // overworld for as long as it takes the actor to walk, and a loop that
      // breaks there walks away from a script mid-sentence with input locked.
      const done = top().name === 'overworld' && !top().events?.running && !top().busy;
      if (idle > 40 && done) break;
      continue;
    }
    idle = 0;
    if (sc.choosing) {
      const want = picks[pick++] ?? 0;
      for (let j = 0; j < 8 && sc.choiceIndex !== want; j++) d.key('KeyS', 4);
      d.key('Enter', 8);
      continue;
    }
    const t = d.probe().text;
    if (t && seen[seen.length - 1] !== t) seen.push(t);
    d.key('Enter', 8);
  }
  return seen;
};

/** Stand next to an NPC by id, face them, and press A. */
const speakTo = async (id, picks = []) => {
  const sc = top();
  const n = (sc.map?.npcs ?? []).find((x) => x.id === id);
  if (!n) { note(`speakTo ${id}: not on ${sc.map?.id}`); return []; }
  const spots = [[n.x, n.y + 1, 'KeyW'], [n.x, n.y - 1, 'KeyS'], [n.x - 1, n.y, 'KeyD'], [n.x + 1, n.y, 'KeyA']];
  for (const [x, y, face] of spots) {
    if (!(await goTo(x, y))) continue;
    d.hold(face, 4);
    d.key('Enter', 10);
    const boxes = await talk(picks);
    note(`${id}: ${boxes.length} boxes`);
    return boxes;
  }
  note(`speakTo ${id}: could not stand next to them`);
  return [];
};

await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(700);
state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const { createKin } = await import('/build/js/systems/kin.js');
const { Rng } = await import('/build/js/core/rng.js');

/*
 * The player the road really delivers. simulate.mjs puts the team-raiser at
 * L44-45 leaving Crownspire, and Meridian have had the Tideheart since Act 4,
 * so the bag is empty and stays empty until somebody else's scene gives it back.
 */
const rng = new Rng('opbeats');
state.party.length = 0;
for (const [sp, lv] of [['volcatrix', 45], ['mossback', 44], ['gullswift', 44], ['galecrest', 44]]) {
  state.addKin(createKin(sp, lv, rng, { originalTrainer: 'player' }));
}
for (let n = 1; n <= 8; n++) state.giveCrest(n);
state.setFlag('crest_8_taken');
state.setFlag('act4_done');
state.setFlag('tideheart_taken');
// Act 2 left two enter scripts on Tideglass in data/events/common.json, both
// with onceFlags a real playthrough set thirty hours ago. The enter loop stops
// at the FIRST script that starts, so a driver that drops a fresh save into
// Tideglass gets Act 2's arrival and never sees the summons. These four are
// what that playthrough would have set.
for (const f of ['tideglass_arrived', 'cassian_public_done', 'lyra_doubt', 'tarin_tideglass_done']) state.setFlag(f);
state.giveArt('wade');
note(`start: 8 crests, party ${state.party.map((k) => k.name + ' L' + k.level).join(', ')}, tideheart=${state.hasItem('tideheart', 1)}`);

/* --- 1. the summons, in Tideglass -------------------------------------- */
d.game.scenes.replaceAll(new Overworld(state, 'tideglass', 71, 50, 'down'));
await d.loadWait(1400);
const summons = await talk([], 300);
note(`SUMMONS: ${summons.length} boxes; op_called=${flag('op_called')}; first=${summons[0] ?? 'none'}`);

/* --- 2. down the jetty, which warps ------------------------------------ */
const walked = await goTo(71, 61);
await d.loadWait(1200);
await talk([], 200);
note(`JETTY: walked=${walked} -> ${d.probe().map} at ${d.probe().pos}`);

/* --- 3. the length of the quay ----------------------------------------- */
await talk([], 300);   // op_arrive
note(`QUAY ARRIVE: op_quay_arrived=${flag('op_quay_arrived')}`);
await speakTo('op_sorrell');
note(`  briefed=${flag('op_briefed')} restores=${state.itemCount('full_restore')}`);
for (const id of ['op_vane', 'op_roxen', 'op_tallow', 'op_fenn', 'op_cade', 'op_clerk', 'op_lyra']) {
  await speakTo(id);
}
await speakTo('op_healer');

/* --- 4. boarding is refused until Tarin has been said goodbye to -------- */
await goTo(44, 11);
d.hold('KeyS', 14); d.tick(6);
const refused = await talk([], 260);
note(`BOARD BEFORE TARIN: ${refused.length} boxes, still on ${d.probe().map} at ${d.probe().pos}`);

await speakTo('op_tarin', [1]);
note(`TARIN: op_tarin_gone=${flag('op_tarin_gone')}`);

/* --- 5. the plank ------------------------------------------------------- */
await goTo(44, 11);
d.hold('KeyS', 14); d.tick(6);
await talk([], 400);
await d.loadWait(1400);
await talk([], 300);
note(`SAILED: op_sailed=${flag('op_sailed')} -> ${d.probe().map} at ${d.probe().pos}`);

/* --- 6. the crossing ---------------------------------------------------- */
await speakTo('lch_sorrell');
const midships = await goTo(12, 7);
await talk([], 400);
note(`SEA: reached midships=${midships}, lch_sea_done=${flag('lch_sea_done')}`);
const bow = await goTo(12, 4);
await talk([], 700);
await d.loadWait(1500);
await talk([], 400);
note(`SIGHT+LANDING: lch_sight_done=${flag('lch_sight_done')} op_crossed=${flag('op_crossed')} -> ${d.probe().map} at ${d.probe().pos}`);
note(`  op_landed=${flag('op_landed')} respawn=${state.respawnMap} ${state.respawnX},${state.respawnY}`);

/* --- 7. the beach, and the walk down the drowned street ----------------- */
await speakTo('sh_vane');
await speakTo('sh_lyra');
await speakTo('sh_signal');
const plank = await goTo(38, 15);
note(`PLANK: crossed the drowned street without Swim = ${plank} (swim=${state.hasArt('swim')})`);
const stair = await goTo(40, 1);
await d.loadWait(1400);
await talk([], 400);
note(`STAIR: -> ${d.probe().map} at ${d.probe().pos}`);

/* --- 8. the deck, both catwalks, three towers, the door ----------------- */
await goTo(20, 20);
await talk([], 700);
note(`TOWER 1: op_tower_1=${flag('op_tower_1')} at ${d.probe().pos}`);

// The west catwalk is one tile wide and Dass is watching it.
const west = await goTo(16, 10);
await talk([], 900);
note(`WEST CATWALK: reached=${west} beat Dass=${state.hasDefeated('op_deck_lead')} tower_2=${flag('op_tower_2')}`);

note('BATTLES so far: watch=' + state.hasDefeated('op_shore_watch')
  + ' hand=' + state.hasDefeated('op_deck_hand')
  + ' lead=' + state.hasDefeated('op_deck_lead')
  + ' tech=' + state.hasDefeated('op_deck_tech'));
const door = await goTo(19, 5);
await talk([], 700);
note(`DOOR: reached=${door} op_at_door=${flag('op_at_door')} tower_3=${flag('op_tower_3')} at ${d.probe().pos}`);
const shot = await d.shoot('op-01-door', 10, 1);

/* --- 9. and through it, into somebody else's build ---------------------- */
await goTo(19, 4);
await d.loadWait(1600);
note(`THROUGH THE DOOR: ${d.probe().map} at ${d.probe().pos}`);

/* --- 9b. the deck again, from the stairhead, so the platform half is
 * measured even when the long walk up to it has drifted.            */
d.game.scenes.replaceAll(new Overworld(state, 'eastreach_platform', 20, 24, 'up'));
await d.loadWait(1200);
await talk([], 400);
for (const [tx, ty, label] of [[20, 20, 'south bay'], [16, 10, 'west catwalk'], [24, 10, 'east catwalk'], [19, 5, 'the door']]) {
  const ok = await goTo(tx, ty);
  await talk([], 900);
  note('DECK ' + label + ': reached=' + ok + ' at ' + d.probe().pos
    + ' towers=' + [1, 2, 3].map((n) => flag('op_tower_' + n) ? n : '-').join(''));
}
note('DECK BATTLES: hand=' + state.hasDefeated('op_deck_hand')
  + ' lead=' + state.hasDefeated('op_deck_lead')
  + ' tech=' + state.hasDefeated('op_deck_tech')
  + ' op_at_door=' + flag('op_at_door'));

/* --- 10. the ledger ----------------------------------------------------- */
const beats = ['muster', 'crossing', 'towers', 'aftermath'];
note('TARIN LEDGER: ' + beats.map((b) => `${b}=${flag('tarin_at_' + b)}`).join(' '));

return { log, shot, party: state.party.map((k) => k.name + ' L' + k.level + ' ' + (k.currentHp ?? k.hp) + '/' + (k.stats?.hp ?? k.maxHp)) };
