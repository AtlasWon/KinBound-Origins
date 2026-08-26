// Rebuilds data/maps/crownspire.json from scratch.
//
//   node tools/gen/crownspire.mjs data/maps/crownspire.json
//
// IT OVERWRITES THE MAP. Small changes since should be made in the JSON as
// usual and this left alone; if it is ever run again, diff the result before
// keeping it. The checks at the bottom are the valuable part whatever you do
// with the top: every solid thing is stood up one at a time and the whole map
// is then flooded from the west gate with all thirty-six townspeople on their
// feet, because a person is a solid object and one of them in an alley turns
// the alley into a room with no way in.
/**
 * Crownspire, generated.
 *
 * The map is composed rather than typed. At 96x66 the warp coordinates have
 * to be exact and a hand-typed grid drifts by a column somewhere around row
 * forty; here every door stamps its own coordinate as it is drawn, so the
 * warp list is derived from the picture instead of agreeing with it.
 */
import { writeFileSync } from 'node:fs';

const W = 96, H = 66;
const g = Array.from({ length: H }, () => Array(W).fill('░'));

const put = (x, y, ch) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch; };
const rect = (x0, y0, x1, y1, ch) => {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, ch);
};
const row = (x0, y, s) => { for (let i = 0; i < s.length; i++) put(x0 + i, y, s[i]); };

const ROOFS = { tile: ['[', '^', ']'], slate: ['<', '%', '>'], moss: ['(', '&', ')'] };
const roofRow = (w, kind) => {
  const [l, m, r] = ROOFS[kind];
  return w === 1 ? m : l + m.repeat(Math.max(0, w - 2)) + r;
};

/**
 * A granite range: roof, storeys of ashlar and sash, then a ground floor
 * whose only opening is the arch. Five rows, everywhere, because Crownspire
 * is three storeys in its poorest street and the height is the thing that
 * says this was never a village that got lucky.
 */
function range(x, y, w, h, kind, doors, seed = 1) {
  row(x, y, roofRow(w, kind));
  for (let ry = 1; ry < h; ry++) {
    let s = '';
    for (let i = 0; i < w; i++) {
      const n = (i * 7 + ry * 13 + seed * 31) % 5;
      s += (ry === h - 1) ? '▪' : (n < 2 ? '▫' : '▪');
    }
    row(x, y + ry, s);
  }
  const out = [];
  for (const d of doors ?? []) { put(x + d, y + h - 1, '◘'); out.push({ x: x + d, y: y + h - 1 }); }
  return out;
}

/* ------------------------------------------------------------------ shell */

rect(0, 0, W - 1, 1, 'c');
rect(0, 2, W - 1, 4, 'C');
rect(0, 5, 3, 61, '▪');
rect(92, 5, 95, 61, '▪');
rect(0, 62, W - 1, 63, '▪');
rect(0, 64, W - 1, 65, 'T');

/* --- the Ascent gate, which is shut -------------------------------------- */
rect(43, 2, 52, 4, '▪');
row(43, 2, '▪▫▪▪▪▪▪▪▫▪');
row(43, 3, '▪▫▪▪▪▪▪▪▫▪');
// The gateway itself is a real arch and the player can stand in it. A gate that
// is only ever a wall with a rail in front of it is an invisible wall wearing a
// hat; this one you walk into, and the way on is the mountain.
row(46, 4, '◘◘◘◘');

/* --- the Crown Terrace ---------------------------------------------------- */
rect(4, 5, 91, 18, '═');
// The forecourt is a court, not an apron: the terrace's far corners are solid
// mass, so the ground in front of the shut gate is forty-six columns and not
// eighty-eight, and the eye has somewhere to stop.
rect(4, 5, 24, 7, '▪');
rect(71, 5, 91, 7, '▪');
row(43, 5, '╫╫◆══════');
row(50, 5, '◆╫╫');
put(42, 5, '´'); put(53, 5, '´');
// The gate forecourt: a parade ground for a climb that is not forming up,
// lined with the figures of the people who did.
for (const x of [27, 31, 35, 39, 57, 61, 65, 69]) put(x, 5, '◆');
for (const x of [29, 37, 59, 67]) put(x, 6, '☼');
for (const x of [26, 33, 63, 70]) put(x, 7, '♦');
for (const x of [30, 40, 56, 66]) put(x, 7, '♣');

// The Roll. Two leaves of dressed wall either side of the Hall, and the names
// are on them. No windows: a memorial does not look out.
rect(6, 9, 30, 14, '▪');
rect(65, 9, 89, 14, '▪');

// The Eighth Hall. Eight rows, and the tallest built thing in Caelora.
const hallDoors = range(34, 8, 28, 8, 'tile', [13, 14], 3);

for (const x of [8, 13, 18, 23, 28]) put(x, 15, '◆');
for (const x of [67, 72, 77, 82, 87]) put(x, 15, '◆');
put(45, 16, '◆'); put(50, 16, '◆');
for (const x of [10, 20, 26, 32, 63, 69, 79, 85]) put(x, 17, '☼');
for (const x of [16, 24, 71, 83]) put(x, 18, '♦');
put(43, 16, '´');

/* --- the Crown Stair ------------------------------------------------------ */
rect(4, 19, 91, 20, '▪');
// The Crown Stair. Pale flags and an iron rail down each side, not the timber
// flight the stair tile draws -- the 1x walk found a wooden staircase standing
// in the middle of a granite terrace, which is the one material this city does
// not use anywhere.
rect(44, 19, 51, 20, '═');
for (const y of [18, 19, 20]) { put(43, y, '╫'); put(52, y, '╫'); }

/* --- Crown Plaza ---------------------------------------------------------- */
rect(4, 21, 91, 31, '░');
for (const x of [10, 16, 22, 28, 34]) put(x, 27, '◆');
for (const x of [61, 67, 73, 79, 85]) put(x, 27, '◆');
for (const x of [13, 19, 25, 31, 64, 70, 76, 82]) put(x, 29, '☼');
for (const x of [12, 24, 36, 60, 72, 84]) put(x, 31, '♦');
for (const x of [7, 21, 39, 56, 74, 88]) put(x, 30, '♣');
for (const x of [8, 20, 32, 62, 74, 86]) put(x, 28, '☼');

const archiveDoors = range(5, 21, 15, 5, 'moss', [7], 5);
const musterDoors = range(76, 21, 15, 5, 'slate', [7], 7);
put(11, 26, '´'); put(84, 26, '´');

// The ceremonial way. The plan of the whole city reads off the colour of the
// ground: pale flags run from the foot of the Crown Stair to the head of
// Kingsbridge, and everything else in the plaza is the cobble a cart uses.
rect(42, 21, 53, 31, '═');
rect(45, 25, 50, 27, '○');
// Lined, because a twelve-column avenue of pale flags with nothing standing on
// it is a runway. Drawn AFTER the flags: the first pass laid the furniture
// first and the avenue swallowed all six pieces of it.
for (const y of [23, 29]) { put(42, y, '☼'); put(53, y, '☼'); }
for (const y of [22, 30]) { put(43, y, '◆'); put(52, y, '◆'); }

/**
 * A hedged garden compartment. The plaza is a hundred and ten thousand square
 * feet of stone and the two blank halves of it were the fault the capital
 * found in itself from a plan view -- lawn, clipped walls and a gravel walk
 * are what stop a memorial ground reading as a car park with statues on it.
 */
function garden(x0, x1, y0, y1, figures) {
  rect(x0, y0, x1, y1, '.');
  for (let x = x0; x <= x1; x++) { put(x, y0, '♠'); put(x, y1, '♠'); }
  for (let y = y0; y <= y1; y++) { put(x0, y, '♠'); put(x1, y, '♠'); }
  const mid = Math.floor((x0 + x1) / 2);
  for (let y = y0; y <= y1; y++) put(mid, y, '▒');
  put(mid, y0, '▒'); put(mid, y1, '▒');
  for (const f of figures) put(f, y0 + 1, '◆');
  for (let x = x0 + 2; x < x1 - 1; x += 5) put(x, y1 - 1, '*');
}
garden(23, 39, 21, 25, [27, 35]);
garden(56, 72, 21, 25, [60, 68]);

/* --- the ravine ----------------------------------------------------------- */
const BRIDGES = [[13, 16], [44, 51], [77, 80]];
const onBridge = (x) => BRIDGES.some(([a, b]) => x >= a && x <= b);
rect(4, 33, 91, 35, 'W');
// The three spans are stone, and railed. The bridge tile draws a plank deck,
// which put the only timber in Crownspire across a six-hundred-year-old span;
// pale flags between two iron rails read as a bridge and as this city's.
for (const [a, b] of BRIDGES) {
  rect(a, 33, b, 35, '═');
  for (let y = 33; y <= 35; y++) { put(a, y, '╫'); put(b, y, '╫'); }
}
for (let x = 4; x <= 91; x++) if (!onBridge(x)) { put(x, 32, '╫'); put(x, 36, '╫'); }

/* --- the old city --------------------------------------------------------- */
rect(4, 37, 91, 38, '░');
rect(4, 44, 91, 45, '░');
rect(4, 46, 91, 47, '▬');
rect(4, 48, 91, 48, '░');
rect(4, 54, 91, 55, '░');

range(5, 39, 8, 5, 'tile', [], 11);
const houseADoors = range(17, 39, 14, 5, 'slate', [6], 13);
range(33, 39, 11, 5, 'moss', [], 17);
const marketDoors = range(52, 39, 14, 5, 'tile', [6], 19);
range(68, 39, 9, 5, 'slate', [], 23);
range(81, 39, 10, 5, 'moss', [], 27);

range(5, 49, 8, 5, 'slate', [], 29);
row(17, 49, '144444443');
row(17, 50, '122252223');
rect(17, 51, 25, 53, 'G');
row(17, 53, 'GGGGhgGGG');
const clinicDoor = { x: 22, y: 53 };
const houseBDoors = range(28, 49, 16, 5, 'tile', [7], 31);
row(52, 49, '699999998');
row(52, 50, '677707778');
rect(52, 51, 60, 53, 'G');
row(52, 53, 'GGGGmgGGG');
const shopDoor = { x: 57, y: 53 };
range(63, 49, 14, 5, 'moss', [], 37);
range(81, 49, 10, 5, 'slate', [], 41);

for (const x of [8, 25, 36, 57, 66, 84]) put(x, 48, '☼');
for (const x of [11, 29, 40, 61, 71, 88]) put(x, 44, '☼');
for (const x of [20, 34, 63, 74]) put(x, 45, '♦');
for (const x of [9, 27, 38, 59, 68, 86]) put(x, 54, '☼');
for (const x of [22, 33, 65, 76]) put(x, 55, '♦');
for (const x of [6, 41, 55, 90]) put(x, 37, '♣');
for (const x of [12, 26, 48, 62, 74, 86]) put(x, 38, '☼');
for (const x of [19, 35, 68, 82]) put(x, 37, '♦');

/* --- the lower city: the muster yard, the masons' yard, the west gate ----- */
rect(4, 56, 91, 61, '░');
rect(0, 58, 3, 59, '◘');
rect(4, 58, 91, 59, '▬');

// The mustering lane. A rail the climb forms up behind, with two gaps in it
// worn by nine hundred years of the same two people standing in the same two
// places -- which is the sign on the yard wall, said in terrain.
for (let x = 10; x <= 44; x++) put(x, 60, '╫');
for (const x of [20, 21, 36, 37]) put(x, 60, '░');
// Nothing stands inside the lane. That is what it looks like when it is empty.
for (const x of [6, 47, 52, 58]) put(x, 61, '♦');
for (const x of [13, 19, 25, 31, 37, 43]) put(x, 56, '☼');
for (const x of [12, 24, 40]) put(x, 57, '♣');
for (const x of [48, 52]) put(x, 57, '♦');
put(28, 57, '´'); put(29, 57, '´');
put(56, 57, '´');
for (const x of [62, 68, 74, 80, 86]) put(x, 61, '◆');
for (const x of [60, 65, 71, 77, 83, 89]) put(x, 56, '■');
for (const x of [63, 70, 78, 85]) put(x, 60, '■');
for (const x of [8, 47, 50, 90]) put(x, 61, '♣');

/* --- the storm ------------------------------------------------------------ */
// It does not rain in Crownspire in summer. It has rained for six days, and
// the standing water is the only part of that the map says out loud.
const PUDDLES = [
  [9, 17], [25, 16], [70, 18], [88, 17], [33, 6], [62, 7], [47, 18], [55, 6],
  [8, 23], [37, 29], [55, 22], [67, 31], [90, 25], [43, 23], [21, 31], [59, 29],
  [7, 37], [44, 38], [86, 37], [17, 44], [30, 45], [48, 44], [66, 45], [88, 44],
  [10, 48], [45, 48], [79, 48], [12, 54], [42, 55], [70, 54], [91, 55],
  [10, 57], [24, 61], [33, 56], [51, 61], [58, 56], [69, 60], [91, 61], [35, 60],
];
for (const [x, y] of PUDDLES) if ('░═▬'.includes(g[y][x])) put(x, y, 'p');

/* ------------------------------------------------------------------- people */

const npc = (id, sprite, x, y, facing, movement, script, extra = {}) => ({
  id, sprite, x, y, facing, movement: movement ?? { kind: 'static' }, script, ...extra,
});
const S = { kind: 'static' };
const L = { kind: 'lookAround' };
const wander = (radius) => ({ kind: 'wander', radius });
const pace = (axis, distance) => ({ kind: 'pace', axis, distance });

const npcs = [
  // The terrace, and the gate that will not open.
  npc('cs_warden', 'elder', 47, 5, 'down', S, 'cs_warden'),
  npc('cs_gate_wait_a', 'hiker', 39, 7, 'up', L, 'cs_gate_wait_a'),
  npc('cs_gate_wait_b', 'townsfolk_f', 57, 7, 'up', S, 'cs_gate_wait_b'),
  npc('cs_gate_wait_c', 'rival', 62, 6, 'left', L, 'tarin_word_street'),
  npc('cs_roll_reader', 'elder', 19, 16, 'up', S, 'cs_roll_reader'),
  npc('cs_roll_child', 'kid', 25, 17, 'up', L, 'cs_roll_child'),
  npc('cs_roll_mason', 'porter', 72, 16, 'up', S, 'cs_roll_mason'),
  npc('cs_roll_widow', 'villager_f', 82, 17, 'up', S, 'cs_roll_widow'),
  npc('cs_hall_doorman', 'clerk', 53, 17, 'left', S, 'cs_hall_doorman'),

  // Crown Plaza.
  npc('cs_tarin', 'rival', 47, 22, 'up', S, 'cs_tarin'),
  npc('cs_plaza_crier', 'townsfolk_m', 30, 29, 'down', L, 'cs_plaza_crier'),
  npc('cs_plaza_pilgrim', 'villager_f', 62, 29, 'left', S, 'cs_plaza_pilgrim'),
  npc('cs_plaza_kid', 'kid', 37, 30, 'right', wander(2), 'cs_plaza_kid'),
  npc('cs_archivist_out', 'professor', 14, 27, 'down', S, 'cs_archivist_out'),
  npc('cs_muster_host', 'merchant', 81, 27, 'down', S, 'cs_muster_host'),
  npc('cs_plaza_watcher', 'villager_m', 68, 30, 'down', L, 'tarin_word_street'),
  npc('cs_plaza_sweep', 'porter', 20, 30, 'right', pace('x', 3), 'cs_plaza_sweep'),

  // The river.
  npc('cs_river_watch', 'dockhand', 20, 37, 'up', S, 'cs_river_watch'),
  npc('cs_bridge_old', 'elder', 47, 38, 'up', S, 'cs_bridge_old'),
  npc('cs_river_gauge', 'clerk', 62, 37, 'up', S, 'cs_river_gauge'),
  npc('cs_river_kid', 'kid', 79, 38, 'up', L, 'cs_river_kid'),

  // The old city and the West Road.
  npc('cs_street_carter', 'porter', 30, 44, 'down', pace('x', 4), 'cs_street_carter'),
  npc('cs_street_glazier', 'villager_m', 44, 45, 'down', S, 'cs_street_glazier'),
  npc('cs_street_gran', 'elder', 12, 48, 'down', S, 'cs_street_gran'),
  npc('cs_street_courier', 'hiker', 72, 48, 'left', L, 'tarin_word_shop'),
  npc('cs_clinic_step', 'healer', 26, 54, 'left', S, 'cs_clinic_step'),
  npc('cs_shop_step', 'clerk', 62, 54, 'left', S, 'cs_shop_step'),
  npc('cs_street_child', 'kid', 47, 55, 'down', wander(2), 'cs_street_child'),

  // The muster yard: people with Crests and nowhere to take them.
  npc('cs_muster_a', 'hiker', 18, 57, 'down', S, 'cs_muster_a'),
  npc('cs_muster_b', 'townsfolk_f', 25, 57, 'right', S, 'cs_muster_b'),
  npc('cs_muster_c', 'villager_m', 33, 61, 'up', S, 'cs_muster_c'),
  npc('cs_muster_d', 'townsfolk_m', 44, 57, 'left', L, 'cs_muster_d'),
  npc('cs_gate_guard', 'clerk', 6, 57, 'right', S, 'cs_gate_guard'),

  // The masons' yard.
  npc('cs_mason_head', 'villager_f', 66, 59, 'down', S, 'cs_mason_head'),
  npc('cs_mason_hand', 'porter', 76, 60, 'up', L, 'cs_mason_hand'),
  npc('cs_mason_prentice', 'kid', 84, 59, 'left', S, 'cs_mason_prentice'),
];

/* ------------------------------------------------------------------ objects */

const sign = (x, y, text) => ({ kind: 'sign', x, y, text });

const objects = [
  sign(42, 5, [
    'THE ASCENT GATE. Open every day since the road was cut.',
    'A board has been nailed over the notice: SHUT. WEATHER. NO EXCEPTIONS.',
    'The nails are new and somebody drove them in badly, in a hurry, in the rain.',
  ]),
  sign(47, 3, [
    'The gate. Two leaves of oak in an iron frame, taller than a house, and shut.',
    'A plank has been nailed across them at chest height, badly, in the wet.',
    'The wood under the nails is nine hundred years old and has never had a nail in it.',
  ]),
  sign(53, 5, [
    'The tally board beside the gate, kept by the wardens for nine hundred years.',
    'DAYS THE GATE HAS BEEN SHUT IN LIVING MEMORY: 0.',
    'Under it, in wet chalk that keeps running: 6.',
  ]),
  sign(43, 16, [
    'THE EIGHTH HALL OF CAELORA. No type is named over this door.',
    'The other seven tell you what they are before you go in.',
    'This one does not, and the omission is the oldest joke in the city.',
  ]),
  sign(13, 15, [
    'THE ROLL, WEST LEAF. Every name that has stood on the Summit, cut in order.',
    'The first is nine hundred and six years old and is one word long.',
    'The letters are a finger deep. They were cut to outlast the people who cut them.',
  ]),
  sign(23, 15, [
    'Four thousand one hundred and nine names, and room on this wall for forty more.',
    'The masons have already dressed the next leaf. It is leaning against the wall behind you.',
    'Crownspire has never once assumed there would be nobody else.',
  ]),
  sign(77, 15, [
    'THE ROLL, EAST LEAF. The last two hundred years, and the letters are shallower.',
    'Not because the masons got worse. Because more people come now,',
    'and a city that cuts four names a year cuts them deeper than one that cuts forty.',
  ]),
  sign(87, 15, [
    'A name near the end has been cut twice, one over the other, badly aligned.',
    'The mason who did it left a note in the Archive: SHE ASKED ME TO WAIT.',
    'SHE CAME BACK DOWN AND WENT UP AGAIN. I AM NOT SORRY I WAITED.',
  ]),
  sign(11, 26, [
    'THE ROLL ARCHIVE. Nine hundred years of who went up, and what they took.',
    'Open to anybody. There is no desk between you and the shelves.',
    'The card on the door: YOU MAY TOUCH THEM. THEY WERE WRITTEN TO BE TOUCHED.',
  ]),
  sign(84, 26, [
    'THE MUSTER. Beds, boots, hot water and a fire, for anybody with eight Crests.',
    'Nine hundred years of people sleeping badly the night before.',
    'Somebody has chalked on the step: FULL. HAS BEEN FULL FOR A WEEK.',
  ]),
  sign(43, 32, [
    'KINGSBRIDGE. Six hundred years old and the middle of the three.',
    'The city is not named for the towers. It is named for this.',
    'The water under it is four feet higher than the mark that says NEVER.',
  ]),
  sign(12, 32, [
    'THE OLD SPAN, west. The narrowest of the three, and the first.',
    'Chalk marks up the pier record every flood since the city started counting.',
    'The highest is dated last Tuesday and there is nothing above it but stone.',
  ]),
  sign(81, 32, [
    'THE NEW SPAN, east. Ninety years old, which here means new.',
    'The gauge house keeps a lamp on it all night now.',
    'Somebody has taken the boats out of the water and put them in the street.',
  ]),
  sign(57, 43, [
    'THE MARKET UNDER THE ARCH. Six hundred stalls and a stone roof.',
    'The roof is why it is still trading. Nothing else in this street is.',
  ]),
  sign(12, 53, [
    'A milestone, set into the wall of the corner house and worn nearly smooth.',
    'AURELINE 61. SKYREACH 22. THE SUMMIT 4.',
    'Four. It has said four for nine hundred years and it has never been further.',
  ]),
  sign(28, 57, [
    'THE MUSTER YARD. Where the climb forms up, at first light, on the day.',
    'The stones are worn into two grooves where nine centuries of people have stood in line.',
  ]),
  sign(29, 57, [
    'The board that says when the next climb goes up.',
    'The date has been wiped and rewritten four times and is now wiped and not rewritten.',
    'Underneath, in a different hand: WE WILL POST IT. GO AND SLEEP.',
  ]),
  sign(56, 57, [
    'THE MASONS\' YARD. Half-cut blocks, a lot of them, standing about in the rain.',
    'A card wired to the nearest: DO NOT MOVE. LETTERS FACING IN.',
  ]),
  sign(7, 36, [
    'A flood board, bolted to the parapet, with the years cut into it.',
    'The last four are 1712, 1801, 1889 and a fresh one with no year on it yet.',
    'The mason is waiting to see whether it is finished before he dates it.',
  ]),
  { kind: 'kin', x: 34, y: 24, species: 'frostnip' },
  { kind: 'kin', x: 66, y: 24, species: 'slatewing' },
  { kind: 'kin', x: 12, y: 60, species: 'frostnip' },
  { kind: 'kin', x: 87, y: 44, species: 'slatewing' },
  {
    kind: 'item', x: 5, y: 61, item: 'full_restore', quantity: 1, flag: 'item_cs_yard',
  },
  {
    kind: 'hiddenItem', x: 90, y: 21, item: 'rouse', quantity: 1, flag: 'item_cs_plaza',
  },
  {
    kind: 'hiddenItem', x: 5, y: 37, item: 'great_potion', quantity: 2, flag: 'item_cs_river',
  },
];

/* -------------------------------------------------------------------- warps */

const door = (x, y, toMap, toX, toY) => ({
  x, y, toMap, toX, toY, facing: 'up', style: 'door',
});

const warps = [
  door(hallDoors[0].x, hallDoors[0].y, 'crownspire_hall', 7, 21),
  door(hallDoors[1].x, hallDoors[1].y, 'crownspire_hall', 8, 21),
  door(archiveDoors[0].x, archiveDoors[0].y, 'crownspire_archive', 9, 13),
  door(musterDoors[0].x, musterDoors[0].y, 'crownspire_inn', 9, 13),
  door(marketDoors[0].x, marketDoors[0].y, 'crownspire_market', 11, 15),
  door(houseADoors[0].x, houseADoors[0].y, 'crownspire_house_a', 9, 11),
  door(houseBDoors[0].x, houseBDoors[0].y, 'crownspire_house_b', 9, 11),
  door(clinicDoor.x, clinicDoor.y, 'crownspire_clinic', 9, 13),
  door(shopDoor.x, shopDoor.y, 'crownspire_provisioner', 10, 11),
  // THE SKYREACH ROAD. See _join at the foot of this file: the road map owes
  // two warps back, landing on the gate arch at 1,58 and 1,59.
  { x: 0, y: 58, toMap: 'route_10', toX: 53, toY: 13, facing: 'left', style: 'edge' },
  { x: 0, y: 59, toMap: 'route_10', toX: 53, toY: 14, facing: 'left', style: 'edge' },
];

/* --------------------------------------------------------------------- emit */

const map = {
  id: 'crownspire',
  name: 'Crownspire',
  displayName: 'CROWNSPIRE',
  music: 'station',
  battleBackdrop: 'quarry',
  indoor: false,
  regionPos: { x: 31, y: 11 },
  rows: g.map((r) => r.join('')),
  warps,
  npcs,
  objects,
  _plan: [
    'THE CITY IS A LEDGER YOU CAN WALK THROUGH. Crownspire has been cutting the ',
    'name of everybody who reached the Summit into its terrace walls for nine ',
    'hundred and six years, and that one fact decides the whole plan: the map ',
    'climbs from the gate to the Roll, every plaza is furnished with monuments ',
    'rather than with lawn, and the last thing between the player and the ',
    'mountain is a wall with four thousand names on it and room for forty more.',
    '',
    'IT IS BUILT OUT OF AURELINE\'S OLD KIT AND NOTHING ELSE, ON PURPOSE. The ',
    'capital is glass and steel over three surviving streets of granite; ',
    'Crownspire is those three streets, all the way to the walls, and the ',
    'argument only lands if the material is literally the same one. So there is ',
    'no new terrain character in this build and no new art: granite, sash, ',
    'arch, cobble, three roof families and the city furniture. What makes it ',
    'read as a different place is proportion. The modern kit stacks and this ',
    'one does not, so height here is not a tower -- it is that EVERY range is ',
    'five rows, in the poorest street as well as the best, and the eye reads a ',
    'city with no cheap quarter in it.',
    '',
    'THE STORM, WITHOUT SETTING map.weather. Map weather is invisible on the ',
    'overworld -- nothing draws it -- and it is NOT invisible in battle: it is ',
    'passed straight into Battle, where rain is tide x1.5 and flame x0.5. ',
    'Setting rain over a city with a Kin Hall in it would quietly nerf every ',
    'Cinderpaw player through the eighth Crest. The storm is carried instead by ',
    'standing water on the stone (the p tiles, thirty-eight of them, in a city ',
    'where it does not rain in summer), by the river four feet over the mark ',
    'that says NEVER, by mountain Kin sitting in the plaza and the muster yard, ',
    'and by every one of thirty-six people talking about the same six days.',
    '',
    'NOBODY IS FIGHTING IN CROWNSPIRE AND THAT IS THE POINT. The Ascent gate is ',
    'shut for the first time in living memory, so the city is full of Trainers ',
    'with eight Crests and nowhere to take them: the muster yard is a queue for ',
    'a gate that will not open, the Muster inn has been full for a week, and ',
    'the date board has been wiped four times and left blank. Every battle in ',
    'this settlement is inside the Hall, which is also why the streets can be ',
    'walked end to end without a sight line firing.',
    '',
    'THE THREE BRIDGES ARE THE CITY\'S SPINE AND THE STREET GRID IS CUT TO THEM. ',
    'The ravine runs the full width at y33-35 and there are exactly three ways ',
    'over it; every north-south street in the old city is held open at a bridge ',
    'head (x13-16, x44-51, x77-80), so a player who crosses at any bridge walks ',
    'straight through both terraces to the West Road without meeting a wall. ',
    'The first pass had the middle bridge landing in the side of a market and ',
    'that is exactly the fault this layout is built to make impossible.',
  ].join('\n'),
  _join: [
    'THE SKYREACH ROAD IS THE ONE JOIN THIS MAP DOES NOT OWN.',
    'Crownspire warps out at x0, y58 and y59 (the west gate arch) to a map called',
    '"route_10", landing at 53,13 and 53,14. The road owes two warps back at its',
    'x54, y13 and y14 -> crownspire 1,58 and 1,59, facing right, style "edge".',
    'If the Skyreach-to-Crownspire road is named anything other than route_10,',
    'the only change needed here is that string, twice.',
  ].join('\n'),
};

writeFileSync(process.argv[2], JSON.stringify(map, null, 2));
console.log(map.rows.map((r, i) => String(i).padStart(2) + ' ' + r).join('\n'));
console.log('DOORS ' + JSON.stringify({
  hall: hallDoors, archive: archiveDoors, muster: musterDoors, market: marketDoors,
  houseA: houseADoors, houseB: houseBDoors, clinic: clinicDoor, shop: shopDoor,
}));

/* ------------------------------------------------------- standing-up check */
// Every solid thing stood up one at a time, then the whole map flooded from
// the west gate with all of it standing and all thirty-six people on their
// feet. A person is a solid object; one of them in an alley turns the alley
// into a room with no way in.
const SOLID = new Set('TtoO#wR[]^|_!CcIK1234567890Ghmbek§¤«¬»°±÷¶µØÅÇ▪▫█▓┌─┐▄▌▐╔╗╦╧╤☼♣♦╫♠◆○■´WG<%>(&)'.split(''));
const blocked = new Set(npcs.map((n) => `${n.x},${n.y}`));
const walk = (x, y) => {
  const ch = g[y]?.[x];
  if (ch === undefined || SOLID.has(ch)) return false;
  return !blocked.has(`${x},${y}`);
};
const seen = new Set(['1,58']);
const q = [[1, 58]];
while (q.length) {
  const [x, y] = q.shift();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (!walk(nx, ny) || seen.has(`${nx},${ny}`)) continue;
    seen.add(`${nx},${ny}`); q.push([nx, ny]);
  }
}
const targets = [
  ['hall door', 47, 16], ['hall door 2', 48, 16], ['archive door', 12, 26],
  ['muster door', 83, 26], ['market door', 58, 43], ['houseA door', 23, 43],
  ['houseB door', 35, 54], ['clinic door', 22, 54], ['shop door', 57, 54],
  ['gate barrier', 47, 6], ['roll west', 20, 15], ['roll east', 75, 15],
  ['stair foot', 47, 21], ['plaza', 10, 30], ['masons', 70, 61],
];
for (const [name, x, y] of targets) {
  if (!seen.has(`${x},${y}`)) console.log('UNREACHABLE ' + name + ' ' + x + ',' + y);
}
let orphan = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (walk(x, y) && !seen.has(`${x},${y}`)) orphan++;
}
console.log(`reachable ${seen.size} cells, ${orphan} walkable cells cut off`);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (walk(x, y) && !seen.has(`${x},${y}`)) console.log('  cut off: ' + x + ',' + y + ' = ' + g[y][x]);
