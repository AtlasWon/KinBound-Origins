// Composes THE ASCENT -- the road from Crownspire's north gate to the Summit.
//
//   node tools/gen/ascent.mjs
//
// IT OVERWRITES data/maps/ascent_road.json, ascent_deep.json, ascent_shelf.json,
// ascent_bothy.json, ascent_ruin.json and ascent_crown.json. Nothing else.
//
// THE SHAPE, AND IT IS THE POINT. Canon calls the Ascent one of the largest
// normal exploration areas in the game and asks for mountain caves, waterfalls,
// snow, ancient ruins, high cliffs and forest in the same breath. A route that
// is all six in a row is a scenery catalogue, so the six are arranged as ONE
// MOUNTAIN WALKED ROUND FOUR TIMES: the wooded south face, the inside of the
// rock, the western shoulder above the cloud, and the crown. Each lap is higher
// and barer than the last and each one looks down on the one before it, which
// is a shape a player can still draw a week later.
//
// It is also, deliberately, the region in miniature and in reverse. The player
// walks back up through oak and river (the southwest they left home in), then
// stone under the ground (Stonewake), then a snow shoulder (Frostmere), then an
// Aurelian ruin (the three sites), and comes out on top of all of it. Nobody
// says this out loud anywhere and nobody should.
//
// COMPOSED WITH tools/gen/routekit.mjs -- see the note there on why a map made
// of noise fields has to be flood-checked before it is written.
//
// WHY THIS FILE HAS ITS OWN PROVER. routekit's `verify` floods from ONE tile
// and treats everything it cannot reach as a fault. That is right for a road
// and wrong for a mountain: half of this build is deliberately behind Shoulder,
// Kindle, Swim, Clear and Updraft, and a warp on the far side of a gate is not
// a bug. `prove` below floods from several seeds, proves the union covers
// everything placed, AND proves that everything named as gated is genuinely
// unreachable from the entrance -- because a promise the player can already
// collect is as much a fault as a sealed pickup.
import { writeFileSync } from 'node:fs';
import { canvas, field, flood, plant, reseed, road, SOLID } from './routekit.mjs';

// routekit's SOLID was written for the two mountain roads and does not know the
// bramble, the hedgerow, the Aurelian kit, Frostmere's masonry or the capital's
// granite -- and this build stands on all five. A flood that walks through a
// wall proves nothing at all.
for (const ch of 'XOW●ΩΦΨΞ▪▫Å○◆♠ĦĤŘŖŔĴŁŴŲĘĮ') SOLID.add(ch);

const out = (name, data) => {
  writeFileSync(`data/maps/${name}.json`, JSON.stringify(data, null, 2) + '\n');
  console.log(`  wrote data/maps/${name}.json  ${data.rows[0].length}x${data.rows.length}`);
};

const trainer = (id, x, y, sprite, facing = 'down', sight = 3) => ({
  id, sprite, x, y, facing, movement: { kind: 'static' }, trainer: id, sightRange: sight,
});
const talker = (id, x, y, sprite, facing = 'down', movement = { kind: 'static' }) => ({
  id, sprite, x, y, facing, movement, script: id,
});
const sign = (x, y, text) => ({ kind: 'sign', x, y, text });
const note = (x, y, text) => ({ kind: 'script', x, y, text });
const item = (x, y, id, quantity, flag) => ({ kind: 'item', x, y, item: id, quantity, flag });
const hidden = (x, y, id, quantity, flag) => ({ kind: 'hiddenItem', x, y, item: id, quantity, flag });

/** Linear interpolation through control points, for a river or a gorge. */
const track = (pts) => (y) => {
  for (let i = 0; i < pts.length - 1; i++) {
    const [y0, x0] = pts[i], [y1, x1] = pts[i + 1];
    if (y >= y0 && y <= y1) return Math.round(x0 + ((x1 - x0) * (y - y0)) / (y1 - y0));
  }
  return pts[y < pts[0][0] ? 0 : pts.length - 1][1];
};

/* ------------------------------------------------------------------ proving */

function prove(map, seeds, gated = []) {
  const rows = map.rows;
  const H = rows.length, W = rows[0].length;
  const first = flood(map, seeds[0]).seen;
  const all = new Set(first);
  for (const s of seeds.slice(1)) for (const k of flood(map, s).seen) all.add(k);

  const key = (x, y) => y * W + x;
  const reach = (x, y) => x >= 0 && y >= 0 && x < W && y < H && all.has(key(x, y));
  const beside = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach(x + dx, y + dy));
  const postOk = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && SOLID.has(rows[y][x]) && beside(x, y);

  let ok = true;
  const move = (o, test, what) => {
    if (test(o.x, o.y)) return;
    for (let r = 1; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !test(o.x + dx, o.y + dy)) continue;
          console.log(`    moved ${what} ${o.x},${o.y} -> ${o.x + dx},${o.y + dy}`);
          o.x += dx; o.y += dy;
          return;
        }
      }
    }
    console.log(`    COULD NOT PLACE ${what} near ${o.x},${o.y}`);
    ok = false;
  };

  for (const w of map.warps ?? []) {
    if (!reach(w.x, w.y)) { console.log(`    WARP to ${w.toMap} at ${w.x},${w.y} is unreachable`); ok = false; }
  }
  for (const o of map.objects ?? []) {
    // A cuttable is NAILED to its bramble: OverworldScene.tryCut opens the cell
    // the object names, so nudging one onto the nearest walkable tile turns the
    // Clear art into a way of opening a patch of grass while the thorn behind
    // it stays shut for ever. It is checked in place instead.
    if (o.kind === 'cuttable') {
      if (rows[o.y][o.x] !== 'X') {
        console.log(`    cuttable at ${o.x},${o.y} is on "${rows[o.y][o.x]}" and not on a bramble`);
        ok = false;
      } else if (!beside(o.x, o.y)) {
        console.log(`    cuttable at ${o.x},${o.y} has nothing standing next to it`);
        ok = false;
      }
      continue;
    }
    if (o.kind === 'switch' || o.kind === 'pushable') { move(o, reach, o.kind); continue; }
    move(o, o.kind === 'sign' || o.kind === 'script' ? postOk : reach, o.kind);
  }
  for (const n of map.npcs ?? []) move(n, reach, `npc ${n.id}`);

  for (const [x, y] of gated) {
    if (first.has(key(x, y))) {
      console.log(`    ${x},${y} IS MEANT TO BE BEHIND AN ART AND IS NOT`);
      ok = false;
    }
  }
  console.log(`  ${map.id}: ${first.size} cells on foot from the entrance, ${all.size} in all`
    + (ok ? '  -- everything placed is reachable and every gate holds' : '  -- SOMETHING IS WRONG'));
  return ok;
}

/* ================================================================ ASCENT ROAD
 *
 * THE PILGRIM ROAD. Seventy-two by fifty-six, walked from the bottom: the
 * player comes out of Crownspire's north gate at x34-35 and leaves by a hole in
 * the mountain at the top left.
 *
 * THE RIVER IS THE MAP, and it is Crownspire's own river -- the one the city
 * spent Act 5 watching four feet over the mark that says NEVER. It comes out of
 * the rock at the top of this map, falls three times, and goes past the city
 * wall at the bottom, so a player who has stood on Crownspire's three bridges
 * arrives already knowing where the water they were worried about comes from.
 *
 * IT ALSO CUTS THE MAP IN HALF FROM TOP TO BOTTOM, and that is the whole
 * structure: everything the road does for the first thirty rows is get to the
 * far side of it.
 *
 * THE BRIDGE IS OUT. The road runs up the east bank and meets a crossing with
 * its deck gone and both posts still standing. The ford is half a mile upstream
 * and it is above the second fall, which is the entire feeling of the crossing:
 * the water is shallow, and it is going somewhere.
 *
 * WHAT IS OPTIONAL. The terraces behind the thorn on the east side (Clear), and
 * the islet in the plunge pool under the third fall (Swim). Neither is on the
 * way to anything and both are worth the walk, which is the deal every route in
 * this game makes.
 */
function ascentRoad() {
  const W = 72, H = 56;
  reseed(70117);
  const c = canvas(W, H, '.');

  const woodf = field(W, H, 7);
  const patch = field(W, H, 5);
  const grain = field(W, H, 2.3);
  const wobble = field(W, H, 11);

  // How high: 0 at the gate, 1 at the cave mouth. It climbs going north and a
  // little going west, and the change is a slope, never a step.
  const up = (x, y) => Math.max(0, Math.min(1,
    ((H - 6 - y) + (30 - x) * 0.16 + (wobble(x, y) - 0.5) * 12) / 46));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = up(x, y);
      const g = grain(x, y);
      let ch = g > 0.82 ? '*' : g > 0.5 ? ',' : '.';
      // The grass gives out with height and turns to combed tussock, then to
      // bare scree. Two encounter tiles on one map, and the band a player is
      // standing in tells them how far up the mountain they are.
      if (patch(x, y) > 0.63) ch = a > 0.46 ? '∧' : '"';
      if (woodf(x, y) < (a - 0.56) * 1.3) ch = '∇';
      if (woodf(x, y) > 0.90 && a > 0.40) ch = '∆';
      // The wood: oak at the bottom, a pine band through the middle, and
      // nothing at all above two thirds of the way up.
      if (a < 0.30 && woodf(x, y) > 0.60 && patch(x, y) < 0.52 && g > 0.42) ch = 'T';
      if (a >= 0.30 && a < 0.62 && woodf(x, y) > 0.68 && patch(x, y) < 0.48 && g > 0.46) ch = '∏';
      c.set(x, y, ch);
    }
  }

  /* ------------------------------------------------------------- the river */
  const rx = track([[0, 22], [10, 21], [18, 19], [22, 18], [32, 18], [42, 17], [50, 17], [55, 18]]);
  const FALL = (y) => (y >= 8 && y <= 11) || (y >= 25 && y <= 27) || (y >= 39 && y <= 41);
  const FORD = (y) => y >= 21 && y <= 23;
  const POOL = (y) => y >= 42 && y <= 50;

  for (let y = 0; y < H; y++) {
    const cx = rx(y);
    const half = POOL(y) ? 6 : 2;
    for (let x = cx - half; x <= cx + half; x++) {
      if (x < 0 || x >= W) continue;
      c.set(x, y, FALL(y) ? '⇓' : 'W');
    }
    // The lip. Cut rock in the high gorge, where the point is that the river
    // cannot be followed; walkable scree lower down, where the point is that it
    // can. The pool has a shore, or it is not a place.
    const lip = (y >= 3 && y <= 19) ? '⊗' : '∇';
    for (const x of [cx - half - 1, cx + half + 1]) if (x >= 0 && x < W) c.set(x, y, lip);
  }

  // The ford, and the two rows of shingle either side that make it a place.
  for (let y = 19; y <= 25; y++) {
    for (let x = rx(y) - 7; x <= rx(y) + 7; x++) {
      if (x < 0 || x >= W) continue;
      const ch = c.at(x, y);
      if (ch !== '⊗' && ch !== 'W' && ch !== '⇓' && ch !== '∇') continue;
      c.set(x, y, FORD(y) ? '~' : '∇');
    }
  }
  // The islet in the plunge pool. There is one thing on it and one way to it.
  const islet = rx(46);
  c.set(islet, 46, '∇'); c.set(islet, 45, '∇');

  /* ------------------------------------------------- the bridge that is out */
  const bx = rx(30);
  c.set(bx - 3, 30, '∋'); c.set(bx + 3, 30, '∋');
  for (const dy of [-1, 0, 1]) { c.set(bx - 4, 30 + dy, '∇'); c.set(bx + 4, 30 + dy, '∇'); }

  /* ------------------------------------------------- the shoulder above the ford
   *
   * ABOVE THE FORD THE EAST BANK IS CLIFF, and that is what makes this map a
   * mountain rather than a field with a stream in it: the walkable country is a
   * wedge, wide at the gate where the wood and the terraces are, narrowing all
   * the way up to a gorge and a hole in the rock. There is no dead corner on
   * this map because there is no corner.
   */
  for (let y = 2; y <= 19; y++) for (let x = rx(y) + 4; x < W; x++) c.set(x, y, 'C');

  /* -------------------------------------------------------------- the road
   *
   * ONE MATERIAL THE WHOLE WAY. On the two mountain roads the ground is bright
   * and the road is the dark line through it; here it is the other way about,
   * and a road that changes to scree halfway up simply vanishes into the scree.
   * A player caught out in the top third has to be able to see the way down.
   */
  const surface = () => '-';
  road(c, [[35, 53], [40, 46], [42, 39], [37, 33], [31, 30], [27, 27], [26, 22]], 1, surface);
  road(c, [[26, 22], [12, 22]], 1, surface);                          // the ford line
  road(c, [[12, 22], [11, 16], [10, 10], [9, 7], [9, 5]], 1, surface);
  // The road across the ford is water, not macadam.
  for (let y = 21; y <= 23; y++) {
    for (let x = rx(y) - 4; x <= rx(y) + 4; x++) c.set(x, y, '~');
  }

  /* ------------------------------------------------------------ the borders */
  for (let x = 0; x < W; x++) for (let k = 0; k < 2; k++) c.set(x, k, 'C');
  for (let y = 0; y < H; y++) {
    for (let k = 0; k < 2; k++) {
      c.set(k, y, 'C');
      c.set(W - 1 - k, y, up(W - 1 - k, y) > 0.35 ? 'C' : 'T');
    }
  }

  /* ---------------------------------------------------------- the city wall
   *
   * The far side of Crownspire's gate, built out of Crownspire's own granite
   * and its own arch -- because it IS Crownspire's gate, and the player has
   * spent Act 5 standing under the other face of it. It runs east from the
   * ravine, which is the only reason the ravine is where it is.
   */
  for (let x = 14; x < W; x++) { c.set(x, 55, '▪'); c.set(x, 54, '▪'); }
  for (let x = 0; x < 14; x++) c.set(x, 55, 'C');
  for (let x = 0; x < 12; x++) c.set(x, 54, 'C');
  c.set(34, 55, '◘'); c.set(35, 55, '◘');
  c.set(34, 54, '═'); c.set(35, 54, '═');
  for (let x = 31; x <= 39; x++) for (let y = 51; y <= 53; y++) c.set(x, y, '═');

  /* --------------------------------------------------------- the cave mouth
   *
   * A hole in a wall, and it has to be drawn as one or it is four grey cells in
   * a field of grey cells. Two rows of solid face, a four-wide gap cut in it,
   * and an apron of scree in front that the road runs onto.
   */
  for (let y = 2; y <= 4; y++) for (let x = 2; x < W; x++) if (c.at(x, y) !== 'W' && c.at(x, y) !== '⇓') c.set(x, y, 'C');
  // A CUT THRESHOLD, NOT MORE SCREE. The first build painted the mouth in the
  // same grey as the cliff it is cut into, and the picture read as a road ending
  // at a wall with no hole in it. Every cave seam on the Ascent is laid in pale
  // cut stone instead -- the idiom data/maps/route_9_falls.json already uses --
  // which is what makes a doorway read as a doorway at 1x.
  for (let y = 5; y <= 8; y++) for (let x = 6; x <= 13; x++) c.set(x, y, '∇');
  road(c, [[9, 8], [9, 5]], 1, () => '-');
  // AFTER the road, not before it. road() paints with a SQUARE brush, so a road
  // whose last point is one cell below the mouth lays three rows of dirt over
  // the top of it -- which is exactly how the first cut of this map ended up
  // with a doorway made of track.
  for (let y = 4; y <= 5; y++) for (let x = 8; x <= 10; x++) c.set(x, y, '=');

  /* ----------------------------------------------------- the east terraces
   *
   * Nine hundred years of walled beds on the sunny side of the spur, gone to
   * thorn since the plague year the Crown Road's terrace walker talks about.
   * One thorn wall in, and everything behind it is somebody's field.
   */
  for (let y = 36; y <= 48; y++) for (let x = 47; x <= 64; x++) {
    const g = grain(x, y);
    c.set(x, y, g > 0.60 ? '"' : g > 0.34 ? ',' : '.');
  }
  for (let y = 35; y <= 49; y++) { c.set(46, y, '●'); c.set(65, y, '●'); }
  for (let x = 46; x <= 65; x++) { c.set(x, 35, '●'); c.set(x, 49, '●'); }
  // The beds themselves. A terrace is a STEP, and a walled field with nothing
  // in it is a walled field: the two courses of dry stone across the middle of
  // it are the only thing that says which way the ground falls.
  for (let x = 47; x <= 61; x++) { c.set(x, 39, '●'); }
  for (let x = 51; x <= 64; x++) { c.set(x, 45, '●'); }
  for (let x = 43; x <= 45; x++) c.set(x, 41, '-');
  c.set(46, 41, 'X');
  for (let x = 12; x <= 13; x++) c.set(x, 54, 'C');

  const map = {
    id: 'ascent_road',
    name: 'The Pilgrim Road',
    displayName: 'THE ASCENT - THE PILGRIM ROAD',
    music: 'route_west',
    battleBackdrop: 'forest',
    indoor: false,
    fog: 0.1,
    regionPos: { x: 25, y: 6 },
    encounterTable: 'ascent_road',
    warps: [
      { x: 34, y: 55, toMap: 'crownspire', toX: 48, toY: 5, facing: 'down', style: 'edge' },
      { x: 35, y: 55, toMap: 'crownspire', toX: 49, toY: 5, facing: 'down', style: 'edge' },
      { x: 9, y: 4, toMap: 'ascent_deep', toX: 9, toY: 41, facing: 'up', style: 'cave' },
      { x: 10, y: 4, toMap: 'ascent_deep', toX: 10, toY: 41, facing: 'up', style: 'cave' },
    ],
    npcs: [
      talker('asr_gatehand', 33, 52, 'townsfolk_m', 'right'),
      trainer('asr_pilgrim', 39, 46, 'hiker', 'down', 3),
      trainer('asr_carrier', 41, 37, 'porter', 'left', 4),
      talker('asr_bridge', 28, 30, 'elder', 'left'),
      trainer('asr_ford', 26, 24, 'villager_f', 'up', 3),
      trainer('asr_terrace', 54, 42, 'villager_m', 'left', 4),
      trainer('asr_falls', 11, 14, 'hiker', 'down', 4),
      talker('asr_pool', 27, 45, 'fisher', 'left'),
    ],
    objects: [
      sign(36, 52, [
        'A board inside the gate, cut in the same lettering as the milestones below it.',
        'THE ASCENT. FOUR MILES. THERE IS NO OTHER WAY UP AND THERE NEVER WAS.',
      ]),
      note(38, 52, [
        'A milestone facing the wrong way: it is cut for people walking away from the city.',
        'SUMMIT IV. Under it, worn nearly out, one word. STILL.',
      ]),
      note(38, 44, [
        'A cairn beside the road, waist high, built of stones the size of a fist.',
        'Everyone walking up puts one on. There is no rule about it written anywhere.',
      ]),
      sign(29, 31, [
        'A board nailed across the bridge head, and the bridge behind it has no deck.',
        'CROSSING OUT. FORD HALF A MILE UP. IT IS SHALLOW. IT IS NOT SLOW.',
      ]),
      note(26, 20, [
        'The ford. Ankle deep, forty feet across, and going over the fall below it.',
        'Somebody has driven a line of stakes down the upstream side. They are new.',
      ]),
      note(44, 42, [
        'A gate in a wall of thorn, with terraces behind it going all the way up the spur.',
        'NO GRAZING, NO CUTTING, NO BUILDING. The board is nine hundred years old.',
        'The thorn has been doing all three for two hundred of them.',
      ]),
      note(11, 12, [
        'A milestone above the second fall. SUMMIT II.',
        'The face of it is polished smooth at hand height. Everybody touches it.',
      ]),
      note(26, 46, [
        'The plunge pool. Black, still, and going down further than the light does.',
        'The fall comes into it off sixty feet and the surface hardly moves.',
      ]),
      item(38, 48, 'full_restore', 1, 'item_asr_oakwood'),
      item(58, 44, 'warden_vessel', 5, 'item_asr_terrace'),
      item(61, 38, 'great_potion', 3, 'item_asr_terrace_top'),
      item(28, 26, 'full_heal', 3, 'item_asr_ford'),
      item(11, 7, 'full_restore', 1, 'item_asr_falls'),
      item(8, 36, 'deep_vessel', 5, 'item_asr_westbank'),
      item(islet, 46, 'full_restore', 1, 'item_asr_islet'),
      // THE THORN GATE. The 'X' at 46,41 is BRAMBLE terrain and terrain alone is
      // a permanent wall: OverworldScene.tryCut only fires on a 'cuttable'
      // OBJECT, so without this line the terraces are sealed for ever and the
      // Clear art has nothing to do on this map. Found by walking it -- the
      // capture driver reported NO ROUTE to the terrace item with the art in
      // hand, which is exactly the failure this project keeps shipping.
      { kind: 'cuttable', x: 46, y: 41, flag: 'asr_thorn_terrace' },
      hidden(43, 33, 'ward_incense', 2, 'item_asr_hidden_spur'),
      hidden(31, 47, 'escape_line', 2, 'item_asr_hidden_wood'),
    ],
    rows: c.rows(),
  };
  return {
    map,
    seeds: [[34, 54], [55, 42], [islet, 46]],
    gated: [[islet, 46], [58, 44], [61, 38], [54, 42]],
  };
}

/* ================================================================ ASCENT DEEP
 *
 * THE THROAT. Fifty-two by forty-four, and the reason it exists is that the
 * south face above the top fall is sheer: the road has run out of mountain to
 * go round, so it goes through.
 *
 * THE TWO ARTS THAT HAVE NOWHERE ELSE TO BE. Shoulder has been a puzzle art in
 * two Halls and a mine; Kindle has been in the player's hands since the fourth
 * Hall and has never once been asked for in the field anywhere in this game.
 * Both are on the main line here, on the last climb, which is the only place
 * left where a hard gate is honest -- every art is earned by now, and canon
 * asks for a mountain that genuinely cannot be climbed by somebody who skipped
 * things.
 *
 * THE THREE STONES AND THE THREE SOCKETS are the Aurelians' door and the
 * rockfall that filled it is not. That is the joke of the room: the mechanism
 * still works and has been waiting nine hundred years for somebody strong
 * enough to put the parts back where they go.
 *
 * THE SUMP is optional and is a Swim gate. What is on the shoal in the middle
 * of it is a reward for having gone into the sea in Act 6.
 */
function ascentDeep() {
  const W = 52, H = 44;
  reseed(88041);
  const c = canvas(W, H, 'C');
  const drift = field(W, H, 4);
  const grain = field(W, H, 2.1);

  const rock = (x0, y0, x1, y1) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      // Loose grit is what a player stirs something out of; bare rock is not.
      // See the note on the drift tile in src/world/terrain.ts.
      c.set(x, y, drift(x, y) > 0.58 ? 'ì' : grain(x, y) > 0.90 ? '∆' : '∇');
    }
  };
  const cut = (x0, y0, x1, y1, ch) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) c.set(x, y, ch);
  };

  rock(4, 33, 28, 42);        // the entrance hall
  rock(16, 30, 22, 34);       // the neck up to the water
  rock(6, 22, 30, 32);        // the sump chamber
  rock(24, 20, 30, 23);       // the neck up to the door
  cut(23, 16, 40, 22, '=');   // the gate chamber, cut floor
  cut(22, 15, 41, 15, 'C');   // THE DOOR: a wall until the sockets are filled
  rock(27, 10, 41, 14);       // the gallery beyond it

  // The sump: an underground lake with a cut ledge along the north of it.
  cut(8, 24, 24, 30, 'W');
  cut(7, 23, 27, 23, '=');
  c.set(9, 27, '∇'); c.set(10, 27, '∇');    // the shoal

  // THE SOCKETS ARE CUT AGAINST THE WALL, AND THAT IS A KINDNESS RATHER THAN A
  // detail. OverworldScene.updatePlates counts a socket as filled only while a
  // stone is exactly on it, and a stone pushed one cell too far is unrecoverable
  // until the player walks out of the map and back in (rebuildObstacles resets
  // them). Putting the row of sockets hard against the door wall means a stone
  // pushed north STOPS on its socket and cannot be overshot at all. Measured the
  // hard way: with the sockets a row further out, the capture driver pushed all
  // three straight past them and the door never opened.
  c.set(26, 16, 'x'); c.set(30, 16, 'x'); c.set(34, 16, 'x');

  /* ------------------------------------------------------- the stair of lamps
   *
   * Aurelian, and the only cut stone inside the mountain: they came up this
   * road too, and this flight is the first thing on it that says so. It is
   * drawn as two chambers with the mountain between them, because that is what
   * a flight cut through rock looks like from above -- a bottom, a top, and no
   * way to see either from the other.
   */
  cut(42, 3, 48, 14, 'Ω');
  cut(43, 10, 47, 13, 'Θ');   // the landing
  cut(43, 4, 47, 6, 'Θ');     // the head
  c.set(42, 12, 'Θ');         // the way in off the gallery
  for (const y of [11, 5]) { c.set(42, y, 'Φ'); c.set(48, y, 'Φ'); }
  c.set(45, 13, '≡'); c.set(45, 10, '≡'); c.set(45, 6, '≡'); c.set(45, 4, '≡');
  cut(44, 3, 46, 3, 'Θ');
  cut(44, 2, 45, 2, '∇');

  // In at the bottom.
  cut(8, 40, 12, 42, '∇');
  cut(8, 40, 11, 41, '=');
  cut(43, 2, 46, 2, '=');

  const map = {
    id: 'ascent_deep',
    name: 'The Throat',
    displayName: 'THE ASCENT - THE THROAT',
    music: 'station',
    battleBackdrop: 'cave',
    indoor: false,
    dark: true,
    fog: 0.18,
    regionPos: { x: 25, y: 6 },
    encounterTable: 'ascent_deep',
    warps: [
      { x: 9, y: 41, toMap: 'ascent_road', toX: 9, toY: 5, facing: 'down', style: 'cave' },
      { x: 10, y: 41, toMap: 'ascent_road', toX: 10, toY: 5, facing: 'down', style: 'cave' },
      { x: 44, y: 2, toMap: 'ascent_shelf', toX: 7, toY: 48, facing: 'up', style: 'cave' },
      { x: 45, y: 2, toMap: 'ascent_shelf', toX: 8, toY: 48, facing: 'up', style: 'cave' },
    ],
    npcs: [
      trainer('asd_delver', 15, 37, 'hiker', 'left', 4),
      trainer('asd_sump', 20, 32, 'villager_m', 'up', 3),
      // ON THE LEDGE AND NOT IN THE CHAMBER. She was at 26,22 for one build and
      // that is the cell a player has to stand in to shoulder the west stone --
      // the capture driver could not get past her and the puzzle read as broken.
      talker('asd_lampwright', 24, 23, 'elder', 'down'),
      trainer('asd_stonecrew', 33, 19, 'left' && 'porter', 'left', 4),
    ],
    objects: [
      note(13, 39, [
        'The road stops. The mountain does not.',
        'Somebody has cut a hand and an arrow into the rock, pointing in. That is the whole sign.',
      ]),
      note(14, 24, [
        'The lake. There is no shore on three sides of it and nobody knows how deep it goes.',
        'A rope is made off on the ledge and runs down into it. The end has never come back up.',
      ]),
      note(24, 17, [
        'Three sockets cut into the floor, and three stones lying where the roof dropped them.',
        'The sockets are a great deal older than the rockfall. Somebody meant this to be a door.',
      ]),
      note(41, 13, [
        'The foot of a stair, cut in one flight, going up further than the light reaches.',
        'There are lamps down both walls the whole way. Not one of them is lit.',
      ]),
      note(43, 7, [
        'The head of the stair, and the flight below it burning all the way down.',
        'Nine hundred years of soot on the lamp hoods, and every one of them still draws.',
      ]),
      { kind: 'switch', x: 26, y: 16 },
      { kind: 'switch', x: 30, y: 16 },
      { kind: 'switch', x: 34, y: 16 },
      { kind: 'pushable', x: 26, y: 20 },
      { kind: 'pushable', x: 30, y: 20 },
      { kind: 'pushable', x: 34, y: 20 },
      item(20, 41, 'great_potion', 3, 'item_asd_entry'),
      item(29, 12, 'full_restore', 1, 'item_asd_gallery'),
      item(9, 27, 'deep_vessel', 5, 'item_asd_shoal'),
      item(46, 5, 'full_rouse', 2, 'item_asd_head'),
      hidden(6, 34, 'ward_incense', 2, 'item_asd_hidden'),
    ],
    rows: c.rows(),
  };
  return {
    map,
    // The entrance, the gallery the door opens onto, and the head of the stair.
    seeds: [[9, 41], [31, 13], [45, 5], [9, 27]],
    gated: [[9, 27], [29, 12], [46, 5], [44, 2], [45, 2], [31, 13]],
  };
}

/* =============================================================== ASCENT SHELF
 *
 * THE WEST SHOULDER. Seventy-two by fifty-two, out of the rock at the bottom
 * left and away over the top. This is the lap above the cloud: the pines give
 * out across the first ten rows and everything after them is snow, scree and a
 * drop on the east side the player walks beside for forty tiles.
 *
 * THE GORGE SPLITS IT and there are two ways over: a rope bridge, and a notch
 * with a boulder sitting in it that Shoulder moves. The bridge is the road; the
 * notch is the way back down in a hurry, which is what a shortcut is for.
 *
 * THE BOTHY IS NOT GATED BY ANYTHING and never will be. A five-map climb with
 * no bed halfway up is a five-map climb nobody finishes, and this project has
 * been asked four separate times for an easier game.
 */
function ascentShelf() {
  const W = 72, H = 52;
  reseed(51902);
  const c = canvas(W, H, '∴');
  const rockf = field(W, H, 6.5);
  const patch = field(W, H, 4.6);
  const grain = field(W, H, 2.2);
  const wobble = field(W, H, 10);

  const up = (x, y) => Math.max(0, Math.min(1, ((H - 4 - y) + (wobble(x, y) - 0.5) * 10) / 60));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = up(x, y);
      const g = grain(x, y);
      let ch = g > 0.72 ? '≋' : '∴';
      if (patch(x, y) > 0.62) ch = a > 0.55 ? '∀' : '∧';
      if (rockf(x, y) < (a - 0.55) * 1.25) ch = '∇';
      if (rockf(x, y) > 0.90) ch = '∆';
      // The last of the trees, all of them in the bottom third and all of them
      // leaning the same way.
      if (a < 0.22 && rockf(x, y) > 0.62 && patch(x, y) < 0.5 && g > 0.5) {
        ch = g > 0.74 ? '∪' : '∩';
      }
      c.set(x, y, ch);
    }
  }

  /* -------------------------------------------------------------- the gorge
   *
   * THE GORGE IS THE MAP. It runs the full height, from x42 at the top to x34
   * at the bottom, and it puts the way IN and the way ON on opposite sides of
   * it -- so the rope bridge at y26 is the road and not a detour. The notch at
   * y42, which Shoulder opens, is the second crossing and it is deliberately a
   * long way below the first: it is the way back DOWN in a hurry once the
   * player has been up, which is what a shortcut on a mountain is for.
   */
  const gx = track([[0, 42], [14, 40], [28, 36], [40, 34], [51, 33]]);
  for (let y = 0; y < H; y++) {
    const x0 = gx(y), w = 4 + Math.round(Math.sin(y * 0.21) * 1.6);
    for (let x = x0; x < x0 + w; x++) c.set(x, y, '⊗');
    for (const x of [x0 - 1, x0 + w]) if (c.at(x, y) !== null) c.set(x, y, '∇');
  }
  // The fall the gorge takes off the shoulder: the one thing on this map that
  // says how far down the bottom of it is.
  for (let y = 46; y <= 49; y++) for (let x = gx(y); x < gx(y) + 4; x++) c.set(x, y, '⇓');

  const by = 26, ny = 42;
  const bx0 = gx(by) - 1, bx1 = gx(by) + 5;
  const nx0 = gx(ny) - 1, nx1 = gx(ny) + 4;

  /* --------------------------------------------------------------- the road */
  road(c, [[7, 47], [12, 44], [15, 40], [18, 35], [22, 31], [bx0 - 2, by]], 1, () => '∫');
  road(c, [[bx1 + 2, by], [46, 22], [50, 16], [53, 10], [55, 5], [56, 2]], 1, () => '∫');
  road(c, [[bx1 + 2, by], [48, 24], [52, 18], [55, 13]], 1, () => '∫');  // the spur east

  /* --------------------------------------------------------- the rope bridge */
  for (let x = bx0; x <= bx1; x++) c.set(x, by, '∈');
  c.set(bx0 - 1, by, '∋'); c.set(bx1 + 1, by, '∋');
  for (const y of [by - 1, by + 1]) { c.set(bx0 - 1, y, '∇'); c.set(bx1 + 1, y, '∇'); }
  c.set(bx0 - 2, by, '∇'); c.set(bx1 + 2, by, '∇');

  /* ------------------------------------------------------------- the notch */
  for (let x = nx0 - 1; x <= nx1 + 1; x++) c.set(x, ny, '∇');
  for (const y of [ny - 1, ny + 1]) for (let x = nx0; x <= nx1; x++) c.set(x, y, '⊗');

  /* ------------------------------------------------------- the meltwater cut
   *
   * A channel off the snowfield running straight across the way to the old
   * station. Wade, and the only reason it is here is that the ruin should cost
   * something to reach.
   */
  for (let y = 12; y <= 15; y++) for (let x = 55; x <= 60; x++) c.set(x, y, '∇');
  for (let y = 6; y <= 30; y++) for (let x = 57; x <= 59; x++) c.set(x, y, '~');
  for (let y = 5; y <= 31; y++) { c.set(56, y, '∇'); c.set(60, y, '∇'); }
  for (let y = 8; y <= 34; y++) for (let x = 60; x <= 69; x++) {
    c.set(x, y, grain(x, y) > 0.68 ? '∀' : '∴');
  }
  for (let x = 60; x <= 63; x++) { c.set(x, 13, '∫'); c.set(x, 14, '∫'); }
  for (let y = 8; y <= 13; y++) for (let x = 61; x <= 63; x++) c.set(x, y, '∇');

  /* ---------------------------------------------------------- the pinnacle
   *
   * A bench above the road at 64-69, 17-21, sealed on every side by rock. This
   * is the Updraft gate, and the board below it is the only thing that tells a
   * player without the art why nothing happened when they walked at it.
   */
  for (let x = 63; x <= 70; x++) { c.set(x, 16, 'C'); c.set(x, 22, 'C'); }
  for (let y = 16; y <= 22; y++) { c.set(63, y, 'C'); c.set(70, y, 'C'); }
  for (let y = 17; y <= 21; y++) for (let x = 64; x <= 69; x++) c.set(x, y, '∇');

  /* ------------------------------------------------------------ the bothy
   *
   * A quarter of a mile above the cave mouth, on the first flat ground the
   * road finds -- which is where anybody who had to build one would build it.
   */
  for (let x = 12; x <= 18; x++) { c.set(x, 39, 'Ŗ'); c.set(x, 40, 'Ħ'); }
  c.set(12, 39, 'Ř'); c.set(18, 39, 'Ŕ');
  c.set(15, 38, 'Ĵ');
  c.set(13, 40, 'Ĥ'); c.set(17, 40, 'Ĥ');
  c.set(15, 40, 'Ď');
  for (let x = 10; x <= 20; x++) { c.set(x, 41, '∫'); c.set(x, 42, '∫'); }
  c.set(11, 40, 'Ł'); c.set(19, 40, 'Ŵ');

  /* ------------------------------------------------------------ the borders */
  for (let x = 0; x < W; x++) for (let k = 0; k < 2; k++) { c.set(x, k, 'C'); c.set(x, H - 1 - k, 'C'); }
  for (let y = 0; y < H; y++) for (let k = 0; k < 2; k++) { c.set(k, y, 'C'); c.set(W - 1 - k, y, 'C'); }
  for (let y = 46; y <= 49; y++) for (let x = 5; x <= 10; x++) c.set(x, y, '∇');
  for (let y = 47; y <= 48; y++) for (let x = 6; x <= 9; x++) c.set(x, y, '=');
  for (let x = 54; x <= 58; x++) for (let y = 2; y <= 4; y++) c.set(x, y, '∫');
  c.set(55, 1, '∫'); c.set(56, 1, '∫');
  // The mouth of the ruin spur, cut in the map's north-east corner.
  for (let y = 2; y <= 7; y++) for (let x = 59; x <= 71; x++) c.set(x, y, 'C');
  c.set(61, 8, '='); c.set(62, 8, '=');
  c.set(61, 7, '='); c.set(62, 7, '=');

  const map = {
    id: 'ascent_shelf',
    name: 'The West Shoulder',
    displayName: 'THE ASCENT - THE WEST SHOULDER',
    music: 'route_west',
    battleBackdrop: 'highland',
    indoor: false,
    fog: 0.26,
    regionPos: { x: 25, y: 6 },
    encounterTable: 'ascent_shelf',
    warps: [
      { x: 7, y: 48, toMap: 'ascent_deep', toX: 44, toY: 3, facing: 'down', style: 'cave' },
      { x: 8, y: 48, toMap: 'ascent_deep', toX: 45, toY: 3, facing: 'down', style: 'cave' },
      { x: 15, y: 40, toMap: 'ascent_bothy', toX: 8, toY: 10, facing: 'up', style: 'door' },
      { x: 61, y: 7, toMap: 'ascent_ruin', toX: 18, toY: 32, facing: 'up', style: 'cave' },
      { x: 62, y: 7, toMap: 'ascent_ruin', toX: 19, toY: 32, facing: 'up', style: 'cave' },
      { x: 55, y: 1, toMap: 'ascent_crown', toX: 28, toY: 43, facing: 'up', style: 'edge' },
      { x: 56, y: 1, toMap: 'ascent_crown', toX: 29, toY: 43, facing: 'up', style: 'edge' },
    ],
    npcs: [
      trainer('ass_warden', 10, 45, 'hiker', 'up', 4),
      talker('ass_bothy_step', 18, 41, 'villager_f', 'left'),
      trainer('ass_ropewalk', bx1 + 3, by, 'porter', 'left', 4),
      trainer('ass_cairn', 49, 18, 'villager_m', 'down', 4),
      trainer('ass_notch', nx1 + 3, ny, 'townsfolk_f', 'left', 3),
      talker('ass_spur', 61, 14, 'elder', 'right'),
    ],
    objects: [
      note(9, 47, [
        'Out of the mountain, and the first thing is the light.',
        'Cloud below, snow above, and a road going up through the middle of the two.',
      ]),
      sign(20, 41, [
        'A board at the bothy door, painted over so often the letters stand proud of it.',
        'OPEN. ALWAYS. NO CHARGE, NO QUESTIONS, NO EXCEPTIONS.',
      ]),
      sign(bx0 - 2, by + 1, [
        'A board at the bridge head. WEIGHT: TWO AT A TIME. WIND: USE YOUR JUDGEMENT.',
        'Somebody has scratched under it: I USED MINE AND I AM STILL HERE.',
      ]),
      note(nx0 - 1, ny + 2, [
        'A notch in the gorge wall with a boulder sitting square in the middle of it.',
        'It came off the crag above in the spring. Somebody could put a shoulder into that.',
      ]),
      sign(67, 23, [
        'A board under a crag with nothing above it but more crag.',
        'THE STANDING STONE IS UP THERE. WE HAVE NOT BEEN UP THERE.',
        'Under it, in another hand: THE AIR OFF THIS FACE WILL CARRY YOU. IT CARRIED ME.',
      ]),
      note(60, 18, [
        'A meltwater cut, ankle deep, running clean across the way to the old station.',
        'It was not here in June. A good deal more of this mountain is running than used to.',
      ]),
      note(54, 8, [
        'A cairn the height of a person, and the last one before the crown.',
        'The stones at the bottom are worn round. The ones on top are still sharp.',
      ]),
      { kind: 'pushable', x: nx0 + 2, y: ny },
      item(24, 45, 'full_restore', 1, 'item_ass_pines'),
      item(48, 30, 'great_potion', 3, 'item_ass_east'),
      item(52, 6, 'warden_vessel', 5, 'item_ass_road'),
      item(67, 19, 'full_restore', 2, 'item_ass_pinnacle'),
      item(9, 30, 'full_heal', 3, 'item_ass_west'),
      hidden(26, 12, 'escape_line', 2, 'item_ass_hidden_high'),
      hidden(66, 32, 'thawcloth', 3, 'item_ass_hidden_east'),
    ],
    rows: c.rows(),
  };
  return { map, seeds: [[7, 48], [67, 19]], gated: [[67, 19]] };
}

/* =============================================================== ASCENT BOTHY */
function ascentBothy() {
  const rows = [
    'IIIIIUIIIIIUIIIII',
    'IQNfKKKKKKffkkffI',
    'IffffffffffffffkI',
    'IkffAAffffffAAffI',
    'IffEEffffffffEEfI',
    'IffffffffffffffPI',
    'IbefffbefffbefffI',
    'IffffffffffffffPI',
    'Ik/rrffffff;;fffI',
    'IffrrffffffffffkI',
    'IIIIIIIIDIIIIIIII',
  ];
  return {
    skip: true,
    map: {
      id: 'ascent_bothy',
      name: 'Interior',
      displayName: 'THE HIGH BOTHY',
      music: 'town_indoor',
      battleBackdrop: 'indoor',
      indoor: true,
      _design: 'The Waystation of the Ascent, and the only warm room between Crownspire and the Summit. Canon keeps the name Waystation for the roadside clinics only, and this is the last one in the game. IT IS NOT GATED BY AN ART AND IT NEVER WILL BE: a five-map climb with no bed halfway up is a five-map climb nobody finishes, and the brief has asked four separate times for an easier game. It is also the respawn point for the whole upper Ascent, which is what stops a whiteout on the Crown costing forty minutes of walking.',
      warps: [
        { x: 8, y: 10, toMap: 'ascent_shelf', toX: 19, toY: 19, facing: 'down', style: 'door' },
      ],
      npcs: [
        { id: 'asb_keeper', sprite: 'healer', x: 3, y: 1, facing: 'down', movement: { kind: 'static' }, script: 'clinic_heal' },
        { id: 'asb_roost', sprite: 'professor', x: 12, y: 1, facing: 'down', movement: { kind: 'static' }, script: 'roost_terminal' },
        { id: 'asb_hiker', sprite: 'hiker', x: 2, y: 7, facing: 'up', movement: { kind: 'static' }, script: 'asb_hiker' },
        { id: 'asb_hand', sprite: 'clerk', x: 13, y: 4, facing: 'left', movement: { kind: 'static' }, script: 'asb_hand' },
        { id: 'asb_child', sprite: 'kid', x: 8, y: 8, facing: 'up', movement: { kind: 'lookAround' }, script: 'asb_child' },
      ],
      objects: [
        sign(11, 1, [
          'A brass terminal with somebody\'s scarf tied round the base of it.',
          'THE ROOST. Kin you cannot carry wait here.',
        ]),
        sign(5, 1, [
          'A slate by the counter, wiped every morning and written up again.',
          'ON THE HILL TODAY: NINE UP, FOUR DOWN. ALL ACCOUNTED FOR.',
        ]),
        note(12, 8, [
          'A shelf of boots by the stove. All of them too small, all of them mended.',
          'A card above it: LEFT BY PEOPLE WHO CAME BACK DOWN. TAKE A PAIR IF YOU NEED THEM.',
        ]),
      ],
      rows,
    },
  };
}

/* ================================================================ ASCENT RUIN
 *
 * THE HIGH WAYSTATION. Forty by thirty-four, and the whole point of it is one
 * wall.
 *
 * THE AURELIANS WALKED THIS ROAD TOO. Canon has exactly three Aurelian sites
 * and this is NOT a fourth: nothing is hidden here, there is no recording, no
 * mechanism and no revelation, and no story flag is set anywhere in this room.
 * It is a shelter -- a hearth, benches, a cistern, a roof -- and the only thing
 * in it is that nine hundred years of Caeloran trainers have cut their names
 * into the same wall the Aurelians cut theirs. The two sets of marks are on top
 * of each other. Nobody says the thesis out loud and nobody ever should.
 *
 * THE CISTERN is where the rarest catch on the Ascent lives, and that is the
 * argument for the room: still, deep, ancient water at eleven thousand feet
 * with something in it that has been there the whole time.
 */
function ascentRuin() {
  const W = 40, H = 34;
  reseed(30414);
  const c = canvas(W, H, 'C');
  const drift = field(W, H, 3.4);

  // The hall: cut stone with nine centuries of weather blown into it.
  for (let y = 4; y <= 30; y++) for (let x = 5; x <= 34; x++) {
    c.set(x, y, drift(x, y) > 0.66 ? 'Σ' : drift(x, y) < 0.30 ? '∴' : 'Θ');
  }
  for (let x = 4; x <= 35; x++) { c.set(x, 3, 'Ω'); c.set(x, 31, 'Ω'); }
  for (let y = 3; y <= 31; y++) { c.set(4, y, 'Ω'); c.set(35, y, 'Ω'); }

  // The cistern.
  for (let y = 9; y <= 17; y++) for (let x = 12; x <= 26; x++) c.set(x, y, 'W');
  for (let x = 11; x <= 27; x++) { c.set(x, 8, '~'); c.set(x, 18, '~'); }
  for (let y = 9; y <= 17; y++) { c.set(11, y, '~'); c.set(27, y, '~'); }
  for (let x = 10; x <= 28; x++) { c.set(x, 7, 'Θ'); c.set(x, 19, 'Θ'); }
  for (let y = 8; y <= 18; y++) { c.set(10, y, 'Θ'); c.set(28, y, 'Θ'); }
  c.set(19, 13, 'Θ');                       // the kerb standing in the middle

  // The name wall, the hearth and the benches.
  for (let x = 8; x <= 31; x++) c.set(x, 4, 'Ω');
  for (let x = 12; x <= 26; x++) c.set(x, 5, 'θ');
  c.set(19, 23, 'Φ'); c.set(19, 20, 'Φ');
  c.set(15, 25, 'Ξ'); c.set(23, 25, 'Ξ');
  c.set(15, 27, 'Ξ'); c.set(23, 27, 'Ξ');
  for (let x = 17; x <= 21; x++) c.set(x, 24, '≡');

  // The thorn brake in the one warm corner on the mountain.
  for (let y = 21; y <= 30; y++) for (let x = 30; x <= 34; x++) c.set(x, y, '∴');
  for (let y = 21; y <= 30; y++) c.set(29, y, 'Ω');
  for (let x = 29; x <= 34; x++) c.set(x, 30, 'Ω');
  for (let x = 29; x <= 34; x++) c.set(x, 20, 'Ω');
  c.set(29, 25, 'X');
  for (const [x, y] of [[32, 23], [33, 23], [32, 24], [33, 24], [31, 27], [32, 27]]) c.set(x, y, '"');

  // In at the bottom.
  for (let y = 30; y <= 33; y++) for (let x = 16; x <= 22; x++) c.set(x, y, 'Θ');
  for (let x = 0; x < W; x++) { c.set(x, 0, 'C'); c.set(x, 1, 'C'); c.set(x, 2, 'C'); }
  for (let x = 0; x <= 15; x++) c.set(x, 33, 'C');
  for (let x = 23; x < W; x++) c.set(x, 33, 'C');

  const map = {
    id: 'ascent_ruin',
    name: 'The High Waystation',
    displayName: 'THE ASCENT - THE HIGH WAYSTATION',
    music: 'station',
    battleBackdrop: 'cave',
    indoor: false,
    fog: 0.14,
    regionPos: { x: 25, y: 6 },
    encounterTable: 'ascent_ruin',
    warps: [
      { x: 18, y: 32, toMap: 'ascent_shelf', toX: 62, toY: 15, facing: 'down', style: 'cave' },
      { x: 19, y: 32, toMap: 'ascent_shelf', toX: 63, toY: 15, facing: 'down', style: 'cave' },
    ],
    npcs: [
      trainer('asu_scholar', 25, 26, 'professor', 'left', 4),
      trainer('asu_pilgrim', 12, 23, 'villager_f', 'right', 3),
      talker('asu_namewall', 19, 6, 'elder', 'up'),
    ],
    objects: [
      note(17, 4, [
        'The wall behind the hearth, and it has been cut into twice.',
        'Underneath: spirals, and a line of marks nobody has ever been able to read.',
        'Over the top of them: names. Nine hundred years of them, in Caeloran, cut with knives.',
      ]),
      note(19, 20, [
        'The cistern. Cut square, filled by the mountain, and never once dry.',
        'The water is so still it takes a moment to see that it is water at all.',
      ]),
      note(19, 23, [
        'A hearth with a ring of cut stone round it and nine centuries of soot up the flue.',
        'The people who built this room and the people who use it have never met.',
        'They have all sat on the same bench.',
      ]),
      note(29, 27, [
        'A thorn brake, in the one corner of this mountain that is out of the wind.',
        'It is the highest living thing for two miles in any direction and it is furious about it.',
      ]),
      item(8, 28, 'full_restore', 1, 'item_asu_hall'),
      item(19, 13, 'deep_vessel', 5, 'item_asu_cistern'),
      item(33, 27, 'full_rouse', 2, 'item_asu_thorn'),
      { kind: 'cuttable', x: 29, y: 25, flag: 'asu_thorn_corner' },
      hidden(32, 8, 'ward_incense', 2, 'item_asu_hidden'),
    ],
    rows: c.rows(),
  };
  return {
    map,
    seeds: [[18, 32], [19, 13], [32, 26]],
    gated: [[19, 13], [33, 27]],
  };
}

/* =============================================================== ASCENT CROWN
 *
 * THE CROWN. Sixty by forty-six, and there is nothing above it but a gate.
 *
 * IT IS BARE ON PURPOSE. Four maps of pines, rock, cut stone and cloud, and
 * then a field of snow with three people standing on it and one enormous heap
 * of stones. The three hardest road Trainers in Caelora are here, in the order
 * they were put here, and the last of them is at the gate.
 *
 * THE GREAT CAIRN is the landmark and it is the pilgrim road's punchline: every
 * stone carried up from the bottom for nine hundred years, in one pile, thirty
 * feet across. The player has been walking past the small ones since the gate.
 */
function ascentCrown() {
  const W = 60, H = 46;
  reseed(64011);
  const c = canvas(W, H, '≋');
  const rockf = field(W, H, 6);
  const patch = field(W, H, 4.4);
  const grain = field(W, H, 2.4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const g = grain(x, y);
      let ch = g > 0.62 ? '≋' : '∴';
      if (patch(x, y) > 0.66) ch = '∀';
      if (rockf(x, y) < 0.20) ch = '∇';
      if (rockf(x, y) > 0.92) ch = '∆';
      c.set(x, y, ch);
    }
  }

  /* ------------------------------------------------------------- the tarn */
  for (let y = 28; y <= 35; y++) for (let x = 8; x <= 22; x++) c.set(x, y, '≅');
  for (let y = 30; y <= 33; y++) for (let x = 13; x <= 18; x++) c.set(x, y, 'W');
  for (let y = 29; y <= 34; y++) { c.set(12, y, '≠'); c.set(19, y, '≠'); }

  /* ------------------------------------------------------------- the drop */
  for (let y = 6; y <= 40; y++) {
    const x0 = 48 + Math.round(Math.sin(y * 0.19) * 2);
    for (let x = x0; x < W - 2; x++) c.set(x, y, '⊗');
    c.set(x0 - 1, y, '∇');
  }

  /* ------------------------------------------------------------- the road */
  road(c, [[28, 42], [26, 36], [30, 30], [30, 25], [34, 20], [32, 14], [30, 8], [29, 4]], 1, () => '∫');

  /* -------------------------------------------------------- the great cairn */
  for (let y = 20; y <= 27; y++) for (let x = 19; x <= 27; x++) c.set(x, y, '√');
  for (let x = 18; x <= 28; x++) { c.set(x, 19, '∇'); c.set(x, 28, '∇'); }
  for (let y = 19; y <= 28; y++) { c.set(18, y, '∇'); c.set(28, y, '∇'); }

  /* --------------------------------------------------------- the cornices */
  for (let x = 36; x <= 44; x++) c.set(x, 33, '⌐');
  for (let x = 8; x <= 15; x++) c.set(x, 23, '⌐');

  /* ------------------------------------------------------- the viewpoint */
  for (let x = 39; x <= 47; x++) { c.set(x, 7, 'C'); c.set(x, 13, 'C'); }
  for (let y = 7; y <= 13; y++) { c.set(39, y, 'C'); c.set(47, y, 'C'); }
  for (let y = 8; y <= 12; y++) for (let x = 40; x <= 46; x++) c.set(x, y, '∇');

  /* -------------------------------------------------------- the Summit gate
   *
   * Crownspire's masons cut this and the city gate four miles below out of the
   * same quarry, and the player has walked under the other one. It is the last
   * thing on my road and it is NOT MINE TO OPEN -- see THE JOIN AT THE TOP in
   * the header written into data/maps/ascent_crown.json.
   */
  for (let x = 0; x < W; x++) { c.set(x, 0, '▪'); c.set(x, 1, '▪'); }
  for (let x = 20; x <= 38; x++) c.set(x, 2, '▪');
  c.set(28, 2, '◘'); c.set(29, 2, '◘'); c.set(30, 2, '◘');
  for (let x = 24; x <= 34; x++) for (let y = 3; y <= 6; y++) c.set(x, y, '═');

  /* ------------------------------------------------------------ the borders */
  for (let x = 0; x < W; x++) for (let k = 0; k < 2; k++) c.set(x, H - 1 - k, 'C');
  for (let y = 0; y < H; y++) for (let k = 0; k < 2; k++) { c.set(k, y, 'C'); c.set(W - 1 - k, y, 'C'); }
  for (let x = 26; x <= 31; x++) for (let y = 41; y <= 43; y++) c.set(x, y, '∫');

  const map = {
    id: 'ascent_crown',
    name: 'The Crown',
    displayName: 'THE ASCENT - THE CROWN',
    music: 'route_west',
    battleBackdrop: 'highland',
    indoor: false,
    weather: 'snow',
    fog: 0.3,
    regionPos: { x: 25, y: 6 },
    encounterTable: 'ascent_crown',
    warps: [
      { x: 28, y: 43, toMap: 'ascent_shelf', toX: 55, toY: 2, facing: 'down', style: 'edge' },
      { x: 29, y: 43, toMap: 'ascent_shelf', toX: 56, toY: 2, facing: 'down', style: 'edge' },
      // THE JOIN AT THE TOP, and the Summit build made it first. Its own
      // data/maps/summit_approach.json already warps DOWN to this map at 28-30,3
      // -- the paved apron inside my gate -- so these three go the other way and
      // match its coordinates exactly rather than asking it to move. The arch
      // itself (28-30,2) is the tile they sit on, which is why it is walkable.
      { x: 28, y: 2, toMap: 'summit_approach', toX: 13, toY: 22, facing: 'up', style: 'edge' },
      { x: 29, y: 2, toMap: 'summit_approach', toX: 14, toY: 22, facing: 'up', style: 'edge' },
      { x: 30, y: 2, toMap: 'summit_approach', toX: 14, toY: 22, facing: 'up', style: 'edge' },
    ],
    npcs: [
      trainer('asc_snowline', 27, 38, 'hiker', 'up', 4),
      trainer('asc_tarn', 22, 31, 'villager_m', 'right', 3),
      talker('asc_cairnkeep', 29, 23, 'elder', 'left'),
      trainer('asc_cornice', 38, 21, 'porter', 'left', 4),
      trainer('asc_lastwarden', 29, 8, 'townsfolk_f', 'down', 4),
    ],
    objects: [
      note(28, 40, [
        'A milestone with nothing left of the number but the bottom of it.',
        'SUMMIT I. There is no nought cut anywhere on this road. There never was one.',
      ]),
      note(21, 29, [
        'A tarn, frozen at the rim and open in the middle, on the top of a mountain.',
        'The chalk marks round the edge are this year\'s. Somebody still comes up and measures it.',
      ]),
      note(29, 21, [
        'The Great Cairn. Thirty feet across at the bottom and the height of a house.',
        'Every stone in it was carried up from the gate by somebody on their way to the Summit.',
        'Nine hundred years of them. Nobody has ever counted it and nobody ever will.',
      ]),
      sign(35, 5, [
        'The Summit gate. The same granite as the city gate four miles below, cut by the same hands.',
        'There is no bar on it and no lock. There has never once needed to be one.',
      ]),
      note(45, 13, [
        'A crag standing over the last of the road, with the wind coming straight up the face.',
        'From the top of that you would be able to see the sea.',
      ]),
      item(24, 35, 'full_restore', 1, 'item_asc_tarn_shore'),
      item(15, 31, 'full_restore', 2, 'item_asc_tarn'),
      item(41, 31, 'great_potion', 3, 'item_asc_cornice'),
      item(43, 10, 'warden_vessel', 5, 'item_asc_view'),
      item(33, 12, 'full_heal', 3, 'item_asc_road'),
      hidden(12, 15, 'escape_line', 2, 'item_asc_hidden'),
    ],
    rows: c.rows(),
  };
  return {
    map,
    seeds: [[28, 43], [15, 31], [43, 10]],
    gated: [[15, 31], [43, 10]],
  };
}

/* ------------------------------------------------------------------- build */

const builds = [
  ascentRoad(), ascentDeep(), ascentShelf(), ascentBothy(), ascentRuin(), ascentCrown(),
];

let ok = true;
let cells = 0;
for (const built of builds) {
  const { map, seeds, gated = [], skip } = built;
  cells += map.rows.length * map.rows[0].length;
  if (!skip) {
    plant(map, '´');
    if (!prove(map, seeds, gated)) ok = false;
  }
  out(map.id, map);
}
console.log(`\n  ${cells} cells across ${builds.length} maps.`);
console.log(ok ? 'The Ascent is composed.' : 'SOMETHING IS WRONG -- see above.');
