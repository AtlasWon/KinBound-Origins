// Doorways at the new walk speed. The corner assist is a fixed nudge, so
// lowering the walk speed changes its strength relative to the step -- this
// checks that walking at a door slightly off-centre still gets you in, from
// every offset the tile allows.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
for (let i = 0; i < 80; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;
const body = await import('/build/js/world/body.js');
out.push('WALK_SPEED ' + body.WALK_SPEED);

const tryDoor = async (offset) => {
  d.game.scenes.replaceAll(new Overworld(state, 'ashgate', 6, 9, 'up'));
  await d.loadWait(1100);
  clear();
  const s = top();
  s.player.x += offset;
  d.down('KeyW');
  let ticks = 0;
  for (let i = 0; i < 200; i++) {
    d.tick(1);
    ticks++;
    if (s.busy) break;
  }
  d.up('KeyW');
  const got = s.busy;
  await d.loadWait(900);
  out.push('offset ' + (offset >= 0 ? '+' : '') + offset + 'px: '
    + (got ? 'entered in ' + ticks + ' ticks -> ' + top().map.id : 'STUCK, never reached the door')
    + ' (final ' + top().player.tileX + ',' + top().player.tileY + ')');
};

for (const o of [0, -2, 2, -4, 4, -5, 5]) await tryDoor(o);

return { out };
