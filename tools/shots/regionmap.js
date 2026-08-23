// The region map, opened from the overworld.
const d = window.dev;
const top = () => d.game.scenes.top;
await d.loadWait(1400);
d.key('Enter', 4); d.key('Enter', 30); d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

// Visit a few places so the map has something filled in.
const state = top().state;
for (const m of ['marrow_hollow', 'route_1', 'ashgate', 'route_2']) state.visitMap(m);

d.key('KeyM', 6);
// The scene fetches places.json in its enter(), and ticks alone never let a
// promise resolve.
await d.loadWait(900);
const out = ['scene: ' + top().name];
await d.shoot('map-01', 12);
d.key('KeyD', 10);
await d.shoot('map-02', 8);
d.key('KeyS', 10);
await d.shoot('map-03', 8);
return { out };
