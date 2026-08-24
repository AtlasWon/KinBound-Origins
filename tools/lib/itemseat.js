/**
 * What the game will do to a delivered item PNG, done offline.
 *
 * A line-for-line mirror of the seating in `src/gfx/itemart.ts`, in plain
 * arrays instead of canvases, so the checker and the contact sheet can report
 * and draw the icon the player will actually see -- not the file they handed
 * over.
 *
 * Mirrors are a liability, so keep the shape obvious: the constants below are
 * the same constants, the steps are the same steps in the same order, and
 * nothing here is "improved".
 *
 *   1. flatten alpha at 50%      (a fringe would widen every measurement)
 *   2. find the ink, shrink only if it does not fit the 32x32 cell
 *   3. CENTRE it, both axes -- items sit in boxes with no floor
 *   4. nudge up to one pixel to land on the even grid
 *
 * Step 3 is the only place this differs from `kinseat.js`, and it is the whole
 * difference between an item and a creature: there is no ground line and there
 * is no contact shadow.
 *
 * `seatGroup` is step 2 done over a whole key at once -- see the note on it.
 */

export const CELL = 32;
export const ICON_SIZE = CELL / 2;
export const ALPHA_CUT = 128;
/** Below this fraction of flat 2x2 blocks, the 16px list icon looks soft. */
export const SOFT_ICON = 0.6;

/* ------------------------------------------------------------- the frames */

/**
 * The state suffixes an icon key may have a second drawing for.
 *
 * The same list as `FRAME_STATES` in src/gfx/itemart.ts, and it has to stay the
 * same list -- a state the tools accept and the game ignores is a file that
 * looks delivered and never appears on screen. `npm run item:check` compares
 * the two and says so if they have drifted.
 *
 *   what   -- for the report and the spec
 *   used   -- who asks for it, so a state with no reader is visibly dead
 *   said   -- the words a delivered file might use for this state instead
 *   align  -- how the frame registers against the icon when the two drawings
 *             arrive separately, which only `npm run item:import` has to know:
 *             'bottom' means they share a bottom edge. A lid opens upward and
 *             the body of the vessel stays exactly where it was, so lining the
 *             two up by their centres would drop the whole vessel two pixels
 *             at the moment it opens.
 */
export const FRAME_STATES = {
  open: {
    what: 'the vessel split open, lid clear of the body',
    used: 'the send-out and capture throws in src/scenes/battle.ts',
    said: ['open', 'opened', 'opening'],
    align: 'bottom',
  },
};

/** Words that mean "this is the icon itself", not a state. A pair delivered as
 *  closed/open should land as <key>.png and <key>-open.png, and the artist
 *  naming the closed one "closed" is the natural thing to do, not a mistake. */
export const BASE_WORDS = ['closed', 'shut', 'base', 'idle', 'default', 'normal', 'still'];

/** Split `vessel_field-open` into its key and its state. A stem with no known
 *  state suffix is a plain icon key, dashes and all -- so a mistyped state is
 *  reported as an unknown KEY, which is the message that names the real fault. */
export function splitFrameName(stem) {
  const cut = stem.lastIndexOf('-');
  if (cut > 0) {
    const tail = stem.slice(cut + 1);
    if (Object.prototype.hasOwnProperty.call(FRAME_STATES, tail)) {
      return { key: stem.slice(0, cut), state: tail };
    }
  }
  return { key: stem, state: null };
}

/** The file a key's frame is drawn by. One place, so nothing spells it twice. */
export function frameFile(key, state) {
  return state ? `${key}-${state}.png` : `${key}.png`;
}

/** Flatten every part-transparent pixel, and say how many there were and where.
 *  An interior soft pixel is a different mistake from a soft edge -- one is a
 *  ghost, the other is anti-aliasing -- so they are counted separately. */
export function hardenAlpha(px) {
  const { w, h, data } = px;
  let soft = 0, interior = 0;
  const wasSoft = [];
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a === 0 || a === 255) continue;
    soft++;
    wasSoft.push((i - 3) / 4);
    data[i] = a >= ALPHA_CUT ? 255 : 0;
  }
  for (const p of wasSoft) {
    const x = p % w, y = (p / w) | 0;
    if (!data[p * 4 + 3]) continue;
    let boxed = true;
    for (let dy = -1; dy <= 1 && boxed; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) { boxed = false; break; }
        if (!data[(ny * w + nx) * 4 + 3]) { boxed = false; break; }
      }
    }
    if (boxed) interior++;
  }
  return { soft, interior, edge: soft - interior };
}

export function inkBounds(px) {
  const { w, h, data } = px;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < ALPHA_CUT) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Nearest-neighbour, source-driven, hard alpha. Identical to a straight copy
 *  when nothing needed reducing. */
function paint(src, b, scale, dw, dh, dx, dy, dest) {
  const iw = b.x1 - b.x0 + 1, ih = b.y1 - b.y0 + 1;
  for (let j = 0; j < dh; j++) {
    const ty = dy + j;
    if (ty < 0 || ty >= CELL) continue;
    const sy = b.y0 + (scale === 1 ? j : Math.min(ih - 1, Math.floor((j + 0.5) / scale)));
    for (let i = 0; i < dw; i++) {
      const tx = dx + i;
      if (tx < 0 || tx >= CELL) continue;
      const sx = b.x0 + (scale === 1 ? i : Math.min(iw - 1, Math.floor((i + 0.5) / scale)));
      const s = (sy * src.w + sx) * 4;
      if (src.data[s + 3] < ALPHA_CUT) continue;
      const d = (ty * CELL + tx) * 4;
      dest[d] = src.data[s];
      dest[d + 1] = src.data[s + 1];
      dest[d + 2] = src.data[s + 2];
      dest[d + 3] = 255;
    }
  }
}

/** Fraction of `step`x`step` blocks, on the canvas's own grid, that are one
 *  flat colour. At step 2 this is exactly what decides whether the 16px list
 *  icon is a real halving or a majority vote. */
export function gridScore(data, w = CELL, h = CELL, step = 2) {
  let blocks = 0, flat = 0;
  for (let y = 0; y + step - 1 < h; y += step) {
    for (let x = 0; x + step - 1 < w; x += step) {
      let any = false;
      for (let j = 0; j < step && !any; j++) {
        for (let i = 0; i < step; i++) if (data[((y + j) * w + x + i) * 4 + 3]) { any = true; break; }
      }
      if (!any) continue;
      blocks++;
      const i0 = (y * w + x) * 4;
      let same = true;
      for (let j = 0; j < step && same; j++) {
        for (let i = 0; i < step; i++) {
          const k = ((y + j) * w + x + i) * 4;
          if (data[k] !== data[i0] || data[k + 1] !== data[i0 + 1]
            || data[k + 2] !== data[i0 + 2] || data[k + 3] !== data[i0 + 3]) { same = false; break; }
        }
      }
      if (same) flat++;
    }
  }
  return blocks ? flat / blocks : 1;
}

/**
 * Seat a decoded image the way the game will: centred in the 32x32 cell.
 *
 * `px` is mutated (its alpha is hardened) -- callers want that, because every
 * other measurement they take should be on the same hard-alpha pixels the game
 * sees. Returns null only when there is no ink at all, which is the one case
 * the loader also refuses.
 */
export function seat(px) {
  return seatGroup([{ state: null, px }])[0] ?? null;
}

/**
 * Seat every frame of one icon key together.
 *
 * The frames of a key are one object doing two things, and they have to stay
 * registered: centre each of them on its own ink and the vessel's base jumps
 * the instant the lid comes off, because the open drawing is taller and its
 * centre is somewhere else. So the UNION of every frame's ink is what gets
 * centred and scaled, and every frame is then sampled out of that same union
 * box -- which leaves each one where it was drawn relative to the others.
 *
 * With one frame the union is that frame's own ink, so this is exactly the old
 * `seat` and `seat` is now a call to it. Frames on different canvas sizes have
 * no shared coordinate to be registered in; those are seated one at a time and
 * `grouped: false` says so.
 *
 * Every `px` is mutated (alpha hardened), as `seat` always did.
 */
export function seatGroup(frames) {
  const prepared = [];
  for (const f of frames) {
    const softness = hardenAlpha(f.px);
    const b = inkBounds(f.px);
    if (!b) continue;
    prepared.push({ state: f.state ?? null, px: f.px, b, softness });
  }
  if (!prepared.length) return [];

  const grouped = new Set(prepared.map((p) => `${p.px.w}x${p.px.h}`)).size === 1;
  const union = grouped ? prepared.reduce((a, p) => ({
    x0: Math.min(a.x0, p.b.x0), y0: Math.min(a.y0, p.b.y0),
    x1: Math.max(a.x1, p.b.x1), y1: Math.max(a.y1, p.b.y1),
  }), prepared[0].b) : null;
  if (union) { union.w = union.x1 - union.x0 + 1; union.h = union.y1 - union.y0 + 1; }

  const out = [];
  let shared = null;
  for (const p of prepared) {
    const box = union ?? p.b;
    let fit = shared;
    if (!fit) {
      const scale = Math.min(1, CELL / box.w, CELL / box.h);
      const dw = Math.max(1, Math.round(box.w * scale));
      const dh = Math.max(1, Math.round(box.h * scale));
      const baseX = Math.round((CELL - dw) / 2);
      const baseY = Math.round((CELL - dh) / 2);

      // The grid phase is chosen once, on the first frame -- the base drawing,
      // the one the bag halves. Letting each frame pick its own would move them
      // a pixel apart for the sake of a percentage nobody sees.
      let best = { x: 0, y: 0 }, bestScore = -1, restScore = -1;
      for (const y of [0, 1]) {
        for (const x of [0, 1]) {
          const test = new Uint8ClampedArray(CELL * CELL * 4);
          paint(p.px, box, scale, dw, dh, baseX - x, baseY - y, test);
          const s = gridScore(test);
          if (!x && !y) restScore = s;
          if (s > bestScore + 1e-9) { bestScore = s; best = { x, y }; }
        }
      }
      const shift = (best.x || best.y) && bestScore - restScore < 0.05 ? { x: 0, y: 0 } : best;
      fit = { box, scale, dw, dh, baseX, baseY, shift };
      if (union) shared = fit;
    }

    const data = new Uint8ClampedArray(CELL * CELL * 4);
    paint(p.px, fit.box, fit.scale, fit.dw, fit.dh,
      fit.baseX - fit.shift.x, fit.baseY - fit.shift.y, data);
    const placed = inkBounds({ w: CELL, h: CELL, data })
      ?? { x0: 0, y0: 0, x1: 0, y1: 0, w: 0, h: 0 };
    out.push({
      state: p.state, data, w: CELL, h: CELL,
      source: p.b, union: fit.box, grouped: grouped && prepared.length > 1,
      scale: fit.scale, shift: fit.shift, gridScore: gridScore(data),
      placed, softness: p.softness,
    });
  }
  return out;
}

/**
 * The 16px list icon: the sprite halved by taking the dominant colour of each
 * 2x2 block. On art drawn in 2x2 blocks the dominant colour IS the block's
 * colour, so the reduction is exact and invents nothing. `exact` says which of
 * those two happened.
 */
export function icon(seated) {
  const out = new Uint8ClampedArray(ICON_SIZE * ICON_SIZE * 4);
  const src = seated.data;
  let blocks = 0, exactBlocks = 0;
  for (let y = 0; y < ICON_SIZE; y++) {
    for (let x = 0; x < ICON_SIZE; x++) {
      const counts = new Map();
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 2 + dy) * CELL + x * 2 + dx) * 4;
          if (src[i + 3] < ALPHA_CUT) continue;
          const key = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      if (!counts.size) continue;
      blocks++;
      if (counts.size === 1) exactBlocks++;
      let bestKey = 0, bestN = 0;
      for (const [k, n] of counts) if (n > bestN) { bestKey = k; bestN = n; }
      const d = (y * ICON_SIZE + x) * 4;
      out[d] = (bestKey >> 16) & 0xff;
      out[d + 1] = (bestKey >> 8) & 0xff;
      out[d + 2] = bestKey & 0xff;
      out[d + 3] = 255;
    }
  }
  return { data: out, w: ICON_SIZE, h: ICON_SIZE, blocks, exactBlocks, exact: blocks === exactBlocks };
}

/**
 * Every icon key the game asks for, read straight from the item data, with the
 * item(s) that use each one.
 *
 * The art key is the `icon` field, not the item id -- `field_vessel` is drawn
 * by `vessel_field.png` -- and every tool here needs that mapping, so it lives
 * in one place.
 */
export function iconKeys(items) {
  const map = new Map();
  for (const item of items) {
    const key = item.icon;
    if (!key) continue;
    const slot = map.get(key) ?? { key, items: [], categories: new Set() };
    slot.items.push({ id: item.id, name: item.name, category: item.category, sort: item.sort ?? 999 });
    slot.categories.add(item.category);
    map.set(key, slot);
  }
  return [...map.values()].sort((a, b) => (a.items[0].sort - b.items[0].sort) || a.key.localeCompare(b.key));
}

/* ------------------------------------------------------------ the naming */

/**
 * Words for a thing that are not the thing's icon key.
 *
 * Small on purpose. A family name -- `vessel`, `cure`, `key` -- is worked out
 * from the key list itself, so this only carries the cases where the artist's
 * word and the game's word are genuinely different nouns.
 */
const ALIASES = {
  ball: 'vessel_field',
  capsule: 'vessel_field',
  orb: 'vessel_field',
  flask: 'potion',
  bottle: 'potion',
  feather: 'revive',
  incense: 'repel',
  rope: 'escape',
  anchor: 'escape',
  book: 'key_vellum',
  vellum: 'key_vellum',
  map: 'key_map',
};

function levenshtein(a, b) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Work out which icon a delivered file is meant to be.
 *
 * This is the single commonest way an art delivery fails, and it failed on the
 * first one: three files called `Potion.png`, `Vessel-closed.png` and
 * `Vessel-open.png`, and the game asks for `potion`, `vessel_field` ... and
 * does not have an "open vessel" at all. Nobody could have guessed those names
 * from the outside, so both the importer and the checker resolve them the same
 * way and both say out loud what they decided and why.
 *
 * The order matters, and every step returns a `why` so the report can explain
 * itself rather than appearing to guess:
 *
 *   1. peel off a trailing state word   Vessel-open -> vessel + the open frame
 *      or a word that means "not a state" at all: Vessel-closed -> vessel
 *   2. the icon key itself              potion
 *   3. an item id                       field_vessel -> vessel_field
 *   4. a family name                    vessel -> the first of the six
 *   5. a different noun for it          ball -> vessel_field
 *   6. a spelling guess, flagged as one
 *
 * Returns { ok, key, state, why, members, notes, body }. `body` is what was
 * left after the state came off, which is the string to quote in an error.
 */
export function nameResolver(items) {
  const keys = iconKeys(items).map((k) => k.key);
  const known = new Set(keys);
  const byItemId = new Map(items.map((i) => [i.id, i.icon]));

  const family = (word) => {
    const members = keys.filter((k) => k === word || k.startsWith(word + '_'));
    return members.length ? members : null;
  };

  return function resolveName(stem) {
    let body = String(stem).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    let state = null;
    const notes = [];

    const cut = body.lastIndexOf('-');
    if (cut > 0) {
      const tail = body.slice(cut + 1);
      const named = Object.entries(FRAME_STATES).find(([, v]) => v.said.includes(tail));
      if (named) {
        state = named[0];
        body = body.slice(0, cut);
        notes.push(`"${tail}" is the ${state} frame, not an item of its own`);
      } else if (BASE_WORDS.includes(tail)) {
        body = body.slice(0, cut);
        notes.push(`"${tail}" means the icon itself, not a frame`);
      }
    }

    const under = body.replace(/-/g, '_');
    const miss = { ok: false, body: under, state, notes };
    if (known.has(under)) return { ok: true, key: under, state, why: 'exact', notes, body: under };
    if (byItemId.has(under) && known.has(byItemId.get(under))) {
      return { ok: true, key: byItemId.get(under), state, why: 'item-id', notes, body: under };
    }
    const fam = family(under);
    if (fam) return { ok: true, key: fam[0], state, why: 'family', members: fam, notes, body: under };
    if (ALIASES[under] && known.has(ALIASES[under])) {
      return { ok: true, key: ALIASES[under], state, why: 'alias', notes, body: under };
    }
    let best = null, bestD = Infinity;
    for (const k of known) {
      const d = levenshtein(under, k);
      if (d < bestD) { bestD = d; best = k; }
    }
    if (best && bestD <= Math.max(2, Math.floor(best.length / 4))) {
      return { ok: true, key: best, state, why: 'typo', notes, body: under };
    }
    return miss;
  };
}
