/**
 * Eyes, as hand-authored pixel stamps.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS NOT MATHS.
 *
 * An eye on a 128-cell sprite is about seven cells across. `eye()` used to
 * draw one with ellipse and arc equations at a radius of roughly three, and at
 * that size a circle equation does not resolve into a circle: it resolves into
 * an irregular octagon, and into a *different* irregular octagon every time the
 * centre lands on a different sub-cell offset. So the left flank of a ring
 * stepped in at rows the right flank did not, the pupil landed off centre
 * inside it, and the two eyes of one pair -- which sit at different x, and so
 * at different sub-cell offsets -- came out as two different shapes.
 *
 * That is not a tuning problem. The shape is being COMPUTED at a size where it
 * has to be AUTHORED. Every reference sprite's eye is a hand-placed cluster of
 * pixels. So is this one. A stamp is a little picture written out in the
 * source, one character to one mask cell, blitted with no arithmetic between
 * the definition and the mask beyond a single integer translation.
 *
 * ---------------------------------------------------------------------------
 * WHAT WAS WRONG WITH THE LAST SET, MEASURED RATHER THAN FELT
 * ---------------------------------------------------------------------------
 *
 * The player's verdict after five rounds was "the kins eyes look a little
 * derpy". Four studies then measured why, and there were exactly four faults.
 *
 * 1. THE CATCHLIGHTS SPLAYED, AND THAT IS MOST OF WHAT "GOOGLY" MEANS.
 *    `eyeRow` draws the left eye unmirrored and the right eye mirrored. For the
 *    five symmetric styles the SHAPE was unchanged by mirroring -- so the only
 *    thing mirroring actually did was move the catchlight. All forty pairs in
 *    the game had their two highlights splayed to opposite sides while the
 *    renderer lit every sprite from the upper left. Two eyes catching light
 *    from two different directions is precisely what a googly eye looks like.
 *    Fixed here, in `blitEyeStamp`: the catchlight is blitted from the
 *    UNMIRRORED stamp, always, so a pair's two glints sit at the same offset
 *    from their own mass's left edge. See `INVARIANT 2` below.
 *
 * 2. EVERY EYE WAS BUILT LIKE A BABY POKEMON'S: one flat dark mass plus one
 *    white dot. That construction is about 30% of the reference -- Mudkip,
 *    Torchic, Zigzagoon, Skitty, Swablu, Spheal, Wailmer -- and every one of
 *    them is a round-headed baby, and every one ALSO carries a lid line, or a
 *    second shine, or a nose two pixels below the eye. We applied the two-part
 *    version to all forty-eight, including to a standing stone, a moth, a sea
 *    serpent and a crab.
 *
 *    A reference eye is FOUR TO FIVE FLAT PARTS ARRANGED ASYMMETRICALLY. Five
 *    flat regions arranged asymmetrically read as an eye; two flat regions
 *    arranged symmetrically read as a button. That is the entire gap, and it is
 *    not a gap you can close with tone -- see "no rendering", below.
 *
 * 3. EVERY EYE IN THE ROSTER WAS AXIS-ALIGNED, because the old self-test
 *    REQUIRED every style but `angry` to be mirror-symmetric in shape. 18 of 24
 *    reference eyes are tilted; the six that are not are minerals and armour.
 *    That rule is gone. The openings tilt now, and the checker enforces the
 *    parts instead of the symmetry.
 *
 * 4. `hooded` and `sleepy` painted a full-width bar of EYE_DARK across the top
 *    of the mass -- EYE_DARK on EYE_DARK -- and on the five species that put
 *    two of those on a face with a dark band the render was unambiguously a
 *    pair of sunglasses. The reference answer (Numel, Torkoal) is LIT FLESH
 *    above, ONE DARK LINE, and a shallow eye below. That is what they do now.
 *
 * ---------------------------------------------------------------------------
 * ROUND SEVEN: THE FAULT THAT ONLY EXISTS AT 1x
 * ---------------------------------------------------------------------------
 *
 * JUDGE AN EYE AT THE SIZE THE GAME DRAWS IT. Rounds four, five and six were
 * each signed off at 8x to 20x, where the pixel work looked immaculate, and
 * each of them shipped a defect that only appears at real size. The zoomed
 * render is a debugging tool and it lies about the one thing that matters:
 * whether two dark marks a few cells apart stay two marks or fuse into one.
 *
 * Round six's stamps fused. Measured on the render, `round/m` painted an
 * ELEVEN-cell dark mass inside an ELEVEN-cell box, so the drawing ran edge to
 * edge with no face inside it anywhere; at the roster's commonest spread of 7
 * that put two eleven-cell blocks FOUR cells apart on a thirty-four cell skull.
 * Eyes plus gap came to 76% of the head. Thirty of the forty-eight pairs had a
 * gap under 0.7 of their own eye's width. At 12x that is two well-drawn eyes.
 * At 1x it is a pair of sunglasses, and the player only ever sees 1x.
 *
 * Three things were wrong and all three are the same thing:
 *
 *   TOO LARGE. The reference spends about half what we did: roughly six cells
 *   of dark on a thirty-four cell skull, not eleven.
 *
 *   TOO CLOSE. Not because the designs chose badly -- their spreads are the
 *   same ones that worked at nine cells -- but because round six moved every
 *   rung of the size ladder up by two and nothing moved the spreads to match.
 *   Centre-to-centre spacing fell from 1.78 eye-widths to 1.36.
 *
 *   TOO UNIFORMLY DARK. `L`, `p`, `s` and `o` are four different parts and all
 *   four resolve dark, so an opening drawn edge to edge is one solid block with
 *   nothing lighter anywhere near it. In the reference there is always lit face
 *   OUTBOARD of the eye, usually lit face BETWEEN the pair, and very often a
 *   lighter lid along the top.
 *
 * The fix is one number and it is `DARK_SHARE`, below. A stamp's box is its
 * FOOTPRINT; the drawing inside it takes about seven tenths of that and the
 * rest is left blank, which is to say left as lit, correctly shaded face. The
 * blank margin is not padding. It is the gap, it is the lit temple, and
 * INVARIANT 5 exists so that nobody spends it again.
 *
 * `round`, `hooded` and `sleepy` also carry `f` -- two rows of real lit flesh
 * over the lid line -- so the eye has a lighter edge above it as well as
 * outboard of it. That is the reference's answer to "make this read small": a
 * SMALLER dark mass with a LIGHT edge, never a bigger one.
 *
 * ---------------------------------------------------------------------------
 * THE SEVEN PARTS, AND THE CHARACTER THAT DRAWS EACH
 * ---------------------------------------------------------------------------
 *
 *   .   nothing -- leave whatever is underneath alone.
 *
 *   L   THE LID LINE. One cell of ink over the top of the opening, running
 *       past the outer corner and turning down. Present in 16 of 24 reference
 *       eyes and in 0 of our previous 48. It is the single cheapest part and
 *       the one that most reliably turns a blob into an eye.  EYE_DARK.
 *
 *   p   THE PUPIL. The darkest mass. Hangs FROM the lid; see INVARIANT 1.
 *       EYE_DARK.
 *
 *   s   THE FIELD. Iris or sclera: one mid tone, always darker than the lit
 *       face. Resolved from `iris:`, defaulting to INNER, and constrained to a
 *       short list of tones that are dark on every palette in the roster.
 *
 *   g   THE CATCHLIGHT. One cluster, one or two cells, in the quadrant the
 *       light comes from -- which is the UPPER LEFT, on every sprite, always.
 *       Never mirrored. EYE_WHITE.
 *
 *   h   THE BOUNCE. One optional cell, lower right, on the big sizes only.
 *       Skitty's second shine. SPEC -- the lamp tint, not white.
 *
 *   f   THE FLESH LID. The body-toned, correctly-lit skin above the lid line.
 *       Painted with `over()` in LIGHT (or whatever `lid:` says) so it can
 *       never extend the silhouette, and it SHADES WITH THE HEAD -- see the
 *       note on the pipeline below.
 *
 *   c   THE BROW SHELF. One or two rows of FORM directly above the lid line:
 *       the same surface, turned away. It never inks and it never becomes a
 *       division. Form-following rendering, one row.
 *
 *       It must be at least one row THICK and it must sit directly on the lid,
 *       because `settle()` majority-filters generated body tones and would eat
 *       a FORM mark with body on both sides of it. Sitting on EYE_DARK, which
 *       `settle` does not count, is what saves it.
 *
 *       Only `slot` uses it. An earlier draft gave one to `hooded` as well and
 *       on `menhir` the shelf plus the lid plus the mass summed to a single
 *       wide dark band, which is the sunglasses defect by another route.
 *
 *   d   THE BROW. A separate marking above the lid WITH FACE BETWEEN IT AND
 *       THE LID -- that gap is the whole difference between a brow and a
 *       helmet. ACCENT_DARK by default. Painted with `over()`.
 *
 *   o   SOCKET INK. A few cells of ink laid OUTSIDE the mass, at the bottom
 *       and the outer corner. Never a full ring: a closed loop of ink round an
 *       eye is a goggle.
 *
 * Legacy characters `i`, `w`, `a` and `l` still resolve so that no old stamp
 * or old design can throw; `i` is the field, `w`/`a` are the pupil, `l` paints
 * nothing.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO SHADING IN HERE, AND WHY THAT IS NOT LAZINESS
 * ---------------------------------------------------------------------------
 *
 * An eye at this scale has NO VOLUME TO RENDER. Every attempt to put a
 * gradient inside a nine-cell mass produces either a bullseye or mud, and
 * round five found the bullseye. The reference does not shade eyes: it draws
 * them as flat regions with hard boundaries, and nine of the twenty-four
 * reference eyes have exactly ONE tone inside the whole eye. The only soft
 * thing anywhere near a reference eye is the shading of the FLESH around it --
 * which is what `f` and `c` are for, and both of those are painted in
 * SHADEABLE tones and are lit by the pass along with the head.
 *
 * So: no banding, no dither, no gradient in the pupil, no shaded socket. What
 * the reference spends on an eye is not tones. It is PARTS and ASYMMETRY.
 *
 * ---------------------------------------------------------------------------
 * THE PIPELINE FACT THAT WAS WRONG FOR THREE ROUNDS
 * ---------------------------------------------------------------------------
 *
 * This file used to state, twice, that "eyes are blitted after the light has
 * run, so a body-toned lid does not shade with the head". THAT IS FALSE FOR
 * EVERY SPECIES IN THE GAME. The deferred `p.eyes()` path -- the one that runs
 * after `shade()` -- has ZERO callers. All forty-eight designs draw through
 * `eyeRow`/`eyeStamp`, which blit onto the design mask BEFORE the light runs:
 *
 *     designed(pen) -> fitToCell -> shade -> settle -> internalEdges
 *                   -> drawEyes (empty) -> outline -> contactShadow
 *
 * `LIGHT` and `FORM` are both in `SHADEABLE`, so `f` and `c` are lit correctly
 * with the rest of the skull. The flesh lid was deleted on the strength of a
 * false premise and it is back. (If `drawEyes` is ever revived for the legacy
 * body plans, move it ABOVE `shade`.)
 *
 * Two consequences worth knowing:
 *   - `settle()` majority-filters generated body tones, so a ONE-CELL wide
 *     LIGHT or FORM mark surrounded by body will be absorbed. `c` survives
 *     because the lid line beneath it is EYE_DARK, which `settle` does not
 *     count. `f` is always at least two rows deep. Do not thin either.
 *   - `internalEdges` classifies EYE_DARK, EYE_WHITE, OUTLINE, SPEC and INNER
 *     as PART_NONE, so nothing here draws a ring by accident. That is also why
 *     SHADE and DEEP are NOT on the field list: both are PART_RECESS and would
 *     have hard ink ruled round them where the field opens onto the face.
 *
 * ---------------------------------------------------------------------------
 * THE AUTHORING FRAME. Read this before you edit a picture.
 * ---------------------------------------------------------------------------
 *
 * Every stamp is authored as an eye whose NOSE IS OFF TO THE RIGHT and whose
 * TEMPLE IS TO THE LEFT, lit from the UPPER LEFT.
 *
 * That frame was chosen because it is the one that serves both cases:
 *
 *   - A HEAD-ON face. `eyeRow` blits the left eye as authored and mirrors the
 *     right. The right eye then has its nose corner on the left, the left eye
 *     on the right, and the pair converges. `angry`'s brow drops toward the
 *     nose on both sides. Unchanged from before, and it was right.
 *
 *   - A THREE-QUARTER head -- which is what `far:` declares. On a turned head
 *     THE TWO EYES ARE TRANSLATES, NOT MIRRORS: the nose is to one side of
 *     BOTH of them, so both have their inner corner on the same side. So when
 *     `far` (or `turned`) is present, `blitEyeStamp` flips BOTH eyes the same
 *     way, chosen off `farSide`. That single line fixes the six species that
 *     combine `angry` with `far` and currently wear one brow sloping away from
 *     their own nose.
 *
 * And the catchlight is exempt from all of it. It is blitted at its authored
 * column whatever the flip, because the lamp does not turn round when the head
 * does.
 *
 * ---------------------------------------------------------------------------
 * THE INVARIANTS, checked by `checkEyeStamps()`
 * ---------------------------------------------------------------------------
 *
 *  0. RECTANGULAR, ODD WIDTH, ODD HEIGHT. The centre cell is the anchor;
 *     mirroring reverses each row about it, which is exact and leaves the
 *     anchor where it was. Pad with blank rows and columns to move the drawing
 *     around inside its box. Padding is free and it is visible.
 *
 *  1. THE PUPIL IS NEVER ENCLOSED. If a stamp has both `p` and `s`, at least
 *     three `p` cells must be 4-adjacent to an `L`, an `o`, or the outside of
 *     the stamp. A dark mass floating in the middle of a lighter field is a
 *     TARGET. This is the anti-bullseye rule stated as geometry, and it is
 *     what Treecko, Sceptile and Absol do -- their slit pupil runs the full
 *     height of the opening and touches the lid at the top.
 *
 *  1b. AND THE FIELD IS NEVER A RING. On the five animal styles at least one
 *     `s` cell must be 4-adjacent to blank or to the outside, so the field
 *     opens onto the face and cannot close round the pupil. `compound` and
 *     `gem` are exempt: a lens IS a disc inside a rim, and rule 1 is what
 *     keeps it honest there.
 *
 *  2. ONE CATCHLIGHT, AND IT DOES NOT MIRROR. One `g` cluster of at most two
 *     cells, and at most one `h`; `compound` may have three small `g`
 *     clusters, because that is what makes a lens read as a lens; `slot` may
 *     have none at all, and 9 of 24 reference eyes have none -- its absence is
 *     a choice, not an omission. The no-mirror half is enforced in
 *     `blitEyeStamp` and testable: render any pair and both glints sit at the
 *     same offset from their own mass's left edge.
 *
 *  3. THE OPENING IS COVERED. For every column containing part of the opening
 *     (`p`, `s`, `g`, `h`), the topmost such cell must have an `L`, `f`, `c`,
 *     `d` or `o` directly above it. No naked top edge: an eye with an open top
 *     is a hole in the face. Plus at least four contiguous `L` in one row, on
 *     every style that has lids at all -- insects and minerals do not.
 *
 *  4. NOTHING BRIGHT BUT THE CATCHLIGHT. No stamp may name a tone brighter
 *     than the field, anywhere, by any route. The tone tables here, not the
 *     design file, decide what an eye is made of.
 *
 *  5. THE DARK MASS DOES NOT FILL THE BOX. Every column carrying `L`, `p`,
 *     `s`, `o` or `d` must fit inside `DARK_SHARE` of the stamp's width, and
 *     must be centred on the stamp's centre column to within one cell. `f` and
 *     `c` are exempt: they are face, not eye.
 *
 *     This is the sunglasses rule stated as geometry. `eyeRow` fixes the
 *     spacing and this file cannot see it, so the ONLY term this file holds is
 *     the width of the drawing -- and every cell taken off it is a cell added
 *     to the gap between the pair. The centring half is what keeps a mirrored
 *     pair symmetric: an off-centre mass moves twice its offset when the second
 *     eye is flipped. `compound` and `gem` are exempt, because a lens IS its
 *     rim and both are used one to a face or on species with no other feature.
 *
 * ---------------------------------------------------------------------------
 * SIZES ARE AUTHORED, NOT SCALED
 * ---------------------------------------------------------------------------
 *
 * Scaling a stamp resamples it, and resampling an eleven-cell shape
 * reintroduces exactly the rasterisation defect this file exists to remove. So
 * every size is drawn separately, and so is every NARROW variant.
 *
 * A SIZE NAMES THE BOX, NOT THE DRAWING. The box is the footprint the stamp
 * occupies and the anchor sits at its centre; the dark mass inside it is
 * `DARK_SHARE` of that, and the margin left over is the lit face the reference
 * always keeps outboard of an eye and between a pair.
 *
 *   name  box   dark   what it is for
 *   xs     7      5    the far eye of a hard turn; a background eye
 *   s      9      6    predators, armoured heads, anything wanting a small eye
 *   m     11      7    THE DEFAULT ANIMAL
 *   l     13      9    cute species, big-eyed species
 *   xl    15     11    one enormous eye on a cyclops or a mineral
 *   s-     9      4    }  the NARROW variants: same box, same height, two
 *   m-    11      5    }  cells off the drawing. The far eye of a
 *   l-    13      7    }  three-quarter head.
 *
 * Foreshortening is not distance -- a head turned thirty degrees puts both eyes
 * at the same distance and compresses the far one along ONE AXIS ONLY. So a
 * narrow variant keeps the box and the height and takes the two cells out of
 * the picture. `far: 'm-'` against `size: 'm'` is the right way to write a
 * turned head; `far: 's'` still works and means "much further away".
 *
 * On a thirty-four cell skull `m` spends seven cells per eye, which is about a
 * fifth of the head each and leaves a full eye-width of lit face between the
 * pair at the commonest spread. Round six spent eleven and left four. An `m`
 * pair is about 90 of a mean 4594 filled cells, 2% of the sprite.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT2, ACCENT2_DARK, BASE, EYE_DARK, EYE_WHITE, FORM,
  INNER, LIGHT, Mask, OUTLINE, SPEC,
} from './mask.js';

/* ------------------------------------------------------------ the types */

/**
 * The eight shapes.
 *
 * Eye shape is most of what separates one creature's face from another's, so
 * these are meant to be eight obviously different DARK MARKS at the same size,
 * readable with the colour switched off. A stone, an insect, a serpent, a bird
 * and a mammal must not have the same eye, and until this round all five did.
 *
 *   round     lid, pupil hung from it, field low and open, one catchlight.
 *             The friendly default: mammals, babies, anything soft.
 *   slit      a tilted almond driven to a hard point at each end, mostly
 *             pupil, a sliver of field at the nose end. Cats, snakes,
 *             lizards, anything that hunts.
 *   hooded    lit flesh, one dark lid line, a short mass low underneath, and a
 *             FORM shelf between them. Calm, stubborn, ancient. Numel.
 *   compound  a big coloured dome with a hard dark rim and two or three small
 *             bright facets, and NO PUPIL. Insects. Drawing a pupil in a
 *             compound eye is the fastest way to make one look googly.
 *   sleepy    the widest and shallowest: heavy flesh, one lid line, a
 *             letterbox of eye. Placid, or smug.
 *   angry     a brow line above a gap above a slit opening. The brow carries
 *             about 35% of the expression -- more than tilt, more than size,
 *             far more than the catchlight.
 *   slot      a hard horizontal bar of ink under a heavy FORM shelf, and NO
 *             CATCHLIGHT AT ALL. Nosepass, Aron. Minerals, armour, machines.
 *             This is what the mineral group should have been asking for
 *             instead of `hooded`, which is why five of them wore sunglasses.
 *   gem       one big disc of field colour, hard rim, a small pupil pushed off
 *             centre and TOUCHING the rim, one flat facet. Lunatone, Duskull.
 *             For the species with no face at all -- and it wants `l` or `xl`,
 *             because the reason Lunatone works is that its eye is 12% of the
 *             sprite.
 */
export type EyeStyle =
  | 'round' | 'slit' | 'hooded' | 'compound' | 'sleepy' | 'angry' | 'slot' | 'gem';

/**
 * The five authored sizes, and their narrow variants.
 *
 * See the header. `xs` is 7 cells, `s` 9, `m` 11, `l` 13, `xl` 15, plus
 * whatever the style's own proportions add; `s-`, `m-` and `l-` are the same
 * height and two cells narrower, for the far eye of a turned head.
 *
 * A size a style does not author falls back along a ladder rather than
 * throwing, so `gem: 'xs'` gets the smallest gem that exists rather than a
 * crash or a scaled blur.
 */
export type EyeSize = 'xs' | 's' | 'm' | 'l' | 'xl' | 'xs-' | 's-' | 'm-' | 'l-' | 'xl-';

export interface EyeOpts {
  /**
   * The tone of the FIELD -- the iris or sclera, character `s`.
   *
   * The name is historical but it finally means what it says. There is a real
   * field in every stamp now, and it is the one place a creature's own colour
   * reaches its face.
   *
   * CONSTRAINED, and the constraint is a measured guarantee rather than a
   * taste. On a creature with a PUPIL the field may only be `INNER` (the
   * default), `FORM` or `EYE_DARK` -- the three tones that resolve darker than
   * the species' own BASE on every palette in the roster. `compound` and `gem`
   * have no pupil to bury inside a ring and may reach the whole accent family.
   * See `FIELD_OK` for the numbers and for why ACCENT_DARK is not on the list.
   */
  iris?: number;
  /**
   * The tone of the FLESH LID -- character `f`, the skin above the lid line on
   * `hooded` and `sleepy`.
   *
   * LIGHT by default, which is the Numel/Torkoal reading: lit flesh over one
   * dark line over a shallow eye. Pass BASE for a subtler lid where the
   * species has no pale material near the face, or ACCENT for a coloured
   * eyelid. It is painted with `over()` so it can never extend the silhouette,
   * and it is a SHADEABLE tone, so it is lit with the rest of the skull.
   */
  lid?: number;
  /**
   * The tone of the BROW -- character `d`, `angry`'s slanted marking.
   *
   * ACCENT_DARK by default. DEEP or SHADE give a brow that `internalEdges`
   * promotes to hard ink, which is the heavy Poochyena brow and is worth
   * reaching for on a predator. A bright brow is a stripe of war paint, so the
   * bright tones are not on the list.
   */
  brow?: number;
  /** Legacy. There is no sclera character any more. Accepted so that old
   *  designs keep compiling; it paints nothing. */
  sclera?: number;
  /**
   * DEAD. Accepted so that the thirteen designs passing it keep compiling; it
   * now paints exactly the same eye either way.
   *
   * It used to drop the `o` socket ink, and OUTLINE renders within twelve
   * percent of EYE_DARK, so the player could never see the difference on any
   * of those thirteen faces. Worse, the socket is now what BOUNDS THE FIELD
   * along the bottom of a shallow eye, and dropping it left `sprigling` with
   * two warm marks hanging off the underside of its face with no ink under
   * them.
   *
   * If you want an eye set in a dark socket, draw the socket.
   */
  bare?: boolean;
  /** Mirror the stamp about its centre column. Exact, cell for cell -- except
   *  the catchlight, which never mirrors. `eyeRow` sets this for you. */
  mirror?: boolean;
  /**
   * THE HEAD IS TURNED. Both eyes are translates of one stamp rather than
   * mirror twins, because the nose is to one side of both of them.
   *
   * Defaults to true whenever `far` is present, since that is what `far`
   * means. Set it explicitly to `false` on a head-on face that happens to want
   * two different eye sizes, or to `true` on a turned head that does not want
   * a far eye at all.
   */
  turned?: boolean;
  /** Present when the caller is `eyeRow` with a far eye declared. Read here
   *  only to infer `turned`; the size selection itself is `eyeRow`'s job. */
  far?: EyeSize;
  /** Which eye is the far one: -1 for the left, +1 for the right. +1 -- our
   *  house default -- means the head is turned toward the viewer's left, so
   *  the nose is to the left of both eyes. */
  farSide?: -1 | 1;
  /** Legacy. -1 draws the stamp as authored, +1 mirrors it. Every design
   *  written against the old procedural `eye()` passes it. */
  side?: number;
}

/** One authored eye. Built by `stamp`; never construct one by hand. */
export interface EyeStamp {
  readonly rows: readonly string[];
  readonly w: number;
  readonly h: number;
  /** Centre column. Always `(w - 1) / 2`. */
  readonly ax: number;
  /** Centre row. Always `(h - 1) / 2`. */
  readonly ay: number;
  /**
   * The stamp with every catchlight replaced by whatever it is sitting on.
   *
   * The mirrored blit runs off this, and the catchlights are then stamped back
   * at their AUTHORED columns. Without it, mirroring a stamp would leave a
   * hole where the glint used to be and put a white cell where the light is
   * not. See INVARIANT 2.
   */
  readonly base: readonly string[];
  /** Every `g` and `h` cell, at its authored position. */
  readonly glints: readonly { x: number; y: number; ch: string }[];
  /** Filled in by the library table below. */
  style: EyeStyle;
  size: EyeSize;
}

/** Which characters a catchlight may be sitting on, best first. */
const SUBSTRATE = ['p', 's', 'L', 'o'] as const;

function stamp(...rows: string[]): EyeStamp {
  const w = rows.length > 0 ? rows[0]!.length : 0;
  const h = rows.length;
  const at = (x: number, y: number): string =>
    (y >= 0 && y < h && x >= 0 && x < w) ? rows[y]![x]! : '.';

  const glints: { x: number; y: number; ch: string }[] = [];
  const base = rows.map((row, y) => {
    let out = '';
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      if (ch !== 'g' && ch !== 'h') { out += ch; continue; }
      glints.push({ x, y, ch });
      // What is underneath: the commonest solid eye character around it.
      const seen = new Set<string>();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        seen.add(at(x + dx!, y + dy!));
      }
      out += SUBSTRATE.find((c) => seen.has(c)) ?? 'p';
    }
    return out;
  });

  return {
    rows, w, h, ax: (w - 1) / 2, ay: (h - 1) / 2,
    base, glints, style: 'round', size: 'm',
  };
}

/* ----------------------------------------------------------- the stamps */

/*
 * READ THESE AS PICTURES. If you are changing one, change the picture -- do
 * not reach for a formula, that is what went wrong the first time.
 *
 * Every one is authored with the NOSE TO THE RIGHT and the LIGHT FROM THE
 * UPPER LEFT. The opening tilts up toward the outer (left) corner; the lash
 * hooks down past it; the field sits low and toward the nose and opens out into
 * the blank margin so it can never close into a ring; the catchlight is one
 * cluster in the upper left and it never moves.
 *
 * Count the parts before you commit a change. Two parts is a button. Four or
 * five is an eye.
 *
 * AND COUNT THE BLANK COLUMNS. Every picture below leaves two of them on each
 * side (one at `xs`), and those columns are the single most load-bearing thing
 * in the file. They are not padding, they are not slack to be reclaimed by a
 * bigger drawing, and they are not invisible: they are the lit face outboard of
 * the eye and half the gap between the pair. Round six spent them and shipped
 * forty-eight creatures in sunglasses. INVARIANT 5 now refuses to let anyone
 * spend them again -- but the checker only knows what it can count, so:
 *
 *   IF YOU CHANGE A PICTURE, RENDER A SHEET OF SPECIES AT Z=1 AND LOOK AT IT.
 *   Not at Z=12. At Z=1, the size the game draws a creature. Ask the only
 *   question that has ever mattered here: is that a face, or is that a pair of
 *   sunglasses. Zoom in AFTERWARDS, to find out why.
 */

/**
 * ROUND -- the friendly default, and the shape everything else is read
 * against.
 *
 * THE PUPIL AND THE FIELD SPLIT THE OPENING ON A DIAGONAL, and that is the
 * correction two earlier drafts of this file missed.
 *
 *   - A big pupil with a thin crescent of field underneath does not read as an
 *     iris. It reads as an EYE-BAG; on `rilltail` it read as a moustache.
 *   - A pupil on top of a field, split by a horizontal line, reads as a
 *     half-closed lid.
 *
 * What works is the reference's own arrangement: the dark occupies the upper
 * OUTER corner and puts a foot down onto the lower lid, the field occupies the
 * lower INNER corner and opens out into the blank margin, and the boundary
 * between them is a diagonal. That is five flat regions arranged
 * asymmetrically, which is what an eye is; two flat regions arranged
 * symmetrically is what a button is.
 *
 * ROUND ALSO CARRIES TWO ROWS OF `f` -- lit flesh over the lid line, painted
 * with `over()` in a SHADEABLE tone and lit by the pass along with the rest of
 * the skull. That is the brow ridge catching the light, it costs no ink, and it
 * is the "lighter edge along the top" that makes a small dark mass read as an
 * eye instead of a smudge. Do not thin it below two rows: `settle()` majority
 * filters generated body tones and will absorb a one-row LIGHT mark.
 *
 * It also degrades gracefully, which matters because this file cannot measure
 * a species palette. Where the field resolves DARK the whole eye reads as one
 * dark mass -- the Mudkip construction, which is the other thing the reference
 * does. Where it resolves mid, it reads as an iris. There is no palette on
 * which it turns into a smudge.
 *
 * Parts, outside in: a lid arcing over the top and thickening into a lash at
 * the outer (left) end; a pupil hanging FROM that lid and touching the lower
 * lid as well, so it can never float; a field in the lower inner corner; one
 * catchlight tucked under the lid on the light side; a short lower lid of ink.
 *
 * `xs` has no field at all. Seven cells cannot hold four parts and the
 * reference does not try -- under about fourteen cells everything on this
 * sprite gets two tones and no more.
 */
const ROUND: Partial<Record<EyeSize, EyeStamp>> = {
  xs: stamp(
    '.fffff.',
    '.fffff.',
    '.LLLL..',
    '.LgppL.',
    '.Lpppo.',
    '..oLo..',
    '.......',
  ),
  s: stamp(
    '..ffffff.',
    '..ffffff.',
    '..LLLL...',
    '..LgppLL.',
    '..Lpppps.',
    '...Lppss.',
    '...oLLo..',
    '.........',
    '.........',
  ),
  m: stamp(
    '...........',
    '..fffffff..',
    '..fffffff..',
    '..LLLL.....',
    '..LgppLLL..',
    '..Lppppps..',
    '...Lppsss..',
    '...oLLLo...',
    '...........',
    '...........',
    '...........',
  ),
  l: stamp(
    '.............',
    '..fffffffff..',
    '..fffffffff..',
    '..LLLLL......',
    '..LggppLLLL..',
    '..Lppppppps..',
    '..Lpppppsss..',
    '...Lppshss...',
    '....oLLLLo...',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
  xl: stamp(
    '...............',
    '..fffffffffff..',
    '..fffffffffff..',
    '..LLLLLL.......',
    '..LggpppLLLLL..',
    '..Lppppppppps..',
    '..Lpppppppsss..',
    '..Lppppsssss...',
    '...Lppsshss....',
    '....oLLLLLo....',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
  ),
  's-': stamp(
    '...ffff..',
    '...ffff..',
    '...LLLL..',
    '...LgpL..',
    '...Lpps..',
    '....Lps..',
    '....oLo..',
    '.........',
    '.........',
  ),
  'm-': stamp(
    '...........',
    '...fffff...',
    '...fffff...',
    '...LLLL....',
    '...LgpLL...',
    '...Lppps...',
    '....Lpss...',
    '....oLLo...',
    '...........',
    '...........',
    '...........',
  ),
  'l-': stamp(
    '.............',
    '...fffffff...',
    '...fffffff...',
    '...LLLLL.....',
    '...LggppLL...',
    '...Lppppps...',
    '...Lpppsss...',
    '....Lppss....',
    '....oLLLo....',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
};

/**
 * SLIT -- the predator. A flat almond driven to a hard point at each end, and
 * TILTED: the top edge of the opening sits two rows higher at the outer (left)
 * end than at the inner one. That tilt costs nothing, it carries about a
 * quarter of the expression, and until this round every eye on the roster was
 * axis-aligned because the self-test demanded it.
 *
 * Same diagonal split as `round`, driven harder: the dark takes the whole
 * outer point and the field is a wedge at the nose end. One cell of glint on
 * the small sizes -- an eye that shines too much stops looking dangerous.
 */
const SLIT: Partial<Record<EyeSize, EyeStamp>> = {
  xs: stamp(
    '.......',
    '.LLLL..',
    '.LppLL.',
    '.Lgppp.',
    '..oppo.',
    '..oLo..',
    '.......',
  ),
  s: stamp(
    '.........',
    '.........',
    '..LLLL...',
    '..LppLLL.',
    '..Lgppps.',
    '...opsss.',
    '...oLLo..',
    '.........',
    '.........',
  ),
  m: stamp(
    '...........',
    '...........',
    '..LLLLL....',
    '..LppLLLL..',
    '..Lgppppp..',
    '..Lpppsss..',
    '...oLLLo...',
    '...........',
    '...........',
    '...........',
    '...........',
  ),
  l: stamp(
    '.............',
    '.............',
    '..LLLLLL.....',
    '..LppLLLLLL..',
    '..Lggpppppp..',
    '..Lppppppss..',
    '..Lppppssss..',
    '...oLLLLLo...',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
  xl: stamp(
    '...............',
    '...............',
    '..LLLLLLL......',
    '..LpppLLLLLLL..',
    '..Lggpppppppp..',
    '..Lppppppppps..',
    '..Lpppppssss...',
    '..Lppssssss....',
    '...oLLLLLLo....',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
  ),
  's-': stamp(
    '.........',
    '.........',
    '...LLLL..',
    '...LppL..',
    '...Lgps..',
    '....Lps..',
    '....oLo..',
    '.........',
    '.........',
  ),
  'm-': stamp(
    '...........',
    '...........',
    '...LLLL....',
    '...LppLL...',
    '...Lgppp...',
    '...Lppss...',
    '....oLLo...',
    '...........',
    '...........',
    '...........',
    '...........',
  ),
  'l-': stamp(
    '.............',
    '.............',
    '...LLLLL.....',
    '...LppLLLL...',
    '...Lggpppp...',
    '...Lppppss...',
    '...Lppssss...',
    '....oLLLLo...',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
};

/**
 * HOODED -- the reference's heavy lid, done the reference's way.
 *
 * The old one painted a full-width row of EYE_DARK across the top of the mass,
 * which on a face with a dark band renders as a pair of sunglasses. I looked
 * at all five species that do it and it is not subtle. Numel and Torkoal do
 * the opposite: THE LID IS BODY COLOUR AND SHADED, there is exactly one cell
 * of ink where it meets the eye, and the eye itself is a thin shallow thing
 * low underneath.
 *
 * So: three to six rows of `f` -- real flesh, painted with `over()` in a
 * SHADEABLE tone, lit by the pass along with the rest of the skull and costing
 * nothing at all -- one row of `L`, and a two-row opening below it.
 *
 * There is deliberately no `c` shelf here. An earlier draft put one in and on
 * `menhir` the shelf plus the lid line plus the mass added up to one wide dark
 * band across the face, which is the sunglasses again by another route. A
 * mineral that wants a brow shelf wants `slot`.
 */
const HOODED: Partial<Record<EyeSize, EyeStamp>> = {
  xs: stamp(
    '.fffff.',
    'fffffff',
    '.LLLL..',
    '.LgppL.',
    '..ppss.',
    '..oLLo.',
    '.......',
  ),
  s: stamp(
    '..fffff..',
    '.fffffff.',
    'fffffffff',
    '..LLLL...',
    '..LgppLL.',
    '...ppsss.',
    '...oLLLo.',
    '.........',
    '.........',
  ),
  m: stamp(
    '...fffff...',
    '..fffffff..',
    '.fffffffff.',
    'fffffffffff',
    '..LLLLL....',
    '..LgpppLL..',
    '..Lppppss..',
    '...Lppss...',
    '...oLLLo...',
    '...........',
    '...........',
  ),
  l: stamp(
    '....fffff....',
    '..fffffffff..',
    '.fffffffffff.',
    'fffffffffffff',
    'fffffffffffff',
    '..LLLLLL.....',
    '..LggpppLLL..',
    '..Lpppppsss..',
    '...Lppssss...',
    '....oLLLLo...',
    '.............',
    '.............',
    '.............',
  ),
  xl: stamp(
    '.....fffff.....',
    '...fffffffff...',
    '.fffffffffffff.',
    'fffffffffffffff',
    'fffffffffffffff',
    'fffffffffffffff',
    '..LLLLLLL......',
    '..LggppppLLLL..',
    '..Lpppppsssss..',
    '..Lpppssss.....',
    '...oLLLLLLLo...',
    '...............',
    '...............',
    '...............',
    '...............',
  ),
  's-': stamp(
    '...ffff..',
    '..ffffff.',
    '.fffffff.',
    '...LLLL..',
    '...LgpL..',
    '...ppss..',
    '....oLo..',
    '.........',
    '.........',
  ),
  'm-': stamp(
    '...........',
    '...fffff...',
    '..fffffff..',
    '.fffffffff.',
    '...LLLL....',
    '...LgppL...',
    '....ppss...',
    '....oLLo...',
    '...........',
    '...........',
    '...........',
  ),
  'l-': stamp(
    '.............',
    '....fffff....',
    '..fffffffff..',
    '.fffffffffff.',
    '.fffffffffff.',
    '...LLLLL.....',
    '...LggppLL...',
    '....ppppss...',
    '....oLLLLo...',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
};

/**
 * COMPOUND -- Beautifly, Dustox. ONE BIG SOLID COLOURED DOME, A HARD DARK RIM,
 * TWO SMALL BRIGHT FACETS ON THE LIGHT SIDE, AND NO PUPIL.
 *
 * The old one was a black dome, which is a mammal's eye scaled up. What makes
 * an insect lens read as one is that it is huge relative to the head, that it
 * is a COLOUR rather than ink, and that it catches the light in more than one
 * place. So the whole interior is the field tone -- and `compound` is one of
 * the two styles allowed to ask for ACCENT outright, because an insect lens
 * genuinely is a bright material.
 *
 * BOTH FACETS SIT ON THE UPPER LEFT. An earlier draft put the second one low
 * on the far side, which is the splayed-catchlight defect in miniature: two
 * bright marks on opposite sides of one lens read as two eyes.
 *
 * Drawing a pupil in here is the single quickest way to make a compound eye
 * look googly. There is no `p` in any of these and there should not be.
 */
const COMPOUND: Partial<Record<EyeSize, EyeStamp>> = {
  xs: stamp(
    '.LLLLL.',
    'LgssssL',
    'LsssssL',
    'LsssssL',
    'LsssssL',
    '.LLLLL.',
    '.......',
  ),
  s: stamp(
    '..LLLLL..',
    '.LggsssL.',
    'LsssssssL',
    'LssgssssL',
    'LsssssssL',
    'LsssssssL',
    'LsssssssL',
    '.LsssssL.',
    '..LLLLL..',
  ),
  m: stamp(
    '...LLLLL...',
    '.LLsssssLL.',
    'LLggsssssLL',
    'LsssssssssL',
    'LsssssssssL',
    'LsssgsssssL',
    'LsssssssssL',
    'LsssssssssL',
    'LsssssssssL',
    '.LLsssssLL.',
    '..LLLLLLL..',
  ),
  l: stamp(
    '....LLLLL....',
    '..LLsssssLL..',
    '.LggsssssssL.',
    'LsssssssssssL',
    'LsssssssssssL',
    'LsssgsssssssL',
    'LsssssssssssL',
    'LsssssssssssL',
    'LsssssssssssL',
    'LsssssssssssL',
    '.LsssssssssL.',
    '..LLsssssLL..',
    '...LLLLLLL...',
  ),
  xl: stamp(
    '.....LLLLL.....',
    '...LLsssssLL...',
    '..LggsssssssL..',
    '.LsssssssssssL.',
    'LsssssssssssssL',
    'LssssgssssssssL',
    'LsssssssssssssL',
    'LsssssssssssssL',
    'LsssssssssssssL',
    'LsssssssssssssL',
    'LsssssssssssssL',
    '.LsssssssssssL.',
    '..LLsssssssLL..',
    '...LLLLLLLLL...',
    '...............',
  ),
};

/**
 * SLEEPY -- the widest and the shallowest, so it can never be mistaken for a
 * small `hooded`. Heavy lit flesh, one lid line, a letterbox of eye below it.
 * Placid, or smug.
 *
 * Same correction as `hooded`: the fold is drawn as FLESH, not as ink. What
 * used to be here was a bar of EYE_DARK with a slot cut in it, and on five
 * faces that is indistinguishable from sunglasses.
 */
const SLEEPY: Partial<Record<EyeSize, EyeStamp>> = {
  xs: stamp(
    '.fffff.',
    'fffffff',
    '.LLLLL.',
    '.Lgpps.',
    '..ppss.',
    '..oLLo.',
    '.......',
  ),
  s: stamp(
    '..fffff..',
    '.fffffff.',
    'fffffffff',
    '..LLLLLL.',
    '..Lgppps.',
    '...ppsss.',
    '...oLLLo.',
    '.........',
    '.........',
  ),
  m: stamp(
    '...........',
    '.fffffffff.',
    'fffffffffff',
    'fffffffffff',
    '..LLLLLLL..',
    '..Lgpppps..',
    '...pppsss..',
    '...oLLLLo..',
    '...........',
    '...........',
    '...........',
  ),
  l: stamp(
    '.............',
    '.fffffffffff.',
    'fffffffffffff',
    'fffffffffffff',
    'fffffffffffff',
    '..LLLLLLLLL..',
    '..Lggppppps..',
    '...ppppssss..',
    '...oLLLLLLo..',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
  xl: stamp(
    '...............',
    '.fffffffffffff.',
    'fffffffffffffff',
    'fffffffffffffff',
    'fffffffffffffff',
    'fffffffffffffff',
    '..LLLLLLLLLLL..',
    '..Lggppppppps..',
    '...ppppppssss..',
    '...oLLLLLLLLo..',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
  ),
  's-': stamp(
    '...ffff..',
    '..ffffff.',
    '.fffffff.',
    '...LLLL..',
    '...Lgps..',
    '....pps..',
    '....oLo..',
    '.........',
    '.........',
  ),
  'm-': stamp(
    '...........',
    '...fffff...',
    '..fffffff..',
    '.fffffffff.',
    '...LLLLL...',
    '...Lgpps...',
    '....ppss...',
    '....oLLo...',
    '...........',
    '...........',
    '...........',
  ),
  'l-': stamp(
    '.............',
    '....fffff....',
    '..fffffffff..',
    '.fffffffffff.',
    '.fffffffffff.',
    '...LLLLLLL...',
    '...Lggppps...',
    '....pppsss...',
    '....oLLLLo...',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
};

/**
 * ANGRY -- a brow line, A BLANK ROW, and a slit opening under it.
 *
 * That blank row is the whole difference between a brow and a helmet, and the
 * old stamp did not have one: at `m` it had 21 brow cells against 13 eye
 * cells, a filled wedge three rows deep sitting straight on the socket. The
 * reference brow is a LINE OF CONSTANT THICKNESS with face between it and the
 * lid, and it carries about a third of the expression on its own -- Poochyena's
 * eye is four pixels of nothing and the animal is unmistakably hostile. Remove
 * the brow and it is a spaniel.
 *
 * The brow drops toward the NOSE, which is off to the right. On a head-on face
 * `eyeRow` mirrors the second eye and the pair converges into a scowl; on a
 * turned head both eyes are translates and both brows slope the same way,
 * which is what a real skull does and what six of our species -- burrowen,
 * craglide, kestrelle, thornmarch, brookmaw, voltwick -- currently get
 * backwards, every one of them by combining `angry` with `far`.
 */
const ANGRY: Partial<Record<EyeSize, EyeStamp>> = {
  xs: stamp(
    '.dd....',
    '..dd...',
    '...dd..',
    '.......',
    '.LLLL..',
    '.LgppL.',
    '..ppss.',
    '..oLLo.',
    '.......',
    '.......',
    '.......',
  ),
  s: stamp(
    '..ddd....',
    '....ddd..',
    '.........',
    '.........',
    '..LLLL...',
    '..LgppLL.',
    '..Lppsss.',
    '...oLLLo.',
    '.........',
    '.........',
    '.........',
  ),
  m: stamp(
    '..dddd.....',
    '.....dddd..',
    '...........',
    '...........',
    '..LLLLL....',
    '..LgppLLL..',
    '..Lppppps..',
    '...Lppsss..',
    '...oLLLo...',
    '...........',
    '...........',
    '...........',
    '...........',
  ),
  l: stamp(
    '..ddddd......',
    '......ddddd..',
    '.............',
    '.............',
    '..LLLLLL.....',
    '..LggppLLLL..',
    '..Lppppppps..',
    '..Lpppppsss..',
    '...Lppssss...',
    '....oLLLLo...',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
  xl: stamp(
    '..dddddd.......',
    '.......dddddd..',
    '...............',
    '...............',
    '..LLLLLLL......',
    '..LggpppLLLLL..',
    '..Lppppppppps..',
    '..Lpppppppsss..',
    '..Lppppsssss...',
    '...oLLLLLLLo...',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
  ),
  's-': stamp(
    '...dd....',
    '.....dd..',
    '.........',
    '.........',
    '...LLLL..',
    '...LgpL..',
    '...ppss..',
    '....oLo..',
    '.........',
    '.........',
    '.........',
  ),
  'm-': stamp(
    '...ddd.....',
    '.....ddd...',
    '...........',
    '...........',
    '...LLLL....',
    '...LgppL...',
    '...Lppss...',
    '....oLLo...',
    '...........',
    '...........',
    '...........',
    '...........',
    '...........',
  ),
  'l-': stamp(
    '...dddd......',
    '......dddd...',
    '.............',
    '.............',
    '...LLLLL.....',
    '...LggppLL...',
    '...Lppppps...',
    '...Lpppsss...',
    '....oLLLLo...',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
};

/**
 * SLOT -- Nosepass, Aron. A HARD HORIZONTAL BAR OF INK UNDER A HEAVY SHELF,
 * AND NO CATCHLIGHT.
 *
 * Nine of twenty-four reference eyes have no catchlight at all and every one
 * of those absences is a choice: predators, minerals, gems. This is the
 * mineral one. A row or two of `c` -- FORM, the underside of a brow shelf,
 * which shades with the stone and never inks -- one row of lid, then a flat
 * slot two or three rows deep with a hard boundary all round and no gradient
 * anywhere in it. That is how a mineral reads as HARD.
 *
 * It reads as a face only through placement, so it needs the one mark below
 * the eyes that the manual makes mandatory. Give it an enormous nose.
 *
 * This is what menhir, pebblet, gravelet, cairnling, chalkid, chalkmar,
 * anchorling and slatewing should be asking for. They were asking for
 * `hooded`, and `hooded` was drawing them sunglasses.
 */
const SLOT: Partial<Record<EyeSize, EyeStamp>> = {
  xs: stamp(
    '.......',
    '.ccccc.',
    '.LLLLL.',
    '.ppppp.',
    '.ppppp.',
    '.oLLLo.',
    '.......',
  ),
  s: stamp(
    '.........',
    '..cccccc.',
    '..cccccc.',
    '..LLLLLL.',
    '..pppppp.',
    '..pppppp.',
    '..oLLLLo.',
    '.........',
    '.........',
  ),
  m: stamp(
    '...........',
    '..ccccccc..',
    '..ccccccc..',
    '..LLLLLLL..',
    '..ppppppp..',
    '..ppppppp..',
    '..oLLLLLo..',
    '...........',
    '...........',
    '...........',
    '...........',
  ),
  l: stamp(
    '.............',
    '..ccccccccc..',
    '..ccccccccc..',
    '..LLLLLLLLL..',
    '..ppppppppp..',
    '..ppppppppp..',
    '..ppppppppp..',
    '..oLLLLLLLo..',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
  ),
  xl: stamp(
    '...............',
    '..ccccccccccc..',
    '..ccccccccccc..',
    '..ccccccccccc..',
    '..LLLLLLLLLLL..',
    '..ppppppppppp..',
    '..ppppppppppp..',
    '..ppppppppppp..',
    '..oLLLLLLLLLo..',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
    '...............',
  ),
};

/**
 * GEM -- Lunatone, Duskull, Solrock. ONE BIG DISC AND NOTHING ELSE ON THE
 * HEAD.
 *
 * A hard dark rim, a lens of field colour filling it, a pupil pushed into the
 * upper outer quadrant and TOUCHING THE RIM, and one flat facet.
 *
 * Duskull is the only bullseye in the reference generation and it survives for
 * two reasons: the field is about a third of the head, and the pupil is far
 * off centre and against the boundary. Both are load-bearing. If you shrink
 * this below `l`, or centre the pupil, you get a target.
 *
 * For the seven species with no face -- menhir, anchorling, lantric,
 * brinewisp, fizzlet, mossback, chalkid -- the reference answer is ONE
 * ENORMOUS, SIMPLE, HIGH-CONTRAST OCULAR EVENT AND NOTHING ELSE ON THE HEAD.
 * Lunatone's eye is about 12% of its sprite. `lantric`'s is 1.3%.
 */
const GEM: Partial<Record<EyeSize, EyeStamp>> = {
  xs: stamp(
    '.LLLLL.',
    'LpppssL',
    'LppsssL',
    'LsssssL',
    'LssgssL',
    '.LLLLL.',
    '.......',
  ),
  s: stamp(
    '..LLLLL..',
    '.LpppssL.',
    'LgpppsssL',
    'LppppsssL',
    'LsssssssL',
    'LsssssssL',
    'LsssssssL',
    '.LsssssL.',
    '..LLLLL..',
  ),
  m: stamp(
    '...LLLLL...',
    '.LLLssssLL.',
    'LLpppsssssL',
    'LgpppsssssL',
    'LppppsssssL',
    'LsssssssssL',
    'LsssssssssL',
    'LsssssssssL',
    'LsssssssssL',
    '.LLsssssLL.',
    '..LLLLLLL..',
  ),
  l: stamp(
    '....LLLLL....',
    '..LLLLsssLL..',
    '.LLpppsssssL.',
    'LLpppppsssssL',
    'LggppppsssssL',
    'LpppppssssssL',
    'LsssssssssssL',
    'LsssssssssssL',
    'LsssssssssssL',
    'LsssssssssssL',
    '.LsssssssssL.',
    '..LLsssssLL..',
    '...LLLLLLL...',
  ),
  xl: stamp(
    '.....LLLLLL....',
    '...LLLLLsssL...',
    '..LLpppssssLL..',
    '.LLpppppsssssL.',
    'LLpppppppsssssL',
    'LggpppppssssssL',
    'LppppppsssssssL',
    'LsssssssssssssL',
    'LsssssssssssssL',
    'LsssssssssssssL',
    'LsssssssssssssL',
    '.LsssssssssssL.',
    '..LLsssssssLL..',
    '...LLLLLLLLL...',
    '...............',
  ),
};

const LIBRARY: Record<EyeStyle, Partial<Record<EyeSize, EyeStamp>>> = {
  round: ROUND, slit: SLIT, hooded: HOODED, compound: COMPOUND,
  sleepy: SLEEPY, angry: ANGRY, slot: SLOT, gem: GEM,
};

/** Every size name, widest first, for the fallback ladder. */
const LADDER: readonly EyeSize[] = ['xl', 'l', 'm', 's', 'xs'];

/** Styles that have eyelids: everything with an animal head. */
const LIDDED: readonly EyeStyle[] = ['round', 'slit', 'hooded', 'sleepy', 'angry'];
/** Styles whose field is deliberately a closed disc inside a rim. */
const DISC: readonly EyeStyle[] = ['compound', 'gem'];

for (const style of Object.keys(LIBRARY) as EyeStyle[]) {
  for (const size of Object.keys(LIBRARY[style]) as EyeSize[]) {
    const s = LIBRARY[style][size];
    if (s) { s.style = style; s.size = size; }
  }
}

/** The narrow variant of a size: the far eye of a three-quarter head. */
export function narrowOf(size: EyeSize): EyeSize {
  return (size.endsWith('-') ? size : `${size}-`) as EyeSize;
}

/** The plain variant of a size. */
export function wideOf(size: EyeSize): EyeSize {
  return (size.endsWith('-') ? size.slice(0, -1) : size) as EyeSize;
}

/**
 * The authored stamp for a style and size. Read-only; do not mutate it.
 *
 * A style that has not authored a size falls back rather than scaling: first
 * to the plain variant of the same size, then down the ladder, then up it.
 * Nothing in here ever resamples a picture.
 */
export function eyeStampOf(style: EyeStyle, size: EyeSize): EyeStamp {
  const lib = LIBRARY[style] ?? ROUND;
  const exact = lib[size];
  if (exact) return exact;
  const plain = wideOf(size);
  const near = lib[plain];
  if (near) return near;
  const start = Math.max(0, LADDER.indexOf(plain));
  for (let i = start; i < LADDER.length; i++) {
    const s = lib[LADDER[i]!];
    if (s) return s;
  }
  for (let i = start; i >= 0; i--) {
    const s = lib[LADDER[i]!];
    if (s) return s;
  }
  return ROUND.m!;
}

/** How many cells wide a stamp is, for sizing a face anchor or a socket. */
export function eyeWidth(style: EyeStyle, size: EyeSize): number {
  return eyeStampOf(style, size).w;
}

/** How many cells a stamp actually paints. For keeping eyes inside budget. */
export function eyeStampCells(style: EyeStyle, size: EyeSize): number {
  const s = eyeStampOf(style, size);
  let n = 0;
  for (const row of s.rows) for (const ch of row) if (ch !== '.') n++;
  return n;
}

/* ------------------------------------------------------------- the tones */

/**
 * The tones a design may reach the FIELD with, on a creature that has a pupil.
 *
 * THREE, AND THE LIST IS SHORT BECAUSE IT IS A MEASURED GUARANTEE. This file
 * cannot see a species palette -- it paints mask indices and `maskToCanvas`
 * resolves them forty-eight different ways -- so the only way to promise that
 * the field is never brighter than the face is to allow only tones that are
 * darker than BASE on every palette in the roster. Measured across all
 * forty-eight:
 *
 *   INNER     ink, a 30% bleed of the accent and a touch of warmth. The
 *             default. DARKER THAN BASE ON 47 OF 48 SPECIES, by 11 to 148
 *             luma; the exception is `deeplum`, whose base is 69 and which is
 *             nearly black anyway. It is also very close to what a reference
 *             iris actually is: a warm dark with the creature's hue in it.
 *   FORM      the species' own authored dark, which is darker than BASE by
 *             construction. Neutral where INNER is warm.
 *   EYE_DARK  the ink, for an eye meant to read as one solid mark.
 *
 * ACCENT_DARK is NOT here and that is the correction, not an oversight. It is
 * the accent mixed 45% into the ink, and measured it comes out BRIGHTER than
 * BASE on a third of the roster -- 154 against 122 on `rilltail`, 146 against
 * 110 on `brookmaw`. A field brighter than the face, with a dark pupil in it,
 * is the bullseye that round five found, and no amount of good stamp art
 * survives one. ACCENT_LIT, SPEC, LIGHT and HILIGHT are absent for the same
 * reason from further up; SHADE and DEEP are absent because both are
 * PART_RECESS and `internalEdges` would rule hard ink round the field where it
 * opens onto the face, which is a ring by the other route.
 *
 * Forty-seven of the forty-eight designs currently ask for a bright iris. They
 * get INNER, and they are better for it.
 */
const FIELD_OK: readonly number[] = [INNER, FORM, EYE_DARK];

/**
 * `compound` and `gem` may reach the whole accent family.
 *
 * An insect lens and a gem genuinely ARE a bright material; NEITHER HAS A
 * PUPIL TO BURY INSIDE A RING -- `compound` has none at all and `gem`'s is
 * pressed against the rim -- and both are bounded by hard dark ink, which is
 * exactly what makes Beautifly's eye read as a lens rather than as a target.
 * This is the one place the rule above relaxes, and INVARIANT 1 is holding the
 * other end of it.
 */
const LENS_OK: readonly number[] = [...FIELD_OK, ACCENT, ACCENT_DARK, ACCENT2, ACCENT2_DARK];

/**
 * The tones the FLESH LID may be.
 *
 * All of them are SHADEABLE and none of them is PART_RECESS, so a lid is lit
 * with the head and never has a line ruled round it.
 */
const FLESH_OK: readonly number[] = [LIGHT, BASE, ACCENT, ACCENT2, FORM];

/**
 * The tones the BROW may be.
 *
 * ACCENT_DARK by default. DEEP and SHADE are allowed HERE and nowhere else in
 * an eye, because a brow is a separate part above the eye and having
 * `internalEdges` promote it to hard ink is the heavy Poochyena brow, which is
 * the single strongest expression mark available.
 */
const BROW_OK: readonly number[] = [ACCENT_DARK, ACCENT2_DARK, FORM, EYE_DARK, INNER];

/** A requested tone if it is allowed where it is going, else `fallback`. */
function constrained(v: number | undefined, fallback: number, ok: readonly number[]): number {
  return v !== undefined && ok.includes(v) ? v : fallback;
}

/**
 * Which mask tone each character paints, and whether it is laid down with
 * `set` (it is part of the eye) or `over` (it is face, and must never grow the
 * silhouette).
 *
 * THIS FUNCTION, NOT THE DESIGN FILE, DECIDES WHAT AN EYE IS MADE OF. Nine
 * designs used to pass a bright iris and every one of those faces came out
 * wearing a target, so the decision lives here.
 */
function tonesFor(o: EyeOpts, style: EyeStyle): Record<string, { v: number; over: boolean }> {
  const dark = { v: EYE_DARK, over: false };
  const field = {
    v: constrained(o.iris, INNER, DISC.includes(style) ? LENS_OK : FIELD_OK),
    over: false,
  };
  return {
    // The opening.
    L: dark,
    p: dark,
    s: field,
    g: { v: EYE_WHITE, over: false },
    h: { v: SPEC, over: false },
    // Not the eye: the face around it. Painted with `over`, so a stamp placed
    // near the edge of a skull can never sprout flesh into the background.
    f: { v: constrained(o.lid, LIGHT, FLESH_OK), over: true },
    c: { v: FORM, over: true },
    d: { v: constrained(o.brow, ACCENT_DARK, BROW_OK), over: true },
    o: { v: OUTLINE, over: false },
    // Legacy characters, kept resolvable so nothing can throw. `i` was the old
    // bottom-lobe tint and is simply the field now; `w` and `a` were a sclera
    // and a facet sheen and are the pupil, so an old stamp cannot punch a pale
    // hole in an eye; `l` was the lid that never drew and still does not.
    i: field,
    w: dark,
    a: dark,
    l: { v: -1, over: false },
  };
}

/* ------------------------------------------------------------- the blit */

/** Characters that are part of the dark eye mass, for the glint guard. */
const SOLID = 'pLso';

/**
 * Every character that lands on the face as a DARK mark.
 *
 * `L` and `p` are ink, `o` is ink within twelve percent, `s` is the field and
 * `FIELD_OK` guarantees it is darker than BASE on every palette, `d` is the
 * brow in ACCENT_DARK. Those five, added up across the columns, are what the
 * player sees as "the eye" from across the room.
 *
 * `f` is LIGHT and `c` is FORM: both are FACE, lit by the shading pass, and
 * neither is part of the mass. That distinction is the whole of INVARIANT 5.
 */
const DARKPART = 'Lpsod';

/**
 * THE GAP ARITHMETIC. This is the whole of round seven and it is three numbers.
 *
 * `eyeRow` places a pair at `cx ± spread`, so the two eyes sit `2 * spread`
 * cells apart centre to centre and
 *
 *     gap between the two dark masses  =  2 * spread  -  darkWidth
 *
 * The forty-eight designs pass `spread` 5 to 9, and thirty of them pass 7. THIS
 * FILE CANNOT CHANGE THAT NUMBER -- it never sees the pair, only one eye at a
 * time -- so `darkWidth` is the only term it holds, and every cell taken off
 * the drawing is a cell added to the gap.
 *
 * Round six shipped an eleven-cell mass in an eleven-cell box at spread 7: a
 * FOUR-cell gap between two eleven-cell masses, measured on the render. Two
 * dark blocks with four cells between them do not read as two eyes at 1x; they
 * read as one bar, which is what a pair of sunglasses is. Measured over the
 * whole roster, thirty of forty-eight pairs had a gap under 0.7 of their own
 * eye's width.
 *
 * At `DARK_SHARE` the same box carries a seven-cell mass, the gap at spread 7
 * is seven cells -- a full eye-width of lit face between the eyes -- and there
 * are two blank cells on each side of the drawing, which is the lit face
 * OUTBOARD of each eye that the reference always leaves.
 */
const COMMON_SPREAD = 14;
/** The smallest gap that still reads as two eyes rather than one bar. */
const MIN_GAP = 5;
/** How much of its box a stamp's dark mass may take. The rest is face. */
const DARK_SHARE = 0.72;

/**
 * Which way round this eye goes.
 *
 * A HEAD-ON face mirrors the far eye, so the pair converges. A TURNED head
 * does not: the nose is to one side of both eyes, so both are translates of
 * one stamp, flipped together according to which way the head is facing.
 *
 * `far` being present is the declaration that the head is turned -- that is
 * what a design means when it asks for a far eye -- and `turned` overrides it
 * either way.
 */
function flipFor(o: EyeOpts): boolean {
  const turned = o.turned ?? (o.far !== undefined);
  if (turned) return (o.farSide ?? 1) > 0;
  return o.mirror ?? (o.side !== undefined && o.side > 0);
}

/**
 * Blit a stamp onto a mask with its centre cell at (x, y).
 *
 * The whole point of the file is this function's shape: one integer rounding
 * of the incoming position, then a straight copy. There is no arithmetic that
 * could put a cell anywhere other than where it was drawn.
 *
 * TWO PASSES, AND THE SECOND ONE IS THE FIX.
 *
 * Pass one lays down the shape, mirrored or not, off `stamp.base` -- the
 * picture with every catchlight replaced by whatever it was sitting on. Pass
 * two stamps the catchlights back at their AUTHORED columns, unmirrored,
 * always.
 *
 * That is INVARIANT 2 and it is the single highest-value line in the file.
 * Before it, `eyeRow` mirrored the right eye, mirroring mirrored the glint,
 * and all forty pairs in the game had their two highlights splayed to opposite
 * sides while the renderer lit every sprite from the upper left. Two
 * highlights splayed outward is exactly the cue the visual system reads as
 * divergent gaze.
 *
 * Exported because `kinsprite.ts` draws the legacy body plans' eyes straight
 * onto a mask, without a pen.
 */
export function blitEyeStamp(m: Mask, s: EyeStamp, x: number, y: number, o: EyeOpts = {}): void {
  const t = tonesFor(o, s.style);
  const flip = flipFor(o);
  const x0 = Math.round(x) - s.ax;
  const y0 = Math.round(y) - s.ay;

  for (let r = 0; r < s.h; r++) {
    const row = s.base[r]!;
    for (let c = 0; c < s.w; c++) {
      const ch = row[flip ? s.w - 1 - c : c]!;
      if (ch === '.') continue;
      const t2 = t[ch];
      if (t2 === undefined || t2.v < 0) continue;
      if (t2.over) m.over(x0 + c, y0 + r, t2.v);
      else m.set(x0 + c, y0 + r, t2.v);
    }
  }

  // The catchlights, at the column they were drawn at, whichever way the head
  // is turned. Guarded so that a strongly asymmetric stamp -- `angry` is the
  // only one -- can never drop a white cell onto bare face after mirroring: if
  // the authored column is not solid in the flipped shape, use the mirrored
  // column, and if that is not solid either, leave the eye without a glint.
  for (const gl of s.glints) {
    const row = s.base[gl.y]!;
    const solidAt = (c: number): boolean => SOLID.includes(row[flip ? s.w - 1 - c : c] ?? '.');
    const c = solidAt(gl.x) ? gl.x : (solidAt(s.w - 1 - gl.x) ? s.w - 1 - gl.x : -1);
    if (c < 0) continue;
    const t2 = t[gl.ch]!;
    m.set(x0 + c, y0 + gl.y, t2.v);
  }
}

/* -------------------------------------------------------- the self-test */

/** The complete character set. Anything else in a picture is a typo. */
const CHARS = '.oLpsghfcdiwal';

/**
 * Every invariant the stamps are supposed to hold, checked by reading them.
 *
 * Returns a list of complaints; empty means the library is clean. Nothing in
 * the game calls this -- it is for the render harness, so that a typo in a
 * picture is caught by a script rather than by a player noticing that one
 * creature's left eye is a cell wider than its right.
 *
 * The checks are the four invariants from the header, and they were chosen so
 * that the two failures this library has actually shipped -- a bullseye, and a
 * pair of sunglasses -- are impossible to author by accident.
 */
export function checkEyeStamps(): string[] {
  const bad: string[] = [];

  for (const style of Object.keys(LIBRARY) as EyeStyle[]) {
    for (const size of Object.keys(LIBRARY[style]) as EyeSize[]) {
      const s = LIBRARY[style][size];
      if (!s) continue;
      const at = `${style}/${size}`;
      const ch = (x: number, y: number): string =>
        (y >= 0 && y < s.h && x >= 0 && x < s.w) ? s.rows[y]![x]! : '.';

      /* 0 -- the box */
      if (s.w % 2 === 0) bad.push(`${at}: width ${s.w} is even, so it has no centre column`);
      if (s.h % 2 === 0) bad.push(`${at}: height ${s.h} is even, so it has no centre row`);
      s.rows.forEach((row, r) => {
        if (row.length !== s.w) bad.push(`${at}: row ${r} is ${row.length} cells, expected ${s.w}`);
        for (const c of row) {
          if (!CHARS.includes(c)) bad.push(`${at}: row ${r} has unknown character '${c}'`);
        }
      });
      if (size.endsWith('-')) {
        const wide = LIBRARY[style][wideOf(size)];
        if (wide && wide.h !== s.h) {
          bad.push(`${at}: a narrow variant is the same HEIGHT and two cells narrower -- foreshortening compresses one axis, it does not shrink the eye. Got ${s.w}x${s.h} against ${wide.w}x${wide.h}`);
        }
      }

      /* 1 -- the pupil is never enclosed */
      const hasP = s.rows.some((r) => r.includes('p'));
      const hasS = s.rows.some((r) => r.includes('s'));
      if (hasP && hasS) {
        let open = 0;
        for (let y = 0; y < s.h; y++) {
          for (let x = 0; x < s.w; x++) {
            if (ch(x, y) !== 'p') continue;
            const n = [ch(x + 1, y), ch(x - 1, y), ch(x, y + 1), ch(x, y - 1)];
            if (n.some((c) => c === 'L' || c === 'o') || x === 0 || y === 0 || x === s.w - 1 || y === s.h - 1) open++;
          }
        }
        if (open < 3) {
          bad.push(`${at}: only ${open} pupil cells touch a lid, a socket or the edge of the stamp -- a dark mass floating in a lighter field is a TARGET, not an eye. Hang the pupil from the lid.`);
        }
      }

      /* 1b -- the field is never a ring */
      if (hasS && !DISC.includes(style)) {
        let open = 0;
        for (let y = 0; y < s.h; y++) {
          for (let x = 0; x < s.w; x++) {
            if (ch(x, y) !== 's') continue;
            const n = [ch(x + 1, y), ch(x - 1, y), ch(x, y + 1), ch(x, y - 1)];
            if (n.some((c) => c === '.') || x === 0 || y === 0 || x === s.w - 1 || y === s.h - 1) open++;
          }
        }
        if (open < 1) {
          bad.push(`${at}: the field does not reach blank or the edge of the stamp anywhere, so it can close round the pupil. Run it off the box.`);
        }
      }

      /* 2 -- one catchlight, and the right number of them */
      const lights = clusters(s, 'g');
      const cap = style === 'compound' ? 3 : style === 'slot' ? 0 : 1;
      if (lights.length > cap) {
        bad.push(`${at}: ${lights.length} catchlights, and ${cap} is the cap -- a second bright zone in an eye reads as a target`);
      }
      for (const n of lights) {
        if (n > 2) bad.push(`${at}: a catchlight of ${n} cells -- two is the cap, past that it stops being a glint and starts being a sclera`);
      }
      const bounce = clusters(s, 'h');
      if (bounce.length > 1 || bounce.some((n) => n > 1)) {
        bad.push(`${at}: the bounce is ONE cell, lower right, and only on the big sizes`);
      }

      /* 3 -- the opening is covered, and lidded styles have a lid */
      for (let x = 0; x < s.w; x++) {
        for (let y = 0; y < s.h; y++) {
          const c = ch(x, y);
          if (c !== 'p' && c !== 's' && c !== 'g' && c !== 'h') continue;
          const up = ch(x, y - 1);
          if (!'Lfcdo'.includes(up)) {
            bad.push(`${at}: column ${x} opens at row ${y} with '${up}' above it -- every column of the opening needs a lid, a brow, a shelf or a socket over it, or the eye is a hole in the face`);
          }
          break;
        }
      }
      if (LIDDED.includes(style)) {
        let best = 0;
        for (const row of s.rows) {
          let run = 0;
          for (const c of row) { run = c === 'L' ? run + 1 : 0; if (run > best) best = run; }
        }
        if (best < 4) {
          bad.push(`${at}: longest lid run is ${best} cells -- an animal eye carries a lid line, and 16 of 24 reference eyes have one`);
        }
      }

      /* 5 -- THE INK BUDGET, AND THE GAP IT BUYS */
      if (!DISC.includes(style)) {
        let lo = s.w, hi = -1;
        for (let y = 0; y < s.h; y++) {
          for (let x = 0; x < s.w; x++) {
            if (!DARKPART.includes(ch(x, y))) continue;
            if (x < lo) lo = x;
            if (x > hi) hi = x;
          }
        }
        if (hi >= lo) {
          const dark = hi - lo + 1;
          const cap = Math.round(s.w * DARK_SHARE);
          if (dark > cap) {
            bad.push(`${at}: the dark mass is ${dark} cells wide in a ${s.w}-cell box, and ${cap} is the cap. The roster's commonest spread puts a pair ${COMMON_SPREAD} cells centre to centre, so this leaves ${COMMON_SPREAD - dark} cells of face between the eyes; under ${MIN_GAP} they merge into one bar at real size. Take the width off the DRAWING, not out of the margin.`);
          }
          const mid = (lo + hi) / 2;
          if (Math.abs(mid - s.ax) > 1) {
            bad.push(`${at}: the dark mass is centred on column ${mid} of a box whose centre is ${s.ax}. Mirroring reverses about the centre column, so an off-centre mass moves ${Math.round(Math.abs(mid - s.ax) * 2)} cells when the pair's second eye is flipped.`);
          }
        }
      }

      /* 4 -- nothing bright but the catchlight, and it sits on something */
      for (const gl of s.glints) {
        const around = [
          ch(gl.x + 1, gl.y), ch(gl.x - 1, gl.y), ch(gl.x, gl.y + 1), ch(gl.x, gl.y - 1),
        ];
        if (!around.some((c) => SOLID.includes(c))) {
          bad.push(`${at}: the catchlight at ${gl.x},${gl.y} has nothing solid beside it -- a glint has to sit INSIDE the eye, or mirroring drops a white cell onto bare face`);
        }
      }
      // No flesh, shelf or brow may appear below the lid line in a column that
      // has an opening in it. That is the old `hooded` bug exactly: a
      // body-toned bar laid across the middle of a dark mass, which on
      // sprigling punched a pale slot straight through the socket.
      for (let x = 0; x < s.w; x++) {
        let seenOpening = false;
        for (let y = 0; y < s.h; y++) {
          const c = ch(x, y);
          if ('psgh'.includes(c)) seenOpening = true;
          else if (seenOpening && 'fcd'.includes(c)) {
            bad.push(`${at}: '${c}' at ${x},${y} is below the opening -- flesh, shelf and brow live ABOVE the lid line, never across the eye`);
          }
        }
      }
    }
  }
  return bad;
}

/**
 * The size of every connected run of a character in a stamp, four-way.
 *
 * Two glint cells side by side are one catchlight seen at seven cells across.
 * Two glint cells with a dark cell between them are two catchlights, and two
 * catchlights in one eye is the beginning of a pattern.
 */
function clusters(s: EyeStamp, want: string): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  const at = (x: number, y: number): boolean =>
    y >= 0 && y < s.h && x >= 0 && x < s.w && s.rows[y]![x] === want;
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      if (!at(x, y) || seen.has(y * s.w + x)) continue;
      let n = 0;
      const queue = [[x, y] as [number, number]];
      seen.add(y * s.w + x);
      while (queue.length > 0) {
        const [cx, cy] = queue.pop()!;
        n++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const nx = cx + dx, ny = cy + dy;
          if (!at(nx, ny) || seen.has(ny * s.w + nx)) continue;
          seen.add(ny * s.w + nx);
          queue.push([nx, ny]);
        }
      }
      out.push(n);
    }
  }
  return out;
}

/**
 * Where the catchlight lands, measured from the left edge of the stamp, for a
 * given flip. THE TWO NUMBERS FOR A PAIR MUST BE EQUAL.
 *
 * The harness test for INVARIANT 2: before this rebuild, forty of forty pairs
 * in the game returned mirrored values here.
 */
export function eyeGlintColumn(style: EyeStyle, size: EyeSize, flip: boolean): number {
  const s = eyeStampOf(style, size);
  const gl = s.glints.find((q) => q.ch === 'g');
  if (!gl) return -1;
  const row = s.base[gl.y]!;
  const solidAt = (c: number): boolean => SOLID.includes(row[flip ? s.w - 1 - c : c] ?? '.');
  return solidAt(gl.x) ? gl.x : (solidAt(s.w - 1 - gl.x) ? s.w - 1 - gl.x : -1);
}
