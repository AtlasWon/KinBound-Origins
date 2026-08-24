// The area transitions, sampled mid-flight over a real map. The existing
// drivers all shoot at rest; a wipe is only wrong in the middle.

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
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;
const tr = await import('/build/js/ui/transition.js');

// A transparent scene that draws nothing but the cover, so the world beneath
// keeps rendering exactly as it does in play.
const cover = {
  name: 'cover',
  transparent: true,
  style: 'door',
  p: 0,
  dir: 'down',
  update() {},
  render(_g, r) { tr.drawAreaCover(r, this.style, this.p, this.dir); },
};

const visit = async (map, x, y, facing) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, facing));
  await d.loadWait(1400);
  clear();
  d.game.scenes.push(cover);
  d.tick(1);
};

const sample = async (name, style, dir, frames) => {
  cover.style = style;
  cover.dir = dir;
  for (const f of [1, 3, 5, 7, frames]) {
    cover.p = f / frames;
    await d.shoot(`${name}-f${f}`, 1);
  }
  cover.p = 0;
  d.tick(1);
};

// A door: the town outside a shop.
await visit('ashgate', 15, 12, 'up');
out.push('door frames: ' + tr.areaFrames('door'));
await sample('trans-door', 'door', 'down', tr.areaFrames('door'));

// A route seam, walking down out of town.
await visit('route_1', 14, 12, 'down');
out.push('edge frames: ' + tr.areaFrames('edge'));
await sample('trans-edge-down', 'edge', 'down', tr.areaFrames('edge'));
await sample('trans-edge-right', 'edge', 'right', tr.areaFrames('edge'));

// Stairs, inside a building.
await visit('marrow_house_player', 6, 5, 'up');
out.push('stairs frames: ' + tr.areaFrames('stairs'));
await sample('trans-stairs', 'stairs', 'up', tr.areaFrames('stairs'));

// And the door again from inside, which is the other half a player sees.
await sample('trans-door-indoor', 'door', 'down', tr.areaFrames('door'));

return { out };
