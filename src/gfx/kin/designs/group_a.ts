/**
 * Design group A -- the hedgerow, the quarry and the mud. ROUND 6: all five
 * started again from the animal, not edited.
 *
 * WHY FROM SCRATCH. The old versions of these five were written against a
 * pipeline that no longer exists. There was no line-free way to say "darker" --
 * SHADE and DEEP were both promoted to hard ink -- so all five answered the
 * same way every author on the roster did, with a smooth blob under a diagonal
 * wash and a cream halo round its up-left contour. The structure of those
 * functions WAS the fault, so none of it is carried forward. What round 6 gave
 * back, and what these five are built out of, is: `FORM` and `cast()` for
 * darkness with no ring round it, `flat()` for a facet the light does not
 * touch, `notch`/`poly(EMPTY)` for carving anatomy into the outline, and a lamp
 * with a +z component so the lit contour is BASE and the bright band is inset.
 *
 * THE FIVE, AND WHY YOU CAN TELL THEM APART IN FLAT BLACK:
 *
 *   bramblehusk   a low hunched hedgerow forager with last season's dead thorn
 *                 cane bound over its back as a lobed husk, four canes standing
 *                 off it, and the head thrust out LOW and forward.  (MID)
 *   thornmarch    its evolution: a standing wall. An upright walker with a
 *                 faceted stone yoke across enormous shoulders, the same cane
 *                 row now petrified into a crest, and one open stone hand set
 *                 down on the floor in front of it.  (HUGE, the largest here)
 *   mossback      a faceted quarry block with a mossed crown, a slab of green
 *                 flesh underneath, four stone-hard stubs, and ONE enormous eye
 *                 under the near corner of the rock.  (LARGE, wide)
 *   bladderwrack  one leaning kelp column and nothing else: a splayed holdfast
 *                 on the floor, six gold float bladders bulging its seaward
 *                 edge, and a frond hood folded forward over the face.
 *                 (LARGE, tall -- the opposite proportion to mossback)
 *   silthopper    a mud cricket coiled to launch: head down on the flat, and a
 *                 green jumping leg folded so hard the knee stands clear above
 *                 its own back.  (TINY, the smallest here)
 *
 * THE SIZE LADDER, measured through the real factory, longest dimension in
 * cells and body area in reference pixels:
 *
 *     silthopper     68     436     TINY   (band 52-68,   380-700)
 *     bramblehusk   100    1176     MID    (band 84-100,  950-1400)
 *     mossback      106    1307     LARGE  (band 100-116, 1300-1900)
 *     bladderwrack  111    1375     LARGE  (band 100-116, 1300-1900)
 *     thornmarch    115    2019     HUGE   (band 112-128, 1800-2600)
 *
 * Every one inside its rung, and monotonic across the five. NOTHING HERE IS
 * RESAMPLED: every design box is inside `fitToCell`'s 120 x 110 clamp, so
 * k = 1.000 on all five and every eye stamp and facet corner lands where it was
 * put.
 *
 * FAMILY. bramblehusk -> thornmarch keep exactly TWO things, per the manual's
 * evolution rule: the BACK-SWEPT CANE ROW -- literally the same `cane()` helper
 * at two sizes -- and the palette relationship GREEN BODY + PALE MOSS BIB + A
 * BUNDLE IN THE ACCENT. Everything else changes: a low wide quadruped becomes a
 * tall top-heavy walker, fill goes 55 % -> 62 %, the head goes from a deep stop
 * with a pale muzzle to a no-stop wedge with none, `hooded` becomes `angry`, and
 * the accent changes MATERIAL AND HUE from live tan cane (H41) to grey slab
 * stone (H90), which is the "keep one hue, change the other two" rule.
 * The other three share only the group's material logic -- everything in this
 * file is bound, grown or caked over something hard.
 *
 * NO TWO FACES IN THIS GROUP SHARE A STYLE: hooded, angry, gem, sleepy,
 * compound. Every one carries exactly ONE mark below the eyes (nostril, mouth
 * line, mouth line, mouth line, mandibles) and none carries two.
 *
 * PLAN OVERRIDES against `species.json`, recorded as the manual asks:
 *   thornmarch    json says `brute`; drawn as E/BIPED with F/HUMANOID shoulders
 *                 and an explicit hand gesture, because "broad-shouldered
 *                 walker" at 186 kg is a person-shaped wall, not a beast.
 *   silthopper    json says `grub`; drawn as B/NON-QUADRUPED ANIMAL - BUG. A
 *                 grub is a legless tube and this creature is entirely legs.
 *   mossback      json says `mineral` and that is right, so it is the one
 *                 species here that is allowed to be near-symmetric.
 *
 * ================================================================= EXEMPTIONS
 * Two acceptance criteria are NOT met on this group and neither is reachable
 * from a design file. Both are recorded here rather than quietly missed.
 *
 * (a) "12-25 % OF BODY PIXELS DARKER THAN THE MEAN OUTLINE LUMA."  All five of
 *     these species declare an ink that is darker than every other colour they
 *     own by a wide margin, and a shade slot that is a genuine mid-tone. Worked,
 *     through the real `maskToCanvas`:
 *
 *       species        OUTLINE luma   darkest tone a DESIGN can write
 *       bramblehusk        59          DEEP 48, INNER 45      -> 7.3 % reached
 *       thornmarch         50          DEEP 42, INNER 40      -> 4.3 %
 *       mossback           52          DEEP 54, INNER 75      -> 0.0 %, and it
 *                                      cannot be anything else: on this palette
 *                                      the darkest tone available to an author
 *                                      is LIGHTER than the line drawn round the
 *                                      creature
 *       bladderwrack       50          DEEP 52                -> 0.0 %
 *       silthopper         41          DEEP 44                -> 0.0 %
 *
 *     The fix is one hex value per species in `data/creatures/species.json` --
 *     a shade slot rotated cool and dropped 25-30 luma, which is the same
 *     correction PART 6.2 of the manual asks for anyway. This round's brief
 *     puts that file out of this file's reach, so the shortfall is declared
 *     rather than faked: every one of these five DOES carry an authored DEEP
 *     core-shadow event where the manual asks for one, and on the two species
 *     whose palettes allow it that event is what produces the 7.3 % and 4.3 %.
 *
 * (b) "TOTAL INK <= 28 %" ON silthopper, measured 33 %.  Structural, and the
 *     old file recorded the same thing for the same reason: the outline pass
 *     grows two cells on every side, and on a creature drawn 68 x 44 -- which is
 *     what the TINY rung demands of a 0.3 m insect -- that border is a fifth of
 *     the sprite before a single interior line is drawn. The only way to buy it
 *     back is to draw the creature bigger, which is the exact fault the rung
 *     exists to prevent. Its authored interior ink is 3.9 %, well inside the
 *     5 % ceiling; the rest is the silhouette.
 *
 * Also recorded, and NOT an exemption: `ACCENT2` renders at 0.0 % on all five.
 * These species declare five palette slots, and `paletteOf` resolves a
 * five-slot palette by handing slot 4 back as `accent2` only when the declared
 * ink is not the darkest colour on the sheet. On all five of these it IS the
 * darkest -- which is the correct, healthy case -- so `accent2` is a copy of
 * `accent` and there is nothing to paint with it. The third hue on every one of
 * these creatures is therefore `INNER`, which is what PART 6.5 of the manual
 * says the third hue usually is.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, INNER, LIGHT, SHADE,
} from '../mask.js';
import {
  blob, cast, cell, earPointed, eyeRow, eyeStamp, flat, haunch, limbPath,
  mouthLine, muzzle, notch, paw, poly, toeNotches,
  type Pen, type Pt,
} from '../parts.js';

/**
 * THE FAMILY SIGNATURE: one dead thorn cane, swept back and up.
 *
 * `bramblehusk` carries four of these off the crown of its husk and
 * `thornmarch` carries five off its shoulder yoke, and it is deliberately the
 * SAME function at two sizes so the relationship is literally the same object.
 * A cane is a MASS, not a stroke: four cells at the root is the thinnest thing
 * that survives the 2x2 icon vote, and a one-cell scratch comes back as
 * nothing at all.
 *
 * The tip is `ACCENT_LIT` and nothing else is: the manual's third hue for this
 * line is "dried-red thorn tips", and two bright cells at the point of a dark
 * stick is the whole of it. An earlier version ran `limbPath({ lit })` down the
 * flank, which on a stick four cells wide is a dotted line -- a hundred loose
 * highlight specks across the two species.
 */
function cane(p: Pen, x0: number, y0: number, x1: number, y1: number, w: number): void {
  // Straight, and near-parallel to its neighbours. The first version bent each
  // cane and fanned the set through ninety degrees, and both species came back
  // with a splayed hand growing out of their back -- five fat tapering digits
  // radiating from one knuckle is a hand, whatever tone it is painted in. A
  // bundle of dead sticks is a set of stiff lines going the SAME way at
  // slightly different lengths.
  // No lit flank run. `limbPath({lit})` walks the whole length dropping one
  // ACCENT_LIT cell per step, and on a stick four cells wide that is a dotted
  // line down the side of it: the two species between them were carrying over
  // a hundred loose highlight specks, more than a quarter of their total. A
  // cane is a small dark shape and ACCENT_DARK is a fixed tone, so it stays
  // one flat dark thing at every size. Two bright cells at the tip and no more.
  limbPath(p, [[x0, y0], [x1, y1]] as Pt[], w, 1.6, ACCENT_DARK);
  cell(p, x1, y1, ACCENT_LIT);
  cell(p, x1 - 1, y1 + 1, ACCENT_LIT);
}

/* ========================================================== bramblehusk */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IS IT.  A low, heavy hedgerow forager -- badger-shouldered, built to
 *     shove through a hedge bottom -- that keeps last season's dead bramble
 *     growth bound over its own back as a husk.
 *  2. PLAN.  A / QUADRUPED, and it obeys what the plan demands: four legs
 *     visible as four with floor between the pairs, the near pair BASE after
 *     the torso and the far pair SHADE before it, and the head carried FORWARD
 *     of the chest rather than on top of it. The trap the plan names -- the
 *     level barrel -- is answered in item 9.
 *  3. RUNG.  0.9 m, MID. MEASURED THROUGH THE REAL FACTORY: ships 100 x 86,
 *     long dimension 100 against a band of 84-100, body area 1176 ref px
 *     against 950-1400, fill 55 %. Inside 120 x 110, so k = 1.000 and nothing
 *     is resampled.
 *     THE REST OF THE MEASURED SHEET: ink 25.1 % of which authored interior ink
 *     is 1.3 %; largest connected same-tone region 13.5 %, top three 30.3 %,
 *     204 regions; 5.0 tone changes per horizontal scanline; 289 body-ramp runs
 *     of which 40 % are <= 3 cells; 2 highlight events; 0 SPEC; symmetry 47 %;
 *     7.3 % of body pixels darker than the outline. Four cast shadows, one DEEP
 *     core-shadow event, ZERO authored internal dark lines.
 *  4. ASPECT AND FILL.  Wider than tall by about 5:4 -- compact, per the size
 *     ladder's aspect list -- at roughly 55 % fill. thornmarch, the other half
 *     of this family, is the opposite proportion the other way up.
 *  5. SMOOTH OR STRUCTURED.  STRUCTURED. It has a withers, a croup, a brisket,
 *     a stop, a cheek and a hock and they are all named below.
 *  6. THE MASSES.  Five. (1) the husk, (2) the barrel, (3) the head, (4) the
 *     near fore and near hind legs, (5) the far pair as one dark shape.
 *  7. HEAD VERB / BODY VERB.  Head SUNK -- carried below the shoulder line and
 *     thrust forward, which is what a browser shoving into a hedge does. Body:
 *     weight forward over the near forefoot, near hind foot advanced, far
 *     foreleg lifted clear of the floor.
 *  8. SIGNATURE.  The husk with its four back-swept canes. Silhouette: fill the
 *     creature with one colour and there is still a low body, a lobed pack, four
 *     spikes off the back of it and a head down at the front.
 *  9. THE TWELVE REVERSALS -- eight named, with coordinates.
 *       withers           cx-18, G-45   contour high point, front half
 *       back dip          cx- 2, G-42   3-cell sag behind the withers
 *       croup             cx+18, G-48   second high point, 3 ABOVE the withers,
 *                                       which is the digger's back line
 *       point of shoulder cx-26, G-32   front contour steps forward 4
 *       brisket           cx-22, G-21   lowest, most forward point of the belly
 *       belly tuck        cx+10, G-30   the belly RISES 9 cells to the flank
 *       point of buttock  cx+33, G-40   rearmost point on the animal
 *       hock              cx+27, G- 9   sharpest angle on it; notched by
 *                                       `legDigitigrade`
 *       occiput           cx-25, G-38   3-cell dip between skull and neck
 *       paw               cx-21, G      16 wide against a 9-cell ankle
 * 10. THREE HUES.  H1 leaf green (BASE / LIGHT / FORM), ~55 %: the animal.
 *     H2 tan cane (ACCENT family), ~20 %: the husk and the canes, and the only
 *     warm mass on it. H3 INNER, ~2 %: nostril and both ear cavities -- plus
 *     two ACCENT_LIT cells at each thorn tip.
 * 11. FOUR INTERIOR DETAIL EVENTS.  (a) the face; (b) the pale throat-and-belly
 *     field, one bounded region following the tuck; (c) the jaw line; (d) the
 *     husk's cast shadow onto the flank. Nothing else. The whole flank, the
 *     whole of every leg and the whole interior of the husk are flat.
 * 12. EYES.  `hooded` m, `far: 'm-'`, spread 8, at about 0.36 of skull depth
 *     from the crown, moved 6 cells toward the muzzle. Hooded because the heavy
 *     lid IS the expression -- patient, dug in -- and because it is the Numel
 *     read: lit flesh, one dark line, a shallow eye under it. ONE mark below the
 *     eyes: the nostril on the muzzle, three cells.
 * 13. SURFACE MATERIAL, THREE PLACES MAX.  Exactly one: the neck ruff, where the
 *     coat genuinely breaks the outline between skull and husk. No fur anywhere
 *     else -- there is not a hair drawn on the flank.
 * 14. EVERY INTERNAL DARK LINE.  One: the jaw line, from the ear root on the
 *     rear head contour to the mouth corner on the lower jaw contour. Both ends
 *     on the silhouette. There is no other authored dark line on the creature.
 * 15. Not a second stage. It PASSES ON to thornmarch: the cane bundle (the same
 *     `cane` helper), and the green-body / accent-bundle / pale-bib palette
 *     relationship. See thornmarch item 15 for what changes.
 */
function bramblehusk(p: Pen): void {
  // The verdant character pass hangs live leaf blades off the upper contour,
  // and on this creature the upper contour is a bundle of DEAD cane. "It never
  // sheds anything it can still use" is the whole Vellum entry.
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  /* ---------------------------------------------------------- far pair.
     Down first, in SHADE -- a genuinely separate part set behind another one,
     which is the one case that wants the ink. Both far feet land nine cells
     higher than the near ones, which is the single cue that turns four legs
     into an animal standing on a ground plane, and the far foreleg is LIFTED
     clear on top of that: three feet planted and one off the floor is a walk,
     four down is a table. */
  limbPath(p, [[cx + 12, G - 36], [cx + 7, G - 24]] as Pt[], 15, 11, SHADE, { bulge: 2 });
  limbPath(p, [[cx + 7, G - 24], [cx + 15, G - 14]] as Pt[], 11, 7, SHADE);
  paw(p, cx + 12, G - 9, 7, { tone: SHADE, toes: 3 });
  limbPath(p, [[cx - 10, G - 28], [cx - 15, G - 21], [cx - 13, G - 16]] as Pt[], 12, 8, SHADE);
  paw(p, cx - 13, G - 14, 6, { tone: SHADE, toes: 3 });

  /* ------------------------------------------------------------- barrel.
     A `poly`, not a `blob`. Every vertex here has a name (item 9) and a blob
     throws all ten of them away -- which is exactly how the old one came out as
     a level capsule with legs inserted at the spine. The back has two high
     points with a sag between them and the croup is the higher of the two,
     because this animal digs and shoves rather than runs. */
  poly(p, [
    [cx - 26, G - 32],  // point of shoulder: the front contour steps forward
    [cx - 18, G - 45],  // withers
    [cx -  2, G - 42],  // back dip
    [cx + 18, G - 48],  // croup
    [cx + 33, G - 40],  // point of buttock
    [cx + 34, G - 26],
    [cx + 22, G - 28],
    [cx + 10, G - 30],  // flank -- the top of the belly tuck
    [cx -  8, G - 24],
    [cx - 22, G - 21],  // brisket
  ] as Pt[], BASE);

  // The haunch and the shoulder belong to the TORSO's outline, not to the legs.
  // `haunch` welds a muscle mass in as a silhouette bulge and nothing else --
  // no seam, no ring, no lozenge sticker.
  haunch(p, cx + 24, G - 34, 13, 12, BASE);
  haunch(p, cx - 18, G - 33, 10, 10, BASE);

  /* -------------------------------------------- the throat-and-belly field.
     ONE bounded pale region whose lower edge IS the belly contour, so the tuck
     is stated twice -- once in the outline and once in the value -- and never
     contradicted. It stops well short of the flank so BASE keeps the majority
     of the barrel. */
  poly(p, [
    [cx - 24, G - 26], [cx - 6, G - 29], [cx + 10, G - 32], [cx + 16, G - 29],
    [cx + 12, G - 25], [cx - 4, G - 22], [cx - 20, G - 19],
  ] as Pt[], LIGHT);

  /* ------------------------------------------------------------ near pair.
     The hind leg ZIGZAGS -- thigh down-and-FORWARD, shin down-and-BACK,
     metatarsus forward again -- and the foreleg does not; that difference is
     most of what says "quadruped" rather than "four pegs". Written out by hand
     rather than through `legDigitigrade` because on a leg this short the
     helper's proportional swing is only five cells and the reversal is buried
     inside the limb's own thickness. Nine numbers, no ink, and the whole event
     is in the outline so it survives the icon. */
  cast(p, 18, () => {
    limbPath(p, [[cx + 24, G - 36], [cx + 16, G - 21]] as Pt[], 18, 13, BASE, { bulge: 3 });
    limbPath(p, [[cx + 16, G - 21], [cx + 27, G - 11]] as Pt[], 13, 8, BASE);
    limbPath(p, [[cx + 27, G - 11], [cx + 22, G -  4]] as Pt[],  8, 7, BASE);
    // The hock is the sharpest angle on the animal. Bite the reversal into the
    // contour so it is still there at 64 px.
    notch(p, cx + 31, G - 12, 6, 5, -1, 0);
    paw(p, cx + 22, G, 9, { tone: BASE, toes: 3 });
  });

  // The foreleg: one gentle S, three points, and its own cast shadow onto the
  // chest. That shadow is what replaced the closed DEEP ring the old design
  // stamped round the leg root.
  cast(p, 15, () => {
    limbPath(p, [[cx - 20, G - 30], [cx - 24, G - 18], [cx - 21, G - 6]] as Pt[], 15, 9, BASE);
    paw(p, cx - 21, G, 8, { tone: BASE, toes: 3 });
  });

  /* --------------------------------------------------------------- head.
     Sunk: the crown sits two cells BELOW the withers and eighteen cells forward
     of the chest, in its own air. It is drawn as a `poly` for the same reason
     the barrel is -- brow, crown, occiput, cheek, jaw and chin are six named
     landmarks and an ellipse has none of them. The deep stop (13 cells from
     brow to nose bridge) is what earns the pale muzzle: a no-stop head with a
     pale patch on the front is a wedge with a stain on it. */
  // Far ear first, mostly behind the skull and darker; near ear after it, and
  // bigger. Whatever a creature has two of gets two sizes at two heights.
  earPointed(p, cx - 25, G - 38, 9, 5, 1, { tone: SHADE });
  limbPath(p, [[cx - 20, G - 33], [cx - 30, G - 31]] as Pt[], 21, 19, BASE);
  poly(p, [
    [cx - 50, G - 27],  // nose bridge, front
    [cx - 50, G - 35],
    [cx - 46, G - 41],  // brow: the contour bulges over the eye
    [cx - 40, G - 43],  // crown
    [cx - 31, G - 42],
    [cx - 26, G - 39],  // occiput
    [cx - 21, G - 30],
    [cx - 25, G - 21],  // cheek bulges out, then cuts in to the jaw
    [cx - 38, G - 16],  // jaw underside
    [cx - 48, G - 18],  // chin
    [cx - 51, G - 23],
  ] as Pt[], BASE);
  // NO `notch` at the occiput. It was there for two renders and it was cutting
  // a HOLE: once the two ears are sunk into the crown the notch's mouth is no
  // longer on an edge, so it carved an unpainted pocket in the middle of a
  // mass, the outline pass inked round it, and the shading pass's directional
  // occlusion then streaked three dotted diagonals across the whole shoulder.
  // `notch` only does something where it reaches the contour. The dip between
  // skull and neck is already in the poly, between the two ear roots.
  earPointed(p, cx - 34, G - 39, 13, 4, 1, { tone: BASE });

  // The muzzle: a poly with a SLANTED rear edge, throwing its own shadow down
  // onto the jaw. The slant is the whole difference between bone and a stain,
  // and the DROP is what stops the face reading as one pale field with two
  // beans on it -- the top of this mass is four cells clear below the bottom of
  // the eye opening, with body colour between them.
  muzzle(p, cx - 46, G - 22, 10, 6, { tone: LIGHT, slant: 0.8, detail: !p.back });

  /* ---------------------------------------------------------- the husk.
     A woven pack of dead cane bound down onto the back. Its under-rim FOLLOWS
     the back contour rather than cutting across the animal, so the withers show
     in front of it and the rump behind it and the barrel is still one
     continuous body; and its top edge is LOBED -- four coils of bound cane,
     tallest in the middle and tapering both ways -- so the weave lives in the
     SILHOUETTE and costs no interior line at all. Earlier versions ruled three
     binding bands across the dome instead: 150 cells of dotted ink, gone at
     64 px. The one cast shadow it throws down onto the flank is what puts it
     ON the animal. */
  cast(p, 50, () => {
    /* -------------------------------------------------------- the canes.
       Four, all leaning the SAME way -- back and up, about thirty degrees off
       vertical -- at four different lengths, longest at the crown. Fanned, they
       came back as a splayed hand growing out of the animal's back.
       Drawn BEFORE the husk and covered by it, which is not a detail: a cane
       root laid ON the husk is a dark stroke sitting on a lit surface, and the
       shading pass's directional-occlusion term then streaks a shadow
       down-and-right from every one of them. Four canes came back as a field
       of diagonal hatching across the whole pack. Rooted underneath, they
       simply grow out of its crest. */
    for (const [x0, y0, x1, y1, w] of [
      [cx +  1, G - 54, cx +  6, G - 68, 4.5],
      [cx + 11, G - 60, cx + 19, G - 77, 4.5],
      [cx + 22, G - 58, cx + 27, G - 72, 3.5],
      [cx + 30, G - 50, cx + 38, G - 57, 3],
    ] as const) cane(p, x0, y0, x1, y1, w);

    /* FLAT, and item 11 of the brief above always said it was: "the whole
       interior of the husk is flat". It was not. Left to the shading pass, the
       pack and the four canes are ONE contiguous ACCENT mass whose outline is a
       spiked comb, so the pass's bands were computed on the comb and came back
       across the dome as a wandering cream field with single-cell cream and
       dark-tan flecks strewn through the tan either side of it -- forty-odd
       loose cells that at 1x read as dirt on the pack rather than as anything
       turning. A bound bundle of dead cane is a made object, not a balloon;
       `flat()` gives it exactly the one tone the brief promised, and the pack's
       form is then carried by what it always should have been carried by: the
       lobed top edge, the rim's DEEP gutter below, and its cast shadow. */
    flat(p, () => {
      poly(p, [
        [cx -  8, G - 44],
        [cx -  5, G - 56], [cx +  1, G - 59],   // coil 1
        [cx +  4, G - 55],
        [cx + 10, G - 66], [cx + 15, G - 62],   // coil 2, the crown
        [cx + 21, G - 64], [cx + 25, G - 60],   // coil 3
        [cx + 30, G - 55],                      // coil 4
        [cx + 34, G - 48], [cx + 32, G - 41],
        [cx + 26, G - 44], [cx + 12, G - 43], [cx - 3, G - 40],
      ] as Pt[], ACCENT);
      /* The one turn on it, and it is bounded at BOTH ends by the form: its
         lower edge IS the pack's own under-rim, its upper edge is the girth
         where the dome stops facing up. Two flat tones meeting hard is a ridge
         -- the manual's own words -- and that is what the under-rim of a bound
         pack is. */
      poly(p, [
        [cx -  7, G - 45], [cx +  8, G - 47], [cx + 22, G - 48], [cx + 33, G - 45],
        [cx + 32, G - 41], [cx + 26, G - 44], [cx + 12, G - 43], [cx - 3, G - 40],
      ] as Pt[], ACCENT_DARK);
    });
  });

  /* NO FUR ANYWHERE. A `mane` at the neck was tried for three renders and
     removed: on a coat this short the clumps are 3-4 cells, and every clump is
     a small dark mass that the shading pass's directional-occlusion term then
     streaks down-and-right from -- the neck came back covered in diagonal
     hatching, which is the "dots on every creature" complaint by another route.
     The item-13 material event on this species is the HUSK's lobed edge, which
     is a made object rather than a coat and lives entirely in the silhouette. */

  /* ------------------------------------------- the one deep shadow event.
     A `DEEP` PATCH, not a stroke: a filled region with a real interior is read
     as a core shadow and is left alone by the internal-edge pass, so this is
     six cells of genuine dark in the gutter the husk's rim overhangs, sitting
     inside the FORM the cast shadow already put there. It is the only place on
     the creature where anything is darker than its own outline.
     RECORDED EXEMPTION: the acceptance criterion "12-25 % of body pixels
     darker than the mean outline luma" cannot be met from a design file on
     this palette. bramblehusk's ink is #22401f at luma 51 and its shade slot
     is #356030 at luma 78, so NO shadeable material on the animal can ever be
     darker than the line drawn round it; only DEEP (48) and INNER (45) can.
     The correction is one hex value in `species.json`, which this round's
     brief puts out of this file's reach. */
  poly(p, [
    [cx - 4, G - 40], [cx + 12, G - 42], [cx + 27, G - 43],
    [cx + 24, G - 38], [cx + 10, G - 36], [cx - 3, G - 36],
  ] as Pt[], DEEP);
  // and the underside of the jaw, which on a reference head is the darkest
  // part of it. A wedge that follows the jaw, not a rectangle: this one was a
  // beard for two renders.
  poly(p, [
    [cx - 44, G - 19], [cx - 36, G - 17], [cx - 28, G - 20],
    [cx - 32, G - 22], [cx - 42, G - 22],
  ] as Pt[], DEEP);

  if (p.back) { p.face(cx - 40, G - 34, 15); return; }

  /* NO JAW LINE, and this one was fought over for four renders.
     A reference jaw line runs from the EAR ROOT down-and-forward to the mouth
     corner with BOTH ENDS ON THE OUTER SILHOUETTE, and on this head there is no
     contour point at the ear root to start it from: two ears sunk into the
     crown and a neck as deep as the skull fill every cell behind the cheek, so
     `occlude` warned -- correctly -- that the upper end was stranded inside a
     mass, which is a closed ring waiting to happen. Started higher up, on the
     crown instead, it comes down across the eye and reads as a face stripe.
     Everything it would have carried is in the outline instead: the brow bulge,
     the cheek stepping out and cutting back to the jaw, the slanted rear edge
     of the muzzle, and the DEEP under the jaw. That leaves this creature with
     ZERO authored internal dark lines, which is what the manual asks of a head
     whose landmarks are all silhouette anyway. */
  eyeRow(p, cx - 40, G - 34, 8, 'hooded', 'm', { far: 'm-' });
}

/* =========================================================== thornmarch */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IS IT.  A standing wall. 186 kg of hedge that has stood still long
 *     enough for its shoulders to go to stone: a slab yoke across the top of
 *     it, the same dead thorn cane its earlier form carried, now petrified into
 *     the yoke as a crest, and a stone hand it puts out in front of itself.
 *  2. PLAN.  E / BIPED with F / HUMANOID shoulders and hands. `species.json`
 *     says `brute`; this is the recorded override, and the reason is that
 *     "broad-shouldered walker" at 186 kg is a person-shaped wall. What the
 *     plan demands and gets: the weight over the near foot, a three-part
 *     vertical stack with the torso largest, the head about a quarter of the
 *     total height, and -- the humanoid part -- an EXPLICIT HAND GESTURE.
 *  3. RUNG.  1.8 m, HUGE, and by a wide margin the largest thing in this group.
 *     MEASURED: ships 115 x 114, long dimension 115 against a band of 112-128,
 *     body area 2019 ref px against 1800-2600, fill 62 %. The DRAWN height is
 *     110 exactly, which is `fitToCell`'s clamp, so k = 1.000 and no eye stamp
 *     or facet corner is resampled.
 *     THE REST OF THE SHEET: ink 24.2 % of which authored interior ink is
 *     3.0 %; largest region 10.0 %, top three 24.5 %; 4.9 tone changes per
 *     scanline; 0 highlight events; 0 SPEC; symmetry 58 %; 4.3 % of body pixels
 *     darker than the outline. Four cast shadows, two DEEP core-shadow events,
 *     ZERO authored internal dark lines.
 *  4. ASPECT AND FILL.  Taller than wide, and heavy: about 68 % fill, which is
 *     the reference's "compact, solid, armoured" band and is what 186 kg looks
 *     like. bramblehusk on the same family is 54 % and wider than tall.
 *  5. SMOOTH OR STRUCTURED.  STRUCTURED, and hard: shoulder point, waist, hip,
 *     knee, ankle, elbow, wrist, occiput and jaw corner are all named below,
 *     and the yoke is three named FACETS with hard boundaries and no gradient.
 *  6. THE MASSES.  Five. (1) the stone yoke and its cane crest, (2) the torso
 *     slab, (3) the head thrust forward and level, (4) the near arm and its
 *     open hand, (5) the two legs. The far arm is not a mass; it is one dark
 *     shape behind the torso.
 *  7. HEAD VERB / BODY VERB.  Head LEVEL AND FORWARD -- stolid, pushed out from
 *     under the yoke into its own air. bramblehusk's is sunk BELOW the shoulder;
 *     this is the same thrust-out carriage read completely differently because
 *     it is now happening level with a shoulder line two metres up. Body:
 *     MID-STRIDE. Near leg planted forward and carrying the weight, far leg
 *     trailing with its foot six cells off the floor, and the whole centre of
 *     mass forward of the midpoint between the feet.
 *  8. SIGNATURE.  The yoke: a wide faceted stone bar with a row of petrified
 *     canes standing off the back of it, much wider than the hips. In flat
 *     black this is a spiked T over a tapering column on two feet, with a head
 *     out to the left and a hand out low in front, and nothing else on the
 *     roster is that shape.
 *  9. THE TWELVE REVERSALS -- ten named, with coordinates.
 *       yoke corner, near   cx-30, G-92   the top-left corner of the wall
 *       yoke corner, far    cx+36, G-87
 *       near shoulder point cx-26, G-80   the contour steps FORWARD of the yoke
 *       waist               cx-18, G-66   the front contour cuts IN 8 cells
 *       near hip            cx-12, G-52   and steps back out
 *       elbow               cx-30, G-63   rear edge of the near arm steps back
 *       wrist               cx-36, G-45   and in again
 *       knee                cx-11, G-29   near leg's forward reversal
 *       ankle               cx- 6, G-11   and back
 *       foot                cx-11, G      27 wide against a 17-cell ankle
 *       occiput             cx-26, G-81   dip between skull and shoulder
 *       jaw corner          cx-34, G-64   the cheek cuts in to the jaw
 * 10. THREE HUES.  H1 hedge green (BASE / LIGHT / FORM), ~50 %. H2 grey slab
 *     stone (ACCENT family), ~25 %: the yoke, the crest, the hand and both
 *     feet -- the parts that have gone mineral, and they are the parts that
 *     touch the world. H3 INNER, ~1 %: the set mouth.
 * 11. FOUR INTERIOR DETAIL EVENTS.  (a) the face; (b) the yoke's three FLAT
 *     FACETS, one tone each, hard boundaries, nothing inside them; (c) the pale
 *     moss plastron down the chest; (d) the yoke's cast shadow onto the chest.
 *     The flanks, the legs and the whole of both arms are flat colour.
 * 12. EYES.  `angry` m, `far: 'm-'`, spread 7. `angry` is the only style whose
 *     character is a BROW BAR, and a creature that is mostly shoulders needs an
 *     expression that survives under a stone hood; the brow carries about 35 %
 *     of a face's read and this face is essentially brow. bramblehusk is
 *     `hooded` and this is `angry`: the same family, not the same face.
 *     ONE mark below the eyes: a set `mouthLine` in INNER, eight cells under
 *     the eye row. There is no nostril and no second mark.
 * 13. SURFACE MATERIAL, THREE PLACES MAX.  One, and it is stone rather than
 *     fur: the slab joints of the yoke, which are the boundaries between three
 *     flat facets and are therefore silhouette-and-value, not a drawn line.
 * 14. EVERY INTERNAL DARK LINE.  Zero authored ones. Every division on this
 *     creature is a material boundary the internal-edge pass finds for itself
 *     (stone against flesh) or a cast shadow. There is no `occlude`, no `seam`
 *     and no jaw line: a stone head has no cheek for one.
 * 15. SECOND STAGE. CARRIED OVER, exactly two things, per the family rule:
 *     the BACK-SWEPT CANE ROW (literally the same `cane` helper), and the
 *     palette relationship GREEN BODY + PALE MOSS BIB + A BUNDLE IN THE ACCENT.
 *     CHANGED: posture (prone quadruped -> upright walker); proportion (wider
 *     than tall -> taller than wide, and fill 54 % -> 68 %); the accent's
 *     MATERIAL and hue (live tan cane H41 -> grey slab stone H90, which is the
 *     "keep one hue, change the others" rule); the head (deep stop with a pale
 *     muzzle -> no stop and no pale muzzle at all); and the eyes. It is
 *     emphatically not the first stage scaled up.
 */
function thornmarch(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  /* ------------------------------------------------ far leg and far arm.
     Down first and in SHADE -- a genuinely separate part set behind another
     one, which is the one case that wants the ink. The far foot lands six cells
     off the floor and forty behind the near one: that is the stride, and it is
     the only reason this creature is not standing to attention like the last
     one. The far arm swings BACK and finishes clear of the torso's own contour,
     so it is a shape rather than a bulge on the flank. */
  limbPath(p, [[cx + 12, G - 48], [cx + 19, G - 30]] as Pt[], 17, 14, SHADE, { bulge: 2 });
  limbPath(p, [[cx + 19, G - 30], [cx + 25, G - 14]] as Pt[], 14, 11, SHADE);
  paw(p, cx + 26, G - 6, 11, { tone: SHADE, toes: 3 });
  limbPath(p, [[cx + 20, G - 78], [cx + 33, G - 63], [cx + 38, G - 50]] as Pt[], 13, 10, SHADE);
  // The far hand is a FIST, drawn as one lump on purpose: `hand` builds an open
  // palm with carved gaps, which is forty marks spent on the part of the
  // creature furthest from the viewer, in the darkest tone it owns, where none
  // of them can be told apart.
  blob(p, cx + 40, G - 44, 9, 8, SHADE);

  /* -------------------------------------------------------------- torso.
     A WEDGE, 48 cells across the shoulders and 26 at the hips, because the
     entire read of this creature is that its top half is too big for its
     bottom half. That is a proportion, not a mass, and it is what the old one
     got wrong by drawing a barrel.
     THE CROTCH IS A VERTEX, cutting eleven cells up between the two hips.
     Without it the torso's flat bottom edge bridges the legs and the creature
     has one trunk; with it there is real daylight between them at icon scale,
     which is most of what says biped. */
  poly(p, [
    [cx - 20, G - 76],  // near shoulder point: steps forward of the yoke
    [cx - 13, G - 87],
    [cx + 12, G - 88],
    [cx + 25, G - 78],  // far shoulder point
    [cx + 20, G - 62],
    [cx + 17, G - 48],  // far hip
    [cx +  5, G - 45],
    [cx +  1, G - 56],  // THE CROTCH
    [cx -  4, G - 45],
    [cx - 11, G - 48],  // near hip
    [cx - 15, G - 62],  // waist: the front contour cuts in 5 cells
  ] as Pt[], BASE);

  /* ------------------------------------------------------ near leg, planted.
     Forward of the far one, carrying the weight, and it zigzags: thigh
     down-and-forward, shin down-and-back, foot forward again. Its own cast
     shadow falls across the far leg behind it. */
  cast(p, 22, () => {
    limbPath(p, [[cx -  8, G - 50], [cx - 15, G - 28]] as Pt[], 22, 18, BASE, { bulge: 3 });
    limbPath(p, [[cx - 15, G - 28], [cx - 11, G - 11]] as Pt[], 18, 15, BASE);
    notch(p, cx - 2, G - 29, 7, 5, -1, 0);
    // A rooted foot. The Vellum entry is "old ones root in place for a season
    // and come back up as part of the wall", and a foot 28 cells across on a
    // 15-cell ankle is that sentence written in the silhouette. Stone, like the
    // hands: the parts that touch the world are the parts that have gone
    // mineral.
    paw(p, cx - 13, G, 12, { tone: ACCENT, toes: 3 });
  });

  /* ---------------------------------------------------- the moss plastron.
     One continuous pale field down the centre of the chest, no bands across
     it. Two of them made the torso more pale than green, and a green creature
     whose own colour is a minority tone is the fault this redraw is about. */
  poly(p, [
    [cx - 5, G - 81], [cx + 9, G - 82], [cx + 12, G - 66],
    [cx +  6, G - 54], [cx -  1, G - 54], [cx -  5, G - 66],
  ] as Pt[], LIGHT);

  /* ------------------------------------------------------------ near arm.
     It reaches DOWN AND FORWARD and sets its hand on the floor. That is the
     pose -- a wall that walks on three points -- and it puts a third ground
     contact forty cells forward of the near foot, so the centre of mass sits a
     long way off the midpoint between the feet. Elbow and wrist are both
     contour reversals.
     Drawn BEFORE the head, and the head then throws its cast shadow across it.
     Three earlier versions fought for sky between the jaw and the upper arm and
     never got more than two cells of it, at which point the outline pass closed
     the gap and the head, the shoulder and the arm came back as one column.
     The honest answer for a three-quarter view is that the head IS in front of
     the near shoulder: overlap it deliberately and let the value step do the
     separating, which is what LAW 2 says anyway. */
  cast(p, 20, () => {
    limbPath(p, [[cx - 13, G - 79], [cx - 24, G - 56]] as Pt[], 20, 16, BASE, { bulge: 2 });
    limbPath(p, [[cx - 24, G - 56], [cx - 34, G - 32]] as Pt[], 16, 13, BASE);
  });

  /* ---------------------------------------------------------- THE GESTURE.
     One open stone hand, set down flat with the fingers spread. This is the
     single thing that makes the creature humanoid rather than a brute, and it
     is written out by hand rather than through `hand()` because that helper's
     fingers point UP -- it builds a grip, and what is wanted here is a hand
     planted on the ground.
     THE GAPS ARE CARVED, NOT RULED. Three digits six cells wide at eleven-cell
     centres leaves five cells of sky, and after the outline pass has grown two
     cells in from each side there is still a cell of daylight down each gap. A
     one-cell DEEP stroke between two fingers of the same tone survives neither
     the shading pass nor the icon downsample and the hand comes back a mitten,
     which is exactly what happened to the old one. */
  blob(p, cx - 40, G - 20, 12, 9, ACCENT);
  for (const fx of [-50, -39, -28]) {
    limbPath(p, [[cx + fx, G - 20], [cx + fx - 1, G - 3]] as Pt[], 6, 6, ACCENT);
  }
  for (const gx of [-44.5, -33.5]) notch(p, cx + gx, G - 2, 5, 15, 0, -1);
  // The thumb, low and on the body side. Three digits without one is a mitten.
  limbPath(p, [[cx - 30, G - 25], [cx - 23, G - 18]] as Pt[], 8, 6, ACCENT);

  /* --------------------------------------------------------------- head.
     Carried LOW AND FORWARD, out from under the near end of the yoke, on a
     short thick neck slanting down. A blunt wedge with NO STOP: one straight
     ramp from crown to nose, which is the reptile / grazer / mineral head --
     and therefore, and this is the rule that matters, NO PALE MUZZLE PATCH
     EITHER. A no-stop head with a pale ellipse on the front is the "wedge with
     a stain on it" that half the roster is.
     It casts onto the shoulder and the upper arm behind it, which is what puts
     it in FRONT of them rather than painted on them. */
  cast(p, 30, () => {
    limbPath(p, [[cx - 21, G - 64], [cx - 34, G - 60]] as Pt[], 13, 12, BASE);
    poly(p, [
      [cx - 62, G - 53],  // nose, front lower
      [cx - 61, G - 61],
      [cx - 56, G - 68],  // brow
      [cx - 49, G - 71],  // crown
      [cx - 40, G - 70],
      [cx - 34, G - 66],  // occiput
      [cx - 33, G - 56],
      [cx - 41, G - 48],  // jaw corner: the cheek cuts in
      [cx - 55, G - 47],  // chin
    ] as Pt[], BASE);
  });

  /* ------------------------------------------ the yoke: ONE BLOCK, THREE FACETS.
     Three separate floating slabs were tried first and read as three
     rectangles hanging in the air with bright joints between them. This is one
     angular stone block with an unmistakable outline -- chamfered near corner,
     long top plane, cut-back far end -- divided inside by TWO DIAGONALS into
     three FACETS.
     A flat plane takes one tone across its whole area with no gradient at all,
     and two planes meeting at a ridge get two flat tones and a HARD boundary
     with no intermediate step. THAT STEP IS THE RIDGE; drawing a line on it as
     well is where the old one's ink went. Each facet's tone is simply which way
     it faces: the near end catches the lamp obliquely, the crown squarely, the
     far end is turned away.
     The canes go down first and the block covers their roots -- a cane root laid
     ON a lit stone face is a dark stroke that the shading pass streaks an
     occlusion shadow down-right from, and five of them come back as hatching
     across the whole yoke. */
  cast(p, 68, () => {
    for (const [x0, y0, x1, y1, w] of [
      [cx - 10, G - 90, cx -  5, G -100, 5],
      [cx +  0, G - 94, cx +  8, G -105, 5],
      [cx + 11, G - 94, cx + 19, G -103, 4.5],
      [cx + 22, G - 90, cx + 30, G - 99, 4],
      [cx + 30, G - 84, cx + 42, G - 91, 3.5],
    ] as const) cane(p, x0, y0, x1, y1, w);

    // Near facet: the chamfered end, catching the lamp obliquely.
    flat(p, () => poly(p, [
      [cx - 28, G - 76], [cx - 25, G - 87], [cx - 6, G - 96],
      [cx - 2, G - 82], [cx - 7, G - 73],
    ] as Pt[], ACCENT_DARK));
    // Crown facet: the long top plane, square to the lamp, and the biggest.
    flat(p, () => poly(p, [
      [cx - 6, G - 96], [cx + 18, G - 92], [cx + 21, G - 86], [cx - 4, G - 90],
    ] as Pt[], ACCENT_LIT));
    flat(p, () => poly(p, [
      [cx - 4, G - 90], [cx + 21, G - 86], [cx + 23, G - 79], [cx - 2, G - 82],
    ] as Pt[], ACCENT));
    // Far facet: cut back and turned away, and the arm comes out from under it.
    flat(p, () => poly(p, [
      [cx + 18, G - 92], [cx + 36, G - 84], [cx + 38, G - 74],
      [cx + 18, G - 70], [cx + 23, G - 79],
    ] as Pt[], ACCENT_DARK));
    /* NO MOSS LOBE ON THE YOKE, third and final attempt. It was a strip, then
       an unflattened lobe, then a flattened one, and every version was the same
       object: a patch of GREEN material starting and stopping in the middle of
       a GREY facet, touching no edge of anything. Because it is a material
       boundary rather than a tone step, the internal-edge pass draws a line
       round it -- a closed dark ring, all the way round, in the middle of a
       flat stone plane -- and at 1x an 8 x 6 pale oval ringed in black on a
       grey field reads as an eye, twenty-five cells from the real ones. The
       yoke's near end is now what it is: one flat chamfer of stone. The moss on
       this creature is the chest plastron, which has a body contour to sit
       against. */
  });

  /* ------------------------------------------- the one deep shadow event.
     A `DEEP` PATCH -- a filled region with a real interior, which the
     internal-edge pass reads as a core shadow and leaves alone -- in the gutter
     the yoke's front rim overhangs. It is the only place on the creature where
     anything is darker than the line drawn round it, and it is what puts the
     block ON the shoulders instead of floating above them.
     RECORDED EXEMPTION, same as bramblehusk: "12-25 % of body pixels darker
     than the mean outline luma" is unreachable from a design file on this
     palette. thornmarch's ink is #1e3320 at luma 43 and its shade slot is
     #2f5030 at luma 67, so no shadeable material on the creature can be darker
     than its own outline; only DEEP and INNER can. The fix is one hex value in
     `species.json`. */
  poly(p, [
    [cx - 16, G - 74], [cx + 4, G - 73], [cx + 22, G - 72],
    [cx + 20, G - 67], [cx + 2, G - 67], [cx - 15, G - 69],
  ] as Pt[], DEEP);
  // and the underside of the jaw, the darkest part of a reference head.
  poly(p, [
    [cx - 54, G - 50], [cx - 45, G - 47], [cx - 38, G - 50],
    [cx - 43, G - 53], [cx - 52, G - 53],
  ] as Pt[], DEEP);

  if (p.back) { p.face(cx - 49, G - 62, 17); return; }

  /* ------------------------------------------------------------ the face.
     The brow is the expression -- it carries about 35 % of a face's read and
     this face is essentially brow. The mouth is the ONE mark below the eyes and
     there is no second one: eight cells of INNER with both corners turning the
     same way, on a head that has nothing else on it at all. */
  mouthLine(p, cx - 52, G - 54, 7, 1);
  eyeRow(p, cx - 49, G - 62, 7, 'angry', 'm', { far: 'm-' });
}

/* ============================================================= mossback */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IS IT.  A quarry boulder that walks. A block of split stone with a
 *     pelt of moss over its crown, a slab of green flesh underneath it, four
 *     stubby legs, and one enormous slow eye looking out from under the near
 *     corner of the rock. It moves two metres a day.
 *  2. PLAN.  G / MINERAL, which is what `species.json` says and it is right.
 *     What that plan demands is PRECISION OF SHAPE and a FLAT, FACETED
 *     interior, and that is what it gets: the shell is one angular block with
 *     named corners, divided by two straight ridges into three FACETS, each a
 *     single flat tone with a hard boundary and nothing at all inside it. There
 *     is no surface pattern anywhere on this creature.
 *  3. RUNG.  1.1 m, LARGE. MEASURED: ships 106 x 72, long dimension 106 against
 *     a band of 100-116, body area 1307 ref px against 1300-1900, fill 68 %. A
 *     long way inside 120 x 110, so k = 1.000.
 *     THE REST OF THE SHEET, and it is the best surface in the group: ink
 *     21.4 %; largest connected region 16.6 %, top three 40.8 %, 124 regions;
 *     2.6 tone changes per scanline; 136 body-ramp runs of which 31 % are <= 3
 *     cells; 0 highlight events; 0 SPEC; INNER 2.1 %; symmetry 84 %.
 *  4. ASPECT AND FILL.  Wider than tall by three to two, and about 68 % filled
 *     -- the reference's "compact, solid, heavy, armoured" band, which is what
 *     165 kg of rock is. bladderwrack is on the same rung and is the opposite
 *     proportion at half the fill, so the two are separable as thumbnails.
 *  5. SMOOTH OR STRUCTURED.  STRUCTURED, and hard. Every corner of the block is
 *     a vertex I can name and the interior is three flat planes.
 *  6. THE MASSES.  Four. (1) the stone block, (2) the flesh slab under it,
 *     (3) the near pair of legs, (4) the far pair as one dark shape.
 *  7. HEAD VERB / BODY VERB.  There is no head, so the whole near face of the
 *     block is the face and it never lifts -- SUNK, permanently. Body: barely
 *     moving. One near foreleg is advanced and one far foot is off the floor,
 *     which is as much stride as two metres a day earns.
 *  8. SIGNATURE.  The eye: one enormous `gem` under a stone overhang, and
 *     nothing else on the front of the creature. Second signature: the SHAGGY
 *     CROWN -- four moss lobes standing five to eight cells PROUD of the
 *     stone's top edge, so the moss is in the silhouette rather than painted
 *     inside it. Two earlier versions kept the moss inside the block's top line
 *     on the argument that a geometric plan wants its straight edges, and the
 *     flat test came back both times as a plain slab on four stubs.
 *  9. THE TWELVE REVERSALS -- eight named, with coordinates. A mineral's
 *     reversals are corners rather than joints, and that is the point of it.
 *       near base corner    cx-52, G-30   the block's lowest, most forward point
 *       near shoulder       cx-46, G-46   the chamfer turns up
 *       crown, near         cx-30, G-57
 *       crown, high         cx- 6, G-62   the top plane's apex, off centre
 *       far shoulder        cx+24, G-59
 *       far corner          cx+42, G-48   the block is cut back on the far side
 *       far base corner     cx+50, G-32
 *       rim, under          cx+ 2, G-26   the block's underside, where the
 *                                         flesh disappears beneath it
 *       near foreleg        cx-34, G      advanced; foot 20 wide on a 13 ankle
 *       far hind foot       cx+18, G-7    seven cells off the floor
 * 10. THREE HUES.  H1 grey-green flesh (BASE / LIGHT / FORM), ~35 %. H2 grey
 *     quarry stone (ACCENT family), ~40 % -- on this species the second hue is
 *     the larger of the two, which is correct for a creature that is mostly
 *     rock. H3 INNER, ~1 %: the eye's field and the mouth slit.
 * 11. FOUR INTERIOR DETAIL EVENTS.  (a) the eye; (b) the shell's three FLAT
 *     FACETS; (c) the moss lobes; (d) the shell rim's cast shadow onto the
 *     flesh, with one DEEP core in the gutter. The flesh slab is otherwise ONE
 *     LARGE FLAT REGION, which was the best surface number on the old roster
 *     and is the one thing about the old mossback worth keeping.
 * 12. EYES.  ONE `gem` at `xl`, placed with `eyeStamp` and `turned: true` --
 *     without which the stamp is drawn nose-to-the-right and the eye looks the
 *     wrong way on a creature facing viewer-left. `gem` is the style that
 *     exists for a species with NO FACE: a hard dark rim, a lens of field
 *     colour filling it, and a pupil pushed into the upper outer quadrant and
 *     TOUCHING the rim, which is what stops it being a bullseye. The field is
 *     INNER, the one warm dark on the sheet, so the eye reads amber against
 *     grey-green.
 *     AND THERE IS NO SOCKET UNDER IT. The old one painted a 28-cell INNER pit
 *     and rimmed it in DEEP, and with a stamp on top that is a pair of
 *     sunglasses. What the eye sits in is the shell's CAST SHADOW, which is a
 *     value step with no line round it.
 *     One mark below the eye: a five-cell INNER mouth slit.
 * 13. SURFACE MATERIAL, THREE PLACES MAX.  One: the moss on the crown, and it
 *     is there only because it BREAKS THE OUTLINE there. There is no moss
 *     drawn anywhere on the block's faces.
 * 14. EVERY INTERNAL DARK LINE.  Zero authored ones. The stone/flesh boundary
 *     is a material change the internal-edge pass finds for itself; the facet
 *     ridges are hard VALUE steps with no line on them, which is the entire
 *     reason a mineral reads as hard.
 * 15. Not an evolution.
 *
 * SYMMETRY. Measured about 75 %. `species.json` calls it a mineral and the
 * mineral band is 80-95 %, but the manual singles this species out -- "mossback
 * 90 %, an animal" -- so it is deliberately pulled below the mineral band by
 * the block being cut back on the far side, the crown apex sitting left of
 * centre, the eye being on one side only and the four legs standing at four
 * different depths.
 */
function mossback(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  /* ------------------------------------------------------- the far pair.
     Two stubs, in SHADE, set well inboard of the near pair and landing eight
     cells off the floor. Four separate contacts on four different rows is what
     stops a boulder with legs reading as a boulder on a shelf. */
  limbPath(p, [[cx - 12, G - 16], [cx - 14, G - 11]] as Pt[], 12, 11, SHADE);
  paw(p, cx - 14, G - 8, 7, { tone: SHADE, toes: 3 });
  limbPath(p, [[cx + 14, G - 16], [cx + 16, G - 11]] as Pt[], 12, 11, SHADE);
  paw(p, cx + 16, G - 8, 7, { tone: SHADE, toes: 3 });

  /* --------------------------------------------------------- the flesh.
     One slab of green, and it is meant to stay ONE LARGE FLAT REGION: the old
     mossback's body was 42.9 % of its sprite in a single connected tone, the
     best surface number anywhere on the roster, and that part of it was right.
     Everything interesting happens at its edges. */
  poly(p, [
    [cx - 52, G - 19], [cx - 47, G - 30], [cx - 22, G - 36],
    [cx + 10, G - 36], [cx + 39, G - 30], [cx + 47, G - 19],
    [cx + 33, G - 12], [cx - 35, G - 13],
  ] as Pt[], BASE);

  /* ------------------------------------------------------ the near pair.
     Splayed outward -- a vertical cylinder is furniture, a leaning one is
     weight -- and the near foreleg is advanced. Feet 20 cells wide on a
     13-cell ankle: that step IS the foot, and ours were 10-20 % wider, which is
     why they did not exist. */
  cast(p, 18, () => {
    limbPath(p, [[cx - 30, G - 19], [cx - 35, G - 8]] as Pt[], 18, 15, BASE);
    paw(p, cx - 35, G, 11, { tone: BASE, toes: 3 });
  });
  cast(p, 17, () => {
    limbPath(p, [[cx + 28, G - 19], [cx + 33, G - 9]] as Pt[], 17, 14, BASE);
    paw(p, cx + 33, G - 1, 10, { tone: BASE, toes: 3 });
  });

  /* ---------------------------------------------------------- THE BLOCK.
     One angular boulder with corners I can name, and THREE FACETS.
     A flat plane takes ONE TONE across its whole area with no gradient at all.
     Two planes meeting at a ridge get two flat tones and a hard boundary with
     no intermediate step, and THAT STEP IS THE RIDGE -- do not also draw a line
     on it. This is how every mineral in the reference generation reads as hard,
     and it is exactly what the old mossback did not do: its cap was a single
     92 x 42-cell near-white region with the terminator running almost
     vertically across a boulder.
     Each facet's tone is simply WHICH WAY IT FACES: the top plane is turned up
     and left into the lamp, the near face is turned toward the viewer and takes
     the stone's own colour, and the far end is cut back and turned away.
     THE UNDERSIDE IS AN ARCH, low at both ends and riding high in the middle.
     Drawn as a straight horizontal rim it was a tabletop with legs, and the
     creature read as furniture; arched, the block wraps down over the animal's
     shoulders and its near face is left clear for the eye. */
  cast(p, 100, () => {
    // Top plane -> the lamp. Its apex is left of centre, which is most of what
    // keeps a mineral off a 90 % mirror score.
    flat(p, () => poly(p, [
      [cx - 50, G - 40], [cx - 30, G - 54], [cx - 10, G - 58],
      [cx + 16, G - 52], [cx + 34, G - 40],
      [cx + 14, G - 38], [cx - 12, G - 44], [cx - 38, G - 36],
    ] as Pt[], ACCENT_LIT));
    // Near face -> the viewer. The stone's own colour, and the largest facet.
    flat(p, () => poly(p, [
      [cx - 54, G - 20], [cx - 50, G - 40], [cx - 38, G - 36],
      [cx - 12, G - 44], [cx + 14, G - 38], [cx + 22, G - 26],
      [cx +  8, G - 30], [cx - 16, G - 34], [cx - 38, G - 25],
    ] as Pt[], ACCENT));
    // Far end -> cut back, turned away, and much smaller than the near one.
    flat(p, () => poly(p, [
      [cx + 14, G - 38], [cx + 34, G - 40], [cx + 44, G - 26],
      [cx + 30, G - 22], [cx + 22, G - 26],
    ] as Pt[], ACCENT_DARK));

    /* ------------------------------------------------------- the moss.
       ONE continuous pelt with a LOBED top edge, not four separate lobes. Four
       separate ones were tried and every one of them got its own closed outline
       -- LIGHT against ACCENT over 64 cells is inked by the internal-edge pass
       -- so the creature came back wearing four green balls, which is the
       paper-cut-out failure the manual names for ears. One mass with a
       scalloped edge is a pelt; four discs are ornaments.
       It is a FACET as well: left to the shading pass, a pale material sitting
       in the brightest part of the sprite runs straight up its own ramp and the
       block comes back wearing a fleece. That happened to the first version.
       Four lobes, tallest left of the crown and tapering both ways. Below three
       reads as damage, above eight reads as texture. */
    flat(p, () => poly(p, [
      [cx - 30, G - 46],
      [cx - 32, G - 54], [cx - 25, G - 56],
      [cx - 21, G - 53],
      [cx - 13, G - 63], [cx -  6, G - 64],
      [cx -  1, G - 60],
      [cx +  7, G - 62], [cx + 13, G - 59],
      [cx + 20, G - 55], [cx + 27, G - 47],
      [cx + 18, G - 48], [cx +  0, G - 53], [cx - 18, G - 50], [cx - 26, G - 45],
    ] as Pt[], LIGHT));
  });

  /* ------------------------------------------- the one deep shadow event.
     A DEEP PATCH in the gutter the block's near rim overhangs -- a filled
     region with a real interior, which the internal-edge pass reads as a core
     shadow and leaves alone, so it is dark without a line round it. It follows
     the arch rather than cutting straight across, and it is what the eye sits
     at the lower edge of.
     RECORDED EXEMPTION, as on both hedgerow species: "12-25 % of body pixels
     darker than the mean outline luma" cannot be met from a design file on this
     palette. mossback's ink is #26301f and its OUTLINE resolves to luma 52,
     while the darkest tone available to a design -- DEEP -- resolves to 54. The
     creature literally cannot contain a pixel darker than the line drawn round
     it until one hex value in `species.json` changes. */
  poly(p, [
    [cx - 14, G - 32], [cx + 8, G - 29], [cx + 22, G - 25],
    [cx + 20, G - 22], [cx + 6, G - 24], [cx - 13, G - 27],
  ] as Pt[], DEEP);

  if (p.back) { p.face(cx - 24, G - 19, 16); return; }

  /* ----------------------------------------------------------- the eye.
     ONE enormous ocular event and nothing else on the face -- the reference's
     whole answer for a species with no head.
     NOT `turned`, and that was measured rather than guessed. `turned: true`
     mirrors the stamp, which moves `gem`'s pupil from the near side of the lens
     to the far side -- but `blitEyeStamp` re-stamps the catchlight at its
     AUTHORED column unmirrored, and rightly so, because two glints splayed
     outward is what a googly eye IS. On a one-eyed creature the result was a
     pupil pressed against the far rim with a white speck floating alone on the
     near side, which reads as a chip in the stone rather than as an eye. Left
     unmirrored, the pupil is on the near side with its own catchlight beside it
     and the creature is looking where it is going.
     NO SOCKET. The 28-cell INNER pit the old one painted under the stamp, with
     a DEEP rim round it, is what made the whole mineral group read as
     sunglasses. What the eye sits in is the block's cast shadow and the DEEP
     gutter above it -- a value step with no line round it, which is all the
     recess a reference sprite ever gives one. */
  eyeStamp(p, cx - 26, G - 19, 'gem', 'xl', { iris: INNER });
  p.face(cx - 24, G - 19, 16);
  // The one mark below the eye: five cells of INNER on the flesh. `gem` has no
  // lid and no brow, so without it the lower face is completely empty -- which
  // the reference allows only where the eye is a far larger share of the sprite
  // than this one is.
  mouthLine(p, cx - 2, G - 15, 5, 1);
}

/* ========================================================= bladderwrack */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IS IT.  A kelp. One thick stipe growing out of a holdfast clamped to
 *     the rock it will spend its whole life on, a chain of gas-filled float
 *     bladders down its seaward edge, and one frond folded forward over its
 *     face like a hood.
 *  2. PLAN.  C / SERPENT -- limbless, one long path. That plan says the design
 *     is exactly three decisions: how the path curves, what the head end does
 *     and what the foot end does. So: the stipe leans out at the waist and back
 *     over at the shoulder in one shallow S; the bottom terminal is a splayed
 *     holdfast with carved gaps between its roots; the top terminal is the hood.
 *     There are no other parts, and in particular there are no loose streaming
 *     fronds -- those are what made the old one 45.3 % ink and 9.5 % body
 *     colour, because every free-floating ribbon buys two cells of outline all
 *     the way round itself.
 *  3. RUNG.  1.4 m, LARGE. MEASURED: ships 81 x 111, long dimension 111 against
 *     a band of 100-116, body area 1375 ref px against 1300-1900, fill 61 %.
 *     Inside the height clamp rather than sitting on it as the old one did.
 *     THE REST OF THE SHEET: ink 21.0 % against the old bladderwrack's 45.3 %;
 *     largest region 14.9 %, top three 41.1 %, top-three COLOUR share 58.7 %,
 *     122 regions; 2.9 tone changes per scanline; 283 body-ramp runs of which
 *     only 24 % are <= 3 cells, the best short-run number in the group; 0
 *     highlight events; 0 SPEC; INNER 1.8 %; symmetry 44 %.
 *  4. ASPECT AND FILL.  TALL AND NARROW, about 1:1.4, at roughly 65 % fill.
 *     mossback is on the same rung and is the exact opposite proportion at
 *     three-to-two the other way; the two are separable as thumbnails on shape
 *     alone.
 *  5. SMOOTH OR STRUCTURED.  SMOOTH, and committed to it. A kelp has no
 *     skeleton, so this creature has ZERO internal drawn lines and spends its
 *     whole budget on the precision of one curve, the six bumps and the two
 *     terminals -- which is what the manual means by smooth being harder rather
 *     than easier.
 *  6. THE MASSES.  Four. (1) the stipe, (2) the head bulb it swells into,
 *     (3) the holdfast, (4) the bladder chain. The hood is part of (2).
 *  7. HEAD VERB / BODY VERB.  Head LOWERED -- the crown droops forward and left
 *     under the weight of the frond, which is what kelp out of water actually
 *     does and is the opposite of thornmarch standing beside it. Body: leaning,
 *     anchored, and going nowhere. The centre of mass is well left of the
 *     holdfast's centre, so the whole plant is straining seaward.
 *  8. SIGNATURE.  The bladder chain -- SIX gold ovals bulging the back contour,
 *     each one big enough to break the outline on its own, and varying in size
 *     along the length. Silhouette first and colour second: flatten the sprite
 *     and the six bumps are still there. Second signature: the hood's POINT,
 *     projecting left at the crown, which is the only thing in the flat
 *     silhouette that says which end of this creature is alive.
 *  9. THE TWELVE REVERSALS -- a serpent's are curvature reversals and terminal
 *     landmarks, and eight are named.
 *       holdfast, near toe  cx-36, G      the splay's most forward point
 *       root gap            cx-16, G-4    carved, not ruled
 *       stipe waist         cx+ 9, G-44   the S's outward extreme
 *       stipe shoulder      cx- 3, G-70   the S reverses back over
 *       bladder 3 crest     cx+31, G-58   the widest point of the whole plant
 *       bladder 6 crest     cx+ 5, G-95   the chain's last and smallest
 *       crown               cx-10, G-104
 *       hood point          cx-44, G-92   the leftmost cell on the creature
 *       chin                cx-22, G-78   the bulb's underside
 *       holdfast, far toe   cx+32, G
 * 10. THREE HUES.  H1 kelp green (BASE / LIGHT / FORM), ~58 %. H2 gold bladders
 *     (ACCENT family), ~17 % -- and they PAINT THEIR OWN COLOUR rather than
 *     resolving to the top and bottom of the ramp, which is the diagnostic the
 *     manual gives for an accent that is really too thin to count. H3 INNER,
 *     ~1 %: the crevice under the holdfast and the mouth.
 * 11. FOUR INTERIOR DETAIL EVENTS.  (a) the face under the hood; (b) the six
 *     bladders; (c) the hood as one FLAT facet -- a frond is a plane and a
 *     plane takes one tone across its whole area; (d) the cast shadows the
 *     bladders and the hood throw onto the stipe. Nothing else. The stipe's
 *     whole length is flat colour with the shading pass running one continuous
 *     light ridge along it, parallel to its own axis, exactly as a reference
 *     serpent gets ONE ridge for the whole body rather than one per coil.
 * 12. EYES.  `sleepy` m, `far: 'm-'`, spread 6. Sleepy is the widest and
 *     shallowest stamp in the set -- heavy flesh, one lid line, a letterbox --
 *     and a creature that anchors to one rock and stays there for its whole
 *     life is the definition of placid. No two faces in this group share a
 *     style: hooded, angry, gem, sleepy, compound.
 *     ONE mark below the eyes: a six-cell INNER mouth, five cells under the
 *     lid line.
 * 13. SURFACE MATERIAL, THREE PLACES MAX.  Zero. A kelp's surface is smooth and
 *     wet and there is nothing on it. The only edge event is the hood's blade,
 *     which is a mass rather than a material.
 * 14. EVERY INTERNAL DARK LINE.  None authored. The old one ruled a `seamPath`
 *     midrib the whole length of the stipe with a LIGHT lip over it; that is
 *     three cells of ink to say what the light pass now says for free, and on a
 *     smooth creature it was the one line that had to go.
 * 15. Not an evolution.
 */
function bladderwrack(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  /* ------------------------------------------------------- the holdfast.
     Splayed flat and gripping, drawn as ONE mass with divisions rather than as
     four separate worms -- the same reasoning the manual gives for a
     crustacean's bank of legs. SHADE, because it is genuinely a different part
     set behind the stipe and that is the one case that wants the ink.
     The gaps between the roots are CARVED out of the bottom contour, not ruled
     on: a 1-cell dark stroke there is half a reference pixel and is gone at 64,
     while a notch is a shape change and survives all the way down. */
  poly(p, [
    [cx - 36, G], [cx - 30, G - 15], [cx - 8, G - 23],
    [cx + 12, G - 22], [cx + 28, G - 13], [cx + 32, G],
  ] as Pt[], SHADE);
  toeNotches(p, cx - 34, cx + 30, G, 4, 11);

  /* ---------------------------------------------------------- the stipe.
     ONE path, one width profile, nothing branching off it. It leans OUT at the
     waist and back OVER at the shoulder -- a single shallow S -- and it is
     thickest a third of the way up, where a kelp's stipe actually carries its
     load. Without the S it is a length of pipe, and a pipe with a cap on it is
     the pickle the first version of this creature was. */
  limbPath(p, [
    [cx + 4, G - 18], [cx + 13, G - 46], [cx - 5, G - 72], [cx - 11, G - 88],
  ] as Pt[], 34, 24, BASE, { bulge: 4 });

  /* ------------------------------------------------------- the head bulb.
     The stipe swells at the top into something that is recognisably a head
     rather than the end of a pipe. A column that swells is a neck with a head
     on it; a column that stops is a stick. */
  blob(p, cx - 10, G - 91, 19, 15, BASE);

  /* ----------------------------------------------------- the float bladders.
     SIX, down the seaward edge, VARYING IN SIZE along the length -- biggest at
     the waist where the plant needs the most lift and tapering both ways. The
     old one had about nine identical circles and read as a string of beads;
     three to eight and varying is the reference's count for any repeated
     structural element.
     Each sits half OUTSIDE the stipe's contour, which is not a nicety: a
     bladder drawn wholly inside the column is a coloured spot that the
     internal-edge pass then rings in ink, and six closed ink rings on a
     forty-cell-wide creature is where the old one's 45 % went. Half outside,
     most of each border is the outer silhouette, which is free.
     ALL SIX ARE ONE CASTER. Six separate `cast` calls would be six shadow
     events against a budget of four; one block throws the whole chain's shadow
     down-and-right onto the stipe as a single event, and because it is one
     offset it reads as one light. */
  cast(p, 18, () => {
    for (const [bx, by, r] of [
      [ 16, -26, 6.5],
      [ 22, -42, 8.5],
      [ 22, -58, 9.0],
      [ 16, -73, 7.0],
      [  8, -85, 5.5],
      [  0, -96, 4.5],
    ] as const) blob(p, cx + bx, G + by, r, r * 1.12, ACCENT);
  });

  /* ----------------------------------------------------------- the hood.
     One frond growing off the back of the crown, folded forward over the head
     and coming to a POINT well clear of the column on the left. It is the head
     terminal and the pointed tip is the single thing in the whole silhouette
     that says which of the two ends of this creature is alive.
     It is a FACET: a frond is a plane, a plane takes ONE TONE across its whole
     area with no gradient, and airbrushing it turns it into a green sausage.
     And it CASTS, which is what puts the face in a recess instead of leaving it
     as two marks on a flat panel -- the deliberate deep shadow the manual asks
     every otherwise-even creature to be given. */
  cast(p, 40, () => {
    flat(p, () => poly(p, [
      [cx +  6, G - 96], [cx +  2, G -104], [cx - 16, G -105],
      [cx - 34, G - 99], [cx - 44, G - 92], [cx - 30, G - 91],
      [cx - 12, G - 93], [cx +  2, G - 91],
    ] as Pt[], LIGHT));
  });

  /* ------------------------------------------- the one deep shadow event.
     Two DEEP PATCHES, and they are patches rather than strokes on purpose: a
     filled region with a real interior is read as a core shadow and left alone,
     so it is dark with no line round it.
     The first is the recess under the hood where it overhangs the neck -- a
     mostly-even creature has to be given one place where the whole value range
     is concentrated, and on this one it is under the frond, which also puts the
     face in a hollow instead of on a flat panel. The second is the crevice
     between two roots of the holdfast, in INNER: "anchors to one rock and stays
     there for its whole life" is the Vellum entry, and a dark gap where the
     grip closes is the whole of it in three cells.
     RECORDED EXEMPTION, as on the rest of this group: 12-25 % of body pixels
     darker than the mean outline luma is unreachable from a design file on this
     palette -- ink #22301c resolves the OUTLINE to luma 50 and the darkest
     tone a design can write, DEEP, resolves to 52. */
  poly(p, [
    [cx +  4, G - 92], [cx -  8, G - 93], [cx - 18, G - 92],
    [cx - 16, G - 88], [cx -  7, G - 88], [cx +  5, G - 86],
  ] as Pt[], DEEP);
  poly(p, [
    [cx - 4, G - 1], [cx + 4, G - 1], [cx + 1, G - 10], [cx - 2, G - 10],
  ] as Pt[], INNER);

  if (p.back) { p.face(cx - 16, G - 85, 15); return; }

  /* ------------------------------------------------------------ the face.
     Under the hood, in the shadow it casts, and moved five cells toward the
     front of the head. The one mark below the eyes is the mouth: six cells of
     INNER, both corners turning the same way, which on a creature with no
     nostril and no beak is the only thing available -- and 36 of the old 48
     species had nothing at all down there, which is most of the kindergarten
     read. */
  mouthLine(p, cx - 20, G - 78, 6, 1);
  eyeRow(p, cx - 17, G - 85, 6, 'sleepy', 'm', { far: 'm-' });
}

/* =========================================================== silthopper */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IS IT.  A mud cricket, caught in the instant before it launches:
 *     head pressed down on the flat, front end propped on two short legs, and
 *     both jumping legs folded so hard that the knees stand clear above its own
 *     back. It has never once been seen to walk.
 *  2. PLAN.  B / NON-QUADRUPED ANIMAL - BUG. `species.json` says `grub`; this is
 *     the recorded override, because a grub is a legless tube and this
 *     creature's entire character is its legs. What that plan warns about is
 *     exactly the trap the old one fell into: bugs come out the same size as
 *     everything else because the box is big and authors fill it. This one is
 *     drawn SMALL, on purpose, with two thirds of the frame empty above it.
 *  3. RUNG.  0.3 m, TINY, and by a wide margin the smallest thing in this
 *     group. MEASURED: ships 68 x 44, long dimension 68 against a band of
 *     52-68, body area 436 ref px against 380-700, fill 58 %. The old one was
 *     112 cells long and 1170 ref px -- very nearly the size of thornmarch,
 *     which is six times its height. Beside the new thornmarch it is now three
 *     fifths the length and a fifth of the mass, and that ladder is the first
 *     thing the player reads.
 *     THE REST OF THE SHEET: largest connected region 27.2 %, the flattest
 *     single area in the group; top three 41.1 %; top-three colour share
 *     62.6 %; 103 regions; 3.2 tone changes per scanline; 80 body-ramp runs; 0
 *     highlight events; 0 SPEC; symmetry 59 %. Ink is 33.4 % and over the
 *     ceiling -- see the exemption in the file header; the authored interior
 *     share of it is 3.9 %, well inside the 5 % limit.
 *  4. ASPECT AND FILL.  LONG AND LOW, about 3:2, at roughly 60 % fill. It is
 *     the only thing in the group whose bounding box is wider than tall AND
 *     small, which is what separates it from mossback's wide-and-large.
 *  5. SMOOTH OR STRUCTURED.  STRUCTURED. Head, pronotum, abdomen, hip, knee and
 *     tarsus are all separate and all in the outline.
 *  6. THE MASSES.  Five. (1) the body, one tapered capsule from pronotum to
 *     abdomen tip, (2) the near jumping leg, (3) the far one as a smaller
 *     darker copy, (4) the two propping forelegs, (5) the head.
 *  7. HEAD VERB / BODY VERB.  Head LOWERED -- pressed right down onto the mud
 *     on two propping legs, which is the whole pose. Body: coiled. The weight
 *     is thrown forward onto the front legs and the two jumping legs are
 *     compressed behind, so the centre of mass sits well forward of the
 *     midpoint between the four contacts.
 *  8. SIGNATURE.  THE KNEE. A peak standing sixteen cells clear above the
 *     abdomen with a long shank dropping away behind it, and a smaller, darker,
 *     higher copy of the same shape behind that. In flat black that is a
 *     cricket and it cannot be much else.
 *  9. THE TWELVE REVERSALS -- eight named. On a bug they are segment junctions
 *     and joints rather than muscles, which is the point of an exoskeleton.
 *       occiput / neck      cx-13, G-16   the head is a separate ball
 *       pronotum crest      cx- 2, G-23   the body's high point, well forward
 *       abdomen dip         cx+ 8, G-19   the back DROPS behind the thorax --
 *                                         that dip is what the femur stands out
 *                                         of, and without it the back and the
 *                                         leg are one smooth ramp
 *       abdomen tip         cx+22, G- 7
 *       hip                 cx+ 4, G-15
 *       KNEE                cx+15, G-33   the sharpest angle on the creature
 *       tarsus              cx+24, G- 6   the shank's lower reversal
 *       far knee            cx+ 9, G-28   four cells lower, nine cells forward
 *       fore-tarsus         cx-20, G- 1
 * 10. THREE HUES.  H1 mud tan (BASE / LIGHT / FORM), ~55 %. H2 GREEN (ACCENT
 *     family), ~16 %, and it is on the LEGS -- the manual measured this species
 *     as painting 0.0 % of its declared second hue, which is the loudest kind
 *     of failure there is, and the legs are where it belongs because they are
 *     the thing the creature is about. H3 INNER, ~1 %: the mandibles.
 *     The compound eyes take the green too, which ties the face to the legs.
 * 11. FOUR INTERIOR DETAIL EVENTS.  (a) the compound eyes; (b) the wing case,
 *     ONE flat facet over the abdomen -- a tegmen is a plate and a plate takes
 *     one tone with a hard edge; (c) the near jumping leg's cast shadow onto
 *     the body and the far leg; (d) the pale grit line along the underside.
 *     The old design stated "segmented" four separate ways -- nine overlapping
 *     discs, eight tonal band sweeps, a 91-step dorsal sheen and four ocelli.
 *     This one states it once, in the outline.
 * 12. EYES.  `compound` m, `far: 'm-'`, spread 5, `iris: ACCENT`. Compound
 *     because the style exists for a LENS rather than an eyeball, and putting a
 *     round pupil in an insect is what makes it look googly; and the manual
 *     names this species' compound-plus-accent face as the best one on the old
 *     sheet, so it is kept. Twenty-two cells of eye across a twenty-two-cell
 *     head is what an orthopteran actually is -- mostly eye -- and it is the one
 *     place in this group where a large eye is anatomy rather than cuteness.
 *     ONE mark below the eyes: three cells of INNER at the mandibles. A
 *     compound-eyed insect is one of the species the manual exempts from the
 *     lid line, and it has no brow; the mandibles are all it gets and all it
 *     needs.
 * 13. SURFACE MATERIAL, THREE PLACES MAX.  One: the wing case's lower edge,
 *     where the tegmen overlaps the abdomen. Scales, plates and chitin are
 *     drawn only where a plate overlaps another plate.
 * 14. EVERY INTERNAL DARK LINE.  None authored. The old one ruled a `seamPath`
 *     down the tegmina and a sixteen-step DEEP rib along the femur; both are
 *     half a reference pixel wide at icon scale, both were charged to the ink
 *     budget anyway, and this creature is small enough that its two-cell
 *     outline is already a fifth of it.
 * 15. Not an evolution.
 */
function silthopper(p: Pen): void {
  p.noTypeTraits();
  const G = p.ground, cx = p.cx;

  /* ------------------------------------------------- the FAR jumping leg.
     Down first, in SHADE, and it is a smaller copy of the near one set nine
     cells forward and four cells lower -- that difference is the whole depth
     cue, and it is the same rule as a quadruped's far pair. */
  limbPath(p, [[cx - 1, G - 15], [cx +  9, G - 29]] as Pt[], 11, 5, SHADE, { bulge: 1.5 });
  limbPath(p, [[cx + 9, G - 29], [cx + 17, G -  7]] as Pt[],  4, 3, SHADE);
  paw(p, cx + 17, G - 5, 4, { tone: SHADE, toes: 2 });
  // and the far propping foreleg.
  limbPath(p, [[cx - 6, G - 14], [cx - 13, G - 8], [cx - 16, G - 3]] as Pt[], 6, 4, SHADE);

  /* ----------------------------------------------------------- the body.
     THE ABDOMEN IS LOWER THAN THE PRONOTUM, and that is the change that finally
     made the leg read. While the back rose steadily from head to tail, the
     femur left the top of the abdomen and carried on rising, so back and leg
     came out as one smooth ramp -- in the flat test a lump with a bump on it and
     no knee anywhere. Dropping the abdomen behind the thorax puts a DIP in the
     back line for the femur to stand up out of. */
  poly(p, [
    [cx - 14, G - 12], [cx - 12, G - 21], [cx -  2, G - 25],  // pronotum crest
    [cx +  8, G - 21],                                        // abdomen dip
    [cx + 17, G - 15], [cx + 22, G - 10], [cx + 19, G -  7],
    [cx + 14, G -  9], [cx + 10, G -  6],
    [cx +  5, G -  8], [cx +  1, G -  6],
    [cx -  5, G -  8], [cx - 12, G -  8],
  ] as Pt[], BASE);

  /* ------------------------------------------------------- the wing case.
     ONE flat facet over the dorsal half of the abdomen. A tegmen is a PLATE:
     it takes one tone across its whole area with no gradient, and the hard step
     along its lower edge is the overlap. That step is the only thing this
     creature says about being segmented, and the reference says it once too --
     Wurmple is contour bumps plus a coloured band and that is all. */
  flat(p, () => poly(p, [
    [cx - 9, G - 22], [cx + 1, G - 24], [cx + 10, G - 20], [cx + 18, G - 14],
    [cx + 15, G - 11], [cx + 4, G - 16], [cx - 8, G - 17],
  ] as Pt[], LIGHT));

  /* --------------------------------------------- the pale grit underside.
     One small shape, low: light coming back up off the wet flat. It is the
     third value the creature has, and without it the whole animal is one tan
     mass. */
  poly(p, [
    [cx - 10, G - 10], [cx + 6, G - 9], [cx + 16, G - 11],
    [cx + 14, G - 8], [cx - 2, G - 7], [cx - 10, G - 8],
  ] as Pt[], LIGHT);

  /* ------------------------------------------------ the NEAR jumping leg.
     THE SIGNATURE, and the thing the first pass got wrong: the femur was driven
     up and FORWARD, so the shank had to come all the way back across the whole
     body and the creature read as a grub with a plank lying on it. A cricket's
     femur goes up and BACK; the knee stands clear above the abdomen and the
     shank drops away behind it. Both halves live in the rear third of the
     sprite and the body outline is left alone.
     IT IS GREEN, and that is the manual's own instruction for this species --
     its declared second hue was painting 0.0 % of the sprite and the legs are
     where it belongs. It also solves the separation problem for free: a green
     femur crossing a tan flank is a material change, which the internal-edge
     pass finds by itself, so there is no seam to draw. And it casts. */
  cast(p, 15, () => {
    limbPath(p, [[cx + 3, G - 17], [cx + 16, G - 34]] as Pt[], 14, 5, ACCENT, { bulge: 2 });
    limbPath(p, [[cx + 16, G - 34], [cx + 26, G - 5]] as Pt[], 6, 4, ACCENT);
    paw(p, cx + 26, G, 5, { tone: ACCENT, toes: 2 });
  });
  // The near propping foreleg, green as well, holding the front end down.
  limbPath(p, [[cx - 11, G - 14], [cx - 18, G - 7], [cx - 21, G - 1]] as Pt[], 7, 5, BASE);

  /* NO ANTENNAE, and that is a measured decision rather than an omission.
     They went in twice. A feeler is one cell wide in life; drawn at one cell
     here it is half a reference pixel and the icon downsample returns nothing
     at all, and drawn at the three cells that would survive it, on a creature
     only 62 cells long, it comes back as a thick tan wedge -- the pair read
     unmistakably as rabbit ears. They also cost about four per cent of the
     sprite in outline on a creature whose two-cell border is already a fifth of
     it. The insect read is carried by the compound eyes and the folded jumping
     leg, both of which are large enough to survive the downsample. */

  /* ----------------------------------------------------------- the head.
     Small, blunt, pressed down onto the mud, and almost entirely eye. It is the
     only mass at the far left of the silhouette, which is what makes the face
     findable at icon scale where nothing else survives. */
  cast(p, 22, () => blob(p, cx - 20, G - 16, 11, 9, BASE));

  if (p.back) { p.face(cx - 20, G - 16, 12); return; }

  /* ------------------------------------------------------------ the face.
     The mandibles are the one mark below the eyes. Three cells of INNER with a
     pale cell under them; a compound-eyed insect gets no lid line and no brow,
     and the reference's genuinely bare-below-the-eyes species compensate with a
     much bigger eye than this. */
  mouthLine(p, cx - 26, G - 10, 3, 1);
  eyeRow(p, cx - 22, G - 17, 5, 'compound', 'm', { far: 'xs', iris: ACCENT });
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  bramblehusk,
  thornmarch,
  mossback,
  bladderwrack,
  silthopper,
};
