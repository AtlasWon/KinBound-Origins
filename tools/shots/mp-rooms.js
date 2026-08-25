// The four smaller jobs, photographed: the doorway now in the wall run, the
// professor clear of the kin behind him, and Hearthmere's west edge.
const d = window.dev;
const top = () => d.game.scenes.top;
const clear = () => { for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 10); d.tick(4); };

await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const SPOTS = [
  ['sorrell_lab', 8, 8, 'down', 'lab-door'],
  ['sorrell_lab', 8, 5, 'up', 'lab-sorrell'],
  ['hearthmere_house_player', 6, 5, 'down', 'room-house'],
  ['briarbell_clinic', 6, 7, 'down', 'room-clinic'],
  ['tanners_concord', 6, 7, 'down', 'room-concord'],
  ['hearthmere', 4, 10, 'left', 'hollow-west'],
  ['hearthmere', 4, 18, 'left', 'hollow-southwest'],
  ['hearthmere', 21, 7, 'up', 'hollow-lab'],
];

const out = [];
for (const [map, x, y, facing, tag] of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1000);
  clear();
  out.push(tag + ' ' + (d.probe().pos || '?'));
  await d.shoot('mp-' + tag, 6, 1);
}
return { out };
