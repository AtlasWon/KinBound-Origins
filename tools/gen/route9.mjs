// Composes Route 9 -- the Skyreach Stair -- its falls, and Route 10, the Crown
// Road on to Crownspire.
//
//   node tools/gen/route9.mjs
//
// IT OVERWRITES data/maps/route_9.json, route_9_falls.json and route_10.json.
//
// WHY ROUTE 10 IS IN THIS FILE. It was nobody's. data/maps/skyreach.json warps
// out of its south gate to a map called route_10 and data/maps/crownspire.json
// warps out of its west gate to the same map, and neither of those builds owns
// the road between them -- which is the exact failure this project has shipped
// in four stages running, an entrance drawn on one map with a room behind it
// and nothing connecting them. Both ends already existed when this was written,
// so this file takes the middle and matches their coordinates rather than
// asking either of them to move.
//
// Route 9 and Route 10 are the same mountain from two sides and are composed
// with the same kit -- see tools/gen/routekit.mjs, and the note there on why a
// map made of noise fields has to be flood-checked before it is written.
import { writeFileSync } from 'node:fs';
import { canvas, field, plant, rnd, road, verify } from './routekit.mjs';

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

/* ==================================================================== ROUTE 9
 *
 * THE SKYREACH STAIR. Sixty-four by forty-eight, laid out west to east: in
 * from Aureline's east gate at the bottom left, out onto the plateau and into
 * Skyreach at the right.
 *
 * THE GORGE IS THE MAP. Canon asks for tall mountains, windy plateaus, giant
 * valleys, waterfalls, rope bridges and sheer cliffs, and lists them in one
 * breath -- but a route made of all six is a scenery catalogue. So one of them
 * is the structure and the rest are its consequences: a chasm cuts the map in
 * half from top to bottom, everything west of it is the approach, everything
 * east of it is the plateau, and the only ways across are two bridges and a
 * gap where a third one used to be.
 *
 * WHAT CROSSING SOMETHING FEELS LIKE. The main bridge is two cells wide and
 * eleven long, with nothing either side of it for six rows in each direction.
 * That is the whole design of it. A player walking it can see the drop through
 * the boards, cannot turn aside, and arrives somewhere they can only leave the
 * way they came or by going on -- which is a thing a field of grass has never
 * once done to anybody.
 *
 * THE THIRD BRIDGE went in the same gale that started all of this. Its posts
 * are still standing on both sides and there is a pinnacle in the middle of
 * the gap with something on it. That is the route's promise to come back: the
 * Gale Hall is at the far end of this road and gives the art that crosses it.
 */
function routeNine() {
  const W = 64, H = 48;
  const c = canvas(W, H, '.');

  const rockf = field(W, H, 7);
  const patch = field(W, H, 5);
  const grain = field(W, H, 2.2);
  const wobble = field(W, H, 9);

  // How high, 0 in the valley at the west end and 1 out on the plateau. The
  // change is a slope rather than a step: turf gives out, tussock takes over,
  // and by the east edge there is nothing but combed grass and bare rock.
  const up = (x, y) => Math.max(0, Math.min(1, (x - 6 + (wobble(x, y) - 0.5) * 14) / 52));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = up(x, y);
      const g = grain(x, y);
      let ch = a > 0.52 ? (g > 0.7 ? ',' : '.') : g > 0.82 ? '*' : g > 0.5 ? ',' : '.';
      // Tussock: the plateau's own grass, and its encounters. It comes in
      // combed beds lying the way the wind lies, which is what the tile is
      // drawn to, and it takes over from ordinary tall grass going east.
      if (patch(x, y) > 0.62) ch = a > 0.40 ? '∧' : '"';
      // Rock. There is more of it the higher you get and it is always in
      // slopes, never in flecks.
      if (rockf(x, y) < (a - 0.22) * 0.95) ch = '∇';
      if (rockf(x, y) > 0.88 && a > 0.3) ch = '∆';
      // The last trees are in the valley, and they stop at the gorge.
      if (a < 0.26 && rockf(x, y) > 0.62 && patch(x, y) < 0.55 && g > 0.45) ch = 'T';
      c.set(x, y, ch);
    }
  }
  // Border: cliff, all the way round, because this is a shelf cut in a
  // mountainside and the map should say so on every edge.
  for (let x = 0; x < W; x++) for (let k = 0; k < 2; k++) { c.set(x, k, 'C'); c.set(x, H - 1 - k, 'C'); }
  for (let y = 0; y < H; y++) for (let k = 0; k < 2; k++) { c.set(k, y, 'C'); c.set(W - 1 - k, y, 'C'); }

  /* -------------------------------------------------------------- the gorge
   *
   * North to south across the whole map, wandering, and between four and eight
   * cells wide. Wide enough that a bridge is a walk rather than a step, narrow
   * enough that the far side is always in view: the point of a chasm in a game
   * you look down on is that the player can SEE where they are trying to get
   * to and cannot go there.
   */
  const lip = (y) => 30 + Math.round(Math.sin(y * 0.17) * 4 + Math.sin(y * 0.41 + 1.2) * 2);
  const wide = (y) => 4 + Math.round(2 + Math.sin(y * 0.23 - 0.6) * 2);
  for (let y = 2; y < H - 2; y++) {
    const x0 = lip(y), w = wide(y);
    for (let x = x0; x < x0 + w; x++) c.set(x, y, '⊗');
    // The rim: bare rock either side, so the edge of the drop is a place and
    // not just where the ground stops.
    for (const x of [x0 - 1, x0 + w]) if (c.at(x, y) && c.at(x, y) !== '⊗') c.set(x, y, '∇');
  }

  /* ------------------------------------------------------------ the falls
   *
   * A fall coming off the north wall straight into the gorge, and the reason
   * the whole east half of the map has a noise in it. It is what gives the
   * cliff its height: a grey wall is a wall, and the same wall with a white
   * thread down it is a mountain.
   */
  for (let y = 2; y <= 9; y++) {
    const x0 = lip(y);
    for (let x = x0 + 1; x < x0 + 4; x++) c.set(x, y, '⇓');
  }

  /* ------------------------------------------------------------ the road */
  //
  // In along the valley floor, over the main bridge, and up the shoulder onto
  // the plateau. It is turf and gravel rather than anything made: nobody has
  // metalled a road that has a rope bridge in the middle of it.
  const bridgeY = 24;
  const bx0 = lip(bridgeY) - 1, bw = wide(bridgeY) + 2;
  road(c, [[0, 33], [8, 33], [16, 30], [24, 26], [bx0, bridgeY]], () => 1, () => '-');
  road(c, [[bx0 + bw, bridgeY], [44, 24], [52, 24], [63, 24]], () => 1, () => '-');

  // THE MAIN BRIDGE. Two cells wide, and the posts are the ends of it.
  for (let x = bx0; x <= bx0 + bw; x++) {
    for (const y of [bridgeY, bridgeY + 1]) c.set(x, y, '∈');
  }
  for (const y of [bridgeY - 1, bridgeY + 2]) {
    for (let x = bx0; x <= bx0 + bw; x++) c.set(x, y, '⊗');
  }
  c.set(bx0 - 1, bridgeY, '∋'); c.set(bx0 - 1, bridgeY + 1, '∋');
  c.set(bx0 + bw + 1, bridgeY, '∋'); c.set(bx0 + bw + 1, bridgeY + 1, '∋');

  // THE OLD BRIDGE, south, on the branch to the falls. Narrower, one cell
  // wide, and it is the only one-cell walkway in the game -- which is the
  // point of it.
  const oldY = 39;
  const ox0 = lip(oldY) - 1, ow = wide(oldY) + 2;
  for (let x = ox0; x <= ox0 + ow; x++) c.set(x, oldY, '∈');
  c.set(ox0 - 1, oldY, '∋'); c.set(ox0 + ow + 1, oldY, '∋');
  road(c, [[16, 33], [18, 39], [ox0 - 1, oldY]], () => 0, () => '-');
  road(c, [[ox0 + ow + 1, oldY], [50, 40], [56, 38]], () => 0, () => '-');

  // THE THIRD BRIDGE, and the gap where it is not. Posts on both rims, a
  // pinnacle standing in the middle of the drop with something on it, and no
  // way across until the Gale Hall at the far end of this road hands one over.
  const gapY = 13;
  const gx0 = lip(gapY) - 1, gw = wide(gapY) + 2;
  c.set(gx0 - 1, gapY, '∋'); c.set(gx0 + gw + 1, gapY, '∋');
  // The pinnacle is TWO cells, one above the other, and that is a mechanism
  // rather than a flourish. The updraft sets a player down on the lower one,
  // which is where the thing is; the upper one is the way back off. One cell
  // would strand them, because the step script that lifts them across would
  // fire again the instant they landed on it.
  // THE PINNACLE IS THREE CELLS TALL, and every one of them is doing a job.
  // The updraft sets a player down on the MIDDLE one, because loadMap places
  // the player and marks that cell as already-entered -- so anything standing
  // on the arrival tile is never picked up and any step trigger on it never
  // fires. The thing to fetch is therefore on the cell above, and the way back
  // off is the cell below. Two cells was tried first and left the player either
  // unable to collect what they came for or bounced home the instant they
  // arrived.
  const pinX = gx0 + Math.floor(gw / 2);
  for (let k = 0; k < 3; k++) c.set(pinX, gapY + k, '∇');
  road(c, [[24, 20], [22, 14], [gx0 - 1, gapY]], () => 0, () => '-');
  // The west bollard goes in AFTER the spur, one row up from the rim: the spur
  // paves the cell the post was first put on, and the rim itself has to stay
  // standable because it is where a player with the Gale Hall's art steps off.
  c.set(gx0 - 1, gapY - 1, '∋');

  /* ------------------------------------------------------ the branch down */
  //
  // A stair cut down the north wall to the plunge pool, and the mouth behind
  // the fall. The one place on this route that is out of the wind.
  for (let y = 6; y <= 12; y++) c.set(lip(y) - 2, y, '-');
  c.set(lip(6) - 2, 5, '-');

  /* ------------------------------------------------------------ waymarking */
  for (const x of [6, 14, 46, 54, 60]) {
    let y = 0;
    while (y < H && c.at(x, y) !== '-') y++;
    if (y >= H) continue;
    const at = Math.max(2, y - 3);
    if ('.,*∧∇'.includes(c.at(x, at))) c.set(x, at, '√');
  }
  for (const [x, y] of [[10, 36], [bx0 - 2, bridgeY + 3], [gx0 - 2, gapY + 2], [50, 21], [20, 41], [58, 27]]) {
    if ('.,*∧∇'.includes(c.at(x, y))) c.set(x, y, '´');
  }
  for (const [x, y] of [[4, 30], [42, 27], [59, 21]]) if ('.,*∧∇'.includes(c.at(x, y))) c.set(x, y, '■');

  // The two seams, cut to fit what is already on the other side of them.
  for (const y of [32, 33, 34]) { c.set(0, y, '-'); c.set(1, y, '-'); c.set(2, y, '-'); }
  for (const y of [24, 25]) { c.set(63, y, '-'); c.set(62, y, '-'); c.set(61, y, '-'); }

  const warps = [];
  for (const [i, y] of [32, 33, 34].entries()) {
    warps.push({ x: 0, y, toMap: 'aureline', toX: 149, toY: 90 + i, facing: 'left', style: 'edge' });
  }
  for (const [i, y] of [24, 25].entries()) {
    warps.push({ x: 63, y, toMap: 'skyreach', toX: 1, toY: 41 + i, facing: 'right', style: 'edge' });
  }
  warps.push({ x: lip(5) - 2, y: 4, toMap: 'route_9_falls', toX: 20, toY: 28, facing: 'up', style: 'cave' });

  return {
    id: 'route_9',
    name: 'The Skyreach Stair',
    displayName: 'ROUTE 9 - THE SKYREACH STAIR',
    music: 'route_coast',
    battleBackdrop: 'highland',
    indoor: false,
    regionPos: { x: 24, y: 5 },
    encounterTable: 'route_9',
    _design: 'The road east out of Aureline and up onto the cliffs, and the map where the game finally has a HOLE in it. Canon lists tall mountains, windy plateaus, giant valleys, waterfalls, rope bridges and sheer cliffs in one breath, and a route built out of all six of those is a scenery catalogue -- so one of them is the structure and the other five are its consequences. A chasm cuts the map from top to bottom, the west half is the approach and the east half is the plateau, and the only ways over are two bridges and a gap where a third one used to be.',
    _plan: 'THE BRIDGE IS THE POINT AND IT IS BUILT TO BE FELT. Two cells wide, thirteen long, with six rows of nothing above and below it. The player can see the drop through the boards, cannot turn aside, and arrives somewhere they can only leave forwards or back. A field of tall grass has never once done that to anybody, and this is what canon means by asking for a rope bridge over a drop rather than another field.\n\nTHREE CROSSINGS, THREE ANSWERS. The main bridge at y24 is the road. The old bridge at y39 is one cell wide -- the only single-file walkway in the game -- and it is the optional branch, leading south and round to the falls. The third, at y13, is not there any more: two posts, a pinnacle standing in the middle of the gap with something on it, and no way over until the Gale Hall at the FAR END OF THIS ROAD hands the art over. That is the shortest come-back-later loop in Caelora and it is deliberate: the player can see the reward from the rim, walk twenty minutes, and come straight back for it.\n\nTHE FALL comes off the north wall into the gorge at the top of the map and is what gives the cliff its height. The stair cut down beside it leads behind the water -- route_9_falls -- which is the rare-encounter spot and the only place on this road that is out of the wind.',
    warps,
    npcs: [
      trainer('r9_carter', 10, 33, 'porter', 'right', 3),
      talker('r9_lifthand', 20, 29, 'dockhand', 'down'),
      trainer('r9_ropewalker', bx0 - 3, bridgeY, 'sailor', 'right', 4),
      talker('r9_bridgekeeper', bx0 + bw + 3, bridgeY + 1, 'harbourmaster', 'left'),
      trainer('r9_windwatch', 40, 25, 'meridian_sci_f', 'down', 3),
      trainer('r9_shepherd', 50, 30, 'villager_f', 'up', 3),
      trainer('r9_dockrunner', 58, 24, 'dockhand', 'left', 4),
      talker('r9_gapman', gx0 - 3, gapY, 'hiker', 'right'),
    ],
    objects: [
      sign(10, 36, [
        'A board at the foot of the stair, lettered by somebody with a straight edge.',
        'SKYREACH: FOUR MILES AND ALL OF THEM UP. THE BRIDGE IS THE ONLY WAY OVER.',
        'Under it, newer paint: AND IT IS SAFE. IT HAS ALWAYS BEEN SAFE. STOP ASKING.',
      ]),
      note(bx0 - 2, bridgeY + 3, [
        'The bridge head. Two cables made off round a stone bollard, and a tally board.',
        'INSPECTED: THE FOURTEENTH. THE FIFTEENTH. THE SIXTEENTH. THE SIXTEENTH AGAIN.',
        'Three inspections in three days, and then the same day twice.',
      ]),
      note(gx0 - 2, gapY + 2, [
        'Two posts, and nothing between them. The cables are gone from both.',
        'There is a pinnacle standing in the middle of the gap with something on it.',
        'Air comes up this gap hard enough to lift snow off the rim and hold it there.',
      ]),
      sign(50, 21, [
        'A wind board on a mast, the kind the dock company puts up along the top road.',
        'GUSTING 40. DOCKS CLOSED TO INBOUND. NO EXCEPTIONS AND NO ARGUMENTS.',
        'The number has been rubbed out and rewritten so many times the board is thin.',
      ]),
      sign(20, 41, [
        'A hand-painted board where the lower path leaves the road.',
        'OLD BRIDGE. ONE AT A TIME. NOBODY MAINTAINS IT AND NOBODY EVER DID.',
      ]),
      sign(58, 27, [
        'A last board before the town gate, weighted down with a stone on each arm.',
        'SKYREACH. KEEP OFF THE DOCK BRIDGES IN A GALE. THIS MEANS EVERYBODY.',
      ]),
      note(4, 30, ['A milestone, the last one the capital paid for. AURELINE IV.']),
      note(42, 27, ['A milestone in the old lettering. CROWNSPIRE XXXI. SKYREACH II.']),
      note(59, 21, ['A milestone with a dock-company plate nailed over the old face. SKYREACH I.']),
      item(30, 8, 'great_potion', 3, 'item_r9_northrim'),
      item(56, 41, 'full_heal', 3, 'item_r9_southshelf'),
      item(8, 12, 'warden_vessel', 5, 'item_r9_valleyhead'),
      item(gx0 + Math.floor((wide(gapY) + 2) / 2), gapY, 'full_restore', 1, 'item_r9_pinnacle'),
      item(48, 12, 'strong_potion', 3, 'item_r9_plateau'),
      hidden(14, 44, 'ward_incense', 2, 'item_r9_hidden_south'),
      hidden(60, 8, 'full_rouse', 1, 'item_r9_hidden_high'),
    ],
    rows: c.rows(),
  };
}

/* ============================================================= ROUTE 9 FALLS
 *
 * Behind the water. Forty by thirty, dark, and the one place on this road that
 * is out of the wind -- which is the whole reason it exists. Route 9 is a map
 * about exposure, and the only way to make a player feel that is to give them
 * ten minutes of shelter and then take it away again.
 */
function routeNineFalls() {
  const W = 40, H = 30;
  const c = canvas(W, H, 'C');

  const patch = field(W, H, 4);
  const grain = field(W, H, 2);
  // A cavern behind the sheet: wider at the mouth, tapering back into the rock.
  for (let y = 4; y < H - 2; y++) {
    const half = Math.round(13 - Math.abs(y - 18) * 0.55);
    for (let x = 20 - half; x <= 20 + half; x++) {
      // Scree, wet rock and boulders. The cut stone tile was tried as the
      // floor here and read as a paved room: this is a hole behind a
      // waterfall, and the only worked stone in it is the ledge somebody cut
      // along the back wall and the stair down from the rim.
      const g = grain(x, y);
      let ch = '∇';
      if (patch(x, y) > 0.70) ch = '~';
      if (g > 0.88) ch = '∆';
      c.set(x, y, ch);
    }
  }
  // The sheet itself, hanging down the front of the mouth, and the pool it
  // lands in. Both solid: this is a room you look out of, not a way through.
  for (let x = 12; x <= 28; x++) for (let y = 2; y <= 4; y++) c.set(x, y, '⇓');
  for (let x = 15; x <= 25; x++) for (let y = 24; y <= 27; y++) c.set(x, y, '~');
  for (let x = 17; x <= 23; x++) for (let y = 25; y <= 26; y++) c.set(x, y, 'W');

  // The way in, down the stair from the rim.
  for (let y = 26; y <= 29; y++) { c.set(20, y, '='); c.set(21, y, '='); }
  for (let x = 12; x <= 28; x++) c.set(x, 28, '=');
  c.set(20, 29, '='); c.set(21, 29, '=');

  // A dry ledge along the back wall, and what people have left on it.
  for (let x = 10; x <= 30; x++) c.set(x, 14, '=');

  return {
    id: 'route_9_falls',
    name: 'Behind the Fall',
    displayName: 'BEHIND THE FALL',
    music: 'station',
    battleBackdrop: 'cave',
    indoor: false,
    dark: false,
    regionPos: { x: 23, y: 4 },
    encounterTable: 'route_9_falls',
    _design: 'The rare-encounter spot and the optional branch of Route 9, and it is a room with one idea in it: SHELTER. The whole of Route 9 is a map about exposure -- a gale board every mile, a bridge with nothing either side of it, a wind that has closed the airship docks -- and the only way to make a player feel that is to give them ten quiet minutes behind a sheet of falling water and then send them back out into it. Nothing in here needs to be said out loud.',
    _plan: 'One cavern, one ledge, one pool. Brinewisp is the rare slot and it is here because a Tide/Spirit that the Vellum puts in dead water belongs in a plunge pool nobody can see the bottom of, and because the player has met exactly one of them before, four acts ago, on the coast. The deep water in the middle of the pool is a Swim gate like every other one in the game.',
    warps: [
      { x: 20, y: 29, toMap: 'route_9', toX: 0, toY: 0, facing: 'down', style: 'cave' },
      { x: 21, y: 29, toMap: 'route_9', toX: 0, toY: 0, facing: 'down', style: 'cave' },
    ],
    npcs: [trainer('r9f_hermit', 26, 14, 'elder', 'left', 3)],
    objects: [
      note(30, 14, [
        'A dry ledge along the back wall with sixty years of names cut into it.',
        'Somebody has been keeping a tally of the water level in the pool below.',
        'The last four marks are above every mark before them, and the last one is fresh.',
      ]),
      item(12, 12, 'full_restore', 1, 'item_r9f_ledge'),
      item(20, 25, 'deep_vessel', 5, 'item_r9f_pool'),
      hidden(31, 20, 'thawcloth', 3, 'item_r9f_hidden'),
    ],
    rows: c.rows(),
  };
}

/* =================================================================== ROUTE 10
 *
 * THE CROWN ROAD. Fifty-six by forty, and the last road in Act 5.
 *
 * It is the only route in Caelora that is going DOWN. Everything since the
 * capital has climbed -- the Frostmere road, the Stair, the plateau -- and this
 * one comes off the top of the world into the oldest settled country in the
 * region, and the ground changes accordingly: tussock and scree at the north
 * end where it leaves Skyreach, terraced turf and cut stone at the east end
 * where it arrives at Crownspire.
 *
 * THE ROAD IS THE OLDEST THING ON IT. Paved, kerbed, and cut into the hill on
 * a made shelf, and it has been there long enough that the milestones on it
 * are in a lettering nobody uses. That is the only preparation Crownspire gets
 * from this side, and it is the right one: the eighth Hall is in the oldest
 * city in Caelora, and the player should arrive already believing it.
 *
 * LOW CLOUD RATHER THAN SNOW. `fog` at 0.22, which is a softening at the edges
 * of the view and never stops anybody finding the road -- the mountain roads
 * behind this one own the weather that takes your sight away, and doing it
 * twice would spend the trick. What this map has instead is a sky that is on
 * the ground, which is what a col in a turning season actually looks like.
 */
function routeTen() {
  const W = 56, H = 40;
  const c = canvas(W, H, '.');

  const rockf = field(W, H, 7);
  const patch = field(W, H, 5);
  const grain = field(W, H, 2.2);
  const wobble = field(W, H, 8);

  // How high, 1 at the Skyreach end and 0 at the Crownspire gate. The road
  // descends across the map and the country softens with it.
  const high = (x, y) => Math.max(0, Math.min(1,
    ((28 - x) * 0.5 + (24 - y) * 0.9 + (wobble(x, y) - 0.5) * 14) / 38 + 0.5));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = high(x, y);
      const g = grain(x, y);
      let ch = g > 0.8 ? '*' : g > 0.5 ? ',' : '.';
      if (patch(x, y) > 0.60) ch = a > 0.50 ? '∧' : '"';
      if (rockf(x, y) < (a - 0.45) * 1.5) ch = '∇';
      if (rockf(x, y) > 0.88 && a > 0.55) ch = '∆';
      // The old country: hedges and standing trees come back at the bottom.
      if (a < 0.30 && rockf(x, y) > 0.72 && g > 0.5) ch = '●';
      if (a < 0.18 && rockf(x, y) > 0.80) ch = 'T';
      c.set(x, y, ch);
    }
  }
  for (let x = 0; x < W; x++) for (let k = 0; k < 2; k++) {
    c.set(x, k, x < 34 ? 'C' : 'T'); c.set(x, H - 1 - k, 'T');
  }
  for (let y = 0; y < H; y++) for (let k = 0; k < 2; k++) { c.set(k, y, 'C'); c.set(W - 1 - k, y, 'T'); }

  /* ------------------------------------------------------- the great tarn
   *
   * A high lake in the col, and the Swim gate of the road. There is an islet
   * with a boundary stone on it that both cities have claimed for eight
   * hundred years, which is the joke the map is making and never explains.
   */
  for (let y = 8; y <= 18; y++) {
    for (let x = 8; x <= 24; x++) {
      const d = ((x - 16) / 9) ** 2 + ((y - 13) / 5.5) ** 2;
      if (d > 1) continue;
      c.set(x, y, d > 0.72 ? '~' : 'W');
    }
  }
  c.set(16, 13, '.'); c.set(17, 13, '.'); c.set(16, 12, '■');

  /* ------------------------------------------------------------- the road */
  //
  // Made, kerbed and cut into the hill: stone flags, which is the first paved
  // road outside a city anywhere in the game.
  road(c, [[20, 0], [20, 6], [26, 12], [30, 20], [38, 22], [46, 16], [55, 13]],
    () => 1, () => '=');
  for (const y of [12, 13, 14]) { c.set(55, y, '='); c.set(54, y, '='); c.set(53, y, '='); }
  for (const x of [19, 20, 21]) { c.set(x, 0, '='); c.set(x, 1, '='); c.set(x, 2, '='); }

  /* -------------------------------------------------- the Crown Road's arch
   *
   * A wayside arch on the road, older than Crownspire's walls and built out of
   * the same granite. It is the landmark, it is walkable, and standing under
   * it is the first time the player is inside anything anybody cut before the
   * Halls existed.
   */
  c.rect(34, 24, 40, 26, '▪');
  c.set(36, 26, '◘'); c.set(37, 26, '◘'); c.set(38, 26, '◘');
  for (let x = 33; x <= 41; x++) c.set(x, 27, '=');
  for (let y = 22; y <= 27; y++) { c.set(37, y, '='); c.set(38, y, '='); }

  /* -------------------------------------------------- the optional branch
   *
   * South off the road into the old terraces: the country Crownspire fed
   * itself on for eight hundred years, walked out and grassed over. The rare
   * encounter is down there and so is the best thing on the map.
   */
  road(c, [[30, 22], [28, 30], [34, 35], [46, 34]], () => 0, () => '-');
  for (let y = 30; y <= 36; y++) {
    for (let x = 30; x <= 50; x++) {
      if ((y - 30) % 3 === 0 && rockf(x, y) > 0.4) c.set(x, y, '●');
    }
  }

  for (const x of [24, 32, 44, 50]) {
    let y = 0;
    while (y < H && c.at(x, y) !== '=') y++;
    if (y >= H) continue;
    const at = Math.max(2, y - 3);
    if ('.,*∧∇"'.includes(c.at(x, at))) c.set(x, at, '´');
  }
  for (const [x, y] of [[22, 8], [33, 21], [48, 17]]) if ('.,*∧∇"'.includes(c.at(x, y))) c.set(x, y, '■');

  return {
    id: 'route_10',
    name: 'The Crown Road',
    displayName: 'ROUTE 10 - THE CROWN ROAD',
    music: 'route_west',
    battleBackdrop: 'highland',
    indoor: false,
    fog: 0.22,
    regionPos: { x: 29, y: 9 },
    encounterTable: 'route_10',
    _design: 'The last road of Act 5, and the only route in Caelora that is going DOWN. Everything since the capital has climbed; this one comes off the top of the world into the oldest settled country in the region, and the ground softens the whole way -- tussock and scree where it leaves Skyreach, terraced turf and hedge and standing timber where it arrives at Crownspire.\n\nTHE ROAD IS THE OLDEST THING ON IT, and it is the only preparation Crownspire gets from this side. Paved, kerbed, cut into the hill on a made shelf, with milestones on it in a lettering nobody uses any more. The eighth Hall is in the oldest city in Caelora and the player should arrive already believing that, without anybody having said it.\n\nIT WAS NOBODY\\u2019S MAP. Skyreach warps out of its south gate to route_10 and Crownspire warps out of its west gate to route_10, and neither build owned the road between them. Both ends existed before this file did, so both ends are matched exactly rather than asked to move.',
    _plan: 'LOW CLOUD, NOT SNOW. fog at 0.22 -- a softening at the edges of the view that never stops anybody finding the road. The two mountain roads behind this one own the weather that takes your sight away and doing it a third time would spend the trick; what this map has instead is a sky sitting on the ground, which is what a col in a turning season looks like.\n\nTHE ARCH at 34,24 is the landmark: a wayside arch older than Crownspire\\u2019s walls, cut from the same granite, walkable, and the first thing anybody cut before the Halls that the player has been able to stand inside. THE TARN in the col is the Swim gate, with a boundary stone on an islet that two cities have both claimed for eight hundred years and neither can reach. THE BRANCH runs south into the abandoned terraces, which is where the rare Kin is and where the road stops being about mountains and starts being about people who left.',
    warps: [
      { x: 20, y: 0, toMap: 'skyreach', toX: 60, toY: 57, facing: 'up', style: 'edge' },
      { x: 21, y: 0, toMap: 'skyreach', toX: 61, toY: 57, facing: 'up', style: 'edge' },
      { x: 55, y: 13, toMap: 'crownspire', toX: 1, toY: 58, facing: 'right', style: 'edge' },
      { x: 55, y: 14, toMap: 'crownspire', toX: 1, toY: 59, facing: 'right', style: 'edge' },
    ],
    npcs: [
      trainer('r10_toll', 22, 6, 'villager_m', 'down', 3),
      talker('r10_boundary', 14, 19, 'elder', 'up'),
      trainer('r10_drover', 31, 21, 'villager_f', 'right', 3),
      talker('r10_mason', 37, 27, 'porter', 'down'),
      trainer('r10_terrace', 36, 33, 'hiker', 'up', 3),
      trainer('r10_courier', 44, 20, 'porter', 'left', 4),
      trainer('r10_gatehand', 51, 14, 'townsfolk_f', 'left', 4),
    ],
    objects: [
      note(22, 8, [
        'A milestone in a lettering that stopped being used four hundred years ago.',
        'CROWNSPIRE XI. The numerals are cut an inch deep and have not worn.',
      ]),
      sign(24, 6, [
        'A toll board at the top of the road, with a rate card nobody has updated.',
        'CARTS: TWO. BEASTS: ONE. FOOT: FREE, AND ALWAYS HAS BEEN.',
        'Somebody has written under it: THE ROAD IS OLDER THAN THE TOLL. WALK ON.',
      ]),
      note(16, 12, [
        'Out on the islet, a boundary stone with a face cut on either side.',
        'One face says SKYREACH. The other says CROWNSPIRE. They are the same stone.',
        'Nobody has stood beside it in eight hundred years to ask it which it meant.',
      ]),
      note(33, 21, ['A milestone. CROWNSPIRE V. Below the number, one word: NEARLY.']),
      note(37, 27, [
        'The arch. Granite, cut and set, and older than the city wall it points at.',
        'There is no inscription on it and no door in it. It is a road going through a wall',
        'that is not attached to anything, and it has been here longer than the road.',
      ]),
      sign(32, 30, [
        'A board at the head of the terrace path, gone silver with weather.',
        'OLD TERRACES. NO GRAZING, NO CUTTING, NO BUILDING. BY ORDER, AND FOR NINE HUNDRED YEARS.',
      ]),
      note(48, 17, ['A milestone. CROWNSPIRE I. The last one, and the only one anybody has cleaned.']),
      item(12, 26, 'full_restore', 1, 'item_r10_col'),
      item(16, 13, 'full_rouse', 2, 'item_r10_islet'),
      item(44, 33, 'great_potion', 3, 'item_r10_terrace'),
      item(50, 8, 'warden_vessel', 5, 'item_r10_highfield'),
      item(26, 36, 'full_heal', 3, 'item_r10_lowterrace'),
      hidden(8, 33, 'ward_incense', 2, 'item_r10_hidden_west'),
      hidden(52, 30, 'escape_line', 2, 'item_r10_hidden_east'),
    ],
    rows: c.rows(),
  };
}

/* -------------------------------------------------------------------- build */

const nine = routeNine();
const falls = routeNineFalls();
const ten = routeTen();

// The falls warp back to whichever cell of Route 9 the stair actually came
// down on, rather than to a number typed in twice. The stair head moves every
// time the gorge is re-tuned.
const stair = nine.warps.find((w) => w.toMap === 'route_9_falls');
for (const w of falls.warps) { w.toX = stair.x; w.toY = stair.y + 1; }

for (const m of [nine, falls, ten]) plant(m);

let ok = true;
for (const [map, from, sealed] of [
  [nine, [1, 33], [[nine.objects.find((o) => o.flag === 'item_r9_pinnacle').x, nine.objects.find((o) => o.flag === 'item_r9_pinnacle').y]]],
  [falls, [20, 28], [[20, 25]]],
  [ten, [20, 1], [[16, 13], [16, 12]]],
]) {
  ok = verify(map, from, sealed) && ok;
}

out('route_9', nine);
out('route_9_falls', falls);
out('route_10', ten);
if (!ok) { console.error('  SOMETHING IS WRONG -- do not ship this'); process.exit(1); }
