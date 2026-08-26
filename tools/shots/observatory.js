// The Frostmere Observatory, played rather than photographed.
//
//   node tools/serve.js
//   npx electron tools/capture.cjs tools/shots/observatory.js
//
// Steers by the map's own collision, exactly like tools/shots/act1.js and
// tools/shots/sanctum.js. Nothing below names a coordinate that was not read
// out of the map file or off a warp: every move is a breadth-first search over
// `map.collisionAt`, and the stairs and the trigger tile are found by asking
// the loaded map where its warps and its step scripts are.
//
// THE PLAYER HAS NO TIDEHEART. That is the whole point of the act and it is
// what this driver is set up to prove: the object is taken out of the bag and
// `tideheart_taken` is set before a foot is put on the mountain, exactly as
// data/events/common.json leaves things at the end of Act 4. If any beat in
// the site needed the object, this run would stall on it.

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];
const note = (s) => { log.push(s); console.log('· ' + s); };
const flag = (f) => !!top().state?.hasFlag?.(f);

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
const th = await import('/build/js/systems/tideheart.js');

// A player arriving at the Observatory: five Crests, every traversal art the
// shipped acts hand out, and a party at the level Act 5 opens on.
const state = top().state;
state.party.length = 0;
for (const [sp, lv] of [['blazelynx', 40], ['gullswift', 39], ['silthopper', 39], ['mossback', 39]]) {
  state.party.push(kin.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
}
for (let n = 1; n <= 5; n++) state.giveCrest(n);
state.giveArt('clear'); state.giveArt('shoulder'); state.giveArt('wade');

// Act 4's ending, applied exactly as data/events/common.json applies it.
state.setFlag('tideheart_given');
state.setFlag('tideheart_named');
state.takeItem('tideheart', 1);
state.setFlag('tideheart_taken');
note(`robbed: hasItem=${state.hasItem('tideheart')} taken=${flag('tideheart_taken')}`);
note(`reading: "${th.readTideheart(state).reading}"`);
note(`built stage ${th.BUILT_STAGE}, sites: ${th.builtSites().map((s) => s.id).join(', ')}`);
note(`audit: ${JSON.stringify(th.tideheartAudit())}`);

/* ------------------------------------------------------- walking about */

const clear = () => {
  for (let i = 0; i < 400 && top().name === 'dialogue'; i++) d.key('Enter', 6);
  d.tick(4);
};

const settle = async (tries = 200) => {
  let quiet = 0;
  for (let i = 0; i < tries; i++) {
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

const live = () => top().name === 'overworld' && !!top().map;

const solid = (x, y) => {
  const s = top();
  const map = s.map;
  if (!map || !map.inBounds(x, y)) return true;
  const c = map.collisionAt(x, y);
  if (c !== 0 && c !== 6 && c !== 2) return true;
  if ((s.npcs || []).some((n) => n.actor.tileX === x && n.actor.tileY === y)) return true;
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
    if (!steps) { note(`${label || ''}: no route from ${x},${y} to ${tx},${ty} on ${d.probe().map}`); return false; }
    const before = d.probe().map;
    let interrupted = false;
    for (const k of steps) {
      d.hold(k, 12);
      d.tick(2);
      if (top().name === 'overworld' && top().map && top().map.id !== before) return true;
      if (top().name !== 'overworld') {
        await settle();
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

/** Face a tile from a neighbour and press A. Used on signs. */
const readSign = async (sx, sy) => {
  if (!live()) await settle();
  const spots = [[sx, sy + 1, 'KeyW'], [sx, sy - 1, 'KeyS'], [sx - 1, sy, 'KeyD'], [sx + 1, sy, 'KeyA']];
  const warpTile = (x, y) => ((live() && top().map.warps) || []).some((w) => w.x === x && w.y === y);
  for (const [x, y, face] of spots) {
    // Never stand on a warp to read something: the sign beside a doorway is
    // read from inside the room, not from the next map. The first cut of this
    // driver walked onto the Observatory's front door to reach the sign next
    // to it and reported every sign in the building unreadable from Frostmere.
    if (solid(x, y) || warpTile(x, y)) continue;
    if (!(await goTo(x, y, `sign ${sx},${sy}`))) continue;
    d.hold(face, 6);
    d.key('Enter', 10);
    if (top().name === 'dialogue') {
      const first = d.probe().text;
      clear();
      note(`sign ${sx},${sy}: "${(first || '').slice(0, 70)}"`);
      return true;
    }
  }
  note(`sign ${sx},${sy}: could not be read`);
  return false;
};

/**
 * Read every sign on the map the player is standing on.
 *
 * Coordinates come out of the map's own object list rather than out of this
 * file, so moving a sign cannot leave the driver pressing A at a blank wall and
 * reporting the room empty -- which is what happened when the front doorway was
 * widened and two signs shifted two tiles along the wall.
 */
const readEverySign = async (label) => {
  if (!live()) await settle();
  const signs = (top().map.objects || []).filter((o) => o.kind === 'sign' || o.kind === 'script');
  note(`${label}: ${signs.length} sign(s) on ${d.probe().map}`);
  let read = 0;
  for (const s of signs) if (await readSign(s.x, s.y)) read++;
  note(`${label}: read ${read} of ${signs.length}`);
  return read === signs.length;
};

/** Pick up every loose and buried item the map declares. */
const takeEveryItem = async (label) => {
  if (!live()) await settle();
  const picks = (top().map.objects || []).filter((o) => o.kind === 'item' || o.kind === 'hiddenItem');
  for (const p of picks) {
    if (!(await goTo(p.x, p.y, `item ${p.item}`))) continue;
    await settle();
    if (p.kind === 'hiddenItem') { d.key('Enter', 10); clear(); }
    clear();
    note(`${label}: ${p.item} x${p.quantity ?? 1} at ${p.x},${p.y} -> ${flag(p.flag)}`);
  }
};

const talkTo = async (id) => {
  if (!live()) await settle();
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
      note(`talk ${id}: "${(first || '').slice(0, 70)}"`);
      return true;
    }
  }
  note(`talk ${id}: no reachable side`);
  return false;
};

const warpOut = (map, x, y, facing) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
};

const shots = [];
const shoot = async (name, ticks) => { shots.push(await d.shoot(name, ticks ?? 8, 1)); };

/** The stair out of this map that leads to `toMap`, read off the map itself. */
const stairTo = (toMap) => ((live() && top().map.warps) || []).find((w) => w.toMap === toMap);

/**
 * Take the stair out of this map that leads to `toMap`, and keep at it.
 *
 * A stair is a warp on a tile, so "walk onto it" is the whole action -- but the
 * press that walks onto it can land while the body is still finishing the
 * previous step, and then the driver is standing next to the stair reporting
 * that it took it. Every climb below goes through here, so a failure to warp is
 * a line in the log rather than a coordinate read off the wrong map.
 */
const takeStair = async (toMap, label) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!live()) await settle();
    const w = stairTo(toMap);
    if (!w) { note(`${label}: no stair to ${toMap} on ${d.probe().map}`); return false; }
    const before = d.probe().map;
    await goTo(w.x, w.y, label);
    await settle();
    if (d.probe().map === toMap) {
      note(`${label}: ${before} -> ${d.probe().map} at ${d.probe().pos}`);
      return true;
    }
    note(`${label}: attempt ${attempt + 1} left me on ${d.probe().map} at ${d.probe().pos}`);
    // Print the collision the engine actually compiled, plus everybody standing
    // on it, so a stuck driver reports the room rather than its own opinion.
    const m = top().map;
    const [px, py] = at();
    for (let y = Math.max(0, py - 2); y <= Math.min(m.height - 1, py + 5); y++) {
      let r = '';
      for (let x = Math.max(0, px - 4); x <= Math.min(m.width - 1, px + 4); x++) r += m.collisionAt(x, y);
      note(`   y${y} x${Math.max(0, px - 4)}+: ${r}`);
    }
    note(`   npcs: ${(top().npcs || []).map((n) => `${n.data.id}@${n.actor.tileX},${n.actor.tileY}`).join(' ') || 'none'}`);
    const pl = top().player;
    note(`   player px=${pl.x},${pl.y} tile=${pl.tileX},${pl.tileY} facing=${pl.facing}`
      + ` moving=${pl.moving} playerBusy=${pl.busy} sceneBusy=${top().busy} events=${!!top().events?.running}`);
    for (const [k, name] of [['KeyS', 'down'], ['KeyA', 'left'], ['KeyD', 'right'], ['KeyW', 'up']]) {
      const b = `${pl.tileX},${pl.tileY}`;
      d.hold(k, 16); d.tick(10);
      note(`   try ${name}: ${b} -> ${pl.tileX},${pl.tileY}`);
    }
    d.tick(12);
  }
  return false;
};

/* -------------------------------------------------------- the open door */
//
// Entered on 11,16 -- the tile directly inside the doorway, which is the tile
// Frostmere's own Observatory door is asked to land the player on. Never
// teleported into the middle of a room.

warpOut('frostmere_observatory', 11, 16, 'up');
for (let i = 0; i < 80 && top().name !== 'dialogue'; i++) { await d.sleep(70); d.tick(8); }
note(`arrived: ${d.probe().map} at ${d.probe().pos} scene=${top().name}`);
note(`first box: "${(d.probe().text || '').slice(0, 90)}"`);
await shoot('obs-01-arrival', 4);
await settle();
note(`after arrival: found=${flag('act5_observatory_found')} at ${d.probe().pos}`);
await shoot('obs-02-open-door', 8);

// The camp, walked into rather than pressed at.
await goTo(4, 16, 'camp');
await settle();
note(`camp: seen=${flag('fo_camp_found')}`);
await shoot('obs-03-camp', 8);

await readEverySign('hall');
await takeEveryItem('hall');
await shoot('obs-04-wet-corner', 8);

// Up. The stair is found by asking the map, not by remembering where it was put.
await takeStair('frostmere_observatory_gallery', 'hall -> gallery');

/* --------------------------------------------------------- the watch floor */

await shoot('obs-05-watch-floor', 14);
await settle();
note(`gallery arrival played: ${flag('fo_gallery_entered')}`);

// The counting groove, walked into.
await goTo(9, 9, 'counting groove');
await settle();
note(`counting: ${flag('act5_observatory_count')}`);
await shoot('obs-06-counting', 8);

// The panels, west to east, then the chalk at the far end.
await goTo(9, 3, 'panel row');
await shoot('obs-07-panels', 8);
await goTo(27, 5, 'chalk');
await settle();
note(`chalk: ${flag('fo_chalk_found')}`);

// The alcove with no rings in it.
await goTo(20, 12, 'ring alcove');
await settle();
await shoot('obs-08-ring-alcove', 8);

await readEverySign('gallery');
await takeEveryItem('gallery');

await takeStair('frostmere_observatory_dome', 'gallery -> dome');

/* ---------------------------------------------------------------- the dome */

await shoot('obs-09-dome-arrival', 14);
await settle();
note(`dome arrival: ${flag('act5_observatory_dome')} at ${d.probe().pos}`);
await shoot('obs-10-dome', 10);
await readEverySign('dome');
await takeEveryItem('dome');

/* ------------------------------------------------------------ the message */

// Read out of the map's own step scripts rather than typed in, so a driver can
// never claim the scene played by standing somewhere else.
const trigger = await (await fetch('/data/events/frostmere_observatory_dome.json')).json();
const centre = (trigger.find((s) => s.id === 'fo_message') || {}).at[0];
note(`walking to the middle of the floor at ${centre.x},${centre.y}`);
await goTo(centre.x, centre.y, 'the middle');
d.tick(24);

// Read the whole recording out, one box at a time, so the log is the script.
const boxes = [];
for (let i = 0; i < 400; i++) {
  if (top().name === 'dialogue') {
    const t = d.probe().text;
    if (t && t !== boxes[boxes.length - 1]) boxes.push(t);
    if (boxes.length === 6) await shoot('obs-11-message', 2);
    d.key('Enter', 7);
    continue;
  }
  if (top().name === 'overworld' && !top().busy && !top().events?.running) {
    if (flag('fo_message_played')) break;
  }
  d.tick(6);
  await d.sleep(40);
}
for (const b of boxes) note('  | ' + b);
note(`boxes in the scene: ${boxes.length}`);
await settle();
await shoot('obs-12-after-message', 10);

note(`played=${flag('fo_message_played')} echo=${flag('tideheart_echo_frostmere_observatory')}`
  + ` public=${flag('act5_elias_message')}`);
note(`tarin on the map: ${(top().npcs || []).some((n) => n.data.id === 'fo_tarin')}`);
note(`reading now: "${th.readTideheart(state).reading}"`);
note(`echoes now: ${th.readTideheart(state).echoes.map((s) => s.id).join(', ') || '(none -- no object to hold them)'}`);

await talkTo('fo_tarin');
await shoot('obs-13-tarin', 8);
await talkTo('fo_tarin');

/* --------------------------------------------- back down, and back up again */

await takeStair('frostmere_observatory_gallery', 'dome -> gallery');
await takeStair('frostmere_observatory_dome', 'gallery -> dome');
note(`tarin still there after a reload: ${(top().npcs || []).some((n) => n.data.id === 'fo_tarin')}`);
note(`the message does not replay: played=${flag('fo_message_played')}`);
await shoot('obs-14-dome-revisit', 10);

// And all the way back out the front, to prove the door still works both ways.
await takeStair('frostmere_observatory_gallery', 'down again');
await takeStair('frostmere_observatory', 'gallery -> hall');
const outward = ((live() && top().map.warps) || []).find((w) => w.toMap === 'frostmere');
note(`the Frostmere door: ${outward ? `${outward.x},${outward.y} -> frostmere ${outward.toX},${outward.toY}` : 'MISSING'}`);
note(`bottom: ${d.probe().map} at ${d.probe().pos}`);

return {
  log,
  shots,
  boxes,
  flags: {
    found: flag('act5_observatory_found'),
    camp: flag('fo_camp_found'),
    gallery: flag('fo_gallery_entered'),
    counting: flag('act5_observatory_count'),
    chalk: flag('fo_chalk_found'),
    dome: flag('act5_observatory_dome'),
    played: flag('fo_message_played'),
    echo: flag('tideheart_echo_frostmere_observatory'),
    message: flag('act5_elias_message'),
    tarin: flag('fo_tarin_said'),
  },
  probe: d.probe(),
};
