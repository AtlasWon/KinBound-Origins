// Walks up to the waystation keeper and reads the whole exchange back.
const d = window.dev;
const top = () => d.game.scenes.top;
const lines = [];
await d.loadWait(1200);
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
await d.loadWait(1400);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const state = top().state;
state.playerName = 'MARA';
d.game.scenes.replaceAll(new (top().constructor)(state, 'ashgate_waystation', 4, 3, 'up'));
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
