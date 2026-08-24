// The difficulty curve, checked in the running game rather than in a
// spreadsheet. Loads Route 2 for real, gives the player the level a measured
// Route 1 actually leaves them at, walks the grass until the game rolls its own
// encounters, and shoots the fight at 1x so the foe's level can be read against
// the player's.
//
// Usage: npx electron tools/capture.cjs tools/shots/curve.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const KEY = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const go = (dir, tiles) => { d.down(KEY[dir]); d.tick(Math.ceil(tiles * 10) + 1); d.up(KEY[dir]); d.tick(3); };

await d.loadWait(1400);
for (let i = 0; i < 10 && typeof top().rows !== 'function'; i++) d.key('Enter', 30);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
out.push('booted to ' + top().name);

const kinMod = await import('/build/js/systems/kin.js');
const ow = top();
const state = ow.state;

// The measured arrival level for a player who caught things on Route 1.
state.party.length = 0;
const hero = kinMod.createKin('sprigling', 10, d.game.rng, { originalTrainer: 'player' });
state.party.push(hero);
for (const sp of ['tuftail', 'pipwing']) {
  state.party.push(kinMod.createKin(sp, 9, d.game.rng, { originalTrainer: 'player' }));
}

// The grass block in the south-west corner of the route, rows 29-31, x 4-7.
await ow.loadMap(d.game, 'route_2', 5, 30, 'up');
await d.loadWait(800);
out.push('on ' + d.probe().map + ' at ' + d.probe().pos
  + ' terrain ' + ow.map.terrainAt(5, 30).tag
  + ' party ' + state.party.map((k) => k.species + ' L' + k.level).join(', '));
d.game.settings.battleSpeed = 'fast';
d.game.settings.textSpeed = 'fast';

// Walk the grass until the game rolls encounters of its own accord.
let shots = 0;
for (let pass = 0; pass < 80 && shots < 4; pass++) {
  go(pass % 2 ? 'down' : 'up', 1);
  go(pass % 4 < 2 ? 'right' : 'left', 1);
  d.tick(4);
  if (top().name !== 'battle') continue;
  const s = top();
  for (let i = 0; i < 400 && s.phase !== 'menu'; i++) {
    if (s.current && s.current.kind === 'text') d.key('Enter', 0); else d.tick(1);
  }
  const foe = s.battle.foe.active;
  out.push('ENCOUNTER ' + foe.species + ' L' + foe.level + '  vs ' + hero.name + ' L' + hero.level);
  await d.shoot('curve-r2-' + shots, 0);
  shots++;

  // Press the first move that actually hits and keep pressing it -- the play
  // style in the bug report. Index 0 is often Brace, and a driver that presses
  // Brace twelve times measures nothing.
  const idx = Math.max(0, hero.moves.findIndex((m) => (m.data?.power ?? 0) > 0));
  for (let turn = 0; turn < 12 && !s.battle.over; turn++) {
    s.submit(d.game, { kind: 'move', index: idx });
    for (let i = 0; i < 900 && s.phase !== 'menu' && !s.battle.over; i++) {
      if (s.current && s.current.kind === 'text') d.key('Enter', 0); else d.tick(1);
    }
  }
  out.push('  -> ' + (s.battle.result ?? 'unresolved')
    + ', you ended on ' + hero.currentHp + '/' + hero.maxHp);
  for (let i = 0; i < 400 && top().name === 'battle'; i++) d.key('Enter', 2);
  await d.loadWait(300);
  if (!state.partyIsAlive) { out.push('  party wiped'); break; }
}
out.push('encounters seen: ' + shots);
return out.join('\n');
