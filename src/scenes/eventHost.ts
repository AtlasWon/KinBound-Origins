/**
 * Overworld event host.
 *
 * Adapts the overworld scene to the interface the event VM expects. Keeping
 * this in its own module means the VM never learns anything about tilemaps or
 * cameras, and the overworld never learns anything about story scripts.
 */

import type { Game } from '../core/game.js';
import type { EventHost } from '../systems/eventvm.js';
import type { OverworldScene } from './overworld.js';
import type { GameState } from '../systems/state.js';
import type { Direction, EventScript, MapNpc, WeatherId } from '../data/schema.js';
import { DialogueScene } from '../ui/dialogue.js';
import { registry } from '../data/registry.js';
import { createKin } from '../systems/kin.js';
import { StarterScene } from './starter.js';
import { ShopScene } from './shop.js';
import { RoostScene } from './roost.js';
import { audio } from '../audio/audio.js';
import { SCREEN_W, SCREEN_H } from '../engine/renderer.js';
import { TILE_SIZE } from '../gfx/tileset.js';
import type { Actor } from '../world/actor.js';

/**
 * Frames per tile for a scripted NPC run.
 *
 * The overworld's own scripted mover walks every NPC at WALK_FRAMES (14)
 * whatever the script asked for -- only the player is given a run speed -- so
 * a cutscene that said "run" produced an amble at 1.1 pixels a frame, slower
 * than the player's own walk. Eight frames is 2 pixels a frame, which is
 * comfortably faster than walking and is what makes an entrance from off
 * screen read as somebody sprinting to catch you.
 */
const RUN_FRAMES = 8;

/**
 * Frames per tile for the part of a run nobody can see.
 *
 * A cutscene that walks somebody out of the shot and on to somewhere else --
 * Perrin leaving the player's front door for the laboratory, which is fifteen
 * tiles east -- has to keep stepping them all the way there, because the script
 * cannot continue until the move reports back. On a 240x160 view he is gone
 * from the frame after eight of those tiles and the remaining nine play out as
 * a held shot of an empty street with the controls locked.
 *
 * The route still has to be walked, but the speed it is walked at while the
 * actor is outside the view is not something anyone can observe: the sequence
 * of tiles is identical either way. So off screen it sprints, and the moment it
 * comes back within reach of the frame it drops to the speed it should be.
 * That is worth roughly two thirds of a second on the walk to the lab, and it
 * costs nothing anywhere else -- an actor that never leaves the shot never
 * changes speed at all.
 */
const OFFSCREEN_FRAMES = 3;

/**
 * How far outside the view an actor must be before it is allowed to sprint.
 *
 * Two tiles rather than one, and re-tested before every single tile. A fast
 * tile can carry the actor at most one tile closer, so at two tiles of slack it
 * is still outside the frame when the next test runs and has already dropped
 * back to normal speed before any part of it could be drawn. One tile of slack
 * would let a fast step land exactly on the boundary and be seen.
 */
const OFFSCREEN_MARGIN = TILE_SIZE * 2;

export class OverworldEventHost implements EventHost {
  constructor(private game: Game, private scene: OverworldScene) {}

  get state(): GameState {
    return this.scene.state;
  }

  /* ------------------------------------------------------------- actors */

  moveActor(who: string, steps: Direction[], speed: 'walk' | 'run', done: () => void): void {
    // A running NPC is stepped here rather than handed to the scene's walker,
    // which has no way to be told a speed. Everything else takes the normal
    // path, so a walk is still exactly the walk it always was.
    if (speed === 'run' && who !== 'player' && this.scene.actorFor(who)) {
      this.runActor(who, [...steps], done);
      return;
    }
    this.scene.scriptedMove(who, steps, speed, done);
  }

  /**
   * Walk an NPC through a path at run speed, one tile at a time.
   *
   * While an event is running the overworld only ticks its own scripted movers
   * and its timers -- `updateNpcs` is skipped entirely -- so an actor driven
   * from out here has to be advanced by hand. A one-frame timer is the tick.
   * The actor is looked up again every frame because a script is allowed to
   * remove it, or warp the map out from under it, mid-run.
   */
  private runActor(who: string, steps: Direction[], done: () => void): void {
    let settled = false;
    const finish = (): void => { if (!settled) { settled = true; done(); } };
    const tick = (): void => {
      const actor = this.scene.actorFor(who);
      if (!actor) { finish(); return; }
      actor.update();
      if (actor.moving) { this.scene.scriptedWait(1, tick); return; }
      const next = steps.shift();
      if (next === undefined) { finish(); return; }
      actor.step(next, this.outOfShot(actor) ? OFFSCREEN_FRAMES : RUN_FRAMES);
      this.scene.scriptedWait(1, tick);
    };
    tick();
  }

  /**
   * Whether an actor is far enough outside the view that its speed is nobody's
   * business. See OFFSCREEN_FRAMES.
   *
   * Measured against the camera the renderer was last handed, which is a frame
   * behind -- the overworld updates scripted movers before it updates the
   * camera. A frame of lag is a couple of pixels against two tiles of margin.
   */
  private outOfShot(actor: Actor): boolean {
    const { camX, camY } = this.game.renderer;
    const left = actor.pixelX;
    const top = actor.pixelY;
    return left + TILE_SIZE < camX - OFFSCREEN_MARGIN
      || left > camX + SCREEN_W + OFFSCREEN_MARGIN
      || top + TILE_SIZE < camY - OFFSCREEN_MARGIN
      || top > camY + SCREEN_H + OFFSCREEN_MARGIN;
  }

  faceActor(who: string, dir: Direction): void {
    // 'player' is a reserved actor id everywhere else in the VM; it was the one
    // place it did nothing, which is how a cutscene ended up being delivered to
    // the back of the player's head.
    if (who === 'player') { this.scene.player.facing = dir; return; }
    const actor = this.scene.actorFor(who);
    if (actor) actor.facing = dir;
  }

  spawnNpc(npc: MapNpc): void {
    this.scene.addNpcRuntime(npc);
  }

  removeNpc(id: string): void {
    this.scene.removeNpcRuntime(id);
  }

  /* -------------------------------------------------------- presentation */

  warp(map: string, x: number, y: number, facing: Direction | undefined, done: () => void): void {
    this.scene.beginFade('out', 18, async () => {
      await this.scene.loadMap(this.game, map, x, y, facing ?? 'down');
      this.scene.beginFade('in', 18, done);
    });
  }

  fade(to: 'black' | 'white' | 'clear', frames: number, done: () => void): void {
    this.scene.beginFade(to === 'clear' ? 'in' : 'out', frames, done);
  }

  wait(frames: number, done: () => void): void {
    this.scene.scriptedWait(frames, done);
  }

  shake(frames: number, power: number): void {
    this.game.renderer.shake(frames, power);
  }

  setWeather(weather: WeatherId): void {
    // Weather is a map property; a script override lasts until the next load.
    (this.scene.map as unknown as { weather?: WeatherId }).weather = weather;
  }

  camera(_to: { x: number; y: number } | 'player', frames: number, done: () => void): void {
    // Camera panning is not yet a separate system; hold for the requested time
    // so scripts written against it still pace correctly.
    this.scene.scriptedWait(frames, done);
  }

  playMusic(track: string): void {
    if (track === 'stop') audio.stopMusic();
    else if (track === 'resume') audio.playMusic(this.scene.map.music);
    else audio.playMusic(track);
  }

  playSfx(sound: string): void {
    audio.playSfx(sound);
  }

  /* ------------------------------------------------------------ battles */

  battleTrainer(trainerId: string, onLoss: 'whiteout' | 'continue', done: (won: boolean) => void): void {
    // Trainers are preloaded with the rest of the core content, so the common
    // path is synchronous; the fetch is only a fallback for late additions.
    const cached = registry.trainers.get(trainerId);
    const load = cached
      ? Promise.resolve(cached)
      : registry.loadTrainer(this.game.assets, trainerId);
    if (cached) { this.startTrainerFight(cached, onLoss, done); return; }

    void load.then((trainer) => {
      if (!trainer) {
        console.warn(`event: unknown trainer "${trainerId}"`);
        done(false);
        return;
      }
      this.startTrainerFight(trainer, onLoss, done);
    });
  }

  private startTrainerFight(
    trainer: NonNullable<ReturnType<typeof registry.trainers.get>>,
    onLoss: 'whiteout' | 'continue',
    done: (won: boolean) => void,
  ): void {
    {
      const foeParty = trainer.party.map((m) => createKin(m.species, m.level, this.game.rng, {
        moves: m.moves,
        ability: m.ability,
        item: m.item,
        nature: m.nature,
        ivs: m.ivs,
        evs: m.evs,
        nickname: m.nickname,
        originalTrainer: trainer.name,
      }));
      this.scene.startBattle(this.game, {
        foeParty,
        isWild: false,
        trainerId: trainer.id,
        aiTier: trainer.ai,
        noFlee: true,
        onResolved: (result) => {
          const won = result === 'win';
          if (!won && onLoss === 'whiteout') {
            // The overworld already runs its blackout; the script stops here.
            done(false);
            return;
          }
          done(won);
        },
      });
    }
  }

  battleWild(species: string, level: number, catchable: boolean, done: () => void): void {
    const wild = createKin(species, level, this.game.rng);
    this.scene.startBattle(this.game, {
      foeParty: [wild],
      isWild: true,
      noCapture: !catchable,
      onResolved: () => done(),
    });
  }

  /* ------------------------------------------------------------ content */

  healParty(): void {
    this.state.healParty();
  }

  openShop(shopId: string): void {
    this.game.scenes.push(new ShopScene(this.state, shopId));
  }

  openStorage(): void {
    this.game.scenes.push(new RoostScene(this.state));
  }

  giveKin(species: string, level: number, nickname: string | undefined, done: () => void): void {
    const kin = createKin(species, level, this.game.rng, {
      nickname,
      originalTrainer: 'player',
    });
    kin.metAt = this.scene.map.id;
    const where = this.state.addKin(kin);
    const lines = where === 'party'
      ? [`${kin.name} joined the party.`]
      : where === 'storage'
        ? [`${kin.name} was sent to the Roost.`]
        : ['There was nowhere to put it.'];
    this.say(lines, undefined, done);
  }

  starterChoice(options: string[], done: (chosen: string | null) => void): void {
    this.game.scenes.push(new StarterScene(this.state, options, (chosen) => {
      done(chosen);
    }));
  }

  /* ----------------------------------------------------------- dialogue */

  say(lines: string[], who: string | undefined, done: () => void): void {
    this.game.scenes.push(new DialogueScene(lines, { who, onDone: () => done() }));
  }

  ask(lines: string[], done: (yes: boolean) => void): void {
    this.game.scenes.push(new DialogueScene(lines, {
      choices: ['YES', 'NO'],
      onDone: (i) => done(i === 0),
    }));
  }

  choice(lines: string[], labels: string[], done: (index: number) => void): void {
    this.game.scenes.push(new DialogueScene(lines, {
      choices: labels,
      onDone: (i) => done(Math.max(0, i)),
    }));
  }

  script(id: string): EventScript | undefined {
    return registry.scripts.get(id);
  }
}
