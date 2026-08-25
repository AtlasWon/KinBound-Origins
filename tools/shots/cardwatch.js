// The title card at real speed. It is the last thing in the film and the first
// thing in the menu now, so every beat of it matters: the rise, the landing
// flash, the subtitle, the shine, and the dip into the start screen.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(400);
const open = await import('/build/js/scenes/opening.js');
const state = await import('/build/js/systems/state.js');
const title = await import('/build/js/scenes/title.js');

d.game.scenes.replaceAll(new open.OpeningScene(new state.GameState(), {
  handOff: (g, cardT) => g.scenes.replaceAll(new title.TitleScene('handed', cardT)),
}));
d.tick(2);
const s = top();
s.shot = 7; s.t = 0; s.veil = 1;

for (let i = 0; i < 14; i++) {
  const cur = top();
  out.push(i + ': ' + cur.name + ' t=' + (cur.t ?? '-') + ' hand=' + (cur.hand ?? '-'));
  await d.shoot('card-' + String(i).padStart(2, '0'), 0);
  d.tick(18);
}

return { out };
