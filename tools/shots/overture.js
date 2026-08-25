// The returning player's six seconds, all six of them.
//
// Each overture is one of the film's shots at its authored speed with its own
// line under it, and then the title card. Three frames of the picture and one
// of the card, per rotation.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(400);
const mod = await import('/build/js/scenes/title.js');
const open = await import('/build/js/scenes/opening.js');
const state = await import('/build/js/systems/state.js');

for (let k = 0; k < 6; k++) {
  d.game.scenes.replaceAll(new open.OpeningScene(new state.GameState(), {
    cut: 'overture',
    overture: k === 5 ? 6 : k,   // the six shots an overture may be built on
    handOff: (g) => g.scenes.replaceAll(new mod.TitleScene('handed', 180)),
  }));
  d.tick(2);
  for (const at of [50, 110, 180]) {
    while (top().name === 'opening' && top().shot === 0 && top().t < at) d.tick(4);
    await d.shoot('ov-' + k + '-' + at, 0);
  }
  let guard = 0;
  while (top().name === 'opening' && top().shot === 0 && guard++ < 200) d.tick(4);
  d.tick(120);
  await d.shoot('ov-' + k + '-card', 0);
  out.push(k + ': ' + top().name + ' shot ' + top().shot + ' t=' + top().t);
}

return { out };
