// Proof that Hearthmere's redrawn streets still carry the Tarin cutscenes.
// Scripted movers ignore collision, so the only way to know Tarin is on the
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
d.game.scenes.replaceAll(new Overworld(state, 'hearthmere', 6, 7, 'down'));
await d.loadWait(1200);
const sc = () => d.game.scenes.find('overworld');
const tarin = () => (sc().npcs || []).find((n) => n.data.id === 'hm_tarin');
out.push('tarin idles at ' + (tarin() ? tarin().actor.tileX + ',' + tarin().actor.tileY : 'absent'));

d.hold('KeyS', 24);
d.tick(40);
out.push('after step: scene=' + top().name + ' busy=' + sc().busy);

// Press through the whole conversation, then let the run to the door finish.
for (let i = 0; i < 200; i++) {
  if (top().name === 'dialogue') d.key('Enter', 6);
  else d.tick(6);
}
d.tick(400);
out.push('tarin after departure: ' + (tarin() ? tarin().actor.tileX + ',' + tarin().actor.tileY : 'gone (entered the laboratory)'));
out.push('player: ' + JSON.stringify(d.probe()));
await d.shoot('tarin-after', 8, 3);

// The coda: leaving the laboratory onto the road below its door.
state.setFlag('got_starter', true);
d.game.scenes.replaceAll(new Overworld(state, 'hearthmere', 22, 7, 'down'));
await d.loadWait(1200);
d.hold('KeyS', 24);
d.tick(60);
out.push('coda fired: scene=' + top().name);
for (let i = 0; i < 120; i++) {
  if (top().name === 'dialogue') d.key('Enter', 6); else d.tick(6);
  const p = tarin();
  if (p && p.actor.tileY <= 11) { out.push('tarin runs up the road at ' + p.actor.tileX + ',' + p.actor.tileY); break; }
}
await d.shoot('tarin-coda', 8, 3);
out.push('end: ' + JSON.stringify(d.probe()));
return { out };
