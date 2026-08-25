// The Mirehaven Sanctum, played rather than photographed.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/sanctum.js
//
// Steers by the map's own collision, exactly like tools/shots/act1.js, because
// two separate times on this project a driver walked into a wall and reported a
// missing feature. Nothing below names a coordinate that was not read out of
// the map file or off an NPC: the route to every warp is a breadth-first search
// over `map.collisionAt`, the stone is found by asking the scene where its
// boulders are, and the plates and trigger tiles come out of the map's own
// object list.
//
// The BFS knows three things the raw collision layer does not: shallow water is
// walkable because the player has Wade by Act 3, an NPC standing on a tile is
// solid, and a pushable stone is solid. Leaving any of the three out is how a
// driver ends up "stuck" on a room that a person walks through.

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); console.log('· ' + s); };
const flag = (f) => !!top().state?.hasFlag?.(f);
const V = (f) => top().state?.getVar?.(f);

/* --------------------------------------------------------------- boot */

await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30 && top().name === 'creator'; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') { d.key('Enter', 40); break; }
  d.key('KeyS', 2);
}
await d.loadWait(1600);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);

const kin = await import('/build/js/systems/kin.js');
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const { TrainerAI } = await import('/build/js/battle/ai.js');

// A player arriving at the Sanctum: five Crests, Wade off the third, Shoulder
// off the second, and a party at the level tests/helpers/simulate.mjs puts them
// on leaving Mirehaven.
const state = top().state;
state.party.length = 0;
for (const [sp, lv] of [['blazelynx', 30], ['gullswift', 29], ['silthopper', 29], ['mossback', 29]]) {
  state.party.push(kin.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
}
for (let n = 1; n <= 5; n++) state.giveCrest(n);
state.giveArt('clear'); state.giveArt('shoulder'); state.giveArt('wade');
state.giveItem('tideheart', 1);
state.setFlag('tideheart_given');
state.setFlag('tideheart_named');

/* ------------------------------------------------------- walking about */

const clear = () => {
  for (let i = 0; i < 200 && top().name === 'dialogue'; i++) d.key('Enter', 6);
  d.tick(4);
};

/**
 * Wait until the overworld actually has a map.
 *
 * loadMap is async -- it fetches the map JSON, its dialogue, its scripts and
 * its encounter table -- so `new OverworldScene(...)` returns long before there
 * is anything to walk on. The first version of this driver used a fixed
 * loadWait and read `top().map` while it was still undefined, which is the
 * same class of lie as walking into a wall: it reported the room empty because
 * the room had not arrived.
 */
/*
 * A battle can start from inside anything -- an `ask` the driver answered yes
 * to, a step script, a sight line -- so settling has to be able to play one.
 * Assigned further down, once `fight` exists.
 */
let autoBattle = async () => {};

const settle = async (tries = 150) => {
  let quiet = 0;
  for (let i = 0; i < tries; i++) {
    if (top().name === 'battle') { quiet = 0; await autoBattle('unplanned'); continue; }
    if (top().name === 'dialogue') { quiet = 0; d.key('Enter', 6); await d.sleep(10); continue; }
    if (top().name === 'overworld' && top().map && !top().busy && !top().events?.running) {
      if (++quiet >= 6) { d.tick(6); return true; }
    } else {
      quiet = 0;
    }
    await d.sleep(70);
    d.tick(8);
  }
  note('settle: gave up, scene=' + top().name + ' map=' + (top().map && top().map.id));
  return false;
};

/** Every helper below needs a live map under it; this is the guard. */
const live = () => top().name === 'overworld' && !!top().map;

const solid = (x, y) => {
  const s = top();
  const map = s.map;
  if (!map || !map.inBounds(x, y)) return true;
  const c = map.collisionAt(x, y);
  // 0 floor, 6 tall grass, 2 shallow water (Wade). Everything else is a wall
  // as far as this driver is concerned -- it never needs a ledge or a swim.
  if (c !== 0 && c !== 6 && c !== 2) return true;
  if ((s.npcs || []).some((n) => n.actor.tileX === x && n.actor.tileY === y)) return true;
  if ((s.boulders || []).some((b) => b.x === x && b.y === y)) return true;
  return false;
};

const route = (sx, sy, tx, ty) => {
  const key = (x, y) => `${x},${y}`;
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  let found = false;
  while (q.length) {
    const [x, y] = q.shift();
    if (x === tx && y === ty) { found = true; break; }
    for (const [dx, dy, k] of [[0, -1, 'KeyW'], [0, 1, 'KeyS'], [-1, 0, 'KeyA'], [1, 0, 'KeyD']]) {
      const nx = x + dx, ny = y + dy;
      if (from.has(key(nx, ny))) continue;
      // The target may itself be blocked (a stone, a person); allow stepping
      // onto it as the last move so "walk up to the stone" works.
      if (solid(nx, ny) && !(nx === tx && ny === ty)) continue;
      from.set(key(nx, ny), [x, y, k]);
      q.push([nx, ny]);
    }
  }
  if (!found && !from.has(key(tx, ty))) return null;
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

const at = () => (d.probe().pos || '0,0').split(',').map(Number);

const goTo = async (tx, ty, label) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!live()) await settle();
    if (!live()) return false;
    const [x, y] = at();
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps) { note(`${label || ''} no route from ${x},${y} to ${tx},${ty} on ${d.probe().map}`); return false; }
    const before = d.probe().map;
    let interrupted = false;
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().name === 'overworld' && top().map && top().map.id !== before) return true; // warped
      if (top().name !== 'overworld') {
        // A step script or a sight line fired on the way. Let it finish and
        // re-route from wherever it left the player, rather than reporting
        // "arrived" from halfway across the room.
        await settle();
        // The scene may have been a warp. Never keep walking to a coordinate
        // that was chosen for a different map.
        if (top().map && top().map.id !== before) return true;
        interrupted = true;
        break;
      }
    }
    if (interrupted) continue;
  }
  const [x, y] = at();
  return x === tx && y === ty;
};

/** Walk to the tile beside an NPC and talk to them. */
const talkTo = async (id) => {
  if (!live()) await settle();
  if (!live()) { note('talk ' + id + ': no map'); return false; }
  const n = (top().map.npcs || []).find((m) => m.id === id)
    || (top().npcs || []).map((m) => m.data).find((m) => m.id === id);
  if (!n) { note(`talk ${id}: not on ${d.probe().map}`); return false; }
  const spots = [[n.x, n.y + 1, 'KeyW'], [n.x, n.y - 1, 'KeyS'], [n.x - 1, n.y, 'KeyD'], [n.x + 1, n.y, 'KeyA']];
  for (const [sx, sy, face] of spots) {
    if (solid(sx, sy)) continue;
    if (!(await goTo(sx, sy, 'talk ' + id))) continue;
    d.hold(face, 6);
    d.key('Enter', 10);
    if (top().name === 'dialogue') {
      const first = d.probe().text;
      clear();
      note(`talk ${id}: "${(first || '').slice(0, 64)}"`);
      return true;
    }
  }
  note(`talk ${id}: no reachable side`);
  return false;
};

/** Play a battle out with the same novice AI the simulator uses. */
const fight = async (label) => {
  for (let i = 0; i < 60 && top().name !== 'battle'; i++) { d.key('Enter', 6); d.tick(2); }
  if (top().name !== 'battle') { note(`${label}: no battle started`); return null; }
  d.game.settings.battleSpeed = 'brisk';
  const scene = top();
  const you = new TrainerAI('novice', d.game.rng);
  for (let i = 0; i < 1200 && !scene.battle.over; i++) {
    if (top() !== scene) { d.key('Enter', 6); continue; }
    if (scene.phase === 'menu') {
      const act = you.choose(scene.battle, 'player');
      const best = act.kind === 'move' ? act.index : 0;
      d.key('Enter', 6);
      for (let k = 0; k < best; k++) d.key('KeyS', 4);
      d.key('Enter', 6);
    } else {
      d.key('Enter', 6);
    }
  }
  const result = scene.battle.result;
  for (let i = 0; i < 200 && top().name === 'battle'; i++) d.key('Enter', 6);
  clear();
  note(`${label}: ${result}`);
  return result;
};

autoBattle = fight;

const warpOut = (map, x, y, facing) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
};

const shots = [];
const shoot = async (name, ticks) => { shots.push(await d.shoot(name, ticks ?? 8, 1)); };

/* ----------------------------------------------------- the pumped floor */
//
// Entered on the silt at 9,16, which is the tile Mirehaven's own door is asked
// to land on -- not teleported into the middle of the room. Everything from
// here is walked.

warpOut('mirehaven_sanctum', 9, 16, 'up');
for (let i = 0; i < 60 && top().name !== 'dialogue'; i++) { await d.sleep(70); d.tick(8); }
note(`arrived: ${d.probe().map} at ${d.probe().pos} scene=${top().name}`);
await shoot('sanctum-01-arrival', 4);
await settle();
note(`after arrival scene: tarin_joined=${flag('ms_tarin_joined')} at ${d.probe().pos}`);
await shoot('sanctum-02-pumped-floor', 8);

await talkTo('ms_gate_agent');
await talkTo('ms_clerk');
await talkTo('ms_hydro');
if (top().name === 'battle') await fight('hydrologist (optional)');
await settle();
await goTo(6, 4, 'north end');
await shoot('sanctum-03-camp', 8);
await talkTo('ms_tarin_stair');

// Down the stair, found by asking the map where its warps go.
await settle();
const stair = ((top().map && top().map.warps) || []).find((w) => w.toMap === 'mirehaven_sanctum_deep');
if (!stair) throw new Error('no stair on ' + d.probe().map);
note(`stair warp at ${stair.x},${stair.y}`);
await goTo(stair.x, stair.y, 'stair');
await settle();
await settle();
note(`down: ${d.probe().map} at ${d.probe().pos} deep-arrival=${flag('msd_entered')}`);

/* --------------------------------------------------- the drowned gallery */

await shoot('sanctum-04-drowned-gallery', 20);

// The crossroads scene and the one battle in the dungeon.
await goTo(9, 11, 'crossroads');
d.tick(20);
for (let i = 0; i < 60 && top().name !== 'battle'; i++) { if (top().name === 'dialogue') d.key('Enter', 6); else { d.tick(4); await d.sleep(30); } }
await fight('sweeper');
await settle();
note(`crossed: swept=${flag('msd_swept')} split=${flag('msd_split')} at ${d.probe().pos}`);
await shoot('sanctum-05-after-sweep', 8);

// The east arm, for the panels and Tarin's voice from up the gallery.
await goTo(15, 8, 'east arm');
clear();
await shoot('sanctum-06-panels', 8);

// The shutter, before the plate. Should refuse.
await goTo(9, 2, 'shutter (shut)');
d.tick(16);
const shutText = d.probe().text;
clear();
note(`shutter before plate: map=${d.probe().map} said "${(shutText || '').slice(0, 60)}"`);
await talkTo('msd_tarin_door');

// The stone. Found by asking the scene, not by remembering where it was put.
await settle();
const plate = ((top().map && top().map.objects) || []).find((o) => o.kind === 'switch');
if (!plate) throw new Error('no plate on ' + d.probe().map);
const stoneAt = () => { const bs = (live() && top().boulders) || []; return bs[0] ? [bs[0].x, bs[0].y] : null; };
note(`plate at ${plate.x},${plate.y}; stone at ${stoneAt()}`);

// Shove it west off the ledge, then wind it up the plate column. Each push is
// "stand on the far side of the stone and walk into it".
const push = async (dir) => {
  await settle();
  const s = stoneAt();
  if (!s) return false;
  const back = { KeyW: [0, 1], KeyS: [0, -1], KeyA: [1, 0], KeyD: [-1, 0] }[dir];
  const sx = s[0] + back[0], sy = s[1] + back[1];
  if (!(await goTo(sx, sy, 'behind stone'))) return false;
  // Two goes. A push is "walk into it", and the first press after a walk can
  // land while the body is still finishing the previous step.
  for (let attempt = 0; attempt < 2; attempt++) {
    d.hold(dir, 22);
    d.tick(24);
    await settle();
    const now = stoneAt();
    if (now && (now[0] !== s[0] || now[1] !== s[1])) return true;
  }
  return false;
};

// Wind it up its own column until the row-2 wall stops it on the gutter row,
// then walk it west along the gutter into the plate. That is the line a person
// finds: the stone only goes one way and every wall in the arm points at 4,3.
for (let i = 0; i < 10; i++) {
  const st = stoneAt();
  if (!st || st[1] === plate.y) break;
  if (!(await push('KeyW'))) { note('up-push stalled with stone at ' + st + ', player at ' + at()); break; }
}
note('after winding, stone at ' + stoneAt());
for (let i = 0; i < 16; i++) {
  const st = stoneAt();
  if (!st || (st[0] === plate.x && st[1] === plate.y)) break;
  if (!(await push('KeyA'))) { note('west-push stalled with stone at ' + st + ', player at ' + at()); break; }
}
await settle();
note(`stone at ${stoneAt()}  plates var=${V('mirehaven_sanctum_deep_plates')}`);
await shoot('sanctum-07-plate', 8);

/* ------------------------------------------------------------ the shutter */

await goTo(9, 2, 'shutter (open)');
d.tick(30);
for (let i = 0; i < 300 && d.probe().map !== 'mirehaven_sanctum_heart'; i++) {
  if (top().name === 'dialogue') d.key('Enter', 6); else { d.tick(4); await d.sleep(20); }
}
await settle();
for (let i = 0; i < 60 && top().name === 'dialogue'; i++) d.key('Enter', 6);
note(`through the shutter: ${d.probe().map} at ${d.probe().pos} open=${flag('ms_shutter_open')}`);
await shoot('sanctum-08-heart-arrival', 12);

/* -------------------------------------------------------------- the heart */

await goTo(9, 11, 'kell');
await settle(400);
note(`met kell: ${flag('msh_met')}  kell at ${((top().npcs || []).find((n) => n.data.id === 'msh_kell') || { actor: {} }).actor.tileX}`);
await shoot('sanctum-09-kell', 8);

await goTo(9, 2, 'plinth');
await settle(600);
note(`record: truth=${flag('ms_second_truth')} echo=${flag('tideheart_echo_mirehaven_sanctum')}`
  + ` gone=${flag('msh_meridian_gone')} lyra=${flag('lyra_doubt_deep')} tarin=${flag('tarin_committed')}`);
await shoot('sanctum-10-after-record', 12);

await talkTo('msh_tarin');

// And back out the way you came, to prove the shutter stays open.
const back = ((top().map && top().map.warps) || []).find((w) => w.toMap === 'mirehaven_sanctum_deep');
if (!back) note('no way back from ' + d.probe().map);
if (back) await goTo(back.x, back.y, 'stair back');
await settle();
note(`back down: ${d.probe().map} at ${d.probe().pos}`);
await goTo(9, 2, 'shutter again');
d.tick(30);
for (let i = 0; i < 200 && d.probe().map !== 'mirehaven_sanctum_heart'; i++) {
  if (top().name === 'dialogue') d.key('Enter', 6); else { d.tick(4); await d.sleep(20); }
}
await settle();
note(`re-entry through the propped shutter: ${d.probe().map}`);

return {
  log,
  shots,
  flags: {
    tarin_joined: flag('ms_tarin_joined'),
    swept: flag('msd_swept'),
    shutter: flag('ms_shutter_open'),
    met: flag('msh_met'),
    truth: flag('ms_second_truth'),
    echo: flag('tideheart_echo_mirehaven_sanctum'),
    tarin_committed: flag('tarin_committed'),
    lyra: flag('lyra_doubt_deep'),
  },
  probe: d.probe(),
};
