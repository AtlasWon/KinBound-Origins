// The Bell Hall puzzle, played through.
//
// Two seed-stones up two lanes onto two sun-plates, then the arch, then the
// Keeper. Run it after any change to briarbell_hall: the failure mode of a
// push puzzle is that it compiles perfectly and cannot be solved.
//
//   npx electron tools/capture.cjs tools/shots/bellhall.js

const d = window.dev;
const out = [];
const pos = () => (d.probe().pos || '-1,-1').split(',').map(Number);

await d.loadWait(1200);
d.key('Enter', 20); await d.loadWait(400);
d.key('Enter', 20); await d.loadWait(600);
const state = d.game.scenes.top.state;
const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;
const { createKin } = await import('/build/js/systems/kin.js');
const { Rng } = await import('/build/js/core/rng.js');
state.addKin(createKin('cinderpaw', 10, new Rng('bh'), { originalTrainer: 'player' }));
state.markDefeated('briar_hand_a');
state.markDefeated('briar_hand_b');

const walkTo = (tx, ty) => {
  let stuck = 0;
  for (let i = 0; i < 200; i++) {
    const [x, y] = pos();
    if (x === tx && y === ty) return true;
    const wantX = x < tx ? 'right' : x > tx ? 'left' : null;
    const wantY = y < ty ? 'down' : y > ty ? 'up' : null;
    for (const dir of (stuck % 2 === 0 ? [wantX, wantY] : [wantY, wantX])) {
      if (!dir) continue;
      d.walk(dir, 1);
      if (pos()[0] !== x || pos()[1] !== y) { stuck = -1; break; }
    }
    stuck++;
    if (stuck > 12) return false;
  }
  return false;
};

d.game.scenes.replaceAll(new Overworld(state, 'briarbell_hall', 3, 10, 'up'));
await d.loadWait(1000);
state.setVar('briarbell_hall_plates', 0);

const push = async (want) => {
  for (let i = 0; i < 6; i++) {
    d.walk('up', 1);
    await d.sleep(140);
    if (state.getVar('briarbell_hall_plates') >= want) return true;
  }
  return false;
};

out.push('west stone -> plate: ' + (await push(1)) + ', player ' + d.probe().pos
  + ', plates=' + state.getVar('briarbell_hall_plates'));
await d.shoot('bhp-west', 6, 1);

out.push('back down the west lane: ' + walkTo(3, 9));
out.push('across the chamber: ' + walkTo(14, 10));
out.push('east stone -> plate: ' + (await push(2)) + ', player ' + d.probe().pos
  + ', plates=' + state.getVar('briarbell_hall_plates'));
await d.shoot('bhp-east', 6, 1);

out.push('to the arch: ' + walkTo(14, 7) + ' ' + walkTo(8, 7) + ' ' + walkTo(8, 6));
d.walk('up', 1); await d.sleep(700);
for (let i = 0; i < 4; i++) { d.key('Enter', 30); await d.sleep(400); }
out.push('arch: player ' + d.probe().pos + ' gate_open=' + state.hasFlag('bbhall_gate_open'));
await d.shoot('bhp-arch', 6, 1);

out.push('to the Keeper: ' + walkTo(8, 3) + ' -> ' + d.probe().pos);
await d.shoot('bhp-keeper', 6, 1);
return { out };
