// Walks up to the clinic keeper and reads the whole exchange back.
const d = window.dev;
const top = () => d.game.scenes.top;
const lines = [];
await d.loadWait(1200);
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
await d.loadWait(1400);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const state = top().state;
state.playerName = 'MARA';
d.game.scenes.replaceAll(new (top().constructor)(state, 'briarbell_clinic', 4, 3, 'up'));
await d.loadWait(1400);

d.key('Enter', 20);
for (let i = 0; i < 14; i++) {
  const p = d.probe();
  if (p.text) lines.push(p.text);
  if (top().name !== 'dialogue') break;
  d.key('Enter', 20);
}
await d.shoot('heal-01-keeper', 6, 2);
return lines;
