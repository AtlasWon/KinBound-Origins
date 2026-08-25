// The Act 2 cast, stood on real ground next to the people already in the game.
//
// Judged at 1x, which is the only honest test: a costume that only works at 4x
// is a costume nobody sees. Nothing here is hardcoded to a tile -- the driver
// scans the loaded map's own collision for open ground wide enough to line
// everybody up on, so a map can be rebuilt underneath it without the shot
// quietly becoming a picture of a wall. When it cannot find room it says how
// much room it did find, rather than reporting a missing feature.

const d = window.dev;
const top = () => d.game.scenes.top;
const log = [];

const clear = () => {
  for (let i = 0; i < 40 && top().name === 'dialogue'; i++) d.key('Enter', 8);
  d.tick(4);
};

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
clear();

/** The new people, interleaved with the shipped ones they have to sit beside. */
const ROWS = [
  ['veyl', 'lyra', 'meridian', 'meridian_lead', 'meridian_sci', 'meridian_sci_f'],
  ['porter', 'dockhand', 'netmender', 'harbourmaster', 'townsfolk_m', 'merchant'],
];
const SPACING = 2;
const SPAN = (ROWS[0].length - 1) * SPACING + 1;

const open = (map, x, y) => map.inBounds(x, y) && map.collisionAt(x, y) !== 1;

/**
 * Horizontal runs of `span` open tiles whose row above is open too -- so the
 * line-up stands on ground rather than in it, and nobody's head is buried in a
 * cliff. Returns the runs found, widest row first, plus the best run length
 * seen anywhere, which is what makes a failure diagnosable.
 */
const findRuns = (map, span, warpFree) => {
  const runs = [];
  let best = 0;
  for (let y = 1; y < map.height - 1; y++) {
    let start = -1;
    for (let x = 0; x <= map.width; x++) {
      const ok = x < map.width && open(map, x, y) && open(map, x, y - 1)
        && !(warpFree && map.warpAt(x, y));
      if (ok) { if (start < 0) start = x; continue; }
      if (start >= 0) {
        best = Math.max(best, x - start);
        if (x - start >= span) runs.push({ x: start, y, len: x - start });
        start = -1;
      }
    }
  }
  return { runs, best };
};

const stage = async (mapId, label, facing) => {
  top().state.currentMap = mapId;
  d.game.scenes.replaceAll(new (top().constructor)(top().state, mapId, 1, 1, 'down'));
  await d.loadWait(1400);
  clear();
  const scene = top();
  const map = scene.map;
  if (!map) { log.push(`${label}: ${mapId} did not load`); return null; }

  const { runs, best } = findRuns(map, SPAN, true);
  if (runs.length === 0) {
    log.push(`${label}: ${mapId} has no run of ${SPAN} (widest was ${best})`);
    return null;
  }
  // Two rows, and they have to be two or three tiles apart -- the viewport is
  // ten tiles tall, so a second row nine tiles down means a screenshot of an
  // empty field with the line-up off both edges. That is exactly the kind of
  // picture that gets reported as a missing feature.
  const a = runs.find((r) => runs.some((o) => o.y - r.y >= 2 && o.y - r.y <= 3
    && Math.abs(o.x - r.x) < 6)) || runs[0];
  const b = runs.find((r) => r.y - a.y >= 2 && r.y - a.y <= 3
    && Math.abs(r.x - a.x) < 6) || null;
  const placed = [];

  for (const n of [...scene.npcs]) scene.removeNpcRuntime(n.data.id);

  ROWS.forEach((row, r) => {
    const run = r === 0 ? a : (b || a);
    if (r === 1 && !b) return;                      // no second row on this map
    row.forEach((sprite, i) => {
      const x = run.x + Math.floor((run.len - SPAN) / 2) + i * SPACING;
      scene.addNpcRuntime({
        id: `cast_${r}_${i}`, sprite, x, y: run.y,
        facing, movement: { kind: 'static' },
      });
      placed.push(sprite);
    });
  });

  // Park the player in the middle so the camera frames the line-up, and take
  // them out of the picture so they do not stand in front of anybody.
  const cy = b ? Math.round((a.y + b.y) / 2) : a.y;
  scene.player.setTile(a.x + Math.floor(a.len / 2), cy);
  scene.player.visible = false;
  d.tick(8);

  log.push(`${label}: ${mapId} rows y=${a.y}${b ? '/' + b.y : ''}, ${placed.length} placed`);
  await d.shoot(`act2cast-${label}-1x`, 4, 1);
  await d.shoot(`act2cast-${label}-3x`, 2, 3);
  return scene;
};

await stage('route_3', 'ridge-down', 'down');
await stage('route_3', 'ridge-up', 'up');
await stage('route_3', 'ridge-left', 'left');
await stage('brackwater', 'harbour-down', 'down');
const walkScene = await stage('stonewake', 'city-down', 'down');

// Walking: step the whole line-up so the coat hem gets judged in motion and
// not only standing still.
if (walkScene) {
  for (const n of walkScene.npcs) n.actor.step('left', 24);
  d.tick(10);
  await d.shoot('act2cast-walk-1x', 0, 1);
  await d.shoot('act2cast-walk-3x', 0, 3);
  d.tick(8);
  await d.shoot('act2cast-walk2-3x', 0, 3);
}

return { log, probe: d.probe() };
