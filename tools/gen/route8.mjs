// Composes Route 8 -- the climb to Frostmere -- and its two sub-maps.
//
//   node tools/gen/route8.mjs
//
// IT OVERWRITES data/maps/route_8.json, route_8_kiln.json and
// route_8_pass.json. Kept for the same reason tools/gen/aureline.mjs is kept:
// these three maps are a GRADIENT, and a gradient is the one thing you cannot
// hand-type. Canon asks for plains, pine, rocky hills, light snow, heavy snow,
// frozen lakes and mountain passes, and asks for them to happen gradually
// along the road rather than at a boundary -- which means the band edges have
// to interleave, the road has to change material three times without a seam,
// and the treeline has to thin over twenty tiles. Every one of those is a
// function of x, and writing it as one is the only way it stays editable.
//
// The checks at the bottom are the valuable half. They flood the map from the
// entrance and assert that every warp, every item, every trainer and every
// sign is standing on ground the player can actually reach, which is the
// failure this project has shipped in four stages running.
import { writeFileSync } from 'node:fs';
import { canvas, field, plant, rnd, road, verify } from './routekit.mjs';

const out = (name, data) => {
  writeFileSync(`data/maps/${name}.json`, JSON.stringify(data, null, 2) + '\n');
  console.log(`  wrote data/maps/${name}.json  ${data.rows[0].length}x${data.rows.length}`);
};

/* ==================================================================== ROUTE 8
 *
 * THE CLIMB. Eighty-four by forty-six, laid out east to west, because that is
 * the direction the player walks it: out of Aureline's west gate at the bottom
 * right, and off the top left corner into the pass.
 *
 * FOUR COUNTRIES IN ONE MAP AND NO BOUNDARY BETWEEN ANY OF THEM. The bands
 * below overlap by six to eight columns each and the overlap is randomised per
 * cell, so the last hedge stands among the first pines and the first snow lies
 * in the shade of the last rocks. A player asked afterwards where the mountain
 * started could not tell you, which is exactly what a climb feels like.
 *
 * THE ROAD IS THE ARGUMENT. It leaves the capital as three lanes of engineered
 * macadam -- the same surface as the Central Road, because it IS the Central
 * Road, going the other way -- and it gets worse every mile. Metalled, then a
 * dirt track, then two ruts of trodden grit in the snow. Nothing says "you are
 * leaving" like a road giving up under you, and it costs no dialogue at all.
 */
function routeEight() {
  const W = 84, H = 46;
  const c = canvas(W, H, '.');

  // Four fields, four jobs. `wood` decides where trees stand, `patch` where
  // the undergrowth and the scrub and the drift lie, `rock` where the bones of
  // the hill come through, and `grain` is the fine variation inside all three
  // so no patch is a flat sheet of one character.
  const wood = field(W, H, 7);
  const patch = field(W, H, 5);
  const rock = field(W, H, 6);
  const grain = field(W, H, 2.5);

  // How far up the mountain a column is, 0 at the capital and 1 at the pass,
  // with the boundary wandering by several tiles from row to row. Canon asks
  // for the change to happen along the road rather than at a boundary, so
  // there is no boundary: `climb` is continuous and every rule below reads it.
  //
  // The four countries sit at roughly equal quarters of it -- plains below
  // 0.24, pine to 0.50, rock to 0.70, snow above -- and the fourteen tiles of
  // wobble is what makes every one of those thresholds a ragged coast instead
  // of a column.
  const wobble = field(W, H, 9);
  const climb = (x, y) => Math.max(0, Math.min(1, (77 - x + (wobble(x, y) - 0.5) * 14) / 70));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = climb(x, y);
      const g = grain(x, y);
      let ch;

      // Snow lies on the ground from about halfway up and covers it by the
      // top, and it arrives in the hollows first: the `patch` field decides
      // which cells are hollows, so the first snow the player walks past is a
      // handful of white patches in grey rock rather than a white line.
      const snowline = (k - 0.62) * 3.0 + (patch(x, y) - 0.5) * 0.8;

      if (snowline > 0.50) ch = g > 0.58 ? '≋' : '∴';
      else if (snowline > 0.02) ch = g > 0.74 ? '≋' : '∴';
      else if (k > 0.50) ch = rock(x, y) > 0.44 ? '∇' : g > 0.6 ? ',' : '.';
      else ch = g > 0.80 ? '*' : g > 0.55 ? ',' : '.';

      // What grows on it. Above the snowline that is dwarf birch, below it
      // undergrowth, and both come in beds rather than in flecks.
      if (patch(x, y) > 0.66 && rock(x, y) < 0.62) {
        ch = snowline > 0.14 ? '∀' : k > 0.50 ? (g > 0.5 ? '"' : ch) : '"';
      }

      // Trees. A wood is a STAND with an edge on it, and the edge is where the
      // field crosses its threshold -- so the treeline thins over twenty
      // columns instead of stopping. The threshold climbs with `k`, which is
      // what puts a thick wood in the middle of the map, a scatter of stunted
      // pines in the rock above it, and nothing at all in the snow.
      const canopy = wood(x, y) - Math.max(0, k - 0.46) * 1.9;
      if (canopy > 0.54 && rock(x, y) < 0.70) {
        ch = snowline > 0.30 ? '∪' : k > 0.22 ? '∏' : (g > 0.5 ? 'T' : 't');
      }

      // The bones of the hill: outcrops, in clumps, and never many.
      if (rock(x, y) > 0.83) ch = snowline > 0.14 ? '∆' : k > 0.50 ? 'o' : ch;
      c.set(x, y, ch);
    }
  }

  // The border. Whatever the country at that height is made of, so the wall
  // round the map is never a statement the map is not making: broadleaf at the
  // bottom, pine through the wood, rock in the hills, laden pine in the snow.
  const edge = (x) => (x > 64 ? 'T' : x > 46 ? '∏' : x > 28 ? 'C' : '∪');
  for (let x = 0; x < W; x++) {
    for (let k = 0; k < 2; k++) { c.set(x, k, edge(x)); c.set(x, H - 1 - k, edge(x)); }
    if (x > 28 && x < 47) { c.set(x, 2, 'C'); c.set(x, H - 3, 'C'); }
  }
  for (let y = 0; y < H; y++) for (let k = 0; k < 2; k++) {
    c.set(k, y, '∪'); c.set(W - 1 - k, y, 'T');
  }

  // The old road, laid first because it is the older thing: the line the
  // mountain has been closing for a hundred years, and the line the slide
  // below is about to take.
  for (let x = 17; x <= 31; x++) for (let dy = 0; dy <= 1; dy++) c.set(x, 15 + dy, '∫');

  /**
   * THE AVALANCHE FAN, and the landmark of the whole route.
   *
   * A tongue of drift, shattered rock and snapped pine lying across the direct
   * line, half a mile wide. It is doing four jobs at once and that is why it is
   * here rather than a viewpoint with a bench: it is the landmark, it is the
   * environmental storytelling (nothing has to say the weather has turned --
   * this came down in a month that has never had weather in it), it is the
   * reason the road takes the long way round to the north, and it is the thing
   * that makes the two cairns past it worth walking to.
   */
  // A tongue: widest where it came off the face and tapering to a snout, with
  // the debris graded the way debris grades -- rock and snapped timber down
  // the middle where the force was, drift at the margins where it ran out.
  for (let x = 15; x <= 31; x++) {
    const t = (x - 15) / 16;
    const span = Math.round(2 + t * 4.4);
    const mid = 17 - Math.round(t * 2.2);
    for (let dy = -span; dy <= span; dy++) {
      const y = mid + dy;
      const edge = Math.abs(dy) / span;
      const g = grain(x, y);
      c.set(x, y, edge > 0.72 ? (g > 0.5 ? '≋' : '∴') : g > 0.80 ? 'þ' : g > 0.30 ? '∆' : '≋');
    }
  }
  /* ---------------------------------------------------------- the main road
   *
   * Drawn AFTER the slide, on purpose, and that ordering is the map's whole
   * chronology in two lines of code: the mountain came down, and then people
   * put a road round it. It climbs to the north of the fan and stays there.
   */
  const line = [
    [83, 22], [74, 22], [68, 20], [60, 20], [54, 17], [46, 17],
    [40, 14], [32, 12], [26, 9], [16, 9], [0, 10],
  ];
  road(c, line, () => 1, (x) => (x > 64 ? '▦' : x > 32 ? '-' : '∫'));

  // The fan has to actually BLOCK, or the detour is a suggestion. Everything
  // still walkable on the old line is closed, and it is closed with the two
  // things that are lying there -- rock and timber -- rather than with a wall.
  // x28-31 is left open: four tiles of the old road are still walkable at the
  // fork, so a player can go and look at what stopped it.
  for (let x = 16; x <= 27; x++) {
    for (let y = 12; y <= 21; y++) {
      if ('∫∴≋∀."*,'.includes(c.at(x, y))) c.set(x, y, grain(x, y) > 0.25 ? '∆' : 'þ');
    }
  }

  /* -------------------------------------------------- the Foundation station
   *
   * A Meridian weather station, fenced, with a mast and a generator running.
   * Canon has the Order activating the ancient systems and the weather going
   * wrong across the whole region, and this is the first place in Act 5 where
   * the player can stand next to the public half of that and read the
   * instruments. Nobody inside is lying to them. That is the point.
   */
  c.rect(34, 26, 45, 34, '∇');
  for (let x = 34; x <= 45; x++) { c.set(x, 26, '¯'); c.set(x, 34, '¯'); }
  for (let y = 26; y <= 34; y++) { c.set(34, y, '¹'); c.set(45, y, '¹'); }
  c.set(39, 26, '∇'); c.set(40, 26, '∇');            // the gate
  c.set(38, 29, '²'); c.set(42, 29, '²');
  c.set(36, 32, '³'); c.set(43, 31, '¾'); c.set(43, 32, '¾');
  c.set(37, 30, '¾');
  // The lane in from the road.
  for (let y = 17; y <= 26; y++) { c.set(39, y, '-'); c.set(40, y, '-'); }

  /* ------------------------------------------------------- the updraft shelf
   *
   * A scree bench forty feet above the road with something left on it, sealed
   * on every side by rock. There is exactly one way up and the player does not
   * have it yet: the Gale Hall in Skyreach is two settlements further on, and
   * this is the route's promise to come back. The script at the foot says so
   * in one line and does not nag.
   */
  c.rect(4, 3, 10, 5, '∇');
  for (let x = 3; x <= 11; x++) { c.set(x, 2, 'C'); c.set(x, 6, '⌐'); }
  c.set(3, 3, 'C'); c.set(3, 4, 'C'); c.set(3, 5, 'C');
  c.set(11, 3, 'C'); c.set(11, 4, 'C'); c.set(11, 5, 'C');
  for (let x = 4; x <= 10; x++) c.set(x, 7, '∴');
  for (let x = 4; x <= 10; x++) for (let y = 8; y <= 9; y++) if (rnd() < 0.6) c.set(x, y, '∴');

  /* ------------------------------------------------------------- waymarking */
  // From any cairn you can see the next one. That is the promise the whiteout
  // is allowed to exist because of, and it is laid out here rather than
  // scattered: eight tiles apart, always on the north verge, always in sight
  // of the road.
  // Placed against the road rather than at written coordinates, because the
  // road is a polyline and moves whenever the slide below it is re-tuned -- and
  // a cairn standing IN the road is a boulder in the road. Each one goes two
  // cells off the north verge, which is close enough to be obviously part of
  // the road and far enough that nobody walks into it in a squall.
  for (const x of [6, 12, 18, 24, 30, 36]) {
    let y = 0;
    while (y < H && c.at(x, y) !== '∫' && c.at(x, y) !== '-') y++;
    if (y >= H) continue;
    const at = Math.max(2, y - 3);
    if ('∴≋∀∇.,*'.includes(c.at(x, at))) c.set(x, at, '√');
  }
  for (const [x, y] of [[69, 24], [44, 19], [13, 12]]) c.set(x, y, '■');
  for (const [x, y] of [[72, 24], [31, 17], [38, 25], [11, 7], [56, 22]]) c.set(x, y, '´');

  // The last field gate on the road out of the capital, and the last fence in
  // Caelora going this way.
  for (let x = 70; x <= 79; x++) c.set(x, 25, '_');
  for (let y = 25; y <= 30; y++) c.set(70, y, '|');
  c.set(74, 25, ',');

  // The spur north into the pines, up to the charcoal hollow.
  for (let y = 2; y <= 20; y++) { c.set(57, y, '-'); c.set(58, y, '-'); }
  c.set(57, 0, '-'); c.set(57, 1, '-'); c.set(58, 0, '-'); c.set(58, 1, '-');

  // Keep the entrance and the exit open through the border.
  for (const y of [21, 22, 23]) { c.set(83, y, '▦'); c.set(82, y, '▦'); }
  for (const y of [9, 10, 11]) { c.set(0, y, '∫'); c.set(1, y, '∫'); }

  const warps = [];
  for (const [i, y] of [21, 22, 23].entries()) {
    warps.push({ x: 83, y, toMap: 'aureline', toX: 2, toY: 54 + i, facing: 'right', style: 'edge' });
  }
  for (const [i, y] of [9, 10, 11].entries()) {
    warps.push({ x: 0, y, toMap: 'route_8_pass', toX: 73, toY: 29 + i, facing: 'left', style: 'edge' });
  }
  for (const x of [57, 58]) {
    warps.push({ x, y: 0, toMap: 'route_8_kiln', toX: x - 41, toY: 27, facing: 'up', style: 'edge' });
  }

  return {
    id: 'route_8',
    name: 'The Frostmere Road',
    displayName: 'ROUTE 8 - THE CLIMB',
    music: 'route_west',
    battleBackdrop: 'highland',
    indoor: false,
    snow: 0.34,
    regionPos: { x: 19, y: 4 },
    encounterTable: 'route_8',
    _design: 'The road north-west out of Aureline, and the map whose whole job is to take the country away one thing at a time. It starts in the capital\'s own farmed plain on three lanes of macadam and ends nine miles later on two ruts of grit in the snow, and canon asks for the change to happen gradually along the road rather than at a boundary -- so the four bands overlap by six to eight columns each, the last hedge stands among the first pines, and the first snow lies in the shade of the last rocks. Nobody says the word mountain anywhere on this map.',
    _plan: 'THREE THINGS DECIDE THE SHAPE.\n\nFIRST THE ROAD GIVES UP. Macadam, then a dirt track, then a trodden line. The surface changes where the COUNTRY changes and never at a seam, and it is the only thing on the map that tells the player how far they have come.\n\nSECOND THE AVALANCHE. A tongue of drift and snapped pine lying square across the direct line at x17-30, which is why the road now climbs north round it. It is the landmark, it is the storytelling -- this came down in a month that has never had weather in it -- and it is the reason the two cairns beyond it are worth walking to. The old road is still there underneath, and you can walk fifteen tiles of it before it stops.\n\nTHIRD THE WEATHER IS ON. snow is 0.34: a light steady fall the player can always see through, which is deliberately NOT the whiteout. This map is where they learn what the flakes mean; the pass beyond it is where it costs them something. See src/gfx/snowfall.ts.\n\nTHE OPTIONAL BRANCH is the spur north at x57-58 into the charcoal burners\' hollow, which is where the rare Kin is and where the wood is wrong this year. THE COME-BACK-LATER is the scree bench at x4-10 y3-5, sealed on every side, forty feet above the road: Skyreach\'s Gale Hall is two settlements on and the script at the foot says so once. THE FOUNDATION STATION at x34-45 y26-34 is the public half of Meridian standing in the open with its instruments disagreeing with itself.',
    warps,
    npcs: [],
    objects: [],
    rows: c.rows(),
  };
}

/* =============================================================== ROUTE 8 KILN
 *
 * The charcoal burners' hollow: the optional branch, the rare-encounter spot
 * and the one warm place on the road, all in thirty-four by thirty.
 *
 * Why a separate map rather than a clearing on the route. Encounter tables are
 * per map, and a rare Kin that only lives in one clearing cannot be expressed
 * any other way -- this is the same answer route_7_fen and route_1_hollow
 * reached. It also lets the hollow be genuinely sheltered: no snow falls here
 * at all, and walking out of the fall into still air under the pines is the
 * only bit of comfort Route 8 offers.
 */
function routeEightKiln() {
  const W = 34, H = 30;
  const c = canvas(W, H, '.');

  const wood = field(W, H, 5);
  const patch = field(W, H, 4);
  const grain = field(W, H, 2);
  // The wood outside the clearing: stands with real edges, and the trodden
  // ground worn in a ring round the middle. Per-cell rolls were tried here and
  // gave a chessboard of turf and dirt -- the floor of a working site is worn
  // WHERE PEOPLE WALK, which is a shape, and a shape needs a field.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const g = grain(x, y);
      // Distance from the middle of the hollow, so the wear is a clearing.
      const d = Math.sqrt(((x - 17) / 11) ** 2 + ((y - 16) / 9) ** 2);
      let ch;
      if (d < 0.9) ch = patch(x, y) > 0.62 ? '"' : g > 0.62 ? '-' : g > 0.3 ? ',' : '.';
      else ch = patch(x, y) > 0.58 ? '"' : g > 0.78 ? '*' : g > 0.45 ? ',' : '.';
      if (d > 0.75 && wood(x, y) > 0.56) ch = '∏';
      c.set(x, y, ch);
    }
  }
  // The pine wall. Thick, because the whole point of the hollow is that it is
  // enclosed and out of the wind.
  for (let x = 0; x < W; x++) for (let k = 0; k < 3; k++) { c.set(x, k, '∏'); c.set(x, H - 1 - k, '∏'); }
  for (let y = 0; y < H; y++) for (let k = 0; k < 3; k++) { c.set(k, y, '∏'); c.set(W - 1 - k, y, '∏'); }

  /* --------------------------------------------------------------- the kiln
   *
   * A RING of stacked stone with the burn banked down inside it, and the
   * inside is the vent tile Emberfall paves its fissures with -- which is the
   * whole trick and cost no art at all. It is already a hole in the ground
   * with fire a long way down it, it is already on the town's four-frame
   * clock, and dropped inside a ring of boulders it reads as exactly what it
   * is: a pit that has not been out since 1102, breathing.
   *
   * A solid block of boulders was tried first and read as a cairn somebody had
   * given up on. The hole in the middle is the entire landmark.
   */
  c.rect(15, 13, 19, 16, 'O');
  c.rect(16, 14, 18, 15, '·');
  c.set(17, 17, '-');
  c.set(15, 12, 'o'); c.set(19, 12, 'o');
  // Cordwood, stacked and left standing where it was stacked. Floorless, so it
  // sits in the worn ground rather than on a square of imported turf.
  // Finished charcoal, heaped and sheeted, waiting for a wagon that is not
  // coming until there is enough of it to be worth the trip.
  for (let y = 18; y <= 20; y++) for (let x = 9; x <= 12; x++) c.set(x, y, 'ª');
  for (let y = 11; y <= 12; y++) for (let x = 22; x <= 24; x++) c.set(x, y, '¾');

  // The way in from the road, and the way back down.
  for (let y = 22; y <= 29; y++) { c.set(16, y, '-'); c.set(17, y, '-'); }
  c.set(16, 29, '-'); c.set(17, 29, '-');

  for (const [x, y] of [[13, 21], [22, 11]]) c.set(x, y, '´');

  const warps = [16, 17].map((x) => ({
    x, y: 29, toMap: 'route_8', toX: x + 41, toY: 2, facing: 'down', style: 'edge',
  }));

  return {
    id: 'route_8_kiln',
    name: 'The Charcoal Hollow',
    displayName: 'THE CHARCOAL HOLLOW',
    music: 'route_west',
    battleBackdrop: 'forest',
    indoor: false,
    regionPos: { x: 19, y: 3 },
    encounterTable: 'route_8_kiln',
    _design: 'The optional branch off Route 8 and its rare-encounter spot, in one place. A hollow in the pines where Frostmere\'s charcoal has been burned for forty years, sheltered enough that no snow reaches the floor of it -- which is the whole feeling of the map. You walk in out of the fall and the air is still, and there is a kiln in the middle with the last burn not quite out. That warmth is why the one Kin in Caelora that lives in chimneys is on this table and on no other table north of Emberfall.',
    _plan: 'Small on purpose: a branch that takes twenty minutes is a second route, not a detour. One landmark (the kiln), one rare slot (Sootmoth at eight), one trainer, one hidden item in the cordwood, and one piece of storytelling that is the actual Act 5 beat -- the burners have gone down early because the wood is wet in a month it has never been wet in, and they are the third people on this road to say the same thing without any of them having met.',
    warps,
    npcs: [],
    objects: [],
    rows: c.rows(),
  };
}

/* ============================================================== ROUTE 8 PASS
 *
 * THE WINTERGATE. Seventy-six by forty-eight, and the top of the world.
 *
 * Heavy snow, then the frozen lakes, then the passes -- canon's last three
 * steps, in order, east to west. This is the map the whiteout was written for:
 * `snow` is 1, so a squall here genuinely takes the hill away, and everything
 * about the layout is built to make that survivable rather than cruel. The
 * road is the darkest thing on the map. The cairns are eight tiles apart and
 * always in sight of it. There is exactly one place a player can get lost, and
 * they have to choose to walk onto it.
 */
function routeEightPass() {
  const W = 76, H = 48;
  const c = canvas(W, H, '∴');

  const patch = field(W, H, 6);
  const rockf = field(W, H, 7);
  const wood = field(W, H, 6);
  const grain = field(W, H, 2.5);
  const wobble = field(W, H, 10);

  // How high and how bare, 0 at the eastern trees and 1 at the col. Everything
  // below reads it, and the wobble is what keeps the treeline and the rock
  // line from being columns.
  const alt = (x, y) => Math.max(0, Math.min(1, (68 - x + (wobble(x, y) - 0.5) * 16) / 62));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = alt(x, y);
      const g = grain(x, y);
      // Snow is the floor of the whole map, and drift is where the wind put
      // it: in beds, on the lee side of everything, never as a fleck.
      let ch = patch(x, y) > 0.58 || g > 0.76 ? '≋' : '∴';

      // Rock comes through going west, in slopes rather than in gravel.
      if (rockf(x, y) < (a - 0.40) * 1.05) ch = '∇';

      // Dwarf birch, in beds, and only where there is any shelter at all --
      // which is the eastern half and the hollows. Above the col nothing grows
      // and the map says so by having nothing on it.
      if (patch(x, y) > 0.72 && a < 0.60 && ch !== '∇') ch = '∀';

      // The last of the trees. They stop about a third of the way in, which is
      // the treeline, and it is the last time the player sees one until the
      // town.
      if (wood(x, y) - a * 2.6 > 0.60) ch = '∪';

      // Outcrops, in clumps, and never many: this is a map a player has to be
      // able to cross in a whiteout.
      if (rockf(x, y) > 0.90 && g > 0.45) ch = '∆';
      c.set(x, y, ch);
    }
  }
  // The border: rock where the mountain closes in, laden pine where it does not.
  for (let x = 0; x < W; x++) {
    for (let k = 0; k < 2; k++) {
      const ch = x < 52 ? 'C' : '∪';
      c.set(x, k, ch); c.set(x, H - 1 - k, ch);
    }
    if (x < 52) { c.set(x, 2, 'C'); c.set(x, H - 3, 'C'); }
  }
  for (let y = 0; y < H; y++) for (let k = 0; k < 2; k++) { c.set(k, y, 'C'); c.set(W - 1 - k, y, 'C'); }

  /* ------------------------------------------------------- the frozen tarn */
  //
  // Twenty-four cells across and the only dark thing on the map. It reads as a
  // hole cut in the white from the far side of the screen, which is what makes
  // the road going round it legible without a word -- and what makes walking
  // onto it a decision instead of an accident.
  const lakeCx = 40, lakeCy = 27, lakeRx = 15, lakeRy = 9;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const d = ((x - lakeCx) ** 2) / (lakeRx * lakeRx) + ((y - lakeCy) ** 2) / (lakeRy * lakeRy);
      if (d > 1.18) continue;
      // The margin is rotten. Every lake in the world is thinnest where the
      // land warms it, and that is the one fact this map teaches with a wall.
      c.set(x, y, d > 0.99 ? '≠' : d > 0.88 && grain(x, y) > 0.55 ? '≠' : '≅');
    }
  }
  // Rotten patches out in the middle, so the crossing is a route rather than a
  // straight line. They are big and they are unmistakable.
  for (const [px, py, r] of [[33, 24, 2], [45, 30, 2], [39, 32, 2], [47, 23, 1], [36, 29, 1]]) {
    for (let y = py - r; y <= py + r; y++) for (let x = px - r; x <= px + r; x++) {
      if ((x - px) ** 2 + (y - py) ** 2 <= r * r + 1) c.set(x, y, '≠');
    }
  }
  // The open hole, and the islet in the middle of it. Cut for water, kept open
  // all winter, and there is something on the rock in plain sight. It is on the
  // way to nothing, it is signed once, and it stays shut until Swim.
  for (let y = 25; y <= 29; y++) for (let x = 38; x <= 45; x++) c.set(x, y, 'W');
  c.set(41, 27, '∴'); c.set(42, 27, '∴'); c.set(41, 26, '∆');

  // The ways on and off the ice: two shelving beaches with a lane down to each
  // from the road above, cut through the broken rim on purpose. THIS IS THE
  // ONLY WAY ONTO THE LAKE and it has to be, or a player wanders onto twenty
  // cells of ice through a gap in the wall without ever deciding to. Both
  // lanes are signed, both are obvious, and the crossing is a choice made at
  // the top of one of them.
  for (let x = 52; x <= 55; x++) for (let y = 22; y <= 29; y++) c.set(x, y, '∴');
  for (let x = 26; x <= 29; x++) for (let y = 22; y <= 29; y++) c.set(x, y, '∴');

  /* ------------------------------------------------------------- the road */
  //
  // North of the lake the whole way, because the safe road always is. It is
  // the long way and it is never in doubt.
  const line = [[75, 30], [66, 28], [58, 22], [48, 14], [36, 11], [26, 13], [18, 18], [10, 21], [0, 21]];
  road(c, line, () => 1, () => '∫');
  for (const y of [29, 30, 31]) { c.set(75, y, '∫'); c.set(74, y, '∫'); }
  // The town gate, and it is TWO rows wide and not three, because Frostmere's
  // east gate is two rows wide. See the note on FROSTMERE_GATE below: the last
  // join in Act 5 is the one this project has got wrong in four stages
  // running, so this end of the road is cut to fit the town rather than the
  // town asked to fit the road.
  for (const y of [20, 21, 22]) { c.set(0, y, '∫'); c.set(1, y, '∫'); c.set(2, y, '∫'); }
  c.set(0, 19, 'C'); c.set(0, 23, 'C');

  /* -------------------------------------------------------- the Wintergate */
  //
  // Two crags with the road threaded between them, and the name the whole map
  // is called after. It is a gate in the plainest sense: the mountain closes
  // to four tiles, you go through it, and Frostmere is on the other side.
  for (let y = 3; y <= 18; y++) for (let x = 12; x <= 15; x++) c.set(x, y, 'C');
  for (let y = 24; y <= 44; y++) for (let x = 12; x <= 16; x++) c.set(x, y, 'C');
  // The floor of the gate is SNOW, not scree. Cliff face, scree and trodden
  // road are three greys, and the first cut of this put all three in one
  // screen: the player could not tell the road from the wall from the ground.
  // White floor, grey road, blocky grey wall -- three values, and the picture
  // reads from across the room.
  for (let x = 8; x <= 20; x++) for (let y = 18; y <= 24; y++) c.set(x, y, '∴');
  road(c, [[18, 18], [10, 21]], () => 1, () => '∫');

  /* ----------------------------------------------------------- the refuge */
  //
  // A drystone shelter at the top of the pass, roofless for a hundred years
  // and still the only wall on this side of the mountain. Granite, because the
  // capital's old kit is the only stone in the game cut by people rather than
  // by weather, and a wall somebody CUT is the whole reading.
  c.rect(20, 8, 25, 10, '▪');
  c.set(22, 10, '◘'); c.set(23, 10, '◘');
  for (let x = 19; x <= 26; x++) c.set(x, 11, '∇');
  for (let y = 11; y <= 13; y++) { c.set(22, y, '∇'); c.set(23, y, '∇'); }

  /* ------------------------------------------------------------ waymarking */
  // The cairn line, laid against the road the same way Route 8's is and for
  // the same reason: this is the one map in the game where a player may not be
  // able to see the ground, and a waymark standing IN the road is a boulder.
  // Every six columns, three cells off the verge, all the way over the col.
  for (const x of [4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 70]) {
    let y = 0;
    while (y < H && c.at(x, y) !== '∫') y++;
    if (y >= H) continue;
    const at = Math.max(3, y - 3);
    if ('∴≋∀∇'.includes(c.at(x, at))) c.set(x, at, '√');
  }
  // Boards and milestones, placed on the verge below the road for the same
  // reason -- and always on the side the traffic can stop on.
  for (const [x, dy] of [[56, 3], [50, 4], [67, 3], [8, 3], [26, 3]]) {
    let y = 0;
    while (y < H && c.at(x, y) !== '∫') y++;
    if (y >= H) continue;
    while (y < H && c.at(x, y) === '∫') y++;
    const at = Math.min(H - 3, y + dy - 3);
    if ('∴≋∀∇'.includes(c.at(x, at))) c.set(x, at, '´');
  }
  c.set(30, 26, '´');                                 // the board at the cut
  for (const [x, y] of [[59, 33], [35, 17], [64, 23]]) if ('∴≋∀∇'.includes(c.at(x, y))) c.set(x, y, '■');

  const warps = [];
  for (const [i, y] of [29, 30, 31].entries()) {
    warps.push({ x: 75, y, toMap: 'route_8', toX: 1, toY: 9 + i, facing: 'right', style: 'edge' });
  }
  for (const [i, y] of [20, 21, 22].entries()) {
    warps.push({ x: 0, y, toMap: 'frostmere', toX: FROSTMERE_GATE.x, toY: FROSTMERE_GATE.y + i, facing: 'left', style: 'edge' });
  }

  return {
    id: 'route_8_pass',
    name: 'The Wintergate',
    displayName: 'ROUTE 8 - THE WINTERGATE',
    music: 'route_west',
    battleBackdrop: 'highland',
    indoor: false,
    snow: 1,
    regionPos: { x: 17, y: 4 },
    encounterTable: 'route_8_pass',
    _design: 'The top of the road, and the map the whiteout was written for. Canon\'s last three steps in order: heavy snow at the east end, the frozen lakes in the middle, the passes at the west. snow is 1 here against 0.34 on the climb below, so a squall genuinely takes the hill away -- and every decision in the layout exists to make that survivable rather than cruel. The road is the darkest thing on the map. The cairns are eight tiles apart and always in sight of it. There is exactly one place a player can get lost, and they have to walk onto it on purpose.',
    _plan: 'THE TARN IS THE MAP. Twenty-four cells of lake ice, the only surface up here darker than the ground round it, so it reads as a hole cut in the white from the far edge of the screen. The road goes north of it the whole way and is never in doubt. Crossing the ice saves about twenty tiles and costs you the margin, which is thin, rotten, and drawn as such -- the wall of broken ice round the rim is the one thing on this map that teaches by stopping you.\n\nTHE HOLE AND THE ISLET. Cut for water, kept open all winter, with something lying on the rock in the middle of it in plain sight. It is on the way to nothing, it is signed once at 30,26, and it stays shut until Swim, exactly as the junction pool on Route 7 does.\n\nTHE WINTERGATE. Two crags at x12-16 with the road threaded between them and the mountain closing to four tiles. It is a gate in the plainest sense and it is what the map is named for.\n\nTHE REFUGE at 20,8 is a drystone shelter, roofless for a century, and the only wall on this side of the mountain. It is built out of the capital\'s granite kit on purpose: it is the only stone in the game cut by people rather than by weather.',
    warps,
    npcs: [],
    objects: [],
    rows: c.rows(),
  };
}

/**
 * Where Frostmere's east gate is, READ OFF FROSTMERE'S OWN MAP.
 *
 * The single most dangerous value in this build, and the reason the two halves
 * of Route 8 are named the way round they are.
 *
 * data/maps/frostmere.json was built in another window while this was being
 * written, and it already carries two edge warps out of its east gate at
 * (53,20) and (53,21) pointing at a map called `route_8`, landing the player
 * at (1,20) and (1,21). That is one end of the join declared before the other
 * end existed, which is exactly how the last four stages of this project each
 * shipped an entrance with nothing behind it.
 *
 * So this end was cut to fit rather than the town asked to move. The map that
 * touches Frostmere is `route_8` -- the Wintergate -- and its road ends at
 * rows 20 and 21 on the west edge, two rows wide, because that is what is on
 * the other side of the seam. The lower half of the same road, the one that
 * leaves Aureline, is `route_8_climb`. Both say ROUTE 8 on the banner, exactly
 * as route_7 and route_7_north are both the Central Road.
 *
 * NOBODY HAS TO CHANGE ANYTHING FOR THIS TO WORK, which is the whole point.
 */
const FROSTMERE_GATE = { x: 1, y: 24 };

/* -------------------------------------------------------------------- build */

const eight = routeEight();
const kiln = routeEightKiln();
const pass = routeEightPass();

// People, signs and pickups live in their own module so the composition above
// stays readable; see tools/gen/route8-people.mjs.
const { populate } = await import('./route8-people.mjs');
populate(eight, kiln, pass);

for (const m of [eight, kiln, pass]) plant(m);

let ok = true;
for (const [map, from, sealed] of [
  [eight, [83, 22], [[6, 4]]],
  [kiln, [16, 29], []],
  [pass, [75, 30], [[41, 27], [42, 27]]],
]) {
  ok = verify(map, from, sealed) && ok;
}

out('route_8', eight);
out('route_8_kiln', kiln);
out('route_8_pass', pass);
if (!ok) { console.error('  SOMETHING IS UNREACHABLE -- do not ship this'); process.exit(1); }
