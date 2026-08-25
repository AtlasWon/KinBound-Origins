// JOB 2, sharper sweep.
//
// The bar is *meant* to lag the model -- a whole turn is resolved before any of
// it is drawn -- so "bar < model" mid-turn is the design, not the bug. The
// things that would actually be wrong:
//   A. at the action menu, with nothing left to animate, the bar disagrees with
//      the kin it is drawn for;
//   B. a kin walks on showing anything other than the health it walked on with;
//   C. the panel is drawn for a kin that is not the one the engine has out;
//   D. a benched kin's health changes while it is benched.
// Runs with and without a player mashing confirm through every beat.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
// Press through the title, the menu and the cinematic until the creator is
// actually on top. A fixed count of Enters broke when the menu gained a
// transition into the cinematic and moved the beat this landed on.
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
await d.loadWait(1600);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const registry = (await import('/build/js/data/registry.js')).registry;
const state = top().state;
const species = [...registry.species.keys()];

const problems = [];
let menus = 0, arrivals = 0, switches = 0;
const note = (s) => { if (problems.length < 40) problems.push(s); else problems.push(''); };

function runOne(n, mash) {
  d.game.settings.battleSpeed = ['classic', 'brisk', 'fast'][n % 3];
  d.game.settings.textSpeed = n % 2 ? 'fast' : 'normal';
  state.party.length = 0;
  for (let i = 0; i < 3; i++) {
    state.party.push(kinMod.createKin(species[(n * 7 + i * 13) % species.length], 24 + i * 2,
      d.game.rng, { originalTrainer: 'player' }));
  }
  const foes = [
    kinMod.createKin(species[(n * 11) % species.length], 25, d.game.rng),
    kinMod.createKin(species[(n * 17 + 3) % species.length], 26, d.game.rng),
  ];
  d.game.scenes.push(new battleMod.BattleScene({
    state, playerParty: state.party, foeParty: foes, isWild: false,
    aiTier: 'trained', backdrop: 'grass', onFinish: () => {},
  }));
  d.tick(2);
  const scene = top();
  if (!scene || scene.name !== 'battle') return;
  const tag = 'battle ' + n + (mash ? ' (mashing)' : '') + ': ';

  let guard = 0, turn = 0;
  let lastStep = null;
  // Snapshot of everyone's health, refreshed each turn, to catch a benched kin
  // quietly changing.
  let benchSnap = null;
  // Every slot that held the field at any point since the last menu. A kin can
  // be switched in, knocked out and replaced inside one turn, and it was never
  // on the bench for any of that.
  let onFieldSince = new Set();

  while (d.game.scenes.top === scene && guard++ < 6000) {
    const v = scene.view.player;
    const cur = scene.current;
    onFieldSince.add(scene.battle.player.activeIndex);
    if (v.kin) {
      const vi = scene.battle.player.party.indexOf(v.kin);
      if (vi >= 0) onFieldSince.add(vi);
    }

    // B: what a kin walks on with.
    if (cur !== lastStep) {
      if (cur && cur.kind === 'sendOut' && cur.side === 'player') {
        arrivals++;
        if (Math.round(v.displayHp) !== cur.hp) {
          note(tag + cur.kin.name + ' walked on showing ' + Math.round(v.displayHp)
            + ' but it left the bench with ' + cur.hp);
        }
        if (v.kin !== cur.kin) note(tag + 'send-out did not take the panel');
      }
      lastStep = cur;
    }

    if (scene.phase === 'menu' && !scene.current && scene.queue.length === 0) {
      menus++;
      // A: the numbers the player reads before deciding.
      if (v.kin && Math.round(v.displayHp) !== v.kin.currentHp) {
        note(tag + 'at the menu the bar reads ' + Math.round(v.displayHp) + ' but '
          + v.kin.name + ' has ' + v.kin.currentHp + '/' + v.kin.maxHp);
      }
      // C: the panel belongs to whoever is out.
      if (v.kin && v.kin !== scene.battle.player.active) {
        note(tag + 'panel shows ' + v.kin.name + ', engine has ' + scene.battle.player.active.name);
      }
      // D: the bench.
      const party = scene.battle.player.party;
      if (benchSnap) {
        for (let i = 0; i < party.length; i++) {
          if (onFieldSince.has(i)) continue;
          if (party[i].currentHp !== benchSnap[i]) {
            note(tag + party[i].name + ' went ' + benchSnap[i] + ' -> ' + party[i].currentHp
              + ' while benched');
          }
        }
      }
      benchSnap = party.map((k) => k.currentHp);
      onFieldSince = new Set([scene.battle.player.activeIndex]);

      turn++;
      const idx = party.findIndex((k, i) => !k.fainted && i !== scene.battle.player.activeIndex);
      if (turn % 2 === 1 && idx >= 0) { switches++; scene.submit(d.game, { kind: 'switch', partyIndex: idx }); }
      else scene.submit(d.game, { kind: 'move', index: 0 });
      continue;
    }
    if (scene.phase === 'forcedSwitch') {
      const idx = scene.battle.player.party.findIndex((k) => !k.fainted);
      if (idx < 0) break;
      scene.battle.doSwitch('player', idx);
      scene.enqueue(scene.battle.drainEvents(), d.game);
      scene.phase = 'anim';
      continue;
    }
    if (scene.phase === 'finished') { d.key('Enter', 3); continue; }
    if (mash) d.key('Enter', 0); else d.tick(1);
  }
  if (d.game.scenes.top === scene) d.game.scenes.pop();
  d.tick(4);
}

for (let n = 0; n < 24; n++) runOne(n, n % 2 === 1);

out.push('menus ' + menus + ', arrivals ' + arrivals + ', switches ' + switches);
out.push('problems ' + problems.filter(Boolean).length);
for (const p of problems.filter(Boolean).slice(0, 30)) out.push('  ' + p);
return out;

