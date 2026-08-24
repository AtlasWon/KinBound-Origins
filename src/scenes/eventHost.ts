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
      actor.step(next, RUN_FRAMES);
      this.scene.scriptedWait(1, tick);
    };
    tick();
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
