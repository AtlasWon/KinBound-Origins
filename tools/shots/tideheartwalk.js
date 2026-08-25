// Does the Tideheart actually reach the player's hands, and does the world
// react on its own?
//
// The screen driver (tools/shots/tideheart.js) puts the object in the bag by
// hand, which proves the object and proves nothing about the story. This one
// asks the two questions that decide whether Act 1 works:
//
//   1. Walking out of Hearthmere onto Route 1 with the send-off done and no
//      keepsake -- does the safety net hand it over? (It is the net, not the
//      intended path: the intended path is Mira calling `tideheart_gift`, which
//      lives in her own dialogue and belongs to whoever owns Hearthmere.)
//   2. Walking onto Route 2 with it -- does it start responding with nobody
//      telling the player anything?
//
// Usage: npx electron tools/capture.cjs tools/shots/tideheartwalk.js

const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => d.game.scenes.find('overworld');
const out = [];

await d.loadWait(600);
const title = await import('/build/js/scenes/title.js');
localStorage.clear();
title.resetTitleSession();
d.game.scenes.replaceAll(new title.TitleScene());
d.tick(4);
for (let i = 0; i < 120 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 40; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1800);
for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(6);

const state = ow().state;
const has = () => state.hasItem('tideheart');
out.push('fresh save: holds keepsake = ' + has());

// The send-off happened, the gift did not: exactly the state the safety net
// exists for.
state.setFlag('mom_sendoff');
await ow().loadMap(d.game, 'route_1', 10, 10, 'down', true);
await d.loadWait(600);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) { d.tick(50); d.key('Enter', 8); }
d.tick(8);
out.push('after walking onto Route 1: holds keepsake = ' + has()
  + ', flag tideheart_given = ' + state.hasFlag('tideheart_given'));
await d.shoot('thwalk-01-route-1', 6, 2);

// Route 2, carrying it. Nothing here says a word to the player -- the item's
// own description, its bag icon and the cue on arrival are the whole message.
const { registry } = await import('/build/js/data/registry.js');
const th = await import('/build/js/systems/tideheart.js');
out.push('on route 1, description: ' + registry.getItem('tideheart').description);

await ow().loadMap(d.game, 'route_2', 10, 10, 'down', true);
await d.loadWait(600);
d.tick(8);
out.push('on route 2, stirring = ' + th.readTideheart(state).stirring
  + ', description: ' + registry.getItem('tideheart').description);
await d.shoot('thwalk-02-route-2', 6, 2);

// And the bag, which is where a player would go to find out why.
d.key('KeyI', 20);
d.key('KeyX', 6);
d.key('KeyX', 6);
await d.shoot('thwalk-03-bag-on-route-2', 8, 2);
d.key('Enter', 12);
out.push('opened: ' + top().name);
await d.shoot('thwalk-04-object-on-route-2', 30, 2);

return out.join('\n');
