// Does it hold up when it is driven? Motion, cost, and both ways out.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const atlases = () => d.game.renderer.atlases.size;

await d.loadWait(500);
let guard = 0;
while (top().name !== 'title' && guard++ < 3000) { d.key('Enter', 2); d.tick(20); }

const before = atlases();
d.tick(200);
out.push('atlases after the entrance: ' + before + ' -> ' + atlases());

// Motion, four ticks apart: fifteen frames covering a second of the sea.
for (let i = 0; i < 8; i++) { await d.shoot('mo-' + i, 0); d.tick(4); }

// Cost. Ten renders, wall clock.
const t0 = performance.now();
for (let i = 0; i < 60; i++) d.tick(1);
out.push('60 ticks+renders in ' + (performance.now() - t0).toFixed(1) + 'ms');

// Walk the whole cycle once and watch the atlas count, which is the thing that
// would quietly rot: a fading colour string bakes a glyph sheet per frame.
d.tick(4200);
out.push('atlases after a full cycle: ' + atlases() + ' (backdrop ' + top().bd + ')');

// Out through CONTINUE.
d.key('Enter', 2);
out.push('confirmed; leaving=' + top().leaving);
for (let i = 0; i < 6; i++) { await d.shoot('go-' + i, 0); d.tick(11); }
d.tick(30);
out.push('continue lands in: ' + top().name);

return { out };
