// Stand in a list of places and photograph what a player would actually see.
// One 240x160 view per entry -- the keyhole judgement that the atlas cannot make.
const d = window.dev;
const top = () => d.game.scenes.top;
await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const SPOTS = [["in2-house","hearthmere_house_player",6,5,"up"],["in2-brack","brackwater_house",6,5,"up"],["in2-kb","kellowmere_house_b",6,5,"up"]];
const out = [];
for (const [name, map, x, y, facing] of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing || 'down'));
  await d.loadWait(1000);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(30);
  out.push(name + ' @ ' + (d.probe().map || '?') + ' ' + d.probe().pos);
  await d.shoot('eye-' + name, 8, 3);
}
return { out };
