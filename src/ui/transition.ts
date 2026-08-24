/**
 * Screen transitions.
 *
 * Lives on its own because both halves of a battle transition need it and they
 * sit in different scenes: the overworld closes the shutters while the map is
 * still the thing on screen, and the battle scene opens them again once it has
 * taken over. Importing one scene from the other to share the drawing would be
 * a cycle, and duplicating it would let the two halves drift apart -- which is
 * exactly the kind of seam a player reads as a stutter.
 */

import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';

/**
 * The battle shutters.
 *
 * `p` runs 0 (open, field fully visible) to 1 (closed, screen black). Eight
 * diagonal bands sweep in from alternating sides, each lagging the one above
 * it, so the field is swallowed in a diagonal sweep rather than all at once.
 *
 * Diagonal rather than horizontal on purpose: a horizontal wipe reads as a
 * scene change, a diagonal one reads as an impact, which is the right note for
 * something that just jumped you out of the grass.
 */
export function drawShutters(r: Renderer, p: number): void {
  const bands = 8;
  const bandH = Math.ceil(SCREEN_H / bands);
  const clamped = Math.max(0, Math.min(1, p));
  for (let i = 0; i < bands; i++) {
    // Stagger: the last band runs a third of the sweep behind the first.
    const local = Math.max(0, Math.min(1, clamped * 1.35 - (i / bands) * 0.35));
    if (local <= 0) continue;
    const w = Math.ceil(local * (SCREEN_W + 24));
    const x = i % 2 === 0 ? 0 : SCREEN_W - w;
    r.rect(x, i * bandH, w, bandH, '#0d1018');
    // A lit leading edge, so the bands read as moving rather than growing.
    if (local < 1) {
      r.rect(i % 2 === 0 ? x + w - 2 : x, i * bandH, 2, bandH, '#5a6c98');
    }
  }
}

/* ------------------------------------------------------- area transitions */

/**
 * Walking from one place to another.
 *
 * Every warp in the game used to run the same twelve-to-eighteen frame fade to
 * black, so stepping through a shop door and walking off the end of a route
 * felt like the same event. They are not the same event, and the difference is
 * free: a door is a thing that closes on you, a route seam is the world sliding
 * past, a stair is the floor dropping away. Giving each its own shape tells the
 * player what just happened before the next map has even drawn.
 *
 * They are not, however, cheap. The first cut ran every one of these in ten
 * frames flat, on the theory that a thing seen several hundred times must get
 * out of the way -- and it did get out of the way, so fast that the shape never
 * registered and the whole move read as a flicker. A transition has to be long
 * enough for the eye to follow the moving edge, which at 60fps is about a third
 * of a second; under about a fifth it is a cut with decoration on it. So these
 * now run roughly twice as long, and buy the time back by never being linear:
 * each one accelerates out of rest and settles into its finish, which is what
 * makes a longer move read as deliberate rather than as a wait.
 */
export type AreaStyle = 'door' | 'edge' | 'stairs' | 'cave' | 'warp';

/** The direction the player was walking, for the transitions that use it. */
export type WipeDir = 'up' | 'down' | 'left' | 'right';

/**
 * Map a warp's authored `style` onto a transition.
 *
 * Taken as a separate step so the data file keeps saying what the warp *is*
 * ("door", "edge") and this module decides what that should look like. Every
 * style the schema allows is covered, and anything unrecognised falls back to
 * the plain fade rather than to nothing.
 */
export function areaStyleOf(warpStyle: string | undefined): AreaStyle {
  switch (warpStyle) {
    case 'door': return 'door';
    case 'edge': return 'edge';
    case 'stairs': return 'stairs';
    case 'cave': return 'cave';
    default: return 'warp';
  }
}

/**
 * Frames each half of the transition runs for.
 *
 * A third of a second each way is the floor for a move whose shape is meant to
 * be read; the heavier the place being entered, the more of one it gets. The
 * route seam is deliberately the quickest of them -- it is the one that happens
 * most often and the one that is least of an event.
 */
export function areaFrames(style: AreaStyle): number {
  switch (style) {
    case 'door': return 20;
    case 'stairs': return 22;
    case 'cave': return 24;
    case 'edge': return 17;
    default: return 20;
  }
}

/* --------------------------------------------------------------- easing */

/** Smoothstep: zero velocity at both ends, full speed through the middle. */
function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * The curve each style's cover runs on.
 *
 * Applied to the cover fraction rather than to time, so a transition and its
 * reverse are the same curve read in opposite directions and the two halves of
 * a warp cannot drift. Every curve here leaves and arrives at rest: the field
 * never jumps at the moment the cover appears, and never jumps at the moment it
 * finishes clearing, which is where a linear ramp always gives itself away.
 */
function ease(style: AreaStyle, t: number): number {
  switch (style) {
    // A route seam is a continuation, not an event, so this one keeps most of
    // a constant travelling speed and only softens the two ends.
    case 'edge': return 0.4 * t + 0.6 * smooth(t);
    // Stairs and cave mouths are the floor going out from under you: the same
    // eased shape weighted late, so it leans in slowly and then drops.
    case 'stairs':
    case 'cave': return Math.pow(smooth(t), 1.4);
    default: return smooth(t);
  }
}

/**
 * Snap a moving edge to the buffer grid rather than the logical one.
 *
 * The cover moves in the finest step the screen actually has. Rounded to whole
 * logical units a twenty-frame door advances in six two-pixel jumps and stalls
 * between them, which is the exact texture the player was calling "not smooth";
 * at buffer density it advances every frame.
 */
function step(v: number): number {
  return Math.round(v * DETAIL) / DETAIL;
}

/* --------------------------------------------------------------- dither */

/**
 * A 4x4 ordered (Bayer) threshold matrix.
 *
 * Every edge in here is dithered rather than alpha-blended. A ramp of
 * translucent black is a modern crossfade and reads as mush at 240x160; an
 * ordered dither is what the hardware could do, and unlike a single checker it
 * has sixteen usable densities, which is what lets the leading edge of a wipe
 * be a soft gradient instead of a hard line with a checker taped to it.
 */
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

/**
 * The feather ahead of a moving wall, in logical pixels.
 *
 * Wide enough to be a gradient and not a fringe; narrow enough that the wall
 * still has a definite position. Read at 1x this is the difference between an
 * edge that slides and an edge that teleports.
 */
const FEATHER = 12;

/**
 * Coverage the feather reaches right up against the wall, and how it decays.
 *
 * Not 1: a feather that starts solid is not a soft edge, it is three more
 * pixels of wall with a ragged end, which is what the first attempt looked
 * like. Starting at three-quarters keeps the wall's own boundary the crispest
 * thing in the move -- an edge still has to have a position -- and the gamma
 * spends most of the band down in the sparse densities where a dither reads as
 * shade rather than as pattern.
 */
const FEATHER_PEAK = 0.78;
const FEATHER_GAMMA = 1.5;

/**
 * How far in the feather has grown, 0 to 1.
 *
 * The feather cannot simply exist from frame one: a twelve-pixel gradient
 * switched on at full strength is a step, and a step at the exact moment the
 * player expects the move to begin is the one place the eye is guaranteed to be
 * looking. So it grows out of nothing over the first tenth of the cover, and
 * -- because the incoming half is this same curve read backwards -- shrinks
 * back into nothing as the field is handed over.
 */
function grow(p: number): number {
  return Math.min(1, p / 0.1);
}

/**
 * Fill a band with a dither that fades from `from` coverage to `to` across it.
 *
 * Cells are one logical pixel, so the pattern reads at the same density as the
 * art rather than as a coarse checker over the top of it. Runs of lit cells in
 * a row are coalesced into one rectangle, which keeps a full-height feather at
 * a couple of hundred draws a frame instead of a couple of thousand.
 */
function feather(r: Renderer, x: number, y: number, w: number, h: number,
  color: string, axis: 'x' | 'y', from: number, to: number): void {
  const w0 = Math.floor(w), h0 = Math.floor(h);
  if (w0 <= 0 || h0 <= 0) return;
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const n = axis === 'x' ? w0 : h0;
  const lo = Math.min(from, to), hi = Math.max(from, to);
  // The gamma is applied from the dense end whichever way round the band runs,
  // so a feather and its mirror image thin out at the same rate.
  const dense = (t: number): number => (from >= to ? 1 - t : t);
  for (let cy = 0; cy < h0; cy++) {
    let run = -1;
    for (let cx = 0; cx <= w0; cx++) {
      const i = axis === 'x' ? cx : cy;
      const cover = cx < w0
        ? lo + (hi - lo) * Math.pow(dense(n <= 1 ? 0.5 : i / (n - 1)), FEATHER_GAMMA)
        : -1;
      // The +0.5 puts the sixteen thresholds at the middle of their bands, so
      // coverage 0 is genuinely empty and coverage 1 genuinely solid.
      const lit = cover > (BAYER[((y0 + cy) & 3) * 4 + ((x0 + cx) & 3)] + 0.5) / 16;
      if (lit && run < 0) run = cx;
      else if (!lit && run >= 0) { r.rect(x0 + run, y0 + cy, cx - run, 1, color); run = -1; }
    }
  }
}

const INK = '#0b0e16';

/**
 * Two doors closing across the screen.
 *
 * Used for every door in the game, in both directions. Left and right panels
 * slide in to meet at the middle, each with a lit inner edge, so the last thing
 * the player sees is a vertical seam closing -- which is what a door does. The
 * reverse, played on arrival, is the same doors opening on the room inside.
 */
function drawDoors(r: Renderer, p: number): void {
  const half = step((SCREEN_W / 2) * p);
  if (half > 0) {
    r.rect(0, 0, half, SCREEN_H, INK);
    r.rect(SCREEN_W - half, 0, half, SCREEN_H, INK);
  }
  if (p >= 1) return;

  // A dithered gradient ahead of each panel, so the darkness arrives before the
  // panel does and the panel edge is never the first thing that moves.
  const g = grow(p);
  const fw = FEATHER * g, peak = FEATHER_PEAK * g;
  feather(r, half, 0, fw, SCREEN_H, INK, 'x', peak, 0);
  feather(r, SCREEN_W - half - fw, 0, fw, SCREEN_H, INK, 'x', 0, peak);
  if (half <= 0) return;

  // A lit jamb on each leading edge, drawn just inside the panel. Without the
  // warm line the panels are only darkness arriving; with it they are two
  // objects closing on the player, which is the whole difference between a fade
  // and a door. It brightens as they meet, so the seam has a moment.
  const heat = 0.55 + 0.45 * p;
  const lit = mix('#3a2f1e', '#9a7c4c', heat);
  const dim = mix('#241d13', '#4a3c26', heat);
  const H = SCREEN_H * DETAIL;
  r.pixel(half * DETAIL - 2, 0, 2, H, lit);
  r.pixel((SCREEN_W - half) * DETAIL, 0, 2, H, lit);
  r.pixel(half * DETAIL - 4, 0, 2, H, dim);
  r.pixel((SCREEN_W - half) * DETAIL + 2, 0, 2, H, dim);
}

/** Blend two hex colours, for the jamb warming up as the doors meet. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number): number => Math.round(
    ((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * Math.max(0, Math.min(1, t)),
  );
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/**
 * The world sliding past, in the direction the player is walking.
 *
 * A route seam is not an event, it is a continuation, so this one leads with
 * movement rather than with darkness: the cover enters from the edge the player
 * is heading towards and leaves the same way on the other side, which keeps the
 * sense of travelling in a straight line across two maps.
 */
function drawSlide(r: Renderer, p: number, dir: WipeDir): void {
  const horizontal = dir === 'left' || dir === 'right';
  const span = horizontal ? SCREEN_W : SCREEN_H;
  const len = step(span * p);

  // The cover comes from the far side, so the player walks into it.
  const fromStart = dir === 'right' || dir === 'down';
  if (len > 0) {
    const x = horizontal ? (fromStart ? SCREEN_W - len : 0) : 0;
    const y = horizontal ? 0 : (fromStart ? SCREEN_H - len : 0);
    r.rect(x, y, horizontal ? len : SCREEN_W, horizontal ? SCREEN_H : len, INK);
  }
  if (p >= 1) return;

  // The feather runs ahead of the wall, fading out into the field.
  const g = grow(p);
  const fw = FEATHER * g, peak = FEATHER_PEAK * g;
  const edgeAt = fromStart ? span - len : len;
  const axis = horizontal ? 'x' : 'y';
  const from = fromStart ? 0 : peak;
  const to = fromStart ? peak : 0;
  const start = fromStart ? edgeAt - fw : edgeAt;
  if (horizontal) feather(r, start, 0, fw, SCREEN_H, INK, axis, from, to);
  else feather(r, 0, start, SCREEN_W, fw, INK, axis, from, to);
}

/**
 * The floor dropping away, for stairs and cave mouths.
 *
 * A rectangular iris closing on the middle of the screen. Rectangular rather
 * than round on purpose: a circle at this resolution is a staircase of jaggies
 * that draws attention to itself, and the tile grid is square anyway.
 */
function drawIris(r: Renderer, p: number): void {
  const halfW = step((SCREEN_W / 2) * p);
  const halfH = step((SCREEN_H / 2) * p);
  if (halfH > 0) {
    r.rect(0, 0, SCREEN_W, halfH, INK);
    r.rect(0, SCREEN_H - halfH, SCREEN_W, halfH, INK);
  }
  if (halfW > 0) {
    r.rect(0, 0, halfW, SCREEN_H, INK);
    r.rect(SCREEN_W - halfW, 0, halfW, SCREEN_H, INK);
  }
  if (p >= 1) return;

  // Four feathers pointing inward. Where two overlap at a corner the dither
  // doubles up, which darkens the corners first -- exactly the way a room goes
  // when the light on it is closing down.
  const g = grow(p);
  const f = FEATHER * g, peak = FEATHER_PEAK * g;
  feather(r, 0, halfH, SCREEN_W, f, INK, 'y', peak, 0);
  feather(r, 0, SCREEN_H - halfH - f, SCREEN_W, f, INK, 'y', 0, peak);
  feather(r, halfW, 0, f, SCREEN_H, INK, 'x', peak, 0);
  feather(r, SCREEN_W - halfW - f, 0, f, SCREEN_H, INK, 'x', 0, peak);
}

/**
 * Cover the field for an area change.
 *
 * `p` runs 0 (field fully visible) to 1 (screen covered) in *time*; the easing
 * is applied here, so callers stay linear and the outgoing and incoming halves
 * of a warp are guaranteed to be the same curve run in opposite directions.
 */
export function drawAreaCover(r: Renderer, style: AreaStyle, p: number, dir: WipeDir = 'down'): void {
  const clamped = Math.max(0, Math.min(1, p));
  if (clamped <= 0) return;
  const e = clamped >= 1 ? 1 : ease(style, clamped);
  switch (style) {
    case 'door': drawDoors(r, e); return;
    case 'edge': drawSlide(r, e, dir); return;
    case 'stairs':
    case 'cave': drawIris(r, e); return;
    // The plain fade is the one place a flat tint is right: there is no edge to
    // read, so a dither would only add texture to something meant to be a
    // dissolve. It gets the same eased curve as everything else.
    default: r.tint('#000000', e); return;
  }
}
