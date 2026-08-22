/**
 * Free player movement.
 *
 * The player is no longer locked to the tile grid. It carries a floating
 * position and a small collision box at its feet, resolved against the tile
 * grid one axis at a time. The world stays tile-based -- encounters, warps and
 * interaction all still ask "which tile am I standing on" -- but the walking
 * itself is continuous.
 *
 * Why: grid movement commits a whole tile the instant you tap a key, and adds a
 * turn window on top so that tapping to look around does not walk you into
 * things. Both are necessary on a grid and both read as input lag. With a body
 * there is nothing to commit to: the character starts moving on the frame the
 * key goes down and stops on the frame it comes up.
 */

import { TILE_SIZE } from '../gfx/tileset.js';
import {
  CharSheet, getCharSheet, getAppearanceSheet, CHAR_H, CHAR_W,
  type CharDir, type CharAppearance,
} from '../gfx/charsprite.js';
import { DETAIL, type Renderer } from '../engine/renderer.js';
import type { Direction } from '../data/schema.js';

/** Feet box. Narrower than a tile so doorways and gaps feel generous. */
export const BODY_W = 11;
export const BODY_H = 9;

export const WALK_SPEED = 1.15;
export const RUN_SPEED = 2.05;
/** Pixels of travel per walk-cycle frame. */
const STRIDE = 6;

const DIAGONAL = Math.SQRT1_2;

export type SolidTest = (tileX: number, tileY: number, from: Direction) => boolean;

/** A named NPC palette, or a built appearance: the player is the second kind. */
export type SpriteRef = string | CharAppearance;

function sheetFor(sprite: SpriteRef): CharSheet {
  return typeof sprite === 'string' ? getCharSheet(sprite) : getAppearanceSheet(sprite);
}

export class PlayerBody {
  /** Top-left of the feet box, in world pixels. */
  x: number;
  y: number;

  facing: Direction = 'down';
  sheet: CharSheet;
  visible = true;

  /** Distance walked, which drives the animation rather than a timer. */
  private travelled = 0;
  private movingNow = false;

  /** Ledge hop / scripted walk, both of which take control briefly. */
  private hop: { fromX: number; fromY: number; toX: number; toY: number; t: number; frames: number } | null = null;
  private path: { toX: number; toY: number; speed: number; done: () => void } | null = null;

  constructor(sprite: SpriteRef, tileX: number, tileY: number, facing: Direction = 'down') {
    this.sheet = sheetFor(sprite);
    this.x = 0; this.y = 0;
    this.setTile(tileX, tileY);
    this.facing = facing;
  }

  setSprite(sprite: SpriteRef): void {
    this.sheet = sheetFor(sprite);
  }

  /** Place the body centred on a tile. */
  setTile(tileX: number, tileY: number): void {
    this.x = tileX * TILE_SIZE + (TILE_SIZE - BODY_W) / 2;
    this.y = tileY * TILE_SIZE + (TILE_SIZE - BODY_H) - 1;
    this.hop = null;
    this.path = null;
    this.travelled = 0;
    this.movingNow = false;
  }

  /* ------------------------------------------------------------ queries */

  get centerX(): number { return this.x + BODY_W / 2; }
  /** The point that decides which tile you are "on": the feet, not the head. */
  get footY(): number { return this.y + BODY_H - 1; }

  get tileX(): number { return Math.floor(this.centerX / TILE_SIZE); }
  get tileY(): number { return Math.floor(this.footY / TILE_SIZE); }

  get moving(): boolean { return this.movingNow || this.hop !== null || this.path !== null; }
  get busy(): boolean { return this.hop !== null || this.path !== null; }

  /**
   * The tile the player would interact with.
   *
   * All four directions step exactly one tile off the one the feet are in.
   * The upward case used to probe from the *top* of the feet box, four pixels
   * up -- but the box is only nine pixels tall and sits at the bottom of its
   * tile, so that probe almost always landed back on the tile the player was
   * already standing on. Talking to anyone standing directly above you only
   * worked if you happened to be pressed right up against them.
   */
  facingTile(): { x: number; y: number } {
    switch (this.facing) {
      case 'up': return { x: this.tileX, y: this.tileY - 1 };
      case 'down': return { x: this.tileX, y: this.tileY + 1 };
      case 'left': return { x: Math.floor((this.x - 5) / TILE_SIZE), y: this.tileY };
      default: return { x: Math.floor((this.x + BODY_W + 4) / TILE_SIZE), y: this.tileY };
    }
  }

  /* ------------------------------------------------------------ control */

  /** Begin a ledge hop across two tiles in the given direction. */
  startHop(dir: Direction): void {
    if (this.busy) return;
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    this.facing = dir;
    this.hop = {
      fromX: this.x, fromY: this.y,
      toX: this.x + dx * TILE_SIZE * 2,
      toY: this.y + dy * TILE_SIZE * 2,
      t: 0, frames: 22,
    };
  }

  /** Walk to a tile under script control. */
  walkTo(tileX: number, tileY: number, speed: number, done: () => void): void {
    this.path = {
      toX: tileX * TILE_SIZE + (TILE_SIZE - BODY_W) / 2,
      toY: tileY * TILE_SIZE + (TILE_SIZE - BODY_H) - 1,
      speed, done,
    };
  }

  /** Height above the ground, used by the hop arc. */
  get liftHeight(): number {
    if (!this.hop) return 0;
    return Math.round(Math.sin((this.hop.t / this.hop.frames) * Math.PI) * 13);
  }

  /* ------------------------------------------------------------- update */

  /**
   * Advance one tick. `inputX`/`inputY` are -1..1; `solid` reports whether a
   * tile blocks movement arriving from a given direction.
   */
  update(inputX: number, inputY: number, running: boolean, solid: SolidTest): void {
    if (this.hop) {
      this.hop.t++;
      const p = Math.min(1, this.hop.t / this.hop.frames);
      this.x = this.hop.fromX + (this.hop.toX - this.hop.fromX) * p;
      this.y = this.hop.fromY + (this.hop.toY - this.hop.fromY) * p;
      this.travelled += 2;
      if (this.hop.t >= this.hop.frames) this.hop = null;
      this.movingNow = true;
      return;
    }

    if (this.path) {
      const dx = this.path.toX - this.x;
      const dy = this.path.toY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= this.path.speed) {
        this.x = this.path.toX;
        this.y = this.path.toY;
        const done = this.path.done;
        this.path = null;
        this.movingNow = false;
        done();
        return;
      }
      this.faceFrom(dx, dy);
      this.x += (dx / dist) * this.path.speed;
      this.y += (dy / dist) * this.path.speed;
      this.travelled += this.path.speed;
      this.movingNow = true;
      return;
    }

    if (inputX === 0 && inputY === 0) {
      this.movingNow = false;
      // Settle on the neutral frame rather than freezing mid-stride.
      this.travelled = 0;
      return;
    }

    const speed = running ? RUN_SPEED : WALK_SPEED;
    const diag = inputX !== 0 && inputY !== 0 ? DIAGONAL : 1;
    const stepX = inputX * speed * diag;
    const stepY = inputY * speed * diag;

    // Facing follows the dominant axis, and prefers the vertical on a true
    // diagonal so that walking up-left still reads as facing up.
    this.faceFrom(stepX, stepY);

    this.moveAxis(stepX, 0, solid);
    this.moveAxis(0, stepY, solid);

    this.travelled += Math.hypot(stepX, stepY);
    this.movingNow = true;
  }

  private faceFrom(dx: number, dy: number): void {
    if (Math.abs(dy) >= Math.abs(dx)) {
      if (dy !== 0) this.facing = dy < 0 ? 'up' : 'down';
      else if (dx !== 0) this.facing = dx < 0 ? 'left' : 'right';
    } else {
      this.facing = dx < 0 ? 'left' : 'right';
    }
  }

  /**
   * Move along one axis and stop at the first blocked tile. Resolving axes
   * separately is what lets the player slide along a wall instead of sticking
   * to it, which is most of what "responsive" means on foot.
   */
  private moveAxis(dx: number, dy: number, solid: SolidTest): void {
    if (dx === 0 && dy === 0) return;
    const nx = this.x + dx;
    const ny = this.y + dy;
    const from: Direction = dx !== 0
      ? (dx < 0 ? 'left' : 'right')
      : (dy < 0 ? 'up' : 'down');

    if (!this.boxBlocked(nx, ny, from, solid)) {
      this.x = nx;
      this.y = ny;
      return;
    }

    // Corner assist: nudge along the other axis so a body clipping the edge of
    // a doorway slides in rather than catching on the frame.
    const assist = 3.0;
    if (dx !== 0) {
      for (const slide of [-assist, assist]) {
        if (!this.boxBlocked(nx, this.y + slide, from, solid) &&
            !this.boxBlocked(this.x, this.y + slide, from, solid)) {
          this.x = nx;
          this.y += slide * 0.5;
          return;
        }
      }
    } else {
      for (const slide of [-assist, assist]) {
        if (!this.boxBlocked(this.x + slide, ny, from, solid) &&
            !this.boxBlocked(this.x + slide, this.y, from, solid)) {
          this.y = ny;
          this.x += slide * 0.5;
          return;
        }
      }
    }
  }

  /** Test all four corners of the feet box against the tile grid. */
  private boxBlocked(x: number, y: number, from: Direction, solid: SolidTest): boolean {
    const left = Math.floor(x / TILE_SIZE);
    const right = Math.floor((x + BODY_W - 1) / TILE_SIZE);
    const top = Math.floor(y / TILE_SIZE);
    const bottom = Math.floor((y + BODY_H - 1) / TILE_SIZE);
    for (let ty = top; ty <= bottom; ty++) {
      for (let tx = left; tx <= right; tx++) {
        if (solid(tx, ty, from)) return true;
      }
    }
    return false;
  }

  /* ------------------------------------------------------------- render */

  get animStep(): number {
    if (!this.moving) return 0;
    return Math.floor(this.travelled / STRIDE) % CharSheet.CYCLE.length;
  }

  render(r: Renderer, opts: { hideLegs?: boolean; alpha?: number } = {}): void {
    if (!this.visible) return;
    const src = this.sheet.src(this.facing as CharDir, this.animStep);

    // Everything is placed in buffer pixels: the body carries a float position,
    // and rounding once here is what keeps the sprite from shimmering as it
    // slides between logical units.
    const groundX = r.worldPX(this.centerX);
    const groundY = r.worldPY(this.footY + 1);
    const dx = groundX - CHAR_W / 2;
    const dy = groundY - CHAR_H - this.liftHeight * DETAIL;

    // Contact shadow stays on the ground while the body arcs over a ledge,
    // which is the only thing that makes the hop read as height.
    if (!opts.hideLegs) {
      const lift = this.liftHeight;
      r.ellipsePixel(groundX, groundY - 2, 9 - lift * 0.2, 3.2, `rgba(16,20,28,${0.34 - lift * 0.012})`);
    }

    const h = opts.hideLegs ? CHAR_H - 12 : CHAR_H;

    const c = r.bctx;
    c.save();
    if (opts.alpha !== undefined) c.globalAlpha = opts.alpha;
    if (src.flip) {
      c.translate(dx + CHAR_W, dy);
      c.scale(-1, 1);
      c.drawImage(this.sheet.canvas, src.x, src.y, CHAR_W, h, 0, 0, CHAR_W, h);
    } else {
      c.drawImage(this.sheet.canvas, src.x, src.y, CHAR_W, h, dx, dy, CHAR_W, h);
    }
    c.restore();
  }
}
