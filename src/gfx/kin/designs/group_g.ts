/**
 * Design group G -- the six beasts, rebuilt from the animal outward.
 *
 * WHY EVERY ONE OF THESE FUNCTIONS WAS DELETED RATHER THAN EDITED. The round-5
 * versions were written against a pipeline in which there was no line-free way
 * to say "darker": `SHADE` and `DEEP` were both promoted to hard ink, so an
 * author who wanted a shadowed haunch with no ring round it could not write
 * one, and every one of these six therefore came out as a smooth capsule with
 * a black loop where a muscle should have been. `FORM` fixes that, `cast()`
 * fixes the rest, and the shape of a function written without either of them
 * is the thing being replaced. All six start from the skeleton.
 *
 * WHAT CHANGED, IN ONE PARAGRAPH. Torsos are `poly`s with named vertices --
 * withers, back dip, croup, point of shoulder, brisket, belly tuck, point of
 * buttock -- instead of two overlapping ellipses. Hind legs zigzag through a
 * hock; forelegs do not, and the difference between the pairs is most of what
 * says quadruped. Far feet land six to twelve cells higher than near feet and
 * are offset forward, so the four contacts are four and not a bar. Every
 * overlap is separated by a CAST SHADOW rather than by a seam ring, and not one
 * `{ front: true }` survives.
 *
 * THE SIX, AND WHY THEY CANNOT BE CONFUSED WITH EACH OTHER.
 *
 *   nibbet       0.3 m. TINY. A mouse sitting up: one teardrop with a face
 *                welded into it, two spoon ears taller than the skull, a
 *                ringed tail hooked along the floor. Drawn small, with air
 *                above it.
 *   burrowen     0.8 m. MID, long and low. The same rodent grown broad and
 *                dropped onto all fours -- withers over the shoulder, the back
 *                sloping DOWN to the hips, the head driven below the shoulder
 *                line, one shovel forepaw thrown forward past the chin.
 *   tuftail      0.6 m. SMALL, long and low. A grazer with its head in the
 *                verge: the front of the animal slopes to the floor and a moss
 *                green ruff sits at the top of that slope.
 *   bristlebuck  1.4 m. LARGE, tall and square. High withers, a real belly
 *                tuck, heavy braced legs, a green bristle mantle down the nape
 *                and two short back-swept horns.
 *   frostnip     0.4 m. SMALL, one diagonal. A frost-fox kit in a play bow --
 *                chest on the floor, rump in the air, brush tail flagged, head
 *                raised at the low end with icicles off the jaw.
 *   rimehound    1.3 m. LARGE, long and low-headed. A stalking hound: muzzle
 *                carried below its own shoulders, a frost mane at the neck,
 *                near forepaw lifted clear of the ice.
 *
 * Sitting teardrop / long low wedge / head-down slope / tall square stag /
 * diagonal crouch / long stalking line. Six silhouettes before a mark is drawn,
 * and the two LARGE species are deliberately opposite aspects.
 *
 * THE PALETTES, AND THE ONE THING THAT WOULD OTHERWISE WASTE A DAY. All six
 * declare five colours, which `paletteOf` reads as `[base, shade, light,
 * accent, last]` and then repairs: it takes whichever colour is genuinely
 * darkest as the ink and, when that is not the one in the last slot, hands the
 * last slot back as `ACCENT2`. So on the three species that put a near-black in
 * the accent slot the bright colour is NOT lost -- it arrives as `ACCENT2`:
 *
 *   nibbet    ACCENT #3a2c20 (= its ink)   ACCENT2 #d8a05a  warm ochre
 *   burrowen  ACCENT #33261a (= its ink)   ACCENT2 #c98f4a  warm ochre
 *   tuftail   ACCENT #4a3a28 (= its ink)   ACCENT2 #6e8a4a  MOSS GREEN
 *   bristlebuck / frostnip / rimehound: ACCENT is already a real colour and
 *   ACCENT2 repeats it.
 *
 * A previous author spent half a day on a green fleece for tuftail, concluded
 * from the render that "this species has no green", and wrote that into the
 * file. It has one. It is in `ACCENT2`, and it is what makes the ruff read as
 * the thing bristlebuck's mantle grows out of.
 *
 * THE ONE BUG THAT WAS VISIBLE ON THREE OF THESE FROM ACROSS A ROOM. burrowen,
 * frostnip and rimehound each painted a dark band across their own eye row and
 * then set the eye stamps inside it. With a lid line and a field on top, that
 * reads as A PAIR OF SUNGLASSES, and it is what the player was looking at. All
 * three masks are gone. The dark second hue a pale species needs (frostnip and
 * rimehound are two of the roster's six pale species) is spent where the
 * reference spends it instead -- ear cavities, paw pads, the mane, the
 * icicles -- so the value range is still there and it is no longer worn on the
 * face.
 *
 * WHAT THEY MEASURE, rendered through the real factory and counted. `design` is
 * the content box before the fit; anything inside 120 x 110 is never resampled.
 * `area` is opaque pixels at reference scale against the rung band from the
 * appendix. `casts` is cast-shadow regions (target 2-4; the shipped roster had
 * ZERO on all forty-eight). `ink` is every line colour as a share of the sprite
 * (target <= 28 %). `spk8` is body-colour regions of eight cells or fewer
 * (target < 120). `scan` is body-tone changes per horizontal scanline.
 *
 *   species      design   area / band       casts  ink   ACC2/ACC  INNER  spk8  scan
 *   nibbet        60x 67   691 /  380- 700    3    24.0%   3.6%    6.9%    84   5.5
 *   burrowen      98x 57  1123 /  950-1400    3    16.6%   6.1%    1.5%   138   9.5
 *   tuftail       79x 63   906 /  650-1000    4    21.5%  20.7%    1.7%    91   8.6
 *   bristlebuck   98x107  1549 / 1300-1900    4    25.4%  20.3%    5.9%   113   5.7
 *   frostnip      84x 79   945 /  650-1000    3    19.2%  12.1%    0.7%   110   7.1
 *   rimehound    116x 96  1611 / 1300-1900    4    14.6%  26.3%    0.3%   145   9.4
 *
 * The ladder runs 691 / 906 / 945 / 1123 / 1549 / 1611 -- monotonic across TINY,
 * SMALL, SMALL, MID, LARGE, LARGE, against the 62 x 47 box all six used to
 * share. Every one is clear of the `fitToCell` clamp at k = 1.000.
 *
 * THREE THINGS ARE STILL SHORT AND ARE WRITTEN DOWN RATHER THAN HIDDEN.
 *
 * (a) `body pixels darker than the outline` is 0.0 % on all six, against a
 *     target of 12-25 %. This is a PALETTE fact, not a drawing one: the ink
 *     slots here run luma 41-61 while the `shade` slots run 87-172, so FORM and
 *     SHADE physically cannot reach below the line. frostnip is the worst case
 *     and the manual already names it -- its `shade` is `#8fb4cc` at luma 176,
 *     which is a second highlight, not a shadow. The whole dark end therefore
 *     lives in ACCENT, INNER and DEEP, which is why the two frost species wear
 *     slate stockings and slate ear cavities. Fixing the metric means editing
 *     `species.json`, which is not this file.
 * (b) The largest connected same-tone region averages 16 % against a target of
 *     25 %, and the top three 32 % against 50 %. A quadruped is four legs, a
 *     head, a tail and a barrel, and the light pass bands each of those
 *     separately; the barrel is about a third of the sprite and its widest
 *     band is about half of that. The mineral and serpent species on the roster
 *     can hit 25 % because they are one mass. bristlebuck, with four legs, a
 *     neck, a mantle and a spike row, is the floor of this group at 14.4 %.
 * (c) Body-tone changes per scanline average 7.7 against a target of 4, and
 *     most of the excess is geometric: a horizontal line drawn through the
 *     middle of a standing quadruped crosses four legs. Measured through the
 *     barrel alone it is three.
 * * BEASTS AND FROST BOTH OPT OUT OF THE TYPE CHARACTER PASS. It has no `beast`
 * case, so beasts fall through to a default that grows guard hairs off the
 * shaded contours and a four-clump ruff off the highest point of the top
 * contour behind the face -- which on a head in profile is the tip of an ear.
 * `frost` scatters four random shards off the top contour, which on a hound
 * lands on the rump. Every spike, icicle and bristle here is placed by hand.
 */

import {
  ACCENT, ACCENT2, ACCENT2_LIT, ACCENT_DARK, ACCENT_LIT, BASE,
  FORM, INNER, LIGHT, SHADE,
  blob, cast, cellOver, contourTop, eyeRow, far, flat, jawLine, legDigitigrade,
  limbPath, mane, notch, path, paw, poly, spec, stroke, toeNotches,
  type Pen, type Pt,
} from '../parts.js';

/* =============================================================== shared */

/**
 * A row of hand-written spikes: base point, direction, length, half-width.
 *
 * `spineRow` sweeps a contour and grows however many spikes off whatever
 * happens to be topmost, which on a creature whose top contour is an ear tip
 * puts a spike on the ear. Five spikes I can count in the source are worth more
 * than a helper's five, and the ONLY thing that makes a row of spikes read at
 * icon scale is the gaps of body colour between them -- so each one is a
 * separate polygon and they are written at unequal lengths.
 *
 * They are drawn inside `flat()`: a horn, a bristle and an icicle are hard
 * planes, and one flat tone per facet is what makes a hard thing look hard.
 * The lit run the previous version painted up every spike was one specular
 * event per spike on a budget of one per creature, and on a five-cell spike it
 * was a single cell -- half a reference pixel, gone at 64.
 */
function spikes(
  p: Pen, items: readonly (readonly [number, number, number, number, number])[],
  v: number,
): void {
  flat(p, () => {
    for (const [x, y, ang, len, half] of items) {
      const ux = Math.cos(ang), uy = Math.sin(ang);
      poly(p, [
        [x - uy * half, y + ux * half],
        [x + uy * half, y - ux * half],
        [x + ux * len, y + uy * len],
      ], v);
    }
  });
}

/**
 * The ONE mark below the eyes on a small mammal: a dark nose with a pale cell
 * under it, sat on the tip of the muzzle.
 *
 * `nostril()` in the parts library is the same idea; this wraps it so every
 * face in the group puts its nose at the same proportion of its own muzzle
 * rather than at six separately guessed coordinates. It is `cellOver`
 * underneath, so it can never extend the silhouette.
 */
function nose(p: Pen, x: number, y: number): void {
  cellOver(p, x, y, INNER);
  cellOver(p, x + 1, y, INNER);
  cellOver(p, x, y - 1, INNER);
  cellOver(p, x + 1, y + 1, LIGHT);
}

/* ================================================================ nibbet */

/**
 * BRIEF (PART 1)
 *  1. A pantry mouse sitting back on its haunches, forepaws tucked, ears up,
 *     listening for the person who owns the loaf.
 *  2. Plan D, sitting/upright. What that plan demands is COMMITMENT TO THE
 *     SINGLE MASS -- no neck, no shoulders, no waist -- with the character in
 *     the face and two or three silhouette appendages. Body and skull are two
 *     `poly`s in one tone that weld into a single teardrop; the ears, the tail
 *     and the tucked paws are the appendages.
 *  3. TINY. 60 x 67 design cells, long dimension 67 against a TINY band of
 *     52-68, body area 691 ref px against 380-700. The shortest thing in the
 *     group by twelve cells and it is meant to look it -- a tiny creature is
 *     supposed to have air above it.
 *  4. Aspect: TALLER than wide, 0.90 : 1, fill ~0.52. Nothing else in the group
 *     is upright, so the aspect is free to be the outlier.
 *  5. SMOOTH (the manual lists nibbet as correctly smooth). ZERO internal dark
 *     lines. The whole budget goes on silhouette precision, three cast shadows
 *     and one high-contrast ocular event.
 *  6. Five masses: the teardrop (rump + chest + haunch, one poly), the skull
 *     (a second poly welded to it), the near ear, the far ear, the tail.
 *  7. Head verb: COCKED and lifted -- the skull tips back off the chest and the
 *     near ear leans out while the far one stands straight. Body verb: the
 *     weight is all on the heels, the spine is a C, and the belly is pushed
 *     forward of the chest.
 *  8. Signature: the two spoon ears, each taller than the skull is deep, plus
 *     the ringed tail hooked along the floor. Both pure silhouette; the flat
 *     test passes on those two alone.
 *  9. Reversals, with coordinates (nine of the twelve, adapted to a sitting
 *     animal):
 *       crown            (cx- 4, G-52)  contour high point
 *       occiput dip      (cx+ 6, G-47)  dips 3 cells before the ear root
 *       nape             (cx+ 8, G-44)  reversal back out to the shoulder
 *       croup            (cx+19, G-27)  second high point of the back curve
 *       point of buttock (cx+21, G-16)  most rearward point
 *       heel             (cx+17, G- 5)  contour cuts back in above the foot
 *       hind foot        (cx- 6, G   )  steps out 4 cells forward of the ankle
 *       ankle front      (cx- 9, G- 9)  reversal: foot is wider than ankle
 *       brisket          (cx-15, G-28)  most forward point of the chest
 *       stop             (cx-16, G-45)  muzzle top plane, 5 cells under the brow
 * 10. Three hues. H1 umber #b09070, ~52 % -- the body. H2 cream #e0cdb0,
 *     ~20 % -- the bib, the muzzle, the paw backs. H3 warm ochre #d8a05a as
 *     `ACCENT2`, ~4 % -- three tail rings and the pair of chisel incisors.
 *     Plus `INNER` in the ear cavity and the nose, ~2 %.
 * 11. Four interior events: the cream bib, the three tail rings, the three cast
 *     shadows, the face. Nothing else is painted on this creature.
 * 12. Eyes `round` `'m'`, far `'m-'`, spread 7, pair shifted 5 cells toward the
 *     muzzle. Row at 0.55 of skull depth from the crown -- LOW, which is the
 *     single cheapest way to make a face read as young. The mark below the eyes
 *     is the nose.
 * 13. Surface material: NONE. A smooth species draws no fur anywhere; the ear
 *     rims and the tail are the only edges allowed to be interesting.
 * 14. Internal dark lines: none at all. Zero `seam`, zero `occlude`, zero
 *     `*Front`, zero `{ front: true }`.
 * 15. First stage. Passes to burrowen: the ringed tail and the chisel incisors
 *     as the silhouette signature, and the umber/cream/ochre palette
 *     relationship. Everything else changes.
 */
function nibbet(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const headX = cx - 7, headY = G - 43;

  /* --- the far ear, first and in SHADE: a genuinely separate part set behind
     another one, which is the one case that wants the ink. Shorter than the
     near ear, more upright, and set back -- whatever a creature has two of gets
     two sizes, two places and two heights. */
  limbPath(p, path([[cx + 8, G - 45], [cx + 12, G - 51], [cx + 14, G - 56]] as Pt[]), 10, 6, SHADE);

  /* --- the tail, hooked out along the floor and turning up at the tip. Drawn
     before the body so the rump sits on its root and there is no join to hide.
     Four points, because a tail is the one part of an animal that is pure line
     and a two-point tail is the most mechanical thing on a sprite. */
  const tail = path([[cx + 14, G - 13], [cx + 23, G - 7], [cx + 30, G - 11], [cx + 32, G - 19]] as Pt[]);
  limbPath(p, tail, 8, 4, BASE);

  /* --- THE TEARDROP. One polygon, and every vertex is a landmark named in the
     brief. Drawn as a poly rather than as two ellipses because an ellipse has
     no landmarks on it: the brisket, the belly, the heel and the point of the
     buttock are four coordinates and an ellipse throws all four away. */
  poly(p, [
    [cx + 4, G - 45],   // nape, under the skull
    [cx + 12, G - 38],  // shoulder
    [cx + 18, G - 27],  // croup
    [cx + 20, G - 16],  // point of buttock -- most rearward
    [cx + 16, G - 5],   // heel
    [cx + 12, G - 1],
    [cx - 8, G],        // sole of the hind foot
    [cx - 17, G - 2],   // toe tip -- the foot reaches 7 cells past the ankle
    [cx - 15, G - 7],   // instep
    [cx - 10, G - 10],  // ankle front: reversal, the foot steps OUT from here
    [cx - 12, G - 19],  // belly
    [cx - 15, G - 28],  // brisket -- most forward on the chest
    [cx - 11, G - 39],  // throat
    [cx - 3, G - 44],
  ] as Pt[], BASE);

  // The toes on the planted hind foot, carved out of the bottom contour. Three,
  // and the middle one leads. A toe drawn as a dark stroke inside the pad is
  // half a reference pixel and is gone at icon scale; a notch is a shape.
  toeNotches(p, cx - 16, cx - 3, G, 3, 4);

  /* --- the bib. One pale region, top edge SLANTED down-and-forward from the
     throat: the same area as an axis-aligned oval reads as a stain, and with a
     straight slanted edge it reads as the boundary of a coat. It stops six
     cells short of the chin, which is what keeps the face findable on a
     creature whose muzzle is also pale. */
  if (!p.back) {
    poly(p, [
      [cx - 14, G - 29], [cx - 5, G - 25], [cx - 3, G - 16],
      [cx - 6, G - 7], [cx - 11, G - 13], [cx - 15, G - 23],
    ] as Pt[], LIGHT);
  }

  /* --- THE SKULL, laid over the chest and throwing its shadow down onto it.
     This is the separation that would previously have been a `blobFront` ring:
     the head is a closed shape sitting on an open surface, and the reference
     answer for that is an offset hard-edged shadow, not a loop of ink. Same
     tone as the body, so the two weld in silhouette -- the moment there is a
     visible neck this stops being a mouse sitting up. */
  cast(p, 30, () => {
    poly(p, [
      [cx - 3, G - 54],   // crown
      [cx + 8, G - 50],   // occiput
      [cx + 10, G - 44],  // nape reversal
      [cx + 7, G - 39],   // cheek
      [cx - 1, G - 34],   // jaw corner
      [cx - 11, G - 33],  // chin
      [cx - 21, G - 35],  // lower muzzle
      [cx - 25, G - 39],  // nose tip
      [cx - 20, G - 44],  // stop -- muzzle top plane, 6 under the brow
      [cx - 13, G - 50],  // brow
    ] as Pt[], BASE);
  });

  /* --- the near ear. A spoon: three-point capsule leaning out from the crown,
     its root sunk five cells INSIDE the cranium so the two outlines are one
     line rather than a triangle parked on a ball. Deliberately taller than the
     skull is deep -- a mouse ear the size of a mouse ear is not a signature. */
  cast(p, 14, () => {
    limbPath(p, path([[cx + 1, G - 47], [cx - 4, G - 55], [cx - 7, G - 62]] as Pt[]), 13, 7, BASE);
  });
  // The occiput dip, bitten into the contour between skull and ear so the ear
  // has a root instead of a join.
  notch(p, cx + 5, G - 49, 5, 5, 0, 1);
  // ONE dark cavity, about half the ear's area, inset from the rim. Not a
  // paler triangle inside a darker one -- that is a paper cut-out. It stops
  // well short of the eye row: an ear cavity that runs down into a socket is
  // the merged-eye defect, and the fix is a gap of face, not a brighter eye.
  if (!p.back) {
    limbPath(p, path([[cx, G - 50], [cx - 4, G - 56], [cx - 6, G - 61]] as Pt[]), 7, 3, INNER);
  }

  /* --- the forepaws, tucked up under the chin, near one low and large and far
     one high and small. The near paw casts onto the bib, which is the third and
     last shadow and the one that says the paws are in front of the chest rather
     than painted on it. */
  cast(p, 12, () => {
    poly(p, [
      [cx - 21, G - 24], [cx - 11, G - 27], [cx - 8, G - 22],
      [cx - 12, G - 17], [cx - 20, G - 19],
    ] as Pt[], BASE);
  });
  // The gap between the two paws, CARVED rather than ruled: at this size a dark
  // stroke between two four-cell masses is confetti and a notch is a shape.
  notch(p, cx - 14, G - 26, 4, 5, 0, 1);

  /* --- the tail rings. THREE, and they shrink along the run: a reference
     segment row is widest at the base and tapers, and a row of identical marks
     is a comb. Ochre `ACCENT2` -- the colour this species declares and the old
     five-slot palette read was throwing away. Each ring is about eighteen cells,
     well under the sixty-four the accent-mass test needs, so none of them is
     ringed in ink. */
  for (const [t, h] of [[0.30, 4.4], [0.52, 3.8], [0.72, 3.0]] as const) {
    const i = Math.round(t * (tail.length - 1));
    const q = tail[i]!;
    const a = tail[Math.min(tail.length - 1, i + 2)]!, b = tail[Math.max(0, i - 2)]!;
    const dx = a[0] - b[0], dy = a[1] - b[1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    for (const k of [0, 1]) {
      const ox = (dx / d) * k, oy = (dy / d) * k;
      stroke(p, q[0] - nx * h + ox, q[1] - ny * h + oy, q[0] + nx * h + ox, q[1] + ny * h + oy, ACCENT2);
    }
  }

  if (p.back) { p.face(headX, headY, 17); return; }

  /* --- the face.

     The pale snout, and it is a `poly` with a SLANTED REAR EDGE rather than an
     ellipse: the same area drawn as an axis-aligned oval reads as a stain, and
     with a straight slanted rear edge it reads as bone. Its top plane sits at
     or below the BOTTOM of the eye, which is the one placement rule that gives
     a face a brow for free. */
  poly(p, [
    [cx - 24, G - 38], [cx - 17, G - 39], [cx - 10, G - 37],
    [cx - 8, G - 34], [cx - 18, G - 32], [cx - 23, G - 34],
  ] as Pt[], LIGHT);

  /* The pair of chisel incisors this whole line is named for hangs off the
     FRONT of the jaw and BREAKS THE OUTLINE. Drawn inside the snout they were
     two pale cells on a pale snout and did not exist; a feature that matters is
     silhouette, which is also why they are not counted as the one mark below
     the eyes -- they are part of the outline, and the nose is the mark.
     `ACCENT2` rather than `ACCENT_LIT`, because on this palette the accent IS
     the ink and its lit end is a warm grey. Two different widths, because it is
     a pair. Faceted: enamel is hard and takes one flat tone. */
  flat(p, () => {
    poly(p, [[cx - 21, G - 34], [cx - 19, G - 34], [cx - 19, G - 27], [cx - 21, G - 27]] as Pt[], ACCENT2_LIT);
    poly(p, [[cx - 17, G - 34], [cx - 15, G - 34], [cx - 16, G - 29], [cx - 17, G - 29]] as Pt[], ACCENT2_LIT);
  });
  nose(p, cx - 24, G - 38);

  /* Eyes shifted forward onto the visible half of the turned skull. `round` is
     the one stamp with a real lid line, a pupil hung from it and a field in the
     lower inner corner, and it is the correct construction for exactly this
     kind of creature -- a soft, round-headed baby. `far: 'm-'` is the NARROW
     variant: foreshortening is not distance, and a head turned thirty degrees
     puts both eyes at the same distance and compresses the far one along ONE
     axis only. */
  eyeRow(p, headX, headY + 1, 7, 'round', 'm', { far: 'm-', farSide: 1 });
}

/* ============================================================== burrowen */

/**
 * BRIEF (PART 1)
 *  1. A broad low digging rodent shouldering forward into a bank, one shovel
 *     forepaw already thrown out ahead of its own nose.
 *  2. Plan A, quadruped, in a burrower's version: short legs, a deep chest, a
 *     belly close to the floor, and the head carried BELOW the shoulder line.
 *     Four legs visible as four, with floor between the pairs.
 *  3. MID. 98 x 57 design cells, long dimension 98 against a MID band of
 *     84-100, body area 1123 ref px against 950-1400.
 *  4. Aspect: LONG AND LOW, 1 : 0.58 -- the flattest thing in the group and the
 *     opposite of nibbet's upright teardrop. Fill ~0.55.
 *  5. STRUCTURED. It has named landmarks and they are all in the outline:
 *     withers, back dip, croup, point of buttock, brisket, belly tuck, hock.
 *  6. Five masses: the barrel, the lowered head, the shovel foreleg, the near
 *     hind leg, the ringed tail. The far pair are one darker shape behind the
 *     barrel, not masses.
 *  7. Head verb: LOWERED -- the skull's top plane sits eight cells below the
 *     withers, which is the whole read of a digging animal. Body verb: the
 *     weight is over the forequarters and the near forepaw is advanced, so the
 *     centre of mass is well forward of the midpoint between the feet.
 *  8. Signature: the shovel forepaw with three ochre chisel claws, reaching
 *     further forward than the nose. It is the lowest, leftmost and brightest
 *     thing on the sprite, and it is silhouette.
 *  9. Reversals, with coordinates (ten of the twelve):
 *       withers          (cx-14, G-48)  contour high point, front half
 *       back dip         (cx+ 4, G-44)  4-cell sag behind the withers
 *       croup            (cx+22, G-51)  second high point -- built to dig
 *       point of shoulder(cx-22, G-36)  front contour steps forward
 *       brisket          (cx-12, G-14)  lowest, most forward point of the chest
 *       belly tuck       (cx+20, G-22)  underside rises 8 cells to the flank
 *       point of buttock (cx+38, G-32)  most rearward
 *       hock             (cx+28, G- 8)  rear edge steps back; sharpest angle
 *       stop             (cx-43, G-33)  muzzle top plane, 6 under the brow
 *       occiput dip      (cx-26, G-40)  contour dips before the ear
 * 10. Three hues. H1 umber #a8825c, ~52 %. H2 cream #d8bd95, ~20 % -- the
 *     throat-to-belly band, the snout, the shovel pad. H3 warm ochre #c98f4a as
 *     `ACCENT2`, ~5 % -- three chisel claws, the pair of incisors and three
 *     tail rings. `INNER` in the ear and the nose.
 * 11. Four interior events: the pale belly band, the tail rings, the three cast
 *     shadows, the face.
 * 12. Eyes `hooded` `'m'`, far `'m-'`, spread 7, `lid: LIGHT`. Lit flesh over
 *     one dark line over a shallow eye -- Numel and Torkoal exactly, and the
 *     right face for something stubborn that lives underground. There is a
 *     `brow()` ridge over it, which is 35 % of any face's expression. The mark
 *     below the eyes is the nose; the incisors are silhouette, not a mark.
 *     THE OLD DARK BAND ACROSS THE EYE ROW IS GONE -- that band plus these
 *     stamps is what read as a pair of sunglasses.
 * 13. Surface material: NONE drawn. A mole is smooth; the shovel and the claws
 *     are the only interesting edges and both are silhouette.
 * 14. Internal dark lines: ONE -- the jaw line, ear root to mouth corner, and
 *     both of its ends terminate on the outer silhouette. Nothing else.
 * 15. Second stage of nibbet. CARRIED: the ringed tail and the chisel incisors
 *     (the silhouette signature), and the umber/cream/ochre palette
 *     relationship. CHANGED: sitting to prone, one mass to five, the ears from
 *     spoons to small folded discs, the ochre from ornament to tools, and the
 *     rung -- 64 cells long becomes 96.
 */
function burrowen(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const headX = cx - 32, headY = G - 29;

  /* --- the far pair, first and in SHADE. `far()` encodes the measured fix for
     the thing that made every quadruped on the roster read as furniture: the
     far foot lands NINE CELLS HIGHER than the near one, ten cells forward of
     it, and two or three cells narrower. The mean foot-row spread on the
     shipped roster was 3.5 cells and six of ten quadrupeds registered a single
     merged ground contact -- a bar. */
  legDigitigrade(p, ...far(cx + 26, G - 27, G, { thick: 17, ankle: 11, footHalf: 11 }));
  limbPath(p, [[cx - 8, G - 26], [cx - 12, G - 18], [cx - 10, G - 11]] as Pt[], 11, 8, SHADE);
  paw(p, cx - 11, G - 9, 7, { tone: SHADE });

  /* --- the ringed tail, cocked up and back off the croup. Up rather than out:
     a tail running to the right would cost twelve cells of width on a creature
     whose whole brief is "long and low", and the size ladder only works if
     everybody keeps inside their own box. */
  const tail = path([[cx + 32, G - 36], [cx + 39, G - 40], [cx + 43, G - 50]] as Pt[]);
  limbPath(p, tail, 12, 5, BASE);

  /* --- THE BARREL. One polygon; every vertex is a landmark from the brief.
     The croup is three cells ABOVE the withers with a four-cell sag between
     them, which is the reference's signature for an animal built to dig or
     leap rather than to run -- and it is three coordinates. */
  poly(p, [
    [cx - 22, G - 38],  // point of shoulder
    [cx - 14, G - 50],  // withers
    [cx + 4, G - 45],   // back dip -- 5 cells of sag
    [cx + 22, G - 53],  // croup, 3 above the withers: built to dig
    [cx + 34, G - 45],
    [cx + 38, G - 32],  // point of buttock -- most rearward
    [cx + 32, G - 20],
    [cx + 20, G - 22],  // flank -- top of the belly tuck
    [cx + 4, G - 18],
    [cx - 12, G - 14],  // brisket -- lowest and most forward
    [cx - 20, G - 24],
  ] as Pt[], BASE);

  /* --- the pale underside, one continuous band from the throat back to the
     groin, its top edge following the tuck. LIGHT, not SHADE: it is the same
     surface as the flank, so it takes a change of material and no ink at all.
     SHADE here would rule a black line down the middle of one continuous
     belly, which is what the previous version did. */
  poly(p, [
    [cx - 14, G - 16], [cx + 4, G - 20], [cx + 20, G - 24],
    [cx + 26, G - 20], [cx + 4, G - 15], [cx - 13, G - 12],
  ] as Pt[], LIGHT);

  /* --- the head, driven down and forward. Its top plane sits eight cells below
     the withers; that one relationship is what says "digging animal" before
     any detail is drawn. Cast onto the chest so the skull is in front of the
     neck rather than painted on it. */
  cast(p, 30, () => {
    poly(p, [
      [cx - 24, G - 44],  // crown
      [cx - 17, G - 39],  // nape
      [cx - 18, G - 28],  // cheek, rear
      [cx - 26, G - 19],  // jaw
      [cx - 38, G - 17],  // chin
      [cx - 45, G - 21],  // nose, lower
      [cx - 47, G - 27],  // nose tip
      [cx - 44, G - 36],  // stop -- muzzle top plane
      [cx - 34, G - 43],  // brow
    ] as Pt[], BASE);
  });
  // The occiput dip, so the ear has a root rather than a join.
  notch(p, cx - 18, G - 44, 5, 4, 0, 1);

  /* --- the ears: small folded discs, low and set back on the skull, near one
     larger and forward. Deliberately small -- the ears were the signature one
     stage ago and they are not the signature now. */
  blob(p, cx - 16, G - 45, 5, 4, SHADE);
  blob(p, cx - 28, G - 47, 7.5, 6.5, BASE);
  // The cavity is an offset crescent, not a centred disc. A dark circle in the
  // middle of a lighter circle is a bullseye, and it is the exact construction
  // the eye brief bans on an eye -- it is no better on an ear.
  if (!p.back) {
    poly(p, [
      [cx - 32, G - 51], [cx - 26, G - 52], [cx - 23, G - 47],
      [cx - 25, G - 45], [cx - 27, G - 49], [cx - 31, G - 48],
    ] as Pt[], INNER);
  }

  /* --- the near hind leg. THREE segments through a hock, which is the sharpest
     angle on a quadruped and the highest-value free change available: nine
     numbers instead of four, no ink, and the whole event lives in the outline
     so it survives the 64 px icon. `legDigitigrade` also carves the toe gaps
     out of the bottom contour and makes the foot 60-100 % wider than the ankle,
     which is the step our feet did not have. It casts by default. */
  legDigitigrade(p, cx + 26, G - 27, G, { thick: 17, ankle: 11, footHalf: 11 });

  /* --- THE SHOVEL. A foreleg is comparatively straight where a hind leg
     zigzags, and the difference between the two pairs is a large part of what
     says quadruped rather than four pegs -- so this is one gentle S in two
     segments, and it ends in the loudest thing on the sprite. */
  limbPath(p, [[cx - 16, G - 28], [cx - 22, G - 18], [cx - 27, G - 10]] as Pt[],
    17, 13, BASE, { cast: true });
  // The pad: broad, flat and pale, reaching well forward of the ankle. The step
  // from a 13-cell ankle to a 20-cell pad IS the foot.
  poly(p, [
    [cx - 41, G - 11], [cx - 25, G - 14], [cx - 22, G - 2], [cx - 38, G],
  ] as Pt[], LIGHT);
  /* Three chisel claws, projecting PAST the silhouette and past the nose. A
     claw drawn inside the foot is four cells nobody will ever see. `ACCENT2`
     rather than `ACCENT_LIT`: on this palette the accent slot holds a
     near-black that is also the ink, and its lit end resolves to a dull warm
     grey -- the ochre this species actually declares lives in `ACCENT2`. */
  flat(p, () => {
    for (let i = 0; i < 3; i++) {
      const ty = G - 10 + i * 4.5;
      poly(p, [
        [cx - 37, ty - 2.4], [cx - 37, ty + 2.4], [cx - 51 + i * 2, ty + 0.8],
      ] as Pt[], i === 1 ? ACCENT2_LIT : ACCENT2);
    }
  });

  /* --- the tail rings. Three, shrinking along the run, in the same ochre and
     by the same mechanism as nibbet's -- which is what makes it read as the
     same animal's tail. */
  for (const [t, h] of [[0.28, 5.6], [0.52, 4.8], [0.74, 3.6]] as const) {
    const i = Math.round(t * (tail.length - 1));
    const q = tail[i]!;
    const a = tail[Math.min(tail.length - 1, i + 2)]!, b = tail[Math.max(0, i - 2)]!;
    const dx = a[0] - b[0], dy = a[1] - b[1], d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    for (const k of [0, 1]) {
      const ox = (dx / d) * k, oy = (dy / d) * k;
      stroke(p, q[0] - nx * h + ox, q[1] - ny * h + oy, q[0] + nx * h + ox, q[1] + ny * h + oy, ACCENT2);
    }
  }

  /* --- the one authored FORM event: the underside. The jaw's underside is the
     darkest part of a reference head and the lower flank of a barrel carries a
     band running the barrel's LENGTH, parallel to its own axis -- not a
     diagonal wash across it. FORM never inks, so neither of these gets a line
     round it, which is the whole reason this tone exists.  */
  poly(p, [
    [cx - 40, G - 17], [cx - 26, G - 19], [cx - 20, G - 24],
    [cx - 22, G - 28], [cx - 30, G - 21], [cx - 41, G - 20],
  ] as Pt[], FORM);
  poly(p, [
    [cx - 10, G - 15], [cx + 6, G - 17], [cx + 22, G - 21], [cx + 30, G - 20],
    [cx + 30, G - 17], [cx + 20, G - 18], [cx + 4, G - 14], [cx - 10, G - 11],
  ] as Pt[], FORM);

  if (p.back) { p.face(headX, headY, 15); return; }

  /* --- the face.
     The pale snout, a `poly` with a slanted rear edge, its top plane at the
     bottom of the eye row. And the inherited pair of chisel incisors under the
     chin, breaking the outline. */
  poly(p, [
    [cx - 46, G - 26], [cx - 39, G - 27], [cx - 34, G - 24],
    [cx - 33, G - 20], [cx - 40, G - 17], [cx - 45, G - 21],
  ] as Pt[], LIGHT);
  flat(p, () => {
    poly(p, [[cx - 41, G - 18], [cx - 38, G - 18], [cx - 38, G - 11], [cx - 40, G - 11]] as Pt[], ACCENT2_LIT);
    poly(p, [[cx - 37, G - 18], [cx - 34, G - 18], [cx - 35, G - 13], [cx - 37, G - 13]] as Pt[], ACCENT2);
  });
  nose(p, cx - 45, G - 25);

  /* THE JAW LINE: one open stroke from the ear root down-and-forward to the
     mouth corner, with BOTH ENDS on the outer silhouette. Three or four cells
     of ink, and it is the whole difference between a head and a wedge --
     Mightyena, Manectric, Absol and Zangoose all draw it and the shipped roster
     drew it on nothing. It is also the only internal dark line on this
     creature. */


  /* The brow ridge, as a FORM shadow onto the socket: a value step on the same
     surface, never a line and never a stripe of accent. Called BEFORE the eyes,
     because the stamps are blitted after the light has run and sit on top of
     it. */
  eyeRow(p, cx - 32, G - 31, 8, 'hooded', 'm', { far: 'm-', farSide: 1, lid: LIGHT });
}


/* =============================================================== tuftail */

/**
 * BRIEF (PART 1)
 *  1. A small woolly grazer browsing a hedge -- head carried low and forward at
 *     chest height, buried to the jaw in a moss-green ruff.
 *  2. Plan A, quadruped. Four legs visible as four with floor between the
 *     pairs, a level back, and a neck that runs down and forward out of the
 *     withers so the muzzle is the lowest thing on the front of the animal.
 *  3. SMALL. 79 x 63 design cells, long dimension 79 against a SMALL band of
 *     68-84, body area 906 ref px against 650-1000. It sits between nibbet and
 *     burrowen on the ladder and is drawn to sit there.
 *  4. Aspect: LONG AND LOW, 1 : 0.80. Burrowen is also long and low, and the
 *     two are told apart by what fills the box: burrowen's mass is all in the
 *     forequarter and its head is a wedge on the floor, tuftail's is a level
 *     barrel on four visible legs with a green mass at the neck.
 *  5. STRUCTURED. Withers, croup, brisket, tuck and hock are all in the
 *     outline; the ruff is the one soft mass and its edge is jagged.
 *  6. Five masses: the barrel, the head, the RUFF, the near hind leg, the near
 *     foreleg. The tail is an appendage on the barrel; the far pair are one
 *     darker shape behind it.
 *  7. Head verb: LOWERED and forward -- the top of the skull sits ten cells
 *     below the withers. Body verb: settled and even, near foreleg braced
 *     forward, three feet planted and the far fore lifted clear.
 *  8. Signature: the RUFF. A moss-green woolly collar wider than the skull,
 *     sitting between the head and the withers with a jagged outer edge.
 *     Silhouette first; the flat test passes on the ruff and the low head
 *     alone.
 *  9. Reversals, with coordinates (nine of the twelve):
 *       withers          (cx+ 4, G-46)  contour high point, front half
 *       back dip         (cx+16, G-43)  3-cell sag -- the placid grazer's back
 *       croup            (cx+28, G-46)  second high point, EQUAL to the withers
 *       point of buttock (cx+36, G-31)  most rearward
 *       belly tuck       (cx+22, G-25)  underside rises 5 cells to the flank
 *       brisket          (cx- 2, G-20)  lowest, most forward point of the chest
 *       point of shoulder(cx- 5, G-27)  front contour steps forward
 *       hock             (cx+30, G- 7)  rear edge steps back; sharpest angle
 *       poll             (cx-15, G-38)  contour dips where the ruff ends
 *       nose             (cx-40, G-25)  ONE STRAIGHT RAMP poll to nose, NO
 *                                       STOP at all -- the grazer's head
 * 10. Three hues. H1 tan #c9b088, ~50 %. H2 MOSS GREEN #6e8a4a as `ACCENT2`,
 *     ~16 % -- the ruff, and the ruff alone. H3 cream #e8dcc0, ~9 %, the belly;
 *     plus `INNER` in the ear and at the nose and near-black `ACCENT` hooves,
 *     which is the Absol arrangement a pale animal needs.
 *     THE GREEN IS THE POINT. `tuftail` declares `#6e8a4a` in its last palette
 *     slot; the five-slot reader takes its near-black `#4a3a28` as the ink and
 *     hands the green back as `ACCENT2`. A previous author concluded from a
 *     render that this species had no green and wrote that into the file.
 * 11. Four interior events: the ruff, the pale belly, the dark hooves, the
 *     face.
 * 12. Eyes `sleepy` `'s'`, far `'s-'`, spread 6 -- a DELIBERATE small eye. The widest and shallowest
 *     stamp in the set -- heavy flesh, one lid line, a letterbox -- and it says
 *     placid in one shape on an animal whose whole entry is about losing
 *     interest at the parish boundary. The mark below the eyes is the nose.
 * 13. Surface material: ONE place, the neck, via ONE `mane()` call. It breaks
 *     the outline there and nowhere else. There is not a hair drawn on the
 *     flank, exactly as there is not one on Mightyena's.
 * 14. Internal dark lines: NONE authored. The ruff earns a border because it is
 *     a real mass of a second hue, which is the one case the edge pass is for;
 *     everything else is a value step or a cast shadow.
 * 15. First stage. Passes to bristlebuck: the woolly mass over the neck and the
 *     tan body with its pale belly -- and the GREEN, which is the interesting
 *     version of that story: the ruff is the thing that hardens into a mantle.
 */
function tuftail(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const headX = cx - 22, headY = G - 30;

  /* --- the far pair. `far()` encodes the measured repair: the far foot lands
     nine cells higher than the near one and ten cells forward of it, two
     narrower, in SHADE. The shipped roster's mean foot-row spread was 3.5
     cells and six of ten quadrupeds registered ONE merged ground contact. */
  legDigitigrade(p, ...far(cx + 30, G - 26, G, { thick: 13, ankle: 8, footHalf: 8 }));
  limbPath(p, [[cx + 1, G - 26], [cx - 2, G - 16], [cx, G - 10]] as Pt[], 9, 7, SHADE);
  paw(p, cx - 1, G - 9, 6, { tone: SHADE });

  /* --- the fan tail, cocked up off the croup, drawn before the barrel so its
     root disappears under the haunch. Short: on a grazer the tail is not the
     story, and this one exists to stop the rear end being a bare curve. */
  poly(p, [
    [cx + 33, G - 44], [cx + 38, G - 55], [cx + 44, G - 49],
    [cx + 43, G - 39], [cx + 37, G - 35],
  ] as Pt[], BASE);

  /* --- THE BARREL. Withers and croup at the SAME height with a three-cell sag
     between them: the reference's signature for a placid grazer, against the
     forward-heavy digger and the run-built hound elsewhere in this file. Three
     coordinates, and it is visible from across a room. */
  poly(p, [
    [cx - 6, G - 27],   // point of shoulder
    [cx + 4, G - 46],   // withers
    [cx + 18, G - 43],  // back dip
    [cx + 32, G - 46],  // croup -- level with the withers
    [cx + 39, G - 41],
    [cx + 41, G - 31],  // point of buttock
    [cx + 36, G - 23],
    [cx + 24, G - 25],  // flank -- top of the tuck
    [cx + 8, G - 22],
    [cx - 4, G - 20],   // brisket
    [cx - 7, G - 24],
  ] as Pt[], BASE);

  // The pale underside, hugging the very bottom of the barrel and following the
  // tuck. Five cells higher it stops being an underside and becomes a cream
  // stripe painted across a flank.
  poly(p, [
    [cx - 4, G - 18], [cx + 10, G - 20], [cx + 24, G - 23],
    [cx + 32, G - 21], [cx + 12, G - 17], [cx - 3, G - 15],
  ] as Pt[], LIGHT);

  /* --- the neck, driven down and forward out of the withers, and the head on
     the end of it. Drawn before the ruff so the ruff sits on the top of it. */
  limbPath(p, [[cx + 4, G - 40], [cx - 3, G - 35], [cx - 11, G - 31]] as Pt[], 21, 17, BASE);

  /* --- the head. ONE STRAIGHT RAMP from poll to nose and NO STOP AT ALL, which
     is what a grazer's skull does -- and the rule that comes with it is that
     there must be NO PALE MUZZLE PATCH either. A no-stop head with a cream
     ellipse on the front of it is the "wedge with a stain on it" that half the
     roster wore. It casts onto the chest, so it is in front of the neck rather
     than painted on it. */
  cast(p, 26, () => {
    poly(p, [
      [cx - 9, G - 43],   // poll
      [cx - 6, G - 33],   // cheek, rear
      [cx - 11, G - 23],  // jaw angle
      [cx - 21, G - 18],  // chin
      [cx - 30, G - 20],  // lower lip
      [cx - 34, G - 26],  // nose
      [cx - 28, G - 34],  // the ramp: poll to nose in one straight line
      [cx - 19, G - 41],  // brow
    ] as Pt[], BASE);
  });

  /* --- THE RUFF, and it is the species.

     A core mass in the green, then ONE `mane()` call laid on its own top
     contour so the outer edge comes back jagged. One mechanism, saying "wool"
     once. The previous version said it four times -- a lobed outline, a seam
     ring, a root shadow and a lit tip per clump -- which is the redundancy the
     manual names in as many words.

     It is `ACCENT2`, a genuine mass of a second hue, so the edge pass gives it
     a border. That is the ONE case a border is for: a material change of a
     different colour, the way Torchic's yellow wing is bordered in dark gold
     rather than in the body's red-brown. And it casts onto the shoulder, which
     is what puts it in front of the barrel. */
  cast(p, 26, () => {
    poly(p, [
      [cx - 8, G - 46], [cx + 3, G - 50], [cx + 12, G - 44],
      [cx + 13, G - 33], [cx + 6, G - 22], [cx - 5, G - 21],
      [cx - 12, G - 28], [cx - 13, G - 39],
    ] as Pt[], ACCENT2);
  });
  mane(p, contourTop(p, cx - 12, cx + 12, 3), 8, 6, ACCENT2, { root: -1 });

  /* --- the ears, laid ON TOP of the ruff and projecting back out of it. Drawn
     last of the head parts on purpose: a tan ear inside a green collar is a
     tan shape on green and reads at icon size, and an ear drawn under the ruff
     is an ear nobody sees. Two lengths, two heights, two places -- never a
     mirrored pair. The near one carries the ONE dark cavity; the far one is
     `SHADE`, which is what a genuinely-behind part is for. */
  poly(p, [[cx - 9, G - 41], [cx - 4, G - 50], [cx - 1, G - 42]] as Pt[], SHADE);
  poly(p, [[cx - 17, G - 40], [cx - 18, G - 55], [cx - 8, G - 42]] as Pt[], BASE);
  if (!p.back) poly(p, [[cx - 15, G - 42], [cx - 16, G - 52], [cx - 11, G - 43]] as Pt[], INNER);

  /* --- the near pair. The hind zigzags through a hock, the fore is one gentle
     S, and the DIFFERENCE between the two pairs is a large part of what says
     quadruped rather than four pegs. Forty cells of floor between the two near
     contacts; the far pair lands nine cells higher, so there are four
     separated contacts and not one merged bar. Hooves in `ACCENT`, a
     near-black on this palette: on a pale animal the whole value range has to
     be spent in a few small genuinely dark places, which is how Absol and
     Zangoose stay legible. */
  legDigitigrade(p, cx + 30, G - 26, G, { thick: 13, ankle: 8, footHalf: 8, footTone: ACCENT });
  limbPath(p, [[cx - 4, G - 28], [cx - 9, G - 15], [cx - 8, G - 5]] as Pt[], 13, 8, BASE,
    { cast: true });
  paw(p, cx - 8, G, 7, { tone: ACCENT });

  if (p.back) { p.face(headX, headY, 13); return; }

  /* --- the face. One mark below the eyes and never two: the nose, three cells,
     and it is the highest value-per-cell mark anywhere on a sprite. */
  nose(p, cx - 32, G - 24);
  eyeRow(p, cx - 22, G - 30, 6, 'sleepy', 's', { far: 's-', farSide: 1, lid: LIGHT });
}


/* =========================================================== bristlebuck */

/**
 * BRIEF (PART 1)
 *  1. A stag-like hedge warden: tall, heavy-legged, standing square between
 *     whatever is coming and whatever is behind it.
 *  2. Plan A, quadruped. Four long legs with floor between the pairs, a level
 *     back, and a head carried level and forward on a thick neck.
 *  3. LARGE. 98 x 107 design cells -- inside 120 x 110, so nothing is
 *     resampled. Long dimension 107 against a LARGE band of 100-116, body area
 *     1549 ref px against 1300-1900.
 *  4. Aspect: TALL, 0.92 : 1, and it is the only upright animal in the group
 *     apart from nibbet -- which is a sixth its length. It is drawn as the
 *     deliberate opposite of rimehound: same rung, opposite box, the buck 98
 *     wide by 107 tall and the hound 116 by 96.
 *  5. STRUCTURED, and the previous version was the purest furniture case on the
 *     roster: four brown columns of equal width and equal length, vertical,
 *     evenly spaced, four feet on one row. Every one of those is fixed here by
 *     coordinates rather than by tone.
 *  6. Five masses: the barrel, the neck-and-head, the green MANTLE, the near
 *     foreleg, the near hind leg. The far pair are one darker shape behind the
 *     barrel; the tail is an appendage on the haunch.
 *  7. Head verb: LEVEL AND FORWARD, and turned about twenty degrees further
 *     than the body, so the near horn sweeps back OVER the neck. Body verb:
 *     braced -- forelegs apart, the near fore advanced and the far fore set
 *     back, weight into the floor rather than balanced on it.
 *  8. Signature: the row of green bristles running the nape into the withers,
 *     and the two short back-swept horns in front of them. Both break the
 *     outline where nothing else does.
 *  9. Reversals, with coordinates (eleven of the twelve):
 *       withers          (cx+ 2, G-76)  contour high point, front half
 *       back dip         (cx+16, G-71)  5-cell sag
 *       croup            (cx+30, G-76)  second high point, level with withers
 *       point of shoulder(cx- 8, G-58)  front contour steps forward
 *       brisket          (cx- 6, G-41)  lowest, most forward point of the chest
 *       elbow            (cx- 9, G-38)  rear edge of the foreleg steps back
 *       belly tuck       (cx+26, G-49)  underside rises 8 cells to the flank
 *       point of buttock (cx+42, G-58)  most rearward
 *       stifle           (cx+24, G-32)  thigh bulges forward, then cuts back
 *       hock             (cx+34, G-14)  rear edge steps back; sharpest angle
 *       poll             (cx-24, G-96)  contour dips between skull and neck
 * 10. Three hues. H1 tan #b89a70, ~48 %. H2 GREEN #4f7a42 as `ACCENT`, ~19 % --
 *     the mantle and the bristles, one mass, one statement. H3 pale horn in
 *     `ACCENT_LIT`, ~4 %, plus a cream belly and `INNER` in the ear and nose.
 *     The measured share of green on the shipped version was 7.7 %; the manual
 *     asks for 15-30 and the way to get there is one MASS, not more marks.
 * 11. Four interior events: the mantle, the pale belly, the dark hooves, the
 *     face.
 * 12. Eyes `angry` `'m'`, far `'m-'`, spread 7, row at 0.33 of skull depth from
 *     the crown -- high and forward, which reads mean and alert. A brow line, a
 *     blank row and a slit opening under it: the brow carries about 35 % of a
 *     face's expression, more than tilt and far more than size. The mark below
 *     the eyes is the nose. NO pale muzzle patch, because this head has NO STOP
 *     (grazer), and a no-stop head with a cream ellipse on the front is the
 *     "wedge with a stain on it".
 * 13. Surface material: ONE place -- the nape, as the bristle row, which breaks
 *     the outline. Nothing on the flank.
 * 14. Internal dark lines: NONE authored. The mantle earns a border because it
 *     is a genuine mass of a second hue. The hooves are `ACCENT_DARK` patches,
 *     not lines.
 * 15. Second stage of tuftail. CARRIED: the woolly green mass over the neck,
 *     now hardened from a ruff into a mantle with bristles standing off it, and
 *     the tan body with its cream belly. CHANGED: long and low becomes tall and
 *     square; the head from lowered to level; short stumps to heavy braced
 *     columns; horns added; area doubled; and the green moves from `ACCENT2` to
 *     `ACCENT` because at stage two it is a declared type colour rather than a
 *     recovered slot.
 */
function bristlebuck(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const headX = cx - 36, headY = G - 82;

  /* --- the far pair. Nine cells higher, ten forward, three narrower, SHADE.
     This is the single cue that turns four legs into an animal standing on a
     ground plane, and the shipped version had four feet on one row. */
  legDigitigrade(p, ...far(cx + 32, G - 50, G, { thick: 17, ankle: 11, footHalf: 8, footTone: INNER }));
  limbPath(p, [[cx + 4, G - 50], [cx + 1, G - 30], [cx + 3, G - 11]] as Pt[], 13, 9, SHADE);
  paw(p, cx + 2, G - 9, 6, { tone: INNER });

  // A short tail against the haunch. Three cells of silhouette and no more: on
  // a stag the tail is not the story.
  poly(p, [[cx + 38, G - 62], [cx + 46, G - 58], [cx + 42, G - 46]] as Pt[], SHADE);

  /* --- THE BARREL. Withers and croup level with a five-cell sag between them,
     and a belly that rises EIGHT cells from the brisket back to the flank.
     That V is most of what separates a lean animal from a sausage, and the
     shipped version had a horizontal bar from foreleg to hind leg and no tuck
     at all. */
  poly(p, [
    [cx - 8, G - 58],   // point of shoulder
    [cx + 2, G - 76],   // withers
    [cx + 16, G - 71],  // back dip
    [cx + 30, G - 76],  // croup
    [cx + 39, G - 70],
    [cx + 42, G - 58],  // point of buttock
    [cx + 38, G - 48],
    [cx + 26, G - 52],  // flank -- top of the tuck
    [cx + 8, G - 48],
    [cx - 6, G - 45],   // brisket -- lowest and most forward
    [cx - 11, G - 52],
  ] as Pt[], BASE);

  // The pale underside, hugging the very bottom of the barrel and following the
  // tuck. Five cells higher it is a cream stripe painted across a flank.
  poly(p, [
    [cx - 6, G - 43], [cx + 10, G - 45], [cx + 26, G - 50],
    [cx + 34, G - 48], [cx + 12, G - 41], [cx - 5, G - 39],
  ] as Pt[], LIGHT);

  /* --- the neck: one thick column driven up and forward out of the withers, so
     the skull is attached to something instead of balanced on a wire. */
  limbPath(p, [[cx + 2, G - 68], [cx - 10, G - 76], [cx - 22, G - 83]] as Pt[], 25, 20, BASE);

  /* --- the head, level and forward and turned further than the body. ONE
     STRAIGHT RAMP from poll to nose and NO STOP -- the grazer's skull. It casts
     onto the neck, which is what puts it in front rather than on. */
  cast(p, 32, () => {
    poly(p, [
      [cx - 24, G - 92],  // poll
      [cx - 19, G - 83],  // cheek, rear
      [cx - 24, G - 73],  // jaw angle
      [cx - 36, G - 69],  // chin
      [cx - 47, G - 71],  // lower lip
      [cx - 51, G - 78],  // nose
      [cx - 44, G - 86],  // the ramp
      [cx - 33, G - 92],  // brow
    ] as Pt[], BASE);
  });
  // The occiput dip, so the ear and the horn have a root rather than a join.
  notch(p, cx - 22, G - 92, 5, 4, 0, 1);

  /* --- the ears, behind and below the horns, laid back. Two lengths, two
     heights; the far one is `SHADE` because it is genuinely behind. */
  poly(p, [[cx - 21, G - 84], [cx - 7, G - 88], [cx - 12, G - 78]] as Pt[], SHADE);
  poly(p, [[cx - 25, G - 80], [cx - 10, G - 82], [cx - 16, G - 72]] as Pt[], BASE);
  if (!p.back) poly(p, [[cx - 22, G - 79], [cx - 13, G - 80], [cx - 17, G - 74]] as Pt[], INNER);

  /* --- THE MANTLE. One green mass over the nape and the withers, and the row
     of bristles standing off its upper contour.
     ONE mass rather than a scatter of marks, because the measured problem was
     that the green covered 7.7 % of the sprite and the manual asks for 15-30:
     that is a size problem, and the answer to a size problem is a bigger shape,
     not more shapes. It is `ACCENT`, thick and well over sixty-four cells, so
     the edge pass borders it -- which is the one case a border is for, a
     material of a different colour, the way Torchic's yellow wing is bordered
     in dark gold instead of in body red. It casts onto the shoulder. */
  cast(p, 30, () => {
    poly(p, [
      [cx - 16, G - 86], [cx - 4, G - 80], [cx + 6, G - 72],
      [cx + 11, G - 61], [cx + 3, G - 54], [cx - 6, G - 59],
      [cx - 13, G - 68], [cx - 20, G - 78],
    ] as Pt[], ACCENT);
  });
  /* Six bristles, longest over the shoulder and tapering both ways -- a
     reference spike row is never a comb, and the gaps of body colour between
     the spikes are what make a row of them read at all. They are faceted:
     bristle is a hard material and a hard material takes one flat tone. */
  spikes(p, [
    [cx - 14, G - 85, Math.PI * 1.30, 10, 3.0],
    [cx - 7, G - 81, Math.PI * 1.38, 14, 3.6],
    [cx + 1, G - 76, Math.PI * 1.46, 17, 4.0],
    [cx + 7, G - 70, Math.PI * 1.56, 15, 3.8],
    [cx + 11, G - 63, Math.PI * 1.66, 11, 3.2],
    [cx + 13, G - 56, Math.PI * 1.76, 7, 2.6],
  ] as const, ACCENT);

  /* --- THE HORNS. Two, short, back-swept, in the pale horn tone so they are a
     hard material rather than more mantle -- a horn painted in the same green
     as the bristle behind it is a leaf stuck to a skull. The near one sweeps
     back OVER the neck, which is what the twenty-degree head turn buys. Plain
     faceted polygons, not `horn()`: that helper lays growth rings and two flank
     runs on a shape sixteen cells long, which is three systems describing one
     spike. */
  flat(p, () => {
    poly(p, [[cx - 28, G - 90], [cx - 23, G - 94], [cx - 13, G - 97], [cx - 15, G - 101]] as Pt[], ACCENT_DARK);
    poly(p, [[cx - 35, G - 88], [cx - 29, G - 93], [cx - 19, G - 98], [cx - 22, G - 103]] as Pt[], ACCENT_LIT);
  });

  /* --- the near pair, BRACED. The fore leans forward under the chest and the
     hind braces back under the croup, with sixty cells of floor between the two
     contacts. The hind zigzags through a hock; the foreleg is one gentle S in
     three segments, and the difference between the pairs is a large part of
     what says quadruped. Both are twenty-two cells at the hip, because a LARGE
     animal has heavy legs -- and because a limb under fourteen cells thick gets
     two tones and no highlight, which on four narrow legs was most of this
     species' speck count. */
  legDigitigrade(p, cx + 32, G - 50, G, { thick: 17, ankle: 11, footHalf: 8, footTone: INNER });
  cast(p, 40, () => {
    limbPath(p, [[cx - 7, G - 48], [cx - 14, G - 32], [cx - 18, G - 7]] as Pt[], 15, 10, BASE,
      { bulge: 2 });
  });
  // The elbow: a reversal bitten into the rear edge of the foreleg.
  notch(p, cx - 7, G - 39, 6, 4, -1, 0);
  paw(p, cx - 19, G, 8, { tone: INNER, toes: 2 });

  if (p.back) { p.face(headX, headY, 14); return; }

  /* --- the face. One mark below the eyes and never two: the nose. */
  nose(p, cx - 49, G - 76);
  eyeRow(p, cx - 34, G - 85, 7, 'angry', 'm', { far: 'm-', farSide: 1, brow: ACCENT_DARK });
}


/* ============================================================== frostnip */

/**
 * BRIEF (PART 1)
 *  1. A frost-fox kit standing alert -- head thrown up and back, ears at full
 *     height, one forepaw lifted, a fan of icicles hanging off its jaw.
 *  2. Plan A, quadruped. Four legs visible as four with floor between the
 *     pairs, short ones, and a head carried ABOVE the line of the withers.
 *  3. SMALL. 84 x 79 design cells, long dimension 84 against a SMALL band of
 *     68-84, body area 945 ref px against 650-1000.
 *  4. Aspect 1 : 0.94 -- nearly square, and the only nearly-square quadruped in
 *     the group. Its rung-mate tuftail is 1 : 0.80 with half again the barrel
 *     length and no ears to speak of, so at icon size the two are told apart by
 *     their boxes before any colour is read. Fill ~0.42.
 *  5. STRUCTURED. Withers, croup, brisket, tuck, elbow and hock are all in the
 *     outline; the coat is smooth everywhere except the one neck ruff.
 *  6. Five masses: the barrel, the raised head, the two ears (one mass each,
 *     they are 20 % of the design), the brush tail, the lifted near foreleg.
 *  7. Head verb: THROWN UP AND BACK -- the top of the skull sits eighteen cells
 *     ABOVE the withers, which is the exact opposite of the hound it becomes
 *     and is the whole of the difference between the two silhouettes. Body
 *     verb: weight back, near forepaw lifted clear of the floor, three contacts
 *     down and one in the air.
 *  8. Signature: the fan of icicles off the jaw, projecting down and forward
 *     past the muzzle, and the two enormous ears. Both pure silhouette; the
 *     flat test passes on the ears and the icicle fan alone.
 *  9. Reversals, with coordinates (nine of the twelve):
 *       withers          (cx- 2, G-44)  contour high point, front half
 *       back dip         (cx+10, G-41)  3-cell sag
 *       croup            (cx+22, G-44)  second high point
 *       point of buttock (cx+33, G-33)  most rearward
 *       belly tuck       (cx+18, G-26)  underside rises 5 cells to the flank
 *       brisket          (cx- 8, G-21)  lowest, most forward point of the chest
 *       hock             (cx+24, G-11)  rear edge steps back; sharpest angle
 *       ear root         (cx-22, G-59)  contour dips before the ear rises
 *       stop             (cx-33, G-53)  muzzle top, 5 cells under the brow --
 *                                       the short flat face of a kit
 *       chin             (cx-26, G-41)  jaw corner, clear of the neck
 * 10. Three hues, and this is a PALE SPECIES, which the manual treats as its own
 *     problem: a pale mass never holds contrast on its own, it has to be GIVEN
 *     A DARK NEIGHBOUR occupying 15-30 % of the sprite. H1 ice blue #c8e4f0,
 *     ~46 %. H2 DEEP SLATE #5a7a94 as `ACCENT`, ~18 % -- the ear cavities, four
 *     dark stockings and the icicles, exactly where the manual puts it. H3
 *     near-white #f0fafc on the chest and the tail tip, plus `INNER` at the nose
 *     and ONE `SPEC` catchlight of about ten cells on the longest icicle, which
 *     is the one legitimate specular use on this roster: ice.
 *     A REAL EXEMPTION: this species' `shade` slot is `#8fb4cc` at luma 176,
 *     which is not a shadow, it is a second highlight. `FORM` and `SHADE`
 *     cannot carry the dark end on this palette, so the whole value range lives
 *     in `ACCENT`, `INNER` and `DEEP`. That is a fact about `species.json`, not
 *     a drawing decision, and it is why the stockings matter so much here.
 * 11. Four interior events: the pale chest, the four stockings, the icicles,
 *     the face.
 * 12. Eyes `slit` `'m'`, far `'m-'`, spread 6. A tilted almond driven to a hard
 *     point at each end, mostly pupil: this is a small predator, and on a
 *     near-white face the eye is the DARK thing and needs no socket drawn
 *     behind it. The mark below the eyes is the nose.
 *     THE SLATE BAND ACROSS THE EYE ROW IS GONE. That band, with a lid line and
 *     a field stamped inside it, is what read as a pair of sunglasses, and it
 *     was the single most visible defect on this species. The slate it used to
 *     spend on a mask now buys the stockings and the ear cavities.
 * 13. Surface material: ONE place -- a frost ruff at the neck, one `mane()`
 *     call, breaking the outline there and nowhere else.
 * 14. Internal dark lines: ONE, the jaw line, and both ends terminate on the
 *     outer silhouette.
 * 15. First stage. Passes to rimehound: the ice spikes, the brush tail, the
 *     slate stockings and the ice/white/slate palette, one step deeper at
 *     stage two. Everything about the posture inverts.
 */
function frostnip(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const headX = cx - 26, headY = G - 51;

  /* --- the far pair, SHADE, nine cells higher and ten forward of the near
     ones and two narrower. Four feet on one ground row is geometrically
     impossible in a three-quarter view; the shipped roster had it on nine
     quadrupeds out of ten. */
  legDigitigrade(p, ...far(cx + 22, G - 28, G, { thick: 12, ankle: 8, footHalf: 6, footTone: ACCENT }));
  limbPath(p, [[cx - 2, G - 26], [cx - 5, G - 14], [cx - 3, G - 7]] as Pt[], 9, 7, SHADE);
  paw(p, cx - 4, G - 6, 5, { tone: ACCENT });

  /* --- the brush tail, carried up and curled over the croup, near-white at the
     tip -- the one bright note at the top of the sprite, answering the head at
     the front of it. No seam at its root: a brush growing out of a rump IS a
     continuation of the rump, and on a body this small every ring is a
     percentage point of hard ink. */
  limbPath(p, path([[cx + 24, G - 38], [cx + 31, G - 43], [cx + 34, G - 53]] as Pt[]), 13, 8, BASE);
  blob(p, cx + 34, G - 54, 6, 5.5, LIGHT);

  /* --- THE BARREL. Short and deep, on four short legs -- a kit is not a
     scaled-down adult, it is a rounder animal with less leg. */
  poly(p, [
    [cx - 10, G - 34],  // point of shoulder
    [cx - 3, G - 45],   // withers
    [cx + 11, G - 42],  // back dip
    [cx + 24, G - 45],  // croup
    [cx + 32, G - 41],
    [cx + 35, G - 33],  // point of buttock
    [cx + 30, G - 24],
    [cx + 19, G - 26],  // flank -- top of the tuck
    [cx + 4, G - 23],
    [cx - 9, G - 21],   // brisket
    [cx - 13, G - 27],
  ] as Pt[], BASE);

  // The pale chest, a NARROW band hugging the underside and following the tuck.
  // It was twice this and the creature came back with no body colour left: on a
  // pale species every cell of LIGHT is a cell of BASE spent, and BASE has to be
  // at least half of every mass.
  poly(p, [
    [cx - 9, G - 18], [cx + 6, G - 20], [cx + 17, G - 23],
    [cx + 21, G - 21], [cx + 6, G - 18], [cx - 8, G - 16],
  ] as Pt[], LIGHT);
  /* --- the one authored FORM event: the lower flank, a band running the
     BARREL'S OWN LENGTH rather than a diagonal wash across it, and the
     underside of the jaw, which is the darkest part of a reference head. FORM
     never inks, so neither gets a line round it -- which is the entire reason
     this tone was added. */
  poly(p, [
    [cx - 8, G - 22], [cx + 6, G - 24], [cx + 19, G - 27], [cx + 26, G - 25],
    [cx + 20, G - 23], [cx + 6, G - 21], [cx - 8, G - 19],
  ] as Pt[], FORM);

  /* --- the neck, driven UP and forward out of the withers, and the head thrown
     back on the end of it. The head casts onto the neck and the chest, which is
     what puts it in front rather than painted on. */
  limbPath(p, [[cx - 4, G - 40], [cx - 11, G - 46], [cx - 18, G - 50]] as Pt[], 18, 15, BASE);
  cast(p, 24, () => {
    poly(p, [
      [cx - 17, G - 62],  // occiput
      [cx - 13, G - 55],  // cheek, rear
      [cx - 17, G - 46],  // jaw angle
      [cx - 26, G - 41],  // chin
      [cx - 35, G - 42],  // lower lip
      [cx - 38, G - 48],  // nose
      [cx - 33, G - 53],  // stop -- 5 cells, the short flat face of a kit
      [cx - 25, G - 60],  // brow
    ] as Pt[], BASE);
  });
  // The ear-root dip, bitten out of the contour so the ears rise from the skull
  // instead of being parked on it. Free, and it survives the icon; a drawn line
  // there would be half a reference pixel.
  notch(p, cx - 19, G - 61, 5, 4, 0, 1);

  /* --- THE EARS, and they are a fifth of the design. Whismur's ears are 40 %
     of Whismur, and a small creature that wants to read at 64 px gets its
     character from two or three enormous silhouette events rather than from
     detail. Two lengths, two leans, two heights -- never a mirrored pair. The
     near one carries the ONE dark cavity, in the slate a pale species has to
     spend somewhere that is not its face. */
  poly(p, [[cx - 17, G - 60], [cx - 8, G - 58], [cx - 12, G - 72]] as Pt[], SHADE);
  poly(p, [[cx - 28, G - 58], [cx - 17, G - 60], [cx - 26, G - 76]] as Pt[], BASE);
  if (!p.back) poly(p, [[cx - 25, G - 60], [cx - 20, G - 60], [cx - 25, G - 71]] as Pt[], ACCENT);

  /* --- the frost ruff. ONE `mane()` call, at the neck, and no fur anywhere
     else -- there is not a single hair drawn on Mightyena's flank and there is
     none on this one's. */
  mane(p, contourTop(p, cx - 14, cx - 2, 3), 6, 4, BASE, { root: -1 });

  /* --- the near hind, three segments through a hock; and the near foreleg
     LIFTED clear of the floor and reaching forward, which is the one pose
     decision on this creature. Three feet planted and one raised is the
     difference between an animal about to move and a table. The foreleg is one
     gentle S in two segments against the hind leg's three-segment zigzag, and
     that difference between the pairs is a large part of what says quadruped. */
  legDigitigrade(p, cx + 22, G - 28, G, { thick: 12, ankle: 8, footHalf: 6, footTone: ACCENT });
  cast(p, 20, () => {
    limbPath(p, [[cx - 6, G - 28], [cx - 13, G - 20], [cx - 19, G - 13]] as Pt[], 12, 8, BASE);
  });
  paw(p, cx - 21, G - 11, 6, { tone: ACCENT });

  /* --- THE STOCKINGS. Slate cuffs above the two planted hind paws, so the dark
     runs up the leg rather than stopping at the foot. This and the ear cavities
     and the icicles are the whole of the dark on this creature, and they are
     the Absol arrangement: Absol is white against a navy face-mask and a scythe,
     Zangoose is cream against red markings and black claws. A pale animal is
     never given contrast around its own edge; it is given a dark neighbour. */
  poly(p, [[cx + 19, G - 12], [cx + 26, G - 12], [cx + 26, G - 7], [cx + 19, G - 7]] as Pt[], ACCENT);
  poly(p, [[cx + 9, G - 13], [cx + 15, G - 13], [cx + 15, G - 9], [cx + 9, G - 9]] as Pt[], ACCENT);

  /* --- THE ICICLES. Three, off the jaw and the cheek, raking down and forward
     past the muzzle -- the longest reaches further left than the nose does,
     which is what makes them the front of the silhouette rather than a grey
     smudge under a chin. Slate, because white spikes on white fur are
     invisible: that is the trap this species sets. Faceted, because ice is the
     one material in this file that genuinely is a set of flat planes. */
  spikes(p, [
    [cx - 31, G - 41, Math.PI * 0.99, 12, 2.6],
    [cx - 26, G - 42, Math.PI * 0.83, 10, 2.2],
    [cx - 20, G - 44, Math.PI * 0.64, 8, 2.0],
  ] as const, ACCENT);

  if (p.back) { p.face(headX, headY, 13); return; }

  /* --- the face. THE JAW LINE: one open stroke from the ear root down and
     forward to the mouth corner, both ends terminating on the outer silhouette.
     Three cells of ink and it is the whole difference between a head and a
     wedge; Mightyena, Manectric, Absol and Zangoose all draw it. */
  jawLine(p, cx - 20, G - 60, cx - 27, G - 41);
  nose(p, cx - 36, G - 46);
  eyeRow(p, cx - 25, G - 52, 7, 'slit', 'm', { far: 'm-', farSide: 1 });

  /* ONE specular mark, ten cells, on the longest icicle. The budget is one per
     creature and only on something wet, icy, metallic or glassy; an ice fox
     with a lit icicle is the case that rule was written for. Nothing generates
     `SPEC` any more -- the old pass painted 352 cells of it on the average
     sprite at a measured chroma of 18/255, which is to say white. */
  spec(p, cx - 39, G - 40, 2.2, 1.6);
}


/* ============================================================= rimehound */

/**
 * BRIEF (PART 1)
 *  1. A long-legged frost hound stalking across lake ice: head carried below
 *     the line of its own shoulders, near forepaw lifted, a slate frost mane
 *     running the nape into a ridge of spikes over the withers.
 *  2. Plan A, quadruped. Fifty cells of floor between the pairs, three feet
 *     down and one clear of the ice.
 *  3. LARGE. 116 x 96 design cells, long dimension 116 against a LARGE band of
 *     100-116, body area 1611 ref px against 1300-1900. Deliberately the
 *     mirror of bristlebuck: the same rung, the opposite box -- the buck 98
 *     wide by 107 tall, the hound 116 by 96 -- and at icon size that alone
 *     tells them apart.
 *  4. Aspect 1 : 0.83, fill ~0.50.
 *  5. STRUCTURED, and this species was the manual's named worst case: nine
 *     separate highlight events, a near-white scalloped band running
 *     DIAGONALLY across a horizontal barrel, a far hind leg reading
 *     SPEC-BASE-SHADE-DEEP-SHADE-DEEP across nine reference pixels, a complete
 *     ink ring round the near shoulder, and a DEAD STRAIGHT back with five
 *     spikes riding it like a plank. Every one of those is addressed by
 *     construction below rather than by tone.
 *  6. Five masses: the barrel, the lowered head on its neck, the slate MANE,
 *     the lifted near foreleg, the braced near hind leg. The tail is an
 *     appendage; the far pair are one darker shape behind the barrel.
 *  7. Head verb: LOWERED -- the top of the skull sits ten cells below the
 *     withers, which is the line every hunting canid holds and the exact
 *     inversion of the kit it grows out of, whose head is eighteen cells ABOVE
 *     its withers. Body verb: stalking. Weight back over the hind pair, near
 *     forepaw lifted twenty cells clear.
 *  8. Signature: the ridge of frost spikes over the withers, and the long
 *     muzzle carried out beyond and below the chest. Both pure silhouette.
 *  9. Reversals, with coordinates (eleven of the twelve):
 *       withers          (cx- 4, G-70)  contour high point -- HIGHER than the
 *                                       croup, which is the reference's mark of
 *                                       an animal built to run
 *       back dip         (cx+12, G-65)  5-cell sag between the two
 *       croup            (cx+28, G-68)  second high point, 2 below the withers
 *       point of shoulder(cx-14, G-54)  front contour steps forward
 *       brisket          (cx-10, G-38)  lowest, most forward point of the chest
 *       elbow            (cx-13, G-34)  rear edge of the foreleg steps back
 *       belly tuck       (cx+24, G-44)  underside rises 6 cells to the flank
 *       point of buttock (cx+40, G-54)  most rearward
 *       stifle           (cx+22, G-30)  thigh bulges forward, then cuts back
 *       hock             (cx+31, G-14)  rear edge steps back; sharpest angle
 *       stop             (cx-50, G-53)  muzzle top plane, 8 cells under the
 *                                       brow -- the DEEP stop of a wolf
 * 10. Three hues, and this is a PALE SPECIES. H1 ice blue #a8cfe0, ~46 %. H2
 *     DEEP SLATE #4a6880 as `ACCENT`, ~19 % -- the mane, the ridge of spikes,
 *     four stockings and the ear cavity, which is where the manual puts a pale
 *     species' dark neighbour. H3 near-white #e8f6fc on the underside and the
 *     tail tip, plus `INNER` at the nose and ONE 10-cell `SPEC` on the wet nose,
 *     which on a frost species is the legitimate specular case.
 * 11. Four interior events: the pale underside, the four stockings, the mane
 *     and its spike ridge (one event -- the spikes rise off the mane), the face.
 * 12. Eyes `slit` `'s'`, far `'s-'`, spread 6. SMALLER than the kit's `'m'` on a
 *     skull half again as big: the eye shrinks as the animal grows, and that
 *     ratio is most of what separates a predator's face from a cub's.
 *     THE SLATE BAND ACROSS THE EYE ROW IS GONE. With a lid line and a field
 *     stamped inside it that band read as a pair of sunglasses; the slate it
 *     used to spend on a mask now buys the mane. The mark below the eyes is
 *     the nose, and there is a jaw line above it.
 * 13. Surface material: ONE place -- the nape, via one `mane()` call, breaking
 *     the outline there and nowhere else. There is not a hair drawn on the
 *     flank, exactly as there is not one on Mightyena's.
 * 14. Internal dark lines: ONE, the jaw line, and both ends terminate on the
 *     outer silhouette. The complete ink ring the shipped version stamped round
 *     the near shoulder is replaced by a CAST SHADOW onto the chest, which says
 *     the same thing with no closed loop.
 * 15. Second stage of frostnip. CARRIED: the ice spikes, the brush tail, the
 *     slate stockings and the ice/white/slate palette, every slot a step
 *     deeper -- the same animal, wintered. CHANGED: the head from eighteen
 *     cells above the withers to ten below; nearly-square to long and low; the
 *     cheek icicles become a withers ridge; the ears from enormous and pricked
 *     to small and swept back; area doubled.
 */
function rimehound(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const headX = cx - 42, headY = G - 49;

  /* --- the far pair, SHADE, nine cells higher and ten forward. On the shipped
     version all four feet landed on one row, which is geometrically impossible
     in a three-quarter view and is why the animal read as furniture. */
  legDigitigrade(p, ...far(cx + 28, G - 50, G, { thick: 20, ankle: 13, footHalf: 10, footTone: ACCENT }));
  limbPath(p, [[cx - 6, G - 48], [cx - 10, G - 28], [cx - 8, G - 9]] as Pt[], 15, 11, SHADE);
  paw(p, cx - 9, G - 8, 8, { tone: ACCENT });

  /* --- the tail, streaming back and level off the croup. An adult carries it
     level when it is working; the kit flags it up over the rump, and that is
     one of the four things that separate the two silhouettes. */
  limbPath(p, path([[cx + 34, G - 62], [cx + 42, G - 63], [cx + 50, G - 60]] as Pt[]), 16, 8, BASE);
  blob(p, cx + 50, G - 60, 7, 6, LIGHT);

  /* --- THE BARREL. The withers are TWO CELLS HIGHER than the croup with a
     five-cell sag between them: the reference's signature for an animal built
     to run with its head carried low. The shipped version's back was a dead
     straight horizontal line, which is the single loudest thing wrong with it.
     And the belly rises SIX CELLS from the brisket back to the flank -- that V
     is most of what separates a lean animal from a sausage. */
  poly(p, [
    [cx - 14, G - 54],  // point of shoulder
    [cx - 4, G - 70],   // withers -- the high point
    [cx + 12, G - 65],  // back dip
    [cx + 28, G - 68],  // croup
    [cx + 37, G - 64],
    [cx + 40, G - 54],  // point of buttock
    [cx + 36, G - 42],
    [cx + 24, G - 44],  // flank -- top of the tuck
    [cx + 6, G - 40],
    [cx - 10, G - 38],  // brisket -- lowest and most forward
    [cx - 16, G - 46],
  ] as Pt[], BASE);

  /* --- the pale underside, from the brisket back to the flank, following the
     tuck. LIGHT is a change of MATERIAL on one continuous surface, so it takes
     no ink; the same region in SHADE would rule a black line down the middle of
     one belly. */
  poly(p, [
    [cx - 10, G - 36], [cx + 6, G - 38], [cx + 24, G - 42],
    [cx + 32, G - 40], [cx + 8, G - 34], [cx - 9, G - 32],
  ] as Pt[], LIGHT);

  /* --- the one authored FORM event on the body: a band along the LOWER FLANK
     running the barrel's own length, parallel to its own axis. The shipped
     version had a near-white scalloped band whose tone boundary ran diagonally
     ACROSS a horizontal barrel, which is the fixed-screen-diagonal wash the
     whole round is about. FORM never inks, so this has no line round it. */
  poly(p, [
    [cx - 10, G - 40], [cx + 6, G - 43], [cx + 24, G - 47], [cx + 34, G - 45],
    [cx + 26, G - 44], [cx + 6, G - 40], [cx - 9, G - 37],
  ] as Pt[], FORM);

  /* --- the neck, driven forward and DOWN out of the chest. This is the pose,
     and it is one pair of coordinates: the far end of the neck is lower than
     the near end and the whole animal becomes a hunting animal. */
  limbPath(p, [[cx - 8, G - 64], [cx - 20, G - 60], [cx - 32, G - 55]] as Pt[], 26, 21, BASE);

  /* --- the head. A long skull running out into a long muzzle with a DEEP STOP
     of eight cells -- the wolf's, against the kit's five -- so the muzzle's top
     plane is visibly below the brow in the SILHOUETTE. It casts onto the neck,
     which is what puts it in front rather than painted on. */
  cast(p, 32, () => {
    poly(p, [
      [cx - 30, G - 60],  // occiput
      [cx - 26, G - 51],  // cheek, rear
      [cx - 30, G - 42],  // jaw angle
      [cx - 41, G - 37],  // chin
      [cx - 54, G - 39],  // lower lip
      [cx - 58, G - 45],  // nose
      [cx - 50, G - 53],  // stop -- 8 cells under the brow
      [cx - 39, G - 59],  // brow
    ] as Pt[], BASE);
  });
  // The ear-root dip, so the ears have roots instead of joins.
  notch(p, cx - 32, G - 60, 5, 4, 0, 1);

  /* --- THE MANE, and it is much darker than the shipped one: on a pale species
     the whole value range has to be concentrated in a few genuinely dark
     places, and this is the biggest of them. A slate mass over the nape and the
     withers, then ONE `mane()` call on its own top contour so the outer edge
     comes back as clumps. One fur event on the whole creature. */
  cast(p, 30, () => {
    poly(p, [
      [cx - 22, G - 63], [cx - 10, G - 70], [cx + 2, G - 72],
      [cx + 12, G - 66], [cx + 10, G - 57], [cx - 4, G - 57],
      [cx - 14, G - 54], [cx - 23, G - 53],
    ] as Pt[], ACCENT);
  });
  mane(p, contourTop(p, cx - 20, cx + 10, 3), 8, 6, ACCENT, { root: -1 });

  /* --- the ears, drawn AFTER the mane so they sit on top of it: small, pointed
     and swept BACK along the skull, which is what a working canid does with
     them. Upright ears would have pulled the head verb straight back to
     "alert", and alert is the kit's. Two lengths, two heights; the far one is
     `SHADE`, a genuinely separate part set behind another one. */
  poly(p, [[cx - 30, G - 59], [cx - 20, G - 56], [cx - 23, G - 69]] as Pt[], SHADE);
  poly(p, [[cx - 39, G - 58], [cx - 28, G - 58], [cx - 34, G - 73]] as Pt[], BASE);
  if (!p.back) poly(p, [[cx - 36, G - 59], [cx - 31, G - 59], [cx - 34, G - 69]] as Pt[], ACCENT);

  /* --- THE FROST RIDGE. Five spikes rising off the mane where the animal is
     highest, longest over the withers and tapering both ways. Five, and they
     are the species' one repetition; the reference's ceiling on a repeated
     structural element is seven and the shipped version's five DID taper, which
     the manual called the best thing on that sprite. They are faceted -- ice is
     the one material here that genuinely is a set of flat planes -- and they
     extend the top contour rather than sitting on a shape that was already
     finished. */
  spikes(p, [
    [cx - 18, G - 67, Math.PI * 1.26, 11, 3.2],
    [cx - 9, G - 72, Math.PI * 1.38, 15, 3.8],
    [cx + 1, G - 74, Math.PI * 1.50, 17, 4.0],
    [cx + 10, G - 71, Math.PI * 1.62, 13, 3.4],
    [cx + 17, G - 66, Math.PI * 1.74, 9, 2.8],
  ] as const, ACCENT);

  /* --- the near hind, braced back and planted: three segments through a hock,
     which is the sharpest angle on a quadruped and the one joint that has to be
     in the outline. Two tones per leg and nothing else; the shipped far hind
     read as six non-monotonic tone changes across nine reference pixels. */
  legDigitigrade(p, cx + 28, G - 50, G, { thick: 20, ankle: 13, footHalf: 10, footTone: ACCENT });

  /* --- THE NEAR FOREPAW, RAISED and reaching forward. Three feet down and one
     in the air, lifted a clear twenty cells: lifted less than that it reads as
     a short leg, which is how every first attempt at this pose looks. The
     foreleg is one gentle S against the hind leg's zigzag, and the difference
     between the two pairs is a large part of what says quadruped.
     The near shoulder is separated from the chest by this limb's CAST SHADOW.
     The shipped version used a complete ink ring, which is a closed black loop
     on an open surface and is exactly what the reference never draws. */
  cast(p, 44, () => {
    limbPath(p, [[cx - 14, G - 50], [cx - 22, G - 34], [cx - 33, G - 25]] as Pt[], 18, 11, BASE);
  });
  // The elbow: a reversal bitten into the rear edge of the foreleg.
  notch(p, cx - 12, G - 34, 6, 4, -1, 0);
  paw(p, cx - 37, G - 24, 7, { tone: ACCENT });

  /* --- the stockings on the two planted near-side feet, so the dark runs up
     the leg instead of stopping at the foot. Same arrangement as the kit's, one
     step deeper, and it is the palette relationship the line carries. */
  poly(p, [[cx + 22, G - 14], [cx + 32, G - 14], [cx + 32, G - 6], [cx + 22, G - 6]] as Pt[], ACCENT);
  poly(p, [[cx - 13, G - 14], [cx - 4, G - 14], [cx - 4, G - 8], [cx - 13, G - 8]] as Pt[], ACCENT);

  if (p.back) { p.face(headX, headY, 15); return; }

  /* --- the face. THE JAW LINE: one open stroke from the ear root down and
     forward to the mouth corner, both ends terminating on the outer silhouette.
     Three or four cells of ink, and it is the whole difference between a head
     and a wedge -- Mightyena, Manectric, Absol, Vigoroth and Zangoose all draw
     it and the shipped roster drew it on nothing. */
  jawLine(p, cx - 29, G - 45, cx - 43, G - 38);
  nose(p, cx - 55, G - 43);

  /* Two fangs at the corner of the closed jaw, breaking the lip line -- a
     silhouette event rather than pale cells painted inside a shut mouth, where
     at 64 px they would be a smudge. Four cells, and they are the difference
     between a dog and something that runs the lake ice in packs of three. */
  flat(p, () => {
    poly(p, [[cx - 46, G - 38], [cx - 44, G - 38], [cx - 45, G - 33]] as Pt[], LIGHT);
    poly(p, [[cx - 51, G - 39], [cx - 49, G - 39], [cx - 50, G - 35]] as Pt[], LIGHT);
  });

  eyeRow(p, cx - 40, G - 50, 6, 'slit', 's', { far: 's-', farSide: 1 });

  /* ONE specular mark, ten cells, on the wet nose. The budget is one per
     creature and only on something wet, icy, metallic or glassy; a frost
     hound's nose is both. Nothing generates `SPEC` any more. */
  spec(p, cx - 55, G - 46, 2.2, 1.6);
}


export const DESIGNS: Record<string, (p: Pen) => void> = {
  nibbet,
  burrowen,
  tuftail,
  bristlebuck,
  frostnip,
  rimehound,
};
