// Four consecutive frames of the same water, so the movement can be checked.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const clear = () => {
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;

const visit = async (map, x, y, name) => {
  d.game.scenes.replaceAll(new Overworld(state, map, x, y, 'down'));
  await d.loadWait(1500);
  clear();
  for (let f = 0; f < 4; f++) {
    await d.shoot(name + '-f' + f, 1, 2);
    out.push(name + '-f' + f);
    await sleep(200);
  }
};

await visit('brackwater', 14, 14, 'wat-deep');
await visit('route_1', 10, 12, 'wat-pond');
return { out };
