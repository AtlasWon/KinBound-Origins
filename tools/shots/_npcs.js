// Stands the new NPC looks side by side in the waystation.
const d = window.dev;
const top = () => d.game.scenes.top;
await d.loadWait(1200);
d.key('Enter', 4); d.key('Enter', 30);
d.key('Enter', 60);
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
