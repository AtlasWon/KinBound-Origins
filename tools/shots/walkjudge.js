// End to end: measure the one walking speed in open ground, check the old run
// key does nothing, and talk to someone off-centre with the actual key.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const clear = () => { for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10); };

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

// --- speed, measured in a long clear corridor (route_1 column 22..27) -----
{
  d.game.scenes.replaceAll(new Overworld(state, 'route_1', 24, 2, 'down'));
  await d.loadWait(1200);
  clear();
  const sc = top();
  const y0 = sc.player.y;
  d.down('KeyS'); d.tick(60); d.up('KeyS'); d.tick(1);
  const plain = (sc.player.y - y0) / 60;
  out.push('walk: ' + plain.toFixed(2) + ' px/tick = ' + (plain * 60 / 16).toFixed(1) + ' tiles/sec');

  const y1 = sc.player.y;
  d.down('ShiftLeft'); d.down('KeyS'); d.tick(60); d.up('KeyS'); d.up('ShiftLeft'); d.tick(1);
  const shifted = (sc.player.y - y1) / 60;
  out.push('with shift held: ' + shifted.toFixed(2) + ' px/tick (' +
    (Math.abs(shifted - plain) < 0.001 ? 'no sprint, good' : 'STILL SPRINTS') + ')');

  out.push('run bound to anything: ' + JSON.stringify(d.game.input.bindings.run ?? null));
  out.push('autoRun setting: ' + JSON.stringify(d.game.settings.autoRun ?? null));
}

// --- talking off-centre with the real key, plain NPC, fresh scene each try
const tries = [];
for (const off of [0, 6, 10, 14, -10, -14]) {
  d.game.scenes.replaceAll(new Overworld(state, 'route_1', 24, 8, 'up'));
  await d.loadWait(900);
  clear();
  const sc = top();
  sc.addNpcRuntime({ id: 'chatty', sprite: 'girl', x: 24, y: 7, facing: 'down', movement: { kind: 'static' } });
  d.tick(2);
  sc.player.x = 24 * 16 + 2.5 + off;
  sc.player.facing = 'up';
  d.tick(1);
  d.key('Enter', 4);
  tries.push(off + ':' + (top().name === 'dialogue' ? 'talks' : '-'));
  clear();
}
out.push('off-centre talk, real key press: ' + tries.join(' '));

// --- a look at the town at 1x --------------------------------------------
d.game.scenes.replaceAll(new Overworld(state, 'hearthmere', 15, 9, 'up'));
await d.loadWait(1400);
clear();
await d.shoot('judge-town-1x', 6, 1);

return { out, probe: d.probe() };
