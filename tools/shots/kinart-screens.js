// The remaining places a creature sprite is drawn: the Vellum entry, the
// summary sheet, and the Roost. All of them on an image-backed species with a
// procedural one beside it.
const d = window.dev;
const top = () => d.game.scenes.top;
await d.loadWait(1400);
d.key('Enter', 4); d.key('Enter', 30); d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const vellumMod = await import('/build/js/scenes/vellum.js');
const partyMod = await import('/build/js/scenes/party.js');
const state = top().state;

state.party.length = 0;
const mk = (sp, lv) => kinMod.createKin(sp, lv, d.game.rng, { originalTrainer: 'player' });
state.party.push(mk('cinderpaw', 14), mk('sprigling', 12), mk('rilltail', 13), mk('pebblet', 11));
for (const id of ['cinderpaw', 'rilltail', 'sprigling', 'pebblet', 'nibbet']) {
  state.seen.add(id);
  state.caught.add(id);
}

d.game.scenes.push(new vellumMod.VellumScene(state));
d.tick(2);
await d.shoot('kas-01-vellum', 10);
d.key('KeyS', 6);
await d.shoot('kas-02-vellum-next', 6);
d.game.scenes.pop();

d.game.scenes.push(new partyMod.SummaryScene(state.party[0]));
d.tick(2);
await d.shoot('kas-03-summary-image', 8);
d.game.scenes.pop();
d.game.scenes.push(new partyMod.SummaryScene(state.party[1]));
d.tick(2);
await d.shoot('kas-04-summary-procedural', 8);
return { ok: true };
