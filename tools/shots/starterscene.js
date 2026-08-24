// The starter choice screen -- the exact screen the player screenshotted.
const d = window.dev;
const top = () => d.game.scenes.top;
await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const mod = await import('/build/js/scenes/starter.js');
d.game.scenes.push(new mod.StarterScene(top().state,
  ['sprigling', 'cinderpaw', 'rilltail'], () => {}));
d.tick(4);
const out = ['scene: ' + top().name];
await d.shoot('starter-01', 10);
d.key('KeyD', 8);
await d.shoot('starter-02', 8);
d.key('KeyD', 8);
await d.shoot('starter-03', 8);
return { out };
