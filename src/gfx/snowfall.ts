/**
 * Snowfall.
 *
 * Canon asks for one thing on the road to Frostmere: that visibility should
 * sometimes drop during snowfall. The wetlands already had fog, and the whole
 * design of this file is the difference between the two.
 *
 * **Fog sits. Snow moves, and it moves PAST you.** Mirehaven's fog is a
 * property of a place: it is the same thickness at the same tile every time
 * you stand there, it is the air not moving, and the way you beat it is to
 * learn the route. A squall is a property of a MOMENT. It comes up the valley,
 * it takes the hill away, it passes, and the road you could not see is there
 * again. So the strength of this is a function of *where the player is and
 * what o'clock it is*, and the two are folded together -- which means a player
 * who stands still watches the weather come over them, and a player who walks
 * finds it earlier or misses it altogether. That is what makes it something
 * you travel through rather than something you look at.
 *
 * Three things carry it, in the order they are drawn.
 *
 * **THE FALL.** Three depths of flake on three speeds, all leaning the same
 * way. The near layer is big, fast and only barely there; the far layer is
 * single units drifting slowly. The parallax is the whole illusion of air
 * between the camera and the ground. Every flake is drawn on the authoring
 * grid as a 2x2 block, because a snowfall of single screen pixels is static.
 *
 * **THE WIND.** The lean and the horizontal speed are shared by all three
 * layers and swing on a long slow period, so the fall visibly gusts. Nothing
 * else in this file moves on that clock, which is what stops the effect
 * reading as a loop.
 *
 * **THE WHITEOUT.** Only at the top of a squall, and it closes the same way
 * the fog does: a hard-clear disc around the player wide enough to show the
 * road they are standing on and the turn it is about to make, then a handful
 * of quantised bands out to nothing. Banded, not smooth, for the reason
 * src/gfx/fog.ts gives -- a smooth radial gradient would be the one modern
 * thing on the screen.
 *
 * The clear radius NEVER closes past the road: at the worst of it a player can
 * still see about two and a half tiles, which is the tile they are on, the one
 * ahead, and enough of the next to see a cairn on it. Route 8 is laid out so
 * that from any cairn you can see the next one, and this is the number that
 * promise is built on.
 *
 * Drawn before the ambient night tint, exactly as the fog is, so a squall at
 * midnight is a dark squall without this file knowing anything about the clock.
 */

import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { TILE_SIZE } from './tileset.js';
import type { TileMap } from '../world/tilemap.js';

/** How many hard steps the whiteout falloff is cut into. See fog.ts. */
const BANDS = 6;

/**
 * The closest the whiteout is ever allowed to come, in logical pixels.
 *
 * Two and a half tiles. Below this the player cannot see the road they are
 * standing on, and a weather effect that hides the ground under your feet is
 * not atmosphere, it is a broken control scheme.
 */
const FLOOR_NEAR = TILE_SIZE * 2.5;

let layer: HTMLCanvasElement | null = null;
let lctx: CanvasRenderingContext2D | null = null;

function scratch(): CanvasRenderingContext2D | null {
  if (!lctx) {
    if (typeof document === 'undefined') return null;
    layer = document.createElement('canvas');
    layer.width = SCREEN_W;
    layer.height = SCREEN_H;
    const c = layer.getContext('2d');
    if (!c) return null;
    c.imageSmoothingEnabled = false;
    lctx = c;
  }
  return lctx;
}

/** Cheap deterministic hash, so a flake field is the same one every frame. */
function hash(i: number, seed: number): number {
  let h = (i * 374761393 + seed * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * How hard it is snowing right here, right now, 0 to 1.
 *
 * Exported because the map author needs to be able to reason about it and
 * because the overworld reads it to decide whether the whiteout is worth the
 * scratch canvas at all.
 *
 * Three sine terms whose periods do not divide each other, over a coordinate
 * that mixes the player's position into the clock. The result never settles
 * and never repeats inside a session, and -- the point of the whole thing --
 * walking north-west, which on Route 8 is *uphill*, walks into it faster than
 * standing still does.
 */
export function squallAt(cx: number, cy: number, ticks: number): number {
  const t = ticks / 60;
  // The player's own contribution. Small numbers on purpose: crossing a whole
  // map is worth about one and a half squalls, so the weather is something the
  // road passes through rather than something painted on the tiles.
  const u = t * 0.09 + cx / 900 - cy / 620;
  const a = Math.sin(u * 2.11);
  const b = Math.sin(u * 0.83 + 1.7);
  const c = Math.sin(u * 0.37 - 0.6);
  // Biased low, so open weather is the normal state of the road and a squall
  // is an event. Roughly a fifth of the time is worth calling weather.
  const raw = (a * 0.42 + b * 0.36 + c * 0.30) * 0.55 + 0.34;
  return Math.max(0, Math.min(1, raw));
}

/** Punch a banded hole in the whiteout. Same contract as fog's clearAround. */
function clearAround(
  c: CanvasRenderingContext2D, x: number, y: number, near: number, far: number,
): void {
  if (far <= 0) return;
  c.globalCompositeOperation = 'destination-out';
  for (let i = BANDS; i >= 1; i--) {
    const t = i / BANDS;
    const r = near + (far - near) * t;
    c.globalAlpha = 0.15 + (1 - t) * 0.24;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.beginPath();
  c.arc(x, y, near, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

/**
 * One depth of falling snow.
 *
 * Drawn in screen space and wrapped, not in world space. A flake is in the air
 * between the camera and the ground, so it must NOT scroll with the map -- a
 * fall pinned to world coordinates slides sideways every time the player walks
 * and reads as litter on the floor rather than as weather in front of it.
 */
function fallLayer(
  r: Renderer, ticks: number, count: number,
  size: number, speed: number, lean: number, tone: string,
): void {
  const spanY = SCREEN_H + 40;
  const spanX = SCREEN_W + 80;
  for (let i = 0; i < count; i++) {
    // Each flake has its own speed within the layer, or the whole sheet falls
    // as one object.
    const own = 0.72 + hash(i, 11) * 0.56;
    const y = ((hash(i, 3) * spanY + ticks * speed * own) % spanY) - 20;
    const sway = Math.sin(ticks * 0.04 + i * 1.7) * (size > 1 ? 3 : 1.6);
    const x = ((hash(i, 5) * spanX + ticks * speed * own * lean + sway) % spanX) - 40;
    r.rect(Math.round(x), Math.round(y), size, size, tone);
  }
}

/**
 * Draw the snow layer for one frame.
 *
 * `cx`/`cy` are the player's position in logical world units, as for the fog.
 */
export function drawSnowfall(
  r: Renderer, map: TileMap, cx: number, cy: number, ticks: number,
): void {
  const density = map.snow;
  if (density <= 0) return;

  const squall = squallAt(cx, cy, ticks);
  // How much snow is actually in the air: the map's own weight, lifted by the
  // squall. A map set to 0.3 is a light steady fall that never blinds anybody;
  // a map set to 1 is the top of the pass.
  const fall = density * (0.34 + squall * 0.66);

  // The wind. One slow swing shared by every layer, so the whole fall gusts
  // together -- three layers leaning independently reads as three effects.
  const gust = Math.sin(ticks / 260) * 0.5 + Math.sin(ticks / 97 + 2.1) * 0.28;
  const lean = 0.55 + gust * 0.9 + squall * 0.5;

  // The whiteout. Only worth the scratch canvas once there is something to
  // see: below this the veil is thinner than the flakes in front of it.
  const veil = Math.max(0, squall - 0.42) / 0.58 * density;
  if (veil > 0.02) {
    const c = scratch();
    if (c && layer) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
      c.clearRect(0, 0, SCREEN_W, SCREEN_H);

      // WHAT A WHITEOUT ERASES IS THE DARK, and that is what took two passes to
      // get right. The first cut laid a pale blue-white over a pale
      // blue-white snowfield at two thirds alpha; it drew perfectly and
      // changed nothing anybody could see, because the only thing it was
      // covering was already that colour. Painting it DARKER was worse -- a
      // grey veil over snow is dusk, not weather.
      //
      // The answer is to go the other way and go further. At the top of a
      // squall this is nearly opaque white, and what that takes away is
      // precisely the things a player navigates by: the road, the rock, the
      // pines, the cairns. The snow does not change, because the snow was
      // already white. That is what standing in one is like, and it is why
      // the cleared disc below never closes past the tile you are on.
      c.globalAlpha = 0.24 + veil * 0.70;
      c.fillStyle = '#eef3fc';
      c.fillRect(0, 0, SCREEN_W, SCREEN_H);
      c.globalAlpha = 1;

      // How far the player can see. At the worst of it, two and a half tiles
      // hard-clear and two more of falloff -- enough for the road and the next
      // cairn, and nothing else at all.
      // The falloff is SHORT. Long ramps were tried first and the reason they
      // failed is arithmetic rather than taste: the screen is a hundred and
      // twenty logical pixels from the player to the corner, so a falloff that
      // ends at a hundred and sixteen leaves only the four corners at full
      // strength and the picture barely changes. Ending it at ninety puts most
      // of the view in the weather and still leaves the player two and a half
      // clear tiles, which is the number the cairn spacing on both roads is
      // laid out to.
      const near = FLOOR_NEAR + (1 - veil) * 62;
      const far = near + 22 + (1 - veil) * 64;
      clearAround(c, cx - r.camX, cy - r.camY, near, far);

      r.bctx.save();
      r.bctx.imageSmoothingEnabled = false;
      r.bctx.drawImage(layer, 0, 0, SCREEN_W * DETAIL, SCREEN_H * DETAIL);
      r.bctx.restore();
    }
  }

  // The fall itself, over the veil: snow near the camera is in front of the
  // air that is hiding the hill, and putting it under the veil is what made
  // the first cut of this look like weather happening somewhere else.
  //
  // Far layer first. Single units, slow, faint -- this is the one that reads
  // as distance and it is deliberately hard to pick out on its own.
  fallLayer(r, ticks, Math.round(34 + fall * 46), 1, 0.55, lean * 0.7, '#c8d6ec');
  fallLayer(r, ticks, Math.round(22 + fall * 40), 1, 0.95, lean, '#e6eefb');
  // The near layer. Few, big, quick, and the only part of the effect the eye
  // tracks individual pieces of.
  fallLayer(r, ticks, Math.round(6 + fall * 16), 2, 1.7, lean * 1.25, '#ffffff');
}
