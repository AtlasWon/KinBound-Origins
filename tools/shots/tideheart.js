// The Tideheart, in every state a player can find it in.
//
// The object is drawn in code and animated, and the whole point of it is that
// it LOOKS different when it is reacting -- so the only way to know whether it
// works is to photograph it at rest, photograph it stirring, and put the two
// side by side. The bag row and the description panel are here for the same
// reason: they are the two places a player is most likely to notice first.
//
// Usage: node tools/serve.js
//        npx electron tools/capture.cjs tools/shots/tideheart.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(600);

// A genuinely new save, the same way tools/shots/renamewalk.js gets one.
const title = await import('/build/js/scenes/title.js');
localStorage.clear();
title.resetTitleSession();
d.game.scenes.replaceAll(new title.TitleScene());
d.tick(4);
for (let i = 0; i < 120 && top().name !== 'creator'; i++) d.key('Enter', 10);
if (top().name !== 'creator') throw new Error('never reached the creator; stuck on ' + top().name);
for (let i = 0; i < 40; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1800);
for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
d.tick(6);
out.push('scene: ' + top().name);

const th = await import('/build/js/systems/tideheart.js');
const { registry } = await import('/build/js/data/registry.js');
const ow = () => d.game.scenes.find('overworld');
const state = ow().state;

out.push('sites: ' + th.builtSites().map((s) => s.id + ' [' + s.maps.join(',') + ']').join('; '));
const audit = th.tideheartAudit();
out.push('audit: ' + (audit.length
  ? audit.map((a) => a.site + ' has no map on disk: ' + a.missing.join(',')).join('; ')
  : 'every built site has a map'));

// --------------------------------------------------------------- the bag
state.giveItem('tideheart', 1);
state.giveItem('potion', 5);
out.push('item name at rest: ' + registry.itemName('tideheart'));
out.push('icon at rest: ' + registry.getItem('tideheart').icon);

d.key('KeyI', 20);
d.key('KeyX', 6);
d.key('KeyX', 6); // ITEMS -> VESSELS -> KEY
out.push('bag pocket scene: ' + top().name);
await d.shoot('tideheart-01-bag-key-pocket', 8);

// -------------------------------------------------------- the object, calm
d.key('Enter', 12);
out.push('scene after use: ' + top().name);
await d.shoot('tideheart-02-calm', 30);
await d.shoot('tideheart-03-calm-later', 90);
await d.shoot('tideheart-04-calm-zoom', 2, 3);

// ------------------------------------------------------------- it reacts
//
// Standing on the site's own map. The mechanism's tile is filled in here for
// the photograph -- Route 2's ruin is another agent's map and does not have a
// door yet, and the needle is the half of the reading that cannot be judged
// without one.
const site = th.builtSites()[0];
const restore = site.at;
site.at = { map: 'route_2', x: 34, y: 10 };
state.currentX = 12;
state.currentY = 26;
state.currentMap = 'route_2';
out.push('reading on site: ' + JSON.stringify({
  stirring: th.readTideheart(state).stirring,
  bearing: th.readTideheart(state).bearing,
  intensity: +th.readTideheart(state).intensity.toFixed(2),
}));
out.push('description while stirring: ' + registry.getItem('tideheart').description);
out.push('icon while stirring: ' + registry.getItem('tideheart').icon);
await d.shoot('tideheart-05-stirring', 30);
await d.shoot('tideheart-06-stirring-later', 60);
await d.shoot('tideheart-07-stirring-zoom', 2, 3);

// Right on top of it: the strongest the reading ever gets.
state.currentX = 33;
state.currentY = 10;
await d.shoot('tideheart-08-at-the-door', 30);

// The bag row and the description panel in the reacting state.
d.key('Escape', 10);
out.push('back to: ' + top().name);
await d.shoot('tideheart-09-bag-reacting', 8);

// ------------------------------------------------------------- the echoes
d.key('Enter', 12);
state.setFlag('tideheart_echo_' + site.id);
await d.shoot('tideheart-10-answered', 20);
d.key('KeyX', 10);
await d.shoot('tideheart-11-echoes-list', 12);
d.key('Enter', 16);
await d.shoot('tideheart-12-echo-playback', 20);
d.key('Enter', 16);
await d.shoot('tideheart-13-echo-playback-2', 20);

// -------------------------------------------------------- once it is named
state.setFlag('tideheart_named');
out.push('item name once named: ' + registry.itemName('tideheart'));
d.key('Escape', 8);
d.key('KeyX', 8);
await d.shoot('tideheart-14-named', 24);

site.at = restore;
return out.join('\n');
