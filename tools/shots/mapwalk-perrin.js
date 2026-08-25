// Proof that Marrow Hollow's redrawn streets still carry the Perrin cutscenes.
// Scripted movers ignore collision, so the only way to know Perrin is on the
// road and not inside a wall is to run him and read off where he stops.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
await d.loadWait(1400);
// Press through the title and menu until the creator is up, then straight out
// of it. If the presses have already carried us into the world, take that.
for (let i = 0; i < 60 && top().name !== 'creator' && top().name !== 'overworld'; i++) d.key('Enter', 12);
if (top().name === 'creator') {
  for (let i = 0; i < 40; i++) {
    const rows = top().rows();
    if ((rows[top().sel] || {}).action === 'begin') break;
    d.key('KeyS', 2);
  }
  d.key('Enter', 60);
  await d.loadWait(1600);
}
if (top().name === 'dialogue') for (let i = 0; i < 60 && top().name === 'dialogue'; i++) d.key('Enter', 8);
if (!top().state) throw new Error('no game state; stuck on ' + top().name);

const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
state.setFlag('mom_sendoff', true);

// Stand where the front door drops you and walk the one step that fires it.
d.game.scenes.replaceAll(new Overworld(state, 'marrow_hollow', 6, 7, 'down'));
await d.loadWait(1200);
const sc = () => d.game.scenes.find('overworld');
const perrin = () => (sc().npcs || []).find((n) => n.data.id === 'mh_perrin');
out.push('perrin idles at ' + (perrin() ? perrin().actor.tileX + ',' + perrin().actor.tileY : 'absent'));

d.hold('KeyS', 24);
d.tick(40);
out.push('after step: scene=' + top().name + ' busy=' + sc().busy);

// Press through the whole conversation, then let the run to the door finish.
for (let i = 0; i < 200; i++) {
  if (top().name === 'dialogue') d.key('Enter', 6);
  else d.tick(6);
}
d.tick(400);
out.push('perrin after departure: ' + (perrin() ? perrin().actor.tileX + ',' + perrin().actor.tileY : 'gone (entered the laboratory)'));
out.push('player: ' + JSON.stringify(d.probe()));
await d.shoot('perrin-after', 8, 3);

// The coda: leaving the laboratory onto the road below its door.
state.setFlag('got_starter', true);
d.game.scenes.replaceAll(new Overworld(state, 'marrow_hollow', 22, 7, 'down'));
await d.loadWait(1200);
d.hold('KeyS', 24);
d.tick(60);
out.push('coda fired: scene=' + top().name);
for (let i = 0; i < 120; i++) {
  if (top().name === 'dialogue') d.key('Enter', 6); else d.tick(6);
  const p = perrin();
  if (p && p.actor.tileY <= 11) { out.push('perrin runs up the road at ' + p.actor.tileX + ',' + p.actor.tileY); break; }
}
await d.shoot('perrin-coda', 8, 3);
out.push('end: ' + JSON.stringify(d.probe()));
return { out };
