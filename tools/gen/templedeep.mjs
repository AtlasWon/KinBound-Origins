// The lower Temple of the Deep: the drowned approach, the power station and
// the listening floor.
//
//   node tools/gen/templedeep.mjs          # write the three map files
//   node tools/gen/templedeep.mjs --print  # print them and write nothing
//
// WHY A GENERATOR AND NOT THREE HAND-TYPED BLOCKS. Two of these rooms are
// round. The listening floor is a 40x36 chamber built out of three concentric
// arcs of seating and eight radial grooves converging on a well of open sea,
// and there is no way to keep that honest by counting characters in a text
// editor -- one wrong column and the room is an egg. The tunnels are hand-shaped
// rectangles and could have been typed, but they share the map writer and the
// width check with the other two, so they live here as well.
//
// Everything below is authored against the EXISTING terrain vocabulary. Not one
// character is new: the Aurelian set (Omega wall, Theta floor, theta glyph,
// equiv/approx grooves, Phi ring, Xi seat) is what these people built with
// everywhere else in the game, deep water and shallow water are the two the sea
// was already using, and Meridian's kit is the laboratory and Embercoil-survey
// families that the capital and the pass already put on the screen. A player who
// walked the Embercoil Temple in Act 3 should recognise this as the same
// civilisation from the first screen, and should recognise what has been bolted
// into it as the same Foundation whose basement they stood in in Act 4.
//
// See the `_plan` on each map for what the room is FOR. This file is geometry.

import { writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAPDIR = join(ROOT, 'data', 'maps');
const PRINT_ONLY = process.argv.includes('--print');

/* ------------------------------------------------------------- painting */

const grid = (w, h, fill) => ({
  w, h, cells: Array.from({ length: h }, () => Array(w).fill(fill)),
});

const put = (g, x, y, ch) => {
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return;
  g.cells[y][x] = ch;
};
const get = (g, x, y) => (x < 0 || y < 0 || x >= g.w || y >= g.h ? null : g.cells[y][x]);

const rect = (g, x0, y0, x1, y1, ch) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, x, y, ch);
};

/** Filled ellipse, inclusive of the boundary cell. */
const disc = (g, cx, cy, rx, ry, ch, only) => {
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      if (only && !only.includes(g.cells[y][x])) continue;
      put(g, x, y, ch);
    }
  }
};

/** One cell at polar (angle in degrees, radius in ellipse units). */
const polar = (cx, cy, rx, ry, deg, t) => {
  const a = (deg * Math.PI) / 180;
  return [Math.round(cx + Math.cos(a) * rx * t), Math.round(cy + Math.sin(a) * ry * t)];
};

const rows = (g) => g.cells.map((r) => r.join(''));

/*
 * A sign has to sit on something you can FACE.
 *
 * OverworldScene.handleInteract reads the object on the tile the player is
 * facing, so a sign on open floor can be stood on and then never read from any
 * side. Two of the rooms below are generated -- benches and channels move when
 * the ring radii are tuned -- so hand-picked sign coordinates go stale silently
 * and the room quietly loses a caption. This snaps every sign to the nearest
 * solid cell within two tiles and says so, and throws if there is not one,
 * which turns a silent loss into a build failure.
 */
const FACEABLE = new Set([...'ΩΞΦ¶÷±³¾@+?$╫EΨΆ']);

const anchorSigns = (map) => {
  const H = map.rows.length, W = map.rows[0].length;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : map.rows[y][x]);
  for (const o of map.objects ?? []) {
    if (o.kind !== 'sign' && o.kind !== 'script') continue;
    if (FACEABLE.has(at(o.x, o.y))) continue;
    let best = null;
    for (let r = 1; r <= 2 && !best; r++) {
      for (let dy = -r; dy <= r && !best; dy++) {
        for (let dx = -r; dx <= r && !best; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (FACEABLE.has(at(o.x + dx, o.y + dy))) best = [o.x + dx, o.y + dy];
        }
      }
    }
    if (!best) {
      throw new Error(`${map.id}: sign at ${o.x},${o.y} has nothing faceable within 2 tiles`);
    }
    console.log(`  sign ${o.x},${o.y} -> ${best[0]},${best[1]} (${at(best[0], best[1])})`);
    o.x = best[0];
    o.y = best[1];
  }
};

/*
 * Nothing on these four floors may be unreachable, and the generator proves it
 * rather than trusting it.
 *
 * This caught a real one. Adding Aurelian benches down both walls of the
 * landing hall walled off two wall signs that had been perfectly readable the
 * revision before -- a bench is solid, and a sign whose only approach tile is
 * now a bench is a caption nobody will ever see. Nothing else in the toolchain
 * notices that: validate-maps proves the map is well-formed and the test suite
 * proves the warps are sane, but neither of them walks the floor.
 *
 * Collision here is the player as they arrive: Wade since Act 2, and Swim,
 * which is granted on the first of these maps. Every object, NPC and warp has
 * to be standable-on or standable-beside from the tile the player comes in on.
 */
const ENTRY = {
  temple_deep_tunnels: [14, 34],
  temple_deep_power_stage: [16, 24],
  temple_deep_power: [9, 15],
  temple_deep_heart: [19, 34],
};
const OPEN = new Set([...'.,*"-=~WsDfrSpBxgFiqu:θΘ≡≈Σ¦·¨¸ß']);

const proveReachable = (map) => {
  const start = ENTRY[map.id];
  if (!start) return;
  const H = map.rows.length, W = map.rows[0].length;
  const passable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && OPEN.has(map.rows[y][x]);
  const seen = new Set([`${start[0]},${start[1]}`]);
  const q = [start];
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (seen.has(k) || !passable(nx, ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]
    .some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));
  const lost = [];
  for (const o of map.objects ?? []) if (!near(o.x, o.y)) lost.push(`${o.kind}@${o.x},${o.y}`);
  for (const n of map.npcs ?? []) if (!near(n.x, n.y)) lost.push(`npc ${n.id}@${n.x},${n.y}`);
  for (const w of map.warps ?? []) if (!seen.has(`${w.x},${w.y}`)) lost.push(`warp@${w.x},${w.y}`);
  if (lost.length) throw new Error(`${map.id}: unreachable from ${start}: ${lost.join(', ')}`);
  console.log(`  reachable: ${seen.size} tiles, everything on the map touchable`);
};

const write = (map) => {
  const w = new Set(map.rows.map((r) => r.length));
  if (w.size !== 1) throw new Error(`${map.id}: ragged rows ${[...w].join(',')}`);
  anchorSigns(map);
  proveReachable(map);
  const path = join(MAPDIR, `${map.id}.json`);
  if (PRINT_ONLY) {
    console.log(`\n=== ${map.id}  ${[...w][0]}x${map.rows.length} ===`);
    map.rows.forEach((r, i) => console.log(String(i).padStart(2), r));
    return;
  }
  writeFileSync(path, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
  console.log(`wrote ${path}  ${[...w][0]}x${map.rows.length}`);
};

/* ===================================================== 1. THE TUNNELS === */
/*
 * A processional way with the sea in it.
 *
 * The shape is a nave: you come up a dry hall from the landing, the floor
 * stops at a quay, there is one row of shallow water past the lip and then it
 * is over your head for twenty rows. Two files of drowned columns stand in the
 * middle of it, because a column tells you the roof used to be there and the
 * water tells you it is not.
 *
 * THE GATE IS THE ROW AT y24. That single band of '~' is the whole reason this
 * map reads: Wade takes the player to the edge of the drop and no further, so
 * they can stand in the water they have and look at the water they have not
 * got. Everything from y23 north is collision 8 and belongs to nobody until
 * Marit Vane hands it over.
 */
function tunnels() {
  const g = grid(30, 36, 'Ω');

  // The landing: dry Aurelian hall, and the last dry ground in the game.
  rect(g, 6, 26, 23, 34, 'Θ');
  rect(g, 9, 25, 20, 25, 'Θ');            // the quay lip
  put(g, 14, 35, 'S'); put(g, 15, 35, 'S');   // up to the temple above
  // Grooves in the landing floor, running north at the water like everything
  // else these people built.
  for (const x of [10, 13, 16, 19]) rect(g, x, 27, x, 34, '≡');
  // Aurelian benches down both long walls, and one ring standing at the head of
  // each aisle. The hall was a place to wait in before it was a landing stage.
  for (const y of [28, 29, 31, 32]) { put(g, 6, y, 'Ξ'); put(g, 23, y, 'Ξ'); }
  put(g, 7, 26, 'Φ'); put(g, 22, 26, 'Φ');
  // Nine days of somebody else's expedition, stacked against the west wall, and
  // this morning's landing party's kit stacked opposite it.
  put(g, 8, 33, '¾'); put(g, 9, 33, '¾'); put(g, 8, 34, '¾');
  put(g, 21, 32, '¾'); put(g, 21, 33, '¾');
  put(g, 20, 30, '$'); put(g, 20, 31, 'E');

  // One row of shallow, and then the drop.
  rect(g, 8, 24, 21, 24, '~');

  // The flooded nave.
  rect(g, 5, 14, 24, 23, 'W');
  // The transept: wider, and the only part of the ruin with two arms.
  rect(g, 3, 10, 26, 13, 'W');
  // The choir, tapering.
  rect(g, 7, 8, 22, 9, 'W');
  rect(g, 11, 4, 18, 7, 'W');
  rect(g, 13, 3, 16, 3, '~');
  put(g, 14, 2, '≈'); put(g, 15, 2, '≈');
  put(g, 14, 1, 'Θ'); put(g, 15, 1, 'Θ');     // through to the power station

  // Drowned columns. Two files down the nave, four across the transept.
  for (const y of [16, 19, 22]) { put(g, 8, y, 'Ω'); put(g, 21, y, 'Ω'); }
  for (const x of [6, 10, 19, 23]) put(g, x, 11, 'Ω');

  // A sunken dais mid-nave: somewhere to stand, and the only place in the
  // room where a person is above the water with the columns either side. The
  // stump of a column beside it carries the only sign out in the water, which
  // is why it is there -- a sign on an open sea tile can be faced, but nobody
  // faces the sea on purpose.
  rect(g, 13, 17, 16, 18, 'Θ');
  put(g, 13, 17, 'θ'); put(g, 16, 18, 'θ');
  put(g, 12, 18, 'Ω');

  // Three pockets cut out of the rock, reachable only off the swim.
  rect(g, 3, 15, 4, 17, 'Θ');       // west chapel
  rect(g, 25, 20, 26, 22, 'Θ');     // east chapel
  rect(g, 1, 11, 2, 12, 'Θ');       // west arm end
  rect(g, 27, 11, 28, 12, 'Θ');     // east arm end

  return {
    id: 'temple_deep_tunnels',
    name: 'Temple of the Deep',
    displayName: 'THE DROWNED APPROACH',
    music: 'station',
    battleBackdrop: 'cave',
    indoor: true,
    encounterTable: 'temple_deep_tunnels',
    _plan: [
      'THE SWIM GATE, AND THE ONLY PLACE IN THE GAME THAT GRANTS IT.',
      '',
      'The engine has had deep water (collision 8) since the first stage, three',
      'terrain characters use it, and eight earlier maps have a reward sitting on',
      'an islet behind it -- and until this room nothing anywhere granted `swim`.',
      'This is the ocean act, so this is where it belongs, and it is granted here',
      'rather than in the power station or the chamber because this is the first',
      'room of the lower temple and a player cannot reach either of the others',
      'without crossing it.',
      '',
      'THE SHAPE IS A NAVE. Dry hall from the landing at the bottom, a quay lip at',
      'y25, ONE row of shallow water at y24, and then twenty rows of open sea with',
      'two files of drowned columns standing in it. The single band of shallow is',
      'load-bearing: Wade -- which the player has had since the Tide Crest -- takes',
      'them to the edge of the drop and not one tile further, so they stand in the',
      'water they have and look at the water they have not got. Nothing else in the',
      'room has to explain the gate.',
      '',
      'MARIT VANE GRANTS IT AND THE SCENE IS UNMISSABLE. She is the Tide',
      'Hallkeeper: she gave the player Wade in Tideglass in Act 2 and Hallkeepers',
      'are on this island because canon puts them on the operation. The grant is a',
      'STEP script (tdt_swim, data/events/temple_deep_tunnels.json) on the whole',
      'width of the quay lip at y25, not an interact -- an art nobody can walk past',
      'is an art nobody can miss, and the quay is the only way north.',
      '',
      'THE FOUR POCKETS ARE OFF THE SWIM ON PURPOSE. West chapel (3-4,15-17), east',
      'chapel (25-26,20-22) and the two transept arm ends are cut out of solid rock',
      'with nothing but water touching them, so the first thing the player does',
      'with the new art is use it to reach something. The dais at 13-16,17-18 is',
      'the resting stone in the middle of the nave.',
      '',
      'ENCOUNTERS ARE IN THE WATER AND NOWHERE ELSE. Deep water declares an',
      'encounter and Aurelian floor does not, so the player controls their own',
      'exposure by choosing whether to be swimming -- which matters more here than',
      'anywhere, because the hardest battle in the game is two rooms north. The',
      'rate is 80/1000 rather than the usual 150 for the same reason.',
      '',
      'THE JOINS, BOTH ENDS, SO NOBODY HAS TO GUESS:',
      '  IN   temple_deep_ruins 19,34 and 20,34 land the player on 14,34 / 15,34',
      '       of this map, which is dry Aurelian floor in the middle of the landing',
      '       hall. That is the ruins author\'s warp and it already exists.',
      '  BACK 14,35 and 15,35 here go up to temple_deep_ruins 19,33 / 20,33, the',
      '       two floor tiles directly above their own stair head.',
      '  ON   14,1 and 15,1 here go to temple_deep_power_stage 16,24 / 17,24.',
      'Chain in full: temple_deep -> temple_deep_ruins -> HERE ->',
      'temple_deep_power_stage -> temple_deep_power (the climax) ->',
      'temple_deep_heart (Neravoss).',
    ].join('\n'),
    rows: rows(g),
    warps: [
      { x: 14, y: 35, toMap: 'temple_deep_ruins', toX: 19, toY: 33, facing: 'up', style: 'stairs' },
      { x: 15, y: 35, toMap: 'temple_deep_ruins', toX: 20, toY: 33, facing: 'up', style: 'stairs' },
      { x: 14, y: 1, toMap: 'temple_deep_power_stage', toX: 16, toY: 24, facing: 'up', style: 'stairs' },
      { x: 15, y: 1, toMap: 'temple_deep_power_stage', toX: 17, toY: 24, facing: 'up', style: 'stairs' },
    ],
    npcs: [
      {
        id: 'tdt_marit',
        sprite: 'elder',
        x: 11, y: 26,
        facing: 'up',
        movement: { kind: 'static' },
        script: 'tdt_marit',
      },
      {
        id: 'tdt_hand',
        sprite: 'sailor',
        x: 19, y: 28,
        facing: 'left',
        movement: { kind: 'static' },
        script: 'tdt_hand',
      },
    ],
    objects: [
      {
        kind: 'sign', x: 13, y: 35,
        text: [
          'Chalk on the wall of the stair, put there this morning by somebody quick.',
          'FOUR DOWN. WATER AT THE BOTTOM. NOBODY PAST THE LIP.',
          'Under it, in a different hand and a worse temper: THEY WENT PAST THE LIP.',
        ],
      },
      {
        kind: 'sign', x: 5, y: 30,
        text: [
          'The wall is cut floor to ceiling with the same three marks, over and over.',
          'You have seen this row twice: under a volcano, and under a marsh.',
          'It is the same hand. It went a very long way.',
        ],
      },
      {
        kind: 'sign', x: 24, y: 30,
        text: [
          'A tide line across the columns at the height of your shoulder.',
          'Above it the stone is cut and perfect. Below it, three thousand years.',
          'The line is level the whole length of the hall. The sea took its time.',
        ],
      },
      {
        kind: 'sign', x: 8, y: 25,
        text: [
          'The floor stops here in a clean cut edge, and the sea starts.',
          'This is not the ruin of a quay. It is a quay. They built it to stop here.',
          'Whatever the rest of this hall is, it was always meant to be wet.',
        ],
      },
      {
        kind: 'sign', x: 12, y: 18,
        text: [
          'The stump of a column, and a platform beside it a hand under the water.',
          'The middle of the platform is worn hollow, the way a doorstep wears.',
          'People stood out here often enough to dish the stone.',
        ],
      },
      {
        kind: 'sign', x: 0, y: 11,
        text: [
          'The west arm ends in a room the sea has been in for a very long time.',
          'No silt. No weed. Something keeps the current running through it.',
          'Three thousand years, and this building is still doing its job.',
        ],
      },
      {
        kind: 'sign', x: 29, y: 11,
        text: [
          'A cable comes down through the roof of the east arm and turns north.',
          'It is new, it is armoured, and it is thicker than your arm.',
          'It does not belong to the people who cut this hall.',
        ],
      },
      { kind: 'item', x: 3, y: 16, item: 'full_restore', quantity: 1, flag: 'item_tdt_west_chapel' },
      { kind: 'item', x: 26, y: 21, item: 'deep_vessel', quantity: 3, flag: 'item_tdt_east_chapel' },
      { kind: 'item', x: 1, y: 11, item: 'full_rouse', quantity: 1, flag: 'item_tdt_west_arm' },
      { kind: 'hiddenItem', x: 28, y: 12, item: 'full_heal', quantity: 2, flag: 'item_tdt_east_arm' },
      { kind: 'hiddenItem', x: 15, y: 18, item: 'great_potion', quantity: 2, flag: 'item_tdt_dais' },
    ],
  };
}
/* ================================================== 2. THE LOWER STAGE === */
/*
 * Modern plant inside a listening gallery, one floor under the control ring.
 *
 * The room is Aurelian: Omega walls, Theta floor, and the grooves still in it.
 * Everything else has been carried down a stair in crates and bolted on top --
 * lab decking over the cut floor, a generator row against the north wall, a
 * header pipe along it, two racks of cradles, and a trench chopped through the
 * east side so the cable can go out to the array.
 *
 * The one image the room exists to deliver: THE CABLE GOES INTO THE WATER AND
 * DOES NOT COME BACK.
 *
 * This is also the floor the climax one storey up keeps naming. Tarin leaves
 * the control ring to get Meridian's own people off "the lower stage"; these
 * are those people, and `td_power_done` empties the room of every one of them
 * except the officer who would not leave the animals.
 */
function stage() {
  const g = grid(34, 26, 'Ω');

  rect(g, 2, 2, 31, 23, 'Θ');                 // the Aurelian gallery
  for (const x of [3, 30]) rect(g, x, 2, x, 23, '≡');   // its grooves, still there
  rect(g, 5, 6, 28, 21, ':');                 // Meridian decking over the top

  // Ways in and out.
  put(g, 16, 25, 'S'); put(g, 17, 25, 'S');   // down to the drowned approach
  rect(g, 16, 24, 17, 24, 'Θ');
  put(g, 16, 1, 'S'); put(g, 17, 1, 'S');     // up to the control ring
  rect(g, 16, 2, 17, 2, 'Θ');

  // The generator row and its header, hard against the north wall.
  for (const x of [6, 9, 12, 15, 18, 21, 24, 27]) put(g, x, 3, '³');
  rect(g, 5, 4, 28, 4, '±');

  // Rack one: the returns. Nine cradles, two of them still holding a ring that
  // came back off the sea floor and was not put out again.
  rect(g, 9, 7, 17, 7, 'Ξ');
  put(g, 9, 7, 'Φ'); put(g, 10, 7, 'Φ');
  // Rack two: cradles fifty-two to sixty. Empty, because they are all out there.
  rect(g, 9, 10, 17, 10, 'Ξ');

  // The bench, and the board over it.
  rect(g, 21, 8, 22, 8, '$');
  put(g, 23, 8, 'E');

  // The trench. Cut through the decking and through the east wall, so that the
  // cable can leave. It is the only water in the room and it is man-made.
  rect(g, 22, 14, 33, 16, 'W');
  rect(g, 22, 13, 31, 13, '╫');
  rect(g, 22, 17, 31, 17, '╫');
  rect(g, 20, 15, 21, 15, ':');               // the cable head, on the decking
  put(g, 20, 14, '¶'); put(g, 20, 16, '¶');

  // Stores, tanks and consoles.
  rect(g, 6, 12, 7, 12, '@');
  rect(g, 6, 19, 9, 19, '¾');
  put(g, 12, 19, '?'); rect(g, 13, 19, 14, 19, '+'); put(g, 15, 19, '?');
  rect(g, 25, 20, 27, 20, '¾');
  put(g, 11, 13, '?'); rect(g, 12, 13, 13, 13, '+');

  // The Foundation's own sick bay, walled off the west aisle with stacked
  // crates so that it reads as a place somebody made rather than a place that
  // was built. The officer who runs it stands in the mouth of it.
  put(g, 6, 14, '¾'); put(g, 7, 14, '¾');
  put(g, 6, 17, '¾'); put(g, 7, 17, '¾');
  put(g, 8, 15, '@'); put(g, 8, 16, '$');

  return {
    id: 'temple_deep_power_stage',
    name: 'Temple of the Deep',
    displayName: 'THE CROWN WORKS',
    music: 'station',
    battleBackdrop: 'cave',
    indoor: true,
    _plan: [
      'PROJECT ABYSS CROWN, INSTALLED. THE LOWER STAGE.',
      '',
      'In Act 4 the player stood in a basement in Aureline and read a rack of',
      'sixty cradles with fifty-one filled, nine standing empty at the end of the',
      'row with a card giving the date the last nine were due, and a board chalked',
      'FIND. WAKE. RING. HOLD with REQUIRES THE HEART under WAKE. That month is',
      'now. This room is the other end of the waybill: the crates that were',
      'stencilled for a harbour with no road are open and empty against the wall,',
      'the nine cradles are here, and they are empty because the rings are out',
      'there. Every sign in this room is written to be read by somebody who read',
      'that basement, and not one of them repeats it.',
      '',
      'THE ROOM IS AURELIAN AND THE PLANT IS NOT, AND THE JOIN IS THE POINT.',
      'Omega wall, Theta floor and the grooves still running down both long edges',
      'at x3 and x30 -- and over the middle of it, laid rather than built, a',
      'rectangle of laboratory decking with a generator row bolted to the north',
      'wall and a header pipe running the length of it. Nothing here was cut. It',
      'was carried down a stair.',
      '',
      'THE TRENCH IS THE IMAGE THE ROOM EXISTS FOR. Meridian have chopped a',
      'channel through their own decking and through the east wall at 22-33,14-16,',
      'railed both sides, and put the cable head on the deck at 20-21,15. The cable',
      'goes into the water and does not come back. It is the only water in the room',
      'and it is the only thing in the room that is not tidy.',
      '',
      'RACK ONE (9-17,7) IS THE RETURNS and holds two rings that came off the sea',
      'floor and were not sent out again; its sign gives the reason and the reason',
      'is the split ring in the Aureline basement said in one more sentence. RACK',
      'TWO (9-17,10) is cradles fifty-two to sixty, and it is empty.',
      '',
      'THIS IS "THE LOWER STAGE" THE CLIMAX ONE FLOOR UP KEEPS NAMING. The scene',
      'on the control ring (data/events/temple_deep_power.json, another author)',
      'has Meridian\'s own people stop working and start running, and Tarin leave',
      'the argument to go down and move them. These are those people. Every one of',
      'them carries hiddenIfFlag `td_power_done`, so once that scene has run this',
      'floor is empty -- except Officer Sennhal in the sick bay at 6,15, who stays,',
      'because what she is looking after cannot walk out on its own.',
      '',
      'NO TRAINERS ON THIS FLOOR, DELIBERATELY. The hardest battle in the game is',
      'one floor up and the player has been asked for four acts to be allowed an',
      'easier ride; a corridor of guards before the climax spends exactly the',
      'resources the climax needs. What the floor has instead is Sennhal, who heals',
      'the party as often as you like and does not ask who you are. That is the',
      'save point before the boss, dressed as the enemy being ordinary -- which is',
      'the whole of what CANON.md says about the people who work for Meridian.',
    ].join('\n'),
    rows: rows(g),
    warps: [
      { x: 16, y: 25, toMap: 'temple_deep_tunnels', toX: 14, toY: 2, facing: 'down', style: 'stairs' },
      { x: 17, y: 25, toMap: 'temple_deep_tunnels', toX: 15, toY: 2, facing: 'down', style: 'stairs' },
      { x: 16, y: 1, toMap: 'temple_deep_power', toX: 9, toY: 15, facing: 'up', style: 'stairs' },
      { x: 17, y: 1, toMap: 'temple_deep_power', toX: 10, toY: 15, facing: 'up', style: 'stairs' },
    ],
    npcs: [
      {
        id: 'tds_fitter',
        sprite: 'meridian_sci',
        x: 13, y: 11,
        facing: 'up',
        movement: { kind: 'static' },
        script: 'tds_fitter',
        hiddenIfFlag: 'td_power_done',
      },
      {
        id: 'tds_officer',
        sprite: 'meridian_sci_f',
        x: 6, y: 15,
        facing: 'right',
        movement: { kind: 'static' },
        script: 'tds_officer',
      },
      {
        id: 'tds_hand',
        sprite: 'meridian',
        x: 24, y: 19,
        facing: 'left',
        movement: { kind: 'static' },
        script: 'tds_hand',
        hiddenIfFlag: 'td_power_done',
      },
      {
        id: 'tds_young',
        sprite: 'meridian',
        x: 19, y: 12,
        facing: 'down',
        movement: { kind: 'static' },
        script: 'tds_young',
        hiddenIfFlag: 'td_power_done',
      },
    ],
    objects: [
      {
        kind: 'sign', x: 13, y: 7,
        text: [
          'RACK ONE. RETURNS. Two rings back off the floor and not sent out again.',
          'Both cards say the same thing, in the same hand, in the same six words.',
          'RING SOUND. WITHDRAWN ON SUBJECT RESPONSE.',
        ],
      },
      {
        kind: 'sign', x: 13, y: 10,
        text: [
          'RACK TWO. CRADLES 52-60. All nine standing open.',
          'In Aureline these nine were the ones that had not been made yet.',
          'They were made. They are out there.',
        ],
      },
      {
        kind: 'sign', x: 21, y: 8,
        text: [
          'The bench, and the same four words chalked on the board above it.',
          'FIND. WAKE. RING. HOLD. The first three have been struck through.',
          'HOLD has not been struck through. Under it, a tally, and it is climbing.',
        ],
      },
      {
        kind: 'sign', x: 20, y: 14,
        text: [
          'The cable head. Sixty conductors go in and one armoured trunk comes out.',
          'It runs down the trench, through the wall, and into the sea.',
          'Nothing on this floor tells you how far. The load sheet does not either.',
        ],
      },
      {
        kind: 'sign', x: 6, y: 3,
        text: [
          'A generator, and seven more like it down this wall.',
          'A card on the header gives the draw at full load, in plain figures.',
          'It is more current than the city of Aureline takes on a winter night.',
        ],
      },
      {
        kind: 'sign', x: 7, y: 19,
        text: [
          'Crates, opened, emptied and stacked flat against the wall.',
          'The stencil on every one of them still says SURVEY EQUIPMENT.',
          'The waybill nailed to the top one says sixty of the same thing.',
        ],
      },
      {
        kind: 'sign', x: 13, y: 19,
        text: [
          'A console cycling one trace, the way the one in Aureline was cycling it.',
          'It is the same reading. It is not the same shape any more.',
          'It used to rise and fall evenly. Now it goes up and it stays up.',
        ],
      },
      {
        kind: 'sign', x: 6, y: 12,
        text: [
          'Two tanks, a pallet of dry kit, and forty pairs of boots in rows.',
          'Somebody has chalked names above the pegs. Most of the pegs are empty.',
          'Whatever the people who work here are doing, they are all doing it now.',
        ],
      },
      {
        kind: 'sign', x: 26, y: 20,
        text: [
          'A crate that never got opened, addressed to the works and not the ship.',
          'CRADLE 61. SPARE. HOLD FOR INSTRUCTION.',
          'Somebody expected to need a sixty-first.',
        ],
      },
      {
        kind: 'sign', x: 1, y: 8,
        text: [
          'The Aurelian groove runs the length of this wall and out under the deck.',
          'The plating has been cut round it rather than over it.',
          'Somebody on this crew respected it enough to go the long way.',
        ],
      },
      {
        kind: 'sign', x: 7, y: 14,
        text: [
          'Four crates on end make three walls, and inside them somebody keeps a bay.',
          'Blankets, a bucket, a lamp, and a chalked list of names on the top crate.',
          'They are not people. They are Kin, and the list is in treatment order.',
        ],
      },
      { kind: 'item', x: 5, y: 21, item: 'full_restore', quantity: 1, flag: 'item_tds_stores' },
      { kind: 'hiddenItem', x: 29, y: 6, item: 'full_rouse', quantity: 1, flag: 'item_tds_corner' },
    ],
  };
}

/* =============================================== 3. THE CONTROL RING === */
/*
 * A steel disc dropped down an Aurelian shaft, with the sea round the edge of
 * it and a very long way underneath.
 *
 * THIS ROOM IS BUILT TO SOMEBODY ELSE'S NUMBERS ON PURPOSE. The climax of the
 * story is staged here by another author in data/events/temple_deep_power.json,
 * and that scene was written before the map existed. Its cast note names five
 * coordinates and asks whoever builds the map to agree with them, so this map
 * agrees with them rather than making them move:
 *
 *   9,15 and 10,15   the player arrives here, up the stair from the works
 *   10,7             VEYL, at the console in the centre of the ring
 *   17,3             KELL, at the master board, as far from him as the deck goes
 *   12,10            LYRA, between them and nearer her father
 *   9,13             TARIN, at the head of the stair, because he leaves down it
 *
 * All six of those tiles are open deck, none of them carries furniture, a rail
 * or a sign, and nothing this file places stands on any of them. The rail pass
 * below explicitly steps over them.
 */
function ring() {
  const CX = 11, CY = 8, RX = 9.6, RY = 7.2;
  const g = grid(24, 19, 'Ω');

  // The flooded shaft, clamped off the map border so the Aurelian stone still
  // shows all the way round the outside of it.
  for (let y = 1; y <= 17; y++) {
    for (let x = 1; x <= 22; x++) {
      const dx = (x - CX) / 10.9, dy = (y - CY) / 8.3;
      if (dx * dx + dy * dy <= 1) put(g, x, y, 'W');
    }
  }

  // The deck.
  disc(g, CX, CY, RX, RY, ':');

  // Every tile the climax stands somebody on, plus the two the player lands on
  // coming back down from the chamber. Nothing below is allowed to touch these.
  const KEEP = new Set(['10,7', '17,3', '12,10', '9,13', '9,15', '10,15', '11,1', '12,1']);

  // A rail round the lip. Painted on the outermost ring of the deck itself so
  // that it stands on plate rather than on open water, and stepped over where
  // the scene needs somebody to be standing.
  const edge = [];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (get(g, x, y) !== ':') continue;
      const open = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dy]) => get(g, x + dx, y + dy) !== ':' && get(g, x + dx, y + dy) !== '╫');
      if (open) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) if (!KEEP.has(`${x},${y}`)) put(g, x, y, '╫');

  // The stair down to the works, on a short gangway hung off the south lip.
  put(g, 9, 16, ':'); put(g, 10, 16, ':');
  put(g, 9, 17, 'S'); put(g, 10, 17, 'S');
  put(g, 8, 16, '╫'); put(g, 11, 16, '╫');
  put(g, 8, 17, '╫'); put(g, 11, 17, '╫');

  // The way on into the chamber, cut through the north wall of the shaft.
  put(g, 11, 0, 'S'); put(g, 12, 0, 'S');

  // The centre stack, and the master board at the far end.
  put(g, 10, 6, '?'); put(g, 9, 6, '+'); put(g, 11, 6, '+');
  put(g, 16, 3, '?');
  // Ring stations. Eight of the nine are out on the deck; the ninth is the
  // master board, which is why nobody at a station can shut the ring down.
  for (const [x, y] of [[6, 6], [5, 9], [7, 12], [14, 12], [17, 9], [15, 5], [13, 3], [8, 3]]) {
    if (!KEEP.has(`${x},${y}`) && get(g, x, y) === ':') put(g, x, y, '?');
  }
  // Two trunk risers coming up through the plate.
  put(g, 13, 8, '¶'); put(g, 8, 8, '¶');
  // Kit, lashed down.
  put(g, 18, 6, '¾'); put(g, 4, 12, '¾');

  return {
    id: 'temple_deep_power',
    name: 'Temple of the Deep',
    displayName: 'THE CONTROL RING',
    music: 'station',
    battleBackdrop: 'cave',
    indoor: true,
    _plan: [
      'THE CONTROL RING. Nine days of steel dropped down a three thousand year',
      'old shaft, with the sea round the edge of the plate and a very long way',
      'underneath it.',
      '',
      'THE CLIMAX OF THE STORY HAPPENS ON THIS DECK AND SOMEBODY ELSE WROTE IT.',
      'data/events/temple_deep_power.json (another author) runs Cassian using the',
      'Tideheart, Neravoss rising, the nine collars closing, Lyra reaching her',
      'father, Cassian breaking, Kell overriding him and the hardest battle in the',
      'game -- and it was written before this map existed. Its cast note lists the',
      'five coordinates it needs and asks the map author to agree with them, so',
      'this map agrees with them. Every one of these tiles is open plate with no',
      'furniture, no rail and no sign on it, and the rail pass in the generator',
      'steps over them by name:',
      '    9,15 / 10,15  the player, arriving up the stair from the works',
      '    10,7          VEYL, at the console in the centre of the ring',
      '    17,3          KELL, at the master board, the far end of the deck',
      '    12,10         LYRA, between them and nearer her father',
      '    9,13          TARIN, at the head of the stair he later leaves down',
      'IF THAT SCENE EVER MOVES ITS PEOPLE, MOVE THESE TILES, NOT THE SCENE.',
      '',
      'THE ROOM IS ONE SENTENCE: a steel disc in an Aurelian well. The shaft is',
      'stone and the water in it is the open sea; the plate is Foundation decking,',
      'railed all the way round its lip except where the scene needs somebody',
      'standing; the stair the player comes up is a gangway hung off the south of',
      'it, and the way on into the chamber is a hole cut through the north wall of',
      'the shaft. There is nothing Aurelian on the plate and nothing of Meridian\'s',
      'in the stone, and that is the whole of the design.',
      '',
      'NO `weather` FIELD ON THIS MAP, AND IT MUST STAY THAT WAY. Battle weather',
      'is read straight off map.weather, and the trainer note on td_kell measured',
      'rain at 1.5x on her Tide half and 0.5x against a Flame player -- twenty-six',
      'points off the win rate. The storm in the climax is text and it has to stay',
      'text. The same goes for an encounter table: there is none, and the water',
      'round the plate must never get one.',
      '',
      'THE RING HANDS ARE MINE AND THEY ARE NOT TRAINERS. Four of them, at four of',
      'the eight stations, and they are the "two of the nine ring hands look at',
      'Veyl" the scene narrates. They speak through data/dialogue/temple_deep_power',
      '.json rather than through an event script, so that nothing in this map',
      'needs a line in the file the climax lives in. All four carry an',
      '`ifFlags: td_power_done` variant, because a person who watched that happen',
      'does not say the same thing afterwards.',
    ].join('\n'),
    rows: rows(g),
    warps: [
      { x: 9, y: 17, toMap: 'temple_deep_power_stage', toX: 16, toY: 2, facing: 'down', style: 'stairs' },
      { x: 10, y: 17, toMap: 'temple_deep_power_stage', toX: 17, toY: 2, facing: 'down', style: 'stairs' },
      { x: 11, y: 0, toMap: 'temple_deep_heart', toX: 19, toY: 34, facing: 'up', style: 'stairs' },
      { x: 12, y: 0, toMap: 'temple_deep_heart', toX: 20, toY: 34, facing: 'up', style: 'stairs' },
    ],
    npcs: [
      {
        id: 'tdp_ring_a',
        sprite: 'meridian_sci',
        x: 6, y: 7,
        facing: 'up',
        movement: { kind: 'static' },
        script: 'tdp_ring_a',
      },
      {
        id: 'tdp_ring_b',
        sprite: 'meridian',
        x: 13, y: 4,
        facing: 'up',
        movement: { kind: 'static' },
        script: 'tdp_ring_b',
      },
      {
        id: 'tdp_ring_c',
        sprite: 'meridian_sci_f',
        x: 17, y: 10,
        facing: 'up',
        movement: { kind: 'static' },
        script: 'tdp_ring_c',
      },
      {
        id: 'tdp_ring_d',
        sprite: 'meridian',
        x: 7, y: 13,
        facing: 'up',
        movement: { kind: 'static' },
        script: 'tdp_ring_d',
      },
    ],
    objects: [
      {
        kind: 'sign', x: 10, y: 6,
        text: [
          'The console in the middle of the plate, and it is the newest thing here.',
          'One shaped hollow in the top of it, the size of a palm, lined in felt.',
          'Nothing else on this deck was built around an object that is not here.',
        ],
      },
      {
        kind: 'sign', x: 16, y: 3,
        text: [
          'The master board. Nine columns, numbered one to nine, all of them live.',
          'One key at the bottom of it, under a cover, labelled ALL STATIONS RELEASE.',
          'The cover has a seal on it and the seal has never been broken.',
        ],
      },
      {
        kind: 'sign', x: 13, y: 8,
        text: [
          'A trunk comes up through the plate, thick as a mast, and goes down again.',
          'There are sixty of these under this deck.',
          'They all go the same way, and the way is down.',
        ],
      },
      {
        kind: 'sign', x: 11, y: 15,
        text: [
          'Between the plate and the shaft wall there is a hand\'s width of nothing.',
          'Under the grating there is no floor at all.',
          'There is the sea, and it is a very long way down, and it is black.',
        ],
      },
      {
        kind: 'sign', x: 2, y: 8,
        text: [
          'The shaft wall, cut, dressed and grooved, going up past the lamps.',
          'Nine days of steel standing inside three thousand years of stone.',
          'Nobody has put a single bolt through the stone. They could not.',
        ],
      },
      {
        kind: 'sign', x: 18, y: 6,
        text: [
          'Kit lashed down with rope, the way you lash things down at sea.',
          'A tarpaulin, a stretcher, and two crates of dry clothes for forty people.',
          'Somebody here has thought properly about the night going wrong.',
        ],
      },
    ],
  };
}

/* ============================================ 3. THE LISTENING FLOOR === */
/*
 * The chamber. It is the last Aurelian room in the game and the biggest room
 * in the game, and everything about its geometry is an argument.
 *
 * A ROOM FOR LISTENING, NOT A ROOM FOR HOLDING. There is no gate on it, no
 * chain in it, no mechanism of Aurelian make anywhere in it. What there is:
 * three concentric arcs of cut stone seating, every one of them facing IN, and
 * eight grooves running from the seating down to the rim of a well of open
 * sea. Somebody sat here. A lot of somebodies sat here, at once, quietly, and
 * the only thing this building does is carry sound to the middle and back.
 *
 * That is the difference the brief asks to be visible, and it is visible
 * because the ONE thing in the room that is a restraint is not Aurelian: it is
 * a cable, laid down the middle of the floor from a hole in the north wall, on
 * decking, over the top of the seats it had to cross.
 */
function heart() {
  const CX = 19.5, CY = 17, RX = 17.6, RY = 14.6;
  const g = grid(40, 36, 'Ω');

  // The chamber.
  disc(g, CX, CY, RX, RY, 'Θ');

  /*
   * EIGHT GROOVES, AND THE DIAGONALS ARE TWO CELLS WIDE. This was twelve at one
   * cell and it was wrong on the screen, for a reason that is a property of the
   * tile rather than of the plan. The Aurelian groove is drawn as a channel with
   * a boss at the crossing (see aurVein in src/gfx/tileset.ts): a straight run
   * of them reads as one lit line, and a STAIRCASE of them -- which is what a
   * thirty-degree ray is on a tile grid -- reads as a row of separate plus
   * signs. Shot at 1x, twelve rays gave a floor sprinkled with stars instead of
   * a floor that everything runs down.
   *
   * So: four on the axes, which come out as clean channels, and four diagonals
   * painted with their east neighbour as well, which turns a staircase into a
   * band whose cells share an edge and therefore join. Eight is also simply
   * more legible than twelve at this radius.
   *
   * Drawn before the seating so the seating can stand on top of it.
   */
  for (let k = 0; k < 8; k++) {
    const deg = k * 45;
    const cardinal = k % 2 === 0;
    for (let t = 0.30; t <= 1.0; t += 0.015) {
      const [x, y] = polar(CX, CY, RX, RY, deg, t);
      if (get(g, x, y) === 'Θ') put(g, x, y, '≈');
      if (!cardinal && get(g, x + 1, y) === 'Θ') put(g, x + 1, y, '≈');
    }
  }

  /*
   * Three concentric arcs of seating, offset half a step from the grooves so
   * that every bench has a channel running away down either side of it.
   *
   * Three cells to a bench rather than one. A single seat on its own reads as a
   * crate somebody left; three in a row along the arc reads as seating, which
   * is the one thing this room has to say about itself.
   */
  for (const [t, run, gap] of [[0.93, 6, 4], [0.76, 5, 4], [0.60, 4, 4]]) {
    // Walk the arc half a degree at a time and keep the cells in the order the
    // walk found them, deduped. Successive cells then differ by one step, so a
    // slice of this list is a CONTIGUOUS curved bench rather than three stones
    // scattered near each other -- which is what an angular offset gives at the
    // east and west of an ellipse, where a few degrees is several rows.
    const cells = [];
    const seen = new Set();
    for (let deg = 0; deg < 360; deg += 0.5) {
      const [x, y] = polar(CX, CY, RX, RY, deg, t);
      const k = `${x},${y}`;
      if (seen.has(k)) continue;
      seen.add(k);
      cells.push([x, y]);
    }
    for (let i = 0; i < cells.length;) {
      for (let j = 0; j < run && i < cells.length; j++, i++) {
        const [x, y] = cells[i];
        // Plain floor only. A bench is allowed to stop where a channel crosses
        // its line -- that is what the aisles in a room like this ARE -- but a
        // channel is never allowed to be broken, because a broken channel is
        // the difference between a room everything runs down and a floor with
        // some marks on it.
        if (get(g, x, y) === 'Θ') put(g, x, y, 'Ξ');
      }
      i += gap;
    }
  }

  // The rim, and the well.
  disc(g, CX, CY - 0.5, 9.6, 8.0, 'θ');
  disc(g, CX, CY - 0.5, 8.4, 6.9, 'W');

  /*
   * A ring of live channel one cell outside the rim, so that every one of the
   * eight radial grooves runs into a continuous halo of light round the water
   * rather than petering out on bare stone.
   *
   * Painted last and only onto plain floor that already touches the glyph rim,
   * which is what keeps it exactly one cell thick, keeps it off the benches,
   * and lets it follow the ellipse without any arithmetic of its own. It is the
   * single strongest thing in the room at 1x: at the edge of the frame the
   * light stops being decoration on the floor and becomes the shape of the
   * hole in the middle of it.
   */
  const halo = [];
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (get(g, x, y) !== 'Θ') continue;
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .some(([dx, dy]) => get(g, x + dx, y + dy) === 'θ');
      if (touches) halo.push([x, y]);
    }
  }
  for (const [x, y] of halo) put(g, x, y, '≈');

  /*
   * THE APPROACH AISLE, and it is cut through the seating rather than round it.
   *
   * A room where people came to speak has a way in for them, and it goes to the
   * front. This clears the benches out of 16-23 between the passage mouth and
   * the rim -- seven cells wide, the width of the entrance and then some -- and
   * leaves the grooves in it alone, so the south channel still runs the length
   * of the aisle and into the halo.
   *
   * It is also the only piece of this room laid out for somebody else's use.
   * The climax puts several people in here at once and needs floor they can be
   * seen standing on at 1x; benches are solid, and an amphitheatre with no aisle
   * in it is a room with nowhere to stand.
   */
  for (let y = 24; y <= 31; y++) {
    for (let x = 16; x <= 23; x++) if (get(g, x, y) === 'Ξ') put(g, x, y, 'Θ');
  }

  // The way in, from the works: a short passage into the south of the chamber.
  rect(g, 18, 30, 21, 34, 'Θ');
  put(g, 19, 35, 'S'); put(g, 20, 35, 'S');
  rect(g, 19, 30, 20, 33, '≡');

  // Meridian's line, laid from a hole cut in the north wall to the rim of the
  // well: walkable decking on the west side, the armoured trunk on the east,
  // straight over anything that was in the way.
  for (let y = 1; y <= 9; y++) { put(g, 19, y, ':'); put(g, 20, y, '÷'); }
  put(g, 20, 9, '¶');
  put(g, 18, 9, '╫');
  // One board laid across the trunk, because a solid line from the wall to the
  // water would cut the north half of the chamber in two and strand anybody
  // staged on the wrong side of it.
  put(g, 20, 6, ':');

  return {
    id: 'temple_deep_heart',
    name: 'Temple of the Deep',
    displayName: 'THE LISTENING FLOOR',
    music: 'station',
    battleBackdrop: 'cave',
    indoor: true,
    _plan: [
      'THE CHAMBER. The biggest room in the game, and it is an argument.',
      '',
      'Forty by thirty-six. The camera is fifteen tiles tall at its most generous',
      'and ten at its least, so this room CANNOT be seen at once from anywhere in',
      'it. That is the whole trick and it is the only way this engine can say',
      'enormous: the player walks in at the bottom and the room keeps going.',
      '',
      'A ROOM FOR LISTENING, NOT A ROOM FOR HOLDING, AND THE DIFFERENCE IS VISIBLE.',
      'There is no gate on this chamber, no chain in it, and no Aurelian mechanism',
      'anywhere in it -- no rings, no plates, no shutters, nothing that shuts.',
      'What there is: three concentric arcs of cut stone seating, every seat facing',
      'IN, and eight grooves running from the back of the seating down to the rim',
      'of a well of open sea. People sat here. A great many people sat here at once,',
      'quietly, and the only thing this building does is carry sound to the middle',
      'and carry the answer back. Canon says the Aurelians built it to TALK to',
      'something. This is what that looks like in tiles.',
      '',
      'THE ONE RESTRAINT IN THE ROOM IS NOT AURELIAN. A hole has been cut through',
      'the north wall at 19-20,0-2 and a cable laid from it straight down the',
      'middle of the floor to the rim of the well -- walkable decking on the west',
      'side at x19, the armoured trunk on the east at x20, over the top of every',
      'groove and every seat that was in the way. It does not curve. It does not go',
      'round anything. Read the two halves of the room off each other and the whole',
      'of BOND VS CONTROL is on the screen without a word of dialogue.',
      '',
      'THE WELL IS OPEN SEA AND IT IS SWIMMABLE, AND THAT IS THE PAYOFF OF THE ART',
      'GRANTED TWO ROOMS SOUTH. Canon gives the climax four phases and the last of',
      'them is REACH IT. The player can only reach it because they learned to swim',
      'in the drowned approach, from the Hallkeeper who taught them to wade. Do not',
      'floor the well over. It is 180 tiles of collision 8, bounded by 12-27 and',
      '10-23, and it is the stage.',
      '',
      'STAGING FOR WHOEVER RUNS THE ENCOUNTER HERE, since this room is built for',
      'somebody else to use. All of it is walked and proved by',
      'tools/shots/tdlower.js; the generator refuses to write the map at all if',
      'anything on it has become unreachable.',
      '  - THE PLAYER ARRIVES AT 19,34 / 20,34, coming up from the control ring,',
      '    and walks a four-tile passage north into the chamber at 18-21,30.',
      '  - THE APPROACH AISLE, 16-23 by 24-31, is clear floor: the benches are cut',
      '    out of it on purpose and the only thing crossing it is the south groove',
      '    at x20. Eight wide by eight deep, which is room for six people to stand',
      '    and be told apart at 1x, with the rim at the top of it.',
      '  - THE RIM GALLERY is a continuous ring of glyph floor round the water and',
      '    can be walked the whole way round -- proved, not assumed. The cable head',
      '    at 18-20,9 is the only thing standing on it, and there is a gap at 19,9',
      '    so the ring is not cut.',
      '  - THE WELL is water. Anything that has to be enormous goes there, and the',
      '    player can swim out into the middle of it: 19,16 is reachable.',
      '  - THE SEATING AND THE WALL ARE SOLID, so nobody can be walked off the map',
      '    or pushed through the furniture.',
      '',
      'NOTHING IN THIS FILE STAGES THE ENCOUNTER, spawns anybody, or sets a story',
      'flag. Six signs, and every one of them is written to be read BEFORE anybody',
      'arrives -- they describe a room, not a situation, so they are still true',
      'afterwards.',
    ].join('\n'),
    rows: rows(g),
    warps: [
      { x: 19, y: 35, toMap: 'temple_deep_power', toX: 11, toY: 1, facing: 'down', style: 'stairs' },
      { x: 20, y: 35, toMap: 'temple_deep_power', toX: 12, toY: 1, facing: 'down', style: 'stairs' },
    ],
    npcs: [],
    objects: [
      {
        kind: 'sign', x: 17, y: 25,
        text: [
          'A seat, worn hollow. The one beside it is worn hollow. So is the next.',
          'There is no rail in front of them and no rail behind them.',
          'Nobody who sat here was being kept anywhere.',
        ],
      },
      {
        kind: 'sign', x: 11, y: 21,
        text: [
          'Eight grooves come down out of the seating and stop at the rim.',
          'They do not cross it. They do not go into the water.',
          'They stop, the way a person stops talking.',
        ],
      },
      {
        kind: 'sign', x: 20, y: 9,
        text: [
          'The cable comes through a hole in the wall and runs straight to the edge.',
          'It crosses four grooves and six benches and it does not step round one.',
          'It was laid by people who could not read what they were walking on.',
        ],
      },
      {
        kind: 'sign', x: 29, y: 15,
        text: [
          'The rim goes all the way round, and there is no wall on it.',
          'No lip, no rail, no gate, and nothing anywhere in this room that shuts.',
          'Three thousand years of people sat down at the edge of that.',
        ],
      },
      {
        kind: 'sign', x: 7, y: 15,
        text: [
          'You cannot see the far side of this room from here.',
          'You cannot hear yourself walk, either.',
          'Every sound you make goes out to the middle and comes back changed.',
        ],
      },
      {
        kind: 'sign', x: 17, y: 33,
        text: [
          'The passage floor carries two grooves and they run in ahead of you.',
          'Every groove in this building runs the same way.',
          'Nothing here was ever built to send anything out.',
        ],
      },
    ],
  };
}

/* ------------------------------------------------------------------ run */

write(tunnels());
write(stage());
write(ring());
write(heart());
