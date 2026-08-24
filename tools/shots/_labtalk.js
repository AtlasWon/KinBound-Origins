// Walk in the lab's front door, cross to Dr. Vess, and take a starter.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

await d.loadWait(1400);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(900);
for (let i = 0; i < 30 && top().name !== 'overworld'; i++) d.key('Enter', 12);
const state = top().state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

const KEY = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD' };
const go = (dir, tiles) => { d.down(KEY[dir]); d.tick(Math.ceil(tiles * 14) + 2); d.up(KEY[dir]); d.tick(6); };

d.game.scenes.replaceAll(new Overworld(state, 'vess_station', 8, 10, 'up'));
await d.loadWait(1000);
for (let i = 0; i < 20 && top().name === 'dialogue'; i++) d.key('Enter', 10);
d.tick(6);
await d.shoot('lt-01-doorway', 8, 1);
go('up', 5);
out.push('a ' + d.probe().pos);
await d.shoot('lt-02-at-the-table', 8, 1);
go('right', 3);
out.push('b ' + d.probe().pos);
go('up', 1);
out.push('c ' + d.probe().pos + ' ' + d.probe().facing);
await d.shoot('lt-03-facing-vess', 8, 1);
d.key('Enter', 8);
for (let i = 0; i < 50 && top().name !== 'starter'; i++) d.key('Enter', 8);
out.push('scene ' + top().name);
await d.shoot('lt-04-choose', 10, 1);
d.key('Enter', 8);
for (let i = 0; i < 10 && top().name === 'dialogue'; i++) d.key('Enter', 6);
for (let i = 0; i < 60 && top().name !== 'overworld'; i++) d.key('Enter', 8);
out.push('party ' + state.party.map((k) => k.species).join(','));
await d.shoot('lt-05-after', 10, 1);
return { out };
