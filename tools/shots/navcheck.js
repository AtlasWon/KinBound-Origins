// Vertical navigation, checked as behaviour rather than by eye.
//
// Every list is walked with the arrow keys and with WASD, and then the same
// again after "Move up"/"Move down" have been rebound onto keys that are not
// either of those -- which is the state a player can put themselves into on the
// controls screen and could not previously get out of.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const kinMod = await import('/build/js/systems/kin.js');
const reg = (await import('/build/js/data/registry.js')).registry;
const state = top().state;
state.party.length = 0;
for (const id of ['cinderpaw', 'pipwing', 'nibbet']) {
  state.party.push(kinMod.createKin(id, 10, d.game.rng, { originalTrainer: 'player' }));
}
for (const it of reg.items.values()) state.giveItem(it.id, 5);
for (const sp of reg.species.values()) state.seen.add(sp.id);

// index of whatever list the top scene is showing
const idx = () => {
  const s = top();
  if (s.menu) return s.menu.index;
  if (typeof s.index === 'number') return s.index;
  return -1;
};

const probe = (label, open, close) => {
  open();
  const start = idx();
  d.key('ArrowDown', 4); const afterArrow = idx();
  d.key('KeyS', 4); const afterW = idx();
  d.key('ArrowUp', 4);
  d.key('KeyW', 4); const back = idx();
  out.push(`${label}: start=${start} arrowDown=${afterArrow} sDown=${afterW} backUp=${back}`);
  close();
};

d.key('Tab', 10);
probe('mainmenu', () => {}, () => {});

probe('party', () => d.key('KeyP', 12), () => d.key('Escape', 10));
probe('bag', () => d.key('KeyI', 12), () => d.key('Escape', 10));
probe('vellum', () => d.key('KeyC', 12), () => d.key('Escape', 10));

const optMod = await import('/build/js/scenes/options.js');
probe('options', () => { d.game.scenes.push(new optMod.OptionsScene()); d.tick(4); },
  () => d.key('Escape', 10));

// Now take the direction keys away and try again. Both WASD and the arrows
// should still walk the list.
d.game.input.setBinding('up', ['KeyO']);
d.game.input.setBinding('down', ['KeyL']);
out.push('bindings now: up=' + d.game.input.bindings.up + ' down=' + d.game.input.bindings.down);

probe('options rebound', () => { d.game.scenes.push(new optMod.OptionsScene()); d.tick(4); },
  () => d.key('Escape', 10));
probe('party rebound', () => d.key('Escape', 4) || d.key('KeyP', 12), () => d.key('Escape', 10));

// And the bound key itself still works, exactly once per press.
d.game.scenes.push(new optMod.OptionsScene());
d.tick(4);
const before = idx();
d.key('KeyL', 4);
out.push('bound key step: ' + before + ' -> ' + idx());
d.key('Escape', 10);

return { out };
