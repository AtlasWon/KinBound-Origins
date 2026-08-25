// The other launch: nobody has ever played. No save, so the full film runs,
// and the start screen is reached only when it is over.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(400);

const mod = await import('/build/js/scenes/title.js');
localStorage.clear();
mod.resetTitleSession();
d.game.scenes.replaceAll(new mod.TitleScene());
d.tick(2);

out.push('fresh boot -> ' + top().name + ' with ' + (top().reel ? top().reel.length : '?') + ' shots');

// The whole thing, one frame per two seconds, so the running order is on record.
let guard = 0;
let n = 0;
while (top().name === 'opening' && guard++ < 60) {
  out.push(n + ': shot ' + top().shot + ' t=' + top().t);
  await d.shoot('fresh-' + String(n).padStart(2, '0'), 0);
  n++;
  d.tick(120);
}
out.push('film ended in: ' + top().name);
d.tick(200);
await d.shoot('fresh-settled', 0);
out.push('settled: ' + top().name + ' bd=' + top().bd);

return { out };
