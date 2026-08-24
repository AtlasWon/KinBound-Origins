/**
 * Design group E -- the arthropods. ROUND 6: redrawn from the animal up, again,
 * against the rebuilt pipeline.
 *
 * WHAT WAS WRONG WITH THE VERSION THIS REPLACES, AND WHY IT WAS NOT THE AUTHOR'S
 * FAULT.
 *
 * The previous six were competently drawn against a factory that could not
 * express what they needed. There was no line-free way to say "darker": both
 * `SHADE` and `DEEP` were classified as recesses and had hard black ink ruled
 * round them, so an author who wanted a shadowed haunch with no ring on it
 * could not write one, and every one of us drew a smooth blob instead. The lamp
 * had no component toward the viewer, so the brightest point on every mass was
 * its up-left silhouette EDGE and `rimLight` then promoted that edge to
 * near-white -- a cream halo over a diagonal wash on every creature in the
 * game. Two thirds of the anatomy toolkit had never been called once.
 *
 * All of that is fixed. `FORM` exists, `flat()` exists, `cast()` exists, the
 * lamp is at (-0.40, -0.40, +0.82), and `rimLight` is deleted. So this is not a
 * tidy-up of the last six; it is six new drawings written against a pipeline
 * that can hold them.
 *
 * THE SIX DECISIONS THAT DO MOST OF THE WORK HERE
 *
 *   1. AN ARTHROPOD DOES NOT HAVE A LEG COUNT, IT HAS A BANK OF LEGS. A crab is
 *      a carapace, two claws and one skirt. A spider is a forebody, an abdomen
 *      and two arches of leg. Drawing eight legs separately -- each with joints,
 *      bands, a lit ridge, a dark gutter and a toe -- is drawing the same fact
 *      eight times, and it is what turned this whole group into green and
 *      orange gravel two rounds ago. Every bank here is three or four members
 *      and each member is TWO STRAIGHT TAPERS WITH A HARD CORNER; a leg routed
 *      through a smoothed path comes out as a bow, a bow reads as a column, and
 *      a body on columns is a quadruped whatever is sitting on top of it.
 *   2. THE KNEE IS WHAT MAKES A SPIDER, NOT THE LEG COUNT. A leg that leaves the
 *      body, rises to a joint clear of the silhouette and comes back down puts a
 *      TRIANGLE OF EMPTY AIR between limb and torso, and that triangle is the
 *      whole read. Where the knee cannot clear the body -- weaverjaw is low and
 *      wide by design -- the leg is drawn THINNER than its neighbours instead,
 *      because at seven cells against a body of the same colour a thigh welds
 *      to the crown and the animal comes back as a hump on a rabbit. That is a
 *      measured mistake from this round, not a hypothetical.
 *   3. THE WAIST IS THE DIFFERENCE BETWEEN AN ARACHNID AND A BOAR. Two body
 *      sections joined by a stalk, and on weaverjaw the stalk is backed up by a
 *      NOTCH BITTEN INTO THE TOP CONTOUR, because at 64 px a one-cell pedicel is
 *      half a reference pixel and a notch is a shape.
 *   4. NOTHING IS EVER DRAWN IN FRONT OF THE FACE. The forebody goes down late,
 *      out at the far left of the composition, and no knee, shank or spine is
 *      allowed into the quadrant it occupies.
 *   5. THE SHELL OVERHANGS THE LEGS, AND IT IS FACETED. Both crabs' carapaces
 *      are drawn wider than the leg roots beneath them, and both are built out
 *      of FLAT PLANES meeting at hard steps -- two on pinchel, three on
 *      clatterclaw -- with no gradient on any facet and NO LINE DRAWN ON ANY
 *      STEP, because the step IS the ridge. That is how every hard thing in the
 *      reference generation reads as hard, and the old clatterclaw was a smooth
 *      airbrushed dome with a green ellipse floating on it.
 *   6. SEGMENTATION AND MATERIAL ARE STATED ONCE, IN THE SILHOUETTE. nettlebug's
 *      segments are contour scallops and nothing else; both crabs' weed is a
 *      lobed fringe that BREAKS THE OUTLINE and is drawn nowhere it does not.
 *      The old nettlebug said its segmentation four ways at once -- nine
 *      overlapping discs, eight tonal band sweeps, a 91-step dorsal sheen and
 *      four ringed ocelli -- and the one before it said it none.
 *      ROUND 7 AMENDS THIS RULE WITH THE ONE THING IT LEFT OUT: "in the
 *      silhouette" is only true if the silhouette actually moves. R6 obeyed
 *      the letter of it and put the segments in the contour at an amplitude of
 *      four tenths of a reference pixel, under a gold crest that covered the
 *      contour anyway. A statement the outline is too small to carry is the
 *      same as no statement, and it costs the same ink. Measure the waist.
 *
 * THE SET, and the size ladder it now obeys (measured through the real factory,
 * as shipped, in reference pixels -- 1 ref px = 2 design cells):
 *
 *   nettlebug    TINY   34 x 20,  445 px2   band 26-34,  380-700
 *   pinchel      TINY   34 x 24,  531 px2   band 26-34,  380-700
 *   spinnet      SMALL  41 x 39, 1001 px2   band 34-42,  650-1000
 *   tallowmoth   SMALL  40 x 41, 1061 px2   band 34-42,  650-1000
 *   weaverjaw    LARGE  57 x 39, 1488 px2   band 50-58, 1300-1900
 *   clatterclaw  LARGE  57 x 45, 1577 px2   band 50-58, 1300-1900
 *
 * Every one is inside its rung and inside the 120 x 110 fit clamp, so not one
 * of the six is resampled. The previous group had the ladder INVERTED: a 0.3 m
 * grub was drawn at 53 px and a 1.2 m crab at 56, so the baby and the adult
 * were the same animal at the same size on screen.
 *
 * THE TWO FAMILIES
 *
 *  - nettlebug -> spinnet -> weaverjaw.
 *    SILHOUETTE SIGNATURE: a row of raised points in the second hue whose upper
 *    edge is part of the outline -- soft gold bristles on the grub, hardened
 *    violet spines on the spider's abdomen crown, violet armour horns on the
 *    adult's head shield.
 *    PALETTE RELATIONSHIP: a saturated green shell over a pale green underside,
 *    with the whole value range concentrated at the belly.
 *    WHAT CHANGES, and it is the half §6.8 says we have never done: the second
 *    hue goes GOLD to VIOLET at the first evolution (the manual measured
 *    nettlebug->spinnet at RGB distance 184 and called it one of the four best
 *    pairs on the roster), and then at the second evolution the violet MIGRATES
 *    FROM THE REAR OF THE ANIMAL TO THE FRONT -- spinnet is a green spider with
 *    a violet abdomen, weaverjaw is a green spider with a violet head. The
 *    proportions change completely as well: long and lying, then near-square and
 *    arched, then long, low and braced.
 *  - pinchel -> clatterclaw.
 *    SILHOUETTE SIGNATURE: a faceted shield carapace that overhangs its own
 *    legs, a lobed weed fringe breaking its rear contour, two eye stalks
 *    standing right off it, and a deliberately MISMATCHED claw pair -- one
 *    enormous, one a quarter the size. (The old pinchel drew two matched claws,
 *    which is the one thing its brief said not to do.)
 *    PALETTE RELATIONSHIP: coral shell, pale coral upper plane and palm face,
 *    green weed.
 *    WHAT CHANGES: the legs go from stubs to jointed stilts and the body comes
 *    up off the floor; the claw guard goes from display to shear; the shell goes
 *    from two planes to three with a real rim under it. Taller and meaner rather
 *    than the child scaled up.
 *
 * WHAT IS BLOCKED, AND WHY, SO THE NEXT AUTHOR DOES NOT SPEND A DAY ON IT
 *
 *  - `body pixels darker than the mean outline luma` measures 0.0 % on five of
 *    these six, against a target of 12-25 %, and it is NOT fixable from this
 *    file. On spinnet the outline resolves to luma 0.24 and the darkest tone any
 *    body material can reach -- `DEEP`, which is the species' `shade` slot mixed
 *    toward the ink -- resolves to 0.25. There is literally no body colour on
 *    the palette darker than the line drawn round it. The fix is one hex value
 *    per species in `data/creatures/species.json`: darken slot 1 (`shade`) by
 *    about 25 %, or lighten slot 4 (`ink`). nettlebug is the exception and
 *    measures 3.6 %, and it does so only because its palette happens to carry a
 *    near-ink dark green in the accent slot.
 *  - nettlebug's slots 3 and 4 are ordered `[..., ink, gold]` rather than
 *    `[..., gold, ink]`, so on that species `ACCENT` resolves to the INK and the
 *    gold arrives as `ACCENT2`. Every second-hue mark in this file is therefore
 *    written against the `ACCENT2` family, which resolves to the bright hue
 *    under BOTH orderings and is the only spelling that is safe if the palette
 *    is re-ordered again.
 *  - The manual asks for three hues at 45-60 / 15-30 / 2-6 %. Five of these six
 *    species declare five palette slots whose last entry is genuinely the
 *    darkest, so `paletteOf` resolves `accent2` to the same colour as `accent`
 *    and there is no third hue available to spend. Each of these creatures ships
 *    with two real hues plus `INNER`, and `INNER` is drawn on every one of them.
 *
 * All six call `p.noTypeTraits()`. The chitin pass rules four full-width seams
 * across the body with a lit lip and a dark gutter on each, and the tide pass
 * puts a dorsal fin and three gill slits on a crab. Both are a second author
 * drawing over the first, and both are the exact noise this file exists to keep
 * out.
 */

import {
  ACCENT2, ACCENT2_DARK, ACCENT2_LIT, BASE, EYE_DARK, FORM, INNER, LIGHT, SHADE,
} from '../mask.js';
import {
  blob, cast, cellOver, eyeRow, flat, limbPath, notch, poly, topOf,
  type Pen, type Pt,
} from '../parts.js';

/* ======================================================= shared parts */

/**
 * A BANK of walking legs, drawn as one statement.
 *
 * Each entry is `[root, knee, foot]` and each leg is TWO STRAIGHT TAPERS WITH A
 * HARD CORNER at the knee. The corner is not a stylistic preference: a leg
 * routed through a smoothed path comes out as a bow, a bow reads as a column,
 * and a body on columns is a quadruped whatever is sitting on top of it. Every
 * knee here travels at least as far sideways as it rises, because a knee two
 * cells outboard of its own hip is not an elbow, it is a bend in a post.
 *
 * Every leg in a bank goes down in the same tone with no seam between it and
 * its neighbour, so the group reads as one skirt rather than as eight separate
 * animals' worth of limb. No lit ridge, no dark gutter, no joint crease, no
 * banding: the light pass bands a rod ten cells thick perfectly well on its
 * own, and the ridge/gutter pair applied to twenty rods was most of the six
 * hundred specks the old group measured.
 *
 * `castOnto` wraps the whole bank in ONE cast shadow rather than giving each
 * leg its own -- a near bank over a far bank and a torso is one caster, and
 * three overlapping shadows from three legs is three greys where the reference
 * has one. Pass it for the near bank and never for the far one, which has
 * nothing behind it to catch a shadow.
 */
function legArch(p: Pen, legs: Pt[][], hip: number, knee: number, toe: number,
  tone: number, castOnto = false): void {
  const draw = (): void => {
    for (const leg of legs) {
      limbPath(p, [leg[0]!, leg[1]!], hip, knee, tone);
      limbPath(p, [leg[1]!, leg[2]!], knee, toe, tone);
    }
  };
  if (castOnto) cast(p, hip * 2, draw); else draw();
}

/**
 * A crab claw: a fat palm, a fixed lower finger carrying straight on from it,
 * and a dactyl hinged off the top.
 *
 * The SLOT is the entire read. A chela drawn as one lump with a line scratched
 * across it is a mitten, and two long even fingers with a narrow gap is a
 * HAND -- which is what an earlier draft produced, and at 64 px both crabs came
 * back waving. So: the palm is much bigger than the fingers, the fingers are
 * short and thick at the root, and `gape` -- the separation of the two tips as
 * a fraction of `len` -- is either near zero for a grip or wide open for a
 * threat, never in between.
 */
function chela(
  p: Pen, x: number, y: number, ang: number, len: number,
  o: { tone?: number; gape?: number; teeth?: boolean } = {},
): void {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const P = (u: number, n: number): Pt => [x + ux * u + nx * n, y + uy * u + ny * n];
  const L = len, w = len * 0.36, tone = o.tone ?? BASE, gape = o.gape ?? 0.14;

  // The palm: a heavy rounded wedge taking well over half the whole claw.
  const palm: Pt[] = [
    P(0, -w * 0.48), P(L * 0.18, -w * 0.96), P(L * 0.46, -w * 0.88),
    P(L * 0.56, 0), P(L * 0.44, w * 0.88), P(L * 0.16, w), P(0, w * 0.48),
  ];
  poly(p, palm, tone);

  // Lower finger: the palm's own edge carried on to a point.
  limbPath(p, [P(L * 0.42, w * 0.62), P(L * 1.00, gape * L * 0.45)], w * 0.56, 2.4, tone);
  // Dactyl: hinged off the top of the palm and lifting away from it.
  limbPath(p, [P(L * 0.40, -w * 0.68), P(L * 0.94, -gape * L)], w * 0.52, 2.4, tone);
  if (o.teeth) {
    // Two teeth on the inner edge of the grip and nothing else. Structural
    // repetition in small numbers (§7.1): the reference draws four scutes, not
    // forty, and two teeth are enough to say the slot closes on something.
    const a = P(L * 0.62, w * 0.26), b = P(L * 0.78, w * 0.12);
    cellOver(p, a[0], a[1], LIGHT);
    cellOver(p, b[0], b[1], LIGHT);
  }
}

/* ============================================================ nettlebug */

/**
 * ROUND 7, AND THE ONLY CREATURE IN THIS GROUP THAT CHANGED SHAPE.
 *
 * The R6 drawing was reviewed at 1x across the whole roster and came back as
 * "a small green lizard with legs", which was right, and it was right for two
 * reasons that were both arithmetic rather than taste:
 *
 *   - FIVE DISCS OF RADIUS 9.5-12.5 PITCHED 8-10 CELLS APART ARE ONE DISC.
 *     Two circles of radius r whose centres are `d` apart have a waist of
 *     sqrt(r^2 - (d/2)^2); at r = 12.5 and d = 9 that is 11.7, so the scallop
 *     between two segments was EIGHT TENTHS OF A CELL -- four tenths of a
 *     reference pixel. The segmentation was authored, measured, documented,
 *     and invisible. It is now pitch 9-11 against radius 5-8.4, which puts the
 *     waist 2.2 cells down, plus a `notch` bitten at each junction.
 *   - THE CREST COVERED THE ONE CONTOUR THAT COULD HAVE SHOWN THEM. The old
 *     bristle ridge was a single polygon spanning cx-18 to cx+23 with its
 *     spike bases one cell apart, so every cell of the back was gold and the
 *     top line was a continuous saw. A continuous saw down the spine of a
 *     green animal is a DORSAL FIN, and that -- not the segments -- was what
 *     the reviewer was reading. It is now five separate tufts with four to six
 *     cells of green between them, and the gold that used to be the ridge has
 *     moved to the PROLEGS.
 *
 * It also lay down. R6 was 33 x 28 ref px, nearly as tall as it was long, with
 * the head carried fourteen cells clear of the back; a larva is long and low
 * and carries its head at the END of the body. It is now 34 x 20.
 *
 * 1.  A fat green caterpillar that eats nettles: lying along the floor on two
 *     rows of gold prolegs with only its head reared, and a row of stiff gold
 *     bristle tufts, one to a segment, along its back.
 * 2.  Plan B, non-quadruped animal -- grub. What that plan demands is that it
 *     is NOT stood up: long, low, on the floor for most of its length, head
 *     carried at the END of the body rather than on top of it. Wurmple is the
 *     reference and Wurmple is small.
 * 3.  TINY (0.3 m). MEASURED AS SHIPPED: 68 x 39 cells = 34 x 20 ref px,
 *     longest 34 against the band 26-34; body area 445 ref px against 380-700.
 *     Well inside the 120 x 110 fit clamp, so nothing is resampled, and there
 *     is a great deal of empty canvas above it -- that emptiness is how the
 *     player learns it is small.
 *     ALSO MEASURED: BASE 18.8 %, LIGHT 11.5 %, second hue 24.8 % (15-30),
 *     ACCENT2's own colour renders at 18.9 %, INNER 0.96 %, SPEC 0.0 %, total
 *     ink 31.3 %, internal edge ink 1.5 %, 129 connected regions, 12.1 tone
 *     changes per scanline, largest flat region 9.3 %.
 *     BASE is UNDER the >= 25 % target and that is the one number this round
 *     spent deliberately: the prolegs went from body-green to gold and the
 *     ventral run stayed pale, so the green lost about seven points to the
 *     second hue and the underside. Bought a segmented larva with it.
 * 4.  Aspect 1.70 : 1 long -- the longest, lowest thing in the group by a wide
 *     margin. Fill about 47 %. The only creature in the group lying down.
 * 5.  SMOOTH, and ruthless about it: zero internal lines, and the whole budget
 *     spent on the scalloped contour, the tufts and one large ocular event.
 * 6.  FOUR masses: the chain of five body segments, the head, the bristle
 *     tufts, the two rows of prolegs.
 * 7.  Head verb LIFTED (reared off the floor and turned toward the viewer);
 *     body verb: the weight is dumped in the middle two segments and the tail
 *     is trailing, so the mass sits forward of the midpoint between the feet.
 * 8.  Signature: the segment chain, stated THREE ways and all three of them in
 *     the outline -- the waist between consecutive segments, the notch bitten
 *     at each junction, and the row of four separate round gold feet along the
 *     bottom. Nothing is drawn inside the body to say it.
 * 9.  Reversals, cx = 96, G = ground. Twelve are for a quadruped; a grub has
 *     its own set and these are eleven of them:
 *       (a) occiput dip, head to neck . . . . . . . (cx-20, G-30)
 *       (b) neck rise into segment 1 . . . . . . . .(cx-19, G-26)
 *       (c) segment 1/2 junction notch . . . . . . .(cx-14, G-23)
 *       (d) segment 2/3 junction notch, withers . . (cx- 4, G-23)
 *       (e) segment 3/4 junction notch . . . . . . .(cx+ 6, G-22)
 *       (f) segment 4/tail junction notch . . . . . (cx+16, G-19)
 *       (g) tail terminal . . . . . . . . . . . . . (cx+25, G-13)
 *       (h) belly rise, mid segment to tail . . . . (cx+20, G-10)
 *       (i) near proleg gaps, three of them . . . . (cx+9/-1/-11, G-2)
 *       (j) mandible break, front-lower head . . . .(cx-38, G-18)
 *       (k) four proleg lobes on the bottom line . .(cx+14/+4/-6/-16, G)
 * 10. Green #8fb03a body 30 %; gold #d0a050 feet and tufts 19 %; pale green
 *     underside 12 %; INNER at the jaw 1 %.
 *     (The species declares five slots and its last one is genuinely the
 *     darkest, so ACCENT2 resolves to the accent and there is no fourth
 *     colour available to this file.)
 * 11. FOUR interior events: the face; the bristle tufts; the pale ventral run;
 *     the cast shadow the head throws back onto the neck.
 * 12. `compound` at `s`, spread 5, one mark below: the mandibles. An insect
 *     lens, not a mammal's eyeball, and at `s` the pair fills the whole 17-cell
 *     head -- which is what a caterpillar's face is. `iris: ACCENT2` puts the
 *     gold in the lens, so the second hue appears at both ends of the animal.
 * 13. Surface material in ONE place: the bristles, and they break the outline.
 *     Nothing is drawn on the flank at all. The pale ventral run is not a mark
 *     on the flank: its lower boundary IS the bottom of the body.
 * 14. Internal dark lines: ZERO authored. No closed loop anywhere.
 * 15. First stage.
 */
function nettlebug(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  /* --- FAR row of prolegs, in SHADE, down first and behind everything. Three,
     offset half a pitch from the near row and ending SIX CELLS HIGHER: that
     one number is the difference between an animal standing on a ground plane
     and a row of pegs on a shelf, and the roster's mean foot-row spread was
     3.5 cells. SHADE, because a far pair of limbs is the one case that
     genuinely wants the ink. */
  for (const dx of [17, 7, -3, -13]) blob(p, cx + dx, G - 8, 3.2, 4.2, SHADE);

  /* --- the body: SIX segments in a chain, and the chain is the animal.
     ROUND 7. The R6 version had five discs of radius 9.5-12.5 pitched 8-10
     cells apart, so consecutive discs overlapped by more than half a radius,
     their union had a waist only 1 cell shallower than its crest, and the
     whole thing fused into ONE smooth mass. The crest polygon then covered
     every cell of the top contour, so the last place a segment could have
     shown was gone as well, and the reviewer was right: it came back a small
     green lizard with a fin.

     The fix is arithmetic, not style. Pitch 9-11 against radius 5-8.2 puts the
     waist between two segments at sqrt(r^2 - (pitch/2)^2) -- about 2.5 cells
     below the crest instead of 1 -- and 2.5 cells is 1.3 reference pixels,
     which is a scallop you can see at 1x. The junctions are then bitten
     further with `notch` where nothing overlaps them. Segments in the
     SILHOUETTE, which is where the reference puts a larva's, and nowhere
     else: there is still not one internal line on this animal.

     It also sits DOWN. R6 stood 55 cells tall on a 66-cell body; a grub lies
     along the floor, so the chain is now nearly horizontal, 20 cells deep, and
     only the head lifts clear of it. */
  const SEGS: readonly (readonly [number, number, number])[] = [
    [20, -13, 5.0], [12, -15, 7.4], [1, -17, 8.4],
    [-9, -18, 8.0], [-19, -19, 7.0],
  ];
  for (const [dx, dy, r] of SEGS) blob(p, cx + dx, G + dy, r, r * 0.98, BASE);

  /* --- the pale ventral run, now laid ALONG the belly contour instead of
     across the flank. A caterpillar's underside is genuinely a paler material,
     and concentrating the whole value range at one EDGE is what a pale-bellied
     species does. Its lower boundary is the bottom of the body -- it ends
     where the form ends -- and its upper boundary rides four cells above it,
     so it is a rim of underside and not a smear parked on the side. */
  poly(p, [
    [cx - 22, G - 18], [cx - 12, G - 13], [cx - 1, G - 10], [cx + 11, G - 9],
    [cx + 20, G - 10], [cx + 24, G - 13], [cx + 21, G - 14], [cx + 11, G - 12],
    [cx - 1, G - 12], [cx - 12, G - 15], [cx - 21, G - 20],
  ] as Pt[], LIGHT);

  /* --- THE BRISTLE RIDGE, restated as ONE TUFT PER SEGMENT rather than one
     continuous saw. The saw was the other half of the lizard: an unbroken
     row of five joined points, running the full length of the back with green
     nowhere along the top line, is a dorsal FIN, and a fin belongs to a
     reptile. Broken into five separate tufts with four to six cells of green
     between them, the same gold says "bristles on a grub", and the gaps
     between the tufts are exactly where the segment junctions are, so the
     crest states the segmentation a second time for free.

     Under each tuft, a gold saddle capping its own segment: an ellipse at 0.8
     x 0.4 of the segment radius, so the gold band's LOWER edge scallops with
     the chain while its upper edge is the back itself. That is the whole of
     H2's 15-30 %, and every cell of it is bounded by the segment it sits on.

     Drawn BEFORE the head, so `topOf` reads the body's own back. Sampling it
     after the head was down put two roots on the skull. */
  cast(p, 14, () => flat(p, () => {
    // Tallest over the shoulder and tapering both ways: a row of identical
    // spikes is a comb. Raked back toward the tail, which is which way a
    // larva's setae actually lie. SHORT -- three to five cells, base four.
    // At eight, with a gold saddle under them, each segment came back as one
    // solid gold triangle and the back read as a stegosaur's plate row: the
    // exact reptile the reviewer was complaining about, in the second hue.
    for (const [dx, len] of [[-19, 4], [-9, 5], [1, 5], [12, 4], [20, 3]] as const) {
      const x = cx + dx, y = topOf(p, x);
      poly(p, [[x - 2, y + 2], [x + 1.5, y - len], [x + 2, y + 1]] as Pt[], ACCENT2);
    }
  }));

  /* --- the segment junctions, bitten out of the top contour where the tufts
     leave it open. `notch` erases, so this is a shape and not a line: five
     scallops across the back at about a reference pixel each, which survives
     the icon and costs no ink. */
  for (const dx of [16, 6.5, -4, -14]) {
    notch(p, cx + dx, topOf(p, cx + dx) - 1, 5, 2.5, 0, 1);
  }

  /* --- the near row of prolegs, ON the floor, throwing their shadow back onto
     the far row and the belly. FOUR separated ground contacts spread 33 cells,
     not one merged bar, and they carry the SECOND HUE.

     That last is the round's other change. The gold used to be a full-length
     dorsal crest, and a crest is the one gold shape that reads as a fin. Moved
     to the feet it does the same 15-30 % of H2 while saying something true --
     a larva's prolegs are a different material from its back -- and it puts
     the gold at the BOTTOM of the sprite, where the row of round pale feet is
     also the clearest statement of segmentation the animal has. Each foot is
     its own closed mass, so not one cell of it is a patch on a flat surface. */
  cast(p, 10, () => {
    for (const dx of [14, 4, -6, -16] as const) blob(p, cx + dx, G - 4, 4.4, 4.4, ACCENT2);
  });
  // The gaps between them, carved rather than drawn: at 64 px a 1-cell dark
  // stroke between two toes is half a reference pixel and is gone, and a notch
  // in the outline is not. Shallow -- at depth 4 against a foot only nine
  // cells across the four came back square, and a row of gold rectangles on a
  // green body is a set of dentures.
  for (const dx of [9, -1, -11]) notch(p, cx + dx, G + 2, 3.5, 2.5, 0, -1);

  /* --- the head, reared and turned. A POLYGON, not an ellipse: a caterpillar
     carries a flat vertical face plate with a hard corner top and bottom, and
     that squared-off front is most of what stops it reading as one more bulge
     in the chain. It is cast onto the neck, which is what puts it in FRONT of
     the body -- the previous draft bought the same separation with a closed
     DEEP ring and it read as a collar. It now clears the back by six cells
     rather than fourteen: a grub's head is carried at the END of the body, not
     on top of it. */
  cast(p, 18, () => poly(p, [
    [cx - 36, G - 22], [cx - 35, G - 27], [cx - 32, G - 33], [cx - 25, G - 34],
    [cx - 20, G - 30], [cx - 19, G - 22], [cx - 24, G - 17], [cx - 32, G - 18],
  ] as Pt[], BASE));

  if (p.back) { p.face(cx - 28, G - 26, 10); return; }

  /* --- the face. Two lenses filling the head, and the mandibles under them.
     `s` and not `m` deliberately: the head is seventeen cells across and two
     `m` lenses would not fit inside it, and a caterpillar's face IS mostly
     lens. `iris: ACCENT2` puts the gold in the eye, so the second hue appears
     at both ends of the animal instead of only on its back. */
  eyeRow(p, cx - 28, G - 26, 5, 'compound', 's', { far: 'xs', iris: ACCENT2_DARK });
  // THE ONE MARK BELOW THE EYES: the jaws. Two small hooked mandibles just
  // breaking the front-lower contour with a cavity between them -- silhouette,
  // not a grey line ruled across a snout. A grub that eats nettles bites.
  // They were four cells longer in the first pass and the animal came back as
  // a duck; a mandible that reaches past the eye is a bill.
  poly(p, [[cx - 35, G - 21], [cx - 38, G - 18], [cx - 34, G - 16]] as Pt[], ACCENT2_DARK);
  poly(p, [[cx - 32, G - 18], [cx - 36, G - 14], [cx - 29, G - 14]] as Pt[], ACCENT2_DARK);
  // The cavity between the jaws. Two or three INNER cells is the highest
  // value-per-cell mark anywhere on a sprite and 36 of 48 species had none.
  poly(p, [[cx - 35, G - 20], [cx - 32, G - 20], [cx - 31, G - 17], [cx - 34, G - 17]] as Pt[], INNER);
}

/* ============================================================== spinnet */

/**
 * 1.  A patient orb-weaver hanging over its own web: a low green carapace out
 *     at the front left with the face clear of everything, an enormous violet
 *     abdomen carried high and behind it, and the legs arched up to hard knees
 *     that stand above both.
 * 2.  Plan B, non-quadruped animal -- arachnid. What that plan demands is the
 *     KNEE. A spider leg leaves the body, rises to a joint HIGHER THAN THE
 *     BODY and comes back down, and the triangle of empty air that puts
 *     between limb and torso is the entire spider read. Every leg here is two
 *     straight tapers with a hard corner; routed through a smoothed path the
 *     knee rounds into an arc, the arc reads as a column, and the animal comes
 *     back as a green sheep. That mistake cost an earlier draft of this file.
 * 3.  SMALL (0.5 m). MEASURED AS SHIPPED: 81 x 77 cells = 41 x 39 ref px,
 *     longest 41 against the band 34-42; body area 1001 ref px against
 *     650-1000. Inside the fit clamp; nothing resampled.
 *     ALSO MEASURED: BASE 23.5 %, second hue 28.8 % with the violet's own
 *     colour at 19.9 %, INNER 1.12 %, SPEC 0.0 %, ink 30.9 %, internal edge
 *     4.0 %, 162 regions, 14.0 tone changes per scanline. The tone-change count
 *     and the ink are the price of six legs: on a design this spindly the
 *     outline pass alone is a quarter of the sprite, and the only way further
 *     down is to draw fewer limbs than a spider has.
 * 4.  Aspect 1.06 : 1 -- almost square, and TALL relative to nettlebug's long
 *     low comma. Fill about 38 %: spindly, and spindliness is the character,
 *     which is the only reason to pay a low fill's perimeter cost.
 * 5.  STRUCTURED. It has named landmarks: carapace rim, pedicel, hip, knee,
 *     the three crown spines.
 * 6.  FIVE masses: the abdomen, the carapace, the near leg arch, the far leg
 *     arch in SHADE, the pair of silk spools.
 * 7.  Head verb LOWERED -- the carapace hangs a body's depth below the top of
 *     the abdomen, so the animal is looking down the web at you. Body verb:
 *     the weight is slung backwards and high, the front legs braced forward.
 * 8.  Signature: the high spined violet abdomen framed by the leg arches. In
 *     the silhouette, and the second hue is the same object, so it is stated
 *     once.
 * 9.  Reversals, cx = 96, G = ground:
 *       (a) carapace crown, front high point . . . (cx-31, G-41)
 *       (b) occiput dip into the pedicel . . . . . (cx-11, G-37)
 *       (c) abdomen front shoulder . . . . . . . . (cx+ 1, G-60)
 *       (d) crown spine 1 . . . . . . . . . . . . .(cx+ 6, G-69)
 *       (e) crown spine 2, the tallest . . . . . . (cx+17, G-71)
 *       (f) crown spine 3 . . . . . . . . . . . . .(cx+30, G-67)
 *       (g) point of the abdomen, rearmost . . . . (cx+36, G-44)
 *       (h) spinneret step, lower rear . . . . . . (cx+33, G-34)
 *       (i) leg II knee, the highest point . . . . (cx- 5, G-66)
 *       (j) leg I knee, the most forward point . . (cx-36, G-32)
 *       (k) chelicera break, under the chin . . . .(cx-29, G-15)
 *       (l) three separated near contacts . . . . .cx-32 / +6 / +28,
 *           with the three far feet at cx-20 / +16 / +34 and ELEVEN CELLS
 *           HIGHER, so no two feet in the bank land on one row.
 * 10. Green #7a9a34 carapace and legs; violet #9a58b0 abdomen -- MEASURED 28.8 %
 *     of the sprite against the 10 % the manual measured on the old one and the
 *     22 % it asked for; pale green #b8c878 spools; INNER at the fang gape.
 * 11. FOUR interior events: the face; the pale spinneret pair; the shadow the
 *     near legs throw across the abdomen; the shadow the carapace throws back
 *     onto the pedicel. NOTHING is drawn on the abdomen's back.
 * 12. `slit` at `m`, `far: 'm-'`, spread 6, `iris: INNER`, one mark below: the
 *     fangs. `slit` is the only stamp in the library with no white in it, and a
 *     hunter that never chases wants it. Three stages, three faces: the grub's
 *     compound lenses, this slit, and the adult's heavy hood -- and no two of
 *     them could be confused at 64 px. `far: 'm-'` and never `far: 's'`: the far
 *     eye of a turned head is NARROWER, not smaller, because both eyes are the
 *     same distance away and the skull compresses one of them along one axis.
 * 13. Surface material in ONE place: the three crown spines, and they break
 *     the outline. The abdomen is otherwise flat.
 * 14. Internal dark lines: none authored. The pipeline draws two -- the far leg
 *     bank against the body (which is what SHADE is for) and the rim of the
 *     violet abdomen where the legs and pedicel cross it. Both run edge to
 *     edge; there is no closed loop.
 * 15. Second stage. CARRIED OVER: the spiked dorsal crown in the second hue,
 *     and a saturated shell over a pale underside. CHANGED: the hue itself
 *     goes gold to violet (the pattern §6.8 asks for and the one this pair was
 *     already praised for), and the proportion goes from long-and-lying to
 *     tall-and-arched. It is not the grub scaled up.
 */
function spinnet(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  /* --- the FAR arch. Three legs in SHADE, down first and behind everything,
     knees lower, feet planted 11 cells higher than the near four and offset
     half a stride. SHADE is a declaration that these are a separate part set
     behind another, so the edge pass rules ONE line between the far bank and
     the near body: one division bought, six avoided, and it is the whole depth
     cue. */
  legArch(p, [
    [[cx - 22, G - 30], [cx - 28, G - 22], [cx - 20, G - 11]],
    [[cx - 14, G - 32], [cx + 2, G - 46], [cx + 16, G - 12]],
    [[cx - 8, G - 26], [cx + 20, G - 36], [cx + 34, G - 14]],
  ], 6, 4, 2, SHADE);

  /* --- the abdomen. The largest thing on the animal by a long way, slung high
     and well back; a spider whose abdomen matches its forebody is an ant. Drawn
     as a POLYGON with three spines cut into its crown, so the family's raised
     points and the second hue are one object rather than two -- the previous
     draft drew the abdomen as a `blob` and then balanced three separate spikes
     on top of it, and at 64 px the spikes fell off.
     Cast onto the far legs, which is what puts it in front of them. */
  cast(p, 40, () => poly(p, [
    [cx - 2, G - 52], [cx + 1, G - 60], [cx + 6, G - 69], [cx + 10, G - 60],
    [cx + 17, G - 71], [cx + 24, G - 59], [cx + 30, G - 67], [cx + 34, G - 54],
    [cx + 36, G - 44], [cx + 33, G - 34], [cx + 22, G - 28], [cx + 8, G - 29],
    [cx - 1, G - 36], [cx - 4, G - 44],
  ] as Pt[], ACCENT2));

  /* --- the pedicel. The narrow waist. Without it the carapace and the abdomen
     are two balls side by side; with it they are one animal. */
  limbPath(p, [[cx - 13, G - 30], [cx - 4, G - 40]] as Pt[], 8, 7, BASE);

  /* --- the silk spools, low at the back of the abdomen where the spinnerets
     actually are. Two, unequal, in the pale material -- the one place the
     species' own pale colour appears, and the brief's own detail. */
  blob(p, cx + 31, G - 33, 5, 4.5, LIGHT);
  blob(p, cx + 34, G - 38, 3.2, 3, LIGHT);

  /* --- the NEAR arch. THREE legs, not four and certainly not eight. An
     arthropod does not have a leg count, it has a BANK, and every extra rod at
     this size costs perimeter and buys nothing: an earlier draft drew four
     near and three far and the animal came back as a green thicket with a face
     somewhere in it. Three near and three far, widely spaced, and the air
     between them is what reads as legs.
     Leg III crosses the abdomen deliberately -- a near limb over a far mass is
     the overlap that most wants a cast shadow, and the bank throws one. */
  legArch(p, [
    [[cx - 26, G - 28], [cx - 36, G - 32], [cx - 32, G - 2]],
    [[cx - 12, G - 28], [cx + 14, G - 38], [cx + 28, G - 4]],
  ], 8, 6, 3, BASE, true);
  /* Leg II, the tall arch, drawn on its own and THINNER than the other two.
     At seven cells it welded to the carapace's crown and the whole thing read
     as a hump on a rabbit; at five it reads as a limb, and the sky between its
     thigh and the abdomen is what says "spider". */
  legArch(p, [
    [[cx - 16, G - 32], [cx - 5, G - 66], [cx + 6, G - 1]],
  ], 6, 4.5, 3, BASE, true);

  /* --- the carapace. LAST, so nothing is ever drawn over the face, and out at
     the far left where the silhouette is otherwise empty. A polygon with a
     named crown and a named rim, cast back onto the pedicel and the abdomen. */
  cast(p, 25, () => poly(p, [
    [cx - 36, G - 32], [cx - 31, G - 41], [cx - 19, G - 42], [cx - 11, G - 37],
    [cx - 10, G - 27], [cx - 18, G - 20], [cx - 30, G - 21], [cx - 36, G - 26],
  ] as Pt[], BASE));

  if (p.back) { p.face(cx - 23, G - 32, 13); return; }

  /* --- the face. Set forward on the carapace, not centred on it: on a turned
     head the whole pair moves toward the front of the skull. */
  eyeRow(p, cx - 23, G - 32, 6, 'slit', 'm', { far: 'm-', iris: INNER });
  /* THE ONE MARK BELOW THE EYES: the chelicerae. Two venom fangs hanging clear
     of the chin with a gape between them -- a silhouette break, which is what a
     mark below the eyes has to be at this size. Under 64 cells each and
     separate components, so neither earns an ink ring of its own. */
  limbPath(p, [[cx - 29, G - 22], [cx - 30, G - 9]] as Pt[], 6, 2.5, ACCENT2);
  limbPath(p, [[cx - 21, G - 21], [cx - 20, G - 11]] as Pt[], 5, 2.5, ACCENT2);
  poly(p, [[cx - 27, G - 20], [cx - 23, G - 20], [cx - 24, G - 14], [cx - 26, G - 14]] as Pt[], INNER);
}

/* ============================================================ weaverjaw */

/**
 * 1.  The spinner grown up and given up on chasing: a broad flat body pressed
 *     almost to the floor under a crown of heavy braced legs, with an armoured
 *     violet head-shield and a pair of enormous shearing jaw plates thrown
 *     forward off it. It does not chase; it faces you and closes.
 * 2.  Plan B, non-quadruped animal -- arachnid, at the heavy end. The knees
 *     still stand above the back, because that is what keeps it an arachnid;
 *     but the body is a broad FLAT dome rather than spinnet's ball, the stance
 *     is half again as wide, and that is the difference between a spider
 *     standing and a spider braced. This is the species the manual said needed
 *     "a redesign, not an edit": the old one was a smooth green capsule with a
 *     smooth green head and four green pegs, with zero landmarks on it.
 * 3.  LARGE (1.2 m). MEASURED AS SHIPPED: 113 x 78 cells = 57 x 39 ref px,
 *     longest 57 against the band 50-58; body area 1488 ref px against
 *     1300-1900. Inside the fit clamp; nothing resampled.
 *     ALSO MEASURED: BASE 29.3 %, second hue 13.4 %, LIGHT 12.6 %, INNER
 *     0.96 %, SPEC 0.0 %, ink 26.2 %, internal edge 2.9 %, 195 regions, 16.6
 *     tone changes per scanline -- the highest in the group, and it is seven
 *     legs. A leg bank is what this animal IS; the alternative is a tortoise.
 * 4.  Aspect 1.57 : 1 LONG AND LOW -- the aspect Appendix B assigns it, and the
 *     opposite of spinnet's near-square. Fill about 60 %, which is where the
 *     manual puts anything heavy and armoured, and a solid animal is a cheap
 *     one in perimeter.
 * 5.  STRUCTURED, heavily: shield rim, three armour horns, jaw hinge, upper and
 *     lower shear plates, the abdomen's belly step, six knees.
 * 6.  SIX masses: the abdomen, the cephalothorax, the violet head-shield with
 *     its horns, the two jaw plates, the near leg bank, the far leg bank.
 * 7.  Head verb LEVEL AND FORWARD -- stolid, and carried BELOW the line of the
 *     back, which is what a trap-door spider waiting does. Body verb: the
 *     weight is braced back over the hind pair and the front is reaching, so
 *     the centre of mass is well behind the midpoint between the feet.
 * 8.  Signature: the jaw plates. The widest thing on the left of the
 *     silhouette, the lowest thing on the animal that is not a foot, and in the
 *     second hue -- so the shape and the colour are one statement.
 * 9.  Reversals, cx = 96, G = ground:
 *       (a) jaw tip, most forward point . . . . . .(cx-54, G-22)
 *       (b) jaw hinge step . . . . . . . . . . . . (cx-31, G-30)
 *       (c) shield rim, over the eyes . . . . . . .(cx-30, G-42)
 *       (d) armour horn 1 . . . . . . . . . . . . .(cx-26, G-56)
 *       (e) armour horn 2, the tallest . . . . . . (cx-15, G-62)
 *       (f) armour horn 3 . . . . . . . . . . . . .(cx- 3, G-56)
 *       (g) waist dip, shield to abdomen . . . . . (cx+ 2, G-40)
 *       (h) withers of the abdomen . . . . . . . . (cx+10, G-50)
 *       (i) croup, second high point . . . . . . . (cx+34, G-46)
 *       (j) rear point of the abdomen . . . . . . .(cx+46, G-28)
 *       (k) knee of near leg III, the highest . . .(cx+12, G-62)
 *       (l) three separated near contacts . . . . .cx-30 / +22 / +52
 * 10. Deep green #6e8a2e body 45 %; violet #8a4aa0 shield, horns and jaws 20 %;
 *     pale green #a8b868 belly; INNER in the gape.
 * 11. FOUR interior events: the face; the pale belly band; the gape between the
 *     jaw plates; the shadow the shield throws down over the eyes. NOTHING is
 *     drawn on the abdomen.
 * 12. `hooded` at `m`, spread 7, `lid: LIGHT`, one mark below: the gape.
 *     The heavy lid IS the expression -- "calm, stubborn, ancient" is exactly
 *     "in sixty recorded encounters it has not once needed to chase" -- and it
 *     is a third silhouette after the grub's lens and the spider's slit.
 *     `lid: BASE` was what the previous draft passed, and a body-toned lid over
 *     a body-toned head paints nothing at all.
 * 13. Surface material in ONE place: the three armour horns on the shield rim,
 *     and they break the outline. The abdomen and the legs are bare.
 * 14. Internal dark lines: none authored. The pipeline draws the far bank
 *     against the body (SHADE, which is what it is for) and the rim of the
 *     violet shield and jaws. Every one of those runs edge to edge.
 * 15. Third stage. CARRIED OVER: the spiked crown in the second hue, and
 *     saturated green over a pale green underside. CHANGED: the violet MIGRATES
 *     from the rear of the animal to the front -- spinnet is a green spider with
 *     a violet abdomen, this is a green spider with a violet head -- which is
 *     the "keep the hues, change the area shares" half of §6.8; and the
 *     proportion goes from near-square and arched to long, low and braced.
 */
function weaverjaw(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  /* --- the FAR leg bank. Three struts in SHADE, knees shallow, feet planted
     TWELVE CELLS HIGHER than the near four and offset half a stride, so the
     two banks never land on one row and the far three appear BETWEEN the near
     ones rather than directly behind them. */
  legArch(p, [
    [[cx - 12, G - 32], [cx - 18, G - 20], [cx - 16, G - 7]],
    [[cx + 6, G - 32], [cx + 10, G - 18], [cx + 12, G - 7]],
    [[cx + 28, G - 34], [cx + 36, G - 22], [cx + 34, G - 8]],
  ], 9, 7, 4, SHADE);

  /* --- the abdomen. A broad dome with a WITHERS, a SAG and a CROUP on its
     back, not an ellipse: a back drawn as one arc is the flattest thing an
     animal can have, and the previous weaverjaw's entire body was a single
     `blob` with nothing nameable anywhere on it. Carried high enough that
     there are nearly thirty cells of leg beneath it -- a heavy arthropod
     stands ON its legs, and a body resting on the floor is a tortoise. */
  poly(p, [
    [cx + 3, G - 50], [cx + 6, G - 58], [cx + 14, G - 64], [cx + 24, G - 59],
    [cx + 36, G - 63], [cx + 46, G - 55], [cx + 50, G - 44], [cx + 45, G - 32],
    [cx + 32, G - 27], [cx + 16, G - 27], [cx + 6, G - 32], [cx + 2, G - 40],
  ] as Pt[], BASE);

  /* --- the pale belly. One run along the underside with its top edge rising
     nine cells from the brisket to the flank, so the underside is a shallow V
     and not a bar. */
  poly(p, [
    [cx + 5, G - 38], [cx + 12, G - 29], [cx + 28, G - 27], [cx + 42, G - 31],
    [cx + 46, G - 38], [cx + 42, G - 40], [cx + 30, G - 34], [cx + 14, G - 34],
    [cx + 7, G - 44],
  ] as Pt[], LIGHT);

  /* --- the pedicel. The narrow waist between the two body sections, and the
     single most load-bearing coordinate on this species: without it the front
     mass and the back mass are one continuous barrel and the animal reads as a
     green boar. Two earlier drafts overlapped them and came back as exactly
     that. */
  limbPath(p, [[cx - 5, G - 44], [cx + 5, G - 46]] as Pt[], 10, 9, BASE);
  // And the waist bitten into the TOP contour as well, so the two sections
  // read as two even at 64 px where the pedicel itself is one pixel wide.
  notch(p, cx, G - 48, 10, 6, 0, 1);

  /* --- the NEAR leg bank. FOUR legs, each with a real knee reversal, planted
     across eighty cells of floor: four separated contacts, not one bar. Three
     of them fold DOWN under the body the way a crouched ambush spider's do,
     and leg IV throws its knee up past the abdomen's rear quarter into open
     sky -- the one place on a low wide animal where a knee can rise above the
     back line and still be seen. The bank casts onto the abdomen and the far
     three. */
  legArch(p, [
    [[cx - 20, G - 32], [cx - 30, G - 20], [cx - 34, G - 2]],
    [[cx - 4, G - 32], [cx - 6, G - 16], [cx + 2, G]],
    [[cx + 16, G - 30], [cx + 14, G - 14], [cx + 22, G - 2]],
    [[cx + 34, G - 38], [cx + 52, G - 52], [cx + 48, G - 4]],
  ], 12, 8, 5, BASE, true);

  /* --- the cephalothorax, carried LOW and well forward of the back line, with
     the waist showing between it and the abdomen. */
  cast(p, 30, () => poly(p, [
    [cx - 34, G - 42], [cx - 31, G - 52], [cx - 21, G - 58], [cx - 10, G - 56],
    [cx - 4, G - 48], [cx - 4, G - 36], [cx - 13, G - 30], [cx - 27, G - 30],
    [cx - 34, G - 34],
  ] as Pt[], BASE));

  /* --- THE HEAD SHIELD, and the three armour horns growing off its rim. One
     polygon, one flat facet: armour plate is a plane and a plane takes one tone
     across its whole area, which is how every hard thing in the reference
     generation reads as hard. It is the family's raised points, grown from
     spinnet's soft abdominal spines into bone, and its rim sits FOUR CELLS
     ABOVE THE EYE ROW so the shadow it throws is a brow. */
  cast(p, 30, () => flat(p, () => poly(p, [
    [cx - 33, G - 46], [cx - 32, G - 54], [cx - 27, G - 66], [cx - 22, G - 55],
    [cx - 16, G - 70], [cx - 10, G - 55], [cx - 5, G - 64], [cx - 3, G - 51],
    [cx - 3, G - 45], [cx - 13, G - 49], [cx - 23, G - 51], [cx - 31, G - 49],
  ] as Pt[], ACCENT2)));

  /* --- THE JAW PLATES. Two heavy shearing wedges thrown forward off the front
     of the head with a real gape between them. This is the species' name and
     the whole left half of its silhouette, and it is also THE ONE MARK BELOW
     THE EYES -- a mandible carried as a silhouette feature, which is one of the
     five permitted marks and excludes the other four. */
  poly(p, [
    [cx - 32, G - 40], [cx - 44, G - 40], [cx - 52, G - 33], [cx - 43, G - 29],
    [cx - 31, G - 32],
  ] as Pt[], ACCENT2);
  poly(p, [
    [cx - 31, G - 27], [cx - 43, G - 25], [cx - 50, G - 18], [cx - 39, G - 15],
    [cx - 29, G - 20],
  ] as Pt[], ACCENT2);
  // The gape. A warm dark cavity is the single most under-used colour on the
  // roster and it does more for a face than another whole shading band.
  poly(p, [
    [cx - 31, G - 31], [cx - 42, G - 28], [cx - 44, G - 24], [cx - 31, G - 26],
  ] as Pt[], INNER);
  // Two shear teeth on the inner edge, and two is the count. Structural
  // repetition below three reads as damage and above eight as texture; here the
  // point is only that the trap closes on something.
  poly(p, [[cx - 40, G - 30], [cx - 36, G - 30], [cx - 38, G - 25]] as Pt[], ACCENT2_LIT);
  poly(p, [[cx - 34, G - 25], [cx - 31, G - 25], [cx - 32, G - 29]] as Pt[], ACCENT2_LIT);

  if (p.back) { p.face(cx - 20, G - 42, 15); return; }

  /* --- the face. Under the shield rim, heavy-lidded, set forward on the
     visible half of the head. `lid: LIGHT` and never `lid: BASE`: a body-toned
     lid over a body-toned head is invisible and the whole Numel reading goes
     with it. */
  eyeRow(p, cx - 20, G - 42, 7, 'hooded', 'm', { far: 'm-', lid: LIGHT });
}

/* =========================================================== tallowmoth */

/**
 * 1.  A big pale moth clinging to something, wings held out and swept back with
 *     a lamp-coloured panel burning in each, a warm brown furry body between
 *     them, and two enormous feathered antennae.
 * 2.  Plan B, non-quadruped animal -- moth. What that plan demands is a wing
 *     SPAN with a small body between, and a genuine three-quarter turn: the
 *     NEAR wing lower, larger and forward; the FAR wing higher, smaller and
 *     darker. Beautifly, Dustox, Masquerain and Swellow are all drawn that way
 *     and none of them is a symmetric pair. Our measured symmetry for this
 *     species was 88 %, which is a specimen in a drawer, not an animal.
 * 3.  SMALL (0.6 m). MEASURED AS SHIPPED: 80 x 82 cells = 40 x 41 ref px,
 *     longest 41 against the band 34-42; body area 1061 ref px against
 *     650-1000. Inside the fit clamp; nothing resampled.
 *     ALSO MEASURED: BASE 19.6 %, second hue 31.8 % (the brown body plus the
 *     gold panels) with the gold's own colour at 6.2 %, INNER 1.39 %, SPEC
 *     0.0 %, ink 32.1 %, internal edge 7.0 %, 149 regions, 11.2 tone changes
 *     per scanline. BASE is under target and the reason is worth writing down
 *     rather than hiding: this species is cream on cream, so most of its area
 *     is either the pale wing material or the dark body, and there is not much
 *     left in the middle. The ink is the same fact from the other side -- a
 *     wingspan is a long perimeter around a small area and the outline pass
 *     charges by perimeter. gullswift, the roster's other spread-wing design,
 *     measures 28.6 %.
 * 4.  Aspect 1.05 : 1, WIDE-SPAN: fill about 34 %, which is the band the manual
 *     gives to wings and spread limbs. A low fill is expensive in perimeter and
 *     is only worth paying for where the spread IS the animal.
 * 5.  SMOOTH in surface and STRUCTURED in outline: the wing membranes are flat
 *     facets with no gradient at all, and every event is on their edges.
 * 6.  FIVE masses: the near wing, the far wing, the furry body, the head, the
 *     pair of antennae.
 * 7.  Head verb LIFTED -- it is looking up at a light, which is the whole
 *     species. Body verb: the weight is forward over the front pair of legs and
 *     the abdomen is clear of the floor.
 * 8.  Signature: the antennae. Two broad combs sweeping up and back, unequal in
 *     length and angle, clear of both wings, and the only things on the sprite
 *     that are not smooth curves.
 * 9.  Reversals, cx = 96, G = ground:
 *       (a) near antenna tip, highest point . . . .(cx-22, G-76)
 *       (b) far antenna tip, lower and nearer . . .(cx+14, G-70)
 *       (c) near wing apex . . . . . . . . . . . . (cx-28, G-64)
 *       (d) near wing outer corner . . . . . . . . (cx-46, G-46)
 *       (e-g) three trailing-edge scallops . . . . (cx-38/-27/-14, G-18/-14/-20)
 *       (h) far wing apex, HIGHER than the near . .(cx+22, G-66)
 *       (i) far wing outer corner . . . . . . . . .(cx+34, G-48)
 *       (j) two far-wing scallops . . . . . . . . .(cx+26, G-30), (cx+16, G-27)
 *       (k) thorax ruff, breaking the outline . . .(cx- 1, G-54)
 *       (l) abdomen tip, clear of the floor . . . .(cx+ 6, G-16)
 * 10. Pale cream #e8dca8 wings 40 %; warm brown ACCENT_DARK body and antennae
 *     18 %; gold #d8b048 lamp panels 8 %; INNER at the proboscis.
 *     This is a PALE species, and the manual's rule for one is that it never
 *     holds contrast on its own -- it is GIVEN A DARK NEIGHBOUR. The brown body
 *     is that neighbour, and it is why the wings do not need a heavier outline.
 * 11. FOUR interior events: the face; one lamp panel per wing; the dark
 *     leading-edge band on the near wing; the pale thorax ruff.
 * 12. `compound` at `m`, `far: 's'`, spread 6, one mark below: the proboscis.
 *     A moth has a lens and not an eyeball, and `compound` is the only stamp
 *     with no pupil in it -- a pupil inside a lens is the fastest way to make a
 *     compound eye googly. `iris: ACCENT` puts the lamp gold in the eye, which
 *     `compound` is one of only two styles allowed to ask for.
 * 13. Surface material in ONE place: the thorax ruff, and it breaks the
 *     outline. The membranes are left completely flat -- "most of a wing
 *     membrane" is on the manual's list of things the reference never touches.
 * 14. Internal dark lines: none authored. The pipeline draws the rim of the
 *     brown body against the wings, which is exactly the division a moth has.
 * 15. Not an evolution.
 */
function tallowmoth(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  /* --- the FAR wing. Smaller, set HIGHER and further back, and painted in the
     species' own dark so the pair reads as a turn rather than as a butterfly
     pinned to a card. A facet: a membrane is a plane and a plane takes ONE tone
     across its whole area. */
  flat(p, () => poly(p, [
    [cx + 5, G - 55], [cx + 12, G - 63], [cx + 20, G - 66], [cx + 27, G - 60],
    [cx + 29, G - 51], [cx + 26, G - 42], [cx + 21, G - 37], [cx + 18, G - 42],
    [cx + 12, G - 35], [cx + 8, G - 41], [cx + 5, G - 46],
  ] as Pt[], SHADE));
  // Its lamp panel, in the DARK end of the gold: a band on the shadow side as
  // bright as the near one flattens the turn straight back out again.
  flat(p, () => poly(p, [
    [cx + 11, G - 52], [cx + 15, G - 58], [cx + 25, G - 50], [cx + 22, G - 44],
  ] as Pt[], ACCENT2_DARK));

  /* --- the NEAR wing. The largest mass on the animal: swept down and forward,
     with THREE SCALLOPS cut into its trailing edge. The scallop is the whole
     difference between a wing and a paper aeroplane, it lives in the outline,
     and it survives the icon. Unequal, because a row of identical lobes is a
     comb. */
  cast(p, 44, () => flat(p, () => poly(p, [
    [cx - 6, G - 52], [cx - 14, G - 60], [cx - 24, G - 66], [cx - 36, G - 62],
    [cx - 46, G - 48], [cx - 45, G - 32], [cx - 38, G - 17], [cx - 33, G - 26],
    [cx - 26, G - 12], [cx - 20, G - 22], [cx - 13, G - 18], [cx - 8, G - 27],
    [cx - 5, G - 38],
  ] as Pt[], BASE)));
  // The leading-edge band: the costa of a moth's forewing is always darker
  // than the membrane behind it, and it costs no palette entry.
  flat(p, () => poly(p, [
    [cx - 6, G - 52], [cx - 14, G - 60], [cx - 24, G - 66], [cx - 36, G - 62],
    [cx - 44, G - 51], [cx - 37, G - 56], [cx - 25, G - 60], [cx - 15, G - 55],
    [cx - 8, G - 48],
  ] as Pt[], FORM));
  // THE LAMP. One panel of burning gold down the near wing's outer half, with
  // a white-hot core. A disc here was an earlier draft's mistake: at 64 px a
  // round gold blob in the middle of a wing is an EYE, and the moth came back
  // staring in two places.
  flat(p, () => poly(p, [
    [cx - 12, G - 46], [cx - 18, G - 55], [cx - 40, G - 42], [cx - 35, G - 32],
  ] as Pt[], ACCENT2));
  flat(p, () => poly(p, [
    [cx - 17, G - 52], [cx - 38, G - 40], [cx - 39, G - 37], [cx - 17, G - 49],
  ] as Pt[], ACCENT2_LIT));

  /* --- three short legs, gripping. A perched moth floating clear of the floor
     reads as a dead one, and the three contacts are 20 cells apart. */
  legArch(p, [
    [[cx - 6, G - 34], [cx - 18, G - 22], [cx - 22, G - 1]],
    [[cx + 1, G - 32], [cx - 2, G - 16], [cx + 3, G]],
    [[cx + 6, G - 34], [cx + 19, G - 22], [cx + 24, G - 2]],
  ], 4, 3, 2, ACCENT2_DARK);

  /* --- the body. A warm BROWN capsule between two pale wings, and this is the
     whole of §6.7: a pale species never holds contrast on its own, it is given
     a dark neighbour. Painted in the fixed dark end of the accent ramp, so it
     stays brown wherever the light falls and the wings stay cream. */
  cast(p, 20, () => {
    blob(p, cx, G - 48, 9, 11, ACCENT2_DARK);
    limbPath(p, [[cx + 1, G - 44], [cx + 4, G - 35], [cx + 6, G - 28]] as Pt[],
      12, 5, ACCENT2_DARK);
  });
  // The ruff: a collar of pale thorax fur at the shoulders, and the ONE place
  // on this creature where a surface material is drawn -- it breaks the outline
  // there, which is the only reason to draw one anywhere.
  poly(p, [
    [cx - 10, G - 52], [cx - 7, G - 58], [cx - 2, G - 54], [cx + 2, G - 59],
    [cx + 7, G - 54], [cx + 9, G - 48], [cx - 1, G - 46], [cx - 9, G - 47],
  ] as Pt[], LIGHT);

  /* --- the head, and the antennae: two broad combs, each a spine with four
     teeth on its outer side, at two different lengths and two different angles.
     Feathered is the whole read on a moth's antenna and a bare wire says
     "beetle". Four teeth each is structural repetition inside the budget; the
     old design used a loop of nineteen. */
  blob(p, cx - 2, G - 62, 12, 9, BASE);
  for (const [rootX, tipX, tipY, away] of [[cx - 7, cx - 22, G - 76, -1],
    [cx + 3, cx + 14, G - 70, 1]] as const) {
    const rootY = G - 66;
    const pts: Pt[] = [[rootX, rootY], [tipX, tipY]];
    for (let i = 3; i >= 1; i--) {
      const t = (i + 0.4) / 4;
      const qx = rootX + (tipX - rootX) * t, qy = rootY + (tipY - rootY) * t;
      pts.push([qx + away * 6, qy - 1], [qx + away * 1, qy + 4]);
    }
    poly(p, pts, ACCENT2_DARK);
  }

  if (p.back) { p.face(cx - 2, G - 62, 13); return; }

  /* --- the face. Two lenses filling the head, and the proboscis under them. */
  eyeRow(p, cx - 2, G - 62, 7, 'compound', 'm', { far: 's', iris: ACCENT2 });
  /* THE ONE MARK BELOW THE EYES: the proboscis, curled down off the face and
     drawn last so it lies over the wing root. `INNER` because it is the one
     genuinely dark warm note available on a creature made of cream, and a
     cavity colour is the most under-used thing on the roster. */
  limbPath(p, [[cx - 9, G - 55], [cx - 15, G - 51], [cx - 15, G - 46],
    [cx - 11, G - 46], [cx - 11, G - 49]] as Pt[], 2.6, 1.8, INNER);
}

/* ============================================================== pinchel */

/**
 * 1.  A small flat crab working the tideline, with one claw grown far too big
 *     for it and held up over its own back, the other tucked small and shut on
 *     the far side, and a fringe of weed growing along the back of its shell.
 * 2.  Plan B, non-quadruped animal -- crustacean. What that plan demands is
 *     that it is drawn SMALL, WIDE and LOW, sitting on the floor, with the legs
 *     grouped into one skirt under a shield that OVERHANGS them. That overhang
 *     is the crab read; a shell the same width as the legs merges into one
 *     lozenge.
 * 3.  TINY (0.3 m). MEASURED AS SHIPPED: 67 x 48 cells = 34 x 24 ref px,
 *     longest 34 against the band 26-34; body area 531 ref px against 380-700.
 *     It used to be drawn at the full frame width, twice this, which is why a
 *     0.3 m crab was the same size on screen as a 2.4 m standing stone.
 *     ALSO MEASURED: BASE 21.8 %, LIGHT 17.4 %, green 15.8 % -- against the
 *     1.8 % the manual measured and called invisible -- INNER 1.13 %, SPEC
 *     0.0 %, ink 35.5 %, internal edge 5.4 %, 108 regions, 10.7 tone changes
 *     per scanline. The ink is over budget and on a sprite 67 cells across it
 *     always will be: the outline is two cells thick whatever the creature's
 *     size, so a TINY species pays twice the proportion a LARGE one does for
 *     the same silhouette.
 * 4.  Aspect 1.34 : 1, COMPACT, and by a wide margin the smallest thing in the
 *     group -- which is the point of the size ladder.
 * 5.  STRUCTURED. The shell is a FACETED object: two flat planes meeting at a
 *     ridge, no gradient on either, which is how every hard thing in the
 *     reference generation reads as hard. The old one was a smooth airbrushed
 *     dome with a green ellipse floating on it.
 * 6.  FOUR masses: the carapace, the big claw, the far claw, the leg skirt.
 * 7.  Head verb COCKED -- the two eye stalks lean by different amounts and to
 *     different heights. Body verb: the whole animal is braced against the
 *     weight of the raised claw, so the centre of mass is forward of the
 *     midpoint between the feet.
 * 8.  Signature: the MISMATCHED claw pair -- one enormous and raised, one small
 *     and tucked. Pure silhouette, and it is the family's. The old sprite drew
 *     two matched claws, which is what the brief specifically did not say.
 * 9.  Reversals, cx = 96, G = ground:
 *       (a) big claw tip, highest and most forward . . (cx-33, G-38)
 *       (b) claw wrist step . . . . . . . . . . . . . .(cx-24, G-24)
 *       (c) front corner of the shell, thrown out . . .(cx-22, G-20)
 *       (d-f) three rim teeth . . . . . . . . cx-20 / -9 / +3, G-30/-35/-36
 *       (g) the ridge, where the two shell planes meet (cx+ 4, G-22)
 *       (h) weed fringe, breaking the rear contour . . (cx+26, G-21)
 *       (i) rear corner of the shell . . . . . . . . . (cx+22, G-19)
 *       (j) far claw, tucked and low . . . . . . . . . (cx+26, G-12)
 *       (k) three separated near contacts . . . . . . .cx-18 / +4 / +22
 * 10. Coral #c26a4a shell 30 %; pale coral #e8a074 upper plane 20 %; green
 *     #5f7a48 weed 13 % -- the manual measured this species' green at 1.8 % and
 *     called it invisible, and the fix is not a bigger blotch but putting it
 *     where it BREAKS THE OUTLINE; INNER at the mouthparts.
 * 11. FOUR interior events: the face; the shell ridge (a hard step between two
 *     facets, and NOT also a drawn line -- that step IS the ridge); the pale
 *     face of the big palm; the weed fringe.
 * 12. `round` at `xs` on stalks, `far: 'xs-'`, spread 7, one mark below: the
 *     mouthparts. A stalked crab eye is a hard dark BEAD and nothing like the
 *     grub's lens, the spider's slit or the moth's compound.
 *     `iris: INNER` and NOT `EYE_DARK`, which the first pass used: a bead
 *     painted in the ink value is the same colour as the outline round the
 *     stalk it sits on, and `eyeaudit` measured the two eyes flooding into one
 *     27-cell-wide mass through the stalks. That is the "the eye is not a
 *     separate object" defect the manual names on seven species, arrived at by
 *     a route nobody had hit before, and the fix is the one it prescribes --
 *     draw the neighbouring thing in a different dark, never make the eye
 *     brighter. The spread also went from 6 to 7 so there are five cells of
 *     face between the beads.
 *     EXEMPTIONS, both deliberate: `s` is below the manual's default `m`,
 *     because a stalked eye IS a bead and anything larger turns the animal into
 *     a pair of eyes with a crab underneath -- which is what this sprite used to
 *     be; and the mark below the eyes cannot be within four ref px of a stalked
 *     eye, so it sits on the shell's front rim where a crab's mouthparts are.
 * 13. Surface material in TWO places, both silhouette-breaking: the weed fringe
 *     along the back of the shell, and the rim teeth along its front. Nothing
 *     is drawn on the middle of the shell at all.
 * 14. Internal dark lines: none authored. The pipeline draws the weed's border
 *     and the far claw and far legs against the body. All run edge to edge.
 * 15. First stage.
 */
function pinchel(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  /* --- the FAR leg bank. Three stubs in SHADE, feet planted five cells higher
     than the near three and offset half a stride. */
  legArch(p, [
    [[cx - 4, G - 12], [cx - 7, G - 7], [cx - 6, G - 5]],
    [[cx + 4, G - 11], [cx + 6, G - 7], [cx + 8, G - 5]],
    [[cx + 11, G - 12], [cx + 15, G - 8], [cx + 17, G - 6]],
  ], 5, 4, 2.5, SHADE);

  /* --- the far claw: small, shut and tucked down at the floor. The whole
     Crawdaunt asymmetry is that this one is a QUARTER the size of the other,
     and the two matched claws the old sprite drew are exactly what the brief
     did not ask for. */
  chela(p, cx + 14, G - 12, Math.PI * 0.16, 9, { tone: SHADE, gape: 0 });

  /* --- the NEAR leg bank. Three legs, planted INSIDE the width of the shell
     so the shell overhangs them, and spread across forty cells of floor. */
  legArch(p, [
    [[cx - 8, G - 11], [cx - 12, G - 6], [cx - 13, G - 1]],
    [[cx + 2, G - 10], [cx + 1, G - 5], [cx + 3, G]],
    [[cx + 11, G - 11], [cx + 14, G - 6], [cx + 16, G - 1]],
  ], 6, 4.5, 3, BASE, true);

  /* --- THE CARAPACE, as TWO FLAT FACETS meeting at a ridge. The upper plane
     faces up and toward the lamp and takes the pale material; the lower plane
     turns away and takes the species' own colour; the hard boundary between
     them IS the ridge and there is no line drawn on it and no intermediate
     step. That is the whole of how a shell reads as plate rather than as a
     painted dome, and neither facet carries one cell of gradient.
     The front rim is SERRATED IN THE OUTLINE -- three teeth cut into the
     polygon, five cells deep so they survive the two-cell outline growth and
     the icon halving. Painted on as dark cells they would be invisible at
     64 px and would still cost ink at 128. */
  flat(p, () => poly(p, [
    [cx - 17, G - 17], [cx - 15, G - 26], [cx - 8, G - 30], [cx + 3, G - 31],
    [cx + 11, G - 28], [cx + 16, G - 21], [cx + 16, G - 17], [cx + 2, G - 19],
  ] as Pt[], LIGHT));
  flat(p, () => poly(p, [
    [cx - 17, G - 17], [cx + 2, G - 19], [cx + 16, G - 17], [cx + 11, G - 10],
    [cx + 1, G - 8], [cx - 9, G - 10], [cx - 15, G - 13],
  ] as Pt[], BASE));

  /* --- the weed. A lobed green fringe along the BACK of the shell that breaks
     the rear contour: material drawn only where it changes the outline, which
     is the only place the reference ever draws any. Three lobes, unequal. */
  flat(p, () => poly(p, [
    [cx + 3, G - 31], [cx + 7, G - 38], [cx + 11, G - 30], [cx + 15, G - 35],
    [cx + 20, G - 27], [cx + 22, G - 18], [cx + 19, G - 9], [cx + 13, G - 11],
    [cx + 14, G - 20], [cx + 11, G - 28],
  ] as Pt[], ACCENT2));

  /* --- the big claw. A real arm with a bend in it, then the chela up and out
     over its own back. The arm matters: without it the claw grows straight out
     of the shell and reads as an ear. Cast onto the shell, which is what puts
     it in front. */
  cast(p, 20, () => {
    limbPath(p, [[cx - 13, G - 14], [cx - 22, G - 19]] as Pt[], 9, 8, BASE);
    chela(p, cx - 22, G - 20, -Math.PI * 0.72, 20, { tone: BASE, gape: 0.28, teeth: true });
  });
  // The pale inner face of the palm: one pale mass against the coral shell,
  // and the value step that keeps the claw a separate object at icon size.
  blob(p, cx - 30, G - 28, 3.6, 4.4, LIGHT);
  // A second weed tuft, on the claw's wrist. Two places, both of them
  // silhouette-breaking, which is the only place a surface material may go.
  flat(p, () => poly(p, [
    [cx - 17, G - 20], [cx - 20, G - 26], [cx - 23, G - 21], [cx - 25, G - 25],
    [cx - 25, G - 17], [cx - 19, G - 14],
  ] as Pt[], ACCENT2));

  if (p.back) { p.face(cx - 3, G - 38, 11); return; }

  /* --- the two eye stalks, leaning by DIFFERENT amounts to the SAME row --
     the three-quarter turn is carried by the stalks and by the far eye being
     narrower, never by dropping one eye a cell. */
  limbPath(p, [[cx - 8, G - 28], [cx - 10, G - 37]] as Pt[], 5, 4, BASE);
  limbPath(p, [[cx + 2, G - 29], [cx + 3, G - 37]] as Pt[], 4.5, 3.5, BASE);
  // `xs` and not `s`. ROUND 7: a stalk twenty-five cells long finishes four
  // cells wide, and a nine-cell bead balanced on four cells is a lollipop --
  // the eye stops being part of the animal and becomes an object it is
  // holding up. Seven cells still overhangs the stalk, which is what a crab's
  // eye does, without the head reading as two spheres on sticks.
  eyeRow(p, cx - 3, G - 38, 7, 'round', 'xs', { far: 'xs-', iris: INNER });

  /* THE ONE MARK BELOW THE EYES: the mouthparts, on the front rim of the shell
     where a crab's actually are -- a dark slot with one pale plate under it. */
  poly(p, [[cx - 15, G - 16], [cx - 8, G - 17], [cx - 8, G - 14], [cx - 15, G - 13]] as Pt[], INNER);
  poly(p, [[cx - 15, G - 13], [cx - 8, G - 14], [cx - 9, G - 11], [cx - 15, G - 10]] as Pt[], LIGHT);
}

/* ========================================================== clatterclaw */

/**
 * 1.  A big reef crab that works the flats in gangs: a plated shield carried
 *     high on jointed legs, the near claw thrown out low and gaping in a shear,
 *     the far claw cocked up over the shoulder, and a fringe of weed along the
 *     shell's rear margin.
 * 2.  Plan B, non-quadruped animal -- crustacean, at the heavy end. The plan
 *     demands a BANK of legs rather than a leg count, and this species measured
 *     perimeter-squared-over-area of 68 -- the worst on the roster, where 40 is
 *     the ceiling -- because it had ten separately drawn banded stilts. Here it
 *     has six thick ones that touch for their upper half, and the shell still
 *     overhangs their roots.
 * 3.  LARGE (1.2 m). MEASURED AS SHIPPED: 114 x 90 cells = 57 x 45 ref px,
 *     longest 57 against the band 50-58; body area 1577 ref px against
 *     1300-1900. Inside the fit clamp; nothing resampled.
 *     ALSO MEASURED, and these are the best numbers in the group: BASE 33.7 %,
 *     LIGHT 15.7 %, green 10.6 % against the 1.9 % the manual measured, INNER
 *     1.05 %, SPEC 0.0 %, ink 23.2 %, internal edge 2.8 %, largest connected
 *     flat region 20.9 %, top three 40.4 %, 11.6 tone changes per scanline.
 *     The three faceted shell planes are why: a plane painted flat is one large
 *     connected region, and three of them are half the creature.
 * 4.  Aspect 1.36 : 1, WIDE-SPAN, and more than three times pinchel's area --
 *     which is the whole point of the ladder. Fill about 55 %.
 * 5.  STRUCTURED, and FACETED: the shell is THREE FLAT PLANES meeting at two
 *     hard steps -- an upper plane facing the lamp, a middle plane facing the
 *     viewer, and a lower plane turning away under the rim. No gradient on any
 *     of them, and no line drawn on either step, because THE STEP IS THE RIDGE.
 *     The old sprite was a smooth orange dome with a green ellipse floating on
 *     it, which is a sticker on a balloon.
 * 6.  FIVE masses: the carapace, the near claw, the far claw, the near leg
 *     bank, the far leg bank.
 * 7.  Head verb LIFTED -- imperious, the shield carried high and level and the
 *     stalks standing right off it. Body verb: the weight is thrown onto the
 *     rear pair to counterbalance the near claw, so the centre of mass sits
 *     well behind the midpoint between the feet.
 * 8.  Signature: the two claws at completely different heights, one gaping low
 *     and one shut high. The same family idea as pinchel's in a different
 *     guard, which is what makes the pair read as related without being one
 *     drawing at two sizes.
 * 9.  Reversals, cx = 96, G = ground:
 *       (a) near claw tip, most forward . . . . . . (cx-62, G-38)
 *       (b) claw wrist step . . . . . . . . . . . . (cx-38, G-42)
 *       (c) front corner of the shell . . . . . . . (cx-30, G-42)
 *       (d) crown of the shell . . . . . . . . . . .(cx+ 2, G-70)
 *       (e) upper/middle facet step . . . . . . . . (cx+ 4, G-56)
 *       (f) middle/lower facet step -- THE RIM . . .(cx+ 2, G-45)
 *       (g) weed fringe, breaking the rear contour .(cx+46, G-44)
 *       (h) far claw, cocked high . . . . . . . . . (cx+42, G-72)
 *       (i-k) three near knees, all reversals . . . cx-32 / -2 / +38
 *       (l) three separated near contacts . . . . . cx-38 / +6 / +44
 * 10. Coral #b85a3c shell 30 %; pale coral #e09468 upper plane and palm 18 %;
 *     green #4f6a3c weed 8 % -- the manual measured this species' green at
 *     1.9 % and called it invisible, and the fix is not a bigger blotch but
 *     putting it where it BREAKS THE OUTLINE; INNER at the mouthparts.
 * 11. FOUR interior events: the face; the three shell facets (one statement,
 *     two hard steps); the pale face of the near palm; the weed fringe.
 * 12. `angry` at `s`, spread 7, `brow: FORM`, one mark below: the mouthparts.
 *     The brow bar IS the expression and it is the cheapest character available
 *     to a creature with no face -- it also separates this instantly from
 *     pinchel's round beads, so the two crabs differ in eye as well as in
 *     guard. `brow: FORM` and NOT the default `ACCENT_DARK`: on this palette
 *     the dark accent renders within a few luma of the ink, and that is exactly
 *     how this species' eye ended up 4-connected to its own marking.
 *     EXEMPTION, as pinchel: on a stalked eye the mark below cannot be within
 *     four ref px, so it sits on the shell's front rim.
 * 13. Surface material in ONE place: the weed fringe, and it breaks the
 *     outline. The three shell planes are left completely bare.
 * 14. Internal dark lines: none authored. The pipeline draws the weed's border
 *     and the far bank and far claw against the body; all of them run edge to
 *     edge. The two facet steps carry NO line at all, which is the point.
 * 15. Second stage. CARRIED OVER: the overhanging faceted shield with a weed
 *     fringe on its back margin, the stalked eyes, the mismatched claw pair,
 *     and coral over pale coral. CHANGED: the legs go from stubs to jointed
 *     stilts and the body comes up off the floor; the claws change guard from
 *     display to shear; and the shell goes from two planes to three with a
 *     real rim under it. Taller and meaner, not bigger.
 */
function clatterclaw(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  /* --- the FAR leg bank. Three struts in SHADE, knees shallow, feet planted
     eleven cells higher than the near three and offset half a stride, so the
     far three appear BETWEEN the near ones rather than behind them. */
  legArch(p, [
    [[cx - 10, G - 36], [cx - 20, G - 26], [cx - 22, G - 12]],
    [[cx + 8, G - 34], [cx + 12, G - 22], [cx + 18, G - 11]],
    [[cx + 28, G - 38], [cx + 36, G - 28], [cx + 38, G - 13]],
  ], 13, 9, 5, SHADE);

  /* --- the far claw, cocked high over the shoulder and SHUT. Drawn before the
     shell so it sits behind it, and a quarter smaller than the near one. */
  limbPath(p, [[cx + 10, G - 56], [cx + 16, G - 64]] as Pt[], 12, 11, SHADE);
  chela(p, cx + 16, G - 64, -Math.PI * 0.40, 18, { tone: SHADE, gape: 0.08 });

  /* --- THE CARAPACE, as THREE FLAT PLANES. Upper plane faces up and toward the
     lamp and takes the pale material; middle plane faces the viewer and takes
     the species' own colour; lower plane turns away under the rim and takes the
     species' dark. Two hard steps, no gradient on any facet, and NO LINE DRAWN
     ON EITHER STEP -- that step IS the ridge, and drawing a line on it as well
     is three cells to say what one says. This is how every mineral in the
     reference generation reads as hard, and it is what the old smooth dome
     needed. */
  flat(p, () => poly(p, [
    [cx - 30, G - 42], [cx - 26, G - 56], [cx - 14, G - 66], [cx + 2, G - 70],
    [cx + 18, G - 67], [cx + 31, G - 59], [cx + 38, G - 48], [cx + 24, G - 52],
    [cx + 4, G - 56], [cx - 14, G - 53], [cx - 27, G - 46],
  ] as Pt[], LIGHT));
  flat(p, () => poly(p, [
    [cx - 27, G - 46], [cx - 14, G - 53], [cx + 4, G - 56], [cx + 24, G - 52],
    [cx + 38, G - 48], [cx + 37, G - 40], [cx + 22, G - 42], [cx + 2, G - 45],
    [cx - 16, G - 42], [cx - 29, G - 40],
  ] as Pt[], BASE));
  flat(p, () => poly(p, [
    [cx - 29, G - 40], [cx - 16, G - 42], [cx + 2, G - 45], [cx + 22, G - 42],
    [cx + 37, G - 40], [cx + 36, G - 34], [cx + 24, G - 30], [cx + 2, G - 28],
    [cx - 18, G - 31], [cx - 28, G - 35],
  ] as Pt[], FORM));

  /* --- the weed. A lobed green fringe along the shell's REAR margin, breaking
     the contour: material drawn only where it changes the outline, which is the
     only place the reference ever draws any. */
  flat(p, () => poly(p, [
    [cx + 20, G - 66], [cx + 26, G - 73], [cx + 32, G - 64], [cx + 40, G - 65],
    [cx + 46, G - 54], [cx + 48, G - 42], [cx + 45, G - 30], [cx + 36, G - 25],
    [cx + 28, G - 30], [cx + 33, G - 38], [cx + 38, G - 48], [cx + 31, G - 59],
  ] as Pt[], ACCENT2));

  /* --- the NEAR leg bank. Three legs, THICK, each with a real knee reversal
     under the shell rim, planted across eighty cells of floor. Long is the
     change from pinchel: this animal stands up off the ground and the child
     does not. The bank casts onto the far bank and the shell. */
  legArch(p, [
    [[cx - 16, G - 36], [cx - 32, G - 24], [cx - 38, G - 2]],
    [[cx + 2, G - 34], [cx - 2, G - 18], [cx + 6, G]],
    [[cx + 24, G - 36], [cx + 38, G - 22], [cx + 44, G - 4]],
  ], 16, 11, 6, BASE, true);

  /* --- the near claw. Out LOW and forward and gaping: the shear, the biggest
     single thing on the animal, and the lowest thing on the left of the
     silhouette that is not a foot. The arm has a real bend in it; without one
     the claw grows straight out of the shell and reads as an ear. */
  cast(p, 26, () => {
    limbPath(p, [[cx - 26, G - 44], [cx - 38, G - 42]] as Pt[], 16, 14, BASE);
    chela(p, cx - 38, G - 42, Math.PI * 0.96, 22, { tone: BASE, gape: 0.26, teeth: true });
  });
  // The pale inner face of the palm. One pale mass against the coral shell:
  // the value step that keeps the claw a separate object at icon size.
  blob(p, cx - 48, G - 46, 5.5, 5, LIGHT);
  // A second weed tuft, on the claw's wrist. Two places, both of them
  // silhouette-breaking, which is the only place a surface material may go.
  flat(p, () => poly(p, [
    [cx - 26, G - 50], [cx - 30, G - 58], [cx - 34, G - 51], [cx - 37, G - 56],
    [cx - 38, G - 46], [cx - 29, G - 42],
  ] as Pt[], ACCENT2));

  if (p.back) { p.face(cx - 12, G - 75, 14); return; }

  /* --- the two eye stalks, leaning by DIFFERENT amounts to the SAME row.
     Longer than pinchel's and standing right off the shield, which is the
     "imperious" half of the pose. */
  limbPath(p, [[cx - 16, G - 62], [cx - 19, G - 74]] as Pt[], 7, 5.5, BASE);
  limbPath(p, [[cx - 6, G - 66], [cx - 5, G - 74]] as Pt[], 6.5, 5, BASE);
  // `s` and not `m`, for the reason given on pinchel: an eleven-cell stamp on
  // a five-cell stalk tip reads as a bead held up rather than an eye, and at
  // 1x the two of them ran together into one dark bar across the top of the
  // shell. Nine cells keeps the scowl and loses the bar.
  eyeRow(p, cx - 12, G - 75, 7, 'angry', 's', { far: 's-', brow: FORM });

  /* THE ONE MARK BELOW THE EYES: the mouthparts, under the shell's front rim
     where a crab's actually are -- a dark slot with one pale plate under it. */
  poly(p, [[cx - 27, G - 38], [cx - 16, G - 40], [cx - 16, G - 36], [cx - 27, G - 34]] as Pt[], INNER);
  poly(p, [[cx - 27, G - 34], [cx - 16, G - 36], [cx - 17, G - 32], [cx - 27, G - 30]] as Pt[], LIGHT);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  nettlebug,
  spinnet,
  weaverjaw,
  tallowmoth,
  pinchel,
  clatterclaw,
};
