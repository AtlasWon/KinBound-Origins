// Every door in Aureline, walked into and walked back out of.
//
// The join between an exterior door and the room behind it is the fault this
// project keeps hitting: an entrance drawn on one map and a room built behind it
// with nothing connecting them, or connected one way only. Reading both files
// and comparing coordinates proves the numbers agree; it does not prove the
// player ends up somewhere they can stand. So this actually does it -- steps
// onto the doorway, checks what map it landed on and whether that tile is
// walkable, steps back out, and checks it came out in front of the same door.
const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];

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
for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);

const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const place = async (id, x, y, facing) => {
  d.game.scenes.replaceAll(new Overworld(state, id, x, y, facing));
  await d.loadWait(1200);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8);
};

await place('aureline', 75, 118, 'up');
const doors = [];
const seen = new Set();
for (const w of top().map.warps) {
  if (w.style !== 'door' || seen.has(w.toMap)) continue;
  seen.add(w.toMap);
  doors.push(w);
}

for (const w of doors) {
  // Stand on the pavement in front of the leaf and walk up into it.
  await place('aureline', w.x, w.y + 1, 'up');
  const standing = top().map.collisionAt(w.x, w.y + 1);
  d.hold('KeyW', 20);
  d.tick(6);
  await d.loadWait(900);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  const inside = d.probe();
  if (inside.map !== w.toMap) {
    log.push(`${w.toMap}: DID NOT ENTER from ${w.x},${w.y + 1} (still on ${inside.map}, pavement collision ${standing})`);
    continue;
  }
  const [ix, iy] = (inside.pos || '0,0').split(',').map(Number);
  const solidInside = top().map.collisionAt(ix, iy) === 1;
  // Now walk back out the way a player would. A warp fires on ENTERING its
  // tile, and the player is standing on the interior's doorway already -- so
  // pressing down from here walks at the bottom wall and nothing happens, which
  // is not a broken door, it is a broken test. Step up into the room first.
  d.hold('KeyW', 20);
  d.tick(4);
  d.hold('KeyS', 34);
  d.tick(6);
  await d.loadWait(900);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  const back = d.probe();
  const home = back.map === 'aureline';
  const [bx, by] = (back.pos || '0,0').split(',').map(Number);
  const near = home && Math.abs(bx - w.x) <= 2 && Math.abs(by - (w.y + 1)) <= 2;
  log.push(`${w.toMap}: in at ${ix},${iy}${solidInside ? ' (LANDED IN A WALL)' : ''}`
    + ` | out to ${back.map} ${bx},${by}${near ? ' (in front of the same door)' : ' (WRONG PLACE)'}`);
}

return { log };
