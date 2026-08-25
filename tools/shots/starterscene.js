// The starter choice screen -- the exact screen the player screenshotted.
const d = window.dev;
const top = () => d.game.scenes.top;
await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
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
