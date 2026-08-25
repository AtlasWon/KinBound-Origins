const d = window.dev;
const top = () => d.game.scenes.top;
const clear = () => { for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 10); d.tick(4); };
await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const go = async (m, x, y, f) => { d.game.scenes.replaceAll(new Overworld(state, m, x, y, f)); await d.loadWait(900); clear(); };
const out = [];
// Both leaves of the lab's double door must lead inside.
for (const x of [22, 23]) {
  await go('hearthmere', x, 7, 'up');
  d.hold('KeyW', 40); await d.loadWait(1400); clear();
  out.push(`lab leaf x=${x} -> ${d.probe().map} ${d.probe().pos}`);
}
// And every interior door, walked into from the tile in front of it.
for (const [m, x, y] of [
  ['hearthmere_house_player', 6, 6], ['briarbell_provisioner', 6, 6],
  ['briarbell_clinic', 6, 8], ['tanners_concord', 6, 8], ['sorrell_lab', 8, 9],
]) {
  await go(m, x, y, 'down');
  d.hold('KeyS', 40); await d.loadWait(1400); clear();
  out.push(`${m} door -> ${d.probe().map} ${d.probe().pos}`);
}
return { out };
