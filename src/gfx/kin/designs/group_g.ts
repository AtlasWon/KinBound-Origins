/**
 * Design group G -- the beasts.
 *
 * Six species, three evolution lines, and the whole problem with the group is
 * that four of them are furry quadrupeds. So each line is built around a
 * different *posture* first and a different signature second, and the two
 * halves of a line are related by the feature, never by the pose:
 *
 *   nibbet      a mouse sitting up on its haunches with its forepaws tucked
 *               under its chin, two spoon ears taller than its own head, and a
 *               ring-marked tail hooking away along the floor.
 *   burrowen    the same rodent grown broad and dropped onto all fours: a long
 *               low wedge with a humped shoulder, a snout driven out past it,
 *               and one three-clawed shovel paw planted in front. The ears
 *               shrank to folded discs; the ringed tail and the buck teeth
 *               came through unchanged.
 *   tuftail     a small grazer buried to the jaw in a woolly collar, one hoof
 *               lifted mid-step, a fan of a tail cocked up over the rump.
 *   bristlebuck the same animal grown tall and square: long legs, high
 *               shoulders, the collar hardened into a mantle of stiff green
 *               bristles on the withers, and two short horns rising back off
 *               the crown.
 *   frostnip    a fox kit in a play bow -- chest on the floor, rump in the air,
 *               brush tail up -- with a fan of icicles growing off its cheek.
 *   rimehound   the grown hound at full stride, legs stretched fore and aft,
 *               head thrust low and forward, a ridge of frost spikes down its
 *               neck and its breath clouding off the muzzle.
 *
 * Sitting, low wedge, compact collar, tall square, diagonal crouch, stretched
 * run. That is six silhouettes before a single detail is drawn, which is the
 * only way six beasts avoid being one beast six times.
 *
 * ONE THING WORTH KNOWING BEFORE YOU DRAW A BEAST. The stock type character
 * pass has no case for `beast`, so beasts fall through to its default: guard
 * hairs along the shaded contours -- which is lovely -- and a four-limb ruff
 * grown off the highest point of the top contour a little way behind the face.
 * That ruff is eight cells tall and a dozen wide once the unit pen has doubled
 * it, and on a head drawn in profile the highest point behind the face is the
 * tip of an ear, a horn, or a shoulder hump. All four of the beasts here came
 * back from it wearing a pale plank, and all four opt out. If you keep it,
 * render the species and check what it grew off.
 */

import {
  ACCENT, ACCENT_DARK, ACCENT_LIT, BASE, DEEP, HILIGHT, INNER, LIGHT, SHADE, SPEC,
} from '../mask.js';
import {
  arc, bellyPlate, blob, blobFront, brow, cell, cellOver, claw, crease, earPointed, earRound,
  eye, legDigitigrade, legPlantigrade, limbPath, mane, muzzle, normalAt,
  path, paw, poly, polyFront, rings, spineRow, stroke, tailPlume, tuft, whiskers,
  type Pen, type Pt,
} from '../parts.js';

/* ------------------------------------------------------------- shared */

/**
 * A cloven hoof: a dark wedge with a lit top lip and a split up the middle.
 *
 * `paw` builds a toed pad, which is right for a rodent and wrong for anything
 * that grazes -- and the difference between a hoof and a paw is most of what
 * separates the two families in this file at icon size.
 */
function hoof(p: Pen, x: number, y: number, half: number, tone: number, keratin = ACCENT, lit = ACCENT_LIT): void {
  const h = Math.max(2.5, half);
  poly(p, [[x - h, y - 7], [x + h, y - 7], [x + h * 0.9, y + 1], [x - h * 0.9, y + 1]], keratin);
  stroke(p, x - h, y - 7, x + h, y - 7, tone === SHADE ? keratin : lit);
  stroke(p, x, y - 6, x, y + 1, DEEP);
  stroke(p, x - h * 0.9, y + 1, x + h * 0.9, y + 1, DEEP);
  cellOver(p, x - h * 0.6, y - 5, lit);
}

/**
 * A rodent's ear: a spoon, not a cone.
 *
 * Built as a polygon rather than as a tapered limb, because a limb drawn along
 * a curve comes back with a round cap on each end and reads as a sausage
 * standing on the skull -- which is exactly what the first pass at these was.
 * A spoon is narrow at the root, widest two thirds of the way up, and flat
 * across the top, and none of those three things survive a `limbPath`.
 */
function spoonEar(p: Pen, x: number, y: number, len: number, lean: number, wide: number, tone: number, inner: number): void {
  const t = (f: number): number => x + lean * f;
  const shell: Pt[] = [
    [x - 3.5, y + 2], [x - wide * 0.86, y - len * 0.36], [t(0.6) - wide, y - len * 0.74],
    [t(0.9) - wide * 0.5, y - len], [t(1) + wide * 0.5, y - len * 0.94],
    [t(0.7) + wide * 0.92, y - len * 0.6], [x + wide * 0.8, y - len * 0.2], [x + 3.5, y + 2],
  ];
  polyFront(p, shell, tone, DEEP, 1.5);
  // The bowl stays well inside the shell. Filled to the rim -- which is what
  // it looks like it should be on paper -- an ear this size stops being an ear
  // and becomes a hole punched through the skull.
  const bowl: Pt[] = [
    [x - 0.5, y - len * 0.14], [x - wide * 0.4, y - len * 0.4], [t(0.6) - wide * 0.44, y - len * 0.68],
    [t(0.85) - wide * 0.14, y - len * 0.8], [t(0.85) + wide * 0.3, y - len * 0.74],
    [t(0.6) + wide * 0.52, y - len * 0.5], [x + wide * 0.46, y - len * 0.2],
  ];
  poly(p, bowl, inner);
  // A lit rim down the leading edge, so the shell reads as a wall around the
  // bowl rather than as a ring painted on a paddle.
  stroke(p, x - 3, y, x - wide * 0.86, y - len * 0.36, HILIGHT);
  stroke(p, x - wide * 0.86, y - len * 0.36, t(0.6) - wide, y - len * 0.74, HILIGHT);
}

/**
 * One icicle: a flat-sided spike with a lit leading facet and a dark trailing
 * one. Ice is convincing because of its flats, so this is a triangle with two
 * hard edges rather than a cone.
 *
 * Its root is deliberately wide. A spike four cells across at the base is two
 * cells across for most of its length, and after the ink pass that is a wire.
 */
function icicle(p: Pen, x: number, y: number, len: number, ang: number, wide: number, body = LIGHT): void {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const a: Pt = [x + nx * wide, y + ny * wide];
  const b: Pt = [x - nx * wide, y - ny * wide];
  const t: Pt = [x + ux * len, y + uy * len];
  poly(p, [a, b, t], body);
  stroke(p, a[0], a[1], t[0], t[1], SPEC);
  stroke(p, b[0], b[1], t[0] - ux, t[1] - uy, ACCENT);
  stroke(p, x, y, t[0] - ux * 2, t[1] - uy * 2, ACCENT_LIT);
  cell(p, t[0], t[1], SPEC);
}

/* =============================================================== nibbet */

/**
 * "Small round rodent, long ears, ring-marked tail."
 *
 * A pantry thief caught in the act: sat up on its haunches with both forepaws
 * tucked under its chin and its ears at full height. Everything about it is
 * vertical, because the animal it evolves into is horizontal and the pair has
 * to read as two shapes rather than as two sizes.
 *
 * The ears are the whole silhouette. Together they are taller than the head,
 * they are drawn as polygons rather than as tapered limbs -- see `spoonEar` --
 * and they are set well apart, because a pair leaning into each other reads as
 * one lump with a notch in it and the far eye ends up under the near ear's own
 * seam.
 */
function nibbet(p: Pen): void {
  const G = p.ground, cx = p.cx;
  /* The stock beast character pass grows a ruff of guard hairs off the highest
     point of the top contour a little way behind the face. On a head drawn in
     profile that point is the top of an ear, and the mouse came out with a
     pale plank standing on its own ear. Every beast in this file opts out for
     the same reason and grows its own fur instead. */
  p.noTypeTraits();
  const bodyX = cx + 6, bodyY = G - 32;
  const headX = cx - 18, headY = G - 64;

  /* --- the tail. Down first: the haunch sits on its root.

     It is deliberately thin, and it is deliberately *low*. A tail as thick as
     a leg reads as a fifth limb; a tail thrown up beside the head competes
     with the ears, and the ears have to win, because a long ear is a rodent
     and a long tail is a lizard. So it comes out of the rump at floor level,
     runs away to the right and hooks up at the very end. */
  const tailPts: Pt[] = [
    [bodyX + 6, G - 30], [bodyX + 24, G - 20], [bodyX + 39, G - 24], [bodyX + 43, G - 37],
  ];
  limbPath(p, tailPts, 12, 5, BASE, { lit: HILIGHT, dark: DEEP });
  // The rings, three cells of dark each, in the *fixed* dark accent rather
  // than in plain accent: a marking painted in a material gets run through the
  // banding pass with the surface under it, and a ring that lightens on the
  // lit side of a tail is a ring nobody can see.
  const td = path(tailPts);
  for (const t of [0.16, 0.4, 0.64, 0.86]) {
    const i = Math.round(t * (td.length - 1));
    const q = td[i]!, n = normalAt(td, i);
    const hw = 8 - t * 2;
    for (const k of [-1, 0, 1]) {
      stroke(p, q[0] - n[0] * hw + k * n[1], q[1] - n[1] * hw - k * n[0],
        q[0] + n[0] * hw + k * n[1], q[1] + n[1] * hw - k * n[0], ACCENT_DARK);
    }
    stroke(p, q[0] - n[0] * hw + 2 * n[1], q[1] - n[1] * hw - 2 * n[0],
      q[0] + n[0] * hw + 2 * n[1], q[1] + n[1] * hw - 2 * n[0], LIGHT);
  }

  /* --- far hind foot, then the body ball. */
  paw(p, cx + 8, G - 1, 8, { tone: SHADE, toes: 3, long: true, claws: true });

  blob(p, bodyX, bodyY, 22, 21, BASE);
  blobFront(p, bodyX + 7, bodyY + 12, 16, 14, BASE);
  bellyPlate(p, bodyX - 12, bodyY + 8, 12, 12, 2);

  /* --- near hind leg. A sitting rodent's foot is long, flat and planted well
     forward of the body, and it is the only thing stopping the ball floating.
     The haunch gets its own mass and its own crease over the top of the thigh,
     or the leg reads as a stump pushed into a balloon. */
  blobFront(p, bodyX - 13, bodyY + 13, 14, 13, BASE);
  for (const q of arc(bodyX - 13, bodyY + 13, 11, 10, Math.PI * 1.05, Math.PI * 2.15, 18)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0] - 1, q[1], LIGHT);
  }
  limbPath(p, [[bodyX - 15, bodyY + 19], [bodyX - 25, G - 10]], 13, 10, BASE, { front: true });
  paw(p, cx - 22, G - 1, 9, { tone: BASE, toes: 3, long: true, claws: true });

  /* --- far ear, behind the skull. Smaller and darker: most of the head turn
     is carried by the pair being different sizes. */
  spoonEar(p, headX + 15, headY - 7, 25, 7, 10.5, SHADE, SHADE);

  /* --- the head. Big: on a small animal the skull is most of the front half,
     and a head drawn to scale with the body reads as a rat. No neck either --
     a mouse is a ball with a bigger ball on it, and any gap between the two
     makes it a squirrel. */
  blobFront(p, headX, headY, 18, 15.5, BASE);
  blob(p, headX - 8, headY + 9, 9, 5.5, LIGHT);

  /* --- near ear, over the skull.

     Narrow at the root and wide at the top, because a rodent's ear is a spoon
     and a spoon is the one shape that cannot be mistaken for a horn. The
     cavity stays small: filled to the rim -- which is what the first pass did
     -- it stops being an ear and becomes a hole punched in the skull. On the
     rear view it is gated to a body tone, since two dark hollows on a blank
     face read as eyes. */
  spoonEar(p, headX - 3, headY - 11, 31, -6, 12, BASE, p.back ? SHADE : INNER);

  /* --- forearms, held in tight under the chin. Short: a rodent's are, and a
     long one turns the animal into a squirrel begging. */
  limbPath(p, [[headX + 20, headY + 24], [headX + 10, headY + 23], [headX + 3, headY + 25]], 9, 6, SHADE);
  blob(p, headX, headY + 26, 5, 4.5, SHADE);
  limbPath(p, [[headX + 18, headY + 28], [headX + 7, headY + 28], [headX, headY + 24]], 9.5, 6.5, BASE, { front: true });
  blob(p, headX - 3, headY + 24, 5.5, 5, LIGHT);
  for (let i = 0; i < 3; i++) stroke(p, headX - 7, headY + 22 + i * 2, headX - 1, headY + 22 + i * 2, DEEP);

  /* --- the snout. Short, pointed and dropped, with the incisors under it. */
  muzzle(p, headX - 15, headY + 7, 8.5, 6, { dir: -1, tone: LIGHT, detail: !p.back, frown: -1 });
  blob(p, headX - 22, headY + 3, 3.6, 2.8, ACCENT);
  cell(p, headX - 24, headY + 1, SPEC);
  if (!p.back) {
    // Two incisors. Three cells each and they are half of what says "rodent".
    for (const fx of [headX - 16, headX - 13]) {
      for (let k = 0; k < 3; k++) { cell(p, fx, headY + 12 + k, ACCENT_LIT); }
      cell(p, fx + 1, headY + 12, INNER);
    }
    // Two whiskers, short, and rooted at the very tip of the snout swept back
    // and down. Rooted mid-muzzle and run straight out -- which is where they
    // started -- they read as a second pair of incisors and the snout comes
    // out forked.
    whiskers(p, headX - 22, headY + 6, 2, -1, 10, 0.55, LIGHT);
  }

  if (p.back) { p.face(headX, headY, 22); return; }

  /* --- the face. Enormous, wet and black: the friendliest eye in the file,
     because everything else about a thief is furtive and the eye is the only
     thing arguing for it. */
  eye(p, headX - 9, headY + 2, 5.8, 'round', { side: -1, iris: ACCENT_DARK });
  eye(p, headX + 8, headY + 1, 4.4, 'round', { side: 1, iris: ACCENT_DARK });
  p.face(headX, headY, 22);
}

/* ============================================================= burrowen */

/**
 * "Broad digging rodent with shovel forepaws."
 *
 * Nibbet on all fours and four times the weight: a long low wedge with the
 * shoulders humped up over a dropped head, one shovel paw planted out past the
 * snout and the other tucked back under the chest mid-stroke.
 *
 * The line reads because three things carried over unchanged -- the buck
 * teeth, the ring-marked tail and the rodent snout -- while everything about
 * the shape inverted. The ears are the tell: nibbet's are the tallest thing on
 * the sprite, and on the animal that lives underground they have shrunk to two
 * folded discs pinned flat against the skull.
 */
function burrowen(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // Same reason as nibbet: the stock ruff landed on the shoulder hump and came
  // out as a plank. See the note at the top of that function.
  p.noTypeTraits();
  const hipX = cx + 24, hipY = G - 44;
  const shX = cx - 16, shY = G - 38;
  // The head sits lower than the hump on purpose. Level with it, the whole
  // front of the animal came out as one loaf with a face drawn on the end;
  // the notch between skull and shoulder is the only thing that says which end
  // is the head when the sprite is filled with one flat colour.
  const headX = cx - 40, headY = G - 41;

  /* --- the tail: short, thick and ringed, the one piece of nibbet that grew
     rather than shrank. */
  const tailPts: Pt[] = [[hipX + 12, G - 44], [hipX + 21, G - 40], [hipX + 24, G - 29]];
  limbPath(p, tailPts, 13, 5, BASE, { lit: HILIGHT, dark: DEEP });
  const td = path(tailPts);
  for (const t of [0.3, 0.62]) {
    const i = Math.round(t * (td.length - 1));
    const q = td[i]!, n = normalAt(td, i);
    const hw = 7 - t * 2;
    for (const k of [0, 1]) {
      stroke(p, q[0] - n[0] * hw, q[1] - n[1] * hw + k, q[0] + n[0] * hw, q[1] + n[1] * hw + k, ACCENT);
    }
  }

  /* --- far legs. Short and braced wide; a digger's stance is a wheelbarrow. */
  legPlantigrade(p, hipX + 6, hipY + 8, G - 2, { tone: SHADE, side: 1, thick: 14, ankle: 8, footHalf: 8, claws: true });
  limbPath(p, [[shX + 4, shY + 8], [shX - 4, G - 16], [shX - 12, G - 8]], 12, 9, SHADE);
  paw(p, shX - 18, G - 2, 8, { tone: SHADE, toes: 3, long: true, claws: true });

  /* --- the body: a long low mass, deepest at the shoulder rather than at the
     hip. Every digging animal is built like that and nothing else says
     "front-wheel drive" as cheaply. */
  limbPath(p, [[hipX, hipY], [cx, G - 40], [shX, shY]], 40, 36, BASE, { bulge: 2 });
  blobFront(p, hipX + 2, hipY + 2, 21, 20, BASE);
  blobFront(p, shX + 2, shY - 6, 22, 21, BASE);
  // The shoulder hump: a lit crest riding over a dark gutter, right where the
  // digging muscle is. One curve, and it is what makes the animal look strong
  // rather than merely fat.
  for (const q of arc(shX + 2, shY - 8, 21, 16, Math.PI * 1.06, Math.PI * 1.94, 26)) {
    cellOver(p, q[0], q[1] + 3, DEEP);
    cellOver(p, q[0], q[1] + 2, HILIGHT);
  }
  bellyPlate(p, cx - 4, G - 22, 22, 8, 3);

  /* --- near hind leg, carrying the weight. */
  legPlantigrade(p, hipX - 6, hipY + 12, G, { tone: BASE, side: 1, thick: 16, ankle: 9, footHalf: 9, front: true, claws: true });

  /* --- the head, dropped low and forward off the hump. The cheek line behind
     the jaw is what keeps it a head: drawn onto the same broad mass in the
     same tone, a skull this close to its own shoulders welds to them. */
  blobFront(p, headX, headY, 19, 16, BASE);
  for (const q of arc(headX + 5, headY + 2, 16, 16, Math.PI * 1.68, Math.PI * 2.42, 16)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0] - 1, q[1], LIGHT);
  }
  // The brow shelf: one dark arc with a lit lip over it. A skull that is one
  // ellipse is a ball with a face painted on, however well it is lit.
  for (const q of arc(headX, headY - 4, 17, 12, Math.PI * 1.06, Math.PI * 1.94, 24)) {
    cellOver(p, q[0], q[1] + 4, DEEP);
    cellOver(p, q[0], q[1] + 3, HILIGHT);
  }
  /* Ears: two low folded mounds set well back on the skull, in body tones with
     a dark rim rather than a dark bowl.

     They were discs with cavities in them, sitting up on the crown directly
     above the eyes -- and two dark hollows over two dark eyes gave the animal
     four of them. An ear that has to be dark inside belongs on a creature
     whose ears are not near its eyes. */
  earRound(p, headX + 15, headY - 7, 4.5, 1, { tone: SHADE, inner: SHADE, front: true });
  earRound(p, headX + 5, headY - 13, 6.5, -1, { tone: BASE, inner: SHADE, front: true });
  for (const q of arc(headX + 5, headY - 13, 4.2, 4.6, Math.PI * 0.85, Math.PI * 1.95, 12)) cellOver(p, q[0], q[1], DEEP);

  // The snout is pushed well forward of the skull. On a silhouette this
  // loaf-shaped it is the only thing that says which end the head is.
  muzzle(p, headX - 18, headY + 4, 10, 6.5, { dir: -1, tone: LIGHT, detail: !p.back, frown: 1 });
  blob(p, headX - 26, headY, 4.2, 3.2, ACCENT);
  cell(p, headX - 28, headY - 2, SPEC);
  if (!p.back) {
    // The incisors again, and bigger. A quarry animal chews rock.
    for (const fx of [headX - 17, headX - 13]) {
      for (let k = 0; k < 5; k++) cell(p, fx, headY + 9 + k, ACCENT_LIT);
      for (let k = 0; k < 5; k++) cell(p, fx + 1, headY + 9 + k, ACCENT);
    }
    /* The bandit mask: a patch of near-black around each socket with a bar
       joining them across the bridge.

       Drawn as a *stripe through* the eyes it was invisible, because the eyes
       go down on top of it and a mask is only the part of itself that shows
       around them. Drawn as two patches wider than the eyes, it reads. And it
       has to be laid before them either way -- `eye` marks the mask
       immediately, unlike the stock pair, which is queued until after the
       light has run. */
    blob(p, headX - 7, headY - 4, 7.5, 5.5, ACCENT);
    blob(p, headX + 7, headY - 6, 6.5, 4.8, ACCENT);
    for (let k = 0; k < 2; k++) stroke(p, headX - 13, headY - 3 + k, headX + 11, headY - 7 + k, ACCENT);
  }

  /* --- the near foreleg and the shovel. The paw is planted out past the
     snout with its claws driven into the floor, which is the pose: a digger
     with both feet under it is a guinea pig.

     The claws are the signature and they are drawn as blades, not spikes --
     five cells across at the root, tapering over sixteen. A spike four cells
     wide at the base is two cells wide for most of its length and comes back
     from the ink pass as wire. */
  limbPath(p, [[shX + 2, shY + 10], [shX - 12, G - 26], [shX - 26, G - 20]], 16, 12, BASE, { front: true, bulge: 2 });
  crease(p, shX - 12, G - 26, 7);
  const wx = cx - 48, wy = G - 19;
  polyFront(p, [[wx + 11, wy - 9], [wx + 14, wy + 3], [wx - 5, wy + 7], [wx - 9, wy - 5]], BASE);
  stroke(p, wx + 10, wy - 8, wx - 8, wy - 5, HILIGHT);
  for (let i = 0; i < 3; i++) {
    const bx = wx - 8 + i * 8, by = wy + 6 + i * 0.5;
    poly(p, [[bx - 4.5, by - 4], [bx + 4.5, by - 5], [bx + 1, by + 13]], ACCENT_LIT);
    stroke(p, bx - 4.5, by - 4, bx + 1, by + 13, SPEC);
    stroke(p, bx + 4.5, by - 5, bx + 1, by + 12, ACCENT_DARK);
    stroke(p, bx - 4.5, by - 4, bx + 4.5, by - 5, ACCENT_DARK);
  }

  if (p.back) { p.face(headX, headY, 18); return; }

  /* --- the face. Half shut and set in the dark of the mask: an animal that
     works underground and does not much care to look at you. */
  // The lid is body-toned, not mask-toned. Painted in the near-black of the
  // mask it sat inside, the whole eye disappeared into the patch and the
  // animal came out with a smudge for a face.
  eye(p, headX - 7, headY - 4, 5, 'sleepy', { side: -1, iris: ACCENT_LIT, lid: BASE });
  eye(p, headX + 7, headY - 6, 4.2, 'sleepy', { side: 1, iris: ACCENT_LIT, lid: BASE });
  p.face(headX, headY, 19);
}

/* ============================================================== tuftail */

/**
 * "Small grazing quadruped, thick neck ruff."
 *
 * The ruff is not a collar on an animal; it is most of the animal. The front
 * third of the sprite is one woolly circle with a small blunt head poking out
 * of the front of it, and the body behind is deliberately plain so the collar
 * never has to compete.
 *
 * It is drawn in two passes with the head between them -- the back half in
 * SHADE, the front half in LIGHT over the chest -- which is what makes it a
 * thing the creature is wearing rather than a sunburst printed behind it.
 *
 * The pose is one lifted forehoof. It follows walkers, so it is walking.
 */
function tuftail(p: Pen): void {
  const G = p.ground, cx = p.cx;
  /* The stock beast character pass grows a four-spike ruff off the top contour
     just behind the face -- good fur on a bare-necked animal, and on this one
     it landed on top of the collar and came out as two extra ears. The collar
     is this species' entire read; it does not need help. */
  p.noTypeTraits();
  const hipX = cx + 18, hipY = G - 48;
  const shX = cx - 6, shY = G - 48;
  const headX = cx - 42, headY = G - 62;
  const ruffX = cx - 22, ruffY = G - 53;

  /* --- the bottle-brush tail, cocked up over the rump. Long enough to read as
     a tail rather than as a fifth foot: this species is named for it. */
  /* --- the tail, and the species is named for it, so it is built rather than
     called for: a short thick stalk with a fan of long clumps bursting off the
     end of it. `tailPlume` gave a tapered brush that came out as a flag; a
     tuft is a *fan*, and a fan has to be drawn as separate hairs radiating
     from one point. */
  limbPath(p, [[hipX + 4, G - 44], [hipX + 13, G - 55], [hipX + 15, G - 64]], 11, 7, BASE, { lit: HILIGHT, dark: DEEP });
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * (0.82 - i * 0.16);
    tuft(p, hipX + 14, G - 62, 17 - Math.abs(i - 2) * 3, a, 0.2, i % 2 ? SHADE : BASE);
  }
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI * (0.76 - i * 0.16);
    tuft(p, hipX + 14, G - 63, 14 - Math.abs(i - 1.5) * 3, a, 0.16, LIGHT);
  }

  /* --- far legs, slender, with cloven hooves.

     Built by hand rather than with `legDigitigrade`, because that helper
     places its own foot from a toe position it works out internally -- and a
     hoof dropped at a guessed x lands beside the ankle rather than on it. Four
     dark boxes standing on the floor next to four legs is what the first pass
     at this animal looked like. */
  limbPath(p, [[hipX + 2, hipY + 8], [hipX + 8, G - 28], [hipX + 2, G - 8]], 11, 6, SHADE);
  hoof(p, hipX + 2, G - 1, 4.5, SHADE);
  limbPath(p, [[shX - 2, shY + 8], [shX - 8, G - 28], [shX - 4, G - 8]], 10, 6, SHADE);
  hoof(p, shX - 4, G - 1, 4, SHADE);

  /* --- the barrel. Short and level: a grazer is a gut on four sticks, and
     this one is deliberately plain so the collar never has to compete. */
  limbPath(p, [[hipX, hipY], [cx + 4, hipY - 2], [shX, shY]], 30, 27, BASE, { bulge: 2 });
  blobFront(p, hipX + 1, hipY + 1, 16, 16, BASE);
  bellyPlate(p, cx + 4, G - 36, 15, 7, 2);
  for (const q of arc(cx + 4, hipY + 2, 20, 18, Math.PI * 1.12, Math.PI * 1.88, 22)) {
    cellOver(p, q[0], q[1] + 3, DEEP);
    cellOver(p, q[0], q[1] + 2, HILIGHT);
  }

  /* --- near hind leg down, near foreleg LIFTED and swinging forward. */
  limbPath(p, [[hipX - 6, hipY + 10], [hipX + 2, G - 26], [hipX - 6, G - 8]], 12, 7, BASE, { front: true });
  crease(p, hipX + 2, G - 26, 5);
  hoof(p, hipX - 6, G - 1, 5, BASE);
  // The lifted foreleg has to come out from *under* the collar and keep going:
  // swung only as far as the hem, it was swallowed whole and the animal came
  // out with three legs.
  limbPath(p, [[shX - 4, shY + 10], [shX - 14, G - 26], [shX - 28, G - 18]], 12, 7, BASE, { front: true });
  crease(p, shX - 14, G - 26, 5);
  hoof(p, shX - 32, G - 15, 4.5, BASE);

  /* --- the ruff.

     A `mane` laid along an arc gave a fringe two cells deep that vanished
     under the head, so this is a *mass* first: a disc the size of the animal's
     chest, jagged all round with tufts, in two passes with the head between
     them -- the far half recessed, the near half pale over the chest. That is
     what makes it a thing the creature is wearing rather than a halo printed
     behind it. */
  blob(p, ruffX + 3, ruffY - 1, 19, 18, SHADE);
  for (let i = 0; i < 12; i++) {
    // Nothing points *up*. A tuft standing beside the skull is a third ear,
    // and this animal already has two the eye has to find; the first pass at
    // the collar fringed it all the way round and gave it four.
    const a = Math.PI * (0.06 + (i / 12) * 0.94);
    tuft(p, ruffX + 3 + Math.cos(a) * 17, ruffY - 1 + Math.sin(a) * 16, 8 + (i % 3) * 2.5, a, 0.42, SHADE);
  }

  /* --- the neck. Short, thick, and almost entirely buried, which is the whole
     point: an animal with no visible neck reads as woolly. */
  limbPath(p, [[shX + 2, shY - 6], [headX + 14, headY + 8]], 20, 16, BASE);

  blob(p, ruffX - 3, ruffY + 2, 16, 16, LIGHT);
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * (0.12 + (i / 11) * 1.0);
    tuft(p, ruffX - 3 + Math.cos(a) * 14, ruffY + 2 + Math.sin(a) * 14, 9 + (i % 3) * 2.5, a, 0.42, LIGHT);
  }
  // Two creases raking out of the collar, so it is a coat with a lie to it
  // rather than a pom-pom.
  for (const [a, l] of [[Math.PI * 0.82, 15], [Math.PI * 1.18, 16], [Math.PI * 1.5, 13]] as const) {
    stroke(p, ruffX - 3 + Math.cos(a) * 4, ruffY + 2 + Math.sin(a) * 4,
      ruffX - 3 + Math.cos(a) * l, ruffY + 2 + Math.sin(a) * l, DEEP);
  }

  /* --- the head: small, blunt, and poking out of the top of the collar. */
  blobFront(p, headX, headY, 13, 11.5, BASE);
  earPointed(p, headX + 9, headY - 7, 12, 5, 1, { tone: SHADE, inner: p.back ? SHADE : SHADE, front: true });
  earPointed(p, headX - 6, headY - 10, 17, -5, -1, { tone: BASE, inner: p.back ? SHADE : INNER, front: true });
  muzzle(p, headX - 12, headY + 5, 8.5, 6, { dir: -1, tone: LIGHT, detail: !p.back, frown: -1 });
  // A dark band across the bridge: the one marking, and it is what makes the
  // face read at icon size when the ruff has eaten everything else.
  for (let k = 0; k < 3; k++) stroke(p, headX - 16, headY + 1 + k, headX - 5, headY + 2 + k, ACCENT);

  if (p.back) { p.face(headX, headY, 17); return; }

  /* --- the face. Heavy-lidded and pale-eyed: placid, incurious, and entirely
     willing to follow you for a mile and a half. */
  eye(p, headX - 6, headY - 1, 5.4, 'hooded', { side: -1, iris: ACCENT_LIT, lid: BASE });
  eye(p, headX + 8, headY - 2, 4.6, 'hooded', { side: 1, iris: ACCENT_LIT, lid: BASE });
  p.face(headX, headY, 17);
}

/* ========================================================== bristlebuck */

/**
 * "Stag-like grazer with a bristled mantle and low horns."
 *
 * Tuftail grown up and squared off. The collar has hardened into a mantle of
 * stiff bristles running from the crown to the withers, the legs have doubled
 * in length, and two low horns sweep back over the neck.
 *
 * The pose is the brief: it puts itself between the herd and whatever is
 * coming. So it stands across the frame with its forelegs braced apart and its
 * weight forward, head up and turned out at the viewer -- not grazing, not
 * fleeing, and not square-on either, because square-on is a diagram.
 */
function bristlebuck(p: Pen): void {
  const G = p.ground, cx = p.cx;
  /* Off, and it is worth saying why, because the pass is a good one.
     The stock beast character grows a ruff of guard hairs off the highest
     point of the top contour behind the face -- eight cells tall and twelve
     wide once the unit pen has doubled them. On an animal whose highest point
     behind the face is the tip of its own horn, it grows off the horn, and
     the buck came out wearing a pale blade over its head. Anything with
     ornament on its crown has to opt out of it. */
  p.noTypeTraits();
  const hipX = cx + 28, hipY = G - 62;
  const shX = cx - 8, shY = G - 68;
  const headX = cx - 42, headY = G - 84;

  /* --- tail: short and hanging, with a dark tuft on the end. Tuftail's,
     dropped: the young one carries it up, the adult does not bother. */
  limbPath(p, [[hipX + 12, G - 60], [hipX + 21, G - 48], [hipX + 22, G - 34]], 9, 5, BASE, { lit: HILIGHT, dark: DEEP });
  tuft(p, hipX + 22, G - 36, 13, Math.PI * 0.46, 0.4, ACCENT_DARK);

  /* --- far legs. Long and straight; the height is the whole difference
     between this animal and the one it grew out of. */
  limbPath(p, [[hipX + 2, hipY + 8], [hipX + 10, G - 34], [hipX + 2, G - 8]], 13, 7, SHADE);
  hoof(p, hipX + 2, G - 1, 5, SHADE, DEEP, LIGHT);
  limbPath(p, [[shX - 2, shY + 10], [shX - 10, G - 34], [shX - 4, G - 8]], 12, 7, SHADE);
  hoof(p, shX - 4, G - 1, 5, SHADE, DEEP, LIGHT);

  /* --- the body. High at the shoulder, falling away to the hip: a braced
     animal carries its weight over its forelegs and the back says so. */
  limbPath(p, [[hipX, hipY], [cx + 6, hipY - 6], [shX, shY]], 34, 32, BASE, { bulge: 2 });
  blobFront(p, hipX + 2, hipY + 4, 19, 19, BASE);
  blobFront(p, shX - 2, shY + 4, 20, 21, BASE);
  bellyPlate(p, cx + 4, G - 46, 20, 8, 3);
  for (const q of arc(cx + 4, hipY + 2, 24, 22, Math.PI * 1.1, Math.PI * 1.9, 26)) {
    cellOver(p, q[0], q[1] + 3, DEEP);
    cellOver(p, q[0], q[1] + 2, HILIGHT);
  }

  /* --- near hind leg, and the two forelegs braced apart. Two front feet at
     different distances is what makes a stance read as taken rather than as
     stood in. */
  limbPath(p, [[hipX - 8, hipY + 12], [hipX, G - 32], [hipX - 8, G - 8]], 14, 8, BASE, { front: true });
  crease(p, hipX, G - 32, 6);
  hoof(p, hipX - 8, G - 1, 5.5, BASE, DEEP, LIGHT);

  /* --- the neck: thick, and *rising*. Run level out of the shoulder it made
     the head, the neck and the muzzle into one long pale wedge with an eye
     somewhere along it; a neck that climbs gives the head a throat line to sit
     on and the skull somewhere to be. */
  limbPath(p, [[shX + 2, shY + 2], [shX - 14, shY - 12], [headX + 13, headY + 9]], 27, 18, BASE, { front: true, bulge: 1 });

  /* --- the mantle. Bristles rather than fur: stiff, straight and unequal, in
     two rows so the mass has depth instead of being a comb.

     It starts *behind the skull* and runs back along the withers. Grown the
     other way, up over the crown, it came out as a dinosaur crest with the
     horns buried somewhere inside it -- and a mantle is a thing on a back, not
     a thing on a head.

     The path runs right to left, because a spine row grows along its left
     normal -- and for a path walked left to right that normal points *down*.
     Handed the row the other way about, every bristle on this animal grew into
     the inside of its own back, where the only trace of them was a scatter of
     green streaks under the skin. */
  const ridge: Pt[] = [[hipX - 4, hipY - 20], [cx + 10, hipY - 25], [shX + 8, shY - 22]];
  mane(p, ridge, 5, 7, LIGHT, HILIGHT);
  spineRow(p, ridge, 10, 10, ACCENT, ACCENT_LIT);
  spineRow(p, ridge, 8, 6.5, ACCENT_DARK, ACCENT);

  /* --- the head, held high and long-jawed, with a hard cheek line behind it.
     A grazer's skull is a wedge and the wedge only exists if the jaw is drawn:
     without it this is the wide end of a neck. */
  blobFront(p, headX, headY, 16, 13, BASE);
  for (const q of arc(headX + 3, headY + 1, 14, 13, Math.PI * 0.32, Math.PI * 1.02, 16)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0], q[1] - 1, LIGHT);
  }
  muzzle(p, headX - 16, headY + 7, 10, 6.5, { dir: -1, tone: LIGHT, detail: !p.back, frown: 1 });
  for (let k = 0; k < 3; k++) stroke(p, headX - 20, headY + 2 + k, headX - 6, headY + 3 + k, ACCENT_DARK);

  // One ear, low and swept back under the horns. The far one is a sliver of
  // shadow behind it: a second full ear up there is a fourth spike competing
  // with two horns for the same six cells of skyline.
  earPointed(p, headX + 12, headY + 4, 13, 7, 1, { tone: SHADE, inner: p.back ? SHADE : INNER, front: true });

  /* --- the horns.

     They started as ram curls sweeping back over the neck, and two curls drawn
     side by side closed into a solid dome -- the animal came out wearing a
     helmet with its horns somewhere inside it. A horn only reads when it
     projects into *empty space*, so these rise back off the crown at forty-five
     degrees with daylight under both of them, and stay short. Low horns are
     short horns; they do not have to be flat to the skull.

     They must also stay mostly *body colour*. Ringed like a real horn and
     given a lit leading edge, a spike this narrow came back from the light
     pass as a pale bar: on a mass three cells wide a growth ring, a highlight
     and a bright tip between them are the entire horn. So the rings stop at
     the base, where there is room for them. */
  for (const [hx, hy, k, tone] of [[headX + 11, headY - 6, 0.78, ACCENT_DARK], [headX + 2, headY - 11, 1, ACCENT]] as const) {
    const hp = path([[hx, hy], [hx + 4 * k, hy - 11 * k], [hx + 11 * k, hy - 21 * k]] as Pt[]);
    limbPath(p, hp, 10 * k, 2.5, tone, { front: true, dark: ACCENT_DARK });
    for (let i = 1; i <= 2; i++) {
      const q = hp[Math.round((i / 7) * (hp.length - 1))]!, n = normalAt(hp, Math.round((i / 7) * (hp.length - 1)));
      const hw = 4.6 * k;
      stroke(p, q[0] - n[0] * hw, q[1] - n[1] * hw, q[0] + n[0] * hw, q[1] + n[1] * hw, ACCENT_DARK);
    }
    // One lit cell on the leading edge, at the base, and one at the point.
    // Two marks, not a stripe down the whole length.
    stroke(p, hp[2]![0] - 4 * k, hp[2]![1], hp[Math.round(hp.length * 0.5)]![0] - 3 * k, hp[Math.round(hp.length * 0.5)]![1], ACCENT_LIT);
    const tip = hp[hp.length - 1]!;
    cell(p, tip[0], tip[1], ACCENT_LIT);
    cell(p, tip[0], tip[1] - 1, ACCENT_LIT);
  }

  /* --- the near foreleg, planted forward and apart from its partner. */
  limbPath(p, [[shX - 4, shY + 14], [shX - 14, G - 36], [shX - 20, G - 10]], 15, 8, BASE, { front: true, bulge: 1.5 });
  crease(p, shX - 14, G - 36, 6);
  hoof(p, shX - 20, G - 1, 5.5, BASE, DEEP, LIGHT);

  if (p.back) { p.face(headX, headY, 18); return; }

  /* --- the face. Narrow, hard and green-eyed under a bone brow -- the only
     angry eye in the group, and the reason a grazer reads as a guard. */
  // Small. A big white almond with a dot in it reads as alarm however hard the
  // brow above it is angled, and alarm is not what a hedge warden is for.
  eye(p, headX - 6, headY, 4.2, 'angry', { side: -1, iris: ACCENT_DARK });
  eye(p, headX + 8, headY - 2, 3.5, 'angry', { side: 1, iris: ACCENT_DARK });
  p.face(headX, headY, 18);
}

/* ============================================================= frostnip */

/**
 * "Small frost-furred canine with icicle whiskers."
 *
 * A play bow: chest and elbows on the floor, rump in the air, brush tail up
 * behind. The whole animal is a diagonal, which is a shape nothing else in the
 * group has and which reads instantly at icon size as an animal about to
 * spring rather than an animal standing about.
 *
 * The icicles are the second signature and they grow *off the cheeks*, three
 * to a side, thick at the root. They are the only thing on the sprite allowed
 * to leave the silhouette, and each one costs four cells of ink, which is why
 * there are six of them and not twelve.
 */
function frostnip(p: Pen): void {
  const G = p.ground, cx = p.cx;
  // The stock frost pass grows shards off whatever is highest, which on a
  // crouching animal is the rump and the tail, so the kit came out with ice
  // sprouting from its backside. The ice is hand-placed on the nape instead.
  p.noTypeTraits();
  // And the stock frost texture is fish scales, which is the wrong material
  // for something described as frost-furred.
  p.noTexture();

  const hipX = cx + 22, hipY = G - 46;
  const chX = cx - 22, chY = G - 24;
  const headX = cx - 38, headY = G - 32;

  /* --- the brush tail, up and curling back. Its bright tip is the highest
     thing on the sprite and it is deliberately at the opposite corner from the
     face, so the eye is walked across the whole diagonal. */
  // Longer than it is wide, and tapered: a brush of constant thickness on a
  // short path is a club, and a club with a bright ball on the end of it is a
  // bone. The bright tip is the fox's white tag and it is worth the two cells.
  tailPlume(p, [[hipX + 4, G - 46], [hipX + 18, G - 60], [hipX + 24, G - 80]], 8, 6, {
    tone: BASE, far: SHADE, edgeLit: SPEC, thick: 12, tip: 3,
  });

  /* --- far legs. The far hind is folded under the raised rump; the far
     foreleg lies out flat on the floor. */
  legDigitigrade(p, hipX + 6, hipY + 6, G - 1, { tone: SHADE, side: 1, thick: 11, ankle: 6, footHalf: 6, claws: true });
  limbPath(p, [[chX + 8, chY + 6], [chX - 4, G - 8], [chX - 18, G - 5]], 10, 8, SHADE);
  paw(p, chX - 26, G - 1, 7, { tone: SHADE, toes: 3, long: true, claws: true });

  /* --- the body: one long diagonal from a high haunch down to a chest that is
     almost on the floor. */
  limbPath(p, [[hipX, hipY], [cx - 2, G - 34], [chX, chY]], 30, 26, BASE, { bulge: 2 });
  blobFront(p, hipX + 2, hipY + 2, 19, 18, BASE);
  blobFront(p, chX + 2, chY - 2, 17, 15, BASE);
  // The underside goes *dark*, not pale. On a species whose base colour is
  // already near-white, a pale belly plate is the brightest thing on the
  // sprite and the animal comes out with no underside at all.
  for (const q of arc(cx - 4, G - 26, 22, 13, Math.PI * 0.08, Math.PI * 0.92, 24)) {
    for (let k = 0; k < 4; k++) cellOver(p, q[0], q[1] + k, SHADE);
  }
  // The line of the back, lit: on a creature this angled it is the contour
  // that carries the pose and it earns its own crease.
  for (const q of path([[hipX + 8, hipY - 15], [cx - 2, G - 48], [chX + 4, chY - 14]] as Pt[])) {
    cellOver(p, q[0], q[1] + 1, DEEP);
    cellOver(p, q[0], q[1], HILIGHT);
  }

  /* --- near hind leg, folded and braced under the raised rump. */
  legDigitigrade(p, hipX - 8, hipY + 10, G, { tone: BASE, side: 1, thick: 12, ankle: 7, footHalf: 7, front: true, claws: true });

  /* --- the frost ruff, and three shards of ice standing off the nape. Small:
     the cheek icicles are the signature and a second field of spikes competing
     with them makes the animal read as a hedgehog. */
  mane(p, path([[chX + 14, chY - 12], [chX + 4, chY - 18], [chX - 8, chY - 14]] as Pt[]), 9, 5, LIGHT, SPEC);
  icicle(p, chX + 10, chY - 18, 13, -Math.PI * 0.62, 4, LIGHT);
  icicle(p, chX + 2, chY - 21, 10, -Math.PI * 0.54, 3.4, LIGHT);

  /* --- the near foreleg, elbow up and forearm flat along the floor. That
     folded elbow is what makes a low front end read as a bow rather than as a
     creature whose legs have been cut off. */
  limbPath(p, [[chX + 4, chY + 4], [chX - 6, G - 14], [chX - 20, G - 6]], 12, 8, BASE, { front: true, bulge: 1 });
  crease(p, chX - 6, G - 14, 5);
  paw(p, chX - 30, G - 1, 8, { tone: BASE, toes: 3, long: true, claws: true });

  /* --- the head, low and turned up at the viewer. The cheek line matters more
     here than anywhere else in the file: the icicles are rooted in it, and a
     spike growing out of a flat plane looks stuck on. */
  blobFront(p, headX, headY, 15, 13, BASE);
  for (const q of arc(headX + 1, headY + 1, 13, 12, Math.PI * 0.35, Math.PI * 1.05, 14)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0], q[1] - 1, LIGHT);
  }
  earPointed(p, headX + 12, headY - 9, 21, 9, 1, { tone: SHADE, inner: p.back ? SHADE : INNER, front: true, tufted: true });
  earPointed(p, headX - 6, headY - 12, 24, -7, -1, { tone: BASE, inner: p.back ? SHADE : INNER, front: true, tufted: true });

  // The muzzle: short and fine, a kit's. A long one would make it a hound
  // twenty-five levels early.
  muzzle(p, headX - 13, headY + 6, 8, 5.5, { dir: -1, tone: LIGHT, detail: !p.back, frown: -1 });
  blob(p, headX - 19, headY + 2, 3.4, 2.6, ACCENT_DARK);
  cell(p, headX - 21, headY, SPEC);

  /* --- the icicle whiskers. Three a side, longest at the front, each rooted
     well inside the cheek so it grows out of the animal instead of hanging
     beside it. */
  if (!p.back) {
    // The far cheek's fan is one short shard behind the near one. A full
    // second fan on a head seen from the side is six more spikes fighting over
    // the same twenty cells, and the ink pass welds the lot into a fringe.
    icicle(p, headX - 10, headY + 1, 13, Math.PI * 1.03, 3.6, SHADE);
    for (const [ix, iy, len, ang, w] of [
      [headX - 12, headY + 5, 20, Math.PI * 1.01, 5.4],
      [headX - 11, headY + 9, 17, Math.PI * 0.92, 4.8],
      [headX - 8, headY + 12, 13, Math.PI * 0.78, 4],
    ] as const) {
      icicle(p, ix, iy, len, ang, w, LIGHT);
    }
  }

  if (p.back) { p.face(headX, headY, 18); return; }

  /* --- the face. Round and dark-eyed, looking up: the kit is the only
     friendly thing in a line that ends in a pack hunter.

     The iris is the *dark* end of the accent ramp, not the bright one. On a
     species whose whole palette is pale ice, a pale iris on a pale sclera in a
     pale face gives you a pair of spectacles and no gaze at all. */
  eye(p, headX - 6, headY - 2, 4.8, 'round', { side: -1, iris: ACCENT_DARK });
  eye(p, headX + 8, headY - 4, 3.9, 'round', { side: 1, iris: ACCENT_DARK });
  p.face(headX, headY, 18);
}

/* ============================================================ rimehound */

/**
 * "Long-legged hound with a frost mane and trailing breath."
 *
 * Frostnip stretched out and let off the leash: legs reaching fore and aft,
 * back level, head thrust low and forward, tail streaming. It is the only
 * creature in the group with all four feet doing different things, and the gap
 * of daylight under its belly is most of why it reads as fast.
 *
 * The ice moved. On the kit it is a fan on the cheeks; on the hound it is a
 * ridge of spikes running the length of the neck, with two long ones left on
 * the jaw so the line is still legible.
 */
function rimehound(p: Pen): void {
  const G = p.ground, cx = p.cx;
  p.noTypeTraits();
  p.noTexture();

  const hipX = cx + 28, hipY = G - 58;
  const shX = cx - 10, shY = G - 60;
  const headX = cx - 37, headY = G - 58;

  /* --- the tail, thrown back and up clear of the spine.

     Laid level it started inside the rump and only eight cells of it ever came
     out the other side, so the animal read as having none. A tail has to leave
     the body before it is a tail. */
  tailPlume(p, [[hipX + 2, G - 62], [hipX + 13, G - 74], [hipX + 20, G - 86]], 9, 5, {
    tone: BASE, far: SHADE, edgeLit: SPEC, thick: 10, tip: 3, plainTip: true,
  });

  /* --- far legs, both at full reach: the far hind driving back, the far fore
     folded up under the chest. */
  limbPath(p, [[hipX, hipY + 8], [hipX + 12, G - 36], [hipX + 17, G - 12]], 13, 8, SHADE);
  paw(p, hipX + 20, G - 1, 7, { tone: SHADE, toes: 3, claws: true });
  limbPath(p, [[shX - 2, shY + 12], [shX - 10, G - 34], [shX - 2, G - 22]], 12, 8, SHADE);
  paw(p, shX + 2, G - 18, 6, { tone: SHADE, toes: 3, claws: true });

  /* --- the body: long, level and lean, with a deep chest and a cut-up waist.
     The tuck is the part that has to be drawn; without it a lean hound is just
     a thin barrel. */
  limbPath(p, [[hipX, hipY], [cx + 6, shY + 4], [shX, shY]], 28, 30, BASE, { bulge: -3 });
  blobFront(p, hipX + 2, hipY + 2, 18, 19, BASE);
  blobFront(p, shX - 2, shY + 2, 18, 20, BASE);
  for (const q of arc(cx + 6, shY + 2, 20, 24, Math.PI * 0.14, Math.PI * 0.86, 24)) {
    cellOver(p, q[0], q[1], DEEP);
    cellOver(p, q[0], q[1] - 1, SHADE);
  }
  bellyPlate(p, shX + 6, shY + 18, 14, 7, 2);

  /* --- near hind leg driving back, near foreleg reaching forward and off the
     floor. Four feet at four heights. */
  limbPath(p, [[hipX - 8, hipY + 10], [hipX - 2, G - 30], [hipX + 6, G - 6]], 15, 9, BASE, { front: true, bulge: 2 });
  crease(p, hipX - 2, G - 30, 7);
  paw(p, hipX + 8, G - 1, 8, { tone: BASE, toes: 3, claws: true });

  /* --- the neck, driven forward and *down*: the head is level with the
     shoulder, not above it, which is the difference between a hound running
     and a hound posing. */
  limbPath(p, [[shX + 4, shY - 2], [shX - 16, shY - 6], [headX + 10, headY + 2]], 24, 17, BASE, { front: true });

  /* --- the frost mane: a ridge of shards down the nape and over the withers,
     longest at the shoulder. Drawn before the head so the skull overlaps its
     leading end and it grows out of the animal. */
  const nape: Pt[] = [[shX + 12, shY - 18], [shX - 6, shY - 20], [headX + 12, headY - 10]];
  mane(p, nape, 8, 6, LIGHT, SPEC);
  const nd = path(nape);
  for (let i = 0; i < 6; i++) {
    const q = nd[Math.round((i / 5) * (nd.length - 1))]!;
    const len = 16 - Math.abs(i - 1.5) * 2.4;
    icicle(p, q[0], q[1] + 2, len, -Math.PI * (0.44 + i * 0.05), 4, LIGHT);
  }

  /* --- the head: long, narrow and wolfish, dropped to shoulder height. */
  blobFront(p, headX, headY, 15, 12, BASE);
  earPointed(p, headX + 10, headY - 8, 16, 9, 1, { tone: SHADE, inner: p.back ? SHADE : INNER, front: true });
  earPointed(p, headX - 3, headY - 11, 18, -4, -1, { tone: BASE, inner: p.back ? SHADE : INNER, front: true });

  // A long jaw, parted. An open mouth is the loudest expression a sprite can
  // carry and on the only predator in the group it is worth the cells.
  polyFront(p, [[headX - 1, headY + 1], [headX - 21, headY + 4], [headX - 20, headY + 11], [headX - 1, headY + 12]], LIGHT, DEEP, 1);
  stroke(p, headX - 2, headY + 2, headX - 20, headY + 5, HILIGHT);
  blob(p, headX - 22, headY + 3, 3.6, 2.8, ACCENT_DARK);
  cell(p, headX - 24, headY + 1, SPEC);
  if (!p.back) {
    poly(p, [[headX - 18, headY + 10], [headX - 4, headY + 10], [headX - 5, headY + 16], [headX - 16, headY + 15]], INNER);
    poly(p, [[headX - 15, headY + 13], [headX - 7, headY + 12], [headX - 8, headY + 16], [headX - 13, headY + 16]], ACCENT_DARK);
    for (const fx of [headX - 17, headX - 8]) {
      for (let k = 0; k < 3; k++) { cell(p, fx, headY + 10 + k, SPEC); cell(p, fx + 1, headY + 10 + k, INNER); }
    }
    // Two icicles left on the jaw: the kit's whisker fan, thinned out.
    icicle(p, headX - 14, headY + 8, 15, Math.PI * 0.86, 3.4, LIGHT);
    icicle(p, headX - 9, headY + 11, 11, Math.PI * 0.7, 3, LIGHT);
  }

  /* --- the breath.

     It leaves the nostril and streams *back* along the jaw and up past the
     cheek, widening and breaking up as it goes, which is what breath does
     behind a running animal.

     The first version curled it forward off the nose and round on itself, and
     a closed loop hanging in front of a face does not read as vapour at all --
     the hound came out with a trunk. A trailing plume has to leave the mouth
     going the other way from the animal, and it has to be rooted in the muzzle
     so the ink pass treats it as part of the head. */
  poly(p, [[headX - 17, headY + 1], [headX - 25, headY - 3], [headX - 29, headY + 4],
    [headX - 27, headY + 12], [headX - 18, headY + 14]] as Pt[], LIGHT);
  for (const [bx, by, r] of [[headX - 26, headY + 1, 4.2], [headX - 28, headY + 8, 4], [headX - 22, headY + 13, 4]] as const) {
    blob(p, bx, by, r, r * 0.9, LIGHT);
  }
  for (const [bx, by] of [[headX - 26, headY - 1], [headX - 29, headY + 6]] as const) {
    cellOver(p, bx, by, SPEC);
    cellOver(p, bx + 1, by - 1, SPEC);
  }
  // A shadow along the underside, or a pale cloud on a pale head is a hole in
  // the sprite. The first two versions of this went *forward and up* and curled
  // back on themselves, and a closed loop hanging off a muzzle does not read as
  // vapour at all -- the hound came out with a trunk.
  for (const q of arc(headX - 25, headY + 5, 8, 9, Math.PI * 0.24, Math.PI * 0.9, 12)) cellOver(p, q[0], q[1], SHADE);

  /* --- the near foreleg, reaching forward, well clear of the floor. */
  limbPath(p, [[shX + 2, shY + 14], [shX - 12, G - 32], [shX - 28, G - 24]], 14, 9, BASE, { front: true, bulge: 1.5 });
  crease(p, shX - 12, G - 32, 6);
  // A dangling paw: a rounded knuckle mass with the toes curled under it.
  // `paw` builds a foot for a ground line and a planted foot in mid-air reads
  // as a leg that has been cut off.
  blobFront(p, shX - 32, G - 22, 7, 6, BASE);
  for (let i = 0; i < 3; i++) {
    const tx = shX - 37 + i * 4.5;
    blob(p, tx, G - 18, 2.4, 3, i === 0 ? LIGHT : BASE);
    stroke(p, tx + 2.2, G - 21, tx + 2.2, G - 16, DEEP);
    claw(p, tx - 1, G - 16, 4, -0.4, 1);
  }

  if (p.back) { p.face(headX, headY, 17); return; }

  /* --- the face. Slit-eyed and small: the pack hunter the kit turns into, and
     the character is in how little white shows. */
  // A pale ice iris with a hard black bar through it. Everything inside an eye
  // has to be a tone the light pass leaves alone, so this is ACCENT_LIT and
  // never plain ACCENT -- and the slit style is what makes a pale iris work
  // here where a round one did not: the pupil carries the contrast.
  eye(p, headX - 5, headY - 3, 4.8, 'slit', { side: -1, iris: ACCENT_LIT });
  eye(p, headX + 8, headY - 5, 4, 'slit', { side: 1, iris: ACCENT_LIT });
  brow(p, headX - 5, headY - 9, 10, -1, 0.38);
  p.face(headX, headY, 17);
}

export const DESIGNS: Record<string, (p: Pen) => void> = {
  nibbet,
  burrowen,
  tuftail,
  bristlebuck,
  frostnip,
  rimehound,
};
