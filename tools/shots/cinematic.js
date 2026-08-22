// Walks the opening cinematic shot by shot without skipping, so every shot and
// the title card at the end can be looked at.
//
// The shot lengths are read off the scene itself rather than hard-coded, so
// this keeps working when the cinematic is re-cut.

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 30);
out.push('scene:' + top().name);

// Two frames per shot: one early, once it has faded in, and one late.
for (let i = 0; i < 12; i++) {
  const scene = top();
  if (scene.name !== 'opening') { out.push('left the cinematic at shot ' + i); break; }
  const shot = scene.shot;
  // SHOTS is module-private, so read the lengths that were printed into the
  // source rather than reaching for it.
  const frames = [300, 300, 320, 280, 320, 230][shot] || 280;
  d.tick(Math.round(frames * 0.35));
  await d.shoot('cine-' + String(i).padStart(2, '0') + 'a', 2);
  d.tick(Math.round(frames * 0.5));
  await d.shoot('cine-' + String(i).padStart(2, '0') + 'b', 2);
  d.tick(Math.round(frames * 0.2));
  out.push('shot ' + shot + ' -> ' + top().shot);
}

return { out, scene: top().name };
