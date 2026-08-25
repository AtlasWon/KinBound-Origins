// The opening cinematic's captions, which are where the region and the sea are
// named to the player before anything else in the game speaks.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
await d.loadWait(500);
const title = await import('/build/js/scenes/title.js');
localStorage.clear(); title.resetTitleSession();
d.game.scenes.replaceAll(new title.TitleScene());
d.tick(4);
for (let i = 0; i < 60 && top().name !== 'opening'; i++) d.key('Enter', 10);
out.push('scene: ' + top().name);
// Shot 0 names the region; shot 5 names the professor.
const want = { 0: 'film-caelora', 4: 'film-tidefall', 5: 'film-sorrell', 6: 'film-shore' };
let guard = 0;
const seen = new Set();
while (top().name === 'opening' && guard++ < 400) {
  const s = top().shot;
  if (want[s] && !seen.has(s) && top().t > 90) {
    seen.add(s);
    out.push('shot ' + s + ' -> ' + want[s]);
    await d.shoot(want[s], 0, 3);
  }
  d.tick(20);
}
out.push('film ended in ' + top().name);
d.tick(240);
await d.shoot('film-title', 0, 3);
return { out };
