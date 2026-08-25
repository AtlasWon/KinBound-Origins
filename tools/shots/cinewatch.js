// The whole film at one frame per second of screen time, labelled with the shot
// it came from. Enough to judge every shot for brightness, busyness and whether
// the hand-drawn creatures now read.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(900);
d.key('Enter', 4);
d.key('Enter', 4);
for (let i = 0; i < 80 && top().name !== 'opening'; i++) d.tick(4);
out.push('scene: ' + top().name);

let n = 0;
for (let step = 0; step < 34 && top().name === 'opening'; step++) {
  const s = top();
  await d.shoot('film-' + String(n).padStart(2, '0') + '-s' + s.shot, 0);
  out.push(n + ': shot ' + s.shot + ' t=' + s.t);
  n++;
  d.tick(60);
}

out.push('ended in: ' + top().name);
return { out };
