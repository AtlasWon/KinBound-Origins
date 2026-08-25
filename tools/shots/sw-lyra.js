// Lyra at the Aurelian case, and the voices around her.
//
// The one scene in Stonewake that has to land: she recognises the markings on
// the Tideheart, does not name it, does not become sinister, and does not say
// whose daughter she is. Played twice -- without the keepsake and with it --
// because the branch that matters is the one the object opens.
//
//   npx electron tools/capture.cjs tools/shots/sw-lyra.js

const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

/**
 * Press through a scene, recording each box once.
 *
 * A scene is not over when the box closes: an event can wait, shake, play a
 * sound and open another one, and a loop that stops the first time the stack is
 * not a dialogue walks off in the middle of the beat that matters. So this only
 * gives up after several quiet passes in a row.
 */
const say = (max = 60) => {
  let quiet = 0;
  let last = null;
  for (let i = 0; i < max && quiet < 8; i++) {
    if (top().name === 'dialogue') {
      quiet = 0;
      d.tick(70);
      const p = d.probe();
      if (p.text && p.text !== last) { out.push('  ' + p.text); last = p.text; }
      d.key('Enter', 8);
    } else {
      quiet++;
      d.tick(12);
    }
  }
  d.tick(6);
};

await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 80; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') break;
  d.key('KeyS', 2);
}
d.key('Enter', 60);
await d.loadWait(1600);
for (let i = 0; i < 24 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const state = top().state;
const Overworld = top().constructor;

const talkToLyra = (tag) => {
  const sc = d.game.scenes.find('overworld') || top();
  sc.player.setTile(11, 5);
  sc.player.facing = 'up';
  sc.lastTile = { x: 11, y: 5 };
  d.tick(4);
  out.push(tag + ':');
  d.key('Enter', 20);
  say();
};

/* ---------- the way it actually happens: arriving already carrying it ---------- */

state.giveItem('tideheart', 1);
state.setFlag('tideheart_given');
d.game.scenes.replaceAll(new Overworld(state, 'stonewake_museum', 11, 8, 'up'));
await d.loadWait(1200);
talkToLyra('first meeting, carrying the Tideheart');
await d.shoot('lyra-02-recognises', 6, 1);
out.push('flags: met_lyra=' + state.hasFlag('met_lyra')
  + ' lyra_saw_tideheart=' + state.hasFlag('lyra_saw_tideheart')
  + ' tideheart_named=' + state.hasFlag('tideheart_named')
  + '  (named must stay false: Cassian names it in Act 2)');
out.push('escape lines: ' + state.itemCount('escape_line'));

/* ----------------------------------------- and once she has seen it */

talkToLyra('after she has seen it');
await d.shoot('lyra-03-after', 6, 1);

return { out };
