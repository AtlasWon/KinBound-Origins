/**
 * Overworld.
 *
 * Map rendering, player movement, NPC behaviour, interaction, warps and wild
 * encounters. This is where "does the game feel good" is won or lost, so the
 * movement rules here are deliberate rather than incidental -- see the notes on
 * the turn window, the input buffer and ledge hops.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
import { DETAIL, Renderer, SCREEN_H, SCREEN_W } from '../engine/renderer.js';
import { T, TILE_PX, TILE_SIZE, Tileset } from '../gfx/tileset.js';
import { TileMap, type AsciiMapFile } from '../world/tilemap.js';
import { Actor, DIR_VEC, WALK_FRAMES } from '../world/actor.js';
import { BODY_H, BODY_W, PlayerBody, SCRIPT_RUN_SPEED, WALK_SPEED } from '../world/body.js';
import { ask, say } from '../ui/dialogue.js';
import type { Direction, MapNpc, MapObject, MapWarp } from '../data/schema.js';
import { GameState } from '../systems/state.js';
import { BattleScene } from './battle.js';
import { MainMenuScene } from './mainmenu.js';
import { PartyScene } from './party.js';
import { BagScene } from './bag.js';
import { VellumScene } from './vellum.js';
import { RegionMapScene } from './regionmap.js';
import { EventRunner } from '../systems/eventvm.js';
import { audio } from '../audio/audio.js';
import { autosave } from '../systems/save.js';
import { OverworldEventHost } from './eventHost.js';
import {
  areaFrames, areaStyleOf, drawAreaCover, drawShutters,
  type AreaStyle, type WipeDir,
} from '../ui/transition.js';
import { ICON_SIZE, iconSprite } from '../gfx/kinsprite.js';
import { createKin, type Kin } from '../systems/kin.js';
import { registry } from '../data/registry.js';
import type { Battle } from '../battle/battle.js';
import type { AiTier, EncounterMethod, EncounterTable } from '../data/schema.js';

type Fade = {
  active: boolean; t: number; dir: 'out' | 'in'; frames: number;
  then?: () => void | Promise<void>;
  /**
   * Set once an out-fade has finished closing and its callback is still
   * working. The cover stays pinned at full while this is true, which is what
   * stops the world underneath being shown mid-transition.
   */
  holding: boolean;
  /** How the cover is drawn. 'warp' is the plain black tint every other caller wants. */
  style?: AreaStyle;
  wipeDir?: WipeDir;
};

/**
 * How far off to one side an NPC may stand and still answer, in pixels.
 *
 * Three quarters of a tile. Wide enough that no reasonable attempt to talk to
 * somebody misses; narrow enough that the person you are pointing at is always
 * nearer than the one beside them, which is what decides a tie in a crowd.
 */
const TALK_SPREAD = 12;

interface NpcInstance {
  data: MapNpc;
  actor: Actor;
  /** Steps taken along a scripted path / pace. */
  progress: number;
  cooldown: number;
  homeX: number;
  homeY: number;
}

export class OverworldScene implements Scene {
  readonly name = 'overworld';

  private tileset!: Tileset;
  map!: TileMap;
  player!: PlayerBody;
  npcs: NpcInstance[] = [];

  private camTargetX = 0;
  private camTargetY = 0;

  private fade: Fade = { active: false, t: 0, dir: 'in', frames: 20, holding: false };
  private banner = { text: '', t: 0 };

  /** Steps since the last wild encounter, used to smooth out the RNG. */
  private stepsSinceEncounter = 0;
  private encounters?: EncounterTable;
  private scripted: { actor: Actor; steps: Direction[]; frames: number; done: () => void }[] = [];
  private timers: { left: number; done: () => void }[] = [];
  private events?: EventRunner;
  /** Last tile the player occupied, so tile-entry fires exactly once. */
  private lastTile = { x: -1, y: -1 };
  /** Walk-cycle frame at the last footfall check. */
  private lastAnimStep = 0;
  /** Pushable stones, rebuilt from map data on every load. */
  private boulders: {
    id: string; x: number; y: number;
    offX: number; offY: number; t: number; frames: number; dx: number; dy: number;
  }[] = [];
  /** NPC currently showing an alert bubble, and how long it has left. */
  private alert: { npcId: string; t: number } | null = null;
  /**
   * The wipe that carries the field into a battle. Kept here rather than in the
   * battle scene because it has to start while the map is still the thing on
   * screen -- a transition that only begins once the battle scene exists always
   * reads as a stutter followed by an effect.
   */
  private wipe: { t: number; frames: number; then?: () => void } | null = null;
  busy = false;

  constructor(public state: GameState, private startMap: string, private startX: number, private startY: number, private startFacing: Direction = 'down') {}

  async enter(game: Game): Promise<void> {
    this.tileset = new Tileset();
    this.events = new EventRunner(new OverworldEventHost(game, this));
    this.player = new PlayerBody(this.state.appearance, this.startX, this.startY, this.startFacing);
    await this.loadMap(game, this.startMap, this.startX, this.startY, this.startFacing, false);
    this.snapCamera();
    this.beginFade('in', 24);
  }

  /* ------------------------------------------------------------ map load */

  /**
   * The last line of defence against a save naming a map that is not there.
   *
   * save.ts migrates ids forward, but a save carried across a rename that the
   * table missed would otherwise land the player in a failed fetch and a black
   * screen. The manifest is the truth about what exists, so anything not in it
   * falls back to the respawn point and then to the player's own bedroom --
   * both of which are always shipped.
   */
  private resolveMap(id: string): { id: string; x?: number; y?: number } {
    if (registry.has('maps', id)) return { id };
    console.warn(`map "${id}" does not exist; falling back`);
    const respawn = this.state.respawnMap;
    if (respawn !== id && registry.has('maps', respawn)) {
      return { id: respawn, x: this.state.respawnX, y: this.state.respawnY };
    }
    return { id: 'hearthmere_house_player', x: 6, y: 5 };
  }

  async loadMap(
    game: Game, wanted: string, x: number, y: number, facing: Direction, showBanner = true,
  ): Promise<void> {
    const fallback = this.resolveMap(wanted);
    const id = fallback.id;
    if (id !== wanted) {
      x = fallback.x ?? x;
      y = fallback.y ?? y;
      facing = 'down';
    }
    const file = await game.assets.loadJson<AsciiMapFile>(`data/maps/${id}.json`);
    this.map = new TileMap(file);
    this.state.currentMap = id;
    this.state.currentX = x;
    this.state.currentY = y;
    this.state.currentFacing = facing;

    this.player.setTile(x, y);
    this.player.facing = facing;
    this.lastTile = { x, y };

    this.npcs = this.map.npcs
      .filter((n) => this.npcVisible(n))
      .map((n) => ({
        data: n,
        actor: new Actor(n.sprite, n.x, n.y, n.facing),
        progress: 0,
        cooldown: 30 + Math.floor(Math.random() * 60),
        homeX: n.x,
        homeY: n.y,
      }));

    this.rebuildObstacles();
    this.state.visitMap(id);
    this.snapCamera();

    // Per-map content loads alongside the map itself.
    await registry.loadDialogueFor(game.assets, id);
    await registry.loadScriptsFor(game.assets, id);
    this.encounters = this.map.encounterTable
      ? await registry.loadEncounters(game.assets, this.map.encounterTable)
      : undefined;

    audio.playMusic(this.map.music);

    if (showBanner && this.map.displayName) {
      this.banner = { text: this.map.displayName, t: 150 };
    }

    // Kin Clinics are the game's natural checkpoint, so that is where the
    // autosave fires rather than on some arbitrary timer.
    if (game.settings.autosave && id.includes('clinic')) {
      this.state.playTime = game.playTime;
      const result = autosave(this.state, this.map.name, game.playTime);
      if (!result.ok) console.warn('autosave failed:', result.error);
    }

    // 'enter' scripts fire once the map is fully in place.
    for (const script of registry.scripts.values()) {
      if (script.trigger !== 'enter') continue;
      if (script.map !== id) continue;
      if (this.events?.start(script)) break;
    }
  }

  /** Coming back from a battle or a menu: put the map's own music back on. */
  resume(_game: Game): void {
    if (this.map) audio.playMusic(this.map.music);
  }

  private npcVisible(n: MapNpc): boolean {
    if (n.requiresFlag && !this.state.hasFlag(n.requiresFlag)) return false;
    if (n.hiddenIfFlag && this.state.hasFlag(n.hiddenIfFlag)) return false;
    return true;
  }

  /* -------------------------------------------------------------- camera */

  private clampCamera(cx: number, cy: number): { x: number; y: number } {
    const maxX = Math.max(0, this.map.pixelWidth - SCREEN_W);
    const maxY = Math.max(0, this.map.pixelHeight - SCREEN_H);
    let x = Math.max(0, Math.min(maxX, cx));
    let y = Math.max(0, Math.min(maxY, cy));
    // Maps smaller than the screen sit centred rather than pinned to a corner.
    if (this.map.pixelWidth < SCREEN_W) x = -Math.floor((SCREEN_W - this.map.pixelWidth) / 2);
    if (this.map.pixelHeight < SCREEN_H) y = -Math.floor((SCREEN_H - this.map.pixelHeight) / 2);
    return { x, y };
  }

  private desiredCamera(): { x: number; y: number } {
    return this.clampCamera(
      this.player.centerX - SCREEN_W / 2,
      this.player.footY - TILE_SIZE / 2 - SCREEN_H / 2,
    );
  }

  private snapCamera(): void {
    const d = this.desiredCamera();
    this.camTargetX = d.x;
    this.camTargetY = d.y;
  }

  /* ---------------------------------------------------------- collisions */

  /** Can the player enter this tile from `from`? */
  canEnter(x: number, y: number, from: Direction): boolean {
    if (!this.map.inBounds(x, y)) {
      // Edge warps let the player walk off the map on purpose.
      return this.map.warpAt(x, y) !== undefined;
    }
    const c = this.map.collisionAt(x, y);

    if (this.npcs.some((n) => !n.actor.moving && n.actor.tileX === x && n.actor.tileY === y)) return false;
    if (this.npcs.some((n) => n.actor.moving && n.actor.targetX === x && n.actor.targetY === y)) return false;
    if (this.boulderAt(x, y)) return false;

    switch (c) {
      case 0: case 6: return true;
      case 1: return false;
      case 2: return this.map.freeWade || this.state.hasArt('wade');
      case 8: return this.state.hasArt('swim');
      case 7: return this.map.freeWade || this.state.hasArt('wade');
      case 3: return from === 'down';   // ledges are entered only downward
      case 4: return from === 'left';
      case 5: return from === 'right';
      default: return false;
    }
  }

  /* --------------------------------------------------------- field arts */

  /**
   * Obstacles are map objects, not terrain, so their state can live in the
   * save. Anything already cleared is opened up here on load; pushable stones
   * return to their starting positions, which is what makes a stone puzzle
   * retryable by simply walking out and back in.
   */
  private rebuildObstacles(): void {
    this.boulders = [];
    for (const o of this.map.objects) {
      if (o.kind === 'cuttable') {
        if (o.flag && this.state.hasFlag(o.flag)) this.openTile(o.x, o.y);
      } else if (o.kind === 'pushable') {
        this.boulders.push({
          id: `${o.x},${o.y}`, x: o.x, y: o.y,
          offX: 0, offY: 0, t: 0, frames: 0, dx: 0, dy: 0,
        });
      }
    }
    this.updatePlates();
  }

  /** Permanently open a blocked tile (a cut bramble). */
  private openTile(x: number, y: number): void {
    if (!this.map.inBounds(x, y)) return;
    const i = this.map.index(x, y);
    this.map.collision[i] = 0;
    this.map.over[i] = 0;
  }

  private boulderAt(x: number, y: number) {
    return this.boulders.find((b) => b.x === x && b.y === y);
  }

  /**
   * Push a stone one tile. Returns true when the push succeeded, in which case
   * the caller lets the player walk into the tile it vacated.
   */
  private tryPush(dir: Direction, x: number, y: number): boolean {
    const boulder = this.boulderAt(x, y);
    if (!boulder) return false;
    if (!this.map.freePush && !this.state.hasArt('shoulder')) return false;
    if (boulder.frames > 0) return false;

    const v = DIR_VEC[dir];
    const tx = x + v.x;
    const ty = y + v.y;
    if (!this.map.inBounds(tx, ty)) return false;
    if (this.map.collisionAt(tx, ty) !== 0) return false;
    if (this.boulderAt(tx, ty)) return false;
    if (this.npcs.some((n) => n.actor.tileX === tx && n.actor.tileY === ty)) return false;

    boulder.x = tx;
    boulder.y = ty;
    boulder.dx = v.x;
    boulder.dy = v.y;
    boulder.t = 0;
    boulder.frames = WALK_FRAMES;
    audio.playSfx('push_stone');
    return true;
  }

  private updateBoulders(): void {
    for (const b of this.boulders) {
      if (b.frames <= 0) continue;
      b.t++;
      const p = 1 - b.t / b.frames;
      b.offX = Math.round(-b.dx * TILE_SIZE * p);
      b.offY = Math.round(-b.dy * TILE_SIZE * p);
      if (b.t >= b.frames) {
        b.frames = 0;
        b.offX = 0;
        b.offY = 0;
        this.updatePlates();
      }
    }
  }

  /**
   * Count stones sitting on pressure plates and publish it as a story variable,
   * so the door that opens is authored in JSON rather than wired in here.
   */
  private updatePlates(): void {
    const plates = this.map.objects.filter((o) => o.kind === 'switch');
    if (plates.length === 0) return;
    let pressed = 0;
    for (const plate of plates) {
      const down = this.boulderAt(plate.x, plate.y) !== undefined;
      if (down) pressed++;
      const i = this.map.index(plate.x, plate.y);
      this.map.ground[i] = down ? T.PLATE_DOWN : T.PLATE;
    }
    const key = `${this.map.id}_plates`;
    const was = this.state.getVar(key);
    this.state.setVar(key, pressed);
    if (pressed !== was && pressed === plates.length) audio.playSfx('badge');
  }

  /** Interacting with a bramble wall: cut it if the player has the art. */
  private tryCut(game: Game, obj: MapObject): boolean {
    if (obj.kind !== 'cuttable') return false;
    if (obj.flag && this.state.hasFlag(obj.flag)) return false;

    if (!this.state.hasArt('clear')) {
      this.busy = true;
      say(game, [
        'A wall of thorn, woven too tight to push through.',
        'Something could cut this.',
      ], { onDone: () => { this.busy = false; } });
      return true;
    }

    this.busy = true;
    ask(game, ['Cut it away?'], (yes) => {
      if (!yes) { this.busy = false; return; }
      if (obj.flag) this.state.setFlag(obj.flag);
      this.openTile(obj.x, obj.y);
      audio.playSfx('fx_leaf');
      game.renderer.shake(8, 1);
      say(game, ['The thorn wall came apart.'], { onDone: () => { this.busy = false; } });
    });
    return true;
  }

  /* --------------------------------------------------------------- input */

  private heldDir(game: Game): Direction | null {
    const i = game.input;
    // Last-pressed wins, so a diagonal roll on the keyboard resolves cleanly
    // instead of locking to whichever key the poll order happened to see first.
    if (i.down('up') && i.heldFrames('up') <= i.heldFrames('down') || (i.down('up') && !i.down('down'))) {
      if (!i.down('left') && !i.down('right')) return 'up';
    }
    if (i.down('down') && !i.down('up') && !i.down('left') && !i.down('right')) return 'down';
    if (i.down('left') && !i.down('right')) return 'left';
    if (i.down('right') && !i.down('left')) return 'right';
    if (i.down('up')) return 'up';
    if (i.down('down')) return 'down';
    return null;
  }

  update(game: Game, _dt: number): void {
    if (!this.map) return;
    this.updateFade();
    if (this.banner.t > 0) this.banner.t--;

    this.updateScripted();
    this.updateBoulders();
    this.updateWipe();
    if (this.wipe) { this.updateCamera(); return; }

    if (this.events?.running) {
      this.events.update();
      this.updateCamera();
      return;
    }

    if (this.fade.active || this.busy) {
      this.updateCamera();
      return;
    }

    if (this.openMenus(game)) { this.updateCamera(); return; }

    this.updatePlayer(game);
    this.updateNpcs(game);
    this.updateCamera();
  }


  /** Menu hotkeys. Returns true when a screen was opened this frame. */
  private openMenus(game: Game): boolean {
    if (this.player.moving) return false;
    if (game.input.pressed('menu')) {
      game.scenes.push(new MainMenuScene(this.state, this.map.displayName ?? this.map.name));
      return true;
    }
    if (game.input.pressed('party') && this.state.party.length > 0) {
      game.scenes.push(new PartyScene(this.state));
      return true;
    }
    if (game.input.pressed('bag')) {
      game.scenes.push(new BagScene(this.state));
      return true;
    }
    if (game.input.pressed('vellum') && this.state.hasItem('vellum')) {
      game.scenes.push(new VellumScene(this.state));
      return true;
    }
    if (game.input.pressed('map')) {
      game.scenes.push(new RegionMapScene(this.state));
      return true;
    }
    return false;
  }

  private updatePlayer(game: Game): void {
    // Scripted walks and ledge hops own the body until they finish.
    if (this.player.busy) {
      this.player.update(0, 0, () => true);
      this.afterMove(game);
      return;
    }

    const i = game.input;
    const ax = (i.down('right') ? 1 : 0) - (i.down('left') ? 1 : 0);
    const ay = (i.down('down') ? 1 : 0) - (i.down('up') ? 1 : 0);

    if (ax !== 0 || ay !== 0) {
      // A ledge is entered by walking at it, and only from the right side.
      const ledge = this.ledgeAhead(ax, ay);
      if (ledge) {
        audio.playSfx('ledge_hop');
        this.player.startHop(ledge);
      } else {
        this.player.update(ax, ay, this.solidTest);
      }
    } else {
      this.player.update(0, 0, this.solidTest);
    }

    this.afterMove(game);

    if (i.pressed('confirm')) this.interact(game);
  }

  /**
   * Which tiles the player's feet box is standing in *right now*.
   *
   * THE PLAYER IS A BODY, NOT A GRID SQUARE. `tileX`/`tileY` name the single
   * tile the centre of the feet box sits in, but the box is 11x9 on a 16px
   * grid, so for most of every step it is inside two tiles at once -- up to
   * eight pixels of it in the tile behind. Anything that asks "is the player
   * on this tile" using those two numbers is therefore wrong by most of a
   * tile, and the half it misses is a place other actors think is empty.
   *
   * Everything that decides whether somebody else may stand somewhere has to
   * ask this instead. See trainerApproach and npcCanEnter.
   */
  private playerCovers(tx: number, ty: number): boolean {
    const left = Math.floor(this.player.x / TILE_SIZE);
    const right = Math.floor((this.player.x + BODY_W - 1) / TILE_SIZE);
    const top = Math.floor(this.player.y / TILE_SIZE);
    const bottom = Math.floor((this.player.y + BODY_H - 1) / TILE_SIZE);
    return tx >= left && tx <= right && ty >= top && ty <= bottom;
  }

  /**
   * Is this step carrying the player *out* of a tile their body is already
   * standing in?
   *
   * A last line of defence, and the reason it exists is worth writing down: an
   * actor that ends up occupying a tile the player is partly inside makes every
   * direction solid at once, because collision is tested against the whole box
   * and the box cannot leave a tile it is already in without being inside it on
   * the way. That is a permanent freeze -- no fade, no flag, nothing on screen
   * to explain it, and the only cure a reload.
   *
   * So a body that is already overlapping is always allowed to reduce the
   * overlap. Only the direction that reduces it opens up, so nobody can be
   * walked through: from outside, the box is not overlapping, and the tile is
   * as solid as it ever was.
   */
  private escapingFrom(tx: number, ty: number, from: Direction): boolean {
    if (!this.playerCovers(tx, ty)) return false;
    const cx = tx * TILE_SIZE + TILE_SIZE / 2;
    const cy = ty * TILE_SIZE + TILE_SIZE / 2;
    const px = this.player.centerX;
    const py = this.player.y + BODY_H / 2;
    switch (from) {
      case 'left': return cx >= px;
      case 'right': return cx <= px;
      case 'up': return cy >= py;
      default: return cy <= py;
    }
  }

  /** Solid test used by the body. Bound once so it is cheap to pass around. */
  private solidTest = (tx: number, ty: number, from: Direction): boolean => {
    if (!this.map.inBounds(tx, ty)) return this.map.warpAt(tx, ty) === undefined;
    const c = this.map.collisionAt(tx, ty);

    if (this.boulderAt(tx, ty)) return true;
    for (const n of this.npcs) {
      const there = (n.actor.tileX === tx && n.actor.tileY === ty)
        || (n.actor.moving && n.actor.targetX === tx && n.actor.targetY === ty);
      if (there) return !this.escapingFrom(tx, ty, from);
    }

    switch (c) {
      case 0: case 6: return false;
      case 1: return true;
      case 2: case 7: return !(this.map.freeWade || this.state.hasArt('wade'));
      case 8: return !this.state.hasArt('swim');
      // Ledges are handled before movement; they are solid to walk into.
      case 3: case 4: case 5: return true;
      default: return true;
    }
  };

  /** The direction of a ledge the player is pressing into, if any. */
  private ledgeAhead(ax: number, ay: number): Direction | null {
    const checks: [number, number, Direction, number][] = [
      [0, 1, 'down', 3],
      [-1, 0, 'left', 4],
      [1, 0, 'right', 5],
    ];
    for (const [dx, dy, dir, code] of checks) {
      if (dx !== 0 && Math.sign(ax) !== dx) continue;
      if (dy !== 0 && Math.sign(ay) !== dy) continue;
      const tx = this.player.tileX + dx;
      const ty = this.player.tileY + dy;
      if (!this.map.inBounds(tx, ty)) continue;
      if (this.map.collisionAt(tx, ty) !== code) continue;
      // Only hop when actually up against the edge, not from across the tile.
      const near = dy === 1
        ? this.player.footY % TILE_SIZE >= TILE_SIZE - 6
        : dx === -1
          ? this.player.x % TILE_SIZE <= 5
          : this.player.x % TILE_SIZE >= TILE_SIZE - 6;
      if (near) return dir;
    }
    return null;
  }

  /** Push a stone the player is leaning on. */
  private tryPushFromBody(game: Game): void {
    const i = game.input;
    const ax = (i.down('right') ? 1 : 0) - (i.down('left') ? 1 : 0);
    const ay = (i.down('down') ? 1 : 0) - (i.down('up') ? 1 : 0);
    if (ax === 0 && ay === 0) return;
    const dir: Direction = Math.abs(ay) > Math.abs(ax)
      ? (ay < 0 ? 'up' : 'down')
      : (ax < 0 ? 'left' : 'right');
    const v = DIR_VEC[dir];
    const tx = this.player.tileX + v.x;
    const ty = this.player.tileY + v.y;
    if (this.boulderAt(tx, ty)) this.tryPush(dir, tx, ty);
  }

  /**
   * Footfalls, played when the walk cycle plants a foot rather than when the
   * player crosses a tile boundary. On a grid those are the same moment; with
   * free movement they are not, and tying the sound to the animation is the
   * only version that stays in step at both walking and running speed.
   */
  private footsteps(): void {
    const step = this.player.animStep;
    if (step === this.lastAnimStep) return;
    this.lastAnimStep = step;
    // Frames 1 and 3 of the cycle are the passing poses: one foot down.
    if (step !== 1 && step !== 3) return;
    const terrain = this.map.terrainAt(this.player.tileX, this.player.tileY);
    const sound = terrain.step ? `step_${terrain.step}` : 'step_stone';
    audio.playSfx(sound, { volume: 0.9 });
  }

  /** Everything that keys off which tile the player is standing on. */
  private afterMove(game: Game): void {
    if (this.player.moving) this.footsteps();
    else this.lastAnimStep = 0;
    this.state.currentX = this.player.tileX;
    this.state.currentY = this.player.tileY;
    this.state.currentFacing = this.player.facing;

    if (!this.player.busy) this.tryPushFromBody(game);

    const x = this.player.tileX;
    const y = this.player.tileY;
    if (this.lastTile.x === x && this.lastTile.y === y) return;
    this.lastTile = { x, y };
    this.onEnterTile(game, x, y);
  }

  private onEnterTile(game: Game, x: number, y: number): void {

    const warp = this.map.warpAt(x, y);
    if (warp) { this.doWarp(game, warp); return; }

    const obj = this.map.objectAt(x, y);
    if (obj?.kind === 'item' && obj.flag && !this.state.hasFlag(obj.flag)) {
      this.state.setFlag(obj.flag);
      const n = obj.quantity ?? 1;
      this.state.giveItem(obj.item!, n);
      this.busy = true;
      say(game, [`You found ${n > 1 ? `${n} ` : ''}${this.state.itemName(obj.item!)}${n > 1 ? 's' : ''}!`], {
        onDone: () => { this.busy = false; },
      });
      return;
    }

    if (this.checkStepScripts()) return;
    if (this.checkSight(game)) return;

    const terrain = this.map.terrainAt(x, y);
    if (terrain.encounter) {
      this.stepsSinceEncounter++;
      this.tryEncounter(game);
    }
  }

  private tryEncounter(game: Game, method: EncounterMethod = 'tallGrass'): void {
    if (this.state.party.length === 0 || !this.state.partyIsAlive) return;

    const table = this.encounters?.methods[method];
    if (!table || table.slots.length === 0) return;

    // A short grace period after each battle stops the "three fights in four
    // steps" pattern that makes long grass exhausting rather than tense. The
    // chance then climbs with each safe step, so the average gap stays lively.
    if (this.stepsSinceEncounter < 3) return;
    const baseRate = (table.rate ?? 150) / 1000;
    const rate = baseRate + Math.min(0.12, this.stepsSinceEncounter * 0.004);
    if (!game.rng.chance(rate * 100)) return;

    const time = game.timeOfDay();
    const eligible = table.slots.filter((s) => {
      if (s.time && !s.time.includes(time)) return false;
      if (s.requiresFlag && !this.state.hasFlag(s.requiresFlag)) return false;
      return true;
    });
    if (eligible.length === 0) return;

    const slot = game.rng.pickWeighted(eligible, (s) => s.weight);
    const level = game.rng.int(slot.minLevel, slot.maxLevel);
    const wild = createKin(slot.species, level, game.rng);
    wild.metAt = this.map.id;

    this.stepsSinceEncounter = 0;
    this.busy = true;
    audio.playSfx('encounter');
    this.startBattle(game, {
      foeParty: [wild],
      isWild: true,
    });
  }

  /** Shared entry point for wild encounters, trainers and scripted battles. */
  startBattle(game: Game, opts: {
    foeParty: Kin[];
    isWild: boolean;
    trainerId?: string;
    aiTier?: AiTier;
    noFlee?: boolean;
    noCapture?: boolean;
    /** The challenge lines have already been delivered in the field. */
    skipIntroLines?: boolean;
    /**
     * Losing this fight must NOT trigger the standard blackout, because the
     * script that started it carries on regardless -- see onBattleFinished.
     */
    noWhiteout?: boolean;
    /** Called after the post-battle handling, for scripted battles. */
    onResolved?: (result: string) => void;
  }): void {
    this.busy = true;
    // Lead with the first conscious kin, the way the originals do.
    const lead = this.state.firstHealthyIndex();
    if (lead > 0) {
      const [k] = this.state.party.splice(lead, 1);
      if (k) this.state.party.unshift(k);
    }

    this.beginWipe(26, () => {
      game.scenes.push(new BattleScene({
        state: this.state,
        playerParty: this.state.party,
        foeParty: opts.foeParty,
        isWild: opts.isWild,
        trainerId: opts.trainerId,
        aiTier: opts.aiTier,
        backdrop: this.map.battleBackdrop,
        weather: this.map.weather,
        noFlee: opts.noFlee,
        noCapture: opts.noCapture,
        skipIntroLines: opts.skipIntroLines,
        onFinish: (result, battle) => this.onBattleFinished(game, result, battle, opts),
      }));
    });
  }

  private onBattleFinished(
    game: Game, result: string, battle: Battle,
    opts: {
      foeParty: Kin[]; isWild: boolean; trainerId?: string;
      noWhiteout?: boolean; onResolved?: (r: string) => void;
    },
  ): void {
    this.busy = false;
    // Scripts resume after the standard handling below has run.
    const resume = () => opts.onResolved?.(result);

    if (result === 'caught') {
      const caught = opts.foeParty[0];
      if (caught) {
        const where = this.state.addKin(caught);
        this.busy = true;
        const lines = where === 'party'
          ? [`${caught.name} joined the party.`]
          : where === 'storage'
            ? [`${caught.name} was sent to the Roost.`]
            : [`There was nowhere to put ${caught.name}. It slipped away.`];
        say(game, lines, { onDone: () => { this.busy = false; resume(); } });
      } else {
        resume();
      }
      return;
    }

    if (result === 'win') {
      if (opts.trainerId) {
        this.state.markDefeated(opts.trainerId);
        this.state.earn(battle.prize);
      }
      resume();
      return;
    }

    if (result === 'loss') {
      /*
       * A LOSS IS NOT ALWAYS A BLACKOUT, and assuming it was is what froze the
       * game solid after the first battle in Hearthmere.
       *
       * That fight is authored `onLoss: "continue"`: the script is meant to
       * carry on with Tarin's commiseration and then walk the player home to
       * be patched up, which is the game's entire teaching pass on healing.
       * The blackout ran anyway, so two owners were driving the overworld at
       * once -- the blackout holding `busy` until its own fade called back, and
       * the script running its scene and eventually warping. `beginFade`
       * overwrites one fade with the next, callback and all, so whichever
       * started second silently deleted the other's completion callback. When
       * the warp won, `busy` was never cleared again: the player stood in their
       * own bedroom, unable to move, with nothing left running to release them.
       *
       * Two owners is the bug; the fade collision is only how it presented. So
       * the fight that said not to blackout does not blackout, and the script
       * is the only thing driving the field.
       */
      if (!opts.noWhiteout) this.whiteout(game);
      resume();
      return;
    }

    resume();
  }

  /** Standard blackout: patch everyone up and wake at the last Kin Clinic. */
  private whiteout(game: Game): void {
    this.busy = true;
    say(game, [
      'Everything went quiet.',
      `${this.state.playerName} hurried back the way they came...`,
    ], {
      onDone: () => {
        this.state.healParty();
        const warmed = this.prefetch(game, this.state.respawnMap);
        this.beginFade('out', 24, async () => {
          await warmed;
          await this.loadMap(game, this.state.respawnMap, this.state.respawnX, this.state.respawnY, 'down');
          this.snapCamera();
          this.beginFade('in', 24, () => { this.busy = false; });
        });
      },
    });
  }


  /**
   * Step triggers. A script lists the tiles it fires on, so a cutscene, a gate
   * check or a one-way plot beat is authored entirely in JSON.
   */
  private checkStepScripts(): boolean {
    if (this.events?.running) return false;
    const { tileX: x, tileY: y } = this.player;
    for (const script of registry.scripts.values()) {
      if (script.trigger !== 'step') continue;
      if (script.map && script.map !== this.map.id) continue;
      if (!script.at?.some((t) => t.x === x && t.y === y)) continue;
      if (this.events?.start(script)) return true;
    }
    return false;
  }

  /* --------------------------------------------------------- trainers */

  /**
   * Trainers see straight ahead, up to their range, and solid tiles block the
   * line. Being spotted is a hard interrupt: the player has already walked into
   * it, so the game commits rather than asking.
   */
  private checkSight(game: Game): boolean {
    if (this.busy || this.events?.running) return false;
    for (const n of this.npcs) {
      const tid = n.data.trainer;
      if (!tid || this.state.hasDefeated(tid)) continue;
      const range = n.data.sightRange ?? 4;
      const v = DIR_VEC[n.actor.facing];
      for (let d = 1; d <= range; d++) {
        const tx = n.actor.tileX + v.x * d;
        const ty = n.actor.tileY + v.y * d;
        if (!this.map.inBounds(tx, ty)) break;
        const col = this.map.collisionAt(tx, ty);
        if (col === 1) break;
        if (this.player.tileX === tx && this.player.tileY === ty) {
          this.trainerApproach(game, n, tid, d);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Being spotted.
   *
   * Four beats, in this order, because the order is what makes it feel
   * authored rather than abrupt: the bubble pops and the world stops; the
   * music cuts to the challenge sting; the trainer closes the distance on
   * foot; and only then do they speak. The battle itself is the punchline, so
   * nothing about it starts until the line has landed.
   *
   * The player is turned to face the trainer immediately. Being talked at by
   * the back of your own head is the single most common way this sequence goes
   * wrong.
   */
  private trainerApproach(game: Game, npc: NpcInstance, trainerId: string, distance: number): void {
    this.busy = true;
    this.alert = { npcId: npc.data.id, t: 0 };
    this.player.facing = this.opposite(npc.actor.facing);
    audio.playSfx('spotted');
    audio.stopMusic();

    this.scriptedWait(26, () => {
      audio.playSfx('encounter_trainer');
      this.scriptedWait(34, () => {
        this.alert = null;
        /*
         * Stop one tile short so they end up face to face -- but never on a
         * tile the player's body is standing in.
         *
         * THIS IS THE LOCK. `distance` is measured to the player's *tile*, and
         * the tile in front of it is very often a tile the player is also
         * physically in: the moment a trainer spots you the field goes busy, so
         * the body freezes exactly where the step had got to, and that is
         * hardly ever the middle of a tile. Walk into a sight line moving
         * sideways -- which is how anyone gets spotted on a road -- and the box
         * is straddling a boundary by up to eight pixels. The trainer then
         * walked into that overlap, became solid inside the player, and after
         * the battle every one of the four directions was blocked: the game
         * looked completely normal and the character simply could not move.
         *
         * So the walk stops at the last tile the player is not standing in. The
         * gap that leaves is at most half a tile, and the player is standing in
         * the half of it nearest the trainer, so it still reads as face to face.
         */
        const steps: Direction[] = new Array(
          this.approachSteps(npc.actor.tileX, npc.actor.tileY, npc.actor.facing, distance),
        ).fill(npc.actor.facing);
        this.scriptedMove(npc.data.id, steps, 'walk', () => {
          this.trainerChallenge(game, trainerId);
        });
      });
    });
  }

  /**
   * How many tiles a spotted trainer may close before they are standing in the
   * player. See the note in trainerApproach for why this is not `distance - 1`.
   */
  approachSteps(fromX: number, fromY: number, facing: Direction, distance: number): number {
    const v = DIR_VEC[facing];
    let room = 0;
    for (let s = 1; s <= distance - 1; s++) {
      if (this.playerCovers(fromX + v.x * s, fromY + v.y * s)) break;
      room = s;
    }
    return room;
  }

  /** The trainer's challenge lines, delivered in the field before the wipe. */
  private trainerChallenge(game: Game, trainerId: string): void {
    const trainer = registry.trainers.get(trainerId);
    if (!trainer || trainer.intro.length === 0) {
      this.startTrainerBattle(game, trainerId, true);
      return;
    }
    say(game, trainer.intro, {
      who: `${trainer.className} ${trainer.name}`,
      onDone: () => this.startTrainerBattle(game, trainerId, true),
    });
  }

  private startTrainerBattle(game: Game, trainerId: string, spoken = false): void {
    const trainer = registry.trainers.get(trainerId);
    if (!trainer) {
      console.warn(`overworld: unknown trainer "${trainerId}"`);
      this.busy = false;
      return;
    }
    const foeParty = trainer.party.map((m) => createKin(m.species, m.level, game.rng, {
      moves: m.moves,
      ability: m.ability,
      item: m.item,
      nature: m.nature,
      ivs: m.ivs,
      evs: m.evs,
      nickname: m.nickname,
      originalTrainer: trainer.name,
    }));
    this.startBattle(game, {
      foeParty,
      isWild: false,
      trainerId,
      aiTier: trainer.ai,
      noFlee: true,
      skipIntroLines: spoken,
    });
  }

  /**
   * The NPC the player is talking to, if any.
   *
   * The old rule was a single tile lookup: whoever was standing exactly on the
   * tile in front of you, and nobody else. On a grid that is the whole story,
   * because you are always parked on the middle of a tile -- but this game walks
   * freely, so "in front of you" is a continuous thing and lining up on the tile
   * grid by eye is a chore. Walk up to someone slightly off to one side, press
   * the key, and nothing happens.
   *
   * So the two axes are treated differently, which is the point. *Forward* stays
   * exactly as strict as it was: the row or column directly in front, one tile,
   * no reaching across a gap. *Sideways* is measured in pixels instead of tiles,
   * so being most of a tile off-centre is still close enough. Nothing that used
   * to work stops working, and the near-misses now land.
   *
   * Two guards stop that generosity going wrong. The nearest candidate wins, so
   * in a crowd the person you are actually pointing at answers rather than their
   * neighbour; and the tile the sideways part of the reach passes through has to
   * be open, so nobody gets talked to around the end of a counter or through the
   * corner of a wall.
   */
  private npcInFront(): NpcInstance | undefined {
    const v = DIR_VEC[this.player.facing];
    const px = this.player.tileX;
    const py = this.player.tileY;
    const vertical = v.y !== 0;

    let best: NpcInstance | undefined;
    let bestOff = Infinity;
    for (const n of this.npcs) {
      const a = n.actor;
      if (vertical ? a.tileY !== py + v.y : a.tileX !== px + v.x) continue;

      const off = vertical
        ? Math.abs(this.player.centerX - (a.pixelX + TILE_SIZE / 2))
        : Math.abs(this.player.footY - (a.pixelY + TILE_SIZE - 1));
      // Dead in line is always allowed, however the body happens to be sitting
      // inside its tile: the tolerance only ever widens the old rule.
      const inLine = vertical ? a.tileX === px : a.tileY === py;
      if (!inLine && off > TALK_SPREAD) continue;

      const cx = vertical ? a.tileX : px;
      const cy = vertical ? py : a.tileY;
      if (this.map.collisionAt(cx, cy) === 1) continue;

      if (off < bestOff) { bestOff = off; best = n; }
    }
    return best;
  }

  private interact(game: Game): void {
    const { x, y } = this.player.facingTile();

    const npc = this.npcInFront();
    if (npc) {
      npc.actor.face(this.opposite(this.player.facing));
      const tid = npc.data.trainer;
      if (tid) {
        const trainer = registry.trainers.get(tid);
        if (trainer && !this.state.hasDefeated(tid)) {
          this.startTrainerBattle(game, tid);
          return;
        }
        if (trainer?.afterward?.length) {
          this.busy = true;
          say(game, trainer.afterward, {
            who: `${trainer.className} ${trainer.name}`,
            onDone: () => { this.busy = false; },
          });
          return;
        }
      }
      const scriptId = npc.data.script ?? '';
      const script = registry.scripts.get(scriptId);
      // A scripted NPC runs its event; everything else falls back to the
      // flag-aware dialogue table, so most townsfolk need no script at all.
      if (script && this.events?.start(script)) return;
      this.busy = true;
      const lines = this.state.dialogueFor(scriptId, npc.data.id);
      say(game, lines, { who: this.state.speakerName(npc.data.id), onDone: () => { this.busy = false; } });
      return;
    }

    const obj = this.map.objectAt(x, y);
    if (obj && this.tryCut(game, obj)) return;
    if (obj && (obj.kind === 'sign' || obj.kind === 'script')) {
      this.busy = true;
      say(game, obj.text ?? ['...'], { onDone: () => { this.busy = false; } });
      return;
    }

    // Hidden items are found by searching the tile you are standing on.
    const here = this.map.objects.find(
      (o) => o.kind === 'hiddenItem' && o.x === this.player.tileX && o.y === this.player.tileY,
    );
    if (here?.flag && !this.state.hasFlag(here.flag)) {
      this.state.setFlag(here.flag);
      const n = here.quantity ?? 1;
      this.state.giveItem(here.item!, n);
      this.busy = true;
      say(game, [`Something was buried here!`, `Found ${n > 1 ? `${n} ` : ''}${this.state.itemName(here.item!)}${n > 1 ? 's' : ''}.`], {
        onDone: () => { this.busy = false; },
      });
    }
  }

  /* ------------------------------------------------ scripted control */

  /** Actor lookup for event scripts. 'player' is a reserved id. */
  actorFor(who: string): Actor | undefined {
    if (who === 'player') return undefined;
    return this.npcs.find((n) => n.data.id === who)?.actor;
  }

  /** Walks an actor through a fixed list of steps, then calls back. */
  scriptedMove(who: string, steps: Direction[], speed: 'walk' | 'run', done: () => void): void {
    if (who === 'player') {
      // Walk the player through the steps as one continuous path.
      let tx = this.player.tileX;
      let ty = this.player.tileY;
      for (const step of steps) { const v = DIR_VEC[step]; tx += v.x; ty += v.y; }
      this.player.walkTo(tx, ty, speed === 'run' ? SCRIPT_RUN_SPEED : WALK_SPEED, done);
      return;
    }
    const actor = this.actorFor(who);
    if (!actor) { done(); return; }
    this.scripted.push({ actor, steps: [...steps], frames: WALK_FRAMES, done });
  }

  /** Pause for a number of simulation frames. */
  scriptedWait(frames: number, done: () => void): void {
    this.timers.push({ left: Math.max(1, frames), done });
  }

  addNpcRuntime(npc: MapNpc): void {
    if (this.npcs.some((n) => n.data.id === npc.id)) return;
    this.npcs.push({
      data: npc,
      actor: new Actor(npc.sprite, npc.x, npc.y, npc.facing),
      progress: 0,
      cooldown: 30,
      homeX: npc.x,
      homeY: npc.y,
    });
  }

  removeNpcRuntime(id: string): void {
    const i = this.npcs.findIndex((n) => n.data.id === id);
    if (i >= 0) this.npcs.splice(i, 1);
  }

  private updateScripted(): void {
    if (this.alert) this.alert.t++;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i]!;
      if (--t.left <= 0) { this.timers.splice(i, 1); t.done(); }
    }
    for (let i = this.scripted.length - 1; i >= 0; i--) {
      const m = this.scripted[i]!;
      m.actor.update();
      if (m.actor.moving) continue;
      const next = m.steps.shift();
      if (next === undefined) {
        this.scripted.splice(i, 1);
        m.done();
        continue;
      }
      /*
       * A cutscene may not walk somebody into the player.
       *
       * Scripted movement had no collision check at all, which is fine for
       * walls -- an author places the path -- but not for the player, who is
       * standing wherever they stopped. The player is a body, not a tile: for
       * most of every step it straddles two tiles, and an author writing
       * "walk Tarin to (22,9)" cannot know the player is half in that tile.
       *
       * The step is dropped rather than the path being abandoned, so the actor
       * arrives as close as the room allows and the script still completes --
       * a cutscene that never calls done() would hang the world, which is a
       * far worse failure than an NPC stopping one tile short.
       */
      // Only NPCs reach here; scriptedMove walks the player down its own branch.
      const v = DIR_VEC[next];
      if (this.playerCovers(m.actor.tileX + v.x, m.actor.tileY + v.y)) {
        m.actor.facing = next;
        continue;
      }
      m.actor.step(next, m.frames);
    }
  }

  private opposite(d: Direction): Direction {
    return d === 'up' ? 'down' : d === 'down' ? 'up' : d === 'left' ? 'right' : 'left';
  }

  /* ---------------------------------------------------------------- NPCs */

  private updateNpcs(game: Game): void {
    for (const n of this.npcs) {
      const done = n.actor.update();
      void done;
      if (n.actor.moving) continue;
      if (n.cooldown > 0) { n.cooldown--; continue; }

      const m = n.data.movement;
      switch (m.kind) {
        case 'static':
          n.cooldown = 60;
          break;
        case 'lookAround': {
          const dirs: Direction[] = ['up', 'down', 'left', 'right'];
          n.actor.face(game.rng.pick(dirs));
          n.cooldown = 60 + game.rng.below(90);
          break;
        }
        case 'pace': {
          const axis = m.axis;
          const forward = n.progress < m.distance;
          const dir: Direction = axis === 'x' ? (forward ? 'right' : 'left') : (forward ? 'down' : 'up');
          const v = DIR_VEC[dir];
          const nx = n.actor.tileX + v.x;
          const ny = n.actor.tileY + v.y;
          if (this.npcCanEnter(nx, ny)) {
            n.actor.step(dir, WALK_FRAMES);
            n.progress = forward ? n.progress + 1 : n.progress - 1;
            if (n.progress >= m.distance * 2) n.progress = 0;
          } else {
            n.progress = forward ? m.distance : 0;
          }
          n.cooldown = 20 + game.rng.below(40);
          break;
        }
        case 'wander': {
          const dirs: Direction[] = ['up', 'down', 'left', 'right'];
          const dir = game.rng.pick(dirs);
          const v = DIR_VEC[dir];
          const nx = n.actor.tileX + v.x;
          const ny = n.actor.tileY + v.y;
          const withinHome = Math.abs(nx - n.homeX) <= m.radius && Math.abs(ny - n.homeY) <= m.radius;
          if (withinHome && this.npcCanEnter(nx, ny)) n.actor.step(dir, WALK_FRAMES);
          else n.actor.face(dir);
          n.cooldown = 45 + game.rng.below(90);
          break;
        }
        case 'path': {
          const step = m.steps[n.progress % m.steps.length];
          if (step) {
            const v = DIR_VEC[step];
            if (this.npcCanEnter(n.actor.tileX + v.x, n.actor.tileY + v.y)) {
              n.actor.step(step, WALK_FRAMES);
              n.progress++;
              if (!m.loop && n.progress >= m.steps.length) n.data.movement = { kind: 'static' };
            }
          }
          n.cooldown = 10;
          break;
        }
      }
    }
  }

  private npcCanEnter(x: number, y: number): boolean {
    if (!this.map.inBounds(x, y)) return false;
    if (this.map.collisionAt(x, y) !== 0 && this.map.collisionAt(x, y) !== 6) return false;
    // The whole body, not just the tile its centre is in: a wandering
    // townsperson that steps into the eight pixels of player nobody measured
    // pins them in place until it happens to wander off again.
    if (this.playerCovers(x, y)) return false;
    return !this.npcs.some((o) => (o.actor.tileX === x && o.actor.tileY === y) ||
      (o.actor.moving && o.actor.targetX === x && o.actor.targetY === y));
  }

  /* --------------------------------------------------------------- warps */

  private doWarp(game: Game, warp: MapWarp): void {
    this.busy = true;
    // A doorway, a cave mouth, a stairwell and a route edge should not all be
    // the same black square. The style comes from the warp itself.
    const st = areaStyleOf(warp.style);
    const f = areaFrames(st);
    // Start pulling the next map in now, in parallel with the cover closing.
    // Twenty frames is a third of a second of time the game was spending on an
    // animation and then spending again on a fetch; done this way the fetch is
    // usually finished before the screen is even black, and the hold at the end
    // of the out-fade costs nothing at all.
    const warmed = this.prefetch(game, warp.toMap);
    this.beginFade('out', f, async () => {
      await warmed;
      await this.loadMap(game, warp.toMap, warp.toX, warp.toY, warp.facing ?? this.player.facing);
      this.snapCamera();
      this.beginFade('in', f, () => { this.busy = false; }, st, this.player.facing);
    }, st, this.player.facing);
  }

  /**
   * Warm the asset cache for a map about to be walked into.
   *
   * Strictly a cache fill: it must not touch the live map, the registry or the
   * scene, because the place being left is still the thing on screen and will
   * be for the length of the out-fade. `loadMap` then finds everything already
   * in memory and completes within the frame.
   *
   * Only files the manifest actually lists are asked for. A fetch that 404s
   * leaves a rejected promise cached under its path, so speculatively probing
   * for a dialogue file that does not exist would poison the entry for the
   * real load later.
   */
  private prefetch(game: Game, id: string): Promise<void> {
    return (async () => {
      try {
        if (!registry.has('maps', id)) return;
        const file = await game.assets.loadJson<AsciiMapFile>(`data/maps/${id}.json`);
        const jobs: Promise<unknown>[] = [];
        if (registry.has('dialogue', id)) jobs.push(game.assets.loadJson(`data/dialogue/${id}.json`));
        if (registry.has('events', id)) jobs.push(game.assets.loadJson(`data/events/${id}.json`));
        const table = file.encounterTable;
        if (table && registry.has('encounters', table)) {
          jobs.push(game.assets.loadJson(`data/encounters/${table}.json`));
        }
        await Promise.all(jobs);
      } catch {
        // A warm-up never reports: the real load is what owns the error.
      }
    })();
  }

  /**
   * Close the field behind a set of diagonal shutters, then hand over.
   *
   * Diagonal rather than horizontal: a horizontal wipe reads as a scene change,
   * a diagonal one reads as an impact, which is the right note for something
   * jumping you out of the grass. The battle scene opens by running the same
   * shape backwards, so the two halves look like one continuous move.
   */
  private beginWipe(frames: number, then: () => void): void {
    this.wipe = { t: 0, frames, then };
    audio.playSfx('battle_swoosh');
  }

  private updateWipe(): void {
    if (!this.wipe) return;
    this.wipe.t++;
    if (this.wipe.t >= this.wipe.frames) {
      const cb = this.wipe.then;
      this.wipe = null;
      cb?.();
    }
  }

  /** Shared with the battle scene so the two halves of the wipe match. */
  private renderWipe(r: Renderer): void {
    if (!this.wipe) return;
    const p = Math.min(1, this.wipe.t / this.wipe.frames);
    drawShutters(r, p);
  }

  beginFade(
    dir: 'out' | 'in', frames: number, then?: () => void | Promise<void>,
    style: AreaStyle = 'warp', wipeDir: WipeDir = 'down',
  ): void {
    // A fade started on top of one that still owes a callback silently drops
    // it, and a dropped callback is how `busy` gets stranded -- the player
    // stands there unable to move and nothing in the log says why. Nothing in
    // the game should do this; say so loudly if something starts.
    if (this.fade.active && this.fade.then) {
      console.warn('overworld: a fade replaced one with a pending callback; that callback is lost');
    }
    this.fade = { active: true, t: 0, dir, frames, then, style, wipeDir, holding: false };
  }

  /**
   * Advance the cover, and hold it shut while the next map is being built.
   *
   * The old version simply switched the fade off on the frame it completed and
   * called back. But every out-fade's callback is `async` -- it loads a map --
   * so the work it does lands one or more frames *later*, and in between the
   * scene rendered with no cover on it at all. Cold, that is the outgoing map
   * at full brightness for as long as the fetch takes; warm, it is still a
   * one-frame flash, because an awaited value resolves after the frame that
   * started it has already been drawn. That flash is the "laggy and choppy at
   * the end": the transition does its whole graceful close and then the world
   * blinks back on before the new room appears.
   *
   * So an out-fade now stays active, pinned at full cover, until its callback
   * says it is finished. The callback normally finishes by starting the
   * incoming fade, which replaces this one outright; if it finishes without
   * doing that -- or throws -- the cover is released here rather than being
   * left over the game forever.
   */
  private updateFade(): void {
    const fade = this.fade;
    if (!fade.active || fade.holding) return;
    fade.t++;
    if (fade.t < fade.frames) return;
    fade.t = fade.frames;

    const cb = fade.then;
    fade.then = undefined;
    if (!cb || fade.dir === 'in') {
      fade.active = false;
      cb?.();
      return;
    }

    // Only release the cover if this same fade is still the current one: the
    // usual outcome is that the callback has already handed over to the
    // incoming half, and clearing then would undo it.
    fade.holding = true;
    const release = (): void => {
      if (this.fade !== fade) return;
      fade.holding = false;
      fade.active = false;
    };
    const failed = (e: unknown): void => {
      console.error('overworld: transition callback failed', e);
      release();
      // Whatever went wrong, the player must not be left unable to move.
      this.busy = false;
    };

    let result: void | Promise<void>;
    try {
      result = cb();
    } catch (e) {
      failed(e);
      return;
    }
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(release, failed);
    } else {
      release();
    }
  }

  private updateCamera(): void {
    const d = this.desiredCamera();
    // Snap, not lerp: a smoothed camera on a pixel grid produces shimmer.
    this.camTargetX = d.x;
    this.camTargetY = d.y;
  }

  /* -------------------------------------------------------------- render */

  render(game: Game, r: Renderer): void {
    // Rounded to buffer pixels, not logical ones.
    //
    // The world is blitted at camX * DETAIL, so a camera snapped to whole
    // logical units can only ever move the map in two-pixel jumps, while the
    // player -- drawn from a float position -- slides one pixel at a time
    // between them. Walking straight that reads as a slight stutter; walking
    // diagonally, where both axes are beating against each other at 0.81 of a
    // pixel per frame, it reads as the screen shaking.
    r.camX = Math.round(this.camTargetX * DETAIL) / DETAIL;
    r.camY = Math.round(this.camTargetY * DETAIL) / DETAIL;
    r.clear(this.map?.indoor ? '#181420' : '#0e1420');

    if (!this.map) return;

    this.map.renderGround(r, this.tileset);

    // Everything on foot is sorted by screen depth so overlaps look right.
    type Drawable = { depth: number; draw: () => void };
    // Each character is followed immediately by the grass they are standing in,
    // so a second character further down the screen still draws in front of
    // both. See TileMap.renderGrassSkirt for why the grass has to follow the
    // body rather than sit on the tile.
    const drawables: Drawable[] = this.npcs.map((n) => ({
      depth: n.actor.depth,
      draw: () => {
        n.actor.render(r);
        // Nobody there is nobody to hide: a lifted tuft with no character in it
        // is just a block of grass standing off the tile grid.
        if (!n.actor.visible) return;
        this.map.renderGrassSkirt(r, this.tileset, n.actor.pixelX + TILE_SIZE / 2, n.actor.pixelY + TILE_SIZE - 1);
      },
    }));
    drawables.push({
      depth: this.player.footY - TILE_SIZE,
      draw: () => {
        this.player.render(r);
        if (!this.player.visible) return;
        this.map.renderGrassSkirt(r, this.tileset, this.player.centerX, this.player.footY);
      },
    });
    /*
     * Creatures standing in the world.
     *
     * Only the lab counter uses this so far: the three starters sit up there
     * and the one the player takes stops being drawn, while the two they were
     * chosen over stay exactly where they were. Icon size rather than the
     * battle sprite -- a 128px sprite is five times the professor's height and
     * destroys the scale of the room.
     */
    for (const o of this.map.objects) {
      if (o.kind !== 'kin' || !o.species) continue;
      if (o.hiddenIfFlag && this.state.hasFlag(o.hiddenIfFlag)) continue;
      const sp = o.species;
      drawables.push({
        depth: o.y * TILE_SIZE + TILE_SIZE,
        draw: () => {
          const img = iconSprite(sp);
          // Seated on the tile's surface, not floating over its top-left.
          const px = r.worldPX(o.x * TILE_SIZE + TILE_SIZE / 2) - ICON_SIZE / 2;
          const py = r.worldPY(o.y * TILE_SIZE + TILE_SIZE) - ICON_SIZE;
          r.bctx.drawImage(img, px, py);
        },
      });
    }

    for (const b of this.boulders) {
      drawables.push({
        depth: b.y * TILE_SIZE + b.offY,
        draw: () => {
          const src = this.tileset.src(T.BOULDER_FREE);
          const bx = r.worldPX(b.x * TILE_SIZE + b.offX);
          const by = r.worldPY(b.y * TILE_SIZE + b.offY);
          r.ellipsePixel(bx + TILE_PX / 2, by + TILE_PX - 5, 11, 3.5, 'rgba(16,20,28,0.3)');
          r.bctx.drawImage(this.tileset.canvas, src.x, src.y, TILE_PX, TILE_PX, bx, by, TILE_PX, TILE_PX);
        },
      });
    }

    // Overlay tiles join the same sort, one drawable per row. A signpost a row
    // above the player is behind them; a tree a row below is in front. Drawing
    // the layer in one go afterwards is what made walking up to a sign delete
    // the top half of the player.
    const rows = this.map.visibleRows(r);
    for (let ty = rows.first; ty <= rows.last; ty++) {
      const row = ty;
      drawables.push({
        depth: row * TILE_SIZE,
        draw: () => this.map.renderOverlayRow(r, this.tileset, row),
      });
      // Tall grass joins the same sort. It is a ground tile, so it has already
      // been drawn once underneath everybody; this second pass puts the blades
      // of your own row back in front of you, which is what makes standing in a
      // patch read as waist-deep rather than as standing on top of it. The row
      // above stays behind you, because that grass is further from the camera.
      if (this.map.rowHasTallGrass(r, row)) {
        drawables.push({
          depth: row * TILE_SIZE,
          draw: () => this.map.renderGrassFrontRow(r, this.tileset, row),
        });
      }
    }

    drawables.sort((a, b) => a.depth - b.depth);
    for (const d of drawables) d.draw();

    if (this.alert) {
      const alert = this.alert;
      const npc = this.npcs.find((n) => n.data.id === alert.npcId);
      if (npc) {
        // The bubble overshoots and settles. A mark that simply appears is
        // easy to miss; one that pops is not, and the two frames it costs are
        // the cheapest readability in the game.
        const t = Math.min(1, alert.t / 10);
        const pop = t < 1 ? 1.45 - 0.45 * t : 1 + Math.sin((alert.t - 10) / 7) * 0.05;
        const w = Math.max(3, Math.round(9 * pop));
        const h = Math.max(4, Math.round(11 * pop));
        const bx = Math.round(npc.actor.pixelX - r.camX + 4 - (w - 9) / 2);
        const by = Math.round(npc.actor.pixelY - r.camY - 22 - (h - 11));
        r.rect(bx, by, w, h, '#fbfcff');
        r.outline(bx, by, w, h, '#282838');
        r.rect(bx + Math.round(w / 2) - 1, by + h - 1, 3, 3, '#fbfcff');
        r.rect(bx + Math.round(w / 2) - 1, by + h + 1, 3, 1, '#282838');
        r.text('!', bx + Math.round(w / 2) - 1, by + Math.round((h - 7) / 2), { color: '#d03838' });
      }
    }

    if (!this.map.indoor) {
      const dark = game.ambientDarkness();
      if (dark > 0) r.tint('#101830', dark);
    }

    if (this.banner.t > 0) this.renderBanner(r);
    this.renderWipe(r);
    if (this.fade.active) {
      const p = this.fade.t / this.fade.frames;
      drawAreaCover(r, this.fade.style ?? 'warp',
        this.fade.dir === 'out' ? p : 1 - p, this.fade.wipeDir ?? 'down');
    }

    if (game.debug) this.renderDebugOverlay(r);
  }

  private renderBanner(r: Renderer): void {
    const w = r.textWidth(this.banner.text) + 20;
    const x = Math.floor((SCREEN_W - w) / 2);
    // Slide in, hold, slide out.
    const life = 150 - this.banner.t;
    let y = 8;
    if (life < 12) y = 8 - (12 - life) * 2;
    else if (this.banner.t < 12) y = 8 - (12 - this.banner.t) * 2;
    r.window(x, y, w, 16, { fill: '#f0f4fc' });
    r.text(this.banner.text, SCREEN_W / 2, y + 5, { color: '#2c3550', align: 'center' });
  }

  private renderDebugOverlay(r: Renderer): void {
    const t0x = Math.max(0, Math.floor(r.camX / TILE_SIZE));
    const t0y = Math.max(0, Math.floor(r.camY / TILE_SIZE));
    const t1x = Math.min(this.map.width - 1, Math.floor((r.camX + SCREEN_W) / TILE_SIZE));
    const t1y = Math.min(this.map.height - 1, Math.floor((r.camY + SCREEN_H) / TILE_SIZE));
    for (let y = t0y; y <= t1y; y++) {
      for (let x = t0x; x <= t1x; x++) {
        const c = this.map.collisionAt(x, y);
        if (c === 0) continue;
        const color = c === 1 ? 'rgba(255,60,60,0.30)'
          : c === 6 ? 'rgba(80,255,120,0.25)'
          : c === 3 ? 'rgba(255,220,60,0.30)'
          : 'rgba(60,160,255,0.30)';
        r.rect(x * TILE_SIZE - r.camX, y * TILE_SIZE - r.camY, TILE_SIZE, TILE_SIZE, color);
      }
    }
    r.rect(this.player.x - r.camX, this.player.y - r.camY, 11, 9, 'rgba(255,255,255,0.45)');
    r.text(`${this.map.id} ${this.player.tileX},${this.player.tileY}`, 2, SCREEN_H - 10, {
      color: '#ffe066', shadow: '#000',
    });
  }
}
