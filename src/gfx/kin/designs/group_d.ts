/**
 * Design group D -- the birds. REDRAWN FROM THE ANIMAL for round 6. Every one
 * of the six was thrown away and started again from the outline; nothing here
 * is an edit of what shipped.
 *
 * WHAT WAS WRONG, and it was the same three things on all six.
 *
 *  1. THE SUNGLASSES. Every head was `cappedHead()`: a DEEP ellipse with a
 *     BASE ellipse laid over its lower two thirds, and then two eye stamps
 *     placed straight onto the boundary between them. A dark cap with a dark
 *     eye touching it is a lens, and four of these six were unmistakably
 *     wearing a pair. It was never the eye stamps; it was the socket the
 *     design painted behind them.
 *  2. NO BIRD IN THE SILHOUETTE. Head welded to body with no nape, no folded
 *     wing, no tail as a separate mass, no leg with a heel in it. Two of them
 *     had four contour reversals between them.
 *  3. ONE HUE. pipwing and kestrelle declare a gold in the fifth palette slot
 *     and it was never painted -- `maskToCanvas` took whichever colour was
 *     darkest as the ink, their accent was darker than their declared ink, and
 *     the gold was consulted and discarded. The old file wrote that off as
 *     unfixable. It is fixed: the sixth-slot change recovers that colour as
 *     `ACCENT2`, so pipwing's `#e0b060` and kestrelle's `#d8a04a` are on the
 *     sprite for the first time. That was the manual's named fix for both.
 *
 * THE THREE RULES THIS FILE NOW BUILDS TO.
 *
 *   A DARK CAP IS `FORM`, NEVER `ACCENT`, AND NEVER TOUCHES THE EYE. On the
 *   two blue chicks the accent slot IS the outline colour, so a cap painted
 *   `ACCENT` is a cap painted in ink and `internalEdges` rings it as well.
 *   `FORM` is the shade slot: never inked, never lifted by the light pass, and
 *   a darker blue crown over a paler blue face is exactly how Taillow is built.
 *   Under every cap there is then a PALE FACE PATCH with the eye INSIDE it and
 *   pale on all four sides. That construction -- Swellow's, Taillow's,
 *   Wingull's -- is the whole answer to the complaint.
 *
 *   ONE BIG EYE AND ONE SMALL ONE. On a head turned as far as these are, the
 *   far eye is most of the way round the skull. Two dark almonds of equal size
 *   three cells apart average into a single slanted bar at icon scale, which is
 *   the same defect wearing a different hat. Five of the six now pair a full
 *   size with `'s-'` or `'m-'`, squeezed to within two or three cells of the
 *   far contour and riding two cells higher.
 *
 *   A BIRD IS FOUR MASSES AND A LEG WITH A HEEL IN IT. Head with a real nape
 *   sag behind it, body, folded-or-spread wing as its own lens, tail as its own
 *   wedge -- and `birdLeg()`, whose middle point kicks the heel BACKWARDS.
 *   That reversal is the bird's version of the hock, it is free, and it is most
 *   of the difference between a leg and a peg. Every foot is `talon()`, whose
 *   toes are CARVED as notches rather than drawn as gutters, and whose spread
 *   is about 2.3x the tarsus above it.
 *
 * THE SIX, AND NO TWO OF THEM STAND THE SAME WAY.
 *
 *   pipwing    TINY.  A fledgling. Oversized head, wing still folded flat on
 *              the flank with two primary tips overhanging the rump, one foot
 *              put down in front of the other. Compact, 68x67.
 *   slatewing  SMALL. A shard-bird in a flat glide, wings locked straight out
 *              as angular slate slabs with not one curve in them, head thrust
 *              forward over a tan chisel. Flat and wide, 91x59 -- the only
 *              horizontal bird on the roster.
 *   kestrelle  MID.   A kestrel hanging on a headwind. Wings up and cupped,
 *              TAIL FANNED STRAIGHT DOWN and split four ways, talons balled
 *              under the belly. Wide-span, 105x86.
 *   gullswift  MID.   A tern on two very long orange legs, pitched forward over
 *              a straight dagger. Tall and narrow, 94x105 -- kestrelle's exact
 *              transpose on the same rung.
 *   craglide   LARGE. A cliff-hunter hunched under two folded slab wings
 *              arched over its own back, head sunk between them with a hooked
 *              stone beak nearly as long as the skull. Broad, 120x90.
 *   galecrest  LARGE. A storm raptor braced and mantling: a real neck, head
 *              thrown back, five-blade gold crown, both wings lifted in a
 *              stepped double arch, forked tail hanging past its own talons.
 *              Tall, 107x113 -- craglide's transpose.
 *
 * THE SIZE LADDER IS MONOTONIC AND IT IS THE POINT OF THE SET. Body area in
 * reference pixels through the real factory: 606 / 755 / 1034 / 1120 / 1418 /
 * 1607, every one inside its rung's band, against 1273 / 1277 / 1376 / 1087 /
 * 1539 / 1555 before -- which was no ladder at all, and had the 0.3 m chick
 * drawn larger than the 0.9 m seabird.
 *
 * TWO LINES.
 *   pipwing -> kestrelle -> galecrest carry ONE silhouette signature, the
 *   crest: three stubby sprigs, then three blades swept back by the wind it is
 *   hanging in, then a five-blade crown -- and it IGNITES at the third stage,
 *   because galecrest is the only one of the three whose palette genuinely
 *   contains gold. They carry ONE palette relationship, FORM crown over pale
 *   face over blue back. Everything else changes: perched ball -> airborne
 *   hoverer -> braced tower, and a whole hue (rufous) arrives at stage two and
 *   is replaced by gold at stage three.
 *   slatewing -> craglide carry the pale chisel lip on a slab wing and the warm
 *   tan bill and talons against cold grey stone, with the tan pushed from
 *   #a8845a to #c08a3a. The mass moves out of the wingspan and into the
 *   shoulders: slatewing's wings are held straight out and are most of its
 *   width; craglide's are folded over its own back and are most of its height.
 *
 * All six opt out of the type character pass. It scallops trailing edges, which
 * on a creature already made of feathers turns the outline into frost damage,
 * and it chips the stone birds -- both of which are more perimeter, and
 * perimeter is ink.
 *
 * MEASURED, front sprite, whole canvas, through the real factory:
 *
 *   species    bbox    area(px) rung band   ink    edge  BASE  INNER  H2    specks
 *   pipwing     68x67    606     380- 700  27.0%  2.1%  17.2%  0.50% 12.3%   99
 *   slatewing   91x59    755     650-1000  29.3%  4.4%  25.2%  0.63% 15.0%   92
 *   gullswift   94x105  1034     950-1400  29.2%  4.2%  11.7%  0.65% 16.6%   98
 *   kestrelle  105x86   1120     950-1400  28.2%  5.7%  24.1%  0.56% 17.8%  153
 *   craglide   120x90   1418    1300-1900  23.9%  4.2%  26.3%  0.85% 14.3%  138
 *   galecrest  107x113  1607    1300-1900  25.4%  3.0%  27.7%  0.56% 12.8%  150
 *
 * Nothing is at the `fitToCell` clamp, so none of the six is resampled; three
 * of them used to be. `INNER` went from 0.0 % on all six to 0.50-0.85 %, inside
 * the 0.5-2.5 % band, and it is the gape inside each bill -- the free third hue
 * the manual says nobody on the roster was using. `SPEC` is zero on all six:
 * feathers and stone are matte.
 *
 * BUDGETS, counted: masses 14 / 15 / 18 / 14 / 18 / 16 against a 12-20 band;
 * `*Front` calls ZERO on all six, where every one of the old designs made two;
 * `seam`/`seamPath`/`bevel`/`occlude` ZERO; cast shadows 2-3 each, which is
 * what replaced the `*Front` rings; `for` loops writing marks onto the body
 * 0-2 against a ceiling of 4; `speckle` zero; four interior detail events each,
 * one of which is the face.
 *
 * WHAT STILL MISSES, and why, because it is structural rather than lazy:
 *
 *  - BODY PIXELS DARKER THAN THE OUTLINE: 0.0-3.8 % against a 12-25 % target,
 *    and it cannot be reached from this file. On all six palettes the declared
 *    ink IS the darkest colour on the sheet, and `OUTLINE` is that ink mixed
 *    12 % toward the body, which puts it below every tone a design can paint.
 *    pipwing's `DEEP` measures luma 73 against an outline of 68. The only body
 *    tones that can go under it are `INNER` and `EYE_DARK`. Each of the six now
 *    authors the one deep shadow event the manual asks for -- under the jaw,
 *    where the skull overhangs the throat -- and that is what is available.
 *  - INK 28-29 % on slatewing, gullswift and kestrelle against a 28 % ceiling.
 *    Outline is charged per cell of BORDER, and these three are the low-fill
 *    designs: a bird on two stilt legs, a bird made of separated slabs, and a
 *    bird with two spread wings and a fanned tail. Spindliness is the character
 *    in all three cases and it is what the perimeter is being spent on.
 *  - LARGEST CONNECTED REGION 8.9-23.4 % against 25 %. A bird whose whole read
 *    is five separate feathered masses cannot have one region covering a
 *    quarter of it the way a boulder can.
 *  - SILHOUETTE SYMMETRY 60-74 % against 45-65 % for a bird. gullswift and
 *    craglide are inside it. slatewing at 74 % is a deliberate exemption: it is
 *    half mineral, it is seen head-on in a glide, and both wings are out. The
 *    two blue fliers sit at 71 % because a bird with both wings raised is a
 *    near-symmetric object no matter which way its head is turned; the
 *    asymmetry that is available -- far wing higher, smaller, darker, swept a
 *    different way, three primary tips against four -- is all spent.
 */

import {
  ACCENT, ACCENT2, ACCENT2_DARK, ACCENT_DARK, BASE, DEEP, FORM, INNER, LIGHT, SHADE,
} from '../mask.js';
import {
  beak, brow, cast, eyeRow, eyeStamp, flat, limbPath, notch, poly, toeNotches,
  type Pen, type Pt,
} from '../parts.js';

/* ------------------------------------------------------------- shared
 *
 * `bill()`, `foot()` and `cappedHead()` used to live here and all three are
 * deleted. `cappedHead` was the sunglasses: a DEEP ellipse with a BASE ellipse
 * over its lower two thirds, which put a hard dark boundary exactly where the
 * eye stamps were about to land. `bill` and `foot` were hand-rolled because the
 * toolkit's `beak`, `paw` and leg helpers each carried a mandatory ink cost the
 * budget forbade; that cost is gone, so `beak()` is used directly and the two
 * bird-specific pieces the library does not have -- a foot with a hind toe and
 * a leg with a backward heel -- are the two helpers below.
 */

/**
 * A BIRD'S FOOT. Three forward toes carved out of one pad plus a hind toe.
 *
 * `w` is the pad's half-length. The toes are `toeNotches` cut UP into the sole,
 * not gutters drawn on it: a 1-cell dark line between two toes is half a
 * reference pixel and is gone at 64 px, while a notch in the outline is a shape
 * change the outline pass inks for free and which survives all the way down.
 *
 * The spread across the toes is about 2.3 x the tarsus it hangs off, which is
 * the 60-100 % step the manual asks for and the reason our feet used to not
 * exist.
 */
function talon(p: Pen, x: number, y: number, w: number, v: number): void {
  poly(p, [
    [x + w * 0.30, y - w * 0.75], [x + w * 0.44, y - w * 0.14],
    [x - w * 0.30, y + w * 0.06], [x - w * 1.02, y - w * 0.10],
    [x - w * 1.08, y - w * 0.58], [x - w * 0.25, y - w * 0.82],
  ], v);
  // The hind toe. A bird's foot is not symmetric and this is the cheapest way
  // to say so; it also stops the foot reading as a mitten.
  poly(p, [[x + w * 0.10, y - w * 0.70], [x + w * 1.15, y - w * 0.34],
    [x + w * 1.02, y - w * 0.02], [x + w * 0.05, y - w * 0.18]], v);
  toeNotches(p, x - w, x + w * 0.36, y + w * 0.04, 3, Math.max(2.5, w * 0.34));
}

/**
 * A BIRD'S LEG, and the reversal is the whole point.
 *
 * A bird's visible "knee" is its HEEL and it bends BACKWARDS. Three points, not
 * two: the tarsus drops and kicks back to the heel, then comes forward again to
 * the ankle. Nine numbers instead of four, no extra ink, and the entire event is
 * in the outline so it survives the icon -- exactly the change PART 2.3 asks for
 * on a quadruped's hind leg, transposed.
 *
 * `back` shifts the heel; positive kicks it further behind the bird.
 */
function birdLeg(p: Pen, hipX: number, hipY: number, footY: number, w: number, v: number, back = 2): void {
  const drop = footY - hipY;
  limbPath(p, [
    [hipX, hipY],
    [hipX + back + w * 0.5, hipY + drop * 0.42],
    [hipX + back * 0.25, hipY + drop * 0.78],
    [hipX - w * 0.15, footY - w * 0.5],
  ] as Pt[], w * 1.6, w * 0.85, v);
}

/**
 * THE GAPE: the warm dark between the two mandibles, painted after `beak()`.
 *
 * `INNER` is the roster's most underused colour -- 24 of 48 species carry it at
 * 0.7 % of the sprite and the rest carry none -- and in the reference an open
 * mouth, a nostril or a gullet is very often the single warmest saturated note
 * on a cool creature. On six blue-and-grey birds it is the only warm thing that
 * is not the bill, it costs no palette entry, and it is the difference between
 * a bill and a wedge glued to a face. Target 0.5-2.5 % of the sprite.
 *
 * Sized off the same numbers `beak()` was given, so it always lands inside the
 * mandibles and never on the face.
 */
function gape(p: Pen, x: number, y: number, len: number, depth: number, hooked = false): void {
  const tipX = x - len, tipY = y + depth * (hooked ? 0.55 : 0.15);
  const t = 0.66;
  const gx = x + (tipX - x) * t;
  const gy = (y + depth * 0.12) + ((tipY - depth * 0.05) - (y + depth * 0.12)) * t;
  poly(p, [[x - 1.5, y + depth * 0.14], [gx, gy + depth * 0.02],
    [gx, gy + depth * 0.24], [x - 1.5, y + depth * 0.44]], INNER);
}


/* ============================================================== pipwing */

/**
 * PART 1 BRIEF SHEET
 *
 *  1  ANIMAL. A fledgling: a hand-high blue chick with an oversized head, a
 *     wing still folded flat on its flank, and one foot put down in front of
 *     the other. Not a small adult -- a chick.
 *  2  PLAN. B, non-quadruped animal (bird), built as D, the sitting animal,
 *     because that is what a chick is: one body mass, a head nearly as big,
 *     tiny limbs, all the character in the face and one appendage. Obeyed: it
 *     is not stood up, it has no neck and no waist, and the appendage that
 *     keeps it from being a blob (the crest) is SILHOUETTE, not a marking.
 *  3  RUNG. TINY (0.3 m). Long dimension 64 against a band of 52-68; body area
 *     inside 380-700. It is the smallest thing in the group by twenty cells
 *     and the whole point of it is that it looks small next to galecrest.
 *  4  ASPECT AND FILL. 64 x 63, effectively square -- COMPACT, against
 *     kestrelle's long-and-low and gullswift's tall-and-narrow. Fill 44 %.
 *  5  SMOOTH OR STRUCTURED. Smooth, and committed: two internal lines total
 *     (the gape and the cere), no barring, no covert rows, no feather
 *     detailing anywhere. A chick has down.
 *  6  MASSES (4 + 2 legs). body / head+crest / folded wing / tail.
 *  7  HEAD VERB: cocked -- tipped up and forward, curious. BODY VERB: weight
 *     forward over the near foot, the far foot trailing eight cells higher.
 *  8  SIGNATURE. The three-sprig crest, and it is in the silhouette. It is the
 *     badge the whole blue line carries.
 *  9  REVERSALS (12 of 12, named in the code as constants): forehead
 *     (cx-28,G-44), crown (cx-14,G-57), occiput (cx-4,G-51), nape sag
 *     (cx-3,G-38) eight cells under mantle (cx+8,G-46), croup (cx+17,G-40),
 *     tail tip (cx+28,G-31), vent (cx+12,G-20), belly (cx-3,G-14), brisket
 *     (cx-20,G-25), chin (cx-19,G-34), jaw (cx-11,G-33), plus the two primary
 *     tips at (cx+21,G-28) and (cx+16,G-22).
 * 10  HUES. H1 sky blue, the body -- about half the sprite. H2 the near-white
 *     down: breast and face patch, ~22 %. H3 the gold bill and feet, ~6 %.
 *     The gold is the manual's named fix for this species and it is now
 *     actually painted: it lives in `ACCENT2`, recovered from the fifth slot.
 * 11  FOUR DETAIL EVENTS. (a) the face: FORM crown, pale spectacle, eyes,
 *     gold bill. (b) the pale breast. (c) the wing's single FORM band. (d)
 *     the two cast shadows -- head onto breast, wing onto flank.
 * 12  EYES. round 'm' + far 'm-', spread 8, iris INNER, far eye raised two
 *     cells. Round because it is a hatchling. The one mark below the eyes is
 *     the BILL and there is no second one.
 * 13  SURFACE MATERIAL. Drawn in exactly two places, both of which break the
 *     outline: the crest sprigs and the two primary tips. Nowhere else.
 * 14  INTERNAL DARK LINES: two, both inside `beak()` -- the gape (tip to face,
 *     both ends on the bill's own silhouette) and the cere. No closed loops:
 *     the crown, the breast, the face patch and the wing band are all value
 *     regions in tones that cannot ink.
 * 15  LINE. First stage. Carries forward: the crest, and the dark-crown /
 *     pale-face / blue-back relationship.
 */
function pipwing(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  /* ---------------------------------------------------------------------
     THE OUTLINE FIRST, AND EVERY POINT IN IT HAS A NAME. The animal is
     decided here; the tones are decided afterwards and there are four.     */
  const forehead: Pt = [cx - 28, G - 44];  // 1  contour steps UP off the bill
  const crownF  : Pt = [cx - 23, G - 54];
  const crown   : Pt = [cx - 14, G - 57];  // 2  skull apex
  const occiput : Pt = [cx -  1, G - 51];  // 3  crest root, contour turns down
  const napeLow : Pt = [cx -  1, G - 38];  // 4  THE SAG. 8 cells under mantle
  const mantle  : Pt = [cx +  8, G - 46];  // 5  back high point
  const croup   : Pt = [cx + 17, G - 40];  // 6  second high point, lower
  const tailTip : Pt = [cx + 28, G - 31];  // 7
  const vent    : Pt = [cx + 12, G - 20];  // 8  contour RISES under the tail
  const belly   : Pt = [cx -  3, G - 14];  // 9  lowest point of the body
  const brisket : Pt = [cx - 20, G - 25];  // 10 the breast, most FORWARD point
  const chin    : Pt = [cx - 19, G - 34];  // 11 throat cuts in under the bill
  const jaw     : Pt = [cx - 11, G - 33];  // 12 jaw corner, behind the gape

  /* Far leg. Behind, and its foot lands EIGHT CELLS HIGHER than the near
     one's. That difference is the single cue that turns two legs into an
     animal standing on a ground plane instead of a toy glued to a base. */
  birdLeg(p, cx + 9, G - 20, G - 9, 3.2, ACCENT2_DARK, 2);
  talon(p, cx + 11, G - 9, 4, ACCENT2_DARK);

  /* Tail: a short wedge with one feather split, projecting eight cells past
     the folded wing so the two do not read as one lump. Drawn first, so the
     rump and the wing both cover its root. */
  poly(p, [[cx + 10, G - 38], [cx + 23, G - 36], tailTip, [cx + 25, G - 21],
    [cx + 13, G - 23]], BASE);
  notch(p, cx + 27, G - 27, 4, 5, -1, 0);

  /* Near leg, advanced and planted. */
  birdLeg(p, cx - 8, G - 17, G, 4.4, ACCENT2, 3);
  talon(p, cx - 10, G, 5, ACCENT2);

  /* ---- the body ------------------------------------------------------- */
  poly(p, [chin, brisket, [cx - 15, G - 17], belly, vent, [cx + 15, G - 27],
    croup, mantle, napeLow, jaw], BASE);

  /* The down: one pale breast. Its rear edge is a SLANT running down and back,
     not an ellipse -- an axis-aligned oval reads as a stain, a slanted one
     reads as a feather tract. It is a quarter of the animal. */
  poly(p, [[cx - 21, G - 29], [cx - 13, G - 32], [cx - 3, G - 27],
    [cx + 1, G - 19], [cx - 9, G - 14], [cx - 18, G - 19]], LIGHT);

  /* ---- the folded wing, and its shadow on the flank -------------------
     A folded wing is a LENS lying along the flank with two primary tips
     overhanging the rump, and those tips are silhouette. Its leading edge
     starts BEHIND the nape sag, so head and shoulder stay two masses. */
  cast(p, 24, () => {
    poly(p, [
      [cx + 1, G - 45], [cx + 9, G - 44], [cx + 16, G - 38],
      [cx + 21, G - 28], [cx + 16, G - 27], [cx + 16, G - 22],
      [cx + 7, G - 24], [cx, G - 30], [cx - 1, G - 38],
    ], BASE);
  });
  // ONE value decision on the wing, and its boundary runs PARALLEL to the
  // wing's own axis. A band across a wing is a stripe; a band along it is a
  // surface. There is no dark tip marking as well -- a chick has down, not
  // pattern, and saying a thing twice is what put three hundred specks on the
  // old birds.
  poly(p, [[cx + 2, G - 34], [cx + 13, G - 32], [cx + 19, G - 27],
    [cx + 14, G - 26], [cx + 13, G - 23], [cx + 6, G - 25], [cx + 1, G - 29]], FORM);

  /* ---- the head, and its shadow on the breast ------------------------- */
  cast(p, 28, () => {
    poly(p, [forehead, crownF, crown, occiput, napeLow, jaw,
      [cx - 17, G - 31], chin, [cx - 26, G - 38]], BASE);
    // The crest: three sprigs, one polygon, in the BODY colour so they are
    // skull and not ornament. This is the badge the whole blue line carries --
    // sprigs, then swept blades, then a five-blade crown.
    poly(p, [[cx - 17, G - 53], [cx - 17, G - 61], [cx - 11, G - 55],
      [cx - 8, G - 62], [cx - 3, G - 54], [cx - 1, G - 58], [cx - 2, G - 49],
      [cx - 13, G - 50]], BASE);
  });

  /* THE CAP IS `FORM`, NOT `ACCENT`, AND THAT IS THE FIX ON THIS FACE.
     This species' accent slot resolves to #2c3850 -- the same colour the
     outline is drawn in -- so a cap painted `ACCENT` is a cap painted in INK,
     `internalEdges` rings it, and the light pass drags its lit band to a pale
     grey. Two ink shapes on a pale face with two ink eyes under them is what
     the player has been reading as sunglasses. `FORM` is the shade slot, it is
     never inked, it never lifts, and a darker blue crown over a paler blue
     face is exactly how Taillow is built. */
  poly(p, [[cx - 28, G - 44], [cx - 23, G - 54], [cx - 14, G - 57], [cx - 1, G - 51],
    [cx + 1, G - 43], [cx - 5, G - 44], [cx - 10, G - 50], [cx - 21, G - 50],
    [cx - 25, G - 46]], FORM);

  /* THE PALE FACE PATCH, and it is the rest of the answer to the sunglasses.
     The eye lives INSIDE this with pale on all four sides. A dark crown with an
     eye stamp sitting straight on it is a lens; a dark crown, a pale spectacle
     and the eye inside the spectacle is Taillow, Swellow and Wingull. */
  poly(p, [[cx - 29, G - 41], [cx - 26, G - 48], [cx - 18, G - 51], [cx - 8, G - 47],
    [cx - 6, G - 39], [cx - 13, G - 32], [cx - 23, G - 34]], LIGHT);

  beak(p, cx - 26, G - 40, 9, 5, { tone: ACCENT2 });
  gape(p, cx - 26, G - 40, 9, 5);
  /* THE ONE DEEP SHADOW EVENT. Under the jaw, where the skull overhangs the
     throat -- the manual's rule for a pale species is to concentrate the whole
     value range at ONE edge rather than spread a faint grey everywhere, and on
     this bird that edge is the underside of the head. A DEEP patch with a real
     interior is read as a core shadow, so nothing rings it. */
  poly(p, [[cx - 24, G - 34], [cx - 15, G - 32], [cx - 12, G - 34],
    [cx - 16, G - 30], [cx - 23, G - 31]], DEEP);
  /* `tilt: -2` RAISES the far eye. On a three-quarter head the skull recedes
     upward and away, so the far eye rides two cells higher; `eyeRow` exposes
     only a signed `tilt`, and with the house `farSide: +1` the correct sign is
     negative. This is the deliberate lopsidedness the option exists for, not a
     nudge to make the face "look natural". */
  /* `iris: FORM`, not `INNER`: on this palette INNER lands within a dozen luma
     of the pupil and the eye becomes one flat bead. FORM is the shade slot --
     clearly darker than the face, clearly lighter than the ink -- so there is
     an actual iris inside the opening. */
  eyeRow(p, cx - 15, G - 43, 7, 'round', 'm', { far: 'm-', iris: FORM, tilt: -2 });
}
/* ============================================================ kestrelle */

/**
 * PART 1 BRIEF SHEET
 *
 *  1  ANIMAL. A kestrel hanging on a headwind: both wings up and cupped, the
 *     tail fanned STRAIGHT DOWN and spread wide, the talons balled up under
 *     the belly and the head absolutely still, looking at the ground.
 *  2  PLAN. B, non-quadruped animal, and the plan's own warning obeyed --
 *     it is NOT stood up. A flying bird is a wingspan with a small body
 *     between, so the body is a third of the width and the wings are the rest.
 *  3  RUNG. MID (0.8 m). Long dimension 90 against a band of 84-100.
 *  4  ASPECT AND FILL. 90 x 80, wide-span, against gullswift's 74 x 96 on the
 *     same rung: the two MID birds are each other's transpose. Fill ~40 %,
 *     which is what spread wings cost and what they are for.
 *  5  SMOOTH OR STRUCTURED. Structured: brow, malar, wrist, wing coverts,
 *     barred chest. It is the one bird in the line with a hunter's face.
 *  6  MASSES (5). body+head / near wing / far wing / fanned tail / balled
 *     talons.
 *  7  HEAD VERB: lowered and turned -- looking down and slightly toward us.
 *     BODY VERB: hanging. All the weight is in the wings and none of it is on
 *     the ground; the tail reaches down to where the feet would be.
 *  8  SIGNATURE. The wings-up V with the fanned tail hanging straight down
 *     between them. Entirely silhouette, and there is nothing else like it on
 *     the roster.
 *  9  REVERSALS (10): bill tip (cx-45,G-46), forehead (cx-33,G-52), crown
 *     (cx-21,G-64), occiput (cx-9,G-60), nape sag (cx-5,G-52) six under the
 *     mantle (cx+4,G-58), rump (cx+15,G-36), vent (cx+11,G-27), belly
 *     (cx-9,G-30), brisket (cx-23,G-40), plus the wrist reversals at
 *     (cx+27,G-73) and (cx-16,G-75) and the four tail splits.
 * 10  HUES. H1 sky blue: head, primaries, tail -- about 45 %. H2 the rufous
 *     back and wing coverts plus the four chest bars, ~18 % -- this is the
 *     manual's "banded chest in umber" and the umber is the third slot's
 *     #d8a04a, recovered rather than thrown away. H3 the same warm slot at
 *     full brightness on the cere and the talons, ~4 %.
 * 11  FOUR DETAIL EVENTS. (a) the face: FORM crown, pale supercilium, the
 *     malar stripe, an angry eye. (b) the rufous mantle and coverts. (c) the
 *     four chest bars. (d) the two cast shadows -- near wing onto the back,
 *     head onto the breast.
 * 12  EYES. angry 'm' + far 'm-', spread 7, brow FORM, iris INNER, far eye
 *     two cells higher. The brow is the falcon. The one mark below the eyes
 *     is the BILL; the malar is beside the eye, not below it.
 * 13  SURFACE MATERIAL in three places, all silhouette-breaking: the four
 *     primary tips on the near wing, the three on the far wing, and the four
 *     splits in the tail fan. No barring on the wings, no covert rows.
 * 14  INTERNAL DARK LINES: two, both inside `beak()`. The malar, the crown,
 *     the bars and the coverts are all value regions; none of them is a line
 *     and none of them closes a loop.
 * 15  LINE. Second stage. CARRIES: the crest (three sprigs become three swept
 *     blades) and the dark-crown / pale-face relationship. CHANGES: a whole
 *     hue arrives -- rufous goes from nothing to 18 % -- the posture inverts
 *     from perched to airborne, and the area doubles.
 */
function kestrelle(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  const forehead: Pt = [cx - 40, G - 44];
  const crown   : Pt = [cx - 30, G - 57];
  const occiput : Pt = [cx - 19, G - 54];
  const nape    : Pt = [cx - 15, G - 44];   // THE SAG, eight under the mantle
  const mantle  : Pt = [cx -  4, G - 52];
  const rump    : Pt = [cx + 12, G - 33];
  const vent    : Pt = [cx +  8, G - 25];
  const belly   : Pt = [cx - 11, G - 26];
  const brisket : Pt = [cx - 26, G - 33];
  const throat  : Pt = [cx - 33, G - 39];

  /* FAR WING. Higher, narrower, swept a different way, and `SHADE` -- which is
     the one thing SHADE is for: a genuinely separate part set behind another
     one, wanting the ink that separates them. THREE primary tips against the
     near wing's four; whatever the creature has two of is drawn at two
     different sizes, in two places, at two heights. */
  poly(p, [
    [cx - 12, G - 48], [cx - 16, G - 70], [cx - 27, G - 84], [cx - 34, G - 79],
    [cx - 27, G - 76], [cx - 30, G - 70], [cx - 22, G - 68], [cx - 20, G - 62],
    [cx - 8, G - 55], [cx - 4, G - 46],
  ], SHADE);
  // Its covert band, in the dark warm tone: the far side of a bird is the same
  // bird, one step down.
  poly(p, [[cx - 12, G - 49], [cx - 16, G - 70], [cx - 25, G - 81],
    [cx - 21, G - 76], [cx - 12, G - 66], [cx - 6, G - 51]], ACCENT2_DARK);

  /* THE TAIL FAN, and it is the species. A kestrel holding station spreads its
     tail into a wedge pointing STRAIGHT DOWN; nothing else on the roster is
     shaped like that. Four splits carved into the bottom edge, so the feathers
     are silhouette rather than lines painted on a slab. */
  poly(p, [[cx + 10, G - 30], [cx + 25, G - 14], [cx + 24, G - 3],
    [cx - 8, G - 5], [cx - 6, G - 22], [cx + 1, G - 30]], BASE);
  for (let i = 0; i < 4; i++) {
    notch(p, cx - 4 + i * 7.6, G - 4 + i * 0.7, 4, 9 + i, 0.3, -1);
  }

  /* Balled talons, tucked up under the belly the way a hunting falcon carries
     them. Two, at two heights, and the near one larger. */
  poly(p, [[cx - 15, G - 30], [cx - 7, G - 32], [cx - 5, G - 23], [cx - 9, G - 19],
    [cx - 16, G - 21]], ACCENT2);
  poly(p, [[cx - 4, G - 31], [cx + 3, G - 32], [cx + 4, G - 26], [cx - 2, G - 24]], ACCENT2_DARK);

  /* ---- the body ------------------------------------------------------- */
  poly(p, [throat, brisket, [cx - 20, G - 28], belly, vent, rump, mantle, nape,
    [cx - 24, G - 38]], BASE);

  /* THE RUFOUS TRACT. Mantle and both sets of coverts are ONE material and it
     hugs the top contour of the back and the LEADING EDGE of each wing, so it
     reads as a feather tract rather than as a saddle laid on the flank. The
     first draft painted it as a blob in the middle of the sprite and it was a
     sticker at a glance. */
  poly(p, [[cx - 13, G - 46], mantle, rump, [cx + 7, G - 31], [cx - 3, G - 35],
    [cx - 11, G - 41]], ACCENT2);

  /* The pale breast, rear edge a slant, and four rufous bars across it: three
     to eight repetitions, longest at the top and tapering down the run. */
  poly(p, [[cx - 33, G - 38], [cx - 22, G - 41], [cx - 10, G - 36], [cx - 7, G - 27],
    [cx - 18, G - 23], [cx - 30, G - 29]], LIGHT);
  for (let i = 0; i < 3; i++) {
    // Slanted to follow the breast's own axis, and spaced so that the gap
    // between two bars is as wide as a bar. The first draft used a pitch of
    // 3.6 with a bar 4 rows deep, and three bands became one brown block.
    const y = G - 33 + i * 4.8, half = 7 - i * 1.6;
    poly(p, [[cx - 19 - half, y + 2], [cx - 19 + half, y - 1],
      [cx - 19 + half, y + 1.5], [cx - 19 - half, y + 4.5]], ACCENT2_DARK);
  }

  /* NEAR WING. Lower, longer, four primary tips, and it throws its shadow
     across the back -- which is what puts it in front of the far one without
     a single cell of ink. */
  cast(p, 40, () => {
    poly(p, [
      [cx - 6, G - 50], [cx + 9, G - 64], [cx + 25, G - 74], [cx + 47, G - 70],
      [cx + 36, G - 62], [cx + 43, G - 56], [cx + 30, G - 51], [cx + 35, G - 44],
      [cx + 22, G - 42], [cx + 21, G - 35], [cx + 7, G - 35], [cx - 2, G - 43],
    ], BASE);
    // Coverts: a band on the LEADING EDGE, welded to the mantle at the root,
    // so mantle and wing are one continuous rufous tract.
    poly(p, [[cx - 6, G - 51], [cx + 9, G - 65], [cx + 25, G - 75],
      [cx + 22, G - 64], [cx + 7, G - 56], [cx - 3, G - 42]], ACCENT2);
  });
  // ONE value decision on the near wing, running PARALLEL to its axis: the
  // hand, beyond the wrist, is the half turning away from us.
  poly(p, [[cx + 25, G - 71], [cx + 42, G - 66], [cx + 38, G - 60],
    [cx + 31, G - 54], [cx + 25, G - 46], [cx + 20, G - 55]], FORM);

  /* ---- the head, and its shadow on the breast ------------------------- */
  cast(p, 26, () => {
    poly(p, [forehead, [cx - 38, G - 52], crown, occiput, nape, [cx - 21, G - 36],
      [cx - 28, G - 32], throat, [cx - 39, G - 38]], BASE);
    // The crest: three blades, swept BACK off the nape -- pipwing's three
    // sprigs grown up and laid down by the wind it is hanging in.
    poly(p, [[cx - 24, G - 54], [cx - 14, G - 60], [cx - 4, G - 59],
      [cx - 12, G - 54], [cx - 3, G - 53], [cx - 11, G - 49], [cx - 7, G - 46],
      [cx - 19, G - 46]], BASE);
  });

  /* Crown cap in FORM. Never `ACCENT` on this species: its accent slot is
     #232c40, which IS the outline colour, so an ACCENT cap is a cap drawn in
     ink and the face goes straight back to wearing sunglasses. */
  poly(p, [[cx - 40, G - 44], [cx - 38, G - 52], [cx - 30, G - 57], [cx - 19, G - 54],
    [cx - 16, G - 46], [cx - 21, G - 47], [cx - 25, G - 51], [cx - 35, G - 50],
    [cx - 39, G - 47]], FORM);

  /* The pale supercilium and cheek. The eye sits INSIDE it with pale on all
     four sides; the rear edge is a slant, not an ellipse. */
  poly(p, [[cx - 40, G - 41], [cx - 37, G - 49], [cx - 29, G - 52], [cx - 21, G - 48],
    [cx - 19, G - 40], [cx - 25, G - 34], [cx - 35, G - 36]], LIGHT);

  /* THE MALAR STRIPE -- the falcon's moustache, and the marking every kestrel
     is recognised by. Drawn in FORM, not in the ink value: an ink marking
     touching an ink eye is what stopped seven faces on the roster having
     separate eyes. It is a WEDGE reaching the jaw contour, with one clear cell
     of pale between its top and the eye's socket. */
  poly(p, [[cx - 33, G - 38], [cx - 29, G - 37], [cx - 27, G - 30],
    [cx - 32, G - 31]], FORM);

  beak(p, cx - 38, G - 41, 13, 6, { tone: ACCENT2, hooked: true });
  gape(p, cx - 38, G - 41, 13, 6, true);
  // The one deep shadow event: under the jaw, where the skull overhangs.
  poly(p, [[cx - 36, G - 34], [cx - 26, G - 32], [cx - 21, G - 35],
    [cx - 26, G - 30], [cx - 35, G - 31]], DEEP);
  /* THE BROW, and on a hunter it carries more of the expression than the eye
     does. Drawn as its own `FORM` shadow rather than asked for through the
     `angry` stamp: that stamp's brow sits three rows above an eleven-cell
     opening, and on a pale face the two average into one slanted dark lens --
     which is the sunglasses complaint arriving by a different road. A brow
     drawn separately can be placed, angled, and kept a clear two cells off the
     lid. */
  brow(p, cx - 32, G - 49, 10, -1, 0.4);
  /* `iris: FORM`, not `INNER`. On this palette INNER resolves within eleven
     luma of the pupil, so the eye is one flat dark mass with a white dot on it
     -- a bead, not an eye. `FORM` is the species' own shade slot, measured well
     below BASE and well above the ink, so the opening finally has an iris. */
  /* ONE BIG EYE AND ONE SMALL. On a head turned this far the far eye is most
     of the way round the skull; two dark almonds of the same size on a pale
     face average into a single slanted bar at icon scale, which is the
     sunglasses complaint arriving by a different road. */
  eyeRow(p, cx - 29, G - 44, 7, 'slit', 'm', { far: 's-', iris: FORM, tilt: -2 });
}

/* ============================================================ galecrest */

/**
 * PART 1 BRIEF SHEET
 *
 *  1  ANIMAL. A storm raptor standing its ground and mantling: legs braced,
 *     chest thrown up, a long neck carrying the head back and high, both wings
 *     lifted off the shoulders in a stepped double arch, a forked tail hanging
 *     past its own talons.
 *  2  PLAN. B, bird -- and the only one of the six that IS stood up, because
 *     this is the display posture of the line. Weight over the feet, tail as
 *     the counterweight, and a real NECK, which nothing else here has.
 *  3  RUNG. LARGE (1.6 m). Long dimension 108 against a band of 100-116, and
 *     clear of the 110-cell fit clamp.
 *  4  ASPECT AND FILL. 94 x 108 -- TALL, and the exact transpose of craglide's
 *     broad 108 x 84 on the same rung. Fill ~45 %.
 *  5  SMOOTH OR STRUCTURED. Structured: neck, shoulder, wrist, brow, feathered
 *     thigh over a bare tarsus.
 *  6  MASSES (5 + 2 legs). body+neck / head+crown / near wing / far wing /
 *     forked tail.
 *  7  HEAD VERB: thrown back and up -- calling into the front it flies at.
 *     BODY VERB: braced. Weight on the near leg, the far leg set back and its
 *     foot nine cells higher.
 *  8  SIGNATURE. The five-blade gold crown over the double wing arch, with the
 *     forked tail under it. All three are silhouette.
 *  9  REVERSALS (11): bill tip (cx-46,G-84), forehead (cx-32,G-88), crown
 *     (cx-18,G-100), occiput (cx-6,G-94), nape (cx-4,G-76) which is the SAG
 *     between skull and shoulder, shoulder (cx+8,G-66), back (cx+14,G-50),
 *     rump (cx+12,G-40), vent (cx+10,G-38), belly (cx-4,G-34), brisket
 *     (cx-20,G-52), plus the wing wrists at (cx+34,G-94) and (cx+16,G-88) and
 *     the tail fork at (cx+20,G-14).
 * 10  HUES. H1 sky blue ~48 %. H2 the white breast, throat and face ~20 %.
 *     H3 gold: five crown blades, the hooked bill and both sets of talons,
 *     ~8 %. This is the one stage of the line whose palette genuinely contains
 *     gold, so the badge IGNITES here rather than repeating -- "the crest
 *     sparks when the pressure drops".
 * 11  FOUR DETAIL EVENTS. (a) the face: FORM crown cap, pale spectacle, slit
 *     eye, brow, gold bill. (b) the white breast. (c) the FORM band on the
 *     primaries of each wing, parallel to the wing's own axis. (d) the three
 *     cast shadows -- near wing onto the far wing, head onto the chest, near
 *     thigh onto the belly.
 * 12  EYES. slit 'l' + far 'l-', spread 8, iris FORM, far eye two cells
 *     higher, with a separate FORM brow. The one mark below the eyes is the
 *     hooked BILL.
 * 13  SURFACE MATERIAL in three places, all silhouette-breaking: the four
 *     primary tips on the near wing, the three on the far wing, and the tail
 *     fork. Nothing is drawn on a flank.
 * 14  INTERNAL DARK LINES: two, both inside `beak()`. Everything else is a
 *     value region in a tone that cannot ink.
 * 15  LINE. Third stage. CARRIES: the crest, and the dark-crown / pale-face
 *     relationship. CHANGES: the crest goes three blades to five AND pale to
 *     gold; the posture goes from airborne to braced and standing; the area
 *     goes from ~990 to ~1500.
 */
function galecrest(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  const forehead: Pt = [cx - 32, G - 88];
  const crown   : Pt = [cx - 18, G - 100];
  const occiput : Pt = [cx -  6, G - 94];
  const nape    : Pt = [cx -  4, G - 76];  // THE SAG between skull & shoulder
  const shoulder: Pt = [cx +  8, G - 66];
  const back    : Pt = [cx + 14, G - 50];
  const rump    : Pt = [cx + 12, G - 40];
  const vent    : Pt = [cx + 10, G - 36];
  const belly   : Pt = [cx -  4, G - 34];
  const brisket : Pt = [cx - 20, G - 52];
  const throat  : Pt = [cx - 22, G - 70];

  /* FAR WING: the lower, shorter, inner arch of the double arch, in SHADE --
     a genuinely separate part set behind another one, which is the only thing
     SHADE is for. Three primary tips against the near wing's four. */
  poly(p, [
    [cx - 2, G - 66], [cx + 8, G - 86], [cx + 20, G - 94],
    [cx + 32, G - 84], [cx + 23, G - 78], [cx + 30, G - 70], [cx + 20, G - 63],
    [cx + 19, G - 54], [cx + 6, G - 56], [cx - 2, G - 60],
  ], SHADE);

  /* THE FORKED TAIL, hanging past the talons as the counterweight. The fork is
     a notch in the silhouette, not a line drawn on a slab. */
  poly(p, [[cx + 2, G - 44], [cx + 18, G - 42], [cx + 38, G - 14], [cx + 34, G - 3],
    [cx + 26, G - 16], [cx + 22, G - 2], [cx + 12, G - 22], [cx - 4, G - 34]], BASE);

  /* FAR LEG. Feathered thigh in body colour, bare gold tarsus below it, and
     the foot lands NINE CELLS HIGHER than the near one's. */
  poly(p, [[cx + 5, G - 44], [cx + 14, G - 42], [cx + 13, G - 27], [cx + 5, G - 27]], BASE);
  birdLeg(p, cx + 9, G - 28, G - 12, 4, ACCENT_DARK, 3);
  talon(p, cx + 11, G - 11, 5.5, ACCENT_DARK);

  /* NEAR LEG, braced forward and carrying the weight. */
  poly(p, [[cx - 16, G - 48], [cx - 5, G - 46], [cx - 6, G - 27], [cx - 15, G - 29]], BASE);
  birdLeg(p, cx - 11, G - 29, G, 5, ACCENT, 4);
  talon(p, cx - 13, G, 7, ACCENT);

  /* ---- body and neck. The neck is the thing nothing else in this file has,
     and it is what turns a ball with a head on it into a raptor. -------- */
  poly(p, [throat, brisket, [cx - 14, G - 38], belly, vent, rump, back, shoulder,
    nape, [cx - 14, G - 76]], BASE);

  /* The white breast and throat: one region running the whole front of the
     bird from under the jaw to the belly, its rear edge a slant. On a species
     whose second value is white, this IS the second hue and it has to be big
     enough to count. */
  poly(p, [[cx - 21, G - 72], [cx - 12, G - 70], [cx - 4, G - 56], [cx + 2, G - 40],
    [cx - 6, G - 34], [cx - 15, G - 40], [cx - 20, G - 56]], LIGHT);

  /* NEAR WING: the higher, longer, outer arch. Its peak stands eight cells
     above the far wing's, so the top of the silhouette is a STEP rather than
     one lump -- that step and the crown are the only two things the icon has
     to work with up there. Its shadow falls across the far wing. */
  cast(p, 44, () => {
    poly(p, [
      [cx + 4, G - 62], [cx + 20, G - 80], [cx + 36, G - 94],
      [cx + 54, G - 79], [cx + 42, G - 71], [cx + 50, G - 60],
      [cx + 36, G - 57], [cx + 40, G - 43], [cx + 26, G - 49],
      [cx + 28, G - 36], [cx + 16, G - 48], [cx + 8, G - 56],
    ], BASE);
  });
  /* NO hand-painted band on the near wing. One was drawn and deleted: the far
     wing behind it is already SHADE, the cast shadow already separates them,
     and a third dark region in the same forty cells came out as one confused
     blue-grey blob in the middle of the wing. A mass this size gets four tones
     from the light pass on its own; the design's job here was to get the
     fingers into the silhouette, and it has. */

  /* ---- the head, and its shadow on the chest -------------------------- */
  cast(p, 30, () => {
    poly(p, [forehead, [cx - 30, G - 96], crown, occiput, [cx - 5, G - 86],
      [cx - 9, G - 78], [cx - 20, G - 74], throat, [cx - 31, G - 80]], BASE);
    /* THE CROWN: five gold blades, one polygon, swept back off the skull.
       Three sprigs on the chick, three swept blades on the falcon, five here
       -- one silhouette signature carried the whole length of the line, and
       the only change it makes at this stage is that it catches fire. */
    poly(p, [
      [cx - 27, G - 94], [cx - 28, G - 104], [cx - 20, G - 96],
      [cx - 16, G - 108], [cx - 10, G - 96], [cx - 5, G - 106],
      [cx - 1, G - 94], [cx + 4, G - 101], [cx + 5, G - 88],
      [cx + 1, G - 84], [cx - 8, G - 84], [cx - 20, G - 87],
    ], ACCENT);
  });

  /* Crown cap in FORM: a value step on the same surface, never inked, so the
     skull reads as darker on top without a black loop round it. */
  poly(p, [[cx - 32, G - 88], [cx - 30, G - 96], [cx - 18, G - 100], [cx - 6, G - 94],
    [cx - 4, G - 86], [cx - 10, G - 87], [cx - 15, G - 92], [cx - 26, G - 92],
    [cx - 31, G - 90]], FORM);

  /* The pale spectacle. The eye sits inside it with pale on all four sides;
     rear edge a slant. Same construction as the two stages before it. */
  poly(p, [[cx - 33, G - 84], [cx - 30, G - 93], [cx - 20, G - 96], [cx - 10, G - 91],
    [cx - 8, G - 82], [cx - 15, G - 75], [cx - 27, G - 77]], LIGHT);

  beak(p, cx - 30, G - 84, 16, 8, { tone: ACCENT2, hooked: true });
  gape(p, cx - 30, G - 84, 16, 8, true);
  // The one deep shadow event: under the jaw and along the top of the throat,
  // where the skull overhangs the neck.
  poly(p, [[cx - 30, G - 75], [cx - 18, G - 73], [cx - 12, G - 77],
    [cx - 17, G - 70], [cx - 28, G - 71]], DEEP);
  brow(p, cx - 25, G - 92, 12, -1, 0.42);
  /* ONE BIG EYE AND ONE SMALL ONE. Two thirteen-cell dark lozenges three cells
     apart on a thirty-cell skull average into a single slanted bar -- which is
     the sunglasses complaint arriving by a third road, and it is what the first
     draft of this face did. A hard three-quarter turn puts the far eye round
     the side of the skull, so it is 's-' against the near eye's 'l', squeezed
     to within two cells of the far contour, with six cells of pale face
     between the pair. */
  eyeRow(p, cx - 17, G - 86, 8, 'slit', 'l', { far: 's-', iris: FORM, tilt: -2 });
}

/* ============================================================ gullswift */

/**
 * PART 1 BRIEF SHEET
 *
 *  1  ANIMAL. A tern standing on two very long orange legs, body angled
 *     forward and down over a straight dagger of a bill, one long grey wing
 *     blade folded past the fork of its own tail. Aimed, the instant before
 *     it goes in after something.
 *  2  PLAN. B, bird, perched -- but a wading seabird, so the legs are visible
 *     for their whole length and are a third of its height. That is the one
 *     structural fact that separates it from every other bird in this file.
 *  3  RUNG. MID (0.9 m). Long dimension 98 against a band of 84-100.
 *  4  ASPECT AND FILL. 76 x 98 -- TALL AND NARROW, against kestrelle's wide
 *     96 x 82 on the same rung. Two MID birds, each the other's transpose.
 *  5  SMOOTH OR STRUCTURED. Structured: a real neck, a shoulder, a wrist, a
 *     heel joint in each leg.
 *  6  MASSES (5 + 2 legs). body / head+dagger / near wing blade / far wing
 *     blade / forked tail.
 *  7  HEAD VERB: level and forward. BODY VERB: pitched forward over the near
 *     foot, the far foot eleven cells higher and behind.
 *  8  SIGNATURE. The stilt legs and the dagger. In pure silhouette it is the
 *     only bird here standing on visible legs, and the only one whose bill is
 *     a straight spike.
 *  9  REVERSALS (11): bill tip (cx-52,G-87), forehead (cx-36,G-86), crown
 *     (cx-25,G-98), occiput (cx-15,G-93), nape sag (cx-12,G-82), shoulder
 *     (cx-2,G-78), back (cx+8,G-64), rump (cx+10,G-52), vent (cx+6,G-44),
 *     belly (cx-8,G-42), brisket (cx-22,G-56), throat (cx-27,G-74), plus the
 *     tail fork at (cx+13,G-38) and the two heel reversals in the legs.
 * 10  HUES. H1 the white body ~45 %. H2 the grey mantle and both wing blades,
 *     ~24 % -- the manual's rule for a pale species is that the pale mass never
 *     holds contrast on its own and must be GIVEN a dark neighbour, and this
 *     is it. H3 the orange bill, legs and feet, ~8 %.
 *     PALETTE NOTE: this species' `light` slot is literally #ffffff and its
 *     `base` is #e4ecf4, so LIGHT, HILIGHT and SPEC all resolve to the same
 *     white as the body. Nothing here is painted LIGHT: a pale mark on a pale
 *     ground costs a tone and buys nothing. Everything pale is BASE, and every
 *     value step goes DOWNWARD -- FORM for the grey, DEEP for the cap and the
 *     wingtip. That is also why the value range is concentrated at one edge,
 *     which is the third of the manual's four rules for a white creature.
 * 11  FOUR DETAIL EVENTS. (a) the face: DEEP cap, round eye, orange dagger.
 *     (b) the grey mantle. (c) the black wingtip -- a grey wing on a white
 *     bird is two pale tones and no contrast event, and a tern solves that
 *     with a hard dark tip. (d) the three cast shadows: head onto breast,
 *     near wing onto flank, near leg onto the far one.
 * 12  EYES. round 'm' + far 'm-', spread 7, iris FORM, far eye two cells
 *     higher. The one mark below the eyes is the BILL.
 * 13  SURFACE MATERIAL in two places, both silhouette-breaking: the tail fork
 *     and the wing's pointed tip. A tern's wing membrane is flat and carries
 *     no feather detail at all, and neither does this one.
 * 14  INTERNAL DARK LINES: two, both inside `beak()`. The cap, the mantle and
 *     the wingtip are DEEP and FORM patches -- a DEEP patch with a real
 *     interior is read as a core shadow and is left alone, so none of them
 *     rings.
 * 15  Not an evolution. It is the tide-side cousin of the gale line and shares
 *     only the family construction: bird head, folded wing as a lens, tail as
 *     a separate wedge, bird leg with a backward heel.
 */
function gullswift(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  const forehead: Pt = [cx - 40, G - 84];
  const crown   : Pt = [cx - 27, G - 100];
  const occiput : Pt = [cx - 13, G - 94];
  const nape    : Pt = [cx - 10, G - 82];   // THE SAG, two under the shoulder
  const shoulder: Pt = [cx -  2, G - 80];
  const back    : Pt = [cx + 10, G - 66];
  const rump    : Pt = [cx + 13, G - 54];
  const vent    : Pt = [cx +  8, G - 44];
  const belly   : Pt = [cx -  8, G - 42];
  const brisket : Pt = [cx - 29, G - 58];
  const throat  : Pt = [cx - 33, G - 76];
  const jaw     : Pt = [cx - 14, G - 78];

  /* FAR WING BLADE: shorter, set higher and further back, SHADE. */
  flat(p, () => poly(p, [[cx - 2, G - 84], [cx + 10, G - 77], [cx + 19, G - 61],
    [cx + 27, G - 44], [cx + 21, G - 41], [cx + 13, G - 56], [cx + 3, G - 72]], SHADE));

  /* THE FORKED TAIL: a separate wedge below the wing with a real notch in it,
     not a line ruled across a slab. */
  poly(p, [[cx + 4, G - 54], [cx + 15, G - 51], [cx + 23, G - 39], [cx + 19, G - 33],
    [cx + 15, G - 43], [cx + 11, G - 32], [cx + 7, G - 43]], BASE);

  /* FAR LEG: the foot lands ELEVEN CELLS higher than the near one's, and the
     heel bends BACKWARDS, which is the reversal that makes a bird's leg a
     bird's leg rather than a peg. */
  birdLeg(p, cx + 5, G - 48, G - 11, 4.4, ACCENT_DARK, 3);
  talon(p, cx + 7, G - 11, 5.5, ACCENT_DARK);

  /* NEAR LEG, advanced, and it casts onto the far one. */
  cast(p, 12, () => {
    birdLeg(p, cx - 10, G - 46, G, 5.2, ACCENT, 4);
  });
  talon(p, cx - 12, G, 7, ACCENT);

  /* ---- the body ------------------------------------------------------- */
  poly(p, [throat, [cx - 32, G - 66], brisket, [cx - 21, G - 46], belly, vent,
    rump, back, shoulder, nape, jaw], BASE);

  /* THE GREY MANTLE. On a white creature the pale mass never holds contrast on
     its own; it has to be given a dark neighbour, and this is it. FORM, so it
     is a value step on the same bird and can never be ringed. */
  poly(p, [[cx - 11, G - 82], shoulder, back, [cx + 9, G - 52], [cx - 4, G - 58],
    [cx - 11, G - 70]], FORM);

  /* NEAR WING BLADE, folded down past the tail fork, with its shadow on the
     flank. Long and narrow -- a tern's wing is the longest thing about it. */
  cast(p, 22, () => {
    flat(p, () => poly(p, [[cx - 5, G - 82], [cx + 8, G - 75], [cx + 18, G - 58],
      [cx + 31, G - 35], [cx + 24, G - 32], [cx + 14, G - 49], [cx + 1, G - 65],
      [cx - 7, G - 74]], FORM));
  });
  /* THE BLACK WINGTIP. A grey wing on a white bird is two pale tones and no
     contrast event at all; every tern in the world answers that with a hard
     dark tip, and so does this. DEEP as a filled patch, which the ink pass
     reads as a core shadow and leaves alone. */
  flat(p, () => poly(p, [[cx + 31, G - 35], [cx + 24, G - 32], [cx + 18, G - 42],
    [cx + 26, G - 46]], DEEP));

  /* ---- the head, and its shadow on the breast ------------------------- */
  cast(p, 24, () => {
    poly(p, [forehead, [cx - 38, G - 93], crown, occiput, nape, jaw,
      [cx - 24, G - 74], throat, [cx - 39, G - 79]], BASE);
  });
  /* The tern's cap, in DEEP, and it stops FOUR CELLS ABOVE THE EYE. A cap that
     comes down through the eye is what a real tern has and it is also exactly
     the construction the player has been reading as sunglasses; on a white
     head there is no pale material to bound the eye with, so the gap has to do
     it, and the gap is the whole design decision on this face. */
  poly(p, [[cx - 40, G - 84], [cx - 38, G - 93], [cx - 27, G - 100], [cx - 13, G - 94],
    [cx - 10, G - 85], [cx - 15, G - 87], [cx - 24, G - 92], [cx - 36, G - 89]], DEEP);

  beak(p, cx - 38, G - 84, 20, 5.5, { tone: ACCENT2 });
  gape(p, cx - 38, G - 84, 20, 5.5);
  // The deep shadow under the jaw. On a white bird this is the whole value
  // range concentrated at one edge, which is the manual's third rule for a
  // pale species and the reason gullswift used to read as a paper cut-out.
  poly(p, [[cx - 34, G - 76], [cx - 22, G - 74], [cx - 14, G - 78],
    [cx - 20, G - 71], [cx - 32, G - 72]], DEEP);
  eyeRow(p, cx - 22, G - 81, 7, 'round', 'm', { far: 's-', iris: FORM, tilt: -2 });
}

/* ============================================================ slatewing */

/**
 * PART 1 BRIEF SHEET
 *
 *  1  ANIMAL. A shard-bird in a flat glide, seen slightly from above: both
 *     wings locked straight out as angular slate slabs, not one curve in
 *     them, the head thrust forward and down over a tan chisel of a bill, a
 *     short square tail. "Indistinguishable from the wall until the wall
 *     leaves" -- so it is a piece of the quarry that has taken off.
 *  2  PLAN. B (bird) crossed with G (mineral). What it takes from G is
 *     PRECISION OF SHAPE: every edge on the wings is straight, every corner
 *     named, and the wing surfaces are `flat()` facets the light pass does not
 *     touch, because that is the whole difference between hard and soft.
 *  3  RUNG. SMALL (0.5 m). Long dimension 80 against a band of 68-84.
 *  4  ASPECT AND FILL. 80 x 58 -- FLAT AND WIDE, 1.4:1, the widest aspect in
 *     the group and the only bird here whose long axis is horizontal.
 *  5  SMOOTH OR STRUCTURED. Structured, and hard: slabs, facets, a chisel lip,
 *     a bevelled row of back plates.
 *  6  MASSES (5). near wing slab / far wing slab / narrow body / profile head
 *     / square tail.
 *  7  HEAD VERB: turned away into full profile -- the way a bird flattened on
 *     a wall watches you sideways. BODY VERB: gliding, rigid, nothing bent.
 *  8  SIGNATURE. The two straight-edged slabs out to both sides with the head
 *     and bill projecting past the left one. It is a dart, and it is the only
 *     horizontal bird on the roster.
 *  9  REVERSALS (9): bill tip (cx-38,G-47), forehead (cx-29,G-52), crown
 *     (cx-19,G-58), occiput (cx-9,G-55), nape (cx-6,G-46), shoulder
 *     (cx+2,G-44), wing elbow (cx+26,G-38), wing tip (cx+42,G-24), the trail
 *     step at (cx+30,G-22), rump (cx+6,G-20), tail corner (cx+12,G-6), throat
 *     (cx-27,G-42).
 * 10  HUES. H1 slate ~52 %. H2 the umber trailing band on both wings, ~17 %
 *     -- the manual's "umber wing bars", which used to paint 4.4 %. H3 the
 *     tan bill and talons, ~4 %.
 *     EXEMPTION: the declared base is #8a90a0, chroma 22 against a floor of
 *     25. `species.json` is not this file's to edit, so the fix available here
 *     is to give the grey a warm neighbour and a hard one, which is what the
 *     umber band and the facets do.
 * 11  THREE DETAIL EVENTS, and it was four. (a) the face: FORM shelf, one
 *     `slot` eye, tan bill. (b) the pale chisel lip on the near wing's leading
 *     edge. (c) the umber trailing band on each wing, cut by three carved
 *     chisel steps. Plus the two cast shadows. The fourth event -- three
 *     bevelled slate plates down the spine -- was drawn and DELETED; see the
 *     note in the function. Deleting it moved BASE from 21.0 % to 25.2 %, the
 *     largest connected region from 15.6 % to 20.5 % and the speck count from
 *     99 to 92, which is the manual's point about the rule of four made in
 *     numbers.
 * 12  EYES. ONE `slot` at 'm', by `eyeStamp`, with `turned: true`. The head is
 *     in true profile: the far eye is round the back of the skull and drawing
 *     it would be a lie. `slot` because this is the mineral eye -- a hard bar
 *     under a heavy shelf and no catchlight, which is Nosepass and Aron, and
 *     it is what a thing that pretends to be a rock for a living should have.
 *     The one mark below the eye is the BILL.
 * 13  SURFACE MATERIAL in three places, all silhouette-breaking: the stepped
 *     corner in each wing's trailing edge and the tail's two feather splits.
 *     Nothing is drawn on a flank.
 * 14  INTERNAL DARK LINES: two, both inside `beak()`, plus the `plate()`
 *     gutters -- which are FORM, cannot ink, and each of which runs edge to
 *     edge of its own plate. No closed loops.
 * 15  LINE. First stage. CARRIES to craglide: the pale chisel lip on a slab
 *     wing, and the warm tan bill and talons against cold grey stone.
 */
function slatewing(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  /* FAR WING: shorter, set higher, angled differently, SHADE. Straight edges
     only -- a piece of quarry stone has no curves in it, and the rounded wings
     of the earlier drafts were half of why this bird read as a duck. */
  const farWing: Pt[] = [[cx - 10, G - 45], [cx - 19, G - 46], [cx - 29, G - 42],
    [cx - 38, G - 34], [cx - 35, G - 25], [cx - 22, G - 24], [cx - 11, G - 28]];
  flat(p, () => poly(p, farWing, SHADE));
  flat(p, () => poly(p, [[cx - 35, G - 25], [cx - 22, G - 24], [cx - 11, G - 28],
    [cx - 11, G - 32], [cx - 23, G - 29], [cx - 36, G - 30]], ACCENT_DARK));

  /* Tail: a short square wedge with two feather splits carved into its end. */
  poly(p, [[cx - 5, G - 21], [cx + 9, G - 20], [cx + 15, G - 6], [cx - 2, G - 4]], BASE);
  notch(p, cx + 10, G - 5, 5, 6, -0.4, -1);
  notch(p, cx + 3, G - 4, 5, 6, -0.2, -1);

  /* Tucked talons, small and warm, at the root of the tail. */
  poly(p, [[cx - 8, G - 22], [cx - 1, G - 21], [cx, G - 14], [cx - 7, G - 15]], ACCENT);
  poly(p, [[cx + 1, G - 22], [cx + 6, G - 21], [cx + 7, G - 16], [cx + 1, G - 16]], ACCENT_DARK);

  /* Body: a narrow spindle between the slabs, deliberately SMALL. The wings
     ARE the animal; an early draft made the body as wide as either wing was
     long and all three masses welded into one lump. */
  poly(p, [[cx - 10, G - 50], [cx + 5, G - 47], [cx + 10, G - 33], [cx + 8, G - 20],
    [cx - 6, G - 19], [cx - 13, G - 33]], BASE);

  /* NEAR WING: longer, thicker, set a little lower, with a stepped corner in
     its trailing edge. Its shadow falls across the body and the far wing,
     which is what puts it in front of them with no ink at all. */
  cast(p, 40, () => {
    flat(p, () => poly(p, [[cx + 6, G - 48], [cx + 19, G - 47], [cx + 31, G - 41],
      [cx + 46, G - 32], [cx + 48, G - 22], [cx + 33, G - 17], [cx + 19, G - 21],
      [cx + 8, G - 27]], BASE));
  });
  // The pale chisel lip along the leading edge -- the badge the stone line
  // shares, and one flat facet, not a gradient.
  flat(p, () => poly(p, [[cx + 7, G - 48], [cx + 19, G - 47], [cx + 31, G - 41],
    [cx + 45, G - 32], [cx + 41, G - 31], [cx + 29, G - 38], [cx + 18, G - 43],
    [cx + 7, G - 44]], LIGHT));
  // The umber trailing band: the second hue, and it reaches the outline along
  // the whole lower edge, so it is a material rather than a stripe painted on.
  flat(p, () => poly(p, [[cx + 48, G - 22], [cx + 33, G - 17], [cx + 19, G - 21],
    [cx + 8, G - 27], [cx + 9, G - 32], [cx + 20, G - 27], [cx + 34, G - 23],
    [cx + 47, G - 27]], ACCENT));
  // Two chisel steps CARVED out of the trailing edge, plus one in the far
  // wing. On a bird made of stone the primaries are fractures, not feathers;
  // either way they belong in the outline, where the icon can still see them.
  notch(p, cx + 39, G - 19, 6, 8, -0.35, -1);
  notch(p, cx + 26, G - 19, 6, 8, -0.2, -1);
  notch(p, cx - 27, G - 23, 6, 7, 0.3, -1);

  /* THE BACK PLATING IS THE SLABS. Three bevelled `plate()` facets were drawn
     down the spine here, because "slate plating along the back" is the species
     brief, and all three were deleted: at 8x they were a faint pale edge on a
     pale body, and at 64 px they were nothing at all. The plating that
     survives is the thing it should always have been -- the wings, which are
     `flat()` facets with straight edges, hard corners, a chisel lip and three
     carved chisel steps, and which are most of the animal. Everything that
     vanishes at icon scale was never anatomy. */

  /* ---- the head, in true profile, and its shadow on the shoulder ------ */
  cast(p, 22, () => {
    poly(p, [[cx - 29, G - 47], [cx - 27, G - 54], [cx - 19, G - 58],
      [cx - 9, G - 55], [cx - 6, G - 46], [cx - 9, G - 40], [cx - 18, G - 38],
      [cx - 27, G - 42]], BASE);
  });
  /* The crown shelf, in FORM. Never ACCENT: a warm cap on a grey bird is a hat,
     and a dark cap over a dark eye is the sunglasses this roster is trying to
     stop wearing. */
  poly(p, [[cx - 28, G - 48], [cx - 27, G - 54], [cx - 19, G - 58], [cx - 9, G - 55],
    [cx - 7, G - 49], [cx - 12, G - 50], [cx - 20, G - 52], [cx - 26, G - 51]], FORM);
  /* The pale cheek, so the slot eye sits in a bounded pale field instead of
     straight on the slate. */
  poly(p, [[cx - 28, G - 45], [cx - 26, G - 50], [cx - 17, G - 52], [cx - 9, G - 49],
    [cx - 8, G - 43], [cx - 16, G - 39], [cx - 25, G - 41]], LIGHT);

  beak(p, cx - 26, G - 46, 12, 6, { tone: ACCENT2 });
  gape(p, cx - 26, G - 46, 12, 6);
  // The one deep shadow event: under the jaw, where the skull overhangs.
  poly(p, [[cx - 25, G - 40], [cx - 16, G - 38], [cx - 10, G - 41],
    [cx - 15, G - 36], [cx - 24, G - 37]], DEEP);
  if (!p.back) eyeStamp(p, cx - 19, G - 47, 'slot', 'm', { turned: true });
  p.face(cx - 19, G - 47, 9);
}

/* ============================================================= craglide */

/**
 * PART 1 BRIEF SHEET
 *
 *  1  ANIMAL. A cliff-hunter perched and hunched: two enormous folded wing
 *     slabs arched high over its own back, a heavy low body under them, short
 *     splayed legs in big bronze talons, and a small head sunk forward between
 *     the shoulders carrying a hooked stone beak nearly as long as the skull.
 *     A vulture at rest is a pair of raised shoulders with an animal hiding
 *     under them, and that is what this is.
 *  2  PLAN. B (bird) crossed with G (mineral), like its first stage: straight
 *     edges, named corners, `flat()` facets on every wing surface.
 *  3  RUNG. LARGE (1.5 m). Long dimension 113 against a band of 100-116.
 *  4  ASPECT AND FILL. 113 x 86 -- BROAD, and the deliberate transpose of
 *     galecrest's tall 103 x 109 on the same rung. Two LARGE birds with
 *     opposite proportions is the cheapest way to keep them apart at 64 px.
 *  5  SMOOTH OR STRUCTURED. Structured and hard, like slatewing.
 *  6  MASSES (5 + 2 legs). near wing arch / far wing arch / heavy torso /
 *     sunk head / short square tail.
 *  7  HEAD VERB: sunk -- pulled down and forward between the shoulders,
 *     defensive and about to drop. BODY VERB: weight down and splayed, the
 *     near foot forward and the far foot thirteen cells higher and behind.
 *  8  SIGNATURE. The high double arch of the shoulders with the beak jutting
 *     out of the notch beneath them. Entirely silhouette.
 *  9  REVERSALS (10): beak tip (cx-61,G-48), forehead (cx-46,G-56), crown
 *     (cx-36,G-64), occiput (cx-25,G-60), the shoulder notch (cx-18,G-52)
 *     which is the SAG the head sits in, near-wing wrist (cx+26,G-78),
 *     far-wing apex (cx+4,G-84), near-wing tip (cx+52,G-50), the three chisel
 *     steps at (cx+38,G-46) / (cx+32,G-34) / (cx+24,G-46), rump (cx+22,G-32),
 *     belly (cx-6,G-18), brisket (cx-24,G-32).
 * 10  HUES. H1 slate ~50 %. H2 the bronze trailing band on both wings plus the
 *     beak and both sets of talons -- ~16 %, which is the manual's "push the
 *     gold to 15 %". H3 `INNER`, the warm dark inside the open hooked beak,
 *     ~1.5 % -- the third hue the manual says nobody on the roster is using.
 * 11  FOUR DETAIL EVENTS. (a) the face: FORM shelf, one large angry eye and
 *     one small far one, the open bronze beak with its INNER gape. (b) the
 *     pale chisel lip along the near wing's leading edge. (c) the bronze
 *     trailing bands. (d) the pale breast, and the three cast shadows that go
 *     with the wings and the head.
 * 12  EYES. angry 'm' + far 's-', spread 8, iris FORM, far eye two cells
 *     higher. `angry` is kept because the brow is the only thing that will
 *     read under a shoulder arch that overhangs the face -- but the far eye
 *     drops two whole sizes so the pair cannot average into one dark bar.
 *     The one mark below the eyes is the BEAK.
 * 13  SURFACE MATERIAL in three places, all silhouette-breaking: the three
 *     chisel steps in the near wing's trailing edge, the two in the far
 *     wing's, and the tail's split. Nothing on a flank.
 * 14  INTERNAL DARK LINES: the beak's gape (both ends on the beak's own
 *     silhouette) and its cere. Everything else is a value region.
 * 15  LINE. Second stage. CARRIES: the pale chisel lip on a slab wing, and
 *     the warm bronze bill and talons against cold grey stone. CHANGES: the
 *     bronze goes from #a8845a to #c08a3a -- warmer and more saturated -- and
 *     the mass moves out of the wingspan and into the shoulders. slatewing's
 *     wings are held straight out and are most of its width; craglide's are
 *     folded and arched over its own back and are most of its height.
 */
function craglide(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  /* FAR WING ARCH: higher, smaller, further left, and SHADE -- a separate part
     set behind another, which is the one thing SHADE is for. */
  flat(p, () => poly(p, [[cx - 12, G - 46], [cx - 8, G - 68], [cx + 4, G - 84],
    [cx + 18, G - 78], [cx + 22, G - 60], [cx + 16, G - 48], [cx + 8, G - 56],
    [cx - 4, G - 48]], SHADE));
  flat(p, () => poly(p, [[cx + 22, G - 60], [cx + 16, G - 48], [cx + 8, G - 56],
    [cx + 6, G - 60], [cx + 15, G - 54], [cx + 20, G - 64]], ACCENT_DARK));
  notch(p, cx + 12, G - 51, 6, 7, 0.3, -1);

  /* Tail: a short square wedge behind the legs, one split carved in the end. */
  poly(p, [[cx + 14, G - 28], [cx + 32, G - 24], [cx + 38, G - 8], [cx + 18, G - 10]], BASE);
  notch(p, cx + 33, G - 9, 6, 7, -0.4, -1);

  /* FAR LEG: short, thick, splayed, and its foot lands THIRTEEN CELLS higher
     than the near one's. */
  poly(p, [[cx + 4, G - 32], [cx + 15, G - 30], [cx + 14, G - 20], [cx + 4, G - 21]], BASE);
  birdLeg(p, cx + 9, G - 21, G - 15, 5, ACCENT_DARK, 3);
  talon(p, cx + 11, G - 14, 7, ACCENT_DARK);

  /* NEAR LEG: forward, and it carries the weight. */
  poly(p, [[cx - 22, G - 36], [cx - 10, G - 34], [cx - 11, G - 20], [cx - 22, G - 22]], BASE);
  birdLeg(p, cx - 17, G - 20, G, 6, ACCENT, 4);
  talon(p, cx - 19, G, 10, ACCENT);

  /* ---- the torso: heavy, low, and wider than it is tall --------------- */
  poly(p, [[cx - 25, G - 44], [cx - 16, G - 52], [cx + 2, G - 52], [cx + 18, G - 46],
    [cx + 22, G - 32], [cx + 12, G - 19], [cx - 6, G - 18], [cx - 24, G - 30]], BASE);

  /* The pale breast: one bounded region on the front of the bird, rear edge a
     slant. On a grey species the pale material is what stops the whole animal
     being one value. */
  poly(p, [[cx - 24, G - 42], [cx - 14, G - 46], [cx - 2, G - 40], [cx + 2, G - 26],
    [cx - 8, G - 19], [cx - 22, G - 24]], LIGHT);

  /* NEAR WING ARCH: the big one. It rises off the shoulder, crosses the whole
     back and falls to the right in three chisel steps. Its shadow lands on the
     far wing and the back, which is what puts it in front without ink. */
  cast(p, 50, () => {
    flat(p, () => poly(p, [[cx, G - 50], [cx + 10, G - 68], [cx + 26, G - 78],
      [cx + 44, G - 68], [cx + 52, G - 50], [cx + 47, G - 38], [cx + 39, G - 44],
      [cx + 33, G - 34], [cx + 26, G - 42], [cx + 15, G - 38], [cx + 6, G - 52]], BASE));
  });
  // The pale chisel lip along the leading edge: the badge the stone line
  // shares with slatewing, and one flat facet rather than a gradient.
  flat(p, () => poly(p, [[cx + 1, G - 51], [cx + 10, G - 68], [cx + 26, G - 78],
    [cx + 43, G - 68], [cx + 39, G - 65], [cx + 25, G - 73], [cx + 12, G - 63],
    [cx + 4, G - 51]], LIGHT));
  // The bronze trailing band -- H2, and it reaches the outline along the whole
  // lower edge of the wing, so it is a material and not a stripe laid on top.
  flat(p, () => poly(p, [[cx + 52, G - 49], [cx + 47, G - 38], [cx + 39, G - 44],
    [cx + 33, G - 34], [cx + 26, G - 42], [cx + 15, G - 38], [cx + 16, G - 44],
    [cx + 26, G - 48], [cx + 33, G - 41], [cx + 39, G - 50], [cx + 47, G - 45]], ACCENT));

  /* ---- the head, sunk into the notch between the arches --------------- */
  cast(p, 26, () => {
    poly(p, [[cx - 46, G - 52], [cx - 44, G - 60], [cx - 36, G - 64],
      [cx - 25, G - 60], [cx - 18, G - 52], [cx - 20, G - 42], [cx - 30, G - 38],
      [cx - 43, G - 44]], BASE);
  });
  /* The crown shelf, in FORM: a value step on the same surface, never inked. */
  poly(p, [[cx - 46, G - 52], [cx - 44, G - 60], [cx - 36, G - 64], [cx - 25, G - 60],
    [cx - 19, G - 53], [cx - 25, G - 54], [cx - 32, G - 57], [cx - 42, G - 56]], FORM);
  /* The pale face patch: the eyes sit INSIDE it, bounded by pale on all four
     sides, which is the whole answer to a dark shelf plus a dark eye reading
     as a lens. Rear edge a slant. */
  poly(p, [[cx - 46, G - 49], [cx - 43, G - 56], [cx - 34, G - 59], [cx - 24, G - 55],
    [cx - 21, G - 47], [cx - 28, G - 40], [cx - 41, G - 42]], LIGHT);

  beak(p, cx - 44, G - 50, 17, 10, { tone: ACCENT2, hooked: true, open: 0.35 });
  gape(p, cx - 44, G - 50, 17, 10, true);
  // The one deep shadow event: under the jaw, where the skull overhangs the
  // throat and the shoulder arch overhangs both.
  poly(p, [[cx - 42, G - 41], [cx - 30, G - 38], [cx - 22, G - 42],
    [cx - 28, G - 35], [cx - 40, G - 37]], DEEP);
  /* The pair is set BACK from the beak root, not centred on the visible face.
     The first draft put the near eye's outer edge on top of the beak's cere and
     the two ink masses flooded together -- which is the defect that stopped
     seven faces on the roster having a separate eye at all. Three clear cells
     of pale face between them is the whole fix. */
  eyeRow(p, cx - 29, G - 51, 7, 'angry', 'm', { far: 's-', iris: FORM, brow: FORM, tilt: -2 });
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  pipwing,
  kestrelle,
  galecrest,
  gullswift,
  slatewing,
  craglide,
};
