// A real warp, every frame, from the player walking into the door to the field
// coming back on the far side. The synthetic sweep shows the curve; this shows
// what the curve costs in wall-clock time with a map load sitting in the middle
// of it, which is the thing that decides whether it reads as deliberate or as a
// wait.

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

const press = (code, down) => {
  window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
};

// Walk into an exit and photograph every single frame of what follows.
const run = async (name, map, x, y, facing, code, frames) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1200);
  clear();
  press(code, true);
  const log = [];
  for (let f = 1; f <= frames; f++) {
    d.tick(1);
    const s = top();
    log.push(s.fade && s.fade.active ? s.fade.dir[0] + s.fade.t : (s.busy ? 'B' : '.'));
    await d.shoot(`${name}-${String(f).padStart(2, '0')}`, 0);
    if (f === 4) press(code, false);
  }
  press(code, false);
  out.push(`${name}: ${log.join(' ')}`);
  out.push(`${name} ended on ${d.probe().map} at ${d.probe().pos}`);
};

await run('lv-door', 'marrow_house_player', 6, 5, 'down', 'KeyS', 72);
await run('lv-stair', 'marrow_house_player', 10, 2, 'up', 'KeyW', 76);

return { out };
