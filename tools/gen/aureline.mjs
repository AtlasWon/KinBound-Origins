// Rebuilds data/maps/aureline.json from scratch.
//
//   node tools/gen/aureline.mjs data/maps/aureline.json
//
// IT OVERWRITES THE MAP. Aureline is the one map in the game that was composed
// rather than typed -- eighteen thousand cells is past the size a person edits
// as text -- so this is kept as the source of the composition and of the checks
// that go with it. Small changes since should be made in the JSON as usual and
// this left alone; if it is ever run again, diff the result before keeping it.
// The checks at the bottom are the valuable part and are worth reading whatever
// you do with the top: reachability from the south gate, street furniture that
// would pinch a route, and the same flood run again with the whole crowd on its
// feet.
//
// Aureline is 152x120 -- eighteen thousand cells, three and a third times
// Tideglass -- and at that size a map is not typed, it is composed. This lays
// the street skeleton first, packs district blocks into everything left, and
// then checks the result: every walkable cell reachable from the south gate,
// every door standing in a frontage with pavement under it, and no lamp, tree,
// bench or railing anywhere that would pinch a route shut.
import { writeFileSync } from 'node:fs';
import { NPCS, SIGNS, EXTRA_SIGNS, ITEMS, PARK_KIN } from './aureline-people.mjs';
import { LEGEND, PLAN } from './aureline-legend.mjs';

const W = 152, H = 120;

let seed = 20260825;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length) % a.length];
const ri = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

const g = Array.from({ length: H }, () => Array(W).fill('T'));
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; };
const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? g[y][x] : 'T');
const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
const row = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) set(x, y, c); };
const col = (y0, y1, x, c) => { for (let y = y0; y <= y1; y++) set(x, y, c); };

const warps = [], doors = [], deco = [];
let built = 0;
/**
 * A double door, and the only kind Aureline has.
 *
 * Every interior behind these was authored with two leaves side by side, so the
 * exterior has to be two cells wide as well -- and toX/toY has to name the
 * interior's OWN door tile, leaf for leaf, or the left-hand leaf outside opens
 * onto the right-hand leaf inside and the player walks through a wall to get to
 * the mat.
 */
const door = (x, y, toMap, note, inX, inY) => {
  warps.push({ x, y, toMap, toX: inX, toY: inY, facing: 'up', style: 'door' });
  warps.push({ x: x + 1, y, toMap, toX: inX + 1, toY: inY, facing: 'up', style: 'door' });
  doors.push({ x, y, toMap, note, leaves: 2 });
};
/** Queue a piece of street furniture. Nothing is placed until it is proved safe. */
const dec = (x, y, c) => deco.push([x, y, c]);

rect(3, 3, W - 4, H - 4, '═');

/* --------------------------------------------------------------- the roads */

const streetH = (x0, x1, y0, y1) => { rect(x0, y0, x1, y1, '═'); rect(x0, y0 + 1, x1, y1 - 1, '▬'); };
const streetV = (y0, y1, x0, x1) => { rect(x0, y0, x1, y1, '═'); rect(x0 + 1, y0, x1 - 1, y1, '▬'); };

// THE LONG MILE: footway, carriageway, planted median, carriageway, footway.
// Ninety-six rows from the south gate to Campus Row, and it does not run off
// the top of the map -- an avenue has to end on something, and this one ends on
// the Meridian Foundation, which is the whole geography of the act in one line.
rect(66, 23, 77, H - 4, '═');
rect(68, 23, 70, H - 4, '▬');
rect(73, 23, 75, H - 4, '▬');

streetV(3, 114, 20, 24);          // Westway
streetV(3, 114, 111, 115);        // Eastway
streetH(3, 148, 20, 22);          // Campus Row
streetH(3, 148, 53, 57);          // the Crossway
streetH(3, 148, 89, 93);          // Station Road

/* ------------------------------------------------------- building stampers */

const tower = (x, y, w, h, doorsAt = []) => {
  built++;
  set(x, y, '┌'); row(x + 1, x + w - 2, y, '─'); set(x + w - 1, y, '┐');
  const pierEvery = w >= 13 ? 6 : w >= 8 ? 5 : 4;
  for (let yy = y + 1; yy <= y + h - 2; yy++) {
    for (let i = 0; i < w; i++) set(x + i, yy, (i === 0 || i === w - 1 || i % pierEvery === 0) ? '█' : '▓');
  }
  row(x, x + w - 1, y + h - 1, '▄');
  for (const dx of doorsAt) set(x + dx, y + h - 1, '╬');
};

const parade = (x, y, w, h, doorsAt = []) => {
  tower(x, y, w, h - 2, []);
  row(x, x + w - 1, y + h - 2, '▐');
  row(x, x + w - 1, y + h - 1, '▌');
  for (const dx of doorsAt) set(x + dx, y + h - 1, '╬');
};

const OLD_ROOFS = [['[', '^', ']'], ['[', '^', ']'], ['(', '&', ')'], ['<', '%', '>']];
const oldBlock = (x, y, w, h, doorsAt = []) => {
  built++;
  const [l, m, r] = pick(OLD_ROOFS);
  set(x, y, l); row(x + 1, x + w - 2, y, m); set(x + w - 1, y, r);
  const every = pick([2, 3, 3, 4]);
  const off = ri(0, every - 1);
  for (let yy = y + 1; yy <= y + h - 1; yy++) {
    for (let i = 0; i < w; i++) set(x + i, yy, (i + off) % every === 1 ? '▫' : '▪');
  }
  for (const dx of doorsAt) set(x + dx, y + h - 1, '◘');
};

const tenement = (x, y, w, h, doorsAt = []) => {
  built++;
  if (rnd() > 0.4) { set(x, y, '<'); row(x + 1, x + w - 2, y, '%'); set(x + w - 1, y, '>'); }
  else { set(x, y, '('); row(x + 1, x + w - 2, y, '&'); set(x + w - 1, y, ')'); }
  const wall = pick(['M', 'M', 'M', 'H']);
  const every = pick([2, 2, 3]);
  const off = ri(0, every - 1);
  for (let yy = y + 1; yy <= y + h - 1; yy++) {
    for (let i = 0; i < w; i++) {
      set(x + i, yy, (i + off) % every === 1 ? (yy === y + h - 1 ? 'd' : 'Z') : wall);
    }
  }
  for (const dx of doorsAt) set(x + dx, y + h - 1, 'i');
};

const meridianBlock = (x, y, w, h, doorsAt = [], crests = []) => {
  built++;
  set(x, y, '┌'); row(x + 1, x + w - 2, y, '─'); set(x + w - 1, y, '┐');
  for (let yy = y + 1; yy <= y + h - 1; yy++) {
    for (let i = 0; i < w; i++) set(x + i, yy, (i === 0 || i === w - 1 || i % 6 === 0) ? '╔' : '╗');
  }
  for (const [cx, cy] of crests) set(x + cx, y + cy, '╦');
  for (const dx of doorsAt) set(x + dx, y + h - 1, '╩');
};

/** Iron and glass: the Great Glasshouse, in the game's own laboratory kit. */
const glasshouse = (x, y, w, h) => {
  built++;
  row(x, x + w - 1, y, 'v');
  for (let i = 0; i < w; i++) set(x + i, y + 1, i % 3 === 1 ? 'y' : 'v');
  for (let yy = y + 2; yy <= y + h - 1; yy++) {
    for (let i = 0; i < w; i++) set(x + i, yy, (i === 0 || i === w - 1) ? 'l' : 'n');
  }
  const mid = x + Math.floor(w / 2) - 1;
  set(mid, y + h - 1, 'q'); set(mid + 1, y + h - 1, 'u');
  return mid;
};

const civic = (x, y, w, kind) => {
  built++;
  const [l, m, r, pk, em] = kind === 'heal' ? ['1', '2', '3', '4', '5'] : ['6', '7', '8', '9', '0'];
  const mid = x + Math.floor(w / 2);
  set(x, y, l); row(x + 1, x + w - 2, y, pk); set(x + w - 1, y, r);
  set(x, y + 1, l); row(x + 1, x + w - 2, y + 1, m); set(x + w - 1, y + 1, r); set(mid, y + 1, em);
  row(x, x + w - 1, y + 2, 'G');
  set(mid - 1, y + 2, kind === 'heal' ? 'h' : 'm');
  set(mid, y + 2, 'g'); set(mid + 1, y + 2, 'g');
  return mid;
};

/**
 * Fill one band of a district with buildings, edge to edge.
 *
 * Scale here is carried by frontage, not by footprint: what makes a capital
 * feel like one from street level is that the buildings never stop. So a band
 * is packed across its whole width and a gap between neighbours is one cell --
 * a service passage, not a garden -- which is how Tideglass's terraces are laid
 * and the only thing that gets four hundred roofs onto one map.
 */
const fillBand = (x0, x1, y, h, stamp, wLo, wHi, gapChance = 0.25) => {
  let x = x0;
  while (x <= x1) {
    let w = ri(wLo, wHi);
    if (x + w - 1 > x1) w = x1 - x + 1;
    if (w < 3) break;
    stamp(x, y, w, h, []);
    x += w + (rnd() < gapChance ? 1 : 0);
  }
};

/* ------------------------------------------------- 1. HIGHWATER TERRACES */
// The densest housing in Caelora, and the first honest answer the city gives to
// "how many people live here": rank after rank of tenement rows with nothing
// between them but a service passage.
{
  for (const y of [3, 10]) fillBand(3, 19, y, 5, tenement, 3, 5);
  fillBand(3, 19, 17, 3, tenement, 3, 5);
  for (const y of [23, 30, 37, 44]) fillBand(3, 19, y, 5, tenement, 3, 5);
  fillBand(3, 19, 51, 2, tenement, 3, 5);
  tenement(11, 17, 6, 3, [1, 2]);
  door(12, 19, 'aureline_house_a', 'a Highwater Terraces flat: two rooms up a common stair, and a view of the next terrace', 7, 11);
  tenement(11, 44, 6, 5, [1, 2]);
  door(12, 48, 'aureline_house_b', 'the flat below it, and the one the landlord actually lives in', 7, 11);
  for (const y of [9, 16, 29, 36, 43, 50]) { dec(4, y, '☼'); dec(18, y, '☼'); }
  for (const y of [16, 36]) dec(11, y, '♣');
}

/* -------------------------------------------------- 2. MERIDIAN DISTRICT */
// The campus, the tower and the square. Everything the Foundation owns is
// whiter and newer than the street it stands on, and none of it is hiding.
{
  // The campus runs the whole width of the head of the Mile, so the avenue
  // ends on the Foundation and the player has walked ninety rows to be told so.
  meridianBlock(26, 3, 16, 9, [], [[3, 4], [12, 4]]);
  meridianBlock(43, 3, 12, 9, []);
  meridianBlock(56, 3, 9, 9, []);
  meridianBlock(66, 3, 12, 12, [], [[5, 3], [6, 3]]);
  // THE CAMPUS GROUNDS. Lawn, not paving: the Foundation spends money on being
  // liked, and a lawn in front of a headquarters is the cheapest way there is.
  rect(26, 12, 65, 19, '.');
  rect(66, 16, 77, 19, '═');
  row(26, 65, 12, '▒'); row(26, 65, 19, '▒');
  for (const x of [32, 44, 56]) col(12, 19, x, '▒');
  for (const [x0, y0, x1, y1] of [[27, 13, 31, 18], [45, 13, 55, 18]]) {
    rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, '*');
    for (let x = x0; x <= x1; x++) { dec(x, y0, '♠'); dec(x, y1, '♠'); }
    for (let y = y0; y <= y1; y++) { dec(x0, y, '♠'); dec(x1, y, '♠'); }
    dec(Math.floor((x0 + x1) / 2), Math.floor((y0 + y1) / 2), 'a');
  }
  for (const [x, y] of [[35, 14], [40, 17], [58, 14], [62, 17], [37, 13]]) dec(x, y, 'T');
  for (const x of [34, 42, 50, 58]) dec(x, 18, '☼');
  for (const x of [68, 76]) dec(x, 18, '☼');
  dec(72, 17, '◆');
  // Two low wings, so the campus is a place and not a field.
  meridianBlock(33, 14, 10, 4, []);
  meridianBlock(57, 14, 8, 4, []);

  // The service yard behind the tower: hoarding, and a gate nobody opens.
  rect(25, 23, 63, 25, '═');
  for (let x = 26; x <= 62; x++) if (x % 9 !== 4) dec(x, 23, '¯');
  for (const x of [27, 31, 42, 46, 57, 61]) dec(x, 24, '¾');
  for (const x of [35, 52]) dec(x, 24, '³');
  for (const x of [39, 49]) dec(x, 25, '²');
  for (const x of [29, 44, 59]) dec(x, 25, '¾');

  // THE TOWER. Thirty columns and fifteen rows of white composite and deep blue
  // glass -- the only building in Caelora whose top and foot cannot be on the
  // screen at once. Its doors are 40,40 and 41,40, the pair the four interior
  // maps already exit onto.
  meridianBlock(26, 26, 30, 15, [14, 15], [[6, 5], [23, 5], [14, 2], [15, 2]]);
  door(40, 40, 'aureline_meridian', 'THE MERIDIAN FOUNDATION, head office -- the public lobby, and the only way to every floor above and below it', 12, 19);

  // MERIDIAN SQUARE.
  rect(25, 41, 65, 52, '═');
  rect(35, 44, 46, 49, '○');
  rect(40, 46, 41, 49, '═');
  dec(40, 46, '◆'); dec(41, 46, '◆');
  for (const [x0, y0, x1, y1] of [[28, 44, 32, 49], [49, 44, 53, 49]]) {
    rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, '*');
    for (let x = x0; x <= x1; x++) { dec(x, y0, '♠'); dec(x, y1, '♠'); }
    for (let y = y0; y <= y1; y++) { dec(x0, y, '♠'); dec(x1, y, '♠'); }
    dec(Math.floor((x0 + x1) / 2), Math.floor((y0 + y1) / 2), 'a');
  }
  for (let x = 27; x <= 63; x += 4) { if (x < 36 || x > 46) dec(x, 43, '♣'); dec(x + 1, 52, '♣'); }
  for (const x of [26, 34, 47, 55, 63]) dec(x, 42, '☼');
  for (const x of [30, 38, 43, 51, 59]) dec(x, 51, '☼');
  for (const x of [33, 48, 57]) dec(x, 50, '♦');
  for (const x of [37, 44]) dec(x, 42, '♦');
  for (let y = 42; y <= 52; y++) if (y !== 46 && y !== 47) dec(25, y, '╫');
  for (let y = 44; y <= 50; y++) if (y !== 46 && y !== 47) dec(65, y, '╫');
  for (const x of [56, 60]) dec(x, 45, '◆');
}

/* --------------------------------- 3. CENTRAL DISTRICT -- THE SPIRES */
// The skyline, and the reason a capital has one. Towers between seven and
// sixteen rows, shoulder to shoulder, with alleys between them a player can see
// the sky down and nothing else.
{
  const canyon = (x0, x1, y, h) => {
    let x = x0;
    while (x <= x1 - 4) {
      let w = ri(4, 9);
      if (x + w - 1 > x1) w = x1 - x + 1;
      if (w < 4) break;
      tower(x, y, w, h + ri(-2, 3));
      x += w + (rnd() < 0.35 ? 1 : 0);
    }
  };
  canyon(79, 110, 3, 14);
  canyon(78, 110, 23, 11);
  canyon(96, 110, 37, 12);
  // THE NATIONAL MUSEUM. Granite, eight rows and sixteen columns, on the corner
  // of the Crossway and the Mile with forty rows of glass standing over it --
  // which is the seam between the old city and the new one made into one view.
  // It is the only building in the Spires that is not a tower and the only one
  // whose front door is on the boulevard.
  tower(78, 37, 8, 7);
  tower(87, 37, 8, 7);
  oldBlock(78, 45, 16, 8, [7, 8]);
  door(85, 52, 'aureline_museum', 'THE NATIONAL MUSEUM OF CAELORA -- Aurelian galleries on the ground floor, and a case at the far end that has been empty since the spring', 11, 17);
  for (const x of [79, 92]) dec(x, 53, '☼');
  canyon(116, 148, 23, 10);
  canyon(116, 148, 37, 12);
  // Three of them open, and the rest never do. That ratio is the whole idea: a
  // city you can walk into everywhere is a village with more houses in it.
  /**
   * Cut a doorway into whatever the canyon actually built here.
   *
   * The towers are placed at random depths, so their pavement is at a different
   * row every few columns and a door stamped at a guessed height opens into the
   * next building's plinth. This walks down the column for a frontage cell and
   * refuses it unless both leaves have open ground under them -- and it says so
   * loudly rather than shrugging, because a door into a wall is exactly the
   * kind of fault that survives to a screenshot.
   */
  const cutDoor = (xFrom, xTo, yTop, map, note, inX, inY) => {
    for (let x = xFrom; x <= xTo; x++) {
      for (let y = yTop; y < H - 1; y++) {
        if (at(x, y) !== '▄' || at(x + 1, y) !== '▄') continue;
        if (at(x, y + 1) !== '═' || at(x + 1, y + 1) !== '═') break;
        set(x, y, '╬'); set(x + 1, y, '╬');
        door(x, y, map, note, inX, inY);
        return;
      }
    }
    throw new Error(`no frontage with pavement under it between ${xFrom} and ${xTo}`);
  };
  // THE COURANT. The one tower on this street that opens, and the only door in
  // the whole Central District: a newspaper is the single business in the
  // capital whose entire purpose is that a stranger can walk in off the
  // pavement and be listened to.
  cutDoor(96, 108, 23, 'aureline_press', 'THE AURELINE COURANT -- front counter, presses in the basement, and a reporter who has been asking the Foundation the same question for two years', 9, 13);
  for (let y = 6; y < 52; y += 8) { dec(78, y, '☼'); dec(110, y, '☼'); }
  for (let y = 10; y < 50; y += 13) { dec(88, y, '♣'); dec(103, y, '♣'); }
}

/* ------------------------------------------------------ 4. THE GREATPARK */
// The one place in the capital that breathes: sixty-one cells by thirty-one of
// lawn, water, gravel and clipped hedge, with Kin living in it that nobody owns
// and nobody moves on. Westway runs into it from the north and stops, because
// the park was here before the street plan was.
{
  rect(3, 58, 65, 88, '.');
  for (let y = 66; y <= 79; y++) {
    for (let x = 11; x <= 35; x++) {
      const dx = (x - 23) / 13, dy = (y - 72.5) / 7;
      if (dx * dx + dy * dy < 1) set(x, y, '~');
    }
  }
  row(3, 65, 73, '▒'); row(3, 65, 74, '▒');
  col(58, 88, 30, '▒'); col(58, 88, 48, '▒'); col(58, 88, 12, '▒');
  row(4, 64, 61, '▒'); row(4, 64, 86, '▒');
  for (let i = 0; i < 20; i++) set(37 + i, 61 + Math.floor(i * 0.6), '▒');
  for (let i = 0; i < 16; i++) set(14 + i, 86 - Math.floor(i * 0.7), '▒');
  for (let x = 11; x <= 35; x++) { set(x, 73, '▒'); set(x, 74, '▒'); }
  for (const [x0, y0, x1, y1] of [[38, 64, 46, 70], [50, 76, 60, 82], [5, 60, 15, 64]]) {
    rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, '*');
    for (let x = x0; x <= x1; x++) { dec(x, y0, '♠'); dec(x, y1, '♠'); }
    for (let y = y0; y <= y1; y++) { dec(x0, y, '♠'); dec(x1, y, '♠'); }
    dec(Math.floor((x0 + x1) / 2), Math.floor((y0 + y1) / 2), 'a');
  }
  for (const [x, y] of [[8, 68], [9, 80], [20, 60], [40, 80], [44, 87], [54, 60], [58, 71], [26, 87], [36, 76], [52, 70], [17, 84], [62, 80], [7, 76], [43, 84]]) dec(x, y, 'T');
  for (const [x, y] of [[13, 64], [19, 83], [42, 60], [53, 87], [61, 66], [25, 62], [34, 85], [56, 79], [6, 71], [46, 76]]) dec(x, y, 't');
  for (let x = 6; x < 62; x += 9) { dec(x, 72, '♦'); dec(x + 4, 75, '☼'); }
  rect(40, 78, 48, 82, '▒');
  dec(44, 80, '◆');
  // THE GREAT GLASSHOUSE, built out of the laboratory kit on purpose: a
  // nineteenth-century conservatory is the same idea as a laboratory -- iron,
  // glass and a climate somebody controls -- put to a gentler use.
  rect(50, 68, 62, 69, '▒');
  glasshouse(50, 62, 13, 6);
  door(55, 67, 'aureline_conservatory', 'THE GREAT GLASSHOUSE -- palms, ferns, standing heat, and eleven Kin who moved in and were allowed to stay', 10, 13);
  for (let x = 4; x <= 64; x++) if (![11, 12, 29, 30, 47, 48].includes(x)) { dec(x, 57, '╫'); dec(x, 89, '╫'); }
  for (let y = 58; y <= 88; y++) if (![73, 74].includes(y)) { dec(3, y, '╫'); dec(65, y, '╫'); }
}

/* ------------------------------------ 5. THE ARCADES, AND EASTFIELD ROWS */
// The shopping city: parade after parade of plate glass under striped canopies,
// with the Clinic and the Provisioner standing where a stranger walking off the
// Mile will find them without having to ask.
{
  rect(78, 58, 110, 88, '═');
  const clinicMid = civic(79, 58, 8, 'heal');
  const shopMid = civic(88, 58, 8, 'shop');
  door(clinicMid, 60, 'aureline_clinic', 'THE AURELINE KIN CLINIC -- the largest in Caelora, and it does not close', 9, 13);
  door(shopMid, 60, 'aureline_provisioner', 'THE AURELINE PROVISIONER', 10, 11);
  parade(95, 58, 5, 6, []);
  parade(101, 58, 4, 6, []);
  parade(106, 58, 5, 6, []);

  parade(78, 65, 6, 7, []);
  parade(85, 65, 4, 7, []);
  parade(90, 65, 5, 7, []);
  parade(96, 65, 4, 7, []);
  parade(101, 65, 10, 7, []);

  parade(78, 76, 5, 6, []);
  parade(84, 76, 4, 6, []);
  parade(89, 76, 5, 6, []);
  parade(95, 76, 5, 6, []);
  parade(101, 76, 4, 6, []);
  parade(106, 76, 5, 6, []);

  parade(78, 84, 5, 5, []);
  parade(84, 84, 4, 5, []);
  parade(89, 84, 5, 5, []);
  parade(95, 84, 4, 5, []);
  parade(100, 84, 5, 5, []);
  parade(106, 84, 5, 5, []);

  // Eastfield Rows: housing, and cheaper the further east it goes.
  rect(116, 58, 148, 88, '═');
  for (const y of [58, 65, 72, 79]) fillBand(116, 148, y, 5, tenement, 3, 6);
  fillBand(116, 148, 86, 3, tenement, 3, 6);
  tenement(124, 79, 7, 5, [3, 4]);
  door(127, 83, 'aureline_inn', 'THE EASTFIELD INN: cheap, clean, run by a Skyreach woman, and forty minutes on foot from anywhere worth being', 9, 13);
  for (const y of [64, 71, 78, 85]) { dec(116, y, '☼'); dec(148, y, '☼'); }
  for (const y of [71, 85]) dec(132, y, '♣');
}

/* ------------------------------------------------ 6. THE OLD CITY */
// Candlerow. Granite, soot, cobbles, and lanes that line up with nothing at
// all, because they were here first. The player comes in through the south gate
// straight into it, and the city gets newer and taller every street they walk
// north -- which is the argument of the whole place, made with their feet.
{
  rect(3, 94, 65, 114, '░');
  rect(78, 94, 110, 114, '░');
  for (const y of [94, 100, 106]) {
    fillBand(3, 65, y, 4, oldBlock, 3, 6, 0.3);
    fillBand(78, 110, y, 4, oldBlock, 3, 6, 0.3);
  }
  for (const x of [17, 18, 37, 38, 53, 54, 88, 89]) col(94, 114, x, '░');
  // Lampwright's Square, where three of the lanes fail to meet properly.
  rect(30, 100, 36, 105, '░');
  dec(33, 102, '◆');
  for (const [x, y] of [[30, 100], [36, 100], [30, 105], [36, 105]]) dec(x, y, '☼');
  for (const [x, y] of [[31, 104], [35, 104]]) dec(x, y, '♦');
  // A fourth rank leaning on the inside of the wall, in patches: Candlerow
  // built against its own defences the moment they stopped mattering, and left
  // gaps wherever a lane already ran down to a gate.
  for (const [a, b] of [[3, 18], [24, 40], [46, 64], [79, 92], [96, 110]]) {
    fillBand(a, b, 112, 3, oldBlock, 3, 5, 0.45);
  }
  // The Wall Walk, inside the wall, and the four blocks that open.
  oldBlock(96, 100, 12, 4, [5, 6]);
  door(101, 103, 'aureline_market', 'THE CANDLEROW MARKET HALL -- fish, cloth, wire, and one stall selling charts of places that are not there', 11, 15);
  for (let x = 6; x < 62; x += 13) { dec(x, 98, '☼'); dec(x + 6, 111, '☼'); }
  for (let x = 82; x < 110; x += 13) { dec(x, 98, '☼'); dec(x + 6, 111, '☼'); }
}

/* -------------------------------------------- 7. THE TRANSIT DISTRICT */
// Aureline Central. A shed of sooty glass on steel ribs -- the largest single
// roofed volume anybody in Caelora has built -- and the throat of the line
// running away east across the plain to meet the road.
{
  rect(116, 94, 148, 114, '═');
  for (let y = 94; y <= 103; y++) for (let x = 116; x <= 142; x++) set(x, y, (x - 116) % 7 === 0 ? '╤' : '╧');
  built++;
  row(116, 142, 104, '▄'); row(116, 142, 105, '▄');
  set(128, 105, '╬'); set(129, 105, '╬');
  door(128, 105, 'aureline_station', 'AURELINE CENTRAL -- concourse, departure boards, and the platforms behind them', 12, 19);
  rect(143, 94, W - 1, 105, '┅');
  for (const y of [96, 99, 102]) row(143, W - 1, y, '━');
  set(145, 98, '┫'); set(148, 101, '┫');
  rect(116, 106, 148, 114, '═');
  for (const x of [118, 122, 126, 130, 134, 138, 142]) dec(x, 107, '♣');
  for (const x of [120, 127, 134, 140]) dec(x, 112, '☼');
  for (const x of [117, 124, 131, 137, 145]) dec(x, 109, '♦');
  for (const x of [119, 128, 136]) dec(x, 113, '♦');
  set(133, 110, '◆');
  for (const x of [116, 117, 118]) { dec(x, 111, '¾'); }
  for (let x = 116; x <= 121; x++) dec(x, 113, '¯');
  for (const x of [121, 141]) dec(x, 110, '☼');
  for (let y = 106; y <= 114; y++) if (y !== 110) dec(143, y, '╫');
  rect(144, 106, 148, 114, '▬');
}

/* ------------------------------------- 8. THE SUMMIT TRAINING COMPLEX */
// A walled campus in the north-east, behind its own gates and its own lawn.
// The player can see every inch of it and is getting into none of it: eight
// Crests to go past the desk, and they have five. It is not this act's
// business, and everything about the way it is drawn says so.
{
  rect(116, 3, 148, 19, '═');
  rect(116, 3, 148, 16, '.');
  tower(117, 4, 11, 8);
  tower(129, 3, 9, 9);
  tower(139, 4, 9, 8);
  set(133, 11, '╬'); set(134, 11, '╬');
  door(133, 11, 'aureline_summit', 'THE SUMMIT REGISTRY -- the desk, the Crest reader, and a very polite refusal', 9, 15);
  for (const [x, y] of [[119, 14], [124, 15], [137, 14], [145, 15], [130, 15]]) dec(x, y, 'T');
  for (const [x, y] of [[122, 13], [141, 13]]) dec(x, y, 't');
  rect(116, 17, 148, 19, '═');
  for (let x = 116; x <= 148; x++) if (![131, 132, 133, 134].includes(x)) dec(x, 16, '╫');
  for (const x of [118, 147]) dec(x, 18, '☼');
  for (const x of [124, 141]) dec(x, 18, '♣');
}

/* --------------------------------- 9. SOUTHGATE AND THE WALL */
{
  row(3, 148, 115, '▪'); row(3, 148, 116, '▪');
  // THE SOUTHGATE.
  //
  // Deliberately not on the axis of the Mile. The wall is three hundred years
  // older than the boulevard, the arch is where the arch has always been, and
  // when the city drove a fourteen-column avenue at it the avenue simply passed
  // the gate on one side. Every capital in the world has this junction and none
  // of them has ever straightened it out. It also happens to be where the
  // Central Road actually arrives, which is the join that matters.
  rect(73, 115, 77, 116, '═');
  set(72, 115, '▫'); set(72, 116, '▫');
  rect(73, 117, 77, H - 2, '▬');
  set(73, 117, '═'); set(73, 118, '═');
  dec(70, 114, '☼'); dec(78, 114, '☼');
  for (const [x, tx] of [[74, 15], [75, 16], [76, 17]]) {
    // Two rows in from the top of the Central Road, not sixty-two: Aureline is
    // NORTH of route_7_north, so leaving the city by the south gate arrives at
    // the head of that map and not at its foot. Reading the two warp tables and
    // seeing the numbers agree does not catch this -- walking it does, and it
    // put the player sixty rows down the wrong end of the road.
    warps.push({ x, y: H - 1, toMap: 'route_7_north', toX: tx, toY: 2, facing: 'down', style: 'edge' });
  }
}

/* ------------------------------------------ boulevard planting and lamps */
const onStreet = (y) => !((y >= 53 && y <= 57) || (y >= 89 && y <= 93) || (y >= 20 && y <= 22));
for (let y = 5; y < 114; y += 4) {
  if (!onStreet(y)) continue;
  dec(71, y, y % 8 === 5 ? '♣' : '☼');
  if (onStreet(y + 2)) dec(72, y + 2, '♣');
}
dec(71, 45, '◆'); dec(72, 62, '◆');
for (let y = 7; y < 112; y += 6) {
  if (onStreet(y)) dec(66, y, '♣');
  if (onStreet(y + 3)) dec(77, y + 3, '♣');
}

/* -------------------------------------------------------------- the border */
rect(0, 0, W - 1, 2, 'T');
rect(0, H - 3, W - 1, H - 1, 'T');
rect(0, 0, 2, H - 1, 'T');
rect(W - 3, 0, W - 1, H - 1, 'T');
rect(74, H - 3, 76, H - 1, '▬');
rect(W - 3, 94, W - 1, 105, '┅');
for (const y of [96, 99, 102]) row(W - 3, W - 1, y, '━');

/* ----------------------------------------- reachability, and the deco pass */

const solid = new Set([
  'T', 't', 'o', 'O', '#', 'w', 'R', '[', ']', '^', '|', '_', '!', 'C', 'c', 'I', 'K',
  'X', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'G', 'h', 'm', 'b', 'e', 'k',
  'A', 'E', 'V', 'P', 'J', 'N', 'Q', 'U', '<', '%', '>', '(', '&', ')', 'j', 'H', 'M',
  'Z', 'd', 'l', 'n', 'z', 'v', 'y', 'a', 'Y', '+', '?', '@', '$', ';', '/',
  '▓', '█', '┌', '─', '┐', '▄', '▌', '▐', '▪', '▫', '╔', '╗', '╦', '╧', '╤',
  '☼', '♣', '♦', '╫', '♠', '◆', '○', '━', '┃', '┗', '┛', '┏', '┓', '┫', '┅', '●', '▲', '■', '╪',
]);
const walkable = (x, y) => !solid.has(at(x, y)) && !'~Wщ'.includes(at(x, y));

const flood = () => {
  const seen = new Uint8Array(W * H);
  const q = [[75, H - 2]]; seen[(H - 2) * W + 75] = 1;
  let n = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const i = ny * W + nx;
      if (seen[i] || !walkable(nx, ny)) continue;
      seen[i] = 1; n++; q.push([nx, ny]);
    }
  }
  return { seen, n };
};

/**
 * Place the street furniture, one piece at a time, and refuse any of it that
 * would pinch a route shut.
 *
 * This is the Tideglass rule made automatic. A lamp standing in a one-cell lane
 * does not look like a lamp in a lane -- it looks like a bug, because the lane
 * behind it is now a room nobody can enter. Every candidate is stood up, the
 * map is flooded from the south gate with it standing, and it is taken away
 * again if the reachable count fell by more than the cell it occupies.
 */
let refused = 0;
{
  let base = flood().n;
  for (const [x, y, c] of deco) {
    if (!walkable(x, y)) continue;
    const was = at(x, y);
    set(x, y, c);
    const now = flood().n;
    if (now < base - 1) { set(x, y, was); refused++; } else base = now;
  }
}

/**
 * Seal the pockets.
 *
 * Three or four cells of lawn get cut off behind the lake every time the park
 * is laid out, and a scrap of grass nobody can reach is worse than no scrap at
 * all: it is a hole in the map that only shows up as a player pressing into a
 * hedge for ten seconds. Anything still unreachable becomes what its
 * neighbours are -- water beside water, a sapling anywhere else.
 */
{
  const { seen: s0 } = flood();
  // A doorway is never sealed. If a door has ended up behind a wall that is a
  // geometry bug to go and fix, and quietly planting a tree in the doorcase
  // would hide it -- which is how a map ends up with an entrance nobody can
  // reach and nobody can see is missing.
  const sacred = new Set(warps.map((w) => `${w.x},${w.y}`));
  const sealed = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!walkable(x, y) || s0[y * W + x] || sacred.has(`${x},${y}`)) continue;
      const wet = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(x + dx, y + dy) === '~');
      set(x, y, wet ? '~' : 't');
      sealed.push(`${x},${y}`);
    }
  }
  if (sealed.length) console.log('sealed ' + sealed.length + ' unreachable cells: ' + sealed.slice(0, 12).join(' '));
}

const { seen, n: reachable } = flood();
let walk = 0; const orphans = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!walkable(x, y)) continue;
  walk++;
  if (!seen[y * W + x]) orphans.push([x, y]);
}
console.log(`${W}x${H} = ${W * H} cells; walkable ${walk} (${(100 * walk / (W * H)).toFixed(1)}%), reachable ${reachable}, orphaned ${orphans.length}, furniture refused ${refused}`);
if (orphans.length) console.log('  orphans:', orphans.slice(0, 40).map((p) => p.join(',')).join(' '));

for (const d of doors) {
  if (!seen[(d.y + 1) * W + d.x]) console.log(`DOOR UNREACHABLE ${d.toMap} at ${d.x},${d.y} -- below is '${at(d.x, d.y + 1)}'`);
  if (!'╬◘igq╩'.includes(at(d.x, d.y))) console.log(`DOOR NOT A DOORWAY ${d.toMap} at ${d.x},${d.y} = '${at(d.x, d.y)}'`);
}
console.log('buildings:', built, 'doors:', doors.length, 'warps:', warps.length);


/* ------------------------------------------------- the people and the props */

const npcs = [], objects = [];
let moved = 0;

/**
 * Stand somebody on the nearest tile they can actually stand on.
 *
 * Fifty-six people placed by hand against a map that is still being edited will
 * always include four standing inside a wall, and an NPC inside a wall is not a
 * cosmetic bug: they are a solid object the pathfinder cannot see round and the
 * player cannot talk to. So every position is checked against the finished
 * collision and pushed to the closest legal cell if it is wrong, and the number
 * of pushes is printed -- a large number means the district moved and the crowd
 * did not, which is a thing to go and look at rather than to shrug off.
 */
const stand = (x, y) => {
  if (walkable(x, y) && seen[y * W + x]) return [x, y];
  for (let r = 1; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) !== r) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && walkable(nx, ny) && seen[ny * W + nx]) {
          moved++;
          return [nx, ny];
        }
      }
    }
  }
  return null;
};

const taken = new Set();
for (const [id, sprite, x0, y0, facing, movement] of NPCS) {
  const p = stand(x0, y0);
  if (!p) { console.log(`NPC NOWHERE ${id} near ${x0},${y0}`); continue; }
  let [x, y] = p;
  while (taken.has(`${x},${y}`)) { const q = stand(x + 1, y); if (!q) break; [x, y] = q; }
  taken.add(`${x},${y}`);
  npcs.push({ id, sprite, x, y, facing, movement, script: id });
}

for (const [x0, y0, text] of [...SIGNS, ...EXTRA_SIGNS]) {
  const p = stand(x0, y0);
  if (!p) { console.log(`SIGN NOWHERE at ${x0},${y0}`); continue; }
  objects.push({ kind: 'sign', x: p[0], y: p[1], text });
}
for (const [kind, x0, y0, item, quantity, flag] of ITEMS) {
  const p = stand(x0, y0);
  if (!p) { console.log(`ITEM NOWHERE at ${x0},${y0}`); continue; }
  objects.push({ kind, x: p[0], y: p[1], item, quantity, flag });
}
for (const [species, x0, y0] of PARK_KIN) {
  const p = stand(x0, y0);
  if (!p) { console.log(`KIN NOWHERE at ${x0},${y0}`); continue; }
  objects.push({ kind: 'kin', x: p[0], y: p[1], species });
}
console.log(`npcs ${npcs.length}, objects ${objects.length} (${moved} nudged onto reachable ground)`);

/**
 * Flood the city again with all sixty-seven people standing in it.
 *
 * A townsperson is a solid object. One of them standing in a one-cell service
 * passage does not look like somebody standing in a passage -- it looks like a
 * district that has come loose, because the passage behind them is now a room
 * with no way in, and the only symptom is a player pressing into a stranger for
 * ten seconds. This is the same rule the street furniture goes through, applied
 * to the crowd: everyone is stood up at once, the map is flooded from the south
 * gate, and anybody who is holding a route shut on their own is moved.
 *
 * It runs to a fixed point rather than once, because moving one person out of a
 * passage can put them in the mouth of another.
 */
{
  let displaced = 0;
  for (let pass = 0; pass < 4; pass++) {
    const block = new Set(npcs.map((n) => `${n.x},${n.y}`));
    const crowdFlood = () => {
      const mark = new Uint8Array(W * H);
      const q = [[75, H - 2]];
      mark[(H - 2) * W + 75] = 1;
      let n = 1;
      while (q.length) {
        const [x, y] = q.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const i = ny * W + nx;
          if (mark[i] || !walkable(nx, ny) || block.has(`${nx},${ny}`)) continue;
          mark[i] = 1; n++; q.push([nx, ny]);
        }
      }
      return { mark, n };
    };
    const { mark, n } = crowdFlood();
    // Everything the crowd has cut off, counted against what the empty city
    // reaches. The people themselves stand on cells the flood cannot enter, so
    // the honest target is "reachable minus the crowd".
    if (n >= reachable - npcs.length) break;
    let fixed = 0;
    for (const npc of npcs) {
      const around = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .filter(([dx, dy]) => walkable(npc.x + dx, npc.y + dy)).length;
      // Somebody in a passage has at most two ways out and is a candidate;
      // somebody in the open has three or four and cannot be the problem.
      if (around > 2) continue;
      const alt = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [2, 0], [-2, 0], [0, 2], [0, -2]];
      for (const [dx, dy] of alt) {
        const nx = npc.x + dx, ny = npc.y + dy;
        if (!walkable(nx, ny) || !mark[ny * W + nx]) continue;
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .filter(([ax, ay]) => walkable(nx + ax, ny + ay)).length;
        if (open <= 2 || block.has(`${nx},${ny}`)) continue;
        npc.x = nx; npc.y = ny; fixed++; displaced++;
        break;
      }
    }
    if (!fixed) break;
  }
  const block = new Set(npcs.map((n) => `${n.x},${n.y}`));
  const mark = new Uint8Array(W * H);
  const q = [[75, H - 2]]; mark[(H - 2) * W + 75] = 1; let n = 1;
  while (q.length) {
    const [x, y] = q.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const i = ny * W + nx;
      if (mark[i] || !walkable(nx, ny) || block.has(`${nx},${ny}`)) continue;
      mark[i] = 1; n++; q.push([nx, ny]);
    }
  }
  console.log(`with the crowd standing: ${n} reachable of ${reachable - npcs.length} expected (${displaced} people moved out of passages)`);
  for (const w of warps) {
    if (w.style === 'edge') continue;
    if (!mark[(w.y + 1) * W + w.x]) console.log(`DOOR BLOCKED BY THE CROWD: ${w.toMap} at ${w.x},${w.y}`);
  }
  /**
   * A sign or a pickup the crowd has shut in is worth nothing.
   *
   * Moving the townsperson is the wrong fix here -- they are standing where
   * they are standing for a reason, and a lane two cells deep with somebody in
   * it is a real street, not a bug. Moving the object is the right one: a
   * potion is not attached to a particular flagstone. Everything blocked is
   * pushed to the nearest cell the player can actually get to with the whole
   * crowd on its feet, and anything that cannot be placed at all is named.
   */
  let rehomed = 0;
  for (const o of objects) {
    if (mark[o.y * W + o.x] || block.has(`${o.x},${o.y}`)) continue;
    let placed = false;
    for (let r = 1; r <= 8 && !placed; r++) {
      for (let dy = -r; dy <= r && !placed; dy++) {
        for (let dx = -r; dx <= r && !placed; dx++) {
          if (Math.abs(dx) + Math.abs(dy) !== r) continue;
          const nx = o.x + dx, ny = o.y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (!mark[ny * W + nx] || block.has(`${nx},${ny}`)) continue;
          o.x = nx; o.y = ny; placed = true; rehomed++;
        }
      }
    }
    if (!placed) console.log(`OBJECT STRANDED: ${o.kind} at ${o.x},${o.y}`);
  }
  if (rehomed) console.log(`${rehomed} object(s) moved clear of the crowd`);
}

const map = {
  id: 'aureline',
  name: 'Aureline',
  displayName: 'AURELINE',
  music: 'station',
  battleBackdrop: 'highland',
  indoor: false,
  regionPos: { x: 21, y: 4 },
  rows: g.map((r) => r.join('')),
  warps,
  npcs,
  objects,
  _legend: LEGEND,
  _plan: PLAN,
};
writeFileSync(process.argv[2] || 'out.json', JSON.stringify(map, null, 2) + '\n');
console.log('wrote ' + process.argv[2] + ' -- ' + doors.length + ' doors:');
for (const d of doors) console.log('  ' + d.x + ',' + d.y + ' -> ' + d.toMap + ' (' + d.note + ')');
