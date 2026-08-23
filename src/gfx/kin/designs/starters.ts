/**
 * The three starters, drawn one at a time.
 *
 * These exist to prove the toolkit and to set the bar, so they are worth
 * reading before you draw anything else. The test they are built to pass is
 * the only test that matters: fill all three with one flat colour, put them
 * side by side, and a stranger should still be able to say which is which.
 *
 * They pass it because they are three different animals, not one animal three
 * times:
 *
 *   sprigling  a squat braced quadruped, low and wide, sunk into a fan of
 *              leaves, with a bud on its skull and half-lidded eyes.
 *   cinderpaw  a lean prowling cub with one forepaw off the ground, swept
 *              ears, a sharp wedge muzzle and an enormous plumed tail arcing
 *              over its back.
 *   rilltail   a sitting otter, upright on its haunches, webbed hands held
 *              up in front of its chest, a broad flat skull and a flat paddle
 *              tail laid out along the floor.
 *
 * Different postures, different numbers of feet on the ground, different heads,
 * different eyes, different signature features. That is the assignment.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, HILIGHT, INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, bellyPlate, blob, blobFront, brow, cell, cellOver, claw, crease, earPointed, earRound,
  eye, fin, hand, leaf, legColumn, legDigitigrade, limbPath, mane, mouthLine, muzzle, nostril,
  paddle, path, paw, poly, polyFront, stroke, tailPlume, tuft, whiskers,
  type Pen, type Pt,
} from '../parts.js';

/* ============================================================ sprigling */

/**
 * "Squat four-legged bud with a heavy leaf collar."
 *
 * The brief is a wall: it plants both feet and refuses to be moved. So nothing
 * about it is tall. The body is a wide dome barely clear of the floor, the four
 * legs are splayed columns rather than legs, and the head is *sunk* -- pushed
 * down and forward into the collar rather than carried on a neck. A creature
 * with no visible neck reads as immovable, and that is the entire brief in one
 * decision.
 *
 * The collar is drawn in two passes with the head between them, which is what
 * makes it a ruff the animal is wearing rather than a sunburst printed behind
 * it. Half the leaves are behind the skull in SHADE; the other half overlap the
 * chest in ACCENT. Nothing else in the file does as much work.
 */
function sprigling(p: Pen): void {
  const G = p.ground;
  const cx = p.cx;

  // The body sits low and wide; the head is forward and to the left, and the
  // whole animal is turned a few degrees so it is not facing square on.
  const bodyY = G - 32;
  const headX = cx - 26, headY = G - 58;
  const collarX = headX + 6, collarY = headY + 9;

  /* --- the collar, back half. Behind everything, in the recessed tone, so it
     reads as leaves on the far side of the neck rather than as a halo.

     The fan is deliberately *short at the top and long at the sides*. A ruff is
     widest at the shoulders, and -- more to the point -- the crown has to be
     left clear or the bud that is supposed to be this animal's second signature
     disappears into a hedge, which is exactly what happened first time. */
  const backLeaves = 7;
  for (let i = 0; i < backLeaves; i++) {
    const t = i / (backLeaves - 1);
    const a = Math.PI * (0.84 + t * 1.32);           // left, over the top, right
    const len = 17 + Math.abs(t - 0.5) * 30;         // widest at the sides
    const ox = collarX + Math.cos(a) * 13, oy = collarY + Math.sin(a) * 11;
    leaf(p, ox, oy, len, a, 5.2, SHADE);
  }

  /* --- rear legs. Down first and darker: they belong behind the barrel. */
  legColumn(p, cx - 20, bodyY + 12, G - 1, { tone: SHADE, side: -1, thick: 13, footHalf: 8, claws: false });
  legColumn(p, cx + 21, bodyY + 10, G - 2, { tone: SHADE, side: 1, thick: 12, footHalf: 7, claws: false });

  /* --- the barrel. Wider than it is tall by half again, which is the single
     proportion that separates a squat animal from a small one. */
  blob(p, cx, bodyY, 33, 24, BASE);
  // Shoulder and rump each get their own mass, or the body is one sausage.
  blobFront(p, cx + 19, bodyY - 1, 17, 20, BASE);
  blobFront(p, cx - 21, bodyY + 3, 15, 18, BASE);
  // Underside: a pale plastron with growth lines across it. On a plant-thing
  // this reads as bark plating, which is the note the brief is after.
  bellyPlate(p, cx - 3, bodyY + 12, 21, 10, 2);
  // Two long creases sweeping over the shell of the back.
  for (const q of path([[cx - 24, bodyY - 12], [cx - 4, bodyY - 19], [cx + 20, bodyY - 12]] as Pt[])) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0], q[1] - 1, HILIGHT);
  }
  for (const q of path([[cx - 18, bodyY + 1], [cx + 2, bodyY - 5], [cx + 24, bodyY + 2]] as Pt[])) {
    cellOver(p, q[0], q[1], DEEP);
  }

  /* --- a curled tendril where a tail would be. Three cells of silhouette that
     stop the rump being a plain arc, and it grows the right way for a plant. */
  limbPath(p, path([[cx + 30, bodyY - 4], [cx + 40, bodyY - 12], [cx + 38, bodyY - 22], [cx + 30, bodyY - 21]] as Pt[]),
    6, 1.5, ACCENT_DARK, { front: true, lit: ACCENT_LIT });
  leaf(p, cx + 31, bodyY - 21, 11, Math.PI * 1.15, 3.4, ACCENT);

  /* --- front legs, splayed outward and planted. The splay is the read: a
     vertical leg is furniture, a leaning one is weight going into the floor. */
  legColumn(p, cx - 16, bodyY + 14, G, { tone: BASE, side: -1, thick: 16, footHalf: 10, front: true, claws: false, footTone: ACCENT });
  legColumn(p, cx + 14, bodyY + 16, G - 1, { tone: BASE, side: 1, thick: 14, footHalf: 8, front: true, claws: false, footTone: ACCENT });

  // Roots creeping off the near foot onto the ground. Three cells each and they
  // are what turn "standing" into "planted".
  for (const [rx, ry, len, ang] of [[-32, 0, 9, Math.PI * 0.92], [-30, 1, 6, Math.PI * 1.06], [8, 1, 7, Math.PI * 0.04]] as const) {
    limbPath(p, [[cx + rx, G + ry], [cx + rx + Math.cos(ang) * len, G + ry + Math.sin(ang) * len * 0.4]], 4, 1.5, ACCENT_DARK);
  }

  /* --- the head, sunk forward into the collar with no neck showing. */
  blobFront(p, headX, headY, 21, 18, BASE);
  // A brow shelf. The head is a dome and the shelf is what stops it reading as
  // a ball: one dark arc with a lit lip above it, right across the skull.
  for (const q of arc(headX, headY - 2, 17, 12, Math.PI * 1.08, Math.PI * 1.92, 24)) {
    cellOver(p, q[0], q[1] + 3, DEEP);
    cellOver(p, q[0], q[1] + 2, HILIGHT);
  }
  // Cheeks: two soft pads either side of the jaw, so the face is not a plane.
  blob(p, headX - 12, headY + 9, 7, 5, LIGHT);
  blob(p, headX + 11, headY + 8, 6, 4.5, LIGHT);

  /* --- the collar, front half. Over the chest, in the bright leaf tone. */
  const frontLeaves = 6;
  for (let i = 0; i < frontLeaves; i++) {
    const t = i / (frontLeaves - 1);
    const a = Math.PI * (0.70 + t * 1.60);
    const len = 15 + Math.abs(t - 0.5) * 26;
    const ox = collarX + Math.cos(a) * 15, oy = collarY + Math.sin(a) * 12 + 4;
    leaf(p, ox, oy, len, a, 4.6, ACCENT);
  }

  /* --- the bud. The second signature, and the highest thing on the sprite:
     a swollen calyx with three sepals wrapped round it, the near one bright
     and the two behind it dark, so it reads as *wound* rather than as three
     leaves in a row. Drawn after the collar so nothing overlaps it. */
  const budX = headX + 2, budY = headY - 28;
  // Two leaflets flaring off the calyx, so the bud is growing out of something
  // rather than balanced on the skull.
  leaf(p, budX - 4, budY + 11, 13, Math.PI * 1.16, 3.6, SHADE);
  leaf(p, budX + 4, budY + 11, 12, Math.PI * 1.82, 3.4, SHADE);
  blobFront(p, budX, budY + 10, 8, 6.5, ACCENT_DARK);
  for (const [dx, h, w, tone] of [[-5, 15, 5, ACCENT_DARK], [5, 16, 5, SHADE], [0, 22, 5.5, ACCENT]] as const) {
    const bx = budX + dx;
    poly(p, [[bx - w, budY + 11], [bx + w, budY + 10], [bx + 1, budY + 10 - h]], tone);
    // Each sepal gets a lit near edge and an inked far edge, which is what
    // makes three overlapping triangles read as one thing wound round itself
    // instead of as three leaves standing in a row.
    stroke(p, bx - w, budY + 11, bx + 1, budY + 10 - h, ACCENT_LIT);
    stroke(p, bx + w, budY + 10, bx + 1, budY + 10 - h, DEEP);
  }
  // The tip: three bright cells where the sepals meet. This is what makes it a
  // bud about to open rather than a spearhead.
  cell(p, budX + 1, budY - 12, ACCENT_LIT);
  cell(p, budX, budY - 11, ACCENT_LIT);
  cell(p, budX + 2, budY - 11, SPEC);
  // The socket: a hard dark band where the bud enters the skull.
  for (const q of arc(budX, budY + 13, 8, 3.5, Math.PI, Math.PI * 2, 16)) {
    cellOver(p, q[0], q[1] + 2, ACCENT_DARK);
    cellOver(p, q[0], q[1] + 1, ACCENT_LIT);
  }
  // The collar's own root ring, so the leaves come out of something.
  for (const q of arc(collarX, collarY + 4, 16, 11, Math.PI * 0.78, Math.PI * 2.2, 30)) {
    cellOver(p, q[0], q[1], ACCENT_DARK);
  }

  if (p.back) { p.face(headX, headY, 22); return; }

  /* --- the face. Half-lidded and wide-set: patient, not sleepy, and it is
     the eyes that carry that. Nothing else on the sprite says "stubborn". */
  eye(p, headX - 9, headY + 1, 6, 'hooded', { side: -1, iris: ACCENT_DARK, lid: BASE });
  eye(p, headX + 9, headY, 5.6, 'hooded', { side: 1, iris: ACCENT_DARK, lid: BASE });
  p.face(headX, headY, 22);

  // A blunt beak of a snout, barely proud of the face, and a flat mouth. A
  // muzzle on this animal would make it a dog; a lipped notch keeps it a plant.
  blob(p, headX - 3, headY + 11, 9, 5, LIGHT);
  nostril(p, headX - 6, headY + 9, -1);
  nostril(p, headX + 1, headY + 9, 1);
  mouthLine(p, headX - 2, headY + 14, 7, 1);
}

/* ============================================================ cinderpaw */

/**
 * "Lean short-legged cub with an oversized tufted tail."
 *
 * Everything here is motion. The body is a tilted capsule rather than a level
 * barrel, the near forepaw is off the ground entirely, the head is dropped and
 * turned so the two eyes are different sizes, and the tail is a plume half the
 * height of the animal thrown up and forward over its own back.
 *
 * The near forepaw is the pose. Three feet on the floor and one raised is a
 * creature about to move; four feet on the floor is a table. It costs one
 * changed coordinate and it is the single highest-value decision in the file.
 *
 * Note the palette. This species declares a near-black brown as its accent, so
 * ACCENT is *ink* here, not fire -- it is used for the ear pits, the toe pads,
 * the brows and the ash bands on the tail. The heat comes from LIGHT and from
 * ACCENT_LIT, which is a warm cream. Read a species' palette before you decide
 * what its accent is for.
 */
function cinderpaw(p: Pen): void {
  const G = p.ground;
  const cx = p.cx;

  // The stock flame character pass grows near-black tongues off the upper
  // contour, because this species declares a near-black accent -- and on an
  // orange cub they read as scorch damage rather than as fire. The heat is
  // hand-placed instead, in the warm cream that palette actually gives us.
  p.noTypeTraits();

  const shoulderX = cx - 24, shoulderY = G - 44;
  const hipX = cx + 22, hipY = G - 50;
  const headX = cx - 36, headY = G - 60;

  /* --- the tail, laid down first so the body overlaps its root. It sweeps
     back, up and then forward over the spine: a closed C, which reads as a
     held pose, where an open sweep reads as a creature standing still.

     It is deliberately as tall as the rest of the animal put together. "An
     oversized tufted tail" is the brief and a tail the size of a tail is not
     oversized; this one has to be the first thing you see. */
  const tailPath: Pt[] = [[hipX + 4, hipY + 4], [cx + 40, G - 60], [cx + 43, G - 78], [cx + 28, G - 90], [cx + 10, G - 87]];
  tailPlume(p, tailPath, 15, 6, {
    tone: LIGHT, far: BASE, edgeLit: ACCENT_LIT, thick: 11, tip: 4, front: false, plainTip: true,
  });
  const dense = path(tailPath);
  // Two ash bands, low on the tail only. Rings all the way up read as segments
  // and turn the plume straight back into a scorpion.
  for (const t of [0.16, 0.3]) {
    const i = Math.round(t * (dense.length - 1));
    const q = dense[i]!, r = dense[Math.min(dense.length - 1, i + 4)]!;
    const nx = -(r[1] - q[1]), ny = r[0] - q[0], d = Math.hypot(nx, ny) || 1;
    for (const k of [-1, 0]) {
      stroke(p, q[0] - (nx / d) * 10 + k, q[1] - (ny / d) * 10, q[0] + (nx / d) * 10 + k, q[1] + (ny / d) * 10, ACCENT);
    }
  }
  // The tip is a flame lick: two tongues drawn back along the plume from its
  // last clump, so they grow *out of* the fur instead of hanging near it.
  //
  // The first attempt built them as free polygons a few cells past the end of
  // the tail, and the outline pass duly wrapped them in their own ink: the
  // creature came out with a grey wedge floating beside its tail. Anything
  // meant to be part of a mass has to overlap that mass, not approach it.
  const tip = dense[dense.length - 1]!;
  tuft(p, tip[0] + 5, tip[1] - 1, 15, Math.PI * 1.03, 0.32, LIGHT);
  tuft(p, tip[0] + 4, tip[1] - 3, 10, Math.PI * 0.99, 0.26, BASE);
  // SPEC, not ACCENT_LIT. This species' accent is a near-black brown, so its
  // lit end comes out a warm grey -- fine for a claw, a dirty streak on a
  // flame. The body ramp's top step is the hot tone here. Check what your
  // palette's accent actually *is* before reaching for ACCENT_LIT.
  stroke(p, tip[0] + 5, tip[1] - 5, tip[0] - 9, tip[1] - 6, SPEC);
  stroke(p, tip[0] + 5, tip[1] - 4, tip[0] - 9, tip[1] - 5, SPEC);

  /* --- far legs. Down first, in the recessed tone. The far hind is braced
     back; the far fore is tucked under the chest. */
  legDigitigrade(p, hipX + 8, hipY + 10, G - 1, { tone: SHADE, side: 1, thick: 11, ankle: 6, footHalf: 6, claws: true });
  legDigitigrade(p, shoulderX + 8, shoulderY + 12, G - 2, { tone: SHADE, side: -1, thick: 9, ankle: 5, footHalf: 5, claws: true });

  /* --- the body: a capsule tilted nose-down, with the haunch as its own mass
     behind it. A lean animal is not a thin barrel, it is a deep chest and a
     tucked waist, and the tuck is the part that has to be drawn. */
  limbPath(p, [[shoulderX, shoulderY + 4], [cx - 2, shoulderY + 9], [hipX, hipY + 5]], 33, 30, BASE, { bulge: -3 });
  blobFront(p, hipX + 3, hipY + 3, 19, 20, BASE);
  blobFront(p, shoulderX - 1, shoulderY + 6, 17, 16, BASE);
  // Waist tuck: a dark arc under the ribs that lifts the belly line.
  for (const q of arc(cx - 2, shoulderY + 6, 18, 22, Math.PI * 0.18, Math.PI * 0.82, 22)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0], q[1] - 1, SHADE);
  }
  // Chest and belly, pale.
  bellyPlate(p, shoulderX + 2, shoulderY + 17, 15, 8, 2);
  // Shoulder blade and the crease behind the ribs: curved, never straight.
  for (const q of path([[shoulderX + 4, shoulderY - 8], [shoulderX + 9, shoulderY + 2], [shoulderX + 7, shoulderY + 13]] as Pt[])) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0] - 1, q[1], HILIGHT);
  }
  // Ember flecks over the haunch, in the tone the shading pass leaves alone.
  for (const [ex, ey] of [[hipX + 2, hipY - 4], [hipX + 9, hipY + 3], [hipX - 3, hipY + 6], [hipX + 6, hipY + 12]] as const) {
    cellOver(p, ex, ey, ACCENT_LIT);
    cellOver(p, ex + 1, ey, ACCENT_LIT);
    cellOver(p, ex, ey + 1, ACCENT);
  }

  /* --- near hind leg, on the floor and carrying the weight. */
  legDigitigrade(p, hipX - 2, hipY + 12, G, { tone: BASE, side: 1, thick: 12, ankle: 7, footHalf: 7, front: true, claws: true });

  /* --- near forepaw, RAISED. The pose, and the highest-value decision on the
     sprite: three feet on the floor and one in the air is a creature about to
     move, four feet on the floor is a table. The elbow stays back, the forearm
     swings forward and the paw hangs with the claws out.

     It has to be lifted *far* -- a good twenty cells clear of the ground line.
     Lifted five, it reads as a short leg, which is what the first pass at it
     looked like. */
  const elbowX = shoulderX - 4, elbowY = shoulderY + 17;
  const wristX = shoulderX - 21, wristY = G - 32;
  limbPath(p, [[shoulderX + 2, shoulderY + 8], [elbowX, elbowY], [wristX, wristY]], 13, 7, BASE, { front: true, bulge: 1.5 });
  crease(p, elbowX, elbowY, 5);
  // A hanging paw, drawn by hand rather than with `paw`. That helper builds a
  // *planted* foot -- flat bottom, heel roll, toes spread on a ground line --
  // and a planted foot in mid-air reads as a leg that has been cut off, which
  // is precisely how the first attempt at this pose looked. A dangling paw is
  // a rounded knuckle mass with the toes curled under it.
  blobFront(p, wristX - 2, wristY + 5, 7, 6, BASE);
  for (let i = 0; i < 3; i++) {
    const tx = wristX - 7 + i * 4.5;
    blob(p, tx, wristY + 9, 2.4, 3, i === 0 ? LIGHT : BASE);
    stroke(p, tx + 2.2, wristY + 6, tx + 2.2, wristY + 11, DEEP);
    claw(p, tx - 1, wristY + 11, 4, -0.4, 1);
  }
  cellOver(p, wristX - 6, wristY + 2, HILIGHT);

  /* --- the head. A wedge, not a ball: the skull is a short dome and the
     muzzle is a separate pointed mass driven forward and down out of it. */
  blobFront(p, headX, headY, 17, 15, BASE);
  // A ruff of fur where the head meets the shoulders, jagged on the underside.
  mane(p, path([[headX + 6, headY + 14], [headX + 14, headY + 12], [headX + 20, headY + 4]] as Pt[]), 7, 4, LIGHT, ACCENT_LIT);

  // Ears: tall, pointed, swept back, with fur tufts on the leading edge. The
  // far ear is smaller and darker, which is most of what sells the head turn.
  earPointed(p, headX + 9, headY - 10, 21, 8, 1, { tone: SHADE, inner: INNER, front: true, tufted: true });
  earPointed(p, headX - 7, headY - 11, 23, -7, -1, { tone: BASE, inner: INNER, front: true, tufted: true });

  // The muzzle wedge: short, deep and sharply pointed, driven down and out of
  // the skull rather than stuck on the front of it. Kept small on purpose --
  // a pale wedge covering the whole face leaves nowhere for the mask markings
  // to sit and the head comes out looking bleached.
  polyFront(p, [[headX - 2, headY + 4], [headX - 17, headY + 9], [headX - 15, headY + 15], [headX - 1, headY + 15]], LIGHT, DEEP, 1);
  stroke(p, headX - 3, headY + 5, headX - 16, headY + 9, HILIGHT);
  // Nose leather at the point of the wedge.
  poly(p, [[headX - 17, headY + 8], [headX - 11, headY + 7], [headX - 13, headY + 12]], ACCENT);
  cell(p, headX - 16, headY + 8, ACCENT_LIT);
  if (!p.back) {
    // Mouth open just enough to show two fangs. A closed mouth on this animal
    // would waste the whole head.
    poly(p, [[headX - 13, headY + 12], [headX - 4, headY + 12], [headX - 5, headY + 17], [headX - 12, headY + 16]], INNER);
    poly(p, [[headX - 11, headY + 15], [headX - 6, headY + 14], [headX - 7, headY + 17], [headX - 10, headY + 17]], ACCENT_DARK);
    // Two fangs, each with an ink edge down one side, so a cream tooth still
    // reads against a cream muzzle.
    for (const fx of [headX - 12, headX - 6]) {
      for (let k = 0; k < 3; k++) { cell(p, fx, headY + 12 + k, ACCENT_LIT); cell(p, fx + 1, headY + 12 + k, INNER); }
    }
    whiskers(p, headX - 12, headY + 9, 2, -1, 10, 0.5, LIGHT);
  }

  if (p.back) { p.face(headX, headY, 18); return; }

  /* --- the face. Slanted, hard, with a heavy brow: a hunting animal. The two
     eyes are deliberately different sizes and heights, because the head is
     turned and a matched pair would flatten it straight back out.

     They are also small. A big eye on a predator reads as a cub asking to be
     picked up; the character here is in the *slant* and in how little white
     shows, and both of those get worse the larger the eye is drawn. */
  eye(p, headX - 8, headY + 1, 5, 'slit', { side: -1, iris: ACCENT_LIT });
  eye(p, headX + 7, headY - 1, 4.2, 'slit', { side: 1, iris: ACCENT_LIT });
  brow(p, headX - 8, headY - 6, 10, -1, 0.42);
  brow(p, headX + 7, headY - 8, 8, 1, 0.42);
  // Mask markings running back from each eye into the ruff, in the near-black
  // accent. Two strokes, and they are what stops the face being a plain wedge.
  for (const [sx, sy, ex, ey] of [[headX + 1, headY - 3, headX + 13, headY - 8], [headX - 3, headY + 5, headX + 8, headY + 8]] as const) {
    for (let k = 0; k < 2; k++) stroke(p, sx, sy + k, ex, ey + k, ACCENT);
  }
  p.face(headX, headY, 18);
}

/* ============================================================= rilltail */

/**
 * "Flat-headed otterish shape with a broad paddle tail."
 *
 * The one that is not a quadruped at all. It sits up on its haunches with the
 * tail laid flat along the floor behind it and both webbed hands held up in
 * front of its chest, because the Vellum entry says it taps the water surface
 * in patterns and a creature that taps needs hands to tap with.
 *
 * That posture is the whole design. It gives a silhouette -- an upright
 * teardrop with a wide flat blade sticking out of the bottom and two small
 * raised paws -- that nothing else on the roster can be confused with, and it
 * comes free the moment you stop assuming a four-legged brief means four legs
 * on the floor.
 *
 * The skull is the second decision: flat and broad, eyes set high and wide on
 * top of it rather than on the front of it, which is how every animal that
 * watches the water surface is actually built.
 */
function rilltail(p: Pen): void {
  const G = p.ground;
  const cx = p.cx;

  // The stock tide character pass plants a dorsal fin on whatever is highest
  // and behind the face. On a creature sitting upright that is the middle of
  // its own back, and it comes out looking like a blade someone left in it.
  // The gills and the nape crest below do the same job on purpose.
  p.noTypeTraits();

  const rumpX = cx + 2, rumpY = G - 20;
  const chestX = cx - 8, chestY = G - 54;
  const headX = cx - 12, headY = G - 74;

  /* --- the paddle tail, flat on the floor and sweeping out to the right.
     Drawn first: the rump sits on top of its root. */
  paddle(p, rumpX + 8, G - 12, 48, 14, 0.06, ACCENT_DARK);

  /* --- far hind foot and far arm, in the recessed tone. */
  paw(p, cx + 26, G - 1, 10, { tone: SHADE, toes: 4, webbed: true, long: true, claws: true });
  limbPath(p, [[chestX + 14, chestY + 10], [chestX + 20, chestY + 24]], 11, 8, SHADE);

  /* --- the body: a pear standing on its haunches. Wide and heavy at the
     floor, narrowing to the shoulders. Sitting weight is all in that taper. */
  blob(p, rumpX, rumpY, 27, 21, BASE);
  limbPath(p, [[rumpX - 2, rumpY - 6], [chestX + 3, chestY + 14], [chestX, chestY]], 38, 30, BASE);
  blobFront(p, chestX, chestY, 18, 16, BASE);
  // Haunch: its own mass on the near side, with the thigh crease around it.
  blobFront(p, rumpX - 14, rumpY + 1, 15, 16, BASE);
  for (const q of arc(rumpX - 14, rumpY + 1, 12, 13, Math.PI * 1.1, Math.PI * 2.1, 20)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0] - 1, q[1], LIGHT);
  }
  // Near hind foot, splayed forward off the haunch.
  paw(p, rumpX - 22, G - 1, 11, { tone: BASE, toes: 4, webbed: true, long: true, claws: true });

  // The bib: a pale front running from the throat down to the belly, in the
  // near-white accent this species declares. It is the only large flat area on
  // the sprite and it is what makes the pose read at icon size.
  blob(p, chestX - 3, chestY + 16, 14, 20, ACCENT);
  blob(p, chestX - 2, chestY + 2, 11, 12, ACCENT);
  for (let i = 0; i < 3; i++) {
    const y = chestY + 12 + i * 8;
    stroke(p, chestX - 13, y, chestX + 8, y + 1, ACCENT_DARK);
  }

  /* --- arms and hands, held up and forward. Both wrists are cocked and the
     two hands are at different heights, so it reads as mid-tap rather than as
     a creature holding something. The upper hand is pushed clear of the bib on
     purpose: a pale hand over a pale chest is a hand nobody can see. */
  limbPath(p, [[chestX + 8, chestY + 6], [chestX - 6, chestY + 12], [chestX - 17, chestY + 9]], 12, 7, BASE, { front: true, bulge: 1 });
  limbPath(p, [[chestX + 12, chestY + 8], [chestX + 10, chestY + 22], [chestX - 2, chestY + 28]], 11, 7, BASE, { front: true, bulge: 1 });
  hand(p, chestX - 23, chestY + 6, 7, { tone: LIGHT, side: -1, fingers: 4, webbed: true, claws: true });
  hand(p, chestX - 9, chestY + 33, 6.5, { tone: LIGHT, side: 1, fingers: 4, webbed: true, claws: true });

  /* --- the head. Broad and flat: half again as wide as it is tall, with a
     long low snout on the front of it and the eyes up on the roof rather than
     on the face, which is how everything that watches a water surface from
     just above it is actually built. */
  // A low rayed crest on the nape. This species' one piece of fin, kept small
  // and put where a fin belongs -- and drawn *before* the head and neck, so
  // they overlap its root and it grows out of the animal.
  //
  // It started on the back of the skull, where its rays landed across the far
  // eye and it read as a fan glued to the face. Ornament near a face is the
  // single easiest thing to get wrong, and the only way to catch it is to
  // render the sprite and look at it.
  fin(p, [chestX + 14, chestY - 2], [[chestX + 12, chestY - 20], [chestX + 21, chestY - 16], [chestX + 25, chestY - 5]], { tone: ACCENT, rays: 4 });

  // Neck next, or the head floats. It is short and thick, and it is the only
  // reason the head reads as attached rather than balanced.
  limbPath(p, [[chestX + 4, chestY - 6], [headX + 8, headY + 9]], 20, 16, BASE);
  blobFront(p, headX, headY, 19, 12.5, BASE);
  // The skull plate: a flat lit top face with a hard edge where it turns down
  // to the sides. Flatness has to be drawn; a dome will not become flat under
  // the light on its own.
  blob(p, headX - 1, headY - 5, 15, 4.5, LIGHT);
  for (const q of arc(headX - 1, headY - 4, 15, 6, Math.PI, Math.PI * 2, 24)) cellOver(p, q[0], q[1] + 1, DEEP);

  // Small round ears, high enough to break the top contour. An otter's are
  // almost vestigial and making them big would turn the whole animal into a
  // cat -- but an ear entirely inside the skull outline is an ear nobody sees,
  // which is what happened when they were first placed by anatomy alone.
  // On the rear view the bowls become the backs of the ears: two dark cavities
  // on a face with no eyes read as eyes, and the back sprite is the one nobody
  // remembers to look at.
  const bowl = p.back ? SHADE : INNER;
  earRound(p, headX + 14, headY - 8, 4.5, 1, { tone: SHADE, inner: bowl, front: true });
  earRound(p, headX - 12, headY - 10, 5, -1, { tone: BASE, inner: bowl, front: true });

  // The snout: long, low and blunt, with a broad nose pad on the end. The pad
  // is a rounded mass with a hard catchlight, not a flat wedge -- a nose is
  // wet, and one bright cell is the whole of what says so.
  muzzle(p, headX - 15, headY + 5, 10, 6, { dir: -1, tone: LIGHT, detail: !p.back, frown: -1 });
  blob(p, headX - 22, headY + 1, 4.5, 3.2, ACCENT_DARK);
  blob(p, headX - 22, headY + 2.5, 3.6, 1.6, INNER);
  cell(p, headX - 24, headY, SPEC);
  cell(p, headX - 23, headY, SPEC);
  cell(p, headX - 24, headY + 1, ACCENT_LIT);
  if (!p.back) {
    // Two whiskers, not four, and short. Anything that leaves the silhouette
    // gets its own two cells of ink, so a whisker is four cells wide by the
    // time it is drawn -- they are expensive and a hedge of them reads as
    // damage rather than as a face.
    whiskers(p, headX - 20, headY + 6, 2, -1, 11, 0.55, ACCENT);
    for (const wy of [headY + 3, headY + 6]) { cellOver(p, headX - 17, wy, ACCENT_DARK); cellOver(p, headX - 14, wy + 1, ACCENT_DARK); }
  }

  // Gill slits on the side of the neck, behind the jaw hinge: three cavities
  // each with a lit leading lip. The cheapest way to say "this thing breathes
  // water" without spending a single pixel of silhouette on it.
  for (let i = 0; i < 3; i++) {
    const gx = chestX + 4 + i * 4;
    // Two cells of cavity to one of lit lip. One-to-one and the lip wins the
    // contrast fight, so the gills come out as three white scratches.
    stroke(p, gx, chestY - 3 + i, gx, chestY + 5 + i, INNER);
    stroke(p, gx + 1, chestY - 3 + i, gx + 1, chestY + 5 + i, INNER);
    stroke(p, gx - 1, chestY - 3 + i, gx - 1, chestY + 5 + i, ACCENT_LIT);
  }

  if (p.back) { p.face(headX, headY, 18); return; }

  /* --- the face. Round, wet and wide-set, sitting high on the skull: watching
     the water, not hunting it. The gap between the eyes is most of the width of
     the head, and that proportion is what does the work. */
  eye(p, headX - 9, headY - 1, 5.2, 'round', { side: -1, iris: ACCENT_DARK });
  eye(p, headX + 7, headY - 2, 4.8, 'round', { side: 1, iris: ACCENT_DARK });
  p.face(headX, headY, 18);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  sprigling,
  cinderpaw,
  rilltail,
};
