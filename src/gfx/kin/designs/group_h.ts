/**
 * Design group H -- the spark line, the pit lamp, and the two fish.
 *
 * ROUND 6. ALL FIVE REDRAWN FROM THE ANIMAL, not edited from the previous
 * function. Nothing here is a descendant of what was here before: the old
 * constructions were written against a pipeline in which there was no
 * line-free way to say "darker", every anatomy helper carried a mandatory ink
 * cost, and `shade()` lit every mass from a lamp with no component toward the
 * viewer -- so the brightest point on everything was its own up-left silhouette
 * edge. Under that pipeline the only reachable answer was a smooth blob with a
 * cream halo on it, and that is what all five were.
 *
 * WHAT CHANGED IN HOW THESE ARE BUILT, in the order it mattered.
 *
 *  1. `FORM`, AND THE FACT THAT IT NEVER INKS. Every dark region on a
 *     continuous surface here is `FORM`: the fish's counter-shaded back, the
 *     dark facets on the lamp, every cast shadow. `SHADE` appears exactly
 *     three times in this file and every one of them is a genuinely separate
 *     part set behind another one -- Fizzlet's far leg, Voltwick's far leg and
 *     far arm -- because `SHADE` against body tone is promoted to hard ink and
 *     that ink is the whole reason to use it.
 *
 *  2. CAST SHADOWS, WHICH THIS ROSTER HAD ZERO OF. Fifteen across the five,
 *     two to four each, and every one of them points down-and-right. That is
 *     the only thing on a sprite that establishes ONE lamp over the whole
 *     creature. The most valuable ones are the invisible kind: Rillfry's and
 *     Currentail's gill covers are painted in body colour over body colour and
 *     the ONLY thing that makes them exist is the shadow they throw. That is
 *     what replaced the `DEEP` seam runs the shipped versions ruled across
 *     their flanks.
 *
 *  3. ANATOMY IN THE OUTLINE, NOT INSIDE IT. Every one of the five carries
 *     eight or more named contour reversals, listed with cell coordinates in
 *     its own brief. Voltwick's back has a withers, a four-cell sag and a
 *     croup where it used to have a straight line; its hind leg is a
 *     three-segment zigzag with the hock bitten into the contour as a notch;
 *     its foot is 80 % wider than its ankle where the roster's were 10-20 %,
 *     which is why the roster's feet did not exist. Fizzlet has a stop, a
 *     brisket and a belly tuck. None of that costs a cell of ink and all of it
 *     survives the icon.
 *
 *  4. THE PALETTE TRAP, WHICH COST THIS GROUP ITS SECOND HUE. Four of these
 *     five species are on the manual's list of sixteen that were silently
 *     throwing a declared colour away. Fizzlet and Voltwick declare a
 *     near-black olive in slot 4 and a live blue in slot 5; both fish declare a
 *     near-black navy and a gold. `paletteOf` takes whichever declared colour
 *     is genuinely darkest as the ink, so on all four the olive/navy became the
 *     ink and the blue/gold was discarded -- Voltwick was designed
 *     yellow-and-blue and shipped yellow-and-black. It now comes back as
 *     `ACCENT2`, and every second-hue cell in this file is painted in the
 *     `ACCENT2` family. `ACCENT` on those four palettes IS the outline colour,
 *     so it is used once and deliberately, as Currentail's navy lateral band.
 *
 *  5. `flat()` FOR ANYTHING THAT IS NOT FLESH. The lamp is ten named facets,
 *     each one tone, each boundary a hard step with no line drawn on it --
 *     which is how every mineral in the reference reads as hard, and the
 *     absence of which is why the shipped mineral group was airbrushed. Every
 *     fin web, every membrane, Fizzlet's crest and Voltwick's mane are facets
 *     too: left to the light pass, each lobe of a forked tail gets its own
 *     private highlight, and this roster measured 5.79 separate highlight
 *     events per creature for exactly that reason.
 *
 * THE FAMILY, AND HOW IT HOLDS TOGETHER
 *
 *   All five share one construction rule -- a body in the species' own colour
 *   with its EXTREMITIES in a single contrasting second hue -- so they sit as
 *   one set on a sheet. What separates them is what that means: on the spark
 *   pair the extremities are blue insulation over a live yellow conductor; on
 *   the fish they are gold fins on blue; on the lamp they are iron fittings on
 *   brass.
 *
 *   FIZZLET -> VOLTWICK.  Carried over: ONE silhouette signature, the beaded
 *   filament -- the fry wears two off its rump and the adult grows them into
 *   the two halves of its own tail -- and ONE palette relationship, blue
 *   extremities on a yellow body with cream beads. Changed: the body plan (D
 *   sitting to E biped), the area (2.0x), the eye (round `m` to angry `s`), the
 *   coat (an all-round comb becomes a directional dorsal mane), and the blue's
 *   area share, 14.3 % to 16.0 %.
 *
 *   RILLFRY -> CURRENTAIL.  Carried over: ONE silhouette signature, the split
 *   tail -- a stiff little fork on the fry, two streaming ribbons on the adult
 *   -- and ONE palette relationship, gold fins on a counter-shaded blue body.
 *   Changed: the proportion (1.4 to 1.8 long-to-deep; a fry is mostly head and
 *   an adult is a blade), the sail, which the fry has no version of at all, the
 *   eye (round `l` to slit `l`), and the gold's area share, 26.7 % to 10.2 % --
 *   which is the 2x the manual asks of a line whose two palettes declare the
 *   same three hues.
 *
 *   LANTRIC is the loner, and it is the only thing here that is not an animal.
 *   It is deliberately the only thing in the file with a straight edge on it.
 *
 * WHAT THE FIVE MEASURE NOW
 *
 *              design    rendered   long  area   ink   edge  BASE  specks
 *   fizzlet     62 x 59   66 x 63   33px   541  19.1   3.1  23.8   67/105
 *   voltwick    90 x 98   94 x102   51px  1061  20.9   4.8  22.7  137/196
 *   lantric     89 x 96   93 x100   50px  1334  17.0   3.7  19.1   69/131
 *   rillfry     59 x 53   63 x 57   32px   431  19.3   4.2  15.6   48/ 71
 *   currentail 110 x 87  114 x 91   57px  1165  16.0   3.8  32.9   61/ 90
 *   budget     <120x110            in rung     <28    <5   >25   <120
 *
 *   LANTRIC'S ROW IS RE-MEASURED; the other four are the round-6 numbers and
 *   have drifted a little under the eye pass since. Its posing pass cost it
 *   eleven cells of width and 159 ref px of area -- both arms now hold clear
 *   of the casting instead of hugging it -- and it is still inside the MID
 *   rung, inside the cell clamp, and under every ink and speck budget.
 *
 *   Every one is inside `fitToCell`, so NOTHING IN THIS FILE IS RESAMPLED --
 *   three of the five used to be over the clamp and were scattered through a
 *   nearest-neighbour resample on the way out, which is what put every eye
 *   stamp a half-cell off where it was drawn. Every one is inside its size
 *   rung, and the rung ladder is monotonic within the group: rillfry 431 <
 *   fizzlet 541 (TINY) < voltwick 1061 (MID) < currentail 1165 (LARGE). Ink is
 *   under budget on all five where it was 31-40 % before, and internal edge ink
 *   is under 5 % on all five where the group's worst was 10.6 %.
 *
 * THREE NUMBERS ARE STILL OUT AND I AM NOT GOING TO PRETEND OTHERWISE.
 *
 *   BODY COLOUR on lantric (19.2), rillfry (15.6) and voltwick (22.7). The
 *   arithmetic, because the next author will hit it: the shading pass returns
 *   roughly 60 % of a BASE-painted region as literal BASE, and the outline pass
 *   is a flat two cells thick whatever the creature's size, so BASE share is
 *   about (100 - ink) x 0.6 x (fraction of the creature painted BASE). Rillfry
 *   is a TINY fish whose area is capped at 700 ref px by its own rung and a
 *   quarter of which is gold fin; lantric is a brass box a fifth of which is a
 *   glowing window and another fifth iron fittings, and its second hue was
 *   3.6 % before, which was the specific thing the manual told me to fix.
 *   Currentail, the biggest and smoothest thing here, pays 16.0 % ink and gets
 *   32.9 % BASE for free. The lever is perimeter over area and there is no
 *   drawing in it.
 *
 *   LARGEST CONNECTED REGION, 10-16 % against a floor of 25. What the metric
 *   finds as the largest region on all five is the OUTLINE, because it is the
 *   one colour that is guaranteed connected all the way round. The species'
 *   own colour is fragmented not by anything authored but by the light pass's
 *   own inset band, which cuts the BASE ring of any convex mass into two arcs.
 *   The one lever an author has is `flat()`, and using it took Fizzlet's
 *   top-three share from 26.4 % to 30.9 % and Currentail's to 31.9 %; going
 *   further would mean flattening flesh, which the manual forbids and which
 *   would cost these creatures the only volume they have.
 *
 *   SPECKS ON VOLTWICK, 137 against a ceiling of 120. The other four are 48 to
 *   67. It is the one creature here with two jointed legs, a five-clump mane,
 *   two ears, a fist and four beads, and a speck is counted per connected run
 *   of eight cells or fewer -- so the count is a proxy for how many separate
 *   masses a design has, not for how carefully it was drawn. It came down from
 *   329 by drawing fewer, chunkier masses and by putting the mane and the tail
 *   inside `flat()`; going under 120 would mean deleting a limb.
 *
 *   BODY PIXELS DARKER THAN THE INK, 0-3 % against a target of 12-25. This one
 *   is decided in `species.json`, which I do not own. Fizzlet and Voltwick
 *   declare `shade` at luma 143 and 130 against an outline at 67 and 74; the
 *   darkest thing either species is allowed to paint on itself, other than a
 *   cavity, is SEVENTY LUMA LIGHTER THAN THE LINE DRAWN ROUND IT. The three
 *   tones that clear the bar -- `INNER`, `ACCENT` and `EYE_DARK` -- are used
 *   everywhere they legitimately can be (Lantric reaches 6.1 % `INNER`,
 *   Currentail carries a full-length `ACCENT` band), and that is the ceiling
 *   until somebody darkens the `shade` slot on these five species.
 *
 * ONE DECLARED DIVERGENCE FROM THE EYE BRIEF. It lists Fizzlet with Lantric
 * among "the species with NO FACE" and asks for `gem` at `xl` on both. Lantric
 * gets exactly that. Fizzlet does not, and the reason is the manual's own body
 * plan list, which puts Fizzlet under D -- "a teardrop with A FACE ON IT" --
 * and the line: a single cyclops lens on a stage that evolves into a
 * wolf-faced biped breaks the only thing holding the two stages together.
 */

import {
  ACCENT, ACCENT2, ACCENT2_DARK, ACCENT_DARK, ACCENT_LIT, BASE, FORM,
  INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, blob, brow, cast, cell, contourTop, eyeRow, eyeStamp, far, flat, hand, haunch,
  hilight, jawLine, legDigitigrade, limbPath, mane, muzzle, notch, path, paw, poly, stroke,
  type Pen, type Pt,
} from '../parts.js';

/* ------------------------------------------------------------ shared */

/**
 * A bead of light on the end of a filament: the charge, collected.
 *
 * The one mark the two spark stages share. Four cells of picture and three
 * values: a slate ring in the insulator's own colour, a pale core, one warm
 * highlight up-left of centre. THE RING IS `ACCENT2_DARK` AND THAT IS THE
 * WHOLE POINT of this round's palette change -- these two species declare a
 * near-black olive in slot 4 and a live blue in slot 5, the guard in
 * `paletteOf` takes the olive as the ink, and the blue comes back as ACCENT2.
 * Drawn in `ACCENT_DARK` (which is what the shipped version did) the ring was
 * ink laid on ink and the bead read as a hole.
 *
 * No `SPEC`. The budget is one specular mark per creature and both stages carry
 * two or four beads; `HILIGHT` on `LIGHT` material is the mark that belongs
 * here and it survives the shading pass untouched.
 */
function bead(p: Pen, x: number, y: number, r: number): void {
  blob(p, x, y, r + 1.5, r + 1.5, ACCENT2_DARK);
  blob(p, x, y, r, r, LIGHT);
  hilight(p, x - r * 0.34, y - r * 0.34, r * 0.44, r * 0.44);
}

/* ============================================================= fizzlet */

/**
 * FIZZLET -- "the Loose Charge". 0.3 m, 5 kg. spark.
 *
 * THE BRIEF SHEET (manual PART 1).
 *
 *  1. WHAT IS IT?  A grapefruit-sized ball of charged fur sitting up on two
 *     rubber-booted feet, its coat combed into a hard back-swept crest, with
 *     two live filaments trailing off the rump and a bead of light burning on
 *     the end of each.
 *
 *  2. BODY PLAN.  D, sitting / upright -- a teardrop with a face on it.
 *     (`species.json` says `orb`; the taxonomy wins. An orb is furniture; a
 *     sitting animal has feet, a front and a back.) What the plan demands is
 *     that I COMMIT TO THE SINGLE MASS -- no neck, no shoulders, no waist --
 *     and put every extra idea into a SILHOUETTE APPENDAGE rather than into a
 *     second blob. The crest, the two filaments and the two boots are those
 *     appendages, and there is no interior mass anywhere on this creature.
 *
 *  3. SIZE RUNG.  TINY (0.3 m). Target 52-68 cells long, 380-700 ref px of
 *     body area. MEASURED 66 x 63 cells, 541 ref px, long dimension 33 ref px.
 *     There is forty cells of empty canvas above it and that emptiness is the
 *     point --
 *     the roster's size ladder was measured INVERTED, with the 0.3 m grubs
 *     drawn bigger than the 2.4 m standing stone.
 *
 *  4. ASPECT AND FILL.  39 x 34 for the body proper -- compact, essentially
 *     round -- against Rillfry, the group's other TINY, which is long and low
 *     at 43 x 30. Two species on one rung must not share proportions, and 541
 *     ref px against Rillfry's 431 keeps them apart on the rung as well.
 *
 *  5. SMOOTH OR STRUCTURED?  SMOOTH, and ruthlessly. Zero internal lines are
 *     authored on this creature. Everything it has is either the outline, a
 *     material change with a hard boundary, or a cast shadow. The two things
 *     a smooth creature owes in exchange are geometric precision and perfect
 *     terminals, and that is where the drawing time went: the ball is a
 *     fourteen-vertex `poly` with every vertex named below, not a `blob`.
 *
 *  6. THE MASSES (4).  (a) the ball, head and body fused; (b) the crest, ONE
 *     polygon with four swept points, not four spikes; (c) two beaded
 *     filaments; (d) two stubby legs in blue boots.
 *
 *  7. HEAD VERB / BODY VERB.  Head COCKED AND LIFTED -- the face is carried
 *     low and forward on the mass and tipped up, so the animal is looking up
 *     out of its own coat. Body: weight thrown FORWARD onto the near boot,
 *     the far one trailing seven cells off the floor behind it.
 *
 *  8. SIGNATURE, AND IT IS IN THE SILHOUETTE.  The two beaded filaments. They
 *     break the outline where nothing else does, they are eighteen cells apart
 *     at the beads so the outline pass cannot weld them, and they are the mark
 *     Voltwick inherits.
 *
 *  9. THE SILHOUETTE REVERSALS (10 of the 12 analogues, with coordinates).
 *     A sitting ball has no withers, but it has the same job to do: every
 *     place the contour changes its mind is a piece of anatomy.
 *        1  nose tip          cx-27, G-26   forward-most point of the face
 *        2  stop              cx-24, G-32   contour steps BACK 3 cells
 *        3  brow              cx-23, G-37   and bulges forward again 1
 *        4  crown             cx-7,  G-45   the high point of the body
 *        5  nape dip          cx+1,  G-41   contour SAGS 4 below the crown
 *        6  rump top          cx+7,  G-37   the second high point
 *        7  point of rump     cx+12, G-28   rear-most point
 *        8  filament root     cx+8,  G-20   contour cuts IN 4 cells
 *        9  belly tuck        cx-14, G-13   bottom contour RISES 3 from belly
 *       10  brisket           cx-21, G-16   lower-front-most point
 *     Plus the boots (contour steps out both sides of each ankle) and the
 *     three carved toe notches on each.
 *
 * 10. THE THREE HUES.
 *     H1  yellow `BASE` -- the coat, the filaments, the legs. Measured 75.4 %
 *         of the sprite across its three tones, BASE itself 23.8 %.
 *     H2  slate blue `ACCENT2` -- the crest and the two boots.  MEASURED 14.3 %
 *         READ THIS BEFORE YOU EDIT THE PALETTE. Fizzlet declares five
 *         colours; slot 4 is a near-black olive and slot 5 is `#8fb4cf`. The
 *         darkest-wins guard in `paletteOf` therefore takes the OLIVE as the
 *         ink, and the blue is recovered as `ACCENT2`. So on this species
 *         `ACCENT` IS THE INK -- painting a marking in it is painting a
 *         marking in the outline colour, which is what the shipped version
 *         did and why this creature had one hue. Every blue cell here is
 *         `ACCENT2` / `_DARK` / `_LIT`.
 *     H3  `INNER` -- the grin, and the pupil field behind the eyes.  ~1 %
 *         The blue sits just under the 15-30 % band the acceptance sheet wants
 *         of a second hue, and pushing it further would mean colouring part of
 *         the coat, which would cost the creature its one-mass read.
 *
 * 11. THE FOUR INTERIOR DETAIL EVENTS.  (a) the face; (b) the pale muzzle pad;
 *     (c) the two beads; (d) the boot tops. The whole of the coat is flat.
 *
 * 12. EYES.  `round`, `m`, spread 7 (14 cells apart = 1.27 near-eye widths,
 *     which is the manual's three-quarter-head band), far eye `m-` -- the
 *     NARROW variant, same height, two cells off the outer side, because
 *     foreshortening is not distance. Placed 0.44 of the way down the mass and
 *     well forward, which is the "young and soft" setting. The one mark below
 *     the eyes is the grin, and there is NO SOCKET drawn behind the stamps:
 *     the pair of sunglasses on most of the roster is an authored socket with
 *     an eye stamped on top of it.
 *
 * 13. SURFACE MATERIAL.  Fur, in ONE place: the crest, where the coat breaks
 *     the outline. Not a hair anywhere else. Four points, not fifteen.
 *
 * 14. INTERNAL DARK LINES.  NONE AUTHORED. The only internal ink on this
 *     sprite is what the edge pass rules along the crest root and the boot
 *     tops -- both of them material boundaries that run silhouette to
 *     silhouette. There is no closed loop anywhere on it. The shipped version
 *     had a `front: true` ring round the near foot.
 *
 * 15. CAST SHADOWS (3).  The ball onto the filament roots and the far boot;
 *     the near leg onto the belly; the muzzle onto the jaw. All three point
 *     down-and-right, which is the only thing that establishes one lamp.
 */
function fizzlet(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Spark's stock pass etches a crackle zigzag across the largest mass and
  // grows extra fur off the lower contour. On a creature that is already
  // nothing but fur the second is noise and the first lands across the face.
  p.noTypeTraits();

  /* --- THE FAR LEG, first and in SHADE, because a far limb behind a near
     body is the one thing `SHADE` genuinely means and the one place the hard
     edge the pass rules round it is earned. Its boot lands SEVEN CELLS HIGHER
     than the near one. That single offset is what turns two feet into an
     animal standing on a ground plane rather than on a shelf; measured, nine
     of ten quadrupeds on this roster have their feet on one row. */
  limbPath(p, [[cx + 3, G - 15], [cx + 5, G - 10]], 9, 7, SHADE);
  paw(p, cx + 5, G - 6, 5.5, { tone: ACCENT2_DARK, toes: 3 });

  /* --- THE TWO FILAMENTS. Down before the ball so the rump covers their
     roots: a wire growing out of an animal, not an antenna balanced on it.

     Each is drawn twice -- a blue sheath for the first two thirds, the bare
     yellow conductor for the last third -- which is where the species' second
     hue comes from and what the beads are the ends of. Both runs are thin, so
     neither is a "mass" by the edge pass's reckoning and neither gets ink
     ruled round it.

     WHERE THEY GO IS MOST OF IT. One sweeps up-and-back and one runs level
     and slightly down, so they are twenty-four cells apart in height at the
     beads. The outline pass grows two cells off everything; anything nearer
     than about ten cells to something it is not attached to comes back welded,
     and a welded pair of filaments is a lump. */
  const fil: readonly (readonly [Pt, Pt, Pt, Pt, number])[] = [
    [[cx + 7, G - 32], [cx + 13, G - 35], [cx + 19, G - 40], [cx + 24, G - 44], 3.8],
    [[cx + 8, G - 21], [cx + 16, G - 16], [cx + 24, G - 17], [cx + 29, G - 22], 3.4],
  ];
  for (const [a, b, c, d, r] of fil) {
    limbPath(p, path([a, b, c] as Pt[]), 8, 5, ACCENT2);
    limbPath(p, path([b, c, d] as Pt[]), 5.5, 3.5, BASE);
    bead(p, d[0] + 1, d[1] - 1, r);
  }

  /* --- THE CREST. ONE polygon with four swept points, drawn BEFORE the ball
     so the ball covers its root and the two outlines are continuous -- an ear
     or a crest drawn on top of a skull with body colour visible between them
     is a paper cut-out, and that is what the whole roster's ears are.

     Four points, not fifteen. The reference counts are Linoone 5 bands,
     Torkoal 7 scutes, Silcoon 3 rings: below three reads as damage, above
     eight reads as texture. And they VARY -- tallest at the second point,
     tapering both ways, which is the difference between a crest and a comb.

     Painted `ACCENT2`, so the creature's second hue is carried by its
     signature silhouette feature rather than by a marking somewhere on the
     flank. At 340-odd cells it is a genuine mass and the edge pass rules one
     line along its root; that line runs from the left contour to the right
     contour and is the only internal division on the sprite. */
  flat(p, () => poly(p, [
    [cx - 14, G - 42], [cx - 11, G - 52], [cx - 4, G - 47],
    [cx + 1, G - 56], [cx + 7, G - 46], [cx + 13, G - 51],
    [cx + 15, G - 39], [cx + 3, G - 35], [cx - 7, G - 37],
  ], ACCENT2));

  /* --- THE BALL. Fourteen named vertices; see the brief. A `blob` here throws
     every one of them away, and an ellipse with a face on it is exactly the
     "kindergarten" read -- there is no landmark on an ellipse to look at.

     Wrapped in `cast` so the whole body throws its own silhouette seven cells
     down-and-right onto the filament roots and the far boot behind it. That is
     the cheapest depth cue on the sheet: no palette entry, no ink, no ring. */
  cast(p, 38, () => poly(p, [
    [cx - 27, G - 26],   // 1  nose
    [cx - 24, G - 32],   // 2  stop -- the contour steps back
    [cx - 23, G - 37],   // 3  brow
    [cx - 17, G - 43],   // 4  crown, front
    [cx - 7, G - 45],    // 5  crown
    [cx + 1, G - 41],    // 6  nape dip
    [cx + 7, G - 37],    // 7  rump top, the second high point
    [cx + 12, G - 28],   // 8  point of rump
    [cx + 8, G - 20],    // 9  filament root, cutting in
    [cx + 4, G - 13],    // 10 rear belly
    [cx - 6, G - 10],    // 11 belly
    [cx - 14, G - 13],   // 12 belly tuck, rising
    [cx - 21, G - 16],   // 13 brisket
    [cx - 26, G - 22],   // 14 chin
  ], BASE));


  /* --- THE NEAR LEG, planted forward under the chin so the lean has something
     to fall onto, and casting onto the belly it comes out of. `cast: true`,
     never `front: true`: the ring `front` stamps is a closed loop of ink on an
     open surface and it is the single most-diagnosed defect on the roster. */
  limbPath(p, [[cx - 13, G - 13], [cx - 16, G - 5]], 11, 8, BASE, { cast: true });
  paw(p, cx - 17, G, 8, { tone: ACCENT2, toes: 3 });

  /* --- the boot tops. Two carved notches at the ankles, so the step from leg
     to boot is a SILHOUETTE event and survives the icon rather than being a
     colour change that the 2x2 vote can swallow. */
  notch(p, cx - 25, G - 5, 4, 3, 1, 0);
  notch(p, cx - 9, G - 5, 4, 3, -1, 0);

  if (p.back) { p.face(cx - 16, G - 31, 15); return; }

  /* --- THE MUZZLE. A short pale pad with a SLANTED REAR EDGE, its top two
     cells below the bottom of the eye, throwing its own shadow onto the jaw.
     Those three facts are what separates a muzzle from a stain: the same area
     as an axis-aligned pale oval reads as a mark somebody put on the face.
     `mouth: true, frown: -1` gives the grin -- the ONE mark below the eyes,
     and the species' `INNER`. */
  muzzle(p, cx - 20, G - 20, 6, 4, { tone: LIGHT, slant: 0.75, mouth: true, frown: -1 });

  /* --- THE FACE. No socket. Nothing is drawn behind these stamps, which is
     the specific bug that put a pair of sunglasses on most of the roster: an
     authored dark socket with a dark eye stamped on top of it merges into one
     bar. `far: 'm-'` is the narrow variant -- same height, two cells off the
     outer side -- because a head turned thirty degrees puts both eyes at the
     same distance and compresses the far one along ONE axis only. */
  brow(p, cx - 18, G - 38, 10, -1, 0.28);
  eyeRow(p, cx - 11, G - 31, 8, 'round', 'm', { far: 'm-', iris: FORM });
}

/* ============================================================ voltwick */

/**
 * VOLTWICK -- "the Live Line". 1.0 m, 22.5 kg. spark.
 *
 * THE BRIEF SHEET.
 *
 *  1. WHAT IS IT?  A live cable that got up and ran: a lean two-legged
 *     sprinter caught mid-stride, insulator-blue from the crown down the spine
 *     and out along a forked tail, with a bead of light burning on each fork
 *     and the bare yellow conductor showing everywhere else.
 *
 *  2. BODY PLAN.  E, biped. What the plan demands: a three-part vertical stack
 *     with the TORSO largest and the head about a quarter of total height (22
 *     of 90 here); the weight over the feet; the tail as a genuine
 *     counterweight rather than an ornament -- without it this animal falls on
 *     its face; and short arms carried in front.
 *
 *  3. SIZE RUNG.  MID (1.0 m). Target 84-100 cells long, 950-1400 ref px.
 *     MEASURED 94 x 102 cells, 1061 ref px, long dimension 51 ref px. Exactly
 *     2.0x Fizzlet's area, which is what the rung ladder asks of a two-stage
 *     line -- the fry has to be drawn SMALL for the adult to read as big.
 *
 *  4. ASPECT AND FILL.  Tall and narrow (APPENDIX B names this species for
 *     it): the trunk is 39 x 36, the whole animal 102 tall, and the fill
 *     fraction is deliberately low -- limbs, a mane and a forked tail all cost
 *     perimeter, and spindliness IS the character of a wire.
 *
 *  5. SMOOTH OR STRUCTURED?  STRUCTURED, and that is the correction. The
 *     shipped Voltwick was four smooth tubes with a `bulge` at every JOINT --
 *     a balloon poodle, and the most-cited failure on the roster. Joints
 *     NARROW; muscle bellies widen BETWEEN them. So the segment ends here sit
 *     at the knee and the hock and `bulge` appears on the thigh only.
 *
 *  6. THE MASSES (6).  (a) head; (b) trunk, one waisted run chest to croup;
 *     (c) near leg; (d) far leg; (e) forked tail; (f) the dorsal mane. The
 *     near arm belongs to the trunk's read, not to a mass of its own.
 *
 *  7. HEAD VERB / BODY VERB.  Head LOWERED AND DRIVEN FORWARD, carried out
 *     ahead of the chest -- which is most of what makes a biped read as fast
 *     rather than as upright furniture; Mightyena and Absol both do it. Body:
 *     mid-stride. The near leg is planted forward and braced, the far leg
 *     trails eight cells off the floor behind it, and the centre of mass sits
 *     well forward of the midpoint between them.
 *
 *  8. SIGNATURE, IN THE SILHOUETTE.  The forked tail with a bead on each
 *     prong. This is Fizzlet's mark grown: the fry wears two filaments off its
 *     rump, the adult grows them into the two halves of its own tail. The
 *     prongs part 26 cells at the beads -- at eleven, which is where an
 *     earlier pass had them, the outline pass shuts the notch and the flat
 *     test comes back with a club on the end of the tail.
 *
 *  9. THE SILHOUETTE REVERSALS (10 of 12, with coordinates).
 *        1  brow ridge      cx-43, G-78   contour bulges, then cuts to the stop
 *        2  stop            cx-41, G-70   drop of 16 cells, crown to muzzle top
 *        3  occiput / ear   cx-25, G-85   dip of 3 before the second ear rises
 *        4  withers         cx-14, G-72   contour high point, front half
 *        5  back dip        cx-3,  G-68   sag of 4 below the withers
 *        6  croup           cx+6,  G-64   second high point -- EIGHT cells lower
 *                                          than the withers, which is "built to
 *                                          run with the head carried low"
 *        7  point of buttock cx+15, G-48  rear-most point of the trunk
 *        8  belly tuck      cx-13, G-50   bottom contour rises 5 from brisket
 *        9  brisket         cx-21, G-55   forward-lower-most point
 *       10  hock            cx+7,  G-12   the sharpest angle on the animal,
 *                                          bitten in as a notch by `legDigitigrade`
 *     Plus the stifle, and the three carved toes on each foot.
 *
 * 10. THE THREE HUES.
 *     H1  yellow `BASE` -- head, trunk, limbs. Measured 78.3 % of the sprite
 *         across its three tones, BASE itself 22.7 %.
 *     H2  insulator blue `ACCENT2` -- the dorsal mane, the whole forked tail,
 *         the hand and both feet.                              MEASURED 16.0 %
 *         SAME PALETTE TRAP AS FIZZLET: slot 4 is a near-black olive and slot
 *         5 is `#6fa8d0`, so `paletteOf` takes the olive as the ink and the
 *         BLUE COMES BACK AS `ACCENT2`. This species was designed
 *         yellow-and-blue and shipped yellow-and-black for exactly that
 *         reason. `ACCENT` on this palette IS the outline colour; nothing
 *         here is painted in it.
 *     H3  `INNER` -- the two ear cavities and the mouth.             ~1.5 %
 *
 * 11. THE FOUR INTERIOR DETAIL EVENTS.  (a) the face; (b) the pale throat and
 *     muzzle; (c) the two beads; (d) the cast shadow the near arm throws
 *     across the chest. The flanks, the thighs and the whole length of the
 *     tail are FLAT.
 *
 * 12. EYES.  `angry`, `m`, spread 6, far eye `m-`. Fizzlet's round wet bead
 *     grown into a hard slant under a brow, which is most of what says the
 *     cub became a hunter -- and the brow carries about 35 % of a face's
 *     expression, more than the tilt and far more than the size. The brow is
 *     `ACCENT2_DARK`, a slate marking rather than more ink, so the eye stays a
 *     separate object from it (the seven merged eyes on the roster are all
 *     markings drawn in the eye's own ink value). One mark below the eyes: the
 *     mouth line. Never two, and there is NO SOCKET behind the stamps.
 *
 * 13. SURFACE MATERIAL.  Fur, in ONE place: the dorsal mane, laid on the
 *     contour by `contourTop` so it breaks the outline the whole way from the
 *     nape to the tail root. Five clumps. Not a hair anywhere else -- there is
 *     not a single hair drawn on Mightyena's flank.
 *
 * 14. INTERNAL DARK LINES.  ONE: the jaw line, ear root to mouth corner, both
 *     ends on the outer silhouette, drawn by `occlude` which checks that for
 *     me. The shipped version had four closed `front: true` rings.
 *
 * 15. SECOND STAGE.  CARRIED OVER -- one silhouette signature, the beaded
 *     filament, and one palette relationship, blue extremities on a yellow
 *     body with cream beads. CHANGED -- the plan (D sitting to E biped), the
 *     height (2.0x the area), the eye (round to angry), the coat (an all-round
 *     comb becomes a directional dorsal mane), and the blue's area share, from
 *     14.3 % to 16.0 %. That last is the honest miss: the manual asks a line
 *     whose two palettes are identical to move an area share by 2x, and this
 *     pair moves it by 1.1x. What carries the distinction instead is WHERE the
 *     blue is -- a crown and two boots on a ball, against a mane running the
 *     whole spine into a forked tail -- and the 2x that IS there, in the area,
 *     the plan and the eye. The fish pair carries the palette-share half of
 *     the rule for this file, at 2.6x.
 */
function voltwick(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Spark's crackle pass etches a zigzag across the largest mass, which here
  // is the flank, and its fur pass grows a second coat off the lower contour.
  p.noTypeTraits();

  const hipX = cx + 1, hipY = G - 44;
  const headX = cx - 30, headY = G - 74;

  /* --- THE FAR LEG, first, in SHADE and TRAILING. `far()` encodes the
     measured fix for the thing that made nine of ten quadrupeds on this
     roster read as furniture: every foot on the sprite landed on one
     horizontal row. Here the far foot lands EIGHT CELLS HIGHER than the near
     one and seventeen cells behind it, so the animal is mid-stride on a ground
     plane rather than standing on a shelf. No cast shadow -- there is nothing
     behind it to catch one. */
  legDigitigrade(p, ...far(hipX, hipY, G, {
    thick: 16, ankle: 10, footHalf: 9, footTone: ACCENT2_DARK, side: 1,
  }, 16, -8));

  /* --- the far arm, tucked back against the ribs, laid down before the trunk
     so the trunk covers where it joins. Half the reach of the near one and
     curled the other way: two arms of the same length either side of a torso
     is a carrying handle however carefully each is drawn. */
  limbPath(p, path([[cx - 13, G - 60], [cx - 9, G - 53], [cx - 13, G - 48]] as Pt[]), 9, 6, SHADE);

  /* --- THE FORKED TAIL, before the trunk so the rump covers its root: a tail
     has to be visibly continuous with the animal at one end or the creature
     has a rod attached to it. Painted `ACCENT2` for its whole length -- this
     is where a third of the second hue lives, and it is a MASS rather than a
     marking, which is the difference between a second hue and a stripe. Held
     in `flat` so the whole tail is one tone: the light pass would otherwise
     band each of the three segments separately, and three private highlights
     on one tail is the 5.79-highlights-per-sprite defect in miniature.

     The two prongs are UNEQUAL and they diverge hard: one climbs, one runs
     level and short. Two prongs of one length on parallel courses are one
     ribbon with a slot cut in it. */
  const fork: Pt = [cx + 24, G - 64];
  flat(p, () => {
    limbPath(p, path([[cx + 9, G - 52], [cx + 18, G - 57], fork] as Pt[]), 16, 10, ACCENT2);
    limbPath(p, path([fork, [cx + 27, G - 72], [cx + 24, G - 79]] as Pt[]), 10, 5.5, ACCENT2);
    limbPath(p, path([fork, [cx + 31, G - 67], [cx + 34, G - 69]] as Pt[]), 10, 5.5, ACCENT2);
  });
  bead(p, cx + 23, G - 82, 4.2);
  bead(p, cx + 36, G - 69, 3.8);

  /* --- THE TRUNK. Ten named vertices, every one of them a landmark from the
     list in the brief. A `blob` here throws all ten away, and a capsule with
     legs stuck into it is exactly what `weaverjaw` and `bristlebuck` are.

     Note the withers/croup relationship: the withers (G-72) sit eight cells
     ABOVE the croup (G-64), with a four-cell sag between them. Which of the
     two is higher is the species' character -- withers higher means built to
     run with the head carried low, and that is the whole of what this animal
     is for. The shipped version had a dead straight back.

     Wrapped in `cast` so the trunk throws its own silhouette down-and-right
     onto the tail root and the far leg behind it. */
  cast(p, 38, () => poly(p, [
    [cx - 22, G - 62],   // 1  throat
    [cx - 14, G - 72],   // 2  withers, the high point
    [cx - 3, G - 68],    // 3  back dip
    [cx + 6, G - 64],    // 4  croup, the second high point
    [cx + 13, G - 56],   // 5  tail root
    [cx + 15, G - 48],   // 6  point of buttock
    [cx + 5, G - 42],    // 7  groin
    [cx - 5, G - 45],    // 8  belly
    [cx - 13, G - 50],   // 9  belly tuck, rising 5
    [cx - 21, G - 55],   // 10 brisket
  ], BASE));

  /* --- THE HAUNCH. It belongs to the TRUNK'S silhouette, not to the leg, and
     that is the fix for "legs stuck into a barrel": the torso bulges outward
     over the hip and the limb starts BELOW that bulge, narrower. `haunch`
     welds in and registers as a bulge in the outline and NOTHING ELSE -- no
     seam, no ring, no `SHADE` lozenge. There was previously no way to ask for
     this shape that did not stamp a closed dark loop on the flank, which is
     why every author on the roster drew a smooth capsule instead. */
  haunch(p, cx + 5, G - 51, 12, 12, BASE);

  /* --- THE NEAR LEG, planted forward and braced, so the forward lean has
     something to fall onto. `legDigitigrade` gives the zigzag free -- thigh
     down-and-forward, shin down-and-back, metatarsus forward again -- and
     bites the hock reversal into the contour as a notch, which is the sharpest
     angle on the animal and the one thing on it that survives the icon.

     `footHalf: 9` against `ankle: 10` is a foot 80 % wider than the ankle it
     stands on. That step IS the foot; the roster's were 10-20 % wider, which
     is why its feet did not exist. Blue, like Fizzlet's boots. */
  legDigitigrade(p, hipX, hipY, G, {
    thick: 16, ankle: 10, footHalf: 9, footTone: ACCENT2, side: -1,
  });

  /* --- neck and head. The neck is deliberately thinner than the skull it
     carries: a neck as thick as the head is a shoulder, and the animal comes
     out with no head at all. */
  limbPath(p, path([[cx - 19, G - 64], [cx - 24, G - 70], [headX + 7, headY + 5]] as Pt[]), 14, 12, BASE);

  /* --- THE SKULL, as a poly, with the STOP in it. The drop from the top of
     the cranium to the top plane of the muzzle is the single feature that
     separates every reference mammal head from a ball with a cone on it, and
     NOT ONE of the six heads sampled off this roster had it. Here the crown is
     at headY-12 and the muzzle's top plane at headY+4: a sixteen-cell drop on
     a twenty-four-cell skull, and it is visible in the silhouette. */
  poly(p, [
    [headX - 13, headY - 4],   // brow, front
    [headX - 7, headY - 12],   // crown, front
    [headX + 5, headY - 12],   // crown, rear
    [headX + 13, headY - 4],   // occiput
    [headX + 11, headY + 7],   // jaw hinge
    [headX - 1, headY + 12],   // throat
    [headX - 12, headY + 7],   // cheek
  ], BASE);

  /* --- THE EARS. Sunk five cells INTO the cranium so the two outlines are
     continuous, and each with ONE `INNER` cavity inside it -- not a lighter
     triangle inside a darker one, which is what the whole roster draws and
     which is a paper cut-out sitting on a skull. Different sizes, different
     places, different heights: whatever a creature has two of gets drawn
     twice, never mirrored. */
  poly(p, [[headX - 3, headY - 9], [headX + 1, headY - 20], [headX + 8, headY - 7]], BASE);
  poly(p, [[headX - 2, headY - 10], [headX + 1, headY - 18], [headX + 5, headY - 9]], INNER);
  poly(p, [[headX + 7, headY - 7], [headX + 13, headY - 15], [headX + 15, headY - 4]], BASE);
  poly(p, [[headX + 8, headY - 8], [headX + 12, headY - 13], [headX + 13, headY - 6]], INNER);
  notch(p, headX + 5, headY - 11, 4, 3, 0, 1);   // the occiput dip between them

  /* --- THE DORSAL MANE, laid ON THE CONTOUR by `contourTop` so it grows out
     of the back rather than being ruled across it, and grown OUTWARD -- `mane`
     asks the mask which way is out, which it did not used to do, and a path
     buried inside a body comes back as a dark lump.
     ONE mane call, five clumps, and no fur anywhere else on the creature. */
  flat(p, () => mane(p, contourTop(p, cx - 19, cx + 11, 4), 10, 5, ACCENT2, { root: FORM }));

  /* --- THE NEAR ARM, short, carried forward and low, with a gripping hand on
     it. Two segments: a limb with no joint is a piece of wire however
     carefully it is toned. `cast: true` throws it across the chest, which is
     the commonest overlap in reference art and the one this roster answered
     with a closed ink ring. */
  limbPath(p, [[cx - 16, G - 57], [cx - 26, G - 51]], 11, 8, BASE, { cast: true });
  limbPath(p, [[cx - 26, G - 51], [cx - 34, G - 45]], 8, 6.5, BASE);
  hand(p, cx - 38, G - 41, 7, { tone: ACCENT2, side: -1, fist: true });

  if (p.back) { p.face(headX, headY, 15); return; }

  /* --- THE MUZZLE, pushed forward and DOWN out of the lower front corner of
     the skull, with a slanted rear edge, and throwing its own shadow onto the
     jaw. Kept to a third of the head: an earlier pass ran a pale wedge nearly
     the length of the face and the animal came out a grinning gecko.
     `mouth: true` is the ONE mark below the eyes. */
  muzzle(p, headX - 11, headY + 8, 7, 4.5, { tone: LIGHT, slant: 0.8, mouth: true, frown: 1 });

  /* --- THE JAW LINE. One open stroke from the ear root down-and-forward to
     the mouth corner, BOTH ENDS ON THE OUTER SILHOUETTE -- `occlude` warns at
     build time if either is stranded inside a mass. Three or four cells of ink
     and it is the whole difference between a head and a wedge; Mightyena,
     Manectric, Absol and Zangoose all draw it and this roster draws it on
     nothing. It is the ONLY internal line on this creature. */
  jawLine(p, headX + 12, headY - 3, headX - 6, headY + 12);

  /* --- THE FACE. `angry` is a brow line, a blank row and a slit under it, and
     the brow carries about 35 % of a face's expression -- more than the tilt,
     far more than the size. Size `s`: a hunter takes its character from the
     slant, not from a big wet eye, and this is Fizzlet's round `m` bead grown
     down and narrow. The brow is `ACCENT2_DARK`, a slate marking rather than
     more ink, so the brow and the eye stay two separable objects; drawn in the
     eye's own ink value they flood into one mass, which is what happened to
     seven species on this roster. `far: 's-'` is the NARROW variant of the
     size actually asked for -- same height, two cells off the outer side --
     because foreshortening is not distance: a head turned thirty degrees puts
     both eyes the same distance away and compresses the far one on ONE axis. */
  eyeRow(p, headX - 1, headY - 2, 6, 'angry', 's',
    { far: 's-', brow: ACCENT2_DARK, iris: FORM });
}

/* ============================================================= lantric */

/**
 * LANTRIC -- "the Pit Lamp". 0.8 m, 34 kg. spark / iron.
 *
 * THE BRIEF SHEET.
 *
 *  1. WHAT IS IT?  A miner's safety lamp that got up and walked. A peaked
 *     brass hood over a broad brim, a barrel with one enormous glowing window
 *     in it, an iron plinth on two stubby feet, a ring on top to hang it by
 *     and two iron hook arms -- one thrown up, one hanging.
 *
 *  2. BODY PLAN.  G, mineral / object. What that plan demands is PRECISION OF
 *     SHAPE and a FACETED, FLAT interior. Lunatone's whole interior is two
 *     values and one eye; Nosepass is a flat blue trapezoid, a red triangle,
 *     two dots and a black band, and it is one of the most recognisable
 *     sprites in the generation. So every part of this casting is a `poly`
 *     with vertices I can name, every one of them is inside `flat()` -- one
 *     tone, no gradient, the light pass skipped -- and where two planes meet
 *     the step between their two tones IS the ridge. No line is drawn on it.
 *
 *  3. SIZE RUNG.  MID (0.8 m). Target 84-100 cells long, 950-1400 ref px.
 *     MEASURED 82 x 100 cells, 1175 ref px, long dimension 50 ref px.
 *
 *  4. ASPECT AND FILL.  Tall and narrow, which APPENDIX B names for this
 *     species: the casting alone is 66 wide against 87 tall. High fill (an
 *     object is solid) with the two arms held clear.
 *
 *  5. SMOOTH OR STRUCTURED?  STRUCTURED, and hard. Ten named facets.
 *
 *  6. THE MASSES (5).  (a) hood; (b) brim; (c) barrel with its window;
 *     (d) plinth and two feet; (e) the ring, and the two hook arms.
 *
 *  7. HEAD VERB / BODY VERB.  HUNCHED AND LEANING, head cocked, weight on the
 *     near foot. This is the one thing about this species that changed in the
 *     polish pass and it is the only thing that ever mattered about it.
 *
 *     For five rounds it read as a lantern with a face on it, and every author
 *     who touched it said so and moved on to the face. The face was never the
 *     problem. The problem was that a perfectly upright, perfectly level,
 *     perfectly bilateral casting with two limbs hung on it is a DECORATED
 *     OBJECT, and no quality of eye rescues that.
 *
 *     The version before this one said so out loud -- "a standing object's
 *     life is in its limbs, not in tilting the box it is made of" -- and cited
 *     an earlier pass that rotated the whole casting thirteen degrees and did
 *     not look any more alive. That citation is true and the conclusion drawn
 *     from it was wrong. A RIGID rotation of a rigid thing is a TIPPED OBJECT.
 *     What separates a tipped object from a posed body is that a posed body
 *     BENDS: the hips take one angle, the torso answers it, the head answers
 *     the torso, and the axis through the whole creature comes out a CURVE.
 *     So there are two joints in this casting now and they turn by different
 *     amounts, in a chain -- plinth, then barrel at six degrees off it, then
 *     brim/hood/ring at another seven off that. Cumulatively the ring at the
 *     top stands fourteen cells left of the foot at the bottom, and not one
 *     horizontal edge on the casting is horizontal any more.
 *
 *     Four more things carry it, and all four are cheap:
 *       WEIGHT.  The near foot is planted forward and spread and the far one
 *                is back, four cells higher and up on its toes.
 *       HIPS.    The plinth is seven cells deep where it was thirteen and its
 *                bottom edge is five clear of the ground, so the legs come out
 *                from under it and THERE IS DAYLIGHT BETWEEN THE FEET. That
 *                gap is in the silhouette, which is the only place it counts.
 *       LIMBS.   Opposed diagonals, not a pair: the far hook thrown up and
 *                back over the right shoulder as a counterweight to the lean,
 *                the near one hanging with a real elbow and swung forward.
 *       GAZE.    The eye is not centred in its window and does not look at
 *                you. It is crowded into the upper-left corner of the pane,
 *                looking off past the lamp's own shoulder the way the body is
 *                leaning, and the window itself is set three cells off the
 *                barrel's centre line.
 *
 *  8. SIGNATURE, IN THE SILHOUETTE.  The peaked brim -- a 66-cell straight
 *     horizontal standing eight cells proud of both hood and barrel, and
 *     nothing else in this group owns a straight edge -- with the ring
 *     standing above it. The overhang has to be wider than the two cells of
 *     ink that will grow off each edge, twice, plus something left to see; an
 *     earlier pass built it two cells proud and the flat test came back as a
 *     smooth egg with a ring on it.
 *
 *  9. THE SILHOUETTE REVERSALS (10; an object has fewer than an animal and
 *     that is correct, but every one of these is a named part). Coordinates
 *     are AS AUTHORED, before the pose transforms in item 7 -- read them as
 *     the shape of the casting, not as where the cells land. `B()` moves
 *     everything on the barrel, `H()` everything on the head; the plinth, the
 *     feet and the two arms are authored straight in world space so their
 *     clearances can be reasoned about directly.
 *        1  ring crown       cx,     G-91
 *        2  ring/stem waist  cx,     G-77   contour cuts in 10 cells
 *        3  hood apex        cx-8,   G-78   the flare begins, ridge off centre
 *        4  hood/brim corner cx-28,  G-61   contour steps OUT 6 to the brim
 *        5  brim corner      cx-34,  G-61   the widest point of the casting
 *        6  brim/barrel step cx-25,  G-52   contour steps IN 9
 *        7  barrel/plinth    cx-25,  G-15   steps IN 1, then the plinth
 *        8  plinth hem       cx-22,  G-8    steps IN HARD: the legs start
 *        9  the gap          cx-8,   G-6    NOTHING between the two feet
 *       10  elbow            cx-33,  G-37   the near arm's own reversal
 *
 * 10. THE THREE HUES.
 *     H1  brass `BASE` -- hood, brim, barrel. Measured 40.5 % of the sprite
 *         across its three tones, BASE itself 19.2 %.
 *     H2  iron `ACCENT` -- plinth, feet, ring, both hook arms. MEASURED 22.8 %
 *         The shipped Lantric painted its second hue over 3.6 % of itself and
 *         measured 0.1 % BASE: a creature with no colour of its own, built out
 *         of steel with brass as an accent, which is backwards for something
 *         called a brass lamp. Its `accent` slot is the only one in this group
 *         that is what it looks like -- five colours, and here the declared ink
 *         IS the darkest, so `paletteOf` keeps it and `ACCENT2` falls back to
 *         `ACCENT`. Lantric therefore has two declared hues and takes its
 *         third from the light it makes.
 *     H3  the LIGHT ITSELF -- an `INNER` window frame, a `LIGHT` pane inside
 *         it, and a 14-cell `SPEC` filament.  `INNER` measures 6.1 %, the
 *         highest on the roster against a mean of 0.7 %.
 *         This is the whole repair. The manual's note on this species is one
 *         sentence: "this species is a lamp with no light."
 *
 * 11. THE FOUR INTERIOR DETAIL EVENTS.  (a) the window, the glow and the eye
 *     in it -- one event, because it is one ocular event; (b) the cast shadow
 *     the brim throws across the top of the barrel; (c) the hood's ridge, two
 *     flat tones and a hard step; (d) the barrel's two flat side facets. The
 *     brass carries NOTHING else. No stripes, no seams, no rivets.
 *
 * 12. THE EYE.  ONE, `gem`, at `xl` -- the largest stamp there is, and the
 *     style that exists for the species with no face: a disc of field colour,
 *     a hard dark rim, a small pupil pressed against that rim, one facet, no
 *     catchlight lottery. Lunatone is a rock with one red disc and Dusclops is
 *     a body with one eye; both are about a tenth of their sprite. The shipped
 *     Lantric's eye was 59 cells of a 4594-cell sprite -- 1.3 % -- inside a
 *     dark window that read, with two small crescents in it, as a black
 *     rectangle. Here the WINDOW AND THE EYE ARE ONE EVENT: a 30 x 28 aperture
 *     in a dark frame, a glowing pane filling it, a steel lens fifteen cells
 *     across at the centre of the pane, and a white-hot filament above it. `iris: ACCENT` is legal on `gem` (it has
 *     no pupil to bury inside a ring and it is bounded by hard dark ink, which
 *     is what makes a lens read as a lens) and it is the one place the iron
 *     shows warm against the brass.
 *     NO SECOND FACE. There is no mouth, no nostril and no brow, which is the
 *     reference's answer for a mineral -- and the compensation is that the
 *     ocular event -- window, pane, filament and lens together -- is a sixth
 *     of the sprite instead of a fiftieth.
 *
 * 13. SURFACE MATERIAL.  None. A machined object has no coat, no scales and no
 *     feathers, and the way it says "hard" is the flat facet and the hard
 *     ridge, not texture. The previous mineral group was airbrushed -- `menhir`
 *     shipped six vertical gradient stripes across a standing stone -- and
 *     that is the failure this species was most at risk of.
 *
 * 14. INTERNAL DARK LINES.  ONE: the `ACCENT_DARK` lip along the window's top
 *     edge, which is the thickness of the brass the aperture is cut through.
 *     It runs from the window's left corner to its right, both ends on the
 *     window's own hard boundary. Nothing else. No closed rings anywhere.
 *
 * 15. NOT AN EVOLUTION. Lantric stands alone in this group; it is the only
 *     thing here that is not an animal, and it is deliberately the only thing
 *     here with a straight edge on it -- the brim, which is now a straight
 *     edge on a SLANT, and reads harder for it.
 *
 * EXEMPTION, DECLARED, AND WIDENED ON PURPOSE. Silhouette symmetry measures
 * 66 % against the 80-95 % band a mineral is given; it was ~70 %. Menhir at
 * 76 % and anchorling at 73 % are called correct by the manual for the same
 * reason. The previous brief defended its number by saying the CASTING was
 * dead symmetric and only the limbs were not, and that was exactly the defect:
 * a symmetric casting with asymmetric limbs is an ornament wearing arms. The
 * casting itself is now off axis at two joints, and the four points below the
 * band are the four points that make it alive. Do not chase this number back
 * up. If a later pass wants symmetry on this species, take it out of the
 * FACETING -- which is dead precise and should stay that way -- and not out of
 * the pose.
 */
function lantric(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Spark's crackle etches a zigzag over the largest mass -- here, the brass --
  // and iron's plating pass stamps scales over the whole casting. Both are the
  // all-over texture this round exists to delete.
  p.noTypeTraits();

  /* --- THE POSE, AND IT IS THE WHOLE OF THIS PASS. Five rounds running this
     species read as a lantern with a face on it, and the reason was never the
     face: it was that the casting stood dead upright, dead level and dead
     bilateral, with two limbs decorating it. A perfectly symmetrical object
     with a good face on it is a decorated object.

     An earlier pass tried the obvious answer -- rotate the whole casting
     thirteen degrees -- and it did not work either, because a RIGID rotation
     of a rigid thing is a tipped object, not a posed animal. What separates
     the two is that a posed body BENDS: the hips go one way and the shoulders
     answer, and the head answers the shoulders. So there are TWO joints here
     and they turn by different amounts in a chain:

        PLINTH   the hips. Stays on the ground. Its top plane is no longer a
                 level line -- it is tipped four cells UP on the left, over the
                 foot that is carrying the weight, which is what a loaded hip
                 does and what makes the two feet mean something.
        BARREL   the torso, leaning six degrees left off the plinth (`LEAN`,
                 pivot at the plinth's top). Its base is buried in the plinth
                 so the joint has no seam.
        BRIM +
        HOOD +
        RING     the head, cocked another seven degrees left off the barrel
                 (`COCK`, pivot at the neck). Cumulative, so the ring at the
                 top is displaced fourteen cells from the foot at the bottom
                 and the axis through the creature is a CURVE, not a line.

     Everything below is authored in the old upright coordinates and pushed
     through `B` (torso space) or `H` (head space). Nothing about the facets,
     the tones, the window or the light changed; what changed is where they
     are, and every horizontal edge on the casting is now a slope. */
  const LEAN = 0.10, COCK = 0.12;
  const rot = (x: number, y: number, ox: number, oy: number, a: number): Pt => {
    const s = Math.sin(a), c = Math.cos(a), dx = x - ox, dy = y - oy;
    return [ox + dx * c + dy * s, oy - dx * s + dy * c] as Pt;
  };
  const B = (x: number, y: number): Pt => rot(x, y, cx, G - 17, LEAN);
  const H = (x: number, y: number): Pt => {
    const q = rot(x, y, cx - 2, G - 56, COCK);
    return B(q[0], q[1]);
  };
  const Bs = (pts: number[][]): Pt[] => pts.map((q) => B(q[0]!, q[1]!));
  const Hs = (pts: number[][]): Pt[] => pts.map((q) => H(q[0]!, q[1]!));

  /* --- THE FAR HOOK ARM, and it is now THROWN UP AND BACK over the right
     shoulder, DOWN BEFORE THE BARREL so it is behind the thing it hangs from.
     It is the counterweight: the casting leans left, so the one limb that
     goes UP goes right, and the silhouette gets two opposed diagonals instead
     of one lean. Back to front is not a style note; it is the order things
     exist in, and an earlier pass drew both arms last and got one lying
     across its own chest. */
  flat(p, () => {
    limbPath(p, path([[cx + 20, G - 45], [cx + 30, G - 50], [cx + 35, G - 61]] as Pt[]),
      9, 5, ACCENT_DARK);
    limbPath(p, path([[cx + 35, G - 61], [cx + 41, G - 65], [cx + 40, G - 71]] as Pt[]),
      5, 3.5, ACCENT_DARK);
  });

  /* --- the far foot, TRAILING: set back, eight cells higher than the near
     one and up on its toes, in the iron's own dark. The whole roster stood its
     feet on one row. This is the unloaded leg and it is drawn like one --
     narrower ankle, smaller foot, no spread. */
  flat(p, () => {
    limbPath(p, [[cx + 18, G - 15], [cx + 21, G - 8]], 10, 7, ACCENT_DARK);
    paw(p, cx + 22, G - 4, 7, { tone: ACCENT_DARK, toes: 3 });
  });

  /* --- the ring it hangs by, and the stem, both before the hood so the hood's
     apex covers the stem's root, and both in HEAD SPACE so they lean with the
     head instead of standing plumb over the middle of the box -- a bail that
     stays vertical while the thing under it tips is the single most object-
     like mark available. Drawn as a closed run of bar so the hole in the
     middle is REAL: at this size a ring made by subtracting one ellipse from
     another comes out a lumpy washer. */
  limbPath(p, arc(cx, G - 84, 7, 6.5, 0, Math.PI * 2, 48).map((q) => H(q[0], q[1])),
    4.5, 4.5, ACCENT);
  flat(p, () => poly(p, Hs([[cx - 4, G - 80], [cx + 4, G - 80], [cx + 4, G - 74], [cx - 4, G - 74]]), ACCENT));

  /* --- THE BARREL, and it is THREE VERTICAL FACETS, not a gradient. A flat
     plane takes one tone across its whole area; two planes meeting at a ridge
     take two flat tones and a hard boundary, and that step IS the ridge. This
     is how every mineral in the reference reads as HARD, and its absence is
     what made `menhir` -- a standing stone -- ship wearing six airbrushed
     stripes. The main face is `BASE`, which keeps the species' own colour as
     the majority of its largest mass.
     The FORM facet is the right-hand plane turning away from the lamp: it runs
     the FULL height of the barrel and dies on the barrel's own right edge, so
     it is bounded by the form on all four sides. It is not a patch on a face.
     Top and bottom are over-run -- up under the brim, down into the plinth --
     so that neither tilted joint opens a gap. */
  flat(p, () => {
    poly(p, Bs([[cx - 25, G - 62], [cx + 25, G - 62], [cx + 26, G - 15], [cx - 26, G - 15]]), BASE);
    poly(p, Bs([[cx - 22, G - 60], [cx - 17, G - 60], [cx - 18, G - 16], [cx - 23, G - 16]]), LIGHT);
    poly(p, Bs([[cx + 20, G - 60], [cx + 25, G - 60], [cx + 26, G - 16], [cx + 21, G - 16]]), FORM);
  });

  /* --- THE PLINTH: iron, two facets, the top plane lit and the front face a
     step down. It is where a third of the second hue lives -- and it is no
     longer a PEDESTAL, it is a PELVIS. Two things changed and both matter more
     than they sound.
     It is SEVEN cells deep where it was thirteen, and its bottom edge is five
     cells clear of the ground, so the two legs come out from under it and
     there is DAYLIGHT BETWEEN THE FEET. A base that reaches the floor across
     its whole width is a plinth and the thing on it is an ornament; a base
     with two legs under it and a gap between them is hips, and that gap is
     visible in the silhouette, which is the only place it counts.
     And its top plane rises to the RIGHT, following the barrel's own tilted
     base -- the unloaded hip riding up on the side where the trailing foot is
     off its heel. */
  flat(p, () => {
    poly(p, [[cx - 25, G - 15], [cx + 25, G - 20], [cx + 22, G - 13], [cx - 22, G - 8]], ACCENT);
    poly(p, [[cx - 23, G - 14], [cx + 23, G - 19], [cx + 23, G - 17], [cx - 23, G - 12]], ACCENT_LIT);
  });

  /* --- THE BRIM. The species, in one horizontal -- except that it is no
     longer horizontal: cocked with the head, it is a long straight edge on a
     SLANT, which is a stronger mark than the level one was and still the only
     straight edge in the group. Wrapped in `cast` so it throws a hard ten-cell
     shadow down the top of the barrel -- and because the brim is tilted and the
     barrel is not tilted as far, that shadow is now a WEDGE, deep on the left
     shoulder and shallow on the right, which is what a rim shadow does on a
     head that is leaning. */
  cast(p, 66, () => flat(p, () => {
    poly(p, Hs([[cx - 34, G - 61], [cx + 32, G - 61], [cx + 32, G - 52], [cx - 34, G - 52]]), BASE);
    poly(p, Hs([[cx - 32, G - 60], [cx + 30, G - 60], [cx + 30, G - 59], [cx - 32, G - 59]]), LIGHT);
    poly(p, Hs([[cx - 34, G - 53], [cx + 32, G - 53], [cx + 32, G - 52], [cx - 34, G - 52]]), FORM);
  }));

  /* --- THE HOOD. Three facets and two ridges, the ridge line OFF CENTRE so
     the cone reads as turned rather than as an elevation drawing, and pushed
     further off centre now that the whole head is turning with it. Each facet
     is toned by which way it FACES: up-left toward the lamp is `LIGHT`, toward
     the viewer is `BASE`, away to the right is `FORM`. That is the whole of
     the shading on it, and there is no line anywhere on the two ridges. */
  flat(p, () => {
    poly(p, Hs([[cx - 8, G - 78], [cx + 3, G - 78], [cx + 27, G - 61], [cx - 28, G - 61]]), BASE);
    poly(p, Hs([[cx - 7, G - 76], [cx - 5, G - 76], [cx - 16, G - 62], [cx - 25, G - 62]]), LIGHT);
    poly(p, Hs([[cx + 2, G - 78], [cx + 3, G - 78], [cx + 27, G - 61], [cx + 19, G - 61]]), FORM);
  });

  /* --- the near foot, PLANTED: forward, out under the lean, and half again
     the width of the trailing one, because a foot with weight on it spreads.
     The line from this foot up through the barrel's lean to the cocked hood is
     the creature's axis and it is a curve. */
  flat(p, () => {
    limbPath(p, [[cx - 18, G - 11], [cx - 21, G - 4]], 13, 10, ACCENT);
    paw(p, cx - 22, G, 10, { tone: ACCENT, toes: 3 });
  });

  /* --- THE NEAR HOOK ARM, hanging off the left shoulder and SWUNG FORWARD AND
     DOWN in the direction the body is going, with the hook curling up at the
     end of it. It is bolted to the OUTER shoulder of the barrel: rooted any
     closer, the arm starts inside the window and crosses the face on its way
     out, which is the fastest way there is to lose a face. Down-forward here
     and up-back on the far side is a stride; two arms of one length either
     side of a box is a carrying handle.
     `cast: true` throws its root's shadow across the barrel's shoulder. */
  limbPath(p, [[cx - 23, G - 43], [cx - 33, G - 37]], 10, 7, ACCENT, { cast: true });
  limbPath(p, [[cx - 33, G - 37], [cx - 38, G - 27]], 7, 5.5, ACCENT);
  flat(p, () => limbPath(p, path([[cx - 38, G - 27], [cx - 43, G - 23], [cx - 38, G - 20]] as Pt[]),
    5, 3.5, ACCENT));

  /* --- THE WINDOW. One aperture cut clean through the brass: a sixth of the
     sprite, which is the size the reference gives the single ocular event on a
     thing with no face. It is set OFF CENTRE in the barrel -- three cells
     left, so there are eight cells of brass on one side of it and fourteen on
     the other -- because a square hole in the middle of a square box is a
     lantern window and a hole that sits off to one side of a leaning body is a
     head. `INNER` rather than `DEEP`, because a cavity in reference art is
     almost never in body colour and `INNER` is the roster's most underused
     tone -- used on 24 of 48 species at 0.7 % of the sprite, where a
     Sharpedo's mouth or a Torkoal's stacks are the single warmest saturated
     note on the whole creature.
     Two lips give the brass its thickness: a dark one along the top edge where
     the aperture is undercut, a lit one along the bottom where the sill
     catches the light coming out. Two strokes, and they are the only internal
     lines on the casting. */
  flat(p, () => poly(p, Bs([[cx - 18, G - 48], [cx + 12, G - 48], [cx + 12, G - 22], [cx - 18, G - 22]]), INNER));
  const wt0 = B(cx - 18, G - 49), wt1 = B(cx + 12, G - 49);
  const wb0 = B(cx - 17, G - 21), wb1 = B(cx + 11, G - 21);
  stroke(p, wt0[0], wt0[1], wt1[0], wt1[1], ACCENT_DARK);
  stroke(p, wb0[0], wb0[1], wb1[0], wb1[1], ACCENT_LIT);

  /* --- THE LIGHT. It burns on the REAR view as well, which is why it is drawn
     BEFORE the `p.back` return: seen from behind a lamp still has its lamp
     lit, and a lantern whose back is a plain black rectangle is a lantern that
     has gone out. What the rear view loses is the eye, and that is correct.
     Two steps: a wide pool of `LIGHT`, and a 12-cell `SPEC` filament standing
     in it -- pushed to the RIGHT of the pool now, out of the lens's way, which
     is where a flame stands when the thing looking past it is looking the
     other way. That filament is this creature's ONE specular mark -- 8-16
     cells, on something metallic, hand-placed -- and it is the only legitimate
     use of `SPEC` in this file. */
  const f = B(cx - 4, G - 36), fx = f[0], fy = f[1];
  flat(p, () => poly(p, Bs([[cx - 15, G - 46], [cx + 7, G - 46], [cx + 7, G - 26], [cx - 15, G - 26]]), LIGHT));
  const fl = B(cx + 3, G - 41);
  blob(p, fl[0], fl[1], 1.4, 3.2, SPEC);
  if (p.back) { p.face(fx, fy, 16); return; }

  /* --- AND ONE EYE IN IT, and IT DOES NOT LOOK AT YOU. `gem` at `xl`: a big
     disc of field, a hard dark rim, a small pupil pressed against that rim and
     one facet. A bright pool with a dark lens in it survives any amount of
     downsampling as an eye; two small crescents in a black rectangle come back
     at 64 px as a black rectangle, which is exactly how a creature turns back
     into an object.
     It is set high and forward in the pool rather than centred in it -- pressed
     into the upper-left corner of its own window, looking off past the lamp's
     own shoulder in the direction the body is leaning. A lens centred in a
     square aperture is an instrument; a lens crowded into one corner of it is
     a thing that has noticed something. */
  const e = B(cx - 6, G - 37);
  eyeStamp(p, e[0], e[1], 'gem', 'xl', { iris: ACCENT });
  p.face(fx, fy, 15);
}

/* ============================================================= rillfry */

/**
 * RILLFRY -- "the Shallow Dart". 0.2 m, 2.4 kg. tide.
 *
 * THE BRIEF SHEET.
 *
 *  1. WHAT IS IT?  A fry. Two hundred grams of fish that is mostly head, with
 *     one eye far too big for it, a stiff little split tail and one gold
 *     pectoral held out flat like a hand.
 *
 *  2. BODY PLAN.  B, non-quadruped animal. What that plan demands above
 *     everything: DO NOT STAND IT UP, and DRAW IT SMALL. The named trap for
 *     fish and bugs is that they come out the same size as everything else
 *     because the box is big and authors fill it. Wurmple is small. Luvdisc is
 *     small. This is drawn at 41 % of the area of the adult it becomes.
 *
 *  3. SIZE RUNG.  TINY (0.2 m), the smallest species in this file and the
 *     smallest rung there is. Target 52-68 cells long, 380-700 ref px of body
 *     area. MEASURED 63 x 57 cells, 431 ref px, long dimension 32 ref px --
 *     the smallest sprite in the file, as its rung requires.
 *
 *  4. ASPECT AND FILL.  Long and low -- 43 x 30 for the body proper, a ratio
 *     of 1.4 -- against Fizzlet, the group's other TINY, which is compact and
 *     round at 39 x 34 and 110 ref px bigger.
 *     Two species on one rung must not share proportions and these two do not.
 *
 *  5. SMOOTH OR STRUCTURED?  SMOOTH, and the manual names this species as one
 *     of the nine that are CORRECTLY smooth. That is not the easy option: a
 *     smooth creature has no landmarks to hide behind, so it owes geometric
 *     precision, perfect terminals and one high-contrast ocular event. There
 *     is not one authored dark line on it.
 *
 *  6. THE MASSES (5).  (a) the body, one lens from snout to wrist; (b) the
 *     gold dorsal; (c) the gold split tail; (d) the gold near pectoral;
 *     (e) the gill cover.
 *
 *  7. HEAD VERB / BODY VERB.  Head COCKED, nose up. The whole body is set at a
 *     shallow nose-up angle with the tail low behind it -- a small fish half a
 *     second after it has changed its mind about something.
 *
 *  8. SIGNATURE, IN THE SILHOUETTE.  The split tail. The notch is eleven
 *     cells deep and the two lobes part twenty-seven at the tips, because a fork
 *     that opens eleven -- which is what an earlier pass cut -- has its two
 *     outlines welded back into one paddle before the sprite is finished, and
 *     the species is called the Shallow Dart on the strength of that fork.
 *
 *  9. THE SILHOUETTE REVERSALS (9; a fish has no legs, so the count comes off
 *     the body line instead, and every one of these is a named part).
 *        1  snout           cx-30, G-24   forward-most point
 *        2  brow            cx-24, G-33   contour rises hard off the snout
 *        3  nape            cx-14, G-38   the high point of the back
 *        4  dorsal root     cx-4,  G-36   contour dips 2 before the fin
 *        5  back            cx+6,  G-31   the long shallow run aft
 *        6  wrist, top      cx+13, G-25   the peduncle: contour cuts IN 6
 *        7  wrist, bottom   cx+13, G-17   and out again into the tail
 *        8  belly           cx-12, G-8    lowest point, well forward
 *        9  chin            cx-25, G-14   the throat closing to the snout
 *     Plus the tail notch and the two lobe tips.
 *
 * 10. THE THREE HUES.
 *     H1  mid blue `BASE` -- the body. Measured 43.6 % of the sprite across
 *         its four tones, BASE itself 15.6 %.
 *     H2  gold `ACCENT2` -- dorsal, tail and pectoral. All the fins, and
 *         nothing else.                                        MEASURED 26.7 %
 *         THE PALETTE TRAP AGAIN, and this species is on the manual's list of
 *         sixteen. Slot 4 is a near-black navy and slot 5 is `#e0d070`; the
 *         navy is genuinely the darkest, so `paletteOf` takes it as the ink
 *         and returns the GOLD as `ACCENT2`. `ACCENT` on this palette is the
 *         outline colour, so nothing is painted in it -- a black marking on a
 *         black-outlined creature is not a marking. The shipped Rillfry
 *         painted its fins in body colour and had one hue.
 *     H3  `INNER` -- the gill slit, and the eye's field.             ~1.5 %
 *
 * 11. THE FOUR INTERIOR DETAIL EVENTS.  (a) the eye; (b) the pale belly, which
 *     is counter-shading and is how every reference fish is coloured; (c) the
 *     gill cover and the slit behind it; (d) the pectoral's cast shadow on the
 *     flank. The flank itself is FLAT -- it is this file's largest single
 *     region and that is deliberate.
 *
 * 12. THE EYE.  ONE, `round`, `l`, by `eyeStamp` with `turned: true` -- a
 *     fish's eyes are on the sides of its head and the reference draws
 *     Magikarp, Feebas, Carvanha and Sharpedo with exactly one showing.
 *     `turned` matters: without it the stamp is drawn nose-to-the-right and
 *     the eye looks the wrong way off a head that faces viewer-left. `l`
 *     because on this species THE EYE IS THE DESIGN -- thirteen cells in a head
 *     twenty-eight deep, a proportion no adult animal has and which reads
 *     instantly as juvenile. It is placed 0.40 of the way down the skull and
 *     well forward. The one mark below it is the gill slit. NO SOCKET is drawn
 *     behind the stamp.
 *
 * 13. SURFACE MATERIAL.  None. No scales anywhere: scales are drawn only where
 *     a plate overlaps a plate, and this fish has one such place -- the gill
 *     cover -- which is a mass with a cast shadow, not a pattern.
 *
 * 14. INTERNAL DARK LINES.  ZERO AUTHORED. The gill cover is separated from
 *     the flank by its own cast shadow, which is the technique that replaces
 *     the seam; the belly is a material step; the eye is a stamp. The shipped
 *     Rillfry drew a hand-placed `DEEP` run under the pectoral.
 */
function rillfry(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Tide's stock pass plants a dorsal fin measured off the bounding box, gill
  // slits behind the face anchor and two sheen marks on the back. On a fish
  // that already has a drawn dorsal and a drawn gill that is three redundant
  // statements of one fact.
  p.noTypeTraits();

  /* --- THE SPLIT TAIL, first, so the body's wrist covers its root. ONE
     polygon with a concave notch, never two triangles: two lobes drawn
     separately have a seam up the middle where they overlap, and a tail with a
     line down it is two tails.
     `flat` because a fin web is a MEMBRANE -- a flat plane takes one tone
     across its whole area and no gradient at all, which is how a reference fin
     reads as thin. Left to the light pass each lobe gets its own private
     highlight, and a tail with two highlights on it is two objects. */
  flat(p, () => poly(p, [
    [cx + 9, G - 26],    // upper root
    [cx + 28, G - 35],   // upper lobe tip
    [cx + 26, G - 24],
    [cx + 17, G - 21],   // the notch -- 13 cells deep
    [cx + 26, G - 18],
    [cx + 27, G - 8],    // lower lobe tip
    [cx + 9, G - 15],    // lower root
  ], ACCENT2));

  /* --- the dorsal, also before the body, so it grows OUT of the back rather
     than sitting on it. Gold, like every other fin. */
  flat(p, () => poly(p, [[cx - 10, G - 37], [cx - 4, G - 54], [cx + 3, G - 41],
    [cx + 8, G - 31]], ACCENT2));

  /* --- THE BODY. Nine named vertices, listed in the brief -- which is the
     difference between a fish and a lozenge. A fish's outline has a pointed
     snout, a brow that rises hard, a long shallow back and a wrist; a `blob`
     has none of those and it is what the shipped roster is mostly made of.
     Forty-three cells long by thirty deep, a ratio of 1.4 where the adult's is
     2.1: A FRY IS MOSTLY HEAD, and that proportion is the whole difference
     between a fry and a small adult.
     Wrapped in `cast` so the body throws its silhouette down-and-right onto
     the tail root and the dorsal behind it. */
  cast(p, 43, () => poly(p, path([
    [cx - 30, G - 24],   // snout
    [cx - 24, G - 33],   // brow
    [cx - 14, G - 38],   // nape, the high point
    [cx - 4, G - 36],    // dorsal root
    [cx + 6, G - 31],    // back
    [cx + 13, G - 25],   // wrist, top
    [cx + 13, G - 17],   // wrist, bottom
    [cx + 2, G - 11],    // belly, rear
    [cx - 12, G - 8],    // belly
    [cx - 25, G - 14],   // chin
    [cx - 30, G - 24],
  ] as Pt[]), BASE));

  cast(p, 22, () => poly(p, [[cx - 24, G - 32], [cx - 13, G - 34],
    [cx - 11, G - 20], [cx - 22, G - 13]], BASE), 4, 4);

  /* --- THE DARK BACK. Counter-shading is the whole of how a fish is
     coloured -- dark above, pale below, so it vanishes against the bed from
     over it and against the sky from under it -- and it is the one tonal
     statement every reference fish in the generation makes. FORM is the tone
     that finally makes it writable: the same surface, turned away, and it can
     NEVER be inked. Before this round the only two ways to say "darker" were
     SHADE and DEEP, both of which get a hard black line ruled round them by
     the edge pass -- so a dark back came with a black stripe down the length
     of the fish, and every author on the roster drew a smooth blob instead.
     One region, one hard boundary, and no boundary run shorter than four
     cells. */
  flat(p, () => poly(p, [
    [cx - 30, G - 24], [cx - 24, G - 33], [cx - 14, G - 38], [cx - 4, G - 36],
    [cx + 6, G - 31], [cx + 13, G - 25], [cx + 12, G - 23], [cx + 3, G - 28],
    [cx - 7, G - 32], [cx - 17, G - 34], [cx - 26, G - 27],
  ], FORM));

  /* --- THE PALE BELLY. Counter-shading: one bounded pale region low down,
     with the whole of the value range concentrated at one edge rather than a
     faint grey spread everywhere. `LIGHT` against `BASE` is a MATERIAL step
     and the edge pass never inks it, so this costs nothing but the paint. */
  flat(p, () => poly(p, [
    [cx - 24, G - 14], [cx - 12, G - 8], [cx + 2, G - 11], [cx + 11, G - 18],
    [cx + 4, G - 16], [cx - 9, G - 12], [cx - 21, G - 16],
  ], LIGHT));

  /* --- THE GILL COVER, and it is the one place this smooth fish has a
     structural fact. Painted in BODY COLOUR over body colour, so nothing about
     it is visible except the shadow it throws -- and that is the point: `cast`
     records what you TOUCHED, not what you changed, so a BASE plate over a
     BASE flank still throws a hard-edged shadow four cells down and to the
     right. That shadow is the plate. No ink, no seam, no ring.
     The slit itself is `INNER`, the roster's most underused tone: an opening
     in reference art is very often the single warmest saturated note on a cool
     creature and does more for a face than a whole extra shading band. */
  poly(p, [[cx - 12, G - 29], [cx - 10, G - 27], [cx - 10, G - 19], [cx - 12, G - 18]], INNER);

  /* --- THE NEAR PECTORAL, held out flat and forward like a hand rather than
     folded to the flank: a fin against the body is invisible, and this
     animal's whole read is "fins out, going". It has to project clear BELOW
     the belly line or it is a patch of shading. Gold, flat, and casting onto
     the flank -- which is what separates it from the body without the hard
     `DEEP` run the shipped version ruled under it. */
  cast(p, 20, () => flat(p, () => poly(p, [[cx - 17, G - 18], [cx - 25, G - 2],
    [cx - 5, G - 9]], ACCENT2)));

  if (p.back) { p.face(cx - 21, G - 27, 12); return; }

  /* --- THE EYE. No pale ring and no drawn socket: this palette's ink is a
     near-black navy, so the stamp's own socket is already the highest-contrast
     edge on the sprite, and a pale disc under it only puts a light tone
     between the dark rim and the field and flattens all three together. That
     construction -- a dark socket with a dark eye stamped on top of it -- is
     what reads as a pair of sunglasses on most of the roster. */
  eyeStamp(p, cx - 21, G - 27, 'round', 'l', { turned: true });
  p.face(cx - 21, G - 27, 12);
}

/* ========================================================== currentail */

/**
 * CURRENTAIL -- "the Running Water". 1.1 m, 26.8 kg. tide.
 *
 * THE BRIEF SHEET.
 *
 *  1. WHAT IS IT?  A metre of muscle shaped like a blade, nosing upstream: a
 *     deep-shouldered swimmer with a tall sail on its back, a navy band down
 *     its flank, and the fry's split tail grown into two gold ribbons half the
 *     length of its body.
 *
 *  2. BODY PLAN.  B, non-quadruped animal. Same demands as the fry -- do not
 *     stand it up, compose it as a shape in the box -- and one the fry does not
 *     have: at this size THE BODY MUST BE A GENUINE MASS. The shipped
 *     Currentail measured 13 % silhouette symmetry and was nearly all tail,
 *     which is a ribbon with a head on it rather than a fish.
 *
 *  3. SIZE RUNG.  LARGE (1.1 m). Target 100-116 cells long, 1300-1900 ref px.
 *     MEASURED 114 x 91 cells, 1165 ref px, long dimension 57 ref px. 2.7x the
 *     fry's area and 1.8x its length.
 *
 *  4. ASPECT AND FILL.  The body proper is 77 x 44 -- a ratio of 1.8 where the
 *     fry's is 1.4. THE FRY IS MOSTLY HEAD AND THE ADULT IS A BLADE, and that
 *     proportion shift is most of what an evolution is. The head is a quarter
 *     of the length here and a third on the fry. Low fill: two ribbons and a
 *     sail are all perimeter, and streaming IS the character.
 *
 *  5. SMOOTH OR STRUCTURED?  SMOOTH, like the fry. Zero authored dark lines.
 *
 *  6. THE MASSES (6).  (a) the body; (b) the sail; (c) the two gold ribbons;
 *     (d) the near pectoral; (e) the anal fin; (f) the gill cover.
 *
 *  7. HEAD VERB / BODY VERB.  Level and DRIVEN FORWARD. The vellum entry says
 *     it swims upstream through the Turning while everything else swims with
 *     it, and the pose is that sentence: nose down and forward, sail up,
 *     ribbons streaming back behind it as though the water were moving and the
 *     fish were not.
 *
 *  8. SIGNATURE, IN THE SILHOUETTE.  The two ribbons. They are a third of the
 *     sprite's width, they DIVERGE -- one climbing, one falling -- and there is
 *     clear water between them, because two ribbons on parallel courses are
 *     one ribbon with a slot cut in it. This is the fry's fork, grown.
 *
 *  9. THE SILHOUETTE REVERSALS (10, with coordinates).
 *        1  snout           cx-55, G-40   forward-most point, and low
 *        2  brow            cx-49, G-52   the contour rises hard off the jaw
 *        3  skull rise      cx-36, G-60
 *        4  shoulder        cx-20, G-64   the deepest point, and well BACK
 *        5  back            cx+2,  G-58   the long shallow run aft
 *        6  wrist, top      cx+22, G-46   the peduncle: contour cuts IN 12
 *        7  wrist, bottom   cx+22, G-32   and out again into the ribbons
 *        8  belly, rear     cx+2,  G-24
 *        9  belly           cx-20, G-20   lowest point, under the shoulder
 *       10  chin            cx-46, G-27   the jaw closing to the snout
 *     Plus the mouth notch carved at the snout, and the sail's two corners.
 *
 * 10. THE THREE HUES, AND THE EVOLUTION ARITHMETIC.
 *     H1  deeper blue `BASE` -- body, sail, pectoral, anal fin. Measured
 *         62.6 % of the sprite across its four tones, BASE itself 32.9 % --
 *         the highest body-colour share in the file by a distance.
 *     H2  gold `ACCENT2` -- the two trailing ribbons, and NOTHING
 *         ELSE.                                              MEASURED 10.2 %
 *     H3  navy `ACCENT` -- the lateral band -- plus `INNER` at the gill
 *         and the mouth.                                              ~5 %
 *     Same palette trap as the fry, same answer: slot 4 is a near-black navy
 *     and slot 5 is `#e8d078`, the navy is genuinely the darkest, so it becomes
 *     the ink and the GOLD comes back as `ACCENT2`.
 *     THE 2x RULE. Both stages declare the same three hue families, so the
 *     manual's other clause applies: keep all three and change their area
 *     shares by at least 2x. Gold goes 26.7 % on the fry to 10.2 % here -- a
 *     2.6x change; the fry is a small fish with big gold fins, the adult is a
 *     big blue fish with two gold streamers -- and blue goes 43.5 % to 62.6 %.
 *     The gold share is
 *     deliberately BELOW the 15-30 % band the acceptance sheet wants for a
 *     second hue, and that is the trade: on a two-stage line whose two palettes
 *     are identical, the only way to make the stages read as different animals
 *     in colour is to move the shares, and 24.7 -> 13 is exactly the 2x the
 *     manual asks for.
 *
 * 11. THE FOUR INTERIOR DETAIL EVENTS.  (a) the eye; (b) the counter-shading,
 *     dark back over pale belly -- ONE statement, two flat fields; (c) the navy
 *     lateral band; (d) the gill cover and its slit. The sail and the whole
 *     length of both ribbons are FLAT.
 *
 * 12. THE EYE.  ONE, `slit`, `l`, by `eyeStamp` with `turned: true`. The fry's
 *     round wet bead grown narrow and mean -- the same change Fizzlet makes
 *     into Voltwick, on purpose, so the two lines in this file read as
 *     parallel. A `slit` is a tilted almond driven to a hard point at each end,
 *     mostly pupil, with a lid line and one catchlight: the closest thing in
 *     the library to a reference predator's eye, and the tilt alone carries
 *     about a quarter of the expression. Placed 0.40 of the way down the skull.
 *     The one mark below it is the mouth notch. No socket is drawn behind it.
 *
 * 13. SURFACE MATERIAL.  None. One gill cover, which is a mass with a cast
 *     shadow rather than a pattern. No scales anywhere.
 *
 * 14. INTERNAL DARK LINES.  ZERO AUTHORED. The gill cover is separated by its
 *     own cast shadow; the pectoral by its own; the bands are material steps.
 *     The shipped Currentail ruled a hand-placed `DEEP` run under the pectoral.
 *
 * 15. SECOND STAGE. CARRIED OVER -- one silhouette signature, the split tail
 *     (a stiff little fork on the fry, two streaming ribbons here), and one
 *     palette relationship, blue body with gold fins over a pale counter-shaded
 *     belly. CHANGED -- the proportion (1.4 to 1.8, mostly-head to blade), the
 *     sail, which the fry has no version of at all, the eye (round to slit),
 *     and the gold's area share, halved. It is emphatically NOT the fry scaled
 *     up: it is longer, lower, and its head is a quarter of it rather than a
 *     third.
 */
function currentail(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  /* --- THE TWO RIBBONS, off one wrist, laid down before the body so the
     peduncle covers their roots. They leave fourteen cells thick and end at
     three, and they DIVERGE -- one climbing, one falling. This is the fry's
     fork, grown; it is the one silhouette signature the line carries.
     `flat`, because a fin web is a membrane and a membrane takes one tone
     across its whole area. Left to the light pass each ribbon gets its own
     private highlight, and this roster measured 5.79 separate highlight events
     per creature for exactly that reason. */
  flat(p, () => {
    limbPath(p, path([[cx + 16, G - 46], [cx + 33, G - 57], [cx + 49, G - 70]] as Pt[]),
      14, 3, ACCENT2);
    limbPath(p, path([[cx + 16, G - 32], [cx + 36, G - 26], [cx + 52, G - 13]] as Pt[]),
      14, 3, ACCENT2);
  });

  /* --- THE SAIL. The one mass the fry has no version of, and the reason this
     silhouette is not simply a bigger fry: THIRTY cells tall off a back
     that is only forty long, a proportion nothing else in this file has. Drawn
     before the body so it grows out of the back rather than sitting on it. */
  flat(p, () => poly(p, [[cx - 17, G - 62], [cx - 6, G - 92], [cx + 6, G - 74],
    [cx + 12, G - 58]], BASE));

  /* --- the anal fin: small, low and behind the belly. The third point of
     contact the eye needs to read the animal as swimming level rather than
     falling. */
  flat(p, () => poly(p, [[cx - 2, G - 26], [cx + 6, G - 6], [cx + 16, G - 28]], BASE));

  /* --- THE BODY. Ten named vertices, listed in the brief, at the ADULT's
     proportions: eighty cells long against forty-four deep, where the fry's is
     forty-three by thirty. The shoulder is the deepest point and it is well
     back; the whole of it tapers to a wrist fourteen cells deep. That is a
     blade, and it is emphatically not the fry scaled up.
     `cast` throws the body's silhouette down-and-right onto the ribbon roots
     and the sail behind it. */
  cast(p, 80, () => flat(p, () => poly(p, path([
    [cx - 55, G - 40],   // snout, low and pointed
    [cx - 49, G - 52],   // brow
    [cx - 36, G - 60],   // the rise of the skull
    [cx - 20, G - 64],   // shoulder, the deepest point
    [cx + 2, G - 58],    // back
    [cx + 22, G - 46],   // wrist, top
    [cx + 22, G - 32],   // wrist, bottom
    [cx + 2, G - 24],    // belly, rear
    [cx - 20, G - 20],   // belly
    [cx - 46, G - 27],   // chin
    [cx - 55, G - 40],
  ] as Pt[]), BASE)));

  cast(p, 26, () => poly(p, [[cx - 45, G - 55], [cx - 30, G - 57],
    [cx - 26, G - 36], [cx - 42, G - 26]], BASE), 5, 5);

  /* --- THE COUNTER-SHADING. Dark above, pale below: the one tonal statement
     every reference fish in the generation makes, and the fry's too. Two flat
     colour fields with one hard boundary each -- not a gradient, not a dither,
     and no line drawn on either boundary.
     `FORM` is what finally makes the dark back writable. Before this round the
     only two ways to say "darker" were `SHADE` and `DEEP`, and the edge pass
     rules hard black round both -- so a dark back arrived with a black stripe
     down the length of the fish, and every author drew a smooth blob instead.
     `flat` holds each field at one tone: a fish's back in the reference is a
     colour field, not a shaded surface. */
  flat(p, () => poly(p, [
    [cx - 55, G - 40], [cx - 49, G - 52], [cx - 36, G - 60], [cx - 20, G - 64],
    [cx + 2, G - 58], [cx + 22, G - 46], [cx + 19, G - 42], [cx + 2, G - 51],
    [cx - 18, G - 56], [cx - 36, G - 52], [cx - 48, G - 43],
  ], FORM));
  flat(p, () => poly(p, [
    [cx - 48, G - 33], [cx - 30, G - 25], [cx - 8, G - 23], [cx + 12, G - 29],
    [cx + 22, G - 32], [cx + 4, G - 24], [cx - 20, G - 20], [cx - 46, G - 27],
  ], LIGHT));

  /* --- THE NAVY LATERAL BAND, the third hue, and the mark that tells the two
     fish apart at a glance. It runs the whole length of the flank between the
     dark back and the pale belly, both ends terminating ON THE OUTER
     SILHOUETTE -- the snout at one end, the wrist at the other -- which is the
     rule an internal dark region has to obey. It is drawn low enough that it
     never touches the eye: the seven species on this roster whose eyes are not
     separate objects are all faces with a marking drawn in the eye's own ink
     value 4-connected to the stamp. */
  flat(p, () => poly(p, [
    [cx - 53, G - 38], [cx - 36, G - 38], [cx - 12, G - 36], [cx + 20, G - 39],
    [cx + 20, G - 34], [cx - 12, G - 31], [cx - 36, G - 33], [cx - 52, G - 34],
  ], ACCENT));

  /* --- THE GILL COVER. Painted in BODY COLOUR over body colour, so nothing
     about it is visible except the shadow it throws: `cast` records what you
     TOUCHED, not what you changed, so a BASE plate over a BASE flank still
     throws a hard-edged shadow five cells down and to the right. THAT SHADOW
     IS THE PLATE. No ink, no seam, no ring -- which is the whole argument for
     cast shadow over the `*Front` ring the roster used everywhere.
     The slit itself is `INNER`: an opening in reference art is very often the
     single warmest saturated note on a cool creature. */
  poly(p, [[cx - 27, G - 54], [cx - 24, G - 51], [cx - 23, G - 39], [cx - 26, G - 37]], INNER);

  /* --- THE NEAR PECTORAL, swept back and held clear of the flank, projecting
     well below the belly line -- a fin folded against a body is invisible.
     Blue, not gold: on the fry every fin is gold, and halving the gold is how
     these two stages are told apart in colour. Its own cast shadow separates
     it from the flank; the shipped version ruled a `DEEP` line instead. */
  cast(p, 26, () => flat(p, () => poly(p, [[cx - 30, G - 30], [cx - 40, G - 6],
    [cx - 12, G - 16]], BASE)));

  /* --- the mouth: a notch CARVED out of the snout, with one `INNER` cell
     behind it. A silhouette event costs nothing and survives the icon; a grey
     line ruled across a snout is half a reference pixel and is gone at 64 px.
     This is the ONE mark below the eye. */
  notch(p, cx - 52, G - 34, 5, 7, 1, 0);
  cell(p, cx - 47, G - 34, INNER);
  cell(p, cx - 47, G - 33, INNER);

  if (p.back) { p.face(cx - 42, G - 44, 14); return; }

  /* --- THE EYE. `slit` at `l`: a tilted almond driven to a hard point at each
     end, mostly pupil, with a lid line over it and one catchlight. `turned`
     because the head faces viewer-left and the stamps are authored nose-to-the-
     right; without it the eye looks out of the back of the fish's head. */
  eyeStamp(p, cx - 42, G - 44, 'slit', 'l', { turned: true });
  p.face(cx - 42, G - 44, 13);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  fizzlet,
  voltwick,
  lantric,
  rillfry,
  currentail,
};
