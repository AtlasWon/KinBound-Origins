// Leaving the Vess lab with a starter: Perrin's entrance, frame by frame.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
await d.loadWait(1400);
d.key('Enter', 4); d.key('Enter', 30); d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const R = await import('/build/js/engine/renderer.js');
const tag = R.SCREEN_W + 'x' + R.SCREEN_H;
const kinMod = await import('/build/js/systems/kin.js');
const ow = top();
const st = ow.state;
st.setFlag('mom_sendoff');
st.setFlag('met_perrin');
st.setFlag('got_starter');
st.setFlag('starter_sprigling');
if (st.party.length === 0) {
  st.addKin(kinMod.createKin('sprigling', 6, d.game.rng, { originalTrainer: 'player' }));
}
await ow.loadMap(d.game, 'marrow_hollow', 22, 7, 'down');
await d.loadWait(700);
out.push('at ' + JSON.stringify(d.probe()));
await d.shoot('perrin-' + tag + '-00-door', 4);

// Step out onto the road; the step trigger fires on landing.
d.walk('down', 1);
out.push('after step ' + JSON.stringify(d.probe()));
const npcAt = () => {
  const n = top().npcs && top().npcs.find((q) => q.data.id === 'mh_perrin');
  return n ? n.actor.tileX + ',' + n.actor.tileY : 'none';
};
for (let i = 1; i <= 12; i++) {
  await d.shoot('perrin-' + tag + '-' + String(i).padStart(2, '0') + '-run', 9);
  out.push('t' + i + ' scene=' + top().name + ' perrin=' + (top().npcs ? npcAt() : 'n/a'));
}
return { out };
