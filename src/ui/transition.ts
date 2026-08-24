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
 * All of them are SHORT. The player will see these several hundred times in a
 * playthrough, so nothing here runs longer than a fifth of a second each way;
 * the shapes are legible at ten frames because they are hard-edged, and a hard
 * edge is readable in one frame where a soft ramp is not.
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

/** Frames each half of the transition runs for. Deliberately all under 12. */
export function areaFrames(style: AreaStyle): number {
  switch (style) {
    case 'door': return 10;
    case 'stairs': return 11;
    case 'cave': return 11;
    case 'edge': return 9;
    default: return 10;
  }
}

/**
 * A two-unit ordered dither, drawn as a checker of logical cells.
 *
 * Every edge in here is dithered rather than alpha-blended. A ramp of
 * translucent black is a modern crossfade and reads as mush at 240x160; a
 * checker of solid cells is what the hardware could do, and it makes the
 * leading edge of a wipe visible instead of merely present.
 */
function ditherBand(r: Renderer, x: number, y: number, w: number, h: number,
  color: string, phase: number): void {
  const cell = 2;
  for (let cy = 0; cy < h; cy += cell) {
    for (let cx = 0; cx < w; cx += cell) {
      if (((cx / cell) + (cy / cell) + phase) % 2 !== 0) continue;
      r.rect(x + cx, y + cy, Math.min(cell, w - cx), Math.min(cell, h - cy), color);
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
  const half = Math.ceil((SCREEN_W / 2) * p);
  if (half <= 0) return;
  r.rect(0, 0, half, SCREEN_H, INK);
  r.rect(SCREEN_W - half, 0, half, SCREEN_H, INK);
  if (p >= 1) return;

  // A lit jamb on each leading edge, drawn just inside the panel, then a
  // dithered rank a little ahead of it. Without the warm line the panels are
  // only darkness arriving; with it they are two objects closing on the player,
  // which is the whole difference between a fade and a door.
  r.pixel(half * DETAIL - 2, 0, 2, SCREEN_H * DETAIL, '#8a6f45');
  r.pixel((SCREEN_W - half) * DETAIL, 0, 2, SCREEN_H * DETAIL, '#8a6f45');
  r.pixel(half * DETAIL - 4, 0, 2, SCREEN_H * DETAIL, '#4a3c26');
  r.pixel((SCREEN_W - half) * DETAIL + 2, 0, 2, SCREEN_H * DETAIL, '#4a3c26');
  ditherBand(r, half, 0, 3, SCREEN_H, INK, 0);
  ditherBand(r, SCREEN_W - half - 3, 0, 3, SCREEN_H, INK, 1);
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
  const len = Math.ceil(span * p);
  if (len <= 0) return;

  // The cover comes from the far side, so the player walks into it.
  const fromStart = dir === 'right' || dir === 'down';
  const x = horizontal ? (fromStart ? SCREEN_W - len : 0) : 0;
  const y = horizontal ? 0 : (fromStart ? SCREEN_H - len : 0);
  const w = horizontal ? len : SCREEN_W;
  const h = horizontal ? SCREEN_H : len;
  r.rect(x, y, w, h, INK);

  if (p >= 1) return;
  // A dithered rank ahead of the wall, so the sweep has a direction.
  const edge = fromStart
    ? (horizontal ? { x: x - 4, y: 0, w: 4, h: SCREEN_H } : { x: 0, y: y - 4, w: SCREEN_W, h: 4 })
    : (horizontal ? { x: len, y: 0, w: 4, h: SCREEN_H } : { x: 0, y: len, w: SCREEN_W, h: 4 });
  ditherBand(r, edge.x, edge.y, edge.w, edge.h, INK, 0);
}

/**
 * The floor dropping away, for stairs and cave mouths.
 *
 * A rectangular iris closing on the middle of the screen. Rectangular rather
 * than round on purpose: a circle at this resolution is a staircase of jaggies
 * that draws attention to itself, and the tile grid is square anyway.
 */
function drawIris(r: Renderer, p: number): void {
  const halfW = Math.ceil((SCREEN_W / 2) * p);
  const halfH = Math.ceil((SCREEN_H / 2) * p);
  if (halfW <= 0) return;
  r.rect(0, 0, SCREEN_W, halfH, INK);
  r.rect(0, SCREEN_H - halfH, SCREEN_W, halfH, INK);
  r.rect(0, 0, halfW, SCREEN_H, INK);
  r.rect(SCREEN_W - halfW, 0, halfW, SCREEN_H, INK);
  if (p >= 1) return;
  ditherBand(r, 0, halfH, SCREEN_W, 2, INK, 0);
  ditherBand(r, 0, SCREEN_H - halfH - 2, SCREEN_W, 2, INK, 1);
  ditherBand(r, halfW, 0, 2, SCREEN_H, INK, 1);
  ditherBand(r, SCREEN_W - halfW - 2, 0, 2, SCREEN_H, INK, 0);
}

/**
 * Cover the field for an area change.
 *
 * `p` runs 0 (field fully visible) to 1 (screen covered). Play it forwards to
 * leave a map and backwards to arrive on the next one; both halves use the same
 * function so the two never drift apart the way two hand-written halves do.
 */
export function drawAreaCover(r: Renderer, style: AreaStyle, p: number, dir: WipeDir = 'down'): void {
  const clamped = Math.max(0, Math.min(1, p));
  if (clamped <= 0) return;
  switch (style) {
    case 'door': drawDoors(r, clamped); return;
    case 'edge': drawSlide(r, clamped, dir); return;
    case 'stairs':
    case 'cave': drawIris(r, clamped); return;
    default: r.tint('#000000', clamped); return;
  }
}
