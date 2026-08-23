/**
 * Design group E -- the arthropods.
 *
 * Six species that all have exoskeletons and too many legs, which is exactly
 * the trap: draw them by anatomy and you get six spiders. So each one is built
 * around what the animal is *doing*, and the six poses are deliberately chosen
 * so that no two of the silhouettes can be confused:
 *
 *   nettlebug    a grub with its front third reared off the floor in the
 *                sphinx posture, spiky knobs standing along its back.
 *   spinnet      a spider up on arched legs with its abdomen carried high and
 *                two forelegs reaching, silk spools at the hip.
 *   weaverjaw    the same animal grown heavy and pressed *low*, legs braced
 *                wide, two armoured jaw shields thrown forward.
 *   tallowmoth   a broad-winged moth perched with its wings spread flat and
 *                asymmetric, feathered antennae swept back.
 *   pinchel      a squat crab with one enormous claw held straight up.
 *   clatterclaw  a tall reef crab with both claws out in a shearing guard.
 *
 * Two evolution lines run through it. nettlebug -> spinnet -> weaverjaw keep a
 * ridge down the back at every stage -- soft bristle clumps on the first two,
 * hardened into armoured spines on the third -- and the green shell tone;
 * pinchel -> clatterclaw keep stalked bead eyes, a weed-blotched carapace and
 * banded legs. In both, the later form is lower/heavier or taller/meaner rather
 * than the earlier one scaled up.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, EYE_DARK, EYE_WHITE, HILIGHT,
  INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, bevel, blob, blobFront, cell, cellOver, clamp, crease, eye, leaf,
  lerp, limbPath, normalAt, path, poly, polyFront, rect, rings, speckle, spineRow,
  stroke, tuft,
  type Pen, type Pt,
} from '../parts.js';

/* ======================================================= shared parts */

/**
 * A stiff bristle clump standing off a surface.
 *
 * The family signature of the nettlebug line. A single spike reads as damage;
 * three of unequal length springing from one root read as hair that has gone
 * hard, which is the whole idea of a stinging grub.
 */
function bristle(
  p: Pen, x: number, y: number, ang: number, len: number,
  v = ACCENT, lit = ACCENT_LIT, spread = 0.19,
): void {
  // Needles, not triangles. A triangle whose base is three cells across and
  // whose sides open thirty degrees is a LEAF, and a clump of three of them is
  // a fern -- which is precisely what the first version grew all over the
  // grub. A bristle is nearly parallel-sided for most of its length and comes
  // to a point only at the very end.
  for (const d of [-spread, 0.01, spread]) {
    const a = ang + d;
    const l = len * (1 - Math.abs(d) * 0.8);
    limbPath(p, [[x, y], [x + Math.cos(a) * l * 0.55, y + Math.sin(a) * l * 0.55],
      [x + Math.cos(a) * l, y + Math.sin(a) * l]] as Pt[], 3.4, 1.2, v);
  }
  // One lit shaft up the middle. Without it the clump is a black blot; with it
  // the bristles read as separate and shining.
  stroke(p, x + Math.cos(ang) * 2, y + Math.sin(ang) * 2,
    x + Math.cos(ang + 0.02) * len * 0.9, y + Math.sin(ang + 0.02) * len * 0.9, lit, true);
}

/**
 * A ridge of bristle clumps riding a path, each on its own raised knob.
 *
 * `radius` is how far the surface is from the path at that point and `len` how
 * long the clump there should be; both take the position along the path, so a
 * ridge can swell over a hump and alternate long and short.
 */
function bristleRidge(
  p: Pen, dense: Pt[], count: number, radius: (t: number) => number,
  len: (t: number) => number, knobTone: number, spikeTone: number, lit: number,
  knobR = 4.0,
): void {
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const idx = clamp(Math.round(t * (dense.length - 1)), 0, dense.length - 1);
    const q = dense[idx]!;
    const r = radius(t);
    /* Which way is "out" is decided by ASKING THE MASK, never by the winding
       of the path. A contour traced one way and the same contour traced the
       other have opposite normals, and the first version of spinnet grew its
       entire dorsal ridge into the inside of its own abdomen -- invisible in
       the code, and in the picture just five pale discs and no bristles. */
    let n = normalAt(dense, idx);
    if (p.m.filled(Math.round(q[0] + n[0] * (r + 4)), Math.round(q[1] + n[1] * (r + 4)))) n = [-n[0], -n[1]];
    const kx = q[0] + n[0] * r * 0.82, ky = q[1] + n[1] * r * 0.82;
    // The knob first: a raised wart the bristles grow out of. Bristles straight
    // off a smooth back read as pins pushed into it. Kept small -- drawn pale
    // and large they turn a bristled back into a row of soap bubbles.
    blobFront(p, kx, ky, knobR, knobR * 0.86, knobTone, DEEP, 1);
    cellOver(p, kx - knobR * 0.4, ky - knobR * 0.4, HILIGHT);
    bristle(p, kx + n[0] * knobR * 0.5, ky + n[1] * knobR * 0.5, Math.atan2(n[1], n[0]), len(t), spikeTone, lit);
  }
}

/**
 * One walking leg of a crab or a spider: out and up to a high knee, then down
 * to a point that touches the floor.
 *
 * The pointed tip matters more than the joint. An arthropod leg that ends in a
 * pad is a mammal leg, and one that ends in a flat stump is a chair leg -- the
 * dactyl has to narrow to two cells and drive into the ground.
 */
function walkLeg(
  p: Pen, hx: number, hy: number, kx: number, ky: number, fx: number, fy: number,
  thick: number, tone: number, front = false, bands = 2,
): void {
  const dark = tone === SHADE;
  // Two STRAIGHT segments meeting at a hard knee. The first version ran a
  // Catmull-Rom curve through hip, knee and foot; every leg came out as a
  // smooth tube and eight smooth tubes read as tentacles. An arthropod leg is
  // two rods and a joint, and the joint has to be a corner.
  limbPath(p, [[hx, hy], [kx, ky]] as Pt[], thick, thick * 0.66, tone, front ? { front: true } : {});
  limbPath(p, [[kx, ky], [fx, fy - 7]] as Pt[], thick * 0.62, thick * 0.24, tone);
  // The knee knuckle, pale and proud, laid over both rods so the corner reads
  // as a hinge rather than as a kink.
  blobFront(p, kx, ky, thick * 0.30, thick * 0.30, dark ? SHADE : LIGHT, DEEP, 1);
  cellOver(p, kx - thick * 0.16, ky - thick * 0.16, dark ? BASE : HILIGHT);
  // Segment bands down the shin, thinning as they go.
  for (let i = 1; i <= bands; i++) {
    const t = i / (bands + 1);
    const bx = lerp(kx, fx, t), by = lerp(ky, fy - 7, t);
    const w = thick * (0.5 - t * 0.22);
    stroke(p, bx - w, by, bx + w, by, ACCENT_DARK);
    stroke(p, bx - w, by - 1, bx + w, by - 1, dark ? BASE : LIGHT);
  }
  // The dactyl: a hard point driven into the floor. A leg that ends in a pad
  // is a mammal's and one that ends flat is a chair's.
  poly(p, [[fx - thick * 0.22, fy - 9], [fx + thick * 0.22, fy - 9], [fx + 0.5, fy + 1]], dark ? SHADE : LIGHT);
  stroke(p, fx - thick * 0.18, fy - 8, fx + 0.3, fy - 1, dark ? BASE : SPEC, false);
  cell(p, fx + 0.5, fy, ACCENT_DARK);
  cell(p, fx - 0.5, fy, ACCENT_DARK);
}

export interface ChelaOpts {
  tone?: number;
  /** How wide the pincer opens, in radians. Zero closes it. */
  gape?: number;
  /** Lay a seam into whatever the claw is drawn over. */
  front?: boolean;
  /** A patch of weed on the palm. The crabs' shared grubby detail. */
  weed?: boolean;
}

/**
 * A crab claw, pointing along `ang` and `len` cells long from wrist to tip.
 *
 * Built as three masses, not one: a fat palm with the muscle belly on its outer
 * side, a fixed finger continuing the palm's line, and a dactyl swinging up off
 * the top of it. The gap between the two fingers is the whole read, and it has
 * to be wide -- the outline grows two cells off each finger, so a pincer whose
 * tips are ten cells apart closes itself the moment it is inked.
 */
function chela(p: Pen, x: number, y: number, ang: number, len: number, o: ChelaOpts = {}): void {
  const tone = o.tone ?? BASE;
  const gape = o.gape ?? 0.34;
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const P = (a: number, b: number): Pt => [x + ux * len * a + nx * len * b, y + uy * len * a + ny * len * b];

  /* The palm is deliberately SHORT -- two fifths of the claw, no more.
     The first version gave it more than half the length and stamped it at a
     third of the length in width, so the ball of the palm swallowed the roots
     of both fingers; what stuck out past it was ten cells of pincer, and the
     outline pass closed the gap between them. A claw is mostly finger. */
  /* The palm is a POLYGON, not a capsule.

     `limbPath` stamps a disc of half the width at every point of its spine, so
     a palm asked for at half the claw's width also grows half the claw's width
     of overhang at each end -- to get a fat palm you have to make its spine
     short, and then the fingers root so far inside it that only their tips
     show. Both versions built that way came out as a two-pronged fork. A
     drawn quadrilateral is fat where it is fat and stops where it stops, and
     it has the hard chitinous corners a claw wants anyway. */
  const palmPts: Pt[] = [
    P(-0.04, -0.02), P(0.08, -0.25), P(0.28, -0.28), P(0.48, -0.19),
    P(0.54, 0.02), P(0.46, 0.22), P(0.24, 0.29), P(0.06, 0.24),
  ];
  if (o.front) polyFront(p, palmPts, tone, DEEP, 1.6); else poly(p, palmPts, tone);
  // A lit ridge along the upper edge of the palm and a dark gutter under it,
  // so the claw is a wedge with a top and a bottom rather than a slab.
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const q = P(0.06 + t * 0.40, -0.19 - Math.sin(t * Math.PI) * 0.05);
    cellOver(p, q[0], q[1], LIGHT);
    cellOver(p, q[0] + nx * 1.7, q[1] + ny * 1.7, SPEC);
  }
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const q = P(0.08 + t * 0.38, 0.18 + Math.sin(t * Math.PI) * 0.05);
    cellOver(p, q[0], q[1], DEEP);
  }

  /* The fingers are SHORT, THICK and pale.

     Long thin prongs off a fat base is the silhouette of a bird's foot, and
     that is what two passes of this produced. On a real chela the fingers are
     about two fifths of the length, start nearly as deep as the palm and hold
     that depth most of the way out. Painting them one material lighter than
     the palm does the rest: the pincer separates from its own hand. */
  // Painted in the PALM's tone, not a step lighter than it. A pale pair of
  // fingers on a mid-toned fist puts a hard tone break exactly where the
  // knuckles of a hand would be, and the claw reads as somebody's fist with
  // two fingers out. The bite has to be cut with shape and shadow instead.
  const fing = tone;
  const fixRoot = P(0.40, 0.13), fixTip = P(0.96, 0.11);
  limbPath(p, [fixRoot, P(0.72, 0.15), fixTip], len * 0.26, 3.0, fing);
  // The dactyl is the SLIMMER of the two and it HOOKS: its last segment turns
  // back down toward the fixed finger. Two fingers of equal weight running
  // straight out is a thumb and a forefinger, and the claw reads as a mitten.
  const dacRoot = P(0.40, -0.13);
  const dacKnee = P(0.70, -0.15 - gape * 0.46);
  const dacTip = P(0.92 - gape * 0.22, -0.09 - gape * 0.58);
  limbPath(p, [dacRoot, dacKnee, dacTip], len * 0.19, 2.6, fing);
  // The knuckle the dactyl hinges on, and its shadow. Small: drawn at an
  // eighth of the claw's length it came out as a coin stuck on the palm.
  blobFront(p, ...(P(0.38, -0.12) as [number, number]), len * 0.08, len * 0.075, tone, DEEP, 1);
  cellOver(p, ...(P(0.35, -0.16) as [number, number]), HILIGHT);

  // Shearing edges: a pale run down the inside of each finger with dark
  // notches cut into it. Cheap, and it is what says the two halves meet.
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    const a = P(lerp(0.48, 0.90, t), lerp(0.03, 0.09, t));
    cellOver(p, a[0], a[1], k % 2 ? SPEC : LIGHT);
    const b: Pt = [lerp(dacRoot[0], dacTip[0], t), lerp(dacRoot[1], dacTip[1], t)];
    cellOver(p, b[0] + nx, b[1] + ny, k % 2 ? SPEC : LIGHT);
    if (k % 3 === 1) { cellOver(p, a[0] - nx, a[1] - ny, ACCENT_DARK); cellOver(p, b[0] + nx * 2, b[1] + ny * 2, ACCENT_DARK); }
  }
  // A hard crease at the wrist, or the palm welds to the arm it grew out of.
  for (let k = -4; k <= 4; k++) cellOver(p, ...(P(-0.02, k * 0.055) as [number, number]), DEEP);
  // Tips.
  for (const [tp, s] of [[fixTip, -1], [dacTip, 1]] as const) {
    cell(p, tp[0], tp[1], SPEC);
    cell(p, tp[0] + nx * s, tp[1] + ny * s, LIGHT);
    cell(p, tp[0] - ux, tp[1] - uy, ACCENT_DARK);
  }
  if (o.weed) {
    const w = P(0.16, 0.10);
    blob(p, w[0], w[1], len * 0.08, len * 0.065, ACCENT);
    cellOver(p, w[0] - 2, w[1] - 1.5, ACCENT_LIT);
  }
}

/** A stalked bead eye, the crab line's shared feature. */
function stalkEye(p: Pen, bx: number, by: number, tx: number, ty: number, r: number, tone: number, back: boolean): void {
  limbPath(p, [[bx, by], [lerp(bx, tx, 0.5) - 1, lerp(by, ty, 0.5)], [tx, ty]] as Pt[], 6.4, 5.2, tone, { front: true });
  stroke(p, bx - 1, by, tx - 1, ty, tone === SHADE ? BASE : LIGHT);
  if (back) {
    // From behind, a stalk ends in the back of a bead, not in a pupil. Two
    // black dots on a blank head read as eyes and ruin the rear sprite.
    blobFront(p, tx, ty, r, r, tone, DEEP, 1);
    cellOver(p, tx - r * 0.4, ty - r * 0.4, HILIGHT);
    return;
  }
  blob(p, tx, ty, r + 1.2, r + 1.2, ACCENT_DARK);
  blob(p, tx, ty, r, r, EYE_DARK);
  p.m.box(Math.round(tx - r * 0.7), Math.round(ty - r * 0.75), Math.round(tx - r * 0.1), Math.round(ty - r * 0.2), EYE_WHITE);
  cell(p, tx + r * 0.5, ty + r * 0.4, ACCENT_LIT);
}

/* ============================================================ nettlebug */

/**
 * "Segmented grub with raised bristle ridges."
 *
 * A caterpillar that has been disturbed: the back half is still gripping the
 * floor on four pairs of prolegs and the front third is reared up and arched
 * back, which is the one posture every stinging larva on earth actually adopts
 * and the only thing that stops a grub being a sausage.
 *
 * The segments are drawn as nine overlapping discs rather than as one tapered
 * tube, each pressed in front of the last, so the contour is lumpy. That, plus
 * the row of knobs, is the entire silhouette: a spiky question mark.
 */
function nettlebug(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The stock chitin pass rules four horizontal seams across the bounding box.
  // On an animal whose own segmentation runs diagonally up a curve they cross
  // it at every angle and the grub comes out looking like graph paper.
  p.noTypeTraits();
  // The plate texture rules armour bands straight across the bounding box. On
  // nine overlapping discs climbing a curve they cross the segmentation at
  // every angle and the grub comes out looking like a brick wall.
  p.noTexture();

  /* The reared third leans FORWARD, not straight up.

     Built as a vertical column with a head on top it read as a rabbit: a
     hunched animal sitting on its haunches. Swung out to the left it becomes a
     question mark -- the tail on the floor, the body arching up and over, the
     head hanging out past the front feet -- and that curve is the whole pose. */
  const spine: Pt[] = [
    [cx + 40, G - 15],
    [cx + 24, G - 17],
    [cx + 7, G - 23],
    [cx - 9, G - 35],
    [cx - 22, G - 50],
    [cx - 27, G - 63],
  ];
  const dense = path(spine);
  const idxAt = (t: number): number => clamp(Math.round(t * (dense.length - 1)), 0, dense.length - 1);
  const at = (t: number): Pt => dense[idxAt(t)]!;
  const nAt = (t: number): Pt => normalAt(dense, idxAt(t));
  const RAD = [7.4, 9.8, 11.4, 12.0, 11.6, 10.8, 10.0, 9.2, 8.6];
  const radius = (t: number): number => {
    const u = clamp(t, 0, 1) * (RAD.length - 1);
    const i = Math.min(RAD.length - 2, Math.floor(u));
    return lerp(RAD[i]!, RAD[i + 1]!, u - i);
  };

  const headX = cx - 30, headY = G - 72;

  /** A stubby proleg: a fleshy cone with a hooked pad on the floor. */
  const proleg = (t: number, tone: number, front: boolean, lean: number): void => {
    const q = at(t), n = nAt(t), r = radius(t);
    const bx = q[0] - n[0] * r * 0.55, by = q[1] - n[1] * r * 0.55;
    limbPath(p, [[bx, by], [bx + lean * 2, G - 5], [bx + lean * 3, G - 2]] as Pt[], 8, 6.4, tone,
      front ? { front: true } : {});
    // A flat gripping sole, not a ball. Round pads on eight stubs came out as
    // a bunch of grapes hanging under the animal.
    rect(p, bx + lean * 3 - 4.5, G - 4, bx + lean * 3 + 4.5, G, tone);
    stroke(p, bx + lean * 3 - 5, G + 1, bx + lean * 3 + 5, G + 1, DEEP);
    stroke(p, bx + lean * 3 - 4.5, G - 4, bx + lean * 3 + 4.5, G - 4, tone === SHADE ? BASE : LIGHT);
    for (let k = -1; k <= 1; k++) cell(p, bx + lean * 3 + k * 2.6, G - 1, ACCENT_DARK);
  };

  /* --- far prolegs, in the recessed tone, before the body goes over them. */
  for (const t of [0.07, 0.20, 0.33, 0.46]) proleg(t, SHADE, false, 1.4);

  /* --- the body: nine discs walked up the spine, each laid in front of the
     one behind it so every joint gets a dark ring. A single tapered tube gets
     a smooth contour and a smooth contour is not a grub. */
  for (let i = 0; i < 9; i++) {
    const t = i / 8, q = at(t), r = radius(t);
    blobFront(p, q[0], q[1], r * 1.02, r, BASE, DEEP, 1.4);
  }

  /* --- the pale underside, along the belly of the rear half only. */
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * 0.66, q = at(t), n = nAt(t), r = radius(t);
    for (let d = -3; d <= 3; d++) {
      cellOver(p, q[0] - n[0] * (r * 0.56) + n[1] * d, q[1] - n[1] * (r * 0.56) - n[0] * d, LIGHT);
    }
  }

  /* --- the segment rings. Nine overlapping discs give a lumpy contour but not
     a segmented one -- the joints have to be RULED, a dark line across the body
     with a lit lip on the leading side, or the whole thing is a sausage with
     dents in it. This is the single mark that turns the mass into a grub. */
  rings(p, dense, 8, 13, DEEP, LIGHT);

  /* --- spiracles: a row of dark ports with a lit lip, low on the flank. The
     cheapest single mark that says "insect" rather than "worm". */
  for (const t of [0.10, 0.22, 0.34, 0.46, 0.58, 0.70, 0.80]) {
    const q = at(t), n = nAt(t), r = radius(t);
    const sx = q[0] - n[0] * r * 0.16, sy = q[1] - n[1] * r * 0.16;
    blob(p, sx, sy, 2.6, 1.9, ACCENT_DARK);
    cellOver(p, sx, sy - 2, LIGHT);
    cellOver(p, sx, sy, ACCENT);
  }

  /* --- near prolegs, carrying the weight, and the three little thoracic legs
     on the reared section, which hang folded in front of the chest. */
  for (const t of [0.13, 0.26, 0.39, 0.52]) proleg(t, BASE, true, -0.6);
  for (const t of [0.76, 0.86, 0.95]) {
    const q = at(t), n = nAt(t), r = radius(t);
    const bx = q[0] - n[0] * r * 0.7, by = q[1] - n[1] * r * 0.7;
    limbPath(p, [[bx, by], [bx - 7, by + 6]] as Pt[], 6.5, 3.6, BASE, { front: true });
    poly(p, [[bx - 9, by + 5], [bx - 5, by + 6], [bx - 8, by + 12]], ACCENT_DARK);
    cellOver(p, bx - 8.5, by + 7, ACCENT_LIT);
  }

  /* --- the ridge. Seven raised knobs up the whole back, each carrying a fan
     of stiff bristles, longest over the hump. This is the brief and it is
     drawn as big as the frame will take. */
  /* Six clumps, alternating long and short.

     Seven clumps of near-equal length, each up to twenty cells and all leaning
     the same way, closed up into one continuous dark mat lying along the back
     -- the animal came out as a rabbit wearing a fern. Fur and bristle are the
     same two numbers every time: how near the trough between clumps gets to
     zero, and whether consecutive clumps are the same length. */
  bristleRidge(p, dense, 6, (t) => radius(t),
    (t) => (t * 6 % 2 < 1 ? 16 : 9.5) * (0.72 + Math.sin(t * Math.PI) * 0.4),
    LIGHT, ACCENT, ACCENT_LIT, 3.4);
  // A second, shorter row down the near flank so the back reads as bristled
  // all over rather than as having a mohawk. Kept low on the side and short:
  // the first pass put them near the belly at full length and they came out
  // as four black smudges under the animal.
  for (let i = 0; i < 3; i++) {
    const t = 0.24 + (i / 2) * 0.42;
    const idx = idxAt(t), q = dense[idx]!, n = normalAt(dense, idx), r = radius(t);
    const a = Math.atan2(n[1], n[0]) - 1.0;
    bristle(p, q[0] + Math.cos(a) * r * 0.78, q[1] + Math.sin(a) * r * 0.78, a, 6, ACCENT_DARK, ACCENT);
  }

  /* --- the head: a hard round capsule, tipped forward off the front segment,
     with a pale face plate and a pair of long bristle horns over it. */
  blobFront(p, headX, headY, 9.5, 9, BASE, DEEP, 1.5);
  for (const q of arc(headX, headY - 1, 8, 6.5, Math.PI * 1.05, Math.PI * 1.95, 20)) {
    cellOver(p, q[0], q[1] + 3, DEEP);
    cellOver(p, q[0], q[1] + 2, HILIGHT);
  }
  blob(p, headX - 3, headY + 3, 6.4, 5.4, LIGHT);
  // Horns. Two clumps, long and swept back over the skull -- the tallest thing
  // on the sprite, and what the eye finds first at icon size. They are splayed
  // much wider than the ridge clumps: at the ridge's tight spread two upright
  // clumps on a round head came out as a pair of rabbit ears.
  // Both lean BACK, over the shoulder. A symmetric V of two upright clumps on
  // a round head is a pair of rabbit ears, whatever they are made of.
  bristle(p, headX - 3, headY - 8, Math.PI * 1.58, 18, ACCENT, ACCENT_LIT, 0.42);
  bristle(p, headX + 6, headY - 5, Math.PI * 1.78, 14, ACCENT_DARK, ACCENT, 0.38);

  if (p.back) { p.face(headX, headY, 11); return; }

  /* --- the face. Half-shut and entirely unbothered: this animal's defence is
     that it tastes appalling, and it knows it. The sleepy lid is the only eye
     in the group that does not look alert. */
  eye(p, headX - 5, headY - 1, 3.6, 'sleepy', { side: -1, iris: ACCENT_DARK, lid: BASE, sclera: ACCENT_LIT });
  eye(p, headX + 5, headY - 3, 3.0, 'sleepy', { side: 1, iris: ACCENT_DARK, lid: BASE, sclera: ACCENT_LIT });
  p.face(headX, headY, 11);

  // Mandibles: two dark chewing plates under a pale lip, meeting at the front.
  poly(p, [[headX - 9, headY + 4], [headX - 2, headY + 5], [headX - 3, headY + 9], [headX - 8, headY + 8]], ACCENT_DARK);
  stroke(p, headX - 9, headY + 5, headX - 3, headY + 6, ACCENT_LIT);
  stroke(p, headX - 8, headY + 7, headX - 3, headY + 7, INNER);
  // Two stub antennae, short enough not to cost silhouette.
  for (const [ax, ay] of [[headX - 9, headY - 2], [headX - 8, headY + 1]] as const) {
    cellOver(p, ax, ay, ACCENT_DARK);
    cellOver(p, ax - 1, ay, ACCENT_DARK);
  }
}

/* ============================================================== spinnet */

/**
 * "Eight-legged spinner, high abdomen, silk spools at the hip."
 *
 * Carried high is the pose: the abdomen rides above and behind the shoulders
 * on a stalk of a waist, the legs arch over the body rather than out from it,
 * and the two forelegs are lifted clear of the floor and reaching. A spider
 * flat on its feet is a spot on a wall; a spider up on its toes with its front
 * legs in the air is about to do something to you.
 *
 * The abdomen is the top of the drawing and the head is at the bottom of it,
 * which is the opposite of every other sprite in the group -- worth more for
 * telling it apart at a glance than any amount of detail on the face.
 */
function spinnet(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const ax = cx + 20, ay = G - 70;         // abdomen
  const hx = cx - 28, hy = G - 40;         // cephalothorax

  /* --- far legs first, in the recessed tone. The knees stay BELOW the top of
     the abdomen: arched over it they crowd the one shape the brief calls out,
     and the sprite comes out as a bundle of arches with a body somewhere in
     it. Feet are staggered against the near set so the eight do not read as
     four pairs of tramlines. */
  const FAR: Array<[number, number, number, number]> = [
    [hx - 14, G - 66, cx - 36, G - 1],
    [hx + 8, G - 70, cx - 10, G - 1],
    [ax - 4, G - 72, cx + 24, G - 1],
    [ax + 16, G - 66, cx + 44, G - 2],
  ];
  for (const [kx, ky, fx, fy] of FAR) {
    walkLeg(p, hx + 8, hy - 4, kx, ky, fx, fy, 7, SHADE, false, 2);
  }
  // The far foreleg, raised with the near one. Both up reads as reaching;
  // one up reads as a limp.
  walkLeg(p, hx - 2, hy - 6, hx - 20, G - 72, cx - 40, G - 60, 6.5, SHADE, false, 2);

  /* --- the waist, then the abdomen over it. A spider is two balls and the
     pinch between them is the entire read; drawn as one mass it is a beetle,
     which is exactly what happened the first time the two were placed close
     enough for their outlines to touch. They are now a clear twenty cells
     apart with a nine-cell stalk between them. */
  limbPath(p, [[hx + 12, hy - 6], [ax - 18, ay + 14]] as Pt[], 9, 8, SHADE, { front: true });

  blobFront(p, ax, ay, 24, 22, BASE, DEEP, 1.5);
  blob(p, ax - 7, ay - 8, 14, 11, LIGHT);
  blob(p, ax - 6, ay - 7, 11, 8.5, BASE);
  // Venom chevrons down the dorsum, in the purple this species declares. Each
  // is one clean five-cell band with a lit and an inked flank -- three stacks
  // of overlapping strokes came out as graffiti.
  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    const my = ay - 14 + t * 20, w = 14 - t * 5;
    limbPath(p, [[ax - w, my], [ax, my + 7 - t * 2], [ax + w, my]] as Pt[], 5, 5, ACCENT,
      { lit: ACCENT_LIT, dark: ACCENT_DARK });
  }
  // A bristle ridge over the top of the abdomen: the feature carried up from
  // nettlebug, kept short and body-toned at the root because the abdomen is
  // already the largest shape on the sprite.
  // The spikes are painted DEEP, a fixed tone, not in this species' accent:
  // its accent is a mid purple, so accent bristles came out as a row of
  // violets growing on the animal's back. The dark end of the body ramp is the
  // only near-black material a green Kin has.
  bristleRidge(p, path([[ax - 22, ay + 4], [ax - 13, ay - 17], [ax + 10, ay - 21], [ax + 22, ay - 4]] as Pt[]),
    6, () => 2, (t) => 9 + Math.sin(t * Math.PI) * 5, BASE, DEEP, ACCENT_DARK, 2.4);

  /* --- the cephalothorax, in front of the waist, with a domed carapace. */
  blobFront(p, hx, hy, 17, 14.5, BASE, DEEP, 1.5);
  blob(p, hx - 3, hy - 5, 12, 6, LIGHT);
  for (const q of arc(hx - 2, hy - 3, 14, 8, Math.PI, Math.PI * 2, 22)) cellOver(p, q[0], q[1] + 1, DEEP);
  // The fovea: one dark dimple in the middle of the carapace, which is what a
  // real spider has there and what makes the plate read as a plate.
  blob(p, hx + 4, hy - 1, 2.4, 1.8, DEEP);

  /* --- near legs. Three planted, one raised: the same trick the starters used
     to turn a table into an animal, applied to something with eight feet. */
  const NEAR: Array<[number, number, number, number]> = [
    [hx + 2, G - 62, cx - 30, G],
    // Both rear knees sit clear of the abdomen, below its lower edge: parked
    // inside it their pale knuckles came out as bubbles floating on the ball.
    [ax - 16, G - 42, cx + 4, G],
    [ax + 14, G - 40, cx + 40, G - 1],
  ];
  for (const [kx, ky, fx, fy] of NEAR) walkLeg(p, hx + 10, hy + 2, kx, ky, fx, fy, 8, BASE, true, 2);
  walkLeg(p, hx - 4, hy + 1, hx - 24, G - 74, cx - 50, G - 66, 7.5, BASE, true, 2);

  /* --- silk spools at the hip. Two pale reels under the back of the abdomen
     with the thread wound visibly round them, and a strand run off the lower
     one. Named in the brief, so they go down AFTER the legs: drawn with the
     body they ended up behind two shins and could not be seen at all. */
  for (const [ox, oy, sr] of [[18, 12, 8], [8, 20, 6]] as const) {
    const qx = ax + ox, qy = ay + oy;
    blobFront(p, qx, qy, sr, sr * 0.94, LIGHT, DEEP, 1.4);
    for (const q of arc(qx, qy, sr * 0.68, sr * 0.64, 0, Math.PI * 2, 24)) cellOver(p, q[0], q[1], DEEP);
    for (const q of arc(qx, qy, sr * 0.36, sr * 0.34, 0, Math.PI * 2, 14)) cellOver(p, q[0], q[1], DEEP);
    for (const q of arc(qx, qy, sr * 0.52, sr * 0.48, Math.PI * 0.9, Math.PI * 2.0, 12)) cellOver(p, q[0], q[1], SPEC);
    cellOver(p, qx, qy, ACCENT_DARK);
  }
  // The strand. Short and stiff: anything free-floating gets its own two cells
  // of ink on each side, so a long thread would read as a fifth leg.
  limbPath(p, [[ax + 22, ay + 15], [ax + 29, ay + 23], [ax + 31, ay + 32]] as Pt[], 3.4, 2.4, LIGHT);
  blob(p, ax + 31, ay + 34, 2.6, 2.6, LIGHT);

  /* --- pedipalps: two short feelers held in front of the mouth. They are what
     stop the front of the head being a bare curve. */
  for (const [px, py, dy, tone] of [[hx - 13, hy + 5, 12, SHADE], [hx - 15, hy + 8, 15, BASE]] as const) {
    limbPath(p, [[px, py], [px - 8, py + dy * 0.5], [px - 6, py + dy]] as Pt[], 7, 3.2, tone, { front: true });
    blob(p, px - 6, py + dy, 3.2, 2.6, tone === SHADE ? SHADE : LIGHT);
  }

  if (p.back) { p.face(hx - 6, hy - 2, 16); return; }

  /* --- the face. Two big compound domes with a bank of six small ocelli over
     them: eight eyes, arranged the way a hunting spider's actually are, and the
     only lattice eye in the group. */
  eye(p, hx - 9, hy + 1, 5.6, 'compound', { side: -1 });
  eye(p, hx + 2, hy - 1, 4.4, 'compound', { side: 1 });
  p.face(hx - 6, hy - 2, 16);
  for (const [ox, oy, orr] of [[-14, -6, 2.2], [-8, -8, 2.4], [-1, -9, 2.0], [5, -8, 1.8], [-12, 5, 1.9], [-3, 6, 1.7]] as const) {
    blob(p, hx + ox, hy + oy, orr + 0.9, orr + 0.9, ACCENT_DARK);
    blob(p, hx + ox, hy + oy, orr, orr, EYE_DARK);
    cell(p, hx + ox - orr * 0.4, hy + oy - orr * 0.4, EYE_WHITE);
  }
  // Chelicerae under the eye bank, with the fang tips showing.
  poly(p, [[hx - 15, hy + 4], [hx - 4, hy + 5], [hx - 5, hy + 13], [hx - 14, hy + 12]], SHADE);
  stroke(p, hx - 15, hy + 5, hx - 5, hy + 6, HILIGHT);
  for (const fx of [hx - 13, hx - 7]) {
    poly(p, [[fx - 2, hy + 11], [fx + 2, hy + 11], [fx - 1, hy + 17]], ACCENT_DARK);
    cell(p, fx - 1, hy + 16, ACCENT_LIT);
  }
}

/* ============================================================ weaverjaw */

/**
 * "Heavy-bodied spinner with armoured jaw plates."
 *
 * The same animal as spinnet after it has stopped running. Everything that was
 * high is now low: the abdomen has dropped onto its own hips, the legs are half
 * the length and twice the thickness and are braced out sideways, and the head
 * has grown two enormous shield plates that fold forward over the fangs.
 *
 * That inversion is deliberate. An evolution that is the previous stage scaled
 * up teaches the player nothing; one that has changed its *posture* reads as
 * the same creature having become a different problem.
 */
function weaverjaw(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const ax = cx + 30, ay = G - 50;
  const hx = cx - 10, hy = G - 54;

  /* --- far legs: thick, thrown wide, knees level with the top of the body so
     the whole animal hangs slung between them. Every foot is kept to the RIGHT
     of where the maw will land, or the jaws have to be drawn over a thicket of
     shins and stop reading as silhouette at all. */
  const FAR: Array<[number, number, number, number]> = [
    [hx - 4, G - 70, cx - 24, G - 1],
    [hx + 18, G - 74, cx - 2, G - 1],
    [ax - 6, G - 76, cx + 28, G - 1],
    [ax + 18, G - 68, cx + 52, G - 2],
  ];
  for (const [kx, ky, fx, fy] of FAR) walkLeg(p, hx + 8, hy - 4, kx, ky, fx, fy, 10, SHADE, false, 2);

  /* --- the abdomen: a heavy dome slung low between the hips. Round, not the
     long slab the first pass gave it -- a slab with stripes on it reads as a
     shipping container. */
  limbPath(p, [[hx + 12, hy - 2], [ax - 18, ay - 2]] as Pt[], 18, 17, SHADE, { front: true });
  blobFront(p, ax, ay, 27, 25, BASE, DEEP, 1.6);
  blob(p, ax - 9, ay - 11, 15, 10, LIGHT);
  blob(p, ax - 8, ay - 10, 12, 7.5, BASE);
  // One bold hourglass, in the purple this species declares. Three stacked
  // chevrons on a mass this size came out as graffiti; one big mark reads at
  // icon size and nothing else on the sprite is competing for the space.
  // It is filled in ACCENT_DARK with a lighter inset, not in plain ACCENT: the
  // shading pass runs ACCENT up its own ramp, so the lit half of a plain accent
  // marking turns pale lilac and disappears into a pale green back -- which is
  // exactly what happened, and the mark came out looking like half a bowl.
  const my = ay - 7;
  const glass: Pt[] = [[ax - 14, my - 11], [ax + 14, my - 10], [ax + 4, my], [ax + 14, my + 11], [ax - 14, my + 10], [ax - 4, my]];
  const inset: Pt[] = glass.map((q) => [lerp(ax, q[0], 0.76), lerp(my, q[1], 0.76)] as Pt);
  poly(p, glass, ACCENT_DARK);
  poly(p, inset, ACCENT);
  stroke(p, ax - 12, my - 8, ax + 12, my - 7, ACCENT_LIT);
  /* The dorsal ridge, and the one place this animal is deliberately NOT its
     previous stage: spinnet's soft bristle tufts have hardened into a row of
     flat armoured spines. Kept as a ridge in the same place along the same
     back, so the family is still legible, but at icon size -- where the maw is
     four pixels wide and stops counting -- it is the only thing that tells the
     two apart at a glance. */
  // Traced BACK to FRONT, because `spineRow` takes the path's left normal and
  // the other winding buries every spine inside the abdomen.
  const crest = path([[ax + 26, ay - 8], [ax + 12, ay - 24], [ax - 14, ay - 22], [ax - 26, ay - 6]] as Pt[]);
  spineRow(p, crest, 6, 11, LIGHT, SPEC);
  for (let i = 0; i < 6; i++) {
    const q = crest[Math.round((i / 5) * (crest.length - 1))]!;
    cellOver(p, q[0], q[1] + 1, DEEP);
  }

  /* --- the cephalothorax under a bevelled carapace shield. */
  blobFront(p, hx, hy, 21, 18, BASE, DEEP, 1.6);
  poly(p, [[hx - 19, hy - 5], [hx - 11, hy - 16], [hx + 8, hy - 18], [hx + 19, hy - 7], [hx + 15, hy + 3], [hx - 15, hy + 4]], LIGHT);
  bevel(p, [[hx - 19, hy - 4], [hx - 7, hy - 14], [hx + 10, hy - 16], [hx + 19, hy - 6]] as Pt[], SPEC, DEEP);
  for (let i = -1; i <= 1; i++) {
    stroke(p, hx + i * 8, hy - 13, hx + i * 11, hy + 2, DEEP);
    stroke(p, hx + i * 8 - 1, hy - 13, hx + i * 11 - 1, hy + 2, HILIGHT);
  }

  /* --- near legs. All four planted and braced: "it does not chase" is in the
     entry, so nothing on this sprite is lifted. */
  const NEAR: Array<[number, number, number, number]> = [
    [hx - 2, G - 64, cx - 18, G],
    [hx + 20, G - 68, cx + 6, G],
    // The two rear knees are parked BELOW the abdomen rather than on it. A
    // knee knuckle is a pale disc, and dropped in the middle of a big mass it
    // reads as a bubble stuck to the animal.
    [ax - 6, G - 22, cx + 34, G],
    [ax + 18, G - 20, cx + 56, G - 1],
  ];
  for (const [kx, ky, fx, fy] of NEAR) walkLeg(p, hx + 12, hy + 4, kx, ky, fx, fy, 12, BASE, true, 2);

  // Spools, armoured over and half the size: still there, still the family
  // feature, but this animal has stopped being delicate about them.
  for (const [ox, oy, sr] of [[22, 12, 6.5], [13, 19, 5] ] as const) {
    const qx = ax + ox, qy = ay + oy;
    blobFront(p, qx, qy, sr, sr * 0.94, LIGHT, DEEP, 1.3);
    for (const q of arc(qx, qy, sr * 0.64, sr * 0.6, 0, Math.PI * 2, 20)) cellOver(p, q[0], q[1], DEEP);
    for (const q of arc(qx, qy, sr * 0.5, sr * 0.46, Math.PI * 0.9, Math.PI * 2, 10)) cellOver(p, q[0], q[1], SPEC);
    cellOver(p, qx, qy, ACCENT_DARK);
  }

  /* --- the jaws. The brief, and the whole animal.

     Two earlier passes failed here for the same reason from opposite ends:
     the first tucked two small shields under the chin, entirely inside the
     outline; the second threw two slabs forward in body colour and they read
     as loading ramps. What was missing both times was the GAP. A jaw is not a
     plate, it is two plates with a mouth between them -- so these are built
     like the crabs' claws, an upper and a lower wedge held a clear fifteen
     cells apart, with interlocking teeth along the edges that face each other.

     The throat goes down first, in the cavity tone, so the gap is filled with
     dark rather than with background: an open maw showing sky through it is a
     hole in the sprite. */
  // From behind you are looking at the backs of two plates, not down a throat.
  // A dark cavity and two fangs left in on the rear sprite read as a face.
  poly(p, [[hx + 8, hy - 8], [hx - 16, hy - 6], [hx - 18, hy + 10], [hx + 8, hy + 10]], p.back ? SHADE : INNER);

  const jawTop: Pt[] = [[hx + 6, hy - 18], [hx - 14, hy - 21], [hx - 32, hy - 18], [hx - 44, hy - 11], [hx - 30, hy - 8], [hx - 10, hy - 7], [hx + 6, hy - 7]];
  polyFront(p, jawTop, BASE, DEEP, 1.5);
  bevel(p, [[hx + 5, hy - 17], [hx - 14, hy - 20], [hx - 32, hy - 17], [hx - 43, hy - 11]] as Pt[], SPEC, DEEP);
  const jawBot: Pt[] = [[hx + 6, hy + 20], [hx - 12, hy + 22], [hx - 30, hy + 19], [hx - 42, hy + 12], [hx - 28, hy + 9], [hx - 8, hy + 9], [hx + 6, hy + 9]];
  polyFront(p, jawBot, LIGHT, DEEP, 1.5);
  bevel(p, [[hx + 5, hy + 10], [hx - 10, hy + 10], [hx - 28, hy + 10], [hx - 41, hy + 12]] as Pt[], SPEC, DEEP);
  for (const q of path([[hx - 41, hy + 13], [hx - 24, hy + 21], [hx - 2, hy + 21]] as Pt[])) cellOver(p, q[0], q[1], DEEP);
  // Interlocking teeth, pointing into the gap from both sides.
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const ux = lerp(hx + 2, hx - 38, t), uy = lerp(hy - 7, hy - 11, t);
    poly(p, [[ux - 3, uy - 2], [ux + 3, uy - 3], [ux, uy + 6]], LIGHT);
    stroke(p, ux - 3, uy - 2, ux, uy + 6, SPEC, false);
    const lx = lerp(hx - 2, hx - 34, t), ly = lerp(hy + 9, hy + 12, t);
    poly(p, [[lx - 3, ly + 2], [lx + 3, ly + 3], [lx, ly - 6]], LIGHT);
    stroke(p, lx - 3, ly + 2, lx, ly - 6, SPEC, false);
  }
  // Ribs across the lower plate, so it is armour and not a flap.
  for (let i = 0; i < 3; i++) {
    const t = 0.24 + i * 0.26;
    stroke(p, lerp(hx + 2, hx - 38, t), lerp(hy + 12, hy + 13, t), lerp(hx, hx - 34, t), lerp(hy + 20, hy + 20, t), DEEP);
    stroke(p, lerp(hx + 2, hx - 38, t) - 1, lerp(hy + 12, hy + 13, t), lerp(hx, hx - 34, t) - 1, lerp(hy + 20, hy + 20, t), SPEC);
  }
  // Two venom fangs hanging into the throat, purple at the point. They cost no
  // silhouette at all -- everything about them is inside the gap.
  for (const [fx, fy, fl] of (p.back ? [] : [[hx - 10, hy - 6, 13], [hx + 1, hy - 6, 10]]) as ReadonlyArray<readonly [number, number, number]>) {
    limbPath(p, [[fx, fy], [fx + 3, fy + fl * 0.6], [fx + 1, fy + fl]] as Pt[], 6, 2, ACCENT_DARK);
    cell(p, fx + 1, fy + fl, ACCENT_LIT);
    cell(p, fx + 1, fy + fl - 1, ACCENT);
    stroke(p, fx - 2, fy + 2, fx - 1, fy + fl - 2, ACCENT);
  }

  if (p.back) { p.face(hx - 2, hy - 4, 20); return; }

  /* --- the face. Small, hard, jammed under the carapace lip and right above
     the maw: the eyes of a thing that waits. Six ocelli again, so the head
     still reads as spinnet's grown up, but the two big ones are narrow almonds
     rather than domes. */
  eye(p, hx - 9, hy - 5, 4.4, 'angry', { side: -1, iris: ACCENT });
  eye(p, hx + 3, hy - 7, 3.8, 'angry', { side: 1, iris: ACCENT });
  p.face(hx - 2, hy - 4, 20);
  for (const [ox, oy, orr] of [[-15, 1, 2.2], [-8, 3, 2.4], [-1, 2, 2.0], [5, 0, 1.8]] as const) {
    blob(p, hx + ox, hy + oy, orr + 0.9, orr + 0.9, ACCENT_DARK);
    blob(p, hx + ox, hy + oy, orr, orr, EYE_DARK);
    cell(p, hx + ox - orr * 0.4, hy + oy - orr * 0.4, EYE_WHITE);
  }
}

/* =========================================================== tallowmoth */

/**
 * "Pale broad-winged moth with luminous wing panels."
 *
 * Perched, wings spread flat and *asymmetrically*: the near pair thrown forward
 * and down, the far pair swept up and back. A moth with matched wings is a
 * specimen pinned in a case; the offset is what makes this one alive and on a
 * wall.
 *
 * Everything luminous is painted in the accent ramp, which for this species is
 * gold against a cream body -- so the panels have to be ringed in the ink tone
 * to read at all. Both the automatic passes are off: the chitin trait rules
 * armour seams straight across the wings and the plate texture bands them.
 */
function tallowmoth(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();
  p.noTexture();

  const tx = cx - 2, ty = G - 56;      // thorax
  const hx = cx - 15, hy = G - 68;     // head

  /** One wing: a rayed membrane with a scalloped free edge and lit panels. */
  const wing = (root: Pt, ctrl: Pt[], tone: number, ray: number, lobes: number, panels: Array<[number, number, number]>): void => {
    const edge = path(ctrl);
    // Scallop the free edge by pushing every point in or out along the line
    // back to the root. A moth's trailing edge is lobed; a clean arc is a leaf.
    const lobed: Pt[] = edge.map((q, i) => {
      const t = i / Math.max(1, edge.length - 1);
      // Shallow. At nine per cent the edge came out as a starburst and the
      // whole wing read as a chrysanthemum; a moth's margin is lobed, not
      // rayed, and five per cent is the difference.
      const k = 1 + 0.07 * Math.sin(t * Math.PI * lobes * 2 - Math.PI / 2);
      return [root[0] + (q[0] - root[0]) * k, root[1] + (q[1] - root[1]) * k] as Pt;
    });
    polyFront(p, [root, ...lobed], tone, DEEP, 1.2);
    // Veins, fanning from the root and stopping short of the edge. Four, not
    // seven, and each is a dark line with a companion only one step lighter --
    // a lit run beside every vein turned the membrane into a pinwheel.
    for (let i = 0; i < 4; i++) {
      const q = lobed[Math.round(((i + 0.5) / 4) * (lobed.length - 1))]!;
      stroke(p, lerp(root[0], q[0], 0.16), lerp(root[1], q[1], 0.16), lerp(root[0], q[0], 0.9), lerp(root[1], q[1], 0.9), ray);
      stroke(p, lerp(root[0], q[0], 0.16) - 1, lerp(root[1], q[1], 0.16), lerp(root[0], q[0], 0.9) - 1, lerp(root[1], q[1], 0.9), tone === SHADE ? BASE : tone);
    }
    // The panels: a dark ring, a coloured field, a hot core. Three tones or the
    // window is a smudge.
    for (const [px, py, pr] of panels) {
      // Lozenges, not discs: a round gold blob on a cream wing reads as a
      // fried egg, and three of them read as breakfast. A window stretched
      // along the wing's own direction reads as a lit panel in a membrane.
      const dx = px - root[0], dy = py - root[1], d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d;
      const lozenge = (s: number, tone: number): void => {
        poly(p, [[px + ux * pr * 1.7 * s, py + uy * pr * 1.7 * s], [px - uy * pr * 0.85 * s, py + ux * pr * 0.85 * s],
          [px - ux * pr * 1.7 * s, py - uy * pr * 1.7 * s], [px + uy * pr * 0.85 * s, py - ux * pr * 0.85 * s]], tone);
      };
      lozenge(1.24, ACCENT_DARK);
      lozenge(1.0, ACCENT);
      lozenge(0.48, ACCENT_LIT);
      cellOver(p, px - pr * 0.3, py - pr * 0.4, SPEC);
    }
    // Dusting along the free edge: a moth's margin is powder, not a line.
    for (let i = 0; i < lobed.length; i += 4) {
      cellOver(p, lobed[i]![0], lobed[i]![1], i % 8 === 0 ? (tone === SHADE ? BASE : SPEC) : ACCENT_DARK);
    }
  };

  /* --- far wing pair, swept up and back over the right shoulder. */
  wing([tx + 4, ty - 2],
    [[tx + 12, ty - 24], [tx + 34, ty - 38], [tx + 54, ty - 26], [tx + 50, ty - 4], [tx + 28, ty + 8]] as Pt[],
    SHADE, ACCENT_DARK, 3, [[tx + 33, ty - 20, 6], [tx + 43, ty - 8, 3.6]]);
  // The far wing gets an apex too, so the top of the silhouette is two points
  // with a notch between them rather than one continuous dome.
  poly(p, [[tx + 34, ty - 36], [tx + 62, ty - 30], [tx + 52, ty - 20]], SHADE);
  stroke(p, tx + 35, ty - 35, tx + 61, ty - 30, BASE, false);

  /* --- legs, before the near wing so the wing crosses their tops. Thin and
     spread: a perched moth grips with all six and none of them is straight. */
  for (const fx of [cx - 24, cx - 4, cx + 16]) {
    walkLeg(p, tx + 2, ty + 8, fx + 8, ty + 20, fx, G - 1, 5, SHADE, false, 1);
  }
  for (const fx of [cx - 32, cx - 12, cx + 8]) {
    walkLeg(p, tx - 2, ty + 10, fx + 10, ty + 24, fx, G, 5.5, BASE, true, 1);
  }

  /* --- the abdomen: a ringed cone dropping back and down out of the fur, its
     last two segments clear of the near wing so the body has an end. */
  const abd = path([[tx + 2, ty + 4], [tx + 14, ty + 18], [tx + 24, ty + 30]] as Pt[]);
  limbPath(p, abd, 17, 7, BASE, { front: true });
  rings(p, abd, 4, 8, ACCENT_DARK, LIGHT);
  blob(p, tx + 24, ty + 31, 4, 4, LIGHT);

  /* --- near wing pair: forward, down and biggest. Two lobes, forewing over
     hindwing, with a hard seam between them so they read as two surfaces. */
  wing([tx - 6, ty + 6],
    [[tx - 16, ty + 24], [tx - 36, ty + 30], [tx - 46, ty + 16], [tx - 42, ty + 2]] as Pt[],
    BASE, ACCENT_DARK, 4, [[tx - 30, ty + 18, 4.4]]);
  // The forewing runs out to a POINT. A wing that ends in a clean arc is a
  // petal; the apex is what makes a moth silhouette read as a moth, and the
  // whole left end of this sprite is built on it.
  wing([tx - 8, ty - 6],
    [[tx - 18, ty - 28], [tx - 44, ty - 34], [tx - 66, ty - 18], [tx - 58, ty + 8], [tx - 32, ty + 16]] as Pt[],
    LIGHT, ACCENT_DARK, 4, [[tx - 42, ty - 14, 6.5], [tx - 48, ty + 2, 4.0]]);
  poly(p, [[tx - 42, ty - 32], [tx - 70, ty - 20], [tx - 56, ty - 12]], LIGHT);
  stroke(p, tx - 43, ty - 31, tx - 69, ty - 20, SPEC, false);
  stroke(p, tx - 68, ty - 19, tx - 56, ty - 13, ACCENT_DARK, false);

  /* --- the thorax: a fur ball, and the LAST big mass down.

     Drawn before the wings it vanished: a pale fluffy lump behind two pale
     membranes is a pale membrane, and the wing veins fanned out across it like
     whiskers. In a three-quarter view the thorax is in front of both wing roots
     anyway, so putting it on top is both the correct order and the only one
     that gives this animal a body. */
  blobFront(p, tx, ty, 14, 12.5, LIGHT, DEEP, 2);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.72 + (i / 8) * 1.6);
    tuft(p, tx + Math.cos(a) * 11, ty + Math.sin(a) * 10, 6.5, a, 0.5, i % 2 ? LIGHT : BASE);
  }
  blob(p, tx - 4, ty - 4, 7, 5.5, SPEC);
  blob(p, tx - 4, ty - 4, 5, 3.8, HILIGHT);

  /* --- the head, with the fur collar over its nape. */
  blobFront(p, hx, hy, 10, 9, LIGHT, DEEP, 2);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.1 + (i / 4) * 0.8);
    tuft(p, hx + Math.cos(a) * 8, hy + Math.sin(a) * 7.5, 5, a, 0.5, BASE);
  }

  /* --- the antennae. Plumose: a shaft with comb teeth on both sides, swept up
     and back over the wings. The second signature, and the reason the head end
     of the silhouette is not a bump. */
  /* Drawn as a blade, not as a shaft with hairs on it. Comb teeth an outline
     pass can see are one cell wide with air on both sides, so each of them
     collects two cells of ink and the whole antenna fuses into a black bar.
     A solid almond with the comb *ruled into* it keeps the plume and costs
     one outline for the pair.

     `leaf` is exactly that shape and brings a midrib and side veins with it,
     which is what a feathered antenna is made of anyway. */
  for (const [rx, ry, len, ang, wide, tone] of [
    [hx + 5, hy - 6, 27, Math.PI * 1.72, 4.0, SHADE],
    [hx - 2, hy - 8, 32, Math.PI * 1.60, 4.6, LIGHT],
  ] as const) {
    leaf(p, rx, ry, len, ang, wide, tone);
    // Notch the trailing edge so the blade reads as comb rather than as blade.
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    for (let i = 1; i < 9; i++) {
      const t = i / 9, w = Math.sin(t * Math.PI) ** 0.72 * wide;
      cellOver(p, rx + ux * len * t - nx * w, ry + uy * len * t - ny * w, ACCENT_DARK);
      cellOver(p, rx + ux * len * t - nx * (w - 1), ry + uy * len * t - ny * (w - 1), ACCENT_DARK);
    }
    // A hard root knuckle, so it grows out of the head.
    blob(p, rx, ry, 3, 2.6, ACCENT_DARK);
    cellOver(p, rx - 1, ry - 1, ACCENT_LIT);
  }

  if (p.back) { p.face(hx, hy, 11); return; }

  /* --- the face. Two enormous glossy domes with a gold ring inside them: the
     only warm thing on a cream animal, and the reason it reads as drawn to a
     lamp rather than as a scrap of paper. */
  // Set well apart and at obviously different sizes. Two matched dark rings
  // side by side on a small pale head read as a pair of spectacles, which is
  // exactly what the first pass looked like.
  eye(p, hx - 7, hy + 2, 6.6, 'round', { side: -1, iris: ACCENT, sclera: ACCENT_DARK });
  eye(p, hx + 8, hy - 1, 4.6, 'round', { side: 1, iris: ACCENT, sclera: ACCENT_DARK });
  p.face(hx, hy, 11);
  // The proboscis, coiled under the face. Two turns, small, in the ink tone.
  for (const q of arc(hx - 6, hy + 12, 4.2, 4.2, -Math.PI * 0.4, Math.PI * 1.5, 22)) cell(p, q[0], q[1], ACCENT_DARK);
  for (const q of arc(hx - 6, hy + 12, 2.2, 2.2, 0, Math.PI * 1.6, 12)) cell(p, q[0], q[1], ACCENT);
  cellOver(p, hx - 9, hy + 10, ACCENT_LIT);
}

/* ============================================================== pinchel */

/**
 * "Squat armoured crab with one oversized claw."
 *
 * The claw is the animal, so it is held straight up over the shell where
 * nothing can crowd it -- a fiddler crab waving, which is both what the species
 * does and the only way to draw an oversized claw that still reads as oversized
 * once the rest of the sprite is around it. Held out sideways it merely makes
 * the creature wide.
 *
 * The body underneath is deliberately small and pressed low, and the other claw
 * is a stub near the floor, so the two are never mistaken for a pair.
 */
function pinchel(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The stock tide pass plants a rayed dorsal fin on the highest thing behind
  // the face. On a crab that is the middle of its own shell.
  p.noTypeTraits();

  const sx = cx + 4, sy = G - 40;

  /* --- far legs, in the recessed tone, splayed out behind the shell.

     The hips are spread along the rim rather than stacked on one point, and
     every shin leans. Six legs radiating from a single hip under the middle of
     the shell came out as an umbrella, and shins dropping straight from knee
     to floor came out as the legs of a table. Both were true of earlier passes
     and neither was visible in the code. */
  for (const [hxx, kx, ky, fx] of [[sx - 18, sx - 26, sy + 2, cx - 38], [sx - 4, sx - 10, sy + 12, cx - 16],
    [sx + 12, sx + 22, sy + 4, cx + 28], [sx + 22, sx + 32, sy + 8, cx + 44]] as const) {
    walkLeg(p, hxx, sy + 6, kx, ky, fx, G - 1, 7, SHADE, false, 2);
  }

  /* --- the carapace: wide, low, and squared off at the front, with a lipped
     rim all the way round. A crab shell is a plate with an edge, never a dome. */
  const shellPts: Pt[] = [
    [sx - 33, sy - 2], [sx - 27, sy - 13], [sx - 8, sy - 18], [sx + 16, sy - 17],
    [sx + 30, sy - 7], [sx + 33, sy + 4], [sx + 12, sy + 12], [sx - 22, sy + 10],
  ];
  polyFront(p, shellPts, BASE, DEEP, 1.6);
  /* A shell is a PLATE: a flat lit top face taking most of its area, a hard
     corner where it turns down, and one thin dark gutter under the rim.

     The first pass gave the pale face a third of the shell and let the rest
     fall to the shadow band, and the whole lower half of the animal came out
     as one dark red slab with legs coming out of it. The top face is now most
     of what you see, which is also what looking slightly down at a crab is
     actually like. */
  poly(p, [[sx - 30, sy - 1], [sx - 24, sy - 12], [sx - 6, sy - 16], [sx + 15, sy - 15],
    [sx + 27, sy - 6], [sx + 26, sy + 1], [sx + 6, sy + 6], [sx - 20, sy + 4]], LIGHT);
  bevel(p, [[sx - 29, sy - 2], [sx - 22, sy - 12], [sx + 12, sy - 15], [sx + 28, sy - 6]] as Pt[], SPEC, DEEP);
  for (const q of path([[sx - 29, sy + 1], [sx - 6, sy + 6], [sx + 27, sy + 1]] as Pt[])) {
    cellOver(p, q[0], q[1] - 1, SPEC);
    cellOver(p, q[0], q[1], DEEP);
  }
  // A reflected-light lip along the very bottom of the rim, so the rim has a
  // thickness and the legs come out of an animal rather than out of a shadow.
  for (const q of path([[sx - 30, sy + 2], [sx - 6, sy + 11], [sx + 30, sy + 3]] as Pt[])) {
    cellOver(p, q[0], q[1], LIGHT);
  }
  // Front rim teeth: four notches along the leading edge. Small, and worth
  // more than any amount of shading for saying "armoured".
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    const qx = lerp(sx - 32, sx - 12, t), qy = lerp(sy - 3, sy - 17, t);
    poly(p, [[qx + 3, qy + 4], [qx + 5, qy - 2], [qx - 5, qy - 3]], LIGHT);
    stroke(p, qx + 3, qy + 4, qx - 5, qy - 3, SPEC, false);
    cellOver(p, qx + 3, qy, DEEP);
  }
  // Weed. The species picks over the tideline and it shows: three olive
  // blotches with a lit crown, plus grit across the shell.
  for (const [wx, wy, wr] of [[sx + 12, sy - 8, 6], [sx - 16, sy + 2, 4.5], [sx + 22, sy + 2, 3.6]] as const) {
    blob(p, wx, wy, wr, wr * 0.7, ACCENT);
    blob(p, wx - wr * 0.3, wy - wr * 0.25, wr * 0.5, wr * 0.32, ACCENT_LIT);
  }
  speckle(p, sx - 24, sy - 12, sx + 24, sy + 4, 0.035, ACCENT_DARK);

  /* --- near legs, planted, carrying the animal's weight forward. Their knees
     are kept OUTSIDE the shell outline: parked inside it the pale knuckle
     blobs came out as four bubbles floating on the carapace. */
  for (const [hxx, kx, ky, fx] of [[sx - 22, sx - 34, sy + 6, cx - 30], [sx - 6, sx - 14, sy + 18, cx - 4],
    [sx + 20, sx + 34, sy + 8, cx + 34]] as const) {
    walkLeg(p, hxx, sy + 9, kx, ky, fx, G, 8.5, BASE, true, 2);
  }

  /* --- the small claw: low, forward, and half the size, so the big one has
     something to be twice as big as. */
  limbPath(p, [[sx + 20, sy + 8], [sx + 30, sy + 14]] as Pt[], 10, 9, BASE, { front: true });
  chela(p, sx + 30, sy + 15, 0.22, 23, { tone: BASE, gape: 0.5, front: true });

  /* --- the big claw. Up, and clear of everything: the merus swings down and
     out to a low elbow, and the chela stands vertically off it, gaping.

     It is drawn last on the near side and reaches nearly to the top of the
     frame on purpose. "Oversized" is not a texture, it is a proportion, and it
     only exists relative to the body it is attached to. */
  limbPath(p, [[sx - 22, sy + 6], [sx - 32, sy + 12], [sx - 38, sy + 6]] as Pt[], 13, 11, BASE, { front: true });
  crease(p, sx - 32, sy + 11, 6.5);
  chela(p, sx - 40, sy + 5, -Math.PI * 0.58, 50, { tone: BASE, gape: 0.40, front: true, weed: true });

  /* --- mouthparts, under the front rim. */
  poly(p, [[sx - 20, sy + 8], [sx - 6, sy + 9], [sx - 7, sy + 17], [sx - 19, sy + 16]], SHADE);
  for (let i = 0; i < 3; i++) {
    stroke(p, sx - 19 + i * 4.5, sy + 9, sx - 19 + i * 4.5, sy + 16, DEEP);
    stroke(p, sx - 20 + i * 4.5, sy + 9, sx - 20 + i * 4.5, sy + 16, LIGHT);
  }

  /* --- the eyestalks. Short, upright and set wide on the rim. */
  stalkEye(p, sx - 13, sy - 12, sx - 16, sy - 25, 4.2, SHADE, p.back);
  stalkEye(p, sx + 3, sy - 14, sx + 8, sy - 28, 4.6, BASE, p.back);
  p.face(sx - 4, sy - 24, 16);
}

/* ========================================================== clatterclaw */

/**
 * "Broad reef crab with paired shearing claws."
 *
 * Where pinchel is squat and lopsided, this one stands up. The legs are half
 * again as long and braced, the carapace is an angular slab with spines down
 * its rim rather than a smooth oval, and both claws are out: the near one low
 * and open in front of the body, the far one cocked up and closed above the
 * shoulder. That is a guard, and it is the only pose in the group with two
 * limbs doing different jobs at once.
 */
function clatterclaw(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const sx = cx + 2, sy = G - 58;

  /* --- far legs. Long, straight-braced, and stepped so the eight do not
     stack. */
  for (const [kx, ky, fx] of [[sx - 30, sy + 6, cx - 44], [sx - 14, sy + 18, cx - 20], [sx + 20, sy + 10, cx + 22], [sx + 34, sy + 16, cx + 46]] as const) {
    walkLeg(p, sx - 2, sy + 10, kx, ky, fx, G - 1, 8.5, SHADE, false, 2);
  }

  /* --- the far claw, thrown up and out over the right shoulder. Smaller,
     darker and only half open, where the near one is bigger and gaping: two
     claws at the same size and the same angle read as a symmetrical logo, and
     the whole point of this species is that it has two of them. */
  limbPath(p, [[sx + 20, sy + 4], [sx + 28, sy - 4], [sx + 30, sy - 12]] as Pt[], 13, 11, SHADE, { front: true });
  chela(p, sx + 30, sy - 12, -Math.PI * 0.33, 27, { tone: SHADE, gape: 0.34, front: true });

  /* --- the carapace: an angular slab, wider at the front, with a spined rim.
     Straight edges and corners are the whole difference between this and
     pinchel's rounded shell. */
  const shellPts: Pt[] = [
    [sx - 36, sy + 3], [sx - 30, sy - 12], [sx - 12, sy - 20], [sx + 14, sy - 19],
    [sx + 32, sy - 8], [sx + 36, sy + 6], [sx + 14, sy + 19], [sx - 18, sy + 18],
  ];
  polyFront(p, shellPts, BASE, DEEP, 1.6);
  // The lit top face takes most of the slab, with one hard corner where it
  // turns down and a thin dark rim under it. Given only the top third, as the
  // first pass had it, everything below fell to one flat dark band and the
  // legs came out of a shadow.
  poly(p, [[sx - 32, sy - 3], [sx - 26, sy - 15], [sx - 6, sy - 19], [sx + 14, sy - 18], [sx + 30, sy - 8],
    [sx + 28, sy + 2], [sx + 8, sy + 8], [sx - 20, sy + 6]], LIGHT);
  bevel(p, [[sx - 30, sy - 10], [sx - 10, sy - 18], [sx + 14, sy - 17], [sx + 32, sy - 7]] as Pt[], SPEC, DEEP);
  for (const q of path([[sx - 31, sy + 3], [sx - 6, sy + 9], [sx + 29, sy + 2]] as Pt[])) {
    cellOver(p, q[0], q[1] - 1, SPEC);
    cellOver(p, q[0], q[1], DEEP);
  }
  for (const q of path([[sx - 33, sy + 5], [sx - 6, sy + 16], [sx + 33, sy + 5]] as Pt[])) cellOver(p, q[0], q[1], LIGHT);
  // Two ridges running back over the crown of the slab.
  for (const dy of [-6, 2]) {
    stroke(p, sx - 24, sy - 4 + dy, sx + 26, sy - 1 + dy, DEEP);
    stroke(p, sx - 24, sy - 5 + dy, sx + 26, sy - 2 + dy, SPEC);
  }
  // Rim spines. Six down the near edge, three forward off the corners: this is
  // where "reef" lives and it costs almost nothing.
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const bx = lerp(sx - 34, sx + 20, t), by = lerp(sy + 8, sy + 19, t);
    poly(p, [[bx - 4, by - 2], [bx + 3, by - 3], [bx - 1 - t * 2, by + 7]], LIGHT);
    stroke(p, bx - 4, by - 2, bx - 1 - t * 2, by + 7, SPEC, false);
    cellOver(p, bx + 2, by, DEEP);
  }
  for (const [bx, by, dx, dy] of [[sx - 34, sy - 2, -10, -3], [sx - 30, sy - 13, -8, -6], [sx + 33, sy - 5, 9, -2]] as const) {
    poly(p, [[bx, by - 3], [bx, by + 3], [bx + dx, by + dy]], LIGHT);
    stroke(p, bx, by - 3, bx + dx, by + dy, SPEC, false);
  }
  // Weed and barnacles: the tideline again, and the visible link to pinchel.
  for (const [wx, wy, wr] of [[sx + 16, sy - 10, 6.5], [sx - 20, sy + 4, 5], [sx + 26, sy + 4, 4]] as const) {
    blob(p, wx, wy, wr, wr * 0.66, ACCENT);
    blob(p, wx - wr * 0.3, wy - wr * 0.25, wr * 0.5, wr * 0.3, ACCENT_LIT);
  }
  for (const [bx, by] of [[sx - 8, sy + 6], [sx + 6, sy + 11]] as const) {
    blob(p, bx, by, 3.4, 2.6, LIGHT);
    blob(p, bx, by, 1.6, 1.2, INNER);
    cellOver(p, bx - 2, by - 2, SPEC);
  }
  speckle(p, sx - 30, sy - 16, sx + 30, sy + 14, 0.05, ACCENT_DARK);

  /* --- near legs, planted wide and taking the load. */
  for (const [kx, ky, fx] of [[sx - 38, sy + 14, cx - 32], [sx - 16, sy + 28, cx - 6], [sx + 38, sy + 16, cx + 36]] as const) {
    walkLeg(p, sx, sy + 14, kx, ky, fx, G, 10, BASE, true, 2);
  }

  /* --- mouthfield: a bank of plates under the front rim. */
  poly(p, [[sx - 22, sy + 10], [sx - 4, sy + 12], [sx - 5, sy + 22], [sx - 21, sy + 20]], SHADE);
  for (let i = 0; i < 4; i++) {
    stroke(p, sx - 21 + i * 4.6, sy + 11, sx - 21 + i * 4.6, sy + 21, DEEP);
    stroke(p, sx - 22 + i * 4.6, sy + 11, sx - 22 + i * 4.6, sy + 21, LIGHT);
  }

  /* --- the near claw: up and out to the left, gaping wide. With the far one
     cocked over the other shoulder the animal makes a V, which is the display
     a crab actually gives and a silhouette pinchel -- one claw up, one stub
     down at the floor -- cannot be confused with. */
  limbPath(p, [[sx - 22, sy + 8], [sx - 32, sy + 2], [sx - 34, sy - 6]] as Pt[], 15, 13, BASE, { front: true });
  crease(p, sx - 32, sy + 2, 7.5);
  chela(p, sx - 34, sy - 7, -Math.PI * 0.68, 32, { tone: BASE, gape: 0.50, front: true, weed: true });

  /* --- brow horns over the eye notches, then the stalks. Longer than
     pinchel's and angled out, so the two crabs read as related but not as one
     drawing at two sizes. */
  /* Two horns on the FRONT CORNERS of the carapace, well outboard of the eye
     stalks. Set between the stalks they were half hidden behind them and what
     showed was a green dash across each stalk that read as dirt -- and a bone
     brow laid over the top of the shell came out as a green stripe. Ornament
     near a face is the easiest thing in this file to get wrong. */
  for (const [bx, by, dx, dy] of [[sx - 28, sy - 14, -11, -7], [sx + 26, sy - 13, 11, -6]] as const) {
    poly(p, [[bx - 3, by + 3], [bx + 3, by + 2], [bx + dx, by + dy]], LIGHT);
    stroke(p, bx - 3, by + 3, bx + dx, by + dy, SPEC, false);
    cellOver(p, bx + 2, by + 1, DEEP);
  }
  stalkEye(p, sx - 14, sy - 15, sx - 22, sy - 33, 4.4, SHADE, p.back);
  stalkEye(p, sx + 2, sy - 17, sx + 10, sy - 36, 4.8, BASE, p.back);
  p.face(sx - 6, sy - 32, 18);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  nettlebug,
  spinnet,
  weaverjaw,
  tallowmoth,
  pinchel,
  clatterclaw,
};
