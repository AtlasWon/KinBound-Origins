/**
 * Overworld event host.
 *
 * Adapts the overworld scene to the interface the event VM expects. Keeping
 * this in its own module means the VM never learns anything about tilemaps or
 * cameras, and the overworld never learns anything about story scripts.
 */

import type { Game } from '../core/game.js';
import type { Scene } from '../core/scene.js';
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
import { audio, sfxNotes, type SfxOptions } from '../audio/audio.js';
import { DETAIL, SCREEN_W, SCREEN_H, type Renderer } from '../engine/renderer.js';
import { iconSprite } from '../gfx/kinsprite.js';
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
        // 'continue' means the script owns the field after a loss: it keeps
        // running, and it will fade and warp on its own. The overworld's
        // blackout must stay out of it, or both are driving at once and one
        // of the two loses its completion callback -- which strands `busy`
        // and leaves the player unable to move. See onBattleFinished.
        noWhiteout: onLoss === 'continue',
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

  /**
   * Heal the party, and show it happening.
   *
   * Every heal in the game funnels through here -- the Waystation keeper, the
   * player's mother, and anything a future script asks for -- so the whole
   * presentation lives in one place and no author has to remember to wrap a
   * `healParty` in fades. The scripts that used to do that by hand no longer
   * need to; see data/events/common.json.
   *
   * The bar each kin is filling from has to be sampled *before* the state is
   * touched, which is the only reason this is more than one line.
   *
   * AUTHORING RULE: always follow a `healParty` with a `wait`. `healParty` is
   * one of the VM's non-blocking commands, so without one the runner reaches
   * the next `say` on the same tick and the dialogue box lands on top of the
   * effect it was meant to follow. Ten frames is plenty -- the wait does not
   * tick while the overlay holds the stack, so it is spent after it, not
   * during it, and the number only sets the beat before the next line.
   */
  healParty(): void {
    const rows: HealRow[] = this.state.party.map((k) => ({
      species: k.species,
      from: Math.max(0, Math.min(1, k.hpFraction)),
    }));
    this.state.healParty();
    if (rows.length === 0) return;
    this.game.scenes.push(new HealFxScene(rows));
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

/* ========================================================== healing fx */

/** One kin in the heal overlay: what it is, and how full it started. */
interface HealRow {
  species: string;
  /** HP fraction before the heal, 0..1. The bar animates from here to full. */
  from: number;
}

/**
 * Sound cues this effect asks for, with the closest existing cue as a stand-in.
 *
 * `heal_flow` is the working sound: one soft pulse per kin, each a semitone
 * above the last, so a full party plays a rising run and a lone starter plays a
 * single note. `heal_done` is the resolve at the end.
 *
 * Both fall back to a cue that already exists rather than to silence. A missing
 * recipe makes `playSfx` a no-op, and an effect whose whole point is that it is
 * satisfying must not be able to ship mute because a sound landed late.
 */
const HEAL_CUE = { id: 'heal_flow', fallback: 'stat_up' };
const DONE_CUE = { id: 'heal_done', fallback: 'heal' };

function cue(c: { id: string; fallback: string }, opts?: SfxOptions): void {
  audio.playSfx(sfxNotes(c.id) ? c.id : c.fallback, opts);
}

/*
 * Timing, in simulation frames at 60Hz.
 *
 * The number that matters is the total, and it is set against how often this
 * plays rather than how good it can look. A player heals dozens of times an
 * hour; the fiftieth viewing is the one to design for. So the length scales
 * with the party: one kin -- which is the whole of the early game, and the
 * first time anyone sees this -- runs 52 frames, a hair under a second, and a
 * full six runs 92, a second and a half. The old blackout-and-hold was a flat
 * 56 frames for any party size and showed nothing, so this is not a tax; it is
 * the same second spent on something to look at.
 *
 * A press of confirm or cancel cuts to the end once the panel is open, which is
 * the real answer to the fiftieth viewing.
 */
const HEAL_OPEN = 12;
const HEAL_STAGGER = 8;
const HEAL_FILL = 12;
const HEAL_HOLD = 14;
const HEAL_CLOSE = 14;
const HEAL_SKIP_HOLD = 4;
/** How long the bloom behind a kin takes to expand and fade. */
const BLOOM = 11;

// Cropped out of the middle of the 64px icon, not off its left edge: the
// left-hand crop the Roost uses is fine against a name label sitting to its
// right, but here the icon is the only thing in its slot and an off-centre
// creature sits visibly wide of the bar underneath it.
const ICON_CROP = { sx: 4, sy: 16, sw: 56, sh: 40 };
const SLOT_W = 32;
const PANEL_H = 48;

const clamp01 = (k: number): number => (k < 0 ? 0 : k > 1 ? 1 : k);
const easeOut = (k: number): number => 1 - (1 - k) * (1 - k);

/**
 * The heal transition.
 *
 * A transparent scene, so the room the player is standing in stays on screen
 * underneath and dims: being healed happens *here*, in front of this person, and
 * cutting to black threw that away. Nothing beneath ticks while this is up, so
 * the event VM is parked on whatever `wait` follows the `healParty` and resumes
 * the moment this pops -- the same contract dialogue already runs on.
 *
 * What it shows is the party, in order, each one's health visibly climbing back
 * to full. That is the whole reason it exists: the first time a player sees it
 * they are being told, without a line of instruction, what this place is for.
 */
export class HealFxScene implements Scene {
  readonly name = 'healfx';
  readonly transparent = true;

  private t = 0;
  private hold = HEAL_HOLD;
  /** Kin whose pulse has already sounded. */
  private lit = 0;
  private rang = false;
  private skipped = false;

  constructor(private rows: HealRow[]) {}

  private startOf(i: number): number {
    return HEAL_OPEN + i * HEAL_STAGGER;
  }

  private get doneAt(): number {
    return this.startOf(this.rows.length - 1) + HEAL_FILL;
  }

  private get closeAt(): number {
    return this.doneAt + this.hold;
  }

  update(game: Game, _dt: number): void {
    this.t++;
    const i = game.input;

    if (!this.skipped && this.t >= HEAL_OPEN
      && (i.pressed('confirm') || i.pressed('cancel'))) {
      this.skipped = true;
      // Silence the pulses that have not played rather than firing the
      // remainder as one chord.
      this.lit = this.rows.length;
      this.hold = HEAL_SKIP_HOLD;
      if (this.t < this.doneAt) this.t = this.doneAt;
    }

    while (this.lit < this.rows.length && this.t >= this.startOf(this.lit)) {
      cue(HEAL_CUE, { pitch: Math.pow(2, this.lit / 12) });
      this.lit++;
    }
    if (!this.rang && this.t >= this.doneAt) {
      this.rang = true;
      cue(DONE_CUE);
    }

    if (this.t >= this.closeAt + HEAL_CLOSE) game.scenes.pop();
  }

  /** How full kin `i`'s bar is drawn right now. */
  private fill(i: number): number {
    const row = this.rows[i]!;
    const k = easeOut(clamp01((this.t - this.startOf(i)) / HEAL_FILL));
    return row.from + (1 - row.from) * k;
  }

  render(_game: Game, r: Renderer): void {
    const n = this.rows.length;
    // Out fast, shut fast. The open eases *out* so the panel is at full height
    // almost at once and only settles the last few pixels; the close is eased
    // *in* so it holds for a beat and then snaps. Symmetrical easing on both
    // ends left a three-pixel bar of window sitting in the middle of the screen
    // for the last four frames of every heal, which is the one frame of this
    // effect anybody would ever notice twice.
    const openK = easeOut(clamp01(this.t / HEAL_OPEN));
    const shut = clamp01((this.t - this.closeAt) / HEAL_CLOSE);
    const grow = openK * (1 - shut * shut);
    // Cut the last couple of frames of the shrink rather than drawing the
    // panel down to a two-pixel line: the shape stops reading as a lid and
    // starts reading as a stray rule across the middle of the room.
    if (grow <= 0.12) return;

    r.tint('#08111c', 0.6 * grow);

    // The panel opens as a horizontal slit and grows to height, which reads as
    // a lid lifting rather than as another window appearing. The floor on the
    // width is for the early game: one starter is one icon, and a 48-wide box
    // in the middle of the screen looks like a mistake rather than a frame.
    const panelW = Math.min(SCREEN_W - 16, Math.max(76, n * SLOT_W + 16));
    const panelX = Math.round((SCREEN_W - panelW) / 2);
    const cy = Math.round(SCREEN_H / 2);
    const h = Math.round(PANEL_H * grow);
    r.window(panelX, cy - Math.round(h / 2), panelW, h);

    // Contents fade in behind the last of the opening so nothing is drawn
    // squashed inside a panel that has not finished growing.
    // Tied to the panel rather than to time, so the contents arrive as it
    // finishes opening and leave as it starts shutting. Fading them on a
    // separate curve left a ghost of six creatures hanging inside a panel that
    // was still at full height.
    const inner = clamp01((grow - 0.5) / 0.35);
    if (inner > 0) {
      const rowX = panelX + Math.round((panelW - n * SLOT_W) / 2);
      for (let s = 0; s < n; s++) {
        const x = rowX + s * SLOT_W;
        const started = this.t - this.startOf(s);

        // Bloom: a soft disc that swells out from behind the icon on the frame
        // that kin's turn comes round, drawn under it so it reads as light
        // coming off the creature rather than a shape stuck on top.
        if (started >= 0 && started < BLOOM) {
          const b = started / BLOOM;
          const rad = (5 + 16 * easeOut(b)) * DETAIL;
          r.ellipsePixel(
            (x + SLOT_W / 2) * DETAIL, (cy - 8) * DETAIL, rad, rad * 0.82,
            `rgba(150,246,196,${(0.42 * (1 - b) * inner).toFixed(3)})`,
          );
        }

        // Dim before its turn, full brightness after: the party comes back one
        // at a time and you can see which one is being worked on.
        const wake = clamp01(started / 6);
        const alpha = (0.34 + 0.66 * wake) * inner;
        r.image(
          iconSprite(this.rows[s]!.species),
          x + (SLOT_W - ICON_CROP.sw / DETAIL) / 2, cy - 18,
          ICON_CROP.sx, ICON_CROP.sy, ICON_CROP.sw, ICON_CROP.sh,
          false, false, alpha,
        );

        const f = this.fill(s);
        const barW = 24;
        r.meter(x + (SLOT_W - barW) / 2, cy + 6, barW, 5, f,
          f >= 1 ? '#7ff0a8' : '#54c882', '#3a4356', '#232a3d');
      }
    }

    // The finish: one white bloom over everything, gone in ten frames. It is
    // what makes the completion land as an event rather than as the bars
    // quietly stopping.
    const since = this.t - this.doneAt;
    if (since >= 0 && since < 10) r.tint('#f2fff6', 0.42 * (1 - since / 10));
  }
}
