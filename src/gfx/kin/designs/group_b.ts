/**
 * Design group B -- the fire-and-earth set.
 *
 *   blazelynx   a long-legged ridge-running cat, high in the shoulder, mid
 *               stride, with tufted ears, a flaring cheek ruff, a spiked ember
 *               mane over the withers and a thin tail carried up like a torch.
 *   volcatrix   the same cat stood up on two legs in a fighting guard: braced
 *               wide, one banded forearm forward, one cocked at the hip, the
 *               mane grown into a full collar.
 *   emberbore   a squat armoured digger driving forward onto a glowing conical
 *               drill-snout, plated back, one foreclaw buried in the floor.
 *   sootmoth    a moth at rest in three-quarter view, near wing forward and
 *               wide, far wing behind, ember-lit scalloped wing margins and
 *               two big feathered antennae.
 *   gravelet    a small scruffy quarry digger sat back on its heels with two
 *               oversized scoop claws held up, its back caked in loose grit.
 *
 * Two of them are a line -- blazelynx and volcatrix, both out of the starter
 * cinderpaw -- so they share the swept tufted ears, the wedge muzzle, the ember
 * fur that is drawn in LIGHT rather than in ACCENT, and the tail that ends in
 * flame. What changes across the line is what the animal is doing: prowling,
 * running, and finally standing up to fight.
 *
 * PALETTE NOTE for the cats and the moth: all three declare a near-black brown
 * as their accent, so ACCENT is *ink* on them and ACCENT_LIT comes back a warm
 * grey. Every hot thing on those three -- ember tufts, flame tongues, wing
 * margins, the glow inside the mane -- is painted in LIGHT / HILIGHT / SPEC,
 * and ACCENT is spent on stripes, bands and eye-mask markings instead.
 * Emberbore and gravelet declare real accents (quarry grey, ochre) and use them
 * the ordinary way, for plate, claw and grit.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, HILIGHT, INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, bellyPlate, blob, blobFront, cell, cellOver, crease, earPointed,
  eye, fin, jaw, legColumn, legDigitigrade, limbPath, mouthLine, normalAt, nostril, path, paw, plate,
  poly, polyFront, polyLine, rings, seamPath, shell, speckle, stroke, teeth, tuft,
  type Pen, type Pt,
} from '../parts.js';

/* ================================================================ heat */

/**
 * One tongue of fire: three nested triangles, cool outside and white-hot in the
 * middle, leaning as it rises.
 *
 * Three species here need flame and none of them can use ACCENT for it -- the
 * cats and the moth all declare soot as their accent colour, so a tongue
 * painted the obvious way comes out as scorch damage. The body ramp's pale end
 * is the hot end on those palettes, so a flame is LIGHT, then HILIGHT, then
 * SPEC, and the nesting is what stops it reading as a flat leaf.
 *
 * Root it a few cells *inside* whatever it burns on. A tongue that starts where
 * the fur ends gets its own ring of ink and floats.
 */
function flameTongue(p: Pen, x: number, y: number, h: number, lean: number): void {
  // One notched outline, not three overlapping triangles. Separate tongues at
  // this size have their outlines welded together by the ink pass and come out
  // as a single pale spearhead, which is exactly what the first attempt was.
  // The notches have to be cut into one polygon or they do not survive.
  const SHAPE: readonly (readonly [number, number])[] = [
    [-0.34, 0], [-0.42, 0.30], [-0.17, 0.26], [-0.25, 0.58], [-0.02, 0.40],
    [0.10, 1.00], [0.26, 0.42], [0.40, 0.20], [0.36, 0],
  ];
  // Three quarters as wide as it is tall. Drawn square it reads as a splayed
  // hand; drawn much narrower than this the side licks close up against the
  // main one and it comes out as a blade. Both were tried.
  const at = (s: number): Pt[] => SHAPE.map(([sx, sy]) =>
    [x + sx * h * s * 0.72 + lean * sy * s, y - sy * h * s] as Pt);
  poly(p, at(1), LIGHT);
  poly(p, at(0.7), HILIGHT);
  poly(p, at(0.38), SPEC);
  // A soot trailing edge down the lee side. Three nested creams and nothing
  // else is a pale paddle; the cool edge is what makes it read as burning.
  const o = at(1);
  polyLine(p, [o[5]!, o[6]!, o[7]!, o[8]!], ACCENT, false, true);
}

/* ============================================================ blazelynx */

/**
 * "Long-limbed cat, high shoulders, mane of ember tufts."
 *
 * Cinderpaw is a cub sunk low to the floor with a tail bigger than itself.
 * Sixteen levels later it is all leg: the same head, the same fire in the fur,
 * but stretched out and lifted a good twenty cells clear of the ground on four
 * thin digitigrade stilts, with the withers standing proud of the spine so the
 * back slopes *down* to the hip.
 *
 * That downhill back is the whole read. A cat with a level spine is at rest; a
 * cat whose shoulders are the highest point of its body is a cat mid-stride,
 * and it costs eight cells of difference between two y coordinates.
 *
 * The tail is the Vellum entry drawn: "you see the tail-light long before you
 * see the animal". So it is not another fur plume -- it is a thin bare rope
 * carried straight up with a lick of fire on the end of it, held clear of the
 * body where nothing else on the sprite can be confused with it.
 */
function blazelynx(p: Pen): void {
  const G = p.ground, cx = p.cx;

  // Near-black accent: the stock flame pass would grow soot-coloured tongues
  // off the spine. All of this animal's heat is hand-placed in LIGHT and SPEC.
  p.noTypeTraits();

  const shoulderX = cx - 24, shoulderY = G - 66;
  const hipX = cx + 26, hipY = G - 52;
  const headX = cx - 44, headY = G - 74;

  /* --- the tail. Up, not over: a thin rope leaving the rump almost vertically,
     with fire on the end of it. Cinderpaw's tail is an enormous fur plume laid
     over its own back; this one is the opposite shape on purpose -- narrow,
     bare, and held right out in clear air where nothing can crowd it. */
  const tail = path([[hipX + 8, hipY + 4], [hipX + 18, hipY - 8], [hipX + 21, hipY - 24], [hipX + 15, hipY - 38]]);
  limbPath(p, tail, 8, 3.5, BASE, { lit: HILIGHT, dark: DEEP });
  // Two soot bands low down, where they cannot fight the flame for attention.
  rings(p, tail.slice(0, Math.round(tail.length * 0.5)), 2, 4, ACCENT, HILIGHT);
  // The flame, rooted five cells back down the tail so it grows out of the fur
  // instead of hanging beside it, and leaning back the way a running animal's
  // would. Three tongues at three heights: one flame is a leaf.
  const tip = tail[tail.length - 1]!;
  flameTongue(p, tip[0], tip[1] + 4, 21, 4);

  /* --- far legs first, in the recessed tone. Both forelegs lean forward and
     both hinds lean back, so the two pairs stand apart instead of crossing --
     the first pass had one fore leaning each way and they made an X with a
     triangular hole in the middle of it. */
  legDigitigrade(p, shoulderX + 10, shoulderY + 14, G - 2, { tone: SHADE, side: -1, thick: 9, ankle: 5, footHalf: 5, claws: true });
  legDigitigrade(p, hipX + 6, hipY + 12, G - 1, { tone: SHADE, side: 1, thick: 9, ankle: 5, footHalf: 5, claws: true });

  /* --- the barrel. Twenty-four cells through and slung high: this animal is a
     greyhound wearing a cat's head, and the daylight under its belly is what
     says so. The spine runs *downhill* from the withers to the hip. */
  limbPath(p, [[shoulderX, shoulderY + 6], [cx, shoulderY + 16], [hipX, hipY + 8]], 26, 24, BASE, { bulge: -4 });
  // Withers: their own mass, sitting proud above the spine line rather than in
  // it. The highest point of the body is the shoulder, not the head.
  blobFront(p, shoulderX - 1, shoulderY - 2, 16, 15, BASE);
  blobFront(p, hipX + 3, hipY + 4, 17, 18, BASE);
  // Waist tuck: the dark arc that lifts the belly line off the floor.
  for (const q of arc(cx + 1, shoulderY + 12, 21, 20, Math.PI * 0.16, Math.PI * 0.84, 24)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0], q[1] - 1, SHADE);
  }
  // A pale chest, but no segment lines on it: ruled across a lean belly they
  // read as the ribs of a flipper rather than as an underside.
  blob(p, shoulderX + 5, shoulderY + 22, 13, 5, LIGHT);
  // Flank bars in the near-black accent, raked back off the spine. Three cells
  // thick, or they vanish into the surface texture.
  for (let i = 0; i < 4; i++) {
    const sx = shoulderX + 10 + i * 11;
    for (let k = 0; k < 3; k++) {
      stroke(p, sx + k, shoulderY + 2 + i * 2, sx - 7 + k, shoulderY + 15 + i * 2, ACCENT);
    }
  }
  // Ember flecks over the haunch, the mark cinderpaw carries too.
  for (const [ex, ey] of [[hipX + 4, hipY - 4], [hipX + 12, hipY + 4], [hipX - 2, hipY + 12]] as const) {
    cellOver(p, ex, ey, SPEC);
    cellOver(p, ex + 1, ey, HILIGHT);
    cellOver(p, ex, ey + 1, ACCENT);
  }

  /* --- near legs. The fore is planted well forward of the chest and the hind
     well behind the rump; the stretch between those two feet is the stride. */
  legDigitigrade(p, hipX - 6, hipY + 14, G, { tone: BASE, side: 1, thick: 11, ankle: 6, footHalf: 6, front: true, claws: true });
  legDigitigrade(p, shoulderX - 5, shoulderY + 16, G, { tone: BASE, side: -1, thick: 10, ankle: 6, footHalf: 6, front: true, claws: true });

  /* --- the ember mane: five separate spikes of fur standing off the withers,
     longest over the shoulder and shortening towards the head.
     `mane` was the obvious tool and it was wrong -- along a near-horizontal
     back its jag never gets far enough from the contour to break it, and the
     ruff came out as a pale saddle blanket. Discrete tufts leave real notches
     in the silhouette, which is the only place a crest actually lives. */
  const CLUMP = [1, 0.6, 1.12, 0.72, 0.9, 0.52];
  for (let i = 0; i < CLUMP.length; i++) {
    const t = i / (CLUMP.length - 1);
    const mx = headX + 17 + t * 33, my = shoulderY - 9 - (1 - t) * 3 + t * 6;
    // Rooted deep and spaced close, so the bases merge into one ridge and only
    // the points stand apart. Equal clumps spaced wide is how the first pass
    // came out looking like a row of dorsal plates rather than a coat of fur.
    const len = 15 * CLUMP[i]!;
    tuft(p, mx, my + 9, len + 6, -Math.PI * 0.5 + 0.62 + t * 0.14, 0.22, BASE);
    tuft(p, mx - 1, my + 10, len + 1, -Math.PI * 0.5 + 0.54 + t * 0.14, 0.19, LIGHT);
    cellOver(p, mx - 2, my - len + 10, SPEC);
  }

  /* --- the head, carried low and forward of the withers and turned a few
     degrees towards the viewer, so the two eyes are different sizes. */
  limbPath(p, [[shoulderX - 2, shoulderY + 4], [headX + 13, headY + 11]], 19, 16, BASE, { front: true });

  // Cheek ruff, drawn *before* the skull so the skull covers its roots and only
  // the flare shows, and flaring *backwards* off the cheek only. Tufts on the
  // front of the jaw land across the muzzle and the head comes out as a ball of
  // spikes with a nose somewhere in it, which is what the second pass was.
  for (const [rx, ry, a, len] of [[14, 7, 0.24, 16], [11, 15, 0.46, 12]] as const) {
    tuft(p, headX + rx, headY + ry, len, Math.PI * a, 0.28, LIGHT);
  }
  blobFront(p, headX, headY, 16, 14, BASE);
  // The dome, so the skull is not a disc. It has to sit well above the eyes:
  // set at the socket line -- which is where anatomy says a brow ridge goes --
  // its dark arc lands across both eyes and the face fills with clutter.
  for (const q of arc(headX, headY - 7, 12, 6, Math.PI * 1.08, Math.PI * 1.96, 20)) {
    cellOver(p, q[0], q[1] + 2, DEEP);
    cellOver(p, q[0], q[1] + 1, HILIGHT);
  }

  /* --- ears: swept back, the far one smaller and in the recessed tone.
     Everything about them is smaller than it was two passes ago. Tall tufted
     ears with a full-length cavity in each, a black tip hung off each point and
     a bone brow under them turned the whole face into dark clutter -- at this
     size an ear is a shape, and one more piece of detail inside it is one less
     thing you can read. Only the near ear gets a cavity at all. */
  const earTip = (bx: number, by: number, len: number, lean: number, side: number, tone: number, inner: number): void => {
    earPointed(p, bx, by, len, lean, side, { tone, inner, front: true });
    const w = Math.max(4, len * 0.55);
    const tx = bx + side * lean, ty = by - len;
    // The black tip is painted *into* the ear as a sub-triangle of its own
    // outline. Hung off the point as its own blob it grows its own ink and
    // detaches, which is what happened the first time.
    poly(p, [[tx, ty], [lerp2(bx - w * 0.5, tx, 0.72), lerp2(by + 1, ty, 0.72)],
      [lerp2(bx + w * 0.6, tx, 0.72), lerp2(by, ty, 0.72)]], ACCENT);
  };
  // The cavity is gated on the rear view. Two dark pits on a head with no eyes
  // read as eyes, and the back sprite is the one nobody remembers to look at.
  earTip(headX + 10, headY - 10, 15, 6, 1, SHADE, SHADE);
  earTip(headX - 6, headY - 12, 18, -5, -1, BASE, p.back ? SHADE : INNER);

  // The muzzle: a short deep wedge driven down out of the skull, not a bill
  // laid along the front of it. Ten cells, no more -- an earlier version ran
  // sixteen and the whole head came out as a duck.
  polyFront(p, [[headX + 1, headY + 3], [headX - 13, headY + 7], [headX - 12, headY + 15], [headX + 1, headY + 16]], LIGHT, DEEP, 1);
  stroke(p, headX, headY + 4, headX - 12, headY + 7, HILIGHT);
  poly(p, [[headX - 14, headY + 6], [headX - 9, headY + 5], [headX - 11, headY + 11]], ACCENT);
  cell(p, headX - 13, headY + 6, ACCENT_LIT);

  if (!p.back) {
    // A snarl. Cinderpaw shows two fangs; the grown animal shows four and a
    // cavity, which is the same face doing more.
    poly(p, [[headX - 11, headY + 12], [headX - 2, headY + 12], [headX - 3, headY + 18], [headX - 10, headY + 17]], INNER);
    poly(p, [[headX - 9, headY + 15], [headX - 4, headY + 14], [headX - 5, headY + 18], [headX - 8, headY + 18]], ACCENT_DARK);
    // Cream fangs, not ACCENT_LIT: on a soot accent that ramp's lit end is a
    // warm grey and the mouth comes out full of gravel.
    for (const fx of [headX - 10, headX - 4]) {
      for (let k = 0; k < 3; k++) { cell(p, fx, headY + 12 + k, SPEC); cell(p, fx + 1, headY + 12 + k, INNER); }
    }
  }

  if (p.back) { p.face(headX, headY, 17); return; }

  /* --- the face. Slit-pupilled like the cub it grew out of, and nothing else:
     no bone brow and no mask stripe across the socket. Both were on it a pass
     ago and between them, the two ear cavities and the nose there was so much
     near-black on a thirty-cell head that the eyes stopped being findable. The
     one soot mark left runs back along the cheek, clear of the eye. */
  eye(p, headX - 7, headY - 2, 4.0, 'slit', { side: -1, iris: ACCENT_LIT });
  eye(p, headX + 8, headY - 4, 3.3, 'slit', { side: 1, iris: ACCENT_LIT });
  // A *lit* brow ridge rather than an inked one. On a palette whose accent is
  // soot there is already more near-black on this face than it can carry, and
  // a pale ridge catching the light says "heavy brow" just as clearly.
  for (const [bx, by, len] of [[headX - 7, headY - 8, 11], [headX + 8, headY - 10, 8]] as const) {
    for (let i = 0; i <= len; i++) {
      const t = i / len;
      cellOver(p, bx - len * 0.5 + i, by - t * 2, HILIGHT);
      cellOver(p, bx - len * 0.5 + i, by - t * 2 + 1, DEEP);
    }
  }
  for (let k = 0; k < 2; k++) stroke(p, headX + 1, headY + 6 + k, headX + 13, headY + 8 + k, ACCENT);
  p.face(headX, headY, 17);
}

/** Straight-line interpolation, local to this file so the ear helper reads. */
function lerp2(a: number, b: number, t: number): number { return a + (b - a) * t; }

/* ============================================================ volcatrix */

/**
 * "Upright bipedal cat, braced stance, banded forearms."
 *
 * The line's whole point, and the Vellum entry says it out loud: "it fights
 * standing up, which no other cat in Veldras does. The stance is learned, not
 * born." So the sprite is a stance before it is an animal. Rear foot turned
 * out and loaded, lead foot forward and light, hips square between them, torso
 * turned three quarters to the viewer, lead fist up at chin height and rear
 * fist cocked at the hip. Take the guard away and it is just a big cat on two
 * legs; the guard is what makes it a fighter.
 *
 * Cinderpaw and blazelynx are in here: the same swept ears, the same wedge
 * muzzle, the same fire drawn in LIGHT because the palette's accent is soot,
 * the same flame on the tail tip. What has grown is mass -- the crest of ember
 * spikes along blazelynx's withers has closed up into a full collar around the
 * shoulders, and the ears have gone *short*, pinned back the way a cat's are
 * when it has decided to fight.
 *
 * The forearm bands are the second signature and they are the reason the arms
 * read at icon size: three hard soot rings with a lit lip on each, which turns
 * two smooth cylinders into two wrapped, deliberate things.
 */
/**
 * A closed fist: a rounded mass with three knuckles proud on its leading edge
 * and the folded fingers creased under them.
 *
 * `hand({fist})` was the obvious tool and it is wrong here. It rules four hard
 * light-over-dark finger lines straight across the palm, which at this size is
 * indistinguishable from the banded forearm right above it -- the creature came
 * out with two bandaged stumps. A fist needs one crease and a lit knuckle line,
 * and nothing else.
 */
function volFist(p: Pen, x: number, y: number, r: number, side: number, tone = BASE): void {
  blobFront(p, x, y, r, r * 1.05, tone);
  for (let i = -1; i <= 1; i++) {
    const kx = x + side * r * 0.55, ky = y - r * 0.5 + i * r * 0.55;
    cellOver(p, kx, ky, HILIGHT);
    cellOver(p, kx + side, ky, tone === SHADE ? BASE : LIGHT);
  }
  stroke(p, x - r * 0.7, y + r * 0.35, x + r * 0.7, y + r * 0.2, DEEP);
  cellOver(p, x - r * 0.45, y - r * 0.6, SPEC);
}

function volcatrix(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const hipX = cx + 4, hipY = G - 44;
  const chestX = cx - 4, chestY = G - 68;
  const headX = cx - 12, headY = G - 92;
  // Lead shoulder is the near one, on the left; the rear shoulder is behind.
  const leadSh: Pt = [cx - 19, G - 72], rearSh: Pt = [cx + 14, G - 74];

  /* --- the tail, laid down first. It sweeps out low and almost along the floor
     before its tip lifts, which is the only way a tail on a biped reads as a
     tail: carried high beside the shoulder it simply becomes a third arm, which
     is exactly what the first pass at this looked like. */
  const tail = path([[hipX + 10, hipY + 8], [cx + 30, G - 22], [cx + 46, G - 16], [cx + 54, G - 26]]);
  limbPath(p, tail, 17, 6, BASE, { lit: HILIGHT, dark: DEEP });
  rings(p, tail.slice(0, Math.round(tail.length * 0.55)), 3, 7, ACCENT, HILIGHT);
  const ttip = tail[tail.length - 1]!;
  flameTongue(p, ttip[0], ttip[1] + 3, 18, 2);

  /* --- far leg: the rear foot, turned out and carrying the load. */
  legDigitigrade(p, hipX + 12, hipY + 8, G - 1, { tone: SHADE, side: 1, thick: 15, ankle: 8, footHalf: 9, claws: true });
  // Far arm, cocked back at the hip. It goes down before the torso so the
  // torso's seam presses over its root and it sits behind the ribs.
  limbPath(p, [[rearSh[0], rearSh[1]], [cx + 28, G - 62], [cx + 30, G - 46]], 14, 10, SHADE);
  volFist(p, cx + 31, G - 40, 7, 1, SHADE);

  /* --- the torso: a wedge. Wide across the shoulders, tucked at the waist,
     square at the hips. A standing animal that is the same width all the way
     down is a barrel with a head on it. */
  limbPath(p, [[chestX, chestY - 6], [cx, G - 54], [hipX, hipY]], 42, 32, BASE, { bulge: -5 });
  blobFront(p, chestX - 2, chestY, 22, 16, BASE);
  blobFront(p, hipX, hipY + 2, 20, 14, BASE);
  // Pectoral shelf and a flat belly under it, both pale, with the soot chevron
  // this species wears on its chest.
  blob(p, chestX - 4, chestY + 6, 16, 9, LIGHT);
  bellyPlate(p, cx - 1, G - 52, 13, 12, 3);
  // Shoulder caps, so the arms come out of something.
  blobFront(p, leadSh[0], leadSh[1], 12, 11, BASE);
  blobFront(p, rearSh[0], rearSh[1], 10, 10, SHADE);
  // Sternum line down the middle of the pale chest. A soot band ruled across it
  // was tried for two passes: half of it landed behind the lead arm and the
  // half that showed read as a hole punched in the ribs.
  seamPath(p, [[chestX - 4, chestY - 2], [chestX - 3, chestY + 10], [cx - 1, G - 58]] as Pt[], DEEP, HILIGHT);

  /* --- near leg: the lead foot, forward and light, knee driven out. */
  legDigitigrade(p, hipX - 12, hipY + 10, G, { tone: BASE, side: -1, thick: 17, ankle: 9, footHalf: 10, front: true, claws: true });

  /* --- the collar: blazelynx's spine crest closed up into a ruff round the
     shoulders. Longest at the sides, shortest over the nape, so the head has
     somewhere to sit -- a ruff of even length swallows the skull, and one
     centred on the jaw rather than on the shoulders swallows the face. It goes
     down before the head and before the lead arm, so both of those cover its
     roots and it reads as something the animal is wearing. */
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const a = Math.PI * (1.02 + t * 0.96);
    const len = 9 + Math.abs(t - 0.5) * 16;
    const ox = cx - 3 + Math.cos(a) * 21, oy = G - 70 + Math.sin(a) * 9;
    tuft(p, ox, oy, len, a, 0.3, i % 2 ? BASE : LIGHT);
    if (i % 2 === 0) cellOver(p, ox + Math.cos(a) * len * 0.8, oy + Math.sin(a) * len * 0.8, SPEC);
  }

  /* --- the lead arm, up in guard. Elbow low and in, forearm driving forward
     and out, fist held well clear of the face.
     The fist used to sit at chin height, which is where a boxer's lead hand
     actually goes and which is wrong here: at 64 pixels the skull, the muzzle
     and the fist stacked into one continuous pale lump down the whole left edge
     of the icon and the head stopped being findable. Dropped fourteen cells and
     pushed five further forward, the guard reads as a *jab* -- the fist is the
     leftmost thing on the sprite, the head is the highest, and there is eleven
     cells of clear air between them, which survives being halved. */
  const elbow: Pt = [cx - 28, G - 52], fist: Pt = [cx - 45, G - 60];
  limbPath(p, [[leadSh[0], leadSh[1] + 4], elbow, fist], 14, 9, BASE, { front: true, bulge: 2 });
  crease(p, elbow[0], elbow[1], 6);
  // Banded forearm: three soot rings with a lit lip riding each one. This is
  // the species' second signature and the only reason a smooth orange cylinder
  // reads as a wrapped arm at sprite size.
  // Three cells of soot to one of lit lip, and drawn by hand rather than with
  // `rings`: a one-cell ring on a nine-cell forearm is a scratch, and at this
  // size the lit lip wins the contrast fight and the bands read as pale scars.
  const fore = path([[elbow[0], elbow[1]], [cx - 37, G - 57], [fist[0], fist[1]]]);
  for (const t of [0.24, 0.52, 0.8]) {
    const i = Math.round(t * (fore.length - 1));
    const q = fore[i]!, nrm = normalAt(fore, i);
    for (let k = -1; k <= 1; k++) {
      stroke(p, q[0] - nrm[0] * 6 + k * nrm[1], q[1] - nrm[1] * 6 - k * nrm[0],
        q[0] + nrm[0] * 6 + k * nrm[1], q[1] + nrm[1] * 6 - k * nrm[0], ACCENT);
    }
    stroke(p, q[0] - nrm[0] * 6 - 2 * nrm[1], q[1] - nrm[1] * 6 + 2 * nrm[0],
      q[0] + nrm[0] * 6 - 2 * nrm[1], q[1] + nrm[1] * 6 + 2 * nrm[0], HILIGHT);
  }
  volFist(p, fist[0] - 1, fist[1], 8, -1);

  /* --- the head, chin tucked, carried low between the shoulders. */
  limbPath(p, [[headX + 12, chestY - 6], [headX + 5, headY + 11]], 20, 17, BASE, { front: true });
  blobFront(p, headX, headY, 16, 14, BASE);
  for (const q of arc(headX, headY - 7, 12, 6, Math.PI * 1.08, Math.PI * 1.96, 20)) {
    cellOver(p, q[0], q[1] + 2, DEEP);
    cellOver(p, q[0], q[1] + 1, HILIGHT);
  }

  // Ears: short and pinned back, which is the one place this animal differs
  // from the two before it in the line. A cat that has decided to fight flattens
  // its ears, and half the length of blazelynx's says so at a glance.
  earPointed(p, headX + 11, headY - 8, 12, 9, 1, { tone: SHADE, inner: SHADE, front: true });
  // Cavity gated on the rear view, or the back sprite grows a pair of eyes.
  earPointed(p, headX - 4, headY - 11, 14, -9, -1, { tone: BASE, inner: p.back ? SHADE : INNER, front: true });
  for (const [ex, ey, ln, le, sd] of [[headX + 11, headY - 8, 12, 9, 1], [headX - 4, headY - 11, 14, -9, -1]] as const) {
    const w = Math.max(4, ln * 0.55), tx = ex + sd * le, ty = ey - ln;
    poly(p, [[tx, ty], [lerp2(ex - w * 0.5, tx, 0.68), lerp2(ey + 1, ty, 0.68)],
      [lerp2(ex + w * 0.6, tx, 0.68), lerp2(ey, ty, 0.68)]], ACCENT);
  }

  // The muzzle wedge and an open snarl. Same construction as blazelynx, one
  // size up, so the line reads as one animal at three ages.
  polyFront(p, [[headX + 1, headY + 5], [headX - 12, headY + 8], [headX - 11, headY + 16], [headX + 1, headY + 17]], LIGHT, DEEP, 1);
  stroke(p, headX, headY + 6, headX - 11, headY + 8, HILIGHT);
  poly(p, [[headX - 13, headY + 7], [headX - 8, headY + 7], [headX - 10, headY + 12]], ACCENT);
  cell(p, headX - 12, headY + 7, ACCENT_LIT);
  // A snarl with real teeth in it. Built as a rectangle of cavity for two
  // passes and it read as a letterbox cut in the jaw; the jaw helper's lit
  // upper lip is what turns a black hole into an open mouth.
  if (!p.back) {
    jaw(p, headX - 6, headY + 13, 6, { dir: -1, open: 0.55, teeth: 3 });
    // The jaw helper cuts its teeth in ACCENT_LIT, which on a soot accent comes
    // back a warm grey -- the snarl looked like it was full of gravel. Repaint
    // them in the body ramp's specular step, which is the cream this palette
    // actually has.
    teeth(p, headX - 10.5, headY + 14, 3, 2.5, 1, 9, SPEC);
    teeth(p, headX - 10.2, headY + 16, 3, 2, -1, 8.4, SPEC);
  }

  if (p.back) { p.face(headX, headY, 17); return; }

  /* --- the face. The hardest eyes in the line: narrow almonds jammed under a
     bone brow, which is what the 'angry' style is built for. Blazelynx keeps
     the cub's slit pupil; this one has stopped being a cat looking at you and
     started being something squaring up.
     The iris is INNER -- the dark warm red this palette derives for cavities.
     Given the bright accent instead, the almonds fill with pale grey and the
     whole face reads as alarm rather than as aggression, which is the exact
     trap the eye helper warns about and which the first pass fell into. */
  eye(p, headX - 7, headY - 1, 3.8, 'angry', { side: -1, iris: INNER });
  eye(p, headX + 8, headY - 3, 3.1, 'angry', { side: 1, iris: INNER });
  p.face(headX, headY, 17);
}

/* ============================================================ emberbore */

/**
 * "Squat armoured digger with a glowing drill-snout."
 *
 * The Vellum entry is the design: "bores through rock by heating it until it
 * gives up. The tunnels it leaves are perfectly round and slightly warm for a
 * week." So the animal is a wedge with a cone on the front of it, and the heat
 * is not a decoration -- it is the *tool*. The drill glows hottest at the tip
 * and the plates on its back have fire showing in the gaps between them,
 * because whatever is inside this thing is what melts the rock.
 *
 * Posture: driving forward and down. The shoulders are the highest point, the
 * hips are lower, the snout is almost on the floor and one foreclaw is already
 * buried in it. Everything slopes the way the animal is going.
 *
 * This is the one species in the group whose palette declares a *real* accent
 * -- a quarry grey -- so unlike the cats it can spend ACCENT on plate and claw
 * and keep the whole body ramp for heat. That contrast is what makes it look
 * like a different kind of creature from the cats rather than a recolour.
 */
function emberbore(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Flame is its first type, so the stock pass would grow grey tongues off the
  // plated back -- fire the colour of the armour. The heat here is in the drill
  // and in the seams, where the animal actually makes it.
  p.noTypeTraits();

  const shX = cx - 6, shY = G - 48;
  const hipX = cx + 32, hipY = G - 34;
  const headX = cx - 30, headY = G - 32;

  /* --- tail: a short heavy cone, low behind. */
  limbPath(p, [[hipX + 4, hipY + 4], [cx + 40, G - 24], [cx + 48, G - 16]], 16, 5, SHADE, { lit: LIGHT, dark: DEEP });

  /* --- far legs, stubby braced columns in the recessed tone. */
  legColumn(p, hipX + 2, hipY + 10, G - 2, { tone: SHADE, side: 1, thick: 12, footHalf: 8, claws: true });
  legColumn(p, shX + 4, shY + 18, G - 2, { tone: SHADE, side: -1, thick: 11, footHalf: 8, claws: true });

  /* --- the body: one long wedge, highest at the shoulder and sloping down to
     the hip and down again to the snout. A digger is a ramp. */
  limbPath(p, [[shX - 16, shY + 6], [cx + 10, shY + 8], [hipX, hipY + 2]], 42, 32, BASE, { bulge: 2 });
  blobFront(p, shX, shY, 28, 21, BASE);
  blobFront(p, hipX, hipY, 19, 17, BASE);
  // A pale underside so the wedge has a floor.
  blob(p, cx + 6, G - 20, 30, 8, LIGHT);

  /* --- the plated back. Five overlapping scutes riding the actual top contour,
     each with its own lit bevel and dark gutter, and a hot seam glowing in the
     gap in front of it. The seams are the whole species in three cells each:
     armour with fire showing through the joins. */
  shell(p, shX + 6, shY - 6, 40, 22, 9, ACCENT);
  // Hot cracks between the scutes: three short jagged runs of body-ramp pale
  // with a white core, cut across the shell where its own seams already are.
  for (const [ax, ay, bx, by] of [
    [shX - 14, shY - 22, shX - 6, shY + 2], [shX + 14, shY - 26, shX + 20, shY - 2],
    [shX + 32, shY - 18, shX + 34, shY + 2],
  ] as const) {
    for (const q of path([[ax, ay], [lerp2(ax, bx, 0.5) + 3, lerp2(ay, by, 0.5)], [bx, by]] as Pt[])) {
      cellOver(p, q[0], q[1], LIGHT);
      cellOver(p, q[0] - 1, q[1], SPEC);
      cellOver(p, q[0] + 1, q[1], ACCENT_DARK);
    }
  }
  speckle(p, shX - 20, shY + 8, hipX + 10, hipY + 12, 0.06, ACCENT_DARK);

  /* --- near hind leg, planted and braced. */
  legColumn(p, hipX - 12, hipY + 12, G, { tone: BASE, side: 1, thick: 15, footHalf: 10, front: true, claws: true, footTone: ACCENT });

  /* --- the head, low and forward, barely clear of the floor. */
  limbPath(p, [[shX - 18, shY + 8], [headX + 10, headY]], 26, 22, BASE, { front: true });
  blobFront(p, headX, headY, 15, 13, BASE);
  // A grey brow plate over the skull, so the head is armoured too and the eyes
  // are set *under* something.
  plate(p, [[headX - 13, headY - 4], [headX - 6, headY - 12], [headX + 9, headY - 10], [headX + 12, headY - 1]], ACCENT);

  /* --- the drill. A ringed cone driven forward and down out of the face,
     grey at the root and white-hot for the last third. The rings have to get
     tighter towards the tip or it is a traffic cone; the glow has to start
     well back from the point or it is a lightbulb. */
  const dRoot: Pt = [headX + 2, headY + 2], dTip: Pt = [headX - 38, headY + 11];
  const drill = path([dRoot, [headX - 20, headY + 5], dTip]);
  limbPath(p, drill, 24, 3, ACCENT, { front: true, lit: ACCENT_LIT, dark: ACCENT_DARK });
  // Rings drawn as *arcs* rather than straight bars, closing up towards the
  // point. A cone banded with straight lines is a flat wedge with stripes on
  // it, which is what two passes at this looked like; a curved band is the only
  // thing that says the surface goes round the back.
  for (const t of [0.12, 0.27, 0.4, 0.5, 0.59, 0.66, 0.72]) {
    const i = Math.round(t * (drill.length - 1));
    // Three quarters of the local radius, never the whole of it: an arc drawn
    // to the exact edge lands half its cells outside the mass, `cellOver`
    // discards them, and the ring comes out as a dotted line -- which is why
    // the first version of this drill looked like a plain flat wedge.
    const q = drill[i]!, hh = (12.5 * (1 - t) + 1.5) * 0.78;
    for (const r of arc(q[0], q[1], 3.4, hh, Math.PI * 0.5, Math.PI * 1.5, 16)) {
      cellOver(p, r[0], r[1], ACCENT_DARK);
      cellOver(p, r[0] + 1, r[1], ACCENT_DARK);
      cellOver(p, r[0] - 1, r[1], ACCENT_LIT);
    }
  }
  // The hot end. Three nested cones and then the front third's ring bands
  // repainted in the same heat, so the glow is *in the threads* rather than
  // dipped onto the point like paint.
  //
  // Run over the front quarter only -- which is where it was -- the whole
  // gradient is twelve cells of a forty-cell drill and it halves to six for the
  // party icon, where it disappears: the icon showed a plain grey spike, and a
  // grey spike is not "bores through rock by heating it until it gives up", it
  // is a beak. Widened to the front two fifths there is now a real ramp on it,
  // stone to orange to cream to white, and the orange step is the one doing the
  // work at 64 pixels. It still starts well back from the point, which is what
  // stops the thing reading as a lightbulb.
  for (const [s, tone] of [[0.42, LIGHT], [0.22, HILIGHT], [0.09, SPEC]] as const) {
    const b: Pt = [lerp2(dTip[0], dRoot[0], s), lerp2(dTip[1], dRoot[1], s)];
    const w = 25 * s;
    poly(p, [[b[0] + 2, b[1] - w], [dTip[0] + 1, dTip[1]], [b[0] - 2, b[1] + w]], tone);
  }
  for (const t of [0.66, 0.74, 0.82, 0.9, 0.96]) {
    const i = Math.round(t * (drill.length - 1));
    const q = drill[i]!, hh = (12.5 * (1 - t) + 1.5) * 0.78;
    for (const r of arc(q[0], q[1], 2.6, hh, Math.PI * 0.5, Math.PI * 1.5, 12)) {
      cellOver(p, r[0], r[1], LIGHT);
      cellOver(p, r[0] - 1, r[1], SPEC);
    }
  }

  /* --- the near foreclaw, already buried. A digger with its hand in the air is
     a digger doing nothing; the claw in the floor is what makes this a working
     animal, and it costs three cells of dark under the toes. */
  limbPath(p, [[shX - 14, shY + 14], [cx - 26, G - 26], [cx - 30, G - 12]], 18, 13, BASE, { front: true, bulge: 2 });
  crease(p, cx - 26, G - 26, 7);
  blobFront(p, cx - 30, G - 10, 11, 8, ACCENT);
  cellOver(p, cx - 34, G - 15, ACCENT_LIT);
  // Three short heavy claws driven straight down, each with a dark gutter beside
  // it. Long thin ones splayed sideways read as a feather duster, which is
  // precisely what the first pass grew on the end of this arm.
  for (let i = 0; i < 3; i++) {
    const kx = cx - 38 + i * 8;
    poly(p, [[kx - 3, G - 13], [kx + 3, G - 13], [kx + 1, G - 1]], ACCENT_LIT);
    stroke(p, kx - 3, G - 13, kx + 1, G - 1, ACCENT_DARK);
    stroke(p, kx + 4, G - 12, kx + 4, G - 3, DEEP);
  }

  if (p.back) { p.face(headX, headY, 15); return; }

  /* --- the face. Two small hooded eyes set deep under the brow plate: this
     animal is not looking at you, it is looking at the rock. Small and calm is
     the read, and hooded is the only eye in the box that gives both. */
  eye(p, headX - 6, headY - 2, 3.6, 'hooded', { side: -1, iris: ACCENT_LIT, lid: BASE });
  eye(p, headX + 7, headY - 3, 3.1, 'hooded', { side: 1, iris: ACCENT_LIT, lid: BASE });
  p.face(headX, headY, 15);
}

/* ============================================================= sootmoth */

/**
 * "Broad-winged moth with ember-lit wing edges."
 *
 * The trap with any moth is the front view: two identical wings either side of
 * a body is a Rorschach blot, not an animal. So this one is drawn in three
 * quarters, perched -- near wing forward and wide open, far wing behind it in
 * the recessed tone and half hidden, body turned, head turned further. Nothing
 * on it is mirrored.
 *
 * "Ember-lit wing edges" is taken literally: the outer margin of each wing is a
 * band of the pale body tone with white-hot scallops on the very rim, so the
 * wing looks like paper that has been burning from the edge inward. The dark
 * wing field behind that band is where the accent goes -- and since this
 * species' accent is soot, that is exactly what it is for.
 */
function sootmoth(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const thorX = cx - 2, thorY = G - 48;
  const headX = cx - 16, headY = G - 58;

  /**
   * One wing, built with `fin`: a membrane polygon with visible rays running
   * back to a root. That is a moth wing's actual anatomy and it is already in
   * the box.
   *
   * The first version drew each wing as a closed `path` loop through root, mid,
   * tip, lobe and back. Catmull-Rom happily rounds a loop like that into a
   * kidney bean, and the creature came out as an orange banana with sticks
   * under it. A wing is a fan from a point, not a closed curve.
   */
  const wing = (root: Pt, edge: Pt[], tone: number, band: number, hot: number, spot: number): void => {
    fin(p, root, edge, { tone, rays: 5, ray: ACCENT });
    // The burnt margin, inset from the free edge *towards the root*. Painted
    // along the edge normal it wanders off the wing wherever the outline turns;
    // towards the root it can only ever land on membrane.
    const dense = path(edge);
    for (let i = 0; i < dense.length; i++) {
      const q = dense[i]!;
      const dx = root[0] - q[0], dy = root[1] - q[1], d = Math.hypot(dx, dy) || 1;
      for (let k = 0; k <= 4; k++) cellOver(p, q[0] + (dx / d) * k, q[1] + (dy / d) * k, band);
      if (i % 8 < 3) {
        cellOver(p, q[0], q[1], hot);
        cellOver(p, q[0] + dx / d, q[1] + dy / d, hot);
      }
    }
    // The eyespot: a coal still burning in the middle of the wing. A soot ring
    // with a *pale* core, not the warm grey the accent ramp's lit end gives on
    // this palette -- that version came out looking like a rivet.
    if (spot > 0) {
      const m = dense[Math.round(dense.length * spot)]!;
      const ex = lerp2(root[0], m[0], 0.6), ey = lerp2(root[1], m[1], 0.6);
      blob(p, ex, ey, 6.5, 5.8, ACCENT);
      blob(p, ex, ey, 4.4, 3.8, band);
      blob(p, ex - 0.5, ey - 0.5, 2.6, 2.2, hot);
    }
  };

  /* --- the far pair, behind everything and in the recessed tone: shorter,
     steeper and swept the other way. Two wings at the same angle flatten the
     creature straight back into the symmetric blot the pose exists to avoid. */
  wing([thorX, thorY - 4], [[thorX - 2, thorY - 12], [cx - 8, G - 92], [cx - 26, G - 84],
    [cx - 34, G - 64], [cx - 20, G - 58], [thorX - 8, thorY - 2]], SHADE, BASE, LIGHT, 0.48);

  /* --- six legs. Thin, dark and splayed forward: an insect leg is a wire, and
     a wire is the one thing in this library that must not be drawn thick. */
  for (let i = 0; i < 3; i++) {
    const bx = thorX - 7 + i * 7, fx = bx - 18 + i * 10;
    limbPath(p, [[bx, thorY + 8], [fx + 7, G - 20], [fx, G - 1]], 4, 2, i === 1 ? SHADE : ACCENT_DARK);
    stroke(p, fx - 3, G - 1, fx + 4, G - 1, ACCENT_DARK, false);
  }

  /* --- the abdomen: a segmented cone curving down and back off the thorax. */
  const abd = path([[thorX + 6, thorY + 2], [cx + 16, G - 36], [cx + 26, G - 20]]);
  limbPath(p, abd, 19, 6, BASE, { front: true, lit: LIGHT, dark: DEEP });
  rings(p, abd, 4, 8, ACCENT, HILIGHT);

  /* --- the thorax: a ball of fur, jagged all round, which is most of what
     separates a moth from a butterfly at a glance. */
  blobFront(p, thorX, thorY, 14, 12, BASE);
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.5 + i / 10 * 1.9);
    tuft(p, thorX + Math.cos(a) * 12, thorY + Math.sin(a) * 10, 6, a, 0.4, i % 2 ? LIGHT : BASE);
  }
  blob(p, thorX - 4, thorY - 3, 8, 6, LIGHT);

  /* --- the near pair: a long forewing swept up and back, and a shorter
     hindwing lobe under it. Two lobes, because one triangle is a kite. */
  wing([thorX + 4, thorY + 4], [[thorX + 12, thorY], [cx + 28, G - 40], [cx + 40, G - 24],
    [cx + 22, G - 14], [thorX + 8, thorY + 12]], SHADE, BASE, LIGHT, 0);
  wing([thorX + 4, thorY - 4], [[thorX + 6, thorY - 12], [cx + 6, G - 96], [cx + 30, G - 88],
    [cx + 50, G - 62], [cx + 34, G - 54], [thorX + 14, thorY - 2]], BASE, LIGHT, SPEC, 0.42);

  /* --- the antennae: two feathered plumes swept up and forward, and the second
     signature -- without them this is a very small bird. Each is a curved shaft
     with short barbs stepped down both sides, drawn thin because anything that
     leaves the silhouette pays two cells of ink for it, and drawn *before* the
     head so the head covers their roots. Long barbs close together on a short
     shaft simply fill in, and the first version came out as two fuzzy pom-poms
     sat on the face. */
  // Both of them carry a lit leading edge now, and they are swept wider apart.
  // Drawn in flat accent they were two soot plumes laid over the far wing --
  // which is itself painted in the recessed tone -- and dark on dark is the one
  // thing the party icon cannot resolve: at 64 pixels the antennae were simply
  // gone and the head was a smudge. One pale cell riding each shaft costs
  // nothing and puts them back.
  for (const [dx, dy] of [[-31, -16], [-16, -32]] as const) {
    const ant = path([[headX - 2, headY - 4], [headX + dx * 0.5, headY + dy * 0.56], [headX + dx, headY + dy]]);
    limbPath(p, ant, 4, 2, ACCENT);
    for (let i = 1; i < ant.length; i++) {
      const q = ant[i]!, n = normalAt(ant, i);
      cellOver(p, q[0] + n[0] * 1.6, q[1] + n[1] * 1.6, LIGHT);
    }
    for (let i = 3; i < ant.length - 1; i += 4) {
      const q = ant[i]!, n = normalAt(ant, i);
      const l = 3.6 * (1 - (i / ant.length) * 0.45);
      stroke(p, q[0], q[1], q[0] + n[0] * l, q[1] + n[1] * l, HILIGHT, false);
      stroke(p, q[0], q[1], q[0] - n[0] * l, q[1] - n[1] * l, ACCENT_DARK, false);
    }
    cell(p, headX + dx, headY + dy, SPEC);
  }

  /* --- the head: small, furry, and turned further than the body. */
  blobFront(p, headX, headY, 9, 8, BASE);
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.62 + i / 5 * 0.9);
    tuft(p, headX + Math.cos(a) * 8, headY + Math.sin(a) * 7, 5, a, 0.4, LIGHT);
  }

  if (p.back) { p.face(headX, headY, 10); return; }

  /* --- the face. One enormous compound dome and a smaller far one: a lattice
     with a single soft catchlight is the only way a faceted eye reads at this
     size, and no other Kin in the group has anything like it. */
  eye(p, headX - 4, headY + 1, 5.4, 'compound', { side: -1 });
  eye(p, headX + 7, headY - 1, 3.6, 'compound', { side: 1 });
  // The proboscis, curled under the face. Two cells of silhouette that say
  // "this thing drinks" and stop the head being a fur ball.
  limbPath(p, [[headX - 5, headY + 7], [headX - 11, headY + 11], [headX - 8, headY + 15]], 4, 2, ACCENT_DARK);
  p.face(headX, headY, 10);
}

/* ============================================================= gravelet */

/**
 * "Scruffy digger caked in loose grit, oversized foreclaws."
 *
 * Small, low-value, lives in the spoil heap and eats what the quarry throws
 * away. It should look like it has been sleeping in a pile of rubble, because
 * it has: the crust on its back is not armour but *dirt* -- irregular lumps in
 * the ochre accent, none of them the same size, sitting on top of the fur
 * rather than growing out of it. Armour is symmetric and grit is not, and that
 * difference is the whole distance between this and emberbore.
 *
 * The posture is a beggar's: sat back on its haunches with both scoop claws up
 * in front of its chest, head tilted, one claw higher than the other. That is
 * the same trick rilltail uses and it works for the same reason -- a small
 * animal sitting up is a shape nothing else on the roster shares.
 */
function gravelet(p: Pen): void {
  const G = p.ground, cx = p.cx;

  // The stock terra pass, off -- and this is the single biggest thing wrong
  // with the last version of this creature, which I diagnosed as "a pile of
  // bumps" without working out where most of the bumps were coming from.
  // `terra` walks the bottom contour and drops a five-cell dark pebble every
  // five columns, then knocks chips out of the outline every eleventh edge
  // cell. On a creature whose whole silhouette is one low arc, that is a row of
  // eight matched beads strung right along the arc plus a ragged rim, and it
  // buries the three grit lumps this animal is actually supposed to have.
  // The other four in the group all hand-place their type read; so does this
  // one now. The crust below IS the terra, and there are three of them.
  p.noTypeTraits();

  const bodyX = cx + 5, bodyY = G - 29;
  const headX = cx - 14, headY = G - 65;

  /* --- a stubby tail, and the far hind foot, both behind. */
  limbPath(p, [[bodyX + 16, bodyY - 6], [cx + 32, G - 26], [cx + 37, G - 14]], 12, 5, SHADE, { lit: LIGHT, dark: DEEP });
  paw(p, cx + 22, G - 1, 9, { tone: SHADE, toes: 3, long: true, claws: true });
  // Far arm, tucked in behind the chest.
  limbPath(p, [[cx + 2, G - 44], [cx + 12, G - 34]], 11, 8, SHADE);

  /* --- the body: ONE egg sat on the floor, and nothing on the far side of it
     allowed to break that arc.
     This is the fix the last pass earned. There used to be a separate haunch
     mass, four grit lumps strung down the flank and a fringe of guard hair, and
     every one of them put another bump on the same outline -- filled flat the
     animal came back as a pile of rubble with eyes rather than as a specific
     small digger. One clean rump means the foreclaws are the only things that
     interrupt the silhouette, and the foreclaws are the species. */
  blob(p, bodyX, bodyY, 27, 26, BASE);
  // Neck: narrow, and kept well inside the body outline. Run wide -- it was
  // thirty-six cells -- it lays its own lit flank diagonally across the pale
  // chest and the creature comes out wearing a bandolier.
  limbPath(p, [[bodyX - 8, bodyY - 12], [cx - 10, G - 50], [cx - 12, G - 57]], 24, 21, BASE);
  // The rump: a dark rim following that one arc, with a mid tone inside it.
  // Rim and no lumps is what turns a plain oval into a haunch.
  for (const q of arc(bodyX, bodyY, 26.5, 25.5, -Math.PI * 0.46, Math.PI * 0.44, 24)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0] - 1, q[1], SHADE);
    cellOver(p, q[0] - 2, q[1], SHADE);
  }
  // Near hind foot, splayed forward off the haunch. Three toes, not four: on a
  // foot this wide four are a row of matched knuckles, which is one more run of
  // repeating bumps on an animal that had far too many of them.
  // Body-toned, not cream. Painted in the pale step it is a flat slab the same
  // value as the bib directly above it, and the two run together into one
  // shapeless cream front with a line across it.
  paw(p, bodyX - 27, G - 1, 9.5, { tone: BASE, toes: 3, long: true, claws: true });
  // A pale bib down the chest and belly -- the only large flat value on an
  // animal that is otherwise tan on tan. It is one mass now rather than two,
  // and the arms are routed clear of it below.
  blob(p, cx - 11, G - 38, 12, 12, LIGHT);
  blob(p, cx - 8, G - 22, 16, 12, LIGHT);

  /* --- the grit crust. THREE lumps, on the top contour of the shoulder where
     they cut real notches into the outline. Strung down the flank -- which is
     where the four of them were -- they are beads on a surface that is already
     ochre on tan, and they buy the silhouette nothing at all.
     The sizes stay deliberately unequal: a row of matched lumps is armour, and
     armour is emberbore's job. */
  const backLine = path([[cx + 1, G - 54], [cx + 14, G - 49], [cx + 25, G - 38]] as Pt[]);
  const LUMP = [8.5, 6, 4.2];
  for (let i = 0; i < LUMP.length; i++) {
    const q = backLine[Math.round((i / (LUMP.length - 1)) * (backLine.length - 1))]!;
    const r = LUMP[i]!;
    // Lifted six tenths of a radius off the contour rather than three, so each
    // lump stands proud enough to survive being halved for the party icon.
    blobFront(p, q[0], q[1] - r * 0.62, r, r * 0.82, ACCENT);
    // Dark under, lit on top. Without both, a lump is a stain.
    for (const s of arc(q[0], q[1] - r * 0.62, r * 0.92, r * 0.76, 0, Math.PI, 12)) cellOver(p, s[0], s[1], ACCENT_DARK);
    blob(p, q[0] - r * 0.3, q[1] - r * 1.05, r * 0.5, r * 0.3, ACCENT_LIT);
  }
  // Loose grains, but sparse: a heavy speckle over a tan animal in a tan accent
  // is not grit, it is noise, and it takes the shading with it.
  speckle(p, cx - 16, G - 52, bodyX + 18, G - 24, 0.04, ACCENT_DARK);
  // No guard hairs on the rump. They were there for a pass and all they did was
  // add three more lumps to an animal already made of lumps -- when everything
  // in a silhouette is a bump, nothing in it is a shape.

  /* --- the head: wide, blunt and tilted, with a flat digging snout on the
     front of it and two small round ears set low and wide. */
  limbPath(p, [[cx - 6, G - 46], [headX + 8, headY + 9]], 18, 16, BASE, { front: true });
  blobFront(p, headX, headY, 17, 15, BASE);
  // Ears set high enough to break the crown line. An ear entirely inside the
  // skull outline is an ear nobody sees, and on the rear view the bowls have to
  // stop being cavities or two dark holes on a blank face read as eyes.
  // The near ear is half again the far one and set higher. Two ears the same
  // size with a grit lump between them gave the skull three matched bumps in a
  // row, and at 64 pixels that is a tiara, not a head.
  const bowl = p.back ? SHADE : INNER;
  blobFront(p, headX + 14, headY - 8, 4.5, 4.8, SHADE, DEEP, 1.5);
  blob(p, headX + 15, headY - 7, 1.9, 2.1, bowl);
  blobFront(p, headX - 14, headY - 14, 6.8, 7.2, BASE, DEEP, 1.5);
  // A shallow bowl, not a filled one. At a third of the ear the dark disc sat
  // in the middle of a pale ring the size of an eye, level with and just above
  // the real eyes -- the animal read as having three of them.
  blob(p, headX - 15, headY - 13, 2.5, 2.9, bowl);
  for (const s of arc(headX - 15, headY - 13, 3.2, 3.6, Math.PI * 0.85, Math.PI * 1.85, 10)) cellOver(p, s[0], s[1], HILIGHT);
  // The snout: a broad flat pad, low on the face, with a wide nose on the end.
  polyFront(p, [[headX + 2, headY + 2], [headX - 16, headY + 5], [headX - 15, headY + 13], [headX + 2, headY + 13]], LIGHT, DEEP, 1);
  blob(p, headX - 15, headY + 6, 5, 3.4, ACCENT_DARK);
  cell(p, headX - 17, headY + 5, ACCENT_LIT);
  if (!p.back) {
    nostril(p, headX - 17, headY + 6, -1);
    mouthLine(p, headX - 9, headY + 12, 6, -1);
  }
  // NO grit on the skull. Three lumps were up here, then one, then a painted
  // skullcap, and every version of it failed the same way: a thirty-cell head
  // carrying two eyes twelve cells tall has no room left above the brows, so
  // the ochre came down to eye level, welded to both eye rings, and the animal
  // came out wearing spectacles. That was the loudest single fault on the last
  // pass and the head is worth more clean than tied.
  // What ties the crust to the head instead is grit on the *nape*, behind and
  // below the skull, where the neck meets the first lump of the back crest --
  // and a plain dark rim round the back of the cranium, which is form rather
  // than ornament and costs the face nothing.
  for (const s of arc(headX, headY, 16.5, 14.5, -Math.PI * 0.42, Math.PI * 0.34, 16)) {
    cellOver(p, s[0], s[1], SHADE);
    cellOver(p, s[0] - 1, s[1], SHADE);
  }
  for (const [gx, gy, gr] of [[headX + 18, headY + 12, 4.2], [headX + 11, headY + 18, 3]] as const) {
    blobFront(p, gx, gy, gr, gr * 0.78, ACCENT);
    for (const s of arc(gx, gy, gr * 0.9, gr * 0.72, 0, Math.PI, 10)) cellOver(p, s[0], s[1], ACCENT_DARK);
    blob(p, gx - gr * 0.3, gy - gr * 0.5, gr * 0.45, gr * 0.28, ACCENT_LIT);
  }

  /* --- the foreclaws. The name of the species is in these: two scoops far too
     big for the animal carrying them, held up in front of the chest at two
     different heights so the pose reads as mid-scrabble rather than as begging
     for food. Each is a flat spade of a hand with three long ochre claws. */
  const scoop = (hx: number, hy: number, ang: number, tone: number, big: number): void => {
    // A knuckle mass with three long tapered digging claws fanned off it. The
    // first version built the whole hand as one quadrilateral with `claw` tips
    // on the corners, and it came out as a folded newspaper: the claws have to
    // *be* the shape, not a detail hung off one.
    blobFront(p, hx, hy, big * 0.66, big * 0.6, tone);
    for (let i = -1; i <= 1; i++) {
      // Better than half a radian apart, and long. Three claws fanned narrowly
      // over twenty cells end up eight cells apart at the tip, their outlines
      // weld, and the whole hand comes back as one tan cylinder with a dark
      // end. Fanned this wide the spade has three points in the outline, which
      // is the one part of this animal that has to survive at 64 pixels.
      const a = ang + i * 0.56;
      const l = big * 2.15 * (1 - Math.abs(i) * 0.1);
      const tx = hx + Math.cos(a) * l, ty = hy + Math.sin(a) * l;
      // Wide at the root and only a little shorter: a *spade*, not a spike.
      // Drawn at half the knuckle's width these came out as three ochre twigs,
      // and three twigs on a tan animal are the first thing the party icon
      // throws away. Nine cells across the base survives being halved.
      limbPath(p, [[hx, hy], [lerp2(hx, tx, 0.5), lerp2(hy, ty, 0.5)], [tx, ty]],
        big * 0.64, 2, ACCENT, { lit: ACCENT_LIT, dark: ACCENT_DARK });
      // A lit point on each tip. Ochre claw against a tan body loses its own
      // edge; the pale tip is what puts three points back in the outline.
      cellOver(p, tx, ty, ACCENT_LIT);
      cellOver(p, tx - Math.cos(a), ty - Math.sin(a), ACCENT_LIT);
    }
    // The gaps, cut after every claw is down. Cut between them as they go on,
    // each one is buried by the next and the hand comes out a mitten.
    for (const i of [-0.5, 0.5]) {
      const a = ang + i * 0.56;
      for (let k = 0; k < 2; k++) {
        stroke(p, hx + Math.cos(a) * big * 0.4 + k, hy + Math.sin(a) * big * 0.4,
          hx + Math.cos(a) * big * 2.1 + k, hy + Math.sin(a) * big * 2.1, ACCENT_DARK);
      }
    }
    cellOver(p, hx - big * 0.3, hy - big * 0.35, HILIGHT);
  };
  // Both arms leave the shoulder and go straight out into clear air. They used
  // to be rooted at the far side of the chest and reach across it, and the two
  // tan bars they ruled over the cream bib read as a pair of straps -- which is
  // most of why this creature was tonal soup. Short arms, spades in the open.
  // Four cells lower than they were, too. Rooted at the old height the upper
  // arm's own dark seam ran straight across the jaw, and a black bar under the
  // chin at icon size is a creature with no lower face.
  limbPath(p, [[cx - 10, G - 44], [cx - 21, G - 44], [cx - 28, G - 46]], 13, 9, BASE, { front: true, bulge: 1 });
  scoop(cx - 32, G - 47, Math.PI * 1.13, BASE, 9.5);
  limbPath(p, [[cx - 8, G - 33], [cx - 19, G - 29], [cx - 25, G - 26]], 12, 8, BASE, { front: true, bulge: 1 });
  scoop(cx - 29, G - 25, Math.PI * 0.96, LIGHT, 8);

  if (p.back) { p.face(headX, headY, 17); return; }

  /* --- the face. Big round wet eyes with small pupils, set wide: this is the
     smallest and least dangerous thing in the group and it should look it. The
     two other diggers in the set are hooded and half shut; nothing else here
     looks straight at you.
     A cell smaller than they were, on both. At five and a half they filled the
     whole width of the skull and the two rings of sclera read as spectacles --
     the head lost its shape behind them. This is still by a distance the widest
     eye in the group and it still halves cleanly. */
  eye(p, headX - 7, headY - 3, 4.5, 'round', { side: -1, iris: ACCENT_DARK });
  eye(p, headX + 8, headY - 5, 3.4, 'round', { side: 1, iris: ACCENT_DARK });
  p.face(headX, headY, 17);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  blazelynx,
  volcatrix,
  emberbore,
  sootmoth,
  gravelet,
};
