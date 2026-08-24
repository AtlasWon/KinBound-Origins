/**
 * Design group B -- the ridge-fire and quarry-heat set.
 *
 * ROUND 6. Every one of these five was REDRAWN FROM THE ANIMAL, not edited.
 * Nothing in the old file survives: those constructions were written against a
 * pipeline that had no line-free way to say "darker", so every author in the
 * project reached for a smooth blob, and the structure of the functions was
 * the thing being replaced.
 *
 * WHAT THE ROUND CHANGED, AND WHAT THIS FILE DOES WITH IT.
 *
 *  - `FORM` exists. A dark region on a continuous surface -- the under-jaw, the
 *    turn of a haunch, a cheek marking -- is now four words of code with no
 *    ring round it. Every dark on these five that belongs to the FORM is FORM;
 *    `SHADE` appears only on genuinely separate parts set behind another part,
 *    which is the one case that wants the ink.
 *  - `cast()` exists. The shipped roster had ZERO cast shadows. This file has
 *    fourteen, two to four per creature, every one thrown down-and-right, and
 *    they are what separates a limb from a torso here instead of the closed
 *    `DEEP` ring that `front: true` used to stamp. There is not one
 *    `front: true` left in the file.
 *  - `flat()` exists. The drill, the back plates and both moth wings are hard
 *    planes and are painted as FACETS -- one tone across the whole area, hard
 *    boundary, no gradient -- which is how every mineral and every wing in the
 *    reference generation reads as hard.
 *  - Six palette slots. Three of these species declare a near-black in slot 4,
 *    so on blazelynx, volcatrix and sootmoth `ACCENT` resolves to the ink and a
 *    "black marking" would be invisible against the outline. Those three spend
 *    their second hue out of the SHADE slot -- a deep red on the cats, spent as
 *    a material (ruff, collar, forearm bands, cheek mask) and not merely as
 *    shadow -- and their third out of `ACCENT2`, the ember gold that used to be
 *    silently discarded. emberbore and gravelet declare real accents and use
 *    them the ordinary way, for drill, plate and claw.
 *
 * THE SET, AND THE SIZE LADDER IT IS BUILT ON. The old file had this
 * INVERTED -- a 0.3 m creature drawn larger than a 1.7 m one:
 *
 *   gravelet   TINY  0.3 m  a quarry mole sat back on its rump, snout up out of
 *                           the hole, crusted in grit, two spade-hands out.
 *   sootmoth   SMALL 0.5 m  a broad-winged moth at rest: a WING SPAN with a
 *                           small animal hanging in the middle of it.
 *   emberbore  MID   0.7 m  a long low plated digger driving forward onto a
 *                           faceted stone drill.
 *   blazelynx  MID   1.0 m  a lean long-legged ridge cat at a hunting walk,
 *                           ember ruff, tail carried up like a torch.
 *   volcatrix  HUGE  1.7 m  the same cat stood up in a fighting guard: braced
 *                           wide, one banded fist forward, the ruff grown into
 *                           a burning shoulder collar.
 *
 * THE ONE PLACE THE MANUAL ARGUES WITH ITSELF is volcatrix. The HUGE band wants
 * 112-128 cells in the long dimension and `fitToCell` will not accept more than
 * 110 in HEIGHT. So it is built WIDE and the braced fighting stance is what
 * pays for the width. Nothing in this file is at the clamp and nothing is
 * resampled.
 *
 * THE LINE. blazelynx -> volcatrix keeps exactly TWO things, per the family
 * rule: one silhouette signature -- the ember tuft crest, which migrates from
 * the neck to the shoulders and grows by half -- and one palette relationship,
 * orange body / deep-red material / ember-gold fire, with the adult's shade
 * slot pushed deeper (#8f3218 against #a03c1e). Everything else changes:
 * horizontal to upright, four ground contacts to two, a torch tail carried high
 * to a heavy counterweight carried low, `slit` eyes to `angry`, and forelegs to
 * arms with hands.
 *
 * PLAN NOTE. The manual's appendix files emberbore and gravelet under plan D,
 * the sitting animal. gravelet is drawn that way. emberbore is not: a digger
 * driving forward onto its snout is a low quadruped, so it is built on plan A
 * with the barrel dropped almost to the floor. Recorded here, as the manual
 * requires when the taxonomy and the brief disagree.
 *
 * WHAT IS DELIBERATELY ABSENT. No `speckle`. No all-over surface pattern
 * anywhere -- there is none in the reference generation. No generated
 * `SPEC`, and no hand-placed one either: not one of these five is wet, icy or
 * metallic. Fur is drawn in exactly two places on the whole file, the cats'
 * ruff and collar, and both break the outline where they are drawn.
 */

import {
  ACCENT, ACCENT2, ACCENT2_LIT, ACCENT_DARK, ACCENT_LIT, BASE, EYE_DARK, FORM, HILIGHT, INNER,
  LIGHT, SHADE,
  blob, cast, cellOver, claw, contourTop, earPointed, eyeRow, far, flat, hand,
  leaf, legColumn, legDigitigrade, lerp, limbPath, mane,
  muzzle, nostril, notch, path, paw, plate, poly, stroke,
  type Pen, type Pt,
} from '../parts.js';

/* ============================================================== shared */

/**
 * ONE TONGUE OF FIRE, in the third palette hue.
 *
 * Two nested shapes, never three: a notched outer tongue in `ACCENT2` -- the
 * ember gold that sixteen species, these two cats among them, were silently
 * throwing away before slot 5 existed -- and a smaller `ACCENT2_LIT` core
 * inside it.
 *
 * THE NOTCH IS THE WHOLE READ. A single clean triangle on the end of a tail is
 * a HORN, which is what the first version of this looked like, and no amount of
 * hot colour inside a keratin shape fixes it. Fire is read from the notch
 * between a tall tongue and a short one growing out of one root.
 *
 * NOT FOR: a body surface. This is a terminal ornament -- a tail tip, a tuft
 * standing off a ruff -- and it is rooted INSIDE the mass it grows from, so it
 * costs no extra outline.
 */
function emberTongue(p: Pen, x: number, y: number, h: number, lean: number): void {
  poly(p, [
    [x - h * 0.34, y + 2], [x + h * 0.32, y + 1],
    [x + lean * 0.5 + h * 0.30, y - h * 0.50],
    [x + lean * 0.4, y - h * 0.32],
    [x + lean, y - h],
  ] as Pt[], ACCENT2);
  poly(p, [
    [x - h * 0.10, y - h * 0.10], [x + h * 0.08, y - h * 0.16], [x + lean * 0.5, y - h * 0.60],
  ] as Pt[], ACCENT2_LIT);
}

/* ============================================================= gravelet */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IT IS. A hand-sized quarry mole sat back on its rump in the spoil,
 *     snout tipped up out of the hole, both spade-hands out in front of it and
 *     its crown and back caked in a crust of loose grit it never shakes off.
 *  2. PLAN. D, the sitting animal. Obeys what that plan demands: ONE pear mass
 *     with the skull fused into the front of it -- no neck, no shoulder, no
 *     waist -- the rump on the floor, and every bit of character spent on the
 *     face and on one pair of appendages. The manual files gravelet under
 *     "correctly smooth", so the body carries ZERO internal lines: the only
 *     dark boundary on it is the crust's lower edge, and that runs silhouette
 *     to silhouette.
 *  3. RUNG. TINY (0.3 m). Long dimension band 52-68 cells, body 380-700 ref px.
 *     MEASURED THROUGH THE FACTORY: 66 x 57 cells, long dimension 66, 708 ref
 *     px of body. The smallest thing in the group and it looks it.
 *  4. ASPECT / FILL. MEASURED 1.12:1 at fill 0.75 -- compact and heavy, per the
 *     appendix, and the highest fill in the group. The other digger here is
 *     emberbore at 1.36:1 and fill 0.64; two quarry animals that must not share
 *     a proportion, and they do not. Neither is on the same size rung anyway.
 *  5. SMOOTH OR STRUCTURED. SMOOTH, and therefore ruthless: one clean pear, one
 *     crust, two hands, one nose. No joints, no toe lines, no flank marks.
 *  6. MASSES (4). Body pear (skull fused); grit crust; near spade-hand; far
 *     spade-hand. The hind foot is a fifth small contact, not a mass.
 *  7. HEAD VERB: lifted -- snout up, out of the hole. BODY VERB: sat back, all
 *     the weight behind the hip, the two hands out in front carrying none of
 *     it, so the centre of mass is well behind the midpoint of the contacts.
 *  8. SIGNATURE. The near spade-hand: three ochre blades of three different
 *     lengths projecting well past the body line with sky above and below them.
 *     It survives the flat test because it is wholly outside the body outline.
 *  9. SILHOUETTE REVERSALS (12 named, cells from cx / G):
 *       nose pad, top   (-39, -37) forward-most point of the animal
 *       nose pad, base  (-38, -30) the snout ends in a FLAT vertical face
 *       jaw corner      (-28, -27) contour cuts hard back under the snout
 *       throat          (-22, -23)
 *       chest           (-16, -16) forward-most point of the lower body
 *       belly lift      ( +1,  -5) bottom contour comes 5 cells off the floor
 *       heel contact    (+13,   0) rear ground contact
 *       rump point      (+19, -19) rearmost point
 *       crust lobe 3    (+17, -38) the smallest of the three
 *       crust lobe 2    (+10, -49)
 *       crust lobe 1    ( +1, -52) the high point of the animal
 *       brow            (-16, -47) contour bulges up over the eye
 *       ramp            (-24, -43) the straight run from brow down to snout
 *     Plus the wrist step: the hand is 4 cells wider than the forearm.
 * 10. HUES. H1 dun hide (BASE #b09878) ~50 %. H2 the caked grit, painted in the
 *     shade slot (#7a6650) as a real material and not as shadow, ~18 % -- the
 *     second-largest region on the sprite. H3 ochre claw (ACCENT #8a7040) ~4 %,
 *     plus INNER for the nose. The palette declares only five slots, so accent2
 *     resolves to the same ochre and nothing is spent on it.
 * 11. FOUR DETAIL EVENTS. (a) the face; (b) the crust boundary; (c) the pale
 *     throat-and-belly panel; (d) the crust's cast shadow. The flank, the rump
 *     and the whole hind quarter are flat.
 * 12. EYES. `slot` at `s`, spread 8, no catchlight -- the mineral eye, which is
 *     what the manual asks gravelet for by name and what a near-blind digger
 *     with a stone crust on its head wants. `s` and not `m` DELIBERATELY, and
 *     this is the exemption this species claims: two 11-cell ink bars on a
 *     30-cell face are a pair of sunglasses however they are placed, and the
 *     first render of this creature proved it. At `s`, eight clear cells of
 *     face apart, they read as two eyes. The compensation the manual asks for
 *     is there -- the mark below the eyes is an ENORMOUS nose wrapping the
 *     whole tip of the snout. No mouth: one mark below the eyes, never two.
 * 13. SURFACE MATERIAL: in ONE place, the crust, and it breaks the outline
 *     there in three lobes of three different heights. Nowhere else. No grain,
 *     no speckle, no row of pebbles.
 * 14. INTERNAL DARK LINES: exactly one, the crust's lower boundary, ruled by
 *     the internal-edge pass where SHADE meets BASE. It runs from the crown
 *     contour at (-8,-45) to the rump contour at (+22,-17): both ends on the
 *     outer silhouette. No closed loop anywhere on the animal.
 * 15. Not an evolution.
 *
 * WHAT WAS TRIED AND DROPPED, in order.
 *  (a) The crust as a speckle field, then as a tone band, then as a row of
 *      pebbles -- three statements of one fact, per PART 3.5. It is a SHAPE now
 *      and nothing else.
 *  (b) `hooded` eyes plus a `brow()` shadow across both of them. The slot stamp
 *      carries its own FORM shelf; a second brow bridged the two openings into
 *      one continuous dark band, which is the sunglasses defect by a second
 *      route. Rendered, looked at, deleted.
 *  (c) The hands raised to snout height. In silhouette the blades and the head
 *      became one shape and the flat test came back as "a lump with a rake on
 *      it". The hands are now at CHEST height with the snout tipped up clear
 *      above them, and that gap is what makes the head read.
 *  (d) A mouth line under the nose: two marks below the eyes, and the second
 *      always reads as a moustache at 64 px.
 */
function gravelet(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The terra character pass grows faceted shards off the upper contour. This
  // creature's whole back is already a crust of rock; a generated crust on top
  // of an authored one is the redundancy PART 3.5 exists to stop.
  p.noTypeTraits();

  const eyeX = cx - 13, eyeY = G - 35;

  /* --- the FAR spade-hand. SHADE, laid down first, set HIGHER and shorter
     than the near one and with only two blades showing -- the far side of a
     three-quarter animal is smaller as well as darker. A far part is genuinely
     behind another part, which is the one case that wants the ink. */
  limbPath(p, [[cx - 6, G - 21], [cx - 15, G - 19]] as Pt[], 10, 9, SHADE);
  blob(p, cx - 19, G - 19, 6, 6, SHADE);
  poly(p, [[cx - 21, G - 24], [cx - 20, G - 17], [cx - 32, G - 24]] as Pt[], SHADE);
  poly(p, [[cx - 22, G - 20], [cx - 20, G - 14], [cx - 33, G - 16]] as Pt[], SHADE);

  /* --- THE BODY. One pear, drawn as a `poly` and not a stack of `blob`s,
     because every landmark in the reversal list above is a vertex and an
     ellipse throws all of them away. The snout is the part that has to be
     right: it runs eleven cells clear of the skull and tapers from nine deep
     to six, so there is a real ramp down from the brow and a real notch up
     from the jaw. Drawn flush with the head it reads as a guinea pig. */
  poly(p, [
    [cx - 39, G - 37],   // NOSE PAD top corner -- forward-most point
    [cx - 31, G - 41],   // top of the snout
    [cx - 24, G - 43],   // the ramp up on to the skull
    [cx - 16, G - 47],   // BROW -- high point of the skull
    [cx - 8, G - 46],    // occiput dip
    [cx + 4, G - 43],    // withers, where the crust roots
    [cx + 14, G - 34],   // back
    [cx + 19, G - 19],   // RUMP -- rearmost point
    [cx + 17, G - 6],
    [cx + 13, G],        // rear ground contact
    [cx + 7, G],
    [cx + 1, G - 5],     // BELLY LIFT -- the bottom contour leaves the floor
    [cx - 9, G - 8],
    [cx - 16, G - 16],   // CHEST -- forward-most point of the lower body
    [cx - 22, G - 23],   // throat
    [cx - 28, G - 27],   // JAW CORNER -- the contour cuts back under the snout
    [cx - 38, G - 30],   // NOSE PAD bottom corner: the snout ends in a flat face
  ] as Pt[], BASE);

  /* --- the hind foot, poking out from under the sitting rump and well clear of
     the rump's own ground contact, so the bottom edge is TWO separated contacts
     and not one bar. Seven cells of floor between them, which is more than the
     two cells of outline can bridge. */
  paw(p, cx - 6, G, 7, { tone: BASE, toes: 3 });

  /* --- THE GRIT CRUST. "Caked in loose grit", drawn the only honest way: as a
     shape. Three lobes at three heights, valleys cut back to the root line,
     rising 5-7 cells clear of the back -- so the crust is a SILHOUETTE event
     before it is a tonal one. One straight-ish lower boundary slants from the
     crown contour to the rump contour, and the crust throws its rim shadow
     down-and-right onto the flank, which is what makes it sit ON the animal
     instead of being painted on it. It stops well behind the brow: run forward
     over the crown it turns the creature into a snail and swallows the far eye.
     A shallow trough would give a ribbed fin rather than three lumps of rock. */
  cast(p, 40, () => {
    poly(p, [
      [cx - 2, G - 44],    // front root, on the crown contour
      [cx + 1, G - 52],    // lobe 1
      [cx + 6, G - 42],    // valley, back to the root line
      [cx + 10, G - 49],   // lobe 2, the high point of the animal
      [cx + 14, G - 36],   // valley
      [cx + 17, G - 38],   // lobe 3, the smallest
      [cx + 20, G - 26],
      [cx + 17, G - 16],   // rear root, on the rump contour
      [cx + 9, G - 25],
      [cx + 3, G - 35],
    ] as Pt[], SHADE);
  });

  /* --- the pale throat-and-belly panel. One bounded patch with a SLANTED rear
     edge, per PART 5.3: the same area as an axis-aligned oval reads as a stain.
     It runs from under the jaw down the front and along the underside, and
     stops well short of the flank so the dun hide stays the majority colour. */
  if (!p.back) {
    poly(p, [
      [cx - 32, G - 30], [cx - 24, G - 25], [cx - 17, G - 16],
      [cx - 12, G - 9], [cx - 20, G - 9], [cx - 28, G - 20],
    ] as Pt[], LIGHT);
  }

  /* --- THE ONE AUTHORED DARK EVENT. A FORM band along the whole underside,
     from under the jaw back to the rump, two to five rows deep. PART 6.4 asks
     every creature for one deep shadow event the light pass cannot know about,
     and on a sitting animal it is the underside: the jaw's underside is the
     darkest part of any head and the belly of a mass on the floor never sees
     the lamp at all. FORM and never SHADE -- this is the same hide turning
     away, so it must have no line round it, and FORM never inks. It also fills
     the long empty cheek under the eyes, which is most of the kindergarten
     read. */
  poly(p, [
    [cx - 32, G - 27], [cx - 22, G - 19], [cx - 10, G - 8], [cx + 2, G - 3],
    [cx + 14, G - 2], [cx + 14, G - 6], [cx + 1, G - 7], [cx - 8, G - 13],
    [cx - 19, G - 24], [cx - 29, G - 31],
  ] as Pt[], FORM);

  /* --- THE NEAR SPADE-HAND: the signature, and the whole flat test.
     Held at CHEST height, not up at the snout: raised, the blades and the head
     merged into one silhouette and the flat test came back as "a lump with a
     rake on it". The hand steps out four cells wider than the wrist -- the same
     rule as "a paw is 60-100 % wider than the ankle" -- and it casts onto the
     chest, which is one of this creature's three cast shadows. */
  cast(p, 20, () => {
    limbPath(p, [[cx - 8, G - 16], [cx - 16, G - 12], [cx - 23, G - 10]] as Pt[], 13, 11, BASE);
    blob(p, cx - 26, G - 9, 8, 7, BASE);
  });

  /* --- three blades, unequal, the middle longest by about a quarter -- the
     digit rule from PART 7.2 -- every one projecting well past the body line
     with clear air between them. Ochre, this palette's only genuine second hue,
     with a lit leading edge on each so they read as hard. */
  for (const [rx0, ry0, rx1, ry1, tx, ty] of [
    [-30, -16, -27, -11, -40, -18],
    [-31, -11, -28, -6, -41, -9],
    [-28, -6, -22, -2, -36, -1],
  ] as const) {
    poly(p, [[cx + rx0, G + ry0], [cx + rx1, G + ry1], [cx + tx, G + ty]] as Pt[], ACCENT);
    // The pale tip only, not a lit run up the whole blade: a stripe down every
    // claw is three specular events where the budget allows none.
    stroke(p, cx + (tx * 2 + rx0) / 3, G + (ty * 2 + ry0) / 3, cx + tx, G + ty, ACCENT_LIT);
  }

  if (p.back) { p.face(eyeX, eyeY, 14); return; }

  /* --- THE FACE. Two hard mineral slots and one enormous nose, and nothing
     else on the head at all -- which is the reference answer for a face built
     out of slots. No  call; see (b) above. */
  eyeRow(p, eyeX, eyeY, 8, 'slot', 's', { far: 's-' });

  /* --- the nose: the ONE mark below the eyes, and a slot-eyed face wants an
     enormous one. It is the whole flat FRONT FACE of the snout, so it is a
     silhouette event as well as being the sprite's entire INNER budget, and the
     pale cells under the cavity are what make it a nostril rather than a smudge. */
  poly(p, [
    [cx - 39, G - 38], [cx - 32, G - 37], [cx - 31, G - 31], [cx - 38, G - 30],
  ] as Pt[], INNER);
  cellOver(p, cx - 34, G - 29, LIGHT);
  cellOver(p, cx - 33, G - 29, LIGHT);
}

/* ============================================================= sootmoth */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IT IS. A broad-winged moth settled on something still warm: wings
 *     held out and up, the body turned away between them, the free edges of the
 *     wings still glowing where they have been near the fire.
 *  2. PLAN. B, the non-quadruped animal -- the bug case. Obeys the thing that
 *     plan demands most: IT IS NOT STOOD UP. It is a WING SPAN with a small
 *     animal hanging in the middle of it, and the legs barely show, the way a
 *     resting moth's do.
 *  3. RUNG. SMALL (0.5 m). Long dimension band 68-84 cells. MEASURED: 82 x 79
 *     cells, long dimension 82, 876 ref px of body against a band of 650-1000.
 *     The span is the long dimension, so it is a wide-span design per the
 *     appendix -- the only one in the group.
 *  4. ASPECT / FILL. MEASURED 1.04:1 at fill 0.54 -- the lowest fill in the
 *     group, which is what a pair of spread planes with sky between the lobes
 *     costs. The bounding box is squarer than a moth sounds because the antennae
 *     take it up as far as the wings take it out. Nothing else in the group is a
 *     spread plane; the other four are solid bodies.
 *  5. SMOOTH OR STRUCTURED. Neither, exactly -- a moth is two FLAT PLANES and a
 *     furry lump. So the wings are drawn as `flat()` FACETS: one tone across the
 *     whole membrane, no gradient at all, which is what PART 4.3 says a plane
 *     gets and what the reference does with every wing in the generation.
 *  6. MASSES (5). Near wing; far wing; thorax; abdomen; head.
 *  7. HEAD VERB: cocked, low between the wing roots -- feeding, not flying.
 *     BODY VERB: settled. The abdomen hangs and one hind leg is planted; the
 *     mass is asymmetric about the wing axis, which is the whole point below.
 *  8. SIGNATURE. The SCALLOPED, EMBER-LIT WING MARGIN. The free edge of the
 *     near wing is cut into three broad lobes, so it is a silhouette event
 *     first; the glowing band riding just inside it is the second, colour
 *     statement of the same fact and the species' name. The V of feathered
 *     antennae is the other silhouette signature.
 *  9. SILHOUETTE REVERSALS (10 named, cells from cx / G):
 *       far antenna tip  (-24, -71)
 *       near antenna tip ( +3, -73) -- the two are different lengths, at
 *                                     different angles: never a mirrored pair
 *       far wing apex    (-32, -58) HIGHER than the near wing's
 *       far wing tip     (-38, -42) leftmost point
 *       far trailing     (-24, -22)
 *       head             (-22, -42) forward-most point of the body
 *       hind foot        ( -8,  -1) the one ground contact clear of the wing
 *       abdomen tip      (+10,  -4)
 *       trailing lobe 1  (+22, -10) lowest point of the near wing
 *       trailing lobe 2  (+33, -20)
 *       near wing tip    (+39, -36) rightmost point
 *       near wing apex   (+29, -52) LOWER than the far wing's
 * 10. HUES. H1 rust (BASE #c9603a) ~46 %: both membranes and the thorax. H2
 *     pale ash (ACCENT2 #e8d0a0) ~17 %, as one panel across each wing -- this
 *     is exactly the "pale wing panels" the manual asks this species for by
 *     name, and slot 5 is what made the colour reachable at all. H3 soot
 *     (ACCENT #4a3428) ~6 % on the two leading edges and the antennae; on this
 *     palette the soot is DARKER than the outline, which is how a sprite gets
 *     the 12-25 % of body pixels darker than its own ink that PART 6.4 wants.
 *     The ember margin is the pale end of the body ramp (LIGHT #f0a860), spent
 *     in one band on the free edge and nowhere else.
 * 11. FOUR DETAIL EVENTS. (a) the face and antennae; (b) the soot leading-edge
 *     bands; (c) the pale ash panels; (d) the ember margin. The rest of both
 *     membranes is COMPLETELY FLAT, which is what the reference does with a
 *     wing -- Beautifly's and Dustox's membranes carry no surface at all.
 *     TWO CAST SHADOWS, and they are the only depth cue the wings get: the near
 *     wing throws its whole silhouette seven cells down-and-right onto the far
 *     wing and the abdomen, and the thorax throws four cells onto the near wing.
 *     Neither costs a palette entry or a single cell of ink, and on a creature
 *     built of two flat planes they are what stops the planes reading as one.
 * 12. EYES. `compound` at `m`, `iris: ACCENT`, spread 6, and the ANTENNAE ARE
 *     PAINTED IN `ACCENT_DARK` rather than `ACCENT` -- see below. A big coloured dome
 *     with a hard dark rim, two facets and NO PUPIL -- insects, and only
 *     insects, and it is the one style nothing else in this group wears. A
 *     compound eye is exempt from the lid line, per the acceptance note.
 *     `iris: ACCENT` is legal here because `compound` has no pupil to bury
 *     inside a ring, and it puts the soot into the lens.
 *     THERE IS NO MARK BELOW THE EYES and that is deliberate: a moth has no
 *     mouth to draw, and the manual's exemption is exactly this -- insects,
 *     minerals and spirits may be bare below the eye, and they compensate with
 *     a far bigger eye. The compound domes are most of the head.
 * 13. SURFACE MATERIAL: the scalloping, in ONE place, on the near wing's free
 *     edge, where it breaks the outline. The far wing's edge is left plain, so
 *     the two wings differ in more than size.
 * 14. INTERNAL DARK LINES: two, one per wing, and each is the border the
 *     internal-edge pass rules around a real ACCENT mass -- the leading-edge
 *     band -- which runs from the wing root to the wing tip: both ends on the
 *     outer silhouette. No closed loop anywhere.
 * 15. Not an evolution.
 *
 * WHAT WAS TRIED AND DROPPED.
 *  (a) A near-symmetric pair of wings. A moth is never drawn that way: the near
 *      wing is lower and larger, the far wing higher, smaller and darker, and
 *      the body between them is turned. Drawn as a matched pair this species
 *      reads as a specimen-drawer mount, which is what the manual measured.
 *  (b) The antennae drawn in `ACCENT`. On this palette slot 4 is a near-black
 *      that resolves to the INK, so the antennae were exactly the value of the
 *      compound eye's own rim, they touched it, and `eyeaudit` flooded the pair
 *      into one 20 x 38 mass -- which is the manual's own diagnosis of this
 *      species, "one continuous run from eye to antenna". An eye that is not a
 *      separate object is not an eye. Fixed the way the eye brief asks: the
 *      marking is drawn in `ACCENT_DARK`, one value below the eye, which is
 *      Zigzagoon's construction; the roots were lifted a cell; and the eye came
 *      down from `l` to `m` so there is a clear row of face between the two.
 *      Measured after: the eye masses are 11 x 11, exactly the stamp's own box.
 *  (c) A per-cell ember margin painted with two nested `cellOver` runs along a
 *      dense path. That is a texture pass by hand; the margin is now one
 *      bounded band.
 */
function sootmoth(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The flame character pass grows tongues along the whole upper contour, which
  // on a moth is the leading edge of both wings -- and in a soot accent they
  // came back as a burnt ragged margin on the one edge that has to stay clean.
  p.noTypeTraits();

  const thX = cx - 2, thY = G - 30;
  const hdX = cx - 12, hdY = G - 42;

  /* --- THE FAR WING. Down first, SHADE, and a size smaller: its apex is SIX
     cells HIGHER than the near wing's, it reaches less far, and its free edge
     is left plain rather than scalloped. One value step is the whole depth cue
     and it costs no ink except where the two wings actually cross. The membrane
     is a FACET -- one flat tone, no gradient, because it is a plane. */
  flat(p, () => poly(p, [
    [cx - 6, G - 36],    // root, at the shoulder
    [cx - 20, G - 52],
    [cx - 32, G - 58],   // FAR WING APEX -- higher than the near wing's
    [cx - 38, G - 42],   // far wing tip, leftmost point
    [cx - 31, G - 28],
    [cx - 24, G - 22],   // trailing corner
    [cx - 8, G - 27],
  ] as Pt[], SHADE));

  /* --- the abdomen: a short fat cone hanging below and behind the thorax and
     just showing past the wings, which is what tells you there is an animal in
     there rather than two leaves. */
  limbPath(p, [[thX + 1, thY + 4], [cx + 8, G - 12], [cx + 10, G - 5]] as Pt[], 15, 6, BASE);

  /* --- THE NEAR WING: the biggest single shape on the sprite and the reason
     the creature reads at all. What makes a moth a moth is that the wings go UP
     AND OUT -- the leading edge climbs in a straight line from the shoulder to
     an apex high and wide of the body -- and that the span is far larger than
     the animal hanging in the middle of it. Only the TRAILING edge is lobed:
     three broad scallops, which is the count the reference uses and is a
     silhouette event rather than a marking. */
  cast(p, 40, () => flat(p, () => poly(p, [
    [cx + 2, G - 38],    // root, at the shoulder
    [cx + 18, G - 48],
    [cx + 29, G - 52],   // NEAR WING APEX -- lower than the far wing's
    [cx + 39, G - 36],   // near wing tip, rightmost point
    [cx + 36, G - 26],
    [cx + 33, G - 20],   // trailing lobe 2
    [cx + 30, G - 24],
    [cx + 22, G - 10],   // trailing lobe 1, the lowest point of the wing
    [cx + 17, G - 18],
    [cx + 11, G - 16],
    [cx + 4, G - 26],
  ] as Pt[], BASE)));

  /* --- the pale ash panel on each wing: ONE band across the middle of the
     membrane, in the third palette slot, with hard straight boundaries. This is
     the second hue and it has to be a real region -- an accent so thin that the
     shading pass pushes every cell of it to the top or the bottom of its own
     ramp never shows its own colour at all, which is what happened to nineteen
     species on the shipped roster. */
  flat(p, () => {
    poly(p, [
      [cx + 7, G - 31], [cx + 20, G - 40], [cx + 34, G - 39],
      [cx + 36, G - 29], [cx + 22, G - 23], [cx + 11, G - 21],
    ] as Pt[], ACCENT2);
    // The FAR wing gets NO panel. Two reasons, and both were measured. It keeps
    // the far membrane as ONE large flat SHADE region, which is what a plane is
    // supposed to be and which was the biggest single region on the sprite; and
    // it is one more way in which the two wings differ, which is the whole
    // point of PART 2.6 -- the near wing is lower, larger, paler and patterned,
    // the far one higher, smaller, darker and plain. A matched pair reads as a
    // specimen-drawer mount.
  });

  /* --- the EMBER MARGIN: one bounded band of the body ramp's pale end riding
     just inside the near wing's free edge, following the scallops. "Ember-lit
     wing edges" is the species brief and this is it, said ONCE, as a shape. */
  flat(p, () => poly(p, [
    [cx + 38, G - 36], [cx + 35, G - 27], [cx + 32, G - 21],
    [cx + 28, G - 25], [cx + 22, G - 11], [cx + 18, G - 18], [cx + 12, G - 17],
    [cx + 14, G - 21], [cx + 21, G - 20], [cx + 25, G - 27], [cx + 30, G - 30],
    [cx + 34, G - 32],
  ] as Pt[], LIGHT));

  /* --- the soot leading-edge band on each wing. Root to tip, both ends on the
     outer silhouette, so neither is a closed loop; a moth's costa really is the
     dark thickened part and it is what stops a wing reading as a leaf. */
  flat(p, () => {
    poly(p, [
      [cx + 2, G - 39], [cx + 18, G - 49], [cx + 30, G - 53],
      [cx + 29, G - 49], [cx + 18, G - 45], [cx + 3, G - 36],
    ] as Pt[], ACCENT);
    poly(p, [
      [cx - 6, G - 37], [cx - 20, G - 53], [cx - 31, G - 58],
      [cx - 30, G - 54], [cx - 20, G - 49], [cx - 7, G - 34],
    ] as Pt[], ACCENT);
  });

  /* --- the thorax: a compact furry barrel over the wing roots, holding the two
     planes together. BASE and not LIGHT -- painted pale all through, the body
     came back brighter than the ember margin it is supposed to be setting off. */
  cast(p, 22, () => blob(p, thX, thY, 11, 12, BASE));

  /* --- two short legs under the thorax. A moth at rest shows very little leg;
     these exist so the bottom edge has separated contact points -- near leg,
     abdomen tip, near wing lobe -- rather than one continuous bar. */
  limbPath(p, [[thX - 3, thY + 7], [cx - 8, G - 2]] as Pt[], 6, 4, BASE);
  limbPath(p, [[thX + 4, thY + 8], [cx + 4, G - 6]] as Pt[], 5, 3, SHADE);

  /* --- the head, low and forward between the wing roots. */
  blob(p, hdX, hdY, 11, 10, BASE);

  /* --- THE ANTENNAE. The second silhouette signature, and they have to be
     FEATHERED -- a shaft with a depth of comb either side of it, not a line. A
     bare stroke leaving the body gets its own two cells of outline and reads as
     a wire. Two different lengths at two different angles: never a mirrored
     pair. They root clear of the eye's ink, with a cell of face between, which
     is what stops the eye fusing with them into one mark. */
  for (const [ax, ay, tx, ty] of [
    [cx - 16, G - 51, cx - 24, G - 71],
    [cx - 6, G - 52, cx + 3, G - 73],
  ] as const) {
    // ACCENT_DARK, not ACCENT. On this palette the accent IS the ink, so an
    // antenna painted in it is the same value as the compound eye's own rim --
    // and the two were 4-connected, which is why the manual measured sootmoth's
    // eye as one continuous 12 x 30 run from lens to antenna. It is not an eye
    // if it is not a separate object. This is Zigzagoon's construction: two
    // dark values, the eye being the darker of them.
    limbPath(p, [[ax, ay], [tx, ty]] as Pt[], 3, 2, ACCENT_DARK);
    // The comb: a narrow FACET laid along the outer two thirds of the shaft,
    // with its own midrib. A bare rod is a wire and a fat rod is a rabbit ear;
    // this is the only shape at this scale that reads as a feathered antenna.
    const ang = Math.atan2(ty - ay, tx - ax);
    leaf(p, lerp(ax, tx, 0.24), lerp(ay, ty, 0.24), Math.hypot(tx - ax, ty - ay) * 0.76, ang, 2.2, ACCENT_DARK);
  }

  if (p.back) { p.face(hdX, hdY, 11); return; }

  /* --- the face: two compound lenses filling most of the head, and nothing
     else. See the brief note: an insect is one of the three kinds of creature
     the manual lets go bare below the eye, and the compensation is that the
     eyes are most of the head. */
  eyeRow(p, hdX, hdY + 1, 6, 'compound', 'm', { iris: ACCENT });
}

/* ============================================================ emberbore */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IT IS. A low, heavy, plated digger driving forward onto a conical
 *     stone drill that is most of its head, with the near foreleg already
 *     braced under the chest and the seams of the drill glowing where it has
 *     been working.
 *  2. PLAN. A, the quadruped -- not plan D, which is where the appendix files
 *     it. A digger driving forward onto its snout is a low quadruped, and the
 *     construction obeys plan A: four legs reading as four with real floor
 *     between the pairs, the far pair laid down first in SHADE and set higher
 *     and forward via `far()`, the near pair in BASE laid down last, and the
 *     head carried FORWARD of the chest and BELOW the shoulder line.
 *  3. RUNG. MID (0.7 m), the bottom of that rung. Long dimension band 84-100
 *     cells. MEASURED: 98 x 72, long dimension 98, 1125 ref px of body against a
 *     band of 950-1400. The other MID here is blazelynx at 1.0 m, which is
 *     longer (100), much taller and 300 ref px heavier -- the two must not be
 *     the same size and they are not.
 *  4. ASPECT / FILL. MEASURED 1.36:1 at fill 0.64 -- long-and-low, per the
 *     appendix, and the armoured end of the fill band. The other MID species is
 *     blazelynx at 1.05:1 and fill 0.60, so the two animals that share a rung do
 *     not share a proportion, which is what PART 1.4 asks.
 *  5. SMOOTH OR STRUCTURED. STRUCTURED, and the named landmarks are the twelve
 *     below. The drill and the plates are hard surfaces and are drawn as
 *     `flat()` facets -- one tone each, hard boundary, no gradient -- which is
 *     how every mineral in the reference reads as hard.
 *  6. MASSES (5). The drill; the skull; the barrel; the near foreleg; the near
 *     hind leg. The far pair are one shadow shape behind the barrel, not
 *     masses. The back plates are an ornament on the barrel.
 *  7. HEAD VERB: lowered -- driving, the skull carried eight cells below the
 *     withers with the drill pointing down as well as forward. BODY VERB: the
 *     weight is thrown onto the braced near foreleg, so the centre of mass sits
 *     forward of the midpoint between the contacts.
 *  8. SIGNATURE. The drill: a clean cone a quarter of the animal's length,
 *     projecting past everything else, faceted rather than airbrushed. Flat
 *     filled it is a wedge on the front of a loaf, and nothing else on the
 *     roster is that shape.
 *  9. SILHOUETTE REVERSALS (12 named, cells from cx / G):
 *       drill tip       (-50, -30) forward-most point
 *       drill root step (-34, -19) contour steps back 4 cells onto the throat
 *       jaw corner      (-20, -18) lowest point of the head
 *       brisket         (-14, -26) forward-most point of the lower body
 *       elbow           ( -6, -20) rear edge of the foreleg steps back
 *       belly tuck      ( +8, -15) bottom contour rises 5 from the brisket
 *       point of buttock(+33, -30) rearmost point
 *       plate peak 3    (+14, -60) the high point of the animal
 *       croup           (+26, -53) SECOND contour high point, and the higher
 *       back dip        (+14, -48) 3-5 cell sag between withers and croup
 *       withers         ( +2, -51) first contour high point
 *       occiput dip     (-10, -45) contour dips between skull and shoulder
 *     Plus: the paw is 70 % wider than the ankle on both near legs.
 * 10. HUES. H1 rust hide (BASE #c06038) ~48 %. H2 quarry stone (ACCENT
 *     #8a7a5a) on the drill and the four back plates, ~20 % -- this is the one
 *     species in the group whose declared accent is a genuinely different
 *     material rather than a near-black, so it is used the ordinary way. H3 the
 *     glow: the pale end of the body ramp (LIGHT #e8a050, a hot orange) at the
 *     drill collar and in the drill's seam, ~5 %, plus INNER at the vent.
 *     "Glowing" cannot be painted in grey, which is why the heat is spent out
 *     of the body ramp and not out of the accent.
 * 11. FOUR DETAIL EVENTS. (a) the face; (b) the four back plates; (c) the
 *     drill's three facets and its hot seam; (d) the hot collar. The barrel's
 *     flank, the haunch and every leg are left completely flat.
 * 12. EYES. `hooded` at `m`, spread 8, far `m-`, `lid: LIGHT`. Hooded is the
 *     Numel reading -- lit flesh, one lid line, a shallow eye under it -- and
 *     it is exactly this animal's character: calm, stubborn, unbothered,
 *     ancient. `lid: LIGHT` and not `lid: BASE`, because a body-toned lid on a
 *     body-toned head paints nothing; here LIGHT is the species' hot orange, so
 *     the fold above the eye reads as heat, which is free characterisation.
 *     The mark below the eyes is the VENT: three INNER cells with a pale cell
 *     under them on the cheek behind the drill root. One mark, never two -- no
 *     mouth, because the drill is where a mouth would be.
 * 13. SURFACE MATERIAL: TWO places, both silhouette-breaking. The four back
 *     plates stand 6-8 cells clear of the back contour with narrow tops and real
 *     steps between them, so the ridge is a SAW in the flat test and not one
 *     smooth hump; the drill's flutes cross its own outline. Nothing anywhere
 *     else -- no rivets, no grain, no scutes on the flank.
 * 14. INTERNAL DARK LINES: two, the drill's flutes, each running from the
 *     drill's upper contour to its lower contour -- both ends on the outer
 *     silhouette. The plates carry NO lip and NO gutter: both are one-cell runs
 *     traced round a polygon and `settle()` eats a one-cell generated run with
 *     body either side of it, so they came back as dotted outlines and were 22
 *     of this sprite's specks on their own. Two flat tones with a hard boundary
 *     is what a pair of planes gets, and that step IS the ridge. No closed loop
 *     anywhere, and no seam ring at any limb root: the near legs separate from
 *     the barrel with cast shadows.
 * 15. Not an evolution.
 *
 * WHAT WAS TRIED AND DROPPED.
 *  (a) The drill drawn with lengthwise flutes. One-cell diagonals down a grey
 *      cone are half a reference pixel and are gone at 64; the ridge that says
 *      "this thing turns" is TRANSVERSE, and there are two of them, not six.
 *  (b) The back plate as one continuous slab. It became the sprite's dominant
 *      colour, which is the exact fault the round-5 measurement named. Four
 *      separate plates of four different sizes is the Aggron/Torkoal count.
 *  (c) A `front: true` ring at each leg root. That is a closed loop of ink on
 *      an open flank; the legs now use the cast shadow `legColumn` gives them.
 */
function emberbore(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The flame character pass grows tongues along the whole upper contour, and
  // on this animal that contour is the back plates -- the one surface here that
  // has to stay a clean hard facet. The heat is authored, at the drill.
  p.noTypeTraits();

  const eyeX = cx - 19, eyeY = G - 38;

  /* --- THE FAR PAIR, first and in SHADE. `far()` carries the measured numbers:
     nine cells higher, ten forward, two or three narrower. That vertical offset
     is the single cue that turns four legs into an animal standing on a ground
     plane, and the shipped roster had a mean foot-row spread of three cells. */
  legColumn(p, ...far(cx - 4, G - 24, G, { thick: 15, footHalf: 11 }));
  legColumn(p, ...far(cx + 24, G - 24, G, { thick: 17, footHalf: 12 }));

  /* --- THE BARREL. Long and low, and the back is NOT a line: withers, a
     four-cell sag, then a croup that is HIGHER than the withers, which is what
     the reference gives an animal built to dig rather than to run. The belly
     is a shallow V -- deep and forward at the brisket, rising five cells back
     to the flank -- which is most of what separates an animal from a sausage. */
  poly(p, [
    [cx - 14, G - 40],
    [cx - 10, G - 45],   // OCCIPUT DIP -- between skull and shoulder
    [cx + 2, G - 51],    // WITHERS
    [cx + 14, G - 48],   // BACK DIP
    [cx + 26, G - 53],   // CROUP -- higher than the withers
    [cx + 31, G - 45],
    [cx + 33, G - 30],   // POINT OF BUTTOCK -- rearmost point
    [cx + 30, G - 16],
    [cx + 21, G - 12],
    [cx + 8, G - 15],    // BELLY TUCK -- the bottom contour rises to the flank
    [cx - 6, G - 20],    // ELBOW -- the rear edge of the foreleg steps back
    [cx - 14, G - 26],   // BRISKET -- forward-most point of the lower body
  ] as Pt[], BASE);

  /* --- THE SKULL. Fused to the shoulder -- a digger has no neck -- and carried
     eight cells BELOW the withers, which is the head verb. */
  poly(p, [
    [cx - 36, G - 34],
    [cx - 28, G - 45],   // brow ridge
    [cx - 16, G - 47],
    [cx - 6, G - 43],
    [cx - 8, G - 24],
    [cx - 20, G - 18],   // JAW CORNER -- lowest point of the head
    [cx - 32, G - 20],   // throat
    [cx - 38, G - 26],
  ] as Pt[], BASE);

  /* --- the hot collar: a band of the body ramp's pale end where the stone
     enters the flesh. This is the "glowing" of the brief, spent in ONE place
     rather than smeared over the whole snout, and it is what stops the drill
     reading as a rock glued to a pig. */
  poly(p, [
    [cx - 38, G - 40], [cx - 31, G - 38], [cx - 30, G - 21], [cx - 37, G - 22],
  ] as Pt[], LIGHT);

  /* --- THE DRILL. A cone driven forward and DOWN out of the collar, drawn as
     two `flat()` facets with a hard boundary between them: the upper-left plane
     faces the lamp and takes ACCENT_LIT, the lower-right plane faces away and
     takes ACCENT. That step IS the ridge of the cone -- there is no line on it
     and no gradient in either half, which is how a mineral reads as hard. It
     casts onto the collar and the throat behind it. */
  cast(p, 22, () => {
    // The lit facet is INSET two cells from the cone's own upper contour, and
    // the contour itself keeps the stone's own colour. A flat plane takes one
    // tone, but the plane that reaches the silhouette IS the rim light the
    // round-6 diagnosis was about -- so the facet stops short of it.
    flat(p, () => poly(p, [
      [cx - 36, G - 41], [cx - 50, G - 30], [cx - 50, G - 29], [cx - 35, G - 28],
    ] as Pt[], ACCENT));
    flat(p, () => poly(p, [
      [cx - 35, G - 38], [cx - 47, G - 31], [cx - 47, G - 29], [cx - 34, G - 29],
    ] as Pt[], ACCENT_LIT));
    flat(p, () => poly(p, [
      [cx - 35, G - 29], [cx - 50, G - 30], [cx - 48, G - 26], [cx - 34, G - 23],
    ] as Pt[], ACCENT));
    // and the underside plane, which faces away from the lamp entirely.
    flat(p, () => poly(p, [
      [cx - 34, G - 24], [cx - 48, G - 27], [cx - 46, G - 23], [cx - 34, G - 19],
    ] as Pt[], ACCENT_DARK));
  });

  /* --- two transverse flutes, and two is the count. Lengthwise flutes on a
     cone are half a reference pixel wide and vanish at 64 px; a ring ACROSS the
     cone is what says "this thing turns". Both run upper contour to lower
     contour, so neither is a closed loop. */
  for (const t of [0.34, 0.62] as const) {
    const ax = cx - 36 - 14 * t, ay = G - 41 + 11 * t;
    const bx = cx - 34 - 13 * t, by = G - 19 - 8 * t;
    stroke(p, ax, ay, bx, by, ACCENT_DARK);
    stroke(p, ax + 1, ay, bx + 1, by, ACCENT_DARK);
  }

  /* --- the seam: the one white-hot line in the drill, along the ridge where
     the two facets meet, running out to the tip. The species is "the Hot Seam"
     and this is it. */
  // Two rows, not one: a one-cell generated-tone run is majority-filtered away.
  stroke(p, cx - 37, G - 29, cx - 49, G - 30, HILIGHT);
  stroke(p, cx - 37, G - 28, cx - 49, G - 29, HILIGHT);

  /* --- FOUR BACK PLATES, standing three to five cells clear of the back
     contour so the armour is a SILHOUETTE event and not a marking. Four, of
     four different sizes, largest over the croup and tapering both ways -- a
     row of identical evenly-spaced plates is a comb. Each is a facet with a lit
     upper lip and a dark gutter under it, which is `plate()`, and the row as a
     whole throws one cast shadow down the flank. */
  cast(p, 40, () => {
    // NO LIP AND NO GUTTER. Both are one-cell runs traced round a polygon, and
    // `settle()` eats a one-cell generated run with body on both sides, so they
    // came back as dotted outlines -- measured, they were 22 of emberbore's
    // specks on their own. Two FLAT TONES WITH A HARD BOUNDARY is what the
    // manual asks a pair of planes for, and that step IS the ridge: the plates
    // alternate between the stone's lit face and its own colour and nothing is
    // drawn on the joint at all.
    const faces = [ACCENT_LIT, ACCENT, ACCENT_LIT, ACCENT];
    // Narrow tops with real steps between them. Broad flat tops butted end to
    // end came back as ONE smooth hump in the flat test -- armour that does not
    // survive the silhouette is a marking, not armour.
    const quads = [
      [[cx - 9, G - 40], [cx - 6, G - 50], [cx - 2, G - 49], [cx + 2, G - 41]],
      [[cx + 1, G - 42], [cx + 4, G - 55], [cx + 8, G - 53], [cx + 11, G - 43]],
      [[cx + 10, G - 44], [cx + 14, G - 60], [cx + 18, G - 57], [cx + 22, G - 44]],
      [[cx + 21, G - 45], [cx + 25, G - 55], [cx + 29, G - 51], [cx + 30, G - 41]],
    ];
    for (let i = 0; i < quads.length; i++) {
      plate(p, quads[i] as unknown as Pt[], faces[i]!, -1, -1);
    }
  });

  /* --- THE NEAR PAIR, in body colour, laid down last. Braced: the foreleg is
     planted forward under the chest and the hind leg is set back under the
     croup, so there is real floor between the pairs. `legColumn` throws each
     one's cast shadow onto the barrel behind it, which is what separates a limb
     from a torso without a ring of ink round its root. The feet are 70 % wider
     than the ankles; that step is the whole read of a foot. */
  legColumn(p, cx - 6, G - 22, G, { thick: 17, footHalf: 13, side: -1 });
  legColumn(p, cx + 24, G - 22, G, { thick: 19, footHalf: 14, side: 1 });

  /* --- the tail: a short heavy stub, one segment, because a digger's is. It is
     a silhouette event at the buttock and nothing more. */
  limbPath(p, [[cx + 28, G - 33], [cx + 35, G - 28], [cx + 39, G - 18], [cx + 40, G - 10]] as Pt[], 15, 3, BASE);

  if (p.back) { p.face(eyeX, eyeY, 16); return; }

  /* --- THE FACE. Two hooded eyes high on the skull, behind the drill root. */
  eyeRow(p, eyeX, eyeY, 8, 'hooded', 'm', { far: 'm-', lid: LIGHT });

  /* --- the vent: the ONE mark below the eyes. Three INNER cells with a pale
     cell under them on the cheek behind the drill root -- the highest
     value-per-cell mark anywhere on a sprite, and a boring animal is exactly
     the species that has one. No mouth: the drill is where a mouth would be. */
  nostril(p, cx - 26, G - 26, -1);
  cellOver(p, cx - 27, G - 26, INNER);

  /* --- the under-jaw, which PART 5.2 makes the darkest part of any head. FORM,
     never SHADE: it is the same surface turning away and it must have no line
     round it. Two rows thick, or `settle()` majority-filters it away. */
  poly(p, [
    [cx - 30, G - 21], [cx - 20, G - 20], [cx - 10, G - 25], [cx - 11, G - 22],
    [cx - 21, G - 17], [cx - 31, G - 19],
  ] as Pt[], FORM);
}

/* ============================================================ blazelynx */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IT IS. A lean, long-legged ridge cat at a hunting walk: high in the
 *     withers, head carried low and forward of the chest, a ruff of ember-lit
 *     fur at the neck, and a thin tail held up behind it like a carried torch.
 *  2. PLAN. A, the quadruped. Obeys it: four legs read as four with real floor
 *     between the pairs; the far pair go down first in SHADE, offset forward
 *     and landing nine cells higher; the near foreleg is ADVANCED across the
 *     chest; the head is carried forward of the chest and BELOW the shoulder
 *     line; and the hind leg zigzags where the foreleg does not, which is most
 *     of what says quadruped rather than four pegs.
 *  3. RUNG. MID (1.0 m), the TOP of that rung -- the largest MID species in the
 *     group and it must look it beside emberbore at 0.7 m. MEASURED: 100 x 95
 *     cells, long dimension 100 against a band of 84-100, 1421 ref px of body
 *     against 950-1400. Under the `fitToCell` clamp of 120 x 110, so nothing is
 *     resampled -- the old blazelynx was AT the clamp in height, which is most
 *     of why its hand-placed detail looked mushy.
 *  4. ASPECT / FILL. MEASURED 1.05:1 at fill 0.60. The bounding box comes out
 *     squarer than a walking cat sounds because the ember crest owns the top of
 *     it; the ANIMAL inside is long and low, and the fill is well under
 *     emberbore's 0.64 on a longer box because there is real sky under the belly
 *     and between all four legs. emberbore, the other MID species, is 1.36:1 --
 *     the two that share a rung do not share a proportion.
 *  5. SMOOTH OR STRUCTURED. STRUCTURED. The manual lists blazelynx under
 *     "wrongly smooth -- needs structure", and the twelve landmarks below are
 *     the answer to that. The flank between them is left completely flat.
 *  6. MASSES (5). Head; torso-with-haunch; near foreleg; near hind leg; tail.
 *     The far pair are one shadow shape behind the torso. The neck ruff is an
 *     ornament on the torso, not a mass.
 *  7. HEAD VERB: lowered -- the skull sits fourteen cells below the withers and
 *     the muzzle points down-forward. BODY VERB: walking into the hunt, weight
 *     on the near hind and the advanced near fore, so the centre of mass is
 *     forward of the midpoint between the contacts.
 *  8. SIGNATURE. Two, and both are silhouette. The ember ruff makes the neck
 *     and withers JAGGED where the rest of the animal is smooth; the tail is
 *     carried straight up with a flame on the end of it. Flat-filled you get a
 *     long-legged cat with a spiked neck and a torch behind it.
 *  9. SILHOUETTE REVERSALS -- the twelve of PART 2.2, in cells from cx / G:
 *       withers          (-20, -62) FIRST contour high point, and the higher:
 *                                    withers over croup = built to run
 *       back dip         ( -4, -56) 6-cell sag between the two high points
 *       croup            (+22, -58) second contour high point
 *       point of shoulder(-26, -52) front contour steps forward 4 cells
 *       brisket          (-24, -36) forward-most point of the lower body
 *       elbow            (-20, -32) rear edge of the foreleg steps back
 *       belly tuck       ( +6, -44) bottom contour rises 8 from the brisket
 *       point of buttock (+34, -40) rearmost point of the body
 *       stifle           (+16, -28) thigh bulges forward then cuts back
 *       hock             (+24, -13) rear edge steps back; sharpest angle
 *       paw              (+19,   0) contour steps out both sides of the ankle
 *       occiput          (-32, -57) contour dips between skull and ear root
 *       nose             (-56, -45) forward-most point of the animal
 *       stop             (-49, -56) a four-cell step from forehead to muzzle
 * 10. HUES. H1 hot orange hide (BASE #e0703a) ~50 %. H2 the deep red of the
 *     shade slot (#a03c1e) ~20 %, spent as a MATERIAL -- the neck ruff and the
 *     cheek mask -- as well as on every FORM shadow, so the second hue is a
 *     large connected region and not a rim. H3 ember gold (ACCENT2 #ffd070)
 *     ~4 %, at the tail flame and on the ruff tips, plus INNER at the nose and
 *     the ear cavities.
 *     NOTE ON THE PALETTE. This species declares a near-black in slot 4, so
 *     ACCENT resolves to the same colour as the ink and a "black marking" here
 *     would be invisible against the outline -- PART 6.3. So there is NO black
 *     face mask on this animal, which is also what fixes the merged-eye defect
 *     the manual names: the mask used to be drawn in the ink value and flooded
 *     to 23 x 11 around a 9 x 9 stamp. The cheek marking is FORM, which never
 *     inks and can never touch the eye's ink.
 * 11. FOUR DETAIL EVENTS. (a) the face -- the cheek mask and the under-jaw band
 *     count with it, because they are the same event; (b) the neck ruff; (c) the
 *     pale chest-and-belly; (d) the three cast shadows. The flank, the haunch
 *     and all four legs are left ENTIRELY FLAT, which is what the reference does
 *     with a quadruped: there is not a mark on Mightyena's body.
 * 12. EYES. `slit` at `m`, spread 6, far `m-`, tilted by the stamp. A slit
 *     shows no sclera at all, which is what a hunting animal wants, and it is
 *     the one style nothing else in this group uses. Placed at 0.36 of the
 *     skull's depth from the crown -- the mean-and-alert band -- and moved
 *     six cells forward toward the muzzle, which is the three-quarter
 *     construction rather than a front-on pair centred on a turned skull. The
 *     mark below the eyes is the nose on the muzzle: three cells, and the
 *     highest value-per-cell mark on the sprite.
 * 13. SURFACE MATERIAL: fur in exactly ONE place, the neck ruff, where it
 *     genuinely breaks the outline. There is not a hair drawn anywhere else --
 *     not on the flank, not on the tail, not on the cheeks. That is Mightyena's
 *     construction and it is what PART 7.1 asks for by name.
 * 14. INTERNAL DARK LINES: NONE. There is no jaw line and no seam anywhere on
 *     this animal, and that is a decision rather than an omission -- see the
 *     note at the under-jaw. Every dark on the creature is either a FORM region
 *     (cheek mask, under-jaw, cast shadow) or the border the internal-edge pass
 *     rules round a genuinely separate SHADE part (the ruff, the far legs). No
 *     closed loop anywhere and no `front: true` in the function.
 * 15. FIRST STAGE of the line. What carries to volcatrix: the EMBER RUFF as
 *     the silhouette signature, and the orange / deep-red / ember-gold palette
 *     relationship with the shade slot pushed deeper on the adult. What
 *     changes: horizontal to upright, four contacts to two, the torch tail to a
 *     low counterweight, and `slit` eyes to `angry` ones.
 *
 * WHAT WAS TRIED AND DROPPED.
 *  (a) The black face mask. See the palette note above.
 *  (b) `blobFront` on the haunch. It stamps a closed DEEP ring on an open
 *      flank, which is the "heart shape on the rump" the manual measured. The
 *      haunch is now part of the torso's own outline -- a silhouette bulge,
 *      free, and it survives the icon where a SHADE lozenge does not.
 *  (c) Straight two-point tubes for the hind legs. The hock reversal is nine
 *      numbers instead of four and it is the highest-value free change on any
 *      quadruped.
 *  (d) The ruff's `root: FORM` step, and `mane`'s `lit:` option for the ember
 *      tips. Both write ONE-CELL runs, `settle()` majority-filters generated
 *      body tones, and both came back dotted -- the root as a broken line down
 *      the neck and the tips as gold dust on the shoulders. The tips are now
 *      three real tongues and the root is not drawn at all.
 *  (e) Four feet on the floor. Three planted and one raised is the reference
 *      pose; four down is a table, and it also put both far feet on the ground
 *      side by side, which came back as one dark blob under the belly.
 */
function blazelynx(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The flame character pass grows tongues along the whole upper contour. On
  // this animal the heat is authored and placed -- the ruff and the tail -- and
  // a generated second set of tongues on the back is the same statement twice.
  p.noTypeTraits();

  const hdX = cx - 45, hdY = G - 47;

  /* --- THE TAIL, first, so the haunch covers its root. Carried straight up and
     slightly back: a torch, not a whip. It is the tallest thing on the sprite
     and it is meant to be the first thing seen, exactly as the Vellum entry
     says -- "you see the tail-light long before you see the animal". */
  limbPath(p, path([[cx + 25, G - 50], [cx + 31, G - 62], [cx + 33, G - 73]] as Pt[]), 13, 6, BASE);
  emberTongue(p, cx + 33, G - 72, 13, -3);

  /* --- THE FAR PAIR, in SHADE, laid down before the torso. `far()` carries the
     measured offsets on the hind leg: nine cells higher, ten forward, two or
     three narrower. The far foreleg is placed by hand for the same reason --
     the shipped roster's mean foot-row spread was 3.5 cells and six of ten
     quadrupeds registered a single merged ground contact. */
  legDigitigrade(p, ...far(cx + 20, G - 42, G, { thick: 18, ankle: 11, footHalf: 9 }, -14, -10));
  // The far foreleg is the RAISED one -- three feet planted and one lifted, per
  // PART 2.5. Four feet down is a table, and it also puts two far legs on the
  // floor side by side, which came back as one dark blob under the belly.
  limbPath(p, path([[cx - 16, G - 46], [cx - 14, G - 34], [cx - 12, G - 26]] as Pt[]), 12, 8, SHADE);
  paw(p, cx - 12, G - 23, 7, { tone: SHADE });

  /* --- THE TORSO, as ONE polygon with the shoulder and the haunch built into
     its own outline. Every vertex is a landmark from the list above; a `blob`
     throws all twelve away, which is why the previous animal had two. The back
     is not a line: withers, a six-cell sag, then a croup BELOW the withers,
     because this cat is built to run. The belly is a shallow V, deep and
     forward at the brisket and rising eight cells to the flank. */
  poly(p, [
    [cx - 26, G - 52],   // POINT OF SHOULDER -- the contour steps forward
    [cx - 20, G - 62],   // WITHERS -- the high point of the body
    [cx - 4, G - 56],    // BACK DIP
    [cx + 12, G - 59],
    [cx + 22, G - 58],   // CROUP -- the second high point, lower than the first
    [cx + 32, G - 51],
    [cx + 34, G - 40],   // POINT OF BUTTOCK -- rearmost point of the body
    [cx + 28, G - 31],
    [cx + 16, G - 28],   // STIFLE -- the thigh bulges forward, then cuts back
    [cx + 6, G - 44],    // BELLY TUCK -- the bottom contour rises to the flank
    [cx - 10, G - 45],
    [cx - 20, G - 40],
    [cx - 24, G - 36],   // BRISKET -- forward-most point of the lower body
    [cx - 27, G - 44],
  ] as Pt[], BASE);

  /* --- the neck, running forward and DOWN out of the shoulder, which is the
     head verb. A cat at a hunting walk carries its skull below the line of its
     own shoulders; carried on top it is a house pet on a mantelpiece. */
  limbPath(p, path([[cx - 24, G - 55], [cx - 33, G - 51], [cx - 40, G - 48]] as Pt[]), 24, 20, BASE);

  /* --- the pale chest and belly. ONE bounded patch with a slanted rear edge,
     running from the throat down the brisket and back along the underline. It
     stops well short of the flank: painted over the whole underside it makes a
     hot animal pale front and back with nothing for the face to sit against. */
  if (!p.back) {
    poly(p, [
      [cx - 40, G - 40], [cx - 30, G - 40], [cx - 22, G - 37],
      [cx - 8, G - 43], [cx - 10, G - 39], [cx - 24, G - 32], [cx - 38, G - 34],
    ] as Pt[], LIGHT);
  }

  /* --- THE NEAR HIND LEG: three segments with a hock reversal, which is what
     `legDigitigrade` is for and why it now has a call site. Thigh down and
     forward, shin down and back, metatarsus forward again; the hock is bitten
     into the contour as a notch so the sharpest angle on the animal is still
     there at 64 px. It throws its own cast shadow onto the torso, which is what
     replaces the closed ring of ink that used to go round every leg root. */
  legDigitigrade(p, cx + 20, G - 42, G, { thick: 20, ankle: 12, footHalf: 11 });

  /* --- THE NEAR FORELEG, ADVANCED ten cells across the chest and comparatively
     STRAIGHT -- one gentle S from shoulder to pastern. The difference between
     this and the zigzag behind it is a large part of what says "quadruped". */
  cast(p, 16, () => {
    limbPath(p, path([[cx - 22, G - 48], [cx - 28, G - 28], [cx - 32, G - 10]] as Pt[]), 16, 9, BASE);
    paw(p, cx - 33, G, 9, { tone: BASE });
  });

  /* --- THE EMBER RUFF: the species' one fur event and half its signature.
     Laid ON the contour with `contourTop`, so it follows the animal instead of
     being ruled across it, and grown in the deep-red shade slot -- which is
     this palette's genuine second hue -- with the clump tips picked out in
     ember gold, the third. Five clumps: below three reads as damage and above
     eight reads as texture. The root is a FORM step and not a DEEP seam; a
     black run along the whole root is where a great deal of the old ink went. */
  // `root: -1` and not the default FORM. The root step is written as a ONE-CELL
  // run the whole length of the path, and `settle()` majority-filters generated
  // body tones -- so a one-cell FORM run with body either side of it comes back
  // as a dotted line. Measured: it was the single largest source of specks on
  // both cats. The ruff is already a separate material against the hide and
  // needs no second statement of the same boundary.
  mane(p, contourTop(p, cx - 40, cx - 18, 3), 14, 5, SHADE, { root: -1 });

  /* --- and the EMBER TUFTS the species is named for: three tongues of the
     third hue standing out of the ruff at three sizes, rooted several cells
     INSIDE it so they are part of the same mass and cost no extra outline. The
     `mane` helper's own `lit` option puts two cells on each clump tip, and two
     cells is a speck -- rendered, it read as gold dust on the shoulders rather
     than as fire. Three real tongues is the same idea at a size that survives
     the icon. */
  for (const [tx, ty, th] of [[cx - 33, G - 62, 15], [cx - 25, G - 68, 19], [cx - 18, G - 64, 12]] as const) {
    emberTongue(p, tx, ty, th, -3);
  }

  /* --- THE HEAD. A cat's: a round cranium, a SHORT muzzle with a four-cell
     stop, and the whole thing carried low. Drawn as a `poly` because the stop,
     the brow, the cheek and the jaw are all named vertices. */
  poly(p, [
    [cx - 56, G - 45],   // nose, forward-most point of the animal
    [cx - 54, G - 52],   // top of the muzzle
    [cx - 49, G - 56],   // STOP -- a four-cell step up on to the forehead
    [cx - 42, G - 60],   // brow
    [cx - 32, G - 57],   // OCCIPUT -- the contour dips before the ear rises
    [cx - 28, G - 46],   // cheek: bulges out, then cuts in to the jaw
    [cx - 34, G - 36],   // jaw corner
    [cx - 48, G - 37],   // chin
    [cx - 54, G - 41],
  ] as Pt[], BASE);

  /* --- the ears. TWO DIFFERENT SIZES, at two heights, in two places: never a
     mirrored pair. Both roots are sunk five cells INTO the cranium so the two
     outlines are continuous -- an ear sitting on top of a skull with body
     colour between them is a paper cut-out. The interior is ONE dark cavity. */
  earPointed(p, cx - 32, G - 55, 15, 5, 1, { inner: INNER });
  earPointed(p, cx - 45, G - 57, 20, 6, -1, { inner: INNER });

  if (p.back) { p.face(hdX, hdY, 18); return; }

  /* --- the cheek mask: the deep red again, as a MATERIAL on the face, with a
     hard slanted rear edge running down-and-forward from behind the eye to
     under the jaw. That slant is the whole difference between bone and a
     stain, per PART 5.3. FORM and not SHADE, deliberately: FORM never inks, so
     this marking can never fuse with the eye stamp's own ink -- which is the
     exact defect the manual measured on this species. */
  poly(p, [
    [cx - 37, G - 57], [cx - 29, G - 52], [cx - 28, G - 45],
    [cx - 34, G - 37], [cx - 40, G - 41], [cx - 40, G - 50],
  ] as Pt[], FORM);

  /* --- THE UNDER-JAW, which PART 5.2 makes the darkest part of any head, as a
     FORM band with no line round it.
     There is NO `jawLine()` on either cat, and the reason is worth writing
     down. A jaw line has to terminate on the outer silhouette at both ends, and
     on this head the rear contour of the skull is covered along its whole
     length -- by the neck below, by the ruff above it and by two ears on top.
     `occlude()` said so at build time. The manual's own rule is then explicit:
     an internal dark line with a loose end is deleted, not shortened. What the
     jaw line was there to do is done here instead by three tonal events with no
     ink at all -- the cheek mask above, this band under the jaw, and the
     muzzle's own cast shadow onto it. */
  poly(p, [
    [cx - 47, G - 38], [cx - 36, G - 37], [cx - 32, G - 42], [cx - 33, G - 39],
    [cx - 37, G - 35], [cx - 47, G - 36],
  ] as Pt[], FORM);

  /* --- the face. `slit`, tilted, both catchlights on the same side, the pair
     moved forward toward the muzzle. */
  eyeRow(p, cx - 43, G - 51, 8, 'slit', 'm', { far: 'm-' });

  /* --- the muzzle: a short pale wedge with a SLANTED rear edge, its top plane
     level with the bottom of the eye, throwing its own shadow onto the jaw
     beneath it. `detail: true` puts the nose on it -- the ONE mark below the
     eyes, and there is no mouth line as well. */
  muzzle(p, cx - 50, G - 43, 8, 5, { tone: LIGHT, slant: 0.8, detail: true });
}

/* ============================================================ volcatrix */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IT IS. The ridge cat stood up to fight: braced wide on two
 *     digitigrade legs, weight low and forward, one banded forearm out in a
 *     guard and the other cocked at the hip, the ember ruff grown from a neck
 *     tuft into a full shoulder collar.
 *  2. PLAN. E, the animal-shaped biped. Obeys it: the weight is over the feet,
 *     the heavy tail balances a torso that leans forward, the vertical stack is
 *     legs / torso / head with the torso the largest and the head about a
 *     quarter of the height, and the arms are short and held in front. It is
 *     deliberately NOT plan F -- there is no horizontal shoulder line and no
 *     symmetry. This is a cat that has learned to stand, which is exactly what
 *     the Vellum entry says.
 *  3. RUNG. HUGE (1.7 m). This is the one species where the rung band and the
 *     `fitToCell` clamp collide: HUGE wants 112-128 cells in the long dimension
 *     and the clamp will not take more than 110 in HEIGHT or 120 in width. So it
 *     is built WIDE and the braced fighting stance is what pays for the width.
 *     MEASURED: 113 x 108, long dimension 113 -- inside the HUGE band, inside
 *     the clamp on both axes, and nothing is resampled. Body 1692 ref px, a
 *     hundred short of the HUGE floor of 1800 and the one number in this file
 *     that misses its band; the alternative was to fatten the animal past the
 *     clamp, and a resampled sprite is the worse failure.
 *  4. ASPECT / FILL. MEASURED 1.05:1 at fill 0.55. Alone on the HUGE rung, so
 *     PART 1.4's same-rung rule does not bite; against the first stage the box
 *     is the same ratio but 13 cells wider and 13 taller, and the mass inside it
 *     has moved out of four long legs into a torso and a pair of arms.
 *  5. SMOOTH OR STRUCTURED. STRUCTURED. Named landmarks throughout, and the
 *     manual lists volcatrix under "wrongly smooth -- needs structure".
 *  6. MASSES (6). Head; torso with the collar; near arm; far arm; near leg;
 *     far leg. The tail is the seventh and it is the ceiling.
 *  7. HEAD VERB: level and forward -- squared up, chin down, looking straight
 *     out of the sprite. BODY VERB: braced. The two feet are fifty-eight cells
 *     of clear floor apart and the centre of mass sits forward of the midpoint
 *     between them, over the leading leg.
 *  8. SIGNATURE. The ember collar off the shoulders -- carried over from
 *     blazelynx's neck ruff and grown by half -- plus the wide braced stance.
 *     Flat-filled it is an A of legs under a burning collar with one fist out
 *     in front of it, and nothing else on the roster is that shape.
 *  9. SILHOUETTE REVERSALS (12 named, cells from cx / G):
 *       ear tip          (-31, -99) highest point of the animal
 *       occiput dip      (-12, -87) contour dips between skull and ear root
 *       stop             (-32, -87) four-cell step down on to the muzzle
 *       jaw corner       (-14, -67) lowest point of the head
 *       near shoulder    (-18, -74) breaks the chest line, forward of the torso
 *       chest            (-24, -68) forward-most point of the torso
 *       waist            (-16, -56) contour cuts back three cells
 *       hip              (-14, -50) and back out again
 *       near knee        (-22, -32) thigh's front edge, then it cuts back
 *       near hock        (-14, -14) rear edge steps back; sharpest angle
 *       near paw         (-28,   0) contour steps out both sides of the ankle
 *       far paw          (+30,  -8) EIGHT CELLS HIGHER than the near one
 *     Plus the fist, the widest point on the left, at (-44, -47), and the tail
 *     flame, the widest on the right, at (+52, -42).
 * 10. HUES. H1 hot orange hide (BASE #e06a34) ~48 %. H2 the deep red of the
 *     shade slot (#8f3218 -- deliberately deeper than blazelynx's #a03c1e)
 *     ~20 %: the shoulder collar, the three forearm bands and every FORM
 *     shadow. H3 ember gold (ACCENT2 #ffcc60) ~4 % at the collar tongues and
 *     the tail flame, plus INNER at the mouth and the ear cavities.
 *     Same palette note as blazelynx: slot 4 is a near-black that resolves to
 *     the ink, so there is no black marking anywhere on this animal. TRIED AND
 *     REVERTED: the feet and the fist painted in ACCENT as charcoal boots and
 *     gauntlets. Rendered, they came back as HOLES -- a large region of the
 *     outline's own colour inside the outline reads as a hole punched in the
 *     sprite, not as a dark material. The accent family survives only where the
 *     manual actually puts it, on the claw: `claw()` writes ACCENT_LIT along the
 *     lit edge, ACCENT along the other and ACCENT_DARK at the root, which is
 *     three tones of a warm grey on a shape that crosses the outline.
 * 11. FOUR DETAIL EVENTS. (a) the face, with the cheek-and-jaw band; (b) the
 *     collar; (c) the three forearm bands; (d) the pale chest plate. Flanks,
 *     thighs and tail are flat.
 * 12. EYES. `angry` at `m`, spread 8, far `m-`, `brow: EYE_DARK`. `angry` is
 *     the one asymmetric stamp and the brow IS the expression -- 35 % of the
 *     read, more than the tilt and far more than the size. Deliberately a
 *     different shape from blazelynx's `slit`: an evolution must not be the
 *     first stage scaled up, and the face is where that reads first. The mark
 *     below the eyes is a closed, level mouth on the muzzle -- one mark, and
 *     there is no nose as well.
 * 13. SURFACE MATERIAL: fur in ONE place, the shoulder collar, where it makes
 *     the outline jagged. Nothing on the flanks, the thighs or the tail.
 * 14. INTERNAL DARK LINES: NONE, for the same reason as blazelynx -- see the
 *     note at the cheek band. Every dark here is a FORM region or the border
 *     the internal-edge pass rules round a real SHADE part (the collar, the far
 *     leg, the far arm, the forearm bands). No `front: true` anywhere in the
 *     function and no closed loop of ink on any open surface.
 * 15. SECOND STAGE. CARRIED OVER, and only these two: the ember tuft crest as
 *     the silhouette signature, and the orange / deep-red / ember-gold palette
 *     relationship with the shade slot pushed deeper. CHANGED: horizontal to
 *     upright; four ground contacts to two; a torch tail carried high to a
 *     heavy counterweight carried low; `slit` eyes to `angry`; the crest
 *     migrated from the neck to the shoulders, where it reads as armour rather
 *     than as a hackle; and the forelegs became arms with hands.
 *
 * WHAT WAS TRIED AND DROPPED.
 *  (a) A black face mask and black forearm bands. Slot 4 is the ink on this
 *      palette, so both were invisible; the bands are now the deep red the
 *      manual asks for by name and the mask is gone.
 *  (b) `front: true` on the guard arm. The arm crossing the chest is the
 *      occlusion this pose is made of, but a closed ring is not how to say it:
 *      the arm now throws a real cast shadow onto the chest.
 *  (c) The feet drawn as pads the same width as the ankle. A foot is 60-100 %
 *      wider than the ankle and that step IS the foot.
 */
function volcatrix(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The flame pass grows tongues along the whole upper contour, which on this
  // animal is the collar -- already the loudest thing on the sprite. The heat
  // here is authored and placed.
  p.noTypeTraits();

  /* --- THE TAIL, first and behind everything. Low, thick and swept back: a
     counterweight for a torso that leans forward, which is what plan E demands
     and what the first stage's upright torch cannot do. That change of tail is
     one of the things the evolution is FOR. */
  limbPath(p, path([[cx + 14, G - 48], [cx + 30, G - 40], [cx + 43, G - 33]] as Pt[]), 21, 8, BASE);
  emberTongue(p, cx + 44, G - 33, 14, 5);

  /* --- THE FAR LEG, braced back and out, in SHADE and landing eight cells
     higher than the near one. Three segments with a hock reversal, same as the
     near leg but shorter and narrower: the far side of a turned animal is
     smaller as well as darker. */
  limbPath(p, [[cx + 6, G - 46], [cx + 22, G - 30]] as Pt[], 25, 18, SHADE, { bulge: 3 });
  limbPath(p, [[cx + 22, G - 30], [cx + 16, G - 18]] as Pt[], 18, 12, SHADE);
  limbPath(p, [[cx + 16, G - 18], [cx + 28, G - 11]] as Pt[], 12, 11, SHADE);
  paw(p, cx + 30, G - 8, 13, { tone: SHADE });

  /* --- THE FAR ARM, cocked back at the hip: SHADE, short, and mostly hidden
     behind the torso. */
  limbPath(p, path([[cx + 6, G - 68], [cx + 20, G - 58], [cx + 19, G - 48]] as Pt[]), 16, 12, SHADE);
  blob(p, cx + 18, G - 45, 10, 10, SHADE);

  /* --- THE TORSO. A deep cat's chest over a narrow waist, leaning forward over
     the hips -- not a bodybuilder's slab. The near shoulder BREAKS the chest
     line, which is one of the three decisions a three-quarter view is made of.
     Every vertex is one of the named landmarks above, and the torso is the
     LARGEST of the three stacked masses, per plan E. */
  poly(p, [
    [cx - 22, G - 62],   // NEAR SHOULDER -- forward of the torso, breaking the chest line
    [cx - 8, G - 68],    // neck root
    [cx + 10, G - 64],   // far shoulder, lower and set back
    [cx + 20, G - 54],   // back
    [cx + 18, G - 44],   // hip, rear
    [cx + 8, G - 38],
    [cx - 8, G - 38],    // crotch
    [cx - 18, G - 44],   // HIP -- the contour steps forward
    [cx - 20, G - 52],   // WAIST -- and cuts back three cells above it
    [cx - 29, G - 60],   // CHEST -- forward-most point of the torso
  ] as Pt[], BASE);

  /* --- the pale chest plate. One bounded patch with a slanted lower edge, high
     on the ribcage where a cat's pale bib actually is, stopping well short of
     the waist so the orange stays the majority colour. */
  if (!p.back) {
    poly(p, [
      [cx - 25, G - 61], [cx - 9, G - 64], [cx - 5, G - 50],
      [cx - 13, G - 45], [cx - 22, G - 51],
    ] as Pt[], LIGHT);
  }

  /* --- THE NEAR LEG, braced forward and out, three segments with the hock
     reversal. Thigh down and FORWARD, shin down and BACK, metatarsus forward
     again; `bulge` on the thigh only, and the segment ends at the JOINTS --
     joints narrow, muscle bellies widen between them, and getting that
     backwards is what turned voltwick into a balloon poodle. It throws its own
     cast shadow onto the torso and the far leg behind it. */
  cast(p, 30, () => {
    limbPath(p, [[cx - 6, G - 46], [cx - 22, G - 28]] as Pt[], 30, 22, BASE, { bulge: 4 });
    limbPath(p, [[cx - 22, G - 28], [cx - 14, G - 12]] as Pt[], 22, 15, BASE);
    limbPath(p, [[cx - 14, G - 12], [cx - 26, G - 5]] as Pt[], 15, 13, BASE);
    // The hock is the sharpest angle on the animal: bite it into the contour so
    // it is still there at 64 px.
    notch(p, cx - 8, G - 13, 11, 6, -1, 0);
  });
  // No `claws` on the foot. `paw` puts one three-tone claw under every toe,
  // inside the pad, where a claw is invisible anyway -- and measured they were
  // nine of this sprite's small regions for no read at all. The claws that show
  // are the two on the fist, which cross the outline.
  paw(p, cx - 28, G, 14, { tone: BASE, toes: 3 });

  /* --- THE NEAR ARM: the guard. Elbow tucked in, forearm driven forward and
     down, fist closed and well out past the body line -- and carried BELOW the
     jaw, not across it: the first version put the fist over the muzzle and the
     face disappeared behind its own hand. It casts onto the chest, which is
     what puts it in front; an ink ring round the shoulder says the same thing
     louder and worse. */
  cast(p, 18, () => {
    limbPath(p, path([[cx - 20, G - 60], [cx - 29, G - 54], [cx - 39, G - 49]] as Pt[]), 18, 13, BASE);
    hand(p, cx - 44, G - 47, 11, { tone: BASE, side: -1, fist: true });
  });
  claw(p, cx - 52, G - 51, 6, -0.8, -0.5, ACCENT_LIT);

  /* --- THREE BANDS on the forearm, in the deep red -- the brief says "banded
     forearms" and three bars is the whole of it. They run across the limb, both
     ends on its own outline, so none of them is a closed loop; and they are the
     second hue appearing as a MATERIAL on a limb rather than as a shadow. */
  for (let i = 0; i < 3; i++) {
    const t = 0.14 + i * 0.3;
    const bx = lerp(cx - 28, cx - 42, t), by = lerp(G - 55, G - 48, t);
    poly(p, [
      [bx - 2, by - 8], [bx + 1, by - 9], [bx + 3, by + 6], [bx, by + 7],
    ] as Pt[], SHADE);
  }

  /* --- THE COLLAR: blazelynx's neck ruff, moved to the shoulders and grown by
     half. Laid on the shoulder contour so it follows the animal, in the deep
     red, with THREE ember tongues of three different lengths standing out of
     it in the third hue. This is the ONE fur event on the creature. */
  mane(p, contourTop(p, cx - 20, cx + 16, 3), 11, 5, SHADE, { root: -1 });
  // The tongues are rooted ON THE RUFF'S OUTER EDGE, not inside the shoulder.
  // Rooted inside they were invisible in the flat test -- and a signature that
  // does not survive the flat test is not a signature, it is a marking.
  for (const [tx, ty, th, tl] of [
    [cx - 6, G - 75, 17, -3], [cx + 5, G - 73, 21, 3],
    [cx + 16, G - 65, 15, 7],
  ] as const) {
    emberTongue(p, tx, ty, th, tl);
  }

  /* --- THE HEAD, carried level and forward on a short thick neck, and about a
     fifth of the total height -- plan E's proportion. A cat's skull: round
     cranium, SHORT muzzle, a four-cell stop, chin tucked down. Drawn smaller
     relative to the torso than the first attempt, which came back reading as a
     horse. */
  limbPath(p, [[cx - 8, G - 70], [cx - 15, G - 74]] as Pt[], 21, 20, BASE);
  poly(p, [
    [cx - 34, G - 78],   // nose
    [cx - 32, G - 84],   // top of the muzzle
    [cx - 27, G - 88],   // STOP -- a four-cell step up on to the forehead
    [cx - 20, G - 92],   // brow
    [cx - 8, G - 89],    // OCCIPUT -- the contour dips before the ear rises
    [cx - 4, G - 79],    // cheek
    [cx - 10, G - 70],   // JAW CORNER -- lowest point of the head
    [cx - 25, G - 71],   // chin
    [cx - 32, G - 74],
  ] as Pt[], BASE);

  /* --- the ears: two sizes, two heights, two places, both roots sunk five
     cells into the cranium so the outlines are continuous, one dark cavity
     inside each. Swept back, which is the ear blazelynx has -- half of the
     line's carried silhouette signature. */
  earPointed(p, cx - 9, G - 85, 9, 5, 1, { inner: INNER });
  earPointed(p, cx - 21, G - 87, 11, 6, -1, { inner: INNER });

  if (p.back) { p.face(cx - 20, G - 83, 20); return; }

  /* --- the under-jaw and the cheek, as ONE FORM band with a slanted rear edge.
     Same reasoning as blazelynx: no `jawLine()`, because the rear of this skull
     is covered by the neck and the collar and a line there has a loose end.
     FORM never inks, so this can never fuse with the eye stamp's ink either --
     which is the merged-eye defect the manual measured on this line. */
  poly(p, [
    [cx - 26, G - 71], [cx - 14, G - 69], [cx - 8, G - 76], [cx - 10, G - 73],
    [cx - 16, G - 67], [cx - 27, G - 69],
  ] as Pt[], FORM);

  /* --- the face. `angry`: a brow line, a blank row of face under it, then a
     slit opening. The brow is drawn in the ink value so it reads as bone at
     icon scale, and there is a clear row of orange between it and the lid --
     that gap is the whole difference between a brow and a helmet. */
  eyeRow(p, cx - 20, G - 83, 8, 'angry', 'm', { far: 'm-', brow: EYE_DARK });

  /* --- the muzzle: short, pale, slanted rear edge, top plane at the bottom of
     the eye, throwing its shadow onto the jaw. `mouth: true` and `detail` off:
     ONE mark below the eyes and never two, and on a squared-up fighter the mark
     is a level closed mouth rather than a nose. */
  muzzle(p, cx - 27, G - 75, 7, 5, { tone: LIGHT, slant: 0.8, mouth: true, frown: 0 });
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  blazelynx,
  volcatrix,
  emberbore,
  sootmoth,
  gravelet,
};
