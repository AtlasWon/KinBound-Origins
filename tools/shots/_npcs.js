// Stands the new NPC looks side by side in the waystation.
const d = window.dev;
const top = () => d.game.scenes.top;
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
await d.loadWait(1200);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const go = async (map, x, y, name) => {
  top().state.currentMap = map;
  d.game.scenes.replaceAll(new (top().constructor)(top().state, map, x, y, 'up'));
  await d.loadWait(1200);
  for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  await d.shoot(name, 6, 2);
};
await go('ashgate_waystation', 4, 4, 'npc-01-waystation');
await go('ashgate_provisioner', 5, 4, 'npc-02-provisioner');
await go('ashgate', 12, 10, 'npc-03-town');
return 'ok';
