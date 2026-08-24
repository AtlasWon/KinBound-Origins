// JOB 2. Battle 5 from the sweep, in detail: every step the queue runs, every
// hp animation's from/to and who it belongs to, and every engine event.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
for (let i = 0; i < 80 && top().name !== 'creator'; i++) d.key('Enter', 12);
for (let i = 0; i < 30; i++) {
  if (typeof top().rows !== 'function') { d.key('Enter', 20); continue; }
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const registry = (await import('/build/js/data/registry.js')).registry;
const state = top().state;
const species = [...registry.species.keys()];

const n = 5;
d.game.settings.battleSpeed = 'brisk';
d.game.settings.textSpeed = 'fast';
state.party.length = 0;
for (let i = 0; i < 3; i++) {
  state.party.push(kinMod.createKin(species[(n * 7 + i * 13) % species.length], 24 + i * 2,
    d.game.rng, { originalTrainer: 'player' }));
}
out.push('party: ' + state.party.map((k) => k.name + ' ' + k.currentHp + '/' + k.maxHp).join(', '));
const foes = [
  kinMod.createKin(species[(n * 11) % species.length], 25, d.game.rng),
  kinMod.createKin(species[(n * 17 + 3) % species.length], 26, d.game.rng),
];
out.push('foes: ' + foes.map((k) => k.name).join(', '));

d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: foes, isWild: false,
  aiTier: 'trained', backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
const scene = top();

// Note every step as it starts, and the player's bar as it moves.
let lastStep = null;
let lastBar = null;
const log = (s) => { if (out.length < 400) out.push(s); };

let guard = 0;
let turn = 0;
while (d.game.scenes.top === scene && guard++ < 5000) {
  const v = scene.view.player;
  const cur = scene.current;
  if (cur !== lastStep) {
    lastStep = cur;
    if (cur) {
      let extra = '';
      if (cur.kind === 'hp') {
        extra = ' side=' + cur.side + ' for=' + cur.kin.name + '(' + cur.kin.currentHp + ')'
          + ' from=' + Math.round(cur.from) + ' to=' + cur.to
          + ' viewKin=' + (scene.view[cur.side].kin ? scene.view[cur.side].kin.name : '-')
          + ' same=' + (scene.view[cur.side].kin === cur.kin);
      }
      if (cur.kind === 'sendOut') extra = ' side=' + cur.side + ' ' + cur.kin.name + ' hp=' + cur.hp;
      if (cur.kind === 'withdraw') extra = ' side=' + cur.side;
      if (cur.kind === 'text') extra = ' "' + scene.message + '"';
      log('  step ' + cur.kind + extra);
    }
  }
  const bar = Math.round(v.displayHp) + '/' + (v.kin ? v.kin.currentHp : '-') + ' ' + (v.kin ? v.kin.name : '-');
  if (bar !== lastBar) { lastBar = bar; log('    bar ' + bar); }

  if (scene.phase === 'menu' && !scene.current && scene.queue.length === 0) {
    turn++;
    log('== turn ' + turn + ' menu; bar=' + Math.round(v.displayHp)
      + ' model=' + v.kin.currentHp + ' active=' + scene.battle.player.active.name);
    const idx = scene.battle.player.party.findIndex(
      (k, i) => !k.fainted && i !== scene.battle.player.activeIndex);
    if (turn % 2 === 1 && idx >= 0) {
      log('   -> switch to slot ' + idx + ' (' + scene.battle.player.party[idx].name + ')');
      scene.submit(d.game, { kind: 'switch', partyIndex: idx });
    } else {
      log('   -> attack');
      scene.submit(d.game, { kind: 'move', index: 0 });
    }
    log('   queue: ' + scene.queue.map((q) => q.kind + (q.side ? ':' + q.side : '')).join(','));
    continue;
  }
  if (scene.phase === 'forcedSwitch') {
    const idx = scene.battle.player.party.findIndex((k) => !k.fainted);
    if (idx < 0) break;
    log('   forced switch to ' + scene.battle.player.party[idx].name);
    scene.battle.doSwitch('player', idx);
    scene.enqueue(scene.battle.drainEvents(), d.game);
    scene.phase = 'anim';
    continue;
  }
  if (scene.phase === 'finished') { d.key('Enter', 3); continue; }
  d.tick(1);
}
return out;

