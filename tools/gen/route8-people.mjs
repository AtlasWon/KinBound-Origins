// Who and what is standing on Route 8, the charcoal hollow and the Wintergate.
//
// Split out of tools/gen/route8.mjs so the composition there stays readable as
// a picture. Nothing here composes terrain; everything here is placed ON it,
// and every coordinate is checked against the flood in route8.mjs before the
// files are written.
//
// THE ACT 5 RULE THIS FILE IS WRITTEN TO. Canon says the weather turns across
// the whole region and the world visibly responds. On a mountain road that
// cannot be a person saying "the weather has turned" -- it has to be five
// people doing their own jobs differently and none of them connecting it to
// each other. A shepherd is down a month early. A charcoal burner cannot get a
// dry stack. An ice cutter has the wrong thickness on his gauge. A Foundation
// hydrologist has instruments that disagree with each other and is honestly
// puzzled by it. Nobody on this road knows anything. Put together, they are the
// only warning the player gets.

const trainer = (id, x, y, sprite, facing = 'down', sight = 3, movement = { kind: 'static' }) => ({
  id, sprite, x, y, facing, movement, trainer: id, sightRange: sight,
});
const talker = (id, x, y, sprite, facing = 'down', movement = { kind: 'static' }) => ({
  id, sprite, x, y, facing, movement, script: id,
});
const sign = (x, y, text) => ({ kind: 'sign', x, y, text });
const note = (x, y, text) => ({ kind: 'script', x, y, text });
const item = (x, y, id, quantity, flag) => ({ kind: 'item', x, y, item: id, quantity, flag });
const hidden = (x, y, id, quantity, flag) => ({ kind: 'hiddenItem', x, y, item: id, quantity, flag });

export function populate(eight, kiln, pass) {
  /* ------------------------------------------------------------- ROUTE 8 */

  eight.npcs = [
    // The last of the low country, and the first person to say the wrong thing
    // about the weather without knowing it is the wrong thing.
    trainer('r8_drover', 76, 20, 'villager_m', 'left', 3),
    talker('r8_shepherd', 73, 27, 'villager_f', 'up'),
    // The coachman who brought word down. This is Tarin's Act 5 beat as the
    // road sees it -- see src/systems/tarin.ts, `snowroad`. He is two days
    // ahead in the wrong coat and the player hears it from a stranger.
    talker('r8_coachman', 66, 19, 'porter', 'down'),
    trainer('r8_forester', 60, 25, 'hiker', 'up', 3),
    talker('r8_pineman', 51, 12, 'villager_m', 'down', { kind: 'lookAround' }),
    // The Foundation station: an agent on the gate and a hydrologist inside
    // who is telling the truth as she has it.
    trainer('r8_agent', 40, 24, 'meridian', 'up', 3),
    talker('r8_hydro', 38, 31, 'meridian_sci_f', 'down'),
    trainer('r8_carter', 34, 13, 'porter', 'left', 3),
    talker('r8_roadman', 31, 12, 'villager_m', 'down'),
    trainer('r8_warden', 11, 11, 'hiker', 'right', 4),
  ];

  eight.objects = [
    sign(72, 24, [
      'A field gate, and a board wired to the top bar of it.',
      'THE LAST GATE. SHUT IT BEHIND YOU. THERE IS NOTHING TO SHUT AFTER THIS ONE.',
      'Somebody has added, in a different hand: THAT IS NOT A JOKE.',
    ]),
    note(69, 24, [
      'A milestone, cut by the same yard that cut the ones on the Central Road.',
      'FROSTMERE XVIII. AURELINE II.',
      'The north face has an inch of snow on it. It is not the month for that.',
    ]),
    sign(56, 22, [
      'A forestry board at the mouth of the spur.',
      'CHARCOAL HOLLOW. HAULAGE ONLY. NO FIRES OFF THE PIT.',
      'The chalk under it says: BURNERS DOWN EARLY. WOOD WET. ASK ME WHY, I DO NOT KNOW.',
    ]),
    sign(38, 25, [
      'A notice bolted to the fence of the Foundation station.',
      'MERIDIAN FOUNDATION - NORTHWEST WEATHER STATION 4. READINGS PUBLIC ON REQUEST.',
      'Under it, a printed card: WE ARE AS SURPRISED AS YOU ARE. PLEASE DO ASK.',
    ]),
    note(44, 19, [
      'A milestone. FROSTMERE XII.',
      'Somebody has scratched a second line under the number: AND ALL OF IT UP.',
    ]),
    sign(31, 17, [
      'A road board at the fork, newer than everything round it.',
      'OLD ROAD CLOSED. SLIDE. USE THE HIGH ROAD AND KEEP THE CAIRNS ON YOUR RIGHT.',
      'The date on the corner is this year. This month.',
    ]),
    note(24, 16, [
      'The slide, close to. Snow, shattered rock, and pine snapped off at the root.',
      'The trees are lying with their heads pointing down the valley, all of them.',
      'The road is somewhere under it. There is no telling how deep.',
    ]),
    note(13, 12, [
      'A milestone, half buried, leaning downhill.',
      'FROSTMERE V.',
      'Somebody has dug the face clear this week and left the shovel against it.',
    ]),
    sign(11, 7, [
      'A weathered board at the foot of a rock bench, forty feet up.',
      'There is something on the shelf up there. Nothing on this face is a hold.',
      'A gust off the col lifts loose snow up the rock and keeps it there. Not you. Not yet.',
    ]),
    // The cairn line, described once so the player understands what it is FOR.
    note(27, 9, [
      'A cairn, shoulder high, with a pale capstone somebody chose for being pale.',
      'From here you can see the next one. From that one you will see the one after.',
      'That is the whole system, and in this country it is enough.',
    ]),
    item(59, 9, 'great_potion', 2, 'item_r8_pinewood'),
    item(76, 32, 'strong_potion', 2, 'item_r8_pasture'),
    item(43, 33, 'full_heal', 2, 'item_r8_station'),
    item(21, 25, 'fine_vessel', 5, 'item_r8_below_slide'),
    item(6, 4, 'full_restore', 1, 'item_r8_shelf'),
    hidden(64, 35, 'ward_incense', 2, 'item_r8_hidden_wood'),
    hidden(7, 14, 'rouse', 2, 'item_r8_hidden_snow'),
  ];

  /* -------------------------------------------------------- ROUTE 8 KILN */

  kiln.npcs = [
    trainer('r8k_burner', 12, 16, 'villager_f', 'right', 3),
    talker('r8k_boy', 21, 19, 'kid', 'left', { kind: 'lookAround' }),
  ];
  kiln.objects = [
    sign(13, 21, [
      'A tally board on a post, the kind kept in pencil and never rubbed out.',
      'BURNS THIS SEASON: 9. LAST SEASON BY NOW: 21.',
      'The last four have a line through them and one word beside each: WET.',
    ]),
    sign(22, 11, [
      'A rule board, painted forty years ago and repainted every one since.',
      'THE PIT IS NEVER OUT. WHOEVER IS LAST BANKS IT.',
      'Under the paint, in the wood, somebody has carved: IT HAS NOT BEEN OUT SINCE 1102.',
    ]),
    note(17, 17, [
      'The kiln. A ring of stacked stone with the last burn banked down inside it.',
      'The air above it wobbles. Snow coming down into it does not arrive.',
      'It is the only warm thing between here and the top of the pass.',
    ]),
    item(24, 20, 'strong_potion', 3, 'item_r8k_stack'),
    hidden(10, 19, 'deep_vessel', 3, 'item_r8k_hidden_cord'),
  ];

  /* -------------------------------------------------------- ROUTE 8 PASS */

  pass.npcs = [
    trainer('r8p_packman', 61, 26, 'porter', 'left', 3),
    talker('r8p_gauge', 53, 27, 'dockhand', 'right'),
    trainer('r8p_iceman', 51, 25, 'dockhand', 'down', 3),
    trainer('r8p_lakewarden', 29, 25, 'hiker', 'right', 4),
    talker('r8p_pilgrim', 23, 12, 'elder', 'down'),
    trainer('r8p_gatewarden', 17, 20, 'villager_m', 'left', 4),
  ];
  pass.objects = [
    note(59, 30, [
      'A milestone with only two letters left on it and a cairn built round the stump.',
      'Whoever built the cairn did not move the stone. They built the cairn round it.',
    ]),
    sign(56, 24, [
      'A board on two legs, guyed down with wire.',
      'THE LAKE IS NOT A ROAD. THE ROAD IS A ROAD. IT GOES ROUND. IT IS NOT LONGER THAN A FUNERAL.',
      'The wire has been replaced recently, and the old wire is coiled neatly under it.',
    ]),
    sign(50, 27, [
      'A gauge board driven into the beach, marked off in inches.',
      'SOUND ICE AT 8. THIS WEEK: 6, 6, 5, 7, 4.',
      'Five readings in five days and no two of them going the same way.',
    ]),
    note(30, 26, [
      'The cut, kept open all winter for water, and something pale lying on the islet.',
      'Nobody has been out to it. Nobody is going to walk out to it either.',
      'The margin here is grey where it should be white. Grey ice is ice with water in it.',
    ]),
    sign(67, 27, [
      'A board where the road leaves the last of the trees.',
      'NO WOOD ABOVE THIS POINT. NO SHELTER FOR FOUR MILES EXCEPT THE REFUGE.',
      'KEEP THE CAIRNS ON YOUR RIGHT GOING UP AND ON YOUR LEFT COMING DOWN.',
    ]),
    note(20, 12, [
      'The refuge: four drystone walls, no roof, and a hearth full of old snow.',
      'A slate by the door has names scratched on it in three different centuries.',
      'The last one is from Tuesday, in a hurried hand, and it is not a name. It is: THANK YOU.',
    ]),
    note(35, 17, [
      'A milestone. FROSTMERE II.',
      'From here the road goes down. That is the first time it has done that in nine miles.',
    ]),
    sign(8, 23, [
      'A board at the top of the descent, facing the way you came.',
      'FROSTMERE BELOW. THE OBSERVATORY IS THE LIGHT ABOVE THE TOWN.',
      'IF THE LIGHT IS ON, SOMEBODY IS UP THERE. IT HAS BEEN ON A LONG TIME.',
    ]),
    note(64, 20, [
      'A milestone lying on its side with three stones stacked on top of it.',
      'The stack is not a cairn. It is the mark for where the milestone is, under the snow.',
    ]),
    item(69, 38, 'great_potion', 3, 'item_r8p_eastdrift'),
    item(26, 8, 'full_restore', 1, 'item_r8p_refuge'),
    item(55, 9, 'warden_vessel', 3, 'item_r8p_highdrift'),
    item(41, 27, 'full_rouse', 2, 'item_r8p_islet'),
    item(14, 22, 'full_heal', 3, 'item_r8p_gate'),
    hidden(45, 40, 'thawcloth', 4, 'item_r8p_hidden_south'),
    hidden(4, 30, 'ward_incense', 2, 'item_r8p_hidden_col'),
  ];
}
