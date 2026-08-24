// JOB 3 proof. For every hand-drawn species, front and back, in every pose the
// idle can reach: is what is on screen the SAME DRAWING as the artwork, only
// moved?
//
// It reads the game's own back buffer, so it tests the blit the game actually
// runs. Every fully-opaque pixel of the sprite must appear on screen, in its
// own colour, at exactly (origin + lift). One pixel of the wrong colour, or one
// missing, means the drawing was deformed -- which is the whole class of bug
// this idle was rebuilt to make impossible.
//
// Usage: npx electron tools/capture.cjs tools/shots/breathrigid.js

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
await d.loadWait(1500);
for (let i = 0; i < 16 && top().name === 'dialogue'; i++) d.key('Enter', 10);

const kinMod = await import('/build/js/systems/kin.js');
const battleMod = await import('/build/js/scenes/battle.js');
const breathMod = await import('/build/js/gfx/kinbreath.js');
const spriteMod = await import('/build/js/gfx/kinsprite.js');

const state = top().state;
state.party.length = 0;
state.party.push(kinMod.createKin('cinderpaw', 20, d.game.rng, { originalTrainer: 'player' }));
d.game.settings.battleSpeed = 'classic';
d.game.settings.textSpeed = 'fast';
d.game.scenes.push(new battleMod.BattleScene({
  state, playerParty: state.party, foeParty: [kinMod.createKin('nibbet', 5, d.game.rng)],
  isWild: true, backdrop: 'grass', onFinish: () => {},
}));
d.tick(2);
for (let i = 0; i < 200 && top().phase !== 'menu'; i++) d.key('Enter', 4);
const scene = top();

const res = await fetch('/assets/kin/index.json');
const idx = await res.json();
const drawn = [...new Set((idx.files || [])
  .map((f) => f.toLowerCase().replace(/-(front|back)\.png$/, '')))].sort();
out.push('hand-drawn species: ' + drawn.length);

const buf = d.game.renderer.buffer;
const g = buf.getContext('2d', { willReadFrequently: true });
const CELL = 128;
const DETAIL = 2;
// The scene's own sprite origins, in logical units, times DETAIL.
const ORIGIN = { back: { x: 14 * DETAIL, y: 40 * DETAIL }, front: { x: 158 * DETAIL, y: 2 * DETAIL } };

// One readback of the whole cell plus room for the lift above it.
const PAD = 8;
const grab = (o) => g.getImageData(o.x, o.y - PAD, CELL, CELL + PAD).data;

function spriteAlpha(id, back) {
  const cv = back ? spriteMod.backSprite(id) : spriteMod.frontSprite(id);
  const c = cv.getContext('2d', { willReadFrequently: true });
  return c.getImageData(0, 0, CELL, CELL).data;
}

const problems = [];
const lifts = [];
let poses = 0;
let compared = 0;
let shaded = 0;

for (const side of ['back', 'front']) {
  const back = side === 'back';
  const v = back ? scene.view.player : scene.view.foe;
  const other = back ? scene.view.foe : scene.view.player;
  const o = ORIGIN[side];
  other.visible = false;

  for (const id of drawn) {
    let kin;
    try { kin = kinMod.createKin(id, 20, d.game.rng, { originalTrainer: 'player' }); }
    catch { problems.push(id + ': no such species'); continue; }
    v.kin = kin;
    v.displayHp = kin.currentHp;
    v.visible = true; v.alpha = 1; v.ghost = 0; v.bloom = 0; v.clipY = null;
    v.offsetX = 0; v.offsetY = 0; v.dash = 0; v.dashV = 0; v.dashTo = 0; v.flash = 0;

    const amp = breathMod.kinBreath(id, back).lift;
    if (amp === 0) { problems.push(id + '/' + side + ': does not breathe at all'); continue; }

    const art = spriteAlpha(id, back);
    // Every clock in one cycle, grouped by the lift it produces.
    const byLift = new Map();
    for (let t = 0; t < 200; t++) {
      v.idleT = t;
      const l = scene.breath(back ? 'player' : 'foe', amp);
      if (!byLift.has(l)) byLift.set(l, t);
    }
    if (!byLift.has(0)) problems.push(id + '/' + side + ': never rests');

    // How far the sprite is off its resting row at this pose, if the whole
    // drawing is there in one piece. -1 when no whole-pixel shift explains
    // what is on screen, which is the failure this test exists to catch.
    const shiftOf = (frame) => {
      let best = -1;
      let bestBad = Infinity;
      let checked = 0;
      for (let s = 0; s <= amp * DETAIL; s += DETAIL) {
        let bad = 0;
        checked = 0;
        for (let sy = 0; sy < CELL; sy++) {
          for (let sx = 0; sx < CELL; sx++) {
            const a = (sy * CELL + sx) * 4;
            // Solid ink only. The baked contact shadow is translucent, so what
            // lands on screen there is a blend with whatever ground is behind
            // it and is not the sprite's own colour.
            if (art[a + 3] !== 255) continue;
            // The foe's status panel casts a soft shadow on the two logical
            // rows under it, and the tallest back sprites -- craglide, lantric,
            // slatewing -- draw ink right up to the top of their cell, which
            // sits directly beneath that band. Lifted, their crest tips are
            // correctly shaded by it: the drawing is intact, it is just in
            // shadow. Those rows are the ones that rose above the resting cell
            // top, and comparing them against raw artwork colours would report
            // a UI shadow as a deformation.
            if (back && sy < s) { shaded++; continue; }
            checked++;
            const wy = PAD + sy - s;
            if (wy < 0) { bad++; continue; }
            const f = (wy * CELL + sx) * 4;
            if (frame[f] === art[a] && frame[f + 1] === art[a + 1]
              && frame[f + 2] === art[a + 2]) continue;
            bad++;
          }
        }
        if (bad < bestBad) { bestBad = bad; best = s; }
        if (bad === 0) break;
      }
      return { shift: best, bad: bestBad, checked };
    };

    const seen = new Set();
    for (const [l, t] of [...byLift.entries()].sort((p, q) => p[0] - q[0])) {
      v.idleT = t;
      d.game.render();
      poses++;
      const r = shiftOf(grab(o));
      compared += r.checked;
      if (r.bad > 0) {
        problems.push(id + '/' + side + ' pose ' + l + ': no whole-pixel move explains the '
          + 'picture -- best was ' + (r.shift / DETAIL) + 'px with ' + r.bad + '/' + r.checked
          + ' ink pixels still wrong. THE DRAWING IS BEING DEFORMED.');
      } else {
        seen.add(r.shift / DETAIL);
      }
    }
    if (!seen.has(0)) problems.push(id + '/' + side + ': never sits at rest');
    if (seen.size < 2) problems.push(id + '/' + side + ': never actually moves');
    lifts.push(id + '/' + side + ' ' + [...seen].sort().join(','));
  }
  other.visible = true;
}

out.push('poses checked: ' + poses + ', ink pixels compared: ' + compared
  + ', skipped under the panel shadow: ' + shaded);
out.push('problems: ' + problems.length);
for (const p of problems.slice(0, 40)) out.push('  ' + p);
out.push('lifts reached: ' + lifts.join(' | '));
return out;

