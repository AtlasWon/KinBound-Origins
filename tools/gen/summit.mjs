// Rebuilds the Caelora Summit -- the building at the top of the Ascent.
//
//   node tools/gen/summit.mjs data/maps
//
// IT OVERWRITES FOUR MAPS: the approach, the Threshold, the Last Room and the
// Wind Step. They are emitted from one file for the reason Crownspire's rooms
// are: the join that keeps breaking on this project is a door with a room
// behind it and nothing between them, and here the two halves of every pair
// are written a few lines apart and cannot drift.
//
// WHAT THIS FILE DOES NOT OWN, AND USED TO. The four Master chambers and the
// Champion's room were emitted here as shells until data/maps/summit_master_*
// landed from the build that owns those battles. Theirs are better than shells
// and the shells have been deleted rather than defended. What is left is the
// building around their chain: the door in the mountain, the hall where the
// eight Crests are read, the last warm room, and the one map their chain warps
// down into that nothing was providing.

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = process.argv[2] ?? 'data/maps';

const write = (m) => {
  const w = new Set(m.rows.map((r) => [...r].length));
  if (w.size !== 1) {
    for (const [i, r] of m.rows.entries()) {
      if ([...r].length !== [...m.rows[0]].length) console.log(`  row ${i}: ${[...r].length} | ${r}`);
    }
    throw new Error(`${m.id}: ragged rows ${[...w].join(',')}`);
  }
  writeFileSync(resolve(OUT, `${m.id}.json`), JSON.stringify(m, null, 2) + '\n');
  console.log(`${m.id}  ${[...m.rows[0]].length}x${m.rows.length}  warps:${m.warps.length} npcs:${m.npcs.length} objs:${m.objects.length}`);
};

const S = { kind: 'static' };
const L = { kind: 'lookAround' };
const npc = (id, sprite, x, y, facing, movement, script, extra = {}) =>
  ({ id, sprite, x, y, facing, movement, script, ...extra });
const sign = (x, y, text) => ({ kind: 'sign', x, y, text });
const hidden = (x, y, item, quantity, flag) => ({ kind: 'hiddenItem', x, y, item, quantity, flag });

/* ==================================================================== */
/* THE APPROACH                                                          */
/* ==================================================================== */
/*
 * Painted rather than typed. Twenty-six columns of snow with a road up the
 * middle of it is the one map in this set where a hand-counted row is a
 * ragged row waiting to happen, and the cairn field has to be placed by rule
 * anyway: the stones thicken toward the door, which is the entire argument
 * the approach makes, and a rule can be tuned where a hand-laid field cannot.
 */
const AW = 26;
const AH = 24;

const grid = Array.from({ length: AH }, () => Array.from({ length: AW }, () => '∴'));
const put = (x, y, ch) => { if (x >= 0 && x < AW && y >= 0 && y < AH) grid[y][x] = ch; };
const box = (x0, y0, x1, y1, ch) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, ch);
};

// The mountain above the door, and the front cut into it.
box(0, 0, AW - 1, 4, 'C');
box(0, 0, AW - 1, 0, 'c');
box(7, 3, 18, 4, 'Ħ');          // mountain granite, a metre thick
put(7, 3, 'Ĥ'); put(18, 3, 'Ĥ');   // the two lights either side
put(12, 4, 'Ď'); put(13, 4, 'Ď');  // the door

// The swept platform, widest at the door and tapering to the road.
for (let y = 5; y <= 12; y++) {
  const half = Math.max(2, 8 - Math.floor((y - 5) * 0.8));
  box(13 - half, y, 12 + half, y, '═');
}
// The road down out of the bottom of the map.
box(12, 12, 15, AH - 1, '∫');

// The drop, west: gorge, with the rope line standing between it and the road.
for (let y = 7; y < AH; y++) { put(0, y, '⊗'); put(1, y, '∋'); }
box(0, AH - 1, 11, AH - 1, '⊗');
box(16, AH - 1, AW - 1, AH - 1, '⊗');
// Scree rising to the east, and broken rock in the corners under the front.
for (let y = 5; y < 11; y++) for (let x = 0; x < AW; x++) {
  if (grid[y][x] !== '∴') continue;
  const dist = Math.min(x, AW - 1 - x);
  if (dist < 5 - Math.floor((y - 5) / 2)) grid[y][x] = '∇';
}
put(0, 5, '∆'); put(AW - 1, 5, '∆'); put(0, 6, '∆'); put(AW - 1, 6, '∆');
for (let y = 8; y < AH - 1; y++) put(AW - 1, y, '∇');

/*
 * THE FIELD. Everybody who comes up this road sets a stone, whether they go in
 * or turn round, and most of them turned round. The density is a function of
 * how close the door is, so the picture is a scatter at the bottom of the
 * screen and a crowd at the top -- which is the true shape of the thing, and
 * it is said in stone rather than in a box of dialogue.
 */
let seed = 90661;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
for (let y = 6; y < AH - 2; y++) {
  const near = Math.max(0, 1 - (y - 7) / 11);       // 1 at the platform, 0 at the road head
  for (let x = 2; x < AW - 1; x++) {
    if (grid[y][x] !== '∴') continue;
    if (rnd() < 0.05 + near * 0.45) grid[y][x] = '√';
  }
}
// A lane kept clear from the road head to the door, so the walk is never a maze.
for (let y = 5; y <= 13; y++) for (let x = 11; x <= 15; x++) {
  if (grid[y][x] === '√') grid[y][x] = y >= 13 ? '∫' : '═';
}
// The lamp line: one unbroken run of Frostmere's blue lanterns, road to door.
for (const [x, y] of [[10, 6], [15, 6], [10, 9], [15, 9], [11, 12], [16, 12], [11, 15], [16, 15], [11, 18], [16, 18]]) {
  put(x, y, 'Ł');
}
// Two benches on the platform, in the lee of the front, where people sit.
put(8, 7, '♦'); put(17, 7, '♦');
// The fire the wardens keep at the road head.
put(9, 16, 'Ę');

const approachRows = grid.map((r) => r.join(''));

write({
  id: 'summit_approach',
  name: 'The Summit Door',
  displayName: 'THE CAELORA SUMMIT',
  music: 'route_west',
  battleBackdrop: 'highland',
  indoor: false,
  regionPos: { x: 25, y: 5 },
  rows: approachRows,
  warps: [
    // DOWN THE ASCENT, through the Summit gate at the head of ascent_crown.
    { x: 12, y: AH - 1, toMap: 'ascent_crown', toX: 28, toY: 3, facing: 'down', style: 'edge' },
    { x: 13, y: AH - 1, toMap: 'ascent_crown', toX: 29, toY: 3, facing: 'down', style: 'edge' },
    { x: 14, y: AH - 1, toMap: 'ascent_crown', toX: 29, toY: 3, facing: 'down', style: 'edge' },
    { x: 15, y: AH - 1, toMap: 'ascent_crown', toX: 30, toY: 3, facing: 'down', style: 'edge' },
    // IN.
    { x: 12, y: 4, toMap: 'summit_hall', toX: 8, toY: 20, facing: 'up', style: 'door' },
    { x: 13, y: 4, toMap: 'summit_hall', toX: 9, toY: 20, facing: 'up', style: 'door' },
  ],
  npcs: [
    npc('sm_road_ward', 'hiker', 11, 17, 'right', S, 'sm_road_ward'),
    npc('sm_stone_keeper', 'elder', 10, 13, 'right', S, 'sm_stone_keeper'),
    npc('sm_turned_back', 'villager_m', 18, 14, 'left', S, 'sm_turned_back'),
    npc('sm_waiting_sister', 'villager_f', 17, 8, 'up', L, 'sm_waiting_sister'),
    npc('sm_porter', 'porter', 8, 8, 'right', S, 'sm_porter'),
    // THE RIVAL BUILD'S, PLACED HERE AT ITS OWN REQUEST. tarin_summit_gate in
    // data/events/common.json spawns a town_tarin at 15,5 while the beat is
    // open and goes completely silent once tarin_summit_won is set; the note on
    // that script asks the Summit build to fill exactly that window with a
    // permanent NPC, so the post-victory line survives a reload. The two gates
    // are complements, so the two Tarins can never both exist.
    npc('town_tarin', 'rival', 15, 5, 'left', S, 'tarin_summit', { requiresFlag: 'tarin_summit_won' }),
  ],
  objects: [
    sign(11, 4, [
      'Cut into the jamb, and it is the only thing written on the outside of this building:',
      'THIS IS THE DOOR. THERE IS NOT ANOTHER ONE.',
    ]),
    sign(14, 4, [
      'A slate beside the door, wiped every morning by whoever is on the platform.',
      'UP TODAY: 3.   DOWN TODAY: 2.',
      'Nobody rubs out the second number until the day is over.',
    ]),
    sign(6, 4, [
      'The platform. Swept twice a day in weather that fills it in twice a day.',
      'Under the snow it is dressed Crownspire granite, and it was carried up this road',
      'one block at a time by people who were never going to be allowed through the door.',
    ]),
    sign(18, 4, [
      'There is no tower here, and no banner, and nothing above the lintel but mountain.',
      'The city put four hundred spires up to be looked at.',
      'The thing the spires are about has no front at all.',
    ]),
    sign(7, 11, [
      'THE FIELD, and it is not the Great Cairn. The Cairn is at the gate four miles below,',
      'and every stone in it was carried up by somebody who was going in.',
      'This is the other kind. Nobody up here has ever confused the two.',
    ]),
    sign(17, 11, [
      'Nine hundred years of people who walked four miles up a mountain with somebody',
      'and then stood on this platform and watched a door shut.',
      'There are more stones in this field than there are names on the wall in Crownspire.',
    ]),
    sign(11, 18, [
      'THE HEAD OF THE ASCENT. Four miles up from the Crownspire gate, and the last',
      'quarter mile of it is this. The rope on your left is not decoration.',
    ]),
    sign(1, 12, [
      'The rope line, made off on posts sunk into the rock every four yards.',
      'It goes down the whole four miles. In ninety years it has been replaced eleven times',
      'and moved not once.',
    ]),
    hidden(20, 19, 'full_restore', 1, 'item_summit_field'),
    hidden(4, 9, 'full_rouse', 1, 'item_summit_scree'),
  ],
  _plan: 'THE BUILDING HAS NO FRONT, WHICH IS THE WHOLE PICTURE. There is nowhere on this ridge to stand a house up -- the wind takes it -- so nine hundred years ago they went into the rock instead, and everything the Summit is happens behind twelve tiles of mountain granite with one door in the middle of it. Crownspire below is four hundred spires built to be looked at; the thing the spires are about is a grey wall you could walk past. That inversion is the reason the approach is a wide-open outdoor map with almost nothing built on it: the eye has nothing to land on except the field, the lamps and the door.\n\nTHE CAIRN FIELD SAYS THE ODDS SO THAT NOBODY HAS TO SAY THEM. Everybody who comes up this road sets a stone. The field is painted by a rule rather than laid by hand -- density rises the closer you get to the door -- so the screen at the road head is a scatter and the screen at the platform is a crowd, and a player reads "most people stop here" off the ground before a single NPC opens their mouth. A five-column lane is cleared through it from the road to the platform so that the walk is never a maze.\n\nTHE TWO TILES IN FRONT OF THE DOOR ARE THE LAST RIVAL BATTLE, AND NOTHING HERE HAD TO CHANGE FOR IT. Row 4 is solid granite except for the door at 12,4 and 13,4, so 12,5 and 13,5 are the only tiles in Caelora from which the Summit can be entered -- and the rival build put tarin_summit_gate on exactly those two while this map was being drawn. The map was already shaped so that the way in is a doorstep somebody can sit on, and his spawn tile at 15,5 is swept platform with nothing on it.\n\nTHE LAMPS ARE THE ONE UNBROKEN LINE. Frostmere\'s blue lanterns, in pairs either side of the road, from the head of the Ascent to the platform. A run of them reads as one line rather than as ten lamps, and it is the only thing on this map that is trying to be seen.',
  _join: 'THE SEAM WITH THE ASCENT, AND THE HALF OF IT THAT IS NOT IN THIS FILE.\nDOWN: summit_approach 12..15,23 -> ascent_crown 28..30,3, the swept stone inside the Summit gate.\nUP, AND I PUT THIS INTO ascent_crown.json MYSELF BECAUSE NOBODY OWNED IT: ascent_crown 28,2 / 29,2 / 30,2 -- the three granite arch tiles in that map\'s north wall -- warp to summit_approach 13,22 / 14,22 / 14,22, facing up, style edge. IF ascent_crown.json IS REGENERATED THOSE THREE WARPS ARE LOST AND EVERY SUMMIT MAP BECOMES UNREACHABLE. Put them back. They are three lines and they are the whole of what the two builds owe each other.\nTHE STONES ARE DIVIDED ON PURPOSE. The Great Cairn at the gate below belongs to the challengers and is somebody else\'s map; the field on THIS map belongs to the people who walked four miles up with one of them and stopped at the door. Neither says the same thing as the other.',
});

/* ==================================================================== */
/* THE THRESHOLD                                                         */
/* ==================================================================== */

write({
  id: 'summit_hall',
  name: 'The Threshold',
  displayName: 'THE THRESHOLD',
  music: 'station',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    '▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪',
    '▪▪▪▪▪▪▪█ÅÅ█▪▪▪▪▪S▪',
    '▪════════════════▪',
    '▪k═══════════════▪',
    '▪k═══════════════◘',
    '▪k═══════════════▪',
    '▪════════════════▪',
    '▪════AA════AA════▪',
    '▪════EE════EE════▪',
    '▪═══KKK═KK═══════▪',
    '▪════════════════▪',
    '▪╫╫╫╫╫╫╫╫══╫╫╫╫╫╫▪',
    '▪════════════════▪',
    '▪▫▫══♦♦════♦♦══▫▫▪',
    '▪════════════════▪',
    '▪═══♦♦══════♦♦═══▪',
    '▪════════════════▪',
    '▪P══════════════P▪',
    '▪════════════════▪',
    '▪═══♦♦══════♦♦═══▪',
    '▪════════════════▪',
    '▪▪▪▪▪▪▪▪◘◘▪▪▪▪▪▪▪▪',
  ],
  warps: [
    { x: 8, y: 21, toMap: 'summit_approach', toX: 12, toY: 5, facing: 'down', style: 'door' },
    { x: 9, y: 21, toMap: 'summit_approach', toX: 13, toY: 5, facing: 'down', style: 'door' },
    { x: 17, y: 4, toMap: 'summit_muster', toX: 1, toY: 12, facing: 'right', style: 'door' },
  ],
  npcs: [
    npc('sm_registrar', 'concord', 7, 9, 'down', S, 'sm_registrar'),
    npc('sm_seal_keeper', 'elder', 8, 2, 'down', S, 'sm_seal_keeper'),
    npc('sm_hall_usher', 'clerk', 3, 6, 'down', S, 'sm_hall_usher'),
    npc('sm_hall_steward', 'porter', 16, 1, 'down', S, 'sm_hall_steward'),
    npc('sm_hall_gallery_old', 'elder', 4, 12, 'up', S, 'sm_hall_gallery_old'),
    npc('sm_hall_gallery_kid', 'kid', 12, 12, 'up', L, 'sm_hall_gallery_kid'),
    npc('sm_hall_gallery_pair', 'villager_f', 6, 16, 'up', S, 'sm_hall_gallery_pair'),
    npc('sm_hall_mason', 'villager_m', 14, 18, 'left', L, 'sm_hall_mason'),
  ],
  objects: [
    sign(7, 1, [
      'The west jamb of the Seal. Four recesses cut into it, in a column, sized to a Crest.',
      'BRIARBELL. STONEWAKE. TIDEGLASS. EMBERFALL.',
    ]),
    sign(10, 1, [
      'The east jamb. Four more, and the top one has frost on it that never comes off.',
      'MIREHAVEN. FROSTMERE. SKYREACH. CROWNSPIRE.',
      'The eight recesses ARE the lock. There is nothing else holding this door.',
    ]),
    sign(0, 2, [
      'THE SEAL. A slab of the mountain, hung so well that one person moves it.',
      'Cut across it, in letters a hand deep:',
      'IT SHUTS SO THAT NOBODY BEHIND YOU HAS TO WATCH.',
    ]),
    sign(1, 3, [
      'THE LEDGER. One line a climb, since the year the road was cut.',
      'Name, date, weather, and the number of the last door you opened.',
      'It does not record who won. Nine hundred years and it has never recorded that.',
    ]),
    sign(1, 5, [
      'The two numbers the Summit keeps, painted on a board and repainted every spring.',
      'FOUR THOUSAND ONE HUNDRED AND NINE HAVE STOOD IN THIS HALL.',
      'ONE HUNDRED AND NINE HAVE OPENED THE FOURTH DOOR.',
    ]),
    sign(17, 1, [
      'THE STEWARDS\' STAIR. It runs the whole height of the building outside the chambers.',
      'It is how the water goes up and how the firewood goes up.',
      'It is also how people come down, and it is wide enough for two to carry a third.',
    ]),
    sign(2, 11, [
      'THE RAIL. Brass, waist high, with a gap in it a yard wide and no gate in the gap.',
      'In nine hundred and six years nobody has put one there and nobody has needed to.',
    ]),
    sign(14, 11, [
      'The gallery ends at the rail and the building goes quiet on the other side of it.',
      'Whatever happens up those stairs, it happens where the people who love you cannot see.',
      'The Summit decided that early and has never once been talked out of it.',
    ]),
    sign(1, 13, [
      'The two south lights, and the only windows in the building that face down the road.',
      'People at this end of the hall spend the whole day looking out of them',
      'and the whole day pretending they are not.',
    ]),
    sign(16, 13, [
      'A bench with nine hundred years of initials in the underside of it.',
      'The Summit has scraped it twice. Both times it filled up again inside a year.',
      'It has not been scraped since 1804.',
    ]),
    sign(1, 17, [
      'THE DAY BOARD. Chalk, wiped at dusk, and the only thing in this hall anybody looks at.',
      'A runner comes down the stewards\' stair when a door opens and writes it up.',
      'Today: four names, three of them already crossed through.',
    ]),
    sign(16, 17, [
      'A card nailed to the wall in a hand nobody has ever identified.',
      'THE PEOPLE ON THAT BOARD ARE NOT LOSING. THEY ARE STILL UP THERE.',
    ]),
    hidden(2, 20, 'full_heal', 2, 'item_summit_hall'),
  ],
  _plan: 'THE RAIL IS THE BUILDING\'S WHOLE ARGUMENT AND IT IS ONE ROW OF TILES. Waist-high brass across the full width at y11, with a two-tile gap in it and nothing standing in the gap. Everything south of it is public: benches, windows down the road, families, a day board, a child. Everything north of it is the climb: the ledger, the registrar\'s desk, the Seal. Nine hundred years of an institution that lets anybody in as far as the rail and then takes the challenger somewhere nobody can watch them fail. A player walks the length of that floor before they ever reach the desk, which is the point -- the gallery is the last crowd they will see.\n\nTHE SEAL HAS EIGHT RECESSES CUT INTO ITS JAMBS AND THEY ARE THE LOCK. Four Halls a side, in the order the player met them, and the check-in scene actually puts the Crests in them. It is a mechanism rather than a ceremony: the door needs to SEE eight, once, and then it gives them back.\n\nTHERE IS NOT A LOCK IN THIS BUILDING AND THERE HAS NEVER NEEDED TO BE ONE. Every door in the Summit has a person standing in front of it instead, and the first of them is the Seal Keeper at 8,2. The slab at 8,1 and 9,1 is solid terrain with no warp on it, so talking to her IS the door; she cannot be walked round because there is nothing to walk round. The four Master chambers above arrived at the same answer independently -- see the _plan on summit_master_power -- which is a good sign that it is the right one for this building.\n\nEIGHTEEN WIDE, LIKE THE EIGHTH HALL BELOW IT. The screen is fifteen tiles across, so eighteen puts both side walls within sight of the middle of the floor and keeps the rail readable end to end.',
});

/* ==================================================================== */
/* THE LAST ROOM                                                         */
/* ==================================================================== */

write({
  id: 'summit_muster',
  name: 'The Last Room',
  displayName: 'THE LAST ROOM',
  music: 'town_indoor',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    '▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪',
    '▪▫▫ffffffffff▫▫▪',
    '▪ffffffffffffff▪',
    '▪beffffĘfffffbe▪',
    '▪ffffffffffffff▪',
    '▪beffffffffffbe▪',
    '▪ffffffffffffff▪',
    '▪beffAAAAffffbe▪',
    '▪ffffEEEEffffff▪',
    '▪ffffffffffffff▪',
    '▪kkffffffffffKK▪',
    '▪ffffffffffffff▪',
    '◘ffffffffffffff▪',
    '▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪',
  ],
  warps: [
    { x: 0, y: 12, toMap: 'summit_hall', toX: 16, toY: 4, facing: 'left', style: 'door' },
  ],
  npcs: [
    npc('sm_muster_keeper', 'healer', 6, 9, 'down', S, 'sm_muster_keeper'),
    npc('sm_muster_case', 'clerk', 13, 11, 'up', S, 'sm_muster_case'),
    npc('sm_muster_steward', 'elder', 2, 9, 'right', S, 'sm_muster_steward'),
    npc('sm_muster_climber', 'hiker', 11, 6, 'left', L, 'sm_muster_climber'),
  ],
  objects: [
    sign(7, 3, [
      'The only fire in the building that is kept in all year, and the only warm room.',
      'Everything above this floor is mountain, and mountain is the temperature it is.',
    ]),
    sign(0, 4, [
      'Six beds, made up, in a room that has never had six people in it at once.',
      'The Summit keeps six because it kept six in 1140 and nobody has proposed a change.',
    ]),
    sign(15, 4, [
      'THE WALL. Everybody who has gone up from this room has written one line on it first.',
      'Nine hundred years of one lines, in eleven layers of whitewash, going up to the roof.',
    ]),
    sign(15, 6, [
      'Three of them, at eye height, where somebody has scraped the whitewash back:',
      'I AM ONLY DOING THIS ONCE.   MY MOTHER SAID NOT TO.   TELL HER I ATE SOMETHING.',
    ]),
    sign(0, 9, [
      'Lower down, near the skirting, where you would have to kneel to write it:',
      'I DID NOT COME HERE TO WIN. I CAME HERE TO SEE HOW FAR IT WAS.',
      'Nobody has ever painted over that one and the whitewash goes round it.',
    ]),
    sign(1, 10, [
      'THE STANDING ORDER, framed, in the first Masters\' own hand and nine hundred years old.',
      'NOBODY GOES UP THE NEXT STAIR WORSE OFF THAN THEY CAME UP THE LAST ONE.',
      'AND A CHALLENGER WHO GOES DOWN IS CARRIED TO THE LAST LANDING THEY PASSED.',
    ]),
    sign(15, 11, [
      'THE CASE. Nine hundred years of people changing their minds at the last minute.',
      'The clerk has seen every one of those changes of mind and has never once had an opinion.',
    ]),
    sign(15, 2, [
      'A boot scraper, a coat hook, and a card over the hook.',
      'YOU WILL WANT YOUR COAT. IT IS COLDER UP THERE THAN IT IS OUTSIDE.',
    ]),
    hidden(4, 4, 'rouse', 1, 'item_summit_muster'),
  ],
  _plan: 'THE ONLY WARM ROOM, AND THE LAST ONE. Everything above this floor is cut into a mountain and is the temperature a mountain is; this room has a fire, six beds, a kettle, a case to swap kin out of and a keeper who will put a party back together for nothing. It is a Kin Clinic that has been in the same room since 1140 and has never called itself one.\n\nIT IS ALSO THE DIFFICULTY VALVE, AND THAT IS DELIBERATE. The player has asked four times for an easier game and the five hardest Trainer battles in the game are through the door at the other end of the hall. So the Last Room heals, sets the respawn, holds the box and hands over a small kit the first time; the Wind Step above it does the same and moves the respawn up to the first Master\'s own door; and every chamber above THAT restores the party as well, which is the Masters\' build and not this one. Three separate hands arrived at the same answer without conferring. The Summit\'s standing order is framed on the wall in here so that the mechanic and the fiction are one sentence.\n\nTHE WALL IS THE ROOM. Nine hundred years of people writing one line before they go up, in eleven layers of whitewash. Three signs quote six of them and none of the six is brave. That is the whole characterisation this room needs and it costs nothing.',
});

/* ==================================================================== */
/* THE WIND STEP                                                         */
/* ==================================================================== */
/*
 * THE MAP THE MASTERS' BUILD IS BLOCKED ON, AND THE ONE PIECE OF THE CLIMB
 * THAT IS STILL THIS BUILD'S.
 *
 * data/maps/summit_master_power.json warps down to "summit_ascent" 9,1 and
 * nothing was providing it. This is that map. The four chambers, the Champion's
 * room and the doors between them belong to the Masters and Champion builds --
 * they landed while this one was being written, they are better than shells,
 * and the four shells this file used to emit were duplicates of them and have
 * been deleted rather than defended.
 *
 * WHAT IS LEFT IS WORTH MORE THAN THE SHELLS WERE. The stair out of the Seal
 * does not go up inside the rock. It comes out on a notch cut clean through the
 * ridge, in the open, with the whole region under it -- and the first Master's
 * door is on the far side of it. So the shape of the Summit is: a cold hall, a
 * warm room, a slab that shuts, one minute of sky, and then five doors and no
 * more weather. That minute of sky is the last thing the player sees before the
 * building closes over them, and it is where their friend is standing.
 */

const WW = 19;
const WH = 20;
const w = Array.from({ length: WH }, () => Array.from({ length: WW }, () => 'C'));
const wput = (x, y, ch) => { if (x >= 0 && x < WW && y >= 0 && y < WH) w[y][x] = ch; };
const wbox = (x0, y0, x1, y1, ch) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) wput(x, y, ch);
};

// The first Master's front, across the top, in the same granite as their rooms.
wbox(0, 0, WW - 1, 0, 'Ħ');
wput(1, 0, 'Ĥ'); wput(17, 0, 'Ĥ');
wput(9, 0, 'Ď');
// The swept forecourt in front of it, tapering down onto the shelf.
wbox(5, 1, 13, 1, '═');
wbox(4, 2, 14, 2, '═');
wbox(4, 3, 14, 3, '═');
wput(5, 3, 'Ł'); wput(13, 3, 'Ł');
// The shelf: open snow between the rock and the drop.
wbox(3, 4, 15, 4, '∴');
wbox(3, 5, 15, 5, '∴');
wbox(4, 6, 14, 6, '∴');
// THE NARROWS. One tile, and it is the reason this map has a shape at all:
// everybody who goes up crosses 9,7, so anybody standing in column 9 above it
// meets every player without exception and without a script.
wput(9, 7, '∴');
wput(8, 7, '∆'); wput(10, 7, '∆');
wbox(4, 8, 14, 8, '∴');
wbox(3, 9, 15, 9, '∴');
wbox(3, 10, 15, 10, '∴');
wbox(3, 11, 15, 11, '∴');
wbox(4, 12, 14, 12, '∴');
// The drop, east, with the rope line standing between it and the shelf.
for (let y = 4; y <= 12; y++) { wput(16, y, '∋'); wput(17, y, '⊗'); wput(18, y, '⊗'); }
// Cairns on the shelf, set by challengers in the last minute of open air.
for (const [x, y] of [[4, 5], [14, 6], [5, 9], [13, 10], [6, 11], [12, 12]]) wput(x, y, '√');
// The stair mouth: a short covered flight out of the mountain.
wbox(6, 13, 12, 13, '═');
wbox(6, 14, 12, 14, '═');
wbox(6, 15, 12, 15, '═');
wbox(2, 16, 12, 16, '═');
wput(4, 15, 'Ę');
// The bottom wall: the Seal from the inside, and the stewards' door beside it.
wbox(0, 17, WW - 1, 17, 'Ħ');
wput(7, 17, '█'); wput(8, 17, 'Å'); wput(9, 17, 'Å'); wput(10, 17, '█');
wput(2, 17, 'Ď');

write({
  id: 'summit_ascent',
  name: 'The Wind Step',
  displayName: 'THE WIND STEP',
  music: 'route_west',
  battleBackdrop: 'highland',
  indoor: false,
  rows: w.map((r) => r.join('')),
  warps: [
    { x: 9, y: 0, toMap: 'summit_master_power', toX: 9, toY: 13, facing: 'up', style: 'door' },
    { x: 2, y: 17, toMap: 'summit_hall', toX: 16, toY: 2, facing: 'down', style: 'stairs' },
  ],
  npcs: [
    npc('sm_stair_steward', 'porter', 4, 16, 'right', S, 'sm_stair_steward'),
  ],
  objects: [
    sign(8, 0, [
      'The first of the five doors, and the lintel over it has a number cut into it.',
      'FIVE. They count down as you go up, so that the last one you open says ONE.',
    ]),
    sign(10, 0, [
      'A bucket of grit by the jamb, a bootscraper, and a card wired over both of them.',
      'GO IN CLEAN. SOMEBODY LIVES IN THERE.',
    ]),
    sign(7, 17, [
      'The Seal, from this side. It is flush with the rock and there is no handle on it.',
      'The sentence cut across the front of it is on the front of it.',
      'Nobody up here has ever been able to read it and that is not an accident.',
    ]),
    sign(3, 17, [
      'A low door beside the Seal, with a card wired to the frame in a steward\'s hand.',
      'THE STEWARDS\' STAIR. NOT LOCKED. NEVER HAS BEEN.',
      'It comes out behind the rail in the Threshold, which is the whole point of it.',
    ]),
    sign(8, 7, [
      'THE NARROWS. The notch pinches to one person wide and the rock is polished',
      'to a shine on both sides at shoulder height.',
      'Nine hundred years of people going through sideways, and not one of them alone.',
    ]),
    sign(16, 9, [
      'Caelora, under you, in one look. Sea on three sides of it and cloud on the fourth.',
      'Hearthmere is in there somewhere and is far too small to find.',
    ]),
    sign(16, 11, [
      'The rope line ends at this post. It has come four and a half miles up from the city gate.',
      'There is nothing past it to hold and the wardens have never pretended otherwise.',
    ]),
    sign(5, 9, [
      'Stones on the shelf, a few dozen, and they are the third heap on this mountain.',
      'The Great Cairn at the gate is everybody who set out. The field at the platform',
      'is the people who came up with them. These were set here, in the last of the open air.',
    ]),
    hidden(14, 4, 'full_restore', 1, 'item_summit_windstep'),
  ],
  _plan: 'THE STAIR OUT OF THE SEAL DOES NOT GO UP INSIDE THE ROCK. It comes out on a notch cut clean through the ridge, in the open, with the whole region under it, and the first Master\'s door is on the far side of it. That gives the Summit its shape: a cold hall, a warm room, a slab that shuts, one minute of sky, and then five doors and no more weather. Nineteen wide to match the Masters\' rooms above it, so the granite front at the top of this map and the granite wall of the room behind it are the same wall.\n\nTHE NARROWS AT 9,7 IS THE WHOLE GEOMETRY. One walkable tile with rock either side, and every player who goes up crosses it. Anything standing in column 9 above it meets every player without exception, without a script and without a gate -- which is how this build has handled every door in the Summit, because there is not a lock anywhere in the place.\n\nIT HEALS AND IT SETS THE RESPAWN -- see data/events/summit_ascent.json. The player has asked four times for an easier game and this is the last tile before four Summit Masters and a Champion. A loss up there wakes here, one door below the first of them, rather than four miles down a mountain.\n\nTHE STONES ARE THE THIRD HEAP AND THE SMALLEST. The Great Cairn at the city gate is everybody who ever set out; the field at the Summit platform belongs to the people who walked four miles up with one of them and stopped at the door; these two dozen were set by challengers up here, in the last minute of open air. Three heaps, three meanings, and nobody in Caelora has ever mixed them up.',
  _join: 'THIS MAP EXISTS BECAUSE summit_master_power.json WARPS DOWN TO "summit_ascent" 9,1 AND NOTHING WAS PROVIDING IT.\nUP: summit_ascent 9,0 -> summit_master_power 9,13, style door. DOWN, from their side: summit_master_power 9,14 -> summit_ascent 9,1, already written, and 9,1 here is swept stone.\nOUT OF THE CLIMB: summit_ascent 2,17 -> summit_hall 16,2, the head of the stewards\' stair behind the gallery rail, style stairs so it needs no return warp. The Seal at 8,17 and 9,17 is solid, carries no warp, and is not the way back. That is deliberate and the whole Threshold is built around it.\nIN, FROM THE THRESHOLD: there is no map warp at all. The Seal Keeper at summit_hall 8,2 warps the player to 9,16 -- see sm_seal_keeper in data/events/summit_hall.json. She is the door, the same way every Master is the door of their own room.\nTHE NARROWS AT 9,7 IS EMPTY AND IS OFFERED. Tarin\'s last battle went to the two tiles below the Summit door on summit_approach -- tarin_summit_gate in data/events/common.json -- which is a better place for it than this one and needed nothing from this build. What 9,7 is still good for is a single person standing in column 9 above it: one walkable tile with rock either side, so a downward sight range from 9,6 or 9,5 meets every player who ever goes up, with no flag and no script. If nobody wants it, it is a nice place to be alone in for eight tiles, which is also what it is for.',
});
