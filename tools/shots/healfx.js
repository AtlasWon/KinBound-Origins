// Drives the Kin Clinic heal and photographs the new transition frame by frame.
// Two runs: a full six (worst case for length) and a lone starter, which is the
// party the player actually has the first time they ever see this.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
for (let i = 0; i < 12 && typeof top().rows !== 'function'; i++) d.key('Enter', 40);
for (let i = 0; i < 60; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const state = top().state;
const Overworld = top().constructor;
const { createKin } = await import('/build/js/systems/kin.js');
state.playerName = 'MARA';

async function run(tag, species, hurt, marks) {
  state.party.length = 0;
  species.forEach((s, i) => {
    const k = createKin(s, 8, d.game.rng);
    k.currentHp = Math.max(0, Math.round(k.maxHp * hurt[i]));
    state.party.push(k);
  });
  out.push(tag + ' before: ' + state.party.map((k) => k.currentHp + '/' + k.maxHp).join(' '));

  d.game.scenes.replaceAll(new Overworld(state, 'briarbell_clinic', 4, 3, 'up'));
  await d.loadWait(1200);
  // Take the default (YES) through the keeper's ask. Stop the moment the
  // overlay appears: another Enter would fire its skip.
  for (let i = 0; i < 16 && top().name !== 'healfx'; i++) d.key('Enter', 6);
  if (top().name !== 'healfx') { out.push(tag + ' NO OVERLAY: ' + top().name); return; }
  const t0 = top().t;
  out.push(tag + ' overlay picked up at t=' + t0);

  let at = 0;
  for (const m of marks) {
    d.tick(m - at); at = m;
    await d.shoot(tag + '-' + String(m + t0).padStart(3, '0'), 0, 1);
    if (top().name !== 'healfx') { out.push(tag + ' ended by t=' + (m + t0)); break; }
  }
  d.tick(24);
  out.push(tag + ' after: ' + top().name + ' | '
    + state.party.map((k) => k.currentHp + '/' + k.maxHp).join(' '));
}

await run('hx6',
  ['sprigling', 'cinderpaw', 'rilltail', 'pebblet', 'tuftail', 'nibbet'],
  [0.0, 0.62, 0.18, 0.45, 0.08, 0.9],
  [1, 4, 8, 16, 30, 45, 57, 62, 70, 76, 80, 83, 86, 88]);

await run('hx1', ['sprigling'], [0.12],
  [1, 4, 8, 12, 16, 20, 26, 32, 38, 42, 45]);

return out;
