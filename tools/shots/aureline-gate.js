// The Southgate seam, walked in both directions.
//
// The road into the capital is the one join in Act 4 that two agents had to
// agree on blind. Reading both warp tables proves the numbers match; walking it
// proves the player arrives on ground they can stand on and can turn round and
// go back.
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
const place = async (id, x, y, f) => {
  d.game.scenes.replaceAll(new Overworld(state, id, x, y, f));
  await d.loadWait(1300);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 8);
};

// Out of the city, south, onto the Central Road.
await place('aureline', 75, 116, 'down');
log.push(`start ${d.probe().map} ${d.probe().pos}`);
d.hold('KeyS', 60); d.tick(6);
await d.loadWait(1000);
log.push(`walked south -> ${d.probe().map} ${d.probe().pos}`);
await d.shoot('au-gate-out', 6);

// And straight back in.
d.hold('KeyW', 90); d.tick(6);
await d.loadWait(1000);
log.push(`walked back north -> ${d.probe().map} ${d.probe().pos}`);
await d.shoot('au-gate-in', 6);
return { log };
