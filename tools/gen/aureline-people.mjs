// The people, the signs and the pickups of Aureline, kept apart from the
// geometry so a district can be moved without retyping a crowd.
//
// Nobody in this file is a member of the cast. Lyra, Tarin, Cassian and the
// commander belong to whoever writes the Act 4 events, and putting a second
// Lyra on the pavement outside the headquarters would be exactly the join
// nobody owns. What is here is the hundred and sixty thousand other people:
// what they think of the Foundation, what the city costs, and who is walking
// past while the story happens.

export const NPCS = [
  // --- Southgate, the wall, and Candlerow -------------------------------
  ['au_gatewarden', 'clerk', 68, 113, 'down', { kind: 'static' }],
  ['au_gate_carter', 'porter', 75, 110, 'left', { kind: 'pace', axis: 'y', distance: 3 }],
  ['au_gate_child', 'kid', 66, 108, 'down', { kind: 'wander', radius: 2 }],
  ['au_candlerow_baker', 'villager_f', 30, 99, 'down', { kind: 'static' }],
  ['au_candlerow_lamps', 'villager_m', 46, 105, 'left', { kind: 'pace', axis: 'x', distance: 4 }],
  ['au_archivist', 'elder', 27, 98, 'down', { kind: 'static' }],
  ['au_wallwalker', 'elder', 12, 113, 'right', { kind: 'lookAround' }],
  ['au_candlerow_kid', 'kid', 55, 99, 'up', { kind: 'wander', radius: 3 }],
  ['au_market_fishwife', 'merchant', 99, 104, 'down', { kind: 'static' }],
  ['au_market_wire', 'merchant', 106, 104, 'down', { kind: 'static' }],
  ['au_streetsinger', 'townsfolk_f', 88, 111, 'down', { kind: 'lookAround' }],
  ['au_candlerow_sceptic', 'townsfolk_m', 84, 99, 'right', { kind: 'static' }],

  // --- The Long Mile ----------------------------------------------------
  ['au_mile_guide', 'clerk', 65, 100, 'right', { kind: 'static' }],
  ['au_mile_tourist', 'hiker', 76, 96, 'up', { kind: 'lookAround' }],
  ['au_mile_flowers', 'villager_f', 64, 78, 'right', { kind: 'static' }],
  ['au_mile_courier', 'porter', 77, 66, 'up', { kind: 'pace', axis: 'y', distance: 5 }],
  ['au_mile_objector', 'townsfolk_m', 65, 60, 'right', { kind: 'static' }],
  ['au_mile_constable', 'clerk', 76, 45, 'left', { kind: 'pace', axis: 'y', distance: 4 }],
  ['au_mile_boy', 'kid', 71, 84, 'down', { kind: 'wander', radius: 2 }],
  ['au_mile_countrywoman', 'villager_f', 64, 34, 'right', { kind: 'lookAround' }],

  // --- The Arcades ------------------------------------------------------
  ['au_arcade_shopgirl', 'villager_f', 83, 72, 'down', { kind: 'static' }],
  ['au_emporium_doorman', 'porter', 105, 72, 'down', { kind: 'static' }],
  ['au_teahouse_owner', 'elder', 90, 82, 'down', { kind: 'static' }],
  ['au_arcade_kid', 'kid', 95, 74, 'left', { kind: 'wander', radius: 3 }],
  ['au_clinic_nurse', 'healer', 86, 62, 'down', { kind: 'static' }],
  ['au_provisioner_boy', 'kid', 95, 62, 'right', { kind: 'static' }],
  ['au_arcade_busker', 'townsfolk_f', 100, 83, 'down', { kind: 'lookAround' }],
  ['au_arcade_country', 'hiker', 79, 63, 'up', { kind: 'static' }],

  // --- Eastfield Rows ---------------------------------------------------
  ['au_east_innkeeper', 'villager_f', 131, 85, 'down', { kind: 'static' }],
  ['au_east_shift', 'townsfolk_m', 136, 63, 'left', { kind: 'pace', axis: 'x', distance: 4 }],
  ['au_east_skyreach', 'merchant', 121, 70, 'down', { kind: 'static' }],
  ['au_east_child', 'kid', 143, 77, 'up', { kind: 'wander', radius: 3 }],

  // --- The Greatpark ----------------------------------------------------
  ['au_park_keeper', 'villager_f', 35, 62, 'down', { kind: 'static' }],
  ['au_park_painter', 'elder', 38, 73, 'up', { kind: 'static' }],
  ['au_park_child', 'kid', 52, 73, 'left', { kind: 'wander', radius: 4 }],
  ['au_park_rower', 'fisher', 10, 73, 'right', { kind: 'lookAround' }],
  ['au_park_botanist', 'villager_m', 44, 80, 'down', { kind: 'static' }],
  ['au_park_pensioner', 'elder', 21, 74, 'down', { kind: 'static' }],
  ['au_park_runner', 'townsfolk_f', 30, 82, 'down', { kind: 'pace', axis: 'y', distance: 5 }],
  ['au_park_hallkeeper', 'concord', 48, 66, 'left', { kind: 'static' }],

  // --- The Spires -------------------------------------------------------
  ['au_spires_broker', 'merchant', 84, 33, 'down', { kind: 'static' }],
  ['au_spires_window', 'dockhand', 96, 36, 'left', { kind: 'static' }],
  ['au_spires_lost', 'hiker', 89, 21, 'up', { kind: 'lookAround' }],
  ['au_skydeck_attendant', 'clerk', 106, 51, 'down', { kind: 'static' }],
  ['au_spires_courier', 'porter', 112, 30, 'right', { kind: 'pace', axis: 'y', distance: 6 }],

  // --- The Meridian District --------------------------------------------
  ['au_mer_reception', 'meridian', 43, 41, 'down', { kind: 'static' }],
  ['au_mer_guard_west', 'meridian', 33, 41, 'down', { kind: 'static' }],
  ['au_mer_guard_east', 'meridian', 49, 41, 'down', { kind: 'static' }],
  ['au_mer_scientist', 'meridian_sci', 57, 44, 'left', { kind: 'lookAround' }],
  ['au_mer_oceanographer', 'meridian_sci_f', 30, 49, 'right', { kind: 'static' }],
  ['au_mer_docent', 'clerk', 33, 12, 'down', { kind: 'static' }],
  ['au_mer_intern', 'meridian', 40, 18, 'down', { kind: 'pace', axis: 'x', distance: 4 }],
  ['au_mer_relief', 'meridian_sci', 60, 13, 'down', { kind: 'static' }],
  ['au_square_sitter', 'elder', 34, 50, 'down', { kind: 'static' }],
  ['au_square_child', 'kid', 46, 50, 'up', { kind: 'wander', radius: 3 }],

  // --- The Transit District ---------------------------------------------
  ['au_station_porter', 'porter', 126, 107, 'up', { kind: 'pace', axis: 'x', distance: 4 }],
  ['au_station_clerk', 'clerk', 131, 106, 'down', { kind: 'static' }],
  ['au_station_frostmere', 'townsfolk_f', 121, 110, 'right', { kind: 'static' }],
  ['au_station_traveller', 'hiker', 137, 109, 'left', { kind: 'lookAround' }],
  ['au_station_kid', 'kid', 133, 112, 'down', { kind: 'wander', radius: 3 }],

  // --- Highwater Terraces ------------------------------------------------
  ['au_high_washer', 'villager_f', 8, 29, 'down', { kind: 'static' }],
  ['au_high_boy', 'kid', 14, 43, 'left', { kind: 'wander', radius: 3 }],
  ['au_high_old', 'elder', 5, 50, 'right', { kind: 'static' }],
  ['au_high_builder', 'dockhand', 16, 16, 'down', { kind: 'static' }],
  ['au_high_teacher', 'villager_m', 10, 9, 'down', { kind: 'static' }],

  // --- The Summit Training Complex ---------------------------------------
  ['au_summit_gate', 'clerk', 132, 18, 'up', { kind: 'static' }],
  ['au_summit_hopeful', 'hiker', 136, 18, 'up', { kind: 'lookAround' }],
];

export const SIGNS = [
  [70, 112, ['AURELINE. Southgate.',
    'Population one hundred and sixty-one thousand at the last count, which was four years ago.',
    'Keep left on the Mile. Carriages have right of way and know it.']],
  [66, 96, ['THE LONG MILE. Southgate to Campus Row, one mile and a hundred and forty paces.',
    'Laid across four hundred houses that were here first. Nobody wrote down where they went.']],
  [24, 100, ['CANDLEROW. The oldest street in Caelora that people still live on.',
    'The city was this, and only this, for two hundred years.']],
  [65, 73, ['THE GREATPARK. Open dawn to dusk. Kin roam free.',
    'Do not feed them, do not catch them, do not carry them off. They live here. You are visiting.']],
  [77, 60, ['THE ARCADES. Clinic and Provisioner on the corner. Everything else, further in.',
    'Somebody has added, in pencil: AND NOTHING YOU NEED.']],
  [78, 22, ['THE SPIRES. Nine of the ten tallest buildings in Caelora are on this street.',
    'Forty floors to a tower and not one of the doors is yours. Try the Courant, halfway down.']],
  [65, 21, ['CAMPUS ROW. The Meridian Foundation, and the way in to Meridian Square.',
    'THE FOUNDATION WELCOMES VISITORS is painted under it, in their blue, quite recently.']],
  [40, 52, ['MERIDIAN SQUARE.',
    'The plaque on the basin: FOR THOSE THE WEATHER TOOK. Given by Dr C. Veyl.',
    'There are a great many names on it. None of them is Elias.']],
  [112, 94, ['ARRIVALS: Stonewake, Tideglass, Emberfall, the Eastern Halt.',
    'DEPARTURES: as above, and one board that says FROSTMERE - SUSPENDED, WEATHER.']],
  [116, 108, ['AURELINE CENTRAL. Mind the gap, mind the step, mind the Kin on the line.',
    'Nine hundred trains a week. The shed took eleven years and two collapses to build.']],
  [131, 20, ['THE SUMMIT TRAINING COMPLEX.',
    'ADMISSION: EIGHT BOND CRESTS. No exceptions, no appointments, no exceptions.',
    'Someone has scratched a fifth mark under a row of four. It is not yours.']],
  [4, 21, ['HIGHWATER TERRACES. Rows one to eighty-four.',
    'Built in nine years for the people the Mile displaced. Nobody has ever called it enough.']],
  [116, 57, ['EASTFIELD ROWS. Rents posted at the corner shop.',
    'Every window on this street looks at another window on this street.']],
  [60, 89, ['THE CROSSWAY runs west to the Greatpark gate and east to the station.',
    'STATION ROAD, south, is the way to Aureline Central. Allow twenty minutes. Allow forty.']],
  [21, 57, ['WESTWAY ENDS HERE.',
    'It was going to go through the park. The park won. That was ninety years ago and the sign has never been changed.']],
];

export const EXTRA_SIGNS = [
  [100, 34, ['THE AURELINE COURANT. Founded eighty-one years ago. Printed here since.',
    'The board by the door: MERIDIAN DECLINE TO COMMENT. Day 604.']],
  [86, 53, ['THE NATIONAL MUSEUM OF CAELORA. Free, always. Aurelian galleries, ground floor.',
    'A hand-lettered card by the entrance: CASE 9 IS EMPTY WHILE THE PIECE IS ON LOAN.']],
  [55, 68, ['THE GREAT GLASSHOUSE. Please close the door behind you. The heat is the exhibit.']],
  [40, 24, ['MERIDIAN FOUNDATION - HEAD OFFICE. Deliveries to the yard.',
    'The yard gate is chained and the chain is new.']],
];

export const ITEMS = [
  ['item', 8, 110, 'full_restore', 1, 'item_au_wallwalk'],
  ['hiddenItem', 18, 8, 'fine_vessel', 2, 'item_au_highwater'],
  ['item', 61, 19, 'great_potion', 1, 'item_au_campus'],
  ['hiddenItem', 26, 24, 'escape_line', 1, 'item_au_yard'],
  ['item', 9, 61, 'warden_vessel', 1, 'item_au_parkgate'],
  ['hiddenItem', 33, 86, 'full_heal', 1, 'item_au_parkshade'],
  ['item', 110, 36, 'strong_potion', 1, 'item_au_spirealley'],
  ['hiddenItem', 108, 74, 'dusk_vessel', 2, 'item_au_arcadeback'],
  ['item', 146, 87, 'full_rouse', 1, 'item_au_eastfield'],
  ['hiddenItem', 144, 113, 'ward_incense', 1, 'item_au_cabrank'],
  ['item', 30, 45, 'coolsalve', 2, 'item_au_square'],
  ['hiddenItem', 79, 20, 'net_vessel', 2, 'item_au_spirefoot'],
];

// The Kin of the Greatpark. Nobody owns them, nobody moves them on, and the
// keeper has refused four times to put a fence round them. They are drawn
// rather than fought: a capital park is not a hunting ground, and the one place
// in Aureline that breathes should not turn out to be a corridor with teeth.
export const PARK_KIN = [
  ['nibbet', 16, 62], ['nibbet', 44, 62], ['tuftail', 8, 66], ['tuftail', 55, 84],
  ['pipwing', 40, 66], ['pipwing', 20, 80], ['sprigling', 52, 79], ['sprigling', 6, 84],
  ['bristlebuck', 43, 87], ['pebblet', 27, 85], ['fizzlet', 58, 74], ['gravelet', 14, 81],
  ['mossback', 60, 63], ['kestrelle', 34, 60], ['tallowmoth', 51, 71], ['nibbet', 25, 79],
  ['gullswift', 24, 71], ['rilltail', 36, 70], ['tuftail', 47, 84], ['pipwing', 61, 87],
];
