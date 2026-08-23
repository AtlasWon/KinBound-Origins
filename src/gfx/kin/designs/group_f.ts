/**
 * Design group F -- the minerals.
 *
 * Six rocks is the hardest brief on the roster, because "grey lump" is the
 * default failure state of every one of them. They are separated here by
 * CONSTRUCTION and by POSTURE rather than by decoration:
 *
 *   pebblet     a wide low faceted boulder squatting on four blocky stubs, a
 *               quartz vein running up its back and breaking out of the rear
 *               shoulder as a cluster of prisms.
 *   cairnling   a stack of loose stones standing upright with one arm of rocks
 *               raised and pointing, moss in every joint. Stepped silhouette.
 *   menhir      one continuous leaning slab -- no joint anywhere on it -- tall
 *               and narrow on a rubble plinth, braced on a single enormous
 *               fist, ore veins branching up the shaft, a face carved into the
 *               stone rather than sitting on it.
 *   chalkid     a standing chalk nodule: an upright lump with a dark stratum
 *               banded round its waist, blunt stubs for legs, one arm reaching
 *               up over its head.
 *   chalkmar    a broad low quadruped walker under a roof of overlapping slate
 *               slabs, chalk-white belly and legs, a wide chisel jaw.
 *   anchorling  an anchor. Ring, shank, stock, two curved arms with barbed
 *               flukes, weed and barnacles on the iron, and one enormous eye.
 *
 * Four different numbers of legs, four different overall proportions, and no
 * two of them use the same eye: round, hooded, slit, sleepy, angry, and one
 * huge single lens set in iron.
 *
 * The family thread is the seam. Every one of these has a mineral vein or a
 * plate line running across it with a lit lip and a dark gutter, and the line
 * pebblet -> cairnling -> menhir grows that seam from quartz prisms through
 * mossed joints to branching ore, on a body that goes from loose boulder to
 * loose stack to one fused slab.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, EMPTY, HILIGHT, INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, blob, blobFront, cell, cellOver, eye, lerp, limbPath, mouthLine, normalAt,
  path, poly, polyFront, polyLine, rect, speckle, stroke, tuft,
  type Pen, type Pt,
} from '../parts.js';

/* ============================================================== helpers */

/**
 * A stone mass: a filled polygon whose upward-facing edges catch a lit lip and
 * whose downward-facing edges drop into a dark gutter.
 *
 * `plate` in the toolkit does this in the accent ramp, which is right for
 * armour and wrong for rock -- a grey slab bevelled in moss green reads as a
 * painted kerbstone. This is the same idea in the body ramp, and it is what
 * turns a polygon into a face of stone with a thickness behind it.
 */
function rock(p: Pen, pts: Pt[], tone: number, lit = HILIGHT, dark = DEEP, front: boolean | number = false): void {
  if (front) polyFront(p, pts, tone, DEEP, front === true ? 1.5 : front); else poly(p, pts, tone);
  const cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
    const up = (a[1] + b[1]) / 2 < cy;
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      cellOver(p, lerp(a[0], b[0], t), lerp(a[1], b[1], t) + (up ? 1 : -1), up ? lit : dark);
    }
  }
}

/**
 * A quartz prism: parallel sides for three quarters of its length, then a
 * pointed cap, with a girdle line where the cap starts and an arris running
 * from base to tip between the lit facet and the dark one.
 *
 * The first two versions of this were widest in the middle and carried veins
 * across them, on the theory that a crystal is a spike. They came out as dead
 * LEAVES -- an almond blade with a midrib is a leaf whatever colour it is
 * painted -- and a boulder wearing three of them looked like it had been
 * rolled through a hedge. What makes a crystal read is the pair of straight
 * parallel sides and the abrupt cap; nothing else does.
 *
 * The mass goes down in ACCENT itself, with the dark facet cut back into it and
 * the bright tone kept to the arris and the tip. Filled at either END of the
 * ramp the prism loses the species' colour completely -- ACCENT_LIT gives a
 * near-white spike on a pale gold palette, ACCENT_DARK a grey-brown one -- and
 * a quartz seam that is not visibly quartz-coloured has spent its silhouette
 * for nothing.
 */
function crystal(p: Pen, x: number, y: number, len: number, ang: number, w: number): void {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const sh = 0.74;
  const at = (t: number, k: number): Pt => [x + ux * len * t + nx * w * k, y + uy * len * t + ny * w * k];
  const tip: Pt = [x + ux * len, y + uy * len];
  // Both facets are painted in FIXED tones. ACCENT is a shadeable material: a
  // prism filled with it gets run through the body's light like a shoulder, so
  // a cluster growing out of the dark side of a boulder came out grey however
  // gold the palette said it was. Quartz does not take the room's light, it
  // makes its own, and the only way to say that is a tone the shading pass is
  // not allowed to touch.
  // Shaft: lit facet, then the dark facet cut into its right-hand half. The
  // dark facet stops at the GIRDLE. Run to the tip -- which is what happens if
  // both facets are drawn as five-sided shapes sharing the point -- the second
  // polygon swallows the whole cap and every prism comes out with a dark tip,
  // which is precisely the wrong end of a crystal to lose.
  poly(p, [at(0, -1), at(sh, -1), at(sh, 1), at(0, 1)], ACCENT_LIT);
  poly(p, [at(0, 0.4), at(sh, 0.4), at(sh, 1), at(0, 1)], ACCENT_DARK);
  // Cap: bright, with only its right edge in shadow. A quartz point catches
  // light from every direction at once and that is most of what says quartz.
  poly(p, [at(sh, -1), tip, at(sh, 0.6)], ACCENT_LIT);
  poly(p, [at(sh, 0.6), tip, at(sh, 1)], ACCENT_DARK);
  // The arris between the two facets, and the girdle where the cap begins.
  stroke(p, at(0, 0.4)[0], at(0, 0.4)[1], tip[0], tip[1], SPEC);
  stroke(p, at(sh, -1)[0], at(sh, -1)[1], at(sh, 1)[0], at(sh, 1)[1], ACCENT_DARK);
  polyLine(p, [at(0, 1), at(sh, 1), tip], DEEP, false, true);
  cell(p, tip[0], tip[1], SPEC);
}

/**
 * A mineral vein running across a mass: bright core, dark gutter under it.
 *
 * The core is ACCENT_LIT rather than ACCENT for the same reason the crystals
 * are: ACCENT is a material and the shading pass runs it through the body's
 * light, so a vein crossing from the lit face to the dark one fades out halfway
 * along and reads as a scratch that someone gave up on.
 */
function vein(p: Pen, pts: Pt[], wide = 1): void {
  // Thickness is measured along the path's NORMAL, not down the y axis. Padding
  // in y gives a horizontal vein its full width and a vertical one about one
  // cell of it, which is why menhir's ore ran up the shaft looking like wire.
  const d = path(pts);
  for (let i = 0; i < d.length; i++) {
    const q = d[i]!, n = normalAt(d, i);
    const w = wide * (0.75 + 0.25 * Math.sin(i * 0.35));
    for (let k = -w; k <= w; k += 0.5) cellOver(p, q[0] + n[0] * k, q[1] + n[1] * k, ACCENT_LIT);
    cellOver(p, q[0] - n[0] * (w + 1), q[1] - n[1] * (w + 1), SPEC);
    cellOver(p, q[0] + n[0] * (w + 1), q[1] + n[1] * (w + 1), ACCENT_DARK);
    cellOver(p, q[0] + n[0] * (w + 2), q[1] + n[1] * (w + 2), DEEP);
  }
}

/**
 * A stratum banded right round a body: a solid dark belt with a pale sill on
 * top of it, sagging in the middle so it wraps a cylinder.
 *
 * Stepped along the ARC rather than along x -- which is how the first version
 * did it -- the samples spread out where the curve is flattest and the belt
 * comes out as a comb of vertical ticks. Walking x and computing y is the same
 * curve with no gaps in it.
 */
function band(p: Pen, cx: number, y: number, half: number, thick: number, sag: number): void {
  for (let dx = -half; dx <= half; dx++) {
    const t = dx / half;
    const yy = y + sag * (1 - t * t);
    for (let k = 0; k < thick; k++) cellOver(p, cx + dx, yy + k, k < thick - 2 ? ACCENT : ACCENT_DARK);
    cellOver(p, cx + dx, yy - 1, LIGHT);
    cellOver(p, cx + dx, yy + thick, ACCENT_DARK);
    cellOver(p, cx + dx, yy + thick + 1, LIGHT);
  }
}

/**
 * A blocky splayed stub of a leg with a slab of a foot on the end.
 *
 * `legColumn` and `paw` build a rounded pad with soft toes, which under the
 * shading pass comes out as a pale bulb -- on a boulder the near foreleg read
 * as a trunk. A mineral creature's foot is a chipped block with grooves cut in
 * it, and its leg is a wedge that gets wider on the way down.
 */
function stubLeg(p: Pen, x: number, top: number, ground: number, w: number, side: number, tone: number, front = false): void {
  const fx = x + side * (ground - top) * 0.3;
  rock(p, [[x - w, top - 2], [x + w, top - 2],
    [fx + w * 1.3, ground - 5], [fx + w * 1.55, ground],
    [fx - w * 1.55, ground], [fx - w * 1.3, ground - 5]], tone, HILIGHT, DEEP, front);
  for (let i = -1; i <= 1; i++) {
    const tx = fx + i * w * 0.9;
    stroke(p, tx, ground - 6, tx + i * 0.6, ground, DEEP);
    stroke(p, tx - 1, ground - 6, tx + i * 0.6 - 1, ground, tone === SHADE ? BASE : HILIGHT);
  }
  stroke(p, fx - w * 1.55, ground + 1, fx + w * 1.55, ground + 1, DEEP);
}

/**
 * The shadow an overhanging mass throws onto whatever is under it.
 *
 * A grey species has no colour to separate its parts with, so it lives or dies
 * on value, and the one place a generated sprite reliably runs short of value
 * is the tuck: legs under a belly, a foot under a slab, a stub under a boulder.
 * Two rows of DEEP into two of SHADE, painted onto body only, and a limb stops
 * being the same tone as the thing standing on it.
 */
function overhang(p: Pen, x0: number, x1: number, y: number, depth: number): void {
  // Bowed and tapered at both ends. A band of even depth ruled straight across
  // is a stripe, not a shadow -- it puts a hard horizontal edge on a creature
  // whose whole silhouette is meant to be broken rock.
  const mid = (x0 + x1) / 2, half = Math.max(1, (x1 - x0) / 2);
  for (let x = Math.round(x0); x <= Math.round(x1); x++) {
    const t = (x - mid) / half;
    const d = Math.max(1, Math.round(depth * (1 - t * t * 0.6)));
    const yy = y + (1 - t * t) * depth * 0.4;
    for (let k = 0; k < d; k++) cellOver(p, x, yy + k, k < d * 0.5 ? DEEP : SHADE);
  }
}

/**
 * Moss in a joint: a low fuzzy run with hairs standing off the top of it.
 *
 * `mane` takes its outward direction from the winding of its path, which on a
 * short horizontal joint is a coin toss; growing moss into the inside of a slab
 * is invisible and looks like the call did nothing. Stepping tufts by hand and
 * pointing them up costs four lines and cannot go wrong.
 */
function moss(p: Pen, x0: number, y0: number, x1: number, y1: number, depth: number): void {
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t);
    const d = depth * (0.45 + 0.55 * Math.abs(Math.sin(i * 2.1)));
    blob(p, x, y, 3.2, depth * 0.55, ACCENT);
    tuft(p, x, y - depth * 0.3, d, -Math.PI / 2 + ((i % 3) - 1) * 0.5, 0.42, ACCENT);
    cellOver(p, x - 1, y - d * 0.5, ACCENT_LIT);
  }
  stroke(p, x0, y0 + depth * 0.5, x1, y1 + depth * 0.5, ACCENT_DARK);
}

/* =============================================================== pebblet */

/**
 * "Rounded boulder with stubby limbs and a seam of quartz."
 *
 * A rock that has been kicked once already. It is squatting -- braced low and
 * wide with all four stubs splayed and its whole mass tipped forward-left --
 * and the front-left corner of the boulder has been ground flat into a face.
 *
 * Three decisions carry it. The body is a POLYGON with long straight runs, not
 * an ellipse: rock convinces through its flats and its chips, and a smooth dome
 * is a pebble in a cartoon. It is lit as three distinct PLANES -- a lit front
 * face, the body colour over the top, a dark right flank -- with hard arrises
 * between them rather than a gradient, because stone turns on an edge. And the
 * quartz does not stay on the surface: it runs up the back and breaks out of
 * the rear shoulder as a cluster that leaves the silhouette, so the thing has a
 * shape at icon size and not just a texture.
 */
function pebblet(p: Pen): void {
  const G = p.ground, cx = p.cx;
  const bodyY = G - 38;

  /* --- the stubs. All four go down before the boulder so the mass OVERHANGS
     them; drawn afterwards they stick out of it, which is how the first pass
     grew a trunk. Near pair splayed hard and pale, far pair tucked and dark. */
  stubLeg(p, cx - 4, G - 22, G - 3, 6.5, -1, SHADE);
  stubLeg(p, cx + 28, G - 20, G - 4, 6, 1, SHADE);
  stubLeg(p, cx - 26, G - 24, G, 8, -1, BASE);
  stubLeg(p, cx + 16, G - 22, G - 1, 7, 1, BASE);

  /* --- the boulder. Seven vertices and long straight runs between them. */
  const body: Pt[] = [
    [cx - 46, bodyY + 2], [cx - 33, bodyY - 19], [cx - 4, bodyY - 26],
    [cx + 22, bodyY - 22], [cx + 41, bodyY - 4], [cx + 34, bodyY + 13], [cx - 33, bodyY + 15],
  ];
  rock(p, body, BASE);

  /* --- the dark right flank, cut off along a hard arris. Kept to a narrow
     strip: a third of the boulder in the recessed tone reads as a second
     object standing behind the first. */
  poly(p, [[cx + 24, bodyY - 21], [cx + 40, bodyY - 4], [cx + 33, bodyY + 12],
    [cx + 23, bodyY + 13], [cx + 21, bodyY - 8]], SHADE);
  polyLine(p, [[cx + 24, bodyY - 21], [cx + 21, bodyY - 8], [cx + 23, bodyY + 13]], DEEP, false, true);
  polyLine(p, [[cx + 23, bodyY - 22], [cx + 20, bodyY - 9], [cx + 22, bodyY + 12]], HILIGHT, false, true);

  /* --- the worn face plane: a flat pale facet ground into the front-left
     corner, with hard bevelled borders. Without it the eyes are two beads
     stuck on a rock. It is kept clear of the contour on every side -- a facet
     that runs off the edge stops being a facet and becomes a snout. */
  const facet: Pt[] = [
    [cx - 42, bodyY + 5], [cx - 33, bodyY - 14], [cx - 12, bodyY - 19],
    [cx - 5, bodyY - 4], [cx - 11, bodyY + 11], [cx - 32, bodyY + 12],
  ];
  poly(p, facet, LIGHT);
  polyLine(p, [[cx - 42, bodyY + 5], [cx - 33, bodyY - 14], [cx - 12, bodyY - 19]], HILIGHT, false, true);
  polyLine(p, [[cx - 12, bodyY - 19], [cx - 5, bodyY - 4], [cx - 11, bodyY + 11], [cx - 32, bodyY + 12]], DEEP, false, true);

  /* --- the brow ledge: an overhang across the top of the face plane with two
     rows of shadow under it, so the eyes are set back into the stone. */
  for (const q of arc(cx - 24, bodyY - 9, 16, 6, Math.PI * 1.06, Math.PI * 1.94, 24)) {
    cellOver(p, q[0], q[1], HILIGHT);
    cellOver(p, q[0], q[1] + 1, DEEP);
    cellOver(p, q[0], q[1] + 2, SHADE);
  }

  /* --- the quartz vein, running up the back to where the cluster breaks out.
     Kept clear of the face plane: a bright seam across the eyes turns the whole
     front of the animal into noise. */
  vein(p, [[cx - 2, bodyY + 12], [cx + 10, bodyY + 2], [cx + 17, bodyY - 10], [cx + 26, bodyY - 17]], 1);
  vein(p, [[cx + 4, bodyY + 7], [cx + 13, bodyY - 5], [cx + 12, bodyY - 19]], 0);

  /* --- the crystal cluster. All of it on the rear shoulder and all of it
     leaning ONE way, up and out to the right, with the roots touching so it is
     one growth rather than a row of spikes. Spread evenly over the crown they
     came out as a pair of ears -- which is the trap with anything symmetric
     placed near a face -- so nothing here is within twenty cells of an eye. */
  //
  // They also have to be WIDE. At three and a half cells of half-width a prism
  // is seven cells across, the outline pass takes two off each side, and three
  // cells of interior cannot hold two facets and an arris -- the cluster came
  // out as a set of grey claws with a thread of gold down them. Anything
  // free-standing has to budget four cells of ink before it draws anything at
  // all, so these are twelve and thirteen cells across.
  crystal(p, cx + 13, bodyY - 24, 23, -Math.PI * 0.56, 6.5);
  crystal(p, cx + 27, bodyY - 18, 16, -Math.PI * 0.34, 5.5);
  crystal(p, cx + 37, bodyY - 7, 12, -Math.PI * 0.15, 4.5);
  // Two small ones lying flat on the vein, which never leave the silhouette
  // and so never pay for ink: the seam reads as one continuous growth rather
  // than as a stripe with spikes on the end.
  crystal(p, cx + 2, bodyY + 8, 9, -Math.PI * 0.36, 3);
  crystal(p, cx + 22, bodyY + 6, 8, -Math.PI * 0.12, 2.8);

  // The stubs go dark where the boulder sits on them.
  overhang(p, cx - 36, cx - 8, bodyY + 16, 6);
  overhang(p, cx + 2, cx + 32, bodyY + 15, 6);

  if (p.back) { p.face(cx - 24, bodyY - 2, 20); return; }

  /* --- the face. Big, round, wet and set well apart, one larger than the
     other because the head end is turned toward us. A boulder that is about to
     be kicked should look like it knows. */
  eye(p, cx - 31, bodyY - 1, 5.8, 'round', { side: -1, iris: ACCENT_DARK });
  eye(p, cx - 16, bodyY - 4, 5, 'round', { side: 1, iris: ACCENT_DARK });
  p.face(cx - 24, bodyY - 2, 20);

  // The mouth is a crack in the rock, not a pair of lips: wide, shallow, and
  // drawn in DEEP rather than with `mouthLine`, whose cavity tone is a warm
  // near-maroon. Right for a jaw, wrong for a fissure -- on a grey boulder it
  // came out as a lipstick line.
  for (let i = -10; i <= 10; i++) {
    const my = bodyY + 7 + Math.abs(i) * 0.14;
    cellOver(p, cx - 25 + i, my, DEEP);
    cellOver(p, cx - 25 + i, my + 1, DEEP);
    cellOver(p, cx - 25 + i, my - 1, HILIGHT);
  }
  cellOver(p, cx - 33, bodyY + 7, ACCENT_LIT);
  cellOver(p, cx - 33, bodyY + 6, ACCENT_LIT);
  speckle(p, cx - 38, bodyY + 8, cx - 18, bodyY + 11, 0.16, DEEP);
}

/* ============================================================= cairnling */

/**
 * "Stacked slab figure, uneven shoulders, moss at the joints."
 *
 * The Vellum says it stands at crossroads in the shape of a waymarker and that
 * travellers follow them. So it POINTS. One arm of stacked stones is raised and
 * held out to the upper left, and that single decision does more for the
 * silhouette than every stone in the pile put together: a stepped tower with a
 * limb out at forty-five degrees cannot be confused with anything else here.
 *
 * Everything is drawn as separate stones with real steps between them, because
 * the read is *stacked*. Four courses of the same neat masonry came out as a
 * pile of mattresses, so no two of these have the same width, the same
 * footprint or the same lean, and each one is offset far enough sideways to
 * leave a visible ledge. The moss goes in the gaps, which is the cheapest
 * possible proof that the joints are joints.
 */
function cairnling(p: Pen): void {
  const G = p.ground, cx = p.cx;

  /* --- feet: two stubby blocks under the base stone, the near one advanced.
     A cairn walks by shuffling its own base forward, and the offset says so. */
  stubLeg(p, cx + 15, G - 13, G - 2, 7, 1, SHADE);
  stubLeg(p, cx - 17, G - 15, G, 8, -1, BASE);

  /* --- the stack. The offsets are the design. Each stone is shoved a long way
     to one side of the one below it, alternating, so the outline is a zigzag of
     real ledges -- twenty and thirty cells of overhang, not three. Neatly
     centred courses of similar width read as one column with lines ruled across
     it however different their outlines are. The seam pad is doubled too: at
     1.5 cells the shading pass closes the joint back up. */
  // Base: broad and squat, slumped left, top sloping up to the right.
  rock(p, [[cx - 38, G - 32], [cx - 31, G - 42], [cx + 17, G - 45], [cx + 28, G - 34],
    [cx + 24, G - 14], [cx - 34, G - 12]], BASE, HILIGHT, DEEP, 3);
  // Second: much narrower and shoved hard right. The ledge it leaves on the
  // left is the most legible joint on the sprite.
  rock(p, [[cx - 7, G - 62], [cx - 1, G - 68], [cx + 26, G - 65], [cx + 35, G - 55],
    [cx + 31, G - 41], [cx - 5, G - 44]], BASE, HILIGHT, DEEP, 3);
  // Third: a wedge, thick on the left, thinning away to the right, and thrown
  // back the other way. That is the uneven shoulder in one shape.
  rock(p, [[cx - 37, G - 86], [cx - 26, G - 92], [cx + 8, G - 78], [cx + 19, G - 70],
    [cx + 14, G - 60], [cx - 32, G - 64]], BASE, HILIGHT, DEEP, 3);

  /* --- the raised arm. A solid bar of stone goes down first so the limb can
     never come apart, and the stones are laid ON it, each overlapping the last
     by a third of its length. The first attempt placed them end to end with
     two-cell gaps: the outline pass inked each one separately and it read as
     three rocks flying away from a statue. */
  limbPath(p, [[cx - 33, G - 80], [cx - 50, G - 88], [cx - 64, G - 94]], 15, 12, BASE, { front: true });
  rock(p, [[cx - 34, G - 86], [cx - 47, G - 92], [cx - 51, G - 80], [cx - 37, G - 73]], BASE, HILIGHT, DEEP, true);
  rock(p, [[cx - 45, G - 93], [cx - 59, G - 97], [cx - 61, G - 85], [cx - 48, G - 79]], SHADE, HILIGHT, DEEP, true);
  // The hand: a flat blade of stone, the palest thing on the sprite, jutting
  // clear of everything else. It is the far end of the pose and it has to be
  // the part the eye lands on.
  rock(p, [[cx - 56, G - 99], [cx - 74, G - 97], [cx - 75, G - 86], [cx - 58, G - 84]], LIGHT, HILIGHT, DEEP, true);
  stroke(p, cx - 73, G - 96, cx - 57, G - 98, HILIGHT);

  /* --- the hanging arm: two short stones down the right flank, darker, so the
     two sides of the animal never balance. */
  rock(p, [[cx + 14, G - 74], [cx + 29, G - 69], [cx + 32, G - 55], [cx + 17, G - 58]], SHADE, HILIGHT, DEEP, true);
  rock(p, [[cx + 17, G - 58], [cx + 32, G - 56], [cx + 29, G - 40], [cx + 16, G - 43]], SHADE, HILIGHT, DEEP, true);

  /* --- the head stone, tilted hard and the smallest in the pile, which is
     what makes the pile read as a pile. A level head on a level stack is a
     chimney; the tilt is the whole difference. */
  const hx = cx - 8, hy = G - 100;
  rock(p, [[hx - 17, hy + 7], [hx - 9, hy - 4], [hx + 12, hy - 2], [hx + 18, hy + 9],
    [hx + 6, hy + 18], [hx - 13, hy + 16]], BASE, HILIGHT, DEEP, 3);

  /* --- moss. In the joints and nowhere else, and never right across one: a run
     of moss the full width of a stone is a belt, which is what the first pass
     looked like. Patches, offset, three of them. */
  // The feet go dark under the base stone, and every stone shades the step
  // below it. This is what makes a stack read as stacked rather than as one
  // column with lines ruled across it.
  overhang(p, cx - 30, cx + 22, G - 15, 5);
  overhang(p, cx - 6, cx + 32, G - 45, 4);
  overhang(p, cx - 34, cx + 12, G - 65, 4);

  moss(p, cx - 30, G - 34, cx + 4, G - 42, 4);
  moss(p, cx - 3, G - 63, cx + 24, G - 61, 3.5);
  moss(p, cx - 33, G - 84, cx - 6, G - 74, 3.5);
  moss(p, hx - 15, hy + 6, hx - 6, hy - 2, 3.2);

  if (p.back) { p.face(hx, hy + 7, 16); return; }

  /* --- the face, carved shallow into the head stone and half-lidded. Patient
     and immovable: this thing has been standing at the same junction since
     before anyone alive was born, and the lids are what say so. */
  eye(p, hx - 8, hy + 9, 4.8, 'hooded', { side: -1, iris: ACCENT_LIT, lid: BASE });
  eye(p, hx + 6, hy + 6, 4.4, 'hooded', { side: 1, iris: ACCENT_LIT, lid: BASE });
  p.face(hx, hy + 7, 16);

  // A straight chiselled mouth. On stone a curve reads as damage; a ruled slot
  // reads as something that was cut on purpose.
  for (let k = 0; k < 2; k++) stroke(p, hx - 10, hy + 16 + k, hx + 8, hy + 13 + k, INNER);
  stroke(p, hx - 10, hy + 15, hx + 8, hy + 12, HILIGHT);
}

/* ================================================================ menhir */

/**
 * "Tall monolith with ore veins and a carved face."
 *
 * Cairnling's stack, fused. That is the whole relationship: same family, same
 * seam, same half-lidded patience, but where the child is loose stones with
 * daylight between them the adult is ONE slab with no joint anywhere on it.
 *
 * The proportion is the species. It is 108 cells tall and 46 wide -- a bar,
 * not a body -- standing on a spread of rubble, leaning, and braced on one
 * enormous fist driven into the ground beside it.
 *
 * The first two passes came out as a hooded monk, and the reasons are worth
 * keeping written down. A crown that narrows and curves is a cowl. A pale panel
 * that tapers as it goes down is a robe. And a face carved just under the top
 * of a tapering shaft turns the whole top into a head. The fixes are all in the
 * geometry: the sides run near enough parallel, the crown is two straight shear
 * planes meeting at a hard corner, the lit strip has parallel edges from top to
 * bottom, and the face is cut a third of the way down where a mason could
 * actually reach it.
 */
function menhir(p: Pen): void {
  const G = p.ground, cx = p.cx;

  /* --- the plinth. A spread of rubble the stone is standing IN rather than
     on, drawn first and recessed. It also does the job the widening base of a
     tapered shaft would have done, without tapering the shaft. */
  for (const [rx, ry, w, h] of [[-38, -4, 11, 6], [-24, -2, 8, 4.5], [-8, -3, 7, 4],
    [20, -4, 10, 5.5], [36, -2, 8, 4]] as const) {
    rock(p, [[cx + rx - w, G + ry + h], [cx + rx - w * 0.55, G + ry - h], [cx + rx + w * 0.65, G + ry - h * 0.7],
      [cx + rx + w, G + ry + h]], SHADE);
  }

  /* --- the far stub arm, a short block against the right flank. */
  rock(p, [[cx + 17, G - 54], [cx + 33, G - 50], [cx + 31, G - 24], [cx + 16, G - 28]], SHADE);

  /* --- the shaft. One polygon and no horizontal line on it anywhere. */
  const shaft: Pt[] = [
    [cx - 19, G - 3], [cx - 22, G - 40], [cx - 24, G - 74], [cx - 25, G - 98],
    [cx + 10, G - 108],                      // shear one, climbing to the right
    [cx + 16, G - 100],                      // the corner, then straight down
    [cx + 20, G - 64], [cx + 24, G - 32], [cx + 27, G - 3],
  ];
  rock(p, shaft, BASE);

  // A lit strip down the left arris with PARALLEL edges, and a dark face down
  // the right. Two hard-edged polygons, no gradient: stone turns on an edge.
  poly(p, [[cx - 21, G - 5], [cx - 24, G - 97], [cx - 17, G - 100], [cx - 15, G - 5]], LIGHT);
  polyLine(p, [[cx - 17, G - 100], [cx - 15, G - 5]], DEEP, false, true);
  poly(p, [[cx + 14, G - 99], [cx + 18, G - 64], [cx + 22, G - 32], [cx + 26, G - 5],
    [cx + 17, G - 5], [cx + 12, G - 60], [cx + 9, G - 96]], SHADE);
  polyLine(p, [[cx + 9, G - 96], [cx + 12, G - 60], [cx + 17, G - 5]], DEEP, false, true);
  polyLine(p, [[cx + 8, G - 96], [cx + 11, G - 60], [cx + 16, G - 5]], HILIGHT, false, true);
  // Vertical flute grooves down the middle face. They run WITH the stone; a
  // horizontal line anywhere on this creature would turn it back into a stack.
  for (const [gx, gy0, gy1] of [[cx - 6, G - 100, G - 10]] as const) {
    stroke(p, gx, gy0, gx + 2, gy1, DEEP);
    stroke(p, gx - 1, gy0, gx + 1, gy1, HILIGHT);
  }

  /* --- ore veins. They BRANCH, and they run with the length of the stone --
     a vein ruled across a monolith is a crack, a vein running up it is metal in
     the rock. The bright cores are in the fixed end of the accent ramp, which
     the shading pass leaves alone, so they still read where the shaft is dark. */
  //
  // Routed up the RIGHT of the shaft, not the middle. The first pass ran it
  // straight through the carved face, and a bright seam crossing a pair of
  // sunk eyes wins: the face vanished and the sprite read as a rock with a
  // stripe. Ornament near a face is the easiest thing on a sprite to get
  // wrong, and it is only ever visible in the render.
  vein(p, [[cx + 2, G - 4], [cx + 7, G - 32], [cx + 6, G - 60], [cx + 11, G - 86], [cx + 4, G - 100]], 2.4);
  vein(p, [[cx + 4, G - 44], [cx - 6, G - 50], [cx - 17, G - 46]], 1.2);
  vein(p, [[cx - 2, G - 22], [cx + 8, G - 18], [cx + 17, G - 26]], 1.2);
  vein(p, [[cx + 10, G - 92], [cx - 2, G - 96]], 1);
  // Ore nodules swelling on the seam. A vein of even width is a drawn line; the
  // lumps are what make it a mineral that grew.
  for (const [nx, ny, nr] of [[cx + 6, G - 46, 4.5], [cx + 11, G - 88, 4], [cx - 6, G - 14, 3.6],
    [cx - 15, G - 46, 3.4]] as const) {
    blob(p, nx, ny, nr, nr * 1.1, ACCENT_LIT);
    for (const q of arc(nx, ny, nr, nr * 1.1, Math.PI * 0.05, Math.PI * 0.9, 10)) cellOver(p, q[0], q[1], ACCENT_DARK);
    cellOver(p, nx - nr * 0.4, ny - nr * 0.5, SPEC);
  }
  // Ore breaking the surface: prisms sitting proud on the vein, bigger than
  // pebblet's because this is the same seam two evolutions on. None of them
  // near the crown -- one on the top corner reads as an ear, every time.
  crystal(p, cx + 14, G - 84, 14, -Math.PI * 0.12, 5);
  crystal(p, cx + 17, G - 26, 12, -Math.PI * 0.04, 4.4);
  crystal(p, cx - 20, G - 48, 11, -Math.PI * 0.9, 4);

  /* --- the buttress arm. One block limb dropping down the left flank to a
     fist planted flat on the floor. It is the only asymmetric mass on the
     sprite and it is what carries the lean.

     It bowed a long way out at first and the gap between arm and shaft came out
     as a great oval hole -- the creature read as a jug with a handle. A limb
     against a body wants a slot, not a loop: keep the gap eight or ten cells
     and it is a gap between two things, open it to thirty and it is a shape in
     its own right and the eye reads it before it reads either of them. */
  rock(p, [[cx - 26, G - 70], [cx - 9, G - 66], [cx - 24, G - 28], [cx - 43, G - 32]], BASE, HILIGHT, DEEP, 3);
  rock(p, [[cx - 49, G - 26], [cx - 24, G - 30], [cx - 21, G - 2], [cx - 46, G]], BASE, HILIGHT, DEEP, 3);
  // The gutter that separates the arm from the shaft. Carved in relief rather
  // than swung clear, it costs no silhouette and cannot make a handle -- and a
  // limb cut into a standing stone is more of what a menhir is than a limb
  // waved beside one.
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, gx = lerp(cx - 9, cx - 23, t), gy = lerp(G - 66, G - 29, t);
    cellOver(p, gx, gy, DEEP);
    cellOver(p, gx + 1, gy, DEEP);
    cellOver(p, gx - 1, gy, HILIGHT);
  }
  // Knuckle grooves across the fist, and a lit lip on each.
  for (let i = 0; i < 3; i++) {
    const y = G - 22 + i * 7;
    stroke(p, cx - 47, y, cx - 24, y - 1, DEEP);
    stroke(p, cx - 47, y - 1, cx - 24, y - 2, HILIGHT);
  }
  // Chips and a cracked corner in the lit strip. A pale panel of exactly even
  // width from top to bottom is a plank; three broken edges make it stone.
  for (const [qx, qy, ql] of [[cx - 20, G - 88, 7], [cx - 16, G - 52, 6], [cx - 22, G - 30, 5]] as const) {
    stroke(p, qx, qy, qx + ql, qy + ql * 0.6, DEEP);
    stroke(p, qx, qy - 1, qx + ql, qy + ql * 0.6 - 1, HILIGHT);
  }

  if (p.back) { p.face(cx - 8, G - 76, 18); return; }

  /* --- the carved face, a third of the way down the shaft. Not features
     sitting on stone: slots cut INTO it. The sockets are struck first as
     cavities with a bevelled upper lip and the eyes are dropped in bare, so
     nothing draws its own soft rim and spoils the chisel. The ore glows out. */
  // The socket walls are DEEP, not INNER. A warm cavity tone is right for a
  // mouth or an ear and wrong for a chiselled hole: two INNER rectangles round
  // the eyes came out as a pair of maroon spectacles.
  for (const [ex, ey, ew] of [[cx - 16, G - 74, 8], [cx + 1, G - 77, 7]] as const) {
    poly(p, [[ex - ew, ey + 6], [ex - ew + 1, ey - 6], [ex + ew, ey - 7], [ex + ew - 1, ey + 5]], DEEP);
    stroke(p, ex - ew, ey - 6, ex + ew, ey - 7, HILIGHT);
    stroke(p, ex - ew + 1, ey + 5, ex + ew - 1, ey + 4, SHADE);
  }
  eye(p, cx - 16, G - 74, 5.6, 'slit', { side: -1, iris: ACCENT_LIT, bare: true });
  eye(p, cx + 1, G - 77, 5, 'slit', { side: 1, iris: ACCENT_LIT, bare: true });
  p.face(cx - 8, G - 76, 18);

  // A straight chiselled brow ledge over both sockets: one cut, right across,
  // with a lit lip above it and two rows of shadow under.
  for (let i = 0; i <= 40; i++) {
    const bx = cx - 26 + i, by = G - 84 - i * 0.17;
    cellOver(p, bx, by - 1, LIGHT);
    cellOver(p, bx, by, HILIGHT);
    cellOver(p, bx, by + 1, DEEP);
    cellOver(p, bx, by + 2, DEEP);
    cellOver(p, bx, by + 3, SHADE);
  }
  // The mouth: a deep horizontal cut with a lit sill, and three broken teeth of
  // pale stone standing in it. A carved face needs a cut mouth, not lips.
  rect(p, cx - 17, G - 61, cx + 3, G - 58, DEEP);
  stroke(p, cx - 17, G - 62, cx + 3, G - 62, HILIGHT);
  stroke(p, cx - 17, G - 57, cx + 3, G - 57, SHADE);
  for (const tx of [cx - 12, cx - 4]) rect(p, tx, G - 61, tx + 1, G - 59, LIGHT);
}

/* =============================================================== chalkid */

/**
 * "Rounded chalk lump with blunt limbs and a banded seam."
 *
 * The other small rock on the roster, and it had to stop being pebblet. So it
 * stands UP: an upright nodule balanced on two blunt stubs, leaning back on its
 * heels with its belly out and one arm thrown high over its head, where pebblet
 * is a wide low four-legged boulder squatting into the floor. Tall and narrow
 * against short and broad separates them in silhouette with the colour off.
 *
 * Read the palette before deciding what the accent is for. Chalkid's accent is
 * a dull grey-brown DARKER than its body, so the banded seam is a dark stratum
 * cut across a white lump: there is nothing bright in this species and its
 * contrast runs the other way up. One belt, wide, with a pale sill on top of
 * it -- three narrower ones came out as corduroy.
 */
function chalkid(p: Pen): void {
  const G = p.ground, cx = p.cx;
  const bodyY = G - 48;

  /* --- blunt stubs, splayed. This creature has no feet to speak of. */
  stubLeg(p, cx + 18, G - 16, G - 2, 8, 1, SHADE);
  stubLeg(p, cx - 16, G - 18, G, 9.5, -1, BASE);

  /* --- the nodule: five overlapping masses, not one egg, leaning back so the
     crown sits behind the belly. A nodule that is a clean ellipse is a bean. */
  blob(p, cx - 1, bodyY + 4, 24, 30, BASE);
  blob(p, cx - 10, bodyY + 19, 19, 15, BASE);
  blob(p, cx + 10, bodyY - 14, 15, 14, BASE);
  blob(p, cx - 13, bodyY - 5, 12, 12, BASE);
  blob(p, cx + 15, bodyY + 7, 12, 13, BASE);
  // Knobs. A flint nodule is not a smooth lump, it is a lump with lumps on it,
  // and three bosses breaking the contour give this species an outline nothing
  // else in the group has. They are drawn as part of the mass, not stuck to it.
  for (const [kx, ky, kr] of [[cx + 22, bodyY - 6, 7], [cx - 22, bodyY + 11, 6.5],
    [cx + 4, bodyY - 27, 7.5], [cx + 21, bodyY + 20, 6]] as const) {
    blob(p, kx, ky, kr, kr * 0.92, BASE);
    for (const q of arc(kx, ky, kr - 0.5, kr * 0.88, Math.PI * 1.05, Math.PI * 1.9, 12)) cellOver(p, q[0], q[1], LIGHT);
    for (const q of arc(kx, ky, kr - 0.5, kr * 0.88, Math.PI * 0.1, Math.PI * 0.85, 12)) cellOver(p, q[0], q[1], DEEP);
  }

  /* --- chipped facets on the lit shoulder, hard-edged, so it is chalk and not
     dough. Chalk breaks with a conchoidal flat; it never wears round. */
  poly(p, [[cx - 24, bodyY - 3], [cx - 18, bodyY - 19], [cx - 2, bodyY - 25],
    [cx + 2, bodyY - 13], [cx - 8, bodyY - 6]], LIGHT);
  polyLine(p, [[cx - 24, bodyY - 3], [cx - 18, bodyY - 19], [cx - 2, bodyY - 25]], HILIGHT, false, true);
  polyLine(p, [[cx - 2, bodyY - 25], [cx + 2, bodyY - 13], [cx - 8, bodyY - 6], [cx - 24, bodyY - 3]], DEEP, false, true);
  poly(p, [[cx + 3, bodyY + 24], [cx - 15, bodyY + 27], [cx - 19, bodyY + 15], [cx + 1, bodyY + 13]], LIGHT);
  polyLine(p, [[cx + 1, bodyY + 13], [cx - 19, bodyY + 15]], HILIGHT, false, true);
  // The crown struck flat. A knobbly lump with a broken plane on top of it is a
  // nodule off a quarry face; the same lump left round is a bun.
  poly(p, [[cx - 16, bodyY - 26], [cx - 4, bodyY - 33], [cx + 12, bodyY - 29],
    [cx + 6, bodyY - 22], [cx - 10, bodyY - 21]], LIGHT);
  polyLine(p, [[cx - 16, bodyY - 26], [cx - 4, bodyY - 33], [cx + 12, bodyY - 29]], HILIGHT, false, true);
  polyLine(p, [[cx + 12, bodyY - 29], [cx + 6, bodyY - 22], [cx - 10, bodyY - 21], [cx - 16, bodyY - 26]], DEEP, false, true);
  // A struck corner on the back of the crown, and a bite taken out of the right
  // flank. A nodule that is smooth all the way round is a bean; the flats are
  // the only thing saying this is a stone that came off a quarry face.
  poly(p, [[cx + 8, bodyY - 26], [cx + 23, bodyY - 17], [cx + 22, bodyY - 6], [cx + 11, bodyY - 12]], SHADE);
  polyLine(p, [[cx + 8, bodyY - 26], [cx + 23, bodyY - 17]], HILIGHT, false, true);
  polyLine(p, [[cx + 23, bodyY - 17], [cx + 22, bodyY - 6], [cx + 11, bodyY - 12]], DEEP, false, true);
  for (const [nx0, ny0, nl] of [[cx + 24, bodyY + 14, 8], [cx - 24, bodyY + 6, 6]] as const) {
    stroke(p, nx0, ny0, nx0 - nl, ny0 + nl * 0.7, DEEP);
    stroke(p, nx0, ny0 - 1, nx0 - nl, ny0 + nl * 0.7 - 1, HILIGHT);
  }

  /* --- the stratum. One belt, wide, sagging in the middle so it wraps, with a
     pale sill above and a second darker gutter below. On a white creature this
     is the only dark shape there is, so it has to be the thing that identifies
     it -- and it is exactly what becomes chalkmar's slab shell. */
  band(p, cx, bodyY + 6, 30, 5, 7);
  band(p, cx, bodyY + 21, 25, 2, 5);
  band(p, cx, bodyY - 20, 20, 2, 4);
  // A fault through the main stratum: the band steps down where the stone has
  // shifted. One offset stops it reading as a belt somebody buckled on.
  for (let k = 0; k < 9; k++) {
    stroke(p, cx + 9, bodyY + 3 + k, cx + 11, bodyY + 4 + k, DEEP);
    stroke(p, cx + 8, bodyY + 3 + k, cx + 10, bodyY + 4 + k, LIGHT);
  }
  speckle(p, cx - 22, bodyY + 16, cx + 20, bodyY + 30, 0.1, SHADE);

  /* --- the far arm, a short stump against the flank. */
  limbPath(p, [[cx + 18, bodyY + 2], [cx + 27, bodyY + 15]], 12, 10, SHADE);
  blob(p, cx + 28, bodyY + 18, 6, 5.5, SHADE);

  /* --- the near arm, thrown up over the head. Lifted FAR: a stump raised five
     cells is a short arm, and this one clears the crown by more than its own
     length. It is the only thing breaking the top contour, so it does all the
     work at icon size. */
  limbPath(p, [[cx - 16, bodyY - 3], [cx - 27, bodyY - 21], [cx - 23, bodyY - 40]], 13, 10, BASE, { front: true, bulge: 1.5 });
  // A blunt worn mitt with three shallow grooves. Chalk wears round; there are
  // no fingers on this animal and drawing some would make it a person.
  // The stubs go dark where the belly overhangs them.
  overhang(p, cx - 27, cx - 3, bodyY + 33, 6);
  overhang(p, cx + 7, cx + 28, bodyY + 32, 6);

  blob(p, cx - 22, bodyY - 45, 8, 7, LIGHT);
  for (let i = 0; i < 3; i++) stroke(p, cx - 28 + i * 4.5, bodyY - 50, cx - 27 + i * 4.5, bodyY - 43, DEEP);
  cellOver(p, cx - 26, bodyY - 49, HILIGHT);

  if (p.back) { p.face(cx - 3, bodyY - 11, 18); return; }

  /* --- the face, low on the crown and half shut. Placid to the point of smug:
     the lids do all of it, and they are what stop this reading as another
     startled pebble. The lids are body-toned so they shade as chalk. */
  eye(p, cx - 15, bodyY - 10, 5.6, 'sleepy', { side: -1, iris: ACCENT_DARK, lid: BASE });
  eye(p, cx + 7, bodyY - 13, 5, 'sleepy', { side: 1, iris: ACCENT_DARK, lid: BASE });
  p.face(cx - 4, bodyY - 11, 20);

  // A small flat mouth well below the eyes, turned up at the corners. There is
  // a lot of blank chalk between the two and that gap is deliberate: it makes
  // the head a lump with a face on it rather than a head.
  mouthLine(p, cx - 4, bodyY + 1, 7, -1);
  // Two dust smears wiped down the belly, in the dull accent. The Vellum says
  // it marks everything it touches; this is it marking itself.
  for (const [sx, sy] of [[cx - 13, bodyY + 19], [cx - 7, bodyY + 22]] as const) {
    for (let k = 0; k < 6; k++) cellOver(p, sx + k, sy + k * 0.5, ACCENT_DARK);
  }
}

/* ============================================================== chalkmar */

/**
 * "Broad slab-plated walker with a chalk-white underbody."
 *
 * Chalkid with a quarry grown over it. The relationship is the one the Vellum
 * describes: the soft white nodule is still in there, now the belly and the
 * legs, and the dark band round its waist has become a roof of overlapping
 * slate slabs laid down its whole back.
 *
 * Where every other mineral here is tall, this one is LONG -- the widest thing
 * in the group by a distance. It walks on four pillars with the near foreleg
 * mid-stride and carries its head low and forward, which is what an animal
 * built to shove does.
 */
function chalkmar(p: Pen): void {
  const G = p.ground, cx = p.cx;

  /* --- far legs. Pillars, not limbs: this thing weighs a fifth of a tonne. */
  stubLeg(p, cx + 27, G - 32, G - 3, 10, 1, SHADE);
  stubLeg(p, cx - 19, G - 32, G - 4, 9, -1, SHADE);

  /* --- the body: a long low barrel with the chalk showing along the bottom. */
  blob(p, cx + 4, G - 44, 44, 22, BASE);
  blob(p, cx + 26, G - 45, 24, 21, BASE);
  blob(p, cx - 20, G - 43, 24, 20, BASE);
  // The chalk underbody, pale and running the whole length, cut off hard along
  // a straight line where the slate shell stops.
  poly(p, [[cx - 42, G - 36], [cx + 46, G - 39], [cx + 44, G - 25], [cx - 40, G - 22]], LIGHT);
  stroke(p, cx - 42, G - 37, cx + 46, G - 40, DEEP);
  stroke(p, cx - 42, G - 38, cx + 46, G - 41, HILIGHT);
  for (let i = 0; i < 5; i++) stroke(p, cx - 30 + i * 18, G - 36, cx - 27 + i * 18, G - 23, DEEP);

  /* --- the shell. Six slate slabs laid like roof tiles from the rump forward,
     drawn back to front so each overlaps the one behind it, every leading edge
     bevelled in the weathered tan the palette gives us. They step, so the top
     contour is a serrated ridge and not a curve -- and that serration is the
     whole silhouette read. */
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const px = cx + 40 - i * 17;
    const top = G - 56 - Math.sin(t * Math.PI) * 10;
    const w = 12 - i * 0.5;
    const slab: Pt[] = [
      [px - w, top + 4], [px - w * 0.35, top - 6], [px + w * 0.8, top - 3], [px + w + 2, top + 12],
      [px - w * 0.6, top + 16],
    ];
    // Bevelled in the body ramp, with the weathered tan kept to the single
    // leading edge. Ringing every slab in ACCENT_LIT outlined all six of them
    // in gold and they came off looking like stickers laid on a pig.
    rock(p, slab, i % 2 ? BASE : SHADE, HILIGHT, DEEP, true);
    stroke(p, slab[0]![0], slab[0]![1], slab[1]![0], slab[1]![1], ACCENT);
    stroke(p, slab[1]![0], slab[1]![1], slab[2]![0], slab[2]![1], ACCENT_LIT);
    stroke(p, slab[1]![0], slab[1]![1] + 1, slab[2]![0], slab[2]![1] + 1, ACCENT_DARK);
  }

  /* --- near legs. The foreleg is mid-stride, planted ahead of the shoulder;
     the hind is braced back under the hip. Four pillars square on is a table,
     and that offset is the one change that stops it being one. */
  stubLeg(p, cx + 20, G - 34, G - 1, 12, 1, BASE, true);
  stubLeg(p, cx - 28, G - 32, G, 11, -1, BASE, true);

  /* --- the head, low and forward on a neck that barely exists. A wide blunt
     wedge with a chisel jaw slung under it and a slate visor over the top, so
     the eyes look out of a slot. */
  // The pillars go dark where the barrel sits on them. Two runs, one per pair,
  // rather than one across the whole animal: a single band the length of a
  // quadruped is a waterline.
  overhang(p, cx - 38, cx - 8, G - 23, 6);
  overhang(p, cx + 6, cx + 42, G - 24, 6);

  const hx = cx - 44, hy = G - 46;
  limbPath(p, [[cx - 26, G - 44], [hx + 8, hy + 2]], 26, 22, BASE, { front: true });
  rock(p, [[hx - 20, hy - 4], [hx - 14, hy - 13], [hx + 12, hy - 12], [hx + 14, hy + 8],
    [hx - 3, hy + 14], [hx - 19, hy + 9]], BASE, HILIGHT, DEEP, true);
  rock(p, [[hx - 22, hy - 6], [hx - 12, hy - 16], [hx + 13, hy - 15], [hx + 15, hy - 2], [hx - 20, hy - 1]],
    SHADE, ACCENT_LIT, ACCENT_DARK, true);
  for (let i = 0; i <= 36; i++) {
    const bx = hx - 22 + i, by = hy - 1 - i * 0.06;
    cellOver(p, bx, by, ACCENT);
    cellOver(p, bx, by + 1, DEEP);
    cellOver(p, bx, by + 2, DEEP);
  }
  // The chisel jaw: a flat pale wedge driven forward under the wedge of the
  // skull, with a hard straight bite line. Chalk, and it is what it digs with.
  poly(p, [[hx - 21, hy + 4], [hx + 4, hy + 6], [hx + 2, hy + 15], [hx - 19, hy + 12]], LIGHT);
  stroke(p, hx - 21, hy + 4, hx + 4, hy + 6, DEEP);
  stroke(p, hx - 21, hy + 3, hx + 4, hy + 5, HILIGHT);
  polyLine(p, [[hx - 19, hy + 12], [hx + 2, hy + 15]], DEEP, false, true);
  if (!p.back) {
    for (let i = 0; i < 4; i++) {
      const tx = hx - 17 + i * 5.5;
      rect(p, tx, hy + 9, tx + 2, hy + 12, ACCENT_LIT);
      stroke(p, tx + 3, hy + 8, tx + 3, hy + 13, DEEP);
    }
    stroke(p, hx - 20, hy + 8, hx + 3, hy + 10, INNER);
  }

  if (p.back) { p.face(hx - 4, hy + 1, 16); return; }

  /* --- the face. Small, hard and jammed up under the visor: a heavy animal
     that has decided about you already. Big eyes here would make it a cow. */
  eye(p, hx - 12, hy + 2, 4.4, 'angry', { side: -1, iris: ACCENT_LIT });
  eye(p, hx + 4, hy + 2, 4, 'angry', { side: 1, iris: ACCENT_LIT });
  p.face(hx - 4, hy + 1, 16);
}

/* ============================================================ anchorling */

/**
 * "Iron anchor form with barnacled flukes and a single eye."
 *
 * The one that is not an animal at all, and the easiest silhouette in the
 * group: ring, shank, stock, two curved arms, two barbed flukes. Nothing else
 * on the roster is a piece of ship's tackle and nothing else needs to be.
 *
 * Two things stop it being a diagram. It LEANS -- the whole anchor is rotated
 * about its crown and rests on the crown and one dropped fluke, with the other
 * fluke swung high and clear, so it reads as a thing standing rather than a
 * thing drawn. And it has one enormous eye set into the shank inside a riveted
 * iron boss, which is where all of its character is: there is no mouth, no
 * limbs and no expression anywhere else on the sprite, so that lens is allowed
 * to be nearly a sixth of the creature's height.
 */
function anchorling(p: Pen): void {
  const G = p.ground, cx = p.cx;

  // The stock iron pass rules a rivet seam right across the widest part of the
  // body, which on an anchor is the stock -- and it comes out as a second
  // crossbar drawn over the first. The rivets below are hand-placed on the
  // pieces that are actually bolted together.
  p.noTypeTraits();

  // Everything is laid out in anchor coordinates -- dx across, dy UP from the
  // crown -- and rotated once, which is the only sane way to draw a leaning
  // rigid object; by eye, every mitre in the ironwork comes out wrong.
  //
  // Up is negative y on a mask, so the rotation has to take (dx, -dy). Writing
  // it as (dx, dy) drew the whole anchor downwards out of the frame, and the
  // fit obligingly recentred a creature standing on its own ring.
  const lean = -0.14;
  const c = Math.cos(lean), s = Math.sin(lean);
  const ox = cx + 4, oy = G - 12;
  const R = (dx: number, dy: number): Pt => [ox + dx * c + dy * s, oy + dx * s - dy * c];

  /* --- far arm and fluke, swung high to the right, in the recessed tone. The
     two arms are at completely different heights on purpose: an anchor drawn
     symmetric is a dingbat, and this is the same trick as three feet on the
     floor and one in the air. */
  limbPath(p, [R(4, 2), R(20, 4), R(34, 16)], 15, 11, SHADE);
  rock(p, [R(28, 10), R(46, 20), R(52, 8), R(36, 0)], SHADE, HILIGHT, DEEP, true);
  poly(p, [R(44, 20), R(54, 32), R(52, 16)], SHADE);
  polyLine(p, [R(44, 20), R(54, 32)], BASE, false, true);

  /* --- the shank: one long iron bar from the crown to the shackle, with a lit
     arris down its left and a dark one down its right so it is a bar and not a
     stripe. Six cells would not shade; this is fourteen. */
  rock(p, [R(-7, 4), R(-8, 68), R(8, 68), R(7, 4)], BASE, HILIGHT, DEEP);
  polyLine(p, [R(-6, 8), R(-7, 66)], HILIGHT, false, true);
  polyLine(p, [R(-4, 8), R(-5, 66)], LIGHT, false, true);
  polyLine(p, [R(6, 8), R(6, 66)], DEEP, false, true);

  /* --- the crown: the heavy block the two arms grow out of, and the only
     thing besides the near fluke that is on the floor. */
  rock(p, [R(-17, 10), R(-13, -7), R(14, -9), R(18, 9)], BASE, HILIGHT, DEEP, true);

  /* --- near arm and fluke, dropped to the floor on the left. */
  limbPath(p, [R(-5, 1), R(-24, 0), R(-40, 2)], 17, 13, BASE, { front: true });
  rock(p, [R(-33, 6), R(-52, 10), R(-58, -2), R(-40, -8)], BASE, HILIGHT, DEEP, true);
  poly(p, [R(-50, 10), R(-62, 20), R(-59, 4)], BASE);
  polyLine(p, [R(-50, 10), R(-62, 20)], HILIGHT, false, true);

  /* --- the stock: the crossbar high on the shank, near end long and heavy,
     far end short and dark. Foreshortening one end of a symmetric bar is the
     cheapest depth cue there is and it costs two numbers. */
  rock(p, [R(4, 58), R(28, 54), R(29, 44), R(4, 46)], SHADE, HILIGHT, DEEP, true);
  rock(p, [R(-42, 52), R(6, 58), R(6, 44), R(-41, 40)], BASE, HILIGHT, DEEP, true);
  polyLine(p, [R(-41, 51), R(5, 57)], HILIGHT, false, true);
  polyLine(p, [R(-40, 41), R(5, 45)], DEEP, false, true);
  // Rivets down the stock, each a dome: specular upper left, shadow lower right.
  for (let i = 0; i < 4; i++) {
    const q = R(-34 + i * 10, 46 + i * 1.2);
    blob(p, q[0], q[1], 2.6, 2.6, ACCENT_DARK);
    cellOver(p, q[0] - 1, q[1] - 1, ACCENT_LIT);
    cellOver(p, q[0] + 1, q[1] + 1, INNER);
  }

  /* --- the shackle and the ring. The ring is a real hole punched clean
     through: the outline pass wraps the inside of it in its own ink and the gap
     that survives is what makes this an anchor at sixteen pixels. The wall is
     left seven cells thick so it still shades. */
  rock(p, [R(-9, 62), R(8, 62), R(7, 74), R(-8, 74)], BASE, HILIGHT, DEEP, true);
  const rg = R(-2, 80);
  blob(p, rg[0], rg[1], 17, 15, BASE);
  blob(p, rg[0], rg[1] + 1, 10, 8.5, EMPTY);
  for (const q of arc(rg[0], rg[1], 15, 13, Math.PI * 1.02, Math.PI * 1.88, 20)) cellOver(p, q[0], q[1], HILIGHT);
  for (const q of arc(rg[0], rg[1], 15, 13, Math.PI * 0.08, Math.PI * 0.85, 18)) cellOver(p, q[0], q[1], DEEP);
  for (const q of arc(rg[0], rg[1] + 1, 10.5, 9, 0, Math.PI * 2, 34)) cellOver(p, q[0], q[1], DEEP);

  /* --- barnacles and weed. The barnacles are cones with dark craters,
     clustered where an anchor actually fouls: the palms and the crown. The weed
     OVERLAPS the iron rather than hanging off it -- anything that only
     approaches a mass gets its own two cells of ink and comes out as litter. */
  for (const [bx, by, br] of [[-46, 2, 4.2], [-53, 6, 3.2], [-38, -4, 3.4],
    [42, 14, 3.6], [48, 8, 2.8], [-4, -2, 3.2], [10, 2, 2.6], [2, 44, 2.6]] as const) {
    const q = R(bx, by);
    blob(p, q[0], q[1], br, br * 0.85, LIGHT);
    blob(p, q[0], q[1] - br * 0.3, br * 0.55, br * 0.4, SHADE);
    cellOver(p, q[0], q[1] - br * 0.3, INNER);
    cellOver(p, q[0] - br * 0.6, q[1] - br * 0.5, SPEC);
  }
  for (const [wx, wy, wl, wa] of [[-36, 4, 14, 2.5], [-26, 2, 11, 2.2], [-14, 0, 10, 2.7],
    [26, 46, 15, 2.0], [-22, 46, 13, 1.3], [34, 12, 12, 2.7], [16, 6, 10, 0.6]] as const) {
    const q = R(wx, wy);
    tuft(p, q[0], q[1], wl, wa, 0.5, ACCENT);
    tuft(p, q[0], q[1], wl * 0.6, wa + 0.5, 0.4, ACCENT_DARK);
  }

  if (p.back) { p.face(ox - 5, oy - 24, 16); return; }

  /* --- the eye. One, huge, set into the shank between the stock and the arms,
     inside a raised iron boss with its own rivets. The socket is cut first as a
     cavity with a bevelled lip and the eye dropped in bare, so the boss
     provides the rim rather than the eye drawing a soft one of its own over
     hammered iron. */
  const ey = R(-1, 24);
  // The boss is BASE, not LIGHT, and the socket is DEEP, not INNER. A pale ring
  // round a warm cavity is an eyeball on a stalk; this has to read as an eye
  // looking out of a hole in a lump of iron, and that means the iron stays iron.
  blobFront(p, ey[0], ey[1], 15, 14, BASE);
  for (const q of arc(ey[0], ey[1], 14, 13, Math.PI * 1.0, Math.PI * 1.9, 18)) cellOver(p, q[0], q[1], LIGHT);
  for (const q of arc(ey[0], ey[1], 13, 12, Math.PI * 1.05, Math.PI * 1.85, 16)) cellOver(p, q[0], q[1], HILIGHT);
  for (const q of arc(ey[0], ey[1], 14, 13, 0, Math.PI * 0.85, 18)) cellOver(p, q[0], q[1], DEEP);
  blob(p, ey[0], ey[1], 10.5, 10, DEEP);
  for (const q of arc(ey[0], ey[1], 10.5, 10, Math.PI * 1.05, Math.PI * 1.9, 14)) cellOver(p, q[0], q[1], INNER);
  eye(p, ey[0], ey[1], 8, 'round', { side: -1, iris: ACCENT_LIT, bare: true });
  p.face(ey[0], ey[1], 16);
  for (const a of [Math.PI * 1.2, Math.PI * 1.78, Math.PI * 0.22, Math.PI * 0.8]) {
    const rx = ey[0] + Math.cos(a) * 13, ry = ey[1] + Math.sin(a) * 12.5;
    blob(p, rx, ry, 2.2, 2.2, ACCENT_DARK);
    cellOver(p, rx - 1, ry - 1, ACCENT_LIT);
  }
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  pebblet,
  cairnling,
  menhir,
  chalkid,
  chalkmar,
  anchorling,
};
