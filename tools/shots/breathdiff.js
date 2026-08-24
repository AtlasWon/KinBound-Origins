// Which rows actually move when a kin breathes.
//
// The breath is one or two logical pixels and no screenshot comparison at 1x
// will tell you WHICH rows moved -- the eye reports "the top squashed" and the
// numbers are the only way to check that. So this reads the back buffer at each
// pose, diffs it against the resting pose row by row, and prints the first and
// last logical row inside each sprite cell that changed, plus the row the ink
// starts on. If the top of the ink is the only thing that moves, the creature
// is being compressed at the top and the seams are wrong.
//
// Usage: npx electron tools/capture.cjs tools/shots/breathdiff.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 4);
d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const anchorMod = await import('/build/js/gfx/kinbreath.js');
const state = top().state;
d.game.settings.battleSpeed = 'fast';
d.game.settings.textSpeed = 'fast';

const DETAIL = 2;
const CELLS = {
  player: { x: 14, y: 40 },
  foe: { x: 158, y: 2 },
};

function grab(cell) {
  const buf = d.game.renderer.buffer;
  const cx = buf.getContext('2d', { willReadFrequently: true });
  return cx.getImageData(cell.x * DETAIL, cell.y * DETAIL, 64 * DETAIL, 64 * DETAIL);
}

function rowDiff(a, b) {
  const W = a.width, H = a.height;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let n = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1]
        || a.data[i + 2] !== b.data[i + 2]) n++;
    }
    rows.push(n);
  }
  return rows;
}

function summarise(rows) {
  let first = -1, last = -1, total = 0;
  for (let y = 0; y < rows.length; y++) {
    if (rows[y] > 2) { if (first < 0) first = y; last = y; }
    total += rows[y];
  }
  return { first, last, total };
}

async function look(tag, mine, theirs) {
  state.party.length = 0;
  state.party.push(kinMod.createKin(mine, 14, d.game.rng, { originalTrainer: 'player' }));
  const foe = [kinMod.createKin(theirs, 8, d.game.rng)];
  d.game.scenes.push(new battleMod.BattleScene({
    state, playerParty: state.party, foeParty: foe, isWild: true,
    backdrop: 'grass', onFinish: () => {},
  }));
  for (let i = 0; i < 600 && top().phase !== 'menu'; i++) d.tick(1);

  const set = (t) => {
    top().view.player.idleT = t;
    top().view.foe.idleT = t + 72;   // the foe runs a little over half a cycle behind
    d.game.render();
  };

  for (const [side, cell] of Object.entries(CELLS)) {
    const species = side === 'player' ? mine : theirs;
    const a = anchorMod.kinBreath(species, side === 'player');
    set(0);
    const base = grab(cell);
    const shots = {};
    for (const [name, t] of [['up', 42], ['down', 127]]) {
      set(t);
      shots[name] = summarise(rowDiff(base, grab(cell)));
    }
    out.push(`${tag} ${side} ${species} ink ${a.y0}..${a.y1} barrel ${a.barrelTop}..${a.barrelBottom} seams ${JSON.stringify(a.seams)}`
      + ` | up rows ${shots.up.first}..${shots.up.last} (${shots.up.total}px)`
      + ` | down rows ${shots.down.first}..${shots.down.last} (${shots.down.total}px)`);
  }

  // Three poses side by side, cropped to one cell and blown up, so a single
  // design row is visible and the three can be compared without flicking.
  for (const [side, cell] of Object.entries(CELLS)) {
    const Z = 4;
    const strip = document.createElement('canvas');
    strip.width = 64 * DETAIL * Z * 3 + 20;
    strip.height = 64 * DETAIL * Z;
    const sc = strip.getContext('2d');
    sc.imageSmoothingEnabled = false;
    sc.fillStyle = '#101018';
    sc.fillRect(0, 0, strip.width, strip.height);
    let col = 0;
    for (const t of [0, 42, 127]) {
      set(t);
      sc.drawImage(d.game.renderer.buffer,
        cell.x * DETAIL, cell.y * DETAIL, 64 * DETAIL, 64 * DETAIL,
        col * (64 * DETAIL * Z + 10), 0, 64 * DETAIL * Z, 64 * DETAIL * Z);
      col++;
    }
    await fetch('/__shot/' + encodeURIComponent(`${tag}-${side}-poses`),
      { method: 'POST', body: strip.toDataURL('image/png') });
  }

  d.game.scenes.pop();
  d.tick(2);
}

const picked = (new URLSearchParams(location.search).get('kin') || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
if (picked.length >= 2) await look('kin', picked[0], picked[1]);
else {
  await look('drawn', 'cinderpaw', 'rilltail');
  await look('gen', 'pebblet', 'menhir');
}

return { out };
