/**
 * Fog.
 *
 * The wetlands are the one region in the game where the player cannot see the
 * whole screen, and that single fact is what makes the route read differently
 * from every other route in Caelora. Everywhere else the camera is a promise:
 * whatever is on screen is what is there. Here it is not, and the consequences
 * are the design.
 *
 * Three rules the whole thing is built on.
 *
 * **It closes, it does not blind.** A fog that hides the tile in front of you
 * is not atmosphere, it is a broken control scheme. The clear circle is always
 * wide enough to show the boardwalk the player is standing on and the turn it
 * is about to make -- roughly three tiles hard-clear and another two of falloff
 * at full density. What it takes away is the *middle distance*: you cannot see
 * where a branch goes, only that it goes.
 *
 * **Light pushes it back.** Every lantern, every glowcap, every ember lamp
 * carries its own clearing, and those clearings are the only long sightlines
 * the route has. That turns lighting from decoration into navigation: the way
 * to cross the mire is to walk from one green smudge to the next, and the way
 * Mirehaven reads from its causeway is as a constellation of orange holes in
 * the grey. Nothing had to be scripted for that -- the lights are tiles, and
 * this reads the tiles.
 *
 * **It is banded, not smooth.** The falloff is quantised into a handful of
 * hard steps and drawn at logical resolution, so blowing it up to the buffer
 * gives back the chunky 2x2 blocks the rest of the art is made of. A smooth
 * radial gradient here would be the one modern-looking thing on the screen.
 *
 * The layer is drawn *before* the ambient night tint, so fog at night is dark
 * fog without this file knowing anything about the clock.
 */

import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { T, TILE_SIZE } from './tileset.js';
import type { TileMap } from '../world/tilemap.js';

/**
 * Tiles that push the fog back, and how far in logical pixels.
 *
 * A lantern reaches further than a glowcap on purpose. People's light is meant
 * to be the strong light -- walking into Mirehaven should feel like the fog
 * gives up -- while the mire's own light is just enough to aim at.
 */
const LIGHTS: Array<[number, number]> = [
  [T.LAMP_POST, 46],
  [T.LAMP_MIRE, 52],
  [T.LAMP_EMBER, 52],
  [T.GLOWCAP, 30],
];

/**
 * How many hard steps the falloff is cut into.
 *
 * Seven rather than five, and the ramp below is nearly linear rather than
 * squared. The first cut of this had a steep curve over five bands, which
 * meant the outermost six of them removed almost nothing and the innermost one
 * removed nearly everything -- a hard-edged disc of clear air with the player
 * in the middle of it, which reads as a hole cut in a filter rather than as
 * distance.
 */
const BANDS = 7;

/** One scratch canvas for the life of the page; this runs every frame. */
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

/**
 * Punch a hole in the fog: full clear out to `near`, then BANDS hard steps
 * out to `far`.
 *
 * Composited as destination-out, so a second hole overlapping the first can
 * only ever make the fog thinner -- two lanterns side by side clear a wider
 * space rather than a brighter one, which is what light actually does and
 * what stops a lit street from turning white.
 */
function clearAround(
  c: CanvasRenderingContext2D, x: number, y: number, near: number, far: number,
): void {
  if (far <= 0) return;
  c.globalCompositeOperation = 'destination-out';
  // Outside in, so each step lands on top of the weaker one under it.
  for (let i = BANDS; i >= 1; i--) {
    const t = i / BANDS;
    const r = near + (far - near) * t;
    // Nearly linear. Each ring only has to take a slice off what the ring
    // outside it left, so a gentle per-ring alpha compounds into a long ramp
    // -- and a long ramp is the whole difference between "the air is thicker
    // over there" and "there is a circle drawn round me".
    c.globalAlpha = 0.14 + (1 - t) * 0.22;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  // The heart of it, cleared outright.
  c.globalAlpha = 1;
  c.beginPath();
  c.arc(x, y, near, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
}

/**
 * Banks of fog drifting across the view.
 *
 * Four slabs on their own slow clocks, wrapped so they come round again. This
 * is the only part of the effect that moves, and it is what stops the whole
 * thing reading as a vignette drawn on the lens: fog that sits perfectly still
 * while a character walks through it is a filter, not weather.
 *
 * Every one of them is a radial gradient that reaches zero at its own rim, and
 * that is not a nicety. The first cut of this drew flat ellipses at a tenth
 * alpha, and a flat ellipse has an *edge*: four white lozenges sailed across
 * the marsh looking like clouds cut out of paper. A bank of fog has no edge
 * anywhere on it, so neither does this, and each one is wide enough and faint
 * enough to read as the air getting thicker rather than as an object.
 */
function drift(c: CanvasRenderingContext2D, ticks: number, tone: string, a: number): void {
  for (let i = 0; i < 4; i++) {
    const speed = 0.05 + (i % 3) * 0.028;
    const rx = 78 + (i % 3) * 30;
    const ry = 26 + (i % 2) * 14;
    const span = SCREEN_W + rx * 2;
    const x = ((ticks * speed + i * 137) % span) - rx;
    const y = (i * 47 + 21) % (SCREEN_H + 40) - 20;
    const alpha = a * (i % 2 === 0 ? 1 : 0.66);
    const grad = c.createRadialGradient(x, y, 0, x, y, rx);
    grad.addColorStop(0, tone);
    grad.addColorStop(0.55, tone);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    c.scale(1, ry / rx);
    c.translate(-x, -y);
    c.fillStyle = grad;
    c.beginPath();
    c.arc(x, y, rx, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  c.globalAlpha = 1;
}

/**
 * Draw the fog layer for one frame.
 *
 * `density` is the map's own `fog` field, 0 to 1. `cx`/`cy` are the player's
 * position in logical world units; everything else is read off the map.
 */
export function drawFog(
  r: Renderer, map: TileMap, cx: number, cy: number, ticks: number,
): void {
  const density = map.fog;
  if (density <= 0) return;
  const c = scratch();
  if (!c || !layer) return;

  // The fog's own colour. Cool and slightly green, because it is standing over
  // peat water rather than over the sea, and pale enough that it reads as fog
  // rather than as smoke -- the night tint applied after this is what makes it
  // dark, and doing that here as well would make midnight in the mire black.
  const tone = '#c3d0c6';

  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.clearRect(0, 0, SCREEN_W, SCREEN_H);

  // The veil, then the banks moving through it, then the holes -- in that
  // order, so a bank drifting past the player is cut away along with the veil
  // and does not sail across their face as a grey slab.
  c.globalAlpha = 0.26 + density * 0.60;
  c.fillStyle = tone;
  c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  c.globalAlpha = 1;
  drift(c, ticks, '#dde6dd', 0.07 + density * 0.11);

  // How far the player can see. At full density this is a little over three
  // tiles of hard clear and two more of falloff; at the quarter density
  // Mirehaven runs at it is most of the screen, and the fog is only a softening
  // at the edges of the view.
  const near = 22 + (1 - density) * 44;
  const far = 60 + (1 - density) * 96;
  clearAround(c, cx - r.camX, cy - r.camY, near, far);

  // Every light on screen, plus a margin, so a lantern just past the edge
  // still lifts the fog at the edge of the view and gives the player something
  // to walk toward.
  const pad = 3;
  const t0x = Math.max(0, Math.floor(r.camX / TILE_SIZE) - pad);
  const t1x = Math.min(map.width - 1, Math.floor((r.camX + SCREEN_W) / TILE_SIZE) + pad);
  const t0y = Math.max(0, Math.floor(r.camY / TILE_SIZE) - pad);
  const t1y = Math.min(map.height - 1, Math.floor((r.camY + SCREEN_H) / TILE_SIZE) + pad);
  for (let ty = t0y; ty <= t1y; ty++) {
    for (let tx = t0x; tx <= t1x; tx++) {
      const i = map.index(tx, ty);
      const over = map.over[i]!;
      const ground = map.ground[i]!;
      for (const [id, reach] of LIGHTS) {
        if (over !== id && ground !== id) continue;
        const lx = tx * TILE_SIZE + TILE_SIZE / 2 - r.camX;
        const ly = ty * TILE_SIZE + TILE_SIZE / 2 - r.camY;
        clearAround(c, lx, ly, reach * 0.30, reach * (0.7 + (1 - density) * 0.5));
        break;
      }
    }
  }

  // Up onto the buffer, unsmoothed, so every logical pixel of this lands as a
  // 2x2 block on the same grid the tiles are drawn on.
  r.bctx.save();
  r.bctx.imageSmoothingEnabled = false;
  r.bctx.drawImage(layer, 0, 0, SCREEN_W * DETAIL, SCREEN_H * DETAIL);

  // One last pass of drift straight onto the buffer, over the cleared circle
  // as well. Without it the air right around the player is glassy and still
  // while everything past it moves, and that reads as a bubble. It has to stay
  // barely there: this is the only fog the player sees against a clear picture
  // of the ground, so anything strong enough to notice is strong enough to
  // look like a smudge on the screen.
  // `drift` sets its own alpha per bank, so the strength has to go in as its
  // argument. Setting globalAlpha on the context around the call does nothing
  // -- which is how a sixteenth-strength haze got drawn at full strength and
  // parked a white slab over the causeway.
  r.bctx.scale(DETAIL, DETAIL);
  drift(r.bctx, ticks * 1.7, '#e8efe8', 0.03 + density * 0.035);
  r.bctx.restore();
}
