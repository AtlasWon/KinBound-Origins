// The starter counter: idle on each of the three, then the take + settle beat.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
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

const R = await import('/build/js/engine/renderer.js');
out.push('view ' + R.SCREEN_W + 'x' + R.SCREEN_H);

const mod = await import('/build/js/scenes/starter.js');
const state = top().state;
d.game.scenes.push(new mod.StarterScene(state,
  ['sprigling', 'cinderpaw', 'rilltail'], () => { out.push('onDone'); }));
d.tick(4);
const tag = R.SCREEN_W + 'x' + R.SCREEN_H;
await d.shoot('ctr-' + tag + '-01-first', 10);
d.key('KeyD', 10);
await d.shoot('ctr-' + tag + '-02-second', 8);
d.key('KeyD', 10);
await d.shoot('ctr-' + tag + '-03-third', 8);
d.key('KeyA', 10);

// Confirm the middle one.
d.key('Enter', 8);
out.push('after confirm: ' + top().name);
await d.shoot('ctr-' + tag + '-04-ask', 6);
for (let i = 0; i < 8 && top().name === 'dialogue'; i++) d.key('Enter', 6);
out.push('after yes: ' + top().name);
await d.shoot('ctr-' + tag + '-05-take-a', 6);
await d.shoot('ctr-' + tag + '-06-take-b', 10);
await d.shoot('ctr-' + tag + '-07-take-c', 10);
await d.shoot('ctr-' + tag + '-08-settle', 14);
d.tick(90);
out.push('end: ' + top().name);
return { out };
