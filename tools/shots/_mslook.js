const d = window.dev;
const top = () => d.game.scenes.top;
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
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 8);
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const state = top().state;
state.giveArt('wade'); state.giveArt('shoulder');
// Suppress the scenes; this pass is only about how the rooms look.
for (const f of ['ms_arrived', 'msd_entered', 'msd_crossed', 'msh_met', 'msd_split']) state.setFlag(f);
const out = [];
const look = async (map, x, y, name) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, 'up'));
  for (let i = 0; i < 40; i++) { d.tick(6); await d.sleep(80); if (top().map && top().map.id === map) break; }
  for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 6);
  d.tick(20);
  out.push(await d.shoot(name, 6, 1));
};
await look('mirehaven_sanctum', 9, 13, 'look-a-mire-door');
await look('mirehaven_sanctum', 9, 5, 'look-a-camp');
await look('mirehaven_sanctum_deep', 9, 14, 'look-b-causeway');
await look('mirehaven_sanctum_deep', 5, 6, 'look-b-westarm');
await look('mirehaven_sanctum_deep', 9, 4, 'look-b-shutter');
await look('mirehaven_sanctum_heart', 9, 5, 'look-c-heart');
return out;
