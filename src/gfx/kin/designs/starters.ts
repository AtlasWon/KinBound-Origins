/**
 * THE THREE STARTERS — ROUND 6, redrawn from the animal up.
 *
 * WHY THESE WERE THROWN AWAY AGAIN RATHER THAN EDITED. The round-5 versions of
 * these three were not careless; they were written against a pipeline in which
 * there was no line-free way to say "darker". `SHADE` and `DEEP` were both
 * auto-promoted to hard ink, so an author who wanted a shadowed haunch with no
 * ring round it could not write one, and all three of these — like the other
 * forty-five — answered by drawing a smooth blob and letting the shading pass
 * airbrush it. `FORM` and `cast()` now exist, which changes what the correct
 * drawing IS, not merely how it is toned. So the three functions below are new
 * from the first coordinate.
 *
 * The set, in one line each:
 *
 *   sprigling  a squat hedge-sprout BRACING: forelegs splayed forward, hind
 *              legs raked back, head down, wearing a heavy five-lobed leaf
 *              collar round its neck. Compact, green, four contacts.
 *   cinderpaw  an ember cub in mid-stalk: long and low, head below the
 *              shoulder line, near forepaw advanced across the chest, far
 *              forepaw in the air, and a brush tail swept back and up whose
 *              last third is the ember. Three contacts.
 *   rilltail   an otter sitting up in the shallows, one webbed mitt raised
 *              mid-tap, its broad paddle laid flat along the floor behind it.
 *              One mass, floor to crown. Two contacts plus the paddle.
 *
 * THEY ARE A SET because they share the round-6 discipline and nothing else:
 * three tones per material, one large flat pale region each, every dark on a
 * continuous surface in `FORM` with no line round it, every mass-on-mass
 * separation done with a cast shadow thrown down-and-right, no closed rings,
 * no hand-placed highlights, and exactly one mark below the eyes.
 *
 * ROUND 7 ADDS ONE RULE TO THAT LIST, and it is the only thing this pass did to
 * sprigling and half of what it did to cinderpaw:
 *
 *   A DARK REGION MUST BE BOUNDED BY THE FORM. It ends at a contour, at a
 *   joint, or at the edge of a mass, and its shape is the shape the turn makes:
 *   the underside of a barrel, the far half of a haunch past the terminator,
 *   the band under a jaw. A dark region that begins and ends in the middle of a
 *   flat surface, with edges that answer to nothing, is not shading — at 1x it
 *   reads as DIRT, and the creature looks stained rather than lit.
 *
 * `FORM` arriving in round 6 is what let us model form at all and it was the
 * right change; what round 6 then did with it, on this file and on a dozen
 * other species, was drop ellipses onto flanks. The `turn()` helper below is
 * the mechanical answer: it drives the far edge of the region straight through
 * the silhouette so the clip to body cells is what draws its boundary, which
 * means the boundary cannot be anything except the animal's own edge.
 *
 * Round 7 also gave cinderpaw its tail back. See its brief.
 *
 * THEY ARE UNMISTAKABLE FROM EACH OTHER because no two share a proportion
 * (compact / long-and-low / tall), a posture (braced / stalking / sitting), a
 * head verb (lowered-and-set / lowered-and-forward / level-and-watching), a
 * ground-contact count (four / three / two-and-a-blade) or an eye style
 * (hooded / slit / round).
 *
 * WHAT EACH HANDS TO ITS SECOND STAGE. sprigling → bramblehusk: the collar
 * (it becomes the woven thorn husk). cinderpaw → blazelynx: the brush tail
 * with a pale last third. rilltail → brookmaw: the flat wide skull and the
 * paddle. In each case one signature carries and everything else changes.
 *
 * ONE PALETTE FACT THAT DECIDES THREE DESIGNS, and it is not visible in the
 * code. `paletteOf` reads a five-slot palette as [base, shade, light, accent,
 * ink] and then takes whichever declared colour is genuinely darkest as the
 * ink, recovering the loser as `accent2`. On these three that resolves to:
 *
 *   sprigling  ink = #2a4a26 (declared).   ACCENT === ACCENT2 === #c9d98a.
 *   rilltail   ink = #1c3a58 (declared).   ACCENT === ACCENT2 === #e8f0f4.
 *   cinderpaw  ink = #3a2018 (the ACCENT). ACCENT === the ink; ACCENT2 = #ffe0a0.
 *
 * So on cinderpaw the `ACCENT` family is the outline colour, and painting a
 * marking in it is painting ink-coloured cells on an ink-outlined creature —
 * which is precisely what the manual tells the sixteen affected species to
 * delete. cinderpaw therefore paints NO `ACCENT` at all and spends its second
 * material on `LIGHT` (#f2b45a gold) and its third on `ACCENT2` (#ffe0a0
 * cream). That is a deliberate exemption from "ACCENT renders on 48/48" and it
 * is the palette's fault, not the drawing's; the repair is a six-slot palette
 * in species.json, which this file does not own. sprigling and rilltail both
 * paint real `ACCENT` masses. See the per-species headers for the hue counts
 * each one can actually reach on the colours it is given.
 */

import {
  ACCENT, ACCENT2, ACCENT2_DARK, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, FORM, LIGHT, SHADE,
  blob, brow, cast, cell, cellOver, earPointed, earRound, eyeRow, far, flat, haunch,
  jawLine, legColumn, legDigitigrade, legPlantigrade, limbPath, mane, mouthLine,
  muzzle, notch, path, paw, poly,
  type Pen, type Pt,
} from '../parts.js';

/**
 * ROUND 7. THE UNDERSIDE, and why this replaces two of the three `core()` calls.
 *
 * `core()` below paints a fat DEEP ellipse. An ellipse has no edge that answers
 * to the animal: rendered at 1x, sprigling's belly ellipse and cinderpaw's
 * armpit ellipse both came back as a dark angular patch that began and ended in
 * the middle of a flat surface, and at the size the game actually draws them
 * they read as DIRT rather than as shade. Same defect, same cause, on a dozen
 * species across the roster.
 *
 * The rule that replaces it: **a dark region has to be bounded by the form.**
 * It ends at a contour, at a joint, or at the edge of a mass, and its shape is
 * the shape the turn makes. So this helper takes a polygon whose lower edge is
 * driven straight through the silhouette and off the bottom of the frame; the
 * clip to body cells is what draws the region's real boundary, which means the
 * boundary IS the animal's own underside contour and cannot be anything else.
 * Call it BEFORE the near limbs and they close the other two ends for you: the
 * shadow stops where the leg starts, because the leg is in front of it.
 *
 * It steps the material rather than smearing one grey, on the same table
 * `endCast` uses, so a shadow crossing from an orange flank onto a gold bib
 * stays one shadow instead of turning into a sticker.
 */
function region(p: Pen, pts: Pt[], paint: (v: number) => number): void {
  let minY = Infinity, maxY = -Infinity;
  for (const q of pts) { if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1]; }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const yy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
      if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
        xs.push(a[0] + ((yy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.round(xs[i]!); x <= Math.round(xs[i + 1]!); x++) {
        const n = paint(p.m.get(x, y));
        if (n >= 0) cellOver(p, x, y, n);
      }
    }
  }
}

/** The underside itself: one material step down, on the `endCast` table. */
function turn(p: Pen, pts: Pt[], deep = false): void {
  region(p, pts, (v) => {
    if (v === BASE) return deep ? DEEP : FORM;
    if (v === FORM) return deep ? DEEP : -1;
    if (v === LIGHT) return deep ? FORM : BASE;
    if (v === ACCENT) return ACCENT_DARK;
    if (v === ACCENT2) return ACCENT2_DARK;
    return -1;
  });
}

/**
 * THE ONE DEEP SHADOW EVENT PER CREATURE: a core shadow, painted only onto
 * cells that are already body.
 *
 * §6.4 is the measurement behind this. Mean body-pixel luma across the shipped
 * roster is 157 against a mean ink luma of 72, and **only 6.8 % of body pixels
 * are darker than the line drawn round the creature** — on fourteen species it
 * is 0.0 %. The reference is not like that: Mightyena's mane, the shadow under
 * its jaw and its far legs are all at or below outline value. The pass cannot
 * know where the armpit is; the author has to say.
 *
 * WHY IT IS A BLOB AND NOT A STROKE, and this is load-bearing. `internalEdges`
 * classifies `DEEP` as a recess and inks the border of any recess component of
 * ten cells or more — UNLESS the component is mostly interior
 * (`RECESS_SOLID_RATIO = 0.35`), which is the round-6 rule that separates a
 * seam from a shadow. A `DEEP` stroke is a line and inks, which is what it is
 * for; a `DEEP` patch with a real interior is a core shadow and is left alone.
 * So this is deliberately a fat ellipse and never a thin one.
 *
 * `cellOver` rather than `blob`, so it can never extend the silhouette: a core
 * shadow that grows the outline is a hole in the animal.
 */
function core(p: Pen, x: number, y: number, rx: number, ry: number): void {
  for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
    for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
      const u = dx / rx, v = dy / ry;
      if (u * u + v * v <= 1) cellOver(p, x + dx, y + dy, DEEP);
    }
  }
}

/* ============================================================ sprigling */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IS IT. A squat, thick-set hedge sprout the shape of a young boar or
 *     a tortoise with legs: a low green barrel braced against the ground, head
 *     carried low and set, wearing last season's growth as a heavy five-lobed
 *     leaf collar round its neck and this season's as a closed bud on its
 *     crown.
 *  2. BODY PLAN. §2.8A quadruped, at the squat end. Four legs visible as four
 *     with floor between the pairs; the far pair drawn first in SHADE and set
 *     inboard and 8 cells higher; the head carried forward of the chest and
 *     BELOW the withers. It obeys what that plan demands: the shoulder and the
 *     haunch belong to the torso's outline (`haunch()`, welded, no seam) and
 *     each limb starts below that bulge.
 *  3. RUNG. SMALL (0.4 m). Ships at 81 × 65 cells — 41 × 33 reference px,
 *     inside the 34–42 band — for 843 reference px of body against the rung's
 *     650–1000. Nowhere near the 120 × 110 clamp, so nothing is resampled and
 *     every hand-placed cell lands where it was put.
 *  4. ASPECT AND FILL. Compact — the APPENDIX B aspect for this species. 1.25
 *     wider than tall, against cinderpaw's 1.30 long-and-low and rilltail's
 *     0.82 tall-and-narrow, so no two of the three share proportions. Fill 64 %,
 *     the lower end of the "compact, solid, heavy" band.
 *  5. SMOOTH OR STRUCTURED. STRUCTURED. It has named landmarks: withers,
 *     croup, brisket, belly tuck, point of buttock, occiput dip, plus a knee
 *     and an ankle on the raked hind leg. ONE internal line total (the mouth).
 *  6. THE MASSES, 5. (i) the barrel, (ii) the leaf collar, (iii) the head,
 *     (iv) the near foreleg, (v) the near hind leg. The far pair is one darker
 *     shape behind the barrel, not two masses.
 *  7. HEAD VERB / BODY VERB. Head LOWERED AND SET — the crown sits 5 cells
 *     below the withers and the muzzle points down-forward. Body: BRACING. The
 *     weight is going forward and down into splayed forelegs while the hind
 *     pair rakes back and pushes. That is the Vellum entry drawn instead of
 *     described: "it plants both feet and refuses to be moved."
 *  8. SIGNATURE FEATURE. The collar, and it is silhouette: five lobes breaking
 *     the outline above the nape, over the shoulder and past the cheek, with
 *     the head drawn over its front half so it reads as a ring the head is
 *     coming out of rather than as plates on a back. Second signature, also
 *     silhouette: the bud on the crown.
 *  9. TWELVE REVERSALS — TEN NAMED, coordinates relative to (cx, G), and every
 *     one of them is a vertex of the barrel or the head polygon below:
 *       withers            (cx −  6, G − 42)  contour high point, front half
 *       back dip           (cx +  6, G − 37)  5-cell sag behind the withers
 *       croup              (cx + 17, G − 40)  second high point, 2 lower
 *       point of buttock   (cx + 28, G − 21)  rearmost point of the animal
 *       haunch under-turn  (cx + 21, G − 11)  contour cuts up into the stifle
 *       belly tuck / flank (cx +  6, G − 20)  underside rises 7 from the brisket
 *       brisket            (cx − 13, G − 13)  lowest, most forward point
 *       point of shoulder  (cx − 18, G − 24)  front contour steps forward
 *       occiput dip        (cx − 15, G − 38)  contour dips between skull and neck
 *       brow bulge         (cx − 32, G − 39)  `brow({ ridge: true })`, bone
 *     Plus the plantigrade knee reversal at (cx + 23, G − 11), which rakes the
 *     hind leg back, and four paws each stepping out both sides of its ankle.
 * 10. THE HUES, and the honest count is TWO PLUS A CAVITY. H1 leaf green
 *     `BASE` #4f8a45 — barrel, head, all four legs; measures 33 %. H2 pale
 *     yellow-green `ACCENT` #c9d98a — the collar and the bud and nothing else;
 *     measures 14.5 %, a whisker under the 15–30 % target, and closing that gap
 *     is why every lobe was lengthened four cells late in the drawing.
 *     H3 `INNER` — the mouth, 0.7 %. `LIGHT` is spent nowhere by hand, so the
 *     pale end of the ramp never becomes a fourth material.
 * 11. FOUR INTERIOR DETAIL EVENTS. (a) the face — brow, hooded pair, mouth;
 *     (b) the collar as one flat `ACCENT` facet; (c) the underside of the
 *     barrel — a `FORM` band whose lower edge is the silhouette and whose two
 *     ends are the near legs drawn over it, with its deepest strip stepped to
 *     `DEEP`; (d) the collar's cast shadow across the shoulder, plus the
 *     haunch's `FORM` under-turn. Round 6 drew (c) as a fat `DEEP` ellipse
 *     floating in the middle of the flank, and at 1x it read as a stain — it is
 *     the one defect the round-7 review named on this species. No bark seams, no
 *     belly segments, no growth lines, no root marks, no leaf veins — the
 *     round-5 version had all five of those.
 * 12. EYES. `hooded`, size `m`, far `m-`, spread 7, `tilt: -2`, one shared row
 *     at 0.45 of skull depth. Hooded because the heavy lid IS this brief:
 *     stubbornness is a lid, not a size, and post-rebuild `hooded` paints lit
 *     flesh, one dark line and a shallow eye — Numel — instead of the ink bar
 *     that made every one of these read as sunglasses. Field left at its
 *     default `INNER`. ONE MARK BELOW THE EYES: a closed `mouthLine`, flat
 *     (`curve: 0`), 7 cells below the eye row. Never two.
 * 13. SURFACE MATERIAL, ONE PLACE. Foliage, at the collar, where it breaks the
 *     outline in five lobes. Nowhere else. No fur, no bark, no all-over
 *     anything.
 * 14. EVERY INTERNAL DARK LINE. Exactly one authored: the mouth (`INNER`,
 *     terminating inside the muzzle by design — it is a cavity, not a seam).
 *     Zero `occlude`/`seam`/`bevel`/`*Front` calls. The only other internal ink
 *     is what `internalEdges` rules round the collar (a genuine `ACCENT` mass)
 *     and round the far pair (genuine `SHADE`), both of which are the pass
 *     doing its job. There is not one closed loop on an open surface.
 * 15. Not a second stage.
 *
 * EXEMPTIONS, DECLARED. (a) Four feet planted rather than three-down-one-
 * raised: this animal's entire character is refusing to move, and the four
 * contacts are separated in x AND sit at two heights, which is what the
 * three-down rule is actually protecting against. (b) Two hues plus `INNER`
 * rather than three saturated hues: the declared palette's slots 4 and 5
 * resolve to the same colour (see the file header), so a third hue does not
 * exist to spend. (c) Total ink 32 % against a 28 % ceiling: the author-driven
 * half of that — internal edge ink, which is what §7.3 is actually about — is
 * 4.4 % and inside the < 5 % target. The excess is outer contour, and it is
 * arithmetic rather than sloppiness: an 843-px body wearing six collar lobes,
 * a bud and four splayed legs has a long perimeter, and a two-cell outline on
 * a small creature is a bigger share than the same outline on a large one.
 * `perimeter² / area` at icon scale is 30, inside the ≤ 40 ceiling.
 */
function sprigling(p: Pen): void {
  // The verdant character pass stamps veined leaf almonds onto whatever is
  // highest and behind the face. This creature's foliage is authored, and a
  // second set of leaves growing out of the first is how the round-5 version
  // turned into a heap.
  p.noTypeTraits();

  const G = p.ground, cx = p.cx;

  /* ---- THE FAR PAIR. One tone, drawn first, no seam of their own: SHADE
     against BASE is already ruled by the internal-edge pass and a DEEP seam on
     top of it is paying twice for one line.

     Both are pushed INBOARD rather than straight back. `far()`'s default is
     10 cells forward for both, which is right for a walking animal but wrong
     for a braced one: here the near forepaw is already thrown well forward and
     the near hind paw well back, so the far pair belongs in the MIDDLE, where
     it fills the arch between them and gives four countable ground contacts
     instead of two clumps. Hence dx +10 on the front pair and −12 on the back.
     The lift is 8 rather than `far()`'s default 9, because on a squat animal
     the belly is only fourteen cells off the floor and a 9-cell lift puts the
     far pads inside it. Eight is still in the 6–12 band, and it is the single
     cue that turns four legs into an animal standing on a ground plane. */
  legColumn(p, ...far(cx - 13, G - 21, G, { thick: 12, footHalf: 9, side: -1 }, 10, -8));
  legPlantigrade(p, ...far(cx + 18, G - 23, G, { thick: 14, ankle: 9, footHalf: 10, side: 1 }, -12, -8));

  /* ---- THE BARREL, as a polygon with named vertices rather than a capsule.
     Every one of the ten reversals in the header is one vertex here, and that
     is the whole argument for `poly` over `blob`: an ellipse throws all of them
     away and no amount of tone puts them back. Run through `path` so the
     corners are muscle rather than facets.

     SLUNG LOW. The first pass at this had the belly at G−19 and the hips at
     G−28, which gave a 22-cell leg under a 27-cell body: a normal quadruped,
     not a squat one. The barrel now hangs to G−14 at the brisket, so only
     11–14 cells of leg show below it, and the animal's mass sits on the floor
     where "refuses to be moved" needs it. */
  poly(p, path([
    [cx - 18, G - 24],  // point of shoulder — front contour steps forward
    [cx - 15, G - 38],  // occiput dip, where the neck meets the collar
    [cx - 6, G - 42],   // WITHERS
    [cx + 6, G - 37],   // back dip — 5 cells of sag
    [cx + 17, G - 40],  // CROUP, two cells below the withers: a pusher, not a leaper
    [cx + 25, G - 32],
    [cx + 28, G - 21],  // point of buttock — rearmost
    [cx + 21, G - 11],  // the haunch turning under
    [cx + 6, G - 20],   // FLANK — top of the belly tuck
    [cx - 3, G - 16],
    [cx - 13, G - 13],  // BRISKET — lowest and most forward; the tuck rises 7 from here
  ] as Pt[]), BASE);

  /* ---- The two muscle masses that belong to the TORSO's outline and not to
     the limbs. `haunch` welds in and registers as a silhouette bulge only — no
     seam, no ring, no lozenge sticker. This is the shape the whole roster was
     missing, and it is why the round-5 legs read as tubes inserted into a
     barrel: the limb has to start BELOW a bulge that is already there. */
  haunch(p, cx + 18, G - 23, 12, 12, BASE, { underside: true });
  haunch(p, cx - 10, G - 27, 10, 10, BASE);

  /* ---- THE UNDERSIDE OF THE BARREL. Round 6 put a DEEP ellipse here — 22
     cells across, four deep, floating in the middle of the flank with a hard
     straight top edge and both ends stopping in open green. At 1x it was a
     smear of dirt on the animal's side, and it is the single defect the round-7
     review named on this species.

     What is drawn instead is the same idea bounded by the animal: the top edge
     runs parallel to the belly contour four cells above it, from the BRISKET
     vertex to the HAUNCH UNDER-TURN vertex — both of them reversals already in
     the outline — and the bottom edge is driven off the frame so the silhouette
     itself cuts it. The region therefore ends nowhere except on the animal's
     own edges. It goes down BEFORE the two near legs, so those close the last
     two ends: the shadow stops at the foreleg because the foreleg is in front
     of it, which is what actually happens under a barrel. */
  turn(p, [
    [cx - 14, G - 16],
    [cx - 3, G - 20],
    [cx + 7, G - 24],
    [cx + 16, G - 21],
    [cx + 22, G - 14],
    [cx + 22, G + 6],
    [cx - 14, G + 6],
  ] as Pt[]);

  /* ---- THE NEAR PAIR, and the two are deliberately different helpers, because
     the difference between the pairs is a large part of what says "quadruped"
     rather than "four pegs". The foreleg is a braced column splayed forward
     (weight going into the floor); the hind leg is plantigrade and RAKED BACK,
     with a knee reversal and an ankle, which is what an animal pushing against
     something actually does with its back legs.

     Both cast, and neither is `front: true`. The round-5 version wrapped a
     closed DEEP ring round each leg root; the cast shadow says the same thing
     with no loop, and it points the same way as every other shadow here. */
  legPlantigrade(p, cx + 18, G - 23, G, { thick: 15, ankle: 9, footHalf: 10, side: 1 });

  /* ---- THE COLLAR. The species' signature and its whole second hue.
     ROUND THE NECK, NOT ALONG THE BACK. The round-5 version drew it as a fan
     of three blades lying back over the shoulders, and a row of peaks on a
     SPINE reads as a stegosaur no matter what colour it is. Six tips radiating
     from a hub at the NECK — of which four clear the outline and two are
     covered, one by the head and one by the near foreleg — read as a ring the
     head is coming out of, which is what a collar is: Cradily's calyx, a
     frilled lizard, an Elizabethan ruff. The two covered ones are not waste;
     they are what makes the four that show read as parts of a ring rather than
     as a row.

     ONE FLAT FACET. A leaf is a plane, and §4.3 gives a plane one flat tone
     across its whole area with no gradient at all — which is what `flat()`
     asks for, and it is also the single largest connected same-tone region on
     this sprite. See the note inside the call for why the second facet this
     started with had to go.

     The lobes VARY in length and sweep BACK — the front tip is the shortest
     and the one over the shoulder the longest — because equal lobes are a comb
     and a symmetric fan is an ornament rather than an animal. It is also the
     cheapest asymmetry available and it tells you which way the animal faces. */
  cast(p, 36, () => {
    // The hub is the neck, not the shoulder. That is the correction: the first
    // pass hung the collar off the withers and it read as a stegosaur's back
    // plates, because a row of points on a SPINE is what that is. Centred on
    // the neck, with the head drawn over its front half so two tips come
    // forward past the cheek and two hang below the throat, the same seven
    // points read as a ring the animal's head is coming out of.
    const hx = cx - 15, hy = G - 29;
    flat(p, () => poly(p, [
      [hx, hy],
      [cx - 28, G - 17],  // T7 tip — down-front, past the throat
      [cx - 23, G - 29],  // notch
      [cx - 31, G - 44],  // T1 tip — up-front, past the cheek; SHORTEST of the top three
      [cx - 19, G - 36],  // notch
      [cx - 17, G - 54],  // T2 tip — straight up over the nape
      [cx - 14, G - 37],  // notch
      [cx - 1, G - 51],   // T3 tip — up-back
      [cx - 9, G - 34],   // notch
      [cx + 10, G - 42],  // T4 tip — back, clear of the spine; LONGEST, so the fan sweeps
      [cx + 4, G - 25],   // T5 tip — down-back, closing the ring behind the shoulder
    ] as Pt[], ACCENT));
    /* THERE IS NO SECOND FACET, and that is a deletion worth recording so the
       next author does not put it back. The first three passes split the collar
       into an up-facing `ACCENT` fan and a down-facing `ACCENT_DARK` one, on the
       correct §4.3 grounds that two planes meeting at a ridge take two flat
       tones. Rendered, the lower facet never once broke the outline — the near
       foreleg covers that region whichever order the two are drawn in — so all
       it ever produced was an olive patch on the shoulder that read as dirt.
       A fan of five blades seen edge-on is ONE plane, and one plane takes one
       tone. The ridge that §4.3 is talking about is not there to be drawn. */
  });

  /* ---- THE NEAR FORELEG goes down AFTER the collar, which is the whole reason
     the order in this function is what it is. A ruff at the neck sits BEHIND
     the near foreleg — the leg is the frontmost thing on this animal — so the
     leg's own cast shadow falls across the collar's lower lobes and puts them
     where they belong, hanging behind the shoulder rather than pasted on it. */
  legColumn(p, cx - 13, G - 21, G, { thick: 14, footHalf: 10, side: -1 });

  // THE ONE DEEP EVENT, and it is now the deepest three rows of the underside
  // band rather than a free-floating ellipse: the strip of belly directly
  // between the two near legs, where the barrel is eight cells off the floor
  // and nothing reaches it. Its lower edge is the silhouette and its two ends
  // are the legs drawn over it, so it is the same region as the FORM band, one
  // step darker, and it still cannot end in open flank.
  turn(p, [
    [cx - 6, G - 18],
    [cx + 4, G - 21],
    [cx + 12, G - 19],
    [cx + 12, G + 6],
    [cx - 6, G + 6],
  ] as Pt[], true);

  /* ---- THE HEAD. A blunt wedge with NO STOP: crown to nose is one straight
     ramp, which is the reptile/bird/grazer entry in §5.1's table and is what a
     browsing sprout should have. §5.1 also says that where the stop is zero
     there must be NO PALE MUZZLE PATCH either, and there is none — the pale
     ellipse on a straight wedge is the "wedge with a stain on it" that sank
     the round-5 cinderpaw, and it would sink this one too.

     Set LOW: the crown sits 5 cells below the withers. A squat animal that
     lifts its head stops being squat, and this one is leaning into something. */
  poly(p, path([
    [cx - 15, G - 37],  // occiput
    [cx - 24, G - 41],  // crown
    [cx - 32, G - 39],  // the brow bulge, and the top of the one straight ramp
    [cx - 41, G - 31],
    [cx - 43, G - 26],  // nose
    [cx - 38, G - 21],
    [cx - 29, G - 19],  // chin
    [cx - 18, G - 22],  // throat
  ] as Pt[]), BASE);

  /* ---- THE BUD: this season's growth, a closed calyx on the crown, one fat
     teardrop drawn to a point only in the last three cells. It used to be three
     overlapping sepals with a lit edge and an inked edge each; at icon scale
     none of that survives and the shape does, so the shape has to be a bud.
     Small: at ten cells it was an ear, and this creature has no ears for it to
     be confused with. */
  poly(p, [
    [cx - 30, G - 40], [cx - 24, G - 41],
    [cx - 22, G - 46], [cx - 23, G - 51], [cx - 25, G - 55],
    [cx - 28, G - 50], [cx - 31, G - 45],
  ] as Pt[], ACCENT);
  // Two cells of the palest tone the accent ramp reaches, at the point of the
  // bud. It is the single brightest note on the creature and it marks the one
  // thing on it that is new growth — which is the whole species. Two cells; the
  // round-5 version spent twenty here and none of them survived the icon.
  cell(p, cx - 25, G - 54, ACCENT_LIT);
  cell(p, cx - 24, G - 53, ACCENT_LIT);

  if (p.back) { p.face(cx - 28, G - 31, 13); return; }

  /* ---- THE FACE, and everything in it is one of the four detail events.

     The brow first, because the eye stamps are blitted after the light runs
     and sit on top of it. It is a `FORM` shadow on the same surface — never a
     line, never a stripe of accent — and `ridge` bites the bone above it into
     the head's top contour so the brow is a silhouette event as well as a
     tonal one. On a stubborn animal it reads as set rather than as hostile,
     because the lid below it is heavy and the mouth below that is flat. */
  brow(p, cx - 32, G - 35, 10, -1, 0.30, { ridge: true });

  /* One mark below the eyes and never two: a closed mouth, flat — `curve: 0`
     is the determined line, and this animal is nothing but determined. Set 7
     cells below the eye row, on the lower half of the wedge, so the eye is not
     the lowest thing on the head. */
  mouthLine(p, cx - 35, G - 23, 7, 0);

  /* The eyes. One row by construction. `far: 'm-'` is the narrow variant —
     foreshortening is not distance, and a head turned thirty degrees puts both
     eyes at the same distance and compresses the far one along one axis only.
     `tilt: -2` rides the FAR eye two cells UP: the skull recedes upward and
     away, so with our house `farSide: +1` the right-hand eye sits higher. The
     eye brief asks for this as a `farRise` option `eyeRow` does not have yet,
     and a negative `tilt` is the same two cells.

     Spread 7, not 6. An `m` stamp is eleven cells wide; at spread 6 the two
     ink masses are one cell apart and the pair floods into a single black bar,
     which is exactly the goggles the first pass came back wearing. Fourteen
     cells centre to centre on a thirty-cell skull is 1.3 eye-widths, the
     three-quarter-head band. */
  eyeRow(p, cx - 28, G - 31, 7, 'hooded', 'm', { far: 'm-', tilt: -2 });
}

/* ============================================================ cinderpaw */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IS IT. A fox-shaped ember cub in mid-stalk — long, low, head below
 *     the shoulder line, one forepaw advanced across its own chest and the
 *     other lifted clear of the floor, with a brush tail swept back and up
 *     whose last third is the fire.
 *  2. BODY PLAN. §2.8A quadruped, at the long-and-lean end. Four legs, floor
 *     between the pairs, spine tilted nose-down, head carried forward of the
 *     chest and lower than the withers. The plan's trap is the level barrel and
 *     it is answered by the tilt and by a 9-cell belly tuck.
 *  3. RUNG. SMALL (0.5 m) — the largest of the three, and now over the top of
 *     the band. Ships at 87 × 87 cells — 44 × 44 reference px against a band top
 *     of 42, two reference pixels over. The round-7 tail is what put it there
 *     and it is worth two pixels; see the exemption. This is in any case the
 *     heaviest SMALL species on the ladder and it has to read as bigger than
 *     the two 0.4 m creatures beside it. 965 reference px of body against the
 *     rung's 650–1000. Inside 120 × 110, so nothing is resampled; the round-5
 *     version was 122 × 109, over the clamp, and had been through a
 *     nearest-neighbour resample, which is why its face was mush.
 *  4. ASPECT AND FILL. The BODY is long and low — 1.45 wider than deep, more so
 *     since round 7 lifted the underline four cells to get the legs out from
 *     under it — but the tail carries the frame upward, so the sprite itself
 *     squares off at 1.00. sprigling is 1.25 compact and rilltail 0.82 tall, so
 *     no two of the three share a proportion. Fill 55 %.
 *  5. SMOOTH OR STRUCTURED. STRUCTURED. Withers, croup, brisket, tuck, buttock,
 *     stop, hock, elbow — all named, all in the outline.
 *  6. THE MASSES, 5. (i) the tail, (ii) the body, (iii) the head, (iv) the
 *     advanced near foreleg, (v) the near hind leg. The far pair is one darker
 *     shape.
 *  7. HEAD VERB / BODY VERB. Head LOWERED — the crown sits one cell BELOW the
 *     withers and the muzzle points down and forward, which is what Mightyena
 *     does and what a cat about to move does. Body: STALKING. Weight is over
 *     the near hind foot; the near forepaw has already been placed forward; the
 *     far forepaw is 11 cells off the ground, mid-step.
 *  8. SIGNATURE FEATURE. The tail, and it is silhouette and nothing but: a big
 *     curled brush that leaves the point of the buttock, sweeps up the back of
 *     the rump and arcs FORWARD over the spine, ending above the shoulders with
 *     its last third a hard-edged pale ember. It is the largest single mass on
 *     the creature and it holds a clear notch of sky between itself and the back
 *     line the whole way over. You can name this animal from the tail alone at
 *     64 px, which is the entire test — and the round-6 tail, a stub off the
 *     rump, could not.
 *  9. TWELVE REVERSALS — TEN NAMED, relative to (cx, G):
 *       withers            (cx − 16, G − 46)  high point, front half
 *       back dip           (cx −  1, G − 41)  5-cell sag
 *       croup              (cx + 12, G − 44)  second high point
 *       point of buttock   (cx + 25, G − 25)  rearmost
 *       stifle             (cx + 18, G − 19)  thigh's front edge cuts back
 *       belly tuck / flank (cx +  4, G − 32)  underside rises 9 from the brisket
 *       brisket            (cx − 19, G − 23)  lowest, most forward
 *       point of shoulder  (cx − 23, G − 30)  front contour steps forward
 *       occiput / ear root (cx − 20, G − 41)  contour dips before the ear rises
 *       stop               (cx − 39, G − 35)  skull drops 9 cells to the muzzle
 *     Plus the hock, notched into the contour by `legDigitigrade`, and the
 *     advanced forepaw, which steps out both sides of its ankle.
 * 10. THE HUES, and the honest count is TWO PLUS A CAVITY. H1 orange `BASE`
 *     #e0703a — body, head, all four legs, the tail's first two thirds; 32 %.
 *     H2 gold `LIGHT` #f2b45a — muzzle, chest-to-belly bib, the tail's last
 *     third: one warm pale system, 19 %. H3 cream `ACCENT2` #ffe0a0 — the
 *     ember at the very tip of the tail, 1.3 %. Plus `INNER` at 1.8 % for the
 *     nostril and the two ear cavities. The `ACCENT` family is NOT painted at
 *     all: on this palette it resolves to the outline colour (see the file
 *     header), and a black marking on a dark-outlined creature is not a
 *     marking. Measured against the "≥ 25° from the body hue" test the gold is
 *     14° away and the cream 21°, so this species scores ZERO distinct hues
 *     and cannot score more without a palette edit; see the exemption below.
 * 11. FOUR INTERIOR DETAIL EVENTS. (a) the face — brow, slit pair, muzzle,
 *     nostril, jaw line; (b) the bib, one continuous `LIGHT` mass whose lower
 *     edge IS the belly tuck; (c) the tail's ember: one hard-edged `LIGHT`
 *     region with an `ACCENT2` core; (d) the underside of the barrel, one `FORM`
 *     region whose lower edge IS the silhouette and whose two ends are the near
 *     legs drawn over it. (d) replaces round 6's `DEEP` armpit ellipse — see the
 *     long note at the deletion, further down, for why the deep tone came off
 *     this creature entirely. Nothing else: no ash bands, no ember flecks, no
 *     shoulder crease, no rib line, no mask stripes, no whiskers — the round-5
 *     version had six.
 * 12. EYES. `slit`, size `m`, far `m-`, spread 7, `tilt: -2`. Slit because it
 *     is the one style with no white in it at all and the whole character of a
 *     hunting animal is how little white shows. Field left at its default. ONE
 *     MARK BELOW THE EYES: the nostril on the muzzle (`muzzle({ detail: true })`),
 *     which is three cells and the best value per cell on the sprite. The eye
 *     sits 5 cells above the top of the muzzle mass, so there is no long empty
 *     forehead.
 * 13. SURFACE MATERIAL, ONE PLACE. Fur, at the tail, where one `mane()` breaks
 *     the outline in three clumps along the brush's outer edge. §7.1 asks this
 *     species for its one `mane()` at the neck; §"TAILS" answers that a species with a plume tail does not also get
 *     a neck ruff, and on a cub whose entire signature is its brush the tail is
 *     the correct single fur event. There is not one hair on its flank, which
 *     is also true of Mightyena.
 * 14. EVERY INTERNAL DARK LINE. One: the jaw line, from the near ear's root
 *     down and forward to the mouth corner at the chin. BOTH ends on the outer
 *     silhouette, verified — `jawLine` runs through `occlude`, which warns at
 *     build time if either end is stranded, and it took three attempts to find
 *     two ends that were genuinely on a contour. The obvious pair are not: on
 *     a head this low the throat is welded to the chest and the occiput is
 *     welded to the shoulder, so a line drawn to either has a loose end, which
 *     is exactly the defect §7.3 bans. Zero `*Front` calls, zero seams, zero
 *     closed loops.
 * 15. Not a second stage. What it hands to blazelynx: the brush tail with a
 *     pale last third, and the orange-over-gold relationship. What blazelynx
 *     must change: the mane goes to the neck in a deep red, the legs lengthen,
 *     and the head lifts.
 *
 * EXEMPTIONS, DECLARED. (a) Zero distinct hues by the ≥ 25°/chroma-45 test
 * rather than the three the manual asks for. This species' declared palette is
 * four warm oranges and a near-black; its gold sits 14° from its orange and its
 * cream 21°, and there is no fifth colour on the sheet to reach for. The repair
 * §6.9 prescribes — "cream belly/muzzle/tail-tip H38, saturated not white" plus
 * an ember gold H45 — is a species.json edit and this file does not own it. The
 * design is drawn so that it lands correctly the moment that edit arrives: the
 * pale system is already three separate bounded regions and it is already
 * spending `LIGHT` and `ACCENT2` rather than `ACCENT`. (b) 44 reference px in
 * both dimensions against a 42 band top. Round 6 was one over on the long side
 * and round 7 is two, and the two pixels are the tail: the round-6 brush was
 * measured, correct and forgettable, and the manual's own rule is that the
 * signature feature has to be IN the silhouette. The clamp that actually
 * matters — 120 × 110, past which the factory resamples and the face turns to
 * mush — is nowhere near. (c) NO `DEEP` EVENT AT ALL, against §6.4's one per
 * creature. Argued in full at the deletion site.
 */
function cinderpaw(p: Pen): void {
  // The flame character pass grows tongues off the upper contour in the
  // declared accent, which on this species is the ink. On an orange cub they
  // read as scorch damage. The heat is authored instead, at the tail.
  p.noTypeTraits();

  const G = p.ground, cx = p.cx;

  /* ---- THE FAR PAIR. SHADE, first, no seams. The far hind is set forward
     under the belly and the far fore is LIFTED — `far()`'s 9-cell rule plus
     two more, because this animal is mid-step and the raised paw is what makes
     three contacts instead of four. A creature with four feet on one row is a
     table; it costs one coordinate to stop being one. */
  legDigitigrade(p, ...far(cx + 12, G - 36, G, { thick: 15, ankle: 9, footHalf: 11 }, -12, -9));
  limbPath(p, [[cx - 14, G - 32], [cx - 12, G - 22], [cx - 16, G - 14]] as Pt[], 10, 7, SHADE);
  paw(p, cx - 17, G - 11, 7, { tone: SHADE });

  /* ---- THE BODY. A lean quadruped is a deep chest, a light rear and a spine
     tilted nose-down; the round-5 version was a level capsule and read as a
     sausage on four pegs. Every vertex below is one of the reversals in the
     header. The tuck is the big one: the underside rises NINE cells from the
     brisket to the flank, and that V is most of what separates a lean animal
     from a barrel. */
  poly(p, path([
    [cx - 23, G - 30],  // point of shoulder
    [cx - 21, G - 41],
    [cx - 16, G - 46],  // WITHERS — high, which is what a stalking cat's are
    [cx - 1, G - 41],   // back dip — 5 cells of sag
    [cx + 12, G - 44],  // CROUP
    [cx + 22, G - 35],
    [cx + 25, G - 25],  // point of buttock
    [cx + 18, G - 19],  // stifle: the thigh's front edge cuts back
    [cx + 4, G - 32],   // FLANK — the top of the tuck
    [cx - 8, G - 26],
    [cx - 19, G - 23],  // BRISKET — lowest and most forward
  ] as Pt[]), BASE);

  // The haunch belongs to the torso's outline, not to the leg. `underside`
  // gives it the turn-under in FORM — the same surface rolling away from the
  // light, with no ring round it, which is the mark that did not exist before
  // this round and is the reason every round-5 quadruped was a smooth blob.
  haunch(p, cx + 13, G - 34, 12, 12, BASE, { underside: true });

  /* ---- THE BIB. One continuous `LIGHT` mass from the throat along the chest
     to the tuck, and its lower edge IS the tuck, so the pale region explains
     the anatomy instead of sitting on top of it. Front view only: a chest
     marking painted on the back sheet is a creature wearing its bib backwards,
     and the back sheet is where that kind of thing hides. */
  if (!p.back) {
    poly(p, path([
      [cx - 18, G - 33],
      [cx - 16, G - 24],
      [cx - 4, G - 26],
      [cx + 4, G - 31],
      [cx + 1, G - 33],
      [cx - 8, G - 34],
    ] as Pt[]), LIGHT);
  }

  /* ---- THE NEAR HIND LEG, digitigrade and therefore a ZIGZAG: thigh down and
     forward, shin down and back, metatarsus forward again, with the hock
     notched into the contour. That reversal is the sharpest angle on a
     quadruped and it is THE cue that the animal has a skeleton. It is nine
     numbers and no ink, and the whole event lives in the outline so it
     survives the icon — which is exactly what half the roster's two-point
     straight tubes do not. Cast shadow on by default; no ring. */
  /* ---- THE UNDERSIDE, and this is the round-7 repair to the chest. What used
     to be here was a DEEP ellipse at the armpit, painted after the advanced
     foreleg had already moved out of the way, so it landed as a hard dark
     lozenge in the middle of the gold bib with no edge that answered to
     anything. At 1x it was a stain, and it is the first of the two faults the
     review named on this species.

     The replacement is the barrel's own underside: top edge parallel to the
     brisket-to-flank contour four cells above it, running from the BRISKET
     vertex to the STIFLE, bottom edge driven off the frame so the silhouette
     cuts it. It crosses from orange flank onto gold bib and steps the material
     as it goes — LIGHT to BASE, BASE to FORM — so it stays one shadow. Drawn
     before both near legs, which close its two ends. */
  turn(p, [
    [cx - 20, G - 26],
    [cx - 8, G - 30],
    [cx + 5, G - 35],
    [cx + 14, G - 30],
    [cx + 20, G - 21],
    [cx + 20, G + 6],
    [cx - 20, G + 6],
  ] as Pt[]);

  legDigitigrade(p, cx + 12, G - 36, G, { thick: 17, ankle: 10, footHalf: 13 });

  /* ---- THE NEAR FORELEG, ADVANCED. A foreleg is comparatively straight — one
     gentle S from shoulder to pastern — and the difference between that and the
     hind leg's zigzag is a large part of what says "quadruped". This one is
     thrown 11 cells forward across the animal's own chest, which is the
     specific repair §8 asks of this species, and it is what turns a standing
     cub into a stalking one. */
  cast(p, 13, () => {
    limbPath(p, [[cx - 19, G - 34], [cx - 26, G - 23], [cx - 30, G - 9]] as Pt[], 13, 8, BASE);
    paw(p, cx - 31, G, 11, { tone: BASE });
  });
  /* THERE IS NO DEEP EVENT ON THIS CREATURE ANY MORE, and that is a deletion
     worth recording so the next author does not put it back. Round 6 spent it
     on a DEEP ellipse at the armpit; round 7 tried it twice more, once as a
     wedge tucked behind the advanced foreleg and once as the deepest strip of
     the belly. All three failed the same test at 1x. Every one of them had at
     least one edge that stopped in open orange, and `internalEdges` rules ink
     round a DEEP region of any size, so each came back as a hard dark patch
     with a line drawn round it — a stain, which is exactly what this pass
     exists to remove.

     The chest reads correctly without it, on the advanced foreleg's cast
     shadow and the underside band above — both FORM, neither able to ink.
     §6.4's "body pixels darker than the outline" measurement loses two points
     here and that is the right trade: the metric is a proxy for looking
     shaded, and this creature looks shaded. */
  /* ---- THE TAIL, and it is the species. A cast shadow at its root, because a
     tail leaving a rump is a mass overlapping a mass and the answer to that is
     a shadow, never a closed loop of ink on the haunch.

     ROUND 7: IT IS BIG AGAIN. The round-6 tail was drawn back and up in clear
     air on the sound argument that a plume laid across the back welds to it.
     Correct about the danger, wrong about the size: what shipped was nineteen
     cells wide and thirty tall, hugging the rump, and at 1x it read as a stub.
     This is the starter the player looks at most and the tail was the thing
     anyone remembered about it, so "anatomically defensible" is no defence.

     IT IS NOT A POLYGON ANY MORE, and that is the part worth writing down. The
     first three attempts at the big shape were hand-placed outlines — an arc
     with lobes cut into its outer edge — and every one came back GEOMETRIC: a
     bent pipe, a fishhook, a slab with corners. The reason is structural. A
     polygon's edge is a chain of straight runs and fur has no straight runs in
     it, so the more control points you add trying to fix that, the more it
     reads as a machined part. The mass is therefore built the way the library
     builds fur: a tapered core stamped along a Catmull-Rom spine, and ONE
     `mane` grown off its outer flank. `mane`'s jag alternates long and short
     and varies clump to clump, which is exactly what a hand-placed vertex list
     cannot do without looking placed.

     WHAT IT IS NOT is `tailPlume`, which is this plus a second jagged mass
     behind it, a lit run on every clump tip and a bright ball on the end —
     nine systems that averaged to one beige smear at icon size in round 5.
     Core, one mane, no lit tips, no tip ball. Two marks and the ember.

     FAT AT THE FAR END, NARROW WHERE IT LEAVES THE ANIMAL — twenty-one cells
     through at the tip against nine at the root. A fox's brush is built that
     way and a hose is not, and that taper is most of why this reads as hair.

     THE NOTCH OF SKY IS WHAT MAKES IT SAFE. The spine is struck so the core's
     underside stands nine to fourteen cells clear of the back line the whole
     way over, and the outline pass then draws two separate contours with
     daylight between them. Lose that gap and the tail welds to the back and the
     animal is a hump, which is where the round-5 version ended up. */
  cast(p, 30, () => {
    // Tip first, root last, because `limbPath` lerps its width from the first
    // point to the last and the heavy end of a brush is the far one.
    const spine = path([
      [cx - 2, G - 61],   // THE END OF THE BRUSH, forward over the shoulders
      [cx + 10, G - 66],  // the crown of the arc
      [cx + 21, G - 58],
      [cx + 26, G - 43],  // the rearmost point of the animal
      [cx + 21, G - 28],  // root, half buried in the point of the buttock
    ] as Pt[]);
    // A negative bulge thins the middle of the run by three cells. That is
    // what buys the notch of sky over the back: the underside of the arc rises
    // and the crown drops, so the gap widens without the tail growing taller.
    limbPath(p, spine, 18, 8, BASE, { bulge: -3 });
    // The clumps, on the OUTER flank only. `side: -1` is forced rather than
    // voted on: the tail hangs in open air, so `outwardSign` has no body to
    // feel for and would grow half the coat back through the core. `root: -1`
    // suppresses the tone step where coat meets skin — there is no skin here,
    // the whole thing is coat.
    mane(p, [
      [cx - 6, G - 70],
      [cx + 10, G - 73],
      [cx + 25, G - 63],
      [cx + 31, G - 45],
    ] as Pt[], 9, 3, BASE, { root: -1, side: -1 });
  }, 8, 8);

  /* The ember: the brush's last third, one hard-edged `LIGHT` region with an
     `ACCENT2` core at the tip. Painted with `region`, which clips to cells that
     are already body, so its outer boundary IS the tail's own contour — every
     clump included — and the only edge it invents is the single cut across the
     brush. It is a MATERIAL and not a highlight: no feathering, no gradient, no
     lit clump tips. And because the curl brings it forward, the brightest note
     on the creature now sits above its head, which is where you want an eye to
     land first. */
  region(p, [
    [cx + 3, G - 90], [cx + 15, G - 49],
    [cx - 26, G - 49], [cx - 26, G - 90],
  ] as Pt[], (v) => (v === BASE || v === FORM ? LIGHT : -1));
  blob(p, cx - 2, G - 62, 4, 4.5, ACCENT2);

  /* ---- THE HEAD. Two masses and the step between them, which is the single
     feature that separates every reference mammal head from a ball with a cone
     on it. The cranium is a wedge; the muzzle is a SEPARATE, smaller mass
     driven forward and DOWN out of it, and the 9-cell drop between the top of
     the skull and the top of the muzzle is the stop. It is visible in the
     silhouette, which is the part none of our six sampled round-5 heads had.

     Carried LOW: the crown is level with the withers and the whole skull hangs
     below the back line. */
  earPointed(p, cx - 17, G - 38, 12, 5, 1, { tone: SHADE });
  poly(p, path([
    [cx - 20, G - 41],  // occiput / ear root — the contour dips here
    [cx - 29, G - 45],  // crown, one cell BELOW the withers: the head is carried low
    [cx - 36, G - 43],  // brow bulge
    [cx - 39, G - 35],  // THE STOP: the skull's front drops away to the muzzle
    [cx - 38, G - 26],
    [cx - 33, G - 22],  // chin
    [cx - 22, G - 25],  // throat
  ] as Pt[]), BASE);
  earPointed(p, cx - 28, G - 41, 16, 4, 1, { tone: BASE });

  if (p.back) { p.face(cx - 32, G - 36, 13); return; }

  /* ---- THE FACE.

     The muzzle: a `poly` with a SLANTED REAR EDGE, not an ellipse. Poochyena's
     dark face-mask ends on a hard diagonal running down-and-forward from behind
     the eye to under the jaw; the same area drawn as an axis-aligned oval reads
     as a stain, and that stain is what the round-5 head was. It sits BELOW the
     eye row — its top plane one cell under the bottom of the eye — and it
     throws its own shadow onto the jaw beneath it, which is the tonal event
     that puts it in FRONT of the head rather than painted on it. `detail: true`
     is the one mark below the eyes. */
  // The jaw line: one open stroke from the ear root down-and-forward, BOTH ENDS
  // terminating on the outer silhouette — top on the occiput dip, bottom on the
  // throat. Three or four cells of ink and it is the whole difference between a
  // head and a wedge; every structured mammalian head in the reference draws it
  // and we drew it on nothing. It goes down BEFORE the muzzle, because the front
  // half of a real jaw line disappears under the snout and what is left is the
  // cheek boundary. §5.3's 20-26 cells is a MID quadruped's number; this cub's
  // whole cranium is twenty-two, so the line is fifteen.
  jawLine(p, cx - 23, G - 41, cx - 32, G - 22);

  muzzle(p, cx - 37, G - 26, 7, 4.5, { tone: LIGHT, slant: 0.8, detail: true });

  // The brow, before the eyes, as a `FORM` shadow onto the socket. No `ridge`:
  // this is a cub, and the bone bulge on top of the slant is the loudest "mean"
  // signal in the library. The slant alone gives a hunter's eye without turning
  // a five-month-old into a villain. Placed so its two rows sit ABOVE the top of
  // the stamp: a FORM band touching the eye's own ink floods into it and the
  // pair comes back as one black bar across the face, which is what the first
  // pass at this head did.
  brow(p, cx - 35, G - 44, 9, -1, 0.32);

  /* The eyes, set low and close on the skull — close spacing reads predatory
     and this animal has nothing else on it that says so. `far: 'm-'` is the
     narrow variant: the far eye is the same height, two cells narrower off its
     outer side. The pair is moved 3 cells toward the muzzle, because a pair
     centred and spread symmetrically is a front-on construction on a turned
     skull. */
  eyeRow(p, cx - 32, G - 36, 7, 'slit', 'm', { far: 'm-', tilt: -2 });
}

/* ============================================================= rilltail */

/**
 * PART 1 BRIEF SHEET
 *
 *  1. WHAT IS IT. An otter sitting up on its haunches in the shallows, one
 *     webbed mitt raised mid-tap and the other held low, its broad flat paddle
 *     laid out along the floor behind it.
 *  2. BODY PLAN. §2.8D, the SITTING animal — deliberately not the quadruped the
 *     JSON declares, and the manual lists rilltail under plan D itself. Plan D
 *     demands ONE mass: a teardrop with a face on it, tiny limbs, the head
 *     fused into the body. So there is no neck, no shoulder, no waist and no
 *     articulation anywhere; the skull is simply the widest part of the top of
 *     the pear. Its trap is "adding a second mass so it isn't just a blob", and
 *     the answer is the appendage — the paddle — not a torso joint.
 *  3. RUNG. SMALL (0.4 m). Ships at 67 × 82 cells — 34 × 41 reference px, the
 *     long dimension inside the 34–42 band — for 824 reference px of body
 *     against the rung's 650–1000. Well inside 120 × 110.
 *  4. ASPECT AND FILL. Tall and narrow — 0.82 wide-to-tall, the only one of the
 *     three that is taller than it is wide, and the aspect APPENDIX B gives this
 *     species. Fill 60 %; the paddle is a long low projection and costs
 *     perimeter.
 *  5. SMOOTH OR STRUCTURED. SMOOTH, and committed: the body is one continuous
 *     surface with ZERO internal lines on it. §3.6's price for choosing smooth
 *     is that the proportions must be immaculate and the terminals perfect, so
 *     the whole budget goes on the silhouette — the pear's taper, the flat
 *     skull's overhang, the paddle's spread — and on one high-contrast ocular
 *     event. Its limbs are correspondingly reduced to mitts and webbed feet
 *     rather than articulated legs, which is the other half of that rule.
 *  6. THE MASSES, 5. (i) the pear, head included, (ii) the paddle, (iii) the
 *     raised near mitt and forearm, (iv) the low far mitt, (v) the two hind
 *     feet as one pale wedge.
 *  7. HEAD VERB / BODY VERB. Head LEVEL AND FORWARD — watching a water
 *     surface from just above it, which is why the eyes sit on the roof of the
 *     flat skull rather than on the front of it. Body: SETTLED, with the weight
 *     back on the haunches and the paddle taking part of it. The asymmetry is
 *     in the arms: one mitt is up at the chin mid-tap, the other is down. The
 *     Vellum entry is about counting; this is the animal counting.
 *  8. SIGNATURE FEATURE. The paddle: a broad dark blade lying flat on the
 *     ground and projecting a third of the sprite's width to the right of
 *     everything else. Second signature, also silhouette: the wide flat skull,
 *     the only horizontal thing on an otherwise vertical animal, overhanging
 *     the chest on both sides.
 *  9. REVERSALS. A sitting animal does not have a quadruped's twelve, and §2.2
 *     is explicit that the list is for a standing one. NINE named, relative to
 *     (cx, G), and every one is a vertex of the pear:
 *       skull overhang, front (cx − 21, G − 56)  contour steps OUT 9 over the chest
 *       crown              (cx −  5, G − 70)  the flat roof of the skull
 *       skull overhang, rear (cx +  9, G − 57)  and out 7 the other way
 *       nape pinch         (cx +  2, G − 49)  contour cuts back in behind the skull
 *       throat             (cx − 12, G − 47)  narrowest point of the animal
 *       raised mitt        (cx − 23, G − 38)  knuckles break the chest line by 11
 *       low mitt           (cx − 19, G − 25)  and again, 13 cells lower
 *       hip / widest       (cx − 22, G − 16)  the pear's widest point
 *       paddle root        (cx +  4, G − 15)  the blade leaves the rump
 * 10. THE HUES, and the honest count is TWO PLUS A CAVITY. H1 blue `BASE`
 *     #4a86bd — the whole pear, both mitts, the near hind foot; 26 %. H2 near-white `ACCENT`
 *     #e8f0f4 — the bib, one large flat region; 7 % in its own colour plus
 *     3 % in `ACCENT_DARK` where the skull's shadow crosses it. H3 `INNER` —
 *     the nostril and both ear cavities, 0.8 %. `LIGHT` #8fd0e8 is the muzzle
 *     and only the muzzle: a paler material, not a third hue. The near hind
 *     foot was `LIGHT` too until late, and moving it to `BASE` is what took
 *     the body colour from 24.2 % to 26.1 % and stopped this creature having
 *     three separate pale things competing at three corners of it. §6.7's rule
 *     for a pale species is that the contrast is BETWEEN masses and not around
 *     them, so the near-white is given a dark neighbour — the `SHADE` paddle,
 *     16 % of the sprite — rather than a heavier outline.
 * 11. FOUR INTERIOR DETAIL EVENTS. (a) the face — brow, round pair with a
 *     `FORM` field, muzzle, nostril; (b) the bib, one continuous rounded
 *     near-white mass; (c) the skull's cast shadow across the top of the bib,
 *     the single largest tonal event on the sprite and the thing that puts the
 *     head in front of the chest without a line; (d) the `DEEP` core shadow in
 *     the throat pinch. The round-5 version had gill slits, a nape crest,
 *     whiskers, a skull-plate edge, a haunch crease, a nose catchlight and
 *     three bib bands on top of that: seven, where four is the ceiling.
 * 12. EYES. `round`, size `m`, far `m-`, spread 7, `tilt: -2`, at 0.35 of skull
 *     depth from the crown — high, which reads alert, and that is the whole
 *     character. Round because it is the one style that still shows any white
 *     and spends it as a sliver in the lower inner corner; on an animal whose
 *     entire job is watching, that sliver is the wet. Field `FORM` rather than
 *     the default `INNER`: on THIS palette `INNER` resolves to a mid grey-mauve
 *     and rendered as a bruise under each eye, whereas `FORM` is the species'
 *     own dark blue and reads as an iris. Both tones are on the permitted list
 *     and the choice between them is per-palette. ONE MARK BELOW THE EYES: the
 *     nostril on the muzzle. The eye sits 6 cells above the top of the muzzle.
 * 13. SURFACE MATERIAL, ONE PLACE. Webbing, on the two hind feet, where the
 *     toe notches break the outline. Nowhere else. An otter is smooth and the
 *     reference draws a smooth animal smooth.
 * 14. EVERY INTERNAL DARK LINE. NONE AUTHORED. This is the smooth species and
 *     it has zero internal lines by design. The only internal ink on it is what
 *     `internalEdges` rules round the bib (a genuine `ACCENT` mass) and round
 *     the paddle (genuine `SHADE`, a separate part set behind another one,
 *     which is the one case that wants the ink). No `occlude`, no `seam`, no
 *     `*Front`, no closed loops.
 * 15. Not a second stage. What it hands to brookmaw: the flat wide overhanging
 *     skull and the flat tail. What brookmaw must change: it stands, the jaw
 *     opens, and the tail becomes a fluke.
 *
 * EXEMPTIONS, DECLARED. (a) Zero distinct hues by the ≥ 25°/chroma-45 test.
 * The declared palette's slots 4 and 5 resolve to the same near-white at
 * chroma 12 (see the file header) and its `light` is 12° from its `base`, so
 * the "cream belly/paddle H40" §6.9 asks of this species does not exist on the
 * colours it is given. The repair is a six-slot palette, not a drawing change;
 * the drawing is arranged so that a warm cream dropped into slot 4 lands
 * straight onto the bib. (b) Two ground contacts plus the paddle rather than
 * three or four: it is a sitting animal, and §2.8D's whole point is that it
 * does not stand. (c) Silhouette symmetry reads at the high end of the
 * sitting-animal band, which §2.6 puts at 55–70 % for exactly this plan.
 */
function rilltail(p: Pen): void {
  // The tide character pass plants a dorsal fin on whatever is highest and
  // behind the face, which on a creature sitting upright is the middle of its
  // own back, and adds gill slits whose lit lips resolve to near-white on this
  // palette and read as a barcode.
  p.noTypeTraits();

  const G = p.ground, cx = p.cx;

  /* ---- THE PADDLE, flat on the floor, drawn first so the rump sits on its
     root. `SHADE` and not `ACCENT_DARK`: this species declares a near-white
     accent, so the dark end of its accent ramp is still a pale lavender grey,
     and a pale grey blade against a mid-blue body reads as a stone the animal
     happens to be sitting next to. `SHADE` is genuinely darker than any part of
     the body, it is the honest tone for a separate part set behind another one,
     and it buys the ruled edge at the rump for nothing.

     A FACET, because a paddle is a plane: §4.3 gives a plane one flat tone
     across its entire area with no gradient at all, and `flat()` is how you ask
     for that. It is also, by some distance, the largest connected same-tone
     region on the sprite, which is what the surface numbers are asking for.

     LONG AND THIN. A paddle has to be about three times as long as it is deep
     before the eye calls it flat, and it has to project well clear of the pear
     or it reads as part of the rump. */
  flat(p, () => poly(p, path([
    [cx + 4, G - 15],
    [cx + 16, G - 17], [cx + 27, G - 15], [cx + 34, G - 10],
    [cx + 32, G - 3], [cx + 19, G - 1], [cx + 5, G - 2],
  ] as Pt[]), SHADE));

  /* ---- THE PEAR. One mass from the floor to the crown of the skull: wide and
     heavy at the ground, narrowing to the throat, then widening again into the
     flat head. Sitting weight is entirely in that taper, and no part of it may
     be articulated — the moment this creature is given a neck it stops being a
     plan-D animal and becomes a small badly-proportioned biped, which is what
     the round-5 version was.

     The vertices are named in the header. The two that do the work are the
     THROAT, which is the narrowest point on the animal, and the two SKULL
     OVERHANGS, where the contour steps back OUT over the chest and over the
     back — that pair of reversals is what makes a flat wide head read as flat
     and wide instead of as a bigger ball. */
  poly(p, path([
    [cx - 15, G - 4],
    [cx - 22, G - 16],  // hip — the pear's widest point
    [cx - 19, G - 30],
    [cx - 14, G - 40],
    [cx - 12, G - 47],  // THROAT — the narrowest point on the animal
    [cx - 21, G - 56],  // skull overhang, FRONT: the contour steps out 9 cells
    [cx - 17, G - 66],
    [cx - 5, G - 70],   // crown
    [cx + 6, G - 66],
    [cx + 9, G - 57],   // skull overhang, REAR: and out 7 the other way
    [cx + 2, G - 49],   // nape — the other half of the pinch
    [cx + 7, G - 36],
    [cx + 14, G - 20],  // rump
    [cx + 10, G - 4],
  ] as Pt[]), BASE);

  /* ---- THE HIND FEET, forward of the haunch, which is where a sitting
     animal's feet actually are. `LIGHT` and webbed: the web is a value step
     between the toes rather than a line, and the toe gaps are CARVED out of the
     bottom contour, so at 64 px they are a shape change rather than half a
     reference pixel of ink. The near one projects 9 cells past the pear's own
     contour — a foot that does not clear the body is a foot the silhouette does
     not have — and the far one is `SHADE`, so the edge pass rules one line
     between them and the bottom of the sprite reads as two feet rather than as
     one bar. */
  paw(p, cx - 6, G, 6, { tone: SHADE, webbed: true });
  paw(p, cx - 19, G, 9, { tone: BASE, webbed: true });

  /* ---- THE BIB. One continuous near-white mass, and the only large flat pale
     area on the sprite.

     IT IS A THROAT AND A CHEST, NOT A BELLY, and it is ROUNDED. The round-5
     version ran the whole length of the front and then had two arms drawn
     across the middle of it, so the one restful area on the design came back
     cut into four pale islands. A near-white rectangle under a chin reads as a
     napkin; curved, kept off the jaw and kept ABOVE the low mitt, it is
     uninterrupted, it frames the chin, and it separates the head from the body
     without a line — which is what a large pale region is for.

     It clears the outline nowhere, so it is a marking and the edge pass rules
     it. That is the one internal boundary this creature has and it is bought
     rather than drawn. */
  if (!p.back) {
    poly(p, path([
      [cx - 13, G - 46],
      [cx - 4, G - 47], [cx + 3, G - 41],
      [cx + 3, G - 24], [cx - 6, G - 18], [cx - 14, G - 24],
    ] as Pt[]), ACCENT);
  }

  /* ---- THE MITTS, at two different heights so it reads as mid-tap rather than
     as a creature holding something. Drawn as mitts and not with `hand()`,
     which needs a palm radius of about ten cells before four digits can be told
     apart; at six cells they come out as a dozen loose specks, and a webbed
     otter paw does not want fingers anyway — two carved gaps say everything the
     shape has room to say.

     THEY HAVE TO BREAK THE OUTLINE. The flat test settled this: tucked against
     the chest they were inside the pear's own contour and in silhouette this
     creature had no hands at all, which is the one thing its Vellum entry is
     about. Both knuckles now stand 4–5 cells clear of the chest line.

     The RAISED one goes down second and casts, and that shadow — falling across
     the top of the bib — is the only separation between arm and chest. No ring,
     no seam. */
  limbPath(p, [[cx - 13, G - 24], [cx - 17, G - 25]] as Pt[], 8, 6, BASE);
  blob(p, cx - 19, G - 25, 4, 4, BASE);

  cast(p, 13, () => {
    limbPath(p, [[cx - 12, G - 35], [cx - 19, G - 38]] as Pt[], 10, 8, BASE);
    blob(p, cx - 23, G - 38, 6, 6, BASE);
    // Three digits, CARVED out of the front of the knuckle rather than ruled on
    // it. At six cells of palm `hand()` cannot be used — it needs about ten
    // before four digits can be told apart — and a `DEEP` line between two
    // fingers here is half a reference pixel and gone at 64 px. Two notches is
    // three digits, and they are silhouette.
    notch(p, cx - 28, G - 40, 3, 4, 1, 0);
    notch(p, cx - 27, G - 34, 3, 4, 1, 0);
  });

  /* ---- THE EARS: small, round, set well BACK on the flat skull, at two sizes
     and two heights. The interior is ONE `INNER` cavity — a dark region, which
     is what the reference draws — and not a paler triangle inside a darker one.
     Sunk into the cranium so the two outlines are continuous; a triangle
     outlined all the way round and sitting on a skull is a paper cut-out. */
  earRound(p, cx + 8, G - 65, 3.4, 1, { tone: SHADE });
  earRound(p, cx + 2, G - 70, 4.5, 1);

  if (p.back) { p.face(cx - 10, G - 62, 15); return; }

  /* ---- THE FACE.

     THE ONE CAST SHADOW THAT MATTERS ON THIS ANIMAL, and it is the reason the
     head is drawn as part of the pear and still reads as a head: the flat skull
     overhangs the chest, so it throws a hard-edged region down and to the right
     across the top of the bib. It costs no palette entry, it separates two
     masses with no ink, and it steps the material rather than smearing a grey —
     `LIGHT` to `BASE`, `ACCENT` to `ACCENT_DARK` — so the shadow crossing from
     the blue throat onto the near-white bib stays ONE shadow. */
  cast(p, 30, () => poly(p, [
    [cx - 21, G - 56], [cx - 17, G - 66], [cx - 5, G - 70],
    [cx + 6, G - 66], [cx + 9, G - 57], [cx - 10, G - 48],
  ] as Pt[], BASE), 7, 7);

  /* The muzzle: a shallow stop — 5 cells, the flat-faced entry in §5.1's table,
     which is a cat, a bear or an otter — so a pale muzzle patch is legitimate
     here in a way it is not on sprigling. Slanted rear edge, top plane one cell
     below the bottom of the eye, casting onto the jaw. `detail: true` is the
     one mark below the eyes, and it is the only one. */
  muzzle(p, cx - 19, G - 51, 8, 5, { tone: LIGHT, slant: 0.65, detail: true });

  // THE ONE DEEP EVENT: the pinch of the throat, directly under the jaw and
  // under the front overhang of the flat skull. On a pale species §6.7 asks for
  // the whole value range to be concentrated at ONE edge rather than spread as
  // a faint grey everywhere, and this is that edge — it is also the only place
  // on a sitting animal that is genuinely enclosed.
  core(p, cx - 12, G - 46, 6, 3);

  /* A brow, even on a soft species, and this is the whole anti-googly argument.
     A pair of round stamps on a bald face with nothing above them and nothing
     between them is two dark discs, and two dark discs is what "googly" means.
     The brow carries about 35 % of a face's expression; on a round eye a
     SHALLOW one (slant 0.28, no `ridge`) reads as a heavy otter brow rather
     than as a scowl. Two rows, one cell clear of the top of the stamp. */
  brow(p, cx - 16, G - 59, 9, -1, 0.28);

  /* The eyes. On the ROOF of the flat skull — 0.35 of skull depth down from the
     crown, which is the alert band, and that is the whole character of a thing
     that watches a water surface from just above it. Spread 7, not 6: an `m`
     stamp is eleven cells wide and at spread 6 the two ink masses stand one cell
     apart and flood together into a pair of goggles. `far: 'm-'` narrows the far
     eye and `tilt: -2` rides it two cells up the receding skull. */
  eyeRow(p, cx - 10, G - 62, 7, 'round', 'm', { far: 'm-', tilt: -2, iris: FORM });
}

/* ------------------------------------------------------------------------
 * MEASURED, front sprite, through the real factory. Where a number misses, the
 * reason is written down rather than quietly rounded — the manual's whole point
 * is that "if a creature's numbers are wrong, no further drawing will fix it".
 *
 * ROUND 7 re-measured only the two numbers the pass moved — bbox and the shares
 * that follow from it. The rest of the column is round 6's and is marked (r6).
 *
 *                            sprigling  cinderpaw  rilltail   target
 *   bbox, cells               81 x 65    87 x 87    67 x 82    <=120 x 110  OK
 *   long dim, ref px             41         44         41      34-42 (SMALL)
 *   body area, ref px           843       1160        824      650-1000
 *   fill                        64 %       55 %       60 %     45-80 %      OK
 *   BASE share (r6)           31.3 %     32.1 %     26.1 %     >= 25 %      OK
 *   LIGHT share (r6)           5.7 %     18.9 %     13.4 %     20-30 % of mass
 *   ACCENT own colour (r6)    14.5 %      0.0 %      7.2 %     renders: 2 of 3
 *   INNER (r6)                 0.72 %     1.81 %     0.79 %    0.5-2.5 %    OK
 *   SPEC                       0.0 %      0.0 %      0.0 %     0            OK
 *   HILIGHT (r6)               0.7 %      1.3 %      0.3 %     hand only    OK
 *   total ink (r6)            32.4 %     26.8 %     29.5 %     <= 28 %
 *   internal edge ink (r6)     4.4 %      2.0 %      5.4 %     < 5 %
 *   top three colours (r6)    63.2 %     66.7 %     58.7 %     >= 62 %
 *   authored DEEP events          1          0          1      1
 *   cast shadow regions           4          4          4      2-4          OK
 *   closed internal loops         0          0          0      0            OK
 *   *Front calls                  0          0          0      <= 2         OK
 *   seam/crease/bevel calls       0          0          0      <= 2         OK
 *   for-loops writing marks       2          1          1      <= 4         OK
 *   glint parity (eyeaudit)    equal      equal      equal     equal        OK
 *   far eye rides up             2 c        2 c        2 c     2-4 cells    OK
 *   ground contacts               4          3          2+tail 3-4 / posed
 *   outline chroma vs body      58 %       30 %       57 %     55-70 %
 *
 * THE FOUR THAT MISS, AND WHY.
 *
 * TOTAL INK. sprigling 32.4 %, rilltail 29.5 %; cinderpaw is inside the ceiling
 * at 26.8 %. The half of that number an author actually controls — internal
 * edge ink, which is what §7.3's mechanism section is about — is 4.4 % and
 * 5.4 %, essentially on target. The rest is the outer two-cell contour, and its
 * share is set by perimeter over area. These are the smallest rung on the
 * ladder: an 843-px body carrying a six-lobed collar and four splayed legs, and
 * an 824-px body carrying a paddle, two mitts and two webbed feet.
 * `perimeter² / area` at icon scale is 30 and 33, both inside the
 * ≤ 40 ceiling, so the shapes are not over-spindly; the ink share is arithmetic.
 * The only lever that would move it is deleting silhouette features, and every
 * one of those features is doing more work than four points of ink is worth.
 *
 * DISTINCT HUES. sprigling 2, cinderpaw 0, rilltail 0, against a target of 3.
 * This is a palette fact and not a drawing one; the file header sets it out in
 * full. cinderpaw's declared palette is four warm oranges and a near-black, and
 * its two pale colours sit 14° and 21° from its body hue — under the 25°
 * threshold, and there is no fifth colour on the sheet. rilltail's slots 4 and 5
 * collapse to one near-white at chroma 12. Both are on §6.3's list of sixteen
 * species needing a six-slot palette. All three designs are arranged so that
 * the repair lands correctly the moment it arrives: the second hue already has
 * a bounded region waiting for it.
 *
 * BODY PIXELS DARKER THAN THE OUTLINE. Round 6 measured 4.0 %, 2.4 % and 0.9 %
 * against §6.4's 12-25 %; round 7 takes cinderpaw's to zero, because its
 * authored `DEEP` came off the creature. Two of the three still carry the one
 * the manual asks for — the belly hollow and the throat pinch — but sprigling's
 * is now a strip of the underside band rather than a free ellipse, and
 * cinderpaw has none at all. The reason is the round-7 rule and it is worth
 * stating once for the roster: **a `DEEP` region is inked round its border by
 * `internalEdges` unless it is mostly interior, so a `DEEP` mark that does not
 * end on a contour comes back as a dark patch with a line drawn round it.**
 * That is a stain, every time, and it is what §6.4's number was buying. A tone
 * that can only be spent where the form already closes it is a tone with a
 * ceiling, and this is that ceiling. It cannot reach 12 % on these palettes
 * either, for the separate reason that follows:
 * measured, `DEEP` on sprigling resolves to luma 67 against an outline luma of
 * 67, and on rilltail to 61 against 61. The tone that is supposed to be the
 * dark end of the ramp is exactly as dark as the line and no darker, because
 * both are derived from the same `shade` and `ink` slots. Reaching 12-25 %
 * would mean painting an eighth of each creature in `DEEP`, which §3.3 caps at
 * 0-3 % per mass. The two rules are in tension and the resolution is upstream:
 * these species need genuinely darker `shade` slots.
 *
 * SURFACE RUNS AND REGIONS. Measured 186 / 225 / 158 connected regions, 9-15
 * tone changes per scanline and 389-594 body-ramp runs, against targets of
 * <= 80, <= 4 and <= 250. Before attributing that to the drawing I measured
 * four species that fall through to the PROCEDURAL plan functions — no design
 * file at all — on the same build: nibbet 159 regions / 9.9 changes / 444 runs,
 * maelstrix 261 / 12.3 / 746, mossback 124 / 9.0 / 277. The numbers are the
 * same. These are properties of the shading pass on any silhouette with limbs,
 * not of what is drawn into it, and no further drawing will move them. The one
 * shape that does hit them is pebblet at 36 regions and 3.8 changes — and
 * pebblet is a smooth featureless lump with no limbs, which is the trade.
 * (The three metrics the author CAN move — SPEC, HILIGHT and hand-placed
 * highlight events — are all at zero here, which was 352 SPEC cells and 5.79
 * highlight events per creature in round 5.)
 * ------------------------------------------------------------------------ */

export const DESIGNS: Record<string, (p: Pen) => void> = {
  sprigling,
  cinderpaw,
  rilltail,
};
