// Plays the Route 2 ruin beat from a standing start: walk into the clearing,
// the keepsake answers, the arch opens, the scout is on the shelf above it.
// Then inside, to the back wall.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

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
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const state = top().state;
const Overworld = top().constructor;

// Everything the beat is gated on: a party to walk with, and the keepsake.
state.giveItem('tideheart', 1);
state.setFlag('tideheart_given');
if (state.party.length === 0) {
  const kin = await import('/build/js/systems/kin.js');
  state.addKin(kin.createKin('sprigling', 8, d.game.rng));
}

d.game.scenes.replaceAll(new Overworld(state, 'route_2', 25, 12, 'up'));
await d.loadWait(1100);
await d.shoot('rb-00-approach', 8, 1);

// Walk north into the clearing. One tile at a time with feedback, because
// d.walk() alone overshoots into the cliff.
for (let step = 0; step < 3; step++) {
  if (top().name !== 'overworld') break;
  d.walk('up', 1);
  d.tick(6);
}
d.tick(30);
out.push('after walk: ' + JSON.stringify(d.probe()));

// Page through the scene, photographing every box.
let shot = 1;
for (let i = 0; i < 40; i++) {
  d.tick(20);
  const p = d.probe();
  if (p.scene === 'dialogue') {
    await d.shoot('rb-' + String(shot++).padStart(2, '0') + '-scene', 2, 1);
    out.push('  box: ' + (p.text || '').slice(0, 78));
    d.key('Enter', 12);
  } else if (top().events && top().events.running) {
    d.tick(20);
  } else {
    break;
  }
}
d.tick(40);
out.push('after scene: ' + JSON.stringify(d.probe()));
await d.shoot('rb-90-after', 10, 1);
out.push('ruin open flag: ' + state.hasFlag('r2_ruin_open') + ' scout gone: ' + state.hasFlag('r2_scout_gone'));

// Inside.
d.game.scenes.replaceAll(new Overworld(state, 'route_2_ruin', 9, 14, 'up'));
await d.loadWait(1000);
await d.shoot('rb-91-inside', 8, 1);
// Round the pool: the chamber's water blocks the middle, so the way to the
// back wall is up one side and along the top.
const path = [['up', 7], ['left', 5], ['up', 6], ['right', 5]];
for (const [dir, n] of path) {
  for (let i = 0; i < n; i++) {
    if (top().name !== 'overworld') break;
    d.walk(dir, 1);
    d.tick(4);
  }
}
d.tick(30);
out.push('inside: ' + JSON.stringify(d.probe()));
shot = 1;
for (let i = 0; i < 40; i++) {
  d.tick(20);
  const p = d.probe();
  if (p.scene === 'dialogue') {
    await d.shoot('rb-c' + String(shot++).padStart(2, '0'), 2, 1);
    out.push('  carving: ' + (p.text || '').slice(0, 78));
    d.key('Enter', 12);
  } else if (top().events && top().events.running) {
    d.tick(20);
  } else {
    break;
  }
}
out.push('echo filed: ' + state.hasFlag('tideheart_echo_sunken_arch')
  + ' read: ' + state.hasFlag('r2_ruin_read'));
return { out };
