// How forgiving is talking to an NPC? Sweep the player across sub-tile offsets
// in front of one and report who answers. Asks the scene directly rather than
// pressing the key, so a trainer or a heal script does not derail the sweep.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const clear = () => { for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10); };

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1400);
clear();

const state = top().state;
const Overworld = top().constructor;
const BODY_W = 11, BODY_H = 9;

async function go(map, x, y, facing) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1200);
  clear();
  return top();
}
const put = (sc, tileX, tileY, offX, offY) => {
  sc.player.x = tileX * 16 + (16 - BODY_W) / 2 + offX;
  sc.player.y = tileY * 16 + (16 - BODY_H) - 1 + offY;
};
function ask(sc, tileX, tileY, offX, offY, facing) {
  put(sc, tileX, tileY, offX, offY);
  sc.player.facing = facing;
  const n = sc.npcInFront();
  return n ? n.data.id : '-';
}

// --- a plain NPC on open ground, swept sideways --------------------------
{
  const sc = await go('route_1', 20, 8, 'up');
  sc.addNpcRuntime({ id: 'alpha', sprite: 'girl', x: 20, y: 7, facing: 'down', movement: { kind: 'static' } });
  d.tick(2);
  const line = [];
  for (let off = -18; off <= 18; off += 2) line.push(off + ':' + ask(sc, 20, 8, off, 0, 'up'));
  out.push('one NPC, sideways sweep facing up:  ' + line.join(' '));

  // Standing a whole tile further back must still be silent.
  const far = [];
  for (const oy of [0, -6, -14]) far.push(oy + ':' + ask(sc, 20, 9, 0, oy, 'up'));
  out.push('a tile further back:  ' + far.join(' '));

  // Facing away.
  out.push('facing down instead: ' + ask(sc, 20, 8, 0, 0, 'down'));
}

// --- two NPCs side by side: the nearer one has to win --------------------
{
  const sc = await go('route_1', 20, 8, 'up');
  sc.addNpcRuntime({ id: 'left', sprite: 'girl', x: 19, y: 7, facing: 'down', movement: { kind: 'static' } });
  sc.addNpcRuntime({ id: 'right', sprite: 'boy', x: 20, y: 7, facing: 'down', movement: { kind: 'static' } });
  d.tick(2);
  const line = [];
  for (let off = -18; off <= 18; off += 2) line.push(off + ':' + ask(sc, 20, 8, off, 0, 'up'));
  out.push('two NPCs abreast, sweep:            ' + line.join(' '));
}

// --- sideways facing ------------------------------------------------------
{
  const sc = await go('route_1', 20, 8, 'left');
  sc.addNpcRuntime({ id: 'westy', sprite: 'girl', x: 19, y: 8, facing: 'right', movement: { kind: 'static' } });
  d.tick(2);
  const line = [];
  for (let off = -18; off <= 18; off += 2) line.push(off + ':' + ask(sc, 20, 8, 0, off, 'left'));
  out.push('one NPC, vertical sweep facing left: ' + line.join(' '));
}

// --- round the end of a counter ------------------------------------------
// hearthmere_house_player row 2 is "IKKffffffkfI": (1,2) and (2,2) are counter,
// (3,2) is open floor. An NPC at (3,2) may be reached from (2,3) leaning
// right -- that is stepping round the counter, not through it. An NPC put on
// the far side of a solid run must not be reachable at all.
{
  const sc = await go('hearthmere_house_player', 4, 3, 'up');
  // (2,3) and (3,3) are a table: solid. (3,2) and (4,2) are open floor.
  sc.addNpcRuntime({ id: 'behindTable', sprite: 'girl', x: 3, y: 2, facing: 'down', movement: { kind: 'static' } });
  d.tick(2);
  out.push('row3 collision 2..5: ' + [2, 3, 4, 5].map((x) => sc.map.collisionAt(x, 3)).join(','));
  const line = [];
  for (const off of [-8, -6, -4, 0, 4]) line.push(off + ':' + ask(sc, 4, 3, off, 0, 'up'));
  out.push('NPC at (3,2), table at (3,3), player in (4,3): ' + line.join(' '));

  sc.addNpcRuntime({ id: 'inTheOpen', sprite: 'boy', x: 4, y: 2, facing: 'down', movement: { kind: 'static' } });
  d.tick(2);
  const line2 = [];
  for (const off of [-8, -6, 0, 6]) line2.push(off + ':' + ask(sc, 4, 3, off, 0, 'up'));
  out.push('same, with someone standing clear at (4,2): ' + line2.join(' '));
}

// --- through a wall -------------------------------------------------------
// hearthmere_house_player row 0 is all wall except the windows. An NPC standing in
// the wall line cannot be talked to from the room below.
{
  const sc = await go('hearthmere_house_player', 5, 2, 'up');
  sc.addNpcRuntime({ id: 'ghost', sprite: 'girl', x: 4, y: 1, facing: 'down', movement: { kind: 'static' } });
  d.tick(2);
  // (4,1) is 'f' floor; (5,1) is 'f' too, so this one should work. Use the
  // counter row instead: an NPC at (1,2) is a counter tile, so nobody stands
  // there -- put one at (0,2)? That is wall. Report what the row looks like.
  out.push('row1 collision 3..6: ' + [3, 4, 5, 6].map((x) => sc.map.collisionAt(x, 1)).join(','));
  out.push('open floor above: ' + ask(sc, 5, 2, 0, 0, 'up') + ' / leaning left ' + ask(sc, 5, 2, -6, 0, 'up'));
}

return { out };
