// How the fix LOOKS. A trainer who stops before the tile the player is
// standing in is a trainer who stops further away, so the challenge has to
// still read as face to face rather than as shouting across a gap.
//
// Two shots, same trainer, same walk: the player clear of the tile (he closes
// all the way) and the player straddling it (he stops one short).
const d = window.dev;
const top = () => d.game.scenes.top;
const ow = () => d.game.scenes.find('overworld');
const out = [];

await d.loadWait(1400);
// Reach the title, then choose NEW JOURNEY deliberately -- the cursor starts
// on CONTINUE whenever a save exists, so pressing Enter blindly loads that
// save and skips the creator entirely.
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1800);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const OW = ow().constructor;
const state = ow().state;
state.party.length = 0;
state.party.push(kinMod.createKin('cinderpaw', 30, d.game.rng, { originalTrainer: 'player' }));

async function shot(name, extra) {
  d.game.scenes.replaceAll(new OW(state, 'route_1', 5, 5, 'down'));
  await d.loadWait(1300);
  for (let i = 0; i < 30 && top().name === 'dialogue'; i++) d.key('Enter', 10);
  const o = ow();
  if (state.defeatedTrainers) state.defeatedTrainers.clear();

  // Ottel stands at 17,25 facing right. Walk east along row 26 into column 19,
  // stopping `extra` ticks past the boundary, then step up into his line.
  o.player.setTile(18, 26);
  o.lastTile = { x: 18, y: 26 };
  d.tick(4);
  d.down('KeyD');
  for (let i = 0; i < 60 && o.player.tileX !== 19; i++) d.tick(1);
  d.tick(extra);
  d.up('KeyD');
  d.tick(1);
  const body = o.player.x.toFixed(1);

  for (let i = 0; i < 40 && !o.busy && !o.wipe && top().name === 'overworld'; i++) d.hold('KeyW', 3);
  // Hold on the frame the challenge line is on screen: the approach is over,
  // the wipe has not started.
  for (let i = 0; i < 900 && top().name !== 'dialogue'; i++) d.tick(1);
  d.tick(14);
  const npc = o.npcs.find((n) => n.data.id === 'r1_ottel');
  await d.shoot(name, 2, 1);
  await d.shoot(name + '-4x', 0, 4);
  out.push(name + ' bodyX=' + body + ' player=' + o.player.tileX + ',' + o.player.tileY
    + ' ottel=' + npc.actor.tileX + ',' + npc.actor.tileY + ' scene=' + top().name);
}

await shot('facegap-clear', 5);
await shot('facegap-straddle', 1);
return out;
