// The shared kit the two mountain roads are composed with.
//
// Route 8 and Route 9 are the same problem twice -- a long outdoor map whose
// country changes along its length, with a road threaded through it and things
// placed on it that must all be standable-on -- so the four things that
// problem needs live here rather than once in each generator.
//
//   field()   smooth value noise, which is what makes a wood a wood
//   canvas()  a grid and the four writers every map is drawn with
//   road()    a polyline with a width and a material that vary along it
//   verify()  flood the map and prove every warp, item, sign and NPC is placed
//
// The last is the important one. Four stages of this project running have
// shipped an entrance with nothing behind it or a pickup sealed inside
// scenery; the ground on these maps is composed from noise fields, so where
// exactly a stand of pines closes over is not knowable when a coordinate is
// written down. `verify` floods from the entrance, moves anything the terrain
// sealed in to the nearest cell that works, and fails the build if it cannot.

/* --------------------------------------------------------------- randomness */

let seed = 20260826;
export const reseed = (n) => { seed = n >>> 0; };
export const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/* -------------------------------------------------------------------- noise */

/**
 * Smooth value noise over a whole map, at a chosen feature size.
 *
 * THE SINGLE MOST IMPORTANT FUNCTION IN THIS KIT, and the first cut of these
 * maps did not have it. Choosing each cell independently -- eighteen per cent
 * scrub, seven per cent rock, six per cent pine, rolled fresh every cell --
 * produces something that is statistically a mountain and visually a rash. A
 * wood is not trees at a probability. It is a STAND with an edge and a
 * clearing in it, and a scree slope is a slope rather than gravel sprinkled on
 * a lawn. Everything a player reads off one of these maps at a glance -- the
 * treeline, where the snow starts, which way the ground falls -- is a shape,
 * and shapes come from a field, not from a die.
 *
 * `cell` is the feature size in tiles: seven is a stand of pines, two is the
 * grain inside it.
 */
export function field(W, H, cell) {
  const gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
  const lat = Array.from({ length: gh }, () => Array.from({ length: gw }, () => rnd()));
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const gx = x / cell, gy = y / cell;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const fx = smooth(gx - ix), fy = smooth(gy - iy);
    const a = lat[iy][ix], b = lat[iy][ix + 1];
    const c = lat[iy + 1][ix], d = lat[iy + 1][ix + 1];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  };
}

/* ------------------------------------------------------------------ drawing */

/** A blank grid and the handful of writers every map is drawn with. */
export function canvas(W, H, fillCh) {
  const g = Array.from({ length: H }, () => Array(W).fill(fillCh));
  return {
    W, H, g,
    at: (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? g[y][x] : null),
    set(x, y, c) { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = c; },
    rect(x0, y0, x1, y1, c) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
    },
    rows: () => g.map((r) => r.join('')),
  };
}

/**
 * A road, drawn as a polyline with a width and a material that both vary along
 * it.
 *
 * `mat(x, y)` is what the surface is at that cell, which is how the macadam
 * coming out of the capital becomes a dirt track and then a trodden line in
 * the snow with no hard edge anywhere: the change happens where the COUNTRY
 * changes, a few tiles either side of it, and never at a map seam.
 *
 * The brush is a SQUARE of radius w, not a row of three. A road drawn one cell
 * thick is a corridor whichever way it runs, and the rule on this project is
 * that routes are never corridors -- so the width has to be in both axes, or
 * every east-west mile of it is a passage.
 */
export function road(c, points, halfWidth, mat) {
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i], [x1, y1] = points[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      const w = typeof halfWidth === 'function' ? halfWidth(x, y) : halfWidth;
      for (let dy = -w; dy <= w; dy++) {
        for (let dx = -w; dx <= w; dx++) c.set(x + dx, y + dy, mat(x + dx, y + dy));
      }
    }
  }
}

/* ------------------------------------------------------------------ checking */

/**
 * Everything a player cannot walk onto.
 *
 * Deep water is handled separately below, because "reachable only by swimming"
 * is a state these maps deliberately put things in and the check has to be
 * able to tell it apart from "sealed in by accident".
 */
export const SOLID = new Set(
  [...'TtoO#wR[]^|_!CcIK1234567890Ghmbek§¤«¬»°±÷¶µØÅÇ∩∪∏∆≠√∋⊗⇓þ¯¹²³¾ª´■▪⌐ '],
);

/**
 * Ground a signpost may be driven into: the verge, and never the road.
 *
 * A board stands on the verge because a board standing in the carriageway is a
 * bollard. This is also why signs are PLANTED rather than moved -- see below.
 */
const VERGE = new Set([...'.,*"∴≋∀∧∇']);

/**
 * Put a post under every sign that has not got one.
 *
 * Signs are solid and are read from the cell beside them, so a sign object
 * sitting on open ground is a piece of text nobody can reach: the player walks
 * over the tile instead of facing it. The obvious fix -- move the sign to the
 * nearest solid cell -- is the wrong one, and both these maps proved it. It
 * dragged a milestone four tiles off the road to the nearest boulder and put
 * two different boards on the same crag.
 *
 * So the post comes to the sign. Anything standing on plain verge gets a post
 * driven into that exact cell; only if the cell is a road or a rock does the
 * search move outward, and then by three tiles at most. Anything already solid
 * -- a milestone, a cairn, the arch on the Crown Road -- is left alone, because
 * whatever it is standing on IS the sign.
 */
export function plant(map, post = '´') {
  const rows = map.rows.map((r) => [...r]);
  const H = rows.length, W = rows[0].length;
  const taken = new Set((map.npcs ?? []).map((n) => `${n.x},${n.y}`));
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? rows[y][x] : null);
  const free = (x, y) => VERGE.has(at(x, y)) && !taken.has(`${x},${y}`)
    && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const n = at(x + dx, y + dy);
      return n !== null && !SOLID.has(n) && n !== 'W';
    });

  for (const o of map.objects ?? []) {
    if (o.kind !== 'sign' && o.kind !== 'script') continue;
    if (SOLID.has(at(o.x, o.y))) { taken.add(`${o.x},${o.y}`); continue; }
    let placed = false;
    for (let r = 0; r <= 3 && !placed; r++) {
      for (let dy = -r; dy <= r && !placed; dy++) {
        for (let dx = -r; dx <= r && !placed; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !free(o.x + dx, o.y + dy)) continue;
          o.x += dx; o.y += dy;
          rows[o.y][o.x] = post;
          taken.add(`${o.x},${o.y}`);
          placed = true;
        }
      }
    }
    if (!placed) console.log(`    no verge for a ${o.kind} at ${o.x},${o.y}`);
  }
  map.rows = rows.map((r) => r.join(''));
}

/** Flood the map on foot from one tile, ignoring anything needing an art. */
export function flood(map, from) {
  const rows = map.rows;
  const H = rows.length, W = rows[0].length;
  const seen = new Set([from[1] * W + from[0]]);
  const q = [from];
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (seen.has(k)) continue;
      const ch = rows[ny][nx];
      if (SOLID.has(ch) || ch === 'W') continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return { seen, W, H, rows };
}

/**
 * Prove the map, and nudge anything the terrain sealed in.
 *
 * `sealed` lists coordinates that are MEANT to be unreachable on foot -- the
 * islet in the middle of the ice, the bench above the road -- and the check
 * runs both ways on them: something meant to be sealed that turns out to be
 * reachable is as much a bug as the reverse, because it is a promise to come
 * back that the player can already collect.
 *
 * A signpost is solid and is read from the cell beside it, so what it needs is
 * a solid cell with a walkable neighbour. Everything else stands on the floor.
 */
export function verify(map, from, sealed = []) {
  const { seen, W, H, rows } = flood(map, from);
  const reach = (x, y) => x >= 0 && y >= 0 && x < W && y < H && seen.has(y * W + x);
  const beside = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reach(x + dx, y + dy));
  const postOk = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1 && SOLID.has(rows[y][x]) && beside(x, y);
  const isSealed = (o) => sealed.some(([x, y]) => x === o.x && y === o.y);

  let ok = true;
  const move = (o, test, what) => {
    if (isSealed(o)) {
      if (test(o.x, o.y)) { console.log(`    ${what} at ${o.x},${o.y} WAS MEANT TO BE SEALED`); ok = false; }
      return;
    }
    if (test(o.x, o.y)) return;
    for (let r = 1; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !test(o.x + dx, o.y + dy)) continue;
          console.log(`    moved ${what} ${o.x},${o.y} -> ${o.x + dx},${o.y + dy}`);
          o.x += dx; o.y += dy;
          return;
        }
      }
    }
    console.log(`    COULD NOT PLACE ${what} near ${o.x},${o.y}`);
    ok = false;
  };

  for (const w of map.warps ?? []) {
    if (!reach(w.x, w.y)) { console.log(`    WARP to ${w.toMap} at ${w.x},${w.y} is unreachable`); ok = false; }
  }
  for (const o of map.objects ?? []) {
    move(o, o.kind === 'sign' || o.kind === 'script' ? postOk : reach, o.kind);
  }
  for (const n of map.npcs ?? []) move(n, reach, `npc ${n.id}`);

  console.log(`  ${map.id}: ${seen.size} cells reachable on foot`
    + (ok ? '  -- everything placed is reachable' : '  -- SOMETHING IS WRONG'));
  return ok;
}
