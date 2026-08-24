// Move-effect contact sheets, for every animation in one run.
//
// Same idea as fxlab, but built to survive a whole-set pass: the walk in from
// the title screen probes each scene instead of assuming it is already the
// menu (that assumption is what makes a long batch die partway through with
// "rows is not a function"), and a shot is only reported done once the dev
// server has acknowledged the POST -- an unacknowledged write is how the first
// nine effects went missing from a sixty-six effect run.
//
//   npx electron tools/capture.cjs tools/shots/fxrank.js 5173 "dev=1&mute=1"
//   npx electron tools/capture.cjs tools/shots/fxrank.js 5173 "dev=1&mute=1&only=vine,powder"
const d = window.dev;
const top = () => d.game.scenes.top;

const Q = new URLSearchParams(location.search);
const ONLY = (Q.get('only') || '').split(',').map((s) => s.trim()).filter(Boolean);
const FRAMES = (Q.get('frames') || '2,6,10,14,18,22,26,30,36').split(',').map(Number);
const COLS = Number(Q.get('cols') || 3), ROWS = Math.ceil(FRAMES.length / COLS);

const TYPE_COLOR = {
  beast: '#b8b09c', flame: '#e0603a', tide: '#3f7fd0', verdant: '#5aa04a',
  spark: '#e8c53a', frost: '#8fd4e0', brawl: '#c0562e', venom: '#9a58b0',
  terra: '#c9a24d', gale: '#9ab8e8', psyche: '#e06a92', chitin: '#8fb03a',
  stone: '#b09a68', spirit: '#6b5a9a', iron: '#93a3ad', umbral: '#5a5048',
  radiant: '#f0d68a',
};

const CASES = [
  ['hit', 'beast'], ['dash', 'beast'], ['push', 'beast'],
  ['punch', 'brawl'], ['punch_heavy', 'brawl'], ['kick_big', 'brawl'], ['grapple', 'brawl'],
  ['slash_green', 'verdant'], ['wing', 'gale'], ['bug_mid', 'chitin'],
  ['flame_small', 'flame'], ['flame_whip', 'flame'], ['flame_big', 'flame'], ['flame_dive', 'flame'],
  ['water_small', 'tide'], ['water_big', 'tide'], ['water_pull', 'tide'], ['water_hit', 'tide'],
  ['leaf_small', 'verdant'], ['leaf_big', 'verdant'], ['vine', 'verdant'], ['drain', 'verdant'], ['powder', 'verdant'],
  ['spark_small', 'spark'], ['spark_mid', 'spark'], ['spark_big', 'spark'],
  ['frost_small', 'frost'], ['frost_mid', 'frost'], ['frost_big', 'frost'],
  ['venom_small', 'venom'], ['venom_cloud', 'venom'], ['venom_bite', 'venom'],
  ['earth_small', 'terra'], ['earth_mid', 'terra'], ['earth_big', 'terra'],
  ['rock_small', 'stone'], ['rock_mid', 'stone'], ['rock_big', 'stone'], ['hazard', 'stone'],
  ['wind_small', 'gale'], ['dive', 'gale'], ['sky', 'gale'],
  ['psy_small', 'psyche'], ['psy_mid', 'psyche'], ['psy_big', 'psyche'],
  ['bug_small', 'chitin'], ['bug_swarm', 'chitin'],
  ['iron_small', 'iron'], ['iron_mid', 'iron'], ['iron_big', 'iron'],
  ['dark_small', 'umbral'], ['dark_mid', 'umbral'], ['dark_big', 'umbral'],
  ['light_small', 'radiant'], ['light_mid', 'radiant'], ['light_big', 'radiant'],
  ['spirit_small', 'spirit'], ['spirit_mid', 'spirit'], ['spirit_big', 'spirit'],
  ['charge', 'beast'], ['heal', 'radiant'], ['shield', 'psyche'],
  ['buff', 'brawl'], ['debuff', 'beast'], ['status', 'venom'], ['weather', 'frost'],
];

/* ------------------------------------------------------------ get in */

await d.loadWait(1400);
d.key('Enter', 4); d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 60; i++) {
  // Probe. Several scenes on the way in have no row list at all, and reaching
  // for one on the wrong scene is what kills a long batch mid-run.
  const s = top();
  const rows = typeof s.rows === 'function' ? s.rows() : null;
  if (rows && (rows[s.sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const fxMod = await import('/build/js/gfx/movefx.js');
const state = top().state;
state.party.length = 0;
state.party.push(kinMod.createKin('cinderpaw', 24, d.game.rng, { originalTrainer: 'player' }));
const foe = [kinMod.createKin('rilltail', 24, d.game.rng)];

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foe, isWild: true,
  backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
for (let i = 0; i < 40 && top().phase !== 'menu'; i++) d.key('Enter', 12);
d.game.settings.battleSpeed = 'classic';

const scene = top();
const buf = d.game.renderer.buffer;
const CW = buf.width, CH = buf.height;

/* ------------------------------------------------------- contact sheet */

const sheet = document.createElement('canvas');
sheet.width = CW * COLS;
sheet.height = CH * ROWS;
const sx = sheet.getContext('2d');
sx.imageSmoothingEnabled = false;

async function post(name, canvas) {
  const url = canvas.toDataURL('image/png');
  const res = await fetch('/__shot/' + encodeURIComponent(name), { method: 'POST', body: url });
  if (!res.ok) throw new Error('shot ' + name + ' rejected: ' + res.status);
  await res.text();
}

function cell(i, frame) {
  const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH;
  sx.drawImage(buf, cx, cy);
  sx.fillStyle = 'rgba(0,0,0,0.75)';
  sx.fillRect(cx + 2, cy + 2, 34, 16);
  sx.fillStyle = '#ffe680';
  sx.font = 'bold 13px monospace';
  sx.textBaseline = 'top';
  sx.fillText('f' + String(frame).padStart(2, '0'), cx + 5, cy + 3);
  sx.strokeStyle = '#202028';
  sx.lineWidth = 2;
  sx.strokeRect(cx + 1, cy + 1, CW - 2, CH - 2);
}

const done = [];
for (const [anim, type] of CASES) {
  if (ONLY.length && !ONLY.includes(anim)) continue;
  scene.fx.clear();
  d.tick(1);
  scene.fx.clear();
  sx.fillStyle = '#000000';
  sx.fillRect(0, 0, sheet.width, sheet.height);

  const user = scene.bodyPoint('player');
  const target = fxMod.fxTargetsSelf(anim) ? user : scene.bodyPoint('foe');
  scene.fxSide = 'player';
  scene.fx.play(anim, user, target, TYPE_COLOR[type] || '#ffffff');

  let slot = 0;
  const last = FRAMES[FRAMES.length - 1];
  for (let f = 1; f <= last; f++) {
    d.tick(1);
    if (FRAMES.includes(f)) cell(slot++, f);
  }
  await post('fx-' + anim, sheet);
  done.push(anim);
}

scene.fx.clear();
return { done: done.length, of: ONLY.length || CASES.length, frames: FRAMES };
