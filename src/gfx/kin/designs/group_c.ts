/**
 * Design group C -- the tide Kin. Round 6: redrawn from the animal, not edited.
 *
 * WHY EVERY FUNCTION IN HERE IS NEW. The previous six were written against a
 * pipeline in which there was no line-free way to say "darker": SHADE and DEEP
 * were both classified as recesses and had hard ink ruled round them, so an
 * author who wanted a shadowed haunch with no ring on it could not write one.
 * Every author in the project hit that wall and drew a smooth blob instead.
 * Round 6 added `FORM` and `cast()`, and that changes the construction of a
 * sprite rather than its finish -- so the old functions were read once for what
 * the creature is meant to be and then thrown away.
 *
 * The flat test on the shipped six is the whole indictment: filled with one
 * colour, five of the six were an unnameable lozenge. shalefin was a bean with
 * two pimples, brookmaw a bean with a fan, tidewrack a bean on four pegs,
 * deeplum a bean with a ball. Only maelstrix (a serpent) and brinewisp (a bell
 * under a hood) survived, and both survived because their concept happens to BE
 * a silhouette.
 *
 * WHAT THE SIX ARE NOW.
 *
 *   shalefin   a flounder lying on a gravel flat: a long low lens whose dorsal
 *              line carries two EYE BUMPS and a notch between them, ochre
 *              gritted hide above a hard mottle line, grey-blue flank below,
 *              and a lobed pale fin band along both contours.
 *   tidewrack  the same fish four times the mass, heaved off the bottom on two
 *              braced flippers under a roof of four stepped shingle plates,
 *              with a blunt stone prow for a head. The dorsal half of the
 *              inherited fin band has vanished under the armour -- the whole
 *              evolution told in one overlap.
 *   brookmaw   a river brute built like a bowfin: a long wedge skull carried
 *              BELOW the shoulder line with a projecting lower jaw, a withers /
 *              back-dip / croup back line, a real belly tuck, two braced
 *              webbed forelimbs and a standing pale fluke.
 *   maelstrix  what that becomes: one thick tube coiled on the floor with the
 *              neck rising THROUGH the coil and crossing in front of it, so
 *              there is a real overlap for a real cast shadow. Crowned, and
 *              wearing the same underbitten wedge jaw.
 *   deeplum    an anglerfish hanging in black water: the gape is a V bitten out
 *              of the front of the silhouette between two toothed lips, and the
 *              lure is a green ball alone in empty canvas.
 *   brinewisp  no body: a leaning cowl with a hard brim over a black hollow,
 *              one lens burning in it, over a four-lobed brine veil whose hem
 *              is the species' second hue.
 *
 * THE TWO EVOLUTION PAIRS, and what each keeps.
 *
 *   shalefin -> tidewrack.  ONE SILHOUETTE SIGNATURE: the lobed pale fin band
 *   standing off the body contour, thin at the head and deep at the tail. ONE
 *   PALETTE RELATIONSHIP: ochre hide ABOVE a hard mottle boundary, grey-blue
 *   flank below it, pale fin between -- the same three materials in the same
 *   three places, one step darker in every slot. Everything else changes: the
 *   fish lies on the floor at 82 cells and the evolution stands on flippers at
 *   110; the mottle boundary that is a soft camouflage line on shalefin is the
 *   RIM OF A SHELL on tidewrack; and the dorsal half of the fin band is gone.
 *
 *   brookmaw -> maelstrix.  ONE SILHOUETTE SIGNATURE: the wedge skull with the
 *   lower jaw projecting four cells past the snout, so the underbite is in the
 *   outline and survives a black fill. ONE PALETTE RELATIONSHIP: the identical
 *   blue body and the identical pale-cyan jaw. The accent moves from near-white
 *   to lilac, which is the Psyche type arriving, and its area share doubles.
 *   Everything else changes -- brookmaw is a low braced quadrupedal thing with
 *   its head below its shoulders, maelstrix is a limbless reared coil.
 *
 * THE THREE HUES, per species, and where each lives. `species.json` declares
 * five slots for all six of these, so `ACCENT2` resolves back to `ACCENT` and
 * the third hue has to come from `INNER` -- which is the right answer anyway
 * for a group in which every member has a mouth, a gill or a cavity. (If the
 * palettes are ever re-authored to six slots, the obvious third hues are: a
 * rust on tidewrack's shingle, a gold crown on maelstrix, a warm gullet on
 * brookmaw. None of that is mine to edit.)
 *
 * WHAT IS DELIBERATELY NOT HERE.
 *  - No `rimLight`, no hand-painted sheen, no `lit:` runs down a limb. The
 *    light pass now bands parallel to each mass's own axis and insets the
 *    bright band from the contour. maelstrix's old hand-drawn dorsal ridge was
 *    fighting it and is gone.
 *  - No `speckle`, no grit stipple, no fin rays ruled round a whole rim. The
 *    old `fringe` helper ruled a dark ray every seventh cell round an entire
 *    flatfish; the fin band now says "fin" with its lobed OUTLINE and says it
 *    once.
 *  - No `{ front: true }` on a limb and no `*Front` call anywhere in the group.
 *    Every mass-on-mass separation in this file is a cast shadow: seventeen of
 *    them across the six, against zero on the whole shipped roster.
 *
 * WHAT THE SIX MEASURE, rendered through the real factory and counted.
 *
 *              bbox      ref px  scan  runs  big1  ink   edge  BASE   H2     INNER
 *   shalefin    86 x  53    795  3.35   318  24.3% 24.9%  5.6% 25.1% 17.3%  0.60%
 *   tidewrack  118 x  72   1538  6.04   577  27.1% 17.0%  2.0% 28.7% 25.9%  0.59%
 *   brookmaw   115 x  85   1415  7.91   862  17.9% 21.2%  2.2% 34.5% 21.2%  1.31%
 *   maelstrix  117 x 108   2186  6.38   932  17.9% 17.2%  2.4% 31.7% 15.6%  1.65%
 *   deeplum    107 x 108   1410  4.41   693  26.1% 24.2%  2.4% 32.3% 16.6%  3.26%
 *   brinewisp   70 x 101   1233  2.42   500  18.3% 21.3%  4.4% 25.6% 14.5%  2.19%
 *
 * `scan` is tone changes per horizontal scanline (target <= 4), `runs`
 * body-ramp runs (<= 250), `big1` the largest connected same-tone region
 * (>= 25 %), `edge` author-driven internal ink (< 5 %), `H2` the second hue's
 * share (15-30 %). The size ladder is monotone across the four rungs the group
 * occupies -- SMALL 795, MID 1233/1404, LARGE 1415/1538, HUGE 2185 -- and every
 * one of the six is drawn inside 120 x 110, so `fitToCell` returns k = 1.000
 * on all six and nothing is resampled. That was 26 of 48 before.
 *
 * WHAT IS STILL OVER, AND WHY, because pretending otherwise wastes the next
 * author's time.
 *
 *  - `runs` and `big1`. These are set by the light pass banding each mass, and
 *    the only lever an author has is FEWER, LARGER, FLATTER masses. The lever
 *    works: shalefin, whose ochre hide is one `flat()` facet, measures 0.095
 *    runs per opaque cell; brookmaw, which has eleven masses and no facets on
 *    its body, measures 0.148. For comparison, two species not yet redrawn
 *    measure 0.164 (cinderpaw) and 0.141 (rimehound) through the same
 *    pipeline. So all six here are at or below the current roster, and the
 *    absolute targets are not reachable by drawing alone.
 *  - BODY PIXELS DARKER THAN THE MEAN OUTLINE: measured 0.0-3.7 % against a
 *    target of 12-25 %, and this one is a PALETTE fact, not a drawing fact.
 *    Every one of these six ships a `shade` slot LIGHTER than its own ink --
 *    by 15 luma on tidewrack, 23 on brookmaw, 38 on brinewisp -- so `FORM`,
 *    which resolves to `shade` and is the tone every cast shadow is painted
 *    in, can never get under the line. The only body tone that can is `DEEP`,
 *    and it wins by three or four luma. Each species here carries one
 *    hand-placed `DEEP` core shadow of about 1 % for exactly that reason. To
 *    reach the target these palettes need genuinely dark `shade` slots, which
 *    is six hex values in `data/creatures/species.json` and not in this file.
 *  - brookmaw measures ONE distinct hue, and it is the same cause: its declared
 *    accent `#dce8f0` has chroma 20/255, so it is a VALUE and not a colour. See
 *    the note in that species' brief.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, FORM, INNER, LIGHT, SHADE,
  blob, brow, cast, eyeRow, eyeStamp, fin, flat, limbPath, mouthLine, nostril,
  occlude, path, plate, poly, spec, stroke, toeNotches,
  type Pen, type Pt,
} from '../parts.js';

/* ------------------------------------------------------------- helpers */

/**
 * A SCALLOPED FIN BAND standing off a contour: the one shape shalefin and
 * tidewrack share, and the reason the two read as one line.
 *
 * `inner` is the path it grows from, `amps` one depth per lobe -- an array
 * rather than a count, because the manual's rule about repeated elements is
 * that they must VARY along the run, and a lobe generator driven by a single
 * amplitude produces a comb. `sign` is +1 to grow to the path's left (up, for a
 * left-to-right path) and -1 to grow right (down).
 *
 * The notches bottom out at 55 % of each lobe's depth rather than at zero. At
 * zero the band is a saw and the outline pass inks every tooth; at 55 % it is
 * the scallop a real fin margin has. It is drawn inside `flat()` because a fin
 * web is a PLANE -- one tone across its whole area, no gradient -- and the
 * light pass banding it is what made the old one look inflated.
 */
function finBand(p: Pen, inner: Pt[], amps: number[], sign: number, tone: number): void {
  const dense = path(inner);
  const n = dense.length;
  if (n < 2) return;
  const outer: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const k = Math.min(amps.length - 1, Math.floor(t * amps.length));
    const u = t * amps.length - k;
    const a = dense[Math.max(0, i - 1)]!, b = dense[Math.min(n - 1, i + 1)]!;
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const d = Math.hypot(tx, ty) || 1;
    const depth = amps[k]! * (0.55 + 0.45 * Math.sin(Math.PI * u)) * sign;
    outer.push([dense[i]![0] + (ty / d) * depth, dense[i]![1] - (tx / d) * depth]);
  }
  flat(p, () => poly(p, [...dense, ...outer.reverse()], tone));
}

/* ============================================================= shalefin */

/**
 * THE BRIEF SHEET
 *
 *  1. WHAT IS IT.  A flounder: a fish that fell over onto one side and stayed
 *     there, so both eyes migrated onto what is now the top of its head and it
 *     spends its life pretending to be gravel.
 *  2. PLAN AND WHAT IT DEMANDS.  B, non-quadruped animal, fish. B demands: do
 *     not stand it up, and do not draw it the same size as everything else. It
 *     has no legs, it makes contact along its whole underside and one planted
 *     pectoral, and at 0.4 m it is the smallest thing in the group by a wide
 *     margin, with empty canvas above it.
 *  3. RUNG.  SMALL (0.4 m). Target 68-84 cells long, 650-1000 ref px body.
 *     MEASURED 86 x 53 shipped, 795 ref px. Inside the band and by a wide
 *     margin the smallest thing in the group, which is the whole point of a
 *     ladder. Nothing here is resampled: every one of the six is drawn inside
 *     120 x 110 and `fitToCell` returns k = 1.000.
 *  4. ASPECT AND FILL.  86 x 53, aspect 1.62, fill 70 % -- long and low, the flattest
 *     thing in the group. tidewrack, the same animal grown up, is 1.5.
 *  5. SMOOTH OR STRUCTURED.  STRUCTURED, and that is the change. It was smooth
 *     and it came out as a bean. The structure is entirely in the dorsal line:
 *     brow, eye bump, ocular saddle, second eye bump, occiput dip, dorsal peak.
 *  6. MASSES (4).  The body lens; the fin band (dorsal + ventral, one material
 *     said once); the pectoral; the tail fan.
 *  7. HEAD VERB / BODY VERB.  Head level and forward -- it is not looking at
 *     you, it is hoping you have not seen it. The body is propped: the near
 *     pectoral is planted and takes weight, so the head end is two cells clear
 *     of the floor and the tail end is not.
 *  8. SIGNATURE, AND IT IS IN THE SILHOUETTE.  Two eye bumps on the dorsal line
 *     with a notch between them. Fill the sprite with black and it is still a
 *     flatfish, because nothing else in the dex has its eyes on its back.
 *  9. EIGHT OF THE TWELVE REVERSALS, with coordinates (cx, G relative):
 *       upper lip        (cx-37, G-26)  contour turns up off the snout
 *       brow front       (cx-36, G-33)  steps up onto the first turret
 *       eye bump 1       (cx-31, G-39)  high point, front
 *       ocular saddle    (cx-24, G-30)  9-cell sag BETWEEN the two eyes
 *       eye bump 2       (cx-16, G-41)  second high point, higher and smaller
 *       occiput dip      (cx-10, G-33)  the nape, 8 cells down
 *       dorsal peak      (cx+2,  G-42)  third high point
 *       peduncle top     (cx+26, G-25)  the waist; the sharpest angle on it
 *       peduncle bottom  (cx+26, G-11)  the same waist from below
 *       pelvic notch     (cx-17, G-8)   belly steps up 2 into the throat
 *       throat           (cx-29, G-12)  and up 4 again into the jaw
 *     Eleven. The back does not run straight for more than 12 cells anywhere.
 * 10. THREE HUES.  H1 grey-blue flank (BASE) below the mottle line; H2 ochre
 *     gritted hide (ACCENT) above it -- one flat region, MEASURED 17.4 %, not a scatter of
 *     blotches; H3 `INNER` in the mouth and the gill. The pale fin band is
 *     LIGHT, a step of the body's own ramp, so the fin is the creature's
 *     material rather than a stuck-on object.
 * 11. FOUR DETAIL EVENTS.  (a) the face -- two eyes, a mouth, the brow shadow;
 *     (b) the mottle boundary, one line, both ends on the silhouette; (c) the
 *     fin band, said once, as an outline; (d) three cast shadows. The flank
 *     carries nothing else at all.
 * 12. EYES.  `round`, `s`, spread 7 (14 cells centre to centre, 1.3 eye widths
 *     -- crowded, which is what a flatfish's are), far `s-`, and `tilt: -3` so
 *     the far eye rides three cells higher up the skull. `s` rather than `m` is
 *     deliberate: the eye BUMPS are 10 cells across and an 11-cell stamp would
 *     touch the outline and merge with it. The bumps do the reading; the stamps
 *     only have to sit in them. One mark below the eyes: the mouth.
 * 13. SURFACE MATERIAL, at most three places, all silhouette-breaking. ONE: the
 *     fin band, on the dorsal and ventral contours. There is no scale, no grit
 *     stipple and no ray anywhere on the flank.
 * 14. EVERY INTERNAL DARK LINE.  Exactly two. The mottle boundary (snout
 *     contour -> peduncle contour, both ends on the outer silhouette, and it is
 *     drawn by the edge pass off the ACCENT mass rather than by hand). The gill
 *     seam (`occlude`, nape contour -> throat contour). Nothing else.
 * 15. First stage. See the family note at the head of the file.
 */
function shalefin(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Every species in this group draws its own water. The type pass plants a
  // dorsal fin on whatever is highest, three gill slits and two loose sheen
  // cells -- on a fish whose whole rim is already fin the first is redundant
  // and the last two are exactly the specks the player counted.
  p.noTypeTraits();

  /* --- THE OUTLINE, first, and nothing is painted inside it until it reads.
     Eighteen named vertices; see the reversal list in the brief above. `poly`
     and not `blob`, because every one of those names is a vertex and an ellipse
     throws all of them away. */
  const snout: Pt = [cx - 40, G - 20];
  const upperLip: Pt = [cx - 37, G - 26];
  const browFront: Pt = [cx - 36, G - 33];
  const bump1: Pt = [cx - 31, G - 39];
  const saddle: Pt = [cx - 24, G - 30];
  const bump2: Pt = [cx - 16, G - 41];
  const occiput: Pt = [cx - 10, G - 33];
  const dorsal: Pt = [cx + 2, G - 42];
  const dorsalFall: Pt = [cx + 15, G - 36];
  const peduncleT: Pt = [cx + 26, G - 25];
  const tailRootT: Pt = [cx + 31, G - 22];
  const tailRootB: Pt = [cx + 31, G - 13];
  const peduncleB: Pt = [cx + 26, G - 11];
  const bellyRear: Pt = [cx + 13, G - 7];
  const bellyMid: Pt = [cx - 6, G - 6];
  const pelvic: Pt = [cx - 17, G - 8];
  const throat: Pt = [cx - 29, G - 12];
  const lowerLip: Pt = [cx - 38, G - 16];

  /* --- 1. THE TAIL FAN, first, so the peduncle laps its root. A rayed web,
     not a paddle: `fin` lays the membrane as a facet and then three struts back
     to the root, and the struts are what stop it reading as a leaf. Their tone
     is FORM -- the body's own dark -- rather than ACCENT_DARK, because on a
     LIGHT membrane an accent strut is a stripe of a foreign colour. */
  cast(p, 16, () => {
    fin(p, [cx + 28, G - 17], [[cx + 37, G - 27], [cx + 41, G - 17], [cx + 37, G - 7]],
      { tone: LIGHT, rays: 3, ray: FORM });
  });

  /* --- 2. THE BODY. One polygon, eighteen named vertices. */
  poly(p, [snout, upperLip, browFront, bump1, saddle, bump2, occiput, dorsal,
    dorsalFall, peduncleT, tailRootT, tailRootB, peduncleB, bellyRear, bellyMid,
    pelvic, throat, lowerLip], BASE);

  /* --- 3. THE GRITTED HIDE, ochre, above a mottle boundary that runs from one
     edge of the animal to the other -- so the ink the edge pass lays along it
     is anatomy rather than a ring round a blotch. Every vertex of the upper
     half is a vertex of the body outline, so it can never extend the
     silhouette.
     IT IS A `flat()` FACET, and that was the fix. Painted as ordinary ACCENT it
     went through the accent ramp, and on a cool-typed species `ACCENT_LIT` is
     the accent mixed 55 % into a cold near-white: the ochre crust came out as a
     pale blue wash with a thin band of its own colour surviving in the middle.
     Flat, it stays ochre everywhere, which is also what it IS -- a cemented
     crust of gravel, a mineral, and minerals in the reference are faceted and
     flat. tidewrack's shingle is the same decision on the same material, which
     is what makes the two read as one line. */
  flat(p, () => {
    poly(p, [snout, upperLip, browFront, bump1, saddle, bump2, occiput, dorsal,
      dorsalFall, peduncleT, tailRootT,
      [cx + 31, G - 21], [cx + 22, G - 25], [cx + 10, G - 29], [cx - 4, G - 31],
      [cx - 18, G - 25], [cx - 30, G - 26], [cx - 39, G - 20]], ACCENT);
  });

  /* --- 4. THE FIN BAND. Said once, as an outline, on both contours -- and the
     lobes VARY along the run, deepening toward the tail the way a flatfish's
     finnage does. The dorsal band starts BEHIND the eye bumps, because a
     flounder's dorsal fin does and because running it forward would bury the
     one feature the whole design is built on.
     The dorsal band is cast: the fin throws its own silhouette down-and-right onto
     the flank it grows off, which is what makes it stand PROUD of the body
     instead of being a pale region continuous with it. Without that step a
     LIGHT fin against a BASE flank on this palette is one value apart and the
     back reads as a hump. */
  cast(p, 12, () => finBand(p, [occiput, dorsal, dorsalFall, peduncleT], [4, 7, 5], 1, LIGHT));
  finBand(p, [[cx - 24, G - 10], pelvic, bellyMid, bellyRear, peduncleB], [3, 5, 4], -1, LIGHT);

  /* --- 5. THE PECTORAL, flared down and forward off the gill and PLANTED. It
     is the animal's only real ground contact and the only thing propping the
     head end up; without it the fish is a lozenge lying in a puddle.
     Wrapped in `cast`, so it separates from the flank by throwing its own
     silhouette down-and-right instead of by a ring of ink. That is the whole
     replacement for `{ front: true }`. */
  cast(p, 16, () => {
    fin(p, [cx - 22, G - 16], [[cx - 32, G - 9], [cx - 28, G + 1], [cx - 13, G - 2]],
      { tone: LIGHT, rays: 3, ray: FORM });
  });

  /* --- 6. THE GILL. One open seam, nape contour to throat contour. Both ends
     land on the outer silhouette, which is the rule; and because it is a
     genuine occlusion the shading pass throws its own short shadow down-right
     of it for free. */
  occlude(p, [[cx - 25, G - 31], [cx - 27, G - 21], [cx - 29, G - 12]], DEEP);

  /* --- 7. The under-jaw, in FORM. One hand-authored dark on a creature whose
     shading is otherwise all generated: the underside of a jaw is the darkest
     part of any head and it is the one place the pass cannot know about.
     FORM and never SHADE -- this is the same surface turning away, and SHADE
     here would rule a black line across the front of the fish. */
  poly(p, [[cx - 38, G - 16], throat, [cx - 27, G - 15], [cx - 36, G - 19]], FORM);
  /* --- THE ARMPIT DEEP PATCH IS GONE, and this is the blotch pass's only
     change to this species.
     It was a thirty-cell `DEEP` parallelogram at the pectoral root, written to
     be the core shadow in the armpit and defended here as "the darkest thing on
     the animal that is not the outline". At 1x it was a dark rectangle sitting
     in the middle of the flank. Every one of its four edges answered to
     nothing: the top and the left ran across open BASE, the right stopped short
     of the gill seam, and the bottom stopped short of the fin it was supposed
     to be the shadow OF. A dark region has to be bounded by the form -- it ends
     at a contour, at a joint, or at the edge of a mass, and its shape is the
     shape the turn makes -- and this one ended nowhere, so it read as dirt.
     There was nowhere honest to extend it to, either: the fin's own root is
     four cells below it and the ventral contour four cells below that, and a
     patch stretched over both would swallow the pectoral. So it is deleted.
     Nothing is lost that was doing work. The armpit is already stated twice --
     the gill `occlude` above it terminates on the ventral contour right at the
     fin root, and the pectoral is wrapped in `cast`, so it throws its own
     silhouette onto the flank behind it. Those two are bounded by the form; the
     patch was not. */

  if (p.back) return;

  /* --- THE FACE. There is ONE `brow()` call in this whole file -- on maelstrix,
     whose `slit` stamp is the only one here that does not carry a brow of its
     own -- and that is a decision rather than an omission. A brow paints a FORM
     shelf directly above the eye row; on a head this size, with two dark stamps
     eight cells apart, the shelf welds the two together and the creature is
     wearing sunglasses, which is the exact defect the player named on the
     shipped roster. `angry`, `slot` and `hooded` all already put a dark line or
     a shelf where the bone is, and a second one on top is the failure. The brow
     work is done instead by the SILHOUETTE: on this species by the two bumps
     the eyes sit in, which is a stronger statement and free.
     `eyeaudit` measures the eye's flood box against the stamp box, and on the
     first pass the near eye's box came out 12 x 11 for a 9 x 7 stamp: its ink
     had run into the outline of the bump it sits on, so the eye was not a
     separate object any more. The pair has moved three cells down and one back
     into the wide part of the head, where there are three cells of face outside
     every stamp edge, and the ocular saddle now falls exactly between them. */
  eyeRow(p, cx - 23, G - 30, 7, 'round', 's', { far: 's-', tilt: -3 });
  // One mark below the eyes, and never two: the mouth, small and terminal and
  // turned down. On a fish this is also the only cavity on the sprite, so it
  // carries the whole INNER budget along with the gill.
  mouthLine(p, cx - 34, G - 20, 4, 1);
}

/* ============================================================ tidewrack */

/**
 * THE BRIEF SHEET
 *
 *  1. WHAT IS IT.  What the flounder becomes: four times the mass, hauled off
 *     the bottom on two braced flippers, with a course of cemented shingle
 *     grown over its back and a blunt stone prow for a head. It rams.
 *  2. PLAN AND WHAT IT DEMANDS.  B (fish) but armour-dominant, so the roof
 *     borrows G's demand and that is the one that matters: precision of shape,
 *     interior completely FLAT. Each shingle plate is a `flat()` facet with
 *     four named vertices and nothing painted inside it. The old version
 *     bevelled every plate, which is thirty-two ruled lines to say what four
 *     steps in the outline say for nothing.
 *  3. RUNG.  LARGE (1.6 m). Target 100-116 cells, 1300-1900 ref px. MEASURED
 *     118 x 72 shipped, 1538 ref px, k = 1.000.
 *  4. ASPECT AND FILL.  118 x 72, aspect 1.64, fill 72 % -- long and low, and
 *     1.37 times shalefin's longest dimension against 1.93 times its area,
 *     which is what a thing that has stood up and thickened looks like.
 *  5. SMOOTH OR STRUCTURED.  STRUCTURED. Named landmarks: prow brow, prow face,
 *     chin, jaw step, brisket, belly tuck, withers, back dip, croup, peduncle,
 *     four plate corners, elbow, ankle, toe gaps.
 *  6. MASSES (6).  Hull; shingle roof; near flipper; far flipper; rear stub;
 *     tail fluke. Six is the ceiling and this is the only species in the group
 *     that needs it, because it is the only one with limbs AND armour.
 *  7. HEAD VERB / BODY VERB.  Head level and forward, stolid. The weight is
 *     forward and down: the near flipper is braced ahead of the brisket and
 *     splayed, and the centre of mass sits well forward of the midpoint between
 *     the contacts. Three separated ground contacts across 66 cells, with the
 *     far flipper 3 cells higher than the near one and the rear stub 1 higher
 *     again.
 *  8. SIGNATURE, IN THE SILHOUETTE.  The stepped shingle ridge -- four plates
 *     whose leading corners step G-66, G-61, G-56, G-54 from the shoulder back,
 *     so the top of the animal is a visible staircase even filled with one flat
 *     colour. Drawn flush and separated by a bevel line, which is what it used
 *     to be, it is painted stripes and gone at 64 px.
 *  9. TWELVE REVERSALS, with coordinates:
 *       prow top     (cx-46, G-48)  contour turns down onto the brow
 *       prow brow    (cx-57, G-43)  the overhang the eyes sit under
 *       prow face    (cx-58, G-30)  the vertical ram face
 *       prow lip     (cx-52, G-20)  and back out along the jaw
 *       chin         (cx-43, G-16)  the lowest point of the head
 *       jaw step     (cx-36, G-23)  belly steps UP 7 behind the jaw: the head
 *                                   ends here, and it costs no ink
 *       brisket      (cx-28, G-17)  and back down 6 into the chest
 *       belly tuck   (cx-6,  G-13)  belly RISES 4 cells brisket to flank
 *       hip under    (cx+16, G-17)
 *       peduncle bot (cx+34, G-21)  the waist from below
 *       peduncle top (cx+34, G-44)  and from above
 *       croup        (cx+18, G-52)  rear high point
 *       back dip     (cx-2,  G-49)  the 3-cell sag between
 *       withers      (cx-20, G-56)  front high point, and it is the higher one
 *       nape         (cx-36, G-50)  dips 6 cells into the skull
 *     Fifteen, and the four plate corners on top of them.
 * 10. THREE HUES.  H1 grey-blue hull (BASE, MEASURED 28.7 %); H2 ochre shingle
 *     and fluke (ACCENT family, MEASURED 25.9 %); H3 `INNER` in the ram
 *     nostril (0.59 %). Pale grey-blue (LIGHT) is the ventral fin band and the
 *     ram boss.
 * 11. FOUR DETAIL EVENTS.  (a) the face -- one slot eye under a stone brow, the
 *     bone boss and its nostril; (b) the shingle roof and its three laps;
 *     (c) the ventral fin band; (d) the shadow work -- three cast shadows (roof
 *     onto hull, near flipper onto chest, fluke onto peduncle) plus the FORM
 *     band where the flesh goes under the rim and one DEEP core shadow in the
 *     rim gutter. The whole flank between them is flat.
 * 12. EYES.  `slot`, `m`, far `xs`, spread 9, `tilt: -3`. A hard bar of ink
 *     under a heavy shelf and NO catchlight: Nosepass and Aron, which is what
 *     an armoured mineral head wants and what shalefin's soft `round` must NOT
 *     become. Related faces, not the same face. Spread 9 and a far eye two
 *     sizes down are both deliberate: at spread 7 with a matched pair this face
 *     was a pair of spectacles, and the fix the reference uses is not a subtler
 *     eye but a bigger nose. One mark below the eyes: the nostril slot on the
 *     bone boss.
 * 13. SURFACE MATERIAL, three places max: the shingle (breaks the top
 *     contour), the ventral fin band (breaks the bottom contour), the carved
 *     toe gaps (break the foot contour). Nothing on the flank.
 * 14. EVERY INTERNAL DARK LINE.  The three plate laps, each a short gutter
 *     under one plate's lower edge and therefore terminating on the plate in
 *     front of it rather than floating; and the ink the edge pass lays where
 *     the ochre roof meets the hull, which runs contour to contour. No closed
 *     loops anywhere -- no `{ front: true }`, no `blobFront`.
 * 15. SECOND STAGE.  Carried: the lobed fin band on the ventral contour, and
 *     the ochre-above / grey-below split with a hard boundary. Changed: off the
 *     floor onto flippers; the mottle line promoted from camouflage to the rim
 *     of a shell; a prow instead of a snub head; 1.35x the length and 3.5x the
 *     area; and the entire dorsal half of the inherited fin gone under armour.
 */
function tidewrack(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const prowTop: Pt = [cx - 46, G - 48];
  const prowBrow: Pt = [cx - 57, G - 43];
  const prowFace: Pt = [cx - 58, G - 30];
  const prowLip: Pt = [cx - 52, G - 20];
  const chin: Pt = [cx - 43, G - 16];
  const jawStep: Pt = [cx - 36, G - 23];
  const brisket: Pt = [cx - 28, G - 17];
  const tuck: Pt = [cx - 6, G - 13];
  const hipUnder: Pt = [cx + 16, G - 17];
  const peduncleB: Pt = [cx + 34, G - 21];
  const tailRootB: Pt = [cx + 41, G - 25];
  const tailRootT: Pt = [cx + 43, G - 39];
  const peduncleT: Pt = [cx + 34, G - 44];
  const croup: Pt = [cx + 18, G - 52];
  const backDip: Pt = [cx - 2, G - 49];
  const withers: Pt = [cx - 20, G - 56];
  const nape: Pt = [cx - 36, G - 50];

  /* --- 1. THE FAR FLIPPER, down first, in SHADE. SHADE is the one tone that
     means "a different part, set behind another", and it buys the recessed
     value and the ruled division against the hull in one move -- which is the
     only reason to use it. Its foot lands SIX CELLS HIGHER than the near one
     and eighteen cells further back; those two numbers are most of what turns a
     pair of limbs into an animal standing on a ground plane. */
  limbPath(p, [[cx + 8, G - 26], [cx + 15, G - 15], [cx + 13, G - 8]], 17, 12, SHADE);
  poly(p, [[cx + 2, G - 9], [cx + 22, G - 10], [cx + 24, G - 4], [cx + 4, G - 4]], SHADE);

  /* --- 2. THE REAR STUB, further back still and higher again: a third,
     separated ground contact so the animal does not stand on one bar. */
  limbPath(p, [[cx + 28, G - 24], [cx + 33, G - 12], [cx + 31, G - 5]], 13, 9, SHADE);

  /* --- 3. THE TAIL FLUKE, ochre, off the peduncle. Heavy and low: this animal
     is 96 kg and a ribbon tail would say otherwise. It stops clear of the floor
     so the flippers stay the lowest things on the sprite. */
  cast(p, 20, () => {
    fin(p, [cx + 41, G - 32], [[cx + 50, G - 44], [cx + 54, G - 30], [cx + 48, G - 18]],
      { tone: ACCENT, rays: 3, ray: ACCENT_DARK });
  });

  /* --- 4. THE HULL. One polygon, fifteen named vertices, and it is painted in
     ACCENT and then repainted in BASE below the rim for exactly the reason
     shalefin is: the boundary between the two has to run from one edge of the
     animal to the other or it is a sticker. Here the boundary is not
     camouflage, it is the RIM OF THE SHELL -- the flesh disappearing under the
     shingle -- which is the same line doing a different job, and that is what
     an evolution is supposed to do with an inherited feature. */
  poly(p, [prowTop, prowBrow, prowFace, prowLip, chin, jawStep, brisket, tuck,
    hipUnder, peduncleB, tailRootB, tailRootT, peduncleT, croup, backDip, withers,
    nape], BASE);
  flat(p, () => {
    poly(p, [prowTop, [cx - 50, G - 46], [cx - 44, G - 44], [cx - 22, G - 46], [cx - 2, G - 43],
      [cx + 18, G - 42], [cx + 36, G - 36], [cx + 43, G - 35],
      tailRootT, peduncleT, croup, backDip, withers, nape], ACCENT);
  });

  /* --- and the flesh turning under at the shell rim, in FORM: one band along
     the underside of the ochre boundary, so the body genuinely DISAPPEARS under
     the shingle rather than being a grey shape with a tan shape laid on it.
     The manual names this repair for mossback and tidewrack by name. It is
     FORM, so nothing is inked round it. */
  poly(p, [[cx - 44, G - 42], [cx - 22, G - 44], [cx - 2, G - 41], [cx + 18, G - 40],
    [cx + 36, G - 34], [cx + 38, G - 30], [cx + 18, G - 36], [cx - 2, G - 37],
    [cx - 22, G - 40], [cx - 44, G - 38]], FORM);

  /* --- 5. THE VENTRAL FIN BAND, inherited whole from shalefin: same helper,
     same lobed construction, deepening toward the tail. Shallower here, because
     on a heavier animal the fin is proportionally less of the body. */
  finBand(p, [[cx - 36, G - 18], brisket, tuck, hipUnder, peduncleB], [6, 9, 6], -1, LIGHT);

  /* --- 6. THE SHINGLE ROOF. Four plates, back to front, each a `flat()` facet
     -- one tone across its whole area, no gradient, because that is how a
     mineral reads as hard. Their leading corners step: G-54, G-59, G-63, G-64
     from the tail forward, so the ridge is a staircase that survives a black
     fill and survives the icon.
     The plates TAPER along the run rather than being four of a size. A row of
     identical evenly-spaced elements is a comb; the reference makes them
     tallest at the shoulder and smaller both ways.
     `lip: -1` -- no pale lip. Only the gutter, which is the lap shadow where
     each plate slides under the next, and that is the entire interior of the
     armour. */
  cast(p, 44, () => {
    plate(p, [[cx + 22, G - 46], [cx + 26, G - 56], [cx + 39, G - 47], [cx + 37, G - 38]], ACCENT, -1, ACCENT_DARK);
    plate(p, [[cx + 2, G - 48], [cx + 6, G - 61], [cx + 21, G - 57], [cx + 23, G - 46]], ACCENT, -1, ACCENT_DARK);
    plate(p, [[cx - 21, G - 48], [cx - 17, G - 65], [cx - 1, G - 62], [cx + 3, G - 48]], ACCENT, -1, ACCENT_DARK);
    plate(p, [[cx - 38, G - 46], [cx - 34, G - 66], [cx - 18, G - 64], [cx - 14, G - 48]], ACCENT, -1, ACCENT_DARK);
  });

  /* --- 7. THE RAM BOSS. A blunt pale pad filling the whole lower half of the
     prow face, with one nostril in it.
     This is the repair for the worst thing on the first pass. `slot` is the
     right stamp for an armoured mineral head -- a hard bar of ink under a
     heavy shelf, Nosepass and Aron -- but two of them seven cells apart on a
     bare grey wedge, with a `brow()` shelf welding them together, is a pair of
     sunglasses, which is precisely the defect the player named. The reference's
     answer to `slot` is not a subtler eye, it is AN ENORMOUS NOSE UNDER IT:
     Nosepass is two absolutely precise black slots and a huge red nose, and the
     nose is what stops the slots being spectacles. So: the eyes move nine cells
     apart, the `brow()` call is deleted, and the whole lower prow becomes one
     pale mass with a cavity in it, and the mass RISES BETWEEN THE EYES -- which
     is the second half of the Nosepass construction and the half that actually
     does the work. Two dark marks separated by background read as one pair of
     lenses; two dark marks separated by a pale wedge of bone read as two eyes
     on either side of a nose. */
  /* --- the head's own shadow onto the shoulder behind it, in FORM. On this
     animal the skull IS the front of the hull -- there is no neck to put a line
     across -- so the only honest way to say "the head is in front" is a value
     step, and FORM is the tone that can say it without a ring. */
  poly(p, [[cx - 34, G - 43], [cx - 27, G - 40], [cx - 25, G - 22], [cx - 33, G - 24]], FORM);

  const bone = p.back ? BASE : LIGHT;
  cast(p, 22, () => {
    poly(p, [[cx - 58, G - 32], [cx - 45, G - 33], [cx - 37, G - 25], [cx - 43, G - 16],
      [cx - 54, G - 18]], bone);
    // and the bridge, a narrow ridge of the same bone rising BETWEEN the two
    // eyes and nowhere else. Its top is level with the brow and its width is
    // exactly the gap between the stamps, so it never touches either of them.
    poly(p, [[cx - 47, G - 44], [cx - 42, G - 43], [cx - 41, G - 32], [cx - 46, G - 32]], bone);
  });

  /* --- 8. THE NEAR FLIPPER, braced FORWARD under the chest and splayed out.
     Three points, not two: the elbow steps the outline backward and the wrist
     forward again, and that reversal is free and survives the icon.
     The paddle is 22 cells wide against a 14-cell ankle -- 57 % wider, which is
     the step that IS a foot. Ours were 10-20 %, which is why our feet did not
     exist. The toes are CARVED, not drawn: three notches out of the sole. */
  cast(p, 22, () => {
    limbPath(p, [[cx - 26, G - 24], [cx - 34, G - 13], [cx - 31, G - 6]], 22, 14, BASE);
    poly(p, [[cx - 42, G - 7], [cx - 20, G - 9], [cx - 18, G - 1], [cx - 44, G - 1]], BASE);
  });
  toeNotches(p, cx - 42, cx - 20, G - 1, 3, 4);

  if (p.back) return;

  /* --- THE FACE, set well back under the lip of the front shingle plate so the
     eyes sit in its cast shadow. Two cells of stone brow over an eye are worth
     more than any amount of drawing on a skull. Spread 9, so eighteen cells
     centre to centre against an eleven-cell stamp: the two slots can never
     weld. */
  eyeRow(p, cx - 45, G - 38, 9, 'slot', 'm', { far: 'xs', tilt: -3 });
  // One mark below the eyes, and never two: the nostril on the ram boss.
  // Drawn as a real cavity rather than with `nostril()`, which is three cells:
  // three cells is 0.03 % of this sprite and the acceptance floor for `INNER`
  // on a species that has an opening is 0.5 %. A blunt rammer's nostril is a
  // slot, so it is drawn as one.
  poly(p, [[cx - 55, G - 27], [cx - 47, G - 26], [cx - 46, G - 23], [cx - 54, G - 24]], INNER);
  poly(p, [[cx - 55, G - 23], [cx - 46, G - 22], [cx - 46, G - 21], [cx - 55, G - 22]], LIGHT);
  /* --- the one core shadow: the gutter under the front shingle plate, where
     the flesh disappears under the armour. DEEP as a patch, so it is a core
     shadow and not a seam, and no line is drawn round it. */
  poly(p, [[cx - 36, G - 45], [cx - 16, G - 47], [cx + 2, G - 44], [cx + 2, G - 41],
    [cx - 16, G - 43], [cx - 36, G - 41]], DEEP);
}

/* ============================================================= brookmaw */

/**
 * THE BRIEF SHEET
 *
 *  1. WHAT IS IT.  A river brute built like a bowfin: two thirds of it is skull
 *     and shoulder, it braces on two webbed forelimbs against the current all
 *     day, and it carries a tall pale fluke it uses the moment it stops holding
 *     station.
 *  2. PLAN AND WHAT IT DEMANDS.  B/E. Not a quadruped -- there is no hind pair,
 *     the fluke does that job -- and not a biped, because it is horizontal. B
 *     demands the animal is not stood up: the spine runs forward and DOWN into
 *     the head and the weight is carried on the front.
 *  3. RUNG.  LARGE (1.1 m). Target 100-116 cells, 1300-1900 ref px. MEASURED
 *     115 x 85 shipped, 1415 ref px, k = 1.000.
 *  4. ASPECT AND FILL.  115 x 85, aspect 1.35, fill 57 % -- the lowest fill in
 *     the group, and it should be: the three crest spines and the standing
 *     fluke are what a low fill buys, and spindliness at the top is this
 *     animal's character.
 *  5. SMOOTH OR STRUCTURED.  STRUCTURED. This was the species the manual named
 *     for a kindergarten face -- "eyes marooned in an enormous empty pale
 *     field" -- and the repair is landmarks: nasal rise, brow ridge, occiput
 *     dip, withers, back dip, croup, brisket, belly tuck, elbow, jaw angle.
 *  6. MASSES (5).  Skull with its projecting jaw; body with the shoulder hump;
 *     near forelimb; far forelimb; the fluke. The crest is three small masses
 *     on the body's outline, not a sixth mass.
 *  7. HEAD VERB / BODY VERB.  LOWERED -- the crown of the skull is carried
 *     FIFTEEN CELLS below the withers, which is the whole "holds station
 *     against a current" read and costs one y coordinate. The body is braced:
 *     near forelimb advanced and planted wide, far forelimb set back and its
 *     foot six cells higher, the back arched over the shoulder and falling away
 *     behind it.
 *  8. SIGNATURE, IN THE SILHOUETTE.  The wedge skull with the lower jaw
 *     projecting four cells past the snout and five cells below it. That is
 *     what maelstrix inherits and it has to survive a black fill, so it is an
 *     outline event and not a marking. The three-spine crest is the second, and
 *     the standing fluke the third.
 *  9. TWELVE REVERSALS, with coordinates:
 *       snout tip    (cx-60, G-27)  most forward point of the skull
 *       nasal rise   (cx-56, G-36)  contour turns up onto the face
 *       brow ridge   (cx-47, G-45)  bone bulges over the eye
 *       skull top    (cx-33, G-48)  crown, and it is 15 below the withers
 *       occiput      (cx-23, G-41)  contour DIPS 7 between skull and shoulder
 *       nape         (cx-19, G-29)  and turns down into the throat
 *       withers      (cx-10, G-63)  front high point -- built to hold station
 *       back dip     (cx+8,  G-56)  7-cell sag
 *       croup        (cx+20, G-54)  and the fall away behind it
 *       belly tuck   (cx+2,  G-9)   belly RISES 18 cells brisket to flank
 *       brisket      (cx-20, G-27)  deepest and most forward point of the chest
 *       jaw angle    (cx-44, G-21)  contour steps forward onto the jaw
 *       underbite    (cx-65, G-26)  the jaw's tip, four cells past the snout
 *       elbow        (cx-32, G-17)  rear edge of the near limb steps back
 *     Fourteen.
 * 10. THREE HUES -- AND THIS SPECIES ONLY GETS TWO, for a reason that is in the
 *     palette and not in the drawing. H1 river blue (BASE, MEASURED 34.5 %).
 *     H2 is the declared accent `#dce8f0`, which is a near-white: its chroma is
 *     20/255, so the acceptance test for "a distinct hue" -- chroma >= 45 and
 *     >= 25 degrees off the body hue -- correctly refuses to count it, and this
 *     species measures ONE hue. It is not a shape problem: the accent paints
 *     20.9 % of the sprite, right in the 15-30 band, on the two masses the
 *     manual assigns it (the underjaw and the fluke) plus the crest. The manual
 *     asks for "cream underjaw and fluke H40"; what `species.json` declares is
 *     a blue-white at H205. Fixing that is one hex value in a file I do not
 *     own, and it is the single highest-value edit anyone could make to this
 *     creature. H3 `INNER` -- the mouth, the nostril and the three gills --
 *     measures 1.82 %, which is the "free third hue" of §6.5 working.
 * 11. FOUR DETAIL EVENTS.  (a) the face -- eyes, the angry brow, the nostril,
 *     the mouth line; (b) the pale jaw and belly, one material, no line round
 *     either; (c) the three gill slits, VARYING in length and leaning back;
 *     (d) the shadow work -- three cast shadows (skull onto chest, near limb
 *     onto chest, crest onto the back) plus one FORM under-jaw and one DEEP
 *     armpit.
 * 12. EYES.  `angry`, `m`, far `m-`, `brow: FORM`, spread 7, set high and
 *     FORWARD -- six cells below the brow and eight above the jaw line, which
 *     is 0.32 of the skull's depth from the crown: the "mean and alert" band.
 *     There is deliberately no `brow()` call: `angry` carries its own brow line
 *     and a FORM shelf on top of it welds the two stamps into sunglasses.
 *     `brow: FORM` and not the default `ACCENT_DARK`, because on this palette
 *     ACCENT_DARK is LIGHTER than the skull and the brows came out as two pale
 *     scratches.
 * 13. SURFACE MATERIAL, three places max: the three crest spines (break the
 *     back), the fluke (breaks the rear), the carved toes (break the foot).
 *     None on the flank. The old lobed `finBand` on the back is gone: round
 *     lobes in a near-white accent read as a row of marshmallows on the spine,
 *     and drawing the ridge in the same material as the flatfishes' fin band
 *     made two families that should not look alike look alike.
 * 14. EVERY INTERNAL DARK LINE.  ONE, and it is not hand-drawn: the boundary of
 *     the pale jaw, which the internal-edge pass inks for free because the jaw
 *     is an ACCENT mass of about three hundred cells. Its two ends are the two
 *     ends of the jaw and both are on the outer silhouette. There WAS a hand
 *     `occlude` mouth on top of it and it is gone: `occlude` warned that its
 *     rear endpoint was stranded inside the cheek, and the rule is extend it to
 *     the contour or delete it. On this head there is nowhere to extend it to,
 *     and it was three cells of ink to say what the edge pass already said.
 *     The three gill slits are `INNER` -- cavities, not divisions -- so nothing
 *     is inked round them either. There are no closed loops anywhere on this
 *     species and no `*Front` call.
 * 15. First stage. See the family note at the head of the file.
 */
function brookmaw(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const snoutTip: Pt = [cx - 60, G - 27];
  const nasalRise: Pt = [cx - 56, G - 36];
  const browRidge: Pt = [cx - 47, G - 45];
  const skullTop: Pt = [cx - 33, G - 48];
  const occiput: Pt = [cx - 23, G - 41];
  const nape: Pt = [cx - 19, G - 29];
  const throat: Pt = [cx - 34, G - 23];
  const jawAngle: Pt = [cx - 44, G - 21];
  const lipFront: Pt = [cx - 56, G - 20];

  const withers: Pt = [cx - 10, G - 63];
  const backDip: Pt = [cx + 8, G - 56];
  const croup: Pt = [cx + 20, G - 54];
  const tailTop: Pt = [cx + 31, G - 45];
  const tailUnder: Pt = [cx + 35, G - 19];
  const hipUnder: Pt = [cx + 22, G - 11];
  const tuck: Pt = [cx + 2, G - 9];
  const brisket: Pt = [cx - 20, G - 27];

  /* --- 1. THE FLUKE, first, so the croup laps its root. A tall standing fan in
     the near-white accent -- the one place a value that extreme belongs,
     because it is a single large mass with a hard boundary rather than a
     scatter of bright marks.
     It stops fourteen cells clear of the floor. The forelimbs have to be the
     lowest things on the sprite or `fitToCell` bottom-aligns the tail and the
     animal ends up hanging by its face. */
  fin(p, [cx + 29, G - 44], [[cx + 33, G - 66], [cx + 39, G - 79], [cx + 45, G - 56], [cx + 43, G - 30]],
    { tone: ACCENT, rays: 4, ray: ACCENT_DARK });

  /* --- 2. THE FAR FORELIMB. SHADE, set back under the chest, its foot NINE
     cells clear of the floor and twenty-four cells behind the near one. Those
     two numbers are the whole of the three-quarter view: far feet land higher
     and further back, and a pair of limbs that do neither is furniture. */
  limbPath(p, [[cx + 1, G - 28], [cx + 8, G - 19], [cx + 5, G - 12]], 15, 9, SHADE);
  poly(p, [[cx - 2, G - 14], [cx + 6, G - 16], [cx + 15, G - 13], [cx + 17, G - 9],
    [cx + 12, G - 6], [cx + 1, G - 7], [cx - 3, G - 10]], SHADE);

  /* --- 3. THE BODY. One polygon carrying the whole back line: withers high at
     the front (built to hold station, head carried low), a five-cell sag, a
     croup, and a belly that RISES nine cells from the brisket to the flank.
     Those three facts are the difference between an animal and a sausage and
     they cost six coordinates. */
  poly(p, [nape, withers, backDip, croup, tailTop, tailUnder, hipUnder, tuck,
    brisket, throat], BASE);

  /* --- the pale belly, one continuous LIGHT run with its top edge following
     the tuck. No bands across it and no line round it: LIGHT against BASE is
     already a value break and the eye reads it without help. */
  poly(p, [brisket, [cx - 4, G - 17], hipUnder, [cx + 14, G - 21], tuck, [cx - 14, G - 28]], LIGHT);

  /* --- 4. THE DORSAL CREST: three pointed spines standing off the back,
     tallest at the shoulder and tapering to the tail. THREE, varying, and
     pointed -- which is the whole repair here. It was a lobed `finBand` like
     shalefin's, and round lobes in a near-white accent read as a row of
     marshmallows sitting on the spine; and it was drawn in the same material as
     the flatfish's fin, which made the two families look alike where they
     should not.
     Pointed is also what separates this animal from its own first stage in the
     line-up, and the crest is the thing maelstrix inherits and MOVES: on the
     evolution the same three points, largest in the middle, are on the SKULL.

     IT IS ONE MEMBRANE, ITS BASE IS THE BACK CONTOUR ITSELF, AND IT RUNS ALL
     THE WAY BACK INTO THE FLUKE. Those three facts are this pass's repair on
     this species and they are one repair.
     It was three SEPARATE triangles. At 1x that failed twice over. An accent
     component this size clears `ACCENT_MASS_AREA`, so `internalEdges` rules
     hard ink all the way round it -- which is CORRECT for a fin, the reference
     inks a dorsal at its root too -- but with three components there were three
     rings, with sky between them and their bases at three different heights
     relative to the back, some buried and some floating. Three near-white
     shapes each with a black line round it, standing on a back, is three
     stickers; add the fluke and the jaw plate in the same near-white and the
     top of the creature is a cluster of pale wedges with no owner. That is the
     one thing the review named on this group.
     So: four of the base vertices are now the BODY'S OWN back vertices --
     withers, back dip, croup, tail root, copied exactly -- which means the
     membrane cannot float and cannot bury itself, its root line lies on the
     back line, and the ink the edge pass lays there is the fin's root rather
     than a ring round a wedge. The three points keep their heights and their
     taper to the tail, but a low web joins them, so the SILHOUETTE carries one
     crest and not three spikes.
     And because the base reaches the tail root, the crest and the fluke are one
     accent component: the dorsal runs into the caudal the way it does on a
     bowfin, and the near-white stops being a scatter and becomes the single
     continuous fin that this animal's whole brief is about. */
  /* No `cast` on this one, and that is deliberate rather than an omission. The
     crest's root line lies ON the back contour, so the only body it has to
     throw onto is the fluke standing directly behind it -- and a four-cell step
     down-and-right off a crest this tall lands a hard grey wedge across the
     middle of the fluke's membrane, ending nowhere, which is a stain by every
     test in this pass. The two cast shadows this animal needs are the skull's
     onto the chest and the near forelimb's onto the far one, and both are
     drawn. */
  flat(p, () => {
    poly(p, [
      /* the base IS the back: withers, back dip, croup, tail root */
      withers, backDip, croup, tailTop,
      /* and forward along the free edge: point, web, point, web, point */
      [cx + 29, G - 63], [cx + 21, G - 60], [cx + 12, G - 70],
      [cx + 4, G - 62], [cx - 4, G - 76]], ACCENT);
  });
  /* One strut up each point, `ACCENT_DARK`, exactly as the fluke's rays are
     drawn -- a flat facet is by definition ungraded, and 300 cells of one
     near-white tone is a paper cut-out. Same material, same struts, so the eye
     reads dorsal and caudal as the same tissue. */
  stroke(p, cx - 7, G - 62, cx - 4, G - 73, ACCENT_DARK);
  stroke(p, cx + 8, G - 57, cx + 11, G - 67, ACCENT_DARK);
  stroke(p, cx + 23, G - 53, cx + 28, G - 60, ACCENT_DARK);

  /* --- 5. THE SKULL, and it is carried THIRTEEN CELLS BELOW the withers, which
     is the whole "holds station against a current" read and costs one y
     coordinate. Forty cells long and twenty-four deep on a hundred-and-ten-cell
     animal: the brief says front-heavy, and front-heavy means the head IS the
     front.
     A wedge with named corners -- a nasal rise, a brow that overhangs, a cheek
     that is the widest part, an occiput that dips -- and not an ellipse,
     because an ellipse has none of them. It is drawn big enough to hold two
     eleven-cell eyes with face around them, which is what the first pass got
     wrong: a thirty-cell skull with two `m` stamps in it has no room left for a
     forehead, a cheek or a jaw, and the result is a brick in sunglasses.
     Wrapped in `cast`: the skull throws its silhouette down and right onto the
     chest and the far limb, which separates them without one cell of ink. The
     old version used `polyFront` and pressed a closed DEEP ring round the whole
     head. */
  cast(p, 30, () => {
    poly(p, [snoutTip, nasalRise, browRidge, skullTop, occiput, nape, throat,
      jawAngle, lipFront], BASE);
  });

  /* --- 6. THE LOWER JAW, pale, projecting four cells past the snout so the
     underbite lands in the SILHOUETTE. This is the family signature and it has
     to survive a black fill.
     It is a BAND along the bottom of the skull, nine cells deep -- not a second
     head-sized shape. The first version made it as big as the skull and the
     face came out as one pale slab with two eyes floating on it. */
  poly(p, [[cx - 65, G - 26], [cx - 58, G - 14], [cx - 42, G - 15], [cx - 32, G - 23],
    [cx - 46, G - 27], [cx - 59, G - 29]], p.back ? BASE : ACCENT);
  /* --- and the throat under it, in FORM. The underside of a jaw is the darkest
     part of any head; it is the one hand-authored dark on this species and it is
     what stops the near-white jaw plate floating off the front of the face. */
  poly(p, [[cx - 44, G - 22], [cx - 32, G - 24], [cx - 26, G - 27], [cx - 30, G - 21],
    [cx - 40, G - 19]], FORM);
  /* --- the one core shadow, in DEEP: the armpit, where the near forelimb
     leaves the chest. A DEEP patch is a core shadow and is not inked; only a
     DEEP stroke becomes a seam. See the palette note in the report -- on these
     six `DEEP` is the only body tone that can get under the outline at all. */
  poly(p, [[cx - 22, G - 32], [cx - 12, G - 28], [cx - 14, G - 21], [cx - 24, G - 24]], DEEP);

  /* --- 7. THE NEAR FORELIMB, planted forward under the chest and splayed.
     Three points: shoulder, elbow, wrist, and the elbow steps the rear contour
     back three cells. The paddle is 24 wide against a 15-cell ankle -- 60 %
     wider -- and its toes are carved out of the sole rather than ruled onto it.
     Its cast shadow lands on the chest and on the far limb behind it, which is
     the commonest overlap on any quadruped and the one that most needs it. */
  cast(p, 24, () => {
    limbPath(p, [[cx - 24, G - 32], [cx - 34, G - 18], [cx - 30, G - 7]], 24, 16, BASE);
    poly(p, [[cx - 42, G - 8], [cx - 18, G - 9], [cx - 16, G - 1], [cx - 44, G - 1]], BASE);
  });
  toeNotches(p, cx - 42, cx - 18, G - 1, 3, 4);

  /* --- 8. Three gill slits behind the jaw hinge, in `INNER` -- a cavity, not a
     division, so nothing is inked round them. They VARY: 8, 6 and 4 cells and
     they lean back. A row of identical marks is a comb, and three of equal
     length ruled vertically on a flank is what the first pass drew: they read
     as scratches rather than as gills. */
  for (let i = 0; i < 3; i++) {
    const gx = cx - 27 + i * 5;
    for (let k = 0; k < 2; k++) {
      stroke(p, gx + k, G - 37 + i * 2, gx + k - 2, G - 30 + i * 3, INNER);
    }
  }

  if (p.back) return;

  /* --- THE FACE. The eyes sit high on the skull and FORWARD -- six cells below
     the brow and eight above the jaw line -- because the manual's named defect
     on this species was "eyes marooned in an enormous empty pale field". They
     are `angry`, which carries its own brow line, and there is deliberately no
     `brow()` call on top of it: a FORM shelf over two dark stamps is the
     sunglasses failure, and `angry` already puts a slanted line where the bone
     is. */
  // `brow: FORM` and not the default. `ACCENT_DARK` on this palette is the
  // near-white accent mixed 45 % into the ink, which is a MID SLATE -- lighter
  // than the blue skull it is drawn on -- so the two brow lines came out as
  // pale scratches above the eyes instead of as bone. FORM is the species' own
  // authored dark and it never inks.
  eyeRow(p, cx - 39, G - 36, 7, 'angry', 'm', { far: 'm-', brow: FORM });
  // One mark below the eyes, and never two: the nostril. Three cells, and the
  // highest value-per-cell mark anywhere on a sprite.
  nostril(p, cx - 56, G - 29, -1);
  // The mouth: one open line, jaw tip to jaw angle, both ends on the outer
  // silhouette. It is the boundary between the blue skull and the pale jaw, so
  // most of its work is already done by the value step; this is the four cells
  // of ink that make it a mouth rather than a colour change.
  // (No hand-drawn mouth line. One was here, and `occlude` warned that its rear
  //  endpoint was stranded inside the cheek -- the rule is extend it to the outer
  //  contour or delete it, and on this head there is nowhere to extend it to. It
  //  is not needed: the pale jaw is an ACCENT mass of about 300 cells, so the
  //  internal-edge pass already inks its whole boundary, and that boundary IS
  //  the mouth. The line was three cells of ink to say what was already said.)
}

/* ============================================================ maelstrix */

/**
 * THE BRIEF SHEET
 *
 *  1. WHAT IS IT.  A reared river serpent two metres long: one thick tube
 *     coiled on the floor, with the neck rising out of the middle of the coil
 *     and crossing in FRONT of it, wearing a crown.
 *  2. PLAN AND WHAT IT DEMANDS.  C, serpent. C demands the design is ONE long
 *     path and that all the character is in the two terminals, and it names the
 *     trap: drawing the coil as a stack of overlapping discs. The body here is
 *     two `limbPath` calls down two control paths, and the second crosses the
 *     first -- which is the point, because a coil that never crosses itself has
 *     nothing to cast a shadow onto and depth on a serpent is entirely cast
 *     shadow.
 *  3. RUNG.  HUGE (2.1 m). Target 112-128 cells, 1800-2600 ref px. MEASURED
 *     117 x 108 shipped, 2185 ref px, k = 1.000. The largest thing in the group
 *     in both dimensions and the only one on HUGE: 2.75 times shalefin's area
 *     and 1.55 times brookmaw's.
 *  4. ASPECT AND FILL.  117 x 108, aspect 1.08, fill 70 %. A thick tube is a
 *     high-fill design and that is why the tube is 32 cells at the shoulder: a
 *     thin serpent halves into dashes at icon scale.
 *  5. SMOOTH OR STRUCTURED.  SMOOTH, deliberately and on the reference's terms:
 *     a serpent's back is one of the flattest things in the whole generation.
 *     So the tube carries NOTHING -- no rings, no segments, no scales, no lit
 *     ridge -- and the entire budget goes on the terminals and on the crossing.
 *     Smooth is not easier; it removes the ability to hide behind detail, so
 *     the path itself has to be right.
 *  6. MASSES (5).  The floor coil; the rising neck; the skull; the lower jaw;
 *     the crown. Plus two fins.
 *  7. HEAD VERB / BODY VERB.  LIFTED and turned. Imperious -- it is looking
 *     down its own length at you. The weight is all in the coil, and the coil
 *     is asymmetric: it is heaviest on the left, where the animal has braced to
 *     lift the front.
 *  8. SIGNATURE, IN THE SILHOUETTE.  The inherited wedge jaw with the
 *     projecting underbite, on top of an S that no other Kin has. The crown is
 *     the second, and it sweeps BACK rather than up -- a swept crest reads as
 *     something moving forward, an upright one reads as a hat, and up would
 *     have run the sprite past the fit clamp and had every hand-placed cell on
 *     it resampled.
 *  9. A serpent has no skeleton to show, so PART 2.2's twelve reversals do not
 *     apply and the equivalent list is where the PATH reverses:
 *       tail tip     (cx+44, G-16)  thin terminal, low and right
 *       floor sweep  (cx+22, G- 9)  the lowest point; the coil sits on it
 *       left turn    (cx-36, G-26)  the path reverses from left to up
 *       coil rise    (cx-34, G-48)  and from up to right along the top
 *       coil crown   (cx- 8, G-58)  reverses from up to right
 *       right curl   (cx+34, G-40)  and from right to down -- the free end
 *       neck root    (cx+ 6, G-50)  the crossing, and the whole depth cue
 *       neck bow     (cx+18, G-62)  reverses from right to left
 *       occiput      (cx-14, G-75)
 *     Nine, and the outline reverses at each of them.
 * 10. THREE HUES.  H1 river blue (BASE, and it is brookmaw's blue to within
 *     three hex digits); H2 LILAC (ACCENT) on the crown, the neck fin and the
 *     tail fan -- the manual calls this the best two-hue creature on the roster
 *     and asks for 20 %, so the fin is drawn large. MEASURED 15.6 %, which is
 *     inside the band but at the bottom of it, and the honest reason is that
 *     the third slot on this palette resolves back to the lilac, so there is no
 *     fourth place to put any. H3 `INNER` in the mouth wedge, 1.65 %.
 *     Pale cyan (LIGHT) is the jaw and the throat, identical to brookmaw's.
 * 11. FOUR DETAIL EVENTS.  (a) the face; (b) the crown; (c) the neck fin;
 *     (d) the shadow work -- four cast shadows (neck onto coil, head onto neck,
 *     crown onto skull, neck fin onto neck), one DEEP core shadow in the
 *     crossing gutter, and the one 11-cell `spec` a wet species is allowed.
 * 12. EYES.  `slit`, `m`, far `m-`, spread 8. A slit shows no white at all,
 *     which is what makes it read as an intelligence rather than as a pet, and
 *     this species' whole character is that it reads you and answers. One mark
 *     below the eyes: the mouth line.
 * 13. SURFACE MATERIAL, three places: the crown, the neck fin, the tail fan --
 *     all three break the outline, and there is nothing anywhere else.
 * 14. EVERY INTERNAL DARK LINE.  NONE, in the end. The mouth was an `occlude`
 *     stroke and it is now a tapering `INNER` wedge that OPENS at the jaw tip;
 *     see the note at the call. The coil crossing, which used to be an ink
 *     line, is now a cast shadow and carries no line at all. That is the named
 *     repair for this species.
 * 15. SECOND STAGE.  Carried: the wedge jaw with the projecting underbite, and
 *     the blue / pale-cyan body. Changed: limbless; reared rather than
 *     horizontal; drawn at 108 cells tall against brookmaw's 85, and at 2186 ref
 *     px against 1415; the accent
 *     from a near-white at chroma 20 to a lilac at chroma 56, which is the
 *     Psyche type arriving and is the only thing in this file that moves the
 *     measured hue count from one to two. Not the first stage
 *     scaled up -- a different animal wearing the same face.
 */
function maelstrix(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  /* --- THE COIL. One path: tail low and right, a sweep left along the floor,
     up the left side, back right across the top of the coil, and a free end
     curling DOWN on the right. That free end is what makes the crossing read --
     you see the coil pass behind the neck and come out the other side. */
  const coil: Pt[] = [
    [cx + 44, G - 16], [cx + 22, G - 9], [cx - 10, G - 12], [cx - 36, G - 26],
    [cx - 34, G - 48], [cx - 8, G - 58], [cx + 22, G - 54], [cx + 34, G - 40],
  ];

  /* --- the tail fan, at the low end, lilac. */
  fin(p, [cx + 38, G - 16], [[cx + 50, G - 37], [cx + 58, G - 18], [cx + 54, G - 1]],
    { tone: ACCENT, rays: 3, ray: ACCENT_DARK });

  /* --- the coil itself. One call, thin at the tail and thick at the free end,
     and NOTHING painted on it. The old version ran a one-cell HILIGHT down the
     whole length; the light pass now bands parallel to each mass's own axis and
     insets the bright band from the contour, so a hand-drawn ridge is a second
     opinion fighting a correct one. */
  limbPath(p, path(coil), 16, 32, BASE);

  /* --- THE NECK, rising out of the middle of the coil and crossing in FRONT of
     it, wrapped in `cast`. This is the whole design.
     Every coil crossing on the shipped version had an ink line and no shadow,
     which on a serpent is the entire depth cue thrown away. A six-cell hard
     shadow thrown down-and-right off the near coil onto the far one says it
     harder, costs no palette entry, and points the same way as every other
     shadow on the sprite -- which is the only thing that establishes one light
     over a whole animal. */
  cast(p, 32, () => {
    limbPath(p, path([[cx + 6, G - 50], [cx + 18, G - 62], [cx + 6, G - 72], [cx - 14, G - 75]]),
      32, 22, BASE);
  });

  /* --- the throat, pale cyan, down the FRONT of the rising column, and it
     stops well short of the head. The first version ran it up to the jaw and
     between it, the pale jaw band and the rim light the whole top third of the
     sprite arrived as one pale area with a face somewhere in it. A pale head
     needs a dark neighbour as much as a pale creature does. */
  poly(p, [[cx - 10, G - 48], [cx + 2, G - 44], [cx + 14, G - 52], [cx + 10, G - 62],
    [cx - 2, G - 58], [cx - 12, G - 54]], LIGHT);

  /* --- THE SKULL, lifted clear at the top and turned to the viewer's left. A
     WEDGE, not an ellipse: the first version used `blobFront` and the head came
     out as a rounded lozenge with a pale band under it, which is a duck. A
     skull has a brow that overhangs, a cheek that is the widest part and a
     snout that narrows to a point, and all three are corners you have to name.
     Wider and deeper through the cheek than brookmaw's for its length, because
     a bigger animal's skull is not the same skull enlarged. */
  const hx = cx - 26, hy = G - 76;
  cast(p, 30, () => {
    poly(p, [
      [hx - 24, hy + 1], [hx - 18, hy - 6], [hx - 6, hy - 13], [hx + 8, hy - 12],
      [hx + 22, hy - 2], [hx + 20, hy + 12], [hx - 4, hy + 10], [hx - 22, hy + 6],
    ], BASE);
  });

  /* --- THE LOWER JAW, projecting four cells past the snout. The family
     signature, and the same construction as brookmaw's: a BAND along the bottom
     of the head, not a second head. */
  poly(p, [[hx - 28, hy + 4], [hx - 6, hy + 8], [hx + 12, hy + 11], [hx + 14, hy + 16],
    [hx - 8, hy + 14], [hx - 26, hy + 9]], p.back ? BASE : LIGHT);

  /* --- THE CROWN. Three lilac points sweeping BACK off the brow. Largest in
     the middle and the rearmost a step darker, so the three read as one crest
     wound round a skull rather than as three spikes in a row -- and they vary
     in size, which is what stops a repeated element being a comb. */
  cast(p, 20, () => {
    flat(p, () => {
      poly(p, [[hx - 3, hy - 12], [hx + 8, hy - 26], [hx + 7, hy - 8]], ACCENT);
      poly(p, [[hx + 6, hy - 11], [hx + 27, hy - 24], [hx + 17, hy - 3]], ACCENT);
      poly(p, [[hx + 16, hy - 4], [hx + 31, hy - 11], [hx + 21, hy + 4]], ACCENT_DARK);
    });
  });

  /* --- THE NECK FIN. ONE, swept back off the neck into the empty canvas above
     the coil's free end, and drawn AFTER the skull.
     Both of those are corrections. There were two fins, one each side, drawn as
     quadrilaterals, and they came out as two lavender flags pinned to a hose --
     a fin is a CRESCENT: swept back, concave along its trailing edge, wide at
     the root and pointed at the tip. And the one that replaced them was placed
     to the LEFT of the neck and then buried under the skull, which is drawn
     after it: it painted about forty cells and none of them survived. Anything
     that must be seen goes down after everything that could cover it, and it
     goes where there is empty canvas.
     It is drawn large on purpose -- the manual wants this species' lilac at
     20 % and calls it the best two-hue creature on the roster; a thin accent
     never renders its own colour at all. */
  cast(p, 28, () => {
    fin(p, [cx + 12, G - 64], [[cx + 26, G - 82], [cx + 44, G - 78], [cx + 49, G - 64],
      [cx + 36, G - 55]], { tone: ACCENT, rays: 4, ray: ACCENT_DARK });
  });

  /* --- the one specular mark this creature is allowed. Eight to sixteen cells,
     hand-placed, inset up-left of the centre of the largest roundest mass -- the
     rising column -- and legitimate here for the reason §4.6 gives: a serpent is
     wet. Nothing else on any of the six carries one, and the first placement of
     this one, in the middle of the floor coil, read as a stray white diamond. */
  spec(p, cx + 6, G - 63, 2.4, 1.8);
  /* --- THE SECOND STEP IN THE CROSSING GUTTER IS GONE, and it is the blotch
     pass's only change to this species.
     It was a `DEEP` pentagon in the crossing, written as the second value step
     where the neck's cast shadow had already taken the coil to FORM and
     stopped. The argument was right and the shape was not. Judged at 1x it was
     the single darkest thing on the animal that was not the outline, and it sat
     in the middle of the largest smooth surface on the sprite with its top and
     left edges running across open tube and a step notched into its corner --
     a dark angular patch in the middle of a flank, which is the exact fault
     this pass exists to remove. It did not end at the crossing; it ended
     wherever its fifth vertex happened to be.
     The crossing does not need it. The neck is wrapped in `cast`, so it throws
     a hard-edged six-cell step down-and-right onto the coil, and THAT shadow is
     bounded by the form: its edge is the neck's own silhouette. §14 of the
     brief already says so -- "the coil crossing, which used to be an ink line,
     is now a cast shadow and carries no line at all. That is the named repair
     for this species." The DEEP patch was a third opinion on a question two
     correct marks had already settled. */

  if (p.back) return;

  /* --- the face. */
  brow(p, hx - 4, hy - 8, 12, -1, 0.36);
  eyeRow(p, hx - 4, hy - 3, 8, 'slit', 'm', { far: 'm-' });
  /* One mark below the eyes: the mouth. It is drawn as a TAPERING `INNER`
     WEDGE and not as an `occlude` stroke, and the reason is worth writing down
     because it took three attempts. The rule is that an internal dark line must
     terminate on the outer silhouette at BOTH ends; on this animal the jaw's
     rear corner sits directly on top of the floor coil, so there is no outer
     contour back there to terminate on and `occlude` was right to warn every
     time. A cavity that OPENS at the silhouette -- here at the jaw tip, where
     the two jaws part -- and tapers to nothing going back is not a ring and
     never can be: it is the mouth corner every reference serpent draws. */
  poly(p, [[hx - 28, hy + 3], [hx - 6, hy + 7], [hx + 8, hy + 10],
    [hx + 8, hy + 12], [hx - 6, hy + 9], [hx - 28, hy + 6]], INNER);
}

/* ============================================================== deeplum */

/**
 * THE BRIEF SHEET
 *
 *  1. WHAT IS IT.  An anglerfish hanging motionless in black water forty metres
 *     down: a fat dark bulb, a mouth it cannot shut, and one pale lamp out in
 *     front of its own face on a rod.
 *  2. PLAN AND WHAT IT DEMANDS.  B (fish) with an H lower edge. B says do not
 *     stand it up and give it a reason to be at that height; the long trailing
 *     filament reaching the floor is that reason, and it is what the fit pass
 *     bottom-aligns on, so the body sits high in the box with black water under
 *     it.
 *  3. RUNG.  MID (0.9 m). Target 84-100 cells, 950-1400 ref px. MEASURED
 *     107 x 108 shipped, 1404 ref px, k = 1.000. The bounding box is over the
 *     rung's cell range and the AREA is at the top of its band, and both are
 *     the lure: the rod puts a nine-cell ball twenty-eight cells out into empty
 *     canvas, which costs bounding box and almost no area. Everything is drawn
 *     inside 120 x 110, so nothing is resampled.
 *  4. ASPECT AND FILL.  107 x 108, aspect 1.00, fill 49 % -- the lowest fill in
 *     the group by a distance, which is what a creature that is mostly hanging
 *     thread and outstretched rod is supposed to measure.
 *  5. SMOOTH OR STRUCTURED.  STRUCTURED at the head end and smooth behind it.
 *     The bulb is one clean mass with nothing on it; everything the design has
 *     is spent on the two jaws.
 *  6. MASSES (5).  The bulb; the lower jaw; the trailing filament; the lure;
 *     the caudal fin. Plus a dorsal and a pelvic fin. There is only ONE thing
 *     hanging off this animal: a second heavy filament beside the first, which
 *     is what the previous pass had, reads as a pair of LEGS -- an anglerfish
 *     standing up -- and it has been replaced by the pelvic fin.
 *  7. HEAD VERB / BODY VERB.  Level and forward, and utterly still. It has not
 *     moved in the eleven years the lake has been surveyed. The only thing on
 *     the sprite doing anything is the lure, which is out in front of its face
 *     where the animal cannot see it.
 *  8. SIGNATURE, IN THE SILHOUETTE.  The GAPE -- a V bitten out of the front of
 *     the animal between two lips that do not meet, with teeth breaking both
 *     lip lines. The old version painted a dark quadrilateral on a closed face
 *     and it read as a brown box. The manual is explicit: the gape must break
 *     the head's silhouette or it is a patch painted on. The lure on its rod,
 *     out alone in empty canvas, is the second signature.
 *  9. REVERSALS, with coordinates:
 *       snout tip    (cx-41, G-73)  the upper lip's forward prong
 *       snout rise   (cx-30, G-83)  contour turns up onto the brow
 *       brow knob    (cx-16, G-85)  bone bulges over the eye
 *       crown        (cx+ 2, G-87)  high point
 *       dorsal root  (cx+25, G-77)
 *       peduncle     (cx+32, G-67)  the waist, top and bottom
 *       hip under    (cx+22, G-48)
 *       belly        (cx- 8, G-43)  the lowest point of the bulb
 *       hinge        (cx- 9, G-63)  where the two lips meet -- the deepest
 *                                   reversal on the animal
 *       chin         (cx-42, G-55)  the lower prong, one cell past the snout
 *                                   and EIGHTEEN cells below it: that gap,
 *                                   open to the left, is the gape
 *     Eleven, and the gape accounts for three of them.
 * 10. THREE HUES.  H1 deep navy (BASE, MEASURED 32.7 %, and the species is dark
 *     on purpose); H2 pale green (ACCENT family, MEASURED 16.7 %) -- the lure
 *     ball in ACCENT with an ACCENT_LIT core, and the three fins in
 *     ACCENT_DARK, which is a mid sage. That hierarchy is deliberate: the fins
 *     give the second hue a real share without competing, and the lure is
 *     unmistakably the brightest thing on the sprite because it is the only
 *     thing at the top of the accent ramp AND the only thing isolated in empty
 *     canvas. H3 `INNER`, the cavity, MEASURED 3.26 % -- over the 0.5-2.5 band,
 *     and that is the documented exemption: on a creature whose whole character
 *     is a mouth it cannot shut, the cavity is the design.
 * 11. FOUR DETAIL EVENTS.  (a) the face -- brow, eyes, and the gape as the one
 *     mark below them; (b) the teeth, drawn as two rows of two that BREAK the
 *     lip lines rather than as pale cells inside a closed mouth; (c) the lure;
 *     (d) the shadow work -- four cast shadows (jaw onto throat, lure rod onto
 *     brow, dorsal fin onto the back, filament onto the belly) plus one DEEP
 *     core shadow in the gutter behind the jaw.
 * 12. EYES.  `hooded`, `m`, far `m-`, spread 8, `lid: LIGHT`. Heavy-
 *     lidded, high on the skull: a big pale eye competes with the lure and there
 *     is room for exactly one bright event on this animal. The first version
 *     gave them the bright accent and they came out as two pale rounded squares
 *     fighting the lamp, and at `s` they were two nicks and read as nothing at
 *     all: `m` with a heavy lid is the size that resolves without glowing.
 *     There is no `brow()` call -- `hooded` is already lit flesh over a lid
 *     line, and a FORM shelf on top of that is the sunglasses failure.
 * 13. SURFACE MATERIAL, three places: the dorsal fin, the pelvic fin, the
 *     teeth. All three break the outline. Nothing on the bulb.
 * 14. EVERY INTERNAL DARK LINE.  None at all. The gape is a cavity the outline
 *     pass inks for free because it reaches the silhouette; the fins are accent
 *     masses; the filament is separated from the belly by a cast shadow. There
 *     is not one
 *     hand-drawn seam on this species.
 */
function deeplum(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  const snoutTip: Pt = [cx - 41, G - 73];
  const snoutRise: Pt = [cx - 30, G - 83];
  const browKnob: Pt = [cx - 16, G - 85];
  const crown: Pt = [cx + 2, G - 87];
  const backFall: Pt = [cx + 16, G - 84];
  const dorsalRoot: Pt = [cx + 25, G - 77];
  const peduncleT: Pt = [cx + 32, G - 67];
  const peduncleB: Pt = [cx + 32, G - 58];
  const hipUnder: Pt = [cx + 22, G - 48];
  const bellyRear: Pt = [cx + 8, G - 41];
  const bellyMid: Pt = [cx - 8, G - 43];
  const hinge: Pt = [cx - 9, G - 63];
  const chin: Pt = [cx - 42, G - 55];

  /* --- 1. THE PELVIC FIN, low and back, in sage, and it is what replaced the
     second filament.
     There were SEVEN thin rags here originally, and every thin appendage pays
     two cells of outline down each side for its whole length -- most of why
     this species measured 38 % ink. Cutting them to two did not fix it: two
     heavy tubes hanging side by side and both reaching down are LEGS, and the
     creature read as an anglerfish standing up. There is now exactly ONE thing
     hanging off this animal, and the second attachment point is a fin. */
  fin(p, [cx + 10, G - 48], [[cx + 13, G - 34], [cx + 25, G - 31], [cx + 28, G - 43]],
    { tone: ACCENT_DARK, rays: 3, ray: BASE });

  /* --- 2. THE TAIL AND DORSAL FINS, in ACCENT_DARK -- a mid sage. See hue note
     (10) above: the fins give the second hue its share and the lure keeps the
     one bright event. Their struts are BASE, the body's own navy: a strut in
     the bright accent turned each fin into a leaf with a lit midrib pinned to
     the animal. */
  fin(p, [cx + 33, G - 63], [[cx + 45, G - 79], [cx + 51, G - 62], [cx + 43, G - 44]],
    { tone: ACCENT_DARK, rays: 3, ray: BASE });
  cast(p, 16, () => {
    fin(p, [cx + 20, G - 82], [[cx + 26, G - 94], [cx + 36, G - 86], [cx + 33, G - 76]],
      { tone: ACCENT_DARK, rays: 3, ray: BASE });
  });

  /* --- 3. THE BULB, and the upper lip is part of it: the outline runs back and
     UP from the snout tip to the hinge, so the mouth is a wedge cut out of the
     front of the animal rather than a shape drawn on it. */
  poly(p, [snoutTip, snoutRise, browKnob, crown, backFall, dorsalRoot, peduncleT,
    peduncleB, hipUnder, bellyRear, bellyMid, hinge], BASE);

  /* --- 4. THE LOWER JAW, hinged high and rear and scooping forward and DOWN,
     with its chin nine cells past the snout and TWENTY-ONE CELLS BELOW IT.
     That divergence is the entire repair on this species. The first pass had
     the two lips only eight cells apart at the front and then filled the whole
     gap with `INNER`, so the front of the animal was solid and the mouth was a
     brown patch painted on a closed face -- which is precisely what the manual
     says an open jaw must never be. Now the lips diverge from the hinge, the
     cavity stops well short of both tips, and what is left between the snout
     and the chin is a V OF BACKGROUND: a genuine notch in the silhouette that
     survives a black fill and survives the icon.
     It casts onto the throat, which is the tonal event that puts it in front of
     the body rather than painted on it. */
  cast(p, 28, () => {
    poly(p, [hinge, [cx - 26, G - 58], chin, [cx - 42, G - 46], [cx - 26, G - 40],
      [cx - 8, G - 42]], BASE);
  });
  /* --- the one core shadow, in DEEP, in the gutter behind the jaw where it
     meets the throat. A DEEP patch is a core shadow and is not inked. */
  poly(p, [[cx - 10, G - 60], [cx - 2, G - 54], [cx - 2, G - 45], [cx - 10, G - 46]], DEEP);

  /* --- 5. THE NEAR FILAMENT, all the way to the floor, and it is what the fit
     pass bottom-aligns on. Cast on, so it separates from the far one and from
     the belly without a seam. */
  cast(p, 11, () => {
    limbPath(p, path([[cx - 4, G - 44], [cx - 14, G - 30], [cx - 2, G - 16], [cx - 9, G - 1]]),
      11, 4, BASE);
  });

  /* --- 6. THE LURE. A rod arcing up and forward out of the brow into empty
     canvas, ending in a ball seventeen cells across. The rod is dark body
     colour so the eye reads only the ball; the ball is ACCENT with an
     ACCENT_LIT core, and that core is the brightest thing on the creature.
     It is the whole of the "one enormous, simple, high-contrast event" rule
     applied to a lamp instead of to an eye -- which is exactly right, because
     on this species the lamp IS the face. */
  cast(p, 8, () => {
    limbPath(p, path([[cx - 16, G - 88], [cx - 27, G - 94], [cx - 36, G - 94]]), 7, 4, BASE);
  });
  blob(p, cx - 42, G - 93, 9, 9, ACCENT);
  blob(p, cx - 43, G - 94, 4.8, 4.8, ACCENT_LIT);

  if (p.back) return;

  /* --- THE GAPE. `INNER`, not a dark body tone: a mouth painted in shadow
     reads as a bite taken out of the animal, and one warm near-black region in
     the right place does more for a face than a whole shading band.
     It fills the wedge from the hinge forward to about three quarters of the
     way along each lip AND NO FURTHER, so the last quarter of each lip is a
     free prong with sky on both sides. */
  poly(p, [hinge, [cx - 30, G - 72], [cx - 35, G - 57], [cx - 18, G - 58]], INNER);

  /* --- the teeth. Three on each lip, and they BREAK the lip lines -- a fang is
     a silhouette event, and pale cells sitting inside a closed mouth are a
     smudge at 64 px. LIGHT and not ACCENT_LIT: on this palette ACCENT_LIT is a
     near-white green and three of them beside the lure would give the creature
     two bright events. Bone against a near-black cavity needs no help.
     Drawn by hand rather than with `teeth()`, and that is not fussiness: the
     helper paints the right-hand half of every tooth in ACCENT regardless of
     the tone you pass it, so on this species six of the twelve tooth cells came
     out BRIGHT GREEN -- a second lamp, in the mouth, next to the first. Six
     hand-placed triangles of three sizes cost the same and stay bone. */
  for (const [tx, ty, len] of [[cx - 32, G - 70, 7], [cx - 24, G - 67, 5]] as const) {
    poly(p, [[tx - 2.5, ty], [tx + 2.5, ty], [tx, ty + len]], LIGHT);
  }
  for (const [tx, ty, len] of [[cx - 30, G - 57, 6], [cx - 22, G - 58, 4]] as const) {
    poly(p, [[tx - 2.5, ty], [tx + 2.5, ty], [tx, ty - len]], LIGHT);
  }

  /* --- the face. Small, dull, heavy-lidded, and high on the skull: a big pale
     eye competes with the lure and there is room for exactly one bright event
     on this animal. No `brow()` -- `hooded` is already lit flesh over a lid
     line, and a FORM shelf on top of it is the sunglasses failure. */
  eyeRow(p, cx - 14, G - 80, 8, 'hooded', 'm', { far: 'm-', lid: LIGHT });
  /* --- and there is deliberately no gill line. One was drawn behind the jaw
     hinge and `occlude` warned that both of its endpoints were stranded in the
     middle of the mass -- which is the closed-ring defect starting, and the
     rule is to extend it to the contour or delete it. On a bulb this shape
     there is nowhere to extend it to that does not cut the animal in half, so
     it is deleted. That also keeps this species at four interior events. */
}

/* ============================================================ brinewisp */

/**
 * THE BRIEF SHEET
 *
 *  1. WHAT IS IT.  A channel light: 1.0 m tall and 2.2 kg, so there is almost
 *     nothing there. A cowl of brine leaning forward over a wide torn veil,
 *     with one lens burning in the hollow where a face would be.
 *  2. PLAN AND WHAT IT DEMANDS.  H, amorphous / spirit. H demands one bulbous
 *     upper mass, one fraying lower one, the face very high, and a lower edge
 *     that is irregular but NOT noisy -- three or four large lobes, never
 *     fifteen small ones. The hem here has exactly four and no two are the same
 *     width or the same depth.
 *  3. RUNG.  MID (1.0 m). Target 84-100 cells, 950-1400 ref px. MEASURED
 *     70 x 101 shipped, 1233 ref px, k = 1.000.
 *  4. ASPECT AND FILL.  70 x 101, aspect 0.69, fill 70 % -- tall and narrow,
 *     the assigned aspect, and the narrowest thing in the group by 37 cells.
 *  5. SMOOTH OR STRUCTURED.  SMOOTH, and ruthless about it, which is the rule
 *     that comes with choosing smooth: zero internal lines, and the whole budget
 *     spent on silhouette precision plus one high-contrast ocular event.
 *  6. MASSES (3).  The veil; the cowl; the brim. Three is the floor of the whole
 *     standard and this is the species that should be at it -- Sableye is a dark
 *     body and two bright eyes and nothing else.
 *  7. HEAD VERB / BODY VERB.  COCKED, leaning forward and to the viewer's left,
 *     with the veil trailing back to the right as though the animal is drifting
 *     against a current. The tilt of the brim is the entire gesture and there is
 *     nothing else on the sprite that could carry one.
 *  8. SIGNATURE, IN THE SILHOUETTE.  The overhanging brim -- a hard straight
 *     edge, the only straight line on an otherwise entirely curved creature,
 *     tilted so it is low at the front and rides up at the back.
 *  9. REVERSALS: crown (cx-14, G-97); the torn dip beside it (cx-3, G-90);
 *     crown peak 2 (cx+7, G-94); temple (cx-22, G-89); brim front corner
 *     (cx-31, G-70); brim rear corner (cx+21, G-76); shoulder (cx+16, G-64);
 *     hip (cx+26, G-42); and four hem lobes -- (cx-27, G-1), (cx-9, G-3),
 *     (cx+14, G-6), (cx+31, G-2), no two the same width or depth -- separated
 *     by notches at (cx-19, G-13), (cx+2, G-18) and (cx+22, G-16).
 *     Thirteen, and the four lobes are the
 *     species.
 * 10. THREE HUES.  H1 bright cyan (BASE, the cowl and the upper veil); H2 pale
 *     green (ACCENT) on the WHOLE HEM, which is the manual's named repair for
 *     this species -- it was 1.4 % and invisible and MEASURES 14.5 % here, the
 *     whole bottom quarter of the animal, and is the
 *     one place a colour note helps on a creature this pale; H3 `INNER`, the
 *     hollow, MEASURED 2.19 %.
 *     THE PROBLEM WITH THIS PALETTE is that every declared colour is pale, so
 *     §6.7 applies in full: the creature needs a dark NEIGHBOUR rather than a
 *     dark outline, and its whole value range has to be concentrated at one
 *     place. Both are the same object here -- the INNER hollow, a near-black
 *     region sitting directly against the brightest mass on the sprite. Without
 *     it this species is a pale smear, and it was. It is over the 2.5 % `INNER`
 *     ceiling on purpose and that is the documented exemption.
 * 11. FOUR DETAIL EVENTS.  (a) the lens; (b) the hollow; (c) the green hem;
 *     (d) two cast shadows -- brim onto the hollow, cowl onto the veil.
 * 12. EYES.  ONE, `gem`, `xl`, placed with `eyeStamp` and `turned: true` so it
 *     is drawn nose-to-the-left like every other front sprite in this game. A
 *     `gem` is one big disc of field colour with a hard rim and a pupil pressed
 *     against that rim -- Lunatone and Duskull -- and it is the answer for a
 *     species with no face. `xl` because a single eye must be BIG: Lunatone's
 *     is 12 % of its sprite and lantric's is 1.3 %.
 *     Note that no two of the six here share an eye: shalefin `round`,
 *     tidewrack `slot`, brookmaw `angry`, maelstrix `slit`, deeplum `hooded`,
 *     brinewisp `gem`. Eye shape is most of what separates one creature's face
 *     from another's.
 * 13. SURFACE MATERIAL: one place, the torn hem, and it is the outline.
 * 14. EVERY INTERNAL DARK LINE.  None drawn by hand. The fold down the veil is
 *     a SHADE region and the edge pass inks it contour to contour; the brim is
 *     two flat facets meeting at a hard boundary and THAT STEP IS THE RIDGE --
 *     the old version drew a `seamPath` along it as well, which is three cells
 *     to say what the step already says.
 */
function brinewisp(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();

  /* --- 1. THE VEIL. One bell with four hem lobes, and no two of them are the
     same: 8 cells wide and deep at the front, 14 wide and deeper in the middle,
     11 and shallow, then 13 and the deepest at the trailing edge. The whole
     thing is wider on the right than the left, which is the drift.
     Three of the four lobes reach within three cells of the floor and the
     fourth does not, so the contact shadow reads as three places the creature
     is nearly touching rather than as one bar. */
  const shoulderL: Pt = [cx - 20, G - 64];
  const hemL: Pt = [cx - 30, G - 12];
  const lobe1: Pt = [cx - 27, G - 1];
  const notch1: Pt = [cx - 19, G - 13];
  const lobe2: Pt = [cx - 9, G - 3];
  const notch2: Pt = [cx + 2, G - 18];
  const lobe3: Pt = [cx + 14, G - 6];
  const notch3: Pt = [cx + 22, G - 16];
  const lobe4: Pt = [cx + 31, G - 2];
  const hemR: Pt = [cx + 34, G - 15];
  const shoulderR: Pt = [cx + 16, G - 64];

  poly(p, [shoulderL, [cx - 26, G - 40], hemL, lobe1, notch1, lobe2, notch2, lobe3,
    notch3, lobe4, hemR, [cx + 26, G - 42], shoulderR], BASE);

  /* --- 2. THE FAR HALF OF THE VEIL, folded away behind the near half, in
     SHADE. ONE SHADE region on the whole sprite, and it is a genuinely separate
     surface, which is the only thing SHADE is for. It buys the ruled division
     down the fold AND the deliberate dark region a part-pale creature has to be
     given. */
  poly(p, [[cx + 13, G - 62], shoulderR, [cx + 26, G - 42], hemR, lobe4, notch3,
    [cx + 21, G - 22], [cx + 17, G - 40]], SHADE);

  /* --- 3. THE HEM, in pale green, across the whole bottom of the near half.
     The manual's repair for this species is exactly this: the accent was 1.4 %
     and invisible, and it belongs on the trailing veil rather than on a fleck.
     Its upper boundary runs from one edge of the creature to the other, so the
     ink the edge pass lays along it is a legal internal line and not a ring.
     It stops at the fold: the far half's hem stays SHADE, so the near hem glows
     and the far one does not, which is one more statement of the same light. */
  poly(p, [[cx - 29, G - 19], [cx - 16, G - 25], [cx - 2, G - 21], [cx + 9, G - 26],
    [cx + 12, G - 12], lobe3, notch2, lobe2, notch1, lobe1, hemL], ACCENT);

  /* --- 4. THE COWL, one mass leaning to the viewer's left over the top of the
     veil, and CAST -- not `blobFront`. A cowl sitting on a veil is a closed
     object on a surface, which is exactly what the `*Front` helpers are
     reserved for, so it was the one legitimate use in the group; and it was
     still worse than the cast shadow, because the ring is a closed loop of ink
     round the widest part of an already very pale creature and the shadow puts
     the cowl in front of the veil for nothing. There is now no `*Front` call in
     this file at all. And it is a `poly`, not a `blob`: the crown has a torn
     dip in it and an ellipse cannot have one. */
  cast(p, 30, () => {
    poly(p, [[cx - 14, G - 97], [cx - 3, G - 90], [cx + 7, G - 94], [cx + 15, G - 79],
      [cx + 14, G - 62], [cx - 18, G - 62], [cx - 25, G - 78], [cx - 22, G - 89]], BASE);
  });

  /* --- 5. THE HOLLOW. See the hue note above: this is the dark neighbour the
     whole species depends on, and it is deliberately enormous. Set forward and
     low in the cowl so the brim overhangs it.
     Front view only. Drawn on both, the rear sprite came out with an empty black
     socket on the back of its head; from behind, the cowl gets a SHADE nape
     instead -- it still needs a dark note, it just must not be a face-shaped
     one. */
  blob(p, cx - 6, G - 69, 13, 8, p.back ? SHADE : INNER);

  /* --- 6. THE BRIM, laid over the hollow so it overhangs it, and TILTED: low
     at the front and riding up at the back. A level brim on a level cowl is a
     hat; the lean is the gesture.
     Two facets, both `flat()`, meeting along the front edge: the upper plane
     faces up-left and takes LIGHT, the underside faces down and takes FORM, and
     THAT HARD STEP IS THE RIDGE. The old version drew a `seamPath` along it as
     well, which is a line on top of a boundary that already exists. */
  cast(p, 46, () => {
    flat(p, () => {
      poly(p, [[cx - 31, G - 70], [cx - 14, G - 78], [cx + 6, G - 80], [cx + 21, G - 76],
        [cx + 6, G - 86], [cx - 14, G - 85]], LIGHT);
    });
  });
  flat(p, () => {
    poly(p, [[cx - 31, G - 70], [cx - 14, G - 78], [cx + 6, G - 80], [cx + 21, G - 76],
      [cx + 19, G - 72], [cx + 5, G - 76], [cx - 13, G - 74], [cx - 30, G - 66]], FORM);
  });
  /* --- and the one core shadow, in DEEP, along the very lip of the overhang.
     On a species whose every declared colour is pale, the whole value range has
     to be concentrated at one edge (§6.7) -- and this edge, immediately above
     the burning lens, is where it does the most work. A DEEP patch is a core
     shadow and is not inked. */
  flat(p, () => {
    poly(p, [[cx - 29, G - 68], [cx - 13, G - 75], [cx + 5, G - 77], [cx + 19, G - 73],
      [cx + 18, G - 70], [cx + 4, G - 74], [cx - 12, G - 72], [cx - 28, G - 65]], DEEP);
  });

  if (p.back) return;

  /* --- THE LENS, in the hollow, and drawn LAST. The first attempt put it
     before the brim and the brim covered it: the creature shipped with an empty
     black slot for a face. Anything that must be seen goes down after
     everything that could cover it.
     `turned: true` because the creature faces the viewer's left; without it the
     stamp is drawn nose-to-the-right and the eye looks the wrong way.
     `iris: ACCENT` -- the pale green. `gem` and `compound` are the two stamps
     the eye library allows the whole accent family on, because neither has a
     pupil to bury inside a ring and both are bounded by hard dark ink, which is
     exactly what makes a lens read as a lens. On the default `INNER` field this
     creature's one signature event was a muddy brown disc; on the accent it is
     a green light burning in a black hollow, which is what the species IS. */
  eyeStamp(p, cx - 8, G - 69, 'gem', 'xl', { turned: true, iris: ACCENT });
  p.face(cx - 8, G - 69, 12);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  shalefin,
  tidewrack,
  brookmaw,
  maelstrix,
  deeplum,
  brinewisp,
};
