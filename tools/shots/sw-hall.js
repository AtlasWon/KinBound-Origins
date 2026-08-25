// The Stone Hall, played.
//
// Walks the challenge end to end on a fresh save with a levelled party: in the
// front door, down the cage, three stones onto three plates, past the hands,
// down to Roxen, beat her, take the Crest, and out up the man-engine. Every
// beat reports state, because a puzzle that compiles is not a puzzle that can
// be solved -- the only proof is a counter that reaches three and a gate that
// opens.
//
//   npx electron tools/capture.cjs tools/shots/sw-hall.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const ow = () => d.game.scenes.find('overworld') || top();
const probe = () => d.probe();
const pos = () => (probe().pos || '-1,-1').split(',').map(Number);

/**
 * Clear whatever is on top of the field.
 *
 * Not just dialogue: the workings have trainers with sight lines in them, so a
 * driver that only presses through text walks into a battle and then reports
 * every position after it as undefined. Fighting them is part of walking the
 * Hall, so this fights them.
 */
const clear = () => {
  // Being spotted is not instant: the bubble pops, the music cuts and the
  // trainer walks over before anything appears on the stack. A clear() that
  // looks once sees an empty stack and walks off mid-approach, so this waits
  // for the field to stop being busy first.
  for (let i = 0; i < 200 && d.probe().busy === true; i++) d.tick(4);
  for (let n = 0; n < 6; n++) {
    for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
    if (d.game.scenes.find('battle')) {
      for (let i = 0; i < 900 && d.game.scenes.find('battle'); i++) d.key('Enter', 6);
      d.tick(40);
      continue;
    }
    break;
  }
  d.tick(4);
};

/** Put the player on a tile without walking there. Setup only, never a test. */
const place = (x, y, facing) => {
  const sc = d.game.scenes.find('overworld') || top();
  sc.player.setTile(x, y);
  if (facing) sc.player.facing = facing;
  sc.lastTile = { x, y };
  d.tick(2);
};

/** Single-tile steps with feedback; alternates axes when it hits furniture. */
const walkTo = (tx, ty) => {
  let stuck = 0;
  for (let i = 0; i < 200; i++) {
    const [x, y] = pos();
    if (x === tx && y === ty) return true;
    const wantX = x < tx ? 'right' : x > tx ? 'left' : null;
    const wantY = y < ty ? 'down' : y > ty ? 'up' : null;
    const order = stuck % 2 === 0 ? [wantX, wantY] : [wantY, wantX];
    let moved = false;
    for (const dir of order) {
      if (!dir) continue;
      d.walk(dir, 1);
      clear();
      const [nx, ny] = pos();
      if (nx !== x || ny !== y) { moved = true; break; }
    }
    if (!moved) { stuck++; if (stuck > 8) return false; }
  }
  return false;
};

/**
 * Shove a stone until the plate count goes up.
 *
 * Not a fixed number of pushes: a walk of "one tile" is a held key, and one
 * extra frame of it is one extra push, which walks the stone straight back off
 * the plate it just pressed. The counter is the only thing that knows.
 */
const shoveOnto = (dir, want, max = 8) => {
  for (let i = 0; i < max; i++) {
    if (state.getVar('stonewake_mine_plates') >= want) return true;
    d.walk(dir, 1);
    clear();
    d.tick(20);
  }
  return state.getVar('stonewake_mine_plates') >= want;
};

await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 80; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;
const kinMod = await import('/build/js/systems/kin.js');
const rngMod = await import('/build/js/core/rng.js');
const rng = new rngMod.Rng(20260825);

// Deliberately over-levelled. This driver is a route test, not a difficulty
// test -- tests/helpers/simulate.mjs measures the fights -- and a party that
// whites out halfway through gets warped home, after which every "place the
// player here" below is placing them in a bedroom in Hearthmere and reporting
// that nothing moved.
state.party.length = 0;
for (const [species, level] of [['brookmaw', 24], ['bramblehusk', 24], ['tuftail', 22]]) {
  state.party.push(kinMod.createKin(species, level, rng));
}
state.giveItem('strong_potion', 6);
out.push('party: ' + state.party.map((k) => k.species + ':' + k.level).join(' '));

/* ------------------------------------------------------------- the Hall */

d.game.scenes.replaceAll(new Overworld(state, 'stonewake', 41, 9, 'up'));
await d.loadWait(1200);
clear();
await d.shoot('hall-01-front', 8, 1);

walkTo(41, 8);
d.walk('up', 1);
await d.loadWait(1200);
clear();
out.push('through the door: ' + probe().map + ' ' + probe().pos);
await d.shoot('hall-02-lobby', 8, 1);

// The clerk, on the way past.
walkTo(9, 9);
d.key('KeyW'); d.key('Enter', 20);
clear();

walkTo(10, 4);
d.walk('up', 1);
await d.loadWait(1200);
clear();
out.push('down the cage: ' + probe().map + ' ' + probe().pos);
await d.shoot('hall-03-mine', 8, 1);

/* ------------------------------------------------------------ the stones */

const plates = () => state.getVar('stonewake_mine_plates');
out.push('plates at the start: ' + plates());

// Both hands have sight lines down the side galleries, so they are fought
// first and deliberately rather than walked into halfway through a push.
for (const [x, y] of [[3, 8], [20, 8]]) {
  clear();
  place(x, y - 1, 'down');
  d.walk('down', 1);
  clear();
}
out.push('hands beaten: ' + ['sw_hall_delve_a', 'sw_hall_delve_b']
  .map((t) => t + '=' + state.hasDefeated(t)).join(' ')
  + '  still in the mine: ' + (d.probe().map === 'stonewake_mine'));
for (const k of state.party) { k.hp = k.maxHp; for (const m of k.moves) m.pp = m.maxPp; }

// The stones are the test; getting to them is not, so the player is placed
// behind each one and then pushes it the whole way on foot.
// West stone: 3,4 down onto the plate at 3,6.
place(3, 3, 'down');
shoveOnto('down', 1);
out.push('west stone: plates=' + plates() + ' player at ' + probe().pos);

// East stone: 20,4 down onto the plate at 20,6.
place(20, 3, 'down');
shoveOnto('down', 2);
out.push('east stone: plates=' + plates() + ' player at ' + probe().pos);

// Middle stone: 11,8 east round the pillar at 11,10, then south to 13,12.
// Two stones down, one to go: the hands must still be standing across the neck.
place(12, 12, 'down');
d.walk('down', 1);
clear();
out.push('neck with ' + plates() + ' plates: player at ' + probe().pos
  + ' (still row 12 means the hands hold)');

// Round the pillar: shove east until the stone is clear of column 11, then
// come at it from above. A held key can carry a stone two tiles, so where it
// actually ended up is read off the scene rather than assumed.
place(10, 8, 'right');
const stoneX = () => {
  const b = (d.game.scenes.find('overworld') || top()).boulders
    .filter((s2) => s2.y === 8).sort((a, b2) => a.x - b2.x).pop();
  return b ? b.x : -1;
};
for (let i = 0; i < 4 && stoneX() < 12; i++) { d.walk('right', 1); clear(); d.tick(20); }
const sx = stoneX();
out.push('middle stone rounded the pillar to x=' + sx);
place(sx, 7, 'down');
shoveOnto('down', 3);
out.push('middle stone: plates=' + plates() + ' player at ' + probe().pos);
await d.shoot('hall-04-plates', 8, 1);

/* -------------------------------------------------------------- the gate */

// Walked, not placed: the two hands standing across the neck are the gate, and
// the only way to know they hold is to try to walk through them.
place(12, 11, 'down');
d.walk('down', 1);
clear();
d.walk('down', 1);
clear();
out.push('gate: cage_open=' + state.hasFlag('hall2_cage_open') + ' plates=' + plates()
  + ' player at ' + probe().pos + ' (13 is past the hands)');
await d.shoot('hall-05-gate', 8, 1);

walkTo(11, 16);
await d.loadWait(1200);
clear();
out.push('deep gallery: ' + probe().map + ' ' + probe().pos);
await d.shoot('hall-06-deep', 8, 1);

/* --------------------------------------------------------------- Roxen */

// The two hands on the way down are real fights; a player would walk out to the
// clinic before knocking on her door, so the party is healed here rather than
// measuring a Keeper against a team that has already been through two battles.
for (const k of state.party) { k.hp = k.maxHp; k.status = 'none'; for (const m of k.moves) m.pp = m.maxPp; }

place(9, 3, 'up');
d.tick(10);
d.key('Enter', 20);
for (let i = 0; i < 60 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(40);
out.push('after talking: scene=' + top().name);
await d.shoot('hall-07-keeper', 8, 1);

// Fight it out: pick the top move every turn until the battle resolves.
for (let i = 0; i < 700 && d.game.scenes.find('battle'); i++) {
  d.key('Enter', 6);
  if (i === 30) await d.shoot('hall-08-battle', 4, 1);
}
d.tick(40);
// The reward is a long scene -- Crest, field art, two Potions, and the two
// boxes about the soundings -- so this presses well past where it looks done.
for (let n = 0; n < 4; n++) {
  for (let i = 0; i < 80 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(30);
}

out.push('crest 2: ' + state.crests.has(2) + '  shoulder: ' + state.hasArt('shoulder')
  + '  flag: ' + state.hasFlag('crest_2_taken') + '  party alive: '
  + state.party.filter((k) => k.hp > 0).length);
await d.shoot('hall-09-after', 8, 1);

/* ----------------------------------------------- the way back up, and the stone */

if (state.hasArt('shoulder')) {
  place(3, 2, 'up');
  d.walk('up', 1);
  await d.loadWait(1200);
  clear();
  out.push('man-engine up: ' + probe().map + ' ' + probe().pos);
  await d.shoot('hall-10-back-up', 8, 1);

  place(10, 16, 'down');
  d.walk('down', 1);
  await d.loadWait(1200);
  clear();
  out.push('back outside: ' + probe().map + ' ' + probe().pos);

  // And the stopped west working, which Shoulder is what opens.
  d.game.scenes.replaceAll(new Overworld(state, 'stonewake', 5, 5, 'up'));
  await d.loadWait(1100);
  clear();
  place(5, 4, 'up');
  for (let i = 0; i < 3; i++) { d.walk('up', 1); clear(); d.tick(20); }
  walkTo(6, 1);
  clear();
  d.key('Enter', 16);
  clear();
  walkTo(4, 1);
  d.key('Enter', 16);
  clear();
  out.push('west working: ' + probe().map + ' ' + probe().pos
    + ' potion=' + state.hasFlag('item_sw_westworking')
    + ' vessel=' + state.hasFlag('item_sw_westworking2'));
  await d.shoot('hall-11-west-working', 8, 1);
}

return { out };
