/**
 * Design group D -- the birds.
 *
 * Six species that all have a beak, two wings and two feet, which is exactly
 * the trap. A bird drawn as "egg, head, wing, legs" six times is one bird in
 * six colours, and that is the failure this whole layer exists to fix. So none
 * of these six stands the same way as any other, and the thing you would name
 * if you were describing it is different every time:
 *
 *   pipwing    a chick: head nearly as big as its body, one stubby wing thrown
 *              up mid-flap, three pale sprigs on a dark cap.
 *   kestrelle  a falcon leaning into a headwind, body almost horizontal, both
 *              wings swept back into a V behind it, long banded tail trailing.
 *   galecrest  a storm raptor rearing with a crown of gold crest blades, one
 *              wing mantled down over its own feet, and a deeply forked tail.
 *   gullswift  a seabird on long orange stilts, angled forward and down over a
 *              dagger bill, grey wings folded into blades past a forked tail.
 *   slatewing  a roosting shard seen head-on: crouched almost flat, both wings
 *              held straight out as chiselled slabs, head turned in profile.
 *   craglide   a hunched cliff-hunter, shoulder slabs raised above a small sunk
 *              head with an enormous hooked stone beak.
 *
 * Two evolution lines run through it. pipwing -> kestrelle -> galecrest share a
 * dark crown cap, a barred breast and a crest that grows from three sprigs to a
 * crown. slatewing -> craglide share the slate scutes and the chisel-edged
 * wing, with the mass moving out of the wings and into the shoulders as it
 * grows up.
 *
 * The four gale species all opt out of the type character pass. It scallops
 * every trailing edge in the silhouette, which on a creature already made of
 * feathers turns the whole outline into frost damage -- the first render of
 * this file came back looking like four birds carved out of ice. The two stone
 * species keep theirs: chipped edges on a slate bird are exactly right.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, EYE_DARK, EYE_WHITE, HILIGHT,
  INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, blob, blobFront, cell, cellOver, eye, lerp, limbPath, mane,
  path, paw, poly, polyFront, stroke, taper, tuft, wingFeathered,
  type Pen, type Pt,
} from '../parts.js';

/* ------------------------------------------------------------- shared */

/**
 * The barred breast the blue line all wear: short chevrons across a pale front,
 * more of them and tighter as the animal grows up. Painted with `cellOver` so
 * they can never widen the chest by a cell.
 */
function barredBreast(p: Pen, x: number, y: number, half: number, rows: number, gap: number, v: number): void {
  for (let i = 0; i < rows; i++) {
    const yy = y + i * gap;
    const h = half * (1 - Math.abs(i - (rows - 1) / 2) / rows * 0.5);
    for (let d = -h; d <= h; d++) cellOver(p, x + d, yy + Math.abs(d) * 0.22, v);
  }
}

/**
 * One flight feather: a blade, widest a third of the way out, not a triangle.
 * A triangle two cells across at its root is two cells across for most of its
 * length and comes out as a stick, which is what the first pass at every wing
 * in this file looked like.
 */
function blade(p: Pen, x: number, y: number, len: number, ang: number, wide: number, v: number, edge = DEEP): void {
  const tx = x + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
  limbPath(p, [[x, y], [lerp(x, tx, 0.42), lerp(y, ty, 0.42)], [tx, ty]], wide, 2, v, { bulge: wide * 0.3 });
  // The trailing edge gets its own dark run, or two blades in the same tone
  // laid side by side weld into one paddle.
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  stroke(p, x + nx * wide * 0.5, y + ny * wide * 0.5, tx + nx * 1.2, ty + ny * 1.2, edge);
}

/**
 * A slate slab: a polygon with a lit lip along whichever edges face up and a
 * dark gutter under the ones that face down.
 *
 * This is `plate` from the toolkit with the accent ramp taken out of it. On a
 * grey bird with a warm stone accent, `plate` outlines every scute in gold and
 * the animal comes out looking upholstered.
 */
function slab(p: Pen, pts: Pt[], v: number, lit = HILIGHT, dark = DEEP): void {
  poly(p, pts, v);
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

/** The family crown cap: a dark hood over the top of a skull with a slanted,
 *  lit lower edge. All three of the blue line wear one, a little lower each
 *  time. `slope` tilts it; `drop` is how far down the skull it comes. */
function crownCap(p: Pen, x: number, y: number, rx: number, ry: number, drop: number, slope: number, v: number): void {
  for (let dy = -Math.ceil(ry) - 1; dy <= ry; dy++) {
    for (let dx = -Math.ceil(rx) - 1; dx <= rx + 1; dx++) {
      if ((dx / rx) ** 2 + (dy / ry) ** 2 > 1) continue;
      if (dy > drop + dx * slope) continue;
      cellOver(p, x + dx, y + dy, v);
    }
  }
  for (let dx = -Math.ceil(rx); dx <= rx; dx++) {
    const ly = drop + dx * slope;
    if ((dx / rx) ** 2 + (ly / ry) ** 2 > 1) continue;
    cellOver(p, x + dx, y + ly + 1, HILIGHT);
  }
}

/* ============================================================== pipwing */

/**
 * "Small round bird, oversized head, short tail."
 *
 * A chick, and everything is drawn to say so. The head is very nearly the size
 * of the body and sits straight on it with no neck at all; the legs are ten
 * cells long; the tail is three feathers that barely clear the rump; the eyes
 * are the largest in the group by half again.
 *
 * The pose is the near wing thrown up and open behind it. A fledgling that has
 * not worked flying out yet reads far better than a small bird standing still,
 * and it costs one limb drawn at a different angle -- it is also the only
 * reason a round animal reads as an animal rather than as a ball.
 */
function pipwing(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const bodyX = cx + 10, bodyY = G - 28;
  const headX = cx - 15, headY = G - 63;

  /* --- far wing: a small folded stub peeking over the far shoulder. */
  wingFeathered(p, bodyX - 8, bodyY - 12, 24, { tone: SHADE, side: 1, folded: true });

  /* --- tail: three short feathers off the rump, fanned down and back. Short
     is the brief, so they are barely longer than the body is deep. */
  for (let i = 0; i < 3; i++) {
    blade(p, bodyX + 15, bodyY + 5 + i * 3, 15 - Math.abs(i - 1) * 2, 0.12 + i * 0.30, 9, i === 1 ? BASE : SHADE);
  }

  /* --- far leg, short and behind. */
  taper(p, cx + 3, bodyY + 14, cx, G - 4, 6, 5, ACCENT);
  paw(p, cx, G, 5, { tone: ACCENT, toes: 3, claws: true, long: true, clawTone: ACCENT_DARK });

  /* --- the body: a ball, a touch wider than tall so it sits rather than
     stands. */
  blob(p, bodyX, bodyY, 25, 22, BASE);
  blob(p, bodyX - 13, bodyY + 3, 13, 16, LIGHT);
  barredBreast(p, bodyX - 14, bodyY - 3, 9, 3, 6, ACCENT);
  // Down along the underside: a round bird should be fluffy, not moulded.
  mane(p, path([[bodyX - 19, bodyY + 14], [bodyX, bodyY + 21], [bodyX + 17, bodyY + 12]] as Pt[]), 4, 5, BASE, HILIGHT);

  /* --- near leg, forward and lit. */
  taper(p, cx + 16, bodyY + 14, cx + 14, G - 4, 7, 5, ACCENT_LIT);
  paw(p, cx + 14, G, 6, { tone: ACCENT_LIT, toes: 3, claws: true, long: true, clawTone: ACCENT_DARK });

  /* --- the near wing, thrown up and back mid-flap. A short solid arm with
     three primaries off the end of it, and nothing more: a chick's wing is
     mostly stub. */
  const wrX = bodyX + 18, wrY = bodyY - 29;
  limbPath(p, [[bodyX + 2, bodyY - 13], [bodyX + 11, bodyY - 22], [wrX, wrY]], 20, 12, BASE,
    { front: true, lit: HILIGHT, dark: DEEP });
  for (let i = 0; i < 3; i++) {
    blade(p, wrX - 3, wrY + 3, 16 - Math.abs(i - 1) * 2, -1.30 + i * 0.32, 9, i === 1 ? SHADE : BASE);
  }
  cellOver(p, bodyX + 6, bodyY - 19, HILIGHT);

  /* --- the head, straight onto the shoulders. No neck at all, which alone is
     most of what makes an animal read as a baby. */
  blobFront(p, headX, headY, 23, 21, BASE);
  // The pale front is a throat, kept low and back. Sat any higher it runs into
  // the white of the eye and the two together read as one enormous target.
  blob(p, headX - 1, headY + 14, 14, 6, LIGHT);
  crownCap(p, headX, headY, 23, 21, -8, 0.20, ACCENT);

  /* --- three sprigs on the crown: the crest, before it is a crest. Pale, so
     they read against the dark cap instead of melting into it. */
  for (let i = 0; i < 3; i++) {
    const a = -1.86 + i * 0.26;
    const len = 17 - Math.abs(i - 1) * 4;
    const rx = headX - 6 + i * 6, ry = headY - 16;
    limbPath(p, [[rx, ry], [rx + Math.cos(a) * len * 0.5, ry + Math.sin(a) * len * 0.5],
      [rx + Math.cos(a) * len, ry + Math.sin(a) * len]], 7, 2.2, i === 1 ? LIGHT : SHADE, { front: true });
  }

  /* --- a small blunt bill. A chick's is short and deep, never a dagger. */
  poly(p, [[headX - 10, headY + 4], [headX - 29, headY + 11], [headX - 9, headY + 18]], ACCENT_LIT);
  stroke(p, headX - 11, headY + 5, headX - 27, headY + 11, SPEC);
  if (!p.back) {
    stroke(p, headX - 10, headY + 12, headX - 28, headY + 12, DEEP);
    cellOver(p, headX - 19, headY + 9, INNER);
  }

  if (p.back) { p.face(headX, headY, 24); return; }

  /* --- the eyes: enormous, round and wet, and the far one is smaller and
     higher because the head is turned a few degrees towards us. Nothing else
     in the group has an eye near this size, and that is the point -- a big
     round eye says "young", and this is the only young thing here. */
  // Set well apart, and the far one small. Two big dark discs any closer than
  // five cells merge their own ink and the chick comes out in sunglasses,
  // which is exactly what the first render of this face looked like.
  //
  // The iris is DEEP -- a mid slate, and the only fixed tone in this palette
  // that sits between the sclera and the pupil. Painted in ACCENT_DARK it is
  // the same value as the pupil and the eye is a flat black hole; painted in
  // ACCENT_LIT it is the same value as the sclera and the eye comes out as a
  // monocle, a pale hoop with a dot in it. Both of those got drawn before this
  // one did.
  eye(p, headX - 11, headY - 3, 5.8, 'round', { side: -1, iris: DEEP });
  eye(p, headX + 13, headY - 7, 4, 'round', { side: 1, iris: DEEP });
  p.face(headX, headY, 24);
}

/* ============================================================ kestrelle */

/**
 * "Falcon build, swept wings, banded chest."
 *
 * The Vellum entry is the design: it holds position in a headwind without
 * moving a feather. So it is leaning into one. The body is almost horizontal,
 * the head is pushed forward and low, and both wings are swept back off the
 * shoulders into a V that opens behind it -- the near one high, the far one
 * low, so the two never read as a mirrored pair.
 *
 * The result is a silhouette that points: a long arrowhead facing left with a
 * narrow banded tail streaming off the back. pipwing is a circle and galecrest
 * is a crowned tower; this one is a dart.
 */
function kestrelle(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const chestX = cx - 14, chestY = G - 48;
  const rumpX = cx + 22, rumpY = G - 42;
  const headX = cx - 40, headY = G - 68;

  /* --- far wing, swept back and LOW, in the recessed tone. Down first. */
  limbPath(p, [[rumpX - 14, rumpY - 12], [rumpX + 4, rumpY - 19], [rumpX + 18, rumpY - 22]], 17, 10, SHADE);
  for (let i = 0; i < 3; i++) {
    blade(p, rumpX + 16, rumpY - 21, 27 - i * 3, -0.20 + i * 0.24, 8, SHADE, DEEP);
  }

  /* --- the tail: long, narrow and banded, trailing down and back. A falcon's
     tail is nearly as long as its body and that proportion is half the read. */
  const tailPts: Pt[] = [[rumpX - 2, rumpY + 2], [rumpX + 18, rumpY + 8], [rumpX + 36, rumpY + 16]];
  limbPath(p, tailPts, 18, 13, BASE, { lit: HILIGHT, dark: DEEP });
  const dense = path(tailPts);
  for (let i = 1; i <= 3; i++) {
    const q = dense[Math.round((i / 4.6) * (dense.length - 1))]!;
    for (let k = -9; k <= 9; k++) {
      cellOver(p, q[0] - k * 0.16, q[1] + k, ACCENT);
      cellOver(p, q[0] - k * 0.16 - 1, q[1] + k, ACCENT);
      cellOver(p, q[0] - k * 0.16 + 1, q[1] + k, HILIGHT);
    }
  }
  // A hard dark band across the very end, the way a kestrel's tail is tipped.
  const tip = dense[dense.length - 1]!;
  for (let k = -8; k <= 8; k++) for (let d = 2; d <= 5; d++) cellOver(p, tip[0] - d, tip[1] + k, ACCENT);

  /* --- far leg, tucked back under the belly. */
  taper(p, cx - 2, G - 26, cx - 6, G - 6, 8, 6, ACCENT);
  paw(p, cx - 7, G - 1, 6, { tone: ACCENT, toes: 3, claws: true, long: true, clawTone: ACCENT_DARK });

  /* --- the body: a long tilted capsule, deep at the chest, tucked at the
     waist. A level barrel is a pigeon; the tilt is the entire posture. */
  limbPath(p, [[chestX, chestY], [cx + 4, chestY + 5], [rumpX, rumpY]], 34, 27, BASE, { bulge: -2 });
  blobFront(p, chestX - 2, chestY + 2, 17, 17, BASE);
  blobFront(p, rumpX + 1, rumpY - 1, 15, 16, BASE);
  blob(p, chestX - 5, chestY + 8, 15, 13, LIGHT);
  barredBreast(p, chestX - 6, chestY + 1, 11, 5, 5, ACCENT);
  for (const q of arc(cx + 2, chestY + 2, 20, 22, Math.PI * 0.16, Math.PI * 0.86, 22)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0], q[1] - 1, SHADE);
  }
  /* --- the mantle: a dark saddle over the back, laid along the actual top
     contour rather than ruled straight across it.

     Without it this animal was one flat pale value from bill to tail. A raptor
     is dark above and pale below, and that single division does more for the
     read than every feather on it -- it is also what makes the barred breast
     legible, because a pale chest only counts as pale against something. */
  for (let dx = 0; dx <= 44; dx++) {
    const bx = chestX - 12 + dx, t = dx / 44;
    const ty = p.m.top(Math.round(bx));
    if (ty < 0) continue;
    const depth = 6 + Math.sin(t * Math.PI) * 9;
    for (let k = 1; k <= depth; k++) cellOver(p, bx, ty + k, k > depth - 2 ? DEEP : SHADE);
  }

  /* --- near leg, planted and carrying the weight, forward of the far one. */
  taper(p, cx + 8, G - 28, cx + 12, G - 6, 9, 6, ACCENT_LIT);
  paw(p, cx + 12, G, 7, { tone: ACCENT_LIT, toes: 3, claws: true, long: true, clawTone: ACCENT_DARK });

  /* --- near wing, swept back and HIGH. Three long primaries off a short arm,
     each a blade rather than a spike. */
  limbPath(p, [[chestX + 16, chestY - 12], [cx + 8, chestY - 22], [cx + 20, chestY - 30]], 19, 11, SHADE,
    { front: true, lit: LIGHT, dark: DEEP });
  for (let i = 0; i < 3; i++) {
    blade(p, cx + 18, chestY - 29, 34 - i * 4, -0.46 + i * 0.26, 10, i === 1 ? BASE : SHADE);
  }
  stroke(p, chestX + 14, chestY - 16, cx + 16, chestY - 32, LIGHT);

  /* --- neck and head, driven forward and down. The neck is short and thick;
     a falcon has no visible one and the head sits proud of the chest. */
  limbPath(p, [[chestX + 6, chestY - 4], [headX + 11, headY + 10]], 20, 14, BASE, { front: true });
  blobFront(p, headX, headY, 19, 17, BASE);
  // The cap stops just above the eye, and the malar stripe below carries the
  // dark down past it. Run the hood any lower and the eye is inside it, which
  // on a head this size means no eye at all.
  crownCap(p, headX, headY, 19, 17, -7, 0.20, ACCENT);
  // Two swept crest feathers off the back of the cap -- pipwing's three sprigs
  // laid flat by the wind, and the middle stage of the line's crest. Two and
  // not five: this head already carries a hood, a cheek, a malar stripe, a
  // hooked bill and two eyes, and the version with a fan on the back of it as
  // well was unreadable at any size.
  limbPath(p, [[headX + 8, headY - 11], [headX + 21, headY - 16]], 7, 2, SHADE, { front: true });
  limbPath(p, [[headX + 10, headY - 7], [headX + 22, headY - 9]], 6, 2, BASE, { front: true });

  /* --- the bill: short, deep and hooked. A falcon's is a hook with a notch,
     never a cone. */
  poly(p, [[headX - 8, headY + 1], [headX - 26, headY + 6], [headX - 22, headY + 15], [headX - 7, headY + 14]], ACCENT_LIT);
  poly(p, [[headX - 26, headY + 6], [headX - 29, headY + 15], [headX - 21, headY + 14]], ACCENT_DARK);
  stroke(p, headX - 9, headY + 2, headX - 25, headY + 6, SPEC);
  // The cere: a hard dark band where the bill enters the face, which is what
  // stops a pale bill on a pale muzzle reading as a chipped cheek.
  stroke(p, headX - 8, headY + 1, headX - 7, headY + 14, ACCENT);
  if (!p.back) {
    stroke(p, headX - 8, headY + 10, headX - 26, headY + 10, DEEP);
    cellOver(p, headX - 15, headY + 4, INNER);
  }

  if (p.back) { p.face(headX, headY, 19); return; }

  /* --- the face. A slit eye, small and almost all iris: a bird that hunts,
     and the exact opposite of pipwing's saucer. Under it the malar stripe --
     the black moustache that is the single most recognisable thing about a
     falcon, and three cells of it does the whole job. */
  // A pale cheek under each eye first. The malar stripe is painted in the same
  // near-black as the hood, and a near-black stripe laid on mid-blue barely
  // reads at all -- it needs something light to cut across.
  blob(p, headX - 5, headY + 8, 10, 6, LIGHT);
  eye(p, headX - 7, headY - 2, 5.4, 'slit', { side: -1, iris: ACCENT_LIT });
  eye(p, headX + 12, headY - 2, 3.6, 'slit', { side: 1, iris: ACCENT_LIT });
  for (let k = 0; k < 5; k++) stroke(p, headX - 11 + k, headY + 2, headX - 10 + k, headY + 15, ACCENT);
  for (let k = 0; k < 3; k++) stroke(p, headX + 9 + k, headY, headX + 10 + k, headY + 10, ACCENT);
  p.face(headX, headY, 19);
}

/* ============================================================ galecrest */

/**
 * "Large raptor with a forked tail and a raised crest."
 *
 * The end of the blue line and the biggest thing in the group, so it gets the
 * biggest gesture: reared upright with the near wing mantled -- thrown down
 * and forward over its own feet, the way an eagle covers a kill. One wing open
 * reads at icon size; a matched pair reads as a moth.
 *
 * Both signatures the brief asks for are drawn as large as they will stand: a
 * crown of five gold blades raised clear of the skull, and a tail that is
 * genuinely forked, two streamers with real air between them rather than a
 * notch cut in a fan.
 */
function galecrest(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const chestX = cx + 2, chestY = G - 54;
  const rumpX = cx + 20, rumpY = G - 32;
  const headX = cx - 10, headY = G - 76;

  /* --- the forked tail, down first so the rump covers its root. Two streamers
     with a real gap between them: a fork you can see through is the only kind
     that survives being filled with one flat colour. */
  for (const [ex, ey, w, tone] of [[rumpX + 30, rumpY + 22, 12, BASE], [rumpX + 28, rumpY - 14, 10, SHADE]] as const) {
    limbPath(p, [[rumpX - 2, rumpY + 4], [rumpX + 16, lerp(rumpY + 4, ey, 0.5)], [ex, ey]], 17, w, tone,
      { lit: HILIGHT, dark: DEEP });
    for (let k = -6; k <= 6; k++) {
      cellOver(p, ex - 5, ey + k, ACCENT_DARK);
      cellOver(p, ex - 6, ey + k, ACCENT_DARK);
      cellOver(p, ex - 4, ey + k, ACCENT);
    }
  }

  /* --- far wing, still closed and hunched up behind the shoulder. Deliberately
     small: the near wing is the gesture, and a second fan of blades on the far
     side turned the first version of this animal into a starburst with a bird
     somewhere in the middle of it. */
  limbPath(p, [[cx + 4, chestY - 6], [cx + 16, chestY - 16], [cx + 24, chestY - 12]], 22, 13, SHADE);
  for (let i = 0; i < 2; i++) blade(p, cx + 20, chestY - 13, 20 - i * 4, 0.28 + i * 0.30, 9, SHADE, DEEP);

  /* --- far leg, braced back. */
  taper(p, cx + 12, G - 32, cx + 18, G - 8, 12, 8, ACCENT_DARK);
  paw(p, cx + 19, G - 1, 8, { tone: ACCENT_DARK, toes: 3, claws: true, long: true, clawTone: ACCENT });

  /* --- the body: an upright teardrop, chest thrown forward and up. */
  limbPath(p, [[chestX - 4, chestY], [cx, chestY + 14], [rumpX, rumpY]], 36, 30, BASE, { bulge: 2 });
  blobFront(p, chestX - 4, chestY + 4, 19, 19, BASE);
  blob(p, chestX - 11, chestY + 13, 15, 17, LIGHT);
  barredBreast(p, chestX - 12, chestY + 5, 11, 4, 7, ACCENT);

  /* --- near leg, forward and planted, talons spread. */
  taper(p, cx - 4, G - 27, cx - 8, G - 9, 11, 9, ACCENT);
  paw(p, cx - 9, G, 9, { tone: ACCENT, toes: 3, claws: true, long: true, clawTone: ACCENT_LIT });

  /* --- the near wing, MANTLED: thrown down and out over the feet. The
     secondaries go down as one solid mass first and the four primaries as
     blades on top of it -- blades laid straight onto air radiate out of a
     point and the wing stops being a surface, which is what the first two
     attempts at this looked like. */
  const wrX = cx - 8, wrY = G - 44;
  const tips: Pt[] = [];
  for (let i = 0; i < 4; i++) {
    const a = 2.10 + i * 0.22, fl = 34 + i * 2;
    tips.push([wrX + Math.cos(a) * fl, wrY + Math.sin(a) * fl]);
  }
  // The whole mantle is a step darker than the chest it hangs in front of. In
  // the body tone it read as a bib rather than as a wing laid over a breast.
  poly(p, [[chestX - 4, chestY + 10], [chestX - 8, chestY - 6], [wrX + 6, wrY - 6],
    ...tips.map((t) => [lerp(wrX, t[0], 0.52), lerp(wrY, t[1], 0.52)] as Pt)], SHADE);
  for (let i = 3; i >= 0; i--) {
    blade(p, wrX, wrY, 34 + i * 2, 2.10 + i * 0.22, 12, i % 2 ? SHADE : BASE);
  }
  // Coverts over the roots of the fan, then the arm bone over those.
  polyFront(p, [[chestX + 2, chestY - 14], [chestX - 14, chestY - 14], [wrX - 6, wrY - 8],
    [wrX + 8, wrY + 4], [chestX + 4, chestY + 2]], BASE, DEEP, 1.5);
  for (let i = 0; i < 3; i++) {
    const t = 0.28 + i * 0.24;
    stroke(p, lerp(chestX, wrX, t) + 5, lerp(chestY, wrY, t) + 4, lerp(chestX, wrX, t) - 5, lerp(chestY, wrY, t) - 4, DEEP);
  }
  limbPath(p, [[chestX + 2, chestY - 10], [chestX - 12, chestY - 16], [wrX + 1, wrY - 6]], 16, 11, BASE,
    { front: true, lit: HILIGHT, dark: DEEP });

  /* --- neck and head, thrown up and back: a bird shouting into a front. */
  limbPath(p, [[chestX - 4, chestY - 8], [headX + 8, headY + 12]], 22, 17, BASE, { front: true });
  blobFront(p, headX, headY, 17, 15, BASE);
  blob(p, headX - 6, headY + 9, 11, 6, LIGHT);
  crownCap(p, headX, headY, 17, 15, -4, 0.20, ACCENT_DARK);

  /* --- the crown. Five blades raised clear of the skull, the middle ones
     longest, in the gold this species actually declares. Rooted a few cells
     INSIDE the skull so the outline pass does not give each blade its own ink
     and turn the crest into a row of loose knives. */
  for (let i = 0; i < 5; i++) {
    const a = -2.06 + i * 0.30;
    const len = 24 - Math.abs(i - 2) * 3;
    const rx = headX - 9 + i * 5, ry = headY - 10;
    limbPath(p, [[rx, ry], [rx + Math.cos(a) * len * 0.5, ry + Math.sin(a) * len * 0.5],
      [rx + Math.cos(a) * len, ry + Math.sin(a) * len]], 8, 2, i % 2 ? ACCENT_DARK : ACCENT, { front: true });
    stroke(p, rx - 2, ry, rx + Math.cos(a) * len - 2, ry + Math.sin(a) * len, ACCENT_LIT);
  }

  /* --- the bill: heavy, hooked and open. An open beak on the biggest bird in
     the group is worth more than any amount of feather detail. */
  poly(p, [[headX - 8, headY - 3], [headX - 29, headY + 3], [headX - 8, headY + 8]], ACCENT);
  poly(p, [[headX - 29, headY + 3], [headX - 32, headY + 13], [headX - 22, headY + 9]], ACCENT_DARK);
  stroke(p, headX - 9, headY - 2, headX - 28, headY + 3, ACCENT_LIT);
  if (!p.back) {
    poly(p, [[headX - 9, headY + 9], [headX - 25, headY + 12], [headX - 9, headY + 16]], INNER);
    poly(p, [[headX - 9, headY + 13], [headX - 22, headY + 14], [headX - 9, headY + 17]], ACCENT_DARK);
    cellOver(p, headX - 16, headY, INNER);
  }

  if (p.back) { p.face(headX, headY, 18); return; }

  /* --- the face. Angry: a narrow almond nearly filled by iris under a bone
     brow that sits on the lid. Small and hard, and the brow does more work
     than the eye does. */
  eye(p, headX - 5, headY - 1, 5.2, 'angry', { side: -1, iris: ACCENT });
  eye(p, headX + 12, headY - 4, 3.4, 'angry', { side: 1, iris: ACCENT });
  // A spark fleck at each temple: this one is half storm, and two bright cells
  // say so more cheaply than a bolt drawn across its chest.
  for (const [sx, sy] of [[headX + 4, headY - 9], [headX - 12, headY - 5]] as const) {
    cellOver(p, sx, sy, ACCENT_LIT);
    cellOver(p, sx + 1, sy + 1, ACCENT_LIT);
    cellOver(p, sx + 2, sy, ACCENT);
  }
  p.face(headX, headY, 18);
}

/* ============================================================ gullswift */

/**
 * "Long-winged seabird with a dagger bill and forked tail."
 *
 * A tern, poised over a channel. The whole animal lies along one line -- tail
 * high at the back, body tilting down, head low at the front and the bill
 * continuing that same line straight at the water -- and it stands on two very
 * long orange legs, which nothing else in this group has.
 *
 * The wings stay folded, because on a bird with wings this long, folded means
 * two narrow blades crossing over the tail and projecting well past it. That
 * overhang is the read: it says built for distance rather than merely thin.
 *
 * This species declares a near-white base, so the only form it can have comes
 * from the grey: the mantle over the back and wings is doing the work an
 * entire shading ramp does on every other creature here.
 */
function gullswift(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const chestX = cx - 20, chestY = G - 58;
  const rumpX = cx + 18, rumpY = G - 50;
  const headX = cx - 42, headY = G - 70;

  /* --- the forked tail: two narrow white streamers off a high rump, with a
     visible wedge of air between them. */
  for (const [ex, ey] of [[rumpX + 34, rumpY + 26], [rumpX + 40, rumpY - 4]] as const) {
    limbPath(p, [[rumpX - 2, rumpY + 4], [rumpX + 18, lerp(rumpY + 4, ey, 0.5)], [ex, ey]], 13, 4, BASE,
      { lit: SPEC, dark: DEEP });
  }

  /* --- far wing: a long narrow grey blade running back over the tail. */
  limbPath(p, [[chestX + 14, chestY - 12], [cx + 4, chestY - 8], [rumpX + 20, rumpY - 2]], 16, 5, SHADE,
    { lit: LIGHT, dark: DEEP });

  /* --- far leg. Long, and set back. */
  taper(p, cx - 4, G - 42, cx - 8, G - 6, 6, 5, ACCENT_DARK);
  paw(p, cx - 9, G - 1, 6, { tone: ACCENT_DARK, toes: 3, claws: true, long: true, webbed: true, clawTone: ACCENT_DARK });

  /* --- the body: a slim spindle tilted nose-down. */
  limbPath(p, [[chestX, chestY], [cx - 2, chestY + 6], [rumpX, rumpY]], 28, 20, BASE, { bulge: -1 });
  blobFront(p, chestX - 2, chestY + 2, 15, 14, BASE);
  blob(p, chestX - 4, chestY + 8, 14, 11, LIGHT);

  /* --- the mantle: a grey saddle laid over the back and shoulders following
     the actual top contour, not ruled straight across it. On a white bird this
     is the only dark area there is and therefore the only thing giving the
     body a form at all. */
  for (let dx = 0; dx <= 46; dx++) {
    const bx = chestX - 8 + dx, t = dx / 46;
    const ty = p.m.top(Math.round(bx));
    if (ty < 0) continue;
    const depth = 5 + Math.sin(t * Math.PI) * 7;
    for (let k = 1; k <= depth; k++) cellOver(p, bx, ty + k, k > depth - 2 ? DEEP : SHADE);
    cellOver(p, bx, ty, LIGHT);
  }

  /* --- near leg, forward and planted. Long orange stilts: nothing else here
     stands this far off the floor and it is most of the silhouette. */
  taper(p, cx + 6, G - 44, cx + 10, G - 6, 7, 5, ACCENT);
  paw(p, cx + 10, G, 7, { tone: ACCENT, toes: 3, claws: true, long: true, webbed: true, clawTone: ACCENT_DARK });
  // The knee: a hard bend, so a long leg reads as jointed rather than as a rod.
  cellOver(p, cx + 7, G - 28, DEEP);
  cellOver(p, cx + 6, G - 29, SPEC);

  /* --- near wing: one long narrow grey blade folded along the flank and
     projecting a long way past the tail, with a second primary behind it. */
  limbPath(p, [[chestX + 8, chestY - 8], [cx + 2, chestY - 2], [rumpX + 26, rumpY + 10]], 18, 5, SHADE,
    { front: true, lit: LIGHT, dark: DEEP });
  blade(p, rumpX + 8, rumpY + 2, 32, 0.30, 8, SHADE);
  // The wingtips: the darkest thing on the animal, so the blades end somewhere
  // instead of fading into the background.
  for (const [ex, ey] of [[rumpX + 40, rumpY + 15], [rumpX + 36, rumpY + 12]] as const) {
    for (let k = 0; k < 14; k++) {
      cellOver(p, ex - k * 0.72, ey - k * 0.26, DEEP);
      cellOver(p, ex - k * 0.72, ey - k * 0.26 - 1, SHADE);
    }
  }

  /* --- neck and head, stretched forward and down over the water. */
  limbPath(p, [[chestX + 2, chestY - 4], [chestX - 14, chestY - 8], [headX + 8, headY + 6]], 19, 13, BASE, { front: true });
  blobFront(p, headX, headY, 14, 12, BASE);
  // The dark cap, worn low over the eye the way a tern's is. It has to be DEEP
  // and not the accent: this species' accent is a bright orange, so its dark
  // end is a warm ochre and a cap painted in it comes out looking gilded.
  for (let dy = -13; dy <= 3; dy++) {
    for (let dx = -15; dx <= 15; dx++) {
      if ((dx / 14) ** 2 + (dy / 12) ** 2 > 1) continue;
      if (dy > 1 + dx * 0.26) continue;
      cellOver(p, headX + dx, headY + dy, DEEP);
    }
  }
  // Three swept spikes off the back of the cap, laid flat.
  for (let i = 0; i < 3; i++) tuft(p, headX + 9 + i, headY - 5 + i * 3, 11 - i * 2, -0.14 + i * 0.18, 0.22, DEEP);

  /* --- the dagger. Long, straight, needle-fine and orange: the loudest thing
     on the sprite, and it continues the line of the body rather than sticking
     out of it at a new angle. */
  const bx = headX - 10, by = headY + 4;
  poly(p, [[bx + 4, by - 5], [bx - 28, by + 11], [bx - 28, by + 14], [bx + 4, by + 7]], ACCENT);
  stroke(p, bx + 3, by - 4, bx - 27, by + 11, ACCENT_LIT);
  if (!p.back) {
    stroke(p, bx + 2, by + 1, bx - 26, by + 12, ACCENT_DARK);
    cellOver(p, bx - 3, by + 2, INNER);
    cellOver(p, bx - 4, by + 3, INNER);
  }

  if (p.back) { p.face(headX, headY, 16); return; }

  /* --- the face. Not one of the six stock styles: a gull's eye is a pale ring
     with a hard black bead in it and nothing else, and that flat, blank,
     entirely unfriendly stare is the most recognisable thing about a seabird.
     Small, too -- a big one turns it straight back into a cartoon. Everything
     inside is a fixed tone, so the banding pass leaves it alone. */
  for (const [ex, ey, r, ir] of [[headX - 5, headY, 3.4, -1], [headX + 10, headY - 4, 2.4, 1]] as const) {
    // A pale rim on one side of a dark bead, not a ring around it. Ringed --
    // dark, pale, dark from the outside in -- the two eyes came out looking
    // like a pair of brass spectacles.
    blob(p, ex, ey, r, r * 1.2, ACCENT_LIT);
    blob(p, ex + ir * r * 0.24, ey + r * 0.2, r * 0.76, r * 0.9, EYE_DARK);
    cell(p, ex - r * 0.5, ey - r * 0.6, EYE_WHITE);
    cell(p, ex - r * 0.5 + 1, ey - r * 0.6, EYE_WHITE);
    // The orbital ring: two warm cells on the lower lid, which is what turns a
    // bead into an eye.
    cellOver(p, ex, ey + r * 1.4, ACCENT);
    cellOver(p, ex + 1, ey + r * 1.4, ACCENT);
  }
  p.face(headX, headY, 16);
}

/* ============================================================ slatewing */

/**
 * "Angular flat-winged bird with slate plating along the back."
 *
 * It roosts flat against a quarry wall and is indistinguishable from the wall
 * until the wall leaves. So this is the only creature in the group drawn
 * head-on: crouched almost to the floor, both wings held straight out to the
 * sides as flat chiselled slabs, legs splayed. That composition is worth more
 * than any amount of detail -- five birds in profile and one facing you cannot
 * be confused even as flat black shapes.
 *
 * It is broken out of symmetry by the head, which is turned into full profile
 * and pushed forward off the left shoulder, and by the near wing being longer
 * and lower than the far one.
 *
 * Everything about it is straight lines. The wings are chisel-cut polygons
 * with stepped trailing edges and the plates down its back are rectangles; it
 * is the only thing here with no curve in its outline.
 */
function slatewing(p: Pen): void {
  const G = p.ground, cx = p.cx;
  const bodyY = G - 26;

  /* --- far wing, out to the right, shorter and raised. Two slabs: an inner
     arm plate and an outer blade with a stepped trailing edge cut into it. */
  poly(p, [[cx + 8, bodyY - 12], [cx + 26, bodyY - 14], [cx + 27, bodyY - 1], [cx + 9, bodyY + 1]], SHADE);
  poly(p, [[cx + 23, bodyY - 15], [cx + 50, bodyY - 12], [cx + 47, bodyY - 1], [cx + 39, bodyY + 1],
    [cx + 41, bodyY - 5], [cx + 32, bodyY - 2], [cx + 24, bodyY - 1]], SHADE);
  stroke(p, cx + 25, bodyY - 13, cx + 48, bodyY - 10, DEEP);

  /* --- both legs, splayed wide. A head-on creature that keeps its feet under
     it is standing; one with its feet out past its own shoulders is pressed
     against something. */
  taper(p, cx + 9, bodyY + 4, cx + 20, G - 4, 8, 6, ACCENT_DARK);
  paw(p, cx + 21, G - 1, 8, { tone: ACCENT_DARK, toes: 3, claws: true, long: true, clawTone: ACCENT });
  taper(p, cx - 9, bodyY + 5, cx - 23, G - 3, 9, 7, ACCENT);
  paw(p, cx - 24, G, 9, { tone: ACCENT, toes: 3, claws: true, long: true, clawTone: ACCENT_LIT });

  /* --- the body: a flat wide lozenge, barely deeper than the legs are long. */
  poly(p, [[cx - 22, bodyY - 6], [cx - 6, bodyY - 14], [cx + 14, bodyY - 11], [cx + 20, bodyY + 3],
    [cx + 2, bodyY + 11], [cx - 18, bodyY + 7]], BASE);
  blob(p, cx - 4, bodyY + 4, 13, 6, LIGHT);
  for (let i = 0; i < 3; i++) stroke(p, cx - 14, bodyY + 1 + i * 3, cx + 10, bodyY + 2 + i * 3, DEEP);

  /* --- the plating: five slate scutes stepping across the back, each one
     bevelled so it overlaps the one behind it. The species' one ornament and
     the thing it is named for. */
  for (let i = 0; i < 4; i++) {
    const px = cx - 13 + i * 9, py = bodyY - 15 + Math.abs(i - 1.4) * 2;
    slab(p, [[px, py - 4], [px + 11, py - 7], [px + 12, py + 6], [px + 1, py + 9]], i % 2 ? BASE : ACCENT, ACCENT_LIT, DEEP);
    // The scutes stand a little proud of the back, so the ridge shows as a row
    // of steps in the silhouette itself. Plating that only exists inside the
    // outline is plating that does not survive the one test that matters.
    stroke(p, px, py - 5, px + 11, py - 8, ACCENT_LIT);
  }

  /* --- near wing, out to the left, longer and level with the floor. Its
     trailing edge is stepped hard: a straight line broken into three steps is
     what says shale where a scallop would say feather. */
  poly(p, [[cx - 8, bodyY - 12], [cx - 30, bodyY - 12], [cx - 32, bodyY + 2], [cx - 10, bodyY + 3]], BASE);
  polyFront(p, [[cx - 27, bodyY - 14], [cx - 58, bodyY - 8], [cx - 56, bodyY + 5], [cx - 46, bodyY + 8],
    [cx - 48, bodyY + 2], [cx - 38, bodyY + 5], [cx - 40, bodyY - 1], [cx - 29, bodyY + 2]], BASE, DEEP, 1.5);
  stroke(p, cx - 29, bodyY - 11, cx - 56, bodyY - 6, HILIGHT);
  stroke(p, cx - 29, bodyY - 6, cx - 53, bodyY - 1, DEEP);
  for (let i = 0; i < 2; i++) {
    stroke(p, cx - 31, bodyY - 7 + i * 5, cx - 53, bodyY - 2 + i * 4, ACCENT_DARK);
    stroke(p, cx - 31, bodyY - 8 + i * 5, cx - 53, bodyY - 3 + i * 4, ACCENT_LIT);
  }

  /* --- the head: a wedge in full profile, pushed forward off the near
     shoulder on a neck so short it is not there. Turning the head out of a
     head-on body is what stops this reading as a paper aeroplane -- and it has
     to sit clear ABOVE the wing line, or the beak and the near wing come out
     as one pale tangle, which is what happened the first time. */
  const headX = cx - 14, headY = bodyY - 27;
  polyFront(p, [[headX + 15, headY + 9], [headX + 13, headY - 7], [headX - 6, headY - 10],
    [headX - 14, headY - 1], [headX - 12, headY + 9], [headX + 8, headY + 13]], BASE, DEEP, 1.5);
  stroke(p, headX + 12, headY - 6, headX - 6, headY - 9, HILIGHT);
  // A brow ridge of one small plate over the eyes, so the wedge has a roof.
  slab(p, [[headX - 13, headY - 6], [headX + 11, headY - 7], [headX + 10, headY - 1], [headX - 13, headY]], ACCENT, ACCENT_LIT, DEEP);

  /* --- the bill: short, straight and chisel-shaped. */
  poly(p, [[headX - 11, headY], [headX - 28, headY + 5], [headX - 11, headY + 9]], ACCENT);
  stroke(p, headX - 12, headY + 1, headX - 27, headY + 5, ACCENT_LIT);
  if (!p.back) {
    stroke(p, headX - 12, headY + 6, headX - 27, headY + 6, DEEP);
    cellOver(p, headX - 16, headY + 4, INNER);
  }

  if (p.back) { p.face(headX, headY, 15); return; }

  /* --- the face. Sleepy: almost all lid, one long dark curve with a shallow
     lens under it. A creature holding perfectly still against a rock is not
     glaring at anything, and the half-shut eye says it has been there a while
     and can wait longer. */
  eye(p, headX - 5, headY + 3, 4.6, 'sleepy', { side: -1, iris: ACCENT, lid: BASE });
  eye(p, headX + 9, headY + 1, 3.6, 'sleepy', { side: 1, iris: ACCENT, lid: BASE });
  p.face(headX, headY, 15);
}

/* ============================================================= craglide */

/**
 * "Large raptor with slab-plated wings and a hooked stone beak."
 *
 * slatewing grew up and the mass moved out of the wings and into the
 * shoulders. It stands hunched, wings folded into a plated cloak, with two
 * shoulder slabs raised higher than the top of its own skull and the head sunk
 * down between them. A head *below* the shoulder line is the loudest way there
 * is to say heavy, and it costs two polygons.
 *
 * The beak carries the rest: a hook a third the length of the head in the warm
 * stone tone this species declares, with a hard dark tip that drops well below
 * the line of the jaw.
 */
function craglide(p: Pen): void {
  const G = p.ground, cx = p.cx;
  const bodyX = cx + 4, bodyY = G - 46;
  const headX = cx - 24, headY = G - 58;

  /* --- a short blunt tail, jutting back and down under the far wing. It is
     four cells of nothing at full size and it is the whole reason the
     silhouette reads as a bird rather than as a boulder with a beak: without
     it the lower right corner of this animal is a straight vertical wall. */
  poly(p, [[bodyX + 12, bodyY + 6], [bodyX + 42, bodyY + 16], [bodyX + 40, bodyY + 28], [bodyX + 12, bodyY + 24]], SHADE);
  for (let i = 0; i < 3; i++) {
    stroke(p, bodyX + 16, bodyY + 11 + i * 5, bodyX + 40, bodyY + 19 + i * 4, DEEP);
    stroke(p, bodyX + 16, bodyY + 10 + i * 5, bodyX + 40, bodyY + 18 + i * 4, BASE);
  }

  /* --- far wing: an angular slab swept back off the far shoulder, tapering
     to a point rather than stopping square. */
  poly(p, [[bodyX + 2, bodyY - 20], [bodyX + 26, bodyY - 12], [bodyX + 34, bodyY + 8],
    [bodyX + 24, bodyY + 20], [bodyX + 8, bodyY + 12]], SHADE);
  for (let i = 0; i < 3; i++) {
    stroke(p, bodyX + 8 + i * 2, bodyY - 10 + i * 9, bodyX + 30 - i * 2, bodyY - 2 + i * 9, DEEP);
    stroke(p, bodyX + 8 + i * 2, bodyY - 11 + i * 9, bodyX + 30 - i * 2, bodyY - 3 + i * 9, SHADE);
  }

  /* --- far leg. Thick, short, braced. */
  taper(p, bodyX + 10, bodyY + 20, bodyX + 16, G - 6, 13, 9, ACCENT_DARK);
  paw(p, bodyX + 17, G - 1, 10, { tone: ACCENT_DARK, toes: 3, claws: true, long: true, clawTone: ACCENT });

  /* --- the body: a heavy upright barrel, hunched forward. */
  limbPath(p, [[bodyX - 12, bodyY - 12], [bodyX - 4, bodyY + 6], [bodyX + 6, bodyY + 22]], 38, 30, BASE, { bulge: 2 });
  blobFront(p, bodyX - 12, bodyY - 8, 21, 19, BASE);
  blob(p, bodyX - 18, bodyY + 4, 15, 16, LIGHT);
  // Grit over the chest, in the warm stone tone.
  for (const [sx, sy] of [[bodyX - 22, bodyY + 2], [bodyX - 15, bodyY + 10], [bodyX - 25, bodyY + 12],
    [bodyX - 10, bodyY + 16], [bodyX - 19, bodyY - 4]] as const) {
    cellOver(p, sx, sy, ACCENT_DARK);
    cellOver(p, sx + 1, sy, ACCENT);
    cellOver(p, sx, sy - 1, ACCENT_LIT);
  }

  /* --- near leg, forward, talons spread. */
  taper(p, bodyX - 8, bodyY + 22, bodyX - 14, G - 7, 14, 10, ACCENT);
  paw(p, bodyX - 15, G, 11, { tone: ACCENT, toes: 3, claws: true, long: true, clawTone: ACCENT_LIT });

  /* --- the shoulder slabs, the near one raised higher than the top of the
     skull. This is the posture, and they go down BEFORE the folded wing so the
     wing plates overlap their lower edge -- drawn the other way round, the
     shoulder swallows the whole cloak and the animal comes out as one grey
     pebble with a beak. */
  slab(p, [[bodyX - 2, bodyY - 34], [bodyX + 24, bodyY - 24], [bodyX + 22, bodyY - 4], [bodyX - 4, bodyY - 14]], SHADE);
  slab(p, [[bodyX - 28, bodyY - 38], [bodyX + 6, bodyY - 33], [bodyX + 4, bodyY - 12], [bodyX - 29, bodyY - 18]], BASE);
  // A broken crest of chips along the shoulder ridge: a slab should have a
  // fractured edge, never a ruled one.
  for (let i = 0; i < 7; i++) {
    const jx = bodyX - 27 + i * 5;
    poly(p, [[jx, bodyY - 35], [jx + 4, bodyY - 34], [jx + 2, bodyY - 41 + (i % 2) * 3]], i % 2 ? ACCENT : ACCENT_DARK);
  }

  /* --- the near wing, folded into a cloak down the near flank and built as
     four stacked slabs rather than as feathers. Each overlaps the one below
     and the stack narrows going down, so it reads as a folded wing rather than
     as a wall. */
  for (let i = 0; i < 4; i++) {
    const px = bodyX - 30 + i * 3, py = bodyY - 16 + i * 12;
    const w = 27 - i * 4;
    // LIGHT against SHADE, not LIGHT against BASE. One step of value between
    // two stacked plates is not enough to survive the shading pass, and the
    // whole cloak came out as a single blank grey panel.
    slab(p, [[px, py], [px + w, py - 5], [px + w - 3, py + 10], [px - 1, py + 12]], i % 2 ? LIGHT : SHADE);
  }
  // Three primary slabs jutting past the bottom of the stack. The overhang is
  // what makes a folded wing a wing instead of a cape.
  for (let i = 0; i < 3; i++) {
    poly(p, [[bodyX - 28 + i * 6, bodyY + 22], [bodyX - 20 + i * 6, bodyY + 20],
      [bodyX - 18 + i * 6, bodyY + 38 - i * 4], [bodyX - 26 + i * 6, bodyY + 37 - i * 4]], i % 2 ? SHADE : BASE);
    stroke(p, bodyX - 28 + i * 6, bodyY + 23, bodyX - 26 + i * 6, bodyY + 36 - i * 4, HILIGHT);
  }

  /* --- the head, sunk between the slabs and pushed forward and down. Kept
     small on purpose: the shoulders only read as huge if it is. */
  limbPath(p, [[bodyX - 16, bodyY - 20], [headX + 10, headY + 6]], 21, 16, BASE, { front: true });
  blobFront(p, headX, headY, 15, 12, BASE);
  blob(p, headX - 6, headY + 7, 9, 5, LIGHT);
  slab(p, [[headX - 13, headY - 5], [headX + 11, headY - 8], [headX + 10, headY - 1], [headX - 13, headY + 1]],
    ACCENT, ACCENT_LIT, DEEP);

  /* --- the beak: enormous, hooked, and the reason you would recognise this
     animal from across a room. */
  poly(p, [[headX - 5, headY - 4], [headX - 30, headY + 3], [headX - 5, headY + 9]], ACCENT);
  poly(p, [[headX - 30, headY + 3], [headX - 33, headY + 16], [headX - 21, headY + 10]], ACCENT_DARK);
  stroke(p, headX - 6, headY - 3, headX - 29, headY + 3, ACCENT_LIT);
  stroke(p, headX - 7, headY - 4, headX - 7, headY + 9, ACCENT_DARK);
  if (!p.back) {
    stroke(p, headX - 6, headY + 6, headX - 28, headY + 8, DEEP);
    cellOver(p, headX - 13, headY + 1, INNER);
    cellOver(p, headX - 14, headY + 1, INNER);
  }

  if (p.back) { p.face(headX, headY, 16); return; }

  /* --- the face. Hooded: a full eye under a heavy lid across the top third.
     Calm and immovable, which is what a thing made of rock should be, and the
     exact opposite of galecrest's furious slit. */
  eye(p, headX - 3, headY + 1, 4.6, 'hooded', { side: -1, iris: ACCENT, lid: BASE });
  eye(p, headX + 9, headY - 1, 3.9, 'hooded', { side: 1, iris: ACCENT, lid: BASE });
  p.face(headX, headY, 16);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  pipwing,
  kestrelle,
  galecrest,
  gullswift,
  slatewing,
  craglide,
};
