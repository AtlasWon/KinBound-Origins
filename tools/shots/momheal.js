// Plays the tail of mh_perrin_first -- the walk home and the mother's heal --
// without fighting the battle first. Takes the real script out of the registry
// and starts it from the action after `setVar act 1`, so what runs here is
// exactly the shipped data.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const clear = (n) => { for (let i = 0; i < n && top().name === 'dialogue'; i++) d.key('Enter', 12); };

await d.loadWait(1400);
for (let i = 0; i < 12 && typeof top().rows !== 'function'; i++) d.key('Enter', 40);
for (let i = 0; i < 60; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
clear(20);

const state = top().state;
const Overworld = top().constructor;
const { createKin } = await import('/build/js/systems/kin.js');
const { registry } = await import('/build/js/data/registry.js');

state.playerName = 'MARA';
state.party.length = 0;
const k = createKin('sprigling', 6, d.game.rng);
k.currentHp = Math.max(1, Math.round(k.maxHp * 0.22));
state.party.push(k);
state.setFlag('got_starter');
state.setFlag('mom_sendoff');

d.game.scenes.replaceAll(new Overworld(state, 'marrow_hollow', 22, 8, 'down'));
await d.loadWait(1400);
clear(10);

const full = registry.scripts.get('mh_perrin_first');
out.push('script found: ' + !!full + ' actions=' + (full ? full.actions.length : 0));
const cut = full.actions.findIndex((a) => a.kind === 'setVar' && a.var === 'act');
out.push('coda starts after index ' + cut);
const coda = { id: 'coda', trigger: 'call', actions: full.actions.slice(cut + 1) };
out.push('coda actions: ' + coda.actions.map((a) => a.kind).join(','));

const sc = top();
sc.events.start(coda);
out.push('mom rest before: ' + state.hasFlag('mom_rest'));

// Run it, answering dialogue as it comes, and photograph the beats.
let shots = 0;
let seenHeal = false;
let logged = false;
for (let i = 0; i < 400; i++) {
  // The warp in the middle of this script awaits a real fetch for the map
  // JSON. Ticking synchronously never lets that promise settle, so the run has
  // to give the event loop a turn between ticks or it hangs on the fade.
  await d.sleep(1);
  const t = top();
  if (t.name === 'dialogue') {
    if (shots < 14) { await d.shoot('momheal-say-' + (shots++), 0, 2); }
    d.key('Enter', 10);
    continue;
  }
  if (t.name === 'healfx' && !seenHeal) {
    seenHeal = true;
    for (const m of [0, 6, 14, 22, 30, 40]) {
      await d.shoot('momheal-fx-' + String(m).padStart(2, '0'), 0, 1);
      d.tick(m === 40 ? 1 : 6);
      if (top().name !== 'healfx') break;
    }
    continue;
  }
  if (t.name === 'overworld' && sc.map.id === 'marrow_house_player' && !logged) {
    logged = true;
    out.push('in house: player@' + sc.player.tileX + ',' + sc.player.tileY
      + ' facing ' + sc.player.facing
      + ' | npcs ' + sc.npcs.map((n) => n.data.id + '@' + n.actor.tileX + ',' + n.actor.tileY
        + ' ' + n.actor.facing).join(' '));
  }
  if (!sc.events.running && t.name === 'overworld') break;
  d.tick(2);
}
out.push('end: ' + JSON.stringify(d.probe()));
out.push('mom rest after: ' + state.hasFlag('mom_rest'));
out.push('hp after: ' + state.party.map((x) => x.currentHp + '/' + x.maxHp).join(' '));
await d.shoot('momheal-end', 6, 1);
return out;
