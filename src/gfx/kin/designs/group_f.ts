/**
 * Design group F -- the six minerals, drawn again from the rock outwards.
 *
 * ===================================================================
 * ROUND 8 WAS A POLISH PASS AND IT TOUCHED EXACTLY ONE SPECIES.
 * ===================================================================
 *
 * The brief was FORM PATCHES READING AS STAINS: a dark region that starts and
 * stops in the middle of a flat surface is a mark ON the creature rather than a
 * property OF it. Every FORM region in this file was re-checked against that
 * test at 1x and at 4x and all of them pass, because all of them were already
 * built the same way -- the far plane of a mass, with its OUTER edge on the
 * silhouette for the whole of its long side and only its inner edge free. The
 * plinth and slab of cairnling, the far flank of chalkid, the far side of the
 * chalkmar mantle, the shank and stock and far cheek of anchorling, the
 * underside of pebblet: nothing was deleted and nothing was extended. Five of
 * six were left completely alone, which was the right answer for them.
 *
 * `menhir` was rebuilt, for the fourth time, and the reason is written out in
 * full above the function. The short version is the one general finding of the
 * round, and it is not about tone at all:
 *
 *   A STRAIGHT LINE THAT SPANS MOST OF THE SPRITE IS A MANUFACTURED JOINT.
 *
 * Round 7's menhir had five of them -- a plinth top, a shoulder step, a panel
 * hypotenuse, a panel base, and two parallel flanks -- and at 1x the creature
 * was an arcade cabinet. The tones were all correct. The geometry was a
 * machine. Straightness is a property the eye reads before it reads colour, it
 * is the single loudest "made by people" cue there is, and no amount of
 * material, hue or shading survives it on a species whose whole concept is
 * rough-hewn rock.
 *
 * ROUND 7 SITS ON TOP OF ROUND 6. READ THIS PART FIRST; it cost the most to
 * learn and it is true of every design file in the roster, not only this one.
 *
 * ===================================================================
 * JUDGE AT 1x. THE ZOOM RENDER HAS BEEN LYING TO US FOR THREE ROUNDS.
 * ===================================================================
 *
 * Round 6 evaluated this whole group at Z=8, wrote down that the faces looked
 * fine, and shipped four creatures whose eyes merge into one bar at the size
 * the game actually draws them. The zoomed render is not a different picture
 * -- `zoomN` is a nearest-neighbour magnification of the same 128 cells -- but
 * it is a different PERCEPTION, and the only question worth asking about an
 * eye is a perceptual one. At 8x you see two almonds with five cells of face
 * between them. At 1x those five cells are two and a half reference pixels and
 * the two almonds are one mark.
 *
 * The measurement that catches it, taken off the reference: TWO EYES AND THE
 * GAP BETWEEN THEM COME TO ABOUT HALF THE WIDTH OF THE SKULL, and there is
 * clearly lit face outboard of each eye as well as between them. Measured on
 * this group as round 6 shipped it:
 *
 *                    ink span / head width    lit face outboard the near eye
 *   chalkmar                79 %                        1.5 cells
 *   cairnling               69 %                        2.8 cells
 *   pebblet                 44 %                        2.5 cells
 *   chalkid          one `sleepy` letterbox on a flat cream plate
 *
 * All four are fixed by moving the pair inboard and dropping one rung on the
 * size ladder. Not one of them needed a better stamp. The numbers after the
 * fix are written into each species' note 12 and they are what to re-measure,
 * in that order, before touching anything else on a face.
 *
 * ===================================================================
 * A SATURATED STRIP LAID ACROSS A BODY IS AN OBJECT, NOT A MARKING.
 * ===================================================================
 *
 * The second round-7 finding, and it cost five attempts across two species in
 * one afternoon. chalkid's ochre seam and menhir's copper stratum were both
 * drawn as a BAND: a bar of the second hue crossing the body with the first
 * hue above it and below it. At 1x that construction does not read as a mark
 * on a creature. It reads as a separate thing, and which thing depends only on
 * where you put it -- a basket at the waist, a sombrero at the shoulders, a
 * plank held across the chest corner to corner, an arm holding a stick once a
 * vein rises out of one end. No thickness, tilt, dip or tone fixes any of them,
 * because none of them is a tone problem.
 *
 * Two constructions do work and both were already in this file:
 *   - THE MATERIAL SPLIT. One long straight arris, with the second stone
 *     filling a CORNER out to the silhouette on two sides. That is pebblet's
 *     snapped sandstone face and it is now also menhir's copper.
 *   - THE MANTLE. The second material CAPS the creature and the first comes
 *     out from under it. That is chalkmar's slate over chalk and it is now
 *     also chalkid's ochre, worn over both shoulders and down the far flank.
 *
 * ===================================================================
 * AND THREE CREATURES WERE REBUILT, NOT ADJUSTED.
 * ===================================================================
 *
 *   chalkid    was a cream egg with a horizontal slot in it. Body plan D --
 *              "commit to the single mass" -- had been obeyed until there was
 *              nothing left to look at: no limbs, no head, no structure. It is
 *              a chalk GOLEM now, which is what it always was in the species
 *              text: head on a neck, torso, two legs, two arms with the near
 *              one thrown up. Plan D is for a creature whose concept IS one
 *              surface. It is not a licence to delete anatomy.
 *   menhir     was a bell. Round 5 drew a carved idol with a face and nobody
 *              complained; round 6 took the face away per the eye brief's rule
 *              for a species with no face and tapered the body in one unbroken
 *              curve from a 90-cell foot to a 36-cell neck. Lunatone's rule
 *              does not transfer to a TALL creature: a tall thing has a top,
 *              and a tall thing with one small mark near its top is a signpost.
 *              It has parallel sides, a hard shoulder step and Nosepass' face.
 *   anchorling had read as "an anchor with a face" for four rounds because it
 *              had no HEAD END -- the eye was a lens set into a flat plate
 *              halfway down a straight bar with a crossbar directly above it.
 *              The shank's top is a skull now, the stock crosses BELOW the
 *              chin instead of above the eye (a horizontal bar under a head is
 *              a pair of shoulders; the same bar above a head is a hat), the
 *              ring is a crest set high through the back of the skull, and it
 *              strides.
 *
 * ROUND 6, BELOW, AND STILL TRUE. THE ONE THING THAT WAS WRONG WITH ALL SIX.
 *
 * Render the previous version of this file and every creature in it is wearing
 * a pair of sunglasses. That is not a figure of speech: pebblet, cairnling,
 * menhir, chalkid, chalkmar and anchorling each painted a dark horizontal band
 * across the head as a "mineral visor", the eye stamps landed on top of it, and
 * the two events merged into one wide black bar with two lighter slots in it.
 * The manual names it on menhir and it was true of the whole group. Nothing in
 * this file paints a band across a face any more. Where a species has no face
 * it gets one enormous `gem` and nothing else, which is Lunatone.
 *
 * AND A FINDING THAT COST AN AFTERNOON AND SHOULD NOT COST ANOTHER ONE:
 * **A PAIR OF `slot` EYES IS A PAIR OF SUNGLASSES, ON ITS OWN, WITH NOTHING
 * PAINTED BEHIND IT.** The eye brief sends all six of this group to `slot`,
 * and the reasoning is sound -- it is Nosepass, it is the mineral eye, and it
 * cannot merge with a marking because it has no catchlight to lose. But `slot`
 * at `m` is an eleven-by-five block of solid ink, and two of them side by side
 * on one flat face is the exact shape the player complained about, whether or
 * not there is a band under them. All four of the faced species were drawn that
 * way, rendered at 8x, and looked identical to the thing being fixed.
 *
 * What works, chosen by looking at 1x: a LIDDED stamp on a face with room
 * round it. A lid line, an iris and a catchlight break the block into parts
 * and the pair stops being a bar. This group runs five eye constructions over
 * six species -- `hooded` (pebblet), `angry` (cairnling), `round` (chalkid),
 * `slit` (chalkmar), `slot` (menhir), `gem` (anchorling) -- and that variety is
 * itself worth having, since giving a stone, a nodule and a walker the same eye
 * is the finding the eye brief opens with.
 *
 * ROUND 7 PAID THE SLOT PRICE ON MENHIR, and it is worth recording that the
 * round-6 note named the terms exactly: "Nosepass gets away with it because its
 * slots are tiny against an enormous face and there is a huge red nose between
 * them. If a future author wants the `slot` back, that is the price: a face
 * wide enough that the two bars are a small part of it." Paid. Menhir's head is
 * 51 cells across, each slot paints SEVEN cells of ink, there are FIFTEEN cells
 * between them with a copper nose standing in the gap, and eleven or more cells
 * of lit stone outboard of each. It is also the only genuinely head-on face in
 * the group, so it passes no `far` and gets no farRise: a carved symmetric
 * mineral is one of the six reference eyes that is not tilted.
 *
 * THE SECOND THING, AND IT IS THE REASON THE GROUP LOOKED SOFT. Six rocks were
 * being airbrushed. `menhir`, a standing stone, shipped with six vertical
 * gradient stripes across its face and `EDGE` as its single most common colour
 * at 21 %. A rock does not have a gradient on it. A rock is a small number of
 * FLAT PLANES meeting at hard arrises, and the step between two planes IS the
 * arris -- you do not also draw a line on it. `flat()` did not exist when this
 * file was last written; now it does, and every stone surface in here is
 * inside one. The consequence is that these six sprites have almost no
 * generated shading at all: what you see is four or five named facets, two or
 * three cast shadows, and nothing else. That is the Nosepass/Lunatone/Regirock
 * construction and it is why those sprites read as hard.
 *
 * THE THIRD THING: they were grey. Measured base chroma was pebblet 6,
 * cairnling 8, menhir 8, chalkmar 12. The manual's rule for the stone type is
 * "never neutral -- pick one", and every one of these now has a real hue with
 * chroma 45-70, plus a genuine second mineral at 15-25 % of the sprite and a
 * third at 2-6 %.
 *
 * WHERE THE PALETTES COME FROM. Each species writes its own six-slot palette
 * at the top of its design function. That is deliberate and it is explained
 * once here: `paletteOf()` is read at the very end of `build()`, long after the
 * design has run, so a design can author its own colours; and the six-slot form
 * (base / shade / light / accent / accent2 / ink) is what stops the accent
 * being silently promoted to the ink, which is what was throwing pebblet's and
 * cairnling's third colour away. When the roster's `species.json` palettes are
 * re-authored these blocks become dead weight and should be deleted, but they
 * must not be deleted before that, or six stones go back to being grey.
 *
 * THE SIX, AND WHY YOU CANNOT CONFUSE THEM AT 64 px:
 *
 *   pebblet     TINY, 68 x 56, wide and low. A fist-sized cobble squatting on
 *               two stubs, its back third SNAPPED off along one straight
 *               diagonal to a raw sandstone face, with two gold quartz crystals
 *               growing out of the break. Slate-blue. `hooded`.
 *   cairnling   MID, 95 x 89, tall and stepped. Three loose stones stacked into
 *               a waymarker and standing up: a wide plinth, a body slab shoved
 *               off its axis, a cap tipped back, and one long arm of rock
 *               thrown out at chest height, pointing. Sandstone, with slate
 *               slabs and moss in the joints. `angry`.
 *   menhir      HUGE, 96 x 108. One slab with PARALLEL SIDES and a hard ten-
 *               cell shoulder step where the head starts, top snapped into two
 *               uneven peaks, a flared stepped footing, the lower-left corner
 *               cut off along one arris to raw copper -- and a carved IDOL FACE:
 *               two slots under a brow ledge with an enormous copper nose
 *               between them. Blue-grey. `slot` at `m`, head-on, no `far`.
 *   chalkid     SMALL, 76 x 83, tall. A chalk GOLEM: a broken-crowned head on a
 *               real neck, a torso, two legs and two arms with the near one
 *               thrown up past the crown, an ochre mantle over both shoulders
 *               and down the far flank, a flint core showing in the crown
 *               break. The only one of the six with a mouth. `round` at `s`.
 *   chalkmar    LARGE, 119 x 74, long and low. A four-legged walker under a
 *               mantle of quarried slate that serrates into five back-leaning
 *               rust plates, rust at the mantle's rim, chalk-white underneath,
 *               head carried low and forward. `slit`.
 *   anchorling  LARGE, 87 x 110. An iron anchor with a HEAD: a 48-cell skull on
 *               top of the shank, the ring set high through the back of it as a
 *               crest with a real hole of sky in the middle, the stock crossing
 *               BELOW the chin as a yoke, and two arms and flukes striding --
 *               near one planted and splayed, far one trailing and clear of the
 *               floor. Green crust from the waist down. `gem` at `xl`.
 *
 * Six footprints, six proportions, five eye constructions.
 *
 * THE FAMILY THREADS.
 *
 *   pebblet -> cairnling -> menhir carries THE SNAPPED CROWN: a top contour
 *     broken into two uneven peaks with a notch between them, the taller peak
 *     always toward the front. It is a silhouette fact, it costs three
 *     coordinates and it survives the icon. Everything else changes -- pebblet
 *     is a squat wedge, cairnling is a stack of three, menhir is one
 *     monolithic slab. The palette relationship is A STONE PLUS A WARM
 *     MINERAL INCLUSION, and the two swap places across the first evolution:
 *     pebblet is slate-blue with sandstone in the break, cairnling is
 *     sandstone with slate on top, menhir goes back to blue-grey with copper.
 *
 *   chalkid -> chalkmar carries THE OCHRE MANTLE. On the child it lies over
 *     both shoulders and down the far flank; on the adult the same ochre is the
 *     rusted rim of a full slate mantle running the length of the animal. It is
 *     the same construction at two sizes -- the second material caps the
 *     creature and the first comes out from under it -- and on the child that
 *     is the ONLY construction that survived: see the round-7 note at the top
 *     of this file about strips laid across bodies. The
 *     chalk itself demotes from the body colour to the underbody, which is the
 *     "keep one hue, change the area shares by 2x" rule, and it is also the
 *     answer to the pale-species problem: a near-white creature holds contrast
 *     by being given a dark NEIGHBOUR, never by a heavier outline.
 *
 * WHAT IS DELIBERATELY ABSENT. All six call `p.noTypeTraits()`. The stone and
 * iron character passes scatter random facet seams over the body and knock
 * two-cell chips out of the silhouette every eleventh edge point. On a faceted
 * grey creature that is indistinguishable from damage, and it is exactly the
 * "dots on every creature" the player named. A rock convinces through the
 * planes an author cut on purpose, never through random ones.
 *
 * WHAT WAS TRIED AND THROWN AWAY, so nobody spends the afternoon again:
 *   - Shading the stone (no `flat()`): every rock came back as a pillow. The
 *     light pass is right for flesh and wrong for anything with an arris on it.
 *   - A pale lit lip along each facet ridge: three cells to say what the value
 *     step already says, and at 64 px the lip is the only part that survives,
 *     so the rock reads as a wireframe.
 *   - Quartz/ore drawn in `ACCENT` rather than the fixed `ACCENT_LIT`/`_DARK`
 *     pair: a crystal that takes the room's light is a wet leaf. A crystal
 *     makes its own.
 *   - Symmetric flukes on anchorling and a symmetric stack on cairnling: two
 *     of anything at the same size, same height and same distance out is the
 *     loudest generated-art tell there is.
 *   - `slot` eyes on all four faced species. See the note at the top.
 *   - A large `ACCENT_LIT` plane on a slate stone. On a warm-lamped species
 *     `ACCENT_LIT` is the accent mixed 55 % toward cream, so a blue-grey slab
 *     lit that way comes out a pale warm GREY -- the exact desaturation this
 *     group was marked down for. `ACCENT_LIT` is now used on cairnling's crown
 *     only, at about 40 cells.
 *   - A SHADE buttress standing against a FORM plane on menhir. `SHADE` and
 *     `FORM` resolve to the same palette slot, so the part and the plane were
 *     the same colour and only the ink told them apart. Replaced with a
 *     stepped footing, which is also 1400 cells of the area the rung wanted.
 *   - Leaving chalkid out of `flat()` so the light pass could band it as a
 *     sphere. The pass put a field of fine diagonal speckle across the whole
 *     lower body. The two lines are separated by their CONTOUR instead --
 *     pebblet's is all straight segments, chalkid's is all curve.
 *   - chalkid's ochre worn as a BAND, in four different places, over three
 *     rounds: level at the shoulders (a sombrero), level at the waist (a
 *     basket), corner to corner across the chest (a plank it was carrying),
 *     filled from a diagonal down to the hips (a tub it was standing in). It
 *     is a MANTLE now. See the round-7 note at the top of the file.
 *   - menhir's copper as a dipping stratum with a vein rising out of its near
 *     end: the two together read at 1x as an arm holding a stick. Same finding,
 *     different species, same afternoon. It is a cut corner now.
 *   - A `gem` at `xl` as the only feature on a TALL creature (menhir, round 6).
 *     Lunatone gets away with one disc because the whole body is the head and
 *     the eye is in the middle of it. Put the same disc near the top of a
 *     108-cell standing shape and you have a signpost, not a cyclops.
 *   - anchorling's ring level with its eye: a dark disc and a hole of sky at
 *     the same height on one head is a face with two eyes, one of which you can
 *     see through. Lifted thirteen cells it is a crest.
 *   - cairnling's arm raised to shoulder height: it ran through the same rows
 *     as the nose and the two slate masses fused into one horizontal bar
 *     through the middle of the sprite.
 *
 * MEASURED AFTER ROUND 7, through the real factory, front view, all six.
 * `F_meas.mjs` in the render harness. Roster figures in brackets are the
 * round-5 means the acceptance criteria were written against.
 *
 *                     peb   cai   men   chk   cma   anc   target
 *   body cells       2689  5443  7556  4404  5827  5934   monotonic by rung
 *   bbox w x h       72x60 99x93 96x108 76x83 123x78 87x110
 *   BASE %           24.3  27.8  35.5  39.2  34.8  23.9   >= 25   [14.4]
 *   H2 %             16.3  27.1  18.6  16.4  21.7  13.1   15-30   [7.8]
 *   H3 %             11.1   3.9   2.2   1.7   2.2   2.8   2-6
 *   hues (>= 25 deg)    3     3     3     3     3     3   3       [1.63]
 *   INNER %           1.0   0.5     -   0.5   0.3   0.2   0.5-2.5 [0.7]
 *   total ink %      25.5  21.0  14.1  23.1  23.9  27.1   <= 28   [32.4]
 *   most common      BASE  BASE  BASE  BASE  BASE  BASE   never a line colour
 *   SPEC cells          0     0     0     0     0     0   0       [352]
 *   tone changes/row  1.8   1.7   1.9   1.7   2.4   1.6   <= 4    [8.2]
 *   body runs         237   351   392   339   415   511   <= 250  [720]
 *   runs <= 3 cells % 30.8  18.8  23.7  24.8  28.7  26.2  <= 20   [63]
 *   largest region %  16.2  25.3  16.3  16.1  11.9  19.0  >= 25   [15.1]
 *   top three %      36.3  37.8  42.2  41.1  27.6  42.4   >= 50   [28.1]
 *   colour regions     58    83    68    92    93   127   <= 80   [256]
 *   base chroma        55    92    58    55    46    51   >= 45   [6-12 here]
 *   ink is darkest      y     y     y     y     y     y   y       [16 of 48 no]
 *   fitToCell scale   1.00  1.00  1.00  1.00  1.00  1.00  1.00 -- none resampled
 *   symmetry %         68    43    90    60    60    64   see below
 *   *Front calls        0     0     0     0     0     0   <= 2
 *   seam/occlude        0     0     0     0     0     0   <= 2
 *
 * AND THE ONE THE PLAYER IS ACTUALLY LOOKING AT, measured at 1x on the eye row:
 *
 *                     peb   cai   men   chk   cma        target
 *   head width (cells) 54    32    51    43    26
 *   two-eye ink span   21    17    29    20    15
 *   span / head        39%   53%   57%   47%   58%        ~50 %
 *   gap between the 2   5     8    15    10     6         >= 5, and lit
 *   face outboard near  5     7    12    12     5.5       >= 4
 *
 * WHERE THESE STILL MISS, honestly:
 *   - LARGEST CONNECTED REGION and TOP-THREE REGIONS are under target on five
 *     of six. A faceted mineral splits its own body colour across four or five
 *     named planes by construction, so the biggest single region is a facet
 *     rather than a flank. chalkmar is the worst at 11.9 % because it is the
 *     one genuine animal here and its slate is spread over a mantle, four legs,
 *     a head and a tail. The right fix is fewer, larger facets, and it is the
 *     first thing to do to this file next.
 *   - BODY PIXELS DARKER THAN THE OUTLINE is 0.0 % on all six, against a target
 *     of 12-25 %. This one is structural, not a drawing failure: acceptance
 *     also requires slot 5 to be the DARKEST of the six colours, and `OUTLINE`
 *     is that ink mixed only 12 % toward the base, so no authored tone can get
 *     under it. `DEEP` -- the darkest thing a design can paint -- lands about
 *     10 luma ABOVE `OUTLINE` on every palette in this group. The two criteria
 *     cannot both be met with the current ramp; whoever owns `maskToCanvas`
 *     should be told before another nine authors chase it.
 *   - `runs` is over 250 on five of six, though every one of them is down from
 *     a roster mean of 720. Same cause as the region count.
 *   - anchorling's H2 is 13.1 %, two points under the band, and it is the
 *     busiest sprite in the group at 127 regions and 511 runs against targets
 *     of 80 and 250. Both come from the same place: it is the only creature
 *     here with a hole in it, two knobbed stock ends, five crust lumps and
 *     three weed strands, and every one of those is a silhouette event that
 *     earns its keep at 1x. If it has to come down, take it out of the crust
 *     lumps, not out of the ring.
 *   - chalkid's H3 is 1.7 %, under the 2-6 % band. The flint core is the only
 *     place the third hue appears and making it bigger starts to read as a
 *     crest rather than as broken stone. Left as it is, deliberately.
 *   - `check.mjs` reports menhir touching the BOTTOM edge of the 128-cell cell
 *     with 54 pixels. That is the generated CONTACT SHADOW, not the creature:
 *     the ground line sits at row 122 and `contactShadow` scales its ellipse
 *     with the footprint, so a species standing on one continuous 90-cell base
 *     runs its shadow off the bottom. The base was narrowed from 111 to 93
 *     cells to clear the left and right edges, which it now does; the bottom
 *     needs a change to `contactShadow`, not to the drawing.
 *   - SYMMETRY: menhir 90 % is inside the mineral band and correct; chalkid is
 *     now 60 %, which is right for a figure with one arm up rather than for a
 *     nodule. chalkmar 60 % is inside the quadruped band and pebblet 68 % is
 *     inside the sitting-animal band. cairnling 43 % is BELOW the humanoid band
 *     of 70-85 and anchorling 64 % is below the mineral band -- both because of
 *     one big asymmetric limb, and both deliberate.
 */

import {
  ACCENT, ACCENT2, ACCENT2_DARK, ACCENT2_LIT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP,
  EMPTY, FORM, INNER, LIGHT, SHADE,
  blob, cast, cellOver, eyeRow, eyeStamp, flat, notch, poly, toeNotches,
  type Pen, type Pt,
} from '../parts.js';

/* ============================================================== helpers */

/**
 * Author the six-slot palette from inside the design.
 *
 * See the header. Slot 5 must be the darkest of the six or `maskToCanvas`'s
 * old five-slot guard would have promoted whichever accent was darker into the
 * ink and thrown a declared colour away -- which is what was happening to
 * pebblet's quartz gold and cairnling's moss.
 */
function palette(p: Pen, six: readonly [string, string, string, string, string, string]): void {
  p.sp.design.palette = [...six];
}

/**
 * A quartz prism: two parallel sides and an abrupt cap, in exactly two facets
 * with the arris between them.
 *
 * What makes a crystal read at this size is the pair of PARALLEL sides and the
 * sudden square-ish cap. A spike that is widest in the middle is a leaf
 * whatever colour it is painted; a spike with a vein down it is a leaf with a
 * midrib. Both were tried on pebblet and both produced a boulder that had been
 * rolled through a hedge.
 *
 * Painted in the FIXED ends of the accent-2 ramp so the shading pass cannot
 * band it, and wrapped in `flat` so the facet flags are set for the outline
 * cleanup as well.
 */
function prism(p: Pen, x: number, y: number, len: number, ang: number, w: number): void {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const at = (t: number, k: number): Pt =>
    [x + ux * len * t + nx * w * k, y + uy * len * t + ny * w * k];
  // A hexagonal crystal: parallel sides for three quarters of its length, then
  // a CHISEL of two facets. The first cut of this came to a point and every
  // prism on the sprite read as a banana, because the outline pass adds two
  // cells all round and a pointed three-cell spike is a lozenge by the time it
  // is inked. Five cells across, blunt end, two facets, no vein down it.
  flat(p, () => {
    poly(p, [at(0, -1), at(0.74, -1), at(1, -0.34), at(1, 0.34), at(0.74, 1), at(0, 1)], ACCENT2);
    poly(p, [at(0, -1), at(0.74, -1), at(1, -0.34), at(0.86, 0), at(0, 0)], ACCENT2_LIT);
  });
}

/**
 * A row of INNER cells: the one dark warm note a grey creature is allowed.
 *
 * `INNER` is the roster's most underused colour -- 0.7 % of the sprite on 24 of
 * 48 species -- and on a stone it is the only saturated thing there is. A
 * nostril slot, a mouth, the gap under a shell rim.
 */
function cavity(p: Pen, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = Math.round(y0); y <= Math.round(y1); y++) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) cellOver(p, x, y, INNER);
  }
}

/* ================================================================ 20 pebblet */

/**
 * PEBBLET -- the Loose Stone. 0.3 m. TINY.
 *
 *  1. WHAT IS IT? A fist-sized quarry cobble that has stopped being a cobble
 *     and squatted up onto two stubs, with one corner freshly snapped off and
 *     gold quartz growing out of the break.
 *  2. BODY PLAN. G, mineral / D, sitting. Both demand the same thing: ONE
 *     committed mass, no neck, no waist, precision of shape instead of parts,
 *     and a faceted rather than a rounded interior. Obeyed: the body is a
 *     single twelve-vertex `poly` and every interior region is a plane.
 *  3. RUNG. TINY. Long dimension 68 cells (band 52-68); measured body area 2689
 *     cells = 672 reference px (band 380-700). It is drawn SMALL, with a third
 *     of the frame empty above it, and that is most of its character -- the
 *     shipped one was 1419 reference px, larger than the 2.4 m menhir. It is
 *     now a third of menhir's area and the ladder inside the group runs
 *     2689 / 4059 / 5443 / 5663 / 5782 / 8321, monotonic across four rungs.
 *  4. ASPECT. 68 wide x 56 tall, 1.21:1 -- the only wide-and-low species in the
 *     first half of the group; chalkid, the other small one, is 0.88:1.
 *  5. SMOOTH OR STRUCTURED? STRUCTURED, minimally: four named planes and no
 *     internal line anywhere.
 *  6. MASSES (5): the boulder, the snapped sandstone face, the near stub, the
 *     far stub, the quartz cluster.
 *  7. HEAD VERB: none -- the boulder is the head, and it is LEVEL AND FORWARD.
 *     BODY VERB: squatting, weight forward and left over the near stub, the far
 *     stub set back and 7 cells higher so it is standing on a floor.
 *  8. SIGNATURE: the SNAPPED CROWN -- a plateau, a vertical drop, then a second
 *     lower peak -- carried by all three of its line. It is a STEP, not a V: a
 *     pointed notch between two peaks came out as a shark fin and the whole
 *     creature read as a hat.
 *  9. TWELVE NAMED VERTICES (a mineral's answer to the twelve reversals; all
 *     dx,dy from cx and the ground line):
 *       brow corner (-27,-33) . crown rise (-20,-42) . CROWN PLATEAU (-9,-44)
 *       SNAP, a vertical step (-8,-36) . break floor (3,-37) . second peak
 *       (5,-43) . fracture top (20,-37) . the cut (28,-22) . right base
 *       (24,-11) . left base (-21,-11) . brisket (-29,-21) . nose tip (-37,-22)
 * 10. HUES. H1 slate-blue #5f7396, hue 215, chroma 55 -- the boulder, ~55 %.
 *     H2 warm sandstone #c08c52, hue 32, chroma 110 -- the fresh break and the
 *     nose; measured 16.3 %. H3 quartz gold #e8cc78 -- the two crystals; measured
 *     11.1 %, over the 2-6 % band and a DELIBERATE EXEMPTION: "a seam of
 *     quartz" is the species brief and the crystals are the whole silhouette
 *     event, so the third hue is the design rather than a note on it.
 * 11. FOUR INTERIOR DETAIL EVENTS: the face; the sandstone fracture plane; the
 *     quartz cluster; the top/front arris that runs across the brow.
 * 12. EYES. `hooded`, size m, spread 8, far eye narrow and two cells higher up
 *     the skull. Calm, stubborn, ancient -- Numel's eye, which is what a rock
 *     that has decided to sit up should have. Drawn as `slot` first; see the
 *     sunglasses note at the top of the file. The one mark below the eyes is A
 *     NOSE: a sandstone wedge that breaks the front contour by seven cells with
 *     an INNER nostril slot in it.
 * 13. SURFACE MATERIAL: one place only -- the fracture, and it breaks the
 *     outline (the whole back corner is a straight cut, and the quartz crosses
 *     the silhouette).
 * 14. INTERNAL DARK LINES: none authored. The only ink inside the silhouette is
 *     what `internalEdges` rules between the sandstone mass and the slate, and
 *     that is a genuine material division of the kind the reference draws.
 * 15. Not a second stage.
 */
function pebblet(p: Pen): void {
  p.noTypeTraits();
  palette(p, [
    '#5f7396', // base    slate-blue, hue 215, chroma 55. Not grey.
    '#3b4a68', // shade   FORM and the far stub. Rotated cool, luma 73.
    '#93b4cc', // light   the lit plane. More saturated than base, hue 203.
    '#c08c52', // accent  warm sandstone: the fresh break.
    '#e8cc78', // accent2 quartz gold.
    '#1b2030', // ink     the darkest of the six, and only the outline.
  ]);

  const cx = p.cx, G = p.ground;
  const R = (dx: number, dy: number): Pt => [cx + dx, G + dy];

  // --- the far stub, first and behind, in SHADE so it takes its own ink -----
  // Far feet land 6-12 cells higher than near ones. This one is 7 higher, 2
  // cells narrower, and set back rather than directly behind the near one. Two
  // contacts is right for a two-legged sitting mineral; what matters is that
  // they are not on one row and that there is floor between them.
  flat(p, () => poly(p, [R(5, -14), R(18, -14), R(19, -4), R(6, -4)], SHADE));

  // --- the boulder ---------------------------------------------------------
  // Nine vertices, every one of them named in the header, and the segments
  // between them are STRAIGHT. A `blob` throws all of them away, and a boulder
  // with no named corner is a potato.
  const body: Pt[] = [
    R(-27, -33), // brow corner
    R(-20, -42), // rise to the crown
    R(-9, -44),  // CROWN PEAK -- a short plateau, not a point
    R(-8, -36),  // the SNAP: a vertical step down, eight cells
    R(3, -37),   // the floor of the break
    R(5, -43),   // second peak, one cell lower than the first
    R(13, -41),
    R(20, -37),  // fracture top
    R(28, -22),  // the cut: one straight diagonal, 17 cells long
    R(24, -11),  // right base
    R(-21, -11), // left base
    R(-29, -21), // brisket
  ];
  flat(p, () => poly(p, body, BASE));

  // The planes. Each is ONE flat tone and the hard step between two of them IS
  // the arris; there is no line and no intermediate band anywhere.
  flat(p, () => {
    // The plane that faces up and left: the crown. Its lower edge runs across
    // the head well above the eyes, so the face gets a brow ridge for nothing.
    poly(p, [R(-29, -21), R(-27, -33), R(-20, -42), R(-9, -44), R(-8, -36),
      R(3, -37), R(5, -43), R(13, -41), R(20, -37), R(16, -31), R(2, -30),
      R(-13, -36), R(-24, -30)], LIGHT);
    // The plane that faces down: the underside, where the cobble sits on its
    // own stubs.
    poly(p, [R(-25, -17), R(25, -16), R(24, -11), R(-21, -11)], FORM);
    // THE SPLIT. The back third of the rock is a different STONE, not a
    // different tone: fresh sandstone under a slate-blue skin, cut off along
    // one straight arris from the base to the second peak. Two big flat halves
    // is the whole interior of this creature.
    poly(p, [R(12, -42), R(20, -37), R(28, -22), R(24, -11), R(11, -11), R(16, -30)], ACCENT);
    poly(p, [R(28, -22), R(24, -11), R(11, -11), R(14, -19)], ACCENT_DARK);
  });

  // --- the quartz ----------------------------------------------------------
  // "A seam of quartz", which is the species brief, and it is said ONCE: the
  // vein reaches the surface at the top of the arris between the two stones and
  // leaves the rock there as two crystals of different lengths at different
  // angles. Silhouette rather than marking -- the manual's ranking -- and it
  // throws its own shadow back down the sandstone, which is what stops a bright
  // shape on a dark ground reading as a sticker.
  //
  // An earlier pass ran the vein down the whole arris as a three-cell gold
  // stripe. At 64 px that is one and a half reference pixels of noise and at 8x
  // it was a yellow slab bisecting the animal; deleted, and the arris now
  // carries the material step alone, which says the same thing for nothing.
  // The angles matter more than the shapes. Steep crystals on top of the head
  // are ears; the pair is laid back over the rock's shoulder at -40 and -17
  // degrees, forty degrees apart, one nearly twice the length of the other.
  cast(p, 12, () => {
    prism(p, cx + 8, G - 39, 19, -1.06, 5.0);
    prism(p, cx + 18, G - 31, 12, -0.30, 3.4);
  });

  // --- the nose ------------------------------------------------------------
  // Nosepass' answer and the manual's: where a mineral has no muzzle it gets
  // ONE enormous mark below the eyes instead. Sandstone, so it belongs to the
  // same material as the break, cut as two facets so it reads as hard, blunt at
  // the front rather than a beak, and it BREAKS THE FRONT CONTOUR by seven
  // cells -- which is what makes it anatomy rather than a stain on a face.
  cast(p, 14, () => {
    flat(p, () => {
      poly(p, [R(-37, -22), R(-36, -15), R(-24, -12), R(-21, -19), R(-26, -24)], ACCENT_DARK);
      poly(p, [R(-37, -22), R(-26, -24), R(-21, -19), R(-32, -17)], ACCENT);
    });
  });
  cavity(p, cx - 34, G - 21, cx - 30, G - 18);

  // --- the near stub -------------------------------------------------------
  // Splayed outward: a vertical column is furniture, a leaning one is weight.
  // Three toes CARVED out of the bottom contour, because a one-cell stroke
  // between two toes is half a reference pixel and is gone at 64 px.
  cast(p, 16, () => {
    flat(p, () => poly(p, [R(-19, -14), R(-6, -14), R(-4, -1), R(-22, -1)], BASE));
  });
  toeNotches(p, cx - 21, cx - 5, G - 1, 3, 4);
  // and the gap between the two stubs, so the pair never merges into a bar
  notch(p, cx + 1, G - 1, 5, 6, 0, -1);

  if (p.back) { p.face(cx - 14, G - 28, 13); return; }

  // --- the face ------------------------------------------------------------
  // `slot`: a hard bar of ink under a FORM shelf and no catchlight at all.
  // That is Nosepass and Aron, it is what a mineral's eye is, and it is the one
  // construction that cannot turn into a pair of goggles. There is NO dark band
  // behind it -- that band was the sunglasses, on all six of these.
  // MOVED THREE CELLS INBOARD. At cx-14 the near stamp's outer ink column sat
  // two and a half cells from the brow contour, so there was no lit stone
  // outboard of it and the eye read as part of the outline rather than as a
  // mark on a face. The reference always leaves face outboard of the outer eye.
  // Measured now: the pair's two ink masses span 21 cells of a 54-cell head
  // (39 %), five cells of slate between them, five outboard of the near one.
  eyeRow(p, cx - 11, G - 28, 8, 'hooded', 'm', { far: 'm-', tilt: -2, lid: LIGHT });
}

/* ============================================================== 21 cairnling */

/**
 * CAIRNLING -- the Stacked Marker. 0.9 m. MID.
 *
 *  1. WHAT IS IT? Three loose stones that have stacked themselves into a
 *     roadside waymarker and stood up, with one long arm of rock thrown out to
 *     the upper left, pointing the way.
 *  2. BODY PLAN. F, humanoid (the manual lists it there) over G, mineral. What
 *     humanoid demands and a biped does not is SHOULDERS AND AN EXPLICIT HAND
 *     GESTURE, and that is the whole point of this creature -- it exists to
 *     point at something. Obeyed: the near arm is the longest single mass on
 *     the sprite and it ends in three blunt stone fingers.
 *  3. RUNG. MID. Long dimension 91 cells (band 84-100); body area ~4200 cells
 *     = ~1050 reference px (band 950-1400).
 *  4. ASPECT. 79 wide x 91 tall, 0.87:1, and the width is nearly all arm --
 *     the stack itself is 58 wide. pebblet is 1.27:1 wide-and-low and menhir is
 *     0.71:1, so no two of the line meet the frame the same way.
 *  5. SMOOTH OR STRUCTURED? STRUCTURED. Three stones, two joints, a shoulder
 *     and an elbow, all of them in the outline.
 *  6. MASSES (5): plinth, body slab, cap stone, near arm, far arm.
 *  7. HEAD VERB: COCKED -- the cap stone is tipped back and to the left, so its
 *     top edge is not parallel to the joint under it. BODY VERB: the stack is
 *     shoved off its own axis, the body slab overhanging the plinth's right by
 *     six cells and inset on the left, so the centre of mass is left of the
 *     middle of the base and the whole thing is about to walk.
 *  8. SIGNATURE: THE SNAPPED CROWN, inherited from pebblet -- the cap's top is
 *     a broken step, a plateau then a vertical drop then a second lower peak.
 *     In the silhouette and it is the highest thing on the creature.
 *  9. TWELVE NAMED VERTICES: plinth foot (-31,-1) . plinth shoulder (-28,-22)
 *     . plinth chamfer (-19,-31) . waist inset (-20,-33) . body shoulder
 *     (-16,-52) . arm root (-18,-50) . ELBOW (-30,-62) . wrist (-44,-73)
 *     . middle finger tip (-53,-84) . cap chin (-30,-66) . CROWN PLATEAU
 *     (-9,-91) . snap step (-7,-84) . second peak (0,-86) . far-arm knuckle
 *     (30,-36).
 * 10. HUES. H1 warm sandstone #b08454, hue 32, chroma 92 -- plinth and body,
 *     ~50 %. H2 slate #6a7f9c, hue 215 -- the cap stone and both arms, ~24 %.
 *     H3 moss #6e8a4a in the two joints, ~4 %. That is exactly the inversion of
 *     its parent: pebblet is slate with sandstone in it, cairnling is sandstone
 *     with slate on it, and the measured base-slot distance between the two is
 *     large where the roster mean is 22/441.
 * 11. FOUR INTERIOR DETAIL EVENTS: the face; the moss in the joints; the
 *     slate/sandstone material split; the arm's lit top plane.
 * 12. EYES. `angry`, size m, spread 8, brow in `FORM`, far eye narrow and two
 *     cells higher. A brow carries about 35 % of a face's expression and this
 *     creature stands at a crossroads telling people where to go, so it gets
 *     one. The one mark below the eyes is a slate NOSE breaking the front
 *     contour by eleven cells with an INNER nostril slot in it.
 * 13. SURFACE MATERIAL: the moss, in two places, and it breaks the outline at
 *     both -- three tufts over the lower joint and one on the far flank.
 * 14. INTERNAL DARK LINES: none authored. The ink between the cap and the body
 *     and between the arm and the body is `internalEdges` doing its documented
 *     job on two genuinely separate parts in a second material.
 * 15. SECOND STAGE of pebblet. CARRIED: the snapped crown, and the two-stone
 *     palette. CHANGED: everything else -- squat wedge to vertical stack, one
 *     mass to five, no gesture to a pointing hand, and the two stones swap
 *     which of them is the body.
 */
function cairnling(p: Pen): void {
  p.noTypeTraits();
  palette(p, [
    '#b08454', // base    warm sandstone, hue 32, chroma 92. Not grey.
    '#6a4e38', // shade   FORM and the far arm: a genuine mid-dark, luma 82.
    '#d8a862', // light   hue 38, chroma 118 -- MORE saturated than base.
    '#7b93b4', // accent  slate, hue 214: the cap stone and the arms.
    '#83a355', // accent2 moss in the joints.
    '#241a14', // ink     darkest of the six.
  ]);

  const cx = p.cx, G = p.ground;
  const R = (dx: number, dy: number): Pt => [cx + dx, G + dy];

  // --- the far arm, behind, in SHADE ---------------------------------------
  // Short, tucked, on the far side, half the length of the near one and hanging
  // instead of raised. Whatever the creature has two of gets drawn at two
  // sizes, in two places, doing two different things.
  flat(p, () => poly(p, [R(21, -48), R(31, -45), R(36, -30), R(29, -26), R(23, -38)], SHADE));

  // --- the plinth ----------------------------------------------------------
  flat(p, () => {
    poly(p, [R(-32, -1), R(-29, -19), R(-20, -27), R(16, -28), R(27, -21), R(29, -1)], BASE);
    // the top plane, facing up and left
    poly(p, [R(-29, -19), R(-20, -27), R(16, -28), R(27, -21), R(17, -17), R(-17, -19)], LIGHT);
    // the right face, turned away
    poly(p, [R(27, -21), R(29, -1), R(16, -1), R(17, -17)], FORM);
  });

  // --- the body slab -------------------------------------------------------
  // Shoved right off the plinth's axis: flush with its right edge, inset
  // fourteen cells on the left, which is what makes a stack read as STACKED
  // rather than as one tapering tower. Its shadow falls on the plinth.
  cast(p, 46, () => {
    flat(p, () => {
      poly(p, [R(-18, -27), R(-15, -48), R(-7, -59), R(19, -58), R(29, -46), R(28, -27)], BASE);
      poly(p, [R(-15, -48), R(-7, -59), R(19, -58), R(29, -46), R(17, -43), R(-7, -45)], LIGHT);
      poly(p, [R(29, -46), R(28, -27), R(15, -27), R(17, -43)], FORM);
    });
  });

  // --- the near arm --------------------------------------------------------
  // THE GESTURE, and it is the reason this creature exists. One slab from the
  // shoulder out to a real ELBOW at (-27,-45) and on to a wrist, then three
  // blunt fingers of unequal length with sky between them, the middle one a
  // quarter longer.
  //
  // It is thrown out at CHEST height, not shoulder height, and that is the
  // whole reason this creature was redrawn twice. Raised, the arm ran through
  // the same rows as the nose and the two slate masses fused into one
  // horizontal bar across the middle of the sprite -- the fastest way there is
  // to lose a silhouette. Dropped fourteen cells there is clear sky between
  // them and the pointing hand is the leftmost thing on the creature.
  cast(p, 16, () => {
    flat(p, () => {
      poly(p, [R(-14, -38), R(-28, -42), R(-42, -49), R(-49, -57), R(-43, -61),
        R(-33, -52), R(-22, -46), R(-11, -43)], ACCENT);
      poly(p, [R(-14, -38), R(-28, -42), R(-42, -49), R(-49, -57), R(-46, -58),
        R(-35, -51), R(-24, -45), R(-12, -41)], ACCENT_DARK);
      // three fingers: middle longest, all three pointing where the arm points
      poly(p, [R(-47, -55), R(-58, -63), R(-55, -68), R(-44, -60)], ACCENT);
      poly(p, [R(-44, -59), R(-51, -69), R(-47, -72), R(-41, -62)], ACCENT);
      poly(p, [R(-48, -50), R(-58, -52), R(-58, -57), R(-47, -55)], ACCENT);
    });
  });

  // --- the cap stone -------------------------------------------------------
  // Tipped back, so its top edge is not parallel to the joint beneath it.
  // Slate, like the arms. `ACCENT_LIT` is used on the crown only and nowhere
  // else: on a warm-lamped species it mixes 55 % toward cream, and a whole
  // slate face lit that way comes out the pale warm grey this group was being
  // marked down for.
  cast(p, 30, () => {
    flat(p, () => {
      poly(p, [R(-17, -59), R(-15, -76), R(-7, -85), R(3, -89), R(5, -81),
        R(12, -84), R(17, -73), R(16, -58)], ACCENT);
      // THE VERTICAL ARRIS DOWN THE MIDDLE OF THE FACE. This is the fix for the
      // one defect that survived two rewrites of this creature: two `slot` eyes
      // side by side at the same height on one flat plane read as a pair of
      // sunglasses whatever is or is not painted behind them. Split the face
      // into two planes and the two eyes sit on two different surfaces at two
      // different values, and the pair cannot fuse. It is also exactly what a
      // carved stone head looks like.
      poly(p, [R(1, -83), R(17, -73), R(16, -58), R(2, -58)], ACCENT_DARK);
      poly(p, [R(-15, -76), R(-7, -85), R(3, -89), R(4, -83), R(-5, -80), R(-11, -77)], ACCENT_LIT);
    });
  });

  // --- the nose ------------------------------------------------------------
  // Slate, hung off the bottom of the arris, two facets, blunt front, breaking
  // the front contour by eleven cells. It is the only thing below the eyes and
  // it is what stops the face being an empty plate.
  cast(p, 13, () => {
    flat(p, () => {
      poly(p, [R(-28, -67), R(-27, -58), R(-14, -56), R(-9, -64), R(-17, -70)], ACCENT_DARK);
      poly(p, [R(-28, -67), R(-17, -70), R(-9, -64), R(-24, -62)], ACCENT);
    });
  });
  cavity(p, cx - 26, G - 65, cx - 22, G - 62);

  // --- the moss ------------------------------------------------------------
  // The third hue, in the only place a cairn grows anything: the joints. Four
  // tufts of three sizes, all of them on the NEAR half of the lower joint and
  // one under the cap on the far side, and every one of them BREAKS THE
  // OUTLINE. A ruled green band right across the creature was tried first and
  // read as a sandwich filling.
  flat(p, () => {
    poly(p, [R(-22, -25), R(-8, -28), R(2, -27), R(3, -31), R(-9, -32), R(-21, -29)], ACCENT2);
    poly(p, [R(-25, -26), R(-20, -33), R(-15, -27)], ACCENT2);
    poly(p, [R(-4, -27), R(0, -34), R(5, -28)], ACCENT2);
    poly(p, [R(14, -27), R(18, -33), R(23, -26)], ACCENT2);
  });

  if (p.back) { p.face(cx, G - 74, 15); return; }

  // --- the face ------------------------------------------------------------
  // `slot` again, and for the same reason as pebblet: a hard ink bar under a
  // shelf of shadow, no catchlight, nothing else on the head. The previous
  // version of this creature painted a dark band across the cap stone as well,
  // and with the stamps on top of it that band was a pair of sunglasses.
  // SIZE 's', NOT 'm'. The cap stone is 32 cells across at the eye row and an
  // 'm' pair plus its brows spanned 22 of them -- 69 %, against the reference
  // ratio of about a half -- with under three cells of stone outboard of the
  // near brow. Dropped to 's' the span is 17 of 32 (53 %), there are eight
  // cells of lit slate between the two and seven outboard of each, and the
  // vertical arris still runs down the middle of the gap. The eye did not need
  // to be big; it needed somewhere to sit.
  eyeRow(p, cx + 1, G - 74, 7, 'angry', 's', { far: 's-', tilt: -2, brow: FORM });
}

/* ================================================================ 22 menhir */

/**
 * MENHIR -- the Standing Stone. 2.4 m. HUGE.
 *
 * ROUND 8. THE ARCADE CABINET, AND THE END OF THE SECOND STONE.
 * Round 7 was judged at 1x by a reviewer looking at the whole roster and named
 * in one word: it is a FUEL PUMP. A dark blue-grey upright BOX -- parallel
 * sides, a flared plinth with a ruled horizontal highlight along its top, a
 * ruled horizontal shoulder step across the full width at the neck -- with a
 * saturated orange PANEL filling its lower half, cut off along one long ruled
 * hypotenuse and finished with a hard flat strip along the bottom. Every one of
 * those five edges is a straight line that spans most of the sprite, and a
 * straight line that spans most of the sprite is a manufactured joint. Nothing
 * about the tones was wrong. The geometry was a machine.
 *
 * What is drawn now is one rough-hewn stone. THE RULE, and it is the whole of
 * round 8 on this creature: A MENHIR IS A QUARRIED ROCK, SO NOTHING ON IT MAY
 * BE A STRAIGHT MACHINED LINE. The footing is gone, the shoulder step is gone,
 * the ore panel is gone; every long edge -- both flanks, both arrises between
 * the three planes -- is broken into four or five segments that jog three to
 * six cells, which is one and a half to three reference pixels at the size the
 * game draws. The only ruled line left on the creature is the vertical arris
 * down the nose, and that one is carved.
 *
 * AND THE SECOND HUE IS NOW THE NOSE AND NOTHING ELSE. Five constructions have
 * been tried for a second copper region on the body of this creature and each
 * one read at 1x as a separate manufactured thing:
 *     round 6   six airbrushed vertical stripes         -> a bell
 *     round 7a  a level band across the body            -> a belt
 *     round 7b  a dipping band, vein out of one end     -> an arm and a plank
 *     round 7c  a clean triangular corner, 15 % of the sprite, one ruled
 *               hypotenuse, a ruled strip along the bottom
 *                                                       -> AN ARCADE CABINET
 *     round 8a  a small jagged weathering patch at the foot of the left flank
 *                                                       -> A CAMPFIRE
 * H2 is 2 % now instead of the manual's 15-30 %, and that is a written
 * exemption. A monolith is allowed to be one material; the variety on it comes
 * from the facets and the broken contour, which is how carved stone reads in
 * life. Five attempts is enough evidence to stop.
 *
 * A THIRD THING, AND IT IS THE ROUTE TO THE SUNGLASSES NOBODY HAD USED YET.
 * Two versions inside round 8 fused the face into one horizontal bar, by two
 * different mechanisms, and both were invisible until rendered at 1x:
 *   - a NOSE WHOSE TOP IS AS WIDE AS ITS BOTTOM. A copper mass over 64 cells
 *     gets inked, the ink runs along the top edge of the nose, and that ink
 *     bridges the gap between the two slots. Three separate marks, one bar. A
 *     nose that WIDENS DOWNWARD keeps its outline out of the eye row.
 *   - a BROW CAST SHADOW THAT SPANS THE HEAD. The crown facet is 50 cells wide,
 *     so its shadow is a 50-cell horizontal band, and two slots sitting inside
 *     a 50-cell dark band are a visor whatever else is true. The brow is a
 *     silhouette event and a value step now; it does not cast. `cast` is the
 *     highest-value mark on a sprite and it is still wrong when the caster is
 *     as wide as the thing it lands on.
 *
 * ROUND 7, BELOW, AND THE HALF OF IT THAT SURVIVED: THE FACE.
 * Round 5 drew this creature as a carved standing-stone IDOL with a face, and
 * nobody ever complained about it. Round 6 took the face away -- one `gem` in
 * a socket high on the right shoulder of the mass, per the eye brief's rule
 * for a species with no face -- and drew the body as one continuous taper from
 * a ninety-cell foot to a thirty-six-cell neck. At 1x the result is a bell. Or
 * a bollard, or a chess pawn, and the eye reads as a badge screwed to the top
 * of it rather than as anything looking at you.
 *
 * The rule the eye brief was applying is real: Lunatone is a rock with one red
 * disc and it works. But Lunatone is a rock that has no head END -- the whole
 * body is the head, and the eye is in the middle of it. Menhir is a TALL
 * creature, so it has a top, and a tall creature with a single small mark near
 * its top is not Lunatone, it is a signpost. What a tall stone wants is the
 * other reference answer for this exact case, which is Nosepass: a face made
 * of TWO hard slots, an enormous nose between them, and a heavy brow shelf
 * over the top -- and Nosepass is the least detailed sprite in its generation.
 *
 * So the face is back, and it is built the way the file itself said a `slot`
 * pair could be built safely: "Nosepass gets away with it because its slots
 * are tiny against an enormous face and there is a huge red nose between them.
 * If a future author wants the slot back, that is the price: a face wide
 * enough that the two bars are a small part of it." Paid. Re-measured on the
 * round-8 head: 55 cells across at the eye row; each slot paints SEVEN cells of
 * ink; there are SEVENTEEN cells of stone between them with the copper standing
 * up into the gap from below, and TWELVE cells of lit stone outboard of each.
 * Two bars and their gap span 31 of 55, 56 %, against the reference's ~50 %.
 * Measured at 1x, not at 8x, because at 8x every version of this face has
 * looked fine.
 *
 *  1. WHAT IS IT? One standing stone, two and a half metres of it, carved with
 *     a face by somebody long dead, that walks between one spring and the next.
 *  2. BODY PLAN. G, mineral / monolith. What that plan demands is PRECISION OF
 *     SHAPE and a flat, faceted interior; what it forbids is compensating for
 *     a missing face with surface detail. Obeyed: four named planes, no
 *     gradient anywhere, and the face is carved rather than painted.
 *  3. RUNG. HUGE. Long dimension 111 cells measured (band 112-128 -- EXEMPTION,
 *     written down as the manual requires: `fitToCell` clamps at 110 cells of
 *     height, so a tall species cannot reach the top of the HUGE band without
 *     being resampled). It takes the rest of its rung in AREA: 7392 opaque
 *     cells, the largest in the group by a quarter, and the ladder runs
 *     2689 / 4404 / 5443 / 5827 / 5934 / 7392, monotonic across four rungs.
 *  4. ASPECT. 81 wide x 111 tall, 0.73:1. The read is NOT a stack any more --
 *     it is one continuous mass that narrows toward the crown, which is what a
 *     standing stone does. What separates the head from the body is that the
 *     contour comes in nine cells on the left between y=-72 and y=-94 and
 *     eleven on the right between y=-72 and y=-96, at different heights, so the
 *     narrowing is asymmetric and never a step.
 *  5. SMOOTH OR STRUCTURED? STRUCTURED, with FOUR planes and nothing else. A
 *     monolith wants very few facets, very large and very hard.
 *  6. MASSES (2): the stone, and the nose. There is no joint anywhere on this
 *     creature, which is the loudest difference from cairnling, a creature made
 *     entirely of joints.
 *  7. HEAD VERB: LEVEL AND FORWARD. The face is carried five cells left of the
 *     sprite's centre and the crown three more, so the stone is out of plumb.
 *     BODY VERB: planted -- it widens to 74 cells at the ankle and goes into
 *     the turf without a base plate under it.
 *  8. SIGNATURE: THE SNAPPED CROWN, third and largest generation -- a plateau,
 *     a ten-cell vertical drop, then a second lower peak. Second signature, and
 *     it is the round-8 one: THE BROKEN FLANK. Both long edges jog four times.
 *  9. EIGHTEEN NAMED VERTICES (dx,dy from cx and the ground line), and the
 *     point of them is that no three are collinear:
 *       heel left (-34,-1) . (-39,-14) . (-34,-28) . (-37,-44) . (-33,-58)
 *       . SHOULDER left (-40,-72) . (-37,-84) . crown left (-30,-94)
 *       . (-25,-100) . CROWN PLATEAU (-12,-107) . SNAP (-8,-97)
 *       . second peak (3,-103) . crown right (17,-96) . (25,-85)
 *       . SHOULDER right (31,-72) . (27,-58) . (34,-42) . (30,-26)
 *       . (36,-12) . heel right (33,-1).
 * 10. HUES. H1 blue-grey #5a7192, hue 216, chroma 56 -- Nosepass is blue and so
 *     is this, ~83 % across BASE, LIGHT and FORM. H2 copper ore #b06a38, hue 18
 *     -- THE NOSE ONLY, 2.2 %; see the exemption above. H3 red-gold #e0a03c --
 *     the lit facet of the nose, 2.9 %.
 * 11. FOUR INTERIOR DETAIL EVENTS: the carved face; the crown facet and the
 *     overhang under it; the two full-height arrises; the two chipped corners.
 * 12. EYES. `slot` at `m`, spread 12, NO `far` -- a carved head-on mineral is
 *     one of the six reference eyes that is not tilted, and `farRise` on a
 *     symmetric carving would be a lie. Two seven-cell bars and no catchlight
 *     at all: Nosepass and Aron. The one mark below the eyes is THE NOSE,
 *     twenty-nine cells deep, in two copper facets with a hard vertical arris
 *     between them and its own cast shadow to the right. It is the largest
 *     single mark on the creature and it is the reason the two slots can never
 *     fuse into a bar -- PROVIDED its top stays narrow. See round 8 above.
 * 13. SURFACE MATERIAL: none. The stone is one material and the ore is a
 *     feature of the face, not a stratum on the body.
 * 14. INTERNAL DARK LINES: none authored.
 * 15. THIRD STAGE. CARRIED: the snapped crown, and the carved face. CHANGED:
 *     the second mineral drops out of the body entirely, the silhouette stops
 *     being rectilinear, and the creature is 2.4 m where cairnling was 0.9.
 */
function menhir(p: Pen): void {
  p.noTypeTraits();
  palette(p, [
    '#5a7192', // base    blue-grey, hue 216. Lifted from #4f6689 -- see note A.
    '#384a6a', // shade   FORM: the turned-away plane. Dark, but still stone --
    //                    at #2c3a55 the far plane read as a hole in the sprite
    //                    rather than as the side of a rock.
    '#93aace', // light   hue 213 -- more saturated than base.
    '#b06a38', // accent  copper ore: THE NOSE, and nothing else. See below.
    '#e0a03c', // accent2 the lit facet of the nose. One thing, one colour.
    '#141827', // ink     darkest of the six.
  ]);

  const cx = p.cx, G = p.ground;
  const R = (dx: number, dy: number): Pt => [cx + dx, G + dy];

  // --- the stone -----------------------------------------------------------
  // ONE mass, from the turf to the snapped crown, with NO footing under it and
  // NO shoulder step across it. Both of those were straight horizontal edges
  // spanning the full width of the sprite, and at 1x a full-width horizontal
  // edge is a machined joint: it is what turned round 7 into a fuel pump.
  //
  // Every long edge here is broken into four or five segments that jog three to
  // six cells, which is one and a half to three reference pixels -- enough to
  // read as quarried rock and not enough to read as a wobble. Nothing on this
  // creature is a ruled line except the arris of the nose, and that one is
  // carved.
  const OUT: readonly Pt[] = [
    R(-34, -1), R(-39, -14), R(-34, -28), R(-37, -44), R(-33, -58),
    R(-40, -72), R(-37, -84), R(-30, -94),
    R(-25, -100), R(-12, -107), R(-8, -97), R(3, -103), R(17, -96),
    R(25, -85), R(31, -72), R(27, -58), R(34, -42), R(30, -26),
    R(36, -12), R(33, -1),
  ];
  flat(p, () => {
    poly(p, [...OUT], BASE);
    // THE PLANE THAT FACES UP AND LEFT. One facet, full height, and its OUTER
    // edge is the silhouette -- so it ends where the stone ends on every cell
    // of its long side. Its inner edge is an arris that jogs with the rock.
    poly(p, [
      R(-34, -1), R(-39, -14), R(-34, -28), R(-37, -44), R(-33, -58),
      R(-40, -72), R(-37, -84), R(-30, -94), R(-25, -100), R(-12, -107),
      R(-14, -97), R(-20, -88), R(-18, -64), R(-23, -40),
      R(-20, -18), R(-22, -1),
    ], LIGHT);
    // THE PLANE THAT FACES RIGHT AND AWAY. Same contract, other side: outer
    // edge is the silhouette from crown to ground, inner edge is an arris.
    // This is what a FORM region is for -- it is the far half of the stone past
    // the terminator, not a patch sitting on the middle of it.
    poly(p, [
      R(17, -96), R(25, -85), R(31, -72), R(27, -58), R(34, -42),
      R(30, -26), R(36, -12), R(33, -1),
      R(23, -1), R(20, -20), R(24, -40), R(18, -60), R(21, -80),
      R(19, -88),
    ], FORM);
  });

  // --- the chipped corners -------------------------------------------------
  // NO SECOND STONE. There is no ore stratum, no copper panel and no weathering
  // patch on this body; the five constructions that were tried and what each one
  // turned into are listed in the header. The variety on a monolith comes from
  // the facets and from the contour, and here it comes from two corners that are
  // missing -- both silhouette events, both free, neither of them a colour.
  notch(p, cx - 37, G - 50, 6, 4, 1, 0);
  notch(p, cx + 32, G - 34, 5, 4, -1, 0);

  // --- the crown -----------------------------------------------------------
  // THE PLANE OF THE TOP OF THE STONE, everything above y = -93. It is a flat
  // facet and its lower edge is a hard value step, and that step IS the brow --
  // the overhang the eyes sit under.
  //
  // IT DOES NOT CAST, AND THAT IS DELIBERATE. Round 7 threw its shadow with
  // `cast`, which is normally the highest-value mark available; but this caster
  // is fifty cells wide, so its shadow is a fifty-cell horizontal dark band, and
  // two `slot` eyes sitting inside a fifty-cell dark band are a pair of
  // sunglasses no matter what else is true of them. Shortening the offset only
  // moved the band. A cast shadow separates two masses; it cannot model a brow
  // that is as wide as the face under it.
  flat(p, () => poly(p, [R(-29, -95), R(-25, -100), R(-12, -107), R(-8, -97),
    R(3, -103), R(17, -96), R(18, -93), R(1, -96), R(-14, -94)], LIGHT));

  if (p.back) { p.face(cx - 5, G - 88, 26); return; }

  // --- the face ------------------------------------------------------------
  // TWO CARVED SLOTS AND ONE ENORMOUS NOSE. The nose is drawn FIRST so that
  // the eye stamps land on top of the stone rather than under the copper, and
  // it runs from just below the slots down twenty-nine cells to the jaw -- two
  // facets, a hard vertical arris, no vein, and a cast shadow thrown to its
  // right so it stands off the face instead of lying on it.
  //
  // The top of the nose is FIVE cells wide and the bars stop five and a half
  // cells short of it on both sides. The round-8 first cut drew the nose as a
  // rectangle whose top was sixteen cells across; its ink outline bridged the
  // gap between the two slots and the three marks fused into one horizontal bar
  // at 1x -- the sunglasses, arriving by a route nobody had used yet. A nose
  // that WIDENS DOWNWARD keeps its ink out of the eye row and stops being a
  // plaque hung on the stone at the same time.
  cast(p, 19, () => {
    flat(p, () => {
      poly(p, [R(-4, -86), R(-2, -86), R(1, -74), R(4, -62), R(1, -57),
        R(-4, -57)], ACCENT_DARK);
      poly(p, [R(-7, -86), R(-4, -86), R(-4, -57), R(-9, -57), R(-12, -62),
        R(-10, -76)], ACCENT2);
    });
  });
  eyeRow(p, cx - 5, G - 90, 12, 'slot', 'm');
  p.face(cx - 5, G - 90, 26);
}

/* =============================================================== 28 chalkid */

/**
 * CHALKID -- the Chalk Nodule. 0.4 m. SMALL.
 *
 * ROUND 7. WHY THIS ONE WAS REDRAWN FROM NOTHING.
 * The round-6 chalkid was a cream egg with a horizontal slot in it and an
 * ochre band round the bottom, and at 1x -- which is the only size that
 * matters -- it read as an egg sitting in a basket. It had no limbs, no
 * internal structure and no head: the "one committed mass" rule of body plan
 * D was obeyed so hard that there was nothing left to look at. Body plan D is
 * right for a species whose concept IS a single surface; it is wrong for a
 * chalk GOLEM, which is what this creature has always been described as and
 * what it was two rounds ago, before the mass rule ate it.
 *
 * So it is a figure now: a broken-open chalk head on a neck, a body, two legs
 * and two arms, the near one thrown UP. Four silhouette events a stranger can
 * name at 1x -- the bitten crown, the neck, the raised fist, the gap between
 * the feet.
 *
 *  1. WHAT IS IT? A soft chalk nodule that has grown a head, two stubby arms
 *     and two feet, with its crown broken open to the raw ochre core and one
 *     fist held up -- the hand it writes on tunnel walls with.
 *  2. BODY PLAN. E, upright/biped, over G, mineral -- NOT D. What E demands is
 *     a three-part vertical stack with the torso largest, weight over the
 *     feet, and a head about a quarter to a third of total height; what the
 *     mineral half demands is that every one of those parts is a named plane
 *     rather than a shaded ball. Both obeyed.
 *  3. RUNG. SMALL. Long dimension 83 cells (band 68-84); body area ~3600
 *     cells = ~900 reference px (band 650-1000). Still bigger than pebblet and
 *     half of cairnling, so the ladder inside the group stays monotonic.
 *  4. ASPECT. 68 wide x 83 tall, 0.82:1 -- but the READ is a vertical stack,
 *     and nearly a third of the width is one raised arm. pebblet, the other
 *     small one, is 1.21:1 wide-and-low with no limb above its own crown.
 *  5. SMOOTH OR STRUCTURED? STRUCTURED now, and that is the change. The old
 *     note in this file argued the chalk line should be smooth so it shaded
 *     differently from the pebblet line; what actually happened is that smooth
 *     plus small plus pale equals invisible. The two lines are separated
 *     instead by CONTOUR CHARACTER -- pebblet is all straight cuts and hard
 *     corners, chalkid is all soft curve and rounded corner -- and by the fact
 *     that this one has limbs and a neck and that one does not.
 *  6. MASSES (5): head, torso, near arm, near leg, the ochre seam. The far arm
 *     and far leg are one shadow shape behind the body.
 *  7. HEAD VERB: LEVEL AND FORWARD, carried on a real neck. BODY VERB:
 *     REACHING -- the near arm is thrown up and out past the crown, the weight
 *     is on the near leg, the far leg is set back and six cells higher, and
 *     the centre of mass sits left of the midpoint between the feet.
 *  8. SIGNATURE: THE BITTEN CROWN -- a thirteen-cell notch chopped out of the
 *     top of the head, showing raw ochre core. It is the highest contrast
 *     event on the creature and it is entirely in the silhouette.
 *  9. FIFTEEN NAMED VERTICES (dx,dy from cx and the ground line):
 *       CROWN peak (-9,-79) . THE BITE floor (-3,-66) . second peak (11,-77)
 *       . cheek right (22,-58) . NECK right (14,-51) . shoulder right (27,-46)
 *       . flank right (29,-34) . far foot (21,-6) . near foot (-24,0)
 *       . near hip (-24,-20) . flank left (-28,-34) . NECK left (-14,-51)
 *       . cheek left (-22,-57) . ELBOW (-38,-53) . FIST (-41,-77).
 *     The WAIST is the load-bearing one: the contour comes in from 22 at the
 *     cheek to 14 at the neck and back out to 27 at the shoulder, and those
 *     eight cells are the whole difference between a head and the top of a lump.
 * 10. HUES, AND THEY ARE THREE FOR THE FIRST TIME. H1 chalk cream #e2d5ab,
 *     hue 46, chroma 55 -- head, torso, limbs, ~57 %. H2 rust-ochre #a8552a,
 *     hue 21 -- the mantle, measured 16.4 %. H3 FLINT #566f8e, hue 213 -- the
 *     core showing in the crown break, plus `INNER` in the mouth.
 *     TWO OF THOSE THREE MOVED FOR A MEASURED REASON. The chalk was #ddd6b8 at
 *     chroma 37 and the ochre was #b8802e at hue 38: nine degrees apart, which
 *     is one hue wearing two names, and `F_meas` scored the species at ZERO
 *     hues because a colour under chroma 45 does not count as one at all. And
 *     the old third slot was a brown core ten degrees off the other two. Flint
 *     is what a chalk nodule actually grows around, it is a genuinely cool
 *     third hue, and it is the same blue the other four species are cut from,
 *     so the group reads as one family from one quarry.
 * 11. FOUR INTERIOR DETAIL EVENTS: the face; the raw core in the break; the
 *     sash; the head's cast shadow down the chest.
 * 12. EYES. `round`, size `s`, spread 8, far eye narrow and two cells higher.
 *     Small, because the head is 43 cells across at the eye row and the pair
 *     plus its gap must come to about half of that: measured, the two ink
 *     masses span 20 cells of 43 (47 %), there are TEN cells of lit chalk
 *     between them and TWELVE outboard of each. The round-6 stamp was `sleepy`
 *     -- the widest, shallowest stamp in the library -- on a flat cream plate,
 *     and it is exactly the letterbox the player named. The one mark below the
 *     eyes is a MOUTH in `INNER`, the only one in the group.
 * 13. SURFACE MATERIAL: the mantle, one place, and it breaks the outline at
 *     both shoulders and again where its rim overhangs the far flank.
 * 14. INTERNAL DARK LINES: none authored. On a near-white palette `EDGE` and
 *     `ACCENT_DARK` resolve within a few values of each other, so an internal
 *     edge here draws a line nobody can see: every separation on this creature
 *     is a VALUE step or a SILHOUETTE step instead. The neck is a notch, not a
 *     collar; the head is lifted off the chest by a cast shadow, not a seam.
 * 15. FIRST STAGE of chalkmar. What carries over is the ochre seam and the
 *     chalk; what changes is that the seam becomes the mantle rim and the
 *     chalk demotes from the body colour to the underbody.
 */
function chalkid(p: Pen): void {
  p.noTypeTraits();
  palette(p, [
    '#e2d5ab', // base    chalk cream, hue 46, chroma 55. Tinted, never white,
               //         and pushed up from chroma 37 because below 45 the
               //         acceptance script does not count a colour as a HUE at
               //         all -- which is how this species came back measuring
               //         zero of the three the manual asks for.
    '#8e8464', // shade   FORM, the far limbs -- a genuine mid-tone step down.
    '#f6e9b4', // light   hue 46, chroma 66 -- more saturated than base.
    '#a8552a', // accent  rust-ochre, hue 21 -- the mantle. Rotated seventeen
               //         degrees off the round-6 value because measured
               //         against a hue-48 chalk it counted as ONE hue wearing
               //         two names, and the acceptance script said so.
    '#566f8e', // accent2 FLINT, hue 213. A chalk nodule grows round a flint
               //         core and that is a genuinely cool third hue on the
               //         one species in the group that had none -- and it is
               //         the same blue the rest of the group is cut from.
    '#3a2e1e', // ink     darkest of the six.
  ]);

  const cx = p.cx, G = p.ground;
  const R = (dx: number, dy: number): Pt => [cx + dx, G + dy];

  // --- the far limbs, behind, in SHADE -------------------------------------
  // Whatever the creature has two of gets drawn at two sizes, in two places,
  // doing two different things: the far arm hangs where the near arm is
  // raised, and the far foot lands six cells higher and eight cells back.
  flat(p, () => {
    poly(p, [R(21, -46), R(28, -42), R(27, -27), R(20, -29)], SHADE);
    poly(p, [R(7, -21), R(20, -21), R(21, -6), R(8, -6)], SHADE);
  });

  // --- the near leg --------------------------------------------------------
  // Splayed, and it carries the weight: a vertical column is furniture.
  flat(p, () => poly(p, [R(-22, -23), R(-7, -23), R(-5, -1), R(-24, -1)], BASE));
  toeNotches(p, cx - 24, cx - 6, G - 1, 3, 4);

  // --- the torso -----------------------------------------------------------
  // One rounded chalk mass, widest below the middle, narrowing hard into the
  // NECK at the top -- the eight cells of inward step between the shoulder and
  // the jaw are what make the head a head. It casts down the near leg.
  cast(p, 52, () => {
    flat(p, () => {
      poly(p, [
        R(-24, -20), // near hip
        R(-28, -34), // flank left
        R(-25, -46), // shoulder left
        R(-13, -52), // NECK left  -- the WAIST. Eleven cells narrower than the
        R(13, -52),  // NECK right   cheek above it and twelve narrower than the
                     //              shoulder below: the notch is what makes the
                     //              head a head rather than the top of a lump.
        R(26, -46),  // shoulder right
        R(28, -34),  // flank right
        R(25, -20),  // far hip
      ], BASE);
      // the plane that faces up and left
      poly(p, [R(-25, -45), R(-13, -52), R(-1, -50), R(-6, -38), R(-16, -30),
        R(-26, -31)], LIGHT);
      // the plane that turns away, on the far side. Kept NARROW: a deep one
      // ran into the far leg beneath it and the two dark masses fused into one
      // shapeless right-hand third of the sprite.
      poly(p, [R(26, -46), R(28, -34), R(25, -20), R(18, -20), R(20, -34),
        R(19, -46)], FORM);
    });
  });

  // --- the seam ------------------------------------------------------------
  // THE SIGNATURE, and the only marking on the creature: the ochre stratum the
  // nodule grew around, surfacing across its lower half.
  //
  // IT IS A MANTLE, NOT A BAND, AND THAT COST THREE ATTEMPTS TO LEARN. Every
  // version of this creature that drew the ochre as a strip laid ACROSS the
  // body failed at 1x in the same way: a saturated bar with two hard parallel
  // edges and pale chalk on both sides of it does not read as a marking, it
  // reads as an OBJECT, and the specific object depends only on where you put
  // it. At the waist it was a basket (round 6). At the shoulders it was a
  // sombrero (round 5). Corner to corner it was a plank the creature was
  // carrying (this round, twice). None of them are fixable by tone, by tilt or
  // by thickness, because none of them is a tone problem.
  //
  // What works is the construction its own evolution already uses: the ochre
  // CAPS the creature and the chalk comes out from under it. Here it lies over
  // both shoulders and then down the whole FAR flank to the hip, so the near
  // side of the body is bare chalk and the far side is covered -- which is also
  // the cheapest three-quarter cue there is. Its rim overhangs and throws the
  // one cast shadow that gives a near-white species any depth at all.
  cast(p, 50, () => {
    flat(p, () => {
      poly(p, [
        R(-25, -46), R(-13, -52), R(13, -52), R(27, -46), R(29, -34),
        R(26, -20), R(17, -21), R(20, -34), R(15, -42), R(0, -44),
        R(-14, -43), R(-24, -40),
      ], ACCENT);
      // the rim: the lip of the mantle where it overhangs, one step down
      poly(p, [R(-24, -40), R(-14, -43), R(0, -44), R(15, -42), R(20, -34),
        R(17, -21), R(21, -21), R(24, -34), R(19, -39), R(0, -41),
        R(-15, -40), R(-24, -37)], ACCENT_DARK);
    });
  });

  // --- the head ------------------------------------------------------------
  // Eleven vertices, all curve, no corner sharper than about thirty degrees --
  // and the BITE, thirteen cells deep, which is the whole silhouette of this
  // species. The head casts eight cells down and right onto the chest, and
  // that shadow is what lifts it off the body without a line: on this palette
  // an internal edge is a line you cannot see, so every separation here is a
  // value step or a step in the outline.
  cast(p, 44, () => {
    flat(p, () => {
      poly(p, [
        R(-14, -51), // neck left
        R(-22, -57), // cheek left -- the contour steps OUT over the neck
        R(-24, -66),
        R(-18, -75),
        R(-9, -79),  // CROWN, the front and taller peak
        R(-3, -66),  // THE BITE -- thirteen cells down into the head
        R(3, -72),
        R(11, -77),  // second peak, two cells lower
        R(19, -68),
        R(22, -58),  // cheek right
        R(14, -51),  // neck right
      ], BASE);
      // the crown plane, facing up and left. Its lower edge is the BROW and it
      // is the caster for the socket shadow below.
      poly(p, [R(-24, -66), R(-18, -75), R(-9, -79), R(-6, -71), R(-15, -68),
        R(-23, -62)], LIGHT);
      // the far side of the head, turned away -- and it stops well outboard of
      // the far eye, because an eye stamped onto a FORM plane loses most of its
      // contrast against the face and the pair stops matching.
      poly(p, [R(19, -68), R(22, -58), R(14, -51), R(10, -52), R(15, -58),
        R(16, -66)], FORM);
    });
  });

  // the raw core showing in the break: a fracture face, so it is flat
  flat(p, () => {
    poly(p, [R(-8, -78), R(4, -72), R(-3, -66)], ACCENT2);
    poly(p, [R(-8, -78), R(-2, -74), R(-3, -66)], ACCENT2_DARK);
  });

  // --- the near arm --------------------------------------------------------
  // THROWN UP. Shoulder, a real ELBOW at (-38,-53), a forearm rising past the
  // ear, and a blunt three-lobed fist two cells below the crown -- the hand
  // this species writes with. It is held eight cells clear of the head on
  // every row, because a limb that touches the skull is a bulge, not an arm.
  cast(p, 14, () => {
    flat(p, () => {
      poly(p, [R(-25, -42), R(-17, -46), R(-29, -58), R(-38, -53)], BASE);
      poly(p, [R(-38, -53), R(-29, -58), R(-32, -70), R(-41, -67)], BASE);
      poly(p, [R(-42, -67), R(-31, -70), R(-29, -77), R(-40, -75)], BASE);
    });
  });
  // two finger gaps carved out of the top of the fist, not drawn on it
  notch(p, cx - 37, G - 77, 3, 4, 0, 1);
  notch(p, cx - 33, G - 77, 3, 4, 0, 1);

  if (p.back) { p.face(cx - 2, G - 66, 13); return; }

  // --- the face ------------------------------------------------------------
  // High on the head, 0.45 of the way down from the crown, and SMALL: two
  // six-cell ink masses on a forty-three-cell head, ten cells of lit chalk
  // between them and twelve outboard of each. Judged at 1x, which is the only
  // place the round-6 pair could be seen to have merged.
  eyeRow(p, cx - 2, G - 66, 8, 'round', 's', { far: 's-', tilt: -2 });
  // ONE mark below the eyes, and it is the only mouth in the group, because
  // this is the species that leaves a white smear on everything it touches.
  cavity(p, cx - 9, G - 57, cx - 2, G - 56);
  cellOver(p, cx - 8, G - 55, LIGHT);
  cellOver(p, cx - 7, G - 55, LIGHT);
  cellOver(p, cx - 6, G - 55, LIGHT);
}

/* ============================================================== 29 chalkmar */

/**
 * CHALKMAR -- the Cut Face. 1.5 m. LARGE.
 *
 *  1. WHAT IS IT? A long low four-legged animal of soft chalk that has grown a
 *     mantle of quarried slate over its whole back, serrated into five
 *     back-leaning plates and rusted along the rim where it overhangs.
 *  2. BODY PLAN. A, QUADRUPED -- and it is the only one in this group, so it is
 *     the only one that has to obey the twelve reversals, the belly tuck, the
 *     zigzag hind leg and the foot-row spread. It does: see 9.
 *  3. RUNG. LARGE. Long dimension 113 cells (band 100-116); body area ~5900
 *     cells = ~1475 reference px (band 1300-1900).
 *  4. ASPECT. 113 wide x 72 tall, 1.57:1 -- the only long-and-low creature in
 *     the group, against menhir's 0.89 and chalkid's 0.71.
 *  5. SMOOTH OR STRUCTURED? STRUCTURED, hard: it is an animal with a skeleton
 *     under a shell, and the manual's list has it in the "wrongly smooth, needs
 *     structure" column. Withers, croup, brisket, tuck, stifle and hock are all
 *     in the outline.
 *  6. MASSES (5): head, torso, mantle, near foreleg, near hind leg. The far
 *     pair is not a mass -- it is one shadow shape behind the torso.
 *  7. HEAD VERB: LOWERED -- the skull is carried eight cells below the withers
 *     and thrown forward of the chest, which is Mightyena's stance and the
 *     opposite of a level barrel with a ball on the front. BODY VERB: walking;
 *     near foreleg advanced, far foreleg raised sixteen cells clear of the
 *     floor, three feet down.
 *  8. SIGNATURE: THE MANTLE RIM -- one continuous rusted lip running the whole
 *     length of the animal with the chalk body disappearing under it. It is the
 *     grown-up form of chalkid's ochre seam.
 *  9. TWELVE SILHOUETTE REVERSALS, with coordinates (dx,dy from cx and G):
 *      1 withers      (-12,-54)   contour high point, front half
 *      2 back sag     (  8,-48)   six cells below the withers
 *      3 croup        ( 32,-52)   second high point, two lower than the withers
 *      4 pt. shoulder (-30,-40)   front contour steps forward
 *      5 brisket      (-26,-26)   lowest, most forward point of the underline
 *      6 elbow        (-24,-24)   rear edge of the foreleg steps back
 *      7 belly tuck   (  8,-33)   underline rises seven cells from the brisket
 *      8 pt. buttock  ( 52,-34)   rearmost point
 *      9 stifle       ( 28,-26)   thigh's front edge bulges then cuts back
 *     10 HOCK         ( 36,-14)   rear edge steps back; sharpest angle on it
 *     11 paw          ( 30,  0)   16 wide against an 8-wide ankle
 *     12 occiput      (-28,-48)   contour dips between skull and mantle
 * 10. HUES. H1 slate #7f92ad, hue 214, chroma 46 -- the mantle and the legs,
 *     ~50 %. H2 rust #b3652c, hue 20 -- the mantle rim the length of the
 *     animal, the claws and the tail tip, ~16 %. On the shipped version this
 *     species' second hue painted 0.0 % of the sprite. H3 chalk #f0e6bc for
 *     the underbody and muzzle, plus `INNER` at the nostril.
 *     EXEMPTION: chroma(light) is 52 against chroma(base) 46, which passes, but
 *     only just -- `light` here is a genuinely different MATERIAL (chalk) and
 *     not a tint of the slate, so it is warm rather than more saturated.
 * 11. FOUR INTERIOR DETAIL EVENTS: the face; the mantle rim; the five plates;
 *     the mantle's cast shadow onto the chalk flank.
 * 12. EYES. `slit`, size m, far eye narrow and two cells higher, the pair moved
 *     forward onto the muzzle end of a turned skull. A tilted almond driven to
 *     a hard point at each end -- the stamp for anything that hunts, or in this
 *     case anything that walks through a quarry face. The one mark below the
 *     eyes is a NOSTRIL in `INNER` with a chalk cell under it.
 * 13. SURFACE MATERIAL: the plates, in ONE place -- the dorsal line -- and all
 *     five break the outline. Five, tapering, not seven identical: the shipped
 *     version's seven evenly-spaced equal spikes were a comb.
 * 14. INTERNAL DARK LINES: none authored. The mantle is separated from the
 *     chalk by a cast shadow and a material step, not by a seam.
 * 15. SECOND STAGE of chalkid. CARRIED: the ochre/rust seam, and the chalk.
 *     CHANGED: the body hue goes from chalk cream to slate blue; the chalk
 *     itself demotes from 58 % of the sprite to about 20 %, which is the
 *     "shares change by at least 2x" rule; and a sitting nodule on two stubs
 *     becomes a walking quadruped with four jointed legs.
 */
function chalkmar(p: Pen): void {
  p.noTypeTraits();
  palette(p, [
    '#7f92ad', // base    slate, hue 214, chroma 46.
    '#47536c', // shade   FORM and the far pair. A genuine dark.
    '#f0e6bc', // light   chalk. Warm, tinted, and never #ffffff.
    '#b3652c', // accent  rust: the mantle rim, the claws, the tail tip.
    '#d8b878', // accent2 pale ochre on the plate lips.
    '#262a34', // ink     darkest of the six.
  ]);

  const cx = p.cx, G = p.ground;
  const R = (dx: number, dy: number): Pt => [cx + dx, G + dy];

  /* --- the far pair, one shadow shape behind the torso -------------------- */
  // Far feet land 8 and 16 cells higher than the near ones, are two cells
  // narrower, and are offset forward so the far foreleg appears BETWEEN the
  // near foreleg and the chest rather than directly behind it. The far foreleg
  // is the raised one: three feet down, one lifted.
  flat(p, () => {
    poly(p, [R(28, -40), R(22, -26), R(30, -16), R(26, -8), R(36, -8), R(38, -18),
      R(32, -28), R(38, -38)], SHADE);
    poly(p, [R(-12, -38), R(-16, -24), R(-12, -16), R(-20, -16), R(-22, -26),
      R(-20, -38)], SHADE);
  });

  /* --- the torso ---------------------------------------------------------- */
  // Chalk, because the animal underneath the shell is chalk. Ten named
  // vertices, and the underline is a shallow V: deepest and most forward at the
  // brisket, rising seven cells back to the flank.
  flat(p, () => {
    poly(p, [
      R(-30, -38), // point of shoulder
      R(-26, -17), // BRISKET -- deepest and most forward point of the underline
      R(10, -23),  // belly TUCK, six cells up
      R(36, -21),
      R(52, -26),  // point of buttock
      R(50, -44),
      R(32, -52),  // CROUP
      R(8, -48),   // back SAG, four cells below the withers
      R(-12, -54), // WITHERS, the higher of the two -- built to walk, head low
      R(-28, -46),
    ], LIGHT);
  });

  /* --- the near legs ------------------------------------------------------ */
  // The hind leg ZIGZAGS in three segments with a hock reversal; the foreleg
  // does not, and the difference between the two pairs is most of what says
  // quadruped rather than four pegs. Both throw a cast shadow onto the body.
  cast(p, 22, () => {
    flat(p, () => {
      // thigh: down and FORWARD, with the muscle belly between the joints
      poly(p, [R(38, -46), R(41, -30), R(35, -22), R(24, -24), R(22, -34), R(26, -44)], BASE);
      // shin: down and BACK -- the reversal at the STIFLE
      poly(p, [R(24, -24), R(35, -22), R(40, -12), R(31, -11)], BASE);
      // metatarsus: FORWARD again -- the reversal at the HOCK
      poly(p, [R(31, -11), R(40, -12), R(37, -3), R(28, -3)], BASE);
    });
  });
  flat(p, () => poly(p, [R(22, -2), R(38, -2), R(39, 0), R(21, 0)], BASE));
  flat(p, () => poly(p, [R(22, -4), R(38, -4), R(38, 0), R(22, 0)], BASE));
  toeNotches(p, cx + 22, cx + 38, G, 3, 4);
  notch(p, cx + 40, G - 13, 5, 5, -1, 0);

  cast(p, 17, () => {
    flat(p, () => {
      poly(p, [R(-18, -42), R(-14, -26), R(-16, -10), R(-26, -10), R(-25, -26),
        R(-30, -40)], BASE);
    });
  });
  flat(p, () => poly(p, [R(-29, -12), R(-13, -12), R(-12, 0), R(-30, 0)], BASE));
  toeNotches(p, cx - 29, cx - 13, G, 3, 4);

  /* --- the mantle --------------------------------------------------------- */
  // One continuous sheet of quarried slate over the whole back, thicker than
  // the animal beneath it so its rim OVERHANGS -- and the cast shadow it throws
  // down the chalk flank is the thing that makes the shell read as a hard
  // object sitting on a soft one. That shadow is the most valuable mark on this
  // sprite and it replaces the seam ring the shipped version drew.
  cast(p, 84, () => {
    flat(p, () => {
      poly(p, [
        R(-30, -46), R(-12, -58), R(8, -52), R(32, -56), R(50, -48), R(53, -42),
        R(46, -40), R(26, -38), R(6, -38), R(-16, -40), R(-30, -42),
      ], BASE);
      // The plane of the mantle that turns away, along the far side of the
      // spine -- and kept SHALLOW on purpose. A deeper strip cuts the shell's
      // own colour in half and the largest connected region on the sprite stops
      // being the shell, which is the one metric this creature is worst at.
      poly(p, [R(-12, -58), R(8, -52), R(32, -56), R(50, -48), R(52, -45),
        R(43, -48), R(28, -51), R(6, -48), R(-10, -53)], FORM);
    });
  }, 8, 8);

  // THE RIM. One rusted lip the whole length of the animal, and the chalk
  // disappearing under it. The second hue as a CONTINUOUS BAND rather than as
  // an edging too thin to paint its own colour: on the shipped version this
  // species' second hue covered 0.0 % of the sprite.
  flat(p, () => {
    poly(p, [R(-30, -42), R(-16, -40), R(6, -38), R(26, -38), R(46, -40), R(53, -42),
      R(52, -36), R(45, -34), R(26, -32), R(6, -32), R(-16, -34), R(-30, -37)], ACCENT);
    poly(p, [R(-30, -37), R(-16, -34), R(6, -32), R(26, -32), R(45, -34), R(52, -36),
      R(51, -33), R(43, -31), R(26, -29), R(6, -29), R(-16, -31), R(-29, -34)], ACCENT_DARK);
  });

  /* --- the plates --------------------------------------------------------- */
  // FIVE, tallest over the shoulder and tapering back, all five leaning
  // backward. Never seven identical evenly-spaced ones: that is a comb, and it
  // is what this creature shipped with. They are RUST, not slate, which is what
  // carries the second hue up over the skyline and gets it to a share you can
  // see rather than an edging you cannot.
  flat(p, () => {
    // ONE FLAT TONE PER PLATE, decided by which way that plate faces. Splitting
    // each of the five into a lit half and a dark half put nine regions and a
    // hundred short runs on the sprite for a step nobody can see at 64 px; a
    // plane takes one tone across its whole area and no gradient at all.
    poly(p, [R(-19, -55), R(-9, -73), R(-3, -57)], ACCENT);
    poly(p, [R(-3, -55), R(7, -70), R(13, -53)], ACCENT);
    poly(p, [R(13, -53), R(22, -65), R(27, -55)], ACCENT);
    poly(p, [R(27, -55), R(35, -65), R(39, -53)], ACCENT_DARK);
    poly(p, [R(39, -52), R(45, -60), R(49, -49)], ACCENT_DARK);
    // the third hue: a pale ochre lip up the leading edge of the two biggest
    poly(p, [R(-19, -55), R(-9, -73), R(-12, -62), R(-15, -55)], ACCENT2);
    poly(p, [R(-3, -55), R(7, -70), R(4, -61), R(1, -55)], ACCENT2);
  });

  /* --- the tail ----------------------------------------------------------- */
  flat(p, () => {
    poly(p, [R(48, -40), R(54, -34), R(55, -27), R(48, -28)], BASE);
    poly(p, [R(54, -34), R(55, -27), R(50, -28), R(51, -32)], ACCENT);
  });

  /* --- the head ----------------------------------------------------------- */
  // Carried EIGHT cells below the withers and thrown forward of the chest. The
  // occiput dips three cells between the skull and the mantle, which is the
  // twelfth reversal and the reason the head is a head and not a bulge.
  cast(p, 30, () => {
    flat(p, () => {
      poly(p, [R(-28, -48), R(-40, -53), R(-51, -49), R(-54, -38), R(-53, -26),
        R(-45, -18), R(-34, -17), R(-28, -24)], BASE);
      // the far side of the skull, turned away
      poly(p, [R(-40, -53), R(-51, -48), R(-49, -44), R(-38, -45), R(-28, -42),
        R(-28, -48)], FORM);
    });
  });
  notch(p, cx - 30, G - 51, 6, 4, 0, 1);

  // The muzzle: chalk, and its REAR EDGE IS A SLANT rather than an ellipse --
  // the same area as an axis-aligned oval reads as a stain and this reads as
  // bone. Its top is below the bottom of the eye.
  cast(p, 15, () => {
    flat(p, () => {
      poly(p, [R(-63, -23), R(-62, -32), R(-50, -33), R(-44, -22), R(-46, -15),
        R(-59, -15)], LIGHT);
    });
  });

  if (p.back) { p.face(cx - 41, G - 40, 14); return; }

  /* --- the face ----------------------------------------------------------- */
  // THE WORST EYE RATIO IN THE GROUP, AND IT ONLY SHOWED AT 1x. A 'slit m'
  // pair at spread 6 put two seven-cell ink masses nineteen cells apart on a
  // skull that is twenty-six cells wide -- 79 % of the head, with one and a
  // half cells of chalk outboard of the near eye and five between them. At 8x
  // that is two tilted almonds; at the size the game draws it, it is a bar.
  // Dropped to 's' and moved one cell back onto the skull: fifteen cells of
  // twenty-six (58 %), six cells of slate between, five and a half outboard.
  eyeRow(p, cx - 40, G - 40, 6, 'slit', 's', { far: 's-', tilt: -2 });
  // ONE mark below the eyes: the nostril, three cells of INNER with a chalk
  // cell under it. Three cells, and it is the highest value-per-cell mark
  // anywhere on a sprite.
  cavity(p, cx - 61, G - 26, cx - 58, G - 24);
  cellOver(p, cx - 59, G - 23, LIGHT);
}

/* ============================================================ 48 anchorling */

/**
 * ANCHORLING -- the Lost Weight. 1.1 m. LARGE.
 *
 * ROUND 7. "AN ANCHOR WITH A FACE", FOUR ROUNDS RUNNING.
 * Every author who has touched this creature has written that sentence down
 * honestly and then moved on, so here is the diagnosis and the fix.
 *
 * The reason it read as an anchor with a face is that IT HAD NO HEAD END. The
 * parts were correct ironmongery -- ring, stock, shank, crown, arms, flukes --
 * assembled in the order a real anchor assembles them, and the eye was a lens
 * set into a flat plate halfway down a straight bar, with a horizontal
 * crossbar directly ABOVE it and a ring above that. Nothing in that stack is a
 * skull, and an eye that is not in a skull is a badge. Worse, a horizontal bar
 * across the top of a face is the single most reliable way to turn it into a
 * hat, or a pair of sunglasses -- which is the defect this whole group was
 * rebuilt to remove and which this creature was still committing in a
 * different form.
 *
 * THE THREE CHANGES, and they are all structural:
 *
 *  1. THE SHANK'S TOP END IS A SKULL. Forty-three cells across, rounded, with
 *     a brow, a temple, a cheek and a blunt CHIN that hangs forward of the bar
 *     beneath it. The eye is inside that skull with iron all round it, not
 *     stamped onto a plate.
 *  2. THE STOCK MOVED BELOW THE HEAD. It was a crossbar over the face; it is
 *     now a yoke across the SHOULDERS, tilted, its near end hanging four cells
 *     lower and reaching eleven cells further than its far end. A horizontal
 *     bar under a head is a pair of shoulders. The same bar above a head is a
 *     hat. Same forty cells of iron, opposite reading.
 *  3. THE RING IS ON THE SIDE OF THE SKULL, not on a stalk above it. It still
 *     punches a real fourteen-cell hole of sky through the silhouette -- the
 *     one thing on this sprite that survives being shrunk to anything -- but it
 *     now reads as something the creature WEARS rather than the point you pick
 *     it up by.
 *
 * And the posture. It stands like a thing that is alive: the near arm strides
 * forward and plants a broad splayed fluke on the floor, the far arm trails
 * back and its fluke stops eight cells short of the ground, the shank leans
 * over the planted foot, and the skull is cocked -- its crown carried left of
 * its own chin. Nothing in that arrangement is a position an anchor can be put
 * down in.
 *
 *  1. WHAT IS IT? A working iron anchor that grew a head, crusted green from
 *     the waist down, striding somewhere with one big lamp of an eye.
 *  2. BODY PLAN. G, mineral / object, pushed toward E. An object lives or dies
 *     on PRECISION OF SHAPE, so every part is still a named piece of
 *     ironmongery drawn with `poly` and `flat` and the whole interior is
 *     planes -- but the parts are now arranged as a body.
 *  3. RUNG. LARGE. Long dimension 101 cells (band 100-116); body area ~5100
 *     cells = ~1275 reference px. Smaller than chalkmar by area and taller by
 *     half, which is what stops the two LARGE species in this group reading as
 *     one another.
 *  4. ASPECT. 84 wide x 101 tall, 0.83:1. It is the only creature in the group
 *     with SKY THROUGH IT, and that is most of what it is at icon size.
 *  5. SMOOTH OR STRUCTURED? STRUCTURED, and hard: every edge is a straight bar
 *     or a true circle, because an anchor drawn approximately is not an anchor.
 *  6. MASSES (5): skull-and-ring, stock, shank, near arm and fluke, far arm and
 *     fluke.
 *  7. HEAD VERB: COCKED -- the crown is carried thirteen cells left of the
 *     chin, so the skull's axis is not the shank's. BODY VERB: STRIDING, weight
 *     forward and left over the planted near fluke, the far one trailing and
 *     clear of the floor.
 *  8. SIGNATURE: THE RING -- a real hole, fourteen cells of sky inside the
 *     silhouette, now set through the side of the head.
 *  9. TWELVE NAMED VERTICES: crown (-11,-97) . temple left (-27,-80) . jaw
 *     left (-22,-68) . CHIN (-4,-62) . cheek right (15,-74) . ring outer
 *     (35,-84) . stock far end (30,-64) . stock near end (-40,-50) . shank
 *     waist (13,-40) . CROWN of the anchor (0,-24) . near elbow (-16,-24)
 *     . NEAR FLUKE tip (-48,-4) . far elbow (18,-22) . FAR FLUKE tip (40,-11).
 * 10. HUES. H1 iron #5f7d92, hue 200, chroma 51 -- skull, ring, stock, shank,
 *     ~52 %. H2 barnacle green #4f7f4a, hue 116 -- the crust over both arms and
 *     flukes and the weed off the near end of the stock, ~17 %. H3 rust
 *     #c87a34 -- the eye and two streaks below the stock, ~5 %.
 * 11. FOUR INTERIOR DETAIL EVENTS: the eye and its socket; the brow plane and
 *     its cast shadow; the barnacle crust; the stock's cast shadow down the
 *     shank.
 * 12. EYES. ONE, `gem` at `xl`, in a socket cut into the skull, with a rust
 *     field -- the manual's answer for a species that has a head but no face,
 *     and Dusclops'. A single eye reads by the size of the dark AROUND it, so
 *     the socket is the event and the lens is the note. The one mark below the
 *     eye is a HAWSE SLOT in `INNER` in the jaw, four cells, which is the
 *     cheapest mark on any sprite and the thing that stops the eye being the
 *     lowest feature on the head.
 * 13. SURFACE MATERIAL: the barnacle crust, in one place -- everything below
 *     the shank's waist -- and it breaks the outline in five lumps.
 * 14. INTERNAL DARK LINES: none authored.
 * 15. Not part of an evolution line.
 */
function anchorling(p: Pen): void {
  p.noTypeTraits();
  palette(p, [
    '#5f7d92', // base    iron, hue 200, chroma 51.
    '#33495a', // shade   FORM, and the far arm.
    '#9fc9e0', // light   hue 200, chroma 65 -- more saturated than base.
    '#4f7f4a', // accent  barnacle and weed green.
    '#c87a34', // accent2 rust, and the eye.
    '#171f28', // ink     darkest of the six.
  ]);

  const cx = p.cx, G = p.ground;
  const R = (dx: number, dy: number): Pt => [cx + dx, G + dy];

  /* --- the far arm and fluke: TRAILING ------------------------------------ */
  // Shorter, thinner, set back, and in SHADE -- a genuinely separate part
  // behind another one, which is the only thing SHADE is for. Its fluke stops
  // eight cells off the floor, which is the whole of "three feet down, one
  // lifted" on a two-legged creature.
  flat(p, () => {
    poly(p, [R(4, -28), R(16, -25), R(28, -15), R(23, -9), R(12, -17), R(3, -19)], SHADE);
    poly(p, [R(22, -20), R(37, -15), R(35, -7), R(20, -8)], SHADE);
  });

  /* --- the ring ------------------------------------------------------------ */
  // A REAL HOLE, fourteen cells of sky, and it is drawn FIRST so the skull
  // overlaps it: a ring the head passes in front of is worn, and a ring
  // balanced on top of the head is a handle.
  // IT SITS HIGH AND BEHIND, NOT BESIDE. The first cut of this redraw put the
  // ring level with the eye, and a dark disc and a hole of sky at the same
  // height on one head is a face with two eyes, one of which you can see
  // through. Lifted thirteen cells it is a crest and the head has one eye
  // again. Judged at 1x, where it was unmistakable and where it is the only
  // thing about this creature anybody will ever see.
  flat(p, () => {
    blob(p, cx + 20, G - 93, 12, 12, BASE);
    blob(p, cx + 16, G - 97, 8, 8, LIGHT);
    blob(p, cx + 17, G - 96, 5, 5, BASE);
    blob(p, cx + 20, G - 93, 6, 6, EMPTY);
  });

  /* --- the shank ----------------------------------------------------------- */
  // The body. It LEANS: eight cells of offset between the waist and the crown,
  // so the mass is carried over the planted fluke and not between the two.
  flat(p, () => {
    poly(p, [R(-16, -66), R(17, -66), R(18, -40), R(12, -22), R(-11, -22),
      R(-13, -40)], BASE);
    poly(p, [R(7, -66), R(17, -66), R(18, -40), R(12, -22), R(5, -22),
      R(8, -40)], FORM);
  });

  /* --- the near arm and fluke: STRIDING ------------------------------------ */
  // Forward, planted, and splayed: the fluke is a broad flat foot twenty-four
  // cells across against a twelve-cell ankle, which is the step that makes a
  // foot exist. It throws its shadow back onto the shank.
  cast(p, 20, () => {
    flat(p, () => {
      poly(p, [R(-2, -30), R(-16, -26), R(-30, -15), R(-27, -4), R(-14, -13),
        R(-2, -18)], BASE);
      // the fluke: a POINTED BLADE, not a boot. Twenty-two cells across
      // against a twelve-cell ankle -- the step that makes a foot exist -- but
      // driven to a hard point at the toe, because that point is most of what
      // still says ANCHOR once the thing is standing up like a person.
      poly(p, [R(-27, -18), R(-45, -8), R(-42, 0), R(-23, -1)], BASE);
      poly(p, [R(-27, -18), R(-45, -8), R(-43, -4), R(-28, -12)], LIGHT);
    });
  });

  /* --- the stock: THE SHOULDERS -------------------------------------------- */
  // It used to cross ABOVE the eye, which made a hat out of it and a pair of
  // sunglasses out of the face. It crosses BELOW the chin now and it is a yoke.
  // Tilted, near end lower and longer, and it casts down the shank -- the mark
  // that makes two bars read as crossing rather than as one welded T.
  cast(p, 71, () => {
    flat(p, () => {
      poly(p, [R(-38, -59), R(29, -67), R(30, -53), R(-39, -45)], BASE);
      poly(p, [R(-39, -52), R(30, -60), R(30, -53), R(-39, -45)], FORM);
      poly(p, [R(-38, -59), R(29, -67), R(29, -63), R(-38, -55)], LIGHT);
      // the knobs: a real stock is upset at both ends, and the pair is the
      // clearest surviving anchor cue once the creature is standing up
      poly(p, [R(-38, -61), R(-32, -61), R(-31, -43), R(-38, -43)], BASE);
      poly(p, [R(24, -69), R(30, -69), R(31, -51), R(24, -51)], BASE);
    });
  });

  /* --- the skull ----------------------------------------------------------- */
  // THE HEAD END, and it is the whole point of this redraw. Forty-three cells
  // across, rounded, COCKED -- the crown is carried thirteen cells left of the
  // chin -- and it hangs its blunt jaw forward over the yoke, so the two masses
  // step rather than stack. Its shadow falls across the stock.
  cast(p, 43, () => {
    flat(p, () => {
      poly(p, [
        R(-25, -66), // jaw left
        R(-31, -79), // temple left
        R(-25, -93),
        R(-13, -99), // crown
        R(2, -97),
        R(14, -88),
        R(17, -73), // cheek right
        R(10, -63),
        R(-5, -60), // CHIN -- the lowest and most forward point
        R(-18, -61),
      ], BASE);
      // the brow and crown plane, facing up and left: ONE facet, and its lower
      // edge is the overhang that shadows the socket
      poly(p, [R(-31, -79), R(-25, -93), R(-13, -99), R(2, -97), R(4, -89),
        R(-12, -90), R(-26, -84)], LIGHT);
      // the far cheek, turned away
      poly(p, [R(14, -88), R(17, -73), R(10, -63), R(5, -66), R(9, -75),
        R(9, -86)], FORM);
    });
  }, 7, 7);

  /* --- the barnacle crust -------------------------------------------------- */
  // Everything that sat in the mud, painted as a MATERIAL over both arms and
  // flukes rather than as spots on the iron, with an upper edge of five
  // irregular lumps that break the outline. A surface material drawn where it
  // does not break the outline is the all-over texture the player named.
  flat(p, () => {
    poly(p, [R(-2, -20), R(-16, -18), R(-29, -10), R(-37, -4), R(-35, -1),
      R(-25, -1), R(-27, -7), R(-14, -11), R(-2, -13)], ACCENT);
    poly(p, [R(-35, -12), R(-30, -20), R(-24, -13)], ACCENT);
    poly(p, [R(-17, -19), R(-11, -27), R(-6, -18)], ACCENT);
    poly(p, [R(3, -16), R(15, -18), R(25, -13), R(24, -8), R(13, -13), R(3, -12)], ACCENT_DARK);
    poly(p, [R(24, -14), R(32, -13), R(31, -8), R(22, -8)], ACCENT_DARK);
    poly(p, [R(14, -18), R(19, -25), R(24, -16)], ACCENT_DARK);
    // and the weed streaming off the near end of the stock: three strands of
    // three lengths, never one leaf-shaped lobe
    poly(p, [R(-38, -54), R(-36, -43), R(-38, -36), R(-40, -42), R(-41, -50)], ACCENT);
    poly(p, [R(-34, -51), R(-32, -41), R(-35, -40), R(-36, -47)], ACCENT);
    poly(p, [R(-41, -52), R(-43, -45), R(-45, -46), R(-44, -51)], ACCENT);
  });

  /* --- the rust ------------------------------------------------------------ */
  // Two streaks below the yoke, where the iron has been wet longest. Three
  // cells wide, so `internalEdges` leaves them alone -- a stripe that thin is
  // not a mass and must not be ringed.
  flat(p, () => {
    poly(p, [R(-7, -44), R(-4, -44), R(-3, -29), R(-6, -29)], ACCENT2_DARK);
  });

  if (p.back) { p.face(cx - 9, G - 80, 18); return; }

  /* --- the eye ------------------------------------------------------------- */
  // ONE lamp, in a socket cut into the skull. A single eye reads by THE SIZE OF
  // THE DARK AROUND IT -- Dusclops' eye is small and carries the sprite because
  // it is alone in a large flat dark -- so the socket is the event and the lens
  // is the note. There is iron on every side of it now, which is the difference
  // between an eye in a head and a lens bolted to a bar.
  flat(p, () => {
    poly(p, [R(-21, -79), R(-18, -87), R(-9, -91), R(1, -87), R(2, -76),
      R(-4, -70), R(-16, -71)], DEEP);
  });
  eyeStamp(p, cx - 9, G - 80, 'gem', 'xl', { iris: ACCENT2 });
  // ONE mark below the eye: the hawse slot in the jaw. The eye must never be
  // the lowest thing on the head, and on 36 of 48 species it still is.
  cavity(p, cx - 20, G - 65, cx - 15, G - 64);
  p.face(cx - 9, G - 80, 18);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  pebblet,
  cairnling,
  menhir,
  chalkid,
  chalkmar,
  anchorling,
};
