// Move-effect laboratory.
//
// Drops into a real battle, then drives MoveFx directly one animation at a
// time and photographs the performance frame by frame. The existing battle
// driver samples ten ticks apart, which is wider than most of these effects'
// entire strike beat -- everything here is sampled close enough to actually
// watch the thing move.
//
// Each animation produces one contact sheet: nine cells, each the full
// 480x320 back buffer at 1x, laid out 3x3 with its frame number burned in.
//
//   npx electron tools/capture.cjs tools/shots/fxlab.js
//
// Set FILTER below to a substring to photograph only some of them.
const d = window.dev;
const top = () => d.game.scenes.top;

// Both are driven off the capture URL's query, which capture.cjs takes as its
// fourth argument: `fx=iron` photographs only the iron ids, and
// `frames=16,17,18,...` picks the sampled frames.
//   npx electron tools/capture.cjs tools/shots/fxlab.js 5173 "dev=1&mute=1&fx=iron&frames=16,18,20"
const Q = new URLSearchParams(location.search);
const FILTER = Q.get('fx') || '';
const FRAMES = (Q.get('frames') || '2,6,10,14,18,22,26,30,36').split(',').map(Number);
const COLS = Number(Q.get('cols') || 3), ROWS = Math.ceil(FRAMES.length / COLS);

const TYPE_COLOR = {
  beast: '#b8b09c', flame: '#e0603a', tide: '#3f7fd0', verdant: '#5aa04a',
  spark: '#e8c53a', frost: '#8fd4e0', brawl: '#c0562e', venom: '#9a58b0',
  terra: '#c9a24d', gale: '#9ab8e8', psyche: '#e06a92', chitin: '#8fb03a',
  stone: '#b09a68', spirit: '#6b5a9a', iron: '#93a3ad', umbral: '#5a5048',
  radiant: '#f0d68a',
};

// Every animation id the move table actually uses, with the type it ships on.
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

await d.loadWait(1200);
d.key('Enter', 4); d.key('Enter', 30);
d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1400);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
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
  await fetch('/__shot/' + encodeURIComponent(name), { method: 'POST', body: url });
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
  if (FILTER && !anim.includes(FILTER)) continue;
  // A clean slate: no leftover particles, no leftover shake.
  scene.fx.clear();
  d.tick(1);
  scene.fx.clear();
  sx.fillStyle = '#000000';
  sx.fillRect(0, 0, sheet.width, sheet.height);

  const user = scene.bodyPoint('player');
  const self = scene.fx.constructor;
  const targetSelf = (await import('/build/js/gfx/movefx.js')).fxTargetsSelf(anim);
  const target = targetSelf ? user : scene.bodyPoint('foe');
  scene.fxSide = 'player';
  scene.fx.play(anim, user, target, TYPE_COLOR[type] || '#ffffff');
  void self;

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
return { done: done.length, frames: FRAMES };
