const d = window.dev;
await d.loadWait(900);
d.key('Enter', 4); d.key('Enter', 20);
d.key('Enter', 60);                  // skip the cinematic
const top = () => d.game.scenes.top;
// Sit on a facing and take a magnified frame of each in turn.
for (let i = 0; i < 4; i++) {
  top().facing = i;
  await d.shoot('zoom-facing-' + i, 2, 3);
}
return top().name;
