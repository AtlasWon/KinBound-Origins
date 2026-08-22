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
import { DETAIL, type Renderer } from '../engine/renderer.js';
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

/* ---------------------------------------------------------------- idling */

/** Length of one breath. Slow enough to read as calm, not as a heartbeat. */
export const IDLE_PERIOD_MS = 1500;

/**
 * A world that has not ticked for this long has been paused -- a dialogue box,
 * a menu, a fade. Comfortably longer than the gap between two simulation ticks
 * even on a fast display, comfortably shorter than a conversation.
 */
const PAUSE_MS = 120;

/**
 * A character's phase within the breath, 0..1.
 *
 * Hashed from something the character always has rather than drawn from the
 * RNG. A crowd has to look unsynchronised, but it also has to breathe the same
 * way every time you walk into the room; a random phase makes every visit to a
 * scene subtly different and every screenshot impossible to reproduce.
 */
export function idlePhase(key: string): number {
  // FNV-1a rather than a running sum: the keys here are near-identical short
  // strings ("girl@12,7" next to "girl@13,7"), and a sum leaves neighbours a
  // hair apart, which is the one arrangement where a crowd still pulses
  // together.
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 997) / 997;
}

/**
 * Vertical lift of a standing sprite, in buffer pixels.
 *
 * One authoring pixel -- DETAIL buffer pixels -- and never anything finer:
 * half a design pixel does not read as a breath, it reads as the sprite
 * failing to hold still. It steps rather than eases for the same reason, since
 * there is nowhere between the two positions to be.
 *
 * Read off the wall clock instead of a tick counter because the overworld
 * stops updating characters the moment a dialogue box opens, and someone who
 * turns to stone as soon as you speak to them is worse than someone who never
 * breathed in the first place.
 */
export function idleBob(phase: number): number {
  const t = (performance.now() / IDLE_PERIOD_MS + phase) % 1;
  // Lifted for rather less than half the cycle. The long beat at the bottom is
  // what makes it read as drawing a breath rather than as hovering.
  return Math.sin(t * Math.PI * 2) > 0.35 ? DETAIL : 0;
}

/** True once the world has stopped ticking, given when it last did. */
export function worldPaused(lastTickAt: number): boolean {
  return performance.now() - lastTickAt > PAUSE_MS;
}

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

  /**
   * Where this actor sits in the breath cycle. Seeded from the tile it spawned
   * on, which is unique on a map and identical on every run, and kept across a
   * `setSprite` so a character that changes clothes does not skip a beat.
   */
  private readonly idleSeed: number;

  /** When `update` last ran, so a paused world can be told from a still one. */
  private updatedAt = performance.now();

  constructor(public spriteId: string, x: number, y: number, facing: Direction = 'down') {
    this.tileX = x;
    this.tileY = y;
    this.targetX = x;
    this.targetY = y;
    this.facing = facing;
    this.sheet = getCharSheet(spriteId);
    this.idleSeed = idlePhase(`${spriteId}@${x},${y}`);
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
    this.updatedAt = performance.now();

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

  /**
   * Breathing rather than walking.
   *
   * An actor frozen part-way through a step because the world stopped ticking
   * counts as standing too: nothing is going to move it until the box closes,
   * and a statue holding a stride pose for the length of a conversation is the
   * exact thing the idle exists to get rid of. A ledge hop is never standing --
   * it owns the sprite's height on its own.
   */
  private get standing(): boolean {
    if (this.hopping) return false;
    return !this.moving || worldPaused(this.updatedAt);
  }

  render(r: Renderer, opts: { hideLegs?: boolean; alpha?: number } = {}): void {
    if (!this.visible) return;
    const standing = this.standing;
    // The neutral frame is forced only for an actor caught mid-step by a pause.
    // While the world is running, update()'s short settle window owns the frame:
    // snapping to neutral the instant a step lands is what made stop-start
    // walking look jittery.
    const src = this.sheet.src(this.facing as CharDir, standing && this.moving ? 0 : this.animStep);
    const bob = standing ? idleBob(this.idleSeed) : 0;

    // Positioned in buffer pixels so sprites share the tile grid exactly.
    const groundX = r.worldPX(this.pixelX + TILE_SIZE / 2);
    const groundY = r.worldPY(this.pixelY + TILE_SIZE);
    const dx = groundX - CHAR_W / 2;
    const dy = groundY - CHAR_H - Math.round(this.hopHeight * 2) - bob;

    // Contact shadow: without it a sprite reads as floating, and it is the only
    // cue that says how high a hop actually is. It is deliberately not given the
    // idle bob -- a shadow pinned to the ground while the body lifts is the
    // whole reason the bob reads as a breath and not as the sprite sliding.
    if (!opts.hideLegs) {
      const lift = Math.max(0, this.hopHeight);
      r.ellipsePixel(groundX, groundY - 2, 9 - lift * 0.2, 3.2, `rgba(16,20,28,${0.34 - lift * 0.012})`);
    }

    // Standing in tall grass hides the legs, which is what sells "waist-deep".
    // The cut is pulled back down by the bob so the grass line stays put: let it
    // ride up with the body and the character looks like they are climbing out
    // of the grass once a second instead of breathing in it.
    let h = opts.hideLegs ? CHAR_H - 12 : CHAR_H;
    if (opts.hideLegs) h -= bob;

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
