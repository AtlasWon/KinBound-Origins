// Stands the player one tile in front of every interior exit in turn, so the
// thing being checked -- can you see the way out -- is actually in frame.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const clear = () => {
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
};

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
for (let i = 0; i < 80; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear();

const state = top().state;
const Overworld = top().constructor;

const SPOTS = [
  ['brackwater_bastion', 8, 14],
  ['kellowmere_bastion', 7, 13],
  ['brackwater_house', 6, 5],
  ['kellowmere_house_b', 6, 5],
  ['vess_station', 7, 7],
  ['tanners_waystation', 6, 6],
];

for (const s of SPOTS) {
  d.game.scenes.replaceAll(new Overworld(state, s[0], s[1], s[2], 'down'));
  await d.loadWait(1000);
  clear();
  out.push(s[0] + ':' + (d.probe().pos || '?'));
  await d.shoot('x-' + s[0], 8, 1);
}
return { out };
