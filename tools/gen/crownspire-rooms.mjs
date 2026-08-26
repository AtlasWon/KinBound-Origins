// Rebuilds Crownspire's nine interiors from scratch.
//
//   node tools/gen/crownspire-rooms.mjs data/maps
//
// IT OVERWRITES ALL NINE. They are emitted from one file so that every return
// warp is written beside the door it belongs to: the join that keeps breaking
// on this project is a door with a room behind it and nothing between them,
// and here the two halves of a pair cannot drift, because they are two lines
// apart.
/**
 * Crownspire's interiors.
 *
 * Nine rooms emitted from one file so that every return warp is written
 * beside the door it belongs to. The join that keeps breaking on this project
 * is a door with a room behind it and nothing between them; here the pairs
 * cannot drift, because they are two lines apart.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = process.argv[2];
const write = (m) => {
  const w = new Set(m.rows.map((r) => r.length));
  if (w.size !== 1) throw new Error(`${m.id}: ragged rows ${[...w].join(',')}`);
  writeFileSync(resolve(OUT, `${m.id}.json`), JSON.stringify(m, null, 2));
  console.log(`${m.id}  ${m.rows[0].length}x${m.rows.length}  warps:${m.warps.length} npcs:${m.npcs.length} objs:${m.objects.length}`);
};

const npc = (id, sprite, x, y, facing, movement, script, extra = {}) =>
  ({ id, sprite, x, y, facing, movement, script, ...extra });
const S = { kind: 'static' };
const L = { kind: 'lookAround' };
const sign = (x, y, text) => ({ kind: 'sign', x, y, text });
const back = (x, y, toX, toY, style = 'door') =>
  ({ x, y, toMap: 'crownspire', toX, toY, facing: 'down', style });

/* ===================================================== THE EIGHTH HALL ==== */

write({
  id: 'crownspire_hall',
  name: 'The Long Gallery',
  displayName: 'THE EIGHTH HALL',
  music: 'station',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    'IIIIIIIIIIIIIIII',
    'IUUFFFFFFFFFFUUI',
    'IFFFFFFSSFFFFFFI',
    'IFFFFFFFFFFFFFFI',
    'IIkFFFFFFFFFFkII',
    'IIFFFFFFFFFFFFII',
    'IAFFFFFFFFFFFFAI',
    'IIFFFFFFFFFFFFII',
    'IIFFFFFFFFFFFFII',
    'IAFFFFPFFPFFFFAI',
    'IIFFFFFFFFFFFFII',
    'IIFFFFFFFFFFFFII',
    'IAFFFFFFFFFFFFAI',
    'IIFFFAAAFFFFFFII',
    'IIFFFEEEFFFFFFII',
    'IAFFFFFFFFFFFFAI',
    'IIFFFFFFFFFFFFII',
    'IIFFFFFFFFFFFFII',
    'IIKKFKKFFFFFFFII',
    'IIFFFFFFFFFFFFII',
    'IIPFFFFFFFFFFPII',
    'IIIIIIIDDIIIIIII',
  ],
  warps: [
    back(7, 21, 47, 16),
    back(8, 21, 48, 16),
    { x: 7, y: 2, toMap: 'crownspire_hall_crown', toX: 7, toY: 13, facing: 'up', style: 'stairs' },
    { x: 8, y: 2, toMap: 'crownspire_hall_crown', toX: 8, toY: 13, facing: 'up', style: 'stairs' },
  ],
  npcs: [
    npc('cs_hall_registrar', 'clerk', 4, 18, 'down', S, 'cs_hall_registrar'),
    npc('cs_hall_usher', 'concord', 11, 3, 'down', S, 'cs_hall_usher'),
    npc('cs_hall_oldclimber', 'elder', 3, 9, 'right', S, 'cs_hall_oldclimber'),
    npc('cs_hall_child', 'kid', 9, 13, 'left', L, 'cs_hall_child'),
    npc('cs_hall_visitor', 'villager_m', 12, 16, 'left', S, 'cs_hall_visitor'),
    npc('cs_hall_hollis', 'hiker', 4, 16, 'down', S, undefined,
      { trainer: 'cs_steward_hollis', sightRange: 4 }),
    npc('cs_hall_derrin', 'clerk', 7, 11, 'down', S, undefined,
      { trainer: 'cs_steward_derrin', sightRange: 5 }),
    npc('cs_hall_mabe', 'townsfolk_f', 12, 7, 'down', S, undefined,
      { trainer: 'cs_steward_mabe', sightRange: 4 }),
  ],
  objects: [
    sign(6, 21, [
      'Cut into the threshold, worn to a shine by nine hundred years of boots:',
      'THE EIGHTH ASKS NOTHING NEW OF YOU.',
      'IT ASKS ALL OF IT AT ONCE.',
    ]),
    sign(3, 18, [
      'The register. Name, Crests, and the date you walked in.',
      'Two hundred and eleven volumes behind the clerk, and one open on the desk.',
      'Today has four names on it. Last week had ninety.',
    ]),
    sign(1, 15, [
      'THE FIRST BAY - BRIARBELL. A bell rope on a plinth, hung where a child could reach it.',
      'THE HALL ASKED: do you know what your Kin is good at?',
      'Everybody answers this one. It is on the wall because everybody forgets it.',
    ]),
    sign(14, 15, [
      'THE SECOND BAY - STONEWAKE. A counterweight, a length of chain, and three stones.',
      'THE HALL ASKED: will you go down to somebody who will not come up to you?',
    ]),
    sign(1, 12, [
      'THE THIRD BAY - TIDEGLASS. A tide table, a lane marker, and a stopwatch that still runs.',
      'THE HALL ASKED: can you do it faster than that?',
      'Somebody has pencilled underneath: SHE COULD. YOU PROBABLY CANNOT. GO ANYWAY.',
    ]),
    sign(14, 12, [
      'THE FOURTH BAY - EMBERFALL. A tally cut for a flue that does not exist.',
      'THE HALL ASKED: whose share are you spending?',
    ]),
    sign(1, 9, [
      'THE FIFTH BAY - MIREHAVEN. A disc of set silk, a hundred and sixty years old, on black cloth.',
      'THE HALL ASKED: can you stand still in the dark?',
    ]),
    sign(14, 9, [
      'THE SIXTH BAY - FROSTMERE. Kept cold. The card in front of it is frosted over.',
      'THE HALL ASKED: what do you do when nothing is moving?',
    ]),
    sign(1, 6, [
      'THE SEVENTH BAY - SKYREACH. A wind vane, indoors, on a mount that lets it turn.',
      'It has pointed the same way for six days and the card does not explain why.',
      'THE HALL ASKED: can you hold on?',
    ]),
    sign(14, 6, [
      'THE EIGHTH BAY. Empty, swept, and a card on an easel in the Keeper\'s own hand:',
      'I AM NOT GOING TO TELL YOU WHAT THIS ONE ASKS.',
      'YOU HAVE WALKED PAST THE ANSWER SEVEN TIMES.',
    ]),
    sign(6, 0, [
      'The stair to the Crown Floor. Twelve steps, and a rail worn through on the left.',
      'Everybody puts the same hand out. Nobody has ever worked out why it is always that one.',
    ]),
    {
      kind: 'hiddenItem', x: 13, y: 19, item: 'full_restore', quantity: 1, flag: 'item_cs_hall',
    },
  ],
  _plan: 'THE FLOOR IS THE OTHER SEVEN HALLS. Canon gives the eighth Keeper a diverse team and a challenge that tests everything the player has learned, and the cheapest way to make "everything" mean something is to put it on the walls: eight bays down a long gallery, one per Hall of Caelora, each holding the object that Hall used and the question it asked, in the order the player met them. Walking in from the door you pass Briarbell first and Skyreach last, and the eighth bay is swept and empty with a card on an easel saying the Keeper is not going to tell you. SIXTEEN WIDE AND TWENTY-TWO DEEP, AND THE FIRST NUMBER IS THE ONE THAT MATTERS. The first pass was twenty-six wide and the walk found the fault at once: the screen is fifteen tiles across, so a player standing in the middle of the aisle could not see either wall, and a gallery of eight bays had no bay in it. Narrow and long is what a gallery is. The three Stewards stand off the centre line -- Hollis watches column 4, Derrin column 7, Mabe column 12 -- so a player who only wants the Crest can walk up columns 9 to 11 and meet nobody, and all three are still there for a player who takes the Long Floor upstairs. The registrar stands IN the counter run at 4,18 rather than behind it, because npcInFront reaches one tile and a clerk parked behind an unbroken counter can be looked at and never spoken to.',
});

/* ====================================================== THE CROWN FLOOR === */

write({
  id: 'crownspire_hall_crown',
  name: 'The Crown Floor',
  displayName: 'THE CROWN FLOOR',
  music: 'station',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    'IIIIIIIIIIIIIIII',
    'IUUUUUUUUUUUUUUI',
    'IFFFFFFFFFFFFFFI',
    'IPFFFFFFFFFFFFPI',
    'IkFFFFFFFFFFFFkI',
    'IkFFFFFFFFFFFFkI',
    'IkFFFFFFFFFFFFkI',
    'IFFFFFFFFFFFFFFI',
    'IFFFFFFFFFFFFFFI',
    'IFFFFFFFFFFFFFFI',
    'IAAFFFFFFFFFFAAI',
    'IEEFFFFFFFFFFEEI',
    'IPFFFFFFFFFFFFPI',
    'IFFFFFFSSFFFFFFI',
    'IIIIIIIIIIIIIIII',
  ],
  warps: [
    { x: 7, y: 13, toMap: 'crownspire_hall', toX: 7, toY: 3, facing: 'down', style: 'stairs' },
    { x: 8, y: 13, toMap: 'crownspire_hall', toX: 8, toY: 3, facing: 'down', style: 'stairs' },
  ],
  npcs: [
    npc('cs_keeper_ord', 'elder', 7, 3, 'down', S, 'cs_keeper'),
    npc('cs_crown_aide', 'clerk', 3, 8, 'right', L, 'cs_crown_aide'),
  ],
  objects: [
    sign(7, 1, [
      'The north lights. On a clear day the Ascent fills all fourteen of them.',
      'There has not been a clear day for six.',
      'The glass is running with water and the mountain is a grey suggestion behind it.',
    ]),
    sign(1, 5, [
      'Forty years of her notes, one volume a year, on the Kin of every Trainer',
      'who has stood on this floor. Not who won. What they brought, and why.',
      'The spines are labelled by year. The year is the only thing on them.',
    ]),
    sign(14, 5, [
      'A rack of eight practice Crests, cast in lead, for people to hold.',
      'Seven are worn smooth. The eighth is as sharp as the day it came out of the mould.',
      'Nobody comes up here to hold the eighth one.',
    ]),
    sign(1, 10, [
      'A small table, two chairs, a pot of tea and three cups.',
      'Three, because in forty years she has never got used to somebody bringing a friend.',
    ]),
    sign(14, 10, [
      'A window seat worn through to the boards, facing the stair rather than the mountain.',
      'She sits here between challengers, watching the top of the steps.',
    ]),
  ],
  _plan: 'THE ROOM IS QUIET AND THE FIGHT IS OPTIONAL TWICE OVER. The Crest is one battle with Keeper Ord and it is measured at 97/90/87 for a novice at the level the road delivers. The Long Floor -- her three Stewards and then her, back to back, with no clinic between -- is offered as a choice and never as a gate, because the player has asked four times for an easier game and the last Crest in the story is the worst possible place in the game to put a wall. What the hard road buys is not progress. It is a name cut into the wall outside, which is the only thing this city has ever cared about, and it changes the monument, the mason, the reader, the registrar and Tarin. Sixteen wide, like the gallery below it, so the fourteen north lights and both side walls are on screen from the middle of the floor.',
});

/* ============================================================= THE ROLL === */

write({
  id: 'crownspire_archive',
  name: 'The Roll Archive',
  displayName: 'THE ROLL ARCHIVE',
  music: 'town_indoor',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    'IIIIUUIIIIIIIIUUIIII',
    'IkkkkkkkkkkkkkkkkkkI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IkkkFkkkkFkkkkFkkkkI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IkkkkFkkkkkkFkkkkkkI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IFFAAAFFFFFFAAAFFFFI',
    'IFFEEEFFFFFFEEEFFFFI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IPFFFFFFFFFFFFFFFFPI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IIIIIIIIIDIIIIIIIIII',
  ],
  warps: [back(9, 13, 12, 26)],
  npcs: [
    npc('cs_archivist', 'professor', 6, 6, 'down', S, 'cs_archivist'),
    npc('cs_arch_copyist', 'villager_f', 14, 4, 'up', S, 'cs_arch_copyist'),
    npc('cs_arch_reader', 'elder', 6, 8, 'left', S, 'cs_arch_reader'),
    npc('cs_arch_student', 'kid', 11, 8, 'right', L, 'cs_arch_student'),
    npc('cs_arch_stranger', 'hiker', 16, 11, 'left', S, 'cs_arch_stranger'),
  ],
  objects: [
    sign(9, 1, [
      'THE ROLL, WRITTEN. What the wall outside says in four thousand names,',
      'these shelves say in four thousand paragraphs.',
      'Who they were. What they carried. What they came back down and did afterwards.',
    ]),
    sign(3, 3, [
      'The oldest shelf. Nine hundred years, and the first two hundred are one volume.',
      'People did not think it was worth writing down at first.',
      'The first entry that runs to a page is a woman who went up to look for her brother.',
    ]),
    sign(16, 3, [
      'The current shelf, which is thin, because it is only eleven years old.',
      'A gap has been left on it. The card in the gap says THIS YEAR.',
      'Nothing has been put in it since the spring.',
    ]),
    sign(10, 5, [
      'A drawer of letters from people who did NOT get up, kept in the same order.',
      'The Archive has never separated them out.',
      'The card on the drawer: THE ROLL IS NOT A LIST OF WINNERS. IT IS A LIST OF PEOPLE.',
    ]),
    sign(1, 10, [
      'A weather ledger. Every day since the city started keeping one.',
      'Rainfall in Crownspire, summer, nine hundred years: a column of noughts',
      'and then, at the bottom, in fresh ink, six numbers that are not noughts.',
    ]),
    sign(18, 10, [
      'A shelf of foreign records - Averra beyond Caelora. Six other leagues.',
      'Islands with their own Kin and their own words for them.',
      'Somebody has been reading them recently. There is a marker in three.',
    ]),
    {
      kind: 'hiddenItem', x: 17, y: 12, item: 'rouse', quantity: 1, flag: 'item_cs_archive',
    },
  ],
});

/* ============================================================ THE MUSTER == */

write({
  id: 'crownspire_inn',
  name: 'The Muster',
  displayName: 'THE MUSTER',
  music: 'town_indoor',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    'IIIUUIIIIIIIIIUUIIII',
    'IFFFFFFFFFFFFFFFFFFI',
    'IKKKFKKFFFFFFFFFFPFI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IFAAAFFAAAFFAAAFFFFI',
    'IFEEEFFEEEFFEEEFFFFI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IbeFFbeFFbeFFbeFFbeI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IbeFFbeFFbeFFbeFFbeI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IPFFFFFFFFFFFFFFFFPI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IIIIIIIIIDIIIIIIIIII',
  ],
  warps: [back(9, 13, 83, 26)],
  npcs: [
    npc('cs_muster_keeper', 'merchant', 4, 2, 'down', S, 'cs_muster_keeper'),
    npc('cs_muster_cook', 'villager_f', 16, 3, 'down', S, 'cs_muster_cook'),
    npc('cs_muster_climber_a', 'hiker', 10, 4, 'left', S, 'cs_muster_climber_a'),
    npc('cs_muster_climber_b', 'townsfolk_f', 13, 6, 'up', S, 'cs_muster_climber_b'),
    npc('cs_muster_climber_c', 'sailor', 4, 8, 'right', L, 'cs_muster_climber_c'),
    npc('cs_muster_climber_d', 'townsfolk_m', 17, 8, 'left', S, 'tarin_word_clinic'),
    npc('cs_muster_kid', 'kid', 11, 10, 'down', { kind: 'wander', radius: 2 }, 'cs_muster_kid'),
  ],
  objects: [
    sign(5, 2, [
      'The board. Beds, boots, hot water, a fire, and a meal at four in the morning.',
      'Nine hundred years and the price has never changed: eight Crests.',
      'Under it: AND IF YOU HAVE SEVEN, SAY SO, AND SIT DOWN ANYWAY.',
    ]),
    sign(9, 0, [
      'The window over the yard. From here you can see the whole muster ground',
      'and the stair, and the gate, and the weather coming off the mountain.',
      'Nobody in this room is looking anywhere else.',
    ]),
    sign(0, 7, [
      'Twenty beds in two rows, made, turned down, and every one of them slept in.',
      'A card at the end of the row: WAKE CALL 0330. IT HAS NOT BEEN RUNG FOR SIX DAYS.',
    ]),
    sign(19, 9, [
      'The boot rack by the fire. Forty pairs of boots, drying, and not drying.',
      'Somebody has put a note on the rail: THEY WILL NOT DRY. STOP MOVING THEM.',
    ]),
    {
      kind: 'hiddenItem', x: 18, y: 12, item: 'great_potion', quantity: 1, flag: 'item_cs_inn',
    },
  ],
});

/* ============================================================ THE CLINIC == */

write({
  id: 'crownspire_clinic',
  name: 'Interior',
  music: 'town_indoor',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    'IIIUUIIIIIIIIIIUUIII',
    'I++++++FF@@FF??F+++I',
    'IPKKFKKFFFFFFKKFKKPI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IkFFFFFFFFFFFFFFFFkI',
    'IF/rrFFFFFFFFFFrr/FI',
    'IFFrrFFFFFFFFFFrrFFI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IFFFAAAFFFFFFAAAFFFI',
    'IFFFEEEFFFFFFEEEFFFI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IPFFFFFFFFFFFFFFFFPI',
    'IFFFFFFFFFFFFFFFFFFI',
    'IIIIIIIIIDIIIIIIIIII',
  ],
  warps: [back(9, 13, 22, 54)],
  npcs: [
    npc('cs_clinic_keeper', 'healer', 4, 2, 'down', S, 'clinic_heal'),
    npc('cs_clinic_roost', 'professor', 15, 1, 'down', S, 'roost_terminal'),
    npc('cs_clinic_nurse', 'healer', 17, 3, 'left', S, 'cs_clinic_nurse'),
    npc('cs_clinic_vet', 'villager_f', 7, 5, 'right', S, 'cs_clinic_vet'),
    npc('cs_clinic_wait', 'hiker', 14, 6, 'left', S, 'cs_clinic_wait'),
    npc('cs_clinic_child', 'kid', 9, 10, 'up', L, 'cs_clinic_child'),
    npc('cs_clinic_warden', 'elder', 3, 11, 'right', S, 'cs_clinic_warden'),
  ],
  objects: [
    sign(6, 1, [
      'The restorative bank, and a second one wheeled in from the Muster.',
      'The clinic has never needed the second one before.',
      'It is running, and it is full, and the queue outside is not getting shorter.',
    ]),
    sign(13, 1, [
      'A brass terminal, twinned with every other in Caelora. THE ROOST.',
      'Kin you cannot carry wait here. Somebody has hung a towel over the top of it,',
      'because the ceiling has started letting water through and nobody can find where.',
    ]),
    sign(3, 2, [
      'The waiting board. TRAINERS: NO WAIT. WORKING KIN: NO WAIT.',
      'A third line has been chalked under them this week:',
      'COME DOWN OFF THE MOUNTAIN: NO WAIT, AND WE WILL COME AND GET YOU.',
    ]),
    sign(1, 4, [
      'Case notes, and this week they are all the same three words in different hands:',
      'COLD. WET. FRIGHTENED.',
      'Not the Trainers. The Kin they have been carrying in out of the streets.',
    ]),
    sign(18, 4, [
      'A rack of leaflets. The top one is new, printed in a hurry, badly aligned.',
      'IF A KIN YOU DO NOT KNOW COMES DOWN INTO THE CITY, DO NOT CATCH IT.',
      'IT IS NOT LOST. IT IS LEAVING SOMEWHERE.',
    ]),
    {
      kind: 'hiddenItem', x: 1, y: 12, item: 'full_heal', quantity: 2, flag: 'item_cs_clinic',
    },
  ],
});

/* ======================================================= THE PROVISIONER == */

write({
  id: 'crownspire_provisioner',
  name: 'Interior',
  music: 'town_indoor',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    'IIIUUIIIIIIIIIIUUIIIII',
    'I;;;;;;;;;;;;;;;;;;;;I',
    'IPKKKKFKKKFFKKKFKKKKPI',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'I;;;;FF;;;FF;;;FF;;;;I',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'IFF;;;FFFFFFFFFF;;;FFI',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'I;;;;FF;;;FF;;;FF;;;;I',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'IPFFFFFFFFFFFFFFFFFFPI',
    'IIIIIIIIIIDIIIIIIIIIII',
  ],
  warps: [back(10, 11, 57, 54)],
  npcs: [
    npc('cs_shopkeeper', 'merchant', 6, 2, 'down', S, 'crownspire_shop'),
    npc('cs_shop_second', 'clerk', 15, 2, 'down', S, 'cs_shop_second'),
    npc('cs_shop_porter', 'porter', 4, 5, 'up', { kind: 'pace', axis: 'x', distance: 3 }, 'cs_shop_porter'),
    npc('cs_shop_buyer', 'hiker', 16, 7, 'left', S, 'cs_shop_buyer'),
    npc('cs_shop_gran', 'elder', 8, 9, 'up', S, 'cs_shop_gran'),
  ],
  objects: [
    sign(10, 1, [
      'The rope shelf, which in Crownspire is the shelf everything else is arranged round.',
      'Line, cord, tape, spare crampon straps, and four grades of oiled canvas.',
      'Three quarters of it has gone this week and none of it went up the mountain.',
    ]),
    sign(3, 4, [
      'The restoratives, and a hand-written card leaning against the Full Restores:',
      'ONE PER PERSON WHILE THE GATE IS SHUT.',
      'WE ARE NOT SHORT. WE JUST WOULD RATHER NOT BE.',
    ]),
    sign(18, 6, [
      'A rack of thawcloth and coldsalve, which this shop sells more of than any other',
      'in Caelora, because of what is at the top of the road.',
      'The Frostmere order has not come through. It is the first time in eleven years.',
    ]),
    {
      kind: 'hiddenItem', x: 19, y: 10, item: 'escape_line', quantity: 1, flag: 'item_cs_shop',
    },
  ],
});

/* =========================================================== THE MARKET === */

write({
  id: 'crownspire_market',
  name: 'The Market Under the Arch',
  displayName: 'THE MARKET',
  music: 'town_indoor',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    'IIIIUUIIIIIIIIUUIIIIII',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'IF;;;FF;;;;FF;;;;F;;FI',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'IFKKKFFKKKKFFKKKKFKKFI',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'IF;;;;FF;;;;FF;;;;;;FI',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'IFKKKKFFKKKKFFKKKKKKFI',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'IPFFFFFFFFFFFFFFFFFFPI',
    'IFFAAAFFFFFFFFFAAAFFFI',
    'IFFEEEFFFFFFFFFEEEFFFI',
    'IFFFFFFFFFFFFFFFFFFFFI',
    'IIIIIIIIIIIDIIIIIIIIII',
  ],
  warps: [back(11, 15, 58, 44)],
  npcs: [
    npc('cs_mk_ropemaker', 'netmender', 5, 4, 'down', S, 'cs_mk_ropemaker'),
    npc('cs_mk_baker', 'villager_f', 11, 4, 'down', S, 'cs_mk_baker'),
    npc('cs_mk_smith', 'porter', 17, 4, 'down', S, 'cs_mk_smith'),
    npc('cs_mk_letterer', 'clerk', 6, 9, 'down', S, 'cs_mk_letterer'),
    npc('cs_mk_grocer', 'villager_m', 12, 9, 'down', S, 'cs_mk_grocer'),
    npc('cs_mk_gossip', 'townsfolk_f', 16, 11, 'left', L, 'tarin_word_shop'),
    npc('cs_mk_kid', 'kid', 7, 12, 'right', { kind: 'wander', radius: 2 }, 'cs_mk_kid'),
  ],
  objects: [
    sign(11, 0, [
      'THE MARKET UNDER THE ARCH. Six hundred stalls under one stone vault.',
      'It has not shut in six hundred years, for plague, for siege or for weather.',
      'It is very full today, and almost nobody is buying anything.',
    ]),
    sign(2, 2, [
      'A stall selling nothing but nails and letters cut in lead.',
      'The letters are for people who want a name on something that is not the Roll.',
      'A gate post. A boat. A door. A small stone in a garden.',
    ]),
    sign(19, 7, [
      'The fish stall, and there is fish on it, which there should not be.',
      'The card says CAUGHT IN THE RAVINE. TAKE IT.',
      'Nothing has lived in the ravine in the memory of anyone in this market.',
    ]),
    sign(1, 11, [
      'A drain in the floor, running hard, with a grating over it.',
      'Somebody has wedged a broom handle across the grating',
      'and tied a rag to it, so people can see where it is before they find it.',
    ]),
  ],
});

/* ============================================================ THE HOUSES == */

write({
  id: 'crownspire_house_a',
  name: 'Interior',
  music: 'town_indoor',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    'IIIUUIIIIIIIIIIIIII',
    'IJNQFFFFFFFFFFkkkFI',
    'IFFFFFFFFFFFFFFFFFI',
    'IFAAAFFFFFFFFbeFFFI',
    'IFEEEFFFFFFFFFFFFFI',
    'IFFFFFFFFFFFFFFFFFI',
    'IF//rrFFFFVFFFFFPFI',
    'IFFFrrFFFFFFFFFFFFI',
    'IFFFFFFFFFFFFFFFFFI',
    'IPFFFFFFFFFFFFFFFFI',
    'IFFFFFFFFFFFFFFFFFI',
    'IIIIIIIIIDIIIIIIIII',
  ],
  warps: [back(9, 11, 23, 44)],
  npcs: [
    npc('cs_ha_mason', 'villager_m', 5, 3, 'down', S, 'cs_ha_mason'),
    npc('cs_ha_wife', 'villager_f', 14, 6, 'left', S, 'cs_ha_wife'),
    npc('cs_ha_gran', 'elder', 3, 9, 'right', S, 'cs_ha_gran'),
  ],
  objects: [
    sign(15, 1, [
      'Four shelves of the same book: THE ROLL, PRINTED, in nine volumes, nine times over.',
      'Every household in the old city has a set. Most have one.',
      'This family has nine because nine of them are in it.',
    ]),
    sign(10, 6, [
      'A basin under a ceiling stain, and a second basin beside the first,',
      'and a towel between them that is not doing anything useful.',
      'The stain was not there last week.',
    ]),
  ],
});

write({
  id: 'crownspire_house_b',
  name: 'Interior',
  music: 'town_indoor',
  battleBackdrop: 'indoor',
  indoor: true,
  rows: [
    'IIIIUUIIIIIIIIIIIII',
    'IkkkFFFFFFFFFJNQFFI',
    'IFFFFFFFFFFFFFFFFFI',
    'IbeFFFFFFFFFFAAAFFI',
    'IFFFFFFFFFFFFEEEFFI',
    'IFFFFFFFFFFFFFFFFFI',
    'IPFFFF//rrFFFFFFFFI',
    'IFFFFFFFFrrFFFFFPFI',
    'IFFFFFFFFFFFFFFFFFI',
    'IFFFFFFFFFFFFFFFFFI',
    'IFFFFFFFFFFFFFFFFFI',
    'IIIIIIIIIDIIIIIIIII',
  ],
  warps: [back(9, 11, 35, 54)],
  npcs: [
    npc('cs_hb_warden', 'elder', 16, 4, 'left', S, 'cs_hb_warden'),
    npc('cs_hb_daughter', 'townsfolk_f', 6, 7, 'right', S, 'cs_hb_daughter'),
    npc('cs_hb_kin', 'kid', 4, 9, 'up', L, 'cs_hb_kin'),
  ],
  objects: [
    sign(2, 1, [
      'The warden\'s own shelf. Forty years of gate logs, one line a day.',
      'OPEN. OPEN. OPEN. OPEN. Fourteen thousand times, in her hand.',
      'The last six lines are one word and it is not that one.',
    ]),
    sign(16, 7, [
      'A window facing the mountain, and a chair in front of it, and nobody in the chair.',
      'The chair has been moved to face the fire instead.',
      'Somebody moved it back. Somebody moved it again.',
    ]),
    { kind: 'kin', x: 11, y: 9, species: 'frostnip' },
  ],
});
