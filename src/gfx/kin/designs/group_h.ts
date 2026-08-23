/**
 * Design group H -- the spark line, the pit lamp, and the two small fish.
 *
 *   fizzlet     a bristling ball of charged fur hopping forward, two wire
 *               filaments trailing behind it with a bead of light on each.
 *   voltwick    the same charge grown legs: a lean forward-leaning biped with
 *               a swept crest of filaments and a forked tail, both beaded.
 *   lantric     a hanging iron lantern, swinging on its ring, with a coiled
 *               filament burning behind its glass and two long hook arms.
 *   rillfry     a small fish caught mid-dart, body kinked into an S, one
 *               pectoral fanned out like a hand, split tail flicked over.
 *   currentail  the same fish grown long and streamlined, nosing upstream with
 *               three ribbons streaming off its tail.
 *
 * Two evolution lines and a loner. The lines share a *feature*, not a drawing:
 * fizzlet and voltwick both end every filament in a bead of light and both tape
 * the same pale band of insulation round it, but one is a ball and the other is
 * a biped. Rillfry and currentail share a lit lateral line, a countershaded
 * back and dark navy fins, but one is a stubby fry with an oversized head and
 * the other is a blade with a sail and three ribbons.
 *
 * One warning that cost this file two rebuilds: READ THE PALETTE. The accent is
 * `design.palette[3]`, and for these five it is never the colour you would
 * guess. Both fish declare a gold in their fifth slot which is never used at
 * all -- the factory takes whichever declared colour is darkest as the ink, and
 * their accent is a near-black navy, so their fins are dark and their bright
 * marks have to come out of LIGHT and SPEC. Both spark stages declare a
 * near-black olive, so their wires are genuinely black wires and the light on
 * them is the bead. Only Lantric's accent is what it looks like: steel.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, EYE_DARK, EYE_WHITE, HILIGHT,
  INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, bellyPlate, blob, blobFront, cell, cellOver, crease, eye, fin, hand, lerp, limbPath,
  mane, mouthLine, nostril, offsetPath, path, paw, plate, poly, polyFront, rect, seamPath,
  stroke, tuft, whiskers,
  type Pen, type Pt,
} from '../parts.js';

/* ------------------------------------------------------------ shared */

/**
 * A bead of light on the end of a filament.
 *
 * Both spark evolutions hang one of these off every wire they own, and it is
 * the single thing that makes a black filament read as live rather than as a
 * loose thread. The bead is LIGHT rather than ACCENT_LIT on purpose: this
 * palette declares a near-black olive as its accent, so the bright end of that
 * ramp is a dirty grey and would put out the light rather than carry it.
 */
function bead(p: Pen, x: number, y: number, r: number): void {
  blob(p, x, y, r + 1, r + 1, ACCENT_DARK);
  blob(p, x, y, r, r, LIGHT);
  blob(p, x - r * 0.3, y - r * 0.3, r * 0.5, r * 0.5, SPEC);
  cell(p, x + r * 0.55, y + r * 0.5, ACCENT);
}

/* ============================================================= fizzlet */

/**
 * "Small bristling ball with two trailing filaments."
 *
 * A loose charge that sticks to fences and will not be removed politely. So it
 * is not sitting: it is mid-hop, leaning forward with its near foot planted and
 * its far foot swinging clear of the floor, and every hair on it is standing up
 * and swept back by its own motion.
 *
 * The sweep is the whole design. A ball with even spikes all round is a
 * chestnut; the same ball with short bristles on the face and long ones combed
 * back off the crown has a direction, and a direction is a pose.
 *
 * Drawn small -- around sixty cells tall against Voltwick's hundred -- because
 * the fit pass bottom-aligns rather than fills, so a fry that is drawn small
 * stays small next to what it grows into.
 */
function fizzlet(p: Pen): void {
  const G = p.ground, cx = p.cx;

  // The stock spark pass etches a zigzag across the body mass and grows more
  // fur off the lower contour. On a creature that is already nothing but fur
  // the second half is noise, and the crackle lands on top of the bands.
  p.noTypeTraits();

  const bx = cx - 4, by = G - 34;
  const RX = 22, RY = 20;
  // Everything is combed towards this direction: back over the shoulder.
  const SWEEP = -0.36;

  /** One clump of guard hairs standing off the ball at angle `a`. */
  const bristle = (a: number, len: number, tone: number, grow = 0.9): void => {
    const ox = bx + Math.cos(a) * RX * grow, oy = by + Math.sin(a) * RY * grow;
    tuft(p, ox, oy, len, a, 0.22, tone);
  };
  /**
   * Long where the coat is swept back, short over the face.
   *
   * The ratio is what carries the pose: at three to one the animal is clearly
   * moving, and the first version -- two to one, with a random jitter on top --
   * came out as an even fuzz with no direction in it at all.
   */
  const lenAt = (a: number): number => {
    const d = Math.cos(a - SWEEP);
    return 6 + 13 * Math.max(0, d) ** 1.35;
  };

  /* --- the two filaments. Down first so the ball covers their roots: they are
     wires growing out of the animal, not antennae balanced on it.

     They are drawn in the accent, which this species declares as a near-black
     olive -- so the wire is genuinely a black wire, and the light it carries is
     the bead on the end of it. */
  const fil1: Pt[] = [[bx + 10, by - 12], [bx + 28, by - 26], [bx + 44, by - 26], [bx + 50, by - 40]];
  const fil2: Pt[] = [[bx + 12, by + 4], [bx + 34, by + 8], [bx + 50, by + 2], [bx + 58, by - 8]];
  for (const f of [fil1, fil2]) {
    const d = path(f);
    limbPath(p, d, 6, 3.4, ACCENT, { lit: ACCENT_LIT, dark: ACCENT_DARK });
    // Two pale bands of insulation taped round each wire. Fizzlet is "the Loose
    // Charge"; this is the cheapest way to say the charge is wrapped in
    // something, and it is the same mark Voltwick wears on its crest, so the
    // two of them are visibly the same animal without being the same shape.
    for (const t of [0.34, 0.62]) {
      const i = Math.round(t * (d.length - 1));
      const q = d[i]!, r = d[Math.min(d.length - 1, i + 3)]!;
      const nx = -(r[1] - q[1]), ny = r[0] - q[0], m = Math.hypot(nx, ny) || 1;
      for (const k of [-1, 0, 1]) {
        stroke(p, q[0] - (nx / m) * 4 + k, q[1] - (ny / m) * 4, q[0] + (nx / m) * 4 + k, q[1] + (ny / m) * 4,
          k === 1 ? ACCENT_DARK : LIGHT);
      }
    }
    bead(p, f[f.length - 1]![0], f[f.length - 1]![1], 4.6);
  }

  /* --- the far half of the coat: longer, darker, and offset half a clump so it
     fills the gaps the near hairs leave. */
  const N = 11;
  // Consecutive clumps are deliberately unequal. Equal ones at this density
  // overlap into a solid fan with slots cut in it -- which is exactly what the
  // first pass looked like -- and the eye reads that as a wing, not as hair.
  const vary = (i: number): number => [1.16, 0.58, 0.92][i % 3]!;
  for (let i = 0; i < N; i++) {
    const a = ((i + 0.5) / N) * Math.PI * 2;
    if (Math.abs(Math.sin(a) - 1) < 0.14) continue;       // leave the floor clear
    bristle(a, lenAt(a) * 1.15 * vary(i + 1), SHADE, 0.82);
  }

  /* --- the ball. Leaning forward: the mass is pushed down and to the left of
     the geometric centre, which is what a body does when it is going somewhere. */
  blob(p, bx, by, RX, RY, BASE);
  blobFront(p, bx - 7, by + 5, 15, 14, BASE);
  bellyPlate(p, bx - 8, by + 11, 12, 7, 2);

  /* --- feet. Two stubby paws well apart, the near one planted forward and the
     far one just off the floor behind: three-quarters of a hop, which is more
     animal than any amount of extra fur would have been. */
  limbPath(p, [[bx + 8, by + 13], [bx + 14, G - 12]], 11, 9, SHADE);
  paw(p, bx + 15, G - 4, 6.5, { tone: SHADE, toes: 3, claws: false });
  limbPath(p, [[bx - 9, by + 12], [bx - 13, G - 8]], 12, 10, BASE, { front: true });
  paw(p, bx - 14, G, 8, { tone: BASE, toes: 3, claws: false });

  /* --- the near half of the coat, over the body. */
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    if (Math.abs(Math.sin(a) - 1) < 0.2) continue;
    // Tone by which way the hair points, not by where it sits on the coat: the
    // light comes from the upper left and a clump leaning into it catches it
    // whether it grows off the crown or off the rump.
    const up = Math.sin(a) < -0.35, left = Math.cos(a) < 0;
    bristle(a, lenAt(a) * vary(i), up && left ? LIGHT : !up && !left ? SHADE : BASE);
  }

  /* --- a scatter of dark flecks over the rump, where the coat is dirtiest.
     Three cells of texture, and they stop the back half being a plain field of
     yellow now that the band has moved onto the wires. */
  for (const [fx, fy] of [[10, -6], [15, 2], [6, 9], [13, 10]] as const) {
    cellOver(p, bx + fx, by + fy, ACCENT);
    cellOver(p, bx + fx + 1, by + fy, ACCENT);
    cellOver(p, bx + fx, by + fy - 1, ACCENT_LIT);
  }

  if (p.back) { p.face(bx - 4, by - 4, 20); return; }

  /* --- the face. Enormous, round and wet, sitting low and forward on a body
     that is mostly hair: this is the smallest thing on the roster and it is
     meant to be liked. */
  // A pale muzzle pad first, so the mouth has something to be cut into and the
  // face is not one flat field of coat.
  blob(p, bx - 9, by + 6, 11, 7, LIGHT);
  eye(p, bx - 13, by - 5, 6.4, 'round', { side: -1, iris: ACCENT_DARK });
  eye(p, bx + 2, by - 7, 5.4, 'round', { side: 1, iris: ACCENT_DARK });
  p.face(bx - 4, by - 5, 20);

  // The grin: a shallow open crescent rather than a slot, with one tooth and a
  // lit upper lip. A rectangle of cavity tone here reads as a wound.
  poly(p, [[bx - 16, by + 4], [bx - 9, by + 3], [bx - 3, by + 5],
    [bx - 6, by + 11], [bx - 13, by + 11]], INNER);
  poly(p, [[bx - 13, by + 8], [bx - 6, by + 8], [bx - 8, by + 11], [bx - 12, by + 11]], ACCENT_DARK);
  for (let k = 0; k < 2; k++) { cell(p, bx - 12 + k, by + 4, LIGHT); cell(p, bx - 12 + k, by + 5, LIGHT); }
  stroke(p, bx - 17, by + 3, bx - 3, by + 4, ACCENT_LIT);
  nostril(p, bx - 15, by - 1, -1);
  whiskers(p, bx - 19, by + 1, 2, -1, 10, 0.6, ACCENT);
}

/* ============================================================ voltwick */

/**
 * "Lean upright creature with a filament crest and forked tail."
 *
 * The charge with legs under it. Everything Fizzlet does in a ball this does in
 * a line: it stands upright on two backward-bending legs, leans hard forward
 * over the front one, and carries the crest and the tail as two separate
 * bunches of filament with the same beads on them.
 *
 * The lean is the pose and the fork is the signature. The tail splits into two
 * prongs at a real branch point, well clear of the rump, so the notch between
 * them survives the outline pass -- a fork that opens two cells is a bar.
 */
function voltwick(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const hipX = cx + 8, hipY = G - 54;
  const chestX = cx - 13, chestY = G - 78;
  const headX = cx - 34, headY = G - 94;

  /* --- the forked tail, laid down before the body so the rump covers its root.
     It sweeps back and up, then splits: the upper prong flicks high, the lower
     one trails. Two different lengths, because a symmetric fork is a tuning
     fork. */
  const stemPts: Pt[] = [[hipX + 2, hipY + 6], [cx + 26, G - 56], [cx + 38, G - 66]];
  const stem = path(stemPts);
  limbPath(p, stem, 12, 7, BASE, { lit: HILIGHT, dark: DEEP });
  const fork: Pt = [cx + 38, G - 66];
  const prongA: Pt[] = [fork, [cx + 48, G - 78], [cx + 52, G - 92]];
  const prongB: Pt[] = [fork, [cx + 50, G - 62], [cx + 60, G - 56]];
  limbPath(p, path(prongA), 7.5, 3.6, BASE, { front: true, lit: HILIGHT, dark: DEEP });
  limbPath(p, path(prongB), 7, 3.6, SHADE, { front: true, lit: BASE, dark: DEEP });
  bead(p, cx + 52, G - 95, 5);
  bead(p, cx + 63, G - 54, 4.4);

  /* --- the far leg first, in the recessed tone and braced back under the tail.
     The two feet are twenty cells apart, because two legs whose outlines merge
     are one trunk with a hole in it, which is what the first pass gave. */
  legDig(p, hipX + 12, hipY + 2, G - 1, SHADE, 1, 10, 5.5);

  /* --- the body: a narrow S laid down at a slant. Twenty cells through the
     ribs and no wider -- the first pass ran twenty-six with a belly plate on
     it, and a plated barrel that size on two legs is a weightlifter, whatever
     the brief says about lean. */
  limbPath(p, [[hipX, hipY + 2], [cx - 4, G - 66], [chestX + 1, chestY + 3]], 21, 20, BASE, { bulge: 1 });
  blobFront(p, hipX - 1, hipY, 13.5, 13, BASE);
  blobFront(p, chestX + 1, chestY, 14, 13.5, BASE);
  // Chest and throat, pale, and one crease behind the ribs. One.
  blob(p, chestX - 3, chestY + 8, 9, 9, LIGHT);
  for (const q of arc(cx - 2, G - 70, 12, 14, Math.PI * 0.12, Math.PI * 0.6, 16)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0] - 1, q[1], SHADE);
  }

  /* --- the near leg, carrying the whole animal, planted forward of the hip so
     the lean has something to fall onto. */
  legDig(p, hipX - 16, hipY + 6, G, BASE, -1, 12, 6.5, true);

  /* --- a bristling ruff over the haunch and the small of the back: Fizzlet's
     entire coat, kept as one patch.
     It began as a mane down the nape, where its clumps landed on top of the
     skull and the head came out wearing a wig. Fur near a face is as dangerous
     as ornament near one, and the rump is the one place on a biped where nine
     cells of hair cannot reach anything that matters. */
  mane(p, path([[hipX + 14, hipY - 4], [hipX + 2, hipY - 13], [cx - 10, G - 70]] as Pt[]), 9, 5, LIGHT, SPEC);

  /* --- neck and head. The head is small -- a fifth of the animal's height --
     and carried forward and low, which is most of what makes a biped read as
     lean rather than as upright furniture. The neck is deliberately thinner
     than the skull: a neck as thick as the head it carries is a shoulder, and
     the animal comes out with no head at all. */
  limbPath(p, [[chestX + 1, chestY - 6], [headX + 11, headY + 10]], 13, 10, BASE);
  blobFront(p, headX, headY, 14, 12, BASE);
  // A dark cap over the crown. The head is the highest, leftmost mass on the
  // sprite, so a plain BASE skull takes the top step of its own ramp and comes
  // out nearly as pale as the muzzle -- and at icon size a pale head with a
  // pale snout on it has no features left at all.
  for (let dy = -13; dy <= -3; dy++) {
    for (let dx = -15; dx <= 15; dx++) cellOver(p, headX + dx, headY + dy, SHADE);
  }

  /* --- the crest: four filaments springing from the *back* of the skull and
     streaming away over the shoulders, each ending in a bead.
     They started rooted on the crown, arcing forward over the face, and the
     head came out wearing a bunch of grapes. A crest belongs behind the ear
     line and it has to go somewhere -- these travel thirty cells. */
  // The roots sit high on the back of the skull and every wire leaves going
  // *up*. Rooted a few cells lower and one of them ran straight through the far
  // eye -- invisible in the code, unmissable in the picture.
  const rootX = headX + 11, rootY = headY - 8;
  for (const [ang, len, tone] of [[-0.85, 36, ACCENT], [-0.42, 44, ACCENT_DARK], [-0.02, 33, ACCENT]] as const) {
    const tipX = rootX + Math.cos(ang) * len, tipY = rootY + Math.sin(ang) * len;
    limbPath(p, path([[rootX, rootY], [lerp(rootX, tipX, 0.5), lerp(rootY, tipY, 0.5) - 5], [tipX, tipY]] as Pt[]),
      5.5, 2.6, tone, { lit: ACCENT_LIT, dark: ACCENT_DARK });
    // The same taped band Fizzlet wears on its wires.
    const bx2 = lerp(rootX, tipX, 0.46), by2 = lerp(rootY, tipY, 0.46) - 4;
    for (let k = -1; k <= 1; k++) stroke(p, bx2 + k, by2 - 4, bx2 + k + 2, by2 + 4, k === 1 ? ACCENT_DARK : LIGHT);
    bead(p, tipX, tipY, 4);
  }

  /* --- a short sharp muzzle, driven down and forward out of the lower front
     corner of the skull. Kept to a third of the head: the first pass ran a pale
     wedge nearly the length of the face and there was nowhere left to put an
     eye. */
  polyFront(p, [[headX - 4, headY + 1], [headX - 18, headY + 5], [headX - 16, headY + 12], [headX - 3, headY + 11]],
    LIGHT, DEEP, 1);
  stroke(p, headX - 5, headY + 2, headX - 17, headY + 5, HILIGHT);
  poly(p, [[headX - 18, headY + 4], [headX - 12, headY + 3], [headX - 14, headY + 8]], ACCENT);
  cell(p, headX - 17, headY + 4, ACCENT_LIT);
  if (!p.back) mouthLine(p, headX - 10, headY + 10, 5, 1, true);

  /* --- arms, last, so the head cannot bury them. Short and held high: the near
     one open with the fingers spread out in front of the chest, the far one
     tucked back against the ribs. */
  limbPath(p, [[chestX + 8, chestY + 6], [chestX + 6, chestY + 16]], 8, 5.5, SHADE);
  limbPath(p, [[chestX + 2, chestY + 4], [chestX - 10, chestY + 12], [chestX - 19, chestY + 12]], 10, 6, BASE,
    { front: true, bulge: 1 });
  hand(p, chestX - 24, chestY + 13, 6, { tone: LIGHT, side: -1, fingers: 3, claws: true });

  if (p.back) { p.face(headX, headY, 15); return; }

  /* --- the face. Narrow, slanted and hard: this is a sweeper, the fastest
     thing in its half of the roster, and it should look like it has already
     decided. Fizzlet's huge round eye grown down to a hard almond is most of
     what says the cub became a hunter. */
  // The iris is the dark end of the accent ramp, not the bright one. This
  // palette declares a near-black olive as its accent, so its *lit* end is a
  // warm grey -- an iris in it, inside a white almond, on a yellow head, is
  // what the first pass had: two eyes you could not find.
  eye(p, headX - 6, headY - 1, 5.2, 'angry', { side: -1, iris: ACCENT_DARK });
  eye(p, headX + 5, headY - 2, 4.2, 'angry', { side: 1, iris: ACCENT_DARK });
  p.face(headX, headY, 15);
  // A black mask band running back from the eyes over the cheek.
  for (let k = 0; k < 2; k++) stroke(p, headX + 1, headY + 3 + k, headX + 12, headY + k, ACCENT);
}

/**
 * A digitigrade leg with the joints where this species wants them: a longer
 * shin and a smaller foot than the stock helper builds, because Voltwick is
 * meant to read as standing on wire rather than on paws.
 */
function legDig(p: Pen, hipX: number, hipY: number, groundY: number, tone: number,
  side: number, th: number, ankle: number, front = false): void {
  const len = groundY - hipY;
  const kneeX = hipX + side * len * 0.14, kneeY = hipY + len * 0.36;
  const hockX = hipX - side * len * 0.09, hockY = hipY + len * 0.74;
  const toeX = hockX + side * len * 0.15;
  limbPath(p, [[hipX, hipY], [kneeX, kneeY]], th, th * 0.7, tone, front ? { front: true, bulge: th * 0.2 } : { bulge: th * 0.2 });
  limbPath(p, [[kneeX, kneeY], [hockX, hockY]], th * 0.7, ankle, tone);
  limbPath(p, [[hockX, hockY], [toeX, groundY - 3]], ankle, ankle * 0.85, tone);
  crease(p, kneeX, kneeY, th * 0.44);
  crease(p, hockX, hockY, ankle * 0.55);
  paw(p, toeX, groundY, ankle * 1.15, { tone, toes: 3, claws: true, long: true });
}

/* ============================================================= lantric */

/**
 * "Hanging iron lantern with a filament core and two hook arms."
 *
 * The only thing in the group that is not an animal, and the design leans into
 * it: a genuine lamp -- ring at the top, vented hood, a glass housing with a
 * coiled filament burning behind it, a flared foot -- with two long iron hooks
 * for arms and a face in the glass.
 *
 * The trap here is furniture. A lantern drawn plumb and symmetric is an object
 * on a shelf, so the whole body leans: every part is positioned off an axis
 * that tips left as it rises, and the two hooks are doing different things --
 * one raised and open, one hanging down and curled. It is a hanging lamp caught
 * on the swing.
 *
 * Read the palette before choosing tones. This species declares a cool steel
 * grey as its accent, so ACCENT is the *ironwork* -- ring, hood, bars, hooks --
 * and the light comes from LIGHT and SPEC behind the glass.
 */
function lantric(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Spark's crackle pass etches a zigzag over the largest mass, which here is
  // the glass; the fur it grows off the lower contour is worse.
  p.noTypeTraits();
  p.noTexture();

  // The swing. Every coordinate below is placed against this, so the lamp is
  // one leaning object rather than a stack of leaning parts.
  const AX = (y: number): number => cx + (y - (G - 60)) * 0.16;

  const capY = G - 92, glassY0 = G - 82, glassY1 = G - 34, footY = G - 24;

  /* --- the ring it hangs by, and the shackle joining it to the hood. */
  const ringY = capY - 16;
  for (const q of arc(AX(ringY), ringY, 9, 8, 0, Math.PI * 2, 44)) {
    cell(p, q[0], q[1], ACCENT);
    cell(p, q[0], q[1] + 1, ACCENT);
    cell(p, q[0] - 1, q[1], ACCENT);
  }
  for (const q of arc(AX(ringY), ringY, 9, 8, Math.PI * 1.05, Math.PI * 1.9, 20)) cell(p, q[0], q[1] - 1, ACCENT_LIT);
  for (const q of arc(AX(ringY), ringY, 9, 8, Math.PI * 0.1, Math.PI * 0.9, 20)) cell(p, q[0], q[1] + 1, ACCENT_DARK);
  limbPath(p, [[AX(ringY + 8), ringY + 8], [AX(capY - 4), capY - 4]], 7, 9, ACCENT, { lit: ACCENT_LIT, dark: ACCENT_DARK });

  /* --- the far hook arm. It goes down *before* the housing, because the first
     pass drew both arms last and the far one came out lying across the glass:
     an arm on the wrong side of the creature's own chest. Back to front is not
     a style note, it is the order things exist in. */
  const shY0 = G - 62;
  const farArm = path([[AX(shY0) + 20, shY0 - 2], [AX(shY0) + 34, shY0 + 8], [AX(shY0) + 38, shY0 + 26]] as Pt[]);
  limbPath(p, farArm, 8, 5.5, ACCENT_DARK, { lit: ACCENT, dark: ACCENT_DARK });
  hookTip(p, farArm[farArm.length - 1]!, -Math.PI * 0.5, ACCENT_DARK, 1);

  /* --- the hood: a vented cone with a bevelled brim, wider than the glass so
     the housing is standing under something. */
  plate(p, [[AX(capY) - 9, capY - 8], [AX(capY) + 9, capY - 8],
    [AX(capY + 10) + 25, capY + 10], [AX(capY + 10) - 25, capY + 10]], ACCENT);
  for (let i = -2; i <= 2; i++) {
    const x0 = AX(capY - 6) + i * 6, x1 = AX(capY + 8) + i * 10;
    stroke(p, x0, capY - 6, x1, capY + 8, ACCENT_DARK);
    stroke(p, x0 - 1, capY - 6, x1 - 1, capY + 8, ACCENT_LIT);
  }
  rect(p, AX(capY + 11) - 27, capY + 10, AX(capY + 11) + 27, capY + 13, ACCENT);
  stroke(p, AX(capY + 10) - 27, capY + 10, AX(capY + 10) + 27, capY + 10, ACCENT_LIT);
  stroke(p, AX(capY + 14) - 26, capY + 14, AX(capY + 14) + 26, capY + 14, ACCENT_DARK);

  /* --- the glass housing. Drawn as a mass in LIGHT, because the whole point of
     this creature is that the light is inside it, then caged. */
  const gw0 = 22, gw1 = 25;
  poly(p, [[AX(glassY0) - gw0, glassY0], [AX(glassY0) + gw0, glassY0],
    [AX(glassY1) + gw1, glassY1], [AX(glassY1) - gw1, glassY1]], LIGHT);
  // The glass is a cylinder: a bright band up the left third, the right third
  // dropping away. Without it the housing is a flat card.
  poly(p, [[AX(glassY0) - gw0 + 4, glassY0 + 2], [AX(glassY0) - gw0 + 11, glassY0 + 2],
    [AX(glassY1) - gw1 + 12, glassY1 - 2], [AX(glassY1) - gw1 + 5, glassY1 - 2]], SPEC);
  poly(p, [[AX(glassY0) + gw0 - 8, glassY0 + 2], [AX(glassY0) + gw0, glassY0 + 2],
    [AX(glassY1) + gw1, glassY1 - 2], [AX(glassY1) + gw1 - 9, glassY1 - 2]], BASE);

  /* --- the filament core: a coil burning inside the glass, hung between two
     posts, in the tone the shading pass is not allowed to touch.
     It sits in a recess of cavity tone. A bright coil drawn straight onto the
     bright pane is a scratch on a window -- the light in a lamp only reads as
     light when there is something dark immediately behind it. */
  const coilY = glassY0 + 15;
  rect(p, AX(coilY) - 17, coilY - 8, AX(coilY) + 17, coilY + 7, INNER);
  stroke(p, AX(coilY) - 17, coilY - 9, AX(coilY) + 17, coilY - 9, ACCENT_DARK);
  stroke(p, AX(coilY) - 17, coilY + 8, AX(coilY) + 17, coilY + 8, ACCENT_LIT);
  for (const side of [-1, 1]) {
    rect(p, AX(coilY) + side * 14, coilY - 7, AX(coilY) + side * 14 + 1, coilY + 6, ACCENT);
  }
  const coil: Pt[] = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    coil.push([AX(coilY) - 14 + t * 28, coilY + Math.sin(t * Math.PI * 4) * 5.5]);
  }
  for (const q of coil) {
    cell(p, q[0], q[1], SPEC);
    cell(p, q[0], q[1] - 1, SPEC);
    cell(p, q[0], q[1] + 1, LIGHT);
  }

  /* --- the cage: four vertical bars and two hoops over the glass. They are the
     reason this reads as iron holding light rather than as a yellow box. */
  // Two bars, not four, and both outboard of the eyes. Bars on a tighter pitch
  // ran straight down the middle of the face: a lantern with a creature behind
  // the glass is charming, a creature in a cage is not the brief.
  for (const t of [-0.74, 0.74]) {
    const x0 = AX(glassY0) + t * (gw0 - 2), x1 = AX(glassY1) + t * (gw1 - 2);
    for (let k = 0; k < 2; k++) stroke(p, x0 + k, glassY0, x1 + k, glassY1, ACCENT);
    stroke(p, x0 - 1, glassY0, x1 - 1, glassY1, ACCENT_LIT);
    stroke(p, x0 + 2, glassY0, x1 + 2, glassY1, ACCENT_DARK);
  }
  for (const hy of [glassY0 + 4, glassY1 - 3]) {
    const hw = lerp(gw0, gw1, (hy - glassY0) / (glassY1 - glassY0));
    stroke(p, AX(hy) - hw, hy, AX(hy) + hw, hy + 1, ACCENT);
    stroke(p, AX(hy) - hw, hy + 1, AX(hy) + hw, hy + 2, ACCENT);
    stroke(p, AX(hy) - hw, hy - 1, AX(hy) + hw, hy, ACCENT_LIT);
  }

  /* --- the foot: a flared iron base with a short pendulum finial under it, so
     the lowest thing on the sprite is a point rather than a slab. A lamp that
     ends in a flat bottom is standing; one that ends in a drop is hanging. */
  poly(p, [[AX(glassY1) - gw1 - 2, glassY1], [AX(glassY1) + gw1 + 2, glassY1],
    [AX(footY) + 15, footY], [AX(footY) - 15, footY]], ACCENT);
  stroke(p, AX(glassY1) - gw1 - 2, glassY1 + 1, AX(glassY1) + gw1 + 2, glassY1 + 1, ACCENT_LIT);
  limbPath(p, [[AX(footY) + 3, footY], [AX(footY + 12) + 4, footY + 12], [AX(G - 6) + 3, G - 6]], 10, 4, ACCENT,
    { front: true, lit: ACCENT_LIT, dark: ACCENT_DARK });
  blob(p, AX(G - 4) + 3, G - 4, 5, 4, ACCENT_DARK);
  blob(p, AX(G - 5) + 2, G - 5, 2.4, 2, ACCENT_LIT);

  /* --- the near hook arm, raised and open, reaching up and out to the left.
     Bar iron: a cell of lit edge along the top and a cell of dark under it, and
     nothing else. It is thinner than the first pass -- ten cells of steel with
     a ring on the end read as the lamp's carrying handle, not as an arm. */
  const shY = G - 56;
  const nearArm = path([[AX(shY) - 14, shY - 2], [AX(shY) - 33, shY - 10], [AX(shY) - 42, shY - 26]] as Pt[]);
  limbPath(p, nearArm, 8.5, 5.5, ACCENT, { front: true, lit: ACCENT_LIT, dark: ACCENT_DARK });
  hookTip(p, nearArm[nearArm.length - 1]!, Math.PI * 0.72, ACCENT, -1);
  // Rivets where each arm is bolted through the housing.
  for (const s of [-1, 1]) {
    blob(p, AX(shY) + s * 14, shY - 1, 4, 4, ACCENT);
    cell(p, AX(shY) + s * 14 - 1, shY - 2, ACCENT_LIT);
    cell(p, AX(shY) + s * 14 + 1, shY, ACCENT_DARK);
  }

  if (p.back) { p.face(AX(glassY0 + 30), glassY0 + 30, 18); return; }

  /* --- the face, behind the glass and under the coil. Heavy-lidded and level:
     it burns for eleven hours and it is not in a hurry. The lids are painted in
     the glass tone rather than in body colour, so they read as part of the pane
     rather than as eyelids stuck on it. */
  const fy = glassY0 + 30;
  eye(p, AX(fy) - 12, fy, 5.8, 'hooded', { side: -1, iris: ACCENT_DARK, lid: LIGHT });
  eye(p, AX(fy) + 10, fy - 1, 5.2, 'hooded', { side: 1, iris: ACCENT_DARK, lid: LIGHT });
  p.face(AX(fy), fy, 18);
  mouthLine(p, AX(fy + 12) - 1, fy + 12, 7, 0);
}

/**
 * The curl at the end of a hook arm: a J of bar iron, not a point and not a
 * closed ring. `ang` is where on the curl the arm arrives, `turn` which way it
 * sweeps from there. The centre of the curl is placed so the arc *starts* at
 * the arm's last cell -- work the other way round and the hook floats a
 * radius away from the limb it is supposed to finish.
 */
function hookTip(p: Pen, at: Pt, ang: number, tone: number, turn: number): void {
  const R = 7.5;
  const ccx = at[0] - Math.cos(ang) * R, ccy = at[1] - Math.sin(ang) * R;
  const pts: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = ang + turn * (i / 12) * Math.PI * 1.35;
    pts.push([ccx + Math.cos(a) * R, ccy + Math.sin(a) * R]);
  }
  limbPath(p, pts, 5.5, 2.6, tone, { lit: ACCENT_LIT, dark: ACCENT_DARK });
  const tip = pts[pts.length - 1]!;
  cell(p, tip[0], tip[1], ACCENT_LIT);
  cell(p, tip[0], tip[1] - 1, ACCENT_LIT);
}

/* ============================================================= rillfry */

/**
 * "Slim darting fish with a split tail."
 *
 * A fry, and it travels in sevens. The pose is the dart: the body is kinked
 * into an S with the head snapped up and to the left and the tail still
 * flicked over to the right, which is what a small fish looks like in the half
 * second after it changes its mind.
 *
 * The near pectoral fin is held out flat like a hand rather than folded to the
 * flank -- a fin against the body is invisible, and this animal's whole read is
 * "fins out, going". Drawn small, because it becomes something four times the
 * weight.
 */
function rillfry(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Tide's stock pass plants a dorsal fin by measuring from the bounding box,
  // and on a fish tipped up at thirty degrees that lands on the shoulder. The
  // dorsal, the gills and the sheen are all drawn here on purpose.
  p.noTypeTraits();

  const snout: Pt = [cx - 32, G - 66];
  const nape: Pt = [cx - 16, G - 58];
  const mid: Pt = [cx + 2, G - 44];
  const ped: Pt = [cx + 20, G - 32];        // the tail wrist
  const spine = path([snout, nape, mid, ped] as Pt[]);

  /* --- the far pectoral, behind everything, low and swept back. */
  fin(p, [cx - 12, G - 48], [[cx - 4, G - 40], [cx + 4, G - 32], [cx - 6, G - 34]], { tone: SHADE, rays: 3 });

  /* --- the split tail. Two lobes off one wrist with a real notch between them:
     the upper long and flicked up, the lower short. Drawn before the body so
     the peduncle covers their roots.
     The notch has to be deep. Two lobes that part five cells apart have their
     outlines merged back into one paddle before the sprite is finished, and the
     species is called "the Shallow Dart" on the strength of that fork. */
  fin(p, ped, [[cx + 32, G - 46], [cx + 46, G - 52], [cx + 41, G - 36]], { tone: ACCENT, rays: 4 });
  fin(p, ped, [[cx + 30, G - 22], [cx + 44, G - 14], [cx + 34, G - 28]], { tone: ACCENT_DARK, rays: 3 });

  /* --- the body. Fat at the shoulders and quickly gone: a fry is mostly head,
     and that proportion is the difference between a fry and a small adult. */
  limbPath(p, spine, 25, 6, BASE, { bulge: 1.5, lit: HILIGHT, dark: DEEP });
  blobFront(p, cx - 22, G - 62, 14, 13, BASE);
  // A blunt snout on the point of the head, and the pale belly under the front
  // half -- and *only* under it. A pale patch laid across the skull as well
  // turned the head into a bald bulb, which is what the first pass had.
  blobFront(p, cx - 32, G - 58, 6.5, 4.5, LIGHT);
  blob(p, cx - 13, G - 50, 14, 7, LIGHT);
  // The dark cap over the skull. The countershading band below follows the
  // spine and runs out of head before it reaches the brow, and the crown -- the
  // topmost, leftmost mass on the sprite -- takes the brightest band of its own
  // ramp and goes white without it.
  for (let dy = -14; dy <= 2; dy++) {
    for (let dx = -15; dx <= 15; dx++) cellOver(p, cx - 22 + dx, G - 62 + dy, SHADE);
  }

  /* --- countershading: the back goes dark, the belly stays pale.
     This is the single thing that makes a drawn fish read as a fish, and its
     absence is why the first pass came out as a white bulb with fins -- the
     light falls from the upper left, so the top of a plain BASE body takes the
     brightest band of its own ramp and the animal is lit from the wrong side of
     its own biology. */
  for (const q of offsetPath(spine, -7)) {
    for (let k = -7; k <= 3; k++) cellOver(p, q[0], q[1] + k, SHADE);
  }

  /* --- the dorsal fin, small and hard, riding the shoulder where a fry's
     actually sits. */
  fin(p, [cx - 8, G - 60], [[cx - 6, G - 74], [cx + 6, G - 66], [cx + 12, G - 54]], { tone: ACCENT, rays: 4 });

  /* --- the lateral line: a pale stripe with a dark gutter under it, running
     the length of the flank and kinking with the body. It is the one mark that
     ties this to Currentail.
     It was drawn in the accent first, on the assumption that this palette's
     fourth colour was the gold in its fifth slot. It is not -- the accent here
     is a near-black navy and the gold is never used at all, because the factory
     takes whichever declared colour is darkest as the ink. Read the palette. */
  for (const q of spine) {
    cellOver(p, q[0], q[1] - 2, SPEC);
    cellOver(p, q[0], q[1] - 1, LIGHT);
    cellOver(p, q[0], q[1] + 1, ACCENT);
  }

  /* --- the near pectoral, out flat and fanned. The one piece of pose that
     survives at icon size. */
  fin(p, [cx - 14, G - 50], [[cx - 18, G - 36], [cx - 8, G - 28], [cx + 2, G - 34]], { tone: ACCENT, rays: 4, front: true });

  // Scales: two arcs of crescents over the shoulder, no more. A fish covered in
  // drawn scales at this size is a pine cone.
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 4; i++) {
      const x = cx - 14 + i * 6 + r * 3, y = G - 62 + r * 5 + i * 1.5;
      for (const q of arc(x, y, 2.5, 2, Math.PI * 0.1, Math.PI * 0.9, 6)) cellOver(p, q[0], q[1], DEEP);
    }
  }

  // Gills: one curved plate edge behind the eye, with a lit lip. On a fish this
  // is the operculum and it is what stops the head being a nose cone.
  seamPath(p, [[cx - 15, G - 70], [cx - 11, G - 62], [cx - 14, G - 52]] as Pt[], DEEP, LIGHT);

  if (p.back) { p.face(cx - 24, G - 64, 14); return; }

  /* --- the eye. Hand-built rather than one of the six styles, because a fish's
     eye is a full sphere set in the side of the head: a pale ring all the way
     round a black bead, no lid, no white. Nothing else in the group has one. */
  const ex = cx - 27, ey = G - 65;
  blob(p, ex, ey, 6.6, 6.6, ACCENT_DARK);
  blob(p, ex, ey, 5.4, 5.4, ACCENT_LIT);
  blob(p, ex, ey, 3.8, 3.8, EYE_DARK);
  rect(p, ex - 3, ey - 3, ex - 2, ey - 2, EYE_WHITE);
  cell(p, ex + 3, ey + 2, EYE_WHITE);
  p.face(cx - 24, G - 64, 14);

  // The mouth: a short upturned notch on the underside of the snout, open a
  // crack. Any higher and it sits under the eye and reads as a scowl.
  stroke(p, cx - 39, G - 57, cx - 30, G - 59, INNER);
  stroke(p, cx - 39, G - 56, cx - 30, G - 58, INNER);
  cellOver(p, cx - 38, G - 59, SPEC);
}

/* ========================================================== currentail */

/**
 * "Streamlined swimmer with long trailing tail ribbons."
 *
 * The fry gone long. Everything soft about Rillfry is drawn hard here: the head
 * is a wedge instead of a ball, the body is a blade, the pectorals are swept
 * back like knives, and the split tail has become three ribbons streaming a
 * third of the width of the cell behind it.
 *
 * The pose is the Vellum entry. It swims upstream while everything else goes
 * with the current, so the body is arched nose-up against the water and the
 * ribbons are blown *back and down* behind it -- the creature is pointing one
 * way and everything loose on it is pointing the other, which is the only way a
 * still picture ever says "current".
 */
function currentail(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const snout: Pt = [cx - 38, G - 90];
  const nape: Pt = [cx - 24, G - 82];
  const mid: Pt = [cx - 4, G - 68];
  const ped: Pt = [cx + 16, G - 48];
  const spine = path([snout, nape, mid, ped] as Pt[]);

  /* --- the ribbons. Three, at three different lengths, streaming back and
     down; the middle one is the longest and carries a spade on the end. They
     are laid down first so the tail wrist sits on their roots.
     They cost most of the sprite's width, so they are as long as they can be
     and no longer: the first pass ran them to a hundred and thirty-six cells
     across and the fit pass answered by shrinking the whole animal. */
  const ribbons: Pt[][] = [
    [ped, [cx + 34, G - 54], [cx + 48, G - 50], [cx + 56, G - 58]],
    [ped, [cx + 36, G - 40], [cx + 50, G - 30], [cx + 56, G - 26]],
    [ped, [cx + 30, G - 30], [cx + 44, G - 16], [cx + 52, G - 10]],
  ];
  ribbons.forEach((r, i) => {
    const d = path(r as Pt[]);
    limbPath(p, d, 9, 3.2, i === 1 ? ACCENT : ACCENT_DARK, { lit: ACCENT_LIT, dark: ACCENT_DARK });
    const tip = d[d.length - 1]!, prev = d[d.length - 8]!;
    const a = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
    // A spade on the end of each ribbon, so a long thin thing terminates in a
    // shape rather than in a tapering nothing.
    poly(p, [[tip[0] - Math.cos(a) * 3, tip[1] - Math.sin(a) * 3],
      [tip[0] - Math.sin(a) * 5, tip[1] + Math.cos(a) * 5],
      [tip[0] + Math.cos(a) * 11, tip[1] + Math.sin(a) * 11],
      [tip[0] + Math.sin(a) * 5, tip[1] - Math.cos(a) * 5]], i === 1 ? ACCENT : ACCENT_DARK);
    stroke(p, tip[0] - Math.sin(a) * 4, tip[1] + Math.cos(a) * 4,
      tip[0] + Math.cos(a) * 10, tip[1] + Math.sin(a) * 10, ACCENT_LIT);
  });

  /* --- the far pectoral, swept back low and dark, before anything else. */
  fin(p, [cx - 18, G - 76], [[cx - 8, G - 64], [cx + 2, G - 58], [cx - 10, G - 62]], { tone: SHADE, rays: 3 });

  /* --- the body: a blade. Deep at the shoulder, straight through the middle,
     and narrowing to a wrist you could close a hand round. */
  limbPath(p, spine, 27, 7, BASE, { bulge: 2, lit: HILIGHT, dark: DEEP });
  blobFront(p, cx - 30, G - 84, 15, 13, BASE);
  // The pale underside, kept well back of the jaw. Run forward as far as the
  // cheek -- which is where the first pass put it -- and the head turns into a
  // white bulb with the eye lost somewhere in the middle of it.
  blob(p, cx - 16, G - 70, 12, 6, LIGHT);
  blob(p, cx - 2, G - 58, 10, 5.5, LIGHT);

  /* --- countershading, exactly as on the fry: dark along the back, pale under
     the belly, and a cap over the skull so the highest, leftmost mass on the
     sprite does not take the top step of its own ramp and go white. */
  for (const q of offsetPath(spine, -8)) {
    for (let k = -8; k <= 3; k++) cellOver(p, q[0], q[1] + k, SHADE);
  }
  for (let dy = -15; dy <= 2; dy++) {
    for (let dx = -16; dx <= 16; dx++) cellOver(p, cx - 30 + dx, G - 84 + dy, SHADE);
  }

  /* --- the crest: one hard swept sail standing off the shoulders.
     The first pass built it with `fin` and a four-point free edge that ran from
     the crown to the middle of the back, and it came out as a dark sheet laid
     over the entire animal with its rays across the face. A dorsal is a
     triangle standing on the back, and its base has to be *behind* the skull. */
  const finA: Pt = [cx - 20, G - 92], finB: Pt = [cx + 4, G - 74], finC: Pt = [cx - 4, G - 112];
  poly(p, [finA, finC, finB], ACCENT);
  for (let i = 1; i <= 4; i++) {
    const t = i / 5;
    const rx = lerp(finA[0], finB[0], t), ry = lerp(finA[1], finB[1], t);
    stroke(p, rx, ry, lerp(rx, finC[0], 0.86), lerp(ry, finC[1], 0.86), ACCENT_DARK, false);
    stroke(p, rx - 1, ry, lerp(rx, finC[0], 0.86) - 1, lerp(ry, finC[1], 0.86), ACCENT_LIT, false);
  }
  // The leading edge catches the light; the trailing edge is inked.
  stroke(p, finA[0] - 1, finA[1], finC[0] - 1, finC[1], ACCENT_LIT, false);
  stroke(p, finB[0], finB[1], finC[0] + 1, finC[1], ACCENT_DARK, false);

  /* --- the lateral line, inherited straight off Rillfry: a pale stripe with a
     dark gutter under it, kinking with the body. */
  for (const q of spine) {
    cellOver(p, q[0], q[1] - 2, SPEC);
    cellOver(p, q[0], q[1] - 1, LIGHT);
    cellOver(p, q[0], q[1] + 1, ACCENT);
  }

  /* --- the near pectoral: a swept blade held out and back, half again the
     length of the fry's and pointed instead of fanned. */
  // It sits just behind the gill plate, where a pectoral belongs. Set back to
  // mid-body -- where the first pass had it, next to a pelvic fin and the roots
  // of three ribbons -- everything under the animal merges into one dark skirt
  // and the belly line disappears.
  fin(p, [cx - 18, G - 70], [[cx - 12, G - 56], [cx - 2, G - 50], [cx - 6, G - 62]], { tone: ACCENT, rays: 4, front: true });

  // Scale rows along the shoulder, one crescent every few cells.
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 5; i++) {
      const x = cx - 22 + i * 7 + r * 3, y = G - 84 + r * 6 + i * 2.6;
      for (const q of arc(x, y, 3, 2.4, Math.PI * 0.1, Math.PI * 0.9, 7)) cellOver(p, q[0], q[1], DEEP);
    }
  }

  // The gill plate: a hard bevelled edge behind the jaw with three slits under
  // it. Bigger and harder than the fry's, which only has the plate.
  seamPath(p, [[cx - 20, G - 94], [cx - 15, G - 82], [cx - 20, G - 68]] as Pt[], DEEP, SPEC);
  if (!p.back) {
    for (let i = 0; i < 3; i++) {
      const gx = cx - 17 + i * 4;
      stroke(p, gx, G - 80 + i, gx, G - 72 + i, INNER);
      stroke(p, gx - 1, G - 80 + i, gx - 1, G - 72 + i, SPEC);
    }
  }

  /* --- the jaw. A long straight upper lip out to the point of the snout with
     the lower one jutting past it: the fry's blunt little mouth grown into
     something that bites. Drawn for the rear view as well -- a head that loses
     its whole muzzle when the sprite turns round changes species. */
  polyFront(p, [[cx - 34, G - 86], [cx - 50, G - 84], [cx - 48, G - 78], [cx - 32, G - 77]], LIGHT, DEEP, 1);
  poly(p, [[cx - 48, G - 81], [cx - 53, G - 78], [cx - 38, G - 75]], BASE);
  cell(p, cx - 49, G - 84, SPEC);
  cell(p, cx - 48, G - 84, SPEC);

  if (p.back) { p.face(cx - 32, G - 86, 15); return; }

  stroke(p, cx - 50, G - 82, cx - 35, G - 84, INNER);
  stroke(p, cx - 50, G - 81, cx - 35, G - 83, INNER);
  // Two small teeth on the lower lip, in the bright accent, so the bite reads.
  for (const tx of [cx - 46, cx - 42]) { cell(p, tx, G - 82, ACCENT_LIT); cell(p, tx, G - 83, ACCENT_LIT); }

  /* --- the face. A hard slit eye under a straight brow: the fry's wet round
     bead has become a predator's, which is the whole of what says this one
     swims at things rather than away from them. */
  eye(p, cx - 34, G - 88, 5.4, 'slit', { side: -1, iris: ACCENT_DARK });
  p.face(cx - 32, G - 86, 15);
  for (let k = 0; k < 2; k++) stroke(p, cx - 42, G - 94 + k, cx - 26, G - 96 + k, ACCENT_DARK);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  fizzlet,
  voltwick,
  lantric,
  rillfry,
  currentail,
};
