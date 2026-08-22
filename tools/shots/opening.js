// Drives the opening cinematic, character creation, and the first room.
// Run with tools/capture.cjs. Everything here runs inside the page.

const d = window.dev;
const out = [];
const shoot = async (name, ticks) => { out.push(name); return d.shoot(name, ticks); };
const top = () => d.game.scenes.top;

/** Nudge the player onto an exact tile; walk() only gets close, and furniture
 *  means the direct line is often blocked, so it alternates axes when stuck. */
const stepTo = (tx, ty) => {
  let stuck = 0;
  for (let i = 0; i < 40; i++) {
    const [x, y] = d.probe().pos.split(',').map(Number);
    if (x === tx && y === ty) return true;
    const dx = tx - x;
    const dy = ty - y;
    const goX = (stuck % 2 === 0 && dx !== 0) || dy === 0;
    d.hold(goX ? (dx > 0 ? 'KeyD' : 'KeyA') : (dy > 0 ? 'KeyS' : 'KeyW'), 12);
    const [nx, ny] = d.probe().pos.split(',').map(Number);
    if (nx === x && ny === y) stuck++;
    else stuck = 0;
  }
  return false;
};

/** Press through any dialogue that is on screen. */
const clearDialogue = (max = 16) => {
  for (let i = 0; i < max && top().name === 'dialogue'; i++) d.key('Enter', 10);
  d.tick(6);
};

/** Walk the creator's cursor to the first row matching a predicate. */
const gotoRow = (match) => {
  for (let i = 0; i < 24; i++) {
    const rows = top().rows();
    if (match(rows[top().sel] || {})) return true;
    d.key('KeyS', 3);
  }
  return false;
};

await d.loadWait(1200);
await shoot('open-00-title', 30);

d.key('Enter', 4);
d.key('Enter', 30);
out.push('scene:' + top().name);

// The four shots are 400 / 380 / 400 / 340 ticks long.
await shoot('open-01-sea', 170);
await shoot('open-02-sea-late', 170);
await shoot('open-03-plains', 240);
await shoot('open-04-deep', 300);
await shoot('open-05-deep-warden', 180);
await shoot('open-06-town', 300);

// Skip the rest of the cinematic and land in the creator.
d.key('Enter', 60);
out.push('scene:' + top().name);
await shoot('open-07-creator', 30);

// Body, skin, hair style, hair colour.
d.key('KeyD', 6);
d.key('KeyS', 4); d.key('KeyD', 4); d.key('KeyD', 4);
d.key('KeyS', 4); d.key('KeyD', 4); d.key('KeyD', 4); d.key('KeyD', 4);
d.key('KeyS', 4); d.key('KeyD', 4); d.key('KeyD', 4);
await shoot('open-08-creator-edited', 40);

// Headwear and jacket, which add colour rows underneath them.
d.key('KeyS', 4); d.key('KeyS', 4);
d.key('KeyD', 4); d.key('KeyD', 4);
d.key('KeyS', 4); d.key('KeyS', 4);
d.key('KeyD', 4);
await shoot('open-09-creator-hat', 40);

// Every facing of the finished character: the preview turns every 96 ticks.
for (let i = 0; i < 4; i++) await shoot('open-09-facing-' + i, 96);

// Name entry.
out.push('name-row:' + gotoRow((r) => r.action === 'name'));
await shoot('open-10-name-empty', 20);
d.key('Enter', 6);
d.type('Mara', 4);
await shoot('open-11-name-typed', 20);
d.key('Enter', 8);
out.push('typed:' + top().playerName);

// Begin.
out.push('begin-row:' + gotoRow((r) => r.action === 'begin'));
await shoot('open-12-begin', 20);
d.key('Enter', 60);
// The overworld loads its map asynchronously, and ticks alone never let a
// promise resolve: this has to be a real wait, not simulated time.
await d.loadWait(1200);
out.push('scene:' + top().name);
await shoot('open-13-bedroom', 20);
clearDialogue();
out.push('after-intro:' + top().name);

// Down the stairs and across to mother, who now knows the player's name.
// Routed rather than walked in a straight line: the bedroom has furniture in
// it now, and a hard-coded walk drives into the bookcase.
stepTo(10, 3);
d.hold('KeyS', 14);
await d.loadWait(1100);
out.push('map:' + d.probe().map + ' at ' + d.probe().pos);
await shoot('open-14-downstairs', 20);

out.push('reached:' + stepTo(5, 5));
d.key('KeyW', 3);            // mother stands one tile above
out.push('at:' + d.probe().pos + ' facing ' + d.probe().facing);
d.key('Enter', 24);
await shoot('open-15-mother', 10);
out.push('dialogue:' + (d.probe().text || ''));
d.key('Enter', 24);
await shoot('open-16-mother-2', 10);
d.key('Enter', 24);
d.key('Enter', 24);
await shoot('open-17-choice', 10);

return { shots: out, probe: d.probe() };
