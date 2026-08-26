// Plan view of Skyreach, and 1x walks at four places in it.
//
// The plan view is a drawing tool, not a verdict -- a city that only reads from
// above has failed -- but this particular city is the one case where it is not
// optional either, because what it is made of is the SHAPE of the hole in the
// middle, and the shape of a hole is the one thing a street-level shot cannot
// show you.
const d = window.dev;
const ts = await import('/build/js/gfx/tileset.js');
const set = new ts.Tileset('kinbound-tiles');
const cell = ts.TILE_PX;

const top = () => d.game.scenes.top;
await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const out = [];

const atlas = async (id) => {
  const sc = new Overworld(state, id, 1, 1, 'down');
  d.game.scenes.replaceAll(sc);
  await d.loadWait(1600);
  const map = sc.map;
  if (!map) { out.push(id + ': no map'); return; }
  const W = map.width, H = map.height, px = ts.TILE_SIZE;
  const cv = document.createElement('canvas');
  cv.width = W * px; cv.height = H * px;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  // The overworld clears to this. Painting it here is the whole point: the void
  // has to be the colour the player will actually see behind it.
  c.fillStyle = '#0e1420'; c.fillRect(0, 0, cv.width, cv.height);
  const blit = (arr) => {
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const t = arr[ty * W + tx];
        if (!t) continue;
        const s = set.srcFor(t, tx, ty);
        c.drawImage(set.canvas, s.x, s.y, cell, cell, tx * px, ty * px, px, px);
      }
    }
  };
  blit(map.ground);
  blit(map.over);
  const res = await fetch('/__shot/' + encodeURIComponent('atlas-' + id), { method: 'POST', body: cv.toDataURL('image/png') });
  out.push(id + ' ' + W + 'x' + H + ' -> ' + (await res.text()));
};

for (const id of ['skyreach', 'skyreach_hall_spurs']) await atlas(id);

// Four places at 1x, which is the only scale a verdict is allowed at: the gate
// the player arrives through, the head of the Long Span, the lookout with the
// unreachable dock across the gap, and the airship apron.
const SHOTS = [
  ['sky-01-gate', 'skyreach', 8, 44],
  ['sky-02-span', 'skyreach', 30, 44],
  ['sky-03-lookout', 'skyreach', 27, 28],
  ['sky-04-docks', 'skyreach', 52, 14],
  ['sky-05-cragside', 'skyreach', 13, 30],
  ['sky-06-headland', 'skyreach', 14, 12],
  ['sky-07-hall', 'skyreach', 59, 50],
  ['sky-08-catwalk', 'skyreach', 31, 6],
  ['sky-09-arrival', 'skyreach', 24, 41],
  ['sky-10-rigging', 'skyreach', 60, 30],
  ['sky-11-hallfloor', 'skyreach_hall', 9, 8],
  ['sky-12-spur-sill', 'skyreach_hall_spurs', 18, 28],
  ['sky-13-spur-fan', 'skyreach_hall_spurs', 18, 22],
  ['sky-14-masthead', 'skyreach_hall_spurs', 18, 6],
  ['sky-15-descent', 'skyreach_hall_spurs', 30, 12],
  ['sky-16-lift', 'skyreach_lift', 5, 4],
];
for (const [name, id, x, y] of SHOTS) {
  const sc = new Overworld(state, id, x, y, 'down');
  d.game.scenes.replaceAll(sc);
  await d.loadWait(1400);
  d.tick(30);
  out.push(await d.shoot(name, 8, 2) + ' @' + JSON.stringify(d.probe().pos));
}

return { out };
