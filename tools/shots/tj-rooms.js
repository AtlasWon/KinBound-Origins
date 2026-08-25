// Interiors at the size the game draws them, plus a 4x crop around the exit
// and the stairs of each one. Doors and stairways are judged on whether they
// read as holes in the room, which is a 1x question with a 4x follow-up.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const DETAIL = 2;
async function crop(name, tx, ty, tw, th, scale) {
  const r = d.game.renderer;
  const cv = document.createElement('canvas');
  cv.width = tw * 16 * scale; cv.height = th * 16 * scale;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#101418'; c.fillRect(0, 0, cv.width, cv.height);
  const sx = Math.round((tx * 16 - r.camX) * DETAIL);
  const sy = Math.round((ty * 16 - r.camY) * DETAIL);
  c.drawImage(r.buffer, sx, sy, tw * 16 * DETAIL, th * 16 * DETAIL, 0, 0, cv.width, cv.height);
  const res = await fetch('/__shot/' + name, { method: 'POST', body: cv.toDataURL('image/png') });
  return res.text();
}

// map, [doorX, doorY], [stairX, stairY] or null
const ROOMS = [
  ['hearthmere_house_player', [6, 6], [10, 1]],
  ['hearthmere_house_up', [null, null], [10, 4]],
  ['briarbell_house_a', [6, 6], null],
  ['briarbell_clinic', [6, 8], null],
  ['sorrell_lab', [7, 9], null],
  // The two rooms that already put their doorway in the wall run rather than
  // on the floor in front of it. This is the arrangement every other interior
  // needs, so it is the one worth photographing.
  ['brackwater_hall', [8, 16], null],
  ['kellowmere_hall', [7, 15], null],
];

for (const [m, door, stair] of ROOMS) {
  // Stand near whatever this room is being photographed for: the camera
  // follows the player, and a crop around a doorway in a big room is a black
  // rectangle if the player is parked at the far end of it.
  const sx = door[0] !== null ? door[0] : stair[0];
  const sy = door[1] !== null ? Math.max(1, door[1] - 2) : stair[1] + 1;
  d.game.scenes.replaceAll(new Overworld(state, m, sx, sy, 'down'));
  await d.loadWait(1000);
  for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(4);
  out.push(m + ' ' + (d.probe().map || '?'));
  await d.shoot('tj-room-' + m, 8, 1);
  if (door[0] !== null) await crop('tj-door-' + m, door[0] - 2, door[1] - 2, 5, 4, 4);
  if (stair) await crop('tj-stair-' + m, stair[0] - 2, stair[1] - 1, 5, 4, 4);
}
return { out };
