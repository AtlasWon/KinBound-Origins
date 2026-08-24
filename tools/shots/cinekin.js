// Close looks at how the creatures read inside the cinematic now that half the
// roster is hand-drawn art. 4x, after the 1x pass has said which shots are
// worth the look.

const d = window.dev;
const top = () => d.game.scenes.top;
const at = async (shot, into, name) => {
  while (top().name === 'opening' && top().shot < shot) d.tick(8);
  while (top().shot === shot && top().t < into) d.tick(4);
  await d.shoot(name, 0, 4);
};

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 4);
// The title screen now plays a 64-tick departure of its own before the film
// starts, so waiting a fixed number of ticks is no longer enough.
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.tick(4);

await at(1, 110, 'kin-plains');
await at(2, 100, 'kin-deep');
await at(4, 130, 'kin-drowned');
await at(6, 120, 'kin-shore');

return { scene: top().name, shot: top().shot };
