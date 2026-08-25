// The three ways out of the film that are not sitting through it, and the way
// back in from character creation.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(400);
const mod = await import('/build/js/scenes/title.js');

/* 1. A press in the middle of the full film. It must not cut to black and
      dump the player somewhere: it must go to the title card. */
localStorage.clear();
mod.resetTitleSession();
d.game.scenes.replaceAll(new mod.TitleScene());
d.tick(2);
while (top().name === 'opening' && top().shot < 2) d.tick(10);
out.push('pressing at shot ' + top().shot);
d.key('Enter', 1);
out.push('-> shot ' + top().shot + ' of ' + top().reel.length + ' (the card is the last)');
for (let i = 0; i < 8; i++) { await d.shoot('path-hurry-' + i, 0); d.tick(30); }
let g = 0;
while (top().name !== 'title' && g++ < 400) d.tick(5);
d.tick(150);
out.push('landed: ' + top().name);
await d.shoot('path-hurry-end', 0);

/* 2. Backing out of character creation. The film must not replay, and the
      screen must arrive without the crane it does after the cinematic. */
const creator = await import('/build/js/scenes/creator.js');
const state = await import('/build/js/systems/state.js');
d.game.scenes.replaceAll(new creator.CreatorScene(new state.GameState()));
d.tick(40);
d.key('Escape', 4);
d.tick(6);
out.push('escape from the creator -> ' + top().name);
for (let i = 0; i < 4; i++) { await d.shoot('path-back-' + i, 0); d.tick(9); }
d.tick(120);
await d.shoot('path-back-end', 0);
out.push('settled: ' + top().name + ' carried=' + top().carried);

return { out };
