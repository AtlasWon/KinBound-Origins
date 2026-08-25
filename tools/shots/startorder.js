// The order, and the join.
//
// 1. What a cold boot actually lands on.
// 2. The last frames of the film and the first frames of the start screen,
//    six ticks apart, so the handover can be judged as motion rather than as
//    two poses that happen to look alike.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(500);
out.push('cold boot -> ' + top().name);
out.push('saves: ' + JSON.stringify(Object.keys(localStorage).filter((k) => /save/i.test(k))));
out.push('reel: ' + (top().reel ? top().reel.length : '?') + ' shots');

// Run the film to within a second of the hand-over without touching a key.
let guard = 0;
while (top().name === 'opening' && top().hand < 0 && guard++ < 6000) {
  const s = top();
  if (s.shot === s.reel.length - 1 && s.t > s.reel[s.shot].frames - 40) break;
  d.tick(6);
}
out.push('at ' + top().name + ' shot ' + top().shot + ' t=' + top().t);

for (let i = 0; i < 26; i++) {
  const s = top();
  out.push(i + ': ' + s.name + ' t=' + (s.t ?? '-')
    + ' hand=' + (s.hand ?? '-') + ' settle=' + (s.settle ?? '-'));
  await d.shoot('join-' + String(i).padStart(2, '0'), 0);
  d.tick(6);
}

out.push('after join: ' + top().name);
return { out };
