/**
 * Design group C -- the water Kin.
 *
 * Six creatures that all live in water and none of which is the same animal:
 *
 *   shalefin   a flounder lying flat on the bottom, both eyes on the top of
 *              its head, a fringe of fin running right round its rim.
 *   tidewrack  what that flounder becomes: the same flat body heaved up off
 *              the floor on braced flippers under a roof of shingle plates,
 *              with a blunt stone prow for a face.
 *   brookmaw   a front-heavy river brute braced on two stubby forelimbs, all
 *              shoulder and jaw, with a vertical fluke standing up behind it.
 *   maelstrix  the same jaw and the same fluke drawn out into a reared coil
 *              two heads taller than anything else here, wearing a crown.
 *   deeplum    a lamp: a hovering bulb of a fish with a hanging rod of light
 *              out in front of its face and rags trailing under it.
 *   brinewisp  no body at all -- a cowl with two lights inside it over a wide
 *              ragged veil, drifting and leaning forward.
 *
 * Two evolution pairs (shalefin/tidewrack, brookmaw/maelstrix) and two loners.
 * Each pair shares a face and a fin and grows mass; neither is the other one
 * scaled up.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, EYE_DARK, EYE_WHITE, HILIGHT,
  INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, bevel, blob, blobFront, brow, cell, cellOver, cellUnder, claw, contourTop, crease, ease,
  eye, fin, hand, horn, jaw, lerp, limbPath, mane, mouthLine, muzzle, normalAt, nostril, paddle, path,
  paw, plate, poly, polyFront, polyLine, rings, seamPath, speckle, spineRow, stroke, taper,
  teeth, tuft, whiskers,
  type Pen, type Pt,
} from '../parts.js';

/* ------------------------------------------------------------- helpers */

/**
 * A fringe of finned membrane running along a contour, rays and all.
 *
 * Every flatfish in the world is read by this one feature: a continuous skirt
 * of fin round the whole rim of the body, scalloped, with the rays showing
 * through it. `sign` picks which side of the path the skirt grows on, because
 * the contour is drawn before the body is and so there is no mask to ask.
 */
function fringe(p: Pen, contour: Pt[], depth: number, lobes: number, sign: number, tone: number): void {
  const dense = path(contour);
  const n = dense.length;
  const outer: Pt[] = dense.map((q, i) => {
    const t = i / Math.max(1, n - 1);
    const nr = normalAt(dense, i);
    // Tapered at both ends and scalloped in between: a skirt that starts and
    // stops at full depth reads as a cut-out sheet stapled to the fish.
    const endFade = Math.sin(Math.min(1, Math.max(0, t)) * Math.PI) ** 0.35;
    const d = depth * (0.6 + 0.4 * Math.abs(Math.sin(t * Math.PI * lobes))) * endFade;
    return [q[0] + nr[0] * d * sign, q[1] + nr[1] * d * sign] as Pt;
  });
  poly(p, [...dense, ...outer.slice().reverse()], tone);
  for (let i = 2; i < n - 2; i += 3) {
    const a = dense[i]!, b = outer[i]!;
    stroke(p, a[0], a[1], b[0], b[1], ACCENT_DARK, false);
    stroke(p, a[0] - 1, a[1], b[0] - 1, b[1], ACCENT_LIT, false);
  }
}

/**
 * A course of overlapping shingle plates riding a contour.
 *
 * Each plate's leading corner stands a few cells proud of the back, so the
 * silhouette itself comes out stepped -- which is the whole read. A row of
 * plates drawn flush with the contour and distinguished only by a bevel line
 * comes out as painted stripes, which is exactly what the first version of
 * this animal's armour was.
 */
function shingles(p: Pen, contour: Pt[], count: number, depth: number, lift: number, tone: number): void {
  const d = path(contour);
  const at = (t: number): Pt => d[Math.round(Math.max(0, Math.min(1, t)) * (d.length - 1))]!;
  for (let i = 0; i < count; i++) {
    const a = at(i / count), b = at((i + 1.35) / count);
    // The gutter goes down first, onto the plate in front, so the new plate
    // lands with a dark line already under its leading edge.
    stroke(p, a[0] - 2, a[1] - lift, a[0] - 1, a[1] + depth * 0.7, ACCENT_DARK);
    poly(p, [[a[0], a[1] - lift], [b[0] + 1, b[1] - 1], [b[0] - 2, b[1] + depth * 0.8], [a[0] + 2, a[1] + depth]], tone);
    stroke(p, a[0], a[1] - lift, b[0] + 1, b[1] - 1, ACCENT_LIT, false);
    stroke(p, a[0] + 1, a[1] - lift + 2, a[0] + 3, a[1] + depth * 0.9, ACCENT_LIT);
  }
}

/* ============================================================= shalefin */

/**
 * "Flat bottom-dwelling fish with a gritted upper hide."
 *
 * A flounder, and the whole design is the decision to draw it from the side
 * lying down rather than from above. Lying down it is a long low wedge glued to
 * the floor with a fringe of fin all the way round it -- a shape no other Kin
 * on the roster comes near. Seen from above it would be an oval, and an oval is
 * what every generated fish already was.
 *
 * The pose is the head end propped up off the bottom on one stubby pectoral fin
 * with the tail flicked, because the Vellum entry is about a thing that lies
 * still until you tread on it. Both eyes are on the top of the skull, on the
 * same side, one behind and above the other. That asymmetry is the second
 * signature and it is the only face on the roster built this way.
 */
function shalefin(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Its whole back is already a fringe of fin; the stock dorsal would plant a
  // second one in the middle of it, and the stock gills would land in the sand.
  p.noTypeTraits();

  const noseX = cx - 47;
  const tailX = cx + 32;

  /* The body outline, top and bottom. The top is a long shallow arch; the belly
     runs *downhill* from a blunt lifted head to the floor at midships, which is
     the whole pose -- the front end is propped up on one pectoral fin and the
     rest of the animal is still lying in the silt. */
  const topC: Pt[] = [[noseX, G - 35], [cx - 30, G - 41], [cx - 4, G - 41], [cx + 16, G - 34], [tailX, G - 23]];
  const botC: Pt[] = [[noseX - 1, G - 21], [cx - 32, G - 15], [cx - 6, G - 5], [cx + 14, G - 3], [tailX, G - 13]];

  /* --- the fin skirt, drawn first so the body sits on top of its root and the
     two read as one animal rather than as a fish inside a doily. */
  fringe(p, topC, 8, 7, -1, ACCENT);
  fringe(p, botC, 7, 6, 1, ACCENT);

  /* --- the far pectoral, up behind the shoulder in the recessed tone. */
  fin(p, [cx - 22, G - 26], [[cx - 28, G - 37], [cx - 16, G - 39], [cx - 8, G - 32]], { tone: SHADE, rays: 3 });

  /* --- the body. */
  const shape: Pt[] = [...path(topC), ...path(botC).reverse()];
  poly(p, shape, BASE);
  // The underside is pale, right along the floor: this is a fish that only
  // shows one face to the light and the other one to the sand. It swells in the
  // middle rather than running as a strip of even width -- a parallel band left
  // a slab of unlit flank stranded above it that read as a dent in the belly.
  const bDense = path(botC);
  const bUpper: Pt[] = bDense.map((q, i) => [q[0], q[1] - (4 + 9 * Math.sin((i / (bDense.length - 1)) * Math.PI))] as Pt);
  poly(p, [...bDense, ...bUpper.slice().reverse()], LIGHT);
  bevel(p, bUpper, HILIGHT, DEEP);
  // The lateral line, high on the flank with a lit lip over it.
  seamPath(p, [[cx - 34, G - 28], [cx - 4, G - 26], [cx + 22, G - 21]], DEEP, HILIGHT);

  /* --- the gritted hide. Crusted lumps along the back with lit tops, and a
     scatter of sand over the whole upper half. A texture pass alone gives an
     even stipple; the lumps are what make it look like something that has been
     lying in the silt for a week. */
  for (const [gx, gy, gr] of [[cx - 24, G - 35, 4], [cx - 10, G - 37, 5], [cx + 6, G - 34, 4.5], [cx + 20, G - 29, 3.5]] as const) {
    blob(p, gx, gy, gr, gr * 0.6, ACCENT_DARK);
    for (const q of arc(gx, gy, gr, gr * 0.6, Math.PI, Math.PI * 2, 10)) cellOver(p, q[0], q[1], ACCENT_LIT);
  }
  speckle(p, cx - 32, G - 40, cx + 28, G - 22, 0.11, ACCENT);
  speckle(p, cx - 32, G - 40, cx + 28, G - 26, 0.06, ACCENT_DARK);

  /* --- the tail. Kicked up and back: a flick, not a rudder. */
  fin(p, [cx + 26, G - 18], [[cx + 46, G - 36], [cx + 56, G - 27], [cx + 52, G - 8]], { tone: ACCENT, rays: 5, front: true });

  /* --- the near pectoral, propping the head end off the bottom. This is the
     pose: without it the animal is lying down, with it the animal is holding
     itself up on one elbow waiting for something to walk past. It is drawn in
     the sand accent rather than in the pale underside tone, because a pale fin
     laid over a pale belly is a fin nobody can see -- which is precisely what
     the first version of it was. */
  fin(p, [cx - 30, G - 20], [[cx - 41, G - 9], [cx - 33, G - 1], [cx - 22, G - 6]], { tone: ACCENT, rays: 4, front: true });

  if (p.back) { p.face(cx - 32, G - 36, 14); return; }

  /* --- the face. Both eyes on the top of the skull and on the same side of
     it, one behind and higher than the other, each on its own turret breaking
     the back contour. Nothing else on the roster is built this way and it costs
     two blobs. */
  blobFront(p, cx - 36, G - 38, 6, 5.4, BASE);
  blobFront(p, cx - 25, G - 42, 6.5, 5.8, BASE);
  eye(p, cx - 36, G - 39, 4.2, 'round', { side: -1, iris: ACCENT });
  eye(p, cx - 25, G - 43, 4.6, 'round', { side: 1, iris: ACCENT });
  p.face(cx - 31, G - 39, 16);

  /* The mouth: a wedge of gape hinged well back under the eye and opening at
     the front into a jaw that juts down past the belly line.
     Two earlier versions drew it as a closed slot along the bottom corner of
     the head, and both came out as a scar ruled across the cheek -- a slot four
     cells deep sloping four cells over sixteen is a horizontal bar however it
     is toned. It took a real triangle of INNER, a lower jaw with its own mass
     in the silhouette, and teeth on both lips before it read as a mouth. */
  const hinge: Pt = [cx - 31, G - 25];
  const upper: Pt = [noseX - 4, G - 27];
  const lower: Pt = [noseX - 3, G - 15];
  poly(p, [lower, [noseX - 5, G - 12], [cx - 30, G - 18], hinge], LIGHT);
  poly(p, [hinge, upper, lower], INNER);
  for (let i = 0; i < 4; i++) {
    const t = 0.12 + (i / 3) * 0.72;
    cell(p, lerp(upper[0], hinge[0], t), lerp(upper[1], hinge[1], t), ACCENT_LIT);
    cell(p, lerp(upper[0], hinge[0], t), lerp(upper[1], hinge[1], t) + 1, ACCENT_LIT);
    cell(p, lerp(upper[0], hinge[0], t) + 1, lerp(upper[1], hinge[1], t) + 1, ACCENT_DARK);
  }
  for (let i = 0; i < 3; i++) {
    const t = 0.2 + (i / 2) * 0.6;
    cell(p, lerp(lower[0], hinge[0], t), lerp(lower[1], hinge[1], t), ACCENT_LIT);
    cell(p, lerp(lower[0], hinge[0], t), lerp(lower[1], hinge[1], t) - 1, ACCENT_LIT);
  }
  stroke(p, upper[0], upper[1] - 1, hinge[0], hinge[1] - 1, HILIGHT);
  stroke(p, lower[0] - 1, lower[1] + 1, cx - 30, G - 18, HILIGHT);
  nostril(p, noseX + 1, G - 33, -1);
  // Gill cover, behind the eyes.
  for (const q of arc(cx - 19, G - 27, 5, 9, Math.PI * 0.55, Math.PI * 1.45, 12)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0] - 1, q[1], HILIGHT);
  }
}

/* ============================================================ tidewrack */

/**
 * "Heavy shingle-plated swimmer with a blunt ramming head."
 *
 * Shalefin grown up, and the relationship has to be visible without the two
 * being the same drawing at two sizes. What carries over: the flat body, the
 * pair of eyes set together high on one side of the skull, the fringe of fin
 * along the belly, the gritted hide. What changes is the posture -- this one
 * has stopped lying in the silt and heaved its whole front end up off the floor
 * on two braced pectoral props, head down, like something that has decided to
 * charge and has not started yet.
 *
 * The second signature is the roof: five courses of shingle plate overlapping
 * forward down the back, each with its own lit lip. They are drawn back to
 * front so the near edge of every plate is the one that catches the light,
 * which is what makes them tiles rather than stripes.
 */
function tidewrack(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The back is a course of armour from end to end; the stock dorsal fin plants
  // itself straight through the middle of it.
  p.noTypeTraits();

  const topC: Pt[] = [[cx - 44, G - 50], [cx - 24, G - 64], [cx + 2, G - 58], [cx + 20, G - 46], [cx + 34, G - 36]];
  const botC: Pt[] = [[cx - 42, G - 36], [cx - 18, G - 32], [cx + 4, G - 30], [cx + 20, G - 28], [cx + 34, G - 26]];

  /* --- far prop, down first and dark. Both props are pectoral fins doing a
     leg's job: narrow at the shoulder, splayed into a broad planted fan at the
     floor, with the rays showing through. It rakes backward; the near one rakes
     forward, because two matched posts under a body are a trestle. */
  poly(p, [[cx + 2, G - 32], [cx + 13, G - 30], [cx + 26, G - 2], [cx + 10, G - 2]], SHADE);
  for (let i = 0; i < 4; i++) {
    stroke(p, cx + 4 + i * 2.5, G - 30, cx + 12 + i * 3.6, G - 3, DEEP);
    // Lit ray edges. Without them the far prop is a solid navy slab and reads
    // as a hole punched under the animal rather than as a fin behind it.
    stroke(p, cx + 3 + i * 2.5, G - 30, cx + 11 + i * 3.6, G - 3, ACCENT_DARK);
  }
  stroke(p, cx + 2, G - 31, cx + 10, G - 3, ACCENT_LIT);

  /* --- the belly fringe: what is left of the skirt that runs all the way round
     its earlier form. Kept only under the body, so the family tell survives
     without softening a silhouette that is meant to look like masonry. */
  // Shallow, and in the recessed tone: at the fringe depth its earlier form
  // wears, the rays came out as a second row of teeth under the belly.
  fringe(p, botC, 4, 6, 1, SHADE);

  /* --- the tail: a heavy keeled club rather than a flick. */
  fin(p, [cx + 28, G - 33], [[cx + 48, G - 50], [cx + 57, G - 36], [cx + 50, G - 18]], { tone: ACCENT, rays: 4 });

  /* --- the slab of body. */
  poly(p, [...path(topC), ...path(botC).reverse()], BASE);
  // The pale underside stops short of the head. Run right to the front and it
  // bleaches the whole cheek, and the eyes end up as two white marks on a white
  // face -- which is what the first pass at this looked like.
  const bDense = path(botC).filter((q) => q[0] > cx - 28);
  poly(p, [...bDense, ...bDense.map((q, i) => [q[0], q[1] - (3 + 6 * Math.sin((i / (bDense.length - 1)) * Math.PI))] as Pt).slice().reverse()], LIGHT);
  bevel(p, bDense.map((q) => [q[0], q[1] - 4] as Pt), HILIGHT, DEEP);

  /* --- the shingle. One real course along the back, standing proud so the top
     line of the animal comes out stepped, and then the flank divided into the
     same plates by seams alone.
     The first version put a second *mass* of plates on the flank and it welded
     itself to the far prop and the tail into one black wedge that took up a
     third of the sprite. A division that only needs to be read as a division
     should be a seam, not another slab. */
  shingles(p, topC, 6, 15, 4, ACCENT);
  const tD = path(topC);
  for (let i = 1; i < 6; i++) {
    const a = tD[Math.round((i / 6) * (tD.length - 1))]!;
    seamPath(p, [[a[0] + 3, a[1] + 14], [a[0] + 8, a[1] + 22], [a[0] + 8, a[1] + 30]], DEEP, HILIGHT);
  }
  speckle(p, cx - 36, G - 62, cx + 32, G - 32, 0.08, ACCENT_LIT);
  speckle(p, cx - 36, G - 62, cx + 32, G - 32, 0.06, ACCENT_DARK);

  /* --- near prop, planted forward and taking the weight. */
  polyFront(p, [[cx - 32, G - 36], [cx - 19, G - 34], [cx - 12, G - 1], [cx - 40, G - 1]], BASE);
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    // Three dark rays, not five lit ones. Pairing each ray with a highlight
    // turned the prop into a bright striped curtain that pulled the eye clean
    // off the head.
    stroke(p, lerp(cx - 29, cx - 21, t), G - 34, lerp(cx - 34, cx - 16, t), G - 2, ACCENT_DARK);
    stroke(p, lerp(cx - 29, cx - 21, t) + 1, G - 34, lerp(cx - 34, cx - 16, t) + 1, G - 2, SHADE);
  }
  stroke(p, cx - 40, G - 1, cx - 12, G - 1, DEEP);
  // Barnacle crust where the prop meets the floor. Three lumps that say this
  // animal stands on rock rather than swims over it -- small and dull, because
  // in the bright end of the accent they came out as three sequins.
  for (const [bx, by] of [[cx - 35, G - 8], [cx - 27, G - 4], [cx - 17, G - 9]] as const) {
    blob(p, bx, by, 2.6, 1.8, ACCENT);
    cellOver(p, bx - 1, by - 1, ACCENT_LIT);
    cellOver(p, bx, by, INNER);
  }

  /* --- the prow. A blunt slab driven forward and down out of the shoulders,
     with a plated brow shelf over it and a hard straight mouth slot under it.
     Nothing about this head is round: it is the front of a wall. */
  polyFront(p, [[cx - 51, G - 52], [cx - 27, G - 56], [cx - 20, G - 32], [cx - 50, G - 30]], BASE);
  plate(p, [[cx - 53, G - 52], [cx - 26, G - 57], [cx - 22, G - 48], [cx - 52, G - 44]], ACCENT);
  // The ram boss itself: a proud slab bolted across the front face under the
  // brow. The head has to be blunt in the silhouette, not merely heavy.
  plate(p, [[cx - 53, G - 44], [cx - 44, G - 45], [cx - 43, G - 33], [cx - 52, G - 31]], ACCENT_DARK);
  stroke(p, cx - 53, G - 44, cx - 53, G - 32, ACCENT_LIT);
  // Chipped edges down the leading face.
  for (const [qx, qy] of [[cx - 50, G - 41], [cx - 48, G - 36], [cx - 46, G - 32]] as const) {
    blob(p, qx, qy, 2.4, 2, ACCENT_DARK);
    cellOver(p, qx - 1, qy - 2, ACCENT_LIT);
  }

  if (p.back) { p.face(cx - 36, G - 44, 16); return; }

  // The mouth: a straight machined slot right across the bottom of the prow,
  // with a lit lip over it and a hard row of teeth rather than fangs. A ram
  // does not bite; it closes.
  poly(p, [[cx - 44, G - 39], [cx - 21, G - 36], [cx - 21, G - 30], [cx - 43, G - 32]], INNER);
  for (let i = 0; i < 5; i++) {
    const tx = cx - 41 + i * 4, ty = G - 38 + i * 0.5;
    for (let k = 0; k < 3; k++) {
      const half = 1 - Math.round(k * 0.6);
      for (let d = -half; d <= half; d++) cell(p, tx + d, ty + k, d > 0 ? ACCENT : ACCENT_LIT);
    }
  }
  stroke(p, cx - 44, G - 40, cx - 21, G - 37, HILIGHT);
  stroke(p, cx - 43, G - 30, cx - 21, G - 29, LIGHT);

  /* --- the face. Two small hard eyes set together high on the near side of the
     skull under the shelf: the same arrangement its earlier form has, and the
     only thing about this animal that is still a flatfish. */
  eye(p, cx - 39, G - 43, 3.5, 'angry', { side: -1, iris: ACCENT_DARK });
  eye(p, cx - 29, G - 46, 3.9, 'angry', { side: 1, iris: ACCENT_DARK });
  p.face(cx - 34, G - 44, 16);
  // Gill vents: three slots cut through the plate behind the jaw hinge.
  for (let i = 0; i < 3; i++) {
    const gx = cx - 17 + i * 4;
    stroke(p, gx, G - 44 + i, gx, G - 36 + i, INNER);
    stroke(p, gx + 1, G - 44 + i, gx + 1, G - 36 + i, INNER);
    stroke(p, gx - 1, G - 44 + i, gx - 1, G - 36 + i, ACCENT_LIT);
  }
}

/* ============================================================= brookmaw */

/**
 * "Heavy-shouldered swimmer, fluked tail, wide jaw."
 *
 * The Vellum entry is the design: something that holds station against a
 * current all day without visible effort. So it is not standing -- it is
 * *anchored*. Both forelimbs are locked straight down onto the floor, the head
 * is driven forward and low into the flow with no neck at all, and everything
 * behind the shoulders lifts clear of the bottom and streams away up and back
 * to a fluke that ends higher than the animal is long.
 *
 * That gives a silhouette nothing else on the roster has: a diagonal ramp from
 * a head almost touching the ground at one corner to a broad blade at the
 * opposite one, standing on two braced posts, with nothing under the middle of
 * it at all. The first attempt at this species was a four-legged barrel with a
 * fin on the back, and no amount of detail was going to save it -- the pose was
 * the entire problem.
 *
 * Note the palette: ACCENT here is a near-white, so it does the work of the
 * fluke web, the keel and the teeth rather than of a colour, and the pale
 * throat is painted in LIGHT instead. A disc of this accent in the middle of a
 * belly comes back out of the shading pass as a flat grey hole.
 */
function brookmaw(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The stock dorsal plants itself on the highest thing behind the face, which
  // on this animal is the tail it already has. Gills are placed by hand below.
  p.noTypeTraits();

  const shX = cx - 18, shY = G - 44;
  // The hip sits *below* where the tail wants to be, so a length of bare stem
  // shows between the back and the blade. Run the back straight up into the
  // fluke -- which is what the first version did -- and the whole tail reads in
  // silhouette as a hump grown out of the shoulders.
  const hipX = cx + 18, hipY = G - 50;
  const hdX = cx - 46, hdY = G - 30;

  /* --- the tail. Down first so the hip sits on its root: a thick muscular base
     streaming off the rump, up and back, into a single broad fluke. It is
     deliberately the tallest thing here -- a tail that stops level with the back
     is a tail, and this one has to read as a sail from across the room. */
  // The fluke is one paddle, not a fan of rays and not a pair of lobes. Three
  // versions got here: two `fin` calls came out as a folded bird's wing with a
  // scrap of membrane beside it; one wide `fin` came out as a hood; a forked
  // one came out as a bow tied to the end of the tail. A fluke is a *blade* --
  // a solid flat surface with a ridge down the middle and a scalloped rim --
  // and that is exactly what `paddle` builds.
  limbPath(p, [[hipX - 2, hipY + 2], [cx + 28, G - 62], [cx + 34, G - 76]], 20, 9, BASE,
    { front: true, lit: HILIGHT, dark: DEEP });
  // Stood upright across the top of the stem rather than continuing its line.
  // Laid along the stem it reads as a mitten on the end of a raised arm; turned
  // across it, the peduncle shows underneath and the blade is a blade.
  paddle(p, cx + 32, G - 71, 33, 15, -Math.PI * 0.42, ACCENT);

  /* --- far forelimb: the same brace, one step behind and darker. */
  limbPath(p, [[cx - 6, G - 34], [cx - 4, G - 18], [cx - 2, G - 5]], 14, 10, SHADE);
  paw(p, cx - 2, G - 1, 9, { tone: SHADE, toes: 4, webbed: true, long: true, claws: false });

  /* --- the trailing hind limb, folded up under the lifted rump and held clear
     of the floor. Its webbed foot is a fan, not a pad: a planted foot drawn in
     mid-air reads as a leg that has been cut off. */
  limbPath(p, [[hipX - 2, hipY + 6], [cx + 6, G - 40], [cx + 10, G - 32]], 14, 9, SHADE, { front: true });
  poly(p, [[cx + 4, G - 34], [cx + 16, G - 33], [cx + 22, G - 18], [cx + 8, G - 14], [cx, G - 22]], SHADE);
  for (let i = 0; i < 4; i++) stroke(p, cx + 8, G - 32, cx + 2 + i * 5, G - 17 + i, DEEP);

  /* --- the body: a wedge that is all shoulder, rising behind the brace. The
     barrel does not taper evenly from end to end, it *collapses* behind the
     ribs, which is the difference between front-heavy and merely long. */
  limbPath(p, [[shX - 6, shY + 4], [cx, G - 50], [hipX, hipY + 2]], 46, 22, BASE, { bulge: -6 });
  blobFront(p, hipX, hipY, 14, 13, BASE);
  blobFront(p, shX, shY, 26, 24, BASE);
  // The shoulder itself, as its own lit mass on the near side.
  for (const q of arc(shX - 2, shY + 4, 18, 19, Math.PI * 0.9, Math.PI * 2.05, 22)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0], q[1] - 1, HILIGHT);
  }
  // A low rounded keel running the length of the back into the root of the
  // fluke, so the tail grows out of the animal instead of being screwed onto
  // it. A row of spines here read as a handful of nubs; a ridge reads as a keel.
  const keel = contourTop(p, shX - 14, hipX + 6, 4);
  // In LIGHT rather than in the near-white accent: with both in the same tone
  // the keel and the fluke read as one continuous cream shape draped over the
  // animal, and the fluke stops being a fin.
  if (keel.length > 3) limbPath(p, keel.map((q) => [q[0], q[1] + 2] as Pt), 5, 3, LIGHT, { lit: HILIGHT, dark: DEEP });

  /* --- the pale throat, hanging between the braced arms. */
  blob(p, hdX + 22, G - 24, 20, 11, LIGHT);
  blob(p, cx - 12, G - 26, 14, 10, LIGHT);
  for (let i = 0; i < 4; i++) {
    stroke(p, hdX + 14 + i * 9, G - 32, hdX + 16 + i * 9, G - 16, DEEP);
    stroke(p, hdX + 13 + i * 9, G - 32, hdX + 15 + i * 9, G - 16, ACCENT);
  }

  /* --- near forelimb, locked straight down and taking the weight, with the
     elbow thrown out to the side. It is a post, not a stride: both feet are
     level and both are directly under the shoulders, which is what an animal
     holding position against water actually does with its arms. */
  limbPath(p, [[shX - 8, G - 34], [cx - 34, G - 22], [cx - 34, G - 6]], 18, 12, BASE, { front: true, bulge: 3 });
  crease(p, cx - 33, G - 22, 7);
  paw(p, cx - 35, G - 1, 13, { tone: BASE, toes: 4, webbed: true, long: true, claws: false });

  /* --- the head. Broad, flat, and driven forward and down out of the shoulders
     with no neck showing at all, so that it sits almost on the floor. Half again
     as wide as it is deep, and the jaw line runs back past the eye -- a wide jaw
     is not a big mouth, it is a mouth whose corner is behind the eye socket. */
  blobFront(p, hdX, hdY, 20, 12.5, BASE);
  blob(p, hdX - 4, hdY - 6, 14, 4.5, LIGHT);
  for (const q of arc(hdX - 4, hdY - 5, 14, 6, Math.PI, Math.PI * 2, 22)) cellOver(p, q[0], q[1] + 1, DEEP);
  // Cheek pouches at the corners of the jaw, which is where a wide-mouthed
  // amphibian carries its mass.
  blobFront(p, hdX + 12, hdY + 5, 9, 7, BASE);
  blob(p, hdX - 13, hdY + 4, 8, 5.5, LIGHT);

  // Gill slits on the side of the neck, behind the jaw corner.
  for (let i = 0; i < 3; i++) {
    const gx = hdX + 18 + i * 4;
    stroke(p, gx, hdY - 4 + i, gx, hdY + 5 + i, INNER);
    stroke(p, gx + 1, hdY - 4 + i, gx + 1, hdY + 5 + i, INNER);
    stroke(p, gx - 1, hdY - 4 + i, gx - 1, hdY + 5 + i, ACCENT_LIT);
  }

  if (p.back) { p.face(hdX, hdY, 20); return; }

  /* --- the mouth. A single line from the point of the snout all the way back
     under the eye, a hand's breadth of pale gum showing along it, and two blunt
     tusks at the front. This is the feature the species is named for and it is
     worth more than any other twenty cells on the head. */
  poly(p, [[hdX - 20, hdY + 2], [hdX + 16, hdY + 6], [hdX + 16, hdY + 10], [hdX - 20, hdY + 6]], INNER);
  stroke(p, hdX - 20, hdY + 1, hdX + 16, hdY + 5, ACCENT);
  stroke(p, hdX - 19, hdY + 11, hdX + 15, hdY + 12, LIGHT);
  for (const [tx, ty] of [[hdX - 16, hdY + 6], [hdX - 10, hdY + 7]] as const) {
    for (let k = 0; k < 3; k++) { cell(p, tx, ty - k, ACCENT); cell(p, tx + 1, ty - k, ACCENT_DARK); }
  }
  cellOver(p, hdX + 14, hdY + 8, DEEP);
  nostril(p, hdX - 17, hdY - 3, -1);

  /* --- the face. Small, half-lidded and set high and wide on the roof of the
     skull: an animal that has been holding the same position for six hours and
     intends to hold it for six more. */
  eye(p, hdX - 9, hdY - 5, 5, 'hooded', { side: -1, iris: ACCENT_LIT, lid: BASE });
  eye(p, hdX + 8, hdY - 4, 4.5, 'hooded', { side: 1, iris: ACCENT_LIT, lid: BASE });
  p.face(hdX, hdY, 20);
}

/* ============================================================ maelstrix */

/**
 * "Long coiling swimmer with a crowned brow and trailing fins."
 *
 * Brookmaw's line, and the resemblance is deliberately all in the head: the
 * same broad flat skull with the jaw hinged behind the eye, the same keel, the
 * same fluke. Everything else has been pulled out into thirty feet of animal.
 *
 * It is drawn reared: a heavy coil piled on the floor with the tail tip laid
 * out of one side of it, and the body standing up out of the other and doubling
 * back over itself to a head carried at the very top of the frame, turned down
 * to look at whoever is standing in front of it. Where brookmaw is low, wide and
 * braced, this is tall, narrow and free of the ground at every point but one --
 * which is the whole reason an evolution can share a face without being the
 * same drawing scaled up.
 *
 * The lilac is the psyche half of its typing and the only warm colour in the
 * group; it is spent entirely on the crown, the trailing fins and the eyes, so
 * that all three read as one system.
 */
function maelstrix(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // A dorsal fin dropped on the highest point behind the face would land on the
  // crown. Every fin on this animal is hand-placed.
  p.noTypeTraits();

  const hdX = cx - 16, hdY = G - 84;

  /* --- the far half of the coil, dark, and the tail laid out of it to the left
     with the fluke on the end. Drawn first: everything else stands on it. */
  limbPath(p, [[cx - 22, G - 8], [cx + 4, G - 26], [cx + 30, G - 20]], 26, 24, SHADE);
  limbPath(p, [[cx - 16, G - 8], [cx - 30, G - 12], [cx - 44, G - 10]], 16, 8, SHADE, { front: true });
  fin(p, [cx - 40, G - 11], [[cx - 54, G - 24], [cx - 62, G - 12], [cx - 52, G - 2]], { tone: ACCENT, rays: 4 });

  /* --- the near half of the coil, in front and lit, with the belly scutes
     across it. Two arcs of the same tone weld into one doughnut; the seam and
     the plating are what make it a body wrapped over itself. */
  limbPath(p, [[cx - 26, G - 14], [cx + 2, G - 4], [cx + 32, G - 12]], 25, 22, BASE, { front: true });
  const bellyRun: Pt[] = [[cx - 24, G - 6], [cx + 2, G + 2], [cx + 30, G - 6]];
  limbPath(p, bellyRun, 11, 9, LIGHT);
  rings(p, bellyRun, 7, 6, DEEP, HILIGHT);

  /* --- the dorsal ribbon, laid along the rising body before the body itself so
     that it grows out of the back rather than sitting beside it. */
  const spine: Pt[] = [[cx + 26, G - 24], [cx + 30, G - 48], [cx + 18, G - 68], [cx - 4, G - 78]];
  fin(p, [cx + 24, G - 30], [[cx + 50, G - 40], [cx + 54, G - 58], [cx + 36, G - 78], [cx + 10, G - 88]], { tone: ACCENT, rays: 6 });

  /* --- the body, rising out of the coil and doubling back over it. */
  limbPath(p, spine, 24, 17, BASE, { front: true, lit: HILIGHT, dark: DEEP });
  // Ventral plating up the front of the throat, matching the coil's.
  const throat: Pt[] = [[cx + 16, G - 26], [cx + 18, G - 48], [cx + 8, G - 66], [cx - 8, G - 76]];
  limbPath(p, throat, 9, 8, LIGHT);
  rings(p, throat, 7, 5, DEEP, HILIGHT);

  /* --- the head: the same broad flat skull its earlier form has, carried at the
     top of the frame and turned down and to the left. */
  blobFront(p, hdX, hdY, 19, 12, BASE);
  blob(p, hdX - 3, hdY - 5, 14, 4.5, LIGHT);
  for (const q of arc(hdX - 3, hdY - 4, 14, 6, Math.PI, Math.PI * 2, 22)) cellOver(p, q[0], q[1] + 1, DEEP);
  blobFront(p, hdX + 12, hdY + 5, 9, 7, BASE);
  blob(p, hdX - 13, hdY + 3, 8, 5.5, LIGHT);

  /* --- the crown. A fan of lilac blades radiating off the brow and back over
     the skull, tallest in the middle, each with a lit leading edge. It is the
     highest thing on the sprite and the reason the silhouette reads at all. */
  // Two long swept horns first, so the fan finishes on top of their roots and
  // the whole thing reads as one head-dress rather than as a comb behind a pair
  // of antennae.
  horn(p, hdX + 13, hdY - 5, 24, 1, { tone: ACCENT, curl: 10, thick: 6 });
  horn(p, hdX + 5, hdY - 9, 18, 1, { tone: ACCENT_DARK, curl: 8, thick: 5 });
  const browArc = arc(hdX + 1, hdY - 3, 19, 11, Math.PI * 1.06, Math.PI * 1.88, 10);
  spineRow(p, browArc, 6, 18, ACCENT, ACCENT_LIT);

  /* --- the trailing fins: two ribbons hanging off the jaw and drifting down
     into the open water between the head and the coil.
     They started as streamers off the back of the jaw, where they lay flat
     along the throat and merged with the throat plating into a lilac stripe
     nobody could read. The empty space *under* a reared animal is the only
     place on the sprite where a free-floating ribbon has room to be seen. */
  // They splay: one sweeps away to the left and the other hangs almost
  // straight. Two ribbons of the same length hanging side by side under a head
  // stop being fins and start being a pair of legs.
  limbPath(p, [[hdX - 12, hdY + 15], [hdX - 30, hdY + 27], [hdX - 34, hdY + 44], [hdX - 45, hdY + 52]],
    6, 1.5, ACCENT, { lit: ACCENT_LIT, dark: ACCENT_DARK });
  limbPath(p, [[hdX - 2, hdY + 18], [hdX + 6, hdY + 31], [hdX - 1, hdY + 42]],
    5, 1.5, ACCENT, { lit: ACCENT_LIT, dark: ACCENT_DARK });

  // Gill slits behind the jaw hinge, the same three its earlier form has.
  for (let i = 0; i < 3; i++) {
    const gx = hdX + 16 + i * 4;
    stroke(p, gx, hdY - 4 + i, gx, hdY + 4 + i, INNER);
    stroke(p, gx + 1, hdY - 4 + i, gx + 1, hdY + 4 + i, INNER);
    stroke(p, gx - 1, hdY - 4 + i, gx - 1, hdY + 4 + i, ACCENT_LIT);
  }

  if (p.back) { p.face(hdX, hdY, 20); return; }

  /* --- the mouth, and it is open. The family jaw hinges behind the eye, and on
     an animal this size a closed one is a brown bar ruled across the whole face
     -- which is exactly what it was on the first pass. A gape with a lower jaw
     of its own, teeth on both lips and a dark corner is the only version of
     this feature that reads. */
  poly(p, [[hdX - 20, hdY + 4], [hdX + 13, hdY + 7], [hdX + 11, hdY + 16], [hdX - 18, hdY + 11]], INNER);
  poly(p, [[hdX - 19, hdY + 11], [hdX + 12, hdY + 15], [hdX + 9, hdY + 21], [hdX - 18, hdY + 17]], BASE);
  stroke(p, hdX - 19, hdY + 12, hdX + 11, hdY + 16, DEEP);
  stroke(p, hdX - 18, hdY + 14, hdX + 10, hdY + 18, LIGHT);
  stroke(p, hdX - 20, hdY + 3, hdX + 13, hdY + 6, LIGHT);
  for (let i = 0; i < 5; i++) {
    const t = 0.1 + (i / 4) * 0.78;
    const tx = lerp(hdX - 18, hdX + 11, t), ty = lerp(hdY + 5, hdY + 8, t);
    for (let k = 0; k < 3; k++) { cell(p, tx, ty + k, ACCENT_LIT); cell(p, tx + 1, ty + k, ACCENT_DARK); }
  }
  for (let i = 0; i < 4; i++) {
    const t = 0.16 + (i / 3) * 0.68;
    const tx = lerp(hdX - 18, hdX + 10, t), ty = lerp(hdY + 11, hdY + 15, t);
    for (let k = 0; k < 2; k++) { cell(p, tx, ty - k, ACCENT_LIT); cell(p, tx + 1, ty - k, ACCENT_DARK); }
  }
  cellOver(p, hdX + 12, hdY + 9, DEEP);
  nostril(p, hdX - 16, hdY - 2, -1);

  /* --- the face. Narrow, almost all iris, and lit from inside: this is the
     thing sailors will not name out loud. Nothing else in the group has an eye
     with no white in it. */
  eye(p, hdX - 8, hdY - 5, 4.3, 'slit', { side: -1, iris: ACCENT_LIT, bare: true });
  eye(p, hdX + 6, hdY - 2, 3.7, 'slit', { side: 1, iris: ACCENT_LIT, bare: true });
  // A hard lilac brow riding each socket, in place of the stock black ring the
  // slit eye draws for itself: two ringed almonds side by side on a pale face
  // come out looking like a pair of goggles.
  brow(p, hdX - 8, hdY - 11, 11, -1, 0.3, ACCENT_DARK);
  brow(p, hdX + 6, hdY - 8, 9, 1, 0.3, ACCENT_DARK);
  p.face(hdX, hdY, 20);
}

/* ============================================================== deeplum */

/**
 * "Trailing deep-water form with one hanging lure light."
 *
 * The Vellum entry says it is a single pale light forty metres down that has
 * not moved in eleven years, so the design is a *lamp*: everything on it points
 * at the one bright thing, and the bright thing is held out at arm's length in
 * front of a face nobody is meant to notice until too late.
 *
 * The rod is the silhouette. It arcs up off the brow, forward and clear of the
 * whole animal, and puts the bulb out in open water a body's width in front of
 * the jaw -- which is what makes the shape read as a lure rather than as a horn.
 * Under the body four ragged streamers hang almost to the floor and nothing
 * else touches it at all.
 *
 * The palette is the darkest on the roster and its accent is a pale yellow
 * green, so the accent is *light*: the bulb, the row of photophores along the
 * flank, and the teeth. Everything else stays in the dark.
 */
function deeplum(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // A stock dorsal fin would plant itself on the crown of the head, directly
  // through the root of the lure.
  p.noTypeTraits();

  const bx = cx + 6, by = G - 74;

  /* --- the streamers, hanging from the underside and drawn first so the body
     covers their roots. Four, at different lengths and different sways: equal
     ribbons at equal spacing read as a fringe on a lampshade. */
  const rags: Array<[number, number, number]> = [[-18, 58, -7], [-6, 68, 4], [6, 62, -4], [17, 50, 6]];
  for (const [ox, len, sway] of rags) {
    limbPath(p, [[bx + ox, by + 18], [bx + ox + sway, by + 18 + len * 0.5], [bx + ox + sway * 0.2, by + 18 + len]],
      9, 2, ox < 0 ? SHADE : BASE, { lit: LIGHT, dark: DEEP });
  }

  /* --- far pectoral, up behind the shoulder. */
  fin(p, [bx + 16, by - 4], [[bx + 34, by - 14], [bx + 40, by - 2], [bx + 30, by + 10]], { tone: SHADE, rays: 4 });

  /* --- the body: a heavy sack that is nearly all head, hanging in the water
     nose-down. There is no neck and no shoulder; an anglerfish is a mouth with
     a stomach behind it. */
  blob(p, bx, by, 27, 25, BASE);
  blobFront(p, bx - 10, by + 4, 19, 18, BASE);
  // The pale underbelly, and a lit crown where the light falls on the top.
  blob(p, bx - 2, by + 16, 20, 9, LIGHT);
  blob(p, bx - 6, by - 18, 15, 5, LIGHT);
  for (const q of arc(bx - 6, by - 17, 15, 6, Math.PI, Math.PI * 2, 22)) cellOver(p, q[0], q[1] + 1, DEEP);

  /* --- the photophores: a row of small hard lights down the flank, in the same
     tone as the bulb. Three cells each and they are what tie the lure to the
     animal carrying it. */
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.18 + i * 0.11);
    const px = bx - 4 + Math.cos(a) * 24, py = by + Math.sin(a) * 21;
    cellOver(p, px, py, ACCENT_LIT);
    cellOver(p, px, py + 1, ACCENT);
    cellOver(p, px - 1, py, ACCENT);
  }

  /* --- near pectoral, low on the flank and cocked forward. */
  fin(p, [bx - 16, by + 12], [[bx - 32, by + 16], [bx - 34, by + 28], [bx - 20, by + 26]], { tone: ACCENT_DARK, rays: 4, front: true });

  /* --- the jaw. A wide crescent slung under the front of the body with a
     palisade of needle teeth standing in it, top and bottom. It is drawn even
     on the rear view, because it is half the silhouette. */
  poly(p, [[bx - 28, by + 2], [bx - 6, by + 12], [bx + 12, by + 12], [bx + 10, by + 22], [bx - 10, by + 24], [bx - 30, by + 12]],
    p.back ? SHADE : INNER);
  poly(p, [[bx - 30, by + 12], [bx - 10, by + 24], [bx + 10, by + 22], [bx + 12, by + 30], [bx - 12, by + 32], [bx - 32, by + 20]], BASE);
  stroke(p, bx - 30, by + 13, bx + 10, by + 23, DEEP);
  stroke(p, bx - 29, by + 15, bx + 9, by + 25, LIGHT);
  // Teeth on the front view only. Seen from behind, a band of white spikes
  // across the animal's own back is the loudest mistake a rear sprite can make.
  for (let i = 0; i < (p.back ? 0 : 7); i++) {
    const t = 0.08 + (i / 6) * 0.84;
    const ux = lerp(bx - 27, bx + 10, t), uy = lerp(by + 4, by + 13, t);
    for (let k = 0; k < 5; k++) {
      const half = k < 2 ? 1 : 0;
      for (let d = -half; d <= half; d++) cell(p, ux + d, uy + k, d > 0 ? ACCENT : ACCENT_LIT);
    }
    const lx = lerp(bx - 29, bx + 9, t), ly = lerp(by + 13, by + 23, t);
    for (let k = 0; k < 4; k++) cell(p, lx, ly - k, k > 1 ? ACCENT : ACCENT_LIT);
  }

  /* --- the lure. The rod leaves the brow, arcs forward over the snout and puts
     the bulb out in clear water in front of the jaw, where nothing overlaps it.
     A lure that hangs beside the head is a horn. */
  const rod: Pt[] = [[bx - 8, by - 22], [bx - 26, by - 38], [bx - 46, by - 34], [bx - 52, by - 18]];
  limbPath(p, rod, 7, 3, SHADE, { front: true, lit: LIGHT, dark: DEEP });
  const bulbX = bx - 52, bulbY = by - 12;
  // Three short filaments first, so the ball finishes on top of their roots.
  // Four long ones drawn over the bulb turned the lamp into an asterisk.
  for (const a of [Math.PI * 0.66, Math.PI * 1.0, Math.PI * 1.34]) {
    limbPath(p, [[bulbX + Math.cos(a) * 4, bulbY + Math.sin(a) * 4],
      [bulbX + Math.cos(a) * 14, bulbY + Math.sin(a) * 14]], 4, 1.5, ACCENT_DARK, { lit: ACCENT });
  }
  blob(p, bulbX, bulbY, 11, 11, ACCENT_DARK);
  blob(p, bulbX, bulbY, 9, 9, ACCENT);
  blob(p, bulbX - 1, bulbY - 1, 6, 6, ACCENT_LIT);
  blob(p, bulbX - 2, bulbY - 2, 2.6, 2.6, SPEC);

  if (p.back) { p.face(bx - 12, by - 12, 16); return; }

  /* --- the face. Two small half-shut eyes set high and far back, well away
     from the lure: an animal that has not needed to move in eleven years and
     has nothing to look at except whatever comes to the light. */
  // Sunken sockets first, so the eyes sit *in* the skull. On a body this dark
  // a lid painted in the body tone all but disappears.
  for (const [ex, ey, er] of [[bx - 18, by - 10, 8], [bx - 4, by - 13, 7]] as const) {
    blob(p, ex, ey, er, er * 0.8, SHADE);
    for (const q of arc(ex, ey - 1, er, er * 0.8, Math.PI, Math.PI * 2, 14)) cellOver(p, q[0], q[1], DEEP);
  }
  // Pale sclera, dark iris. A pale iris in a white eye on a near-black head is
  // two light-on-light shapes and the face simply has no eyes in it.
  eye(p, bx - 18, by - 10, 5.2, 'sleepy', { side: -1, sclera: ACCENT_LIT, iris: INNER, lid: SHADE });
  eye(p, bx - 4, by - 13, 4.7, 'sleepy', { side: 1, sclera: ACCENT_LIT, iris: INNER, lid: SHADE });
  p.face(bx - 12, by - 12, 16);
}

/* ============================================================ brinewisp */

/**
 * "Drifting hooded light with a trailing brine veil."
 *
 * The only thing in the group with no body at all. A cowl, tipped forward and
 * empty except for two lights, over a veil that widens all the way to a torn
 * hem, with one long thin arm reaching out of it. Nothing touches the floor and
 * nothing about it is an animal.
 *
 * Two decisions carry it. The first is the *lean*: the cowl is offset a long
 * way forward of the veil it hangs over, so the whole thing reads as leaning
 * out towards you rather than standing up straight. The second is that the
 * hollow under the brim is genuinely empty -- a hard cavity tone with two small
 * hard lights floating in it, and no face drawn behind them. A shape with a
 * face in the hood is a monk; a shape with two lights in an empty hood is the
 * thing that Brackwater lost eleven boats following.
 *
 * The eyes are hand-built rather than taken from the six stock styles, because
 * none of them is a light. They are the only feature on the sprite painted in
 * the brightest tone available.
 */
function brinewisp(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // A dorsal fin and a set of gill slits on a drifting light are exactly the
  // two details this design exists to not have.
  p.noTypeTraits();
  // The scale pass is for things with skin. This one is meant to look like
  // water with a light in it.
  p.noTexture();

  const hoodX = cx - 10, hoodY = G - 84;

  /* --- the veil. A widening column from under the cowl to a torn hem, drawn as
     one polygon so the folds can be cut into it afterwards rather than built
     out of separate ribbons that would each earn their own ink. */
  const left: Pt[] = [[hoodX + 2, hoodY + 10], [hoodX - 10, hoodY + 34], [hoodX - 22, hoodY + 62], [hoodX - 26, hoodY + 78]];
  const right: Pt[] = [[hoodX + 22, hoodY + 10], [hoodX + 32, hoodY + 36], [hoodX + 40, hoodY + 62], [hoodX + 44, hoodY + 76]];
  const lD = path(left), rD = path(right);
  // A torn hem: eight tongues of unequal length, not a scalloped arc and not an
  // alternating one either. Both of those come out as bunting.
  const drops = [15, 3, 10, 0, 13, 5, 17, 2, 8];
  const hem: Pt[] = drops.map((d, i) => [lerp(hoodX - 26, hoodX + 44, i / (drops.length - 1)), hoodY + 76 + d] as Pt);
  poly(p, [...lD, ...hem, ...rD.slice().reverse()], BASE);
  // The far half of the veil, behind: one tone down, so the sheet has a fold in
  // it rather than being a flat kite.
  poly(p, [[hoodX + 8, hoodY + 12], [hoodX + 26, hoodY + 40], [hoodX + 34, hoodY + 74], [hoodX + 14, hoodY + 78], [hoodX + 6, hoodY + 44]], SHADE);
  // Vertical folds, dark with a lit lip beside each. Water hanging in sheets is
  // all vertical line and nothing else.
  for (let i = 0; i < 7; i++) {
    const t = (i + 0.5) / 7;
    const topX = lerp(hoodX + 3, hoodX + 21, t), botX = lerp(hoodX - 23, hoodX + 41, t);
    stroke(p, topX, hoodY + 14, botX, hoodY + 74, DEEP);
    stroke(p, topX - 1, hoodY + 14, botX - 1, hoodY + 74, LIGHT);
  }
  // Brine crust along the hem, in the pale green accent: the one place on the
  // sprite the accent appears apart from the lights themselves.
  for (const q of path(hem)) { cellOver(p, q[0], q[1] - 1, ACCENT); cellOver(p, q[0], q[1] - 2, ACCENT_LIT); }

  /* --- the core: a light burning somewhere inside the veil, showing through
     it. Four cells of hard tone and a halo of the pale body colour. */
  blob(p, hoodX + 10, hoodY + 34, 9, 11, LIGHT);
  blob(p, hoodX + 10, hoodY + 34, 5, 6, ACCENT);
  blob(p, hoodX + 9, hoodY + 33, 2.4, 3, ACCENT_LIT);
  cell(p, hoodX + 9, hoodY + 32, SPEC);

  /* --- the arm. One long thin tendril reaching up and forward out of the veil,
     ending in three splayed wisps. It is the gesture the whole design is for:
     this thing beckons, and a drifting light with nothing reaching out of it is
     a lamp rather than a ghost. */
  const arm: Pt[] = [[hoodX - 2, hoodY + 24], [hoodX - 20, hoodY + 18], [hoodX - 36, hoodY + 6], [hoodX - 44, hoodY - 6]];
  limbPath(p, arm, 9, 3, BASE, { front: true, lit: LIGHT, dark: DEEP });
  for (const a of [Math.PI * 1.28, Math.PI * 1.48, Math.PI * 1.7]) {
    limbPath(p, [[hoodX - 44, hoodY - 5], [hoodX - 44 + Math.cos(a) * 12, hoodY - 5 + Math.sin(a) * 12]], 4, 1.5, LIGHT);
  }
  // The second arm, trailing back and down on the far side, in the recessed
  // tone. Two arms doing the same thing is a puppet.
  limbPath(p, [[hoodX + 20, hoodY + 26], [hoodX + 42, hoodY + 32], [hoodX + 52, hoodY + 50]], 8, 2, SHADE, { front: true });

  /* --- the cowl. Offset forward of the veil and tipped down, with a heavy brim
     that overhangs the hollow. The brim is the whole read: a hood without one
     is a bag. */
  blobFront(p, hoodX, hoodY, 22, 17, BASE);
  blob(p, hoodX - 2, hoodY - 9, 16, 7, LIGHT);
  // The brim is tilted: low on the near side, riding up at the back. A level
  // brim on a level cowl is a hat, and the lean is the whole gesture.
  poly(p, [[hoodX - 26, hoodY + 7], [hoodX - 14, hoodY - 4], [hoodX + 10, hoodY - 6], [hoodX + 20, hoodY + 1],
    [hoodX + 15, hoodY + 8], [hoodX - 20, hoodY + 15]], BASE);
  bevel(p, [[hoodX - 26, hoodY + 8], [hoodX - 8, hoodY - 4], [hoodX + 11, hoodY - 5], [hoodX + 21, hoodY + 2]], ACCENT_LIT, DEEP);

  /* --- the hollow. A real cavity, and on the rear view it becomes the back of
     the hood instead: two dark pits on a blank head read as eyes, and the back
     sprite is the one nobody checks. */
  if (p.back) {
    // The back of the hood, in body colour with a soft crease. In the recessed
    // tone it stayed a dark ellipse on a pale cowl, and a dark ellipse where a
    // face should be is a face.
    blob(p, hoodX - 4, hoodY + 8, 15, 8, BASE);
    for (const q of arc(hoodX - 4, hoodY + 7, 15, 8, Math.PI, Math.PI * 2, 14)) cellOver(p, q[0], q[1], SHADE);
    p.face(hoodX - 6, hoodY + 6, 16);
    return;
  }
  blob(p, hoodX - 4, hoodY + 8, 15, 8, INNER);
  blob(p, hoodX - 4, hoodY + 7, 12, 6, EYE_DARK);
  for (const q of arc(hoodX - 4, hoodY + 8, 15, 8, Math.PI * 0.96, Math.PI * 2.04, 16)) cellOver(p, q[0], q[1] + 1, DEEP);

  /* --- the lights. Two of them, unequal, one a little behind the other, each a
     hard core with a soft ring: the only bright thing on the sprite and the
     reason it is called a light rather than a shade. */
  for (const [lx, ly, lr] of [[hoodX - 11, hoodY + 7, 4.2], [hoodX + 1, hoodY + 9, 3.4]] as const) {
    blob(p, lx, ly, lr, lr, ACCENT_DARK);
    blob(p, lx, ly, lr * 0.7, lr * 0.7, ACCENT);
    blob(p, lx - 0.4, ly - 0.4, lr * 0.42, lr * 0.42, ACCENT_LIT);
    cell(p, lx - 1, ly - 1, SPEC);
    cell(p, lx, ly - 1, SPEC);
  }
  p.face(hoodX - 6, hoodY + 6, 16);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  shalefin,
  tidewrack,
  brookmaw,
  maelstrix,
  deeplum,
  brinewisp,
};
