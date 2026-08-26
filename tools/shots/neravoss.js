// The Neravoss encounter, played through by a bot, photographed, and TIMED.
//
// Two bots run: a `sharp` one that reads every telegraph, and a `clumsy` one
// that is deliberately bad -- it dodges late, mashes the restraint gauge, lets
// the link slip and walks under the animal's eye. The clumsy run is the one
// that matters. The whole encounter is built so that a player who plays badly
// takes longer and makes the storm worse and STILL FINISHES, so if the clumsy
// bot ever fails to reach the end, the design has broken its own promise.
const d = window.dev;
const top = () => d.game.scenes.top;
const out = [];

const KEY = { left: 'KeyA', right: 'KeyD', up: 'KeyW', confirm: 'KeyE' };

// Boot to a live overworld the way tools/shots/act1.js does: through the
// title, through the character creator, and out the front door. This driver
// only wants a real GameState to hang a party off; where the player is
// standing is irrelevant, because the set piece draws its own screen.
await d.loadWait(1400);
for (let i = 0; i < 90 && top().name !== 'title'; i++) d.key('Enter', 10);
if (top().name === 'title' && top().menu) { top().menu.index = 0; d.key('Enter', 24); }
for (let i = 0; i < 60 && top().name !== 'creator'; i++) d.key('Enter', 10);
for (let i = 0; i < 30 && top().name === 'creator'; i++) {
  const rows = top().rows();
  if ((rows[top().sel] || {}).action === 'begin') { d.key('Enter', 40); break; }
  d.key('KeyS', 2);
}
await d.loadWait(1600);
for (let i = 0; i < 60 && top().name !== 'overworld'; i++) d.key('Enter', 10);
if (top().name !== 'overworld') return { error: 'never reached the overworld: ' + top().name };

const state = top().state;
const { NeravossScene } = await import('/build/js/scenes/neravoss.js');
const { createKin } = await import('/build/js/systems/kin.js');

// A party a player who walked here would be holding. Levels are the
// `rotating team` column of tests/helpers/simulate.mjs at Crownspire.
const build = () => {
  state.party.length = 0;
  for (const [sp, lv] of [['volcatrix', 45], ['maelstrix', 44], ['galecrest', 44], ['menhir', 43]]) {
    state.party.push(createKin(sp, lv, d.game.rng, { originalTrainer: 'player' }));
  }
  state.setFlag('starter_cinderpaw');
  state.giveItem('tideheart');
  state.setFlag('tideheart_taken', false);
  for (let c = 1; c <= 8; c++) state.giveCrest(c);
};

const run = (label, sharp, shoot) => {
  build();
  let done = false;
  const scene = new NeravossScene(state, () => { done = true; });
  d.game.scenes.push(scene);
  d.tick(2);

  const marks = {};
  let frames = 0;
  let lastPhase = '';
  const held = new Set();
  const hold = (k, on) => {
    if (on && !held.has(k)) { d.down(k); held.add(k); }
    if (!on && held.has(k)) { d.up(k); held.delete(k); }
  };
  const clearHeld = () => { for (const k of [...held]) { d.up(k); held.delete(k); } };

  const shots = [];

  while (!done && frames < 60 * 60 * 8) {
    const s = scene;
    if (s.phase !== lastPhase) {
      marks[s.phase] = marks[s.phase] ?? frames;
      lastPhase = s.phase;
    }

    // A dialogue box on top: page through it.
    if (top().name === 'dialogue') {
      clearHeld();
      d.key('Enter', 3);
      frames += 5;
      continue;
    }

    if (s.phase === 'survive') {
      // Stand in a lane the sea is not aimed at. The clumsy bot only starts
      // moving when the wave is nearly on top of it, and often too late.
      const react = sharp ? 0.15 : 0.93;
      if (s.waveState === 'tell' && s.waveT >= s.waveTell * react) {
        const lanes = s.waveLanes;
        const cur = s.laneOf(s.playerTargetX);
        if (lanes.includes(cur)) {
          const safe = [0, 1, 2].find((l) => !lanes.includes(l));
          const dir = safe > cur ? 'right' : 'left';
          hold(KEY[dir], true);
          d.tick(2);
          hold(KEY[dir], false);
          frames += 2;
          continue;
        }
      }
      clearHeld();
      d.tick(2); frames += 2;
      continue;
    }

    if (s.phase === 'restraints') {
      if (s.clunk > 0) { d.tick(1); frames += 1; continue; }
      const band = s.ringGauge().band;
      const sweep = s.ringSweep();
      // Sharp: press inside the open window, aiming near its middle the way a
      // person does. Clumsy: mash blind every nine frames.
      const want = sharp ? Math.abs(sweep - 0.5) <= band * 0.28 : (s.ringT % 9 === 0);
      if (want) { d.key(KEY.confirm, 1); frames += 3; } else { d.tick(1); frames += 1; }
      continue;
    }

    if (s.phase === 'tideheart') {
      // Sharp holds and steers. Clumsy lets go every so often and oversteers.
      const slack = sharp ? true : (frames % 40) < 26;
      hold(KEY.confirm, slack);
      const err = s.linkZ - s.linkP;
      const dead = sharp ? 0.008 : 0.06;
      hold(KEY.right, err > dead);
      hold(KEY.left, err < -dead);
      d.tick(1); frames += 1;
      continue;
    }

    if (s.phase === 'reach') {
      // Sharp moves only while it is settled and not telling. Clumsy walks
      // whenever it feels like it, and gets pushed back for it.
      const safe = sharp ? (!s.watching && s.tell < 6) : (frames % 30) < 22;
      hold(KEY.right, safe);
      d.tick(1); frames += 1;
      continue;
    }

    clearHeld();
    d.tick(2); frames += 2;

    if (shoot && shots.length < 12) {
      const key = s.phase + (s.phase === 'open' ? '-' + Object.keys(marks).length : '');
      if (!shots.includes(key)) shots.push(key);
    }
  }
  clearHeld();
  if (!done) { d.game.scenes.pop(); d.tick(2); }

  return {
    label,
    finished: done,
    seconds: +(frames / 60).toFixed(1),
    grace: state.getVar('neravoss_grace'),
    calm: !!state.hasFlag('neravoss_calm'),
    swim: state.hasArt('swim'),
    marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +(v / 60).toFixed(1)])),
  };
};

/* ------------------------------------------------------------ the pictures */

build();
let shotDone = false;
const shotScene = new NeravossScene(state, () => { shotDone = true; });
d.game.scenes.push(shotScene);
d.tick(2);

const settle = (frames) => {
  for (let i = 0; i < frames; i++) {
    if (top().name === 'dialogue') { d.key('Enter', 3); continue; }
    d.tick(1);
  }
};

const jumpTo = (phase, prep) => {
  for (let i = 0; i < 60 * 60 && shotScene.phase !== phase && !shotDone; i++) {
    if (top().name === 'dialogue') { d.key('Enter', 3); continue; }
    if (prep) prep(shotScene);
    d.tick(1);
  }
};

settle(120);
await d.shoot('nv-01-open', 4, 1);
out.push('open ' + shotScene.phase);

jumpTo('survive');
settle(50);
await d.shoot('nv-02-survive-tell', 4, 1);

// Stand in the wave on purpose, to photograph the knock-down.
for (let i = 0; i < 400 && shotScene.down === 0; i++) {
  if (top().name === 'dialogue') { d.key('Enter', 3); continue; }
  if (shotScene.waveState === 'tell' && !shotScene.waveLanes.includes(shotScene.laneOf(shotScene.playerTargetX))) {
    shotScene.playerTargetX = [42, 118, 196][shotScene.waveLanes[0]];
  }
  d.tick(1);
}
await d.shoot('nv-03-survive-hit', 3, 1);

// Force on to the clamps rather than surviving six waves by hand.
shotScene.wave = 6;
jumpTo('restraints');
settle(40);
await d.shoot('nv-04-restraints', 4, 1);
shotScene.ringsOn[0] = false;
shotScene.ringsOn[1] = false;
shotScene.ring = 2;
shotScene.bolt = 1;
shotScene.clunk = 0;
settle(30);
await d.shoot('nv-05-restraints-two-off', 4, 1);
shotScene.missRing();
settle(6);
await d.shoot('nv-06-restraints-miss', 2, 1);

shotScene.ringsOn[2] = false;
shotScene.ringsOn[3] = false;
shotScene.ring = 4;
shotScene.bolt = 0;
shotScene.clunk = 0;
shotScene.phase = 'open';
shotScene.queueTideheart();
jumpTo('tideheart');
settle(40);
shotScene.link = 58;
settle(6);
await d.shoot('nv-07-tideheart', 3, 1);

shotScene.link = 100;
settle(8);
jumpTo('reach');
settle(60);
shotScene.watching = true;
settle(4);
await d.shoot('nv-08-reach-watching', 3, 1);
shotScene.watching = false;
shotScene.reach = 40;
settle(30);
await d.shoot('nv-09-reach-close', 3, 1);

shotScene.reach = 22;
settle(4);
shotScene.phase = 'open';
shotScene.starterOut = 1;
shotScene.queueCalm();
jumpTo('calm');
settle(60);
await d.shoot('nv-10-starter', 3, 1);
settle(150);
await d.shoot('nv-11-calming', 3, 1);
settle(120);
jumpTo('gone');
settle(60);
await d.shoot('nv-12-going-under', 3, 1);

for (let i = 0; i < 600 && !shotDone; i++) {
  if (top().name === 'dialogue') { d.key('Enter', 3); continue; }
  d.tick(1);
}
out.push('shot run finished: ' + shotDone);
if (!shotDone) { d.game.scenes.pop(); d.tick(2); }

/* -------------------------------------------------------------- the timing */

const sharp = run('sharp', true, false);
const clumsy = run('clumsy', false, false);


/* ===================================================================== *
 *  THE JOIN
 *
 *  Everything above drives the scene object directly, which proves the
 *  encounter works and proves nothing at all about whether a player can reach
 *  it. This last run does the thing that actually matters: it puts a real
 *  save on the real map with the real gate flag set, walks in through the
 *  door, and checks that the `enter` script fires, the set piece takes the
 *  screen, the script survives it, and the flags the rest of Stage 6 is
 *  waiting on are on the other side.
 * ===================================================================== */

const Overworld = (await import('/build/js/scenes/overworld.js')).OverworldScene;

build();
// Wind the save back to the moment the player walks up out of the power room.
for (const f of ['neravoss_calm', 'act6_done', 'neravoss_encounter_seen']) state.setFlag(f, false);
state.arts.delete('swim');
state.setFlag('td_power_done');

// Put the player on the tile the stairs from the power room actually land
// them on, then WALK. The trigger is at the water's edge, fourteen tiles
// north, and walking there is the part being tested.
d.game.scenes.replaceAll(new Overworld(state, 'temple_deep_heart', 19, 34, 'up'));
await d.loadWait(1600);

const join = { entered: top().name, from: d.probe().pos, sawSetPiece: false };
await d.shoot('nv-00-walking-in', 6, 1);
for (let i = 0; i < 24 && top().name === 'overworld'; i++) d.walk('up', 1);
join.reached = d.probe().pos;
for (let i = 0; i < 60 * 60 * 6; i++) {
  const t = top();
  if (t.name === 'neravoss') {
    join.sawSetPiece = true;
    // Play it competently: the join run is about the plumbing, not the timing.
    const s = t;
    if (s.phase === 'survive') {
      if (s.waveState === 'tell' && s.waveT >= s.waveTell * 0.2) {
        const lanes = s.waveLanes;
        const cur = s.laneOf(s.playerTargetX);
        if (lanes.includes(cur)) {
          const safe = [0, 1, 2].find((l) => !lanes.includes(l));
          d.hold(safe > cur ? KEY.right : KEY.left, 2);
          continue;
        }
      }
    } else if (s.phase === 'restraints' && s.clunk === 0) {
      if (Math.abs(s.ringSweep() - 0.5) <= s.ringGauge().band * 0.28) { d.key(KEY.confirm, 1); continue; }
    } else if (s.phase === 'tideheart') {
      d.down(KEY.confirm);
      const err = s.linkZ - s.linkP;
      if (err > 0.008) { d.down(KEY.right); d.up(KEY.left); }
      else if (err < -0.008) { d.down(KEY.left); d.up(KEY.right); }
      else { d.up(KEY.left); d.up(KEY.right); }
      d.tick(1);
      continue;
    } else if (s.phase === 'reach') {
      if (!s.watching && s.tell < 6) d.down(KEY.right); else d.up(KEY.right);
      d.tick(1);
      continue;
    }
    d.up(KEY.confirm); d.up(KEY.right); d.up(KEY.left);
    d.tick(1);
    continue;
  }
  if (t.name === 'dialogue') { d.key('Enter', 3); continue; }
  // Run on until the SCRIPT is finished, not until the scene is: the flags
  // the rest of Stage 6 waits on are set after the set piece pops, and an
  // earlier break here read them half-written.
  if (state.hasFlag('act6_done')) break;
  d.tick(1);
}

await d.shoot('nv-13-after-the-storm', 20, 1);
join.scene = top().name;
join.map = d.probe().map;
join.calm = !!state.hasFlag('neravoss_calm');
join.act6 = !!state.hasFlag('act6_done');
join.swim = state.hasArt('swim');
join.grace = state.getVar('neravoss_grace');
join.tideheartHeld = state.hasItem('tideheart');
join.weather = top().map && top().map.weather;

return { out, sharp, clumsy, join };
