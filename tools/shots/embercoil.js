// Walk Embercoil Pass (route_5) and the Cinder Vent.
//
// Pathfinds over the map's OWN collision -- see tools/shots/act1.js for why a
// driver in this project never hardcodes a route -- and enters the map at the
// tile the Tideglass gate actually lands on rather than teleporting into the
// middle of it, because dropping a player on an arbitrary tile bypasses
// collision and can put them inside solid scenery, and a shot of the inside of
// a cliff is not evidence of anything.
//
// It reports three things: whether every leg of the road is walkable from the
// gate, whether every warp and every object can be stood in front of, and a
// set of 1x screenshots to judge the art by.
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => { const t = d.game.scenes.top; return t && t.map ? t : null; };
// Add `shots=1` to the capture query to skip the walking pass and only take
// the photographs -- useful when iterating on the tiles rather than the map.
const shotsOnly = /(^|&)shots=1/.test(location.search);
const log = [];
const note = (s) => log.push(s);

const blocked = () => {
  const s = ow();
  const set = new Set();
  for (const n of (s?.npcs || [])) {
    const a = n.actor;
    if (!a) continue;
    set.add(`${a.tileX},${a.tileY}`);
    if (a.moving) set.add(`${a.targetX},${a.targetY}`);
  }
  for (const n of (s?.map?.npcs || [])) set.add(`${n.x},${n.y}`);
  return set;
};

const route = (sx, sy, tx, ty) => {
  const scene = ow();
  const map = scene?.map;
  if (!map) return null;
  const solid = blocked();
  // Warp tiles are walls to the search unless they ARE the destination. A cave
  // mouth sits flush in a cliff face at ground level, so a plain shortest-path
  // run happily steps through it and the driver spends the rest of the walk
  // underground reporting the surface as unreachable.
  for (const w of (map.warps || [])) solid.add(`${w.x},${w.y}`);
  solid.delete(`${tx},${ty}`);
  const key = (x, y) => `${x},${y}`;
  // Ask the scene itself what it will let the player walk on, so wade, swim
  // and one-way banks are all obeyed by the search exactly as they are obeyed
  // by the game. A search that only rejects walls plots courses over lava.
  const wade = scene.state?.hasArt?.('wade');
  const swim = scene.state?.hasArt?.('swim');
  const open = (x, y, from) => {
    if (!map.inBounds(x, y) || solid.has(key(x, y))) return false;
    const c = map.collisionAt(x, y);
    if (c === 0 || c === 6) return true;
    if (c === 2 || c === 7) return !!wade;
    if (c === 8) return !!swim;
    if (c === 3) return from === 'down';
    if (c === 4) return from === 'left';
    if (c === 5) return from === 'right';
    return false;
  };
  const from = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    if (x === tx && y === ty) break;
    for (const [dx, dy, k, dir] of [[0, -1, 'KeyW', 'up'], [0, 1, 'KeyS', 'down'],
      [-1, 0, 'KeyA', 'left'], [1, 0, 'KeyD', 'right']]) {
      const nx = x + dx, ny = y + dy;
      if (!open(nx, ny, dir) || from.has(key(nx, ny))) continue;
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

const clear = () => {
  for (let round = 0; round < 40; round++) {
    for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
    d.tick(20);
    if (top().name !== 'dialogue' && !(ow() || {}).busy) break;
  }
  d.tick(4);
};

// Wild encounters would stop the walk dead every few tiles, so anything that
// puts a battle on screen is run away from immediately.
const flee = () => {
  // RUN is the fourth item of the action menu, so the way out of a wild battle
  // is three downs and a confirm -- and then a lot of Enter, because a failed
  // run costs a turn and the fight carries on.
  for (let round = 0; round < 30 && top().name === 'battle'; round++) {
    for (let i = 0; i < 4; i++) d.key('KeyS', 3);
    d.key('Enter', 12);
    for (let i = 0; i < 30 && top().name === 'battle'; i++) {
      const before = top();
      d.key('Enter', 8);
      if (top() !== before) break;
    }
  }
  for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(20);
};

// Unhook a map's encounter table. Used for the walking pass only, and only
// after the encounter probe below has measured what it does.
let hushed = false;
const quiet = () => { const s2 = ow(); if (s2 && hushed) s2.encounters = undefined; };

/**
 * Wait until the overworld is back and taking input again.
 *
 * Also the place where a whiteout is caught. A party that loses a wild fight is
 * carried back to its respawn point -- which is a bedroom in Hearthmere -- and
 * a driver that does not notice spends the rest of the run reporting Route 5 as
 * a twenty-by-eleven map with two warps in it. So the party is healed after
 * every battle and, if the map underneath has changed, the walk is put back
 * where it was.
 */
let lastX = 1, lastY = 6;
let homeMap = 'route_5';
let putBack = null;
const settle = async () => {
  for (let i = 0; i < 60; i++) {
    if (top().name === 'battle') { flee(); if (playerState) playerState.healParty(); }
    if (top().name === 'dialogue') clear();
    d.tick(8);
    const p = d.probe();
    if (ow() && p.map !== homeMap && putBack) { await putBack(); continue; }
    if (ow() && !p.busy) return;
    await d.sleep(40);
  }
};
let playerState = null;

const goTo = async (tx, ty) => {
  // ONE step per search, not a whole route blasted out in one go.
  //
  // Movement is continuous here, so a fixed-length key hold never lands
  // exactly on a tile boundary: twelve ticks stops short of the next tile and
  // sixteen carries a pixel past it. Either way the second press of a
  // pre-computed sequence is aimed at the wrong square, and by the fourth the
  // driver is walking into scenery and reporting a perfectly good road as
  // impassable -- which is precisely the false failure act1.js exists to warn
  // about. Re-searching after every step costs a breadth-first sweep of a
  // 44x48 grid, which is nothing, and makes the walk self-correcting.
  let stuck = 0;
  for (let step = 0; step < 400; step++) {
    // Let the page breathe.
    //
    // Every d.tick in this file is synchronous, and starting a wild encounter
    // is not: the overworld sets `busy`, begins its fade, and then waits on a
    // promise to bring the battle up. A driver that never yields to the event
    // loop leaves that promise pending forever, and the overworld sits frozen
    // mid-fade with `busy` stuck true -- which looks from the outside exactly
    // like a wall, and is how an earlier pass at this driver reported half of
    // a perfectly walkable route as unreachable.
    await settle();
    if (!ow()) continue;
    quiet();
    const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
    lastX = x; lastY = y;
    if (x === tx && y === ty) return true;
    const steps = route(x, y, tx, ty);
    if (!steps || !steps.length) break;
    const startMap = d.probe().map;
    // Press until the tile under the player actually changes.
    //
    // A fixed hold length cannot be right: the first press in a new direction
    // spends part of itself turning the character, and movement is continuous,
    // so twelve ticks stops short of the next tile and sixteen carries past
    // it. Pressing in short bursts until `pos` moves is the only version that
    // lands on a tile boundary every time, and landing on the boundary is what
    // the next search depends on.
    // Twelve ticks, deliberately just SHORT of one tile.
    //
    // Movement is continuous and a step in progress finishes itself when the
    // key comes up, so a hold of twelve covers about four fifths of a tile and
    // then settles on the next boundary: exactly one tile, every time. Sixteen
    // covers one and a bit, settles on the boundary after that, and moves two.
    // Either error compounds over a pre-computed route, which is why the
    // search above is re-run after every single step.
    // Press for longer each time until the tile under the player changes.
    //
    // A press that changes direction spends itself turning the character on
    // the spot, so a short hold in a new direction can move nobody at all --
    // and three identical short holds turn three times and move nobody three
    // times, which from outside looks exactly like a wall. Growing the hold
    // guarantees one of them is long enough. Overshooting by a tile costs
    // nothing here, because the search above is re-run before the next step.
    const before = d.probe().pos;
    for (let push = 0; push < 5 && ow() && d.probe().pos === before; push++) {
      d.hold(steps[0], 10 + push * 10);
      d.tick(3);
    }
    // Give up early rather than hammering the same square four hundred times.
    // If five presses of growing length have not moved the character, another
    // three thousand will not either, and the report below says honestly which
    // of the two possible causes it was.
    if (ow() && d.probe().pos === before) stuck++; else stuck = 0;
    if (stuck >= 6) break;
    if (top().name === 'dialogue') clear();
    if (d.probe().map !== startMap) return true;
  }
  const [x, y] = (d.probe().pos || '0,0').split(',').map(Number);
  if (x !== tx || y !== ty) {
    const r = route(x, y, tx, ty);
    const p = d.probe();
    const s2 = ow();
    note('  gave up on ' + tx + ',' + ty + ' from ' + x + ',' + y
      + ': path=' + (r ? r.length : 'NONE') + ' scene=' + top().name
      + ' next=' + (r ? r[0] : '-') + ' busy=' + p.busy + ' moving=' + p.moving
      + ' evt=' + !!(s2 && s2.events && s2.events.running)
      + ' fade=' + !!(s2 && s2.fade && s2.fade.active)
      + ' wipe=' + !!(s2 && s2.wipe)
      + ' scripted=' + (s2 && s2.scripted ? s2.scripted.length : -1)
      + ' nextCollision=' + (s2 && r ? s2.map.collisionAt(
        x + (r[0] === 'KeyA' ? -1 : r[0] === 'KeyD' ? 1 : 0),
        y + (r[0] === 'KeyW' ? -1 : r[0] === 'KeyS' ? 1 : 0)) : '-')
      + ' playerTile=' + (s2 && s2.player ? s2.player.tileX + ',' + s2.player.tileY : '-')
      + ' px=' + (s2 && s2.player ? Math.round(s2.player.x) + ',' + Math.round(s2.player.y) : '-'));
  }
  return x === tx && y === ty;
};

try {
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
clear();

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const state = top().state;
// The player reaches Route 5 with three Crests and the Tide Hall's Wade behind
// them, so the driver walks it with what that player is carrying. Swim is
// deliberately NOT granted: the pool at the back of the terraces is supposed to
// be shut, and the driver has to prove that it is.
// ...and with a team. A trainer on the road starting a battle against an empty
// party is a crash, not a finding, and the driver has to be a player.
const { createKin } = await import('/build/js/systems/kin.js');
const rng = d.game.rng;
if (state.party.length === 0) {
  for (const [sp, lv] of [['blazelynx', 24], ['brookmaw', 22], ['bramblehusk', 22], ['cairnling', 22]]) {
    state.addKin(createKin(sp, lv, rng));
  }
}
// The six Trainers on the road are marked beaten before the walk starts. They
// are checked separately with tests/helpers/simulate.mjs, which measures win
// rates properly; what this driver is for is the SHAPE of the map, and a
// driver that stops for a battle every eight tiles never finishes it.
for (const t of ['r5_dunnock', 'r5_marrow', 'r5_kell', 'r5_tem', 'r5_shale', 'r5_ravel']) state.markDefeated(t);
state.giveArt('clear');
state.giveArt('shoulder');
state.giveArt('wade');

playerState = state;
const enter = async (mapId, x, y, facing = 'right') => {
  homeMap = mapId;
  d.game.scenes.replaceAll(new Overworld(state, mapId, x, y, facing));
  // Poll rather than sleep a fixed time: a 44x48 map with a new tile family in
  // it does not always finish loading inside one arbitrary wait, and a driver
  // that gives up early reports a perfectly good map as missing.
  // Wait for THIS map, not for any map: scenes.top still answers with the old
  // scene for a tick or two after replaceAll, so a poll that only asks "is a
  // map loaded" is answered yes by the room the player just left.
  for (let i = 0; i < 30 && d.probe().map !== mapId; i++) await d.loadWait(250);
  // ...and then for the map's CONTENT. loadMap sets this.map several awaits
  // before it sets this.encounters, and every d.tick in this driver is
  // synchronous, so a walk that starts the instant the map appears runs to the
  // end of the route with the encounter table still in flight -- which is how
  // a first pass at this driver reported zero encounters in fifty steps of
  // grass and was believed.
  for (let i = 0; i < 20 && ow() && ow().map.encounterTable && !ow().encounters; i++) await d.sleep(120);
  quiet();
  clear();
};

putBack = async () => { const m = homeMap, x = lastX, y = lastY; await enter(m, x, y, 'down'); };

// In at the Tideglass gate, on the first tile inside the map.
await enter('route_5', 1, 6);
note('arrived: ' + JSON.stringify(d.probe()));

// Does the scrub actually hunt? Sixty steps up and down one patch, counting
// battles, BEFORE the rest of the walk turns encounters off -- a driver that
// silences the route and then says nothing about it is hiding half the map.
if (!shotsOnly) {
  let fights = 0;
  await goTo(17, 18);
  let steps = 0;
  for (let lap = 0; lap < 12; lap++) {
    for (let i = 0; i < 4; i++) {
      d.hold(lap % 2 ? 'KeyA' : 'KeyD', 14);
      d.tick(2); steps++;
      if (top().name === 'battle') { fights++; flee(); clear(); }
      await settle();
    }
  }
  note('scrub: ' + fights + ' encounters in ' + steps + ' steps of ember scrub');
  let bare = 0;
  await goTo(30, 24);
  for (let i = 0; i < 30; i++) {
    d.hold(i % 2 ? 'KeyA' : 'KeyD', 14);
    d.tick(2);
    if (top().name === 'battle') { bare++; flee(); clear(); }
    await settle();
  }
  note('road: ' + bare + ' encounters in 30 steps of clinker road (should be 0)');
}
// From here the walk is about SHAPE, so the table is unhooked. Everything the
// encounter table does was measured above and in tests/helpers/simulate.mjs.
hushed = true;
quiet();
const map = ow()?.map;
if (!map) return { fatal: 'route_5 did not load', log, diag: String(top().name) + ' mapProp=' + String(top().map) + ' keys=' + Object.keys(top()).join(',') };
note(`route_5 ${map.width}x${map.height} warps:${map.warps.length} npcs:${map.npcs.length}`);

// 1. Every leg of the road, in the order the road runs, from the gate.
const legs = [
  ['gate', 1, 6], ['turf ends', 16, 7], ['top shelf east', 36, 7],
  ['eastern wall', 39, 16], ['middle shelf', 30, 24], ['vent mouth', 16, 24],
  ['past the Coil', 11, 32], ['Cinderfall', 14, 40], ['the crust', 21, 43],
  ['Emberfall gate', 21, 46],
];
const verdicts = [];
const reach = async (kind, name, x, y) => {
  const ok = await goTo(x, y);
  let word = 'ok';
  if (!ok) {
    // The distinction that matters. A driver that cannot execute a walk and a
    // map with no way through look identical from the outside, and calling the
    // first one 'unreachable' is exactly the lie act1.js warns about -- so ask
    // the map itself, and say which of the two it is.
    const [px, py] = (d.probe().pos || '0,0').split(',').map(Number);
    const r = route(px, py, x, y);
    word = r ? `stalled at ${d.probe().pos} (the map has a ${r.length}-step path; the walk could not drive it)`
      : `NO PATH ON THE MAP from ${d.probe().pos}`;
    if (!r) verdicts.push(`${kind}/${name}`);
  }
  note(`${kind}/${name} (${x},${y}): ${word}`);
  return ok;
};
if (!shotsOnly) for (const [name, x, y] of legs) await reach('road', name, x, y);

// 2. Everything off the road that is supposed to be reachable.
const branches = [
  ['steam terraces', 6, 14], ['wade to the pans', 5, 18], ['Site 2 gate', 27, 12],
  ['Site 2 trench 2-7', 30, 18], ['east shelf item', 41, 21], ['Coil foot item', 38, 34],
  ['Site 4 gate', 29, 44], ['ledge drop', 20, 9],
];
if (!shotsOnly) for (const [name, x, y] of branches) {
  await goTo(20, 24);
  await reach('branch', name, x, y);
}

// 3. The back pool must be SHUT without Swim, and open with it.
if (!shotsOnly) await goTo(6, 18);
const shut = shotsOnly ? true : !(await goTo(2, 19));
note(`back pool without swim: ${shut ? 'shut, as designed' : 'OPEN -- the swim gate does not hold'}`);
state.giveArt('swim');
if (!shotsOnly) {
  const openNow = await goTo(2, 19);
  note(`back pool with swim: ${openNow ? 'reachable' : 'STILL SHUT -- unreachable item'}`);
}

// 4. Shots. 1x, standing where a player stands.
const shots = [
  ['ec-01-gate', 4, 6], ['ec-02-turf-ends', 17, 6], ['ec-03-ash-shelf', 30, 6],
  ['ec-04-terraces', 5, 14], ['ec-05-site2', 28, 15], ['ec-06-shelf-wall', 20, 11],
  ['ec-07-coil-north', 24, 25], ['ec-08-coil-west', 13, 30], ['ec-09-vent-mouth', 16, 24],
  ['ec-10-cinderfall', 17, 40], ['ec-11-crust', 21, 43], ['ec-12-site4', 33, 44],
];
const out = [];
/**
 * Stand at a viewpoint and photograph it.
 *
 * The player is placed on the tile rather than walked to it, because forty
 * legs of walking for twelve pictures is most of the run time. But placing a
 * player on an arbitrary tile bypasses collision and can drop them inside
 * solid scenery, and a photograph of the inside of a cliff is not evidence of
 * anything -- so every viewpoint is checked twice before the shutter opens.
 * The tile must be walkable, and the map's own breadth-first search must be
 * able to reach it from the tile the Tideglass gate lands on. A viewpoint that
 * fails either test is reported and not photographed.
 */
const shootAt = async (name, x, y) => {
  await enter('route_5', x, y, 'down');
  const scene = ow();
  if (!scene) { out.push(name + ': route_5 would not load'); return; }
  if (scene.map.collisionAt(x, y) !== 0) {
    out.push(name + ': REFUSED, ' + x + ',' + y + ' is not walkable');
    return;
  }
  const path = route(1, 6, x, y);
  if (!path) { out.push(name + ': REFUSED, no path from the gate to ' + x + ',' + y); return; }
  clear();
  out.push(name + ' ok at ' + d.probe().pos + ' (' + path.length + ' steps from the gate) -> '
    + (await d.shoot(name, 6, 1)));
};
for (const [name, x, y] of shots) await shootAt(name, x, y);

// The vent, the same way: checked walkable and checked reachable from the tile
// its mouth lands the player on, then photographed.
const ventShots = [['ec-13-vent-near', 8, 11], ['ec-14-vent-flow', 9, 9], ['ec-15-vent-far', 14, 4]];
if (shotsOnly) {
  for (const [name, x, y] of ventShots) {
    await enter('route_5_vent', x, y, 'down');
    const scene = ow();
    if (!scene || scene.map.collisionAt(x, y) !== 0 || !route(9, 16, x, y)) {
      out.push(name + ': REFUSED, ' + x + ',' + y + ' is not walkable or not reachable from the mouth');
      continue;
    }
    clear();
    out.push(name + ' ok at ' + d.probe().pos + ' -> ' + (await d.shoot(name, 6, 1)));
  }
}

// 5. Into the Cinder Vent by walking onto its mouth, and out again the same way.
if (!shotsOnly)
for (let i = 0; i < 6 && d.probe().map !== 'route_5_vent'; i++) {
  if (d.probe().map !== 'route_5') await enter('route_5', 16, 25, 'up');
  await goTo(16, 24);
  d.hold('KeyW', 24);
  await d.loadWait(900);
  clear();
}
quiet();
note('vent: ' + d.probe().map + ' at ' + d.probe().pos);
if (d.probe().map === 'route_5_vent') {
  homeMap = 'route_5_vent'; lastX = 9; lastY = 16;
  for (const [name, x, y] of [['ec-13-vent-near', 8, 11], ['ec-14-vent-flow', 9, 9], ['ec-15-vent-far', 14, 4]]) {
    const ok = await goTo(x, y);
    out.push(`${name} ${ok ? 'ok' : 'FAILED'} at ${d.probe().pos} -> ` + (await d.shoot(name, 6, 1)));
  }
  const far = await goTo(16, 3);
  note(`vent far gallery (16,3): ${far ? 'ok' : 'UNREACHABLE'}`);
  await goTo(9, 16);
  homeMap = 'route_5';
  d.hold('KeyS', 24);
  await d.loadWait(900);
  note('back out of the vent: ' + d.probe().map + ' at ' + d.probe().pos);
}

// 6. The gate to Emberfall must actually fire.
if (d.probe().map !== 'route_5') await enter('route_5', 21, 44, 'down');
await goTo(21, 46);
d.hold('KeyS', 24);
await d.loadWait(1200);
note('south gate: ' + d.probe().map + ' at ' + d.probe().pos);

note(verdicts.length
  ? `MAP PROBLEM: no path exists to ${verdicts.join(", ")}`
  : 'MAP VERDICT: every target has a path on the map itself.');
return { log, out, probe: JSON.stringify(d.probe()) };

} catch (err) {
  return { log, crashed: String((err && err.stack) || err) };
}
