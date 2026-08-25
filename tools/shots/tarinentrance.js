// Leaving the Sorrell lab with a starter: Tarin's entrance, frame by frame.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
await d.loadWait(1400);
for (let i = 0; i < 12 && typeof top().rows !== 'function'; i++) d.key('Enter', 30);
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
st.setFlag('met_tarin');
st.setFlag('got_starter');
st.setFlag('starter_sprigling');
if (st.party.length === 0) {
  st.addKin(kinMod.createKin('sprigling', 6, d.game.rng, { originalTrainer: 'player' }));
}
await ow.loadMap(d.game, 'hearthmere', 22, 7, 'down');
await d.loadWait(700);
out.push('at ' + JSON.stringify(d.probe()));
await d.shoot('tarin-' + tag + '-00-door', 4);

// Step out onto the road; the step trigger fires on landing.
d.walk('down', 1);
out.push('after step ' + JSON.stringify(d.probe()));
const npcAt = () => {
  const n = top().npcs && top().npcs.find((q) => q.data.id === 'hm_tarin');
  return n ? n.actor.tileX + ',' + n.actor.tileY : 'none';
};
for (let i = 1; i <= 12; i++) {
  await d.shoot('tarin-' + tag + '-' + String(i).padStart(2, '0') + '-run', 9);
  out.push('t' + i + ' scene=' + top().name + ' tarin=' + (top().npcs ? npcAt() : 'n/a'));
}
return { out };
