// The start screen over all six backdrops, settled, judged at 1x.
//
// Each one is caught three times across its dwell, because the camera is
// moving: a backdrop that reads at the top of its move can be a wall of light
// under the menu by the end of it.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(500);
// Straight past the film to the screen this driver is about.
let guard = 0;
while (top().name !== 'title' && guard++ < 3000) {
  d.key('Enter', 2);
  d.tick(20);
}
d.tick(160);   // let the entrance finish

const t = top();
for (let i = 0; i < 6; i++) {
  const b = t.bd;
  // Early, middle and late in the dwell.
  for (const at of [70, 300, 540]) {
    while (t.bdT < at && t.bd === b) d.tick(4);
    await d.shoot('scr-' + b + '-' + at, 0);
    out.push('backdrop ' + b + ' bdT=' + t.bdT);
  }
  // Over the dissolve into the next one.
  while (t.bd === b) d.tick(6);
  d.tick(30);
}

return { out };
