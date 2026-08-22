/**
 * Actors.
 *
 * Grid-locked position with a smooth pixel tween between tiles. Everything that
 * walks -- the player, NPCs, scripted movers -- uses this, so a cutscene can
 * drive an NPC with exactly the same movement code the player uses.
 *
 * Feel notes: tapping a direction you are not facing *turns* rather than moves,
 * which is what stops the player overshooting when they only meant to look at
 * something. Holding past the turn window walks. This is the single most
 * important piece of "does walking feel good".
 */

import { TILE_SIZE } from '../gfx/tileset.js';
import { CharSheet, getCharSheet, CHAR_H, CHAR_W, type CharDir } from '../gfx/charsprite.js';
import type { Renderer } from '../engine/renderer.js';
import type { Direction } from '../data/schema.js';

export const WALK_FRAMES = 14;
export const RUN_FRAMES = 8;
export const CYCLE_FRAMES = 5;
/** Frames a direction must be held before a turn becomes a step. */
export const TURN_WINDOW = 4;

export const DIR_VEC: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

export class Actor {
  tileX: number;
  tileY: number;
  facing: Direction = 'down';

  /** Pixel offset from the tile origin while a step is in progress. */
  offsetX = 0;
  offsetY = 0;

  moving = false;
  private moveDir: Direction = 'down';
  private moveTimer = 0;
  private moveDuration = WALK_FRAMES;

  /** Where the actor will be when the current step lands. */
  targetX: number;
  targetY: number;

  animStep = 0;
  private animTimer = 0;
  /** Set while standing still so the sprite settles on the neutral frame. */
  private idleFrames = 0;

  /** A ledge hop arcs the sprite upward as it crosses. */
  hopping = false;
  private hopHeight = 0;

  visible = true;
  sheet: CharSheet;

  constructor(public spriteId: string, x: number, y: number, facing: Direction = 'down') {
    this.tileX = x;
    this.tileY = y;
    this.targetX = x;
    this.targetY = y;
    this.facing = facing;
    this.sheet = getCharSheet(spriteId);
  }

  setSprite(spriteId: string): void {
    this.spriteId = spriteId;
    this.sheet = getCharSheet(spriteId);
  }

  /** Begin a step. Caller is responsible for having checked collision. */
  step(dir: Direction, frames = WALK_FRAMES, hop = false): void {
    if (this.moving) return;
    const v = DIR_VEC[dir];
    this.facing = dir;
    this.moveDir = dir;
    this.moving = true;
    this.hopping = hop;
    this.moveTimer = 0;
    this.moveDuration = hop ? Math.max(frames, 18) : frames;
    // A hop crosses two tiles: the ledge itself and the landing tile.
    const dist = hop ? 2 : 1;
    this.targetX = this.tileX + v.x * dist;
    this.targetY = this.tileY + v.y * dist;
  }

  face(dir: Direction): void {
    if (!this.moving) this.facing = dir;
  }

  /** Advance one simulation tick. Returns true on the tick a step completes. */
  update(): boolean {
    if (!this.moving) {
      this.idleFrames++;
      // Settle onto the neutral frame after a short beat, not instantly: an
      // immediate snap makes stop-start walking look jittery.
      if (this.idleFrames > 2) {
        this.animStep = 0;
        this.animTimer = 0;
      }
      return false;
    }

    this.idleFrames = 0;
    this.moveTimer++;
    this.animTimer++;
    if (this.animTimer >= CYCLE_FRAMES) {
      this.animTimer = 0;
      this.animStep = (this.animStep + 1) % CharSheet.CYCLE.length;
    }

    const t = this.moveTimer / this.moveDuration;
    const v = DIR_VEC[this.moveDir];
    const dist = this.hopping ? 2 : 1;
    const px = v.x * TILE_SIZE * dist * t;
    const py = v.y * TILE_SIZE * dist * t;
    this.offsetX = Math.round(px);
    this.offsetY = Math.round(py);
    this.hopHeight = this.hopping ? Math.round(Math.sin(t * Math.PI) * 12) : 0;

    if (this.moveTimer >= this.moveDuration) {
      this.tileX = this.targetX;
      this.tileY = this.targetY;
      this.offsetX = 0;
      this.offsetY = 0;
      this.hopHeight = 0;
      this.moving = false;
      this.hopping = false;
      return true;
    }
    return false;
  }

  /** Top-left pixel position of the actor's tile, including the tween. */
  get pixelX(): number { return this.tileX * TILE_SIZE + this.offsetX; }
  get pixelY(): number { return this.tileY * TILE_SIZE + this.offsetY; }

  /** The tile directly in front of the actor. */
  facingTile(): { x: number; y: number } {
    const v = DIR_VEC[this.facing];
    return { x: this.tileX + v.x, y: this.tileY + v.y };
  }

  /** Sort key so actors lower on the screen draw in front. */
  get depth(): number { return this.pixelY; }

  render(r: Renderer, opts: { hideLegs?: boolean; alpha?: number } = {}): void {
    if (!this.visible) return;
    const src = this.sheet.src(this.facing as CharDir, this.animStep);

    // Positioned in buffer pixels so sprites share the tile grid exactly.
    const groundX = r.worldPX(this.pixelX + TILE_SIZE / 2);
    const groundY = r.worldPY(this.pixelY + TILE_SIZE);
    const dx = groundX - CHAR_W / 2;
    const dy = groundY - CHAR_H - Math.round(this.hopHeight * 2);

    // Contact shadow: without it a sprite reads as floating, and it is the only
    // cue that says how high a hop actually is.
    if (!opts.hideLegs) {
      const lift = Math.max(0, this.hopHeight);
      r.ellipsePixel(groundX, groundY - 2, 9 - lift * 0.2, 3.2, `rgba(16,20,28,${0.34 - lift * 0.012})`);
    }

    // Standing in tall grass hides the legs, which is what sells "waist-deep".
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
