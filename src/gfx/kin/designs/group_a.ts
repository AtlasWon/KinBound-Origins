/**
 * Design group A -- the plants, plus the thing that lives in the mud with them.
 *
 * Five species that have to sit together as a set and still be five different
 * animals when you flatten them to black:
 *
 *   bramblehusk   a low hunched forager carrying a coiled basket of dead thorn
 *                 canes on its back, head thrust out low in front of it.
 *   thornmarch    its evolution: an upright slab-sided wall of mossed stone
 *                 with long arms hanging clear of its flanks and the same
 *                 coiled thorn bundle laid across its shoulders.
 *   mossback      a wide faceted boulder with a shaggy moss fringe hanging
 *                 over one enormous half-shut eye, on four stub legs.
 *   bladderwrack  a leaning kelp column, no legs at all, fronds streaming to
 *                 one side, golden float bladders bunched along them, splayed
 *                 on a holdfast gripping its rock.
 *   silthopper    a coiled mud cricket, front end down on the floor, two huge
 *                 folded jumping legs standing above its own back.
 *
 * The family line is what they are *made of*, not what shape they are: every
 * one of them is bound, coiled or knotted out of plant matter, and every one of
 * them shows the binding. The two that are an evolution line share the coiled
 * thorn basket, the heavy brow and the low sunk head; nothing else.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, EYE_DARK, INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, bellyPlate, blob, blobFront, bottomOf, cell, cellOver, crease, eye, hand,
  leaf, legColumn, limbPath, mouthLine, muzzle, normalAt, nostril, path, paw, plate, poly,
  polyFront, polyLine, speckle, stroke,
  type Pen, type Pt,
} from '../parts.js';

/** Local lerp, so the helpers below can read as arithmetic rather than calls. */
const lerpN = (a: number, b: number, t: number): number => a + (b - a) * t;

/* ========================================================== bramblehusk */

/**
 * A coiled basket of dead thorn canes, seen from the side.
 *
 * Drawn as contour bands rather than as a lattice: a coiled basket's weft wraps
 * horizontally, so from the side it reads as a stack of shallow arcs bowing
 * *down* at their centres, each bound to the next by a stitch. A criss-cross
 * lattice was the first attempt and at this size it came out as noise.
 */
function coiledHusk(p: Pen, dx: number, dy: number, rx: number, ry: number, coils: number,
  band = ACCENT_DARK, lit = ACCENT_LIT): void {
  for (let k = 1; k <= coils; k++) {
    const t = k / (coils + 1);
    const y = dy - ry + ry * 2 * t;
    const half = rx * Math.sqrt(Math.max(0, 1 - ((y - dy) / ry) ** 2)) * 0.98;
    const bow = 3.2 * (1 - Math.abs(t - 0.5));
    const bandPts = path([[dx - half, y - bow * 0.4], [dx, y + bow], [dx + half, y - bow * 0.4]] as Pt[]);
    for (const q of bandPts) {
      cellOver(p, q[0], q[1], band);
      cellOver(p, q[0], q[1] + 1, DEEP);
      cellOver(p, q[0], q[1] - 1, lit);
    }
    // Binding stitches, offset half a pitch each row so the weave staggers.
    const pitch = 11;
    for (let s = -3; s <= 3; s++) {
      const sx = dx + s * pitch + (k % 2) * pitch * 0.5;
      if (Math.abs(sx - dx) > half - 2) continue;
      const idx = Math.round(((sx - (dx - half)) / (half * 2)) * (bandPts.length - 1));
      const q = bandPts[Math.max(0, Math.min(bandPts.length - 1, idx))]!;
      for (let d = -3; d <= 2; d++) cellOver(p, q[0], q[1] + d, d < 0 ? lit : band);
      cellOver(p, q[0] - 1, q[1] - 2, lit);
    }
  }
}

/**
 * A row of thorns growing off an elliptical rim, swept back.
 *
 * Written by hand rather than with `spineRow`, for two reasons found the hard
 * way. That helper grows each spine along its path's left-hand normal, and an
 * arc walked from PI to 2PI has its left hand pointing *into* the shape, so the
 * first attempt planted every thorn inside the basket where it read as a fan of
 * pale scratches. And its base is proportional to its length, so a thorn long
 * enough to break the contour came out nine cells wide at the root and the crown
 * read as a row of petals. A thorn is narrow, uneven and leaning.
 *
 * Shared by the two species in the evolution line, which is the point: the same
 * thorns on a basket on a forager's back and on a bale across a giant's
 * shoulders is what makes them the same animal twice.
 */
function thornCrown(p: Pen, dx: number, dy: number, rx: number, ry: number, count: number,
  a0: number, a1: number, long: number, short: number, v = ACCENT): void {
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const a = Math.PI * (a0 + t * (a1 - a0));
    const bx = dx + Math.cos(a) * rx, by = dy + Math.sin(a) * ry;
    // Alternating lengths, and shorter at the front so the crown never out-
    // shouts the head. Equal spikes read as machined.
    const ln = (i % 2 ? long : short) * (0.6 + t * 0.55);
    const dir = a + 0.26;
    const tx = bx + Math.cos(dir) * ln, ty = by + Math.sin(dir) * ln;
    const nx = -Math.sin(dir) * 2.6, ny = Math.cos(dir) * 2.6;
    poly(p, [[bx - nx, by - ny], [bx + nx, by + ny], [tx, ty]], v);
    stroke(p, bx - nx, by - ny, tx, ty, ACCENT_LIT, false);
    stroke(p, bx + nx, by + ny, tx, ty, ACCENT_DARK, false);
    cell(p, tx, ty, SPEC);
  }
}

/**
 * "Hunched quadruped under a woven thorn shell."
 *
 * The pose is all forward: the shoulders are the highest point of the animal,
 * the head is carried *below* the line of the back and pushed out well in front
 * of it, and the near forefoot has already landed a step ahead. A quadruped
 * with its head level with its spine is a pony; drop the head eight cells and
 * it becomes something that pushes through a hedge for a living.
 *
 * The husk is the signature and it is deliberately bigger than the animal
 * inside it -- it overhangs the flanks so the green body only shows as a strip
 * along the bottom and four legs underneath.
 */
function bramblehusk(p: Pen): void {
  const G = p.ground, cx = p.cx;

  // The stock verdant pass grows three leaf blades off the highest contour,
  // which here is the crown of the husk -- they landed as one tan lump on top
  // of a tan dome and read as a growth rather than as foliage. The live cane
  // below does that job on purpose, where it can be seen against the sky.
  p.noTypeTraits();

  const bodyX = cx + 2, bodyY = G - 40;
  const DX = cx + 6, DY = G - 56, RX = 30, RY = 23;
  const headX = cx - 38, headY = G - 34;

  /* --- far legs. Short braced columns: this animal is close to the floor. */
  legColumn(p, cx + 18, bodyY + 12, G - 1, { tone: SHADE, side: 1, thick: 12, footHalf: 8, claws: false });
  legColumn(p, cx - 12, bodyY + 13, G - 2, { tone: SHADE, side: -1, thick: 11, footHalf: 7, claws: false });

  /* --- the body. Barely taller than the legs are long, and the haunch is its
     own mass so the back half has some weight in it. */
  blob(p, bodyX, bodyY, 31, 20, BASE);
  blobFront(p, bodyX + 20, bodyY + 2, 17, 18, BASE);
  bellyPlate(p, bodyX - 4, bodyY + 13, 20, 8, 2);

  /* --- near legs. The forefoot is planted a good way ahead of the shoulder,
     which is the whole of what makes this a walk and not a stand. */
  legColumn(p, cx + 12, bodyY + 15, G, { tone: BASE, side: 1, thick: 13, footHalf: 9, front: true, claws: false });
  limbPath(p, [[cx - 16, bodyY + 12], [cx - 22, bodyY + 22], [cx - 27, G - 6]], 14, 11, BASE, { front: true, bulge: 1 });
  paw(p, cx - 28, G, 9, { tone: BASE, toes: 3, claws: true, clawTone: ACCENT_LIT });

  /* --- the neck, dropping forward and down out of the shoulders. */
  limbPath(p, [[cx - 14, bodyY + 2], [cx - 26, G - 34], [headX + 12, headY - 3]], 22, 17, BASE, { front: true });

  /* --- the head: a blunt wedge, low, carried below the line of the back.

     Kept deliberately bare above the eyes. The first three passes at this face
     stacked a brow shelf, a pair of shaded sockets and two thorn spurs into the
     same fifteen cells that the `angry` eye already fills with its own bone
     brow, and every one of them was invisible in the code and a tangle of green
     and tan in the picture. A face needs one dark thing over the eye, not four. */
  blobFront(p, headX, headY, 18, 16, BASE);
  // A pale cheek pad under each socket, so the dark eye has something bright to
  // be a hole in, and a hard crease along its top edge.
  if (!p.back) {
    blob(p, headX - 6, headY + 9, 13, 6, LIGHT);
    for (const q of arc(headX - 5, headY + 9, 11, 5, Math.PI * 1.02, Math.PI * 1.98, 16)) cellOver(p, q[0], q[1], DEEP);
  }

  /* --- the husk. A dome of coiled dead cane sitting over the whole back and
     overhanging the flanks, drawn after the body so it covers it. */
  blobFront(p, DX, DY, RX, RY, ACCENT);
  // The rim: the underside of the basket, a hard dark lip the body goes under.
  for (const q of arc(DX, DY, RX, RY, 0.08, Math.PI - 0.08, 34)) {
    cellOver(p, q[0], q[1], ACCENT_DARK);
    cellOver(p, q[0], q[1] - 1, DEEP);
  }
  coiledHusk(p, DX, DY, RX, RY, 5);

  /* --- the thorns. Without these the husk is a wicker basket and the species
     is called Bramblehusk, so they have to be long enough to survive their own
     two cells of outline and to break the top contour by a real margin.

     Every one of them straddles the dome edge rather than starting at it: a
     spike that merely touches a mass gets inked separately and reads as debris
     stuck to the animal. */
  thornCrown(p, DX, DY, RX - 3, RY - 3, 9, 1.0, 1.99, 13, 9, ACCENT);
  // Hooks lying flat on the surface of the husk, leaning back the way a
  // bramble's do. No silhouette cost, and they are what says thorn rather than
  // basket on the part of the shell that faces the viewer.
  for (const [hx, hy] of [[DX - 17, DY + 3], [DX - 3, DY + 11], [DX + 13, DY + 5], [DX - 23, DY - 7]] as const) {
    poly(p, [[hx, hy], [hx + 6, hy + 1], [hx + 1, hy - 5]], ACCENT_DARK);
    stroke(p, hx, hy, hx + 1, hy - 5, SPEC);
  }

  /* --- live growth: three thorn canes bursting out of the crown of the husk,
     splayed at different angles off one root so they share a single outline.
     Last season's growth carrying this season's, which is the whole idea of
     the animal, and the only part of the silhouette that is not a curve.

     It began as one thick smooth cane and read unmistakably as a raised arm
     with a hand on the end of it. Three thin ones going three ways cannot. */
  const root: Pt = [DX + 12, DY - 17];
  const canes: Array<[Pt[], number]> = [
    [[root, [DX + 22, DY - 27], [DX + 30, DY - 41], [DX + 28, DY - 50]], 5],
    [[root, [DX + 24, DY - 24], [DX + 36, DY - 30], [DX + 43, DY - 27]], 4.5],
    [[root, [DX + 15, DY - 28], [DX + 12, DY - 39]], 4],
  ];
  for (const [pts, w] of canes) {
    const d = path(pts);
    limbPath(p, d, w, 1.8, ACCENT_DARK, { front: true, lit: ACCENT_LIT });
    for (const t of [0.45, 0.78]) {
      const q = d[Math.round(t * (d.length - 1))]!;
      poly(p, [[q[0] - 1, q[1] - 1], [q[0] + 2, q[1] + 2], [q[0] + 6, q[1] + 4]], ACCENT_LIT);
    }
  }
  leaf(p, DX + 27, DY - 49, 13, Math.PI * 1.34, 4.2, ACCENT);
  leaf(p, DX + 11, DY - 38, 11, Math.PI * 1.16, 3.6, ACCENT);
  leaf(p, DX + 42, DY - 27, 10, Math.PI * 1.92, 3.2, SHADE);

  if (p.back) { p.face(headX, headY, 17); return; }

  /* --- the face. Small, hard and set deep under the brow: an animal that
     shoves. Two thorn spurs above the eyes tie the head to the husk. */
  eye(p, headX - 9, headY - 1, 6.2, 'angry', { side: -1, iris: EYE_DARK, sclera: ACCENT_LIT });
  eye(p, headX + 9, headY - 3, 4.9, 'angry', { side: 1, iris: EYE_DARK, sclera: ACCENT_LIT });
  p.face(headX, headY, 17);

  // Two thorn spurs, and they belong on the *crown*, clear of the brow. Placed
  // just above the eyes -- which is where anatomy puts them -- they collided
  // with the bone brow the angry eye draws for itself and the whole socket came
  // out as a tangle of tan.
  for (const [sx, sy, ln, ang] of [[headX - 12, headY - 12, 13, Math.PI * 1.10], [headX + 4, headY - 15, 10, Math.PI * 1.88]] as const) {
    poly(p, [[sx - 2.5, sy + 3], [sx + 2.5, sy + 3], [sx + Math.cos(ang) * ln, sy + Math.sin(ang) * ln]], ACCENT);
    stroke(p, sx - 2.5, sy + 3, sx + Math.cos(ang) * ln, sy + Math.sin(ang) * ln, ACCENT_LIT, false);
    cell(p, sx + Math.cos(ang) * ln, sy + Math.sin(ang) * ln, SPEC);
  }
  // A short blunt snout pushed down and forward out of the wedge, with the jaw
  // set in a flat line. A long muzzle would make this a dog; the shortness plus
  // the shelf of brow above it is what makes it a thing that shoves.
  muzzle(p, headX - 12, headY + 8, 9, 5, { dir: -1, tone: LIGHT, detail: true, frown: 1, fangs: true });
}

/* =========================================================== thornmarch */

/**
 * One slab of stone with moss growing along its upper edge.
 *
 * `plate` gives the bevel and the gutter; the moss is what makes it a rock that
 * has been standing outdoors for a season rather than a grey pentagon. It goes
 * on the *top* edge only, in the pale body tone, and it is deliberately ragged:
 * an even fringe reads as trim.
 */
function mossySlab(p: Pen, pts: Pt[], v: number, seed: number): void {
  plate(p, pts, v);
  let hi = pts[0]!, lo = pts[0]!;
  for (const q of pts) { if (q[1] < hi[1]) hi = q; if (q[1] > lo[1]) lo = q; }
  // The two edges leaving the topmost corner are the ones facing the sky.
  const i = pts.indexOf(hi);
  for (const j of [(i + 1) % pts.length, (i - 1 + pts.length) % pts.length]) {
    const b = pts[j]!;
    const n = Math.max(2, Math.round(Math.hypot(b[0] - hi[0], b[1] - hi[1]) / 3));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = lerpN(hi[0], b[0], t), y = lerpN(hi[1], b[1], t);
      const d = 1 + ((k * 7 + seed) % 3);
      for (let m = 0; m < d; m++) cellOver(p, x, y + m, m === 0 ? LIGHT : (m === 1 ? BASE : SHADE));
      if ((k + seed) % 3 === 0) cellOver(p, x, y - 1, LIGHT);
    }
  }
}


/**
 * "Broad-shouldered walker plated in mossed slabs."
 *
 * Bramblehusk grown up, and grown *up* is the word: the forager that carried
 * its husk on its back now carries it across its shoulders, and stands to do
 * it. The shared features are the coiled thorn bale, the thorn spurs on the
 * skull and the head sunk forward under a brow with no neck showing. Nothing
 * else about the two drawings is the same shape.
 *
 * The pose is a walk that has just put a knuckle down: the near arm is long
 * enough to reach the floor and the far one hangs, the near leg has swung
 * forward, and the whole torso is a wedge leaning into it. A brute standing
 * square on two legs is a statue -- and "the Standing Hedge" is a thing that
 * chose to stop, not a thing that cannot move.
 */
function thornmarch(p: Pen): void {
  const G = p.ground, cx = p.cx;

  // Stone chips every eleventh edge cell to EMPTY. On a creature whose thorns
  // and moss fringe are its whole read, that pass punches holes through both.
  // The slabs get their broken edges drawn instead.
  p.noTypeTraits();

  const hipY = G - 50, shY = G - 82;
  const headX = cx - 13, headY = G - 76;
  const BX = cx + 3, BY = G - 94, BRX = 26, BRY = 9;   // the shoulder bale

  /* --- far leg and far arm, in the recessed tone. Both hang from the far edge
     of the trunk and both are behind it. */
  legColumn(p, cx + 13, hipY + 4, G - 1, { tone: SHADE, side: 1, thick: 17, footHalf: 12, claws: true });
  limbPath(p, [[cx + 20, shY + 2], [cx + 37, G - 58], [cx + 34, G - 34]], 15, 12, SHADE, { bulge: 2 });
  hand(p, cx + 34, G - 27, 9, { tone: SHADE, side: 1, fingers: 3, fist: true });

  /* --- the trunk: a slab-sided wall, wide at the shoulder and only a little
     narrower at the hip. Squared off rather than rounded, because everything
     about this animal is a piece of wall.

     Its exact left and right edges matter more than its shape. The arms hang
     *outside* them with real empty space in the gap, which is the single thing
     that makes a heavy biped read as a biped: four limbs coming straight down
     off one mass is a quadruped no matter how broad the shoulders are, and the
     first three passes at this creature all came out as a mossy ox because the
     arms were welded to the flanks. */
  polyFront(p, [[cx - 15, shY - 2], [cx + 17, shY - 4], [cx + 19, hipY + 10], [cx - 12, hipY + 12]], BASE, DEEP, 0);
  blob(p, cx + 2, hipY + 4, 17, 13, BASE);
  blobFront(p, cx + 18, shY + 1, 13, 12, SHADE);
  blobFront(p, cx - 20, shY - 1, 15, 14, BASE);

  /* --- near leg, forward and planted. The two feet leave a wide gap. */
  legColumn(p, cx - 5, hipY + 4, G, { tone: BASE, side: -1, thick: 19, footHalf: 13, front: true, claws: true });

  /* --- the near arm, hanging clear of the flank with the elbow driven out. */
  limbPath(p, [[cx - 22, shY + 2], [cx - 42, G - 56], [cx - 38, G - 30]], 18, 14, BASE, { front: true, bulge: 2.5 });
  crease(p, cx - 42, G - 56, 8);
  hand(p, cx - 38, G - 22, 11, { tone: BASE, side: -1, fingers: 3, fist: true });
  // Stone knuckles on the fist, so the hand reads as a mallet rather than a mitt.
  for (let i = 0; i < 3; i++) {
    const kx = cx - 47 + i * 6;
    blob(p, kx, G - 15, 3, 3.2, ACCENT);
    cellOver(p, kx - 1, G - 17, ACCENT_LIT);
  }

  /* --- the plating. This is where the species lives, and the first passes at
     it failed the same way: four grey rectangles scattered over a green animal
     read as patches, and the creature stayed a mossy ape.

     "Plated in mossed slabs" means the slabs are the *surface*. So they tile --
     shoulder, chest, flank, hip, thigh, forearm -- with two or three cells of
     green left showing in every gutter between them, and moss hanging off every
     upper edge. Grey against green across most of the body is also what finally
     broke the trunk up into masses: a body of one material and one hue reads as
     one lump whatever is drawn on it. */
  const slabs: Array<[Pt[], number]> = [
    [[[cx - 33, shY - 4], [cx - 16, shY - 12], [cx - 4, shY - 4], [cx - 8, shY + 10], [cx - 28, shY + 10]], ACCENT],
    [[[cx + 1, shY - 6], [cx + 21, shY - 2], [cx + 24, shY + 12], [cx + 2, shY + 10]], ACCENT_DARK],
    [[[cx + 26, shY + 4], [cx + 37, shY + 10], [cx + 34, G - 46], [cx + 25, G - 48]], ACCENT_DARK],
    [[[cx - 13, shY + 15], [cx + 3, shY + 13], [cx + 5, shY + 30], [cx - 11, shY + 32]], ACCENT],
    [[[cx + 8, shY + 14], [cx + 22, shY + 16], [cx + 21, shY + 31], [cx + 8, shY + 30]], ACCENT_DARK],
    [[[cx - 11, hipY + 2], [cx + 6, hipY - 1], [cx + 8, hipY + 14], [cx - 10, hipY + 16]], ACCENT],
    [[[cx + 11, hipY], [cx + 21, hipY + 3], [cx + 20, hipY + 18], [cx + 11, hipY + 16]], ACCENT_DARK],
    [[[cx - 48, G - 50], [cx - 36, G - 54], [cx - 31, G - 36], [cx - 43, G - 32]], ACCENT],
    [[[cx - 20, G - 34], [cx - 7, G - 36], [cx - 5, G - 14], [cx - 18, G - 12]], ACCENT],
    [[[cx + 8, G - 36], [cx + 21, G - 33], [cx + 20, G - 14], [cx + 8, G - 16]], ACCENT_DARK],
  ];
  slabs.forEach(([pts, tone], i) => mossySlab(p, pts, tone, i));

  /* --- the bale. The husk, evolved: the same coiled cane, now a long bundle
     laid across the shoulders instead of a dome over the back. It is drawn
     before the head, so the skull comes out from *under* it. */
  blobFront(p, BX, BY, BRX, BRY, ACCENT_DARK);
  coiledHusk(p, BX, BY, BRX, BRY, 3, ACCENT, ACCENT_LIT);
  thornCrown(p, BX, BY, BRX - 2, BRY - 1, 11, 1.02, 1.98, 14, 9, ACCENT_DARK);
  // Loose cane ends trailing off the back of the bale, so it reads as bound
  // rather than moulded.
  for (const [ex, ey, len, ang] of [[BX + 22, BY + 3, 14, 0.24], [BX + 24, BY - 2, 10, -0.1]] as const) {
    limbPath(p, [[ex, ey], [ex + Math.cos(ang) * len, ey + Math.sin(ang) * len]], 5, 2, ACCENT_DARK, { lit: ACCENT_LIT });
  }

  /* --- the head. Small, wide, and pushed forward out from under the bale with
     no neck at all. On a creature this heavy the absence of a neck is most of
     what makes it read as heavy, and a small head on a wide shoulder line is
     most of what makes the shoulder line read as wide. */
  blobFront(p, headX, headY, 15, 13, BASE);
  // Jaw: a broad flat shelf under the skull, wider than it is deep.
  blobFront(p, headX - 5, headY + 9, 11, 5, LIGHT);
  for (const q of arc(headX - 5, headY + 9, 11, 5, Math.PI * 1.02, Math.PI * 1.98, 16)) cellOver(p, q[0], q[1], DEEP);
  // Two thorn spurs on the crown -- the parent's, grown into short stone horns.
  for (const [sx, sy, ln, ang] of [[headX - 10, headY - 10, 14, Math.PI * 1.14], [headX + 7, headY - 11, 11, Math.PI * 1.86]] as const) {
    poly(p, [[sx - 3, sy + 3], [sx + 3, sy + 3], [sx + Math.cos(ang) * ln, sy + Math.sin(ang) * ln]], ACCENT);
    stroke(p, sx - 3, sy + 3, sx + Math.cos(ang) * ln, sy + Math.sin(ang) * ln, ACCENT_LIT, false);
    cell(p, sx + Math.cos(ang) * ln, sy + Math.sin(ang) * ln, SPEC);
  }

  if (p.back) { p.face(headX, headY, 16); return; }

  /* --- the face. Half-lidded and immovable: this is a thing farmers build
     around. Where the forager glares out from under its brow, the giant barely
     opens its eyes at all, and that difference in the *lid* is the cheapest way
     to age an animal by twenty years. */
  eye(p, headX - 7, headY, 5.4, 'hooded', { side: -1, iris: ACCENT_DARK, lid: BASE });
  eye(p, headX + 8, headY - 2, 4.6, 'hooded', { side: 1, iris: ACCENT_DARK, lid: BASE });
  p.face(headX, headY, 16);

  nostril(p, headX - 11, headY + 6, -1);
  nostril(p, headX - 7, headY + 7, 1);
  mouthLine(p, headX - 6, headY + 12, 7, 0.5, true);
}

/* ============================================================= mossback */

/**
 * A shaggy cap of moss lying over a surface, with a clumped, uneven lower edge.
 *
 * Drawn column by column rather than with `mane`, because a mane grows along
 * its path's left-hand normal and a cap has to hang *down* off a top contour on
 * one side and *over* it on the other. Two numbers do all the work, and they
 * are the two the parts library's own notes warn about: how near the trough
 * between clumps gets to zero, and whether consecutive clumps are the same
 * length. Equal clumps give a comb; a shallow trough gives a ribbed tube.
 */
function mossCap(p: Pen, x0: number, x1: number, topAt: (x: number) => number,
  depth: number, clump: number): void {
  for (let x = Math.round(x0); x <= Math.round(x1); x++) {
    const t = (x - x0) / Math.max(1, x1 - x0);
    const phase = ((x - x0) / clump) % 1;
    const which = Math.floor((x - x0) / clump);
    const vary = 0.55 + (((which * 37) % 9) / 9) * 0.75;
    const jag = depth * (0.42 + 0.58 * (1 - Math.abs(phase * 2 - 1)) ** 0.8) * vary;
    const top = topAt(x);
    // The mass: pale on the sunlit crown, mid-tone on the flanks.
    for (let y = Math.round(top - jag); y <= Math.round(top + depth * 0.9); y++) {
      const d = y - (top - jag);
      // Mostly the mid tone. Painting the clump tips pale -- which is what the
      // first version did -- hands every one of them to the shading pass as a
      // mass under five cells thick, and a thin mass gets the light band flat:
      // the whole pelt came out the colour of frost.
      p.m.set(x, y, d < 3 ? SHADE : d < depth * 0.6 ? BASE : SHADE);
    }
    // A strand line down every third clump, so the cap has depth rather than
    // reading as one furry slab.
    if ((which % 3) === 0 && phase < 0.16) {
      for (let k = 0; k < depth * 0.9; k++) cellOver(p, x, top - jag + 2 + k, SHADE);
    }
    if (t > 0.02 && t < 0.98 && phase > 0.42 && phase < 0.58) cellOver(p, x, top - jag + 4, LIGHT);
  }
}

/**
 * "Low mossed boulder with a slow-blinking eye and stubby legs."
 *
 * The only species on the roster with no head, and that is the design: the
 * animal is a rock, and the face is a crack in the front of it with one
 * enormous half-shut eye in the crack. Two eyes would have made it a creature
 * wearing a rock; one makes it the rock.
 *
 * Everything else follows from being *wide*. It is half again as wide as it is
 * tall, its top is a hard faceted plane rather than a dome, and the four legs
 * are barely long enough to be legs at all. The moss is the second material and
 * it carries the whole of the top: bare grey stone below the waterline, a
 * hanging green pelt above it, and a clump of ferns growing out of the crown.
 */
function mossback(p: Pen): void {
  const G = p.ground, cx = p.cx;

  const eyeX = cx - 26, eyeY = G - 34;

  /* --- far legs. Stubs, in the recessed tone, barely clear of the floor. */
  legColumn(p, cx - 20, G - 13, G - 1, { tone: SHADE, side: -1, thick: 13, footHalf: 9, claws: false });
  legColumn(p, cx + 24, G - 12, G - 1, { tone: SHADE, side: 1, thick: 12, footHalf: 8, claws: false });

  /* --- the boulder. A polygon, not an ellipse: a rock convinces through its
     flats and its corners, and the one thing a generated blob can never do is
     have a straight edge. It is asymmetric on purpose -- higher and squarer at
     the back, sheared away at the front over the eye. */
  const rock: Pt[] = [
    [cx - 52, G - 30], [cx - 44, G - 46], [cx - 14, G - 58], [cx + 24, G - 55],
    [cx + 50, G - 36], [cx + 54, G - 16], [cx + 34, G - 7], [cx - 34, G - 7], [cx - 53, G - 14],
  ];
  poly(p, rock, ACCENT);
  // Facet seams: straight runs with a lit lip above and a dark gutter below, so
  // each plane turns away from the next instead of blending into it.
  for (const [ax, ay, bx, by] of [
    [cx - 44, G - 44, cx - 20, G - 22], [cx - 20, G - 22, cx + 18, G - 26],
    [cx + 18, G - 26, cx + 48, G - 34], [cx - 12, G - 56, cx - 4, G - 27],
    [cx + 22, G - 53, cx + 17, G - 27], [cx + 30, G - 44, cx + 44, G - 20],
    [cx + 4, G - 20, cx + 34, G - 15],
  ] as const) {
    stroke(p, ax, ay, bx, by, ACCENT_DARK);
    stroke(p, ax, ay - 1, bx, by - 1, ACCENT_LIT);
  }
  speckle(p, cx - 46, G - 26, cx + 46, G - 10, 0.06, ACCENT_DARK);
  // The rock is undercut: a dark band all along the bottom so the boulder sits
  // on the floor rather than being printed on it.
  for (let x = cx - 50; x <= cx + 50; x++) {
    const by = bottomOf(p, x);
    if (by < G - 6) for (let k = 0; k < 5; k++) cellOver(p, x, by - k, k < 2 ? ACCENT_DARK : SHADE);
  }
  // Moss creeping down onto the grey face in patches, so the two materials
  // interlock instead of meeting at one clean line.
  for (const [mx, my, mr] of [[cx - 30, G - 30, 7], [cx + 12, G - 40, 6], [cx + 34, G - 26, 5]] as const) {
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, r = mr * (0.5 + p.rng.next() * 0.6);
      blob(p, mx + Math.cos(a) * r * 0.7, my + Math.sin(a) * r * 0.5, 2.2, 1.8, i % 3 === 0 ? SHADE : BASE);
    }
  }

  /* --- near legs, in the stone tone. The near foreleg is reaching -- a good
     eight cells ahead of the rock it is carrying. On a creature that is famous
     for covering two metres a day, one leg out in front is the entire pose. */
  legColumn(p, cx - 36, G - 11, G, { tone: ACCENT, side: -1, thick: 15, footHalf: 11, front: true, claws: false });
  legColumn(p, cx + 34, G - 11, G, { tone: ACCENT, side: 1, thick: 14, footHalf: 10, front: true, claws: false });

  /* --- the moss. The second material, and the thing that turns a rock into a
     living rock: a thick pelt lying over the whole crown and hanging past the
     front edge into a fringe above the eye. */
  mossCap(p, cx - 52, cx + 52, (x) => {
    const t = (x - (cx - 52)) / 104;
    // Follows the rock's own top plane rather than a ruled line, so the pelt
    // sits on the animal instead of across it.
    return G - 30 - Math.sin(Math.min(1, t * 1.25) * Math.PI) * 26 - t * 4;
  }, 15, 11);
  // The fringe over the brow: a second, deeper run of clumps hanging past the
  // front-left corner and stopping just short of the eye.
  mossCap(p, cx - 52, cx - 14, (x) => G - 46 + (cx - 14 - x) * 0.26, 13, 10);

  /* --- ferns growing out of the crown. Three blades at three angles: growth,
     not a fringe. They are the only thing on this animal that points upward. */
  for (const [fx, fy, ln, ang, w, tone] of [
    [cx - 10, G - 64, 22, Math.PI * 1.26, 5.4, SHADE],
    [cx + 6, G - 62, 18, Math.PI * 1.60, 4.6, BASE],
    [cx + 22, G - 58, 15, Math.PI * 1.88, 4.0, SHADE],
  ] as const) {
    limbPath(p, [[fx, fy + 10], [fx, fy + 1]], 5, 3.5, SHADE);
    leaf(p, fx, fy, ln, ang, w, tone);
  }

  /* --- a scatter of chipped rubble at the foot of the near side, so the thing
     reads as having ground its way here rather than been placed. */
  for (const [rx, ry, r] of [[cx - 48, G - 2, 3.2], [cx - 42, G - 1, 2.2], [cx + 46, G - 2, 2.6]] as const) {
    blob(p, rx, ry, r, r * 0.7, ACCENT_DARK);
    cellOver(p, rx - 1, ry - 2, ACCENT_LIT);
  }

  if (p.back) { p.face(eyeX, eyeY, 14); return; }

  /* --- the crack, and the eye in it. The crack is drawn first and is wider
     than the eye at both ends, so the eye reads as something looking out of a
     fissure rather than as an eye painted on a stone. */
  poly(p, [[eyeX - 20, eyeY - 2], [eyeX - 6, eyeY - 9], [eyeX + 14, eyeY - 5],
    [eyeX + 18, eyeY + 4], [eyeX - 2, eyeY + 10], [eyeX - 18, eyeY + 6]], SHADE);
  for (const q of arc(eyeX - 1, eyeY, 19, 9, Math.PI * 1.02, Math.PI * 1.98, 22)) cellOver(p, q[0], q[1] + 1, DEEP);
  // Half shut, and huge: nine cells of half-width on a creature this size. The
  // brief says slow-blinking and the lid is the only place that can live.
  // Sclera in pale stone rather than white. A stark white ring this size on a
  // grey rock reads as a cartoon eyeball stuck on; the warm pale tone keeps it
  // part of the same object.
  eye(p, eyeX, eyeY - 1, 8.6, 'sleepy', { side: -1, iris: ACCENT_DARK, sclera: ACCENT_LIT, lid: ACCENT });
  p.face(eyeX, eyeY, 14);

  // The mouth: a second crack, low and long, with a lit lower lip. A rock's
  // mouth is a fissure, so it is drawn as one -- kinked, not curved.
  polyLine(p, [[cx - 40, G - 19], [cx - 24, G - 16], [cx - 6, G - 18], [cx + 8, G - 15]], INNER, false, true);
  polyLine(p, [[cx - 40, G - 18], [cx - 24, G - 15], [cx - 6, G - 17], [cx + 8, G - 14]], ACCENT_LIT, false, true);
}

/* ========================================================= bladderwrack */

/**
 * One strap of kelp: a long blade along a curve, with a dark midrib and pairs
 * of float bladders swelling either side of it.
 *
 * The bladders are the species, so they are drawn as *pairs straddling the
 * midrib* rather than as beads down the middle -- which is how real wrack grows
 * and, more usefully, is the only arrangement that still reads as bladders when
 * the strap is nine cells wide. A single row down the centre came out as a
 * zip.
 */
function kelpStrap(p: Pen, pts: Pt[], w0: number, w1: number, tone: number, bladders: number[]): void {
  const d = path(pts);
  // Stamped by hand rather than with `limbPath`, because the width has to
  // *undulate*. A blade of constant taper comes out as a sausage, and three
  // sausages hanging off a stem read as tentacles; the slow swell and pinch
  // along the length is the whole difference between kelp and an arm.
  const width = (t: number): number => (w0 + (w1 - w0) * t) * (0.8 + 0.2 * Math.cos(t * Math.PI * 5.5));
  for (const pass of [0, 1]) {
    for (let i = 0; i < d.length; i++) {
      const t = i / (d.length - 1);
      const r = Math.round(width(t) / 2) + (pass === 0 ? 2 : 0);
      const q = d[i]!;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy > r * r + r * 0.6) continue;
          const px = Math.round(q[0]) + dx, py = Math.round(q[1]) + dy;
          if (pass === 0) { if (p.m.filled(px, py)) p.m.set(px, py, DEEP); }
          else p.m.set(px, py, tone);
        }
      }
    }
  }
  for (let i = 1; i < d.length; i++) {
    const t = i / (d.length - 1), r = width(t) / 2;
    const n = normalAt(d, i), q = d[i]!;
    const up = n[1] < 0 || (n[1] === 0 && n[0] < 0) ? 1 : -1;
    cellOver(p, q[0] + n[0] * r * up, q[1] + n[1] * r * up, tone === SHADE ? BASE : LIGHT);
    cellOver(p, q[0] - n[0] * r * up, q[1] - n[1] * r * up, DEEP);
  }
  for (let i = 2; i < d.length - 2; i += 1) cellOver(p, d[i]![0], d[i]![1], DEEP);
  for (const t of bladders) {
    const i = Math.round(t * (d.length - 1));
    const q = d[i]!, n = normalAt(d, i);
    const off = ((w0 + (w1 - w0) * t) / 2) * 0.62;
    for (const s of [-1, 1]) {
      const bx = q[0] + n[0] * off * s, by = q[1] + n[1] * off * s;
      blob(p, bx, by, 3.3, 2.9, ACCENT);
      cellOver(p, bx - 1, by - 1, ACCENT_LIT);
      cellOver(p, bx, by + 2, ACCENT_DARK);
    }
  }
}

/**
 * "Draped kelp column with float bladders and a holdfast base."
 *
 * The one with no legs, no feet and nothing resembling a limb: a stem standing
 * on a fist of roots. Everything is decided by that. It is the tallest and by
 * far the narrowest thing in the group, it has no bilateral pose to strike, and
 * so the whole of its life has to come from the *lean* -- an S through the
 * stipe with every frond streaming the same way, as if a current has just gone
 * past and the animal has not finished swaying back.
 *
 * The Vellum entry says it anchors to one rock and will find the same rock
 * again if you prise it off. So the holdfast is drawn gripping something: a
 * splayed knot of root fingers with a stone clamped in them, and it is the
 * widest part of the creature.
 */
function bladderwrack(p: Pen): void {
  const G = p.ground, cx = p.cx;

  // The stock verdant pass grows leaf blades off the highest contour. On this
  // species the highest contour is the crown, six cells above the eyes, and
  // three blades landed there read as a hat rather than as foliage on a thing
  // that is already entirely foliage.
  p.noTypeTraits();

  const crownX = cx + 14, crownY = G - 96;

  /* --- the rock, and the holdfast gripping it. Drawn first and widest: this
     creature's whole identity is that it is fastened to one stone. */
  poly(p, [[cx - 40, G - 8], [cx - 32, G - 21], [cx - 14, G - 23], [cx - 2, G - 13], [cx - 4, G - 1], [cx - 38, G - 1]], SHADE);
  for (const [ax, ay, bx, by] of [[cx - 34, G - 18, cx - 18, G - 13], [cx - 22, G - 22, cx - 16, G - 6]] as const) {
    stroke(p, ax, ay, bx, by, DEEP);
    stroke(p, ax, ay - 1, bx, by - 1, LIGHT);
  }
  // Root fingers, splayed over the stone and onto the floor. Seven of them, at
  // uneven angles and uneven lengths, because a symmetric root is a hand.
  for (const [ang, len, th, tone] of [
    [Math.PI * 0.96, 30, 8, ACCENT_DARK], [Math.PI * 0.86, 24, 7, SHADE],
    [Math.PI * 0.74, 17, 6, ACCENT_DARK], [Math.PI * 0.56, 15, 6, SHADE],
    [Math.PI * 0.30, 21, 7, ACCENT_DARK], [Math.PI * 0.14, 28, 8, SHADE],
    [Math.PI * 0.04, 34, 7, ACCENT_DARK],
  ] as const) {
    const sx = cx - 12, sy = G - 23;
    limbPath(p, [[sx, sy], [sx + Math.cos(ang) * len * 0.6, sy + Math.sin(ang) * len * 0.55],
      [sx + Math.cos(ang) * len, G - 2]], th, 3, tone, { front: true, lit: BASE });
  }

  /* --- fronds on the far side, in the recessed tone, laid down before the
     stipe so the column stands in front of them. */
  kelpStrap(p, [[crownX + 2, crownY + 6], [cx + 28, G - 74], [cx + 38, G - 48], [cx + 34, G - 26]], 11, 5, SHADE, [0.25, 0.55, 0.82]);
  kelpStrap(p, [[crownX - 8, crownY + 8], [cx - 2, G - 74], [cx - 10, G - 56], [cx - 6, G - 38]], 10, 4.5, SHADE, [0.3, 0.62]);

  /* --- the stipe. One long S: out to the right at the shoulder, back to the
     left through the waist, upright again at the crown. A straight stem is a
     post, and a post is the one thing this creature must not be. */
  const stipe: Pt[] = [[cx - 12, G - 20], [cx - 6, G - 48], [cx + 4, G - 74], [crownX, crownY + 10]];
  // A pale plastron up the front of the stem, so the column has a lit face and
  // a shadow face instead of being one green tube.
  limbPath(p, path(stipe), 21, 16, BASE, { front: true, bulge: 1.5, lit: LIGHT, dark: DEEP });
  // Growth nodes: the stipe of a wrack is jointed, and each joint is where a
  // frond leaves it.
  const sd = path(stipe);
  for (const t of [0.2, 0.45, 0.7]) {
    const i = Math.round(t * (sd.length - 1));
    const q = sd[i]!, n = normalAt(sd, i);
    const hh = 11 - t * 3;
    stroke(p, q[0] - n[0] * hh, q[1] - n[1] * hh, q[0] + n[0] * hh, q[1] + n[1] * hh, DEEP);
    stroke(p, q[0] - n[0] * hh, q[1] - n[1] * hh - 1, q[0] + n[0] * hh, q[1] + n[1] * hh - 1, LIGHT);
  }

  /* --- the crown: a swollen head-bulb at the top of the stipe, with the fronds
     springing out of its underside. */
  blobFront(p, crownX, crownY, 15, 15, BASE);
  // Two young blades springing up out of the crown, each carrying a bladder.
  //
  // These exist to kill a specific failure. Drawn with a smooth domed top, the
  // column plus its draped fronds came out as a cone with a face on it -- which
  // reads unmistakably as somebody in a hooded cloak, and no amount of work on
  // the fronds fixed it. Two things growing upward off the head do, because a
  // hood does not sprout.
  //
  // Both lean the same way, hard, and at two different lengths. Grown
  // symmetrically up and out -- which is where they went first -- they read
  // instantly as a pair of pointed ears and the whole creature turned into a
  // cat. Two blades streaming with the fronds cannot be ears.
  for (const [bx, by, ln, ang, w] of [
    [crownX, crownY - 11, 30, Math.PI * 1.68, 4.8], [crownX + 8, crownY - 5, 19, Math.PI * 1.88, 3.8],
  ] as const) {
    limbPath(p, [[bx, by + 6], [bx + Math.cos(ang) * 6, by + Math.sin(ang) * 6]], 6, 5, BASE, { front: true });
    leaf(p, bx, by, ln, ang, w, bx < crownX ? BASE : SHADE);
    const tx = bx + Math.cos(ang) * ln * 0.62, ty = by + Math.sin(ang) * ln * 0.62;
    blob(p, tx, ty, 3.4, 3.0, ACCENT);
    cellOver(p, tx - 1, ty - 1, ACCENT_LIT);
    cellOver(p, tx, ty + 2, ACCENT_DARK);
  }

  /* --- fronds on the near side. Three, all streaming right, at three lengths,
     with the bladders bunched thickest on the longest. */
  kelpStrap(p, [[crownX + 8, crownY + 6], [cx + 32, G - 76], [cx + 44, G - 50], [cx + 38, G - 24], [cx + 44, G - 10]], 12, 5, BASE, [0.2, 0.42, 0.64, 0.86]);
  kelpStrap(p, [[crownX - 8, crownY + 12], [cx + 2, G - 70], [cx + 12, G - 48], [cx + 8, G - 26]], 11, 4.5, LIGHT, [0.28, 0.58, 0.85]);
  kelpStrap(p, [[cx + 2, G - 58], [cx + 20, G - 46], [cx + 28, G - 28], [cx + 22, G - 12]], 10, 4, BASE, [0.3, 0.6, 0.88]);
  // One blade laid out along the floor to the left, away from the rest. It is
  // the only thing that stops the outline being a plain cone -- which is what
  // the first pass at this creature was, and a cone with a face on it reads as
  // somebody in a cloak.
  kelpStrap(p, [[cx - 14, G - 26], [cx - 30, G - 16], [cx - 46, G - 8], [cx - 58, G - 4]], 10, 4, SHADE, [0.35, 0.72]);

  /* --- a bunch of bladders at the throat, where the fronds all leave the
     crown. This is the cluster that has to read at icon size, so it is the
     biggest and it sits against the pale underside of the crown. */
  for (const [bx, by, r] of [[crownX - 13, crownY + 17, 4.6], [crownX - 5, crownY + 21, 5.2],
    [crownX + 7, crownY + 18, 4.8], [crownX + 1, crownY + 13, 4.0]] as const) {
    blob(p, bx, by, r, r * 0.9, ACCENT);
    for (const q of arc(bx, by, r, r * 0.9, Math.PI * 0.1, Math.PI * 0.9, 12)) cellOver(p, q[0], q[1], ACCENT_DARK);
    blob(p, bx - r * 0.35, by - r * 0.4, r * 0.3, r * 0.28, ACCENT_LIT);
    cell(p, bx - r * 0.4, by - r * 0.45, SPEC);
  }

  if (p.back) { p.face(crownX, crownY, 16); return; }

  /* --- the face. Two big wet eyes high on the crown and nothing else: no
     muzzle, no jaw, no brow. A plant that watches. The eyes are the roundest
     and softest in the group on purpose -- everything else here glares, squints
     or is half asleep. */
  eye(p, crownX - 7, crownY - 2, 4.8, 'round', { side: -1, iris: ACCENT_DARK });
  eye(p, crownX + 7, crownY - 4, 4.2, 'round', { side: 1, iris: ACCENT_DARK });
  p.face(crownX, crownY, 16);
  mouthLine(p, crownX - 2, crownY + 7, 5, -1);
}

/* =========================================================== silthopper */

/**
 * One folded jumping leg: a fat femur going up and back, a wire-thin tibia
 * coming down and forward, and a foot on the floor under the body.
 *
 * The Z is the animal. A grasshopper drawn with its hind legs down is a beetle;
 * it is the acute fold and the height of the knee -- above the line of its own
 * back, by a clear margin -- that says the thing is loaded and about to go.
 */
function hopLeg(p: Pen, hip: Pt, knee: Pt, foot: Pt, tone: number, thick: number, near: boolean): void {
  // Femur: a teardrop, fattest a third of the way up, with the herringbone
  // chevrons that every orthopteran has down the outside of it.
  const fem = path([hip, [(hip[0] + knee[0]) / 2 - 2, (hip[1] + knee[1]) / 2 + 2], knee]);
  limbPath(p, fem, thick, thick * 0.46, tone, { front: near, bulge: thick * 0.26, lit: near ? LIGHT : BASE, dark: DEEP });
  // Short diagonal dashes on the upper half only, the way an orthopteran's
  // femur is actually marked. Full-width chevrons the whole length -- which is
  // what the first version drew -- segment the mass like an abdomen, and both
  // hind legs came back reading as a pair of folded wing cases.
  for (let i = 1; i <= (near ? 4 : 2); i++) {
    const t = 0.3 + i * 0.14;
    const idx = Math.round(t * (fem.length - 1));
    const q = fem[idx]!, n = normalAt(fem, idx);
    const hh = thick * (0.5 + (0.46 - 0.5) * t) * 0.8;
    stroke(p, q[0] - n[0] * hh, q[1] - n[1] * hh, q[0] - n[0] * hh * 0.1, q[1] - n[1] * hh * 0.1 + 3, DEEP);
    stroke(p, q[0] - n[0] * hh, q[1] - n[1] * hh - 1, q[0] - n[0] * hh * 0.1, q[1] - n[1] * hh * 0.1 + 2, near ? LIGHT : BASE);
  }
  // A hard dark edge down the whole trailing side of the femur, so the leg
  // never welds itself to the abdomen it is lying against.
  for (let i = 2; i < fem.length - 2; i++) {
    const t = i / (fem.length - 1), n = normalAt(fem, i), q = fem[i]!;
    const hh = (thick * (0.5 + (0.46 - 0.5) * t)) - 0.5;
    cellOver(p, q[0] + n[0] * hh, q[1] + n[1] * hh, ACCENT_DARK);
  }
  // The knee: a hard knob, because a taper that simply runs out reads as a
  // spike and this joint is the hinge the whole animal is built around.
  blob(p, knee[0], knee[1], thick * 0.3, thick * 0.3, tone);
  cellOver(p, knee[0] - 2, knee[1] - 2, near ? SPEC : LIGHT);
  // Tibia: thin, straight and hard. Six cells is under the shading minimum and
  // that is the point -- this one is meant to read as wire, not as a limb.
  limbPath(p, [knee, [lerpN(knee[0], foot[0], 0.55), lerpN(knee[1], foot[1], 0.55)], foot], 6, 4, tone, { front: near });
  crease(p, knee[0], knee[1] + 2, 4);
  // Spurs down the trailing edge of the tibia, and two long ones at the ankle.
  const dx = foot[0] - knee[0], dy = foot[1] - knee[1], d = Math.hypot(dx, dy) || 1;
  const nx = -dy / d, ny = dx / d;
  for (let i = 1; i <= (near ? 5 : 3); i++) {
    const t = i / (near ? 6 : 4);
    const bx = lerpN(knee[0], foot[0], t), by = lerpN(knee[1], foot[1], t);
    poly(p, [[bx - nx * 2, by - ny * 2], [bx + nx * 2, by + ny * 2],
      [bx - nx * 7 - (dx / d) * 3, by - ny * 7 - (dy / d) * 3]], near ? LIGHT : BASE);
  }
  // The foot: two splayed toes, flat on the mud.
  for (const s of [-1, 1]) {
    limbPath(p, [[foot[0], foot[1]], [foot[0] + s * 7, foot[1] + 3]], 4, 2, tone);
  }
}

/**
 * "Long-legged mud insect built for launching."
 *
 * A cricket in the instant before it goes: front end pressed down on the flat,
 * abdomen tipped up behind, and the two hind legs folded so hard that the knees
 * stand a clear fifteen cells above the line of its own back. Those two knees
 * are the whole silhouette and everything else is arranged to leave them room.
 *
 * It is also the only creature in this group that is not a plant, so it is
 * built out of the opposite materials: hard flat chitin instead of coils and
 * pelts, straight lines instead of curves, and a body that is *smaller* than
 * its own limbs. Its one green is the pronotum shield -- this species declares
 * a leaf green as its accent while the rest of it is dried mud, which is the
 * whole reason it can hide on a tidal flat.
 */
function silthopper(p: Pen): void {
  const G = p.ground, cx = p.cx;

  // The terra pass drops a dark pebble at the bottom of every column of the
  // sprite and chips every eleventh edge cell to empty. On an animal made of
  // six wire-thin legs that is a creature buried in gravel with holes bitten
  // out of its shins -- which is exactly how the first render came back. The
  // dried silt below is hand-placed instead, where an insect actually collects
  // it: up the tibiae and along the underside.
  p.noTypeTraits();

  const headX = cx - 34, headY = G - 22;
  const thorX = cx - 12, thorY = G - 30;

  /* --- antennae, laid down first so the head covers their roots. Two, not
     four, and swept: each one costs four cells of ink once the outline pass has
     been over it, and a thicket of them reads as damage. */
  for (const [ax, ay] of [[headX - 8, headY - 30], [headX - 20, headY - 21]] as const) {
    limbPath(p, path([[headX - 2, headY - 6], [headX - 8, headY - 18], [ax, ay]] as Pt[]), 4, 2, SHADE, { lit: LIGHT });
  }

  /* --- far hind leg and far walking legs, in the recessed tone. The far knee
     is set lower and further back than the near one, which is most of what
     stops the two reading as one shape. */
  hopLeg(p, [cx + 10, G - 28], [cx + 46, G - 62], [cx + 42, G - 3], SHADE, 13, false);
  for (const [hx, hy, mx, my, fx] of [
    [cx - 20, G - 30, cx - 30, G - 16, cx - 34], [cx - 4, G - 28, cx - 12, G - 14, cx - 6],
  ] as const) {
    limbPath(p, path([[hx, hy], [mx, my], [fx, G - 2]] as Pt[]), 6, 3.5, SHADE);
  }

  /* --- the body: a small hard capsule, nose down and tail up. The tilt is
     free and it does as much as the legs do -- a level insect is a beetle
     resting, a tilted one is a thing braced against the floor. */
  blob(p, thorX, thorY, 15, 12, BASE);
  // Painted in the *recessed* tone even though it is the middle of the animal.
  // The near hind femur lies right across it, and two pale masses in the same
  // material weld into one however carefully they are lit: drawn in body colour
  // the abdomen and the leg came back as a single beetle wing case. Dark
  // abdomen, pale leg, and the leg reads as a leg.
  limbPath(p, path([[thorX + 8, thorY + 1], [cx + 8, G - 26], [cx + 22, G - 24], [cx + 32, G - 20]] as Pt[]),
    21, 8, SHADE, { front: true, lit: BASE, dark: DEEP });
  // Abdominal segments: overlapping rings, each with a lit leading edge.
  for (let i = 1; i <= 6; i++) {
    const t = i / 7;
    const bx = lerpN(thorX + 10, cx + 30, t), by = lerpN(thorY + 1, G - 20, t);
    const hh = 10 - t * 6;
    stroke(p, bx - 2, by - hh, bx + 3, by + hh, DEEP);
    stroke(p, bx - 3, by - hh, bx + 2, by + hh, BASE);
  }
  // A short spike at the tail: the ovipositor. Two cells of silhouette and it
  // stops the abdomen ending in a dome.
  // A pale underside along the belly, so the abdomen still reads from under the
  // leg that is lying across it.
  limbPath(p, path([[thorX + 10, thorY + 9], [cx + 8, G - 17], [cx + 26, G - 14]] as Pt[]), 7, 4, LIGHT);
  poly(p, [[cx + 32, G - 24], [cx + 32, G - 16], [cx + 44, G - 18]], SHADE);
  stroke(p, cx + 32, G - 24, cx + 44, G - 18, BASE, false);

  /* --- the pronotum: a hard green shield over the thorax, the one piece of
     colour on the animal. Bevelled, with a keel down the middle. */
  plate(p, [[thorX - 14, thorY - 8], [thorX + 2, thorY - 12], [thorX + 13, thorY - 2],
    [thorX + 9, thorY + 9], [thorX - 12, thorY + 6]], ACCENT);
  stroke(p, thorX - 12, thorY - 6, thorX + 10, thorY + 1, ACCENT_DARK);
  stroke(p, thorX - 12, thorY - 7, thorX + 10, thorY, ACCENT_LIT);

  /* --- near walking legs, planted wide, and the near hind leg over the top of
     everything. */
  for (const [hx, hy, mx, my, fx] of [
    [cx - 22, G - 26, cx - 34, G - 14, cx - 40], [cx - 6, G - 24, cx - 16, G - 12, cx - 14],
  ] as const) {
    limbPath(p, path([[hx, hy], [mx, my], [fx, G - 1]] as Pt[]), 7, 4, BASE, { front: true, lit: LIGHT });
  }
  hopLeg(p, [cx + 2, G - 26], [cx + 32, G - 76], [cx + 18, G - 2], BASE, 16, true);

  /* --- the head: a small hard wedge pressed down onto the flat, well below the
     line of the back. */
  blobFront(p, headX, headY, 12, 10, BASE);
  // Mandibles: two short dark plates meeting at the front of the face.
  poly(p, [[headX - 12, headY + 2], [headX - 4, headY + 3], [headX - 6, headY + 10], [headX - 13, headY + 8]], SHADE);
  stroke(p, headX - 12, headY + 2, headX - 6, headY + 10, ACCENT_DARK);
  stroke(p, headX - 13, headY + 2, headX - 7, headY + 10, LIGHT);

  /* --- mud. Dried splashes up the tibiae and the underside, in the dark tone,
     because a thing named for silt should be wearing some. */
  for (const [mx, my] of [[cx + 18, G - 12], [cx + 24, G - 22], [cx - 30, G - 8],
    [cx - 16, G - 6], [cx + 6, G - 8], [cx + 34, G - 14]] as const) {
    speckle(p, mx - 4, my - 3, mx + 4, my + 3, 0.4, ACCENT_DARK);
  }

  if (p.back) { p.face(headX, headY, 13); return; }

  /* --- the face. Two big domed compound eyes, and nothing else: no brow, no
     lid, no white. The lattice and the single soft catchlight are the only way
     a faceted eye reads at this size, and they are the reason this is the one
     creature in the group you cannot tell what it is thinking. */
  eye(p, headX - 4, headY - 4, 5.2, 'compound', { side: -1 });
  eye(p, headX + 8, headY - 6, 4.4, 'compound', { side: 1 });
  p.face(headX, headY, 13);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  bramblehusk,
  thornmarch,
  mossback,
  bladderwrack,
  silthopper,
};
