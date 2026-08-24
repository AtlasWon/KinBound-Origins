// End to end: into the lab, talk to Vess, take a starter, walk out, meet Perrin.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];
const KEY={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'};
const go=(dir,tiles)=>{d.down(KEY[dir]);d.tick(Math.ceil(tiles*10)+1);d.up(KEY[dir]);d.tick(3);};
await d.loadWait(1400);
d.key('Enter', 4); d.key('Enter', 30); d.key('Enter', 60);
for (let i = 0; i < 30; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1500);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
const R = await import('/build/js/engine/renderer.js');
const tag = R.SCREEN_W + 'x' + R.SCREEN_H;
const ow = top();
ow.state.setFlag('mom_sendoff');
ow.state.setFlag('met_perrin');
await ow.loadMap(d.game, 'vess_station', 7, 9, 'up');
await d.loadWait(700);
go('up',3); out.push('a '+d.probe().pos); go('left',3); out.push('b '+d.probe().pos); go('up',4); out.push('c '+d.probe().pos); go('right',3); out.push('d '+d.probe().pos+' '+d.probe().facing);
out.push('walked to ' + JSON.stringify(d.probe()));
await d.shoot('e2e-' + tag + '-01-counter', 6);
d.key('Enter', 8);
// Vess's speech until the starter scene opens.
for (let i = 0; i < 40 && top().name !== 'starter'; i++) d.key('Enter', 8);
out.push('scene ' + top().name);
await d.shoot('e2e-' + tag + '-02-choose', 8);
d.key('KeyD', 10);
d.key('Enter', 8);
for (let i = 0; i < 8 && top().name === 'dialogue'; i++) d.key('Enter', 6);
await d.shoot('e2e-' + tag + '-03-take', 12);
await d.shoot('e2e-' + tag + '-04-settle', 24);
for (let i = 0; i < 60 && top().name !== 'overworld'; i++) d.key('Enter', 8);
out.push('back ' + JSON.stringify(d.probe()) + ' party=' + ow.state.party.map((k) => k.species).join(','));
await d.shoot('e2e-' + tag + '-05-lab-after', 8);
// Out of the lab and down onto the road.
go('down',7);
await d.loadWait(700);
out.push('outside ' + JSON.stringify(d.probe()));
go('down',1);
await d.shoot('e2e-' + tag + '-06-perrin-in', 40);
await d.shoot('e2e-' + tag + '-07-perrin-here', 42);
out.push('final ' + top().name);
return { out };
